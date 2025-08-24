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
import { useSearchParams } from 'next/navigation';
import * as React from 'react';

export default function RsvpPage() {
  const sp = useSearchParams();
  const invitationId = sp.get('invitation') ?? '';
  const shareCode = sp.get('code') ?? '';

  const [firstName, setFirstName] = React.useState('');
  const [lastName, setLastName] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [phone, setPhone] = React.useState('');
  const [message, setMessage] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  const submit = async (choice: 'accept' | 'decline') => {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const url =
        choice === 'accept' ? '/api/rsvp/accept' : '/api/rsvp/decline';
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          invitationId,
          shareCode,
          firstName,
          lastName,
          email,
          phone,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? 'Fehler');
      setMessage(
        choice === 'accept'
          ? 'Danke! Wir haben deine Zusage gespeichert.'
          : 'Schade – wir haben deine Absage gespeichert.',
      );
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card variant="outlined">
      <CardContent>
        <Typography variant="h5" sx={{ fontWeight: 800, mb: 1 }}>
          RSVP
        </Typography>
        <Typography sx={{ color: 'text.secondary', mb: 2 }}>
          Bestätige deine Teilnahme. Optional kannst du Kontaktdaten
          hinterlassen.
        </Typography>

        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={1}
          sx={{ mb: 1 }}
        >
          <TextField
            label="Vorname"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            fullWidth
          />
          <TextField
            label="Nachname"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            fullWidth
          />
        </Stack>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={1}
          sx={{ mb: 1 }}
        >
          <TextField
            label="E‑Mail (optional)"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            fullWidth
          />
          <TextField
            label="Telefon (optional)"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            fullWidth
          />
        </Stack>

        {(message || error) && (
          <Alert severity={error ? 'error' : 'success'} sx={{ mt: 1, mb: 1 }}>
            {error ?? message}
          </Alert>
        )}

        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          Einladung: {invitationId || '—'}{' '}
          {shareCode ? `• Code: ${shareCode}` : ''}
        </Typography>
      </CardContent>
      <CardActions>
        <Button
          onClick={() => submit('accept')}
          variant="contained"
          disabled={busy}
        >
          Zusagen
        </Button>
        <Button
          onClick={() => submit('decline')}
          variant="outlined"
          color="warning"
          disabled={busy}
        >
          Absagen
        </Button>
      </CardActions>
    </Card>
  );
}
