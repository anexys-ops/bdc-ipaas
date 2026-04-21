import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

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
  benthosHeartbeat: {
    redisKey: string;
    listLength: number | null;
    error?: string;
  };
}

export interface BenthosRedisEventRow {
  index: number;
  raw: string;
  payload: Record<string, unknown> | null;
}

export interface FlowsRuntimeStatus extends PipelineInfraStatus {
  queues: {
    flowExecutions: { active: number; waiting: number; failed: number; completed: number } | null;
  };
  benthosEvents: BenthosRedisEventRow[];
}

@Injectable()
export class PipelineInfraService {
  private readonly logger = new Logger(PipelineInfraService.name);

  constructor(private readonly config: ConfigService) {}

  async getStatus(): Promise<PipelineInfraStatus> {
    const redisUrl = this.config.get<string>('REDIS_URL');
    const benthosBase = (this.config.get<string>('BENTHOS_HTTP_URL') ?? 'http://benthos:4195').replace(/\/$/, '');
    const heartbeatKey = this.config.get<string>('BENTHOS_REDIS_HEARTBEAT_KEY') ?? 'benthos_heartbeat';

    const redis = await this.probeRedis(redisUrl);
    const benthos = await this.probeBenthosHttp(benthosBase);
    const benthosHeartbeat = await this.readHeartbeatLength(redisUrl, heartbeatKey);

    return { redis, benthos: { ...benthos, httpUrl: benthosBase }, benthosHeartbeat };
  }

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
    const paths = ['/ping', '/benthos/ping', '/ready', '/benthos/ready'];
    for (const path of paths) {
      try {
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), 2_500);
        const res = await fetch(`${baseUrl}${path}`, { signal: ctrl.signal });
        clearTimeout(timer);
        if (res.ok) {
          return { ok: true };
        }
      } catch (e) {
        this.logger.debug(`Sonde Benthos ${path}: ${e instanceof Error ? e.message : e}`);
      }
    }
    return { ok: false, error: 'Benthos injoignable (/ping et /ready)' };
  }

  private async readHeartbeatLength(
    redisUrl: string | undefined,
    key: string,
  ): Promise<PipelineInfraStatus['benthosHeartbeat']> {
    if (!redisUrl?.trim()) {
      return { redisKey: key, listLength: null, error: 'REDIS_URL absent' };
    }
    let client: Redis | null = null;
    try {
      client = new Redis(redisUrl, {
        lazyConnect: true,
        maxRetriesPerRequest: 1,
        connectTimeout: 2_000,
      });
      await client.connect();
      const listLength = await client.llen(key);
      return { redisKey: key, listLength };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return { redisKey: key, listLength: null, error: msg };
    } finally {
      try {
        await client?.quit();
      } catch {
        client?.disconnect();
      }
    }
  }

  /**
   * Derniers messages écrits par Benthos dans la liste Redis (LPUSH → indices 0..n-1 les plus récents).
   */
  async getRecentBenthosHeartbeats(limit: number): Promise<BenthosRedisEventRow[]> {
    const redisUrl = this.config.get<string>('REDIS_URL');
    const key = this.config.get<string>('BENTHOS_REDIS_HEARTBEAT_KEY') ?? 'benthos_heartbeat';
    if (!redisUrl?.trim()) {
      return [];
    }
    const safeLimit = Math.min(200, Math.max(1, Math.floor(limit)));
    let client: Redis | null = null;
    try {
      client = new Redis(redisUrl, {
        lazyConnect: true,
        maxRetriesPerRequest: 1,
        connectTimeout: 2_000,
      });
      await client.connect();
      const items = await client.lrange(key, 0, safeLimit - 1);
      return items.map((raw, index) => ({
        index,
        raw,
        payload: PipelineInfraService.safeJsonObject(raw),
      }));
    } catch (e) {
      this.logger.warn(`LRANGE ${key}: ${e instanceof Error ? e.message : e}`);
      return [];
    } finally {
      try {
        await client?.quit();
      } catch {
        client?.disconnect();
      }
    }
  }

  private static safeJsonObject(raw: string): Record<string, unknown> | null {
    try {
      const v = JSON.parse(raw) as unknown;
      if (typeof v === 'object' && v !== null && !Array.isArray(v)) {
        return v as Record<string, unknown>;
      }
      return null;
    } catch {
      return null;
    }
  }
}
