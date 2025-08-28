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

  /**
   * scanTicket(token: String!, direction: PresenceState, gate: String, deviceHash: String, byUserId: String): ScanResult!
   *
   * - bevorzugter Weg am Gate: QR-JWT wird verifiziert (Signatur/exp/jti, Replay-Schutz)
   * - wenn direction weggelassen wird, toggelt der Server zwischen INSIDE/OUTSIDE
   */
  @Mutation(() => ScanPayload, { name: 'scanTicket' })
  async scanTicket(
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
  @Mutation(() => ScanPayload, {
    name: 'scanTicketById',
    description:
      'Scannt ein Ticket und setzt den Presence-State (Toggle oder erzwungene Richtung).',
  })
  async scanTicketById(
    @Args('input', { type: () => ScanInput }) input: ScanInput,
  ) {
    const { ticketId, direction, gate, deviceHash, byUserId } = input;
    return this.#scanWriteService.scan({
      ticketId,
      direction,
      gate,
      deviceHash,
      byUserId,
    });
  }
}
