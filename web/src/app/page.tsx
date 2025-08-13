// /Users/gentlebookpro/Projekte/checkpoint/web/src/app/page.tsx
"use client";

import * as React from "react";
import Link from "next/link";
import {
  Box,
  Grid,
  Card,
  CardActionArea,
  CardContent,
  Typography,
  Stack,
} from "@mui/material";

import GroupAddIcon from "@mui/icons-material/GroupAdd";
import PeopleAltIcon from "@mui/icons-material/PeopleAlt";
import QrCode2Icon from "@mui/icons-material/QrCode2";
import ConfirmationNumberOutlinedIcon from "@mui/icons-material/ConfirmationNumberOutlined";
import SecurityIcon from "@mui/icons-material/Security";

type Tile = {
  title: string;
  subtitle?: string;
  href: string;
  icon: React.ReactNode;
};

const TILES: Tile[] = [
  { title: "Einladen / RSVP-Link", subtitle: "Hauptgast-Ansicht", href: "/invite", icon: <GroupAddIcon fontSize="large" /> },
  { title: "Antworten & Tickets", subtitle: "Tickets per WhatsApp", href: "/invitations/responses", icon: <PeopleAltIcon fontSize="large" /> },
  { title: "Mein QR", subtitle: "Eigenes Ticket anzeigen", href: "/my-qr", icon: <QrCode2Icon fontSize="large" /> },
  { title: "Ticket öffnen", subtitle: "Mit Claim-Link", href: "/ticket", icon: <ConfirmationNumberOutlinedIcon fontSize="large" /> },
  { title: "Security", subtitle: "Eingang/Scanner", href: "/security", icon: <SecurityIcon fontSize="large" /> },
];

export default function HomePage() {
  return (
    <Box sx={{ maxWidth: 1200, mx: "auto" }}>
      <Typography variant="h5" sx={{ fontWeight: 800, mb: 2 }}>
        Willkommen 👋
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Wähle eine Funktion. Admins verteilen Tickets in <strong>Antworten & Tickets</strong>. Gäste öffnen ihren QR unter <strong>Mein QR</strong>.
      </Typography>

      <Grid container spacing={2}>
        {TILES.map((t) => (
          <Grid key={t.href} item xs={12} sm={6} md={4}>
            <Card elevation={0} sx={{ border: "1px solid", borderColor: "divider", borderRadius: 3 }}>
              <CardActionArea component={Link} href={t.href}>
                <CardContent>
                  <Stack direction="row" spacing={2} alignItems="center">
                    {t.icon}
                    <Box>
                      <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>{t.title}</Typography>
                      {t.subtitle && (
                        <Typography variant="body2" color="text.secondary">{t.subtitle}</Typography>
                      )}
                    </Box>
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