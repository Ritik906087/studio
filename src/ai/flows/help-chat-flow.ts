'use server';
/**
 * @fileOverview A service to handle chat requests.
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

    if (input.uid) {
        try {
            const { data: userProfile } = await supabase
                .from('users')
                .select('numericId')
                .eq('uid', input.uid)
                .single();
            if (userProfile) {
                userNumericId = userProfile.numericId;
            }
        } catch (e) { /* ignore */ }
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
        console.error("Failed to create chat request:", e);
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
