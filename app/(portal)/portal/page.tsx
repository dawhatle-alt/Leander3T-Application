import type { Metadata } from "next";
import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import {
  Chips,
  HomeCard,
  SecLabel,
  STATUS_LABEL,
  TradeRows,
} from "@/components/portal/bits";
import { PreviewBar } from "@/components/portal/preview-bar";
import { Button } from "@/components/ui/button";
import { Scope, Stat } from "@/components/shell/page-bits";
import { firstName, initials } from "@/lib/auth/roles";
import { portalContext } from "@/lib/portal/context";
import {
  homeMeta,
  loadContacts,
  loadFeed,
  loadHomePhotos,
  loadHomes,
  loadStats,
  md,
  specChips,
  tradeProgress,
} from "@/lib/portal/data";

export const metadata: Metadata = { title: "Builder Portal — Leander 3T" };

const OFFICE_PHONE = "(512) 260-2577";

export default async function PortalHome() {
  const ctx = await portalContext();
  const b = ctx.builderId;
  const [stats, active, feed, contacts] = await Promise.all([
    loadStats(b),
    loadHomes({
      builderId: b,
      status: "in_progress",
      pageSize: 7,
      cmId: ctx.cmId,
    }),
    loadFeed(b),
    loadContacts(b),
  ]);
  // A CM with no active homes of their own still sees the company's.
  const list = active.homes.length
    ? active
    : await loadHomes({ builderId: b, status: "in_progress", pageSize: 7 });
  const featured = list.homes[0];
  const photos = featured ? await loadHomePhotos(featured.id, 2) : [];
  const others = list.homes.slice(1, 7);

  const onSiteNote =
    (["brick", "stone", "stucco"] as const)
      .filter((t) => stats.onSite[t])
      .map((t) => `${stats.onSite[t]} ${t}`)
      .join(" · ") || "No crews on site today";

  return (
    <>
      {ctx.preview && <PreviewBar builders={ctx.builders} current={b} />}
      <div className="mb-7 flex flex-wrap items-end justify-between gap-5">
        <div>
          <h1 className="font-display text-[34px] leading-none font-bold uppercase md:text-[40px]">
            Welcome Back,{" "}
            {ctx.preview
              ? ctx.builderName
              : firstName(ctx.me.fullName, ctx.me.email)}
          </h1>
          <p className="mt-2 text-[15px] text-ink-muted">
            Live status on every home Leander 3T is building with you.
          </p>
          <Scope>
            <ShieldCheck
              className="size-[13px]"
              strokeWidth={2.4}
              aria-hidden
            />
            Showing {ctx.builderName} homes only
          </Scope>
        </div>
        <Button asChild variant="fire">
          <Link href="/portal/requests/new">+ Submit New Job Request</Link>
        </Button>
      </div>

      <div className="mb-[34px] grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <Stat
          label="Active Homes"
          value={stats.active}
          note={
            stats.subdivisions.slice(0, 2).join(" & ") || "None in progress"
          }
        />
        <Stat
          label="Crews On Site Today"
          value={stats.onSiteTotal}
          note={onSiteNote}
        />
        <Stat
          label="Scheduled This Week"
          value={stats.scheduledWeek}
          note={
            stats.nextUp
              ? `Next: ${stats.nextUp.trade}, ${md(stats.nextUp.date)}`
              : "Nothing starting this week"
          }
        />
        <Stat
          label="Completed This Year"
          value={stats.completedYear}
          note="Photo records on file"
        />
      </div>

      {featured ? (
        <section className="mb-[26px] overflow-hidden rounded-[16px] border border-mortar bg-paper shadow-[0_2px_4px_rgba(33,27,23,.08),0_14px_34px_rgba(33,27,23,.13)]">
          <div className="flex flex-wrap items-center justify-between gap-4 bg-charcoal px-7 py-[22px] text-limestone">
            <div>
              <h2 className="font-display text-[30px] leading-none font-bold uppercase">
                {String(featured.property_address)}
              </h2>
              <div className="mt-1.5 font-mono text-[12px] text-[#b0a494]">
                {homeMeta(featured)}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="jh-chip hot">
                {STATUS_LABEL[featured.status]} —{" "}
                {Math.round(Number(featured.completion_percent) || 0)}%
              </span>
              <Link
                href={`/portal/homes/${featured.id}#update`}
                className="rounded-md border-[1.5px] border-[rgba(246,241,232,.35)] px-4 py-2 text-[13.5px] font-bold text-limestone hover:border-amber hover:text-amber"
              >
                Request an Update
              </Link>
            </div>
          </div>
          <div className="grid md:grid-cols-[1.1fr_.9fr]">
            <div className="border-mortar px-7 py-6 max-md:border-b md:border-r">
              <SecLabel>Trade Status</SecLabel>
              <TradeRows rows={tradeProgress(featured)} />
              <div className="mt-5">
                <SecLabel>Specs On File</SecLabel>
                <Chips items={specChips(featured)} />
              </div>
            </div>
            <div className="px-7 py-6">
              <SecLabel>Latest Photos</SecLabel>
              {photos.length ? (
                <div className="grid grid-cols-2 gap-3">
                  {photos.map((p) => (
                    <figure
                      key={p.id}
                      className="relative aspect-[4/3] overflow-hidden rounded-md bg-mortar"
                    >
                      {p.url && (
                        // Signed storage URL; next/image would re-host it.
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={p.url}
                          alt={p.label || "Progress photo"}
                          className="size-full object-cover"
                        />
                      )}
                      <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 px-2.5 pt-6 pb-2 font-mono text-[10.5px] tracking-[0.08em] text-white uppercase">
                        {[p.label, p.date].filter(Boolean).join(" · ")}
                      </figcaption>
                    </figure>
                  ))}
                </div>
              ) : (
                <p className="text-[14px] text-ink-muted">
                  Photos appear here as the crew posts progress.
                </p>
              )}
              <Link
                href={`/portal/homes/${featured.id}`}
                className="mt-4 inline-block text-[13.5px] font-bold text-flame"
              >
                Open home →
              </Link>
            </div>
          </div>
        </section>
      ) : (
        <p className="mb-[26px] rounded-md border border-mortar bg-paper px-6 py-8 text-center text-ink-muted">
          No homes in progress right now.
        </p>
      )}

      {others.length > 0 && (
        <div className="mb-[26px] grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {others.map((j) => (
            <HomeCard key={j.id} j={j as never} />
          ))}
        </div>
      )}
      <div className="mb-[34px] text-right">
        <Link href="/portal/homes" className="text-[14px] font-bold text-flame">
          All {ctx.builderName} homes →
        </Link>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="rounded-md border border-mortar bg-paper shadow-card">
          <div className="flex items-center justify-between border-b border-mortar px-6 py-[18px]">
            <h2 className="font-display text-[22px] font-bold uppercase">
              Recent Updates
            </h2>
            <Link
              href="/portal/requests"
              className="text-[13.5px] font-bold text-flame"
            >
              Your requests
            </Link>
          </div>
          {feed.length ? (
            <ul>
              {feed.map((f, i) => (
                <li
                  key={i}
                  className="flex gap-4 border-b border-limestone px-6 py-3.5 last:border-b-0"
                >
                  <span className="w-[42px] flex-none pt-0.5 font-mono text-[12px] text-ink-muted">
                    {md(f.date)}
                  </span>
                  <div className="min-w-0">
                    <Link
                      href={`/portal/homes/${f.jobId}`}
                      className="text-[14.5px] font-semibold hover:text-flame"
                    >
                      {f.title}
                    </Link>
                    <div className="text-[13px] text-ink-muted">{f.sub}</div>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-6 py-6 text-ink-muted">
              No updates in the last 30 days.
            </p>
          )}
        </section>
        <section className="rounded-md border border-mortar bg-paper shadow-card">
          <div className="flex items-center justify-between border-b border-mortar px-6 py-[18px]">
            <h2 className="font-display text-[22px] font-bold uppercase">
              Your Leander 3T Team
            </h2>
            <a
              href="tel:+15122602577"
              className="text-[13.5px] font-bold text-flame"
            >
              Call the office
            </a>
          </div>
          <ul>
            {contacts.map((c) => (
              <li
                key={c.full_name}
                className="flex items-center gap-3.5 border-b border-limestone px-6 py-3.5"
              >
                <span className="grid size-9 flex-none place-items-center rounded-full bg-fire text-sm font-extrabold text-[#20130a]">
                  {initials(c.full_name, null)}
                </span>
                <div className="min-w-0">
                  <div className="text-[14.5px] font-bold">{c.full_name}</div>
                  <div className="font-mono text-[11px] tracking-[0.1em] text-ink-muted uppercase">
                    Supervisor — {c.homes} open{" "}
                    {c.homes === 1 ? "home" : "homes"}
                  </div>
                </div>
                {c.phone && (
                  <a
                    href={`tel:${c.phone}`}
                    className="ml-auto font-mono text-[13px] font-semibold text-flame"
                  >
                    {c.phone}
                  </a>
                )}
              </li>
            ))}
            <li className="flex items-center gap-3.5 px-6 py-3.5">
              <span className="grid size-9 flex-none place-items-center rounded-full bg-fire text-sm font-extrabold text-[#20130a]">
                L3
              </span>
              <div>
                <div className="text-[14.5px] font-bold">Leander 3T Office</div>
                <div className="font-mono text-[11px] tracking-[0.1em] text-ink-muted uppercase">
                  Orders &amp; Scheduling
                </div>
              </div>
              <a
                href="tel:+15122602577"
                className="ml-auto font-mono text-[13px] font-semibold text-flame"
              >
                {OFFICE_PHONE}
              </a>
            </li>
          </ul>
        </section>
      </div>
    </>
  );
}
