// /web/src/app/invitations/page.tsx
'use client';

import { useMutation, useQuery } from '@apollo/client';
import {
  Alert,
  Button,
  Card,
  CardContent,
  CardHeader,
  Chip,
  Grid,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import * as React from 'react';
import {
  CREATE_INVITATION,
  UPDATE_INVITATION,
} from '../../graphql/invitation/mutation';
import { INVITATIONS } from '../../graphql/invitation/query';
import type {
  Invitation,
  InvitationsQueryResult,
} from '../../types/invitation/invitation.type';

export default function InvitationsPage() {
  const { data, loading, error, refetch } = useQuery<InvitationsQueryResult>(
    INVITATIONS,
    {
      fetchPolicy: 'cache-and-network',
    },
  );

  const [form, setForm] = React.useState({ eventId: '', maxInvitees: 0 });
  const [err, setErr] = React.useState<string | null>(null);

  const [createInvitation, { loading: creating }] = useMutation(
    CREATE_INVITATION,
    {
      update(cache, { data }) {
        const created = data?.createInvitation;
        if (!created) return;
        try {
          const existing = cache.readQuery<InvitationsQueryResult>({
            query: INVITATIONS,
          });
          if (existing?.invitations) {
            cache.writeQuery({
              query: INVITATIONS,
              data: { invitations: [created, ...existing.invitations] },
            });
          }
        } catch {
          /* ignore */
        }
      },
      onError(e) {
        setErr(e.message);
      },
      onCompleted() {
        setForm({ eventId: '', maxInvitees: 0 });
      },
    },
  );

  const [updateInvitation] = useMutation(UPDATE_INVITATION, {
    onError(e) {
      setErr(e.message);
    },
  });

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (!form.eventId.trim()) {
      setErr('Bitte eventId angeben');
      return;
    }
    await createInvitation({
      variables: {
        eventId: form.eventId.trim(),
        maxInvitees: Number(form.maxInvitees || 0),
      },
    });
  }

  const rows = data?.invitations ?? [];

  return (
    <Card variant="outlined">
      <CardHeader
        title="Einladungen"
        titleTypographyProps={{ variant: 'h5', sx: { fontWeight: 800 } }}
        action={
          <Button onClick={() => refetch()} variant="outlined">
            Aktualisieren
          </Button>
        }
      />
      <CardContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error.message}
          </Alert>
        )}
        {err && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {err}
          </Alert>
        )}

        {/* Create Form */}
        <form onSubmit={onCreate}>
          <Grid container spacing={1} alignItems="center" sx={{ mb: 2 }}>
            <Grid sx={{ xs: 12, sm: 4 }}>
              <TextField
                label="Event ID"
                value={form.eventId}
                onChange={(e) =>
                  setForm((f) => ({ ...f, eventId: e.target.value }))
                }
                fullWidth
                required
              />
            </Grid>
            <Grid sx={{ xs: 12, sm: 3 }}>
              <TextField
                label="maxInvitees"
                type="number"
                value={form.maxInvitees}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    maxInvitees: Number(e.target.value || 0),
                  }))
                }
                fullWidth
              />
            </Grid>
            <Grid sx={{ xs: 12, sm: 'auto' }}>
              <Button type="submit" variant="contained" disabled={creating}>
                Invitation erstellen
              </Button>
            </Grid>
          </Grid>
        </form>

        {/* List */}
        {loading && !data && <Typography>Wird geladen…</Typography>}
        {!loading && rows.length === 0 && (
          <Typography>Keine Einladungen.</Typography>
        )}
        {rows.length > 0 && (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Invitation ID</TableCell>
                <TableCell>Event</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>RSVP</TableCell>
                <TableCell>maxInvitees</TableCell>
                <TableCell>Approved</TableCell>
                <TableCell align="right">Aktionen</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((r: Invitation) => (
                <TableRow key={r.id}>
                  <TableCell>{r.id}</TableCell>
                  <TableCell>{r.eventId}</TableCell>
                  <TableCell>{r.status}</TableCell>
                  <TableCell>{r.rsvpChoice ?? '—'}</TableCell>
                  <TableCell>{r.maxInvitees}</TableCell>
                  <TableCell>
                    <Chip
                      label={r.approved ? 'Ja' : 'Nein'}
                      color={r.approved ? 'success' : 'default'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell align="right">
                    <Stack
                      direction="row"
                      spacing={1}
                      justifyContent="flex-end"
                    >
                      <Button
                        size="small"
                        onClick={() =>
                          updateInvitation({
                            variables: { id: r.id, approved: true },
                          })
                        }
                        disabled={r.approved}
                      >
                        Approven
                      </Button>
                      <Button
                        size="small"
                        onClick={() =>
                          updateInvitation({
                            variables: { id: r.id, rsvpChoice: 'YES' },
                          })
                        }
                      >
                        RSVP YES
                      </Button>
                      <Button
                        size="small"
                        color="warning"
                        onClick={() =>
                          updateInvitation({
                            variables: { id: r.id, rsvpChoice: 'NO' },
                          })
                        }
                      >
                        RSVP NO
                      </Button>
                    </Stack>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
