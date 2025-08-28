import { Module } from '@nestjs/common';
import { RedisLockService } from './redis-lock.service.js';
import { RedisService } from './redis.service.js';

@Module({
  imports: [],
  providers: [RedisLockService, RedisService],
  exports: [RedisLockService, RedisService],
})
export class RedisModule {}
