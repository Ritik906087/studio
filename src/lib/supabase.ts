'use client';

import { createClient } from '@supabase/supabase-js';

// Replace these with your actual Supabase credentials in .env
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://your-project.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'your-anon-key';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Helper to upload a file to Supabase Storage and get the public URL.
 * Bucket name: "proofs" (Make sure to create this bucket in Supabase and set public access)
 */
export async function uploadToSupabase(file: File, path: string): Promise<string> {
    const { data, error } = await supabase.storage
        .from('proofs')
        .upload(path, file, {
            cacheControl: '3600',
            upsert: true
        });

    if (error) {
        throw new Error(`Supabase Upload Error: ${error.message}`);
    }

    const { data: { publicUrl } } = supabase.storage
        .from('proofs')
        .getPublicUrl(data.path);

    return publicUrl;
}
