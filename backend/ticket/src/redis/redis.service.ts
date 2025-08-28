// ticket-service/src/shared/redis/redis.service.ts
import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import type { Redis as RedisClient } from 'ioredis';
import { SECURITY } from '../config/security.config.js';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private client!: RedisClient;

  async onModuleInit(): Promise<void> {
    // ESM/CJS-sicher laden
    const mod = await import('ioredis');
    const RedisCtor = (mod as any).default ?? (mod as any);

    this.client = new RedisCtor(SECURITY.redis.url);
    await this.client.ping();
  }

  async onModuleDestroy(): Promise<void> {
    if (this.client) await this.client.quit();
  }

  get raw(): RedisClient {
    return this.client;
  }
}
