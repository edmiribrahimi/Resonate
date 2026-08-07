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
 * The old sites read `headersList.get("x-user-id") || ""`. An absent identity
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
import type { AccessContextResult } from "./server";

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
