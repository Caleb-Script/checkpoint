// /frontend/src/app/profile/notifications/page.tsx
'use client';

import { useAuth } from '@/context/AuthContext';
import { useLazyQuery, useMutation, useSubscription } from '@apollo/client';
import ArchiveIcon from '@mui/icons-material/Archive';
import MarkEmailReadIcon from '@mui/icons-material/MarkEmailRead';
import NotificationsIcon from '@mui/icons-material/Notifications';
import RefreshIcon from '@mui/icons-material/Refresh';
import {
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  Chip,
  Divider,
  IconButton,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from '@mui/material';
import * as React from 'react';
import {
  MUT_ARCHIVE,
  MUT_MARK_READ,
  QUERY_MY_NOTIFICATIONS,
  SUB_NOTIFICATION_ADDED,
  SUB_NOTIFICATION_UPDATED,
} from '../../../graphql/notification';

export default function MyNotificationsPage() {
  const { user } = useAuth();
  const recipientUsername =
    (user as any)?.username || (user as any)?.preferred_username || '';

  const [onlyUnread, setOnlyUnread] = React.useState(true);
  const [items, setItems] = React.useState<any[]>([]);
  const [fetchMine] = useLazyQuery(QUERY_MY_NOTIFICATIONS, {
    fetchPolicy: 'network-only',
    onCompleted: (d) => setItems(d?.myNotifications?.items ?? []),
  });
  const [markRead] = useMutation(MUT_MARK_READ);
  const [archive] = useMutation(MUT_ARCHIVE);

  const refresh = React.useCallback(() => {
    fetchMine({
      variables: {
        input: {
          recipientUsername,
          includeRead: !onlyUnread,
          limit: 50,
        },
      },
    });
  }, [recipientUsername, onlyUnread, fetchMine]);

  React.useEffect(() => {
    refresh();
  }, [refresh]);

  useSubscription(SUB_NOTIFICATION_ADDED, {
    variables: { recipientUsername },
    onData: () => refresh(),
  });
  useSubscription(SUB_NOTIFICATION_UPDATED, {
    variables: { recipientUsername },
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

  return (
    <Box>
      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
        <NotificationsIcon />
        <Typography variant="h6" sx={{ fontWeight: 800 }}>
          Meine Benachrichtigungen
        </Typography>
        <Box flex={1} />
        <Tooltip title="Neu laden">
          <IconButton onClick={refresh}>
            <RefreshIcon />
          </IconButton>
        </Tooltip>
      </Stack>

      <ToggleButtonGroup
        exclusive
        size="small"
        value={onlyUnread ? 'unread' : 'all'}
        onChange={(_, val) => setOnlyUnread(val === 'unread')}
        sx={{ mb: 2 }}
      >
        <ToggleButton value="unread">Nur ungelesen</ToggleButton>
        <ToggleButton value="all">Alle</ToggleButton>
      </ToggleButtonGroup>

      <Stack spacing={2}>
        {items.map((n) => (
          <Card key={n.id} variant="outlined">
            <CardHeader
              title={
                <Stack direction="row" spacing={1} alignItems="center">
                  <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                    {n.renderedTitle || '(ohne Titel)'}
                  </Typography>
                  {n.category && <Chip size="small" label={n.category} />}
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
              </Stack>
            </CardContent>
          </Card>
        ))}
        {items.length === 0 && (
          <Box sx={{ textAlign: 'center', py: 6, color: 'text.secondary' }}>
            Keine Benachrichtigungen.
          </Box>
        )}
      </Stack>
    </Box>
  );
}
