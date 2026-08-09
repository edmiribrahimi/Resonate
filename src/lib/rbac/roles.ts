import type { Route } from "next";
import { CAP } from "@/lib/capabilities/keys";
import { CAPABILITY_ROUTES } from "@/lib/routes/capability-routes";
import type { UserRole, UserStatus } from "@/types/database";

/**
 * The door's address, read from the map instead of typed again here.
 *
 * It was the only route literal in this file, and it was the one that could not
 * afford to be one: Phase 39 moves the door to its own address (STAFF-04), and
 * this file must not be a second place where that address has to be remembered.
 * `CAPABILITY_ROUTES` is where the middleware reads it; this reads the same
 * entry.
 *
 * **The type annotation is the guard, and it is not decoration.** A one-element
 * tuple is asserted, so binding `door.operate` to a second address becomes a
 * build error here — naming this file — instead of a silent `[0]` that keeps
 * drawing the first one. There is exactly one door.
 */
const DOOR_BINDING: { readonly routes: readonly [Route] } =
  CAPABILITY_ROUTES[CAP.DOOR_OPERATE];

const DOOR_HREF: Route = DOOR_BINDING.routes[0];

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
