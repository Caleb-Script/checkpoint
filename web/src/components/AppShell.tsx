// /Users/gentlebookpro/Projekte/checkpoint/web/src/components/AppShell.tsx
"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Box,
  BottomNavigation,
  BottomNavigationAction,
  useMediaQuery,
  Tooltip,
  Divider,
  Menu,
  MenuItem,
  Avatar,
  Chip,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import MenuIcon from "@mui/icons-material/Menu";
import HomeRoundedIcon from "@mui/icons-material/HomeRounded";
import QrCode2RoundedIcon from "@mui/icons-material/QrCode2Rounded";
import BadgeRoundedIcon from "@mui/icons-material/BadgeRounded";
import ShieldRoundedIcon from "@mui/icons-material/ShieldRounded";
import CameraAltRoundedIcon from "@mui/icons-material/CameraAltRounded";
import LogoutRoundedIcon from "@mui/icons-material/LogoutRounded";
import LoginRoundedIcon from "@mui/icons-material/LoginRounded";
import MailRoundedIcon from "@mui/icons-material/MailRounded";
import SendRoundedIcon from "@mui/icons-material/SendRounded";
import GroupRoundedIcon from "@mui/icons-material/GroupRounded";
import EventSeatRoundedIcon from "@mui/icons-material/EventSeatRounded";
import EventRoundedIcon from "@mui/icons-material/EventRounded";
import TableViewRoundedIcon from "@mui/icons-material/TableViewRounded";
import Brightness4RoundedIcon from "@mui/icons-material/Brightness4Rounded";
import Brightness7RoundedIcon from "@mui/icons-material/Brightness7Rounded";
import SensorsRoundedIcon from "@mui/icons-material/SensorsRounded";
import ConfirmationNumberOutlinedIcon from "@mui/icons-material/ConfirmationNumberOutlined"; // Ticket öffnen
import { useSession } from "@/context/SessionContext";

// ---------------------------------------------
// Navigationseinträge (Sidebar + BottomNav)
// ---------------------------------------------
type NavItem = {
  label: string;
  href: string;
  icon: React.ReactNode;
  roles?: string[]; // sichtbar nur mit einer dieser Rollen
};

const NAV_ITEMS: NavItem[] = [
  { label: "Home", href: "/", icon: <HomeRoundedIcon /> },
  { label: "Mein QR", href: "/my-qr", icon: <QrCode2RoundedIcon /> },
  { label: "QR (Demo)", href: "/qr", icon: <BadgeRoundedIcon /> },
  {
    label: "Ticket öffnen",
    href: "/ticket",
    icon: <ConfirmationNumberOutlinedIcon />,
  },

  {
    label: "Scanner",
    href: "/scan",
    icon: <CameraAltRoundedIcon />,
    roles: ["security", "admin"],
  },
  {
    label: "Security",
    href: "/security",
    icon: <ShieldRoundedIcon />,
    roles: ["security", "admin"],
  },
  {
    label: "Einladungen (CSV)",
    href: "/invitations",
    icon: <MailRoundedIcon />,
    roles: ["security", "admin"],
  },
  {
    label: "RSVP Freigabe & Versand",
    href: "/invitations/responses",
    icon: <SendRoundedIcon />,
    roles: ["security", "admin"],
  },
  {
    label: "Freigegebene (Client)",
    href: "/invitations/responses/client",
    icon: <TableViewRoundedIcon />,
    roles: ["security", "admin"],
  },

  {
    label: "Gäste",
    href: "/guests",
    icon: <GroupRoundedIcon />,
    roles: ["admin"],
  },
  {
    label: "Sitzplätze",
    href: "/seats",
    icon: <EventSeatRoundedIcon />,
    roles: ["admin"],
  },
  {
    label: "Events",
    href: "/events",
    icon: <EventRoundedIcon />,
    roles: ["admin"],
  },
];

const DRAWER_WIDTH = 240;

// ---------------------------------------------
// User-Menü (Avatar oben rechts)
// ---------------------------------------------
function UserMenu({
  name,
  email,
  onLogout,
  onLoginRoute,
}: {
  name?: string | null;
  email?: string | null;
  onLogout: () => void;
  onLoginRoute: () => void;
}) {
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);
  const handleOpen = (e: React.MouseEvent<HTMLElement>) =>
    setAnchorEl(e.currentTarget);
  const handleClose = () => setAnchorEl(null);

  const initials =
    (name
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase() ||
      email?.[0]?.toUpperCase() ||
      "U") + "";

  return (
    <>
      {email ? (
        <IconButton onClick={handleOpen}>
          <Avatar sx={{ width: 28, height: 28 }}>{initials}</Avatar>
        </IconButton>
      ) : (
        <Tooltip title="Einloggen">
          <IconButton color="primary" onClick={onLoginRoute}>
            <LoginRoundedIcon />
          </IconButton>
        </Tooltip>
      )}
      <Menu anchorEl={anchorEl} open={open} onClose={handleClose}>
        <MenuItem disabled>
          <Box sx={{ display: "grid" }}>
            <Typography fontWeight={700}>{name || "Nutzer"}</Typography>
            <Typography variant="caption" color="text.secondary">
              {email || "-"}
            </Typography>
          </Box>
        </MenuItem>
        <Divider />
        <MenuItem component={Link} href="/my-qr">
          Mein QR
        </MenuItem>
        <MenuItem component={Link} href="/settings">
          Einstellungen
        </MenuItem>
        <Divider />
        <MenuItem
          onClick={() => {
            handleClose();
            onLogout();
          }}
        >
          <LogoutRoundedIcon fontSize="small" style={{ marginRight: 8 }} />
          Logout
        </MenuItem>
      </Menu>
    </>
  );
}

// ---------------------------------------------
// Haupt-Layout mit echter Live-Anzeige (WebSocket)
// ---------------------------------------------
export default function AppShell({ children }: { children: React.ReactNode }) {
  const theme = useTheme();
  const router = useRouter();
  const pathname = usePathname();
  const isMdUp = useMediaQuery(theme.breakpoints.up("md"));
  const [drawerOpen, setDrawerOpen] = React.useState(false);

  const { isAuthenticated, roles, user, logout } = useSession();

  // Sichtbare Sidebar-Items nach Rolle
  const visibleItems = React.useMemo(() => {
    if (!isAuthenticated) return NAV_ITEMS.filter((i) => !i.roles);
    return NAV_ITEMS.filter(
      (i) => !i.roles || i.roles.some((r) => roles.includes(r)),
    );
  }, [isAuthenticated, roles]);

  // Aktiver Index für BottomNav
  const activeIndex = React.useMemo(() => {
    const ix = visibleItems.findIndex(
      (i) =>
        pathname === i.href ||
        (i.href !== "/" && pathname?.startsWith(i.href + "/")),
    );
    return ix === -1 ? 0 : ix;
  }, [pathname, visibleItems]);

  const go = (href: string) => {
    setDrawerOpen(false);
    router.push(href);
  };

  // ------------------------------
  // Live-Status via WebSocket (mit Auto-Reconnect + Backoff)
  // ------------------------------
  const [live, setLive] = React.useState(false);
  const [liveCount, setLiveCount] = React.useState<number | null>(null);
  const reconnectRef = React.useRef({
    tries: 0,
    timer: 0 as unknown as number,
  });
  const wsRef = React.useRef<WebSocket | null>(null);

  const connectWs = React.useCallback(() => {
    if (!isAuthenticated) return;

    // vorhandene Verbindung schließen
    try {
      wsRef.current?.close();
    } catch {}
    wsRef.current = null;

    const url =
      process.env.NEXT_PUBLIC_WS_URL ||
      (typeof window !== "undefined"
        ? `${window.location.protocol === "https:" ? "wss" : "ws"}://${window.location.hostname}:3001`
        : "");

    if (!url) return;

    try {
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        setLive(true);
        reconnectRef.current.tries = 0;
      };

      ws.onclose = () => {
        setLive(false);
        setLiveCount(null);
        // Backoff (max ~10s)
        reconnectRef.current.tries += 1;
        const delay = Math.min(10000, 500 * reconnectRef.current.tries);
        reconnectRef.current.timer = window.setTimeout(
          connectWs,
          delay,
        ) as unknown as number;
      };

      ws.onerror = () => {
        try {
          ws.close();
        } catch {}
      };

      ws.onmessage = (ev) => {
        try {
          const data = JSON.parse(ev.data);
          const n = data?.active ?? data?.activeClients;
          if (typeof n === "number") setLiveCount(n);
        } catch {
          /* ignore */
        }
      };
    } catch {
      setLive(false);
      reconnectRef.current.tries += 1;
      const delay = Math.min(10000, 500 * reconnectRef.current.tries);
      reconnectRef.current.timer = window.setTimeout(
        connectWs,
        delay,
      ) as unknown as number;
    }
  }, [isAuthenticated]);

  React.useEffect(() => {
    if (!isAuthenticated) {
      setLive(false);
      setLiveCount(null);
      return;
    }
    connectWs();
    return () => {
      try {
        wsRef.current?.close();
      } catch {}
      if (reconnectRef.current.timer)
        window.clearTimeout(reconnectRef.current.timer as number);
    };
  }, [isAuthenticated, connectWs]);

  // Theme-Toggle (nutzt deine globale Funktion aus Providers)
  const onToggleTheme = React.useCallback(() => {
    (window as any).toggleColorMode?.();
  }, []);

  // Drawer-Inhalt
  const DrawerContent = (
    <Box role="presentation" sx={{ width: DRAWER_WIDTH }}>
      <Box sx={{ px: 2, py: 2 }}>
        <Typography variant="h6" fontWeight={700}>
          Checkpoint
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Gäste · QR · Security
        </Typography>
      </Box>
      <Divider sx={{ display: "none" }} />
      <List>
        {visibleItems.map((item) => {
          const selected =
            pathname === item.href ||
            (item.href !== "/" && pathname?.startsWith(item.href + "/"));
          return (
            <ListItemButton
              key={item.href}
              component={Link}
              href={item.href}
              selected={!!selected}
              sx={{ borderRadius: 2, mx: 1, my: 0.5 }}
              onClick={() => setDrawerOpen(false)}
            >
              <ListItemIcon sx={{ minWidth: 40 }}>{item.icon}</ListItemIcon>
              <ListItemText primary={item.label} />
            </ListItemButton>
          );
        })}
      </List>
      <Box sx={{ p: 1.5, display: "flex", gap: 1 }}>
        {!isAuthenticated ? (
          <Tooltip title="Einloggen">
            <IconButton color="primary" onClick={() => router.push("/login")}>
              <LoginRoundedIcon />
            </IconButton>
          </Tooltip>
        ) : (
          <Tooltip title="Logout">
            <IconButton color="error" onClick={() => logout()}>
              <LogoutRoundedIcon />
            </IconButton>
          </Tooltip>
        )}
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: "flex", minHeight: "100dvh" }}>
      {/* Top AppBar – cleaner iOS-Look (ohne Border), nur Live + Theme + User */}
      <AppBar
        position="fixed"
        color="transparent"
        elevation={0}
        sx={{
          backgroundColor:
            theme.palette.mode === "light"
              ? "rgba(255,255,255,0.7)"
              : "rgba(18,18,18,0.6)",
          backdropFilter: "saturate(180%) blur(20px)",
          WebkitBackdropFilter: "saturate(180%) blur(20px)",
          boxShadow: "none",
          borderBottom: "none",
        }}
      >
        <Toolbar sx={{ gap: 1 }}>
          {!isMdUp && (
            <IconButton
              edge="start"
              aria-label="menu"
              onClick={() => setDrawerOpen(true)}
            >
              <MenuIcon />
            </IconButton>
          )}

          <Typography variant="h6" sx={{ fontWeight: 700, flexGrow: 1 }}>
            Checkpoint
          </Typography>

          {/* Live-Status (WebSocket) */}
          {isAuthenticated && (
            <Chip
              size="small"
              variant="outlined"
              color={live ? "success" : "default"}
              icon={<SensorsRoundedIcon />}
              label={
                live
                  ? liveCount != null
                    ? `Live · ${liveCount}`
                    : "Live"
                  : "Offline"
              }
              sx={{ mr: 1 }}
            />
          )}

          {/* Theme Toggle */}
          <Tooltip
            title={theme.palette.mode === "light" ? "Dark Mode" : "Light Mode"}
          >
            <IconButton onClick={onToggleTheme}>
              {theme.palette.mode === "light" ? (
                <Brightness4RoundedIcon />
              ) : (
                <Brightness7RoundedIcon />
              )}
            </IconButton>
          </Tooltip>

          {/* User-Menü */}
          <UserMenu
            name={user?.name}
            email={user?.email}
            onLogout={() => logout()}
            onLoginRoute={() => router.push("/login")}
          />
        </Toolbar>
      </AppBar>

      {/* Permanent Drawer (md+) */}
      {isMdUp && (
        <Drawer
          variant="permanent"
          open
          sx={{
            width: DRAWER_WIDTH,
            flexShrink: 0,
            [`& .MuiDrawer-paper`]: {
              width: DRAWER_WIDTH,
              boxSizing: "border-box",
              borderRight: "none",
              backgroundColor:
                theme.palette.mode === "light"
                  ? "rgba(255,255,255,0.55)"
                  : "rgba(18,18,18,0.5)",
              backdropFilter: "saturate(180%) blur(20px)",
            },
          }}
        >
          <Toolbar />
          {DrawerContent}
        </Drawer>
      )}

      {/* Temporary Drawer (mobil) */}
      {!isMdUp && (
        <Drawer
          variant="temporary"
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          ModalProps={{ keepMounted: true }}
          sx={{
            [`& .MuiDrawer-paper`]: {
              width: DRAWER_WIDTH,
              boxSizing: "border-box",
              borderRight: "none",
            },
          }}
        >
          <Toolbar />
          {DrawerContent}
        </Drawer>
      )}

      {/* Hauptinhalt – startet unter der AppBar */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          px: { xs: 1.5, sm: 2 },
          pb: { xs: 8, md: 4 },
          ml: { md: `${DRAWER_WIDTH}px` },
          maxWidth: 1200,
          width: "100%",
          mx: "auto",
          ...theme.mixins.toolbar,
          pt: { xs: 9, md: 10 },
        }}
      >
        {children}
      </Box>

      {/* Bottom Navigation (mobil) */}
      {!isMdUp && (
        <Box
          sx={{
            position: "fixed",
            bottom: 0,
            left: 0,
            right: 0,
            borderTop: "none",
            backgroundColor:
              theme.palette.mode === "light"
                ? "rgba(255,255,255,0.9)"
                : "rgba(18,18,18,0.9)",
            backdropFilter: "saturate(180%) blur(20px)",
          }}
        >
          <BottomNavigation
            value={activeIndex}
            onChange={(_, newValue) => {
              const item = visibleItems[newValue];
              if (item) go(item.href);
            }}
            showLabels
          >
            {visibleItems.map((item) => (
              <BottomNavigationAction
                key={item.href}
                label={item.label}
                icon={item.icon}
              />
            ))}
          </BottomNavigation>
        </Box>
      )}
    </Box>
  );
}
