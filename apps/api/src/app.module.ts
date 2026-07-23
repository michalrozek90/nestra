import { MiddlewareConsumer, Module, RequestMethod, type NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core';
import { createZodValidationPipe, ZodSerializerInterceptor } from 'nestjs-zod';

import { ApiExceptionFilter } from './common/api-exception.filter';
import { RequestIdMiddleware } from './common/request-id.middleware';
import { parseApiEnvironment } from './config/api-environment';
import { AuthModule } from './auth';
import { HealthModule } from './health/health.module';
import { NotesModule } from './notes/notes.module';

const StrictZodValidationPipe = createZodValidationPipe({
  strictSchemaDeclaration: true,
});

@Module({
  imports: [
    ConfigModule.forRoot({
      cache: true,
      isGlobal: true,
      validate: parseApiEnvironment,
    }),
    HealthModule,
    AuthModule,
    NotesModule,
  ],
  providers: [
    {
      provide: APP_PIPE,
      useClass: StrictZodValidationPipe,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: ZodSerializerInterceptor,
    },
    {
      provide: APP_FILTER,
      useClass: ApiExceptionFilter,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestIdMiddleware).forRoutes({ path: '{*path}', method: RequestMethod.ALL });
  }
}
