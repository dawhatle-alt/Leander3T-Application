import type { Metadata } from "next";
import Link from "next/link";
import { History } from "lucide-react";
import { PageHead, Panel } from "@/components/shell/page-bits";
import { Button } from "@/components/ui/button";
import { ROLES, ROLE_LABEL, type AppRole } from "@/lib/auth/roles";
import { requireProfile } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
import { InviteForm } from "./invite-form";
import { PersonEditButton } from "./person-editor";

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

  const isAdmin = me.role === "admin";
  const [{ data: people }, { data: builders }, { data: managers }] =
    await Promise.all([
      supabase
        .from("profiles")
        .select(
          "id, full_name, email, phone, role, active, builder_id, construction_manager_id, reviews_order_forms, builders(name)",
        )
        .order("active", { ascending: false })
        .order("full_name"),
      me.role === "admin"
        ? supabase
            .from("builders")
            .select("id, name")
            .eq("active", true)
            .order("name")
        : Promise.resolve({ data: [] as { id: string; name: string }[] }),
      isAdmin
        ? supabase
            .from("construction_managers")
            .select("id, name, builder_id")
            .eq("active", true)
            .order("name")
        : Promise.resolve({
            data: [] as {
              id: string;
              name: string;
              builder_id: string | null;
            }[],
          }),
    ]);
  const builderOpts = (builders ?? []).map((b) => ({
    value: b.id,
    label: b.name,
  }));
  const managerOpts = (managers ?? []).map((m) => ({
    value: m.id,
    label: m.name,
    builderId: m.builder_id,
  }));

  const byRole = ROLES.map((role) => ({
    role,
    rows: (people ?? []).filter((p) => p.role === role),
  })).filter((g) => g.rows.length > 0);

  return (
    <>
      <PageHead
        title="Team"
        sub={
          isAdmin
            ? "Invite people, set their role and switch access off or on. Switched-off people keep their history."
            : `${people?.length ?? 0} people with access to the Leander 3T job system.`
        }
      >
        {isAdmin && (
          <Button asChild variant="outline" size="sm">
            <Link href="/team/activity">
              <History className="size-4" aria-hidden />
              Activity
            </Link>
          </Button>
        )}
      </PageHead>

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
                  className={cn(
                    "grid gap-1 px-6 py-3.5 md:items-center md:gap-4",
                    isAdmin
                      ? "md:grid-cols-[1.2fr_1.4fr_1fr_auto_auto]"
                      : "md:grid-cols-[1.2fr_1.4fr_1fr_auto]",
                    !p.active && "bg-[#fbf8f2] text-ink-muted",
                  )}
                >
                  <div className="font-semibold">
                    {p.full_name ?? "—"}
                    {p.reviews_order_forms && (
                      <span className="ml-2 rounded-full bg-limestone px-2 py-0.5 font-mono text-[10.5px] font-normal tracking-[0.1em] text-flame uppercase">
                        Reviewer
                      </span>
                    )}
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
                  {isAdmin && (
                    <PersonEditButton
                      isSelf={p.id === me.id}
                      builders={builderOpts}
                      managers={managerOpts}
                      person={{
                        id: p.id,
                        email: p.email,
                        fullName: p.full_name ?? "",
                        phone: p.phone ?? "",
                        role: p.role,
                        builderId: p.builder_id ?? "",
                        constructionManagerId: p.construction_manager_id ?? "",
                        reviewsOrderForms: p.reviews_order_forms,
                        active: p.active,
                      }}
                    />
                  )}
                </li>
              ))}
            </ul>
          </Panel>
        ))}
      </div>
    </>
  );
}
