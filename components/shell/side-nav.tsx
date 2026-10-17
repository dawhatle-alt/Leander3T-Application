"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Building2,
  ClipboardList,
  HardHat,
  House,
  Inbox,
  LayoutDashboard,
  MapPin,
  Palette,
  Truck,
  Users,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

const ICONS: Record<string, LucideIcon> = {
  dashboard: LayoutDashboard,
  jobs: House,
  orders: ClipboardList,
  builders: Building2,
  suppliers: Truck,
  crews: HardHat,
  colors: Palette,
  blocks: MapPin,
  requests: Inbox,
  team: Users,
};

export type NavItem = { href: string; label: string; icon: keyof typeof ICONS };

export function SideNav({ items }: { items: NavItem[] }) {
  const pathname = usePathname();
  return (
    <nav className="contents" aria-label="Main">
      {items.map((item) => {
        const Icon = ICONS[item.icon] ?? House;
        const active =
          pathname === item.href || pathname.startsWith(item.href + "/");
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center gap-3 rounded-lg border-transparent px-3 py-[11px] text-[14.5px] font-semibold whitespace-nowrap text-[#b6aa9b] transition-all hover:bg-limestone/6 hover:text-limestone",
              "max-md:border-b-[3px] md:border-l-[3px]",
              active &&
                "border-amber bg-amber/12 text-amber hover:bg-amber/12 hover:text-amber",
            )}
          >
            <Icon
              className="size-[18px] flex-none opacity-80"
              strokeWidth={2}
              aria-hidden
            />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
