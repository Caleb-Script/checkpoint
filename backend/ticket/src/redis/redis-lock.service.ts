// ticket-service/src/security/lock/redis-lock.service.ts
import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { RedisService } from './redis.service.js';
import { SECURITY } from '../config/security.config.js';

@Injectable()
export class RedisLockService {
  constructor(private readonly redis: RedisService) {}

  async acquireTicketLock(
    ticketId: string,
    ttlMs: number,
  ): Promise<string | null> {
    const key = SECURITY.redis.lockPrefix + ticketId;
    const token = randomUUID();
    const res = await this.redis.raw.set(key, token, 'PX', ttlMs, 'NX');
    return res === 'OK' ? token : null;
  }

  async releaseTicketLock(ticketId: string, token: string): Promise<void> {
    const key = SECURITY.redis.lockPrefix + ticketId;
    const lua = `
      if redis.call("GET", KEYS[1]) == ARGV[1] then
        return redis.call("DEL", KEYS[1])
      else
        return 0
      end
    `;
    await this.redis.raw.eval(lua, 1, key, token);
  }
}
