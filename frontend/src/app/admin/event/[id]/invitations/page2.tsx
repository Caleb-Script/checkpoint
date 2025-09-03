// /frontend/src/app/admin/event/[id]/invitations/page.tsx

import { useParams } from 'next/navigation';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

export default function Page() {
  const { id: eventId } = useParams<{ id: string }>();
  return <InvitationsPage eventId={eventId} />;
}
