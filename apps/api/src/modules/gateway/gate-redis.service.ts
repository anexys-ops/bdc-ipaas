import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { PrismaService } from '../../prisma/prisma.service';
import { TenantDatabaseService } from '../tenants/tenant-database.service';

export type GateAuthType = 'none' | 'bearer';

/**
 * Redis « gate » (BDC-93) : clés router:token:* consommées par Benthos sur gate.edicloud.app.
 * Erreurs réseau : log warning uniquement (ne bloque pas les opérations tenant).
 */
@Injectable()
export class GateRedisService implements OnModuleDestroy {
  private readonly logger = new Logger(GateRedisService.name);
  private client: Redis | null = null;
  private readonly url: string | null;
  private enabled: boolean;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly tenantDb: TenantDatabaseService,
  ) {
    this.url =
      this.configService.get<string>('GATE_REDIS_URL') ??
      this.configService.get<string>('FLOW_ROUTER_REDIS_URL') ??
      null;
    this.enabled = !!this.url;
    if (!this.enabled) {
      this.logger.warn('GATE_REDIS_URL absent — provisioning gate Redis désactivé');
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.client) {
      await this.client.quit();
      this.client = null;
    }
  }

  ingestPublicUrl(): string {
    return (
      this.configService.get<string>('GATE_INGEST_PUBLIC_URL') ??
      `${(this.configService.get<string>('FRONTEND_URL') ?? 'https://ultimate.edicloud.app').replace(/\/$/, '')}/api/v1/gateway/ingest`
    );
  }

  webhookPublicBaseUrl(): string {
    return (
      this.configService.get<string>('GATE_WEBHOOK_PUBLIC_URL') ??
      'https://gate.edicloud.app/webhook'
    );
  }

  /**
   * Met à jour les clés gate pour le tenant : enabled si au moins un flux WEBHOOK actif et tenant actif.
   */
  async syncTenantPresence(tenantId: string): Promise<void> {
    if (!this.enabled) {
      return;
    }
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { slug: true, gateToken: true, isActive: true, dbConnectionHash: true },
    });
    if (!tenant) {
      return;
    }
    let activeWebhookCount = 0;
    try {
      const client = await this.tenantDb.getClient(tenantId, tenant.dbConnectionHash);
      activeWebhookCount = await client.flow.count({
        where: { triggerType: 'WEBHOOK', isActive: true },
      });
    } catch (e) {
      this.logger.warn(`syncTenantPresence: base tenant indisponible (${tenantId}): ${String(e)}`);
    }
    const enabled = tenant.isActive && activeWebhookCount > 0;
    const authType = await this.resolveAuthType(tenantId, tenant.dbConnectionHash);
    const stream = await this.resolveStream(tenantId, tenant.dbConnectionHash);
    await this.writeKeys({
      gateToken: tenant.gateToken,
      tenantSlug: tenant.slug,
      enabled,
      authType,
      stream,
      ingestUrl: this.ingestPublicUrl(),
    });
  }

  async deleteTokenKeys(gateToken: string): Promise<void> {
    const redis = await this.getClient();
    if (!redis) {
      return;
    }
    try {
      const pipeline = redis.pipeline();
      pipeline.srem('router:tokens', gateToken);
      pipeline.del(
        `router:token:${gateToken}:enabled`,
        `router:token:${gateToken}:auth_type`,
        `router:token:${gateToken}:stream`,
        `router:token:${gateToken}:client_id`,
        `router:token:${gateToken}:ipaas_url`,
        `router:token:${gateToken}:flow_id`,
        `router:token:${gateToken}:n8n_url`,
        `router:token:${gateToken}:auth_value`,
        `router:token:${gateToken}:auth_secret`,
      );
      await pipeline.exec();
    } catch (e) {
      this.logger.warn(`deleteTokenKeys: ${String(e)}`);
    }
  }

  /** Lit enabled sur le Redis gate (pour UI statut sync). */
  async readEnabledFlag(gateToken: string): Promise<boolean | null> {
    const redis = await this.getClient();
    if (!redis) {
      return null;
    }
    try {
      const v = await redis.get(`router:token:${gateToken}:enabled`);
      if (v === null) {
        return null;
      }
      return v === '1';
    } catch (e) {
      this.logger.warn(`readEnabledFlag: ${String(e)}`);
      return null;
    }
  }

  private async resolveAuthType(tenantId: string, dbConnectionHash: string): Promise<GateAuthType> {
    try {
      const client = await this.tenantDb.getClient(tenantId, dbConnectionHash);
      const flow = await client.flow.findFirst({
        where: { triggerType: 'WEBHOOK', isActive: true },
        select: { triggerConfig: true },
      });
      const cfg = (flow?.triggerConfig ?? {}) as Record<string, unknown>;
      const t = cfg.authType;
      if (t === 'bearer') {
        return 'bearer';
      }
    } catch {
      /* ignore */
    }
    return 'none';
  }

  private async resolveStream(tenantId: string, dbConnectionHash: string): Promise<string> {
    try {
      const client = await this.tenantDb.getClient(tenantId, dbConnectionHash);
      const flow = await client.flow.findFirst({
        where: { triggerType: 'WEBHOOK', isActive: true },
        select: { triggerConfig: true },
      });
      const cfg = (flow?.triggerConfig ?? {}) as Record<string, unknown>;
      for (const key of ['stream', 'benthosStream', 'redisStream'] as const) {
        const v = cfg[key];
        if (typeof v === 'string' && v.trim()) {
          return v.trim();
        }
      }
    } catch {
      /* ignore */
    }
    return 'ingress:global';
  }

  private async writeKeys(params: {
    gateToken: string;
    tenantSlug: string;
    enabled: boolean;
    authType: GateAuthType;
    stream: string;
    ingestUrl: string;
  }): Promise<void> {
    const redis = await this.getClient();
    if (!redis) {
      return;
    }
    const { gateToken, tenantSlug, enabled, authType, stream, ingestUrl } = params;
    try {
      const pipeline = redis.pipeline();
      pipeline.sadd('router:tokens', gateToken);
      pipeline.set(`router:token:${gateToken}:enabled`, enabled ? '1' : '0');
      pipeline.set(`router:token:${gateToken}:auth_type`, authType);
      pipeline.set(`router:token:${gateToken}:stream`, stream);
      pipeline.set(`router:token:${gateToken}:client_id`, tenantSlug);
      pipeline.set(`router:token:${gateToken}:ipaas_url`, ingestUrl);
      await pipeline.exec();
    } catch (e) {
      this.logger.warn(`writeKeys gate Redis: ${String(e)}`);
    }
  }

  private async getClient(): Promise<Redis | null> {
    if (!this.enabled || !this.url) {
      return null;
    }
    if (this.client) {
      return this.client;
    }
    try {
      this.client = new Redis(this.url, { maxRetriesPerRequest: 2, enableReadyCheck: true });
      return this.client;
    } catch (e) {
      this.logger.error(`Connexion GATE_REDIS_URL impossible: ${String(e)}`);
      this.enabled = false;
      return null;
    }
  }
}
