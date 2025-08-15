// src/app/forbidden/page.tsx
import { cookies } from 'next/headers';
import * as jose from 'jose';
import Link from 'next/link';

// MUI
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Chip from '@mui/material/Chip';

function getCookieName() {
  return process.env.NEXT_PUBLIC_ACCESS_COOKIE_NAME ?? 'kc_access_token';
}

export default async function ForbiddenPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(getCookieName())?.value;

  let displayName = 'Nutzer';
  let roles: string[] = [];

  if (token) {
    try {
      const payload = jose.decodeJwt(token) as any;
      displayName =
        payload?.name ??
        payload?.preferred_username ??
        payload?.email ??
        'Nutzer';
      roles = payload?.realm_access?.roles ?? [];
    } catch {
      // Falls Decoding fehlschlägt, zeigen wir einfach den generischen Text
    }
  }

  return (
    <Box
      sx={{
        minHeight: '100dvh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'background.default',
        p: 3,
      }}
    >
      <Card
        sx={{
          width: '100%',
          maxWidth: 640,
          borderRadius: 4,
          boxShadow: 6,
        }}
      >
        <CardContent>
          <Stack spacing={2}>
            <Typography variant="h5" fontWeight={700}>
              Zugriff verweigert
            </Typography>
    
            <Typography variant="body1" color="text.secondary">
              Hi <strong>{displayName}</strong>, du bist angemeldet, hast aber
              keine Berechtigung, diese Seite zu sehen.
            </Typography>
    
            {roles.length > 0 && (
              <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                {roles.map((r) => (
                  <Chip key={r} label={r} size="small" />
                ))}
              </Stack>
            )}
    
            <Stack direction="row" spacing={1} sx={{ pt: 1 }}>
              <Button component={Link} href="/" variant="contained">
                Zur Startseite
              </Button>
              <Button component={Link} href="/dashboard" variant="outlined">
                Zum Dashboard
              </Button>
            </Stack>
    
            <Typography variant="caption" color="text.secondary" sx={{ pt: 1 }}>
              Falls du glaubst, dass das ein Fehler ist, kontaktiere bitte eine*n
              Administrator*in oder probiere es später erneut.
            </Typography>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
}    
