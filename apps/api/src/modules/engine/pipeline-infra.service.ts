import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

export interface GateStreamStats {
  ingressGlobal: number;
  ingressToyo: number;
  dlqFlow: number;
  dlqNoRoute: number;
  error?: string;
}

export interface PipelineInfraStatus {
  redis: {
    ok: boolean;
    latencyMs?: number;
    error?: string;
  };
  benthos: {
    ok: boolean;
    httpUrl: string;
    error?: string;
  };
  /** @deprecated kept for backward compat — use gateStreams instead */
  benthosHeartbeat: {
    redisKey: string;
    listLength: number | null;
    error?: string;
  };
  gateStreams: GateStreamStats;
}

export interface GateStreamMessage {
  id: string;
  messageId: string;
  clientId: string;
  token: string;
  route: string;
  receivedAt: string;
  bodyPreview: string;
  valid: string;
  authType: string;
  stream: string;
}

export interface FlowsRuntimeStatus extends PipelineInfraStatus {
  queues: {
    flowExecutions: { active: number; waiting: number; failed: number; completed: number } | null;
  };
  /** @deprecated */
  benthosEvents: Array<{ index: number; raw: string; payload: Record<string, unknown> | null }>;
  gateMessages: GateStreamMessage[];
}

@Injectable()
export class PipelineInfraService {
  private readonly logger = new Logger(PipelineInfraService.name);

  constructor(private readonly config: ConfigService) {}

  async getStatus(): Promise<PipelineInfraStatus> {
    const redisUrl = this.config.get<string>('REDIS_URL');
    const gateRedisUrl =
      this.config.get<string>('GATE_REDIS_URL') ??
      this.config.get<string>('FLOW_ROUTER_REDIS_URL') ??
      undefined;
    const benthosBase = (
      this.config.get<string>('BENTHOS_HTTP_URL') ?? 'https://gate.edicloud.app'
    ).replace(/\/$/, '');

    const [redis, benthos, gateStreams] = await Promise.all([
      this.probeRedis(redisUrl),
      this.probeBenthosHttp(benthosBase),
      this.readGateStreamStats(gateRedisUrl),
    ]);

    return {
      redis,
      benthos: { ...benthos, httpUrl: benthosBase },
      benthosHeartbeat: { redisKey: 'benthos_heartbeat', listLength: null },
      gateStreams,
    };
  }

  // ── Gate Redis stream stats ─────────────────────────────────────────────────

  private async readGateStreamStats(url: string | undefined): Promise<GateStreamStats> {
    if (!url?.trim()) {
      return {
        ingressGlobal: 0,
        ingressToyo: 0,
        dlqFlow: 0,
        dlqNoRoute: 0,
        error: 'GATE_REDIS_URL non configuré',
      };
    }
    let client: Redis | null = null;
    try {
      client = new Redis(url, {
        lazyConnect: true,
        maxRetriesPerRequest: 1,
        connectTimeout: 3_000,
      });
      await client.connect();
      const [ig, it, df, dn] = await Promise.all([
        client.xlen('ingress:global').catch(() => 0),
        client.xlen('ingress:toyo').catch(() => 0),
        client.xlen('dlq:flow').catch(() => 0),
        client.xlen('dlq:noroute').catch(() => 0),
      ]);
      return { ingressGlobal: ig, ingressToyo: it, dlqFlow: df, dlqNoRoute: dn };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      this.logger.warn(`Gate Redis stream stats: ${msg}`);
      return { ingressGlobal: 0, ingressToyo: 0, dlqFlow: 0, dlqNoRoute: 0, error: msg };
    } finally {
      try {
        await client?.quit();
      } catch {
        client?.disconnect();
      }
    }
  }

  async getRecentGateMessages(limit: number): Promise<GateStreamMessage[]> {
    const url =
      this.config.get<string>('GATE_REDIS_URL') ??
      this.config.get<string>('FLOW_ROUTER_REDIS_URL') ??
      undefined;
    if (!url?.trim()) return [];

    const safeLimit = Math.min(100, Math.max(1, Math.floor(limit)));
    let client: Redis | null = null;
    try {
      client = new Redis(url, {
        lazyConnect: true,
        maxRetriesPerRequest: 1,
        connectTimeout: 3_000,
      });
      await client.connect();
      // XREVRANGE returns newest first: [[id, [f1,v1,f2,v2,...]], ...]
      const raw = (await client.xrevrange(
        'ingress:global',
        '+',
        '-',
        'COUNT',
        safeLimit,
      )) as [string, string[]][];

      return raw.map(([id, fields]) => {
        const map: Record<string, string> = {};
        for (let i = 0; i < fields.length - 1; i += 2) {
          map[fields[i]] = fields[i + 1];
        }
        const body = map['body'] ?? '';
        return {
          id,
          messageId: map['message_id'] ?? '',
          clientId: map['client_id'] ?? '',
          token: (map['token'] ?? '').slice(0, 24),
          route: map['route'] ?? 'default',
          receivedAt: map['received_at'] ?? '',
          bodyPreview: body.length > 160 ? `${body.slice(0, 160)}…` : body,
          valid: map['valid'] ?? '',
          authType: map['auth_type'] ?? '',
          stream: map['stream'] ?? 'ingress:global',
        };
      });
    } catch (e) {
      this.logger.warn(`XREVRANGE ingress:global: ${e instanceof Error ? e.message : e}`);
      return [];
    } finally {
      try {
        await client?.quit();
      } catch {
        client?.disconnect();
      }
    }
  }

  // ── Legacy heartbeat ────────────────────────────────────────────────────────

  /** @deprecated — gate Redis streams used instead */
  async getRecentBenthosHeartbeats(
    _limit: number,
  ): Promise<Array<{ index: number; raw: string; payload: Record<string, unknown> | null }>> {
    return [];
  }

  // ── Probes ──────────────────────────────────────────────────────────────────

  private async probeRedis(url: string | undefined): Promise<PipelineInfraStatus['redis']> {
    if (!url?.trim()) {
      return { ok: false, error: 'REDIS_URL non configuré' };
    }
    const started = Date.now();
    let client: Redis | null = null;
    try {
      client = new Redis(url, {
        lazyConnect: true,
        maxRetriesPerRequest: 1,
        connectTimeout: 2_000,
      });
      await client.connect();
      const pong = await client.ping();
      if (pong !== 'PONG') {
        return { ok: false, error: `Réponse inattendue: ${pong}` };
      }
      return { ok: true, latencyMs: Date.now() - started };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return { ok: false, error: msg };
    } finally {
      try {
        await client?.quit();
      } catch {
        client?.disconnect();
      }
    }
  }

  private async probeBenthosHttp(baseUrl: string): Promise<{ ok: boolean; error?: string }> {
    // gate.edicloud.app exposes /ready on the ingress
    const paths = ['/ready', '/ping', '/benthos/ping'];
    for (const path of paths) {
      try {
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), 3_000);
        const res = await fetch(`${baseUrl}${path}`, { signal: ctrl.signal });
        clearTimeout(timer);
        if (res.ok) return { ok: true };
      } catch (e) {
        this.logger.debug(`Sonde Benthos ${path}: ${e instanceof Error ? e.message : e}`);
      }
    }
    return { ok: false, error: 'gate.edicloud.app injoignable (/ready, /ping)' };
  }
}
