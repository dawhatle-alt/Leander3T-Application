"use client";

import { useEffect, useId, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { MapPin } from "lucide-react";
import {
  searchOrderAddresses,
  type AddressMatch,
} from "@/lib/orders/address-search";
import { cn } from "@/lib/utils";

// Type part of an address, pick it, and the Orders list narrows to every
// order for that house. `keep` carries the other filters (type, supplier).
export function AddressFilter({ keep }: { keep: Record<string, string> }) {
  const router = useRouter();
  const listId = useId();
  const [q, setQ] = useState("");
  const [matches, setMatches] = useState<AddressMatch[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [searching, startSearch] = useTransition();
  const latest = useRef("");

  useEffect(() => {
    const term = q.trim();
    latest.current = term;
    if (term.length < 2) {
      setMatches([]);
      return;
    }
    const t = setTimeout(() => {
      startSearch(async () => {
        const found = await searchOrderAddresses(term);
        // Ignore answers to an older search that came back late.
        if (latest.current === term) {
          setMatches(found);
          setActive(0);
        }
      });
    }, 250);
    return () => clearTimeout(t);
  }, [q]);

  const pick = (m: AddressMatch) => {
    const params = new URLSearchParams(keep);
    params.set("job", m.id);
    setOpen(false);
    setQ("");
    router.push(`/orders?${params.toString()}`);
  };

  const showList = open && q.trim().length >= 2;

  return (
    <div className="relative w-full sm:w-[300px]">
      <label htmlFor={`${listId}-input`} className="sr-only">
        Orders for an address
      </label>
      <MapPin
        className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-muted"
        aria-hidden
      />
      <input
        id={`${listId}-input`}
        type="search"
        role="combobox"
        aria-expanded={showList}
        aria-controls={`${listId}-list`}
        aria-autocomplete="list"
        aria-activedescendant={
          showList && matches[active] ? `${listId}-${active}` : undefined
        }
        autoComplete="off"
        placeholder="Orders for an address…"
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 120)}
        onKeyDown={(e) => {
          if (!showList || !matches.length) {
            if (e.key === "Escape") setOpen(false);
            return;
          }
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setActive((i) => (i + 1) % matches.length);
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActive((i) => (i - 1 + matches.length) % matches.length);
          } else if (e.key === "Enter") {
            e.preventDefault();
            pick(matches[active]);
          } else if (e.key === "Escape") {
            setOpen(false);
          }
        }}
        className="input w-full py-2 pl-9"
      />
      {showList && (
        <ul
          id={`${listId}-list`}
          role="listbox"
          className="absolute top-full right-0 left-0 z-20 mt-1 max-h-[320px] overflow-auto rounded-md border border-mortar bg-paper py-1 shadow-card"
        >
          {matches.length === 0 ? (
            <li className="px-3.5 py-2.5 text-[13.5px] text-ink-muted">
              {searching ? "Searching…" : "No address matches."}
            </li>
          ) : (
            matches.map((m, i) => (
              <li
                key={m.id}
                id={`${listId}-${i}`}
                role="option"
                aria-selected={i === active}
                onMouseDown={(e) => e.preventDefault()}
                onMouseEnter={() => setActive(i)}
                onClick={() => pick(m)}
                className={cn(
                  "cursor-pointer px-3.5 py-2",
                  i === active && "bg-limestone",
                )}
              >
                <span className="block text-[14px] font-semibold">
                  {m.address}
                </span>
                {(m.subdivision || m.builder) && (
                  <span className="block text-[12px] text-ink-muted">
                    {[m.subdivision, m.builder].filter(Boolean).join(" · ")}
                  </span>
                )}
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
