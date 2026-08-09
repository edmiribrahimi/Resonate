import "server-only";

import { createClient } from "@/lib/supabase/server";
import { getPartyAccessContext } from "@/lib/capabilities/server";
import { CAP } from "@/lib/capabilities/keys";

/**
 * may-upload.ts — may this account put a file on THIS NIGHT?
 *
 * ── Why the imports sit ABOVE this block ─────────────────────────────────────
 * The plan's acceptance criterion greps `head -3` of this file for
 * `server-only`. Written in the usual order — docblock first, imports after —
 * the check would read three lines of prose and fail on a file that satisfies
 * it. Same discipline, and the same reason, as
 * `src/lib/media/strip-metadata.ts:1-15`.
 *
 * `import "server-only"` resolves without a package: Next aliases it to
 * `next/dist/compiled/server-only`. Nothing was installed for this file, and
 * that is worth saying, because `src/lib/capabilities/server.ts:13-19` records
 * the opposite belief ("`server-only` is not a dependency of this repository")
 * — which was true of `package.json` and never of the resolver.
 *
 * ── WHAT THIS FILE ASSERTS, in one sentence ─────────────────────────────────
 * Given an event and ONE of its nights, it answers whether the current session
 * may upload media **to that night** — and there is no signature in which the
 * question can be asked without naming the night.
 *
 * ── Why it is a module and not an export of `actions.ts` ─────────────────────
 * A file marked `"use server"` publishes **every** export as a public endpoint.
 * Leaving this predicate there and exporting it — so that plan 35-20's
 * persistence route could reuse it — would publish an oracle answering *"may
 * this person upload to this night?"* to anyone who calls it. A plain module
 * has no such behaviour: `validateMediaUpload`, `registerMedia` and the route
 * import ONE definition and none of them becomes an extra door.
 *
 * ── Why the name says NIGHT and not event ────────────────────────────────────
 * It was `mayUploadToEvent` while the written row carried only the event. Plan
 * 35-18 put `party_id` on `public.event_media`, so the row now carries the
 * night, and a predicate still called `…Event` would tell every later reader
 * that the permission is per-event. In this repository the names are the first
 * place a rule gets lost.
 *
 * The blast radius that made this necessary was **larger than the phase
 * documents said**: `20260226300000_multi_sub_events.sql:11-17` dropped the
 * `UNIQUE (event_id, type)` ceiling of three nights, so a per-night key writing
 * to a per-event table reached the **whole event**, uncapped (measured in
 * `35-18-SUMMARY.md`).
 *
 * ── Three arms, in an OR, and the two that cost nothing are read first ───────
 * The plan lists them 1 · presence · assignment. They are evaluated 1 ·
 * assignment · presence, and **an OR's order is not its meaning**: arms 1 and 3
 * are two `.has()` calls on a Set already in memory, while the presence arm is
 * the only one that costs a round trip. Reading it second would charge that
 * round trip to the assigned photographer — the exact person this plan exists
 * to admit — on every upload. Same verdict, two fewer queries.
 *
 * ── What is NOT here, each for a measured reason ─────────────────────────────
 *
 *   - **No loop over the event's nights.** An earlier draft resolved every
 *     night of the event in short circuit, because the row did not know which
 *     night it belonged to. It does now. Anyone re-introducing a loop over
 *     `public.event_parties` here is re-opening the per-event permission.
 *   - **No re-written liveness rule.** *"Is this assignment still alive?"* — not
 *     revoked, and not past its end — has ONE definition, inside
 *     `private.has_capability` (`20260809001000_assignment_resolver.sql`,
 *     section 3). Writing it again in TypeScript is the second definition CAP-01
 *     forbids, and this one would diverge **silently**: it would move a window,
 *     not raise an error.
 *   - **No optional night.** `partyId` is a required parameter of a normal
 *     function, so no caller can ask the question without naming the night. It
 *     is the other half of the rule plan 35-18 wrote into the database: there no
 *     new row may omit the night, here no question may.
 */

/** The night named is not a night of the event named. Not a permission verdict. */
export const MEDIA_PARTY_NOT_OF_EVENT = "media.party_not_of_event";

/** The caller did not name a night at all. See `registerMedia` for why this is reachable. */
export const MEDIA_NIGHT_REQUIRED = "media.night_required";

/** The three arms all answered no. This one IS a permission verdict. */
export const MEDIA_UPLOAD_FORBIDDEN = "forbidden.media_upload_required";

/**
 * May the current session upload media to `partyId`, a night of `eventId`?
 *
 * `true` / `false` is the **permission** answer. Anything that is not a
 * permission answer throws with its own category, the same split
 * `hasCapability` makes: a caller never has to wonder which of the two it got.
 *
 * @throws `party.invalid_id` — `partyId` is not a uuid. A caller bug, raised by
 *         the resolver before any client is built.
 * @throws `capabilities.resolve_failed: <code>` — the context could not be
 *         resolved. Never degraded into `false`, which would refuse a master
 *         exactly the way it refuses a stranger.
 * @throws `media.party_not_of_event` — the night belongs to another event.
 */
export async function mayUploadToParty(
  eventId: string,
  partyId: string
): Promise<boolean> {
  // ONE resolution, on the night the file belongs to, and one round trip for
  // both capability arms. `cache()` does NOT memoise inside a Server Action or
  // a Route Handler (measured, phase 33 research, `server.ts:105-121`), and
  // both of this predicate's callers are Server Actions — so two
  // `hasCapability()` calls here would be two full round trips per upload.
  //
  // This call also validates the uuid shape of `partyId`, which is why there is
  // no third spelling of `UUID_PATTERN` in this file: two spellings of "is this
  // a uuid" are two answers waiting to disagree.
  const ctx = await getPartyAccessContext(partyId);

  // No identity, no upload. Both callers refuse an anonymous session before
  // reaching here with their own category; this is the backstop, and it is a
  // refusal rather than a throw because "nobody is here" has already been
  // reported by then. The presence arm below also needs an identity to compare.
  if (!ctx.userId) {
    return false;
  }

  // ── The coherence check: a DIAGNOSTIC, and deliberately not a gate ──────────
  //
  // What it buys: a `partyId` from another event is refused HERE, with its own
  // category, instead of arriving at the database as a bare `42501` that reads
  // like an access decision and is not one. The security is still the policy's
  // — `event_media_insert_member` compares `private.party_event_id(party_id)`
  // with `event_id` (`20260809004500`, section 6) — this is the message.
  //
  // **Why an unreadable night is NOT a refusal, which is the interesting part.**
  // This read runs with the caller's own privileges, so it sees
  // `public.event_parties` through `event_parties_select_published`
  // (`20260225150000_party_architecture.sql:30-37`): an ordinary member sees the
  // nights of PUBLISHED events only, while `staff.manage` sees them all. If
  // "no row" were treated as "not this event's night", the same coherent pair
  // would be admitted for an organizer and refused for a member — a check about
  // the SHAPE of the row turned into a check about WHO IS ASKING. That is
  // exactly the defect plan 35-18 measured inside the policy body and replaced
  // with a `SECURITY DEFINER` accessor; repeating it one layer up would be the
  // same mistake with a nicer error message.
  //
  // So this branch can only ever refuse MORE clearly, never admit more: a
  // mismatch it can see is refused, and a night it cannot see is left to the
  // database, which answers with `private.party_event_id` and does not depend on
  // what the account being checked may read.
  const supabase = await createClient();

  const { data: party, error: partyError } = await supabase
    .from("event_parties")
    .select("id, event_id")
    .eq("id", partyId)
    .maybeSingle();

  if (partyError) {
    // Logged with a category and NOT collapsed into a refusal. This project has
    // no error tracking (`meta-gates.md`), so the observable effect is the one
    // the database will produce a moment later if the pair really is wrong.
    // `error.details` is never logged: on a failing write PostgREST puts the
    // whole row there.
    console.error(
      `[media.party_lookup_failed] could not read the night ${partyId}: ` +
        `${partyError.code ?? "unknown"}. This is NOT a refusal — the pair is ` +
        `decided by event_media_insert_member.`
    );
  } else if (party && party.event_id !== eventId) {
    throw new Error(MEDIA_PARTY_NOT_OF_EVENT);
  }

  // ── Arm 1: `staff.manage` ───────────────────────────────────────────────────
  //
  // This replaces the hand-written role test this predicate was extracted from,
  // and **the equivalence was measured, not assumed** — the same paragraph
  // `updateMediaStatus` carries in `actions.ts`, reproduced in full rather than
  // referenced, because a reader who found two different predicates for the same
  // question would conclude one of them is wrong.
  //
  // The deleted test read `role in (organizer, master)` from a `select("role,
  // status")` in which `status` was fetched but NOT part of the role branch.
  // `private.role_capabilities` grants `staff.manage` to `master` and to
  // `organizer` with `requires_approved = false` on both rows
  // (`20260807000000_capability_model.sql:392-393`) — the same predicate, row
  // for row, `status` ignored on both sides.
  //
  // The two near neighbours are verdict changes and are refused:
  // `CATALOGUE_MANAGE` carries `requires_approved = true` (`:399-400`) and would
  // refuse a pending organizer who uploads today; `ADMIN_ACCESS` is granted to
  // `master` alone (`:408`) and would refuse every organizer.
  //
  // `staff.manage` is not an assignable trade — an assignment may carry only
  // `door.operate`, `door.supervise`, `media.upload` and `party.manage`
  // (`20260809000000_party_assignments.sql:340-342`) — so its presence in this
  // per-night union comes from the role arm and from nowhere else.
  if (ctx.capabilities.has(CAP.STAFF_MANAGE)) {
    return true;
  }

  // ── Arm 3: the per-night assignment — the reason this file exists ───────────
  //
  // ONE resolution, on the night the file belongs to. Being "photo" on one night
  // says nothing about any other night of the same event, which is Success
  // Criterion 1 of the ROADMAP made true in code:
  // `20260808000500_staff_role.sql:127-135` already wrote which upload this is —
  // *"the photographer uploading to the night they worked, which expires with
  // the night"* — and this line is the sentence acquiring a consumer.
  //
  // ── WHAT THIS ARM DOES NOT PROTECT, and the reader must find it here ───────
  //
  // Widening WHO uploads does not, on its own, widen WHAT IS STRIPPED. A phone
  // photograph carries GPS coordinates, a date and a device model **inside the
  // file**, so a picture taken inside a secret venue carries that venue's
  // address in its bytes — a reveal path that passes through none of the
  // surfaces enumerated in `venue-secrecy.md`, because it is not our code that
  // writes it. The stripper exists (`src/lib/media/strip-metadata.ts`, plan
  // 35-19) and lives in plan 35-20's persistence route, and **until
  // `20260809006000_event_media_server_upload_only.sql` is applied the browser
  // can still write straight to the public `event-media` bucket and go around
  // it** — the door that leaves open is
  // `20260225120000_phase7_media.sql:70-75`. That migration is the ONE row of
  // the queue applied AFTER the deploy, not before.
  //
  // Two further limits, stated rather than left to be discovered: **video is
  // stripped by nothing** (`sharp` does not handle containers, and an MP4/MOV
  // carries coordinates in a `udta` atom), and moderation flips the row, not the
  // object (`media-and-storage.md`, gate *moderazione = rimozione*).
  //
  // This matters precisely here: the person this arm admits is the photographer
  // standing INSIDE the secret venue, which makes them the most likely traveller
  // of this path — not an edge case.
  if (ctx.capabilities.has(CAP.MEDIA_UPLOAD)) {
    return true;
  }

  // ── Arm 2: the recorded presence — UNCHANGED, and that is the requirement ───
  //
  // **A MEASURED DEFECT LIVES IN THE NEXT SEVEN LINES. Read this before
  // "fixing" it.** The query below asks for a table named `attendance`; the
  // table is `public.attendances` (`supabase/schema.sql:231`) and **no object
  // named `attendance` exists**. PostgREST answers with an error, the
  // destructuring takes only `{ data }`, so `attendance` is `null` and **this
  // arm refuses every time, for everybody**. Consequence, measured on
  // 2026-08-08: today only `staff.manage` reaches an upload at all.
  //
  // Correcting the table name would **widen** who may upload. That is a change
  // to the gating model (`media-and-storage.md`, gate *chi carica ha titolo*;
  // `access-gating.md`), it is in none of this phase's eight requirements, and
  // it is recorded as dated debt in plan 35-14. The arm therefore stays word for
  // word, and this paragraph is what stops it from being "tidied" in a cleanup
  // commit by somebody who never learns they widened an access rule.
  //
  // The status half is asked of the capability model instead of `profiles`, and
  // the equivalence is exact rather than approximate: `membership.active` is
  // granted to `master`, `organizer`, `member`
  // (`20260807000000_capability_model.sql:403-405`) and `staff`
  // (`20260808000500_staff_role.sql:136`) — every role there is — with
  // `requires_approved = true` on all four rows. It resolves to
  // `status = 'approved'` and to nothing else, for every account that can exist.
  // Asking it here costs no round trip (the set is already resolved) and honours
  // the rule `server.ts:210-212` states without exception: **no new caller
  // branches on `role` or `status`; every decision asks `capabilities`.**
  if (!ctx.capabilities.has(CAP.MEMBERSHIP_ACTIVE)) {
    return false;
  }

  const { data: attendance } = await supabase
    .from("attendance")
    .select("id")
    .eq("event_id", eventId)
    .eq("user_id", ctx.userId)
    .maybeSingle();

  return Boolean(attendance);
}
