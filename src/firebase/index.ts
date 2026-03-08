// This is the public API for the firebase SDK.
// It can be used in both client and server contexts.
// However, it is not generally recommended to use this in server components.

import { FirebaseProvider, getFirebase, useAuth, useFirebase, useFirebaseApp, useFirestore, useStorage } from './provider';
import { useUser } from './auth/use-user';
import { useCollection } from './firestore/use-collection';
import { useDoc } from './firestore/use-doc';

// Re-export to maintain the public API while fixing the chunking issue.
export { initializeFirebase } from './init';
export type { FirebaseInstances } from './init';


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
