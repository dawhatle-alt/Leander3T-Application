import type { Metadata } from "next";
import Link from "next/link";
import { FormList } from "@/components/order-forms/form-list";
import {
  ComingSoon,
  PageHead,
  Panel,
  Stat,
} from "@/components/shell/page-bits";
import { loadForms } from "@/lib/order-forms/data";
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
  const office = profile.role === "admin" || profile.role === "supervisor";
  const [active, fresh, requests, completed, review] = await Promise.all([
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
    office ? loadForms({ status: "pending_review" }) : Promise.resolve([]),
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
        {office ? (
          <Stat
            label="Forms to Review"
            value={review.length}
            note={`${requests} website ${requests === 1 ? "request" : "requests"} open`}
          />
        ) : (
          <Stat label="Website Requests" value={requests} note="Open" />
        )}
        <Stat
          label="Homes Completed"
          value={completed.toLocaleString()}
          note="On record"
        />
      </div>
      {office && (
        <Panel
          title="Needs Attention"
          className="mb-[34px]"
          action={
            <Link
              href="/orders/forms"
              className="font-mono text-[12px] font-semibold tracking-[0.1em] text-flame uppercase"
            >
              All order forms →
            </Link>
          }
        >
          <FormList
            forms={review.slice(0, 6)}
            canReview
            empty="No order forms waiting for review."
          />
          {review.length > 6 && (
            <p className="border-t border-mortar px-6 py-3 text-[13.5px] text-ink-muted">
              {review.length - 6} more in{" "}
              <Link href="/orders/forms" className="font-bold text-flame">
                Order Forms
              </Link>
              .
            </p>
          )}
        </Panel>
      )}
      <ComingSoon
        milestone="Dashboard · M7"
        what="Workflow shortcuts and the jobs-by-supervisor chart arrive with the admin screens."
      />
    </>
  );
}
