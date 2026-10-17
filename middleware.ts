import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { areaFor, canOpen, homeFor, type AppRole } from "@/lib/auth/roles";
import type { Database } from "@/lib/supabase/types";

// Runs on every page request: refreshes the Supabase session cookie, sends
// signed-out visitors to /sign-in, and keeps each role inside its own area.
// The database enforces the same access with row-level security; this only
// decides which screens someone is sent to.
export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Must run before any redirect decision: it refreshes an expiring session.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname, search } = request.nextUrl;
  const area = areaFor(pathname);
  const onSignIn = pathname === "/sign-in";

  if (!user) {
    if (!area) return response;
    const url = request.nextUrl.clone();
    url.pathname = "/sign-in";
    url.search = "";
    url.searchParams.set("next", pathname + search);
    return redirectWithCookies(url, response);
  }

  if (!area && !onSignIn) return response;

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, active")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile || !profile.active) {
    await supabase.auth.signOut();
    const url = request.nextUrl.clone();
    url.pathname = "/sign-in";
    url.search = "?error=inactive";
    return redirectWithCookies(url, response);
  }

  const role = profile.role as AppRole;
  if (onSignIn || !canOpen(role, pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = homeFor(role);
    url.search = "";
    return redirectWithCookies(url, response);
  }

  return response;
}

// A redirect must carry any refreshed session cookies, or the user is signed out.
function redirectWithCookies(url: URL, from: NextResponse) {
  const redirect = NextResponse.redirect(url);
  from.cookies.getAll().forEach((c) => redirect.cookies.set(c));
  return redirect;
}

export const config = {
  matcher: [
    // Everything except Next internals, auth callbacks and static files.
    "/((?!_next/static|_next/image|auth/|favicon.ico|brand/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
