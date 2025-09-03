import { EventMutationResolver } from './resolvers/event-mutation.resolver.js';
import { EventQueryResolver } from './resolvers/event-query.resolver.js';
import { EventReadService } from './services/event-read.service.js';
import { EventWriteService } from './services/event-write.service.js';
import { Module } from '@nestjs/common';

@Module({
  imports: [],
  providers: [
    EventMutationResolver,
    EventQueryResolver,
    EventWriteService,
    EventReadService,
  ],
})
export class EventModule {}
