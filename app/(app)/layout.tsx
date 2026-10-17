import { AppShell } from "@/components/shell/app-shell";
import { requireProfile } from "@/lib/auth/session";

// Team app (admin, supervisor, employee). Middleware keeps other roles out.
export default async function TeamAppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await requireProfile();
  return <AppShell profile={profile}>{children}</AppShell>;
}
