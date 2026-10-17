import { redirect } from "next/navigation";

// Old and shared links land on the contact form on the home page.
export default function RequestInfoPage() {
  redirect("/#contact");
}
