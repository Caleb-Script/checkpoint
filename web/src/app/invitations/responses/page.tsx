// /Users/gentlebookpro/Projekte/checkpoint/web/src/app/invitations/responses/page.tsx
"use client";

import * as React from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Stack,
  Button,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Chip,
  Alert,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Checkbox,
  Tooltip,
} from "@mui/material";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import CancelRoundedIcon from "@mui/icons-material/CancelRounded";
import EventSeatRoundedIcon from "@mui/icons-material/EventSeatRounded";
import LinkRoundedIcon from "@mui/icons-material/LinkRounded";
import ContentCopyRoundedIcon from "@mui/icons-material/ContentCopyRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import WhatsAppIcon from "@mui/icons-material/WhatsApp";
import { format } from "date-fns";
import de from "date-fns/locale/de";
import { useRouter } from "next/navigation";
import { useSession } from "@/context/SessionContext";

type Item = {
  id: string;
  createdAt: string;
  rsvpChoice: "YES" | "NO" | null;
  rsvpAt: string | null;
  approved: boolean;
  approvedAt: string | null;
  status: "PENDING" | "ACCEPTED" | "DECLINED" | "CANCELED";
  guestProfile: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    primaryEmail: string | null;
    phone: string | null;
  };
  ticket: {
    id: string;
    seat?: {
      section: string | null;
      row: string | null;
      number: string | null;
    } | null;
  } | null;
  event: { id: string; name: string; startsAt: string };
  approvedBy?: {
    id: string;
    name?: string | null;
    email?: string | null;
  } | null;
};

type ShareInfo = {
  ok: true;
  invitationId: string;
  event: { id: string; name: string };
  guest: {
    firstName: string | null;
    lastName: string | null;
    primaryEmail: string | null;
  } | null;
  maxInvitees: number;
  used: number;
  remaining: number;
  shareCode: string | null;
  shareLink: string | null;
};

export default function InvitationResponsesPage() {
  const { loading, isAuthenticated, roles } = useSession();
  const router = useRouter();
  const isAdmin = roles.includes("admin") || roles.includes("security");

  const [eventId, setEventId] = React.useState("");
  const [items, setItems] = React.useState<Item[]>([]);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Auswahl
  const [selected, setSelected] = React.useState<Record<string, boolean>>({});

  // Sitz-Dialog (Approve mit Sitz)
  const [seatDlg, setSeatDlg] = React.useState<{
    open: boolean;
    invitationId?: string;
    section?: string;
    row?: string;
    number?: string;
  }>({ open: false });

  // Share-Dialog (Quota + Link)
  const [shareDlg, setShareDlg] = React.useState<{
    open: boolean;
    invitationId?: string;
    maxInvitees?: number;
    shareLink?: string | null;
    shareCode?: string | null;
    used?: number;
    remaining?: number;
  }>({ open: false });

  // Batch Versand Optionen
  const [seatAll, setSeatAll] = React.useState<{
    section?: string;
    row?: string;
    number?: string;
  }>({});
  const [webBaseUrl, setWebBaseUrl] = React.useState<string>("");
  const [profilePath, setProfilePath] = React.useState<string>("/my-qr");
  const [appStoreUrl, setAppStoreUrl] = React.useState<string>(
    "https://apps.apple.com/de/app/"
  );
  const [playStoreUrl, setPlayStoreUrl] = React.useState<string>(
    "https://play.google.com/store/apps/details?id="
  );
  const [waResults, setWaResults] = React.useState<
    {
      invitationId: string;
      waLink: string;
      imageUrl: string;
      profileUrl: string;
      phone?: string | null;
    }[]
  >([]);

  React.useEffect(() => {
    // Default Base: Origin
    if (typeof window !== "undefined") {
      setWebBaseUrl(window.location.origin);
    }
  }, []);

  const load = async () => {
    setBusy(true);
    setError(null);
    try {
      const url = new URL("/api/invitations/responses", window.location.origin);
      if (eventId) url.searchParams.set("eventId", eventId);
      url.searchParams.set("rsvp", "YES");
      url.searchParams.set("approved", "false");
      url.searchParams.set("limit", "200");
      const res = await fetch(url, { credentials: "include" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Fehler beim Laden");
      setItems(data.items || []);
      setSelected({});
      setWaResults([]);
    } catch (e: any) {
      setError(e?.message || "Unbekannter Fehler");
    } finally {
      setBusy(false);
    }
  };

  const approve = async (
    invitationId: string,
    seat?: { section?: string; row?: string; number?: string }
  ) => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/invitations/approve", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invitationId, seat }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Freigabe fehlgeschlagen");
      setItems((prev) => prev.filter((x) => x.id !== invitationId));
      setSelected((prev) => {
        const next = { ...prev };
        delete next[invitationId];
        return next;
      });
    } catch (e: any) {
      setError(e?.message || "Unbekannter Fehler");
    } finally {
      setBusy(false);
    }
  };

  const reject = async (invitationId: string) => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/invitations/reject", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invitationId, revokeTicket: true }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Ablehnung fehlgeschlagen");
      setItems((prev) => prev.filter((x) => x.id !== invitationId));
      setSelected((prev) => {
        const next = { ...prev };
        delete next[invitationId];
        return next;
      });
    } catch (e: any) {
      setError(e?.message || "Unbekannter Fehler");
    } finally {
      setBusy(false);
    }
  };

  const fetchShareInfo = async (invitationId: string) => {
    const base = webBaseUrl || window.location.origin;
    const res = await fetch(
      `/api/invitations/share?invitationId=${encodeURIComponent(invitationId)}&base=${encodeURIComponent(base)}`,
      { credentials: "include" }
    );
    const data = (await res.json()) as ShareInfo | any;
    if (!res.ok || !data?.ok)
      throw new Error(data?.error || "Fehler beim Laden des Share-Status");
    return data as ShareInfo;
  };

  const openShareDialog = async (invitationId: string) => {
    try {
      const info = await fetchShareInfo(invitationId);
      setShareDlg({
        open: true,
        invitationId,
        maxInvitees: info.maxInvitees,
        shareLink: info.shareLink,
        shareCode: info.shareCode,
        used: info.used,
        remaining: info.remaining,
      });
    } catch (e: any) {
      setError(e?.message || "Share-Status konnte nicht geladen werden");
    }
  };

  const saveShareDialog = async (rotate = false) => {
    if (!shareDlg.invitationId) return;
    try {
      const res = await fetch("/api/invitations/share", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invitationId: shareDlg.invitationId,
          maxInvitees:
            shareDlg.maxInvitees !== undefined
              ? Math.max(0, Math.floor(shareDlg.maxInvitees))
              : undefined,
          rotate,
          base: webBaseUrl || window.location.origin,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data?.ok)
        throw new Error(data?.error || "Speichern fehlgeschlagen");
      setShareDlg({
        open: true,
        invitationId: data.invitationId,
        maxInvitees: data.maxInvitees,
        shareLink: data.shareLink,
        shareCode: data.shareCode,
        used: data.used,
        remaining: data.remaining,
      });
    } catch (e: any) {
      setError(e?.message || "Fehler beim Speichern des Share-Links");
    }
  };

  const selectedIds = React.useMemo(
    () =>
      Object.entries(selected)
        .filter(([_, v]) => v)
        .map(([k]) => k),
    [selected]
  );
  const allChecked = items.length > 0 && selectedIds.length === items.length;
  const someChecked =
    selectedIds.length > 0 && selectedIds.length < items.length;

  const toggleAll = (val: boolean) => {
    const next: Record<string, boolean> = {};
    if (val) items.forEach((x) => (next[x.id] = true));
    setSelected(next);
  };

  const batchSend = async () => {
    if (selectedIds.length === 0) return;
    setBusy(true);
    setError(null);
    setWaResults([]);
    try {
      const res = await fetch("/api/tickets/send", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invitationIds: selectedIds,
          seat: seatAll,
          webBaseUrl,
          profilePath,
          appStoreUrl,
          playStoreUrl,
          sendWhatsApp: true,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data?.ok)
        throw new Error(data?.error || "Versand fehlgeschlagen");
      const rows = (data.results || [])
        .filter((r: any) => r.ok)
        .map((r: any) => ({
          invitationId: r.invitationId,
          waLink: r.waLink,
          imageUrl: r.imageUrl,
          profileUrl: r.profileUrl,
          phone: r.phone || null,
        }));
      setWaResults(rows);
    } catch (e: any) {
      setError(e?.message || "Unbekannter Fehler beim Versand");
    } finally {
      setBusy(false);
    }
  };

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // noop
    }
  };

  if (loading) {
    return (
      <Box textAlign="center" mt={4}>
        <CircularProgress />
      </Box>
    );
  }
  if (!isAuthenticated) {
    router.push(`/login?next=${encodeURIComponent("/invitations/responses")}`);
    return null;
  }
  if (!isAdmin) {
    return (
      <Box mt={4}>
        <Alert severity="error">Kein Zugriff – nur Security/Admin.</Alert>
      </Box>
    );
  }

  return (
    <Card>
      <CardContent>
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          sx={{ mb: 2 }}
        >
          <Typography variant="h6" fontWeight={800}>
            RSVP‑Antworten – Freigabe & Versand
          </Typography>
          <IconButton onClick={load} disabled={busy} aria-label="Neu laden">
            <RefreshRoundedIcon />
          </IconButton>
        </Stack>

        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={1}
          alignItems="center"
          mb={2}
        >
          <TextField
            label="Event‑ID (optional filtern)"
            value={eventId}
            onChange={(e) => setEventId(e.target.value)}
            size="small"
            fullWidth
          />
          <Button variant="contained" onClick={load} disabled={busy}>
            {busy ? "Lade …" : "Laden"}
          </Button>
        </Stack>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {/* Batch‑Versand Optionen */}
        <Stack spacing={1.5} sx={{ mb: 2 }}>
          <Typography variant="subtitle2">
            Batch‑Versand Optionen (für ausgewählte Einträge)
          </Typography>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
            <TextField
              label="Sitz Sektion (alle)"
              value={seatAll.section || ""}
              onChange={(e) =>
                setSeatAll((p) => ({
                  ...p,
                  section: e.target.value || undefined,
                }))
              }
              size="small"
              fullWidth
            />
            <TextField
              label="Sitz Reihe (alle)"
              value={seatAll.row || ""}
              onChange={(e) =>
                setSeatAll((p) => ({ ...p, row: e.target.value || undefined }))
              }
              size="small"
              fullWidth
            />
            <TextField
              label="Sitz Platz (alle)"
              value={seatAll.number || ""}
              onChange={(e) =>
                setSeatAll((p) => ({
                  ...p,
                  number: e.target.value || undefined,
                }))
              }
              size="small"
              fullWidth
            />
          </Stack>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
            <TextField
              label="Web‑Base URL"
              helperText="z. B. https://… (wird für Bild/Profil‑Links verwendet)"
              value={webBaseUrl}
              onChange={(e) => setWebBaseUrl(e.target.value)}
              size="small"
              fullWidth
            />
            <TextField
              label="Profil‑Pfad"
              value={profilePath}
              onChange={(e) => setProfilePath(e.target.value)}
              size="small"
              fullWidth
            />
          </Stack>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
            <TextField
              label="App Store (iOS)"
              value={appStoreUrl}
              onChange={(e) => setAppStoreUrl(e.target.value)}
              size="small"
              fullWidth
            />
            <TextField
              label="Play Store (Android)"
              value={playStoreUrl}
              onChange={(e) => setPlayStoreUrl(e.target.value)}
              size="small"
              fullWidth
            />
          </Stack>
          <Stack direction="row" spacing={1}>
            <Button
              variant="contained"
              startIcon={<WhatsAppIcon />}
              disabled={busy || selectedIds.length === 0}
              onClick={batchSend}
            >
              Tickets via WhatsApp vorbereiten ({selectedIds.length})
            </Button>
          </Stack>
          {waResults.length > 0 && (
            <Alert severity="success">
              {waResults.length} WhatsApp‑Links wurden erzeugt. Klicke auf den
              Link‑Button in der Tabelle, um pro Gast zu öffnen/kopieren.
            </Alert>
          )}
        </Stack>

        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell padding="checkbox">
                <Checkbox
                  checked={allChecked}
                  indeterminate={someChecked}
                  onChange={(e) => toggleAll(e.target.checked)}
                />
              </TableCell>
              <TableCell>Datum</TableCell>
              <TableCell>Gast</TableCell>
              <TableCell>Kontakt</TableCell>
              <TableCell>Event</TableCell>
              <TableCell>RSVP</TableCell>
              <TableCell>Ticket/Sitz</TableCell>
              <TableCell align="right">Aktion</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} align="center">
                  {busy ? "Lade …" : "Keine Einträge"}
                </TableCell>
              </TableRow>
            ) : (
              items.map((it) => {
                const g = it.guestProfile;
                const seat = it.ticket?.seat;
                const seatText = seat
                  ? [seat.section, seat.row, seat.number]
                      .filter(Boolean)
                      .join(" ")
                  : "—";
                const checked = !!selected[it.id];
                const wa = waResults.find((w) => w.invitationId === it.id);

                return (
                  <TableRow key={it.id} hover>
                    <TableCell padding="checkbox">
                      <Checkbox
                        checked={checked}
                        onChange={(e) =>
                          setSelected((p) => ({
                            ...p,
                            [it.id]: e.target.checked,
                          }))
                        }
                      />
                    </TableCell>
                    <TableCell>
                      {format(
                        new Date(it.rsvpAt || it.createdAt),
                        "dd.MM.y HH:mm",
                        { locale: de }
                      )}
                    </TableCell>
                    <TableCell>
                      <Typography fontWeight={600}>
                        {[g.firstName, g.lastName].filter(Boolean).join(" ") ||
                          "Gast"}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {g.primaryEmail || "—"}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {g.phone || "—"}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{it.event.name}</Typography>
                    </TableCell>
                    <TableCell>
                      {it.rsvpChoice === "YES" ? (
                        <Chip size="small" color="success" label="Zusage" />
                      ) : it.rsvpChoice === "NO" ? (
                        <Chip size="small" color="error" label="Absage" />
                      ) : (
                        <Chip size="small" label="—" />
                      )}
                    </TableCell>
                    <TableCell>
                      {it.ticket ? (
                        <Chip
                          size="small"
                          icon={<EventSeatRoundedIcon />}
                          label={seatText}
                        />
                      ) : (
                        <Chip size="small" label="Kein Ticket" />
                      )}
                    </TableCell>
                    <TableCell align="right">
                      <Stack
                        direction="row"
                        spacing={1}
                        justifyContent="flex-end"
                      >
                        <Tooltip title="Share‑Link & Kontingent">
                          <IconButton onClick={() => openShareDialog(it.id)}>
                            <LinkRoundedIcon />
                          </IconButton>
                        </Tooltip>
                        {wa ? (
                          <>
                            <Tooltip title="WhatsApp öffnen">
                              <IconButton
                                onClick={() =>
                                  window.open(
                                    wa.waLink,
                                    "_blank",
                                    "noopener,noreferrer"
                                  )
                                }
                              >
                                <WhatsAppIcon color="success" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="wa.me Link kopieren">
                              <IconButton onClick={() => copy(wa.waLink)}>
                                <ContentCopyRoundedIcon />
                              </IconButton>
                            </Tooltip>
                          </>
                        ) : null}
                        <Button
                          size="small"
                          variant="outlined"
                          startIcon={<EventSeatRoundedIcon />}
                          onClick={() =>
                            setSeatDlg({
                              open: true,
                              invitationId: it.id,
                              section: seat?.section ?? "",
                              row: seat?.row ?? "",
                              number: seat?.number ?? "",
                            })
                          }
                        >
                          Sitz + Freigeben
                        </Button>
                        <Button
                          size="small"
                          variant="contained"
                          color="success"
                          startIcon={<CheckCircleRoundedIcon />}
                          onClick={() => approve(it.id)}
                        >
                          Freigeben
                        </Button>
                        <Button
                          size="small"
                          variant="outlined"
                          color="error"
                          startIcon={<CancelRoundedIcon />}
                          onClick={() => reject(it.id)}
                        >
                          Ablehnen
                        </Button>
                      </Stack>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </CardContent>

      {/* Sitz-Dialog */}
      <Dialog
        open={seatDlg.open}
        onClose={() => setSeatDlg({ open: false })}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>Sitz vergeben & freigeben</DialogTitle>
        <DialogContent>
          <Stack spacing={1.5} mt={1}>
            <TextField
              label="Sektion"
              value={seatDlg.section || ""}
              onChange={(e) =>
                setSeatDlg((d) => ({ ...d, section: e.target.value }))
              }
              fullWidth
            />
            <TextField
              label="Reihe"
              value={seatDlg.row || ""}
              onChange={(e) =>
                setSeatDlg((d) => ({ ...d, row: e.target.value }))
              }
              fullWidth
            />
            <TextField
              label="Platz"
              value={seatDlg.number || ""}
              onChange={(e) =>
                setSeatDlg((d) => ({ ...d, number: e.target.value }))
              }
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSeatDlg({ open: false })}>Abbrechen</Button>
          <Button
            variant="contained"
            onClick={async () => {
              const id = seatDlg.invitationId!;
              await approve(id, {
                section: seatDlg.section || undefined,
                row: seatDlg.row || undefined,
                number: seatDlg.number || undefined,
              });
              setSeatDlg({ open: false });
            }}
          >
            Freigeben
          </Button>
        </DialogActions>
      </Dialog>

      {/* Share-Dialog */}
      <Dialog
        open={shareDlg.open}
        onClose={() => setShareDlg({ open: false })}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Share‑Link & Kontingent</DialogTitle>
        <DialogContent>
          <Stack spacing={1.5} mt={1}>
            <TextField
              label="Max. weitere Einladungen (Kontingent)"
              type="number"
              value={shareDlg.maxInvitees ?? 0}
              onChange={(e) =>
                setShareDlg((d) => ({
                  ...d,
                  maxInvitees: Number(e.target.value || 0),
                }))
              }
              fullWidth
            />
            <Stack direction="row" spacing={1}>
              <Chip label={`Belegt: ${shareDlg.used ?? 0}`} size="small" />
              <Chip
                color="success"
                label={`Frei: ${shareDlg.remaining ?? 0}`}
                size="small"
              />
            </Stack>
            <TextField
              label="Share‑Link"
              value={shareDlg.shareLink || ""}
              InputProps={{ readOnly: true }}
              fullWidth
            />
            <Stack direction="row" spacing={1}>
              <Button
                variant="outlined"
                startIcon={<ContentCopyRoundedIcon />}
                onClick={() =>
                  shareDlg.shareLink &&
                  navigator.clipboard.writeText(shareDlg.shareLink)
                }
                disabled={!shareDlg.shareLink}
              >
                Link kopieren
              </Button>
              <Button
                variant="text"
                startIcon={<RefreshRoundedIcon />}
                onClick={() => saveShareDialog(true)}
              >
                Code rotieren
              </Button>
            </Stack>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShareDlg({ open: false })}>
            Schließen
          </Button>
          <Button variant="contained" onClick={() => saveShareDialog(false)}>
            Speichern
          </Button>
        </DialogActions>
      </Dialog>
    </Card>
  );
}
