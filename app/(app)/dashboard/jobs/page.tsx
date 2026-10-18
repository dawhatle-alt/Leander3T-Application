import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Donut,
  Trend,
  type TrendPoint,
} from "@/components/dashboard/job-charts";
import { PageHead, Panel, Stat } from "@/components/shell/page-bits";
import { requireProfile } from "@/lib/auth/session";
import {
  RANGES,
  rangeText as describeRange,
  resolveRange,
} from "@/lib/dashboard/range";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Job Dashboard — Leander 3T" };

// Replaces the Airtable "Job Information → Job Dashboard" interface page:
// job totals, active jobs by supervisor, jobs by builder, builder × status,
// and a received-vs-completed trend. Filtered by Date Received.

type Data = {
  totals: {
    total: number;
    active: number;
    new: number;
    in_progress: number;
    completed: number;
  };
  by_supervisor: { profile_id: string | null; name: string; n: number }[];
  by_builder: {
    builder_id: string | null;
    name: string;
    total: number;
    new: number;
    in_progress: number;
    completed: number;
  }[];
  trend: { bucket: string; received: number; completed: number }[];
  bucket: "week" | "month";
};

function days(from?: string, to?: string) {
  if (!from) return Infinity;
  const end = to ? Date.parse(to) : Date.now();
  return (end - Date.parse(from)) / 86_400_000;
}

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

function bucketLabel(d: string, unit: "week" | "month") {
  const [y, m, day] = d.split("-");
  return unit === "month"
    ? `${MONTHS[Number(m) - 1]} ’${y.slice(2)}`
    : `${m}/${day}`;
}

export default async function JobDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string; from?: string; to?: string }>;
}) {
  const profile = await requireProfile();
  if (profile.role !== "admin" && profile.role !== "supervisor")
    redirect("/dashboard");

  const sp = await searchParams;
  const { range, from, to } = resolveRange(sp);
  const bucket = days(from, to) <= 400 ? "week" : "month";

  const supabase = await createClient();
  const { data: raw, error } = await supabase.rpc("job_dashboard", {
    p_from: from,
    p_to: to,
    p_bucket: bucket,
  });
  if (error) console.error("job_dashboard", error);
  const data = raw as unknown as Data | null;

  const t = data?.totals ?? {
    total: 0,
    active: 0,
    new: 0,
    in_progress: 0,
    completed: 0,
  };
  const builders = data?.by_builder ?? [];
  const trend: TrendPoint[] = (data?.trend ?? []).map((p) => ({
    label: bucketLabel(p.bucket, data!.bucket),
    received: p.received,
    completed: p.completed,
  }));

  const rangeText = describeRange(from, to);

  return (
    <>
      <PageHead
        title="Job Dashboard"
        sub={`Jobs by date received · ${rangeText}`}
      />

      <div className="mb-7 flex flex-wrap items-center gap-2.5">
        {RANGES.map((r) => (
          <Link
            key={r.key}
            href={
              r.key === "year"
                ? "/dashboard/jobs"
                : `/dashboard/jobs?range=${r.key}`
            }
            className="fchip"
            aria-current={range === r.key}
          >
            {r.label}
          </Link>
        ))}
        <form
          action="/dashboard/jobs"
          className="flex flex-wrap items-center gap-2 sm:ml-auto"
        >
          <input type="hidden" name="range" value="custom" />
          <label className="sr-only" htmlFor="from">
            From
          </label>
          <input
            id="from"
            name="from"
            type="date"
            defaultValue={from ?? ""}
            className="h-[38px] rounded-md border-[1.5px] border-mortar-2 bg-paper px-2.5 font-mono text-[13px]"
          />
          <span className="text-ink-muted">to</span>
          <label className="sr-only" htmlFor="to">
            To
          </label>
          <input
            id="to"
            name="to"
            type="date"
            defaultValue={to ?? ""}
            className="h-[38px] rounded-md border-[1.5px] border-mortar-2 bg-paper px-2.5 font-mono text-[13px]"
          />
          <button
            type="submit"
            className="fchip"
            aria-current={range === "custom"}
          >
            Apply
          </button>
        </form>
      </div>

      {error && (
        <p className="mb-6 rounded-md border border-chalk/30 bg-[#c42b1f0d] px-4 py-3 text-[14px] text-chalk">
          The dashboard couldn&apos;t load. Refresh the page to try again.
        </p>
      )}

      <div className="mb-[30px] grid gap-5 sm:grid-cols-3">
        <Stat
          label="Total Jobs"
          value={t.total.toLocaleString()}
          note="Received in range"
        />
        <Stat
          label="Active Jobs"
          value={t.active.toLocaleString()}
          note={`${t.new} new · ${t.in_progress} in progress`}
        />
        <Stat
          label="Completed Jobs"
          value={t.completed.toLocaleString()}
          note={
            t.total
              ? `${Math.round((t.completed / t.total) * 100)}% of jobs in range`
              : "—"
          }
        />
      </div>

      <div className="mb-[30px] grid gap-6 lg:grid-cols-2">
        <Panel title="Active Jobs by Supervisor">
          <div className="px-6 py-6">
            <Donut
              unit="active"
              data={(data?.by_supervisor ?? []).map((s) => ({
                name: s.name,
                value: s.n,
                neutral: !s.profile_id,
              }))}
            />
          </div>
        </Panel>
        <Panel title="Jobs by Builder">
          <div className="px-6 py-6">
            <Donut
              unit="jobs"
              data={[...builders]
                .sort((a, b) => b.total - a.total)
                .map((b) => ({
                  name: b.name,
                  value: b.total,
                  neutral: !b.builder_id,
                }))}
            />
          </div>
        </Panel>
      </div>

      <Panel title="Builders by Status" className="mb-[30px]">
        <div className="overflow-x-auto">
          <table className="data-table min-w-[560px]">
            <thead>
              <tr>
                <th>Builder</th>
                <th className="text-right!">New</th>
                <th className="text-right!">In Progress</th>
                <th className="text-right!">Completed</th>
                <th className="text-right!">Total</th>
              </tr>
            </thead>
            <tbody>
              {builders.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-ink-muted">
                    No jobs in this range.
                  </td>
                </tr>
              ) : (
                builders.map((b) => (
                  <tr key={b.builder_id ?? "none"}>
                    <td className="font-semibold">
                      {b.builder_id ? (
                        <Link
                          href={`/jobs?q=${encodeURIComponent(b.name)}`}
                          className="hover:text-flame"
                        >
                          {b.name}
                        </Link>
                      ) : (
                        b.name
                      )}
                    </td>
                    <Num n={b.new} />
                    <Num n={b.in_progress} />
                    <Num n={b.completed} />
                    <Num n={b.total} strong />
                  </tr>
                ))
              )}
            </tbody>
            {builders.length > 0 && (
              <tfoot>
                <tr className="border-t-2 border-mortar bg-[#fbf8f1]">
                  <td className="px-5 py-[15px] font-mono text-[11px] tracking-[0.14em] text-ink-muted uppercase">
                    Total
                  </td>
                  <Num n={t.new} strong />
                  <Num n={t.in_progress} strong />
                  <Num n={t.completed} strong />
                  <Num n={t.total} strong />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </Panel>

      <Panel title={`Received vs Completed — by ${data?.bucket ?? bucket}`}>
        <div className="px-4 pt-5 pb-3 sm:px-6">
          <Trend data={trend} />
          <p className="mt-2 font-mono text-[11px] tracking-[0.08em] text-ink-muted uppercase">
            Received counts by date received · Completed counts by job completed
            date · both within the range
          </p>
        </div>
      </Panel>
    </>
  );
}

function Num({ n, strong }: { n: number; strong?: boolean }) {
  return (
    <td
      className={`px-5 py-[15px] text-right font-mono text-[14px] ${
        n === 0 ? "text-ink-muted/60" : strong ? "font-semibold" : ""
      }`}
    >
      {n.toLocaleString()}
    </td>
  );
}
