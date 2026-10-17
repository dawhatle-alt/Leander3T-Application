import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NoteForm, DeleteNoteButton } from "@/components/jobs/notes";
import { PhotoGallery } from "@/components/jobs/photo-gallery";
import { PhotoUploader } from "@/components/jobs/photo-uploader";
import {
  DocumentUploader,
  DeleteDocumentButton,
} from "@/components/jobs/documents";
import { canEditJob } from "@/lib/jobs/access";
import {
  STATUS_LABEL,
  TRADE_LABEL,
  longDate,
  num,
  schedule,
  shortDate,
  stamp,
} from "@/lib/jobs/format";
import { loadJobOrders } from "@/lib/jobs/orders";
import { requireProfile } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Job — Leander 3T" };

const JOB_SELECT = `
  *,
  builders(name),
  construction_managers(name, phone),
  brick_color:brick_colors(name),
  brick_mortar:mortar_colors!jobs_brick_mortar_color_id_fkey(name),
  stone_mortar:mortar_colors!jobs_stone_mortar_color_id_fkey(name),
  brick_crew:crews!jobs_brick_crew_id_fkey(name, manager:profiles(full_name)),
  stone_crew:crews!jobs_stone_crew_id_fkey(name, manager:profiles(full_name)),
  stucco_crew:crews!jobs_stucco_crew_id_fkey(name, manager:profiles(full_name)),
  address_block_orders(status, ordered_date, delivered_date),
  job_assignments(kind, profiles(full_name))
`;

const DOC_KIND: Record<string, string> = {
  plans: "Plans",
  front_elevation: "Front elevation",
  color_selection: "Color selection",
  order_form: "Order form",
  other: "Other",
};

export default async function JobPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const me = await requireProfile();
  const supabase = await createClient();

  const { data: job } = await supabase
    .from("jobs")
    .select(JOB_SELECT)
    .eq("id", id)
    .maybeSingle();
  if (!job) notFound();

  const [editable, orders, photosRes, docsRes, notesRes] = await Promise.all([
    canEditJob(me, id),
    loadJobOrders(supabase, id),
    supabase
      .from("job_photos")
      .select(
        "id, storage_path, caption, trade, taken_on, created_at, uploaded_by",
      )
      .eq("job_id", id)
      .order("taken_on", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false }),
    supabase
      .from("job_documents")
      .select("id, kind, storage_path, file_name, created_at")
      .eq("job_id", id)
      .neq("kind", "order_form")
      .order("created_at", { ascending: false }),
    supabase
      .from("job_notes")
      .select("id, body, created_at, author_id, profiles(full_name)")
      .eq("job_id", id)
      .order("created_at", { ascending: false }),
  ]);

  const photos = photosRes.data ?? [];
  const docs = docsRes.data ?? [];
  const notes = notesRes.data ?? [];

  // Signed links, valid for an hour; storage paths are never shown or stored as URLs.
  const sign = async (bucket: string, paths: string[]) => {
    if (!paths.length) return new Map<string, string>();
    const { data } = await supabase.storage
      .from(bucket)
      .createSignedUrls(paths, 3600);
    const map = new Map<string, string>();
    for (const d of data ?? [])
      if (d.path && d.signedUrl) map.set(d.path, d.signedUrl);
    return map;
  };
  const [photoUrls, docUrls] = await Promise.all([
    sign(
      "photos",
      photos.map((p) => p.storage_path),
    ),
    sign(
      "plans",
      docs.map((d) => d.storage_path),
    ),
  ]);

  const supervisors = job.job_assignments.filter(
    (a) => a.kind === "supervisor",
  );
  const employees = job.job_assignments.filter((a) => a.kind === "employee");
  const block = job.address_block_orders;
  const pct = Number(job.completion_percent) || 0;
  const crewLine = (
    c: { name: string; manager: { full_name: string | null } | null } | null,
  ) => (c ? [c.name, c.manager?.full_name].filter(Boolean).join(" — ") : "—");
  const placed = orders.filter((o) => o.ordered).length;

  return (
    <>
      <div className="mb-3 flex items-center gap-2.5 font-mono text-xs tracking-[0.1em] text-ink-muted uppercase">
        <Link href="/jobs" className="font-medium text-flame">
          Jobs
        </Link>
        <span>/</span>
        <span>{job.property_address}</span>
      </div>

      <div className="relative mb-[26px] flex flex-wrap items-center justify-between gap-6 overflow-hidden rounded-lg bg-charcoal px-6 py-7 text-limestone after:absolute after:-top-20 after:-right-16 after:size-[300px] after:bg-[radial-gradient(circle,rgba(228,89,15,.28),transparent_70%)] md:px-9 md:py-8">
        <div className="relative z-[1]">
          <h1 className="font-display text-[34px] leading-none font-bold uppercase md:text-[44px]">
            {job.property_address}
          </h1>
          <div className="mt-3.5 flex flex-wrap gap-2.5">
            <span
              className={cn("jh-chip", job.status === "in_progress" && "hot")}
            >
              {STATUS_LABEL[job.status]}
            </span>
            {job.builders?.name && (
              <span className="jh-chip">{job.builders.name}</span>
            )}
            {job.subdivision && (
              <span className="jh-chip">{job.subdivision}</span>
            )}
            {(job.plan_name || job.elevation) && (
              <span className="jh-chip">
                {[
                  job.plan_name && `Plan: ${job.plan_name}`,
                  job.elevation && `Elev ${job.elevation}`,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </span>
            )}
            {job.construction_managers?.name && (
              <span className="jh-chip">
                CM: {job.construction_managers.name}
              </span>
            )}
          </div>
        </div>
        {editable && (
          <div className="relative z-[1] flex flex-wrap gap-3">
            <Button asChild variant="ghost-dark" size="sm">
              <Link href={`/jobs/${id}/edit`}>Edit Job</Link>
            </Button>
          </div>
        )}
      </div>

      <div className="mb-[26px] flex flex-wrap items-center gap-5 rounded-md border border-mortar bg-paper px-6 py-[18px] shadow-card">
        <span className="font-mono text-[11px] tracking-[0.14em] whitespace-nowrap text-ink-muted uppercase">
          Project completion
        </span>
        <div className="h-3 min-w-[200px] flex-1 overflow-hidden rounded-full bg-limestone">
          <div
            className="h-full rounded-full bg-fire"
            style={{ width: `${pct}%` }}
          />
        </div>
        <span className="font-display text-[26px] font-bold">{num(pct)}%</span>
      </div>

      <div className="mb-[34px] grid gap-5 lg:grid-cols-3">
        <Spec trade="brick" sqft={job.brick_sqft}>
          {job.brick_sqft ? (
            <>
              <KV k="Color" v={job.brick_color?.name} />
              <KV k="Mortar" v={job.brick_mortar?.name} />
              <KV k="Drop slab" v={ft(job.brick_drop_slab_ft)} mono />
              {job.brick_detail_ft && (
                <KV k="Detail" v={ft(job.brick_detail_ft)} mono />
              )}
              {job.brick_paver_ft && (
                <KV k="Pavers" v={ft(job.brick_paver_ft)} mono />
              )}
              <KV
                k="Schedule"
                v={schedule(job.brick_start_date, job.brick_end_date)}
                mono
              />
              {job.brick_completion_date && (
                <KV
                  k="Completed"
                  v={longDate(job.brick_completion_date)}
                  mono
                />
              )}
              <KV k="Crew" v={crewLine(job.brick_crew)} />
              {job.brick_notes && <KV k="Notes" v={job.brick_notes} />}
            </>
          ) : (
            <KV k="Brick" v="Not on this job" />
          )}
        </Spec>
        <Spec trade="stone" sqft={job.stone_sqft}>
          {job.stone_sqft ? (
            <>
              <KV k="Color" v={job.stone_color} />
              <KV k="Mortar" v={job.stone_mortar?.name} />
              <KV k="Drop" v={ft(job.stone_drop_ft)} mono />
              <KV
                k="Schedule"
                v={schedule(job.stone_start_date, job.stone_end_date)}
                mono
              />
              {job.stone_completion_date && (
                <KV
                  k="Completed"
                  v={longDate(job.stone_completion_date)}
                  mono
                />
              )}
              <KV k="Crew" v={crewLine(job.stone_crew)} />
              {job.stone_notes && <KV k="Notes" v={job.stone_notes} />}
            </>
          ) : (
            <KV k="Stone" v="Not on this job" />
          )}
        </Spec>
        <Spec trade="stucco" sqft={job.stucco_sqft}>
          {job.stucco_sqft ? (
            <>
              <KV k="Body color" v={job.stucco_body_paint_color} />
              <KV k="Trim color" v={job.stucco_trim_paint_color} />
              <KV
                k="Complete"
                v={`${num(job.stucco_percent_complete ?? 0)}%`}
                mono
              />
              <KV
                k="Schedule"
                v={schedule(job.stucco_start_date, job.stucco_end_date)}
                mono
              />
              {job.stucco_completion_date && (
                <KV
                  k="Completed"
                  v={longDate(job.stucco_completion_date)}
                  mono
                />
              )}
              <KV k="Crew" v={crewLine(job.stucco_crew)} />
              {job.stucco_notes && <KV k="Notes" v={job.stucco_notes} />}
            </>
          ) : (
            <KV k="Stucco" v="Not on this job" />
          )}
        </Spec>
      </div>

      <div className="mb-[34px] grid gap-5 lg:grid-cols-2">
        <Card title="House & Builder">
          <KV
            k="Company"
            v={
              job.company === "leander_3t"
                ? "Leander 3T"
                : "3T Construction Solutions"
            }
          />
          <KV k="Area" v={job.area} />
          {job.area_directions && <KV k="Directions" v={job.area_directions} />}
          <KV k="Plan number" v={job.plan_number} mono />
          <KV
            k="Lot swing"
            v={
              job.lot_swing
                ? job.lot_swing[0].toUpperCase() + job.lot_swing.slice(1)
                : null
            }
          />
          <KV k="Home SF" v={num(job.sqft)} mono />
          <KV
            k="Builder CM"
            v={
              [
                job.construction_managers?.name,
                job.construction_managers?.phone,
              ]
                .filter(Boolean)
                .join(" · ") || null
            }
          />
          <KV
            k="Supervisor"
            v={
              supervisors
                .map((a) => a.profiles?.full_name)
                .filter(Boolean)
                .join(", ") || null
            }
          />
          {employees.length > 0 && (
            <KV
              k="Employees"
              v={employees
                .map((a) => a.profiles?.full_name)
                .filter(Boolean)
                .join(", ")}
            />
          )}
        </Card>
        <Card title="Dates & Extras">
          <KV k="Received" v={longDate(job.date_received)} mono />
          <KV
            k="Supplies delivered"
            v={longDate(job.supply_delivery_date)}
            mono
          />
          <KV
            k="Target completion"
            v={longDate(job.targeted_completion_date)}
            mono
          />
          <KV k="Job completed" v={longDate(job.job_completed_date)} mono />
          <KV
            k="Address block"
            v={
              !block || block.status === "none"
                ? "Not ordered"
                : block.status === "ordered"
                  ? `Ordered ${shortDate(block.ordered_date)}`
                  : `Delivered ${shortDate(block.delivered_date)}`
            }
          />
          <KV
            k="Fireplace"
            v={job.has_fireplace ? job.fireplace_notes || "Yes" : "No"}
          />
          {job.additional_notes && <KV k="Notes" v={job.additional_notes} />}
        </Card>
      </div>

      <h2 className="section-title">
        Material Orders <span className="chalk-line" aria-hidden="true" />
        <span className="count-label">
          {orders.length} orders · {placed} placed · {orders.length - placed}{" "}
          draft
        </span>
      </h2>
      {orders.length ? (
        <div className="mb-[34px] grid gap-5 lg:grid-cols-2">
          {groupBy(orders, (o) => o.type).map(([type, rows]) => (
            <section
              key={type}
              className="rounded-md border border-mortar bg-paper shadow-card"
            >
              <header className="flex items-center gap-3 border-b border-mortar px-[22px] py-4">
                <h3 className="font-display text-[21px] font-bold uppercase">
                  {type}
                </h3>
                <span className="count-label">
                  {rows.length} {rows.length === 1 ? "order" : "orders"}
                </span>
              </header>
              <ul>
                {rows.map((o) => (
                  <li
                    key={o.id}
                    className="flex items-center gap-3.5 border-b border-limestone px-[22px] py-[13px] text-[14px] last:border-b-0"
                  >
                    <span className="w-[52px] flex-none font-mono text-xs text-ink-muted">
                      {o.number ? `#${o.number}` : "—"}
                    </span>
                    <div className="min-w-0">
                      <div className="font-semibold">{o.main}</div>
                      <div className="text-[12.5px] text-ink-muted">
                        {o.sub}
                      </div>
                    </div>
                    <span
                      className={cn(
                        "badge ml-auto",
                        o.ordered ? "b-done" : "b-new",
                      )}
                    >
                      {o.ordered ? "Ordered" : "Draft"}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      ) : (
        <p className="mb-[34px] text-ink-muted">No material orders yet.</p>
      )}

      <h2 className="section-title">
        Job Photos <span className="chalk-line" aria-hidden="true" />
        <span className="count-label">{photos.length} photos</span>
      </h2>
      <div className="mb-[34px] grid gap-5">
        <PhotoUploader jobId={id} />
        <PhotoGallery
          jobId={id}
          photos={photos.map((p) => ({
            id: p.id,
            url: photoUrls.get(p.storage_path) ?? null,
            label: [p.caption, p.trade && TRADE_LABEL[p.trade]]
              .filter(Boolean)
              .join(" · "),
            date: p.taken_on
              ? shortDate(p.taken_on)
              : stamp(p.created_at).split(" ")[0],
            canDelete: me.role === "admin" || p.uploaded_by === me.id,
          }))}
        />
      </div>

      <div className="mb-[34px] grid gap-5 lg:grid-cols-2">
        <section>
          <h2 className="section-title">
            Plans & Documents <span className="chalk-line" aria-hidden="true" />
          </h2>
          <div className="rounded-md border border-mortar bg-paper shadow-card">
            {docs.length ? (
              <ul>
                {docs.map((d) => (
                  <li
                    key={d.id}
                    className="flex items-center gap-3 border-b border-limestone px-5 py-3 last:border-b-0"
                  >
                    <FileText
                      className="size-5 flex-none text-flame"
                      aria-hidden
                    />
                    <div className="min-w-0 flex-1">
                      {docUrls.get(d.storage_path) ? (
                        <a
                          href={docUrls.get(d.storage_path)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block truncate font-semibold hover:text-flame"
                        >
                          {d.file_name ?? "Document"}
                        </a>
                      ) : (
                        <span className="block truncate font-semibold">
                          {d.file_name}
                        </span>
                      )}
                      <span className="font-mono text-[11.5px] text-ink-muted uppercase">
                        {DOC_KIND[d.kind]} · {stamp(d.created_at)}
                      </span>
                    </div>
                    {me.role === "admin" && (
                      <DeleteDocumentButton jobId={id} documentId={d.id} />
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="px-5 py-6 text-ink-muted">No plans uploaded yet.</p>
            )}
            {editable && <DocumentUploader jobId={id} />}
          </div>
        </section>

        <section>
          <h2 className="section-title">
            Notes <span className="chalk-line" aria-hidden="true" />
          </h2>
          <div className="rounded-md border border-mortar bg-paper shadow-card">
            <NoteForm jobId={id} />
            <ul>
              {notes.map((n) => (
                <li
                  key={n.id}
                  className="border-t border-limestone px-5 py-3.5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-[14.5px] whitespace-pre-line">
                      {n.body}
                    </p>
                    {(me.role === "admin" || n.author_id === me.id) && (
                      <DeleteNoteButton jobId={id} noteId={n.id} />
                    )}
                  </div>
                  <div className="mt-1 font-mono text-[11.5px] text-ink-muted uppercase">
                    {n.profiles?.full_name ?? "Someone"} · {stamp(n.created_at)}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </div>
    </>
  );
}

function ft(v: number | null) {
  return v === null ? null : `${num(v)} ft`;
}

function Spec({
  trade,
  sqft,
  children,
}: {
  trade: "brick" | "stone" | "stucco";
  sqft: number | null;
  children: React.ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-md border border-mortar bg-paper shadow-card">
      <header
        className={cn(
          `sp-${trade}`,
          "flex items-center justify-between px-[22px] py-3.5 font-display text-xl font-bold tracking-[0.03em] text-white uppercase",
        )}
      >
        {TRADE_LABEL[trade]}
        <span className="font-mono text-[13px] font-medium tracking-normal normal-case opacity-90">
          {sqft ? `${num(sqft)} SF` : "— SF"}
        </span>
      </header>
      <dl className="px-[22px] py-[18px]">{children}</dl>
    </section>
  );
}

function Card({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-md border border-mortar bg-paper shadow-card">
      <header className="border-b border-mortar px-[22px] py-4">
        <h2 className="font-display text-[21px] font-bold uppercase">
          {title}
        </h2>
      </header>
      <dl className="px-[22px] py-3">{children}</dl>
    </section>
  );
}

function KV({
  k,
  v,
  mono,
}: {
  k: string;
  v: string | null | undefined;
  mono?: boolean;
}) {
  return (
    <div className="kv">
      <dt>{k}</dt>
      <dd className={cn(mono && "font-mono text-[13px]")}>{v || "—"}</dd>
    </div>
  );
}

function groupBy<T>(rows: T[], key: (r: T) => string): [string, T[]][] {
  const m = new Map<string, T[]>();
  for (const r of rows) m.set(key(r), [...(m.get(key(r)) ?? []), r]);
  return [...m.entries()];
}
