/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-call */
import { LoggerPlus } from '../../logger/logger-plus';
import { LoggerService } from '../../logger/logger.service';
import { Template } from '../models/entitys/template.entity';
import { TemplateReadService } from '../services/template-read.service';
import { Args, Int, Query, Resolver } from '@nestjs/graphql';

@Resolver()
export class TemplateQueryResolver {
  readonly #templateReadService: TemplateReadService;
  readonly #loggerService: LoggerService;
  readonly #logger: LoggerPlus;

  constructor(
    templateReadService: TemplateReadService,
    loggerService: LoggerService,
  ) {
    this.#templateReadService = templateReadService;
    this.#loggerService = loggerService;
    this.#logger = this.#loggerService.getLogger(TemplateQueryResolver.name);
  }

  @Query(() => [Template])
  async templates(
    @Args('search', { type: () => String, nullable: true }) search?: string,
    @Args('limit', { type: () => Int, nullable: true }) limit?: number,
  ) {
    void this.#logger.debug('templates: search=%s, limit=%f', search, limit);

    return this.#templateReadService.find(search, limit ?? 50);
  }

  @Query(() => Template, { nullable: true })
  async getByKey(@Args('key', { type: () => String }) key: string) {
    return this.#templateReadService.findByKey(key);
  }
}
