// /web/src/app/rsvp/page.tsx
'use client';

import { useMutation, useQuery } from '@apollo/client';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  Chip,
  CircularProgress,
  Divider,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import { useSearchParams } from 'next/navigation';
import * as React from 'react';
import {
  CREATE_PLUS_ONES_INVITATION,
  UPDATE_INVITATION,
} from '../../graphql/invitation/mutation';
import { INVITATION } from '../../graphql/invitation/query';

export default function RsvpPage() {
  const sp = useSearchParams();
  const invId = sp.get('inv') ?? '';

  const { data, loading, error, refetch } = useQuery(INVITATION, {
    variables: { id: invId },
    skip: !invId,
    fetchPolicy: 'cache-and-network',
  });

  const invitation = data?.invitation ?? null;

  const [updateInvitation, { loading: savingRsvp }] =
    useMutation(UPDATE_INVITATION);
  const [createPlusOne, { loading: creatingPlusOne }] = useMutation(
    CREATE_PLUS_ONES_INVITATION,
  );

  const [msg, setMsg] = React.useState<string | null>(null);
  const [err, setErr] = React.useState<string | null>(null);

  const max = invitation?.maxInvitees ?? 0;
  const used = invitation?.plusOnes?.length ?? 0;
  const free = Math.max(0, max - used);

  async function submitRsvp(choice: 'YES' | 'NO') {
    setErr(null);
    setMsg(null);
    await updateInvitation({ variables: { id: invId, rsvpChoice: choice } });
    setMsg(
      choice === 'YES' ? 'Danke für deine Zusage.' : 'Absage gespeichert.',
    );
    await refetch();
  }

  async function addPlusOne() {
    setErr(null);
    setMsg(null);
    if (!invitation) return;
    if (free <= 0) {
      setErr('Kontingent erschöpft.');
      return;
    }
    await createPlusOne({
      variables: {
        eventId: invitation.eventId,
        invitedByInvitationId: invitation.id,
      },
    });
    setMsg('Plus-One angelegt.');
    await refetch();
  }

  async function approveChild(childId: string) {
    setErr(null);
    setMsg(null);
    await updateInvitation({ variables: { id: childId, approved: true } });
    setMsg('Plus-One bestätigt.');
    await refetch();
  }

  if (!invId) {
    return (
      <Alert severity="warning" sx={{ my: 2 }}>
        Ungültiger Link: Es fehlt die Invitation-ID (<code>?inv=...</code>).
      </Alert>
    );
  }

  return (
    <Box sx={{ p: { xs: 2, md: 4 }, maxWidth: 1000, mx: 'auto' }}>
      <Typography variant="h5" sx={{ mb: 2, fontWeight: 700 }}>
        Einladung
      </Typography>

      {loading && (
        <Stack alignItems="center" justifyContent="center" sx={{ py: 6 }}>
          <CircularProgress />
        </Stack>
      )}
      {!loading && error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {String(error.message || error)}
        </Alert>
      )}
      {msg && (
        <Alert severity="success" sx={{ mb: 2 }}>
          {msg}
        </Alert>
      )}
      {err && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {err}
        </Alert>
      )}

      {!loading && invitation && (
        <Card>
          <CardHeader
            title={`Invitation ${invitation.id}`}
            subheader={
              <span>
                Event-ID: <code>{invitation.eventId}</code>
              </span>
            }
          />
          <CardContent>
            {/* RSVP */}
            <Typography variant="subtitle1" sx={{ mb: 1 }}>
              Teilnahme
            </Typography>
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              spacing={2}
              sx={{ mb: 2 }}
            >
              <Button
                variant="contained"
                disabled={savingRsvp}
                onClick={() => submitRsvp('YES')}
              >
                👍 ZUSAGEN
              </Button>
              <Button
                variant="outlined"
                color="inherit"
                disabled={savingRsvp}
                onClick={() => submitRsvp('NO')}
              >
                👎 ABSAGEN
              </Button>
            </Stack>

            <Stack
              direction="row"
              spacing={1}
              sx={{ mb: 2 }}
              useFlexGap
              flexWrap="wrap"
            >
              <Chip label={`Status: ${invitation.status}`} />
              <Chip label={`RSVP: ${invitation.rsvpChoice ?? '—'}`} />
              <Chip
                label={`Approved: ${invitation.approved ? 'Ja' : 'Nein'}`}
                color={invitation.approved ? 'success' : 'default'}
              />
            </Stack>

            <Divider sx={{ my: 2 }} />

            {/* Plus-Ones */}
            {max > 0 && (
              <>
                <Typography variant="subtitle1" sx={{ mb: 1 }}>
                  Zusätzliche Gäste (Plus-Ones)
                </Typography>
                <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
                  <Chip label={`Max: ${max}`} />
                  <Chip label={`Belegt: ${used}`} />
                  <Chip
                    label={`Frei: ${free}`}
                    color={free > 0 ? 'info' : 'default'}
                  />
                </Stack>

                <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
                  <Button
                    variant="contained"
                    onClick={addPlusOne}
                    disabled={creatingPlusOne || free <= 0}
                  >
                    Plus-One hinzufügen
                  </Button>
                </Stack>

                {invitation.plusOnes && invitation.plusOnes.length > 0 ? (
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Invitation ID</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell>RSVP</TableCell>
                        <TableCell>Approved</TableCell>
                        <TableCell align="right">Aktionen</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {invitation.plusOnes.map((c: any) => (
                        <TableRow key={c.id}>
                          <TableCell>{c.id}</TableCell>
                          <TableCell>{c.status}</TableCell>
                          <TableCell>{c.rsvpChoice ?? '—'}</TableCell>
                          <TableCell>
                            <Chip
                              size="small"
                              label={c.approved ? 'Ja' : 'Nein'}
                              color={c.approved ? 'success' : 'default'}
                            />
                          </TableCell>
                          <TableCell align="right">
                            <Button
                              size="small"
                              onClick={() => approveChild(c.id)}
                              disabled={c.approved}
                            >
                              Bestätigen
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    Noch keine Plus-Ones angelegt.
                  </Typography>
                )}
              </>
            )}
          </CardContent>
        </Card>
      )}
    </Box>
  );
}
