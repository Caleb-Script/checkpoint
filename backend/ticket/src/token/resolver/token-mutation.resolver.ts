/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Args, ID, Mutation, Resolver } from '@nestjs/graphql';
import { TokenService } from '../services/token.service.js';
import { TokenPayload } from '../models/payloads/token.payload.js';

/**
 * Abfragen für Scan-Logs (z. B. Live-Monitoring oder Auswertung)
 */
@Resolver()
export class TokenResolver {
  readonly #tokenService: TokenService;

  constructor(tokenService: TokenService) {
    this.#tokenService = tokenService;
  }

  @Mutation(() => TokenPayload, { name: 'createToken' })
  async createToken(
    @Args('ticketId', { type: () => ID }) ticketId: string,
    @Args('deviceHash') deviceHash: string,
  ): Promise<TokenPayload> {
    return this.#tokenService.createToken(ticketId, deviceHash);
  }
}
