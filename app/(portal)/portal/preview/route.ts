import { NextResponse, type NextRequest } from "next/server";
import { getSessionProfile } from "@/lib/auth/session";
import { PREVIEW_COOKIE } from "@/lib/portal/context";

// Admins: choose which builder's portal to preview.
export async function GET(request: NextRequest) {
  const me = await getSessionProfile();
  const url = new URL("/portal", request.url);
  if (me?.role !== "admin") return NextResponse.redirect(url);
  const builder = request.nextUrl.searchParams.get("builder") ?? "";
  const res = NextResponse.redirect(url);
  if (/^[0-9a-f-]{36}$/i.test(builder))
    res.cookies.set(PREVIEW_COOKIE, builder, {
      httpOnly: true,
      sameSite: "lax",
      secure: true,
      path: "/portal",
      maxAge: 60 * 60 * 8,
    });
  return res;
}
