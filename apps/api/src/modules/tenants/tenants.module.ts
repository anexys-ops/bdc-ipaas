import { Global, Module } from '@nestjs/common';
import { TenantsController } from './tenants.controller';
import { TenantsService } from './tenants.service';
import { TenantDatabaseService } from './tenant-database.service';

@Global()
@Module({
  controllers: [TenantsController],
  providers: [TenantsService, TenantDatabaseService],
  exports: [TenantsService, TenantDatabaseService],
})
export class TenantsModule {}
