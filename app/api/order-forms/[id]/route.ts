import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Opens an order-form PDF. Row-level security decides whether the signed-in
// person may see the form; the file itself is served by a short-lived signed
// URL, so links in the app never expire.
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id))
    return new NextResponse("Not found", { status: 404 });

  const supabase = await createClient();
  const { data: form } = await supabase
    .from("order_forms")
    .select("storage_path")
    .eq("id", id)
    .maybeSingle();
  if (!form) return new NextResponse("Not found", { status: 404 });

  const download = request.nextUrl.searchParams.has("download");
  const { data } = await supabase.storage
    .from("order-forms")
    .createSignedUrl(form.storage_path, 120, {
      download: download
        ? (form.storage_path.split("/").pop() ?? "order-form.pdf")
        : undefined,
    });
  if (!data?.signedUrl) return new NextResponse("Not found", { status: 404 });
  return NextResponse.redirect(data.signedUrl);
}
