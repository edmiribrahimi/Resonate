/**
 * The seven staff tabs — address, label, and the capability that opens the
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
 * The seven, in the order they are drawn. (Eight until 2026-08-14, when the
 * owner removed Finance and Analytics — see the note where they stood; six
 * until phase 44, when Calendar landed after its pages did.)
 *
 * The first four were the tabs an organizer already saw; the master-only ones
 * carried `roles: ["master"]`. That role filter is not translated — it is
 * **replaced** by the capability the middleware actually asks, which is
 * `admin.access`. (Three of those until 2026-08-14; Newsletter is the one left.)
 * The two happen to select the same accounts today
 * (`master` alone holds `admin.access`), and that coincidence is not what makes
 * the entry correct: reading the same declaration as the server is.
 *
 * The Formats entry arrived with phase 36 and is the only one here that asks neither
 * `organizer.access` nor `admin.access` — see the comment beside it.
 */
const DECLARED = [
  { href: "/admin/events", label: "Events", capability: CAP.ORGANIZER_ACCESS },
  { href: "/admin/members", label: "Members", capability: CAP.ORGANIZER_ACCESS },
  { href: "/admin/artists", label: "Artists", capability: CAP.ORGANIZER_ACCESS },
  { href: "/admin/venues", label: "Venues", capability: CAP.ORGANIZER_ACCESS },
  // ── THE FORMATS TAB, AND WHY IT COULD NOT LAND BEFORE ITS PAGE ────────────
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
  // ── THE CALENDAR TAB, AND WHY HIDING IT PROTECTS NOTHING ──────────────────
  //
  // Same landing rule as Formats above, and for the same reason: the pages
  // exist on disk (phase 44, plan 09) at `(work)/calendar/page.tsx` and
  // `(work)/calendar/[id]/page.tsx`, so both static addresses are in the
  // generated union and this entry compiles without either rejected
  // workaround. Neither was used here and neither becomes acceptable because
  // a second tab now wants it.
  //
  // **Hiding this tab protects nothing**, and it needs saying here more than
  // on any other entry above. What this surface holds IS the secret — dates
  // not yet announced and spaces still under negotiation — so a reader who
  // never sees the link is not thereby refused the rows. Three things refuse a
  // door-assigned staff account, and none of them is the absence of a link:
  // the middleware entry for `production.calendar.manage`, the page's own
  // guard, and the six RLS policies rewritten onto that key by
  // `20260817120000_production_section_keys.sql` §3. A surface whose whole
  // content is a secret is exactly where somebody would be tempted to believe
  // the menu is doing the work, so: it is not.
  //
  // ── Re-keyed by plan 45-05, and NO TAB IS ADDED HERE ──────────────────────
  //
  // The capability moved from `production.read` to the calendar's own section
  // key. One line, and the loop below is what makes it safe: it asks
  // `resolveRoute` what the map says about this same address and throws at
  // module load if the two disagree, so a tab left on the retired key would
  // fail `next build` by name rather than draw a link nobody can follow.
  //
  // The three sibling sections get **no tab in this commit**, and the reason is
  // the rule stated at the Formats entry above rather than a scheduling
  // preference: `StaffTab.href` is `Route`, a static address enters the
  // generated union only once a `page.tsx` serves it, and neither
  // `/admin/manifesto`, `/admin/visual` nor `/admin/location` is on disk. The
  // two workarounds are rejected in writing above and STAY rejected — they do
  // not become acceptable because three tabs now want them instead of one.
  // Plan 45-18 adds the three tabs, after their pages exist.
  //
  // `production.calendar.manage`, and it ignores status (D-44-27, carried
  // unchanged through the split by D-45-04 constraint 3) — unlike
  // `catalogue.manage` on the line above, which `requires_approved`.
  {
    href: "/admin/calendar",
    label: "Calendar",
    capability: CAP.PRODUCTION_CALENDAR_MANAGE,
  },
  { href: "/admin/newsletter", label: "Newsletter", capability: CAP.ADMIN_ACCESS },
  // ── Finance and Analytics were removed here, and their pages with them ──────
  //
  // Owner's decision, 2026-08-14: neither surface is wanted. They were deleted
  // **whole** — tab, page files, and their rows in `CAPABILITY_ROUTES` — rather
  // than dropped from this list alone. Removing only the tab would have left
  // both addresses served and reachable by typing them, which is the shape
  // `nextjs-architecture.md` names outright: the refusal comes from the map and
  // the RLS, never from a menu that stops drawing a link.
  //
  // What survived the deletion, deliberately: `refundTransaction` lives in
  // `src/lib/sumup.ts`, not in the deleted `finance/actions.ts`, so the two
  // refund crons still run. What did NOT survive is the **manual** refund —
  // `refundTransactionAction` and its dialog were reachable only from
  // `/admin/finance`. A refund asked for by a customer is now done in SumUp's
  // own dashboard. Written here because a money path that quietly stops
  // existing is the silent failure phase 46 was spent removing.
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

/** The seven, verified against the map. */
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
