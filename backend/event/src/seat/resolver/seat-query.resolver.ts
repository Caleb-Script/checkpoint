import { Seat } from '../models/entities/seat.entity.js';
import { Resolver } from '@nestjs/graphql';

@Resolver(() => Seat)
export class SeatQueryResolver {
  // constructor(private readonly read: SeatReadService) {}
  // @Query(() => Seat, { name: 'getSeatById', nullable: true })
  // getSeatById(@Args('id', { type: () => ID }) id: string) {
  //   return this.read.findById(id);
  // }
  // @Query(() => [Seat], { name: 'getSeats' })
  // getSeats() {
  //   return this.read.find();
  // }
}
