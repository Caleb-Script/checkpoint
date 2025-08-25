import { Span } from '@opentelemetry/api';
import { LoggerPlus } from './logger/logger-plus';

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
