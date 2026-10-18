import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { FileText } from "lucide-react";
import {
  Chips,
  SecLabel,
  STATUS_BADGE,
  STATUS_LABEL,
  TradeRows,
} from "@/components/portal/bits";
import { UpdateRequestForm } from "@/components/portal/forms";
import { PreviewBar } from "@/components/portal/preview-bar";
import { portalContext } from "@/lib/portal/context";
import {
  HOME_COLS,
  homeMeta,
  loadHomePhotos,
  md,
  mdTs,
  specChips,
  tradeProgress,
} from "@/lib/portal/data";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Home — Leander 3T" };

const DOC_LABEL: Record<string, string> = {
  plans: "Plans",
  front_elevation: "Front elevation",
  color_selection: "Color selection",
};

// Read-only view of one home: status, schedule, specs, plans and photos.
// No costs, notes, orders, suppliers or crews — builders see status only.
export default async function PortalHome({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const ctx = await portalContext();
  const supabase = await createClient();

  const { data: job } = await supabase
    .from("jobs")
    .select(HOME_COLS)
    .eq("id", id)
    .eq("builder_id", ctx.builderId)
    .maybeSingle();
  if (!job) notFound();

  const [photos, { data: docs }, { data: requests }] = await Promise.all([
    loadHomePhotos(id, 24),
    supabase
      .from("job_documents")
      .select("id, kind, storage_path, file_name")
      .eq("job_id", id)
      .in("kind", ["plans", "front_elevation", "color_selection"])
      .order("created_at", { ascending: false }),
    supabase
      .from("job_requests")
      .select(
        "id, request_number, message, status, response, created_at, reviewed_at",
      )
      .eq("job_id", id)
      .eq("kind", "update")
      .order("created_at", { ascending: false })
      .limit(10),
  ]);
  const docUrls = new Map<string, string>();
  if (docs?.length) {
    const { data: signed } = await supabase.storage
      .from("plans")
      .createSignedUrls(
        docs.map((d) => d.storage_path),
        3600,
      );
    for (const s of signed ?? [])
      if (s.path && s.signedUrl) docUrls.set(s.path, s.signedUrl);
  }

  const pct = Math.round(Number(job.completion_percent) || 0);
  const sched = (["brick", "stone", "stucco"] as const)
    .filter((t) => Number(job[`${t}_sqft`]) > 0)
    .map((t) => ({
      t,
      start: job[`${t}_start_date`],
      end: job[`${t}_end_date`],
      done: job[`${t}_completion_date`],
    }));

  return (
    <>
      {ctx.preview && (
        <PreviewBar builders={ctx.builders} current={ctx.builderId} />
      )}
      <div className="mb-3 font-mono text-xs tracking-[0.1em] text-ink-muted uppercase">
        <Link href="/portal" className="font-medium text-flame">
          Portal
        </Link>{" "}
        /{" "}
        <Link href="/portal/homes" className="font-medium text-flame">
          Homes
        </Link>{" "}
        / {job.property_address}
      </div>

      <section className="mb-6 overflow-hidden rounded-[16px] border border-mortar bg-paper shadow-card">
        <div className="flex flex-wrap items-center justify-between gap-4 bg-charcoal px-7 py-[22px] text-limestone">
          <div>
            <h1 className="font-display text-[30px] leading-none font-bold uppercase md:text-[34px]">
              {job.property_address}
            </h1>
            <div className="mt-1.5 font-mono text-[12px] text-[#b0a494]">
              {homeMeta(job)}
            </div>
          </div>
          <span className={cn("badge", STATUS_BADGE[job.status])}>
            {STATUS_LABEL[job.status]}
            {job.status !== "new" ? ` — ${pct}%` : ""}
          </span>
        </div>
        <div className="grid md:grid-cols-[1.1fr_.9fr]">
          <div className="border-mortar px-7 py-6 max-md:border-b md:border-r">
            <SecLabel>Trade Status</SecLabel>
            <TradeRows rows={tradeProgress(job as never)} />
          </div>
          <div className="px-7 py-6">
            <SecLabel>Schedule</SecLabel>
            <dl className="grid grid-cols-[90px_1fr] gap-y-2 font-mono text-[13px]">
              {sched.map((s) => (
                <div key={s.t} className="contents">
                  <dt className="font-display text-[16px] font-bold tracking-[0.03em] uppercase">
                    {s.t}
                  </dt>
                  <dd>
                    {s.done
                      ? `Done ${md(s.done as string)}`
                      : s.start
                        ? `${md(s.start as string)}${s.end ? ` – ${md(s.end as string)}` : ""}`
                        : "Not scheduled"}
                  </dd>
                </div>
              ))}
              {job.job_completed_date && (
                <div className="contents">
                  <dt className="font-display text-[16px] font-bold tracking-[0.03em] uppercase">
                    Complete
                  </dt>
                  <dd>{md(job.job_completed_date)}</dd>
                </div>
              )}
            </dl>
            {job.cm?.name && (
              <p className="mt-4 text-[14px] text-ink-muted">
                Your construction manager:{" "}
                <strong className="text-ink">{job.cm.name}</strong>
              </p>
            )}
          </div>
        </div>
      </section>

      <div className="mb-6 grid gap-5 lg:grid-cols-2">
        <section className="rounded-md border border-mortar bg-paper shadow-card">
          <h2 className="border-b border-mortar px-6 py-[18px] font-display text-[22px] font-bold uppercase">
            Specs On File
          </h2>
          <div className="px-6 py-5">
            <Chips items={specChips(job)} />
          </div>
          <h3 className="border-t border-mortar px-6 pt-4 font-mono text-[11px] tracking-[0.16em] text-ink-muted uppercase">
            Plans &amp; Selections
          </h3>
          {docs?.length ? (
            <ul className="px-6 pt-2 pb-4">
              {docs.map((d) => (
                <li key={d.id} className="py-1.5">
                  <a
                    href={docUrls.get(d.storage_path) ?? "#"}
                    target="_blank"
                    rel="noopener"
                    className="inline-flex items-center gap-2 font-semibold hover:text-flame"
                  >
                    <FileText className="size-4 text-flame" aria-hidden />
                    {DOC_LABEL[d.kind]}
                    <span className="font-normal text-ink-muted">
                      {d.file_name}
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-6 pt-2 pb-5 text-[14px] text-ink-muted">
              No plans on file yet.
            </p>
          )}
        </section>

        <section
          id="update"
          className="scroll-mt-24 rounded-md border border-mortar bg-paper shadow-card"
        >
          <h2 className="border-b border-mortar px-6 py-[18px] font-display text-[22px] font-bold uppercase">
            Request an Update
          </h2>
          <UpdateRequestForm jobId={id} preview={ctx.preview} />
          {requests && requests.length > 0 && (
            <ul className="border-t border-mortar">
              {requests.map((r) => (
                <li
                  key={r.id}
                  className="border-b border-limestone px-6 py-3.5 last:border-b-0"
                >
                  <div className="text-[14.5px] whitespace-pre-wrap">
                    {r.message}
                  </div>
                  <div className="font-mono text-[11.5px] text-ink-muted">
                    #{r.request_number} · ASKED {mdTs(r.created_at)}
                  </div>
                  {r.response ? (
                    <div className="mt-2 rounded-md border-l-[3px] border-success bg-[#2f6b4514] px-3 py-2 text-[14px]">
                      <span className="font-mono text-[11px] tracking-[0.1em] text-success uppercase">
                        Leander 3T replied
                        {r.reviewed_at ? ` ${mdTs(r.reviewed_at)}` : ""}
                      </span>
                      <div className="whitespace-pre-wrap">{r.response}</div>
                    </div>
                  ) : (
                    <div className="mt-1 font-mono text-[11px] tracking-[0.1em] text-[#9a5d00] uppercase">
                      Waiting on the office
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="rounded-md border border-mortar bg-paper shadow-card">
        <h2 className="border-b border-mortar px-6 py-[18px] font-display text-[22px] font-bold uppercase">
          Photos <span className="count-label">{photos.length}</span>
        </h2>
        {photos.length ? (
          <ul className="grid grid-cols-2 gap-4 p-6 md:grid-cols-4">
            {photos.map((p) => (
              <li key={p.id}>
                <a
                  href={p.url ?? "#"}
                  target="_blank"
                  rel="noopener"
                  className="block"
                >
                  <figure className="relative aspect-[4/3] overflow-hidden rounded-md bg-mortar">
                    {p.url && (
                      // Signed storage URL; next/image would re-host it.
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={p.url}
                        alt={p.label || "Progress photo"}
                        loading="lazy"
                        className="size-full object-cover"
                      />
                    )}
                    <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 px-2 pt-5 pb-1.5 font-mono text-[10px] tracking-[0.08em] text-white uppercase">
                      {[p.label, p.date].filter(Boolean).join(" · ")}
                    </figcaption>
                  </figure>
                </a>
              </li>
            ))}
          </ul>
        ) : (
          <p className="px-6 py-6 text-ink-muted">No photos yet.</p>
        )}
      </section>
    </>
  );
}
