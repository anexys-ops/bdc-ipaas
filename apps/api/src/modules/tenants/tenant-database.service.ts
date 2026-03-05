import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '../../generated/tenant';
import { VaultService } from '../vault/vault.service';

interface TenantConnection {
  client: PrismaClient;
  lastAccess: Date;
}

/**
 * Service de gestion des connexions aux bases de données des tenants.
 * Maintient un pool de connexions PrismaClient avec nettoyage automatique.
 */
@Injectable()
export class TenantDatabaseService implements OnModuleDestroy {
  private readonly logger = new Logger(TenantDatabaseService.name);
  private readonly connections: Map<string, TenantConnection> = new Map();
  private readonly maxIdleTime = 30 * 60 * 1000;
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(private readonly vaultService: VaultService) {
    this.cleanupInterval = setInterval(() => this.cleanupIdleConnections(), 5 * 60 * 1000);
  }

  async onModuleDestroy(): Promise<void> {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    for (const [tenantId, connection] of this.connections) {
      try {
        await connection.client.$disconnect();
        this.logger.log(`Connexion fermée pour tenant: ${tenantId}`);
      } catch (error) {
        this.logger.error(`Erreur fermeture connexion tenant ${tenantId}:`, error);
      }
    }

    this.connections.clear();
  }

  /**
   * Récupère ou crée une connexion PrismaClient pour un tenant spécifique.
   */
  async getClient(tenantId: string, dbConnectionHash: string): Promise<PrismaClient> {
    const existing = this.connections.get(tenantId);

    if (existing) {
      existing.lastAccess = new Date();
      return existing.client;
    }

    const connectionString = this.vaultService.decrypt(dbConnectionHash);

    const client = new PrismaClient({
      datasources: {
        db: {
          url: connectionString,
        },
      },
    });

    await client.$connect();

    this.connections.set(tenantId, {
      client,
      lastAccess: new Date(),
    });

    this.logger.log(`Nouvelle connexion établie pour tenant: ${tenantId}`);

    return client;
  }

  /**
   * Ferme la connexion d'un tenant spécifique.
   */
  async disconnectTenant(tenantId: string): Promise<void> {
    const connection = this.connections.get(tenantId);

    if (connection) {
      await connection.client.$disconnect();
      this.connections.delete(tenantId);
      this.logger.log(`Connexion fermée manuellement pour tenant: ${tenantId}`);
    }
  }

  /**
   * Vérifie si une connexion existe pour un tenant.
   */
  hasConnection(tenantId: string): boolean {
    return this.connections.has(tenantId);
  }

  /**
   * Retourne le nombre de connexions actives.
   */
  getConnectionCount(): number {
    return this.connections.size;
  }

  /**
   * Nettoie les connexions inactives depuis trop longtemps.
   */
  private async cleanupIdleConnections(): Promise<void> {
    const now = new Date();
    const toRemove: string[] = [];

    for (const [tenantId, connection] of this.connections) {
      const idleTime = now.getTime() - connection.lastAccess.getTime();

      if (idleTime > this.maxIdleTime) {
        toRemove.push(tenantId);
      }
    }

    for (const tenantId of toRemove) {
      try {
        const connection = this.connections.get(tenantId);
        if (connection) {
          await connection.client.$disconnect();
          this.connections.delete(tenantId);
          this.logger.log(`Connexion inactive fermée pour tenant: ${tenantId}`);
        }
      } catch (error) {
        this.logger.error(`Erreur nettoyage connexion tenant ${tenantId}:`, error);
      }
    }

    if (toRemove.length > 0) {
      this.logger.log(`Nettoyage: ${toRemove.length} connexions inactives fermées`);
    }
  }
}
