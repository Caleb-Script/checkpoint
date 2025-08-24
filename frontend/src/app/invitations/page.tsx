'use client';

import {
  Alert,
  Button,
  Card,
  CardContent,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import * as React from 'react';

type Invitation = {
  id: string;
  status: 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'CANCELED';
  rsvpChoice?: 'YES' | 'NO' | null;
  approved?: boolean;
  guest?: {
    firstName?: string | null;
    lastName?: string | null;
    email?: string | null;
  } | null;
};

export default function InvitationsPage() {
  const [rows, setRows] = React.useState<Invitation[]>([]);
  const [error, setError] = React.useState<string | null>(null);

  const load = async () => {
    try {
      setError(null);
      const res = await fetch('/api/invitations');
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? 'Fehler');
      setRows(data?.invitations ?? []);
    } catch (e: any) {
      setError(e.message);
    }
  };

  React.useEffect(() => {
    load();
  }, []);

  const genLink = async (id: string) => {
    const res = await fetch(`/api/invitations/${id}/link`);
    if (res.ok) await load();
  };

  return (
    <Card variant="outlined">
      <CardContent>
        <Typography variant="h5" sx={{ fontWeight: 800, mb: 1 }}>
          Einladungen
        </Typography>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Gast</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>RSVP</TableCell>
              <TableCell>Approved</TableCell>
              <TableCell align="right">Aktionen</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.id}>
                <TableCell>
                  {[r.guest?.firstName, r.guest?.lastName]
                    .filter(Boolean)
                    .join(' ') ||
                    r.guest?.email ||
                    '—'}
                </TableCell>
                <TableCell>{r.status}</TableCell>
                <TableCell>{r.rsvpChoice ?? '—'}</TableCell>
                <TableCell>{r.approved ? '✅' : '—'}</TableCell>
                <TableCell align="right">
                  <Stack direction="row" spacing={1} justifyContent="flex-end">
                    <Button size="small" onClick={() => genLink(r.id)}>
                      Link
                    </Button>
                  </Stack>
                </TableCell>
              </TableRow>
            ))}
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={5}>Keine Einträge</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
