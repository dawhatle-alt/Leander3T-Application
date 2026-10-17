import { TopShell } from "@/components/shell/top-shell";
import { requireProfile } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export default async function CrewLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await requireProfile();
  const supabase = await createClient();
  const { data: crews } = await supabase
    .from("crews")
    .select("name, trade")
    .eq("crew_manager_id", profile.id)
    .order("name");

  const label = crews?.length
    ? crews
        .map(
          (c) => `${c.name} · ${c.trade[0].toUpperCase()}${c.trade.slice(1)}`,
        )
        .join(", ")
    : "Crew Manager";

  return (
    <TopShell
      profile={profile}
      home="/crew"
      label={label}
      sublabel="CREW MANAGER"
    >
      {children}
    </TopShell>
  );
}
