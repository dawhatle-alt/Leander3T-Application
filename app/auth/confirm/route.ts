import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { logAccess, type AccessMethod } from "@/lib/audit/access";
import { safeNext } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";

// Landing point for every emailed link: sign-in links, invites and password
// resets. The email templates (supabase/templates/) point here with a
// token_hash; a ?code= from the PKCE flow is accepted too.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const code = searchParams.get("code");
  const next = safeNext(searchParams.get("next"));

  const supabase = await createClient();
  let ok = false;
  let user: { id: string; email?: string } | null = null;
  let failure: string | null = null;

  if (tokenHash && type) {
    const { data, error } = await supabase.auth.verifyOtp({
      type,
      token_hash: tokenHash,
    });
    ok = !error;
    user = data.user;
    failure = error?.code ?? error?.message ?? null;
  } else if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    ok = !error;
    user = data.user;
    failure = error?.code ?? error?.message ?? null;
  }

  const method: AccessMethod =
    type === "invite"
      ? "invite"
      : type === "recovery"
        ? "password_reset"
        : "email_link";

  if (!ok || !user) {
    await logAccess({
      event: "sign_in_failed",
      method,
      detail: failure ?? "link missing",
    });
    return NextResponse.redirect(`${origin}/sign-in?error=link`);
  }
  await logAccess({
    event: "sign_in",
    method,
    userId: user.id,
    email: user.email,
  });

  // New invitees and password resets choose a password first.
  const destination =
    next ??
    (type === "invite" || type === "recovery"
      ? "/update-password"
      : "/sign-in");
  return NextResponse.redirect(`${origin}${destination}`);
}
