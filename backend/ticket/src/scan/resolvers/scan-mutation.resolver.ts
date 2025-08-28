import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { ScanWriteService } from '../services/scan-write.service.js';
import { ScanInput } from '../models/inputs/scan.input.js';
import { ScanPayload } from '../models/payload/scan.payload.js';
import { PresenceState } from '../models/enums/presenceState.enum.js';

/**
 * Mutationen rund um das Scannen (IN/OUT).
 * Passt 1:1 zu ScanService.scan(...)
 */
@Resolver()
export class ScanMutationResolver {
  readonly #scanWriteService: ScanWriteService;

  constructor(scanWriteService: ScanWriteService) {
    this.#scanWriteService = scanWriteService;
  }

  @Mutation(() => ScanPayload, {
    description:
      'Scannt ein Ticket und setzt den Presence-State (Toggle oder erzwungene Richtung).',
  })
  async scanTicket(@Args('input', { type: () => ScanInput }) input: ScanInput) {
    return await this.#scanWriteService.scan(input);
  }

  /**
   * scanTicket(token: String!, direction: PresenceState, gate: String, deviceHash: String, byUserId: String): ScanResult!
   *
   * - bevorzugter Weg am Gate: QR-JWT wird verifiziert (Signatur/exp/jti, Replay-Schutz)
   * - wenn direction weggelassen wird, toggelt der Server zwischen INSIDE/OUTSIDE
   */
  @Mutation(() => ScanPayload, { name: 'scanTicket2' })
  async scanTicket2(
    @Args('token') token: string,
    @Args('direction', { type: () => PresenceState }) direction?: PresenceState,
    @Args('gate') gate?: string,
    @Args('deviceHash') deviceHash?: string,
    @Args('byUserId') byUserId?: string,
  ) {
    return this.#scanWriteService.scanWithToken(token, {
      direction,
      gate,
      deviceHash,
      byUserId: byUserId,
    });
  }

  /**
   * scanTicketById(ticketId: ID!, direction: PresenceState!, gate: String!, deviceHash: String, byUserId: String): ScanResult!
   *
   * - Legacy-/Fallback-Mutation (ohne QR-Token), nutzt direkte ticketId
   * - nützlich für Tests/Admin-Overrides
   */
  @Mutation(() => ScanPayload, { name: 'scanTicketById' })
  async scanTicketById(
    @Args('ticketId') ticketId: string,
    @Args('direction', { type: () => PresenceState }) direction: PresenceState,
    @Args('gate') gate: string,
    @Args('deviceHash') deviceHash?: string,
    @Args('byUserId') byUserId?: string,
  ) {
    return this.#scanWriteService.scan({
      ticketId,
      direction,
      gate,
      deviceHash,
      byUserId: byUserId,
    });
  }
}
