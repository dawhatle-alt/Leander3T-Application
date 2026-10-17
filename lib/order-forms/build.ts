import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";
import type { OrderFormData } from "@/lib/pdf/order-form";
import { ORDER_TYPES, type OrderTypeKey } from "@/lib/orders/types";

// Gathers what an order form prints, read as the signed-in person.

export type FormLayout = Database["public"]["Enums"]["order_form_layout"];
export type FormOrderRef = { type: OrderTypeKey; id: string; number: number };

export const LAYOUT_LABEL: Record<FormLayout, string> = {
  masonry: "Masonry",
  stucco: "Stucco Supply",
  paint: "Paint",
};

/** Order types that go on each layout. */
export const LAYOUT_TYPES: Record<FormLayout, OrderTypeKey[]> = {
  masonry: ["lintel", "arch_lintel", "sand", "mortar", "rock"],
  stucco: ["stucco_material"],
  paint: ["paint"],
};

export const layoutFor = (type: OrderTypeKey): FormLayout =>
  type === "stucco_material"
    ? "stucco"
    : type === "paint"
      ? "paint"
      : "masonry";

type Supa = SupabaseClient<Database>;
type Row = Record<string, unknown>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Loose = any;
const table = (supabase: Supa, type: OrderTypeKey): Loose =>
  supabase.from(ORDER_TYPES[type].table as "sand_orders");

const COMPANY: Record<string, string> = {
  leander_3t: "Leander 3T",
  "3t_construction_solutions": "3T Construction Solutions",
};

const txt = (v: unknown) =>
  v === null || v === undefined ? "" : String(v).trim();
const n = (v: unknown) => {
  if (v === null || v === undefined || v === "") return "";
  const x = Number(v);
  return Number.isFinite(x)
    ? x.toLocaleString("en-US", { maximumFractionDigits: 2 })
    : "";
};
const mdy = (d: unknown) => {
  const s = txt(d);
  if (!s) return "";
  const [y, m, day] = s.split("-");
  return `${m}/${day}/${y}`;
};
const name = (v: unknown) => (v as { name?: string } | null)?.name ?? "";

/** Unplaced orders that would go on a new masonry form for this job. */
export async function unplacedMasonryOrders(
  supabase: Supa,
  jobId: string,
): Promise<FormOrderRef[]> {
  const lists = await Promise.all(
    LAYOUT_TYPES.masonry.map(async (type) => {
      const { data } = await table(supabase, type)
        .select("id, order_number")
        .eq("job_id", jobId)
        .eq("ordered", false)
        .order("order_number");
      return ((data ?? []) as Row[]).map((o) => ({
        type,
        id: String(o.id),
        number: Number(o.order_number),
      }));
    }),
  );
  return lists.flat();
}

async function loadRows(supabase: Supa, type: OrderTypeKey, ids: string[]) {
  if (!ids.length) return [] as Row[];
  const embeds = [
    "*",
    "suppliers(name)",
    type === "mortar" || type === "stucco_material"
      ? "mortar_colors(name)"
      : "",
    type === "stucco_material"
      ? "stucco_order_items(item_code, quantity, unit)"
      : "",
  ]
    .filter(Boolean)
    .join(", ");
  const { data } = await table(supabase, type)
    .select(embeds)
    .in("id", ids)
    .order("order_number");
  return (data ?? []) as Row[];
}

/**
 * Builds the printable form for a set of orders on one job. Orders that no
 * longer exist are dropped; returns null if none are left.
 */
export async function buildFormData(
  supabase: Supa,
  jobId: string,
  layout: FormLayout,
  refs: FormOrderRef[],
  generatedBy: string,
): Promise<{ data: OrderFormData; refs: FormOrderRef[] } | null> {
  const { data: job } = await supabase
    .from("jobs")
    .select("property_address, subdivision, area, company, builders(name)")
    .eq("id", jobId)
    .maybeSingle();
  if (!job) return null;

  const byType = new Map<OrderTypeKey, Row[]>();
  await Promise.all(
    LAYOUT_TYPES[layout].map(async (type) => {
      const ids = refs.filter((r) => r.type === type).map((r) => r.id);
      byType.set(type, await loadRows(supabase, type, ids));
    }),
  );
  const all = [...byType.values()].flat();
  if (!all.length) return null;
  const kept: FormOrderRef[] = LAYOUT_TYPES[layout].flatMap((type) =>
    (byType.get(type) ?? []).map((o) => ({
      type,
      id: String(o.id),
      number: Number(o.order_number),
    })),
  );

  const first = all[0];
  const earliest = all
    .map((o) => txt(o.requested_delivery_date))
    .filter(Boolean)
    .sort()[0];

  const header = {
    propertyAddress: txt(job.property_address),
    subdivision: txt(job.subdivision),
    area: txt(job.area),
    builder: job.builders?.name ?? "",
    company: COMPANY[job.company] ?? "Leander 3T",
    requestedDate: mdy(earliest),
    deliveryPhone: layout === "masonry" ? "" : txt(first.delivery_phone),
  };

  const today = new Intl.DateTimeFormat("en-US", {
    month: "2-digit",
    day: "2-digit",
    year: "numeric",
    timeZone: "America/Chicago",
  }).format(new Date());
  const footer = `Order ${kept.map((r) => `#${r.number}`).join(", ")} · Generated ${today} by ${generatedBy}`;

  if (layout === "masonry") {
    const rows = (t: OrderTypeKey) => byType.get(t) ?? [];
    return {
      refs: kept,
      data: {
        header,
        footer,
        body: {
          layout,
          lintels: rows("lintel").map((o) => [
            txt(o.lintel_type),
            n(o.quantity),
            n(o.inches),
            txt(o.hole_pattern),
            txt(o.notes),
          ]),
          arches: rows("arch_lintel").map((o) => [
            txt(o.arch_type),
            n(o.quantity),
            n(o.span_in),
            n(o.width_in),
            n(o.rise_in),
            n(o.legs),
            txt(o.notes),
          ]),
          sand: rows("sand").map((o) => [
            name(o.suppliers),
            txt(o.sand_type),
            n(o.bags),
            n(o.yards),
            txt(o.notes),
          ]),
          mortar: rows("mortar").map((o) => [
            name(o.suppliers),
            name(o.mortar_colors),
            n(o.bags),
            txt(o.notes),
          ]),
          rock: rows("rock").map((o) => [
            name(o.suppliers),
            txt(o.color_style),
            n(o.tons),
            n(o.stone_drop_ft),
            n(o.brick_drop_ft),
            txt(o.notes),
          ]),
        },
      },
    };
  }

  if (layout === "stucco") {
    const { data: catalog } = await supabase
      .from("stucco_items")
      .select("code, name, default_unit")
      .eq("active", true)
      .order("sort_order");
    const lines = (first.stucco_order_items as Row[] | null) ?? [];
    const items = (catalog ?? []).map((c) => {
      const line = lines.find((l) => l.item_code === c.code);
      return {
        label: c.name,
        quantity: line ? `${n(line.quantity)} ${txt(line.unit)}` : "",
        group: (c.code.startsWith("foam_") || c.code === "water_table"
          ? "foam"
          : "supply") as "foam" | "supply",
      };
    });
    return {
      refs: kept,
      data: {
        header,
        footer,
        body: {
          layout,
          sandProvider: txt(first.sand_supplier),
          sandType: txt(first.sand_type),
          sandYards: n(first.sand_yards),
          sandNotes: txt(first.sand_notes),
          mortarProvider: txt(first.mortar_supplier),
          mortarType: name(first.mortar_colors),
          mortarBags: n(first.mortar_bags),
          mortarNotes: txt(first.mortar_notes),
          items,
          otherNotes: [txt(first.other_items_notes), txt(first.notes)]
            .filter(Boolean)
            .join("\n"),
        },
      },
    };
  }

  return {
    refs: kept,
    data: {
      header,
      footer,
      body: {
        layout: "paint",
        bodyColor: txt(first.body_item_number),
        bodyGallons: n(first.body_gallons),
        trimColor: txt(first.trim_item_number),
        trimGallons: n(first.trim_gallons),
        otherNotes: [
          txt(first.notes),
          txt(first.picked_up_by) && `Picked up by: ${txt(first.picked_up_by)}`,
        ]
          .filter(Boolean)
          .join("\n"),
      },
    },
  };
}
