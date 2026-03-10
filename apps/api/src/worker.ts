import { NestFactory } from '@nestjs/core';
import { WorkerModule } from './worker.module';
import { AppLoggerService } from './common/logger/logger.service';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.createApplicationContext(WorkerModule);
  app.useLogger(app.get(AppLoggerService));

  await app.init();

  const logger = app.get(AppLoggerService);
  logger.log('Worker ANEXYS iPaaS démarré (flow-executions + cron)', 'Worker');
}

bootstrap().catch((err) => {
  console.error('Worker bootstrap failed:', err);
  process.exit(1);
});
