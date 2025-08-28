import { Module } from '@nestjs/common';
import { ShareGuardReadService } from './services/share-guard-read.service.js';
import { ShareGuardWriteService } from './services/share-guard-write.service.js';
import { ShareGuardQueryResolver } from './resolvers/share-guard-query.resolver.js';
import { ShareGuardMutationResolver } from './resolvers/share-guard-mutation.resolver.js';

@Module({
  imports: [],
  providers: [
    ShareGuardQueryResolver,
    ShareGuardMutationResolver,
    ShareGuardReadService,
    ShareGuardWriteService,
  ],
  exports: [ShareGuardReadService, ShareGuardWriteService],
})
export class ShareGuardModule {}
