import type { Metadata } from "next";
import Link from "next/link";
import { PageHead, Panel } from "@/components/shell/page-bits";
import { ROLE_LABEL } from "@/lib/auth/roles";
import { requireProfile } from "@/lib/auth/session";
import { ProfileForm } from "./profile-form";

export const metadata: Metadata = { title: "Your Profile — Leander 3T" };

export default async function ProfilePage() {
  const me = await requireProfile();

  return (
    <>
      <PageHead
        title="Your Profile"
        sub="How you appear to the rest of the team."
      />
      <div className="grid max-w-[860px] gap-6">
        <Panel title="Details">
          <ProfileForm fullName={me.fullName ?? ""} phone={me.phone ?? ""} />
        </Panel>
        <Panel title="Account">
          <dl className="grid gap-x-6 gap-y-3 px-6 py-5 text-[15px] sm:grid-cols-[140px_1fr]">
            <dt className="font-mono text-[11px] tracking-[0.14em] text-ink-muted uppercase sm:pt-1">
              Email
            </dt>
            <dd className="font-mono text-[14px]">{me.email}</dd>
            <dt className="font-mono text-[11px] tracking-[0.14em] text-ink-muted uppercase sm:pt-1">
              Role
            </dt>
            <dd>
              {ROLE_LABEL[me.role]}
              {me.builderName && (
                <span className="text-ink-muted"> · {me.builderName}</span>
              )}
            </dd>
          </dl>
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-mortar px-6 py-4 text-[14px] text-ink-muted">
            <span>
              Your email and role are managed by the Leander 3T office.
            </span>
            <Link href="/update-password" className="font-bold text-flame">
              Change password
            </Link>
          </div>
        </Panel>
      </div>
    </>
  );
}
