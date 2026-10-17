"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { generateOrderForm } from "@/lib/order-forms/actions";

// "Create Order Form": renders the PDF, files it, marks the orders ordered
// and sends it to the review team, all in one server action.
export function GenerateFormButton({
  jobId,
  layout,
  orderType,
  orderId,
  label,
  onDone,
}: {
  jobId: string;
  layout: "masonry" | "stucco" | "paint";
  orderType?: string;
  orderId?: string;
  label: string;
  onDone?: () => void;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ tone: "error" | "note"; text: string }>();

  return (
    <span className="inline-flex flex-wrap items-center gap-2.5">
      <Button
        type="button"
        variant="fire"
        size="sm"
        disabled={pending}
        onClick={() =>
          start(async () => {
            setMsg(undefined);
            const res = await generateOrderForm({
              jobId,
              layout,
              orderType,
              orderId,
            });
            if (res.error) {
              setMsg({ tone: "error", text: res.error });
              return;
            }
            if (res.note) setMsg({ tone: "note", text: res.note });
            router.refresh();
            onDone?.();
          })
        }
      >
        <FileText className="size-4" aria-hidden />
        {pending ? "Creating PDF…" : label}
      </Button>
      {msg && (
        <span
          role="status"
          className={
            msg.tone === "error"
              ? "text-[13px] font-semibold text-chalk"
              : "text-[13px] text-ink-muted"
          }
        >
          {msg.text}
        </span>
      )}
    </span>
  );
}
