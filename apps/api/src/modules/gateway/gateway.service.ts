import {
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { TenantDatabaseService } from '../tenants/tenant-database.service';
import { EngineService } from '../engine/engine.service';

export interface GatewayIngestResult {
  accepted: boolean;
  messageId: string;
  executionId: string;
}

@Injectable()
export class GatewayService {
  private readonly logger = new Logger(GatewayService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantDb: TenantDatabaseService,
    private readonly engineService: EngineService,
  ) {}

  async ingest(params: {
    gateToken: string | undefined;
    routeHeader: string | undefined;
    messageIdHeader: string | undefined;
    body: unknown;
  }): Promise<GatewayIngestResult> {
    const gateToken = params.gateToken?.trim();
    if (!gateToken) {
      throw new UnauthorizedException('X-Gate-Token requis');
    }

    const tenantRow = await this.prisma.tenant.findFirst({
      where: { gateToken, isActive: true },
      select: { id: true, slug: true, dbConnectionHash: true },
    });
    if (!tenantRow) {
      throw new UnauthorizedException('Jeton gate invalide ou client inactif');
    }

    const prismaTenant = await this.tenantDb.getClient(tenantRow.id, tenantRow.dbConnectionHash);
    const route = (params.routeHeader ?? 'default').trim().toLowerCase() || 'default';

    const flows = await prismaTenant.flow.findMany({
      where: { triggerType: 'WEBHOOK', isActive: true },
      select: { id: true, triggerConfig: true },
    });

    const flow = flows.find((f) => {
      const cfg = (f.triggerConfig ?? {}) as Record<string, unknown>;
      const wr =
        typeof cfg.webhookRoute === 'string' && cfg.webhookRoute.trim().length > 0
          ? cfg.webhookRoute.trim().toLowerCase()
          : 'default';
      return wr === route;
    });

    if (!flow) {
      throw new NotFoundException(`Aucun flux WEBHOOK actif pour la route « ${route} »`);
    }

    const messageId = params.messageIdHeader?.trim() || randomUUID();
    const payload = this.normalizeWebhookBody(params.body);

    this.logger.log(
      `Ingest gateway tenant=${tenantRow.id} flow=${flow.id} messageId=${messageId} (sans corps)`,
    );

    const result = await this.engineService.executeFlow(tenantRow.id, flow.id, {
      isDryRun: false,
      triggerSource: `WEBHOOK:${messageId}`,
      ingestionToken: gateToken,
      payload,
    });

    return {
      accepted: true,
      messageId,
      executionId: result.executionId,
    };
  }

  private normalizeWebhookBody(body: unknown): Record<string, unknown> | unknown[] {
    if (body === null || body === undefined) {
      return {};
    }
    if (Array.isArray(body)) {
      return body;
    }
    if (typeof body === 'object') {
      const o = body as Record<string, unknown>;
      if ('data' in o && o.data !== undefined) {
        const inner = o.data;
        if (Array.isArray(inner)) {
          return inner;
        }
        if (inner !== null && typeof inner === 'object') {
          return inner as Record<string, unknown>;
        }
        return { data: inner } as Record<string, unknown>;
      }
      return o;
    }
    return { value: body } as Record<string, unknown>;
  }
}
