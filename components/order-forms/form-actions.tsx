"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  regenerateOrderForm,
  setFormApproved,
} from "@/lib/order-forms/actions";

// Review-queue buttons for one form: approve (or send back), and regenerate
// from the orders' current details as a new version.
export function FormActions({
  formId,
  approved,
  canReview,
}: {
  formId: string;
  approved: boolean;
  canReview: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [busy, setBusy] = useState<"approve" | "regen" | null>(null);
  const [msg, setMsg] = useState<{ tone: "error" | "note"; text: string }>();

  const run = (
    which: "approve" | "regen",
    fn: () => Promise<{ error?: string; note?: string }>,
  ) =>
    start(async () => {
      setBusy(which);
      setMsg(undefined);
      const res = await fn();
      setBusy(null);
      if (res.error) setMsg({ tone: "error", text: res.error });
      else {
        if (res.note) setMsg({ tone: "note", text: res.note });
        router.refresh();
      }
    });

  if (!canReview) return null;
  return (
    <span className="flex flex-wrap items-center justify-end gap-2">
      <button
        type="button"
        disabled={pending}
        onClick={() => run("regen", () => regenerateOrderForm(formId))}
        className="rounded-[6px] border-[1.5px] border-mortar-2 bg-limestone px-3 py-1.5 text-[13px] font-bold whitespace-nowrap disabled:opacity-60"
      >
        {busy === "regen" ? "Regenerating…" : "Regenerate"}
      </button>
      <button
        type="button"
        disabled={pending}
        onClick={() => run("approve", () => setFormApproved(formId, !approved))}
        className={
          approved
            ? "rounded-[6px] border-[1.5px] border-mortar-2 bg-paper px-3 py-1.5 text-[13px] font-bold whitespace-nowrap disabled:opacity-60"
            : "rounded-[6px] bg-charcoal px-3.5 py-1.5 text-[13px] font-bold whitespace-nowrap text-limestone disabled:opacity-60"
        }
      >
        {busy === "approve"
          ? "Saving…"
          : approved
            ? "Back to Review"
            : "Approve"}
      </button>
      {msg && (
        <span
          role="status"
          className={
            msg.tone === "error"
              ? "w-full max-w-[260px] text-right text-[12px] text-chalk"
              : "w-full max-w-[260px] text-right text-[12px] text-ink-muted"
          }
        >
          {msg.text}
        </span>
      )}
    </span>
  );
}
