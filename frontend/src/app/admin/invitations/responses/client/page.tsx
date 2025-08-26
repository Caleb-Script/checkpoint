'use client';

import { Box, Typography } from '@mui/material';
import * as React from 'react';

export default function ResponsesClientPage() {
  // Minimal "Wallboard" – große Schrift für Anzeige
  const [now, setNow] = React.useState(Date.now());
  React.useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  return (
    <Box sx={{ textAlign: 'center', py: 6 }}>
      <Typography variant="h2" sx={{ fontWeight: 900, mb: 2 }}>
        Responses Display
      </Typography>
      <Typography variant="h5" sx={{ color: 'text.secondary' }}>
        Stelle hier deine Live‑Übersicht dar (kann später mit WS‑Feed gefüllt
        werden). Zeit: {new Date(now).toLocaleTimeString()}
      </Typography>
    </Box>
  );
}
