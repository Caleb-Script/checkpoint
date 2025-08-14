import { Event } from '../models/entities/event.entity.js';
import { EventReadService } from '../services/event-read.service.js';
import { Args, ID, Query, Resolver } from '@nestjs/graphql';

@Resolver(() => Event)
export class EventQueryResolver {
  constructor(private readonly service: EventReadService) {}

  @Query(() => [Event], { name: 'events' })
  get() {
    return this.service.findAll();
  }

  @Query(() => Event, { name: 'event' })
  getById(@Args('id', { type: () => ID }) id: string) {
    return this.service.findOne(id);
  }
}
