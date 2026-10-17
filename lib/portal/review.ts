"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { siteOrigin } from "@/lib/auth/origin";
import { getSessionProfile } from "@/lib/auth/session";
import { esc, sendEmail } from "@/lib/email/send";
import { createClient } from "@/lib/supabase/server";

// Office side of builder job requests: turn a new-job request into a job,
// decline it, or answer an update request. The builder sees the outcome in
// the portal and gets an email once email is set up.

const guid = z.guid();
const reply = z.string().trim().max(4000);

async function office() {
  const me = await getSessionProfile();
  if (!me || (me.role !== "admin" && me.role !== "supervisor")) return null;
  return me;
}

function refresh() {
  revalidatePath("/jobs/requests");
  revalidatePath("/dashboard");
  revalidatePath("/portal/requests");
}

async function tellBuilder(requestId: string, subject: string, body: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("job_requests")
    .select("submitter:profiles!job_requests_submitted_by_fkey(email)")
    .eq("id", requestId)
    .maybeSingle();
  const to = data?.submitter?.email;
  if (!to) return;
  await sendEmail({
    to: [to],
    subject,
    html: `<div style="font-family:Arial,sans-serif;font-size:15px;color:#241E19;line-height:1.5">${body}<p><a href="${esc(await siteOrigin())}/portal/requests">Open your requests in the Leander 3T portal</a></p></div>`,
  });
}

/** Create a job from a new-job request, then open it for the office to finish. */
export async function approveJobRequest(
  requestId: string,
): Promise<{ error?: string; jobId?: string }> {
  const me = await office();
  if (!me) return { error: "Only the office can review requests." };
  if (!guid.safeParse(requestId).success) return { error: "Not found." };
  const supabase = await createClient();
  const { data: r } = await supabase
    .from("job_requests")
    .select("*")
    .eq("id", requestId)
    .maybeSingle();
  if (!r || r.kind !== "new_job") return { error: "Not found." };
  if (r.status !== "submitted")
    return { error: "This request was already handled." };

  // Match colors to the picklists where the names agree; keep the rest as notes.
  const [{ data: brick }, { data: mortar }] = await Promise.all([
    r.brick_color
      ? supabase
          .from("brick_colors")
          .select("id")
          .ilike("name", r.brick_color)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    r.mortar_color
      ? supabase
          .from("mortar_colors")
          .select("id")
          .ilike("name", r.mortar_color)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);
  const notes = [
    `From builder request #${r.request_number}.`,
    r.trades.length && `Trades requested: ${r.trades.join(", ")}.`,
    r.brick_color && !brick && `Brick color requested: ${r.brick_color}.`,
    r.mortar_color && !mortar && `Mortar color requested: ${r.mortar_color}.`,
    r.stucco_colors && `Stucco colors: ${r.stucco_colors}.`,
    r.wanted_by && `Wanted by ${r.wanted_by}.`,
    r.message,
  ]
    .filter(Boolean)
    .join("\n");
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Chicago",
  }).format(new Date());

  const { data: job, error } = await supabase
    .from("jobs")
    .insert({
      builder_id: r.builder_id,
      construction_manager_id: r.construction_manager_id,
      house_number: r.house_number!,
      street: r.street!,
      subdivision: r.subdivision,
      area: r.area,
      plan_name: r.plan_name,
      plan_number: r.plan_number,
      elevation: r.elevation,
      lot_swing: r.lot_swing,
      stone_color: r.stone_color,
      brick_color_id: brick?.id ?? null,
      brick_mortar_color_id: mortar?.id ?? null,
      date_received: today,
      additional_notes: notes,
    })
    .select("id")
    .single();
  if (error || !job)
    return { error: "The job couldn't be created. Try again." };

  await supabase
    .from("job_requests")
    .update({
      status: "approved",
      job_id: job.id,
      response: "Job created — we'll confirm the schedule.",
    })
    .eq("id", requestId);
  await tellBuilder(
    requestId,
    `Job request accepted — ${r.house_number} ${r.street}`,
    `<p>Thanks — Leander 3T has set up <strong>${esc(`${r.house_number} ${r.street}`)}</strong>. You can follow it in the portal; we'll confirm the schedule there.</p>`,
  );
  refresh();
  revalidatePath("/jobs");
  return { jobId: job.id };
}

/** Decline a new-job request, or answer / close an update request. */
export async function respondToJobRequest(input: {
  id: string;
  decision: "declined" | "answered";
  response: string;
}): Promise<{ error?: string }> {
  const me = await office();
  if (!me) return { error: "Only the office can review requests." };
  const id = guid.safeParse(input.id);
  const text = reply.safeParse(input.response);
  if (
    !id.success ||
    !text.success ||
    !["declined", "answered"].includes(input.decision)
  )
    return { error: "Not found." };
  if (!text.data) return { error: "Write a reply for the builder." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("job_requests")
    .update({ status: input.decision, response: text.data })
    .eq("id", id.data)
    .eq("status", "submitted")
    .select("id, kind, house_number, street, jobs(property_address)");
  if (error || !data?.length)
    return { error: "This request was already handled." };
  const r = data[0];
  const what =
    r.kind === "new_job"
      ? `${r.house_number} ${r.street}`
      : (r.jobs?.property_address ?? "your home");
  await tellBuilder(
    id.data,
    `${input.decision === "declined" ? "Job request update" : "Reply from Leander 3T"} — ${what}`,
    `<p>Leander 3T replied about <strong>${esc(what)}</strong>:</p><p style="white-space:pre-wrap;border-left:3px solid #E4590F;padding-left:12px">${esc(text.data)}</p>`,
  );
  refresh();
  return {};
}
