/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-floating-promises */
import type { LoggerPlus } from '../../logger/logger-plus.js';
import type { Span } from '@opentelemetry/api';

export function handleSpanError(
  span: Span,
  error: unknown,
  logger: LoggerPlus,
  method: string,
): never {
  if (error instanceof Error) {
    span.recordException(error);
    span.setStatus({ code: 2, message: error.message });
    logger.error(`${method}: Fehler`, error);
  } else {
    span.setStatus({ code: 2, message: 'Unbekannter Fehler' });
    logger.error(`${method}: Unbekannter Fehler`, error);
  }
  throw error;
}
