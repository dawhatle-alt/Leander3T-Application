"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import {
  LINTEL_PRESETS,
  ORDER_TYPE_LIST,
  type OrderTypeKey,
} from "@/lib/orders/types";
import { emptyOrder, type OrderFormValues } from "@/lib/validation/order";
import { cn } from "@/lib/utils";
import {
  OrderDialog,
  type OrderOptionsProp,
  type OrderPerms,
} from "./order-dialog";

export type BoardOrder = {
  id: string;
  type: OrderTypeKey;
  number: number | null;
  main: string;
  sub: string;
  ordered: boolean;
  createdBy: string | null;
  requestedBy: string | null;
  values: OrderFormValues;
};

type Editing = {
  type: OrderTypeKey;
  order: BoardOrder | null;
  preset?: Record<string, string>;
};

// Material orders on one job: a card per order type, a row per order.
// Tap a row to view or edit; "+ Add" (or a lintel quick-add) opens a new one.
export function OrderBoard({
  jobId,
  orders,
  visibleTypes,
  defaults,
  options,
  perms,
}: {
  jobId: string;
  orders: BoardOrder[];
  visibleTypes: OrderTypeKey[];
  defaults: Partial<Record<OrderTypeKey, Record<string, string>>>;
  options: OrderOptionsProp;
  perms: OrderPerms;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState<Editing | null>(null);
  const [extra, setExtra] = useState<OrderTypeKey[]>([]);

  const shown = ORDER_TYPE_LIST.filter(
    (d) =>
      visibleTypes.includes(d.key) ||
      extra.includes(d.key) ||
      orders.some((o) => o.type === d.key),
  );
  const hidden = ORDER_TYPE_LIST.filter((d) => !shown.includes(d));

  const open = (
    type: OrderTypeKey,
    order: BoardOrder | null,
    preset?: Record<string, string>,
  ) => setEditing({ type, order, preset });

  const initialFor = (e: Editing): OrderFormValues => {
    if (e.order) return e.order.values;
    // When only one supplier carries this kind of order, pick it.
    const carriers = options.suppliers.filter((s) => s.types.includes(e.type));
    return {
      ...emptyOrder(e.type),
      ...(carriers.length === 1 ? { supplier_id: carriers[0].value } : {}),
      ...(defaults[e.type] ?? {}),
      ...(e.preset ?? {}),
    };
  };

  return (
    <>
      <div className="grid gap-5 lg:grid-cols-2">
        {shown.map((def) => {
          const rows = orders.filter((o) => o.type === def.key);
          return (
            <section
              key={def.key}
              className="rounded-md border border-mortar bg-paper shadow-card"
            >
              <header className="flex flex-wrap items-center gap-3 border-b border-mortar px-[22px] py-3.5">
                <h3 className="font-display text-[21px] font-bold uppercase">
                  {def.label}
                </h3>
                <span className="count-label">
                  {rows.length} {rows.length === 1 ? "order" : "orders"}
                </span>
                {perms.canOrder && (
                  <div className="ml-auto flex flex-wrap gap-2">
                    {def.key === "lintel" &&
                      LINTEL_PRESETS.map((p) => (
                        <QuickButton
                          key={p.label}
                          onClick={() =>
                            open("lintel", null, {
                              lintel_type: p.lintel_type,
                              hole_pattern: p.hole_pattern,
                              quantity: "1",
                            })
                          }
                        >
                          + {p.label}
                        </QuickButton>
                      ))}
                    <QuickButton onClick={() => open(def.key, null)}>
                      {def.key === "lintel"
                        ? "+ Other"
                        : perms.isCrew
                          ? "+ Request"
                          : "+ Add"}
                    </QuickButton>
                  </div>
                )}
              </header>
              {rows.length ? (
                <ul>
                  {rows.map((o) => (
                    <li
                      key={o.id}
                      className="border-b border-limestone last:border-b-0"
                    >
                      <button
                        type="button"
                        onClick={() => open(o.type, o)}
                        className="flex w-full items-center gap-3.5 px-[22px] py-[13px] text-left text-[14px] transition-colors hover:bg-[#fdfaf3]"
                      >
                        <span className="w-[52px] flex-none font-mono text-xs text-ink-muted">
                          {o.number ? `#${o.number}` : "—"}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block font-semibold">{o.main}</span>
                          <span className="block text-[12.5px] text-ink-muted">
                            {o.sub}
                            {!o.ordered && o.requestedBy && (
                              <>
                                {" "}
                                {o.sub ? "· " : ""}Requested by {o.requestedBy}
                              </>
                            )}
                          </span>
                        </span>
                        <span
                          className={cn(
                            "badge flex-none",
                            o.ordered ? "b-done" : "b-new",
                          )}
                        >
                          {o.ordered ? "Ordered" : "Draft"}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="px-[22px] py-4 text-[14px] text-ink-muted">
                  None yet.
                </p>
              )}
            </section>
          );
        })}
      </div>

      {perms.canOrder && hidden.length > 0 && (
        <div className="mt-4 flex flex-wrap items-center gap-2 text-[14px] text-ink-muted">
          <Plus className="size-4" aria-hidden />
          Other order types:
          {hidden.map((d) => (
            <QuickButton
              key={d.key}
              onClick={() => setExtra((x) => [...x, d.key])}
            >
              {d.label}
            </QuickButton>
          ))}
        </div>
      )}

      {editing && (
        <OrderDialog
          key={`${editing.type}-${editing.order?.id ?? "new"}`}
          jobId={jobId}
          type={editing.type}
          orderId={editing.order?.id ?? null}
          orderNumber={editing.order?.number ?? null}
          createdBy={editing.order?.createdBy ?? null}
          initial={initialFor(editing)}
          options={options}
          perms={perms}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            router.refresh();
          }}
        />
      )}
    </>
  );
}

function QuickButton({
  onClick,
  children,
}: {
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-md border-[1.5px] border-mortar-2 bg-limestone px-3 py-1.5 font-mono text-[12px] font-semibold transition-colors hover:border-flame hover:text-flame"
    >
      {children}
    </button>
  );
}
