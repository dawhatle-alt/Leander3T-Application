"use server";

import { revalidatePath } from "next/cache";
import { getSessionProfile } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { profileSchema, type FormState } from "@/lib/validation/auth";

// Saves the signed-in person's own name and phone. The database allows only
// these columns to change on your own row (see migration profile_self_edit).
export async function updateProfile(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const me = await getSessionProfile();
  if (!me) return { error: "Your session has ended. Sign in again." };

  const parsed = profileSchema.safeParse({
    fullName: formData.get("fullName"),
    phone: formData.get("phone") ?? "",
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({
      full_name: parsed.data.fullName,
      phone: parsed.data.phone || null,
    })
    .eq("id", me.id);
  if (error) return { error: "Your changes couldn't be saved. Try again." };

  revalidatePath("/", "layout");
  return { message: "Saved." };
}
