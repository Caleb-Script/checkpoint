/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { ScanPayload } from '../models/payload/scan.payload.js';
import { ScanParams, ScanService } from '../service/scan.service.js';
import { ScanInput } from '../models/input/scan.input.js';

/**
 * Mutationen rund um das Scannen (IN/OUT).
 * Passt 1:1 zu ScanService.scan(...)
 */
@Resolver()
export class ScanMutationResolver {
  constructor(private readonly scanService: ScanService) {}

  @Mutation(() => ScanPayload, {
    description:
      'Scannt ein Ticket und setzt den Presence-State (Toggle oder erzwungene Richtung).',
  })
  async scanTicket(
    @Args('input', { type: () => ScanInput }) input: ScanParams,
  ) {
    return await this.scanService.scan(input);
  }
}
