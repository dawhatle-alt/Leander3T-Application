import type { Metadata } from "next";
import Link from "next/link";
import { AddressBlockControl } from "@/components/address-blocks/block-control";
import { PageHead } from "@/components/shell/page-bits";
import { shortDate } from "@/lib/jobs/format";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Address Blocks — Leander 3T" };

type Tab = "pending" | "ordered" | "delivered";
const TABS: { key: Tab; label: string }[] = [
  { key: "pending", label: "Not Ordered" },
  { key: "ordered", label: "Ordered" },
  { key: "delivered", label: "Delivered" },
];
const DELIVERED_DAYS = 60;

// Every job's address block: what still needs ordering (open jobs, soonest
// brick start first), what's on order, and what was delivered recently.
export default async function AddressBlocksPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status: s } = await searchParams;
  const tab: Tab = s === "ordered" || s === "delivered" ? s : "pending";
  const supabase = await createClient();

  const since = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Chicago",
  }).format(new Date(Date.now() - DELIVERED_DAYS * 864e5));

  type Row = {
    id: string;
    property_address: string | null;
    subdivision: string | null;
    brick_start_date: string | null;
    stone_start_date: string | null;
    builder: string | null;
    status: "none" | "ordered" | "delivered";
    ordered_date: string | null;
    delivered_date: string | null;
  };
  let rows: Row[];

  if (tab === "pending") {
    // Open jobs whose block isn't ordered yet, soonest brick start first.
    const { data } = await supabase
      .from("jobs")
      .select(
        "id, property_address, subdivision, brick_start_date, stone_start_date, builders(name), address_block_orders(status, ordered_date, delivered_date)",
      )
      .neq("status", "completed")
      .order("brick_start_date", { ascending: true, nullsFirst: false })
      .limit(1000);
    rows = (data ?? [])
      .filter((j) => (j.address_block_orders?.status ?? "none") === "none")
      .map((j) => ({
        id: j.id,
        property_address: j.property_address,
        subdivision: j.subdivision,
        brick_start_date: j.brick_start_date,
        stone_start_date: j.stone_start_date,
        builder: j.builders?.name ?? null,
        status: "none",
        ordered_date: null,
        delivered_date: null,
      }));
  } else {
    let q = supabase
      .from("address_block_orders")
      .select(
        "status, ordered_date, delivered_date, jobs!inner(id, property_address, subdivision, brick_start_date, stone_start_date, builders(name))",
      )
      .eq("status", tab);
    q =
      tab === "ordered"
        ? q.order("ordered_date", { ascending: true })
        : q
            .gte("delivered_date", since)
            .order("delivered_date", { ascending: false });
    const { data } = await q.limit(1000);
    rows = (data ?? []).map((b) => ({
      id: b.jobs.id,
      property_address: b.jobs.property_address,
      subdivision: b.jobs.subdivision,
      brick_start_date: b.jobs.brick_start_date,
      stone_start_date: b.jobs.stone_start_date,
      builder: b.jobs.builders?.name ?? null,
      status: b.status,
      ordered_date: b.ordered_date,
      delivered_date: b.delivered_date,
    }));
  }

  return (
    <>
      <PageHead
        title="Address Blocks"
        sub={
          tab === "pending"
            ? `${rows.length} open ${rows.length === 1 ? "job needs" : "jobs need"} an address block ordered, soonest brick start first.`
            : tab === "ordered"
              ? `${rows.length} on order, oldest first.`
              : `${rows.length} delivered in the last ${DELIVERED_DAYS} days.`
        }
      />
      <div className="mb-[22px] flex flex-wrap gap-2.5">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={
              t.key === "pending"
                ? "/admin/address-blocks"
                : `/admin/address-blocks?status=${t.key}`
            }
            className="fchip"
            aria-current={tab === t.key}
          >
            {t.label}
          </Link>
        ))}
      </div>
      <div className="rounded-md border border-mortar bg-paper shadow-card">
        {rows.length === 0 ? (
          <p className="px-6 py-10 text-center text-ink-muted">Nothing here.</p>
        ) : (
          <ul className="divide-y divide-mortar">
            {rows.map((j) => (
              <li
                key={j.id}
                className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-3"
              >
                <div className="min-w-0 flex-1 basis-[240px]">
                  <Link
                    href={`/jobs/${j.id}`}
                    className="font-semibold hover:text-flame"
                  >
                    {j.property_address}
                  </Link>
                  <div className="text-[12.5px] text-ink-muted">
                    {[j.builder, j.subdivision].filter(Boolean).join(" · ")}
                  </div>
                </div>
                <span className="w-[150px] font-mono text-[12px] text-ink-muted">
                  {tab === "pending"
                    ? j.brick_start_date
                      ? `BRICK STARTS ${shortDate(j.brick_start_date)}`
                      : j.stone_start_date
                        ? `STONE STARTS ${shortDate(j.stone_start_date)}`
                        : "NOT SCHEDULED"
                    : tab === "ordered"
                      ? `ORDERED ${shortDate(j.ordered_date)}`
                      : `DELIVERED ${shortDate(j.delivered_date)}`}
                </span>
                <AddressBlockControl jobId={j.id} status={j.status} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
