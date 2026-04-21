import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as chokidar from 'chokidar';
import * as fs from 'fs/promises';
import * as path from 'path';
import { ConnectorDefinition, LoadedConnector } from './interfaces';

/**
 * Service de registre des connecteurs.
 * Charge les fichiers openapi.json au démarrage et surveille les modifications en temps réel.
 */
@Injectable()
export class ConnectorRegistryService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ConnectorRegistryService.name);
  private readonly connectors: Map<string, LoadedConnector> = new Map();
  private watcher: chokidar.FSWatcher | null = null;
  private readonly connectorsPath: string;

  constructor(private readonly configService: ConfigService) {
    this.connectorsPath = this.configService.get<string>('CONNECTORS_PATH') 
      ?? path.join(process.cwd(), '../../connectors');
  }

  async onModuleInit(): Promise<void> {
    await this.loadAllConnectors();
    this.startWatching();
  }

  async onModuleDestroy(): Promise<void> {
    if (this.watcher) {
      await this.watcher.close();
      this.logger.log('Surveillance des connecteurs arrêtée');
    }
  }

  /**
   * Charge tous les fichiers openapi.json du dossier des connecteurs.
   */
  private async loadAllConnectors(): Promise<void> {
    try {
      const absolutePath = path.resolve(this.connectorsPath);
      this.logger.log(`Chargement des connecteurs depuis: ${absolutePath}`);

      const entries = await fs.readdir(absolutePath, { withFileTypes: true });
      
      for (const entry of entries) {
        if (entry.isDirectory()) {
          const openapiPath = path.join(absolutePath, entry.name, 'openapi.json');
          await this.loadConnector(openapiPath);
        }
      }

      this.logger.log(`${this.connectors.size} connecteur(s) chargé(s)`);
    } catch (error) {
      this.logger.error('Erreur lors du chargement des connecteurs', error);
    }
  }

  /**
   * Charge un fichier openapi.json spécifique.
   */
  private async loadConnector(filePath: string): Promise<void> {
    try {
      const fileExists = await fs.access(filePath).then(() => true).catch(() => false);
      
      if (!fileExists) {
        return;
      }

      const content = await fs.readFile(filePath, 'utf-8');
      const definition: ConnectorDefinition = JSON.parse(content);

      if (!this.validateConnectorDefinition(definition)) {
        this.logger.warn(`Définition invalide ignorée: ${filePath}`);
        return;
      }

      const loadedConnector: LoadedConnector = {
        ...definition,
        filePath,
        loadedAt: new Date(),
      };

      this.connectors.set(definition.connector_meta.id, loadedConnector);
      this.logger.log(`Connecteur chargé: ${definition.connector_meta.name} (${definition.connector_meta.id})`);
    } catch (error) {
      this.logger.error(`Erreur chargement connecteur ${filePath}:`, error);
    }
  }

  /**
   * Démarre la surveillance des fichiers openapi.json pour le hot-reload.
   */
  private startWatching(): void {
    const absolutePath = path.resolve(this.connectorsPath);
    const pattern = path.join(absolutePath, '*/openapi.json');

    this.watcher = chokidar.watch(pattern, {
      persistent: true,
      ignoreInitial: true,
    });

    this.watcher.on('add', (filePath) => {
      this.logger.log(`Nouveau connecteur détecté: ${filePath}`);
      this.loadConnector(filePath);
    });

    this.watcher.on('change', (filePath) => {
      this.logger.log(`Connecteur modifié: ${filePath}`);
      this.loadConnector(filePath);
    });

    this.watcher.on('unlink', (filePath) => {
      const connectorId = this.findConnectorIdByPath(filePath);
      if (connectorId) {
        this.connectors.delete(connectorId);
        this.logger.log(`Connecteur supprimé: ${connectorId}`);
      }
    });

    this.logger.log(`Surveillance des connecteurs activée: ${pattern}`);
  }

  /**
   * Valide la structure d'une définition de connecteur.
   */
  private validateConnectorDefinition(definition: unknown): definition is ConnectorDefinition {
    if (!definition || typeof definition !== 'object') {
      return false;
    }

    const def = definition as Record<string, unknown>;

    if (!def.connector_meta || typeof def.connector_meta !== 'object') {
      return false;
    }

    const meta = def.connector_meta as Record<string, unknown>;
    
    if (!meta.id || !meta.name || !meta.auth_type) {
      return false;
    }

    if (!Array.isArray(def.operations)) {
      return false;
    }

    return true;
  }

  /**
   * Trouve l'ID d'un connecteur à partir du chemin de son fichier.
   */
  private findConnectorIdByPath(filePath: string): string | null {
    for (const [id, connector] of this.connectors) {
      if (connector.filePath === filePath) {
        return id;
      }
    }
    return null;
  }

  /**
   * Retourne tous les connecteurs disponibles.
   */
  getAll(): LoadedConnector[] {
    return Array.from(this.connectors.values());
  }

  /**
   * Retourne un connecteur par son ID.
   */
  getById(id: string): LoadedConnector | undefined {
    return this.connectors.get(id);
  }

  /**
   * Retourne les connecteurs par catégorie.
   */
  getByCategory(category: string): LoadedConnector[] {
    return this.getAll().filter(
      (c) => c.connector_meta.category.toLowerCase().includes(category.toLowerCase())
    );
  }

  /**
   * Retourne les opérations source d'un connecteur.
   */
  getSourceOperations(connectorId: string): LoadedConnector['operations'] {
    const connector = this.connectors.get(connectorId);
    if (!connector) return [];
    return connector.operations.filter((op) => op.type === 'source');
  }

  /**
   * Retourne les opérations destination d'un connecteur.
   */
  getDestinationOperations(connectorId: string): LoadedConnector['operations'] {
    const connector = this.connectors.get(connectorId);
    if (!connector) return [];
    return connector.operations.filter((op) => op.type === 'destination');
  }

  /**
   * Vérifie si un connecteur existe.
   */
  exists(id: string): boolean {
    return this.connectors.has(id);
  }

  /**
   * Retourne le nombre de connecteurs chargés.
   */
  count(): number {
    return this.connectors.size;
  }

  /**
   * Retourne le chemin du fichier openapi.json pour un connecteur (admin).
   */
  getOpenApiFilePath(connectorId: string): string | null {
    const connector = this.connectors.get(connectorId);
    return connector?.filePath ?? null;
  }
}
