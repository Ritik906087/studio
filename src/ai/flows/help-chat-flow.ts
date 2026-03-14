'use server';
/**
 * @fileOverview A service to handle chat requests.
 *
 * - escalateToHuman - Creates a new human agent chat request in Firestore.
 */

import { getApps, initializeApp, type FirebaseApp } from 'firebase/app';
import { getFirestore, doc, getDoc, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { firebaseConfig } from '@/firebase/config';
import { sendNewChatRequestToTelegram } from '@/lib/telegram';

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
        const docData: any = {
            enteredIdentifier: input.enteredIdentifier,
            chatHistory: input.chatHistory,
            status: 'pending',
            createdAt: serverTimestamp(),
        };

        if (input.uid) {
            docData.userId = input.uid;
        }

        if (userNumericId) {
            docData.userNumericId = userNumericId;
        }

        await addDoc(collection(db, 'chatRequests'), docData);
        
        // Wait for the notification to be sent to ensure reliability
        await sendNewChatRequestToTelegram({
            userNumericId,
            enteredIdentifier: input.enteredIdentifier,
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
