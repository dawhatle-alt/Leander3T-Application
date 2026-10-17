"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Notice } from "@/components/auth/form-bits";
import type { FormState } from "@/lib/validation/auth";
import { updateProfile } from "./actions";

export function ProfileForm({
  fullName,
  phone,
}: {
  fullName: string;
  phone: string;
}) {
  const [state, action, pending] = useActionState<FormState, FormData>(
    updateProfile,
    {},
  );
  return (
    <form action={action} noValidate className="px-6 py-5">
      {state.error && <Notice tone="error">{state.error}</Notice>}
      {state.message && <Notice tone="ok">{state.message}</Notice>}
      <div className="grid gap-x-4 md:grid-cols-2">
        <Field
          label="Name"
          name="fullName"
          defaultValue={fullName}
          autoComplete="name"
          required
        />
        <Field
          label="Phone"
          name="phone"
          type="tel"
          defaultValue={phone}
          autoComplete="tel"
          placeholder="(512) 555-0100"
        />
      </div>
      <Button type="submit" variant="fire" size="sm" disabled={pending}>
        {pending ? "Saving…" : "Save Changes"}
      </Button>
    </form>
  );
}
