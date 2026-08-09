/**
 * The door's three outcomes, named once.
 *
 * Before this file the online path and the offline path each carried their own
 * vocabulary: `/api/tickets/checkin` encoded every failure in the JSON body at
 * HTTP 200, the scanner read a different set of strings, and the sync manager
 * read neither — it tested `res.ok`, which was true in all six cases. Nothing
 * failed loudly because every vocabulary was internally consistent and none of
 * them agreed.
 *
 * This module is the source. It imports nothing — not even `@/types/database`,
 * which will import *from here* — so that a divergence between the two paths is
 * a type error at `npm run build`. In a repository with no test runner, that
 * build is the only automatic gate there is.
 *
 * ── Cross-check 1: the SQL mirror ────────────────────────────────────────────
 * `DoorScanCause` and `DoorSubjectType` are duplicated as SQL `CHECK`
 * constraints on `public.door_scan_events` in this phase's migration.
 * `next build` catches the TypeScript side, the `CHECK` catches the SQL side,
 * and the two agree only because they were written once *here* and copied.
 * Editing either literal set means editing both, in the same commit.
 *
 * ── Cross-check 2: FIX-04a, the door states a fact ───────────────────────────
 * The `already_recorded` branch states a fact — who recorded the entry and when
 * — and carries **no** cause. Classification happens afterwards, over
 * `door_scan_events`, from `operator_id` + `device_id` + the interval between
 * the two reads. It never happens at the scanner, because the scanner is a
 * phone held by a member of staff in front of a queue, and a verdict rendered
 * there is a verdict rendered on a person. If a future edit adds a `cause` to
 * this union, that requirement has been broken — this comment is the only place
 * that will say so.
 */

/**
 * HTTP status per outcome.
 *
 * The body's `outcome` field is authoritative. The status exists so that a
 * transport-level classifier — the sync manager deciding retry vs. drain vs.
 * fail — can act without parsing a body. 409 for a conflict with the current
 * state of the resource, 422 for a well-formed request the server cannot
 * process (RFC 9110 §15.5.10, §15.5.21). Conventional readings, neither
 * load-bearing.
 */
export const DOOR_HTTP = {
  recorded: 200,
  already_recorded: 409,
  not_valid: 422,
} as const satisfies Record<DoorScanOutcomeKind, number>;

/**
 * What was scanned.
 *
 * FIX-13: the subject of a door record is a ticket, an entry or a membership —
 * never a person. Mirrored by the `subject_type` CHECK in the migration.
 */
export type DoorSubjectType = "ticket" | "guest_list_entry" | "membership";

/**
 * The thing the outcome is about.
 *
 * `label` is a display name for the prose path only. It is optional precisely
 * because the technical path — the copyable, identifiers-only view (FIX-12) —
 * must never depend on it.
 */
export interface DoorSubject {
  type: DoorSubjectType;
  id: string;
  label?: string;
}

/**
 * Why a scan produced nothing. Shown red at the door.
 *
 * ── Not mirrored in SQL, and that is why a fifth member costs no migration ───
 * `door_scan_events` stores `outcome` and `cause`; it does **not** store this
 * reason (`src/lib/door/classify.ts:176`). So unlike `DoorScanCause` and
 * `DoorSubjectType` above, widening this union is a TypeScript-only change. The
 * two places that hold it are total `Record`s — `NOT_VALID_MESSAGE` in
 * `ScannerClient.tsx` and `NOT_VALID_REASONS` in `sync-manager.ts` — so a fifth
 * member is a `npm run build` error at both until it is answered, which is the
 * whole reason they are written as totals.
 *
 * `no_assignment_at_scan` is the fifth, added by plan 35-12, and it is the only
 * member of this union **no live scan can produce**. It answers one question and
 * only on the drain: *a scan was queued on a device whose operator held no
 * door assignment for that night at the moment the code was read.* Before it,
 * that scan came back as a 403 and the drain filed it under `blocked` — which
 * waits for a sign-in, and no sign-in returns an assignment nobody ever had. It
 * is a `not_valid` and not a fourth outcome on purpose: the row is written, the
 * presence is on the record, and the queue entry leaves for `failedCheckins`
 * where a person can see it, instead of hanging for the rest of the season.
 */
export type DoorNotValidReason =
  | "invalid_signature"
  | "unknown_code"
  | "wrong_night"
  | "no_party_selected"
  | "no_assignment_at_scan";

/**
 * An admission that was recorded but is not ordinary.
 *
 * Both mean "admitted, and someone should look at this afterwards" — the door's
 * asymmetry (a false refusal happens in front of a queue; a false admission is
 * a number in a report) makes admit-and-flag the correct default.
 */
export type DoorFlag = "refunded_before_night" | "not_in_cache";

/**
 * The three outcomes. There are three, and an undo is not a fourth — it is a
 * flagged record.
 *
 * The discriminant is named `outcome` so that a `door_scan_events` row and an
 * HTTP response never need translating between each other.
 */
export type DoorOutcome =
  | {
      outcome: "recorded";
      subject: DoorSubject;
      /** ISO. When the entry was recorded. */
      at: string;
      flags?: DoorFlag[];
    }
  | {
      outcome: "already_recorded";
      subject: DoorSubject;
      /** ISO. When the **first** record was made — not the current read. */
      at: string;
      /** FIX-04a: who and when, and nothing that resembles a verdict. */
      by: { operatorId: string; operatorLabel: string };
    }
  | {
      outcome: "not_valid";
      reason: DoorNotValidReason;
    };

/** The three literals alone, for the `outcome` column of `door_scan_events`. */
export type DoorScanOutcomeKind = DoorOutcome["outcome"];

/**
 * The classification set, applied **after** the night, over the recorded
 * events — never at the scanner.
 *
 * Mirrored exactly by the `cause` CHECK in the migration; NULL there means
 * unclassified. `refunded_after_night` is the one cause the review list
 * excludes: it is accounting, read by the finance surface, and never a door
 * conflict.
 */
export type DoorScanCause =
  | "double_read"
  | "second_ticket_same_holder"
  | "two_devices"
  | "invalid_signature"
  | "not_in_cache"
  | "wrong_night"
  | "refunded_before_night"
  | "refunded_after_night";

/** Which path produced the record. Mirrored by the `source` CHECK. */
export type DoorScanSource = "online" | "offline_sync";

/**
 * The three literals, written out once for the runtime guard below.
 *
 * Typed as a total `Record` over the union on purpose: renaming a member,
 * adding a fourth or dropping one all become build errors here rather than a
 * guard that silently stops recognising an outcome it was meant to recognise.
 */
const DOOR_OUTCOME_KINDS: Record<DoorScanOutcomeKind, true> = {
  recorded: true,
  already_recorded: true,
  not_valid: true,
};

/**
 * Tell a contract response from anything else — an `{ error }` body, an HTML
 * error page parsed as JSON, a response produced by an older bundle on a staff
 * phone that has not picked up the new service worker yet.
 *
 * Deliberately narrow: it checks the discriminant and stops. A partial
 * validator that pretends to be total is worse than an honest narrow one,
 * because the caller stops checking the fields it was going to check.
 *
 * `hasOwnProperty` rather than `in`, so that a body carrying
 * `{ outcome: "toString" }` does not resolve through the prototype chain.
 */
export function isDoorOutcome(value: unknown): value is DoorOutcome {
  if (typeof value !== "object" || value === null) return false;
  if (!("outcome" in value)) return false;
  const kind = (value as { outcome: unknown }).outcome;
  return (
    typeof kind === "string" &&
    Object.prototype.hasOwnProperty.call(DOOR_OUTCOME_KINDS, kind)
  );
}

/**
 * ── The supervision refusal, and why its two strings live HERE ───────────────
 *
 * They were coined in `src/lib/door/require-operator.ts` (plan 35-07) and that
 * module still re-exports them, so no importer changed. They moved because of a
 * hard constraint rather than a preference: **a client component cannot import
 * `require-operator.ts`.** That module imports `@/lib/supabase/server`, which
 * reads `next/headers`, and the scanner is `"use client"`.
 *
 * The scanner needs both of them, and it needs them for two different halves of
 * one requirement:
 *
 *   - {@link DOOR_SUPERVISION_REQUIRED} to recognise, in a `403` body, that the
 *     refusal was about supervision and not about the account — the headline is
 *     chosen from the HTTP status **before** the body is read, and that limit was
 *     measured and written down in `require-operator.ts:104-110` waiting for
 *     exactly this fix.
 *   - {@link DOOR_SUPERVISION_REQUIRED_ERROR} because with the radio off there is
 *     no server to send the sentence, and the device has to say it itself.
 *
 * The alternative — retyping the two strings in the client — is the defect this
 * whole module exists to prevent, stated at the top of the file: two
 * vocabularies, each internally consistent, that agree until they do not. This
 * module is the source and imports nothing, which is precisely what makes it the
 * one place both a route and a phone can read from.
 */
export const DOOR_SUPERVISION_REQUIRED = "door_supervision_required";

/**
 * The human sentence for a supervision refusal.
 *
 * It names the **way out** — ask an organizer for this night — because at 02:00
 * the useful part of a refusal is what to do next, and because this refusal is
 * about one night rather than about the account. English only: the interface
 * language is a milestone decision, not a per-string choice.
 */
export const DOOR_SUPERVISION_REQUIRED_ERROR =
  "Undoing a check-in needs a supervisor. Ask an organizer for this night.";
