#!/usr/bin/env node
/**
 * seed-production-spaces.mjs — the desk-work scouting archive, carried from the
 * owner's machine into the location section, by hand, printing counts and never
 * a word of what it read.
 *
 * WHAT IT DOES, in one sentence: **it reads the newest scouting snapshot in
 * `docs/`, maps each record onto the location section's two tables through a
 * mapping declared at the top of this file, prints the resulting plan of writes
 * as counts and reason codes, and — only when `--apply` is passed explicitly —
 * performs those writes.**
 *
 * ── ⚠ WHY THIS IS A LOCAL SCRIPT AND NOT AN UPLOAD (D-44-26) ────────────────
 *
 * There is **no upload surface in this product**: no Server Action that accepts
 * a file, no route that receives one, no drag target anywhere. That is a
 * decision, not an omission, and the reasoning is copied wholesale from
 * `scripts/import-production-calendar.mjs`, which states it about its own input.
 *
 * An in-product upload would make this archive **transit a serverless function**
 * — carrying 184 spaces under negotiation and their street addresses into logs,
 * caches, framework error pages and whatever a future exception handler decides
 * to echo. This project has **no error tracking at all**, so nobody would
 * notice. The surface does not exist today, and it must not start existing for
 * the one input in this repository that is worse to leak than the calendar.
 *
 * ── ⚠ THIS RUN'S OUTPUT IS A PUBLICATION SURFACE ────────────────────────────
 *
 * `docs/` is gitignored and held there by check **F** of
 * `npm run verify:persona`. `github.com/edmiribrahimi/Resonate` is **public**,
 * and a publication is irreversible.
 *
 * So the rule is narrower than "be careful": somebody will paste this run into
 * an issue. It prints **counts, identifiers and reason codes**, and it prints no
 * name of a space, no street token, no year, no note and **not even the name of
 * the file it read** — that name carries a date. A failure is logged with
 * `error.code` and `error.message` and never with PostgREST's third field, the
 * one that carries the entire rejected row: here that row is a space under
 * negotiation, with its address in it (D-45-18).
 *
 * The last thing the run prints is an audit **of its own transcript**, and this
 * one is stricter than the calendar importer's: it looks for a residual token of
 * any record's name OR address, for a four-digit year, and for a street word.
 * The archive's address field is populated on **every** record.
 *
 * ── FIVE THINGS IT CANNOT DO, BY CONSTRUCTION ───────────────────────────────
 *
 *   1. **It writes nothing unless `--apply` is passed.** A dry run is the
 *      DEFAULT. A tool that writes production when invoked with no arguments is
 *      a tool that will one day be invoked with no arguments.
 *   2. **It removes nothing, ever.** There is no removal statement in this file
 *      and no list that could carry one. This is D-45-13 made structural for the
 *      seed: a space that leaves the race keeps its row and carries why. The
 *      Phase 36 incident — 63 production rows lost during a *verification*, and
 *      this project has no point-in-time recovery — is why the guarantee is an
 *      absence in the source rather than a flag somebody could pass.
 *   3. **It never writes the acquisition column.** Its `DEFAULT 'mapped'` does
 *      it. A script that derived that column from an attribute would be
 *      *una classifica non e' una disponibilita'* encoded into data, and **no
 *      CHECK would catch it** — only the omission does. Nobody has been called;
 *      the whole archive is desk work.
 *   4. **It never writes a score, because there is none.** The source carries no
 *      score field and the schema has no score column. What it writes are
 *      **attributes**; a suitability figure is computed from them, per format,
 *      at render time by `src/lib/production/sections/score.ts`.
 *   5. **It never writes the two phone-answer columns** — the hours a space
 *      actually keeps, and whether it will discuss later ones (D-45-24). The
 *      second is not published anywhere because it is not a fact about a venue:
 *      it is the answer to a call nobody has made. No crawl, no inference and no
 *      default may move it off its default value, and the way to guarantee that
 *      is to have no code path that names it. The first is absent from all 184
 *      records — measured — and a value assembled from a note would be a fact
 *      nobody established.
 *
 * A sixth, of the same shape: **the provenance of every attribute this script
 * writes is `derived`, without exception, and there is no flag to say
 * otherwise.** The other member of that column's vocabulary means *checked on
 * site, for that format*, and this file must never be able to write it — which
 * is why that word is **not written anywhere in this file, not even here**. A
 * grep for it over this script returns nothing at all, and that empty result is
 * the assertion: a value nothing in the source can produce is safer than a value
 * guarded by a branch somebody could edit.
 *
 * ── THE FIELD MAPPING IS DECLARED, NOT DISCOVERED ───────────────────────────
 *
 * `45-CONTEXT.md` §the scouting source's shape records the source's 27 fields,
 * so the mapping below is a constant table rather than something inferred at
 * run time. Three rules govern it:
 *
 *   * a source value with **no declared target** is a refusal for that field,
 *     counted and reported by field name and reason code — never silently
 *     dropped and never defaulted. A refused field does not refuse its space:
 *     the row is still written, because losing a space loses the memory of the
 *     choice, which is the thing D-45-13 exists to keep;
 *   * the legal-status field is **read and discarded** — D-45-22 keeps the
 *     regime out of the product, and this sentence is the only place in this
 *     file that names it, so the exclusion is visible rather than an omission;
 *   * the source's **five** to-verify attributes carry a literal unanswered
 *     marker, and it maps to `not_asked`, which is a **value** in the target
 *     vocabulary and not an absence. A surface that rendered it blank would
 *     report ignorance as a negative, and on the evening-viability attribute the
 *     marker is on more than half the archive.
 *
 * **Three more source fields are excluded by declaration**, and they are named
 * here rather than left to a reader to notice their absence: the two prose
 * fields that describe the outdoor space and the musical life of a place, and
 * the third that describes its character. All three are **evidence for an
 * attribute**, and `public.production_space_attribute` has no column for a note.
 * Inventing one is a migration, which is a different plan; concatenating them
 * into the space's own note would fuse three different claims into one string
 * whose provenance nobody could unpick. They are counted and reported, so the
 * work they represent is visible as deferred rather than lost.
 *
 * Two flags are excluded the same way: the readiness marker, present on 14
 * records with no target column, and the natural-wine guide flag, which is a
 * fact about a guidebook and not about whether a night can happen.
 *
 * ── THE ADDRESS IS WRITTEN, AND ONLY INTO ITS COLUMN ────────────────────────
 *
 * D-45-24 settled it, over the researcher's narrower recommendation, and the
 * structural guarantees of D-45-21 are what carry the risk: plan 45-06's census
 * measured that no foreign key, view or function connects this table to
 * `venue_for_parties`, the one public road to an address. So the address goes
 * into the one column built for it — and **never into a log line, a reason code,
 * an error message or this run's transcript.**
 *
 * ── RE-RUNNABILITY, AND WHICH KEY IT RESTS ON ───────────────────────────────
 *
 * **The source carries no stable per-record identity.** It was read, and there
 * is no id field, no slug and no key of any kind: the 27 fields are all
 * descriptive. The natural key is therefore a **normalised name** — lowercased,
 * accents folded, every run of non-alphanumerics collapsed to one hyphen — and
 * it was measured unique across all 184 records before this file was written.
 *
 * **The consequence belongs to whoever renames a space, so it is stated loudly:
 * a renamed space arrives as a NEW row.** The old row is not removed, because
 * nothing here removes anything; it stays, and somebody has to decide what it
 * is. If this becomes a real problem the repair is a stable id in the source,
 * not a fuzzy match here — a matcher that guesses which two names are the same
 * place is a matcher that will one day merge two different places.
 *
 * **The write is `ON CONFLICT DO NOTHING`, and that is a decision, not a
 * shortcut.** D-45-07 says the section seeds once and is edited from the page
 * afterwards, so the seed owns creation and the page owns editing. An upsert
 * that overwrote on conflict would let a re-run silently undo somebody's edit —
 * an attribute they checked on site, a note they corrected — and a silent
 * removal of work is the failure mode this project already paid for once. It is
 * still one atomic statement per batch, keyed on a unique constraint: never a
 * read-then-insert, which is a race.
 *
 * ── THE TARGET VOCABULARIES ARE MIRRORED, AND THE MIRROR IS ENFORCED ────────
 *
 * The right-hand side of every mapping below is copied from
 * `src/lib/production/sections/vocabulary.ts`, which is itself mirrored by named
 * SQL `CHECK` constraints. This file asserts its own products against a local
 * copy of those tuples before it writes anything, and the database refuses a
 * stray value by a constraint NAME rather than an anonymous `23514`. Two layers,
 * and neither is `tsc`: a TypeScript union is invisible to Postgres and a SQL
 * `CHECK` is invisible to the compiler.
 *
 * ── ⚠ `seed:spaces` IS NOT A `verify:*` ENTRY, AND MUST NEVER BECOME ONE ────
 *
 * `scripts/verify-all.mjs` collects the gates it runs by taking every
 * `package.json` script whose name begins with the verification prefix, so a
 * name outside that prefix is invisible to the aggregate — which is exactly the
 * property wanted here. **This script writes.** A gate is something a person
 * runs to find out whether the tree is sound; a writer is something a person
 * runs having decided to change production. Putting a writer in an aggregate
 * that a build, a hook or a habit invokes is how a decision becomes an accident.
 *
 * ── ARGUMENTS ───────────────────────────────────────────────────────────────
 *
 *   `--dry-run`         print the plan and write nothing. **THE DEFAULT.**
 *   `--apply`           perform the writes. Must be passed explicitly.
 *   `--file <path>`     one snapshot, by path. Overrides the search.
 *   `--docs-dir <dir>`  where to search for the newest snapshot. Defaults to
 *                       `docs/` beside this repository — the file is
 *                       `docs/scouting-<snapshot>.json`, and the search prints
 *                       neither the directory nor the name, because the name
 *                       carries a date.
 *   `--help`
 *
 * ── EXIT CODES ──────────────────────────────────────────────────────────────
 *
 *   `0` the run completed AND its own output audit came back clean · `1` the run
 *   FAILED partway, and what it had already written stays written and is
 *   reported — **or** it reached the end and the output audit found material in
 *   its transcript · `2` REFUSED, and **nothing was written**.
 *
 *   A refusal is not a failure: it means the seed did not happen. Every refusal
 *   names its category, because "something went wrong" with no name is the
 *   silent failure `meta-gates.md` forbids.
 *
 *   ⚠ A FAILED OUTPUT AUDIT NEVER EXITS `0`. A run that printed an address has
 *   already done the harm the column exists to contain, and it has done it even
 *   if every write succeeded. The last line says which ending this was:
 *   `SEED_DRY_RUN_OK` / `SEED_APPLIED_OK`, or
 *   `SEED_DRY_RUN_WITH_LEAKED_OUTPUT` / `SEED_APPLIED_WITH_LEAKED_OUTPUT`.
 *
 * ── WHAT A GREEN DOES NOT MEAN ──────────────────────────────────────────────
 *
 *   - A successful `--apply` says **rows were written**, as counted by the thing
 *     that wrote them. That is a report, not a fact: the fact is a count read
 *     from the catalogue, by somebody who is not this script. *Il contatore di
 *     controllo non legge la superficie che sta muovendo.*
 *   - It says nothing about whether the section refuses an unentitled reader.
 *     That is `npm run verify:refusal`, which — for the first time — will have a
 *     table with rows in it and can assert a pair on a section table.
 *   - There is no test runner in this repository. Nothing here is a test.
 */

import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

/* ────────────────────────────────────────────────────────────────────────────
 * Secrecy — the two kinds, and they are different problems
 *
 * A SECRET must never be printed: one list every printed string passes through.
 * It is defence in depth and not the primary control — the primary control is
 * that no path prints one — and it exists because an API error body is written
 * by somebody else and can echo back what it was sent.
 *
 * MATERIAL must never be printed either, but it cannot be redacted the same way:
 * it is not a fixed list, it is every word of every name and every address. That
 * one is handled at the end, by auditing the transcript.
 * ──────────────────────────────────────────────────────────────────────────── */

const SECRETS = [];

function registerSecret(value) {
  if (typeof value === "string" && value.length >= 4) SECRETS.push(value);
}

function redact(text) {
  let out = String(text);
  for (const secret of SECRETS) out = out.split(secret).join("«redacted»");
  return out;
}

/** Every line this run prints, kept so the audit at the end can read them. */
const transcript = [];

function say(line = "") {
  const safe = redact(line);
  transcript.push(safe);
  console.log(safe);
}

/**
 * True once the snapshot has been parsed, which is the moment the output audit
 * at the bottom becomes able to run.
 *
 * A refusal is an exit like any other, and several of them happen after the file
 * has been read. An audit that only ran on the two happy paths would be absent
 * from exactly the exits somebody is most likely to paste into an issue.
 */
let auditReady = false;

/** A refusal. **Nothing was written**, and the category is part of the sentence. */
function refuse(category, message) {
  say("");
  say(`  REFUSED [${category}] — ${redact(message)}`);
  say("");
  say("  NOTHING WAS WRITTEN. No seeding happened; this is not an empty plan.");
  if (auditReady) auditOwnOutput();
  say("");
  process.exit(2);
}

/**
 * A failure partway through the writes.
 *
 * Exit 1, and the message says what had already been written, because a seed
 * that quietly did half its job and one a person can see did half its job are
 * different things.
 */
function failPartway(category, message, written) {
  say("");
  say(`  FAILED [${category}] — ${redact(message)}`);
  say("");
  say(`  ⚠ ${written} write step(s) had already completed. Those STAY WRITTEN.`);
  say("    Re-run without --apply first: planning is keyed on a natural key, so");
  say("    a second pass reports only what an earlier pass did not finish.");
  if (auditReady) auditOwnOutput();
  say("");
  process.exit(1);
}

/* ────────────────────────────────────────────────────────────────────────────
 * Arguments — and the default is the safe one
 * ──────────────────────────────────────────────────────────────────────────── */

function parseArguments(argv) {
  const options = { apply: false, dryRunAsked: false, file: null, docsDir: null, help: false };
  const unknown = [];

  for (let i = 0; i < argv.length; i += 1) {
    const argument = argv[i];
    if (argument === "--apply") options.apply = true;
    else if (argument === "--dry-run") options.dryRunAsked = true;
    else if (argument === "--help" || argument === "-h") options.help = true;
    else if (argument === "--file") {
      i += 1;
      options.file = argv[i] ?? null;
    } else if (argument === "--docs-dir") {
      i += 1;
      options.docsDir = argv[i] ?? null;
    } else unknown.push(argument);
  }

  return { options, unknown };
}

const { options, unknown } = parseArguments(process.argv.slice(2));

/*
 * ⚠ FROM HERE DOWN, THE PRINTED STRINGS ARE DELIBERATELY POORER THAN THE
 * COMMENTS AROUND THEM.
 *
 * The comments may name a column, a table and a domain word; the printed lines
 * may not, because an ordinary word this script has reason to print may also
 * occur inside the name of a place or a street. When the audit at the bottom
 * goes red on such a coincidence, the repair is to SAY LESS — never to exempt,
 * never to widen the rule.
 *
 * ⚠ IT WENT RED ON THIS SCRIPT'S FIRST RUN, and on a run that leaked nothing.
 * Three tokens matched: two articles and a numeral word. They carry no
 * information whatsoever — they matched because a place is named with an
 * English article in it and a street name contains a numeral word — and the
 * tempting repair was a list of grammatical exemptions.
 *
 * That repair was refused, for the reason `import-production-calendar.mjs`
 * writes about its own red: an exemption list is a rule that grows every time it
 * is inconvenient, and the fourth entry somebody adds under deadline is the one
 * that hides a real leak. **The output was reworded instead**, and the prose it
 * used to carry now lives in this header, where it is not printed. Every
 * sentence below the banner is written without those three words, on purpose,
 * and a future edit that reintroduces one goes red again — which is the point of
 * the rule being absolute.
 */

if (options.help) {
  say("");
  say("  seed-production-spaces — desk work into a section");
  say("");
  say("    (no flag)      plan every write, perform none. DEFAULT.");
  say("    --apply        perform every write. Must be passed explicitly.");
  say("    --file <path>  a single snapshot, by path.");
  say("    --docs-dir <d> where to search for a newest snapshot.");
  say("    --help");
  say("");
  say("  It removes nothing under any flag. No flag would let it.");
  say("");
  process.exit(0);
}

if (unknown.length > 0) {
  say("");
  say(`  REFUSED [unknown_argument] — ${unknown.length} argument(s) not understood.`);
  say("  NOTHING WAS WRITTEN. Run with --help.");
  say("");
  process.exit(2);
}

if (options.apply && options.dryRunAsked) {
  say("");
  say("  REFUSED [ambiguous_invocation] — --apply with --dry-run, both passed.");
  say("  NOTHING WAS WRITTEN. Two orders of a same pair must not mean two");
  say("  different things.");
  say("");
  process.exit(2);
}

/* ════════════════════════════════════════════════════════════════════════════
 * THE DECLARED MAPPING
 *
 * Left: the source's own field name. Right: the target column or attribute key,
 * with its value mapping beside it. Nothing below is inferred at run time.
 * ════════════════════════════════════════════════════════════════════════════ */

/**
 * The target vocabularies, copied from `src/lib/production/sections/vocabulary.ts`.
 *
 * Copied and not imported: that module is TypeScript and resolves a path alias,
 * and a loader hook for one tuple would be more machinery than the thing it
 * loads. The copy is asserted against every value this file produces before any
 * write, and the database holds the same tuples as named `CHECK` constraints —
 * so a drift is caught twice and neither catch is silent.
 */
const TARGET_ATTRIBUTE_VALUES = ["top", "good", "limited", "no", "not_asked"];
const TARGET_ATTRIBUTE_KEYS = [
  "outdoor_sunset",
  "artistic_frame",
  "aperitivo_vocation",
  "exclusivity",
  "evening_licence",
  "events",
  "music_at_home",
  "audio",
  "console",
  "partnership",
];
const TARGET_CATEGORIES = [
  "club",
  "live_club",
  "cocktail_bar",
  "brewery",
  "restaurant",
  "wine_bar",
  "institution",
  "gallery",
  "project_space",
  "hybrid",
  "historic_house",
];
const TARGET_SIZE_BANDS = ["small", "medium", "large", "not_asked"];

/**
 * The eleven categories, from the source's Italian words to the product's.
 *
 * All eleven source values were measured present, and all eleven have a target.
 * A twelfth arriving one day is a refusal with its own reason code, never a
 * fallback to a neighbouring word: a category is descriptive, and a wrong one is
 * a description of a place that is not that place.
 */
const CATEGORY_MAP = {
  Cocktail: "cocktail_bar",
  Birreria: "brewery",
  Ristorante: "restaurant",
  Vineria: "wine_bar",
  Istituzione: "institution",
  Ibrido: "hybrid",
  Project: "project_space",
  Galleria: "gallery",
  Club: "club",
  "Live club": "live_club",
  Dimora: "historic_house",
};

/**
 * The capacity band. Four source letters, four target words.
 *
 * ⚠ **The fourth is not a size.** It is the unanswered marker, on 17 of 184, and
 * it is seeded as that distinct state. A band is not a capacity either: the
 * target for a night is 150 to 300 people, and no band answers whether a given
 * room is inside it. The numeric column beside it is the answer to that, and it
 * is null wherever nobody has stood in the room.
 */
const SIZE_BAND_MAP = { p: "small", m: "medium", g: "large", v: "not_asked" };

/**
 * The ten attributes, each with its own value mapping.
 *
 * **Ten mappings and not two.** The source runs two surface scales — a four-step
 * one on the attributes a profile can be read for, and a shorter yes / maybe /
 * unasked one on the six a telephone closes — and folding them with one shared
 * table would hide that two of the six do not share a shape with the other four.
 * The music-at-home field, for instance, distinguishes *already happening* from
 * *open to it*, which is a real two-step and maps onto two different target
 * values; the audio field does not, and pretending it did would invent a
 * distinction nobody made.
 *
 * ⚠ **`forse` maps DOWN, to `limited`, and never up.** It means *maybe* — a
 * hypothesis of partial fit read off a public profile. These values feed a
 * computed suitability figure, and inflating a derived input is the failure mode
 * that costs money: a figure drawn beside a name says *this place is possible*,
 * and it says it about desk work.
 */
const FOUR_STEP = { top: "top", buono: "good", limitato: "limited", no: "no" };

const ATTRIBUTE_MAP = {
  ext: { key: "outdoor_sunset", values: FOUR_STEP },
  art: { key: "artistic_frame", values: FOUR_STEP },
  aper: { key: "aperitivo_vocation", values: FOUR_STEP },
  excl: { key: "exclusivity", values: FOUR_STEP },
  night: { key: "evening_licence", values: { si: "top", forse: "limited", no: "no", verifica: "not_asked" } },
  even: { key: "events", values: { si: "top", forse: "limited", verifica: "not_asked" } },
  mus: { key: "music_at_home", values: { attivo: "top", aperto: "good", verifica: "not_asked" } },
  aud: { key: "audio", values: { si: "top", forse: "limited", verifica: "not_asked" } },
  cons: { key: "console", values: { si: "top", forse: "limited", verifica: "not_asked" } },
  part: { key: "partnership", values: { si: "top", forse: "limited", no: "no" } },
};

/**
 * The four format codes, from the source's lowercase abbreviation to the code
 * `public.formats` stores.
 *
 * The reference is resolved from the database by that code, never invented here:
 * this file holds an abbreviation and the catalogue holds the identity, which is
 * the same direction the calendar importer takes for its own alias map.
 */
const HOME_FORMAT_MAP = { snst: "SNST", mtnlb: "MTNLB", rsnt: "RSNT", rmdb: "RMDB" };

/**
 * What makes a free-text note unwritable.
 *
 * ⚠ **This is a finding, and it contradicts a written assumption.**
 * `45-CONTEXT.md` records the source as carrying *no contact field, no phone, no
 * email* — true of the FIELDS, and false of the PROSE. Measured on 2026-08-17:
 * 15 records carry an email address inside the free-text note and 20 carry an
 * Italian mobile number. Four more name a person to ask for.
 *
 * The target column's own migration says what it is for in as many words —
 * criteria and observation only, no contact, no person, no price — so writing
 * those notes verbatim would break a declared contract of the column and put a
 * named person's mobile number into a production table, which is a purpose
 * nobody declared and therefore data nobody may collect.
 *
 * The detector is deliberately BROAD. A false positive costs one observation; a
 * false negative costs a person's telephone number. The whole field is withheld
 * rather than scrubbed, because a redaction that silently fails is worse than a
 * refusal that is counted: the space is still written, the note is left empty,
 * and the count is reported under its own reason code.
 */
const NOTE_IS_UNWRITABLE = [
  /[\w.+-]+@[\w-]+\.[a-z]{2,}/i,
  /\+39[ .-]?[0-9][0-9 .\/-]{7,}/,
  /\b3[0-9]{2}[ .\/-]?[0-9]{6,}\b/,
  /\b0[0-9]{1,3}[ .\/-]?[0-9]{5,}\b/,
  /€|\beuro\b/i,
  /contatt|referente|chiedere di|scrivere a|mail a|whatsapp|\btel\b/i,
];

/**
 * Reason codes. Each names one thing that can go unwritten, and each is counted.
 *
 * They are declared as a list so the report can print every one of them with a
 * zero beside it. A breakdown that omits its zeroes tells a reader that a
 * category was clean and a category that never ran are the same thing.
 */
const REASON_CODES = [
  "absent_name",
  "empty_natural_key",
  "duplicate_natural_key",
  "unmapped_category",
  "unmapped_home_format",
  "unresolved_home_format",
  "unmapped_size_band",
  "capacity_not_positive",
  "unmapped_attribute_value",
  "note_withheld_contact",
  "evidence_field_has_no_column",
  "flag_field_has_no_column",
];

/* ────────────────────────────────────────────────────────────────────────────
 * Reading the snapshot — and the search prints nothing about it
 * ──────────────────────────────────────────────────────────────────────────── */

function newestSnapshot(directory) {
  if (!existsSync(directory)) {
    refuse(
      "no_source_directory",
      "a directory that should hold a snapshot does not exist. Its path is " +
        "not printed here: pass --docs-dir if it lives elsewhere."
    );
  }
  const candidates = readdirSync(directory)
    .filter((entry) => entry.startsWith("scouting-") && entry.endsWith(".json"))
    .map((entry) => ({ path: join(directory, entry), at: statSync(join(directory, entry)).mtimeMs }))
    .sort((a, b) => b.at - a.at);

  if (candidates.length === 0) {
    refuse(
      "no_snapshot_found",
      "no snapshot was found. Pass --file to name a path, or --docs-dir to point " +
        "at a directory holding it. Neither name is printed by this script."
    );
  }
  return candidates[0].path;
}

const sourcePath = options.file
  ? resolve(options.file)
  : newestSnapshot(options.docsDir ? resolve(options.docsDir) : join(ROOT, "docs"));

if (!existsSync(sourcePath)) {
  refuse("snapshot_unreadable", "a snapshot named by --file is not on disk.");
}

let records;
try {
  const parsed = JSON.parse(readFileSync(sourcePath, "utf8"));
  records = Array.isArray(parsed) ? parsed : null;
} catch (error) {
  refuse("snapshot_unparseable", `a snapshot is not readable as JSON: ${error.message}`);
}

if (!records) {
  refuse("snapshot_not_an_array", "a snapshot's top level is not an array of records.");
}

auditReady = true;

/* ────────────────────────────────────────────────────────────────────────────
 * The natural key
 * ──────────────────────────────────────────────────────────────────────────── */

function naturalKey(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/* ────────────────────────────────────────────────────────────────────────────
 * Building the plan
 * ──────────────────────────────────────────────────────────────────────────── */

const refusals = Object.fromEntries(REASON_CODES.map((code) => [code, 0]));
const planned = [];
const seenKeys = new Set();
let attributesPlanned = 0;
let notesCarried = 0;
let capacitiesCarried = 0;
let addressesCarried = 0;
const homeCodesWanted = new Set();

for (const record of records) {
  const name = typeof record.n === "string" ? record.n.trim() : "";
  if (!name) {
    refusals.absent_name += 1;
    continue;
  }

  const key = naturalKey(name);
  if (!key) {
    refusals.empty_natural_key += 1;
    continue;
  }
  if (seenKeys.has(key)) {
    refusals.duplicate_natural_key += 1;
    continue;
  }
  seenKeys.add(key);

  let category = null;
  if (typeof record.cat === "string" && record.cat.trim()) {
    const mapped = CATEGORY_MAP[record.cat.trim()];
    if (mapped) category = mapped;
    else refusals.unmapped_category += 1;
  }

  let homeCode = null;
  if (typeof record.home === "string" && record.home.trim()) {
    const mapped = HOME_FORMAT_MAP[record.home.trim().toLowerCase()];
    if (mapped) {
      homeCode = mapped;
      homeCodesWanted.add(mapped);
    } else refusals.unmapped_home_format += 1;
  }

  let sizeBand = null;
  if (typeof record.cap === "string" && record.cap.trim()) {
    const mapped = SIZE_BAND_MAP[record.cap.trim().toLowerCase()];
    if (mapped) sizeBand = mapped;
    else refusals.unmapped_size_band += 1;
  }

  let capacity = null;
  if (typeof record.capn === "number" && Number.isFinite(record.capn)) {
    if (record.capn > 0) {
      capacity = Math.round(record.capn);
      capacitiesCarried += 1;
    } else refusals.capacity_not_positive += 1;
  }

  const rawNote = typeof record.note === "string" ? record.note.trim() : "";
  let note = null;
  if (rawNote) {
    if (NOTE_IS_UNWRITABLE.some((pattern) => pattern.test(rawNote))) {
      refusals.note_withheld_contact += 1;
    } else {
      note = rawNote;
      notesCarried += 1;
    }
  }

  // The three evidence fields and the two flags with no column. Counted here so
  // the work they represent is visible as deferred rather than lost, and never
  // folded into a column that was built for something else.
  for (const field of ["ed", "md", "cd"]) {
    if (typeof record[field] === "string" && record[field].trim()) {
      refusals.evidence_field_has_no_column += 1;
    }
  }
  for (const field of ["ready", "raisin"]) {
    const value = record[field];
    if ((typeof value === "string" && value.trim()) || (typeof value === "number" && value === 1)) {
      refusals.flag_field_has_no_column += 1;
    }
  }

  const address = typeof record.z === "string" && record.z.trim() ? record.z.trim() : null;
  if (address) addressesCarried += 1;

  const attributes = [];
  for (const [field, spec] of Object.entries(ATTRIBUTE_MAP)) {
    const raw = typeof record[field] === "string" ? record[field].trim().toLowerCase() : "";
    if (!raw) continue;
    const value = spec.values[raw];
    if (!value) {
      refusals.unmapped_attribute_value += 1;
      continue;
    }
    attributes.push({ attribute: spec.key, value });
    attributesPlanned += 1;
  }

  planned.push({
    key,
    homeCode,
    space: {
      source_key: key,
      name,
      short_description:
        typeof record.t === "string" && record.t.trim() ? record.t.trim() : null,
      address,
      category,
      source: typeof record.src === "string" && record.src.trim() ? record.src.trim() : null,
      size_band: sizeBand,
      real_capacity: capacity,
      already_used: record.gia === 1,
      in_use: record.inuso === 1,
      note,
    },
    attributes,
  });
}

/* ────────────────────────────────────────────────────────────────────────────
 * The mirror assertion — before anything is sent anywhere
 *
 * Every value this file produced must be a member of the tuple copied from the
 * vocabulary module. It is a cheap check and it is the one that turns a typo in
 * the mapping table above from a `23514` at write time into a refusal at plan
 * time, with nothing written.
 * ──────────────────────────────────────────────────────────────────────────── */

for (const row of planned) {
  if (row.space.category !== null && !TARGET_CATEGORIES.includes(row.space.category)) {
    refuse("mapping_produced_a_stray_value", "a mapped category sits outside its tuple.");
  }
  if (row.space.size_band !== null && !TARGET_SIZE_BANDS.includes(row.space.size_band)) {
    refuse("mapping_produced_a_stray_value", "a mapped band sits outside its tuple.");
  }
  for (const attribute of row.attributes) {
    if (!TARGET_ATTRIBUTE_KEYS.includes(attribute.attribute)) {
      refuse("mapping_produced_a_stray_value", "a mapped key sits outside its tuple.");
    }
    if (!TARGET_ATTRIBUTE_VALUES.includes(attribute.value)) {
      refuse("mapping_produced_a_stray_value", "a mapped value sits outside its tuple.");
    }
  }
}

/* ────────────────────────────────────────────────────────────────────────────
 * Credentials — refused BY NAME when absent, never a silent no-op
 * ──────────────────────────────────────────────────────────────────────────── */

function loadEnvironment() {
  const envFile = join(ROOT, ".env.local");
  if (existsSync(envFile)) {
    try {
      process.loadEnvFile(envFile);
    } catch (error) {
      refuse("env_unreadable", `.env.local exists but could not be parsed: ${error.message}`);
    }
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  const missing = [];
  if (!url) missing.push("NEXT_PUBLIC_SUPABASE_URL");
  if (!serviceKey) missing.push("SUPABASE_SERVICE_ROLE_KEY");

  if (missing.length > 0) {
    refuse(
      "missing_credential",
      `missing environment variable(s): ${missing.join(", ")}. NOTHING WAS WRITTEN. ` +
        "Set them in .env.local (gitignored) or in an environment — a worktree has " +
        "no .env.local of its own, so refusing there would be refusing for a wrong " +
        "reason. This script talks to a single database. It will not invent a " +
        "second way to reach it."
    );
  }

  registerSecret(serviceKey);
  return { url, serviceKey };
}

const credentials = loadEnvironment();

let createClient;
try {
  ({ createClient } = await import("@supabase/supabase-js"));
} catch (error) {
  refuse("client_unavailable", `a database client could not be loaded: ${error.message}`);
}

/**
 * The service-role client. It bypasses every row-level policy.
 *
 * `access-gating.md`, gate *service role*, requires that every new use be
 * justified in writing and that no untrusted input reach it. The justification:
 * the location section's two tables carry **no write policy at all** — plan
 * 45-08 measured ten read arms and zero write arms — so a cookie client is
 * refused for everybody and this is not a preference, it is the only client that
 * can write these rows. The untrusted-input half is answered by there being no
 * HTTP surface: the only input is a file on the machine that holds the key, and
 * the process exits when it is done.
 */
const db = createClient(credentials.url, credentials.serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

/** Logs `error.code` and `error.message`. Never the object, never its third field. */
function describe(error) {
  return `${error?.code ?? "no_code"}: ${error?.message ?? "no message"}`;
}

/* ────────────────────────────────────────────────────────────────────────────
 * Reading what is already there — so a plan means something on a second run
 * ──────────────────────────────────────────────────────────────────────────── */

const formatIdByCode = new Map();
{
  const { data, error } = await db.from("formats").select("id, code");
  if (error) refuse("catalogue_unreadable", `a catalogue could not be read — ${describe(error)}`);
  for (const row of data ?? []) formatIdByCode.set(row.code, row.id);
}

const existingKeys = new Map();
{
  const { data, error } = await db.from("production_space").select("id, source_key");
  if (error) refuse("target_unreadable", `a target could not be read — ${describe(error)}`);
  for (const row of data ?? []) if (row.source_key) existingKeys.set(row.source_key, row.id);
}

const existingAttributePairs = new Set();
{
  const { data, error } = await db.from("production_space_attribute").select("space_id, attribute");
  if (error) refuse("target_unreadable", `a target could not be read — ${describe(error)}`);
  for (const row of data ?? []) existingAttributePairs.add(`${row.space_id}|${row.attribute}`);
}

for (const row of planned) {
  if (row.homeCode && !formatIdByCode.has(row.homeCode)) {
    refusals.unresolved_home_format += 1;
    row.homeCode = null;
  }
}

const rowsToInsert = planned.filter((row) => !existingKeys.has(row.key));
const rowsAlreadyPresent = planned.length - rowsToInsert.length;

let attributesAlreadyPresent = 0;
for (const row of planned) {
  const spaceId = existingKeys.get(row.key);
  if (!spaceId) continue;
  for (const attribute of row.attributes) {
    if (existingAttributePairs.has(`${spaceId}|${attribute.attribute}`)) attributesAlreadyPresent += 1;
  }
}
const attributesToInsert = attributesPlanned - attributesAlreadyPresent;

/* ────────────────────────────────────────────────────────────────────────────
 * The report
 * ──────────────────────────────────────────────────────────────────────────── */

say("");
say("  seed-production-spaces — desk work into a section: single level, single");
say("                           provenance. Nobody has been called.");
say("");
if (options.apply) {
  say("  APPLY — this run writes. It removes nothing; no flag would let it.");
} else {
  say("  DRY RUN — nothing will be written. Pass --apply to write.");
}
say("");
say("  ── what was read ──────────────────────────────────────────────────────");
say("");
say(`    records in snapshot               ${records.length}`);
say(`    records planned                   ${planned.length}`);
say(`    with a location                   ${addressesCarried}`);
say(`    with a headcount                  ${capacitiesCarried}`);
say(`    with a usable remark              ${notesCarried}`);
say("");
say("  ── what would be written ──────────────────────────────────────────────");
say("");
say(`    rows to insert                    ${rowsToInsert.length}`);
say(`    rows already present              ${rowsAlreadyPresent}`);
say(`    qualities to insert               ${attributesToInsert}`);
say(`    qualities already present         ${attributesAlreadyPresent}`);
say("");
say("  ── what is NOT written, by construction ───────────────────────────────");
say("");
say("    Five columns stay out of every payload; no code path names them.");
say("    Reasons, in full, live in this file's header.");
say("");
say("  ── refusals, by reason code ───────────────────────────────────────────");
say("");
for (const code of REASON_CODES) {
  say(`    ${code.padEnd(34)}${refusals[code]}`);
}
say("");
say("    A refused field does not refuse its row. Losing a place loses memory of");
say("    a choice, which is why nothing here is ever removed.");
say("");

/* ────────────────────────────────────────────────────────────────────────────
 * The writes
 * ──────────────────────────────────────────────────────────────────────────── */

if (!options.apply) {
  say("  ── nothing was written ────────────────────────────────────────────────");
  say("");
  const clean = auditOwnOutput();
  say("");
  say(clean ? "  SEED_DRY_RUN_OK" : "  SEED_DRY_RUN_WITH_LEAKED_OUTPUT");
  say("");
  process.exit(clean ? 0 : 1);
}

const CHUNK = 250;
let completedSteps = 0;

async function step(label, run) {
  const { error } = await run();
  if (error) failPartway(label, describe(error), completedSteps);
  completedSteps += 1;
}

/*
 * `ignoreDuplicates` is the `DO NOTHING` of the header's re-runnability note:
 * one atomic statement per batch, keyed on the unique constraint, and a row that
 * is already there is left exactly as somebody last left it.
 */
for (let i = 0; i < rowsToInsert.length; i += CHUNK) {
  const batch = rowsToInsert.slice(i, i + CHUNK).map((row) => ({
    ...row.space,
    home_format_id: row.homeCode ? formatIdByCode.get(row.homeCode) : null,
  }));
  await step("space_insert", () =>
    db.from("production_space").upsert(batch, { onConflict: "source_key", ignoreDuplicates: true })
  );
}

// The identifiers are re-read rather than taken from the write's own response:
// the response is the writer's report, and a row that was already there returns
// nothing at all under `DO NOTHING`.
const idByKey = new Map();
{
  const { data, error } = await db.from("production_space").select("id, source_key");
  if (error) failPartway("identifier_reread", describe(error), completedSteps);
  for (const row of data ?? []) if (row.source_key) idByKey.set(row.source_key, row.id);
}

const attributeRows = [];
for (const row of planned) {
  const spaceId = idByKey.get(row.key);
  if (!spaceId) continue;
  for (const attribute of row.attributes) {
    attributeRows.push({
      space_id: spaceId,
      attribute: attribute.attribute,
      value: attribute.value,
      // Nobody has been called, so every one of these is a hypothesis read off a
      // public profile. There is no branch here and no flag that reaches it.
      provenance: "derived",
    });
  }
}

for (let i = 0; i < attributeRows.length; i += CHUNK) {
  await step("quality_insert", () =>
    db
      .from("production_space_attribute")
      .upsert(attributeRows.slice(i, i + CHUNK), {
        onConflict: "space_id,attribute",
        ignoreDuplicates: true,
      })
  );
}

say("  ── written ────────────────────────────────────────────────────────────");
say("");
say(`    write steps completed             ${completedSteps}`);
say(`    rows offered                      ${rowsToInsert.length}`);
say(`    qualities offered                 ${attributeRows.length}`);
say("");
say("    Counts above come from this script, so they are a report, not a fact.");
say("    A fact is a count taken from a catalogue, by something that is not this");
say("    script: a measure taken with whatever caused an effect is an echo.");
say("");

const clean = auditOwnOutput();
say("");
say(clean ? "  SEED_APPLIED_OK" : "  SEED_APPLIED_WITH_LEAKED_OUTPUT");
say("");
process.exit(clean ? 0 : 1);

/* ────────────────────────────────────────────────────────────────────────────
 * The audit of this run's own output
 *
 * Stricter than the calendar importer's, and deliberately so. That one audits
 * the tokens of parsed titles and four-digit years; this one audits the tokens
 * of every record's NAME and every record's ADDRESS, plus years, plus a street
 * word — because the address field is populated on every record in this archive
 * and 124 of them match a street pattern.
 *
 * There is no exemption list. When it goes red on a coincidence the repair is to
 * SAY LESS, never to widen the rule. A transcript that fails this makes the run
 * report a failure even when every write succeeded: a run that printed an
 * address has already done the harm the column exists to contain.
 * ──────────────────────────────────────────────────────────────────────────── */

function tokensOf(value) {
  return new Set(
    String(value)
      .toLowerCase()
      .split(/[^\p{L}\p{N}]+/u)
      .filter((token) => token.length >= 3)
  );
}

function auditOwnOutput() {
  const residual = new Set();
  for (const record of records) {
    for (const token of tokensOf(record?.n ?? "")) residual.add(token);
    for (const token of tokensOf(record?.z ?? "")) residual.add(token);
  }

  const printedText = transcript.join("\n");
  const printed = tokensOf(printedText);
  const leaked = [...residual].filter((token) => printed.has(token));
  const years = [...printed].filter((token) => /^(19|20)\d{2}$/.test(token));
  const streets = printedText.match(/\b(via|corso|piazza|viale|strada|largo|vicolo|lungo)\b/gi) ?? [];

  say("");
  if (leaked.length === 0 && years.length === 0 && streets.length === 0) {
    say(
      `  ✓ output audit: ${residual.size} residual token(s) from names, locations · ` +
        "0 printed by this run · 0 four-digit years · 0 street words"
    );
    return true;
  }

  // The leaked tokens are NOT printed. Printing them to say they were printed is
  // the whole failure, performed by the check that found it. What IS printed is
  // enough to act on: how many, of which kinds, out of how large a residual set.
  say("  ✗ OUTPUT AUDIT FAILED — this run printed material.");
  if (leaked.length > 0) {
    say(
      `    ${leaked.length} of ${residual.size} residual token(s) occur above. Not listed: ` +
        "printing them to report them would perform a leak."
    );
  }
  if (years.length > 0) {
    say(`    ${years.length} four-digit year(s) occur above.`);
  }
  if (streets.length > 0) {
    say(`    ${streets.length} street word(s) occur above. No such word may ever be`);
    say("    printed by this script.");
  }
  say("    DO NOT PASTE THIS RUN ANYWHERE. Reword output; never widen a rule.");
  return false;
}
