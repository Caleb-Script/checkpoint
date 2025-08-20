// /Users/gentlebookpro/Projekte/checkpoint/web/src/app/invitations/responses/client/page.tsx
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
  IconButton,
  Switch,
  FormControlLabel,
} from "@mui/material";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import EventSeatRoundedIcon from "@mui/icons-material/EventSeatRounded";
import ShieldRoundedIcon from "@mui/icons-material/ShieldRounded";
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
};

export default function InvitationResponsesClientPage() {
  const router = useRouter();
  const { loading, isAuthenticated } = useSession(); // bewusst: keine Rollenprüfung (read-only Anzeige)

  const [eventId, setEventId] = React.useState<string>("");
  const [q, setQ] = React.useState<string>("");
  const [items, setItems] = React.useState<Item[]>([]);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = React.useState<boolean>(true);

  const filtered = React.useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return items;
    return items.filter((it) => {
      const g = it.guestProfile;
      const name = [g.firstName, g.lastName]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      const seat = it.ticket?.seat
        ? [it.ticket.seat.section, it.ticket.seat.row, it.ticket.seat.number]
            .filter(Boolean)
            .join(" ")
            .toLowerCase()
        : "";
      return (
        name.includes(needle) ||
        (g.primaryEmail || "").toLowerCase().includes(needle) ||
        (g.phone || "").toLowerCase().includes(needle) ||
        seat.includes(needle)
      );
    });
  }, [q, items]);

  const load = React.useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const url = new URL("/api/invitations/responses", window.location.origin);
      if (eventId) url.searchParams.set("eventId", eventId);
      url.searchParams.set("rsvp", "YES");
      url.searchParams.set("approved", "true");
      url.searchParams.set("limit", "200");
      const res = await fetch(url, { credentials: "include" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Fehler beim Laden");
      setItems(data.items || []);
    } catch (e: any) {
      setError(e?.message || "Unbekannter Fehler");
    } finally {
      setBusy(false);
    }
  }, [eventId]);

  React.useEffect(() => {
    if (isAuthenticated) load();
  }, [isAuthenticated, load]);

  React.useEffect(() => {
    if (!autoRefresh) return;
    const t = setInterval(() => {
      if (!document.hidden) load();
    }, 15000);
    return () => clearInterval(t);
  }, [autoRefresh, load]);

  if (loading) {
    return (
      <Box textAlign="center" mt={4}>
        <CircularProgress />
      </Box>
    );
  }

  if (!isAuthenticated) {
    router.push(
      `/login?next=${encodeURIComponent("/invitations/responses/client")}`,
    );
    return null;
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
          <Stack direction="row" spacing={1} alignItems="center">
            <ShieldRoundedIcon />
            <Typography variant="h6" fontWeight={800}>
              Freigegebene Gäste (Read‑only)
            </Typography>
          </Stack>
          <IconButton onClick={load} disabled={busy} aria-label="Neu laden">
            <RefreshRoundedIcon />
          </IconButton>
        </Stack>

        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={1}
          alignItems="center"
          sx={{ mb: 2 }}
        >
          <TextField
            label="Event‑ID (optional)"
            value={eventId}
            onChange={(e) => setEventId(e.target.value)}
            size="small"
            fullWidth
          />
          <TextField
            label="Suche (Name, E‑Mail, Telefon, Sitz)"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            size="small"
            fullWidth
            InputProps={{
              startAdornment: (
                <SearchRoundedIcon fontSize="small" sx={{ mr: 1 }} />
              ),
            }}
          />
          <FormControlLabel
            control={
              <Switch
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                color="primary"
              />
            }
            label="Auto‑Refresh"
          />
        </Stack>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Uhrzeit</TableCell>
              <TableCell>Gast</TableCell>
              <TableCell>Kontakt</TableCell>
              <TableCell>Event</TableCell>
              <TableCell>RSVP</TableCell>
              <TableCell>Sitz</TableCell>
              <TableCell>Status</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  {busy ? "Lade …" : "Keine Einträge"}
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((it) => {
                const g = it.guestProfile;
                const seat = it.ticket?.seat;
                const seatText = seat
                  ? [seat.section, seat.row, seat.number]
                      .filter(Boolean)
                      .join(" ")
                  : "—";
                return (
                  <TableRow key={it.id} hover>
                    <TableCell>
                      {format(
                        new Date(it.approvedAt || it.rsvpAt || it.createdAt),
                        "dd.MM.y HH:mm",
                        {
                          locale: de,
                        },
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
                      <Chip
                        size="small"
                        icon={<EventSeatRoundedIcon />}
                        label={seatText}
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>
                      {it.approved ? (
                        <Chip
                          size="small"
                          color="primary"
                          label="Freigegeben"
                        />
                      ) : (
                        <Chip size="small" label="—" />
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>

        <Typography
          variant="caption"
          color="text.secondary"
          display="block"
          sx={{ mt: 2 }}
        >
          Tipp: Diese Ansicht ist nur Anzeige. Scannen weiterhin unter „Scanner“
          nutzen.
        </Typography>
      </CardContent>
    </Card>
  );
}
