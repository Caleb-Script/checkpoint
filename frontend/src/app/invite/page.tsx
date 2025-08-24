'use client';

import {
  Alert,
  Button,
  Card,
  CardActions,
  CardContent,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import * as React from 'react';

export default function InvitePage() {
  const [shareLink, setShareLink] = React.useState<string | null>(null);
  const [email, setEmail] = React.useState('');
  const [name, setName] = React.useState('');
  const [message, setMessage] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const createLink = async () => {
    setError(null);
    setMessage(null);
    try {
      const res = await fetch('/api/invitations/share', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? 'Fehler');
      setShareLink(data.url);
      setMessage('Share‑Link erstellt. Sende den Link an deine Begleitung.');
    } catch (e: any) {
      setError(e.message);
    }
  };

  const claimOnBehalf = async () => {
    setError(null);
    setMessage(null);
    try {
      const res = await fetch('/api/invite/claim', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email, name }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? 'Fehler');
      setMessage('Einladung ausgelöst.');
      setEmail('');
      setName('');
    } catch (e: any) {
      setError(e.message);
    }
  };

  return (
    <Card variant="outlined">
      <CardContent>
        <Typography variant="h5" sx={{ fontWeight: 800, mb: 1 }}>
          Plus‑One einladen
        </Typography>
        <Typography sx={{ color: 'text.secondary', mb: 2 }}>
          Falls erlaubt, kannst du eine weitere Person einladen.
        </Typography>

        {message && (
          <Alert severity="success" sx={{ mb: 2 }}>
            {message}
          </Alert>
        )}
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
          <Button onClick={createLink} variant="contained">
            Share‑Link erstellen
          </Button>
          {shareLink && (
            <Button
              onClick={() => navigator.clipboard.writeText(shareLink)}
              variant="outlined"
            >
              Link kopieren
            </Button>
          )}
        </Stack>

        {shareLink && (
          <Alert severity="info" sx={{ mb: 2, wordBreak: 'break-all' }}>
            {shareLink}
          </Alert>
        )}

        <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>
          Oder direkt versenden
        </Typography>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
          <TextField
            label="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            fullWidth
          />
          <TextField
            label="E‑Mail"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            fullWidth
          />
        </Stack>
      </CardContent>
      <CardActions>
        <Button onClick={claimOnBehalf} variant="contained">
          Einladung senden
        </Button>
      </CardActions>
    </Card>
  );
}
