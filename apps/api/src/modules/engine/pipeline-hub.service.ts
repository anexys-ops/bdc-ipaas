import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FlowRouterSyncService } from '../flows/flow-router-sync.service';
import { EngineService } from './engine.service';
import { PipelineInfraService, FlowsRuntimeStatus } from './pipeline-infra.service';

export interface PipelineHubSanitizedConfig {
  nodeEnv: string;
  uptimeSec: number;
  benthosHttpUrl: string;
  redisUrlMasked: string;
  heartbeatKey: string;
  processRole: 'api';
  workerContainerHint: string;
}

export interface PipelineHubOverview {
  runtime: FlowsRuntimeStatus;
  config: PipelineHubSanitizedConfig;
  redisRouter: Awaited<ReturnType<FlowRouterSyncService['listIngestionRouterOverview']>>;
  queueJobs: Awaited<ReturnType<EngineService['getFlowQueueJobsPreview']>>;
}

@Injectable()
export class PipelineHubService {
  private readonly logger = new Logger(PipelineHubService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly pipelineInfra: PipelineInfraService,
    private readonly engineService: EngineService,
    private readonly flowRouterSync: FlowRouterSyncService,
  ) {}

  async getOverview(): Promise<PipelineHubOverview> {
    const [infra, queues, gateMessages] = await Promise.all([
      this.pipelineInfra.getStatus(),
      this.engineService.getQueueStats(),
      this.pipelineInfra.getRecentGateMessages(50),
    ]);
    const benthosEvents = await this.pipelineInfra.getRecentBenthosHeartbeats(100);
    const runtime: FlowsRuntimeStatus = {
      ...infra,
      queues,
      benthosEvents,
      gateMessages,
    };

    const redisUrl = this.config.get<string>('REDIS_URL') ?? '';
    const configBlock: PipelineHubSanitizedConfig = {
      nodeEnv: this.config.get<string>('NODE_ENV') ?? 'development',
      uptimeSec: Math.round(process.uptime()),
      benthosHttpUrl: (this.config.get<string>('BENTHOS_HTTP_URL') ?? 'https://gate.edicloud.app').replace(
        /\/$/,
        '',
      ),
      redisUrlMasked: PipelineHubService.maskRedisUrl(redisUrl),
      heartbeatKey: this.config.get<string>('BENTHOS_REDIS_HEARTBEAT_KEY') ?? 'benthos_heartbeat',
      processRole: 'api',
      workerContainerHint:
        'Le worker BullMQ tourne dans le conteneur Docker « anexys-worker » (même image API, commande worker.js). Surveillez les logs et redémarrez via votre orchestrateur.',
    };

    const [redisRouter, queueJobs] = await Promise.all([
      this.flowRouterSync.listIngestionRouterOverview(),
      this.engineService.getFlowQueueJobsPreview(30),
    ]);

    return { runtime, config: configBlock, redisRouter, queueJobs };
  }

  recordRestartHint(requestedBy: string): { ok: boolean; message: string } {
    this.logger.warn(`Demande de relance enregistrée (API non redémarrée) — demandeur: ${requestedBy}`);
    return {
      ok: true,
      message:
        'Aucun redémarrage automatique depuis cette API (sécurité). Utilisez Docker Compose ou Kubernetes : par ex. `docker compose restart api worker` sur le serveur.',
    };
  }

  private static maskRedisUrl(url: string): string {
    if (!url?.trim()) return '(non configuré)';
    try {
      const u = new URL(url);
      if (u.password) u.password = '***';
      if (u.username) u.username = '***';
      return u.toString();
    } catch {
      return '(URL Redis masquée)';
    }
  }
}
