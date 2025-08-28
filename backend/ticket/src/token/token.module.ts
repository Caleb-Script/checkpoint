import { Module } from '@nestjs/common';
import { TokenService } from './services/token.service.js';
import { RedisModule } from '../redis/redis.module.js';

@Module({
  imports: [RedisModule],
  providers: [TokenService],
  exports: [TokenService],
})
export class TokenModule {}
