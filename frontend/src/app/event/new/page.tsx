// checkpoint/web/src/app/event/new/page.tsx
'use client';

import { useMutation } from '@apollo/client';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  FormControlLabel,
  Grid,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import { useRouter } from 'next/navigation';
import * as React from 'react';
import { CREATE_EVENT } from '../../../graphql/event/mutation';
import { EVENTS } from '../../../graphql/event/query';

type CreateEventInput = {
  name: string;
  startsAt: string;
  endsAt: string;
  allowReEntry: boolean;
  rotateSeconds: number;
  maxSeats: number;
};

export default function NewEventPage() {
  const router = useRouter();
  const [form, setForm] = React.useState<CreateEventInput>({
    name: '',
    startsAt: new Date(Date.now() + 60 * 60 * 1000).toISOString().slice(0, 16), // as datetime-local (cut)
    endsAt: new Date(Date.now() + 3 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 16),
    allowReEntry: true,
    rotateSeconds: 60,
    maxSeats: 0,
  });
  const [error, setError] = React.useState<string | null>(null);

  const [createEvent, { loading }] = useMutation(CREATE_EVENT, {
    update(cache, { data }) {
      const created = data?.createEvent;
      if (!created) return;
      try {
        const existing = cache.readQuery<{ events: any[] }>({ query: EVENTS });
        if (existing?.events) {
          cache.writeQuery({
            query: EVENTS,
            data: { events: [created, ...existing.events] },
          });
        }
      } catch {
        // falls Liste noch nie geholt wurde – nix zu tun
      }
    },
    onError(err) {
      setError(err.message);
    },
    onCompleted({ createEvent }) {
      if (createEvent?.id) {
        router.replace(`/event/${createEvent.id}`);
      }
    },
  });

  function toISO(dtLocal: string) {
    // dtLocal ist 'YYYY-MM-DDTHH:mm' -> baue gültiges ISO
    return new Date(dtLocal).toISOString();
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const input = {
      name: form.name.trim(),
      startsAt: toISO(form.startsAt),
      endsAt: toISO(form.endsAt),
      allowReEntry: form.allowReEntry,
      rotateSeconds: Number(form.rotateSeconds),
      maxSeats: Number(form.maxSeats),
    };
    if (!input.name) {
      setError('Bitte einen Event-Namen vergeben.');
      return;
    }
    await createEvent({ variables: { input } });
  }

  return (
    <Card variant="outlined">
      <CardContent>
        <Typography variant="h5" sx={{ fontWeight: 800, mb: 2 }}>
          Neues Event anlegen
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Box component="form" onSubmit={submit}>
          <Grid container spacing={2}>
            <Grid sx={{ xs: 12 }}>
              <TextField
                label="Name"
                value={form.name}
                onChange={(e) =>
                  setForm((f) => ({ ...f, name: e.target.value }))
                }
                fullWidth
                required
              />
            </Grid>

            <Grid sx={{ xs: 12, sm: 6 }}>
              <TextField
                label="Start"
                type="datetime-local"
                value={form.startsAt}
                onChange={(e) =>
                  setForm((f) => ({ ...f, startsAt: e.target.value }))
                }
                fullWidth
                InputLabelProps={{ shrink: true }}
                required
              />
            </Grid>

            <Grid sx={{ xs: 12, sm: 6 }}>
              <TextField
                label="Ende"
                type="datetime-local"
                value={form.endsAt}
                onChange={(e) =>
                  setForm((f) => ({ ...f, endsAt: e.target.value }))
                }
                fullWidth
                InputLabelProps={{ shrink: true }}
                required
              />
            </Grid>

            <Grid sx={{ xs: 12, sm: 6 }}>
              <TextField
                label="Token-Rotation (Sek.)"
                type="number"
                inputProps={{ min: 10 }}
                value={form.rotateSeconds}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    rotateSeconds: Number(e.target.value),
                  }))
                }
                fullWidth
                required
              />
            </Grid>

            <Grid sx={{ xs: 12, sm: 6 }}>
              <TextField
                label="Max. Seats (optional)"
                type="number"
                inputProps={{ min: 0 }}
                value={form.maxSeats}
                onChange={(e) =>
                  setForm((f) => ({ ...f, maxSeats: Number(e.target.value) }))
                }
                fullWidth
              />
            </Grid>

            <Grid sx={{ xs: 12 }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={form.allowReEntry}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, allowReEntry: e.target.checked }))
                    }
                  />
                }
                label="Re-Entry (mehrfaches Rein/Raus erlaubt)"
              />
            </Grid>

            <Grid sx={{ xs: 12 }}>
              <Button type="submit" variant="contained" disabled={loading}>
                Event erstellen
              </Button>
            </Grid>
          </Grid>
        </Box>
      </CardContent>
    </Card>
  );
}
