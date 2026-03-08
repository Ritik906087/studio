'use server';
/**
 * @fileOverview A service to handle chat requests.
 *
 * - escalateToHuman - Creates a new human agent chat request in Firestore.
 */

import { getApps, initializeApp, type FirebaseApp } from 'firebase/app';
import { getFirestore, doc, getDoc, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { firebaseConfig } from '@/firebase/config';

// Initialize Firebase for server-side usage, safely
let app: FirebaseApp;
if (getApps().length === 0) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApps()[0];
}
const db = getFirestore(app);

async function createHumanAgentRequest(input: {
    uid?: string;
    enteredIdentifier: string;
    chatHistory: any[];
}): Promise<{ success: boolean, error?: string }> {
    let userNumericId: string | undefined;
    if (input.uid) {
        try {
            const userSnap = await getDoc(doc(db, 'users', input.uid));
            if (userSnap.exists()) {
                userNumericId = userSnap.data().numericId;
            }
        } catch (e) { /* ignore */ }
    }

    try {
        await addDoc(collection(db, 'chatRequests'), {
            userId: input.uid,
            userNumericId: userNumericId,
            enteredIdentifier: input.enteredIdentifier,
            chatHistory: input.chatHistory,
            status: 'pending',
            createdAt: serverTimestamp(),
        });
        return { success: true };
    } catch (e) {
        console.error("Failed to create chat request:", e);
        return { success: false, error: (e as Error).message };
    }
}

export async function escalateToHuman(input: {
    uid?: string;
    enteredIdentifier: string;
    chatHistory: any[];
}): Promise<{ success: boolean; error?: string }> {
    return await createHumanAgentRequest(input);
}
