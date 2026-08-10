import { NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase/service";
import { partyStartInstant, venueRevealHours } from "@/utils/datetime";
import {
  revealPartyVenue,
  type VenueRevealFailureKind,
  type VenueRevealParty,
} from "@/lib/venue-reveal/reveal-party-venue";

/**
 * The scheduled venue reveal — which is now the NET UNDER the manual path, not
 * the way the address normally leaves.
 *
 * `vercel.json` runs this at `0 6 * * *` UTC on Vercel's Hobby plan, where the
 * timing precision is ±59 minutes: the reveal can land up to a day after the
 * window opened and nobody would know, because this project has no error
 * tracking. That is why D-37-01 makes the manual button the reliable path and
 * this the backstop.
 *
 * Everything about WHO receives the address and HOW it is sent lives in
 * `@/lib/venue-reveal/reveal-party-venue` and is shared with the manual server
 * action. What stays here is what only a cron has: the `Bearer` authentication,
 * the query of the nights, the window filter, the loop, and the response.
 */

/** How many failing nights the JSON response names before it stops. */
const MAX_REPORTED_FAILURES = 20;

export async function GET(request: Request) {
  // Verify cron secret
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getServiceClient();
  const now = new Date();

  // Every secret-venue night, INCLUDING the ones already marked as mailed.
  //
  // ── D-37-21: the filter that used to be here, and why removing it is safe ───
  //
  // This query carried an equality filter on `venue_reveal_email_sent` being
  // false, so a night already revealed was skipped for ever. If the manual left
  // twelve people behind — a dropped batch — those twelve stayed without the
  // address and nobody found out. The cron now COMPLETES what is missing.
  //
  // **The idempotence was never in that filter.** It sits three levels below:
  //   1. `.eq("venue_reveal_sent", false)` on tickets, rsvps and the master
  //      ticket, inside the shared module — the real per-recipient filter.
  //      Whoever already received is not even in the map.
  //   2. an empty map sends nothing and returns `no_recipients`.
  //   3. the upper bound of the window below, which drops nights that started
  //      more than 24 hours ago — so the cron does not re-sweep history.
  // The removed filter was an OPTIMISATION, not a guarantee.
  //
  // `venue_revealed_at` is selected because it bounds the completion arm: see
  // `createdBefore` below.
  const { data: parties, error: partiesError } = await supabase
    .from("event_parties")
    .select(
      "id, title, date, time, venue_secret, venue_reveal_hours, venue_reveal_email_sent, venue_revealed_at, venue_id, venue_text, event_id, events(title, slug), venues(name, address)"
    )
    .eq("venue_secret", true);

  if (partiesError) {
    // Named, and answered with a 500 rather than a cheerful `{ sent: 0 }`. A
    // failed read is not an empty night list, and a cron whose only output is a
    // status code has nowhere else to say so (`meta-gates.md`, zero silent
    // failures).
    console.error(
      `[venue_reveal.parties_query_failed] ${partiesError.code ?? "unknown"} — ${partiesError.message}`
    );
    return NextResponse.json(
      { error: "Could not read the nights", sent: 0 },
      { status: 500 }
    );
  }

  if (!parties || parties.length === 0) {
    return NextResponse.json({ sent: 0, failed: 0, parties: 0 });
  }

  // Filter to parties where the reveal window has opened
  const revealParties = parties.filter((p) => {
    // Turin wall-clock time, not the runtime's zone: a two-hour drift here can
    // push the reveal past this daily run and into the next one — i.e. after
    // the doors have opened.
    const partyDateTime = partyStartInstant(p.date, p.time);
    // Only process future or very recent events (not old ones)
    if (partyDateTime < new Date(now.getTime() - 24 * 60 * 60 * 1000)) return false;
    // The window has ONE definition, in `src/utils/datetime.ts`. A fallback of
    // twenty-four hours used to be re-applied here at the call site, which is
    // how the default silently disagreed with the twenty-five plan 37-04
    // declared — and a window that does not contain its own cron interval loses
    // the run that would have caught it.
    const hours = venueRevealHours(p.venue_reveal_hours);
    const revealAt = new Date(partyDateTime.getTime() - hours * 60 * 60 * 1000);
    return now >= revealAt;
  });

  let totalSent = 0;
  let totalFailed = 0;
  const failures: Array<{
    partyId: string;
    failureKind: VenueRevealFailureKind;
    recipientsFailed: number;
  }> = [];

  for (const party of revealParties) {
    const event = party.events as unknown as { title: string; slug: string };
    const venue = party.venues as unknown as {
      name: string;
      address: string | null;
    } | null;

    const input: VenueRevealParty = {
      id: party.id,
      event_id: party.event_id,
      title: party.title,
      date: party.date,
      time: party.time,
      venue_text: party.venue_text,
      event,
      venue,
    };

    // ── The completion arm, bounded — D-37-08 ─────────────────────────────────
    //
    // `venue_revealed_at` is the instant somebody pressed the button. When it
    // is set, this run may only reach people who already existed then: whoever
    // bought a ticket AFTER the reveal sees the address on the page and gets no
    // mail, which is what D-37-08 says. Without the bound, removing the filter
    // above would have created a new mail path — mail on purchase — as a side
    // effect, and that path is explicitly deferred.
    //
    // When it is NULL — the ordinary scheduled run, nobody pressed anything —
    // there is no bound, which is today's behaviour and what VENUE-01 asks to
    // keep.
    const revealedAt = party.venue_revealed_at as string | null;
    const result = await revealPartyVenue(
      supabase,
      input,
      revealedAt ? { createdBefore: revealedAt } : undefined
    );

    totalSent += result.recipientsSent;
    totalFailed += result.recipientsFailed;

    if (
      result.failureKind !== "none" &&
      failures.length < MAX_REPORTED_FAILURES
    ) {
      failures.push({
        partyId: party.id,
        failureKind: result.failureKind,
        recipientsFailed: result.recipientsFailed,
      });
    }

    // ── The night's flag, now CONDITIONAL — this is what closes D9 ────────────
    //
    // `venue_reveal_email_sent` is a one-way switch. It used to be raised at the
    // end of every iteration, and also on the zero-recipient branch — so a night
    // left as an unpublished draft inside its own reveal window came out of this
    // cron already carrying the guard raised. Published afterwards and sold, its
    // address mail would NEVER leave, with no error and with nobody knowing.
    // That is defect **D9**, recorded by phase 36 and assigned here.
    //
    // D-37-21 (the filter removed above) and this condition close it together:
    // the night stays in the swept set, and the flag only goes up once at least
    // one mail has actually left. The residue — a night that started more than
    // 24 hours ago — is out of the window anyway, where it is too late for a
    // mail to help.
    //
    // A partial send DOES raise it: the address is out and does not come back
    // (D-37-12). The people still missing stay reachable through their own
    // `venue_reveal_sent`, which the shared module marks per batch.
    if (result.recipientsSent > 0 && !party.venue_reveal_email_sent) {
      const { error } = await supabase
        .from("event_parties")
        .update({ venue_reveal_email_sent: true })
        .eq("id", party.id);
      if (error) {
        console.error(
          `[venue_reveal.mark_party_failed] night ${party.id}: ` +
            `${error.code ?? "unknown"} — ${error.message}`
        );
      }
    }
  }

  // The response carries the failures, not only `{ sent }`. An optimistic count
  // that summed `emails.length` could not tell delivered from attempted, and
  // without error tracking this response is the only place that number can
  // exist at all.
  return NextResponse.json({
    sent: totalSent,
    failed: totalFailed,
    parties: revealParties.length,
    ...(failures.length > 0 ? { failures } : {}),
  });
}
