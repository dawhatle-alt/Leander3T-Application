import "server-only";
import { createServerClient } from "@supabase/ssr";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import type { Database } from "./types";

// Server client for Server Components, server actions and route handlers.
// Acts as the signed-in user, so row-level security still applies.
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Called from a Server Component, where cookies are read-only.
            // Session refresh happens in middleware (added in M3).
          }
        },
      },
    },
  );
}

// Service-role client: bypasses row-level security. Server-only, for trusted
// jobs such as order-form generation and the public request-info form.
//
// Pass `actorId` (the signed-in administrator) when the write is done on
// someone's behalf, so the change log records who did it. The database trusts
// that header only on requests that carry the server key.
export function createAdminClient(actorId?: string) {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: { persistSession: false, autoRefreshToken: false },
      ...(actorId ? { global: { headers: { "x-actor-id": actorId } } } : {}),
    },
  );
}
