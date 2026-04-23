import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { AppLoggerService } from './common/logger';

function readApiVersion(): string {
  try {
    const pkgPath = join(process.cwd(), 'package.json');
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8')) as { version?: string };
    return pkg.version?.trim() || '0.0.0';
  } catch {
    return '0.0.0';
  }
}

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  app.useLogger(app.get(AppLoggerService));

  app.setGlobalPrefix('api/v1');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  app.enableCors({
    origin: process.env.FRONTEND_URL ?? 'http://localhost:5173',
    credentials: true,
  });

  const apiVersion = readApiVersion();
  const config = new DocumentBuilder()
    .setTitle('ANEXYS iPaaS API')
    .setDescription('API de la plateforme iPaaS multi-tenant ANEXYS')
    .setVersion(apiVersion)
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT ?? 3000;
  await app.listen(port);

  const logger = app.get(AppLoggerService);
  logger.log(
    `Application ANEXYS iPaaS v${apiVersion} démarrée sur le port ${port}`,
    'Bootstrap',
  );
  logger.log(`Documentation Swagger disponible sur /api/docs`, 'Bootstrap');
}

bootstrap();
