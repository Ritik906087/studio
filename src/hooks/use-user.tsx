
'use client';

import { useEffect, useState, createContext, useContext, ReactNode, useRef } from 'react';
import { onAuthStateChanged, User, signOut } from 'firebase/auth';
import { useAuth, useFirestore } from '@/firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { useRouter, usePathname } from 'next/navigation';
import { toast } from '@/hooks/use-toast';

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
  const router = useRouter();
  const pathname = usePathname();
  
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  
  const isMounted = useRef(true);
  const unsubscribeProfileRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; };
  }, []);

  // Root redirect and public route protection
  useEffect(() => {
    if (loading) return;

    const publicRoutes = ['/login', '/register', '/forgot-password', '/terms', '/privacy', '/download'];
    const isAdminRoute = pathname.startsWith('/admin');
    const isPublicRoute = publicRoutes.includes(pathname);

    if (!user && !isPublicRoute && !isAdminRoute) {
      router.replace('/login');
    } else if (user && isPublicRoute) {
      router.replace('/home');
    }
  }, [user, loading, pathname, router]);

  useEffect(() => {
    if (!auth) return;

    const unsubscribeAuth = onAuthStateChanged(auth, (firebaseUser) => {
      if (!isMounted.current) return;
      
      setUser(firebaseUser);
      
      if (!firebaseUser) {
        setProfile(null);
        setLoading(false);
        if (unsubscribeProfileRef.current) {
          unsubscribeProfileRef.current();
          unsubscribeProfileRef.current = null;
        }
      }
    });

    return () => unsubscribeAuth();
  }, [auth]);

  useEffect(() => {
    if (!user || !firestore || !auth) return;

    // Clean up previous profile listener if it exists
    if (unsubscribeProfileRef.current) {
      unsubscribeProfileRef.current();
    }

    unsubscribeProfileRef.current = onSnapshot(
      doc(firestore, 'users', user.uid),
      (snapshot) => {
        if (!isMounted.current) return;
        
        if (snapshot.exists()) {
          const data = snapshot.data();
          setProfile(data);

          // --- SINGLE DEVICE ENFORCEMENT LOGIC ---
          const localSessionId = localStorage.getItem(`session_${user.uid}`);
          
          // Case: New login detected on another device (Database ID changed)
          if (data.sessionId && localSessionId && data.sessionId !== localSessionId) {
            console.warn("Session conflict: Logged in from another device.");
            
            // Clean up listener before signing out to avoid race conditions
            if (unsubscribeProfileRef.current) {
                unsubscribeProfileRef.current();
                unsubscribeProfileRef.current = null;
            }

            signOut(auth).then(() => {
              localStorage.removeItem(`session_${user.uid}`);
              toast({
                variant: "destructive",
                title: "Session Expired",
                description: "Logged in from another device. Please sign in again.",
              });
              router.replace('/login');
            });
            return;
          }
          
          // Case: Session ID was cleared but user is still 'authenticated' locally
          if (data.sessionId && !localSessionId) {
              // This can happen if local storage was cleared or user is in incognito.
              // We'll trust the current session but update local storage to match.
              localStorage.setItem(`session_${user.uid}`, data.sessionId);
          }

        } else {
          setProfile(null);
        }
        setLoading(false);
      },
      (error) => {
        console.error("Profile listener error:", error);
        if (isMounted.current) setLoading(false);
      }
    );

    return () => {
      if (unsubscribeProfileRef.current) {
        unsubscribeProfileRef.current();
        unsubscribeProfileRef.current = null;
      }
    };
  }, [user, firestore, auth, router]);

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
