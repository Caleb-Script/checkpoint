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
import { LOGOUT } from '../graphql/auth/mutation';
import getApolloClient from '../lib/apolloClient';
import { fetchUserInfo } from '../lib/server/auth/auth';
import { User } from '../types/auth/auth.type';

type AuthContextType = {
  user: User | null;
  isAdmin: boolean;
  isAuthenticated: boolean;
  loading: boolean;
  refetchMe: () => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const client = getApolloClient(undefined);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);

  const [doLogout] = useMutation(LOGOUT, {
    client,
  });

  const refetchMe = useCallback(async () => {
    setLoading(true);
    try {
      const user = await fetchUserInfo();
      setUser(user ?? null);
      setIsAdmin(user?.roles?.includes('ADMIN') ?? false);
    } catch {
      setUser(null);
      setIsAdmin(false);
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await doLogout(); // Cache leeren
    } finally {
      setUser(null); // UI sofort aktualisieren
      setIsAdmin(false);
    }
  }, [doLogout]);

  useEffect(() => {
    void refetchMe(); // Initial laden
  }, [refetchMe]);

  return (
    <ApolloProvider client={getApolloClient(undefined)}>
      <AuthContext.Provider
        value={{
          user,
          isAdmin,
          isAuthenticated: !!user,
          loading,
          refetchMe,
          logout,
        }}
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
