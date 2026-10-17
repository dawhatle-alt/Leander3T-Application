"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { approveJobRequest, respondToJobRequest } from "@/lib/portal/review";

/** Office buttons on one job request in the intake queue. */
export function ReviewControls({
  id,
  kind,
}: {
  id: string;
  kind: "new_job" | "update";
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [mode, setMode] = useState<"idle" | "reply">(
    kind === "update" ? "reply" : "idle",
  );
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);

  const respond = (decision: "declined" | "answered") =>
    start(async () => {
      setError(null);
      const res = await respondToJobRequest({ id, decision, response: text });
      if (res.error) setError(res.error);
      else router.refresh();
    });

  return (
    <div className="mt-3 grid gap-2.5">
      {error && <p className="text-[13px] font-semibold text-chalk">{error}</p>}
      {mode === "reply" && (
        <>
          <label htmlFor={`rp-${id}`} className="sr-only">
            Reply to the builder
          </label>
          <textarea
            id={`rp-${id}`}
            rows={2}
            maxLength={4000}
            className="input resize-y"
            placeholder={
              kind === "update"
                ? "Your reply — the builder sees it in the portal."
                : "Why it's declined — the builder sees this."
            }
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
        </>
      )}
      <div className="flex flex-wrap gap-2">
        {kind === "new_job" ? (
          mode === "idle" ? (
            <>
              <Button
                type="button"
                variant="fire"
                size="sm"
                disabled={pending}
                onClick={() =>
                  start(async () => {
                    setError(null);
                    const res = await approveJobRequest(id);
                    if (res.error) setError(res.error);
                    else router.push(`/jobs/${res.jobId}/edit`);
                  })
                }
              >
                {pending ? "Creating…" : "Create Job"}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={pending}
                onClick={() => setMode("reply")}
              >
                Decline…
              </Button>
            </>
          ) : (
            <>
              <Button
                type="button"
                variant="dark"
                size="sm"
                disabled={pending}
                onClick={() => respond("declined")}
              >
                {pending ? "Saving…" : "Decline with Reply"}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={pending}
                onClick={() => setMode("idle")}
              >
                Cancel
              </Button>
            </>
          )
        ) : (
          <Button
            type="button"
            variant="dark"
            size="sm"
            disabled={pending}
            onClick={() => respond("answered")}
          >
            {pending ? "Sending…" : "Send Reply"}
          </Button>
        )}
      </div>
    </div>
  );
}
