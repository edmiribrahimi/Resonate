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
 */
export interface AccessContextResult {
  capabilities: Set<CapabilityKey>;
  userId: string | null;
  role: string | null;
  status: string | null;
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
 */
const ANONYMOUS_CONTEXT: AccessContextResult = {
  capabilities: new Set<CapabilityKey>(),
  userId: null,
  role: null,
  status: null,
};

/** PostgreSQL's `insufficient_privilege`. What `anon` gets from the wrapper. */
const INSUFFICIENT_PRIVILEGE = "42501";

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
 * @throws `capabilities.resolve_failed: <code>` when the lookup fails. Never
 *         returns a degraded value: see the file comment.
 */
export const getAccessContext = cache(
  async (): Promise<AccessContextResult> => {
    const supabase = await createClient();

    const { data, error } = await supabase.rpc("my_access_context");

    if (error) {
      // The anonymous case, which is NOT a failure. `42501` is what the
      // revoke produces for a caller with no session. It is only that,
      // though, when there really is no session: an *authenticated* caller
      // seeing `42501` means the GRANT to `authenticated` has gone, and
      // reading that as "anonymous" would lock every signed-in user out of
      // every capability-gated surface while looking like a normal refusal.
      // So the two are separated by asking who is calling, and only on this
      // path — the happy path pays nothing for it.
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

      throw new Error(
        `capabilities.resolve_failed: ${error.code ?? "unknown"}`
      );
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
    };

    if (!Array.isArray(payload.capabilities)) {
      throw new Error("capabilities.resolve_failed: malformed_capabilities");
    }

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
    };
  }
);

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
 */
export async function hasCapability(key: CapabilityKey): Promise<boolean> {
  const { capabilities } = await getAccessContext();
  return capabilities.has(key);
}
