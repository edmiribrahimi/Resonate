#!/usr/bin/env node
/**
 * verify-ics-import.mjs — the hand-written calendar reader, held against the real
 * file, printing counts and never a line of it.
 *
 * WHAT IT ASSERTS, in one sentence: **the modules under
 * `src/lib/production/ics/` read the production calendar the owner supplied on
 * 2026-08-15 into the counts, classes, joins and anchors that were measured off
 * it — a second reconciliation over the same file writes nothing, the vocabulary
 * the TypeScript declares is the vocabulary the SQL `CHECK`s accept, the reader
 * cannot reach the announced-night table, and this run's own output carries no
 * word of the file.**
 *
 * WHY A STRUCTURAL CHECK AND NOT A TEST ON ONE FILE. There is no test runner in
 * this repository (`CLAUDE.md` Guardrail 1), and — more to the point — the build
 * cannot see this failure. `next build` type-checks a parser; it does not run one.
 * A reader that split on the wrong line ending, dropped the second title grammar,
 * or resolved an anchor from the wrong night would compile, deploy, and produce a
 * calendar that looks complete and is not. `44-RESEARCH.md` §Don't Hand-Roll
 * inverts its own advice for exactly this file — *a hand parser is only
 * defensible with the golden-file check* — so this script is the other half of
 * that decision rather than an extra.
 *
 * It is **not a test suite**, and nothing here may be described as one. It reads
 * one file, on one machine, on one day.
 *
 * ── ⚠ THIS IS THE ONE FILE IN THE REPOSITORY THAT OPENS `docs/` ─────────────
 *
 * `docs/` is gitignored (`.gitignore:67`) and held there by check **F** of
 * `npm run verify:persona`, which requires both that the directory is ignored and
 * that nothing inside it is already tracked. Everything in it — unannounced
 * dates, spaces under negotiation, line-ups — is material this repository must
 * never publish, and `github.com/edmiribrahimi/Resonate` is public.
 *
 * So the rule this script lives under is narrower than "be careful": **its output
 * is a publication surface**. Somebody will paste it into an issue. It prints
 * counts, reason codes and constraint names, and it prints **no `SUMMARY`, no
 * date, no venue word, and not even the name of the file it read** — that name
 * carries a date. Check **F** asserts this over the run's own transcript, so the
 * claim is measured rather than intended.
 *
 * ── IT READS THE MODULE. IT DOES NOT RE-IMPLEMENT IT ────────────────────────
 *
 * `parseIcs`, `classifyEntries`, `conformsToRule`, `proposePieceDate`,
 * `reconcile` and `isEmptyPlan` are imported from `src/lib/production/ics/`. A
 * check that re-implements the thing it checks agrees with itself and measures
 * nothing (`ai-engineering.md`, gate *il contatore di controllo non legge la
 * superficie che sta muovendo*). The pipeline rules are read out of the applied
 * migration for the same reason: a second copy of sixteen rows would drift, and
 * it would drift silently — the copy keeps passing while the real rows move.
 *
 * The one thing declared here is the **alias map**, and the reason it may be is
 * narrow. `src/lib/production/ics/classify.ts` holds no format word and no venue
 * word on purpose: the product's map comes from `party_series.ics_alias`, in the
 * database, because it may carry a word for a space that is not acquired, and a
 * space that is not acquired is not named anywhere (`venue-acquisition.md`). The
 * five words below are **already published** — they are in
 * `.claude/rules/production-calendar.md` and in `CLAUDE.md`, which are tracked
 * files in a public repository. Writing an already-public word here publishes
 * nothing.
 *
 * **And if this map ever stops resolving a word, the repair is not to add it
 * here.** Check B reports `alias_unresolved` as a count; the thing to look at is
 * the alias column in the database, which is where a word that cannot be
 * published belongs.
 *
 * ── WHAT A GREEN DOES NOT MEAN (cosa un verde NON significa) ────────────────
 *
 *   - It says the reader agrees with **the file the owner supplied on
 *     2026-08-15**, and nothing more. Every number in `EXPECTED` below is an
 *     assertion about *that* file. **A new file re-opens the whole list** — which
 *     is precisely why this is a script and not a comment: a comment would go
 *     stale in silence, and this goes red.
 *   - It does NOT say the anchors are the RIGHT anchors. It says the file's dates
 *     sit where `production_pipeline_rule` says they would. Whether that rule
 *     describes how production actually works is a person's judgement, recorded in
 *     `production-calendar.md`, and no arithmetic here can stand in for it.
 *   - It does NOT say a proposal reads as unsettled on a screen. Whether somebody
 *     looking at a computed date can tell it from a written one is settled by a
 *     person looking at the surface, in plan 44-13, and by nothing here.
 *   - It does NOT prove the import is correct — only that a **dry** second pass
 *     writes nothing. Whether the first pass writes the right rows into the right
 *     tables is the runner's claim, made against a real database, and this script
 *     opens no connection.
 *   - Check **F** proves the transcript of THIS RUN. It cannot prove that a
 *     future edit will not print a title, and it cannot see what a person types
 *     into an issue beside the output.
 *   - Checks **G** and **H** are greps. A grep reads declarations, not intent.
 *
 * ── THE EIGHT CHECKS ────────────────────────────────────────────────────────
 *
 *   A. **Container.** The entry count, the distinct `UID`s, that the unfolder
 *      actually joined the three folded lines rather than merely compiling, that
 *      no logical line kept a carriage return, that no `DTSTART` or `DTEND` is
 *      date-valued, one event-level `RRULE`, no `RECURRENCE-ID` / `EXDATE` /
 *      `RDATE`, and — the nesting proof — that ninety-six `DTSTART` property
 *      lines produced ninety-two events, because four of them are inside the two
 *      `VTIMEZONE`s and a flat scanner would read them as entries.
 *   B. **Classification.** The four classes by their measured counts, the kind
 *      vocabulary being exactly the six, no series code outside the five
 *      published sigle, and zero entries carrying the word that names the seventh
 *      kind — the one that does not exist yet.
 *   C. **The join, with its negative control.** With an empty alias map, zero
 *      nights resolve: the proof that the alias path is doing the work rather
 *      than the join succeeding by accident. And zero announcing pieces are dated
 *      after the night they announce, which is the warning sign of a join keyed on
 *      a format plus a number, ignoring the word that tells two satellites apart.
 *   D. **Anchors.** Every conformance figure, resolved by weekday against the
 *      rule rows, plus the two listings that are reported non-derivable and are
 *      never proposed.
 *   E. **Idempotence.** `reconcile` twice: once against nothing, then against the
 *      rows the first pass would have written. The second plan must be empty.
 *      This is criterion 5's only automated evidence.
 *   F. **Confidentiality, over this run's own output.** Every parsed title,
 *      stripped of the public tokens, must leave no token that occurs anywhere in
 *      the transcript — and no four-digit year may appear in it either.
 *   G. **The SQL mirror.** Six declared vocabularies, each member present in a
 *      `CHECK` constraint, and no `CHECK` vocabulary carrying a member the
 *      TypeScript does not.
 *   H. **The import cannot reach the night table**, and nothing under
 *      `src/lib/production/` is a server-action module.
 *
 * **F is printed last, after G and H, because it reads what the run printed.** It
 * cannot run before the output it checks exists. The letters are the plan's; the
 * order is arithmetic.
 *
 * ── WHEN CHECK F GOES RED ON A COINCIDENCE, AND WHAT NOT TO DO ─────────────
 *
 * A title in this calendar is somebody's diary entry, so it can contain an
 * ordinary English word this script also has reason to print — a directory name,
 * a table name, a verb. **It happened on the first run**: one entry carries a
 * word that also named a source directory in a passing line, and F went red on a
 * run that leaked nothing.
 *
 * There is deliberately **no exemption list**, and the repair is the other one:
 * *say less*. The line was reworded to stop naming the directory, because a
 * passing line does not need a path that the header already carries. That keeps F
 * absolute, which is the only form in which it is worth anything.
 *
 * The exemption list is refused for a reason that is not stylistic. This file
 * declares an alias map of five already-public words, three of which are names of
 * spaces. Any rule of the form *a token that also appears in this script's source
 * is fine* would exempt exactly those three — and a word for a space is the thing
 * F exists to keep out of a terminal that ends up in an issue. So: never exempt,
 * never widen, reword the output instead. If the output genuinely cannot say what
 * it needs to without the word, that is a finding to take to a person, not a
 * constant to add.
 *
 * ── TWO MEASUREMENTS THAT CORRECT `44-RESEARCH.md`, WRITTEN DOWN HERE ───────
 *
 *   1. **The file is CRLF, not LF-only.** §The File's Structure records *"LF
 *      only"*; measured on the same day, every one of its line breaks is a CRLF
 *      pair and there is not a single lone LF. The unfolder's `/\r?\n/` tolerance
 *      is therefore load-bearing in the OTHER direction from the one the research
 *      argued: a reader that split on `\n` alone would leave a carriage return on
 *      the end of every value, and a `SUMMARY` with a trailing control character
 *      does not fail to join — it *almost* joins, which is worse. Check A asserts
 *      the absence of that character rather than the presence of a line ending,
 *      so it holds whichever way the exporting application jumps.
 *   2. **`VALUE=DATE` occurs thirty-nine times, and none of them is a date.**
 *      Every occurrence is the tail of `TRIGGER;VALUE=DATE-TIME` inside a
 *      `VALARM`. A substring grep says thirty-nine and would make a correct file
 *      look wrong; the assertion that means anything is *no `DTSTART` or `DTEND`
 *      carries a `VALUE=DATE` parameter*, and that is zero.
 *
 * ── EXIT CODES ──────────────────────────────────────────────────────────────
 *
 *   `0` passed · `1` FAILED · `2` REFUSED, and a refusal is not a failure: it
 *   means the measurement did not happen (`verify-all.mjs:26-35`).
 *
 *   **It refuses, loudly, when `docs/` holds no `.ics`** — which is every machine
 *   that is not the owner's, because the directory is gitignored and therefore
 *   never deployed and never cloned. That is why this gate is **not** part of
 *   `npm run verify`: a green aggregate that had silently skipped a check is worse
 *   than no check at all. It has its own `verify:ics` entry, and `verify-all.mjs`
 *   names it in the list of gates it does not run, with this precondition beside
 *   it. Checks G and H need no material and run either way; the verdict says which
 *   ran and which were refused.
 */

import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { registerHooks } from "node:module";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { liveLines } from "./lib/comments.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const ICS_DIR = join(ROOT, "src", "lib", "production", "ics");
const PRODUCTION_DIR = join(ROOT, "src", "lib", "production");
/*
 * Every migration whose CHECK vocabularies check G holds against the TypeScript.
 *
 * A file missing from this list is a CHECK the gate cannot see, and the failure
 * is one-directional and silent in the worse direction: the gate would keep
 * reporting the OLD list as the database's list, so a member the TypeScript
 * declares and the database now accepts would still be reported as unmirrored —
 * or, worse, a member the database accepts and the TypeScript lacks would go
 * unreported entirely, because the CHECK carrying it was never read.
 *
 * Ordered by application, and appended to. Adding a migration that widens or
 * narrows a mirrored vocabulary means adding it here in the same commit.
 */
const MIGRATIONS = [
  "supabase/migrations/20260815120000_production_calendar.sql",
  "supabase/migrations/20260815120100_production_calendar_access.sql",
  // Plan 58-06 (D-58-04): the seventh piece kind, on the two lists that mirror
  // `PIECE_KINDS`. Without this line check G reads a `CHECK` that has been
  // superseded and reports the seventh member as unmirrored.
  "supabase/migrations/20260820120000_production_piece_flyering.sql",
  // Plan 58-07 (D-58-06, ICS-02): the mirror's boundary — `calendar_key` on the
  // three mirrored tables plus the import register, with FOUR CHECK vocabularies
  // that mirror `CALENDAR_KEYS`. Without this line check G reads no CHECK
  // carrying those three members and reports every one of them as unmirrored —
  // which is exactly what it did, at 15:58:47Z on 2026-08-20, before this line
  // was added. That red is the evidence the seventh pair is actually asserted
  // rather than silently skipped.
  "supabase/migrations/20260820121000_production_calendar_key.sql",
];

/* ────────────────────────────────────────────────────────────────────────────
 * EXPECTED — every number this script asserts, in one place
 *
 * Measured on the file the owner supplied on 2026-08-15. A NEW FILE RE-OPENS
 * THIS WHOLE LIST: these are not properties of the reader, they are properties of
 * one calendar, and the reader is what is being held against them.
 * ──────────────────────────────────────────────────────────────────────────── */

const EXPECTED = {
  /** `VEVENT`s that parsed into records, and distinct `UID`s among them. */
  events: 92,
  /** Physical lines that continue the one before them (RFC 5545 §3.1). */
  foldedLines: 3,
  /** `DTSTART` property lines in the file — four more than there are events. */
  dtstartLines: 96,
  /** `VTIMEZONE` and `VALARM` components, which is where the four extra live. */
  vtimezones: 2,
  valarms: 40,
  /** `RRULE` lines in the file, of which one is on an event. */
  rruleLines: 5,
  eventRrules: 1,

  /** Class A — the canonical piece grammar. */
  canonicalPieces: 56,
  /** Class B — the legacy inverted grammar, carrying both anchor overrides. */
  legacyPieces: 3,
  /** Class C — nights. */
  nights: 14,
  /** Class D — commitments plus entries nobody may guess at. */
  commitments: 16,
  unclassified: 3,

  /** A piece whose edition is not in the calendar. Measured, and expected. */
  orphanPieces: 1,

  /** Anchors, by the rule rows in the applied migration. */
  timetableEditions: 7,
  nightLivecutEditions: 6,
  afterMovieEditions: 6,
  afterMoviesInFile: 7,
  satelliteTonight: 2,
  satelliteRecap: 2,
  satelliteLivecut: 2,
  sunsetLivecutPieces: 6,
  sunsetLivecutEditions: 3,

  /** Rules seeded by the migration: fourteen format-level, two series-level. */
  pipelineRules: 16,
};

/**
 * The five sigle this calendar uses, and they are ALL ALREADY PUBLIC — every one
 * of them is printed in `.claude/rules/production-calendar.md`.
 *
 * Declared rather than derived from the file on purpose: derived, a sixth code
 * appearing tomorrow would be absorbed in silence and stripped from check F's
 * search. Declared, it is a finding.
 */
const PUBLISHED_SIGLE = ["RSNT-PRLN", "RMDB-BZ", "RMDB-MR", "RSNT", "SNST"];

/** The four format names, public in `CLAUDE.md`. `MTNLB` has no dates (D-44-19). */
const FORMAT_NAMES = ["Resonate", "SunSet", "RamaDub", "MotionLab"];

/**
 * The alias map: the word a title carries → the series code it belongs to.
 *
 * Five entries, every one already published. The product reads this from the
 * database and never from source; see the header for why this file may hold these
 * five and why the repair for a sixth is not to add it here.
 *
 * A bare format word is deliberately ABSENT. A satellite night names the space it
 * happens in, and mapping the format word alone would resolve it to a series that
 * does not exist per-venue — a night joined to the wrong place is worse than a
 * night reported unresolved.
 */
const ALIASES = new Map([
  ["resonate", "RSNT"],
  ["sunset", "SNST"],
  ["booze", "RMDB-BZ"],
  ["muro", "RMDB-MR"],
  ["perlone", "RSNT-PRLN"],
]);

/**
 * The word that names the seventh piece kind — the one that does not exist yet.
 *
 * `src/lib/production/ics/vocabulary.ts` claim (b) refuses to spell it, and the
 * reason travels: *a grep whose only match is the sentence forbidding the thing
 * is a grep that gets ignored the third time it goes red.* **That argument does
 * not apply here**, and the difference is the whole reason it may be written. This
 * script does not search itself: it searches a calendar outside the repository,
 * where the word can genuinely occur, and where `production-calendar.md` records
 * that its occurrence would be a naming error or an entry that should not be
 * there. A search term is not a self-match.
 */
const SEVENTH_KIND_WORD = "podcast";

/* ────────────────────────────────────────────────────────────────────────────
 * The transcript — every line this run prints, kept for check F
 * ──────────────────────────────────────────────────────────────────────────── */

const transcript = [];

function say(line = "") {
  transcript.push(line);
  console.log(line);
}

const failures = [];
const refusedChecks = [];

function pass(letter, sentence) {
  say(`  ✓ ${letter}  ${sentence}`);
}

function fail(letter, sentence, detail = []) {
  say(`  ✗ ${letter}  ${sentence}`);
  for (const line of detail) say(`         ${line}`);
  failures.push(letter);
}

/**
 * A refusal before anything could be measured. Not a failure — see the header.
 */
function refuseNow(message) {
  say("");
  say(`  FATAL: ${message}`);
  say("");
  process.exit(2);
}

/* ────────────────────────────────────────────────────────────────────────────
 * Loading the module — Node resolves nothing extensionless, and Next does
 * ──────────────────────────────────────────────────────────────────────────── */

// The barrel imports its six neighbours as `./parse`, which is what the bundler
// resolves and what Node does not. The hook appends `.ts` for a relative
// specifier that names a file on disk, and defers everything else. Nothing here
// changes what the modules DO — it changes how they are found — which is the only
// property that lets this script exercise the same code the product imports.
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith(".") && !/\.[cm]?[jt]sx?$/.test(specifier)) {
      const candidate = new URL(`${specifier}.ts`, context.parentURL);
      if (existsSync(fileURLToPath(candidate))) {
        return { url: candidate.href, shortCircuit: true };
      }
    }
    return nextResolve(specifier, context);
  },
});

// Node warns once, on stderr, that `package.json` declares no module type and the
// `.ts` files had to be re-parsed as ESM. It is about this script's loader and
// says nothing about the tree, so it is dropped and every other warning is left
// exactly where it was.
const defaultWarningListeners = process.listeners("warning");
process.removeAllListeners("warning");
process.on("warning", (warning) => {
  if (warning.name === "MODULE_TYPELESS_PACKAGE_JSON") return;
  for (const listener of defaultWarningListeners) listener(warning);
});

let ics;
try {
  ics = await import(join(ICS_DIR, "index.ts"));
} catch (error) {
  /* ── Un modulo che non si importa e' un FALLIMENTO, non un rifiuto ──────────
   *
   * Corretto il 2026-08-19, dall'audit di milestone della v1.5 (reperto B-2).
   * Qui c'era `refuseNow`, che esce **2**. In `verify-all.mjs` un rifiuto non e'
   * un fallimento e **non fa uscire la suite diversa da zero** — quindi con i
   * moduli rinominati o rotti `npm run verify` sarebbe rimasto verde, e il
   * rifiuto sarebbe stato indistinguibile da quello normale «qui non c'e'
   * docs/», che su ogni macchina tranne una e' lo stato atteso.
   *
   * La distinzione e' la ragione per cui il rifiuto esiste: **`docs/` assente e'
   * una precondizione mancante; un modulo che non si carica e' una cosa rotta.**
   * Collassarle nello stesso esito rende il rifiuto un posto dove i difetti si
   * nascondono.
   *
   * Perche' conta proprio qui: `src/lib/production/ics/*` non ha **alcun
   * importatore statico**. Il solo consumatore e'
   * `scripts/import-production-calendar.mjs`, con un `await import()` costruito a
   * runtime — invisibile a `npm run build`, a `verify:conversion` e a qualunque
   * grep. Questo gate e' l'unica cosa che li tocca su una macchina qualsiasi, e
   * finche' usciva 2 non li difendeva.
   * ─────────────────────────────────────────────────────────────────────────── */
  say("");
  fail(
    "0",
    "src/lib/production/ics/ non si importa — e questo e' un fallimento, non un rifiuto",
    [
      String(error.message),
      "Nessun modulo sotto src/lib/production/ics/ ha un importatore statico:",
      "il solo consumatore e' un import() costruito a runtime dentro",
      "scripts/import-production-calendar.mjs, che ne' il build ne' un grep vedono.",
      "Questo controllo e' l'unica difesa di quel percorso su una macchina",
      "qualunque, quindi qui si esce 1 e la suite diventa rossa.",
    ]
  );
  say("");
  process.exit(1);
}

/* ────────────────────────────────────────────────────────────────────────────
 * Finding the material — and refusing loudly when there is none
 * ──────────────────────────────────────────────────────────────────────────── */

/**
 * The most recent `.ics` snapshot in `docs/`, or `null`.
 *
 * The **path is returned and never printed**: a snapshot is named after the day
 * it was taken, so its file name is a date, and a date is the first thing this
 * script may not say out loud.
 */
function findMaterial() {
  const dir = join(ROOT, "docs");
  if (!existsSync(dir) || !statSync(dir).isDirectory()) return null;

  const snapshots = readdirSync(dir)
    .filter((name) => name.toLowerCase().endsWith(".ics"))
    .sort();

  if (snapshots.length === 0) return null;
  return join(dir, snapshots[snapshots.length - 1]);
}

say("");
say("verify-ics-import — the calendar reader, held against the real file, in counts");
say("");
say(
  "  A refusal is not a failure: it means the measurement did not happen.\n" +
    "  0 = passed  ·  1 = FAILED  ·  2 = REFUSED, and nothing was measured.\n"
);

const materialPath = findMaterial();
const haveMaterial = materialPath !== null;

if (!haveMaterial) {
  say("  ── no material, and this is the expected state on any machine but one ──");
  say("");
  say("    docs/ holds no .ics snapshot. That directory is gitignored, is never");
  say("    deployed and is never cloned, so the calendar lives only on the owner's");
  say("    machine. NOTHING WAS MEASURED about the reader: checks A to F did not run.");
  say("");
  say("    Checks G and H need no material and ran below.");
  say("");
  refusedChecks.push("A", "B", "C", "D", "E");
}

/* ────────────────────────────────────────────────────────────────────────────
 * The material-dependent checks
 * ──────────────────────────────────────────────────────────────────────────── */

let parsed = null;
let classified = null;

if (haveMaterial) {
  const text = readFileSync(materialPath, "utf8");

  /* ── A. container ──────────────────────────────────────────────────────── */

  // The raw lines, counted HERE and not through `unfold`. This is the one place
  // the check touches the text itself, and it is deliberate: a measurement taken
  // with the instrument under test is an echo, not a measurement
  // (`ai-engineering.md`). Splitting to COUNT is not a second unfolder — nothing
  // below joins a continuation, and the joining is what is being checked.
  const physicalLines = text.split(/\r?\n/);
  const nonEmptyPhysical = physicalLines.filter((line) => line.length > 0).length;
  const logicalLines = ics.unfold(text);
  const folded = ics.countFoldedLines(text);
  const joined = nonEmptyPhysical - logicalLines.length;
  const carriageReturns = logicalLines.filter((line) => line.includes("\r")).length;

  const countLines = (pattern) => physicalLines.filter((line) => pattern.test(line)).length;
  const dtstartLines = countLines(/^DTSTART[;:]/);
  const vtimezones = countLines(/^BEGIN:VTIMEZONE$/);
  const valarms = countLines(/^BEGIN:VALARM$/);
  const rruleLines = countLines(/^RRULE[;:]/);
  const dateValued = countLines(/^DT(START|END)[^:]*;VALUE=DATE(?![-A-Z])/);
  const exceptionProperties = countLines(/^(RECURRENCE-ID|EXDATE|RDATE)[;:]/);

  parsed = ics.parseIcs(text);
  const distinctUids = new Set(parsed.events.map((event) => event.uid)).size;
  const eventRrules = parsed.events.filter((event) => event.rrule !== null).length;

  const aProblems = [];
  if (parsed.refusal !== null) {
    aProblems.push(`the parser refused the input: ${parsed.refusal.reason}`);
  }
  if (parsed.events.length !== EXPECTED.events) {
    aProblems.push(`${parsed.events.length} events parsed, ${EXPECTED.events} expected`);
  }
  if (distinctUids !== EXPECTED.events) {
    aProblems.push(`${distinctUids} distinct UIDs, ${EXPECTED.events} expected`);
  }
  if (parsed.malformed.length !== 0) {
    aProblems.push(`${parsed.malformed.length} malformed line(s); zero expected`);
  }
  if (folded !== EXPECTED.foldedLines) {
    aProblems.push(`${folded} folded line(s) in the text, ${EXPECTED.foldedLines} expected`);
  }
  if (joined !== EXPECTED.foldedLines) {
    aProblems.push(
      `the unfolder joined ${joined} line(s) and the text carries ${folded}: ` +
        "unfolding COMPILED and did not HAPPEN, which is the difference this " +
        "assertion exists for"
    );
  }
  if (carriageReturns !== 0) {
    aProblems.push(
      `${carriageReturns} unfolded line(s) kept a carriage return — a value with a ` +
        "trailing control character does not fail to join, it almost joins"
    );
  }
  if (dateValued !== 0) {
    aProblems.push(`${dateValued} date-valued DTSTART/DTEND; zero expected`);
  }
  if (exceptionProperties !== 0 || parsed.refusedProperties.length !== 0) {
    aProblems.push(
      `${exceptionProperties} RECURRENCE-ID/EXDATE/RDATE line(s) and ` +
        `${parsed.refusedProperties.length} refused propert(y/ies); zero of each expected`
    );
  }
  if (dtstartLines !== EXPECTED.dtstartLines) {
    aProblems.push(`${dtstartLines} DTSTART lines, ${EXPECTED.dtstartLines} expected`);
  }
  if (vtimezones !== EXPECTED.vtimezones || valarms !== EXPECTED.valarms) {
    aProblems.push(
      `${vtimezones} VTIMEZONE and ${valarms} VALARM component(s), ` +
        `${EXPECTED.vtimezones} and ${EXPECTED.valarms} expected`
    );
  }
  if (rruleLines !== EXPECTED.rruleLines || eventRrules !== EXPECTED.eventRrules) {
    aProblems.push(
      `${rruleLines} RRULE line(s) of which ${eventRrules} on an event, ` +
        `${EXPECTED.rruleLines} and ${EXPECTED.eventRrules} expected`
    );
  }

  if (aProblems.length === 0) {
    pass(
      "A",
      `${parsed.events.length} entries · ${distinctUids} distinct UIDs · ` +
        `${joined} folded line(s) actually joined · 0 carriage returns left · ` +
        `0 date-valued stamps · ${eventRrules} event-level RRULE of ${rruleLines} · ` +
        "0 recurrence exceptions"
    );
    say(
      `         and the nesting proof: ${dtstartLines} DTSTART lines produced ` +
        `${parsed.events.length} entries — the other ${dtstartLines - parsed.events.length} ` +
        `are inside the ${vtimezones} VTIMEZONE components, and ${valarms} VALARM ` +
        "components contributed none"
    );
  } else {
    fail("A", "the container does not measure as it did:", aProblems);
  }

  /* ── B. classification ─────────────────────────────────────────────────── */

  classified = ics.classifyEntries(parsed.events, ALIASES);

  const canonical = classified.pieces.filter((p) => p.namingConvention === "canonical").length;
  const legacy = classified.pieces.filter((p) => p.namingConvention === "legacy").length;

  const kindsSeen = new Set(classified.pieces.map((piece) => piece.kind));
  const kindVocabulary = new Set(ics.PIECE_KINDS);
  const unknownKinds = [...kindsSeen].filter((kind) => !kindVocabulary.has(kind));

  const siglaSeen = new Set(
    [...classified.nights, ...classified.pieces].map((entry) => entry.seriesCode)
  );
  const unpublishedSigle = [...siglaSeen].filter((code) => !PUBLISHED_SIGLE.includes(code));

  const seventhKind = parsed.events.filter((event) =>
    event.summary.toLowerCase().includes(SEVENTH_KIND_WORD)
  ).length;

  const bProblems = [];
  if (legacy === 0) {
    bProblems.push(
      "ZERO entries read under the legacy grammar. A two-grammar reader drops three " +
        "real pieces, and two of them carry the file's only genuine anchor overrides " +
        "— the sole live evidence that a written date has to beat a computed one."
    );
  } else if (legacy !== EXPECTED.legacyPieces) {
    bProblems.push(`${legacy} legacy-grammar piece(s), ${EXPECTED.legacyPieces} expected`);
  }
  if (canonical !== EXPECTED.canonicalPieces) {
    bProblems.push(`${canonical} canonical piece(s), ${EXPECTED.canonicalPieces} expected`);
  }
  if (classified.nights.length !== EXPECTED.nights) {
    bProblems.push(`${classified.nights.length} night(s), ${EXPECTED.nights} expected`);
  }
  if (classified.commitments.length !== EXPECTED.commitments) {
    bProblems.push(
      `${classified.commitments.length} commitment(s), ${EXPECTED.commitments} expected`
    );
  }
  if (classified.unclassified.length !== EXPECTED.unclassified) {
    bProblems.push(
      `${classified.unclassified.length} unclassified entr(y/ies), ` +
        `${EXPECTED.unclassified} expected`
    );
  }
  if (classified.aliasUnresolved.length !== 0) {
    bProblems.push(
      `${classified.aliasUnresolved.length} entr(y/ies) carry a word the declaration ` +
        "does not cover. The repair is the alias column in the database, never a " +
        "literal in this file: a word for a space that is not acquired is not named " +
        "in a public repository"
    );
  }
  // Seven since 2026-08-20 (D-58-04, plan 58-06). This number and the one in the
  // seventh-kind check below are DIFFERENT NUMBERS ABOUT DIFFERENT THINGS: this
  // one counts the kinds the vocabulary declares, that one counts entries
  // carrying the word that names the kind which still does not exist. Moving one
  // is not a reason to move the other.
  if (unknownKinds.length !== 0 || kindVocabulary.size !== 7) {
    bProblems.push(
      `the kind vocabulary is not exactly the seven: ${kindVocabulary.size} declared, ` +
        `${unknownKinds.length} seen that it does not contain`
    );
  }
  if (unpublishedSigle.length !== 0) {
    bProblems.push(
      `${unpublishedSigle.length} series code(s) outside the five published sigle. ` +
        "A new sigla is a finding, not something to absorb"
    );
  }
  if (seventhKind !== 0) {
    bProblems.push(
      `${seventhKind} entr(y/ies) carry the word that names the seventh kind. That ` +
        "kind does not exist yet, so such an entry is a naming error or a thing that " +
        "should not be in the calendar"
    );
  }

  const classD = classified.commitments.length + classified.unclassified.length;

  if (bProblems.length === 0) {
    pass(
      "B",
      `class A ${canonical} · class B ${legacy} · class C ${classified.nights.length} · ` +
        `class D ${classD} (${classified.commitments.length} commitments + ` +
        `${classified.unclassified.length} recorded, never guessed) · ` +
        `total ${canonical + legacy + classified.nights.length + classD}`
    );
    say(
      `         kind vocabulary exactly the ${kindVocabulary.size} · ` +
        `0 entries carrying the seventh-kind word · ` +
        `0 unresolved aliases · ${siglaSeen.size} series codes, all published`
    );
  } else {
    fail("B", "the classification does not measure as it did:", bProblems);
  }

  /* ── C. the join, and its negative control ─────────────────────────────── */

  const withoutAliases = ics.classifyEntries(parsed.events, new Map());

  // Grouped, not overwritten. A `Map` built by `new Map(pairs)` keeps the LAST
  // value for a repeated key, so two nights that collide would leave one of them
  // silently gone — and a join that loses a night is the exact failure this check
  // is looking for. It has to be counted, not absorbed.
  const nightsByKey = new Map();
  for (const night of classified.nights) {
    if (!nightsByKey.has(night.key)) nightsByKey.set(night.key, []);
    nightsByKey.get(night.key).push(night);
  }
  const collidingKeys = [...nightsByKey.values()].filter((list) => list.length > 1).length;

  // The earliest night carrying the key, so the lookup is deterministic whatever
  // order the file is in.
  const nightByKey = new Map(
    [...nightsByKey.entries()].map(([key, list]) => [
      key,
      [...list].sort((a, b) => (a.startDate < b.startDate ? -1 : 1))[0],
    ])
  );
  const orphans = classified.pieces.filter((piece) => !nightByKey.has(piece.key));

  // A listing and a Tonight ANNOUNCE the night. A recap, a LiveCut and an after
  // movie follow it, and a positive offset is what they are for. Only the first
  // two can be "published after the thing they announce", so only they are asked.
  const announcingLate = classified.pieces.filter((piece) => {
    if (piece.kind !== "listing" && piece.kind !== "tonight") return false;
    const night = nightByKey.get(piece.key);
    return night !== undefined && piece.date > night.startDate;
  }).length;

  const cProblems = [];
  if (collidingKeys !== 0) {
    cProblems.push(
      `${collidingKeys} join key(s) are carried by more than one night. Two satellites ` +
        "legitimately share a progressivo and are told apart only by the word for the " +
        "space, so a collision means the key has stopped carrying that word"
    );
  }
  if (withoutAliases.nights.length !== 0) {
    cProblems.push(
      `${withoutAliases.nights.length} night(s) resolved with an EMPTY alias map. The ` +
        "negative control has stopped controlling: the join is succeeding by some " +
        "path other than the declared abbreviation"
    );
  }
  if (announcingLate !== 0) {
    cProblems.push(
      `${announcingLate} announcing piece(s) dated after the night they announce. ` +
        "That is the signature of a join keyed on a format plus a number, which " +
        "cannot tell two satellites sharing a progressivo apart"
    );
  }
  if (orphans.length !== EXPECTED.orphanPieces) {
    cProblems.push(
      `${orphans.length} piece(s) with no night in this file, ` +
        `${EXPECTED.orphanPieces} expected`
    );
  }

  if (cProblems.length === 0) {
    pass(
      "C",
      `0 nights resolve with an empty alias map (the negative control) · ` +
        `0 join keys carried by two nights · ` +
        `0 announcing pieces dated after their night · ` +
        `${orphans.length} piece whose edition the file does not carry`
    );
  } else {
    fail("C", "the join does not measure as it did:", cProblems);
  }

  /* ── D. anchors ────────────────────────────────────────────────────────── */

  const pipelines = readPipelineRules();
  const dProblems = [];

  if (pipelines.ruleCount !== EXPECTED.pipelineRules) {
    dProblems.push(
      `${pipelines.ruleCount} pipeline rule(s) read from the migration, ` +
        `${EXPECTED.pipelineRules} expected`
    );
  }

  const nightsBySeries = new Map();
  for (const night of classified.nights) {
    if (!nightsBySeries.has(night.seriesCode)) nightsBySeries.set(night.seriesCode, []);
    nightsBySeries.get(night.seriesCode).push(night);
  }
  const listingByKey = new Map();
  for (const piece of classified.pieces) {
    if (piece.kind === "listing") listingByKey.set(piece.key, piece);
  }

  const contextFor = (night) => {
    const siblings = nightsBySeries.get(night.seriesCode) ?? [];
    const next = siblings.find((s) => s.number === night.number + 1) ?? null;
    const nextListing = next === null ? null : listingByKey.get(next.key) ?? null;
    return {
      nightDate: night.startDate,
      nextEditionDate: next === null ? null : next.startDate,
      nextEditionListingDate: nextListing === null ? null : nextListing.date,
      // A series code and a progressivo, both public, and never a title.
      nextEditionLabel: next === null ? null : `${next.seriesCode}-${next.number}`,
      // Read from `party_credits` by the runner. This script opens no connection,
      // so it is not knowable here — and `null` is *not yet knowable*, which is a
      // different answer from zero and produces a different refusal.
      creditedArtistCount: null,
    };
  };

  /**
   * Editions of `series` whose pieces of `kind` ALL sit where the rule says.
   *
   * Counted by edition rather than by piece because that is the unit the
   * measurement was taken in: a night's LiveCuts are three episodes of one claim,
   * and three conforming pieces of one edition are not three conforming editions.
   */
  const conformingEditions = (series, kind) => {
    const rule = pipelines.rulesFor(series).get(kind);
    if (rule === undefined) return { editions: 0, pieces: 0, conforming: 0 };

    const byEdition = new Map();
    for (const piece of classified.pieces) {
      if (piece.kind !== kind || piece.seriesCode !== series) continue;
      const night = nightByKey.get(piece.key);
      if (night === undefined) continue;
      if (!byEdition.has(piece.key)) byEdition.set(piece.key, []);
      byEdition.get(piece.key).push(ics.conformsToRule(piece.date, rule, contextFor(night)));
    }

    const groups = [...byEdition.values()];
    return {
      editions: groups.length,
      pieces: groups.flat().length,
      conforming: groups.filter((verdicts) => verdicts.every((v) => v === true)).length,
    };
  };

  const expectEditions = (label, series, kind, expected) => {
    const measured = conformingEditions(series, kind);
    if (measured.conforming !== expected || measured.editions !== expected) {
      dProblems.push(
        `${label}: ${measured.conforming} of ${measured.editions} edition(s) conform, ` +
          `${expected} of ${expected} expected (${measured.pieces} piece(s) examined)`
      );
    }
    return measured;
  };

  const timetable = expectEditions(
    "the night's timetable, on the night itself",
    "RSNT",
    "timetable",
    EXPECTED.timetableEditions
  );
  const nightLivecut = expectEditions(
    "the night's LiveCut, in the next edition's ISO week",
    "RSNT",
    "livecut",
    EXPECTED.nightLivecutEditions
  );
  const afterMovie = expectEditions(
    "the after movie, the day before the next edition's listing",
    "RSNT",
    "after_movie",
    EXPECTED.afterMovieEditions
  );
  const sunsetLivecut = expectEditions(
    "SunSet's LiveCut, the Monday and the Tuesday following",
    "SNST",
    "livecut",
    EXPECTED.sunsetLivecutEditions
  );
  if (sunsetLivecut.pieces !== EXPECTED.sunsetLivecutPieces) {
    dProblems.push(
      `SunSet's LiveCut: ${sunsetLivecut.pieces} piece(s), ` +
        `${EXPECTED.sunsetLivecutPieces} expected`
    );
  }

  // The seventh after movie is a legacy-form entry whose edition is not in the
  // calendar, so it has no night to be measured against. It is reported as
  // unmeasurable and never as a failure — the rule behaving correctly.
  const afterMoviesInFile = classified.pieces.filter((p) => p.kind === "after_movie").length;
  if (afterMoviesInFile !== EXPECTED.afterMoviesInFile) {
    dProblems.push(
      `${afterMoviesInFile} after movie(s) in the file, ` +
        `${EXPECTED.afterMoviesInFile} expected`
    );
  }

  const satelliteTotals = { tonight: 0, recap: 0, livecut: 0 };
  for (const series of ["RMDB-BZ", "RMDB-MR"]) {
    for (const kind of ["tonight", "recap", "livecut"]) {
      const measured = conformingEditions(series, kind);
      if (measured.conforming !== measured.editions) {
        dProblems.push(
          `a satellite's ${kind}: ${measured.conforming} of ${measured.editions} conform`
        );
      }
      satelliteTotals[kind] += measured.conforming;
    }
  }
  for (const kind of ["tonight", "recap", "livecut"]) {
    const expected =
      kind === "tonight"
        ? EXPECTED.satelliteTonight
        : kind === "recap"
          ? EXPECTED.satelliteRecap
          : EXPECTED.satelliteLivecut;
    if (satelliteTotals[kind] !== expected) {
      dProblems.push(
        `the satellites' ${kind}: ${satelliteTotals[kind]} conforming, ${expected} expected`
      );
    }
  }

  // The two listings nothing may derive. The anticipation is a Tuesday one to two
  // and a half weeks ahead and it is not a fixed number, so a proposal here would
  // be a date a week and a half wrong, drawn beside real ones.
  const withheld = [];
  for (const series of ["RSNT", "SNST"]) {
    const rule = pipelines.rulesFor(series).get("listing");
    const night = (nightsBySeries.get(series) ?? [])[0];
    if (rule === undefined || night === undefined) {
      dProblems.push(`no listing rule or no edition for a series that has both`);
      continue;
    }
    const proposal = ics.proposePieceDate(rule, contextFor(night));
    if (proposal.unresolved !== "not_derivable" || "date" in proposal) {
      dProblems.push(
        `a listing that must never be proposed came back with ` +
          `${"date" in proposal ? "a date" : proposal.unresolved}`
      );
      continue;
    }
    withheld.push(series);
  }

  if (dProblems.length === 0) {
    pass(
      "D",
      `timetable ${timetable.conforming}/${timetable.editions} on the night itself · ` +
        `the night's LiveCut ${nightLivecut.conforming}/${nightLivecut.editions} editions ` +
        `(${nightLivecut.pieces} episodes) in the next edition's ISO week · ` +
        `after movie ${afterMovie.conforming}/${afterMoviesInFile}, the seventh a ` +
        "legacy-form entry whose edition the file does not carry"
    );
    say(
      `         satellite Tonight ${satelliteTotals.tonight}/${EXPECTED.satelliteTonight} ` +
        `same-day · satellite Recap ${satelliteTotals.recap}/${EXPECTED.satelliteRecap} and ` +
        `LiveCut ${satelliteTotals.livecut}/${EXPECTED.satelliteLivecut} the Monday after · ` +
        `SunSet LiveCut ${sunsetLivecut.pieces}/${EXPECTED.sunsetLivecutPieces} on the ` +
        "Monday and the Tuesday"
    );
    say(
      `         and ${withheld.length} listing rules reported not_derivable and ` +
        `proposed nothing · ${pipelines.ruleCount} rules read from the migration`
    );
  } else {
    fail("D", "the anchors do not measure as they did:", dProblems);
  }

  /* ── E. idempotence ────────────────────────────────────────────────────── */

  const seriesInFile = [
    ...new Set([...classified.nights, ...classified.pieces].map((e) => e.seriesCode)),
  ].sort();

  const seriesPipelines = seriesInFile.map((code) => ({
    seriesCode: code,
    // An input, and a property of the SPACE rather than of the format. False here
    // because this script has no catalogue to read it from, and a wrong guess
    // would add or drop one checklist item per night — which is a count, and
    // counts are what the second pass compares.
    requiresSpaceApproval: false,
    rules: [...pipelines.rulesFor(code).entries()].map(([kind, rule]) => ({ kind, rule })),
  }));

  const input = {
    nights: classified.nights,
    pieces: classified.pieces,
    commitments: classified.commitments,
    unclassified: classified.unclassified,
    unsupportedRecurrences: parsed.unsupportedRecurrences,
    creditedArtistCounts: new Map(),
    recurrenceOccurrenceCap: 200,
  };

  // A fixed instant, supplied by the caller because the module has no clock. That
  // is the property that makes two passes comparable at all.
  const NOW = "2026-08-15T00:00:00.000Z";
  const nothingStored = { plans: [], pieces: [], commitments: [], checklistItems: [] };

  const firstPass = ics.reconcile(input, nothingStored, seriesPipelines, NOW);

  let rowId = 0;
  const nextId = () => `row-${(rowId += 1)}`;

  // The snapshot the second pass runs against: exactly the rows the first pass
  // would have written, with the identifiers the database would have handed back.
  const applied = {
    plans: firstPass.plansToInsert.map((row) => ({
      id: nextId(),
      sourceUid: row.sourceUid,
      seriesCode: row.seriesCode,
      number: row.number,
      venueWord: row.venueWord,
      date: row.date,
      startTime: row.startTime,
      endTime: row.endTime,
      sourceSequence: row.sourceSequence,
      sourceLastModified: row.sourceLastModified,
      absentSince: null,
      linkedPartyId: null,
    })),
    pieces: firstPass.piecesToInsert.map((row) => ({
      id: nextId(),
      sourceUid: row.sourceUid,
      seriesCode: row.seriesCode,
      number: row.number,
      kind: row.kind,
      partMarker: row.partMarker,
      date: row.date,
      origin: row.origin,
      unresolvedReason: row.unresolvedReason,
      conformsToRule: row.conformsToRule,
      namingConvention: row.namingConvention,
      sourceSequence: row.sourceSequence,
      sourceLastModified: row.sourceLastModified,
      absentSince: null,
    })),
    commitments: firstPass.commitmentsToInsert.map((row) => ({
      id: nextId(),
      sourceUid: row.sourceUid,
      occurrenceDate: row.occurrenceDate,
      startTime: row.startTime,
      endTime: row.endTime,
      title: row.title,
      recurrenceRaw: row.recurrenceRaw,
      absentSince: null,
    })),
    checklistItems: firstPass.checklistItemsToInsert.map((row) => ({
      id: nextId(),
      planKey: row.planKey,
      kind: row.kind,
      label: row.label,
      dueDate: row.dueDate,
      sortOrder: row.sortOrder,
    })),
  };

  const secondPass = ics.reconcile(input, applied, seriesPipelines, NOW);

  const writesIn = (plan) => ({
    plans: plan.plansToInsert.length + plan.plansToUpdate.length,
    pieces: plan.piecesToInsert.length + plan.piecesToUpdate.length,
    commitments: plan.commitmentsToInsert.length + plan.commitmentsToUpdate.length,
    checklist: plan.checklistItemsToInsert.length + plan.checklistItemsToUpdate.length,
    absences: plan.absences.length,
    divergences: plan.divergences.length,
  });

  const first = writesIn(firstPass);
  const second = writesIn(secondPass);
  const eProblems = [];

  if (ics.isEmptyPlan(firstPass)) {
    eProblems.push(
      "the FIRST pass over an empty database planned no write at all. The second " +
        "pass being empty then proves nothing, because there was nothing to be " +
        "idempotent about"
    );
  }
  if (!ics.isEmptyPlan(secondPass)) {
    eProblems.push(
      `the second pass plans ${second.plans} plan, ${second.pieces} piece, ` +
        `${second.commitments} commitment and ${second.checklist} checklist write(s), ` +
        `${second.absences} absence(s) and ${second.divergences} divergence(s). A ` +
        "re-import of an unchanged file must write nothing"
    );
  }
  if (firstPass.seriesWithoutRules.length !== 0) {
    eProblems.push(
      `${firstPass.seriesWithoutRules.length} series in the file own no pipeline rule, ` +
        "so their nights would draw an empty checklist that looks finished"
    );
  }

  if (eProblems.length === 0) {
    pass(
      "E",
      `first pass ${first.plans} plans · ${first.pieces} pieces · ` +
        `${first.commitments} commitment rows · ${first.checklist} checklist items; ` +
        "second pass over the same file: an EMPTY plan"
    );
    say(
      `         no insert, no update, no absence, no divergence — and ` +
        `${secondPass.seen.plans.length + secondPass.seen.pieces.length + secondPass.seen.commitments.length} ` +
        "rows stamped as still present, which is a stamp and not a write"
    );
  } else {
    fail("E", "the second pass is not empty:", eProblems);
  }
}

/* ────────────────────────────────────────────────────────────────────────────
 * The pipeline rules, read out of the applied migration
 *
 * NOT re-typed here. The sixteen rows are already published — the migration says
 * so in as many words, because every one of them is in `production-calendar.md`'s
 * weekday table — and a second copy of them in this file would drift silently:
 * the copy keeps passing while the real rows move.
 * ──────────────────────────────────────────────────────────────────────────── */

/** The `(…)` tuples of a `FROM (VALUES …) AS v(…)` block, as raw field text. */
function valueRowsAfter(sql, marker) {
  const start = sql.indexOf(marker);
  if (start < 0) return [];

  const from = sql.indexOf("FROM (VALUES", start);
  const end = sql.indexOf(") AS v(", from);
  if (from < 0 || end < 0) return [];

  const block = sql.slice(from + "FROM (VALUES".length, end);
  const rows = [];

  let i = 0;
  while (i < block.length) {
    if (block[i] !== "(") {
      i += 1;
      continue;
    }

    let depth = 0;
    let j = i;
    let inString = false;
    for (; j < block.length; j += 1) {
      const ch = block[j];
      if (inString) {
        if (ch === "'") {
          if (block[j + 1] === "'") j += 1;
          else inString = false;
        }
        continue;
      }
      if (ch === "'") inString = true;
      else if (ch === "(") depth += 1;
      else if (ch === ")") {
        depth -= 1;
        if (depth === 0) break;
      }
    }

    rows.push(splitSqlFields(block.slice(i + 1, j)));
    i = j + 1;
  }

  return rows;
}

/** Top-level commas only: a note may contain both a comma and an escaped quote. */
function splitSqlFields(inner) {
  const fields = [];
  let current = "";
  let inString = false;

  for (let i = 0; i < inner.length; i += 1) {
    const ch = inner[i];
    if (inString) {
      current += ch;
      if (ch === "'") {
        if (inner[i + 1] === "'") {
          current += "'";
          i += 1;
        } else inString = false;
      }
      continue;
    }
    if (ch === "'") {
      inString = true;
      current += ch;
      continue;
    }
    if (ch === ",") {
      fields.push(current.trim());
      current = "";
      continue;
    }
    current += ch;
  }

  fields.push(current.trim());
  return fields;
}

// Function declarations rather than consts: the checks above call
// `readPipelineRules` before this point in the file, and a `const` arrow would be
// in its temporal dead zone when they do.
function uncast(field) {
  return field.replace(/::[a-z]+$/i, "").trim();
}
function sqlText(field) {
  const value = uncast(field);
  return /^null$/i.test(value) ? null : value.slice(1, -1).split("''").join("'");
}
function sqlNumber(field) {
  const value = uncast(field);
  return /^null$/i.test(value) ? null : Number(value);
}
function sqlBoolean(field) {
  return /^true$/i.test(uncast(field));
}

/**
 * The pipeline rules, resolved the way the runner resolves them: the format-level
 * default, then the series-level override on top.
 *
 * A series code is `<FORMAT>` or `<FORMAT>-<SERIES>`, which is the shape all five
 * published sigle take, so the format half is everything before the first hyphen.
 */
function readPipelineRules() {
  const sql = readFileSync(join(ROOT, MIGRATIONS[0]), "utf8");

  const formatRows = valueRowsAfter(
    sql,
    "INSERT INTO public.production_pipeline_rule\n  (format_id, piece_kind"
  );
  const seriesRows = valueRowsAfter(
    sql,
    "INSERT INTO public.production_pipeline_rule\n  (format_id, series_id"
  );

  const ruleFrom = (fields, offset) => ({
    anchorKind: sqlText(fields[offset]),
    anchorWeekday: sqlNumber(fields[offset + 1]),
    anchorDirection: sqlText(fields[offset + 2]),
    derivable: sqlBoolean(fields[offset + 3]),
    episodesFromLineup: sqlBoolean(fields[offset + 4]),
    episodeCount: sqlNumber(fields[offset + 5]),
  });

  const byFormat = new Map();
  for (const fields of formatRows) {
    const code = sqlText(fields[0]);
    if (!byFormat.has(code)) byFormat.set(code, new Map());
    byFormat.get(code).set(sqlText(fields[1]), ruleFrom(fields, 2));
  }

  const bySeries = new Map();
  for (const fields of seriesRows) {
    const key = `${sqlText(fields[0])}|${sqlText(fields[1])}`;
    if (!bySeries.has(key)) bySeries.set(key, new Map());
    bySeries.get(key).set(sqlText(fields[2]), ruleFrom(fields, 3));
  }

  return {
    ruleCount: formatRows.length + seriesRows.length,
    rulesFor(seriesCode) {
      const hyphen = seriesCode.indexOf("-");
      const formatCode = hyphen < 0 ? seriesCode : seriesCode.slice(0, hyphen);
      const suffix = hyphen < 0 ? null : seriesCode.slice(hyphen + 1);

      const merged = new Map();
      for (const [kind, rule] of byFormat.get(formatCode) ?? []) merged.set(kind, rule);
      if (suffix !== null) {
        for (const [kind, rule] of bySeries.get(`${formatCode}|${suffix}`) ?? []) {
          merged.set(kind, rule);
        }
      }
      return merged;
    },
  };
}

/* ────────────────────────────────────────────────────────────────────────────
 * G. the SQL mirror — the TypeScript vocabularies and the CHECK constraints
 * ──────────────────────────────────────────────────────────────────────────── */

/** SQL `--` comments removed, single-quoted strings respected. */
function stripSqlComments(sql) {
  let out = "";
  let inString = false;
  for (let i = 0; i < sql.length; i += 1) {
    const ch = sql[i];
    if (inString) {
      out += ch;
      if (ch === "'") {
        if (sql[i + 1] === "'") {
          out += "'";
          i += 1;
        } else inString = false;
      }
      continue;
    }
    if (ch === "'") {
      inString = true;
      out += ch;
      continue;
    }
    if (ch === "-" && sql[i + 1] === "-") {
      while (i < sql.length && sql[i] !== "\n") i += 1;
      out += "\n";
      continue;
    }
    out += ch;
  }
  return out;
}

/** Every `IN ('a', 'b', …)` list that sits inside a `CHECK ( … )` span. */
function checkVocabularies(sql) {
  const live = stripSqlComments(sql);
  const lists = [];

  let index = live.indexOf("CHECK (");
  while (index >= 0) {
    let depth = 0;
    let end = index + "CHECK ".length;
    let inString = false;
    for (; end < live.length; end += 1) {
      const ch = live[end];
      if (inString) {
        if (ch === "'") {
          if (live[end + 1] === "'") end += 1;
          else inString = false;
        }
        continue;
      }
      if (ch === "'") inString = true;
      else if (ch === "(") depth += 1;
      else if (ch === ")") {
        depth -= 1;
        if (depth === 0) break;
      }
    }

    const span = live.slice(index, end + 1);
    for (const match of span.matchAll(/\bIN \(([^)]*)\)/g)) {
      const members = [...match[1].matchAll(/'([^']*)'/g)].map((m) => m[1]);
      if (members.length > 0) lists.push(members);
    }

    index = live.indexOf("CHECK (", end + 1);
  }

  return lists;
}

{
  const gProblems = [];
  const sqlByFile = new Map();

  for (const rel of MIGRATIONS) {
    const path = join(ROOT, rel);
    if (!existsSync(path)) {
      gProblems.push(`${rel} is not on disk, so the mirror could not be read`);
      continue;
    }
    sqlByFile.set(rel, readFileSync(path, "utf8"));
  }

  const lists = [...sqlByFile.values()].flatMap((sql) => checkVocabularies(sql));

  // Seven vocabularies, named from the module so that a rename is a build error
  // here and not a silently skipped assertion.
  //
  // `CALENDAR_KEYS` (plan 58-07) is the seventh, and it is the one whose CHECK is
  // NOT a bare `IN`: its four constraints read `calendar_key IS NULL OR
  // calendar_key IN (…)`, because the column's nullability is a declared
  // transition and the constraint says so. `checkVocabularies` reads it anyway —
  // it extracts every `IN (…)` list sitting inside a `CHECK ( … )` span rather
  // than requiring the span to BE one, which is also how it already reads
  // `production_piece_unresolved_check`, written in the same shape since plan
  // 44-02. No adaptation was needed, and that is worth recording: had the
  // extractor missed the shape, the repair belonged HERE and not in the
  // constraint — the constraint tells the truth about the transition, and a gate
  // that cannot read it is the incomplete half.
  const mirrored = [
    ["PIECE_KINDS", ics.PIECE_KINDS],
    ["PIECE_DATE_ORIGINS", ics.PIECE_DATE_ORIGINS],
    ["UNRESOLVED_REASONS", ics.UNRESOLVED_REASONS],
    ["VENUE_STAGES", ics.VENUE_STAGES],
    ["ANCHOR_KINDS", ics.ANCHOR_KINDS],
    ["ANCHOR_DIRECTIONS", ics.ANCHOR_DIRECTIONS],
    ["CALENDAR_KEYS", ics.CALENDAR_KEYS],
  ];

  let membersChecked = 0;
  for (const [name, vocabulary] of mirrored) {
    for (const member of vocabulary) {
      membersChecked += 1;
      if (!lists.some((list) => list.includes(member))) {
        gProblems.push(
          `${name} declares a member no CHECK constraint accepts. The database would ` +
            "refuse a row the TypeScript considers valid, and the build cannot see it"
        );
      }
    }
  }

  // The other direction, and it is the one that matters more: a CHECK that has
  // grown a member the TypeScript does not know is a value the database will
  // store and no code will ever branch on.
  for (const list of lists) {
    for (const [name, vocabulary] of mirrored) {
      const declared = new Set(vocabulary);
      if (!list.some((member) => declared.has(member))) continue;
      const extra = list.filter((member) => !declared.has(member));
      if (extra.length > 0) {
        gProblems.push(
          `a CHECK vocabulary overlapping ${name} carries ${extra.length} member(s) ` +
            "the TypeScript does not declare"
        );
      }
    }
  }

  if (gProblems.length === 0) {
    pass(
      "G",
      // Counted from `mirrored` rather than written as a literal: a hard-coded
      // number in a PASS line is a number that goes stale the next time a
      // vocabulary is added, and a green line reporting the wrong count is the
      // quiet kind of wrong — nobody re-reads a check that passed.
      `${membersChecked} declared members across ${mirrored.length} vocabularies, each accepted by a ` +
        `CHECK constraint · ${lists.length} CHECK vocabularies read from ` +
        `${sqlByFile.size} migration(s), none carrying a member the TypeScript lacks`
    );
  } else {
    fail("G", "the TypeScript and the SQL do not mirror each other:", gProblems);
  }
}

/* ────────────────────────────────────────────────────────────────────────────
 * H. the reader cannot reach the announced-night table
 * ──────────────────────────────────────────────────────────────────────────── */

/** Every `.ts` file under `dir`, recursively. */
function typescriptFiles(dir) {
  const found = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) found.push(...typescriptFiles(path));
    else if (entry.name.endsWith(".ts") || entry.name.endsWith(".tsx")) found.push(path);
  }
  return found;
}

{
  const hProblems = [];

  // Comments are stripped first. `reconcile.ts` states the prohibition in prose,
  // and a check that counted its own prohibition would be a check that goes red on
  // a correct file — which is the one failure mode that gets a gate switched off.
  const NIGHT_TABLE = "event_parties";
  const DIRECTIVE = /^\s*["']use server["']\s*;?\s*$/;

  let icsFiles = 0;
  let reachingLines = 0;
  for (const file of typescriptFiles(ICS_DIR)) {
    icsFiles += 1;
    const { lines, unterminated } = liveLines(file);
    if (unterminated !== null) {
      hProblems.push(
        "a file in the reader's own tree opens a comment that never closes, so this " +
          "check could not read it"
      );
      continue;
    }
    reachingLines += lines.filter((line) => line.includes(NIGHT_TABLE)).length;
  }

  let productionFiles = 0;
  let directives = 0;
  for (const file of typescriptFiles(PRODUCTION_DIR)) {
    productionFiles += 1;
    const { lines } = liveLines(file);
    directives += lines.filter((line) => DIRECTIVE.test(line)).length;
  }

  // Neither message names the directory, for the reason the passing line does not
  // and the header explains: its name is an ordinary word that occurs in an entry
  // title, and a FAILING message that reintroduced it would drag check F down with
  // it — one broken check reported as two.
  if (reachingLines !== 0) {
    hProblems.push(
      `${reachingLines} live line(s) in the reader's own tree name the announced-night ` +
        "table. The import moves a date; announcing a night is a separate, deliberate act"
    );
  }
  if (directives !== 0) {
    hProblems.push(
      `${directives} file(s) in the reader's own tree carry the server-action ` +
        "directive, which publishes every export as an endpoint anybody can call " +
        "with a forged body"
    );
  }

  if (hProblems.length === 0) {
    // The directory is deliberately NOT named in this sentence. Its name is an
    // ordinary English word, it occurs in an entry title of the calendar, and
    // check F asks that no token of a title appear in this run's output. The
    // header says where the directory is; a passing line does not need to.
    pass(
      "H",
      `0 live references to the announced-night table across ${icsFiles} module files · ` +
        `0 server-action directives across ${productionFiles} files in the reader's ` +
        "own tree"
    );
  } else {
    fail("H", "the reader is not where it was put:", hProblems);
  }
}

/* ────────────────────────────────────────────────────────────────────────────
 * F. confidentiality — over everything printed above
 * ──────────────────────────────────────────────────────────────────────────── */

/** Words of three characters or more, lower-cased. Digits count as characters. */
function tokensOf(text) {
  return new Set(
    text
      .toLowerCase()
      .split(/[^\p{L}\p{N}]+/u)
      .filter((token) => token.length >= 3)
  );
}

{
  if (!haveMaterial) {
    refusedChecks.push("F");
    say(
      "  · F  not run: it measures this run's output against the file's titles, and " +
        "no file was read"
    );
  } else {
    const publicTokens = [
      ...Object.values(ics.PIECE_KIND_LABELS),
      ...PUBLISHED_SIGLE,
      ...FORMAT_NAMES,
    ];

    const residual = new Set();
    for (const event of parsed.events) {
      let remainder = event.summary;
      for (const token of publicTokens) {
        remainder = remainder.split(new RegExp(escapeForRegex(token), "gi")).join(" ");
      }
      for (const token of tokensOf(remainder)) residual.add(token);
    }

    const printed = tokensOf(transcript.join("\n"));
    const leaked = [...residual].filter((token) => printed.has(token));
    const years = [...printed].filter((token) => /^(19|20)\d{2}$/.test(token));

    const fProblems = [];
    if (leaked.length > 0) {
      // The leaked tokens are NOT printed. Printing them to say they were printed
      // is the whole failure, performed by the check that found it.
      fProblems.push(
        `${leaked.length} token(s) of a parsed title occur in this run's output. They ` +
          "are deliberately not listed here — printing them to report them would " +
          "perform the leak this check exists to prevent. Read the run above and " +
          "find what it prints that it should not"
      );
    }
    if (years.length > 0) {
      fProblems.push(
        `${years.length} four-digit year(s) appear in this run's output. A date is the ` +
          "first thing this script may not say out loud, and the name of the file it " +
          "reads is one"
      );
    }

    if (fProblems.length === 0) {
      pass(
        "F",
        `${residual.size} residual token(s) across ${parsed.events.length} titles, ` +
          `0 of them in the ${printed.size} tokens this run printed · 0 four-digit years`
      );
    } else {
      fail("F", "this run's own output carries material:", fProblems);
    }
  }
}

function escapeForRegex(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/* ────────────────────────────────────────────────────────────────────────────
 * verdict
 * ──────────────────────────────────────────────────────────────────────────── */

say("");

if (failures.length > 0) {
  say(`  ICS_IMPORT_FAIL — ${failures.length} check(s) failed: ${failures.join(", ")}`);
  say("");
  process.exit(1);
}

if (refusedChecks.length > 0) {
  say(
    `  ICS_IMPORT_REFUSED — ${refusedChecks.length} check(s) did not run: ` +
      `${refusedChecks.join(", ")}. G and H passed.`
  );
  say(
    "  The material is gitignored and lives only on the owner's machine; nothing was\n" +
      "  measured about the reader. A refusal is not a failure, and it is not a pass.\n"
  );
  process.exit(2);
}

say("  ICS_IMPORT_OK — all eight checks passed.");
say(
  "  Read the header before treating this as safety: it says the reader agrees with\n" +
    "  the file supplied on one day, and nothing about whether the anchors are the\n" +
    "  right anchors or whether a proposal reads as unsettled to a person.\n"
);
process.exit(0);
