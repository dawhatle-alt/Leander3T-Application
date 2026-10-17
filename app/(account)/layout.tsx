import { AppShell } from "@/components/shell/app-shell";
import { TopShell } from "@/components/shell/top-shell";
import { requireProfile } from "@/lib/auth/session";

// Pages every role can open (/profile). Shown in the shell that person
// normally works in.
export default async function AccountLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await requireProfile();

  if (profile.role === "builder") {
    return (
      <TopShell
        profile={profile}
        home="/portal"
        label="Builder Portal"
        sublabel="FOR OUR BUILDER PARTNERS"
        context={profile.builderName ? `${profile.builderName} · CM` : null}
      >
        {children}
      </TopShell>
    );
  }
  if (profile.role === "crew_manager") {
    return (
      <TopShell
        profile={profile}
        home="/crew"
        label="Crew Manager"
        sublabel="LEANDER 3T"
      >
        {children}
      </TopShell>
    );
  }
  return <AppShell profile={profile}>{children}</AppShell>;
}
