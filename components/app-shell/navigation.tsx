"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  BriefcaseBusiness,
  Building2,
  Clock3,
  UsersRound,
} from "lucide-react";
import { cn } from "@/lib/utils";

type EmployeeRole = "admin" | "employee";

type NavigationProps = {
  role: EmployeeRole;
};

const employeeItems = [
  { href: "/zeiten", label: "Zeiten", icon: Clock3 },
  { href: "/berichte", label: "Berichte", icon: BarChart3 },
];

const adminItems = [
  { href: "/projekte", label: "Projekte", icon: BriefcaseBusiness },
  { href: "/kunden", label: "Kunden", icon: Building2 },
  { href: "/mitarbeitende", label: "Mitarbeitende", icon: UsersRound },
];

function isActivePath(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function Navigation({ role }: NavigationProps) {
  const pathname = usePathname();
  const items = role === "admin" ? [...employeeItems, ...adminItems] : employeeItems;

  return (
    <nav aria-label="Hauptnavigation" className="grid gap-1">
      {items.map((item) => {
        const Icon = item.icon;
        const isActive = isActivePath(pathname, item.href);

        return (
          <Link
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "flex min-h-11 items-center gap-3 rounded-md px-3 text-sm font-medium text-muted-foreground transition hover:bg-accent hover:text-accent-foreground",
              isActive && "bg-accent text-accent-foreground",
            )}
            href={item.href}
            key={item.href}
          >
            <Icon className="size-4" aria-hidden="true" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
