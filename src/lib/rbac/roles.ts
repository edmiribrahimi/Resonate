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
  },
  {
    href: "/events",
    label: "Events",
    icon: "calendar",
    roles: null,
    requireApproved: false,
    requireAuth: false,
  },
  {
    href: "/gallery",
    label: "Gallery",
    icon: "image",
    roles: null,
    requireApproved: true,
    requireAuth: false,
  },
  {
    href: "/dashboard",
    label: "Account",
    icon: "user",
    roles: null,
    requireApproved: false,
    requireAuth: true,
  },
  {
    href: "/admin/events",
    label: "Admin",
    icon: "shield",
    roles: ["master"],
    requireApproved: true,
    requireAuth: true,
  },
  {
    href: "/organizer/events",
    label: "Organizer",
    icon: "users",
    roles: ["organizer"],
    requireApproved: true,
    requireAuth: true,
  },
];

/**
 * Filter navigation items based on user role and status.
 *
 * Logic:
 * - Unauthenticated (role=null): Home, Events, Gallery only
 * - Pending/rejected: Home, Events, Dashboard only (no Gallery)
 * - Approved member: Home, Events, Gallery, Members (dashboard)
 * - Organizer (approved): same as member + Organizer item
 * - Master (approved): same as member + Admin item
 */
export function getVisibleNavItems(
  role: UserRole | null,
  status: UserStatus | null
): NavItem[] {
  const isAuthenticated = role !== null;
  const isApproved = status === "approved";

  return NAV_ITEMS.filter((item) => {
    // Hide Home for logged-in users (redirects to dashboard anyway)
    if (item.href === "/" && isAuthenticated) {
      return false;
    }

    // Check authentication requirement
    if (item.requireAuth && !isAuthenticated) {
      return false;
    }

    // Check approval requirement
    // Gallery: visible to unauthenticated users AND approved members, but NOT pending/rejected
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
