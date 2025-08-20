// /Users/gentlebookpro/Projekte/checkpoint/web/src/context/SessionContext.tsx
"use client";

import * as React from "react";

type SessionUser = {
  sub?: string;
  email?: string;
  preferred_username?: string;
  name?: string;
  given_name?: string;
  family_name?: string;
  // beliebige weitere Claims
  [k: string]: any;
};

type SessionState = {
  loading: boolean;
  isAuthenticated: boolean;
  user: SessionUser | null;
  roles: string[];
  tokenExpiresAt: number | null; // unix seconds
};

type SessionContextType = SessionState & {
  login: (
    username: string,
    password: string,
  ) => Promise<{ ok: boolean; error?: string }>;
  logout: () => Promise<void>;
  refresh: () => Promise<boolean>;
  reload: () => Promise<void>;
};

const SessionContext = React.createContext<SessionContextType>({
  loading: true,
  isAuthenticated: false,
  user: null,
  roles: [],
  tokenExpiresAt: null,
  login: async () => ({ ok: false, error: "not ready" }),
  logout: async () => {},
  refresh: async () => false,
  reload: async () => {},
});

export const useSession = () => React.useContext(SessionContext);

// kleine Helper
async function apiGet<T>(
  url: string,
): Promise<{ ok: boolean; data?: T; status: number }> {
  const res = await fetch(url, {
    method: "GET",
    credentials: "include",
    cache: "no-store",
  });
  const status = res.status;
  if (!res.ok) return { ok: false, status };
  const data = (await res.json()) as T;
  return { ok: true, data, status };
}

async function apiPost<T>(
  url: string,
  body?: any,
): Promise<{ ok: boolean; data?: T; status: number }> {
  const res = await fetch(url, {
    method: "POST",
    credentials: "include",
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const status = res.status;
  if (!res.ok) {
    let err: any = null;
    try {
      err = await res.json();
    } catch {}
    return { ok: false, data: err ?? undefined, status };
  }
  const data = (await res.json().catch(() => ({}))) as T;
  return { ok: true, data, status };
}

type MeResponse =
  | {
      authenticated: true;
      profile: SessionUser;
      roles: string[];
      tokenExpiresAt: number | null;
    }
  | { authenticated: false };

type LoginResponse = { ok: true; expiresAt: number } | { error: string };

export default function SessionProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [state, setState] = React.useState<SessionState>({
    loading: true,
    isAuthenticated: false,
    user: null,
    roles: [],
    tokenExpiresAt: null,
  });

  // Merker für Refresh‑Timer
  const refreshTimerRef = React.useRef<number | null>(null);

  const clearRefreshTimer = React.useCallback(() => {
    if (refreshTimerRef.current !== null) {
      window.clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = null;
    }
  }, []);

  const scheduleRefresh = React.useCallback(
    (expiresAt: number | null) => {
      clearRefreshTimer();
      if (!expiresAt) return;

      // 30s vor Ablauf refreshen, Minimum 5s
      const nowSec = Math.floor(Date.now() / 1000);
      const secondsLeft = Math.max(0, expiresAt - nowSec);
      const triggerInMs = Math.max((secondsLeft - 30) * 1000, 5000);

      refreshTimerRef.current = window.setTimeout(async () => {
        await refresh();
      }, triggerInMs) as unknown as number;
    },
    [clearRefreshTimer],
  );

  const reload = React.useCallback(async () => {
    const res = await apiGet<MeResponse>("/api/auth/me");
    if (!res.ok || !res.data || !("authenticated" in res.data)) {
      setState((s) => ({
        ...s,
        loading: false,
        isAuthenticated: false,
        user: null,
        roles: [],
        tokenExpiresAt: null,
      }));
      clearRefreshTimer();
      return;
    }

    if (res.data.authenticated) {
      const { profile, roles, tokenExpiresAt } = res.data;
      setState({
        loading: false,
        isAuthenticated: true,
        user: profile,
        roles,
        tokenExpiresAt: tokenExpiresAt ?? null,
      });
      scheduleRefresh(tokenExpiresAt ?? null);
    } else {
      setState({
        loading: false,
        isAuthenticated: false,
        user: null,
        roles: [],
        tokenExpiresAt: null,
      });
      clearRefreshTimer();
    }
  }, [scheduleRefresh, clearRefreshTimer]);

  React.useEffect(() => {
    // initial laden
    reload();
    return () => clearRefreshTimer();
  }, [reload, clearRefreshTimer]);

  const refresh = React.useCallback(async () => {
    const res = await apiPost<{ ok: true; expiresAt: number }>(
      "/api/auth/refresh",
    );
    if (!res.ok || !res.data) {
      // Refresh fehlgeschlagen → Session fällt zurück auf ausgeloggt beim nächsten /me
      await reload();
      return false;
    }
    // Nach erfolgreichem Refresh /me holen, um Rollen/Profil aktuell zu halten
    await reload();
    return true;
  }, [reload]);

  const login = React.useCallback(
    async (username: string, password: string) => {
      const res = await apiPost<LoginResponse>("/api/auth/login", {
        username,
        password,
      });
      if (!res.ok) {
        const msg =
          (res.data as any)?.error ||
          (typeof res.data === "string" ? res.data : "") ||
          "Login fehlgeschlagen";
        return { ok: false, error: msg };
      }
      await reload();
      return { ok: true };
    },
    [reload],
  );

  const logout = React.useCallback(async () => {
    await apiPost("/api/auth/logout");
    clearRefreshTimer();
    setState({
      loading: false,
      isAuthenticated: false,
      user: null,
      roles: [],
      tokenExpiresAt: null,
    });
  }, [clearRefreshTimer]);

  const value = React.useMemo<SessionContextType>(
    () => ({
      ...state,
      login,
      logout,
      refresh,
      reload,
    }),
    [state, login, logout, refresh, reload],
  );

  return (
    <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
  );
}
