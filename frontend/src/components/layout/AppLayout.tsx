// src/components/AppLayout.tsx
'use client';
import { Box, useMediaQuery } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { usePathname, useRouter } from 'next/navigation';
import * as React from 'react';
import { AppTopBar } from './AppTopbar';
import { NavItem, SideNav } from './SideNav';

// Icons
import BadgeRoundedIcon from '@mui/icons-material/BadgeRounded';
import CameraAltRoundedIcon from '@mui/icons-material/CameraAltRounded';
import ConfirmationNumberOutlinedIcon from '@mui/icons-material/ConfirmationNumberOutlined';
import EventRoundedIcon from '@mui/icons-material/EventRounded';
import EventSeatRoundedIcon from '@mui/icons-material/EventSeatRounded';
import GroupRoundedIcon from '@mui/icons-material/GroupRounded';
import HomeRoundedIcon from '@mui/icons-material/HomeRounded';
import MailRoundedIcon from '@mui/icons-material/MailRounded';
import QrCode2RoundedIcon from '@mui/icons-material/QrCode2Rounded';
import SendRoundedIcon from '@mui/icons-material/SendRounded';
import ShieldRoundedIcon from '@mui/icons-material/ShieldRounded';
import TableViewRoundedIcon from '@mui/icons-material/TableViewRounded';
import { useAuth } from '../../context/AuthContext';
import getApolloClient from '../../lib/apolloClient';

const NAV_ITEMS: NavItem[] = [
  { label: 'Home', href: '/', icon: <HomeRoundedIcon /> },
  { label: 'Mein QR', href: '/my-qr', icon: <QrCode2RoundedIcon /> },
  { label: 'QR (Demo)', href: '/qr', icon: <BadgeRoundedIcon /> },
  {
    label: 'Ticket öffnen',
    href: '/ticket',
    icon: <ConfirmationNumberOutlinedIcon />,
  },
  {
    label: 'Scanner',
    href: '/scan',
    icon: <CameraAltRoundedIcon />,
    roles: ['security', 'admin'],
  },
  {
    label: 'Security',
    href: '/security',
    icon: <ShieldRoundedIcon />,
    roles: ['security', 'admin'],
  },
  {
    label: 'Einladungen (CSV)',
    href: '/invitations',
    icon: <MailRoundedIcon />,
    roles: ['security', 'admin'],
  },
  {
    label: 'RSVP Freigabe & Versand',
    href: '/invitations/responses',
    icon: <SendRoundedIcon />,
    roles: ['security', 'admin'],
  },
  {
    label: 'Freigegebene (Client)',
    href: '/invitations/responses/client',
    icon: <TableViewRoundedIcon />,
    roles: ['security', 'admin'],
  },
  {
    label: 'Gäste',
    href: '/guests',
    icon: <GroupRoundedIcon />,
    roles: ['admin'],
  },
  {
    label: 'Sitzplätze',
    href: '/seats',
    icon: <EventSeatRoundedIcon />,
    roles: ['admin'],
  },
  {
    label: 'Events',
    href: '/events',
    icon: <EventRoundedIcon />,
    roles: ['admin'],
  },
];

const DRAWER_WIDTH = 240;

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, user, logout } = useAuth();
  const theme = useTheme();
  const router = useRouter();
  const pathname = usePathname() || '/';
  const isMdUp = useMediaQuery(theme.breakpoints.up('md'));
  const [navOpen, setNavOpen] = React.useState(false);

  const client = getApolloClient(undefined);

  const toggleColorMode = () => (window as any).toggleColorMode?.();

  // optional: Live-Badges etc.
  const live = isAuthenticated;
  const liveCount = null;

  return (
    <Box sx={{ display: 'flex', minHeight: '100dvh' }}>
      <AppTopBar
        title="Checkpoint"
        mode={theme.palette.mode}
        onToggleTheme={toggleColorMode}
        onOpenNav={() => setNavOpen(true)}
        isAuthenticated={isAuthenticated}
        user={user ?? undefined}
        live={live}
        liveCount={liveCount}
        onLoginRoute={() => router.push('/login')}
        onLogout={() => logout()}
      />

      <SideNav
        open={navOpen}
        onClose={() => setNavOpen(false)}
        pathname={pathname}
        items={NAV_ITEMS}
        isAuthenticated={isAuthenticated}
        roles={user?.roles || []}
        onLoginRoute={() => router.push('/login')}
        onLogout={() => logout()}
        
      />

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          px: { xs: 1.5, sm: 2 },
          pb: { xs: 8, md: 4 },
          ml: { md: `${DRAWER_WIDTH}px` },
          maxWidth: 1200,
          width: '100%',
          mx: 'auto',
          pt: { xs: 9, md: 10 },
        }}
      >
        {children}
      </Box>
    </Box>
  );
}
