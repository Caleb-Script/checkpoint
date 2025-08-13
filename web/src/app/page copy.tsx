// /Users/gentlebookpro/Projekte/checkpoint/web/src/app/page.tsx
"use client";

import BadgeRoundedIcon from "@mui/icons-material/BadgeRounded";
import CameraAltRoundedIcon from "@mui/icons-material/CameraAltRounded";
import EventRoundedIcon from "@mui/icons-material/EventRounded";
import EventSeatRoundedIcon from "@mui/icons-material/EventSeatRounded";
import GroupRoundedIcon from "@mui/icons-material/GroupRounded";
import HomeRoundedIcon from "@mui/icons-material/HomeRounded";
import MailRoundedIcon from "@mui/icons-material/MailRounded";
import QrCode2RoundedIcon from "@mui/icons-material/QrCode2Rounded";
import ShieldRoundedIcon from "@mui/icons-material/ShieldRounded";
import {
  Box,
  Button,
  Card,
  CardActionArea,
  CardContent,
  Chip,
  Grid,
  Stack,
  Typography,
} from "@mui/material";
import Link from "next/link";
import * as React from "react";

export default function DashboardPage() {
  const { isAuthenticated, profile, roles, login, logout } = useAuth();
  const isSecurity = roles.includes("security") || roles.includes("admin");
  const isAdmin = roles.includes("admin");

  const CardLink: React.FC<{
    href: string;
    title: string;
    subtitle?: string;
    icon: React.ReactNode;
  }> = ({ href, title, subtitle, icon }) => (
    <Card
      elevation={0}
      sx={{
        borderRadius: 3,
        border: (theme) => `1px solid ${theme.palette.divider}`,
        bgcolor: "background.paper",
        transition: "all .2s ease",
        "&:hover": {
          transform: "translateY(-2px)",
          boxShadow: "0 10px 30px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.12)",
        },
      }}
    >
      <CardActionArea component={Link} href={href} sx={{ p: 2 }}>
        <Stack direction="row" spacing={2} alignItems="center">
          <Box
            sx={{
              width: 44,
              height: 44,
              borderRadius: 2,
              display: "grid",
              placeItems: "center",
              border: (theme) => `1px solid ${theme.palette.divider}`,
              bgcolor: "background.default",
            }}
          >
            {icon}
          </Box>
          <Box>
            <Typography variant="subtitle1" fontWeight={700}>
              {title}
            </Typography>
            {subtitle && (
              <Typography variant="body2" color="text.secondary">
                {subtitle}
              </Typography>
            )}
          </Box>
        </Stack>
      </CardActionArea>
    </Card>
  );

  return (
    <Box sx={{ mt: { xs: 1, md: 2 } }}>
      {/* Header */}
      <Card
        elevation={0}
        sx={{
          mb: 3,
          borderRadius: 3,
          border: (theme) => `1px solid ${theme.palette.divider}`,
          bgcolor: "background.paper",
        }}
      >
        <CardContent>
          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={2}
            alignItems={{ xs: "flex-start", sm: "center" }}
            justifyContent="space-between"
          >
            <Stack spacing={0.5}>
              <Stack direction="row" spacing={1} alignItems="center">
                <HomeRoundedIcon />
                <Typography variant="h5" fontWeight={800}>
                  Willkommen bei Checkpoint
                </Typography>
              </Stack>
              <Typography variant="body2" color="text.secondary">
                Mobile‑first Gästeverwaltung mit QR‑Codes & Security‑Workflow.
              </Typography>
            </Stack>

            <Stack direction="row" spacing={1} alignItems="center">
              {isAuthenticated ? (
                <>
                  <Chip
                    label={
                      profile?.email ||
                      profile?.preferred_username ||
                      "Eingeloggt"
                    }
                    variant="outlined"
                    size="small"
                  />
                  {roles.length > 0 && (
                    <Chip
                      label={roles.join(", ")}
                      color="primary"
                      variant="outlined"
                      size="small"
                    />
                  )}
                  <Button
                    variant="outlined"
                    color="error"
                    onClick={() => logout()}
                  >
                    Logout
                  </Button>
                </>
              ) : (
                <Button variant="contained" onClick={() => login()}>
                  Login
                </Button>
              )}
            </Stack>
          </Stack>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Grid container spacing={2}>
        {/* Gäste-sichtbare Aktionen */}
        <Grid item xs={12} sm={6} md={4}>
          <CardLink
            href="/my-qr"
            title="Mein QR‑Code"
            subtitle="Persönlicher Eintritts‑QR (signiert)"
            icon={<QrCode2RoundedIcon />}
          />
        </Grid>

        <Grid item xs={12} sm={6} md={4}>
          <CardLink
            href="/qr"
            title="QR‑Demo"
            subtitle="Einfache QR‑Vorschau (dev)"
            icon={<BadgeRoundedIcon />}
          />
        </Grid>

        <Grid item xs={12} sm={6} md={4}>
          <CardLink
            href="/invitations"
            title="Einladungen"
            subtitle="CSV hochladen, Links versenden"
            icon={<MailRoundedIcon />}
          />
        </Grid>

        {/* Security */}
        {isSecurity && (
          <Grid item xs={12} sm={6} md={4}>
            <CardLink
              href="/scan"
              title="Scanner"
              subtitle="Kamera öffnen & prüfen"
              icon={<CameraAltRoundedIcon />}
            />
          </Grid>
        )}

        {isSecurity && (
          <Grid item xs={12} sm={6} md={4}>
            <CardLink
              href="/security"
              title="Security Dashboard"
              subtitle="Live‑Logs aller Scans"
              icon={<ShieldRoundedIcon />}
            />
          </Grid>
        )}

        {/* Admin */}
        {isAdmin && (
          <Grid item xs={12} sm={6} md={4}>
            <CardLink
              href="/guests"
              title="Gästeliste"
              subtitle="Profile, Status, Filter"
              icon={<GroupRoundedIcon />}
            />
          </Grid>
        )}

        {isAdmin && (
          <Grid item xs={12} sm={6} md={4}>
            <CardLink
              href="/seats"
              title="Sitzplätze"
              subtitle="Bereiche, Reihen, Plätze zuweisen"
              icon={<EventSeatRoundedIcon />}
            />
          </Grid>
        )}

        {isAdmin && (
          <Grid item xs={12} sm={6} md={4}>
            <CardLink
              href="/events"
              title="Events"
              subtitle="Anlegen, Zeiten, Regeln"
              icon={<EventRoundedIcon />}
            />
          </Grid>
        )}
      </Grid>

      {!isAuthenticated && (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 3 }}>
          Tipp: Melde dich an, um deinen persönlichen QR‑Code zu sehen und –
          falls berechtigt – den Scanner, das Security‑Dashboard sowie
          Admin‑Bereiche zu nutzen.
        </Typography>
      )}
    </Box>
  );
}
