import { Module } from '@nestjs/common';
import { ScanQueryResolver } from './resolvers/scan-query.resolver.js';
import { ScanMutationResolver } from './resolvers/scan-mutation.resolver.js';
import { ScanReadService } from './services/scan-read.service.js';
import { ScanWriteService } from './services/scan-write.service.js';
import { RedisModule } from '../redis/redis.module.js';
import { TokenModule } from '../token/token.module.js';
import { ShareGuardModule } from '../guard/guard.module.js';

@Module({
  imports: [RedisModule, TokenModule, ShareGuardModule],
  providers: [
    ScanQueryResolver,
    ScanMutationResolver,
    ScanReadService,
    ScanWriteService,
  ],
  exports: [ScanReadService, ScanWriteService],
})
export class ScanModule {}
