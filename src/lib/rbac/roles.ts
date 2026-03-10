import type { UserRole, UserStatus } from "@/types/database";

// Re-export types for convenience
export type { UserRole, UserStatus };

// Role constants
export const ROLES = {
  MASTER: "master",
  ORGANIZER: "organizer",
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
  href: string;
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
