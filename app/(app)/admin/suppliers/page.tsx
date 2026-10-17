import type { Metadata } from "next";
import {
  ActiveToggle,
  EntityEditButton,
} from "@/components/admin/entity-editor";
import { AdminRow, OffBadge, mono } from "@/components/admin/admin-bits";
import { PageHead, Panel } from "@/components/shell/page-bits";
import { rowToValues } from "@/lib/admin/entities";
import { loadEntityOptions } from "@/lib/admin/options";
import { ORDER_TYPES, isOrderType } from "@/lib/orders/types";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Suppliers — Leander 3T" };

// Material suppliers. "Supplies" decides which order types offer them.
export default async function SuppliersPage() {
  const supabase = await createClient();
  const [{ data: suppliers }, options] = await Promise.all([
    supabase
      .from("suppliers")
      .select("*")
      .order("active", { ascending: false })
      .order("name"),
    loadEntityOptions(),
  ]);

  return (
    <>
      <PageHead
        title="Suppliers"
        sub="Who supplies what. An order only offers the suppliers ticked for its type."
      >
        <EntityEditButton kind="supplier" options={options} />
      </PageHead>
      <Panel>
        <ul className="divide-y divide-mortar">
          {(suppliers ?? []).map((s) => (
            <AdminRow
              key={s.id}
              active={s.active}
              actions={
                <>
                  <EntityEditButton
                    kind="supplier"
                    id={s.id}
                    initial={rowToValues("supplier", s)}
                    options={options}
                  />
                  <ActiveToggle kind="supplier" id={s.id} active={s.active} />
                </>
              }
            >
              <div className="font-semibold">
                {s.name}
                <OffBadge active={s.active} />
              </div>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {s.order_types.filter(isOrderType).map((t) => (
                  <span
                    key={t}
                    className="rounded-full bg-limestone px-2.5 py-0.5 font-mono text-[11px] tracking-[0.08em] uppercase"
                  >
                    {ORDER_TYPES[t].label}
                  </span>
                ))}
                {s.order_types.length === 0 && (
                  <span className="text-[13px] text-chalk">
                    Not offered on any order yet
                  </span>
                )}
              </div>
              <div className={mono}>
                {[s.email, s.phone].filter(Boolean).join(" · ")}
              </div>
            </AdminRow>
          ))}
        </ul>
      </Panel>
    </>
  );
}
