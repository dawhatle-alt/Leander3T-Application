"use server";

import { revalidatePath } from "next/cache";
import { siteOrigin } from "@/lib/auth/origin";
import { getSessionProfile } from "@/lib/auth/session";
import { esc, sendEmail } from "@/lib/email/send";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import {
  newJobRequestSchema,
  updateRequestSchema,
  type RequestState,
} from "@/lib/validation/job-request";

// Builder portal: job requests go to the office's intake queue. Saved as the
// signed-in builder user; row-level security pins them to their own company.

async function builderOnly() {
  const me = await getSessionProfile();
  if (!me) return { error: "Your session has ended. Sign in again." } as const;
  if (me.role === "admin")
    return {
      error: "This is a preview — requests can only be sent by builder users.",
    } as const;
  if (me.role !== "builder" || !me.builderId)
    return { error: "Only builder users can send requests." } as const;
  return { me } as const;
}

function fieldErrors(issues: { path: PropertyKey[]; message: string }[]) {
  const out: Record<string, string> = {};
  for (const i of issues) out[String(i.path[0])] ??= i.message;
  return out;
}

async function tellOffice(subject: string, lines: string[]) {
  // Builders can't read staff profiles; the server key looks them up.
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return;
  const { data } = await createAdminClient()
    .from("profiles")
    .select("email")
    .eq("role", "admin")
    .eq("active", true);
  await sendEmail({
    to: (data ?? []).map((p) => p.email).filter((e): e is string => !!e),
    subject,
    html: `<div style="font-family:Arial,sans-serif;font-size:15px;color:#241E19;line-height:1.5">${lines
      .map((l) => `<p>${l}</p>`)
      .join(
        "",
      )}<p><a href="${esc(await siteOrigin())}/jobs/requests">Open Job Requests</a></p></div>`,
  });
}

export async function submitNewJobRequest(
  _prev: RequestState,
  formData: FormData,
): Promise<RequestState> {
  const who = await builderOnly();
  if ("error" in who) return { error: who.error };
  const me = who.me;

  const get = (k: string) => String(formData.get(k) ?? "");
  const parsed = newJobRequestSchema.safeParse({
    house_number: get("house_number"),
    street: get("street"),
    subdivision: get("subdivision"),
    area: get("area"),
    plan_name: get("plan_name"),
    plan_number: get("plan_number"),
    elevation: get("elevation"),
    lot_swing: get("lot_swing"),
    trades: formData.getAll("trades").map(String),
    brick_color: get("brick_color"),
    stone_color: get("stone_color"),
    mortar_color: get("mortar_color"),
    stucco_colors: get("stucco_colors"),
    wanted_by: get("wanted_by"),
    message: get("message"),
  });
  if (!parsed.success)
    return {
      error: "Check the highlighted fields.",
      fieldErrors: fieldErrors(parsed.error.issues),
    };
  const r = parsed.data;
  const nul = (v: string) => v || null;

  const supabase = await createClient();
  const { data: p } = await supabase
    .from("profiles")
    .select("construction_manager_id")
    .eq("id", me.id)
    .maybeSingle();
  const { error } = await supabase.from("job_requests").insert({
    kind: "new_job",
    builder_id: me.builderId!,
    submitted_by: me.id,
    construction_manager_id: p?.construction_manager_id ?? null,
    house_number: r.house_number,
    street: r.street,
    subdivision: nul(r.subdivision),
    area: nul(r.area),
    plan_name: nul(r.plan_name),
    plan_number: nul(r.plan_number),
    elevation: nul(r.elevation),
    lot_swing: r.lot_swing || null,
    trades: r.trades,
    brick_color: nul(r.brick_color),
    stone_color: nul(r.stone_color),
    mortar_color: nul(r.mortar_color),
    stucco_colors: nul(r.stucco_colors),
    wanted_by: nul(r.wanted_by),
    message: nul(r.message),
  });
  if (error)
    return { error: "Your request couldn't be sent. Please try again." };

  await tellOffice(
    `New job request — ${r.house_number} ${r.street} (${me.builderName ?? "builder"})`,
    [
      `<strong>${esc(me.fullName ?? me.email ?? "A builder")}</strong> at ${esc(me.builderName ?? "")} requested a new job.`,
      `${esc(`${r.house_number} ${r.street}`)}${r.subdivision ? ` · ${esc(r.subdivision)}` : ""} · ${esc(r.trades.join(", "))}`,
    ],
  );
  revalidatePath("/portal/requests");
  return { ok: true };
}

export async function submitUpdateRequest(
  _prev: RequestState,
  formData: FormData,
): Promise<RequestState> {
  const who = await builderOnly();
  if ("error" in who) return { error: who.error };
  const me = who.me;
  const parsed = updateRequestSchema.safeParse({
    job_id: String(formData.get("job_id") ?? ""),
    message: String(formData.get("message") ?? ""),
  });
  if (!parsed.success)
    return {
      error: "Check the highlighted fields.",
      fieldErrors: fieldErrors(parsed.error.issues),
    };

  const supabase = await createClient();
  const { data: job } = await supabase
    .from("jobs")
    .select("property_address")
    .eq("id", parsed.data.job_id)
    .maybeSingle();
  if (!job) return { error: "That home wasn't found." };
  const { error } = await supabase.from("job_requests").insert({
    kind: "update",
    builder_id: me.builderId!,
    submitted_by: me.id,
    job_id: parsed.data.job_id,
    message: parsed.data.message,
  });
  if (error)
    return { error: "Your request couldn't be sent. Please try again." };

  await tellOffice(`Update request — ${job.property_address}`, [
    `<strong>${esc(me.fullName ?? me.email ?? "A builder")}</strong> at ${esc(me.builderName ?? "")} asked about ${esc(job.property_address ?? "")}:`,
    `<span style="white-space:pre-wrap">${esc(parsed.data.message)}</span>`,
  ]);
  revalidatePath(`/portal/homes/${parsed.data.job_id}`);
  revalidatePath("/portal/requests");
  return { ok: true };
}
