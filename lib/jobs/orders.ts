import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";
import { num, shortDate } from "./format";

export type OrderRow = {
  id: string;
  type: string;
  number: number | string | null;
  main: string;
  sub: string;
  ordered: boolean;
};

const when = (o: {
  ordered: boolean;
  ordered_date: string | null;
  requested_delivery_date: string | null;
}) =>
  [
    o.ordered && o.ordered_date ? `Ordered ${shortDate(o.ordered_date)}` : null,
    o.requested_delivery_date
      ? `Deliver ${shortDate(o.requested_delivery_date)}`
      : null,
  ]
    .filter(Boolean)
    .join(" · ");

const join = (...parts: (string | number | null | undefined | false)[]) =>
  parts.filter(Boolean).join(" · ");

// Every material order on a job, as one list for the job page summary.
// Read-only here; adding and editing orders arrives with M5.
export async function loadJobOrders(
  supabase: SupabaseClient<Database>,
  jobId: string,
): Promise<OrderRow[]> {
  const base =
    "id, order_number, ordered, ordered_date, requested_delivery_date, suppliers(name)";
  const [sand, mortar, lintel, arch, rock, stucco, paint] = await Promise.all([
    supabase
      .from("sand_orders")
      .select(`${base}, sand_type, yards, bags`)
      .eq("job_id", jobId),
    supabase
      .from("mortar_orders")
      .select(`${base}, bags, mortar_colors(name)`)
      .eq("job_id", jobId),
    supabase
      .from("lintel_orders")
      .select(`${base}, lintel_type, quantity, inches, hole_pattern`)
      .eq("job_id", jobId),
    supabase
      .from("arch_lintel_orders")
      .select(`${base}, arch_type, quantity, span_in, width_in, rise_in, legs`)
      .eq("job_id", jobId),
    supabase
      .from("rock_orders")
      .select(`${base}, color_style, tons, stone_drop_ft`)
      .eq("job_id", jobId),
    supabase
      .from("stucco_material_orders")
      .select(`${base}, sand_yards, mortar_bags, stucco_order_items(item_code)`)
      .eq("job_id", jobId),
    supabase
      .from("paint_orders")
      .select(
        `${base}, body_item_number, body_gallons, trim_item_number, trim_gallons`,
      )
      .eq("job_id", jobId),
  ]);

  const rows: OrderRow[] = [];
  for (const o of sand.data ?? [])
    rows.push({
      id: o.id,
      type: "Sand",
      number: o.order_number,
      ordered: o.ordered,
      main: join(
        o.sand_type ? `${o.sand_type} sand` : "Sand",
        o.yards && `${num(o.yards)} yards`,
        o.bags && `${num(o.bags)} bags`,
      ),
      sub: join(o.suppliers?.name, when(o)),
    });
  for (const o of mortar.data ?? [])
    rows.push({
      id: o.id,
      type: "Mortar",
      number: o.order_number,
      ordered: o.ordered,
      main: join(
        o.mortar_colors?.name ?? "Mortar",
        o.bags && `${num(o.bags)} bags`,
      ),
      sub: join(o.suppliers?.name, when(o)),
    });
  for (const o of lintel.data ?? [])
    rows.push({
      id: o.id,
      type: "Lintels",
      number: o.order_number,
      ordered: o.ordered,
      main: join(
        o.lintel_type,
        o.quantity && `Qty ${num(o.quantity)}`,
        o.inches && `${num(o.inches)}"`,
      ),
      sub: join(o.hole_pattern, when(o)),
    });
  for (const o of arch.data ?? [])
    rows.push({
      id: o.id,
      type: "Lintels",
      number: o.order_number,
      ordered: o.ordered,
      main: `Arch — Span ${num(o.span_in)}" · W ${num(o.width_in)} · R ${num(o.rise_in)} · Legs ${num(o.legs)}`,
      sub: join(o.arch_type, when(o)),
    });
  for (const o of rock.data ?? [])
    rows.push({
      id: o.id,
      type: "Rock / Stone",
      number: o.order_number,
      ordered: o.ordered,
      main: join(o.color_style ?? "Rock", o.tons && `${num(o.tons)} tons`),
      sub: join(
        o.suppliers?.name,
        o.stone_drop_ft && `Incl. ${num(o.stone_drop_ft)} ft stone drop`,
        when(o),
      ),
    });
  for (const o of stucco.data ?? [])
    rows.push({
      id: o.id,
      type: "Stucco Supply",
      number: o.order_number,
      ordered: o.ordered,
      main: join(
        `${o.stucco_order_items.length} line items`,
        o.sand_yards && `${num(o.sand_yards)} yd sand`,
        o.mortar_bags && `${num(o.mortar_bags)} bags`,
      ),
      sub: join(o.suppliers?.name, when(o)),
    });
  for (const o of paint.data ?? [])
    rows.push({
      id: o.id,
      type: "Paint",
      number: o.order_number,
      ordered: o.ordered,
      main:
        join(
          o.body_item_number &&
            `Body ${o.body_item_number} · ${num(o.body_gallons)} gal`,
          o.trim_item_number &&
            `Trim ${o.trim_item_number} · ${num(o.trim_gallons)} gal`,
        ) || "Paint",
      sub: join(o.suppliers?.name, when(o)),
    });
  return rows;
}
