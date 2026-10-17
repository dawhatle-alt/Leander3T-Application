import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "./types";

// Browser client. Uses the publishable (anon) key only; every read and write
// it makes is limited by row-level security. Never import a service-role key here.
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  );
}
