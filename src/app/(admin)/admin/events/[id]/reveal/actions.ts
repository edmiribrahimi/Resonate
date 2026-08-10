"use server";

import { CAP } from "@/lib/capabilities/keys";
import { getAccessContext } from "@/lib/capabilities/server";
import { getServiceClient } from "@/lib/supabase/service";
import {
  countVenueRevealRecipients,
  type VenueRevealFailureKind,
  type VenueRevealParty,
} from "@/lib/venue-reveal/reveal-party-venue";
import type { VenueRevealAct } from "@/types/database";

/**
 * The manual venue reveal — VENUE-02. **This module publishes addresses.**
 *
 * ── Why the gate is re-asked here, and it is not belt-and-braces ─────────────
 *
 * A server action is a **public endpoint with a convenient signature**. Every
 * export below is invocable directly by anybody who can reach the deployment,
 * with a forged body, and being imported from a page that `organizer.access`
 * opened protects none of it (`nextjs-architecture.md`, gate *server action
 * autorizzata*).
 *
 * And the page's key is **not this act's key**. `/admin/events/[id]/edit` is
 * opened by `organizer.access`; letting an address out asks the thirteenth key,
 * `venue.reveal`, which is `requires_approved = true` on both of its grants
 * (`20260810160000_manual_venue_reveal.sql:105-123`). That difference is D-37-14
 * and it is the whole reason the key exists: `staff.manage` ignores approval
 * **on purpose**, because an organizer still pending must not be turned away in
 * front of a queue — a reason that does not exist in front of an address that
 * does not come back. `capability-routes.ts` binds this key as `scope: "table"`
 * and names this file as the real guard; the two agree in writing.
 *
 * ── Why the SERVICE client, for the reads as well as the write ───────────────
 *
 * `event_parties_update_own` (`20260807020000_wrap_auth_uid.sql:145-155`)
 * demands `staff.manage` **and** (master **or** the event's owner). D-37-13
 * wants precisely the approved organizer who did **not** create the night —
 * that person may be unreachable on exactly the Friday the button exists for —
 * so a write from the presser's own session cannot work. The early symptom of
 * getting this wrong is *"it works in development"*, where whoever tests is
 * almost always the owner. `public.record_venue_reveal_act` is `SECURITY
 * DEFINER` with `EXECUTE` granted to `service_role` alone, and it is the only
 * compatible path.
 *
 * The **reads** use the same client, deliberately. The trace has a `SELECT`
 * policy on `staff.manage` that a session would pass, but the recipient count
 * crosses `tickets` and `rsvps`, and one client for the whole module keeps one
 * mental model and one reason for a read to fail. `access-gating.md` requires a
 * new service-client use to be justified in writing and to prove no untrusted
 * input reaches it: `partyId` is shape-checked against `UUID_PATTERN` before any
 * query, and `eventId` never reaches the database at all — it is compared in
 * JavaScript against the night's own `event_id`.
 *
 * ── Refusals are RETURNED, never thrown as a sentence ────────────────────────
 *
 * Next **redacts** the message of an error thrown out of a Server Action in a
 * production build (`src/lib/capabilities/server.ts:59-63`), so a caller that
 * branches on a message works in `next dev` and stops working where it counts.
 * Every refusal below is a **value** with its own name, and the surface branches
 * on the value.
 *
 * ── What is logged, and the one field that is never touched ──────────────────
 *
 * `error.code` and `error.message`. Never the error object, and never its third
 * field — the one PostgREST fills with the entire rejected row. The rows this
 * module touches are rows of `public.event_parties`, and that row carries
 * `venue_text`, `venue_id` and `venue_secret_hint`: a refusal that handed back
 * the thing being protected is the self-inflicted leak
 * (`.planning/todos/pending/postgrest-details-leaks-the-row.md`). It is the
 * reason the writer refuses with typed `RETURN`s instead of `CHECK`s — with the
 * guards written that way **there is no error object to log by accident**.
 *
 * Its name is deliberately not spelled anywhere in this file, for the reason
 * `[id]/assignments/actions.ts:58-62` gives about its own forbidden literal: a
 * grep whose only match is the sentence forbidding the thing is a grep that gets
 * ignored the third time it goes red.
 *
 * ── No time limit, and that is a decision (D-37-11) ──────────────────────────
 *
 * Nothing here compares the clock with the night's start. The brake is the
 * confirmation, not an hour: a technical ceiling would be worked around by
 * moving the automatic window instead — the same act with one more step and
 * **no trace at all**.
 */

/**
 * The gate, asked FIRST in every export and deliberately **not exported**: every
 * export of a `"use server"` module is a public endpoint, and a gate is not one.
 *
 * Shape copied from `admin/formats/actions.ts:89-106`, including the two
 * separate throw categories. An unresolvable identity is **not** a refusal on
 * the merits — it means the migration that put `user_id` in the payload is not
 * applied — and collapsing the two into one category is the pattern
 * `meta-gates.md` forbids.
 *
 * It returns the context it resolved. `cache()` does **not** memoise inside a
 * Server Action body (`capabilities/server.ts:104-116`, measured in phase 33),
 * so a second call is a second full round trip and no compiler sees it.
 *
 * @throws `forbidden.venue_reveal_required` — the answer is no.
 * @throws `capabilities.identity_missing` — the payload carried no `user_id`.
 */
async function assertVenueReveal(): Promise<{ userId: string }> {
  const { capabilities, userId } = await getAccessContext();

  if (!capabilities.has(CAP.VENUE_REVEAL)) {
    throw new Error("forbidden.venue_reveal_required");
  }

  if (!userId) {
    console.error(
      "[capabilities.identity_missing] a caller holds venue.reveal but " +
        "my_access_context() returned no user_id. This is NOT a refusal on " +
        "the merits — the migration adding user_id has not been applied."
    );
    throw new Error("capabilities.identity_missing");
  }

  return { userId };
}

/** The same shape as `[id]/assignments/actions.ts:85-86`. */
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** The one client this module uses, named so the helpers can be typed. */
type RevealClient = ReturnType<typeof getServiceClient>;

/**
 * Every way an act can be refused, one value each.
 *
 * There is no shared "something went wrong": the recorded precedent in this
 * repository is the newsletter form collapsing three causes into one sentence
 * (`.planning/codebase/CONCERNS.md`), and this product has **no error tracking**
 * (`meta-gates.md`), so this returned value is the only place a refusal exists
 * for a human.
 *
 * Five of these come back from `public.record_venue_reveal_act` as its own
 * `jsonb` contract; the rest are decided here, before the database is asked.
 */
export type VenueRevealRefusal =
  /** `partyId` is not a uuid. Nothing was asked of the database. */
  | "invalid_party_id"
  /**
   * The night does not belong to the event this call claims — **or there is no
   * such night**, and the two get the SAME answer on purpose.
   *
   * Distinguishing them would turn this action into an oracle that tells a
   * caller which uuids name a real party, and there is **no rate limiting
   * anywhere** in this repository (`access-gating.md`). The precedent is
   * `[id]/assignments/actions.ts:244-250`.
   *
   * It is not a formality either: the gate proves the caller may reveal, it
   * proves nothing about *this* night, which arrives on the same untrusted body.
   * Without this check the `eventId` in the signature would be decoration and
   * the service client — which bypasses every row-level policy — would publish
   * the address of a night belonging to somebody else's event.
   */
  | "party_not_in_event"
  /**
   * The writer looked and the night was gone.
   *
   * Distinct from the value above, and not redundant with it: this one comes
   * back from `record_venue_reveal_act` under its own row lock, so it means the
   * night existed when this module read it and had gone by the time the act was
   * attempted. That is a race between two people, and it deserves to be
   * readable as one.
   */
  | "party_not_found"
  /**
   * The night is not secret, so there is no address to release.
   *
   * Not a no-op to swallow: it means the surface and the database disagree about
   * what this night is, and somebody is looking at a button that should not have
   * been drawn.
   */
  | "not_secret"
  /**
   * D-37-19. The second press gets an **answer**, not silence — and the surface
   * reads *when* and *by whom* from {@link getVenueRevealState}, which is the
   * same place the disabled button gets its sentence.
   */
  | "already_revealed"
  /** Completing or re-hiding a night that was never revealed. Nothing to complete, nothing to undo. */
  | "not_revealed"
  /**
   * D-37-22, and the verdict is the **database's**, not this module's.
   *
   * `record_venue_reveal_act` reads the actor's role from `public.profiles`
   * inside itself. This file does not re-decide it: two verdicts on the same
   * question are two places for them to disagree, and the one that would win is
   * whichever ran last.
   */
  | "re_hide_requires_master"
  /**
   * Who is entitled could not be determined — **and this is not "nobody is
   * entitled"**.
   *
   * Collapsing the two is the defect this phase already fixed one layer down
   * (37-09): a failed read looked exactly like a night with no ticket holders,
   * the night would be recorded as done and the address mail would never leave,
   * with no error and nobody knowing. Here it refuses **before** the act, so
   * nothing irreversible happens on a number nobody could measure.
   * `venue-secrecy.md`, gate *default chiuso*: the fallback is the secret.
   */
  | "recipients_unavailable"
  /**
   * The act would have been recorded without a name.
   *
   * `venue_reveal_acts.actor_name` is `NOT NULL` with a non-blank `CHECK`, and
   * the writer refuses a blank one by name. Refused here instead so the person
   * reads a cause they can act on rather than a generic write failure — an act
   * attributed to nobody is not a degraded act, it is not an act (D-37-18).
   */
  | "actor_name_missing"
  /** Any other database failure. Nothing was published. */
  | "write_failed";

/**
 * The outcome of an act — three numbers and a category, never a boolean.
 *
 * ── Why `ok: true` still carries a `failureKind` ─────────────────────────────
 *
 * Because from the instant `venue_revealed_at` exists **the address is out**:
 * the page opens for whoever is entitled, whether or not a single mail left. So
 * an act whose send failed cannot answer `ok: false` — that would say nothing
 * happened while the address is public. D-37-12 says it plainly: the night stays
 * marked as revealed and the button stays reachable for the missing ones.
 *
 * The numbers alone are not enough to tell the person what happened. `0/0/0`
 * with `no_recipients` means *nobody was entitled*; `0/0/0` with
 * `recipients_unavailable` means *we could not find out*, and those are the two
 * sentences that must never become one.
 *
 * `recipientsSent` is **the sum of the batches Resend accepted** — never
 * optimistic, and never re-derived at this layer. There is one deduplication in
 * this product and it is the one that sends.
 */
export type VenueRevealActionResult =
  | {
      ok: true;
      recipientsTotal: number;
      recipientsSent: number;
      recipientsFailed: number;
      failureKind: VenueRevealFailureKind;
    }
  | { ok: false; reason: VenueRevealRefusal };

/** The most recent act on a night, as the work surface renders it (D-37-17/18). */
export interface VenueRevealLastAct {
  /** The person's full name. Never copied into anything under `.planning/`. */
  actorName: string;
  /** The server clock, ISO. */
  at: string;
  act: VenueRevealAct;
}

/**
 * What the three-state button reads (D-37-19), and what the confirmation counts
 * (D-37-16).
 */
export type VenueRevealStateResult =
  | {
      ok: true;
      /** `null` while the night is still secret in the page's sense. */
      revealedAt: string | null;
      /**
       * How many people the reveal **meant** to reach — the M of *"N of M"*.
       *
       * Before the reveal this is the same as `recipientsPending`, because
       * nobody has been reached. After it, it is read from the trace's
       * `recipients_intended`, so it is frozen at the moment somebody pressed
       * and does not drift as tickets keep selling.
       */
      recipientsTotal: number;
      /** How many would be mailed if the button were pressed right now. */
      recipientsPending: number;
      lastAct: VenueRevealLastAct | null;
    }
  | { ok: false; reason: VenueRevealRefusal };

/** What a night looks like to this module, plus the two things only it needs. */
interface ResolvedNight {
  party: VenueRevealParty;
  revealedAt: string | null;
  /** For `revalidatePath` on the public page, which now depends on the column above. */
  slug: string;
}

/**
 * Resolve the night, and prove it belongs to the event the caller claims.
 *
 * Shape first — the uuid check costs no round trip — then the one read. The
 * `eventId` is compared here, in JavaScript, and is **never sent to the
 * database**: the query is keyed on `partyId` alone.
 */
async function resolveNight(
  client: RevealClient,
  eventId: string,
  partyId: string
): Promise<
  { ok: true; night: ResolvedNight } | { ok: false; reason: VenueRevealRefusal }
> {
  const { data, error } = await client
    .from("event_parties")
    .select(
      "id, event_id, title, date, time, venue_text, venue_revealed_at, " +
        "events(title, slug), venues(name, address)"
    )
    .eq("id", partyId)
    .maybeSingle();

  if (error) {
    // Its own category in the log, because a night that could not be READ and a
    // writer that refused are two different faults — even though a person can
    // do the same one thing about either, which is why they share one returned
    // value instead of multiplying the vocabulary the surface must translate.
    console.error(
      `[venue_reveal.night_read_failed] night ${partyId}: ` +
        `${error.code ?? "unknown"} — ${error.message}`
    );
    return { ok: false, reason: "write_failed" };
  }

  // The cast comes BEFORE the comparison and not after, and it is not a style
  // choice: none of the four Supabase clients in this repository is
  // parameterised with a generated schema, so `data` is inferred from the select
  // string and the embeds make that inference useless. The shape below is
  // documentation, and `npm run build` cannot tell you a column name is right.
  const row = data as unknown as {
    id: string;
    event_id: string;
    title: string;
    date: string;
    time: string;
    venue_text: string | null;
    venue_revealed_at: string | null;
    events: { title: string; slug: string };
    venues: { name: string; address: string | null } | null;
  } | null;

  if (!row || row.event_id !== eventId) {
    return { ok: false, reason: "party_not_in_event" };
  }

  return {
    ok: true,
    night: {
      party: {
        id: row.id,
        event_id: row.event_id,
        title: row.title,
        date: row.date,
        time: row.time,
        venue_text: row.venue_text,
        event: row.events,
        venue: row.venues,
      },
      revealedAt: row.venue_revealed_at,
      slug: row.events.slug,
    },
  };
}

/**
 * Read the whole state a surface needs, in one call.
 *
 * D-37-17 and D-37-19 serve each other: the trace lives on the night, and the
 * night is also where a second press finds its answer. A button that vanished
 * would leave the person looking for it; a button that is spent and says *when*
 * and *by whom* is the refusal made visible.
 *
 * `recipientsPending` comes from `countVenueRevealRecipients` — the same `Map`
 * that sends — and never from a count written here. Two implementations of the
 * deduplication would put two different numbers in front of the same
 * irreversible act.
 *
 * It is a READ, so it does not `revalidatePath`. A read that invalidates a cache
 * is a write with a misleading name.
 */
export async function getVenueRevealState(
  eventId: string,
  partyId: string
): Promise<VenueRevealStateResult> {
  await assertVenueReveal();

  if (!UUID_PATTERN.test(partyId)) {
    return { ok: false, reason: "invalid_party_id" };
  }

  const client = getServiceClient();

  const resolved = await resolveNight(client, eventId, partyId);
  if (!resolved.ok) return resolved;
  const { party, revealedAt } = resolved.night;

  // Bounded by the reveal instant once there is one: after a reveal, "who is
  // missing" means whoever was already entitled when the button was pressed
  // (D-37-08). Unbounded before it, which is the ordinary case.
  const { total: recipientsPending, unavailable } =
    await countVenueRevealRecipients(
      client,
      party,
      revealedAt ? { createdBefore: revealedAt } : undefined
    );

  if (unavailable) {
    return { ok: false, reason: "recipients_unavailable" };
  }

  // Two narrow reads on the same index rather than one wide one with a limit
  // somebody would have to guess. The first is what the surface prints; the
  // second is the M of "N of M", taken from the record of the act instead of
  // recomputed — a recomputed M drifts every time a ticket sells.
  const [lastActRead, lastRevealRead] = await Promise.all([
    client
      .from("venue_reveal_acts")
      .select("act, actor_name, at")
      .eq("party_id", partyId)
      .order("at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    client
      .from("venue_reveal_acts")
      .select("recipients_intended")
      .eq("party_id", partyId)
      .eq("act", "revealed")
      .order("at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  for (const read of [lastActRead, lastRevealRead]) {
    if (read.error) {
      // Refused rather than answered with an empty trace. A night that says
      // "never revealed" because its trace could not be read is the surface
      // inviting somebody to press a button that has already been pressed.
      console.error(
        `[venue_reveal.trace_read_failed] night ${partyId}: ` +
          `${read.error.code ?? "unknown"} — ${read.error.message}`
      );
      return { ok: false, reason: "write_failed" };
    }
  }

  const lastRow = lastActRead.data as unknown as {
    act: VenueRevealAct;
    actor_name: string;
    at: string;
  } | null;

  const revealRow = lastRevealRead.data as unknown as {
    recipients_intended: number;
  } | null;

  return {
    ok: true,
    revealedAt,
    recipientsTotal:
      revealedAt === null
        ? recipientsPending
        : revealRow?.recipients_intended ?? recipientsPending,
    recipientsPending,
    lastAct: lastRow
      ? { actorName: lastRow.actor_name, at: lastRow.at, act: lastRow.act }
      : null,
  };
}
