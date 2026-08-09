import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getAccessContext, hasCapability } from "@/lib/capabilities/server";
import { ownsOrIsMaster } from "@/lib/capabilities/guards";
import { CAP } from "@/lib/capabilities/keys";
import { classifyNight } from "@/lib/door/classify";
import { partyStartInstant, partyEndInstant } from "@/utils/datetime";
import ReviewListClient from "@/app/(admin)/admin/events/[id]/review/ReviewListClient";
import type { UserRole, DoorScanEvent, EventParty } from "@/types/database";

/**
 * The night's review list.
 *
 * ── Where this lives, and why it moved ───────────────────────────────────────
 * It stood in the organizer tree, beside `events/[id]/{sales,tickets,guest-list,
 * analytics}`, and deferred its address to phase 34. This is that phase
 * (D-34-03): the surface has **no `/admin` twin**, so this was a move and not a
 * merge, and the prior address answers with a redirect that `src/middleware.ts`
 * emits before any session is read. That address is written once, in
 * `src/lib/routes/organizer-redirects.ts`, and deliberately not spelled again
 * here: it is the token the phase's sweep greps for, and a comment that spells
 * it is a comment that defeats the criterion. The query string survives the
 * redirect, which matters on this surface because `?party=` is what the gate
 * below resolves the night from.
 *
 * The file is inside the `(work)` route group, which changes no URL: it is a
 * LAYOUT boundary so that `admin/(work)/layout.tsx` reaches every collapsed work
 * surface and does not reach `/admin/scanner`. `ReviewListClient.tsx` did NOT
 * come with it — R-WORK-ROUTES (plan 34-07), only route files enter `(work)` —
 * which is why the import above is absolute.
 *
 * ── What did NOT move: the assignment arm's safety ───────────────────────────
 * This is the one route under `party.manage`, and it is one of the map's two
 * assignment-openable entries (the other is the door). That flag decides only
 * whether the MIDDLEWARE lets a request reach this page. It is coarse by
 * construction: at routing time no night has been chosen, so the middleware
 * cannot ask the question that matters. **The per-night gate below is the real
 * boundary for this surface**, and it is byte-identical to what stood in the
 * organizer tree.
 *
 * ── Who may open it, and a correction to what this file used to say ──────────
 * Two arms: the owner of the event from inside the organizer area, or somebody
 * holding `party.manage` **on the night being looked at**. The second is
 * evaluated after `?party=` is resolved, so it can refuse.
 *
 * The paragraph that stood beside the ownership check said three things that
 * are no longer true, and it is corrected rather than left standing: the row
 * policy behind this page is **not** `is_admin_or_organizer()` and has not been
 * since phase 32 moved it to `staff.manage`
 * (`20260807010000_policies_to_capabilities.sql:145-149`); per-night scoping of
 * an organizer has **arrived**, in this phase; and the migration it cited for
 * that promise now says something else. A migration file records what happened
 * on a day, never what is true today — the schema is the migrations *in sum*.
 * The same stale claim survives in `35-PATTERNS.md` § D, which carries a dated
 * correction at its head, and in `31-VERIFICATION.md:882`, which does not.
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
 *
 * It used to be belt and braces: the page read `headers()` directly, which is
 * itself a dynamic API. Phase 33 removed that read, and the implicit opt-out now
 * comes from `cookies()` inside `getAccessContext()` — one import further away and
 * therefore one refactor easier to lose. So this line is no longer redundant, and
 * the reason it must stay is written here rather than assumed.
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

  // Identity from the session, not from an inbound header.
  //
  // The previous form read the middleware's headers, and FIX-01 made those
  // trustworthy by deleting any inbound copy before setting its own. That was a
  // guarantee held by a different file; this one is held by the JWT — the context
  // answers about `auth.uid()`, which no client can send.
  const ctx = await getAccessContext();

  // `ReviewListClient` is `"use client"` and still takes `role` as a prop — it
  // uses it for an interface affordance (the technical view, offered to a
  // master), which is why it is a prop and not a decision. Nothing on this page
  // branches on it.
  //
  // The two nav mounts and the `status` cast that stood beside this are gone:
  // `admin/(work)/layout.tsx` draws both navs and resolves the context once for
  // the whole tree (D-34-07). This cast survives because the affordance does,
  // and converting it is not this phase's.
  const navRole = ctx.role as UserRole | null;

  // ── The gate has TWO arms now, and the second one needs the night ───────────
  //
  // This is the **interface** layer — it decides where somebody may go. What
  // decides what they may read is `door_scan_events_select_admin`, and this
  // surface needs both: the redirect alone would leave the night readable
  // through the API by anyone holding the anonymous key.
  //
  // Arm 1 is unchanged: the organizer area, plus ownership of this event. Arm 2
  // is one night's `party.manage`, and it cannot be asked here — it has no
  // subject until `?party=` has been resolved against this event's nights. So
  // the decision moved **down**, past the parties read, and the two arms are
  // written there as one expression. Arm 1 short-circuits, so anybody who
  // passes it pays no extra round trip for arm 2's existence.
  //
  // Nothing between here and the gate reads the night's record. The reads that
  // happen first — the event row and the list of nights — are the ones the gate
  // itself needs, and both are made with the cookie-bound client, so a policy
  // still stands behind each of them.
  const holdsOrganizerAccess = ctx.capabilities.has(CAP.ORGANIZER_ACCESS);

  // Where a refusal on this page lands, decided once.
  //
  // Somebody who holds `organizer.access` goes to the events list — written as
  // `/admin/events` now that the tree has collapsed. That is the SAME endpoint
  // it named before: `/organizer/events` answers with a redirect to
  // `/admin/events`, and this branch is only reached by somebody who holds the
  // key that address is bound to. One hop fewer, nobody's destination changed.
  //
  // Somebody who arrived by **assignment** does not hold it — they are typically
  // `staff` — and sending them to the events list would bounce them again off
  // the middleware, producing two redirects and a second notice about a
  // different thing. They go to `/dashboard`. **Nobody loses a destination they
  // had.**
  const refusalDestination = holdsOrganizerAccess
    ? "/admin/events"
    : "/dashboard";

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
    redirect(refusalDestination);
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
  // organizer read another event's night by editing the address.
  //
  // It now carries a second load, and the gate below depends on it. Whatever
  // this line produces is the night arm 2 is asked about, so the resolution has
  // to happen against this event's own nights **before** the question is put —
  // otherwise the question would be about an id the caller chose freely.
  const requestedParty =
    typeof query.party === "string" ? query.party : undefined;
  const selectedParty =
    partyList.find((p) => p.id === requestedParty) ?? partyList[0] ?? null;

  // ── The gate, both arms, and the second one can FAIL ────────────────────────
  //
  // **Arm 1, unchanged and first.** The organizer area plus ownership of this
  // event. `ownsOrIsMaster` is one call and never a re-inlined comparison: it
  // refuses a null identity and an unowned row explicitly, where the comparison
  // written out by hand would compare `null !== null` and **admit**. It
  // short-circuits, so an owner never reaches the round trip below.
  //
  // **Arm 2 is evaluated AFTER `?party=` has been resolved, and never before.**
  // That ordering is the whole difference between a gate and a decoration
  // (`ai-engineering.md`, *un gate deve poter fallire*): because the question is
  // asked about the night that was actually selected, editing `?party=` to a
  // night this person is not assigned to makes **the same person on the same
  // page** be refused. A check hoisted above the resolution would answer about
  // some other night, or about none, and would pass every time.
  //
  // `hasCapability(key, { partyId })` resolves the per-night context, whose
  // capability list is the union of what the role confers and what a live,
  // unrevoked, unexpired assignment on that night confers. It **throws** rather
  // than returning `false` when the lookup fails, and that throw must be left
  // alone: catching it here and refusing would turn "could not find out" into
  // "not permitted", which is the one shape this phase exists to prevent. The
  // observable effect of a failure on this surface is the error boundary — a
  // broken page — and that is louder than a wrong answer.
  //
  // With no night at all the second arm has no subject, and the answer is a
  // refusal: a permission is not invented in the absence of the thing it is
  // about. That branch also swallows the case where the parties read itself
  // failed — the category survives in the `review:parties_read` log above, but
  // for somebody who arrived by assignment the outcome is an ordinary refusal.
  // It is named here rather than left to be discovered.
  const mayReviewThisNight =
    (holdsOrganizerAccess && ownsOrIsMaster(ctx, event.created_by)) ||
    (selectedParty !== null &&
      (await hasCapability(CAP.PARTY_MANAGE, { partyId: selectedParty.id })));

  if (!mayReviewThisNight) {
    redirect(refusalDestination);
  }

  // ── Two limits of this gate, declared rather than discovered ────────────────
  //
  // **1. An unpublished event is not reachable by assignment.** Somebody who
  // arrives through arm 2 is typically `staff`, who does not hold
  // `organizer.access` and therefore does not hold `staff.manage` either: the
  // policies on `public.events` and `public.event_parties` show them only what
  // is published. So on an unpublished event the event read above fails
  // **before** this gate and the page bounces — measured, not deduced (plan
  // 35-10 saw an assignee read 0 rows of `event_parties` on an unpublished
  // event). For a review list, which is looked at *after* the night, the limit
  // is narrow: the event is normally published by then. It is still a limit,
  // and closing it would mean another arm on those two policies — a further
  // migration that is in none of this phase's eight requirements.
  //
  // **2. This gate protects the PAGE; the policy protects the ROWS — and the
  // two must agree.** What lets somebody admitted here actually see anything is
  // the third arm of `door_scan_events_select_admin`, added by plan 35-09,
  // which reads `party.manage` against the row's own `party_id`. Remove that
  // arm and this page renders an **empty list** to a person with every right to
  // the night — and on this surface an empty list is the *designed* state of a
  // quiet night. It would say "no problems" to somebody who is simply not
  // permitted to see the problems: a silent failure with no error path at all,
  // in a product with no error tracking to catch it downstream. The two halves
  // are named here for each other on purpose.

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
          href="/admin/events"
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
          role={navRole}
          nightStartIso={nightStart ? nightStart.toISOString() : null}
          nightEndIso={nightEnd ? nightEnd.toISOString() : null}
          readError={readError}
        />
      </div>
    </div>
  );
}
