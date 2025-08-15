// src/context/AuthContext.tsx
'use client';

import { ApolloProvider, useMutation } from '@apollo/client';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import getApolloClient from '../lib/apolloClient';
import { fetchLogout, fetchUserInfo } from '../lib/server/auth/auth';
import { KeycloakUserInfo } from '../types/auth/auth.type';
import { LOGOUT } from '../graphql/auth/mutation';

type AuthContextType = {
  user: KeycloakUserInfo | null;
  isAuthenticated: boolean;
  loading: boolean;
  refetchMe: () => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<KeycloakUserInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const client = getApolloClient(undefined);

  const [doLogout] = useMutation(LOGOUT, {
    client,
  });

  const refetchMe = useCallback(async () => {
    setLoading(true);
    try {
      const user = await fetchUserInfo();
      setUser(user ?? null);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await doLogout(); // Cache leeren
    } finally {
      setUser(null); // UI sofort aktualisieren
    }
  }, [doLogout]);

  useEffect(() => {
    void refetchMe(); // Initial laden
  }, [refetchMe]);

  return (
    <ApolloProvider client={getApolloClient(undefined)}>
      <AuthContext.Provider
        value={{ user, isAuthenticated: !!user, loading, refetchMe, logout }}
      >
        {children}
      </AuthContext.Provider>
    </ApolloProvider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx)
    throw new Error(
      'useAuth muss innerhalb von AuthProvider verwendet werden.',
    );
  return ctx;
}
