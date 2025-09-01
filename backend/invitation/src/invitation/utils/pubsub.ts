/* eslint-disable @typescript-eslint/no-unsafe-call */
// src/notification/utils/pubsub.ts
import { PubSub as GqlPubSub } from "graphql-subscriptions";

/** Minimale Engine-Definition mit asyncIterator */
export interface PubSubEngine {
  publish(triggerName: string, payload: any): Promise<void>;
  subscribe(
    triggerName: string,
    onMessage: (payload: any) => void,
  ): Promise<number>;
  unsubscribe(subId: number): void;
  asyncIterator<T = any>(triggers: string | string[]): AsyncIterator<T>;
}

/** Eine einzige Runtime-Instanz – einmal "any" casten, damit TS Ruhe gibt */
const core = new GqlPubSub() as unknown as PubSubEngine;

/** Sauberer, stabiler Export (kein default!) */
export const pubsub: PubSubEngine = {
  publish: (t, p) => core.publish(t, p),
  subscribe: (t, h) => core.subscribe(t, h),
  unsubscribe: (id) => core.unsubscribe(id),
  asyncIterator: (triggers) => core.asyncIterator(triggers),
};
