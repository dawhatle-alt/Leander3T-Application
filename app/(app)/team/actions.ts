"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { siteOrigin } from "@/lib/auth/origin";
import { ROLES, ROLE_LABEL, type AppRole } from "@/lib/auth/roles";
import { getSessionProfile } from "@/lib/auth/session";
import { createAdminClient, createClient } from "@/lib/supabase/server";
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

const personSchema = z.object({
  id: z.guid(),
  fullName: z.string().trim().min(1, "Enter a name.").max(120),
  phone: z.string().trim().max(40),
  role: z.enum(ROLES as [AppRole, ...AppRole[]]),
  builderId: z.union([z.literal(""), z.guid()]),
  constructionManagerId: z.union([z.literal(""), z.guid()]),
  reviewsOrderForms: z.boolean(),
  active: z.boolean(),
});
export type PersonInput = z.input<typeof personSchema>;

/** Administration: change someone's name, role, builder link, reviewer flag or access. */
export async function updatePerson(input: PersonInput): Promise<FormState> {
  const me = await getSessionProfile();
  if (me?.role !== "admin")
    return { error: "Only Administration can change people." };
  const parsed = personSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  const p = parsed.data;

  // Never lock yourself out.
  if (p.id === me.id && (p.role !== "admin" || !p.active))
    return {
      error:
        "You can't remove your own Administration access. Ask another administrator.",
    };
  if (p.role === "builder" && !p.builderId)
    return { error: "Pick the builder this person works for." };

  const supabase = await createClient();
  const isBuilder = p.role === "builder";
  if (isBuilder && p.constructionManagerId) {
    const { data: cm } = await supabase
      .from("construction_managers")
      .select("builder_id")
      .eq("id", p.constructionManagerId)
      .maybeSingle();
    if (cm?.builder_id !== p.builderId)
      return { error: "That construction manager works for another builder." };
  }

  const { data, error } = await supabase
    .from("profiles")
    .update({
      full_name: p.fullName,
      phone: p.phone || null,
      role: p.role,
      builder_id: isBuilder ? p.builderId : null,
      construction_manager_id: isBuilder
        ? p.constructionManagerId || null
        : null,
      // Only the office reviews order forms.
      reviews_order_forms:
        p.role === "admin" || p.role === "supervisor"
          ? p.reviewsOrderForms
          : false,
      active: p.active,
    })
    .eq("id", p.id)
    .select("id");
  if (error || !data?.length)
    return { error: "The changes couldn't be saved. Try again." };

  revalidatePath("/team");
  return { message: `Saved ${p.fullName}.` };
}
