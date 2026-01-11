"use client";

import { useEffect, useState } from 'react';
import type { User } from 'firebase/auth';
import { onAuthStateChanged } from 'firebase/auth';

import { useAuth } from '@/firebase/provider';

export type AuthState = {
  user: User | null;
  loading: boolean;
};

export function useUser() {
  const auth = useAuth();
  const [user, setUser] = useState<AuthState>({
    user: auth?.currentUser ?? null,
    loading: true,
  });

  useEffect(() => {
    if (!auth) {
      setUser({ user: null, loading: false });
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser({ user, loading: false });
    });

    return () => unsubscribe();
  }, [auth]);

  return user;
}
