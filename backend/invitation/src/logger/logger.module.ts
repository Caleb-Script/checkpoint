import { KafkaModule } from "../messaging/kafka.module.js";
import { BannerService } from "./banner.service.js";
import { LoggerService } from "./logger.service.js";
import { ResponseTimeInterceptor } from "./response-time.interceptor.js";
import { Global, Module } from "@nestjs/common";

/**
 * Das Modul besteht aus allgemeinen Services, z.B. MailService.
 * @packageDocumentation
 */

/**
 * Die dekorierte Modul-Klasse mit den Service-Klassen.
 */
@Global()
@Module({
  imports: [KafkaModule],
  providers: [BannerService, ResponseTimeInterceptor, LoggerService],
  exports: [BannerService, ResponseTimeInterceptor, LoggerService],
})
export class LoggerModule {}
