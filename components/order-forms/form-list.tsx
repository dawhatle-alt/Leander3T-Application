import Link from "next/link";
import { FileText } from "lucide-react";
import { stamp } from "@/lib/jobs/format";
import type { FormRow } from "@/lib/order-forms/data";
import { cn } from "@/lib/utils";
import { FormActions } from "./form-actions";

// Order forms as rows: form number, layout, job, orders on it, who made it,
// the PDF link and (for the review team) approve / regenerate.
export function FormList({
  forms,
  canReview,
  showJob = true,
  empty,
}: {
  forms: FormRow[];
  canReview: boolean;
  showJob?: boolean;
  empty: string;
}) {
  if (!forms.length)
    return <p className="px-6 py-8 text-center text-ink-muted">{empty}</p>;

  return (
    <ul className="divide-y divide-mortar">
      {forms.map((f) => {
        const approved = f.status === "approved";
        return (
          <li
            key={f.id}
            className="flex flex-wrap items-start gap-x-4 gap-y-2 px-5 py-3.5"
          >
            <span className="w-[52px] flex-none pt-0.5 font-mono text-xs text-ink-muted">
              F-{f.number}
            </span>
            <div className="min-w-0 flex-1 basis-[260px]">
              <div className="font-semibold">
                <span className="mr-2 font-mono text-[11px] tracking-[0.12em] text-flame uppercase">
                  {f.layoutLabel}
                </span>
                {showJob ? (
                  <Link href={`/jobs/${f.job.id}`} className="hover:text-flame">
                    {f.job.address}
                  </Link>
                ) : (
                  "Order Form"
                )}
                {f.version > 1 && (
                  <span className="ml-2 font-mono text-[12px] font-normal text-ink-muted">
                    v{f.version}
                  </span>
                )}
              </div>
              <div className="text-[12.5px] text-ink-muted">
                {[
                  showJob && f.job.builder,
                  `Orders ${f.orders.map((o) => `#${o.number}`).join(", ")}`,
                  `Made ${stamp(f.generatedAt)}${f.generatedBy ? ` by ${f.generatedBy}` : ""}`,
                  approved &&
                    f.reviewedAt &&
                    `Approved ${stamp(f.reviewedAt)}${f.reviewedBy ? ` by ${f.reviewedBy}` : ""}`,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </div>
            </div>
            <div className="flex flex-none flex-wrap items-center justify-end gap-2.5">
              <a
                href={`/api/order-forms/${f.id}`}
                target="_blank"
                rel="noopener"
                className="inline-flex items-center gap-1.5 rounded-[6px] border-[1.5px] border-mortar-2 px-3 py-1.5 text-[13px] font-bold whitespace-nowrap hover:border-flame hover:text-flame"
              >
                <FileText className="size-4" aria-hidden />
                View PDF
              </a>
              <span className={cn("badge", approved ? "b-done" : "b-new")}>
                {approved ? "Approved" : "In Review"}
              </span>
              <FormActions
                formId={f.id}
                approved={approved}
                canReview={canReview}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
