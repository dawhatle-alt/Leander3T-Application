import { NextResponse, type NextRequest } from "next/server";
import { logAccess } from "@/lib/audit/access";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  await supabase.auth.signOut();
  if (user)
    await logAccess({ event: "sign_out", userId: user.id, email: user.email });
  return NextResponse.redirect(
    `${request.nextUrl.origin}/sign-in?signed_out=1`,
    {
      status: 303,
    },
  );
}
