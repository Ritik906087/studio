'use client';

import { createClient } from '@supabase/supabase-js';

// User provided credentials
const supabaseUrl = 'https://slytlppadlmnnloszuwd.supabase.co';
const supabaseAnonKey = 'sb_publishable_b17Qw8jmbfhisK4E69BbxQ__9KZwKXN';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Helper to upload a file to Supabase Storage and get the public URL.
 * Bucket name: "payment"
 */
export async function uploadToSupabase(file: File, path: string): Promise<string> {
    const { data, error } = await supabase.storage
        .from('payment')
        .upload(path, file, {
            cacheControl: '3600',
            upsert: true
        });

    if (error) {
        throw new Error(`Supabase Upload Error: ${error.message}`);
    }

    const { data: { publicUrl } } = supabase.storage
        .from('payment')
        .getPublicUrl(data.path);

    return publicUrl;
}
