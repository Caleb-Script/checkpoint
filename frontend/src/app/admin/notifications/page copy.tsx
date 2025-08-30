// /frontend/src/app/admin/notifications/page.tsx
'use client';

import { useAuth } from '@/context/AuthContext';
import { useLazyQuery, useMutation, useSubscription } from '@apollo/client';
import ArchiveIcon from '@mui/icons-material/Archive';
import CategoryIcon from '@mui/icons-material/Category';
import MarkEmailReadIcon from '@mui/icons-material/MarkEmailRead';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import RefreshIcon from '@mui/icons-material/Refresh';
import SearchIcon from '@mui/icons-material/Search';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
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
import {
  MUT_ARCHIVE,
  MUT_MARK_READ,
  QUERY_ADMIN_NOTIFICATIONS,
  QUERY_MY_NOTIFICATIONS,
  SUB_NOTIFICATION_ADDED,
  SUB_NOTIFICATION_UPDATED,
} from '../../../graphql/notification';

type Notification = {
  id: string;
  renderedTitle: string;
  renderedBody: string;
  category?: string | null;
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  read: boolean;
  createdAt: string;
  variables?: Record<string, any>;
  data?: Record<string, any>;
  recipientUsername: string;
};

const CATEGORY_OPTIONS = ['ALL', 'ACCOUNT', 'SECURITY', 'WHATSAPP', 'SYSTEM'];

export default function AdminNotificationsPage() {
  const { user } = useAuth();
  const myUsername =
    (user as any)?.username || (user as any)?.preferred_username || '';

  // Filters
  const [onlyUnread, setOnlyUnread] = React.useState(true);
  const [category, setCategory] = React.useState<string>('ALL');
  const [searchUser, setSearchUser] = React.useState<string>('');
  const [items, setItems] = React.useState<Notification[]>([]);
  const [nextCursor, setNextCursor] = React.useState<string | null>(null);

  const [fetchAdmin, adminState] = useLazyQuery(QUERY_ADMIN_NOTIFICATIONS, {
    fetchPolicy: 'network-only',
    onCompleted: (d) => {
      const conn = d?.adminNotifications ?? d?.myNotifications;
      setItems(conn?.items ?? []);
      setNextCursor(conn?.nextCursor ?? null);
    },
    onError: async () => {
      // Fallback: wenn adminNotifications nicht existiert, zeige eigene Inbox
      await fetchMine({
        variables: {
          input: {
            recipientUsername: myUsername,
            includeRead: !onlyUnread,
            limit: 50,
            category: category === 'ALL' ? null : category,
          },
        },
      });
    },
  });

  const [fetchMine, mineState] = useLazyQuery(QUERY_MY_NOTIFICATIONS, {
    fetchPolicy: 'network-only',
    onCompleted: (d) => {
      setItems(d?.myNotifications?.items ?? []);
      setNextCursor(d?.myNotifications?.nextCursor ?? null);
    },
  });

  const [markRead] = useMutation(MUT_MARK_READ);
  const [archive] = useMutation(MUT_ARCHIVE);

  const refresh = React.useCallback(() => {
    // Wenn es Admin-Query gibt, suche nach User oder *alle*
    if (searchUser.trim() || adminState.called) {
      fetchAdmin({
        variables: {
          input: {
            // AdminListNotificationsInput – passt du auf der API an
            recipientUsername: searchUser.trim() || undefined,
            includeRead: !onlyUnread,
            limit: 50,
            category: category === 'ALL' ? undefined : category,
          },
        },
      });
    } else {
      fetchMine({
        variables: {
          input: {
            recipientUsername: myUsername,
            includeRead: !onlyUnread,
            limit: 50,
            category: category === 'ALL' ? null : category,
          },
        },
      });
    }
  }, [
    searchUser,
    onlyUnread,
    category,
    myUsername,
    fetchAdmin,
    fetchMine,
    adminState.called,
  ]);

  React.useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useSubscription(SUB_NOTIFICATION_ADDED, {
    variables: { recipientUsername: myUsername },
    onData: () => refresh(),
  });
  useSubscription(SUB_NOTIFICATION_UPDATED, {
    variables: { recipientUsername: myUsername },
    onData: () => refresh(),
  });

  const onMarkRead = async (id: string) => {
    await markRead({ variables: { input: { id } } });
    refresh();
  };
  const onArchive = async (id: string) => {
    await archive({ variables: { id } });
    refresh();
  };

  const phoneOf = (n: Notification) =>
    (n.variables?.phone || n.data?.phone || '').toString();

  const whatsappHref = (n: Notification) => {
    const phone = phoneOf(n).replace(/\D/g, '');
    if (!phone) return null;
    const text = n.renderedBody || n.renderedTitle || '';
    return `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
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
              label="Suche nach Username"
              placeholder="z. B. cgya1234"
              value={searchUser}
              onChange={(e) => setSearchUser(e.target.value)}
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

            <Button variant="contained" onClick={refresh}>
              Anwenden
            </Button>
          </Stack>
        </CardContent>
      </Card>

      {/* Liste */}
      <Stack spacing={2}>
        {items.map((n) => {
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
                    Empfänger: <b>{n.recipientUsername}</b> · Prio: {n.priority}
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

        {items.length === 0 && (
          <Box sx={{ textAlign: 'center', py: 6, color: 'text.secondary' }}>
            Keine Benachrichtigungen gefunden.
          </Box>
        )}
      </Stack>
    </Box>
  );
}
