'use client';

import React, { ReactNode, useMemo } from 'react';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';
import { firebaseConfig } from './config';
import { FirebaseProvider } from './provider';

export const FirebaseClientProvider = ({ children }: { children: ReactNode }) => {
  const firebase = useMemo(() => {
    if (typeof window === 'undefined') return null;

    try {
      // Check if we have at least an API key to attempt initialization
      if (!firebaseConfig.apiKey || firebaseConfig.apiKey === 'undefined') {
        console.error("Firebase API Key is missing. Check your environment variables.");
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

  // We always render children to prevent a blank screen, 
  // but hooks inside will receive null services if firebase is null.
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
