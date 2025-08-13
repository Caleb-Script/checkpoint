// /Users/gentlebookpro/Projekte/checkpoint/web/src/app/security/page.tsx
"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Box,
  Typography,
  Card,
  CardContent,
  CircularProgress,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Button,
  Chip,
  Alert,
} from "@mui/material";
import { format } from "date-fns";
import de from "date-fns/locale/de";
import { useSession } from "@/context/SessionContext";

type ScanLog = {
  id: string;
  ticketId: string;
  eventId: string;
  direction: "INSIDE" | "OUTSIDE";
  verdict: string;
  gate: string | null;
  createdAt: string;
  guestName?: string;
  seatNumber?: string;
};

export default function SecurityDashboardPage() {
  const { loading, isAuthenticated, roles } = useSession();
  const router = useRouter();
  const [logs, setLogs] = React.useState<ScanLog[]>([]);
  const [fetching, setFetching] = React.useState(false);

  const hasAccess = roles.includes("security") || roles.includes("admin");

  // 1️⃣ Initial Logs laden (Cookie-basiert)
  const fetchLogs = async () => {
    setFetching(true);
    try {
      const res = await fetch("/api/security/logs", {
        method: "GET",
        credentials: "include", // Cookies mitsenden
        headers: { "Cache-Control": "no-store" },
      });
      const data = await res.json();
      if (res.ok) {
        setLogs(Array.isArray(data.logs) ? data.logs : []);
      } else {
        console.error("Logs Fehler:", data?.error || res.statusText);
      }
    } catch (err) {
      console.error("Fehler beim Laden der Logs:", err);
    } finally {
      setFetching(false);
    }
  };

  // 2️⃣ WebSocket verbinden für Live-Updates
  React.useEffect(() => {
    if (!isAuthenticated || !hasAccess) return;

    // Direkt einmal initial laden
    void fetchLogs();

    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:3000";
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log("🔌 WebSocket verbunden");
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === "scan-log") {
          setLogs((prev) => [msg.data, ...prev].slice(0, 100));
        }
      } catch (err) {
        console.error("WS Nachricht Fehler:", err);
      }
    };

    ws.onclose = () => {
      console.log("❌ WebSocket getrennt");
    };

    return () => ws.close();
  }, [isAuthenticated, hasAccess]);

  // Lade-/Login-/Rollen-Handling
  if (loading) {
    return (
      <Box textAlign="center" mt={4}>
        <CircularProgress />
      </Box>
    );
  }

  if (!isAuthenticated) {
    router.push(`/login?next=${encodeURIComponent("/security")}`);
    return null;
  }

  if (!hasAccess) {
    return (
      <Box textAlign="center" mt={4}>
        <Alert severity="error">
          Keine Berechtigung – nur Security/Admin haben Zugriff auf dieses
          Dashboard.
        </Alert>
      </Box>
    );
  }

  return (
    <Card>
      <CardContent>
        <Box
          display="flex"
          justifyContent="space-between"
          mb={2}
          alignItems="center"
        >
          <Typography variant="h6">Security Dashboard (Live)</Typography>
          <Button onClick={fetchLogs} disabled={fetching}>
            {fetching ? "Aktualisiere…" : "Manuell aktualisieren"}
          </Button>
        </Box>

        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Uhrzeit</TableCell>
              <TableCell>Gast</TableCell>
              <TableCell>Ticket</TableCell>
              <TableCell>Platz</TableCell>
              <TableCell>Richtung</TableCell>
              <TableCell>Ergebnis</TableCell>
              <TableCell>Gate</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {logs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  Keine Scans vorhanden
                </TableCell>
              </TableRow>
            ) : (
              logs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell>
                    {format(new Date(log.createdAt), "HH:mm:ss", {
                      locale: de,
                    })}
                  </TableCell>
                  <TableCell>{log.guestName || "-"}</TableCell>
                  <TableCell>{log.ticketId?.slice(0, 8)}…</TableCell>
                  <TableCell>{log.seatNumber || "-"}</TableCell>
                  <TableCell>
                    <Chip
                      label={log.direction === "INSIDE" ? "Eingang" : "Ausgang"}
                      color={log.direction === "INSIDE" ? "success" : "warning"}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={log.verdict}
                      color={log.verdict === "OK" ? "success" : "error"}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>{log.gate || "-"}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
