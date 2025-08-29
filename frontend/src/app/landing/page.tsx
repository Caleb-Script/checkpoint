// /Users/gentlebookpro/Projekte/checkpoint/frontend/srv/app/page.tsx
'use client';

import {
  Box,
  Button,
  Container,
  Divider,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import Link from 'next/link';

export default function LandingPage() {
  return (
    <Box
      sx={{
        minHeight: '100svh',
        bgcolor: 'background.default',
        display: 'flex',
        alignItems: 'center',
      }}
    >
      <Container maxWidth="sm">
        <Stack spacing={4} alignItems="center" textAlign="center">
          <Typography variant="h3" fontWeight={700} letterSpacing={0.2}>
            Checkpoint
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Einlass einfach & sicher: Einladungen, QR‑Tickets und Live‑Status.
            Mobile‑first im Apple‑Look.
          </Typography>

          <Paper elevation={3} sx={{ p: 3, borderRadius: 3, width: '100%' }}>
            <Stack spacing={2}>
              <Typography variant="subtitle1" fontWeight={600}>
                Ich bin eingeladen
              </Typography>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                <Button
                  component={Link}
                  href="/rsvp"
                  size="large"
                  fullWidth
                  variant="contained"
                >
                  Einladung öffnen (RSVP)
                </Button>
                <Button
                  component={Link}
                  href="/my-qr"
                  size="large"
                  fullWidth
                  variant="outlined"
                >
                  Mein QR‑Ticket
                </Button>
              </Stack>
            </Stack>
          </Paper>

          <Paper elevation={1} sx={{ p: 3, borderRadius: 3, width: '100%' }}>
            <Stack spacing={2}>
              <Typography variant="subtitle1" fontWeight={600}>
                Login
              </Typography>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                <Button
                  component={Link}
                  href="/login"
                  size="large"
                  fullWidth
                  variant="contained"
                >
                  Login (Admin / Security)
                </Button>
              </Stack>
            </Stack>
          </Paper>

          <Divider flexItem />

          <Stack spacing={1} alignItems="center">
            <Typography variant="caption" color="text.secondary">
              Schnelleinstieg für Team
            </Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
              <Button component={Link} href="/scan" variant="text">
                Zur Scanner‑Ansicht
              </Button>
              <Button component={Link} href="/security" variant="text">
                Security‑Dashboard
              </Button>
              <Button component={Link} href="/invitations" variant="text">
                Einladungen
              </Button>
            </Stack>
          </Stack>
        </Stack>
      </Container>
    </Box>
  );
}
