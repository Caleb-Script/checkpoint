/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-base-to-string */
// ticket-service/src/ticket/service/ticket-token.service.ts
import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
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
import { TicketReadService } from '../../ticket/service/ticket-read.service.js';

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
  readonly #ticketReadService: TicketReadService;

  constructor(
    redisService: RedisService,
    ticketReadService: TicketReadService,
  ) {
    this.#redisService = redisService;
    this.#ticketReadService = ticketReadService;
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

  /**
   * issueTicketQr(ticketId: ID!, deviceHash: String!): { token: String!, exp: Int!, jti: String! }
   *
   * - gibt einen kurzlebigen QR-JWT zurück (Signatur/exp/jti)
   * - blockt, wenn das anfragende Gerät nicht dem gebundenen Gerät entspricht
   *   (dein Service loggt dann per console.log eine Admin-Notify)
   * Gibt ein kurzlebiges QR-JWT für ein Ticket aus.
   * Nur erlaubt, wenn das anfragende Gerät dem gebundenen Gerät entspricht.
   * Bei neuem Gerät: Admin-Notify (console.log) + Fehler.
   */
  async createToken(
    ticketId: string,
    deviceHash: string,
  ): Promise<{ token: string; exp: number; jti: string }> {
    const ticket = await this.#ticketReadService.findById(ticketId);
    if (!ticket) throw new NotFoundException('Ticket not found');

    if (ticket.deviceBoundKey && ticket.deviceBoundKey !== deviceHash) {
      // Admin-Notify (für Test: console.log)
      // In echt: Mail/Webhook/Push
      // Login mit neuem Gerät erfordert Admin-Freigabe → hier blocken
      // (Du kannst alternativ eine Pending-Approval-Queue führen)
      console.log(
        `[ADMIN] Neues Gerät erkennt: ticket=${ticket.id} expected=${ticket.deviceBoundKey} got=${deviceHash}`,
      );
      throw new Error('Untrusted device – admin approval required');
    }

    return this.signTicketJwt({
      sub: ticket.id,
      tid: ticket.id,
      eid: ticket.eventId,
      sk: ticket.seatId ?? undefined,
      cs: ticket.currentState as PresenceState,
      dk: ticket.deviceBoundKey ?? undefined,
    });
  }
}
