/**
 * The per-request capability resolver — the application's caller of the one
 * definition.
 *
 * `private.has_capability` (`supabase/migrations/20260807000000_capability_model.sql`,
 * section 4) is the only copy of the profiles-to-grants join. This module does
 * not reimplement it, does not cache its answer beyond one render, and does not
 * read a capability out of a token. It asks
 * `public.my_access_context()` — the one exposed wrapper — on the request that
 * needs the answer. That is what makes CAP-04 true: a grant takes effect on the
 * **next request**, not when a JWT happens to expire.
 *
 * ── Server-only, by construction rather than by declaration ──────────────────
 *
 * `server-only` is not a dependency of this repository and adding a package is
 * outside this plan. It is not needed: `@/lib/supabase/server` calls `cookies()`
 * from `next/headers`, which throws in a client component. The boundary is
 * enforced by the import graph, not by a comment — but the comment says so, so
 * that nobody "simplifies" the client construction and quietly removes it.
 *
 * ── The client is the cookie-bound anon client, deliberately ─────────────────
 *
 * `@/lib/supabase/server`, never `@/lib/supabase/service`. The service client
 * bypasses every row-level policy (`access-gating.md`, gate *service role*), so
 * a capability check performed with it proves nothing about the caller. Worse,
 * it is not even wrong-but-permissive: a service-role token carries no `sub`,
 * so `auth.uid()` is null and `my_access_context()` answers
 * `{"role": null, "status": null, "capabilities": []}` — a confident "no
 * capabilities" about nobody (measured in `32-06-SUMMARY.md` § F1). That is a
 * silent-failure shape, and it is the reason the import below is the one it is.
 *
 * ── The error path is the requirement, not boilerplate ───────────────────────
 *
 * `catch { return new Set() }` is the natural shape and it is the one thing
 * this module must never do. An empty set refuses a master exactly the way it
 * refuses a pending member, and this project has **no error tracking** — no
 * monitoring dependency in `package.json`, so no production error reaches a
 * human on its own (`meta-gates.md`). A resolver that fails quietly turns an
 * infrastructure fault into what looks like a permissions bug, and the person
 * debugging it starts from the wrong table.
 *
 * So: every failure throws, with a category in the message. There is no `catch`
 * in this file that returns a value. The recorded precedent this avoids is the
 * newsletter form, which collapses a network fault, a missing key and an
 * already-subscribed address into "Qualcosa è andato storto"
 * (`.planning/codebase/CONCERNS.md`).
 *
 * ── What the throw does NOT do, and what a caller therefore owes ─────────────
 *
 * Throwing here guarantees only that this module never *returns* a degraded
 * answer. **It guarantees nothing about the surface**, and the first conversion
 * of this phase proved it: `src/app/(admin)/admin/newsletter/actions.ts` became
 * throwable and three of its four callers already swallowed throws — the
 * broadcast list drew `capabilities.resolve_failed` as "No broadcasts yet.", and
 * the page drew it as "set RESEND_API_KEY". A throw that lands in someone else's
 * `catch` is not an observable effect; it is a silent failure with an extra
 * step. (CR-01, `32-REVIEW.md`.)
 *
 * There is also a boundary that no message can cross on its own: Next **redacts**
 * the message of an error thrown out of a Server Action in a production build.
 * A client that branches on `err.message.startsWith("capabilities.resolve_failed")`
 * works in `next dev` and stops working where it matters. A caller that needs the
 * category on the client must carry it as a **value**, not as a message.
 *
 * So the contract has two halves, and only the first one lives in this file:
 *
 *   1. **Here:** every failure throws, with a category in the message, and no
 *      `catch` in this file returns a value.
 *   2. **At the caller:** the failure must reach a human as something other than
 *      an empty result, and must not be collapsed with any other cause. This
 *      project has **no error tracking**, so a log line reaches nobody
 *      (`meta-gates.md`).
 *
 * What that looks like today, call site by call site:
 *
 *   - `src/lib/supabase/middleware.ts` — fails closed and sets
 *     `x-capabilities-resolve-failed`. The header is not read by anything
 *     (WR-04, deferred).
 *   - `src/app/(admin)/admin/newsletter/*` — the four converted call sites
 *     return a tagged `NewsletterResult` and render a distinct notice per cause.
 *   - Anywhere that neither catches nor tags: Next's error boundary. The broken
 *     surface is the observable effect; the `console.error` line beginning
 *     `[capabilities.resolve_failed]` in the Vercel runtime log is the diagnosis.
 *
 * **A new caller of `hasCapability` inherits obligation 2.** Wrapping it in a
 * `catch` that returns `false`, or `[]`, re-creates the defect this file was
 * written to prevent.
 *
 * ── Memoisation, and its limit ───────────────────────────────────────────────
 *
 * `cache()` memoises **within one render**. It does not span requests, and it
 * does not span *executions*: `src/lib/supabase/middleware.ts` runs in its own
 * execution before the render begins and cannot share this cache. So a page
 * whose middleware already resolved the context still pays one round trip when
 * it asks here. That is a real cost, accepted on purpose (D-13), and the way to
 * avoid multiplying it is to resolve once at the top of a surface and pass the
 * set down — not to call `hasCapability` in every leaf component.
 *
 * No file in `src/` imported `cache` from `react` before this one, so the
 * memoisation was measured rather than assumed; the observation is recorded in
 * `32-08-SUMMARY.md`.
 *
 * **And the half that was missing, measured in phase 33's research: `cache()`
 * does NOT memoise inside a Server Action body, and does NOT memoise inside a
 * Route Handler.** Three calls to `getAccessContext()` executed the underlying
 * function ONCE in a Server Component render and THREE TIMES in each of the
 * other two — identically in `next dev` and in a `next build --webpack`
 * production build. So the instruction differs by context, and it is an
 * instruction, not advice:
 *
 *   - In a page or layout: `hasCapability()` may be called freely; it is one
 *     round trip for the whole render.
 *   - In a **Server Action** or a **Route Handler**: destructure
 *     `getAccessContext()` **once** into a local and reuse the local. Never
 *     call `hasCapability()` twice, and never call it beside a
 *     `getAccessContext()` — each is a full round trip.
 *
 * This is undocumented Next.js behaviour, not a guarantee. **Re-measure it on
 * any Next.js minor upgrade**; if it silently starts memoising everywhere the
 * instruction becomes merely redundant, and if it silently stops memoising in
 * renders the cost multiplies across 42 surfaces with nothing to report it.
 *
 * ── Two context functions, and why not one with an optional argument ─────────
 *
 * The next reader will ask it, so here is the answer before the question:
 * `getAccessContext()` and `getPartyAccessContext(partyId)` are two exported
 * functions because **memoisation is keyed on arguments, and the two questions
 * do not have the same answer**.
 *
 * `getAccessContext()` takes nothing, so `cache()` has one entry for the whole
 * render: the caller's role capabilities do not change between two components.
 * `getPartyAccessContext(partyId)` takes the night, so `cache()` keys on it and
 * two nights are two entries — which is the requirement, not an optimisation.
 * A single function with an optional argument would still memoise per argument
 * (`undefined` being one of them), so the merge is *possible*; it is refused
 * because it makes the two questions look like one, and they are not:
 *
 *   - **no night named → the per-night arm is silent, never permissive.** This
 *     is ASSIGN-01, and it is not a TypeScript nicety. The SQL resolver's first
 *     condition is `p_party_id is not null`, and plan 35-03 measured what
 *     happens without it: sixteen probes, **16/16 with the guard, 13/16 with the
 *     "tolerant" form** — and one of the three that flip is the call shape all
 *     **70** RLS policies use. An assignment to one night would grant the
 *     capability everywhere, with no error and no policy definition changed.
 *     The TypeScript surface must not re-introduce that shape by making the
 *     night look like a detail a caller may forget.
 *   - the argument-less form is the one `src/lib/supabase/middleware.ts` calls
 *     on **every navigation**, and the SQL side deliberately kept it as a
 *     separate object rather than changing its signature
 *     (`20260809001000_assignment_resolver.sql`, section 4). Two functions here
 *     mirror two functions there, which is one fewer translation to get wrong.
 *
 * **`p_party_id` names a CONTEXT, never a SUBJECT.** D-04 forbids a resolver
 * that takes a user id, because this repository has **no rate limiting
 * anywhere** and such a function would be a free enumeration oracle. That rule
 * is not relaxed here and is not being bent: the night is not a person, and both
 * arms of the SQL resolver remain anchored on `auth.uid()`. The migration writes
 * the same paragraph, for the same reason — somebody will refuse this function
 * for the right rule and the wrong reason.
 *
 * ── The third question, which is COARSE, and what it does not authorise ──────
 *
 * `liveAssignmentCapabilities` is the answer to *"does this subject hold ANY
 * live assignment, and for which trades?"*. It arrives inside the payload both
 * functions already fetch — one key, no extra round trip — because the caller it
 * exists for is `src/lib/supabase/middleware.ts`, which runs before **every**
 * request, including every scan at the door.
 *
 * **It does not say which night, and no amount of work here would let it.** At
 * routing time the person has not chosen a date, so the middleware has no night
 * to name; putting the night dimension into this field would mean asking N
 * questions instead of one, on that path.
 *
 * So the field is **wider than the real permission, always and by
 * construction**: somebody assigned to *another* night is inside it. **No
 * surface decides with this field alone.** Whoever wants to know whether a
 * person may do something on a night calls `hasCapability(key, { partyId })`,
 * and on the three door routes that write with the service client the boundary
 * is `requireDoorOperator({ partyId })`, because the service client bypasses
 * every policy. Reading the coarse field is deciding **where somebody may go**,
 * never **what they may read** — the middleware-is-UX / RLS-is-the-boundary
 * split, applied to a field instead of to a route.
 */

import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { CapabilityKey } from "./keys";

/**
 * What `public.my_access_context()` returns, one row, always.
 *
 * `userId` is the caller's own `auth.uid()`, added to the payload by
 * `supabase/migrations/20260808000000_access_context_user_id.sql`. It reads
 * second, right after `capabilities`, because it is identity and identity reads
 * first. It is **`string | null`, never `""`** — see `ANONYMOUS_CONTEXT` below,
 * and `@/lib/capabilities/guards`, which is where that distinction is made safe.
 *
 * `role` and `status` are still here, and the reason has changed. It is no
 * longer the header injection in `src/lib/supabase/middleware.ts`, which plan
 * 33-14 deleted outright
 * (measured: **44** files read the injected role/status headers, not 46, and
 * phase 33 takes that count to **0**). It is `MobileNav` and `StaffNav` — two
 * `"use client"` components that take `role` and `status` as props and
 * therefore cannot import this module. Next.js's own guidance for that case is
 * to resolve in a parent Server Component and pass the values down as props,
 * which is exactly what the converted pages do. Converting those two components
 * to consume capabilities is **phase 34 (STAFF-03)**, and that phase owns
 * removing these two fields from the payload.
 *
 * **No new caller may branch on `role` or `status`.** A page passing them to a
 * nav is not branching. Every decision asks `capabilities`.
 *
 * ── `liveAssignmentCapabilities`, and the distinction everything rests on ─────
 *
 * Added to the payload by
 * `supabase/migrations/20260809005000_live_assignment_flag.sql` — **row 14 of
 * the 15-row queue** in `.planning/phases/35-per-night-assignments/35-HUMAN-UAT.md`,
 * the last row of block A2. It reads last because it is the coarsest answer and
 * the newest, and because appending it kept the migration a pure addition to the
 * four keys already there.
 *
 * **The three states are the point, and collapsing two of them is a silent
 * failure:**
 *
 *   - **`null`** — the key was **not in the payload**. In this product that has
 *     one known cause: row 14 is **not applied** while code that presumes it is
 *     already running. That is the false-green state `35-HUMAN-UAT.md` declares
 *     out loud — `npm run build` is green with **zero** migrations applied,
 *     because the types come from `src/types/database.ts` and no client in this
 *     repository is parameterised with a `Database` generic, so
 *     `supabase.rpc("my_access_context")` is untyped and the compiler never sees
 *     the payload.
 *   - **an empty `Set`** — the question was asked and answered: **no live
 *     assignment**. A fact, not a fault.
 *   - **a non-empty `Set`** — the trades.
 *
 * Collapsing `null` into the empty set would make *"the migration queue is
 * behind"* indistinguishable from *"this person is not working tonight"* — and
 * the second sentence is the one somebody would read **in front of a queue**.
 * This project has **no error tracking** (`meta-gates.md`), so nothing else
 * would ever report the difference. It is therefore a value **decided by
 * position** — `null` versus a `Set` — and never a string to interpret; the same
 * rule `guards.ts:73-79` states for a category that must cross to a client.
 *
 * **`Set<string>` and not `Set<CapabilityKey>`, deliberately.** `capabilities`
 * is derived from the catalogue itself — the SQL selects `c.key from
 * private.capabilities c` — so every element is a catalogue key by construction
 * of the query. This one is read from a **data column**,
 * `party_assignments.capability`; a foreign key constrains it to the same
 * catalogue today, but that is a property of a constraint on another table, not
 * of this query, and asserting the union here would launder a constraint into a
 * type. `.has(CAP.DOOR_OPERATE)` type-checks against a `Set<string>` either way,
 * so the honest width costs its callers nothing.
 */
export interface AccessContextResult {
  capabilities: Set<CapabilityKey>;
  userId: string | null;
  role: string | null;
  status: string | null;
  liveAssignmentCapabilities: Set<string> | null;
}

/**
 * The answer for a caller with no session.
 *
 * Not an error state. `public.my_access_context()` is granted to
 * `authenticated` and revoked from `anon` (same migration, section 5), so an
 * anonymous request is refused by design with `42501`. "Refused because there
 * is nobody to answer about" is a correct answer, and it is the empty set.
 *
 * `userId` is **`null`, deliberately not `""`**. The eleven surfaces this phase
 * replaces read the injected identity header with a `|| ""` fallback, and an
 * empty string is a
 * value that happens to compare unequal to every real id — which made those
 * sites refuse for an accidental reason rather than a stated one. `null` is the
 * honest answer to "who is this", and every consumer refuses on it explicitly:
 * see `ownsOrIsMaster` in `@/lib/capabilities/guards`.
 *
 * `liveAssignmentCapabilities` is the **empty set here, deliberately not
 * `null`**, and the two look interchangeable until you name what each one says.
 * `null` means *"the payload did not carry the key"*, whose one known cause is
 * an unapplied migration; the empty set means *"asked and answered: no live
 * assignment"*. For a caller with no session the second sentence is simply
 * **true** — nobody holds nothing — so `null` here would raise the
 * migration-is-missing signal on every logged-out visit and drown the one
 * occasion it exists to fire on. Same choice `capabilities` makes six lines
 * above, for the same reason: an anonymous refusal is an answer.
 */
const ANONYMOUS_CONTEXT: AccessContextResult = {
  capabilities: new Set<CapabilityKey>(),
  userId: null,
  role: null,
  status: null,
  liveAssignmentCapabilities: new Set<string>(),
};

/** PostgreSQL's `insufficient_privilege`. What `anon` gets from the wrapper. */
const INSUFFICIENT_PRIVILEGE = "42501";

/**
 * The shape a night identifier must have before it is allowed near the database.
 *
 * Copied deliberately from `src/app/api/tickets/checkin/undo/route.ts:23-24`,
 * the pattern this repository already uses for an inbound uuid, rather than
 * invented here: two spellings of "is this a uuid" are two answers waiting to
 * disagree.
 *
 * A non-uuid is **not** an error to forward. PostgREST would answer `22P02`, and
 * a malformed-input fault dressed as a lookup failure is the shape this module
 * exists to prevent — it would reach the door as "could not check this
 * account's permission" when what happened is that a caller sent rubbish.
 */
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** The cookie-bound client. Named so the helper below can be typed without a new import. */
type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

/**
 * Resolve the current session's access context, once per render.
 *
 * Takes no user identifier, and must never take one — the same shape rule the
 * SQL wrapper follows (D-04). This repository has **no rate limiting anywhere**
 * (verified 2026-08-05, `access-gating.md`), so a resolver that answered a
 * yes/no question about an arbitrary id would be a free enumeration oracle with
 * no limiter available to put in front of it. The shape of the API is the
 * mitigation.
 *
 * Carries `liveAssignmentCapabilities` — the coarse *"any live assignment, and
 * for which trades"* answer, `Set<string> | null`, where `null` means the key
 * was absent and therefore that row 14 of the migration queue is not applied.
 * It is **wider than the real permission** and authorises nothing on its own:
 * see the two paragraphs at the top of this file before reading it anywhere.
 *
 * @throws `capabilities.resolve_failed: <code>` when the lookup fails. Never
 *         returns a degraded value: see the file comment.
 */
export const getAccessContext = cache(
  async (): Promise<AccessContextResult> => {
    const supabase = await createClient();

    const { data, error } = await supabase.rpc("my_access_context");

    return interpretAccessContext(supabase, data, error);
  }
);

/**
 * The same question, asked **about one night**.
 *
 * Calls `public.my_access_context(p_party_id)`
 * (`supabase/migrations/20260809001000_assignment_resolver.sql`, section 4) with
 * the **cookie-bound client**, never the service client — for the reason at the
 * top of this file, which is not a preference: a service-role token carries no
 * `sub`, so `auth.uid()` is null and the answer is a confident "no capabilities"
 * about nobody.
 *
 * The payload is the **same five keys** as the argument-less version, in the
 * same order, so `AccessContextResult` is the same type. The only difference is
 * the capability list, which the SQL resolver's `OR` makes the **union** of what
 * the caller's role confers and what their live, unrevoked, unexpired assignment
 * on that night confers.
 *
 * `liveAssignmentCapabilities` is **not** narrowed to `partyId` here, and that is
 * not an oversight to tidy: it is the same account-wide coarse answer both
 * signatures carry, so the two payloads keep one shape behind one type. The
 * per-night answer on this function is `capabilities`. Two keys, two questions;
 * merging them would leave a caller unable to ask either one cleanly.
 *
 * **Memoised per `partyId`, never globally.** `cache()` keys on the argument, so
 * two nights are two entries; the limit above still applies, so in a Server
 * Action or a Route Handler each call is a full round trip and the answer must
 * be resolved once into a local.
 *
 * @throws `party.invalid_id` — the argument is not a uuid. A caller bug, not a
 *         runtime condition: validate the input and answer 400 before calling.
 * @throws `capabilities.resolve_failed: <code>` when the lookup fails. Never
 *         returns a degraded value: see the file comment.
 */
export const getPartyAccessContext = cache(
  async (partyId: string): Promise<AccessContextResult> => {
    // Refused at the entrance, before a client is even built. Throwing a
    // DISTINCT category matters: `capabilities.resolve_failed` means "the
    // question was asked and not answered", and a caller — the door, above all
    // — is entitled to treat those two differently.
    if (!UUID_PATTERN.test(partyId)) {
      throw new Error("party.invalid_id");
    }

    const supabase = await createClient();

    // Named argument, and that is how the overload is selected: PostgREST picks
    // between `my_access_context()` and `my_access_context(p_party_id)` by the
    // argument names supplied. Renaming `p_party_id` in the migration silently
    // stops selecting this function — it does not fail to compile, it resolves
    // to the argument-less one and answers about no night at all.
    const { data, error } = await supabase.rpc("my_access_context", {
      p_party_id: partyId,
    });

    return interpretAccessContext(supabase, data, error);
  }
);

/**
 * The payload contract, in one place because there are two callers of it.
 *
 * Extracted rather than duplicated: the `42501` split, the shape check and the
 * five-field mapping each carry a measured reason, and two copies of them would
 * be two places to fix on the day one of those reasons changes. The two RPC call
 * sites stay separate — one per exposed SQL function — because the *call* is the
 * thing that differs; the *interpretation* is not.
 */
async function interpretAccessContext(
  supabase: SupabaseServerClient,
  data: unknown,
  error: { code?: string | null } | null
): Promise<AccessContextResult> {
  if (error) {
    // The anonymous case, which is NOT a failure. `42501` is what the
    // revoke produces for a caller with no session. It is only that,
    // though, when there really is no session: an *authenticated* caller
    // seeing `42501` means the GRANT to `authenticated` has gone, and
    // reading that as "anonymous" would lock every signed-in user out of
    // every capability-gated surface while looking like a normal refusal.
    // So the two are separated by asking who is calling, and only on this
    // path — the happy path pays nothing for it.
    //
    // On the per-night overload `42501` has a second cause worth naming: that
    // function is a NEW object, and its own `REVOKE`/`GRANT` pair had to be
    // written for the new signature (`…assignment_resolver.sql`, section 4).
    // If that pair were ever lost, this branch is where an authenticated
    // caller's per-night question would start failing while the argument-less
    // one kept working.
    if (error.code === INSUFFICIENT_PRIVILEGE) {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        return ANONYMOUS_CONTEXT;
      }

      console.error(
        "[capabilities.resolve_failed] my_access_context refused an " +
          "AUTHENTICATED caller with 42501 — the GRANT to `authenticated` " +
          "is missing. Every capability-gated surface is now failing."
      );
    }

    throw new Error(`capabilities.resolve_failed: ${error.code ?? "unknown"}`);
  }

  // A payload that is not the documented shape is a failure, not an empty
  // answer. `supabase.rpc()` is untyped in this repository — no client is
  // parameterised with a `Database` generic — so this is the only place the
  // shape is checked at all, and a wrong shape here means the function was
  // redefined underneath its caller.
  if (data === null || typeof data !== "object" || Array.isArray(data)) {
    throw new Error("capabilities.resolve_failed: malformed_payload");
  }

  const payload = data as {
    capabilities?: unknown;
    user_id?: unknown;
    role?: unknown;
    status?: unknown;
    live_assignment_capabilities?: unknown;
  };

  if (!Array.isArray(payload.capabilities)) {
    throw new Error("capabilities.resolve_failed: malformed_capabilities");
  }

  // The coarse answer, and the ONE place its three states are decided.
  //
  // Same guard as `capabilities` — `Array.isArray` on the raw value — and a
  // DIFFERENT verdict when it fails, which is the part to read before changing
  // it. A missing `capabilities` throws because without it there is no answer at
  // all; a missing `live_assignment_capabilities` resolves to `null`, because
  // its absence has a known, expected and temporary cause — row 14 of the queue
  // not applied yet — and throwing would take down every request, the door
  // included, over a key nothing is allowed to decide with on its own.
  //
  // A value that is present but is not an array is treated as `null` too. That
  // is not the same defect and it is deliberately not given its own state: it
  // means the payload does not have the shape declared, which is "no answer" —
  // and three states are already the most a caller can be asked to tell apart.
  //
  // `null` is not a quiet failure: it is the only value that says *"the deploy
  // is ahead of the database"*, and it says it by POSITION, not in a string.
  // Plan 35-17 owns making it observable at the gate that reads it; nothing in
  // this phase may collapse it into the empty set on the way there.
  const liveAssignmentCapabilities = Array.isArray(
    payload.live_assignment_capabilities
  )
    ? new Set(payload.live_assignment_capabilities as string[])
    : null;

  // `user_id` is mapped exactly as `role` and `status` are, and on purpose
  // there is NO fallback here. Reaching for `supabase.auth.getUser()` when
  // the key is absent would restore the round trip the migration exists to
  // avoid — and it would restore it on the very paths where `cache()` does
  // not save you (a Server Action, a Route Handler). An absent `user_id` on
  // an authenticated caller means the migration has not been applied; the
  // answer is `null`, and every consumer refuses on `null`. Nothing degrades
  // into a permissive answer.
  return {
    capabilities: new Set(payload.capabilities as CapabilityKey[]),
    userId: typeof payload.user_id === "string" ? payload.user_id : null,
    role: typeof payload.role === "string" ? payload.role : null,
    status: typeof payload.status === "string" ? payload.status : null,
    liveAssignmentCapabilities,
  };
}

/**
 * Ask one capability question about the current session.
 *
 * Reads the memoised context, so several questions in one **render** cost one
 * round trip. In a Server Action or a Route Handler there is no memoisation:
 * each call is a full round trip, so resolve `getAccessContext()` once into a
 * local instead (see *Memoisation, and its limit* above). Takes no user
 * identifier, for the reason above.
 *
 * A `false` here is a refusal. A failure to resolve is a throw — the caller
 * never has to wonder which one it got, which is the whole point.
 *
 * ── The second argument, reserved in `guards.ts:86-92` and now real ──────────
 *
 * `hasCapability(key, { partyId })` asks the same question **about one night**:
 * the union of what the caller's role confers and what a live assignment on that
 * night confers. Without `partyId` the behaviour is unchanged, down to the
 * function it calls — every existing call site keeps compiling and keeps getting
 * exactly the answer it got before.
 *
 * **Omitting `partyId` is not a shortcut for "any night".** It is the question
 * *"what does this account carry regardless of any night"*, and an assignment
 * contributes nothing to it — the same silence the SQL guard enforces, mirrored
 * here on purpose. A caller that means to ask about a night and forgets to name
 * it gets a **false negative**, which at the door is a refusal in front of a
 * queue. Name the night, or do not ask the per-night question.
 *
 * @throws `party.invalid_id` — `partyId` was supplied and is not a uuid.
 */
export async function hasCapability(
  key: CapabilityKey,
  opts?: { partyId?: string }
): Promise<boolean> {
  const { capabilities } = opts?.partyId
    ? await getPartyAccessContext(opts.partyId)
    : await getAccessContext();

  return capabilities.has(key);
}
