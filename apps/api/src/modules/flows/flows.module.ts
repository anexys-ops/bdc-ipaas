import { Module } from '@nestjs/common';
import { FlowsController } from './flows.controller';
import { FlowsService } from './flows.service';
import { FlowRouterSyncService } from './flow-router-sync.service';

@Module({
  controllers: [FlowsController],
  providers: [FlowsService, FlowRouterSyncService],
  exports: [FlowsService, FlowRouterSyncService],
})
export class FlowsModule {}
