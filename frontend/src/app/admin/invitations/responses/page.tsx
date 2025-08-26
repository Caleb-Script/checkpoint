// /web/src/app/invitations/responses/page.tsx
'use client';
import { useQuery } from '@apollo/client';
import {
  Alert,
  Button,
  Card,
  CardContent,
  CardHeader,
  Chip,
  Stack,
  Typography,
} from '@mui/material';
import { INVITATIONS } from '../../../graphql/invitation/query';
import { InvitationsQueryResult } from '../../../types/invitation/invitation.type';

export default function ResponsesPage() {
  const { data, loading, error, refetch } = useQuery<InvitationsQueryResult>(
    INVITATIONS,
    { fetchPolicy: 'cache-and-network' },
  );
  const items = data?.invitations ?? [];

  const yes = items.filter((i) => i.rsvpChoice === 'YES').length;
  const no = items.filter((i) => i.rsvpChoice === 'NO').length;
  const declined = items.filter((i) => i.status === 'DECLINED').length;
  const canceled = items.filter((i) => i.status === 'CANCELED').length;
  const pending = items.length - yes - no - declined - canceled;

  return (
    <Card variant="outlined">
      <CardHeader
        title="Responses"
        titleTypographyProps={{ variant: 'h5', sx: { fontWeight: 800 } }}
        action={
          <Button onClick={() => refetch()} variant="outlined">
            Aktualisieren
          </Button>
        }
      />
      <CardContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error.message}
          </Alert>
        )}
        {loading && !data && <Typography>Wird geladen…</Typography>}
        <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
          <Chip label={`Zugesagt: ${yes}`} color="success" />
          <Chip label={`Abgesagt: ${no}`} color="warning" />
          <Chip label={`Offen: ${pending}`} />
          <Chip label={`Declined (Status): ${declined}`} />
          <Chip label={`Canceled: ${canceled}`} />
        </Stack>
      </CardContent>
    </Card>
  );
}
