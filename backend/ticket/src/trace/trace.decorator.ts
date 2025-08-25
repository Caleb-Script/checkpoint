// src/tracing/trace.decorator.ts
import { SetMetadata } from '@nestjs/common';

export const TRACE_METADATA_KEY = 'trace-span';

export function Trace(spanName: string): MethodDecorator {
  return SetMetadata(TRACE_METADATA_KEY, spanName);
}
