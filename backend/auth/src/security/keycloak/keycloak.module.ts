// eslint-disable-next-line max-classes-per-file
import { forwardRef, Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import {
  AuthGuard,
  KeycloakConnectModule,
  RoleGuard,
} from 'nest-keycloak-connect';
import { KafkaModule } from '../../messaging/kafka.module.js';
import { AuthQueryResolver } from './resolvers/auth-query.resolver.js';
import { AuthMutationResolver } from './resolvers/auth-mutation.resolver.js';
import { KeycloakReadService } from './services/keycloak-read.service.js';
import { KeycloakWriteService } from './services/keycloak-write.service.js';

@Module({
  imports: [KafkaModule],
  providers: [KeycloakReadService, KeycloakWriteService],
  exports: [KeycloakReadService, KeycloakWriteService],
})
class ConfigModule {}

@Module({
  imports: [
    forwardRef(() => KafkaModule),
    KeycloakConnectModule.registerAsync({
      useExisting: KeycloakReadService,
      imports: [ConfigModule],
    }),
  ],
  providers: [
    KeycloakReadService,
    KeycloakWriteService,
    AuthQueryResolver,
    AuthMutationResolver,
    {
      // fuer @UseGuards(AuthGuard)
      provide: APP_GUARD,
      useClass: AuthGuard,
    },
    {
      // fuer @Roles({ roles: ['admin'] }) einschl. @Public() und @AllowAnyRole()
      provide: APP_GUARD,
      useClass: RoleGuard,
    },
  ],
  exports: [KeycloakConnectModule, KeycloakReadService, KeycloakWriteService],
})
export class KeycloakModule {}
