// apps/web/src/lib/device/device-secret.store.ts
// Abstraktion für das Geräte-Secret:
// - Nativ (iOS/Android via Capacitor): Keychain/Keystore mit capacitor-secure-storage-plugin
// - Web: LocalStorage + Cookie-Fallback

import { Capacitor } from '@capacitor/core';

export interface DeviceSecretStore {
  get(): Promise<string | null>;
  set(value: string): Promise<void>;
  remove(): Promise<void>;
}

const SECRET_KEY = 'ckpt_device_secret_v1';
const COOKIE_NAME = 'ckpt_device_secret_v1';
const COOKIE_MAX_AGE_DAYS = 365 * 2;

function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof document !== 'undefined';
}

// ---------- Web-Backend (LocalStorage + Cookie) ----------
function setCookie(name: string, value: string, days: number): void {
  const d = new Date();
  d.setTime(d.getTime() + days * 24 * 60 * 60 * 1000);
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${d.toUTCString()}; path=/; SameSite=Lax`;
}

function getCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
  return match ? decodeURIComponent(match[2]) : null;
}

const WebStore: DeviceSecretStore = {
  async get(): Promise<string | null> {
    if (!isBrowser()) return null;
    try {
      const v = window.localStorage.getItem(SECRET_KEY);
      if (v && v.length > 0) {
        setCookie(COOKIE_NAME, v, COOKIE_MAX_AGE_DAYS);
        return v;
      }
    } catch {
      /* ignore */
    }

    try {
      const c = getCookie(COOKIE_NAME);
      if (c && c.length > 0) {
        try {
          window.localStorage.setItem(SECRET_KEY, c);
        } catch {
          /* ignore */
        }
        return c;
      }
    } catch {
      /* ignore */
    }

    return null;
  },
  async set(value: string): Promise<void> {
    if (!isBrowser()) return;
    try {
      window.localStorage.setItem(SECRET_KEY, value);
    } catch {
      /* ignore */
    }
    try {
      setCookie(COOKIE_NAME, value, COOKIE_MAX_AGE_DAYS);
    } catch {
      /* ignore */
    }
  },
  async remove(): Promise<void> {
    if (!isBrowser()) return;
    try {
      window.localStorage.removeItem(SECRET_KEY);
    } catch {
      /* ignore */
    }
    try {
      setCookie(COOKIE_NAME, '', -1);
    } catch {
      /* ignore */
    }
  },
};

// ---------- Native-Backend (Keychain/Keystore) ----------
let NativeStore: DeviceSecretStore | null = null;

async function ensureNativeStore(): Promise<DeviceSecretStore> {
  if (NativeStore) return NativeStore;

  // Öffentliches Plugin: https://www.npmjs.com/package/capacitor-secure-storage-plugin
  // API: SecureStoragePlugin.get({ key }), .set({ key, value }), .remove({ key })
  const mod = (await import('capacitor-secure-storage-plugin').catch(
    () => null,
  )) as {
    SecureStoragePlugin: {
      get(options: { key: string }): Promise<{ value?: string }>;
      set(options: { key: string; value: string }): Promise<void>;
      remove(options: { key: string }): Promise<void>;
    };
  } | null;

  if (!mod) {
    // Fallback: Preferences (nicht verschlüsselt – nur als Notlösung)
    const prefs = (await import('@capacitor/preferences').catch(
      () => null,
    )) as {
      Preferences: {
        get(options: { key: string }): Promise<{ value: string | null }>;
        set(options: { key: string; value: string }): Promise<void>;
        remove(options: { key: string }): Promise<void>;
      };
    } | null;

    if (!prefs) {
      NativeStore = WebStore;
      return NativeStore;
    }

    NativeStore = {
      async get(): Promise<string | null> {
        const { value } = await prefs.Preferences.get({ key: SECRET_KEY });
        return value ?? null;
      },
      async set(value: string): Promise<void> {
        await prefs.Preferences.set({ key: SECRET_KEY, value });
      },
      async remove(): Promise<void> {
        await prefs.Preferences.remove({ key: SECRET_KEY });
      },
    };
    return NativeStore;
  }

  const { SecureStoragePlugin } = mod;

  NativeStore = {
    async get(): Promise<string | null> {
      try {
        const out = await SecureStoragePlugin.get({ key: SECRET_KEY });
        // Einige Implementierungen werfen statt value: undefined → behandeln wir als null
        return out?.value && out.value.length > 0 ? out.value : null;
      } catch {
        return null;
      }
    },
    async set(value: string): Promise<void> {
      await SecureStoragePlugin.set({ key: SECRET_KEY, value });
    },
    async remove(): Promise<void> {
      try {
        await SecureStoragePlugin.remove({ key: SECRET_KEY });
      } catch {
        /* ignore */
      }
    },
  };

  return NativeStore;
}

export async function getDeviceSecretStore(): Promise<DeviceSecretStore> {
  const isNative = Capacitor.isNativePlatform();
  if (!isNative) return WebStore;
  return ensureNativeStore();
}
