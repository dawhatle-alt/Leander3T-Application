"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { z } from "zod";
import { getSessionProfile } from "@/lib/auth/session";
import { siteOrigin } from "@/lib/auth/origin";
import { esc, sendEmail } from "@/lib/email/send";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import {
  infoRequestSchema,
  type InfoRequestState,
} from "@/lib/validation/request";

// Public "Request More Information" form. Written with the server key — the
// table has no public insert policy — after three spam checks:
//   1. a hidden field people never see ("website") must stay empty
//   2. the form must have been open for at least 3 seconds
//   3. at most 3 requests per hour from one IP address
// Then every active administrator is emailed (once email is set up).

const MIN_MS = 3000;
const PER_HOUR = 3;

export async function submitInfoRequest(
  _prev: InfoRequestState,
  formData: FormData,
): Promise<InfoRequestState> {
  // Bots that fill the hidden field or submit instantly get a quiet "thanks"
  // so they learn nothing; nothing is saved.
  const started = Number(formData.get("started"));
  if (
    String(formData.get("website") ?? "") !== "" ||
    !Number.isFinite(started) ||
    Date.now() - started < MIN_MS
  ) {
    return { ok: true };
  }

  const parsed = infoRequestSchema.safeParse({
    name: formData.get("name") ?? "",
    company: formData.get("company") ?? "",
    email: formData.get("email") ?? "",
    phone: formData.get("phone") ?? "",
    notes: formData.get("notes") ?? "",
  });
  if (!parsed.success) {
    const fieldErrors: InfoRequestState["fieldErrors"] = {};
    for (const i of parsed.error.issues) {
      const k = String(i.path[0]) as keyof NonNullable<
        InfoRequestState["fieldErrors"]
      >;
      fieldErrors[k] ??= i.message;
    }
    return { error: "Check the highlighted fields.", fieldErrors };
  }
  const r = parsed.data;

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY)
    return {
      error: "The form isn't available right now. Please call (512) 260-2577.",
    };

  const h = await headers();
  const ip =
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    h.get("x-real-ip") ||
    "unknown";

  const db = createAdminClient();
  const since = new Date(Date.now() - 3600_000).toISOString();
  const { count } = await db
    .from("info_requests")
    .select("id", { count: "exact", head: true })
    .eq("source_ip", ip)
    .gte("created_at", since);
  if ((count ?? 0) >= PER_HOUR)
    return {
      error:
        "We've received several requests from you already. We'll be in touch — or call (512) 260-2577.",
    };

  const { error } = await db.from("info_requests").insert({
    name: r.name,
    company_name: r.company || null,
    email: r.email,
    phone: r.phone || null,
    notes: r.notes || null,
    source_ip: ip,
  });
  if (error)
    return {
      error:
        "Your request couldn't be sent. Please try again or call (512) 260-2577.",
    };

  const { data: admins } = await db
    .from("profiles")
    .select("email")
    .eq("role", "admin")
    .eq("active", true);
  const to = (admins ?? [])
    .map((a) => a.email)
    .filter((e): e is string => Boolean(e));
  await sendEmail({
    to,
    replyTo: r.email,
    subject: `Website request — ${r.name}${r.company ? `, ${r.company}` : ""}`,
    html: `<div style="font-family:Arial,sans-serif;font-size:15px;color:#241E19;line-height:1.5">
<p><strong>New request from the Leander 3T website.</strong></p>
<p>${esc(r.name)}${r.company ? ` · ${esc(r.company)}` : ""}<br>${esc(r.email)}${r.phone ? ` · ${esc(r.phone)}` : ""}</p>
${r.notes ? `<p style="white-space:pre-wrap;border-left:3px solid #E4590F;padding-left:12px">${esc(r.notes)}</p>` : ""}
<p><a href="${esc(await siteOrigin())}/admin/requests">Open Website Requests</a> · Reply to this email to answer them directly.</p>
</div>`,
  });

  return { ok: true };
}

const updateSchema = z.object({
  id: z.guid(),
  status: z.enum(["todo", "in_progress", "done"]),
  assigneeId: z.union([z.literal(""), z.guid()]),
});

/** Administration: set a website request's status and who's handling it. */
export async function updateInfoRequest(input: {
  id: string;
  status: string;
  assigneeId: string;
}): Promise<{ error?: string }> {
  const me = await getSessionProfile();
  if (me?.role !== "admin")
    return { error: "Only Administration can update website requests." };
  const p = updateSchema.safeParse(input);
  if (!p.success) return { error: "Not found." };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("info_requests")
    .update({ status: p.data.status, assignee_id: p.data.assigneeId || null })
    .eq("id", p.data.id)
    .select("id");
  if (error || !data?.length) return { error: "That couldn't be saved." };
  revalidatePath("/admin/requests");
  revalidatePath("/dashboard");
  return {};
}
