import { Span } from '@opentelemetry/api';
import { LoggerPlus } from '../../../logger/logger-plus';
/**
 * Das Modul besteht aus den Klassen für die Fehlerbehandlung bei GraphQL.
 * @packageDocumentation
 */

import { GraphQLError } from 'graphql';

/**
 * Error-Klasse für GraphQL, die einen Response mit `errors` und
 * code `BAD_USER_INPUT` produziert.
 */
export class BadUserInputError extends GraphQLError {
  constructor(message: string, exception?: Error) {
    super(message, {
      originalError: exception,
      extensions: {
        code: 'BAD_USER_INPUT',
      },
    });
  }
}

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
