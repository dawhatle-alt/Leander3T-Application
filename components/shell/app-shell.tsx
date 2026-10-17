import Image from "next/image";
import Link from "next/link";
import { LogOut } from "lucide-react";
import { ROLE_LABEL, firstName, initials } from "@/lib/auth/roles";
import type { SessionProfile } from "@/lib/auth/session";
import { SideNav, type NavItem } from "./side-nav";

// Team app shell from the mockup: charcoal sidebar with the logo, section
// links and the signed-in person at the bottom. On phones the sidebar
// becomes a scrolling bar across the top.
export function AppShell({
  profile,
  children,
}: {
  profile: SessionProfile;
  children: React.ReactNode;
}) {
  const items: NavItem[] = [
    { href: "/dashboard", label: "Dashboard", icon: "dashboard" },
    { href: "/jobs", label: "Jobs", icon: "jobs" },
    { href: "/orders", label: "Orders", icon: "orders" },
    ...(profile.role === "admin"
      ? ([
          { href: "/admin/builders", label: "Builders", icon: "builders" },
          { href: "/admin/suppliers", label: "Suppliers", icon: "suppliers" },
        ] satisfies NavItem[])
      : []),
    { href: "/team", label: "Team", icon: "team" },
  ];

  return (
    <div className="grid min-h-screen md:grid-cols-[248px_1fr]">
      <aside className="flex items-center gap-1.5 overflow-x-auto bg-charcoal px-4 py-3 text-[#cfc6ba] md:sticky md:top-0 md:h-screen md:flex-col md:items-stretch md:overflow-visible md:px-4 md:py-[22px]">
        <Link
          href="/dashboard"
          className="flex flex-none items-center gap-3 pr-3.5 md:mb-3.5 md:border-b md:border-limestone/9 md:px-2.5 md:pt-1.5 md:pb-5"
        >
          <Image
            src="/brand/leander-3t-logo.png"
            alt="Leander 3T"
            width={66}
            height={44}
            className="h-11 w-auto"
          />
          <span className="font-display text-[19px] leading-none font-bold tracking-[0.04em] text-limestone uppercase max-md:hidden">
            Leander 3T
            <small className="mt-1 block font-mono text-[9.5px] tracking-[0.2em] text-[#8d8175]">
              JOB SYSTEM
            </small>
          </span>
        </Link>

        <SideNav items={items} />

        <div className="mt-auto flex items-center gap-3 border-t border-limestone/9 px-3 py-3.5 max-md:hidden">
          <Link
            href="/profile"
            className="flex min-w-0 flex-1 items-center gap-3"
          >
            <span className="grid size-9 flex-none place-items-center rounded-full bg-fire text-sm font-extrabold text-[#20130a]">
              {initials(profile.fullName, profile.email)}
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-bold text-limestone">
                {firstName(profile.fullName, profile.email)}
              </span>
              <span className="block font-mono text-[10.5px] tracking-[0.12em] text-[#8d8175] uppercase">
                {ROLE_LABEL[profile.role]}
              </span>
            </span>
          </Link>
          <SignOutButton />
        </div>
        <Link
          href="/profile"
          className="ml-auto grid size-9 flex-none place-items-center rounded-full bg-fire text-sm font-extrabold text-[#20130a] md:hidden"
          aria-label="Your profile"
        >
          {initials(profile.fullName, profile.email)}
        </Link>
      </aside>
      <main className="min-w-0 px-5 pt-[26px] pb-[60px] md:px-10 md:pt-[34px] md:pb-[70px]">
        {children}
      </main>
    </div>
  );
}

export function SignOutButton({ label = false }: { label?: boolean }) {
  return (
    <form action="/auth/sign-out" method="post">
      <button
        type="submit"
        title="Sign out"
        className={
          label
            ? "inline-flex items-center rounded-[6px] border-[1.5px] border-limestone/35 px-4 py-2 text-[13.5px] font-bold text-limestone transition-colors hover:border-amber hover:text-amber"
            : "grid size-8 place-items-center rounded-md text-[#8d8175] transition-colors hover:bg-limestone/6 hover:text-amber"
        }
      >
        {label ? (
          "Sign Out"
        ) : (
          <LogOut className="size-4" aria-label="Sign out" />
        )}
      </button>
    </form>
  );
}
