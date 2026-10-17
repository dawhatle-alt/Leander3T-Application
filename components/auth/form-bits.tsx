import { cn } from "@/lib/utils";

export function Field({
  label,
  className,
  ...input
}: React.ComponentProps<"input"> & { label: string }) {
  const id = input.id ?? input.name;
  return (
    <div className={cn("mb-[18px]", className)}>
      <label
        htmlFor={id}
        className="mb-[7px] block text-[13.5px] font-semibold"
      >
        {label}
      </label>
      <input
        id={id}
        {...input}
        className="w-full rounded-sm border-[1.5px] border-mortar-2 bg-limestone px-3.5 py-3 text-[15px] text-ink transition-colors focus:border-flame focus:bg-paper focus:outline-none"
      />
    </div>
  );
}

export function Notice({
  tone,
  children,
}: {
  tone: "error" | "ok";
  children: React.ReactNode;
}) {
  return (
    <p
      role={tone === "error" ? "alert" : "status"}
      className={cn(
        "mb-5 rounded-sm border-l-[3px] px-3.5 py-2.5 text-[14px]",
        tone === "error"
          ? "border-chalk bg-[#c42b1f12] text-chalk"
          : "border-success bg-[#2f6b4514] text-success",
      )}
    >
      {children}
    </p>
  );
}

export function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <span className="flex items-center gap-3.5 font-mono text-xs font-medium tracking-[0.22em] text-flame uppercase">
      {children} <span className="chalk-line" aria-hidden="true" />
    </span>
  );
}

export function CardTitle({ title, sub }: { title: string; sub: string }) {
  return (
    <>
      <h1 className="mt-3.5 mb-1.5 font-display text-[34px] font-bold uppercase">
        {title}
      </h1>
      <p className="mb-[30px] text-[15px] text-ink-muted">{sub}</p>
    </>
  );
}
