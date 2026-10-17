import type { Database } from "@/lib/supabase/types";

export type AppRole = Database["public"]["Enums"]["app_role"];

export const ROLES: readonly AppRole[] = [
  "admin",
  "supervisor",
  "employee",
  "crew_manager",
  "builder",
];

// What the client calls each role, as shown in the app.
export const ROLE_LABEL: Record<AppRole, string> = {
  admin: "Administration",
  supervisor: "Supervisor",
  employee: "Employee",
  crew_manager: "Crew Manager",
  builder: "Builder",
};

// Where each role lands after signing in.
export function homeFor(role: AppRole): string {
  switch (role) {
    case "crew_manager":
      return "/crew";
    case "builder":
      return "/portal";
    default:
      return "/dashboard";
  }
}

const TEAM: AppRole[] = ["admin", "supervisor", "employee"];

// Signed-in areas and who may open them. Checked in middleware on every
// request; the database enforces the same lines with row-level security.
const AREAS: { prefix: string; roles: AppRole[] }[] = [
  { prefix: "/admin", roles: ["admin"] },
  { prefix: "/dashboard", roles: TEAM },
  { prefix: "/jobs", roles: TEAM },
  { prefix: "/orders", roles: TEAM },
  { prefix: "/team", roles: TEAM },
  { prefix: "/crew", roles: ["crew_manager"] },
  // Admins may open the portal to preview what a builder sees.
  { prefix: "/portal", roles: ["builder", "admin"] },
  { prefix: "/profile", roles: [...ROLES] },
  { prefix: "/update-password", roles: [...ROLES] },
];

function matches(pathname: string, prefix: string) {
  return pathname === prefix || pathname.startsWith(prefix + "/");
}

/** Signed-in area for this path, or null when the path is public. */
export function areaFor(pathname: string) {
  return AREAS.find((a) => matches(pathname, a.prefix)) ?? null;
}

export function canOpen(role: AppRole, pathname: string): boolean {
  const area = areaFor(pathname);
  return !area || area.roles.includes(role);
}

/** Only same-site paths are allowed as a post-sign-in destination. */
export function safeNext(next: string | null | undefined): string | null {
  if (!next || !next.startsWith("/") || next.startsWith("//")) return null;
  if (next.startsWith("/auth/") || next.startsWith("/sign-in")) return null;
  return next;
}

export function initials(
  name: string | null | undefined,
  email?: string | null,
) {
  const source = (name || email || "?").trim();
  const parts = source.split(/[\s@.]+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "?";
}

export function firstName(
  name: string | null | undefined,
  email?: string | null,
) {
  return (name || email || "").split(/[\s@]/)[0] ?? "";
}
