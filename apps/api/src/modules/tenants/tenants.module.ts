import { Global, Module } from '@nestjs/common';
import { TenantsController } from './tenants.controller';
import { TenantsService } from './tenants.service';
import { TenantDatabaseService } from './tenant-database.service';
import { TenantFlowWeatherService } from './tenant-flow-weather.service';
import { FlowsModule } from '../flows/flows.module';
import { EngineModule } from '../engine/engine.module';

@Global()
@Module({
  imports: [FlowsModule, EngineModule],
  controllers: [TenantsController],
  providers: [TenantsService, TenantDatabaseService, TenantFlowWeatherService],
  exports: [TenantsService, TenantDatabaseService],
})
export class TenantsModule {}
