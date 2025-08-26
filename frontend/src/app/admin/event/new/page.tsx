// checkpoint/web/src/app/event/new/page.tsx
'use client';

import { ApolloCache, useMutation } from '@apollo/client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import * as React from 'react';

import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  FormControlLabel,
  Grid,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material';

import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew';
import SaveRoundedIcon from '@mui/icons-material/SaveRounded';

import { CREATE_EVENT } from '../../../../graphql/event/mutation';
import { EVENTS } from '../../../../graphql/event/query';
import type {
  EventsQueryResult,
  Event as EventType,
} from '../../../../types/event/event.type';

// ---------- Helpers: lokale Datums-/Zeitwerte für <input type="datetime-local"> ----------
/**
 * Formatiert ein Date in "YYYY-MM-DDTHH:mm" (lokale Zeit, ohne Sekunden), passend für <input type="datetime-local">
 */
function toLocalInputValue(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  const yyyy = d.getFullYear();
  const mm = pad(d.getMonth() + 1);
  const dd = pad(d.getDate());
  const hh = pad(d.getHours());
  const min = pad(d.getMinutes());
  return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
}

/**
 * Parst "YYYY-MM-DDTHH:mm" (lokal) zurück in ISO-String.
 * Achtung: new Date(localStr) interpretiert lokal → wir geben danach ISO aus.
 */
function localInputToISO(localStr: string): string {
  return new Date(localStr).toISOString();
}

// ---------- Types ----------
type CreateEventInput = {
  name: string;
  startsAt: string; // datetime-local (YYYY-MM-DDTHH:mm)
  endsAt: string; // datetime-local (YYYY-MM-DDTHH:mm)
  allowReEntry: boolean;
  rotateSeconds: number;
  maxSeats: number;
};

// ---------- Component ----------
export default function NewEventPage(): JSX.Element {
  const router = useRouter();

  // sinnvolle Defaults: Start in +1h, Ende in +3h (lokal)
  const now = React.useMemo(() => new Date(), []);
  const startDefault = React.useMemo(() => {
    const d = new Date(now.getTime() + 60 * 60 * 1000);
    return toLocalInputValue(d);
  }, [now]);
  const endDefault = React.useMemo(() => {
    const d = new Date(now.getTime() + 3 * 60 * 60 * 1000);
    return toLocalInputValue(d);
  }, [now]);

  const [form, setForm] = React.useState<CreateEventInput>({
    name: '',
    startsAt: startDefault,
    endsAt: endDefault,
    allowReEntry: true,
    rotateSeconds: 60,
    maxSeats: 0,
  });

  const [error, setError] = React.useState<string | null>(null);

  const [createEvent, { loading }] = useMutation<
    { createEvent: EventType },
    {
      input: {
        name: string;
        startsAt: string;
        endsAt: string;
        allowReEntry: boolean;
        rotateSeconds: number;
        maxSeats: number;
      };
    }
  >(CREATE_EVENT, {
    update(cache: ApolloCache<unknown>, { data }) {
      const created = data?.createEvent;
      if (!created) return;
      try {
        // Existierende Liste lesen & neues Event voranstellen (stark typisiert)
        const existing = cache.readQuery<EventsQueryResult>({ query: EVENTS });
        if (existing?.events) {
          cache.writeQuery<EventsQueryResult>({
            query: EVENTS,
            data: { events: [created, ...existing.events] },
          });
        }
      } catch {
        // Falls Liste noch nie geladen → nichts zu tun
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

  // --- Submit mit Validierung ---
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const trimmedName = form.name.trim();
    if (!trimmedName) {
      setError('Bitte einen Event-Namen vergeben.');
      return;
    }
    // Validierung: Ende nach Start
    const startISO = localInputToISO(form.startsAt);
    const endISO = localInputToISO(form.endsAt);
    if (new Date(endISO).getTime() <= new Date(startISO).getTime()) {
      setError('Das Enddatum muss nach dem Startdatum liegen.');
      return;
    }
    if (form.rotateSeconds < 10) {
      setError('Die Token-Rotation sollte mindestens 10 Sekunden betragen.');
      return;
    }

    await createEvent({
      variables: {
        input: {
          name: trimmedName,
          startsAt: startISO,
          endsAt: endISO,
          allowReEntry: form.allowReEntry,
          rotateSeconds: Number(form.rotateSeconds),
          maxSeats: Number(form.maxSeats) || 0,
        },
      },
    });
  }

  return (
    <Card variant="outlined">
      <CardHeader
        titleTypographyProps={{ variant: 'h5', sx: { fontWeight: 800 } }}
        title="Neues Event anlegen"
        action={
          <Stack direction="row" spacing={1}>
            <Button
              component={Link}
              href="/event"
              variant="outlined"
              startIcon={<ArrowBackIosNewIcon />}
              sx={{ borderRadius: 2 }}
            >
              Zur Übersicht
            </Button>
          </Stack>
        }
      />
      <CardContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Box component="form" onSubmit={submit}>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                label="Name"
                value={form.name}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setForm((f) => ({ ...f, name: e.target.value }))
                }
                fullWidth
                required
                inputMode="text"
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                label="Start"
                type="datetime-local"
                value={form.startsAt}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setForm((f) => ({ ...f, startsAt: e.target.value }))
                }
                fullWidth
                InputLabelProps={{ shrink: true }}
                required
                inputProps={{ step: 60, min: toLocalInputValue(new Date()) }} // 1-Min Schritt, nicht in der Vergangenheit
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                label="Ende"
                type="datetime-local"
                value={form.endsAt}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setForm((f) => ({ ...f, endsAt: e.target.value }))
                }
                fullWidth
                InputLabelProps={{ shrink: true }}
                required
                inputProps={{ step: 60, min: form.startsAt }} // min = Start
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                label="Token-Rotation (Sek.)"
                type="number"
                inputProps={{ min: 10 }}
                value={form.rotateSeconds}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setForm((f) => ({
                    ...f,
                    rotateSeconds: Number(e.target.value),
                  }))
                }
                fullWidth
                required
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                label="Max. Seats (optional)"
                type="number"
                inputProps={{ min: 0 }}
                value={form.maxSeats}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setForm((f) => ({ ...f, maxSeats: Number(e.target.value) }))
                }
                fullWidth
              />
            </Grid>

            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={form.allowReEntry}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setForm((f) => ({ ...f, allowReEntry: e.target.checked }))
                    }
                  />
                }
                label="Re-Entry (mehrfaches Rein/Raus erlaubt)"
              />
            </Grid>

            <Grid item xs={12}>
              <Stack direction="row" gap={1} flexWrap="wrap">
                <Button
                  type="submit"
                  variant="contained"
                  startIcon={<SaveRoundedIcon />}
                  disabled={loading}
                  sx={{ borderRadius: 2 }}
                >
                  Event erstellen
                </Button>
                <Button
                  component={Link}
                  href="/event"
                  variant="outlined"
                  sx={{ borderRadius: 2 }}
                >
                  Abbrechen
                </Button>
              </Stack>
            </Grid>
          </Grid>
        </Box>

        {/* Mobile-Hinweis/Guidance (optional) */}
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ display: 'block', mt: 2 }}
        >
          Tipp: „Token-Rotation“ definiert, wie häufig der QR-Token rotiert
          (Schutz vor Sharing). „Re-Entry“ erlaubt mehrfaches Rein/Raus am
          Einlass.
        </Typography>
      </CardContent>
    </Card>
  );
}
