// Channels, die dein System unterstützt
export type Channel = "security" | "admin" | "public";

// Definierte Message-Struktur – du kannst hier weitere Cases ergänzen
export type WsMessage =
  | { type: "ping"; t: number }
  | { type: "pong"; t: number }
  | { type: "scan-log"; payload: unknown }
  | { type: string;[key: string]: unknown };

export type Listener = (msg: WsMessage | string) => void;

export type WSClient = {
  socket: WebSocket;
  on: (cb: Listener) => () => void;
  send: (data: WsMessage | string) => void;
  close: () => void;
  channel: Channel;
  state: () => number;
};

declare global {
  var __checkpointWS__: Record<string, WSClient | undefined> | undefined;
}

const getBaseWsUrl = (): string => {
  const envUrl = process.env.NEXT_PUBLIC_WS_URL;
  if (envUrl) return envUrl.replace(/^http/, "ws");
  if (typeof window !== "undefined") {
    const { protocol, host } = window.location;
    const wsProto = protocol === "https:" ? "wss:" : "ws:";
    return `${wsProto}//${host}`;
  }
  return "ws://localhost:3100";
};

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

export function getWs(channel: Channel = "public"): WSClient {
  if (typeof window === "undefined") {
    throw new Error("WebSocket client can only be used in the browser.");
  }

  if (!globalThis.__checkpointWS__) globalThis.__checkpointWS__ = {};
  const cache = globalThis.__checkpointWS__;

  const existing = cache[channel];
  if (existing && existing.socket.readyState <= WebSocket.OPEN) {
    return existing; // Singleton
  }

  const base = getBaseWsUrl();
  const url = `${base}/ws/${channel}`;

  const listeners: Set<Listener> = new Set();
  let ws: WebSocket | null = null;
  let reconnecting = false;
  let retries = 0;

  const connect = async (): Promise<void> => {
    if (reconnecting) return;
    reconnecting = true;

    const delay = Math.min(8000, 500 * 2 ** Math.max(0, retries - 1));
    if (retries > 0) await sleep(delay);

    ws = new WebSocket(url);

    ws.addEventListener("open", () => {
      retries = 0;
      reconnecting = false;
      console.log(`[WS:${channel}] connected`);
    });

    ws.addEventListener("message", (ev: MessageEvent) => {
      let payload: WsMessage | string;
      try {
        payload = JSON.parse(ev.data) as WsMessage;
      } catch {
        payload = ev.data;
      }
      for (const cb of listeners) cb(payload);
    });

    ws.addEventListener("close", () => {
      console.log(`[WS:${channel}] closed; scheduling reconnect`);
      retries += 1;
      reconnecting = false;
      void connect();
    });

    ws.addEventListener("error", (e: Event) => {
      console.warn(`[WS:${channel}] error`, e);
      try {
        ws?.close();
      } catch {
        /* no-op */
      }
    });
  };

  void connect();

  const client: WSClient = {
    // Non-null Assertion, weil connect() unmittelbar gestartet wird
    get socket() {
      if (!ws) throw new Error("WebSocket not connected yet.");
      return ws;
    },
    channel,
    on: (cb: Listener) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    send: (data: WsMessage | string) => {
      const socket = ws;
      if (socket && socket.readyState === WebSocket.OPEN) {
        const out = typeof data === "string" ? data : JSON.stringify(data);
        socket.send(out);
      } else {
        console.warn(`[WS:${channel}] cannot send, socket not open`);
      }
    },
    close: () => {
      listeners.clear();
      ws?.close();
      ws = null;
    },
    state: () => (ws ? ws.readyState : WebSocket.CLOSED),
  };

  cache[channel] = client;
  return client;
}
