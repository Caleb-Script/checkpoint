// /frontend/src/app/admin/notifications/page.tsx
'use client';

import {
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  Chip,
  Divider,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
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

import { gql, useMutation, useQuery } from '@apollo/client';

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

// === GraphQL ===
const QUERY_NOTIFICATIONS = gql`
  query Notifications {
    notifications {
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
  }
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

// === Seite ===
const CATEGORY_OPTIONS = ['ALL', 'ACCOUNT', 'SECURITY', 'WHATSAPP', 'SYSTEM'];

export default function AdminNotificationsPage() {
  // Filter-States (nur clientseitig)
  const [onlyUnread, setOnlyUnread] = React.useState(true);
  const [category, setCategory] = React.useState<string>('ALL');
  const [searchText, setSearchText] = React.useState<string>(''); // Volltextsuche (Titel/Body/Empfänger)

  // Daten laden (alle Notifications)
  const { data, loading, error, refetch } = useQuery(QUERY_NOTIFICATIONS, {
    fetchPolicy: 'network-only',
    pollInterval: 15000, // sanftes Polling für Admin-Übersicht; Subscriptions optional später
  });

  const [markRead] = useMutation(MUT_MARK_READ);
  const [archive] = useMutation(MUT_ARCHIVE);

  const items: Notification[] = React.useMemo(
    () => (data?.notifications as Notification[]) ?? [],
    [data],
  );

  // Clientseitige Filter
  const filtered: Notification[] = React.useMemo(() => {
    let arr = items.slice();

    if (onlyUnread) arr = arr.filter((n) => !n.read);
    if (category !== 'ALL')
      arr = arr.filter((n) => (n.category ?? null) === category);

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
  }, [items, onlyUnread, category, searchText]);

  const refresh = React.useCallback(() => {
    void refetch();
  }, [refetch]);

  const onMarkRead = async (id: string) => {
    // Optimistic UI
    // (optional) in Cache updaten wäre eleganter; hier reicht refetch
    await markRead({ variables: { id } });
    refresh();
  };

  const onArchive = async (id: string) => {
    // Optimistic UI
    await archive({ variables: { id } });
    refresh();
  };

  const phoneOf = (n: Notification) =>
    String(n.variables?.phone ?? n.data?.phone ?? '').trim();

  const whatsappHref = (n: Notification) => {
    const digits = phoneOf(n).replace(/\D/g, '');
    if (!digits) return null;
    const text = (n.renderedBody || n.renderedTitle || '').replace(/\n/g, '\n');
    return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
  };

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
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
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
        {loading && (
          <Box sx={{ textAlign: 'center', py: 4, color: 'text.secondary' }}>
            Lädt …
          </Box>
        )}
        {error && (
          <Box sx={{ textAlign: 'center', py: 4, color: 'error.main' }}>
            Konnte Benachrichtigungen nicht laden.
          </Box>
        )}

        {!loading &&
          !error &&
          filtered.map((n) => {
            const isWA = n.category === 'WHATSAPP';
            const wa = isWA ? whatsappHref(n) : null;

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
                          color={isWA ? 'success' : 'default'}
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

                    {isWA && wa && (
                      <Button
                        startIcon={<WhatsAppIcon />}
                        color="success"
                        href={wa}
                        target="_blank"
                        rel="noreferrer"
                      >
                        WhatsApp senden
                      </Button>
                    )}
                  </Stack>
                </CardContent>
              </Card>
            );
          })}

        {!loading && !error && filtered.length === 0 && (
          <Box sx={{ textAlign: 'center', py: 6, color: 'text.secondary' }}>
            Keine Benachrichtigungen gefunden.
          </Box>
        )}
      </Stack>
    </Box>
  );
}
