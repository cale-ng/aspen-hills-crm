import { createClient } from "@supabase/supabase-js";

/**
 * Server-side Supabase client (uses the service role key).
 * Only import this from server code: route handlers, server components,
 * server actions. Never import from a "use client" file.
 */
export function supabaseServer() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error(
      "Missing Supabase env vars. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local."
    );
  }

  return createClient(url, serviceKey, {
    auth: { persistSession: false },
  });
}
