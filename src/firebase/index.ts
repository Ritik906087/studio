'use client';

import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';
import { firebaseConfig } from './config';

let app: FirebaseApp;
let auth: Auth;
let firestore: Firestore;
let storage: FirebaseStorage;

if (typeof window !== 'undefined') {
  app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
  auth = getAuth(app);
  firestore = getFirestore(app);
  storage = getStorage(app);
}

export const useFirebase = () => {
  return { app, auth, firestore, storage };
};

export const useAuth = () => auth;
export const useFirestore = () => firestore;
export const useStorage = () => storage;

export { app, auth, firestore, storage };
