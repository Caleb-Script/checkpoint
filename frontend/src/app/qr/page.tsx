'use client';

import { Card, CardContent, Grid, Paper, Typography } from '@mui/material';
import * as React from 'react';

type QRItem = { id: string; ticketId: string; dataUrl: string };

export default function QrOverviewPage() {
  const [items, setItems] = React.useState<QRItem[]>([]);

  const load = async () => {
    // Optional: Wenn es eine API‑Route gibt, hier abrufen. Placeholder für Demo:
    setItems([]);
  };

  React.useEffect(() => {
    load();
  }, []);

  return (
    <Card variant="outlined">
      <CardContent>
        <Typography variant="h5" sx={{ fontWeight: 800, mb: 1 }}>
          QR‑Übersicht (Optional)
        </Typography>
        <Grid container spacing={2}>
          {items.map((i) => (
            <Grid item xs={6} sm={4} key={i.id}>
              <Paper sx={{ p: 1, textAlign: 'center' }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={i.dataUrl}
                  alt={i.ticketId}
                  width={160}
                  height={160}
                />
                <Typography variant="caption">{i.ticketId}</Typography>
              </Paper>
            </Grid>
          ))}
          {items.length === 0 && <Typography>Keine Daten</Typography>}
        </Grid>
      </CardContent>
    </Card>
  );
}
