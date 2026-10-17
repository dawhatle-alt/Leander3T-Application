"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm, useWatch, type Path } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Notice } from "@/components/auth/form-bits";
import { saveJob } from "@/app/(app)/jobs/save-job";
import type { JobFormOptions, Option } from "@/lib/jobs/options";
import {
  jobSchema,
  type JobFormInput,
  type JobFormOutput,
} from "@/lib/validation/job";
import { cn } from "@/lib/utils";

type FieldName = Path<JobFormInput>;
type Field =
  | {
      name: FieldName;
      label: string;
      kind: "text" | "date";
      wide?: boolean;
      hint?: string;
    }
  | {
      name: FieldName;
      label: string;
      kind: "number";
      unit?: string;
      hint?: string;
    }
  | { name: FieldName; label: string; kind: "textarea"; wide?: boolean }
  | {
      name: FieldName;
      label: string;
      kind: "select";
      options: Option[];
      hint?: string;
      required?: boolean;
    };

export function JobForm({
  jobId,
  defaults,
  options,
  isAdmin,
}: {
  jobId: string | null;
  defaults: JobFormInput;
  options: JobFormOptions;
  isAdmin: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);

  const form = useForm<JobFormInput, unknown, JobFormOutput>({
    resolver: zodResolver(jobSchema),
    defaultValues: defaults,
    mode: "onTouched",
  });
  const { register, handleSubmit, setError, formState, control, setValue } =
    form;
  const errors = formState.errors as Record<
    string,
    { message?: string } | undefined
  >;

  const builderId = useWatch({ control, name: "builder_id" });
  const current = useWatch({ control });

  // Inactive choices stay hidden unless the job already uses them.
  const live = (list: Option[], name: FieldName) =>
    list.filter(
      (o) =>
        o.active !== false || o.value === current[name as keyof JobFormInput],
    );
  const crews = (trade: string, name: FieldName) =>
    live(
      options.crews.filter((c) => c.trade === trade),
      name,
    );

  const managers = options.managers.filter((m) => m.builderId === builderId);

  const onSubmit = handleSubmit(() => {
    setFormError(null);
    start(async () => {
      const res = await saveJob(jobId, form.getValues());
      if (res.fieldErrors) {
        for (const [k, msg] of Object.entries(res.fieldErrors)) {
          setError(k as FieldName, { message: msg });
        }
      }
      if (res.error) {
        setFormError(res.error);
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }
      router.push(`/jobs/${res.id}`);
      router.refresh();
    });
  });

  const field = (f: Field) => {
    const err = errors[f.name]?.message;
    const id = `f-${f.name}`;
    const common = {
      id,
      "aria-invalid": err ? true : undefined,
      "aria-describedby": err ? `${id}-err` : undefined,
      className: "input",
    } as const;
    return (
      <div
        key={f.name}
        className={cn(
          "min-w-0",
          (f.kind === "textarea" || ("wide" in f && f.wide)) &&
            "sm:col-span-2 lg:col-span-3",
        )}
      >
        <label htmlFor={id} className="label">
          {f.label}
          {"unit" in f && f.unit && (
            <span className="font-normal text-ink-muted"> ({f.unit})</span>
          )}
        </label>
        {f.kind === "select" ? (
          <select {...common} {...register(f.name)}>
            {!f.required && <option value="">—</option>}
            {f.options.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
                {o.active === false ? " (inactive)" : ""}
              </option>
            ))}
          </select>
        ) : f.kind === "textarea" ? (
          <textarea
            {...common}
            rows={3}
            className="input resize-y"
            {...register(f.name)}
          />
        ) : (
          <input
            {...common}
            type={f.kind === "date" ? "date" : "text"}
            inputMode={f.kind === "number" ? "decimal" : undefined}
            className={cn(
              "input",
              (f.kind === "number" || f.kind === "date") &&
                "font-mono text-[14px]",
            )}
            {...register(f.name)}
          />
        )}
        {"hint" in f && f.hint && !err && (
          <p className="mt-1 text-[12.5px] text-ink-muted">{f.hint}</p>
        )}
        {err && (
          <p
            id={`${id}-err`}
            className="mt-1 text-[12.5px] font-semibold text-chalk"
          >
            {err}
          </p>
        )}
      </div>
    );
  };

  const section = (
    title: string,
    fields: Field[],
    accent?: string,
    intro?: string,
  ) => (
    <section className="overflow-hidden rounded-md border border-mortar bg-paper shadow-card">
      <header
        className={cn(
          "border-b border-mortar px-6 py-4",
          accent && `${accent} border-transparent text-white`,
        )}
      >
        <h2 className="font-display text-[22px] font-bold uppercase">
          {title}
        </h2>
        {intro && (
          <p
            className={cn(
              "text-[13.5px]",
              accent ? "text-white/85" : "text-ink-muted",
            )}
          >
            {intro}
          </p>
        )}
      </header>
      <div className="grid gap-x-5 gap-y-4 px-6 py-5 sm:grid-cols-2 lg:grid-cols-3">
        {fields.map(field)}
      </div>
    </section>
  );

  const people = (
    title: string,
    name: "supervisor_ids" | "employee_ids",
    list: Option[],
  ) => (
    <fieldset className="min-w-0">
      <legend className="label">{title}</legend>
      {list.length ? (
        <div className="flex flex-wrap gap-2">
          {list.map((p) => {
            const chosen = (current[name] ?? []) as string[];
            return (
              <label
                key={p.value}
                className="inline-flex cursor-pointer items-center gap-2 rounded-full border-[1.5px] border-mortar-2 bg-limestone px-3.5 py-1.5 text-[14px] font-semibold has-[:checked]:border-charcoal has-[:checked]:bg-charcoal has-[:checked]:text-limestone has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-amber"
              >
                <input
                  type="checkbox"
                  className="sr-only"
                  checked={chosen.includes(p.value)}
                  onChange={(e) =>
                    setValue(
                      name,
                      e.target.checked
                        ? [...chosen, p.value]
                        : chosen.filter((v) => v !== p.value),
                      { shouldDirty: true },
                    )
                  }
                />
                {p.label}
              </label>
            );
          })}
        </div>
      ) : (
        <p className="text-[14px] text-ink-muted">No one to choose yet.</p>
      )}
    </fieldset>
  );

  const builderReg = register("builder_id");

  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-6">
      {formError && <Notice tone="error">{formError}</Notice>}

      {section("House & Builder", [
        { name: "house_number", label: "House number", kind: "text" },
        { name: "street", label: "Street", kind: "text" },
        { name: "subdivision", label: "Subdivision", kind: "text" },
        { name: "area", label: "Area / city", kind: "text" },
        { name: "plan_name", label: "Plan name", kind: "text" },
        { name: "plan_number", label: "Plan number", kind: "text" },
        { name: "elevation", label: "Elevation", kind: "text" },
        {
          name: "lot_swing",
          label: "Lot swing",
          kind: "select",
          options: [
            { value: "right", label: "Right" },
            { value: "left", label: "Left" },
            { value: "other", label: "Other" },
          ],
        },
        { name: "sqft", label: "Home size", kind: "number", unit: "SF" },
        {
          name: "company",
          label: "Company",
          kind: "select",
          required: true,
          options: [
            { value: "leander_3t", label: "Leander 3T" },
            {
              value: "3t_construction_solutions",
              label: "3T Construction Solutions",
            },
          ],
        },
        { name: "area_directions", label: "Directions", kind: "textarea" },
      ])}

      <section className="overflow-hidden rounded-md border border-mortar bg-paper shadow-card">
        <header className="border-b border-mortar px-6 py-4">
          <h2 className="font-display text-[22px] font-bold uppercase">
            Builder & Team
          </h2>
        </header>
        <div className="grid gap-x-5 gap-y-4 px-6 py-5 sm:grid-cols-2">
          <div>
            <label htmlFor="f-builder_id" className="label">
              Builder
            </label>
            <select
              id="f-builder_id"
              className="input"
              {...builderReg}
              onChange={(e) => {
                builderReg.onChange(e);
                setValue("construction_manager_id", "");
              }}
            >
              <option value="">—</option>
              {live(options.builders, "builder_id").map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                  {o.active === false ? " (inactive)" : ""}
                </option>
              ))}
            </select>
          </div>
          {field({
            name: "construction_manager_id",
            label: "Construction manager",
            kind: "select",
            options: managers,
            hint: builderId ? undefined : "Pick the builder first.",
          })}
          {isAdmin && (
            <>
              {people("Supervisors", "supervisor_ids", options.supervisors)}
              {people("Employees", "employee_ids", options.employees)}
            </>
          )}
        </div>
      </section>

      {section("Status & Dates", [
        {
          name: "status",
          label: "Status",
          kind: "select",
          required: true,
          options: [
            { value: "new", label: "New" },
            { value: "in_progress", label: "In Progress" },
            { value: "completed", label: "Completed" },
          ],
          hint: "Reaching 100% marks the job completed automatically.",
        },
        {
          name: "completion_percent",
          label: "Completion",
          kind: "number",
          unit: "%",
        },
        { name: "date_received", label: "Received", kind: "date" },
        {
          name: "supply_delivery_date",
          label: "Supplies delivered",
          kind: "date",
        },
        {
          name: "targeted_completion_date",
          label: "Target completion",
          kind: "date",
        },
        {
          name: "job_completed_date",
          label: "Job completed",
          kind: "date",
          hint: "Stamped automatically when the job is completed.",
        },
      ])}

      {section(
        "Brick",
        [
          { name: "brick_sqft", label: "Brick", kind: "number", unit: "SF" },
          {
            name: "brick_color_id",
            label: "Brick color",
            kind: "select",
            options: live(options.brickColors, "brick_color_id"),
          },
          {
            name: "brick_mortar_color_id",
            label: "Mortar color",
            kind: "select",
            options: live(options.mortarColors, "brick_mortar_color_id"),
          },
          {
            name: "brick_drop_slab_ft",
            label: "Drop slab",
            kind: "number",
            unit: "ft",
          },
          {
            name: "brick_detail_ft",
            label: "Detail",
            kind: "number",
            unit: "ft",
          },
          {
            name: "brick_paver_ft",
            label: "Pavers",
            kind: "number",
            unit: "ft",
          },
          { name: "brick_start_date", label: "Start", kind: "date" },
          { name: "brick_end_date", label: "End", kind: "date" },
          { name: "brick_completion_date", label: "Completed", kind: "date" },
          {
            name: "brick_crew_id",
            label: "Crew",
            kind: "select",
            options: crews("brick", "brick_crew_id"),
          },
          { name: "brick_notes", label: "Brick notes", kind: "textarea" },
        ],
        "sp-brick",
        "Leave Brick SF blank if the job has no brick.",
      )}

      {section(
        "Stone",
        [
          { name: "stone_sqft", label: "Stone", kind: "number", unit: "SF" },
          { name: "stone_color", label: "Stone color / style", kind: "text" },
          {
            name: "stone_mortar_color_id",
            label: "Mortar color",
            kind: "select",
            options: live(options.mortarColors, "stone_mortar_color_id"),
          },
          {
            name: "stone_drop_ft",
            label: "Stone drop",
            kind: "number",
            unit: "ft",
          },
          { name: "stone_start_date", label: "Start", kind: "date" },
          { name: "stone_end_date", label: "End", kind: "date" },
          { name: "stone_completion_date", label: "Completed", kind: "date" },
          {
            name: "stone_crew_id",
            label: "Crew",
            kind: "select",
            options: crews("stone", "stone_crew_id"),
          },
          { name: "stone_notes", label: "Stone notes", kind: "textarea" },
        ],
        "sp-stone",
        "Stone dates follow the brick dates automatically unless you set them here.",
      )}

      {section(
        "Stucco",
        [
          { name: "stucco_sqft", label: "Stucco", kind: "number", unit: "SF" },
          {
            name: "stucco_body_paint_color",
            label: "Body paint color",
            kind: "text",
          },
          {
            name: "stucco_trim_paint_color",
            label: "Trim paint color",
            kind: "text",
          },
          {
            name: "stucco_percent_complete",
            label: "Stucco complete",
            kind: "number",
            unit: "%",
          },
          { name: "stucco_start_date", label: "Start", kind: "date" },
          { name: "stucco_end_date", label: "End", kind: "date" },
          { name: "stucco_completion_date", label: "Completed", kind: "date" },
          {
            name: "stucco_crew_id",
            label: "Crew",
            kind: "select",
            options: crews("stucco", "stucco_crew_id"),
          },
          { name: "stucco_notes", label: "Stucco notes", kind: "textarea" },
        ],
        "sp-stucco",
      )}

      <section className="overflow-hidden rounded-md border border-mortar bg-paper shadow-card">
        <header className="border-b border-mortar px-6 py-4">
          <h2 className="font-display text-[22px] font-bold uppercase">
            Fireplace & Notes
          </h2>
        </header>
        <div className="grid gap-x-5 gap-y-4 px-6 py-5 sm:grid-cols-2">
          <label className="flex items-center gap-2.5 text-[15px] font-semibold sm:col-span-2">
            <input
              type="checkbox"
              className="size-[18px] accent-[var(--flame)]"
              {...register("has_fireplace")}
            />
            This home has a masonry fireplace
          </label>
          {field({
            name: "fireplace_notes",
            label: "Fireplace notes",
            kind: "textarea",
          })}
          {field({
            name: "additional_notes",
            label: "Additional notes",
            kind: "textarea",
          })}
        </div>
      </section>

      <div className="sticky bottom-0 z-10 -mx-5 flex flex-wrap items-center justify-end gap-3 border-t border-mortar bg-limestone/95 px-5 py-4 backdrop-blur md:-mx-10 md:px-10">
        <Button asChild variant="outline" size="sm">
          <Link href={jobId ? `/jobs/${jobId}` : "/jobs"}>Cancel</Link>
        </Button>
        <Button type="submit" variant="fire" size="sm" disabled={pending}>
          {pending ? "Saving…" : jobId ? "Save Changes" : "Create Job"}
        </Button>
      </div>
    </form>
  );
}
