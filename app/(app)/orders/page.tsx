import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, X } from "lucide-react";
import { AddressFilter } from "@/components/orders/address-filter";
import { MarkOrderedButton } from "@/components/orders/mark-ordered-button";
import { PageHead } from "@/components/shell/page-bits";
import { shortDate } from "@/lib/jobs/format";
import { requireProfile } from "@/lib/auth/session";
import { loadOrderJob, loadOrderOptions, loadOrders } from "@/lib/orders/data";
import { countPendingForms } from "@/lib/order-forms/data";
import { ORDER_TYPES, ORDER_TYPE_LIST, isOrderType } from "@/lib/orders/types";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Orders — Leander 3T" };

type SP = Record<string, string | undefined>;

const RECENT_DAYS = 30;
const GUID = /^[0-9a-f-]{36}$/i;

function href(sp: SP, patch: SP) {
  const next = new URLSearchParams();
  for (const [k, v] of Object.entries({ ...sp, ...patch }))
    if (v) next.set(k, v);
  const s = next.toString();
  return s ? `/orders?${s}` : "/orders";
}

// Every material order across jobs: what still needs ordering (drafts,
// including crew manager requests) and what was placed recently. The office
// can also narrow it to one address (?job=) to see that house's full history.
export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<SP>;
}) {
  const me = await requireProfile();
  const sp = await searchParams;
  const canPlace = me.role === "admin" || me.role === "supervisor";
  // Orders-for-an-address is an office view (Administration and supervisors).
  const byAddress = canPlace;
  const jobId = byAddress && sp.job && GUID.test(sp.job) ? sp.job : undefined;
  // One address shows its whole history by default; the across-jobs view
  // starts on what still needs ordering.
  const status: "pending" | "ordered" | "all" =
    sp.status === "ordered"
      ? "ordered"
      : jobId && sp.status !== "pending"
        ? "all"
        : "pending";
  const type = sp.type && isOrderType(sp.type) ? sp.type : undefined;
  const supplierId =
    sp.supplier && GUID.test(sp.supplier) ? sp.supplier : undefined;

  const since = new Date(Date.now() - RECENT_DAYS * 864e5);
  const sinceIso = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Chicago",
  }).format(since);

  const [orders, options, formsToReview, job] = await Promise.all([
    loadOrders({ status, type, supplierId, since: sinceIso, jobId }),
    loadOrderOptions(),
    countPendingForms(),
    jobId ? loadOrderJob(jobId) : null,
  ]);
  const placed = orders.filter((o) => o.ordered).length;
  const plural = (n: number) => `${n} order${n === 1 ? "" : "s"}`;
  // Filters other than the address, carried along when an address is picked.
  const keep: Record<string, string> = {};
  if (type) keep.type = type;
  if (supplierId) keep.supplier = supplierId;

  return (
    <>
      <PageHead
        title="Orders"
        sub={
          jobId
            ? status === "all"
              ? `${plural(orders.length)} for this address · ${placed} placed · ${orders.length - placed} draft.`
              : status === "pending"
                ? `${plural(orders.length)} for this address waiting to be placed.`
                : `${plural(orders.length)} placed for this address, newest first.`
            : status === "pending"
              ? `${plural(orders.length)} waiting to be placed, soonest delivery first.`
              : `${plural(orders.length)} placed in the last ${RECENT_DAYS} days.`
        }
      >
        {me.role !== "crew_manager" && (
          <Link
            href="/orders/forms"
            className="inline-flex items-center gap-2 rounded-md border-[1.5px] border-mortar-2 bg-paper px-4 py-2 text-[14px] font-bold hover:border-flame hover:text-flame"
          >
            Order Forms
            {formsToReview > 0 && (
              <span className="rounded-full bg-flame px-2 py-0.5 font-mono text-[11px] text-white">
                {formsToReview} to review
              </span>
            )}
          </Link>
        )}
      </PageHead>

      {jobId && (
        <div className="mb-[18px] flex flex-wrap items-center gap-x-5 gap-y-3 rounded-md border border-l-[3px] border-mortar border-l-chalk bg-paper px-5 py-3.5 shadow-card">
          <div className="min-w-0 flex-1">
            <div className="font-mono text-[11px] tracking-[0.14em] text-ink-muted uppercase">
              Orders for address
            </div>
            <div className="font-display text-[24px] leading-tight font-bold uppercase">
              {job?.address ?? "Address not found"}
            </div>
            {job && (job.subdivision || job.builder) && (
              <div className="text-[13px] text-ink-muted">
                {[job.subdivision, job.builder].filter(Boolean).join(" · ")}
              </div>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {job && (
              <Link
                href={`/jobs/${job.id}`}
                className="inline-flex items-center gap-1.5 rounded-md border-[1.5px] border-mortar-2 bg-paper px-3 py-1.5 text-[13px] font-bold hover:border-flame hover:text-flame"
              >
                Open job <ArrowUpRight className="size-3.5" aria-hidden />
              </Link>
            )}
            <Link
              href={href(sp, { job: undefined, status: undefined })}
              className="inline-flex items-center gap-1.5 rounded-md border-[1.5px] border-mortar-2 bg-limestone px-3 py-1.5 text-[13px] font-bold hover:border-flame hover:text-flame"
            >
              <X className="size-3.5" aria-hidden /> All addresses
            </Link>
          </div>
        </div>
      )}

      <div className="mb-[22px] flex flex-wrap items-center gap-2.5">
        {jobId && (
          <Link
            href={href(sp, { status: undefined })}
            className="fchip"
            aria-current={status === "all"}
          >
            All
          </Link>
        )}
        <Link
          href={href(sp, { status: jobId ? "pending" : undefined })}
          className="fchip"
          aria-current={status === "pending"}
        >
          To Order
        </Link>
        <Link
          href={href(sp, { status: "ordered" })}
          className="fchip"
          aria-current={status === "ordered"}
        >
          Ordered
        </Link>
        <form action="/orders" className="ml-auto flex flex-wrap gap-2.5">
          {sp.status && status !== "all" && (
            <input type="hidden" name="status" value={status} />
          )}
          {jobId && <input type="hidden" name="job" value={jobId} />}
          <label htmlFor="f-type" className="sr-only">
            Order type
          </label>
          <select
            id="f-type"
            name="type"
            defaultValue={type ?? ""}
            className="input w-auto py-2"
          >
            <option value="">All types</option>
            {ORDER_TYPE_LIST.map((d) => (
              <option key={d.key} value={d.key}>
                {d.label}
              </option>
            ))}
          </select>
          <label htmlFor="f-supplier" className="sr-only">
            Supplier
          </label>
          <select
            id="f-supplier"
            name="supplier"
            defaultValue={supplierId ?? ""}
            className="input w-auto py-2"
          >
            <option value="">All suppliers</option>
            {options.suppliers.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="rounded-sm bg-charcoal px-4 py-2 text-[13.5px] font-bold text-limestone"
          >
            Filter
          </button>
        </form>
        {byAddress && (
          <div className="basis-full sm:ml-auto sm:basis-auto">
            <AddressFilter keep={keep} />
          </div>
        )}
      </div>

      <div className="rounded-md border border-mortar bg-paper shadow-card">
        {orders.length === 0 ? (
          <p className="px-6 py-10 text-center text-ink-muted">
            {jobId
              ? status === "pending"
                ? "Nothing waiting to be ordered for this address."
                : status === "ordered"
                  ? "No orders placed for this address yet."
                  : "No orders for this address yet."
              : status === "pending"
                ? "Nothing waiting to be ordered."
                : "No orders placed in that period."}
          </p>
        ) : (
          <ul className="divide-y divide-mortar">
            {orders.map((o) => (
              <li
                key={`${o.type}-${o.id}`}
                className="flex flex-wrap items-start gap-x-4 gap-y-2 px-5 py-3.5"
              >
                <span className="w-[52px] flex-none pt-0.5 font-mono text-xs text-ink-muted">
                  {o.number ? `#${o.number}` : "—"}
                </span>
                <div className="min-w-0 flex-1 basis-[260px]">
                  <div className="font-semibold">
                    <span className="mr-2 font-mono text-[11px] tracking-[0.12em] text-flame uppercase">
                      {ORDER_TYPES[o.type].label}
                    </span>
                    {o.main}
                  </div>
                  <div className="text-[12.5px] text-ink-muted">
                    {o.job &&
                      (byAddress && !jobId ? (
                        <>
                          <Link
                            href={href(sp, {
                              job: o.job.id,
                              status: undefined,
                            })}
                            title="All orders for this address"
                            className="font-semibold text-ink underline decoration-mortar-2 decoration-dotted underline-offset-[3px] hover:text-flame hover:decoration-flame"
                          >
                            {o.job.address}
                          </Link>
                          <Link
                            href={`/jobs/${o.job.id}`}
                            aria-label={`Open job ${o.job.address}`}
                            title="Open job"
                            className="ml-1 inline-flex align-[-2px] text-ink-muted hover:text-flame"
                          >
                            <ArrowUpRight className="size-3.5" aria-hidden />
                          </Link>
                        </>
                      ) : (
                        <Link
                          href={`/jobs/${o.job.id}`}
                          className="font-semibold text-ink hover:text-flame"
                        >
                          {o.job.address}
                        </Link>
                      ))}
                    {o.job?.builder && ` · ${o.job.builder}`}
                    {o.supplierName && ` · ${o.supplierName}`}
                    {!o.ordered &&
                      o.requestedBy &&
                      ` · Requested by ${o.requestedBy}`}
                  </div>
                </div>
                <div className="flex flex-none items-center gap-3">
                  <span className="text-right font-mono text-[12px] text-ink-muted">
                    {o.ordered
                      ? `ORDERED ${shortDate(o.orderedDate)}`
                      : o.requestedDate
                        ? `DELIVER ${shortDate(o.requestedDate)}`
                        : "NO DATE"}
                  </span>
                  {!o.ordered && canPlace && o.job ? (
                    <MarkOrderedButton
                      type={o.type}
                      jobId={o.job.id}
                      orderId={o.id}
                    />
                  ) : (
                    <span
                      className={cn("badge", o.ordered ? "b-done" : "b-new")}
                    >
                      {o.ordered ? "Ordered" : "Draft"}
                    </span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
