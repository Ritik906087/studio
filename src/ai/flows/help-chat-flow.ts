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

const ChatMessageSchema = z.object({
  text: z.string(),
  isUser: z.boolean(),
  timestamp: z.number(),
  attachment: z.any().optional(),
  userName: z.string().optional()
});


const HelpChatInputSchema = z.object({
  prompt: z.string().describe("The user's latest message or question."),
  uid: z.string().optional().describe("The user's unique ID (Firebase Auth UID)."),
  chatHistory: z.array(ChatMessageSchema).optional().describe("The entire conversation history so far."),
  enteredIdentifier: z.string().optional().describe("The phone number or UID the user provided to start the chat.")
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


async function createHumanAgentRequest(input: {
    uid?: string;
    enteredIdentifier: string;
    chatHistory: z.infer<typeof ChatMessageSchema>[];
}) {
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
        return { success: false };
    }
}

const requestHumanAgent = ai.defineTool(
  {
    name: 'requestHumanAgent',
    description: "Use this tool to create a request for a user to speak with a human support agent. This should be used when the user explicitly asks for a human, or if you are unable to resolve their issue.",
    inputSchema: z.object({
        uid: z.string().optional(),
        enteredIdentifier: z.string(),
        chatHistory: z.array(ChatMessageSchema),
    }),
    outputSchema: z.object({ success: z.boolean() }),
  },
  async (input) => {
     return await createHumanAgentRequest(input);
  }
);

export async function escalateToHuman(input: {
    uid?: string;
    enteredIdentifier: string;
    chatHistory: any[];
}): Promise<{ success: boolean }> {
    return await createHumanAgentRequest(input);
}


export async function helpChat(input: HelpChatInput): Promise<string> {
  const response = await helpChatFlow(input);
  return response;
}

const prompt = ai.definePrompt({
  name: 'helpChatPrompt',
  input: {schema: HelpChatInputSchema},
  tools: [getUserProfile, requestHumanAgent],
  prompt: `You are a helpful customer support agent for an application called LG Pay.
  Your goal is to answer the user's questions about the app. Be concise and helpful.

  If the user asks a question about their own account, like their balance, UID, or other personal information,
  use the getUserProfile tool to get their data and answer the question.
  The user's ID is: {{{uid}}}

  If the user says they want to talk to a human, a person, or a real agent, or if they are frustrated and you cannot solve their problem, you MUST use the 'requestHumanAgent' tool to escalate the chat.
  When calling 'requestHumanAgent', you MUST provide the user's 'uid' (if available), their 'enteredIdentifier', and the complete 'chatHistory'.

  User's UID: {{{uid}}}
  User's Entered Identifier (phone or starting UID): {{{enteredIdentifier}}}
  User question: {{{prompt}}}
  
  Conversation History:
  {{#each chatHistory}}
    {{#if this.isUser}}User{{else}}Agent{{/if}}: {{{this.text}}}
  {{/each}}
  `,
});

const helpChatFlow = ai.defineFlow(
  {
    name: 'helpChatFlow',
    inputSchema: HelpChatInputSchema,
    outputSchema: z.string(),
  },
  async input => {
    try {
      const {text, toolCalls, toolOutputs} = await prompt(input);

      const humanRequestToolCall = toolCalls?.find(tc => tc.toolName === 'requestHumanAgent');
      if (humanRequestToolCall) {
          const toolOutput = toolOutputs?.find(to => to.toolName === 'requestHumanAgent');
          if (toolOutput?.output.success) {
              return "Thank you. Your request has been submitted. A support agent will review your case and connect with you shortly.";
          } else {
              return "I'm sorry, I was unable to submit your request for a human agent at this time. Please try again in a few moments.";
          }
      }
      
      return text;
    } catch (error) {
        console.error("AI prompt error, escalating to human agent:", error);
        
        // Automatically request a human agent on any error
        await requestHumanAgent({
            uid: input.uid,
            enteredIdentifier: input.enteredIdentifier!,
            chatHistory: input.chatHistory || [],
        });
        
        // Return the standard message for agent request
        return "Thank you. Your request has been submitted. A support agent will review your case and connect with you shortly.";
    }
  }
);
