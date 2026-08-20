/**
 * What an entry in the production calendar **is** — decided from its title, by
 * three declared grammars, into exactly four classes.
 *
 * ── Pure by design ──────────────────────────────────────────────────────────
 *
 * The only imports are `./vocabulary` and a type-only `./parse`, so this module
 * has no runtime dependency at all — no Supabase client, no HTTP call, no React,
 * and no `Date.now()` in any decision. It takes the parser's records and returns
 * what the import writes and what the import reports. The same text yields the
 * same four lists on any machine, in any zone, at any hour, and no date object is
 * constructed anywhere in this directory (`./vocabulary`, claim (c)).
 *
 * It diverges from its analog `@/lib/door/classify` on nothing: that module
 * classifies a night's scans after the fact, this one classifies a calendar's
 * entries after the fact, and neither writes anything.
 *
 * ── ⚠ THE ALIAS MAP IS AN ARGUMENT, AND NEVER A LITERAL IN THIS FILE ─────────
 *
 * `classifyEntry` takes the map that turns a word written in the calendar into a
 * series code. It is an **argument** because its values are words for spaces, and
 * a word for a space that has not been acquired **in writing** cannot be written
 * into a public repository (D-44-04; `venue-acquisition.md`, gate *uno spazio non
 * acquisito non si nomina*). `github.com/edmiribrahimi/Resonate` is public and a
 * commit here is a publication, which is irreversible.
 *
 * Stated in the negative too, because the negative is the enforceable half:
 * **this module contains no such word, not one, not even inside an example.** The
 * map is a column — `party_series.ics_alias`, added by this phase's migration —
 * whose values arrive at runtime behind row-level security. The migration seeds
 * none of them and neither does this file.
 *
 * The mapping is an **abbreviation, not a derivation**. Nothing computes a series
 * code from a word; somebody who knows both halves declares it. That is why an
 * unresolved word becomes a finding here instead of a best guess: guessing onto
 * the nearest series is how a piece ends up joined to the wrong night.
 *
 * ── ⚠ THREE GRAMMARS, NOT TWO ───────────────────────────────────────────────
 *
 * D-44-21 records two. The measurement found **three**, and a two-grammar reader
 * silently drops three real entries — two of which carry the file's only genuine
 * anchor overrides, and therefore the only live evidence that a written date must
 * win over a computed one at all (D-44-09b part 1).
 *
 * They are tried in this order, and the order matters because a title can look
 * like more than one of them:
 *
 *   1. **canonical piece** — `<Kind> - <SERIES>-<NNN>[ - <part>]`, and its
 *      variant `<Kind> - <Name>[ x <Venue>]`, which spells the series as a name
 *      and carries **no progressivo**. Same separator, same order, same
 *      convention recorded, so the two are one grammar and not two (D-44-21);
 *      thirty-one entries of the measured file are the second shape, and before
 *      it was read every one of them was counted as unreadable. The kind
 *      vocabulary is exactly the six of `PIECE_KIND_LABELS`, matched
 *      case-insensitively **against the label** and never against a free string.
 *   2. **legacy inverted piece** — `<Word> <NNN> - <Kind>`. Same six kinds, no
 *      series code, the number attached to the leading word instead. Tagged
 *      `naming_convention: "legacy"`.
 *   3. **night** — `<Word>[ x <Word>] <NNN>`. No kind token and **no series
 *      code**, which is the whole join problem and is measurable: a matcher keyed
 *      on series codes finds **zero** nights.
 *
 * ── ⚠ THE JOIN IS KEYED ON THE WORD, NEVER ON THE FORMAT PLUS THE NUMBER ────
 *
 * Two satellite nights legitimately carry the progressivo `001`, under different
 * series, told apart **only** by the word that follows the ` x `. A join that
 * ignored that word was tried and measured: it put one satellite's listing at a
 * *positive* distance from its own night — a piece published after the night it
 * announces. The join was wrong; the calendar was right. Any piece dated after
 * the night it announces is that same defect wearing a new face.
 *
 * So all three grammars normalise to one key, {@link joinKey}, and the way in is
 * different for each: a canonical piece brings its own series code; a night and a
 * legacy piece bring a word that the alias map turns into one.
 *
 * ── ⚠ THE DURATION IS A WARNING, AND NEVER A CLASSIFIER ─────────────────────
 *
 * Every piece in the file is a short block in the late morning; nights are long
 * blocks that start in the evening. That is a strong corroborating signal and it
 * is deliberately **not** consulted by {@link classifyEntry}: the day the owner
 * books a piece at a different hour, a duration-based reader silently
 * reclassifies it, and a silent reclassification in this pipeline hands an entry
 * a format and a progressivo it does not have.
 *
 * {@link durationDisagreement} therefore exists, is computed **after** the
 * grammar has already decided, and travels as its own finding list.
 *
 * ── Findings stay separate, and they carry no text ──────────────────────────
 *
 * {@link ClassificationResult} keeps `unclassified`, `aliasUnresolved` and
 * `durationDisagreements` apart. Three findings are never one "problem": that is
 * the collapsed-`catch` pattern this project has already paid for once — the
 * newsletter form answering a network failure, a missing key and a duplicate
 * address with one sentence (`meta-gates.md`) — and the two-failures-two-sentences
 * discipline `src/lib/routes/staff-tabs.ts:150-175` writes out in full.
 *
 * **Every finding carries a `uid` and a reason code, and never a title, a date or
 * a word for a space.** A title in this file is an unannounced date, a space under
 * negotiation or a line-up; the same text in a log, in a toast or — worst — in a
 * tracked document is irreversible.
 *
 * The one exception is deliberate and narrow: {@link ClassifiedCommitment} does
 * carry the entry's `title`, because `production_commitment.title` exists and a
 * day taken by something that is not ours is useless without knowing what took
 * it. It travels to that column, behind row-level security, and nowhere else — it
 * is not a finding, it is a row.
 *
 * ── What a green build does NOT prove ───────────────────────────────────────
 *
 * That this classifier classifies the real file correctly. The counts — 56
 * canonical pieces, 3 legacy, 14 nights, 19 in the fourth class, and zero nights
 * matched by a series code alone — are asserted by `scripts/verify-ics-import.mjs`
 * in plan 44-08, and that check is the only reason a hand-written reader is
 * defensible instead of being dependency avoidance. Nothing here claims criterion
 * 3 is satisfied.
 */

import {
  NAMING_CONVENTIONS,
  PIECE_KINDS,
  PIECE_KIND_LABELS,
} from "./vocabulary";
import type {
  CivilDate,
  CivilTime,
  NamingConvention,
  PieceKind,
} from "./vocabulary";
import type { IcsEvent } from "./parse";

/**
 * The declared inclusion rule (D-44-20).
 *
 * With nights, pieces and days taken by somebody else in one file — plus entries
 * carrying no series code at all — *"import everything"* is not a specification.
 * What enters, as what, and what is merely recorded, is written here in prose so
 * that it can be read by a person and quoted by `scripts/verify-ics-import.mjs`,
 * rather than reconstructed from the branches below.
 *
 * Nothing is skipped. Every entry of the file lands in exactly one of the four
 * classes, and the fourth class is a **result**, not a failure state.
 */
export const INCLUSION_RULE = [
  "A title of the form `<Kind> - <SERIES>-<NNN>` enters as a piece of that kind, under the canonical naming convention, joined by the series code it carries. An optional third segment is the per-dj part marker.",
  "A title of the form `<Kind> - <Name>[ x <Venue>]` — a name where the canonical grammar wants a sigla — enters as a piece of that kind, under the same canonical naming convention, with its series resolved through the alias map and **no progressivo at all**: the title carries none, so the piece carries none, and the night it belongs to is found by the second pass from its date. It is never handed one.",
  "A title of the form `<Word> <NNN> - <Kind>` enters as a piece of that kind, under the legacy naming convention, joined by resolving its leading word through the alias map.",
  "A title of the form `<Word>[ x <Word>] <NNN>`, carrying no kind token, enters as a night, joined by resolving the word after the ` x ` — or the leading word where there is none — through the alias map.",
  "An entry whose word the alias map does not resolve is recorded as unclassified with the reason `alias_unresolved`, and is never guessed onto the nearest series: the mapping is an abbreviation somebody declares, not a derivation anything computes. This holds for all three of the grammars that carry a word — the night, the legacy piece and the named piece — and in each of them the refusal is reached only where the title is unmistakably ours.",
  "A piece that carries no progressivo is joined to a night by comparing its date against every candidate night of its series, in the direction its pipeline rule declares. Exactly one candidate joins; none is recorded as `no_candidate_edition`; more than one is recorded as `several_candidate_editions`. **Never the nearest.** The join writes which night, and still no number.",
  "An entry carrying a word the alias map knows, but no recognisable kind and no progressivo, is recorded as unclassified, with its uid and a reason, and is counted. It is never handed a format and a progressivo it does not have — a progressivo is a monotone guard and, once assigned, is already on a poster.",
  "Every other entry enters as a commitment: it occupies a day and nothing more. It is not ours, it carries no format, no series and no number, and the only reason it is imported is so that a day that is taken never shows as free.",
] as const;

/**
 * How long a piece's block is, at the outside, in minutes.
 *
 * Generous against the measurement — every piece in the file is a half-hour
 * block — because this number decides a **warning**, and a warning tuned tight
 * enough to fire on a normal week is a warning somebody switches off.
 */
export const PIECE_MAX_MINUTES = 180;

/**
 * The hour from which a block reads as an evening one, on a 24-hour clock.
 *
 * Nights start at 18:00 or at 22:00; every piece is booked in the late morning.
 * Like the constant above, this decides a warning and nothing else.
 */
export const EVENING_FROM_HOUR = 16;

/** The shortest a night's block runs, in minutes. Four hours, measured. */
export const NIGHT_MIN_MINUTES = 240;

/**
 * Why an entry could not be placed in one of the first three classes.
 *
 * Six codes, distinct on purpose. *The declaration is missing* and *the title
 * carries no number* are two different pieces of work for whoever reads the
 * import run's summary, and one shared code would hide which.
 *
 * The last two arrive together and stay **two**, for the same reason the first
 * four are four. *No candidate edition* is a calendar that does not hold the
 * night yet — the piece is early, or the night was moved, and the way out is to
 * add or correct an entry. *Several candidate editions* is a calendar that holds
 * two nights a single rule cannot tell apart — the way out is to look at the two
 * and decide which one the piece announces. One shared code would send both
 * readers to the wrong place, and this product has no error tracking to correct
 * them afterwards (`meta-gates.md`).
 */
export const UNCLASSIFIED_REASONS = [
  /** A word the grammar found, that the alias map does not turn into a series code. */
  "alias_unresolved",
  /** A word the alias map knows, with no kind token and no progressivo after it. */
  "known_word_without_kind_or_number",
  /** A kind token, with nothing after it that reads as a series code, a number, or a name. */
  "kind_without_series_and_number",
  /** A progressivo position that is not a whole number. */
  "number_not_readable",
  /** A piece with no progressivo, whose series holds no night its date can belong to. */
  "no_candidate_edition",
  /** A piece with no progressivo, whose series holds more than one night its date fits. */
  "several_candidate_editions",
] as const;

/** Why an entry landed in the fourth class. */
export type UnclassifiedReason = (typeof UNCLASSIFIED_REASONS)[number];

/** A night the calendar holds. Joined to its pieces through {@link joinKey}. */
export interface ClassifiedNight {
  entryClass: "night";
  uid: string;
  /** Resolved through the alias map. Never read off the title. */
  seriesCode: string;
  /** The progressivo, as written. Appended to, never renumbered. */
  number: number;
  /** `seriesCode` + `number`, normalised. The only key the join uses. */
  key: string;
  /**
   * The word that follows the ` x `, or `null` where the title carries none.
   *
   * It travels to `production_plan.venue_word`, behind row-level security, and
   * nowhere else. It is not a finding and it never reaches a log.
   */
  venueWord: string | null;
  startDate: CivilDate;
  startTime: CivilTime;
  endDate: CivilDate;
  endTime: CivilTime;
  durationMinutes: number;
  sequence: number | null;
  lastModified: string | null;
}

/** One piece of the editorial pipeline, in either of the two grammars. */
export interface ClassifiedPiece {
  entryClass: "piece";
  uid: string;
  kind: PieceKind;
  /** Carried by the title as a sigla, or resolved from the name it carries instead. */
  seriesCode: string;
  /**
   * The progressivo, **or `null` where the title carries none**.
   *
   * Nullable since `ICS-04`, and the null is the deliverable rather than a
   * loosening: `Listing - <Name>` names its series and not its edition, so the
   * only honest answer is that there is no number here. Which night it belongs
   * to is answered separately, by date, in {@link attachNumberlessPieces} — and
   * the answer is stored as *which night*, never as a number.
   *
   * The rule the whole phase turns on: **what the title carried is remembered;
   * what only the join implies is not.** A progressivo is a monotone guard
   * (`meta-gates.md`) and once assigned it is already on a poster, so the safest
   * way not to invent one is to have nowhere to write it.
   */
  number: number | null;
  /**
   * `seriesCode` + `number`, or `null` where there is no number.
   *
   * **Where the number is missing the key is missing too**, and that is why this
   * is a nullable field rather than a string composed defensively: a key built
   * over an absent number would join to nothing while looking like a join, and
   * there is exactly one place in this module that composes one — {@link piece}
   * — which cannot reach it without a number the type system has already
   * checked.
   */
  key: string | null;
  /** The per-dj marker, present only where the title carries a third segment. */
  partMarker: string | null;
  namingConvention: NamingConvention;
  /** The date written in the file. It always wins over anything a rule proposes. */
  date: CivilDate;
  startTime: CivilTime;
  endTime: CivilTime;
  durationMinutes: number;
  sequence: number | null;
  lastModified: string | null;
}

/** A day taken by something that is not ours (D-44-18). */
export interface ClassifiedCommitment {
  entryClass: "commitment";
  uid: string;
  /**
   * The entry's own title, as written.
   *
   * The **one** field in this module that carries text out of the file, and it
   * exists because `production_commitment.title` does: a day shown as taken with
   * no indication of what took it cannot be scheduled around. It goes to that
   * column and to no log, no toast and no document. See the module docblock.
   */
  title: string;
  date: CivilDate;
  startTime: CivilTime;
  endTime: CivilTime;
  durationMinutes: number;
  /** The recurrence rule, verbatim and uninterpreted, or `null`. */
  recurrenceRaw: string | null;
}

/** An entry nobody may guess at. Identifier and code, no text. */
export interface UnclassifiedEntry {
  entryClass: "unclassified";
  uid: string;
  reason: UnclassifiedReason;
}

/** What one entry turned out to be. */
export type ClassifiedEntry =
  | ClassifiedNight
  | ClassifiedPiece
  | ClassifiedCommitment
  | UnclassifiedEntry;

/** A word the grammar found and the declaration does not cover. Uid and code only. */
export interface AliasFinding {
  uid: string;
  reason: "alias_unresolved";
}

/** The grammar said one thing and the block's shape says another. Uid and code only. */
export interface DurationFinding {
  uid: string;
  /** What the grammar decided. The duration did not decide it and never will. */
  entryClass: "night" | "piece";
  reason: "duration_disagrees_with_grammar";
}

/**
 * Four classes and two finding lists, kept apart.
 *
 * `unclassified` is the **class** list: everything that landed in the fourth
 * class, whatever the reason. `aliasUnresolved` is a **finding** list naming the
 * subset whose repair is a single missing declaration — a different question with
 * a different answer, which is why it is not folded into the first.
 */
export interface ClassificationResult {
  nights: ClassifiedNight[];
  pieces: ClassifiedPiece[];
  commitments: ClassifiedCommitment[];
  unclassified: UnclassifiedEntry[];
  aliasUnresolved: AliasFinding[];
  durationDisagreements: DurationFinding[];
}

/**
 * The kind vocabulary, keyed by production's own label, lower-cased.
 *
 * Built from `PIECE_KIND_LABELS` rather than from a second list of strings, so
 * that the words this module matches on and the words a surface draws are the
 * same words. A seventh kind added to `PIECE_KINDS` arrives here for free.
 */
const KIND_BY_LABEL: ReadonlyMap<string, PieceKind> = buildKindIndex();

function buildKindIndex(): ReadonlyMap<string, PieceKind> {
  const index = new Map<string, PieceKind>();
  for (const kind of PIECE_KINDS) {
    index.set(PIECE_KIND_LABELS[kind].toLowerCase(), kind);
  }
  return index;
}

// ── The two load-time assertions, which are this repository's substitute for a
//    test (`staff-tabs.ts:150-175`, same device and the same reason) ──────────
//
// Two failures, two sentences. A collapsed label and an unbranched convention are
// different mistakes with different repairs, and one message covering both would
// be the collapsed-catch pattern named in the module docblock.

if (KIND_BY_LABEL.size !== PIECE_KINDS.length) {
  throw new Error(
    "production/ics/classify: two piece kinds share a label once lower-cased, so " +
      "one of them can never be recognised in a title. The labels in " +
      "PIECE_KIND_LABELS are production's own words and they have to stay distinct " +
      "— a kind that cannot be matched is a piece silently classified as something " +
      "else."
  );
}

const CANONICAL_CONVENTION: NamingConvention = "canonical";
const LEGACY_CONVENTION: NamingConvention = "legacy";

const BRANCHED_CONVENTIONS = new Set<string>([
  CANONICAL_CONVENTION,
  LEGACY_CONVENTION,
]);

for (const convention of NAMING_CONVENTIONS) {
  if (!BRANCHED_CONVENTIONS.has(convention)) {
    throw new Error(
      `production/ics/classify: "${convention}" is declared in NAMING_CONVENTIONS ` +
        "but no grammar in this module produces it. A convention the vocabulary " +
        "knows and the classifier does not is a set of entries read under the " +
        "wrong grammar — which is exactly how the three legacy entries, and the " +
        "two anchor overrides they carry, went missing from an earlier reading."
    );
  }
}

/**
 * The one key all three grammars normalise to.
 *
 * A series code and a progressivo, and **never a format word plus a number**: two
 * satellite nights share `001` under different series and are told apart only by
 * the word the alias map resolves. See the module docblock for the measurement.
 *
 * The code is upper-cased so that a title written in a different case joins to
 * the same night; the number is formatted from an integer, so `001` and `1` are
 * one key rather than two.
 */
export function joinKey(seriesCode: string, number: number): string {
  return `${seriesCode.trim().toUpperCase()}#${number}`;
}

/**
 * Whether the block's shape disagrees with what the grammar decided.
 *
 * **A warning, computed after the fact, and never a classifier.** Nothing in
 * {@link classifyEntry} reads this value, and nothing may: a reader that decided
 * by duration would silently reclassify the first piece the owner books at a
 * different hour, and a silent reclassification here hands an entry a format and
 * a progressivo it does not have.
 *
 * `false` for a commitment and for an unclassified entry, because both are
 * heterogeneous by definition and a disagreement with no expectation is not a
 * disagreement.
 */
export function durationDisagreement(
  event: IcsEvent,
  entryClass: ClassifiedEntry["entryClass"]
): boolean {
  const startHour = hourOf(event.startTime);
  if (startHour === null) return false;

  if (entryClass === "piece") {
    return event.durationMinutes > PIECE_MAX_MINUTES || startHour >= EVENING_FROM_HOUR;
  }

  if (entryClass === "night") {
    return event.durationMinutes < NIGHT_MIN_MINUTES || startHour < EVENING_FROM_HOUR;
  }

  return false;
}

/**
 * Decide what one entry is.
 *
 * @param event a record the parser already validated — its dates are civil
 *   strings and its `summary` has had its RFC 5545 escapes resolved
 * @param aliases lower-cased word → series code, supplied by the caller from
 *   `party_series.ics_alias`. **Never a literal in this file**; see the module
 *   docblock for why that is a confidentiality rule and not a preference
 */
export function classifyEntry(
  event: IcsEvent,
  aliases: ReadonlyMap<string, string>
): ClassifiedEntry {
  const title = event.summary.trim();

  const canonical = readCanonicalPiece(event, title, aliases);
  if (canonical !== null) return canonical;

  const legacy = readLegacyPiece(event, title, aliases);
  if (legacy !== null) return legacy;

  const night = readNight(event, title, aliases);
  if (night !== null) return night;

  // Nothing matched a grammar. An entry that still carries a word the
  // declaration knows is **recorded and counted**, never guessed: guessing hands
  // it a format and a progressivo it does not have, which is the precise harm
  // D-44-18 names. Everything else is a day taken by somebody else.
  if (carriesKnownWord(title, aliases)) {
    return unclassified(event.uid, "known_word_without_kind_or_number");
  }

  return {
    entryClass: "commitment",
    uid: event.uid,
    title: event.summary,
    date: event.startDate,
    startTime: event.startTime,
    endTime: event.endTime,
    durationMinutes: event.durationMinutes,
    recurrenceRaw: event.rrule,
  };
}

/**
 * Classify a whole file, into four class lists and two finding lists.
 *
 * The duration signal is applied **here**, after every entry has already been
 * decided by its grammar, and it produces a finding rather than a reclassification.
 */
export function classifyEntries(
  events: readonly IcsEvent[],
  aliases: ReadonlyMap<string, string>
): ClassificationResult {
  const result: ClassificationResult = {
    nights: [],
    pieces: [],
    commitments: [],
    unclassified: [],
    aliasUnresolved: [],
    durationDisagreements: [],
  };

  for (const event of events) {
    const entry = classifyEntry(event, aliases);

    switch (entry.entryClass) {
      case "night":
        result.nights.push(entry);
        break;
      case "piece":
        result.pieces.push(entry);
        break;
      case "commitment":
        result.commitments.push(entry);
        break;
      case "unclassified":
        result.unclassified.push(entry);
        if (entry.reason === "alias_unresolved") {
          result.aliasUnresolved.push({
            uid: entry.uid,
            reason: "alias_unresolved",
          });
        }
        break;
    }

    if (entry.entryClass === "night" || entry.entryClass === "piece") {
      if (durationDisagreement(event, entry.entryClass)) {
        result.durationDisagreements.push({
          uid: event.uid,
          entryClass: entry.entryClass,
          reason: "duration_disagrees_with_grammar",
        });
      }
    }
  }

  return result;
}

// ── The three grammars ──────────────────────────────────────────────────────

/** The separator between a title's segments: a space, a hyphen and a space. */
const SEGMENT_SEPARATOR = " - ";

/**
 * `<Kind> - <SERIES>-<NNN>[ - <part>]`, **and its variant with a name in the
 * sigla's place** — `<Kind> - <Name>[ x <Venue>]`.
 *
 * The kind is matched against the six labels, lower-cased, and never against a
 * free string: a title whose first segment is some other word is not a piece of a
 * seventh kind, it is not a piece at all.
 *
 * ── ⚠ THE SECOND SEGMENT IS READ TWICE, IN THIS ORDER ───────────────────────
 *
 * First as a sigla and a progressivo. Then, only where that fails, as a **name**
 * — which the alias map turns into a series code exactly as it does for a night.
 * Thirty-one entries of the measured file arrive on the second reading, and
 * before it existed every one of them fell on the single branch below and was
 * counted as unreadable.
 *
 * **It stays inside this grammar, and that is a decision (D-44-21).** Same
 * separator, same order — the kind first — and only the way the series is spelt
 * differs, so a piece read this way records `canonical` and no third convention
 * is opened. The diagnostic value D-44-21 defends is not lost: it is already
 * readable from two columns that exist. A `canonical` piece with a series and no
 * number is the named variant; with neither is the bare one. Nobody needs a
 * third word for it, and a third word is how a vocabulary starts drifting from
 * the `CHECK` that mirrors it.
 *
 * ── The three answers, and why none of them is a guess ──────────────────────
 *
 * `null` when the title is not in this grammar at all. A first segment that *is*
 * a kind is strong evidence the entry is ours, so the remaining outcomes are
 * findings rather than a fallthrough into somebody else's day:
 *
 * - the name resolves — a piece, with the series and **no number**;
 * - the name does not resolve but the shape is unmistakably ours (it carries the
 *   join word) — `alias_unresolved`, the same refusal a night gets, and **never
 *   the nearest series**;
 * - the second segment is neither a sigla nor a name we can recognise —
 *   `kind_without_series_and_number`, which is the branch that used to catch all
 *   thirty-one.
 */
function readCanonicalPiece(
  event: IcsEvent,
  title: string,
  aliases: ReadonlyMap<string, string>
): ClassifiedEntry | null {
  const segments = title.split(SEGMENT_SEPARATOR);
  if (segments.length < 2) return null;

  const kind = KIND_BY_LABEL.get(segments[0].trim().toLowerCase());
  if (kind === undefined) return null;

  const partMarker = segments.length > 2 ? segments[2].trim() : "";
  const marker = partMarker.length > 0 ? partMarker : null;

  const reference = readSeriesAndNumber(segments[1]);

  if (reference !== null) {
    if (reference.number === null) {
      return unclassified(event.uid, "number_not_readable");
    }

    return piece(
      event,
      kind,
      reference.seriesCode,
      reference.number,
      marker,
      CANONICAL_CONVENTION
    );
  }

  const named = resolveSeriesFromName(segments[1], aliases);

  if (named.seriesCode !== null) {
    return piece(event, kind, named.seriesCode, null, marker, CANONICAL_CONVENTION);
  }

  if (named.unmistakable) {
    return unclassified(event.uid, "alias_unresolved");
  }

  return unclassified(event.uid, "kind_without_series_and_number");
}

/**
 * `<Word> <NNN> - <Kind>`.
 *
 * Three entries in the file, confined to the two earliest editions of the night,
 * and they carry **both** of its genuine anchor overrides. A reader that handled
 * only the canonical grammar would drop them, and with them the only live
 * evidence that a written date has to win over a computed one.
 *
 * The leading word has no series code attached, so it goes through the alias map
 * — the same map, the same rule, and the same refusal when it resolves to
 * nothing.
 */
function readLegacyPiece(
  event: IcsEvent,
  title: string,
  aliases: ReadonlyMap<string, string>
): ClassifiedEntry | null {
  const segments = title.split(SEGMENT_SEPARATOR);
  if (segments.length !== 2) return null;

  const kind = KIND_BY_LABEL.get(segments[1].trim().toLowerCase());
  if (kind === undefined) return null;

  const head = splitTrailingNumber(segments[0]);
  if (head === null) return null;
  if (head.number === null) {
    return unclassified(event.uid, "number_not_readable");
  }

  const seriesCode = aliases.get(head.text.toLowerCase());
  if (seriesCode === undefined) {
    return unclassified(event.uid, "alias_unresolved");
  }

  return piece(
    event,
    kind,
    seriesCode,
    head.number,
    null,
    LEGACY_CONVENTION
  );
}

/**
 * `<Word>[ x <Word>] <NNN>` — no kind token and no series code.
 *
 * This is the shape D-44-21 was written about and it is the one that makes the
 * alias map necessary: a matcher keyed on series codes finds **zero** nights, and
 * a first pass that tried reported thirteen nights as missing.
 *
 * Where the title carries a ` x `, the word after it is the one that
 * distinguishes two satellites sharing a progressivo, so it is the one looked up.
 * Where it does not, the leading text is looked up whole and then by its last
 * word — two deterministic lookups of a declared abbreviation, not two guesses.
 *
 * A title that is unmistakably in this shape — it has a ` x ` and a trailing
 * number — and whose word resolves to nothing is **unclassified**, never attached
 * to the nearest series. A title without a ` x ` whose word resolves to nothing
 * is not a night at all and falls through to the caller's last two branches.
 */
function readNight(
  event: IcsEvent,
  title: string,
  aliases: ReadonlyMap<string, string>
): ClassifiedEntry | null {
  if (title.includes(SEGMENT_SEPARATOR)) return null;

  const head = splitTrailingNumber(title);
  if (head === null) return null;
  if (head.number === null) {
    return unclassified(event.uid, "number_not_readable");
  }

  const named = resolveSeriesFromName(head.text, aliases);

  if (named.seriesCode === null) {
    // Unmistakably our shape, and the declaration does not cover it: a finding,
    // and never the nearest series.
    if (named.unmistakable) {
      return unclassified(event.uid, "alias_unresolved");
    }
    return null;
  }

  return {
    entryClass: "night",
    uid: event.uid,
    seriesCode: named.seriesCode,
    number: head.number,
    key: joinKey(named.seriesCode, head.number),
    venueWord: named.venueWord,
    startDate: event.startDate,
    startTime: event.startTime,
    endDate: event.endDate,
    endTime: event.endTime,
    durationMinutes: event.durationMinutes,
    sequence: event.sequence,
    lastModified: event.lastModified,
  };
}

// ── The small readers the three grammars share ──────────────────────────────

/** What a name turned into, and how sure we are that the title was ours. */
interface NameResolution {
  /** The declared series code, or `null` where the map does not cover the word. */
  seriesCode: string | null;
  /**
   * The title carries the join word, so it is unmistakably ours.
   *
   * This is what separates a **finding** from a fallthrough: `<Something> x
   * <Something>` is the shape this production writes and nobody else does, so a
   * word the declaration does not cover is a missing declaration and gets
   * counted. A title without the join word that resolves to nothing is simply
   * not ours, and is left to the caller's remaining branches.
   */
  unmistakable: boolean;
  /** The word after the join word, or `null` where the title carries none. */
  venueWord: string | null;
}

/**
 * Turn the name a title carries into the series code somebody declared for it.
 *
 * **One function, two callers** — {@link readNight} and {@link readCanonicalPiece}
 * — and that is the point of it existing rather than being written twice. Two
 * copies of this would be two readings of the same calendar that agree today: the
 * night `RamaDub x Booze 001` and the piece `Listing - RamaDub x Booze` have to
 * resolve to the **same** series or the join between them silently produces
 * nothing, and a join that produces nothing looks exactly like a calendar with
 * nothing in it.
 *
 * Where the title carries the join word, the word **after** it is the one looked
 * up: two satellites share the progressivo `001` under different series and are
 * told apart only by that word. Where it does not, the leading text is looked up
 * whole and then by its last word — two deterministic lookups of a declared
 * abbreviation, not two guesses.
 *
 * The map is an argument here as it is everywhere in this module, and for the
 * same reason: its values are words for spaces, and this repository is public.
 */
function resolveSeriesFromName(
  text: string,
  aliases: ReadonlyMap<string, string>
): NameResolution {
  const trimmed = text.trim();
  const separated = splitOnJoinWord(trimmed);

  const candidates =
    separated === null
      ? [trimmed, lastWord(trimmed)]
      : [separated.venueWord, lastWord(separated.venueWord)];

  for (const candidate of candidates) {
    if (candidate.length === 0) continue;
    const seriesCode = aliases.get(candidate.toLowerCase());
    if (seriesCode !== undefined) {
      return {
        seriesCode,
        unmistakable: separated !== null,
        venueWord: separated === null ? null : separated.venueWord,
      };
    }
  }

  return {
    seriesCode: null,
    unmistakable: separated !== null,
    venueWord: separated === null ? null : separated.venueWord,
  };
}

/** A `<SERIES>-<NNN>` reference, taken apart at its last hyphen. */
interface SeriesReference {
  seriesCode: string;
  /** `null` when the trailing group is not a whole number. */
  number: number | null;
}

/**
 * Everything before the **last** hyphen is the series code, everything after it
 * is the progressivo.
 *
 * Taken from the **last** hyphen because a series code may itself contain one,
 * and taken from the title because a series code is already public — unlike the
 * word a night carries, which is why only that word needs the map.
 */
function readSeriesAndNumber(segment: string): SeriesReference | null {
  const text = segment.trim();
  const hyphen = text.lastIndexOf("-");
  if (hyphen < 1 || hyphen === text.length - 1) return null;

  const seriesCode = text.slice(0, hyphen).trim();
  const digits = text.slice(hyphen + 1).trim();
  if (seriesCode.length === 0) return null;

  return { seriesCode, number: readWholeNumber(digits) };
}

/** A title's text and the progressivo that ended it. */
interface TrailingNumber {
  text: string;
  /** `null` when the trailing token is not a whole number. */
  number: number | null;
}

/**
 * Split a `<something> <NNN>` string at its last whitespace.
 *
 * `null` when there is no trailing token to read, which is how a title with no
 * progressivo at all leaves a grammar rather than being handed one.
 */
function splitTrailingNumber(segment: string): TrailingNumber | null {
  const text = segment.trim();
  const space = text.lastIndexOf(" ");
  if (space < 1) return null;

  const head = text.slice(0, space).trim();
  const tail = text.slice(space + 1).trim();
  if (head.length === 0 || tail.length === 0) return null;
  if (!looksNumeric(tail)) return null;

  return { text: head, number: readWholeNumber(tail) };
}

/** What follows the ` x ` in a night's title, and what precedes it. */
interface JoinWordSplit {
  formatWords: string;
  venueWord: string;
}

/**
 * Split `<Words> x <Word>` on the single-letter token, case-insensitively.
 *
 * A **token**, not a character: looking for the letter inside a word would cut a
 * title in half at an arbitrary point. The separator is the one the app's own
 * naming convention uses for a satellite, and it is the thing that tells two
 * satellites sharing a progressivo apart.
 */
function splitOnJoinWord(text: string): JoinWordSplit | null {
  const tokens = text.split(/\s+/).filter((token) => token.length > 0);

  for (let index = tokens.length - 2; index >= 1; index -= 1) {
    if (tokens[index].toLowerCase() !== "x") continue;
    return {
      formatWords: tokens.slice(0, index).join(" "),
      venueWord: tokens.slice(index + 1).join(" "),
    };
  }

  return null;
}

/** The last whitespace-delimited token, or the whole string when there is one. */
function lastWord(text: string): string {
  const tokens = text.split(/\s+/).filter((token) => token.length > 0);
  return tokens.length === 0 ? "" : tokens[tokens.length - 1];
}

/**
 * Whether any token of a title — or the title whole — is a word the declaration
 * knows.
 *
 * This is what separates the last two branches: an entry carrying a known word
 * but no grammar is **ours and unreadable**, and gets counted; an entry carrying
 * none is somebody else's day, and gets imported as one.
 */
function carriesKnownWord(title: string, aliases: ReadonlyMap<string, string>): boolean {
  if (aliases.has(title.toLowerCase())) return true;

  for (const token of title.split(/[\s\-,:]+/)) {
    if (token.length === 0) continue;
    if (aliases.has(token.toLowerCase())) return true;
  }

  return false;
}

/** Whether every character is an ASCII digit. Nothing else counts as a progressivo. */
function looksNumeric(text: string): boolean {
  if (text.length === 0) return false;
  for (const character of text) {
    if (character < "0" || character > "9") return false;
  }
  return true;
}

/** A progressivo, leading zeros and all, or `null` when it is not a whole number. */
function readWholeNumber(text: string): number | null {
  if (!looksNumeric(text)) return null;
  const value = Number(text);
  if (!Number.isSafeInteger(value) || value < 0) return null;
  return value;
}

/** An entry recorded rather than guessed: identifier and code, no text. */
function unclassified(uid: string, reason: UnclassifiedReason): UnclassifiedEntry {
  return { entryClass: "unclassified", uid, reason };
}

/**
 * Assemble a piece, whichever grammar produced it. One shape, one key.
 *
 * ⚠ **The only place in this module that composes a piece's key**, and the
 * reason that matters is the branch below: where the title carried no
 * progressivo the key is `null`, full stop. There is no code path that formats
 * an absent number into a string, so `"<SERIES>-undefined"` is not a value this
 * module can produce — which is a stronger statement than a comment forbidding
 * it, and it is the form the phase asked for.
 */
function piece(
  event: IcsEvent,
  kind: PieceKind,
  seriesCode: string,
  number: number | null,
  partMarker: string | null,
  namingConvention: NamingConvention
): ClassifiedPiece {
  return {
    entryClass: "piece",
    uid: event.uid,
    kind,
    seriesCode,
    number,
    key: number === null ? null : joinKey(seriesCode, number),
    partMarker,
    namingConvention,
    date: event.startDate,
    startTime: event.startTime,
    endTime: event.endTime,
    durationMinutes: event.durationMinutes,
    sequence: event.sequence,
    lastModified: event.lastModified,
  };
}

/** The hour of an `HH:MM`, or `null` when it is not one. */
function hourOf(time: CivilTime): number | null {
  if (time.length < 5 || time[2] !== ":") return null;
  const hour = Number(time.slice(0, 2));
  if (!Number.isInteger(hour) || hour < 0 || hour > 23) return null;
  return hour;
}
