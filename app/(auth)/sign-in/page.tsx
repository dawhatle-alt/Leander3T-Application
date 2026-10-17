import type { Metadata } from "next";
import { CardTitle, Eyebrow, Notice } from "@/components/auth/form-bits";
import { safeNext } from "@/lib/auth/roles";
import { SignInForm } from "./sign-in-form";

export const metadata: Metadata = { title: "Sign In — Leander 3T" };

const NOTICES: Record<string, { tone: "error" | "ok"; text: string }> = {
  inactive: {
    tone: "error",
    text: "This account is switched off. Ask the Leander 3T office to turn it back on.",
  },
  link: {
    tone: "error",
    text: "That link has expired or was already used. Request a new one below.",
  },
};

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sp = await searchParams;
  const notice = sp.error ? NOTICES[sp.error] : undefined;

  return (
    <>
      <Eyebrow>Team access</Eyebrow>
      <CardTitle
        title="Sign In"
        sub="Use your Leander 3T account to continue."
      />
      {notice && <Notice tone={notice.tone}>{notice.text}</Notice>}
      {sp.signed_out && <Notice tone="ok">You’re signed out.</Notice>}
      <SignInForm next={safeNext(sp.next) ?? undefined} />
    </>
  );
}
