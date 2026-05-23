'use server';
/**
 * @fileOverview A service to handle chat requests using Supabase DB to save Firestore quota.
 *
 * - escalateToHuman - Creates a new human agent chat request in Supabase.
 */

import { supabase } from '@/lib/supabase';
import { sendNewChatRequestToTelegram } from '@/lib/telegram';

async function createHumanAgentRequest(input: {
    uid?: string;
    enteredIdentifier: string;
    chatHistory: any[];
}): Promise<{ success: boolean; error?: string, chatId?: string }> {
    let userNumericId: string | undefined;

    // Use Supabase directly to check user data if possible, or fallback
    if (input.uid) {
        userNumericId = "UID_PENDING"; // Sync logic can be added here
    }

    try {
        const docData: any = {
            enteredIdentifier: input.enteredIdentifier,
            chatHistory: input.chatHistory,
            status: 'pending',
            userId: input.uid || null,
            userNumericId: userNumericId || null,
        };

        const { data: newChatRequest, error } = await supabase
            .from('chatRequests')
            .insert(docData)
            .select('id')
            .single();

        if (error) throw error;
        
        await sendNewChatRequestToTelegram({
            userNumericId,
            enteredIdentifier: input.enteredIdentifier,
        });

        return { success: true, chatId: newChatRequest.id };
    } catch (e) {
        console.error("Failed to create chat request in Supabase:", e);
        return { success: false, error: (e as Error).message };
    }
}

export async function escalateToHuman(input: {
    uid?: string;
    enteredIdentifier: string;
    chatHistory: any[];
}): Promise<{ success: boolean; error?: string, chatId?: string }> {
    return await createHumanAgentRequest(input);
}
