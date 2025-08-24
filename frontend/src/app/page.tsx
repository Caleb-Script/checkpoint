import { Box, Button, Grid, Paper, Stack, Typography } from '@mui/material';
import Link from 'next/link';

export default function Page() {
  return (
    <Box>
      <Typography variant="h4" sx={{ fontWeight: 800, mb: 2 }}>
        Willkommen 👋
      </Typography>
      <Typography sx={{ color: 'text.secondary', mb: 3 }}>
        Einladungen, RSVP, QR‑Tickets & Security‑Scan – alles mobilfreundlich.
        Wähle deinen Bereich:
      </Typography>

      <Grid container spacing={2}>
        <Grid item xs={12}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              👤 Gast
            </Typography>
            <Typography sx={{ color: 'text.secondary', mb: 2 }}>
              RSVP beantworten, Ticket abrufen, Plus‑Ones einladen.
            </Typography>
            <Stack direction="row" spacing={1}>
              <Button LinkComponent={Link} href="/rsvp" variant="contained">
                RSVP
              </Button>
              <Button LinkComponent={Link} href="/my-qr" variant="outlined">
                Mein QR
              </Button>
              <Button LinkComponent={Link} href="/invite" variant="text">
                Plus‑One
              </Button>
            </Stack>
          </Paper>
        </Grid>

        <Grid item xs={12}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              🛡️ Security
            </Typography>
            <Typography sx={{ color: 'text.secondary', mb: 2 }}>
              Schnell scannen, Einlass/Auslass buchen, Live‑Status.
            </Typography>
            <Stack direction="row" spacing={1}>
              <Button LinkComponent={Link} href="/scan" variant="contained">
                Scanner
              </Button>
              <Button LinkComponent={Link} href="/security" variant="outlined">
                Dashboard
              </Button>
            </Stack>
          </Paper>
        </Grid>

        <Grid item xs={12}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              👨‍💼 Admin
            </Typography>
            <Typography sx={{ color: 'text.secondary', mb: 2 }}>
              Einladungen verwalten, Approven, Tickets versenden.
            </Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              <Button
                LinkComponent={Link}
                href="/invitations"
                variant="contained"
              >
                Einladungen
              </Button>
              <Button
                LinkComponent={Link}
                href="/invitations/approve"
                variant="outlined"
              >
                Approve
              </Button>
              <Button
                LinkComponent={Link}
                href="/invitations/responses"
                variant="outlined"
              >
                Responses
              </Button>
              <Button LinkComponent={Link} href="/tickets/send" variant="text">
                Tickets senden
              </Button>
              <Button LinkComponent={Link} href="/qr" variant="text">
                QR Übersicht
              </Button>
            </Stack>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}
