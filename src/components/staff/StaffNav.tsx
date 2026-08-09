"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Route } from "next";
import type { UserRole } from "@/types/database";

interface StaffNavProps {
  role: UserRole | null;
  context: "admin" | "organizer";
}

/**
 * Form 1 of plan 34-01 — the address is DATA and it carries its type.
 *
 * The previous shape was a bare segment (`"events"`) concatenated with a base
 * resolved from `context`, plus a `contexts` array saying where the tab
 * exists. `typedRoutes` cannot check a concatenation whose base is a `string`,
 * and it cannot know that the `contexts` filter is what keeps
 * `/organizer/finance` — an address that does not exist — from ever being
 * built. Writing both addresses out makes the absence explicit as `null`, and
 * every address that IS written is now checked against the generated union.
 *
 * The visible behaviour is unchanged: a tab with `organizer: null` is exactly
 * a tab whose `contexts` was `["admin"]`.
 *
 * The `context` prop itself is STAFF-03's to remove, in a later plan of this
 * phase. This task only stops the addresses from being strings.
 */
interface StaffTab {
  label: string;
  admin: Route;
  /** `null` when the tab has no address in the organizer tree. */
  organizer: Route | null;
  /** Role restriction, unchanged. */
  roles?: UserRole[];
}

const STAFF_TABS: StaffTab[] = [
  { label: "Events", admin: "/admin/events", organizer: "/organizer/events" },
  { label: "Members", admin: "/admin/members", organizer: "/organizer/members" },
  { label: "Artists", admin: "/admin/artists", organizer: "/organizer/artists" },
  { label: "Venues", admin: "/admin/venues", organizer: "/organizer/venues" },
  { label: "Newsletter", admin: "/admin/newsletter", organizer: null },
  {
    label: "Finance",
    admin: "/admin/finance",
    organizer: null,
    roles: ["master"],
  },
  {
    label: "Analytics",
    admin: "/admin/analytics",
    organizer: null,
    roles: ["master"],
  },
];

export default function StaffNav({ role, context }: StaffNavProps) {
  const pathname = usePathname();

  // `flatMap` rather than `map(...).filter(...)`: it narrows `Route | null` to
  // `Route` by construction, with no type predicate to keep in step with the
  // shape above.
  const visibleTabs = STAFF_TABS.flatMap((tab) => {
    const href = context === "admin" ? tab.admin : tab.organizer;
    if (href === null) return [];
    if (tab.roles && (!role || !tab.roles.includes(role))) return [];
    return [{ label: tab.label, href }];
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
            const href = tab.href;
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
