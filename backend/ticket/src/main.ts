import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './modules/app.module.js';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { cors: true });
  app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));
  const port = Number(process.env.PORT ?? 4002);
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`🎟️ Ticket-Service läuft auf http://localhost:${port}`);
}
bootstrap();
