import { Injectable, NotFoundException } from '@nestjs/common';
import { ConnectorRegistryService } from '../connectors/connector-registry.service';
import {
  MarketplaceConnectorDto,
  MarketplaceConnectorDetailDto,
  MarketplaceCategoryDto,
  ConnectorOperationDto,
} from './dto';

/**
 * Service Marketplace pour exposer les connecteurs disponibles.
 */
@Injectable()
export class MarketplaceService {
  constructor(private readonly registryService: ConnectorRegistryService) {}

  /**
   * Récupère tous les connecteurs disponibles.
   */
  getAll(): MarketplaceConnectorDto[] {
    const connectors = this.registryService.getAll();

    return connectors.map((c) => this.mapToDto(c));
  }

  /**
   * Récupère les connecteurs groupés par catégorie.
   */
  getByCategories(): MarketplaceCategoryDto[] {
    const connectors = this.registryService.getAll();
    const categoriesMap = new Map<string, MarketplaceConnectorDto[]>();

    for (const connector of connectors) {
      const category = connector.connector_meta.category;
      const existing = categoriesMap.get(category) ?? [];
      existing.push(this.mapToDto(connector));
      categoriesMap.set(category, existing);
    }

    return Array.from(categoriesMap.entries()).map(([name, connectorsList]) => ({
      name,
      count: connectorsList.length,
      connectors: connectorsList,
    }));
  }

  /**
   * Récupère le détail d'un connecteur par son type/ID.
   */
  getDetail(connectorType: string): MarketplaceConnectorDetailDto {
    const connector = this.registryService.getById(connectorType);

    if (!connector) {
      throw new NotFoundException(`Connecteur non trouvé: ${connectorType}`);
    }

    const sourceOps = connector.operations.filter((op) => op.type === 'source');
    const destOps = connector.operations.filter((op) => op.type === 'destination');
    const triggerOps = connector.operations.filter((op) => op.type === 'trigger');

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
      authConfig: connector.auth_config as Record<string, unknown>,
      sourceOperations: sourceOps.map(this.mapOperationToDto),
      destinationOperations: destOps.map(this.mapOperationToDto),
      triggerOperations: triggerOps.map(this.mapOperationToDto),
    };
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

    const operation = connector.operations.find((op) => op.id === operationId);

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
   * Mappe un connecteur chargé vers le DTO Marketplace.
   */
  private mapToDto(connector: {
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
  }): MarketplaceConnectorDto {
    const sourceCount = connector.operations.filter((op) => op.type === 'source').length;
    const destCount = connector.operations.filter((op) => op.type === 'destination').length;

    return {
      id: connector.connector_meta.id,
      name: connector.connector_meta.name,
      version: connector.connector_meta.version,
      icon: connector.connector_meta.icon,
      category: connector.connector_meta.category,
      authType: connector.connector_meta.auth_type,
      docsUrl: connector.connector_meta.docs_url,
      sourceOperationsCount: sourceCount,
      destinationOperationsCount: destCount,
    };
  }

  /**
   * Mappe une opération vers le DTO.
   */
  private mapOperationToDto(operation: {
    id: string;
    label: string;
    type: string;
    method: string;
    description?: string;
  }): ConnectorOperationDto {
    return {
      id: operation.id,
      label: operation.label,
      type: operation.type,
      method: operation.method,
      description: operation.description,
    };
  }
}
