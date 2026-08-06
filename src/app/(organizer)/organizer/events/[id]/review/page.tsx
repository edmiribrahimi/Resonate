import { headers } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import MobileNav from "@/components/layout/MobileNav";
import { classifyNight } from "@/lib/door/classify";
import { partyStartInstant, partyEndInstant } from "@/utils/datetime";
import ReviewListClient from "./ReviewListClient";
import type {
  UserRole,
  UserStatus,
  DoorScanEvent,
  EventParty,
} from "@/types/database";

/**
 * The night's review list.
 *
 * ── Where this lives, and why ────────────────────────────────────────────────
 * Under the **organizer** tree, beside `events/[id]/{sales,tickets,guest-list,
 * analytics}` — the owner's decision. Phase 34 collapses the duplicated admin
 * and organizer trees; a new top-level address would have to be redirected then.
 *
 * ── No notification, by requirement ──────────────────────────────────────────
 * FIX-11 states that this list raises no notification and asks for no action.
 * Nothing here writes to anybody's inbox, adds a badge to navigation, or keeps a
 * counter somebody is pinged about, and that is not an omission to be improved
 * later: a
 * surface that pings somebody every time a code was read twice trains the person
 * supervising the night to stop reading it. On a normal night nobody has to open
 * this page, and if they do it is empty and says so.
 */

/**
 * Per-night operational data, and it must never be served from a cache.
 * `nextjs-architecture.md` gate *cache esplicita*: a surface showing per-user or
 * operational data declares itself uncacheable rather than inheriting a default.
 * The page already reads `headers()`, so this is belt and braces — and the belt
 * is the part a future refactor can remove by accident.
 */
export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

/** The columns of `door_scan_events`, named once. There is no join. */
const SCAN_EVENT_COLUMNS =
  "id, party_id, event_id, subject_type, ticket_id, guest_entry_id, subject_user_id, outcome, cause, scanned_at, recorded_at, operator_id, device_id, source, token_fingerprint, is_undo";

export default async function DoorReviewPage({
  params,
  searchParams,
}: PageProps) {
  const { id: eventId } = await params;
  const query = await searchParams;

  const headersList = await headers();
  const role = (headersList.get("x-user-role") as UserRole) || null;
  const status = (headersList.get("x-user-status") as UserStatus) || null;
  const userId = headersList.get("x-user-id") || "";

  // Defense in depth: verify organizer or master access.
  //
  // These headers are trustworthy because FIX-01 made the middleware delete any
  // inbound copy before setting its own (`src/lib/supabase/middleware.ts`). But
  // this is the **interface** layer — it decides where somebody may go. What
  // decides what they may read is `door_scan_events_select_admin`, and this
  // surface needs both: the redirect alone would leave the night readable
  // through the API by anyone holding the anonymous key.
  if (role !== "organizer" && role !== "master") {
    redirect("/dashboard");
  }

  // The normal server client, and **not** the RLS-bypassing service client from
  // `@/lib/supabase/service`. That client bypasses every policy, so reading the
  // night through it would move the boundary into this page and leave
  // `door_scan_events_select_admin` decorative — true only for as long as nobody
  // reaches the table another way. Its absence here is checked by a grep, which
  // is why the name is not written out even in this comment.
  const supabase = await createClient();

  const { data: event, error: eventError } = await supabase
    .from("events")
    .select("id, title, created_by")
    .eq("id", eventId)
    .single();

  if (eventError || !event) {
    redirect("/organizer/events");
  }

  // Verify ownership (organizer owns event OR user is master).
  //
  // Recorded honestly: the RLS policy is `is_admin_or_organizer()` and is **not**
  // per-event. Per-night scoping of an organizer arrives in Phase 35, and the
  // migration says so (`20260805120000_door_scan_events.sql:151-156`). Until
  // then this check is the only per-event boundary there is.
  if (role === "organizer" && event.created_by !== userId) {
    redirect("/organizer/events");
  }

  const { data: parties, error: partiesError } = await supabase
    .from("event_parties")
    .select("id, title, date, time, end_time")
    .eq("event_id", eventId)
    .order("sort_order", { ascending: true });

  type PartyRow = Pick<EventParty, "id" | "title" | "date" | "time" | "end_time">;
  const partyList = (parties ?? []) as PartyRow[];

  // A party id from the query string is untrusted input. Resolving it against
  // the parties **of this event** is not tidiness: an unchecked id would let an
  // organizer read another event's night by editing the address, which is the
  // one per-event boundary this page carries (see the ownership note above).
  const requestedParty =
    typeof query.party === "string" ? query.party : undefined;
  const selectedParty =
    partyList.find((p) => p.id === requestedParty) ?? partyList[0] ?? null;

  let rows: DoorScanEvent[] = [];
  let readError: string | null = null;

  if (partiesError) {
    console.error("review:parties_read", {
      eventId,
      code: partiesError.code,
      message: partiesError.message,
    });
    readError = "The night's list could not be loaded: reading the parties failed.";
  }

  // The night's own window, in Turin. `event_parties.date` and `.time` are
  // wall-clock values with no zone, so they go through the one module that owns
  // the conversion — never through `new Date()`, which would read them in the
  // runtime's zone (UTC on Vercel) and move the night by an hour or two.
  //
  // A night runs 22:00 → 06:00, so the end is on the next calendar day and
  // `partyEndInstant` is what knows that. Where `end_time` was never set, 06:00
  // is the night's declared close.
  const nightStart = selectedParty
    ? partyStartInstant(selectedParty.date, selectedParty.time)
    : null;
  const nightEnd = selectedParty
    ? partyEndInstant(selectedParty.date, selectedParty.end_time ?? "06:00")
    : null;

  if (selectedParty && !readError) {
    // Scoped by `party_id`, which **is** the night: the migration makes the
    // party the unit of the review list, and every writer sets it.
    //
    // Deliberately *not* also filtered on `recorded_at` between the two instants
    // above. On the offline path `recorded_at` is when the queue drained, which
    // can be the next morning — so a window on that column would drop precisely
    // the offline-synced rows this surface exists to reveal. The window is used
    // instead to render the night in its own terms and to mark a row that landed
    // outside it, which is information rather than a silent deletion.
    const { data, error } = await supabase
      .from("door_scan_events")
      .select(SCAN_EVENT_COLUMNS)
      .eq("party_id", selectedParty.id)
      .order("recorded_at", { ascending: true });

    if (error) {
      // Zero silent failures, and this surface is the one where a silent failure
      // is worst: an empty list is the *designed* state of a normal night, so a
      // failed read that renders identically is indistinguishable from "nothing
      // happened". With no error tracking in this project a log is a place
      // nobody looks, so the message is carried to the screen as well.
      console.error("review:scan_events_read", {
        eventId,
        partyId: selectedParty.id,
        code: error.code,
        message: error.message,
      });
      readError =
        "The night's record could not be read. This is a failure, not a quiet night — the list below is empty because nothing was loaded.";
    } else {
      rows = (data ?? []) as DoorScanEvent[];
    }
  }

  const { listed, counters, unclassified, total } = classifyNight(rows);

  // Labels for the prose view only, kept as its own prop so the technical view
  // can render the classified rows without it and cannot accidentally include
  // it. `full_name` **only** — `sales/page.tsx:88-99` selects an address here
  // too and ships it into its client component; FIX-12 forbids that on this
  // surface, and the technical view is copied out of the browser by design.
  //
  // Operators only, and not the subjects. Naming the member whose ticket
  // conflicted would turn a list of tickets into a list of people, which is
  // FIX-13's whole prohibition; naming the member of staff who performed a
  // recorded action is the opposite — `community-membership.md` gate *chi decide
  // e' tracciato* asks for exactly that.
  const operatorIds = [...new Set(listed.map((entry) => entry.operatorId))];
  const operatorLabels: Record<string, string> = {};
  if (operatorIds.length > 0) {
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", operatorIds);

    if (profilesError) {
      // Not fatal, and deliberately its own category: the list is readable with
      // identifiers where a name is missing, and losing the whole night because
      // a label lookup failed would be the worse failure.
      console.error("review:operator_labels_read", {
        eventId,
        code: profilesError.code,
        message: profilesError.message,
      });
    }
    for (const profile of profiles ?? []) {
      operatorLabels[profile.id] = profile.full_name ?? "";
    }
  }

  return (
    <div className="min-h-dvh pb-24">
      <header className="px-6 pt-12 pb-6">
        <Link
          href="/organizer/events"
          className="text-sm text-muted hover:text-foreground transition-colors"
        >
          &larr; Back to Events
        </Link>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">Door review</h1>
        <p className="text-sm text-muted">{event.title}</p>
      </header>

      <div className="px-6">
        <ReviewListClient
          eventId={eventId}
          parties={partyList.map((p) => ({ id: p.id, title: p.title }))}
          selectedPartyId={selectedParty?.id ?? null}
          entries={listed}
          counters={counters}
          unclassified={unclassified}
          total={total}
          operatorLabels={operatorLabels}
          role={role}
          nightStartIso={nightStart ? nightStart.toISOString() : null}
          nightEndIso={nightEnd ? nightEnd.toISOString() : null}
          readError={readError}
        />
      </div>

      <MobileNav role={role} status={status} />
    </div>
  );
}
