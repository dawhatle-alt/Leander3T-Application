import type { Metadata } from "next";
import Link from "next/link";
import {
  JobBoard,
  type BoardCard,
  type BoardStatus,
} from "@/components/dashboard/job-board";
import { PageHead } from "@/components/shell/page-bits";
import { requireProfile } from "@/lib/auth/session";
import {
  RANGES,
  daysBefore,
  rangeText,
  resolveRange,
  todayCentral,
} from "@/lib/dashboard/range";
import { tradeSummary } from "@/lib/jobs/format";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Job Board — Leander 3T" };

// Kanban of jobs by status. New and In Progress show every open job; the
// Completed column shows the last 30 days. Admins and each job's supervisor
// can drag cards between columns.

const COMPLETED_DAYS = 30;
const LIMIT = 1000;
const TRADES = ["brick", "stone", "stucco"] as const;
type TradeKey = (typeof TRADES)[number];

const COLS =
  "id, status, property_address, subdivision, plan_name, elevation, completion_percent, brick_sqft, stone_sqft, stucco_sqft, date_received, job_completed_date, builders(name), job_assignments(kind, profile_id, profiles(full_name))";

type SP = {
  range?: string;
  from?: string;
  to?: string;
  builder?: string;
  supervisor?: string;
  trade?: string;
};

const GUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function JobBoardPage({
  searchParams,
}: {
  searchParams: Promise<SP>;
}) {
  const me = await requireProfile();
  const sp = await searchParams;
  const { range, from, to } = resolveRange(sp, "all");
  const builder = sp.builder && GUID.test(sp.builder) ? sp.builder : undefined;
  const supervisor =
    sp.supervisor && GUID.test(sp.supervisor) ? sp.supervisor : undefined;
  const trade = TRADES.includes(sp.trade as TradeKey)
    ? (sp.trade as TradeKey)
    : undefined;
  const since = daysBefore(todayCentral(), COMPLETED_DAYS);

  const supabase = await createClient();

  // Same filters for both queries; row-level security limits what each
  // person sees.
  const query = (open: boolean) => {
    let q = supabase
      .from("jobs")
      .select(
        (supervisor
          ? `${COLS}, sup:job_assignments!inner(profile_id, kind)`
          : COLS) as typeof COLS,
      );
    if (open) q = q.in("status", ["new", "in_progress"]);
    else q = q.eq("status", "completed").gte("job_completed_date", since);
    if (from) q = q.gte("date_received", from);
    if (to) q = q.lte("date_received", to);
    if (builder) q = q.eq("builder_id", builder);
    if (trade) q = q.gt(`${trade}_sqft`, 0);
    if (supervisor)
      q = q
        .eq("sup.profile_id" as "id", supervisor)
        .eq("sup.kind" as "id", "supervisor");
    return open
      ? q
          .order("date_received", { ascending: true, nullsFirst: false })
          .order("property_address")
          .limit(LIMIT)
      : q
          .order("job_completed_date", { ascending: false })
          .order("property_address")
          .limit(LIMIT);
  };

  const [open, done, { data: builders }, { data: supervisors }] =
    await Promise.all([
      query(true),
      query(false),
      supabase.from("builders").select("id, name, active").order("name"),
      supabase
        .from("profiles")
        .select("id, full_name")
        .in("role", ["admin", "supervisor"])
        .eq("active", true)
        .order("full_name"),
    ]);
  if (open.error) console.error("job board", open.error);
  if (done.error) console.error("job board", done.error);

  const rows = [...(open.data ?? []), ...(done.data ?? [])];
  const cards: BoardCard[] = rows.map((j) => {
    const sups = (j.job_assignments ?? []).filter(
      (a) => a.kind === "supervisor",
    );
    return {
      id: j.id,
      status: j.status as BoardStatus,
      address: j.property_address ?? "No address",
      builder: j.builders?.name ?? null,
      subdivision: j.subdivision,
      plan:
        [j.plan_name, j.elevation && `Elev ${j.elevation}`]
          .filter(Boolean)
          .join(" · ") || null,
      trades: tradeSummary(j),
      percent: Number(j.completion_percent) || 0,
      supervisor:
        sups
          .map((a) => a.profiles?.full_name)
          .filter(Boolean)
          .join(", ") || null,
      received: j.date_received,
      completed: j.job_completed_date,
      canMove:
        me.role === "admin" ||
        (me.role === "supervisor" && sups.some((a) => a.profile_id === me.id)),
    };
  });

  const params = (patch: Partial<SP>) => {
    const next = new URLSearchParams();
    const merged = { range, from, to, builder, supervisor, trade, ...patch };
    if (merged.range === "custom") {
      next.set("range", "custom");
      if (merged.from) next.set("from", merged.from);
      if (merged.to) next.set("to", merged.to);
    } else if (merged.range && merged.range !== "all")
      next.set("range", merged.range);
    for (const k of ["builder", "supervisor", "trade"] as const)
      if (merged[k]) next.set(k, merged[k]!);
    const s = next.toString();
    return s ? `/dashboard/board?${s}` : "/dashboard/board";
  };

  const filtered = Boolean(builder || supervisor || trade || range !== "all");
  const canMoveAny = me.role === "admin" || me.role === "supervisor";
  const selectCls =
    "h-[38px] rounded-md border-[1.5px] border-mortar-2 bg-paper px-2.5 text-[13.5px] font-semibold";
  const builderName = builders?.find((b) => b.id === builder)?.name;

  return (
    <>
      <PageHead
        title="Job Board"
        sub={
          <>
            {canMoveAny
              ? "Drag a card to change its status. "
              : "Click a card to open the job. "}
            Jobs by date received · {rangeText(from, to)}
          </>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2.5">
        {RANGES.map((r) => (
          <Link
            key={r.key}
            href={params({ range: r.key, from: undefined, to: undefined })}
            className="fchip"
            aria-current={range === r.key}
          >
            {r.label}
          </Link>
        ))}
      </div>

      <form
        action="/dashboard/board"
        className="mb-6 flex flex-wrap items-end gap-2.5"
      >
        <Field label="Builder">
          <select
            name="builder"
            defaultValue={builder ?? ""}
            className={selectCls}
          >
            <option value="">All builders</option>
            {(builders ?? []).map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
                {b.active ? "" : " (off)"}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Supervisor">
          <select
            name="supervisor"
            defaultValue={supervisor ?? ""}
            className={selectCls}
          >
            <option value="">All supervisors</option>
            {(supervisors ?? []).map((p) => (
              <option key={p.id} value={p.id}>
                {p.full_name ?? "Unnamed"}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Trade">
          <select name="trade" defaultValue={trade ?? ""} className={selectCls}>
            <option value="">All trades</option>
            <option value="brick">Brick</option>
            <option value="stone">Stone</option>
            <option value="stucco">Stucco</option>
          </select>
        </Field>
        <Field label="Received from">
          <input
            name="from"
            type="date"
            defaultValue={range === "custom" ? (from ?? "") : ""}
            className={`${selectCls} font-mono font-normal`}
          />
        </Field>
        <Field label="to">
          <input
            name="to"
            type="date"
            defaultValue={range === "custom" ? (to ?? "") : ""}
            className={`${selectCls} font-mono font-normal`}
          />
        </Field>
        {range !== "custom" && range !== "all" && (
          <input type="hidden" name="range" value={range} />
        )}
        <button type="submit" className="fchip h-[38px]">
          Apply
        </button>
        {filtered && (
          <Link
            href="/dashboard/board"
            className="h-[38px] px-2 py-2 text-[13.5px] font-bold text-flame"
          >
            Clear filters
          </Link>
        )}
      </form>

      {(open.error || done.error) && (
        <p className="mb-6 rounded-md border border-chalk/30 bg-[#c42b1f0d] px-4 py-3 text-[14px] text-chalk">
          The board couldn&apos;t load. Refresh the page to try again.
        </p>
      )}
      {(open.data?.length ?? 0) >= LIMIT && (
        <p className="mb-4 text-[13.5px] text-ink-muted">
          Showing the first {LIMIT.toLocaleString()} open jobs — narrow the
          filters to see the rest.
        </p>
      )}

      <JobBoard
        // Remount when the filters change so the board starts from the server.
        key={params({})}
        initial={cards}
        completedNote={`Last ${COMPLETED_DAYS} days`}
        completedHref={`/jobs?status=completed${
          builderName ? `&q=${encodeURIComponent(builderName)}` : ""
        }`}
      />
    </>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="grid gap-1">
      <span className="font-mono text-[10.5px] tracking-[0.12em] text-ink-muted uppercase">
        {label}
      </span>
      {children}
    </label>
  );
}
