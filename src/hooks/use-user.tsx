"use client";

import { useEffect, useState, createContext, useContext, ReactNode } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth, firestore } from '@/firebase';
import { doc, onSnapshot } from 'firebase/firestore';

export type AuthState = {
  user: User | null;
  profile: any | null;
  loading: boolean;
};

const AuthContext = createContext<AuthState>({
  user: null,
  profile: null,
  loading: true,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth) return;

    const unsubscribeAuth = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      if (!firebaseUser) {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    if (!user || !firestore) return;

    const unsubscribeProfile = onSnapshot(doc(firestore, 'users', user.uid), (snapshot) => {
      if (snapshot.exists()) {
        setProfile(snapshot.data());
      } else {
        setProfile(null);
      }
      setLoading(false);
    }, (error) => {
      console.error("Profile listen error:", error);
      setLoading(false);
    });

    return () => unsubscribeProfile();
  }, [user]);

  const value = {
    user,
    profile,
    loading,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useUser() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useUser must be used within an AuthProvider.');
  }
  return context;
}
