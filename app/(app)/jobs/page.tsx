import type { Metadata } from "next";
import Link from "next/link";
import { Columns3, List, Search } from "lucide-react";
import { PageHead } from "@/components/shell/page-bits";
import { Button } from "@/components/ui/button";
import { canCreateJobs } from "@/lib/jobs/access";
import {
  JOB_STATUSES,
  STATUS_BADGE,
  STATUS_LABEL,
  num,
  planLine,
  tradeSummary,
  type JobStatus,
} from "@/lib/jobs/format";
import { requireProfile } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Jobs — Leander 3T" };

const PAGE_SIZE = 25;
const BOARD_LIMIT = 60;

type SP = Record<string, string | undefined>;

// Keep only what's safe inside a PostgREST or() filter.
function cleanQuery(q: string | undefined) {
  return (q ?? "")
    .replace(/[,()*%\\]/g, " ")
    .trim()
    .slice(0, 80);
}

function href(sp: SP, patch: SP) {
  const next = new URLSearchParams();
  for (const [k, v] of Object.entries({ ...sp, ...patch })) {
    if (v) next.set(k, v);
  }
  const s = next.toString();
  return s ? `/jobs?${s}` : "/jobs";
}

export default async function JobsPage({
  searchParams,
}: {
  searchParams: Promise<SP>;
}) {
  const me = await requireProfile();
  const sp = await searchParams;
  const q = cleanQuery(sp.q);
  const status = JOB_STATUSES.includes(sp.status as JobStatus)
    ? (sp.status as JobStatus)
    : undefined;
  const view = sp.view === "board" ? "board" : "list";
  const page = Math.max(1, Number.parseInt(sp.page ?? "1", 10) || 1);

  const supabase = await createClient();

  // Builders whose name matches the search, so "pulte" finds Pulte's jobs.
  let builderIds: string[] = [];
  if (q) {
    const { data } = await supabase
      .from("builders")
      .select("id")
      .ilike("name", `%${q}%`);
    builderIds = (data ?? []).map((b) => b.id);
  }

  // Row-level security limits this to the jobs this person may see.
  let query = supabase
    .from("jobs")
    .select(
      "id, property_address, plan_name, elevation, subdivision, status, completion_percent, brick_sqft, stone_sqft, stucco_sqft, builders(name)",
      { count: "exact" },
    );
  if (q) {
    const like = `%${q}%`;
    const ors = [
      `property_address.ilike.${like}`,
      `subdivision.ilike.${like}`,
      `plan_name.ilike.${like}`,
      `plan_number.ilike.${like}`,
      `area.ilike.${like}`,
    ];
    if (builderIds.length) ors.push(`builder_id.in.(${builderIds.join(",")})`);
    query = query.or(ors.join(","));
  }
  if (status && view === "list") query = query.eq("status", status);
  query = query
    .order("status", { ascending: true })
    .order("subdivision", { ascending: true, nullsFirst: false })
    .order("property_address", { ascending: true });

  const from = (page - 1) * PAGE_SIZE;
  const { data: jobs, count } =
    view === "list"
      ? await query.range(from, from + PAGE_SIZE - 1)
      : await query.limit(BOARD_LIMIT * 3);

  const total = count ?? 0;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <>
      <PageHead
        title="Jobs"
        sub={`${total.toLocaleString()} ${status ? STATUS_LABEL[status].toLowerCase() + " " : ""}job${total === 1 ? "" : "s"}${q ? ` matching “${q}”` : ""}.`}
      >
        {canCreateJobs(me) && (
          <Button asChild variant="fire" size="sm">
            <Link href="/jobs/new">+ New Job</Link>
          </Button>
        )}
      </PageHead>

      <div className="mb-[22px] flex flex-wrap items-center gap-3.5">
        <form action="/jobs" className="relative min-w-[260px] flex-1">
          {status && <input type="hidden" name="status" value={status} />}
          {view === "board" && (
            <input type="hidden" name="view" value="board" />
          )}
          <Search
            className="absolute top-1/2 left-3.5 size-[18px] -translate-y-1/2 text-ink-muted"
            aria-hidden
          />
          <input
            type="search"
            name="q"
            defaultValue={q}
            placeholder="Search address, builder, subdivision, plan…"
            aria-label="Search jobs"
            className="w-full rounded-sm border-[1.5px] border-mortar-2 bg-paper py-[13px] pr-4 pl-11 text-[15px] focus:border-flame focus:outline-none"
          />
        </form>
        {view === "list" && (
          <nav aria-label="Filter by status" className="flex flex-wrap gap-2">
            <Link
              href={href(sp, { status: undefined, page: undefined })}
              className="fchip"
              aria-current={!status}
            >
              All
            </Link>
            {JOB_STATUSES.map((s) => (
              <Link
                key={s}
                href={href(sp, { status: s, page: undefined })}
                className="fchip"
                aria-current={status === s}
              >
                {STATUS_LABEL[s]}
              </Link>
            ))}
          </nav>
        )}
        <div className="ml-auto flex gap-1 rounded-full border-[1.5px] border-mortar-2 bg-paper p-1">
          <ViewLink
            active={view === "list"}
            href={href(sp, { view: undefined })}
          >
            <List className="size-4" aria-hidden /> List
          </ViewLink>
          <ViewLink
            active={view === "board"}
            href={href(sp, {
              view: "board",
              page: undefined,
              status: undefined,
            })}
          >
            <Columns3 className="size-4" aria-hidden /> Board
          </ViewLink>
        </div>
      </div>

      {view === "list" ? (
        <div className="rounded-md border border-mortar bg-paper shadow-card">
          {/* Phones: one card per job. */}
          <ul className="divide-y divide-mortar md:hidden">
            {(jobs ?? []).map((j) => (
              <li key={j.id}>
                <Link
                  href={`/jobs/${j.id}`}
                  className="flex items-start justify-between gap-3 px-4 py-3.5"
                >
                  <div className="min-w-0">
                    <div className="font-bold">{j.property_address}</div>
                    <div className="mt-0.5 font-mono text-[11px] tracking-[0.08em] text-ink-muted uppercase">
                      {[j.builders?.name, j.subdivision]
                        .filter(Boolean)
                        .join(" · ")}
                    </div>
                    <div className="mt-1 font-mono text-[12px] whitespace-nowrap text-ink-muted">
                      {tradeSummary(j)} · {num(j.completion_percent)}%
                    </div>
                  </div>
                  <span className={cn("badge", STATUS_BADGE[j.status])}>
                    {STATUS_LABEL[j.status]}
                  </span>
                </Link>
              </li>
            ))}
            {jobs?.length === 0 && (
              <li className="px-4 py-10 text-center text-ink-muted">
                No jobs match. Try a different search or filter.
              </li>
            )}
          </ul>
          <div className="hidden overflow-x-auto md:block">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Property</th>
                  <th>Builder</th>
                  <th>Subdivision</th>
                  <th>Trades</th>
                  <th>Status</th>
                  <th>Progress</th>
                  <th>
                    <span className="sr-only">Open</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {(jobs ?? []).map((j) => (
                  <tr key={j.id}>
                    <td>
                      <Link
                        href={`/jobs/${j.id}`}
                        className="text-[15px] font-bold"
                      >
                        {j.property_address}
                      </Link>
                      {planLine(j) && (
                        <small className="mt-0.5 block text-[12.5px] text-ink-muted">
                          {planLine(j)}
                        </small>
                      )}
                    </td>
                    <td>
                      {j.builders?.name && (
                        <span className="builder-tag">{j.builders.name}</span>
                      )}
                    </td>
                    <td>{j.subdivision ?? "—"}</td>
                    <td className="font-mono text-[13px] whitespace-nowrap">
                      {tradeSummary(j)}
                    </td>
                    <td>
                      <span className={cn("badge", STATUS_BADGE[j.status])}>
                        {STATUS_LABEL[j.status]}
                      </span>
                    </td>
                    <td className="font-mono text-[13px]">
                      {num(j.completion_percent)}%
                    </td>
                    <td>
                      <Button asChild variant="dark" size="sm">
                        <Link href={`/jobs/${j.id}`}>Open</Link>
                      </Button>
                    </td>
                  </tr>
                ))}
                {jobs?.length === 0 && (
                  <tr>
                    <td
                      colSpan={7}
                      className="py-10 text-center text-ink-muted"
                    >
                      No jobs match. Try a different search or filter.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {total > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 text-[13.5px] text-ink-muted">
              <span>
                Showing {from + 1}–{Math.min(from + PAGE_SIZE, total)} of{" "}
                {total.toLocaleString()} jobs
              </span>
              {pages > 1 && (
                <nav aria-label="Pages" className="flex gap-2">
                  {pageList(page, pages).map((p, i) =>
                    p === "…" ? (
                      <span key={`gap-${i}`} className="pg border-transparent">
                        …
                      </span>
                    ) : (
                      <Link
                        key={p}
                        href={href(sp, {
                          page: p === 1 ? undefined : String(p),
                        })}
                        className="pg"
                        aria-current={p === page ? "page" : undefined}
                      >
                        {p}
                      </Link>
                    ),
                  )}
                </nav>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="grid gap-5 lg:grid-cols-3">
          {JOB_STATUSES.map((s) => {
            const col = (jobs ?? []).filter((j) => j.status === s);
            return (
              <section
                key={s}
                className="rounded-md border border-mortar bg-[#fbf8f1]"
                aria-label={STATUS_LABEL[s]}
              >
                <header className="flex items-center justify-between border-b border-mortar px-4 py-3">
                  <span className={cn("badge", STATUS_BADGE[s])}>
                    {STATUS_LABEL[s]}
                  </span>
                  <span className="count-label">{col.length} jobs</span>
                </header>
                <ul className="grid gap-2.5 p-3">
                  {col.slice(0, BOARD_LIMIT).map((j) => (
                    <li key={j.id}>
                      <Link
                        href={`/jobs/${j.id}`}
                        className="block rounded-md border border-mortar bg-paper px-4 py-3 shadow-card transition-colors hover:border-flame"
                      >
                        <div className="font-bold">{j.property_address}</div>
                        <div className="mt-0.5 font-mono text-[11px] tracking-[0.08em] text-ink-muted uppercase">
                          {[j.builders?.name, j.subdivision]
                            .filter(Boolean)
                            .join(" · ")}
                        </div>
                        <div className="mt-2 flex items-center justify-between gap-3 font-mono text-[12px] text-ink-muted">
                          <span>{tradeSummary(j)}</span>
                          <span>{num(j.completion_percent)}%</span>
                        </div>
                        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-limestone">
                          <div
                            className="h-full rounded-full bg-fire"
                            style={{
                              width: `${Number(j.completion_percent) || 0}%`,
                            }}
                          />
                        </div>
                      </Link>
                    </li>
                  ))}
                  {col.length === 0 && (
                    <li className="px-2 py-6 text-center text-[14px] text-ink-muted">
                      None
                    </li>
                  )}
                </ul>
              </section>
            );
          })}
        </div>
      )}
    </>
  );
}

function ViewLink({
  active,
  href,
  children,
}: {
  active: boolean;
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-current={active}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[13.5px] font-semibold text-ink-muted",
        active && "bg-charcoal text-limestone",
      )}
    >
      {children}
    </Link>
  );
}

function pageList(page: number, pages: number): (number | "…")[] {
  const wanted = new Set([1, pages, page - 1, page, page + 1]);
  const out: (number | "…")[] = [];
  for (let p = 1; p <= pages; p++) {
    if (wanted.has(p)) out.push(p);
    else if (out[out.length - 1] !== "…") out.push("…");
  }
  return out;
}
