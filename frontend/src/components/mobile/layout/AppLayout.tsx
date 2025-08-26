// /web/src/components/AppShell.tsx
'use client';

import BadgeIcon from '@mui/icons-material/Badge';
import EventIcon from '@mui/icons-material/Event';
import HomeIcon from '@mui/icons-material/Home';
import QrCodeScannerIcon from '@mui/icons-material/QrCodeScanner';
import SecurityIcon from '@mui/icons-material/Security';
import {
  AppBar,
  BottomNavigation,
  BottomNavigationAction,
  Box,
  Container,
  Paper,
  Toolbar,
  Typography,
} from '@mui/material';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import * as React from 'react';

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [tab, setTab] = React.useState(0);

  React.useEffect(() => {
    // index aus Pfad ableiten
    let next = 0;
    if (pathname?.startsWith('/scan')) next = 1;
    else if (pathname?.startsWith('/security')) next = 2;
    else if (pathname?.startsWith('/my-qr')) next = 3;
    else if (pathname?.startsWith('/event')) next = 4;
    // Guard, um unnötige setState-Aufrufe zu vermeiden
    if (next !== tab) setTab(next);
  }, [pathname, tab]);

  const handleChange = (_: any, newValue: number) => {
    // Wichtig: hier NICHT noch einmal setTab aufrufen.
    if (newValue === 0) router.push('/');
    if (newValue === 1) router.push('/scan');
    if (newValue === 2) router.push('/security');
    if (newValue === 3) router.push('/my-qr');
    if (newValue === 4) router.push('/event');
  };

  return (
    <Box
      sx={{
        minHeight: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        bgcolor: 'background.default',
      }}
    >
      <AppBar
        position="static"
        elevation={0}
        color="transparent"
        sx={{ backdropFilter: 'blur(10px)' }}
      >
        <Toolbar sx={{ minHeight: 56 }}>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            <Link href="/" style={{ textDecoration: 'none', color: 'inherit' }}>
              Checkpoint
            </Link>
          </Typography>
          <Box sx={{ flex: 1 }} />
          <Link
            href="/login"
            style={{
              textDecoration: 'none',
              color: 'inherit',
              fontWeight: 600,
            }}
          >
            Login
          </Link>
        </Toolbar>
      </AppBar>

      <Container
        component="main"
        sx={{ flex: 1, width: '100%', maxWidth: 680, py: 2 }}
      >
        {children}
      </Container>

      <Paper
        elevation={3}
        sx={{
          position: 'sticky',
          bottom: 0,
          left: 0,
          right: 0,
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}
      >
        <BottomNavigation showLabels value={tab} onChange={handleChange}>
          <BottomNavigationAction label="Home" icon={<HomeIcon />} />
          <BottomNavigationAction
            label="Scannen"
            icon={<QrCodeScannerIcon />}
          />
          <BottomNavigationAction label="Security" icon={<SecurityIcon />} />
          <BottomNavigationAction label="Mein QR" icon={<BadgeIcon />} />
          <BottomNavigationAction label="Events" icon={<EventIcon />} />
        </BottomNavigation>
      </Paper>
    </Box>
  );
}
