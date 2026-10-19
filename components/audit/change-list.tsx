import Link from "next/link";
import type { ChangeEntry } from "@/lib/audit/changes";
import { stamp } from "@/lib/jobs/format";

/** Change-log lines: who did what, when, and each field's before → after. */
export function ChangeList({
  entries,
  showJob = true,
  empty = "No changes recorded yet.",
}: {
  entries: ChangeEntry[];
  showJob?: boolean;
  empty?: string;
}) {
  if (!entries.length)
    return <p className="px-6 py-10 text-center text-ink-muted">{empty}</p>;

  return (
    <ul className="divide-y divide-mortar">
      {entries.map((e) => (
        <li key={e.id} className="px-6 py-3.5">
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <p className="min-w-0 text-[14.5px]">
              <span className="font-semibold">{e.who}</span>
              {e.whoRole && (
                <span className="font-mono text-[11px] tracking-[0.08em] text-ink-muted uppercase">
                  {" "}
                  · {e.whoRole}
                </span>
              )}{" "}
              {e.summary}
              {showJob && e.jobAddress && (
                <>
                  {" on "}
                  {e.jobId ? (
                    <Link
                      href={`/jobs/${e.jobId}`}
                      className="font-semibold text-flame hover:underline"
                    >
                      {e.jobAddress}
                    </Link>
                  ) : (
                    <span className="font-semibold">{e.jobAddress}</span>
                  )}
                </>
              )}
            </p>
            <time
              dateTime={e.at}
              className="font-mono text-[12px] whitespace-nowrap text-ink-muted"
            >
              {stamp(e.at)}
            </time>
          </div>
          {e.fields.length > 0 && (
            <dl className="mt-1.5 grid gap-x-3 gap-y-0.5 text-[13.5px] sm:grid-cols-[max-content_minmax(0,1fr)]">
              {e.fields.map((f) => (
                <div key={f.field} className="contents">
                  <dt className="text-ink-muted">{f.field}</dt>
                  <dd className="min-w-0 font-mono text-[12.5px] break-words">
                    <span className="text-ink-muted line-through decoration-mortar">
                      {f.from}
                    </span>
                    {" → "}
                    <span>{f.to}</span>
                  </dd>
                </div>
              ))}
            </dl>
          )}
        </li>
      ))}
    </ul>
  );
}
