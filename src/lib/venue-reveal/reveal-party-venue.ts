import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { render } from "@react-email/render";
import { getResend } from "@/lib/email";
import { VenueRevealEmail } from "@/emails/venue-reveal";
import { formatTime, formatEventDate } from "@/utils/formatTime";

/**
 * reveal-party-venue.ts — the ONE place that lets a night's address out by mail.
 *
 * ── Why the imports sit ABOVE this block ─────────────────────────────────────
 * The plan's acceptance criterion reads the FIRST LINE of this file looking for
 * `server-only`. Written in the usual order — docblock first, imports after —
 * the check would read prose and fail on a file that satisfies it. Same
 * discipline, and the same reason, as `src/lib/media/may-upload.ts:7-15`.
 *
 * ── Why it is a module and not an export of an `actions.ts` ──────────────────
 * A file marked `"use server"` publishes **every** export as a public endpoint.
 * `countVenueRevealRecipients` exported from there would be an oracle answering
 * *"how many people would receive this night's address?"* to anyone who calls
 * it. `may-upload.ts:28-34` is the repository's only precedent for this shape
 * and it carries the same paragraph — with one difference worth naming: that
 * one is a **predicate**, this one is an **executor with an irreversible
 * external effect**. The argument for a single definition is therefore
 * stronger here, not weaker: two copies of the deduplication would mean two
 * different numbers for the same act that cannot be undone.
 *
 * ── The two callers ──────────────────────────────────────────────────────────
 *   1. `src/app/api/cron/venue-reveal/route.ts` — the scheduled net. It keeps
 *      the `Bearer` authentication, the query of the nights, the window filter,
 *      the loop and the JSON response.
 *   2. The manual server action of plan 37-10 — it keeps the capability
 *      re-check, the actor resolution, the atomic trace writer, and the
 *      translation of this result into what the person who pressed reads.
 *
 * On a Hobby plan the manual path is **not the exception, it is the reliable
 * one** (D-37-01): the cron may arrive up to a day after the window opens and
 * nobody notices, because this project has no error tracking.
 *
 * ── WHAT THIS MODULE DOES NOT DO, and it is deliberate ───────────────────────
 * It never writes to `public.event_parties`. `no_recipients` is INFORMATION,
 * not a verdict: whoever calls decides what to record about the night. The
 * scheduled path used to raise `venue_reveal_email_sent = true` on a night it
 * had merely swept — that is defect **D9**, carried from phase 36, and moving
 * the decision to the caller is half of closing it.
 */

/** Resend accepts at most 100 messages per batch request. */
const BATCH_SIZE = 100;

/**
 * The fields this module needs from a night, and nothing more.
 *
 * A narrow input instead of the whole row on purpose: the two callers resolve
 * the night differently — the cron in one wide `select`, the server action
 * from a page that already holds it — and a parameter that demanded the full
 * `EventParty` would force one of them to fetch columns it has no use for.
 */
export interface VenueRevealParty {
  id: string;
  event_id: string;
  title: string;
  date: string;
  /** Turin wall-clock time. Rendered, never compared with `now` here. */
  time: string;
  venue_text: string | null;
  event: { title: string; slug: string };
  venue: { name: string; address: string | null } | null;
}

/**
 * Why a send did not fully happen. `"none"` also covers a partial send: read
 * the three numbers, not the category, to know whether everyone was reached.
 *
 * `"party_not_found"` is NOT produced by `revealPartyVenue` — it takes a night
 * that already exists. It belongs to the vocabulary because the caller that
 * resolves a night by id needs a word for "there is no such night", and a
 * second vocabulary invented there would be a second set of states for the UI
 * to translate. Use {@link VENUE_REVEAL_PARTY_NOT_FOUND}.
 *
 * `"recipients_unavailable"` is an ADDITION to the shape the plan declared, and
 * the reason is the defect it prevents. The queries below used to be written
 * `const { data } = await …`, dropping the error: a failing read then looked
 * exactly like a night with no ticket holders, the caller would record the
 * night as done, and **the address mail would never leave** — without an error
 * and without anyone knowing. That is D9's shape on a different axis, and
 * `venue-secrecy.md` (gate *default chiuso*) says an undeterminable state is
 * not an empty one.
 */
export type VenueRevealFailureKind =
  | "none"
  | "send_failed"
  | "no_recipients"
  | "recipients_unavailable"
  | "party_not_found";

export interface VenueRevealResult {
  /** People, not rows: `emailMap.size` after deduplication by email address. */
  recipientsTotal: number;
  /** The sum of the batches that Resend accepted. Never optimistic. */
  recipientsSent: number;
  /** The sum of the batches that did not leave. */
  recipientsFailed: number;
  failureKind: VenueRevealFailureKind;
}

/** The one result a caller may build by hand, so the vocabulary stays single. */
export const VENUE_REVEAL_PARTY_NOT_FOUND: VenueRevealResult = {
  recipientsTotal: 0,
  recipientsSent: 0,
  recipientsFailed: 0,
  failureKind: "party_not_found",
};

export interface VenueRevealOptions {
  /**
   * ISO instant. Only recipients that already existed at this moment are
   * addressed.
   *
   * This exists for **D-37-08**: *whoever buys after the reveal sees it on the
   * page, without a mail.* Plan 37-09 removes the cron's
   * `.eq("venue_reveal_email_sent", false)` so a night already revealed by hand
   * gets swept again and its missing recipients completed (D-37-21). Without
   * this bound, a ticket bought AFTER the reveal — born
   * `venue_reveal_sent = false` — would be mailed by the next run, which is a
   * NEW mail path appearing as a side effect of a filter change, and that path
   * is explicitly deferred.
   *
   * The caller passes `event_parties.venue_revealed_at`, which is the instant
   * somebody pressed. With it, "the missing ones" of D-37-20 means something
   * measurable: whoever was there when the button was pressed.
   *
   * NOTE: `tickets.created_at` and `rsvps.created_at` carry `default now()` and
   * are nullable (`supabase/schema.sql:202`, `:358`). A row with a NULL
   * `created_at` is EXCLUDED by this bound rather than included — fewer mails,
   * not more, which is the safe direction in this domain.
   */
  createdBefore?: string;
}

/** One person, and the rows that entitle them. */
type Recipient = { name: string; ticketIds: string[]; rsvpIds: string[] };

/**
 * The three queries and the deduplication — the part that must have exactly one
 * implementation, because it produces the number the confirmation shows.
 *
 * A person holding both a ticket and an RSVP receives ONE mail and counts as
 * ONE. The third query is the **event-level master ticket** (`party_id IS
 * NULL`), which a rewrite from scratch is the most likely thing to forget.
 */
async function collectRecipients(
  supabase: SupabaseClient,
  party: VenueRevealParty,
  opts?: VenueRevealOptions
): Promise<{ recipients: Map<string, Recipient>; unavailable: boolean }> {
  const bound = <T extends { lte: (c: string, v: string) => T }>(q: T): T =>
    opts?.createdBefore ? q.lte("created_at", opts.createdBefore) : q;

  // Ticket holders of THIS night who have not been reached yet.
  const ticketsQuery = bound(
    supabase
      .from("tickets")
      .select("id, user_id, created_at, profiles(email, full_name)")
      .eq("party_id", party.id)
      .eq("venue_reveal_sent", false)
  );

  // RSVP holders of this night. An RSVP counts as a ticket (D-37-10).
  const rsvpsQuery = bound(
    supabase
      .from("rsvps")
      .select("id, user_id, created_at, profiles(email, full_name)")
      .eq("party_id", party.id)
      .eq("venue_reveal_sent", false)
  );

  // Master ticket holders: bought at the event level, no night named.
  const masterQuery = bound(
    supabase
      .from("tickets")
      .select("id, user_id, created_at, profiles(email, full_name)")
      .eq("event_id", party.event_id)
      .is("party_id", null)
      .eq("venue_reveal_sent", false)
  );

  const [tickets, rsvps, masterTickets] = await Promise.all([
    ticketsQuery,
    rsvpsQuery,
    masterQuery,
  ]);

  for (const [what, res] of [
    ["tickets", tickets],
    ["rsvps", rsvps],
    ["master_tickets", masterTickets],
  ] as const) {
    if (res.error) {
      // Logged with its own category and NOT collapsed into "nobody is
      // entitled". Only the code and the message are logged — never the
      // PostgREST error's `details` field, which carries the offending row, and
      // here that row carries a member's e-mail address.
      console.error(
        `[venue_reveal.recipients_query_failed] ${what} for night ${party.id}: ` +
          `${res.error.code ?? "unknown"} — ${res.error.message}`
      );
      return { recipients: new Map(), unavailable: true };
    }
  }

  const emailMap = new Map<string, Recipient>();

  const upsert = (email: string, fullName: string | null): Recipient => {
    const existing = emailMap.get(email) || {
      name: fullName || "Member",
      ticketIds: [],
      rsvpIds: [],
    };
    emailMap.set(email, existing);
    return existing;
  };

  for (const ticket of [...(tickets.data || []), ...(masterTickets.data || [])]) {
    const profile = ticket.profiles as unknown as {
      email: string;
      full_name: string;
    } | null;
    if (!profile) continue;
    upsert(profile.email, profile.full_name).ticketIds.push(ticket.id);
  }

  for (const rsvp of rsvps.data || []) {
    const profile = rsvp.profiles as unknown as {
      email: string;
      full_name: string;
    } | null;
    if (!profile) continue;
    upsert(profile.email, profile.full_name).rsvpIds.push(rsvp.id);
  }

  return { recipients: emailMap, unavailable: false };
}

/**
 * Record that this batch's rows have been reached — and nothing else's.
 *
 * The address HAS left for these people by the time this runs, so a failure
 * here cannot be turned into "not sent". Its observable consequence is a
 * duplicate mail on the next run, which `venue-secrecy.md` (gate *idempotenza
 * del cron*) accepts as noise against the visible problem of somebody who
 * never received the address. It is therefore named with its own category
 * rather than hidden — and never allowed to escape, because a throw here would
 * abandon the batches that come after.
 *
 * The PostgREST error's `details` field is never logged: it carries the
 * offending row, and on these tables that row identifies a member.
 */
async function markBatchReached(
  supabase: SupabaseClient,
  partyId: string,
  batch: Array<[string, Recipient]>
): Promise<void> {
  const ticketIds = batch.flatMap(([, d]) => d.ticketIds);
  const rsvpIds = batch.flatMap(([, d]) => d.rsvpIds);

  for (const [table, ids] of [
    ["tickets", ticketIds],
    ["rsvps", rsvpIds],
  ] as const) {
    if (ids.length === 0) continue;
    try {
      const { error } = await supabase
        .from(table)
        .update({ venue_reveal_sent: true })
        .in("id", ids);
      if (error) {
        console.error(
          `[venue_reveal.mark_failed] ${table}, night ${partyId}, ` +
            `${ids.length} rows: ${error.code ?? "unknown"} — ${error.message}`
        );
      }
    } catch (err) {
      console.error(
        `[venue_reveal.mark_threw] ${table}, night ${partyId}, ` +
          `${ids.length} rows: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  }
}

/**
 * How many PEOPLE would receive this night's address right now.
 *
 * This is the number the confirmation of D-37-16 puts in front of whoever is
 * about to press — *"you are about to send the address to 47 people"* — and it
 * comes from the same `Map` the sender builds. Two implementations would be two
 * different numbers for the same irreversible act.
 *
 * It takes the same options as {@link revealPartyVenue} on purpose: after a
 * partial send the button reads *"send to the N still missing"* (D-37-20), and
 * a count computed without the caller's bound would promise a different N than
 * the send delivers.
 *
 * It does not send, and it does not write.
 *
 * ── `unavailable`, and why `{ total: 0 }` alone was not a usable answer ───────
 *
 * A failed read makes `total` **0**, which is indistinguishable from a night
 * nobody is entitled to — and the caller of this function is about to write an
 * **irreversible** act carrying that number as `recipients_intended`. Recording
 * *"this act meant to reach 0 people"* when the truth is *"we could not find
 * out"* puts a false statement in an append-only trace, and opens the address
 * on the page with no mail leaving.
 *
 * So the flag travels with the number. It is the same distinction
 * {@link VenueRevealFailureKind} already draws between `no_recipients` and
 * `recipients_unavailable` on the sending side; the counting side was missing
 * it, which meant the manual path could only learn about a failed read
 * **after** the point of no return. `venue-secrecy.md`, gate *default chiuso*:
 * an undeterminable state is not an empty one.
 *
 * The failure is logged with its own category by `collectRecipients`; the flag
 * is what reaches a person, because this project has no error tracking.
 */
export async function countVenueRevealRecipients(
  supabase: SupabaseClient,
  party: VenueRevealParty,
  opts?: VenueRevealOptions
): Promise<{ total: number; unavailable: boolean }> {
  const { recipients, unavailable } = await collectRecipients(
    supabase,
    party,
    opts
  );
  return { total: recipients.size, unavailable };
}

/**
 * Send this night's address to everyone entitled who has not been reached yet.
 *
 * **Irreversible.** Once a batch leaves, the address is out: there is no
 * unsend, and `venue-secrecy.md` treats every caller of this function as
 * Critical.
 *
 * ── The marking, which is the defect this rewrite exists to remove ───────────
 *
 * The scheduled path used to mark **every** recipient after the loop, from
 * `entries`, regardless of which batches had gone out
 * (`route.ts:155-171`, before this plan). One dropped batch therefore recorded
 * thirty people as reached who had received nothing — so *"20 of 50"* was not
 * representable, and a later *"send to the ones still missing"* would find
 * nobody.
 *
 * Here the marking is **per batch, inside the `try`, after the send Resend
 * accepted**, and it names only that batch's rows. A dropped batch marks
 * nothing and its recipients stay reachable.
 *
 * ⚠️ **A gate conflict, resolved and declared.** `venue-secrecy.md`, gate
 * *idempotenza del cron*, says to mark `venue_reveal_sent` **before or with**
 * the send, never only after. Marking a batch immediately after that batch left
 * IS "with", at the granularity of the batch — and it is the only form under
 * which a partial send can be told apart from a whole one. The residual case —
 * the batch left, the marking failed — produces a duplicate mail on the next
 * run, and the same gate states the priority: *a recipient who did not get the
 * address is a visible problem, a duplicate mail is noise.*
 *
 * ── Why the render is inside the `try` ───────────────────────────────────────
 *
 * It used to be outside it. `render()` throwing on one message would then throw
 * out of the whole run, taking every night after this one with it. Inside, a
 * render failure is this batch's failure and nothing else's.
 *
 * ── The fallback to singles — WR-06 of the phase review ──────────────────────
 *
 * `resend.batch.send` validates **all or nothing**: one problematic recipient —
 * an address the provider has suppressed, a refused domain, a validation
 * refusal — makes it reject the whole call. With the batch as the only unit of
 * retry, none of up to a hundred people got marked, and every retry (tomorrow's
 * cron run, or a press of *"send to the N still missing"*) rebuilt the SAME
 * batch and met the SAME refusal. There was no remedy inside the product:
 * press, fail, press, fail.
 *
 * So a rejected batch of more than one degrades to individual sends, and a
 * problematic recipient then blocks **itself** instead of the ninety-nine
 * beside it. Three constraints on the shape, and each of them is a decision
 * this phase already took:
 *
 *   1. **It degrades ONCE.** The singles are not retried. A single that fails
 *      on its own is a fact to report — it shows up in the missing count, which
 *      is the number the button reads — and not something to loop over.
 *   2. **`recipientsSent` stays the sum of what the provider accepted.** The
 *      fallback adds attempts, never optimism.
 *   3. **The marking stays outside the send's `try`**, where 37-09 put it, for
 *      the reason written below it.
 *
 * A known interaction, declared rather than discovered later: the fallback
 * multiplies the number of provider requests for that batch by up to a
 * hundred, so the provider's own rate limit is a plausible outcome **of the
 * fallback itself**. No pacing constant is hard-coded here on purpose — this
 * function runs inside a cron with a wall-clock budget, and sleeping through it
 * would trade "some people unreached" for "the run dies and every night after
 * this one is unreached". A rate-limited single is left unmarked and therefore
 * reachable, and is picked up by the next press or the next scheduled run.
 */
export async function revealPartyVenue(
  supabase: SupabaseClient,
  party: VenueRevealParty,
  opts?: VenueRevealOptions
): Promise<VenueRevealResult> {
  const { recipients, unavailable } = await collectRecipients(
    supabase,
    party,
    opts
  );

  if (unavailable) {
    return {
      recipientsTotal: 0,
      recipientsSent: 0,
      recipientsFailed: 0,
      failureKind: "recipients_unavailable",
    };
  }

  if (recipients.size === 0) {
    // INFORMATION, not a verdict. The caller decides what to record about the
    // night — and must not raise a one-way guard on the strength of it (D9).
    return {
      recipientsTotal: 0,
      recipientsSent: 0,
      recipientsFailed: 0,
      failureKind: "no_recipients",
    };
  }

  const resend = getResend();
  const fromAddress =
    process.env.RESEND_FROM_EMAIL || "Resonate <onboarding@resend.dev>";
  const venueName =
    party.venue?.name || party.venue_text || "See event page";
  const venueAddress = party.venue?.address || undefined;
  const formattedDate = formatEventDate(party.date);
  const eventUrl = `${process.env.NEXT_PUBLIC_APP_URL}/events/${party.event.slug}`;

  const entries = Array.from(recipients.entries());
  let recipientsSent = 0;
  let recipientsFailed = 0;

  /**
   * One attempt at one group of recipients: render, send, and answer whether
   * the provider accepted it. It renders, it sends, and it does **nothing
   * else** — in particular it does not mark, does not count, and does not
   * retry. Those three live in the caller, which is what lets the fallback
   * below reuse it for a group of one without duplicating the send.
   */
  const attemptGroup = async (
    group: Array<[string, Recipient]>
  ): Promise<boolean> => {
    try {
      const emails = await Promise.all(
        group.map(async ([email, data]) => ({
          from: fromAddress,
          to: [email],
          subject: `Venue Revealed: ${party.event.title}`,
          html: await render(
            VenueRevealEmail({
              memberName: data.name,
              eventTitle: party.event.title,
              partyTitle: party.title,
              eventDate: formattedDate,
              eventTime: formatTime(party.time),
              venueName,
              venueAddress,
              eventUrl,
            })
          ),
        }))
      );

      // MEASURED, and it changes what "sent" means: `resend.batch.send` does
      // NOT throw on an API rejection — it resolves to `{ data, error }`
      // (`resend@6.9.2`, `dist/index.d.mts:73-86`). The previous code only
      // caught throws and then did `totalSent += emails.length`, so a rate
      // limit or a rejected domain was counted as delivered. Both arms are
      // checked here, and neither counts unless the address really left.
      const { error } = await resend.batch.send(emails);

      if (error) {
        console.error(
          `[venue_reveal.batch_rejected] night ${party.id}, ${group.length} ` +
            `recipients: ${error.name} — ${error.message}`
        );
        return false;
      }
      return true;
    } catch (err) {
      console.error(
        `[venue_reveal.batch_threw] night ${party.id}, ${group.length} ` +
          `recipients: ${err instanceof Error ? err.message : String(err)}`
      );
      return false;
    }
  };

  /**
   * Count and mark one group the provider accepted.
   *
   * ── Marked HERE, and not one line higher, which the plan asked for ──────────
   *
   * 37-09's acceptance criterion said "inside the `try` of the send". It is
   * outside it, and the difference is not stylistic. Inside the send's `try`, a
   * database call that THROWS would be caught by the send's `catch`, make the
   * attempt read as not delivered, and report a group of fifty as failed
   * **after its fifty mails had gone out** — the address out, the result saying
   * it is not, and the next run sending again. The substance of the criterion —
   * per group, from that group's ids, never from `entries` — is what matters,
   * and it is met. The fallback below does not move it: it makes the group
   * smaller.
   */
  const recordDelivered = async (
    group: Array<[string, Recipient]>
  ): Promise<void> => {
    recipientsSent += group.length;
    await markBatchReached(supabase, party.id, group);
  };

  for (let i = 0; i < entries.length; i += BATCH_SIZE) {
    const batch = entries.slice(i, i + BATCH_SIZE);

    if (await attemptGroup(batch)) {
      await recordDelivered(batch);
      continue;
    }

    if (batch.length === 1) {
      // Already the smallest unit there is. Nothing is marked, so this person
      // stays reachable — which is what makes "send to the N still missing" a
      // fact in the data rather than a sentence on a screen.
      recipientsFailed += 1;
      continue;
    }

    // ── The fallback, and it happens exactly once ─────────────────────────────
    //
    // The provider validates the whole call, so one problematic address refuses
    // the other ninety-nine. Sent one at a time, each refusal is confined to
    // the person who caused it. There is deliberately NO retry around these:
    // a single that fails here has been tried once as part of a batch and once
    // on its own, and a third attempt inside the same run would only turn a
    // reportable fact into a longer wait.
    for (const one of batch) {
      const single = [one];
      if (await attemptGroup(single)) {
        await recordDelivered(single);
      } else {
        recipientsFailed += 1;
      }
    }
  }

  return {
    recipientsTotal: recipients.size,
    recipientsSent,
    recipientsFailed,
    failureKind: recipientsSent === 0 ? "send_failed" : "none",
  };
}
