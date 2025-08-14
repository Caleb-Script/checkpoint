import { EventModule } from './event/event.module.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { SeatModule } from './seat/seat.module.js';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { GraphQLModule } from '@nestjs/graphql';
import { join } from 'node:path';

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
    PrismaModule,
    EventModule,
    SeatModule,
  ],
})
export class AppModule {}
