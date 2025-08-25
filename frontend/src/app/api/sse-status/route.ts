// /web/src/app/api/sse-status/route.ts
export const runtime = 'edge';
export const dynamic = 'force-dynamic';

declare global {
  // eslint-disable-next-line no-var
  var __SSE_CLIENTS: Set<(msg: any) => void> | undefined;
}
const clients: Set<(msg: any) => void> =
  (globalThis as any).__SSE_CLIENTS ?? new Set();
(globalThis as any).__SSE_CLIENTS = clients;

function toSseChunk(obj: any) {
  // standard: "data: <json>\n\n"
  return `data: ${JSON.stringify(obj)}\n\n`;
}

function broadcast(obj: any) {
  const payload = toSseChunk(obj);
  for (const send of Array.from(clients)) {
    try {
      send(payload);
    } catch {
      // Client ist weg; entfernen
      clients.delete(send);
    }
  }
}

export async function GET(_req: Request) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      // Sender-Callback für diesen Client registrieren
      const send = (str: string) => controller.enqueue(encoder.encode(str));
      clients.add(send);

      // Begrüßung + erster Ping
      send(`event: hello\ndata: ${Date.now()}\n\n`);
      send(`event: ping\ndata: ${Date.now()}\n\n`);

      // Heartbeat: Ping + Kommentar-KeepAlive (manche Proxys mögen das)
      const pingId = setInterval(() => {
        send(`event: ping\ndata: ${Date.now()}\n\n`);
        send(':\n\n'); // Kommentar-Zeile hält Verbindungen frisch
      }, 25000);

      // Cleanup bei Abbruch
      const cancel = () => {
        clearInterval(pingId);
        clients.delete(send);
        try {
          controller.close();
        } catch {}
      };

      // Wenn der Client abbricht oder die Stream-Pipe endet
      (controller as any)._cancel = cancel;
    },
    cancel() {
      // optionales Cleanup, falls oben nicht schon aufgerufen
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}

// Optional: Dev-Broadcast zum Testen: curl -X POST http://localhost:3000/api/sse-status
export async function POST(req: Request) {
  try {
    const body = await req.json();
    // erwarte z. B. { type: 'scan-log', log: {...} }
    broadcast(body);
    return new Response(JSON.stringify({ ok: true }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e: any) {
    return new Response(
      JSON.stringify({ ok: false, error: e?.message || 'bad json' }),
      {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      },
    );
  }
}
