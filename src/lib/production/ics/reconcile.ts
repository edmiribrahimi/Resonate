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
 * `classify.ts` has **no write to withhold**. This one does — and since `ICS-01`
 * the writes it withholds include **removals**, which is a harder thing to hold
 * back than an insert. {@link reconcile} opens no connection, takes no client,
 * and returns a {@link ReconcilePlan} that the caller applies. That is what makes
 * a **dry run** possible, and in a repository with no test runner a dry run is
 * the only rehearsal there is: the plan can be counted, printed as codes, and
 * compared with the plan of the previous pass before a single row moves.
 *
 * ── ⚠ THIS MODULE PLANS A MIRROR, AND A MIRROR DELETES (ICS-01) ─────────────
 *
 * Until this phase the reconciler produced field-by-field corrections and could
 * remove nothing. It now produces the plan of a **mirror**: *delete this scope,
 * in this order, except these rows; write everything the file carries; put these
 * two pieces of human state back.* {@link ReconcilePlan.deletionScope} is where
 * that begins, and its docblock carries the deletion order together with the
 * three foreign-key facts that oblige it — **in this file**, not in a phase
 * document, because the next person to change the order will be reading this.
 *
 * The reason the old shape had to go is measured rather than argued. It defended
 * three things — ticks, links and proposals — and **only one of the three
 * existed**: 14 checklist items with **zero** ticked, 2 plan rows with **zero**
 * linked, 6 proposals. Defending state that was not there broke the one thing
 * that was: 66 false absences, then 17 stamps nothing would clear, then an
 * asymmetry between tables that existed only to manage those stamps.
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
 * Under the mirror the caller no longer needs `ON CONFLICT (source_uid) DO UPDATE`
 * — it deletes the scope and inserts — but the key is **more** load bearing than
 * it was, not less. It is the identity the two exceptions of `ICS-03` re-attach
 * on: a tick keys on `(plan source_uid, kind, label)` and a link keys on
 * `production_plan.source_uid`, because the `uuid` those rows carried is
 * **generated** and does not survive a delete. For an expanded recurrence the key
 * is `UID` **plus the occurrence date**, because one `UID` covers many days and a
 * single-column key would collapse a season of occupied Thursdays into one row,
 * leaving every other Thursday looking free.
 *
 * Idempotence used to have a weaker corner, and the mirror removes it rather than
 * hiding it: a **proposal** has no `UID`, so a previous run's proposal used to be
 * adopted by consulting the snapshot, by hand, with no constraint behind it.
 * `ICS-06` says proposals are recomputed every run — they are deleted with the
 * rest of the scope and written again — so there is nothing left to adopt and no
 * hand-held obligation to carry.
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
 * ⚠ **Where the progressivo is guarded now, and it is not here.** A mirror never
 * issues an `UPDATE`, so plan 44-04's `BEFORE UPDATE OF number` trigger — the
 * third of this project's monotone guards, made structural — stops firing without
 * a line of SQL saying so. D-58-01 moves the guard rather than dropping it: the
 * writer compares the snapshot's progressivi against the arriving ones **before**
 * deleting anything and refuses the whole run when a known `source_uid` brings a
 * different number. That refusal is `ICS-01b` and it lives in the writer, which
 * is the only place left for it; this module emits no divergence for it, because
 * a run that is going to be refused has no plan worth reporting.
 *
 * ── ⚠ AN ENTRY THAT VANISHES IS SIMPLY NOT WRITTEN AGAIN ────────────────────
 *
 * This module used to stamp such a row absent and remove nothing. Under the
 * mirror there is no stamp: the scope is deleted and the file is written back, so
 * a row the file no longer carries **is not there** — which is a different
 * sentence from *absent*, and the historical note beside
 * {@link MIRRORED_TABLES} keeps the difference from being rediscovered the hard
 * way.
 *
 * The one thing that does **not** follow the file out is a plan row standing
 * behind an announced night. `ICS-03b` (D-58-02) keeps it, unconditionally,
 * whatever the file says: removing it would orphan a night that may have tickets
 * on sale, which is exactly the harm D-44-06 separates the two tables to prevent.
 * That is an exception of **survival** and it is not one of the two exceptions of
 * **state**: the two of `ICS-03` re-attach after the rewrite, this one never
 * leaves. It is {@link ReconcilePlan.plansThatSurviveDeletion}, a list of its own
 * so the report can count it, and the three are named apart so no reader can fold
 * them into one.
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
 * neither is interpreted — and under the mirror **neither is compared**, because
 * there is no previous value left to compare against: the row carrying it was
 * deleted before this one was written. They are columns the file fills, kept
 * because the file fills them and because a run summary that can say *this entry
 * was revised* is worth the two columns.
 *
 * ── ⚠ WHAT A FINDING MAY CARRY ──────────────────────────────────────────────
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
 * That two consecutive mirrors leave the **same set of rows**. That is the claim
 * `ICS-01` actually makes, and it is a different claim from the one this file
 * used to make: under the mirror a second pass plans a full delete and a full
 * rewrite every time, so *"the second plan is empty"* is not merely false, it is
 * the wrong question. {@link isEmptyPlan} answers a narrower one — *would this
 * run touch a row at all* — and check **E** of `scripts/verify-ics-import.mjs`
 * asserts the real one by comparing the two resulting row sets.
 * **Nothing here claims a criterion of this phase is satisfied.**
 */

import { PIECE_KIND_LABELS } from "./vocabulary";
import type { CalendarKey, CivilDate, PieceKind, UnresolvedReason } from "./vocabulary";
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
  UnclassifiedReason,
} from "./classify";
import {
  attachmentWindowDays,
  conformsToRule,
  proposePieceDate,
  recognisesEdition,
} from "./anchors";
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
 * The three tables this module mirrors. **Three, and the count is the point.**
 *
 * A mirror is a scope of deletion, so the list of what is inside it has to be
 * written down rather than remembered — and remembering it wrong has a specific
 * shape here. A phrase counting the calendar's tables at **six** runs through
 * the comments of this directory, and read as a scope of deletion it is wrong in
 * the one direction that costs something: two of those six must never be deleted.
 * The count is not spelled out again here, so that a grep for it lands on the
 * places that still need correcting rather than on the sentence correcting them.
 *
 * - `production_pipeline_rule` is **configuration**. The import reads it and has
 *   never written it. It is also the table whose rows a cascade already took away
 *   once, in phase 48, when a format was deleted and nobody had enumerated what
 *   pointed at it.
 * - `production_import_run` is the **register**, and it is the only diagnostic
 *   instrument this domain owns: comparing its rows against the timestamps on the
 *   17 false absence stamps is what dated them. Deleting it would destroy the
 *   thing that finds the next defect of this kind. Its `calendar_key` column
 *   therefore stays nullable forever, on purpose — a register that filled in its
 *   own history to look complete would have started lying about the past it
 *   exists to keep.
 *
 * `production_checklist_item` is not on this list either, and for a third reason:
 * it carries no `calendar_key` of its own. It is inside the scope **through its
 * plan row**, which is why the deletion order below opens with it.
 */
export const MIRRORED_TABLES = [
  "production_plan",
  "production_piece",
  "production_commitment",
] as const;

/** One of the three tables a mirror rewrites. */
export type MirroredTable = (typeof MIRRORED_TABLES)[number];

/**
 * ── HISTORICAL NOTE — the two absence codes, and why there is now neither ────
 *
 * Until `ICS-01` this module owned two vocabularies that no longer have a
 * producer, and one of them encoded a distinction worth keeping the memory of.
 * Deleting the prose along with the code would lose the reason and the next
 * reader would reopen the question from scratch, so it is written here instead.
 *
 * **The absence vocabulary had two members, and they were two on purpose:**
 *
 * - `absent_from_file` — the row was in a previous export and is not in this one.
 * - `no_longer_owed` — a **proposal** the pipeline rules no longer call for. It
 *   had never been in the file, so the first code would have been a lie about
 *   where the row came from.
 *
 * **Why the distinction no longer has an object.** Both codes answered the same
 * question — *why is this row still here when nothing corresponds to it?* — and a
 * mirror never lets that question arise. The row is deleted with its scope and
 * written again only if the file carries it. **An entry the file does not carry
 * is not *absent*: it is not there.** There is no row left to explain, so there
 * is no reason code to choose between.
 *
 * The same sentence disposes of the divergence vocabulary and its five members. A
 * divergence was the file and a stored row disagreeing; delete-and-rewrite leaves
 * no stored row to disagree with. The one member that named a real hazard rather
 * than a disagreement — a known `source_uid` arriving with a different
 * progressivo — did not disappear with it: it became `ICS-01b`, a **refusal of
 * the whole run** in the writer, which is a stronger answer than a line in a
 * report nobody has to read (D-58-01).
 *
 * **What this cost, and it is measured.** The defence those vocabularies existed
 * for produced 66 false absences and then 17 stamps that nothing would clear.
 *
 * The two columns they wrote — the absence stamp on each of the three tables
 * above, and the divergence list on the register — are **not** dropped by this
 * phase: dropping a column is a one-way door taken on an order, and the first
 * mirror leaves them empty on every row anyway. What this module does is remove
 * every path that writes them, and a source assertion in
 * `scripts/verify-ics-import.mjs` holds that shut.
 *
 * ⚠ **The absence stamp's column name is deliberately not spelled anywhere in
 * this file**, not in code and not in the sentence forbidding it, for the reason
 * `src/app/(admin)/admin/formats/actions.ts:58-63` gives about its own forbidden
 * literal: *a grep whose only match is the sentence forbidding the thing is a
 * grep that gets ignored the third time it goes red.* The assertion in the gate
 * has nothing here to find, and that is what makes it worth running.
 */

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
  /**
   * WHICH CALENDAR this run mirrors. **Required, and there is no default.**
   *
   * It is the one condition that selects the rows the mirror deletes, so it is
   * the single most consequential argument this module takes. It is **declared**
   * by the caller and never inferred: the owner's snapshots carry the same
   * calendar-level name, the parser exposes no calendar-level property at all,
   * and a filename carries a date rather than a scope. A default here would be
   * the step somebody eventually skips, on the argument that decides what gets
   * deleted (`ICS-02`, D-58-06).
   */
  calendarKey: CalendarKey;
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
  /**
   * Set once the night has been announced, and **the whole of `ICS-03b`**.
   *
   * Non-null here means the row never enters the deletion scope, whatever the
   * file says, and it is also the key half of the link that gets put back on the
   * rows that do. Both readings are in {@link reconcile}.
   */
  linkedPartyId: PlanColumn<"linked_party_id">;
}

/**
 * A `production_checklist_item` row as it stands.
 *
 * ⚠ **It is read for exactly one purpose: the ticks.** Everything else about it
 * is regenerated from the file every run, so the due date and the position are
 * not here — asking the caller for columns nothing reads would be a read paid for
 * nothing.
 *
 * ⚠ **`planSourceUid`, and not the caller's join key.** The row's own `plan_id`
 * is a generated `uuid` that does not survive the delete, and the join key is
 * composed from the sigla, which is **content** the file can change. The identity
 * is `source_uid`, which is the identity this project already chose and already
 * wrote down its reasons for. The caller reads it by joining the item's plan row;
 * that join is the first step of the restore procedure and it happens **before**
 * anything is deleted.
 */
export interface ExistingChecklistItemRow {
  id: ChecklistColumn<"id">;
  /** ⚠ Not a column of this table — `production_plan.source_uid`, joined by the caller. */
  planSourceUid: string;
  kind: ChecklistColumn<"kind">;
  label: ChecklistColumn<"label">;
  /** Null on an item nobody has ticked. Such an item carries no state to keep. */
  tickedAt: ChecklistColumn<"ticked_at">;
  tickedBy: ChecklistColumn<"ticked_by">;
  /** ⚠ A person's name. Never printed, never written into a tracked artefact. */
  tickedByName: ChecklistColumn<"ticked_by_name">;
}

/**
 * What the database holds that a mirror still has to know about.
 *
 * ⚠ **Two lists, where there used to be four, and the shrinkage is the shape of
 * `ICS-01` rather than an economy.** A reconciler that corrected rows needed the
 * stored pieces and the stored commitments to know what had moved. A mirror does
 * not: it deletes them and writes the file back, so *what they used to say* has
 * no bearing on anything it plans. Asking the caller to read two tables it will
 * not consult would be a read paid for nothing — and worse, a shape that implies
 * this module still compares.
 *
 * What survives the shrinkage is exactly the state the calendar cannot say:
 *
 * - `plans` — for the survival exception of `ICS-03b` and for the link that goes
 *   back on afterwards. It is also what the writer holds the arriving progressivi
 *   against before deleting anything (`ICS-01b`, D-58-01).
 * - `checklistItems` — for the ticks, which are the other exception of `ICS-03`.
 */
export interface ExistingSnapshot {
  plans: readonly ExistingPlanRow[];
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
  /**
   * Which calendar this row was mirrored from — see {@link DeletionScope}.
   *
   * ⚠ **The same value on every row of one run, and it is the boundary of the
   * NEXT run's deletion.** A row written without it is a row the next mirror
   * cannot see to remove; a row written with the wrong one is a row a mirror of a
   * different calendar will delete.
   */
  calendarKey: CalendarKey;
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
  seriesCode: PieceColumn<"series_code">;
  /**
   * The progressivo the **title** carried, or `null` where it carried none.
   *
   * ⚠ Loosened from `NonNullable` by `ICS-04`/`ICS-05`, and the null is load
   * bearing rather than permissive. A piece joined to its night by date knows
   * *which* night — that is `planKey` — and the progressivo is one join away in
   * the plan row. Storing it here as well would be a second copy of a value the
   * database already holds, and the second copy is the one that would be
   * **derived**: a progressivo is a monotone guard, and the surest way not to
   * invent one is to have nowhere to write it.
   */
  number: PieceColumn<"number">;
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
  /** Which calendar this row was mirrored from. See {@link PlanInsert.calendarKey}. */
  calendarKey: CalendarKey;
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
  /** Which calendar this row was mirrored from. See {@link PlanInsert.calendarKey}. */
  calendarKey: CalendarKey;
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

// ── The scope of deletion, and the three exceptions ─────────────────────────

/**
 * The order the four tables are emptied in. **Obligated, not preferred.**
 *
 * Each step below is obligated by a foreign key that was read from the
 * constraints rather than remembered — there are exactly three pointing into the
 * mirrored tables, and all three are in this list:
 *
 * **1. `production_checklist_item` first.** Its `plan_id` reference is
 * `ON DELETE CASCADE`, and it is the only cascade in the calendar's schema. A
 * cascade is a write path nobody declared, so it is declared here: deleting a
 * plan row takes its checklist items away **and the ticks on them**. Emptying
 * this table explicitly, first, is what makes the number of ticks about to be
 * lost a number somebody counted instead of a side effect nobody saw. By the
 * time step 3 runs, the cascade finds nothing left to take.
 *
 * ⚠ This table carries no `calendar_key` of its own, so its step is scoped
 * **through the plan rows the same scope selects** — never by a second,
 * independently written condition. Two selectors over the same rows is how one of
 * them ends up wider than the other.
 *
 * ⚠ **And it covers EVERY plan row the key selects, survivors included.** The
 * survival exception of `ICS-03b` subtracts from step 3, not from this one, and
 * that is deliberate rather than an oversight: the checklist is regenerated from
 * the file every run, so leaving one night's items behind would produce a
 * checklist half from this run and half from a previous one — a state nobody can
 * read and no report can explain. It is also why
 * {@link ReconcilePlan.ticksToRestore} collects the ticks of **all** plan rows
 * and not only the ones being deleted.
 *
 * **2. `production_piece` before `production_plan`.** Its `plan_id` reference is
 * `NO ACTION`, the default, so deleting a plan row that still has pieces raises a
 * foreign-key violation. The pieces go first or the third step fails.
 *
 * **3. `production_plan`.**
 *
 * **4. `production_commitment`, and ⚠ IN ONE `DELETE`.** Its `expanded_from` is a
 * self-reference, also `NO ACTION`, and `NO ACTION` is checked **at the end of
 * the statement**: a single statement that carries parent and children away
 * together passes, while two statements in the wrong order do not. There is no
 * ordering to get right inside this step — there is a rule not to split it.
 *
 * The table is independent of the first three, which is why it can come last; it
 * comes last rather than first only so the three that constrain each other stay
 * adjacent and readable.
 */
export const MIRROR_DELETION_ORDER = [
  "production_checklist_item",
  "production_piece",
  "production_plan",
  "production_commitment",
] as const;

/** One step of {@link MIRROR_DELETION_ORDER}. */
export type MirrorDeletionStep = (typeof MIRROR_DELETION_ORDER)[number];

/**
 * What the mirror removes before it writes anything.
 *
 * ⚠ **The calendar key is the ONLY condition that selects.** It is not a filter
 * the caller applies to a list of identifiers this module computed; it is the
 * `WHERE` itself. The direction of the mistake is the reason: a condition that
 * selects too widely deletes **more** than it should, and this project has
 * already paid for that once — a selector that walked up a page until it matched
 * every delete control took two real events and, by cascade, 63 rows across seven
 * tables, none of them recoverable. A narrow condition that is wrong finds
 * nothing.
 *
 * The one thing that narrows it further is
 * {@link ReconcilePlan.plansThatSurviveDeletion}, and narrowing is the safe
 * direction. It is **not** repeated here as a second list of identifiers: two
 * spellings of one fact is how the two start to differ.
 */
export interface DeletionScope {
  /** The single declared condition of every statement in {@link DeletionScope.order}. */
  calendarKey: CalendarKey;
  /** {@link MIRROR_DELETION_ORDER}, carried here so an executor cannot invent its own. */
  order: readonly MirrorDeletionStep[];
}

/**
 * A plan row that is **not deleted**, whatever the file says (`ICS-03b`, D-58-02).
 *
 * ⚠ **This is an exception of SURVIVAL, and it is not one of the two exceptions
 * of STATE.** The distinction is the whole reason it has a list of its own:
 *
 * - the two of `ICS-03` — {@link ChecklistTickRestore} and
 *   {@link AnnouncedNightLinkRestore} — describe state that **goes away and comes
 *   back**, re-attached afterwards by the file's own identity;
 * - this one describes a row that **never leaves**.
 *
 * Folding them together would make this the third undeclared exception that
 * `ICS-03` exists to forbid. The reason is written in the importer's contract and
 * survives the mirror word for word: removing such a row would orphan a night
 * that may have tickets on sale.
 *
 * ⚠ **A surviving row is also skipped by the insert list**, and the consequence
 * has to be read rather than discovered: `production_plan.source_uid` is unique,
 * so a row that stays and is written again is a constraint violation that fails
 * the whole run. What follows is that **a plan row standing behind an announced
 * night stops mirroring the file** — a date moved in the calendar under an
 * announced night no longer reaches that row. That narrows D-44-07, which used to
 * report the move and mirror it anyway, and the narrowing is deliberate: mirroring
 * it now would mean deleting and rewriting the one row whose disappearance orphans
 * a night with tickets on sale, across a gap that holds no transaction.
 */
export interface SurvivingPlanRow {
  id: string;
  sourceUid: string;
  /**
   * True when this file no longer carries the entry.
   *
   * ⚠ **This is the flag the report counts** (D-58-02). A row surviving while the
   * file still carries it is the frozen case above; a row surviving an **absence**
   * is the one that says somebody should look, because the cause may be a partial
   * export or the wrong file.
   */
  absentFromFile: boolean;
}

/**
 * A tick to put back — the first of the two exceptions of state (`ICS-03`).
 *
 * ⚠ **The key is the file's, not the database's.** `production_checklist_item`'s
 * own unique key is `(plan_id, kind, label)` and `plan_id` is a **generated**
 * `uuid`: it does not survive a delete. `source_uid` does, because the file
 * maintains it across edits and the project has already written down why the
 * alternatives do not — a title changes when the owner renames a night,
 * `(date, title)` changes twice over, and a content digest changes on **every**
 * edit, which is the opposite of an identity.
 *
 * ⚠ **A RESTORE IS NOT A TICK.** The three fields below are the **originals**,
 * carried through untouched, and the caller must not write them through
 * `record_checklist_tick`: that function re-records who ticked, so a restore run
 * through it would attribute every tick in the calendar to whoever launched the
 * import.
 *
 * ⚠ `tickedByName` is a **person's name**. It travels in memory, to its column,
 * and nowhere else — not into a report, not into a terminal, and above all not
 * into a tracked artefact. Artefacts name roles.
 */
export interface ChecklistTickRestore {
  /** The plan row's identity as the file spells it. */
  planSourceUid: string;
  kind: ChecklistKind;
  label: string;
  /** The original instant. Not now. */
  tickedAt: NonNullable<ChecklistColumn<"ticked_at">>;
  /** The original actor. Not the caller. */
  tickedBy: ChecklistColumn<"ticked_by">;
  /** ⚠ The original name. Never printed. */
  tickedByName: ChecklistColumn<"ticked_by_name">;
}

/**
 * A link to put back — the second of the two exceptions of state (`ICS-03`).
 *
 * Keyed on `production_plan.source_uid` for {@link ChecklistTickRestore}'s reason:
 * the row's `id` is generated and does not survive the rewrite.
 *
 * ⚠ **Every linked row appears here, including the ones that survive the
 * deletion** — so this list and {@link SurvivingPlanRow} overlap rather than
 * partition, and the overlap is on purpose. It is the only copy of the link that
 * exists across a delete with no transaction behind it, and it is what keeps a
 * later narrowing of `ICS-03b` from dropping a link in silence.
 */
export interface AnnouncedNightLinkRestore {
  planSourceUid: string;
  linkedPartyId: NonNullable<PlanColumn<"linked_party_id">>;
}

/* ── ⚠ ICS-03 IS THE BOUNDARY, AND IT HAS TO BE DEFENDED IN TIME ─────────────
 *
 * The two restore lists above are exhaustive **today**, and that is a fact about
 * today rather than a property of the design. Every piece of human state that
 * comes after them — a note somebody types, an assignment, an attachment, a
 * decision recorded against a night — **either enters that list by a written
 * decision, or the first import deletes it and nobody notices.**
 *
 * The failure is silent by construction: a mirror cannot report what it was never
 * told to keep. So a column added to any of the three mirrored tables, or to
 * `production_checklist_item`, is a question with exactly two acceptable answers
 * — *the file owns it*, or *it goes in a restore list*. There is no third answer,
 * and *"we will decide later"* resolves to the first one by default, silently, on
 * the next run.
 * ────────────────────────────────────────────────────────────────────────── */

/**
 * The whole plan of a mirror. **Returned. Nothing here is applied.**
 *
 * No field targets the announced-night table.
 *
 * ⚠ **There is no correction list of any name, and that absence is `ICS-01`
 * itself.** A mirror does not correct rows: it removes a scope and writes the
 * file back. Adding an update list here would be re-introducing the shape that
 * produced 66 false absences, one convenience at a time.
 */
export interface ReconcilePlan {
  /** (1) What comes out, and in which order. Read this before anything else. */
  deletionScope: DeletionScope;
  /** (2) Everything the file carries, each row stamped with the calendar key. */
  plansToInsert: PlanInsert[];
  piecesToInsert: PieceInsert[];
  commitmentsToInsert: CommitmentInsert[];
  checklistItemsToInsert: ChecklistItemInsert[];
  /**
   * (3) The exception of SURVIVAL — rows that never leave (`ICS-03b`, D-58-02).
   *
   * ⚠ Not one of the two below, and named apart so it cannot be read as one.
   * These rows are subtracted from the deletion **and** from the insert list.
   */
  plansThatSurviveDeletion: SurvivingPlanRow[];
  /** (4a) The first exception of STATE — goes away, comes back (`ICS-03`). */
  ticksToRestore: ChecklistTickRestore[];
  /** (4b) The second exception of STATE — goes away, comes back (`ICS-03`). */
  linksToRestore: AnnouncedNightLinkRestore[];
  /** Carried through from the parser, untouched. */
  unsupportedRecurrences: UnsupportedRecurrence[];
  /** Carried through from the classifier, untouched. */
  unclassified: UnclassifiedEntry[];
  /**
   * Series codes the file uses for which the caller supplied no pipeline rules.
   *
   * A **standing condition**, not a transition, which is why it is a field of its
   * own: a night whose series has no rules owes nothing this module can name, and
   * without this field that would be a silent zero — a checklist that looks
   * complete because it is empty. A series code is a public sigla half and names
   * no date and no space.
   */
  seriesWithoutRules: string[];
  /**
   * How the second pass placed the pieces that carry no progressivo.
   *
   * Two counts and never one total, because they are two different qualities of
   * answer: `declared` is a night the **calendar named**, in the entry's note;
   * `window` is a night a **pipeline rule worked out** from the piece's date, and
   * working it out has two ways to fail that saying it does not.
   *
   * It exists so a run can report how much of its own join is derivation. Before
   * notes were read every one of these was `window`, and nobody could have said
   * so — an absent measurement reads exactly like a measurement of zero.
   */
  numberlessAttachmentsBySource: { declared: number; window: number };
}

/**
 * Whether this run would touch a row at all.
 *
 * ⚠ **This is a NARROWER question than it used to answer, and the narrowing is
 * deliberate.** It used to mean *a second pass over an unchanged file writes
 * nothing*, which under a mirror is not merely false but the wrong question: the
 * mirror plans a full rewrite every single time, so the plan is never empty on a
 * file that carries anything. What `ICS-01` actually claims is that two
 * consecutive mirrors leave the **same set of rows**, and that is asserted by
 * comparing row sets in check **E** of `scripts/verify-ics-import.mjs` — not by
 * this predicate.
 *
 * What it still answers, and it is worth answering: *would this run write
 * anything?* A first pass that plans nothing makes any claim about the second
 * pass meaningless, because there was nothing to be idempotent about. The dry run
 * prints it for the same reason.
 *
 * ⚠ **{@link ReconcilePlan.deletionScope} is NOT counted, and it is the exclusion
 * that most needs saying.** The scope is a **condition**, not a list of rows: this
 * module holds no connection, so it cannot know how many rows the key names — nor
 * whether it names any. Counting it would turn *"this run writes nothing"* into
 * *"this run does something"* on every single call, which is a predicate that has
 * stopped measuring.
 *
 * Three more fields are **deliberately excluded** and each for its own reason.
 * {@link ReconcilePlan.unclassified} and
 * {@link ReconcilePlan.unsupportedRecurrences} are properties of the file, so they
 * are identical on both passes by definition; counting them would make a file with
 * one unreadable entry permanently unable to settle.
 * {@link ReconcilePlan.seriesWithoutRules} is a standing gap in configuration, not
 * a write.
 */
export function isEmptyPlan(plan: ReconcilePlan): boolean {
  return (
    plan.plansToInsert.length === 0 &&
    plan.piecesToInsert.length === 0 &&
    plan.commitmentsToInsert.length === 0 &&
    plan.checklistItemsToInsert.length === 0
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
    deletionScope: {
      calendarKey: input.calendarKey,
      order: MIRROR_DELETION_ORDER,
    },
    plansToInsert: [],
    piecesToInsert: [],
    commitmentsToInsert: [],
    checklistItemsToInsert: [],
    plansThatSurviveDeletion: [],
    ticksToRestore: [],
    linksToRestore: [],
    unsupportedRecurrences: [...input.unsupportedRecurrences],
    unclassified: [...input.unclassified],
    seriesWithoutRules: [],
    numberlessAttachmentsBySource: { declared: 0, window: 0 },
  };

  const pipelineBySeries = indexPipelines(pipelineRules);

  // ⚠ The three exceptions are decided FIRST, because the two that follow read
  // them: a night whose plan row survives is not written again, and a tick whose
  // plan row survives was never taken away.
  const survivors = collectSurvivors(plan, input, existing);
  collectStateToRestore(plan, existing);

  reconcilePlans(plan, input, survivors, now);

  // ── The second pass, between the nights and the plan of writes (ICS-05) ───
  //
  // It runs **after** every night has been classified, because a piece with no
  // progressivo is placed by comparing its date against the nights, and **before**
  // anything is written, because what it finds decides which plan row a piece
  // belongs to. Its refusals join the file's own findings rather than a second
  // list: `no_candidate_edition` and `several_candidate_editions` are unclassified
  // entries and the run summary already draws those.
  const attachment = attachNumberlessPieces({
    nights: input.nights,
    pieces: input.pieces,
    pipelines: pipelineRules,
    creditedArtistCounts: input.creditedArtistCounts,
  });

  const attachedByUid = new Map<string, string>(
    attachment.attached.map((found) => [found.uid, found.key])
  );

  for (const found of attachment.attached) {
    plan.numberlessAttachmentsBySource[found.source] += 1;
  }

  for (const refused of attachment.unclassified) {
    plan.unclassified.push({
      entryClass: "unclassified",
      uid: refused.uid,
      reason: refused.reason,
    });
  }

  const contexts = buildAnchorContexts(input, attachedByUid);
  const owedByPlan = reconcilePieces(
    plan,
    input,
    existing,
    pipelineBySeries,
    contexts,
    attachedByUid,
    now
  );
  reconcileCommitments(plan, input, now);
  reconcileChecklist(plan, input, pipelineBySeries, owedByPlan);

  return plan;
}

// ── The three exceptions ────────────────────────────────────────────────────

/**
 * Which plan rows never enter the deletion (`ICS-03b`, D-58-02).
 *
 * The rule has one clause and no conditions attached to it: **a link means the
 * row stays.** Whether the file still carries the entry changes only what the
 * report says about it, never whether it survives.
 *
 * @returns the `source_uid`s that survive, which the insert path must skip
 */
function collectSurvivors(
  plan: ReconcilePlan,
  input: ReconcileInput,
  existing: ExistingSnapshot
): ReadonlySet<string> {
  const inThisFile = new Set(input.nights.map((night) => night.uid));
  const survivors = new Set<string>();

  for (const row of existing.plans) {
    if (row.linkedPartyId === null) continue;
    survivors.add(row.sourceUid);
    plan.plansThatSurviveDeletion.push({
      id: row.id,
      sourceUid: row.sourceUid,
      absentFromFile: !inThisFile.has(row.sourceUid),
    });
  }

  return survivors;
}

/**
 * The two exceptions of state (`ICS-03`), collected **before** anything is
 * deleted.
 *
 * ⚠ **Every piece of state, not only the pieces that look endangered**, and the
 * over-collection is deliberate. Under `ICS-03b` a linked plan row never enters
 * the deletion, so re-attaching its link lands on a row that never lost it, and
 * a tick on such a row was never taken away by the cascade either. Both restores
 * are therefore no-ops **today**, and both are emitted anyway, for two reasons
 * that are worth the redundant write:
 *
 * 1. These lists are the **only copy** of that state that exists across the
 *    delete. The importer writes them out before touching anything, because
 *    between the delete and the rewrite there is no transaction and no
 *    point-in-time recovery in this project — if the run dies in the middle, this
 *    is what is left.
 * 2. Narrowing `ICS-03b` later — deciding that a linked row the file still
 *    carries should be rewritten after all — must not silently drop the link.
 *    A restore path that only exists for the cases somebody remembered is the
 *    hole `ICS-03` is written to forbid.
 *
 * An item nobody has ticked carries no state and is not collected: it is
 * recreated from the file like everything else.
 */
function collectStateToRestore(plan: ReconcilePlan, existing: ExistingSnapshot): void {
  for (const row of existing.plans) {
    if (row.linkedPartyId === null) continue;
    plan.linksToRestore.push({
      planSourceUid: row.sourceUid,
      linkedPartyId: row.linkedPartyId,
    });
  }

  for (const item of existing.checklistItems) {
    if (item.tickedAt === null) continue;
    plan.ticksToRestore.push({
      planSourceUid: item.planSourceUid,
      kind: item.kind,
      label: item.label,
      tickedAt: item.tickedAt,
      tickedBy: item.tickedBy,
      tickedByName: item.tickedByName,
    });
  }
}

// ── Plans ───────────────────────────────────────────────────────────────────

/**
 * Every night the file carries becomes a row. **All of them, every run.**
 *
 * There is no comparison against what is stored, because there is nothing stored
 * to compare against by the time these rows are written: the scope was deleted
 * first. That is the whole of the simplification `ICS-01` buys — the four
 * branches this function used to carry (insert, correct, stamp absent, report a
 * divergence) collapse into one, and the three that vanish are the three that
 * were wrong.
 *
 * ⚠ **One night is skipped, and it is the one whose row survived.**
 * `production_plan.source_uid` is unique, so writing a row that was never deleted
 * would raise a constraint violation and fail the whole run — see
 * {@link SurvivingPlanRow} for what that costs and why it is still the right way
 * round.
 */
function reconcilePlans(
  plan: ReconcilePlan,
  input: ReconcileInput,
  survivors: ReadonlySet<string>,
  now: string
): void {
  for (const night of input.nights) {
    if (survivors.has(night.uid)) continue;
    plan.plansToInsert.push({
      sourceUid: night.uid,
      key: night.key,
      seenAt: now,
      calendarKey: plan.deletionScope.calendarKey,
      seriesCode: night.seriesCode,
      number: night.number,
      venueWord: night.venueWord,
      date: night.startDate,
      startTime: night.startTime,
      endTime: night.endTime,
      sourceSequence: night.sequence,
      sourceLastModified: night.lastModified,
    });
  }
}

// ── Anchors ─────────────────────────────────────────────────────────────────

/**
 * The three things a set of anchor contexts is built from.
 *
 * Narrower than {@link ReconcileInput} on purpose: {@link attachNumberlessPieces}
 * is exported and pure, and asking a caller for a whole snapshot of the database
 * so that it could ask a question about four lists would make the impossible
 * thing — exercising the join without a database — the ordinary thing.
 * {@link ReconcileInput} satisfies this shape, so there is one builder and not
 * two.
 */
interface AnchorContextInput {
  nights: readonly ClassifiedNight[];
  pieces: readonly ClassifiedPiece[];
  creditedArtistCounts: ReadonlyMap<string, number>;
}

/** Shared so the default argument allocates nothing per call. */
const EMPTY_ATTACHMENTS: ReadonlyMap<string, string> = new Map();

/** What {@link attachNumberlessPieces} is asked. Four lists and nothing else. */
export interface NumberlessAttachmentInput extends AnchorContextInput {
  pipelines: readonly SeriesPipeline[];
}

/** One piece and the night it turned out to belong to. */
export interface NumberlessAttachment {
  uid: string;
  /** The night's join key. **Never a progressivo**: the piece is not given one. */
  key: string;
  /**
   * How the night was found: `declared` when the entry's note named it,
   * `window` when a pipeline rule proposed it from the piece's date.
   *
   * The two are not the same quality of answer and the report must not print
   * them as one. A declared night is what the calendar **says**; a windowed
   * night is what a rule **works out**, and working it out has two ways to fail
   * that saying it does not. A run that cannot distinguish them cannot tell
   * anybody how much of its join is derivation — which is the question this whole
   * change was about.
   */
  source: "declared" | "window";
}

/** One piece that could not be placed, and which of the two reasons applies. */
export interface NumberlessRefusal {
  uid: string;
  reason: UnclassifiedReason;
}

/** What the second pass found. Attachments and refusals, kept apart. */
export interface NumberlessAttachmentOutcome {
  attached: NumberlessAttachment[];
  unclassified: NumberlessRefusal[];
}

/**
 * The second pass of `ICS-05`: give every piece with no progressivo the night its
 * **date** says it belongs to, or say why it has none.
 *
 * ── ⚠ THREE OUTCOMES, NEVER TWO, AND NEVER "THE NEAREST" ────────────────────
 *
 * Exactly one candidate joins. **Zero** is `no_candidate_edition` — the calendar
 * does not hold that night, so the way out is to add or correct an entry.
 * **More than one** is `several_candidate_editions` — the calendar holds two
 * nights a single rule cannot separate, so the way out is for a person to look
 * at the two. Choosing the closer one would be the same class of harm as
 * guessing a series: a piece bound to a night that may already have tickets on
 * sale, decided by a tiebreak nobody declared.
 *
 * A piece whose kind has **no rule** is neither joined nor refused. It stays an
 * orphan, which the schema already allows and which a measured after movie in the
 * real file already is: refusing it would lose a real piece, and joining it to
 * the wrong night would be worse. Since D-58-04 that is also the permanent state
 * of every `flyering` piece — no anchor has been measured for the seventh kind,
 * so no rule row exists for it and none is invented, and `conforms_to_rule` for
 * such a piece stays **null** rather than becoming `false`.
 *
 * ── ⚠ THE DECLARED NIGHT COMES FIRST, AND THE WINDOW IS THE FALLBACK ───────
 *
 * Since 2026-08-22 a piece may arrive already knowing which night it announces,
 * because its **note said so** and the classifier resolved the word through the
 * alias map ({@link ClassifiedPiece.declaredNightKey}). Where it does, and where
 * this file carries that night, the attachment is made from the declaration and
 * the window below is not consulted at all.
 *
 * That is not a shortcut, it is a different quality of answer. The window asks
 * *which night could this date belong to* and has two ways to be wrong that the
 * calendar's own sentence does not: it can find nothing because the anchor
 * edition is not in the file, and it can find two because a single rule cannot
 * separate them. Both were being reported as findings against entries whose notes
 * had carried the answer all along.
 *
 * A declared night the file does not carry falls **through** to the window rather
 * than being refused, and the window's verdict for it is `no_candidate_edition` —
 * one code for one situation, instead of a second member added to a vocabulary a
 * SQL `CHECK` mirrors.
 *
 * {@link NumberlessAttachment.source} records which of the two answered, so the
 * run report can say how much of its join is derivation.
 *
 * ── A piece that names NO SERIES either (D-58-03) ───────────────────────────
 *
 * The bare `Timetable` carries neither a sigla nor a name, so there is no single
 * series to look inside. The candidates are then the nights of **every** series
 * whose pipeline declares a rule for that kind, and the three outcomes are the
 * same three — including `several_candidate_editions` where two series could
 * both answer, which goes to a person instead of being settled by a tiebreak
 * nobody declared.
 *
 * ── ⚠ NO PROGRESSIVO IS WRITTEN, AND THERE IS NOWHERE TO WRITE ONE ──────────
 *
 * The outcome carries a **night key**, and the piece keeps `number: null` all the
 * way to its row. What the title carried is remembered; what only the join
 * implies is not — the plan row holds the progressivo, one join away, and a
 * second copy of it here would be the derived one. The importer's contract,
 * *"it never generates a progressivo"*, is still true word for word.
 *
 * ── Pure, and exported because purity is only useful if it is reachable ─────
 *
 * It takes four lists and returns two, opens nothing and stores nothing, so the
 * synthetic gate exercises **this** function rather than a reimplementation of
 * it that agrees today. {@link reconcile} calls the same one.
 */
export function attachNumberlessPieces(
  input: NumberlessAttachmentInput
): NumberlessAttachmentOutcome {
  const outcome: NumberlessAttachmentOutcome = { attached: [], unclassified: [] };

  const numberless = input.pieces.filter((piece) => piece.key === null);
  if (numberless.length === 0) return outcome;

  const pipelines = indexPipelines(input.pipelines);
  const contexts = buildAnchorContexts(input);

  const nightsBySeries = new Map<string, ClassifiedNight[]>();
  for (const night of input.nights) {
    const series = normaliseSeries(night.seriesCode);
    const bucket = nightsBySeries.get(series);
    if (bucket === undefined) nightsBySeries.set(series, [night]);
    else bucket.push(night);
  }

  /** Every night this file carries, by join key — for the declared path below. */
  const nightsByKey = new Set(input.nights.map((night) => night.key));

  for (const piece of numberless) {
    // ── ⚠ A NIGHT THE CALENDAR DECLARES BEATS A NIGHT A RULE PROPOSES ───────
    //
    // The entry's note names the night it announces, in the same grammar a
    // night's own title uses, and the classifier has already resolved that word
    // through the alias map. Where it did, there is nothing left to work out: the
    // window below exists to answer *which night* from a date, and the calendar
    // has answered it in words.
    //
    // It is checked against the nights **this file carries**, and the miss is a
    // fall-through rather than a refusal. A declared night the file does not hold
    // is exactly the state `no_candidate_edition` describes, and letting the
    // window reach that conclusion keeps one code for one situation instead of
    // opening a second that means the same thing. The vocabulary of
    // `UNCLASSIFIED_REASONS` is mirrored by a SQL `CHECK`, so a new member is a
    // migration — and a migration is not the right price for a synonym.
    //
    // ⚠ **No progressivo is written here either.** The attachment is a key, and
    // the piece's `number` stays null: what the title carried is remembered, what
    // a note implies is remembered as *which night*.
    if (piece.declaredNightKey !== null && nightsByKey.has(piece.declaredNightKey)) {
      outcome.attached.push({
        uid: piece.uid,
        key: piece.declaredNightKey,
        source: "declared",
      });
      continue;
    }

    // WHICH SERIES MAY ANSWER FOR THIS PIECE.
    //
    // One, where the title named it. **Every series that owns a rule for this
    // kind**, where the title named none — the bare `Timetable` of D-58-03, which
    // carries neither a sigla nor a name. Searching them all is not a loosening:
    // the three outcomes below are unchanged, so a bare title that two series
    // could both answer for is `several_candidate_editions` and goes to a person,
    // exactly as it would inside one series. Picking a series by any tiebreak
    // would be the same harm as picking the nearest night.
    const searched =
      piece.seriesCode === null
        ? [...pipelines.keys()]
        : [normaliseSeries(piece.seriesCode)];

    const candidates: ClassifiedNight[] = [];
    let anyRule = false;

    for (const series of searched) {
      const rule = ruleFor(pipelines, series, piece.kind);

      // No rule for this kind in this series: nothing to recognise a night by.
      if (rule === null) continue;
      anyRule = true;

      const window = attachmentWindowDays(series, piece.kind);

      for (const night of nightsBySeries.get(series) ?? []) {
        const context = contexts.get(night.key);
        if (context === undefined) continue;
        if (recognisesEdition(piece.date, rule, context, window)) candidates.push(night);
      }
    }

    // No rule anywhere for this kind — `flyering` is the measured case (D-58-04),
    // and it is not an error. The piece stays an orphan rather than becoming a
    // day taken by somebody else, which is the whole difference this phase is
    // buying. It is also why the refusal below is reached only where a rule
    // exists and found nothing: *no rule* and *no night* are different answers
    // and must not collapse into one.
    if (!anyRule) continue;

    if (candidates.length === 1) {
      outcome.attached.push({ uid: piece.uid, key: candidates[0].key, source: "window" });
      continue;
    }

    outcome.unclassified.push({
      uid: piece.uid,
      reason:
        candidates.length === 0 ? "no_candidate_edition" : "several_candidate_editions",
    });
  }

  return outcome;
}

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
function buildAnchorContexts(
  input: AnchorContextInput,
  attachedByUid: ReadonlyMap<string, string> = EMPTY_ATTACHMENTS
): Map<string, AnchorContext> {
  const bySeries = new Map<string, ClassifiedNight[]>();
  for (const night of input.nights) {
    const bucket = bySeries.get(night.seriesCode);
    if (bucket === undefined) bySeries.set(night.seriesCode, [night]);
    else bucket.push(night);
  }

  const listingDateByPlanKey = new Map<string, CivilDate>();
  for (const piece of input.pieces) {
    if (piece.kind !== "listing") continue;
    // A listing whose title carried no progressivo has no key of its own. Which
    // night it announces is answered by date, in the second pass, and the answer
    // arrives here through `attachedByUid` — which is why the caller builds
    // these contexts twice: once to run the join, once with what it found. The
    // night's after movie anchors on the **following edition's listing**, and
    // those listings are precisely the ones with no progressivo, so without this
    // the anchor would wait for an edition whose listing is sitting in the file.
    const planKey = piece.key ?? attachedByUid.get(piece.uid) ?? null;
    if (planKey === null) continue;
    const held = listingDateByPlanKey.get(planKey);
    if (held === undefined || piece.date < held) {
      listingDateByPlanKey.set(planKey, piece.date);
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

/**
 * The one spelling of a series this module keys on — and the one place that
 * **refuses** rather than crashes when what arrives is not a series at all.
 *
 * ── WHY A RUNTIME REFUSAL AND NOT A TIGHTER TYPE ────────────────────────────
 *
 * ⚠ **The type already said `string`, and a `null` arrived anyway.** Measured
 * 2026-08-20 against the live feed: a bare `TypeError: Cannot read properties of
 * null (reading 'trim')`, thrown from {@link indexPipelines}, exit `1`, after the
 * report had already printed everything a reader would skim.
 *
 * Tightening the signature would add nothing, because the caller that broke it
 * is not typechecked: `scripts/import-production-calendar.mjs` is `.mjs`, it
 * builds its `SeriesPipeline[]` by hand and hands it across the module boundary
 * where no compiler is looking. A stricter type is a promise the breaker never
 * reads. A refusal is the only thing it can actually meet — so this function is
 * made **impossible to break silently**, not impossible to call wrongly.
 *
 * The bare `TypeError` was itself a silent failure in the precise sense of
 * `meta-gates.md`: no category, nothing distinguishing it from any other null
 * dereference in the run, and no observable effect naming what a person should
 * repair — in a project with no error tracking at all.
 *
 * ── TWO FAILURES, TWO SENTENCES ─────────────────────────────────────────────
 *
 * Same device and same reason as the load-time assertions in `./classify`. A
 * non-string and a blank string are different mistakes with different repairs,
 * and one message covering both would be the collapsed-catch pattern this
 * codebase refuses everywhere else.
 *
 * ⚠ Neither branch may become a default. `?? ""` here would invent a series
 * spelled *empty string*, seat it as a live key in the pipeline `Map`, and let
 * every series-less entry inherit that bucket's rules — a piece measured against
 * another series' anchors, stored as a `conforms_to_rule` verdict nobody
 * re-derives. That is strictly worse than the crash it would have hidden.
 */
function normaliseSeries(seriesCode: string): string {
  if (typeof seriesCode !== "string") {
    throw new TypeError(
      "production/ics/reconcile: normaliseSeries was handed something that is not " +
        "a string, so a series pipeline was built for an entry that names no " +
        "series. Since ICS-04/ICS-05 a piece may legitimately carry no series — " +
        "such a piece has no pipeline by definition and must be filtered out " +
        "where the sigla list is built, never normalised into one here."
    );
  }

  const normalised = seriesCode.trim().toUpperCase();

  if (normalised.length === 0) {
    throw new RangeError(
      "production/ics/reconcile: normaliseSeries was handed a blank series code. " +
        "An empty sigla would become a real key in the pipeline index, and every " +
        "entry reaching it would be measured against whatever rules happened to " +
        "land in that bucket. A series with no name is a finding for a person, " +
        "not a bucket."
    );
  }

  return normalised;
}

/**
 * The series half of a plan key, or `null` where there is no key.
 *
 * The inverse of {@link joinKey}, and the **only** reader of a key's shape in
 * this module. It exists for one caller — the `conforms_to_rule` verdict of a
 * piece whose title named no series — and it deliberately reads rather than
 * composes: composing a key from parts is {@link joinKey}'s single job, and a
 * second composer is how `"<SERIES>-undefined"` gets invented.
 */
function seriesOfPlanKey(planKey: string | null): string | null {
  if (planKey === null) return null;
  const separator = planKey.lastIndexOf("#");
  if (separator <= 0) return null;
  return planKey.slice(0, separator);
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
  attachedByUid: ReadonlyMap<string, string>,
  now: string
): Map<string, OwedPiece[]> {
  // A piece may join a night this file carries, or one whose plan row is still
  // standing. The second case is narrow and it is exactly `ICS-03b`: a plan row
  // behind an announced night stays even when the file stops carrying it, so a
  // piece that names it still has something to point at.
  const knownPlanKeys = new Set<string>();
  for (const night of input.nights) knownPlanKeys.add(night.key);
  for (const row of existing.plans) {
    if (row.linkedPartyId === null) continue;
    if (row.seriesCode !== null && row.number !== null) {
      knownPlanKeys.add(joinKey(row.seriesCode, row.number));
    }
  }

  const owedByPlan = new Map<string, OwedPiece[]>();
  const writtenByGroup = new Map<string, ClassifiedPiece[]>();

  // ── The pieces the file carries ───────────────────────────────────────────

  const written = [...input.pieces].sort(byWrittenPieceOrder);

  for (const piece of written) {
    // Two ways a piece knows its night, and only one of them is a number. The
    // title's own key where it carried a progressivo; the second pass's answer
    // where it did not. Neither writes a progressivo onto the piece.
    const carried = piece.key ?? attachedByUid.get(piece.uid) ?? null;
    const planKey = carried !== null && knownPlanKeys.has(carried) ? carried : null;
    const context = planKey === null ? undefined : contexts.get(planKey);

    // WHICH SERIES' RULE THIS PIECE IS HELD AGAINST.
    //
    // The one the title named, and where it named none — the bare `Timetable` of
    // D-58-03 — the one belonging to the night the second pass joined it to.
    // Deriving it from the join is correct **here and only here**: this feeds
    // `conforms_to_rule`, which is computed at import, stored and never drawn,
    // so it is a derived diagnostic by construction. It is emphatically NOT
    // written back onto `seriesCode`, which stays what the title carried — a
    // stored copy of a derived value is the pair that disagrees the first time a
    // night is corrected.
    //
    // Where the piece was joined to nothing, `context` is already undefined and
    // the verdict below is `null` regardless: *we could not work it out* stays a
    // third answer and never arrives dressed as `false`.
    const ruleSeries = piece.seriesCode ?? seriesOfPlanKey(planKey);
    const rule =
      ruleSeries === null ? null : ruleFor(pipelines, ruleSeries, piece.kind);

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

    // One branch, where there used to be three. The `UID` is not looked up, no
    // proposal is adopted and no sigla is compared: the row this piece would have
    // corrected no longer exists by the time this one is written.
    plan.piecesToInsert.push({
      sourceUid: piece.uid,
      seenAt: now,
      // Read from the scope rather than taken as an argument, so the key a row is
      // written with and the key the next mirror deletes by are one value and not
      // two that agree today.
      calendarKey: plan.deletionScope.calendarKey,
      ...fields,
    });
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

        emitProposal(plan, owedByPlan, night, entry.kind, null, refusal.unresolved, now);
        continue;
      }

      for (let episode = already; episode < episodes; episode += 1) {
        const proposal = proposePieceDate(entry.rule, context, episode);

        if ("unresolved" in proposal) {
          if (already > 0) break;
          emitProposal(plan, owedByPlan, night, entry.kind, null, proposal.unresolved, now);
          break;
        }

        emitProposal(plan, owedByPlan, night, entry.kind, proposal.date, null, now);
      }
    }
  }

  plan.seriesWithoutRules = [...seriesMissingRules].sort();

  // ⚠ **Nothing follows.** This is where the two loops over rows that no longer
  // corresponded to anything used to stand — one stamping the file's absences,
  // one retiring proposals nobody owed any more. A mirror answers both by not
  // writing the row again, and the historical note beside `MIRRORED_TABLES` keeps
  // the reason those two loops were once two.

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
 * Put one proposed piece in the plan.
 *
 * ⚠ **A proposal is recomputed every run, and adopted never (`ICS-06`).** It used
 * to be reused: a proposal has no `UID`, so the previous run's row was matched by
 * `(plan key, kind)` and consumed in date order, and that hand-held idempotence
 * was the module's weakest corner — an obligation carried in application code
 * with no constraint behind it, stated out loud precisely because it could not be
 * enforced. The mirror deletes those rows with the rest of the scope, so the
 * corner is gone rather than papered over, and the surface says the dates are
 * recomputed instead of implying they were decided.
 *
 * `emitProposal` therefore survives the subtraction while the claiming helper does
 * not: proposals still have to be **born**, they just no longer have to be
 * **re-adopted**.
 */
function emitProposal(
  plan: ReconcilePlan,
  owedByPlan: Map<string, OwedPiece[]>,
  night: ClassifiedNight,
  kind: PieceKind,
  date: CivilDate | null,
  unresolved: UnresolvedReason | null,
  now: string
): void {
  recordOwed(owedByPlan, night.key, { kind, date });

  plan.piecesToInsert.push({
    sourceUid: null,
    seenAt: now,
    calendarKey: plan.deletionScope.calendarKey,
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
  });
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
  now: string
): void {
  for (const commitment of input.commitments) {
    for (const occurrence of occurrencesOf(commitment, input.recurrenceOccurrenceCap)) {
      plan.commitmentsToInsert.push({
        sourceUid: commitment.uid,
        seenAt: now,
        calendarKey: plan.deletionScope.calendarKey,
        occurrenceDate: occurrence,
        startTime: commitment.startTime,
        endTime: commitment.endTime,
        title: commitment.title,
        recurrenceRaw: commitment.recurrenceRaw,
        expandedFromDate: occurrence === commitment.date ? null : commitment.date,
      });
    }
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
  pipelines: PipelineIndex,
  owedByPlan: Map<string, OwedPiece[]>
): void {
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

    // Every item, every run. The cascade took the old ones away with their plan
    // row, so there is nothing to compare a due date against — and the ticks that
    // went with them are put back by their own list, keyed on the file's identity
    // rather than on the `uuid` the cascade destroyed.
    for (const item of items) plan.checklistItemsToInsert.push(item);
  }
}

function checklistKey(planKey: string, kind: ChecklistKind, label: string): string {
  return `${planKey} ${kind} ${label}`;
}

