import { createClient } from '@supabase/supabase-js';

// Enforce the exact production URL with 'fecmm' - do not allow bad env variables to override
const rawEnvUrl = typeof import.meta !== 'undefined' && import.meta.env ? (import.meta.env.VITE_SUPABASE_URL || '') : '';
export const supabaseUrl = (rawEnvUrl && rawEnvUrl.includes('wxezfzhhzlauggufecmm'))
  ? rawEnvUrl
  : 'https://wxezfzhhzlauggufecmm.supabase.co';

const supabaseAnonKey = 
  (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_SUPABASE_ANON_KEY) ||
  (typeof process !== 'undefined' && process.env?.SUPABASE_ANON_KEY) ||
  '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

export const isSupabaseConfigured = Boolean(
  supabaseUrl && 
  supabaseAnonKey && 
  supabaseUrl !== 'https://your-project.supabase.co'
);
