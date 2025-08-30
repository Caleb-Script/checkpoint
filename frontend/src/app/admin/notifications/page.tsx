// /frontend/src/app/admin/notifications/page.tsx
'use client';

import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Snackbar,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from '@mui/material';
import * as React from 'react';

import ArchiveIcon from '@mui/icons-material/Archive';
import CategoryIcon from '@mui/icons-material/Category';
import MarkEmailReadIcon from '@mui/icons-material/MarkEmailRead';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import RefreshIcon from '@mui/icons-material/Refresh';
import SearchIcon from '@mui/icons-material/Search';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';

import { gql, useLazyQuery, useMutation } from '@apollo/client';
import { getLogger } from '../../../utils/logger';

/** ================= GraphQL ================= */

const NOTIFICATION_FIELDS = gql`
  fragment NotificationFields on Notification {
    id
    recipientUsername
    recipientId
    recipientTenant
    templateId
    variables
    renderedTitle
    renderedBody
    data
    linkUrl
    priority
    category
    status
    read
    deliveredAt
    readAt
    archivedAt
    expiresAt
    sensitive
    createdAt
    updatedAt
    createdBy
  }
`;

// Empfohlen: serverseitige Paginierung für Admins
// const QUERY_NOTIFICATIONS_PAGED = gql`
//   query NotificationsPaged($input: ListAllNotificationsInput!) {
//     notificationsPaged(input: $input) {
//       items {
//         ...NotificationFields
//       }
//       nextCursor
//     }
//   }
//   ${NOTIFICATION_FIELDS}
// `;

const QUERY_NOTIFICATIONS_PAGED = gql`
  query NotificationsPaged($input: ListAllNotificationsInput!) {
    notificationsPaged(input: $input) {
      items {
        id
        recipientUsername
        recipientId
        recipientTenant
        templateId
        variables
        renderedTitle
        renderedBody
        data
        linkUrl
        priority
        category
        status
        read
        deliveredAt
        readAt
        archivedAt
        expiresAt
        sensitive
        createdAt
        updatedAt
        createdBy
      }
      nextCursor
    }
  }
`;

// Falls dein Server aktuell nur eine simple Liste hat, kannst du das als Fallback nehmen.
export const QUERY_NOTIFICATIONS_ALL = gql`
  query Notifications {
    notifications { ...NotificationFields }
  }
  ${NOTIFICATION_FIELDS}
`;

const MUT_MARK_READ = gql`
  mutation MarkNotificationRead($id: ID!) {
    markNotificationRead(input: { id: $id }) {
      id
      read
      readAt
      status
    }
  }
`;

const MUT_ARCHIVE = gql`
  mutation ArchiveNotification($id: ID!) {
    archiveNotification(id: $id) {
      id
      status
      archivedAt
    }
  }
`;

/** ================= Typen ================= */

type Notification = {
  id: string;
  recipientUsername: string;
  recipientId?: string | null;
  recipientTenant?: string | null;
  templateId?: string | null;
  variables?: Record<string, any>;
  renderedTitle: string;
  renderedBody: string;
  data?: Record<string, any>;
  linkUrl?: string | null;
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  category?: string | null;
  status: 'NEW' | 'SENT' | 'DELIVERED' | 'READ' | 'ARCHIVED';
  read: boolean;
  deliveredAt?: string | null;
  readAt?: string | null;
  archivedAt?: string | null;
  expiresAt?: string | null;
  sensitive: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy?: string | null;
};

/** ================ UI-Konstanten ================ */

const CATEGORY_OPTIONS = [
  'ALL',
  'ACCOUNT',
  'SECURITY',
  'WHATSAPP',
  'SYSTEM',
] as const;
const PAGE_SIZE = 50;

/** ================ Page ================ */

export default function AdminNotificationsPage() {
    const logger = getLogger(AdminNotificationsPage.name);
    
  // Filter-States (clientseitig)
  const [onlyUnread, setOnlyUnread] = React.useState(true);
  const [category, setCategory] = React.useState<string>('ALL');
  const [searchText, setSearchText] = React.useState<string>('');

  // Daten-States
  const [items, setItems] = React.useState<Notification[]>([]);
  const [nextCursor, setNextCursor] = React.useState<string | null>(null);

  // UI: WhatsApp-Fallback-Dialog & Snackbar
  const [waDialogOpen, setWaDialogOpen] = React.useState(false);
  const [waDialogText, setWaDialogText] = React.useState('');
  const [snack, setSnack] = React.useState<{
    open: boolean;
    msg: string;
    sev: 'success' | 'error' | 'info';
  }>({
    open: false,
    msg: '',
    sev: 'success',
  });

  const [fetchPaged, pagedState] = useLazyQuery(QUERY_NOTIFICATIONS_PAGED, {
    fetchPolicy: 'network-only',
    onCompleted: (d) => {
      const conn = d?.notificationsPaged;
      setItems(conn?.items ?? []);
        setNextCursor(conn?.nextCursor ?? null);
    },
  });

  // Optionaler Fallback – falls du (noch) keine Paginierung hast:
  // const [fetchAll, allState] = useLazyQuery(QUERY_NOTIFICATIONS_ALL, {
  //   fetchPolicy: 'network-only',
  //   onCompleted: (d) => {
  //     setItems(d?.notifications ?? []);
  //     setNextCursor(null);
  //   },
  // });

  const [markRead] = useMutation(MUT_MARK_READ);
  const [archive] = useMutation(MUT_ARCHIVE);

  const isLoading = pagedState.loading; // || allState.loading;
  const hasError = Boolean(pagedState.error /* || allState.error */);

  /** Zusammengesetzter Nachrichtentext (für WhatsApp & Clipboard) */
  const messageText = (n: Notification) => {
    const title = n.renderedTitle?.trim() ?? '';
    const body = n.renderedBody?.trim() ?? '';
    if (title && body) return `${title}\n\n${body}`;
    return title || body || '';
  };

  /** Nummernhelper */
  const phoneOf = (n: Notification) =>
    String(n.variables?.phone ?? n.data?.phone ?? '').trim();

  const whatsappHref = (n: Notification) => {
    const digits = phoneOf(n).replace(/\D/g, '');
    if (!digits) return null;
    return `https://wa.me/${digits}?text=${encodeURIComponent(messageText(n))}`;
  };

  /** Laden (erste Seite) */
  const refresh = React.useCallback(() => {
    setNextCursor(null);
    fetchPaged({
      variables: {
        input: {
          limit: PAGE_SIZE,
          includeRead: !onlyUnread,
          category: category === 'ALL' ? null : category,
          // optionale Server-Filter (z. B. by text) könntest du hier übergeben
        },
      },
    }).catch(() => {
      // Fallback, falls paging-query nicht existiert:
      // fetchAll();
    });
  }, [fetchPaged, onlyUnread, category]);

  /** Mehr laden (nächste Seite) */
  const loadMore = async () => {
    if (!nextCursor) return;
    const { data } = await fetchPaged({
      variables: {
        variables: undefined, // appease TS when using useLazyQuery
        input: {
          limit: PAGE_SIZE,
          includeRead: !onlyUnread,
          category: category === 'ALL' ? null : category,
          cursor: nextCursor,
        },
      } as any,
    });
    const conn = data?.notificationsPaged;
    setItems((prev) => [...prev, ...(conn?.items ?? [])]);
    setNextCursor(conn?.nextCursor ?? null);
  };

  /** Erste Ladung */
  React.useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Filterwechsel => Neu laden */
  React.useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onlyUnread, category]);

  /** Aktionen */
  const onMarkRead = async (id: string) => {
    // Optimistic UI
    setItems((prev) =>
      prev.map((n) =>
        n.id === id
          ? {
              ...n,
              read: true,
              status: 'READ',
              readAt: new Date().toISOString(),
            }
          : n,
      ),
    );
    try {
      await markRead({ variables: { id } });
    } catch {
      // rollback grob
      setItems((prev) =>
        prev.map((n) =>
          n.id === id
            ? { ...n, read: false, status: 'DELIVERED', readAt: null }
            : n,
        ),
      );
      setSnack({
        open: true,
        msg: 'Konnte nicht als gelesen markieren.',
        sev: 'error',
      });
    }
  };

  const onArchive = async (id: string) => {
    const old = items;
    setItems((prev) => prev.filter((n) => n.id !== id));
    try {
      await archive({ variables: { id } });
    } catch {
      setItems(old);
      setSnack({
        open: true,
        msg: 'Archivieren fehlgeschlagen.',
        sev: 'error',
      });
    }
  };

  const onWhatsApp = (n: Notification) => {
    const href = whatsappHref(n);
    if (href) {
      // echte WhatsApp-Weiterleitung
      window.open(href, '_blank', 'noopener,noreferrer');
      return;
    }
    // kein phone => Dialog mit Copy
    setWaDialogText(messageText(n));
    setWaDialogOpen(true);
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setSnack({
        open: true,
        msg: 'Nachricht in Zwischenablage kopiert.',
        sev: 'success',
      });
    } catch {
      // Fallback
      setSnack({
        open: true,
        msg: 'Konnte nicht kopieren. Bitte manuell.',
        sev: 'error',
      });
    }
  };

  /** Clientseitige Extra-Filterung (Suche) */
  const [searchTextLocal, setSearchTextLocal] = React.useState('');
  React.useEffect(() => setSearchText(searchTextLocal), [searchTextLocal]);
  const filtered = React.useMemo(() => {
    let arr = items.slice();
    const q = searchText.trim().toLowerCase();
    if (q) {
      arr = arr.filter((n) => {
        const inTitle = (n.renderedTitle ?? '').toLowerCase().includes(q);
        const inBody = (n.renderedBody ?? '').toLowerCase().includes(q);
        const inRecipient = (n.recipientUsername ?? '')
          .toLowerCase()
          .includes(q);
        return inTitle || inBody || inRecipient;
      });
    }
    // jüngste zuerst
    arr.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
    return arr;
  }, [items, searchText]);




  return (
    <Box>
      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
        <NotificationsActiveIcon />
        <Typography variant="h6" sx={{ fontWeight: 800 }}>
          Admin · Benachrichtigungen
        </Typography>
        <Box flex={1} />
        <Tooltip title="Neu laden">
          <IconButton onClick={refresh}>
            <RefreshIcon />
          </IconButton>
        </Tooltip>
      </Stack>

      {/* Filter */}
      <Card variant="outlined" sx={{ mb: 2 }}>
        <CardContent>
          <Stack
            direction="row"
            spacing={2}
            alignItems="center"
            flexWrap="wrap"
          >
            <TextField
              size="small"
              label="Suchen (Titel/Body/Empfänger)"
              placeholder="z. B. cgya1234 oder 'Willkommen'"
              value={searchTextLocal}
              onChange={(e) => setSearchTextLocal(e.target.value)}
              InputProps={{ startAdornment: <SearchIcon sx={{ mr: 1 }} /> }}
            />

            <FormControl size="small" sx={{ minWidth: 180 }}>
              <InputLabel id="cat-label">
                <CategoryIcon sx={{ mr: 0.5 }} />
                Kategorie
              </InputLabel>
              <Select
                labelId="cat-label"
                label="Kategorie"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                {CATEGORY_OPTIONS.map((c) => (
                  <MenuItem key={c} value={c}>
                    {c}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <ToggleButtonGroup
              exclusive
              size="small"
              value={onlyUnread ? 'unread' : 'all'}
              onChange={(_, val) => setOnlyUnread(val === 'unread')}
            >
              <ToggleButton value="unread">Nur ungelesen</ToggleButton>
              <ToggleButton value="all">Alle</ToggleButton>
            </ToggleButtonGroup>
          </Stack>
        </CardContent>
      </Card>

      {/* Liste */}
      <Stack spacing={2}>
        {isLoading && (
          <Box sx={{ textAlign: 'center', py: 4, color: 'text.secondary' }}>
            Lädt …
          </Box>
        )}
        {hasError && (
          <Box sx={{ textAlign: 'center', py: 4, color: 'error.main' }}>
            Konnte Benachrichtigungen nicht laden.
          </Box>
        )}

        {!isLoading &&
          !hasError &&
          filtered.map((n) => {
            const hasPhone = !!phoneOf(n).replace(/\D/g, '');
            return (
              <Card key={n.id} variant="outlined" sx={{ overflow: 'hidden' }}>
                <CardHeader
                  title={
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                        {n.renderedTitle || '(ohne Titel)'}
                      </Typography>
                      {n.category && (
                        <Chip
                          size="small"
                          label={n.category}
                          color={
                            n.category === 'WHATSAPP' ? 'success' : 'default'
                          }
                        />
                      )}
                      {!n.read && (
                        <Chip
                          size="small"
                          label="NEU"
                          color="error"
                          variant="outlined"
                        />
                      )}
                      <Box flex={1} />
                      <Typography variant="caption" color="text.secondary">
                        {new Date(n.createdAt).toLocaleString()}
                      </Typography>
                    </Stack>
                  }
                  subheader={
                    <Typography variant="caption" color="text.secondary">
                      Empfänger: <b>{n.recipientUsername}</b> · Prio:{' '}
                      {n.priority}
                    </Typography>
                  }
                />
                <Divider />
                <CardContent>
                  <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                    {n.renderedBody}
                  </Typography>

                  <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
                    {!n.read && (
                      <Button
                        startIcon={<MarkEmailReadIcon />}
                        onClick={() => onMarkRead(n.id)}
                      >
                        Als gelesen markieren
                      </Button>
                    )}
                    <Button
                      startIcon={<ArchiveIcon />}
                      onClick={() => onArchive(n.id)}
                    >
                      Archivieren
                    </Button>

                    <Button
                      startIcon={<WhatsAppIcon />}
                      color={hasPhone ? 'success' : 'inherit'}
                      onClick={() => onWhatsApp(n)}
                    >
                      {hasPhone ? 'WhatsApp senden' : 'WhatsApp (manuell)'}
                    </Button>
                  </Stack>
                </CardContent>
              </Card>
            );
          })}

        {!isLoading && !hasError && filtered.length === 0 && (
          <Box sx={{ textAlign: 'center', py: 6, color: 'text.secondary' }}>
            Keine Benachrichtigungen gefunden.
          </Box>
        )}

        {nextCursor && !isLoading && (
          <Box sx={{ textAlign: 'center', mt: 2 }}>
            <Button variant="outlined" onClick={loadMore}>
              Mehr laden
            </Button>
          </Box>
        )}
      </Stack>

      {/* WhatsApp Fallback Dialog */}
      <Dialog
        open={waDialogOpen}
        onClose={() => setWaDialogOpen(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Keine Telefonnummer vorhanden</DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" sx={{ mb: 1 }}>
            Für diese Benachrichtigung ist keine Telefonnummer hinterlegt. Du
            kannst den Text kopieren und manuell in WhatsApp einfügen:
          </Typography>
          <TextField
            value={waDialogText}
            multiline
            minRows={6}
            fullWidth
            InputProps={{ readOnly: true }}
          />
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => copyToClipboard(waDialogText)}
            variant="contained"
          >
            In Zwischenablage kopieren
          </Button>
          <Button onClick={() => setWaDialogOpen(false)}>Schließen</Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snack.open}
        autoHideDuration={2500}
        onClose={() => setSnack((s) => ({ ...s, open: false }))}
      >
        <Alert
          severity={snack.sev}
          variant="filled"
          onClose={() => setSnack((s) => ({ ...s, open: false }))}
        >
          {snack.msg}
        </Alert>
      </Snackbar>
    </Box>
  );
}
