import { TopShell } from "@/components/shell/top-shell";
import { portalContext } from "@/lib/portal/context";

export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const ctx = await portalContext();
  return (
    <TopShell
      profile={ctx.me}
      home="/portal"
      label="Builder Portal"
      sublabel="FOR OUR BUILDER PARTNERS"
      context={
        ctx.preview ? `Preview · ${ctx.builderName}` : `${ctx.builderName} · CM`
      }
    >
      {children}
    </TopShell>
  );
}
