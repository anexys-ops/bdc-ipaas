import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaClient, DestinationWriteMode } from '../../generated/tenant';
import { TenantDatabaseService } from '../tenants/tenant-database.service';
import { TenantsService } from '../tenants/tenants.service';
import {
  CreateFlowDto,
  UpdateFlowDto,
  AddDestinationDto,
  FlowResponseDto,
  FlowVersionResponseDto,
} from './dto';
import { FlowRouterSyncPayload, FlowRouterSyncService } from './flow-router-sync.service';
import { GateRedisService } from '../gateway/gate-redis.service';

/**
 * Service CRUD des flux d'intégration.
 */
@Injectable()
export class FlowsService {
  private readonly logger = new Logger(FlowsService.name);

  constructor(
    private readonly tenantDbService: TenantDatabaseService,
    private readonly tenantsService: TenantsService,
    private readonly flowRouterSyncService: FlowRouterSyncService,
    private readonly gateRedisService: GateRedisService,
  ) {}

  private async getTenantClient(tenantId: string): Promise<PrismaClient> {
    const tenant = await this.tenantsService.getTenantWithHash(tenantId);
    return this.tenantDbService.getClient(tenantId, tenant.dbConnectionHash);
  }

  /**
   * Crée un nouveau flux.
   */
  async create(tenantId: string, dto: CreateFlowDto): Promise<FlowResponseDto> {
    const prisma = await this.getTenantClient(tenantId);
    const mergedTriggerConfig: Record<string, unknown> =
      dto.triggerType === 'WEBHOOK'
        ? { webhookRoute: 'default', ...(dto.triggerConfig as Record<string, unknown>) }
        : (dto.triggerConfig as Record<string, unknown>);
    this.validateTriggerConfig(dto.triggerType, mergedTriggerConfig);

    const sourceConnector = await prisma.connector.findUnique({
      where: { id: dto.sourceConnectorId },
    });

    if (!sourceConnector) {
      throw new BadRequestException(`Connecteur source non trouvé: ${dto.sourceConnectorId}`);
    }

    const flow = await prisma.flow.create({
      data: {
        name: dto.name,
        description: dto.description,
        sourceConnectorId: dto.sourceConnectorId,
        triggerType: dto.triggerType,
        triggerConfig: mergedTriggerConfig as object,
      },
      include: {
        sourceConnector: true,
        destinations: {
          include: { connector: true, mapping: true },
          orderBy: { orderIndex: 'asc' },
        },
      },
    });

    await prisma.flowVersion.create({
      data: {
        flowId: flow.id,
        version: 1,
        snapshot: this.createSnapshot(flow) as object,
      },
    });

    this.logger.log(`Flux créé: ${flow.id} (${flow.name})`);
    await this.syncRouterState(await this.buildRouterPayload(tenantId, flow));
    await this.afterWebhookFlowChange(tenantId, flow.triggerType as string);

    return this.mapToResponse(flow);
  }

  /**
   * Récupère tous les flux d'un tenant.
   */
  async findAll(tenantId: string): Promise<FlowResponseDto[]> {
    const prisma = await this.getTenantClient(tenantId);

    const flows = await prisma.flow.findMany({
      include: {
        sourceConnector: true,
        destinations: {
          include: { connector: true, mapping: true },
          orderBy: { orderIndex: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return flows.map((f) => this.mapToResponse(f));
  }

  /**
   * Récupère un flux par son ID.
   */
  async findOne(tenantId: string, flowId: string): Promise<FlowResponseDto> {
    const prisma = await this.getTenantClient(tenantId);

    const flow = await prisma.flow.findUnique({
      where: { id: flowId },
      include: {
        sourceConnector: true,
        destinations: {
          include: { connector: true, mapping: true },
          orderBy: { orderIndex: 'asc' },
        },
      },
    });

    if (!flow) {
      throw new NotFoundException(`Flux non trouvé: ${flowId}`);
    }

    return this.mapToResponse(flow);
  }

  /**
   * Met à jour un flux.
   */
  async update(tenantId: string, flowId: string, dto: UpdateFlowDto): Promise<FlowResponseDto> {
    const prisma = await this.getTenantClient(tenantId);

    const existing = await prisma.flow.findUnique({ where: { id: flowId } });
    if (!existing) {
      throw new NotFoundException(`Flux non trouvé: ${flowId}`);
    }

    const updateData: Record<string, unknown> = {};
    const nextTriggerType = dto.triggerType ?? (existing.triggerType as unknown as string);
    let nextTriggerConfig = (dto.triggerConfig ?? existing.triggerConfig) as Record<string, unknown>;
    if (nextTriggerType === 'WEBHOOK') {
      const wr = nextTriggerConfig.webhookRoute;
      if (wr === undefined || wr === '' || (typeof wr === 'string' && !String(wr).trim())) {
        nextTriggerConfig = { webhookRoute: 'default', ...nextTriggerConfig };
      }
    }
    this.validateTriggerConfig(nextTriggerType, nextTriggerConfig);
    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.description !== undefined) updateData.description = dto.description;
    if (dto.triggerType !== undefined) updateData.triggerType = dto.triggerType;
    if (dto.triggerConfig !== undefined || nextTriggerType === 'WEBHOOK') {
      updateData.triggerConfig = nextTriggerConfig;
    }
    if (dto.environment !== undefined) updateData.environment = dto.environment;
    if (dto.isActive !== undefined) updateData.isActive = dto.isActive;

    updateData.version = { increment: 1 };

    const flow = await prisma.flow.update({
      where: { id: flowId },
      data: updateData,
      include: {
        sourceConnector: true,
        destinations: {
          include: { connector: true, mapping: true },
          orderBy: { orderIndex: 'asc' },
        },
      },
    });

    await prisma.flowVersion.create({
      data: {
        flowId: flow.id,
        version: flow.version,
        snapshot: this.createSnapshot(flow) as object,
      },
    });

    this.logger.log(`Flux mis à jour: ${flowId} (v${flow.version})`);
    await this.syncRouterState(await this.buildRouterPayload(tenantId, flow));
    await this.afterWebhookFlowChange(tenantId, flow.triggerType as string);

    return this.mapToResponse(flow);
  }

  /**
   * Supprime un flux.
   */
  async delete(tenantId: string, flowId: string): Promise<void> {
    const prisma = await this.getTenantClient(tenantId);

    const existing = await prisma.flow.findUnique({ where: { id: flowId } });
    if (!existing) {
      throw new NotFoundException(`Flux non trouvé: ${flowId}`);
    }
    await this.removeRouterState(
      await this.buildRouterPayload(tenantId, {
        id: existing.id,
        isActive: existing.isActive,
        triggerType: existing.triggerType as string,
        triggerConfig: existing.triggerConfig,
      }),
    );

    await prisma.flowDestination.deleteMany({ where: { flowId } });
    await prisma.flowVersion.deleteMany({ where: { flowId } });
    await prisma.flowExecution.deleteMany({ where: { flowId } });
    await prisma.flow.delete({ where: { id: flowId } });

    this.logger.log(`Flux supprimé: ${flowId}`);
    await this.afterWebhookFlowChange(tenantId, existing.triggerType as string);
  }

  /**
   * Ajoute une destination à un flux.
   */
  async addDestination(
    tenantId: string,
    flowId: string,
    dto: AddDestinationDto,
  ): Promise<FlowResponseDto> {
    const prisma = await this.getTenantClient(tenantId);

    const flow = await prisma.flow.findUnique({ where: { id: flowId } });
    if (!flow) {
      throw new NotFoundException(`Flux non trouvé: ${flowId}`);
    }

    const connector = await prisma.connector.findUnique({ where: { id: dto.connectorId } });
    if (!connector) {
      throw new BadRequestException(`Connecteur destination non trouvé: ${dto.connectorId}`);
    }

    let mappingId: string | undefined = dto.mappingId;

    if (!mappingId && (dto.mappingRules || dto.mappingConfig)) {
      const mapping = await prisma.mapping.create({
        data: {
          name: `Mapping ${flow.name} → ${connector.name}`,
          sourceSchema: {},
          destinationSchema: {},
          rules: (dto.mappingRules || dto.mappingConfig || []) as object,
        },
      });
      mappingId = mapping.id;
    }

    const maxOrder = await prisma.flowDestination.aggregate({
      where: { flowId },
      _max: { orderIndex: true },
    });

    await prisma.flowDestination.create({
      data: {
        flowId,
        connectorId: dto.connectorId,
        mappingId,
        orderIndex: dto.orderIndex ?? (maxOrder._max.orderIndex ?? -1) + 1,
        writeMode: dto.writeMode === 'UPDATE' ? DestinationWriteMode.UPDATE : DestinationWriteMode.CREATE,
        searchFields: dto.searchFields && dto.searchFields.length > 0 ? (dto.searchFields as unknown as object) : undefined,
      },
    });

    const updatedFlow = await this.findOne(tenantId, flowId);
    await this.syncRouterState(await this.buildRouterPayload(tenantId, updatedFlow));
    await this.afterWebhookFlowChange(tenantId, updatedFlow.triggerType);
    return updatedFlow;
  }

  /**
   * Supprime une destination d'un flux.
   */
  async removeDestination(
    tenantId: string,
    flowId: string,
    destinationId: string,
  ): Promise<FlowResponseDto> {
    const prisma = await this.getTenantClient(tenantId);

    const destination = await prisma.flowDestination.findUnique({
      where: { id: destinationId },
    });

    if (!destination || destination.flowId !== flowId) {
      throw new NotFoundException(`Destination non trouvée: ${destinationId}`);
    }

    await prisma.flowDestination.delete({ where: { id: destinationId } });

    const updatedFlow = await this.findOne(tenantId, flowId);
    await this.syncRouterState(await this.buildRouterPayload(tenantId, updatedFlow));
    await this.afterWebhookFlowChange(tenantId, updatedFlow.triggerType);
    return updatedFlow;
  }

  /**
   * Récupère l'historique des versions d'un flux.
   */
  async getVersions(tenantId: string, flowId: string): Promise<FlowVersionResponseDto[]> {
    const prisma = await this.getTenantClient(tenantId);

    const versions = await prisma.flowVersion.findMany({
      where: { flowId },
      orderBy: { version: 'desc' },
    });

    return versions.map((v) => ({
      id: v.id,
      flowId: v.flowId,
      version: v.version,
      snapshot: v.snapshot as Record<string, unknown>,
      createdAt: v.createdAt,
    }));
  }

  /**
   * Active ou désactive un flux.
   */
  async setActive(tenantId: string, flowId: string, isActive: boolean): Promise<FlowResponseDto> {
    return this.update(tenantId, flowId, { isActive });
  }

  async syncRouterForFlow(tenantId: string, flowId: string): Promise<void> {
    const flow = await this.findOne(tenantId, flowId);
    await this.syncRouterState(await this.buildRouterPayload(tenantId, flow));
    await this.afterWebhookFlowChange(tenantId, flow.triggerType);
  }

  async syncRouterForAllFlows(tenantId: string): Promise<number> {
    const flows = await this.findAll(tenantId);
    for (const flow of flows) {
      await this.syncRouterState(await this.buildRouterPayload(tenantId, flow));
    }
    await this.gateRedisService.syncTenantPresence(tenantId);
    return flows.length;
  }

  /**
   * Crée un snapshot du flux pour le versioning.
   */
  private createSnapshot(flow: {
    name: string;
    description: string | null;
    triggerType: string;
    triggerConfig: unknown;
    environment: string;
    destinations?: Array<{
      connectorId: string;
      mappingId: string | null;
      orderIndex: number;
      writeMode: string;
      searchFields: unknown;
    }>;
  }): Record<string, unknown> {
    return {
      name: flow.name,
      description: flow.description,
      triggerType: flow.triggerType,
      triggerConfig: flow.triggerConfig,
      environment: flow.environment,
      destinations: flow.destinations?.map((d) => ({
        connectorId: d.connectorId,
        mappingId: d.mappingId,
        orderIndex: d.orderIndex,
        writeMode: d.writeMode,
        searchFields: d.searchFields,
      })),
    };
  }

  private validateTriggerConfig(triggerType: string, triggerConfig: Record<string, unknown>): void {
    if (triggerType === 'FILE_WATCH') {
      const inputPath = typeof triggerConfig?.inputPath === 'string' ? triggerConfig.inputPath.trim() : '';
      if (!inputPath) {
        throw new BadRequestException(
          'Le déclencheur FILE_WATCH exige triggerConfig.inputPath (fichier lu par le moteur). triggerConfig.outputPath est optionnel (sortie locale Benthos) ; sans sortie locale, les destinations (ex. FTP) reçoivent les enregistrements transformés.',
        );
      }
      this.validateBenthosIngressStream(triggerConfig);
      return;
    }
    if (triggerType === 'WEBHOOK') {
      this.validateBenthosIngressStream(triggerConfig);
    }
  }

  /** Si ingressViaBenthos est activé, le stream Redis (file Benthos) est obligatoire. */
  private validateBenthosIngressStream(triggerConfig: Record<string, unknown>): void {
    if (triggerConfig.ingressViaBenthos !== true) {
      return;
    }
    const stream =
      (typeof triggerConfig.stream === 'string' && triggerConfig.stream.trim()) ||
      (typeof triggerConfig.benthosStream === 'string' && triggerConfig.benthosStream.trim()) ||
      (typeof triggerConfig.redisStream === 'string' && triggerConfig.redisStream.trim()) ||
      '';
    if (!stream) {
      throw new BadRequestException(
        'Avec ingressViaBenthos, renseignez triggerConfig.stream (ou benthosStream / redisStream) : nom du Redis Stream consommé par Benthos.',
      );
    }
  }

  /**
   * Mappe un flux vers le DTO de réponse.
   */
  private mapToResponse(flow: {
    id: string;
    name: string;
    description: string | null;
    sourceConnectorId: string;
    sourceConnector: { name: string; type: string };
    triggerType: string;
    triggerConfig: unknown;
    environment: string;
    isActive: boolean;
    version: number;
    createdAt: Date;
    updatedAt: Date;
    destinations: Array<{
      id: string;
      connectorId: string;
      connector: { name: string; type: string };
      mappingId: string | null;
      orderIndex: number;
      isActive: boolean;
      writeMode: string;
      searchFields: unknown;
    }>;
  }): FlowResponseDto {
    return {
      id: flow.id,
      name: flow.name,
      description: flow.description,
      sourceConnectorId: flow.sourceConnectorId,
      sourceConnectorName: flow.sourceConnector.name,
      sourceConnectorType: flow.sourceConnector.type,
      triggerType: flow.triggerType,
      triggerConfig: flow.triggerConfig as Record<string, unknown>,
      environment: flow.environment,
      isActive: flow.isActive,
      version: flow.version,
      createdAt: flow.createdAt,
      updatedAt: flow.updatedAt,
      destinations: flow.destinations.map((d) => ({
        id: d.id,
        connectorId: d.connectorId,
        connectorName: d.connector.name,
        connectorType: d.connector.type,
        mappingId: d.mappingId,
        orderIndex: d.orderIndex,
        isActive: d.isActive,
        writeMode: d.writeMode ?? 'CREATE',
        searchFields: Array.isArray(d.searchFields) ? (d.searchFields as string[]) : null,
      })),
    };
  }

  private async buildRouterPayload(
    tenantId: string,
    flow: {
      id: string;
      isActive: boolean;
      triggerType: string;
      triggerConfig: unknown;
    },
  ): Promise<FlowRouterSyncPayload> {
    const base = (flow.triggerConfig ?? {}) as Record<string, unknown>;
    let triggerConfig: Record<string, unknown> = { ...base };
    if (flow.triggerType === 'WEBHOOK') {
      const gateToken = await this.tenantsService.getMasterTenantGateToken(tenantId);
      if (gateToken) {
        triggerConfig = { ...triggerConfig, ingestionToken: gateToken };
      }
      if (triggerConfig.webhookRoute === undefined || triggerConfig.webhookRoute === '') {
        triggerConfig = { ...triggerConfig, webhookRoute: 'default' };
      }
    }
    return {
      flowId: flow.id,
      tenantId,
      isActive: flow.isActive,
      triggerConfig,
    };
  }

  private async afterWebhookFlowChange(tenantId: string, triggerType: string): Promise<void> {
    if (triggerType !== 'WEBHOOK') {
      return;
    }
    try {
      await this.gateRedisService.syncTenantPresence(tenantId);
    } catch (e) {
      this.logger.warn(`sync gate Redis tenant ${tenantId}: ${String(e)}`);
    }
  }

  private async syncRouterState(payload: FlowRouterSyncPayload): Promise<void> {
    try {
      await this.flowRouterSyncService.syncFlow(payload);
    } catch (error) {
      this.logger.error(`Sync router Redis échouée pour flow ${payload.flowId}: ${String(error)}`);
    }
  }

  private async removeRouterState(payload: FlowRouterSyncPayload): Promise<void> {
    try {
      await this.flowRouterSyncService.removeFlow(payload);
    } catch (error) {
      this.logger.error(`Suppression router Redis échouée pour flow ${payload.flowId}: ${String(error)}`);
    }
  }
}
