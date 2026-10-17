import "server-only";
import type { SessionProfile } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

// Mirrors private.can_write_job for deciding which buttons to show. The
// database enforces the real rule; this only avoids offering an action that
// would be refused.
export async function canEditJob(me: SessionProfile, jobId: string) {
  if (me.role === "admin") return true;
  if (me.role !== "supervisor") return false;
  const supabase = await createClient();
  const { count } = await supabase
    .from("job_assignments")
    .select("job_id", { count: "exact", head: true })
    .eq("job_id", jobId)
    .eq("profile_id", me.id)
    .eq("kind", "supervisor");
  return (count ?? 0) > 0;
}

export const canCreateJobs = (me: SessionProfile) =>
  me.role === "admin" || me.role === "supervisor";
