import type { Metadata } from "next";
import { ComingSoon, PageHead } from "@/components/shell/page-bits";

export const metadata: Metadata = { title: "Builders — Leander 3T" };

export default function Page() {
  return (
    <>
      <PageHead title="Builders" />
      <ComingSoon
        milestone="M7"
        what="Manage builders and their construction managers."
      />
    </>
  );
}
