'use client';

import { AuthProvider } from '../context/AuthContext';
import { CssBaseline, ThemeProvider } from '@mui/material';
import theme from '../theme/theme';

type ProviderProps = { children: React.ReactNode };

export default function Provider({ children }: ProviderProps) {
  return (
    <AuthProvider>
      {/* <ApolloProviders> */}
        <ThemeProvider theme={theme}>
          <CssBaseline />
          {children}
        </ThemeProvider>
      {/* </ApolloProviders> */}
    </AuthProvider>
  );
}
