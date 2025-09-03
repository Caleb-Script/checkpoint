// /backend/auth/src/security/keycloak/services/keycloak-read.service.ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import type {
  KeycloakConnectOptions,
  KeycloakConnectOptionsFactory,
} from 'nest-keycloak-connect';
import { keycloakConnectOptions, paths } from '../../../config/keycloak.js';
import { LoggerService } from '../../../logger/logger.service.js';
import { TraceContextProvider } from '../../../trace/trace-context.provider.js';
import { KeycloakBaseService } from './keycloak-base.service.js';
import type { KeycloakUser } from '../models/dtos/kc-user.dto.js';
import type { KeycloakTokenPayload } from '../models/dtos/kc-token.dto.js';
import { toUser, toUsers } from '../models/mappers/user.mapper.js';
import type { User } from '../models/entitys/user.entity.js';
import * as jose from 'jose';

/**
 * @file Read-Only Zugriff auf Keycloak (Admin-API & Token-Lesen).
 *  - Nutzerlisten, Nutzer by Id
 *  - UserInfo aus Access-Token (JWT Verify)
 */
@Injectable()
export class KeycloakReadService
  extends KeycloakBaseService
  implements KeycloakConnectOptionsFactory
{
  constructor(logger: LoggerService, trace: TraceContextProvider) {
    super(logger, trace);
  }

  /** Optionen für nest-keycloak-connect */
  createKeycloakConnectOptions(): KeycloakConnectOptions {
    return keycloakConnectOptions;
  }

  /**
   * Liste aller Realm-Benutzer.
   */
  async findAllUsers(): Promise<User[]> {
    this.logger.debug('finde alle User');
    const raw = await this.kcRequest<KeycloakUser[]>('get', paths.users);
    const users = toUsers(raw);
    return users;
  }

  /**
   * Benutzer per ID (exakt).
   */
  async findById(id: string): Promise<User> {
    this.logger.debug('findById: id=%s', id);
    const data = await this.kcRequest<KeycloakUser[]>('get', paths.users, {
      params: { id, exact: true },
    });
    const raw = data?.[0];
    if (!raw) throw new UnauthorizedException(`User '${id}' nicht gefunden.`);
    const user = toUser(raw);
    this.logger.debug('findById: user=%o', user);
    return user;
  }

  /**
   * Benutzerinfo aus verifiziertem JWT.
   */
  async getUserInfo(accessToken: string): Promise<User> {
    const decoded = jose.decodeJwt(accessToken) as KeycloakTokenPayload;
    const iss = decoded.iss;
    if (!iss) throw new UnauthorizedException('Missing issuer');
    const payload = await this.verifyJwt<KeycloakTokenPayload>(
      accessToken,
      iss,
    );
    return toUser(payload);
  }
}
