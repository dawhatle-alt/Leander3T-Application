"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { logAccess } from "@/lib/audit/access";
import { siteOrigin } from "@/lib/auth/origin";
import { getSessionProfile } from "@/lib/auth/session";
import { createAdminClient, createClient } from "@/lib/supabase/server";

// Administration: give a builder's construction manager a portal login.
// Uses the CM record's name, email and phone; the new account is a Builder
// user for that company and linked to the CM record.
export async function inviteConstructionManager(
  cmId: string,
): Promise<{ error?: string; message?: string }> {
  const me = await getSessionProfile();
  if (me?.role !== "admin")
    return { error: "Only Administration can invite people." };
  if (!z.guid().safeParse(cmId).success) return { error: "Not found." };

  const supabase = await createClient();
  const { data: cm } = await supabase
    .from("construction_managers")
    .select("id, name, email, phone, builder_id, active")
    .eq("id", cmId)
    .maybeSingle();
  if (!cm || !cm.builder_id) return { error: "Not found." };
  if (!cm.active)
    return { error: "Switch this construction manager on first." };
  const email = z.email().safeParse(cm.email?.trim().toLowerCase());
  if (!email.success)
    return { error: "Add a valid email to this construction manager first." };
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY)
    return {
      error: "Invitations aren't switched on yet: the server key is missing.",
    };

  const admin = createAdminClient(me.id);
  const { data, error } = await admin.auth.admin.inviteUserByEmail(email.data, {
    data: { full_name: cm.name },
    redirectTo: `${await siteOrigin()}/auth/confirm?next=/update-password`,
  });
  if (error || !data.user)
    return {
      error:
        error?.code === "email_exists"
          ? "That email already has an account. Link it on the Team page instead."
          : "The invitation couldn't be sent. Check the email address and try again.",
    };

  const id = data.user.id;
  const [{ error: e1 }, { error: e2 }] = await Promise.all([
    admin.auth.admin.updateUserById(id, {
      app_metadata: { role: "builder", builder_id: cm.builder_id },
    }),
    admin
      .from("profiles")
      .update({
        full_name: cm.name,
        phone: cm.phone,
        role: "builder",
        builder_id: cm.builder_id,
        construction_manager_id: cm.id,
      })
      .eq("id", id),
  ]);
  if (e1 || e2)
    return {
      error: `Invitation sent, but the account wasn't linked. Set ${cm.name} to Builder on the Team page before they sign in.`,
    };

  await logAccess({
    event: "invited",
    method: "invite",
    userId: id,
    email: email.data,
    actor: { id: me.id, name: me.fullName },
    detail: "Builder portal",
  });
  revalidatePath("/admin/builders");
  revalidatePath("/team");
  return { message: `Portal invitation sent to ${email.data}.` };
}
