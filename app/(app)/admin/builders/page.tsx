import type { Metadata } from "next";
import {
  ActiveToggle,
  EntityEditButton,
} from "@/components/admin/entity-editor";
import { AdminRow, OffBadge, mono } from "@/components/admin/admin-bits";
import { PortalInviteButton } from "@/components/admin/portal-invite";
import { PageHead, Panel } from "@/components/shell/page-bits";
import { rowToValues } from "@/lib/admin/entities";
import { loadEntityOptions } from "@/lib/admin/options";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Builders — Leander 3T" };

// Builders and their construction managers (the people on the builder's side
// of each job, and later the portal users).
export default async function BuildersPage() {
  const supabase = await createClient();
  const [
    { data: builders },
    { data: managers },
    { data: open },
    options,
    { data: portalUsers },
  ] = await Promise.all([
    supabase
      .from("builders")
      .select("*")
      .order("active", { ascending: false })
      .order("name"),
    supabase.from("construction_managers").select("*").order("name"),
    supabase.from("jobs").select("builder_id").neq("status", "completed"),
    loadEntityOptions(),
    supabase
      .from("profiles")
      .select("construction_manager_id, active")
      .eq("role", "builder")
      .not("construction_manager_id", "is", null),
  ]);
  const portal = new Map(
    (portalUsers ?? []).map((p) => [p.construction_manager_id!, p.active]),
  );

  const openJobs = new Map<string, number>();
  for (const j of open ?? [])
    if (j.builder_id)
      openJobs.set(j.builder_id, (openJobs.get(j.builder_id) ?? 0) + 1);

  return (
    <>
      <PageHead
        title="Builders"
        sub="Homebuilder clients and their construction managers. Switched-off entries stay on old jobs but can't be picked for new ones."
      >
        <EntityEditButton kind="builder" options={options} />
      </PageHead>

      <div className="grid gap-6">
        {(builders ?? []).map((b) => {
          const cms = (managers ?? []).filter((m) => m.builder_id === b.id);
          const n = openJobs.get(b.id) ?? 0;
          return (
            <Panel key={b.id}>
              <ul className="divide-y divide-mortar">
                <AdminRow
                  active={b.active}
                  className="py-[18px]"
                  actions={
                    <>
                      <EntityEditButton
                        kind="builder"
                        id={b.id}
                        initial={rowToValues("builder", b)}
                        options={options}
                      />
                      <ActiveToggle
                        kind="builder"
                        id={b.id}
                        active={b.active}
                      />
                      {b.active && (
                        // Route handler sets the preview cookie, so a plain link.
                        <a
                          href={`/portal/preview?builder=${b.id}`}
                          className="rounded-[6px] border-[1.5px] border-mortar-2 px-3 py-1.5 text-[13px] font-bold whitespace-nowrap hover:border-flame hover:text-flame"
                        >
                          Preview Portal
                        </a>
                      )}
                    </>
                  }
                >
                  <div className="font-display text-[22px] font-bold uppercase">
                    {b.name}
                    <OffBadge active={b.active} />
                  </div>
                  <div className={mono}>
                    {[
                      `${n} open ${n === 1 ? "job" : "jobs"}`,
                      b.contact_name,
                      b.contact_phone,
                      b.contact_email,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </div>
                </AdminRow>
                {cms.map((m) => (
                  <AdminRow
                    key={m.id}
                    active={m.active}
                    className="pl-10"
                    actions={
                      <>
                        <EntityEditButton
                          kind="construction_manager"
                          id={m.id}
                          initial={rowToValues("construction_manager", m)}
                          options={options}
                        />
                        <ActiveToggle
                          kind="construction_manager"
                          id={m.id}
                          active={m.active}
                        />
                        {portal.has(m.id) ? (
                          <span
                            className={
                              portal.get(m.id)
                                ? "rounded-full bg-[#2f6b451a] px-2.5 py-1 font-mono text-[10.5px] tracking-[0.1em] text-success uppercase"
                                : "rounded-full bg-[#c42b1f14] px-2.5 py-1 font-mono text-[10.5px] tracking-[0.1em] text-chalk uppercase"
                            }
                          >
                            {portal.get(m.id) ? "Portal access" : "Portal off"}
                          </span>
                        ) : (
                          m.active &&
                          b.active &&
                          m.email && <PortalInviteButton cmId={m.id} />
                        )}
                      </>
                    }
                  >
                    <div className="font-semibold">
                      <span className="mr-2 font-mono text-[10.5px] tracking-[0.12em] text-flame uppercase">
                        CM
                      </span>
                      {m.name}
                      <OffBadge active={m.active} />
                    </div>
                    <div className={mono}>
                      {[m.phone, m.email].filter(Boolean).join(" · ") ||
                        "No contact details"}
                    </div>
                  </AdminRow>
                ))}
                {b.active && (
                  <li className="px-6 py-3 pl-10">
                    <EntityEditButton
                      kind="construction_manager"
                      initial={{ builder_id: b.id }}
                      options={options}
                      label="Construction Manager"
                      compact
                    />
                  </li>
                )}
              </ul>
            </Panel>
          );
        })}
      </div>
    </>
  );
}
