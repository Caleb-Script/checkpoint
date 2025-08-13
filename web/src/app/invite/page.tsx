// /Users/gentlebookpro/Projekte/checkpoint/web/src/app/invite/page.tsx
"use client";

import * as React from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Stack,
  TextField,
  Button,
  Alert,
  ToggleButtonGroup,
  ToggleButton,
  Divider,
  CircularProgress,
  Chip,
} from "@mui/material";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import CancelRoundedIcon from "@mui/icons-material/CancelRounded";
import EventSeatRoundedIcon from "@mui/icons-material/EventSeatRounded";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";

type ClaimStatus =
  | {
      ok: true;
      hostInvitationId: string;
      event: { id: string; name: string; startsAt?: string | null };
      hostName: string;
      maxInvitees: number;
      used: number;
      remaining: number;
    }
  | { ok: false; error: string };

export default function InviteClaimPage() {
  const params = useSearchParams();
  const router = useRouter();
  const code = params.get("code") || "";

  const [loading, setLoading] = React.useState(true);
  const [status, setStatus] = React.useState<ClaimStatus | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  // Formularfelder
  const [firstName, setFirstName] = React.useState("");
  const [lastName, setLastName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [decision, setDecision] = React.useState<"YES" | "NO" | null>("YES");

  // Sitzwunsch (optional)
  const [seatSection, setSeatSection] = React.useState("");
  const [seatRow, setSeatRow] = React.useState("");
  const [seatNumber, setSeatNumber] = React.useState("");

  const [submitting, setSubmitting] = React.useState(false);
  const [saved, setSaved] = React.useState(false);
  const [warn, setWarn] = React.useState<string>("");

  React.useEffect(() => {
    let ignore = false;
    const load = async () => {
      if (!code) {
        setStatus({ ok: false, error: "Code fehlt." });
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(
          `/api/invite/claim?code=${encodeURIComponent(code)}`,
          {
            credentials: "include",
          }
        );
        const data = (await res.json()) as ClaimStatus;
        if (!ignore) {
          setStatus(data);
          if (!res.ok || !data.ok) {
            setError((data as any)?.error || "Ungültiger Link.");
          }
        }
      } catch (e: any) {
        if (!ignore) {
          setStatus({ ok: false, error: e?.message || "Netzwerkfehler" });
          setError(e?.message || "Netzwerkfehler");
        }
      } finally {
        if (!ignore) setLoading(false);
      }
    };
    load();
    return () => {
      ignore = true;
    };
  }, [code]);

  const onSubmit = async () => {
    if (!status?.ok) return;
    if (!decision) {
      setWarn("Bitte wähle Zusage oder Absage.");
      return;
    }
    if (!email && !phone) {
      setWarn("Bitte gib mindestens E‑Mail oder Telefon an.");
      return;
    }
    setWarn("");
    setSubmitting(true);
    try {
      const res = await fetch("/api/invite/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          code,
          guest: {
            firstName: firstName || undefined,
            lastName: lastName || undefined,
            email: email || undefined,
            phone: phone || undefined,
          },
          rsvp: decision,
          seatWish:
            seatSection || seatRow || seatNumber
              ? {
                  section: seatSection || undefined,
                  row: seatRow || undefined,
                  number: seatNumber || undefined,
                }
              : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data?.ok) {
        setError(data?.error || "Fehler beim Absenden.");
        return;
      }
      setSaved(true);
      // Optional: Felder leeren
      setFirstName("");
      setLastName("");
      setEmail("");
      setPhone("");
      setSeatSection("");
      setSeatRow("");
      setSeatNumber("");
    } catch (e: any) {
      setError(e?.message || "Unbekannter Fehler.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Box textAlign="center" mt={4}>
        <CircularProgress />
      </Box>
    );
  }

  if (!status?.ok) {
    return (
      <Card sx={{ maxWidth: 560, mx: "auto", mt: 4 }}>
        <CardContent>
          <Typography variant="h6" fontWeight={800} gutterBottom>
            Einladung
          </Typography>
          <Alert severity="error">
            {status?.error || error || "Ungültiger Link."}
          </Alert>
          <Button
            sx={{ mt: 2 }}
            variant="outlined"
            startIcon={<ArrowBackRoundedIcon />}
            onClick={() => router.push("/")}
          >
            Zur Startseite
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (saved) {
    const isYes = decision === "YES";
    return (
      <Card sx={{ maxWidth: 560, mx: "auto", mt: 4 }}>
        <CardContent>
          <Stack spacing={2} alignItems="center">
            {isYes ? (
              <>
                <CheckCircleRoundedIcon color="success" sx={{ fontSize: 48 }} />
                <Typography variant="h6" fontWeight={800}>
                  Danke – RSVP gespeichert!
                </Typography>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  textAlign="center"
                >
                  Deine Zusage wurde erfasst. Das Team prüft und schaltet ggf.
                  dein Ticket frei.
                </Typography>
              </>
            ) : (
              <>
                <CancelRoundedIcon color="error" sx={{ fontSize: 48 }} />
                <Typography variant="h6" fontWeight={800}>
                  RSVP gespeichert
                </Typography>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  textAlign="center"
                >
                  Deine Absage wurde erfasst.
                </Typography>
              </>
            )}
            <Button
              startIcon={<ArrowBackRoundedIcon />}
              variant="outlined"
              onClick={() => router.push("/")}
            >
              Zur Startseite
            </Button>
          </Stack>
        </CardContent>
      </Card>
    );
  }

  const remaining = status.remaining;
  const full = remaining <= 0;

  return (
    <Card sx={{ maxWidth: 560, mx: "auto", mt: 2 }}>
      <CardContent>
        <Stack spacing={2}>
          <Typography variant="h6" fontWeight={800} textAlign="center">
            Einladung zu „{status.event.name}“
          </Typography>
          <Typography variant="body2" color="text.secondary" textAlign="center">
            Eingeladen von: <strong>{status.hostName}</strong>
          </Typography>

          <Stack direction="row" spacing={1} justifyContent="center">
            <Chip label={`Max: ${status.maxInvitees}`} size="small" />
            <Chip label={`Belegt: ${status.used}`} size="small" />
            <Chip
              color={full ? "default" : "success"}
              label={`Frei: ${remaining}`}
              size="small"
            />
          </Stack>

          {full && (
            <Alert severity="warning">
              Das Kontingent ist leider erschöpft. Du kannst aktuell keine
              weitere Person anmelden.
            </Alert>
          )}

          <Divider />

          <Typography variant="subtitle2" sx={{ mt: 1 }}>
            Deine Angaben
          </Typography>

          <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
            <TextField
              label="Vorname"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              fullWidth
              autoComplete="given-name"
            />
            <TextField
              label="Nachname"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              fullWidth
              autoComplete="family-name"
            />
          </Stack>

          <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
            <TextField
              label="E‑Mail"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              fullWidth
              autoComplete="email"
            />
            <TextField
              label="Telefon"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              fullWidth
              placeholder="+4917…"
              autoComplete="tel"
            />
          </Stack>

          <Typography variant="subtitle2">Teilnahme</Typography>
          <ToggleButtonGroup
            value={decision}
            exclusive
            onChange={(_, v) => setDecision(v)}
            fullWidth
          >
            <ToggleButton value="YES">👍 Zusagen</ToggleButton>
            <ToggleButton value="NO">👎 Absagen</ToggleButton>
          </ToggleButtonGroup>

          <Divider />

          <Typography variant="subtitle2">Optionaler Sitzwunsch</Typography>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
            <TextField
              label="Sektion"
              value={seatSection}
              onChange={(e) => setSeatSection(e.target.value)}
              fullWidth
            />
            <TextField
              label="Reihe"
              value={seatRow}
              onChange={(e) => setSeatRow(e.target.value)}
              fullWidth
            />
            <TextField
              label="Platz"
              value={seatNumber}
              onChange={(e) => setSeatNumber(e.target.value)}
              fullWidth
            />
          </Stack>

          {warn && <Alert severity="warning">{warn}</Alert>}
          {error && <Alert severity="error">{error}</Alert>}

          <Button
            variant="contained"
            size="large"
            startIcon={<EventSeatRoundedIcon />}
            disabled={submitting || full}
            onClick={onSubmit}
          >
            {submitting ? <CircularProgress size={18} sx={{ mr: 1 }} /> : null}
            Antwort senden
          </Button>

          <Typography
            variant="caption"
            color="text.secondary"
            textAlign="center"
          >
            Hinweis: Deine Zusage bedeutet noch kein Ticket. Das Team prüft und
            schaltet ggf. frei.
          </Typography>

          <Box textAlign="center" mt={1}>
            <Button
              variant="text"
              size="small"
              startIcon={<ArrowBackRoundedIcon />}
              onClick={() => router.push("/")}
            >
              Zur Startseite
            </Button>
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );
}
