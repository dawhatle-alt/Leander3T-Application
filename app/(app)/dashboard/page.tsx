import type { Metadata } from "next";
import Link from "next/link";
import {
  ClipboardList,
  FileText,
  House,
  PencilLine,
  Plus,
  TriangleAlert,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHead, Stat } from "@/components/shell/page-bits";
import { firstName } from "@/lib/auth/roles";
import { requireProfile } from "@/lib/auth/session";
import { canCreateJobs } from "@/lib/jobs/access";
import { shortDate, stamp } from "@/lib/jobs/format";
import { loadForms } from "@/lib/order-forms/data";
import { loadOrders } from "@/lib/orders/data";
import { ORDER_TYPES } from "@/lib/orders/types";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Dashboard — Leander 3T" };

const TZ = "America/Chicago";

function greeting(now: Date) {
  const hour = Number(
    new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      hour12: false,
      timeZone: TZ,
    }).format(now),
  );
  return hour < 12
    ? "Good Morning"
    : hour < 17
      ? "Good Afternoon"
      : "Good Evening";
}

type Attention = {
  key: string;
  tone: "red" | "amber";
  title: string;
  sub: string;
  href: string;
  action: string;
};

export default async function DashboardPage() {
  const profile = await requireProfile();
  const supabase = await createClient();
  const now = new Date();
  const office = profile.role === "admin" || profile.role === "supervisor";

  // Counts respect row-level security: an employee sees only their jobs.
  const count = async (q: PromiseLike<{ count: number | null }>) =>
    (await q).count ?? 0;
  const isAdmin = profile.role === "admin";
  const [active, fresh, completed, forms, pending, bySupervisor, webRequests] =
    await Promise.all([
      count(
        supabase
          .from("jobs")
          .select("id", { count: "exact", head: true })
          .eq("status", "in_progress"),
      ),
      count(
        supabase
          .from("jobs")
          .select("id", { count: "exact", head: true })
          .eq("status", "new"),
      ),
      count(
        supabase
          .from("jobs")
          .select("id", { count: "exact", head: true })
          .eq("status", "completed"),
      ),
      office ? loadForms({ status: "pending_review" }) : Promise.resolve([]),
      office ? loadOrders({ status: "pending" }) : Promise.resolve([]),
      supabase
        .from("job_assignments")
        .select("profile_id, profiles(full_name), jobs!inner(status)")
        .eq("kind", "supervisor")
        .eq("jobs.status", "in_progress"),
      isAdmin
        ? supabase
            .from("info_requests")
            .select("id, name, company_name, created_at")
            .eq("status", "todo")
            .order("created_at", { ascending: false })
        : Promise.resolve({
            data: [] as {
              id: string;
              name: string;
              company_name: string | null;
              created_at: string;
            }[],
          }),
    ]);

  // Crew manager material requests the office hasn't placed yet.
  const crewRequests = pending.filter((o) => o.requestedBy && o.job);

  const { data: jobRequests } = office
    ? await supabase
        .from("job_requests")
        .select(
          "id, kind, house_number, street, created_at, builders(name), jobs(property_address)",
        )
        .eq("status", "submitted")
        .order("created_at", { ascending: true })
    : { data: [] };

  const attention: Attention[] = [
    ...(jobRequests ?? []).map((r) => ({
      key: `j-${r.id}`,
      tone: "red" as const,
      title:
        r.kind === "new_job"
          ? `New job request from ${r.builders?.name ?? "a builder"} — ${r.house_number} ${r.street}`
          : `Question from ${r.builders?.name ?? "a builder"} — ${r.jobs?.property_address ?? ""}`,
      sub: `Sent ${stamp(r.created_at)}`,
      href: "/jobs/requests",
      action: "Review",
    })),
    ...(webRequests.data ?? []).map((r) => ({
      key: `w-${r.id}`,
      tone: "red" as const,
      title: `Website request — ${r.name}${r.company_name ? `, ${r.company_name}` : ""}`,
      sub: `Received ${stamp(r.created_at)}`,
      href: "/admin/requests",
      action: "Open",
    })),
    ...forms.map((f) => ({
      key: `f-${f.id}`,
      tone: "amber" as const,
      title: `${f.layoutLabel} order form awaiting review — ${f.job.address}`,
      sub: [
        `F-${f.number}`,
        `Orders ${f.orders.map((o) => `#${o.number}`).join(", ")}`,
        `Made ${stamp(f.generatedAt)}`,
      ].join(" · "),
      href: "/orders/forms",
      action: "Review",
    })),
    ...crewRequests.map((o) => ({
      key: `o-${o.type}-${o.id}`,
      tone: "red" as const,
      title: `${ORDER_TYPES[o.type].label} request from ${o.requestedBy} — ${o.job!.address}`,
      sub: [
        o.main,
        o.requestedDate
          ? `Deliver ${shortDate(o.requestedDate)}`
          : "No delivery date",
      ].join(" · "),
      href: `/jobs/${o.job!.id}`,
      action: "Open",
    })),
  ];

  const tally = new Map<string, { name: string; n: number }>();
  for (const a of bySupervisor.data ?? []) {
    const t = tally.get(a.profile_id) ?? {
      name: firstName(a.profiles?.full_name ?? null, null),
      n: 0,
    };
    t.n += 1;
    tally.set(a.profile_id, t);
  }
  const bars = [...tally.values()].sort((a, b) => b.n - a.n);
  const top = Math.max(1, ...bars.map((b) => b.n));

  const date = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    timeZone: TZ,
  }).format(now);

  const actions = [
    canCreateJobs(profile) && {
      href: "/jobs/new",
      icon: Plus,
      title: "New Job",
      text: "Set up a new job request from a builder.",
    },
    {
      href: "/jobs",
      icon: PencilLine,
      title: "Update Job",
      text: "Edit specs, schedules, or crews on an existing job.",
    },
    office && {
      href: "/orders",
      icon: FileText,
      title: "Request Materials",
      text: "Create supplier orders and generate order forms.",
    },
    {
      href: "/jobs?mine=1",
      icon: House,
      title: "My Jobs",
      text: "See every job assigned to you, at a glance.",
    },
  ].filter(Boolean) as {
    href: string;
    icon: typeof Plus;
    title: string;
    text: string;
  }[];

  return (
    <>
      <PageHead
        title={`${greeting(now)}, ${firstName(profile.fullName, profile.email)}`}
        sub={`${date} — here's where your jobs stand.`}
      >
        {canCreateJobs(profile) && (
          <Button asChild variant="fire" size="sm">
            <Link href="/jobs/new">+ New Job</Link>
          </Button>
        )}
      </PageHead>

      <div className="mb-[34px] grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Active Jobs" value={active} note="In progress" />
        <Stat label="New Job Requests" value={fresh} note="Not started" />
        {office ? (
          <Stat
            label="Orders Pending Review"
            value={forms.length}
            note={`${crewRequests.length} crew ${crewRequests.length === 1 ? "request" : "requests"} waiting`}
          />
        ) : (
          <Stat label="My Assigned Jobs" value={active + fresh} note="Open" />
        )}
        <Stat
          label="Homes Completed"
          value={completed.toLocaleString()}
          note="On record"
        />
      </div>

      <div
        className={cn(
          "mb-[38px] grid gap-5 sm:grid-cols-2",
          actions.length === 4 ? "xl:grid-cols-4" : "xl:grid-cols-3",
        )}
      >
        {actions.map((a) => (
          <Link
            key={a.title}
            href={a.href}
            className="flex flex-col gap-3.5 rounded-md bg-charcoal p-6 text-limestone transition-[transform,box-shadow] hover:-translate-y-[3px] hover:shadow-[0_10px_30px_rgba(33,27,23,.25)]"
          >
            <span className="grid size-[42px] place-items-center rounded-[9px] bg-fire text-[#20130a]">
              <a.icon className="size-5" aria-hidden />
            </span>
            <span className="font-display text-[22px] font-bold tracking-[0.02em] uppercase">
              {a.title}
            </span>
            <span className="text-[13.5px] leading-[1.45] text-[#b0a494]">
              {a.text}
            </span>
          </Link>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        {office && (
          <section className="rounded-md border border-mortar bg-paper shadow-card">
            <div className="flex items-center justify-between border-b border-mortar px-6 py-[18px]">
              <h2 className="font-display text-[22px] font-bold uppercase">
                Needs Attention
              </h2>
              <Link
                href="/orders/forms"
                className="text-[13.5px] font-bold text-flame"
              >
                View all
              </Link>
            </div>
            {attention.length === 0 ? (
              <p className="px-6 py-8 text-center text-ink-muted">
                Nothing waiting on the office.
              </p>
            ) : (
              <ul className="divide-y divide-mortar">
                {attention.slice(0, 7).map((a) => (
                  <li
                    key={a.key}
                    className="flex items-center gap-3.5 px-6 py-3.5"
                  >
                    <span
                      className={cn(
                        "grid size-9 flex-none place-items-center rounded-full",
                        a.tone === "red"
                          ? "bg-[#c42b1f14] text-chalk"
                          : "bg-[#f49f0a1f] text-[#a86a00]",
                      )}
                    >
                      {a.tone === "red" ? (
                        <TriangleAlert className="size-[17px]" aria-hidden />
                      ) : (
                        <ClipboardList className="size-[17px]" aria-hidden />
                      )}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="text-[14.5px] font-semibold">
                        {a.title}
                      </div>
                      <div className="font-mono text-[11.5px] tracking-[0.06em] text-ink-muted uppercase">
                        {a.sub}
                      </div>
                    </div>
                    <Button asChild variant="dark" size="sm">
                      <Link href={a.href}>{a.action}</Link>
                    </Button>
                  </li>
                ))}
              </ul>
            )}
            {attention.length > 7 && (
              <p className="border-t border-mortar px-6 py-3 text-[13.5px] text-ink-muted">
                {attention.length - 7} more —{" "}
                <Link href="/orders/forms" className="font-bold text-flame">
                  order forms
                </Link>{" "}
                and{" "}
                <Link href="/orders" className="font-bold text-flame">
                  orders
                </Link>
                .
              </p>
            )}
          </section>
        )}

        <section
          className={cn(
            "rounded-md border border-mortar bg-paper shadow-card",
            !office && "lg:col-span-2",
          )}
        >
          <div className="flex items-center justify-between border-b border-mortar px-6 py-[18px]">
            <h2 className="font-display text-[22px] font-bold uppercase">
              Active Jobs by Supervisor
            </h2>
            <Link
              href="/jobs?status=in_progress"
              className="text-[13.5px] font-bold text-flame"
            >
              Details
            </Link>
          </div>
          <div className="px-6 py-5">
            {bars.length === 0 ? (
              <p className="text-ink-muted">No active jobs.</p>
            ) : (
              bars.map((b) => (
                <div
                  key={b.name}
                  className="mb-4 grid grid-cols-[88px_1fr_40px] items-center gap-3.5"
                >
                  <span className="truncate text-[14px] font-semibold">
                    {b.name}
                  </span>
                  <div className="h-3 overflow-hidden rounded-full bg-limestone">
                    <div
                      className="h-full rounded-full bg-fire"
                      style={{ width: `${Math.round((b.n / top) * 100)}%` }}
                    />
                  </div>
                  <span className="text-right font-mono text-[13px] text-ink-muted">
                    {b.n}
                  </span>
                </div>
              ))
            )}
            <div className="border-t border-dashed border-mortar pt-2 font-mono text-[12px] text-ink-muted">
              {active} ACTIVE · UPDATED LIVE
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
