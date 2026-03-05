import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaClient } from '../../generated/tenant';
import { VaultService } from '../vault/vault.service';
import { ConnectorRegistryService } from './connector-registry.service';
import { TenantDatabaseService } from '../tenants/tenant-database.service';
import { TenantsService } from '../tenants/tenants.service';
import {
  CreateConnectorDto,
  UpdateConnectorDto,
  ConnectorResponseDto,
  TestConnectorResponseDto,
} from './dto';

/**
 * Service CRUD des connecteurs configurés par tenant.
 */
@Injectable()
export class ConnectorsService {
  private readonly logger = new Logger(ConnectorsService.name);

  constructor(
    private readonly vaultService: VaultService,
    private readonly registryService: ConnectorRegistryService,
    private readonly tenantDbService: TenantDatabaseService,
    private readonly tenantsService: TenantsService,
  ) {}

  /**
   * Récupère le client Prisma pour un tenant.
   */
  private async getTenantClient(tenantId: string): Promise<PrismaClient> {
    const tenant = await this.tenantsService.getTenantWithHash(tenantId);
    return this.tenantDbService.getClient(tenantId, tenant.dbConnectionHash);
  }

  /**
   * Crée un nouveau connecteur configuré pour un tenant.
   */
  async create(tenantId: string, dto: CreateConnectorDto): Promise<ConnectorResponseDto> {
    const connectorDef = this.registryService.getById(dto.type);
    if (!connectorDef) {
      throw new BadRequestException(`Type de connecteur inconnu: ${dto.type}`);
    }

    const configHash = this.vaultService.encryptObject(dto.config);

    const prisma = await this.getTenantClient(tenantId);

    const connector = await prisma.connector.create({
      data: {
        type: dto.type,
        name: dto.name,
        configHash,
      },
    });

    this.logger.log(`Connecteur créé: ${connector.id} (${dto.type}) pour tenant ${tenantId}`);

    return this.mapToResponse(connector, connectorDef.connector_meta);
  }

  /**
   * Récupère tous les connecteurs d'un tenant.
   */
  async findAll(tenantId: string): Promise<ConnectorResponseDto[]> {
    const prisma = await this.getTenantClient(tenantId);

    const connectors = await prisma.connector.findMany({
      orderBy: { createdAt: 'desc' },
    });

    return connectors.map((c) => {
      const def = this.registryService.getById(c.type);
      return this.mapToResponse(c, def?.connector_meta);
    });
  }

  /**
   * Récupère un connecteur par son ID.
   */
  async findOne(tenantId: string, connectorId: string): Promise<ConnectorResponseDto> {
    const prisma = await this.getTenantClient(tenantId);

    const connector = await prisma.connector.findUnique({
      where: { id: connectorId },
    });

    if (!connector) {
      throw new NotFoundException(`Connecteur non trouvé: ${connectorId}`);
    }

    const def = this.registryService.getById(connector.type);
    return this.mapToResponse(connector, def?.connector_meta);
  }

  /**
   * Met à jour un connecteur.
   */
  async update(
    tenantId: string,
    connectorId: string,
    dto: UpdateConnectorDto,
  ): Promise<ConnectorResponseDto> {
    const prisma = await this.getTenantClient(tenantId);

    const existing = await prisma.connector.findUnique({
      where: { id: connectorId },
    });

    if (!existing) {
      throw new NotFoundException(`Connecteur non trouvé: ${connectorId}`);
    }

    const updateData: Record<string, unknown> = {};

    if (dto.name !== undefined) {
      updateData.name = dto.name;
    }

    if (dto.isActive !== undefined) {
      updateData.isActive = dto.isActive;
    }

    if (dto.config !== undefined) {
      updateData.configHash = this.vaultService.encryptObject(dto.config);
    }

    const connector = await prisma.connector.update({
      where: { id: connectorId },
      data: updateData,
    });

    this.logger.log(`Connecteur mis à jour: ${connectorId}`);

    const def = this.registryService.getById(connector.type);
    return this.mapToResponse(connector, def?.connector_meta);
  }

  /**
   * Supprime un connecteur.
   */
  async delete(tenantId: string, connectorId: string): Promise<void> {
    const prisma = await this.getTenantClient(tenantId);

    const existing = await prisma.connector.findUnique({
      where: { id: connectorId },
    });

    if (!existing) {
      throw new NotFoundException(`Connecteur non trouvé: ${connectorId}`);
    }

    await prisma.connector.delete({
      where: { id: connectorId },
    });

    this.logger.log(`Connecteur supprimé: ${connectorId}`);
  }

  /**
   * Teste la connexion d'un connecteur.
   */
  async testConnection(
    tenantId: string,
    connectorId: string,
  ): Promise<TestConnectorResponseDto> {
    const prisma = await this.getTenantClient(tenantId);

    const connector = await prisma.connector.findUnique({
      where: { id: connectorId },
    });

    if (!connector) {
      throw new NotFoundException(`Connecteur non trouvé: ${connectorId}`);
    }

    const connectorDef = this.registryService.getById(connector.type);
    if (!connectorDef) {
      throw new BadRequestException(`Type de connecteur inconnu: ${connector.type}`);
    }

    const config = this.vaultService.decryptObject<Record<string, unknown>>(connector.configHash);
    const startTime = Date.now();

    try {
      const result = await this.performConnectionTest(connectorDef.connector_meta.auth_type, config);
      const durationMs = Date.now() - startTime;

      await prisma.connector.update({
        where: { id: connectorId },
        data: {
          lastTestedAt: new Date(),
          lastTestOk: result.success,
        },
      });

      return {
        success: result.success,
        message: result.message,
        durationMs,
        details: result.details,
      };
    } catch (error) {
      const durationMs = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';

      await prisma.connector.update({
        where: { id: connectorId },
        data: {
          lastTestedAt: new Date(),
          lastTestOk: false,
        },
      });

      return {
        success: false,
        message: `Échec du test: ${errorMessage}`,
        durationMs,
      };
    }
  }

  /**
   * Effectue le test de connexion selon le type d'authentification.
   */
  private async performConnectionTest(
    authType: string,
    config: Record<string, unknown>,
  ): Promise<{ success: boolean; message: string; details?: Record<string, unknown> }> {
    switch (authType) {
      case 'api_key': {
        const baseUrl = config.base_url as string | undefined;
        if (!baseUrl) {
          return { success: false, message: 'URL de base non configurée' };
        }

        try {
          const response = await fetch(baseUrl, {
            method: 'HEAD',
            headers: config.api_key
              ? { 'X-API-Key': config.api_key as string }
              : undefined,
          });

          return {
            success: response.ok || response.status === 401,
            message: response.ok ? 'Connexion réussie' : `Status: ${response.status}`,
            details: { status: response.status },
          };
        } catch (error) {
          const msg = error instanceof Error ? error.message : 'Erreur réseau';
          return { success: false, message: msg };
        }
      }

      case 'oauth2': {
        const hasTokens = config.access_token || config.refresh_token;
        return {
          success: Boolean(hasTokens),
          message: hasTokens ? 'Tokens OAuth2 configurés' : 'Aucun token OAuth2',
        };
      }

      case 'basic': {
        const hasCredentials = config.username && config.password;
        const baseUrl = config.base_url as string | undefined;

        if (!hasCredentials) {
          return { success: false, message: 'Identifiants non configurés' };
        }

        if (baseUrl) {
          try {
            const auth = Buffer.from(`${config.username}:${config.password}`).toString('base64');
            const response = await fetch(baseUrl, {
              method: 'HEAD',
              headers: { Authorization: `Basic ${auth}` },
            });

            return {
              success: response.ok,
              message: response.ok ? 'Connexion réussie' : `Status: ${response.status}`,
            };
          } catch (error) {
            const msg = error instanceof Error ? error.message : 'Erreur réseau';
            return { success: false, message: msg };
          }
        }

        return { success: true, message: 'Identifiants configurés' };
      }

      default:
        return { success: true, message: 'Configuration validée' };
    }
  }

  /**
   * Récupère la configuration déchiffrée d'un connecteur.
   */
  async getDecryptedConfig(tenantId: string, connectorId: string): Promise<Record<string, unknown>> {
    const prisma = await this.getTenantClient(tenantId);

    const connector = await prisma.connector.findUnique({
      where: { id: connectorId },
    });

    if (!connector) {
      throw new NotFoundException(`Connecteur non trouvé: ${connectorId}`);
    }

    return this.vaultService.decryptObject<Record<string, unknown>>(connector.configHash);
  }

  /**
   * Mappe un connecteur vers le DTO de réponse.
   */
  private mapToResponse(
    connector: {
      id: string;
      type: string;
      name: string;
      isActive: boolean;
      lastTestedAt: Date | null;
      lastTestOk: boolean | null;
      createdAt: Date;
    },
    meta?: {
      name: string;
      icon: string;
      category: string;
      auth_type: string;
    },
  ): ConnectorResponseDto {
    return {
      id: connector.id,
      type: connector.type,
      name: connector.name,
      isActive: connector.isActive,
      lastTestedAt: connector.lastTestedAt,
      lastTestOk: connector.lastTestOk,
      createdAt: connector.createdAt,
      connectorInfo: meta ?? {
        name: connector.type,
        icon: 'unknown.svg',
        category: 'Inconnu',
        auth_type: 'unknown',
      },
    };
  }
}
