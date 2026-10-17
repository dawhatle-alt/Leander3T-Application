import { z } from "zod";
import { ORDER_TYPE_LIST } from "@/lib/orders/types";

// The lists Administration keeps: builders and their construction managers,
// suppliers, crews and the color picklists. Described once here; the add/edit
// dialog, its validation and the server action all read from it. Records are
// never removed, only switched off, so history keeps pointing at them.

export type EntityKind =
  | "builder"
  | "construction_manager"
  | "supplier"
  | "crew"
  | "brick_color"
  | "mortar_color";

export type EntityTable =
  | "builders"
  | "construction_managers"
  | "suppliers"
  | "crews"
  | "brick_colors"
  | "mortar_colors";

export type Option = { value: string; label: string };
/** Picklists the server provides for select fields. */
export type EntityOptions = {
  builders: Option[];
  crewManagers: Option[];
};

type Kind = "text" | "email" | "tel" | "textarea" | "int" | "select" | "checks";

export type EntityField = {
  name: string;
  label: string;
  kind: Kind;
  required?: boolean;
  wide?: boolean;
  placeholder?: string;
  /** Static choices, or the name of a server-provided picklist. */
  options?: Option[] | keyof EntityOptions;
};

export type EntityDef = {
  kind: EntityKind;
  table: EntityTable;
  label: string;
  fields: EntityField[];
  /** Pages to refresh after a change. */
  paths: string[];
};

export const TRADE_OPTIONS: Option[] = [
  { value: "brick", label: "Brick" },
  { value: "stone", label: "Stone" },
  { value: "stucco", label: "Stucco" },
];

const colorFields: EntityField[] = [
  { name: "name", label: "Name", kind: "text", required: true },
  {
    name: "sort_order",
    label: "Position in list",
    kind: "int",
    placeholder: "10, 20, 30…",
  },
];

export const ENTITIES: Record<EntityKind, EntityDef> = {
  builder: {
    kind: "builder",
    table: "builders",
    label: "Builder",
    paths: ["/admin/builders"],
    fields: [
      { name: "name", label: "Builder name", kind: "text", required: true },
      { name: "contact_name", label: "Main contact", kind: "text" },
      { name: "contact_phone", label: "Contact phone", kind: "tel" },
      { name: "contact_email", label: "Contact email", kind: "email" },
      { name: "notes", label: "Notes", kind: "textarea", wide: true },
    ],
  },
  construction_manager: {
    kind: "construction_manager",
    table: "construction_managers",
    label: "Construction Manager",
    paths: ["/admin/builders"],
    fields: [
      {
        name: "builder_id",
        label: "Builder",
        kind: "select",
        required: true,
        options: "builders",
      },
      { name: "name", label: "Name", kind: "text", required: true },
      { name: "phone", label: "Phone", kind: "tel" },
      { name: "email", label: "Email", kind: "email" },
    ],
  },
  supplier: {
    kind: "supplier",
    table: "suppliers",
    label: "Supplier",
    paths: ["/admin/suppliers"],
    fields: [
      { name: "name", label: "Supplier name", kind: "text", required: true },
      { name: "email", label: "Order email", kind: "email" },
      { name: "phone", label: "Phone", kind: "tel" },
      {
        name: "order_types",
        label: "Supplies",
        kind: "checks",
        wide: true,
        options: ORDER_TYPE_LIST.map((t) => ({ value: t.key, label: t.label })),
      },
    ],
  },
  crew: {
    kind: "crew",
    table: "crews",
    label: "Crew",
    paths: ["/admin/crews"],
    fields: [
      { name: "name", label: "Crew name", kind: "text", required: true },
      {
        name: "trade",
        label: "Trade",
        kind: "select",
        required: true,
        options: TRADE_OPTIONS,
      },
      {
        name: "crew_manager_id",
        label: "Crew manager",
        kind: "select",
        options: "crewManagers",
        wide: true,
      },
    ],
  },
  brick_color: {
    kind: "brick_color",
    table: "brick_colors",
    label: "Brick Color",
    paths: ["/admin/colors"],
    fields: colorFields,
  },
  mortar_color: {
    kind: "mortar_color",
    table: "mortar_colors",
    label: "Mortar Color",
    paths: ["/admin/colors"],
    fields: colorFields,
  },
};

export const isEntityKind = (v: string): v is EntityKind => v in ENTITIES;

export type EntityValues = Record<string, string | string[]>;

/** Validation built from the field list: form strings in, row values out. */
export function entitySchema(kind: EntityKind) {
  const shape: Record<string, z.ZodType> = {};
  for (const f of ENTITIES[kind].fields) {
    const req = (s: z.ZodString) =>
      f.required ? s.min(1, `${f.label} is required.`) : s;
    const empty = (v: string) => (v === "" ? null : v);
    switch (f.kind) {
      case "checks": {
        const allowed = (f.options as Option[]).map((o) => o.value);
        shape[f.name] = z
          .array(z.string())
          .default([])
          .refine(
            (a) => a.every((v) => allowed.includes(v)),
            "Pick from the list.",
          );
        break;
      }
      case "int":
        shape[f.name] = z
          .string()
          .trim()
          .refine((v) => v === "" || /^\d{1,5}$/.test(v), "Whole number.")
          .transform((v) => (v === "" ? 0 : Number(v)));
        break;
      case "email":
        shape[f.name] = req(z.string().trim().max(200))
          .refine(
            (v) => v === "" || z.email().safeParse(v).success,
            "Enter a valid email address.",
          )
          .transform((v) => (v === "" ? null : v.toLowerCase()));
        break;
      case "select": {
        const fixed = Array.isArray(f.options)
          ? f.options.map((o) => o.value)
          : null;
        shape[f.name] = req(z.string().trim())
          .refine(
            (v) =>
              v === "" ||
              (fixed ? fixed.includes(v) : z.guid().safeParse(v).success),
            "Pick from the list.",
          )
          .transform(empty);
        break;
      }
      default:
        shape[f.name] = req(
          z
            .string()
            .trim()
            .max(f.kind === "textarea" ? 4000 : 200),
        ).transform(empty);
    }
  }
  return z.object(shape);
}

export function emptyValues(kind: EntityKind): EntityValues {
  const v: EntityValues = {};
  for (const f of ENTITIES[kind].fields)
    v[f.name] = f.kind === "checks" ? [] : "";
  return v;
}

/** A database row as form values. */
export function rowToValues(
  kind: EntityKind,
  row: Record<string, unknown>,
): EntityValues {
  const v: EntityValues = {};
  for (const f of ENTITIES[kind].fields) {
    const x = row[f.name];
    v[f.name] =
      f.kind === "checks"
        ? ((x as string[] | null) ?? [])
        : x === null || x === undefined
          ? ""
          : String(x);
  }
  return v;
}
