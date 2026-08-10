"use server";

import { revalidatePath } from "next/cache";
import { CAP } from "@/lib/capabilities/keys";
import { getAccessContext } from "@/lib/capabilities/server";
import { getServiceClient } from "@/lib/supabase/service";
import {
  countVenueRevealRecipients,
  revealPartyVenue,
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
   * The night has **no venue linked**, so there is no address to release —
   * CR-01, and it is refused HERE, before anything irreversible.
   *
   * ── Why this is a server refusal and not only a disabled button ─────────────
   *
   * The rule used to live in the panel alone (`VenueRevealPanel.tsx:200-201`),
   * and a server action is a public endpoint with a convenient signature: the
   * guard sat on the side of the boundary that does not hold one
   * (`CLAUDE.md` principle 2, `access-gating.md` gate *RLS-e'-il-confine*). The
   * panel's guard stays — it is UX, and drawing a live button on a night with
   * nothing to publish invites the press — but it is no longer the only one.
   *
   * ── What it prevents, which is not "an act that publishes nothing" ──────────
   *
   * It is worse than a wasted act. A secret night with `venue_id` null and a
   * placeholder in `venue_text` can be revealed today: the act is written, the
   * mails leave naming the placeholder, `venue_revealed_at` is set. **Then**
   * somebody completes the night's record and links the real venue — an
   * ordinary catalogue edit — and from that instant the address is public to
   * every entitled reader, with the trace naming the act performed on the
   * placeholder. The other half of that path is closed in
   * `(admin)/admin/events/actions.ts`, where `venue_id` is now among the fields
   * a revealed night cannot change.
   *
   * `venue_text` deliberately does NOT satisfy this: free text is not an
   * address, `public.venue_for_parties` joins `public.venues` on `venue_id`, and
   * a night with only free text has nothing for the public road to return.
   */
  | "venue_not_set"
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

/** One act on a night, as the work surface renders it (D-37-17/18). */
export interface VenueRevealLastAct {
  /** The person's full name. Never copied into anything under `.planning/`. */
  actorName: string;
  /** The server clock, ISO. */
  at: string;
  act: VenueRevealAct;
}

/**
 * How many acts of the trace travel to the surface.
 *
 * NOT exported: every export of a `"use server"` module must be an async
 * function, and a constant here would be a build error rather than a stylistic
 * choice.
 *
 * The bound exists because this is a read on a work surface, not because the
 * trace is expected to be long: three acts is a busy night. Fifty leaves the
 * first `revealed` visible under any realistic sequence of completions and
 * re-hides — which is the property D-37-22 rests on, since a night that stopped
 * saying *revealed on … by …* would be a page contradicting mails that left.
 */
const TRACE_LIMIT = 50;

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
      /**
       * The most recent act, which is what the spent button's own sentence
       * reads — *revealed on … by …* (D-37-19). Always `acts[0]`.
       */
      lastAct: VenueRevealLastAct | null;
      /**
       * The trace, most recent first, bounded by {@link TRACE_LIMIT}.
       *
       * ── Why the whole list and not only the last act ─────────────────────
       *
       * D-37-22 is honest only because the trace is append-only and **survives
       * a re-hide**: the night keeps saying *revealed on … by …* after going
       * secret again. With the last act alone, a re-hidden night would show
       * *taken back to secret by …* and nothing else — the page would have
       * stopped saying the thing that the mails already out are saying, which
       * is exactly the contradiction the decision was granted on condition of
       * avoiding.
       *
       * It costs nothing extra: it is the same read, with its `limit` widened.
       */
      acts: VenueRevealLastAct[];
    }
  | { ok: false; reason: VenueRevealRefusal };

/** What a night looks like to this module, plus the two things only it needs. */
interface ResolvedNight {
  party: VenueRevealParty;
  revealedAt: string | null;
  /**
   * The linked venue, or `null` — read as its own column and NOT deduced from
   * the `venues(...)` embed being absent.
   *
   * The two happen to agree under the service client, and that is exactly why
   * deducing would be the fragile version: the day this module reads with a
   * session instead, an embed a reader is not entitled to comes back **empty
   * rather than raising**, and the deduction would silently answer "no venue" on
   * a night that has one. The column answers the question that is being asked.
   */
  venueId: string | null;
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
      "id, event_id, title, date, time, venue_text, venue_id, " +
        "venue_revealed_at, events(title, slug), venues(name, address)"
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
    venue_id: string | null;
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
      venueId: row.venue_id,
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
  const [traceRead, lastRevealRead] = await Promise.all([
    client
      .from("venue_reveal_acts")
      .select("act, actor_name, at")
      .eq("party_id", partyId)
      .order("at", { ascending: false })
      .limit(TRACE_LIMIT),
    client
      .from("venue_reveal_acts")
      .select("recipients_intended")
      .eq("party_id", partyId)
      .eq("act", "revealed")
      .order("at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  for (const read of [traceRead, lastRevealRead]) {
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

  const traceRows = (traceRead.data ?? []) as unknown as Array<{
    act: VenueRevealAct;
    actor_name: string;
    at: string;
  }>;

  const revealRow = lastRevealRead.data as unknown as {
    recipients_intended: number;
  } | null;

  const acts: VenueRevealLastAct[] = traceRows.map((row) => ({
    actorName: row.actor_name,
    at: row.at,
    act: row.act,
  }));

  return {
    ok: true,
    revealedAt,
    recipientsTotal:
      revealedAt === null
        ? recipientsPending
        : revealRow?.recipients_intended ?? recipientsPending,
    recipientsPending,
    // Derived from the list rather than read a second time: two reads of "the
    // most recent act" are two places for them to disagree, and the ordering is
    // already the database's.
    lastAct: acts.length > 0 ? acts[0] : null,
    acts,
  };
}

/* ────────────────────────────────────────────────────────────────────────────
 * The three acts — one writer, one send, and every refusal a value.
 * ──────────────────────────────────────────────────────────────────────────── */

/** PostgreSQL `invalid_parameter_value`. The writer's two argumental refusals. */
const INVALID_PARAMETER_VALUE = "22023";

/** The five refusal codes `public.record_venue_reveal_act` returns in its `jsonb`. */
const WRITER_REFUSALS = [
  "party_not_found",
  "not_secret",
  "already_revealed",
  "not_revealed",
  "re_hide_requires_master",
] as const;

/**
 * The category of a failed `rpc`, from its **CODE alone**.
 *
 * Never from a parsed message: Next redacts a Server Action's message in a
 * production build, and a category read out of a sentence works in `next dev`
 * and stops working where it matters. The field that carries the failing row is
 * not touched — see the file comment.
 *
 * Note what is NOT in this switch, and it is the point of the whole design:
 * `already_revealed`, `not_secret`, `not_revealed`, `re_hide_requires_master`
 * and `party_not_found` never arrive here. The writer returns them as **values**
 * precisely so that a refusal about a night is not a PostgREST error object
 * about a row of `public.event_parties` — a row that carries the address.
 */
function classifyWriteError(error: {
  code?: string | null;
}): VenueRevealRefusal {
  switch (error.code) {
    // `venue_reveal.actor_required`. Practically unreachable: the gate refuses a
    // caller with no identity, and `resolveActorName` refuses a blank name
    // before the call. Kept for exactly that reason — the day it comes back, one
    // of those two guards has stopped working, and this value says so instead of
    // hiding inside `write_failed`.
    //
    // The same code's other producer, `venue_reveal.unknown_act`, cannot happen
    // here: `p_act` is a literal at all three call sites and never a value from
    // a request.
    case INVALID_PARAMETER_VALUE:
      return "actor_name_missing";
    default:
      return "write_failed";
  }
}

/** Narrowing by equality against the closed set — an unknown string is never forwarded as a typed value. */
function asWriterRefusal(
  value: unknown,
  partyId: string
): VenueRevealRefusal {
  if (
    typeof value === "string" &&
    (WRITER_REFUSALS as readonly string[]).includes(value)
  ) {
    return value as VenueRevealRefusal;
  }

  // The writer answered a refusal this module does not know. That means its
  // contract moved underneath its caller, and saying so is the only way anybody
  // finds out: `npm run build` cannot compare a TypeScript union with a
  // PL/pgSQL `RETURN`.
  console.error(
    `[venue_reveal.unknown_refusal] night ${partyId}: the writer returned a ` +
      `reason outside the five this module knows.`
  );
  return "write_failed";
}

/**
 * The actor's full name, resolved **server-side** from the id the gate produced.
 *
 * Never from the request body: otherwise whoever calls chooses the name the
 * trace will carry, and the trace is the entire point of the act (D-37-18).
 *
 * A missing name is refused rather than filled with a placeholder. An act
 * attributed to «Member» is not attributed, and this record outlives the night
 * it names.
 *
 * The name itself is never logged, and never leaves the database except onto a
 * staff surface: `.planning/` is tracked and public, and artefacts name roles.
 */
async function resolveActorName(
  client: RevealClient,
  userId: string
): Promise<
  { ok: true; name: string } | { ok: false; reason: VenueRevealRefusal }
> {
  const { data, error } = await client
    .from("profiles")
    .select("full_name")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    // A read that could not run is NOT a missing name, and the two get
    // different categories for the same reason everything else here does.
    console.error(
      `[venue_reveal.actor_name_read_failed] ${error.code ?? "unknown"} — ` +
        `${error.message}`
    );
    return { ok: false, reason: "write_failed" };
  }

  const row = data as unknown as { full_name: string | null } | null;
  const name = row?.full_name?.trim();

  if (!name) {
    console.error(
      "[venue_reveal.actor_name_missing] a caller holds venue.reveal and " +
        "their profile carries no full name. The act was NOT recorded: an " +
        "unattributed reveal is not a degraded reveal."
    );
    return { ok: false, reason: "actor_name_missing" };
  }

  return { ok: true, name };
}

/**
 * The one call to the one writer. All three acts pass through here.
 *
 * `p_actor_id` is resolved server-side and passed as an argument: under the
 * service client `auth.uid()` is null, so the database cannot deduce the author
 * and must never be told it by the request body.
 *
 * Two kinds of failure, and they are not the same thing. A `jsonb` with
 * `ok: false` is an **expected refusal** and carries its own reason; a non-null
 * `error` is a **fault**, and its category is read from `error.code`.
 */
async function recordAct(
  client: RevealClient,
  partyId: string,
  act: VenueRevealAct,
  actorId: string,
  actorName: string,
  recipientsIntended: number
): Promise<
  | { ok: true; revealedAt: string | null }
  | { ok: false; reason: VenueRevealRefusal }
> {
  const { data, error } = await client.rpc("record_venue_reveal_act", {
    p_party_id: partyId,
    p_act: act,
    p_actor_id: actorId,
    p_actor_name: actorName,
    p_recipients_intended: recipientsIntended,
  });

  if (error) {
    console.error(
      `[venue_reveal.act_failed] ${act} on night ${partyId}: ` +
        `${error.code ?? "unknown"} — ${error.message}`
    );
    return { ok: false, reason: classifyWriteError(error) };
  }

  const payload = data as {
    ok?: unknown;
    reason?: unknown;
    revealed_at?: unknown;
  } | null;

  if (payload === null || typeof payload !== "object") {
    console.error(
      `[venue_reveal.act_malformed] ${act} on night ${partyId}: the writer ` +
        `answered something that is not its documented object.`
    );
    return { ok: false, reason: "write_failed" };
  }

  if (payload.ok !== true) {
    return { ok: false, reason: asWriterRefusal(payload.reason, partyId) };
  }

  return {
    ok: true,
    revealedAt:
      typeof payload.revealed_at === "string" ? payload.revealed_at : null,
  };
}

/**
 * Every surface that depends on a column this module just moved.
 *
 * The public event page reads `venue_revealed_at` now, so without the
 * invalidation it keeps serving the previous value for as long as Next decides —
 * which on this domain means the address appearing minutes late, or a re-hidden
 * night still showing it. `venue-secrecy.md`, gate *cache e pre-render*.
 *
 * All three acts call it, including `completed`, which does not move the
 * column: it moves the trace and therefore the button's own sentence, and one
 * function for the three keeps the set from drifting apart act by act.
 */
function revalidateReveal(eventId: string, slug: string) {
  revalidatePath(`/admin/events/${eventId}/edit`);
  revalidatePath("/events");
  revalidatePath(`/events/${slug}`);
}

/**
 * **Reveal this night's address. Irreversible.** VENUE-02, D-37-01.
 *
 * ── One act, and it does BOTH things ─────────────────────────────────────────
 *
 * The mail with the address to whoever is entitled, and the address open on the
 * page for whoever has title. There is no mail-only action and no page-only
 * action: two one-way switches produce states nobody expects, and by definition
 * neither of them comes back.
 *
 * ── The order, which IS the decision ─────────────────────────────────────────
 *
 *   1. gate, shape, belonging, actor, **and a venue to release** — see
 *      `venue_not_set`, which is CR-01 and is checked before anything else that
 *      costs a round trip, because a night with nothing to publish must not
 *      reach the writer at all;
 *   2. the count — **people**, `emailMap.size`, not the sum of `tickets` and
 *      `rsvps`, which counts twice whoever holds both;
 *   3. the act. If the writer answers `ok: false`, **nothing is sent** — this is
 *      where the second press stops, with an answer instead of a duplicate mail;
 *   4. **then** the send. The act is written BEFORE the send and that is
 *      correct: from the instant `venue_revealed_at` exists the page opens, so
 *      the address is out whether or not the mail leaves. D-37-12 says the
 *      night stays marked as revealed and the button stays reachable for the
 *      missing ones — which is a fact in the data, since a batch that did not
 *      leave marks nobody;
 *   5. the invalidation, and the numbers back to whoever pressed.
 *
 * ── Why the send is bounded by the instant the act just wrote ────────────────
 *
 * `createdBefore` is the reveal instant, so a ticket bought in the milliseconds
 * between the act and the send is **not** mailed — it sees the address on the
 * page instead. Unbounded, that window would be a mail-on-purchase path arriving
 * as a side effect, and that path is explicitly deferred (D-37-08).
 */
export async function revealVenueNow(
  eventId: string,
  partyId: string
): Promise<VenueRevealActionResult> {
  const { userId } = await assertVenueReveal();

  if (!UUID_PATTERN.test(partyId)) {
    return { ok: false, reason: "invalid_party_id" };
  }

  const client = getServiceClient();

  const actor = await resolveActorName(client, userId);
  if (!actor.ok) return actor;

  const resolved = await resolveNight(client, eventId, partyId);
  if (!resolved.ok) return resolved;
  const { party, slug } = resolved.night;

  // CR-01 — nothing is revealed that is not there. Refused BEFORE the count and
  // long before the act: this is the server-side half of a rule that used to
  // live only in the panel, and the panel is UX (`CLAUDE.md` principle 2).
  //
  // The condition is the LINKED VENUE and not `venue_text`, deliberately. The
  // one public road to an address, `public.venue_for_parties`, joins
  // `public.venues` on `venue_id`; a night carrying only free text publishes no
  // address through it, and revealing it would spend the one-way switch on a
  // placeholder — and then the address would come out later, by itself, the
  // moment somebody linked the real venue from the edit form.
  if (resolved.night.venueId === null) {
    return { ok: false, reason: "venue_not_set" };
  }

  const { total: recipientsIntended, unavailable } =
    await countVenueRevealRecipients(client, party);

  if (unavailable) {
    // Refused BEFORE anything irreversible. Recording an act that says it meant
    // to reach zero people, when the truth is that nobody could find out, would
    // put a false statement in an append-only trace and open the address with no
    // mail leaving. The fallback in this domain is the secret.
    return { ok: false, reason: "recipients_unavailable" };
  }

  const act = await recordAct(
    client,
    partyId,
    "revealed",
    userId,
    actor.name,
    recipientsIntended
  );
  if (!act.ok) return act;

  const sent = await revealPartyVenue(
    client,
    party,
    act.revealedAt ? { createdBefore: act.revealedAt } : undefined
  );

  revalidateReveal(eventId, slug);

  return {
    ok: true,
    // The M of "N of M". The send's own count is a measurement and wins when
    // there was one; when the recipient read failed AFTER the act the send has
    // no number, and answering 0 there would say "nobody was entitled" — the
    // exact sentence `recipients_unavailable` exists to keep separate.
    recipientsTotal:
      sent.failureKind === "recipients_unavailable"
        ? recipientsIntended
        : sent.recipientsTotal,
    recipientsSent: sent.recipientsSent,
    recipientsFailed: sent.recipientsFailed,
    failureKind: sent.failureKind,
  };
}

/**
 * Send the address to the people the reveal did not reach. D-37-20.
 *
 * It does **not** move `venue_revealed_at` — the instant of the reveal is the
 * instant of the first act and it does not drift — and it does **not** re-send
 * to anybody already reached: the per-recipient filter is `venue_reveal_sent =
 * false` and it lives inside the sending module, in one copy.
 *
 * It is recorded anyway, and that is D-37-20's whole point: it mails the address
 * to N more people, so it is exactly as attributable as the first act. A
 * vocabulary with only two acts would make the second, third and fourth send
 * invisible while each of them is a publication.
 */
export async function sendMissingVenueReveal(
  eventId: string,
  partyId: string
): Promise<VenueRevealActionResult> {
  const { userId } = await assertVenueReveal();

  if (!UUID_PATTERN.test(partyId)) {
    return { ok: false, reason: "invalid_party_id" };
  }

  const client = getServiceClient();

  const actor = await resolveActorName(client, userId);
  if (!actor.ok) return actor;

  const resolved = await resolveNight(client, eventId, partyId);
  if (!resolved.ok) return resolved;
  const { party, revealedAt, slug } = resolved.night;

  // NOT a second verdict on anything the writer decides — it is the precondition
  // for the bound below. "Who is missing" is measured from the instant somebody
  // pressed, and without that instant the count would be unbounded and would
  // mail people D-37-08 says get the page and no mail. The writer refuses this
  // case too, under its own lock, and would answer the same word.
  if (revealedAt === null) {
    return { ok: false, reason: "not_revealed" };
  }

  const { total: missing, unavailable } = await countVenueRevealRecipients(
    client,
    party,
    { createdBefore: revealedAt }
  );

  if (unavailable) {
    return { ok: false, reason: "recipients_unavailable" };
  }

  if (missing === 0) {
    // Nobody is missing, so there is no act to record: the trace holds acts, not
    // presses. This is a success with nothing in it, and it is NOT
    // `recipients_unavailable` — the number was measured and it is zero.
    revalidateReveal(eventId, slug);
    return {
      ok: true,
      recipientsTotal: 0,
      recipientsSent: 0,
      recipientsFailed: 0,
      failureKind: "no_recipients",
    };
  }

  const act = await recordAct(
    client,
    partyId,
    "completed",
    userId,
    actor.name,
    missing
  );
  if (!act.ok) return act;

  const sent = await revealPartyVenue(client, party, {
    createdBefore: act.revealedAt ?? revealedAt,
  });

  revalidateReveal(eventId, slug);

  return {
    ok: true,
    recipientsTotal:
      sent.failureKind === "recipients_unavailable"
        ? missing
        : sent.recipientsTotal,
    recipientsSent: sent.recipientsSent,
    recipientsFailed: sent.recipientsFailed,
    failureKind: sent.failureKind,
  };
}

/**
 * Take the page back to secret. D-37-22 — **master only, and nothing is unsent.**
 *
 * ── What makes this honest, and it is a condition and not a detail ───────────
 *
 * The trace is append-only and survives this act: the night keeps saying
 * *revealed on … by …* after going secret again. That is the constraint the
 * owner's decision rests on. Without it we would have a page saying one thing
 * and mails that left saying another.
 *
 * So this act sends nothing, un-sends nothing, and touches no column that would
 * pretend the mails had not gone. The one column it does clear is
 * `venue_revealed_at`, inside the writer, where the widening of a monotone guard
 * is declared beside the line that performs it.
 *
 * ── The role is NOT decided here ─────────────────────────────────────────────
 *
 * `re_hide_requires_master` comes back **from the writer**, which reads the
 * actor's role from `public.profiles` inside itself. This module does not
 * re-decide it: two verdicts on one question are two places for them to
 * disagree, and the one that wins is whichever ran last. `party.manage` does not
 * reach here either, and it is not an omission — D-37-15: a night's assignment
 * governs the work of that evening, and the reveal happens before it and does
 * not undo.
 */
export async function reHideVenue(
  eventId: string,
  partyId: string
): Promise<VenueRevealActionResult> {
  const { userId } = await assertVenueReveal();

  if (!UUID_PATTERN.test(partyId)) {
    return { ok: false, reason: "invalid_party_id" };
  }

  const client = getServiceClient();

  const actor = await resolveActorName(client, userId);
  if (!actor.ok) return actor;

  const resolved = await resolveNight(client, eventId, partyId);
  if (!resolved.ok) return resolved;
  const { slug } = resolved.night;

  // Zero recipients, and it is the truth rather than a filler: this act reaches
  // nobody by construction. The column is `NOT NULL`, so a number has to be
  // given, and the honest one is the one that says no mail was intended.
  const act = await recordAct(
    client,
    partyId,
    "re_hidden",
    userId,
    actor.name,
    0
  );
  if (!act.ok) return act;

  revalidateReveal(eventId, slug);

  return {
    ok: true,
    recipientsTotal: 0,
    recipientsSent: 0,
    recipientsFailed: 0,
    failureKind: "none",
  };
}
