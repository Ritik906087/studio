import { FirebaseApp, getApp, getApps, initializeApp } from 'firebase/app';
import { Auth, getAuth } from 'firebase/auth';
import { Firestore, getFirestore } from 'firebase/firestore';
import { FirebaseStorage, getStorage } from 'firebase/storage';

import { firebaseConfig } from './config';

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
