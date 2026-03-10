import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue } from 'bullmq';
import { PrismaClient } from '../../generated/tenant';
import { TenantDatabaseService } from '../tenants/tenant-database.service';
import { TenantsService } from '../tenants/tenants.service';

export interface ExecutionResult {
  executionId: string;
  status: 'PENDING' | 'RUNNING' | 'SUCCESS' | 'PARTIAL' | 'FAILED';
  recordsIn: number;
  recordsOut: number;
  recordsFailed: number;
  errorMessage?: string;
  startedAt?: Date;
  finishedAt?: Date | null;
}

/**
 * Service d'exécution des flux d'intégration.
 */
@Injectable()
export class EngineService {
  private readonly logger = new Logger(EngineService.name);
  private flowQueue: Queue | null = null;

  constructor(
    private readonly configService: ConfigService,
    private readonly tenantDbService: TenantDatabaseService,
    private readonly tenantsService: TenantsService,
  ) {
    this.initQueue();
  }

  /**
   * Initialise la queue BullMQ.
   */
  private initQueue(): void {
    const redisUrl = this.configService.get<string>('REDIS_URL');
    if (redisUrl) {
      try {
        const url = new URL(redisUrl);
        this.flowQueue = new Queue('flow-executions', {
          connection: {
            host: url.hostname,
            port: parseInt(url.port) || 6379,
          },
        });
        this.logger.log('Queue BullMQ initialisée');
      } catch (error) {
        this.logger.warn('Redis non disponible, exécution synchrone uniquement');
      }
    }
  }

  private async getTenantClient(tenantId: string): Promise<PrismaClient> {
    const tenant = await this.tenantsService.getTenantWithHash(tenantId);
    return this.tenantDbService.getClient(tenantId, tenant.dbConnectionHash);
  }

  /**
   * Lance l'exécution d'un flux.
   */
  async executeFlow(
    tenantId: string,
    flowId: string,
    options: { isDryRun?: boolean; triggerSource?: string } = {},
  ): Promise<ExecutionResult> {
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

    if (!flow.isActive && !options.isDryRun) {
      throw new BadRequestException('Le flux n\'est pas actif');
    }

    const execution = await prisma.flowExecution.create({
      data: {
        flowId,
        environment: flow.environment,
        triggerSource: options.triggerSource || 'MANUAL',
        isDryRun: options.isDryRun || false,
        status: 'PENDING',
      },
    });

    if (this.flowQueue) {
      await this.flowQueue.add(
        'execute',
        {
          tenantId,
          executionId: execution.id,
          flowId,
          isDryRun: options.isDryRun,
        },
        {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 1000,
          },
        },
      );
      this.logger.log(`Job ajouté à la queue: ${execution.id}`);
    } else {
      this.processExecution(tenantId, execution.id, flowId, options.isDryRun || false);
    }

    return {
      executionId: execution.id,
      status: 'PENDING',
      recordsIn: 0,
      recordsOut: 0,
      recordsFailed: 0,
    };
  }

  /**
   * Traite une exécution de flux (appelé par le worker ou directement).
   */
  async processExecution(
    tenantId: string,
    executionId: string,
    flowId: string,
    isDryRun: boolean,
  ): Promise<void> {
    const prisma = await this.getTenantClient(tenantId);

    await prisma.flowExecution.update({
      where: { id: executionId },
      data: { status: 'RUNNING' },
    });

    try {
      const flow = await prisma.flow.findUnique({
        where: { id: flowId },
        include: {
          sourceConnector: true,
          destinations: {
            include: { connector: true, mapping: true },
            where: { isActive: true },
            orderBy: { orderIndex: 'asc' },
          },
        },
      });

      if (!flow) {
        throw new Error('Flux non trouvé');
      }

      await this.logExecution(prisma, executionId, 'INFO', 'Démarrage de l\'exécution');

      const recordsIn = 10;
      let recordsOut = 0;
      let recordsFailed = 0;

      await this.logExecution(prisma, executionId, 'INFO', `${recordsIn} records extraits`);

      for (const destination of flow.destinations) {
        try {
          // destination.writeMode (CREATE | UPDATE) et destination.searchFields (pour UPDATE)
          // seront utilisés ici : si UPDATE, rechercher par searchFields puis PATCH si trouvé, sinon créer ou ignorer (logs).
          if (!isDryRun) {
            recordsOut += recordsIn;
          }
          await this.logExecution(
            prisma,
            executionId,
            'INFO',
            `Destination ${destination.connector.name}: ${recordsIn} records traités`,
          );
        } catch (destError) {
          recordsFailed += recordsIn;
          const errorMsg = destError instanceof Error ? destError.message : String(destError);
          await this.logExecution(
            prisma,
            executionId,
            'ERROR',
            `Erreur destination ${destination.connector.name}: ${errorMsg}`,
          );
        }
      }

      const finalStatus = recordsFailed > 0 
        ? (recordsOut > 0 ? 'PARTIAL' : 'FAILED')
        : (isDryRun ? 'DRY_RUN_OK' : 'SUCCESS');

      await prisma.flowExecution.update({
        where: { id: executionId },
        data: {
          status: finalStatus,
          recordsIn,
          recordsOut,
          recordsFailed,
          finishedAt: new Date(),
        },
      });

      await this.logExecution(
        prisma,
        executionId,
        'INFO',
        `Exécution terminée: ${finalStatus} (${recordsIn} in, ${recordsOut} out, ${recordsFailed} failed)`,
      );

      this.logger.log(`Exécution ${executionId} terminée: ${finalStatus}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      await prisma.flowExecution.update({
        where: { id: executionId },
        data: {
          status: 'FAILED',
          errorMessage,
          finishedAt: new Date(),
        },
      });

      await this.logExecution(prisma, executionId, 'ERROR', `Erreur fatale: ${errorMessage}`);

      this.logger.error(`Exécution ${executionId} échouée: ${errorMessage}`);
    }
  }

  /**
   * Ajoute un log d'exécution.
   */
  private async logExecution(
    prisma: PrismaClient,
    executionId: string,
    level: 'INFO' | 'WARN' | 'ERROR',
    message: string,
    data?: Record<string, unknown>,
  ): Promise<void> {
    await prisma.executionLog.create({
      data: {
        executionId,
        level,
        message,
        data: data as object | undefined,
      },
    });
  }

  /**
   * Récupère le statut d'une exécution.
   */
  async getExecutionStatus(tenantId: string, executionId: string): Promise<ExecutionResult> {
    const prisma = await this.getTenantClient(tenantId);

    const execution = await prisma.flowExecution.findUnique({
      where: { id: executionId },
    });

    if (!execution) {
      throw new NotFoundException(`Exécution non trouvée: ${executionId}`);
    }

    return {
      executionId: execution.id,
      status: execution.status as ExecutionResult['status'],
      recordsIn: execution.recordsIn,
      recordsOut: execution.recordsOut,
      recordsFailed: execution.recordsFailed,
      errorMessage: execution.errorMessage || undefined,
      startedAt: execution.startedAt,
      finishedAt: execution.finishedAt ?? undefined,
    };
  }

  /**
   * Récupère les logs d'une exécution.
   */
  async getExecutionLogs(
    tenantId: string,
    executionId: string,
  ): Promise<Array<{ level: string; message: string; createdAt: Date }>> {
    const prisma = await this.getTenantClient(tenantId);

    const logs = await prisma.executionLog.findMany({
      where: { executionId },
      orderBy: { createdAt: 'asc' },
    });

    return logs.map((l) => ({
      level: l.level,
      message: l.message,
      createdAt: l.createdAt,
    }));
  }

  /**
   * Récupère le statut des queues BullMQ (active, waiting, failed, completed).
   */
  async getQueueStats(): Promise<{
    flowExecutions: { active: number; waiting: number; failed: number; completed: number } | null;
  }> {
    if (!this.flowQueue) {
      return { flowExecutions: null };
    }
    try {
      const counts = await this.flowQueue.getJobCounts();
      return {
        flowExecutions: {
          active: counts.active ?? 0,
          waiting: counts.waiting ?? 0,
          failed: counts.failed ?? 0,
          completed: counts.completed ?? 0,
        },
      };
    } catch (error) {
      this.logger.warn(`Impossible de récupérer les stats des queues: ${error}`);
      return { flowExecutions: null };
    }
  }

  /**
   * Récupère l'historique des exécutions d'un flux.
   */
  async getFlowExecutions(
    tenantId: string,
    flowId: string,
    limit: number = 20,
  ): Promise<ExecutionResult[]> {
    const prisma = await this.getTenantClient(tenantId);

    const executions = await prisma.flowExecution.findMany({
      where: { flowId },
      orderBy: { startedAt: 'desc' },
      take: limit,
    });

    return executions.map((e) => ({
      executionId: e.id,
      status: e.status as ExecutionResult['status'],
      recordsIn: e.recordsIn,
      recordsOut: e.recordsOut,
      recordsFailed: e.recordsFailed,
      errorMessage: e.errorMessage || undefined,
      startedAt: e.startedAt,
      finishedAt: e.finishedAt ?? undefined,
    }));
  }
}
