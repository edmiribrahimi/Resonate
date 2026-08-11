/**
 * The eight staff tabs — address, label, and the capability that opens the
 * address — declared once, for both staff menus.
 *
 * Before this module there were **three** hand-maintained menus, not the two
 * `34-CONTEXT.md` counted: the tab bar (`src/components/staff/StaffNav.tsx`),
 * the account list (`src/components/account/ManagementSection.tsx`, which held
 * two literal lists of seven and four addresses), and the bottom nav
 * (`src/lib/rbac/roles.ts`). Two of the three filtered on role; one filtered on
 * role *and* status. None of them could be right for a role that did not exist
 * when they were written — and the fourth role now does exist.
 *
 * ── Why this is its own module and not a table inside the map ────────────────
 *
 * `src/lib/routes/capability-routes.ts` is written by exactly one plan and read
 * by every other. A label table added there from a second plan is the shared-file
 * contention that costs a phase its parallelism. So the labels live here, and
 * the map stays the map.
 *
 * ── Hiding a nav item is not protecting a route ──────────────────────────────
 *
 * STAFF-03 holds in **one** direction by construction: a tab is drawn only when
 * the viewer holds the capability the middleware will ask for at that address,
 * because both read the same declaration. It does **not** hold in the other, and
 * must not be claimed to. A viewer who never sees a tab is not thereby refused
 * the address — the refusal is the middleware's, and the boundary on the DATA is
 * the RLS policy in the migrations. `access-gating.md`, gate *coerenza
 * navigazione/permessi*, is the source of that sentence and of this one.
 *
 * ── The capability is DECLARED here and VERIFIED against the map ─────────────
 *
 * Each tab writes its capability, so the list reads as a list. A written
 * capability is a copy, and a copy can drift — so the loop at the bottom asks
 * `resolveRoute` what the map says about the same address, and **throws at
 * module load** when the two disagree or when a tab points at an address nobody
 * bound. The check runs during `next build` (the module is evaluated while the
 * staff pages are prerendered), so a drifted tab list cannot be shipped. It is
 * the same discipline `capability-routes.ts` applies to its own ambiguity check:
 * a disagreement is a load-time error, never a request-time surprise.
 *
 * ── What this module may import, and why the list is three and not two ───────
 *
 * `CAP` / `CapabilityKey` from `@/lib/capabilities/keys`, `Route` from `next`,
 * and `resolveRoute` from `@/lib/routes/capability-routes`. Nothing else — no
 * DAL, no resolver, no guard helper, no `next/headers`, and no sentinel pinning
 * a module to the server. `keys.ts` imports nothing and `capability-routes.ts`
 * imports only `keys.ts` and `next`, so the whole transitive closure has **no
 * server-reaching edge** and this module stays importable from a `"use client"`
 * navigation. That is the point of D-34-10, and it is what lets a client menu
 * filter on the same keys the server refuses on.
 *
 * The third import is deliberate: without it the capability written beside each
 * label would be a second declaration of what opens an address, which is exactly
 * the drift this module exists to remove. The map is authoritative; this file is
 * a labelled view of it that cannot silently disagree.
 *
 * ── What is deliberately NOT here ────────────────────────────────────────────
 *
 * The door. It is bound to `door.operate` in the map and drawn by the bottom
 * nav, not by the tab bar. Adding it to this list would put a Check-in tab on a
 * menu the door's own page does not mount.
 *
 * **Updated after Phase 39.** This paragraph used to say `/admin/scanner` *"does
 * not move in this phase (STAFF-04 is Phase 39's, alone)"*. STAFF-04 has since
 * shipped: the door now answers at **two** addresses — `/door`, the canonical
 * one, and `/admin/scanner`, kept permanently as a real page and never a
 * redirect (D-39-02) — both opened by the **single** `door.operate` entry in
 * `capability-routes.ts`. The conclusion is unchanged and the reason is
 * stronger: the door is drawn by the bottom nav at either address, so neither
 * belongs on this tab bar. The sentence is corrected rather than deleted,
 * because a comment written in the future tense about a phase that has happened
 * tells the next reader the door has one address.
 */

import { CAP, type CapabilityKey } from "@/lib/capabilities/keys";
import { resolveRoute } from "@/lib/routes/capability-routes";
import type { Route } from "next";

export interface StaffTab {
  /** The absolute address, spelled as the map spells it. Never a concatenation. */
  readonly href: Route;
  readonly label: string;
  /** The capability the middleware will ask for at `href`. Verified below. */
  readonly capability: CapabilityKey;
}

/**
 * The eight, in the order they are drawn.
 *
 * The first four were the tabs an organizer already saw; the last three were the
 * ones carrying `roles: ["master"]`. That role filter is not translated — it is
 * **replaced** by the capability the middleware actually asks, which is
 * `admin.access` for all three. The two happen to select the same accounts today
 * (`master` alone holds `admin.access`), and that coincidence is not what makes
 * the entry correct: reading the same declaration as the server is.
 *
 * The eighth arrived with phase 36 and is the first entry here that asks neither
 * `organizer.access` nor `admin.access` — see the comment beside it.
 */
const DECLARED = [
  { href: "/admin/events", label: "Events", capability: CAP.ORGANIZER_ACCESS },
  { href: "/admin/members", label: "Members", capability: CAP.ORGANIZER_ACCESS },
  { href: "/admin/artists", label: "Artists", capability: CAP.ORGANIZER_ACCESS },
  { href: "/admin/venues", label: "Venues", capability: CAP.ORGANIZER_ACCESS },
  // ── THE EIGHTH TAB, AND WHY IT COULD NOT LAND BEFORE ITS PAGE ──────────────
  //
  // `StaffTab.href` is `Route` and NOT `string`, and that is the property that
  // makes this file's promise keepable: a menu cannot draw a link to an address
  // nobody serves, because a STATIC address enters the generated union only once
  // a `page.tsx` serves it. Which is exactly why this entry could not be written
  // when `/admin/formats` was bound in `CAPABILITY_ROUTES` (phase 36, plan 06)
  // and the page did not exist yet — `next build` refused it by name.
  //
  // The two ways to make it compile early were weighed and rejected, and they
  // stay rejected: widening `href` would turn `typedRoutes` off for every tab
  // above and push the loosening into both consumers, which pass `tab.href`
  // straight into `<Link href>` (`StaffNav.tsx:68-73`,
  // `ManagementSection.tsx:51`); and asserting the type on this one entry — the
  // cast is deliberately not spelled here, so the check that forbids it cannot
  // go green on the sentence forbidding it — would compile, and would be a hole
  // outliving the week it was needed, on the one file whose whole job is this
  // guarantee. Plan 36-09 created the page instead, and the type was the one
  // that had been right all along.
  //
  // `catalogue.manage`, and not `organizer.access` like the four above: it is
  // what the map binds to this address, and it `requires_approved`, so a pending
  // organizer is neither drawn the tab nor let through to the page.
  { href: "/admin/formats", label: "Formats", capability: CAP.CATALOGUE_MANAGE },
  { href: "/admin/newsletter", label: "Newsletter", capability: CAP.ADMIN_ACCESS },
  { href: "/admin/finance", label: "Finance", capability: CAP.ADMIN_ACCESS },
  { href: "/admin/analytics", label: "Analytics", capability: CAP.ADMIN_ACCESS },
] as const satisfies readonly StaffTab[];

// ── The copy cannot drift. Checked once, on first import. ───────────────────
//
// Two failures, two sentences. A tab pointing at an unbound address and a tab
// claiming the wrong capability are different mistakes with different repairs,
// and one message covering both would be the collapsed-catch pattern this
// project has already paid for once.
for (const tab of DECLARED) {
  const resolution = resolveRoute(tab.href);

  if (resolution === null) {
    throw new Error(
      `staff-tabs: the "${tab.label}" tab points at "${tab.href}", which no entry ` +
        `of CAPABILITY_ROUTES binds. Bind the address in the map, or remove the tab — ` +
        `a drawn entry with no server-side rule is a promise nothing keeps.`
    );
  }

  if (resolution.key !== tab.capability) {
    throw new Error(
      `staff-tabs: the "${tab.label}" tab claims "${tab.capability}" opens ` +
        `"${tab.href}", but CAPABILITY_ROUTES binds that address to ` +
        `"${resolution.key}" (pattern "${resolution.pattern}"). The map is the ` +
        `source; correct the tab.`
    );
  }
}

/** The eight, verified against the map. */
export const STAFF_TABS: readonly StaffTab[] = DECLARED;

/**
 * The tabs a viewer holding `capabilities` may be shown.
 *
 * **One filter, not two.** Both menus call this rather than each writing its own
 * `Set` walk: two filters over one list are two chances to disagree, and this
 * module exists because three menus already did.
 *
 * It decides **visibility only**. It authorises nothing, and the address it
 * returns is still judged by the middleware and by the page's own guard when the
 * link is followed.
 */
export function visibleStaffTabs(
  capabilities: readonly CapabilityKey[]
): readonly StaffTab[] {
  const held = new Set<CapabilityKey>(capabilities);
  return STAFF_TABS.filter((tab) => held.has(tab.capability));
}
