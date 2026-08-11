"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { UserRole, UserStatus } from "@/types/database";
import { getVisibleNavItems } from "@/lib/rbac/roles";
import type { CapabilityKey } from "@/lib/capabilities/keys";

/**
 * The bottom navigation, and what it may and may not import.
 *
 * This is a `"use client"` component, so **it cannot import the DAL**:
 * `@/lib/supabase/server` calls `cookies()`, which throws outside a Server
 * Component. The capability set therefore arrives as a **prop**, in the
 * serialisable `CapabilityKey[]` shape `StaffNav` has taken since plan 34-04
 * (`(work)/layout.tsx`, `<StaffNav capabilities={[...capabilities]} />`). One
 * shape for both navs, not two.
 *
 * `@/lib/capabilities/keys` is safe to import here and that is not an accident:
 * it imports nothing at all (D-34-10), which is what lets a single filter serve
 * both sides of the client boundary.
 *
 * ── A known consequence of D-39-01, recorded so it is not read as a defect ────
 *
 * `isActive` below is `pathname.startsWith(item.href)`, and the Check-in entry's
 * `href` is now `/door` (D-39-01). So the door's tab highlights at `/door` and
 * **not** at `/admin/scanner` — the old address keeps serving the same surface
 * permanently and as a real page (D-39-02), and somebody who reaches it directly
 * sees no tab highlighted. It is one line to revisit if the door pass reports it
 * as a nuisance; it is not a broken link and it refuses nobody.
 */
interface MobileNavProps {
  role: UserRole | null;
  status: UserStatus | null;
  /** Held by role. Empty for an anonymous visitor — `ANONYMOUS_CONTEXT`. */
  capabilities?: readonly CapabilityKey[];
  /**
   * Held by a live per-night assignment, or `null` when the payload did not
   * carry the key. `null` is **not** flattened to `[]` on the way in: absent and
   * empty are different facts (`capabilities/server.ts`).
   */
  liveAssignmentCapabilities?: readonly string[] | null;
}

const icons: Record<string, React.ReactNode> = {
  home: (
    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
    </svg>
  ),
  calendar: (
    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
    </svg>
  ),
  image: (
    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0 0 22.5 18.75V5.25A2.25 2.25 0 0 0 20.25 3H3.75A2.25 2.25 0 0 0 1.5 5.25v13.5A2.25 2.25 0 0 0 3.75 21Z" />
    </svg>
  ),
  qrcode: (
    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0 1 3.75 9.375v-4.5ZM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 0 1-1.125-1.125v-4.5ZM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0 1 13.5 9.375v-4.5Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 6.75h.75v.75h-.75v-.75ZM6.75 16.5h.75v.75h-.75v-.75ZM16.5 6.75h.75v.75h-.75v-.75ZM13.5 13.5h.75v.75h-.75v-.75ZM13.5 19.5h.75v.75h-.75v-.75ZM19.5 13.5h.75v.75h-.75v-.75ZM19.5 19.5h.75v.75h-.75v-.75ZM16.5 16.5h.75v.75h-.75v-.75Z" />
    </svg>
  ),
  user: (
    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
    </svg>
  ),
};

export default function MobileNav({
  role,
  status,
  capabilities,
  liveAssignmentCapabilities,
}: MobileNavProps) {
  const pathname = usePathname();
  const visibleItems = getVisibleNavItems(
    role,
    status,
    capabilities,
    liveAssignmentCapabilities
  );

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-card-border bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-lg items-center justify-around px-4 pb-[env(safe-area-inset-bottom)] pt-2">
        {visibleItems.map((item) => {
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : item.href === "/dashboard"
                ? pathname === "/dashboard" || pathname.startsWith("/dashboard")
                : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-1 px-3 py-2 text-xs transition-all active:scale-95 active:opacity-80 ${
                isActive ? "text-accent" : "text-muted"
              }`}
            >
              {icons[item.icon]}
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
