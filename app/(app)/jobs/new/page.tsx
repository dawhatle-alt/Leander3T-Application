import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { JobForm } from "@/components/jobs/job-form";
import { PageHead } from "@/components/shell/page-bits";
import { canCreateJobs } from "@/lib/jobs/access";
import { loadJobFormOptions } from "@/lib/jobs/options";
import { requireProfile } from "@/lib/auth/session";
import { EMPTY_JOB } from "@/lib/validation/job";

export const metadata: Metadata = { title: "New Job — Leander 3T" };

export default async function NewJobPage() {
  const me = await requireProfile();
  if (!canCreateJobs(me)) redirect("/jobs");
  const options = await loadJobFormOptions(me.role === "admin");
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Chicago",
  }).format(new Date());

  return (
    <>
      <PageHead
        title="New Job"
        sub="One house at one address. Fill in what you know; the rest can come later."
      />
      <JobForm
        jobId={null}
        defaults={{ ...EMPTY_JOB, date_received: today }}
        options={options}
        isAdmin={me.role === "admin"}
      />
    </>
  );
}
