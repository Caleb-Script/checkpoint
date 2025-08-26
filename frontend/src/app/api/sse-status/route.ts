import { NextResponse } from 'next/server';

/**
 * Sehr schlanke, in-Memory basierte SSE-Implementation.
 * - GET  /api/sse-status   -> verbindet den Client via EventSource
 * - POST /api/sse-status   -> broadcastet eine Nachricht an alle Clients
 *
 * Hinweis: In-Memory Subscriptions sind pro Server-Prozess. Für Multi-Instance
 * / Serverless brauchst du einen Redis-/WS-basierten Fanout. Für „dev“ & Single-Node passt es.
 */

type EventPayload = unknown; // bei Bedarf enger tippen (z. B. { type: string; data: ... })

type Subscriber = {
  id: string;
  send: (data: string) => void;
  close: () => void;
};

// Zentrales Registry der Abonnenten (pro Prozess)
const subscribers = new Map<string, Subscriber>();

// Hilfsfunktion: einheitliches SSE-Format
function formatSSE(event: string, data: string): string {
  // Mehrzeilige data-Zeilen sauber trennen
  const safe = data
    .split('\n')
    .map((l) => `data: ${l}`)
    .join('\n');
  return `event: ${event}\n${safe}\n\n`;
}

/**
 * GET: Stellt einen text/event-stream her und registriert den Client in `subscribers`.
 */
export async function GET(_req: Request): Promise<Response> {
  const id = crypto.randomUUID();

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const encoder = new TextEncoder();

      // initial: „connected“-Event
      controller.enqueue(
        encoder.encode(formatSSE('connected', JSON.stringify({ id }))),
      );

      const send = (data: string) => {
        controller.enqueue(encoder.encode(data));
      };

      const close = () => {
        try {
          controller.close();
        } catch {
          // already closed
        }
      };

      subscribers.set(id, { id, send, close });

      // Keep-Alive Ping alle 25s (verhindert idle timeouts bei Proxys)
      const pingInterval = setInterval(() => {
        send(formatSSE('ping', JSON.stringify({ t: Date.now() })));
      }, 25_000);

      // Wenn der Stream beendet wird: Aufräumen
      const abort = () => {
        clearInterval(pingInterval);
        subscribers.delete(id);
        try {
          controller.close();
        } catch {
          /* no-op */
        }
      };

      // Falls der Client die Verbindung abbricht
      _req?.signal?.addEventListener?.('abort', abort);

      // Fallback: schließe Verbindung nach 24h hart
      setTimeout(abort, 24 * 60 * 60 * 1000);
    },
    cancel() {
      // Stream durch Client beendet
      subscribers.delete(id);
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      // WICHTIG für Next.js / Proxies:
      'X-Accel-Buffering': 'no',
    },
  });
}

/**
 * POST: broadcastet eine Nutzlast an alle verbundenen SSE-Clients.
 * Body: { event?: string; payload?: unknown }
 */
export async function POST(req: Request) {
  let body: { event?: string; payload?: EventPayload } = {};
  try {
    body = (await req.json()) as typeof body;
  } catch {
    // ignore – leerer Body ist okay
  }

  const eventName = body.event ?? 'message';
  const json = JSON.stringify(body.payload ?? { t: Date.now() });

  const packet = formatSSE(eventName, json);

  for (const [, sub] of subscribers) {
    try {
      sub.send(packet);
    } catch {
      // defekter Client – deregistrieren
      subscribers.delete(sub.id);
      try {
        sub.close();
      } catch {
        /* no-op */
      }
    }
  }

  return NextResponse.json({ ok: true, delivered: subscribers.size });
}
