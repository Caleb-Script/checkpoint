/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Args, ID, Query, Resolver } from '@nestjs/graphql';
import { ScanReadService } from '../services/scan-read.service.js';
import { ScanLog } from '../models/entitys/scan-log.entity.js';

/**
 * Abfragen für Scan-Logs (z. B. Live-Monitoring oder Auswertung)
 */
@Resolver()
export class ScanQueryResolver {
  readonly #scanReadService: ScanReadService;

  constructor(scanReadService: ScanReadService) {
    this.#scanReadService = scanReadService;
  }

  /**
   * scanLogsForTicket(ticketId: ID!): [ScanLog!]!
   */
  @Query(() => [ScanLog], { name: 'scanLogsForTicket' })
  async scanLogsForTicket(
    @Args('ticketId', { type: () => ID }) ticketId: string,
  ): Promise<ScanLog[]> {
    const rows = await this.#scanReadService.getScanLogs(ticketId);
    return rows as unknown as ScanLog[];
  }
}
