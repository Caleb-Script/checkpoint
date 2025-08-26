// /web/src/app/admin/guests/page.tsx
'use client';

import { useQuery } from '@apollo/client';

import {
  Alert,
  Avatar,
  Box,
  Card,
  CardContent,
  CardHeader,
  Grid,
  IconButton,
  InputAdornment,
  Skeleton,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';

import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import PeopleIcon from '@mui/icons-material/People';
import RefreshIcon from '@mui/icons-material/Refresh';

import { JSX } from 'react';
import { GET_USERS } from '../../../graphql/auth/mutation';
import { copyToClipboard } from '../../../lib/link';
import { KeycloakUser } from '../../../types/auth/auth.type';

// Gemeinsamer Monospace-Style für IDs
const monoSx = {
  fontFamily:
    'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
  fontSize: '0.9rem',
  letterSpacing: '0.01em',
};

// ------------------------------------------------------------------
// Page
// ------------------------------------------------------------------
export default function AdminGuestsPage(): JSX.Element {
  const { data, loading, error, refetch } = useQuery<{
    getUsers: KeycloakUser[];
  }>(GET_USERS, {
    fetchPolicy: 'cache-and-network',
  });

  const users = data?.getUsers ?? [];

  async function copy(text: string, label: string) {
    const ok = await copyToClipboard(text);
    if (!ok) alert(`Konnte ${label} nicht kopieren.`);
  }

  return (
    <Box sx={{ p: { xs: 2, md: 4 }, maxWidth: 900, mx: 'auto' }}>
      <Card variant="outlined" sx={{ mb: 2 }}>
        <CardHeader
          avatar={<PeopleIcon />}
          titleTypographyProps={{ variant: 'h5', sx: { fontWeight: 800 } }}
          title="Gäste (Keycloak)"
          action={
            <Tooltip title="Neu laden">
              <span>
                <IconButton onClick={() => refetch()} disabled={loading}>
                  <RefreshIcon />
                </IconButton>
              </span>
            </Tooltip>
          }
        />
      </Card>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {String(error.message)}
        </Alert>
      )}

      {loading && (
        <Stack spacing={1.25}>
          {[1, 2, 3].map((k) => (
            <Card key={k} variant="outlined">
              <CardContent>
                <Skeleton width="40%" />
                <Skeleton width="60%" />
              </CardContent>
            </Card>
          ))}
        </Stack>
      )}

      {!loading && users.length === 0 && (
        <Alert severity="info">Keine Gäste gefunden.</Alert>
      )}

      <Stack spacing={1.5}>
        {users.map((u) => {
          const name =
            [u.firstName, u.lastName].filter(Boolean).join(' ') || u.username;
          const invitation = u.attributes?.invitationId?.[0] ?? '';
          const tickets = u.attributes?.ticketId ?? [];

          return (
            <Card key={u.id} variant="outlined" sx={{ borderRadius: 12 }}>
              <CardContent>
                {/* Kopf: Avatar + Name */}
                <Stack
                  direction="row"
                  spacing={1.5}
                  alignItems="center"
                  sx={{ mb: 1 }}
                >
                  <Avatar>{(name[0] || 'U').toUpperCase()}</Avatar>
                  <Box sx={{ minWidth: 0 }}>
                    <Typography
                      variant="subtitle1"
                      sx={{ fontWeight: 700 }}
                      noWrap
                    >
                      {name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" noWrap>
                      {u.username}
                    </Typography>
                  </Box>
                </Stack>

                <Grid container spacing={1}>
                  {/* User-ID */}
                  <Grid item xs={12}>
                    <TextField
                      label="User ID"
                      value={u.id}
                      size="small"
                      fullWidth
                      InputProps={{
                        readOnly: true,
                        sx: monoSx,
                        endAdornment: (
                          <InputAdornment position="end">
                            <Tooltip title="User-ID kopieren">
                              <IconButton onClick={() => copy(u.id, 'User ID')}>
                                <ContentCopyIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </InputAdornment>
                        ),
                      }}
                    />
                  </Grid>

                  {/* Invitation-ID */}
                  <Grid item xs={12}>
                    <TextField
                      label="Invitation ID"
                      value={invitation}
                      size="small"
                      fullWidth
                      placeholder="—"
                      InputProps={{
                        readOnly: true,
                        sx: monoSx,
                        endAdornment: invitation ? (
                          <InputAdornment position="end">
                            <Tooltip title="Invitation-ID kopieren">
                              <IconButton
                                onClick={() =>
                                  copy(invitation, 'Invitation ID')
                                }
                              >
                                <ContentCopyIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </InputAdornment>
                        ) : undefined,
                      }}
                    />
                  </Grid>

                  {/* Ticket-IDs */}
                  <Grid item xs={12}>
                    <Stack spacing={0.75}>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        Ticket IDs
                      </Typography>
                      {tickets.length > 0 ? (
                        tickets.map((tid) => (
                          <TextField
                            key={tid}
                            value={tid}
                            size="small"
                            fullWidth
                            InputProps={{
                              readOnly: true,
                              sx: monoSx,
                              endAdornment: (
                                <InputAdornment position="end">
                                  <Tooltip title="Ticket-ID kopieren">
                                    <IconButton
                                      onClick={() => copy(tid, 'Ticket ID')}
                                    >
                                      <ContentCopyIcon fontSize="small" />
                                    </IconButton>
                                  </Tooltip>
                                </InputAdornment>
                              ),
                            }}
                          />
                        ))
                      ) : (
                        <Typography variant="body2" color="text.secondary">
                          —
                        </Typography>
                      )}
                    </Stack>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          );
        })}
      </Stack>
    </Box>
  );
}
