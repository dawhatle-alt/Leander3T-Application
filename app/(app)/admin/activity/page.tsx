import type { Metadata } from "next";
import Link from "next/link";
import { ChangeList } from "@/components/audit/change-list";
import { PageHead, Panel, Stat } from "@/components/shell/page-bits";
import { AREAS, loadChanges, type Area } from "@/lib/audit/changes";
import { deviceLabel } from "@/lib/audit/device";
import { ROLE_LABEL } from "@/lib/auth/roles";
import { stamp } from "@/lib/jobs/format";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Activity — Leander 3T" };

const PERIODS = [
  { key: "1", label: "Today", days: 1 },
  { key: "7", label: "7 days", days: 7 },
  { key: "30", label: "30 days", days: 30 },
  { key: "90", label: "90 days", days: 90 },
  { key: "all", label: "All time", days: null },
] as const;

const EVENT_LABEL: Record<string, string> = {
  sign_in: "Signed in",
  sign_in_failed: "Failed sign-in",
  sign_out: "Signed out",
  password_changed: "Changed password",
  password_set: "Password set",
  invited: "Invited",
};

const METHOD_LABEL: Record<string, string> = {
  password: "Password",
  email_link: "Email link",
  invite: "Invitation link",
  password_reset: "Password reset link",
};

const PAGE = 100;
const UUID = /^[0-9a-f-]{36}$/i;

type Search = {
  view?: string;
  who?: string;
  area?: string;
  period?: string;
  failed?: string;
  job?: string;
  before?: string;
};

// Administration: who signed in (and who couldn't), and who changed what.
export default async function ActivityPage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  const sp = await searchParams;
  const view = sp.view === "signins" ? "signins" : "changes";
  const period = PERIODS.find((p) => p.key === sp.period) ?? PERIODS[2];
  const who = sp.who && UUID.test(sp.who) ? sp.who : undefined;
  const jobId = sp.job && UUID.test(sp.job) ? sp.job : undefined;
  const area = sp.area && sp.area in AREAS ? (sp.area as Area) : undefined;
  const failedOnly = sp.failed === "1";
  const before = Number(sp.before) > 0 ? Number(sp.before) : undefined;
  const since = period.days
    ? new Date(Date.now() - period.days * 86_400_000).toISOString()
    : undefined;
  const weekAgo = new Date(Date.now() - 7 * 86_400_000).toISOString();

  const supabase = await createClient();
  const [{ data: people }, signIns, failed, changes] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, full_name, email, role, active")
      .order("full_name"),
    supabase
      .from("access_log")
      .select("id", { count: "exact", head: true })
      .eq("event", "sign_in")
      .gte("occurred_at", weekAgo),
    supabase
      .from("access_log")
      .select("id", { count: "exact", head: true })
      .eq("event", "sign_in_failed")
      .gte("occurred_at", weekAgo),
    supabase
      .from("audit_log")
      .select("id", { count: "exact", head: true })
      .gte("occurred_at", weekAgo),
  ]);
  const nameOf = new Map(
    (people ?? []).map((p) => [p.id, p.full_name ?? p.email ?? "Unnamed"]),
  );

  const link = (patch: Partial<Search>) => {
    const next = { ...sp, before: undefined, ...patch };
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(next)) if (v) qs.set(k, v);
    const s = qs.toString();
    return s ? `/admin/activity?${s}` : "/admin/activity";
  };

  return (
    <>
      <PageHead
        title="Activity"
        sub="Who signed in, and who changed jobs, orders and people. Times are Central."
      />

      <div className="mb-[26px] grid gap-5 md:grid-cols-3">
        <Stat label="Sign-ins · 7 days" value={signIns.count ?? 0} />
        <Stat
          label="Failed sign-ins · 7 days"
          value={failed.count ?? 0}
          note={
            (failed.count ?? 0) > 0 ? "Wrong password or old link" : undefined
          }
        />
        <Stat label="Changes · 7 days" value={changes.count ?? 0} />
      </div>

      <div className="mb-4 flex flex-wrap gap-2.5">
        <Link
          href={link({ view: undefined, failed: undefined })}
          className="fchip"
          aria-current={view === "changes"}
        >
          Changes
        </Link>
        <Link
          href={link({ view: "signins", area: undefined, job: undefined })}
          className="fchip"
          aria-current={view === "signins"}
        >
          Sign-ins
        </Link>
      </div>

      <form
        action="/admin/activity"
        className="mb-6 flex flex-wrap items-end gap-2.5"
      >
        {view === "signins" && (
          <input type="hidden" name="view" value="signins" />
        )}
        {jobId && <input type="hidden" name="job" value={jobId} />}
        <Field label="Person">
          <select
            name="who"
            defaultValue={who ?? ""}
            className="input w-auto py-2"
          >
            <option value="">Everyone</option>
            {(people ?? []).map((p) => (
              <option key={p.id} value={p.id}>
                {p.full_name ?? p.email ?? "Unnamed"}
                {p.active ? "" : " (off)"}
              </option>
            ))}
          </select>
        </Field>
        {view === "changes" ? (
          <Field label="Area">
            <select
              name="area"
              defaultValue={area ?? ""}
              className="input w-auto py-2"
            >
              <option value="">Everything</option>
              {Object.entries(AREAS).map(([k, a]) => (
                <option key={k} value={k}>
                  {a.label}
                </option>
              ))}
            </select>
          </Field>
        ) : (
          <Field label="Show">
            <select
              name="failed"
              defaultValue={failedOnly ? "1" : ""}
              className="input w-auto py-2"
            >
              <option value="">All events</option>
              <option value="1">Failed sign-ins only</option>
            </select>
          </Field>
        )}
        <Field label="Period">
          <select
            name="period"
            defaultValue={period.key}
            className="input w-auto py-2"
          >
            {PERIODS.map((p) => (
              <option key={p.key} value={p.key}>
                {p.label}
              </option>
            ))}
          </select>
        </Field>
        <button
          type="submit"
          className="rounded-sm bg-charcoal px-4 py-2 text-[13.5px] font-bold text-limestone"
        >
          Filter
        </button>
      </form>

      {view === "changes" ? (
        <ChangesView
          filter={{ jobId, actorId: who, area, since, before, limit: PAGE }}
          jobId={jobId}
          clearJob={link({ job: undefined })}
          olderHref={(id) => link({ before: String(id) })}
        />
      ) : (
        <SignInsView
          who={who}
          failedOnly={failedOnly}
          since={since}
          before={before}
          nameOf={nameOf}
          people={people ?? []}
          olderHref={(id) => link({ before: String(id) })}
        />
      )}
    </>
  );
}

async function ChangesView({
  filter,
  jobId,
  clearJob,
  olderHref,
}: {
  filter: Parameters<typeof loadChanges>[1];
  jobId?: string;
  clearJob: string;
  olderHref: (id: number) => string;
}) {
  const supabase = await createClient();
  const { entries, nextBefore } = await loadChanges(supabase, filter);
  const jobAddress = jobId
    ? (entries.find((e) => e.jobAddress)?.jobAddress ?? "this job")
    : null;
  return (
    <Panel
      title={jobAddress ? `History · ${jobAddress}` : "Changes"}
      action={
        jobId ? (
          <Link
            href={clearJob}
            className="text-[13.5px] font-semibold text-flame"
          >
            Show all jobs
          </Link>
        ) : undefined
      }
    >
      <ChangeList
        entries={entries}
        showJob={!jobId}
        empty="No changes in this period."
      />
      {nextBefore && <Older href={olderHref(nextBefore)} />}
    </Panel>
  );
}

async function SignInsView({
  who,
  failedOnly,
  since,
  before,
  nameOf,
  people,
  olderHref,
}: {
  who?: string;
  failedOnly: boolean;
  since?: string;
  before?: number;
  nameOf: Map<string, string>;
  people: {
    id: string;
    full_name: string | null;
    email: string | null;
    role: keyof typeof ROLE_LABEL;
    active: boolean;
  }[];
  olderHref: (id: number) => string;
}) {
  const supabase = await createClient();
  let q = supabase
    .from("access_log")
    .select(
      "id, occurred_at, event, method, user_id, email, actor_name, ip, user_agent, detail",
    )
    .order("id", { ascending: false })
    .limit(PAGE + 1);
  if (who) q = q.eq("user_id", who);
  if (failedOnly) q = q.eq("event", "sign_in_failed");
  if (since) q = q.gte("occurred_at", since);
  if (before) q = q.lt("id", before);
  const [{ data }, { data: last }] = await Promise.all([
    q,
    supabase.from("last_sign_ins").select("user_id, occurred_at, user_agent"),
  ]);
  const rows = data ?? [];
  const more = rows.length > PAGE;
  const page = more ? rows.slice(0, PAGE) : rows;

  const lastBy = new Map((last ?? []).map((l) => [l.user_id, l]));
  const roster = people
    .filter((p) => p.active)
    .map((p) => ({ ...p, last: lastBy.get(p.id) ?? null }))
    .sort((a, b) =>
      (b.last?.occurred_at ?? "").localeCompare(a.last?.occurred_at ?? ""),
    );

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
      <Panel title="Sign-in log">
        {page.length === 0 ? (
          <p className="px-6 py-10 text-center text-ink-muted">
            Nothing recorded in this period.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-[14px]">
              <thead className="font-mono text-[11px] tracking-[0.12em] text-ink-muted uppercase">
                <tr className="border-b border-mortar">
                  <th className="px-6 py-2.5 font-medium">When</th>
                  <th className="px-3 py-2.5 font-medium">Person</th>
                  <th className="px-3 py-2.5 font-medium">What</th>
                  <th className="px-3 py-2.5 font-medium">IP address</th>
                  <th className="px-6 py-2.5 font-medium">Device</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-limestone">
                {page.map((r) => {
                  const bad = r.event === "sign_in_failed";
                  const person =
                    (r.user_id && nameOf.get(r.user_id)) ||
                    r.email ||
                    "Unknown";
                  const how = r.method ? METHOD_LABEL[r.method] : null;
                  const by = r.actor_name ? `by ${r.actor_name}` : null;
                  return (
                    <tr key={r.id} className={cn(bad && "bg-chalk/5")}>
                      <td className="px-6 py-2.5 font-mono text-[12.5px] whitespace-nowrap">
                        {stamp(r.occurred_at)}
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="font-semibold">{person}</div>
                        {bad && !r.user_id && (
                          <div className="text-[12.5px] text-ink-muted">
                            No account with that email
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-2.5">
                        <span className={cn(bad && "font-semibold text-chalk")}>
                          {EVENT_LABEL[r.event] ?? r.event}
                        </span>
                        {(how || by) && (
                          <div className="text-[12.5px] text-ink-muted">
                            {[how, by].filter(Boolean).join(" · ")}
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-2.5 font-mono text-[12.5px]">
                        {r.ip ?? "—"}
                      </td>
                      <td className="px-6 py-2.5 text-[13px] whitespace-nowrap">
                        <span title={r.user_agent ?? undefined}>
                          {deviceLabel(r.user_agent)}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {more && <Older href={olderHref(page[page.length - 1].id)} />}
      </Panel>

      <Panel title="Last sign-in">
        <ul className="divide-y divide-limestone">
          {roster.map((p) => (
            <li
              key={p.id}
              className="flex items-baseline justify-between gap-3 px-6 py-2.5"
            >
              <div className="min-w-0">
                <div className="truncate font-semibold">
                  {p.full_name ?? p.email ?? "Unnamed"}
                </div>
                <div className="font-mono text-[11px] tracking-[0.08em] text-ink-muted uppercase">
                  {ROLE_LABEL[p.role]}
                </div>
              </div>
              <div className="text-right font-mono text-[12px] whitespace-nowrap text-ink-muted">
                {p.last?.occurred_at ? stamp(p.last.occurred_at) : "Never"}
              </div>
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  );
}

function Older({ href }: { href: string }) {
  return (
    <div className="border-t border-mortar px-6 py-3 text-center">
      <Link href={href} className="text-[13.5px] font-semibold text-flame">
        Older entries →
      </Link>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="grid gap-1">
      <span className="font-mono text-[11px] tracking-[0.12em] text-ink-muted uppercase">
        {label}
      </span>
      {children}
    </label>
  );
}
