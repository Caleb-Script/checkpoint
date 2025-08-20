/* eslint-disable @typescript-eslint/no-unsafe-return */
import { Args, ID, Mutation, Resolver } from '@nestjs/graphql';
import { Ticket } from '../models/entity/ticket.entity.js';
import { TicketWriteService } from '../service/ticket-write.service.js';
import { CreateTicketInput } from '../models/input/create-ticket.input.js';
import { RotatedToken } from '../models/entity/rotate-token.entity.js';
import { RotateTicketInput } from '../models/input/rotate-token.input.js';
import { PresenceState } from '../models/enums/presenceState.enum.js';

@Resolver(() => Ticket)
export class TicketMutationResolver {
  constructor(private readonly write: TicketWriteService) {}

  @Mutation(() => Ticket, { name: 'createTicket' })
  createTicket(@Args('input') input: CreateTicketInput) {
    return this.write.create(input);
  }

  @Mutation(() => Ticket, { name: 'deleteTicket' })
  deleteTicket(@Args('id', { type: () => ID }) id: string) {
    return this.write.delete(id);
  }

  @Mutation(() => RotatedToken)
  async rotateToken(
    @Args('input') input: RotateTicketInput,
  ): Promise<RotatedToken> {
    const { token, ttlSeconds } = await this.write.rotate(
      input.ticketId,
      input.ttlSeconds,
      input.deviceHash,
    );
    return { token, ttlSeconds };
  }

  @Mutation(() => Ticket, { name: 'handleScan' })
  async handleScan(@Args('token') token: string): Promise<Ticket> {
    const result = await this.write.handleScan(token);

    if (!result) {
      throw new Error('Invalid token or ticket not found');
    }

    return {
      id: result.ticketId,
      eventId: result.eventId,
      invitationId: result.invitationId,
      deviceBoundKey: result.deviceHash,
      currentState: result.state as PresenceState,
      seatId: result.seat,
      revoked: false, // Default value, adjust as necessary
    };
  }
}
