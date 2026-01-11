'use client';

import { useEffect, useState, useRef } from 'react';
import {
  collection,
  onSnapshot,
  Query,
  DocumentData,
  FirestoreError,
  QuerySnapshot,
} from 'firebase/firestore';
import { useFirestore } from '@/firebase/provider';

const useCollection = <T extends DocumentData>(
  path: string,
  query?: Query<T>
) => {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<FirestoreError | null>(null);

  const firestore = useFirestore();

  const pathRef = useRef(path);
  const queryRef = useRef(query);

  useEffect(() => {
    if (!firestore) {
      return;
    }

    const collectionQuery: Query<T> = queryRef.current
      ? queryRef.current
      : (collection(firestore, pathRef.current) as Query<T>);

    const unsubscribe = onSnapshot(
      collectionQuery,
      (snapshot: QuerySnapshot<T>) => {
        const docs = snapshot.docs.map(
          (doc) => ({ ...doc.data(), id: doc.id } as T)
        );
        setData(docs);
        setLoading(false);
      },
      (err: FirestoreError) => {
        setError(err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [firestore]);

  return { data, loading, error };
};

export { useCollection };
