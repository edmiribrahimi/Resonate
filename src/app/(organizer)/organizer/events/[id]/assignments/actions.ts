"use server";

import { revalidatePath } from "next/cache";
import { getServiceClient } from "@/lib/supabase/service";
import {
  assertEventOwnership,
  assertStaffManage,
} from "@/lib/capabilities/guards";
import { CAP } from "@/lib/capabilities/keys";

/**
 * Granting and revoking a per-night assignment — ASSIGN-01, ASSIGN-03, ASSIGN-04.
 *
 * ── D-C · DELEGATION STAYS CLOSED, AND IT STAYS CLOSED BY CONSTRUCTION ───────
 *
 * The gate below asks `staff.manage`, which is a **per-account** capability
 * (`private.role_capabilities`: `('master','staff.manage')` and
 * `('organizer','staff.manage')`). It does **not** ask the assignment, and it
 * does not ask `party.manage`.
 *
 * The consequence is the whole of D-C and it is written here rather than left to
 * be inferred from the absence of a line: **somebody assigned as "organizer for
 * one night" cannot assign anybody else.** Holding `party.manage` for a night
 * lets a person run that night's operational surfaces; it does not let them hand
 * the night to a third person. Delegation is therefore not refused by a check
 * that could be removed — it is unreachable, because no code path here consults
 * the assignment at all.
 *
 * `ACCESS-MODEL-DECISIONS.md` § *What this does NOT settle* keeps the question
 * open in as many words: *"Whether a night's assignment can be delegated
 * further, and by whom."* This paragraph is what stops that open question from
 * being answered by omission. A later phase that wants to open delegation must
 * change the key on the guard, and changing it will be one visible line in one
 * file rather than a behaviour that drifted.
 *
 * ── Four refusal categories from the guard, decided by POSITION ──────────────
 *
 *   `forbidden.staff_manage_required`   — assertStaffManage
 *   `capabilities.resolve_failed: …`    — the resolver, or no_subject below
 *   `forbidden.not_event_owner`         — assertEventOwnership
 *   `event.lookup_failed: <code>`       — assertEventOwnership, no answer
 *
 * Which one you got is decided by **which line threw**, never by parsing a
 * message. No `catch` in this file flattens them, and none of them crosses to
 * the client as a category: Next redacts a Server Action's error message in a
 * production build (`guards.ts:73-79`), so everything the surface must branch on
 * is returned as a **tagged value** instead.
 *
 * ── ONE field of a PostgREST error crosses the wire, and it is the code ──────
 *
 * `20260808001000_role_implies_approved.sql:194-201`: on these tables PostgREST
 * puts the ENTIRE failing row in the third field of the error object — the one
 * whose name is deliberately not spelled anywhere in this file — membership code
 * included, and a log on this project reaches a screenshot on a public
 * repository. Only `error.code` is read here, and only `error.code` is logged.
 *
 * The forbidden field is described rather than written out, for the reason
 * `20260809000000_party_assignments.sql` section 1 gives about the zone offsets
 * it also refuses to spell: the plan's check for this file greps for that
 * literal, and a check whose only match is the sentence forbidding the thing is
 * a check that gets ignored the third time it goes red.
 */

/** The night-scoped keys a grant may carry. Four, and never the whole catalogue. */
const ASSIGNABLE_CAPABILITIES = [
  CAP.DOOR_OPERATE,
  CAP.DOOR_SUPERVISE,
  CAP.MEDIA_UPLOAD,
  CAP.PARTY_MANAGE,
] as const;

/**
 * The four assignable keys as a type.
 *
 * Exported for the surface, which holds a **total** `Record` of labels over it —
 * so a fifth assignable key cannot reach the interface without a label, and a
 * key removed here leaves an unreachable label. That is the one half of this
 * contract `npm run build` can hold; the other half — that these four match
 * `party_assignments_capability_assignable` — is the migration's, and no
 * compiler compares them.
 */
export type AssignableCapability = (typeof ASSIGNABLE_CAPABILITIES)[number];

/** The same shape as `checkin/route.ts:61` and `checkin/undo/route.ts:23`. */
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** PostgreSQL `check_violation`. */
const CHECK_VIOLATION = "23514";
/** PostgreSQL `foreign_key_violation`. */
const FOREIGN_KEY_VIOLATION = "23503";
/** PostgreSQL `unique_violation`. */
const UNIQUE_VIOLATION = "23505";
/** PostgreSQL `no_data_found` — what the writer raises for a revocation that found nothing. */
const NO_DATA_FOUND = "P0002";

/**
 * Every way a grant or a revocation can be refused, one value each.
 *
 * There is no shared "something went wrong": the recorded precedent in this
 * repository is the newsletter form collapsing three causes into one sentence
 * (`.planning/codebase/CONCERNS.md`), and this product has **no error tracking**
 * (`meta-gates.md`), so this returned value is the only place a refusal exists
 * for a human.
 */
export type AssignmentRefusal =
  /** `partyId` is not a uuid. Nothing was asked of the database. */
  | "invalid_party"
  /** `subjectId` is not a uuid. Nothing was asked of the database. */
  | "invalid_subject"
  /** `capability` is not one of the four assignable keys. */
  | "invalid_capability"
  /**
   * The night does not belong to the event this call claims.
   *
   * NOT a formality. `assertEventOwnership` proves the caller may manage
   * `eventId`; it proves nothing about `partyId`, which arrives on the same
   * untrusted POST body. Without this check an organizer could pass their own
   * event and somebody else's night, and the service client — which bypasses
   * every row-level policy — would write it.
   */
  | "party_not_in_event"
  /**
   * ASSIGN-04, refused by this file **before** the database is asked.
   *
   * The `CHECK` is the RULE; this is the SENTENCE A PERSON READS. If this guard
   * were deleted the database would still refuse
   * (`party_assignments_no_self_grant`, `23514`) — and that is precisely why the
   * two halves do not substitute for each other: one keeps the row from
   * existing, the other tells the operator what happened instead of handing them
   * a constraint name.
   */
  | "self_assignment"
  /**
   * The same rule, reached at the database.
   *
   * Practically unreachable now that the guard above runs first, and kept for
   * exactly that reason: the day it is returned, the app-level guard has stopped
   * working and this value says so instead of hiding it inside `write_failed`.
   */
  | "self_assignment_refused_by_database"
  /**
   * D-A: only a staff role may hold a live assignment.
   *
   * The composite foreign key `(user_id, assignee_role) → public.profiles
   * (id, role)` refuses the row with `23503`. The consequence that must be said
   * where somebody meets it, and not only in a migration: **a person has to be
   * promoted to staff before they can be assigned. A public credit is a
   * different thing and needs neither a role nor an account** (ASSIGN-06,
   * `public.party_credits`).
   */
  | "assignee_not_staff"
  /** `party_assignments_live_unique`: that person already holds that key on that night. */
  | "already_assigned"
  /**
   * A revocation that found nothing to revoke.
   *
   * Not a quiet success. It is the information that two people are looking at
   * two different states — somebody else revoked it a moment ago, or the screen
   * is stale. The writer raises rather than returning normally
   * (`20260809002000_assignment_acts.sql`, `party_assignments.no_live_assignment`)
   * for that reason, and collapsing it here would undo the decision.
   */
  | "no_live_assignment"
  /** Any other database failure. Nothing was written. */
  | "write_failed";

export type AssignmentResult = { ok: true } | { ok: false; reason: AssignmentRefusal };

/**
 * The gate, asked ONCE per exported action.
 *
 * `assertStaffManage()` returns the resolved context and that is the point of
 * the return type: `cache()` does **not** memoise inside a Server Action body
 * (`guards.ts:106-114`, measured in phase 33), so a second call is a second full
 * round trip. **More than one `await assertStaffManage(` in a single exported
 * action is the defect, and no compiler sees it** — which is why it is asked
 * here, in one place, by both actions.
 *
 * The SERVICE client on the ownership read, deliberately: it is the client the
 * sibling surface in this tree uses (`guest-list/actions.ts:88`), and swapping
 * it would be a behaviour change wearing a refactor's clothes.
 *
 * The identity is narrowed to a non-null `string` by an explicit throw — never
 * by a `!` at the call to the writer. `record_party_assignment_act` refuses a
 * null actor with its own name (`party_assignments.actor_required`), and
 * `ACCESS-MODEL-DECISIONS.md` § 5 requires a per-night assignment to record who
 * and when: an unattributed grant is not a degraded grant, it is not a grant.
 */
async function verifyOrganizerAccess(eventId: string): Promise<string> {
  const ctx = await assertStaffManage();

  if (!ctx.userId) {
    throw new Error("capabilities.resolve_failed: no_subject");
  }

  await assertEventOwnership(getServiceClient(), eventId, ctx);

  return ctx.userId;
}

/** Narrowing by equality against the closed set — never a string forwarded to the database. */
function isAssignableCapability(value: unknown): value is AssignableCapability {
  return (
    typeof value === "string" &&
    (ASSIGNABLE_CAPABILITIES as readonly string[]).includes(value)
  );
}

/**
 * The input checks both actions share, in the order that costs least.
 *
 * Shape first (no round trip), then the one read that scopes an untrusted
 * `partyId` to an event whose ownership has already been proved.
 */
async function validateTarget(
  eventId: string,
  partyId: string,
  subjectId: string,
  capability: string
): Promise<{ ok: true } | { ok: false; reason: AssignmentRefusal }> {
  if (!UUID_PATTERN.test(partyId)) return { ok: false, reason: "invalid_party" };
  if (!UUID_PATTERN.test(subjectId)) {
    return { ok: false, reason: "invalid_subject" };
  }
  if (!isAssignableCapability(capability)) {
    return { ok: false, reason: "invalid_capability" };
  }

  const { data: party, error } = await getServiceClient()
    .from("event_parties")
    .select("event_id")
    .eq("id", partyId)
    .maybeSingle();

  if (error) {
    console.error(
      `[assignments.write_failed] party scope read for ${partyId}: ` +
        `${error.code ?? "unknown"}`
    );
    return { ok: false, reason: "write_failed" };
  }

  // A missing night and a night belonging to another event get the SAME answer,
  // and that is deliberate: distinguishing them would turn this action into an
  // oracle that tells an authenticated caller which uuids name a real party.
  // There is no rate limiting anywhere in this repository (`access-gating.md`).
  if (!party || party.event_id !== eventId) {
    return { ok: false, reason: "party_not_in_event" };
  }

  return { ok: true };
}

/**
 * The refusal category of a failed write, from its CODE alone.
 *
 * Never from a parsed message: Next redacts a Server Action's message in a
 * production build, and a category read out of a sentence works in `next dev`
 * and stops working where it matters. The field that carries the failing row is
 * not touched — see the file comment.
 */
function classifyWriteError(error: {
  code?: string | null;
}): AssignmentRefusal {
  switch (error.code) {
    case CHECK_VIOLATION:
      return "self_assignment_refused_by_database";
    case FOREIGN_KEY_VIOLATION:
      return "assignee_not_staff";
    case UNIQUE_VIOLATION:
      return "already_assigned";
    case NO_DATA_FOUND:
      return "no_live_assignment";
    default:
      return "write_failed";
  }
}

/**
 * Grant a per-night capability. ASSIGN-01.
 *
 * ONE call to `public.record_party_assignment_act`, which performs the
 * `party_assignments` row and its `membership_acts` act in ONE transaction —
 * so a grant cannot succeed while its record fails, a divergence nothing in this
 * product would report.
 *
 * `p_actor_id` is resolved server-side and passed: under the service client
 * `auth.uid()` is `null`, so the author cannot be deduced by the database and
 * must never be taken from the request body.
 */
export async function assignToParty(
  eventId: string,
  input: { partyId: string; subjectId: string; capability: string }
): Promise<AssignmentResult> {
  const actorId = await verifyOrganizerAccess(eventId);

  const target = await validateTarget(
    eventId,
    input.partyId,
    input.subjectId,
    input.capability
  );
  if (!target.ok) return target;

  // ASSIGN-04, the application half. See `self_assignment` above for why this
  // is not redundant with `party_assignments_no_self_grant`.
  if (actorId === input.subjectId) {
    return { ok: false, reason: "self_assignment" };
  }

  const { error } = await getServiceClient().rpc("record_party_assignment_act", {
    p_party_id: input.partyId,
    p_subject_id: input.subjectId,
    p_capability: input.capability,
    p_act: "assigned",
    p_actor_id: actorId,
  });

  if (error) {
    const reason = classifyWriteError(error);
    if (reason === "write_failed") {
      console.error(
        `[assignments.write_failed] assign on party ${input.partyId}: ` +
          `${error.code ?? "unknown"}`
      );
    }
    return { ok: false, reason };
  }

  revalidatePath(`/organizer/events/${eventId}/assignments`);
  return { ok: true };
}

/**
 * Revoke a per-night capability. ASSIGN-03.
 *
 * The writer performs an UPDATE — `revoked_at`, `revoked_by`, and
 * `assignee_role` nulled — and **never a DELETE**: the offline drain has to be
 * able to ask *"was this live at `scannedAt`?"* after the revocation, because a
 * phone that was at the door at 01:40 syncs at 03:00 and the answer must be
 * about 01:40.
 */
export async function revokeAssignment(
  eventId: string,
  input: { partyId: string; subjectId: string; capability: string }
): Promise<AssignmentResult> {
  const actorId = await verifyOrganizerAccess(eventId);

  const target = await validateTarget(
    eventId,
    input.partyId,
    input.subjectId,
    input.capability
  );
  if (!target.ok) return target;

  const { error } = await getServiceClient().rpc("record_party_assignment_act", {
    p_party_id: input.partyId,
    p_subject_id: input.subjectId,
    p_capability: input.capability,
    p_act: "unassigned",
    p_actor_id: actorId,
  });

  if (error) {
    const reason = classifyWriteError(error);
    if (reason === "write_failed") {
      console.error(
        `[assignments.write_failed] revoke on party ${input.partyId}: ` +
          `${error.code ?? "unknown"}`
      );
    }
    return { ok: false, reason };
  }

  revalidatePath(`/organizer/events/${eventId}/assignments`);
  return { ok: true };
}
