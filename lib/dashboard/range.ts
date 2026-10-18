import { longDate } from "@/lib/jobs/format";

// Date Received range filter shared by the Job Dashboard and the Job Board.

const TZ = "America/Chicago";
const ISO = /^\d{4}-\d{2}-\d{2}$/;

export type RangeKey = "year" | "last-year" | "12m" | "all" | "custom";

export const RANGES: { key: Exclude<RangeKey, "custom">; label: string }[] = [
  { key: "year", label: "This Year" },
  { key: "last-year", label: "Last Year" },
  { key: "12m", label: "Last 12 Months" },
  { key: "all", label: "All Time" },
];

/** Today's date in Central time, YYYY-MM-DD. */
export function todayCentral() {
  // en-CA formats as YYYY-MM-DD.
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(new Date());
}

/** YYYY-MM-DD n days before `iso`. */
export function daysBefore(iso: string, n: number) {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString().slice(0, 10);
}

export function resolveRange(
  sp: { range?: string; from?: string; to?: string },
  fallback: Exclude<RangeKey, "custom"> = "year",
): { range: RangeKey; from?: string; to?: string } {
  const now = todayCentral();
  const year = Number(now.slice(0, 4));
  const from = sp.from && ISO.test(sp.from) ? sp.from : undefined;
  const to = sp.to && ISO.test(sp.to) ? sp.to : undefined;
  if (sp.range === "custom" || from || to) return { range: "custom", from, to };
  const key = RANGES.some((r) => r.key === sp.range)
    ? (sp.range as Exclude<RangeKey, "custom">)
    : fallback;
  switch (key) {
    case "last-year":
      return { range: key, from: `${year - 1}-01-01`, to: `${year - 1}-12-31` };
    case "12m": {
      const d = new Date(`${now}T00:00:00Z`);
      d.setUTCFullYear(d.getUTCFullYear() - 1);
      d.setUTCDate(d.getUTCDate() + 1);
      return { range: key, from: d.toISOString().slice(0, 10), to: now };
    }
    case "all":
      return { range: key };
    default:
      return { range: "year", from: `${year}-01-01`, to: `${year}-12-31` };
  }
}

export function rangeText(from?: string, to?: string) {
  return from && to
    ? `${longDate(from)} – ${longDate(to)}`
    : from
      ? `Since ${longDate(from)}`
      : to
        ? `Through ${longDate(to)}`
        : "All time";
}
