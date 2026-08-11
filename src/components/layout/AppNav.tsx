"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import type { UserRole, UserStatus } from "@/types/database";
import { getVisibleNavItems } from "@/lib/rbac/roles";
import type { CapabilityKey } from "@/lib/capabilities/keys";
import { FOCUS_RING } from "@/components/ui/Button";
import { SectionHeading } from "@/components/ui/Typography";

/**
 * The product navigation, in both tiers.
 *
 * D-41-02: **below 768 px it is a bar at the bottom edge; from 768 px up it is a
 * persistent column at the leading edge.** A bottom bar still fixed at 1920 px
 * is not a choice, it is a phone app stretched.
 *
 * ── Width changes layout. It never changes membership. ───────────────────────
 *
 * This is contract, not style, and it is carried here verbatim from
 * `StaffNav.tsx:25-32` because this component is the second author of the same
 * rule and a second author is how a rule drifts.
 *
 * The entry list is resolved **on the server** by `getAccessContext()` and
 * arrives as serialisable capability keys. This is a `"use client"` component:
 * it resolves nothing, it must never import the resolver or the guard helpers
 * under `src/lib/capabilities/`, and **it must not filter, slice, truncate or
 * hide an entry at any width.** A tab dropped in JavaScript to make a column fit
 * is a capability decision taken in a place the viewer can edit.
 *
 * And hiding a nav item was never protection in the first place: the refusal is
 * the middleware's, and the boundary on the data is the RLS policy in the
 * migrations (`access-gating.md`, gate *coerenza navigazione/permessi*).
 *
 * ── It does not collapse ─────────────────────────────────────────────────────
 *
 * No toggle, no drawer, no hamburger, no disclosure. RESP-04 forbids hiding
 * navigation behind a menu and a collapse control is a menu with one extra
 * step. There is no menu in this product today and this plan does not introduce
 * the first one.
 *
 * ── The 5rem is a declared value, not a measurement ──────────────────────────
 *
 * The bar's row is `h-20` — 5 rem — and the safe-area inset sits **outside** it
 * on the nav element, so the bar's total height is exactly
 * `calc(5rem + env(safe-area-inset-bottom))`. That is the literal
 * `--nav-inset-block-end` is built from in `globals.css`, and four files depend
 * on it staying true (the page shell's bottom padding, the toast's offset, the
 * dialog sheet's bottom padding, and the two-declaration variable itself).
 * **Re-deriving the height from this markup instead of declaring it would
 * silently invalidate them.** If this row's height changes, that variable
 * changes in the same commit.
 *
 * ── Active state in three channels ───────────────────────────────────────────
 *
 * An `--accent` label, a 2 px indicator (an underline in the bar, a leading edge
 * in the column), and **`aria-current="page"`**. Colour is never the only
 * channel — `aria-current` appears 5 times in the whole tree today and in no
 * navigation at all.
 *
 * ── A known consequence of D-39-01, carried over rather than rediscovered ────
 *
 * `isActive` is `pathname.startsWith(item.href)`, and the Check-in entry's
 * `href` is `/door` (D-39-01). The door's tab highlights at `/door` and **not**
 * at `/admin/scanner` — the old address keeps serving the same surface
 * permanently and as a real page (D-39-02), and somebody who reaches it directly
 * sees no tab highlighted. It is one line to revisit if the door pass reports it
 * as a nuisance; it is not a broken link and it refuses nobody.
 */
export interface AppNavProps {
  role: UserRole | null;
  status: UserStatus | null;
  /**
   * Held by role. Empty for an anonymous visitor — `ANONYMOUS_CONTEXT`.
   *
   * **Required, deliberately.** All 13 mount sites pass it, so a fourteenth
   * that forgets is a build error naming the file rather than a surface that
   * compiles, renders, and draws a plausible but wrong navigation — which this
   * repository has no error tracking to notice.
   */
  capabilities: readonly CapabilityKey[];
  /**
   * Held by a live per-night assignment, or `null` when the payload did not
   * carry the key. `null` is **not** flattened to `[]` on the way in: absent and
   * empty are different facts (`capabilities/server.ts`).
   */
  liveAssignmentCapabilities: readonly string[] | null;
  /**
   * `"responsive"` — the bar below 768 px, the column at and above it.
   * `"phone"` — the bar at every width, which is what the `MobileNav.tsx`
   * wrapper beside this file renders, and why that file still exists
   * (D-41-21).
   */
  form?: "responsive" | "phone";
  /**
   * The work-surface tabs, rendered inside the column under a `Work` heading
   * from 768 px up. Rendered nowhere on the phone form — the strip is in flow
   * above the page's content there, drawn by the work layout.
   */
  workNav?: ReactNode;
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

/**
 * The bar, at both forms. The safe-area inset sits on this element and the row
 * inside it is exactly 5 rem — see the docblock.
 *
 * The column's ground is `--ground`: it is page furniture, not content. It
 * cannot be told from the page by its ground at any value (1.05 : 1 against
 * `--surface`, 1.14 : 1 against `--raised`), so the separation is the trailing
 * line — `border-e border-line`, 1.29 : 1, decorative and correct as such,
 * because the column's *content* says where it is.
 */
const NAV_PHONE =
  "fixed inset-x-0 bottom-0 z-50 border-t border-line bg-ground/80 backdrop-blur-xl " +
  "pb-[env(safe-area-inset-bottom)]";

const NAV_RESPONSIVE =
  `${NAV_PHONE} md:fixed md:inset-y-0 md:start-0 md:end-auto md:z-50 md:w-56 ` +
  "md:border-e md:border-t-0 md:border-line md:pb-0";

const ROW_PHONE = "mx-auto flex h-20 max-w-lg items-stretch";

const ROW_RESPONSIVE =
  `${ROW_PHONE} md:h-full md:max-w-none md:flex-col md:items-stretch md:gap-1 ` +
  "md:overflow-y-auto md:px-4 md:py-6";

/**
 * The focus expression is imported from the ladder, never respelled (§5.4).
 *
 * The incumbent bar had **none**: a keyboard user tabbing along the navigation
 * saw nothing move. That is not a style gap, it is the indicator WCAG 2.4.7
 * requires, and it is added here rather than deferred to the surface that
 * notices — nobody was going to notice, because this repository has no error
 * tracking and a missing focus ring raises nothing.
 */
const ENTRY_PHONE =
  "relative flex min-h-11 flex-1 flex-col items-center justify-center gap-1 " +
  `text-xs transition-all active:scale-95 active:opacity-80 ${FOCUS_RING}`;

const ENTRY_RESPONSIVE =
  `${ENTRY_PHONE} md:min-h-11 md:flex-none md:flex-row md:items-center ` +
  "md:justify-start md:gap-3 md:rounded-xl md:px-4 md:text-sm";

/** 2 px. An underline in the bar; a leading edge in the column. */
const INDICATOR_PHONE = "absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-accent";

const INDICATOR_RESPONSIVE =
  `${INDICATOR_PHONE} md:inset-x-auto md:inset-y-1 md:bottom-auto md:start-0 ` +
  "md:h-auto md:w-0.5";

export default function AppNav({
  role,
  status,
  capabilities,
  liveAssignmentCapabilities,
  form = "responsive",
  workNav,
}: AppNavProps) {
  const pathname = usePathname();
  const visibleItems = getVisibleNavItems(
    role,
    status,
    capabilities,
    liveAssignmentCapabilities
  );

  const isPhone = form === "phone";

  return (
    <nav className={isPhone ? NAV_PHONE : NAV_RESPONSIVE}>
      <div className={isPhone ? ROW_PHONE : ROW_RESPONSIVE}>
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
              aria-current={isActive ? "page" : undefined}
              className={`${isPhone ? ENTRY_PHONE : ENTRY_RESPONSIVE} ${
                isActive ? "text-accent" : "text-muted"
              }`}
            >
              {isActive && (
                <span
                  aria-hidden="true"
                  className={isPhone ? INDICATOR_PHONE : INDICATOR_RESPONSIVE}
                />
              )}
              {icons[item.icon]}
              <span>{item.label}</span>
            </Link>
          );
        })}

        {/*
          The work tabs, inside the column only. `hidden md:block` and not a
          JavaScript branch: the tier is decided by CSS, so no viewport is read
          and both trees exist in the markup with one removed from the
          accessibility tree by `display` (§8.8's mechanism, G7's requirement).

          Not rendered at all on the phone form — there the strip is in flow
          above the page content, drawn by `(work)/layout.tsx`.
        */}
        {!isPhone && workNav ? (
          <div className="hidden md:mt-6 md:block">
            <SectionHeading>Work</SectionHeading>
            {workNav}
          </div>
        ) : null}
      </div>
    </nav>
  );
}
