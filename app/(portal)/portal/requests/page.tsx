import type { Metadata } from "next";
import Link from "next/link";
import { Notice } from "@/components/auth/form-bits";
import { PreviewBar } from "@/components/portal/preview-bar";
import { Button } from "@/components/ui/button";
import { portalContext } from "@/lib/portal/context";
import { md } from "@/lib/portal/data";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Your Requests — Leander 3T" };

const STATUS = {
  submitted: { label: "With the office", cls: "b-new" },
  approved: { label: "Job created", cls: "b-done" },
  answered: { label: "Answered", cls: "b-done" },
  declined: { label: "Declined", cls: "b-new" },
} as const;

export default async function RequestsPage({
  searchParams,
}: {
  searchParams: Promise<{ sent?: string }>;
}) {
  const ctx = await portalContext();
  const { sent } = await searchParams;
  const supabase = await createClient();
  const { data: rows } = await supabase
    .from("job_requests")
    .select(
      "id, request_number, kind, house_number, street, subdivision, message, status, response, created_at, reviewed_at, job_id, jobs(property_address)",
    )
    .eq("builder_id", ctx.builderId)
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <>
      {ctx.preview && (
        <PreviewBar builders={ctx.builders} current={ctx.builderId} />
      )}
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-[34px] leading-none font-bold uppercase md:text-[40px]">
            Your Requests
          </h1>
          <p className="mt-2 text-[15px] text-ink-muted">
            New jobs and questions sent by {ctx.builderName}, with the
            office&apos;s replies.
          </p>
        </div>
        <Button asChild variant="fire">
          <Link href="/portal/requests/new">+ Submit New Job Request</Link>
        </Button>
      </div>
      {sent && (
        <Notice tone="ok">
          Request sent. The office will review it and reply here.
        </Notice>
      )}
      <div className="rounded-md border border-mortar bg-paper shadow-card">
        {!rows?.length ? (
          <p className="px-6 py-10 text-center text-ink-muted">
            No requests yet.
          </p>
        ) : (
          <ul className="divide-y divide-mortar">
            {rows.map((r) => {
              const s = STATUS[r.status];
              const title =
                r.kind === "new_job"
                  ? `New job — ${r.house_number} ${r.street}`
                  : `Question — ${r.jobs?.property_address ?? "a home"}`;
              const link = r.job_id ? `/portal/homes/${r.job_id}` : null;
              return (
                <li key={r.id} className="px-6 py-4">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="font-mono text-xs text-ink-muted">
                      #{r.request_number}
                    </span>
                    {link ? (
                      <Link
                        href={link}
                        className="font-semibold hover:text-flame"
                      >
                        {title}
                      </Link>
                    ) : (
                      <span className="font-semibold">{title}</span>
                    )}
                    <span className={cn("badge ml-auto", s.cls)}>
                      {s.label}
                    </span>
                  </div>
                  <div className="font-mono text-[11.5px] text-ink-muted">
                    SENT {md(r.created_at.slice(0, 10))}
                    {r.subdivision ? ` · ${r.subdivision.toUpperCase()}` : ""}
                  </div>
                  {r.message && (
                    <p className="mt-1.5 text-[14.5px] whitespace-pre-wrap">
                      {r.message}
                    </p>
                  )}
                  {r.response && (
                    <div className="mt-2 rounded-md border-l-[3px] border-success bg-[#2f6b4514] px-3 py-2 text-[14px]">
                      <span className="font-mono text-[11px] tracking-[0.1em] text-success uppercase">
                        Leander 3T replied
                        {r.reviewed_at
                          ? ` ${md(r.reviewed_at.slice(0, 10))}`
                          : ""}
                      </span>
                      <div className="whitespace-pre-wrap">{r.response}</div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </>
  );
}
