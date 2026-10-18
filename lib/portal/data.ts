import "server-only";
import { createClient } from "@/lib/supabase/server";

// Read-only data for the builder portal. Every query filters by the builder
// explicitly AND runs under row-level security, so a builder can never see
// another company's homes even if a filter were wrong.

export const HOME_COLS = `id, property_address, subdivision, area, plan_name, plan_number, elevation, lot_swing,
  status, completion_percent, construction_manager_id, updated_at, job_completed_date, date_received,
  brick_sqft, brick_drop_slab_ft, brick_start_date, brick_end_date, brick_completion_date,
  stone_sqft, stone_color, stone_drop_ft, stone_start_date, stone_end_date, stone_completion_date,
  stucco_sqft, stucco_body_paint_color, stucco_trim_paint_color, stucco_percent_complete,
  stucco_start_date, stucco_end_date, stucco_completion_date,
  brick_color:brick_colors(name),
  brick_mortar:mortar_colors!jobs_brick_mortar_color_id_fkey(name),
  stone_mortar:mortar_colors!jobs_stone_mortar_color_id_fkey(name),
  cm:construction_managers(name),
  address_block_orders(status, ordered_date, delivered_date)`;

export type HomeStatus = "new" | "in_progress" | "completed";

export function todayCentral(offsetDays = 0) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Chicago",
  }).format(new Date(Date.now() + offsetDays * 864e5));
}

/** "2026-07-08" → "07/08" */
export const md = (d: string | null | undefined) =>
  d ? `${d.slice(5, 7)}/${d.slice(8, 10)}` : "";

/** Timestamp → "07/08" in Central time (not the UTC date). */
export const mdTs = (ts: string | null | undefined) =>
  ts
    ? new Intl.DateTimeFormat("en-US", {
        month: "2-digit",
        day: "2-digit",
        timeZone: "America/Chicago",
      }).format(new Date(ts))
    : "";

type Home = Record<string, unknown> & {
  id: string;
  status: HomeStatus;
  completion_percent: number | string;
};

export type TradeProgress = {
  key: "brick" | "stone" | "stucco" | "block";
  label: string;
  pct: number;
  note: string;
};

const DAY = 864e5;
const days = (a: string, b: string) =>
  (Date.parse(b + "T12:00:00Z") - Date.parse(a + "T12:00:00Z")) / DAY;

/** Per-trade progress for the portal, from the schedule and completion dates. */
export function tradeProgress(
  j: Home,
  today = todayCentral(),
): TradeProgress[] {
  const out: TradeProgress[] = [];
  const trades = [
    ["brick", "Brick"],
    ["stone", "Stone"],
    ["stucco", "Stucco"],
  ] as const;
  for (const [t, label] of trades) {
    if (!(Number(j[`${t}_sqft`]) > 0)) continue;
    const start = j[`${t}_start_date`] as string | null;
    const end = j[`${t}_end_date`] as string | null;
    const done = j[`${t}_completion_date`] as string | null;
    if (done || j.status === "completed") {
      out.push({
        key: t,
        label,
        pct: 100,
        note: done ? `DONE ${md(done)}` : "DONE",
      });
    } else if (t === "stucco" && Number(j.stucco_percent_complete) > 0) {
      const pct = Math.round(Number(j.stucco_percent_complete));
      out.push({ key: t, label, pct, note: `ON SITE · ${pct}%` });
    } else if (!start) {
      out.push({ key: t, label, pct: 0, note: "NOT SCHEDULED" });
    } else if (today < start) {
      out.push({ key: t, label, pct: 0, note: `STARTS ${md(start)}` });
    } else if (end && end > start) {
      const pct = Math.max(
        5,
        Math.min(95, Math.round((days(start, today) / days(start, end)) * 100)),
      );
      out.push({
        key: t,
        label,
        pct,
        note: today > end ? "FINISHING UP" : `ON SITE · EST ${md(end)}`,
      });
    } else {
      out.push({ key: t, label, pct: 50, note: "ON SITE" });
    }
  }
  const block = j.address_block_orders as {
    status: string;
    ordered_date: string | null;
    delivered_date: string | null;
  } | null;
  out.push(
    block?.status === "delivered"
      ? {
          key: "block",
          label: "Address Blk",
          pct: 100,
          note: `DELIVERED ${md(block.delivered_date)}`,
        }
      : block?.status === "ordered"
        ? {
            key: "block",
            label: "Address Blk",
            pct: 50,
            note: `ORDERED ${md(block.ordered_date)}`,
          }
        : { key: "block", label: "Address Blk", pct: 0, note: "NOT ORDERED" },
  );
  return out;
}

/** Spec chips: colors and square footage on file. */
export function specChips(j: Record<string, unknown>) {
  const name = (v: unknown) => (v as { name?: string } | null)?.name;
  const sf = [j.brick_sqft, j.stone_sqft, j.stucco_sqft]
    .map(Number)
    .filter((n) => n > 0)
    .map((n) => n.toLocaleString("en-US"));
  return [
    name(j.brick_color) && `Brick: ${name(j.brick_color)}`,
    name(j.brick_mortar) && `Mortar: ${name(j.brick_mortar)}`,
    j.stone_color && `Stone: ${j.stone_color}`,
    name(j.stone_mortar) &&
      name(j.stone_mortar) !== name(j.brick_mortar) &&
      `Stone mortar: ${name(j.stone_mortar)}`,
    j.stucco_body_paint_color && `Body: ${j.stucco_body_paint_color}`,
    j.stucco_trim_paint_color && `Trim: ${j.stucco_trim_paint_color}`,
    sf.length > 0 && `${sf.join(" + ")} SF`,
  ].filter(Boolean) as string[];
}

export function homeMeta(j: Record<string, unknown>) {
  return [
    j.subdivision,
    j.plan_name && `Plan ${j.plan_name}`,
    j.elevation && `Elev ${j.elevation}`,
    j.lot_swing && `Lot swing ${j.lot_swing}`,
  ]
    .filter(Boolean)
    .join(" · ")
    .toUpperCase();
}

/** Next scheduled trade start on a home that hasn't started, e.g. "Starts 07/28". */
export function nextStart(j: Record<string, unknown>, today = todayCentral()) {
  const starts = (["brick", "stone", "stucco"] as const)
    .map((t) => j[`${t}_start_date`] as string | null)
    .filter((d): d is string => Boolean(d) && d! >= today)
    .sort();
  return starts[0] ?? null;
}

export async function loadHomes(opts: {
  builderId: string;
  status?: HomeStatus;
  q?: string;
  cmId?: string | null;
  page?: number;
  pageSize?: number;
}) {
  const supabase = await createClient();
  const size = opts.pageSize ?? 12;
  const page = Math.max(1, opts.page ?? 1);
  let query = supabase
    .from("jobs")
    .select(HOME_COLS, { count: "exact" })
    .eq("builder_id", opts.builderId);
  if (opts.status) query = query.eq("status", opts.status);
  if (opts.cmId) query = query.eq("construction_manager_id", opts.cmId);
  if (opts.q) {
    const like = `%${opts.q.replace(/[%_,()]/g, " ").trim()}%`;
    query = query.or(
      `property_address.ilike.${like},subdivision.ilike.${like},plan_name.ilike.${like}`,
    );
  }
  const { data, count } = await query
    .order("status", { ascending: false })
    .order("updated_at", { ascending: false })
    .range((page - 1) * size, page * size - 1);
  return {
    homes: (data ?? []) as unknown as Home[],
    total: count ?? 0,
    page,
    size,
  };
}

export async function loadStats(builderId: string) {
  const supabase = await createClient();
  const today = todayCentral();
  const week = todayCentral(7);
  const year = today.slice(0, 4);
  const [{ data: open }, { count: completed }] = await Promise.all([
    supabase
      .from("jobs")
      .select(
        "id, status, subdivision, brick_sqft, stone_sqft, stucco_sqft, brick_start_date, brick_end_date, brick_completion_date, stone_start_date, stone_end_date, stone_completion_date, stucco_start_date, stucco_end_date, stucco_completion_date",
      )
      .eq("builder_id", builderId)
      .neq("status", "completed"),
    supabase
      .from("jobs")
      .select("id", { count: "exact", head: true })
      .eq("builder_id", builderId)
      .eq("status", "completed")
      .gte("job_completed_date", `${year}-01-01`),
  ]);
  const rows = open ?? [];
  const active = rows.filter((j) => j.status === "in_progress");
  const subdivisions = [
    ...new Set(active.map((j) => j.subdivision).filter(Boolean)),
  ];
  const onSite = { brick: 0, stone: 0, stucco: 0 };
  let scheduledWeek = 0;
  let nextUp: { date: string; trade: string } | null = null;
  for (const j of rows)
    for (const t of ["brick", "stone", "stucco"] as const) {
      if (!(Number(j[`${t}_sqft`]) > 0) || j[`${t}_completion_date`]) continue;
      const s = j[`${t}_start_date`];
      const e = j[`${t}_end_date`];
      if (s && s <= today && (!e || e >= today)) onSite[t] += 1;
      if (s && s > today && s <= week) {
        scheduledWeek += 1;
        if (!nextUp || s < nextUp.date) nextUp = { date: s, trade: t };
      }
    }
  return {
    active: active.length,
    subdivisions,
    onSite,
    onSiteTotal: onSite.brick + onSite.stone + onSite.stucco,
    scheduledWeek,
    nextUp,
    completedYear: completed ?? 0,
  };
}

export type FeedItem = {
  date: string;
  title: string;
  sub: string;
  jobId: string;
};

/** "Recent Updates": photos, trade starts and finishes, deliveries, completions. */
export async function loadFeed(
  builderId: string,
  limit = 8,
): Promise<FeedItem[]> {
  const supabase = await createClient();
  const today = todayCentral();
  const since = todayCentral(-30);
  const [{ data: jobs }, { data: photos }] = await Promise.all([
    supabase
      .from("jobs")
      .select(
        "id, property_address, status, job_completed_date, brick_start_date, brick_end_date, brick_completion_date, stone_start_date, stone_end_date, stone_completion_date, stucco_start_date, stucco_end_date, stucco_completion_date, address_block_orders(status, delivered_date)",
      )
      .eq("builder_id", builderId)
      .or(
        `job_completed_date.gte.${since},brick_start_date.gte.${since},stone_start_date.gte.${since},stucco_start_date.gte.${since},brick_completion_date.gte.${since},stone_completion_date.gte.${since},stucco_completion_date.gte.${since}`,
      )
      .limit(200),
    supabase
      .from("job_photos")
      .select(
        "job_id, created_at, taken_on, trade, jobs!inner(property_address, builder_id)",
      )
      .eq("jobs.builder_id", builderId)
      .gte("created_at", `${since}T00:00:00Z`)
      .order("created_at", { ascending: false })
      .limit(200),
  ]);

  const items: FeedItem[] = [];
  const T = { brick: "Brick", stone: "Stone", stucco: "Stucco" } as const;
  for (const j of jobs ?? []) {
    const a = j.property_address ?? "";
    if (j.job_completed_date && j.job_completed_date >= since)
      items.push({
        date: j.job_completed_date,
        title: `Home completed — ${a}`,
        sub: "All trades finished",
        jobId: j.id,
      });
    for (const t of ["brick", "stone", "stucco"] as const) {
      const s = j[`${t}_start_date`];
      const e = j[`${t}_end_date`];
      const d = j[`${t}_completion_date`];
      if (d && d >= since && d <= today)
        items.push({
          date: d,
          title: `${T[t]} completed — ${a}`,
          sub: "Ready for the next trade",
          jobId: j.id,
        });
      if (s && s >= since && s <= today)
        items.push({
          date: s,
          title: `${T[t]} crew started — ${a}`,
          sub: e ? `Scheduled through ${md(e)}` : "On site",
          jobId: j.id,
        });
    }
    const b = j.address_block_orders;
    if (
      b?.status === "delivered" &&
      b.delivered_date &&
      b.delivered_date >= since
    )
      items.push({
        date: b.delivered_date,
        title: `Address block delivered — ${a}`,
        sub: "Ready to set",
        jobId: j.id,
      });
  }
  // Photos: one line per home per day.
  const byDay = new Map<
    string,
    { n: number; a: string; jobId: string; date: string; trades: Set<string> }
  >();
  for (const p of photos ?? []) {
    const date = todayFrom(p.created_at);
    const k = `${p.job_id}|${date}`;
    const e = byDay.get(k) ?? {
      n: 0,
      a: p.jobs.property_address ?? "",
      jobId: p.job_id,
      date,
      trades: new Set(),
    };
    e.n += 1;
    if (p.trade) e.trades.add(T[p.trade]);
    byDay.set(k, e);
  }
  for (const e of byDay.values())
    items.push({
      date: e.date,
      title: `${e.n} ${e.n === 1 ? "photo" : "photos"} added — ${e.a}`,
      sub: e.trades.size ? [...e.trades].join(" · ") : "Progress photos",
      jobId: e.jobId,
    });

  return items.sort((x, y) => y.date.localeCompare(x.date)).slice(0, limit);
}

function todayFrom(ts: string) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Chicago",
  }).format(new Date(ts));
}

/** Latest photos on one home, with short-lived signed URLs. */
export async function loadHomePhotos(jobId: string, limit = 12) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("job_photos")
    .select("id, storage_path, caption, trade, taken_on, created_at")
    .eq("job_id", jobId)
    .order("taken_on", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false })
    .limit(limit);
  const rows = data ?? [];
  if (!rows.length) return [];
  const { data: signed } = await supabase.storage
    .from("photos")
    .createSignedUrls(
      rows.map((r) => r.storage_path),
      3600,
    );
  const url = new Map((signed ?? []).map((s) => [s.path, s.signedUrl]));
  return rows.map((r) => ({
    id: r.id,
    url: url.get(r.storage_path) ?? null,
    label: [r.caption, r.trade && r.trade.toUpperCase()]
      .filter(Boolean)
      .join(" · "),
    date: md(r.taken_on ?? todayFrom(r.created_at)),
  }));
}

export async function loadContacts(builderId: string) {
  const supabase = await createClient();
  const { data } = await supabase.rpc("portal_contacts", {
    p_builder: builderId,
  });
  return data ?? [];
}
