/**
 * WebSocket-Route über Edge-Runtime mithilfe von WebSocketPair.
 * Funktioniert in Next.js (>=13.2) Edge-Umgebungen. Lokal im Node-Dev-Server
 * ebenfalls nutzbar. Kein `any`, sauber typisiert.
 *
 * - GET /api/ws-status   -> Wenn "Upgrade: websocket" gesetzt ist, wird upgegradet.
 * - Optionaler Ping/Pong-Heartbeat + Echo-Protocol.
 */
export const runtime = 'edge';

type InboundMessage = {
  type: 'ping' | 'echo' | 'broadcast';
  payload?: unknown;
};

type OutboundMessage =
  | { type: 'welcome'; id: string; t: number }
  | { type: 'pong'; t: number }
  | { type: 'echo'; payload: unknown; t: number }
  | { type: 'broadcast'; payload: unknown; t: number }
  | { type: 'error'; message: string }
  | { type: 'info'; message: string };

// pro Edge-Instance nur prozesslokal
const clients = new Set<WebSocket>();

function send(ws: WebSocket, msg: OutboundMessage) {
  try {
    ws.send(JSON.stringify(msg));
  } catch {
    // socket vermutlich geschlossen
  }
}

function broadcast(msg: OutboundMessage) {
  const data = JSON.stringify(msg);
  for (const ws of clients) {
    try {
      ws.send(data);
    } catch {
      // defekter Client ignorieren
    }
  }
}

export function GET(request: Request): Response {
  // Nur Upgrade-Requests annehmen
  if (request.headers.get('upgrade')?.toLowerCase() !== 'websocket') {
    return new Response('Expected WebSocket upgrade', { status: 426 });
  }

  // WebSocketPair ist in Edge-Runtime verfügbar
  const { 0: client, 1: server } = new WebSocketPair();

  const id = crypto.randomUUID();

  server.accept();
  clients.add(server);

  // Begrüßung
  send(server, { type: 'welcome', id, t: Date.now() });

  server.addEventListener('message', (event: MessageEvent) => {
    try {
      const data = typeof event.data === 'string' ? event.data : '';
      const parsed = data
        ? (JSON.parse(data) as InboundMessage)
        : ({} as InboundMessage);

      switch (parsed.type) {
        case 'ping':
          send(server, { type: 'pong', t: Date.now() });
          break;

        case 'echo':
          send(server, {
            type: 'echo',
            payload: parsed.payload ?? null,
            t: Date.now(),
          });
          break;

        case 'broadcast':
          broadcast({
            type: 'broadcast',
            payload: parsed.payload ?? null,
            t: Date.now(),
          });
          break;

        default:
          send(server, { type: 'info', message: 'unknown message type' });
      }
    } catch (err) {
      send(server, {
        type: 'error',
        message: err instanceof Error ? err.message : 'invalid message',
      });
    }
  });

  server.addEventListener('close', () => {
    clients.delete(server);
  });

  server.addEventListener('error', () => {
    try {
      server.close();
    } catch {
      /* no-op */
    }
    clients.delete(server);
  });

  // Response mit Status 101 und Client-Socket zurückgeben
  return new Response(null, { status: 101, webSocket: client });
}
