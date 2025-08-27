import { Resolver } from '@nestjs/graphql';
import { ScanService } from '../service/scan.service.js';
import { PresenceState } from '../models/enums/presenceState.enum.js';

interface ScanLogEntity {
  id: string;
  ticketId: string;
  eventId: string;
  byUserId?: string | null;
  direction: PresenceState;
  verdict: string;
  gate?: string | null;
  deviceHash?: string | null;
  createdAt: Date;
}

/**
 * Abfragen für Scan-Logs (z. B. Live-Monitoring oder Auswertung)
 */
@Resolver()
export class ScanQueryResolver {
  constructor(private readonly scanService: ScanService) {}
}
