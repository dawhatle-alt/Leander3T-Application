import type { Metadata } from "next";
import Link from "next/link";
import {
  ActiveToggle,
  EntityEditButton,
} from "@/components/admin/entity-editor";
import { AdminRow, OffBadge, mono } from "@/components/admin/admin-bits";
import { PageHead, Panel } from "@/components/shell/page-bits";
import { TRADE_OPTIONS, rowToValues } from "@/lib/admin/entities";
import { loadEntityOptions } from "@/lib/admin/options";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Crews — Leander 3T" };

// Field crews by trade, and the crew manager who leads each one. A crew
// manager sees exactly the jobs their crews are assigned to.
export default async function CrewsPage() {
  const supabase = await createClient();
  const [{ data: crews }, { data: open }, options] = await Promise.all([
    supabase
      .from("crews")
      .select("*, manager:profiles!crews_crew_manager_id_fkey(full_name)")
      .order("active", { ascending: false })
      .order("name"),
    supabase
      .from("jobs")
      .select("brick_crew_id, stone_crew_id, stucco_crew_id")
      .neq("status", "completed"),
    loadEntityOptions(),
  ]);

  const load = new Map<string, number>();
  for (const j of open ?? [])
    for (const id of [j.brick_crew_id, j.stone_crew_id, j.stucco_crew_id])
      if (id) load.set(id, (load.get(id) ?? 0) + 1);

  return (
    <>
      <PageHead
        title="Crews"
        sub="Each crew's manager signs in to see that crew's jobs and request materials."
      >
        <EntityEditButton kind="crew" options={options} />
      </PageHead>
      {options.crewManagers.length === 0 && (
        <p className="mb-5 text-[14px] text-ink-muted">
          No crew managers yet. Invite one from{" "}
          <Link href="/team" className="font-bold text-flame">
            Team
          </Link>{" "}
          with the Crew Manager role.
        </p>
      )}
      <div className="grid gap-6 lg:grid-cols-3">
        {TRADE_OPTIONS.map((trade) => {
          const list = (crews ?? []).filter((c) => c.trade === trade.value);
          return (
            <Panel key={trade.value} title={trade.label}>
              <ul className="divide-y divide-mortar">
                {list.map((c) => (
                  <AdminRow
                    key={c.id}
                    active={c.active}
                    className="px-5"
                    actions={
                      <>
                        <EntityEditButton
                          kind="crew"
                          id={c.id}
                          initial={rowToValues("crew", c)}
                          options={options}
                        />
                        <ActiveToggle kind="crew" id={c.id} active={c.active} />
                      </>
                    }
                  >
                    <div className="font-semibold">
                      {c.name}
                      <OffBadge active={c.active} />
                    </div>
                    <div className={mono}>
                      {c.manager?.full_name ?? "No crew manager"} ·{" "}
                      {load.get(c.id) ?? 0} open jobs
                    </div>
                  </AdminRow>
                ))}
                {list.length === 0 && (
                  <li className="px-5 py-4 text-[14px] text-ink-muted">
                    No {trade.label.toLowerCase()} crews yet.
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
