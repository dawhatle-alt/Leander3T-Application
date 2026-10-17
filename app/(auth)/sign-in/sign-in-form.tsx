"use client";

import Link from "next/link";
import { useActionState } from "react";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Notice } from "@/components/auth/form-bits";
import type { FormState } from "@/lib/validation/auth";
import { sendSignInLink, signInWithPassword } from "../actions";

export function SignInForm({ next }: { next?: string }) {
  const [pwState, pwAction, pwPending] = useActionState<FormState, FormData>(
    signInWithPassword,
    {},
  );
  const [linkState, linkAction, linkPending] = useActionState<
    FormState,
    FormData
  >(sendSignInLink, {});
  const error = pwState.error ?? linkState.error;
  const pending = pwPending || linkPending;

  return (
    <form action={pwAction} noValidate>
      {next && <input type="hidden" name="next" value={next} />}
      {error && <Notice tone="error">{error}</Notice>}
      {linkState.message && <Notice tone="ok">{linkState.message}</Notice>}

      <Field
        label="Email"
        name="email"
        type="email"
        autoComplete="email"
        placeholder="you@leander3t.com"
        required
      />
      <Field
        label="Password"
        name="password"
        type="password"
        autoComplete="current-password"
        placeholder="••••••••••"
      />

      <Button
        type="submit"
        variant="fire"
        disabled={pending}
        className="mt-1.5 w-full justify-center"
      >
        {pwPending ? "Signing In…" : "Sign In"}
        <ArrowRight className="size-4" strokeWidth={2.4} aria-hidden />
      </Button>

      <button
        type="submit"
        formAction={linkAction}
        disabled={pending}
        className="mt-3 w-full rounded-sm border-[1.5px] border-mortar-2 bg-paper px-4 py-3 text-[14.5px] font-semibold text-ink transition-colors hover:border-flame hover:text-flame disabled:opacity-60"
      >
        {linkPending ? "Sending…" : "Email me a sign-in link instead"}
      </button>

      <div className="mt-[22px] flex flex-wrap justify-between gap-x-4 gap-y-2 text-[14px] text-ink-muted">
        <Link
          href="/forgot-password"
          className="font-semibold whitespace-nowrap text-flame"
        >
          Forgot password?
        </Link>
        <span>Supplier portal — coming soon</span>
      </div>
    </form>
  );
}
