/**
 * What the import **would** write — assembled, returned, and never performed.
 *
 * ── ⚠ THE DIVERGENCE FROM THE ANALOG, STATED HERE RATHER THAN FOUND ─────────
 *
 * `src/lib/door/classify.ts` is the shape every module in this directory copies:
 * decide after the fact, take rows in, hand rows back, touch nothing. This module
 * copies it on every axis but one, and the exception is the whole reason it
 * exists.
 *
 * `classify.ts` has **no write to withhold**. This one does — six lists of rows
 * that belong in six tables — and it withholds them all. {@link reconcile} opens
 * no connection, takes no client, and returns a {@link ReconcilePlan} that the
 * caller applies. That is what makes a **dry run** possible, and in a repository
 * with no test runner a dry run is the only rehearsal there is: the plan can be
 * counted, printed as codes, and compared with the plan of the previous pass
 * before a single row moves.
 *
 * The divergence is declared here for the reason
 * `src/app/(admin)/admin/formats/actions.ts:41-51` declares its own: a departure
 * from three siblings that nobody wrote down reads as an oversight to the next
 * person, and gets "repaired".
 *
 * ── ⚠ THE KEY IS `UID`, AND IT IS THE FILE'S OWN ────────────────────────────
 *
 * 92 of 92 are unique in the measured file, and the application that writes the
 * calendar maintains them across edits. The alternatives were weighed and each
 * fails the one thing an identity has to do — stay put:
 *
 *   the title       changes the moment the owner renames a night;
 *   (date, title)   both change;
 *   a content hash  changes on EVERY edit, which is the opposite of identity.
 *
 * So the write the caller performs is `ON CONFLICT (source_uid) DO UPDATE`, and a
 * second run is a no-op **by construction** rather than by care (D-44-03). For an
 * expanded recurrence the key is `UID` **plus the occurrence date**, because one
 * `UID` covers many days and a single-column key would collapse a season of
 * occupied Thursdays into one row, leaving every other Thursday looking free.
 *
 * Idempotence has one weaker corner and it is named rather than hidden: a
 * **proposal** has no `UID`, because it does not exist in the file. Its identity
 * is `(plan key, kind, date-or-reason)`, and it is honoured **here**, by consulting
 * the snapshot, not by a constraint. A constraint would be stronger; there is
 * none, so this module carries the obligation and says so.
 *
 * ── ⚠ THE NUMBER IS READ FROM THE FILE AND NEVER GENERATED ──────────────────
 *
 * No counter, no arithmetic on a progressivo, no second watermark. The one that
 * exists — the column on `party_series` that a trigger raises when an announced
 * night is written — is respected and **not re-implemented** (`44-RESEARCH.md`
 * §Don't Hand-Roll). A progressivo already assigned is already on a printed
 * poster; it is one of this project's three monotone guards (`meta-gates.md`).
 *
 * That column's name is deliberately **not spelled anywhere in this file**, and
 * neither is the arithmetic one would reach for, for the reason
 * `src/app/(admin)/admin/formats/actions.ts:58-63` gives about its own forbidden
 * literal: a grep whose only match is the sentence forbidding the thing is a grep
 * that gets ignored the third time it goes red. The prohibition is enforceable
 * precisely because the grep has nothing to find.
 *
 * When a known `UID` arrives carrying a **different** number — or a different
 * series code, which composes the other half of the same sigla — the row enters
 * **neither** update list and a divergence is emitted instead. Plan 44-04's
 * `BEFORE UPDATE` trigger is the second layer, and both exist on purpose: a guard
 * in application code protects the caller who read it, a guard in the database
 * protects the one who did not.
 *
 * ── ⚠ AN ENTRY THAT VANISHES IS REPORTED, NEVER REMOVED ─────────────────────
 *
 * A row present in a previous run and missing from this file goes into
 * {@link ReconcilePlan.absences} with an `absentSince` stamp, and there is no list
 * in this module that removes a row from any table. The reason is not caution: an
 * entry can vanish because its `UID` changed, because the export was partial, or
 * because the wrong file was handed over — and a plan row already linked to an
 * announced night must survive its own absence unconditionally, since taking it
 * away would orphan a night that has tickets on sale. That is exactly the harm
 * D-44-06 separates the two tables to prevent, and
 * {@link AbsenceRecord.linkedToAnnouncedNight} is how the report says it out loud.
 *
 * ── ⚠ THE IMPORT NEVER WRITES THE ANNOUNCED-NIGHT TABLE ─────────────────────
 *
 * No list of {@link ReconcilePlan} targets `event_parties`, the string occurs
 * nowhere else in this directory, and the announcement act is the single bridge
 * (D-44-06). **That absence is the property which makes a re-import unable to move
 * a night that has tickets on sale** — and it is also the second of the three
 * layers that make renumbering structurally impossible, because the watermark can
 * only rise on a write this module cannot perform.
 *
 * ── Change detection ────────────────────────────────────────────────────────
 *
 * `SEQUENCE` (observed range 0 to 18, so it genuinely moves) and `LAST-MODIFIED`
 * (present on every entry and maintained rather than copied). Both are stored and
 * neither is interpreted. A **decreasing** `SEQUENCE` for a known `UID` is an
 * anomaly with its own reason code: it is reported, and the file is still
 * mirrored, because the file is the source (D-44-01) and refusing the update would
 * leave the product holding a version nobody can see.
 *
 * ── ⚠ WHAT A DIVERGENCE AND A FINDING MAY CARRY ─────────────────────────────
 *
 * A `UID` and a reason code. **Never a title, never a date, never a word for a
 * space, never a line-up.** These lists are read by whoever is debugging an
 * import, which means they reach a terminal, a screenshot and — the irreversible
 * one — a document under `.planning/`, which is tracked and public. A `UID` names
 * nothing to anybody outside the file.
 *
 * The **write** lists are the other half of that sentence and the distinction is
 * deliberate: {@link CommitmentFields.title} and {@link PlanFields.venueWord} do
 * travel, because `production_commitment.title` and `production_plan.venue_word`
 * exist and a day shown as taken with no indication of what took it cannot be
 * scheduled around. They travel to those columns, behind row-level security, and
 * nowhere else — the same narrow exception `./classify` states for the one text
 * field it carries. A row is not a finding.
 *
 * ── Pure by design ──────────────────────────────────────────────────────────
 *
 * Every import below is either a **type** or a pure function from this same
 * directory, so this module has no runtime dependency at all — no Supabase client,
 * no HTTP call, no React, and no clock. {@link reconcile} takes `now` as an
 * **argument**, which is why the same file against the same snapshot yields the
 * same plan on any machine, in any zone, at any hour, and why the plan of two
 * passes can be compared at all.
 *
 * One import reaches **outside** this directory — `@/types/database`, type-only —
 * and it is the exception the section below exists to justify. It is erased by
 * `tsc` and by Node's own type stripping, so purity is untouched; what it buys is
 * the one thing this module could not previously have.
 *
 * ── ⚠ THE SNAPSHOT ROW TYPES ARE TIED TO THE COLUMNS, AND THIS IS WHY ───────
 *
 * The row shapes below used to be declared by hand, in full, with their own
 * primitive types. **That let this module require a column that does not
 * exist**, and it did: `ExistingPlanRow` and `PlanFields` both carried a
 * `seriesCode` typed `string`, the caller read and wrote `production_plan
 * .series_code`, and there is no such column — the plan row carries `series_id`,
 * a reference into the catalogue, because a sigla has ONE owner and a spelling
 * copied beside a key is a second one that drifts.
 *
 * PostgREST answered `42703`, the runner turned it into a refusal, and it
 * refused on **every** invocation, with and without `--apply`. Nothing caught it
 * for the reason the shape made inevitable: **the contract was written twice in
 * TypeScript and never once against the database**, so `npm run build` had two
 * agreeing declarations to compare and no column to compare them to.
 *
 * So each field below that IS a column takes its type FROM that column, through
 * the four aliases beneath this docblock. A field naming a column that does not
 * exist is now a `npm run build` error — which, in a repository with no test
 * runner (`CLAUDE.md`, Guardrail 1), is the only automatic gate there is. That is
 * the same inverted-import device `src/types/database.ts` already uses on
 * `./vocabulary`, pointed the other way: the vocabularies travel up, the column
 * types travel back down, and neither file holds a second copy of the other's.
 *
 * **Three fields are deliberately NOT tied, and each says so where it stands.**
 * `ExistingPlanRow.seriesCode`, `PlanFields.seriesCode` and the two `planKey`s
 * are values the CALLER resolves — a sigla out of the catalogue, a join key out
 * of a sigla and a progressivo — and no column holds any of them. Typing them as
 * columns is precisely the mistake this section records.
 *
 * ── What a green build does NOT prove ───────────────────────────────────────
 *
 * That a second pass returns an empty plan. {@link isEmptyPlan} makes the claim
 * *checkable*; it does not make it true. It is asserted by
 * `scripts/verify-ics-import.mjs` in plan 44-08, check E, and exercised for real
 * by the dry run of plan 44-10. **Nothing here claims criterion 5 is satisfied.**
 */

import { PIECE_KIND_LABELS } from "./vocabulary";
import type { CivilDate, PieceKind, UnresolvedReason } from "./vocabulary";
import type {
  ProductionChecklistItem,
  ProductionCommitment,
  ProductionPiece,
  ProductionPlan,
} from "@/types/database";
import { expandWeeklyRecurrence } from "./parse";
import type { UnsupportedRecurrence } from "./parse";
import { joinKey } from "./classify";
import type {
  ClassifiedCommitment,
  ClassifiedNight,
  ClassifiedPiece,
  UnclassifiedEntry,
} from "./classify";
import { conformsToRule, proposePieceDate } from "./anchors";
import type { AnchorContext, PipelineRule } from "./anchors";

// ── The four column aliases ─────────────────────────────────────────────────
//
// One per table this module holds a snapshot of. They exist so that a field can
// name its column and inherit its type in one place, and so that naming a column
// that does not exist is a compile error rather than a `42703` at runtime — see
// the docblock above for the defect that made them necessary.
//
// They are aliases and not `Pick`s because the row shapes here are camelCase and
// the columns are snake_case. `Pick` would have imposed the database's spelling
// on a module the whole product reads in the other one; this keeps the names and
// takes the types, which is the half that was actually missing.

type PlanColumn<K extends keyof ProductionPlan> = ProductionPlan[K];
type PieceColumn<K extends keyof ProductionPiece> = ProductionPiece[K];
type CommitmentColumn<K extends keyof ProductionCommitment> = ProductionCommitment[K];
type ChecklistColumn<K extends keyof ProductionChecklistItem> = ProductionChecklistItem[K];

// ── The vocabularies this module owns ───────────────────────────────────────

/** Which table a finding is about. Three tables, three answers. */
export type SubjectTable = "plan" | "piece" | "commitment";

/**
 * The five checklist kinds, mirrored member for member by the `kind` CHECK on
 * `production_checklist_item`. Editing either set means editing both, in the same
 * commit — the cross-check `./vocabulary` states for its own six.
 *
 * The editorial pieces collapse into one; the four production steps each get
 * their own, because they fail for different reasons and are chased by different
 * people (D-44-14).
 */
export const CHECKLIST_KINDS = [
  "piece",
  "venue_confirmed",
  "dj_confirmed",
  "photo_arrived",
  "space_approval",
] as const;

/** One of the five. */
export type ChecklistKind = (typeof CHECKLIST_KINDS)[number];

/** A production step — every checklist kind that is not an editorial piece. */
export type ProductionStepKind = Exclude<ChecklistKind, "piece">;

/**
 * What each production step is called on a surface.
 *
 * A total `Record` over the union, exactly as `PIECE_KIND_LABELS` is in
 * `./vocabulary`: a sixth checklist kind without a label here is a
 * `npm run build` error, which is the one part of this contract the compiler can
 * hold.
 *
 * The labels are load-bearing beyond their words: together with the plan row and
 * the kind they form `production_checklist_item`'s unique key, so **changing one
 * of these strings orphans every item already ticked under the old one**. They
 * are not copy to be tidied.
 */
export const PRODUCTION_STEP_LABELS: Record<ProductionStepKind, string> = {
  venue_confirmed: "Venue confirmed in writing",
  dj_confirmed: "DJ confirmed",
  photo_arrived: "Photo arrived",
  space_approval: "Space approval of the material",
};

/**
 * The order the four production steps are drawn in, after the pieces.
 *
 * Fixed, and not derived from `CHECKLIST_KINDS`, so that adding a sixth kind is a
 * deliberate edit here rather than an item silently appearing at the end of every
 * night's list.
 */
const PRODUCTION_STEP_ORDER: readonly ProductionStepKind[] = [
  "venue_confirmed",
  "dj_confirmed",
  "photo_arrived",
  "space_approval",
];

/**
 * Why the file and the product disagree — five reasons, and they stay five.
 *
 * Collapsing them into one *"problem"* is the pattern this project has already
 * paid for once (`meta-gates.md`, the newsletter precedent), and there is no error
 * tracking here to catch a reason that loses its category.
 *
 * - `number_changed` / `series_changed` — the two halves of a sigla. The row is
 *   **not** updated; a progressivo already assigned is already on a poster.
 * - `sequence_decreased` — a known `UID` whose revision counter went backwards.
 *   Reported; the file is still mirrored.
 * - `announced_night_date_changed` — the file moved a date under a night that has
 *   already been announced. The plan row mirrors the file, the announced night is
 *   untouched by anything here, and the report is what makes somebody look
 *   (D-44-07).
 * - `announced_night_row_absent` — the entry behind an announced night is gone
 *   from this file. The row survives; the report is loud because the cause may be
 *   a partial export.
 */
export const DIVERGENCE_REASONS = [
  "number_changed",
  "series_changed",
  "sequence_decreased",
  "announced_night_date_changed",
  "announced_night_row_absent",
] as const;

/** Why the file and the product disagree. */
export type DivergenceReason = (typeof DIVERGENCE_REASONS)[number];

/**
 * The two ways a row stops corresponding to anything, and neither is a removal.
 *
 * - `absent_from_file` — it was in a previous export and is not in this one.
 * - `no_longer_owed` — a **proposal** the pipeline rules no longer call for. It
 *   was never in the file, so the first reason would be a lie about where it came
 *   from; and a computed date left drawn beside real ones after the rule that
 *   produced it changed is the harm D-44-09b part 3 accepted a cost for, not a
 *   cost to keep paying for free.
 */
export const ABSENCE_REASONS = ["absent_from_file", "no_longer_owed"] as const;

/** Why a row is marked absent. */
export type AbsenceReason = (typeof ABSENCE_REASONS)[number];

// ── What the caller hands in ────────────────────────────────────────────────

/**
 * One obligation of one series: the kind of piece it owes and the rule that
 * places it.
 */
export interface SeriesPipelineRule {
  kind: PieceKind;
  rule: PipelineRule;
}

/**
 * Everything the product knows about what one series owes.
 *
 * Keyed on the **series code**, which is the key all three of the file's title
 * grammars normalise to (`./classify`). The caller reads these from
 * `production_pipeline_rule`, resolving the format-level default and the
 * series-level override before they get here: which of the two levels won is a
 * database question, and answering it twice is how the two answers start to
 * differ.
 */
export interface SeriesPipeline {
  seriesCode: string;
  /**
   * Whether the space that hosts this series has to approve the material naming
   * it, before the listing goes out.
   *
   * **An input, and deliberately not inferred from a format's name.** The
   * approval is a property of the *space*, not of the format
   * (`brand-visual-system.md`, gate *lo spazio approva cio' che lo nomina*), so a
   * format that moves into an exhibition space acquires the step by an edit
   * rather than by a deploy — and a format word hard-coded here would be a second
   * catalogue, disagreeing with the first the week somebody changes one of them.
   */
  requiresSpaceApproval: boolean;
  rules: readonly SeriesPipelineRule[];
}

/**
 * The classified file, plus the two things the file cannot say about itself.
 *
 * `unclassified` and `unsupportedRecurrences` travel through untouched: they are
 * findings, they are already `UID` + code, and this module has nothing to add to
 * them beyond carrying them to the run summary that a person actually reads.
 */
export interface ReconcileInput {
  nights: readonly ClassifiedNight[];
  pieces: readonly ClassifiedPiece[];
  commitments: readonly ClassifiedCommitment[];
  unclassified: readonly UnclassifiedEntry[];
  unsupportedRecurrences: readonly UnsupportedRecurrence[];
  /**
   * How many artists are credited on each night, by join key.
   *
   * Read from `party_credits` — the **structured** line-up — and never from the
   * communicated text. A key that is missing is *not yet knowable*, which is a
   * different answer from zero and produces `depends_on_lineup` rather than a
   * figure (D-44-13, OBS-03).
   */
  creditedArtistCounts: ReadonlyMap<string, number>;
  /**
   * The largest number of occurrences one recurring commitment may expand into.
   *
   * A bound the **caller** owns, so a rule in a file never decides how much work
   * this does. Below one, nothing expands and the entry keeps its own day.
   */
  recurrenceOccurrenceCap: number;
}

// ── The snapshot of what the database already holds ─────────────────────────
//
// Plain rows, read by the caller and passed in. This module opens no connection.
// Every row carries its own `id`, because that identifier is the safe thing to
// name in a report: it is a uuid, and it says nothing about a date, a space or
// anybody's name.

/** A `production_plan` row as it stands. */
export interface ExistingPlanRow {
  id: PlanColumn<"id">;
  sourceUid: PlanColumn<"source_uid">;
  /**
   * ⚠ **NOT A COLUMN, and believing it was one is the defect this file records.**
   *
   * The plan row stores `series_id`, a reference into `party_series`, because a
   * sigla has one owner and a spelling kept beside a key is a second one that
   * drifts. The **caller** resolves that reference into the sigla the file writes
   * — it holds the catalogue; this module holds no connection and makes no join —
   * and hands the result in here, where it is compared against what the file says
   * and, when the two differ, becomes a `series_changed` divergence.
   *
   * `null` therefore means one of two things and both are findings the caller
   * reports: the row has no series at all, or it points at one this run's
   * catalogue could not resolve. It never silently means *the same series*.
   */
  seriesCode: string | null;
  number: PlanColumn<"number">;
  venueWord: PlanColumn<"venue_word">;
  date: PlanColumn<"date">;
  startTime: PlanColumn<"start_time">;
  endTime: PlanColumn<"end_time">;
  sourceSequence: PlanColumn<"source_sequence">;
  sourceLastModified: PlanColumn<"source_last_modified">;
  absentSince: PlanColumn<"absent_since">;
  /** Set once the night has been announced. Absence never costs such a row. */
  linkedPartyId: PlanColumn<"linked_party_id">;
}

/**
 * A `production_piece` row as it stands. `sourceUid` is null for a proposal.
 *
 * ⚠ `seriesCode` **is** a column here, and the asymmetry with the plan row above
 * is deliberate rather than an oversight: a piece names a series code the file
 * WROTE, and an unresolvable code has to survive as evidence instead of being
 * dropped at the door. A plan row names a night that resolved, so it can carry
 * the reference.
 */
export interface ExistingPieceRow {
  id: PieceColumn<"id">;
  sourceUid: PieceColumn<"source_uid">;
  seriesCode: PieceColumn<"series_code">;
  number: PieceColumn<"number">;
  kind: PieceColumn<"kind">;
  partMarker: PieceColumn<"part_marker">;
  date: PieceColumn<"date">;
  origin: PieceColumn<"origin">;
  unresolvedReason: PieceColumn<"unresolved_reason">;
  conformsToRule: PieceColumn<"conforms_to_rule">;
  namingConvention: PieceColumn<"naming_convention">;
  sourceSequence: PieceColumn<"source_sequence">;
  sourceLastModified: PieceColumn<"source_last_modified">;
  absentSince: PieceColumn<"absent_since">;
}

/** A `production_commitment` row as it stands. One row per occupied day. */
export interface ExistingCommitmentRow {
  id: CommitmentColumn<"id">;
  sourceUid: CommitmentColumn<"source_uid">;
  occurrenceDate: CommitmentColumn<"occurrence_date">;
  startTime: CommitmentColumn<"start_time">;
  endTime: CommitmentColumn<"end_time">;
  title: CommitmentColumn<"title">;
  recurrenceRaw: CommitmentColumn<"recurrence_raw">;
  absentSince: CommitmentColumn<"absent_since">;
}

/**
 * A `production_checklist_item` row as it stands.
 *
 * `planKey` is the caller's join of the item's plan row back to a series code and
 * a progressivo; there is no such column, and there does not need to be — the
 * caller already holds both sides.
 */
export interface ExistingChecklistItemRow {
  id: ChecklistColumn<"id">;
  /** ⚠ Not a column — the caller's join, as the docblock above says. */
  planKey: string;
  kind: ChecklistColumn<"kind">;
  label: ChecklistColumn<"label">;
  dueDate: ChecklistColumn<"due_date">;
  sortOrder: ChecklistColumn<"sort_order">;
}

/** Everything the database already holds, in one argument. */
export interface ExistingSnapshot {
  plans: readonly ExistingPlanRow[];
  pieces: readonly ExistingPieceRow[];
  commitments: readonly ExistingCommitmentRow[];
  checklistItems: readonly ExistingChecklistItemRow[];
}

// ── The rows the plan carries ───────────────────────────────────────────────

/** What a plan row says, whether it is being created or corrected. */
export interface PlanFields {
  /**
   * ⚠ **NOT A COLUMN**, for {@link ExistingPlanRow.seriesCode}'s reason read the
   * other way round: this is the sigla the FILE writes, and the caller maps it
   * back through the catalogue to the `series_id` it actually stores. A caller
   * that writes this string into a column is writing a second spelling of
   * something the catalogue already owns.
   */
  seriesCode: string;
  number: NonNullable<PlanColumn<"number">>;
  /** ⚠ Internal. It travels to `production_plan.venue_word` and nowhere else. */
  venueWord: PlanColumn<"venue_word">;
  date: PlanColumn<"date">;
  startTime: NonNullable<PlanColumn<"start_time">>;
  endTime: NonNullable<PlanColumn<"end_time">>;
  sourceSequence: PlanColumn<"source_sequence">;
  sourceLastModified: PlanColumn<"source_last_modified">;
}

/** A plan row the file has and the database does not. */
export interface PlanInsert extends PlanFields {
  sourceUid: string;
  /** `seriesCode` + `number`, normalised. What a piece joins to. */
  key: string;
  seenAt: string;
}

/**
 * A plan row both have, whose content moved.
 *
 * Emitted **only** when something the file decides actually differs, which is what
 * makes a second pass over an unchanged file produce nothing. `number` is present
 * and is always the value already stored: a row whose number moved never reaches
 * this list.
 */
export interface PlanUpdate extends PlanFields {
  id: string;
  sourceUid: string;
  key: string;
  seenAt: string;
  /** The row had been marked absent and is back. Clearing the stamp is the write. */
  clearsAbsence: boolean;
}

/** What a piece row says. */
export interface PieceFields {
  /**
   * The night it belongs to, or null — **an orphan piece exists**, measured.
   *
   * ⚠ Not a column: `production_piece.plan_id` is a uuid, and the caller turns
   * this key into one after the plan rows have been written and read back.
   */
  planKey: string | null;
  seriesCode: NonNullable<PieceColumn<"series_code">>;
  number: NonNullable<PieceColumn<"number">>;
  kind: PieceColumn<"kind">;
  partMarker: PieceColumn<"part_marker">;
  date: PieceColumn<"date">;
  origin: PieceColumn<"origin">;
  unresolvedReason: PieceColumn<"unresolved_reason">;
  /**
   * Computed for a written piece and **stored for the divergence report only**.
   *
   * Null for a proposal, and that is not an omission: a proposal's date came out
   * of the rule, so asking whether it matches the rule is a tautology and not an
   * observation. ⚠ This value reaches no pixel (D-44-10).
   */
  conformsToRule: PieceColumn<"conforms_to_rule">;
  namingConvention: PieceColumn<"naming_convention">;
  sourceSequence: PieceColumn<"source_sequence">;
  sourceLastModified: PieceColumn<"source_last_modified">;
}

/** A piece row to create. `sourceUid` is null exactly when it is a proposal. */
export interface PieceInsert extends PieceFields {
  sourceUid: string | null;
  seenAt: string;
}

/** A piece row to correct, addressed by the identifier the snapshot carried. */
export interface PieceUpdate extends PieceFields {
  id: string;
  sourceUid: string | null;
  seenAt: string;
  clearsAbsence: boolean;
}

/** What one occupied day says. */
export interface CommitmentFields {
  occurrenceDate: CommitmentColumn<"occurrence_date">;
  startTime: NonNullable<CommitmentColumn<"start_time">>;
  endTime: NonNullable<CommitmentColumn<"end_time">>;
  /** ⚠ Internal. It travels to `production_commitment.title` and nowhere else. */
  title: NonNullable<CommitmentColumn<"title">>;
  /** The recurrence rule verbatim, so a refusal keeps its own input visible. */
  recurrenceRaw: CommitmentColumn<"recurrence_raw">;
  /**
   * The parent entry's own day, or null when this row **is** the entry.
   *
   * ⚠ Not a column: `production_commitment.expanded_from` is a uuid, and the
   * caller resolves this day into one after the inserts, through that table's own
   * `(source_uid, occurrence_date)` key — never by matching a title.
   */
  expandedFromDate: CivilDate | null;
}

/** An occupied day to record. */
export interface CommitmentInsert extends CommitmentFields {
  sourceUid: string;
  seenAt: string;
}

/** An occupied day to correct. */
export interface CommitmentUpdate extends CommitmentFields {
  id: string;
  sourceUid: string;
  seenAt: string;
  clearsAbsence: boolean;
}

/** What one checklist item says. The first three fields are its unique key. */
export interface ChecklistItemFields {
  planKey: string;
  kind: ChecklistKind;
  label: string;
  dueDate: CivilDate | null;
  sortOrder: number;
}

/**
 * An item to create.
 *
 * The caller writes these `ON CONFLICT DO NOTHING`, so a re-import can neither
 * duplicate an item nor un-tick one.
 */
export type ChecklistItemInsert = ChecklistItemFields;

/**
 * An item whose **due date or position** moved.
 *
 * ⚠ It carries no tick and never will. A tick is a person recording that
 * something got done; the import has no opinion about it, and the nearest
 * precedents in this repository are all monotone guards whose reasoning does not
 * travel here.
 *
 * This list exists because lateness is computed from `due_date`
 * (`ticked_at IS NULL AND due_date < current_date`, D-44-15). Without it, moving a
 * listing in the file would leave the checklist chasing the old day — a night
 * reading as late when it is not, or on time when it is not, which is the
 * direction that hides work.
 */
export interface ChecklistItemUpdate extends ChecklistItemFields {
  id: string;
}

/**
 * A row that no longer corresponds to anything in the file.
 *
 * It carries an identifier and a code. No title, no date, no word for a space:
 * this list is a report, and a report is read in a terminal and pasted into a
 * document.
 */
export interface AbsenceRecord {
  subject: SubjectTable;
  id: string;
  sourceUid: string | null;
  reason: AbsenceReason;
  absentSince: string;
  /**
   * True when the row stands behind a night that has already been announced.
   *
   * The row survives either way — nothing here removes anything — and the flag is
   * what turns a quiet stamp into something a person is told about.
   */
  linkedToAnnouncedNight: boolean;
}

/** The file and the product disagree. A `UID` and a code, and nothing else. */
export interface DivergenceRecord {
  subject: SubjectTable;
  sourceUid: string;
  reason: DivergenceReason;
}

/**
 * The rows that were confirmed present this run, by identifier.
 *
 * A **presence stamp**, not a change: the caller refreshes `last_seen_at` on
 * these and writes nothing else. Kept apart from the update lists precisely so
 * that *"this row is still in the file"* and *"this row moved"* stay two different
 * statements — folding the first into the second would make every pass over an
 * unchanged file look like a pass full of edits.
 */
export interface SeenRows {
  plans: string[];
  pieces: string[];
  commitments: string[];
}

/**
 * The whole plan of writes. **Returned. Nothing here is applied.**
 *
 * No field targets the announced-night table, and no field removes a row from any
 * table.
 */
export interface ReconcilePlan {
  plansToInsert: PlanInsert[];
  plansToUpdate: PlanUpdate[];
  piecesToInsert: PieceInsert[];
  piecesToUpdate: PieceUpdate[];
  commitmentsToInsert: CommitmentInsert[];
  commitmentsToUpdate: CommitmentUpdate[];
  checklistItemsToInsert: ChecklistItemInsert[];
  checklistItemsToUpdate: ChecklistItemUpdate[];
  absences: AbsenceRecord[];
  divergences: DivergenceRecord[];
  /** Carried through from the parser, untouched. */
  unsupportedRecurrences: UnsupportedRecurrence[];
  /** Carried through from the classifier, untouched. */
  unclassified: UnclassifiedEntry[];
  /**
   * Series codes the file uses for which the caller supplied no pipeline rules.
   *
   * A **standing condition**, not a transition, which is why it is here and not
   * among the divergences: a night whose series has no rules owes nothing this
   * module can name, and without this field that would be a silent zero — a
   * checklist that looks complete because it is empty. A series code is a public
   * sigla half and names no date and no space.
   */
  seriesWithoutRules: string[];
  seen: SeenRows;
}

/**
 * Whether this plan would write anything at all.
 *
 * The exact question plan 44-08's check E asks of a second pass: no insert, no
 * update, no absence, no divergence.
 *
 * Three fields are **deliberately excluded** and each for its own reason.
 * {@link ReconcilePlan.seen} is a presence stamp and is non-empty on every pass
 * over a file that has been imported once. {@link ReconcilePlan.unclassified} and
 * {@link ReconcilePlan.unsupportedRecurrences} are properties of the file, so they
 * are identical on both passes by definition; counting them would make a file with
 * one unreadable entry permanently unable to settle.
 * {@link ReconcilePlan.seriesWithoutRules} is a standing gap in configuration, not
 * a write.
 */
export function isEmptyPlan(plan: ReconcilePlan): boolean {
  return (
    plan.plansToInsert.length === 0 &&
    plan.plansToUpdate.length === 0 &&
    plan.piecesToInsert.length === 0 &&
    plan.piecesToUpdate.length === 0 &&
    plan.commitmentsToInsert.length === 0 &&
    plan.commitmentsToUpdate.length === 0 &&
    plan.checklistItemsToInsert.length === 0 &&
    plan.checklistItemsToUpdate.length === 0 &&
    plan.absences.length === 0 &&
    plan.divergences.length === 0
  );
}

// ── The reconciler ──────────────────────────────────────────────────────────

/**
 * Turn a classified file plus the rows already stored into a plan of writes.
 *
 * @param input the four class lists, the two findings carried through, the
 *   credited-artist counts and the caller's expansion bound
 * @param existing what the database holds right now, read by the caller
 * @param pipelineRules what each series owes, resolved by the caller
 * @param now the instant this run is stamped with, **as a string the caller
 *   supplies**. This module has no clock; that is what lets two passes be compared
 * @returns a plan. Nothing is written. See {@link isEmptyPlan}
 */
export function reconcile(
  input: ReconcileInput,
  existing: ExistingSnapshot,
  pipelineRules: readonly SeriesPipeline[],
  now: string
): ReconcilePlan {
  const plan: ReconcilePlan = {
    plansToInsert: [],
    plansToUpdate: [],
    piecesToInsert: [],
    piecesToUpdate: [],
    commitmentsToInsert: [],
    commitmentsToUpdate: [],
    checklistItemsToInsert: [],
    checklistItemsToUpdate: [],
    absences: [],
    divergences: [],
    unsupportedRecurrences: [...input.unsupportedRecurrences],
    unclassified: [...input.unclassified],
    seriesWithoutRules: [],
    seen: { plans: [], pieces: [], commitments: [] },
  };

  const pipelineBySeries = indexPipelines(pipelineRules);

  reconcilePlans(plan, input, existing, now);
  const contexts = buildAnchorContexts(input);
  const owedByPlan = reconcilePieces(
    plan,
    input,
    existing,
    pipelineBySeries,
    contexts,
    now
  );
  reconcileCommitments(plan, input, existing, now);
  reconcileChecklist(plan, input, existing, pipelineBySeries, owedByPlan);

  return plan;
}

// ── Plans ───────────────────────────────────────────────────────────────────

function reconcilePlans(
  plan: ReconcilePlan,
  input: ReconcileInput,
  existing: ExistingSnapshot,
  now: string
): void {
  const stored = new Map<string, ExistingPlanRow>();
  for (const row of existing.plans) stored.set(row.sourceUid, row);

  const inThisFile = new Set<string>();

  for (const night of input.nights) {
    inThisFile.add(night.uid);

    const fields: PlanFields = {
      seriesCode: night.seriesCode,
      number: night.number,
      venueWord: night.venueWord,
      date: night.startDate,
      startTime: night.startTime,
      endTime: night.endTime,
      sourceSequence: night.sequence,
      sourceLastModified: night.lastModified,
    };

    const previous = stored.get(night.uid);

    if (previous === undefined) {
      plan.plansToInsert.push({
        sourceUid: night.uid,
        key: night.key,
        seenAt: now,
        ...fields,
      });
      continue;
    }

    plan.seen.plans.push(previous.id);

    // ── The monotone guard, first, because it decides whether anything is
    //    written at all. A sigla is a series code and a progressivo together, so
    //    either half moving is the same event: something already printed would be
    //    contradicted by this row.
    let siglaMoved = false;

    if (previous.number !== null && previous.number !== night.number) {
      plan.divergences.push(divergence("plan", night.uid, "number_changed"));
      siglaMoved = true;
    }

    if (previous.seriesCode !== null && previous.seriesCode !== night.seriesCode) {
      plan.divergences.push(divergence("plan", night.uid, "series_changed"));
      siglaMoved = true;
    }

    if (
      previous.sourceSequence !== null &&
      night.sequence !== null &&
      night.sequence < previous.sourceSequence
    ) {
      // Reported, and the file is still mirrored: the file is the source, and a
      // product left holding a version nobody can see is worse than a product
      // holding a version somebody has been told about.
      plan.divergences.push(divergence("plan", night.uid, "sequence_decreased"));
    }

    if (previous.linkedPartyId !== null && previous.date !== night.startDate) {
      // The plan row mirrors the file; the announced night is untouched by
      // anything in this module. The report is what makes a person look (D-44-07).
      plan.divergences.push(
        divergence("plan", night.uid, "announced_night_date_changed")
      );
    }

    if (siglaMoved) continue;

    const clearsAbsence = previous.absentSince !== null;

    if (!clearsAbsence && !planFieldsDiffer(previous, fields)) continue;

    plan.plansToUpdate.push({
      id: previous.id,
      sourceUid: night.uid,
      key: night.key,
      seenAt: now,
      clearsAbsence,
      ...fields,
    });
  }

  for (const row of existing.plans) {
    if (inThisFile.has(row.sourceUid)) continue;
    // Already reported by an earlier run. Reporting it again every run would turn
    // the import summary into noise and would stop a second pass ever settling.
    if (row.absentSince !== null) continue;

    plan.absences.push({
      subject: "plan",
      id: row.id,
      sourceUid: row.sourceUid,
      reason: "absent_from_file",
      absentSince: now,
      linkedToAnnouncedNight: row.linkedPartyId !== null,
    });

    if (row.linkedPartyId !== null) {
      plan.divergences.push(
        divergence("plan", row.sourceUid, "announced_night_row_absent")
      );
    }
  }
}

function planFieldsDiffer(previous: ExistingPlanRow, fields: PlanFields): boolean {
  return (
    previous.date !== fields.date ||
    previous.startTime !== fields.startTime ||
    previous.endTime !== fields.endTime ||
    previous.venueWord !== fields.venueWord ||
    previous.seriesCode !== fields.seriesCode ||
    previous.number !== fields.number ||
    previous.sourceSequence !== fields.sourceSequence ||
    previous.sourceLastModified !== fields.sourceLastModified
  );
}

// ── Anchors ─────────────────────────────────────────────────────────────────

/**
 * One {@link AnchorContext} per night in **this file**.
 *
 * Only this file, and that is a decision rather than a shortcut: an edition the
 * export does not carry is an edition this run knows nothing about, and computing
 * what it owes from a snapshot would produce dates for a night that may have been
 * moved or renamed in the file we are holding.
 *
 * The following edition is resolved **by date inside the same series**, which is
 * the order the calendar itself is in. Where there is none, the label is `null`:
 * naming the edition that is being waited for would mean composing a progressivo
 * that has not been assigned, and this module composes none. The surface says it
 * is waiting; the calendar supplies the name when the edition is added.
 */
function buildAnchorContexts(input: ReconcileInput): Map<string, AnchorContext> {
  const bySeries = new Map<string, ClassifiedNight[]>();
  for (const night of input.nights) {
    const bucket = bySeries.get(night.seriesCode);
    if (bucket === undefined) bySeries.set(night.seriesCode, [night]);
    else bucket.push(night);
  }

  const listingDateByPlanKey = new Map<string, CivilDate>();
  for (const piece of input.pieces) {
    if (piece.kind !== "listing") continue;
    const held = listingDateByPlanKey.get(piece.key);
    if (held === undefined || piece.date < held) {
      listingDateByPlanKey.set(piece.key, piece.date);
    }
  }

  const contexts = new Map<string, AnchorContext>();

  for (const [, editions] of bySeries) {
    const ordered = [...editions].sort(byDateThenNumber);

    for (let index = 0; index < ordered.length; index += 1) {
      const night = ordered[index];
      const following = index + 1 < ordered.length ? ordered[index + 1] : null;

      contexts.set(night.key, {
        nightDate: night.startDate,
        nextEditionDate: following === null ? null : following.startDate,
        nextEditionListingDate:
          following === null
            ? null
            : listingDateByPlanKey.get(following.key) ?? null,
        nextEditionLabel:
          following === null ? null : sigla(following.seriesCode, following.number),
        creditedArtistCount: input.creditedArtistCounts.get(night.key) ?? null,
      });
    }
  }

  return contexts;
}

function byDateThenNumber(left: ClassifiedNight, right: ClassifiedNight): number {
  if (left.startDate !== right.startDate) {
    return left.startDate < right.startDate ? -1 : 1;
  }
  return left.number - right.number;
}

/**
 * A public sigla, `<SERIES>-<NNN>`, from values read off the file.
 *
 * Composed, never computed: both halves come from an entry that exists. Padding is
 * presentation, and three digits is how production writes it.
 */
function sigla(seriesCode: string, value: number): string {
  const digits = `${value}`;
  const padded = digits.length >= 3 ? digits : `${"000".slice(digits.length)}${digits}`;
  return `${seriesCode}-${padded}`;
}

// ── Pieces ──────────────────────────────────────────────────────────────────

/** One piece destined for a plan row, in the order the checklist draws them. */
interface OwedPiece {
  kind: PieceKind;
  date: CivilDate | null;
}

type PipelineIndex = Map<string, SeriesPipeline>;

function indexPipelines(pipelines: readonly SeriesPipeline[]): PipelineIndex {
  const index: PipelineIndex = new Map();
  for (const pipeline of pipelines) {
    index.set(normaliseSeries(pipeline.seriesCode), pipeline);
  }
  return index;
}

function ruleFor(
  pipelines: PipelineIndex,
  seriesCode: string,
  kind: PieceKind
): PipelineRule | null {
  const pipeline = pipelines.get(normaliseSeries(seriesCode));
  if (pipeline === undefined) return null;
  for (const entry of pipeline.rules) {
    if (entry.kind === kind) return entry.rule;
  }
  return null;
}

function normaliseSeries(seriesCode: string): string {
  return seriesCode.trim().toUpperCase();
}

/**
 * Reconcile every piece — the ones the file writes and the ones a format owes.
 *
 * A written date always wins and **nothing recomputes it** (D-44-09b part 1). An
 * override is not a remembered edit; it is a date in the file that differs from
 * what the rule would have proposed, and this run re-reads it exactly as the last
 * one did. `conformsToRule` is worked out for the report and is drawn nowhere.
 *
 * @returns what each plan row ends up owing, which is what the checklist is built
 *   from — computed here so the two can never disagree about a date
 */
function reconcilePieces(
  plan: ReconcilePlan,
  input: ReconcileInput,
  existing: ExistingSnapshot,
  pipelines: PipelineIndex,
  contexts: Map<string, AnchorContext>,
  now: string
): Map<string, OwedPiece[]> {
  const knownPlanKeys = new Set<string>();
  for (const night of input.nights) knownPlanKeys.add(night.key);
  for (const row of existing.plans) {
    if (row.seriesCode !== null && row.number !== null) {
      knownPlanKeys.add(joinKey(row.seriesCode, row.number));
    }
  }

  const storedByUid = new Map<string, ExistingPieceRow>();
  const proposalsByGroup = new Map<string, ExistingPieceRow[]>();
  for (const row of existing.pieces) {
    if (row.sourceUid !== null) {
      storedByUid.set(row.sourceUid, row);
      continue;
    }
    if (row.seriesCode === null || row.number === null) continue;
    const group = groupKey(joinKey(row.seriesCode, row.number), row.kind);
    const bucket = proposalsByGroup.get(group);
    if (bucket === undefined) proposalsByGroup.set(group, [row]);
    else bucket.push(row);
  }
  for (const [, bucket] of proposalsByGroup) bucket.sort(byPieceDate);

  const claimed = new Set<string>();
  const owedByPlan = new Map<string, OwedPiece[]>();
  const writtenByGroup = new Map<string, ClassifiedPiece[]>();

  // ── The pieces the file carries ───────────────────────────────────────────

  const written = [...input.pieces].sort(byWrittenPieceOrder);

  for (const piece of written) {
    const planKey = knownPlanKeys.has(piece.key) ? piece.key : null;
    const context = planKey === null ? undefined : contexts.get(planKey);
    const rule = ruleFor(pipelines, piece.seriesCode, piece.kind);

    if (planKey !== null) {
      const group = groupKey(planKey, piece.kind);
      const bucket = writtenByGroup.get(group);
      if (bucket === undefined) writtenByGroup.set(group, [piece]);
      else bucket.push(piece);

      recordOwed(owedByPlan, planKey, { kind: piece.kind, date: piece.date });
    }

    const fields: PieceFields = {
      planKey,
      seriesCode: piece.seriesCode,
      number: piece.number,
      kind: piece.kind,
      partMarker: piece.partMarker,
      date: piece.date,
      origin: "file",
      unresolvedReason: null,
      conformsToRule:
        rule === null || context === undefined
          ? null
          : conformsToRule(piece.date, rule, context),
      namingConvention: piece.namingConvention,
      sourceSequence: piece.sequence,
      sourceLastModified: piece.lastModified,
    };

    const previous = storedByUid.get(piece.uid);

    if (previous !== undefined) {
      plan.seen.pieces.push(previous.id);

      let siglaMoved = false;

      if (previous.number !== null && previous.number !== piece.number) {
        plan.divergences.push(divergence("piece", piece.uid, "number_changed"));
        siglaMoved = true;
      }

      if (previous.seriesCode !== null && previous.seriesCode !== piece.seriesCode) {
        plan.divergences.push(divergence("piece", piece.uid, "series_changed"));
        siglaMoved = true;
      }

      if (
        previous.sourceSequence !== null &&
        piece.sequence !== null &&
        piece.sequence < previous.sourceSequence
      ) {
        plan.divergences.push(divergence("piece", piece.uid, "sequence_decreased"));
      }

      if (siglaMoved) continue;

      const clearsAbsence = previous.absentSince !== null;
      if (!clearsAbsence && !pieceFieldsDiffer(previous, fields)) continue;

      plan.piecesToUpdate.push({
        id: previous.id,
        sourceUid: piece.uid,
        seenAt: now,
        clearsAbsence,
        ...fields,
      });
      continue;
    }

    // No row carries this `UID`. Before creating one, adopt the proposal this
    // piece has just come to occupy — otherwise the night ends up holding both a
    // computed date and the written one that supersedes it, which is the doubled
    // checklist `production_checklist_item`'s unique key exists to prevent, one
    // table over.
    const adopted =
      planKey === null
        ? undefined
        : claimNextProposal(proposalsByGroup, claimed, groupKey(planKey, piece.kind));

    if (adopted !== undefined) {
      plan.seen.pieces.push(adopted.id);
      plan.piecesToUpdate.push({
        id: adopted.id,
        sourceUid: piece.uid,
        seenAt: now,
        clearsAbsence: adopted.absentSince !== null,
        ...fields,
      });
      continue;
    }

    plan.piecesToInsert.push({ sourceUid: piece.uid, seenAt: now, ...fields });
  }

  // ── The pieces a format owes and the file does not carry ──────────────────

  const seriesMissingRules = new Set<string>();

  for (const night of input.nights) {
    const pipeline = pipelines.get(normaliseSeries(night.seriesCode));

    if (pipeline === undefined) {
      seriesMissingRules.add(normaliseSeries(night.seriesCode));
      continue;
    }

    const context = contexts.get(night.key);
    if (context === undefined) continue;

    for (const entry of pipeline.rules) {
      const already =
        writtenByGroup.get(groupKey(night.key, entry.kind))?.length ?? 0;

      const episodes = owedEpisodeCount(entry.rule, context);

      if (episodes === null || !entry.rule.derivable || episodes <= already) {
        // Either the count is the line-up's and the line-up is not known, or the
        // rule refuses to derive a date at all, or the file already carries every
        // episode. In the first two cases the night still owes the piece and the
        // reason has to be recorded — but only when nothing of that kind is
        // written, because a night that already has one is not waiting for it.
        if (already > 0) continue;

        const refusal = proposePieceDate(entry.rule, context, 0);
        if (!("unresolved" in refusal)) continue;

        emitProposal(
          plan,
          proposalsByGroup,
          claimed,
          owedByPlan,
          night,
          entry.kind,
          null,
          refusal.unresolved,
          now
        );
        continue;
      }

      for (let episode = already; episode < episodes; episode += 1) {
        const proposal = proposePieceDate(entry.rule, context, episode);

        if ("unresolved" in proposal) {
          if (already > 0) break;
          emitProposal(
            plan,
            proposalsByGroup,
            claimed,
            owedByPlan,
            night,
            entry.kind,
            null,
            proposal.unresolved,
            now
          );
          break;
        }

        emitProposal(
          plan,
          proposalsByGroup,
          claimed,
          owedByPlan,
          night,
          entry.kind,
          proposal.date,
          null,
          now
        );
      }
    }
  }

  plan.seriesWithoutRules = [...seriesMissingRules].sort();

  // ── Rows that no longer correspond to anything ────────────────────────────

  const uidsInThisFile = new Set(input.pieces.map((piece) => piece.uid));

  for (const row of existing.pieces) {
    if (row.absentSince !== null) continue;

    if (row.sourceUid !== null) {
      if (uidsInThisFile.has(row.sourceUid)) continue;
      plan.absences.push({
        subject: "piece",
        id: row.id,
        sourceUid: row.sourceUid,
        reason: "absent_from_file",
        absentSince: now,
        linkedToAnnouncedNight: false,
      });
      continue;
    }

    if (claimed.has(row.id)) continue;

    plan.absences.push({
      subject: "piece",
      id: row.id,
      sourceUid: null,
      reason: "no_longer_owed",
      absentSince: now,
      linkedToAnnouncedNight: false,
    });
  }

  return owedByPlan;
}

/**
 * How many episodes a rule produces, or null when only the line-up knows.
 *
 * ⚠ It mirrors `knownEpisodeCount` in `./anchors`, which is not exported. Three
 * lines are duplicated here rather than widening that module's surface from a plan
 * that does not own the file; the pair has to be read together, and the cost of
 * them drifting is a loop that asks `proposePieceDate` for an episode the rule
 * does not have — which throws rather than returning a wrong date, so the drift is
 * loud.
 */
function owedEpisodeCount(rule: PipelineRule, context: AnchorContext): number | null {
  if (rule.episodesFromLineup) {
    if (rule.episodeCount !== null) return rule.episodeCount;
    return context.creditedArtistCount;
  }
  return rule.episodeCount ?? 1;
}

/**
 * Put one proposed piece in the plan, reusing the row a previous run created for
 * it where there is one.
 *
 * A proposal has no `UID`, so this is where its idempotence is honoured: the
 * proposals of a `(plan, kind)` group are consumed in order, and a group whose
 * dates have not moved produces no write at all on a second pass.
 */
function emitProposal(
  plan: ReconcilePlan,
  proposals: Map<string, ExistingPieceRow[]>,
  claimed: Set<string>,
  owedByPlan: Map<string, OwedPiece[]>,
  night: ClassifiedNight,
  kind: PieceKind,
  date: CivilDate | null,
  unresolved: UnresolvedReason | null,
  now: string
): void {
  recordOwed(owedByPlan, night.key, { kind, date });

  const fields: PieceFields = {
    planKey: night.key,
    seriesCode: night.seriesCode,
    number: night.number,
    kind,
    partMarker: null,
    date,
    origin: "proposed",
    unresolvedReason: unresolved,
    conformsToRule: null,
    // NOT NULL in the column, and a proposal is written in no grammar because it
    // is written nowhere. It carries the convention it would be written in the day
    // somebody writes it.
    namingConvention: "canonical",
    sourceSequence: null,
    sourceLastModified: null,
  };

  const reused = claimNextProposal(proposals, claimed, groupKey(night.key, kind));

  if (reused === undefined) {
    plan.piecesToInsert.push({ sourceUid: null, seenAt: now, ...fields });
    return;
  }

  plan.seen.pieces.push(reused.id);

  const clearsAbsence = reused.absentSince !== null;
  if (!clearsAbsence && !pieceFieldsDiffer(reused, fields)) return;

  plan.piecesToUpdate.push({
    id: reused.id,
    sourceUid: null,
    seenAt: now,
    clearsAbsence,
    ...fields,
  });
}

function claimNextProposal(
  proposals: Map<string, ExistingPieceRow[]>,
  claimed: Set<string>,
  group: string
): ExistingPieceRow | undefined {
  const bucket = proposals.get(group);
  if (bucket === undefined) return undefined;

  for (const row of bucket) {
    if (claimed.has(row.id)) continue;
    claimed.add(row.id);
    return row;
  }

  return undefined;
}

function pieceFieldsDiffer(previous: ExistingPieceRow, fields: PieceFields): boolean {
  return (
    previous.seriesCode !== fields.seriesCode ||
    previous.number !== fields.number ||
    previous.kind !== fields.kind ||
    previous.partMarker !== fields.partMarker ||
    previous.date !== fields.date ||
    previous.origin !== fields.origin ||
    previous.unresolvedReason !== fields.unresolvedReason ||
    previous.conformsToRule !== fields.conformsToRule ||
    previous.namingConvention !== fields.namingConvention ||
    previous.sourceSequence !== fields.sourceSequence ||
    previous.sourceLastModified !== fields.sourceLastModified
  );
}

/**
 * The order pieces of one kind are read in, which is also the order their
 * checklist labels are numbered in.
 *
 * By date first, so that a night's three LiveCuts number themselves in the order
 * they go out; then by the part marker and finally by `UID`, so the answer is the
 * same on every run even where two pieces share a day.
 */
function byWrittenPieceOrder(left: ClassifiedPiece, right: ClassifiedPiece): number {
  if (left.date !== right.date) return left.date < right.date ? -1 : 1;
  const leftMarker = left.partMarker ?? "";
  const rightMarker = right.partMarker ?? "";
  if (leftMarker !== rightMarker) return leftMarker < rightMarker ? -1 : 1;
  if (left.uid === right.uid) return 0;
  return left.uid < right.uid ? -1 : 1;
}

/** Proposals of one group, dated first and undated last. */
function byPieceDate(left: ExistingPieceRow, right: ExistingPieceRow): number {
  if (left.date === right.date) return left.id < right.id ? -1 : 1;
  if (left.date === null) return 1;
  if (right.date === null) return -1;
  return left.date < right.date ? -1 : 1;
}

function groupKey(planKey: string, kind: PieceKind): string {
  return `${planKey} ${kind}`;
}

function recordOwed(
  owedByPlan: Map<string, OwedPiece[]>,
  planKey: string,
  owed: OwedPiece
): void {
  const bucket = owedByPlan.get(planKey);
  if (bucket === undefined) owedByPlan.set(planKey, [owed]);
  else bucket.push(owed);
}

// ── Commitments ─────────────────────────────────────────────────────────────

/**
 * Reconcile the days that are taken by something which is not ours.
 *
 * A recurring entry expands into one row per occupied day, and the entry's own day
 * is always among them: the expansion answers *which other days*, never *whether
 * this one*. Where the rule is one this pipeline refuses to expand, the entry
 * still occupies its own day and the refusal is already in the parser's own
 * finding list — carried through untouched, so a rule that was refused stays
 * visible instead of becoming a week that looks free.
 */
function reconcileCommitments(
  plan: ReconcilePlan,
  input: ReconcileInput,
  existing: ExistingSnapshot,
  now: string
): void {
  const stored = new Map<string, ExistingCommitmentRow>();
  for (const row of existing.commitments) {
    stored.set(occurrenceKey(row.sourceUid, row.occurrenceDate), row);
  }

  const producedThisRun = new Set<string>();

  for (const commitment of input.commitments) {
    for (const occurrence of occurrencesOf(commitment, input.recurrenceOccurrenceCap)) {
      const key = occurrenceKey(commitment.uid, occurrence);
      producedThisRun.add(key);

      const fields: CommitmentFields = {
        occurrenceDate: occurrence,
        startTime: commitment.startTime,
        endTime: commitment.endTime,
        title: commitment.title,
        recurrenceRaw: commitment.recurrenceRaw,
        expandedFromDate: occurrence === commitment.date ? null : commitment.date,
      };

      const previous = stored.get(key);

      if (previous === undefined) {
        plan.commitmentsToInsert.push({
          sourceUid: commitment.uid,
          seenAt: now,
          ...fields,
        });
        continue;
      }

      plan.seen.commitments.push(previous.id);

      const clearsAbsence = previous.absentSince !== null;
      if (!clearsAbsence && !commitmentFieldsDiffer(previous, fields)) continue;

      plan.commitmentsToUpdate.push({
        id: previous.id,
        sourceUid: commitment.uid,
        seenAt: now,
        clearsAbsence,
        ...fields,
      });
    }
  }

  for (const row of existing.commitments) {
    if (row.absentSince !== null) continue;
    if (producedThisRun.has(occurrenceKey(row.sourceUid, row.occurrenceDate))) continue;

    plan.absences.push({
      subject: "commitment",
      id: row.id,
      sourceUid: row.sourceUid,
      reason: "absent_from_file",
      absentSince: now,
      linkedToAnnouncedNight: false,
    });
  }
}

function occurrencesOf(
  commitment: ClassifiedCommitment,
  cap: number
): readonly CivilDate[] {
  if (commitment.recurrenceRaw === null) return [commitment.date];

  const expanded = expandWeeklyRecurrence(commitment.recurrenceRaw, commitment.date, cap);

  const days = new Set<CivilDate>([commitment.date]);
  for (const day of expanded) days.add(day);

  return [...days].sort();
}

function occurrenceKey(sourceUid: string, occurrence: CivilDate): string {
  return `${sourceUid} ${occurrence}`;
}

function commitmentFieldsDiffer(
  previous: ExistingCommitmentRow,
  fields: CommitmentFields
): boolean {
  return (
    previous.startTime !== fields.startTime ||
    previous.endTime !== fields.endTime ||
    previous.title !== fields.title ||
    previous.recurrenceRaw !== fields.recurrenceRaw
  );
}

// ── The checklist ───────────────────────────────────────────────────────────

/**
 * What each night in this file has to get done, regenerated from what it owes.
 *
 * The **piece** items are built from the very list {@link reconcilePieces}
 * produced, so a due date and the piece it belongs to cannot disagree.
 *
 * A label is `<Kind>` for the first piece of that kind and `<Kind> N` for the
 * ones after it. That rule is chosen for one property: it does not depend on
 * whether the piece is written or proposed, so a proposal that later arrives in
 * the file keeps the same label and the item that somebody may already have ticked
 * is neither duplicated nor reopened.
 *
 * ⚠ The four production steps carry **no due date**, and the gap is declared
 * rather than filled: what they are anchored to is not written down anywhere —
 * `production_pipeline_rule` holds the editorial anchors and no others — and this
 * module derives no date that table does not carry. The consequence is exact and
 * has to be read: lateness is `ticked_at IS NULL AND due_date < current_date`
 * (D-44-15), so an item with no due date never reads as late. Deciding those four
 * anchors is the work that closes it.
 */
function reconcileChecklist(
  plan: ReconcilePlan,
  input: ReconcileInput,
  existing: ExistingSnapshot,
  pipelines: PipelineIndex,
  owedByPlan: Map<string, OwedPiece[]>
): void {
  const stored = new Map<string, ExistingChecklistItemRow>();
  for (const row of existing.checklistItems) {
    stored.set(checklistKey(row.planKey, row.kind, row.label), row);
  }

  for (const night of input.nights) {
    const owed = owedByPlan.get(night.key) ?? [];
    const seenOfKind = new Map<PieceKind, number>();
    const items: ChecklistItemFields[] = [];

    for (const piece of owed) {
      const ordinal = (seenOfKind.get(piece.kind) ?? 0) + 1;
      seenOfKind.set(piece.kind, ordinal);

      const base = PIECE_KIND_LABELS[piece.kind];

      items.push({
        planKey: night.key,
        kind: "piece",
        label: ordinal === 1 ? base : `${base} ${ordinal}`,
        dueDate: piece.date,
        sortOrder: items.length,
      });
    }

    const pipeline = pipelines.get(normaliseSeries(night.seriesCode));

    for (const step of PRODUCTION_STEP_ORDER) {
      if (step === "space_approval" && pipeline?.requiresSpaceApproval !== true) {
        continue;
      }

      items.push({
        planKey: night.key,
        kind: step,
        label: PRODUCTION_STEP_LABELS[step],
        dueDate: null,
        sortOrder: items.length,
      });
    }

    for (const item of items) {
      const previous = stored.get(checklistKey(item.planKey, item.kind, item.label));

      if (previous === undefined) {
        plan.checklistItemsToInsert.push(item);
        continue;
      }

      if (previous.dueDate === item.dueDate && previous.sortOrder === item.sortOrder) {
        continue;
      }

      plan.checklistItemsToUpdate.push({ id: previous.id, ...item });
    }
  }
}

function checklistKey(planKey: string, kind: ChecklistKind, label: string): string {
  return `${planKey} ${kind} ${label}`;
}

// ── Findings ────────────────────────────────────────────────────────────────

/** A divergence is an identifier and a code. Nothing else may be added here. */
function divergence(
  subject: SubjectTable,
  sourceUid: string,
  reason: DivergenceReason
): DivergenceRecord {
  return { subject, sourceUid, reason };
}
