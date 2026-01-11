"use client";

import {
  createContext,
  useContext,
  ReactNode,
  useMemo,
  type ComponentType,
} from 'react';

import type { FirebaseApp } from 'firebase/app';
import type { Auth } from 'firebase/auth';
import type { Firestore } from 'firebase/firestore';

type FirebaseContextValue = {
  app: FirebaseApp;
  auth: Auth;
  firestore: Firestore;
};

const FirebaseContext = createContext<FirebaseContextValue | undefined>(
  undefined
);

type FirebaseProviderProps = {
  children: ReactNode;
  app: FirebaseApp;
  auth: Auth;
  firestore: Firestore;
};

export function FirebaseProvider(props: FirebaseProviderProps) {
  const { app, auth, firestore, children } = props;

  const value = useMemo(
    () => ({
      app,
      auth,
      firestore,
    }),
    [app, auth, firestore]
  );

  return (
    <FirebaseContext.Provider value={value}>
      {children}
    </FirebaseContext.Provider>
  );
}

export function useFirebase() {
  const context = useContext(FirebaseContext);

  if (!context) {
    throw new Error('useFirebase must be used within a FirebaseProvider');
  }

  return context;
}

export function useFirebaseApp() {
  const { app } = useFirebase();

  return app;
}

export function useAuth() {
  const { auth } = useFirebase();

  return auth;
}

export function useFirestore() {
  const { firestore } = useFirebase();

  return firestore;
}

/**
 * @name getFirebase
 * @description Get the Firebase instances from the server-side.
 * This is useful for server-side rendering and API routes.
 * It is not recommended to use this on the client-side.
 * @returns
 */
export function getFirebase() {
  const context = useContext(FirebaseContext);

  if (!context) {
    throw new Error(
      'getFirebase cannot be used on the client-side. Please use the useFirebase, useAuth, or useFirestore hooks instead.'
    );
  }

  return context;
}

export function withFirebase<T>(Component: ComponentType<T>) {
  const WithFirebase = (props: T) => {
    const firebase = useFirebase();

    return <Component {...props} firebase={firebase} />;
  };

  return WithFirebase;
}
