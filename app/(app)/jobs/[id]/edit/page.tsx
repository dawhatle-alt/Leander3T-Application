import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { JobForm } from "@/components/jobs/job-form";
import { PageHead } from "@/components/shell/page-bits";
import { canEditJob } from "@/lib/jobs/access";
import { loadJobFormOptions } from "@/lib/jobs/options";
import { requireProfile } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { jobToForm } from "@/lib/validation/job";

export const metadata: Metadata = { title: "Edit Job — Leander 3T" };

export default async function EditJobPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const me = await requireProfile();
  if (!(await canEditJob(me, id))) redirect(`/jobs/${id}`);

  const supabase = await createClient();
  const [{ data: job }, options] = await Promise.all([
    supabase
      .from("jobs")
      .select("*, job_assignments(profile_id, kind)")
      .eq("id", id)
      .maybeSingle(),
    loadJobFormOptions(me.role === "admin"),
  ]);
  if (!job) notFound();

  const { job_assignments, ...row } = job;
  const defaults = jobToForm(row, {
    supervisor_ids: job_assignments
      .filter((a) => a.kind === "supervisor")
      .map((a) => a.profile_id),
    employee_ids: job_assignments
      .filter((a) => a.kind === "employee")
      .map((a) => a.profile_id),
  });

  return (
    <>
      <div className="mb-3 flex items-center gap-2.5 font-mono text-xs tracking-[0.1em] text-ink-muted uppercase">
        <Link href="/jobs" className="font-medium text-flame">
          Jobs
        </Link>
        <span>/</span>
        <Link href={`/jobs/${id}`} className="font-medium text-flame">
          {job.property_address}
        </Link>
        <span>/</span>
        <span>Edit</span>
      </div>
      <PageHead title={`Edit ${job.property_address}`} />
      <JobForm
        jobId={id}
        defaults={defaults}
        options={options}
        isAdmin={me.role === "admin"}
      />
    </>
  );
}
