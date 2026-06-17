import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL || import.meta.env.NEXT_PUBLIC_SUPABASE_URL) as string;
const SUPABASE_ANON_KEY = (import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) as string;

if (!SUPABASE_URL) {
  throw new Error('VITE_SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) is required to initialize Supabase client');
}
if (!SUPABASE_ANON_KEY) {
  throw new Error('VITE_SUPABASE_ANON_KEY (or NEXT_PUBLIC_SUPABASE_ANON_KEY) is required to initialize Supabase client');
}

const NORMALIZED_URL = SUPABASE_URL.replace(/\/+$/, '');

export const supabase = createClient<Database>(NORMALIZED_URL, SUPABASE_ANON_KEY, {
  auth: {
    // localStorage is only available in the browser
    storage: typeof window !== 'undefined' ? localStorage : undefined,
    persistSession: true,
    autoRefreshToken: true,
  },
});
