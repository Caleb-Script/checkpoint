// /Users/gentlebookpro/Projekte/checkpoint/web/src/app/providers.tsx
"use client";

import * as React from "react";
import {
  ThemeProvider,
  createTheme,
  responsiveFontSizes,
} from "@mui/material/styles";
import { CssBaseline } from "@mui/material";
import SessionProvider from "@/context/SessionContext";

/** Apple‑ähnliches Theme erstellen */
function buildTheme(mode: "light" | "dark") {
  const base = createTheme({
    palette: {
      mode,
      primary: { main: "#0A84FF" }, // iOS Blau
      secondary: { main: "#30D158" }, // iOS Grün
      background:
        mode === "light"
          ? { default: "#FAFAFC", paper: "#FFFFFF" }
          : { default: "#0F1115", paper: "#121418" },
    },
    typography: {
      fontFamily:
        '-apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", "Segoe UI", Roboto, Helvetica, Arial',
    },
    shape: { borderRadius: 16 },
  });
  return responsiveFontSizes(base);
}

export default function Providers({ children }: { children: React.ReactNode }) {
  // Theme-Mode per localStorage + System-Fallback
  const [mode, setMode] = React.useState<"light" | "dark">(() => {
    if (typeof window === "undefined") return "light";
    const saved = window.localStorage.getItem("cp_theme_mode");
    if (saved === "light" || saved === "dark") return saved;
    const prefersDark = window.matchMedia?.(
      "(prefers-color-scheme: dark)"
    )?.matches;
    return prefersDark ? "dark" : "light";
  });

  // Globalen Toggle bereitstellen, den AppShell nutzt
  React.useEffect(() => {
    const toggle = () => {
      setMode((prev) => {
        const next = prev === "light" ? "dark" : "light";
        try {
          window.localStorage.setItem("cp_theme_mode", next);
        } catch {}
        return next;
      });
    };

    (window as any).toggleColorMode = toggle;
    const onCustom = () => toggle();
    window.addEventListener("toggle-theme", onCustom);

    return () => {
      try {
        delete (window as any).toggleColorMode;
      } catch {
        (window as any).toggleColorMode = undefined;
      }
      window.removeEventListener("toggle-theme", onCustom);
    };
  }, []);

  const theme = React.useMemo(() => buildTheme(mode), [mode]);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      {/* Dein SessionContext bleibt unverändert und ist hier eingebettet */}
      <SessionProvider>{children}</SessionProvider>
    </ThemeProvider>
  );
}
