// The seven material order types, described once. Forms, validation, the
// job page cards, the crew manager screen and the Orders page all read from
// here, so a field added to an order type shows up everywhere.

export type OrderTypeKey =
  | "sand"
  | "mortar"
  | "lintel"
  | "arch_lintel"
  | "rock"
  | "stucco_material"
  | "paint";

export type OrderTable =
  | "sand_orders"
  | "mortar_orders"
  | "lintel_orders"
  | "arch_lintel_orders"
  | "rock_orders"
  | "stucco_material_orders"
  | "paint_orders";

export type FieldKind =
  "text" | "decimal" | "int" | "date" | "textarea" | "supplier" | "mortar";

export type OrderField = {
  name: string;
  label: string;
  kind: FieldKind;
  unit?: string;
  suggestions?: string[];
  group?: string;
  wide?: boolean;
};

type Trade = "brick" | "stone" | "stucco";

export type OrderTypeDef = {
  key: OrderTypeKey;
  label: string;
  table: OrderTable;
  /** Trades whose jobs show this card by default. */
  trades: Trade[];
  fields: OrderField[];
};

const delivery: OrderField[] = [
  { name: "requested_delivery_date", label: "Deliver by", kind: "date" },
  { name: "notes", label: "Notes", kind: "textarea", wide: true },
];

export const LINTEL_PRESETS = [
  {
    label: '3x4 (1/4")',
    lintel_type: '3x4 (1/4")',
    hole_pattern: '1 row 16" OC',
  },
  {
    label: '4x4 (3/8")',
    lintel_type: '4x4 (3/8")',
    hole_pattern: '2 rows 16" OC',
  },
] as const;

export const ORDER_TYPES: Record<OrderTypeKey, OrderTypeDef> = {
  sand: {
    key: "sand",
    label: "Sand",
    table: "sand_orders",
    trades: ["brick", "stone"],
    fields: [
      { name: "supplier_id", label: "Supplier", kind: "supplier" },
      {
        name: "sand_type",
        label: "Sand type",
        kind: "text",
        suggestions: ["Masonry", "Washed"],
      },
      { name: "yards", label: "Yards", kind: "decimal", unit: "yd" },
      { name: "bags", label: "Bags", kind: "decimal" },
      { name: "delivery_completed_date", label: "Delivered on", kind: "date" },
      ...delivery,
    ],
  },
  mortar: {
    key: "mortar",
    label: "Mortar",
    table: "mortar_orders",
    trades: ["brick", "stone"],
    fields: [
      { name: "supplier_id", label: "Supplier", kind: "supplier" },
      { name: "mortar_color_id", label: "Mortar color", kind: "mortar" },
      { name: "bags", label: "Bags", kind: "decimal" },
      ...delivery,
    ],
  },
  lintel: {
    key: "lintel",
    label: "Lintels",
    table: "lintel_orders",
    trades: ["brick"],
    fields: [
      { name: "supplier_id", label: "Supplier", kind: "supplier" },
      {
        name: "lintel_type",
        label: "Lintel",
        kind: "text",
        suggestions: ['3x4 (1/4")', '4x4 (3/8")', '4x6 (1/2")'],
      },
      { name: "quantity", label: "Quantity", kind: "int" },
      { name: "inches", label: "Length", kind: "decimal", unit: "in" },
      {
        name: "hole_pattern",
        label: "Hole pattern",
        kind: "text",
        suggestions: ['1 row 16" OC', '2 rows 16" OC', "3 holes", "No holes"],
      },
      ...delivery,
    ],
  },
  arch_lintel: {
    key: "arch_lintel",
    label: "Arch Lintels",
    table: "arch_lintel_orders",
    trades: ["brick"],
    fields: [
      { name: "supplier_id", label: "Supplier", kind: "supplier" },
      {
        name: "arch_type",
        label: "Arch type",
        kind: "text",
        wide: true,
        suggestions: [
          "Arch Lintel - All 3/16 steel with 3/16 rib in middle",
          "Double Flat - 1/2 steel",
        ],
      },
      { name: "quantity", label: "Quantity", kind: "int" },
      { name: "span_in", label: "Span", kind: "decimal", unit: "in" },
      { name: "width_in", label: "Width", kind: "decimal", unit: "in" },
      { name: "rise_in", label: "Rise", kind: "decimal", unit: "in" },
      { name: "legs", label: "Legs", kind: "int" },
      ...delivery,
    ],
  },
  rock: {
    key: "rock",
    label: "Rock / Stone",
    table: "rock_orders",
    trades: ["stone"],
    fields: [
      { name: "supplier_id", label: "Supplier", kind: "supplier" },
      { name: "color_style", label: "Color / style", kind: "text" },
      { name: "tons", label: "Tons", kind: "decimal" },
      {
        name: "stone_drop_ft",
        label: "Stone drop",
        kind: "decimal",
        unit: "ft",
      },
      {
        name: "brick_drop_ft",
        label: "Brick drop",
        kind: "decimal",
        unit: "ft",
      },
      ...delivery,
    ],
  },
  stucco_material: {
    key: "stucco_material",
    label: "Stucco Supply",
    table: "stucco_material_orders",
    trades: ["stucco"],
    fields: [
      { name: "supplier_id", label: "Supplier", kind: "supplier" },
      { name: "delivery_phone", label: "Delivery phone", kind: "text" },
      {
        name: "sand_supplier",
        label: "Sand supplier",
        kind: "text",
        group: "Sand",
      },
      {
        name: "sand_type",
        label: "Sand type",
        kind: "text",
        group: "Sand",
        suggestions: ["Washed", "Masonry"],
      },
      {
        name: "sand_yards",
        label: "Sand",
        kind: "decimal",
        unit: "yd",
        group: "Sand",
      },
      { name: "sand_notes", label: "Sand notes", kind: "text", group: "Sand" },
      {
        name: "mortar_supplier",
        label: "Mortar supplier",
        kind: "text",
        group: "Mortar",
        suggestions: ["Mastercast", "AHI"],
      },
      {
        name: "mortar_color_id",
        label: "Mortar color",
        kind: "mortar",
        group: "Mortar",
      },
      {
        name: "mortar_bags",
        label: "Mortar",
        kind: "decimal",
        unit: "bags",
        group: "Mortar",
      },
      {
        name: "mortar_notes",
        label: "Mortar notes",
        kind: "text",
        group: "Mortar",
      },
      {
        name: "other_items_notes",
        label: "Other items",
        kind: "textarea",
        wide: true,
      },
      ...delivery,
    ],
  },
  paint: {
    key: "paint",
    label: "Paint",
    table: "paint_orders",
    trades: ["stucco"],
    fields: [
      { name: "supplier_id", label: "Supplier", kind: "supplier" },
      { name: "body_item_number", label: "Body color / item #", kind: "text" },
      { name: "body_gallons", label: "Body", kind: "decimal", unit: "gal" },
      { name: "trim_item_number", label: "Trim color / item #", kind: "text" },
      { name: "trim_gallons", label: "Trim", kind: "decimal", unit: "gal" },
      { name: "picked_up_by", label: "Picked up by", kind: "text" },
      { name: "delivery_phone", label: "Delivery phone", kind: "text" },
      ...delivery,
    ],
  },
};

export const ORDER_TYPE_LIST: OrderTypeDef[] = Object.values(ORDER_TYPES);

export const isOrderType = (v: string): v is OrderTypeKey => v in ORDER_TYPES;

// ---------------------------------------------------------------- summaries
type Row = Record<string, unknown>;
const n = (v: unknown, digits = 2) => {
  if (v === null || v === undefined || v === "") return null;
  const x = Number(v);
  return Number.isFinite(x)
    ? x.toLocaleString("en-US", { maximumFractionDigits: digits })
    : null;
};
const join = (...parts: unknown[]) =>
  parts
    .filter((p) => p !== null && p !== undefined && p !== false && p !== "")
    .join(" · ");
const md = (d: unknown) =>
  typeof d === "string" && d ? `${d.slice(5, 7)}/${d.slice(8, 10)}` : null;

/** One-line description of an order, as the office says it. */
export function orderMain(
  type: OrderTypeKey,
  o: Row,
  names: { mortar?: string | null; itemCount?: number },
) {
  switch (type) {
    case "sand":
      return join(
        o.sand_type ? `${o.sand_type} sand` : "Sand",
        n(o.yards) && `${n(o.yards)} yards`,
        n(o.bags) && `${n(o.bags)} bags`,
      );
    case "mortar":
      return join(names.mortar ?? "Mortar", n(o.bags) && `${n(o.bags)} bags`);
    case "lintel":
      return join(
        o.lintel_type ?? "Lintel",
        n(o.quantity) && `Qty ${n(o.quantity)}`,
        n(o.inches) && `${n(o.inches)}"`,
      );
    case "arch_lintel":
      return join(
        `Arch — Span ${n(o.span_in) ?? "?"}"`,
        `W ${n(o.width_in) ?? "?"}`,
        `R ${n(o.rise_in) ?? "?"}`,
        `Legs ${n(o.legs) ?? "?"}`,
        n(o.quantity) && Number(o.quantity) !== 1 && `Qty ${n(o.quantity)}`,
      );
    case "rock":
      return join(o.color_style ?? "Rock", n(o.tons) && `${n(o.tons)} tons`);
    case "stucco_material":
      return join(
        `${names.itemCount ?? 0} line items`,
        n(o.sand_yards) && `${n(o.sand_yards)} yd sand`,
        n(o.mortar_bags) && `${n(o.mortar_bags)} bags mortar`,
      );
    case "paint":
      return (
        join(
          o.body_item_number &&
            `Body ${o.body_item_number}${n(o.body_gallons) ? ` · ${n(o.body_gallons)} gal` : ""}`,
          o.trim_item_number &&
            `Trim ${o.trim_item_number}${n(o.trim_gallons) ? ` · ${n(o.trim_gallons)} gal` : ""}`,
        ) || "Paint"
      );
  }
}

/** Second line: supplier and dates. */
export function orderSub(
  type: OrderTypeKey,
  o: Row,
  supplier: string | null | undefined,
) {
  return join(
    supplier,
    type === "lintel" && o.hole_pattern,
    type === "rock" &&
      n(o.stone_drop_ft) &&
      `Incl. ${n(o.stone_drop_ft)} ft stone drop`,
    o.ordered && md(o.ordered_date) && `Ordered ${md(o.ordered_date)}`,
    md(o.requested_delivery_date) && `Deliver ${md(o.requested_delivery_date)}`,
  );
}
