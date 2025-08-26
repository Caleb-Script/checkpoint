// /web/src/app/profile/page.tsx
'use client';

import {
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  Chip,
  Divider,
  Grid,
  IconButton,
  List,
  ListItem,
  ListItemText,
  Skeleton,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import * as React from 'react';

import AlternateEmailIcon from '@mui/icons-material/AlternateEmail';
import BadgeIcon from '@mui/icons-material/Badge';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import LogoutIcon from '@mui/icons-material/Logout';
import PersonIcon from '@mui/icons-material/Person';
import QrCode2Icon from '@mui/icons-material/QrCode2';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';

import { useAuth } from '../../context/AuthContext';
import { copyToClipboard } from '../../lib/link';

type Role = 'ADMIN' | 'SECURITY' | 'GUEST' | string;

function initials(name?: string, username?: string): string {
  const src = (name || username || '').trim();
  if (!src) return '👤';
  const parts = src.split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function roleColor(role: Role): 'default' | 'success' | 'warning' | 'info' {
  const up = String(role).toUpperCase();
  if (up === 'ADMIN') return 'success';
  if (up === 'SECURITY') return 'warning';
  if (up === 'GUEST') return 'info';
  return 'default';
}

export default function ProfilePage(): JSX.Element {
  const router = useRouter();
  const { user, loading: authLoading, isAuthenticated, logout } = useAuth();

  const [copiedMsg, setCopiedMsg] = React.useState<string | null>(null);

  async function copy(text: string, label: string) {
    const ok = await copyToClipboard(text);
    setCopiedMsg(ok ? `${label} kopiert.` : `Konnte ${label} nicht kopieren.`);
    window.setTimeout(() => setCopiedMsg(null), 2000);
  }

  // Wenn du die Seite nur authentifiziert zulassen willst, schütze sie zusätzlich in der Middleware:
  // RULES → { prefix: '/profile' }
  if (authLoading) {
    return (
      <Stack spacing={2}>
        <Card variant="outlined">
          <CardHeader title="Profil" />
          <CardContent>
            <Stack
              direction="row"
              spacing={2}
              alignItems="center"
              sx={{ mb: 2 }}
            >
              <Skeleton variant="circular" width={64} height={64} />
              <Box>
                <Skeleton width={160} />
                <Skeleton width={120} />
              </Box>
            </Stack>
            <Skeleton height={20} width="60%" />
            <Skeleton height={20} width="40%" />
            <Skeleton height={120} />
          </CardContent>
        </Card>
      </Stack>
    );
  }

  if (!isAuthenticated || !user) {
    return (
      <Stack spacing={2}>
        <Card
          variant="outlined"
          sx={{ borderRadius: 3, textAlign: 'center', p: 3 }}
        >
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5 }}>
            Nicht angemeldet
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Melde dich an, um dein Profil zu sehen.
          </Typography>
          <Button
            component={Link}
            href="/login"
            variant="contained"
            sx={{ borderRadius: 2 }}
          >
            Zum Login
          </Button>
        </Card>
      </Stack>
    );
  }

  const {
    sub,
    username,
    name,
    givenName,
    familyName,
    email,
    roles,
    invitationId,
    ticketId,
  } = user;

  const fullName =
    name ||
    [givenName, familyName].filter(Boolean).join(' ') ||
    username ||
    'Unbekannt';
  const tickets = Array.isArray(ticketId) ? ticketId : [];
  const primaryRole = roles?.[0];

  return (
    <Stack spacing={2} sx={{ pb: 1 }}>
      {/* Header Card */}
      <Card variant="outlined" sx={{ overflow: 'hidden' }}>
        <CardHeader
          titleTypographyProps={{ variant: 'h5', sx: { fontWeight: 800 } }}
          title="Profil"
          action={
            <Tooltip title="Abmelden">
              <span>
                <IconButton
                  aria-label="logout"
                  onClick={() => {
                    // Optional: returnTo setzen, z. B. Startseite
                    logout?.();
                  }}
                >
                  <LogoutIcon />
                </IconButton>
              </span>
            </Tooltip>
          }
        />
        <CardContent>
          {/* Avatar + Name */}
          <Stack direction="row" spacing={2} alignItems="center">
            <Avatar sx={{ width: 64, height: 64, fontWeight: 700 }}>
              {initials(fullName, username)}
            </Avatar>
            <Box>
              <Stack
                direction="row"
                spacing={1}
                alignItems="center"
                flexWrap="wrap"
              >
                <Typography variant="h6" sx={{ fontWeight: 800 }}>
                  {fullName}
                </Typography>
                {primaryRole && (
                  <Chip
                    size="small"
                    color={roleColor(primaryRole)}
                    label={primaryRole}
                    icon={<VerifiedUserIcon fontSize="small" />}
                  />
                )}
              </Stack>
              {username && (
                <Stack direction="row" spacing={0.75} alignItems="center">
                  <AlternateEmailIcon fontSize="small" />
                  <Typography variant="body2" color="text.secondary">
                    {username}
                  </Typography>
                </Stack>
              )}
            </Box>
          </Stack>

          {/* Basisdaten */}
          <Grid container spacing={1.25} sx={{ mt: 2 }}>
            {email && (
              <Grid item xs={12}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <BadgeIcon fontSize="small" />
                  <Typography variant="body2">
                    <b>E-Mail:</b> {email}
                  </Typography>
                  <Box sx={{ flex: 1 }} />
                  <Tooltip title="E-Mail kopieren">
                    <IconButton onClick={() => copy(email, 'E-Mail')}>
                      <ContentCopyIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Stack>
              </Grid>
            )}

            <Grid item xs={12}>
              <Stack direction="row" spacing={1} alignItems="center">
                <PersonIcon fontSize="small" />
                <Typography variant="body2">
                  <b>User ID (sub):</b> {sub}
                </Typography>
                <Box sx={{ flex: 1 }} />
                <Tooltip title="User ID kopieren">
                  <IconButton onClick={() => copy(sub, 'User ID')}>
                    <ContentCopyIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Stack>
            </Grid>

            {/* Rollen */}
            {Array.isArray(roles) && roles.length > 0 && (
              <Grid item xs={12}>
                <Typography variant="body2" sx={{ mb: 0.5 }}>
                  <b>Rollen</b>
                </Typography>
                <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                  {roles.map((r) => (
                    <Chip
                      key={r}
                      size="small"
                      label={r}
                      color={roleColor(r)}
                      variant="outlined"
                    />
                  ))}
                </Stack>
              </Grid>
            )}
          </Grid>

          {copiedMsg && (
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ display: 'block', mt: 1 }}
            >
              {copiedMsg}
            </Typography>
          )}

          <Divider sx={{ my: 2 }} />

          {/* Einladung & Tickets */}
          <Grid container spacing={1.25}>
            <Grid item xs={12}>
              <Typography variant="body2" sx={{ mb: 0.5 }}>
                <b>Einladung</b>
              </Typography>
              <Card variant="outlined" sx={{ borderRadius: 2 }}>
                <CardContent sx={{ py: 1 }}>
                  {invitationId ? (
                    <Stack direction="row" spacing={1} alignItems="center">
                      <List dense disablePadding sx={{ width: '100%' }}>
                        <ListItem
                          secondaryAction={
                            <Tooltip title="Invitation ID kopieren">
                              <IconButton
                                edge="end"
                                onClick={() =>
                                  copy(invitationId, 'Invitation ID')
                                }
                              >
                                <ContentCopyIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          }
                        >
                          <ListItemText
                            primary={invitationId}
                            secondary="Invitation ID"
                          />
                        </ListItem>
                      </List>
                    </Stack>
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      Keine Einladung verknüpft.
                    </Typography>
                  )}
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12}>
              <Typography variant="body2" sx={{ mb: 0.5 }}>
                <b>Tickets</b>
              </Typography>
              <Card variant="outlined" sx={{ borderRadius: 2 }}>
                <CardContent sx={{ py: 1 }}>
                  {tickets.length > 0 ? (
                    <List dense disablePadding>
                      {tickets.map((tid) => (
                        <ListItem
                          key={tid}
                          secondaryAction={
                            <Tooltip title="Ticket ID kopieren">
                              <IconButton
                                edge="end"
                                onClick={() => copy(tid, 'Ticket ID')}
                              >
                                <ContentCopyIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          }
                        >
                          <ListItemText primary={tid} secondary="Ticket ID" />
                        </ListItem>
                      ))}
                    </List>
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      Keine Tickets verknüpft.
                    </Typography>
                  )}
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Quick Actions */}
          <Stack
            direction="row"
            spacing={1}
            sx={{ mt: 2 }}
            useFlexGap
            flexWrap="wrap"
          >
            <Button
              component={Link}
              href="/my-qr"
              variant="contained"
              startIcon={<QrCode2Icon />}
              sx={{ borderRadius: 2 }}
            >
              Mein&nbsp;QR
            </Button>

            {/* Optional: weitere Self-Service Links (Plus-Ones verwalten etc.) */}
            {/* <Button component={Link} href="/profile/plus-ones" variant="outlined" sx={{ borderRadius: 2 }}>
              Plus-Ones verwalten
            </Button> */}

            <Box sx={{ flex: 1 }} />

            <Button
              variant="text"
              color="inherit"
              startIcon={<LogoutIcon />}
              onClick={() => logout?.()}
              sx={{ borderRadius: 2 }}
            >
              Abmelden
            </Button>
          </Stack>
        </CardContent>
      </Card>
    </Stack>
  );
}
