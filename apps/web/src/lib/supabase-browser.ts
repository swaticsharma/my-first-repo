'use client';

import { createBrowserClient as createSsrBrowserClient } from '@supabase/ssr';

let client: ReturnType<typeof createSsrBrowserClient> | null = null;

export function getSupabaseBrowser() {
  if (!client) {
    client = createSsrBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );
  }
  return client;
}
