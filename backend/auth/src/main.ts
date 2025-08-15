import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import compression from 'compression';
// relativer Import
import { AppModule } from './app.module.js';
import { corsOptions } from './config/cors.js';
import { nodeConfig } from './config/node.js';
import { helmetHandlers } from './security/http/helmet.handler.js';

import cookieParser from 'cookie-parser';

const { httpsOptions, port } = nodeConfig;

const bootstrap = async () => {
  const app = await NestFactory.create(AppModule, { httpsOptions });
  app.use(helmetHandlers, compression());
  app.useGlobalPipes(new ValidationPipe({ transform: true }));
  app.use(cookieParser());
  app.enableCors(corsOptions);
  await app.listen(port);
};

await bootstrap();
