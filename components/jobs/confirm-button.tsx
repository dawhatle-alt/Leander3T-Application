"use client";

import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

// Two-step delete: the first tap asks, the second does it. No browser dialog.
export function ConfirmButton({
  onConfirm,
  label = "Delete",
  className,
}: {
  onConfirm: () => Promise<unknown>;
  label?: string;
  className?: string;
}) {
  const [asking, setAsking] = useState(false);
  const [pending, start] = useTransition();

  if (!asking) {
    return (
      <button
        type="button"
        onClick={() => setAsking(true)}
        title={label}
        className={cn(
          "grid size-8 flex-none place-items-center rounded-md text-ink-muted transition-colors hover:bg-limestone hover:text-chalk",
          className,
        )}
      >
        <Trash2 className="size-4" aria-label={label} />
      </button>
    );
  }
  return (
    <span
      className={cn(
        "flex flex-none items-center gap-1.5 text-[13px]",
        className,
      )}
    >
      <button
        type="button"
        disabled={pending}
        onClick={() => start(async () => void (await onConfirm()))}
        className="rounded-md bg-chalk px-2.5 py-1 font-bold text-white disabled:opacity-60"
      >
        {pending ? "…" : label}
      </button>
      <button
        type="button"
        onClick={() => setAsking(false)}
        className="rounded-md px-2 py-1 font-semibold text-ink-muted hover:text-ink"
      >
        Keep
      </button>
    </span>
  );
}
