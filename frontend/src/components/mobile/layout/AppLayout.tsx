// /web/src/components/mobile/layout/AppLayout.tsx
'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import * as React from 'react';

import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import BadgeIcon from '@mui/icons-material/Badge';
import GroupsIcon from '@mui/icons-material/Groups';
import HomeIcon from '@mui/icons-material/Home';
import LogoutIcon from '@mui/icons-material/Logout';
import QrCodeScannerIcon from '@mui/icons-material/QrCodeScanner';
import SecurityIcon from '@mui/icons-material/Security';

import {
  AppBar,
  Avatar,
  BottomNavigation,
  BottomNavigationAction,
  Box,
  Container,
  Divider,
  IconButton,
  ListItemIcon,
  Menu,
  MenuItem,
  Paper,
  Toolbar,
  Tooltip,
  Typography,
  useTheme,
} from '@mui/material';

import { useAuth } from '@/context/AuthContext';
import type { KeycloakUserInfo } from '../../../types/auth/auth.type';

type Role = 'ADMIN' | 'SECURITY' | 'GUEST';

type NavItem = {
  label: string;
  href: string;
  icon: React.ReactNode;
};

/**
 * Rollen aus dem User extrahieren (case-insensitive).
 * Falls keine Rolle vorhanden, behandeln wir den eingeloggten User als 'GUEST'.
 */
function extractRoles(user: KeycloakUserInfo | null): Role[] {
  if (!user) return [];
  const raw = Array.isArray(user.roles) ? user.roles : [];
  const set = new Set(raw.map((r) => String(r).toUpperCase()));

  const roles: Role[] = [];
  if (set.has('ADMIN')) roles.push('ADMIN');
  if (set.has('SECURITY')) roles.push('SECURITY');

  // eingeloggte Nutzer ohne explizite Rolle -> GUEST
  if (roles.length === 0) roles.push('GUEST');
  return roles;
}

/**
 * Nav strikt nach Rollen bauen.
 * Wichtig: '/my-qr' immer enthalten (für alle Rollen).
 * Admin sieht nur /admin-Pfade, Security nur Security-Pfade, Guests nur Gästepfade.
 */
function buildNavForRoles(roles: Role[]): NavItem[] {
  const common: NavItem[] = [
    // { label: 'Mein QR', href: '/my-qr', icon: <BadgeIcon /> },
    { label: 'Home', href: '/', icon: <HomeIcon /> },
  ];

  const guestOnly: NavItem[] = [
    { label: 'Plus-Ones', href: '/my-plus-ones', icon: <GroupsIcon /> },
    { label: 'Mein QR', href: '/my-qr', icon: <BadgeIcon /> },
    // Optional: eigene Einladungen, falls vorhanden
    // { label: 'Meine Einladungen', href: '/my-invitations', icon: <ListAltIcon /> },
  ];

  const securityOnly: NavItem[] = [
    { label: 'Scannen', href: '/scan', icon: <QrCodeScannerIcon /> },
    { label: 'Security', href: '/security', icon: <SecurityIcon /> },
    { label: 'Mein QR', href: '/my-qr', icon: <BadgeIcon /> },
  ];

  const adminOnly: NavItem[] = [
    { label: 'Admin', href: '/admin', icon: <AdminPanelSettingsIcon /> },
    // { label: 'Events', href: '/admin/event', icon: <EventIcon /> },
    // { label: 'Einladungen', href: '/admin/invitations', icon: <ListAltIcon /> },
    // {
    //   label: 'Tickets',
    //   href: '/admin/tickets',
    //   icon: <ConfirmationNumberIcon />,
    // },
    // { label: 'Gäste', href: '/admin/guests', icon: <GroupsIcon /> },
    { label: 'Mein QR', href: '/my-qr', icon: <BadgeIcon /> },
  ];

  const items: NavItem[] = [...common];

  if (roles.includes('ADMIN')) {
    items.push(...adminOnly);
  } else if (roles.includes('SECURITY')) {
    items.push(...securityOnly);
  } else if (roles.includes('GUEST')) {
    // GUEST
    items.push(...guestOnly);
  } else {
  }

  // Sortierung in sinnvoller Reihenfolge für Mobile
  const order = [
    '/my-qr',
    '/my-plus-ones',
    '/my-invitations',
    '/scan',
    '/security',
    '/admin',
    '/admin/event',
    '/admin/invitations',
    '/admin/tickets',
    '/admin/guests',
  ];

  return items.sort((a, b) => order.indexOf(a.href) - order.indexOf(b.href));
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const theme = useTheme();
  const pathname = usePathname();
  const router = useRouter();

  const { user, isAuthenticated, logout } = useAuth();
  const roles = React.useMemo(() => extractRoles(user), [user]);
  const navItems = React.useMemo(() => buildNavForRoles(roles), [roles]);

  // Aktiver Tab (anhand Präfix-Match)
  const currentIndex = React.useMemo(() => {
    const idx = navItems.findIndex(
      (it) => pathname === it.href || pathname?.startsWith(it.href + '/'),
    );
    return idx >= 0 ? idx : 0;
  }, [pathname, navItems]);

  const handleNavChange = (_event: React.SyntheticEvent, newIndex: number) => {
    const target = navItems[newIndex];
    if (target) router.push(target.href);
  };

  // Avatar-Menü
  const [anchorEl, setAnchorEl] = React.useState<HTMLElement | null>(null);
  const open = Boolean(anchorEl);
  const onAvatarClick = (e: React.MouseEvent<HTMLElement>) =>
    setAnchorEl(e.currentTarget);
  const closeMenu = () => setAnchorEl(null);

  const goto = (href: string) => {
    closeMenu();
    router.push(href);
  };

  const doLogout = async () => {
    closeMenu();
    await logout();
    router.push('/login');
  };

  const initials = (
    user?.name?.trim()?.[0] ??
    user?.email?.trim()?.[0] ??
    'U'
  ).toUpperCase();

  // Höhe der BottomNav (≈ 56–72px) → damit Content nicht verdeckt wird
  const BOTTOM_NAV_H = 72;

  return (
    <Box
      sx={{
        minHeight: '100svh',
        display: 'flex',
        flexDirection: 'column',
        bgcolor: 'background.default',
        overscrollBehaviorY: 'contain',
      }}
    >
      <AppBar
        position="sticky"
        elevation={0}
        color="transparent"
        sx={{
          backdropFilter: 'blur(10px)',
          borderBottom: `1px solid ${theme.palette.divider}`,
        }}
      >
        <Toolbar sx={{ minHeight: 56 }}>
          <Typography variant="h6" sx={{ fontWeight: 800, letterSpacing: 0.2 }}>
            <Link
              href="/my-qr"
              style={{ textDecoration: 'none', color: 'inherit' }}
            >
              Checkpoint
            </Link>
          </Typography>

          <Box sx={{ flex: 1 }} />

          {isAuthenticated ? (
            <>
              <Tooltip title={user?.name || user?.email || 'Profil'}>
                <IconButton onClick={onAvatarClick} size="small" sx={{ ml: 1 }}>
                  <Avatar sx={{ width: 32, height: 32 }}>{initials}</Avatar>
                </IconButton>
              </Tooltip>

              <Menu
                anchorEl={anchorEl}
                id="account-menu"
                open={open}
                onClose={closeMenu}
                transformOrigin={{ horizontal: 'right', vertical: 'top' }}
                anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
              >
                <MenuItem onClick={() => goto('/profile')}>
                  <ListItemIcon>
                    <AccountCircleIcon fontSize="small" />
                  </ListItemIcon>
                  Profil & Einstellungen
                </MenuItem>

                <MenuItem onClick={() => goto('/my-qr')}>
                  <ListItemIcon>
                    <BadgeIcon fontSize="small" />
                  </ListItemIcon>
                  Mein QR / Ticket
                </MenuItem>

                {/* GUEST-spezifische Self-Service Seite */}
                {roles.includes('GUEST') && (
                  <MenuItem onClick={() => goto('/my-plus-ones')}>
                    <ListItemIcon>
                      <GroupsIcon fontSize="small" />
                    </ListItemIcon>
                    Plus-Ones verwalten
                  </MenuItem>
                )}

                {/* Security Schnellzugriff nur sichtbar, wenn Rolle vorhanden */}
                {roles.includes('SECURITY') && (
                  <MenuItem onClick={() => goto('/scan')}>
                    <ListItemIcon>
                      <QrCodeScannerIcon fontSize="small" />
                    </ListItemIcon>
                    Scanner öffnen
                  </MenuItem>
                )}

                {/* Admin Konsole nur für Admin */}
                {roles.includes('ADMIN') && (
                  <MenuItem onClick={() => goto('/admin')}>
                    <ListItemIcon>
                      <AdminPanelSettingsIcon fontSize="small" />
                    </ListItemIcon>
                    Admin-Konsole
                  </MenuItem>
                )}

                <Divider />

                <MenuItem onClick={doLogout}>
                  <ListItemIcon>
                    <LogoutIcon fontSize="small" />
                  </ListItemIcon>
                  Logout
                </MenuItem>
              </Menu>
            </>
          ) : (
            <Link
              href="/login"
              style={{
                textDecoration: 'none',
                color: 'inherit',
                fontWeight: 700,
              }}
            >
              Login
            </Link>
          )}
        </Toolbar>
      </AppBar>

      {/* Main Content */}
      <Container
        component="main"
        sx={{
          flex: 1,
          width: '100%',
          maxWidth: 640,
          px: 2,
          pt: 2,
          pb: `calc(${BOTTOM_NAV_H}px + env(safe-area-inset-bottom))`,
        }}
      >
        {children}
      </Container>

      {/* Bottom Nav */}
      <Paper
        elevation={3}
        square
        sx={{
          position: 'fixed',
          left: 0,
          right: 0,
          bottom: 0,
          borderTopLeftRadius: 16,
          borderTopRightRadius: 16,
          pb: 'env(safe-area-inset-bottom)',
        }}
      >
        <BottomNavigation
          showLabels
          value={currentIndex}
          onChange={handleNavChange}
          sx={{ '& .Mui-selected': { fontWeight: 700 } }}
        >
          {navItems.map((it) => (
            <BottomNavigationAction
              key={it.href}
              label={it.label}
              icon={it.icon}
            />
          ))}
        </BottomNavigation>
      </Paper>
    </Box>
  );
}
