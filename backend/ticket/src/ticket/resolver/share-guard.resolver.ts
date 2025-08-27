/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { ShareGuard } from '../models/entity/share-guard.entity.js';
import { ShareGuardService } from '../service/share-guard.service.js';
import { TicketReadService } from '../service/ticket-read.service.js';

/**
 * Query/Mutation für ShareGuard – Anti-Sharing-Logik pro Ticket
 */
@Resolver(() => ShareGuard)
export class ShareGuardResolver {
  constructor(
    private readonly shareGuardService: ShareGuardService,
    private readonly read: TicketReadService,
  ) {}

  @Query(() => ShareGuard, {
    name: 'shareGuardByTicket',
    description: 'Gibt die ShareGuard-Informationen zu einem Ticket zurück.',
  })
  async byTicket(@Args('ticketId', { type: () => String }) ticketId: string) {
    const entity = await this.shareGuardService.findById(ticketId);
    return {
      id: entity.id,
      ticketId: entity.ticketId,
      failCount: entity.failCount,
      lastFailAt: entity.lastFailAt ?? null,
      blockedUntil: entity.blockedUntil ?? null,
      reason: entity.reason ?? null,
    };
  }

  @Mutation(() => ShareGuard, {
    description: 'Setzt den ShareGuard-Zähler/Zustand eines Tickets zurück.',
  })
  async resetShareGuard(
    @Args('ticketId', { type: () => String }) ticketId: string,
  ) {
    const entity = await this.shareGuardService.reset(ticketId);
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
