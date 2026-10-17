"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateInfoRequest } from "@/lib/requests/actions";

const STATUS = [
  { value: "todo", label: "To Do" },
  { value: "in_progress", label: "In Progress" },
  { value: "done", label: "Done" },
];

/** Status and owner for one website request; saves on change. */
export function RequestControls({
  id,
  status,
  assigneeId,
  admins,
}: {
  id: string;
  status: string;
  assigneeId: string;
  admins: { value: string; label: string }[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [v, setV] = useState({ status, assigneeId });
  const [error, setError] = useState<string | null>(null);

  const save = (next: typeof v) => {
    setV(next);
    setError(null);
    start(async () => {
      const res = await updateInfoRequest({ id, ...next });
      if (res.error) setError(res.error);
      else router.refresh();
    });
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <label className="sr-only" htmlFor={`st-${id}`}>
        Status
      </label>
      <select
        id={`st-${id}`}
        className="input w-auto py-1.5 text-[14px]"
        value={v.status}
        disabled={pending}
        onChange={(e) => save({ ...v, status: e.target.value })}
      >
        {STATUS.map((s) => (
          <option key={s.value} value={s.value}>
            {s.label}
          </option>
        ))}
      </select>
      <label className="sr-only" htmlFor={`as-${id}`}>
        Handled by
      </label>
      <select
        id={`as-${id}`}
        className="input w-auto py-1.5 text-[14px]"
        value={v.assigneeId}
        disabled={pending}
        onChange={(e) => save({ ...v, assigneeId: e.target.value })}
      >
        <option value="">Unassigned</option>
        {admins.map((a) => (
          <option key={a.value} value={a.value}>
            {a.label}
          </option>
        ))}
      </select>
      {error && <span className="text-[12px] text-chalk">{error}</span>}
    </div>
  );
}
