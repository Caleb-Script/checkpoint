/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
import { LoggerModule } from './logger/logger.module.js';
import { KafkaModule } from './messaging/kafka.module.js';
import { NotificationModule } from './notification/notification.module.js';
import { TemplateModule } from './template/template.module.js';
import {
  ApolloFederationDriver,
  ApolloFederationDriverConfig,
} from '@nestjs/apollo';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { GraphQLModule } from '@nestjs/graphql';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    GraphQLModule.forRootAsync<ApolloFederationDriverConfig>({
      driver: ApolloFederationDriver,
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) => ({
        // autoSchemaFile: join(process.cwd(), 'dist/schema.gql'),
        autoSchemaFile:
          process.env.SCHEMA_TARGET === 'tmp'
            ? { path: '/tmp/schema.gql', federation: 2 }
            : process.env.SCHEMA_TARGET === 'false'
              ? false
              : { path: 'dist/schema.gql', federation: 2 },
        sortSchema: true,
        playground: cfg.get('GRAPHQL_PLAYGROUND') === 'true',
        csrfPrevention: false,
        introspection: true,
        // 🔽🔽🔽 WICHTIG: Subscriptions per graphql-ws aktivieren
        subscriptions: {
          'graphql-ws': {
            path: '/graphql', // Standard: gleich wie HTTP-Endpoint
            onConnect: async (ctx) => {
              // optional: Auth über connectionParams
              // const token = ctx.connectionParams?.Authorization;
              // ctx.extra['auth'] = decode(token);
            },
          },
        },
      }),
    }),
    KafkaModule,
    NotificationModule,
    TemplateModule,
    LoggerModule,
  ],
  providers: [],
})
export class AppModule { }
