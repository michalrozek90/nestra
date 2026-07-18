import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { applicationVersion } from '@nestra/contracts';
import { cleanupOpenApiDoc } from 'nestjs-zod';

import { AppModule } from './app.module';
import { ApiErrorResponseDto } from './common/api-error-response.dto';
import type { ApiEnvironment } from './config/api-environment';
import { HealthResponseDto } from './health/health-response.dto';

async function bootstrap(): Promise<void> {
  const application = await NestFactory.create(AppModule);
  const configService = application.get(ConfigService<ApiEnvironment, true>);
  const host = configService.get('apiHost', { infer: true });
  const port = configService.get('apiPort', { infer: true });
  const nodeEnvironment = configService.get('nodeEnvironment', { infer: true });
  const corsAllowedOrigins = configService.get('corsAllowedOrigins', { infer: true });

  application.setGlobalPrefix('api/v1');
  application.enableCors({
    exposedHeaders: ['x-request-id'],
    origin: corsAllowedOrigins,
  });
  application.enableShutdownHooks();

  if (nodeEnvironment === 'development') {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('Nestra API')
      .setDescription('Nestra REST API')
      .setVersion(applicationVersion)
      .build();
    const openApiDocument = SwaggerModule.createDocument(application, swaggerConfig, {
      extraModels: [ApiErrorResponseDto, HealthResponseDto],
    });

    SwaggerModule.setup('docs', application, cleanupOpenApiDoc(openApiDocument));
  }

  await application.listen(port, host);
}

const bootstrapLogger = new Logger('Bootstrap');

bootstrap().catch((error: unknown) => {
  const safeErrorName = error instanceof Error ? error.name : 'UnknownError';
  const safeErrorMessage =
    error instanceof Error && error.message.startsWith('Invalid API environment configuration:')
      ? error.message
      : `API startup failed (${safeErrorName}).`;

  bootstrapLogger.error(safeErrorMessage);
  process.exitCode = 1;
});
