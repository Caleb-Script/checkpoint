'use client';

import Brightness4RoundedIcon from '@mui/icons-material/Brightness4Rounded';
import Brightness7RoundedIcon from '@mui/icons-material/Brightness7Rounded';
import LoginRoundedIcon from '@mui/icons-material/LoginRounded';
import LogoutRoundedIcon from '@mui/icons-material/LogoutRounded';
import MenuIcon from '@mui/icons-material/Menu';
import SensorsRoundedIcon from '@mui/icons-material/SensorsRounded';
import {
  AppBar,
  Avatar,
  Chip,
  Divider,
  IconButton,
  Menu,
  MenuItem,
  Toolbar,
  Tooltip,
  Typography,
} from '@mui/material';
import Link from 'next/link';
import * as React from 'react';
import LogoutButton from '../LogoutButton';

export type AppTopBarProps = {
  title?: string;
  subtitle?: string;
  mode: 'light' | 'dark';
  onToggleTheme: () => void;
  onOpenNav: () => void; // öffnet mobile Drawer
  isAuthenticated: boolean;
  user?: { name?: string | null; email?: string | null };
  live?: boolean;
  liveCount?: number | null;
  onLoginRoute: () => void;
  onLogout: () => void;
};

export function AppTopBar({
  title = 'Checkpoint',
  subtitle,
  mode,
  onToggleTheme,
  onOpenNav,
  isAuthenticated,
  user,
  live,
  liveCount,
  onLoginRoute,
  onLogout,
}: AppTopBarProps) {
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  const initials =
    (user?.name
      ?.split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase() ||
      user?.email?.[0]?.toUpperCase() ||
      'U') + '';

  return (
    <AppBar
      position="fixed"
      color="transparent"
      elevation={0}
      sx={{
        backgroundColor:
          mode === 'light' ? 'rgba(255,255,255,0.7)' : 'rgba(18,18,18,0.6)',
        backdropFilter: 'saturate(180%) blur(20px)',
        WebkitBackdropFilter: 'saturate(180%) blur(20px)',
        borderBottom: 'none',
        boxShadow: 'none',
      }}
    >
      <Toolbar sx={{ gap: 1 }}>
        {/* Mobile: Burger */}
        <IconButton
          edge="start"
          aria-label="menu"
          onClick={onOpenNav}
          sx={{ display: { md: 'none' } }}
        >
          <MenuIcon />
        </IconButton>

        <Typography variant="h6" sx={{ fontWeight: 700, flexGrow: 1 }}>
          {title}
        </Typography>

        {/* Optional: Subtitle (klein, nur Desktop) */}
        {subtitle && (
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ mr: 1, display: { xs: 'none', md: 'block' } }}
          >
            {subtitle}
          </Typography>
        )}

        {/* Live-Status */}
        {isAuthenticated && (
          <Chip
            size="small"
            variant="outlined"
            color={live ? 'success' : 'default'}
            icon={<SensorsRoundedIcon />}
            label={
              live
                ? liveCount != null
                  ? `Live · ${liveCount}`
                  : 'Live'
                : 'Offline'
            }
            sx={{ mr: 1 }}
          />
        )}

        {/* Theme Toggle */}
        <Tooltip title={mode === 'light' ? 'Dark Mode' : 'Light Mode'}>
          <IconButton onClick={onToggleTheme}>
            {mode === 'light' ? (
              <Brightness4RoundedIcon />
            ) : (
              <Brightness7RoundedIcon />
            )}
          </IconButton>
        </Tooltip>

        {/* User / Login */}
        {isAuthenticated ? (
          <>
            <IconButton onClick={(e) => setAnchorEl(e.currentTarget)}>
              <Avatar sx={{ width: 28, height: 28 }}>{initials}</Avatar>
            </IconButton>
            <Menu
              anchorEl={anchorEl}
              open={open}
              onClose={() => setAnchorEl(null)}
            >
              <MenuItem disabled>
                <div style={{ display: 'grid' }}>
                  <Typography fontWeight={700}>
                    {user?.name ?? 'Nutzer'}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {user?.email ?? '-'}
                  </Typography>
                </div>
              </MenuItem>
              <Divider />
              <MenuItem component={Link} href="/my-qr">
                Mein QR
              </MenuItem>
              <MenuItem component={Link} href="/settings">
                Einstellungen
              </MenuItem>
              <Divider />
              <MenuItem
                onClick={() => {
                  setAnchorEl(null);
                  onLogout();
                }}
              >
                <LogoutRoundedIcon fontSize="small" style={{ marginRight: 8 }} />
                Logout
              </MenuItem>
            </Menu>
          </>
        ) : (
          <LogoutButton/>
        )}
      </Toolbar>
    </AppBar>
  );
}
