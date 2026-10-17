import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { requireProfile, type SessionProfile } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export const PREVIEW_COOKIE = "portal_preview_builder";

export type PortalContext = {
  me: SessionProfile;
  builderId: string;
  builderName: string;
  /** The signed-in builder user's construction manager record, if linked. */
  cmId: string | null;
  /** An administrator previewing the portal as a builder. */
  preview: boolean;
  builders: { id: string; name: string }[];
};

// Which builder the portal shows. A builder user always sees their own
// company (and row-level security enforces it regardless). Administrators
// preview any builder; the choice is kept in a cookie.
export async function portalContext(): Promise<PortalContext> {
  const me = await requireProfile();
  const supabase = await createClient();

  if (me.role === "builder") {
    if (!me.builderId) redirect("/sign-in?error=inactive");
    const { data: p } = await supabase
      .from("profiles")
      .select("construction_manager_id")
      .eq("id", me.id)
      .maybeSingle();
    return {
      me,
      builderId: me.builderId,
      builderName: me.builderName ?? "Your company",
      cmId: p?.construction_manager_id ?? null,
      preview: false,
      builders: [],
    };
  }

  if (me.role !== "admin") redirect("/dashboard");
  const { data: builders } = await supabase
    .from("builders")
    .select("id, name")
    .eq("active", true)
    .order("name");
  const list = builders ?? [];
  const chosen = (await cookies()).get(PREVIEW_COOKIE)?.value;
  const b = list.find((x) => x.id === chosen) ?? list[0];
  if (!b) redirect("/admin/builders");
  return {
    me,
    builderId: b.id,
    builderName: b.name,
    cmId: null,
    preview: true,
    builders: list,
  };
}
