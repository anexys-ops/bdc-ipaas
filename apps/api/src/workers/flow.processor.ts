import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Worker, Job } from 'bullmq';
import { EngineService } from '../modules/engine/engine.service';
import { AppLoggerService } from '../common/logger/logger.service';

export const FLOW_EXECUTIONS_QUEUE = 'flow-executions';

export interface FlowExecutionJobData {
  tenantId: string;
  executionId: string;
  flowId: string;
  isDryRun: boolean;
  ingestionToken?: string;
  clientName?: string;
}

@Injectable()
export class FlowProcessor implements OnModuleInit, OnModuleDestroy {
  private worker: Worker | null = null;

  constructor(
    private readonly configService: ConfigService,
    private readonly engineService: EngineService,
    private readonly logger: AppLoggerService,
  ) {}

  onModuleInit(): void {
    const redisUrl = this.configService.get<string>('REDIS_URL');
    if (!redisUrl) {
      this.logger.warn('REDIS_URL non configurée, worker flow-executions non démarré', 'FlowProcessor');
      return;
    }

    try {
      const url = new URL(redisUrl);
      this.worker = new Worker<FlowExecutionJobData>(
        FLOW_EXECUTIONS_QUEUE,
        (job: Job<FlowExecutionJobData>) => this.processJob(job),
        {
          connection: {
            host: url.hostname,
            port: parseInt(url.port, 10) || 6379,
          },
          concurrency: 5,
        },
      );

      this.worker.on('completed', (job) => {
        this.logger.log(
          `Job ${job.id} terminé (executionId=${(job.data as FlowExecutionJobData).executionId})`,
          'FlowProcessor',
        );
      });

      this.worker.on('failed', (job, err) => {
        this.logger.error(
          `Job ${job?.id} échoué (tentative ${job?.attemptsMade}/${job?.opts?.attempts ?? 3}): ${err.message}`,
          err.stack,
          'FlowProcessor',
        );
      });

      this.logger.log('Worker BullMQ flow-executions démarré', 'FlowProcessor');
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(`Impossible de démarrer le worker flow-executions: ${msg}`, undefined, 'FlowProcessor');
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.worker) {
      await this.worker.close();
      this.logger.log('Worker BullMQ flow-executions arrêté', 'FlowProcessor');
      this.worker = null;
    }
  }

  private async processJob(job: Job<FlowExecutionJobData>): Promise<void> {
    const { tenantId, executionId, flowId, isDryRun = false, ingestionToken, clientName } = job.data;

    this.logger.log(
      `Début traitement job ${job.id} (executionId=${executionId}, flowId=${flowId}, tentative ${job.attemptsMade + 1}/${job.opts.attempts ?? 3})`,
      'FlowProcessor',
    );

    await this.engineService.processExecution(
      tenantId,
      executionId,
      flowId,
      isDryRun,
      ingestionToken,
      clientName,
    );

    this.logger.log(`Fin traitement job ${job.id} (executionId=${executionId})`, 'FlowProcessor');
  }
}
