"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Notice } from "@/components/auth/form-bits";
import { ConfirmButton } from "@/components/jobs/confirm-button";
import { deleteOrder, saveOrder } from "@/lib/orders/actions";
import { ORDER_TYPES, type OrderTypeKey } from "@/lib/orders/types";
import {
  orderSchema,
  type OrderFormValues,
  type StuccoItemInput,
} from "@/lib/validation/order";
import { cn } from "@/lib/utils";

export type OrderOptionsProp = {
  suppliers: { value: string; label: string; types: string[] }[];
  mortarColors: { value: string; label: string }[];
  stuccoItems: { code: string; name: string; unit: string }[];
};

export type OrderPerms = {
  canOrder: boolean; // create and edit drafts
  canPlace: boolean; // office: mark ordered, edit placed orders
  isAdmin: boolean;
  isCrew: boolean;
  meId: string;
};

export function OrderDialog({
  jobId,
  type,
  orderId,
  orderNumber,
  createdBy,
  initial,
  options,
  perms,
  onClose,
  onSaved,
}: {
  jobId: string;
  type: OrderTypeKey;
  orderId: string | null;
  orderNumber: number | null;
  createdBy: string | null;
  initial: OrderFormValues;
  options: OrderOptionsProp;
  perms: OrderPerms;
  onClose: () => void;
  onSaved: () => void;
}) {
  const def = ORDER_TYPES[type];
  const ref = useRef<HTMLDialogElement>(null);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    ref.current?.showModal();
  }, []);

  const placed = Boolean(initial.ordered);
  const readOnly = !perms.canOrder || (placed && !perms.canPlace);
  const canDelete =
    !!orderId &&
    (perms.isAdmin ||
      (!placed &&
        (perms.canPlace || (perms.isCrew && createdBy === perms.meId))));

  const schema = useMemo(() => orderSchema(type), [type]);
  const form = useForm<OrderFormValues>({
    resolver: zodResolver(schema) as unknown as Resolver<OrderFormValues>,
    defaultValues: initial,
  });
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    setError: setFieldError,
  } = form;
  const errors = form.formState.errors as Record<
    string,
    { message?: string } | undefined
  >;

  // Stucco supply: one quantity box per catalog item.
  const items = (watch("items") ?? []) as StuccoItemInput[];
  const qty = (code: string) =>
    items.find((i) => i.code === code)?.quantity ?? "";
  const unitOf = (code: string, fallback: string) =>
    items.find((i) => i.code === code)?.unit ?? fallback;
  const setQty = (code: string, unit: string, quantity: string) => {
    const rest = items.filter((i) => i.code !== code);
    setValue(
      "items",
      quantity.trim() ? [...rest, { code, unit, quantity }] : rest,
      {
        shouldDirty: true,
      },
    );
  };

  // Validate in the browser, but send the raw form text: the server checks it
  // again with the same schema.
  const onSubmit = handleSubmit(() => {
    setError(null);
    start(async () => {
      const res = await saveOrder({
        type,
        jobId,
        orderId,
        values: form.getValues(),
      });
      if (res.fieldErrors) {
        for (const [k, m] of Object.entries(res.fieldErrors))
          setFieldError(k, { message: m });
      }
      if (res.error) {
        setError(res.error);
        return;
      }
      onSaved();
    });
  });

  const suppliers = options.suppliers.filter(
    (s) => s.types.includes(type) || s.value === initial.supplier_id,
  );

  let lastGroup: string | undefined;

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && ref.current?.close()}
      className="m-auto max-h-[calc(100dvh-24px)] w-[min(720px,calc(100vw-24px))] rounded-lg border border-mortar bg-paper p-0 text-ink shadow-2xl backdrop:bg-charcoal/60"
    >
      <form
        onSubmit={onSubmit}
        noValidate
        className="flex max-h-[calc(100dvh-24px)] flex-col"
      >
        <header className="flex items-center gap-3 border-b border-mortar px-5 py-4">
          <h2 className="font-display text-[24px] font-bold uppercase">
            {orderId ? "" : "New "}
            {def.label}
            {orderNumber && (
              <span className="ml-2 font-mono text-[14px] font-normal text-ink-muted">
                #{orderNumber}
              </span>
            )}
          </h2>
          <span className={cn("badge ml-1", placed ? "b-done" : "b-new")}>
            {placed ? "Ordered" : "Draft"}
          </span>
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
          {readOnly && (
            <Notice tone="ok">
              {placed
                ? "This order has been placed. Ask the office if it needs to change."
                : "You can view this order but not change it."}
            </Notice>
          )}
          {perms.isCrew && !placed && !readOnly && (
            <p className="mb-4 text-[13.5px] text-ink-muted">
              Your request goes to the office for review before it&apos;s
              ordered.
            </p>
          )}

          <fieldset
            disabled={readOnly || pending}
            className="grid gap-x-4 gap-y-3.5 sm:grid-cols-2"
          >
            {def.fields.map((f) => {
              const id = `o-${f.name}`;
              const err = errors[f.name]?.message;
              const header =
                f.group && f.group !== lastGroup ? (
                  <h3 className="mt-2 font-mono text-[11px] tracking-[0.14em] text-ink-muted uppercase sm:col-span-2">
                    {f.group}
                  </h3>
                ) : null;
              lastGroup = f.group;
              const control =
                f.kind === "supplier" || f.kind === "mortar" ? (
                  <select
                    id={id}
                    className="input"
                    aria-invalid={err ? true : undefined}
                    {...register(f.name)}
                  >
                    <option value="">—</option>
                    {(f.kind === "supplier"
                      ? suppliers
                      : options.mortarColors
                    ).map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                ) : f.kind === "textarea" ? (
                  <textarea
                    id={id}
                    rows={2}
                    className="input resize-y"
                    {...register(f.name)}
                  />
                ) : (
                  <>
                    <input
                      id={id}
                      type={f.kind === "date" ? "date" : "text"}
                      inputMode={
                        f.kind === "decimal"
                          ? "decimal"
                          : f.kind === "int"
                            ? "numeric"
                            : undefined
                      }
                      list={f.suggestions ? `${id}-list` : undefined}
                      aria-invalid={err ? true : undefined}
                      className={cn(
                        "input",
                        (f.kind === "decimal" ||
                          f.kind === "int" ||
                          f.kind === "date") &&
                          "font-mono text-[14px]",
                      )}
                      {...register(f.name)}
                    />
                    {f.suggestions && (
                      <datalist id={`${id}-list`}>
                        {f.suggestions.map((s) => (
                          <option key={s} value={s} />
                        ))}
                      </datalist>
                    )}
                  </>
                );
              return (
                <div key={f.name} className={cn("contents")}>
                  {header}
                  <div
                    className={cn(
                      "min-w-0",
                      (f.wide || f.kind === "textarea") && "sm:col-span-2",
                    )}
                  >
                    <label htmlFor={id} className="label">
                      {f.label}
                      {f.unit && (
                        <span className="font-normal text-ink-muted">
                          {" "}
                          ({f.unit})
                        </span>
                      )}
                    </label>
                    {control}
                    {err && (
                      <p className="mt-1 text-[12.5px] font-semibold text-chalk">
                        {err}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}

            {type === "stucco_material" && (
              <div className="sm:col-span-2">
                <h3 className="mt-2 mb-2 font-mono text-[11px] tracking-[0.14em] text-ink-muted uppercase">
                  Line items{" "}
                  <span className="normal-case">(leave blank for none)</span>
                </h3>
                <ul className="divide-y divide-limestone rounded-md border border-mortar">
                  {options.stuccoItems.map((it) => {
                    const unit = unitOf(it.code, it.unit);
                    return (
                      <li
                        key={it.code}
                        className="flex items-center gap-3 px-3 py-2"
                      >
                        <label
                          htmlFor={`si-${it.code}`}
                          className="min-w-0 flex-1 text-[14px]"
                        >
                          {it.name}
                        </label>
                        <input
                          id={`si-${it.code}`}
                          inputMode="decimal"
                          value={qty(it.code)}
                          onChange={(e) =>
                            setQty(it.code, unit, e.target.value)
                          }
                          className="input w-20 py-1.5 text-right font-mono text-[14px]"
                        />
                        <span className="w-14 font-mono text-[12px] text-ink-muted">
                          {unit}
                        </span>
                      </li>
                    );
                  })}
                </ul>
                {errors.items && (
                  <p className="mt-1 text-[12.5px] font-semibold text-chalk">
                    Line item quantities must be numbers.
                  </p>
                )}
              </div>
            )}

            {perms.canPlace && (
              <label className="flex items-center gap-2.5 rounded-md bg-limestone px-3.5 py-3 text-[15px] font-semibold sm:col-span-2">
                <input
                  type="checkbox"
                  className="size-[18px] accent-[var(--flame)]"
                  {...register("ordered")}
                />
                Ordered — placed with the supplier
                <span className="ml-auto font-mono text-[12px] font-normal text-ink-muted">
                  {placed
                    ? "date stamped automatically"
                    : "stamps today's date"}
                </span>
              </label>
            )}
          </fieldset>
        </div>

        <footer className="flex flex-wrap items-center gap-3 border-t border-mortar px-5 py-3.5">
          {canDelete && (
            <ConfirmButton
              label={perms.isCrew ? "Withdraw" : "Delete"}
              onConfirm={async () => {
                const res = await deleteOrder(type, jobId, orderId!);
                if (res.error) setError(res.error);
                else onSaved();
              }}
            />
          )}
          <span className="ml-auto" />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => ref.current?.close()}
          >
            {readOnly ? "Close" : "Cancel"}
          </Button>
          {!readOnly && (
            <Button type="submit" variant="fire" size="sm" disabled={pending}>
              {pending
                ? "Saving…"
                : perms.isCrew && !orderId
                  ? "Send Request"
                  : "Save Order"}
            </Button>
          )}
        </footer>
      </form>
    </dialog>
  );
}
