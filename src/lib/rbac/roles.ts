import type { Route } from "next";
import type { UserRole, UserStatus } from "@/types/database";

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
    // and the middleware refuses `/admin/scanner` independently, which is what
    // actually protects the route — hiding a nav item is not protecting it
    // (`access-gating.md`, gate *coerenza navigazione/permessi*). Adding
    // `"staff"` here would show a tab that leads to a redirect, which is the
    // worst of both: a promise at the door that the server then breaks.
    href: "/admin/scanner",
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
