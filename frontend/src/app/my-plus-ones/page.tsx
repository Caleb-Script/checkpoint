// /web/src/app/my-plus-ones/page.tsx
'use client';

import { gql, useMutation, useQuery } from '@apollo/client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import * as React from 'react';

import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  Chip,
  Grid,
  IconButton,
  InputAdornment,
  Skeleton,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';

import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import EventIcon from '@mui/icons-material/Event';
import GroupIcon from '@mui/icons-material/Group';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import GroupAddIcon from '@mui/icons-material/PersonAddAlt1';
import RefreshIcon from '@mui/icons-material/Refresh';

import { useAuth } from '../../context/AuthContext';
import { copyToClipboard } from '../../lib/link';

// ---------------------------
// GraphQL
// ---------------------------

const INVITATION_WITH_PLUSONES = gql`
  query MyPlusOnes($id: ID!) {
    invitation(id: $id) {
      id
      eventId
      status
      approved
      rsvpChoice
      maxInvitees
      invitedByInvitationId
      guestProfileId
      plusOnes {
        id
        eventId
        invitedByInvitationId
        status
        rsvpChoice
        approved
        maxInvitees
        guestProfileId
      }
    }
  }
`;

const CREATE_PLUS_ONE = gql`
  mutation CreatePlusOne($eventId: ID!, $invitedByInvitationId: ID!) {
    createPlusOnesInvitation(
      input: {
        eventId: $eventId
        invitedByInvitationId: $invitedByInvitationId
      }
    ) {
      id
      eventId
      invitedByInvitationId
      status
      rsvpChoice
      approved
      maxInvitees
      guestProfileId
    }
  }
`;

// ---------------------------
// Types (nur benötigte Felder)
// ---------------------------

type RsvpChoice = 'YES' | 'NO' | null;
type InvitationStatus = 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'CANCELED';

type PlusOne = {
  id: string;
  eventId: string;
  invitedByInvitationId: string | null;
  status: InvitationStatus;
  rsvpChoice: RsvpChoice;
  approved: boolean;
  maxInvitees: number;
  guestProfileId: string | null;
};

type InvitationWithChildren = {
  id: string;
  eventId: string;
  status: InvitationStatus;
  approved: boolean;
  rsvpChoice: RsvpChoice;
  maxInvitees: number;
  invitedByInvitationId: string | null;
  guestProfileId: string | null;
  plusOnes: PlusOne[];
};

type InvitationQueryResult = {
  invitation: InvitationWithChildren | null;
};

// ---------------------------
// Helpers
// ---------------------------

function statusChipColor(
  status: InvitationStatus,
): 'default' | 'success' | 'error' | 'warning' {
  if (status === 'ACCEPTED') return 'success';
  if (status === 'DECLINED') return 'error';
  if (status === 'CANCELED') return 'warning';
  return 'default';
}

function rsvpChipColor(rsvp: RsvpChoice): 'default' | 'success' | 'error' {
  if (rsvp === 'YES') return 'success';
  if (rsvp === 'NO') return 'error';
  return 'default';
}

// ---------------------------
// Page
// ---------------------------

export default function MyPlusOnesPage(): JSX.Element {
  const router = useRouter();
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const parentInvitationId = user?.invitationId ?? null;

  const { data, loading, error, refetch } = useQuery<InvitationQueryResult>(
    INVITATION_WITH_PLUSONES,
    {
      skip: !parentInvitationId,
      variables: parentInvitationId ? { id: parentInvitationId } : undefined,
      fetchPolicy: 'cache-and-network',
    },
  );

  const [createPlusOne, { loading: creating }] = useMutation(CREATE_PLUS_ONE, {
    onCompleted: () => {
      void refetch();
    },
  });

  const [msg, setMsg] = React.useState<string | null>(null);
  const [err, setErr] = React.useState<string | null>(null);
  const [bulkCount, setBulkCount] = React.useState<number>(1);

  // Guards (Auth)
  if (authLoading) {
    return (
      <Stack spacing={2}>
        <Card variant="outlined">
          <CardHeader title="Meine Plus-Ones" />
          <CardContent>
            <Skeleton height={20} width="60%" />
            <Skeleton height={20} width="30%" />
            <Skeleton height={120} />
          </CardContent>
        </Card>
      </Stack>
    );
  }

  if (!isAuthenticated || !user) {
    return (
      <Stack spacing={2}>
        <Card
          variant="outlined"
          sx={{ borderRadius: 3, textAlign: 'center', p: 3 }}
        >
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5 }}>
            Nicht angemeldet
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Melde dich an, um deine Plus-Ones zu verwalten.
          </Typography>
          <Button
            component={Link}
            href="/login"
            variant="contained"
            sx={{ borderRadius: 2 }}
          >
            Zum Login
          </Button>
        </Card>
      </Stack>
    );
  }

  if (!parentInvitationId) {
    return (
      <Stack spacing={2}>
        <Card variant="outlined" sx={{ borderRadius: 3 }}>
          <CardHeader title="Meine Plus-Ones" />
          <CardContent>
            <Alert severity="info" icon={<InfoOutlinedIcon />}>
              Deinem Profil ist aktuell keine Einladung zugeordnet.
            </Alert>
            <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
              <Button
                component={Link}
                href="/profile"
                variant="outlined"
                sx={{ borderRadius: 2 }}
              >
                Zum Profil
              </Button>
            </Stack>
          </CardContent>
        </Card>
      </Stack>
    );
  }

  const parent = data?.invitation ?? null;
  const plusOnes: PlusOne[] = parent?.plusOnes ?? [];
  const max = parent?.maxInvitees ?? 0;
  const remaining = Math.max(0, max - plusOnes.length);

  async function handleCreate(count: number) {
    setErr(null);
    setMsg(null);
    if (!parent) return;
    if (count <= 0) return;

    const toCreate = Math.min(count, remaining);
    if (toCreate <= 0) {
      setErr('Kein Rest-Kontingent mehr verfügbar.');
      return;
    }

    for (let i = 0; i < toCreate; i++) {
      await createPlusOne({
        variables: {
          eventId: parent.eventId,
          invitedByInvitationId: parent.id,
        },
      });
    }
    setMsg(`${toCreate} Plus-One${toCreate > 1 ? 's' : ''} angelegt.`);
    setBulkCount(1);
  }

  async function copy(id: string, label = 'ID') {
    const ok = await copyToClipboard(id);
    setMsg(ok ? `${label} kopiert.` : `Konnte ${label} nicht kopieren.`);
  }

  return (
    <Stack spacing={2} sx={{ pb: 1 }}>
      {/* Header */}
      <Card variant="outlined">
        <CardHeader
          titleTypographyProps={{ variant: 'h5', sx: { fontWeight: 800 } }}
          title="Meine Plus-Ones"
          action={
            <Tooltip title="Aktualisieren">
              <span>
                <IconButton onClick={() => refetch()} disabled={loading}>
                  <RefreshIcon />
                </IconButton>
              </span>
            </Tooltip>
          }
        />
        <CardContent>
          {(error || err) && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error?.message ?? err}
            </Alert>
          )}
          {msg && (
            <Alert severity="success" sx={{ mb: 2 }}>
              {msg}
            </Alert>
          )}

          {/* Parent Invitation Summary */}
          {loading && !parent && (
            <>
              <Skeleton width="70%" />
              <Skeleton width="40%" />
              <Skeleton height={80} />
            </>
          )}

          {parent && (
            <>
              <Stack
                direction="row"
                spacing={1}
                alignItems="center"
                useFlexGap
                flexWrap="wrap"
              >
                <Chip
                  size="small"
                  label={`Event: ${parent.eventId}`}
                  icon={<EventIcon fontSize="small" />}
                  variant="outlined"
                />
                <Chip
                  size="small"
                  label={`Status: ${parent.status}`}
                  color={statusChipColor(parent.status)}
                  variant="outlined"
                />
                <Chip
                  size="small"
                  label={`RSVP: ${parent.rsvpChoice ?? '—'}`}
                  color={rsvpChipColor(parent.rsvpChoice)}
                  variant="outlined"
                />
                <Chip
                  size="small"
                  label={`maxInvitees: ${max}`}
                  variant="outlined"
                />
                <Chip
                  size="small"
                  label={`offen: ${remaining}`}
                  color={remaining > 0 ? 'success' : 'default'}
                  variant={remaining > 0 ? 'filled' : 'outlined'}
                />
              </Stack>

              <Stack
                direction="row"
                spacing={1}
                alignItems="center"
                sx={{ mt: 1 }}
              >
                <TextField
                  label="Anzahl"
                  type="number"
                  size="small"
                  inputProps={{ min: 1, max: remaining }}
                  value={bulkCount}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setBulkCount(
                      Math.max(
                        1,
                        Math.min(
                          Number(e.target.value || 1),
                          Math.max(1, remaining),
                        ),
                      ),
                    )
                  }
                  sx={{ width: 140 }}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">Stk</InputAdornment>
                    ),
                  }}
                />
                <Button
                  variant="contained"
                  startIcon={<GroupAddIcon />}
                  disabled={creating || remaining <= 0}
                  onClick={() => handleCreate(bulkCount)}
                  sx={{ borderRadius: 2 }}
                >
                  Plus-Ones anlegen
                </Button>
                <Tooltip title="Kontingent-Hinweis">
                  <InfoOutlinedIcon fontSize="small" color="action" />
                </Tooltip>
              </Stack>
            </>
          )}
        </CardContent>
      </Card>

      {/* Liste Plus-Ones */}
      <Card variant="outlined">
        <CardHeader
          titleTypographyProps={{ variant: 'h6', sx: { fontWeight: 700 } }}
          title="Deine Plus-Ones"
          subheader="Sobald eine Plus-One erstellt wurde, kann der Admin den Einladungs-Link versenden."
          avatar={<GroupIcon />}
        />
        <CardContent>
          {loading && (
            <Stack spacing={1}>
              {[1, 2, 3].map((k) => (
                <Card key={k} variant="outlined" sx={{ borderRadius: 2 }}>
                  <CardContent>
                    <Skeleton width="50%" />
                    <Skeleton width="30%" />
                  </CardContent>
                </Card>
              ))}
            </Stack>
          )}

          {!loading && plusOnes.length === 0 && (
            <Alert severity="info">
              Noch keine Plus-Ones vorhanden. Lege welche über den Button oben
              an.
            </Alert>
          )}

          <Stack spacing={1.25}>
            {plusOnes.map((po) => (
              <Card key={po.id} variant="outlined" sx={{ borderRadius: 2 }}>
                <CardContent sx={{ pb: 1.5 }}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                      Plus-One
                    </Typography>
                    <Box sx={{ flex: 1 }} />
                    <Chip
                      size="small"
                      label={po.status}
                      variant="outlined"
                      color={statusChipColor(po.status)}
                    />
                    <Chip
                      size="small"
                      label={`RSVP: ${po.rsvpChoice ?? '—'}`}
                      variant="outlined"
                      color={rsvpChipColor(po.rsvpChoice)}
                    />
                    <Chip
                      size="small"
                      label={po.approved ? 'Approved' : 'Unapproved'}
                      color={po.approved ? 'success' : 'default'}
                      variant={po.approved ? 'filled' : 'outlined'}
                    />
                  </Stack>

                  <Grid container spacing={0.75} sx={{ mt: 1 }}>
                    <Grid item xs={12} sm={8}>
                      <TextField
                        value={po.id}
                        size="small"
                        fullWidth
                        label="Invitation ID"
                        inputProps={{ readOnly: true }}
                      />
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      <Stack
                        direction="row"
                        spacing={1}
                        justifyContent={{ xs: 'flex-start', sm: 'flex-end' }}
                      >
                        <Tooltip title="Invitation ID kopieren">
                          <IconButton
                            onClick={() => copy(po.id, 'Invitation ID')}
                          >
                            <ContentCopyIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Stack>
                    </Grid>
                  </Grid>

                  {po.invitedByInvitationId && (
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ display: 'block', mt: 0.5 }}
                    >
                      Parent: {po.invitedByInvitationId}
                    </Typography>
                  )}
                </CardContent>
              </Card>
            ))}
          </Stack>
        </CardContent>
      </Card>

      {/* Footer-Actions */}
      <Box>
        <Grid container spacing={1.25}>
          <Grid item xs={12} sm="auto">
            <Button
              component={Link}
              href="/profile"
              variant="outlined"
              sx={{ borderRadius: 2, width: '100%' }}
            >
              Zurück zum Profil
            </Button>
          </Grid>
          {parent && (
            <Grid item xs={12} sm="auto">
              <Button
                component={Link}
                href={`/invitations?eventId=${encodeURIComponent(parent.eventId)}`}
                variant="outlined"
                startIcon={<EventIcon />}
                sx={{ borderRadius: 2, width: '100%' }}
              >
                Einladungen des Events
              </Button>
            </Grid>
          )}
        </Grid>
      </Box>
    </Stack>
  );
}
