// /Users/gentlebookpro/Projekte/checkpoint/web/src/app/my-qr/page.tsx
"use client";

import {
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Typography,
} from "@mui/material";
import * as React from "react";

export default function MyQrPage() {
  const { isAuthenticated, token, loading, login } = useAuth();
  const [qr, setQr] = React.useState<string | null>(null);
  const [fetching, setFetching] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const fetchQr = React.useCallback(async () => {
    if (!token) return;
    setFetching(true);
    setError(null);
    try {
      const res = await fetch("/api/my-qr", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Fehler beim Laden des QR-Codes");
      }
      const data = await res.json();
      setQr(data.qr);
    } catch (err: any) {
      setError(err.message);
      setQr(null);
    } finally {
      setFetching(false);
    }
  }, [token]);

  React.useEffect(() => {
    if (isAuthenticated && token) {
      void fetchQr();
    }
  }, [isAuthenticated, token, fetchQr]);

  if (loading) {
    return (
      <Box textAlign="center" mt={4}>
        <CircularProgress />
      </Box>
    );
  }

  if (!isAuthenticated) {
    return (
      <Box textAlign="center" mt={4}>
        <Typography variant="h6" gutterBottom>
          Bitte zuerst einloggen
        </Typography>
        <Button variant="contained" onClick={() => login()}>
          Login
        </Button>
      </Box>
    );
  }

  return (
    <Card>
      <CardContent sx={{ textAlign: "center" }}>
        <Typography variant="h6" gutterBottom>
          Dein Eintritts-QR-Code
        </Typography>

        {fetching && <CircularProgress sx={{ mt: 2 }} />}

        {error && (
          <Typography color="error" sx={{ mt: 2 }}>
            {error}
          </Typography>
        )}

        {qr && (
          <Box sx={{ display: "flex", justifyContent: "center", mt: 2 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={qr}
              alt="Dein QR-Code"
              style={{
                width: 280,
                height: 280,
                background: "#fff",
                padding: 8,
                borderRadius: 16,
              }}
            />
          </Box>
        )}

        <Button
          variant="outlined"
          sx={{ mt: 3 }}
          onClick={() => fetchQr()}
          disabled={fetching}
        >
          Neu laden
        </Button>

        <Typography
          variant="caption"
          color="text.secondary"
          display="block"
          sx={{ mt: 2 }}
        >
          Der QR-Code ist nur kurz gültig und wird bei jedem Laden neu
          generiert.
        </Typography>
      </CardContent>
    </Card>
  );
}
