"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getSessionProfile } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { orderSchema, type OrderFormValues } from "@/lib/validation/order";
import { ORDER_TYPES, isOrderType, type OrderTypeKey } from "./types";

// Material orders are saved as the signed-in person, so the database decides
// who may create, edit, place or remove them:
//   office (admins, the job's supervisors): anything on their jobs
//   crew managers: drafts on their crew's jobs; never place or change a placed order

export type OrderResult = {
  error?: string;
  fieldErrors?: Record<string, string>;
  id?: string;
};

const guid = z.guid();

function refresh(jobId: string) {
  revalidatePath(`/jobs/${jobId}`);
  revalidatePath(`/crew/jobs/${jobId}`);
  revalidatePath("/crew");
  revalidatePath("/orders");
}

function friendly(code: string | undefined, message?: string) {
  if (code === "42501") {
    return message?.includes("office")
      ? message
      : "You don't have permission to change orders on this job.";
  }
  if (code === "23503")
    return "A picked supplier or color no longer exists. Reload and try again.";
  return "The order couldn't be saved. Try again.";
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Loose = any;

export async function saveOrder(input: {
  type: string;
  jobId: string;
  orderId: string | null;
  values: OrderFormValues;
}): Promise<OrderResult> {
  const me = await getSessionProfile();
  if (!me) return { error: "Your session has ended. Sign in again." };
  if (!isOrderType(input.type) || !guid.safeParse(input.jobId).success)
    return { error: "Not found." };
  if (input.orderId && !guid.safeParse(input.orderId).success)
    return { error: "Not found." };
  const type: OrderTypeKey = input.type;

  const parsed = orderSchema(type).safeParse(input.values);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues)
      fieldErrors[String(issue.path[0])] ??= issue.message;
    return { error: "Check the highlighted fields.", fieldErrors };
  }
  const { items, ordered, ...fields } = parsed.data as Record<
    string,
    unknown
  > & {
    items: { code: string; quantity: number | null; unit: string }[];
    ordered: boolean;
  };

  const supabase = await createClient();
  const t: Loose = supabase.from(ORDER_TYPES[type].table as "sand_orders");
  // Crew managers' orders are always drafts; the office places them.
  const row =
    me.role === "crew_manager"
      ? fields
      : ordered
        ? { ...fields, ordered }
        : { ...fields, ordered, ordered_date: null };

  let id = input.orderId;
  if (id) {
    const { data, error } = await t
      .update(row)
      .eq("id", id)
      .eq("job_id", input.jobId)
      .select("id");
    if (error) return { error: friendly(error.code, error.message) };
    if (!data?.length) return { error: "You can't change this order." };
  } else {
    const { data, error } = await t
      .insert({ ...row, job_id: input.jobId, created_by: me.id })
      .select("id")
      .single();
    if (error || !data) return { error: friendly(error?.code, error?.message) };
    id = data.id as string;
  }

  if (type === "stucco_material") {
    const res = await saveStuccoItems(id, items);
    if (res) return { error: res, id };
  }

  refresh(input.jobId);
  return { id };
}

async function saveStuccoItems(
  orderId: string,
  items: { code: string; quantity: number | null; unit: string }[],
) {
  const supabase = await createClient();
  const keep = items.filter((i) => i.quantity !== null && i.quantity > 0);
  const { data: current } = await supabase
    .from("stucco_order_items")
    .select("item_code")
    .eq("order_id", orderId);
  const keepCodes = new Set(keep.map((i) => i.code));
  const drop = (current ?? [])
    .map((c) => c.item_code)
    .filter((c) => !keepCodes.has(c));

  if (keep.length) {
    const { error } = await supabase.from("stucco_order_items").upsert(
      keep.map((i) => ({
        order_id: orderId,
        item_code: i.code,
        quantity: i.quantity!,
        unit: i.unit,
      })),
      { onConflict: "order_id,item_code" },
    );
    if (error) return "The order was saved, but its line items couldn't be.";
  }
  if (drop.length) {
    const { error } = await supabase
      .from("stucco_order_items")
      .delete()
      .eq("order_id", orderId)
      .in("item_code", drop);
    if (error)
      return "The order was saved, but some line items couldn't be removed.";
  }
  return null;
}

export async function deleteOrder(
  type: string,
  jobId: string,
  orderId: string,
): Promise<OrderResult> {
  const me = await getSessionProfile();
  if (!me) return { error: "Your session has ended. Sign in again." };
  if (
    !isOrderType(type) ||
    !guid.safeParse(jobId).success ||
    !guid.safeParse(orderId).success
  ) {
    return { error: "Not found." };
  }
  const supabase = await createClient();
  const t: Loose = supabase.from(ORDER_TYPES[type].table as "sand_orders");
  const { data, error } = await t
    .delete()
    .eq("id", orderId)
    .eq("job_id", jobId)
    .select("id");
  if (error || !data?.length) {
    return {
      error:
        me.role === "crew_manager"
          ? "Only the office can remove this order."
          : "This order can't be removed. Placed orders can only be removed by Administration.",
    };
  }
  refresh(jobId);
  return {};
}

/** Office: mark an order placed (stamps today's date) or back to draft. */
export async function setOrdered(
  type: string,
  jobId: string,
  orderId: string,
  ordered: boolean,
): Promise<OrderResult> {
  const me = await getSessionProfile();
  if (!me) return { error: "Your session has ended. Sign in again." };
  if (
    !isOrderType(type) ||
    !guid.safeParse(jobId).success ||
    !guid.safeParse(orderId).success
  ) {
    return { error: "Not found." };
  }
  const supabase = await createClient();
  const t: Loose = supabase.from(ORDER_TYPES[type].table as "sand_orders");
  const patch = ordered
    ? { ordered: true }
    : { ordered: false, ordered_date: null };
  const { data, error } = await t
    .update(patch)
    .eq("id", orderId)
    .eq("job_id", jobId)
    .select("id");
  if (error || !data?.length) {
    return {
      error:
        friendly(error?.code, error?.message) || "You can't change this order.",
    };
  }
  refresh(jobId);
  return {};
}
