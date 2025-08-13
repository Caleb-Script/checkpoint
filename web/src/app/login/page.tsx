// /Users/gentlebookpro/Projekte/checkpoint/web/src/app/login/page.tsx
"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Box,
  Card,
  CardContent,
  TextField,
  InputAdornment,
  IconButton,
  Button,
  Typography,
  Alert,
  CircularProgress,
  Stack,
} from "@mui/material";
import PersonRoundedIcon from "@mui/icons-material/PersonRounded";
import LockRoundedIcon from "@mui/icons-material/LockRounded";
import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";
import LoginRoundedIcon from "@mui/icons-material/LoginRounded";
import { useSession } from "@/context/SessionContext";

export default function LoginPage() {
  const { loading, isAuthenticated, login } = useSession();
  const router = useRouter();
  const sp = useSearchParams();
  const next = sp.get("next") || "/";

  const [username, setUsername] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [showPw, setShowPw] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!loading && isAuthenticated) {
      router.replace(next);
    }
  }, [loading, isAuthenticated, next, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      setError("Bitte Benutzername und Passwort eingeben.");
      return;
    }
    setSubmitting(true);
    setError(null);
    const res = await login(username.trim(), password);
    setSubmitting(false);
    if (res.ok) {
      router.replace(next);
    } else {
      setError(res.error || "Login fehlgeschlagen.");
    }
  };

  return (
    <Box
      sx={{
        mt: { xs: 4, md: 8 },
        display: "grid",
        placeItems: "center",
        px: 2,
      }}
    >
      <Card
        elevation={0}
        sx={{
          width: "100%",
          maxWidth: 420,
          border: (t) => `1px solid ${t.palette.divider}`,
          borderRadius: 3,
        }}
      >
        <CardContent>
          <Stack spacing={2}>
            <Box textAlign="center" sx={{ mb: 1 }}>
              <Typography variant="h5" fontWeight={800}>
                Anmelden
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Willkommen bei Checkpoint
              </Typography>
            </Box>

            {error && <Alert severity="error">{error}</Alert>}

            <form onSubmit={handleSubmit}>
              <Stack spacing={2}>
                <TextField
                  label="Benutzername oder E‑Mail"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoComplete="username"
                  fullWidth
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <PersonRoundedIcon />
                      </InputAdornment>
                    ),
                  }}
                />

                <TextField
                  label="Passwort"
                  type={showPw ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  fullWidth
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <LockRoundedIcon />
                      </InputAdornment>
                    ),
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          aria-label="Passwort anzeigen"
                          onClick={() => setShowPw((s) => !s)}
                          edge="end"
                        >
                          {showPw ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />

                <Button
                  type="submit"
                  variant="contained"
                  size="large"
                  startIcon={<LoginRoundedIcon />}
                  disabled={submitting}
                >
                  {submitting ? (
                    <>
                      <CircularProgress size={18} sx={{ mr: 1 }} />
                      Anmelden…
                    </>
                  ) : (
                    "Anmelden"
                  )}
                </Button>
              </Stack>
            </form>

            <Typography
              variant="caption"
              color="text.secondary"
              textAlign="center"
            >
              Mit der Anmeldung akzeptierst du unsere Nutzungsbedingungen.
            </Typography>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
}
