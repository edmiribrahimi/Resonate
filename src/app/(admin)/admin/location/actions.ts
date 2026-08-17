"use server";

import { revalidatePath } from "next/cache";

import { CAP, type CapabilityKey } from "@/lib/capabilities/keys";
import { getAccessContext } from "@/lib/capabilities/server";
import { createClient } from "@/lib/supabase/server";
import { getServiceClient } from "@/lib/supabase/service";
import { slugify } from "@/utils/slugify";

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
 * ── The one act that is not confined to this section ────────────────────────
 *
 * `promoteSpace` at the foot of this file crosses a space into
 * `public.venues` — the list a night's venue is chosen from, and the head of the
 * one public road to an address. It is the only export here that writes a table
 * outside the section, the only one that asks a second capability key, and the
 * only one whose effect is not undone by another act on this surface. Its own
 * docblock carries the whole argument, including what it does **not** touch and
 * the evidence rather than the assertion.
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
 * ⚠ **That sentence is about THESE TWO TABLES, and `public.venues` is not one of
 * them.** It has write arms — `venues_insert_organizer` asks
 * `catalogue.manage` — so the promotion's insert goes through the COOKIE client
 * instead, and the row-level policy is a second, independent refusal on the one
 * write in this file that puts a street address into a table a night can be
 * built on. The precedent is `venues/actions.ts:123-128`, which chose the same
 * client for the same reason and wrote down what the other choice would cost:
 * with the service client the gate would be the ONLY thing refusing an
 * unentitled caller on a path that writes a venue address.
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
 * It also hands back **the whole resolved set**, and that is not a convenience:
 * `promoteSpace` has to ask a SECOND key, and asking it means either reusing
 * this set or paying a second full round trip for a question the first one
 * already answered. Six of the eight exports destructure `userId` alone and are
 * unaffected.
 *
 * @throws `forbidden.production_location_manage_required` — the answer is no.
 * @throws `capabilities.identity_missing` — the payload carried no caller id.
 */
async function assertLocationSection(): Promise<{
  userId: string;
  capabilities: ReadonlySet<CapabilityKey>;
}> {
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

  return { userId, capabilities };
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
 * The crossing's own refusals — its own union, and the reason it is not
 * folded into the section's
 * ──────────────────────────────────────────────────────────────────────────── */

/**
 * The causes `promoteSpace` shares with the seven acts above.
 *
 * Written out member by member rather than derived with a utility type, because
 * a derivation SILENTLY YIELDS `never` for a member that stopped existing while
 * this literal list turns the assertion below red. Same shape, and the same
 * reason, as `AnnounceNightDialog.tsx:238-255`.
 */
type PromotionSharesWithSection =
  | "invalid_id"
  | "space_not_found"
  | "space_exited"
  | "read_failed"
  | "write_failed";

/** Turns red the day a member above stops existing in the union it copies. */
type _PromotionSharesExist = PromotionSharesWithSection extends LocationRefusal
  ? true
  : never;
const _promotionSharesExist: _PromotionSharesExist = true;
void _promotionSharesExist;

/**
 * Every way the one crossing can be refused.
 *
 * ⚠ **It is a SEPARATE union and not ten more members of `LocationRefusal`, and
 * that is a decision with a reason.** `SpaceForm.tsx:124` maps `LocationRefusal`
 * with a **total** `Record`, deliberately: a cause added to an act that form
 * calls, without a sentence there, is a build error rather than a message
 * written for something else. Widening the union would have demanded ten
 * sentences from a form that can produce none of them — sentences nobody could
 * ever read, in the one place whose guarantee is that every sentence is
 * reachable. That would have paid for this act by degrading another surface's
 * mechanism into decoration.
 *
 * So the guarantee is kept and scoped instead: `PromoteSpaceDialog` maps THIS
 * union totally, the assertion above keeps the shared five honest, and a cause
 * added here without a sentence there is still a build error.
 */
export type PromotionRefusal =
  | PromotionSharesWithSection
  /**
   * The caller may work the location section and may **not** create a venue.
   *
   * ⚠ **Two doors, and this is the second one.** Working the location section
   * and creating a place a night can be built on are two different questions,
   * so `promoteSpace` asks two different keys — `keys.ts:38-45`'s naming rule
   * applied to a bridge exactly as it applies to a surface.
   *
   * **It is a RETURNED value while the section key is a throw, and the asymmetry
   * is the point rather than an oversight.** Next redacts the message of an
   * error thrown out of a Server Action in a production build, so two throws
   * would reach the reader as the same blank and the person refused could not
   * tell which door was shut — which is exactly what T-45-04 asks this act to
   * make legible. A throw and a named value ARE distinguishable: the surface
   * reports the first as *you may not work this section* and the second as *you
   * may work it and may not create a venue*.
   */
  | "catalogue_manage_required"
  /**
   * The space is already crossed into the venue list. Nothing was created.
   *
   * ⚠ **A second press must not mint a second venue**, and the link on the
   * scouting row is what makes that true — which is why it is written LAST, for
   * the same reason `linked_party_id` is. This check is the fast path that saves
   * the work in the ordinary case; it is not what makes the act safe, because
   * nothing ties this read to the write that follows it. The predicate on the
   * link write is what closes the race.
   *
   * Separate from `promotion_raced` below: here nothing was created, there
   * something was and had to be taken back.
   */
  | "already_promoted"
  /**
   * The space has not reached `acquired`, so it does not cross.
   *
   * `venue-acquisition.md`, gate *una classifica non è una disponibilità*: a
   * score measures how suitable a space WOULD be, never whether it would host
   * us — and **acquired means in writing**, not *they said yes on the phone*.
   * Crossing from any earlier stage puts a desk exercise in the picker a night's
   * venue is chosen from.
   *
   * The stage travels back with the refusal so the sentence can name it. It
   * names **no space**: four declared words identify nothing.
   */
  | "not_acquired"
  /**
   * The stage says `acquired` and the line saying where the agreement is does
   * not exist.
   *
   * Belt and braces against `production_space_acquired_needs_evidence`, which
   * should already make this row impossible. It is kept because the constraint
   * is the BOUNDARY and this is the SENTENCE — and because a row that reached
   * this state anyway would be the one row on which the crossing must not
   * proceed. Distinct from `not_acquired`: there the stage is honest and too
   * low, here the stage claims something the row cannot support.
   */
  | "no_agreement_evidence"
  /**
   * A venue already carries this name.
   *
   * ⚠ **Refused and never suffixed**, which is the opposite of what the slug
   * does two lines down, and the difference is the whole of it: a slug is an
   * address and may take a suffix, a NAME is what goes on a poster and in a
   * caption. `brand-visual-system.md` — a venue is written the way the venue
   * writes it — so *Somewhere 2* is not a fallback, it is a second place that
   * does not exist.
   *
   * The likely meaning is also different from a slug collision: a venue of that
   * name already being in the catalogue usually means this space is already
   * over there, arrived by another route. That is a thing a person resolves, not
   * a thing this act retries.
   */
  | "venue_name_taken"
  /**
   * The slug and its suffixed form are both taken.
   *
   * The suffix already absorbs the ordinary collision, so reaching this means
   * two calls landed inside the same millisecond or the catalogue holds the
   * suffixed form too. Its own code because the answer is *press again*, which
   * is true of no other refusal on this act.
   */
  | "slug_taken"
  /**
   * The row-level policy on `public.venues` refused the insert.
   *
   * ⚠ **This is the second refusal doing its job, and it means the two sides
   * disagree**: the gate read `catalogue.manage` as held and the policy asking
   * the same predicate read it as not held. It is not a database fault and it is
   * not a bad argument — it is a permission answer, and folding it into
   * `write_failed` would send somebody to look at a table when the thing to look
   * at is an account.
   */
  | "venue_policy_refused"
  /**
   * The venue was created, the link back could not be written, and **the venue
   * was removed by its primary key**. Nothing crossed. Pressing again is safe.
   *
   * Separate from `write_failed`, which means nothing was created at all, and
   * separate from `promotion_orphan_venue`, which means the removal did not
   * work. The three answer the only question that matters here — what exists
   * now — with three different answers.
   */
  | "promotion_link_failed"
  /**
   * Another call crossed this space between this call's read and its write, so
   * this call's venue was removed by its primary key. Nothing of this press
   * survives; the space IS promoted, by somebody else's press.
   *
   * Its own code rather than `already_promoted`: that one says nothing was
   * created, and here something was created and taken back. Reporting the second
   * as the first would hide a write that happened.
   */
  | "promotion_raced"
  /**
   * ⚠ **A venue row exists in the catalogue and this act could not remove it.**
   * Do not press again.
   *
   * The removal is by primary key on an id this call captured at creation, so it
   * can only fail for a reason worth reading — and the most likely one is
   * informative: `production_space.promoted_venue_id` references
   * `public.venues(id)` with **no `ON DELETE` action**, so the database REFUSES
   * to remove a venue a space points at. A refused cleanup therefore often means
   * the link landed after all and the response never came back. The surface says
   * both readings and tells the person to reload before doing anything.
   */
  | "promotion_orphan_venue"
;

/** What a refused crossing answers. */
export interface PromotionFailure {
  readonly ok: false;
  readonly reason: PromotionRefusal;
  /**
   * Only on `not_acquired`: how far the space actually is.
   *
   * One of four declared words. It names **no space** and carries no address —
   * the whole point is to answer *which stage* without answering *which place*.
   */
  readonly stage?: VenueStage;
  /**
   * Only on `promotion_orphan_venue`: the venue row this call created and could
   * not remove.
   *
   * A uuid and nothing else — no name, no slug, no address. It is the only
   * handle that distinguishes this row from every other venue, and an identifier
   * names nothing to anybody not already entitled to look it up.
   */
  readonly venueId?: string;
}

/** What a completed crossing answers. */
export type PromoteSpaceResult =
  | {
      readonly ok: true;
      /** The venue this act created. An identifier, and nothing else. */
      readonly venueId: string;
      /**
       * Whether a street address crossed with it.
       *
       * ⚠ **The confirmation says which of the two happened**, and it has to:
       * the act is asked for on the promise that *the address crosses*, and on a
       * space whose record holds none, saying it did would be a lie told by the
       * one panel in this phase whose job is to describe an irreversible thing
       * accurately. `false` is not a failure — it is a record with no address.
       */
      readonly addressCarried: boolean;
    }
  | PromotionFailure;

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

/** Postgres's unique violation. Same literal as `formats/actions.ts:109`. */
const UNIQUE_VIOLATION = "23505";

/**
 * Postgres's *insufficient privilege*, which is what a row-level policy answers
 * with through PostgREST.
 *
 * Named so the promotion can tell a permission answer from a database fault. A
 * gate and a policy asking the same predicate and disagreeing is a thing
 * somebody has to be told about, not a `write_failed`.
 */
const INSUFFICIENT_PRIVILEGE = "42501";

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

/* ────────────────────────────────────────────────────────────────────────────
 * WRITE EIGHT — THE ONE CROSSING THAT EXISTS
 * ──────────────────────────────────────────────────────────────────────────── */

/**
 * Cross an acquired space into `public.venues`, deliberately and once.
 *
 * ── Why a crossing exists at all, instead of one list ───────────────────────
 *
 * D-45-10 keeps the scouted list out of `public.venues` because a scouted row
 * inside `venues` sits in the picker a night's venue is chosen from, and ONE
 * wrong selection puts a space still under negotiation on a night — from where
 * `public.venue_for_parties` serves its name and its address to the public. A
 * negotiation made public is a negotiation closed badly, and it does not
 * un-publish. With two lists that selection is not discouraged: it is ABSENT.
 *
 * This act is where the crossing is made on purpose instead, which is why every
 * refusal below is written as a sentence rather than left to a constraint.
 *
 * ── WHAT THIS ACT DOES TO THE REVEAL PATH, PROVEN AND NOT ASSERTED ──────────
 *
 * `venue-secrecy.md`'s monotone guard: an intervention may only make a reveal
 * HARDER to trigger, never easier, earlier or automatic. Four facts, each read
 * out of the code rather than remembered:
 *
 *   1. **The reveal columns are not on the table this act writes.**
 *      `venue_secret`, `venue_reveal_on_purchase`, `venue_reveal_hours` and
 *      `venue_revealed_at` are columns of `public.event_parties`;
 *      `venue_reveal_sent` is a column of `public.tickets` and of
 *      `public.rsvps`. `public.venues` carries none of them
 *      (`20260226200000_venues.sql:2-15`). This act writes `public.venues` and
 *      `public.production_space`, so it could not set a reveal flag if it tried.
 *   2. **The public road needs a night, and this act creates none.**
 *      `public.venue_for_parties` walks `event_parties → events → venues`
 *      joining `v.id = ep.venue_id`
 *      (`20260810161000_venues_read_narrowed.sql:371-397`). A venue no night
 *      points at is unreachable through it at any argument. This act creates no
 *      event and no night and sets no `venue_id`.
 *   3. **The scheduled reveal needs a night too.** The cron reads
 *      `event_parties` where `venue_secret = true` and embeds `venues` through
 *      the same `venue_id` (`api/cron/venue-reveal/route.ts:110-115`), and
 *      `revealPartyVenue` collects recipients by `party_id` and `event_id`. A
 *      venue with no night is swept by neither.
 *   4. **`anon` cannot read `public.venues` at all.** The unconditional read was
 *      dropped and `venues_select_staff` asks `staff.manage`
 *      (`20260810161000_venues_read_narrowed.sql:238-242`), so the row this act
 *      writes is readable by the same audience that was already reading the
 *      space it came from.
 *
 * So the address crosses into a table where it is visible to staff, and the road
 * from there to a member or to the public still requires a separate, later,
 * deliberate act: somebody picking this venue for a night. **That road exists on
 * purpose and this act is its entrance — it is not the road.**
 *
 * ── The address DOES cross, and that is a decision with a reason ────────────
 *
 * D-45-21 consequence 4 names this the one crossing where a scouted address
 * becomes subject to the reveal machinery, and it crosses rather than being left
 * behind: a venue with no address is a venue somebody fills in by hand from a
 * message, which moves the same address through a channel nobody controls. The
 * confirmation says so in the same breath as it asks — and on a record with no
 * address it says THAT instead, because a panel describing an irreversible act
 * may not describe one that did not happen.
 *
 * ── What this act must NOT touch, written so it is recognised if proposed ────
 *
 * It creates **no event, no night and no reveal**. It does not write
 * `venue_reveal_on_purchase`, it does not clear `venue_reveal_sent`, and it does
 * not shorten a window. A promotion is a catalogue act; announcing a night is a
 * different act, in a different section, and it already exists — and it refuses
 * a space that is not acquired for the same reason this one does.
 *
 * ── It is effectively one-way, and the confirmation is sized to that ────────
 *
 * There is no un-promote export here and there will not be one on this surface:
 * removing a venue is `master.manage`, it happens in the catalogue where the
 * crossing lands, and `production_space_promotion_needs_acquired` plus the
 * foreign key hold the two sides together meanwhile. So the confirmation names
 * the space — inverting the calendar dialog's deliberate silence — because here
 * the name and the address are exactly what is leaving, and a confirmation that
 * hid them would be asking consent for something it did not describe.
 *
 * ── Two clients, and the split is the argument ──────────────────────────────
 *
 * The insert goes through the COOKIE client, so `venues_insert_organizer` is a
 * second and independent refusal on the write that moves an address
 * (`venues/actions.ts:123-128`, same choice, same reason). The link back and the
 * cleanup go through the SERVICE client, because `production_space` has no write
 * arm at all and because removing a venue is `master.manage` — a cleanup an
 * organizer could not perform would be a cleanup that never runs, and an orphan
 * venue in the picker is the exact row this whole design exists to prevent. The
 * cost is stated rather than hidden: that delete bypasses row-level security,
 * and it is bounded to ONE id this call captured at creation.
 *
 * Every log line here carries identifiers, a code and a message. No name, no
 * address, and **no slug — a slug is a name with the spaces taken out.**
 */
export async function promoteSpace(
  spaceId: string
): Promise<PromoteSpaceResult> {
  /*
    GATE ONE — asked FIRST, and once. It throws, as it does in the other seven
    exports, and the surface reads a throw as *you may not work this section*.
  */
  const { userId, capabilities } = await assertLocationSection();

  /*
    GATE TWO — a DIFFERENT question, and therefore a different key.

    *May this subject work the location section* is not *may this subject create
    a venue*. Returned rather than thrown so the two doors stay distinguishable
    after a production build redacts thrown messages: see the refusal's own note.
  */
  if (!capabilities.has(CAP.CATALOGUE_MANAGE)) {
    return { ok: false, reason: "catalogue_manage_required" };
  }

  if (typeof spaceId !== "string" || !UUID_PATTERN.test(spaceId)) {
    return { ok: false, reason: "invalid_id" };
  }

  // Both clients AFTER both gates, never before.
  const service = getServiceClient();
  const cookieBound = await createClient();

  /*
    THE ONE READ, AND IT IS NOT `loadSpace`.

    `loadSpace` deliberately reads neither the name nor the address, because a
    guard has no use for either and a value never loaded cannot reach a log. This
    act is the one place in the module where both ARE the subject: they are what
    crosses. So it reads them here, in one query, and they travel into exactly
    one insert and into nothing else — no log line, no thrown message, no
    returned value.
  */
  const { data: spaceRow, error: readError } = await service
    .from("production_space")
    .select(
      "id, name, address, stage, agreement_evidence, exited_at, promoted_venue_id"
    )
    .eq("id", spaceId)
    .maybeSingle();

  if (readError) {
    console.error(
      `[location.promote_read_failed] space=${spaceId} venue=none code=${readError.code ?? "unknown"} message=${readError.message}`
    );
    return { ok: false, reason: "read_failed" };
  }

  if (spaceRow === null) {
    return { ok: false, reason: "space_not_found" };
  }

  const space = spaceRow as unknown as {
    id: string;
    name: string;
    address: string | null;
    stage: VenueStage;
    agreement_evidence: string | null;
    exited_at: string | null;
    promoted_venue_id: string | null;
  };

  /*
    THE IDEMPOTENCE CHECK, DECIDED BEFORE ANYTHING ELSE ABOUT THIS ROW.

    A second press must not mint a second venue. The link written last is what
    makes that true; this is the fast path, and the predicate on the link write
    is the guarantee.
  */
  if (space.promoted_venue_id !== null) {
    return { ok: false, reason: "already_promoted" };
  }

  // A space that left the race does not cross. The exit is a record of a
  // decision, and this act would be the loudest possible way of editing it.
  if (space.exited_at !== null) {
    return { ok: false, reason: "space_exited" };
  }

  // *Una classifica non è una disponibilità.* The stage travels back so the
  // sentence can name it; it names no space.
  if (space.stage !== "acquired") {
    return { ok: false, reason: "not_acquired", stage: space.stage };
  }

  /*
    BELT AND BRACES AGAINST THE CHECK.

    `production_space_acquired_needs_evidence` should make this row impossible,
    and `btrim` there is why this trim is here. It is kept because the constraint
    is the boundary and the code is the sentence — and because a row that reached
    this state anyway is precisely the row that must not cross.
  */
  if ((space.agreement_evidence ?? "").trim() === "") {
    return { ok: false, reason: "no_agreement_evidence" };
  }

  /*
    THE NAME, REFUSED ON COLLISION AND NEVER SUFFIXED.

    `venues_name_unique` would refuse it anyway; asking first is what turns a
    constraint code into a sentence. A suffix is right for an address and wrong
    for a name: *Somewhere 2* is not a fallback, it is a second place that does
    not exist, and the name is what goes on a poster.

    `.eq` and not a case-insensitive match: the constraint is case-sensitive, so
    a looser pre-check would refuse pairs the database would have accepted — and
    a pre-check stricter than its own constraint is a rule nobody wrote down.
  */
  const { data: nameTaken, error: nameError } = await cookieBound
    .from("venues")
    .select("id")
    .eq("name", space.name)
    .maybeSingle();

  if (nameError) {
    console.error(
      `[location.promote_precheck_failed] space=${spaceId} venue=none code=${nameError.code ?? "unknown"} message=${nameError.message}`
    );
    return { ok: false, reason: "read_failed" };
  }

  if (nameTaken) {
    return { ok: false, reason: "venue_name_taken" };
  }

  /*
    THE SLUG — DERIVED ONCE, AT CREATION, AND NEVER REWRITTEN.

    `/venues/<slug>` is an address somebody may send to somebody else, so
    overwriting one breaks a link that already exists in a message. A collision
    takes a suffix; the same shape `createVenue` and `announceNight` both use.
  */
  const base = slugify(space.name);
  let slug = base.length > 0 ? base : `venue-${Date.now().toString(36)}`;

  const { data: slugTaken, error: slugError } = await cookieBound
    .from("venues")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();

  if (slugError) {
    console.error(
      `[location.promote_precheck_failed] space=${spaceId} venue=none code=${slugError.code ?? "unknown"} message=${slugError.message}`
    );
    return { ok: false, reason: "read_failed" };
  }

  if (slugTaken) {
    slug = `${slug}-${Date.now().toString(36)}`;
  }

  /*
    THE VENUE.

    WHAT IT CARRIES: the name, the slug, the address, and who pressed.

    WHAT IT DELIBERATELY DOES NOT CARRY, listed so an addition has to argue with
    this paragraph rather than slip past it:

      · the scouting's prose — it is CRITERIA AND OBSERVATION about a candidate,
        written to decide whether to call. A venue's public-facing copy is about
        a place that agreed to host us. Copying the first into the second turns
        an assessment into something somebody writes from;
      · a maps link — nothing in the section holds one, and deriving one from an
        address would manufacture a second, sharper form of the address that
        nobody entered;
      · a photo, an Instagram address, a website — the section holds none of
        them, and a profile filled with blanks it never had is a profile that
        looks complete;
      · every scouting column — the stage, the score inputs, the attributes, the
        four answers, the exit. They are how we decided, not what the place is,
        and `public.venues` is read by surfaces that have no business with either.

    Through the COOKIE client, so the row-level policy refuses independently of
    the gate above.
  */
  const { data: createdVenue, error: venueError } = await cookieBound
    .from("venues")
    .insert({
      name: space.name,
      slug,
      address: space.address,
      created_by: userId,
    })
    .select("id")
    .single();

  if (venueError || !createdVenue) {
    console.error(
      `[location.promote_write_failed] space=${spaceId} venue=none code=${venueError?.code ?? "unknown"} message=${venueError?.message ?? "no row returned"}`
    );

    // A permission answer and a database fault send a reader to two different
    // places, so they are two codes and never one.
    if (venueError?.code === INSUFFICIENT_PRIVILEGE) {
      return { ok: false, reason: "venue_policy_refused" };
    }
    if (venueError?.code === UNIQUE_VIOLATION) {
      return { ok: false, reason: "slug_taken" };
    }
    return { ok: false, reason: "write_failed" };
  }

  const venueId = (createdVenue as unknown as { id: string }).id;

  /*
    THE LINK, WRITTEN LAST — and it is what makes a second press idempotent.

    ⚠ THE GUARD IS ON THIS WRITE AND NOT ON THE READ ABOVE.
    `.is("promoted_venue_id", null)` travels as a PREDICATE OF THE UPDATE. The
    fast path at the top saves work in the ordinary case and guarantees nothing,
    because nothing tied that read to this write: two concurrent calls would both
    have seen a null link, both created a venue, and the second would have
    overwritten the first one's link — leaving a venue in the picker that no
    space points at, which is the one row this design exists to prevent.

    `.select("id")` is what makes the predicate readable. Without it a refused
    update and a satisfied one answer identically — no error, nothing returned —
    which is the silent zero this section refuses everywhere.

    The stage is NOT re-asserted as a predicate: the promotion constraint refuses
    the write if the stage moved between the read and here, and the constraint is
    the boundary. A predicate would answer that race as *somebody else promoted
    it*, which would be the wrong sentence.
  */
  const { data: linkedRows, error: linkError } = await service
    .from("production_space")
    .update({
      promoted_venue_id: venueId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", spaceId)
    .is("promoted_venue_id", null)
    .select("id");

  const raced = !linkError && (!linkedRows || linkedRows.length === 0);

  if (linkError || raced) {
    if (linkError) {
      console.error(
        `[location.promote_link_failed] space=${spaceId} venue=${venueId} code=${linkError.code ?? "unknown"} message=${linkError.message}`
      );
    } else {
      console.error(
        `[location.promote_raced] space=${spaceId} venue=${venueId} code=none ` +
          "message=the space was crossed by another call between this call's " +
          "read and its write, so this call's venue is tied to nothing"
      );
    }

    /*
      THE CLEANUP — BY PRIMARY KEY, ON THE ID THIS CALL JUST CAPTURED.

      Never by a selector over a list. This repository lost 63 production rows in
      seven tables to the other shape and has no point-in-time recovery
      (`ai-engineering.md`, gate *una rimozione si fa per chiave*): a selector too
      wide removes MORE than it meant to, while a primary key that is wrong finds
      nothing. Only one of those two ways of failing is compatible with an act
      that promises the catalogue is left as it was found.

      It cannot cut a tie either: `production_space.promoted_venue_id` references
      this table with **no `ON DELETE` action**, so if the link did land after all
      the database REFUSES this delete rather than quietly nulling the link — and
      that refusal is reported, not swallowed.
    */
    const { error: cleanupError } = await service
      .from("venues")
      .delete()
      .eq("id", venueId);

    if (cleanupError) {
      console.error(
        `[location.promote_orphan_venue] space=${spaceId} venue=${venueId} code=${cleanupError.code ?? "unknown"} message=${cleanupError.message}`
      );
      return { ok: false, reason: "promotion_orphan_venue", venueId };
    }

    return {
      ok: false,
      reason: raced ? "promotion_raced" : "promotion_link_failed",
    };
  }

  revalidateSection();
  // The catalogue now holds a row it did not hold a moment ago, and the surface
  // that lists venues has to say so.
  revalidatePath("/admin/venues");

  return { ok: true, venueId, addressCarried: space.address !== null };
}
