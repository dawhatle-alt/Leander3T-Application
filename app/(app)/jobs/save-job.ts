"use server";

import { revalidatePath } from "next/cache";
import { getSessionProfile } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { jobSchema, type JobFormInput } from "@/lib/validation/job";

export type SaveJobResult = {
  error?: string;
  fieldErrors?: Record<string, string>;
  id?: string;
};

// Creates or updates a job as the signed-in person. Row-level security decides
// whether they may: admins and supervisors create; admins and the job's
// supervisors edit. Triggers stamp the completed date and move stone dates.
export async function saveJob(
  jobId: string | null,
  input: JobFormInput,
): Promise<SaveJobResult> {
  const me = await getSessionProfile();
  if (!me) return { error: "Your session has ended. Sign in again." };

  const parsed = jobSchema.safeParse(input);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0]);
      fieldErrors[key] ??= issue.message;
    }
    return { error: "Check the highlighted fields.", fieldErrors };
  }

  const { supervisor_ids, employee_ids, ...row } = parsed.data;
  const supabase = await createClient();

  // A construction manager must belong to the chosen builder.
  if (row.construction_manager_id) {
    const { data: cm } = await supabase
      .from("construction_managers")
      .select("builder_id")
      .eq("id", row.construction_manager_id)
      .maybeSingle();
    if (!cm || cm.builder_id !== row.builder_id) {
      return {
        error: "Check the highlighted fields.",
        fieldErrors: {
          construction_manager_id: "Pick a CM who works for this builder.",
        },
      };
    }
  }

  const completion = row.completion_percent ?? 0;
  const values = { ...row, completion_percent: completion };

  let id = jobId;
  if (id) {
    const { data, error } = await supabase
      .from("jobs")
      .update(values)
      .eq("id", id)
      .select("id");
    if (error || !data?.length) {
      return {
        error: error ? friendly(error.code) : "You can't edit this job.",
      };
    }
  } else {
    const { data, error } = await supabase
      .from("jobs")
      .insert(values)
      .select("id")
      .single();
    if (error || !data) return { error: friendly(error?.code) };
    id = data.id;
  }

  if (me.role === "admin") {
    const res = await syncAssignments(id, supervisor_ids, employee_ids);
    if (res) return { error: res, id };
  }

  revalidatePath("/jobs");
  revalidatePath(`/jobs/${id}`);
  return { id };
}

// Admins choose who supervises and works the job. Only active supervisors and
// employees are touched, so history for people who have left is kept.
async function syncAssignments(
  jobId: string,
  supervisorIds: string[],
  employeeIds: string[],
) {
  const supabase = await createClient();
  const { data: people } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("active", true)
    .in("role", ["supervisor", "employee"]);
  const activeSup = new Set(
    (people ?? []).filter((p) => p.role === "supervisor").map((p) => p.id),
  );
  const activeEmp = new Set(
    (people ?? []).filter((p) => p.role === "employee").map((p) => p.id),
  );

  const want = [
    ...supervisorIds
      .filter((p) => activeSup.has(p))
      .map((p) => ({ profile_id: p, kind: "supervisor" as const })),
    ...employeeIds
      .filter((p) => activeEmp.has(p))
      .map((p) => ({ profile_id: p, kind: "employee" as const })),
  ];

  const { data: current } = await supabase
    .from("job_assignments")
    .select("profile_id, kind")
    .eq("job_id", jobId);
  const key = (a: { profile_id: string; kind: string }) =>
    `${a.kind}:${a.profile_id}`;
  const wantKeys = new Set(want.map(key));
  const currentKeys = new Set((current ?? []).map(key));

  const remove = (current ?? []).filter(
    (a) =>
      !wantKeys.has(key(a)) &&
      (a.kind === "supervisor"
        ? activeSup.has(a.profile_id)
        : activeEmp.has(a.profile_id)),
  );
  const add = want.filter((a) => !currentKeys.has(key(a)));

  for (const r of remove) {
    const { error } = await supabase
      .from("job_assignments")
      .delete()
      .eq("job_id", jobId)
      .eq("profile_id", r.profile_id)
      .eq("kind", r.kind);
    if (error)
      return "The job was saved, but the team on it couldn't be updated.";
  }
  if (add.length) {
    const { error } = await supabase
      .from("job_assignments")
      .insert(add.map((a) => ({ ...a, job_id: jobId })));
    if (error)
      return "The job was saved, but the team on it couldn't be updated.";
  }
  return null;
}

function friendly(code: string | undefined) {
  switch (code) {
    case "42501":
      return "You don't have permission to change this job.";
    case "23503":
      return "One of the picked items no longer exists. Reload and try again.";
    case "23514":
      return "A value is out of range. Percentages must be 0 to 100.";
    default:
      return "The job couldn't be saved. Try again.";
  }
}
