import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { EntityOptions } from "./entities";

/** Picklists for the admin editors: active builders and crew managers. */
export async function loadEntityOptions(): Promise<EntityOptions> {
  const supabase = await createClient();
  const [builders, managers] = await Promise.all([
    supabase
      .from("builders")
      .select("id, name")
      .eq("active", true)
      .order("name"),
    supabase
      .from("profiles")
      .select("id, full_name, email")
      .eq("role", "crew_manager")
      .eq("active", true)
      .order("full_name"),
  ]);
  return {
    builders: (builders.data ?? []).map((b) => ({
      value: b.id,
      label: b.name,
    })),
    crewManagers: (managers.data ?? []).map((p) => ({
      value: p.id,
      label: p.full_name ?? p.email ?? "—",
    })),
  };
}
