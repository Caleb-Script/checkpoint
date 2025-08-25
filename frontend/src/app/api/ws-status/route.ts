// /web/src/app/api/ws-status/route.ts
export const runtime = 'edge';

declare global {
  // persistiert innerhalb der Edge-Isolate (solange warm)
  // Set mit verbundenen Sockets zum Broadcasten
  // eslint-disable-next-line no-var
  var __WS_CLIENTS: Set<WebSocket> | undefined;
}

const clients: Set<WebSocket> =
  (globalThis as any).__WS_CLIENTS ?? new Set<WebSocket>();
(globalThis as any).__WS_CLIENTS = clients;

function broadcast(obj: any) {
  const msg = JSON.stringify(obj);
  for (const ws of clients) {
    try {
      ws.send(msg);
    } catch {
      // ignore broken sockets
    }
  }
}

export async function GET(req: Request) {
  const upgrade = req.headers.get('upgrade') || '';
  if (upgrade.toLowerCase() !== 'websocket') {
    return new Response('Expected WebSocket', { status: 426 });
  }

  // In Edge-Funktionen: WebSocketPair wie auf Cloudflare/Vercel
  const { 0: client, 1: server } = Object.values(
    new (globalThis as any).WebSocketPair(),
  );

  // @ts-ignore: Edge Runtime
  server.accept();

  // Registrieren
  clients.add(server);

  // Optional: Begrüßung
  try {
    server.send(JSON.stringify({ type: 'hello', ts: Date.now() }));
  } catch {}

  // Heartbeat / Ping-Pong
  let alive = true;
  const interval = setInterval(() => {
    try {
      if (!alive) {
        try {
          server.close();
        } catch {}
        clearInterval(interval);
        return;
      }
      alive = false;
      server.send(JSON.stringify({ type: 'ping', ts: Date.now() }));
    } catch {
      clearInterval(interval);
    }
  }, 25000);

  server.addEventListener('message', (event: MessageEvent) => {
    try {
      const data = JSON.parse(String(event.data || '{}'));
      if (data?.type === 'pong') {
        alive = true;
        return;
      }
      if (data?.type === 'echo') {
        server.send(
          JSON.stringify({ type: 'echo', payload: data?.payload ?? null }),
        );
        return;
      }
      // Beispiel: ein Client kann testweise einen Scan-Log broadcasten
      if (data?.type === 'scan-log') {
        broadcast({ type: 'scan-log', log: data.log, ts: Date.now() });
      }
    } catch {
      // ignore
    }
  });

  server.addEventListener('close', () => {
    clearInterval(interval);
    clients.delete(server);
  });
  server.addEventListener('error', () => {
    clearInterval(interval);
    clients.delete(server);
  });

  // Rückgabe des „Gegenstücks“ an den Client
  // @ts-ignore: Edge Runtime
  return new Response(null, { status: 101, webSocket: client });
}
