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

type Row = {
  id: string;
  approved: boolean;
  status: string;
  sent?: boolean;
  guest?: { email?: string | null } | null;
};

export default function SendTicketsPage() {
  const [rows, setRows] = React.useState<Row[]>([]);
  const [message, setMessage] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const load = async () => {
    try {
      setError(null);
      setMessage(null);
      const res = await fetch('/api/invitations?approved=true');
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

  const sendOne = async (id: string) => {
    const res = await fetch('/api/tickets/send', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    if (res.ok) {
      setMessage('Ticket versendet.');
      load();
    }
  };

  return (
    <Card variant="outlined">
      <CardContent>
        <Typography variant="h5" sx={{ fontWeight: 800, mb: 1 }}>
          Tickets versenden
        </Typography>
        {message && (
          <Alert severity="success" sx={{ mb: 2 }}>
            {message}
          </Alert>
        )}
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
              <TableCell>Gesendet</TableCell>
              <TableCell align="right">Aktion</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.id}>
                <TableCell>{r.guest?.email ?? '—'}</TableCell>
                <TableCell>{r.status}</TableCell>
                <TableCell>{r.sent ? '✅' : '—'}</TableCell>
                <TableCell align="right">
                  <Button
                    size="small"
                    variant="contained"
                    onClick={() => sendOne(r.id)}
                    disabled={!!r.sent}
                  >
                    Senden
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
