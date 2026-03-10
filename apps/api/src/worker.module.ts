import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { LoggerModule } from './common/logger';
import { PrismaModule } from './prisma/prisma.module';
import { VaultModule } from './modules/vault/vault.module';
import { TenantsModule } from './modules/tenants/tenants.module';
import { EngineModule } from './modules/engine/engine.module';
import { WorkersModule } from './workers/workers.module';

@Module({
  imports: [
    LoggerModule,
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    PrismaModule,
    VaultModule,
    TenantsModule,
    EngineModule,
    ScheduleModule.forRoot(),
    WorkersModule,
  ],
})
export class WorkerModule {}
