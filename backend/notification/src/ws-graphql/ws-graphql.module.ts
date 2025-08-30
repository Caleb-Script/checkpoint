/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
// src/ws-graphql/ws-graphql.module.ts
import { LoggerModule } from '../logger/logger.module';
import { NotificationSubscriptionsModule } from '../notification/notification-subscriptions.module';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { Module } from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';

@Module({
  imports: [
    NotificationSubscriptionsModule,
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      path: '/graphql-ws',
      autoSchemaFile: true,
      sortSchema: true,
      introspection: true,
      csrfPrevention: false,
      subscriptions: { 'graphql-ws': true },
      include: [NotificationSubscriptionsModule], // ✅ nur Subs + Health
    }),
    LoggerModule,
  ],
})
export class WsGraphqlModule {}
