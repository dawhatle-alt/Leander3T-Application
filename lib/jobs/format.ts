import type { Database } from "@/lib/supabase/types";

export type JobStatus = Database["public"]["Enums"]["job_status"];
export type Trade = Database["public"]["Enums"]["trade"];

export const JOB_STATUSES: JobStatus[] = ["new", "in_progress", "completed"];

export const STATUS_LABEL: Record<JobStatus, string> = {
  new: "New",
  in_progress: "In Progress",
  completed: "Completed",
};

export const STATUS_BADGE: Record<JobStatus, string> = {
  new: "b-new",
  in_progress: "b-prog",
  completed: "b-done",
};

export const TRADE_LABEL: Record<Trade, string> = {
  brick: "Brick",
  stone: "Stone",
  stucco: "Stucco",
};

const TZ = "America/Chicago";

/** 1384 → "1,384"; null → "—". Measurements are stored as numeric strings. */
export function num(value: number | string | null | undefined, digits = 0) {
  if (value === null || value === undefined || value === "") return "—";
  const n = Number(value);
  if (!Number.isFinite(n)) return "—";
  return n.toLocaleString("en-US", { maximumFractionDigits: digits || 2 });
}

/** "2026-07-08" → "07/08". Dates are plain calendar dates (no time zone). */
export function shortDate(d: string | null | undefined) {
  if (!d) return "—";
  const [, m, day] = d.split("-");
  return `${m}/${day}`;
}

/** "2026-07-08" → "07/08/2026". */
export function longDate(d: string | null | undefined) {
  if (!d) return "—";
  const [y, m, day] = d.split("-");
  return `${m}/${day}/${y}`;
}

/** Timestamp → "07/08 2:41 PM" in Central time. */
export function stamp(ts: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "2-digit",
    day: "2-digit",
    hour: "numeric",
    minute: "2-digit",
    timeZone: TZ,
  }).format(new Date(ts));
}

export function schedule(start: string | null, end: string | null) {
  if (!start && !end) return "Not scheduled";
  return `${shortDate(start)} → ${shortDate(end)}`;
}

/** "BRK 1,384 · STN 391" — the trades on a job with their wall SF. */
export function tradeSummary(j: {
  brick_sqft: number | null;
  stone_sqft: number | null;
  stucco_sqft: number | null;
}) {
  const parts: string[] = [];
  if (j.brick_sqft) parts.push(`BRK ${num(j.brick_sqft)}`);
  if (j.stone_sqft) parts.push(`STN ${num(j.stone_sqft)}`);
  if (j.stucco_sqft) parts.push(`STC ${num(j.stucco_sqft)}`);
  return parts.join(" · ") || "—";
}

export function planLine(j: {
  plan_name: string | null;
  elevation: string | null;
}) {
  if (!j.plan_name && !j.elevation) return null;
  return [
    j.plan_name && `Plan: ${j.plan_name}`,
    j.elevation && `Elev ${j.elevation}`,
  ]
    .filter(Boolean)
    .join(" · ");
}
