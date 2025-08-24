'use client';

import * as React from 'react';

import { AuthProvider } from '../context/AuthContext';

import { ThemeProvider, CssBaseline } from '@mui/material';
import theme from '../theme/theme';

type ProviderProps = { children: React.ReactNode };

export default function Provider({ children }: ProviderProps) {
  return (
    <AuthProvider>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </AuthProvider>
  );
}