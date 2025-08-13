// /Users/gentlebookpro/Projekte/checkpoint/web/src/app/(admin)/events/page.tsx
"use client";

import * as React from "react";
import {
  Box, Button, Card, CardContent, CardHeader, Divider, Grid,
  Stack, TextField, Typography, Table, TableHead, TableRow, TableCell, TableBody, IconButton, Tooltip, Switch, FormControlLabel
} from "@mui/material";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";

type EventDto = {
  id: string;
  name: string;
  startsAt: string;
  endsAt: string;
  allowReEntry: boolean;
  rotateSeconds: number;
};

function isoFromLocal(local: string) {
  // datetime-local → ISO
  return local ? new Date(local).toISOString() : "";
}

export default function EventsPage() {
  const [loading, setLoading] = React.useState(false);
  const [events, setEvents] = React.useState<EventDto[]>([]);
  const [form, setForm] = React.useState({
    name: "",
    startsAtLocal: "",
    endsAtLocal: "",
    allowReEntry: true,
    rotateSeconds: 60,
  });

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/events", { method: "GET" });
      const json = await res.json();
      if (json.ok) setEvents(json.events);
    } finally {
      setLoading(false);
    }
  }
  React.useEffect(() => { void load(); }, []);

  async function createEvent() {
    setLoading(true);
    try {
      const body = {
        name: form.name,
        startsAt: isoFromLocal(form.startsAtLocal),
        endsAt: isoFromLocal(form.endsAtLocal),
        allowReEntry: form.allowReEntry,
        rotateSeconds: Number(form.rotateSeconds) || 60,
      };
      const res = await fetch("/api/admin/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || "failed");
      setForm({ name: "", startsAtLocal: "", endsAtLocal: "", allowReEntry: true, rotateSeconds: 60 });
      await load();
    } catch (e: any) {
      alert("Fehler: " + e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Box sx={{ p: { xs: 2, md: 4 }, maxWidth: 1200, mx: "auto" }}>
      <Typography variant="h5" sx={{ mb: 2, fontWeight: 700 }}>Events verwalten</Typography>

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 5 }}>
          <Card>
            <CardHeader title="Neues Event anlegen" />
            <CardContent>
              <Stack spacing={2}>
                <TextField label="Eventname" value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} />
                <TextField
                  label="Start (lokal)"
                  type="datetime-local"
                  value={form.startsAtLocal}
                  onChange={(e) => setForm(f => ({ ...f, startsAtLocal: e.target.value }))}
                  InputLabelProps={{ shrink: true }}
                />
                <TextField
                  label="Ende (lokal)"
                  type="datetime-local"
                  value={form.endsAtLocal}
                  onChange={(e) => setForm(f => ({ ...f, endsAtLocal: e.target.value }))}
                  InputLabelProps={{ shrink: true }}
                />
                <FormControlLabel
                  control={<Switch checked={form.allowReEntry} onChange={(_, c) => setForm(f => ({ ...f, allowReEntry: c }))} />}
                  label="Wiedereinlass erlaubt"
                />
                <TextField
                  label="Token-Rotation (Sek.)"
                  type="number"
                  inputProps={{ min: 10, step: 10 }}
                  value={form.rotateSeconds}
                  onChange={(e) => setForm(f => ({ ...f, rotateSeconds: Number(e.target.value) }))}
                />
                <Stack direction="row" spacing={2}>
                  <Button variant="contained" onClick={createEvent} disabled={loading}>Event anlegen</Button>
                  <Button variant="outlined" onClick={load} disabled={loading}>Aktualisieren</Button>
                </Stack>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 7 }}>
          <Card>
            <CardHeader title="Vorhandene Events" />
            <CardContent>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Name</TableCell>
                    <TableCell>Start</TableCell>
                    <TableCell>Ende</TableCell>
                    <TableCell>Re-Entry</TableCell>
                    <TableCell>Rotate</TableCell>
                    <TableCell>ID</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {events.map(ev => (
                    <TableRow key={ev.id} hover>
                      <TableCell>{ev.name}</TableCell>
                      <TableCell>{new Date(ev.startsAt).toLocaleString()}</TableCell>
                      <TableCell>{new Date(ev.endsAt).toLocaleString()}</TableCell>
                      <TableCell>{ev.allowReEntry ? "ja" : "nein"}</TableCell>
                      <TableCell>{ev.rotateSeconds}s</TableCell>
                      <TableCell>
                        <Stack direction="row" alignItems="center" spacing={1}>
                          <Typography variant="caption" sx={{ maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis" }}>{ev.id}</Typography>
                          <Tooltip title="Event-ID kopieren">
                            <IconButton size="small" onClick={() => navigator.clipboard.writeText(ev.id)}><ContentCopyIcon fontSize="inherit" /></IconButton>
                          </Tooltip>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {!events.length && <Typography variant="body2" sx={{ mt: 2, color: "text.secondary" }}>Noch keine Events vorhanden.</Typography>}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Divider sx={{ my: 3 }} />
      <Typography variant="body2" color="text.secondary">Tipp: Lege hier dein Event an, kopiere die <strong>Event-ID</strong> und nutze sie anschließend auf der Invitations-Seite.</Typography>
    </Box>
  );
}
