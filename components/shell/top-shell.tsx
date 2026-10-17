import Image from "next/image";
import Link from "next/link";
import { ROLE_LABEL, initials } from "@/lib/auth/roles";
import type { SessionProfile } from "@/lib/auth/session";
import { SignOutButton } from "./app-shell";

// Dark top bar used by the builder portal and the crew manager screens
// (mockup: portal-top). No sidebar: these people see one area of the app.
export function TopShell({
  profile,
  home,
  label,
  sublabel,
  context,
  children,
}: {
  profile: SessionProfile;
  home: string;
  label: string;
  sublabel: string;
  context?: string | null;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-50 border-b-[3px] bg-charcoal text-limestone [border-image:var(--grad-fire)_1]">
        <div className="mx-auto flex max-w-[1140px] items-center gap-4 px-4 py-3 md:px-6">
          <Link href={home} className="flex items-center gap-4">
            <Image
              src="/brand/leander-3t-logo.png"
              alt="Leander 3T"
              width={63}
              height={42}
              className="h-[42px] w-auto"
            />
            <span className="font-display text-xl font-bold tracking-[0.05em] uppercase max-sm:hidden">
              {label}
              <small className="mt-0.5 block font-mono text-[9.5px] tracking-[0.22em] text-[#b0a494]">
                {sublabel}
              </small>
            </span>
          </Link>
          <div className="ml-auto flex items-center gap-3">
            <Link href="/profile" className="flex items-center gap-3">
              <span className="text-right max-sm:hidden">
                <span className="block text-sm font-bold">
                  {profile.fullName ?? profile.email}
                </span>
                <span className="block font-mono text-[10.5px] tracking-[0.1em] text-[#b0a494] uppercase">
                  {context ?? ROLE_LABEL[profile.role]}
                </span>
              </span>
              <span className="grid size-9 flex-none place-items-center rounded-full bg-fire text-sm font-extrabold text-[#20130a]">
                {initials(profile.fullName, profile.email)}
              </span>
            </Link>
            <SignOutButton label />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-[1140px] px-4 pt-6 pb-[60px] md:px-6 md:pt-9 md:pb-[90px]">
        {children}
      </main>
    </div>
  );
}
