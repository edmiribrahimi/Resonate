/**
 * The one shape a refusal on the money path is built from.
 *
 * This module holds a **construction**, a safe log line and one result type. It
 * deliberately holds **no categories**: the categories live in the surfaces that
 * own them. What follows is written down because four conversions in this phase
 * are about to declare refusal categories at once, and this repository already
 * knows what happens when several vocabularies are each internally consistent
 * and none of them agree — `src/lib/door/outcome.ts:1-15` was written to record
 * exactly that failure at the door.
 *
 * ── 1 · The construction ─────────────────────────────────────────────────────
 *
 * Constants first, the union built from `typeof` over those constants, then a
 * `Record` over the union:
 *
 *     export const X_REFUSED   = "x_refused";
 *     export const X_UNKNOWN   = "x_unknown";
 *
 *     export type XRefusal = typeof X_REFUSED | typeof X_UNKNOWN;
 *
 *     export const X_ERROR: Record<XRefusal, string> = {
 *       [X_REFUSED]: "…",
 *       [X_UNKNOWN]: "…",
 *     };
 *
 * **Not** a bare string union with a `switch`. The `Record` is the whole point:
 * it is total over the union, so a category added without its sentence is an
 * `npm run build` error rather than a category that renders as nothing. In a
 * repository with no test runner that build is the only automatic gate there is.
 *
 * Use `as const satisfies Record<…, number>` where the values must stay literal
 * — an HTTP status, a numeric code — and a plain `Record<Union, string>` where
 * they are sentences. The two in-tree instances to copy from, rather than
 * paraphrase:
 *
 *   - `src/lib/door/outcome.ts:278-302` — `DOOR_NIGHT_ERROR`, three constants,
 *     a union from `typeof`, a total `Record<DoorNightRefusal, string>`.
 *   - `src/app/api/media/finalize/route.ts:236-254` — `FINALIZE_HTTP`, the
 *     `as const satisfies Record<FinalizeRefusal, number>` form, over fourteen
 *     categories, with a second total `Record` at `:276-294` answering a
 *     different question about the same union.
 *
 * A new totality map joins that family; it does not start one.
 *
 * ── 2 · Where the union lives, and why it is not here ────────────────────────
 *
 * **Each surface declares its own union and its own total `Record`, in its own
 * file.** A category on a bar screen and a category in a cron report are not
 * members of one vocabulary: they have different readers, different remedies
 * and different lifetimes, and merging them produces a union where two thirds
 * of every `Record` is unreachable padding — which is how a totality check
 * stops meaning anything.
 *
 * What is shared is the *construction* above and the *log line* below. That is
 * what "one shape" means here, and it is written down so the next reader does
 * not resolve the ambiguity in the other direction and build a god-union in
 * this file. The tree's three precedents are three unions and one construction:
 * `outcome.ts`, `finalize/route.ts`, and the nights half of
 * `src/app/(admin)/admin/events/actions.ts:262-387`.
 *
 * ── 3 · Why a category never travels as a thrown message ─────────────────────
 *
 * Next **redacts** the message of an error thrown out of a Server Action in a
 * production build — stated at the source in
 * `src/lib/capabilities/server.ts:58-63`. A client that branches on message text
 * works in `next dev` and stops working where it counts, and rewording a `throw`
 * is therefore not a fix: three distinct thrown sentences arrive identical in
 * production. A caller that needs the category carries it as a **value**.
 *
 * ── 4 · The third member is always *could not answer* ────────────────────────
 *
 * Every union built for a failed read gets a member meaning *the question could
 * not be answered*, and it is **never merged with the *no***. `DOOR_NIGHT_
 * UNRESOLVED` (`outcome.ts:280`) is the template; `/api/media/finalize` gives
 * the same idea its own status with an explicit meaning (`route.ts:229-234`):
 * *the question could not be answered, and this is not a refusal of you*.
 * Collapsing the two tells a person they were denied when in fact nobody looked
 * — which on a money path means telling a buyer they may not buy because a
 * count did not come back.
 *
 * ── Where this module may be imported from ───────────────────────────────────
 *
 * A Server Action, a Server Component, a route handler and a client component.
 * It therefore imports **nothing** — no React, no Next, no database types — so
 * that nothing pins it to one of those four and no later edit can make it
 * unusable from the others.
 */

/**
 * The only shape of a database error anything on this path may read.
 *
 * `details` is not in it, and its absence is the mechanism rather than a
 * convention: on a CHECK or constraint violation PostgREST returns **the whole
 * rejected row** in `error.details`, and a `profiles` or `tickets` row carries
 * `membership_code`. A membership code is the door credential, and a log on
 * this project reaches a screenshot. Roughly twenty sites in this repository
 * already pass a whole error object to `console.error`
 * (`.planning/todos/pending/postgrest-details-leaks-the-row.md`); this phase
 * opens several files that would otherwise become the twenty-first.
 *
 * Application branching stays on `code` — `message` carries the constraint name
 * and Next redacts it out of a Server Action anyway.
 */
export type SafeError = {
  code?: string | null;
  message?: string | null;
};

/**
 * One line, carrying the scope, the code and the message, and nothing else.
 *
 * Generalised from `src/app/(admin)/admin/events/actions.ts:382-387`
 * (`logNightRefusal`), which is the same line bound to one file's refusal type.
 * The `SafeError` parameter is the guard: a whole PostgREST error does not
 * satisfy it at the call sites this phase writes, so *never log the object* is
 * enforced by the type rather than remembered by the author.
 *
 * This is not observability on its own. The project has no error tracking
 * (`.claude/rules/meta-gates.md`), so a log line reaches nobody: every caller
 * still owes the person affected an effect they can see.
 */
export function logMoneyPathFailure(scope: string, error: SafeError | null): void {
  console.error(
    `[${scope}] code=${error?.code ?? "none"} message=${error?.message ?? "none"}`
  );
}

/**
 * A read whose empty answer is also a legitimate answer.
 *
 * An empty list of drink receipts means either *you bought nothing* or *we could
 * not read what you bought*, and a `[]` returned from a `catch` renders the
 * second as the first. Returning this instead makes the caller name which one it
 * is before it can render anything, because there is no arm to fall through.
 *
 * `R` is the surface's **own** refusal union — see section 2 above; this type
 * takes it as a parameter precisely so that no vocabulary is defined here.
 */
export type ReadResult<T, R extends string> =
  | { ok: true; value: T }
  | { ok: false; reason: R };
