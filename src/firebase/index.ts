// This is the public API for the firebase SDK.
// It can be used in both client and server contexts.
// However, it is not generally recommended to use this in server components.

import { FirebaseApp, getApp, getApps, initializeApp } from 'firebase/app';
import { Auth, getAuth } from 'firebase/auth';
import { Firestore, getFirestore } from 'firebase/firestore';
import { FirebaseStorage, getStorage } from 'firebase/storage';

import { firebaseConfig } from './config';
import { FirebaseProvider, getFirebase, useAuth, useFirebase, useFirebaseApp, useFirestore, useStorage } from './provider';
import { useUser } from './auth/use-user';
import { useCollection } from './firestore/use-collection';
import { useDoc } from './firestore/use-doc';

export type FirebaseInstances = {
  app: FirebaseApp,
  auth: Auth,
  firestore: Firestore,
  storage: FirebaseStorage,
}

let firebaseInstances: FirebaseInstances;

/**
 * Initializes Firebase and returns the app, auth, and firestore instances.
 * This function is idempotent and will only initialize Firebase once.
 *
 * N.B.: This function should not be used in React components.
 * Instead, use the `useFirebase`, `useAuth`, and `useFirestore` hooks.
 *
 * @returns The Firebase app, auth, and firestore instances.
 */
export function initializeFirebase(): FirebaseInstances {
  if (firebaseInstances) {
    return firebaseInstances;
  }

  const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
  const auth = getAuth(app);
  const firestore = getFirestore(app);
  const storage = getStorage(app);

  firebaseInstances = {
    app,
    auth,
    firestore,
    storage
  };

  return firebaseInstances;
}

export {
  // context provider
  FirebaseProvider,
  // hooks
  useFirebase,
  useFirebaseApp,
  useFirestore,
  useAuth,
  useStorage,
  useUser,
  useCollection,
  useDoc,
  // utility functions
  getFirebase,
};
