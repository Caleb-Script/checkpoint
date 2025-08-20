// /Users/gentlebookpro/Projekte/checkpoint/web/src/app/invitations/page.tsx
"use client";

import * as React from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  Stack,
  TextField,
  Typography,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Checkbox,
  IconButton,
  Tooltip,
  FormControlLabel,
  Switch,
} from "@mui/material";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";

type EventDto = { id: string; name: string };
type InvitationRow = {
  id: string;
  status: string | null;
  rsvpChoice: string | null;
  approved: boolean;
  shareCode: string | null;
  inviteLink: string | null;
  type: "main" | "plusone";
  invitedByName?: string | null;
  maxInvitees?: number | null;
  guest: { email?: string | null; phone?: string | null; name?: string | null };
  ticket?: {
    id: string;
    state: string;
    seat?: {
      section?: string | null;
      row?: string | null;
      number?: string | null;
    } | null;
  } | null;
};

export default function InvitationsPage() {
  const [events, setEvents] = React.useState<EventDto[]>([]);
  const [eventId, setEventId] = React.useState<string>("");
  const [csvText, setCsvText] = React.useState<string>(
    "email,phone,firstName,lastName,maxInvites\nalice@example.com,,Alice,Example,4",
  );
  const [rows, setRows] = React.useState<InvitationRow[]>([]);
  const [selected, setSelected] = React.useState<Record<string, boolean>>({});
  const [loading, setLoading] = React.useState(false);
  const [file, setFile] = React.useState<File | null>(null);
  const [onlyMain, setOnlyMain] = React.useState<boolean>(true); // <— neu

  React.useEffect(() => {
    (async () => {
      const res = await fetch("/api/admin/events");
      const json = await res.json();
      if (json.ok)
        setEvents(json.events.map((e: any) => ({ id: e.id, name: e.name })));
    })();
  }, []);

  async function refreshList() {
    if (!eventId) return;
    setLoading(true);
    try {
      const res = await fetch(
        `/api/admin/invitations?eventId=${encodeURIComponent(eventId)}`,
      );
      const json = await res.json();
      if (json.ok) setRows(json.invitations);
    } finally {
      setLoading(false);
    }
  }
  React.useEffect(() => {
    void refreshList();
  }, [eventId]);

  function toggle(id: string) {
    setSelected((s) => ({ ...s, [id]: !s[id] }));
  }

  function buildWaUrl(
    link: string,
    name?: string | null,
    phone?: string | null,
  ) {
    const msg = `Hi${name ? " " + name : ""}! Deine Einladung für unser Event: ${link}\nBitte Daten prüfen & RSVP.`;
    const text = encodeURIComponent(msg);
    if (phone && phone.trim()) {
      const p = phone.replace(/[^\d+]/g, "");
      return `https://wa.me/${encodeURIComponent(p)}?text=${text}`;
    }
    return `https://wa.me/?text=${text}`;
  }

  async function importData() {
    if (!eventId) return alert("Bitte zuerst ein Event auswählen.");
    setLoading(true);
    try {
      const fd = new FormData();
      if (file) fd.append("file", file);
      if (csvText && csvText.trim().length > 0) fd.append("csv", csvText);

      if (![...fd.keys()].length) {
        alert("Bitte Datei wählen oder CSV-Text einfügen.");
        setLoading(false);
        return;
      }

      const res = await fetch(
        `/api/admin/invitations/import?eventId=${encodeURIComponent(eventId)}`,
        {
          method: "POST",
          body: fd,
        },
      );
      const json = await res.json();
      if (!json.ok) throw new Error(json.error || "Import fehlgeschlagen");
      await refreshList();
      alert(`Importiert: ${json.count}`);
    } catch (e: any) {
      alert("Fehler: " + e.message);
    } finally {
      setLoading(false);
    }
  }

  const visibleRows = rows.filter((r) => (onlyMain ? r.type === "main" : true));
  const selectedRows = visibleRows.filter((r) => selected[r.id]);

  return (
    <Box sx={{ p: { xs: 2, md: 4 }, maxWidth: 1200, mx: "auto" }}>
      <Typography variant="h5" sx={{ mb: 2, fontWeight: 700 }}>
        Einladungen – Import & Versand
      </Typography>

      {/* 1) Event Auswahl */}
      <Card sx={{ mb: 3 }}>
        <CardHeader title="1) Event auswählen" />
        <CardContent>
          <Stack spacing={2}>
            <FormControl fullWidth>
              <InputLabel>Event</InputLabel>
              <Select
                value={eventId}
                label="Event"
                onChange={(e) => setEventId(String(e.target.value))}
              >
                {events.map((e) => (
                  <MenuItem key={e.id} value={e.id}>
                    {e.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControlLabel
              control={
                <Switch
                  checked={onlyMain}
                  onChange={(_, c) => setOnlyMain(c)}
                />
              }
              label="Nur Haupt-Einladungen anzeigen"
            />
          </Stack>
        </CardContent>
      </Card>

      {/* 2) Import: Datei-Upload UND/ODER manueller CSV-Text */}
      <Card sx={{ mb: 3 }}>
        <CardHeader
          title="2) Importieren"
          subheader="CSV/Excel hochladen und/oder CSV-Text einfügen (Spalten: email, phone, firstName, lastName, maxInvites)"
        />
        <CardContent>
          <Stack spacing={2}>
            <Stack
              direction={{ xs: "column", md: "row" }}
              spacing={2}
              alignItems="center"
            >
              <Button variant="outlined" component="label">
                Datei wählen (.csv, .xlsx, .xls)
                <input
                  type="file"
                  accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
                  hidden
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                />
              </Button>
              <Typography variant="body2" color="text.secondary">
                {file
                  ? `Ausgewählt: ${file.name}`
                  : "Keine Datei ausgewählt (optional)"}
              </Typography>
              {file && (
                <Button variant="text" onClick={() => setFile(null)}>
                  Datei entfernen
                </Button>
              )}
            </Stack>

            <TextField
              label="CSV-Text (optional, wird zusätzlich zur Datei importiert)"
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
              multiline
              minRows={6}
            />

            <Stack direction="row" spacing={2}>
              <Button
                variant="contained"
                onClick={importData}
                disabled={!eventId || loading}
              >
                Import starten
              </Button>
              <Button
                variant="outlined"
                onClick={refreshList}
                disabled={!eventId || loading}
              >
                Aktualisieren
              </Button>
            </Stack>
          </Stack>
        </CardContent>
      </Card>

      {/* 3) Liste + WhatsApp */}
      <Card>
        <CardHeader
          title="3) Einladungen & WhatsApp"
          subheader="Typ beachten: Haupt-Einladung vs. Plus-One"
        />
        <CardContent>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>✔</TableCell>
                <TableCell>Typ</TableCell>
                <TableCell>Gast</TableCell>
                <TableCell>Kontakt</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>RSVP</TableCell>
                <TableCell>Kontingent</TableCell>
                <TableCell>Link</TableCell>
                <TableCell>WA</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {visibleRows.map((r) => (
                <TableRow key={r.id} hover>
                  <TableCell>
                    <Checkbox
                      checked={!!selected[r.id]}
                      onChange={() => toggle(r.id)}
                    />
                  </TableCell>
                  <TableCell>
                    {r.type === "main"
                      ? "Haupt"
                      : `Plus-One${r.invitedByName ? ` von ${r.invitedByName}` : ""}`}
                  </TableCell>
                  <TableCell>{r.guest?.name || "-"}</TableCell>
                  <TableCell>
                    <div>{r.guest?.email || "-"}</div>
                    <div>{r.guest?.phone || "-"}</div>
                  </TableCell>
                  <TableCell>{r.status ?? "-"}</TableCell>
                  <TableCell>{r.rsvpChoice ?? "-"}</TableCell>
                  <TableCell>{r.maxInvitees ?? 0}</TableCell>
                  <TableCell
                    sx={{
                      maxWidth: 260,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {r.inviteLink ? (
                      <Stack direction="row" spacing={1} alignItems="center">
                        <a href={r.inviteLink} target="_blank" rel="noreferrer">
                          {r.inviteLink}
                        </a>
                        <Tooltip title="Link kopieren">
                          <IconButton
                            size="small"
                            onClick={() =>
                              navigator.clipboard.writeText(r.inviteLink!)
                            }
                          >
                            <ContentCopyIcon fontSize="inherit" />
                          </IconButton>
                        </Tooltip>
                      </Stack>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell>
                    {r.inviteLink && (
                      <Button
                        size="small"
                        variant="outlined"
                        href={buildWaUrl(
                          r.inviteLink,
                          r.guest?.name,
                          r.guest?.phone,
                        )}
                        target="_blank"
                      >
                        WhatsApp
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {selectedRows.length > 0 && (
            <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
              <Button
                variant="contained"
                onClick={() => {
                  const texts = selectedRows
                    .filter((r) => r.inviteLink)
                    .map((r) => r.inviteLink!);
                  navigator.clipboard.writeText(texts.join("\n"));
                  alert(`Kopiert: ${texts.length} Links`);
                }}
              >
                Ausgewählte Links kopieren
              </Button>
              <Button
                variant="outlined"
                onClick={() => {
                  for (const r of selectedRows) {
                    if (r.inviteLink) {
                      window.open(
                        buildWaUrl(r.inviteLink, r.guest?.name, r.guest?.phone),
                        "_blank",
                      );
                    }
                  }
                }}
              >
                Für Ausgewählte: WhatsApp öffnen
              </Button>
            </Stack>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}
