import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getServiceClient } from "@/lib/supabase/service";
import { DOOR_HTTP } from "@/lib/door/outcome";
import {
  DOOR_UNRESOLVED_STATUS,
  requireDoorOperator,
} from "@/lib/door/require-operator";
import { ROLES } from "@/lib/rbac/roles";
import type {
  DoorNotValidReason,
  DoorScanOutcomeKind,
  DoorScanSource,
  DoorSubjectType,
} from "@/lib/door/outcome";
import type { UserRole } from "@/types/database";

import { redactDbError } from "@/lib/errors/redact";
/** The subject of every row this route writes. FIX-13: a thing, never a person. */
const SUBJECT_TYPE = "membership" satisfies DoorSubjectType;

/**
 * The phone's reading of when it scanned, when it supplied one.
 *
 * A device clock is **evidence**, never authority: it is what lets
 * classification tell a double read from two devices afterwards, and it is
 * never what decides anything here. An unparseable value falls back to the
 * server clock rather than rejecting the sync — refusing would strand a queued
 * entry from an older bundle on a staff phone.
 */
function parseIsoInstant(value: unknown): string | null {
  if (typeof value !== "string" || value.trim() === "") return null;
  const ms = Date.parse(value);
  if (Number.isNaN(ms)) return null;
  return new Date(ms).toISOString();
}

/** Which path produced the row. Same fallback reasoning as `scannedAt`. */
function parseSource(value: unknown): DoorScanSource {
  return value === "offline_sync" || value === "online" ? value : "online";
}

/** Absent means `"unknown"`, never a rejection — see `parseIsoInstant`. */
function parseDeviceId(value: unknown): string {
  return typeof value === "string" && value.trim() !== "" ? value.trim() : "unknown";
}

/**
 * The closed role set, at runtime.
 *
 * `UserRole` is a type and disappears at build time, so a value arriving from a
 * phone cannot be checked against it. `ROLES` (`src/lib/rbac/roles.ts`) is its
 * runtime mirror, and this line is what binds the two: the annotation is an
 * assignment and **not a cast**, so a value in `ROLES` that the union does not
 * name is a `npm run build` error. The mirror is ASYMMETRIC in the same way
 * `acts.ts` describes its own — the union gaining a fifth role while `ROLES`
 * does not is *not* caught here, and would show up as a real role written as
 * NULL by the branch below. That direction is the safe one: the entry is still
 * admitted and the marker reads *unknown*, never *member*.
 *
 * Deriving the set instead of re-typing four literals is the whole point:
 * `20260808003000_attendances_entry_role.sql` refuses a CHECK precisely so this
 * repository stops at three enumerations of the role list, and a fourth written
 * by hand here would have re-created the thing the migration declined.
 */
const KNOWN_ROLES: readonly UserRole[] = Object.values(ROLES);

/**
 * The role label the DOOR read, on a queued sync — D-17.
 *
 * A queued entry is composed on a phone, so this value is client-supplied, and
 * the disposition of that is written down (T-43-10-01, `accept, bounded`): it
 * is a **label, never a permission**. The operator sending it already holds
 * `door.operate` and can admit anyone they like; a false label makes a night
 * report wrong, it does not open a door. Deriving the value at sync time
 * instead would be strictly worse than trusting it — `profiles.role` read hours
 * after the night is the mutable-role problem the column exists to avoid, moved
 * to a different moment and made invisible.
 *
 * Returns `null` for anything outside the closed set, which the caller writes
 * as NULL. `null` here means **unknown**, and the caller must never read it as
 * *member*.
 */
function parseDoorEntryRole(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (trimmed === "") return null;
  return (KNOWN_ROLES as readonly string[]).includes(trimmed) ? trimmed : null;
}

// GET — backward compatible: membership card view uses this.
//
// **Left exactly as it was, and that is a decision, not an oversight.** It
// answers valid / not-valid for a membership code with no session and no rate
// limit, over a code space generated with `Math.random()` (`src/utils/qr.ts:49`)
// — a brute-force oracle. Both halves are known and deferred by name: RATE-01
// (no rate limiting exists anywhere in this repository) and QR-01. This plan
// neither fixes them silently nor pretends they are fixed, and it does not
// widen this handler. The three-outcome contract below applies to the POST,
// which is the door path; changing this GET's shape would break the membership
// card view for no gain.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");

  if (!code) {
    return NextResponse.json({ valid: false, error: "No code provided" }, { status: 400 });
  }

  const supabase = await createClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name, membership_code")
    .eq("membership_code", code)
    .single();

  if (!profile) {
    return NextResponse.json({ valid: false });
  }

  return NextResponse.json({
    valid: true,
    member_name: profile.full_name,
    membership_code: profile.membership_code,
  });
}

// POST — door check-in: verify member + record attendance for selected party
export async function POST(request: Request) {
  try {
    // May this person work the door tonight? `door.operate`, role alone — the
    // same one function the other three door routes ask, resolved ONCE because
    // `cache()` does not memoise inside a Route Handler.
    //
    // The local copy this replaces read `userProfile.role`, not `profile.role`.
    // That naming is why the criterion-3 assertion for this phase is
    // variable-agnostic: `grep -c 'profile.role !== '` scored **0** on this file
    // whether the dead code was still sitting here or not.
    const auth = await requireDoorOperator();
    if (!auth.ok) {
      // 401 and 403 keep the exact bodies they had — `{valid:false, status}`
      // with no `error` field. `unresolved` is the new third case and carries
      // one, because the staff member holding the phone has to be able to tell
      // "we could not check" from "you are not allowed".
      if (auth.kind === "unresolved") {
        return NextResponse.json(
          {
            valid: false,
            status: DOOR_UNRESOLVED_STATUS,
            error: auth.error,
          },
          { status: auth.status }
        );
      }
      return NextResponse.json(
        {
          valid: false,
          status: auth.kind === "unauthenticated" ? "unauthorized" : "forbidden",
        },
        { status: auth.status }
      );
    }

    let body: {
      code?: string;
      partyId?: string;
      scannedAt?: string;
      deviceId?: string;
      source?: string;
      /**
       * The role the roster carried when this entry was taken at the door —
       * D-17. **`entryRole` is the field name plan 43-13 must send**, camelCase
       * like every other field on this body, and it is written to the snake_case
       * `attendances.entry_role`. Read only when `source === "offline_sync"`;
       * see the insert below.
       */
      entryRole?: string;
    };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { valid: false, error: "Invalid request body" },
        { status: 400 }
      );
    }

    const { code, partyId } = body;
    const scannedAt = parseIsoInstant(body.scannedAt) ?? new Date().toISOString();
    const deviceId = parseDeviceId(body.deviceId);
    const source = parseSource(body.source);

    const serviceClient = getServiceClient();
    // Who is holding the phone. Server-derived from the session, never from the
    // body — the service client below bypasses RLS, so every value it writes is
    // either server-derived or explicitly validated above. It now comes from
    // `auth.uid()` inside the JWT, verified by Postgres, rather than from a
    // separate round trip to the Auth server. Non-null by the type on the
    // `ok: true` arm: an attendance row with no operator is an unattributed
    // admission.
    const operatorId = auth.userId;

    /**
     * Append one row to the night's record, before returning anything.
     *
     * FIX-11's review list reads `door_scan_events` after the night. Half the
     * door's scans are membership codes, so a list built only from tickets is
     * empty for the wrong reason.
     *
     * `cause` is NULL on every row written here: classification happens
     * afterwards, over these rows, never at a phone held in front of a person
     * (src/lib/door/outcome.ts:23-31).
     *
     * `token_fingerprint` is NULL and cannot be otherwise. A membership QR is a
     * plain URL carrying the code (`src/utils/qr.ts:33-43`) — there is no
     * signature to digest. The proof on this path is therefore **weaker** than
     * on the ticket path, where the token is HMAC-signed: possession of the
     * string is the only claim, and the code itself is generated with
     * `Math.random()` (`qr.ts:49`, open defect QR-01). That is a fact to carry
     * in the record, not to paper over with a digest of something unsigned.
     *
     * Returns false on failure. The caller must not answer `recorded` on a
     * false: with no error tracking in this project, a log line is a place
     * nobody looks, and an entry the queue believes was recorded is an entry
     * that disappears.
     */
    async function recordScanEvent(args: {
      partyId: string;
      eventId: string;
      subjectUserId: string | null;
      outcome: DoorScanOutcomeKind;
    }): Promise<boolean> {
      const { error } = await serviceClient.from("door_scan_events").insert({
        party_id: args.partyId,
        event_id: args.eventId,
        subject_type: SUBJECT_TYPE,
        ticket_id: null,
        guest_entry_id: null,
        subject_user_id: args.subjectUserId,
        outcome: args.outcome,
        cause: null,
        scanned_at: scannedAt,
        operator_id: operatorId,
        device_id: deviceId,
        source,
        token_fingerprint: null,
      });
      if (error) {
        console.error(
          "[membership-verify] door_scan_events insert failed:",
          error
        );
        return false;
      }
      return true;
    }

    // A scan with no party selected has no meaning, and it is the one outcome
    // that **cannot** be recorded: `door_scan_events.party_id` is NOT NULL
    // (migration :64-66) because the party is the unit of the review list.
    // There is no night to file this under. Permanent, so 422 — the queue
    // retires it instead of retrying it on every `online` event forever.
    if (!partyId || typeof partyId !== "string") {
      return NextResponse.json(
        {
          valid: false,
          error: "code and partyId are required",
          outcome: "not_valid" satisfies DoorScanOutcomeKind,
          reason: "no_party_selected" satisfies DoorNotValidReason,
        },
        { status: DOOR_HTTP.not_valid }
      );
    }

    // Resolve the party first: everything below needs a night to file itself
    // under. Both branches of the `.single()` are handled — "does not exist"
    // and "there are two" are different errors, and the second is corruption.
    const { data: party, error: partyError } = await serviceClient
      .from("event_parties")
      .select("id, event_id")
      .eq("id", partyId)
      .single();

    if (partyError && partyError.code !== "PGRST116") {
      console.error(`[membership-verify.party_lookup_failed] ${redactDbError(partyError)}`);
      return NextResponse.json(
        { valid: false, error: "Party lookup failed" },
        { status: 500 }
      );
    }

    // Unknown party — the second outcome that cannot be recorded, this time
    // because `party_id` is a foreign key: there is no `event_parties` row to
    // point at. Permanent, so 422 rather than the old 404 that the queue
    // retried forever.
    if (!party) {
      return NextResponse.json(
        {
          valid: false,
          error: "Party not found",
          outcome: "not_valid" satisfies DoorScanOutcomeKind,
          reason: "wrong_night" satisfies DoorNotValidReason,
        },
        { status: DOOR_HTTP.not_valid }
      );
    }

    // Look up the member by membership_code. Both `.single()` branches again.
    //
    // An absent or blank `code` falls through to the same place as a code that
    // resolves to nobody, and for the same reason: a code that is not there
    // cannot be found. It is deliberately **not** reported as
    // `no_party_selected` — that reason sends a member of staff to the party
    // selector when the fault is an empty scan, and a message that names the
    // wrong cause is the failure mode `meta-gates.md` calls out by name.
    //
    // `role` joins this select and does **not** get one of its own. It is one
    // word in a query that already runs, on the door's hot path, and
    // `checkin-offline.md` is the reason it must stay that way: at the door a
    // slow query is a queue, and a second round trip per scan is a second
    // round trip per person standing in front of the phone. The count of
    // `profiles` queries in this file is unchanged by this plan: THREE before
    // and three after — this one, the GET handler's, and the operator-label
    // lookup in the 23505 branch, of which the check-in path reaches at most
    // two (T-43-10-03). The assertion greps this file for the profiles-table
    // call; it is written here in words rather than as the pattern itself,
    // because a comment quoting the pattern would be counted by it.
    let profile: {
      id: string;
      full_name: string;
      membership_code: string;
      role: string | null;
    } | null = null;

    if (typeof code === "string" && code.trim() !== "") {
      const { data, error: profileError } = await serviceClient
        .from("profiles")
        .select("id, full_name, membership_code, role")
        .eq("membership_code", code)
        .single();

      if (profileError && profileError.code !== "PGRST116") {
        // Two profiles on one membership_code is data corruption, not a miss,
        // and it gets its own log category so the two never read alike.
        console.error(
          "[membership-verify] profile lookup failed (not a miss):",
          profileError
        );
        return NextResponse.json(
          { valid: false, error: "Member lookup failed" },
          { status: 500 }
        );
      }

      profile = data;
    }

    // **The single most consequential line in this file.**
    //
    // This branch used to return HTTP 200 with `{valid:false,
    // status:"not_found"}`. `src/lib/offline/sync-manager.ts:52` marks a
    // membership entry synced on `res.ok`, which was `true` — so a scan the
    // server could never accept was silently deleted from the queue and
    // vanished. 422 makes it classifiable as permanently failed: the entry is
    // retired *visibly* instead of disappearing, which is what FIX-08's "so the
    // pending count means something" refers to.
    //
    // The party is known here, so unlike the two branches above this one **is**
    // recordable: the row carries `subject_user_id: null`, which says a code was
    // read at this door and resolved to nobody.
    if (!profile) {
      const recorded = await recordScanEvent({
        partyId: party.id,
        eventId: party.event_id,
        subjectUserId: null,
        outcome: "not_valid",
      });
      if (!recorded) {
        return NextResponse.json(
          { valid: false, error: "Failed to record scan" },
          { status: 500 }
        );
      }
      return NextResponse.json(
        {
          valid: false,
          status: "not_found",
          outcome: "not_valid" satisfies DoorScanOutcomeKind,
          reason: "unknown_code" satisfies DoorNotValidReason,
        },
        { status: DOOR_HTTP.not_valid }
      );
    }

    // A presence belongs to a **party**, not to an evening.
    //
    // A double bill is one event with two parties — the sunset act and the
    // night act, communicated as one evening. Until plan 31-04's migration
    // `attendances` was `unique(event_id, user_id)`, so a member present at
    // both acts collided on the second scan and the door was told they had
    // already been admitted. That is a *false* refusal, in front of a queue,
    // every time — the error `checkin-offline.md` exists to prevent.
    //
    // `party_id` is nullable in the schema and a NULL there means the presence
    // is **event-level**, which is a real thing in this product. Nothing in
    // this route ever writes one: a membership scan always names a party, and
    // a scan with no party selected never reaches this line. So a NULL
    // `party_id` on a row is not a bug in this file — it is a row written
    // before the migration, or by some other path.
    //
    // `checked_in_at` is the **server** clock even when the phone supplied a
    // `scannedAt`: a device clock is evidence, never authority. The device's
    // own reading is carried on the `door_scan_events` row instead.

    /**
     * `entry_role` — what this entry WAS, taken at the door (D-13, D-17).
     *
     * `checked_in_at` above takes the server clock over the phone's, and this
     * value goes the other way on purpose. The two are not in tension: a clock
     * is a fact the server can establish better than the device, and *what the
     * roster said when a person was admitted* is a fact only the device holds.
     * Reading `profiles.role` at sync time would answer a different question —
     * *what is this account now* — hours or days after the night, and would
     * make an entry look like whatever the account has since become.
     *
     * Hence the order:
     *
     *   1. a queued sync (`source === "offline_sync"`) uses the label the
     *      device carried, validated against the closed set;
     *   2. everything else uses the role just read from the profile, because
     *      online the door and the write are the SAME moment and the freshly
     *      read value IS the door-time value.
     *
     * Nothing sends `entryRole` yet — the offline store, the sync manager and
     * the scanner are plan 43-13, and this is the surface it implements
     * against. Until it lands, a queued membership sync writes NULL: *unknown*,
     * which is true, and never *member*, which would not be.
     */
    let entryRole: string | null = null;
    if (source === "offline_sync") {
      entryRole = parseDoorEntryRole(body.entryRole);
      if (entryRole === null && body.entryRole !== undefined) {
        // **The asymmetry, at the site.** An unrecognised role label is NOT a
        // reason to refuse an entry. Refusing a valid guest happens in front of
        // a queue, needs a human to unpick it and ruins the night of someone
        // who was let in by the community; a night report carrying one entry
        // marked *unknown* is a number read at a desk, later, by someone who
        // can ask. `checkin-offline.md`: when the information is uncertain the
        // default is admit and record.
        //
        // Its own log category, so it never reads like the profile-lookup or
        // the insert failure above and below it. The value is truncated because
        // it is client-supplied and unbounded, and it is the only thing that
        // makes this diagnosable at all.
        //
        // The observable effect this project's zero-silent-failure rule asks
        // for is deliberately NOT at the door: the operator would see a warning
        // about a label they cannot act on while people wait. It lands where
        // the fault can be acted on instead — a NULL `entry_role` on a row
        // written after the column existed is visible in the night report, and
        // the migration says a NULL is never to be read as *member*. Stated
        // rather than implied, because it is weaker than an at-the-door effect
        // and that is a choice, not an oversight.
        console.warn(
          "[membership-verify] unrecognised entry_role from device — admitted, entry_role written NULL:",
          {
            deviceId,
            received: String(body.entryRole).slice(0, 32),
          }
        );
      }
    } else {
      entryRole = profile.role ?? null;
    }

    const { data: attendance, error: insertError } = await serviceClient
      .from("attendances")
      .insert({
        event_id: party.event_id,
        party_id: party.id,
        user_id: profile.id,
        checked_in_at: new Date().toISOString(),
        checked_in_by: operatorId,
        entry_role: entryRole,
      })
      .select("id, checked_in_at")
      .single();

    if (insertError) {
      // Unique constraint violation — this member is already present here.
      //
      // The existing row keeps the `entry_role` it was written with, and this
      // branch deliberately does not update it: the marker belongs to the
      // FIRST admission, which is the one that took a seat. A second read
      // rewriting it would let a role changed between the two scans overwrite
      // what the door saw — the very thing the column exists to prevent.
      if (insertError.code === "23505") {
        // The `party_id` predicate is not optional and is not a refinement.
        //
        // It must agree with the partial unique index the constraint now lives
        // in — `attendances_party_user_unique ON (party_id, user_id) WHERE
        // party_id IS NOT NULL`
        // (supabase/migrations/20260805120000_door_scan_events.sql:248-250).
        // Postgres treats NULLs as distinct, which is why that migration used
        // two partial indexes rather than one three-column key; a lookup that
        // matched only `event_id` + `user_id` would, on a double bill, return
        // the **other** party's row and report a moment from a different act of
        // the same evening. The migration names this file for that reason
        // (same file:262-268).
        const { data: existing } = await serviceClient
          .from("attendances")
          .select("id, checked_in_at, checked_in_by")
          .eq("event_id", party.event_id)
          .eq("party_id", party.id)
          .eq("user_id", profile.id)
          .single();

        // Resolve the operator through a separate fetch and a Map — the
        // convention at src/app/api/tickets/attendance/route.ts:77-86 — not a
        // join. `checked_in_by` is nullable and the undo path sets it to NULL,
        // so "who" is genuinely unknowable on some rows: `by` is then null,
        // which says *not recorded*, never *nobody*.
        //
        // Named `firstOperatorId` and not `operatorId`: the outer `operatorId`
        // is whoever is holding the phone **now**, this one is whoever recorded
        // the entry the **first** time, and on a genuine repeat they are
        // routinely two different people at two different doors. Shadowing the
        // name would make the response's own meaning ambiguous at a glance.
        const firstOperatorId =
          (existing?.checked_in_by as string | null) ?? null;
        let operatorLabel: string | null = null;
        if (firstOperatorId) {
          const { data: operators } = await serviceClient
            .from("profiles")
            .select("id, full_name")
            .in("id", [firstOperatorId]);
          const operatorMap = new Map<string, string>();
          for (const p of operators ?? []) {
            operatorMap.set(p.id as string, (p.full_name as string) ?? "Unknown");
          }
          operatorLabel = operatorMap.get(firstOperatorId) ?? "Unknown";
        }

        // The response is **additive**, and the two halves disagree on purpose.
        //
        // Legacy half (`valid`, `status`, `member_name`, `checked_in_at`): a
        // staff phone can be running the previous bundle for a whole session,
        // and that session is a night at the door. The old bundle reads
        // `valid: true` as an admission — the safe direction, given that a
        // false refusal happens in front of a queue while a double admission is
        // a number in a report.
        //
        // Contract half (`outcome`, `subject`, `at`, `by`): the new bundle
        // renders the amber third state. `already_recorded` carries **no**
        // cause: classification happens afterwards over `door_scan_events`,
        // never at a phone held in front of a person (src/lib/door/outcome.ts:23-31).
        //
        // `at` is the moment of the **first** record, so when `checked_in_at`
        // is NULL it stays null: substituting the current clock would state
        // this read as the first record, which is exactly what
        // src/lib/door/outcome.ts:105 forbids.
        const eventRecorded = await recordScanEvent({
          partyId: party.id,
          eventId: party.event_id,
          subjectUserId: profile.id,
          outcome: "already_recorded",
        });
        if (!eventRecorded) {
          // A conflict acknowledged and then not persisted is the evidence of a
          // second read destroyed at the moment it arrived — the defect this
          // phase exists to fix. Return a retryable failure so the queue keeps
          // the entry, rather than a 409 the sync manager drains.
          return NextResponse.json(
            { valid: false, error: "Failed to record scan" },
            { status: 500 }
          );
        }

        return NextResponse.json(
          {
            valid: true,
            status: "already_checked_in",
            member_name: profile.full_name,
            checked_in_at: existing?.checked_in_at || null,
            outcome: "already_recorded" satisfies DoorScanOutcomeKind,
            subject: {
              type: "membership" satisfies DoorSubjectType,
              id: profile.id,
            },
            at: existing?.checked_in_at || null,
            by: firstOperatorId
              ? { operatorId: firstOperatorId, operatorLabel }
              : null,
          },
          { status: DOOR_HTTP.already_recorded }
        );
      }

      // Distinct from the 23505 branch above, which is not an error at all:
      // this is a write that failed for a reason nobody has classified. With
      // no error tracking in this project a log line is a place nobody looks,
      // so the observable effect is the 500 the door sees.
      //
      // `code` and `message` only, never the error object whole. PostgREST puts
      // the OFFENDING ROW in `details` on a constraint violation, and the row
      // this branch is inserting names a member; measurement 43-01 found the
      // same shape publishing a full name and a `membership_code`, which is the
      // door's only credential. The narrowing arrived with this plan because
      // this plan changed what the insert carries.
      console.error(
        "[membership-verify] attendance insert failed (non-conflict):",
        { code: insertError.code, message: insertError.message }
      );
      return NextResponse.json(
        { valid: false, error: "Failed to record attendance" },
        { status: 500 }
      );
    }

    // The attendance row is the presence; this row is the *record of the scan*,
    // and the review list is built from the second, not the first. Written
    // before the answer goes back, for the same reason as the conflict branch:
    // an admission the queue believes was recorded end to end, but which left
    // no trace, is an admission nobody can ever review.
    const scanRecorded = await recordScanEvent({
      partyId: party.id,
      eventId: party.event_id,
      subjectUserId: profile.id,
      outcome: "recorded",
    });
    if (!scanRecorded) {
      // Deliberately not `recorded`. The presence is already written, so a
      // retry lands on the 23505 branch and answers `already_recorded` — which
      // is true, and which the queue can drain. Answering `recorded` here would
      // claim a record that does not exist.
      return NextResponse.json(
        { valid: false, error: "Failed to record scan" },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        valid: true,
        status: "checked_in",
        member_name: profile.full_name,
        membership_code: profile.membership_code,
        attendance_id: attendance.id,
        outcome: "recorded" satisfies DoorScanOutcomeKind,
        subject: {
          type: SUBJECT_TYPE,
          id: profile.id,
        },
        at: attendance.checked_in_at,
      },
      { status: DOOR_HTTP.recorded }
    );
  } catch (error) {
    console.error("Membership verify error:", error);
    return NextResponse.json(
      { valid: false, status: "error" },
      { status: 500 }
    );
  }
}
