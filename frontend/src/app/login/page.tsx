'use client';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

import { useMutation } from '@apollo/client';
import LockRoundedIcon from '@mui/icons-material/LockRounded';
import LoginRoundedIcon from '@mui/icons-material/LoginRounded';
import PersonRoundedIcon from '@mui/icons-material/PersonRounded';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  IconButton,
  InputAdornment,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useRouter } from 'next/navigation';
import * as React from 'react';
import { useAuth } from '../../context/AuthContext';
import { LOGIN } from '../../graphql/auth/mutation';
import getApolloClient from '../../lib/apolloClient';
import { getLogger } from '../../utils/logger';

export default function LoginForm() {
  const logger = getLogger(LoginForm.name);

  const { refetchMe } = useAuth();
  const router = useRouter();

  // const params = useSearchParams();
  // const returnTo = params.get('returnTo') || '/';

  // returnTo wird manuell aus window.location gelesen
  const [returnTo, setReturnTo] = React.useState<string>('/');

  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      setReturnTo(params.get('returnTo') || '/');
    }
  }, []);

  const [username, setUsername] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [showPw, setShowPw] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const client = getApolloClient(undefined);

  const [doLogin, { loading }] = useMutation(LOGIN, {
    client,
    fetchPolicy: 'no-cache',
  });

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!username || !password)
      return setError('Bitte Benutzername und Passwort eingeben.');
    setError(null);
    try {
      const { data } = await doLogin({ variables: { username, password } });
      if (!data?.login)
        return setError(data?.login?.error || 'Anmeldung fehlgeschlagen.');
      refetchMe();
      router.push(returnTo);
    } catch (err) {
      logger.error(err);
      // bessere Fehlerdiagnose
      const anyErr = err as {
        message?: string;
        networkError?: unknown;
        graphQLErrors?: Array<{ message: string }>;
      };
      logger.error('[Login] ApolloError', {
        message: anyErr?.message,
        networkError: anyErr?.networkError,
        graphQLErrors: anyErr?.graphQLErrors,
        uri: process.env.NEXT_PUBLIC_GRAPHQL_URL,
        usingProxy: process.env.NEXT_PUBLIC_USE_GRAPHQL_PROXY === '1',
        origin: typeof window !== 'undefined' ? window.location.origin : 'ssr',
      });
      setError(anyErr?.message || 'Netzwerk-/Serverfehler.');
    }
  }

  return (
    <Box
      sx={{ minHeight: '100dvh', display: 'grid', placeItems: 'center', p: 2 }}
    >
      <Card
        sx={{ width: '100%', maxWidth: 420, borderRadius: 3, boxShadow: 6 }}
      >
        <CardContent sx={{ p: 4 }}>
          <Typography variant="h5" fontWeight={800} gutterBottom>
            Anmelden
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Willkommen bei Checkpoint
          </Typography>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          <form onSubmit={onSubmit}>
            <Stack spacing={2}>
              <TextField
                label="Benutzername oder E-Mail"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                fullWidth
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <PersonRoundedIcon />
                    </InputAdornment>
                  ),
                }}
              />
              <TextField
                label="Passwort"
                type={showPw ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                fullWidth
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <LockRoundedIcon />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => setShowPw((s) => !s)}
                        edge="end"
                      >
                        {showPw ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
              <Button
                type="submit"
                size="large"
                variant="contained"
                startIcon={<LoginRoundedIcon />}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <CircularProgress size={18} sx={{ mr: 1 }} /> Anmelden…
                  </>
                ) : (
                  'Anmelden'
                )}
              </Button>
            </Stack>
          </form>
        </CardContent>
      </Card>
    </Box>
  );
}
