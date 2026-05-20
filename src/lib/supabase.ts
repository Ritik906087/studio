/**
 * Supabase has been removed in favor of Firebase.
 * This file is kept as a dummy export to prevent immediate build crashes
 * in components that haven't been fully migrated to use useFirestore/useAuth hooks.
 */

const dummySupabase = {
  from: () => dummySupabase,
  select: () => dummySupabase,
  eq: () => dummySupabase,
  single: () => Promise.resolve({ data: null, error: new Error('Supabase is disconnected. Please use Firebase hooks.') }),
  insert: () => Promise.resolve({ data: null, error: new Error('Supabase is disconnected.') }),
  update: () => dummySupabase,
  in: () => dummySupabase,
  order: () => dummySupabase,
  limit: () => dummySupabase,
  channel: () => ({ on: () => ({ subscribe: () => ({}) }) }),
  auth: {
    signOut: () => Promise.resolve({ error: null }),
    updateUser: () => Promise.resolve({ data: null, error: null }),
    signInWithOtp: () => Promise.resolve({ data: null, error: null }),
    verifyOtp: () => Promise.resolve({ data: null, error: null }),
  }
};

export const supabase = dummySupabase as any;
