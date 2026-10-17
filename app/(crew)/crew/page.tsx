import type { Metadata } from "next";
import { ShieldCheck } from "lucide-react";
import {
  ComingSoon,
  PageHead,
  Panel,
  Scope,
} from "@/components/shell/page-bits";
import { requireProfile } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "My Crew — Leander 3T" };

const STATUS: Record<string, { label: string; className: string }> = {
  new: { label: "Scheduled", className: "bg-[#33638f1a] text-info" },
  in_progress: { label: "On site", className: "bg-[#f49f0a24] text-[#9a5d00]" },
  completed: { label: "Done", className: "bg-[#2f6b451a] text-success" },
};

const fmt = (d: string | null) =>
  d
    ? new Date(d + "T12:00:00").toLocaleDateString("en-US", {
        month: "2-digit",
        day: "2-digit",
      })
    : "—";

export default async function CrewHome() {
  const profile = await requireProfile();
  const supabase = await createClient();

  const [{ data: crews }, { data: jobs }] = await Promise.all([
    supabase
      .from("crews")
      .select("name")
      .eq("crew_manager_id", profile.id)
      .order("name"),
    // Row-level security returns only jobs assigned to this person's crews.
    supabase
      .from("jobs")
      .select(
        "id, property_address, subdivision, plan_name, elevation, status, brick_start_date, stone_start_date, stucco_start_date, builders(name)",
      )
      .neq("status", "completed")
      .order("status", { ascending: false })
      .order("brick_start_date", { ascending: true, nullsFirst: false })
      .limit(30),
  ]);

  const crewNames = crews?.map((c) => c.name).join(" & ") || "your crew";

  return (
    <>
      <PageHead
        title="My Crew’s Jobs"
        sub="Your crew’s jobs, and supply requests that go to the office for review."
      >
        <Scope>
          <ShieldCheck className="size-[13px]" strokeWidth={2.4} aria-hidden />
          Showing {crewNames} jobs only · no costs shown
        </Scope>
      </PageHead>

      <Panel title="Open Jobs" className="mb-6">
        {jobs && jobs.length > 0 ? (
          <ul className="divide-y divide-mortar">
            {jobs.map((j) => {
              const s = STATUS[j.status];
              const start =
                j.brick_start_date ?? j.stone_start_date ?? j.stucco_start_date;
              return (
                <li
                  key={j.id}
                  className="flex items-start justify-between gap-4 px-6 py-4"
                >
                  <div className="min-w-0">
                    <div className="font-bold">{j.property_address}</div>
                    <div className="mt-0.5 font-mono text-[11.5px] tracking-[0.08em] text-ink-muted uppercase">
                      {[
                        j.builders?.name,
                        j.subdivision,
                        [j.plan_name, j.elevation].filter(Boolean).join(" "),
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </div>
                    <div className="mt-1 font-mono text-[12px] text-ink-muted">
                      START {fmt(start)}
                    </div>
                  </div>
                  <span
                    className={`inline-flex flex-none items-center gap-[7px] rounded-full px-3 py-[5px] text-[12.5px] font-bold before:size-[7px] before:rounded-full before:bg-current ${s?.className ?? ""}`}
                  >
                    {s?.label ?? j.status}
                  </span>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="px-6 py-8 text-ink-muted">
            No open jobs for {crewNames} right now.
          </p>
        )}
      </Panel>

      <ComingSoon
        milestone="Request materials · M5"
        what="Order sand, mortar, lintels, rock and stucco supply for these jobs from your phone. Requests go to the office for review."
      />
    </>
  );
}
