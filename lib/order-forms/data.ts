import "server-only";
import { createClient } from "@/lib/supabase/server";
import { LAYOUT_LABEL, type FormLayout, type FormOrderRef } from "./build";

export type FormRow = {
  id: string;
  number: number;
  layout: FormLayout;
  layoutLabel: string;
  status: "pending_review" | "approved";
  version: number;
  orders: FormOrderRef[];
  generatedAt: string;
  generatedBy: string | null;
  reviewedAt: string | null;
  reviewedBy: string | null;
  notified: boolean;
  job: {
    id: string;
    address: string;
    subdivision: string | null;
    builder: string | null;
  };
};

const SELECT = `id, form_number, layout, status, version, orders, generated_at, reviewed_at, notified_at,
  generator:profiles!order_forms_generated_by_fkey(full_name),
  reviewer:profiles!order_forms_reviewed_by_fkey(full_name),
  jobs!inner(id, property_address, subdivision, builders(name))`;

/** Order forms the signed-in person can see, newest first. */
export async function loadForms(filter: {
  jobId?: string;
  status?: "pending_review" | "approved";
  since?: string; // ISO timestamp; approved forms reviewed since then
  limit?: number;
}): Promise<FormRow[]> {
  const supabase = await createClient();
  let q = supabase.from("order_forms").select(SELECT);
  if (filter.jobId) q = q.eq("job_id", filter.jobId);
  if (filter.status) q = q.eq("status", filter.status);
  if (filter.since) q = q.gte("reviewed_at", filter.since);
  const { data } = await q
    .order(filter.status === "approved" ? "reviewed_at" : "generated_at", {
      ascending: filter.status === "pending_review",
    })
    .limit(filter.limit ?? 200);

  return (data ?? []).map((f) => ({
    id: f.id,
    number: f.form_number,
    layout: f.layout,
    layoutLabel: LAYOUT_LABEL[f.layout],
    status: f.status,
    version: f.version,
    orders: (f.orders ?? []) as FormOrderRef[],
    generatedAt: f.generated_at,
    generatedBy: f.generator?.full_name ?? null,
    reviewedAt: f.reviewed_at,
    reviewedBy: f.reviewer?.full_name ?? null,
    notified: Boolean(f.notified_at),
    job: {
      id: f.jobs.id,
      address: f.jobs.property_address ?? "",
      subdivision: f.jobs.subdivision,
      builder: f.jobs.builders?.name ?? null,
    },
  }));
}

export async function countPendingForms(): Promise<number> {
  const supabase = await createClient();
  const { count } = await supabase
    .from("order_forms")
    .select("id", { count: "exact", head: true })
    .eq("status", "pending_review");
  return count ?? 0;
}
