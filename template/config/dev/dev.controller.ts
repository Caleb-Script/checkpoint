import { Response } from 'express';
import {
  Controller,
  HttpStatus,
  Post,
  Res,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { AuthGuard, Roles } from 'nest-keycloak-connect';
import { ResponseTimeInterceptor } from '../../logger/response-time.interceptor.js';
import { ProfileSeederService } from './profile-seeder.service.js';

/**
 * Entwicklungs-Controller zum gezielten Auslösen von Dev-Funktionen wie Datenbank-Seeding.
 * Zugriff nur für Benutzer mit Rolle `omnixys-admin`.
 */
@Controller('admin')
@UseGuards(AuthGuard)
@Roles({ roles: ['Admin'] })
@UseInterceptors(ResponseTimeInterceptor)
export class DevController {
  readonly #service: ProfileSeederService;

  constructor(service: ProfileSeederService) {
    this.#service = service;
  }

  /**
   * Führt das Seeding der Profile manuell aus.
   * Wird typischerweise im Development/Testumfeld genutzt.
   *
   * Route: POST /admin/db_populate
   */
  @Post('db_populate')
  async dbPopulate(@Res() res: Response): Promise<Response> {
    await this.#service.onModuleInit();
    return res.status(HttpStatus.OK).json({ db_populate: 'success' });
  }
}
