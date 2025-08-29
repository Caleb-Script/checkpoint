// frontend/srv/app/(account)/device/page.tsx
'use client';

import { Box, Container } from '@mui/material';
import * as React from 'react';
import { DeviceCard } from '../../../components/device/DeviceCard';
import { useDeviceHash } from '../../../hooks/useDeviceHash';
import {
  getDeviceHash,
  rotateDeviceSecret,
} from '../../../lib/device/device-hash';

export default function DevicePage() {
  const { deviceHash, loading, error } = useDeviceHash();
  const [rehash, setRehash] = React.useState<string | null>(null);
  const [reloading, setReloading] = React.useState<boolean>(false);
  const [rotateError, setRotateError] = React.useState<string | null>(null);

  const current = rehash ?? deviceHash;
  const busy = loading || reloading;

  const handleRotate = async (): Promise<void> => {
    try {
      setRotateError(null);
      setReloading(true);
      rotateDeviceSecret();
      // neu berechnen
      const h = await getDeviceHash();
      setRehash(h);
    } catch (e) {
      setRotateError(e instanceof Error ? e.message : 'Unbekannter Fehler');
    } finally {
      setReloading(false);
    }
  };

  return (
    <Container maxWidth="sm" sx={{ py: 3 }}>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <DeviceCard
          deviceHash={current ?? null}
          loading={busy}
          error={rotateError ?? error}
          onRotate={handleRotate}
        />
      </Box>
    </Container>
  );
}
