import { TopShell } from "@/components/shell/top-shell";
import { requireProfile } from "@/lib/auth/session";

export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await requireProfile();
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
