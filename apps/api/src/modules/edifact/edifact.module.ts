import { Module } from '@nestjs/common';
import { EdifactController } from './edifact.controller';
import { EdifactService } from './edifact.service';
import { TenantsModule } from '../tenants/tenants.module';

@Module({
  imports: [TenantsModule],
  controllers: [EdifactController],
  providers: [EdifactService],
  exports: [EdifactService],
})
export class EdifactModule {}
