/* eslint-disable @typescript-eslint/no-unsafe-call */
import { PubSub } from 'graphql-subscriptions';

// Einheitliche, „einfach“ getypte Oberfläche:
export type PubSubLike = {
  publish: (trigger: string, payload: any) => Promise<void>;
  asyncIterator<T = any>(triggers: string | string[]): AsyncIterator<T>;
};

// Der Cast sorgt dafür, dass TS `asyncIterator` garantiert sieht,
// unabhängig von generischen Typen der verwendeten Version.
export const pubsub: PubSubLike = new PubSub() as unknown as PubSubLike;
