import Link from "next/link";
import { cn } from "@/lib/utils";
import { homeMeta, nextStart, md, type TradeProgress } from "@/lib/portal/data";

export const STATUS_LABEL = {
  new: "Scheduled",
  in_progress: "In Progress",
  completed: "Completed",
} as const;
export const STATUS_BADGE = {
  new: "b-new",
  in_progress: "b-prog",
  completed: "b-done",
} as const;

export function Bar({ pct, label }: { pct: number; label?: string }) {
  return (
    <div
      className="h-3 overflow-hidden rounded-full bg-limestone"
      role="progressbar"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
    >
      <div
        className="h-full rounded-full bg-fire"
        style={{ width: `${Math.max(0, Math.min(100, pct))}%` }}
      />
    </div>
  );
}

export function TradeRows({ rows }: { rows: TradeProgress[] }) {
  return (
    <div>
      {rows.map((r) => (
        <div
          key={r.key}
          className="grid grid-cols-[82px_1fr_118px] items-center gap-3.5 border-b border-dashed border-mortar py-[9px] last:border-b-0 max-sm:grid-cols-[72px_1fr] max-sm:gap-x-3"
        >
          <span className="font-display text-[17px] font-bold tracking-[0.03em] uppercase">
            {r.label}
          </span>
          <Bar pct={r.pct} label={`${r.label} progress`} />
          <span className="text-right font-mono text-[12px] text-ink-muted max-sm:col-span-2 max-sm:text-left">
            {r.note}
          </span>
        </div>
      ))}
    </div>
  );
}

export function Chips({ items }: { items: string[] }) {
  if (!items.length)
    return <p className="text-[14px] text-ink-muted">No specs on file yet.</p>;
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((c) => (
        <span
          key={c}
          className="rounded-full border border-mortar bg-limestone px-[11px] py-1.5 font-mono text-[11.5px] text-[#5d5347]"
        >
          {c}
        </span>
      ))}
    </div>
  );
}

export function SecLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-3 font-mono text-[11px] tracking-[0.16em] text-ink-muted uppercase">
      {children}
    </div>
  );
}

type CardHome = Record<string, unknown> & {
  id: string;
  status: keyof typeof STATUS_LABEL;
  completion_percent: number | string;
  property_address: string | null;
};

export function HomeCard({ j }: { j: CardHome }) {
  const pct = Math.round(Number(j.completion_percent) || 0);
  const starts = j.status === "new" ? nextStart(j) : null;
  return (
    <Link
      href={`/portal/homes/${j.id}`}
      className="block rounded-[10px] border border-mortar bg-paper px-6 py-[22px] shadow-card transition-[transform,box-shadow] hover:-translate-y-[3px] hover:shadow-[0_2px_4px_rgba(33,27,23,.08),0_14px_34px_rgba(33,27,23,.13)]"
    >
      <div className="font-display text-[22px] leading-[1.05] font-bold uppercase">
        {j.property_address}
      </div>
      <div className="mt-1.5 mb-3.5 font-mono text-[11.5px] text-ink-muted">
        {homeMeta(j) || " "}
      </div>
      <span className={cn("badge", STATUS_BADGE[j.status])}>
        {STATUS_LABEL[j.status]}
      </span>
      <div className="mt-2.5 mb-1.5">
        <Bar pct={j.status === "new" ? 4 : pct} label="Home progress" />
      </div>
      <div className="mt-3.5 flex items-center justify-between">
        <span className="font-display text-[22px] font-bold">
          {j.status === "new"
            ? starts
              ? `Starts ${md(starts)}`
              : "Scheduling"
            : `${pct}%`}
        </span>
        <span className="rounded-md bg-charcoal px-4 py-2 text-[13.5px] font-bold text-limestone">
          View Home
        </span>
      </div>
    </Link>
  );
}
