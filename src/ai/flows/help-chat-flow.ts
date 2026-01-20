'use server';
/**
 * @fileOverview A simple help chat AI agent.
 *
 * - helpChat - A function that handles the chat conversation.
 * - HelpChatInput - The input type for the helpChat function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { getApps, initializeApp, type FirebaseApp } from 'firebase/app';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import { firebaseConfig } from '@/firebase/config';

// Initialize Firebase for server-side usage, safely
let app: FirebaseApp;
if (getApps().length === 0) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApps()[0];
}
const db = getFirestore(app);


const HelpChatInputSchema = z.object({
  prompt: z.string().describe("The user's message or question."),
  uid: z.string().optional().describe("The user's unique ID (Firebase Auth UID)."),
});
export type HelpChatInput = z.infer<typeof HelpChatInputSchema>;


const getUserProfile = ai.defineTool(
  {
    name: 'getUserProfile',
    description: "Get the user's profile information from the database.",
    inputSchema: z.object({
        uid: z.string().describe("The user's unique ID (Firebase Auth UID)."),
    }),
    outputSchema: z.any(),
  },
  async ({ uid }) => {
    if (!uid) {
        return { error: 'User ID is required.' };
    }
    try {
        const userRef = doc(db, 'users', uid);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
            return userSnap.data();
        } else {
            return { error: 'User not found.' };
        }
    } catch (e: any) {
        console.error('Failed to fetch user profile:', e);
        return { error: `Failed to fetch user profile: ${e.message}` };
    }
  }
);


export async function helpChat(input: HelpChatInput): Promise<string> {
  const response = await helpChatFlow(input);
  return response;
}

const prompt = ai.definePrompt({
  name: 'helpChatPrompt',
  input: {schema: HelpChatInputSchema},
  tools: [getUserProfile],
  prompt: `You are a helpful customer support agent for an application called LG Pay.
  Your goal is to answer the user's questions about the app.
  Be concise and helpful.

  If the user asks a question about their own account, like their balance, UID, or other personal information,
  use the getUserProfile tool to get their data and answer the question.
  The user's ID is: {{{uid}}}

  User question: {{{prompt}}}`,
});

const helpChatFlow = ai.defineFlow(
  {
    name: 'helpChatFlow',
    inputSchema: HelpChatInputSchema,
    outputSchema: z.string(),
  },
  async input => {
    const {text} = await prompt(input);
    return text;
  }
);
