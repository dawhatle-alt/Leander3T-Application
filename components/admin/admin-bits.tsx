import { cn } from "@/lib/utils";

/** "Off" marker for switched-off records. */
export function OffBadge({ active }: { active: boolean }) {
  if (active) return null;
  return (
    <span className="ml-2 rounded-full bg-[#c42b1f14] px-2 py-0.5 font-mono text-[10.5px] tracking-[0.12em] text-chalk uppercase">
      Switched off
    </span>
  );
}

/** One record in an admin list: details on the left, buttons on the right. */
export function AdminRow({
  active = true,
  children,
  actions,
  className,
}: {
  active?: boolean;
  children: React.ReactNode;
  actions: React.ReactNode;
  className?: string;
}) {
  return (
    <li
      className={cn(
        "flex flex-wrap items-center gap-x-4 gap-y-2 px-6 py-3.5",
        !active && "bg-[#fbf8f2] text-ink-muted",
        className,
      )}
    >
      <div className="min-w-0 flex-1 basis-[240px]">{children}</div>
      <div className="flex flex-none flex-wrap items-center gap-2">
        {actions}
      </div>
    </li>
  );
}

export const mono = "font-mono text-[13px] text-ink-muted";
