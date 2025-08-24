import { Module } from '@nestjs/common';
import { TicketModule } from './ticket/ticket.module.js';
import { LoggerModule } from './logger/logger.module.js';
import { GraphQLModule } from '@nestjs/graphql';
import {
  ApolloFederationDriver,
  ApolloFederationDriverConfig,
} from '@nestjs/apollo';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthGuard } from './ticket/utils/auth.guard.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
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
      }),
    }),
    TicketModule,
    LoggerModule,
  ],
  providers: [AuthGuard],
})
export class AppModule {}
