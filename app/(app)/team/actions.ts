"use server";

import { revalidatePath } from "next/cache";
import { siteOrigin } from "@/lib/auth/origin";
import { ROLE_LABEL, type AppRole } from "@/lib/auth/roles";
import { getSessionProfile } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/server";
import { inviteSchema, type FormState } from "@/lib/validation/auth";

// Admins invite people by email. Supabase sends the invitation; the link signs
// them in and asks them to choose a password. Role and builder are set here,
// on the server, never by the person being invited.
export async function invitePerson(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const me = await getSessionProfile();
  if (me?.role !== "admin")
    return { error: "Only Administration can invite people." };

  const parsed = inviteSchema.safeParse({
    fullName: formData.get("fullName"),
    email: formData.get("email"),
    role: formData.get("role"),
    builderId: formData.get("builderId") ?? "",
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  const { fullName, email } = parsed.data;
  const role = parsed.data.role as AppRole;
  const builderId = role === "builder" ? parsed.data.builderId || null : null;

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return {
      error: "Invitations aren't switched on yet: the server key is missing.",
    };
  }
  const admin = createAdminClient();

  const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
    data: { full_name: fullName },
    redirectTo: `${await siteOrigin()}/auth/confirm?next=/update-password`,
  });
  if (error || !data.user) {
    return {
      error:
        error?.code === "email_exists"
          ? "That email already has an account."
          : "The invitation couldn't be sent. Check the email address and try again.",
    };
  }

  const userId = data.user.id;
  const metadata = { role, ...(builderId ? { builder_id: builderId } : {}) };
  const [{ error: metaError }, { error: profileError }] = await Promise.all([
    admin.auth.admin.updateUserById(userId, { app_metadata: metadata }),
    admin
      .from("profiles")
      .update({ full_name: fullName, role, builder_id: builderId })
      .eq("id", userId),
  ]);
  if (metaError || profileError) {
    return {
      error: `Invitation sent, but the role wasn't saved. Set ${fullName} to ${ROLE_LABEL[role]} before they sign in.`,
    };
  }

  revalidatePath("/team");
  return { message: `Invitation sent to ${email} as ${ROLE_LABEL[role]}.` };
}
