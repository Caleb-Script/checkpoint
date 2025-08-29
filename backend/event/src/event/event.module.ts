import { KafkaModule } from '../messaging/kafka.module.js';
import { EventMutationResolver } from './resolvers/event-mutation.resolver.js';
import { EventQueryResolver } from './resolvers/event-query.resolver.js';
import { EventReadService } from './services/event-read.service.js';
import { EventWriteService } from './services/event-write.service.js';
import { forwardRef, Module } from '@nestjs/common';

@Module({
  imports: [forwardRef(() => KafkaModule)],
  providers: [
    EventMutationResolver,
    EventQueryResolver,
    EventWriteService,
    EventReadService,
  ],
})
export class EventModule {}
