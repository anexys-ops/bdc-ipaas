import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './modules/auth/auth.module';
import { TenantsModule } from './modules/tenants/tenants.module';
import { VaultModule } from './modules/vault/vault.module';
import { ConnectorsModule } from './modules/connectors/connectors.module';
import { MarketplaceModule } from './modules/marketplace/marketplace.module';
import { FlowsModule } from './modules/flows/flows.module';
import { EngineModule } from './modules/engine/engine.module';
import { MappingsModule } from './modules/mappings/mappings.module';
import { AgentsModule } from './modules/agents/agents.module';
import { BillingModule } from './modules/billing/billing.module';
import { AuditModule } from './modules/audit/audit.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    PrismaModule,
    VaultModule,
    AuthModule,
    TenantsModule,
    ConnectorsModule,
    MarketplaceModule,
    FlowsModule,
    EngineModule,
    MappingsModule,
    AgentsModule,
    BillingModule,
    AuditModule,
    NotificationsModule,
  ],
})
export class AppModule {}
