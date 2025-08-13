// /Users/gentlebookpro/Projekte/checkpoint/web/src/app/tickets/send/page.tsx
"use client";

import ContentCopyRoundedIcon from "@mui/icons-material/ContentCopyRounded";
import DownloadRoundedIcon from "@mui/icons-material/DownloadRounded";
import EmailIcon from "@mui/icons-material/Email";
import QrCode2RoundedIcon from "@mui/icons-material/QrCode2Rounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import WhatsAppIcon from "@mui/icons-material/WhatsApp";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from "@mui/material";
import * as React from "react";

type Guest = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  name: string | null;
};
type Ticket = {
  id: string;
  currentState: "INSIDE" | "OUTSIDE";
  seat: {
    section: string | null;
    row: string | null;
    number: string | null;
    label: string | null;
  } | null;
} | null;

type EventInfo = {
  id: string;
  name: string;
  startsAt: string;
  endsAt: string;
};

type InvitationItem = {
  id: string; // invitationId
  status: "ACCEPTED" | "DECLINED" | "PENDING" | "CANCELED";
  updatedAt: string;
  createdAt: string;
  event: EventInfo;
  guest: Guest;
  ticket: Ticket;
};

type QrResponse = {
  ticketId: string;
  eventId: string;
  direction: "IN" | "OUT";
  qr: string; // data URL
  token: string; // JWT im QR
  expiresInSeconds: number;
};

export default function TicketSendPage() {
  const { token, roles, isAuthenticated, login } = useAuth();
  const canView = roles.includes("admin") || roles.includes("security");

  const [items, setItems] = React.useState<InvitationItem[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const [search, setSearch] = React.useState("");
  const [selected, setSelected] = React.useState<Record<string, boolean>>({}); // invitationId -> checked

  // QR Preview Dialog
  const [previewOpen, setPreviewOpen] = React.useState(false);
  const [previewLoading, setPreviewLoading] = React.useState(false);
  const [previewError, setPreviewError] = React.useState<string | null>(null);
  const [previewQr, setPreviewQr] = React.useState<QrResponse | null>(null);
  const [direction, setDirection] = React.useState<"IN" | "OUT">("IN");

  // Initial + Suche laden
  const fetchAccepted = React.useCallback(async () => {
    if (!token || !canView) return;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: "1",
        pageSize: "100",
        sortBy: "updatedAt",
        sortDir: "desc",
        status: "accepted",
      });
      if (search.trim()) params.set("search", search.trim());

      const res = await fetch(
        `/api/invitations/responses?${params.toString()}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Fehler beim Laden");
      setItems(data.items || []);
      // Auswahl zurücksetzen, falls Suche geändert wurde
      setSelected({});
    } catch (err: any) {
      setError(err.message || "Unbekannter Fehler");
    } finally {
      setLoading(false);
    }
  }, [token, canView, search]);

  React.useEffect(() => {
    fetchAccepted();
  }, [fetchAccepted]);

  const allChecked = items.length > 0 && items.every((i) => selected[i.id]);
  const anyChecked = Object.values(selected).some(Boolean);

  const toggleAll = (value: boolean) => {
    const next: Record<string, boolean> = {};
    items.forEach((i) => (next[i.id] = value));
    setSelected(next);
  };

  const toggleRow = (id: string, value: boolean) => {
    setSelected((prev) => ({ ...prev, [id]: value }));
  };

  // QR Vorschau generieren
  const openPreviewForInvitation = async (inv: InvitationItem) => {
    if (!token) return;
    setPreviewOpen(true);
    setPreviewLoading(true);
    setPreviewError(null);
    setPreviewQr(null);
    try {
      const res = await fetch("/api/tickets/qr", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          invitationId: inv.id,
          direction,
          deviceId: "admin-console",
        }),
      });
      const data: QrResponse = await res.json();
      if (!res.ok)
        throw new Error((data as any)?.error || "QR-Erzeugung fehlgeschlagen");
      setPreviewQr(data);
    } catch (err: any) {
      setPreviewError(err.message || "Fehler bei der QR-Erzeugung");
    } finally {
      setPreviewLoading(false);
    }
  };

  const refreshPreview = async () => {
    // QR neu generieren (z. B. nach Ablauf)
    const current = items.find(
      (i) => previewQr && (i.ticket?.id === previewQr.ticketId || i.id)
    ); // grob
    if (current) await openPreviewForInvitation(current);
  };

  const nameOf = (guest: Guest) =>
    guest.name ||
    [guest.firstName, guest.lastName].filter(Boolean).join(" ").trim() ||
    "Gast";
  const seatOf = (ticket: Ticket) => ticket?.seat?.label || "-";
  const eventNameOf = (evt: EventInfo) => evt.name;

  // WhatsApp / Mailto Texte: (Anmerkung: WhatsApp kann keine Bilder via Link automatisch anhängen)
  const buildWhatsAppMessage = (inv: InvitationItem) => {
    const nm = nameOf(inv.guest);
    const evt = eventNameOf(inv.event);
    const seat = seatOf(inv.ticket);
    const webUrl =
      typeof window !== "undefined"
        ? window.location.origin
        : "https://example.com";
    return `${nm}, dein Eintritts‑QR für „${evt}“. 
Platz: ${seat}

Öffne die WebApp und logge dich ein, um deinen QR jederzeit zu sehen:
${webUrl}/my-qr`;
  };
  const buildWhatsAppUrl = (text: string) =>
    `https://wa.me/?text=${encodeURIComponent(text)}`;
  const buildMailto = (inv: InvitationItem) => {
    const subject = `Dein QR‑Einlasscode – ${eventNameOf(inv.event)}`;
    const body = buildWhatsAppMessage(inv);
    return `mailto:${encodeURIComponent(inv.guest.email || "")}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  const downloadDataUrl = (dataUrl: string, filename: string) => {
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = filename;
    a.click();
  };

  if (!isAuthenticated) {
    return (
      <Box textAlign="center" mt={4}>
        <Typography variant="h6">Bitte zuerst einloggen</Typography>
        <Button variant="contained" onClick={() => login()}>
          Login
        </Button>
      </Box>
    );
  }

  if (!canView) {
    return (
      <Alert severity="error" sx={{ mt: 2 }}>
        Keine Berechtigung. (Nur <strong>admin</strong> /{" "}
        <strong>security</strong>)
      </Alert>
    );
  }

  return (
    <Card sx={{ mt: 2 }}>
      <CardContent>
        <Stack
          direction={{ xs: "column", md: "row" }}
          justifyContent="space-between"
          alignItems={{ xs: "flex-start", md: "center" }}
          gap={2}
        >
          <Typography variant="h6" fontWeight={700}>
            Tickets versenden (ACCEPTED)
          </Typography>
          <Stack direction="row" gap={1}>
            <ToggleButtonGroup
              size="small"
              value={direction}
              exclusive
              onChange={(_, v) => v && setDirection(v)}
            >
              <ToggleButton value="IN">Einlass</ToggleButton>
              <ToggleButton value="OUT">Auslass</ToggleButton>
            </ToggleButtonGroup>
            <TextField
              size="small"
              placeholder="Suche (Name, E‑Mail, Telefon)"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") fetchAccepted();
              }}
            />
            <Button variant="outlined" onClick={() => fetchAccepted()}>
              Suchen
            </Button>
          </Stack>
        </Stack>

        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}

        {loading ? (
          <Box textAlign="center" py={4}>
            <CircularProgress />
          </Box>
        ) : (
          <TableContainer sx={{ mt: 2 }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell padding="checkbox">
                    <Checkbox
                      indeterminate={
                        items.length > 0 && !allChecked && anyChecked
                      }
                      checked={allChecked}
                      onChange={(e) => toggleAll(e.target.checked)}
                    />
                  </TableCell>
                  <TableCell>Gast</TableCell>
                  <TableCell>Event</TableCell>
                  <TableCell>Kontakt</TableCell>
                  <TableCell>Platz</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="right">Aktionen</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center">
                      Keine Einträge gefunden.
                    </TableCell>
                  </TableRow>
                ) : (
                  items.map((inv) => {
                    const checked = !!selected[inv.id];
                    return (
                      <TableRow key={inv.id} hover selected={checked}>
                        <TableCell padding="checkbox">
                          <Checkbox
                            checked={checked}
                            onChange={(e) =>
                              toggleRow(inv.id, e.target.checked)
                            }
                          />
                        </TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>
                          {nameOf(inv.guest)}
                        </TableCell>
                        <TableCell>{eventNameOf(inv.event)}</TableCell>
                        <TableCell>
                          <div>{inv.guest.email || "–"}</div>
                          <div style={{ fontSize: 12, color: "#666" }}>
                            {inv.guest.phone || ""}
                          </div>
                        </TableCell>
                        <TableCell>{seatOf(inv.ticket)}</TableCell>
                        <TableCell>
                          <Chip label="Zugesagt" color="success" size="small" />
                        </TableCell>
                        <TableCell align="right">
                          <Stack
                            direction="row"
                            spacing={0.5}
                            justifyContent="flex-end"
                          >
                            <Tooltip title="QR anzeigen">
                              <IconButton
                                onClick={() => openPreviewForInvitation(inv)}
                              >
                                <QrCode2RoundedIcon />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="WhatsApp öffnen">
                              <span>
                                <IconButton
                                  disabled={
                                    !inv.guest.phone && !inv.guest.email
                                  }
                                  onClick={() =>
                                    window.open(
                                      buildWhatsAppUrl(
                                        buildWhatsAppMessage(inv)
                                      ),
                                      "_blank",
                                      "noopener,noreferrer"
                                    )
                                  }
                                >
                                  <WhatsAppIcon />
                                </IconButton>
                              </span>
                            </Tooltip>
                            <Tooltip title="E‑Mail">
                              <span>
                                <IconButton
                                  disabled={!inv.guest.email}
                                  onClick={() =>
                                    (window.location.href = buildMailto(inv))
                                  }
                                >
                                  <EmailIcon />
                                </IconButton>
                              </span>
                            </Tooltip>
                          </Stack>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        {/* Batch-Aktionen */}
        <Stack
          direction="row"
          gap={1}
          justifyContent="space-between"
          alignItems="center"
          sx={{ mt: 2, flexWrap: "wrap" }}
        >
          <Typography variant="body2" color="text.secondary">
            Ausgewählt: {Object.values(selected).filter(Boolean).length} /{" "}
            {items.length}
          </Typography>
          <Stack direction="row" gap={1}>
            <Button
              variant="outlined"
              startIcon={<WhatsAppIcon />}
              disabled={!anyChecked}
              onClick={() => {
                // Batch: Einfacher Sammeltext mit Links zur WebApp (ohne Bildanhang)
                const chosen = items.filter((i) => selected[i.id]);
                const lines: string[] = [];
                lines.push(
                  `Einlass-QR – ${direction === "IN" ? "Eingang" : "Ausgang"}`
                );
                lines.push("");
                const origin =
                  typeof window !== "undefined"
                    ? window.location.origin
                    : "https://example.com";
                chosen.forEach((i) => {
                  lines.push(`• ${nameOf(i.guest)} – ${origin}/my-qr`);
                });
                const msg = lines.join("\n");
                window.open(
                  buildWhatsAppUrl(msg),
                  "_blank",
                  "noopener,noreferrer"
                );
              }}
            >
              Batch WhatsApp
            </Button>

            <Button
              variant="outlined"
              startIcon={<ContentCopyRoundedIcon />}
              disabled={!anyChecked}
              onClick={async () => {
                const chosen = items.filter((i) => selected[i.id]);
                const origin =
                  typeof window !== "undefined"
                    ? window.location.origin
                    : "https://example.com";
                const text = chosen
                  .map((i) => `${nameOf(i.guest)} – ${origin}/my-qr`)
                  .join("\n");
                try {
                  await navigator.clipboard.writeText(text);
                  alert("In Zwischenablage kopiert");
                } catch {
                  alert("Kopieren fehlgeschlagen");
                }
              }}
            >
              Batch kopieren
            </Button>
          </Stack>
        </Stack>

        {/* QR Preview Dialog */}
        <Dialog
          open={previewOpen}
          onClose={() => setPreviewOpen(false)}
          fullWidth
          maxWidth="xs"
        >
          <DialogTitle>
            Signierter QR‑Code ({direction === "IN" ? "Einlass" : "Auslass"})
          </DialogTitle>
          <DialogContent dividers>
            <Stack alignItems="center" gap={2} sx={{ py: 1 }}>
              <ToggleButtonGroup
                size="small"
                value={direction}
                exclusive
                onChange={(_, v) => v && setDirection(v)}
              >
                <ToggleButton value="IN">Einlass</ToggleButton>
                <ToggleButton value="OUT">Auslass</ToggleButton>
              </ToggleButtonGroup>

              {previewLoading && <CircularProgress />}

              {previewError && (
                <Alert severity="error" sx={{ width: "100%" }}>
                  {previewError}
                </Alert>
              )}

              {previewQr && (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={previewQr.qr}
                    alt="Ticket QR"
                    style={{
                      width: 280,
                      height: 280,
                      background: "#fff",
                      padding: 8,
                      borderRadius: 16,
                    }}
                  />
                  <Typography variant="caption" color="text.secondary">
                    Token läuft in {previewQr.expiresInSeconds}s ab.
                  </Typography>
                  <Stack direction="row" gap={1}>
                    <Button
                      startIcon={<RefreshRoundedIcon />}
                      onClick={refreshPreview}
                    >
                      Neu generieren
                    </Button>
                    <Button
                      startIcon={<DownloadRoundedIcon />}
                      onClick={() =>
                        downloadDataUrl(
                          previewQr.qr,
                          `ticket-${previewQr.ticketId}-${direction}.png`
                        )
                      }
                    >
                      PNG speichern
                    </Button>
                  </Stack>
                </>
              )}
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setPreviewOpen(false)}>Schließen</Button>
          </DialogActions>
        </Dialog>
      </CardContent>
    </Card>
  );
}
