// eslint-disable-next-line max-classes-per-file
import { KeycloakService } from './keycloak.service.js';
import { LoginResolver } from './login.resolver.js';
import { forwardRef, Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import {
  AuthGuard,
  KeycloakConnectModule,
  RoleGuard,
} from 'nest-keycloak-connect';
import { KafkaModule } from '../../messaging/kafka.module.js';

@Module({
  imports: [forwardRef(() => KafkaModule)],
  providers: [KeycloakService],
  exports: [KeycloakService],
})
class ConfigModule {}

@Module({
  imports: [
    forwardRef(() => KafkaModule),
    KeycloakConnectModule.registerAsync({
      useExisting: KeycloakService,
      imports: [ConfigModule],
    }),
  ],
  providers: [
    KeycloakService,
    LoginResolver,
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
  exports: [KeycloakConnectModule, KeycloakService],
})
export class KeycloakModule {}
