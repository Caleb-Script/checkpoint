/* eslint-disable no-unused-private-class-members */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-call */
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { LoggerPlus } from '../../logger/logger-plus';
import { LoggerService } from '../../logger/logger.service';
import { Template } from '../models/entitys/template.entity';
import { CreateTemplateInput } from '../models/inputs/create-template.input';
import { UpdateTemplateInput } from '../models/inputs/update-template.input';
import { TemplateWriteService } from '../services/template-write.service';

@Resolver()
export class TemplateMutationResolver {
  readonly #templateWriteService: TemplateWriteService;
  readonly #loggerService: LoggerService;
  readonly #logger: LoggerPlus;

  constructor(
    templateWriteService: TemplateWriteService,
    loggerService: LoggerService,
  ) {
    this.#templateWriteService = templateWriteService;
    this.#loggerService = loggerService;
    this.#logger = this.#loggerService.getLogger(TemplateMutationResolver.name);
  }

  @Mutation(() => Template)
  async createTemplate(@Args('input') input: CreateTemplateInput) {
    return this.#templateWriteService.create(input);
  }

  @Mutation(() => Template)
  async updateTemplate(@Args('input') input: UpdateTemplateInput) {
    return this.#templateWriteService.update(input);
  }
}
