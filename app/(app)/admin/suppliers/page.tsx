import type { Metadata } from "next";
import { ComingSoon, PageHead } from "@/components/shell/page-bits";

export const metadata: Metadata = { title: "Suppliers — Leander 3T" };

export default function Page() {
  return (
    <>
      <PageHead title="Suppliers" />
      <ComingSoon
        milestone="M7"
        what="Manage suppliers and what each one supplies."
      />
    </>
  );
}
