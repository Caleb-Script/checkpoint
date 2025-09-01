import { KafkaModule } from '../messaging/kafka.module.js';
import { TraceContextProvider } from './trace-context.provider.js';
import { TraceInterceptor } from './trace.interceptor.js';
import { forwardRef, Global, Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';

/**
 * Das Modul besteht aus allgemeinen Services, z.B. MailService.
 * @packageDocumentation
 */

/**
 * Die dekorierte Modul-Klasse mit den Service-Klassen.
 */
@Global()
@Module({
  imports: [],
  providers: [
    TraceContextProvider,
    {
      provide: APP_INTERCEPTOR,
      useClass: TraceInterceptor,
    },
  ],
  exports: [TraceContextProvider],
})
export class TraceModule {}
