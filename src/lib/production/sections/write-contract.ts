import { SECTION_STATES, type SectionState } from "./vocabulary";

/**
 * What a write to an authored section is refused for, and the one place the
 * shape of a section draft is checked.
 *
 * ── Why this is a PLAIN module and not an export of either action file ──────
 *
 * Every export of a `"use server"` module is a **public endpoint with a
 * convenient signature**, invocable with a forged body by anybody who can reach
 * the deployment. `may-upload.ts:27-34` records the consequence of leaving a
 * predicate in one: it publishes an oracle — a caller learns the answer to a
 * question the surface never meant to answer, without ever reaching the act.
 *
 * The two section modules are deliberately **two** — one per capability key,
 * because D-45-06 makes the key that reads a section the key that writes it, and
 * a single shared `"use server"` module would publish the manifesto's write
 * endpoints to a holder of the visual key. What they legitimately share is what
 * is in this file: a union of refusal names, three result shapes, and the shape
 * checks that run **before** anything is asked of the database. None of it is a
 * server action, none of it touches a client, and none of it answers a question
 * about entitlement.
 *
 * ── The state is never inferred here, and that is the file's sharpest rule ───
 *
 * `production_section.state` has **no default in the column**, and the absence
 * is a decision this file may not undo: a default of *written* fills a void a
 * format's owner has not filled, and a default of *not decided* answers for a
 * coordinate that has already been declared. Both errors are named by
 * `sound-manifesto.md`, they are opposite, and a two-state model can only defend
 * against one of them at a time.
 *
 * So `validateSectionDraft` below reads the state **from the argument and from
 * nowhere else**. An empty body does not make a draft undecided; a full body
 * does not make it written. There is no branch in this file that assigns a state
 * from any other value, and there must never be one.
 *
 * ── The column names, and why they are spelled the database's way ───────────
 *
 * `missing` and `decision_owner` travel through this file under the names the
 * constraint uses — `production_section_not_decided_names_its_gap` — for the
 * reason `SectionVoid.tsx` gives about its own props: naming the database's own
 * words is what makes an assertion about a file say something about the data.
 * Renamed props would make the two halves of criterion 3 agree only by
 * convention.
 */

/* ────────────────────────────────────────────────────────────────────────────
 * The refusals — one value per distinguishable cause, and no shared bucket
 * ──────────────────────────────────────────────────────────────────────────── */

/**
 * Every way a write to an authored section or to the register can be refused.
 *
 * There is no shared *something went wrong*. The recorded precedent in this
 * repository is the newsletter form collapsing a network fault, a missing key
 * and an address already subscribed into one indebuggable message
 * (`.planning/codebase/CONCERNS.md`), and this product has **no error tracking
 * at all** — so the returned value is the only place a refusal exists for a
 * human being.
 */
export type SectionRefusal =
  /**
   * An identifier that is not a uuid. Nothing was asked of the database.
   *
   * Not a formality: these arguments arrive on an untrusted POST, and PostgREST
   * answers a malformed uuid with a code that says nothing about which argument
   * was wrong.
   */
  | "invalid_id"
  /**
   * The FORMAT identifier is not a uuid.
   *
   * Its own code rather than folded into `invalid_id`, because the two send a
   * reader to different fields: the first is the row being edited, the second is
   * *which format this rule belongs to* — and that one is legitimately absent, so
   * a caller reading a shared code would not know whether it complained about a
   * value or about its absence.
   */
  | "invalid_format_id"
  /**
   * A rule with no title.
   *
   * Refused rather than filled: a rule called *Untitled* is a rule nobody can
   * find again, and the title is the only handle the page has. Separate from
   * `write_failed` because nothing was attempted.
   */
  | "title_missing"
  /**
   * The state is absent, or is not one of the three.
   *
   * ⚠ **Absent is refused and never filled in**, and this is the whole reason the
   * argument has no default. The column has none either. Both candidate defaults
   * are wrong in opposite directions — *written* fills a void, *not decided*
   * answers for a coordinate somebody declared — so the author says which, and a
   * form that cannot submit without an answer is the cost and the point.
   */
  | "invalid_state"
  /**
   * A rule marked written that carries no text.
   *
   * An empty row in this state is **the emptiness not declared**, which is the
   * one thing this section was built to make impossible, failing quietly. The
   * constraint `production_section_written_has_a_body` refuses the row; this
   * refuses the call first, so a person reads a sentence about the rule rather
   * than a code about a row. The code is the sentence, the constraint is the
   * boundary, and neither substitutes for the other.
   */
  | "written_without_body"
  /**
   * A rule marked undecided that does not say what is missing, or whose call it
   * is, or neither.
   *
   * Without both, *not decided* is a shrug — and a shrug reads as NOBODY'S JOB.
   * The register exists to stop open questions resolving themselves by habit,
   * one material at a time, and a row that says only *not decided* is how that
   * happens with the register switched on. `btrim` in
   * `production_section_not_decided_names_its_gap` is load-bearing for the same
   * reason the trim here is: a string of spaces is what a required field collects
   * from somebody in a hurry.
   */
  | "not_decided_without_gap"
  /** No rule carries that id. Nothing was written. */
  | "section_not_found"
  /**
   * The row belongs to the **other** authored section, or the register entry
   * belongs to a section this key does not read.
   *
   * ⚠ Its own code, and it is the one that keeps the two keys apart at run time.
   * The two modules ask different keys, but they write the **same two tables**,
   * so without this check a holder of one section's key could edit the other
   * section's rules by passing an id — or plant a warning on a surface it cannot
   * itself read, which is worse, because nobody holding this key would ever see
   * what they wrote.
   *
   * Not folded into `section_not_found`: *it is not there* and *it is there and
   * it is not yours* send a reader to different places, and only the second is a
   * fact about permissions.
   */
  | "section_not_ours"
  /** A register entry with no question. Nothing was written. */
  | "question_missing"
  /**
   * A register entry, or an undecided rule, with no role to close it.
   *
   * `production_open_question.decision_owner` is `NOT NULL` because a question
   * with no owner is the state the register was built to abolish — it is the one
   * thing that distinguishes a register from a list of complaints. A **role**,
   * never a person: this repository is public, and a decision attributed to a
   * name ages badly the moment somebody leaves.
   */
  | "decision_owner_missing"
  /**
   * A question closed with no answer.
   *
   * A question closed without its answer is a question that will be reopened, and
   * `production_open_question_closed_xor_resolution` refuses the row anyway.
   * Closing is not deleting, and there is no delete path in either module.
   */
  | "resolution_missing"
  /** No register entry carries that id. Nothing was written. */
  | "question_not_found"
  /**
   * The question had already been closed. Nothing was written a second time.
   *
   * Its own code because the next step differs from every other refusal here:
   * there is nothing to fix, and the surface simply has a stale copy.
   */
  | "already_closed"
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
export interface SectionFailure {
  readonly ok: false;
  readonly reason: SectionRefusal;
}

/** What every act in either section module answers. */
export type SectionWriteResult = { readonly ok: true } | SectionFailure;

/* ────────────────────────────────────────────────────────────────────────────
 * The shapes a caller hands over — spelled with the column names
 * ──────────────────────────────────────────────────────────────────────────── */

/**
 * One rule of one authored section, as a caller submits it.
 *
 * Every field is `unknown`: this arrives on an untrusted POST, and a declared
 * type on a Server Action argument is a comment as far as the wire is concerned.
 *
 * ⚠ **`section` is NOT a field here.** Which section a row belongs to is pinned
 * by the module that writes it, because that module is the one that asked the
 * section's key. A caller that could name the section could write into the other
 * one from behind the wrong key, and the split into two modules would be a
 * decoration.
 */
export interface SectionDraft {
  readonly title?: unknown;
  readonly format_id?: unknown;
  readonly state?: unknown;
  readonly body?: unknown;
  readonly missing?: unknown;
  readonly decision_owner?: unknown;
}

/** One register entry, as a caller submits it. Same reasoning on `unknown`. */
export interface QuestionDraft {
  readonly question?: unknown;
  readonly decision_owner?: unknown;
  readonly section?: unknown;
  readonly format_id?: unknown;
}

/**
 * The act the shared form calls, whichever section mounted it.
 *
 * The form takes this as a **prop** and imports no action module of its own:
 * one component, two callers, and no second place a state default could creep
 * back in.
 */
export type SaveSection = (
  id: string | null,
  draft: SectionDraft
) => Promise<SectionWriteResult>;

/** The two acts the register form calls. */
export type OpenQuestion = (draft: QuestionDraft) => Promise<SectionWriteResult>;
export type CloseQuestion = (
  id: string,
  resolution: unknown
) => Promise<SectionWriteResult>;

/* ────────────────────────────────────────────────────────────────────────────
 * The shape checks, each performed BEFORE anything is asked of the database
 * ──────────────────────────────────────────────────────────────────────────── */

/** The same shape as `formats/actions.ts:111-113`. */
export const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Membership of a tuple that mirrors a SQL `CHECK`, as a type guard. */
export function isMember<T extends string>(
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
 * every query. These columns are nullable precisely so that *not written* has a
 * representation — which is the state this whole section exists to keep
 * reachable.
 */
export function optionalText(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

/**
 * A uuid, or an absence, or a refusal — for a column that is legitimately null.
 *
 * The three outcomes are kept apart because two of them are correct: a rule can
 * belong to the whole brand rather than to one format, and filing those under a
 * format would file one rule in four places.
 */
export function optionalUuid(
  value: unknown
): { ok: true; value: string | null } | { ok: false } {
  const text = optionalText(value);
  if (text === null) return { ok: true, value: null };
  if (!UUID_PATTERN.test(text)) return { ok: false };
  return { ok: true, value: text };
}

/** A section draft that has passed every check the database will make again. */
export interface ValidatedSection {
  readonly title: string;
  readonly format_id: string | null;
  readonly state: SectionState;
  readonly body: string | null;
  readonly missing: string | null;
  readonly decision_owner: string | null;
}

/**
 * Check a draft, and refuse it **by name** before the query.
 *
 * ⚠ **Nothing here infers a state.** `state` is read from the argument and from
 * nowhere else: an empty body does not make a draft `not_decided`, and a full
 * body does not make it `written`. That inference is precisely the *answering
 * where a coordinate has been declared* error the middle state exists to
 * prevent, and it is the one shortcut a reader of this function would be
 * tempted to add.
 *
 * The two conditional requirements are refused here **and again** by their named
 * constraints. That is not belt-and-braces: this side can answer with a sentence
 * a person can act on, and the constraint is the boundary that holds when
 * somebody writes to the table by another route.
 *
 * ⚠ **And `coordinates_declared` requires NEITHER**, which is the deliberate
 * omission the migration writes down. Forcing a *what is missing* line on the
 * middle state pushes the author into **inventing the gap** — writing what is
 * absent from a rule nobody has written — which is the first of the two errors.
 * A declared coordinate is a true statement that stops short; the correct
 * pressure on it is a person deciding, not a check.
 */
export function validateSectionDraft(
  draft: SectionDraft
): { ok: true; value: ValidatedSection } | SectionFailure {
  const title = optionalText(draft?.title);
  if (title === null) {
    return { ok: false, reason: "title_missing" };
  }

  const format = optionalUuid(draft?.format_id);
  if (!format.ok) {
    return { ok: false, reason: "invalid_format_id" };
  }

  // The state, from the argument. No fallback, no coalesce, no inference.
  if (!isMember(SECTION_STATES, draft?.state)) {
    return { ok: false, reason: "invalid_state" };
  }
  const state: SectionState = draft.state;

  const body = optionalText(draft?.body);
  const missing = optionalText(draft?.missing);
  const decision_owner = optionalText(draft?.decision_owner);

  if (state === "written" && body === null) {
    return { ok: false, reason: "written_without_body" };
  }

  if (state === "not_decided" && missing === null) {
    return { ok: false, reason: "not_decided_without_gap" };
  }

  if (state === "not_decided" && decision_owner === null) {
    return { ok: false, reason: "decision_owner_missing" };
  }

  return {
    ok: true,
    value: { title, format_id: format.value, state, body, missing, decision_owner },
  };
}
