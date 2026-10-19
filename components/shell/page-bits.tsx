import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

export function PageHead({
  title,
  sub,
  children,
}: {
  title: string;
  sub?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <div className="mb-[30px] flex flex-wrap items-end justify-between gap-5">
      <div>
        <h1 className="font-display text-[34px] leading-none font-bold uppercase md:text-[42px]">
          {title}
        </h1>
        {sub && <div className="mt-2 text-[15px] text-ink-muted">{sub}</div>}
      </div>
      {children}
    </div>
  );
}

export function Panel({
  title,
  action,
  className,
  children,
}: {
  title?: string;
  action?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      className={cn(
        "rounded-md border border-mortar bg-paper shadow-[0_1px_2px_rgba(33,27,23,.06),0_4px_14px_rgba(33,27,23,.07)]",
        className,
      )}
    >
      {title && (
        <div className="flex items-center justify-between border-b border-mortar px-6 py-[18px]">
          <h2 className="font-display text-[22px] font-bold uppercase">
            {title}
          </h2>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export function Stat({
  label,
  value,
  note,
  href,
}: {
  label: string;
  value: React.ReactNode;
  note?: string;
  /** When set, the whole card opens the list behind the number. */
  href?: string;
}) {
  const body = (
    <>
      <div className="flex items-center justify-between gap-2 font-mono text-[11px] tracking-[0.14em] text-ink-muted uppercase">
        {label}
        {href && (
          <ArrowRight
            className="size-4 flex-none text-mortar-2 transition-colors group-hover:text-flame"
            aria-hidden
          />
        )}
      </div>
      <div className="mt-2 font-display text-[46px] leading-[1.05] font-bold">
        {value}
      </div>
      {note && (
        <div className="mt-1.5 text-[12.5px] font-semibold text-ink-muted">
          {note}
        </div>
      )}
    </>
  );
  const card =
    "relative overflow-hidden rounded-md border border-mortar bg-paper px-6 py-[22px] shadow-[0_1px_2px_rgba(33,27,23,.06),0_4px_14px_rgba(33,27,23,.07)] before:absolute before:inset-y-0 before:left-0 before:w-[3px] before:bg-fire";
  return href ? (
    <Link
      href={href}
      className={cn(
        card,
        "group block transition-colors hover:border-flame focus-visible:border-flame focus-visible:outline-none",
      )}
    >
      {body}
    </Link>
  ) : (
    <div className={card}>{body}</div>
  );
}

// Scope badge from the mockup ("Showing Crew 2 jobs only · no costs shown").
export function Scope({ children }: { children: React.ReactNode }) {
  return (
    <span className="mt-2.5 inline-flex items-center gap-2 rounded-full border border-[#c4dccb] bg-[#e4efe7] px-[13px] py-1.5 font-mono text-[11px] tracking-[0.1em] text-success uppercase">
      {children}
    </span>
  );
}

export function ComingSoon({
  milestone,
  what,
}: {
  milestone: string;
  what: string;
}) {
  return (
    <Panel>
      <div className="px-6 py-10 text-center">
        <div className="font-mono text-[11px] tracking-[0.14em] text-flame uppercase">
          {milestone}
        </div>
        <p className="mx-auto mt-2 max-w-[48ch] text-[15px] text-ink-muted">
          {what}
        </p>
      </div>
    </Panel>
  );
}
