// /Users/gentlebookpro/Projekte/checkpoint/web/src/lib/ws.ts
/* eslint-disable no-console */
type Channel = 'security' | 'admin' | 'public';
type WsMessage = { type: string; [k: string]: any };
type Listener = (msg: WsMessage | string) => void;

type WSClient = {
  socket: WebSocket;
  on: (cb: Listener) => () => void;
  send: (data: any) => void;
  close: () => void;
  channel: Channel;
  state: () => number;
};

declare global {
  // eslint-disable-next-line no-var
  var __checkpointWS__: Record<string, WSClient | undefined> | undefined;
}

const getBaseWsUrl = (): string => {
  const envUrl = process.env.NEXT_PUBLIC_WS_URL;
  if (envUrl) return envUrl.replace(/^http/, 'ws');
  if (typeof window !== 'undefined') {
    const { protocol, host } = window.location;
    const wsProto = protocol === 'https:' ? 'wss:' : 'ws:';
    return `${wsProto}//${host}`;
  }
  return 'ws://localhost:3100';
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function getWs(channel: Channel = 'public'): WSClient {
  if (typeof window === 'undefined') {
    throw new Error('WebSocket client can only be used in the browser.');
  }

  if (!globalThis.__checkpointWS__) globalThis.__checkpointWS__ = {};
  const cache = globalThis.__checkpointWS__;

  const existing = cache[channel];
  if (existing && existing.socket && existing.socket.readyState <= 1) {
    return existing; // Singleton!
  }

  const base = getBaseWsUrl();
  const url = `${base}/ws/${channel}`;

  let listeners: Set<Listener> = new Set();
  let ws: WebSocket;
  let reconnecting = false;
  let retries = 0;

  const connect = async () => {
    if (reconnecting) return;
    reconnecting = true;

    const delay = Math.min(8000, 500 * Math.pow(2, Math.max(0, retries - 1)));
    if (retries > 0) await sleep(delay);

    ws = new WebSocket(url);

    ws.addEventListener('open', () => {
      retries = 0;
      reconnecting = false;
      console.log(`[WS:${channel}] connected`);
    });

    ws.addEventListener('message', (ev) => {
      let payload: any = ev.data;
      try {
        payload = JSON.parse(ev.data);
      } catch {}
      for (const cb of listeners) cb(payload);
    });

    ws.addEventListener('close', () => {
      console.log(`[WS:${channel}] closed; scheduling reconnect`);
      retries += 1;
      reconnecting = false;
      void connect();
    });

    ws.addEventListener('error', (e) => {
      console.warn(`[WS:${channel}] error`, e);
      try {
        ws.close();
      } catch {}
    });
  };

  void connect();

  const client: WSClient = {
    socket: ws as any,
    channel,
    on: (cb: Listener) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    send: (data: any) => {
      try {
        if (ws?.readyState === WebSocket.OPEN) {
          ws.send(typeof data === 'string' ? data : JSON.stringify(data));
        }
      } catch (e) {
        console.warn(`[WS:${channel}] send failed`, e);
      }
    },
    close: () => {
      try {
        listeners.clear();
        ws?.close();
      } catch {}
    },
    state: () => ws?.readyState ?? WebSocket.CLOSED,
  };

  cache[channel] = client;
  return client;
}
