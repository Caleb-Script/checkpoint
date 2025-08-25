import { Injectable, Scope } from '@nestjs/common';
import { TraceContext } from './trace-context.util';

/**
 * Kontext-Provider für Trace-Daten (z. B. aus Zipkin via x-b3-traceid).
 * Wird z. B. in LoggerPlus oder Kafka verwendet.
 */
@Injectable({ scope: Scope.DEFAULT })
export class TraceContextProvider {
  private context?: TraceContext;

  setContext(context: TraceContext): void {
    this.context = context;
  }

  getContext(): TraceContext | undefined {
    return this.context;
  }

  #context: TraceContext | undefined;

  clear() {
    this.#context = undefined;
  }

  has(): boolean {
    return !!this.#context?.traceId;
  }
}

@Injectable({ scope: Scope.REQUEST })
export class TraceContextProviderHTTP {
  private context?: TraceContext;

  setContext(context: TraceContext): void {
    this.context = context;
  }

  getContext(): TraceContext | undefined {
    return this.context;
  }
}

// Verwendung z.B. im KafkaConsumer:
// this.traceContextProvider.setContext(TraceContextUtil.fromHeaders(headers));
// const logger = this.loggerService.getLogger(...).withContext(this.traceContextProvider.getContext());
