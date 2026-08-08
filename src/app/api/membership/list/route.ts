import { NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase/service";
import {
  DOOR_UNRESOLVED_STATUS,
  requireDoorOperator,
} from "@/lib/door/require-operator";

/**
 * GET — the whole member roster (id, full_name, membership_code, role),
 * downloaded so the door can find a member with the radio off. Its only caller
 * is `src/app/(admin)/admin/scanner/ScannerClient.tsx:574`.
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
 * touching this route, not assumed.
 *
 * ── What phase 43, plan 10 changed, and the sentence it had to delete ────────
 *
 * The paragraph above used to end *"this plan changes who may call, not the
 * path and not the response body"*. That was true of phase 32 and this plan
 * makes it FALSE: **the response body gained `role`**. Leaving the sentence
 * standing is how a file's own documentation turns into a lie that the next
 * reader trusts, so it is replaced rather than appended to. What is true now:
 *
 *   * the body gains a role label per member — a label, never a permission;
 *   * the path is unchanged, and the route stays `NetworkOnly`, so **no cache
 *     rule and no invalidation is affected** by this plan either;
 *   * the WHO is unchanged: still `door.operate`, through the same
 *     `requireDoorOperator()`.
 *
 * ── The admission set is UNCHANGED, and that is the load-bearing line ────────
 *
 * The query below filters on `membership_code IS NOT NULL` and on **neither
 * role nor status**, exactly as before. That is deliberate and it is not an
 * oversight to be tidied up: this list is what the phone searches at 2am with
 * no signal, and a person missing from it is refused at the door in front of a
 * queue. Adding `role` to the SELECT adds a field to each row; it removes no
 * row. Anyone in the roster before this plan is in the roster after it.
 *
 * ── Why a role label here is design and not new personal data ────────────────
 *
 * Said explicitly rather than left to be inferred (T-43-10-04, `accept`): this
 * payload ALREADY carries every full name and every membership code in the
 * community — the door's only credential — to every phone that may work a
 * door. Against that, the fact that an account is `staff` rather than `member`
 * is not a new category of exposure; it is one more field inside a boundary
 * that was already crossed, guarded by the same capability. The label exists so
 * plan 43-13 can cache it and send it back at sync time, which is D-17: the
 * marker on a free entry must be the one taken AT the door, not one derived
 * from a mutable column whenever the queue happens to drain.
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
  // `role` is added to the SELECT. The `.not(...)` filter is untouched, and no
  // `.eq("role", …)` and no `.eq("status", …)` joins it: see the admission-set
  // paragraph above. One field more per row, not one row fewer.
  const { data: members, error } = await serviceClient
    .from("profiles")
    .select("id, full_name, membership_code, role")
    .not("membership_code", "is", null);

  if (error) {
    // The 500 was already the observable effect — the scanner reports a failed
    // roster refresh — but nothing was written down, so nobody could ever say
    // WHY the door went a night on a stale roster. Its own category, and
    // `code` and `message` only: PostgREST returns the offending row in
    // `details`, and the row here is a member's, with the `membership_code`
    // that is the door's only credential (measurement 43-01).
    console.error("[membership-list] roster fetch failed:", {
      code: error.code,
      message: error.message,
    });
    return NextResponse.json({ error: "Failed to fetch members" }, { status: 500 });
  }

  return NextResponse.json({ members: members ?? [] });
}
