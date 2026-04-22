import { Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard, RolesGuard } from '../../common/guards';
import { CurrentUser, Roles } from '../../common/decorators';
import type { AuthenticatedUser } from '../auth/interfaces';
import { PrismaService } from '../../prisma/prisma.service';
import { EngineService } from './engine.service';
import { FlowsRuntimeStatus, PipelineInfraService, PipelineInfraStatus } from './pipeline-infra.service';
import { PipelineHubOverview, PipelineHubService } from './pipeline-hub.service';
import { DockerStatsService } from './docker-stats.service';
import { PlatformHealthResponseDto } from './dto/platform-health.dto';

@ApiTags('Infrastructure pipeline')
@Controller('engine')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'OPERATOR', 'SUPER_ADMIN')
@ApiBearerAuth()
export class EngineInfraController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pipelineInfra: PipelineInfraService,
    private readonly engineService: EngineService,
    private readonly pipelineHub: PipelineHubService,
    private readonly dockerStats: DockerStatsService,
  ) {}

  @Get('pipeline-infra')
  @ApiOperation({
    summary: 'État Redis + Benthos (pipeline)',
    description:
      'Sonde Redis (PING), HTTP Benthos (/ping, /ready) et taille de la liste heartbeat écrite par Benthos dans Redis.',
  })
  @ApiResponse({ status: 200, description: 'Statut infrastructure' })
  async getPipelineInfra(): Promise<PipelineInfraStatus> {
    return this.pipelineInfra.getStatus();
  }

  @Get('flows-runtime')
  @ApiOperation({
    summary: 'Vue temps réel flux (Redis, Benthos, files BullMQ)',
    description:
      'Agrège le statut Redis/Benthos, la liste des heartbeats Benthos dans Redis et les compteurs de la queue BullMQ `flow-executions`.',
  })
  @ApiResponse({ status: 200, description: 'Données runtime pour la page Flux' })
  async getFlowsRuntime(): Promise<FlowsRuntimeStatus> {
    const [infra, queues, gateMessages] = await Promise.all([
      this.pipelineInfra.getStatus(),
      this.engineService.getQueueStats(),
      this.pipelineInfra.getRecentGateMessages(50),
    ]);
    return {
      ...infra,
      queues,
      benthosEvents: [],
      gateMessages,
    };
  }

  @Get('pipeline-hub')
  @ApiOperation({
    summary: 'Hub pipeline (config, router Redis, files, historique Benthos)',
    description:
      'Vue consolidée pour l’administration : runtime, paramètres masqués, jetons d’ingestion Redis, aperçu des jobs BullMQ.',
  })
  @ApiResponse({ status: 200, description: 'Données hub pipeline' })
  async getPipelineHub(): Promise<PipelineHubOverview> {
    return this.pipelineHub.getOverview();
  }

  @Get('platform-health')
  @Roles('SUPER_ADMIN')
  @ApiOperation({
    summary: 'Santé des services plateforme (super-admin)',
    description:
      'Sonde PostgreSQL, Redis, HTTP Benthos et l’accès BullMQ depuis l’API. La réponse 200 implique que l’API répond.',
  })
  @ApiResponse({ status: 200, description: 'État agrégé', type: PlatformHealthResponseDto })
  async getPlatformHealth(): Promise<PlatformHealthResponseDto> {
    const databasePromise = (async () => {
      const t0 = Date.now();
      try {
        await this.prisma.$queryRaw`SELECT 1`;
        return { ok: true as const, latencyMs: Date.now() - t0 };
      } catch (e) {
        return { ok: false as const, error: e instanceof Error ? e.message : String(e) };
      }
    })();

    const [infra, database, queues, dockerContainers] = await Promise.all([
      this.pipelineInfra.getStatus(),
      databasePromise,
      this.engineService.getQueueStats(),
      this.dockerStats.getStats(),
    ]);

    const workerQueue =
      queues.flowExecutions != null
        ? { ok: true as const, counts: queues.flowExecutions }
        : {
            ok: false as const,
            error: 'Queue flow-executions inaccessible (Redis ou worker non configuré)',
          };

    return {
      checkedAt: new Date().toISOString(),
      api: { ok: true },
      database,
      redis: infra.redis,
      benthos: { ok: infra.benthos.ok, error: infra.benthos.error },
      benthosHeartbeat: {
        listLength: infra.benthosHeartbeat.listLength,
        error: infra.benthosHeartbeat.error,
      },
      workerQueue,
      dockerContainers,
    };
  }

  @Post('pipeline-hub/restart-hint')
  @Roles('SUPER_ADMIN')
  @ApiOperation({
    summary: 'Enregistrer une demande de relance (sans redémarrer l’API)',
    description:
      'Journalise la demande. Le redémarrage réel doit être fait côté orchestration (Docker / K8s).',
  })
  @ApiResponse({ status: 200, description: 'Accusé et consignes' })
  async postPipelineRestartHint(@CurrentUser() user: AuthenticatedUser): Promise<{ ok: boolean; message: string }> {
    return this.pipelineHub.recordRestartHint(user.email ?? user.id);
  }
}
