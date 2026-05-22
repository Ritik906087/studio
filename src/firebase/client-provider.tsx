'use client';

import React, { ReactNode, useMemo } from 'react';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { firebaseConfig } from './config';
import { FirebaseProvider } from './provider';

export const FirebaseClientProvider = ({ children }: { children: ReactNode }) => {
  const firebase = useMemo(() => {
    if (typeof window === 'undefined') return null;

    try {
      const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
      const auth = getAuth(app);
      
      // Fixed: experimentalForceLongPolling is the most stable for cloud workstations.
      const firestore = initializeFirestore(app, {
        experimentalForceLongPolling: true,
        ignoreUndefinedProperties: true,
      });
      
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
