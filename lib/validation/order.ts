import { z } from "zod";
import {
  ORDER_TYPES,
  type FieldKind,
  type OrderTypeKey,
} from "@/lib/orders/types";

// Validation for every order type, built from lib/orders/types.ts. Form
// values are strings; the output is what the database row takes.

const decimal = z
  .string()
  .trim()
  .refine(
    (v) => v === "" || /^\d{1,6}(\.\d{1,2})?$/.test(v.replace(/,/g, "")),
    "Enter a number.",
  )
  .transform((v) => (v === "" ? null : Number(v.replace(/,/g, ""))));

const int = z
  .string()
  .trim()
  .refine((v) => v === "" || /^\d{1,5}$/.test(v), "Whole number.")
  .transform((v) => (v === "" ? null : Number(v)));

const date = z
  .string()
  .refine((v) => v === "" || /^\d{4}-\d{2}-\d{2}$/.test(v), "Pick a date.")
  .transform((v) => v || null);

const id = z
  .string()
  .refine((v) => v === "" || /^[0-9a-f-]{36}$/i.test(v), "Pick from the list.")
  .transform((v) => v || null);

const text = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Keep it under ${max} characters.`)
    .transform((v) => v || null);

const KIND: Record<FieldKind, z.ZodType<unknown, string>> = {
  text: text(200),
  textarea: text(2000),
  decimal,
  int,
  date,
  supplier: id,
  mortar: id,
};

export const stucco_item = z.object({
  code: z.string().min(1).max(60),
  quantity: decimal,
  unit: z.string().trim().min(1).max(20),
});

export function orderSchema(type: OrderTypeKey) {
  const shape: Record<string, z.ZodType<unknown, string>> = {};
  for (const f of ORDER_TYPES[type].fields) shape[f.name] = KIND[f.kind];
  return z.object({
    ...shape,
    ordered: z.boolean(),
    items: z.array(stucco_item).max(60),
  });
}

export type StuccoItemInput = { code: string; quantity: string; unit: string };

/** Field values are strings; plus the office's "ordered" flag and stucco line items. */
export type OrderFormValues = {
  [field: string]: string | boolean | StuccoItemInput[];
  ordered: boolean;
  items: StuccoItemInput[];
};

export function emptyOrder(type: OrderTypeKey): OrderFormValues {
  const v: Record<string, string> = {};
  for (const f of ORDER_TYPES[type].fields) v[f.name] = "";
  return { ...v, ordered: false, items: [] };
}
