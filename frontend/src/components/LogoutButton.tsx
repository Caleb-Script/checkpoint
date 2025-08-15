// components/LogoutButton.tsx
'use client';

import { useAuth } from '@/context/AuthContext';
import LogoutRoundedIcon from '@mui/icons-material/LogoutRounded';
import { IconButton, Tooltip } from '@mui/material';
import { useRouter } from 'next/navigation';

export default function LogoutButton() {
  const router = useRouter();
  const { logout } = useAuth();

  const onClick = async () => {
    try {
      await logout(); // -> Mutation (Browser), Cookies werden gelöscht
      router.replace('/login');
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <Tooltip title="Logout">
      <IconButton color="error" onClick={onClick}>
        <LogoutRoundedIcon />
      </IconButton>
    </Tooltip>
  );
}
