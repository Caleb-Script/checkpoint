// /frontend/src/components/notifications/AvatarWithBadge.tsx
'use client';

import { Avatar, Badge } from '@mui/material';
import * as React from 'react';

const BADGE_CAP = Number(process.env.NEXT_PUBLIC_BADGE_CAP ?? 50);

export default function AvatarWithBadge({
  initials,
  count,
  onClick,
}: {
  initials: string;
  count: number;
  onClick?: (e: React.MouseEvent<HTMLElement>) => void;
}) {
  return (
    <Badge
      color="error"
      overlap="circular"
      badgeContent={count > 0 ? count : 0}
      max={BADGE_CAP} // <- zeigt z. B. "50+"
      invisible={count === 0}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
    >
      <Avatar
        sx={{ width: 32, height: 32, cursor: 'pointer' }}
        onClick={onClick}
      >
        {initials}
      </Avatar>
    </Badge>
  );
}
