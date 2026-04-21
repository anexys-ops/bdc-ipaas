import { Injectable, NotFoundException } from '@nestjs/common';
import { ConnectorRegistryService } from '../connectors/connector-registry.service';
import type { AuthConfig, ConnectorOperation } from '../connectors/interfaces';
import {
  MarketplaceConnectorDto,
  MarketplaceConnectorDetailDto,
  MarketplaceCategoryDto,
  ConnectorOperationDto,
  ConfigFieldDto,
} from './dto';
import { SAGE_CONNECTOR_IDS, SAGE_OPERATIONS_FALLBACK } from './sage-operations.fallback';
import { MarketplaceItemService } from './marketplace-item.service';

const DEFAULT_STARS = 5;
const DEFAULT_PRICE_LABEL = '99€ HT';

/**
 * Service Marketplace pour exposer les connecteurs disponibles.
 */
@Injectable()
export class MarketplaceService {
  constructor(
    private readonly registryService: ConnectorRegistryService,
    private readonly marketplaceItemService: MarketplaceItemService,
  ) {}

  /**
   * Récupère tous les connecteurs disponibles (avec overlay admin), uniquement les connecteurs activés.
   */
  async getAll(): Promise<MarketplaceConnectorDto[]> {
    const connectors = this.registryService.getAll();
    const overlayMap = await this.marketplaceItemService.getOverlayMap();
    return connectors
      .filter((c) => {
        const overlay = overlayMap.get(c.connector_meta.id);
        return overlay === undefined || overlay.enabled;
      })
      .map((c) => this.mapToDto(c, overlayMap, false));
  }

  /**
   * Récupère tous les connecteurs pour l’admin (avec overlay dont enabled), sans filtre.
   */
  async getAllForAdmin(): Promise<MarketplaceConnectorDto[]> {
    const connectors = this.registryService.getAll();
    const overlayMap = await this.marketplaceItemService.getOverlayMap();
    return connectors.map((c) => this.mapToDto(c, overlayMap, true));
  }

  /**
   * Récupère les connecteurs groupés par catégorie (avec overlay admin), uniquement les connecteurs activés.
   */
  async getByCategories(): Promise<MarketplaceCategoryDto[]> {
    const connectors = this.registryService.getAll();
    const overlayMap = await this.marketplaceItemService.getOverlayMap();
    const categoriesMap = new Map<string, MarketplaceConnectorDto[]>();

    for (const connector of connectors) {
      const overlay = overlayMap.get(connector.connector_meta.id);
      if (overlay !== undefined && !overlay.enabled) continue;
      const category = connector.connector_meta.category;
      const existing = categoriesMap.get(category) ?? [];
      existing.push(this.mapToDto(connector, overlayMap, false));
      categoriesMap.set(category, existing);
    }

    return Array.from(categoriesMap.entries()).map(([name, connectorsList]) => ({
      name,
      count: connectorsList.length,
      connectors: connectorsList,
    }));
  }

  /**
   * Récupère le détail d'un connecteur par son type/ID (avec overlay admin).
   */
  async getDetail(connectorType: string): Promise<MarketplaceConnectorDetailDto> {
    const connector = this.registryService.getById(connectorType);

    if (!connector) {
      throw new NotFoundException(`Connecteur non trouvé: ${connectorType}`);
    }

    const overlayMap = await this.marketplaceItemService.getOverlayMap();
    const overlay = overlayMap.get(connectorType) ?? {
      stars: DEFAULT_STARS,
      priceLabel: DEFAULT_PRICE_LABEL,
      description: null,
      apiJsonPath: null,
      libraryLogoId: null,
      enabled: true,
    };
    if (!overlay.enabled) {
      throw new NotFoundException(`Connecteur non trouvé: ${connectorType}`);
    }

    const operations =
      connector.operations.length === 0 &&
      (SAGE_CONNECTOR_IDS as readonly string[]).includes(connector.connector_meta.id)
        ? SAGE_OPERATIONS_FALLBACK
        : connector.operations;

    const sourceOps = operations.filter((op) => op.type === 'source');
    const destOps = operations.filter((op) => op.type === 'destination');
    const triggerOps = operations.filter((op) => op.type === 'trigger');

    const authType = connector.connector_meta.auth_type;
    const configFields =
      connector.config_fields && connector.config_fields.length > 0
        ? connector.config_fields.map((f) => ({
            key: f.key,
            label: f.label,
            type: f.type,
            required: f.required,
            placeholder: f.placeholder,
            description: f.description,
          }))
        : authType === 'none'
          ? []
          : this.buildConfigFields(authType, connector.auth_config);

    const meta = connector.connector_meta as { agent_downloads?: { windows?: string; mac?: string } };
    return {
      id: connector.connector_meta.id,
      name: connector.connector_meta.name,
      version: connector.connector_meta.version,
      icon: connector.connector_meta.icon,
      category: connector.connector_meta.category,
      authType: connector.connector_meta.auth_type,
      docsUrl: connector.connector_meta.docs_url,
      sourceOperationsCount: sourceOps.length,
      destinationOperationsCount: destOps.length,
      stars: overlay.stars,
      priceLabel: overlay.priceLabel,
      description: overlay.description,
      apiJsonPath: overlay.apiJsonPath,
      libraryLogoId: overlay.libraryLogoId ?? null,
      authConfig: connector.auth_config as Record<string, unknown>,
      configFields,
      configInstructions: connector.connector_meta.config_instructions,
      agentDownloads: meta.agent_downloads,
      sourceOperations: sourceOps.map(this.mapOperationToDto),
      destinationOperations: destOps.map(this.mapOperationToDto),
      triggerOperations: triggerOps.map(this.mapOperationToDto),
    };
  }

  /**
   * Construit la liste des champs de configuration selon le type d'auth et le connecteur.
   */
  private buildConfigFields(
    authType: string,
    authConfig: AuthConfig,
  ): ConfigFieldDto[] {
    const baseUrlParam = authConfig.base_url_param ?? 'base_url';
    const fields: ConfigFieldDto[] = [];

    switch (authType) {
      case 'oauth2': {
        fields.push(
          {
            key: baseUrlParam,
            label: 'URL de base',
            type: 'text',
            required: false,
            placeholder: 'https://api.example.com/v2',
            description: 'URL de l’API (optionnel si valeur par défaut connue).',
          },
          {
            key: 'access_token',
            label: 'Token d’accès (Access Token)',
            type: 'password',
            required: true,
            placeholder: 'Collez le token OAuth2 ou clé API',
            description: 'Token obtenu après OAuth ou depuis les paramètres du logiciel.',
          },
        );
        break;
      }
      case 'api_key': {
        const headerName = authConfig.api_key_header ?? 'X-API-Key';
        fields.push(
          {
            key: baseUrlParam,
            label: 'URL de base',
            type: 'text',
            required: true,
            placeholder: 'https://votre-instance.example.com/api',
            description: 'URL de base de l’API (sans slash final).',
          },
          {
            key: 'api_key',
            label: 'Clé API',
            type: 'password',
            required: true,
            placeholder: 'Votre clé API',
            description: `Envoyée dans l’en-tête ${headerName}. Créez-la dans les paramètres du logiciel.`,
          },
        );
        break;
      }
      case 'basic': {
        fields.push(
          {
            key: baseUrlParam,
            label: 'URL de base',
            type: 'text',
            required: false,
            placeholder: 'https://votre-serveur.example.com',
            description: 'URL de base (optionnel).',
          },
          {
            key: 'username',
            label: 'Identifiant',
            type: 'text',
            required: true,
            placeholder: 'Utilisateur API',
          },
          {
            key: 'password',
            label: 'Mot de passe',
            type: 'password',
            required: true,
            placeholder: 'Mot de passe ou token',
          },
        );
        break;
      }
      case 'oauth1': {
        const shopKey = authConfig.base_url_param ?? 'shop_url';
        const consumerKeyParam = authConfig.consumer_key_param ?? 'consumer_key';
        const consumerSecretParam = authConfig.consumer_secret_param ?? 'consumer_secret';
        fields.push(
          {
            key: shopKey,
            label: 'URL du site / boutique',
            type: 'text',
            required: true,
            placeholder: 'https://votre-boutique.com',
            description: 'URL de la boutique (sans slash final).',
          },
          {
            key: consumerKeyParam,
            label: 'Clé consommateur (Consumer Key)',
            type: 'text',
            required: true,
            placeholder: 'ck_xxxx',
          },
          {
            key: consumerSecretParam,
            label: 'Secret consommateur (Consumer Secret)',
            type: 'password',
            required: true,
            placeholder: 'cs_xxxx',
            description: 'Clé et secret disponibles dans les réglages API du logiciel.',
          },
        );
        break;
      }
      case 'agent': {
        break;
      }
      case 'certificate': {
        break;
      }
      case 'none': {
        break;
      }
      default: {
        fields.push(
          {
            key: baseUrlParam,
            label: 'URL de base',
            type: 'text',
            required: true,
            placeholder: 'https://api.example.com',
          },
          {
            key: 'api_key',
            label: 'Clé API / Secret',
            type: 'password',
            required: false,
            placeholder: 'Optionnel',
          },
        );
      }
    }

    return fields;
  }

  /**
   * Récupère le schéma d'une opération spécifique.
   */
  getOperationSchema(
    connectorType: string,
    operationId: string,
  ): { input?: unknown; output?: unknown; config?: unknown } {
    const connector = this.registryService.getById(connectorType);

    if (!connector) {
      throw new NotFoundException(`Connecteur non trouvé: ${connectorType}`);
    }

    const operations =
      connector.operations.length === 0 &&
      (SAGE_CONNECTOR_IDS as readonly string[]).includes(connector.connector_meta.id)
        ? SAGE_OPERATIONS_FALLBACK
        : connector.operations;

    const operation = operations.find((op) => op.id === operationId);

    if (!operation) {
      throw new NotFoundException(`Opération non trouvée: ${operationId}`);
    }

    return {
      input: operation.input_schema,
      output: operation.output_schema,
      config: operation.config_schema,
    };
  }

  /**
   * Mappe un connecteur chargé vers le DTO Marketplace (avec overlay admin).
   * @param includeEnabled si true, ajoute le champ enabled au DTO (pour l’admin).
   */
  private mapToDto(
    connector: {
      connector_meta: {
        id: string;
        name: string;
        version: string;
        icon: string;
        category: string;
        auth_type: string;
        docs_url: string | null;
      };
      operations: Array<{ type: string }>;
    },
    overlayMap: Map<
      string,
      {
        stars: number;
        priceLabel: string;
        description: string | null;
        apiJsonPath: string | null;
        libraryLogoId: string | null;
        enabled: boolean;
      }
    >,
    includeEnabled = false,
  ): MarketplaceConnectorDto {
    const sourceCount = connector.operations.filter((op) => op.type === 'source').length;
    const destCount = connector.operations.filter((op) => op.type === 'destination').length;
    const id = connector.connector_meta.id;
    const overlay = overlayMap.get(id) ?? {
      stars: DEFAULT_STARS,
      priceLabel: DEFAULT_PRICE_LABEL,
      description: null,
      apiJsonPath: null,
      libraryLogoId: null,
      enabled: true,
    };

    const dto: MarketplaceConnectorDto = {
      id,
      name: connector.connector_meta.name,
      version: connector.connector_meta.version,
      icon: connector.connector_meta.icon,
      category: connector.connector_meta.category,
      authType: connector.connector_meta.auth_type,
      docsUrl: connector.connector_meta.docs_url,
      sourceOperationsCount: sourceCount,
      destinationOperationsCount: destCount,
      stars: overlay.stars,
      priceLabel: overlay.priceLabel,
      description: overlay.description,
      apiJsonPath: overlay.apiJsonPath,
      libraryLogoId: overlay.libraryLogoId ?? null,
    };
    if (includeEnabled) {
      (dto as MarketplaceConnectorDto & { enabled: boolean }).enabled = overlay.enabled;
    }
    return dto;
  }

  /**
   * Mappe une opération vers le DTO (avec endpoint path et schémas complets pour afficher les champs JSON).
   */
  private mapOperationToDto(operation: ConnectorOperation): ConnectorOperationDto {
    return {
      id: operation.id,
      label: operation.label,
      type: operation.type,
      method: operation.method,
      path: operation.path,
      description: operation.description,
      outputSchema: operation.output_schema as Record<string, unknown> | undefined,
      inputSchema: operation.input_schema as Record<string, unknown> | undefined,
      configSchema: operation.config_schema as Record<string, unknown> | undefined,
      fileFormat: operation.file_format,
    };
  }
}
