import "server-only";
import { ROLE_LABEL, type AppRole } from "@/lib/auth/roles";
import {
  longDate,
  stamp,
  STATUS_LABEL,
  type JobStatus,
} from "@/lib/jobs/format";
import type { createClient } from "@/lib/supabase/server";
import type { Json } from "@/lib/supabase/types";

type Db = Awaited<ReturnType<typeof createClient>>;

// ---------------------------------------------------------------------------
// What the change log covers, in the client's words
// ---------------------------------------------------------------------------

export const AREAS = {
  jobs: { label: "Jobs", tables: ["jobs", "job_assignments"] },
  orders: {
    label: "Orders",
    tables: [
      "sand_orders",
      "mortar_orders",
      "lintel_orders",
      "arch_lintel_orders",
      "rock_orders",
      "stucco_material_orders",
      "stucco_order_items",
      "paint_orders",
      "address_block_orders",
      "order_forms",
    ],
  },
  people: { label: "People", tables: ["profiles"] },
} as const;
export type Area = keyof typeof AREAS;

const NOUN: Record<string, string> = {
  jobs: "job",
  job_assignments: "assignment",
  profiles: "person",
  sand_orders: "sand order",
  mortar_orders: "mortar order",
  lintel_orders: "lintel order",
  arch_lintel_orders: "arch lintel order",
  rock_orders: "rock order",
  stucco_material_orders: "stucco material order",
  stucco_order_items: "stucco line item",
  paint_orders: "paint order",
  address_block_orders: "address block",
  order_forms: "order form",
};

// Columns that mean nothing to the office, or that would only repeat the label.
const HIDDEN = new Set([
  "id",
  "job_id",
  "order_id",
  "airtable_id",
  "demo",
  "created_by_email",
  "storage_path",
  "created_at",
  "updated_at",
  "updated_by",
]);

const LABEL: Record<string, string> = {
  property_address: "Address",
  sqft: "House SF",
  completion_percent: "Completion %",
  stucco_percent_complete: "Stucco % complete",
  lot_swing: "Lot swing",
  brick_color_id: "Brick color",
  brick_mortar_color_id: "Brick mortar color",
  stone_mortar_color_id: "Stone mortar color",
  mortar_color_id: "Mortar color",
  construction_manager_id: "Construction manager",
  reviews_order_forms: "Reviews order forms",
  active: "Can sign in",
  orders: "Orders on the form",
  span_in: "Span (in)",
  width_in: "Width (in)",
  rise_in: "Rise (in)",
};

/** brick_start_date → "Brick start date"; stone_crew_id → "Stone crew". */
export function fieldLabel(col: string) {
  if (LABEL[col]) return LABEL[col];
  const words = col
    .replace(/_id$/, "")
    .replace(/_sqft$/, " SF")
    .replace(/_ft$/, " ft")
    .replace(/_/g, " ");
  return words.charAt(0).toUpperCase() + words.slice(1);
}

// Foreign keys whose ids are shown as the name they point at.
const LOOKUP: Record<
  string,
  | "builders"
  | "construction_managers"
  | "crews"
  | "brick_colors"
  | "mortar_colors"
  | "suppliers"
  | "profiles"
> = {
  builder_id: "builders",
  construction_manager_id: "construction_managers",
  brick_crew_id: "crews",
  stone_crew_id: "crews",
  stucco_crew_id: "crews",
  brick_color_id: "brick_colors",
  brick_mortar_color_id: "mortar_colors",
  stone_mortar_color_id: "mortar_colors",
  mortar_color_id: "mortar_colors",
  supplier_id: "suppliers",
  profile_id: "profiles",
  created_by: "profiles",
  generated_by: "profiles",
  reviewed_by: "profiles",
};

// ---------------------------------------------------------------------------
// Loading
// ---------------------------------------------------------------------------

export type ChangeFilter = {
  jobId?: string;
  actorId?: string;
  area?: Area;
  since?: string;
  before?: number;
  limit?: number;
};

export type FieldChange = { field: string; from: string; to: string };

export type ChangeEntry = {
  id: number;
  at: string;
  who: string;
  whoRole: string | null;
  summary: string;
  jobId: string | null;
  jobAddress: string | null;
  fields: FieldChange[];
};

type Row = {
  id: number;
  occurred_at: string;
  actor_name: string | null;
  actor_role: AppRole | null;
  action: string;
  table_name: string;
  record_label: string | null;
  job_id: string | null;
  job_address: string | null;
  changes: Json | null;
};

/** Change-log lines, newest first, ready to show. Administration only (RLS). */
export async function loadChanges(
  supabase: Db,
  f: ChangeFilter,
): Promise<{ entries: ChangeEntry[]; nextBefore: number | null }> {
  const limit = f.limit ?? 100;
  let q = supabase
    .from("audit_log")
    .select(
      "id, occurred_at, actor_name, actor_role, action, table_name, record_label, job_id, job_address, changes",
    )
    .order("id", { ascending: false })
    .limit(limit + 1);
  if (f.jobId) q = q.eq("job_id", f.jobId);
  if (f.actorId) q = q.eq("actor_id", f.actorId);
  if (f.area) q = q.in("table_name", [...AREAS[f.area].tables]);
  if (f.since) q = q.gte("occurred_at", f.since);
  if (f.before) q = q.lt("id", f.before);

  const { data } = await q;
  const rows = (data ?? []) as Row[];
  const more = rows.length > limit;
  const page = more ? rows.slice(0, limit) : rows;

  const names = await resolveIds(supabase, page);
  return {
    entries: page.map((r) => toEntry(r, names)),
    nextBefore: more ? page[page.length - 1].id : null,
  };
}

function changeMap(c: Json | null) {
  return c && typeof c === "object" && !Array.isArray(c)
    ? (c as Record<string, { old?: Json; new?: Json }>)
    : {};
}

async function resolveIds(supabase: Db, rows: Row[]) {
  const wanted = new Map<string, Set<string>>();
  for (const r of rows)
    for (const [col, v] of Object.entries(changeMap(r.changes))) {
      const table = LOOKUP[col];
      if (!table) continue;
      for (const id of [v?.old, v?.new])
        if (typeof id === "string") {
          if (!wanted.has(table)) wanted.set(table, new Set());
          wanted.get(table)!.add(id);
        }
    }

  const names = new Map<string, string>();
  await Promise.all(
    [...wanted].map(async ([table, ids]) => {
      if (table === "profiles") {
        const { data } = await supabase
          .from("profiles")
          .select("id, full_name, email")
          .in("id", [...ids]);
        for (const p of data ?? [])
          names.set(p.id, p.full_name ?? p.email ?? "Unnamed");
      } else {
        const { data } = await supabase
          // Every lookup table has id + name; the cast just picks one to type it.
          .from(table as "crews")
          .select("id, name")
          .in("id", [...ids]);
        for (const d of data ?? []) names.set(d.id, d.name);
      }
    }),
  );
  return names;
}

function toEntry(r: Row, names: Map<string, string>): ChangeEntry {
  const noun = NOUN[r.table_name] ?? r.table_name.replace(/_/g, " ");
  const label = r.record_label ? ` ${r.record_label}` : "";
  let summary: string;
  if (r.table_name === "job_assignments") {
    summary =
      r.action === "insert" ? `assigned${label}` : `removed assignment${label}`;
  } else if (r.table_name === "jobs") {
    summary =
      r.action === "insert"
        ? "created the job"
        : r.action === "delete"
          ? "deleted the job"
          : "updated the job";
  } else {
    const verb =
      r.action === "insert"
        ? "added"
        : r.action === "delete"
          ? "deleted"
          : "changed";
    summary = `${verb} ${noun}${label}`;
  }

  const fields = Object.entries(changeMap(r.changes))
    .filter(([col]) => !HIDDEN.has(col))
    .map(([col, v]) => ({
      field: fieldLabel(col),
      from: show(col, v?.old, names),
      to: show(col, v?.new, names),
    }));

  return {
    id: r.id,
    at: r.occurred_at,
    who: r.actor_name ?? "System",
    whoRole: r.actor_role ? ROLE_LABEL[r.actor_role] : null,
    summary,
    jobId: r.table_name === "jobs" && r.action === "delete" ? null : r.job_id,
    jobAddress: r.job_address,
    fields,
  };
}

// Stored as codes (in_progress, pending_review): shown as words.
const CODED = new Set(["status", "kind", "layout", "trade", "company"]);

function show(col: string, v: Json | undefined, names: Map<string, string>) {
  if (v === null || v === undefined || v === "") return "—";
  if (typeof v === "boolean") return v ? "Yes" : "No";
  if (typeof v === "object") return "updated";
  if (LOOKUP[col] && typeof v === "string") return names.get(v) ?? "(removed)";
  if (col === "status" && v in STATUS_LABEL)
    return STATUS_LABEL[v as JobStatus];
  if (col === "role" && typeof v === "string" && v in ROLE_LABEL)
    return ROLE_LABEL[v as AppRole];
  const s = String(v);
  if (CODED.has(col) && /^[a-z0-9_]+$/.test(s)) {
    const w = s.replace(/_/g, " ");
    return w.charAt(0).toUpperCase() + w.slice(1);
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return longDate(s);
  if (/^\d{4}-\d{2}-\d{2}T/.test(s)) return stamp(s);
  return s.length > 90 ? `${s.slice(0, 87)}…` : s;
}
