import type { Metadata } from "next";
import Link from "next/link";
import { ReviewControls } from "@/components/portal/review-controls";
import { PageHead } from "@/components/shell/page-bits";
import { stamp } from "@/lib/jobs/format";
import { requireProfile } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Job Requests — Leander 3T" };

const STATUS = {
  submitted: { label: "Waiting", cls: "b-new" },
  approved: { label: "Job created", cls: "b-done" },
  answered: { label: "Answered", cls: "b-done" },
  declined: { label: "Declined", cls: "b-prog" },
} as const;

// Builder portal intake: new-job requests and questions about homes.
export default async function JobRequestsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const me = await requireProfile();
  const { status: s } = await searchParams;
  const open = s !== "done";
  const canReview = me.role === "admin" || me.role === "supervisor";
  const supabase = await createClient();
  let q = supabase
    .from("job_requests")
    .select(
      "id, request_number, kind, status, house_number, street, subdivision, area, plan_name, plan_number, elevation, lot_swing, trades, brick_color, stone_color, mortar_color, stucco_colors, wanted_by, message, response, created_at, reviewed_at, job_id, builders(name), cm:construction_managers(name), submitter:profiles!job_requests_submitted_by_fkey(full_name, email, phone), reviewer:profiles!job_requests_reviewed_by_fkey(full_name), jobs(property_address)",
    );
  q = open ? q.eq("status", "submitted") : q.neq("status", "submitted");
  const { data: rows } = await q
    .order("created_at", { ascending: !open })
    .limit(200);

  return (
    <>
      <div className="mb-3 flex items-center gap-2.5 font-mono text-xs tracking-[0.1em] text-ink-muted uppercase">
        <Link href="/jobs" className="font-medium text-flame">
          Jobs
        </Link>
        <span>/</span>
        <span>Requests</span>
      </div>
      <PageHead
        title="Job Requests"
        sub={
          open
            ? `${rows?.length ?? 0} from builders waiting on the office, oldest first.`
            : "Handled requests, newest first."
        }
      />
      <div className="mb-[22px] flex flex-wrap gap-2.5">
        <Link href="/jobs/requests" className="fchip" aria-current={open}>
          Waiting
        </Link>
        <Link
          href="/jobs/requests?status=done"
          className="fchip"
          aria-current={!open}
        >
          Handled
        </Link>
      </div>
      <div className="rounded-md border border-mortar bg-paper shadow-card">
        {!rows?.length ? (
          <p className="px-6 py-10 text-center text-ink-muted">
            {open ? "No requests waiting." : "Nothing handled yet."}
          </p>
        ) : (
          <ul className="divide-y divide-mortar">
            {rows.map((r) => (
              <li key={r.id} className="px-6 py-4">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="font-mono text-xs text-ink-muted">
                    #{r.request_number}
                  </span>
                  <span className="font-mono text-[11px] tracking-[0.12em] text-flame uppercase">
                    {r.kind === "new_job" ? "New job" : "Question"}
                  </span>
                  <span className="font-semibold">
                    {r.kind === "new_job" ? (
                      `${r.house_number} ${r.street}`
                    ) : r.job_id ? (
                      <Link
                        href={`/jobs/${r.job_id}`}
                        className="hover:text-flame"
                      >
                        {r.jobs?.property_address}
                      </Link>
                    ) : (
                      "—"
                    )}
                  </span>
                  <span className={cn("badge ml-auto", STATUS[r.status].cls)}>
                    {STATUS[r.status].label}
                  </span>
                </div>
                <div className="font-mono text-[12px] text-ink-muted">
                  {[
                    r.builders?.name,
                    r.submitter?.full_name ?? r.submitter?.email,
                    r.submitter?.phone,
                    stamp(r.created_at),
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </div>
                {r.kind === "new_job" && (
                  <dl className="mt-2 grid gap-x-6 gap-y-1 text-[14px] sm:grid-cols-2">
                    {(
                      [
                        ["Subdivision", r.subdivision],
                        ["Area", r.area],
                        [
                          "Plan",
                          [
                            r.plan_name,
                            r.plan_number && `#${r.plan_number}`,
                            r.elevation && `Elev ${r.elevation}`,
                          ]
                            .filter(Boolean)
                            .join(" · "),
                        ],
                        ["Lot swing", r.lot_swing],
                        ["Trades", r.trades.join(", ")],
                        [
                          "Brick / mortar",
                          [r.brick_color, r.mortar_color]
                            .filter(Boolean)
                            .join(" / "),
                        ],
                        ["Stone", r.stone_color],
                        ["Stucco colors", r.stucco_colors],
                        ["Wanted by", r.wanted_by],
                        ["Construction manager", r.cm?.name],
                      ] as [string, string | null | undefined][]
                    )
                      .filter(([, v]) => v)
                      .map(([k, v]) => (
                        <div key={k} className="flex gap-2">
                          <dt className="text-ink-muted">{k}:</dt>
                          <dd className="font-semibold">{v}</dd>
                        </div>
                      ))}
                  </dl>
                )}
                {r.message && (
                  <p className="mt-2 max-w-[80ch] text-[14.5px] whitespace-pre-wrap">
                    {r.message}
                  </p>
                )}
                {r.response && (
                  <div className="mt-2 rounded-md border-l-[3px] border-success bg-[#2f6b4514] px-3 py-2 text-[14px]">
                    <span className="font-mono text-[11px] tracking-[0.1em] text-success uppercase">
                      Reply
                      {r.reviewer?.full_name
                        ? ` by ${r.reviewer.full_name}`
                        : ""}
                      {r.reviewed_at ? ` · ${stamp(r.reviewed_at)}` : ""}
                    </span>
                    <div className="whitespace-pre-wrap">{r.response}</div>
                    {r.status === "approved" && r.job_id && (
                      <Link
                        href={`/jobs/${r.job_id}`}
                        className="font-bold text-flame"
                      >
                        Open job →
                      </Link>
                    )}
                  </div>
                )}
                {open && canReview && (
                  <ReviewControls id={r.id} kind={r.kind} />
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
