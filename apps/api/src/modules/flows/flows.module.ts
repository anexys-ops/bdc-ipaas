import { Module } from '@nestjs/common';
import { FlowsController } from './flows.controller';
import { FlowsService } from './flows.service';
import { FlowRouterSyncService } from './flow-router-sync.service';
import { GateRedisService } from '../gateway/gate-redis.service';

@Module({
  controllers: [FlowsController],
  providers: [FlowsService, FlowRouterSyncService, GateRedisService],
  exports: [FlowsService, FlowRouterSyncService, GateRedisService],
})
export class FlowsModule {}
