// /Users/gentlebookpro/Projekte/checkpoint/web/src/app/rsvp/page.tsx
"use client";

import * as React from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  Typography,
  Stack,
  TextField,
  Button,
  ToggleButtonGroup,
  ToggleButton,
  Alert,
  CircularProgress,
} from "@mui/material";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import CancelRoundedIcon from "@mui/icons-material/CancelRounded";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";

export default function RsvpPage() {
  const params = useSearchParams();
  const router = useRouter();

  const [firstName, setFirstName] = React.useState(params.get("first") || "");
  const [lastName, setLastName] = React.useState(params.get("last") || "");
  const [email, setEmail] = React.useState(params.get("email") || "");
  const [phone, setPhone] = React.useState(params.get("phone") || "");
  const [eventName] = React.useState(params.get("event") || "Mein Event");
  const [eventId] = React.useState<string | null>(params.get("eventId"));

  const [status, setStatus] = React.useState<"accepted" | "declined" | null>(
    null,
  );
  const [saving, setSaving] = React.useState(false);
  const [saved, setSaved] = React.useState(false);
  const [warn, setWarn] = React.useState("");
  const [serverError, setServerError] = React.useState("");

  const onSubmit = async () => {
    if (!status) {
      setWarn("Bitte wähle Zusagen oder Absagen.");
      return;
    }
    if (!email && !phone) {
      setWarn("Bitte gib mindestens E‑Mail oder Telefon an.");
      return;
    }
    setSaving(true);
    setWarn("");
    setServerError("");

    try {
      const res = await fetch("/api/rsvp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName,
          lastName,
          email,
          phone,
          eventName,
          eventId,
          status, // "accepted" | "declined"
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setServerError(data?.error || "Fehler beim Speichern.");
        return;
      }
      setSaved(true);
    } catch (e: any) {
      setServerError(e?.message || "Unbekannter Fehler.");
    } finally {
      setSaving(false);
    }
  };

  if (saved) {
    const accepted = status === "accepted";
    return (
      <Card sx={{ maxWidth: 560, mx: "auto", mt: 4 }}>
        <CardContent>
          <Stack spacing={2} alignItems="center">
            {accepted ? (
              <>
                <CheckCircleRoundedIcon color="success" sx={{ fontSize: 48 }} />
                <Typography variant="h6" fontWeight={700}>
                  Danke, {firstName || "Gast"}!
                </Typography>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  textAlign="center"
                >
                  Deine <strong>Zusage</strong> zur „{eventName}“ wurde
                  gespeichert.
                  <br />
                  <strong>Hinweis:</strong> Das ist noch keine Ticket‑Freigabe.
                  Das Team prüft deine RSVP und schaltet dich ggf. frei. Du
                  wirst informiert, sobald dein Ticket bereitsteht.
                </Typography>
              </>
            ) : (
              <>
                <CancelRoundedIcon color="error" sx={{ fontSize: 48 }} />
                <Typography variant="h6" fontWeight={700}>
                  Schade, {firstName || "Gast"}!
                </Typography>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  textAlign="center"
                >
                  Deine <strong>Absage</strong> zur „{eventName}“ wurde
                  gespeichert.
                </Typography>
              </>
            )}
            <Button
              startIcon={<ArrowBackRoundedIcon />}
              variant="outlined"
              onClick={() => router.push("/")}
            >
              Zurück zur Startseite
            </Button>
          </Stack>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card sx={{ maxWidth: 560, mx: "auto", mt: 4 }}>
      <CardContent>
        <Typography variant="h6" fontWeight={700} gutterBottom>
          Einladung zu „{eventName}“
        </Typography>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          Bitte bestätige deine Teilnahme. Eine Zusage bedeutet noch{" "}
          <strong>kein</strong> Ticket – die Freigabe erfolgt durch das Team.
        </Typography>

        <Stack spacing={2} mt={2}>
          <TextField
            label="Vorname"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            fullWidth
          />
          <TextField
            label="Nachname"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            fullWidth
          />
          <TextField
            label="E‑Mail"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            fullWidth
          />
          <TextField
            label="Telefon"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            fullWidth
          />

          <Typography variant="subtitle2" fontWeight={600}>
            Teilnahme:
          </Typography>
          <ToggleButtonGroup
            value={status}
            exclusive
            onChange={(_, v) => setStatus(v)}
            fullWidth
          >
            <ToggleButton value="accepted" color="success">
              👍 Zusagen
            </ToggleButton>
            <ToggleButton value="declined" color="error">
              👎 Absagen
            </ToggleButton>
          </ToggleButtonGroup>

          {warn && <Alert severity="warning">{warn}</Alert>}
          {serverError && <Alert severity="error">{serverError}</Alert>}

          <Button variant="contained" onClick={onSubmit} disabled={saving}>
            {saving ? (
              <>
                <CircularProgress size={18} sx={{ mr: 1 }} />
                Speichern …
              </>
            ) : (
              "Antwort senden"
            )}
          </Button>
        </Stack>
      </CardContent>
    </Card>
  );
}
