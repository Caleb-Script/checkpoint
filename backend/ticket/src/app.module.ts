import { Module } from '@nestjs/common';
import { TicketModule } from './ticket/ticket.module.js';
import { LoggerModule } from './logger/logger.module.js';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { join } from 'path';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthGuard } from './ticket/utils/auth.guard.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    GraphQLModule.forRootAsync<ApolloDriverConfig>({
      driver: ApolloDriver,
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) => ({
        autoSchemaFile: join(process.cwd(), 'dist/schema.gql'),
        sortSchema: true,
        playground: cfg.get('GRAPHQL_PLAYGROUND') === 'true',
        csrfPrevention: false,
      }),
    }),
    TicketModule,
    LoggerModule,
  ],
  providers: [AuthGuard],
})
export class AppModule {}
