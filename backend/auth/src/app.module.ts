import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { KeycloakModule } from './security/keycloak/keycloak.module.js';
import { LoggerModule } from './logger/logger.module.js';
import { RequestLoggerMiddleware } from './logger/request-logger.middleware.js';
import { ApolloDriverConfig } from '@nestjs/apollo';
import { GraphQLModule } from '@nestjs/graphql';
import { graphQlModuleOptions } from './config/graphql.js';
import { HealthModule } from './health/health.module.js';

@Module({
  imports: [
    HealthModule,
    KeycloakModule,
    LoggerModule,
    GraphQLModule.forRoot<ApolloDriverConfig>(graphQlModuleOptions),
  ],
  controllers: [],
  providers: [],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestLoggerMiddleware).forRoutes('*');
  }
}
