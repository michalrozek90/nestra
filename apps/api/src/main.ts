import { NestFactory } from '@nestjs/core';

import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const application = await NestFactory.create(AppModule);
  const host = process.env.API_HOST ?? '0.0.0.0';
  const port = Number.parseInt(process.env.API_PORT ?? '3000', 10);

  await application.listen(port, host);
}

void bootstrap();
