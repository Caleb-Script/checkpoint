/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Args, ID, Mutation, Resolver } from '@nestjs/graphql';
import { PresenceState } from '../../scan/models/enums/presenceState.enum.js';
import { RotatedToken } from '../models/entity/rotate-token.entity.js';
import { Ticket } from '../models/entity/ticket.entity.js';
import { CreateTicketInput } from '../models/input/create-ticket.input.js';
import { RotateTicketInput } from '../models/input/rotate-token.input.js';
import { TokenPayload } from '../../token/models/payloads/token.payload.js';
import { TicketWriteService } from '../service/ticket-write.service.js';

@Resolver(() => Ticket)
export class TicketMutationResolver {
  readonly #ticketWriteService: TicketWriteService;

  constructor(writeService: TicketWriteService) {
    this.#ticketWriteService = writeService;
  }

  @Mutation(() => Ticket, { name: 'createTicket' })
  createTicket(@Args('input') input: CreateTicketInput) {
    return this.#ticketWriteService.create(input);
  }

  @Mutation(() => Ticket, { name: 'deleteTicket' })
  deleteTicket(@Args('id', { type: () => ID }) id: string) {
    return this.#ticketWriteService.delete(id);
  }

  @Mutation(() => RotatedToken)
  async rotateToken(
    @Args('input') input: RotateTicketInput,
  ): Promise<RotatedToken> {
    const { token, ttlSeconds } = await this.#ticketWriteService.rotate(
      input.ticketId,
      input.ttlSeconds,
      input.deviceHash,
    );
    return { token, ttlSeconds };
  }

  @Mutation(() => Ticket, { name: 'handleScan' })
  async handleScan(@Args('token') token: string) {
    const result = await this.#ticketWriteService.handleScan(token);

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

  @Mutation(() => TokenPayload, { name: 'issueTicket' })
  async issueTicketQr(
    @Args('ticketId') ticketId: string,
    @Args('deviceHash') deviceHash: string,
  ): Promise<TokenPayload> {
    return this.#ticketWriteService.issueTicketQr(ticketId, deviceHash);
  }
}
