'use client';

import React from 'react';
import { AuthProvider } from '../context/AuthContext';

type ProviderProps = { children: React.ReactNode };

export default function Provider({ children }: ProviderProps) {
  return <AuthProvider>{children}</AuthProvider>;
}
