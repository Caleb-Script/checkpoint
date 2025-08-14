/* eslint-disable @typescript-eslint/no-unsafe-return */

import { Seat } from '../models/entities/seat.entity.js';
import { BulkImportSeatsInput } from '../models/inputs/bulk-import-seats.input.js';
import { CreateSeatInput } from '../models/inputs/create-seat.input.js';
import { SeatWriteService } from '../service/seat-write.service.js';
import { Args, ID, Mutation, Query, Resolver } from '@nestjs/graphql';

@Resolver(() => Seat)
export class SeatMutationResolver {
  constructor(private readonly service: SeatWriteService) {}

  @Query(() => [Seat], { name: 'seatsByEvent' })
  seatsByEvent(@Args('eventId', { type: () => ID }) eventId: string) {
    return this.service.listByEvent(eventId);
  }

  @Mutation(() => Seat, { name: 'createSeat' })
  createSeat(@Args('input') input: CreateSeatInput) {
    return this.service.create(input);
  }

  @Mutation(() => [Seat], { name: 'importSeats' })
  importSeats(@Args('input') input: BulkImportSeatsInput) {
    const { eventId, seats } = input;
    return this.service.bulkImport(eventId, seats);
  }
}
