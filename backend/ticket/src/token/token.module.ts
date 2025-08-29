import { forwardRef, Module } from '@nestjs/common';
import { TokenService } from './services/token.service.js';
import { RedisModule } from '../redis/redis.module.js';
import { TicketModule } from '../ticket/ticket.module.js';
import { TokenResolver } from './resolver/token-mutation.resolver.js';

@Module({
  imports: [RedisModule, forwardRef(() => TicketModule)],
  providers: [TokenService, TokenResolver],
  exports: [TokenService],
})
export class TokenModule {}
