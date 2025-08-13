// /Users/gentlebookpro/Projekte/checkpoint/web/src/app/page.tsx
"use client";

import * as React from "react";
import Link from "next/link";
import {
  Box,
  Card,
  CardActionArea,
  CardContent,
  Grid,
  Stack,
  Typography,
  Button,
  Chip,
  Alert,
  CircularProgress,
  IconButton,
} from "@mui/material";
import QrCode2RoundedIcon from "@mui/icons-material/QrCode2Rounded";
import BadgeRoundedIcon from "@mui/icons-material/BadgeRounded";
import CameraAltRoundedIcon from "@mui/icons-material/CameraAltRounded";
import ShieldRoundedIcon from "@mui/icons-material/ShieldRounded";
import MailRoundedIcon from "@mui/icons-material/MailRounded";
import SendRoundedIcon from "@mui/icons-material/SendRounded";
import TableViewRoundedIcon from "@mui/icons-material/TableViewRounded";
import EventSeatRoundedIcon from "@mui/icons-material/EventSeatRounded";
import GroupRoundedIcon from "@mui/icons-material/GroupRounded";
import EventRoundedIcon from "@mui/icons-material/EventRounded";
import LoginRoundedIcon from "@mui/icons-material/LoginRounded";
import { useSession } from "@/context/SessionContext";
import { useRouter } from "next/navigation";

type Tile = {
  href: string;
  title: string;
  subtitle?: string;
  icon: React.ReactNode;
  roles?: string[]; // sichtbar nur wenn irgendeine der Rollen vorhanden ist
  badge?: string;
};

const GUEST_TILES: Tile[] = [
  {
    href: "/my-qr",
    title: "Mein QR",
    subtitle: "Einlass‑Code anzeigen",
    icon: <QrCode2RoundedIcon fontSize="large" />,
  },
  {
    href: "/qr",
    title: "QR (Demo)",
    subtitle: "Beispiel‑QR anzeigen",
    icon: <BadgeRoundedIcon fontSize="large" />,
  },
];

const SECURITY_TILES: Tile[] = [
  {
    href: "/scan",
    title: "Scanner",
    subtitle: "QR scannen (Einlass/Auslass)",
    icon: <CameraAltRoundedIcon fontSize="large" />,
    roles: ["security", "admin"],
  },
  {
    href: "/security",
    title: "Security Live",
    subtitle: "Letzte Scans (Live‑Feed)",
    icon: <ShieldRoundedIcon fontSize="large" />,
    roles: ["security", "admin"],
  },
];

const ADMIN_TILES: Tile[] = [
  {
    href: "/invitations",
    title: "Einladungen (CSV)",
    subtitle: "CSV import · WhatsApp Links",
    icon: <MailRoundedIcon fontSize="large" />,
    roles: ["security", "admin"],
  },
  {
    href: "/invitations/responses",
    title: "RSVP Freigabe & Versand",
    subtitle: "Approve · Sitz · Ticketbild · WhatsApp",
    icon: <SendRoundedIcon fontSize="large" />,
    roles: ["security", "admin"],
  },
  {
    href: "/invitations/responses/client",
    title: "Freigegebene (Client)",
    subtitle: "Read‑only Liste fürs Tür‑Team",
    icon: <TableViewRoundedIcon fontSize="large" />,
    roles: ["security", "admin"],
  },
  {
    href: "/seats",
    title: "Sitzplätze",
    subtitle: "Plätze verwalten",
    icon: <EventSeatRoundedIcon fontSize="large" />,
    roles: ["admin"],
  },
  {
    href: "/guests",
    title: "Gäste",
    subtitle: "Profile & Kontakte",
    icon: <GroupRoundedIcon fontSize="large" />,
    roles: ["admin"],
  },
  {
    href: "/events",
    title: "Events",
    subtitle: "Termine & Einstellungen",
    icon: <EventRoundedIcon fontSize="large" />,
    roles: ["admin"],
  },
];

function Section({ title, tiles }: { title: string; tiles: Tile[] }) {
  if (tiles.length === 0) return null;
  return (
    <Box sx={{ mt: 2 }}>
      <Typography
        variant="subtitle2"
        color="text.secondary"
        sx={{ px: 0.5, mb: 1 }}
      >
        {title}
      </Typography>
      <Grid container spacing={1.5}>
        {tiles.map((tile) => (
          <Grid item xs={6} sm={4} md={3} key={tile.href}>
            <Card
              elevation={0}
              sx={{
                border: (t) => `1px solid ${t.palette.divider}`,
                borderRadius: 3,
                overflow: "hidden",
                height: "100%",
              }}
            >
              <CardActionArea
                component={Link}
                href={tile.href}
                sx={{ height: "100%" }}
              >
                <CardContent sx={{ py: 2 }}>
                  <Stack spacing={1} alignItems="flex-start">
                    <Box
                      sx={{
                        width: 48,
                        height: 48,
                        borderRadius: 2,
                        display: "grid",
                        placeItems: "center",
                        border: (t) => `1px solid ${t.palette.divider}`,
                        bgcolor: "background.paper",
                      }}
                    >
                      {tile.icon}
                    </Box>
                    <Typography
                      variant="subtitle1"
                      fontWeight={700}
                      lineHeight={1.2}
                    >
                      {tile.title}
                    </Typography>
                    {tile.subtitle && (
                      <Typography variant="caption" color="text.secondary">
                        {tile.subtitle}
                      </Typography>
                    )}
                    {tile.badge && <Chip size="small" label={tile.badge} />}
                  </Stack>
                </CardContent>
              </CardActionArea>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}

export default function HomePage() {
  const { loading, isAuthenticated, roles, login } = useSession();

  const router = useRouter();
  
  if (loading) {
    return <CircularProgress />;
  }
  // Rollenbasierte Sichtbarkeit
  const canSee = (tile: Tile) =>
    !tile.roles || tile.roles.some((r) => roles.includes(r));

  const guestTiles = GUEST_TILES.filter(canSee);
  const securityTiles = SECURITY_TILES.filter(canSee);
  const adminTiles = ADMIN_TILES.filter(canSee);

  return (
    <Box>
      <Box
        sx={{
          display: "grid",
          gap: 1,
          mb: 2,
          border: (t) => `1px solid ${t.palette.divider}`,
          borderRadius: 3,
          p: { xs: 2, md: 3 },
          bgcolor: "background.paper",
        }}
      >
        <Typography variant="h5" fontWeight={800}>
          Willkommen bei Checkpoint
        </Typography>
        <Typography variant="body2" color="text.secondary">
          QR‑Einlass, Sitzplätze & Gäste – modern, mobil‑first und sicher.
        </Typography>
      </Box>

      <Section title="Für Gäste" tiles={guestTiles} />
      <Section title="Security" tiles={securityTiles} />
      <Section title="Admin" tiles={adminTiles} />

      {/* Quick actions unten */}
      <Box sx={{ mt: 3, textAlign: "center" }}>
        <Typography variant="caption" color="text.secondary">
          Tipp: Einlade‑Links werden als persönlicher Link (z. B.
          /invite?code=…) verschickt und sind deshalb nicht im Menü.
        </Typography>
      </Box>
    </Box>
  );
}
