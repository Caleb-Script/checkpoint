// /web/src/app/invitations/approve/page.tsx
'use client';

import { useMutation, useQuery } from '@apollo/client';
import {
  Alert,
  Button,
  Card,
  CardContent,
  CardHeader,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import { UPDATE_INVITATION } from '../../../graphql/invitation/mutation';
import { INVITATIONS } from '../../../graphql/invitation/query';
import {
  Invitation,
  InvitationsQueryResult,
} from '../../../types/invitation/invitation.type';

export default function ApprovePage() {
  const { data, loading, error, refetch } = useQuery<InvitationsQueryResult>(
    INVITATIONS,
    { fetchPolicy: 'cache-and-network' },
  );
  const [mutate, { loading: approving, error: err }] = useMutation(
    UPDATE_INVITATION,
    {
      onCompleted: () => refetch(),
    },
  );

  const rows = (data?.invitations ?? []).filter(
    (i) => i.rsvpChoice === 'YES' && !i.approved,
  );

  return (
    <Card variant="outlined">
      <CardHeader
        title="Approve Flow"
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
            {err.message}
          </Alert>
        )}
        {loading && !data && <Typography>Wird geladen…</Typography>}
        {!loading && rows.length === 0 && (
          <Typography>Keine offenen Zusagen.</Typography>
        )}

        {rows.length > 0 && (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Invitation ID</TableCell>
                <TableCell>Event</TableCell>
                <TableCell>RSVP</TableCell>
                <TableCell align="right">Aktion</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((r: Invitation) => (
                <TableRow key={r.id}>
                  <TableCell>{r.id}</TableCell>
                  <TableCell>{r.eventId}</TableCell>
                  <TableCell>{r.rsvpChoice}</TableCell>
                  <TableCell align="right">
                    <Button
                      size="small"
                      variant="contained"
                      disabled={approving}
                      onClick={() =>
                        mutate({ variables: { id: r.id, approved: true } })
                      }
                    >
                      Bestätigen
                    </Button>
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
