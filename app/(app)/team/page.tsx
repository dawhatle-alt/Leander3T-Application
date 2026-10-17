import type { Metadata } from "next";
import { PageHead, Panel } from "@/components/shell/page-bits";
import { ROLES, ROLE_LABEL, type AppRole } from "@/lib/auth/roles";
import { requireProfile } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { InviteForm } from "./invite-form";

export const metadata: Metadata = { title: "Team — Leander 3T" };

const GROUP_TITLE: Record<AppRole, string> = {
  admin: "Administration",
  supervisor: "Supervisors",
  employee: "Employees",
  crew_manager: "Crew Managers",
  builder: "Builder Contacts",
};

export default async function TeamPage() {
  const me = await requireProfile();
  const supabase = await createClient();

  const [{ data: people }, { data: builders }] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, full_name, email, phone, role, active, builders(name)")
      .order("full_name"),
    me.role === "admin"
      ? supabase
          .from("builders")
          .select("id, name")
          .eq("active", true)
          .order("name")
      : Promise.resolve({ data: [] as { id: string; name: string }[] }),
  ]);

  const byRole = ROLES.map((role) => ({
    role,
    rows: (people ?? []).filter((p) => p.role === role),
  })).filter((g) => g.rows.length > 0);

  return (
    <>
      <PageHead
        title="Team"
        sub={`${people?.length ?? 0} people with access to the Leander 3T job system.`}
      />

      {me.role === "admin" && (
        <Panel title="Invite Someone" className="mb-[34px]">
          <InviteForm builders={builders ?? []} />
        </Panel>
      )}

      <div className="grid gap-6">
        {byRole.map(({ role, rows }) => (
          <Panel key={role} title={GROUP_TITLE[role]}>
            <ul className="divide-y divide-mortar">
              {rows.map((p) => (
                <li
                  key={p.id}
                  className="grid gap-1 px-6 py-3.5 md:grid-cols-[1.2fr_1.4fr_1fr_auto] md:items-center md:gap-4"
                >
                  <div className="font-semibold">
                    {p.full_name ?? "—"}
                    {role === "builder" && p.builders?.name && (
                      <span className="ml-2 text-[13px] font-normal text-ink-muted">
                        {p.builders.name}
                      </span>
                    )}
                  </div>
                  <div className="truncate font-mono text-[13px] text-ink-muted">
                    {p.email}
                  </div>
                  <div className="font-mono text-[13px] text-ink-muted">
                    {p.phone ?? ""}
                  </div>
                  <div className="font-mono text-[11px] tracking-[0.12em] uppercase">
                    {p.active ? (
                      <span className="text-success">{ROLE_LABEL[role]}</span>
                    ) : (
                      <span className="text-chalk">Switched off</span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </Panel>
        ))}
      </div>
    </>
  );
}
