import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { CAP } from "@/lib/capabilities/keys";
import { CAPABILITY_ROUTES, resolveRoute } from "@/lib/routes/capability-routes";

/**
 * Set on the RESPONSE when the access context could not be resolved.
 *
 * This project has no error tracking — no monitoring dependency in
 * `package.json` — so a `console.error` goes to a log nobody watches. On a
 * failure the four rules below fail closed to exactly today's verdicts, which
 * means the user sees an ordinary bounce to `/dashboard` and cannot tell an
 * infrastructure fault from a permissions refusal. This header is the
 * difference: it rides every response the middleware produces on the degraded
 * path, redirects included, so the failure is *observable* and not merely
 * logged (`meta-gates.md`, zero fallimenti silenziosi; D-28).
 *
 * It is never read. Nothing downstream branches on it, and the inbound copy is
 * deleted with the three `x-user-*` names below for the reason recorded there:
 * an inbound header is attacker-supplied input.
 */
const CAPABILITY_DIAGNOSTIC_HEADER = "x-capabilities-resolve-failed";

/**
 * The three reasons a bounce can have, as VALUES.
 *
 * A gate that bounces a **validly assigned** member of staff to `/dashboard` at
 * two in the morning, in front of a queue, is a new way of refusing somebody at
 * the door — precisely the failure this product has already decided it will not
 * build (`checkin-offline.md`, the asymmetry: a false refusal is the worse of
 * the two errors). The coarse rules below cannot rule that out, because they
 * cannot see the night. So the requirement is the next one down: **if the
 * bounce happens anyway, the person must be able to tell which of three things
 * happened**, and none of the three is "you have no business here".
 *
 *   - `unavailable`       — the lookup itself failed. Not a decision at all.
 *   - `context-stale`     — the payload did not carry tonight's assignments, so
 *                           the question could not be asked.
 *   - `not-assigned-here` — assignments exist, and none of them opens this.
 *
 * Each is a value **decided by position** — which line set it — and never a
 * sentence to be interpreted downstream. Next redacts server-side error
 * messages in production builds (CR-01, `32-REVIEW.md`), and a category that
 * has to reach a screen cannot travel in prose. `/dashboard` renders one notice
 * per value and renders **nothing** for a value it does not know: `?access=` is
 * a query string, so it is attacker-supplied input, and an invented value must
 * not be able to draw an authoritative-looking notice.
 */
const BOUNCE_RESOLVE_FAILED = "unavailable";
const BOUNCE_CONTEXT_STALE = "context-stale";
const BOUNCE_NOT_ASSIGNED_HERE = "not-assigned-here";

/**
 * The two assignment-shaped causes. `null` is the fourth case and carries no
 * parameter at all: the ordinary refusal this file has always produced, for
 * somebody who holds no assignment and is simply not entitled to the route.
 */
type BounceCause =
  | typeof BOUNCE_CONTEXT_STALE
  | typeof BOUNCE_NOT_ASSIGNED_HERE
  | null;

/**
 * The allow-list that used to stand here has moved into the route map, and the
 * paragraph that made it safe travelled with it.
 *
 * It was a one-entry array of anchored regular expressions naming the single
 * `/organizer/*` address a live per-night assignment could open. It is now the
 * `assignmentOpenable: true` flag on `party.manage`'s
 * `/admin/events/[id]/review` entry in `src/lib/routes/capability-routes.ts`,
 * whose `Binding` docblock carries the rule verbatim: *a route earns a place
 * there only once it already has its own server-side gate, and the list grows
 * one route at a time, as a decision, never as a convenience.* Confirmed
 * present at `capability-routes.ts:136-149` before the expressions were
 * deleted — deleting the paragraph and the regex together is how a safety rule
 * becomes folklore.
 *
 * The anchoring worry the old paragraph spent half its length on is gone by
 * construction, not by care: `resolveRoute` walks segments and compares
 * lengths, so there is no `.*` to misplace and no unanchored tail to match
 * `/reviewers`.
 *
 * ── Finding F1, replacing a claim this file made that is wrong in BOTH
 *    directions ─────────────────────────────────────────────────────────────
 *
 * The deleted paragraph said two pages under `/organizer` carried no
 * server-side check of their own. Re-measured 2026-08-09, on this tree, it is
 * wrong in **both** directions:
 *
 *   - the media surface's organizer twin **does** gate, on `CAP.STAFF_MANAGE`,
 *     at line 63 of its page. Plan 35-16 gave it that gate and this comment was
 *     never re-measured afterwards.
 *   - `src/app/(admin)/admin/events/[id]/media/page.tsx:17` — the `/admin`
 *     copy, which the paragraph never mentioned — has **only**
 *     `if (!user) redirect("/login")`. That is the ungated one.
 *
 * So the surviving instance of the pattern the paragraph warned about is under
 * `/admin`. The route map binds that address to `staff.manage`
 * (`capability-routes.ts`, the F1 entry), which is the twin's own predicate and
 * changes nobody's reach: an organizer already saw this surface at the other
 * address under the same key, and staff and members are refused here before and
 * after. What remains true is that the `/admin` copy is, today, a surface
 * standing behind a redirect and nothing else — and `access-gating.md` is
 * explicit that a redirect is not a boundary. Giving it the twin's gate belongs
 * to the page-collapse plans of this phase, which own that file; it is recorded
 * here rather than carried forward as prose that was last true a phase ago.
 *
 * The organizer area's own index page is still a bare `redirect()` — and after
 * plan 34-03 it is unreachable, because that address answers with a redirect
 * emitted in `src/middleware.ts` before this file runs at all.
 */

/**
 * The door's bindings — **both addresses** — asserted at module load.
 *
 * ── Why a throw stands where a comment used to ───────────────────────────────
 *
 * What was here was a paragraph: *the ordering below is load-bearing, invert it
 * and `/admin/scanner` is judged by `admin.access` and every organizer is
 * locked out of the door.* Precedence-by-declaration-order is gone — the map's
 * resolver reads the pattern and never the position, proved by mutation C of
 * plan 34-01 with this entry declared last — so that paragraph has nothing left
 * to warn about.
 *
 * The hazard it was really about does survive, one level up: **the binding
 * itself is data now, and data can be edited.** Move `/admin/scanner` into
 * `admin.access`'s list and nothing in plan 34-01 objects — the totality
 * assertion still sees a bound route, the ambiguity throw still sees one
 * pattern, `npm run build` is still green, and the door is master-only. That is
 * the same failure as the inverted `if / else if`, arriving through the door
 * the collapse opened.
 *
 * So the invariant is stated as a value and checked, in the file whose job it
 * is to honour it:
 *
 *   1. `/admin/scanner` resolves, and resolves to `door.operate`;
 *   2. that entry is assignment-openable, because a member of staff assigned to
 *      tonight's door holds `door.operate` by assignment and by nothing else —
 *      `staff` is one of the six declared refusals of the role
 *      (`20260808000500_staff_role.sql`). Losing the flag would not refuse a
 *      stranger; it would refuse the person rostered to work the door, at two
 *      in the morning, in front of a queue.
 *
 * **This check is not decorative and it was not written after the fact.** Run
 * against the map as plan 34-01 left it, clause 2 **fired**: the map carried no
 * assignment arm on the door, because the arm 34-01 transcribed was the
 * `/organizer` allow-list and the scanner's arm — added by phase 35 in a
 * separate widening — had no allow-list to travel with. The flag was added to
 * the map in this same commit. A gate that has already caught something is the
 * only kind worth keeping.
 *
 * ── Where it fires, stated because the answer is not "at build time" ─────────
 *
 * Module-load code in a middleware bundle runs when the runtime instantiates
 * the bundle: **the first request after deploy**, not `npm run build`.
 * Measured, this plan: with `src/middleware.ts` importing the redirect table,
 * a row naming the scanner still exits `npm run build` 0. So this is a loud,
 * immediate 500 on every covered route on the first request — which is worse
 * than a red build and enormously better than a door that quietly refuses the
 * people rostered to work it, in a product with no error tracking.
 *
 * ── Phase 39: the second address gets the assertion the first one has ────────
 *
 * The door has two addresses now (D-39-01, D-39-02), and the newer one gets the
 * same check the older one has had since plan 34-03. The reason is unchanged
 * and travels verbatim: **the binding itself is data now, and data can be
 * edited** — which is exactly as true of the new address as of the old one, and
 * a phase that adds an address without adding its assertion leaves half the
 * door guarded by a mechanism the other half does not have.
 *
 * This block is added in the **same commit as the map edit**, deliberately, so
 * that the two cannot be deployed apart: an assertion shipped ahead of the map
 * it asserts is a 500 by construction.
 *
 * **Each message names the address it is about.** Two doors exist; a failure at
 * 02:00 saying only that "the door" is wrong would send somebody reading the
 * wrong file.
 *
 * ── The deploy rule, which is the only mitigation there is ───────────────────
 *
 * There is no code fix for a first-request throw, so the mitigation is a
 * scheduling one and it is stated as one: **deploy on a day with no night
 * scheduled, and make the first request yourself.** A wrong map is a 500 on
 * every route the middleware covers, discovered by whoever makes that request —
 * and it must not be somebody at the door. Recorded as §0.6 of
 * `.planning/phases/39-the-door-s-own-address/39-DOOR-PASS.md`.
 */
// Read from the map, never hand-copied. A literal list here would be a second
// declaration of the door's addresses, and the whole shape of Phase 39 is
// *one* entry opening both — a copy that drifts is the second predicate
// `39-CONTEXT.md` forbids, wearing a different hat. Deriving it does not make
// the assertions below tautological: they check that `resolveRoute` **agrees**
// with the declaration, which a second entry claiming an overlapping pattern
// would break while this array stayed right.
const DOOR_ADDRESSES = CAPABILITY_ROUTES[CAP.DOOR_OPERATE].routes;

for (const doorAddress of DOOR_ADDRESSES) {
  const doorBinding = resolveRoute(doorAddress);

  if (doorBinding === null || doorBinding.key !== CAP.DOOR_OPERATE) {
    throw new Error(
      `middleware: "${doorAddress}" resolves to ${
        doorBinding === null ? "no capability at all" : `"${doorBinding.key}"`
      }, not "${CAP.DOOR_OPERATE}". The door's address is judged by the door's ` +
        `capability, and by no other. Fix the binding in ` +
        `src/lib/routes/capability-routes.ts.`
    );
  }

}

/**
 * ── `assignmentOpenable`: la stessa garanzia, spostata al COMPILATORE ────────
 *
 * Qui sotto c'era un secondo `throw` a module-load, e un throw a module-load in
 * questo file non fallisce a `npm run build`: fallisce quando il runtime
 * **istanzia il bundle del middleware**, cioe' alla **prima richiesta dopo il
 * deploy**. E il middleware copre ogni rotta che matcha, quindi quel 500 arriva
 * anche dove non c'entra niente — `/api/webhooks/sumup`, i quattro cron,
 * `/api/tickets/checkin`. **Una configurazione sbagliata della porta metteva
 * giu' la strada dei soldi**, attraverso il bundle condiviso e non attraverso una
 * riga che qualcuno avesse scritto.
 *
 * Non e' stato tolto: e' stato **spostato dove costa meno**. Le due righe sotto
 * dicono la stessa cosa al compilatore, quindi il fallimento arriva a `next
 * build` — prima del deploy invece che dopo — ed e' il todo
 * `module-load-throws-500-the-whole-middleware-surface` che chiede esattamente
 * questo: *«spostare le parti dimostrabili al livello dei tipi»*.
 *
 * **Perche' e' una sostituzione sicura e non una rimozione.** Il controllo a
 * runtime guardava `resolveRoute(doorAddress).assignmentOpenable`. Ma se
 * `doorBinding.key === CAP.DOOR_OPERATE` — che il throw qui sopra continua a
 * pretendere, ed e' il caso dello *shadowing*, l'unico che resta davvero
 * runtime — allora quel binding **e'** la entry della porta, e il suo
 * `assignmentOpenable` viene compilato da questa dichiarazione
 * (`capability-routes.ts:984`). Dichiarazione piu' identita' della chiave
 * implicano il flag: le due condizioni insieme sono cio' che il throw
 * verificava.
 *
 * `Binding` dichiara `assignmentOpenable?: true`, quindi il valore `false` non
 * e' nemmeno rappresentabile: l'unico modo di romperlo e' **togliere la
 * proprieta'**. Indicizzare un tipo con una chiave che non ha e' un errore di
 * compilazione — che e' precisamente il rilevatore che serve.
 */
type DoorBinding = (typeof CAPABILITY_ROUTES)[typeof CAP.DOOR_OPERATE];
const _doorIsAssignmentOpenable: true =
  true satisfies DoorBinding["assignmentOpenable"];
void _doorIsAssignmentOpenable;

/**
 * The first segments of the collapsed work surface. **Plural since Phase 39.**
 *
 * SEGMENTS, not prefixes, and the difference is the only reason this is worth a
 * constant: a prefix test would claim `/administrators` for the work tree, and a
 * first-segment comparison does not. Nothing decides a capability here — the map
 * does that — this only answers *is this address one the map is supposed to have
 * an opinion about*, which is what makes an unmapped path under the tree a
 * refusal instead of a fall-through (T-34-13).
 *
 * ── Why `door` had to join it, and why naming the gap was not closing it ─────
 *
 * Phase 39 gave the door a second address outside `/admin`, and this set stayed
 * at one root. `/door` itself is bound, so it never reaches this branch and
 * nothing was wrong on the day. But the tree now has two roots, and the second
 * one was **uncovered**: add `src/app/(admin)/door/settings/page.tsx` and forget
 * its map entry, and `resolveRoute` returns `null`, this predicate returns
 * `false`, the `else if` is not taken, and **no bounce is emitted at all** —
 * precisely the fall-through T-34-13 exists to prevent, on the tree that hosts
 * the door.
 *
 * The compiler could not have caught it either: `StaffRoute` is
 * `Extract<Route, "/admin" | "/admin/${string}">`, so `_everyStaffRouteIsBound`
 * will never report an unbound `/door*` address. That left `npm run verify:routes`
 * — a manual pre-deploy step with no CI (D-34-12) — as the only cover.
 *
 * The door page's docblock named both gaps accurately and then treated naming
 * them as disposing of them. Found by the Phase 39 code review (WR-03); this is
 * the one line it cost.
 */
const WORK_TREE_ROOTS = new Set(["admin", "door"]);

const isUnderWorkTree = (pathname: string) =>
  WORK_TREE_ROOTS.has(pathname.split("/")[1] ?? "");

export async function updateSession(request: NextRequest) {
  // Track cookies set by Supabase so we can re-apply them after creating
  // the final response with injected headers
  let pendingCookies: Array<{
    name: string;
    value: string;
    options: Record<string, unknown>;
  }> = [];

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => {
            supabaseResponse.cookies.set(name, value, options);
            // Track for re-application after header injection
            pendingCookies.push({ name, value, options: options as Record<string, unknown> });
          });
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  // Resolve the access context from the ONE definition — the same
  // private.has_capability() the row-level policies ask, reached through the
  // one exposed wrapper. This replaces the profiles.select("role, status")
  // that stood here: same number of round trips, not one more (D-05). The
  // matcher includes /api/*, so this path runs before every door scan, and a
  // second query here would be a second query on a phone on a bad network in
  // front of a queue.
  //
  // The call stays INSIDE `if (user)` deliberately: the access-context wrapper
  // invoked below is granted to `authenticated` and revoked from `anon`, so an
  // anonymous request must not call it at all rather than call it and be
  // refused.
  //
  // The middleware no longer keeps `role` and `status` as values at all. It
  // used to, for one reason only: the header-injection block that stood below
  // needed them. Phase 33 deleted that block, and with it the last consumer.
  // No decision in this file has ever read them.
  //
  // They DO still travel in the access-context payload, and that is not
  // an oversight. `AppNav` and `StaffNav` are `"use client"` components that
  // take `role` and `status` as props and cannot import the DAL, so a parent
  // Server Component resolves them and passes them down. Removing the two
  // fields from the payload is STAFF-03 in phase 34, not this phase — doing it
  // here would turn a transport swap into a nav redesign.
  let capabilities = new Set<string>();
  let capabilitiesResolveFailed = false;

  // ── The coarse assignment answer, and the distinction it carries ────────────
  //
  // `Set<string> | null`, with the SAME three states the data-access layer
  // declares (`src/lib/capabilities/server.ts`, *The three states are the
  // point*):
  //
  //   - `null`      — the key was **not in the payload**. One known cause: the
  //                   migration that adds it is not applied while code that
  //                   presumes it is already running. The deploy is ahead of
  //                   the database.
  //   - empty `Set` — asked and answered: no live assignment. A fact.
  //   - full `Set`  — the trades a live assignment carries, on **some** night.
  //
  // **`?? false` on this field destroys the contract in one character**, and
  // plan 35-15 left the warning by name: it turns *"the migration queue is
  // behind"* into *"you are not working tonight"*, which is a refusal in front
  // of a queue with nothing in this product to report it — there is no error
  // tracking. So the two are separated **by position** below: the verdict has
  // to refuse on `null` (admitting on a missing key would open the door to
  // every authenticated account the moment a migration lags), but the CAUSE
  // says which of the two it was, and `/dashboard` draws them differently.
  //
  // It stays `null` for a caller with no session, and that is unreachable
  // rather than chosen: the anonymous branch below redirects to `/login` and
  // never calls `bounceToDashboard()`. `ANONYMOUS_CONTEXT` in the DAL takes the
  // empty set instead, for a reason that does not apply here — it is a value
  // somebody can read.
  //
  // **This field never decides which NIGHT.** It cannot: at routing time the
  // person has not chosen a date, so there is no night to name. It is wider
  // than the real permission by construction, which is why the two rules it
  // widens are paired, in this same plan, with a real per-night gate
  // downstream. Reading it decides **where somebody may go**, never what they
  // may read.
  let liveAssignmentCapabilities: Set<string> | null = null;

  if (user) {
    const { data, error } = await supabase.rpc("my_access_context");

    if (error) {
      // The old code discarded this error and silently defaulted to
      // member/pending. The DEFAULTS are preserved below, because CAP-03
      // requires every verdict to be the one it was — but the SILENCE is not.
      capabilitiesResolveFailed = true;
      console.error(
        `[capabilities.resolve_failed] middleware could not resolve the access ` +
          `context for ${request.nextUrl.pathname} — code=${error.code ?? "unknown"}. ` +
          `Failing closed to member/pending with no capabilities: every ` +
          `capability-gated route now bounces to /dashboard.`
      );
    }

    const context = data as {
      capabilities?: unknown;
      live_assignment_capabilities?: unknown;
    } | null;

    // An authenticated user with no profile row is a pending member, and the
    // capability set for that subject is the empty set — which produces the
    // same verdict on all four rules below as the `?? "member"` / `?? "pending"`
    // defaults did, by a different mechanism. The defaults themselves are now
    // redundant here: nothing in this file consumes `role` or `status`.
    capabilities = new Set(
      Array.isArray(context?.capabilities)
        ? (context.capabilities as string[])
        : []
    );

    // The SAME `Array.isArray` guard as the line above, and a DIFFERENT
    // verdict when it fails — which is the part to read before changing it.
    // An absent `capabilities` collapses to the empty set because the empty
    // set is the correct answer for a subject with no grants; an absent
    // `live_assignment_capabilities` becomes `null`, because "absent" and
    // "empty" are two different facts here and only one of them is about the
    // person. A value that is present but is not an array lands on `null` too:
    // it means the payload does not have the shape declared, which is "no
    // answer", and three states are already the most a reader can be asked to
    // tell apart.
    liveAssignmentCapabilities = Array.isArray(
      context?.live_assignment_capabilities
    )
      ? new Set(context.live_assignment_capabilities as string[])
      : null;
  }

  /**
   * Does a live assignment carry this trade?
   *
   * Written out rather than inlined as `liveAssignmentCapabilities?.has(key)`
   * so that the `null` case is a **stated** refusal and not an accident of
   * optional chaining. The verdict is the same either way — we refuse when we
   * cannot tell — but the shape matters: the next editor who reaches for
   * `?? false` finds a named function and the paragraph above it instead of a
   * one-character edit that silently deletes the third state.
   */
  const holdsByAssignment = (key: string) =>
    liveAssignmentCapabilities !== null && liveAssignmentCapabilities.has(key);

  /**
   * Which of the two assignment-shaped causes this refusal is, or `null` for
   * the ordinary refusal that carries no parameter.
   *
   * Read by position, in this order and only this order. There is one call
   * site now instead of two, and the rule it used to state as a convention is
   * enforced by the shape of the code: it is called **only** inside a branch
   * conditioned on `entry.assignmentOpenable`, so an entry with no assignment
   * arm gets `null`. Reporting an assignment cause on such a refusal would
   * explain a decision that was never taken that way.
   *
   * Two route entries carry the flag today — the door and the per-night review
   * — and both of those refusals are still reported with a cause, so neither
   * value below has lost its way to a screen.
   *
   * `context-stale` will fire **loudly** until the migration carrying the key
   * is applied: with the key absent every refusal on those two entries is a
   * refusal taken without the assignment question, including one handed to a
   * member who was never going to be admitted. That is deliberate. It is the
   * one signal that says *the deploy is ahead of the database*, this project
   * has no error tracking to say it anywhere else, and a signal that only fired
   * for people who already hold assignments would never fire at all — nobody
   * can hold a resolvable assignment while the migration is missing.
   */
  const assignmentBounceCause = (): BounceCause => {
    if (liveAssignmentCapabilities === null) return BOUNCE_CONTEXT_STALE;
    if (liveAssignmentCapabilities.size > 0) return BOUNCE_NOT_ASSIGNED_HERE;
    return null;
  };

  // The bounce, which is the same three lines the four rules each wrote
  // inline, plus the diagnostic header on the degraded path. It is one
  // function rather than four copies precisely because of that header: a
  // failure that is observable on the final response but not on the four
  // redirects would be invisible on exactly the requests it breaks.
  //
  // The `cause` argument defaults to `null`, so the three rules that did not
  // change keep calling it with no arguments and keep producing byte-identical
  // URLs. Only the two widened rules pass a cause.
  const bounceToDashboard = (cause: BounceCause = null) => {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    // WR-04. This project has no error tracking, so a response header nothing
    // reads and a log nobody watches are the same thing: the user saw an
    // ordinary bounce and could not tell an infrastructure fault from a
    // permissions refusal. `meta-gates.md` requires an OBSERVABLE effect, not a
    // log line. The search param carries the boolean the middleware already
    // computed — this is transport, not error handling, and no try/catch was
    // added to produce it. The response header stays as well: it costs nothing
    // and it is the only signal available on the non-redirect path below.
    //
    // Precedence, and it is not interchangeable. A failed lookup outranks
    // everything: when the context did not resolve, `liveAssignmentCapabilities`
    // is `null` for that reason and not because a migration is missing, and
    // reporting `context-stale` there would send somebody to look at the
    // database queue for an outage. The header stays bound to this branch and
    // to nothing else — this change gives it no new meanings.
    if (capabilitiesResolveFailed) {
      url.searchParams.set("access", BOUNCE_RESOLVE_FAILED);
    } else if (cause !== null) {
      url.searchParams.set("access", cause);
    }
    const response = NextResponse.redirect(url);
    if (capabilitiesResolveFailed) {
      response.headers.set(CAPABILITY_DIAGNOSTIC_HEADER, "1");
    }
    return response;
  };

  // --- Route protection ---

  // Protected routes requiring authentication.
  //
  // `/organizer` is gone from this list, and it is dead rather than relaxed: a
  // `/organizer/*` address answers with a redirect emitted in
  // `src/middleware.ts` before `updateSession` is called, so no such request
  // reaches this line. Measured while the second tree still stood — the
  // redirect table's fifteen rows were exactly its fifteen `page.tsx` files,
  // one for one — so every organizer address that ever rendered anything is
  // translated first and every other one is a 404 with no page behind it. The
  // tree itself was deleted in plan 34-15; the redirect table is now the only
  // record of what those fifteen addresses were, which is why it is walked
  // rather than trusted (`scripts/verify-organizer-redirects.sh`).
  //
  // The other four are all still real and are untouched. This is a **prefix**
  // test and it stays one, deliberately: it decides only whether an anonymous
  // caller is sent to sign in with their destination in `?redirect=`, which is
  // refusal state 1 of D-34-08 and is not a capability question at all. No
  // capability is read on this branch, and none should be.
  //
  // ── `/door` is the fifth, added by Phase 39, and it is not optional ─────────
  //
  // This list decides only whether an **unauthenticated** caller is bounced to
  // `/login` with `?redirect=`, and it reads no capability. Without `/door` on
  // it, a door phone whose session expired in a pocket is not bounced at all: it
  // meets the page guard, which sends it to `/dashboard`, and `/dashboard` then
  // bounces it to login — so the person working the door signs in and arrives at
  // the **dashboard**, in the dark, with a queue.
  //
  // Blocker **D7** — this file writes `?redirect=` while
  // `src/app/(auth)/login/page.tsx` reads `?next=`, so the destination is lost
  // on every protected address — is **pre-existing and is not repaired here**.
  // Adding this prefix stops Phase 39 from putting a second wrong turn on top of
  // it, and nothing more.
  const protectedPrefixes = [
    "/dashboard",
    "/membership-card",
    "/attendance",
    "/admin",
    "/door",
  ];

  if (!user) {
    // Unauthenticated: redirect from protected routes to login
    if (protectedPrefixes.some((prefix) => pathname.startsWith(prefix))) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("redirect", pathname);
      return NextResponse.redirect(url);
    }
  } else {
    // ── Authenticated: one lookup, where three prefix rules used to be ────────
    //
    // What stood here was an `if / else if` pair for `/admin/scanner` and
    // `/admin`, plus two separate `if`s for `/organizer` and for the two member
    // addresses, and a paragraph explaining that the pair's ORDER was
    // load-bearing: invert it and the door is judged by `admin.access`. That
    // paragraph is deleted with the mechanism it described, because keeping a
    // warning about a hazard that no longer exists is how the next reader learns
    // to distrust the comments.
    //
    // **The precedence is not preserved here. It is made unnecessary.** There is
    // one rule, so there is no order to invert. Which capability opens
    // `/admin/scanner` is decided in `capability-routes.ts` by the specificity
    // of the PATTERN — never by the position of the entry, proved by mutation C
    // of plan 34-01 with the door declared last — and two patterns that could
    // both match one address throw at module load rather than race at request
    // time. The residue that data cannot guard on its own, an editor moving the
    // door's address to another key, is the assertion at the top of this file.
    //
    // **The middleware is UX. The RLS is the boundary.** Reading one declaration
    // in two places does not change which of the two is the guarantee: this
    // decides where somebody may GO, and a row-level policy decides what they
    // may READ. Nothing below is a substitute for a policy, and the page guards
    // downstream re-ask the same question against a subject this code does not
    // have — the night.
    const entry = resolveRoute(pathname);

    if (entry !== null) {
      // Two arms, and the second one exists only where the route entry says so.
      //
      // `assignmentOpenable` is a property of the ROUTE, never of the key and
      // never of a prefix: `party.manage` opens one night's surfaces, and only
      // `/admin/events/[id]/review` among them may be opened by a live
      // assignment. Reading the flag from the entry is what keeps that true when
      // a second `party.manage` route is added by somebody who never reads this
      // file.
      const openedByRole = capabilities.has(entry.key);
      const openedByAssignment =
        entry.assignmentOpenable && holdsByAssignment(entry.key);

      if (!openedByRole && !openedByAssignment) {
        // The cause, and the discipline is in the ternary rather than in a
        // convention. `assignmentBounceCause()` is called on the entries that
        // HAVE an assignment arm and on no others: reporting `context-stale` or
        // `not-assigned-here` for a refusal on a route with no assignment arm
        // would explain a decision that was never taken that way, and a map
        // makes calling it everywhere one keystroke shorter than calling it
        // correctly.
        //
        // `null` is the fourth case and carries no parameter at all — the
        // ordinary refusal this file has always produced. Three causes, none
        // collapsed (D-34-08 state 2); `unavailable` is added by
        // `bounceToDashboard` itself and outranks both of these, which is why it
        // is not decided here.
        return bounceToDashboard(
          entry.assignmentOpenable ? assignmentBounceCause() : null
        );
      }
    } else if (isUnderWorkTree(pathname)) {
      // ── Fail closed, and this is the branch T-34-13 is about ────────────────
      //
      // An address under the work tree that the map does not bind is not an
      // address nobody thought about — it is an address whose binding was
      // deleted, or misspelt, or added as a page and never declared.
      // `capability-routes.ts` says it in as many words: a typo like
      // `"/admin/newsleter"` compiles, resolves to `null`, and the master
      // silently loses the newsletter. **Losing a page is the acceptable half of
      // that trade.** Admitting on `null` would be the other half, and it would
      // hand every unmapped staff address to every signed-in account.
      //
      // Addresses outside the tree fall through exactly as they always did.
      // This map is the whole application's route↔capability map, not a census
      // of everything the matcher sees: `/dashboard`, `/events/[slug]`, `/api/*`
      // and the door's own `/api/tickets/checkin` are not in it and must not be
      // judged by it. `/membership-card` and `/attendance` ARE in it, and are
      // now judged through the same lookup as everything else — they are there
      // precisely because calling them table-scoped would have been a lie.
      return bounceToDashboard();
    }
  }

  // --- Inbound identity-header hygiene ---
  const requestHeaders = new Headers(request.headers);

  // These three lines no longer protect any reader. After phase 33 nothing
  // under src/ reads an identity header — `npm run verify:no-header-identity`
  // asserts it, case-insensitively, and this file is the only one the assertion
  // exempts. They stay anyway, and deliberately.
  //
  // An inbound identity header is attacker-supplied input: the client can send
  // whatever it likes. Deleting it costs three lines and manufactures nothing.
  // What they now prevent is a FUTURE reader — the next person who writes
  // `headers().get(...)` for one of these names, from muscle memory or by
  // copying a pattern out of this file's own git history, would otherwise
  // receive attacker input with no protection at all.
  //
  // The injection that used to sit eleven lines below was removed in the same
  // change, and the asymmetry is the whole point: a header nobody reads that
  // something still MANUFACTURES is a trap, because the manufactured value
  // looks authoritative. A header nobody reads that nothing manufactures and
  // that we delete on the way in is a guard.
  //
  // Identity now comes from the access-context wrapper, via
  // `src/lib/capabilities/server.ts`. Middleware is UX; RLS is the security
  // boundary — this deletion is neither, it is input hygiene, and nothing here
  // substitutes for a row-level policy.
  requestHeaders.delete("x-user-role");
  requestHeaders.delete("x-user-status");
  requestHeaders.delete("x-user-id");
  // Same reason, one header later: the diagnostic below is only ever set on a
  // RESPONSE. An inbound copy is attacker-supplied input, and a client that
  // could assert "the capability lookup failed" to a downstream reader would be
  // handing it a forged excuse.
  requestHeaders.delete(CAPABILITY_DIAGNOSTIC_HEADER);

  // Create response with injected headers
  const finalResponse = NextResponse.next({
    request: { headers: requestHeaders },
  });

  // The degraded path, made visible on the responses that are not redirects.
  if (capabilitiesResolveFailed) {
    finalResponse.headers.set(CAPABILITY_DIAGNOSTIC_HEADER, "1");
  }

  // Re-apply all Supabase cookies to the final response (cookie preservation)
  // Without this, users would be logged out on every navigation because the
  // new response object loses the cookies set by Supabase's setAll callback
  for (const cookie of pendingCookies) {
    finalResponse.cookies.set(cookie.name, cookie.value, cookie.options);
  }

  // Also copy any cookies from the supabaseResponse that may have been set
  // during the initial auth flow (before pendingCookies tracking)
  supabaseResponse.cookies.getAll().forEach((cookie) => {
    if (!pendingCookies.some((pc) => pc.name === cookie.name)) {
      finalResponse.cookies.set(cookie.name, cookie.value);
    }
  });

  return finalResponse;
}
