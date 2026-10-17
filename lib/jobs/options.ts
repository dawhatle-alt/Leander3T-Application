import "server-only";
import { createClient } from "@/lib/supabase/server";

export type Option = { value: string; label: string; active?: boolean };
export type JobFormOptions = {
  builders: Option[];
  managers: (Option & { builderId: string | null })[];
  brickColors: Option[];
  mortarColors: Option[];
  crews: (Option & { trade: string })[];
  supervisors: Option[];
  employees: Option[];
};

// Picklists for the job form. The form hides inactive entries from new choices,
// but a job's current value is still listed so editing never drops it.
export async function loadJobFormOptions(
  includePeople: boolean,
): Promise<JobFormOptions> {
  const supabase = await createClient();
  const [builders, managers, brick, mortar, crews, people] = await Promise.all([
    supabase.from("builders").select("id, name, active").order("name"),
    supabase
      .from("construction_managers")
      .select("id, name, builder_id, active")
      .order("name"),
    supabase
      .from("brick_colors")
      .select("id, name, active")
      .order("sort_order")
      .order("name"),
    supabase
      .from("mortar_colors")
      .select("id, name, active")
      .order("sort_order")
      .order("name"),
    supabase.from("crews").select("id, name, trade, active").order("name"),
    includePeople
      ? supabase
          .from("profiles")
          .select("id, full_name, email, role")
          .eq("active", true)
          .in("role", ["supervisor", "employee"])
          .order("full_name")
      : Promise.resolve({
          data: [] as {
            id: string;
            full_name: string | null;
            email: string | null;
            role: string;
          }[],
        }),
  ]);

  const person = (p: {
    id: string;
    full_name: string | null;
    email: string | null;
  }) => ({
    value: p.id,
    label: p.full_name ?? p.email ?? "—",
  });

  return {
    builders: (builders.data ?? []).map((b) => ({
      value: b.id,
      label: b.name,
      active: b.active,
    })),
    managers: (managers.data ?? []).map((m) => ({
      value: m.id,
      label: m.name,
      builderId: m.builder_id,
      active: m.active,
    })),
    brickColors: (brick.data ?? []).map((c) => ({
      value: c.id,
      label: c.name,
      active: c.active,
    })),
    mortarColors: (mortar.data ?? []).map((c) => ({
      value: c.id,
      label: c.name,
      active: c.active,
    })),
    crews: (crews.data ?? []).map((c) => ({
      value: c.id,
      label: c.name,
      trade: c.trade,
      active: c.active,
    })),
    supervisors: (people.data ?? [])
      .filter((p) => p.role === "supervisor")
      .map(person),
    employees: (people.data ?? [])
      .filter((p) => p.role === "employee")
      .map(person),
  };
}
