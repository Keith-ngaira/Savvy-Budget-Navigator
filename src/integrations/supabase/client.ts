import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;

if (!SUPABASE_URL) {
  throw new Error('NEXT_PUBLIC_SUPABASE_URL is required to initialize Supabase client');
}
if (!SUPABASE_ANON_KEY) {
  throw new Error('NEXT_PUBLIC_SUPABASE_ANON_KEY is required to initialize Supabase client');
}

const NORMALIZED_URL = SUPABASE_URL.replace(/\/+$/, '');

// Custom fetch to work around browser extension interference
const customFetch = async (url: string, options?: RequestInit) => {
  try {
    const response = await fetch(url, options);
    return response;
  } catch (error) {
    // Retry once if fetch fails (handles extension interference)
    console.error('Initial fetch failed, retrying...', error);
    await new Promise(resolve => setTimeout(resolve, 500));
    return fetch(url, options);
  }
};

export const supabase = createClient<Database>(NORMALIZED_URL, SUPABASE_ANON_KEY, {
  auth: {
    // localStorage is only available in the browser
    storage: typeof window !== 'undefined' ? localStorage : undefined,
    persistSession: true,
    autoRefreshToken: true,
  },
  global: {
    fetch: customFetch,
  },
});
