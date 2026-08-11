import type { Route } from "next";
import { CAP } from "@/lib/capabilities/keys";
import { resolveRoute } from "@/lib/routes/capability-routes";
import type { UserRole, UserStatus } from "@/types/database";

/**
 * The address the Check-in entry draws, declared here and **verified against the
 * map**.
 *
 * ── What stood here, and why it is gone rather than widened ──────────────────
 *
 * Phase 34 read this address out of `CAPABILITY_ROUTES` through a constant
 * annotated with a **one-element tuple**, and said so in as many words: *"the
 * type annotation is the guard, and it is not decoration … binding
 * `door.operate` to a second address becomes a build error here — naming this
 * file — instead of a silent `[0]` that keeps drawing the first one. There is
 * exactly one door."*
 *
 * **Phase 39 is the phase that error was waiting for.** STAFF-04 gives the door
 * a second address, so the stop has done its job and is **spent**, not
 * defeated. What replaces it is a guard of the same strength asking a better
 * question: the tuple was an **arity** guard standing in for a **meaning** one,
 * and the meaning is now checked directly — *does the map bind the address this
 * file draws to the door's capability?*
 *
 * Two lazier repairs were available and are refused, with their reasons, so
 * that neither is proposed again:
 *
 *   · `readonly [Route, Route]` — a guard that no longer says anything true. It
 *     would fire on a *third* address, which nothing is planning, and stay
 *     silent on the failure that matters: the two addresses being bound to the
 *     wrong key.
 *   · `readonly Route[]` with an index read at position zero — this
 *     reintroduces precisely the *silent `[0]`* the original docblock was
 *     written to prevent, drawing whichever address happens to be declared
 *     first.
 *
 * ── `/door` is drawn deliberately, and the choice is not cosmetic ────────────
 *
 * It is the canonical address (D-39-01), and every device that follows this nav
 * thereafter warms the `/door` runtime-cache entry rather than the old one —
 * which is what success criterion 2 of this phase needs. `/admin/scanner` keeps
 * serving the same surface permanently and as a real page (D-39-02); it is
 * simply not what the nav points at.
 *
 * ── The throw below is a BUILD failure, not a first-request one ──────────────
 *
 * This module is imported by `MobileNav` and is therefore evaluated while pages
 * are prerendered — unlike the middleware's own door assertion, which is
 * module-load code in a middleware bundle and fires on the first request after
 * deploy. And its transitive closure reaches **no server module** (`keys.ts`
 * imports nothing; `capability-routes.ts` imports `keys.ts` and `next`), which
 * is D-34-10 and must not be broken: this file is read from a `"use client"`
 * navigation.
 */
const DOOR_HREF: Route = "/door";

// Two failures, two sentences — the `staff-tabs.ts` shape. An address nobody
// bound and an address bound to the wrong key are different mistakes with
// different repairs, and one message covering both would be the collapsed-catch
// pattern this project has already paid for once.
{
  const doorBinding = resolveRoute(DOOR_HREF);

  if (doorBinding === null) {
    throw new Error(
      `roles: the Check-in entry points at "${DOOR_HREF}", which no entry of ` +
        `CAPABILITY_ROUTES binds. Bind the address in the map, or change the ` +
        `entry — a drawn entry with no server-side rule is a promise nothing keeps.`
    );
  }

  if (doorBinding.key !== CAP.DOOR_OPERATE) {
    throw new Error(
      `roles: the Check-in entry points at "${DOOR_HREF}" expecting ` +
        `"${CAP.DOOR_OPERATE}", but CAPABILITY_ROUTES binds that address to ` +
        `"${doorBinding.key}" (pattern "${doorBinding.pattern}"). The map is the ` +
        `source; correct the map or the entry, never this comparison.`
    );
  }
}

// Re-export types for convenience
export type { UserRole, UserStatus };

// Role constants
export const ROLES = {
  MASTER: "master",
  ORGANIZER: "organizer",
  // The fourth role (phase 43, D-01). It grants exactly one thing — entry to a
  // night through the membership card, permanently — and no work permission.
  // Work permissions come from Phase 35's per-night assignment and expire with
  // the night (D-03).
  STAFF: "staff",
  MEMBER: "member",
} as const;

// Status constants
export const STATUSES = {
  PENDING: "pending",
  APPROVED: "approved",
  REJECTED: "rejected",
} as const;

// Navigation item shape
export interface NavItem {
  /**
   * Typed as `Route` rather than `string` by plan 34-01 — form 1, the
   * `NavItem<Route>[]` shape the Next.js docs give. `MobileNav` hands this
   * straight to `<Link>`, so without the type here a nav entry could point at
   * an address that does not exist and nothing would say so until a member
   * tapped it.
   */
  href: Route;
  label: string;
  icon: string;
  /** Minimum roles required (null = visible to everyone including unauthenticated) */
  roles: UserRole[] | null;
  /** Required status (null = any status, including unauthenticated) */
  requireApproved: boolean;
  /** Requires authentication */
  requireAuth: boolean;
  /** Hide this item when user is authenticated (e.g. Home tab for guests only) */
  hideWhenAuth: boolean;
}

// Full navigation items list with role/status requirements
const NAV_ITEMS: NavItem[] = [
  {
    href: "/",
    label: "Home",
    icon: "home",
    roles: null,
    requireApproved: false,
    requireAuth: false,
    hideWhenAuth: true,
  },
  {
    href: "/events",
    label: "Events",
    icon: "calendar",
    roles: null,
    requireApproved: false,
    requireAuth: false,
    hideWhenAuth: false,
  },
  {
    href: "/gallery",
    label: "Gallery",
    icon: "image",
    roles: null,
    requireApproved: true,
    requireAuth: false,
    hideWhenAuth: false,
  },
  {
    // `roles` stays `["master", "organizer"]` after the fourth role landed, and
    // that is CORRECT AS-IS rather than an omission. D-02 refuses
    // `door.operate` to `staff`, so the Check-in tab must not appear for it;
    // and the middleware refuses the door's address independently, which is what
    // actually protects the route — hiding a nav item is not protecting it
    // (`access-gating.md`, gate *coerenza navigazione/permessi*). Adding
    // `"staff"` here would show a tab that leads to a redirect, which is the
    // worst of both: a promise at the door that the server then breaks.
    //
    // ── The divergence that remains open, stated rather than implied
    //
    // This entry is filtered by ROLE and by `requireApproved: true`. The
    // middleware asks `door.operate`, and `door.operate` is granted with
    // `requires_approved = false` **deliberately** (D-06 of Phase 43: a pending
    // organizer must not be refused in front of a queue). So the two do not
    // agree in one cell: **a `pending` organizer is admitted by the server and
    // shown no Check-in tab.**
    //
    // That is the SAFE direction of the two — a hidden entry the server would
    // have allowed, rather than a drawn entry the server refuses — which is why
    // it is left open rather than patched here. Closing it means giving this
    // function the capability set, and this function serves `MobileNav`, which
    // is mounted on 44 pages including the door's own. Editing the door's page
    // is what this phase does not do. **Owner: Phase 39**, together with
    // STAFF-04, which moves this address anyway.
    //
    // Until then the gap has a shape and a size: one role, one status, one tab.
    // It is written down because a divergence closed silently and a divergence
    // never noticed leave the same trace, which is none.
    href: DOOR_HREF,
    label: "Check-in",
    icon: "qrcode",
    roles: ["master", "organizer"],
    requireApproved: true,
    requireAuth: true,
    hideWhenAuth: false,
  },
  {
    href: "/dashboard",
    label: "Account",
    icon: "user",
    roles: null,
    requireApproved: false,
    requireAuth: true,
    hideWhenAuth: false,
  },
];

/**
 * Filter navigation items based on user role and status.
 *
 * Logic:
 * - Unauthenticated (role=null): Home, Events, Gallery (3 tabs)
 * - Pending/rejected member: Events, Account (2 tabs -- Gallery hidden)
 * - Approved member: Events, Gallery, Account (3 tabs)
 * - Organizer (approved): Events, Gallery, Check-in, Account (4 tabs)
 * - Master (approved): Events, Gallery, Check-in, Account (4 tabs)
 * - Staff (always approved, see D-04): Events, Gallery, Account (3 tabs)
 *
 * The staff line needs no code: the three tabs it sees come from the
 * `roles: null` entries, and Check-in is excluded by the role restriction that
 * was already there. That is exactly D-01 — the role is a way back in through
 * the membership card, not a back office.
 */
export function getVisibleNavItems(
  role: UserRole | null,
  status: UserStatus | null
): NavItem[] {
  const isAuthenticated = role !== null;
  const isApproved = status === "approved";

  return NAV_ITEMS.filter((item) => {
    // Hide guest-only items from authenticated users
    if (item.hideWhenAuth && isAuthenticated) {
      return false;
    }

    // Check authentication requirement
    if (item.requireAuth && !isAuthenticated) {
      return false;
    }

    // Check approval requirement
    // Gallery & Check-in: visible to unauthenticated users AND approved members, but NOT pending/rejected
    if (item.requireApproved) {
      if (isAuthenticated && !isApproved) {
        return false;
      }
    }

    // Check role restriction
    if (item.roles !== null) {
      if (!role || !item.roles.includes(role)) {
        return false;
      }
    }

    return true;
  });
}
