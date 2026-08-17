"use server";

import { revalidatePath } from "next/cache";

import { CAP } from "@/lib/capabilities/keys";
import { getAccessContext } from "@/lib/capabilities/server";
import { getServiceClient } from "@/lib/supabase/service";

import {
  ANSWERS_SOURCE,
  ATTRIBUTE_KEYS,
  ATTRIBUTE_PROVENANCE,
  ATTRIBUTE_VALUES,
  EXIT_REASONS,
  SIZE_BANDS,
  SPACE_CATEGORIES,
  VENUE_STAGES,
  type AnswersSource,
  type AttributeKey,
  type AttributeProvenance,
  type AttributeValue,
  type ExitReason,
  type ExtendedHoursStance,
  type SizeBand,
  type VenueStage,
} from "@/lib/production/sections/vocabulary";

/**
 * The location section's write paths — the first thing in this product that can
 * move a scouted space.
 *
 * ── The governing fact, and it is the reason every export below is shaped the
 *    way it is ────────────────────────────────────────────────────────────────
 *
 * The section holds 184 spaces and 1 840 attributes, **every one of them at the
 * lowest stage, every one of them derived, and the three columns a telephone
 * call closes are all at their default**. Nobody has been called. So the whole
 * of what this module does is let somebody record that something happened in the
 * world — and the entire risk is that it lets them record that something
 * happened when it did not.
 *
 * `venue-acquisition.md` puts it as a gate: mapped ≠ verified ≠ contacted ≠
 * acquired, and **acquired means in writing, not *they said yes on the phone***.
 * That is why no export here takes a stage as a create-time argument, why the
 * one that changes a stage refuses `acquired` without a pointer to the writing,
 * why every value arrives with its provenance, and why the column that says
 * whether a venue will discuss late hours has **no reachable path off its
 * unasked value except a person typing one of two words**.
 *
 * ── Why the gate is asked here, and it is not belt-and-braces ────────────────
 *
 * A Server Action is a **public endpoint with a convenient signature**. Every
 * export below is invocable directly, with a forged body, by anybody who can
 * reach the deployment; being imported from a page a capability opened protects
 * none of it (`nextjs-architecture.md`, gate *server action autorizzata*). The
 * gate is called FIRST in each export and the service client is constructed
 * AFTER it — an ordering slip turns an act into an unauthenticated write path,
 * and no build would see it.
 *
 * The gate is **not exported**, for the reason `calendar/actions.ts:78-82`
 * gives: every export of a `"use server"` module is an endpoint, and a helper is
 * not one.
 *
 * ── Why the SERVICE client, with the proof that no untrusted input reaches it ─
 *
 * `20260817120300_production_sections_access.sql` gives `production_space` and
 * `production_space_attribute` a `SELECT` arm and **no write arm at all**. With
 * row level security enabled and no other arm, every session — anonymous,
 * authenticated, a master's — is refused a write on them through PostgREST. The
 * service client is therefore not a preference: it is the only client that can
 * write here.
 *
 * `access-gating.md` requires a new service-client use to be justified in
 * writing and to prove that no untrusted input reaches it. Every identifier
 * below is shape-checked against the identifier pattern **before** any query;
 * every closed-set value is checked for membership of the tuple that mirrors its
 * SQL `CHECK`; nothing is concatenated into a query and every value travels as a
 * parameter.
 *
 * The uncomfortable corollary, written here rather than left to be discovered:
 * **if the gate below is removed, nothing underneath refuses.**
 *
 * ── Every refusal is a RETURNED value ───────────────────────────────────────
 *
 * Next **redacts** the message of an error thrown out of a Server Action in a
 * production build (`src/lib/capabilities/server.ts:59-63`), so a cause carried
 * in a thrown message works under `next dev` and reaches the reader as a blank
 * exactly where it counts. A refusal nobody can read is a silent failure
 * (`meta-gates.md`), and this product has **no error tracking at all**. So every
 * failure below is a value with its own name, one per distinguishable cause, and
 * the only two throws in this file are the gate's two categories.
 *
 * ── What is logged, and the one field that is never touched ─────────────────
 *
 * The error's code and its message, and nothing else. Never the error object,
 * and never PostgREST's third field — the one it fills with the **entire
 * rejected row**. A row of `production_space` carries a name that may name a
 * space under negotiation and a **street address**, so a refusal that handed the
 * row back would be a self-inflicted disclosure by the module written to control
 * the reading of it, into logs nobody watches. The field's name is deliberately
 * not spelled anywhere here, for the reason `formats/actions.ts:58-63` gives
 * about its own forbidden literal: a grep whose only match is the sentence
 * forbidding the thing is a grep that gets ignored the third time it goes red.
 *
 * **And never a space's name and never its address.** A diagnostic carries an
 * identifier, and an identifier names nothing to anybody who is not already
 * entitled to look it up.
 *
 * ── There is no delete export, and there will not be one ────────────────────
 *
 * D-45-13, and `venue-acquisition.md`'s gate *fuori identità resta visibile*: a
 * space discarded because it contradicts the identity stays in the list, at
 * zero, forever. Deleting it loses the memory of the choice, and the choice then
 * gets remade from scratch at the first difficulty by somebody who was not in the
 * room. Leaving the race is a **state** — `exitSpace` below — and the pair it
 * writes is inseparable in the database.
 *
 * The database says the same thing from underneath: the attribute table's
 * foreign key is `ON DELETE RESTRICT`, and none of the nine foreign keys this
 * phase added carries a cascade. A removal here would be refused rather than
 * silently propagated, and that shape is exactly what took 63 rows out of seven
 * tables in phase 36.
 *
 * ── Two tensions this module does not resolve, and names instead ────────────
 *
 *  1. **`exit_reason` sits on the SPACE while the domain reads suitability per
 *     FORMAT.** `venue-acquisition.md`'s gate *lo spazio giusto per il format
 *     sbagliato* is explicit that a space perfect for one format can be out of
 *     identity for another, so a verdict is read per format and never as an
 *     absolute judgement of the place. The column cannot say that. Plan 45-07
 *     declared the tension and left it open because closing it is a schema
 *     decision; this module does not close it either, and `exitSpace` refuses to
 *     take a format argument it could not store. What it does instead is refuse
 *     to let the copy pretend: the surface says the reason is recorded against
 *     the space, for every format at once.
 *
 *  2. **`answers_source` is ONE column for FOUR answers.** Recording a rig by
 *     telephone and a closing time off a public listing cannot both be true in
 *     this schema: the second write restates the source of all four. So the
 *     argument is required on every call, the surface draws ONE control for the
 *     group rather than one beside each answer, and the sentence beside it says
 *     that saving any answer restates the source of all four.
 *
 * ── Nothing here says what a format sounds like ─────────────────────────────
 *
 * Not in a message, not in a comment (`sound-manifesto.md`). And no space name,
 * no address and no contact reaches a `console.*`, a thrown message or a
 * returned value.
 */

/* ────────────────────────────────────────────────────────────────────────────
 * The gate — asked once per export, and deliberately not exported
 * ──────────────────────────────────────────────────────────────────────────── */

/**
 * Shape copied from `calendar/actions.ts:128-146`, including the two separate
 * throw categories: an unresolvable identity is **not** a refusal on the merits
 * — it means the migration that put the caller's id in the payload is not
 * applied — and collapsing the two is the pattern `meta-gates.md` forbids.
 *
 * It returns the context it resolved, so no export re-asks. `cache()` does not
 * memoise inside a Server Action body (`capabilities/server.ts:104-116`,
 * measured in phase 33), so a second call is a second full round trip and no
 * compiler sees it: **more than one `await assertLocationSection(` in one export
 * is the defect.**
 *
 * @throws `forbidden.production_location_manage_required` — the answer is no.
 * @throws `capabilities.identity_missing` — the payload carried no caller id.
 */
async function assertLocationSection(): Promise<{ userId: string }> {
  const { capabilities, userId } = await getAccessContext();

  if (!capabilities.has(CAP.PRODUCTION_LOCATION_MANAGE)) {
    throw new Error("forbidden.production_location_manage_required");
  }

  if (!userId) {
    console.error(
      "[location.identity_missing] space=none " +
        "code=identity_missing message=a caller holds the location key and the " +
        "access context resolved no caller id. This is NOT a refusal on the " +
        "merits — the migration that adds the caller to the payload is not applied."
    );
    throw new Error("capabilities.identity_missing");
  }

  return { userId };
}

/** The same shape as `formats/actions.ts:111-113`. */
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** The one client this module uses, named so the helpers can be typed. */
type LocationClient = ReturnType<typeof getServiceClient>;

/* ────────────────────────────────────────────────────────────────────────────
 * The refusals — one value per distinguishable cause, and no shared bucket
 * ──────────────────────────────────────────────────────────────────────────── */

/**
 * Every way any act below can be refused.
 *
 * There is no shared *something went wrong*. The recorded precedent in this
 * repository is the newsletter form collapsing a network fault, a missing key
 * and an address already subscribed into one indebuggable message
 * (`.planning/codebase/CONCERNS.md`), and this product has **no error tracking**
 * — so the returned value is the only place a refusal exists for a human.
 */
export type LocationRefusal =
  /**
   * An identifier that is not a uuid. Nothing was asked of the database.
   *
   * Not a formality: these arguments arrive on an untrusted POST, and PostgREST
   * answers a malformed uuid with a code that says nothing about which argument
   * was wrong.
   */
  | "invalid_id"
  /**
   * A space with no name.
   *
   * Refused rather than filled: a row called *Untitled* is a row nobody can find
   * again, and the name is the only handle the list has. Separate from
   * `write_failed` because nothing was attempted.
   */
  | "name_missing"
  /**
   * A category outside the eleven.
   *
   * Its own code rather than folded into a general *bad argument*, because the
   * next step differs: the eleven are a closed set mirrored by a SQL `CHECK`, and
   * a twelfth arriving here means a tuple and a constraint have parted company.
   */
  | "invalid_category"
  /** A capacity band outside the four. Same reading as the category above. */
  | "invalid_size_band"
  /**
   * The hours the venue keeps, submitted blank.
   *
   * The column refuses a blank by constraint, and the reason is the one the
   * whole unasked-marker family exists for: *nobody has asked* and *somebody
   * asked and wrote nothing down* are different facts, and a blank cannot tell
   * them apart. Clearing the field is not the same act as never having asked, so
   * it is refused rather than quietly turned back into the sentinel.
   */
  | "published_hours_blank"
  /**
   * An attribute key outside the ten. Nothing was written.
   *
   * Distinct from `invalid_value` below because they send a reader to different
   * places: this one says the caller named a column of the domain that does not
   * exist, the other says a known column was given a word outside its set.
   */
  | "invalid_attribute"
  /** An attribute value outside the five. */
  | "invalid_value"
  /**
   * An attribute value arrived without saying whether it was read off a profile
   * or checked on the ground.
   *
   * `venue-acquisition.md`, gate *derivato non è verificato*: a value read off a
   * public profile is a HYPOTHESIS, one checked on site for that format is a
   * DATUM, and a computed suitability is only as verified as its weakest input.
   * The database column has **no default** so that a value cannot exist without
   * saying which it is; this is that rule met one layer earlier, where it can be
   * reported as a sentence instead of as an anonymous constraint violation.
   */
  | "provenance_missing"
  /**
   * A phone answer arrived without saying how it was obtained — absent, outside
   * the four, or the unasked marker, which is not a way of obtaining an answer.
   *
   * *Until 01:00 according to the venue's public page* and *until 01:00 because
   * they said so on the phone* are DIFFERENT FACTS, and only one of them can
   * carry a night that ends at six. A public listing answers the question a
   * wedding reception asks.
   */
  | "answers_source_missing"
  /**
   * The answer itself was not the shape its question takes — a capacity that is
   * not a positive whole number, a closing time that is not a civil time, a
   * guest-dj answer that is not a boolean.
   *
   * Separate from `answers_source_missing`: there, the answer was fine and its
   * provenance was not; here, there is no answer to attribute.
   */
  | "invalid_answer"
  /** A stage outside the four declared words. */
  | "invalid_stage"
  /**
   * A late-hours stance that is neither *will discuss* nor *will not discuss*.
   *
   * The unasked marker is deliberately **not** accepted, and its own reason is
   * the strongest prohibition in this section: that column is absent from every
   * source BY NATURE, because it is not published anywhere. It is not a fact
   * about the place; it is the answer to a phone call. Writing the marker back
   * would be the one act that could make a recorded call look like it never
   * happened.
   */
  | "invalid_stance"
  /** An exit reason outside the four. */
  | "invalid_exit_reason"
  /**
   * An exit that carries a reason and no date, or a date the calendar cannot
   * read.
   *
   * The database makes the pair inseparable by constraint; this says so as a
   * sentence, because *an exit with no date* is a thing a person can fix and an
   * anonymous constraint violation is not.
   */
  | "exit_date_missing"
  /**
   * A move to `acquired` with no line saying where the agreement is.
   *
   * **Acquired means in writing**, and it is the stage that unlocks naming the
   * space in a material. The constraint
   * `production_space_acquired_needs_evidence` refuses the row; this refuses the
   * call first, so the person reads a sentence about the rule rather than a code
   * about a row. The code is the sentence, the constraint is the boundary, and
   * neither substitutes for the other.
   */
  | "agreement_evidence_missing"
  /**
   * The space has already been crossed into the venue list, so its stage cannot
   * leave `acquired`.
   *
   * `production_space_promotion_needs_acquired` is the rule. Its own code
   * because the next step is a real one and it is not on this surface: the
   * crossing has to be undone first, in the list a night's venue is chosen from.
   */
  | "promoted_cannot_leave_acquired"
  /**
   * The free-text prose carried something the destination column declares it
   * does not hold — an email address or a mobile number.
   *
   * ⚠ **This is a refusal and NOT a redaction**, and the difference is the whole
   * of it. 35 records in the local archive carry a contact inside their free
   * prose (DEF-45-05, still open and the owner's to close); the seed withheld the
   * whole field on those and counted the refusal rather than masking it, because
   * a redaction that fails silently is worse than a refusal somebody can see.
   * This holds that line on the way in.
   *
   * **Its limit, stated rather than implied:** it recognises the two shapes
   * measured in the archive. It is a guard, not a guarantee, and nothing here
   * claims a field that passed it is free of a contact.
   */
  | "note_carries_contact"
  /** No space carries that id, or the reader is not entitled to it. */
  | "space_not_found"
  /**
   * The space left the race, so it is not edited any further.
   *
   * It is **not** deleted and it is still on the list — that is the point of an
   * exit being a state. But a record of a decision that keeps being edited stops
   * being a record of it, and *fuori identità resta visibile* is about keeping
   * the memory of the choice, not about keeping the row workable.
   */
  | "space_exited"
  /** The space has already left the race. Nothing was written a second time. */
  | "already_exited"
  /**
   * A read that had to happen before the write could not be performed.
   *
   * **Nothing was written.** Distinct from `write_failed` because the two say
   * different things about the state of the world, and the difference decides
   * whether pressing again is safe.
   */
  | "read_failed"
  /** The write was attempted and refused. Nothing was written. */
  | "write_failed";

/** What a refused call answers. */
export interface LocationFailure {
  readonly ok: false;
  readonly reason: LocationRefusal;
}

/** What a completed creation answers — the id, and nothing about the space. */
export type CreateSpaceResult =
  | { readonly ok: true; readonly spaceId: string }
  | LocationFailure;

/** What every other completed act answers. */
export type LocationWriteResult =
  | { readonly ok: true }
  | LocationFailure;

/* ────────────────────────────────────────────────────────────────────────────
 * The shape checks, each performed BEFORE anything is asked of the database
 * ──────────────────────────────────────────────────────────────────────────── */

/** Membership of a tuple that mirrors a SQL `CHECK`, as a type guard. */
function isMember<T extends string>(
  tuple: readonly T[],
  value: unknown
): value is T {
  return typeof value === "string" && (tuple as readonly string[]).includes(value);
}

/**
 * A free-text field, trimmed, with the empty string read as an absence.
 *
 * A form submits an untouched field as `""`, and an empty string stored in a
 * nullable column is a value that looks like an answer to every reader and to
 * every query. The columns this feeds are nullable precisely so that *not
 * written* has a representation.
 */
function optionalText(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

/**
 * The two contact shapes measured in the local archive, and nothing more.
 *
 * ⚠ **A guard, not a guarantee.** It recognises an email address and an Italian
 * mobile number because those are what DEF-45-05 counted — 15 and 20 records —
 * and it will not recognise a number written some other way. It exists so that
 * the obvious paste is refused loudly rather than stored quietly; it does not
 * license anybody to believe a field that passed it is clean.
 *
 * It **never edits the value**. A silent redaction would leave a field that
 * looks intact and is not, in a column whose own comment declares it holds
 * criteria and observation only.
 */
const EMAIL_SHAPE = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/;
const ITALIAN_MOBILE_SHAPE = /(?:\+?39[\s.-]?)?3\d{2}[\s.-]?\d{3}[\s.-]?\d{3,4}/;

function carriesContact(value: string | null): boolean {
  if (value === null) return false;
  return EMAIL_SHAPE.test(value) || ITALIAN_MOBILE_SHAPE.test(value);
}

/** `HH:MM` on a 24-hour clock, which is the shape the surface can draw. */
const CIVIL_TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

/** A calendar date, which is all an exit needs — an exit has no hour. */
const CIVIL_DATE_PATTERN = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

/* ────────────────────────────────────────────────────────────────────────────
 * The one read every write performs first
 * ──────────────────────────────────────────────────────────────────────────── */

/** The three columns a write has to know about before it writes. */
interface SpaceGuardRow {
  readonly id: string;
  readonly stage: VenueStage;
  readonly exited_at: string | null;
  readonly promoted_venue_id: string | null;
}

/**
 * The space, read for the three facts that decide whether a write may happen:
 * whether it exists, whether it left the race, and whether it has been crossed
 * into the venue list.
 *
 * It reads through the service client, like the write that follows it, and that
 * is deliberate: a pre-check performed with a client the write does not use is a
 * pre-check about a different question. The entitlement was settled by the gate.
 *
 * ⚠ It does **not** read the name or the address. A guard has no use for either,
 * and a value that is never loaded is a value that cannot reach a log.
 */
async function loadSpace(
  client: LocationClient,
  spaceId: string
): Promise<{ ok: true; space: SpaceGuardRow } | LocationFailure> {
  const { data, error } = await client
    .from("production_space")
    .select("id, stage, exited_at, promoted_venue_id")
    .eq("id", spaceId)
    .maybeSingle();

  if (error) {
    console.error(
      `[location.space_read_failed] space=${spaceId} code=${error.code ?? "unknown"} message=${error.message}`
    );
    return { ok: false, reason: "read_failed" };
  }

  if (data === null) {
    return { ok: false, reason: "space_not_found" };
  }

  return { ok: true, space: data as unknown as SpaceGuardRow };
}

/**
 * Both surfaces of the section, by their route patterns.
 *
 * The dynamic one takes the pattern with the `"page"` kind, so every space is
 * covered without naming one — and naming one here would put an identifier in a
 * call for no gain. Both pages are `force-dynamic` today, so this changes
 * nothing observable; it is written so the reason survives a refactor that lets
 * either of them be cached.
 */
function revalidateSection() {
  revalidatePath("/admin/location/[id]", "page");
  revalidatePath("/admin/location");
}

/* ────────────────────────────────────────────────────────────────────────────
 * WRITE ONE — a space enters the list, at the bottom
 * ──────────────────────────────────────────────────────────────────────────── */

/** What a new space may carry. There is deliberately no stage among them. */
export interface NewSpaceInput {
  readonly name?: unknown;
  readonly category?: unknown;
  readonly address?: unknown;
  readonly source?: unknown;
  readonly shortDescription?: unknown;
  readonly note?: unknown;
}

/**
 * Put a space on the list.
 *
 * ⚠ **This act takes no stage, and the absence is the design.** A new row is
 * `mapped` by the column's own default, which is the LOWEST member — and that is
 * what makes a default safe here: it can never manufacture progress. A create
 * that could set a stage is a create that can encode *ranking-is-not-
 * availability* in one field, and the row would arrive carrying the authority of
 * a database column. Moving a stage is its own act, with its own evidence
 * (`changeStage` below).
 *
 * The act of entering this list **is** the mapping. There is no such thing as a
 * scouted space at an unknown stage, which is why the column is `NOT NULL` here
 * and nullable on the calendar's own stage column, where null means *not
 * recorded*.
 *
 * `source_key` is left null on purpose: it is the idempotence key of the local
 * import, and a space typed here came from no import. Two nulls are distinct in
 * Postgres, so many hand-typed rows coexist — and inventing a key would invent
 * one the next import can collide with.
 */
export async function createSpace(
  input: NewSpaceInput
): Promise<CreateSpaceResult> {
  // Asked FIRST, and once. The client is constructed after it, never before.
  const { userId } = await assertLocationSection();

  const name = optionalText(input?.name);
  if (name === null) {
    return { ok: false, reason: "name_missing" };
  }

  const category = optionalText(input?.category);
  if (category !== null && !isMember(SPACE_CATEGORIES, category)) {
    return { ok: false, reason: "invalid_category" };
  }

  const address = optionalText(input?.address);
  const source = optionalText(input?.source);
  const shortDescription = optionalText(input?.shortDescription);
  const note = optionalText(input?.note);

  if (carriesContact(shortDescription) || carriesContact(note)) {
    return { ok: false, reason: "note_carries_contact" };
  }

  const client = getServiceClient();

  const { data, error } = await client
    .from("production_space")
    .insert({
      name,
      category,
      address,
      source,
      short_description: shortDescription,
      note,
      created_by: userId,
    })
    .select("id")
    .single();

  if (error || !data) {
    console.error(
      `[location.create_failed] space=none code=${error?.code ?? "unknown"} message=${error?.message ?? "no row returned"}`
    );
    return { ok: false, reason: "write_failed" };
  }

  revalidateSection();

  return { ok: true, spaceId: (data as unknown as { id: string }).id };
}

/* ────────────────────────────────────────────────────────────────────────────
 * WRITE TWO — the descriptive record
 * ──────────────────────────────────────────────────────────────────────────── */

/** The descriptive fields, and the address. No stage, no answer, no attribute. */
export interface SpaceRecordInput {
  readonly name?: unknown;
  readonly category?: unknown;
  readonly address?: unknown;
  readonly source?: unknown;
  readonly shortDescription?: unknown;
  readonly note?: unknown;
  readonly sizeBand?: unknown;
  readonly publishedHours?: unknown;
}

/**
 * Correct what the record says about a space.
 *
 * ⚠ **The capacity band is here and the numeric capacity is not.** A band is not
 * a capacity and nothing may infer one from the other: the target for a night is
 * 150 to 300 people, and a band cannot answer whether a given room is inside it.
 * The number is one of the four questions and is closed by somebody standing in
 * the room, so it is written by `recordAnswer` with a source attached — never
 * here, where it would arrive as a descriptive edit with no provenance.
 *
 * ⚠ **The hours the venue keeps are here; whether it will discuss later ones is
 * not.** The first is a published fact and may be researched. The second is not
 * published anywhere and has its own act, which cannot be reached by inference.
 *
 * The address is a field on this form, and it is the one value on this surface
 * that is a street address rather than a shorthand. It reaches the database and
 * nothing else: no log, no returned value, no message.
 */
export async function updateSpace(
  spaceId: string,
  input: SpaceRecordInput
): Promise<LocationWriteResult> {
  await assertLocationSection();

  if (typeof spaceId !== "string" || !UUID_PATTERN.test(spaceId)) {
    return { ok: false, reason: "invalid_id" };
  }

  const name = optionalText(input?.name);
  if (name === null) {
    return { ok: false, reason: "name_missing" };
  }

  const category = optionalText(input?.category);
  if (category !== null && !isMember(SPACE_CATEGORIES, category)) {
    return { ok: false, reason: "invalid_category" };
  }

  const sizeBand = optionalText(input?.sizeBand);
  if (sizeBand !== null && !isMember(SIZE_BANDS, sizeBand)) {
    return { ok: false, reason: "invalid_size_band" };
  }

  // The column is `NOT NULL` with a sentinel default and a not-blank constraint.
  // A cleared field is not the same act as never having asked, so it is refused
  // rather than turned back into the sentinel on the caller's behalf.
  const publishedHours = optionalText(input?.publishedHours);
  if (publishedHours === null) {
    return { ok: false, reason: "published_hours_blank" };
  }

  const address = optionalText(input?.address);
  const source = optionalText(input?.source);
  const shortDescription = optionalText(input?.shortDescription);
  const note = optionalText(input?.note);

  if (carriesContact(shortDescription) || carriesContact(note)) {
    return { ok: false, reason: "note_carries_contact" };
  }

  const client = getServiceClient();

  const guard = await loadSpace(client, spaceId);
  if (!guard.ok) return guard;
  if (guard.space.exited_at !== null) {
    return { ok: false, reason: "space_exited" };
  }

  const { error } = await client
    .from("production_space")
    .update({
      name,
      category,
      address,
      source,
      short_description: shortDescription,
      note,
      size_band: sizeBand as SizeBand | null,
      published_hours: publishedHours,
      updated_at: new Date().toISOString(),
    })
    .eq("id", spaceId);

  if (error) {
    console.error(
      `[location.update_failed] space=${spaceId} code=${error.code ?? "unknown"} message=${error.message}`
    );
    return { ok: false, reason: "write_failed" };
  }

  revalidateSection();

  return { ok: true };
}

/* ────────────────────────────────────────────────────────────────────────────
 * WRITE THREE — one of the four questions a telephone closes
 * ──────────────────────────────────────────────────────────────────────────── */

/**
 * One of the four answers, as the question that produced it.
 *
 * A discriminated union rather than four nullable fields: the four questions
 * have four different shapes — a description, a whole number, a yes-or-no and a
 * civil time — and a shape that could carry all four at once would be a shape in
 * which three of them are always absent, which is indistinguishable from three
 * of them being cleared.
 */
export type PhoneAnswer =
  /** What rig is there. A description somebody was given, not a value from a set. */
  | { readonly question: "rig"; readonly rig: unknown }
  /** How many people actually fit. Only somebody standing in the room closes it. */
  | { readonly question: "real_capacity"; readonly capacity: unknown }
  /** Whether a guest dj may play. */
  | { readonly question: "guest_dj_allowed"; readonly allowed: unknown }
  /** Until what hour one may play — the question that screens out the most. */
  | { readonly question: "closing_time"; readonly closingTime: unknown };

/**
 * Record one of the four answers, together with how it was obtained.
 *
 * ── `answersSource` is required, and it is not a default ────────────────────
 *
 * `venue-acquisition.md` names the four questions and says the last screens out
 * the most candidates, precisely because the published answer LOOKS like an
 * answer and is not one: a listing that says *dj and live music* is answering
 * what a wedding reception asks, not what a night that ends at six asks. So the
 * source travels with the answer, always, and the unasked marker is refused —
 * it is the absence of an answer and cannot be the way one was obtained.
 *
 * ⚠ **The column is shared by all four answers**, and this act therefore
 * restates the source of the other three. That is a property of the schema and
 * not of this module; the surface says so beside the one control it draws for
 * the group. Recording a rig by telephone and a closing time off a listing is
 * not representable here, and pretending otherwise with four controls over one
 * column would be the lie.
 */
export async function recordAnswer(
  spaceId: string,
  answer: PhoneAnswer,
  answersSource: AnswersSource
): Promise<LocationWriteResult> {
  await assertLocationSection();

  if (typeof spaceId !== "string" || !UUID_PATTERN.test(spaceId)) {
    return { ok: false, reason: "invalid_id" };
  }

  // The unasked marker is a member of the tuple and is refused here anyway: it
  // is how the column says NOBODY ANSWERED, so it cannot be how an answer
  // arrived. Its own reading, and the same code as an absent one — both mean
  // there is no provenance to attach.
  if (
    !isMember(ANSWERS_SOURCE, answersSource) ||
    answersSource === "not_asked"
  ) {
    return { ok: false, reason: "answers_source_missing" };
  }

  const patch: Record<string, unknown> = {
    answers_source: answersSource,
    updated_at: new Date().toISOString(),
  };

  switch (answer?.question) {
    case "rig": {
      const rig = optionalText(answer.rig);
      if (rig === null) return { ok: false, reason: "invalid_answer" };
      if (carriesContact(rig)) {
        return { ok: false, reason: "note_carries_contact" };
      }
      patch.rig = rig;
      break;
    }
    case "real_capacity": {
      // A capacity of zero is not a small room; it is a field somebody cleared,
      // and the constraint says so too.
      const capacity =
        typeof answer.capacity === "number"
          ? answer.capacity
          : Number(optionalText(answer.capacity));
      if (!Number.isInteger(capacity) || capacity <= 0) {
        return { ok: false, reason: "invalid_answer" };
      }
      patch.real_capacity = capacity;
      break;
    }
    case "guest_dj_allowed": {
      if (typeof answer.allowed !== "boolean") {
        return { ok: false, reason: "invalid_answer" };
      }
      patch.guest_dj_allowed = answer.allowed;
      break;
    }
    case "closing_time": {
      // 24-hour civil time and never an instant: a night runs 22:00 to 06:00, so
      // this value is legitimately SMALLER than the hour a night starts, and a
      // conversion that moved it across midnight would move a weekday.
      const closingTime = optionalText(answer.closingTime);
      if (closingTime === null || !CIVIL_TIME_PATTERN.test(closingTime)) {
        return { ok: false, reason: "invalid_answer" };
      }
      patch.closing_time = closingTime;
      break;
    }
    default:
      return { ok: false, reason: "invalid_answer" };
  }

  const client = getServiceClient();

  const guard = await loadSpace(client, spaceId);
  if (!guard.ok) return guard;
  if (guard.space.exited_at !== null) {
    return { ok: false, reason: "space_exited" };
  }

  const { error } = await client
    .from("production_space")
    .update(patch)
    .eq("id", spaceId);

  if (error) {
    console.error(
      `[location.answer_failed] space=${spaceId} code=${error.code ?? "unknown"} message=${error.message}`
    );
    return { ok: false, reason: "write_failed" };
  }

  revalidateSection();

  return { ok: true };
}

/* ────────────────────────────────────────────────────────────────────────────
 * WRITE FOUR — the column that only a telephone call can move
 * ──────────────────────────────────────────────────────────────────────────── */

/**
 * Record whether the venue will even DISCUSS hours beyond the ones it keeps.
 *
 * ⚠ **This is the strongest prohibition in the section, and the act is shaped by
 * it.** The column is absent from every source BY NATURE, because it is not
 * published anywhere: it is not a fact about the place, it is the answer to a
 * phone call. So there is **no inference path to it anywhere in this module** —
 * nothing derives it from the published hours, from a category, from a closing
 * time or from a stage — it takes **no default**, and it accepts only the two
 * words that mean somebody asked.
 *
 * **The unasked marker cannot be written back.** That is not tidiness: it is the
 * one act that could make a call that happened look like it never did, on the
 * single question that screens out the most candidates. The failure it prevents
 * is concrete — a space marked *will discuss*, a date planned on it, and the
 * conversation happening for the first time in the week of the night — and the
 * mirror image is just as bad: a recorded refusal quietly erased, and the call
 * made twice.
 *
 * Correcting a wrong entry is therefore a move between the two words, never a
 * move back to silence.
 */
export async function recordExtendedHoursStance(
  spaceId: string,
  stance: Exclude<ExtendedHoursStance, "not_asked">
): Promise<LocationWriteResult> {
  await assertLocationSection();

  if (typeof spaceId !== "string" || !UUID_PATTERN.test(spaceId)) {
    return { ok: false, reason: "invalid_id" };
  }

  // Written as a literal pair rather than as *the tuple minus one member*: a
  // subtraction expresses the rule as an exception to a list, and the day the
  // list grows a third member the subtraction admits it silently.
  if (stance !== "will_discuss" && stance !== "will_not_discuss") {
    return { ok: false, reason: "invalid_stance" };
  }

  const client = getServiceClient();

  const guard = await loadSpace(client, spaceId);
  if (!guard.ok) return guard;
  if (guard.space.exited_at !== null) {
    return { ok: false, reason: "space_exited" };
  }

  const { error } = await client
    .from("production_space")
    .update({
      extended_hours_stance: stance,
      updated_at: new Date().toISOString(),
    })
    .eq("id", spaceId);

  if (error) {
    console.error(
      `[location.stance_failed] space=${spaceId} code=${error.code ?? "unknown"} message=${error.message}`
    );
    return { ok: false, reason: "write_failed" };
  }

  revalidateSection();

  return { ok: true };
}

/* ────────────────────────────────────────────────────────────────────────────
 * WRITE FIVE — one attribute, and where its value came from
 * ──────────────────────────────────────────────────────────────────────────── */

/**
 * Set one attribute of one space, with its provenance.
 *
 * ⚠ **`provenance` is a required argument and has no default here, exactly as it
 * has none in the column.** A value cannot arrive without saying whether it was
 * read off a profile or checked on the ground. `venue-acquisition.md`, gate
 * *derivato non è verificato*: the first is a hypothesis and the second is a
 * datum, whoever reads the surface must be able to tell them apart, and whoever
 * writes the row must say which it is.
 *
 * The consequence that makes it non-negotiable: suitability is COMPUTED and
 * stored nowhere, so a figure is only as verified as its weakest input. One
 * attribute checked on site beside nine read off a website does not make the
 * result a datum — and a value edited by hand that kept the seed's `derived`
 * would be a lie, while one marked verified that nobody verified would be a
 * worse one.
 *
 * `answered_at` is written **only** where the value was checked on the ground: a
 * date beside a derived value would say somebody obtained an answer on a day
 * when somebody read a page.
 *
 * The upsert targets `production_space_attribute_unique`, which is the pair the
 * seeding script already writes `ON CONFLICT` on. There is no delete arm: an
 * attribute is set to the unasked marker, never removed — the marker is a VALUE
 * and an empty cell is not.
 */
export async function setAttribute(
  spaceId: string,
  attribute: AttributeKey,
  value: AttributeValue,
  provenance: AttributeProvenance
): Promise<LocationWriteResult> {
  await assertLocationSection();

  if (typeof spaceId !== "string" || !UUID_PATTERN.test(spaceId)) {
    return { ok: false, reason: "invalid_id" };
  }
  if (!isMember(ATTRIBUTE_KEYS, attribute)) {
    return { ok: false, reason: "invalid_attribute" };
  }
  if (!isMember(ATTRIBUTE_VALUES, value)) {
    return { ok: false, reason: "invalid_value" };
  }
  if (!isMember(ATTRIBUTE_PROVENANCE, provenance)) {
    return { ok: false, reason: "provenance_missing" };
  }

  const client = getServiceClient();

  const guard = await loadSpace(client, spaceId);
  if (!guard.ok) return guard;
  if (guard.space.exited_at !== null) {
    return { ok: false, reason: "space_exited" };
  }

  const now = new Date().toISOString();

  const { error } = await client.from("production_space_attribute").upsert(
    {
      space_id: spaceId,
      attribute,
      value,
      provenance,
      answered_at: provenance === "field_verified" ? now : null,
      updated_at: now,
    },
    { onConflict: "space_id,attribute" }
  );

  if (error) {
    console.error(
      `[location.attribute_failed] space=${spaceId} code=${error.code ?? "unknown"} message=${error.message}`
    );
    return { ok: false, reason: "write_failed" };
  }

  revalidateSection();

  return { ok: true };
}

/* ────────────────────────────────────────────────────────────────────────────
 * WRITE SIX — the stage, which is a claim about the world
 * ──────────────────────────────────────────────────────────────────────────── */

/**
 * Move a space between stages.
 *
 * ── The four words are four different things ────────────────────────────────
 *
 * Mapped is a desk exercise. Verified is a checked fact. Contacted is a
 * conversation. **Acquired means in writing** — not *they said yes on the phone*
 * — and it is the stage that unlocks naming the space in a material, in a
 * capitolato and on a poster.
 *
 * ── The evidence, and what the schema can and cannot hold ───────────────────
 *
 * `acquired` is refused without a non-blank pointer to the agreement, twice: by
 * this act, which can answer with a sentence, and by
 * `production_space_acquired_needs_evidence`, which is the boundary. The
 * constraint uses `btrim`, so a string of spaces — what a required field
 * collects from somebody in a hurry — does not satisfy it either.
 *
 * ⚠ **The other three stages have no such column, and this act does not invent
 * one.** Moving to `verified` or `contacted` is a claim about the world that the
 * schema records as a single word with nothing behind it. The surface says so in
 * the panel that asks; nothing here can make it false, and pretending the four
 * transitions are equally evidenced would be the more comfortable lie.
 *
 * ── Downwards is allowed, and it is not a bug ───────────────────────────────
 *
 * A negotiation falls through, and a stage that could only rise would make the
 * list say the opposite of what happened. The stage is **not** one of this
 * project's three one-way switches. The one thing that does refuse a downward
 * move is a space already crossed into the venue list — that crossing has to be
 * undone first, where it was made.
 */
export async function changeStage(
  spaceId: string,
  stage: VenueStage,
  agreementEvidence: unknown
): Promise<LocationWriteResult> {
  await assertLocationSection();

  if (typeof spaceId !== "string" || !UUID_PATTERN.test(spaceId)) {
    return { ok: false, reason: "invalid_id" };
  }
  if (!isMember(VENUE_STAGES, stage)) {
    return { ok: false, reason: "invalid_stage" };
  }

  const evidence = optionalText(agreementEvidence);
  if (stage === "acquired" && evidence === null) {
    return { ok: false, reason: "agreement_evidence_missing" };
  }
  if (carriesContact(evidence)) {
    return { ok: false, reason: "note_carries_contact" };
  }

  const client = getServiceClient();

  const guard = await loadSpace(client, spaceId);
  if (!guard.ok) return guard;
  if (guard.space.exited_at !== null) {
    return { ok: false, reason: "space_exited" };
  }
  if (guard.space.promoted_venue_id !== null && stage !== "acquired") {
    return { ok: false, reason: "promoted_cannot_leave_acquired" };
  }

  /*
    The evidence line is written only when it was given. A move DOWN from
    `acquired` deliberately leaves the old pointer in place rather than clearing
    it: the writing existed, and erasing the record of it because a stage moved
    would lose the same thing deleting a space loses.
  */
  const patch: Record<string, unknown> = {
    stage,
    updated_at: new Date().toISOString(),
  };
  if (evidence !== null) {
    patch.agreement_evidence = evidence;
  }

  const { error } = await client
    .from("production_space")
    .update(patch)
    .eq("id", spaceId);

  if (error) {
    console.error(
      `[location.stage_failed] space=${spaceId} code=${error.code ?? "unknown"} message=${error.message}`
    );
    return { ok: false, reason: "write_failed" };
  }

  revalidateSection();

  return { ok: true };
}

/* ────────────────────────────────────────────────────────────────────────────
 * WRITE SEVEN — leaving the race, which is a state and never a deletion
 * ──────────────────────────────────────────────────────────────────────────── */

/**
 * Record that a space left the race.
 *
 * ⚠ **There is no delete export in this module, and there will not be one.**
 * D-45-13, and `venue-acquisition.md`'s gate: a space discarded because it
 * contradicts the identity stays in the list, at zero, forever. Deleting it
 * loses the memory of the choice, and the choice then gets remade from scratch
 * at the first difficulty by somebody who was not in the room when it was made
 * the first time.
 *
 * ── The reason and the date travel together ─────────────────────────────────
 *
 * `production_space_exit_xor_reason` makes the pair inseparable — *both or
 * neither*. A date with no reason is a row nobody can read; a reason with no date
 * is a row nobody can place in the story. This act refuses the half before the
 * constraint has to.
 *
 * ── What this act CANNOT say, stated rather than implied ────────────────────
 *
 * The reason is recorded **against the space, for every format at once**, and
 * the domain reads suitability **per format**: a space that is out of identity
 * for the night can be exactly right for the aperitivo satellite. This act takes
 * no format argument because there is nowhere to put one, and inventing a
 * convention in free text would be a per-format verdict hidden inside a
 * space-wide column, which is worse than the honest limit. Plan 45-07 declared
 * the tension and left it open; closing it is a schema decision and it belongs
 * to whoever owns the section, not to this act.
 */
export async function exitSpace(
  spaceId: string,
  reason: ExitReason,
  exitedOn: string
): Promise<LocationWriteResult> {
  await assertLocationSection();

  if (typeof spaceId !== "string" || !UUID_PATTERN.test(spaceId)) {
    return { ok: false, reason: "invalid_id" };
  }
  if (!isMember(EXIT_REASONS, reason)) {
    return { ok: false, reason: "invalid_exit_reason" };
  }

  const day = optionalText(exitedOn);
  if (day === null || !CIVIL_DATE_PATTERN.test(day)) {
    return { ok: false, reason: "exit_date_missing" };
  }

  const client = getServiceClient();

  const guard = await loadSpace(client, spaceId);
  if (!guard.ok) return guard;
  if (guard.space.exited_at !== null) {
    return { ok: false, reason: "already_exited" };
  }

  const { error } = await client
    .from("production_space")
    .update({
      exit_reason: reason,
      exited_at: `${day}T00:00:00Z`,
      updated_at: new Date().toISOString(),
    })
    .eq("id", spaceId);

  if (error) {
    console.error(
      `[location.exit_failed] space=${spaceId} code=${error.code ?? "unknown"} message=${error.message}`
    );
    return { ok: false, reason: "write_failed" };
  }

  revalidateSection();

  return { ok: true };
}
