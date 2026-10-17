"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Notice } from "@/components/auth/form-bits";
import { saveEntity, setEntityActive } from "@/lib/admin/actions";
import {
  ENTITIES,
  emptyValues,
  type EntityKind,
  type EntityOptions,
  type EntityValues,
  type Option,
} from "@/lib/admin/entities";
import { cn } from "@/lib/utils";

/** "+ Add Builder" or a pencil "Edit" button that opens the editor. */
export function EntityEditButton({
  kind,
  id = null,
  initial,
  options,
  label,
  compact,
}: {
  kind: EntityKind;
  id?: string | null;
  initial?: EntityValues;
  options: EntityOptions;
  label?: string;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const def = ENTITIES[kind];
  return (
    <>
      {id ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-[6px] border-[1.5px] border-mortar-2 px-3 py-1.5 text-[13px] font-bold hover:border-flame hover:text-flame"
        >
          <Pencil className="size-3.5" aria-hidden />
          Edit
          <span className="sr-only"> {def.label}</span>
        </button>
      ) : compact ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="rounded-md border-[1.5px] border-mortar-2 bg-limestone px-3 py-1.5 font-mono text-[12px] font-semibold transition-colors hover:border-flame hover:text-flame"
        >
          + {label ?? def.label}
        </button>
      ) : (
        <Button
          type="button"
          variant="fire"
          size="sm"
          onClick={() => setOpen(true)}
        >
          <Plus className="size-4" aria-hidden />
          {label ?? `Add ${def.label}`}
        </Button>
      )}
      {open && (
        <EntityDialog
          kind={kind}
          id={id}
          initial={{ ...emptyValues(kind), ...(initial ?? {}) }}
          options={options}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}

function EntityDialog({
  kind,
  id,
  initial,
  options,
  onClose,
}: {
  kind: EntityKind;
  id: string | null;
  initial: EntityValues;
  options: EntityOptions;
  onClose: () => void;
}) {
  const def = ENTITIES[kind];
  const ref = useRef<HTMLDialogElement>(null);
  const router = useRouter();
  const [values, setValues] = useState<EntityValues>(initial);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [pending, start] = useTransition();

  useEffect(() => {
    ref.current?.showModal();
  }, []);

  const set = (name: string, v: string | string[]) =>
    setValues((x) => ({ ...x, [name]: v }));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setFieldErrors({});
    start(async () => {
      const res = await saveEntity({ kind, id, values });
      if (res.error) {
        setError(res.error);
        setFieldErrors(res.fieldErrors ?? {});
        return;
      }
      ref.current?.close();
      router.refresh();
    });
  };

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && ref.current?.close()}
      className="m-auto max-h-[calc(100dvh-24px)] w-[min(600px,calc(100vw-24px))] rounded-lg border border-mortar bg-paper p-0 text-ink shadow-2xl backdrop:bg-charcoal/60"
    >
      <form
        onSubmit={submit}
        noValidate
        className="flex max-h-[calc(100dvh-24px)] flex-col"
      >
        <header className="flex items-center gap-3 border-b border-mortar px-5 py-4">
          <h2 className="font-display text-[24px] font-bold uppercase">
            {id ? `Edit ${def.label}` : `New ${def.label}`}
          </h2>
          <button
            type="button"
            onClick={() => ref.current?.close()}
            className="ml-auto grid size-9 place-items-center rounded-md hover:bg-limestone"
            aria-label="Close"
          >
            <X className="size-5" />
          </button>
        </header>
        <div className="overflow-y-auto px-5 py-4">
          {error && <Notice tone="error">{error}</Notice>}
          <fieldset
            disabled={pending}
            className="grid gap-x-4 gap-y-3.5 sm:grid-cols-2"
          >
            {def.fields.map((f) => {
              const fid = `e-${f.name}`;
              const err = fieldErrors[f.name];
              const opts: Option[] = Array.isArray(f.options)
                ? f.options
                : f.options
                  ? options[f.options]
                  : [];
              const v = values[f.name];
              return (
                <div
                  key={f.name}
                  className={cn(
                    "min-w-0",
                    (f.wide || f.kind === "textarea") && "sm:col-span-2",
                  )}
                >
                  {f.kind === "checks" ? (
                    <fieldset>
                      <legend className="label">{f.label}</legend>
                      <div className="flex flex-wrap gap-2">
                        {opts.map((o) => {
                          const list = (v as string[]) ?? [];
                          const on = list.includes(o.value);
                          return (
                            <label
                              key={o.value}
                              className={cn(
                                "flex cursor-pointer items-center gap-2 rounded-md border-[1.5px] px-3 py-1.5 text-[14px]",
                                on
                                  ? "border-flame bg-[#e4590f0f]"
                                  : "border-mortar-2",
                              )}
                            >
                              <input
                                type="checkbox"
                                checked={on}
                                onChange={() =>
                                  set(
                                    f.name,
                                    on
                                      ? list.filter((x) => x !== o.value)
                                      : [...list, o.value],
                                  )
                                }
                                className="accent-[var(--flame)]"
                              />
                              {o.label}
                            </label>
                          );
                        })}
                      </div>
                    </fieldset>
                  ) : (
                    <>
                      <label htmlFor={fid} className="label">
                        {f.label}
                        {f.required && <span className="text-flame"> *</span>}
                      </label>
                      {f.kind === "select" ? (
                        <select
                          id={fid}
                          className="input"
                          value={v as string}
                          onChange={(e) => set(f.name, e.target.value)}
                          aria-invalid={err ? true : undefined}
                        >
                          {!f.required || !v ? (
                            <option value="">—</option>
                          ) : null}
                          {opts.map((o) => (
                            <option key={o.value} value={o.value}>
                              {o.label}
                            </option>
                          ))}
                        </select>
                      ) : f.kind === "textarea" ? (
                        <textarea
                          id={fid}
                          rows={3}
                          className="input resize-y"
                          value={v as string}
                          onChange={(e) => set(f.name, e.target.value)}
                        />
                      ) : (
                        <input
                          id={fid}
                          type={
                            f.kind === "email"
                              ? "email"
                              : f.kind === "tel"
                                ? "tel"
                                : "text"
                          }
                          inputMode={f.kind === "int" ? "numeric" : undefined}
                          placeholder={f.placeholder}
                          className={cn(
                            "input",
                            (f.kind === "int" ||
                              f.kind === "tel" ||
                              f.kind === "email") &&
                              "font-mono text-[14px]",
                          )}
                          value={v as string}
                          onChange={(e) => set(f.name, e.target.value)}
                          aria-invalid={err ? true : undefined}
                        />
                      )}
                    </>
                  )}
                  {err && (
                    <p className="mt-1 text-[12.5px] font-semibold text-chalk">
                      {err}
                    </p>
                  )}
                </div>
              );
            })}
          </fieldset>
        </div>
        <footer className="flex items-center justify-end gap-3 border-t border-mortar px-5 py-3.5">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => ref.current?.close()}
          >
            Cancel
          </Button>
          <Button type="submit" variant="fire" size="sm" disabled={pending}>
            {pending ? "Saving…" : "Save"}
          </Button>
        </footer>
      </form>
    </dialog>
  );
}

/** Switch a record off (kept for history, hidden from new choices) or on. */
export function ActiveToggle({
  kind,
  id,
  active,
}: {
  kind: EntityKind;
  id: string;
  active: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <span className="inline-flex items-center gap-2">
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          start(async () => {
            setError(null);
            const res = await setEntityActive(kind, id, !active);
            if (res.error) setError(res.error);
            else router.refresh();
          })
        }
        className={cn(
          "rounded-[6px] px-3 py-1.5 text-[13px] font-bold whitespace-nowrap disabled:opacity-60",
          active
            ? "border-[1.5px] border-mortar-2 text-ink-muted hover:border-chalk hover:text-chalk"
            : "bg-charcoal text-limestone",
        )}
      >
        {pending ? "…" : active ? "Switch Off" : "Switch On"}
      </button>
      {error && <span className="text-[12px] text-chalk">{error}</span>}
    </span>
  );
}
