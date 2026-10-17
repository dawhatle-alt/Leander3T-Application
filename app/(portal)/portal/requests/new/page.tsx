import type { Metadata } from "next";
import Link from "next/link";
import { NewJobRequestForm } from "@/components/portal/forms";
import { portalContext } from "@/lib/portal/context";

export const metadata: Metadata = { title: "New Job Request — Leander 3T" };

export default async function NewRequestPage() {
  const ctx = await portalContext();
  return (
    <div className="max-w-[860px]">
      <div className="mb-3 font-mono text-xs tracking-[0.1em] text-ink-muted uppercase">
        <Link href="/portal" className="font-medium text-flame">
          Portal
        </Link>{" "}
        /{" "}
        <Link href="/portal/requests" className="font-medium text-flame">
          Requests
        </Link>{" "}
        / New
      </div>
      <h1 className="font-display text-[34px] leading-none font-bold uppercase md:text-[40px]">
        Submit a New Job
      </h1>
      <p className="mt-2 mb-6 text-[15px] text-ink-muted">
        For {ctx.builderName}. The office reviews every request and confirms
        square footages and colors.
      </p>
      <NewJobRequestForm preview={ctx.preview} />
    </div>
  );
}
