'use client';

import {
  Alert,
  Button,
  Card,
  CardContent,
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
  approved: boolean;
  status: string;
  guest?: {
    firstName?: string | null;
    lastName?: string | null;
    email?: string | null;
  } | null;
};

export default function ApprovePage() {
  const [rows, setRows] = React.useState<Invitation[]>([]);
  const [error, setError] = React.useState<string | null>(null);

  const load = async () => {
    try {
      setError(null);
      const res = await fetch('/api/invitations?status=ACCEPTED');
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

  const approve = async (id: string) => {
    const res = await fetch('/api/invitations/approve', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    if (res.ok) load();
  };

  return (
    <Card variant="outlined">
      <CardContent>
        <Typography variant="h5" sx={{ fontWeight: 800, mb: 1 }}>
          Approve Flow
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
              <TableCell>Approved</TableCell>
              <TableCell align="right">Aktion</TableCell>
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
                <TableCell>{r.approved ? '✅' : '—'}</TableCell>
                <TableCell align="right">
                  <Button
                    size="small"
                    variant="contained"
                    onClick={() => approve(r.id)}
                    disabled={r.approved}
                  >
                    Bestätigen
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={4}>Keine Einträge</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
