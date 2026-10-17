import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { AppRole } from "./roles";

export type SessionProfile = {
  id: string;
  email: string | null;
  fullName: string | null;
  phone: string | null;
  role: AppRole;
  builderId: string | null;
  builderName: string | null;
};

// The signed-in person's profile, read once per request. Middleware has
// already turned away signed-out and deactivated users from guarded pages.
export const getSessionProfile = cache(
  async (): Promise<SessionProfile | null> => {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;

    const { data } = await supabase
      .from("profiles")
      .select(
        "id, email, full_name, phone, role, builder_id, active, builders(name)",
      )
      .eq("id", user.id)
      .maybeSingle();
    if (!data || !data.active) return null;

    return {
      id: data.id,
      email: data.email ?? user.email ?? null,
      fullName: data.full_name,
      phone: data.phone,
      role: data.role,
      builderId: data.builder_id,
      builderName: data.builders?.name ?? null,
    };
  },
);

export async function requireProfile(): Promise<SessionProfile> {
  const profile = await getSessionProfile();
  if (!profile) redirect("/sign-in");
  return profile;
}
