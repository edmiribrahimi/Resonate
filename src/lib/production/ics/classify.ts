/**
 * What an entry in the production calendar **is** — decided from its title and,
 * where the title is silent, from its note, into exactly four classes.
 *
 * ── ⚠ THE NOTE IS A DECLARED SOURCE, AND THE TITLE IS THE OTHER ─────────────
 *
 * Until 2026-08-22 this module read titles and nothing else, and `./parse`
 * carried a comment saying no question downstream needed anything more. Four
 * questions did, and three of them were being answered by derivation:
 *
 *   1. **which night a piece announces** — derived by comparing the piece's date
 *      against every candidate night's pipeline window, with two ways to fail
 *      (`no_candidate_edition`, `several_candidate_editions`);
 *   2. **the progressivo of a night** — looked for in the title only, so a night
 *      whose title does not carry one was not a night at all;
 *   3. **who is playing** — not answered anywhere;
 *   4. **how many LiveCuts that line-up owes** — which descends from 3
 *      (`production-calendar.md`, gate *un podcast per dj*).
 *
 * Measured on the two live feeds, 2026-08-22 — **54 notes**, and the first line
 * of every one of them is:
 *
 *     <Parola>[ x <Parola>] <NNN>, <giorno-settimana> <giorno> <mese>
 *
 * which is **the night grammar of {@link readNight}, followed by that night's
 * date**. So the note is not a fourth grammar: it is the third one, written in a
 * second place — and the second place is the one that carries the number.
 *
 * ── ⚠ THE PRECEDENCE, WRITTEN HERE SO NOBODY HAS TO INFER IT ────────────────
 *
 *     **THE TITLE DECLARES. THE NOTE FILLS SILENCE.**
 *
 * Where the title carries a value, that value stands. Where the title carries
 * none and the note declares one, the note's is read. Where **both** declare and
 * they differ, the title still stands and the divergence becomes a finding,
 * counted in {@link ClassificationResult.noteDisagreements} — never a silent
 * correction and never a silent overwrite.
 *
 * It is not symmetric, and the asymmetry is the argument. Reading a number the
 * title lacked is **appending**; changing a number the title carried is
 * **renumbering** — the third of this project's monotone guards, and a
 * progressivo that has been given out is already on a poster (`meta-gates.md`).
 * A source that can only add cannot renumber. One that can also replace could do
 * it without anybody editing the thing they actually look at, which is the title.
 *
 * `scripts/verify-ics-grammar.mjs` holds the rule rather than this paragraph
 * holding it alone: case `N7` gives a title and a note that disagree about a
 * progressivo and asserts the title's, and reversing the precedence was applied
 * and measured — the case goes red, and it goes red as `GUESSED`, which is the
 * graver of that gate's two verdicts.
 *
 * ── ⚠ THE REST OF THE NOTE IS THE LINE-UP, AND IT IS READ BY THE SLOT ───────
 *
 * The lines after the first used to be **declared unread**, and the reason given
 * was true when it was written: the schema had nowhere to keep them. The owner
 * closed that on 2026-08-22 — the line-up enters the mirror, with a table of its
 * own — and the same decision carried a **correction of domain that outranks the
 * gate as it is written today**:
 *
 *     **A LIVECUT IS COUNTED FROM THE SLOTS OF A TIMETABLE, NEVER FROM THE
 *     NAMES IN IT. Artists play together — a b2b is ONE recording, not two.**
 *
 * `production-calendar.md` says *un podcast per dj*, and counting names is what
 * that sentence reads like. It over-counts: measured on the live feeds, one
 * night carries **six names in five slots** and another **four names in two**,
 * and the calendar holds exactly five LiveCut entries for the first — so the
 * name count would have planned a sixth episode that cannot exist. A piece
 * planned that nobody owes is a hole discovered on the day it was due.
 *
 * So the unit this module returns is the **slot**: an interval, and one or more
 * artists inside it. {@link readNoteSlots} is the whole of it, and the count a
 * caller wants is `slots.length` — never a sum over the names.
 *
 * ── ⚠ THE NOTE IS THE MOST CONFIDENTIAL TEXT THIS MODULE TOUCHES ────────────
 *
 * It names whoever is playing, on a date that may not have been announced
 * (`sound-manifesto.md`: *chi suona a una data non ancora comunicata non si
 * scrive qui e non si scrive nel repo*). **No finding below carries a word of
 * one**, exactly as none carries a word of a title.
 *
 * ⚠ **{@link readNoteSlots} is the one function here that returns a name**, and
 * the rule that makes it admissible is narrow and has to stay narrow: its value
 * goes to a **column**, behind row-level security, and nowhere else. It reaches
 * no finding, no report line, no log and no file. A caller that prints a slot's
 * artists has published a line-up, and this repository is public.
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
  "A title that is **nothing but** a kind — the bare `Timetable` — enters as a piece of that kind with **neither a series nor a progressivo**, because the title carries neither, and the night it belongs to is found by the second pass from its date. Where the piece names no series the candidates are the nights of **every** series whose pipeline declares a rule for that kind, and the three outcomes are the same three: one joins, none is `no_candidate_edition`, more than one is `several_candidate_editions`. It is never a day taken by somebody else — that outcome has no channel of its own on the import summary, so a piece of ours read that way disappears in silence.",
  "A piece whose **kind has no pipeline rule at all** — `flyering`, the seventh kind (D-58-04) — is neither joined nor refused. It enters as a piece, with its series resolved through the alias map where the title names one and no progressivo either way, and it stays an **orphan**: `plan_id` empty, and `conforms_to_rule` **null** rather than `false`, because *we could not work it out* is a third answer and must not arrive dressed as a refusal. No rule is invented for it — nobody has measured an anchor, and an invented one would be an offset written where a rule belongs. An orphan piece is a state the schema provides for, and a visible orphan is what this decision buys.",
  "A piece that carries no progressivo is joined to a night by comparing its date against every candidate night of its series, in the direction its pipeline rule declares. Exactly one candidate joins; none is recorded as `no_candidate_edition`; more than one is recorded as `several_candidate_editions`. **Never the nearest.** The join writes which night, and still no number.",
  "A title of the form `<Word>[ x <Word>]` carrying no kind token and **no progressivo**, whose note declares one — the note's first line being `<Word>[ x <Word>] <NNN>, <that night's date>` — enters as a night with the progressivo **the note declares**, under three conditions that all hold or none of it does: the note's leading word resolves through the alias map, the note's leading word is the title itself, and the date the note declares is this entry's own date. The third condition is what keeps a piece from being read as the night it announces: a piece's note names its night, whose date is not the piece's. The number is **read, never invented**, and where the title carries one the title's stands.",
  "A piece carrying no progressivo whose note names the night it announces is joined to **that** night rather than to the one a date window proposes. The declared night is recorded as *which night*, never as a number: what the title carried is remembered, what only the note implies is remembered as an attachment, and the piece's own `number` stays null. Where the declared night is not in the file, the date window answers instead, and its answer for a night the calendar does not hold is `no_candidate_edition` — which is the true thing to say.",
  "A note whose first line does not read as `<Word>[ x <Word>] <NNN>, <date>` — no comma, no trailing number, or a month this reader's lexicon does not carry — is **declared unread**. It changes nothing: the entry is classified from its title exactly as it was before notes were read at all. A note read wrongly hands an entry a series or a progressivo it does not have; a note left unread leaves the entry where the title alone put it, which is visible and correctable.",
  "Every line of a note after the first is the line-up, and is **not read**: the schema has nowhere to keep one, and a reader that parsed it would be pulling the names of people playing unannounced dates into this process for no destination.",
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
  /**
   * Where {@link ClassifiedNight.number} was read from.
   *
   * `title` is every night whose own title ends in a progressivo. `note` is a
   * night whose title carries none and whose note declares one — the three
   * satellites of the measured feeds, which until 2026-08-22 were not nights at
   * all but days taken by somebody else.
   *
   * It is a **fact for the run report to count**, not a column: nothing in
   * `./reconcile` maps it, and `production_plan` has no field for it. A report
   * that cannot say *three of these numbers came from a note* is a report that
   * hides where a value came from the first time one is wrong.
   */
  numberSource: "title" | "note";
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
  /**
   * Carried by the title as a sigla, resolved from the name it carries instead,
   * **or `null` where the title carries neither**.
   *
   * Nullable since `ICS-08`, and the null is a deliverable exactly as
   * {@link ClassifiedPiece.number}'s is. A title that is nothing but a kind — the
   * bare `Timetable` of D-58-03 — names neither its series nor its edition, and
   * the only honest answer is that it names neither. Which night it belongs to
   * is answered by date, in {@link attachNumberlessPieces}, among the nights of
   * every series that owns a rule for that kind.
   *
   * ⚠ **It is never filled in from the join.** The night the second pass finds
   * carries the series, one join away; copying it here would turn a derived
   * value into a written one, and the two would silently disagree the first time
   * a night is corrected. The rule the whole phase turns on holds for this field
   * as well: *what the title carried is remembered; what only the join implies
   * is not.*
   */
  seriesCode: string | null;
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
  /**
   * The night this piece's **note** says it announces, as a join key — or `null`
   * where the note declares none.
   *
   * ⚠ **This is *which night*, and it is never a progressivo.** The rule the
   * phase before this one turned on holds here word for word: what the title
   * carried is remembered, what only a second source implies is remembered as an
   * attachment and not as a number. {@link ClassifiedPiece.number} stays `null`
   * on every piece whose title carried none, whatever the note says, and there
   * is no path in this module that copies one into the other — {@link piece},
   * the single place a piece is assembled, takes no note at all.
   *
   * It is consulted by `attachNumberlessPieces` **before** the date window — a
   * night the calendar declares beats a night a rule proposes — and where the
   * declared night is not in the file the window answers instead, which for a
   * night the calendar does not hold is `no_candidate_edition`.
   */
  declaredNightKey: string | null;
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
 * The title declared one thing and the note declared another. Uid and code only.
 *
 * Two codes, and they must stay two. *The numbers differ* is a calendar somebody
 * edited in one place and not the other, and the way out is to look at the entry
 * and decide which is right. *The series differ* is rarer and worse: a piece
 * filed under one format whose note names a night of another, which is a piece
 * about to be joined to the wrong series entirely. One shared code would send
 * both readers to the wrong place, and this product has no error tracking to
 * correct them afterwards (`meta-gates.md`).
 *
 * **In neither case does the note win.** The title stands and the divergence is
 * counted — see the precedence paragraph in the module docblock.
 */
export interface NoteFinding {
  uid: string;
  reason: "note_number_disagrees_with_title" | "note_series_disagrees_with_title";
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
  /**
   * Entries whose title and note declare different things. A **third** finding
   * list rather than a widening of either of the two above, for the same reason
   * those two are two: an unresolved alias, a block of the wrong shape and a
   * note contradicting its title are three different pieces of work.
   */
  noteDisagreements: NoteFinding[];
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
  if (canonical !== null) return withDeclaredNight(canonical, event, aliases);

  const legacy = readLegacyPiece(event, title, aliases);
  if (legacy !== null) return withDeclaredNight(legacy, event, aliases);

  const night = readNight(event, title, aliases);
  if (night !== null) return night;

  const bare = readBareKind(event, title);
  if (bare !== null) return withDeclaredNight(bare, event, aliases);

  // Fifth, and only here: the title is silent, so the note may speak. It cannot
  // take an entry from any grammar above — see {@link readNightFromNote} for why
  // running last is what makes its three conditions sufficient.
  const declaredNight = readNightFromNote(event, title, aliases);
  if (declaredNight !== null) return declaredNight;

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
    noteDisagreements: [],
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

    // After the grammar, like the duration signal above, and deciding nothing
    // for the same reason: the title stands, and this only says somebody should
    // look at the two.
    const disagreement = noteDisagreement(event, entry, aliases);
    if (disagreement !== null) {
      result.noteDisagreements.push({ uid: event.uid, reason: disagreement });
    }
  }

  return result;
}

/**
 * Hand a piece the night its note names, where it has no number of its own.
 *
 * ⚠ **It fills {@link ClassifiedPiece.declaredNightKey} and nothing else.** A
 * piece that already carries a progressivo needs no attachment — its own key is
 * the join — and a piece that does not is still not given one: the field holds
 * *which night*, and the piece's `number` stays `null` all the way to its row.
 * There is no assignment in this module from a note to a number, which is a
 * stronger statement than a comment forbidding one.
 */
function withDeclaredNight(
  entry: ClassifiedEntry,
  event: IcsEvent,
  aliases: ReadonlyMap<string, string>
): ClassifiedEntry {
  if (entry.entryClass !== "piece") return entry;
  if (entry.key !== null) return entry;

  const declared = declaredNightKeyOf(event, aliases);
  if (declared === null) return entry;

  return { ...entry, declaredNightKey: declared };
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
 * `<Kind>` — a title that is **nothing but** one of production's own words for a
 * piece, with no series, no progressivo and no second segment (D-58-03).
 *
 * ── Why this is a piece and not a day taken by somebody else ────────────────
 *
 * Before `ICS-08` such a title fell all the way through to the last branch of
 * {@link classifyEntry} and became a **commitment** — a row in the table that
 * says of itself that it holds *something which is not our production, and which
 * occupies a day*. That is worse than being unreadable, and the difference is
 * not academic: an unclassified entry has a channel of its own on the import
 * summary and is counted there, while a commitment is a normal, expected outcome
 * that the surface draws as *a day that is taken*. A piece of ours read that way
 * disappears in silence, and silence is the failure mode this project names
 * first (`meta-gates.md`).
 *
 * ── The order it is tried in, and why that order is safe ────────────────────
 *
 * Fourth, after the three grammars. It cannot steal an entry from any of them: a
 * canonical or legacy piece carries the segment separator and a night carries a
 * trailing number, and a title that is exactly a kind label has neither. Trying
 * it last also keeps it from shadowing a future grammar that happens to start
 * with a kind word.
 *
 * ── ⚠ It is a SHAPE THE READER ADMITS, not a shape the file carries ─────────
 *
 * Re-measured on 2026-08-20 against both snapshots on the owner's machine:
 * **zero** entries are bare like this — every `Timetable` in the file carries a
 * sigla and is read by the canonical grammar. So this branch changes no count
 * today, and describing it as *"seven timetables stop being days taken by
 * somebody else"* would be a claim the material does not support. What it does
 * buy is that the first one written this way is read instead of vanishing.
 *
 * ── Neither a series nor a number is invented ───────────────────────────────
 *
 * The title carries neither, so the piece carries neither: `seriesCode` and
 * `number` are both `null`, and therefore so is the key. Which night it belongs
 * to is found by {@link attachNumberlessPieces} from its **date** — and for the
 * one kind the calendar bares today the answer is exact rather than approximate,
 * because the night's `timetable` rule anchors on `self`, the night's own day. A
 * date with no night on it is `no_candidate_edition`: unclassified, counted and
 * visible, which is the point.
 */
function readBareKind(event: IcsEvent, title: string): ClassifiedEntry | null {
  const kind = KIND_BY_LABEL.get(title.trim().toLowerCase());
  if (kind === undefined) return null;

  return piece(event, kind, null, null, null, CANONICAL_CONVENTION);
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
    // The title carried the number, so the title is where it came from — and a
    // note that disagrees does not change that, it produces a finding.
    numberSource: "title",
    startDate: event.startDate,
    startTime: event.startTime,
    endDate: event.endDate,
    endTime: event.endTime,
    durationMinutes: event.durationMinutes,
    sequence: event.sequence,
    lastModified: event.lastModified,
  };
}

// ── The note, read for exactly one thing ────────────────────────────────────

/**
 * What a note's first line declared. Never text that names anybody.
 *
 * {@link NoteDeclaration.head} is a word the alias map is about to resolve — the
 * same word a night's own title carries, and the same lookup — so it lives here
 * for one call and reaches no finding, no log and no column, exactly as the
 * night's does.
 */
export interface NoteDeclaration {
  /** The reference's leading text: everything before the progressivo. */
  head: string;
  /** The progressivo the note declares **for the night**. Read, never invented. */
  number: number;
  /** The declared day of the month, 1–31. */
  day: number;
  /** The declared month, 1–12. */
  month: number;
}

/**
 * The month words this reader knows, in order, lower-cased.
 *
 * ⚠ **English only, and that is a measurement rather than a preference.** All 54
 * notes in the two live feeds spell their month in English — 45 unambiguously
 * and 9 on a prefix the two languages happen to share — and **none** in Italian.
 * It matches what `brand-visual-system.md` requires of anything published (gate
 * *lingua dei materiali*: `Thursday 18 Sept`, month abbreviated, no ordinals).
 *
 * A month this list does not carry makes the note **unread**, not guessed, and
 * the entry falls back to what its title alone said. That is the direction of
 * error this whole module is built around, and case `N6` of
 * `scripts/verify-ics-grammar.mjs` holds it: a note whose month is Italian
 * changes nothing.
 *
 * Matched by **prefix**, because the file abbreviates, and spelling out four
 * fixed abbreviations alongside twelve full words would be two lists of one
 * fact. A prefix shorter than three characters is refused, so a stray `M` cannot
 * become March.
 */
const MONTH_WORDS = [
  "january",
  "february",
  "march",
  "april",
  "may",
  "june",
  "july",
  "august",
  "september",
  "october",
  "november",
  "december",
] as const;

/** The month a word names, 1-based, or `null`. Prefix match, three characters minimum. */
function monthOf(word: string): number | null {
  const cleaned = word.toLowerCase().replace(/[^a-z]/g, "");
  if (cleaned.length < 3) return null;

  let found: number | null = null;
  for (let index = 0; index < MONTH_WORDS.length; index += 1) {
    if (!MONTH_WORDS[index].startsWith(cleaned)) continue;
    // Two months sharing a prefix would make this a guess, so it is refused
    // instead. No pair of the twelve does today; the branch exists so the claim
    // is enforced rather than believed.
    if (found !== null) return null;
    found = index + 1;
  }
  return found;
}

/**
 * Read a note's first line as *which night, and when*.
 *
 * ── The shape, measured before it was written ───────────────────────────────
 *
 *     <Parola>[ x <Parola>] <NNN>, <giorno-settimana> <giorno> <mese>
 *
 * 54 of 54 notes in the two live feeds, 2026-08-22. The left half is exactly the
 * grammar {@link readNight} reads off a night's own title; the right half is that
 * night's date, and **it carries no year**. That absence is why the date answers
 * only *is this the entry's own day* — a question the entry's own `DTSTART`
 * supplies the year for — and never dates anything.
 *
 * ── What makes it `null`, and why `null` is a good answer ───────────────────
 *
 * No first line, no comma, nothing that reads as `<text> <NNN>` before it, or a
 * month outside {@link MONTH_WORDS}. Three of the measured notes are like this
 * and they belong to entries that are not ours at all — somebody else's diary
 * text, which is exactly the population a reader would least like to invent a
 * series for.
 *
 * ⚠ **Only the first line is looked at.** Everything after it is the line-up,
 * and the module docblock says why it stays unread.
 */
export function readNoteDeclaration(description: string): NoteDeclaration | null {
  if (description.length === 0) return null;

  const first = description.split("\n").find((line) => line.trim().length > 0);
  if (first === undefined) return null;

  const comma = first.indexOf(",");
  if (comma < 1) return null;

  const reference = splitTrailingNumber(first.slice(0, comma));
  if (reference === null || reference.number === null) return null;

  let day: number | null = null;
  let month: number | null = null;

  for (const token of first.slice(comma + 1).split(/\s+/)) {
    const cleaned = token.replace(/[^0-9A-Za-z]/g, "");
    if (cleaned.length === 0) continue;

    // A day is a token that is nothing but one or two digits. `18th` is not one
    // — the file does not write ordinals (`brand-visual-system.md`) — and a
    // token this reader cannot place leaves `day` unset, which makes the note
    // unread rather than half-read.
    if (day === null && /^\d{1,2}$/.test(cleaned)) {
      const value = Number(cleaned);
      if (value >= 1 && value <= 31) {
        day = value;
        continue;
      }
    }

    if (month === null) {
      const named = monthOf(cleaned);
      if (named !== null) month = named;
    }
  }

  if (day === null || month === null) return null;

  return { head: reference.text, number: reference.number, day, month };
}

/** Whether a declared day and month are the civil date this entry itself falls on. */
function declaresOwnDate(declaration: NoteDeclaration, date: CivilDate): boolean {
  if (date.length !== 10) return false;
  return (
    Number(date.slice(5, 7)) === declaration.month &&
    Number(date.slice(8, 10)) === declaration.day
  );
}

/**
 * ONE SLOT OF A TIMETABLE: a window, and the people who play inside it.
 *
 * ⚠ **The slot is the unit, and it is the unit because of what is counted from
 * it.** `production_pipeline_rule.episodes_from_lineup` is `true` on exactly one
 * rule, the LiveCut, and a LiveCut is the recording of a **set** — so two people
 * playing back to back produce **one** recording, not two. Counting the names
 * plans an episode nobody owes; counting the slots plans what exists.
 *
 * {@link artists} may be **empty**, and that is a third answer rather than a
 * zero. A LiveCut's own note declares its window with a part marker instead of a
 * name (`pt2 19:30-22:00`): the slot is real, the names are simply not in *that*
 * note. Dropping it would throw away the only evidence a night without a
 * timetable has, and inventing a name for it is the thing this whole module
 * refuses to do.
 */
export interface LineupSlot {
  /** When the slot starts, `HH:MM`, exactly as {@link CivilTime} elsewhere. */
  startTime: CivilTime;
  /** When it ends. May be **before** the start: a night crosses midnight. */
  endTime: CivilTime;
  /**
   * Who plays it. One name, several, or none.
   *
   * ⚠ **The one value in this module that is a person's name.** It goes to a
   * column behind row-level security and nowhere else — no finding, no report
   * line, no log, no file. See the module docblock.
   */
  artists: readonly string[];
}

/** `HH:MM-HH:MM` at the END of a line. Anchored, so a stray time inside prose is not one. */
const SLOT_WINDOW = /(\d{1,2}):(\d{2})\s*[-\u2013\u2014]\s*(\d{1,2}):(\d{2})\s*$/;

/**
 * What joins two artists inside ONE slot.
 *
 * `b2b` and `vs` are **measured** on the live feeds — two occurrences and one.
 * `b<n>b` is admitted as the family the first belongs to rather than as a second
 * literal, and the extrapolation is safe in the only direction that matters:
 * **this list changes how many NAMES a slot carries and never how many SLOTS
 * exist.** A connector this list misses collapses two names into one string —
 * a name written wrong, which somebody reading the row sees — while the episode
 * count, which nobody re-reads, stays right.
 */
const SLOT_CONNECTORS = /\s+(?:b\d+b|vs)\s+/i;

/**
 * A LiveCut part marker — `pt1`, `pt2` — and NOT a person.
 *
 * It is the same token the canonical piece grammar already reads as a part, and
 * it arrives here because a LiveCut's note declares the window of the set it
 * records. Left in, it would become an artist called `pt2`, and that name would
 * be written to a column.
 */
const PART_MARKER = /^pt\d+$/i;

/** `H:MM` and `HH:MM` both arrive; the column takes one shape. */
function padTime(hours: string, minutes: string): CivilTime {
  return `${hours.padStart(2, "0")}:${minutes}`;
}

/**
 * Read a note's line-up as SLOTS.
 *
 * ── What is a slot and what is not ──────────────────────────────────────────
 *
 * A line that **ends** in `HH:MM-HH:MM` is a slot. Everything else is not, and
 * the biggest population of "everything else" is deliberate: a night's own note
 * lists its line-up as bare **names, without windows**, and those are exactly
 * the lines a counter must not count. Measured on the live feeds, one night's
 * note carries six names while its timetable carries five slots — the sixth is
 * the other half of a b2b — so a reader that took the night's own list would
 * plan one LiveCut too many.
 *
 * The first line is not special-cased: a declaration ends in a month word and
 * cannot match the window, so one rule does the work of two.
 *
 * ── Deduplication, and why the named one wins ───────────────────────────────
 *
 * Two notes can declare the same window — a timetable naming who plays it, and
 * the LiveCut of that set naming only its part. They are **one** slot. Within a
 * single note the first occurrence stands, and a later one only ever fills in
 * artists the first did not carry; across notes the merge is the caller's,
 * because only the caller knows which night a note is talking about.
 *
 * ⚠ **Nothing here returns a finding, and that is on purpose.** A malformed
 * line-up line is a line that is not a slot, and a note that carries none yields
 * an empty list — which the caller reports as *not yet knowable*, never as zero.
 */
export function readNoteSlots(description: string): LineupSlot[] {
  if (description.length === 0) return [];

  const slots: LineupSlot[] = [];
  const seen = new Map<string, number>();

  for (const rawLine of description.split("\n")) {
    const line = rawLine.trim();
    if (line.length === 0) continue;

    const window = SLOT_WINDOW.exec(line);
    if (window === null) continue;

    const startTime = padTime(window[1], window[2]);
    const endTime = padTime(window[3], window[4]);
    if (Number(window[1]) > 23 || Number(window[3]) > 23) continue;
    if (Number(window[2]) > 59 || Number(window[4]) > 59) continue;

    const body = line.slice(0, window.index).trim().replace(/[,;:\u2013\u2014-]+$/, "").trim();
    const artists = body
      .split(SLOT_CONNECTORS)
      .map((name) => name.trim())
      .filter((name) => name.length > 0 && !PART_MARKER.test(name));

    const key = `${startTime}|${endTime}`;
    const already = seen.get(key);
    if (already !== undefined) {
      if (slots[already].artists.length === 0 && artists.length > 0) {
        slots[already] = { startTime, endTime, artists };
      }
      continue;
    }

    seen.set(key, slots.length);
    slots.push({ startTime, endTime, artists });
  }

  return slots;
}

/**
 * `<Parola>[ x <Parola>]` in the title, `<Parola>[ x <Parola>] <NNN>` in the
 * note — a night whose progressivo lives in the second place and not the first.
 *
 * ── Why this is the fifth reader and not the first ──────────────────────────
 *
 * It runs after all four title grammars, so it cannot take an entry from any of
 * them, and that ordering is what makes the three conditions below sufficient
 * rather than merely suggestive. By the time execution reaches here the title
 * has already been shown to carry **no kind token** — otherwise
 * {@link readCanonicalPiece}, {@link readLegacyPiece} or {@link readBareKind}
 * would own it — and **no trailing progressivo**, otherwise {@link readNight}
 * would.
 *
 * ── The three conditions, and each one is doing work ────────────────────────
 *
 *   1. **The note's word resolves through the alias map.** The same map, the
 *      same abbreviation-not-derivation rule, and the same refusal: a word the
 *      declaration does not cover is never attached to the nearest series.
 *   2. **The note's word is the title.** The note is describing *this* entry and
 *      not some other one — which is what separates a night from everything else
 *      whose note happens to mention a night.
 *   3. **The declared date is this entry's own date.** Condition 2 alone is not
 *      enough: a satellite's same-day piece carries a note whose leading word
 *      matches too. Measured, this condition holds for five entries per feed
 *      while only three are nights — and the other two are same-day pieces the
 *      canonical grammar has already claimed before execution arrives here.
 *
 * All three, or none of it. Cases `N2`, `N3` and `N4` of
 * `scripts/verify-ics-grammar.mjs` remove one condition each and assert that the
 * promotion does not happen.
 */
function readNightFromNote(
  event: IcsEvent,
  title: string,
  aliases: ReadonlyMap<string, string>
): ClassifiedEntry | null {
  const declaration = readNoteDeclaration(event.description);
  if (declaration === null) return null;

  // Condition 2, first because it is the cheapest and the most specific.
  if (declaration.head.trim().toLowerCase() !== title.trim().toLowerCase()) return null;

  // Condition 3.
  if (!declaresOwnDate(declaration, event.startDate)) return null;

  // Condition 1.
  const named = resolveSeriesFromName(declaration.head, aliases);
  if (named.seriesCode === null) {
    // Unmistakably ours — the note wrote our own night grammar and the title is
    // that same word — and the declaration does not cover it. The same finding a
    // night's own title gets, and never the nearest series.
    if (named.unmistakable) return unclassified(event.uid, "alias_unresolved");
    return null;
  }

  return {
    entryClass: "night",
    uid: event.uid,
    seriesCode: named.seriesCode,
    number: declaration.number,
    key: joinKey(named.seriesCode, declaration.number),
    venueWord: named.venueWord,
    numberSource: "note",
    startDate: event.startDate,
    startTime: event.startTime,
    endDate: event.endDate,
    endTime: event.endTime,
    durationMinutes: event.durationMinutes,
    sequence: event.sequence,
    lastModified: event.lastModified,
  };
}

/**
 * The night a piece's note says it announces, as a join key, or `null`.
 *
 * Unlike {@link readNightFromNote} this asks for **no** agreement between the
 * note and the title, and it must not: the whole point of a piece's note is that
 * it names a *different* entry — the night — on a *different* date. The only
 * condition is the one that is never relaxed anywhere in this module: the word
 * resolves through the alias map, or there is no answer.
 */
function declaredNightKeyOf(
  event: IcsEvent,
  aliases: ReadonlyMap<string, string>
): string | null {
  const declaration = readNoteDeclaration(event.description);
  if (declaration === null) return null;

  const named = resolveSeriesFromName(declaration.head, aliases);
  if (named.seriesCode === null) return null;

  return joinKey(named.seriesCode, declaration.number);
}

/**
 * Whether the title and the note declare different things about the same entry.
 *
 * **Computed after the grammars have already decided, and it decides nothing** —
 * the same discipline, and the same reason, as {@link durationDisagreement}. The
 * title stands either way; this only says that somebody should look.
 *
 * `null` where there is nothing to compare: no readable note, or a title that
 * declared no number of its own, which is the ordinary case and not a finding.
 */
export function noteDisagreement(
  event: IcsEvent,
  entry: ClassifiedEntry,
  aliases: ReadonlyMap<string, string>
): NoteFinding["reason"] | null {
  const declaration = readNoteDeclaration(event.description);
  if (declaration === null) return null;

  // Where the number came from the note there is nothing to disagree with: the
  // title was silent, which is the case the note exists to fill.
  if (entry.entryClass === "night" && entry.numberSource === "note") return null;

  const declared =
    entry.entryClass === "night" || entry.entryClass === "piece"
      ? { series: entry.seriesCode, number: entry.number }
      : null;
  if (declared === null || declared.number === null) return null;

  if (declared.number !== declaration.number) {
    return "note_number_disagrees_with_title";
  }

  if (declared.series === null) return null;

  const named = resolveSeriesFromName(declaration.head, aliases);
  if (named.seriesCode === null) return null;

  if (named.seriesCode.trim().toUpperCase() !== declared.series.trim().toUpperCase()) {
    return "note_series_disagrees_with_title";
  }

  return null;
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
  seriesCode: string | null,
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
    key:
      seriesCode === null || number === null ? null : joinKey(seriesCode, number),
    // Filled in afterwards, by `withDeclaredNight`, and only where the key above
    // is null. This constructor takes no note and cannot: it is the one place a
    // piece is assembled, and keeping the note out of it is what makes *no note
    // becomes a number* a property of the code rather than a promise.
    declaredNightKey: null,
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
