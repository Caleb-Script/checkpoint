// /web/src/app/admin/guests/page.tsx
'use client';

import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  Chip,
  CircularProgress,
  IconButton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import PersonOffIcon from '@mui/icons-material/PersonOff';
import * as React from 'react';
import { useQuery } from '@apollo/client'; // oder fetch() gegen deine /api/admin/users

type KeycloakUser = {
  id: string;
  username: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  enabled: boolean;
  roles: string[];
};

export default function AdminGuestsPage() {
  // TODO: echten Hook bauen, der Keycloak-User lädt
  const { data, loading, error, refetch } = useQuery<{ users: KeycloakUser[] }>(
    // Query gegen deinen API-Endpoint
    /* USERS_QUERY */,
    { fetchPolicy: 'cache-and-network' },
  );

  const users = data?.users ?? [];

  return (
    <Box sx={{ p: { xs: 2, md: 4 } }}>
      <Card>
        <CardHeader
          title="Alle Gäste (Keycloak User)"
          action={
            <IconButton onClick={() => refetch()}>
              <RefreshIcon />
            </IconButton>
          }
        />
        <CardContent>
          {loading && (
            <Stack alignItems="center" sx={{ py: 4 }}>
              <CircularProgress />
            </Stack>
          )}
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {String(error)}
            </Alert>
          )}

          {!loading && users.length === 0 && (
            <Typography>Keine Gäste gefunden.</Typography>
          )}

          {users.length > 0 && (
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>User</TableCell>
                  <TableCell>Email</TableCell>
                  <TableCell>Rollen</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="right">Aktionen</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {users.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Avatar>
                          {(u.firstName?.[0] ??
                            u.username?.[0] ??
                            'U').toUpperCase()}
                        </Avatar>
                        <div>
                          <Typography fontWeight={600}>
                            {u.firstName} {u.lastName}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {u.username}
                          </Typography>
                        </div>
                      </Stack>
                    </TableCell>
                    <TableCell>{u.email ?? '—'}</TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={0.5} flexWrap="wrap">
                        {u.roles.map((r) => (
                          <Chip
                            key={r}
                            size="small"
                            label={r}
                            color={
                              r.toLowerCase() === 'admin'
                                ? 'error'
                                : r.toLowerCase() === 'security'
                                ? 'warning'
                                : 'default'
                            }
                          />
                        ))}
                      </Stack>
                    </TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={u.enabled ? 'Aktiv' : 'Deaktiviert'}
                        color={u.enabled ? 'success' : 'default'}
                      />
                    </TableCell>
                    <TableCell align="right">
                      <Tooltip title="Rolle ändern">
                        <IconButton>
                          <AdminPanelSettingsIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="User sperren">
                        <IconButton>
                          <PersonOffIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}
