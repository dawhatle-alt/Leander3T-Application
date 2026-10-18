"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireProfile } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

const input = z.object({
  jobId: z.guid(),
  status: z.enum(["new", "in_progress", "completed"]),
});

export type MoveResult = { ok: true } | { error: string };

// Job Board drag-and-drop. Row-level security decides who may change the job
// (Administration, or a supervisor on that job); the completion trigger stamps
// the completed date when a job moves to Completed.
export async function setJobStatus(
  jobId: string,
  status: string,
): Promise<MoveResult> {
  const me = await requireProfile();
  const parsed = input.safeParse({ jobId, status });
  if (!parsed.success) return { error: "That move isn't allowed." };
  if (me.role !== "admin" && me.role !== "supervisor")
    return {
      error: "Only Administration and the job's supervisor can move jobs.",
    };

  const supabase = await createClient();
  const { data: job } = await supabase
    .from("jobs")
    .select("id, status, completion_percent")
    .eq("id", parsed.data.jobId)
    .maybeSingle();
  if (!job) return { error: "Job not found." };
  if (job.status === parsed.data.status) return { ok: true };

  // A job at 100% is completed by the database; moving it back would just
  // bounce. Ask for the percent to be lowered first.
  if (
    parsed.data.status !== "completed" &&
    Number(job.completion_percent) >= 100
  )
    return {
      error:
        "This job is marked 100% complete. Lower its completion percent on the job page to reopen it.",
    };

  const { data, error } = await supabase
    .from("jobs")
    .update(
      parsed.data.status === "completed"
        ? { status: "completed" }
        : { status: parsed.data.status, job_completed_date: null },
    )
    .eq("id", job.id)
    .select("id");
  if (error || !data?.length)
    return {
      error: "You can only move jobs you supervise.",
    };

  for (const p of [
    "/dashboard",
    "/dashboard/board",
    "/dashboard/jobs",
    "/jobs",
    `/jobs/${job.id}`,
  ])
    revalidatePath(p);
  return { ok: true };
}
