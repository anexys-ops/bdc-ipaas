import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

type AuthType = 'none' | 'bearer' | 'hmac';

export interface FlowRouterRouteConfig {
  route: string;
  subclientId?: string | null;
  destinationUrl: string;
}

export interface FlowRouterSyncPayload {
  flowId: string;
  tenantId: string;
  isActive: boolean;
  triggerConfig: Record<string, unknown>;
}

@Injectable()
export class FlowRouterSyncService implements OnModuleDestroy {
  private readonly logger = new Logger(FlowRouterSyncService.name);
  private readonly redisUrl: string | null;
  private redisClient: Redis | null = null;
  private redisEnabled: boolean;

  constructor(private readonly configService: ConfigService) {
    this.redisUrl =
      this.configService.get<string>('FLOW_ROUTER_REDIS_URL') ??
      this.configService.get<string>('REDIS_URL') ??
      null;
    this.redisEnabled = !!this.redisUrl;
    if (!this.redisEnabled) {
      this.logger.warn('Sync Flow->Redis désactivée: FLOW_ROUTER_REDIS_URL/REDIS_URL absent');
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (!this.redisClient) {
      return;
    }
    await this.redisClient.quit();
    this.redisClient = null;
  }

  async syncFlow(payload: FlowRouterSyncPayload): Promise<void> {
    const token = this.extractToken(payload.triggerConfig);
    if (!token) {
      return;
    }
    const redis = await this.getRedis();
    if (!redis) {
      return;
    }

    const clientId = this.extractClientId(payload.tenantId, payload.triggerConfig);
    const stream = this.extractStream(payload.triggerConfig);
    const authType = this.extractAuthType(payload.triggerConfig);
    const authValue = this.extractAuthValue(payload.triggerConfig);
    const authSecret = this.extractAuthSecret(payload.triggerConfig);
    const defaultDestination = this.extractDefaultDestination(payload.triggerConfig);
    const routes = this.extractRoutes(payload.triggerConfig);
    const routeKeysSet = `router:token:${token}:route_keys`;

    const pipeline = redis.pipeline();
    pipeline.sadd('router:tokens', token);
    pipeline.set(`router:token:${token}:flow_id`, payload.flowId);
    pipeline.set(`router:token:${token}:enabled`, payload.isActive ? '1' : '0');
    pipeline.set(`router:token:${token}:client_id`, clientId);
    pipeline.set(`router:token:${token}:stream`, stream);
    pipeline.set(`router:token:${token}:auth_type`, authType);

    if (defaultDestination) {
      pipeline.set(`router:token:${token}:n8n_url`, defaultDestination);
    } else {
      pipeline.del(`router:token:${token}:n8n_url`);
    }

    if (authType === 'bearer' && authValue) {
      pipeline.set(`router:token:${token}:auth_value`, authValue);
    } else {
      pipeline.del(`router:token:${token}:auth_value`);
    }

    if (authType === 'hmac' && authSecret) {
      pipeline.set(`router:token:${token}:auth_secret`, authSecret);
    } else {
      pipeline.del(`router:token:${token}:auth_secret`);
    }

    const computedRouteKeys = routes.map((r) => this.routeRedisKey(token, r));
    const previousRouteKeys = await redis.smembers(routeKeysSet);
    for (const oldKey of previousRouteKeys) {
      if (!computedRouteKeys.includes(oldKey)) {
        pipeline.del(oldKey);
      }
    }
    pipeline.del(routeKeysSet);

    for (let i = 0; i < routes.length; i += 1) {
      const redisKey = computedRouteKeys[i];
      const route = routes[i];
      pipeline.set(redisKey, route.destinationUrl);
      pipeline.sadd(routeKeysSet, redisKey);
    }

    await pipeline.exec();
  }

  async removeFlow(payload: FlowRouterSyncPayload): Promise<void> {
    const token = this.extractToken(payload.triggerConfig);
    if (!token) {
      return;
    }
    const redis = await this.getRedis();
    if (!redis) {
      return;
    }

    const routeKeysSet = `router:token:${token}:route_keys`;
    const routeKeys = await redis.smembers(routeKeysSet);
    const pipeline = redis.pipeline();
    pipeline.srem('router:tokens', token);
    pipeline.del(
      `router:token:${token}:flow_id`,
      `router:token:${token}:enabled`,
      `router:token:${token}:client_id`,
      `router:token:${token}:stream`,
      `router:token:${token}:auth_type`,
      `router:token:${token}:auth_value`,
      `router:token:${token}:auth_secret`,
      `router:token:${token}:n8n_url`,
      routeKeysSet,
    );
    if (routeKeys.length > 0) {
      pipeline.del(...routeKeys);
    }
    await pipeline.exec();
  }

  async syncAll(flows: FlowRouterSyncPayload[]): Promise<void> {
    for (const flow of flows) {
      await this.syncFlow(flow);
    }
  }

  /**
   * Vue synthétique des jetons d'ingestion enregistrés dans Redis (router), sans exposer les secrets.
   */
  async listIngestionRouterOverview(): Promise<
    | {
        entries: Array<{
          token: string;
          flowId: string | null;
          enabled: boolean;
          clientId: string | null;
          stream: string | null;
          authType: string | null;
          authConfigured: boolean;
          routeCount: number;
          routes: Array<{ redisKey: string; destinationUrl: string | null }>;
        }>;
      }
    | { error: string }
  > {
    const redis = await this.getRedis();
    if (!redis) {
      return { error: 'Redis indisponible ou non configuré' };
    }
    try {
      const tokens = await redis.smembers('router:tokens');
      const entries = [];
      for (const token of tokens) {
        const [flowId, enabledRaw, clientId, stream, authType, routeKeys] = await Promise.all([
          redis.get(`router:token:${token}:flow_id`),
          redis.get(`router:token:${token}:enabled`),
          redis.get(`router:token:${token}:client_id`),
          redis.get(`router:token:${token}:stream`),
          redis.get(`router:token:${token}:auth_type`),
          redis.smembers(`router:token:${token}:route_keys`),
        ]);
        const hasBearer = (await redis.exists(`router:token:${token}:auth_value`)) === 1;
        const hasSecret = (await redis.exists(`router:token:${token}:auth_secret`)) === 1;
        const routePipeline = redis.pipeline();
        for (const rk of routeKeys) {
          routePipeline.get(rk);
        }
        const routeExecRaw = routeKeys.length ? await routePipeline.exec() : [];
        const routeExec = routeExecRaw ?? [];
        const routes: Array<{ redisKey: string; destinationUrl: string | null }> = routeKeys.map((redisKey, i) => {
          const row = routeExec[i];
          const val = Array.isArray(row) && row[1] != null ? String(row[1]) : null;
          return { redisKey, destinationUrl: val };
        });
        entries.push({
          token,
          flowId,
          enabled: enabledRaw === '1',
          clientId,
          stream,
          authType,
          authConfigured: hasBearer || hasSecret,
          routeCount: routeKeys.length,
          routes,
        });
      }
      entries.sort((a, b) => (a.token < b.token ? -1 : 1));
      return { entries };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return { error: msg };
    }
  }

  private async getRedis(): Promise<Redis | null> {
    if (!this.redisEnabled || !this.redisUrl) {
      return null;
    }
    if (this.redisClient) {
      return this.redisClient;
    }
    try {
      this.redisClient = new Redis(this.redisUrl);
      return this.redisClient;
    } catch (error) {
      this.redisEnabled = false;
      this.logger.error(`Connexion Redis impossible pour Flow router sync: ${String(error)}`);
      return null;
    }
  }

  private extractToken(triggerConfig: Record<string, unknown>): string | null {
    const candidates = [
      triggerConfig.token,
      triggerConfig.ingestionToken,
      triggerConfig.flowToken,
      triggerConfig.webhookToken,
    ];
    for (const value of candidates) {
      if (typeof value === 'string' && value.trim().length > 0) {
        return value.trim();
      }
    }
    return null;
  }

  private extractClientId(tenantId: string, triggerConfig: Record<string, unknown>): string {
    const fromConfig = triggerConfig.clientId;
    if (typeof fromConfig === 'string' && fromConfig.trim().length > 0) {
      return fromConfig.trim();
    }
    return tenantId;
  }

  private extractStream(triggerConfig: Record<string, unknown>): string {
    const candidates = [triggerConfig.stream, triggerConfig.benthosStream, triggerConfig.redisStream];
    for (const value of candidates) {
      if (typeof value === 'string' && value.trim().length > 0) {
        return value.trim();
      }
    }
    return 'ingress:global';
  }

  private extractAuthType(triggerConfig: Record<string, unknown>): AuthType {
    const value = triggerConfig.authType;
    if (value === 'bearer' || value === 'hmac' || value === 'none') {
      return value;
    }
    return 'none';
  }

  private extractAuthValue(triggerConfig: Record<string, unknown>): string | null {
    const value = triggerConfig.authValue;
    if (typeof value === 'string' && value.trim().length > 0) {
      return value.trim();
    }
    return null;
  }

  private extractAuthSecret(triggerConfig: Record<string, unknown>): string | null {
    const value = triggerConfig.authSecret;
    if (typeof value === 'string' && value.trim().length > 0) {
      return value.trim();
    }
    return null;
  }

  private extractDefaultDestination(triggerConfig: Record<string, unknown>): string | null {
    const candidates = [triggerConfig.n8nUrl, triggerConfig.destinationUrl, triggerConfig.outputUrl];
    for (const value of candidates) {
      if (typeof value === 'string' && value.trim().length > 0) {
        return value.trim();
      }
    }
    return null;
  }

  private extractRoutes(triggerConfig: Record<string, unknown>): FlowRouterRouteConfig[] {
    const raw = triggerConfig.routes;
    if (!Array.isArray(raw)) {
      return [];
    }
    const routes: FlowRouterRouteConfig[] = [];
    for (const item of raw) {
      if (!item || typeof item !== 'object') {
        continue;
      }
      const route = (item as Record<string, unknown>).route;
      const destinationUrl = (item as Record<string, unknown>).destinationUrl;
      const subclientId = (item as Record<string, unknown>).subclientId;
      if (typeof route !== 'string' || route.trim().length === 0) {
        continue;
      }
      if (typeof destinationUrl !== 'string' || destinationUrl.trim().length === 0) {
        continue;
      }
      routes.push({
        route: route.trim(),
        destinationUrl: destinationUrl.trim(),
        subclientId: typeof subclientId === 'string' ? subclientId.trim() : null,
      });
    }
    return routes;
  }

  private routeRedisKey(token: string, route: FlowRouterRouteConfig): string {
    const normalizedRoute = route.route.toLowerCase();
    const normalizedSubclient = route.subclientId?.trim();
    if (normalizedSubclient) {
      return `router:token:${token}:subclient:${normalizedSubclient}:route:${normalizedRoute}:n8n_url`;
    }
    return `router:token:${token}:route:${normalizedRoute}:n8n_url`;
  }
}
