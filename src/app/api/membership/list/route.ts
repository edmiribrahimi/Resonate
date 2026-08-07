import { NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase/service";
import {
  DOOR_UNRESOLVED_STATUS,
  requireDoorOperator,
} from "@/lib/door/require-operator";

/**
 * GET — the whole member roster (id, full_name, membership_code), downloaded so
 * the door can find a member with the radio off. Its only caller is
 * `src/app/(admin)/admin/scanner/ScannerClient.tsx:574`.
 *
 * ── Why `door.operate` and not `staff.manage` ────────────────────────────────
 *
 * The two predicates are identical today — role ∈ {master, organizer}, status
 * ignored — so **no role's reach changes with this line**. The choice is a
 * statement about phase 35, which is what `keys.ts:38-45` says a key is for.
 *
 * The question this route answers is *"may this person find a member at the
 * door tonight"*. Someone granted one night's door who is not otherwise staff
 * needs tonight's roster; they must not thereby be granted the sixteen tables
 * `staff.manage` carries. Asking `door.operate` — through the same
 * `requireDoorOperator()` the scan itself asks — also means the roster and the
 * scan cannot diverge: a phone that may scan can always look someone up, and a
 * phone that may not gets the same refusal from both.
 *
 * The payload is every full name in the community, so the route is
 * `NetworkOnly` in the service worker (`src/app/sw.ts:41-44`) — read before
 * touching this route, not assumed. This plan changes **who may call**, not the
 * path and not the response body, so no cache rule and no invalidation is
 * affected.
 */
export async function GET() {
  // Once per handler — `cache()` does not memoise inside a Route Handler.
  const auth = await requireDoorOperator();
  if (!auth.ok) {
    // 401 `{error:"Unauthorized"}` and 403 `{error:"Forbidden"}` unchanged; the
    // third case is 503, retryable per `sync-manager.ts:141`.
    return NextResponse.json(
      {
        error: auth.error,
        ...(auth.kind === "unresolved"
          ? { status: DOOR_UNRESOLVED_STATUS }
          : {}),
      },
      { status: auth.status }
    );
  }

  const serviceClient = getServiceClient();
  const { data: members, error } = await serviceClient
    .from("profiles")
    .select("id, full_name, membership_code")
    .not("membership_code", "is", null);

  if (error) {
    return NextResponse.json({ error: "Failed to fetch members" }, { status: 500 });
  }

  return NextResponse.json({ members: members ?? [] });
}
