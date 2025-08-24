'use client';

import {
  Alert,
  Card,
  CardContent,
  Chip,
  Stack,
  Typography,
} from '@mui/material';
import * as React from 'react';

type Summary = { yes: number; no: number; pending: number };

export default function ResponsesPage() {
  const [sum, setSum] = React.useState<Summary>({ yes: 0, no: 0, pending: 0 });
  const [error, setError] = React.useState<string | null>(null);

  const load = async () => {
    try {
      setError(null);
      const res = await fetch('/api/invitations/responses');
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? 'Fehler');
      setSum(data?.summary ?? { yes: 0, no: 0, pending: 0 });
    } catch (e: any) {
      setError(e.message);
    }
  };

  React.useEffect(() => {
    load();
  }, []);

  return (
    <Card variant="outlined">
      <CardContent>
        <Typography variant="h5" sx={{ fontWeight: 800, mb: 1 }}>
          Responses
        </Typography>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
          <Chip label={`Zugesagt: ${sum.yes}`} color="success" />
          <Chip label={`Abgesagt: ${sum.no}`} color="warning" />
          <Chip label={`Offen: ${sum.pending}`} />
        </Stack>
      </CardContent>
    </Card>
  );
}
