"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setAddressBlock } from "@/lib/address-blocks/actions";
import { cn } from "@/lib/utils";

const STEPS = [
  { value: "none", label: "Not Ordered" },
  { value: "ordered", label: "Ordered" },
  { value: "delivered", label: "Delivered" },
] as const;

/** Three-step switch: Not Ordered → Ordered → Delivered. Dates stamp themselves. */
export function AddressBlockControl({
  jobId,
  status,
}: {
  jobId: string;
  status: "none" | "ordered" | "delivered";
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [current, setCurrent] = useState(status);

  return (
    <span className="inline-flex flex-col items-start gap-1">
      <span
        role="group"
        aria-label="Address block status"
        className="inline-flex overflow-hidden rounded-md border-[1.5px] border-mortar-2"
      >
        {STEPS.map((s) => (
          <button
            key={s.value}
            type="button"
            disabled={pending}
            aria-pressed={current === s.value}
            onClick={() => {
              if (s.value === current) return;
              const prev = current;
              setCurrent(s.value);
              setError(null);
              start(async () => {
                const res = await setAddressBlock(jobId, s.value);
                if (res.error) {
                  setCurrent(prev);
                  setError(res.error);
                } else router.refresh();
              });
            }}
            className={cn(
              "px-2.5 py-1 font-mono text-[11px] font-semibold tracking-[0.06em] whitespace-nowrap uppercase disabled:opacity-60",
              current === s.value
                ? s.value === "delivered"
                  ? "bg-success text-white"
                  : s.value === "ordered"
                    ? "bg-amber text-charcoal"
                    : "bg-charcoal text-limestone"
                : "bg-paper text-ink-muted hover:text-ink",
            )}
          >
            {s.label}
          </button>
        ))}
      </span>
      {error && <span className="text-[12px] text-chalk">{error}</span>}
    </span>
  );
}
