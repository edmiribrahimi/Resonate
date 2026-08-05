import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getServiceClient } from "@/lib/supabase/service";
import { DOOR_HTTP } from "@/lib/door/outcome";
import type {
  DoorScanOutcomeKind,
  DoorSubjectType,
} from "@/lib/door/outcome";

// GET — backward compatible: membership card view uses this
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
    // Verify authenticated user with admin/organizer role
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { valid: false, status: "unauthorized" },
        { status: 401 }
      );
    }

    const { data: userProfile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (
      !userProfile ||
      (userProfile.role !== "master" && userProfile.role !== "organizer")
    ) {
      return NextResponse.json(
        { valid: false, status: "forbidden" },
        { status: 403 }
      );
    }

    let body: { code?: string; partyId?: string };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { valid: false, error: "Invalid request body" },
        { status: 400 }
      );
    }

    const { code, partyId } = body;

    if (!code || !partyId) {
      return NextResponse.json(
        { valid: false, error: "code and partyId are required" },
        { status: 400 }
      );
    }

    const serviceClient = getServiceClient();

    // Look up member by membership_code
    const { data: profile } = await serviceClient
      .from("profiles")
      .select("id, full_name, membership_code")
      .eq("membership_code", code)
      .single();

    if (!profile) {
      return NextResponse.json({ valid: false, status: "not_found" });
    }

    // Resolve event_id from event_parties
    const { data: party } = await serviceClient
      .from("event_parties")
      .select("id, event_id")
      .eq("id", partyId)
      .single();

    if (!party) {
      return NextResponse.json(
        { valid: false, error: "Party not found" },
        { status: 404 }
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
    const { data: attendance, error: insertError } = await serviceClient
      .from("attendances")
      .insert({
        event_id: party.event_id,
        party_id: party.id,
        user_id: profile.id,
        checked_in_at: new Date().toISOString(),
        checked_in_by: user.id,
      })
      .select("id, checked_in_at")
      .single();

    if (insertError) {
      // Unique constraint violation — this member is already present here.
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
        const operatorId = (existing?.checked_in_by as string | null) ?? null;
        let operatorLabel: string | null = null;
        if (operatorId) {
          const { data: operators } = await serviceClient
            .from("profiles")
            .select("id, full_name")
            .in("id", [operatorId]);
          const operatorMap = new Map<string, string>();
          for (const p of operators ?? []) {
            operatorMap.set(p.id as string, (p.full_name as string) ?? "Unknown");
          }
          operatorLabel = operatorMap.get(operatorId) ?? "Unknown";
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
            by: operatorId ? { operatorId, operatorLabel } : null,
          },
          { status: DOOR_HTTP.already_recorded }
        );
      }

      // Distinct from the 23505 branch above, which is not an error at all:
      // this is a write that failed for a reason nobody has classified. With
      // no error tracking in this project a log line is a place nobody looks,
      // so the observable effect is the 500 the door sees.
      console.error(
        "[membership-verify] attendance insert failed (non-conflict):",
        insertError
      );
      return NextResponse.json(
        { valid: false, error: "Failed to record attendance" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      valid: true,
      status: "checked_in",
      member_name: profile.full_name,
      membership_code: profile.membership_code,
      attendance_id: attendance.id,
    });
  } catch (error) {
    console.error("Membership verify error:", error);
    return NextResponse.json(
      { valid: false, status: "error" },
      { status: 500 }
    );
  }
}
