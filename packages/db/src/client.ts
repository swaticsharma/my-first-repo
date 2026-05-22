import { createClient, type SupabaseClient } from '@supabase/supabase-js';

function readEnv(name: string, expoFallback?: string): string {
  const v =
    (typeof process !== 'undefined' && process.env?.[name]) ||
    (expoFallback && typeof process !== 'undefined' && process.env?.[expoFallback]);
  if (!v) {
    throw new Error(`Missing env var: ${name}${expoFallback ? ` (or ${expoFallback})` : ''}`);
  }
  return v;
}

export function createBrowserClient(): SupabaseClient {
  const url = readEnv('NEXT_PUBLIC_SUPABASE_URL', 'EXPO_PUBLIC_SUPABASE_URL');
  const key = readEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'EXPO_PUBLIC_SUPABASE_ANON_KEY');
  return createClient(url, key, { auth: { persistSession: true, autoRefreshToken: true } });
}

export function createServerClient(accessToken?: string): SupabaseClient {
  const url = readEnv('NEXT_PUBLIC_SUPABASE_URL');
  const key = readEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY');
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : undefined,
  });
}

export function createServiceClient(): SupabaseClient {
  const url = readEnv('NEXT_PUBLIC_SUPABASE_URL');
  const key = readEnv('SUPABASE_SERVICE_ROLE_KEY');
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
