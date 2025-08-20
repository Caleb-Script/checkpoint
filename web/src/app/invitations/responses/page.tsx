// /Users/gentlebookpro/Projekte/checkpoint/web/src/app/invitations/responses/page.tsx
"use client";

import * as React from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  Stack,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Checkbox,
  Chip,
  IconButton,
  Tooltip,
  Snackbar,
  Alert,
} from "@mui/material";
import WhatsAppIcon from "@mui/icons-material/WhatsApp";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";

type EventDto = { id: string; name: string };

type InvitationRow = {
  id: string;
  status: "PENDING" | "ACCEPTED" | "DECLINED" | "CANCELED";
  rsvpChoice: "YES" | "NO" | null;
  approved: boolean;
  shareCode: string | null;
  inviteLink: string | null;
  type: "main" | "plusone";
  invitedByName?: string | null;
  maxInvitees?: number | null;
  guest: { email?: string | null; phone?: string | null; name?: string | null };
  ticket: {
    id: string;
    state: string;
    seat?: {
      section?: string | null;
      row?: string | null;
      number?: string | null;
    } | null;
  } | null;
};

type IssueTicketResp = {
  ok: boolean;
  invitation: { id: string; name: string };
  account: { username: string; tempPassword: string };
  ticket: { id: string; url: string; pngUrl: string; pdfUrl: string };
  whatsapp: { url: string; text: string };
  error?: string;
};

export default function ResponsesPage() {
  const [events, setEvents] = React.useState<EventDto[]>([]);
  const [eventId, setEventId] = React.useState<string>("");
  const [rows, setRows] = React.useState<InvitationRow[]>([]);
  const [selected, setSelected] = React.useState<Record<string, boolean>>({});
  const [onlyAccepted, setOnlyAccepted] = React.useState<boolean>(true);
  const [loading, setLoading] = React.useState(false);

  const [snack, setSnack] = React.useState<{
    open: boolean;
    msg: string;
    sev: "success" | "error" | "info";
  }>({ open: false, msg: "", sev: "success" });

  React.useEffect(() => {
    (async () => {
      const r = await fetch("/api/admin/events");
      const j = await r.json();
      if (j.ok)
        setEvents(j.events.map((e: any) => ({ id: e.id, name: e.name })));
    })();
  }, []);

  async function refresh() {
    if (!eventId) return;
    setLoading(true);
    try {
      const r = await fetch(
        `/api/admin/invitations?eventId=${encodeURIComponent(eventId)}`,
        { cache: "no-store" },
      );
      const j = await r.json();
      if (j.ok) setRows(j.invitations as InvitationRow[]);
    } finally {
      setLoading(false);
    }
  }
  React.useEffect(() => {
    void refresh();
  }, [eventId]);

  function toggle(id: string) {
    setSelected((s) => ({ ...s, [id]: !s[id] }));
  }

  const visibleRows = rows
    .filter((r) => (onlyAccepted ? r.status === "ACCEPTED" : true))
    .sort((a, b) =>
      a.type === "main" && b.type !== "main"
        ? -1
        : a.type !== "main" && b.type === "main"
          ? 1
          : 0,
    );

  const selectedRows = visibleRows.filter((r) => selected[r.id]);

  async function issueOne(invitationId: string) {
    try {
      const r = await fetch("/api/admin/invitations/issue-ticket", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invitationId }),
      });
      const j: IssueTicketResp = await r.json();
      if (!r.ok || !j.ok)
        throw new Error(j.error || "Ticket-Ausstellung fehlgeschlagen");

      // Account & WA
      const creds = `User: ${j.account.username} — Passwort: ${j.account.tempPassword}`;
      await navigator.clipboard.writeText(`${creds}\n${j.whatsapp.text}`);
      window.open(j.whatsapp.url, "_blank"); // WhatsApp mit vorgefülltem Text öffnen

      // Optional: PDF direkt öffnen
      window.open(j.ticket.pdfUrl, "_blank");

      setSnack({
        open: true,
        msg: `Ticket erstellt. Zugang kopiert & WA geöffnet. (${j.invitation.name})`,
        sev: "success",
      });
      await refresh();
    } catch (e: any) {
      setSnack({ open: true, msg: e.message || "Fehler", sev: "error" });
    }
  }

  async function issueSelected() {
    for (const r of selectedRows) {
      if (r.status !== "ACCEPTED") continue;
      await issueOne(r.id);
    }
  }

  return (
    <Box sx={{ p: { xs: 2, md: 4 }, maxWidth: 1300, mx: "auto" }}>
      <Typography variant="h5" sx={{ mb: 2, fontWeight: 700 }}>
        Einladungs-Antworten & Tickets
      </Typography>

      <Card sx={{ mb: 3 }}>
        <CardHeader title="1) Event auswählen" />
        <CardContent>
          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={2}
            alignItems="center"
          >
            <FormControl sx={{ minWidth: 320 }}>
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
            <Button
              variant={onlyAccepted ? "contained" : "outlined"}
              onClick={() => setOnlyAccepted(!onlyAccepted)}
            >
              {onlyAccepted ? "Nur ACCEPTED (aktiv)" : "Alle anzeigen"}
            </Button>
            <Button
              variant="outlined"
              onClick={refresh}
              disabled={!eventId || loading}
            >
              Aktualisieren
            </Button>
          </Stack>
        </CardContent>
      </Card>

      <Card>
        <CardHeader
          title="2) Antworten verwalten & Tickets verteilen"
          subheader="Wähle Gäste aus (ACCEPTED) und sende Ticket via WhatsApp inkl. PDF-QR. Der Account wird automatisch erzeugt."
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
                <TableCell>Ticket</TableCell>
                <TableCell align="right">Aktionen</TableCell>
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
                  <TableCell>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Chip
                        size="small"
                        label={r.status}
                        color={
                          r.status === "ACCEPTED"
                            ? "primary"
                            : r.status === "PENDING"
                              ? "default"
                              : "default"
                        }
                      />
                      {r.rsvpChoice && (
                        <Chip
                          size="small"
                          variant="outlined"
                          label={`RSVP: ${r.rsvpChoice}`}
                        />
                      )}
                    </Stack>
                  </TableCell>
                  <TableCell>
                    {r.ticket ? (
                      <Chip size="small" color="success" label="erstellt" />
                    ) : (
                      <Chip size="small" label="offen" />
                    )}
                  </TableCell>
                  <TableCell align="right">
                    <Stack
                      direction="row"
                      spacing={1}
                      justifyContent="flex-end"
                    >
                      <Tooltip title="Ticket + WhatsApp senden (inkl. PDF-Link)">
                        <span>
                          <IconButton
                            color="success"
                            onClick={() => issueOne(r.id)}
                            disabled={r.status !== "ACCEPTED"}
                          >
                            <WhatsAppIcon />
                          </IconButton>
                        </span>
                      </Tooltip>
                      {/* Optional: Link der Einladung kopieren */}
                      {r.inviteLink && (
                        <Tooltip title="Einladungs-Link kopieren">
                          <IconButton
                            onClick={() =>
                              navigator.clipboard.writeText(r.inviteLink!)
                            }
                          >
                            <ContentCopyIcon />
                          </IconButton>
                        </Tooltip>
                      )}
                      {/* Falls schon Ticket existiert: PDF öffnen */}
                      {r.ticket && (
                        <Tooltip title="PDF-QR öffnen (falls vorhanden)">
                          <span>
                            <IconButton
                              onClick={async () => {
                                // Hole aktuellen Ticket-Share mitsamt PDF-URL über issue-Ticket erneut (idempotent)
                                const rr = await fetch(
                                  "/api/admin/invitations/issue-ticket",
                                  {
                                    method: "POST",
                                    headers: {
                                      "Content-Type": "application/json",
                                    },
                                    body: JSON.stringify({
                                      invitationId: r.id,
                                    }),
                                  },
                                );
                                const jj: IssueTicketResp = await rr.json();
                                if (jj.ok)
                                  window.open(jj.ticket.pdfUrl, "_blank");
                              }}
                            >
                              <PictureAsPdfIcon />
                            </IconButton>
                          </span>
                        </Tooltip>
                      )}
                    </Stack>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {selectedRows.length > 0 && (
            <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
              <Button
                variant="contained"
                startIcon={<WhatsAppIcon />}
                onClick={issueSelected}
              >
                Für ausgewählte: Ticket & WhatsApp senden
              </Button>
            </Stack>
          )}
        </CardContent>
      </Card>

      <Snackbar
        open={snack.open}
        autoHideDuration={4000}
        onClose={() => setSnack((s) => ({ ...s, open: false }))}
      >
        <Alert severity={snack.sev} variant="filled">
          {snack.msg}
        </Alert>
      </Snackbar>
    </Box>
  );
}
