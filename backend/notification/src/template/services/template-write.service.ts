/* eslint-disable no-unused-private-class-members */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/require-await */
import { LoggerPlus } from '../../logger/logger-plus';
import { LoggerService } from '../../logger/logger.service';
import { PrismaService } from '../../prisma/prisma.service';
import { Template } from '../models/entitys/template.entity';
import { CreateTemplateInput } from '../models/inputs/create-template.input';
import { UpdateTemplateInput } from '../models/inputs/update-template.input';
import { TemplateReadService } from './template-read.service';
import { Injectable } from '@nestjs/common';

@Injectable()
export class TemplateWriteService {
  readonly #prismaService: PrismaService;
  readonly #loggerService: LoggerService;
  readonly #logger: LoggerPlus;
  readonly #templateReadService: TemplateReadService;

  constructor(
    prismaService: PrismaService,
    loggerService: LoggerService,
    templateReadService: TemplateReadService,
  ) {
    this.#prismaService = prismaService;
    this.#loggerService = loggerService;
    this.#logger = this.#loggerService.getLogger(TemplateWriteService.name);
    this.#templateReadService = templateReadService;
  }

  async create(input: CreateTemplateInput) {
    return (this.#prismaService as any).create({
      data: {
        key: input.key,
        title: input.title,
        body: input.body,
        variables: input.variables as any,
        locale: input.locale ?? null,
        channel: input.channel ?? 'IN_APP',
        category: input.category ?? null,
        isActive: input.isActive ?? true,
        tags: input.tags ?? [],
      },
    });
  }

  async update(input: UpdateTemplateInput) {
    const template: Template = await this.#templateReadService.findById(
      input.id,
    );

    const version = input.bumpVersion ? template.version + 1 : template.version;

    return (this.#prismaService as any).template.update({
      where: { id: input.id },
      data: {
        title: input.title ?? undefined,
        body: input.body ?? undefined,
        variables: (input.variables as any) ?? undefined,
        locale: input.locale ?? undefined,
        channel: input.channel ?? undefined,
        category: input.category ?? undefined,
        isActive: input.isActive ?? undefined,
        tags: input.tags ?? undefined,
        version,
      },
    });
  }
}
