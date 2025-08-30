import 'dotenv/config';

import { AppModule } from './app.module.js';
import { WsGraphqlModule } from './ws-graphql/ws-graphql.module.js';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import 'reflect-metadata';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);

  const port = Number(config.get('PORT') ?? 4001);
  app.enableCors({ origin: true, credentials: true });
  await app.listen(port);

  // 2) Separater WS-Server (Subscriptions) – gleicher Code, anderer Port
  const wsApp = await NestFactory.create(WsGraphqlModule);
  wsApp.enableCors({ origin: true, credentials: true });
  const wsPort = Number(process.env.PORT_WS ?? 3006); // <-- direkt aus env
  await wsApp.listen(wsPort);

  console.log('App läuft auf port: ', port);
  console.log('WSApp läuft auf port: ', wsPort);
}
void bootstrap();
