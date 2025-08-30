/* eslint-disable @typescript-eslint/no-floating-promises */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
import { LoggerPlus } from '../../logger/logger-plus';
import { LoggerService } from '../../logger/logger.service';
import { PrismaService } from '../../prisma/prisma.service';
import { Template } from '../models/entitys/template.entity';
import { Injectable, NotFoundException } from '@nestjs/common';

@Injectable()
export class TemplateReadService {
  readonly #prismaService: PrismaService;
  readonly #loggerService: LoggerService;
  readonly #logger: LoggerPlus;

  constructor(prismaService: PrismaService, loggerService: LoggerService) {
    this.#prismaService = prismaService;
    this.#loggerService = loggerService;
    this.#logger = this.#loggerService.getLogger(TemplateReadService.name);
  }

  async findById(id: string) {
    this.#logger.debug('findById: id=%s', id);

    const template = await (this.#prismaService as any).template.findUnique({
      where: { id },
    });

    if (!template) throw new NotFoundException('Template not found');
    return template as Template;
  }

  async findByKey(key: string) {
    this.#logger.debug('findByKey: key=%s', key);

    const template = await (this.#prismaService as any).template.findUnique({
      where: { key },
    });
    return template as Template;
  }

  async find(search?: string, limit = 50) {
    const templates = await (this.#prismaService as any).template.findMany({
      where: search
        ? {
            OR: [
              { key: { contains: search, mode: 'insensitive' } },
              { title: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {},
      take: Math.min(limit, 100),
      orderBy: { updatedAt: 'desc' },
    });

    return templates as Template[];
  }
}
