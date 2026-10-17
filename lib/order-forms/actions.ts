"use server";

import { createElement, type ReactElement } from "react";
import { revalidatePath } from "next/cache";
import { renderToBuffer, type DocumentProps } from "@react-pdf/renderer";
import { z } from "zod";
import { getSessionProfile } from "@/lib/auth/session";
import { siteOrigin } from "@/lib/auth/origin";
import { createClient } from "@/lib/supabase/server";
import { OrderFormPdf } from "@/lib/pdf/order-form";
import { ORDER_TYPES, isOrderType } from "@/lib/orders/types";
import {
  LAYOUT_LABEL,
  buildFormData,
  layoutFor,
  unplacedMasonryOrders,
  type FormLayout,
  type FormOrderRef,
} from "./build";
import { notifyReviewTeam } from "./notify";

// Order-form generation, in one server action (not a chain of triggers):
// gather → render PDF → file it → record the form → mark its orders ordered
// (the database stamps the ordered date) → email the review team.
// Everything runs as the signed-in person, so row-level security decides who
// may do it: administrators and the job's supervisors.

export type FormResult = {
  error?: string;
  id?: string;
  /** Shown after success, e.g. that the email step is not set up yet. */
  note?: string;
};

const guid = z.guid();

function refresh(jobId: string) {
  revalidatePath(`/jobs/${jobId}`);
  revalidatePath("/orders");
  revalidatePath("/orders/forms");
  revalidatePath("/dashboard");
}

const slug = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);

async function render(
  data: Parameters<typeof OrderFormPdf>[0]["data"],
): Promise<Uint8Array> {
  const el = createElement(OrderFormPdf, {
    data,
  }) as unknown as ReactElement<DocumentProps>;
  return new Uint8Array(await renderToBuffer(el));
}

const NOTE = {
  skipped:
    "The review team wasn't emailed: email sending isn't set up yet. The form is waiting in Order Forms.",
  failed:
    "The form is filed, but the email to the review team didn't go through. It's waiting in Order Forms.",
} as const;

/** Creates and files the PDF, then records it as version `version`. */
async function produce(opts: {
  jobId: string;
  layout: FormLayout;
  refs: FormOrderRef[];
  version: number;
  me: { id: string; name: string };
}) {
  const supabase = await createClient();
  const built = await buildFormData(
    supabase,
    opts.jobId,
    opts.layout,
    opts.refs,
    opts.me.name,
  );
  if (!built) return { error: "There are no orders left for this form." };

  let pdf: Uint8Array;
  try {
    pdf = await render(built.data);
  } catch {
    return { error: "The PDF couldn't be created. Try again." };
  }

  const address = built.data.header.propertyAddress;
  const fileName = `L3T ${LAYOUT_LABEL[opts.layout]} Order Form - ${address}.pdf`;
  const path = `${opts.jobId}/${opts.layout}-${slug(address)}-${crypto.randomUUID().slice(0, 8)}-v${opts.version}.pdf`;
  const { error: upErr } = await supabase.storage
    .from("order-forms")
    .upload(path, pdf, { contentType: "application/pdf", upsert: false });
  if (upErr)
    return {
      error: "You don't have permission to create order forms for this job.",
    };

  return { supabase, built, pdf, path, fileName, address };
}

async function markOrdered(
  supabase: Awaited<ReturnType<typeof createClient>>,
  refs: FormOrderRef[],
) {
  for (const r of refs) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const t: any = supabase.from(ORDER_TYPES[r.type].table as "sand_orders");
    const { error } = await t
      .update({ ordered: true })
      .eq("id", r.id)
      .eq("ordered", false);
    if (error) return false;
  }
  return true;
}

/**
 * Office: generate an order form. Masonry covers every unplaced masonry order
 * on the job; stucco and paint cover the one order given.
 */
export async function generateOrderForm(input: {
  jobId: string;
  layout: string;
  orderType?: string;
  orderId?: string;
}): Promise<FormResult> {
  const me = await getSessionProfile();
  if (!me) return { error: "Your session has ended. Sign in again." };
  if (me.role !== "admin" && me.role !== "supervisor")
    return { error: "Only the office can create order forms." };
  if (!guid.safeParse(input.jobId).success) return { error: "Not found." };
  if (!["masonry", "stucco", "paint"].includes(input.layout))
    return { error: "Not found." };
  const layout = input.layout as FormLayout;

  const supabase = await createClient();
  let refs: FormOrderRef[];
  if (layout === "masonry") {
    refs = await unplacedMasonryOrders(supabase, input.jobId);
    if (!refs.length)
      return { error: "There are no unplaced masonry orders on this job." };
  } else {
    if (
      !input.orderType ||
      !isOrderType(input.orderType) ||
      layoutFor(input.orderType) !== layout ||
      !input.orderId ||
      !guid.safeParse(input.orderId).success
    )
      return { error: "Not found." };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const t: any = supabase.from(
      ORDER_TYPES[input.orderType].table as "sand_orders",
    );
    const { data: o } = await t
      .select("id, order_number")
      .eq("id", input.orderId)
      .eq("job_id", input.jobId)
      .maybeSingle();
    if (!o) return { error: "Not found." };
    refs = [
      { type: input.orderType, id: o.id, number: Number(o.order_number) },
    ];
  }

  const name = me.fullName ?? me.email ?? "the office";
  const made = await produce({
    jobId: input.jobId,
    layout,
    refs,
    version: 1,
    me: { id: me.id, name },
  });
  if ("error" in made) return { error: made.error };

  const { data: form, error } = await made.supabase
    .from("order_forms")
    .insert({
      job_id: input.jobId,
      layout,
      orders: made.built.refs,
      storage_path: made.path,
    })
    .select("id")
    .single();
  if (error || !form)
    return { error: "The PDF was made but couldn't be filed. Try again." };

  const ok = await markOrdered(made.supabase, made.built.refs);

  const sent = await notifyReviewTeam(made.supabase, {
    title: `${LAYOUT_LABEL[layout]} order form`,
    address: made.address,
    orders: made.built.refs.map((r) => `#${r.number}`).join(", "),
    generatedBy: name,
    regenerated: false,
    reviewUrl: `${await siteOrigin()}/orders/forms`,
    fileName: made.fileName,
    pdf: made.pdf,
  });
  if (sent === "sent")
    await made.supabase
      .from("order_forms")
      .update({ notified_at: new Date().toISOString() })
      .eq("id", form.id);

  refresh(input.jobId);
  return {
    id: form.id,
    note: !ok
      ? "The form is filed, but some orders couldn't be marked ordered. Check them on the job."
      : sent === "sent"
        ? undefined
        : NOTE[sent],
  };
}

/** Re-renders a form from the current order details, as a new version. */
export async function regenerateOrderForm(formId: string): Promise<FormResult> {
  const me = await getSessionProfile();
  if (!me) return { error: "Your session has ended. Sign in again." };
  if (!guid.safeParse(formId).success) return { error: "Not found." };

  const supabase = await createClient();
  const { data: form } = await supabase
    .from("order_forms")
    .select("id, job_id, layout, orders, version")
    .eq("id", formId)
    .maybeSingle();
  if (!form) return { error: "Not found." };

  const name = me.fullName ?? me.email ?? "the office";
  const made = await produce({
    jobId: form.job_id,
    layout: form.layout,
    refs: form.orders as FormOrderRef[],
    version: form.version + 1,
    me: { id: me.id, name },
  });
  if ("error" in made) return { error: made.error };

  const { error } = await made.supabase
    .from("order_forms")
    .update({
      storage_path: made.path,
      version: form.version + 1,
      orders: made.built.refs,
      status: "pending_review",
      generated_by: me.id,
      generated_at: new Date().toISOString(),
      notified_at: null,
    })
    .eq("id", form.id);
  if (error) return { error: "The new version couldn't be filed. Try again." };

  const sent = await notifyReviewTeam(made.supabase, {
    title: `${LAYOUT_LABEL[form.layout]} order form`,
    address: made.address,
    orders: made.built.refs.map((r) => `#${r.number}`).join(", "),
    generatedBy: name,
    regenerated: true,
    reviewUrl: `${await siteOrigin()}/orders/forms`,
    fileName: made.fileName,
    pdf: made.pdf,
  });
  if (sent === "sent")
    await made.supabase
      .from("order_forms")
      .update({ notified_at: new Date().toISOString() })
      .eq("id", form.id);

  refresh(form.job_id);
  return { id: form.id, note: sent === "sent" ? undefined : NOTE[sent] };
}

/** Review team: approve a form (or send it back to review). */
export async function setFormApproved(
  formId: string,
  approved: boolean,
): Promise<FormResult> {
  const me = await getSessionProfile();
  if (!me) return { error: "Your session has ended. Sign in again." };
  if (!guid.safeParse(formId).success) return { error: "Not found." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("order_forms")
    .update({ status: approved ? "approved" : "pending_review" })
    .eq("id", formId)
    .select("id, job_id");
  if (error || !data?.length)
    return { error: "You don't have permission to review this form." };
  refresh(data[0].job_id);
  return { id: formId };
}
