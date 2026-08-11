import type { Route } from "next";
import { CAP, type CapabilityKey } from "@/lib/capabilities/keys";
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
  /**
   * The capability that governs this entry, or `null` when no capability does.
   *
   * **Required rather than optional, and that is the whole point of the field.**
   * An optional field lets a sixth entry added two years from now forget the
   * question; a required one makes forgetting it a build error naming this file.
   * The four entries that answer `null` are answering, not abstaining — there is
   * no capability governing `/`, `/events`, `/gallery` or `/dashboard`.
   */
  capability: CapabilityKey | null;
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
    capability: null,
  },
  {
    href: "/events",
    label: "Events",
    icon: "calendar",
    roles: null,
    requireApproved: false,
    requireAuth: false,
    hideWhenAuth: false,
    capability: null,
  },
  {
    href: "/gallery",
    label: "Gallery",
    icon: "image",
    roles: null,
    requireApproved: true,
    requireAuth: false,
    hideWhenAuth: false,
    capability: null,
  },
  {
    // ── The divergence Phase 34 wrote down, and its closure — D-39-06
    //
    // **What it was.** This entry used to be filtered by a role list plus an
    // approval flag, while the middleware and the door's own guard ask
    // `door.operate` — a key granted with `requires_approved = false`
    // **deliberately** (D-06 of Phase 43: a pending organizer must not be
    // refused in front of a queue). The two disagreed in exactly one cell:
    // **an organizer in status `pending` was admitted by the server and shown
    // no Check-in tab.**
    //
    // **Why Phase 34 left it open rather than patched it.** It was the SAFE
    // direction of the two — a hidden entry the server would have allowed,
    // never a drawn entry the server refuses. Closing it meant giving this
    // function the capability set, which meant changing `MobileNav`'s props,
    // which meant editing the door's own surface: the file this project least
    // wants opened by accident. The owner assigned it here rather than to a
    // later phase, because this phase opens that file anyway
    // (`34-04-SUMMARY.md:197`, `34-VERIFICATION.md:431`).
    //
    // **How it is closed.** By filtering on **the same key the server refuses
    // on**, `CAP.DOOR_OPERATE`, instead of on role and approval. That is
    // possible because `@/lib/capabilities/keys` imports nothing (D-34-10), so
    // one filter serves both sides of the client boundary — the nav reads the
    // key from a `"use client"` component and the middleware reads it from the
    // edge, and neither had to invent its own vocabulary.
    //
    // ── The widening this carries, stated rather than absorbed
    //
    // The filter below reads the live-assignment set as well as the held one,
    // because the middleware admits the door on **role or live assignment** and
    // the page guard repeats that predicate. Without it, a member of staff
    // rostered to tonight's door — who holds `door.operate` by assignment and
    // by nothing else, `staff` being one of the six declared refusals of the
    // role — would be drawn no tab, and D-39-06 would close one half under a
    // heading that says closed.
    //
    // The cost is real and is this: `liveAssignmentCapabilities` is coarse and
    // **does not name a night** — *"wider than the real permission, always and
    // by construction"* (`capabilities/server.ts`). So somebody assigned to a
    // **different** night is drawn the tab, the middleware admits them, the
    // page admits them, and **they do not find their night in the list** (the
    // night list is filtered by assignment, plan 35-10). No refusal anywhere,
    // which is the asymmetry `checkin-offline.md` optimises for: a false
    // refusal happens in front of a queue, an extra tab does not.
    //
    // ── This is a visibility change and nothing else
    //
    // Hiding a link is not protecting a route (`access-gating.md`, gate
    // *coerenza navigazione/permessi*). The server-side control for this entry
    // is the coarse guard in `admin/scanner/DoorSurface.tsx`, mounted by both
    // of the door's addresses; the real boundary on the door's **data** is
    // `requireDoorOperator({ partyId })` in the three door Route Handlers,
    // which write with the service client and see no policy at all. **Neither
    // is touched by this phase.** Drawing this entry more honestly grants
    // nobody anything.
    href: DOOR_HREF,
    label: "Check-in",
    icon: "qrcode",
    roles: null,
    requireApproved: false,
    requireAuth: true,
    hideWhenAuth: false,
    capability: CAP.DOOR_OPERATE,
  },
  {
    href: "/dashboard",
    label: "Account",
    icon: "user",
    roles: null,
    requireApproved: false,
    requireAuth: true,
    hideWhenAuth: false,
    capability: null,
  },
];

/**
 * Filter navigation items on what the subject is, and on what the subject may
 * do.
 *
 * Outcomes, rewritten against the filter as it stands after plan 39-03:
 * - Unauthenticated: Home, Events, Gallery (3 tabs) — the capability set is
 *   empty, so Check-in is filtered out exactly as it always was
 * - Pending / rejected member: Events, Account (2 tabs — Gallery hidden)
 * - Approved member: Events, Gallery, Account (3 tabs)
 * - Organizer or master, **approved**: Events, Gallery, Check-in, Account
 * - Organizer or master, **pending**: Events, Check-in, Account — Gallery is
 *   hidden and Check-in is **not**, because the door is filtered on
 *   `door.operate` and that key is granted with `requires_approved = false`
 *   (D-06 of Phase 43). This row is the one D-39-06 changed.
 * - Staff: Events, Gallery, Account — **plus Check-in when rostered to a
 *   night**, since `staff` does not hold `door.operate` by role and holds it
 *   only through a live assignment
 *
 * The staff row no longer *"needs no code"*. That sentence was true while the
 * entry was role-filtered and it is not the reason any more: staff now sees or
 * does not see the tab according to the same live-assignment set the middleware
 * reads, which is code and is below.
 *
 * ── The mount count, corrected because the stale one was load-bearing
 *
 * This docblock used to put the `MobileNav` mount count at **44**, and that
 * number was the reason given for *not* changing this signature. **Measured on
 * this tree: 13 mount sites.** The count collapsed when plan 34-05 introduced
 * `admin/(work)/layout.tsx` and folded every work surface into a single mount.
 * A stale count in prose used to justify leaving a decision alone is exactly
 * how a decision outlives its reason — so it is corrected here rather than
 * left to rot, and the same correction is made in `(work)/layout.tsx`.
 *
 * @param capabilities the keys the subject holds by role
 * @param liveAssignmentCapabilities the coarser set held by a live per-night
 *   assignment, or `null` when the payload did not carry the key. **Both are
 *   required**: all 13 `<MobileNav>` mount sites pass them, so a fourteenth
 *   that forgets is a build error naming the file — the same discipline the
 *   one-element tuple at the top of this file enforced before this phase spent
 *   it.
 */
export function getVisibleNavItems(
  role: UserRole | null,
  status: UserStatus | null,
  capabilities: readonly CapabilityKey[],
  liveAssignmentCapabilities: readonly string[] | null
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
    // Gallery: visible to unauthenticated users AND approved members, but NOT
    // pending/rejected. Check-in no longer answers this clause — see below.
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

    // Check capability requirement — the clause D-39-06 added, and the only
    // one the Check-in entry answers.
    //
    // Role **or** live assignment, read in that order, which is the middleware's
    // own predicate (`src/lib/supabase/middleware.ts`) and the door guard's
    // (`admin/scanner/DoorSurface.tsx`). Not "similar to": the same. A stricter
    // test here would draw no tab for somebody the server then admits, which is
    // the divergence this clause exists to close; a looser one would draw a tab
    // the server refuses, which is worse, because a refusal happens at the door.
    //
    // `liveAssignmentCapabilities === null` refuses, and that is deliberate:
    // `null` means the payload did not carry the key — one known cause, an
    // unapplied migration — and admitting on an absent key would widen the nav
    // the moment a migration lagged. Empty means asked and answered.
    if (item.capability !== null) {
      const heldByRole = capabilities.includes(item.capability);
      const heldByAssignment =
        liveAssignmentCapabilities !== null &&
        liveAssignmentCapabilities.includes(item.capability);

      if (!heldByRole && !heldByAssignment) {
        return false;
      }
    }

    return true;
  });
}
