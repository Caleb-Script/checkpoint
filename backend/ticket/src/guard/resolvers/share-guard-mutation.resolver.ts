/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { ShareGuard } from '../models/entitys/share-guard.entity.js';
import { ShareGuardWriteService } from '../services/share-guard-write.service.js';

/**
 * Query/Mutation für ShareGuard – Anti-Sharing-Logik pro Ticket
 */
@Resolver(() => ShareGuard)
export class ShareGuardMutationResolver {
  readonly #shareGuardWriteService: ShareGuardWriteService;

  constructor(shareGuardService: ShareGuardWriteService) {
    this.#shareGuardWriteService = shareGuardService;
  }

  @Mutation(() => ShareGuard, {
    description: 'Setzt den ShareGuard-Zähler/Zustand eines Tickets zurück.',
  })
  async resetShareGuard(
    @Args('ticketId', { type: () => String }) ticketId: string,
  ) {
    const entity = await this.#shareGuardWriteService.reset(ticketId);
    return {
      id: entity.id,
      ticketId: entity.ticketId,
      failCount: entity.failCount,
      lastFailAt: entity.lastFailAt ?? null,
      blockedUntil: entity.blockedUntil ?? null,
      reason: entity.reason ?? null,
    };
  }

  // @Mutation(() => ShareGuard, {
  //   description: 'Entsperrt einen ggf. blockierten ShareGuard eines Tickets.',
  // })
  // async unblockShareGuard(
  //   @Args('ticketId', { type: () => String }) ticketId: string,
  // ) {
  //   const entity = await this.shareGuardService.unblock({ ticketId });
  //   return {
  //     id: entity.id,
  //     ticketId: entity.ticketId,
  //     failCount: entity.failCount,
  //     lastFailAt: entity.lastFailAt ?? null,
  //     blockedUntil: entity.blockedUntil ?? null,
  //     reason: entity.reason ?? null,
  //   };
  // }
}
