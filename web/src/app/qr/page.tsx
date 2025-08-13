// /Users/gentlebookpro/Projekte/checkpoint/web/src/app/qr/page.tsx
"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import QRCode from "qrcode";
import { Box, Button, Card, CardContent, Typography } from "@mui/material";
import { useSession } from "@/context/SessionContext";

export default function QrPage() {
  const { loading, isAuthenticated, user, roles } = useSession();
  const router = useRouter();
  const [qrDataUrl, setQrDataUrl] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;

    async function gen() {
      if (!isAuthenticated || !user) {
        setQrDataUrl(null);
        return;
      }

      const payload = {
        sub: user.sub,
        email: user.email,
        name:
          user.name ||
          user.preferred_username ||
          [user.given_name, user.family_name]
            .filter(Boolean)
            .join(" ")
            .trim() ||
          undefined,
        roles,
        ts: Date.now(),
      };

      try {
        const dataUrl = await QRCode.toDataURL(JSON.stringify(payload), {
          width: 320,
          margin: 1,
        });
        if (!cancelled) setQrDataUrl(dataUrl);
      } catch (err) {
        console.error("QR-Code Fehler:", err);
        if (!cancelled) setQrDataUrl(null);
      }
    }

    gen();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, user, roles]);

  if (loading) {
    return (
      <Typography variant="body1" sx={{ mt: 4, textAlign: "center" }}>
        Lade …
      </Typography>
    );
  }

  if (!isAuthenticated) {
    return (
      <Box textAlign="center" mt={4}>
        <Typography variant="h6" gutterBottom>
          Bitte zuerst einloggen
        </Typography>
        <Button
          variant="contained"
          onClick={() =>
            router.push(`/login?next=${encodeURIComponent("/qr")}`)
          }
        >
          Login
        </Button>
      </Box>
    );
  }

  return (
    <Card>
      <CardContent sx={{ textAlign: "center" }}>
        <Typography variant="h6" gutterBottom>
          Dein persönlicher QR-Code
        </Typography>

        {qrDataUrl ? (
          <Box sx={{ display: "flex", justifyContent: "center", mt: 2 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={qrDataUrl}
              alt="Dein QR Code"
              style={{
                width: 280,
                height: 280,
                background: "#fff",
                padding: 8,
                borderRadius: 16,
              }}
            />
          </Box>
        ) : (
          <Typography variant="body2" color="text.secondary">
            QR-Code wird generiert …
          </Typography>
        )}

        <Typography
          variant="caption"
          color="text.secondary"
          display="block"
          sx={{ mt: 2 }}
        >
          Dieser Demo‑Code enthält deine Basis‑Session‑Infos (sub, E‑Mail,
          Rollen). Für den echten Einlass nutze bitte <strong>„Mein QR“</strong>
          , dort ist der signierte Ticket‑QR mit Ablauf hinterlegt.
        </Typography>
      </CardContent>
    </Card>
  );
}
