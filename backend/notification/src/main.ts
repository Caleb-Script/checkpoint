import 'dotenv/config';

import { AppModule } from './app.module.js';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import 'reflect-metadata';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);

  const port = Number(config.get('PORT') ?? 4001);
  app.enableCors({ origin: true, credentials: true });
  await app.listen(port);
}
void bootstrap();
