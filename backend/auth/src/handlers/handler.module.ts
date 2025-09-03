import { Module } from '@nestjs/common';
import { UserHandler } from './user.handler.js';
import { KeycloakModule } from '../security/keycloak/keycloak.module.js';
import { UserAttributesHandler } from './user-attributes.handler.js';

@Module({
  imports: [KeycloakModule],
  providers: [UserHandler, UserAttributesHandler],
  exports: [UserHandler, UserAttributesHandler],
})
export class HandlerModule {}
