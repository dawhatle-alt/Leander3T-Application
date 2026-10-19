import "server-only";
import { headers } from "next/headers";
import { createAdminClient } from "@/lib/supabase/server";

export type AccessEvent =
  | "sign_in"
  | "sign_in_failed"
  | "sign_out"
  | "password_changed"
  | "password_set"
  | "invited";

export type AccessMethod =
  "password" | "email_link" | "invite" | "password_reset";

/**
 * Adds a line to the sign-in log (Administration → Activity). Called from
 * the server only: it records the visitor's IP address and browser, which the
 * browser can't be trusted to report. Never throws — a logging problem must
 * not stop anyone signing in.
 */
export async function logAccess(entry: {
  event: AccessEvent;
  method?: AccessMethod;
  userId?: string | null;
  email?: string | null;
  actor?: { id: string; name: string | null } | null;
  detail?: string | null;
}) {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return;
  try {
    const h = await headers();
    const ip =
      h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      h.get("x-real-ip") ||
      null;
    const db = createAdminClient();

    // A failed attempt only knows the email typed; link it to the account
    // when there is one, so repeated failures show up against that person.
    let userId = entry.userId ?? null;
    const email = entry.email?.trim().toLowerCase() || null;
    if (!userId && email) {
      const { data } = await db
        .from("profiles")
        .select("id")
        .ilike("email", email.replace(/[\\%_]/g, "\\$&"))
        .limit(1)
        .maybeSingle();
      userId = data?.id ?? null;
    }

    await db.from("access_log").insert({
      event: entry.event,
      method: entry.method ?? null,
      user_id: userId,
      email,
      actor_id: entry.actor?.id ?? null,
      actor_name: entry.actor?.name ?? null,
      ip,
      user_agent: h.get("user-agent")?.slice(0, 400) ?? null,
      detail: entry.detail ?? null,
    });
  } catch {
    // Logged nowhere on purpose: see above.
  }
}
