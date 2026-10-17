import type { Metadata } from "next";
import { ShieldCheck } from "lucide-react";
import {
  ComingSoon,
  PageHead,
  Scope,
  Stat,
} from "@/components/shell/page-bits";
import { firstName } from "@/lib/auth/roles";
import { requireProfile } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Builder Portal — Leander 3T" };

export default async function PortalHome() {
  const profile = await requireProfile();
  const supabase = await createClient();

  // Row-level security limits every count to this builder's homes.
  const count = async (status: "new" | "in_progress" | "completed") =>
    (
      await supabase
        .from("jobs")
        .select("id", { count: "exact", head: true })
        .eq("status", status)
    ).count ?? 0;
  const [active, scheduled, completed] = await Promise.all([
    count("in_progress"),
    count("new"),
    count("completed"),
  ]);

  return (
    <>
      <PageHead
        title={`Welcome, ${firstName(profile.fullName, profile.email)}`}
        sub="Status, schedule and specs for every home Leander 3T is building for you."
      >
        <Scope>
          <ShieldCheck className="size-[13px]" strokeWidth={2.4} aria-hidden />
          {profile.builderName ?? "Your"} homes only
        </Scope>
      </PageHead>
      <div className="mb-[34px] grid gap-5 sm:grid-cols-3">
        <Stat label="Active Homes" value={active} note="Crews working now" />
        <Stat label="Scheduled" value={scheduled} note="Not started yet" />
        <Stat label="Completed" value={completed} note="On record" />
      </div>
      <ComingSoon
        milestone="Builder portal · M9"
        what="Home cards with per-trade progress, schedule dates, specs on file and recent photos, plus job requests to the office."
      />
    </>
  );
}
