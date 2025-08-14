import { CreateEventInput } from '../models/input/create-event.input.js';
import { UpdateEventInput } from '../models/dto/update-event.input.js';
import { Event } from '../models/entities/event.entity.js';
import { EventWriteService } from '../services/event-write.service.js';
import { Args, ID, Mutation, Resolver } from '@nestjs/graphql';

@Resolver(() => Event)
export class EventMutationResolver {
  constructor(private readonly service: EventWriteService) {}

  @Mutation(() => Event, { name: 'createEvent' })
  async create(@Args('input') input: CreateEventInput): Promise<Event> {
    return this.service.create(input) as unknown as Promise<Event>;
  }

  @Mutation(() => Event, { name: 'updateEvent' })
  update(@Args('input') input: UpdateEventInput) {
    const { id, ...rest } = input;
    return this.service.update(id, rest);
  }

  @Mutation(() => Event, { name: 'deleteEvent' })
  delete(@Args('id', { type: () => ID }) id: string) {
    return this.service.remove(id);
  }
}
