// /Users/gentlebookpro/Projekte/checkpoint/web/src/app/invitations/page.tsx
"use client";

import ClearAllRoundedIcon from "@mui/icons-material/ClearAllRounded";
import ContentCopyRoundedIcon from "@mui/icons-material/ContentCopyRounded";
import SelectAllRoundedIcon from "@mui/icons-material/SelectAllRounded";
import UploadFileRoundedIcon from "@mui/icons-material/UploadFileRounded";
import WhatsAppIcon from "@mui/icons-material/WhatsApp";
import {
  Alert,
  Button,
  Card,
  CardActions,
  CardContent,
  Checkbox,
  Chip,
  FormControlLabel,
  Grid,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import * as React from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/context/SessionContext";

/**
 * Erwartetes CSV-Format (Header optional, Reihenfolge flexibel):
 * firstName,lastName,email,phone,seatSection,seatRow,seatNumber
 *
 * Beispiel:
 * firstName,lastName,email,phone,seatSection,seatRow,seatNumber
 * Max,Mustermann,max@example.com,+49171234567,A,1,12
 * Anna,Schulz,anna@mail.de,+491522334455,B,3,7
 */

type Row = {
  id: string; // interne Zeilen-ID
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  seatSection?: string;
  seatRow?: string;
  seatNumber?: string;
};

function simpleCsvParse(input: string): Row[] {
  // Sehr einfache CSV-Implementierung mit Anführungszeichen-Unterstützung.
  // Für komplexe Dateien später PapaParse einsetzen – hier absichtlich dependency-frei.
  const lines = input
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split("\n")
    .filter((l) => l.trim().length > 0);
  if (lines.length === 0) return [];

  const parseLine = (line: string): string[] => {
    const out: string[] = [];
    let cur = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') {
        if (inQuotes && line[i + 1] === '"') {
          // escaped quote
          cur += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (c === "," && !inQuotes) {
        out.push(cur.trim());
        cur = "";
      } else {
        cur += c;
      }
    }
    out.push(cur.trim());
    return out.map((v) => (v === "" ? (undefined as any) : v));
  };

  const header = parseLine(lines[0]).map((h) =>
    (h || "").toString().toLowerCase(),
  );
  const looksLikeHeader =
    header.includes("firstname") ||
    header.includes("lastname") ||
    header.includes("email") ||
    header.includes("phone") ||
    header.includes("seatsection") ||
    header.includes("seatrow") ||
    header.includes("seatnumber");

  const rows: Row[] = [];
  const startIdx = looksLikeHeader ? 1 : 0;

  for (let i = startIdx; i < lines.length; i++) {
    const cols = parseLine(lines[i]);

    let row: Row;
    if (looksLikeHeader) {
      // Map per Header-Name
      const map = (name: string) => {
        const idx = header.indexOf(name.toLowerCase());
        return idx >= 0 ? cols[idx] : undefined;
      };
      row = {
        id: `${i}-${Math.random().toString(36).slice(2, 8)}`,
        firstName: map("firstName"),
        lastName: map("lastName"),
        email: map("email"),
        phone: map("phone"),
        seatSection: map("seatSection"),
        seatRow: map("seatRow"),
        seatNumber: map("seatNumber"),
      };
    } else {
      // Best-Effort Mapping nach Position
      row = {
        id: `${i}-${Math.random().toString(36).slice(2, 8)}`,
        firstName: cols[0],
        lastName: cols[1],
        email: cols[2],
        phone: cols[3],
        seatSection: cols[4],
        seatRow: cols[5],
        seatNumber: cols[6],
      };
    }
    rows.push(row);
  }

  return rows;
}

function formatSeat(r: Row) {
  const seg = [r.seatSection, r.seatRow, r.seatNumber]
    .filter(Boolean)
    .join(" ");
  return seg || "-";
}

/** Hilfsfunktion zum WhatsApp-Link */
function buildWhatsAppUrl(message: string) {
  const encoded = encodeURIComponent(message);
  // wa.me bevorzugt, api.whatsapp.com als Fallback
  return `https://wa.me/?text=${encoded}`;
}

export default function InvitationsPage() {
  const router = useRouter();
  const { isAuthenticated, roles } = useSession();
  const isAdmin = roles.includes("admin") || roles.includes("security"); // security darf z. B. CSV ansehen

  const [rows, setRows] = React.useState<Row[]>([]);
  const [selected, setSelected] = React.useState<Record<string, boolean>>({});
  const [eventName, setEventName] = React.useState<string>("Sommer Gala 2025");
  const [webUrlBase, setWebUrlBase] = React.useState<string>("");
  const [appStoreUrl, setAppStoreUrl] = React.useState<string>(
    "https://apps.apple.com/de/app/",
  );
  const [includeAppStore, setIncludeAppStore] = React.useState<boolean>(false);
  const [messagePreview, setMessagePreview] = React.useState<string>("");

  const anySelected = React.useMemo(
    () => Object.values(selected).some(Boolean),
    [selected],
  );

  React.useEffect(() => {
    // Default Web-URL-Base: aktuelle Origin
    if (typeof window !== "undefined") {
      setWebUrlBase(window.location.origin);
    }
  }, []);

  const onFile = async (file?: File | null) => {
    if (!file) return;
    const text = await file.text();
    const parsed = simpleCsvParse(text);
    setRows(parsed);
    // Selektion zurücksetzen
    setSelected({});
  };

  const toggleAll = (value: boolean) => {
    const next: Record<string, boolean> = {};
    rows.forEach((r) => (next[r.id] = value));
    setSelected(next);
  };

  const toggleRow = (id: string, value: boolean) => {
    setSelected((prev) => ({ ...prev, [id]: value }));
  };

  const selectedRows = React.useMemo(
    () => rows.filter((r) => selected[r.id]),
    [rows, selected],
  );

  const buildPersonalLink = (r: Row) => {
    // Personalisierter Web-Link, später ideal: signierter Token + Invitation/Ticket IDs vom Backend
    const url = new URL(`${webUrlBase}/rsvp`);
    if (r.email) url.searchParams.set("email", r.email);
    if (r.firstName) url.searchParams.set("first", r.firstName);
    if (r.lastName) url.searchParams.set("last", r.lastName);
    url.searchParams.set("event", eventName);
    return url.toString();
  };

  const buildMessage = (r: Row) => {
    const fullName =
      [r.firstName, r.lastName].filter(Boolean).join(" ").trim() || "Hallo";
    const seat = formatSeat(r);
    const web = buildPersonalLink(r);
    const appPart =
      includeAppStore && appStoreUrl ? `\nApp (optional): ${appStoreUrl}` : "";
    return `${fullName}, du bist zur "${eventName}" eingeladen 🎉

Bitte vervollständige (oder bestätige) deine Angaben und sieh deinen QR‑Einlasscode in der App/WebApp:

Web: ${web}${appPart}

Dein Platz: ${seat}
Bis bald!`;
  };

  const buildBatchMessage = () => {
    if (selectedRows.length === 0) return "";
    // Für Batch: mehrere Zeilen, jeweils Name + Link
    const lines: string[] = [];
    lines.push(`Einladungen zur "${eventName}"`);
    lines.push("");
    selectedRows.forEach((r) => {
      const name =
        [r.firstName, r.lastName].filter(Boolean).join(" ").trim() || "Gast";
      lines.push(`• ${name} – ${buildPersonalLink(r)}`);
    });
    if (includeAppStore && appStoreUrl) {
      lines.push("");
      lines.push(`App (optional): ${appStoreUrl}`);
    }
    return lines.join("\n");
  };

  const openWhatsAppForRow = (r: Row) => {
    const url = buildWhatsAppUrl(buildMessage(r));
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setMessagePreview("In Zwischenablage kopiert ✅");
      setTimeout(() => setMessagePreview(""), 2000);
    } catch {
      setMessagePreview("Kopieren fehlgeschlagen ❌");
      setTimeout(() => setMessagePreview(""), 2000);
    }
  };

  if (!isAuthenticated) {
    return (
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Einladungen
          </Typography>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Bitte melde dich an, um Einladungen zu verwalten.
          </Typography>
          <Button
            variant="contained"
            onClick={() =>
              router.push(`/login?next=${encodeURIComponent("/invitations")}`)
            }
          >
            Login
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!isAdmin) {
    return (
      <Alert severity="warning">
        Du hast keine Berechtigung für diesen Bereich. (Benötigt Rolle{" "}
        <strong>admin</strong> oder <strong>security</strong>.)
      </Alert>
    );
  }

  return (
    <Stack spacing={2}>
      <Card
        elevation={0}
        sx={{ border: (theme) => `1px solid ${theme.palette.divider}` }}
      >
        <CardContent>
          <Typography variant="h6" fontWeight={800} gutterBottom>
            Einladungen vorbereiten
          </Typography>

          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <Stack spacing={1.5}>
                <TextField
                  label="Event-Name"
                  value={eventName}
                  onChange={(e) => setEventName(e.target.value)}
                  fullWidth
                />
                <TextField
                  label="Web‑App Basis‑URL"
                  helperText="Standard: aktuelle Origin. Beispiel: https://checkpoint.local"
                  value={webUrlBase}
                  onChange={(e) => setWebUrlBase(e.target.value)}
                  fullWidth
                />
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={includeAppStore}
                      onChange={(e) => setIncludeAppStore(e.target.checked)}
                    />
                  }
                  label="App‑Store‑Link beilegen"
                />
                {includeAppStore && (
                  <TextField
                    label="App‑Store‑Link"
                    value={appStoreUrl}
                    onChange={(e) => setAppStoreUrl(e.target.value)}
                    fullWidth
                  />
                )}
              </Stack>
            </Grid>

            <Grid item xs={12} md={6}>
              <Stack spacing={1.5}>
                <Button
                  variant="outlined"
                  startIcon={<UploadFileRoundedIcon />}
                  component="label"
                >
                  CSV auswählen
                  <input
                    hidden
                    type="file"
                    accept=".csv,text/csv"
                    onChange={(e) => onFile(e.target.files?.[0] || null)}
                  />
                </Button>

                <Stack direction="row" spacing={1} alignItems="center">
                  <Chip size="small" label={`Zeilen: ${rows.length}`} />
                  <Chip
                    size="small"
                    color={anySelected ? "primary" : "default"}
                    label={`Ausgewählt: ${selectedRows.length}`}
                  />
                </Stack>

                <Stack direction="row" spacing={1}>
                  <Button
                    startIcon={<SelectAllRoundedIcon />}
                    onClick={() => toggleAll(true)}
                    disabled={rows.length === 0}
                  >
                    Alle markieren
                  </Button>
                  <Button
                    startIcon={<ClearAllRoundedIcon />}
                    onClick={() => toggleAll(false)}
                    disabled={rows.length === 0}
                  >
                    Auswahl löschen
                  </Button>
                </Stack>
              </Stack>
            </Grid>
          </Grid>
        </CardContent>
        {messagePreview && (
          <CardActions sx={{ pt: 0 }}>
            <Alert severity="success" sx={{ width: "100%" }}>
              {messagePreview}
            </Alert>
          </CardActions>
        )}
      </Card>

      <Card
        elevation={0}
        sx={{ border: (theme) => `1px solid ${theme.palette.divider}` }}
      >
        <CardContent>
          <Typography variant="subtitle1" fontWeight={700} gutterBottom>
            Vorschau & Auswahl
          </Typography>
          {rows.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              Lade eine CSV, um Einladungen vorzubereiten.
            </Typography>
          ) : (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell padding="checkbox">
                      <Checkbox
                        indeterminate={
                          selectedRows.length > 0 &&
                          selectedRows.length < rows.length
                        }
                        checked={
                          rows.length > 0 && selectedRows.length === rows.length
                        }
                        onChange={(e) => toggleAll(e.target.checked)}
                      />
                    </TableCell>
                    <TableCell>Vorname</TableCell>
                    <TableCell>Nachname</TableCell>
                    <TableCell>E‑Mail</TableCell>
                    <TableCell>Telefon</TableCell>
                    <TableCell>Platz</TableCell>
                    <TableCell align="right">Aktionen</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {rows.map((r) => {
                    const sel = !!selected[r.id];
                    return (
                      <TableRow key={r.id} hover selected={sel}>
                        <TableCell padding="checkbox">
                          <Checkbox
                            checked={sel}
                            onChange={(e) => toggleRow(r.id, e.target.checked)}
                          />
                        </TableCell>
                        <TableCell>{r.firstName || "-"}</TableCell>
                        <TableCell>{r.lastName || "-"}</TableCell>
                        <TableCell>{r.email || "-"}</TableCell>
                        <TableCell>{r.phone || "-"}</TableCell>
                        <TableCell>{formatSeat(r)}</TableCell>
                        <TableCell align="right">
                          <Stack
                            direction="row"
                            spacing={1}
                            justifyContent="flex-end"
                          >
                            <Button
                              size="small"
                              startIcon={<WhatsAppIcon />}
                              onClick={() => openWhatsAppForRow(r)}
                            >
                              WhatsApp
                            </Button>
                            <Button
                              size="small"
                              startIcon={<ContentCopyRoundedIcon />}
                              onClick={() => copyToClipboard(buildMessage(r))}
                            >
                              Kopieren
                            </Button>
                          </Stack>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
        {rows.length > 0 && (
          <CardActions
            sx={{ justifyContent: "space-between", flexWrap: "wrap", gap: 1 }}
          >
            <Typography variant="body2" color="text.secondary">
              Tipp: Du kannst einzelne Nachrichten kopieren oder direkt per
              WhatsApp teilen.
            </Typography>
            <Stack direction="row" spacing={1}>
              <Button
                variant="outlined"
                startIcon={<ContentCopyRoundedIcon />}
                disabled={!anySelected}
                onClick={() => copyToClipboard(buildBatchMessage())}
              >
                Batch kopieren
              </Button>
              <Button
                variant="contained"
                startIcon={<WhatsAppIcon />}
                disabled={!anySelected}
                onClick={() => {
                  const msg = buildBatchMessage();
                  if (msg)
                    window.open(
                      buildWhatsAppUrl(msg),
                      "_blank",
                      "noopener,noreferrer",
                    );
                }}
              >
                Batch WhatsApp
              </Button>
            </Stack>
          </CardActions>
        )}
      </Card>
    </Stack>
  );
}
