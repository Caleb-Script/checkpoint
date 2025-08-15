// src/components/ErrorView.tsx
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Link from 'next/link';
import type { ReactNode } from 'react';

export type ErrorViewProps = {
  title: string;
  message?: ReactNode;
  actions?: Array<{
    href: string;
    label: string;
    variant?: 'contained' | 'outlined';
  }>;
  chips?: string[];
};

export default function ErrorView({
  title,
  message,
  actions,
  chips,
}: ErrorViewProps) {
  return (
    <Box
      sx={{
        minHeight: '100dvh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'background.default',
        p: 3,
      }}
    >
      <Card
        sx={{ width: '100%', maxWidth: 640, borderRadius: 4, boxShadow: 6 }}
      >
        <CardContent>
          <Stack spacing={2}>
            <Typography variant="h5" fontWeight={700}>
              {title}
            </Typography>
            {message && (
              <Typography variant="body1" color="text.secondary">
                {message}
              </Typography>
            )}
            {!!chips?.length && (
              <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                {chips.map((c) => (
                  <Chip key={c} label={c} size="small" />
                ))}
              </Stack>
            )}
            {!!actions?.length && (
              <Stack direction="row" spacing={1} sx={{ pt: 1 }}>
                {actions.map(({ href, label, variant = 'contained' }) => (
                  <Button
                    key={href + label}
                    component={Link}
                    href={href}
                    variant={variant}
                  >
                    {label}
                  </Button>
                ))}
              </Stack>
            )}
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
}
