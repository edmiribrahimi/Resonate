import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { CAP } from "@/lib/capabilities/keys";

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
 * The `/organizer/*` routes a live assignment may open. **One route, not the
 * tree**, and the difference is the whole safety of the widening below.
 *
 * Two pages under `/organizer` carry **no server-side check of their own** —
 * verified with `grep -rL` over every `page.tsx` in the group:
 *
 *   - `src/app/(organizer)/organizer/page.tsx` — a bare `redirect()`, nothing
 *     else. It is **deliberately not on this list.**
 *   - `src/app/(organizer)/organizer/events/[id]/media/page.tsx` — had none
 *     until plan 35-16 gave it one, and is likewise not on this list.
 *
 * Widening `/organizer/*` wholesale would hand both of them to anybody holding
 * any live assignment for any night, because the middleware is the only thing
 * standing in front of them. **A route earns a place on this list only once it
 * already has its own server-side gate**, and the list grows one route at a
 * time, as a decision, never as a convenience.
 *
 * The expressions are **anchored on both ends**. The id segment is `[^/]+` and
 * the tail is `(?:/|$)`, so `/organizer/events/<id>/review` and
 * `/organizer/events/<id>/review/anything` match, while
 * `/organizer/events/<id>/x/review` and `/organizer/events/<id>/reviewers` do
 * not. A `.*` anywhere in here would quietly re-open the tree this list exists
 * to keep shut.
 */
const ORGANIZER_ASSIGNMENT_ROUTES: readonly RegExp[] = [
  /^\/organizer\/events\/[^/]+\/review(?:\/|$)/,
];

const isOrganizerAssignmentRoute = (pathname: string) =>
  ORGANIZER_ASSIGNMENT_ROUTES.some((route) => route.test(pathname));

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
  // an oversight. `MobileNav` and `StaffNav` are `"use client"` components that
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
   * Read by position, in this order and only this order. It is called on the
   * two rules that consulted the assignments — the scanner and the organizer
   * area — and on those alone: the `/admin` and `/membership-card` rules have
   * no assignment arm, so reporting an assignment cause there would explain a
   * decision that was never taken that way.
   *
   * `context-stale` will fire **loudly** until the migration carrying the key
   * is applied: with the key absent every refusal on those two rules is a
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

  // Protected routes requiring authentication
  const protectedPrefixes = [
    "/dashboard",
    "/membership-card",
    "/attendance",
    "/admin",
    "/organizer",
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
    // Authenticated: enforce role-based access

    // The ordering below is load-bearing and is NOT a lookup table on purpose.
    // /admin/scanner is tested BEFORE the general /admin branch, as an
    // if / else if pair: invert them and /admin/scanner matches
    // startsWith("/admin") first, is judged by admin.access, and every
    // organizer is locked out of the door — the refusal that happens in front
    // of a queue. The two rules that follow are SEPARATE `if` statements, not
    // a continuation of that chain: a request that fell through the /admin
    // pair is still tested against both.

    // /admin/scanner -> door.operate (role alone: door.operate is granted with
    // requires_approved = false, deliberately, so a pending organizer is not
    // refused at the door)
    //
    // ── Widened, and the widening is half of one indivisible change ──────────
    //
    // `staff` does **not** hold `door.operate` by role: it is one of the six
    // declared refusals of phase 43's staff role
    // (`20260808000500_staff_role.sql`). So before this line existed, a member
    // of staff **assigned to work this night's door** was bounced to
    // `/dashboard` before the scanner page existed at all — before the party
    // resolver, before `requireDoorOperator({ partyId })`, before the offline
    // drain. The machine this phase built was unreachable by the person it was
    // built for.
    //
    // The fix is not "ask the per-night question here", because that question
    // has no subject here: at routing time no night has been chosen. It is the
    // split this project already declares as its architecture — **the
    // middleware is UX, the boundary is server-side**:
    //
    //   1. here, a COARSE test: role, **or** a live assignment for the right
    //      trade, on some night;
    //   2. downstream, the real one: `requireDoorOperator({ partyId })` on the
    //      three door routes, and the night list that `/api/tickets/attendance`
    //      filters by assignment (plan 35-10) — somebody assigned to another
    //      night reaches this page and does not find that night in it.
    //
    // The edit is INSIDE the existing branch on purpose. The `if / else if`
    // pair above is load-bearing; adding a rule before it would let
    // `/admin/scanner` be judged by `admin.access` and lock every organizer out
    // of the door.
    if (pathname.startsWith("/admin/scanner")) {
      if (
        !capabilities.has(CAP.DOOR_OPERATE) &&
        !holdsByAssignment(CAP.DOOR_OPERATE)
      ) {
        return bounceToDashboard(assignmentBounceCause());
      }
    }
    // /admin/* (except scanner) -> admin.access (granted to master alone)
    else if (pathname.startsWith("/admin")) {
      if (!capabilities.has(CAP.ADMIN_ACCESS)) {
        return bounceToDashboard();
      }
    }

    // /organizer/* -> organizer.access (master or organizer, status ignored),
    // OR a live `party.manage` assignment on ONE allow-listed route.
    //
    // The allow-list is the whole safety of this arm: see
    // `ORGANIZER_ASSIGNMENT_ROUTES` above for the two pages under this prefix
    // that have no server-side check of their own and must not be opened by an
    // assignment. `party.manage` is the right key and `organizer.access` is
    // not: the first is one night's operational surfaces, the second is the
    // area, which is a property of the account with no night in it
    // (`keys.ts`).
    //
    // The real per-night gate is on the page — the review list re-asks
    // `party.manage` **against the night resolved from `?party=`**, so changing
    // that parameter to a night one is not assigned to is refused there. This
    // test cannot do that: it has no night.
    if (pathname.startsWith("/organizer")) {
      const openedByAssignment =
        isOrganizerAssignmentRoute(pathname) &&
        holdsByAssignment(CAP.PARTY_MANAGE);

      if (!capabilities.has(CAP.ORGANIZER_ACCESS) && !openedByAssignment) {
        return bounceToDashboard(assignmentBounceCause());
      }
    }

    // /membership-card, /attendance -> membership.card.view (granted to all
    // three roles with requires_approved = true, which is `status =
    // 'approved'` for any role — the predicate this replaces)
    if (
      pathname.startsWith("/membership-card") ||
      pathname.startsWith("/attendance")
    ) {
      if (!capabilities.has(CAP.MEMBERSHIP_CARD_VIEW)) {
        return bounceToDashboard();
      }
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
