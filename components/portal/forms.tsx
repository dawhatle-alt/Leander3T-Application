"use client";

import { startTransition, useActionState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Notice } from "@/components/auth/form-bits";
import { submitNewJobRequest, submitUpdateRequest } from "@/lib/portal/actions";
import type { RequestState } from "@/lib/validation/job-request";
import { cn } from "@/lib/utils";

// Submitting through a handler keeps what people typed when something needs
// fixing; the form is cleared only after a successful send.
function useSubmit(
  fn: (prev: RequestState, fd: FormData) => Promise<RequestState>,
) {
  const [state, action, pending] = useActionState<RequestState, FormData>(
    fn,
    {},
  );
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.ok) ref.current?.reset();
  }, [state]);
  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(() => action(fd));
  };
  return { state, pending, ref, onSubmit };
}

function F({
  name,
  label,
  err,
  required,
  className,
  ...input
}: React.ComponentProps<"input"> & {
  name: string;
  label: string;
  err?: string;
}) {
  return (
    <div className={cn("min-w-0", className)}>
      <label htmlFor={`jr-${name}`} className="label">
        {label}
        {required && <span className="text-flame"> *</span>}
      </label>
      <input
        id={`jr-${name}`}
        name={name}
        className="input"
        aria-invalid={err ? true : undefined}
        {...input}
      />
      {err && (
        <p className="mt-1 text-[12.5px] font-semibold text-chalk">{err}</p>
      )}
    </div>
  );
}

export function NewJobRequestForm({ preview }: { preview: boolean }) {
  const router = useRouter();
  const { state, pending, ref, onSubmit } = useSubmit(submitNewJobRequest);
  const err = state.fieldErrors ?? {};
  useEffect(() => {
    if (state.ok) router.push("/portal/requests?sent=1");
  }, [state, router]);

  return (
    <form ref={ref} onSubmit={onSubmit} noValidate className="grid gap-6">
      {state.error && <Notice tone="error">{state.error}</Notice>}
      {preview && (
        <Notice tone="error">
          Preview: you can look at this form, but only builder users can send
          it.
        </Notice>
      )}
      <fieldset className="grid gap-x-4 gap-y-3.5 rounded-md border border-mortar bg-paper p-5 sm:grid-cols-4">
        <legend className="px-1 font-display text-[19px] font-bold uppercase">
          The Home
        </legend>
        <F
          name="house_number"
          label="House #"
          required
          err={err.house_number}
        />
        <F
          name="street"
          label="Street"
          required
          err={err.street}
          className="sm:col-span-3"
        />
        <F name="subdivision" label="Subdivision" className="sm:col-span-2" />
        <F
          name="area"
          label="City / area"
          placeholder="Leander, TX 78641"
          className="sm:col-span-2"
        />
        <F name="plan_name" label="Plan name" className="sm:col-span-2" />
        <F name="plan_number" label="Plan #" />
        <F name="elevation" label="Elevation" />
        <div>
          <label htmlFor="jr-lot_swing" className="label">
            Lot swing
          </label>
          <select id="jr-lot_swing" name="lot_swing" className="input">
            <option value="">—</option>
            <option value="right">Right</option>
            <option value="left">Left</option>
            <option value="other">Other</option>
          </select>
        </div>
        <F
          name="wanted_by"
          label="Wanted by"
          type="date"
          className="sm:col-span-1"
          err={err.wanted_by}
        />
      </fieldset>

      <fieldset className="grid gap-x-4 gap-y-3.5 rounded-md border border-mortar bg-paper p-5 sm:grid-cols-2">
        <legend className="px-1 font-display text-[19px] font-bold uppercase">
          Trades &amp; Colors
        </legend>
        <div className="sm:col-span-2">
          <div className="label">
            Trades <span className="text-flame">*</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {["brick", "stone", "stucco"].map((t) => (
              <label
                key={t}
                className="flex cursor-pointer items-center gap-2 rounded-md border-[1.5px] border-mortar-2 px-3.5 py-2 text-[15px] font-semibold capitalize has-[:checked]:border-flame has-[:checked]:bg-[#e4590f0f]"
              >
                <input
                  type="checkbox"
                  name="trades"
                  value={t}
                  className="accent-[var(--flame)]"
                />
                {t}
              </label>
            ))}
          </div>
          {err.trades && (
            <p className="mt-1 text-[12.5px] font-semibold text-chalk">
              {err.trades}
            </p>
          )}
        </div>
        <F name="brick_color" label="Brick color" />
        <F name="mortar_color" label="Mortar color" />
        <F name="stone_color" label="Stone color / style" />
        <F
          name="stucco_colors"
          label="Stucco body / trim colors"
          placeholder="Accessible Beige SW7036 / Alabaster"
        />
        <div className="sm:col-span-2">
          <label htmlFor="jr-message" className="label">
            Notes for the office
          </label>
          <textarea
            id="jr-message"
            name="message"
            rows={4}
            maxLength={4000}
            className="input resize-y"
            placeholder="Lot number, special details, who to call on site…"
          />
        </div>
      </fieldset>
      <p className="text-[14px] text-ink-muted">
        The office confirms square footages from your plans and replies here.
        Email plan PDFs to the office if they aren&apos;t already on file.
      </p>
      <div>
        <Button type="submit" variant="fire" disabled={pending || preview}>
          {pending ? "Sending…" : "Submit Job Request"}
        </Button>
      </div>
    </form>
  );
}

export function UpdateRequestForm({
  jobId,
  preview,
}: {
  jobId: string;
  preview: boolean;
}) {
  const { state, pending, ref, onSubmit } = useSubmit(submitUpdateRequest);
  return (
    <form ref={ref} onSubmit={onSubmit} noValidate className="px-6 py-5">
      {state.ok && (
        <Notice tone="ok">
          Sent. The office will reply here and on Your Requests.
        </Notice>
      )}
      {state.error && <Notice tone="error">{state.error}</Notice>}
      <input type="hidden" name="job_id" value={jobId} />
      <label htmlFor="ur-message" className="label">
        What would you like to know?
      </label>
      <textarea
        id="ur-message"
        name="message"
        rows={3}
        maxLength={4000}
        className="input mb-3 resize-y"
        placeholder="e.g. When will stone start? Can we move the walk to Friday?"
        aria-invalid={state.fieldErrors?.message ? true : undefined}
      />
      {state.fieldErrors?.message && (
        <p className="-mt-2 mb-3 text-[12.5px] font-semibold text-chalk">
          {state.fieldErrors.message}
        </p>
      )}
      <Button
        type="submit"
        variant="dark"
        size="sm"
        disabled={pending || preview}
      >
        {pending ? "Sending…" : "Request an Update"}
      </Button>
    </form>
  );
}
