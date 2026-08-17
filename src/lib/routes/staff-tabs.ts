/**
 * The ten staff tabs — address, label, and the capability that opens the
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
 * The ten, in the order they are drawn. (Eight until 2026-08-14, when the
 * owner removed Finance and Analytics — see the note where they stood; six
 * until phase 44, when Calendar landed after its pages did; seven until phase
 * 45, when the calendar stopped being the only production section.)
 *
 * ── The order is a grouping, and it is deliberate ───────────────────────────
 *
 * Calendar, Location, Manifesto and Visual sit consecutively, between the four
 * catalogue tabs and Newsletter. **A navigation is read as a grouping whether
 * or not it was meant as one**, so four adjacent entries say *these are one
 * surface with four rooms* — which is exactly what D-45-04 decided them to be:
 * one list of sections, read by the middleware, the page guard, the navigation
 * and the row-level policies alike. Scattering them would say the opposite in
 * the only language a menu speaks.
 *
 * What the adjacency must NOT be read as saying is *one permission*. It is
 * four, and the four lines below each name a different one.
 *
 * The first four were the tabs an organizer already saw; the master-only ones
 * carried `roles: ["master"]`. That role filter is not translated — it is
 * **replaced** by the capability the middleware actually asks, which is
 * `admin.access`. (Three of those until 2026-08-14; Newsletter is the one left.)
 * The two happen to select the same accounts today
 * (`master` alone holds `admin.access`), and that coincidence is not what makes
 * the entry correct: reading the same declaration as the server is.
 *
 * The Formats entry arrived with phase 36 and **was** the only one here asking
 * neither `organizer.access` nor `admin.access`. It is now one of five: the four
 * production sections each ask their own key, and the sentence is corrected
 * rather than deleted because a comment that still says *the only one* teaches
 * the next reader to count wrong. Five distinct keys are named below, and
 * `CAP.PRODUCTION_*` is four of them.
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
  // ── The three sibling sections, which used to be a warning here ───────────
  //
  // This paragraph used to say they got **no tab in this commit**, and named
  // plan 45-18 as the one that would add them. That plan is this one, the three
  // entries stand below, and a warning about work already done is how the next
  // reader learns to skim the warnings. What is kept is the rule the warning
  // carried, because it is the rule that FORCED the order rather than a
  // scheduling preference: `StaffTab.href` is `Route`, a static address enters
  // the generated union only once a `page.tsx` serves it, so the three pages
  // (plans 45-11 and 45-12) had to land before these three lines could compile.
  // The two workarounds are rejected in writing above and STAY rejected — they
  // did not become acceptable because three tabs wanted them instead of one.
  //
  // `production.calendar.manage`, and it ignores status (D-44-27, carried
  // unchanged through the split by D-45-04 constraint 3) — unlike
  // `catalogue.manage` on the line above, which `requires_approved`.
  {
    href: "/admin/calendar",
    label: "Calendar",
    capability: CAP.PRODUCTION_CALENDAR_MANAGE,
  },
  // ── THE LOCATION TAB, AND WHY HIDING IT PROTECTS NOTHING ──────────────────
  //
  // **What this surface holds is the narrowest material in the product**, and
  // the sentence has to be re-derived here rather than borrowed from the
  // calendar's: this is not a list of dates, it is 184 spaces **nobody has
  // phoned**, every one of them at the lowest acquisition stage, and every one
  // of them carrying a **street address** (D-45-24). `venue-acquisition.md`
  // refuses to let a single one of those names into this repository at all —
  // criteria here, candidates never — and the product is the one place they are
  // allowed to exist. A reader who never sees this link is therefore not
  // refused a menu; they are not refused the rows, which is a different
  // sentence and the only one that matters.
  //
  // Three things refuse an account that does not hold this key, and **none of
  // them is the absence of a link**:
  //   1. the middleware, through the `production.location.manage` entry in
  //      `capability-routes.ts`, which covers `/admin/location` AND
  //      `/admin/location/[id]` — the detail address is where the address of a
  //      space is drawn, so a map entry that stopped at the list would refuse
  //      the index and serve the record;
  //   2. the page's own guard — `(work)/location/page.tsx:99-101` and its
  //      sister on the detail — which redirects to `/dashboard`;
  //   3. the row-level policies: `production_space_select_location` and
  //      `production_space_attribute_select_location`
  //      (`20260817120300_production_sections_access.sql`), plus the register's
  //      `production_open_question_select_location` and the brand-wide arm that
  //      admits any of the three section keys.
  //
  // Only the third is a boundary on the DATA. It is also the only one this
  // phase could measure against real rows: 184 and 1840 read by an entitled
  // role, zero and zero by an unentitled one.
  {
    href: "/admin/location",
    label: "Location",
    capability: CAP.PRODUCTION_LOCATION_MANAGE,
  },
  // ── THE MANIFESTO TAB, AND WHY HIDING IT PROTECTS NOTHING ─────────────────
  //
  // **What this surface holds is not a secret at all — it is an authority.**
  // That is a different reason for the same rule, and collapsing the two would
  // be the copied paragraph this file refuses to write. A manifesto is prose
  // that says how a format sounds, and for two of the four formats it says
  // *not yet decided* (`sound-manifesto.md`: non-scritto e' una risposta,
  // inventato non lo e'). The damage a wrong reader does here is not
  // disclosure, it is **authorship**: a void that reads as an invitation gets
  // filled, and whatever fills it becomes the brand for whoever reads it next.
  // Hiding the tab would not stop a hand that already has the key; the key is
  // what stops it.
  //
  // Three things refuse an account that does not hold this key, and **none of
  // them is the absence of a link**:
  //   1. the middleware, through the `production.manifesto.manage` entry —
  //      one pattern, because the whole body of rules is one screen;
  //   2. the page's own guard — `(work)/manifesto/page.tsx:117-119`;
  //   3. the row-level policies `production_section_select_manifesto` and
  //      `production_open_question_select_manifesto`, plus the brand-wide arm
  //      on the register.
  //
  // The register is the reason the second policy is not a duplicate of the
  // first: an open question is *what has not been decided and whose call it
  // is*, which is the half of this section that survives the section being
  // empty.
  {
    href: "/admin/manifesto",
    label: "Manifesto",
    capability: CAP.PRODUCTION_MANIFESTO_MANAGE,
  },
  // ── THE VISUAL TAB, AND WHY HIDING IT PROTECTS NOTHING ────────────────────
  //
  // **What this surface holds leaves the perimeter by design**, and that is the
  // third distinct reason on this list. The capitolato is written to be handed
  // to an external designer, and the archive beside it holds **photographs of
  // recognisable people** — so the risk here is neither disclosure of a secret
  // nor authorship of a brand, it is that a document travels. It is also the
  // one section whose objects live outside Postgres.
  //
  // Four things refuse an account that does not hold this key, and **none of
  // them is the absence of a link**:
  //   1. the middleware, through the `production.visual.manage` entry;
  //   2. the page's own guard — `(work)/visual/page.tsx:122-124`;
  //   3. the row-level policies `production_section_select_visual`,
  //      `production_visual_asset_select_visual` and
  //      `production_open_question_select_visual`, plus the brand-wide arm;
  //   4. and one this section has and the other three do not —
  //      `visual_archive_select_visual` on `storage.objects`, scoped to the
  //      PRIVATE `visual-archive` bucket
  //      (`20260817120400_visual_archive_bucket.sql`). A signed URL expires; a
  //      public bucket would have made the object reachable to anybody who can
  //      derive a key, which is the shape that argument was had over and
  //      settled against.
  //
  // What none of the four covers is a document that has already been produced
  // and sent. Nothing records that one left (DEF-45-09), so the refusals above
  // govern the door and not what walked through it.
  {
    href: "/admin/visual",
    label: "Visual",
    capability: CAP.PRODUCTION_VISUAL_MANAGE,
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

/** The ten, verified against the map. */
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
