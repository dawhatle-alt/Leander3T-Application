"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getSessionProfile } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

// Address block (the stone/brick address marker) status for one job. The
// database stamps the ordered and delivered dates (automation 3); moving a
// block back clears the dates that no longer apply.
const input = z.object({
  jobId: z.guid(),
  status: z.enum(["none", "ordered", "delivered"]),
});

export async function setAddressBlock(
  jobId: string,
  status: string,
): Promise<{ error?: string }> {
  const me = await getSessionProfile();
  if (!me) return { error: "Your session has ended. Sign in again." };
  const parsed = input.safeParse({ jobId, status });
  if (!parsed.success) return { error: "Not found." };
  const s = parsed.data.status;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("address_block_orders")
    .upsert(
      {
        job_id: parsed.data.jobId,
        status: s,
        ...(s === "none" ? { ordered_date: null, delivered_date: null } : {}),
        ...(s === "ordered" ? { delivered_date: null } : {}),
      },
      { onConflict: "job_id" },
    )
    .select("id");
  if (error || !data?.length)
    return { error: "You don't have permission to change this job." };

  revalidatePath(`/jobs/${parsed.data.jobId}`);
  revalidatePath("/admin/address-blocks");
  return {};
}
