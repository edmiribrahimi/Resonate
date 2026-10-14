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
 * It covers the **STATIC** staff routes only — **14** of them when the count was
 * taken, on 2026-08-09, against the generated `.next/types/link.d.ts` from
 * `next@16.1.6`.
 *
 * **L'elenco che stava qui non si riscrive a ogni rimozione: si e' tolto.** Fra
 * l'agosto e il settembre 2026 il proprietario ha tolto cinque di quei quattordici
 * indirizzi — le tre superfici di analytics, quella del finance e, con la fase 50,
 * la pagina che misurava la crescita da referral. Un elenco nominale dentro una
 * misura datata invecchia a ogni cancellazione e **si legge come se fosse
 * corrente**: la misura resta (il numero, la data, la fonte), i nomi no. Gli
 * indirizzi vivi sono qui sotto, nella mappa, che e' l'unico posto in cui
 * valgono.
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
 * **Route Handlers under `/api/*`** (D-34-13). `door.supervise` gates
 * handlers through `src/lib/door/require-operator.ts`, not through a route
 * rule, and says so below instead of being silently absent. *(`media.upload`
 * did the same through its own upload guard until it left the catalogue with
 * the gallery on 2026-10-02, plan 52.1-18, DBT-13; the guard itself left on
 * 2026-10-14 with the visual archive, phase 53.)* Bringing `/api/*` under CAP-02 would
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
      /**
       * True when the key ALSO gates rows. **Five entries of the eleven carry
       * it**, RE-COUNTED by reading this file on 2026-10-14 (phase 53, CUT-01):
       * `door.operate`, `register.read`, `party.manage`, `catalogue.manage` and
       * `production.manifesto.manage`. Three of the four production section keys
       * left the catalogue with their sections (D-53-02, D-53-04), each with its
       * flag. *(This line said «Eight entries of the fourteen» from 2026-10-02
       * to 2026-10-14.)* The earlier counts follow, as written.
       *
       * **Eight entries of the fourteen
       * carried it**, RE-COUNTED by reading this file on 2026-10-02 (phase 52.1,
       * plan 52.1-18, DBT-13): `gallery.view` left the catalogue with its flag,
       * and `staff.manage` lost its only page and moved to the `scope: "table"`
       * branch, where the field does not exist — it still gates rows, and its
       * `reason` says so. *(This line said «Ten of the sixteen» from
       * 2026-09-23 to 2026-10-02.)* The earlier count follows, as written.
       *
       * **Ten of the sixteen did**,
       * RE-COUNTED by reading this file on 2026-09-23 (phase 52, plan 52-06)
       * rather than by adding to the number that was printed here: the nine
       * counted on 2026-08-17 — `door.operate`, `register.read`,
       * `staff.manage`, `party.manage`, `catalogue.manage` and the four
       * production section keys — are still the nine flagged entries after
       * phase 51 took two keys out (neither carried the flag), and
       * `gallery.view` is the tenth. *(This line said «nine of the seventeen»
       * from 2026-08-17 to 2026-09-23; the denominator was fifteen for the last
       * day of that stretch, and nobody re-counted.)*
       *
       * The denominator moved and the numerator did not, which is exactly the
       * case a reader would get wrong by arithmetic: phase 45 splits
       * `production.read` into four section keys, and **all four now carry the
       * flag** — the calendar's (the six `SELECT` arms of
       * `20260817120000_production_section_keys.sql` §3), and Location's, the
       * manifesto's and the visual's (the arms of
       * `20260817120300_production_sections_access.sql`, applied to production by
       * plan 45-08). Only the manifesto's is still here (2026-10-14).
       *
       * ⚠ Until plan 45-12 the last two of those gated rows and did NOT carry
       * this flag — not as a measured absence, but because the field does not
       * exist on the `scope: "table"` branch they were parked on. Each acquired
       * it in the commit that gave it a page. *(An earlier version of this
       * paragraph said their tables did not exist yet. That was true when it was
       * written and stopped being true on 2026-08-17, and a stale reason left
       * standing is how a reader concludes the entry beside it was checked.)*
       *
       * This line said *four* until 2026-08-15, and had said it since plan 34-01
       * while two more entries acquired the flag — `catalogue.manage` in phase
       * 36 and the production key in phase 44. A count in a comment is a claim
       * nothing checks, and the flag is optional on this branch, so the one
       * mistake it invites is the one D-34-11 names: leaving it off and
       * producing no error at all. The number is corrected here rather than
       * dropped, because a reader who cannot tell how many keys gate rows cannot
       * tell whether the entry in front of them forgot to say so.
       */
      alsoGatesTables?: true;
    }
  | {
      scope: TableOnly;
      /** One line, mandatory. A gate that cannot say so would be satisfied by a lie. */
      reason: string;
    };

/**
 * The eleven keys, each accounted for (seventeen until phase 51 removed two,
 * sixteen again since phase 52 added `gallery.view`, fourteen since phase 52.1
 * took `gallery.view` and `media.upload` out with the gallery — DBT-13, eleven
 * since phase 53 took three of the four production section keys out with their
 * sections — CUT-01, 2026-10-14).
 *
 * `as const satisfies` and not a type annotation, and the difference is the
 * whole second half of CAP-02: `satisfies` keeps the totality error (a key
 * added to `CAP` with no entry fails the build — it fired four times at once in
 * plan 45-05, for the four section keys), while `as const` keeps each
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
   *
   * ── Phase 39: two addresses, ONE entry ──────────────────────────────────────
   *
   * The sentence three paragraphs up — *"the address does not move either
   * (STAFF-04 is Phase 39, alone …)"* — is **spent**. It is reversed here rather
   * than deleted, because a decision reversed without its reason reads as an
   * oversight: STAFF-04 has now happened, and Phase 39 is the phase that
   * sentence was pointing at.
   *
   * `/door` is the **canonical** address as of Phase 39 (D-39-01) and is what
   * the bottom nav draws. `/admin/scanner` is **permanent**: it is not
   * deprecated on a timer and not removed in a later phase — it serves the same
   * surface, as a real page and never as a redirect (D-39-02), because a
   * redirect needs a network the door is designed not to have.
   *
   * **Two addresses, one entry.** A second entry, or a second key, would be the
   * *second predicate* `39-CONTEXT.md` forbids; and `assignmentOpenable` is a
   * property of the ENTRY, which is exactly what keeps the person rostered to
   * the door admitted at *either* address without the flag being written twice.
   *
   * **D-39-03, recorded verbatim as a reading and not as a choice.** STAFF-04
   * (*the door keeps an address of its own and is not moved together with the
   * rest*) and the ROADMAP goal (*it moves to its permanent address in a step
   * all its own*) **do not contradict each other**: both hold at once. Written
   * down so the next reader does not re-litigate it.
   *
   * **No ambiguity is introduced**, and it is checked rather than hoped: `/door`
   * is one literal segment, and the other one-segment patterns in this map carry
   * different literals, so the load-time ambiguity throw at the foot of this file
   * does not fire. Fino al 2026-09-22 quelli erano tre — `/admin`,
   * `/membership-card`, `/attendance` — e dal piano 51-08 e' rimasto `/admin`:
   * le altre due uscite con `membership.card.view` (D-51-07). Meno pattern a un
   * segmento significa meno occasioni di ambiguita', mai di piu'.
   */
  [CAP.DOOR_OPERATE]: {
    routes: ["/admin/scanner", "/door"],
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
      // Four addresses left this list on 2026-08-14 — `/admin/analytics`, its
      // `compare` and `members` children, and `/admin/finance` — because the
      // owner removed both surfaces. The rows go with the pages, in the same
      // commit: an address bound here but served by nobody is a promise this
      // map cannot keep, and `staff-tabs.ts` asserts against exactly that.
      //
      // **Un quinto e' uscito il 2026-09-21, per la stessa regola.** Era la
      // pagina che misurava la crescita spaccata fra referral e ingressi
      // diretti; il referral e' uscito dal prodotto (D-50-08/D-50-10) e con lui
      // la pagina, i due grafici e la query che li alimentava. La riga esce
      // **nello stesso commit** dei file: il commento sopra dichiara la regola,
      // e lasciarla qui l'avrebbe smentita sulla riga successiva. *(Il suo
      // indirizzo non si scrive nemmeno in questo commento: un criterio di
      // accettazione fa il grep di questo file per trovarlo.)*
      //
      // `/admin/newsletter` **resta** (D-50-17): una newsletter e' una mailing
      // list, non un account, e non ha niente a che vedere con le iscrizioni
      // che questa fase toglie.
      "/admin/newsletter",
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
      "/admin/events/[id]/livecuts",
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
   * `staff.manage` gates the WRITE actions on the nights and the rows behind
   * them — the 34 policies of P1, `assertMayManageEvent`, the cover route
   * `/api/media/finalize-cover` — and **no address of its own**.
   *
   * Until 2026-10-02 this entry bound it to `/admin/events/[id]/media`, the
   * moderation page (finding F1: that page had no gate of its own, and took its
   * organizer twin's). The page left with the gallery in plan 52.1-16
   * (D-52.1-17), and plan 52.1-18 (DBT-13) moves the key to the table branch
   * instead of leaving it bound to an address that is no longer on disk. The
   * addresses an organizer works on are opened by `organizer.access` and
   * `party.manage`, above and below; this key stays what it always was
   * underneath them, the gate on the data.
   *
   * The table branch carries no `alsoGatesTables` — the field does not exist
   * there — so the count of flagged entries in the `Binding` docblock drops by
   * one for this move as well as for `gallery.view`'s exit.
   */
  [CAP.STAFF_MANAGE]: {
    scope: "table",
    reason:
      "Gates the write actions on the nights and the tables behind them (P1, assertMayManageEvent, the cover route), not a page; its only page, /admin/events/[id]/media, left with the gallery (DBT-13).",
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
   * ── `membership.card.view` stava qui, e non c'e' piu' ──────────────────────
   *
   * Era l'unica voce **fuori** dall'albero di lavoro: legava
   * `/membership-card` e `/attendance`, due indirizzi da socio. Il piano 51-04
   * ha tolto le due pagine, il piano 51-08 ha tolto la chiave dal catalogo e da
   * `CAP` (D-51-07), e la voce esce **con la chiave** — perche' questa mappa e'
   * un `Record` TOTALE su `CapabilityKey`: lasciare le rotte senza la chiave non
   * compila, e lasciare la chiave senza le rotte sarebbe una voce che mente.
   *
   * Non apre nulla: `_everyStaffRouteIsBound` guarda i soli indirizzi sotto
   * `/admin`, e il middleware fallisce chiuso solo dentro l'albero di lavoro
   * (`isUnderWorkTree`). Due indirizzi che non esistono piu' su disco non hanno
   * bisogno di un legame, e darglielo sarebbe una mappa che descrive un
   * prodotto diverso da quello spedito.
   */
  [CAP.MASTER_MANAGE]: {
    scope: "table",
    reason:
      "Gates rows and server-side operations, not addresses; the guard is `guards.mayManageEvent` in `src/lib/capabilities/guards.ts`.",
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

  /**
   * `membership.active` stava qui con `scope: "table"`. Le sue quattro
   * concessioni erano gia' state cancellate dalla fase 50 (D-50-28); la chiave
   * esce dal catalogo e da `CAP` con il piano 51-08 (D-51-07), e questa voce
   * esce con lei — un `Record` totale non ammette il residuo.
   */
  [CAP.DOOR_SUPERVISE]: {
    scope: "table",
    reason:
      "Gates a Route Handler, not a page; the guard is `src/lib/door/require-operator.ts`. See D-34-13 in the module docblock.",
  },

  // `media.upload` stava qui con `scope: "table"`, con una guardia propria
  // (uscita a sua volta il 2026-10-14 con l'archivio del visual, fase 53).
  // Esce dal catalogo e da `CAP` il 2026-10-02
  // (piano 52.1-18, DBT-13) con la gallery: nessun percorso vivo la leggeva
  // piu', e un `Record` totale non ammette il residuo.

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

  // Le voci del calendario di produzione (due indirizzi, `alsoGatesTables`) e
  // di Location (due indirizzi, `alsoGatesTables`) stavano qui. Escono il
  // 2026-10-14 (fase 53, CUT-01, D-53-02) con le loro pagine e le loro chiavi:
  // un `Record` totale non ammette il residuo, e `typedRoutes` rifiuta una voce
  // che punta a una pagina tolta — e' la prova che chiave, voce e pagina sono
  // uscite insieme. Le tabelle e le concessioni restano nel database fino alla
  // migration del piano 53-07, applicata dopo il deploy: questa mappa decide
  // un redirect, la RLS continua a rifiutare la lettura fino a quel momento.

  /**
   * The sound manifesto — the body of rules that can say it is not written.
   *
   * A key of its own, because PROD-02 makes entitlement per SECTION (D-45-04):
   * what a manifesto holds is authored prose written for whoever goes into a
   * booth, and it is a different audience question from a list of spaces under
   * negotiation. No fold into a broader key.
   *
   * ── Why the move happens in the SAME COMMIT as the page ─────────────────────
   *
   * This entry sat on the `scope: "table"` branch from plan 45-05 until now,
   * which was the only TRUE declaration available while the key gated rows and
   * no address. The moment `page.tsx` landed, that declaration became the trap
   * its remaining sibling still carries in words: **a page bound to a table-only
   * key is unreachable for EVERYONE.** `resolveRoute` returns `null`, every
   * caller must treat `null` as a refusal, and the middleware fails closed —
   * with **no build error and nothing in a log.** This project has no error
   * tracking at all, so a section down for everybody is a section nobody learns
   * is down except by opening it.
   *
   * The asymmetry decides the order and is the reason this is not a tidy-up
   * afterwards: a page on disk with no entry here is a build error, loud and
   * immediate; an entry whose page is not on disk is silent. So the loud failure
   * is the one allowed to exist for zero commits.
   *
   * ── `alsoGatesTables` is carried, and it is NOT optional here ───────────────
   *
   * The key does gate rows: the `SELECT` arms of
   * `20260817120300_production_sections_access.sql` on `production_section` and
   * `production_open_question` (and, until 2026-10-14, on the visual archive's
   * table, which left with its section — D-53-04), applied to production by
   * plan 45-08. The flag is optional on this branch, so omitting it would have
   * produced no error at all — just a declaration that lies by
   * omission, which is the lie D-34-11 exists to prevent.
   *
   * ── ONE pattern, and the ambiguity check is DERIVED rather than assumed ─────
   *
   * `/admin/manifesto` is two literal segments. The other two-segment `/admin/*`
   * patterns — `/admin/scanner`, `/admin/newsletter`, `/admin/artists`,
   * `/admin/venues`, `/admin/members`, `/admin/events`, `/admin/formats` — are
   * all literal and all differ in their second segment. No tie. *(Re-derived on
   * 2026-10-14: the two production siblings this list named left with their
   * sections, and a list that proves the absence of a tie names the patterns
   * that exist.)* There is no dynamic sister: a manifesto
   * section has no page of its own, the whole body of rules is one screen, and
   * an address per section would be a second predicate for no reader.
   *
   * ⚠ That check is worth the paragraph because of WHEN it fires. The throw at
   * the foot of this file runs at **module load inside a middleware bundle**, not
   * at `npm run build` — so a tie is not a broken page, it is a 500 on every
   * route the middleware covers, the payments webhook and the door's scan path
   * included. The deploy rule stands: ship on a day without a night, and make the
   * first request yourself.
   *
   * ── The page arrived with this entry. The TAB does NOT follow here. ─────────
   *
   * `staff-tabs.ts` gains no `Manifesto` entry in this commit — that is plan
   * 45-18. The order is forced rather than chosen: `StaffTab.href` is `Route`,
   * and a static address enters the generated union only once a `page.tsx`
   * serves it. Until the tab lands, the section is reachable by address and from
   * nothing else.
   *
   * ── The middleware is UX. The RLS is the boundary. ──────────────────────────
   *
   * This entry decides where a **redirect** happens. It stops somebody arriving
   * on `/admin/manifesto`; it stops nobody reading a `production_section` row.
   * The boundary is the `SELECT` policies — which is precisely why the page reads
   * with the cookie-bound client rather than the service one.
   */
  [CAP.PRODUCTION_MANIFESTO_MANAGE]: {
    routes: ["/admin/manifesto"],
    alsoGatesTables: true,
  },

  // La voce del visual (un indirizzo, `alsoGatesTables`) stava qui. Esce il
  // 2026-10-14 con la sua pagina, l'archivio e la sua chiave (fase 53, CUT-01,
  // D-53-04): il manifesto resta, ed e' ora l'unica sezione di produzione. La
  // misura del ramo `scope: "table"` che la sua docblock portava resta vera:
  // nessuna chiave di sezione e' parcheggiata li', ne' lo e' mai stata la
  // superstite.

  // `gallery.view` stava qui (`routes: ["/gallery"]`, `alsoGatesTables: true`;
  // fase 52, D-52-12 / D-52-13 / D-52-14). Esce il 2026-10-02 (piano 52.1-18,
  // DBT-13): la pagina e' uscita col piano 52.1-16, la chiave esce da `CAP` e
  // dal catalogo con M-D (`20261001120200_gallery_removal.sql`). La gallery non
  // e' chiusa, e' tolta: non c'e' un passo per «riaprirla» — tornare sarebbe
  // una decisione nuova, con una chiave nuova e le sue concessioni.
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
