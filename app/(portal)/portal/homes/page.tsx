import type { Metadata } from "next";
import Link from "next/link";
import { Search } from "lucide-react";
import { HomeCard } from "@/components/portal/bits";
import { PreviewBar } from "@/components/portal/preview-bar";
import { portalContext } from "@/lib/portal/context";
import { loadHomes, type HomeStatus } from "@/lib/portal/data";

export const metadata: Metadata = { title: "Your Homes — Leander 3T" };

type SP = { status?: string; q?: string; page?: string; mine?: string };
const FILTERS: { key?: HomeStatus; label: string }[] = [
  { label: "All" },
  { key: "in_progress", label: "In Progress" },
  { key: "new", label: "Scheduled" },
  { key: "completed", label: "Completed" },
];

export default async function HomesPage({
  searchParams,
}: {
  searchParams: Promise<SP>;
}) {
  const ctx = await portalContext();
  const sp = await searchParams;
  const status = (["new", "in_progress", "completed"] as const).find(
    (s) => s === sp.status,
  );
  const q = (sp.q ?? "").slice(0, 80);
  const mine = sp.mine === "1" && !!ctx.cmId;
  const page = Math.max(1, Number(sp.page) || 1);
  const { homes, total, size } = await loadHomes({
    builderId: ctx.builderId,
    status,
    q: q || undefined,
    cmId: mine ? ctx.cmId : null,
    page,
  });
  const pages = Math.max(1, Math.ceil(total / size));
  const href = (patch: SP) => {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries({ ...sp, ...patch }))
      if (v) p.set(k, v);
    const s = p.toString();
    return s ? `/portal/homes?${s}` : "/portal/homes";
  };

  return (
    <>
      {ctx.preview && (
        <PreviewBar builders={ctx.builders} current={ctx.builderId} />
      )}
      <div className="mb-3 font-mono text-xs tracking-[0.1em] text-ink-muted uppercase">
        <Link href="/portal" className="font-medium text-flame">
          Portal
        </Link>{" "}
        / Homes
      </div>
      <h1 className="font-display text-[34px] leading-none font-bold uppercase md:text-[40px]">
        {ctx.builderName} Homes
      </h1>
      <p className="mt-2 mb-6 text-[15px] text-ink-muted">
        {total.toLocaleString()} {total === 1 ? "home" : "homes"}
        {mine ? " you manage" : ""}
        {q ? ` matching “${q}”` : ""}.
      </p>

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <form action="/portal/homes" className="relative min-w-[240px] flex-1">
          {status && <input type="hidden" name="status" value={status} />}
          {mine && <input type="hidden" name="mine" value="1" />}
          <Search
            className="absolute top-1/2 left-3.5 size-[18px] -translate-y-1/2 text-ink-muted"
            aria-hidden
          />
          <input
            type="search"
            name="q"
            defaultValue={q}
            placeholder="Search address, subdivision, plan…"
            aria-label="Search homes"
            className="w-full rounded-sm border-[1.5px] border-mortar-2 bg-paper py-3 pr-4 pl-11 text-[15px] focus:border-flame focus:outline-none"
          />
        </form>
        <nav aria-label="Filter homes" className="flex flex-wrap gap-2">
          {ctx.cmId && (
            <Link
              href={href({ mine: mine ? undefined : "1", page: undefined })}
              className="fchip"
              aria-current={mine}
            >
              My Homes
            </Link>
          )}
          {FILTERS.map((f) => (
            <Link
              key={f.label}
              href={href({ status: f.key, page: undefined })}
              className="fchip"
              aria-current={status === f.key}
            >
              {f.label}
            </Link>
          ))}
        </nav>
      </div>

      {homes.length ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {homes.map((j) => (
            <HomeCard key={j.id} j={j as never} />
          ))}
        </div>
      ) : (
        <p className="rounded-md border border-mortar bg-paper px-6 py-10 text-center text-ink-muted">
          No homes match.
        </p>
      )}

      {pages > 1 && (
        <nav
          aria-label="Pages"
          className="mt-8 flex items-center justify-center gap-3 font-mono text-[13px]"
        >
          {page > 1 && (
            <Link href={href({ page: String(page - 1) })} className="pg">
              ← Prev
            </Link>
          )}
          <span className="text-ink-muted">
            Page {page} of {pages}
          </span>
          {page < pages && (
            <Link href={href({ page: String(page + 1) })} className="pg">
              Next →
            </Link>
          )}
        </nav>
      )}
    </>
  );
}
