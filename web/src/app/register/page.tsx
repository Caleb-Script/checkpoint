// /Users/gentlebookpro/Projekte/checkpoint/web/src/app/register/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Box, Card, CardContent, CardHeader, Stack, TextField, Button, Typography, Alert, CircularProgress
} from "@mui/material";

export default function RegisterPage() {
  const params = useSearchParams();
  const router = useRouter();
  const token = params.get("token") || ""; // kommt aus Invite-/Ticket-Link
  const returnTo = params.get("returnTo") || "/";

  const [ready, setReady] = useState(false); // darf registrieren?
  const [err, setErr] = useState<string>("");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");

  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        if (!token) {
          setErr("Registrierung ist nur über einen gültigen Link möglich.");
          setReady(false);
          return;
        }
        const r = await fetch(`/api/auth/claim?token=${encodeURIComponent(token)}`, { cache: "no-store" });
        const j = await r.json();
        if (!r.ok || !j.ok) throw new Error(j.error || "claim failed");
        setReady(true);
      } catch (e: any) {
        setErr(e.message || "Fehler beim Freischalten");
        setReady(false);
      }
    })();
  }, [token]);

  async function submit() {
    setErr("");
    if (password.length < 8) { setErr("Passwort muss mindestens 8 Zeichen haben."); return; }
    if (password !== password2) { setErr("Passwörter stimmen nicht überein."); return; }
    try {
      setLoading(true);
      const r = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email? email: 'n/a@omnixys.com', password, firstName, lastName, phone }),
      });
      const j = await r.json();
      if (!r.ok || !j.ok) throw new Error(j.error || "Registrierung fehlgeschlagen");

      // Optional: direkt einloggen (falls du /api/auth/login hast)
      try {
        const login = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username: email, password }),
        });
        if (login.ok) {
          router.replace(returnTo);
          setDone(true);
          return;
        }
      } catch { /* ignore */ }

      setDone(true);
    } catch (e: any) {
      setErr(e.message || "Unbekannter Fehler");
    } finally {
      setLoading(false);
    }
  }

  if (!ready && !err) {
    return (
      <Box sx={{ p: 4 }}>
        <Stack alignItems="center" spacing={2}><CircularProgress /><div>Prüfe Berechtigung…</div></Stack>
      </Box>
    );
  }

  if (done) {
    return (
      <Box sx={{ p: { xs: 2, md: 4 }, maxWidth: 520, mx: "auto" }}>
        <Alert severity="success" sx={{ mb: 2 }}>Registrierung erfolgreich.</Alert>
        <Button fullWidth variant="contained" onClick={() => router.replace(returnTo)}>Weiter</Button>
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 2, md: 4 }, maxWidth: 520, mx: "auto" }}>
      <Card>
        <CardHeader title="Registrieren" subheader="Lege deinen Zugang an, um QR & Einladungen zu verwalten." />
        <CardContent>
          {err && <Alert severity="error" sx={{ mb: 2 }}>{err}</Alert>}
          {!ready && err && (
            <Typography variant="body2" color="text.secondary">
              Diese Seite ist nur über einen gültigen Einladungs- oder Ticket-Link erreichbar.
            </Typography>
          )}
          {ready && (
            <Stack spacing={2}>
              <TextField label="E-Mail" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                <TextField label="Passwort" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
                <TextField label="Passwort (Wiederholung)" type="password" value={password2} onChange={(e) => setPassword2(e.target.value)} />
              </Stack>
              <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                <TextField label="Vorname" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
                <TextField label="Nachname" value={lastName} onChange={(e) => setLastName(e.target.value)} />
              </Stack>
              <TextField label="Telefon (optional)" value={phone} onChange={(e) => setPhone(e.target.value)} />
              <Button variant="contained" disabled={loading} onClick={submit}>
                {loading ? "Wird angelegt…" : "Account anlegen"}
              </Button>
              <Typography variant="caption" color="text.secondary">
                Hinweis: Registrierung ist nur mit gültigem Link möglich (Schutz vor Copy-Share).
              </Typography>
            </Stack>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}
