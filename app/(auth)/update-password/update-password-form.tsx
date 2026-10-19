"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { CardTitle, Eyebrow, Field, Notice } from "@/components/auth/form-bits";
import type { FormState } from "@/lib/validation/auth";
import { updatePassword } from "../actions";

export function UpdatePasswordForm({ required }: { required: boolean }) {
  const [state, action, pending] = useActionState<FormState, FormData>(
    updatePassword,
    {},
  );

  return (
    <>
      <Eyebrow>Team access</Eyebrow>
      <CardTitle
        title="Choose a Password"
        sub={
          required
            ? "The office set a temporary password for you. Choose your own to continue — at least 10 characters."
            : "At least 10 characters. You can still sign in with an emailed link any time."
        }
      />
      {state.error && <Notice tone="error">{state.error}</Notice>}
      <form action={action} noValidate>
        <Field
          label="New password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
        />
        <Field
          label="Confirm password"
          name="confirm"
          type="password"
          autoComplete="new-password"
          required
        />
        <Button
          type="submit"
          variant="fire"
          disabled={pending}
          className="mt-1.5 w-full justify-center"
        >
          {pending ? "Saving…" : "Save Password"}
        </Button>
      </form>
    </>
  );
}
