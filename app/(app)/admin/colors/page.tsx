import type { Metadata } from "next";
import {
  ActiveToggle,
  EntityEditButton,
} from "@/components/admin/entity-editor";
import { AdminRow, OffBadge, mono } from "@/components/admin/admin-bits";
import { PageHead, Panel } from "@/components/shell/page-bits";
import { rowToValues, type EntityKind } from "@/lib/admin/entities";
import { loadEntityOptions } from "@/lib/admin/options";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Colors — Leander 3T" };

// The brick and mortar color picklists used on jobs and orders.
export default async function ColorsPage() {
  const supabase = await createClient();
  const [{ data: brick }, { data: mortar }, options] = await Promise.all([
    supabase.from("brick_colors").select("*").order("sort_order").order("name"),
    supabase
      .from("mortar_colors")
      .select("*")
      .order("sort_order")
      .order("name"),
    loadEntityOptions(),
  ]);

  const lists: {
    kind: EntityKind;
    title: string;
    rows: { id: string; name: string; sort_order: number; active: boolean }[];
  }[] = [
    { kind: "brick_color", title: "Brick Colors", rows: brick ?? [] },
    { kind: "mortar_color", title: "Mortar Colors", rows: mortar ?? [] },
  ];

  return (
    <>
      <PageHead
        title="Colors"
        sub="Picklists for job specs and orders, in the order shown here. Switched-off colors stay on old jobs."
      />
      <div className="grid gap-6 lg:grid-cols-2">
        {lists.map((l) => (
          <Panel
            key={l.kind}
            title={l.title}
            action={
              <EntityEditButton
                kind={l.kind}
                options={options}
                label="Add"
                compact
              />
            }
          >
            <ul className="divide-y divide-mortar">
              {l.rows.map((c) => (
                <AdminRow
                  key={c.id}
                  active={c.active}
                  className="py-2.5"
                  actions={
                    <>
                      <EntityEditButton
                        kind={l.kind}
                        id={c.id}
                        initial={rowToValues(l.kind, c)}
                        options={options}
                      />
                      <ActiveToggle kind={l.kind} id={c.id} active={c.active} />
                    </>
                  }
                >
                  <span className="mr-3 inline-block w-8 font-mono text-[12px] text-ink-muted">
                    {c.sort_order}
                  </span>
                  <span className="font-semibold">{c.name}</span>
                  <OffBadge active={c.active} />
                </AdminRow>
              ))}
              {l.rows.length === 0 && (
                <li className={`px-6 py-4 ${mono}`}>None yet.</li>
              )}
            </ul>
          </Panel>
        ))}
      </div>
    </>
  );
}
