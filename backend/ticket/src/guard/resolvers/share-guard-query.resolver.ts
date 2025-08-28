/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Args, Query, Resolver } from '@nestjs/graphql';
import { ShareGuard } from '../models/entitys/share-guard.entity.js';
import { ShareGuardReadService } from '../services/share-guard-read.service.js';

/**
 * Query/Mutation für ShareGuard – Anti-Sharing-Logik pro Ticket
 */
@Resolver(() => ShareGuard)
export class ShareGuardQueryResolver {
  readonly #shareGuardReadService: ShareGuardReadService;

  constructor(shareGuardService: ShareGuardReadService) {
    this.#shareGuardReadService = shareGuardService;
  }

  @Query(() => ShareGuard, {
    name: 'shareGuardByTicket',
    description: 'Gibt die ShareGuard-Informationen zu einem Ticket zurück.',
  })
  async byTicket(@Args('ticketId', { type: () => String }) ticketId: string) {
    const entity = await this.#shareGuardReadService.findById(ticketId);
    return {
      id: entity.id,
      ticketId: entity.ticketId,
      failCount: entity.failCount,
      lastFailAt: entity.lastFailAt ?? null,
      blockedUntil: entity.blockedUntil ?? null,
      reason: entity.reason ?? null,
    };
  }
}
