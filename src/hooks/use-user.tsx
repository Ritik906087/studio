
'use client';

import { useEffect, useState, createContext, useContext, ReactNode, useRef } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
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

/**
 * Robust AuthProvider with built-in anti-freeze and timeout mechanisms.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const auth = useAuth();
  const firestore = useFirestore();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const isMounted = useRef(true);

  // Global safety timeout to prevent permanent loading (8 seconds max)
  useEffect(() => {
    isMounted.current = true;
    const globalTimeout = setTimeout(() => {
      if (isMounted.current && loading) {
        console.warn("Auth: Force releasing stuck loader (Global Timeout)");
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
      // Fallback if Firebase fails to init within 3s
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
    if (!user || !firestore) {
      if (!user && !loading && isMounted.current) setLoading(false);
      return;
    };

    // Profile listener with internal timeout
    const profileTimeout = setTimeout(() => {
      if (isMounted.current && loading) {
        console.warn("Auth: Profile fetch taking too long, proceeding to app.");
        setLoading(false);
      }
    }, 5000);

    const unsubscribeProfile = onSnapshot(
      doc(firestore, 'users', user.uid),
      (snapshot) => {
        if (!isMounted.current) return;
        if (snapshot.exists()) {
          setProfile(snapshot.data());
        } else {
          setProfile(null);
        }
        clearTimeout(profileTimeout);
        setLoading(false);
      },
      (error) => {
        if (!isMounted.current) return;
        console.error("Profile listen error:", error);
        clearTimeout(profileTimeout);
        setLoading(false);
      }
    );

    return () => {
      unsubscribeProfile();
      clearTimeout(profileTimeout);
    };
  }, [user, firestore, loading]);

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
