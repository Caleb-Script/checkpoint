'use client';

import LoginRoundedIcon from '@mui/icons-material/LoginRounded';
import {
  Box,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Tooltip,
  useMediaQuery,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import Link from 'next/link';
import * as React from 'react';
import LogoutButton from '../../LogoutButton';

export const DRAWER_WIDTH = 240;

export type NavItem = {
  label: string;
  href: string;
  icon: React.ReactNode;
  roles?: string[]; // sichtbar nur mit einer dieser Rollen
};

export type SideNavProps = {
  open: boolean; // mobile Drawer open?
  onClose: () => void; // mobile Drawer schließen
  pathname: string; // aktuelle Route
  items: NavItem[]; // alle möglichen Items
  isAuthenticated: boolean;
  roles: string[];
  onLoginRoute: () => void;
  onLogout: () => void;
};

export function SideNav({
  open,
  onClose,
  pathname,
  items,
  isAuthenticated,
  roles,
  onLoginRoute,
  onLogout,
}: SideNavProps) {
  const theme = useTheme();
  const isMdUp = useMediaQuery(theme.breakpoints.up('md'));

  // Filter nach Rollen
  const visibleItems = React.useMemo(() => {
    if (!isAuthenticated) return items.filter((i) => !i.roles);
    const set = new Set(roles);
    return items.filter((i) => !i.roles || i.roles.some((r) => set.has(r)));
  }, [isAuthenticated, roles, items]);

  const Content = (
    <Box role="presentation" sx={{ width: DRAWER_WIDTH }}>
      <Box sx={{ px: 2, py: 2 }}>
        <strong>Checkpoint</strong>
        <div style={{ fontSize: 12, color: theme.palette.text.secondary }}>
          Gäste · QR · Security
        </div>
      </Box>
      <Divider sx={{ display: 'none' }} />
      <List>
        {visibleItems.map((item) => {
          const selected =
            pathname === item.href ||
            (item.href !== '/' && pathname?.startsWith(item.href + '/'));
          return (
            <ListItemButton
              key={item.href}
              component={Link}
              href={item.href}
              selected={!!selected}
              sx={{ borderRadius: 2, mx: 1, my: 0.5 }}
              onClick={!isMdUp ? onClose : undefined}
            >
              <ListItemIcon sx={{ minWidth: 40 }}>{item.icon}</ListItemIcon>
              <ListItemText primary={item.label} />
            </ListItemButton>
          );
        })}
      </List>
      <Box sx={{ p: 1.5, display: 'flex', gap: 1 }}>
        {!isAuthenticated ? (
          <Tooltip title="Einloggen">
            <IconButton color="primary" onClick={onLoginRoute}>
              <LoginRoundedIcon />
            </IconButton>
          </Tooltip>
        ) : (
          <LogoutButton />
        )}
      </Box>
    </Box>
  );

  // Desktop: permanent, Mobile: temporary
  return isMdUp ? (
    <Drawer
      variant="permanent"
      open
      sx={{
        width: DRAWER_WIDTH,
        flexShrink: 0,
        [`& .MuiDrawer-paper`]: {
          width: DRAWER_WIDTH,
          boxSizing: 'border-box',
          borderRight: 'none',
          backgroundColor:
            theme.palette.mode === 'light'
              ? 'rgba(255,255,255,0.55)'
              : 'rgba(18,18,18,0.5)',
          backdropFilter: 'saturate(180%) blur(20px)',
        },
      }}
    >
      <Toolbar />
      {Content}
    </Drawer>
  ) : (
    <Drawer
      variant="temporary"
      open={open}
      onClose={onClose}
      ModalProps={{ keepMounted: true }}
      sx={{
        [`& .MuiDrawer-paper`]: {
          width: DRAWER_WIDTH,
          boxSizing: 'border-box',
          borderRight: 'none',
        },
      }}
    >
      <Toolbar />
      {Content}
    </Drawer>
  );
}
