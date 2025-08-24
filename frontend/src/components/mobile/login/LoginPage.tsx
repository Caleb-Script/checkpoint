'use client';

import {
  Button,
  Card,
  CardActions,
  CardContent,
  Stack,
  Typography,
} from '@mui/material';
import * as React from 'react';

type Me = {
  id: string;
  name?: string;
  email?: string;
  roles?: string[];
} | null;

export default function LoginPage() {
  const [me, setMe] = React.useState<Me>(null);
  const [loading, setLoading] = React.useState(false);

  const fetchMe = async () => {
    try {
      const res = await fetch('/api/auth/me', { credentials: 'include' });
      if (res.ok) setMe(await res.json());
      else setMe(null);
    } catch {
      setMe(null);
    }
  };

  React.useEffect(() => {
    fetchMe();
  }, []);

  const handleLogin = () => {
    window.location.href = '/api/auth/login';
  };
  const handleLogout = () => {
    window.location.href = '/api/auth/logout';
  };

  return (
    <Card variant="outlined">
      <CardContent>
        <Typography variant="h5" sx={{ fontWeight: 800, mb: 1 }}>
          Login
        </Typography>
        <Typography sx={{ color: 'text.secondary', mb: 2 }}>
          Melde dich per Keycloak an. Bei erster Nutzung wird dein Gast‑Profil
          automatisch angelegt.
        </Typography>

        <Stack spacing={0.5} sx={{ mb: 2 }}>
          <Typography variant="body2">
            <b>Status:</b> {me ? 'Angemeldet' : 'Abgemeldet'}
          </Typography>
          {me && (
            <>
              <Typography variant="body2">
                <b>Name:</b> {me.name ?? '—'}
              </Typography>
              <Typography variant="body2">
                <b>E‑Mail:</b> {me.email ?? '—'}
              </Typography>
              <Typography variant="body2">
                <b>Rollen:</b> {me.roles?.join(', ') ?? '—'}
              </Typography>
            </>
          )}
        </Stack>
      </CardContent>
      <CardActions>
        {!me ? (
          <Button onClick={handleLogin} variant="contained" disabled={loading}>
            Mit Keycloak anmelden
          </Button>
        ) : (
          <Button onClick={handleLogout} variant="outlined" color="error">
            Logout
          </Button>
        )}
        <Button onClick={fetchMe} variant="text">
          Aktualisieren
        </Button>
      </CardActions>
    </Card>
  );
}
