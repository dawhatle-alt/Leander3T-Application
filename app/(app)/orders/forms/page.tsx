import type { Metadata } from "next";
import Link from "next/link";
import { FormList } from "@/components/order-forms/form-list";
import { PageHead } from "@/components/shell/page-bits";
import { requireProfile } from "@/lib/auth/session";
import { loadForms } from "@/lib/order-forms/data";
import { emailConfigured } from "@/lib/order-forms/notify";

export const metadata: Metadata = { title: "Order Forms — Leander 3T" };

const RECENT_DAYS = 30;

// The review queue: generated supplier order forms waiting for the review
// team, and those approved recently.
export default async function OrderFormsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const me = await requireProfile();
  const { status: s } = await searchParams;
  const status = s === "approved" ? "approved" : "pending_review";
  const forms = await loadForms(
    status === "approved"
      ? {
          status,
          since: new Date(Date.now() - RECENT_DAYS * 864e5).toISOString(),
        }
      : { status },
  );
  const canReview = me.role === "admin" || me.role === "supervisor";

  return (
    <>
      <div className="mb-3 flex items-center gap-2.5 font-mono text-xs tracking-[0.1em] text-ink-muted uppercase">
        <Link href="/orders" className="font-medium text-flame">
          Orders
        </Link>
        <span>/</span>
        <span>Order Forms</span>
      </div>
      <PageHead
        title="Order Forms"
        sub={
          status === "pending_review"
            ? `${forms.length} form${forms.length === 1 ? "" : "s"} waiting for review, oldest first.`
            : `${forms.length} form${forms.length === 1 ? "" : "s"} approved in the last ${RECENT_DAYS} days.`
        }
      />

      <div className="mb-[22px] flex flex-wrap items-center gap-2.5">
        <Link
          href="/orders/forms"
          className="fchip"
          aria-current={status === "pending_review"}
        >
          Needs Review
        </Link>
        <Link
          href="/orders/forms?status=approved"
          className="fchip"
          aria-current={status === "approved"}
        >
          Approved
        </Link>
        {!emailConfigured() && (
          <span className="ml-auto text-[13px] text-ink-muted">
            Email to the review team isn&apos;t set up yet — check this page for
            new forms.
          </span>
        )}
      </div>

      <div className="rounded-md border border-mortar bg-paper shadow-card">
        <FormList
          forms={forms}
          canReview={canReview}
          empty={
            status === "pending_review"
              ? "Nothing waiting for review."
              : "No forms approved in that period."
          }
        />
      </div>
      <p className="mt-4 text-[13.5px] text-ink-muted">
        Approving records the review. Send the PDF to the supplier as usual.
        Regenerate rebuilds the form from the orders&apos; current details as a
        new version and puts it back in review.
      </p>
    </>
  );
}
