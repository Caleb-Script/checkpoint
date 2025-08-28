// apps/web/src/hooks/useDeviceHash.ts
'use client';

import { useEffect, useState } from 'react';
import { getDeviceHash } from '../lib/device/device-hash';

export function useDeviceHash(): {
  deviceHash: string | null;
  loading: boolean;
  error: string | null;
} {
  const [deviceHash, setDeviceHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const h = await getDeviceHash();
        if (!cancelled) setDeviceHash(h);
      } catch (e) {
        if (!cancelled)
          setError(e instanceof Error ? e.message : 'Unknown error');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return { deviceHash, loading, error };
}
