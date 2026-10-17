import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";
import { createClient } from "@/lib/supabase/server";
import type { OrderFormValues } from "@/lib/validation/order";
import {
  ORDER_TYPES,
  ORDER_TYPE_LIST,
  orderMain,
  orderSub,
  type OrderTypeKey,
} from "./types";

type Row = Record<string, unknown>;

export type OrderRow = {
  id: string;
  type: OrderTypeKey;
  number: number | null;
  main: string;
  sub: string;
  ordered: boolean;
  orderedDate: string | null;
  requestedDate: string | null;
  createdBy: string | null;
  /** The crew manager who asked for this order; null for office-entered orders. */
  requestedBy: string | null;
  supplierId: string | null;
  supplierName: string | null;
  job?: {
    id: string;
    address: string;
    subdivision: string | null;
    builder: string | null;
  };
  values: OrderFormValues;
};

export type OrderOptions = {
  suppliers: { value: string; label: string; types: string[] }[];
  mortarColors: { value: string; label: string }[];
  stuccoItems: { code: string; name: string; unit: string }[];
};

// Order tables share a shape, so one loosely typed handle reads all seven.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Loose = any;
const table = (supabase: SupabaseClient<Database>, type: OrderTypeKey): Loose =>
  supabase.from(ORDER_TYPES[type].table as "sand_orders");

function selectFor(type: OrderTypeKey, withJob: boolean) {
  const t = ORDER_TYPES[type].table;
  return [
    "*",
    "suppliers(name)",
    `creator:profiles!${t}_created_by_fkey(full_name, role)`,
    type === "mortar" || type === "stucco_material"
      ? "mortar_colors(name)"
      : null,
    type === "stucco_material"
      ? "stucco_order_items(item_code, quantity, unit)"
      : null,
    withJob
      ? "jobs!inner(id, property_address, subdivision, builders(name))"
      : null,
  ]
    .filter(Boolean)
    .join(", ");
}

function requesterName(creator: unknown) {
  const c = creator as { full_name: string | null; role: string } | null;
  return c?.role === "crew_manager" ? c.full_name : null;
}

function toRow(type: OrderTypeKey, o: Row): OrderRow {
  const values: Record<string, string> = {};
  for (const f of ORDER_TYPES[type].fields) {
    const v = o[f.name];
    values[f.name] = v === null || v === undefined ? "" : String(v);
  }
  const items = ((o.stucco_order_items as Row[] | undefined) ?? []).map(
    (i) => ({
      code: String(i.item_code),
      quantity: i.quantity === null ? "" : String(Number(i.quantity)),
      unit: String(i.unit),
    }),
  );
  const supplierName = (o.suppliers as { name: string } | null)?.name ?? null;
  const job = o.jobs as
    | {
        id: string;
        property_address: string;
        subdivision: string | null;
        builders: { name: string } | null;
      }
    | undefined;
  return {
    id: String(o.id),
    type,
    number: (o.order_number as number | null) ?? null,
    main: orderMain(type, o, {
      mortar: (o.mortar_colors as { name: string } | null)?.name,
      itemCount: items.length,
    }),
    sub: orderSub(type, o, supplierName),
    ordered: Boolean(o.ordered),
    orderedDate: (o.ordered_date as string | null) ?? null,
    requestedDate: (o.requested_delivery_date as string | null) ?? null,
    createdBy: (o.created_by as string | null) ?? null,
    // "Requested by" names crew managers only; office drafts need no credit line.
    requestedBy: requesterName(o.creator),
    supplierId: (o.supplier_id as string | null) ?? null,
    supplierName,
    job: job && {
      id: job.id,
      address: job.property_address,
      subdivision: job.subdivision,
      builder: job.builders?.name ?? null,
    },
    values: {
      ...values,
      ordered: Boolean(o.ordered),
      items,
    } as OrderFormValues,
  };
}

/** Every order on one job, oldest first within each type. */
export async function loadJobOrders(jobId: string): Promise<OrderRow[]> {
  const supabase = await createClient();
  const results = await Promise.all(
    ORDER_TYPE_LIST.map(async (def) => {
      const { data } = await table(supabase, def.key)
        .select(selectFor(def.key, false))
        .eq("job_id", jobId)
        .order("created_at", { ascending: true });
      return ((data ?? []) as Row[]).map((o) => toRow(def.key, o));
    }),
  );
  return results.flat();
}

/** Orders across jobs for the office view. */
export async function loadOrders(filter: {
  status: "pending" | "ordered";
  type?: OrderTypeKey;
  supplierId?: string;
  since?: string;
}): Promise<OrderRow[]> {
  const supabase = await createClient();
  const types = filter.type ? [filter.type] : ORDER_TYPE_LIST.map((d) => d.key);
  const results = await Promise.all(
    types.map(async (type) => {
      let q = table(supabase, type)
        .select(selectFor(type, true))
        .eq("ordered", filter.status === "ordered");
      if (filter.supplierId) q = q.eq("supplier_id", filter.supplierId);
      if (filter.status === "ordered" && filter.since)
        q = q.gte("ordered_date", filter.since);
      const { data } = await q.limit(300);
      return ((data ?? []) as Row[]).map((o) => toRow(type, o));
    }),
  );
  const rows = results.flat();
  return filter.status === "pending"
    ? rows.sort((a, b) =>
        (a.requestedDate ?? "9999").localeCompare(b.requestedDate ?? "9999"),
      )
    : rows.sort((a, b) =>
        (b.orderedDate ?? "").localeCompare(a.orderedDate ?? ""),
      );
}

export async function loadOrderOptions(): Promise<OrderOptions> {
  const supabase = await createClient();
  const [suppliers, mortar, items] = await Promise.all([
    supabase
      .from("suppliers")
      .select("id, name, order_types")
      .eq("active", true)
      .order("name"),
    supabase
      .from("mortar_colors")
      .select("id, name")
      .eq("active", true)
      .order("sort_order")
      .order("name"),
    supabase
      .from("stucco_items")
      .select("code, name, default_unit")
      .eq("active", true)
      .order("sort_order"),
  ]);
  return {
    suppliers: (suppliers.data ?? []).map((s) => ({
      value: s.id,
      label: s.name,
      types: s.order_types,
    })),
    mortarColors: (mortar.data ?? []).map((m) => ({
      value: m.id,
      label: m.name,
    })),
    stuccoItems: (items.data ?? []).map((i) => ({
      code: i.code,
      name: i.name,
      unit: i.default_unit,
    })),
  };
}

/** Sensible starting values for a new order, taken from the job's specs. */
export function orderDefaults(
  job: Row,
): Partial<Record<OrderTypeKey, Record<string, string>>> {
  const s = (v: unknown) => (v === null || v === undefined ? "" : String(v));
  const mortar = s(job.brick_mortar_color_id) || s(job.stone_mortar_color_id);
  return {
    sand: { sand_type: "Masonry" },
    mortar: { mortar_color_id: mortar },
    rock: {
      color_style: s(job.stone_color),
      stone_drop_ft: s(job.stone_drop_ft),
    },
    stucco_material: { sand_type: "Washed" },
    paint: {
      body_item_number: s(job.stucco_body_paint_color),
      trim_item_number: s(job.stucco_trim_paint_color),
    },
  };
}
