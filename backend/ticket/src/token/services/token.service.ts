/* eslint-disable @typescript-eslint/no-base-to-string */
// ticket-service/src/ticket/service/ticket-token.service.ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import {
  createLocalJWKSet,
  exportJWK,
  importJWK,
  JWK,
  JWTPayload,
  jwtVerify,
  SignJWT,
} from 'jose';
import { SECURITY } from '../../config/security.config.js';
import { RedisService } from '../../redis/redis.service.js';
import { PresenceState } from '../../scan/models/enums/presenceState.enum.js';

export interface TicketJwtClaims extends JWTPayload {
  sub: string; // ticketId
  tid: string; // ticketId (klarer Name)
  eid: string; // eventId
  sk?: string; // seatId (optional)
  cs: PresenceState; // currentState
  dk?: string; // deviceBoundKey (optional)
}

@Injectable()
export class TokenService {
  #publicKey?: JWK;
  #privateKey?: JWK;
  readonly #redisService: RedisService;

  constructor(redisService: RedisService) {
    this.#redisService = redisService;
  }

  async #ensureKeys(): Promise<void> {
    if (this.#privateKey && this.#publicKey) return;

    const subtle = (globalThis.crypto ?? (await import('crypto')).webcrypto)
      .subtle;
    const kp = await subtle.generateKey(
      { name: 'ECDSA', namedCurve: 'P-256' },
      true,
      ['sign', 'verify'],
    );
    const jwkPriv = await exportJWK(kp.privateKey);
    const jwkPub = await exportJWK(kp.publicKey);
    jwkPriv.alg = 'ES256';
    jwkPriv.use = 'sig';
    jwkPub.alg = 'ES256';
    jwkPub.use = 'sig';
    this.#privateKey = jwkPriv;
    this.#publicKey = jwkPub;
  }

  async signTicketJwt(
    claims: Omit<TicketJwtClaims, 'iss' | 'aud' | 'exp' | 'jti' | 'iat'>,
  ): Promise<{ token: string; exp: number; jti: string }> {
    await this.#ensureKeys();
    const alg = this.#privateKey!.alg ?? 'ES256';
    const pk = await importJWK(this.#privateKey!, alg);
    const exp = Math.floor(Date.now() / 1000) + SECURITY.qrToken.ttlSeconds;
    const jti = randomUUID();

    const token = await new SignJWT({
      ...claims,
      iss: SECURITY.qrToken.issuer,
      aud: SECURITY.qrToken.audience,
    })
      .setProtectedHeader({ alg })
      .setJti(jti)
      .setSubject(String(claims.tid ?? ''))
      .setIssuedAt()
      .setExpirationTime(exp)
      .sign(pk);

    // JTI vormerken (Replay-Schutz)
    await this.#redisService.raw.set(
      SECURITY.redis.jtiPrefix + jti,
      '1',
      'PX',
      SECURITY.qrToken.ttlSeconds * 1000,
    );
    return { token, exp, jti };
  }

  async verifyTicketJwt(token: string): Promise<TicketJwtClaims> {
    await this.#ensureKeys();
    const jwks = createLocalJWKSet({ keys: [this.#publicKey!] });
    const { payload } = await jwtVerify(token, jwks, {
      issuer: SECURITY.qrToken.issuer,
      audience: SECURITY.qrToken.audience,
      maxTokenAge: `${SECURITY.qrToken.ttlSeconds + 5}s`,
    });

    const jti = payload.jti;
    if (!jti) throw new UnauthorizedException('Missing jti');
    const jtiKey = SECURITY.redis.jtiPrefix + jti;
    const seen = await this.#redisService.raw.get(jtiKey);
    if (!seen) throw new UnauthorizedException('Replay detected / expired');
    await this.#redisService.raw.del(jtiKey);

    return payload as TicketJwtClaims;
  }
}
