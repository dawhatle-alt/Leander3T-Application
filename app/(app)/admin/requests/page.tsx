import type { Metadata } from "next";
import Link from "next/link";
import { RequestControls } from "@/components/marketing/request-controls";
import { PageHead } from "@/components/shell/page-bits";
import { stamp } from "@/lib/jobs/format";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Website Requests — Leander 3T" };

// "Request More Information" submissions from the public site.
export default async function RequestsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status: s } = await searchParams;
  const done = s === "done";
  const supabase = await createClient();
  let q = supabase
    .from("info_requests")
    .select(
      "id, name, company_name, company_size, email, phone, notes, status, assignee_id, created_at",
    );
  q = done ? q.eq("status", "done") : q.neq("status", "done");
  const [{ data: requests }, { data: admins }] = await Promise.all([
    q.order("created_at", { ascending: false }).limit(200),
    supabase
      .from("profiles")
      .select("id, full_name, email")
      .eq("role", "admin")
      .eq("active", true)
      .order("full_name"),
  ]);
  const adminOpts = (admins ?? []).map((a) => ({
    value: a.id,
    label: a.full_name ?? a.email ?? "—",
  }));

  return (
    <>
      <PageHead
        title="Website Requests"
        sub={
          done
            ? "Requests that have been handled, newest first."
            : `${requests?.length ?? 0} open ${requests?.length === 1 ? "request" : "requests"} from the website, newest first.`
        }
      />
      <div className="mb-[22px] flex flex-wrap gap-2.5">
        <Link href="/admin/requests" className="fchip" aria-current={!done}>
          Open
        </Link>
        <Link
          href="/admin/requests?status=done"
          className="fchip"
          aria-current={done}
        >
          Done
        </Link>
      </div>
      <div className="rounded-md border border-mortar bg-paper shadow-card">
        {!requests?.length ? (
          <p className="px-6 py-10 text-center text-ink-muted">
            {done ? "Nothing here yet." : "No open requests."}
          </p>
        ) : (
          <ul className="divide-y divide-mortar">
            {requests.map((r) => (
              <li
                key={r.id}
                className={cn(
                  "grid gap-3 px-6 py-4 md:grid-cols-[minmax(0,1fr)_auto]",
                  r.status === "todo" && "border-l-[3px] border-l-flame",
                )}
              >
                <div className="min-w-0">
                  <div className="font-semibold">
                    {r.name}
                    {r.company_name && (
                      <span className="font-normal text-ink-muted">
                        {" "}
                        · {r.company_name}
                        {r.company_size ? ` (${r.company_size})` : ""}
                      </span>
                    )}
                  </div>
                  <div className="font-mono text-[13px] text-ink-muted">
                    {r.email && (
                      <a
                        href={`mailto:${r.email}`}
                        className="text-flame hover:underline"
                      >
                        {r.email}
                      </a>
                    )}
                    {r.phone && (
                      <>
                        {" · "}
                        <a href={`tel:${r.phone}`} className="hover:underline">
                          {r.phone}
                        </a>
                      </>
                    )}
                    {" · "}
                    {stamp(r.created_at)}
                  </div>
                  {r.notes && (
                    <p className="mt-2 max-w-[80ch] text-[14.5px] whitespace-pre-wrap">
                      {r.notes}
                    </p>
                  )}
                </div>
                <RequestControls
                  id={r.id}
                  status={r.status}
                  assigneeId={r.assignee_id ?? ""}
                  admins={adminOpts}
                />
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
