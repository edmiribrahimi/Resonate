/**
 * Event ownership — asked in one place, because it is currently answered in ten.
 *
 * ── This is NOT a second resolver ────────────────────────────────────────────
 *
 * It resolves nothing. It imports `getAccessContext` from
 * `@/lib/capabilities/server` and asks it questions, exactly as
 * `hasCapability` does. CAP-01 forbids a second definition of a rule, and a
 * module that re-read the session or re-joined profiles to grants would be that
 * second definition wearing a helper's name. Everything here takes an
 * already-resolved context as an argument.
 *
 * ── What it replaces ─────────────────────────────────────────────────────────
 *
 * Ten sites decide "may this person manage this event" today, in three
 * different polarities and with two different Supabase clients:
 *
 *   - eight pages:  `if (role === "organizer" && event.created_by !== userId)`
 *                   — the master case is an implicit else;
 *   - two actions:  `if (isMaster) return;` … `if (created_by !== userId) throw`
 *                   — the master case is an explicit short-circuit;
 *   - one action:   `if (role === "organizer") { serviceClient.from("events") }`
 *                   — the ownership read BYPASSES row-level security.
 *
 * Same truth table today, three different shapes, and the third one reads with
 * a different client than the other two. Plans 33-07, 33-08 and 33-09 delete the
 * copies; this file is the definition they converge on.
 *
 * ── Why the master branch comes first ────────────────────────────────────────
 *
 * The eight pages express "master passes" as the absence of a check, which
 * quietly makes a master's verdict depend on whether the `events` SELECT policy
 * would let them read that row. The two actions short-circuit before reading.
 * **Consolidating on the short-circuit is the safe direction**, and it is the
 * only direction that stays correct if the `events` SELECT policy is ever
 * narrowed. Inverting it would be invisible until the day it is not.
 *
 * ── The null-identity trap, which is the reason this file exists ─────────────
 *
 * The old sites read the injected identity header with a `|| ""` fallback. An
 * absent identity
 * therefore became `""`, and `created_by !== ""` refused — correctly, but by
 * accident. `AccessContextResult.userId` is honestly typed `string | null`, so
 * a naive transcription of `created_by !== userId` compares `null !== null` and
 * **admits** on a row whose `created_by` is null. Ten transcriptions would be
 * ten chances to write that line. It is written once, here, and refused
 * explicitly on both halves.
 *
 * **MEASURED, and it changes how the next editor should treat those two lines.**
 * The two refusals are a REDUNDANT PAIR as written: today, either one alone
 * refuses the null/null case, so deleting `if (!ctx.userId) return false;` in
 * isolation changes no answer. What was measured (plan 33-01, three-way
 * mutation, recorded in `33-01-SUMMARY.md`):
 *
 *   - remove the identity refusal, keep `!createdBy`        → still refuses
 *   - weaken `!createdBy` to `=== undefined`, keep identity → still refuses
 *   - **do both** → `null === null` → **ADMITS**
 *
 * So neither line is decoration and neither is independently load-bearing: the
 * PAIR is the guard. Do not remove one because "the other covers it" — that is
 * true right up to the edit that touches the other one, and this repository has
 * no test that would notice.
 *
 * ── Errors: two categories, never one ────────────────────────────────────────
 *
 * `assertEventOwnership` distinguishes "you may not" from "I could not find
 * out". This project has **no error tracking** — no monitoring dependency in
 * `package.json`, so no production error reaches a human on its own
 * (`meta-gates.md`) — and a `catch` that collapses the two is the recorded
 * newsletter defect (`.planning/codebase/CONCERNS.md`). There is no `catch` in
 * this file.
 *
 * **And a category that must cross to a client cannot travel in the message.**
 * Next redacts the message of an error thrown out of a Server Action in a
 * production build, so `err.message.startsWith("forbidden.")` works in
 * `next dev` and silently stops working in the deployment where it matters
 * (CR-01, `32-REVIEW.md`). A caller that needs to branch on the category must
 * carry it as a **tagged value decided by position** — a discriminated result
 * returned from the action — never by parsing a string.
 *
 * ── What this module deliberately does NOT export ────────────────────────────
 *
 *   - No helper taking a user id as an argument. That is the enumeration-oracle
 *     shape D-04 forbids, and this repository has no rate limiting anywhere to
 *     put in front of one.
 *   - No helper returning a capability `Set` for a caller to hand across a
 *     module boundary as a prop. `hasCapability(key)` stays the primary API
 *     precisely because `hasCapability(key, { partyId })` is source-compatible
 *     with every call site this phase writes: `private.has_capability` already
 *     carries `p_party_id` while `my_access_context()` does not, and phase 35
 *     asks "may this person do X *on this night*". A `Set`-passing convention
 *     is the one shape that cannot grow that argument.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

import { CAP } from "./keys";
import { getAccessContext } from "./server";
import type { AccessContextResult } from "./server";

/**
 * The staff-surface gate: events, parties, ticket tiers, discount codes, drinks,
 * guest lists, media moderation.
 *
 * **It returns the resolved context, and that is the whole point of the return
 * type.** `cache()` does NOT memoise inside a Server Action body — measured in
 * phase 33's research, three executions for three calls, identically in
 * `next dev` and in a production build (`server.ts`, *Memoisation, and its
 * limit*). So a caller that asks this gate and then asks `getAccessContext()`
 * again pays two full round trips. Thread the returned `ctx` into
 * `assertEventOwnership` instead. **More than one `await assertStaffManage(` in
 * a single exported action is the defect**, and no compiler or build will see
 * it.
 *
 * ── Why `staff.manage`, chosen by the question ───────────────────────────────
 *
 * The question these call sites ask is *"may this person manage a staff
 * surface"*. `CAP_DESCRIPTIONS["staff.manage"]` names events, parties, tickets,
 * tiers, drinks and guest lists by hand, and its grants are
 * `('master','staff.manage',false)` and `('organizer','staff.manage',false)`
 * (`20260807000000_capability_model.sql:392-393`) — role ∈ {master, organizer},
 * **status ignored**. That is byte-equal to the predicate it replaces,
 * `profile.role !== "organizer" && profile.role !== "master"`, so no role's
 * reach changes and a `pending` organizer keeps managing events exactly as
 * today.
 *
 * The stronger argument is not the equality. The 34 RLS policies behind these
 * very tables (family P1, the ones that gated on `is_admin_or_organizer()`)
 * already call `private.has_capability('staff.manage')`. After this change the
 * TypeScript gate and the row-level gate ask **the same key of the same
 * authority**, instead of two predicates that happen to agree.
 *
 * Rejected, in writing, because each would change a verdict:
 *
 *   - `ORGANIZER_ACCESS` — the question *"may they reach the organizer area"*,
 *     which is a routing question. A Server Action is not a route: it is a POST
 *     to whatever route hosts it, and a middleware matcher change can remove
 *     proxy coverage without touching the action.
 *   - `CATALOGUE_MANAGE` — `requires_approved = true` (same migration, `:396`).
 *     A `pending` organizer manages events and tiers today; this key refuses
 *     them. A verdict change, and the container write matrix names the cell:
 *     `organizer/pending` · `ticket_tiers` · insert is `ok:1`.
 *   - `MASTER_MANAGE` — would lock every organizer out of their own events.
 *
 * ── On collapsing four error strings into two categories ─────────────────────
 *
 * The four functions this replaces differ *only* in prose: `"…manage events"` /
 * `"…manage ticket tiers"`, `"…your own events"` / `"…tiers for your own
 * events"`. Collapsing them is not a lost diagnostic, for a measured reason:
 * **Next redacts the message of an error thrown out of a Server Action in a
 * production build** (CR-01, `32-REVIEW.md`). Those four strings are already
 * invisible in the deployment that matters and exist only in `next dev`. A
 * stable category is more use to the one person who will ever read it than four
 * prose variants production erases.
 *
 * @throws `forbidden.staff_manage_required` — the answer is no.
 * @throws `capabilities.resolve_failed: <code>` — from the resolver, when there
 *         is no answer. Two categories, decided by **which line threw**, never
 *         by parsing a message.
 */
export async function assertStaffManage(): Promise<AccessContextResult> {
  const ctx = await getAccessContext();

  if (!ctx.capabilities.has(CAP.STAFF_MANAGE)) {
    throw new Error("forbidden.staff_manage_required");
  }

  return ctx;
}

/**
 * May this context manage this event?
 *
 * Pure and synchronous: no round trip, no client, no `await`. It takes a
 * context the caller has already resolved and a `created_by` the caller has
 * already fetched, so the eight pages that call it pay exactly nothing for it.
 *
 * The order of the four lines is the contract, not a style:
 *
 *   1. master first, before the row is considered at all;
 *   2. no identity → refuse (the trap above);
 *   3. no owner → refuse (a row owned by nobody is owned by nobody);
 *   4. only then, the comparison.
 *
 * **Why `master.manage` and not `admin.access`.** The question this function
 * asks is *"may this person manage an event they do not own"* — a reserved
 * operation. It is not *"may they reach the admin area"*. Three of the eight
 * capability keys resolve to the same predicate today
 * (`keys.ts:38-45`), so picking by predicate rather than by question is
 * invisible until phase 35 grants one night's door and accidentally grants
 * sixteen tables. The key is chosen by the question.
 */
export function ownsOrIsMaster(
  ctx: AccessContextResult,
  createdBy: string | null | undefined
): boolean {
  if (ctx.capabilities.has(CAP.MASTER_MANAGE)) return true;
  if (!ctx.userId) return false;
  if (!createdBy) return false;
  return createdBy === ctx.userId;
}

/**
 * The same decision, for the three server actions that must fetch the row
 * themselves. Throws or returns; never returns a verdict.
 *
 * **The client is a parameter, and that is a decision with evidence behind it.**
 * Two of the three call sites read `events.created_by` with the cookie client,
 * where row-level security applies; the third reads it with the service-role
 * client, where it does not. Those are not the same read, and they can disagree
 * the moment the `events` SELECT policy narrows (`33-RESEARCH.md` § D-4). This
 * function does not decide which one is correct — plan 33-09 does, with
 * evidence — and a function that silently picked one would be the phase-32
 * `event_parties` trap in a new costume: a check that *looks* like the master
 * test but is a sub-select read as the caller.
 *
 * @throws `forbidden.not_event_owner` — the answer is no.
 * @throws `event.lookup_failed: <code>` — there is no answer, because the row
 *         could not be read. Distinct on purpose: see the file comment.
 */
export async function assertEventOwnership(
  supabase: SupabaseClient,
  eventId: string,
  ctx: AccessContextResult
): Promise<void> {
  // The master short-circuit, before any read. `ownsOrIsMaster(ctx, null)` can
  // only be true through the master branch — the `!createdBy` line refuses
  // every other path — so this is that branch, asked without duplicating it.
  if (ownsOrIsMaster(ctx, null)) return;

  const { data, error } = await supabase
    .from("events")
    .select("created_by")
    .eq("id", eventId)
    .single();

  if (error) {
    console.error(
      `[event.lookup_failed] could not read events.created_by for the ownership ` +
        `check: ${error.code ?? "unknown"}. This is NOT a refusal — the question ` +
        `was never answered.`
    );
    throw new Error(`event.lookup_failed: ${error.code ?? "unknown"}`);
  }

  if (!ownsOrIsMaster(ctx, data?.created_by ?? null)) {
    throw new Error("forbidden.not_event_owner");
  }
}
