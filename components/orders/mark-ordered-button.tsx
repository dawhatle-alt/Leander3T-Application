"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setOrdered } from "@/lib/orders/actions";
import type { OrderTypeKey } from "@/lib/orders/types";

// Office shortcut on the Orders page: place an order without opening it.
export function MarkOrderedButton({
  type,
  jobId,
  orderId,
}: {
  type: OrderTypeKey;
  jobId: string;
  orderId: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <span className="inline-flex flex-col items-end gap-1">
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const res = await setOrdered(type, jobId, orderId, true);
            if (res.error) setError(res.error);
            else router.refresh();
          })
        }
        className="rounded-[6px] bg-charcoal px-3.5 py-1.5 text-[13px] font-bold whitespace-nowrap text-limestone disabled:opacity-60"
      >
        {pending ? "Saving…" : "Mark Ordered"}
      </button>
      {error && (
        <span className="max-w-[220px] text-right text-[12px] text-chalk">
          {error}
        </span>
      )}
    </span>
  );
}
