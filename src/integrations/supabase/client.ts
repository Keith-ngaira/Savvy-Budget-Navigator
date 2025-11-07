import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
// Prefer the anon key name used in this project; fall back to publishable if present
const SUPABASE_ANON_KEY = (import.meta.env.VITE_SUPABASE_ANON_KEY as string) || (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string);

if (!SUPABASE_URL) {
  throw new Error('VITE_SUPABASE_URL is required to initialize Supabase client');
}
if (!SUPABASE_ANON_KEY) {
  throw new Error('VITE_SUPABASE_ANON_KEY (or VITE_SUPABASE_PUBLISHABLE_KEY) is required to initialize Supabase client');
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
