// /Users/gentlebookpro/Projekte/checkpoint/web/src/app/invite/page.tsx
"use client";

import * as React from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  Stack,
  TextField,
  Typography,
  Alert,
  CircularProgress,
  Divider,
  IconButton,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Chip,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import SaveIcon from "@mui/icons-material/Save";
import CheckIcon from "@mui/icons-material/Check";

type InviteResolved = {
  ok: boolean;
  invitation?: {
    id: string;
    status: "PENDING" | "ACCEPTED" | "DECLINED" | "CANCELED";
    rsvpChoice: "YES" | "NO" | null;
    approved: boolean;
    event: { id: string; name: string; startsAt: string; endsAt: string };
    guest: {
      email?: string | null;
      phone?: string | null;
      firstName?: string | null;
      lastName?: string | null;
    };
    hasTicket: boolean;
    invitedBy: { name: string } | null;
    plusOne: { max: number; used: number; free: number };
  };
  error?: string;
};

type ChildRow = {
  id: string;
  status: "PENDING" | "ACCEPTED" | "DECLINED" | "CANCELED";
  rsvpChoice: "YES" | "NO" | null;
  ticketIssued: boolean;
  guest: { firstName: string; lastName: string; email: string; phone: string };
};

export default function InvitePage() {
  const params = useSearchParams();
  const router = useRouter();
  const code = params.get("code") || "";

  const [loading, setLoading] = React.useState(true);
  const [res, setRes] = React.useState<InviteResolved | null>(null);
  const [error, setError] = React.useState<string>("");

  // Eigene Daten
  const [firstName, setFirstName] = React.useState("");
  const [lastName, setLastName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [phone, setPhone] = React.useState("");

  // Neue Plus-Ones (PENDING) erfassen
  const [newRows, setNewRows] = React.useState<
    Array<{ firstName: string; lastName: string; email: string; phone: string }>
  >([{ firstName: "", lastName: "", email: "", phone: "" }]);

  // Bestehende Kinder
  const [children, setChildren] = React.useState<ChildRow[]>([]);
  const [saving, setSaving] = React.useState(false);
  const [msg, setMsg] = React.useState("");

  async function reloadAll() {
    setLoading(true);
    try {
      const r = await fetch(
        `/api/public/invite/resolve?code=${encodeURIComponent(code)}`,
        { cache: "no-store" },
      );
      const j = (await r.json()) as InviteResolved;
      if (!j.ok || !j.invitation) throw new Error(j.error || "not found");
      setRes(j);
      setFirstName(j.invitation.guest.firstName || "");
      setLastName(j.invitation.guest.lastName || "");
      setEmail(j.invitation.guest.email || "");
      setPhone(j.invitation.guest.phone || "");
      await reloadChildren();
      setError("");
    } catch (e: any) {
      setError(e.message || "Fehler beim Laden.");
    } finally {
      setLoading(false);
    }
  }
  async function reloadChildren() {
    const r = await fetch(
      `/api/public/invite/children?code=${encodeURIComponent(code)}`,
      { cache: "no-store" },
    );
    const j = await r.json();
    if (j.ok) setChildren(j.children as ChildRow[]);
  }

  React.useEffect(() => {
    if (code) reloadAll();
    else {
      setError("Kein Code angegeben.");
      setLoading(false);
    }
  }, [code]);

  async function submitRsvp(choice: "YES" | "NO") {
    try {
      setSaving(true);
      const r = await fetch("/api/public/rsvp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code,
          choice,
          guest: { firstName, lastName, email, phone },
        }),
      });
      const j = await r.json();
      if (!r.ok || !j.ok) throw new Error(j.error || "RSVP fehlgeschlagen");
      await reloadAll();
    } catch (e: any) {
      setMsg(e.message || "Fehler beim Senden.");
    } finally {
      setSaving(false);
    }
  }

  // Neue Plus-Ones anlegen (PENDING)
  async function addNewRows() {
    setMsg("");
    const inv = res?.invitation;
    if (!inv) return;
    const cleaned = newRows
      .map((r) => ({
        firstName: r.firstName.trim(),
        lastName: r.lastName.trim(),
        email: r.email.trim(),
        phone: r.phone.trim(),
      }))
      .filter((r) => r.firstName || r.lastName || r.email || r.phone)
      .slice(0, inv.plusOne.free);
    if (!cleaned.length) {
      setMsg("Bitte mindestens eine Person (Name/Email/Telefon) angeben.");
      return;
    }

    try {
      setSaving(true);
      const resp = await fetch("/api/public/invite/plusone", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, guests: cleaned }),
      });
      const j = await resp.json();
      if (!resp.ok || !j.ok)
        throw new Error(j.error || "Hinzufügen fehlgeschlagen");
      setNewRows([{ firstName: "", lastName: "", email: "", phone: "" }]);
      await reloadAll();
      setMsg(
        `Hinzugefügt: ${j.summary.created} (frei jetzt: ${j.summary.slots.remaining})`,
      );
    } catch (e: any) {
      setMsg("Fehler: " + (e.message || "unbekannt"));
    } finally {
      setSaving(false);
    }
  }

  // Bestehende Kinder bearbeiten / löschen / akzeptieren (bis Ticket)
  async function saveChild(c: ChildRow) {
    try {
      setSaving(true);
      const resp = await fetch("/api/public/invite/plusone/update", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, id: c.id, guest: c.guest }),
      });
      const j = await resp.json();
      if (!resp.ok || !j.ok)
        throw new Error(j.error || "Speichern fehlgeschlagen");
      setMsg("Gespeichert.");
    } catch (e: any) {
      setMsg("Fehler: " + (e.message || "unbekannt"));
    } finally {
      setSaving(false);
    }
  }
  async function deleteChild(id: string) {
    try {
      setSaving(true);
      const resp = await fetch("/api/public/invite/plusone/delete", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, ids: [id] }),
      });
      const j = await resp.json();
      if (!resp.ok || !j.ok)
        throw new Error(j.error || "Löschen fehlgeschlagen");
      await reloadAll();
      setMsg("Gelöscht.");
    } catch (e: any) {
      setMsg("Fehler: " + (e.message || "unbekannt"));
    } finally {
      setSaving(false);
    }
  }
  async function acceptChildren(ids: string[]) {
    try {
      setSaving(true);
      const resp = await fetch("/api/public/invite/plusone/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, ids }),
      });
      const j = await resp.json();
      if (!resp.ok || !j.ok)
        throw new Error(j.error || "Akzeptieren fehlgeschlagen");
      await reloadAll();
      setMsg(`Akzeptiert: ${j.accepted}`);
    } catch (e: any) {
      setMsg("Fehler: " + (e.message || "unbekannt"));
    } finally {
      setSaving(false);
    }
  }

  function goTicket() {
    router.push(`/my-qr?code=${encodeURIComponent(code)}`);
  }

  const inv = res?.invitation;

  return (
    <Box sx={{ p: { xs: 2, md: 4 }, maxWidth: 1000, mx: "auto" }}>
      <Typography variant="h5" sx={{ mb: 2, fontWeight: 700 }}>
        Einladung
      </Typography>

      {loading && (
        <Stack alignItems="center" justifyContent="center" sx={{ py: 6 }}>
          <CircularProgress />
        </Stack>
      )}
      {!loading && error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {!loading && inv && (
        <Card>
          <CardHeader
            title={`Einladung zu „${inv.event.name}“`}
            subheader={
              <div>
                {new Date(inv.event.startsAt).toLocaleString()} –{" "}
                {new Date(inv.event.endsAt).toLocaleString()}
              </div>
            }
          />
          <CardContent>
            {/* Plus-One Kontingent */}
            {inv.plusOne.max > 0 && (
              <Alert
                severity={inv.plusOne.free > 0 ? "info" : "warning"}
                sx={{ mb: 2 }}
              >
                Max: {inv.plusOne.max} · Belegt: {inv.plusOne.used} · Frei:{" "}
                {inv.plusOne.free}
                {inv.plusOne.free === 0 && <> – Kontingent erschöpft.</>}
              </Alert>
            )}

            {/* Eigene Angaben */}
            <Typography variant="subtitle1" sx={{ mb: 1 }}>
              Deine Angaben
            </Typography>
            <Stack spacing={2} sx={{ mb: 2 }}>
              <TextField
                label="Vorname"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
              />
              <TextField
                label="Nachname"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
              />
              <TextField
                label="E-Mail"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <TextField
                label="Telefon"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </Stack>

            <Typography variant="subtitle1" sx={{ mb: 1 }}>
              Teilnahme
            </Typography>
            <Stack
              direction={{ xs: "column", sm: "row" }}
              spacing={2}
              sx={{ mb: 2 }}
            >
              <Button
                variant="contained"
                disabled={saving}
                onClick={() => submitRsvp("YES")}
              >
                👍 ZUSAGEN
              </Button>
              <Button
                variant="outlined"
                color="inherit"
                disabled={saving}
                onClick={() => submitRsvp("NO")}
              >
                👎 ABSAGEN
              </Button>
            </Stack>

            {inv.rsvpChoice === "YES" && !inv.approved && !inv.hasTicket && (
              <Alert severity="info" sx={{ mb: 2 }}>
                Deine Zusage bedeutet noch kein Ticket. Das Team prüft &
                schaltet frei.
              </Alert>
            )}
            {(inv.approved || inv.hasTicket) && (
              <Stack spacing={1} sx={{ mb: 3 }}>
                <Alert severity="success">Dein Ticket ist bereit.</Alert>
                <Button fullWidth variant="contained" onClick={goTicket}>
                  Ticket / QR anzeigen
                </Button>
              </Stack>
            )}

            <Divider sx={{ my: 2 }} />

            {/* Plus-Ones: Bestehende verwalten */}
            {inv.plusOne.max > 0 && (
              <>
                <Typography variant="subtitle1" sx={{ mb: 1 }}>
                  Deine zusätzlichen Gäste
                </Typography>
                <Table size="small" sx={{ mb: 2 }}>
                  <TableHead>
                    <TableRow>
                      <TableCell>Status</TableCell>
                      <TableCell>Vorname</TableCell>
                      <TableCell>Nachname</TableCell>
                      <TableCell>E-Mail</TableCell>
                      <TableCell>Telefon</TableCell>
                      <TableCell align="right">Aktionen</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {children.map((c) => (
                      <TableRow key={c.id}>
                        <TableCell>
                          <Chip
                            size="small"
                            label={c.ticketIssued ? "TICKET" : c.status}
                            color={
                              c.ticketIssued
                                ? "success"
                                : c.status === "ACCEPTED"
                                  ? "primary"
                                  : "default"
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <TextField
                            size="small"
                            value={c.guest.firstName}
                            onChange={(e) =>
                              setChildren((cs) =>
                                cs.map((x) =>
                                  x.id === c.id
                                    ? {
                                        ...x,
                                        guest: {
                                          ...x.guest,
                                          firstName: e.target.value,
                                        },
                                      }
                                    : x,
                                ),
                              )
                            }
                            disabled={c.ticketIssued}
                          />
                        </TableCell>
                        <TableCell>
                          <TextField
                            size="small"
                            value={c.guest.lastName}
                            onChange={(e) =>
                              setChildren((cs) =>
                                cs.map((x) =>
                                  x.id === c.id
                                    ? {
                                        ...x,
                                        guest: {
                                          ...x.guest,
                                          lastName: e.target.value,
                                        },
                                      }
                                    : x,
                                ),
                              )
                            }
                            disabled={c.ticketIssued}
                          />
                        </TableCell>
                        <TableCell>
                          <TextField
                            size="small"
                            value={c.guest.email}
                            onChange={(e) =>
                              setChildren((cs) =>
                                cs.map((x) =>
                                  x.id === c.id
                                    ? {
                                        ...x,
                                        guest: {
                                          ...x.guest,
                                          email: e.target.value,
                                        },
                                      }
                                    : x,
                                ),
                              )
                            }
                            disabled={c.ticketIssued}
                          />
                        </TableCell>
                        <TableCell>
                          <TextField
                            size="small"
                            value={c.guest.phone}
                            onChange={(e) =>
                              setChildren((cs) =>
                                cs.map((x) =>
                                  x.id === c.id
                                    ? {
                                        ...x,
                                        guest: {
                                          ...x.guest,
                                          phone: e.target.value,
                                        },
                                      }
                                    : x,
                                ),
                              )
                            }
                            disabled={c.ticketIssued}
                          />
                        </TableCell>
                        <TableCell align="right">
                          <IconButton
                            size="small"
                            title="Speichern"
                            onClick={() => saveChild(c)}
                            disabled={saving || c.ticketIssued}
                          >
                            <SaveIcon fontSize="small" />
                          </IconButton>
                          <IconButton
                            size="small"
                            title="Löschen"
                            onClick={() => deleteChild(c.id)}
                            disabled={saving || c.ticketIssued}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                          {c.status !== "ACCEPTED" && !c.ticketIssued && (
                            <IconButton
                              size="small"
                              title="Akzeptieren"
                              onClick={() => acceptChildren([c.id])}
                              disabled={saving}
                            >
                              <CheckIcon fontSize="small" />
                            </IconButton>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {/* Neue hinzufügen */}
                {inv.plusOne.free > 0 && (
                  <>
                    <Typography variant="subtitle2" sx={{ mb: 1 }}>
                      Neue Personen hinzufügen (PENDING)
                    </Typography>
                    {newRows.map((row, i) => (
                      <Stack
                        key={i}
                        direction={{ xs: "column", sm: "row" }}
                        spacing={2}
                        sx={{ mb: 1 }}
                      >
                        <TextField
                          size="small"
                          label="Vorname"
                          value={row.firstName}
                          onChange={(e) =>
                            setNewRows((rs) =>
                              rs.map((x, idx) =>
                                idx === i
                                  ? { ...x, firstName: e.target.value }
                                  : x,
                              ),
                            )
                          }
                        />
                        <TextField
                          size="small"
                          label="Nachname"
                          value={row.lastName}
                          onChange={(e) =>
                            setNewRows((rs) =>
                              rs.map((x, idx) =>
                                idx === i
                                  ? { ...x, lastName: e.target.value }
                                  : x,
                              ),
                            )
                          }
                        />
                        <TextField
                          size="small"
                          label="E-Mail"
                          value={row.email}
                          onChange={(e) =>
                            setNewRows((rs) =>
                              rs.map((x, idx) =>
                                idx === i ? { ...x, email: e.target.value } : x,
                              ),
                            )
                          }
                        />
                        <TextField
                          size="small"
                          label="Telefon"
                          value={row.phone}
                          onChange={(e) =>
                            setNewRows((rs) =>
                              rs.map((x, idx) =>
                                idx === i ? { ...x, phone: e.target.value } : x,
                              ),
                            )
                          }
                        />
                      </Stack>
                    ))}
                    <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
                      <Button
                        variant="text"
                        onClick={() =>
                          setNewRows((rs) => [
                            ...rs,
                            {
                              firstName: "",
                              lastName: "",
                              email: "",
                              phone: "",
                            },
                          ])
                        }
                      >
                        Zeile hinzufügen
                      </Button>
                      <Button
                        variant="contained"
                        onClick={addNewRows}
                        disabled={saving}
                      >
                        Speichern
                      </Button>
                    </Stack>
                  </>
                )}
              </>
            )}

            {msg && (
              <Typography variant="body2" color="text.secondary">
                {msg}
              </Typography>
            )}
          </CardContent>
        </Card>
      )}
    </Box>
  );
}
