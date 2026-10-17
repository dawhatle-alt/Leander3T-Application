import { z } from "zod";

// One schema for the job form, used by React Hook Form in the browser and by
// the server action. Form inputs are strings; the output is what the
// database row takes (numbers, dates, nulls for blanks).

const text = (max = 200) =>
  z
    .string()
    .trim()
    .max(max, `Keep it under ${max} characters.`)
    .transform((v) => v || null);

const required = (label: string, max = 200) =>
  z.string().trim().min(1, `${label} is required.`).max(max);

const measure = z
  .string()
  .trim()
  .refine(
    (v) => v === "" || /^\d{1,6}(\.\d{1,2})?$/.test(v.replace(/,/g, "")),
    "Enter a number.",
  )
  .transform((v) => (v === "" ? null : Number(v.replace(/,/g, ""))));

const percent = z
  .string()
  .trim()
  .refine(
    (v) => v === "" || (/^\d{1,3}(\.\d{1,2})?$/.test(v) && Number(v) <= 100),
    "0 to 100.",
  )
  .transform((v) => (v === "" ? null : Number(v)));

const date = z
  .string()
  .refine((v) => v === "" || /^\d{4}-\d{2}-\d{2}$/.test(v), "Pick a date.")
  .transform((v) => v || null);

const id = z
  .string()
  .refine((v) => v === "" || /^[0-9a-f-]{36}$/i.test(v), "Pick from the list.")
  .transform((v) => v || null);

const choice = <T extends string>(values: readonly [T, ...T[]]) =>
  z
    .union([z.enum(values), z.literal("")])
    .transform((v) => (v === "" ? null : (v as T)));

export const jobSchema = z.object({
  // House & builder
  company: z.enum(["leander_3t", "3t_construction_solutions"]),
  house_number: required("House number", 20),
  street: required("Street", 120),
  subdivision: text(120),
  area: text(120),
  area_directions: text(1000),
  plan_name: text(120),
  plan_number: text(40),
  elevation: text(20),
  lot_swing: choice(["right", "left", "other"] as const),
  sqft: measure,
  builder_id: id,
  construction_manager_id: id,

  // Status & dates
  status: z.enum(["new", "in_progress", "completed"]),
  completion_percent: percent,
  date_received: date,
  supply_delivery_date: date,
  targeted_completion_date: date,
  job_completed_date: date,

  // Brick
  brick_sqft: measure,
  brick_color_id: id,
  brick_mortar_color_id: id,
  brick_drop_slab_ft: measure,
  brick_detail_ft: measure,
  brick_paver_ft: measure,
  brick_start_date: date,
  brick_end_date: date,
  brick_completion_date: date,
  brick_crew_id: id,
  brick_notes: text(2000),

  // Stone
  stone_sqft: measure,
  stone_color: text(120),
  stone_mortar_color_id: id,
  stone_drop_ft: measure,
  stone_start_date: date,
  stone_end_date: date,
  stone_completion_date: date,
  stone_crew_id: id,
  stone_notes: text(2000),

  // Stucco
  stucco_sqft: measure,
  stucco_body_paint_color: text(120),
  stucco_trim_paint_color: text(120),
  stucco_percent_complete: percent,
  stucco_start_date: date,
  stucco_end_date: date,
  stucco_completion_date: date,
  stucco_crew_id: id,
  stucco_notes: text(2000),

  // Extras
  has_fireplace: z.boolean(),
  fireplace_notes: text(1000),
  additional_notes: text(4000),

  // People on the job (admins only; ignored for everyone else)
  supervisor_ids: z.array(z.string().uuid()),
  employee_ids: z.array(z.string().uuid()),
});

export type JobFormInput = z.input<typeof jobSchema>;
export type JobFormOutput = z.output<typeof jobSchema>;

export const EMPTY_JOB: JobFormInput = {
  company: "leander_3t",
  house_number: "",
  street: "",
  subdivision: "",
  area: "",
  area_directions: "",
  plan_name: "",
  plan_number: "",
  elevation: "",
  lot_swing: "",
  sqft: "",
  builder_id: "",
  construction_manager_id: "",
  status: "new",
  completion_percent: "0",
  date_received: "",
  supply_delivery_date: "",
  targeted_completion_date: "",
  job_completed_date: "",
  brick_sqft: "",
  brick_color_id: "",
  brick_mortar_color_id: "",
  brick_drop_slab_ft: "",
  brick_detail_ft: "",
  brick_paver_ft: "",
  brick_start_date: "",
  brick_end_date: "",
  brick_completion_date: "",
  brick_crew_id: "",
  brick_notes: "",
  stone_sqft: "",
  stone_color: "",
  stone_mortar_color_id: "",
  stone_drop_ft: "",
  stone_start_date: "",
  stone_end_date: "",
  stone_completion_date: "",
  stone_crew_id: "",
  stone_notes: "",
  stucco_sqft: "",
  stucco_body_paint_color: "",
  stucco_trim_paint_color: "",
  stucco_percent_complete: "",
  stucco_start_date: "",
  stucco_end_date: "",
  stucco_completion_date: "",
  stucco_crew_id: "",
  stucco_notes: "",
  has_fireplace: false,
  fireplace_notes: "",
  additional_notes: "",
  supervisor_ids: [],
  employee_ids: [],
};

/** A database row (or partial) → form strings. */
export function jobToForm(
  row: Record<string, unknown>,
  people: { supervisor_ids: string[]; employee_ids: string[] },
): JobFormInput {
  const out: Record<string, unknown> = { ...EMPTY_JOB };
  for (const key of Object.keys(EMPTY_JOB)) {
    if (key in row) {
      const v = row[key];
      if (key === "has_fireplace") out[key] = Boolean(v);
      else out[key] = v === null || v === undefined ? "" : String(v);
    }
  }
  return { ...(out as JobFormInput), ...people };
}
