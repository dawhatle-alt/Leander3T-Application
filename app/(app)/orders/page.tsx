import type { Metadata } from "next";
import { ComingSoon, PageHead } from "@/components/shell/page-bits";

export const metadata: Metadata = { title: "Orders — Leander 3T" };

export default function Page() {
  return (
    <>
      <PageHead title="Orders" />
      <ComingSoon
        milestone="M5"
        what="Every material order across jobs, by status and supplier."
      />
    </>
  );
}
