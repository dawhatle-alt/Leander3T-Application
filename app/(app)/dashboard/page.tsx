import type { Metadata } from "next";
import { ComingSoon, PageHead, Stat } from "@/components/shell/page-bits";
import { firstName } from "@/lib/auth/roles";
import { requireProfile } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Dashboard — Leander 3T" };

const TZ = "America/Chicago";

function greeting(now: Date) {
  const hour = Number(
    new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      hour12: false,
      timeZone: TZ,
    }).format(now),
  );
  return hour < 12
    ? "Good Morning"
    : hour < 17
      ? "Good Afternoon"
      : "Good Evening";
}

export default async function DashboardPage() {
  const profile = await requireProfile();
  const supabase = await createClient();
  const now = new Date();

  // Counts respect row-level security: an employee sees only their jobs.
  const count = async (q: PromiseLike<{ count: number | null }>) =>
    (await q).count ?? 0;
  const [active, fresh, requests, completed] = await Promise.all([
    count(
      supabase
        .from("jobs")
        .select("id", { count: "exact", head: true })
        .eq("status", "in_progress"),
    ),
    count(
      supabase
        .from("jobs")
        .select("id", { count: "exact", head: true })
        .eq("status", "new"),
    ),
    count(
      supabase
        .from("info_requests")
        .select("id", { count: "exact", head: true })
        .neq("status", "done"),
    ),
    count(
      supabase
        .from("jobs")
        .select("id", { count: "exact", head: true })
        .eq("status", "completed"),
    ),
  ]);

  const date = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    timeZone: TZ,
  }).format(now);

  return (
    <>
      <PageHead
        title={`${greeting(now)}, ${firstName(profile.fullName, profile.email)}`}
        sub={`${date} — here's where your jobs stand.`}
      />
      <div className="mb-[34px] grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Active Jobs" value={active} note="In progress" />
        <Stat label="New Jobs" value={fresh} note="Not started" />
        <Stat label="Website Requests" value={requests} note="Open" />
        <Stat
          label="Homes Completed"
          value={completed.toLocaleString()}
          note="On record"
        />
      </div>
      <ComingSoon
        milestone="Dashboard · M7"
        what="Needs Attention, workflow shortcuts and the supervisor chart arrive with the order review queue. Jobs come next, in M4."
      />
    </>
  );
}
