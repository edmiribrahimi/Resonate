"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { slugify } from "@/utils/slugify";
import { createCheckout, getCheckout, refundTransaction } from "@/lib/sumup";
import { verifyTicketToken } from "@/utils/qr";
import type { AccessType, DrinkItem } from "@/types/database";
import { menuCloseInstant, DEFAULT_VENUE_REVEAL_HOURS } from "@/utils/datetime";
import { logMoneyPathFailure, type SafeError } from "@/lib/failure/money-path";
import {
  assertEventOwnership,
  assertStaffManage,
} from "@/lib/capabilities/guards";
import { CAP } from "@/lib/capabilities/keys";
import { getAccessContext } from "@/lib/capabilities/server";

import { redactDbError } from "@/lib/errors/redact";
// Service-role client for operations where RLS blocks legitimate access
// (e.g., master updating events they don't own)
function getServiceClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

/**
 * The local `verifyOrganizer` and `verifyEventOwnership` are GONE, not unused,
 * and so is the fifth, INLINE copy of the ownership check that used to live in
 * `reorderDrinkItems`. All of them are now one definition in
 * `@/lib/capabilities/guards`.
 *
 * **The shape every gated action below follows:**
 *
 *   const supabase = await createClient();
 *   const ctx = await assertStaffManage();          // resolve ONCE
 *   await assertEventOwnership(supabase, eventId, ctx);
 *
 * `assertStaffManage()` is called **exactly once per invocation**. `cache()`
 * does not memoise inside a Server Action body (measured — see
 * `@/lib/capabilities/server`), so asking twice is two full round trips that
 * neither `npm run build` nor a fast connection will show you.
 *
 * The ownership read still uses `supabase`, the cookie client, exactly as
 * `verifyEventOwnership` did: RLS applies to it. This conversion changes who
 * may call, never what a call can see. The `getServiceClient()` uses further
 * down (the master write branch, `pending_purchases`, `drink_orders`,
 * `drink_items` reordering, the token RPCs) are untouched for the same reason.
 *
 * **`isMaster` became `ctx.capabilities.has(CAP.MASTER_MANAGE)`, and that is a
 * measured equivalence, not a rename.** The grant table
 * (`20260807000000_capability_model.sql:395`) holds exactly one row for the key,
 * `('master', 'master.manage', false)` — role `master`, status ignored — byte-
 * equal to the `profile.role === "master"` it replaces. The service-client
 * branch is therefore taken by exactly the same callers as before.
 *
 * **What is NOT gated here, stated rather than left to be discovered.**
 * `getDrinkItems` below has no gate, and it must not acquire one: it is reached
 * from `src/app/(public)/events/[slug]/menu/page.tsx`, the customer-facing
 * drinks menu. The phase-32 container read matrix measures `drink_items` as
 * **2 of 2 rows readable by `anon`** — the menu works *because* RLS permits an
 * anonymous read, and `assertStaffManage()` on it would refuse every guest
 * standing at the bar. Its boundary is that RLS policy, deliberately.
 */

interface PartyInput {
  id?: string;
  title: string;
  description?: string;
  date: string;
  time: string;
  end_time?: string;
  menu_closes_at?: string;
  venue_text?: string;
  venue_id?: string;
  lineup?: string[];
  venue_secret?: boolean;
  venue_secret_hint?: string;
  venue_reveal_hours?: number | null;
  venue_reveal_on_purchase?: boolean;
  access_type: AccessType;
  capacity?: number | null;
  sort_order: number;
  /** FMT-01. `NOT NULL` in the database — a night cannot be saved without one. */
  format_id: string;
  /** FMT-02. `NOT NULL`, and it must belong to `format_id` (composite key). */
  series_id: string;
  /**
   * FMT-03, and **nullable on purpose**.
   *
   * A night that is the *act* of another night carries that night's format and
   * series and no number of its own (§9a of the migration; one such row exists
   * in production). `null` here is a real state, not a missing value.
   */
  number?: number | null;
}

const VALID_ACCESS_TYPES: AccessType[] = ["free_public", "free_rsvp", "paid"];

/** The same shape as `[id]/assignments/actions.ts:85`. */
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** PostgreSQL `not_null_violation`. */
const NOT_NULL_VIOLATION = "23502";
/** PostgreSQL `foreign_key_violation`. */
const FOREIGN_KEY_VIOLATION = "23503";
/** PostgreSQL `unique_violation`. */
const UNIQUE_VIOLATION = "23505";
/** PostgreSQL `check_violation`. */
const CHECK_VIOLATION = "23514";

/**
 * The three constraint names phase 36 added to `public.event_parties`.
 *
 * They are matched against `error.message`, which carries the constraint name
 * for both `23505` and `23503` — and **not** against the error's `details`
 * field, which on a violation carries the entire rejected row
 * (`.planning/todos/pending/postgrest-details-leaks-the-row.md`).
 */
const DUPLICATE_NUMBER_CONSTRAINT = "event_parties_format_series_number_unique";
const SERIES_FORMAT_CONSTRAINT = "event_parties_series_format_fk";
const NUMBER_POSITIVE_CONSTRAINT = "event_parties_number_positive";

/**
 * Every way writing ONE night can be refused, one value each.
 *
 * ── Why a returned value and not a thrown message ────────────────────────────
 *
 * Next **redacts** the message of an error thrown out of a Server Action in a
 * production build (`src/lib/capabilities/server.ts:59-63`). A client that
 * branches on message text works in `next dev` and stops working where it
 * counts. The category therefore travels as a value, modelled on
 * `AssignmentRefusal` (`[id]/assignments/actions.ts:106-166`).
 *
 * There is no shared "something went wrong": the recorded precedent in this
 * repository is the newsletter form collapsing three causes into one sentence
 * (`.planning/codebase/CONCERNS.md`), and this product has **no error tracking**
 * (`meta-gates.md`), so this returned value is the only place a refusal exists
 * for a human.
 *
 * `sortOrder` is how the surface knows **which** night was refused. It is null
 * only where the write was a bulk insert and the database named no row —
 * `createEvent`; saying "one of these nights" is honest, guessing which is not.
 */
export type NightRefusal =
  /**
   * `event_parties_format_series_number_unique` — FMT-03, reached at the
   * database.
   *
   * **Deliberately not pre-checked in the application.** Two people with two
   * tabs open receive the same proposal from the series watermark; the second
   * write has to be refused by something both of them are behind, and no
   * application-level check is that thing (D-36-08). An app-side pre-check here
   * would be a race condition with a reassuring face.
   */
  | {
      kind: "duplicate_number";
      sortOrder: number | null;
      nightTitle: string | null;
      seriesId: string | null;
      number: number | null;
    }
  /**
   * `event_parties_series_format_fk` — the chosen series does not belong to the
   * chosen format.
   *
   * The form filters the series select by the chosen format, so this arriving
   * is **evidence that the filtering has stopped working**. It gets its own
   * value rather than hiding inside `write_failed` for exactly that reason: the
   * day it is returned, a person needs to be told to reload rather than to
   * retry.
   */
  | { kind: "series_format_mismatch"; sortOrder: number | null; nightTitle: string | null }
  /**
   * `event_parties_number_positive`, reached at the database.
   *
   * Practically unreachable now that `validateEventData` refuses a non-positive
   * number first, and kept for that reason: the day it is returned, the
   * application guard has stopped working and this value says so. The `CHECK`
   * is the RULE; the guard is the SENTENCE A PERSON READS — one keeps the row
   * from existing, the other tells the operator what happened instead of
   * handing them a constraint name.
   */
  | { kind: "number_not_positive"; sortOrder: number | null; nightTitle: string | null; number: number | null }
  /**
   * `23502` on `format_id` or `series_id`.
   *
   * Both columns are `NOT NULL`. Reaching this means the form submitted a night
   * without them — the fields were added to one of the three parallel shapes in
   * `EventForm.tsx` and not the others.
   */
  | { kind: "catalogue_missing"; sortOrder: number | null; nightTitle: string | null }
  /** A retired format on a night that did not already carry it (D-36-10). */
  | { kind: "format_retired"; sortOrder: number | null; nightTitle: string | null }
  /** A format id this caller cannot read. Unknown means refused, never assumed. */
  | { kind: "format_unknown"; sortOrder: number | null; nightTitle: string | null }
  /**
   * The side door on a one-way switch, closed — phase 37, D-37-22.
   *
   * `venue_secret` is a checkbox on this form and it ticks and unticks freely,
   * **leaving no trace of any kind**. From the moment a night has been revealed
   * by hand, that is a second path onto an act which everywhere else writes an
   * append-only row: a revealed night could go back to secret from here, and
   * nobody would know who did it.
   *
   * So a change to `venue_secret` on a night whose `venue_revealed_at` is set is
   * refused, and the sentence names the surface where it is genuinely possible.
   * An UNCHANGED value passes: merely opening the edit form and saving must keep
   * working, the same principle D-36-10 applies to a retired format.
   *
   * ── The perimeter, declared rather than left to be discovered ────────────────
   *
   * This covers nights **already revealed by hand**. A night that was never
   * revealed still behaves exactly as it does today — the form may make it
   * secret or not secret, with no trace — and that residue is real, not an
   * oversight: unticking `venue_secret` on a never-revealed night opens the
   * address to everybody just the same, through a path with no register. It is
   * outside this phase's declared perimeter and is written down in
   * `.planning/todos/pending/form-untick-venue-secret-leaves-no-trace.md`.
   */
  | {
      kind: "venue_secret_locked";
      sortOrder: number | null;
      nightTitle: string | null;
    }
  /**
   * The **other** side door on the same one-way switch — CR-01, phase 37 review.
   *
   * `venue_secret_locked` above closes the checkbox. It does not close the field
   * beside it, and the field beside it is the one that carries the address:
   * `venue_id` sits in the same `nightFields`, on the same form, and until now
   * no guard looked at it at all.
   *
   * ── The path this closes, which is a PUBLICATION and not an inconsistency ────
   *
   * A secret night is revealed while it carries a placeholder in `venue_text`
   * and no linked venue: the act is written, the mails leave naming the
   * placeholder, `venue_revealed_at` is set. Days later somebody completes the
   * night's record from this very form and links the real venue. Nothing
   * objected, because `venue_secret` had not changed — and **in that instant**
   * `public.venue_for_parties` began handing the name, the address and the Maps
   * link to every entitled reader, and the public page stopped withholding.
   * No act, no confirmation, no count, no row in `venue_reveal_acts`: asked *who
   * made this address public*, the trace names the act performed on the
   * placeholder.
   *
   * Changing the venue of an already-revealed night is a **second publication**,
   * and this repository has one rule about those: they pass through the panel
   * and leave a row, or they are refused (`venue-secrecy.md`, gate
   * *irreversibilita'*). The first half of the fix — refusing to reveal a night
   * with no linked venue at all — lives in
   * `(admin)/admin/events/[id]/reveal/actions.ts` as `venue_not_set`. Closing
   * only one of the two moves the hole instead of removing it.
   *
   * ── Its own kind, and not a second cause under the sentence above ────────────
   *
   * The two refusals send the person to two different places, so they get two
   * sentences. Collapsing them is the newsletter defect
   * (`.planning/codebase/CONCERNS.md`) reached through a door this phase built.
   *
   * ── The perimeter, same shape as its sibling ─────────────────────────────────
   *
   * An UNCHANGED `venue_id` passes: opening the form and saving keeps working.
   * A night never revealed by hand is untouched by this — its venue may still be
   * set, changed or cleared from here with no trace, and that residue is the one
   * already written down for `venue_secret`.
   */
  | {
      kind: "venue_link_locked";
      sortOrder: number | null;
      nightTitle: string | null;
    }
  /** Any other database failure. That night was not written. */
  | { kind: "write_failed"; sortOrder: number | null; nightTitle: string | null; code: string | null };

/** What every event write returns. `refusal` is present only when `success` is false. */
export type EventWriteResult = {
  success: boolean;
  id?: string;
  error?: string;
  refusal?: NightRefusal;
};

/** The only shape of a PostgREST error this file reads. `details` is not in it, on purpose. */
type WriteError = { code?: string | null; message?: string | null };

/** Turn a database refusal of ONE night into a named category. */
function classifyNightWriteError(
  error: WriteError,
  night: { sort_order: number; title: string; series_id: string; number?: number | null } | null
): NightRefusal {
  const sortOrder = night?.sort_order ?? null;
  const nightTitle = night?.title?.trim() || null;
  const code = error.code ?? null;
  const message = error.message ?? "";

  if (code === UNIQUE_VIOLATION && message.includes(DUPLICATE_NUMBER_CONSTRAINT)) {
    return {
      kind: "duplicate_number",
      sortOrder,
      nightTitle,
      seriesId: night?.series_id ?? null,
      number: night?.number ?? null,
    };
  }
  if (code === FOREIGN_KEY_VIOLATION && message.includes(SERIES_FORMAT_CONSTRAINT)) {
    return { kind: "series_format_mismatch", sortOrder, nightTitle };
  }
  if (code === CHECK_VIOLATION && message.includes(NUMBER_POSITIVE_CONSTRAINT)) {
    return { kind: "number_not_positive", sortOrder, nightTitle, number: night?.number ?? null };
  }
  if (code === NOT_NULL_VIOLATION) {
    return { kind: "catalogue_missing", sortOrder, nightTitle };
  }
  return { kind: "write_failed", sortOrder, nightTitle, code };
}

/**
 * The one sentence per category, written here so the same words reach a caller
 * that does not know the catalogue.
 *
 * `EventForm` upgrades `duplicate_number` with the series' own name, which it
 * can do and this file cannot: the action holds a `series_id`, not a name, and
 * reading one back purely to phrase an error would be a round trip on a path
 * that is already refusing.
 */
function nightRefusalSentence(refusal: NightRefusal): string {
  const where =
    refusal.sortOrder !== null
      ? `Sub-event ${refusal.sortOrder + 1}: `
      : "";

  switch (refusal.kind) {
    case "duplicate_number":
      return refusal.number !== null
        ? `${where}number ${refusal.number} is already assigned in this series. Pick another.`
        : `${where}one of these nights carries a number already assigned in its series. Pick another.`;
    case "series_format_mismatch":
      return `${where}that series does not belong to the chosen format. Reload the form and pick the series again.`;
    case "number_not_positive":
      return `${where}a series number must be a whole number of 1 or more.`;
    case "catalogue_missing":
      return `${where}this night reached the server without a format or a series. Reload the form and pick them again.`;
    case "format_retired":
      return `${where}that format has been retired. Nights already recorded under it keep it; a new night cannot be assigned to it.`;
    case "format_unknown":
      return `${where}that format is not one you can assign. Reload the form and pick again.`;
    case "venue_secret_locked":
      return (
        `${where}this sub-event's address has already been revealed, so the ` +
        `secret-venue box cannot be changed from this form. Do it from the ` +
        `reveal panel on the sub-event itself: only a master can put the ` +
        `address back behind the secret, and the act is recorded with who did ` +
        `it and when.`
      );
    case "venue_link_locked":
      return (
        `${where}this sub-event's address has already been revealed, so the ` +
        `venue it points at cannot be changed from this form. The reason is ` +
        `not bookkeeping: a different venue here becomes the address on the ` +
        `public page and in every future mail the instant it is saved, with no ` +
        `act recorded and nobody named for it — while the mails already sent ` +
        `keep naming the old one. If the venue is genuinely wrong, a master ` +
        `takes the night back to secret from the reveal panel first; that act ` +
        `is recorded, and the address can then be set and revealed again.`
      );
    case "write_failed":
      return `${where}saving this night failed (${refusal.code ?? "no code"}). Nothing was written for it.`;
  }
}

/**
 * Log a refusal with its CODE and its MESSAGE, and nothing else.
 *
 * Never the whole error object and never its `details` field: on a violation
 * PostgREST returns the entire rejected row, and roughly twenty sites in this
 * repository already pass the whole object to `console.error`
 * (`.planning/todos/pending/postgrest-details-leaks-the-row.md`). This path now
 * fails routinely — a number already in use is an ordinary operator mistake —
 * so it must not become the twenty-first.
 */
function logNightRefusal(refusal: NightRefusal, error: WriteError | null) {
  console.error(
    `[event_parties.${refusal.kind}] sort_order=${refusal.sortOrder ?? "unknown"} ` +
      `code=${error?.code ?? "none"} message=${error?.message ?? "none"}`
  );
}

/**
 * Validate event form data. Returns validated fields or throws on error.
 */
function validateEventData(formData: FormData) {
  const title = (formData.get("title") as string)?.trim();
  const description = (formData.get("description") as string)?.trim();
  const venueSecret = formData.get("venue_secret") === "true";
  const lineupRaw = formData.get("lineup") as string;
  const coverImage = (formData.get("cover_image") as string)?.trim() || null;
  const partiesRaw = formData.get("parties") as string;

  // Title validation
  if (!title || title.length < 3 || title.length > 100) {
    throw new Error("Title must be between 3 and 100 characters");
  }

  // Description validation
  if (!description || description.length < 10 || description.length > 5000) {
    throw new Error("Description must be between 10 and 5000 characters");
  }

  // Parse lineup
  let lineup: string[] = [];
  if (lineupRaw) {
    try {
      lineup = JSON.parse(lineupRaw);
      if (!Array.isArray(lineup)) {
        lineup = [];
      }
    } catch {
      lineup = [];
    }
  }

  // Parse and validate parties (can be empty for simple events)
  let parties: PartyInput[] = [];
  if (partiesRaw) {
    try {
      parties = JSON.parse(partiesRaw);
      if (!Array.isArray(parties)) {
        parties = [];
      }
    } catch {
      parties = [];
    }
  }

  // Validate each party
  const timeRegex = /^\d{2}:\d{2}(:\d{2})?$/;

  for (const party of parties) {
    if (!party.title || party.title.trim().length === 0) {
      throw new Error("Title is required for each sub-event");
    }
    if (!party.date || isNaN(Date.parse(party.date))) {
      throw new Error("A valid date is required for each sub-event");
    }
    if (!party.time || !timeRegex.test(party.time)) {
      throw new Error("A valid time is required for each sub-event");
    }
    if (party.end_time && !timeRegex.test(party.end_time)) {
      throw new Error("Invalid end time for a sub-event");
    }
    if (party.menu_closes_at && !timeRegex.test(party.menu_closes_at)) {
      throw new Error("Invalid menu closing time for a sub-event");
    }
    if (!VALID_ACCESS_TYPES.includes(party.access_type)) {
      throw new Error("Invalid access type for a sub-event");
    }
    // ── FMT-01 / FMT-02 / FMT-03: the three new per-night causes ─────────────
    //
    // One `throw new Error` per distinct cause, following this loop's existing
    // form. WHAT THAT FORM CANNOT DO, said rather than left to be discovered:
    // Next redacts the message of an error thrown out of a Server Action in a
    // production build, so these twelve-plus sentences reach a person in
    // `next dev` and not in production. That is a pre-existing property of every
    // throw in this function, not something these three introduce — and it is
    // why the *format* and *series* controls are `required` in the browser
    // (`EventForm.tsx`), so the refusal a person actually meets happens before
    // the action is called, and why the DATABASE refusals below travel back as
    // returned values instead.
    if (!party.format_id || !UUID_PATTERN.test(party.format_id)) {
      throw new Error("Pick a format. A night cannot be saved without one.");
    }
    if (!party.series_id || !UUID_PATTERN.test(party.series_id)) {
      throw new Error("Pick a series before choosing a number.");
    }
    // The number is OPTIONAL — see `PartyInput.number`. An empty field is the
    // real state "this night has no number of its own", so it is normalised to
    // null here rather than being coerced to 0 by `Number("")`.
    if (
      party.number === undefined ||
      party.number === null ||
      String(party.number).trim() === ""
    ) {
      party.number = null;
    } else {
      const n = Number(party.number);
      if (!Number.isInteger(n) || n < 1) {
        throw new Error("A series number must be a whole number of 1 or more.");
      }
      party.number = n;
    }
    if (party.capacity !== undefined && party.capacity !== null) {
      const cap = Number(party.capacity);
      if (isNaN(cap) || cap < 1) {
        throw new Error("Capacity must be a positive integer");
      }
      party.capacity = cap;
    }
    // Ensure lineup is an array
    if (party.lineup && !Array.isArray(party.lineup)) {
      party.lineup = [];
    }
    // Ensure venue_secret is boolean
    if (party.venue_secret !== undefined) {
      party.venue_secret = !!party.venue_secret;
    }
    // Validate venue_secret_hint
    if (party.venue_secret_hint && party.venue_secret_hint.length > 500) {
      throw new Error("Venue hint must be 500 characters or less");
    }
    // Validate venue_reveal_hours
    //
    // The floor is `DEFAULT_VENUE_REVEAL_HOURS`, imported rather than written as
    // a number here: a third copy of it in a third file would restart the drift
    // the constant exists to end (`src/utils/datetime.ts`).
    //
    // Two refusals, not one, because they are two different mistakes and a
    // single sentence covering both would tell the operator neither
    // (`meta-gates.md`, zero fallimenti silenziosi). And the second one says
    // WHY: a floor that only refuses is a floor the next person raises, instead
    // of raising the window (D-37-06 point 2).
    if (party.venue_reveal_hours !== undefined && party.venue_reveal_hours !== null) {
      const hours = Number(party.venue_reveal_hours);
      if (!Number.isInteger(hours)) {
        throw new Error("The reveal window must be a whole number of hours.");
      }
      if (hours < DEFAULT_VENUE_REVEAL_HOURS) {
        throw new Error(
          `The reveal window must be at least ${DEFAULT_VENUE_REVEAL_HOURS} hours. ` +
            "Below that the address mail can leave AFTER the party has started: the reveal cron " +
            "runs once a day, so a window narrower than the gap between two runs can open after " +
            "the day's run has already gone. Widen the window, not this floor."
        );
      }
      party.venue_reveal_hours = hours;
    }
    // Ensure venue_reveal_on_purchase is boolean
    if (party.venue_reveal_on_purchase !== undefined) {
      party.venue_reveal_on_purchase = !!party.venue_reveal_on_purchase;
    }
  }

  // Two nights in ONE submission carrying the same (format, series, number).
  //
  // NOT the application-level pre-check D-36-08 forbids: that one asks the
  // database whether a number is free, which two tabs beat. This compares the
  // rows of a single payload to each other, where there is no second writer and
  // therefore no race. Its only job is attribution — `createEvent` writes the
  // nights in ONE bulk insert, so without this the database refuses `23505` and
  // names no row, and the operator is told "one of these" instead of which.
  const seenTriples = new Set<string>();
  for (const party of parties) {
    if (party.number === null || party.number === undefined) continue;
    const triple = `${party.format_id}|${party.series_id}|${party.number}`;
    if (seenTriples.has(triple)) {
      throw new Error(
        `Two sub-events in this form carry number ${party.number} in the same series. A number belongs to one night.`
      );
    }
    seenTriples.add(triple);
  }

  // Date: derive from sub-events if any, otherwise require explicit date from form
  const eventDateRaw = formData.get("date") as string;
  const date = parties.length > 0
    ? parties.map((p) => p.date).sort()[0]
    : eventDateRaw;

  if (!date || isNaN(Date.parse(date))) {
    throw new Error("A valid date is required");
  }

  return {
    title,
    description,
    date,
    venue_secret: venueSecret,
    lineup,
    cover_image: coverImage,
    parties,
  };
}

/**
 * The two clients this file writes events with. Exactly the union the master
 * branch already produces (`ctx.capabilities.has(CAP.MASTER_MANAGE) ? … : …`).
 */
type EventWriteClient =
  | Awaited<ReturnType<typeof createClient>>
  | ReturnType<typeof getServiceClient>;

/**
 * T-36-10-04 — an archived night must not be silently reassigned, and a NEW
 * night must not be assigned to a retired format.
 *
 * `EventForm` keeps a retired format in the select **only** for the night that
 * already carries it, preselected, so that merely opening the edit form and
 * saving does not rewrite an archived night (D-36-10). That is the select being
 * able to display the truth. Refusing a *change to* a retired format is this
 * function's job, and it is the half that survives a forged POST.
 *
 * ── Why an unreadable format is refused rather than allowed ──────────────────
 *
 * The read uses the SAME client that performs the write, so it sees exactly the
 * rows that caller may see: `formats_select_listed` plus, for a holder of
 * `catalogue.manage`, everything. A format id that comes back with no row is
 * therefore one this caller cannot read — and unknown means refused, never
 * assumed (`venue-secrecy.md`, gate *default chiuso*, applied to a catalogue).
 *
 * Returns the refusal, or null when every night's format is assignable.
 */
async function refuseUnassignableFormats(
  client: EventWriteClient,
  parties: PartyInput[],
  /** format_id each existing night ALREADY carries, by night id. Empty on create. */
  carriedFormatByNightId: Map<string, string>
): Promise<NightRefusal | null> {
  const submitted = [...new Set(parties.map((p) => p.format_id))];
  if (submitted.length === 0) return null;

  const { data: rows, error } = await client
    .from("formats")
    .select("id, retired_at")
    .in("id", submitted);

  if (error) {
    // A catalogue read that failed is NOT permission to write whatever was
    // submitted. It is refused with its own category, because "the check could
    // not run" and "the check passed" are different facts.
    const refusal: NightRefusal = {
      kind: "format_unknown",
      sortOrder: null,
      nightTitle: null,
    };
    logNightRefusal(refusal, error);
    return refusal;
  }

  const retiredById = new Map<string, boolean>(
    (rows ?? []).map((f: { id: string; retired_at: string | null }) => [
      f.id,
      f.retired_at !== null,
    ])
  );

  for (const party of parties) {
    const alreadyCarried =
      party.id !== undefined && carriedFormatByNightId.get(party.id) === party.format_id;
    if (alreadyCarried) continue;

    const retired = retiredById.get(party.format_id);
    if (retired === undefined) {
      return {
        kind: "format_unknown",
        sortOrder: party.sort_order,
        nightTitle: party.title?.trim() || null,
      };
    }
    if (retired) {
      return {
        kind: "format_retired",
        sortOrder: party.sort_order,
        nightTitle: party.title?.trim() || null,
      };
    }
  }

  return null;
}

/** Revalidate all paths that display events */
function revalidateEventPaths(slug?: string) {
  revalidatePath("/admin/events");
  revalidatePath("/events");
  if (slug) {
    revalidatePath(`/events/${slug}`);
  }
}

// =============================================================
// Server Actions
// =============================================================

/**
 * Create a new event as a draft.
 */
export async function createEvent(formData: FormData): Promise<EventWriteResult> {
  const supabase = await createClient();
  const ctx = await assertStaffManage();

  // Narrowed ONCE, here, rather than with a `!` at the `created_by` write below.
  // `assertStaffManage()` throws unless the caller holds `staff.manage`, which
  // implies an authenticated subject — but TypeScript does not know that, and
  // `ACCESS-MODEL-DECISIONS.md` §5 makes attribution a requirement. A `!` that
  // turned out to be wrong would write a null into an ownership column and
  // nothing in this project would report it: there is no error tracking.
  if (!ctx.userId) {
    throw new Error("capabilities.resolve_failed: no_subject");
  }

  const data = validateEventData(formData);

  // Every night here is NEW, so nothing "already carries" a format: an empty
  // map means a retired format is refused for all of them.
  const formatRefusal = await refuseUnassignableFormats(
    supabase,
    data.parties,
    new Map()
  );
  if (formatRefusal) {
    return {
      success: false,
      error: nightRefusalSentence(formatRefusal),
      refusal: formatRefusal,
    };
  }

  // Generate slug from title, ensure uniqueness
  let slug = slugify(data.title);

  const { data: existing } = await supabase
    .from("events")
    .select("id")
    .eq("slug", slug)
    .single();

  if (existing) {
    slug = `${slug}-${Date.now().toString(36)}`;
  }

  const { data: inserted, error } = await supabase
    .from("events")
    .insert({
      title: data.title,
      slug,
      description: data.description,
      date: data.date,
      venue_secret: data.venue_secret,
      lineup: data.lineup,
      cover_image: data.cover_image,
      is_published: false,
      created_by: ctx.userId,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create event: ${error.message}`);
  }

  // Bulk-insert parties
  const partyRows = data.parties.map((p) => ({
    event_id: inserted.id,
    title: p.title.trim(),
    description: p.description?.trim() || null,
    date: p.date,
    time: p.time,
    end_time: p.end_time || null,
    menu_closes_at: p.menu_closes_at || null,
    venue_text: p.venue_text?.trim() || null,
    venue_id: p.venue_id || null,
    lineup: p.lineup ?? [],
    venue_secret: p.venue_secret ?? false,
    venue_secret_hint: p.venue_secret_hint?.trim() || null,
    venue_reveal_hours: p.venue_reveal_hours ?? null,
    venue_reveal_on_purchase: p.venue_reveal_on_purchase ?? true,
    access_type: p.access_type,
    capacity: p.capacity ?? null,
    sort_order: p.sort_order,
    format_id: p.format_id,
    series_id: p.series_id,
    number: p.number ?? null,
  }));

  const { error: partyError } = await supabase
    .from("event_parties")
    .insert(partyRows);

  if (partyError) {
    // ONE bulk insert, so the database names no row. The refusal therefore
    // carries `sortOrder: null` and the sentence says "one of these nights"
    // rather than inventing a position — `validateEventData` already caught the
    // case this path CAN attribute (two nights of one payload sharing a triple).
    const refusal = classifyNightWriteError(partyError, null);
    logNightRefusal(refusal, partyError);

    // The event row exists and has no nights. Before phase 36 this insert
    // essentially never failed; a duplicate number makes it an ordinary
    // outcome, so leaving a draft behind on every mistyped number would turn a
    // typo into a growing list of empty drafts. Undone here, and a failure to
    // undo is said out loud rather than swallowed.
    const { error: cleanupError } = await supabase
      .from("events")
      .delete()
      .eq("id", inserted.id);
    if (cleanupError) {
      console.error(
        `[events.orphan_draft] event=${inserted.id} could not be removed after its ` +
          `nights were refused. code=${cleanupError.code ?? "none"} message=${cleanupError.message}`
      );
    }

    return { success: false, error: nightRefusalSentence(refusal), refusal };
  }

  revalidateEventPaths();
  return { success: true, id: inserted.id };
}

/**
 * Update an existing event.
 */
export async function updateEvent(
  eventId: string,
  formData: FormData
): Promise<EventWriteResult> {
  const supabase = await createClient();
  const ctx = await assertStaffManage();

  await assertEventOwnership(supabase, eventId, ctx);

  const data = validateEventData(formData);

  // Use service-role client for master (bypasses RLS ownership check)
  const client = ctx.capabilities.has(CAP.MASTER_MANAGE)
    ? getServiceClient()
    : supabase;

  const { error } = await client
    .from("events")
    .update({
      title: data.title,
      description: data.description,
      date: data.date,
      venue_secret: data.venue_secret,
      lineup: data.lineup,
      cover_image: data.cover_image,
    })
    .eq("id", eventId);

  if (error) {
    throw new Error(`Failed to update event: ${error.message}`);
  }

  // Fetch existing parties for this event.
  //
  // `{ error }` is destructured and acted on, and it is not a formality: a
  // failed read leaves `existingIds` empty, every incoming night with an id
  // falls to the INSERT arm below, and the event silently ends up with its
  // nights duplicated. Refusing here is the only thing between that and an
  // archive nobody can trust.
  // `venue_secret`, `venue_id` and `venue_revealed_at` ride along on the read
  // that was already happening, rather than in a second query: the guards below
  // need the STORED state of all three, and a night's id survives an edit (the
  // upsert is by id), so this read always has the right row to compare against.
  const { data: existingParties, error: existingError } = await client
    .from("event_parties")
    .select("id, format_id, venue_secret, venue_id, venue_revealed_at")
    .eq("event_id", eventId);

  if (existingError) {
    const refusal: NightRefusal = {
      kind: "write_failed",
      sortOrder: null,
      nightTitle: null,
      code: existingError.code ?? null,
    };
    logNightRefusal(refusal, existingError);
    return {
      success: false,
      error:
        "The nights of this event could not be read, so nothing was changed. Reload and try again.",
      refusal,
    };
  }

  const existingRows = (existingParties ?? []) as {
    id: string;
    format_id: string | null;
    venue_secret: boolean | null;
    venue_id: string | null;
    venue_revealed_at: string | null;
  }[];
  const existingIds = new Set(existingRows.map((p) => p.id));
  /** The stored secrecy of each night, for the one-way-switch guards below. */
  const storedSecrecyByNightId = new Map<
    string,
    { secret: boolean; venueId: string | null; revealedAt: string | null }
  >(
    existingRows.map((p) => [
      p.id,
      {
        secret: p.venue_secret ?? false,
        venueId: p.venue_id,
        revealedAt: p.venue_revealed_at,
      },
    ])
  );
  // What each night ALREADY carries — the exception that keeps an archived
  // night from being rewritten just because its format was later retired.
  //
  // The predicate narrows the row it was given rather than restating its shape:
  // written as a standalone `{ id, format_id }` it stopped compiling the moment
  // this read grew two columns, which is the drift a `&` avoids.
  const carriedFormatByNightId = new Map<string, string>(
    existingRows
      .filter(
        (p): p is (typeof existingRows)[number] & { format_id: string } =>
          p.format_id !== null
      )
      .map((p) => [p.id, p.format_id])
  );

  const formatRefusal = await refuseUnassignableFormats(
    client,
    data.parties,
    carriedFormatByNightId
  );
  if (formatRefusal) {
    return {
      success: false,
      error: nightRefusalSentence(formatRefusal),
      refusal: formatRefusal,
    };
  }

  // Determine which parties to update, insert, or delete
  const incomingIds = new Set(
    data.parties.filter((p) => p.id).map((p) => p.id!)
  );
  const idsToDelete = [...existingIds].filter((id) => !incomingIds.has(id));

  // Check if parties to delete have sold tickets.
  //
  // `{ error }` too: a failed count returns `count === null`, the guard passes,
  // and a night that has sold tickets is deleted. That is money and a door
  // list, so an unreadable count is a refusal and not a zero.
  for (const partyId of idsToDelete) {
    const { count, error: countError } = await client
      .from("tickets")
      .select("*", { count: "exact", head: true })
      .eq("party_id", partyId);
    if (countError) {
      const refusal: NightRefusal = {
        kind: "write_failed",
        sortOrder: null,
        nightTitle: null,
        code: countError.code ?? null,
      };
      logNightRefusal(refusal, countError);
      return {
        success: false,
        error:
          "Whether a removed sub-event has sold tickets could not be checked, so nothing was changed.",
        refusal,
      };
    }
    if (count && count > 0) {
      throw new Error(
        "Cannot remove a sub-event that has sold tickets"
      );
    }
  }

  // Delete removed parties — checked, for the same reason as everything else in
  // this function: a delete that silently fails leaves a night on the public
  // page that the operator has been told is gone.
  for (const partyId of idsToDelete) {
    const { error: deleteError } = await client
      .from("event_parties")
      .delete()
      .eq("id", partyId);
    if (deleteError) {
      const refusal: NightRefusal = {
        kind: "write_failed",
        sortOrder: null,
        nightTitle: null,
        code: deleteError.code ?? null,
      };
      logNightRefusal(refusal, deleteError);
      return {
        success: false,
        error: "A removed sub-event could not be deleted. Reload and try again.",
        refusal,
      };
    }
  }

  // ── Upsert parties ──────────────────────────────────────────────────────────
  //
  // THE DEFECT THIS PHASE CLOSES. Until now neither write below destructured
  // its result, while `createEvent` twenty lines up did. The named constraint
  // D-36-08 adds — `event_parties_format_series_number_unique` — would have
  // fired here, the loop would have carried on, `revalidateEventPaths()` would
  // have run and this action would have returned `{ success: true }`: the
  // organizer saves, the save does nothing, and the number they typed is not
  // the number stored. `meta-gates.md` is explicit that in a repository with no
  // error tracking a failure that counts must have an OBSERVABLE effect.
  //
  // The loop is NOT collapsed into one failure message: the operator needs to
  // know which night was refused, and `sortOrder` is how the form knows which
  // field to attach the sentence to.
  //
  // It stops at the first refusal rather than carrying on. A partially applied
  // save is worse than a refused one: the nights before the failure are
  // written, so the screen and the archive disagree, and the person is the only
  // one who could tell them apart.
  for (const party of data.parties) {
    const nightFields = {
      title: party.title.trim(),
      description: party.description?.trim() || null,
      date: party.date,
      time: party.time,
      end_time: party.end_time || null,
      menu_closes_at: party.menu_closes_at || null,
      venue_text: party.venue_text?.trim() || null,
      venue_id: party.venue_id || null,
      lineup: party.lineup ?? [],
      venue_secret: party.venue_secret ?? false,
      venue_secret_hint: party.venue_secret_hint?.trim() || null,
      venue_reveal_hours: party.venue_reveal_hours ?? null,
      venue_reveal_on_purchase: party.venue_reveal_on_purchase ?? true,
      access_type: party.access_type,
      capacity: party.capacity ?? null,
      sort_order: party.sort_order,
      format_id: party.format_id,
      series_id: party.series_id,
      // Stored as typed, never recomputed. D-36-06, and a monotone guard:
      // a progressivo already assigned is already on a poster.
      number: party.number ?? null,
    };

    // ── The two side doors on a one-way switch, closed before the write ───────
    //
    // See `venue_secret_locked` and `venue_link_locked` on `NightRefusal` for
    // the whole reasoning, including the residue they deliberately do NOT cover.
    // Both are compared against the STORED value, so a save that touches neither
    // goes through: each refusal is about a CHANGE, never about the night having
    // been revealed.
    //
    // TWO checks and not one condition with an `||`, because they are two
    // causes: the checkbox sends the person to the reveal panel, the venue field
    // sends them to a master who must re-hide first, and one sentence covering
    // both would be the shared bucket this file exists without.
    const stored = party.id ? storedSecrecyByNightId.get(party.id) : undefined;
    const alreadyRevealed = stored !== undefined && stored.revealedAt !== null;

    if (
      alreadyRevealed &&
      stored &&
      (party.venue_secret ?? false) !== stored.secret
    ) {
      const refusal: NightRefusal = {
        kind: "venue_secret_locked",
        sortOrder: party.sort_order,
        nightTitle: party.title?.trim() || null,
      };
      logNightRefusal(refusal, null);
      return { success: false, error: nightRefusalSentence(refusal), refusal };
    }

    // Normalised the same way `nightFields.venue_id` is, and that matters: the
    // form sends `""` for a cleared select, and comparing a raw `""` against a
    // stored `null` would refuse a save that changed nothing.
    if (alreadyRevealed && stored && (party.venue_id || null) !== stored.venueId) {
      const refusal: NightRefusal = {
        kind: "venue_link_locked",
        sortOrder: party.sort_order,
        nightTitle: party.title?.trim() || null,
      };
      logNightRefusal(refusal, null);
      return { success: false, error: nightRefusalSentence(refusal), refusal };
    }

    let nightError: WriteError | null = null;

    if (party.id && existingIds.has(party.id)) {
      const { error: updateError } = await client
        .from("event_parties")
        .update({ ...nightFields, updated_at: new Date().toISOString() })
        .eq("id", party.id);
      nightError = updateError;
    } else {
      const { error: insertError } = await client
        .from("event_parties")
        .insert({ event_id: eventId, ...nightFields });
      nightError = insertError;
    }

    if (nightError) {
      const refusal = classifyNightWriteError(nightError, {
        sort_order: party.sort_order,
        title: party.title,
        series_id: party.series_id,
        number: party.number ?? null,
      });
      logNightRefusal(refusal, nightError);
      return { success: false, error: nightRefusalSentence(refusal), refusal };
    }
  }

  // Fetch slug for path revalidation
  const { data: event } = await supabase
    .from("events")
    .select("slug")
    .eq("id", eventId)
    .single();

  revalidateEventPaths(event?.slug);
  return { success: true };
}

/**
 * Delete an event.
 */
export async function deleteEvent(eventId: string) {
  const supabase = await createClient();
  const ctx = await assertStaffManage();

  await assertEventOwnership(supabase, eventId, ctx);

  // Fetch slug before deletion for path revalidation
  const { data: event } = await supabase
    .from("events")
    .select("slug")
    .eq("id", eventId)
    .single();

  // Use service-role client for master (bypasses RLS ownership check)
  const client = ctx.capabilities.has(CAP.MASTER_MANAGE)
    ? getServiceClient()
    : supabase;

  const { error } = await client.from("events").delete().eq("id", eventId);

  if (error) {
    throw new Error(`Failed to delete event: ${error.message}`);
  }

  revalidateEventPaths(event?.slug);
  return { success: true };
}

/**
 * Publish an event (make it visible to members).
 */
export async function publishEvent(eventId: string) {
  const supabase = await createClient();
  const ctx = await assertStaffManage();

  await assertEventOwnership(supabase, eventId, ctx);

  // Use service-role client for master (bypasses RLS ownership check)
  const client = ctx.capabilities.has(CAP.MASTER_MANAGE)
    ? getServiceClient()
    : supabase;

  const { error } = await client
    .from("events")
    .update({ is_published: true })
    .eq("id", eventId);

  if (error) {
    throw new Error(`Failed to publish event: ${error.message}`);
  }

  // Fetch slug for path revalidation
  const { data: event } = await supabase
    .from("events")
    .select("slug")
    .eq("id", eventId)
    .single();

  revalidateEventPaths(event?.slug);
  return { success: true };
}

/**
 * Unpublish an event (revert to draft).
 */
export async function unpublishEvent(eventId: string) {
  const supabase = await createClient();
  const ctx = await assertStaffManage();

  await assertEventOwnership(supabase, eventId, ctx);

  // Use service-role client for master (bypasses RLS ownership check)
  const client = ctx.capabilities.has(CAP.MASTER_MANAGE)
    ? getServiceClient()
    : supabase;

  const { error } = await client
    .from("events")
    .update({ is_published: false })
    .eq("id", eventId);

  if (error) {
    throw new Error(`Failed to unpublish event: ${error.message}`);
  }

  // Fetch slug for path revalidation
  const { data: event } = await supabase
    .from("events")
    .select("slug")
    .eq("id", eventId)
    .single();

  revalidateEventPaths(event?.slug);
  return { success: true };
}

/**
 * The three ways a read inside `purchaseTicket` can fail to answer its question.
 *
 * These are NOT refusals. Every one of them leaves the purchase running — see
 * the docblock over the capacity block below for why that direction is
 * deliberate. What they buy is the distinction between *counted zero* and
 * *could not count*, which the three reads used to collapse into one another.
 *
 * Constants → a union from `typeof` → a **total** `Record`, the construction
 * stated in `src/lib/failure/money-path.ts` and already in the tree twice
 * (`src/lib/door/outcome.ts:278-302`,
 * `src/app/api/media/finalize/route.ts:236-254`). The `Record` is the point: a
 * fourth category added later without its scope string is an `npm run build`
 * error rather than a log line that silently names nothing.
 */
const PRECHECK_TIER_LIST_UNREADABLE = "tier_list_unreadable";
const PRECHECK_SOLD_COUNT_UNREADABLE = "sold_count_unreadable";
const PRECHECK_DISCOUNT_USAGE_UNREADABLE = "discount_usage_unreadable";

type PurchasePrecheckUnreadable =
  | typeof PRECHECK_TIER_LIST_UNREADABLE
  | typeof PRECHECK_SOLD_COUNT_UNREADABLE
  | typeof PRECHECK_DISCOUNT_USAGE_UNREADABLE;

const PURCHASE_PRECHECK_SCOPE: Record<PurchasePrecheckUnreadable, string> = {
  [PRECHECK_TIER_LIST_UNREADABLE]: "purchaseTicket.tier_list_unreadable",
  [PRECHECK_SOLD_COUNT_UNREADABLE]: "purchaseTicket.sold_count_unreadable",
  [PRECHECK_DISCOUNT_USAGE_UNREADABLE]: "purchaseTicket.discount_usage_unreadable",
};

/**
 * One line per unreadable pre-check read: its scope, the error's `code` and the
 * error's `message`. Never the error object and never `error.details` — on a
 * violation PostgREST returns the whole rejected row, and a `tickets` or
 * `profiles` row carries the door credential
 * (`.planning/todos/pending/postgrest-details-leaks-the-row.md`). The
 * `SafeError` parameter enforces that by type instead of by memory.
 */
function logPurchasePrecheckUnreadable(
  category: PurchasePrecheckUnreadable,
  error: SafeError | null
): void {
  logMoneyPathFailure(PURCHASE_PRECHECK_SCOPE[category], error);
}

/**
 * Initiate a ticket purchase via SumUp hosted checkout.
 * Only approved members can purchase tickets (TICK-07).
 * partyId can be null for event-level (master) tickets.
 */
export async function purchaseTicket(partyId: string | null, tierId: string, discountCodeId?: string | null) {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error("Not authenticated");
  }

  // Verify user has a profile (pending users CAN purchase — approval happens on successful payment)
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("status")
    .eq("id", user.id)
    .single();

  if (profileError || !profile) {
    throw new Error("Profile not found");
  }

  if (profile.status === "rejected") {
    throw new Error(
      "Your account has been rejected and cannot purchase tickets"
    );
  }

  // Fetch tier details to get event_id
  const { data: tier, error: tierError } = await supabase
    .from("ticket_tiers")
    .select("id, name, price, event_id, party_id, quantity, starts_at, expires_at")
    .eq("id", tierId)
    .single();

  if (tierError || !tier) {
    throw new Error("Ticket tier not found");
  }

  const eventId = tier.event_id;

  // Chain-based validation: fetch all tiers for same event/party, ordered by price.
  //
  // ── This pre-check stays PERMISSIVE on a failed read, on purpose ────────────
  //
  // Both reads below now destructure their error, but neither one refuses when
  // it cannot answer. That is a decision (D-46-05), not an oversight, and it is
  // written here so the next reader does not "finish the job" by flipping it.
  //
  // WHY. The real capacity guard is not this block — it is `reserve_ticket`
  // (`supabase/migrations/20260310100000_discount_codes.sql:90`), called by the
  // SumUp webhook when the payment completes. It locks the tier row
  // `FOR UPDATE`, counts the tickets already sold, raises `Tier sold out`, and
  // validates a discount code's `max_uses` — all in one transaction. In plpgsql
  // a failed read RAISES; it cannot coalesce to zero. So the authoritative
  // guard already fails CLOSED, and this block is advisory: it exists to tell a
  // buyer early, not to be the thing that holds. Where the application and the
  // database disagree about capacity, the database is right.
  //
  // THE COUNTER-ARGUMENT, so it is not rediscovered. Refusing here on a
  // transient read error would refuse a buyer the database would have accepted.
  // `.claude/rules/checkin-offline.md` records the asymmetry that decided it:
  // refusing a valid holder is worse than admitting a duplicate, because the
  // first happens in front of people. Note that the sibling read 300 lines up
  // (`:933-963`, the same table) DOES refuse — there the permissive direction
  // deletes a night that has sold tickets. Same shape, opposite blast radius.
  //
  // THE RESIDUAL, stated rather than hidden. Because this pre-check is
  // permissive and the real guard runs at webhook time — i.e. AFTER the money
  // moves — a payment can complete for a seat that is not there. That is
  // D-46-07: an accepted risk, taken by the owner with its cost in writing.
  // Nothing in this file makes that window visible to anyone today; the
  // deferred seat-reservation phase (hold the seat before payment) is its fix,
  // not a message. Until then, money can be taken and nobody knows.
  const tierQuery = supabase
    .from("ticket_tiers")
    .select("id, price, quantity, starts_at, expires_at")
    .eq("event_id", eventId)
    .order("price", { ascending: true });

  if (tier.party_id) {
    tierQuery.eq("party_id", tier.party_id);
  } else {
    tierQuery.is("party_id", null);
  }

  const { data: allTiers, error: allTiersError } = await tierQuery;

  if (allTiersError) {
    // COULD NOT COUNT. The tier list did not come back, so the whole block
    // below — chain status, sold-out test, the refusal at the end — does not
    // run. The purchase continues unchecked by the application and is checked
    // by `reserve_ticket` instead. One arm of what used to be a single silent
    // `if`, now named.
    logPurchasePrecheckUnreadable(PRECHECK_TIER_LIST_UNREADABLE, allTiersError);
  } else if (!allTiers || allTiers.length === 0) {
    // COUNTED ZERO. The read succeeded and this event/party genuinely has no
    // tier chain to validate. Nothing to do, and nothing has gone wrong.
  } else {
    const now = new Date();

    // Compute sold count for each tier
    const tierIds = allTiers.map((t) => t.id);
    const { data: soldCounts, error: soldCountsError } = await supabase
      .from("tickets")
      .select("tier_id")
      .in("tier_id", tierIds);

    const soldMap = new Map<string, number>();
    if (soldCountsError) {
      // COULD NOT COUNT. `soldMap` stays empty, so `soldMap.get(t.id) ?? 0`
      // below reads zero sold for EVERY tier and every tier computes as
      // available — including a tier that is in fact sold out. This is an
      // UNREAD count, not an empty one, and the difference is invisible from
      // the map alone: that is precisely why it is said here. Direction
      // unchanged on purpose (D-46-05, argued above).
      logPurchasePrecheckUnreadable(PRECHECK_SOLD_COUNT_UNREADABLE, soldCountsError);
    } else {
      // COUNTED. A tier absent from this map has genuinely sold nothing.
      for (const s of soldCounts ?? []) {
        soldMap.set(s.tier_id, (soldMap.get(s.tier_id) ?? 0) + 1);
      }
    }

    // Compute chain status
    type TierStatus = "coming_soon" | "available" | "sold_out" | "expired";
    const statusMap = new Map<string, TierStatus>();

    for (let i = 0; i < allTiers.length; i++) {
      const t = allTiers[i];
      const sold = soldMap.get(t.id) ?? 0;
      const available = t.quantity !== null ? t.quantity - sold : null;

      if (t.starts_at && now < new Date(t.starts_at)) {
        statusMap.set(t.id, "coming_soon");
        continue;
      }
      if (available !== null && available <= 0) {
        statusMap.set(t.id, "sold_out");
        continue;
      }
      if (t.expires_at && now >= new Date(t.expires_at)) {
        statusMap.set(t.id, "expired");
        continue;
      }
      const prev = i > 0 ? allTiers[i - 1] : null;
      if (prev) {
        const prevStatus = statusMap.get(prev.id)!;
        if (prevStatus !== "sold_out" && prevStatus !== "expired") {
          statusMap.set(t.id, "coming_soon");
          continue;
        }
      }
      statusMap.set(t.id, "available");
    }

    const requestedStatus = statusMap.get(tierId);
    if (requestedStatus !== "available") {
      throw new Error(
        `This ticket tier is not available (${requestedStatus ?? "unknown"})`
      );
    }
  }

  if (partyId) {
    // Verify party exists and belongs to same event
    const { data: party, error: partyError } = await supabase
      .from("event_parties")
      .select("id, event_id")
      .eq("id", partyId)
      .single();

    if (partyError || !party) {
      throw new Error("Sub-event not found");
    }

    if (party.event_id !== eventId) {
      throw new Error("Tier does not belong to this sub-event's event");
    }

    // Check user doesn't already have a ticket for this party
    const { data: existingTicket } = await supabase
      .from("tickets")
      .select("id")
      .eq("party_id", partyId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (existingTicket) {
      throw new Error("You already have a ticket for this sub-event");
    }
  } else {
    // Event-level master ticket: check duplicate
    const { data: existingTicket } = await supabase
      .from("tickets")
      .select("id")
      .eq("event_id", eventId)
      .is("party_id", null)
      .eq("user_id", user.id)
      .maybeSingle();

    if (existingTicket) {
      throw new Error("You already have an Event Pass for this event");
    }
  }

  // Fetch event details
  const { data: event, error: eventError } = await supabase
    .from("events")
    .select("title, slug")
    .eq("id", eventId)
    .single();

  if (eventError || !event) {
    throw new Error("Event not found");
  }

  // Discount validation (only for party-specific tiers with a discount code)
  let finalPrice = tier.price;
  let validatedDiscountCodeId: string | null = null;

  if (discountCodeId && partyId) {
    // Fetch and validate discount code
    const { data: code, error: codeError } = await supabase
      .from("discount_codes")
      .select("id, party_id, discount_type, discount_amount, max_uses, is_active")
      .eq("id", discountCodeId)
      .single();

    if (codeError || !code) throw new Error("Invalid discount code");
    if (!code.is_active) throw new Error("Discount code is no longer active");
    if (code.party_id !== partyId) throw new Error("Code not valid for this event");

    // Check tier applicability
    const { data: tierRestrictions } = await supabase
      .from("discount_code_tiers")
      .select("tier_id")
      .eq("discount_code_id", code.id);

    if (tierRestrictions && tierRestrictions.length > 0) {
      const applicableTierIds = tierRestrictions.map(t => t.tier_id);
      if (!applicableTierIds.includes(tierId)) {
        throw new Error("Code not valid for this tier");
      }
    }

    // Check usage limits
    if (code.max_uses !== null) {
      const { count, error: usageError } = await supabase
        .from("tickets")
        .select("*", { count: "exact", head: true })
        .eq("discount_code_id", code.id);
      if (usageError) {
        // COULD NOT COUNT. `count` is null, so `(count ?? 0) >= code.max_uses`
        // is false and the usage limit OPENS. Said plainly because the code
        // cannot say it on its own: this is an UNREAD count, not a code that
        // has never been used, and the two are indistinguishable downstream.
        //
        // The direction is deliberate and permissive for the same reason as
        // the two capacity reads — see the docblock over the chain-validation
        // block above (D-46-05, D-46-08). `reserve_ticket` re-validates
        // `max_uses` inside the transaction that reserves the seat, locking the
        // discount code `FOR UPDATE`, so the limit that actually holds is the
        // database's and it fails closed.
        logPurchasePrecheckUnreadable(PRECHECK_DISCOUNT_USAGE_UNREADABLE, usageError);
      }
      if ((count ?? 0) >= code.max_uses) throw new Error("Code usage limit reached");
    }

    // Compute discounted price
    if (code.discount_type === "percentage") {
      finalPrice = Math.round(tier.price * (1 - code.discount_amount / 100) * 100) / 100;
    } else {
      finalPrice = Math.round((tier.price - code.discount_amount) * 100) / 100;
    }

    // SumUp minimum EUR 1.00
    if (finalPrice < 1.00) {
      throw new Error("Discount would bring price below minimum (€1.00)");
    }

    validatedDiscountCodeId = code.id;
  }

  // Use one UUID as both the pending_purchases.id AND the SumUp checkout_reference,
  // so the post-3DS /payment/callback?purchase=<id> can find the record via DB lookup.
  const purchaseId = crypto.randomUUID();

  // Build webhook URL (return_url triggers SumUp webhook after payment)
  const returnUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/sumup`;

  // Build redirect URL for APM and 3DS flows
  const redirectUrl = new URL("/payment/callback", process.env.NEXT_PUBLIC_APP_URL);
  redirectUrl.searchParams.set("purchase", purchaseId);
  redirectUrl.searchParams.set("slug", event.slug);
  redirectUrl.searchParams.set("ctx", "ticket");

  // Create SumUp checkout
  const response = await createCheckout({
    amount: finalPrice,
    currency: "EUR",
    description: `${event.title} - ${tier.name}`,
    checkoutReference: purchaseId,
    returnUrl,
    redirectUrl: redirectUrl.toString(),
  });

  // Create pending purchase record using service-role client (bypass RLS)
  const serviceClient = getServiceClient();
  const { error: insertError } = await serviceClient
    .from("pending_purchases")
    .insert({
      id: purchaseId,
      event_id: eventId,
      party_id: partyId,
      tier_id: tierId,
      user_id: user.id,
      sumup_checkout_id: response.id,
      status: "pending",
      discount_code_id: validatedDiscountCodeId,
    });

  if (insertError) {
    console.error(`[tickets.pending_purchase_insert_failed] ${redactDbError(insertError)}`);
    throw new Error("Failed to initiate purchase");
  }

  return { success: true, checkoutId: response.id, purchaseId };
}

// =============================================================
// Drink Menu CRUD & Purchase
// =============================================================

/**
 * Fetch drink items for a party (or event if no partyId), ordered by sort_order.
 */
export async function getDrinkItems(eventId: string, partyId?: string): Promise<DrinkItem[]> {
  const supabase = await createClient();
  let query = supabase
    .from("drink_items")
    .select("*")
    .eq("event_id", eventId)
    .order("sort_order", { ascending: true });

  if (partyId) {
    query = query.eq("party_id", partyId);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to fetch drink items: ${error.message}`);
  }

  return data as DrinkItem[];
}

/**
 * Add a drink item to a party's menu.
 */
export async function addDrinkItem(
  eventId: string,
  name: string,
  price: number,
  partyId?: string
): Promise<DrinkItem> {
  const supabase = await createClient();
  await assertStaffManage();

  // Get next sort_order scoped to party
  let sortQuery = supabase
    .from("drink_items")
    .select("sort_order")
    .eq("event_id", eventId)
    .order("sort_order", { ascending: false })
    .limit(1);

  if (partyId) {
    sortQuery = sortQuery.eq("party_id", partyId);
  }

  const { data: existing } = await sortQuery;
  const nextOrder = existing && existing.length > 0 ? existing[0].sort_order + 1 : 0;

  const { data, error } = await supabase
    .from("drink_items")
    .insert({
      event_id: eventId,
      party_id: partyId ?? null,
      name: name.trim(),
      price,
      sort_order: nextOrder,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to add drink item: ${error.message}`);
  }

  revalidatePath("/admin/events");
  return data as DrinkItem;
}

/**
 * Update a drink item.
 */
export async function updateDrinkItem(
  itemId: string,
  data: { name?: string; price?: number; is_available?: boolean }
): Promise<void> {
  const supabase = await createClient();
  await assertStaffManage();

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (data.name !== undefined) updates.name = data.name.trim();
  if (data.price !== undefined) updates.price = data.price;
  if (data.is_available !== undefined) updates.is_available = data.is_available;

  const { error } = await supabase
    .from("drink_items")
    .update(updates)
    .eq("id", itemId);

  if (error) {
    throw new Error(`Failed to update drink item: ${error.message}`);
  }

  revalidatePath("/admin/events");
}

/**
 * Remove a drink item.
 */
export async function removeDrinkItem(itemId: string): Promise<void> {
  const supabase = await createClient();
  await assertStaffManage();

  const { error } = await supabase
    .from("drink_items")
    .delete()
    .eq("id", itemId);

  if (error) {
    throw new Error(`Failed to remove drink item: ${error.message}`);
  }

  revalidatePath("/admin/events");
}

/**
 * Reorder drink items by overwriting their sort_order with the array index.
 * Caller is expected to pass the full ordered list of ids for the same scope
 * (event_id + party_id) so the UI and DB stay in sync.
 */
export async function reorderDrinkItems(
  eventId: string,
  ids: string[]
): Promise<{ success: true }> {
  const supabase = await createClient();
  const ctx = await assertStaffManage();

  // This was the FIFTH copy of the ownership check — inline rather than named,
  // with the master case as an `if (!isMaster)` wrapper instead of a
  // short-circuit. Same truth table, a third shape. It is now the one shared
  // definition, which also gains the null-`created_by` refusal the inline form
  // never had: `event.created_by !== user.id` with a null owner and a real user
  // refused by luck, and would have ADMITTED had both been null.
  await assertEventOwnership(supabase, eventId, ctx);

  if (ids.length === 0) return { success: true };

  const serviceClient = getServiceClient();
  await Promise.all(
    ids.map((id, index) =>
      serviceClient
        .from("drink_items")
        .update({ sort_order: index })
        .eq("id", id)
        .eq("event_id", eventId)
    )
  );

  revalidatePath("/admin/events");
  return { success: true };
}

/**
 * Initiate a drink purchase via SumUp checkout.
 * Creates a drink_orders row and returns the checkout ID for card widget.
 */
export async function purchaseDrinks(
  eventId: string,
  partyId: string,
  items: { drinkItemId: string; quantity: number }[]
): Promise<{ success: boolean; checkoutId: string; orderId: string }> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error("Not authenticated");
  }

  if (!items || items.length === 0) {
    throw new Error("No items selected");
  }

  // Fetch drink items by IDs
  const drinkItemIds = items.map((i) => i.drinkItemId);
  const { data: drinkItems, error: fetchError } = await supabase
    .from("drink_items")
    .select("*")
    .in("id", drinkItemIds)
    .eq("event_id", eventId);

  if (fetchError) {
    throw new Error(`Failed to fetch drink items: ${fetchError.message}`);
  }

  if (!drinkItems || drinkItems.length !== drinkItemIds.length) {
    throw new Error("One or more drink items not found or do not belong to this event");
  }

  // Validate availability
  const drinkMap = new Map(drinkItems.map((d) => [d.id, d]));
  for (const item of items) {
    const drink = drinkMap.get(item.drinkItemId);
    if (!drink) {
      throw new Error(`Drink item not found: ${item.drinkItemId}`);
    }
    if (!drink.is_available) {
      throw new Error(`Drink "${drink.name}" is not currently available`);
    }
    if (item.quantity < 1) {
      throw new Error("Quantity must be at least 1");
    }
  }

  // Calculate total and build items snapshot
  let totalAmount = 0;
  const itemsSnapshot = items.map((item) => {
    const drink = drinkMap.get(item.drinkItemId)!;
    const lineTotal = drink.price * item.quantity;
    totalAmount += lineTotal;
    return {
      drink_item_id: drink.id,
      drink_name: drink.name,
      price: drink.price,
      quantity: item.quantity,
    };
  });

  // Fetch party name for checkout description
  const { data: party } = await supabase
    .from("event_parties")
    .select("title")
    .eq("id", partyId)
    .single();

  const itemsList = itemsSnapshot
    .map((i) => `${i.quantity}x ${i.drink_name}`)
    .join(", ");
  const description = party ? `${party.title} - ${itemsList}` : itemsList;

  // Use one UUID as both the drink_orders.id AND the SumUp checkout_reference,
  // so the post-3DS /payment/callback?order=<id> can find the order via DB lookup.
  const orderId = crypto.randomUUID();
  const returnUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/sumup`;

  // Fetch event slug for redirect URL
  const { data: eventForSlug } = await supabase
    .from("events")
    .select("slug")
    .eq("id", eventId)
    .single();

  // Build redirect URL for APM and 3DS flows
  const redirectUrl = new URL("/payment/callback", process.env.NEXT_PUBLIC_APP_URL);
  redirectUrl.searchParams.set("order", orderId);
  redirectUrl.searchParams.set("slug", eventForSlug?.slug ?? "");
  redirectUrl.searchParams.set("ctx", "drink");
  redirectUrl.searchParams.set("party", partyId);

  // Create SumUp checkout
  const response = await createCheckout({
    amount: totalAmount,
    currency: "EUR",
    description,
    checkoutReference: orderId,
    returnUrl,
    redirectUrl: redirectUrl.toString(),
  });

  // Create drink order using service client (bypass RLS)
  const serviceClient = getServiceClient();
  const { error: insertError } = await serviceClient
    .from("drink_orders")
    .insert({
      id: orderId,
      event_id: eventId,
      party_id: partyId,
      user_id: user.id,
      sumup_checkout_id: response.id,
      total_amount: totalAmount,
      status: "pending",
      items: itemsSnapshot,
    });

  if (insertError) {
    console.error(`[drinks.order_insert_failed] ${redactDbError(insertError)}`);
    throw new Error("Failed to initiate drink purchase");
  }

  return { success: true, checkoutId: response.id, orderId };
}

// =============================================================
// Drink Token Redemption
// =============================================================

export type DrinkTokenAction = "activate" | "serve" | "cancel";

/**
 * Two-step drink token flow for authenticated users:
 *   - "activate": purchased -> active (customer confirms intent to redeem)
 *   - "serve":    active -> redeemed  (bartender finalizes on customer's phone)
 *   - "cancel":   active -> purchased (customer cancels mid-activation)
 *
 * Verifies HMAC signature, ownership, refund/expiry, then dispatches to the
 * matching SECURITY DEFINER RPC.
 */
export async function redeemDrinkToken(
  signedToken: string,
  action: DrinkTokenAction
): Promise<{ success: true }> {
  // 1. Verify HMAC signature
  const tokenId = verifyTicketToken(signedToken);
  if (!tokenId) {
    throw new Error("Invalid token signature");
  }

  // 2. Verify user is authenticated
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error("Not authenticated");
  }

  // 3. Verify ownership and current status
  const { data: token, error: tokenError } = await supabase
    .from("drink_tokens")
    .select("id, user_id, status, party_id")
    .eq("id", tokenId)
    .single();

  if (tokenError || !token) {
    throw new Error("Token not found");
  }

  if (token.user_id !== user.id) {
    throw new Error("Not your token");
  }

  if (token.status === "refunded") {
    throw new Error("Token has been refunded");
  }

  if (token.status === "redeemed" && action !== "serve") {
    throw new Error("Already redeemed");
  }

  // 3b. Activation requires the menu/grace window to still be open
  if (action === "activate" && token.party_id) {
    const { data: party } = await supabase
      .from("event_parties")
      .select("date, end_time, menu_closes_at")
      .eq("id", token.party_id)
      .single();

    if (party) {
      const closeTime = party.menu_closes_at ?? party.end_time;
      if (closeTime && party.date) {
        const closeDt = menuCloseInstant(party.date, closeTime);
        const graceEnd = new Date(closeDt.getTime() + 60 * 60 * 1000);
        if (new Date() > graceEnd) {
          throw new Error("Token expired — grace period has ended");
        }
      }
    }
  }

  const rpcName =
    action === "activate"
      ? "activate_drink_token"
      : action === "serve"
        ? "redeem_drink_token"
        : "deactivate_drink_token";

  const serviceClient = getServiceClient();
  const { data: applied, error: rpcError } = await serviceClient.rpc(rpcName, {
    p_token_id: tokenId,
  });

  if (rpcError) {
    throw new Error(rpcError.message);
  }

  // All three RPCs return false when they did nothing because the token was
  // already in the target state. Discarding that boolean is how a second press
  // pours a second drink: no error is raised, so the caller reports success and
  // the screen says SERVED again.
  if (applied === false) {
    throw new Error(
      action === "serve"
        ? "This token has already been served"
        : action === "activate"
          ? "This token is already active"
          : "This token is not active"
    );
  }

  return { success: true };
}

/**
 * Le due decisioni su una richiesta di rimborso di un drink (`DRK-03`,
 * `DRK-05b`).
 *
 * ── Perche' esistono, quando `DRK-05` rimborsa gia' da solo ─────────────────
 *
 * `DRK-05` copre un caso: token **mai attivato**. Ogni altro — attivato e poi
 * annullato, una volta o quattro — arriva qui, e ci arriva **con il suo
 * conteggio**. Non e' un sospetto: quattro attivazioni possono essere quattro
 * ripensamenti in una fila lunga. E' una cosa che prima non si poteva sapere.
 *
 * ── E la richiesta non viene MAI respinta automaticamente ───────────────────
 *
 * Un rifiuto automatico e' un rimborso automatico con il segno cambiato, e la
 * decisione del proprietario del 2026-08-19 riguarda **entrambi i segni**:
 * *«solo un admin o un organizer possono emettere rimborsi, in casi specifici
 * visionati di persona»*. Nessun ramo qui chiude una richiesta senza una persona.
 */
export type DrinkRefundDecision =
  | { ok: true }
  | { ok: false; message: string };

/**
 * Accogliere: emette il rimborso e chiude la richiesta.
 *
 * La regola del denaro vale identica al percorso automatico: il codice di
 * transazione **si rilegge dal checkout**, non si prende per buono quello
 * memorizzato — quel campo lo ha scritto un webhook.
 */
export async function approveDrinkRefund(
  tokenId: string
): Promise<DrinkRefundDecision> {
  const { capabilities, userId } = await getAccessContext();
  if (!capabilities.has(CAP.STAFF_MANAGE)) {
    return { ok: false, message: "Non hai i permessi per emettere un rimborso." };
  }

  const service = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );

  const { data: token } = await service
    .from("drink_tokens")
    .select("id, status, price, order_id, event_id")
    .eq("id", tokenId)
    .single();

  if (!token) return { ok: false, message: "Questo drink non esiste più." };
  if (token.status === "refunded")
    return { ok: false, message: "Questo drink risulta già rimborsato." };

  const { data: order } = await service
    .from("drink_orders")
    .select("sumup_checkout_id, sumup_transaction_code, refunded_amount")
    .eq("id", token.order_id)
    .single();

  if (!order?.sumup_checkout_id)
    return { ok: false, message: "L'ordine non ha un pagamento a cui agganciare il rimborso." };

  try {
    const checkout = await getCheckout(order.sumup_checkout_id);
    const txCode =
      checkout.transactions?.[0]?.transaction_code ??
      order.sumup_transaction_code ??
      null;
    if (!txCode)
      return { ok: false, message: "SumUp non riporta una transazione per questo ordine." };

    const amount = Math.round(Number(token.price) * 100) / 100;
    await refundTransaction(txCode, amount);

    await service
      .from("drink_tokens")
      .update({ status: "refunded", refunded_at: new Date().toISOString() })
      .eq("id", tokenId);

    await service
      .from("drink_orders")
      .update({ refunded_amount: Number(order.refunded_amount ?? 0) + amount })
      .eq("id", token.order_id);

    await service
      .from("drink_refund_request")
      .update({
        status: "approved",
        decided_at: new Date().toISOString(),
        decided_by: userId,
      })
      .eq("token_id", tokenId);

    revalidatePath(`/admin/events/${token.event_id}/drinks`);
    return { ok: true };
  } catch (err) {
    logMoneyPathFailure("drink refund approve", {
      code: null,
      message: err instanceof Error ? err.message : null,
    });
    return {
      ok: false,
      message: "Il rimborso non è partito. Il drink non risulta rimborsato: riprova o falla a mano su SumUp.",
    };
  }
}

/**
 * Respingere: chiude la richiesta con una nota, e **non muove denaro**.
 *
 * Nessuna chiamata a `refundTransaction` compare in questa funzione, ed e'
 * l'unica cosa che la distingue davvero da quella sopra.
 */
export async function rejectDrinkRefund(
  tokenId: string,
  note?: string
): Promise<DrinkRefundDecision> {
  const { capabilities, userId } = await getAccessContext();
  if (!capabilities.has(CAP.STAFF_MANAGE)) {
    return { ok: false, message: "Non hai i permessi per decidere su un rimborso." };
  }

  const service = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );

  const { error } = await service
    .from("drink_refund_request")
    .update({
      status: "rejected",
      decided_at: new Date().toISOString(),
      decided_by: userId,
      decision_note: note?.trim() || null,
    })
    .eq("token_id", tokenId)
    .eq("status", "pending");

  if (error) {
    logMoneyPathFailure("drink refund reject", error);
    return { ok: false, message: "Non siamo riusciti a registrare la decisione." };
  }

  return { ok: true };
}
