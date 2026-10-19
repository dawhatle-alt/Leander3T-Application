"use server";

import { redirect } from "next/navigation";
import { safeNext } from "@/lib/auth/roles";
import { siteOrigin } from "@/lib/auth/origin";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import {
  emailOnlySchema,
  newPasswordSchema,
  signInSchema,
  type FormState,
} from "@/lib/validation/auth";

const LINK_SENT =
  "If that email has a Leander 3T account, a sign-in link is on its way. It works once and expires in an hour.";

export async function signInWithPassword(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = signInSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) {
    return {
      error:
        "That email and password don't match. Try again, or email yourself a sign-in link.",
    };
  }
  // Middleware sends each role to its own home if this isn't theirs.
  redirect(safeNext(formData.get("next") as string) ?? "/dashboard");
}

export async function sendSignInLink(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = emailOnlySchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  const supabase = await createClient();
  // Only existing accounts get a link; new people come in by invitation.
  // The reply is the same either way, so the form doesn't reveal who has one.
  await supabase.auth.signInWithOtp({
    email: parsed.data.email,
    options: {
      shouldCreateUser: false,
      emailRedirectTo: `${await siteOrigin()}/auth/confirm`,
    },
  });
  return { message: LINK_SENT };
}

export async function sendPasswordReset(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = emailOnlySchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${await siteOrigin()}/auth/confirm?next=/update-password`,
  });
  return {
    message:
      "If that email has a Leander 3T account, a link to set a new password is on its way.",
  };
}

export async function updatePassword(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = newPasswordSchema.safeParse({
    password: formData.get("password"),
    confirm: formData.get("confirm"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.updateUser({
    password: parsed.data.password,
  });
  if (error) {
    return {
      error:
        error.code === "same_password"
          ? "That's your current password. Choose a new one."
          : "Your password couldn't be saved. Open the link from your email again.",
    };
  }

  // They've replaced a password an administrator set: stop asking.
  if (data.user?.app_metadata?.must_change_password) {
    const { error: flagError } =
      await createAdminClient().auth.admin.updateUserById(data.user.id, {
        app_metadata: { must_change_password: null },
      });
    if (flagError)
      return {
        error:
          "Your new password is saved, but we couldn't finish signing you in. Try again.",
      };
  }
  redirect("/sign-in");
}
