
'use client';

import React, { ReactNode, useMemo } from 'react';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore, getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { firebaseConfig } from './config';
import { FirebaseProvider } from './provider';

/**
 * Enhanced Firebase Client Provider with robust connectivity fail-safes.
 * Uses experimentalAutoDetectLongPolling to handle restricted network environments.
 */
export const FirebaseClientProvider = ({ children }: { children: ReactNode }) => {
  const firebase = useMemo(() => {
    // Only initialize on the client side
    if (typeof window === 'undefined') return null;

    try {
      // Check if app already exists to avoid re-initialization during Hot Module Replacement
      const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
      const auth = getAuth(app);
      
      // Initialize Firestore with robust settings to bypass firewall/connectivity issues
      let firestore;
      try {
        firestore = initializeFirestore(app, {
          experimentalForceLongPolling: true,
          experimentalAutoDetectLongPolling: true,
          ignoreUndefinedProperties: true,
        });
      } catch (e) {
        // If Firestore is already initialized, get the existing instance
        firestore = getFirestore(app);
      }
      
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
