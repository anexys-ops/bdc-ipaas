import { Module } from '@nestjs/common';
import { ConnectorsModule } from '../connectors/connectors.module';
import { FlowsModule } from '../flows/flows.module';
import { EngineController } from './engine.controller';
import { EngineInfraController } from './engine-infra.controller';
import { EngineService } from './engine.service';
import { FileIoService } from './file-io.service';
import { BenthosConfigBuilder } from './benthos-config.builder';
import { BenthosService } from './benthos.service';
import { PipelineInfraService } from './pipeline-infra.service';
import { PipelineHubService } from './pipeline-hub.service';
import { DockerStatsService } from './docker-stats.service';
import { TickflowReporterService } from './tickflow-reporter.service';

@Module({
  imports: [ConnectorsModule, FlowsModule],
  controllers: [EngineController, EngineInfraController],
  providers: [
    EngineService,
    FileIoService,
    BenthosConfigBuilder,
    BenthosService,
    PipelineInfraService,
    PipelineHubService,
    DockerStatsService,
    TickflowReporterService,
  ],
  exports: [EngineService, TickflowReporterService],
})
export class EngineModule {}
