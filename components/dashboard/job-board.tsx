"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { GripVertical } from "lucide-react";
import { setJobStatus } from "@/lib/jobs/status";
import { cn } from "@/lib/utils";

export type BoardStatus = "new" | "in_progress" | "completed";

export type BoardCard = {
  id: string;
  status: BoardStatus;
  address: string;
  builder: string | null;
  subdivision: string | null;
  plan: string | null;
  trades: string;
  percent: number;
  supervisor: string | null;
  received: string | null;
  completed: string | null;
  canMove: boolean;
};

const COLUMNS: { key: BoardStatus; label: string; badge: string }[] = [
  { key: "new", label: "New", badge: "b-new" },
  { key: "in_progress", label: "In Progress", badge: "b-prog" },
  { key: "completed", label: "Completed", badge: "b-done" },
];

const md = (d: string | null) =>
  d ? `${d.slice(5, 7)}/${d.slice(8, 10)}` : "—";

export function JobBoard({
  initial,
  completedNote,
  completedHref,
}: {
  initial: BoardCard[];
  completedNote: string;
  completedHref: string;
}) {
  const [cards, setCards] = useState(initial);
  const [dragging, setDragging] = useState<string | null>(null);
  const [over, setOver] = useState<BoardStatus | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function move(id: string, to: BoardStatus) {
    const card = cards.find((c) => c.id === id);
    if (!card || card.status === to || !card.canMove) return;
    const before = cards;
    // Optimistic: put it at the top of the new column right away.
    setCards([
      { ...card, status: to, completed: to === "completed" ? today() : null },
      ...cards.filter((c) => c.id !== id),
    ]);
    setMessage(null);
    startTransition(async () => {
      const res = await setJobStatus(id, to);
      if ("error" in res) {
        setCards(before);
        setMessage(`${card.address}: ${res.error}`);
      }
    });
  }

  return (
    <>
      <div aria-live="polite" className="min-h-0">
        {message && (
          <p className="mb-4 flex items-start justify-between gap-4 rounded-md border border-chalk/30 bg-[#c42b1f0d] px-4 py-3 text-[14px] text-chalk">
            {message}
            <button
              type="button"
              className="font-bold"
              onClick={() => setMessage(null)}
            >
              Dismiss
            </button>
          </p>
        )}
      </div>

      <div
        className={cn(
          "grid items-start gap-5 lg:grid-cols-3",
          pending && "cursor-progress",
        )}
      >
        {COLUMNS.map((col) => {
          const list = cards.filter((c) => c.status === col.key);
          const canDrop =
            dragging !== null &&
            cards.find((c) => c.id === dragging)?.status !== col.key;
          return (
            <section
              key={col.key}
              aria-label={col.label}
              onDragOver={(e) => {
                if (!canDrop) return;
                e.preventDefault();
                e.dataTransfer.dropEffect = "move";
                setOver(col.key);
              }}
              onDragLeave={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget as Node))
                  setOver(null);
              }}
              onDrop={(e) => {
                e.preventDefault();
                const id = e.dataTransfer.getData("text/plain");
                setOver(null);
                setDragging(null);
                if (id) move(id, col.key);
              }}
              className={cn(
                "rounded-md border border-mortar bg-[#fbf8f1] transition-colors",
                over === col.key && "border-flame bg-[#fdf1e6]",
              )}
            >
              <header className="flex items-center justify-between border-b border-mortar px-4 py-3">
                <span className={cn("badge", col.badge)}>{col.label}</span>
                <span className="font-mono text-[12px] tracking-[0.08em] text-ink-muted uppercase">
                  {list.length} {list.length === 1 ? "job" : "jobs"}
                </span>
              </header>
              {col.key === "completed" && (
                <p className="border-b border-mortar px-4 py-2 font-mono text-[11px] tracking-[0.06em] text-ink-muted uppercase">
                  {completedNote} ·{" "}
                  <Link href={completedHref} className="font-bold text-flame">
                    See all
                  </Link>
                </p>
              )}
              <ul className="grid min-h-[120px] gap-2.5 p-3 lg:max-h-[calc(100vh-300px)] lg:overflow-y-auto">
                {list.map((c) => (
                  <li
                    key={c.id}
                    draggable={c.canMove}
                    onDragStart={(e) => {
                      e.dataTransfer.setData("text/plain", c.id);
                      e.dataTransfer.effectAllowed = "move";
                      setDragging(c.id);
                    }}
                    onDragEnd={() => {
                      setDragging(null);
                      setOver(null);
                    }}
                    className={cn(
                      "group relative rounded-md border border-mortar bg-paper shadow-card transition-[border-color,opacity]",
                      c.canMove && "cursor-grab active:cursor-grabbing",
                      dragging === c.id && "opacity-50",
                      "hover:border-flame",
                    )}
                  >
                    <Link
                      href={`/jobs/${c.id}`}
                      draggable={false}
                      className="block px-4 py-3"
                    >
                      <div className="flex items-start gap-1.5 pr-5 font-bold">
                        {c.address}
                      </div>
                      <div className="mt-0.5 font-mono text-[11px] tracking-[0.08em] text-ink-muted uppercase">
                        {[c.builder, c.subdivision]
                          .filter(Boolean)
                          .join(" · ") || "—"}
                      </div>
                      {c.plan && (
                        <div className="mt-0.5 text-[12.5px] text-ink-muted">
                          {c.plan}
                        </div>
                      )}
                      <div className="mt-2 flex items-center justify-between gap-3 font-mono text-[12px] text-ink-muted">
                        <span>{c.trades}</span>
                        <span>{Math.round(c.percent)}%</span>
                      </div>
                      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-limestone">
                        <div
                          className="h-full rounded-full bg-fire"
                          style={{ width: `${Math.min(100, c.percent)}%` }}
                        />
                      </div>
                      <div className="mt-2 flex items-center justify-between gap-3 font-mono text-[11px] tracking-[0.06em] text-ink-muted uppercase">
                        <span className="truncate">
                          {c.supervisor ?? "No supervisor"}
                        </span>
                        <span className="whitespace-nowrap">
                          {c.status === "completed"
                            ? `Done ${md(c.completed)}`
                            : `Rec'd ${md(c.received)}`}
                        </span>
                      </div>
                    </Link>
                    {c.canMove && (
                      <>
                        <GripVertical
                          className="pointer-events-none absolute top-3 right-2 size-4 text-mortar-2 group-hover:text-ink-muted"
                          aria-hidden
                        />
                        {/* Touch and keyboard alternative to dragging. */}
                        <label className="sr-only" htmlFor={`mv-${c.id}`}>
                          Move {c.address} to
                        </label>
                        <select
                          id={`mv-${c.id}`}
                          value=""
                          onChange={(e) =>
                            move(c.id, e.target.value as BoardStatus)
                          }
                          className="mx-4 mb-3 w-[calc(100%-2rem)] rounded-[6px] border border-mortar bg-paper px-2 py-1 text-[12.5px] text-ink-muted lg:sr-only lg:focus:not-sr-only"
                        >
                          <option value="" disabled>
                            Move to…
                          </option>
                          {COLUMNS.filter((o) => o.key !== c.status).map(
                            (o) => (
                              <option key={o.key} value={o.key}>
                                {o.label}
                              </option>
                            ),
                          )}
                        </select>
                      </>
                    )}
                  </li>
                ))}
                {list.length === 0 && (
                  <li className="px-2 py-8 text-center text-[14px] text-ink-muted">
                    {over === col.key ? "Drop here" : "No jobs"}
                  </li>
                )}
              </ul>
            </section>
          );
        })}
      </div>
    </>
  );
}

function today() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Chicago",
  }).format(new Date());
}
