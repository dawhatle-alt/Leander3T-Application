import { UpdatePasswordForm } from "./update-password-form";

// Reached from an invite or reset link (signed in by the link), from /profile,
// or forced by middleware after an administrator set a temporary password.
export default async function UpdatePasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ required?: string }>;
}) {
  const { required } = await searchParams;
  return <UpdatePasswordForm required={required === "1"} />;
}
