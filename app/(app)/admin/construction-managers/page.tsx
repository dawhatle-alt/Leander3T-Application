import { redirect } from "next/navigation";

// Construction managers are managed under their builder.
export default function ConstructionManagersPage() {
  redirect("/admin/builders");
}
