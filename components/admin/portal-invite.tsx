"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { inviteConstructionManager } from "@/lib/admin/invite";

export function PortalInviteButton({ cmId }: { cmId: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          start(async () => {
            setMsg(null);
            const res = await inviteConstructionManager(cmId);
            if (res.error) setMsg({ ok: false, text: res.error });
            else {
              setMsg({ ok: true, text: res.message ?? "Sent." });
              router.refresh();
            }
          })
        }
        className="rounded-[6px] bg-charcoal px-3 py-1.5 text-[13px] font-bold whitespace-nowrap text-limestone disabled:opacity-60"
      >
        {pending ? "Sending…" : "Invite to Portal"}
      </button>
      {msg && (
        <span
          role="status"
          className={
            msg.ok ? "text-[12px] text-success" : "text-[12px] text-chalk"
          }
        >
          {msg.text}
        </span>
      )}
    </span>
  );
}
