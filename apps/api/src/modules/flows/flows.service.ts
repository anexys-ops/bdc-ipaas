import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaClient } from '../../generated/tenant';
import { TenantDatabaseService } from '../tenants/tenant-database.service';
import { TenantsService } from '../tenants/tenants.service';
import {
  CreateFlowDto,
  UpdateFlowDto,
  AddDestinationDto,
  FlowResponseDto,
  FlowVersionResponseDto,
} from './dto';

/**
 * Service CRUD des flux d'intégration.
 */
@Injectable()
export class FlowsService {
  private readonly logger = new Logger(FlowsService.name);

  constructor(
    private readonly tenantDbService: TenantDatabaseService,
    private readonly tenantsService: TenantsService,
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
        triggerConfig: dto.triggerConfig as object,
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
    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.description !== undefined) updateData.description = dto.description;
    if (dto.triggerType !== undefined) updateData.triggerType = dto.triggerType;
    if (dto.triggerConfig !== undefined) updateData.triggerConfig = dto.triggerConfig;
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

    await prisma.flowDestination.deleteMany({ where: { flowId } });
    await prisma.flowVersion.deleteMany({ where: { flowId } });
    await prisma.flowExecution.deleteMany({ where: { flowId } });
    await prisma.flow.delete({ where: { id: flowId } });

    this.logger.log(`Flux supprimé: ${flowId}`);
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

    let mappingId: string | undefined;

    if (dto.mappingRules || dto.mappingConfig) {
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
      },
    });

    return this.findOne(tenantId, flowId);
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

    return this.findOne(tenantId, flowId);
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
      })),
    };
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
      })),
    };
  }
}
