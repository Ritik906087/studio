
'use client';

import { useEffect, useState, createContext, useContext, ReactNode, useRef } from 'react';
import { onAuthStateChanged, User, signOut } from 'firebase/auth';
import { useAuth, useFirestore } from '@/firebase';
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
  const auth = useAuth();
  const firestore = useFirestore();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    const globalTimeout = setTimeout(() => {
      if (isMounted.current && loading) {
        setLoading(false);
      }
    }, 8000);

    return () => {
      isMounted.current = false;
      clearTimeout(globalTimeout);
    };
  }, [loading]);

  useEffect(() => {
    if (!auth) {
      const timer = setTimeout(() => {
        if (!auth && isMounted.current) setLoading(false);
      }, 3000);
      return () => clearTimeout(timer);
    }

    const unsubscribeAuth = onAuthStateChanged(auth, (firebaseUser) => {
      if (!isMounted.current) return;
      setUser(firebaseUser);
      if (!firebaseUser) {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => unsubscribeAuth();
  }, [auth]);

  useEffect(() => {
    if (!user || !firestore || !auth) {
      if (!user && !loading && isMounted.current) setLoading(false);
      return;
    };

    const unsubscribeProfile = onSnapshot(
      doc(firestore, 'users', user.uid),
      (snapshot) => {
        if (!isMounted.current) return;
        if (snapshot.exists()) {
          const data = snapshot.data();
          setProfile(data);

          // SINGLE DEVICE ENFORCEMENT
          // Check if server sessionId matches local sessionId
          const localSessionId = localStorage.getItem(`session_${user.uid}`);
          if (data.sessionId && localSessionId && data.sessionId !== localSessionId) {
            console.warn("Session invalidated. Logged in on another device.");
            signOut(auth);
            localStorage.removeItem(`session_${user.uid}`);
            window.location.href = '/login';
          }
        } else {
          setProfile(null);
        }
        setLoading(false);
      },
      (error) => {
        if (!isMounted.current) return;
        setLoading(false);
      }
    );

    return () => unsubscribeProfile();
  }, [user, firestore, auth, loading]);

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
