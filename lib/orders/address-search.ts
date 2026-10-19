"use server";

import { z } from "zod";
import { getSessionProfile } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export type AddressMatch = {
  id: string;
  address: string;
  subdivision: string | null;
  builder: string | null;
};

const query = z.string().trim().min(2).max(80);

// Literal match: % and _ in what was typed aren't wildcards.
const escapeLike = (s: string) => s.replace(/[\\%_]/g, (c) => `\\${c}`);

/**
 * Addresses for the Orders page's "orders for an address" box. Office only
 * (Administration and supervisors); the database still limits which jobs
 * come back.
 */
export async function searchOrderAddresses(
  input: string,
): Promise<AddressMatch[]> {
  const me = await getSessionProfile();
  if (!me || (me.role !== "admin" && me.role !== "supervisor")) return [];
  const parsed = query.safeParse(input);
  if (!parsed.success) return [];

  const supabase = await createClient();
  const { data } = await supabase
    .from("jobs")
    .select("id, property_address, subdivision, builders(name)")
    .ilike("property_address", `%${escapeLike(parsed.data)}%`)
    .order("property_address")
    .limit(8);

  return (data ?? []).map((j) => ({
    id: j.id,
    address: j.property_address ?? "(no address)",
    subdivision: j.subdivision,
    builder: j.builders?.name ?? null,
  }));
}
