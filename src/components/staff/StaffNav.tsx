"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { UserRole } from "@/types/database";

interface StaffNavProps {
  role: UserRole | null;
  context: "admin" | "organizer";
}

const STAFF_TABS = [
  { href: "events", label: "Events", contexts: ["admin", "organizer"] },
  { href: "members", label: "Members", contexts: ["admin", "organizer"] },
  { href: "artists", label: "Artists", contexts: ["admin", "organizer"] },
  { href: "venues", label: "Venues", contexts: ["admin", "organizer"] },
  { href: "newsletter", label: "Newsletter", contexts: ["admin"] },
  {
    href: "finance",
    label: "Finance",
    contexts: ["admin"],
    roles: ["master"] as UserRole[],
  },
  {
    href: "analytics",
    label: "Analytics",
    contexts: ["admin"],
    roles: ["master"] as UserRole[],
  },
];

export default function StaffNav({ role, context }: StaffNavProps) {
  const pathname = usePathname();
  const basePath = context === "admin" ? "/admin" : "/organizer";

  const visibleTabs = STAFF_TABS.filter((tab) => {
    if (!tab.contexts.includes(context)) return false;
    if (tab.roles && (!role || !tab.roles.includes(role))) return false;
    return true;
  });

  return (
    <>
      <style>{`
        .admin-nav-scroll { -ms-overflow-style: none; scrollbar-width: none; -webkit-overflow-scrolling: touch; }
        .admin-nav-scroll::-webkit-scrollbar { display: none; }
      `}</style>
      <div className="admin-nav-scroll mb-6 overflow-x-auto">
        <div className="flex gap-2 px-6" style={{ width: "max-content" }}>
          {visibleTabs.map((tab) => {
            const href = `${basePath}/${tab.href}`;
            const isActive = pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={`whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-medium transition-all active:scale-95 active:opacity-80 ${
                  isActive
                    ? "bg-accent text-white"
                    : "bg-card border border-card-border text-muted hover:text-foreground"
                }`}
              >
                {tab.label}
              </Link>
            );
          })}
        </div>
      </div>
    </>
  );
}
