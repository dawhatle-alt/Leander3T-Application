import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { OrderBoard } from "@/components/orders/order-board";
import { PageHead } from "@/components/shell/page-bits";
import {
  STATUS_BADGE,
  STATUS_LABEL,
  num,
  planLine,
  schedule,
} from "@/lib/jobs/format";
import { requireProfile } from "@/lib/auth/session";
import { loadOrderBoard } from "@/lib/orders/board";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Job — Leander 3T" };

// Crew manager view of one job, built for a phone on site: the specs the
// crew needs and material requests. No costs, no builder contact details.
export default async function CrewJobPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const me = await requireProfile();
  if (me.role !== "crew_manager") redirect(`/jobs/${id}`);

  const supabase = await createClient();
  // Row-level security returns the job only if it belongs to this person's crew.
  const { data: job } = await supabase
    .from("jobs")
    .select(
      `id, property_address, subdivision, plan_name, elevation, status, completion_percent,
       brick_sqft, brick_mortar_color_id, brick_drop_slab_ft, brick_start_date, brick_end_date, brick_notes,
       stone_sqft, stone_color, stone_mortar_color_id, stone_drop_ft, stone_start_date, stone_end_date, stone_notes,
       stucco_sqft, stucco_body_paint_color, stucco_trim_paint_color, stucco_start_date, stucco_end_date, stucco_notes,
       builders(name),
       brick_color:brick_colors(name),
       brick_mortar:mortar_colors!jobs_brick_mortar_color_id_fkey(name),
       stone_mortar:mortar_colors!jobs_stone_mortar_color_id_fkey(name)`,
    )
    .eq("id", id)
    .maybeSingle();
  if (!job) notFound();

  const { counts, ...board } = await loadOrderBoard(me, job);
  void counts;

  const trades = [
    job.brick_sqft && {
      key: "brick",
      title: "Brick",
      sqft: job.brick_sqft,
      lines: [
        job.brick_color?.name,
        job.brick_mortar?.name && `Mortar: ${job.brick_mortar.name}`,
        job.brick_drop_slab_ft && `Drop slab ${num(job.brick_drop_slab_ft)} ft`,
        schedule(job.brick_start_date, job.brick_end_date),
        job.brick_notes,
      ],
    },
    job.stone_sqft && {
      key: "stone",
      title: "Stone",
      sqft: job.stone_sqft,
      lines: [
        job.stone_color,
        job.stone_mortar?.name && `Mortar: ${job.stone_mortar.name}`,
        job.stone_drop_ft && `Drop ${num(job.stone_drop_ft)} ft`,
        schedule(job.stone_start_date, job.stone_end_date),
        job.stone_notes,
      ],
    },
    job.stucco_sqft && {
      key: "stucco",
      title: "Stucco",
      sqft: job.stucco_sqft,
      lines: [
        job.stucco_body_paint_color && `Body: ${job.stucco_body_paint_color}`,
        job.stucco_trim_paint_color && `Trim: ${job.stucco_trim_paint_color}`,
        schedule(job.stucco_start_date, job.stucco_end_date),
        job.stucco_notes,
      ],
    },
  ].filter(Boolean) as {
    key: string;
    title: string;
    sqft: number;
    lines: (string | null | false)[];
  }[];

  return (
    <>
      <div className="mb-3 flex items-center gap-2.5 font-mono text-xs tracking-[0.1em] text-ink-muted uppercase">
        <Link href="/crew" className="font-medium text-flame">
          My Jobs
        </Link>
        <span>/</span>
        <span className="truncate">{job.property_address}</span>
      </div>
      <PageHead
        title={job.property_address ?? "Job"}
        sub={[job.builders?.name, job.subdivision, planLine(job)]
          .filter(Boolean)
          .join(" · ")}
      >
        <span className={cn("badge", STATUS_BADGE[job.status])}>
          {STATUS_LABEL[job.status]} · {num(job.completion_percent)}%
        </span>
      </PageHead>

      <div className="mb-8 grid gap-4 md:grid-cols-3">
        {trades.map((t) => (
          <section
            key={t.key}
            className="overflow-hidden rounded-md border border-mortar bg-paper shadow-card"
          >
            <header
              className={cn(
                `sp-${t.key}`,
                "flex items-center justify-between px-4 py-2.5 font-display text-lg font-bold text-white uppercase",
              )}
            >
              {t.title}
              <span className="font-mono text-[13px] font-medium normal-case">
                {num(t.sqft)} SF
              </span>
            </header>
            <ul className="px-4 py-3 text-[14px]">
              {t.lines.filter(Boolean).map((l, i) => (
                <li
                  key={i}
                  className="border-b border-dashed border-mortar py-1.5 last:border-b-0"
                >
                  {l}
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      <h2 className="section-title">
        Request Materials <span className="chalk-line" aria-hidden="true" />
      </h2>
      <OrderBoard {...board} />
    </>
  );
}
