// apps/web/src/components/device/DeviceCard.tsx
'use client';

import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import ContentCopyRoundedIcon from '@mui/icons-material/ContentCopyRounded';
import ErrorOutlineRoundedIcon from '@mui/icons-material/ErrorOutlineRounded';
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded';
import {
  Alert,
  Box,
  Button,
  Card,
  CardActions,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Snackbar,
  Tooltip,
  Typography,
} from '@mui/material';
import * as React from 'react';

type DeviceCardProps = {
  deviceHash: string | null;
  loading: boolean;
  error: string | null;
  onRotate?: () => Promise<void> | void;
};

export function DeviceCard(props: DeviceCardProps): JSX.Element {
  const { deviceHash, loading, error, onRotate } = props;

  const [copied, setCopied] = React.useState<boolean>(false);
  const [confirmOpen, setConfirmOpen] = React.useState<boolean>(false);

  const handleCopy = async (): Promise<void> => {
    if (!deviceHash) return;
    await navigator.clipboard.writeText(deviceHash);
    setCopied(true);
  };

  const handleRotateClick = (): void => {
    setConfirmOpen(true);
  };

  const handleRotateConfirm = async (): Promise<void> => {
    setConfirmOpen(false);
    if (onRotate) await onRotate();
  };

  return (
    <Card
      elevation={0}
      sx={{
        borderRadius: 4,
        overflow: 'hidden',
        border: '1px solid',
        borderColor: 'divider',
        bgcolor: 'background.paper',
      }}
    >
      {/* Header / Hero */}
      <Box
        sx={{
          px: 3,
          py: 3,
          background:
            'linear-gradient(135deg, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.75) 40%, rgba(0,0,0,0.70) 100%)',
          color: 'common.white',
        }}
      >
        <Typography variant="h5" sx={{ fontWeight: 700, letterSpacing: 0.2 }}>
          Dieses Gerät
        </Typography>
        <Typography variant="body2" sx={{ opacity: 0.8, mt: 0.75 }}>
          Der Geräte-Hash identifiziert dein aktuelles Gerät für sichere
          Einlass-Scans.
        </Typography>

        {/* Status Row */}
        <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', gap: 1.25 }}>
          {loading ? (
            <>
              <CircularProgress size={16} color="inherit" />
              <Typography variant="caption" sx={{ opacity: 0.9 }}>
                wird berechnet&hellip;
              </Typography>
            </>
          ) : error ? (
            <>
              <ErrorOutlineRoundedIcon fontSize="small" />
              <Typography variant="caption" sx={{ opacity: 0.9 }}>
                Fehler beim Laden
              </Typography>
            </>
          ) : deviceHash ? (
            <>
              <CheckCircleRoundedIcon fontSize="small" />
              <Typography variant="caption" sx={{ opacity: 0.9 }}>
                bereit
              </Typography>
            </>
          ) : (
            <Typography variant="caption" sx={{ opacity: 0.9 }}>
              kein Hash vorhanden
            </Typography>
          )}
        </Box>
      </Box>

      {/* Content */}
      <CardContent sx={{ p: 3 }}>
        {error && (
          <Alert severity="error" sx={{ borderRadius: 3, mb: 2 }}>
            {error}
          </Alert>
        )}

        <Typography variant="overline" sx={{ color: 'text.secondary' }}>
          deviceHash
        </Typography>

        <Box
          sx={{
            mt: 1,
            p: 2,
            borderRadius: 3,
            bgcolor: 'grey.50',
            border: '1px dashed',
            borderColor: 'divider',
            fontFamily:
              'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
            fontSize: 13,
            lineHeight: 1.6,
            wordBreak: 'break-all',
            color: 'text.primary',
          }}
        >
          {loading ? '…' : (deviceHash ?? '—')}
        </Box>

        <Box sx={{ mt: 2, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
          <Chip label="Privatsphäre-freundlich" size="small" />
          <Chip label="Stabil & lokal" size="small" />
          <Chip label="Kein Fingerprinting" size="small" />
        </Box>

        <Divider sx={{ my: 2 }} />

        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          Der Geräte-Hash basiert auf einem zufälligen, lokal gespeicherten
          Secret. Wenn du Website-Daten löschst oder den Hash rotierst, gilt
          dieses Gerät als neu und benötigt ggf. eine erneute Freigabe.
        </Typography>
      </CardContent>

      {/* Actions */}
      <CardActions sx={{ px: 3, pb: 3, pt: 0, gap: 1.5, flexWrap: 'wrap' }}>
        <Tooltip title="Hash in die Zwischenablage kopieren">
          <span>
            <Button
              variant="contained"
              disableElevation
              startIcon={<ContentCopyRoundedIcon />}
              onClick={handleCopy}
              disabled={!deviceHash || !!error || loading}
              sx={{
                borderRadius: 999,
                textTransform: 'none',
                px: 2.25,
                py: 1,
              }}
            >
              Kopieren
            </Button>
          </span>
        </Tooltip>

        <Tooltip title="Geräte-Secret rotieren (erzeugt neuen Hash)">
          <span>
            <Button
              variant="outlined"
              startIcon={<RefreshRoundedIcon />}
              onClick={handleRotateClick}
              disabled={loading}
              sx={{
                borderRadius: 999,
                textTransform: 'none',
                px: 2,
                py: 1,
              }}
            >
              Rotieren
            </Button>
          </span>
        </Tooltip>
      </CardActions>

      {/* Copied Snackbar */}
      <Snackbar
        open={copied}
        autoHideDuration={1300}
        onClose={() => setCopied(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setCopied(false)}
          severity="success"
          sx={{ width: '100%' }}
          variant="filled"
        >
          deviceHash kopiert
        </Alert>
      </Snackbar>

      {/* Confirm Rotate */}
      <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)}>
        <DialogTitle>Geräte-Secret rotieren?</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mt: 0.5 }}>
            Dadurch wird ein <b>neuer deviceHash</b> erzeugt. Dieses Gerät gilt
            dann als neu und kann vorübergehend blockiert sein, bis es erneut
            freigegeben wurde.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmOpen(false)}>Abbrechen</Button>
          <Button variant="contained" onClick={handleRotateConfirm}>
            Rotieren
          </Button>
        </DialogActions>
      </Dialog>
    </Card>
  );
}
