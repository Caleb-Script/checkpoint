// /services/seatmap-extractor/src/adapters/checkpointPush.ts
import type { SeatMap, ImportOptions } from "../types.js";

/**
 * Pusht den erkannten SeatMap an eine Checkpoint-Webhook-URL.
 * Erwartetes Format (Beispiel): [{ eventId, section, row, number, note? }]
 */
export async function pushToCheckpoint(
  seatMap: SeatMap,
  options: ImportOptions,
): Promise<{
  ok: boolean;
  seatCount: number;
  pushedTo?: string;
  warnings?: string[];
}> {
  const warnings: string[] = [];
  if (!options.webhookUrl) {
    warnings.push("Keine webhookUrl angegeben – es wurde nichts gepusht.");
    return { ok: false, seatCount: seatMap.seats.length, warnings };
  }

  const payload = {
    eventId: options.eventId ?? null,
    seats: seatMap.seats.map((s) => ({
      eventId: options.eventId ?? null,
      section: s.section ?? null,
      row: s.row ?? null,
      number: s.number ?? s.label ?? null,
      note: null,
    })),
  };

  const res = await fetch(options.webhookUrl, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    warnings.push(`Webhook antwortete mit Status ${res.status}`);
    return {
      ok: false,
      seatCount: seatMap.seats.length,
      warnings,
      pushedTo: options.webhookUrl,
    };
  }
  return {
    ok: true,
    seatCount: seatMap.seats.length,
    pushedTo: options.webhookUrl,
    warnings,
  };
}
