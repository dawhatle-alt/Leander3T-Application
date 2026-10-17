import type { Metadata } from "next";
import { ComingSoon, PageHead } from "@/components/shell/page-bits";

export const metadata: Metadata = { title: "Jobs — Leander 3T" };

export default function Page() {
  return (
    <>
      <PageHead title="Jobs" />
      <ComingSoon
        milestone="M4"
        what="The job list, job detail and photo uploads are the next milestone."
      />
    </>
  );
}
