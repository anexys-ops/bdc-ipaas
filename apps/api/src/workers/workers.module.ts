import { Module } from '@nestjs/common';
import { EngineModule } from '../modules/engine/engine.module';
import { FlowProcessor } from './flow.processor';
import { CronService } from './cron.service';

@Module({
  imports: [EngineModule],
  providers: [FlowProcessor, CronService],
})
export class WorkersModule {}
