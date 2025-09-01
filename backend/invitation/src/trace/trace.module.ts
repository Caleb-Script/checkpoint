import { forwardRef, Global, Module } from "@nestjs/common";
import { KafkaModule } from "../messaging/kafka.module.js";
import { TraceContextProvider } from "./trace-context.provider.js";
import { APP_INTERCEPTOR } from "@nestjs/core";
import { TraceInterceptor } from "./trace.interceptor.js";

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
