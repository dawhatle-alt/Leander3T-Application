import { z } from "zod";

const text = (max = 120) => z.string().trim().max(max);

export const TRADES = ["brick", "stone", "stucco"] as const;

// "Submit New Job Request" in the builder portal.
export const newJobRequestSchema = z.object({
  house_number: text(20).min(1, "Enter the house number."),
  street: text(120).min(1, "Enter the street."),
  subdivision: text(),
  area: text(),
  plan_name: text(),
  plan_number: text(40),
  elevation: text(20),
  lot_swing: z.enum(["", "right", "left", "other"]),
  trades: z.array(z.enum(TRADES)).min(1, "Pick at least one trade."),
  brick_color: text(),
  stone_color: text(),
  mortar_color: text(),
  stucco_colors: text(200),
  wanted_by: z
    .string()
    .trim()
    .refine((v) => v === "" || /^\d{4}-\d{2}-\d{2}$/.test(v), "Pick a date."),
  message: text(4000),
});
export type NewJobRequestInput = z.input<typeof newJobRequestSchema>;

export const updateRequestSchema = z.object({
  job_id: z.guid(),
  message: text(4000).min(1, "Tell us what you'd like to know."),
});

export type RequestState = {
  ok?: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
};
