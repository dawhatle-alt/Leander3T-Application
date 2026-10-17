"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { CardTitle, Eyebrow, Field, Notice } from "@/components/auth/form-bits";
import type { FormState } from "@/lib/validation/auth";
import { sendPasswordReset } from "../actions";

export default function ForgotPasswordPage() {
  const [state, action, pending] = useActionState<FormState, FormData>(
    sendPasswordReset,
    {},
  );

  return (
    <>
      <Eyebrow>Team access</Eyebrow>
      <CardTitle
        title="Reset Password"
        sub="We’ll email you a link to choose a new password."
      />
      {state.error && <Notice tone="error">{state.error}</Notice>}
      {state.message && <Notice tone="ok">{state.message}</Notice>}
      <form action={action} noValidate>
        <Field
          label="Email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="you@leander3t.com"
          required
        />
        <Button
          type="submit"
          variant="fire"
          disabled={pending}
          className="mt-1.5 w-full justify-center"
        >
          {pending ? "Sending…" : "Email Me a Reset Link"}
        </Button>
      </form>
      <p className="mt-[22px] text-[14px]">
        <Link href="/sign-in" className="font-semibold text-flame">
          Back to sign in
        </Link>
      </p>
    </>
  );
}
