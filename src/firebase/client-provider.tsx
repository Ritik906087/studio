'use client';

import React, { ReactNode, useMemo } from 'react';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { firebaseConfig } from './config';
import { FirebaseProvider } from './provider';

export const FirebaseClientProvider = ({ children }: { children: ReactNode }) => {
  const firebase = useMemo(() => {
    // Only initialize on the client
    if (typeof window === 'undefined') return null;

    try {
      // Don't initialize if API key is explicitly 'undefined' as string or empty
      if (!firebaseConfig.apiKey || firebaseConfig.apiKey === 'undefined') {
        console.warn("Firebase configuration is missing or incomplete. Please check your environment variables.");
        return null;
      }
      
      const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
      const auth = getAuth(app);
      const firestore = getFirestore(app);
      const storage = getStorage(app);

      return { app, auth, firestore, storage };
    } catch (e) {
      console.error("Firebase initialization failed:", e);
      return null;
    }
  }, []);

  return (
    <FirebaseProvider
      app={firebase?.app || null}
      auth={firebase?.auth || null}
      firestore={firebase?.firestore || null}
      storage={firebase?.storage || null}
    >
      {children}
    </FirebaseProvider>
  );
};
