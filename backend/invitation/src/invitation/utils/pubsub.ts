// src/infra/redis/redis-pubsub.ts
import { createRequire } from 'node:module';
import type { Redis as RedisInstance, RedisOptions } from 'ioredis';
import { RedisPubSub } from 'graphql-redis-subscriptions';

// CJS-Brücke: ioredis exportiert "export = Redis".
// In ESM holen wir den Konstruktor via require – aber STRIKT typisiert.
const require = createRequire(import.meta.url);

/**
 * Exakter Konstruktor-Typ für ioredis (inkl. gängiger Overloads).
 * Quelle: ioredis.d.ts – vereinfacht auf die üblichen Signaturen.
 */
type RedisConstructor =
  & (new (port: number, host?: string, options?: RedisOptions) => RedisInstance)
  & (new (port: number, options?: RedisOptions) => RedisInstance)
  & (new (path: string, options?: RedisOptions) => RedisInstance) // Unix socket
  & (new (url: string) => RedisInstance)                           // redis[s]:// URL
  & (new (options?: RedisOptions) => RedisInstance);

const Redis = require('ioredis') as RedisConstructor;

const redisUrl = process.env.REDIS_URL;

const redisOptions: RedisOptions = {
  host: process.env.REDIS_HOST ?? '127.0.0.1',
  port: Number(process.env.REDIS_PORT ?? 6379),
  password: process.env.REDIS_PASSWORD || undefined,

  // Reconnect-Strategie
  retryStrategy: (times: number) => Math.min(times * 50, 2000),

  // ioredis-spezifisch
  maxRetriesPerRequest: 1,
  enableReadyCheck: true,
};

// Publisher/Subscriber explizit anlegen (robuster als implizit)
const publisher: RedisInstance = redisUrl ? new Redis(redisUrl) : new Redis(redisOptions);
const subscriber: RedisInstance = redisUrl ? new Redis(redisUrl) : new Redis(redisOptions);

// GraphQL PubSub-Instanz
export const pubsub = new RedisPubSub({ publisher, subscriber });

// Trigger zentral halten – EIN Name, überall gleich verwenden
export const TRIGGER = {
  INVITATION_UPDATED: 'INVITATION_UPDATED',
} as const;

// Optional: sauberer Shutdown-Helfer (z. B. in OnModuleDestroy nutzen)
export async function closeRedisPubSub(): Promise<void> {
  await Promise.allSettled([publisher.quit(), subscriber.quit()]);
}
