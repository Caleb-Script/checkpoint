// eslint-disable-next-line max-classes-per-file
import { KeycloakService } from './keycloak.service.js';
import { LoginResolver } from './login.resolver.js';
import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import {
  AuthGuard,
  KeycloakConnectModule,
  RoleGuard,
} from 'nest-keycloak-connect';

@Module({
  providers: [KeycloakService],
  exports: [KeycloakService],
})
class ConfigModule {}

@Module({
  imports: [
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
  exports: [KeycloakConnectModule],
})
export class KeycloakModule {}
