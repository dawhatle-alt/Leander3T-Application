import type { Metadata } from "next";
import Link from "next/link";
import { MarkOrderedButton } from "@/components/orders/mark-ordered-button";
import { PageHead } from "@/components/shell/page-bits";
import { shortDate } from "@/lib/jobs/format";
import { requireProfile } from "@/lib/auth/session";
import { loadOrderOptions, loadOrders } from "@/lib/orders/data";
import { ORDER_TYPES, ORDER_TYPE_LIST, isOrderType } from "@/lib/orders/types";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Orders — Leander 3T" };

type SP = Record<string, string | undefined>;

const RECENT_DAYS = 30;

function href(sp: SP, patch: SP) {
  const next = new URLSearchParams();
  for (const [k, v] of Object.entries({ ...sp, ...patch }))
    if (v) next.set(k, v);
  const s = next.toString();
  return s ? `/orders?${s}` : "/orders";
}

// Every material order across jobs: what still needs ordering (drafts,
// including crew manager requests) and what was placed recently.
export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<SP>;
}) {
  const me = await requireProfile();
  const sp = await searchParams;
  const status = sp.status === "ordered" ? "ordered" : "pending";
  const type = sp.type && isOrderType(sp.type) ? sp.type : undefined;
  const supplierId =
    sp.supplier && /^[0-9a-f-]{36}$/i.test(sp.supplier)
      ? sp.supplier
      : undefined;

  const since = new Date(Date.now() - RECENT_DAYS * 864e5);
  const sinceIso = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Chicago",
  }).format(since);

  const [orders, options] = await Promise.all([
    loadOrders({ status, type, supplierId, since: sinceIso }),
    loadOrderOptions(),
  ]);
  const canPlace = me.role === "admin" || me.role === "supervisor";

  return (
    <>
      <PageHead
        title="Orders"
        sub={
          status === "pending"
            ? `${orders.length} order${orders.length === 1 ? "" : "s"} waiting to be placed, soonest delivery first.`
            : `${orders.length} order${orders.length === 1 ? "" : "s"} placed in the last ${RECENT_DAYS} days.`
        }
      />

      <div className="mb-[22px] flex flex-wrap items-center gap-2.5">
        <Link
          href={href(sp, { status: undefined })}
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
          {status === "ordered" && (
            <input type="hidden" name="status" value="ordered" />
          )}
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
      </div>

      <div className="rounded-md border border-mortar bg-paper shadow-card">
        {orders.length === 0 ? (
          <p className="px-6 py-10 text-center text-ink-muted">
            {status === "pending"
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
                    {o.job && (
                      <Link
                        href={`/jobs/${o.job.id}`}
                        className="font-semibold text-ink hover:text-flame"
                      >
                        {o.job.address}
                      </Link>
                    )}
                    {o.job?.builder && ` · ${o.job.builder}`}
                    {o.supplierName && ` · ${o.supplierName}`}
                    {!o.ordered &&
                      o.createdByName &&
                      ` · Requested by ${o.createdByName}`}
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
