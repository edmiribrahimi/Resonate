/**
 * The one declaration binding an address to the capability that opens it.
 *
 * Three readers share it — the middleware, the page guards and the navigation
 * — so that they cannot disagree (D-34-09). Before this file there were three
 * prefix rules in `src/lib/supabase/middleware.ts` and two hand-maintained
 * menus, and they *could* disagree: they already did, and the disagreement is
 * recorded as a defect (an organizer holds `register.read` and is bounced from
 * `/admin/members/register` because everything under `/admin` is judged by
 * `admin.access`). That defect closes here by construction, with no permission
 * edited.
 *
 * ── What this module must NOT import, and why ────────────────────────────────
 *
 * It imports `CAP` / `CapabilityKey` from `@/lib/capabilities/keys` and `Route`
 * from `next`, and nothing else (D-34-10). No DAL, no `next/headers`, no
 * server-side sentinel module. `keys.ts` itself imports nothing, so a module
 * importing only it has no server-reaching edge and stays importable from a
 * `"use client"` navigation — which is the whole point: a nav that filters on
 * the same keys the server refuses on cannot show an entry the server will
 * then refuse (STAFF-03).
 *
 * ── The middleware is UX. The RLS is the boundary. ───────────────────────────
 *
 * **A route with an entry here is not a protected route.** This map decides
 * where a *redirect* happens, which is the same authority the three prefix
 * rules had: it stops somebody ARRIVING on a page. It stops nobody READING a
 * row. The security boundary is the RLS policy in the migrations, exactly as
 * before, and one declaration read twice does not change which of the two is
 * the guarantee. Anyone reading this file for reassurance about data access is
 * reading the wrong file.
 *
 * ── CAP-02 is a chain of THREE links, not two, and there is no CI ────────────
 *
 *   1. database ↔ `CAP`         — asserted by `npm run verify:capabilities`.
 *                                 Needs a live database.
 *   2. `CAP` ↔ this map         — asserted by `next build`, twice:
 *                                 · a key with no binding, held by the total
 *                                   `Record` below (CAP-02's forward direction,
 *                                   as `REQUIREMENTS.md:48` writes it);
 *                                 · a route in the GENERATED union with no
 *                                   binding, held by `_everyStaffRouteIsBound`.
 *   3. this map ↔ pages on disk — asserted by `node scripts/verify-routes.mjs`
 *                                 (plan 34-08), which enumerates
 *                                 `find "src/app/(admin)" -name page.tsx` and
 *                                 can therefore see what the type system was
 *                                 never given.
 *
 * **There is no CI in this repository** (D-34-12). Every one of the three is a
 * written pre-deploy step, not an automation, and the chain is only as good as
 * the discipline of running the first and the third. Saying so here is the
 * point: a reader who assumes `next build` covers all three would be assuming
 * a check that does not exist.
 *
 * Link 3 cannot be moved into this module. The research's fallback — a
 * module-load throw comparing the two sets — is **not writable**, because the
 * set of `page.tsx` files on disk does not exist at module load. It is a
 * script or it is nothing.
 *
 * ── What `_everyStaffRouteIsBound` covers, and what it does not ──────────────
 *
 * It covers the **STATIC** staff routes only — **14** of them, measured on
 * 2026-08-09 against the generated `.next/types/link.d.ts` from `next@16.1.6`:
 * `/admin`, `/admin/analytics`, `/admin/analytics/compare`,
 * `/admin/analytics/members`, `/admin/artists`, `/admin/events`,
 * `/admin/events/new`, `/admin/finance`, `/admin/members`,
 * `/admin/members/growth`, `/admin/members/register`, `/admin/newsletter`,
 * `/admin/scanner`, `/admin/venues`.
 *
 * It does **not** cover `/admin/events/[id]/edit` or any of its eight
 * siblings. `RouteImpl`'s dynamic arm is
 * `T extends \`${DynamicRoutes<infer _>}${Suffix}\` ? T : never`, which
 * collapses to `never` when `T` is `string` — so a bare `Route` contains no
 * dynamic route at all, and `StaffRoute` below cannot see one. That is not a
 * hole to patch here; it is exactly why `scripts/verify-routes.mjs` censuses
 * pages from disk. A check described more broadly than it behaves is a check
 * somebody will rely on for something it does not do.
 *
 * ── Why `RoutePattern` keeps its second arm ──────────────────────────────────
 *
 * `RoutePattern` is deliberately NOT narrowed to `Route`.
 * `/admin/events/[id]/assignments` and `/admin/events/[id]/review` are in the
 * map and do **not** exist on disk yet — plan 34-06 creates them — so they are
 * absent from the generated union and a narrowed type would fail the build
 * today. The consequence is stated rather than glossed: **`typedRoutes` checks
 * none of the 25 strings in this map.** A typo like `"/admin/newsleter"`
 * compiles, `resolveRoute` returns `null`, the middleware fails closed, and the
 * master silently loses the newsletter. The mechanism that catches it is
 * `_everyStaffRouteIsBound`, which reads the VALUE of this object rather than
 * the type of `Binding` — and that is not a style preference: the type-derived
 * form is vacuous, because the second arm widens the element type to `string`,
 * every staff route extends `string`, and the assertion compiles no matter what
 * is missing. Proved by mutation B2, plan 34-01.
 *
 * The direction the assertion asks is unaffected by the two missing pages:
 * `Exclude<StaffRoute, Listed>` asks whether a route **on disk** is missing
 * from the map. A map entry with no route on disk is not an error — it is a
 * plan not yet run. Measured 2026-08-09: 21 `page.tsx` files under
 * `src/app/(admin)`, all 21 among the 23 `/admin` patterns here.
 *
 * ── What is deliberately NOT in this map ─────────────────────────────────────
 *
 * **Route Handlers under `/api/*`** (D-34-13). `door.supervise` and
 * `media.upload` gate handlers through `src/lib/door/require-operator.ts` and
 * `src/lib/media/may-upload.ts`, not through a route rule, and they say so
 * below instead of being silently absent. Bringing `/api/*` under CAP-02 would
 * mean adding a middleware rule on the **door's scan path**, which is the one
 * path this phase has no business touching. Recorded here as a finding for a
 * later phase, not as an exemption.
 */

import { CAP, type CapabilityKey } from "@/lib/capabilities/keys";
import type { Route } from "next";

/**
 * A route pattern, spelled exactly as the folder does — the generated union
 * and this map use the same string for a dynamic segment
 * (`/admin/events/[id]/tickets`), which is what lets the nav substitute into it
 * and the middleware match against it without a second vocabulary.
 *
 * The second arm is load-bearing until plan 34-06 lands; see the module
 * docblock for the price it charges.
 */
type RoutePattern = Route | (string & {});

/** The marker for a key that gates rows rather than addresses. */
type TableOnly = "table";

type Binding =
  | {
      /** The addresses this key opens. Declaration order is IRRELEVANT. */
      routes: readonly RoutePattern[];
      /**
       * May a live per-night assignment open these? (D-34-03)
       *
       * The rule travelled here verbatim from the docblock of what used to be
       * `ORGANIZER_ASSIGNMENT_ROUTES` in `src/lib/supabase/middleware.ts`.
       * **That identifier no longer exists** — plan 34-03 deleted it, having
       * first confirmed the paragraph had arrived here, because deleting a
       * safety rule and the expression it guards in one commit is how a rule
       * becomes folklore. This is now the only copy:
       *
       *   *A route earns a place here only once it already has its own
       *   server-side gate, and the list grows one route at a time, as a
       *   decision, never as a convenience.*
       *
       * It is a property of the ROUTE ENTRY. Never of the key, never of a
       * prefix. A key marked openable would hand every address it opens to
       * anybody holding any live assignment for any night — which is precisely
       * what the allow-list exists to prevent.
       */
      assignmentOpenable?: true;
      /** True when the key ALSO gates rows. Four of the thirteen do. */
      alsoGatesTables?: true;
    }
  | {
      scope: TableOnly;
      /** One line, mandatory. A gate that cannot say so would be satisfied by a lie. */
      reason: string;
    };

/**
 * The thirteen keys, each accounted for.
 *
 * `as const satisfies` and not a type annotation, and the difference is the
 * whole second half of CAP-02: `satisfies` keeps the totality error (a
 * fourteenth key with no entry fails the build), while `as const` keeps each
 * `routes` array a tuple of string LITERALS instead of widening it to
 * `RoutePattern[]`. Without `as const` the union of listed routes widens to
 * `string` and `_everyStaffRouteIsBound` becomes a decoration.
 */
export const CAPABILITY_ROUTES = {
  /**
   * The door. Written first, physically, because it is the entry a careless
   * edit costs the most.
   *
   * `door.operate` is granted with `requires_approved = false` **deliberately**
   * (D-06 of Phase 43), so a pending organizer is not refused in front of a
   * queue. **This phase does not flip it and does not read it.** The address
   * does not move either (STAFF-04 is Phase 39, alone, because a redirect needs
   * a network the door is designed not to have).
   *
   * What this phase DOES change is the code that judges this address, and that
   * rewrite is the risk — not the address. Nobody edited the door; the door's
   * verdict is nonetheless being re-derived from a new place. Mutation C of
   * plan 34-01 exists for exactly that: it proves this entry wins for
   * `/admin/scanner` even when it is declared LAST.
   *
   * ── `assignmentOpenable`, added by plan 34-03, and why it was missing ───────
   *
   * The door has had an assignment arm since phase 35: the rule this map
   * replaces read *role **or** a live `door.operate` assignment*, because
   * `staff` does **not** hold `door.operate` by role — it is one of the six
   * declared refusals of the role (`20260808000500_staff_role.sql`), so a member
   * of staff rostered on tonight's door holds it by assignment and by nothing
   * else. The scanner page carries the SAME predicate deliberately and says so:
   * *anybody who clears the coarse gate clears this one; if the two ever
   * diverge, this is the copy that is wrong.*
   *
   * Plan 34-01 transcribed the allow-list of the `/organizer` arm — one route,
   * `review` — and the door's arm had no allow-list to travel with, so it was
   * left behind. Without this flag the middleware refuses the person rostered
   * to work the door, at two in the morning, in front of a queue: the exact
   * asymmetry `checkin-offline.md` names as the worse of the two errors. It was
   * caught by the assertion at the top of `src/lib/supabase/middleware.ts`,
   * which fired on the first request against the map as wave 1 left it.
   *
   * This is **not** a widening. It restores, in data, the arm the code being
   * replaced already had; the reach of every role is identical before and
   * after. And it satisfies the rule below on its own terms — this route has
   * had its own server-side gate since plan 35-16, with the same predicate.
   */
  [CAP.DOOR_OPERATE]: {
    routes: ["/admin/scanner"],
    assignmentOpenable: true,
    alsoGatesTables: true,
  },

  /**
   * The six master-only surfaces. Settled in open question 4 of
   * `34-RESEARCH.md`; this list is not to be re-derived.
   *
   * `admin.access` keeps its meaning — *reach the master-only surfaces* — and
   * loses only its accidental second meaning, which was *anything whose path
   * starts with `/admin`* (D-34-02). After this map, the word `admin` in a URL
   * no longer describes who is on it.
   */
  [CAP.ADMIN_ACCESS]: {
    routes: [
      "/admin/analytics",
      "/admin/analytics/compare",
      "/admin/analytics/members",
      "/admin/newsletter",
      "/admin/finance",
      "/admin/members/growth",
    ],
  },

  /**
   * The shared work surface.
   *
   * `/admin` is on this list because of finding F2: `(admin)/admin/page.tsx` is
   * a bare `redirect()` with no gate of its own, and D-34-02 dissolves the
   * prefix rule that was holding it up. `organizer.access` is the LEAST of the
   * capabilities any collapsed surface needs, so an unentitled visitor is
   * refused before the redirect runs.
   *
   * ── `/admin/venues/[slug]` — plan 37-08, D-37-23 ────────────────────────────
   *
   * The venue profile used to serve `/venues/<slug>` to anybody, signed in or
   * not; it is a production surface now. It takes its sister's key deliberately:
   * one audience for the listing and for the rows the listing opens. Two things
   * about this entry are worth the ink.
   *
   *   · **`next build` cannot see it.** `_everyStaffRouteIsBound` below reads the
   *     GENERATED union, which holds no dynamic route, so a missing row here
   *     would have raised no type error — only a middleware resolving `null` and
   *     refusing everybody, with nothing in a log and no CI to notice. The check
   *     that sees it is `npm run verify:routes`, which censuses `page.tsx` from
   *     disk.
   *   · **It is unambiguous, measured rather than assumed.** Three segments, one
   *     dynamic in third position; `node scripts/verify-routes.mjs
   *     --print-patterns` lists no other pattern of that shape. The loop at the
   *     foot of this file throws on the FIRST import when two patterns tie, so
   *     being wrong here costs the whole application rather than one page.
   */
  [CAP.ORGANIZER_ACCESS]: {
    routes: [
      "/admin",
      "/admin/artists",
      "/admin/venues",
      "/admin/venues/[slug]",
      "/admin/members",
      "/admin/events",
      "/admin/events/new",
      "/admin/events/[id]/edit",
      "/admin/events/[id]/tickets",
      "/admin/events/[id]/sales",
      "/admin/events/[id]/guest-list",
      "/admin/events/[id]/drinks",
      "/admin/events/[id]/analytics",
      "/admin/events/[id]/assignments",
    ],
  },

  /**
   * The folded todo `register-read-unreachable-for-organizers.md`, closing by
   * construction. An organizer holds `register.read` and is bounced today only
   * because everything under `/admin` is judged by `admin.access`. **No grant
   * is edited to close it** — if closing it had required touching a permission,
   * the collapse would not have happened and something would have been
   * special-cased instead.
   */
  [CAP.REGISTER_READ]: {
    routes: ["/admin/members/register"],
    alsoGatesTables: true,
  },

  /**
   * Finding F1: the `/admin` media page has **no** capability check of its own
   * — only `if (!user) redirect("/login")` — while its organizer twin gates on
   * `staff.manage`. Taking the twin's gate is not a widening. It is giving a
   * page its own gate for the first time.
   */
  [CAP.STAFF_MANAGE]: {
    routes: ["/admin/events/[id]/media"],
    alsoGatesTables: true,
  },

  /**
   * The one route under `party.manage` a live per-night assignment may open —
   * one of the map's **two** assignment-openable entries, the other being the
   * door. (It was described here as the only one until plan 34-03 measured that
   * the door's arm had been left behind; see that entry.) The per-night gate on
   * the page itself — which re-asks `party.manage` against the night resolved
   * from `?party=` — is untouched by this phase and is the real boundary; this
   * flag only decides whether the middleware lets the request reach it.
   */
  [CAP.PARTY_MANAGE]: {
    routes: ["/admin/events/[id]/review"],
    assignmentOpenable: true,
    alsoGatesTables: true,
  },

  /**
   * Genuinely route-scoped, and **outside** the collapsed tree. Marking it as
   * gating rows would be the exact lie D-34-11 exists to prevent, and it is why
   * this module is the whole application's route↔capability map rather than
   * `/admin`'s.
   */
  [CAP.MEMBERSHIP_CARD_VIEW]: {
    routes: ["/membership-card", "/attendance"],
  },

  [CAP.MASTER_MANAGE]: {
    scope: "table",
    reason:
      "Gates rows and server-side operations, not addresses; the guard is `guards.ownsOrIsMaster` in `src/lib/capabilities/guards.ts`.",
  },

  /**
   * The catalogue of formats and series — phase 36, plan 06.
   *
   * ── This entry CHANGED BRANCH, and the branch is the whole change ───────────
   *
   * Until today this key sat on the second branch as `{ scope: "table" }`, which
   * opens **no address at all**: `resolveRoute` returns `null` for a page bound
   * to a table-only key, every caller must treat `null` as a refusal, and the
   * middleware fails closed. Adding `/admin/formats` was therefore never a
   * string appended to a list — a page bound to the old entry would have been
   * unreachable **for everyone**, with no build error and nothing in a log.
   *
   * `alsoGatesTables: true` is carried across because the old `reason` is still
   * true: this key does gate rows. It is **optional** on this branch, so
   * omitting it would have produced no error either — just a declaration that
   * lies by omission, which is the lie D-34-11 exists to prevent. The sentence
   * it used to carry, in full and unedited:
   *
   *   *Gates rows, not addresses; the enforcement is the four `artists` /
   *   `venues` organizer policies in the migrations.*
   *
   * Phase 36 adds two more tables to that list — `public.formats` and
   * `public.party_series`, whose read arms both ask
   * `(select private.has_capability('catalogue.manage'))`
   * (`20260810120000_formats_and_series.sql` §4a, §4b). The row half of this key
   * grew; it did not move.
   *
   * ── The divergence from the two sibling catalogue surfaces, DECLARED ────────
   *
   * `/admin/venues` and `/admin/artists` are bound to `organizer.access` above,
   * while their **actions** re-ask `catalogue.manage` inside themselves —
   * `(work)/venues/page.tsx:38-40` already writes that divergence down and calls
   * it *"a different question from reachability, and one that
   * `requires_approved` where this one does not."*
   *
   * **This surface is reached through `catalogue.manage` itself**, and the
   * asymmetry with its two siblings is a choice rather than an oversight.
   * `catalogue.manage` is granted `requires_approved = true` to both roles that
   * hold it (`20260807000000_capability_model.sql:399-400`), so a **pending**
   * organizer is refused at the address instead of being shown a catalogue where
   * every button then refuses them — a silent failure with a neutral face, and
   * the precedent this project has already paid for once. Moving a refusal
   * EARLIER is the only direction `meta-gates.md` permits without an
   * authorisation, so the two surfaces are not made to match by loosening this
   * one.
   *
   * `staff` holds neither key (`20260808000500_staff_role.sql:143-152`), so the
   * choice does not change what a member of staff reaches: nothing, either way.
   *
   * ── The page is not on disk yet, and that is not an error ───────────────────
   *
   * `_everyStaffRouteIsBound` below asks the opposite direction — *a route in
   * the generated union with no binding* — so it will not see `/admin/formats`
   * until plan 36-09 creates the page and a build puts the address in the union.
   * A map entry with no page is a plan not yet run, exactly as the module
   * docblock records for `/admin/events/[id]/assignments`. The direction that IS
   * covered — a page nobody bound — is `npm run verify:routes`, which starts
   * covering this address the moment that page exists.
   */
  [CAP.CATALOGUE_MANAGE]: {
    routes: ["/admin/formats"],
    alsoGatesTables: true,
  },

  [CAP.MEMBERSHIP_ACTIVE]: {
    scope: "table",
    reason:
      "Gates rows and the member-level contribution, not addresses; the guard is `src/lib/media/may-upload.ts`.",
  },

  [CAP.DOOR_SUPERVISE]: {
    scope: "table",
    reason:
      "Gates a Route Handler, not a page; the guard is `src/lib/door/require-operator.ts`. See D-34-13 in the module docblock.",
  },

  [CAP.MEDIA_UPLOAD]: {
    scope: "table",
    reason:
      "Gates a Route Handler, not a page; the guard is `src/lib/media/may-upload.ts`. See D-34-13 in the module docblock.",
  },

  /**
   * The manual venue reveal — phase 37, plan 01.
   *
   * ── Why this is on the SECOND branch, and why that is not laziness ──────────
   *
   * **The key opens no new address.** The button lives on
   * `/admin/events/[id]/edit`, which is already bound to `organizer.access`
   * above (`:256`), and the trace it renders lives on the same page. This key
   * governs an ACT — *may this subject make this night's address public, now?* —
   * not a place to stand.
   *
   * Adding `routes: [...]` here would be the mistake this file already records
   * once, in the opposite direction, at the `CATALOGUE_MANAGE` entry: a page
   * bound to a `scope: "table"` key is unreachable **for everyone**, with no
   * build error and nothing in a log. The symmetric mistake is this one — moving
   * an address onto a key that gates an act — and it would take
   * `/admin/events/[id]/edit` away from every organizer who may edit a night but
   * not reveal it, which is a widening's mirror image and just as unintended.
   */
  [CAP.VENUE_REVEAL]: {
    scope: "table",
    reason:
      "Gates an act, not an address: the button sits on `/admin/events/[id]/edit`, already opened by `organizer.access`. The real guard is the server action in `src/app/(admin)/admin/events/[id]/reveal/actions.ts`, which re-asks this key inside itself, and `public.record_venue_reveal_act`, which is executable by `service_role` alone.",
  },
} as const satisfies Record<CapabilityKey, Binding>;

/* ────────────────────────────────────────────────────────────────────────────
 * CAP-02, second direction: every staff route in the generated union is bound.
 * ──────────────────────────────────────────────────────────────────────────── */

/**
 * The static `/admin` addresses the compiler can see.
 *
 * The `Exclude` is load-bearing and its absence is not a style question:
 * without it this alias is red on a clean tree, always. `RouteImpl` carries a
 * `` `${StaticRoutes}${SearchOrHash}` `` arm, so extracting `/admin`-prefixed
 * members also captures `` `/admin/analytics?${string}` ``,
 * `` `/admin/newsletter#${string}` `` and one such member for every staff
 * route. Measured 2026-08-09 against the real generated
 * `.next/types/link.d.ts`:
 *
 *     error TS2322: Type 'Unbound' is not assignable to type '0'.
 *       Type '`/admin/analytics?${string}`' is not assignable to type '0'.
 *
 * A query string is not a route. Stripping those two arms is what makes
 * `Unbound` mean *a staff route with no binding* rather than *a staff route*.
 */
type StaffRoute = Exclude<
  Extract<Route, "/admin" | `/admin/${string}`>,
  `${string}?${string}` | `${string}#${string}`
>;

/**
 * Every address listed above — read from the VALUE of `CAPABILITY_ROUTES`, not
 * from the `Binding` type. See the module docblock for why the type-derived
 * form is vacuous.
 */
type Listed = Extract<
  (typeof CAPABILITY_ROUTES)[CapabilityKey],
  { routes: readonly unknown[] }
>["routes"][number];

/** A staff route nobody declared. */
type Unbound = Exclude<StaffRoute, Listed>;

/**
 * The assertion. When it is red, the error names the route.
 *
 * If this is red on an UNMUTATED tree, that is a finding and not a thing to
 * relax: either a staff route genuinely has no binding — give it one — or the
 * type form is wrong, which goes back to the planner. Weakening `StaffRoute`,
 * widening `Listed`, deleting this line or commenting it out are all the same
 * mistake, and it is the mistake that produced the vacuous first draft.
 */
const _everyStaffRouteIsBound: Unbound extends never
  ? true
  : ["UNBOUND", Unbound] = true;
void _everyStaffRouteIsBound;

/* ────────────────────────────────────────────────────────────────────────────
 * The resolver. Specificity is a property of the PATTERN, never of the
 * position.
 * ──────────────────────────────────────────────────────────────────────────── */

/**
 * One compiled segment. `null` marks a dynamic segment, which matches exactly
 * one non-empty path segment.
 */
interface Segment {
  readonly literal: string | null;
}

interface CompiledPattern {
  readonly pattern: string;
  readonly key: CapabilityKey;
  readonly assignmentOpenable: boolean;
  readonly segments: readonly Segment[];
  readonly dynamicCount: number;
}

/** What the middleware, the guards and the navigation each get back. */
export interface RouteResolution {
  readonly key: CapabilityKey;
  /** Only ever `true` on an entry that declared it. Never inferred. */
  readonly assignmentOpenable: boolean;
  /** The pattern that won, for logging and for tests of this module by hand. */
  readonly pattern: string;
}

/**
 * Split a path into segments. `"/admin/scanner"` becomes
 * `["admin", "scanner"]`; `"/"` becomes `[""]`.
 *
 * There is no expression matching here, deliberately. The docblock of
 * `ORGANIZER_ASSIGNMENT_ROUTES` spends a paragraph on the two anchoring
 * mistakes a pattern language invites — a `.*` anywhere silently re-opens the
 * tree, and an unanchored tail matches `/reviewers` — and a segment walk cannot
 * make either: a dynamic segment matches exactly one segment, and the walk
 * compares lengths.
 */
function splitSegments(path: string): readonly string[] {
  return path.split("/").slice(1);
}

function compileSegments(pattern: string): readonly Segment[] {
  const out: Segment[] = [];
  for (const raw of splitSegments(pattern)) {
    out.push({ literal: raw.startsWith("[") ? null : raw });
  }
  return out;
}

const COMPILED_PATTERNS: readonly CompiledPattern[] = (() => {
  const compiled: CompiledPattern[] = [];

  const entries = Object.entries(CAPABILITY_ROUTES) as ReadonlyArray<
    [CapabilityKey, Binding]
  >;

  for (const [key, binding] of entries) {
    if (!("routes" in binding)) continue;
    const openable = binding.assignmentOpenable === true;
    for (const pattern of binding.routes) {
      const segments = compileSegments(pattern);
      let dynamicCount = 0;
      for (const segment of segments) {
        if (segment.literal === null) dynamicCount += 1;
      }
      compiled.push({
        pattern,
        key,
        assignmentOpenable: openable,
        segments,
        dynamicCount,
      });
    }
  }

  // ── Ambiguity is a LOAD-TIME error, never a request-time coin flip. ────────
  //
  // Two patterns tie when they could both match the same path and neither is
  // more literal than the other. Resolving such a tie at request time would
  // mean the door's verdict depending on which entry the loop happened to see
  // first — a refusal in front of a queue, decided by declaration order. So it
  // is refused here, on the first import, naming both patterns.
  for (let a = 0; a < compiled.length; a += 1) {
    for (let b = a + 1; b < compiled.length; b += 1) {
      const left = compiled[a];
      const right = compiled[b];
      if (left.segments.length !== right.segments.length) continue;
      if (left.dynamicCount !== right.dynamicCount) continue;

      let overlaps = true;
      for (let i = 0; i < left.segments.length; i += 1) {
        const leftLiteral = left.segments[i].literal;
        const rightLiteral = right.segments[i].literal;
        if (
          leftLiteral !== null &&
          rightLiteral !== null &&
          leftLiteral !== rightLiteral
        ) {
          overlaps = false;
          break;
        }
      }

      if (overlaps) {
        throw new Error(
          `capability-routes: ambiguous patterns "${left.pattern}" (${left.key}) and ` +
            `"${right.pattern}" (${right.key}) — they can match the same path and neither ` +
            `is more specific. Resolve it here, not at request time.`
        );
      }
    }
  }

  return compiled;
})();

function matchesPattern(
  candidate: CompiledPattern,
  segments: readonly string[]
): boolean {
  if (candidate.segments.length !== segments.length) return false;
  for (let i = 0; i < segments.length; i += 1) {
    const segment = segments[i];
    // An empty segment never matches. This is what keeps `//admin/finance` and
    // a trailing slash from resolving: `nextUrl.pathname` is already
    // normalised by Next's own handling, and nothing here decodes it further.
    if (segment.length === 0) return false;
    const literal = candidate.segments[i].literal;
    if (literal === null) continue;
    if (literal !== segment) return false;
  }
  return true;
}

/**
 * Resolve a concrete pathname to the capability that opens it, or `null`.
 *
 * `null` means *no binding*, and every caller must treat it as a refusal — an
 * unmapped staff path admitted by fall-through is T-34-03. This function does
 * not decide that; it only declines to guess.
 *
 * **Specificity comes from the pattern.** Among the patterns that match, the
 * one with the fewest dynamic segments wins. Segment counts are necessarily
 * equal among matches, because `matchesPattern` requires equal length — so the
 * research's first tiebreak ("most segments") has no live case here and is
 * deliberately not written as a branch that can never run. What remains is the
 * one that decides real cases: `/admin/events/new` against
 * `/admin/events/[id]` — were the latter ever added — is settled by literals,
 * not by which line came first.
 *
 * Patterns are exact, not prefixes: `/admin` opens `/admin` and nothing below
 * it. Every address is declared.
 */
export function resolveRoute(pathname: string): RouteResolution | null {
  const segments = splitSegments(pathname);

  let winner: CompiledPattern | null = null;
  for (const candidate of COMPILED_PATTERNS) {
    if (!matchesPattern(candidate, segments)) continue;
    if (winner === null || candidate.dynamicCount < winner.dynamicCount) {
      winner = candidate;
    }
  }

  if (winner === null) return null;
  return {
    key: winner.key,
    assignmentOpenable: winner.assignmentOpenable,
    pattern: winner.pattern,
  };
}
