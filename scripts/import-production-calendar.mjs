#!/usr/bin/env node
/**
 * import-production-calendar.mjs — the production calendar, carried from the
 * owner's machine into the database, by hand, printing counts and never a line
 * of the file.
 *
 * WHAT IT DOES, in one sentence: **it reads the newest `.ics` snapshot in
 * `docs/`, drives `src/lib/production/ics/` to parse, classify and reconcile it
 * against what the six production tables already hold, prints the resulting plan
 * of writes as counts, and — only when `--apply` is passed explicitly — performs
 * those writes.**
 *
 * ── ⚠ WHY THIS IS A LOCAL SCRIPT AND NOT AN UPLOAD (D-44-26) ────────────────
 *
 * There is **no upload surface in this product**: no Server Action that accepts
 * a file, no route that receives one, no drag target anywhere. That is a
 * decision, not an omission, and the reason is not convenience.
 *
 * An in-product upload would make the `.ics` **transit a serverless function** —
 * carrying spaces under negotiation, unannounced dates and line-ups into logs,
 * caches, framework error pages and whatever a future exception handler decides
 * to echo. The owner's own flow is *many changes on the Mac, then update the
 * app*, so the upload would buy no convenience while adding that cost. The
 * surface does not exist today, and criterion 2 of this phase exists to keep it
 * from existing.
 *
 * **Where this disagrees with the research, and it does:** `44-RESEARCH.md`
 * §Import Path recommends building the upload **as well as** this script, and
 * weighs it fairly. That document is dated *before* the owner closed the
 * question. The disagreement is written down instead of smoothed over, so the
 * next reader who opens the research is not surprised by an absence and does not
 * "complete" the phase by building the thing it deliberately left out. Where the
 * two differ, the owner's decision wins (`44-UI-SPEC.md` §11.3).
 *
 * ── ⚠ THIS RUN'S OUTPUT IS A PUBLICATION SURFACE ────────────────────────────
 *
 * `docs/` is gitignored and held there by check **F** of
 * `npm run verify:persona`. Everything in it — unannounced dates, spaces under
 * negotiation, line-ups — is material this repository must never publish, and
 * `github.com/edmiribrahimi/Resonate` is public.
 *
 * So the rule is narrower than "be careful": somebody will paste this run into
 * an issue. It prints **counts, digested identifiers and reason codes**, and it
 * prints no title, no date, no venue word, no line-up and **not even the name of
 * the file it read** — that name carries a date. A failure is logged with `error.code`
 * and `error.message` and never with PostgREST's third field, the one that
 * carries the entire rejected row: for `production_plan` that row carries the
 * word for a space. Its name is deliberately not written anywhere in this file,
 * for the reason `src/app/(admin)/admin/formats/actions.ts:58-63` gives about
 * its own forbidden literal — a grep whose only match is the sentence forbidding
 * the thing is a grep that gets ignored the third time it goes red.
 *
 * The last thing the run prints is an audit **of its own transcript**, on the
 * model of check F: no token of a parsed title, and no four-digit year, may
 * appear in what this run said.
 *
 * ── ⚠ RULE: NO RAW IDENTIFIER REACHES THE TRANSCRIPT ───────────────────────
 *
 * **Every line that names a row names it by digest.** No row `id`, no `UID` and
 * no run identifier is ever interpolated verbatim into anything `say()` prints.
 * `printableUid()` below is the only way one becomes printable, and it always
 * answers with `uid#` followed by twelve hexadecimal characters.
 *
 * This is a rule and not a repair, and it is general for a measured reason. A
 * uuid is split at its hyphens into groups of eight, four, four, four and twelve
 * characters; a four-character group made only of digits clears the token filter
 * below and can match the year expression the output audit applies to this run's
 * own transcript. Measured on two hundred thousand random uuids, roughly three
 * in a thousand carry such a group — so a transcript printing several dozen of
 * them fails its own audit about one run in six. **The cause is not a date: it
 * is an identifier that looks like one**, and the audit cannot tell the two
 * apart.
 *
 * **It must not be taught to.** Widening the year rule so that today's
 * identifier passes is what would let tomorrow's real date pass, and this file
 * forbids that in its own words where the audit ends: *"Reword the output; never
 * widen the rule."* The correct answer to a red audit is therefore **another
 * line to rewrite** — never an exemption list, never an extra branch in the
 * expression, never a switch that turns the check off.
 *
 * And a line added to this transcript later — how many rows were cancelled, how
 * many re-linked, how many survived, which calendar a row came from — inherits
 * this rule the moment it is written, not the first time it goes red.
 *
 * The digest costs nothing in traceability: it is `sha256` of the identifier cut
 * to twelve characters, so anybody holding the identifier recomputes it and
 * correlates. It is one token, and a token of twelve hexadecimal characters is
 * never read as a year.
 *
 * ── FOUR THINGS IT CANNOT DO, BY CONSTRUCTION ───────────────────────────────
 *
 *   1. **It writes nothing unless `--apply` is passed.** A dry run is the
 *      DEFAULT. A tool that writes production when invoked with no arguments is
 *      a tool that will one day be invoked with no arguments.
 *   2. **It removes the scope of ONE declared calendar, and nothing outside
 *      it — and a row standing behind an announced night it does not remove at
 *      all.**
 *
 *      This point used to open *it removes nothing, ever*. **That half is now
 *      false**, and it is rewritten here rather than deleted, because the
 *      reason it was true is the reason its replacement has to be narrow. What
 *      comes from the calendar is a MIRROR: it is deleted and written back from
 *      the file, for that calendar. The **only** condition that selects is the
 *      declared calendar key, and the direction of the mistake is why — a wide
 *      selector that is wrong deletes MORE, a narrow one that is wrong finds
 *      nothing. This repository has already paid for the first direction once.
 *
 *      **The second half of the old sentence stands, word for word.** A plan
 *      row already standing behind an announced night survives
 *      unconditionally, whatever the file says, because removing it would
 *      orphan a night with tickets on sale (`ICS-03b`, D-58-02). And a partial
 *      export or the wrong file must still not wipe the archive — that is now
 *      the feed guard's job (`ICS-10`) rather than an absence stamp's, because
 *      under a mirror an entry the file no longer carries is not *absent*: it
 *      is not there.
 *   3. **It never touches the announced-night table** — `event_parties`, named
 *      here once, in the sentence forbidding it, and nowhere else. Announcing a
 *      night is a separate, deliberate act (D-44-06), and that single bridge is
 *      what makes renumbering structurally impossible rather than merely
 *      forbidden.
 *   4. **It never generates a progressivo — and the SECOND LAYER moved into
 *      this file, which is a cost and not an improvement.**
 *
 *      The first half is unchanged and stays absolute: no counter, no
 *      arithmetic on a stored number, no query for the highest one. A number is
 *      read from the file or it does not exist.
 *
 *      The second half is where D-58-01 changed the world. The trigger
 *      `refuse_production_plan_renumber` is `BEFORE UPDATE OF number`, and **a
 *      mirror never performs an `UPDATE` of that column**: it deletes the row
 *      and inserts a new one. The third one-way switch of this project would
 *      therefore have stopped existing for this path without a single line of
 *      SQL saying so. In its place, and BEFORE anything is deleted, this script
 *      holds the progressivi that arrive against the ones it just read: a
 *      `source_uid` already known that comes back with a different number makes
 *      the whole run REFUSE, exit `2`, and write nothing (`ICS-01b`).
 *
 *      ⚠ **The cost is declared rather than hidden.** The protection now lives
 *      in application code — precisely where that trigger's own comment says a
 *      guard *does not survive the caller that forgot it*. It is the only place
 *      left for it to live, and D-58-01 is the dated, written authorisation
 *      `meta-gates.md` requires for weakening a monotone guard. The trigger
 *      **stays installed** and still defends every other writer.
 *
 *      A renumbering somebody actually wants goes through an explicit
 *      re-authorisation argument, and the re-authorisation is recorded in the
 *      report: a progressivo is already on a poster.
 *
 * ── THE ALIAS MAP IS READ FROM THE DATABASE, NEVER FROM SOURCE ──────────────
 *
 * A piece names a series code; a night names a format word and sometimes a venue
 * word, and nothing computes one from the other — the mapping is an
 * abbreviation, declared by somebody who knows both halves. It lives in
 * `party_series.ics_alias`, behind row-level security, **because its values are
 * words for spaces**, and a space that has not been acquired in writing is not
 * named in a public repository (`venue-acquisition.md`; D-44-04).
 *
 * So when a night's word resolves to nothing, this script prints the count and
 * the repair — *set the alias on the series row, in the database* — and **does
 * not guess**. Writing the pair into this file would be the publication the
 * column exists to prevent.
 *
 * ── WHAT A GREEN DOES NOT MEAN (cosa un verde NON significa) ────────────────
 *
 *   - A successful `--apply` says **rows were written**. It does not say they
 *     are the right rows. Whether the file's dates sit where the pipeline rules
 *     say they would is `npm run verify:ics`'s claim about the file; whether the
 *     surface reads them honestly is a person's judgement, in plan 44-13.
 *   - A dry run printing an empty plan after an import is the strongest
 *     automated evidence criterion 5 gets, and it is evidence about **one file
 *     on one day**, not a property of the reader.
 *   - There is no test runner in this repository (`CLAUDE.md` Guardrail 1).
 *     Nothing here is a test and nothing here may be described as one.
 *   - The output audit proves the transcript of THIS RUN. It cannot prove that a
 *     future edit will not print a title, and it cannot see what a person types
 *     into an issue beside the output.
 *
 * ── ⚠ A CONFLICT BETWEEN TWO DOCUMENTS, RESOLVED THE RESTRICTIVE WAY ────────
 *
 * `20260815120000_production_calendar.sql:608-611` says **a dry run is a real
 * row**: the import can produce its plan without applying it, and that run is
 * recorded as one, so that the evidence somebody checked before writing is not
 * merely their memory of having checked. Plan 44-10 says **a dry run writes
 * nothing**.
 *
 * The two cannot both hold, and `meta-gates.md` settles it: where two gates
 * produce contradictory requirements the more restrictive wins, and the conflict
 * gets written down instead of quietly picked. **A dry run here opens no
 * transaction and inserts no run row.** The cost is exact and is not hidden: the
 * `dry_run` column has no writer today, so the table records only applied runs.
 * Reversing this is a one-line decision for the owner, and it is logged in
 * `deferred-items.md` rather than left for somebody to discover from an empty
 * column.
 *
 * ── ⚠ `import:calendar` IS NOT A `verify:*` ENTRY, AND MUST NEVER BECOME ONE ─
 *
 * `scripts/verify-all.mjs:319` collects the gates it runs by taking every
 * `package.json` script whose name begins with the verification prefix, so a
 * name outside that prefix is invisible to the aggregate — which is exactly the
 * property wanted here. **This script writes.** A gate is something a person
 * runs to find out whether the tree is sound; a writer is something a person
 * runs having decided to change production. Putting a writer in an aggregate
 * that a build, a hook or a habit invokes is how a decision becomes an accident,
 * and the aggregate would then be unable to claim what its own header claims.
 *
 * That is also why this script's name is not written into that file at all: a
 * name mentioned in a list is one edit away from being a name in the list.
 *
 * ── ⚠ THE ORDER OF THE REFUSALS IS A CONTRACT, NOT A STYLE ─────────────────
 *
 * `scripts/verify-mirror-guards.mjs` (plan 58-01) was written **before** this
 * code and fixes the order the checks run in. It is not a preference:
 *
 *      1. the arguments            — a flag that does not exist, or two that
 *                                    contradict each other
 *      2. the calendar key         — absent → `missing_calendar_key`;
 *                                    outside the closed vocabulary →
 *                                    `unknown_calendar_key`
 *      3. the registered source    — no address registered for that key →
 *                                    `missing_feed_source`
 *      4. the database credentials
 *
 * With the credentials first — which is where they used to be — all three of
 * the cases above answer `missing_credential`, and the gate stops measuring
 * what it says it measures.
 *
 * ⚠ **And the second half of the contract, without which case 3 stops being
 * hermetic: the environment FILE on disk is read INSIDE step 4, never at the
 * top.** Read at the top, case 3 would say different things on different
 * machines — green where an address happens to be configured locally, red
 * everywhere else. A check whose verdict depends on what is on the launcher's
 * disk is not a check, it is a survey. The registered source is therefore
 * looked up in the PROCESS ENVIRONMENT only, which is also where D-58-05 says
 * it must live: on the deployment platform, never in a file in this tree.
 *
 * ── ARGUMENTS ───────────────────────────────────────────────────────────────
 *
 *   `--dry-run`         print the plan and write nothing. **THE DEFAULT.**
 *   `--apply`           perform the writes. Must be passed explicitly.
 *   `--calendar <key>`  WHICH CALENDAR this run mirrors. **Required, always,
 *                       and there is no default** — it is the single condition
 *                       of every `DELETE` below, and a default is exactly the
 *                       step somebody eventually skips. Validated against the
 *                       closed vocabulary the database also holds as a `CHECK`.
 *   `--file <path>`     one snapshot, by path. Overrides the search.
 *   `--docs-dir <dir>`  where to search for the newest `.ics`. Defaults to
 *                       `docs/` beside this repository. The directory name
 *                       carries no date; a snapshot's file name does, which is
 *                       why the search prints neither.
 *   `--reauthorise-renumbering`
 *                       allow a known entry to come back with a different
 *                       progressivo. Without it, that is a refusal. Its use is
 *                       recorded in the report, because a progressivo is
 *                       already on a poster.
 *   `--adopt-unkeyed-rows`
 *                       ONE-OFF. The rows written before the calendar key
 *                       existed carry none, so no mirror can see them. This
 *                       gives them the declared key before the deletion runs,
 *                       and reports how many it took. Without it a key-less row
 *                       is not touched at all, which is the safe direction.
 *   `--help`
 *
 * ── EXIT CODES ──────────────────────────────────────────────────────────────
 *
 *   `0` the run completed AND its own output audit came back clean · `1` the run
 *   FAILED partway, and what it had already written stays written and is
 *   reported — **or** it reached the end and the output audit found material in
 *   its transcript · `2` REFUSED, and **nothing was written**.
 *
 *   A refusal is not a failure: it means the import did not happen. Every
 *   refusal names its category, because "something went wrong" with no name is
 *   the silent failure `meta-gates.md` forbids, and this product has no error
 *   tracking to catch it (`CLAUDE.md`, zero-silent-failures).
 *
 *   ⚠ A FAILED OUTPUT AUDIT NEVER EXITS `0`, and the last line printed says which
 *   of the two endings this was: `IMPORT_DRY_RUN_OK` / `IMPORT_APPLIED_OK`, or
 *   `IMPORT_DRY_RUN_WITH_LEAKED_OUTPUT` / `IMPORT_APPLIED_WITH_LEAKED_OUTPUT`.
 *   It is `1` and not `2` on the applied path because `2` means nothing was
 *   written, and on that path the writes have already happened: the material
 *   leaked, the import did not fail. On a refusal or a partway failure the exit
 *   is already non-zero and keeps its own category — the audit runs there too and
 *   its verdict is printed, but it does not overwrite a code that already says
 *   more.
 */

import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { registerHooks } from "node:module";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const ICS_DIR = join(ROOT, "src", "lib", "production", "ics");

/**
 * The largest number of occurrences one recurring commitment may expand into.
 *
 * The caller owns this bound so that a rule written in a file never decides how
 * much work this process does. It matches the figure `scripts/verify-ics-import.mjs`
 * uses, so that the two agree about the same file for the same reason.
 */
const RECURRENCE_OCCURRENCE_CAP = 200;

/* ────────────────────────────────────────────────────────────────────────────
 * Secrecy — the two kinds, and they are different problems
 *
 * A SECRET must never be printed: the shape is `scripts/rls-baseline.mjs:157-177`,
 * one list every printed string passes through. It is defence in depth and not
 * the primary control — the primary control is that no path prints one — and it
 * exists because an API error body is written by somebody else and can echo back
 * what it was sent.
 *
 * MATERIAL must never be printed either, but it cannot be redacted the same way:
 * it is not a fixed list, it is every word of every title. That one is handled at
 * the end, by auditing the transcript.
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
 * True once the file has been parsed, which is the moment the output audit at
 * the bottom becomes able to run.
 *
 * It exists because **a refusal is an exit like any other**, and several of them
 * happen after the file has been read. An audit that only ran on the two happy
 * paths would be absent from exactly the exits somebody is most likely to paste
 * into an issue, which is where the leak would be.
 */
let auditReady = false;

/**
 * A refusal. **Nothing was written**, and the category is part of the sentence.
 *
 * Exit 2 and not 1, for the reason `rls-baseline.mjs:195-197` gives: nothing was
 * measured, so nothing failed. For an import the equivalent sentence is the one
 * printed here.
 */
function refuse(category, message) {
  say("");
  say(`  REFUSED [${category}] — ${redact(message)}`);
  say("");
  say("  NOTHING WAS WRITTEN. The import did not happen; this is not an empty plan.");
  if (auditReady) auditOwnOutput();
  say("");
  process.exit(2);
}

/**
 * A failure partway through the writes.
 *
 * Exit 1, and the message says what had already been written, because an import
 * that quietly did half its job and one a person can see did half its job are
 * different things — the migration says so at `:558-562`.
 *
 * ⚠ **The advice this used to print is gone, and it was wrong under a mirror.**
 * It told the reader to go round again as a dry run first, on the argument that
 * the reconciler was keyed on the file's own identifiers and so a second pass
 * would plan only the part the first had not finished. *(The sentence is
 * described rather than quoted: a grep whose only match is the line saying the
 * line is gone is a grep that gets ignored.)*
 *
 * Under a mirror "partway" no longer means *some rows corrected*: it can mean
 * **the calendar removed and not written back**, and a second pass plans
 * everything because there is nothing left to compare against. There is no
 * transaction across that gap and no point-in-time recovery in this project.
 *
 * So the only honest thing to print is the way back in, and there is exactly
 * one: **`P-58-C`**, in this phase's procedures. Its first step is *do not
 * re-run*.
 */
function failPartway(category, message, written) {
  say("");
  say(`  FAILED [${category}] — ${redact(message)}`);
  say("");
  say(`  ⚠ ${written} write step(s) had already completed and STAY WRITTEN.`);
  say("    A mirror that stops partway can have removed a calendar and not put it");
  say("    back. There is no transaction across that gap and no point-in-time");
  say("    recovery here, so DO NOT re-run: follow P-58-C, the recovery procedure");
  say("    in this phase's procedures. Its first step is not re-running.");
  if (auditReady) auditOwnOutput();
  say("");
  process.exit(1);
}

/* ────────────────────────────────────────────────────────────────────────────
 * Arguments — and the default is the safe one
 * ──────────────────────────────────────────────────────────────────────────── */

function parseArguments(argv) {
  const options = {
    apply: false,
    dryRunAsked: false,
    /**
     * WHICH CALENDAR. `null` until somebody says so — see the refusal order in
     * this file's header. There is deliberately no fallback of any kind here:
     * the value ends up as the single condition of four `DELETE` statements.
     */
    calendar: null,
    file: null,
    docsDir: null,
    reauthoriseRenumbering: false,
    adoptUnkeyedRows: false,
    help: false,
  };
  const unknown = [];

  for (let i = 0; i < argv.length; i += 1) {
    const argument = argv[i];
    if (argument === "--apply") options.apply = true;
    // `--dry-run` is recorded rather than acted on, because it is already the
    // default. What it is FOR is the case below: passed together with `--apply`
    // it makes the invocation ambiguous, and the two orders of the same pair
    // must not mean two different things.
    else if (argument === "--dry-run") options.dryRunAsked = true;
    else if (argument === "--help" || argument === "-h") options.help = true;
    else if (argument === "--reauthorise-renumbering") options.reauthoriseRenumbering = true;
    else if (argument === "--adopt-unkeyed-rows") options.adoptUnkeyedRows = true;
    else if (argument === "--calendar") {
      i += 1;
      options.calendar = argv[i] ?? null;
    } else if (argument === "--file") {
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
 * The output audit at the bottom went red on the first run of this script, and
 * it went red on a run that leaked nothing: **one ordinary word this script had
 * reason to print also occurs inside an entry title.** That is the coincidence
 * `scripts/verify-ics-import.mjs:127-147` predicts, and its repair travels
 * unchanged — *say less*, never exempt, never widen. A passing line does not need
 * a directory name or a table name that the header already carries.
 *
 * So: no printed line below names this script, the module directory it drives, or
 * the tables by their own names. The comments name all three, because comments
 * are not printed. If a future edit reintroduces one of those words into a
 * printed string, the audit goes red again — which is the point of it being
 * absolute.
 */

say("");
say("calendar import — into the six tables, in counts");
say("");

if (options.help) {
  say("  --dry-run          print the plan and write nothing. THE DEFAULT.");
  say("  --apply            perform the writes. Must be passed explicitly.");
  say("  --calendar <key>   WHICH calendar this run mirrors. REQUIRED, no default.");
  say("  --file <path>      one snapshot, by path.");
  say("  --docs-dir <dir>   where to search for the newest snapshot.");
  say("  --reauthorise-renumbering");
  say("                     allow a known entry back with a different progressivo.");
  say("  --adopt-unkeyed-rows");
  say("                     ONE-OFF: give the declared key to the rows that predate it.");
  say("");
  say("  0 = completed · 1 = FAILED partway · 2 = REFUSED, nothing was written.");
  say("");
  process.exit(0);
}

if (unknown.length > 0) {
  // Named, not ignored. A misspelt `--aply` silently ignored is a run somebody
  // believes wrote and did not, or believes did not write and did.
  refuse(
    "unknown_argument",
    `${unknown.length} argument(s) this script does not accept. It refuses rather ` +
      "than ignoring them: a misspelt flag silently dropped is a run whose mode " +
      "nobody actually chose."
  );
}

if (options.apply && options.dryRunAsked) {
  refuse(
    "ambiguous_mode",
    "--apply and --dry-run were both passed. Which one wins would depend on the " +
      "order they were typed in, and a flag whose meaning depends on where it sits " +
      "in a line is a flag that will one day write production by accident."
  );
}

// The mode is stated BEFORE anything else happens, so that a scrollback read
// later cannot be ambiguous about which run it was.
if (options.apply) {
  say("  MODE: --apply  ⚠ THIS RUN WRITES to the six tables.");
} else {
  say("  MODE: dry run (the default). NOTHING WILL BE WRITTEN.");
}
say("");
/* ────────────────────────────────────────────────────────────────────────────
 * The module — read, never re-implemented
 *
 * Node resolves nothing extensionless and the bundler does, so the hook appends
 * `.ts` for a relative specifier naming a file on disk and defers everything
 * else. It changes how the modules are FOUND, never what they DO — which is the
 * property that lets this script drive the same code the product imports, rather
 * than a second reader that agrees with it today.
 *
 * ⚠ **This block sits BEFORE the credentials now, and the move is the refusal
 * order of this file's header.** The calendar key has to be checked against the
 * closed vocabulary, that vocabulary is exported by the module, and step 2 comes
 * before step 4. Nothing is lost by moving it: every module behind this barrel
 * is pure — no client, no filesystem, no clock — so importing it reads nothing
 * and reaches nothing.
 * ──────────────────────────────────────────────────────────────────────────── */

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

// Node warns once, on stderr, that `package.json` declares no module type and
// the `.ts` files had to be re-parsed as ESM. It is about this script's loader
// and says nothing about the tree, so it is dropped and every other warning is
// left exactly where it was.
//
// ⚠ It is matched on `code` AND on `name`. `scripts/verify-ics-import.mjs:352-357`
// tests `warning.name` alone, and on Node 25 that filter does not fire: the
// string is the warning's CODE, and its name is the generic one. The analog is
// left alone — this is a note about it, not a change to it — but a filter copied
// verbatim would have been a filter that silently does nothing, which is the
// shape this repository keeps writing down.
const SUPPRESSED_WARNING = "MODULE_TYPELESS_PACKAGE_JSON";
const defaultWarningListeners = process.listeners("warning");
process.removeAllListeners("warning");
process.on("warning", (warning) => {
  if (warning.code === SUPPRESSED_WARNING || warning.name === SUPPRESSED_WARNING) return;
  for (const listener of defaultWarningListeners) listener(warning);
});

let ics;
try {
  ics = await import(join(ICS_DIR, "index.ts"));
} catch (error) {
  // The message names no path, for the reason stated above the banner: the
  // directory's own name is an ordinary word that occurs in an entry title. The
  // header says where it is; a refusal does not need to.
  refuse(
    "reader_unavailable",
    `the shared calendar reader could not be imported: ${error.message}. This ` +
      "script drives that module rather than re-implementing it."
  );
}


/* ────────────────────────────────────────────────────────────────────────────
 * Gate 1 — WHICH CALENDAR, validated against the closed vocabulary
 *
 * ⚠ **This is the most consequential argument this script takes**, because the
 * value ends up as the single condition of four `DELETE` statements. So it is
 * checked against the vocabulary the module exports — the same three words the
 * database holds as a `CHECK` — **before it can reach a query**, and a value
 * outside it is a refusal rather than a filter applied later.
 *
 * **No default, ever.** A default is exactly the step somebody eventually skips,
 * and on this argument skipping it means mirroring the wrong calendar: deleting
 * one and leaving the other written twice.
 *
 * The refusal names the argument and the three admissible keys, and it may:
 * they come from the format sigle, which are printed on materials, and D-58-06
 * closes the vocabulary with the rule that no key may ever name a space.
 * ──────────────────────────────────────────────────────────────────────────── */

if (options.calendar === null) {
  refuse(
    "missing_calendar_key",
    "no --calendar was given. This run would have to know which calendar it is " +
      "mirroring before it could remove anything, and there is deliberately no " +
      `default. Pass --calendar with one of: ${ics.CALENDAR_KEYS.join(", ")}.`
  );
}

if (!ics.CALENDAR_KEYS.includes(options.calendar)) {
  // The value the caller typed is NOT echoed. It is a free-form string from
  // outside this process, it is about to be reported as bad, and echoing it
  // would put somebody else's text into a transcript this file promises to keep
  // clean. The three good answers are enough to act on.
  refuse(
    "unknown_calendar_key",
    "the value given to --calendar is not one of the three keys this project " +
      `declares. The vocabulary is closed and is: ${ics.CALENDAR_KEYS.join(", ")}. ` +
      "Adding a calendar is a declared migration, never a free value — because " +
      "this argument becomes the condition of a removal."
  );
}

/** The declared scope of this run. From here down it is never re-derived. */
const calendarKey = options.calendar;

say(`  CALENDAR: ${calendarKey} — the single condition of every removal below.`);
say("");

/* ────────────────────────────────────────────────────────────────────────────
 * Gate 2 — the registered source for that calendar
 *
 * ⚠ **Read from the PROCESS ENVIRONMENT ONLY, never from a file on disk**, and
 * that is the second half of the refusal-order contract in this file's header.
 * A source resolved from `.env.local` would make this gate answer differently on
 * different machines, which turns a check into a survey.
 *
 * It is also where D-58-05 puts it: a published calendar link is readable by
 * anybody holding it and carries unannounced dates, spaces under negotiation and
 * line-ups, so it lives in a deployment-platform variable — never in this tree,
 * never in `.planning/`, never in a report and never in a log.
 *
 * **What this gate does today, and what it deliberately does not.** It asserts
 * that a source is REGISTERED for the declared key, and registers the value as a
 * secret so no line can print it. **Fetching from it is plan 58-10's** (`ICS-09`
 * / `ICS-10`, with the feed guard). Until then the bytes still come from a file
 * on disk, and the report says so rather than letting a reader assume otherwise.
 *
 * ⚠ **`--file` does not bypass this.** The file argument says where the bytes
 * come from; the registration says that this deployment mirrors this calendar at
 * all. A key nobody registered is a key naming a calendar this deployment does
 * not own, and running a removal for it is the failure the whole gate exists
 * against.
 * ──────────────────────────────────────────────────────────────────────────── */

/**
 * The environment variable that registers the address of one calendar.
 *
 * The NAME is derived from the key, which is public; the VALUE never is. There
 * is no map literal here on purpose: a map would be a second spelling of the
 * closed vocabulary, and two spellings of one fact are how the two start to
 * differ.
 */
function feedSourceVariable(key) {
  return `PRODUCTION_CALENDAR_FEED_${key.toUpperCase()}`;
}

const feedSourceVariableName = feedSourceVariable(calendarKey);
const feedSource = process.env[feedSourceVariableName] ?? null;

if (feedSource === null || feedSource.trim() === "") {
  refuse(
    "missing_feed_source",
    `no source is registered for this calendar. Set ${feedSourceVariableName} in the ` +
      "environment of whatever runs this — never in a file in this tree, and never " +
      "in a tracked document: the address is readable by anybody holding it and " +
      "the calendar behind it carries unannounced dates, spaces under negotiation " +
      "and line-ups."
  );
}

// Registered before anything else can print: the address is a secret in the
// exact sense this file's redaction list means, and an error body written by
// somebody else can echo back what it was sent.
registerSecret(feedSource);
say("  ✓ a source is registered for this calendar (never printed, redacted everywhere)");
say("    ⚠ reading FROM it is plan 58-10's. This run still takes its bytes from disk.");
say("");

/* ────────────────────────────────────────────────────────────────────────────
 * Gate 3 — credentials, BEFORE the file is opened
 *
 * ⚠ **Third now, and it used to be first.** The move is the refusal order this
 * file's header states and `scripts/verify-mirror-guards.mjs` fixes: with the
 * credentials first, all three cases above answer `missing_credential` and the
 * gate measures the wrong thing.
 *
 * It still comes before the material. A refusal that has already read the
 * material is a refusal that did work it did not need to do, and the discipline
 * this script is asked for is *never a partial run*: if the run cannot finish,
 * it does not start.
 *
 * ⚠ **The environment FILE is read INSIDE this function**, never at the top of
 * the script. That is the second half of the contract: read at the top, gate 2's
 * verdict would depend on what happens to be on the launcher's disk.
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
      `missing environment variable(s): ${missing.join(", ")}. Set them in ` +
        ".env.local (gitignored) or in the environment. This script talks to one " +
        "database and will not invent a second way to reach it."
    );
  }

  registerSecret(serviceKey);
  try {
    registerSecret(new URL(url).hostname.split(".")[0]);
  } catch {
    refuse("bad_credential", "NEXT_PUBLIC_SUPABASE_URL is not a URL.");
  }
  registerSecret(url);

  return { url, serviceKey };
}

const credentials = loadEnvironment();
say("  ✓ credentials present (never printed, and redacted from every line above and below)");

/* ────────────────────────────────────────────────────────────────────────────
 * Gate 4 — the material
 * ──────────────────────────────────────────────────────────────────────────── */

/**
 * The newest `.ics` snapshot, or `null`.
 *
 * The **path is returned and never printed**: a snapshot is named after the day
 * it was taken, so its file name is a date, and a date is the first thing this
 * script may not say out loud.
 */
function findMaterial(docsDir) {
  if (!existsSync(docsDir) || !statSync(docsDir).isDirectory()) return null;

  const snapshots = readdirSync(docsDir)
    .filter((name) => name.toLowerCase().endsWith(".ics"))
    .sort();

  if (snapshots.length === 0) return null;
  return join(docsDir, snapshots[snapshots.length - 1]);
}

const docsDir = options.docsDir ?? join(ROOT, "docs");
let materialPath = options.file;

if (materialPath === null) {
  materialPath = findMaterial(docsDir);
  if (materialPath === null) {
    refuse(
      "no_material",
      "the snapshot directory holds no .ics file. That directory is gitignored, is " +
        "never deployed and is never cloned, so the calendar lives only on the " +
        "owner's machine — which makes this the expected state everywhere else. " +
        "Pass --file or --docs-dir to point at it."
    );
  }
} else if (!existsSync(materialPath)) {
  refuse("no_material", "the path given to --file does not exist.");
}

/* ────────────────────────────────────────────────────────────────────────────
 * Stage 1 — the file: bounds, then parse
 *
 * The bounds are asserted BEFORE parsing, against the two the parser itself
 * declares, so that a file which is not this file refuses instead of producing a
 * plan somebody might apply.
 * ──────────────────────────────────────────────────────────────────────────── */

const text = readFileSync(materialPath, "utf8");
const byteSize = Buffer.byteLength(text, "utf8");
const physicalLineCount = text.split(/\r?\n/).length;

if (byteSize > ics.MAX_INPUT_BYTES) {
  refuse(
    "input_too_large",
    `the snapshot is larger than the ${ics.MAX_INPUT_BYTES}-byte bound the parser ` +
      "declares. A file that size is not this calendar."
  );
}
if (physicalLineCount > ics.MAX_INPUT_LINES) {
  refuse(
    "input_too_long",
    `the snapshot carries more than the ${ics.MAX_INPUT_LINES}-line bound the parser ` +
      "declares."
  );
}

const parsed = ics.parseIcs(text);

if (parsed.refusal !== null) {
  refuse("parse_refused", `the parser refused the input: ${parsed.refusal.reason}`);
}

// From here on, every exit — refusal, failure or success — is audited.
auditReady = true;

const distinctUids = new Set(parsed.events.map((event) => event.uid)).size;

say("");
say("  ── the file ──────────────────────────────────────────────────────────");
say(
  `     ${byteSize} bytes · ${parsed.events.length} entries · ${distinctUids} distinct UIDs · ` +
    `${parsed.malformed.length} malformed line(s)`
);
say(
  `     ${parsed.unsupportedRecurrences.length} unsupported recurrence(s) · ` +
    `${parsed.refusedProperties.length} refused propert(y/ies)`
);

if (distinctUids !== parsed.events.length) {
  // Not fatal, and not silent either. The reconciler is keyed on the UID, so two
  // entries sharing one would make the second overwrite the first — reported as
  // a count here, because which two is a question for the calendar, not for this
  // script.
  say(
    `     ⚠ ${parsed.events.length - distinctUids} entr(y/ies) share a UID with another. ` +
      "The reconciler is keyed on that UID."
  );
}

/* ────────────────────────────────────────────────────────────────────────────
 * Identifiers — and the guard that decides whether one may be printed
 *
 * A `UID` is normally opaque: a uuid, or a random string with a domain on the
 * end, and it names nothing to anybody outside the file. But nothing in RFC 5545
 * says so, and some applications derive a UID from the entry's own summary — at
 * which point printing "just the identifier" prints the title.
 *
 * So no identifier goes out as it stands: **every one is printed as a digest**.
 * That was once conditional — a UID measured to carry a word of a parsed title
 * was digested, every other one went out whole — and the conditional left the
 * other half of the problem standing. An opaque uuid carries no title, but it
 * can carry a group of four digits that this run's own output audit reads as a
 * year, and the run then fails on its own identifier. Both halves close the same
 * way, so the digest is unconditional. The repair is never an exemption list —
 * that is the argument `scripts/verify-ics-import.mjs:127-147` makes and it
 * travels unchanged.
 *
 * The title measurement stays even though it no longer decides anything: it is
 * reported as a count, because a UID carrying a title word is a fact about the
 * FILE, and dropping a finding because the printing decision moved would be
 * losing it rather than simplifying it.
 * ──────────────────────────────────────────────────────────────────────────── */

function tokensOf(value) {
  return new Set(
    String(value)
      .toLowerCase()
      .split(/[^\p{L}\p{N}]+/u)
      .filter((token) => token.length >= 3)
  );
}

const titleTokens = new Set();
for (const event of parsed.events) {
  for (const token of tokensOf(event.summary)) titleTokens.add(token);
}

/**
 * How many identifiers this run printed — **all of them**, since every one is
 * digested.
 *
 * It counted something else before: how many times a verbatim UID had to be
 * hidden because it carried a word of an entry title. The digest is now
 * unconditional, so that is no longer what the number means, and a counter whose
 * name outlives its meaning is a number the next reader reads as the old one.
 */
let printedIdentifiers = 0;

/**
 * How many of those identifiers carry a word of a parsed title.
 *
 * It changes nothing about what gets printed — the digest is unconditional — and
 * it is kept because it is the one thing the substitution used to say about the
 * FILE: some applications derive a UID from the entry's own summary, and knowing
 * that this file's do is worth a count that names nothing.
 */
let identifiersCarryingATitleWord = 0;

/**
 * The sigle this file uses, filled in once the entries have been classified.
 *
 * Declared here, and with `let`, because the output audit reads it and the audit
 * now runs on refusals too — several of which happen before classification. An
 * empty list there is the conservative direction: it strips fewer words as
 * already-public and therefore looks for more of them in the transcript.
 */
let siglaInFile = [];

/**
 * The only printable form of any identifier: a stable digest of it.
 *
 * ⚠ There is no branch that returns the argument. That is the point — see the
 * rule in this file's header. A caller wanting the value verbatim does not have
 * one here, and must not add one.
 */
function printableUid(uid) {
  printedIdentifiers += 1;
  if ([...tokensOf(uid)].some((token) => titleTokens.has(token))) {
    identifiersCarryingATitleWord += 1;
  }
  return `uid#${createHash("sha256").update(String(uid)).digest("hex").slice(0, 12)}`;
}

/* ────────────────────────────────────────────────────────────────────────────
 * Stage 2 — the catalogue, read from the database
 * ──────────────────────────────────────────────────────────────────────────── */

let createClient;
try {
  ({ createClient } = await import("@supabase/supabase-js"));
} catch (error) {
  refuse(
    "client_unavailable",
    `@supabase/supabase-js could not be imported: ${error.message}. Run npm install ` +
      "in this checkout — this script installs nothing."
  );
}

/**
 * The service-role client. It bypasses every row-level policy.
 *
 * `access-gating.md`, gate *service role*, requires that every new use be
 * justified in writing and that no untrusted input reach it. The justification:
 * the six production tables carry **no write policy at all** (D-44-22), exactly
 * as the catalogue tables do not (`formats/actions.ts:17-22`), so a cookie
 * client is refused for everybody and this is not a preference — it is the only
 * client that can write these rows. The untrusted-input half is answered by
 * there being no HTTP surface: the only input is a file on the machine that
 * holds the key, and the process exits when it is done.
 */
const db = createClient(credentials.url, credentials.serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

/** Logs `error.code` and `error.message`. Never the object, never its third field. */
function describe(error) {
  return `${error?.code ?? "no_code"}: ${error?.message ?? "no message"}`;
}

/**
 * One read, and a **label** that is not the table's own name.
 *
 * The label exists for one reason and it is worth stating rather than looking
 * arbitrary: every one of the six tables is named with a prefix that is also an
 * ordinary word inside an entry title, so a refusal quoting the table verbatim
 * fails the output audit on a run that leaked nothing. There is exactly one
 * table behind each label, they are listed at every call site in code, and a
 * person debugging has the code open. Diagnostics lose nothing; the audit stays
 * absolute.
 */
async function readAll(table, columns, label) {
  const { data, error } = await db.from(table).select(columns);
  if (error) {
    refuse("catalogue_unreadable", `reading the ${label} failed — ${describe(error)}`);
  }
  return data ?? [];
}

const formats = await readAll("formats", "id, code, name", "format catalogue");
const series = await readAll(
  "party_series",
  "id, format_id, code, name, ics_alias",
  "series catalogue"
);
const pipelineRuleRows = await readAll(
  "production_pipeline_rule",
  "format_id, series_id, piece_kind, anchor_kind, anchor_weekday, anchor_direction, derivable, episodes_from_lineup, episode_count",
  "pipeline rules"
);

const formatById = new Map(formats.map((row) => [row.id, row]));

/**
 * The sigla a series is written as, composed from the two halves that exist.
 *
 * Two shapes occur, and both are in `production-calendar.md`: a format-level
 * sigla (`RSNT`) and a per-venue one (`RMDB-BZ`). The composition never invents:
 * a series whose own code already begins with its format's is taken as written,
 * so that a catalogue which stores the whole sigla in one column and one which
 * stores the halves both arrive at the same string.
 *
 * When the result names a series the file does not use, nothing happens. When
 * the file uses a code this composition never produces, the reconciler reports
 * it in `seriesWithoutRules` — loudly, because a night whose series owns no rule
 * would otherwise draw an empty checklist that looks finished.
 */
function composeSigla(formatCode, seriesCode) {
  if (!seriesCode) return formatCode;
  if (seriesCode === formatCode) return formatCode;
  if (seriesCode.startsWith(`${formatCode}-`)) return seriesCode;
  return `${formatCode}-${seriesCode}`;
}

const siglaBySeriesId = new Map();
const catalogueBySigla = new Map();
const aliases = new Map();
let seriesWithAlias = 0;

for (const row of series) {
  const format = formatById.get(row.format_id);
  if (format === undefined) continue;
  const sigla = composeSigla(format.code, row.code);
  siglaBySeriesId.set(row.id, sigla);
  catalogueBySigla.set(sigla, { seriesId: row.id, formatId: format.id });

  // The map the classifier joins on. Read here, never declared: its values are
  // words for spaces. Lower-cased on both sides so that a word written one way
  // in the calendar and another in the catalogue still joins.
  if (typeof row.ics_alias === "string" && row.ics_alias.trim() !== "") {
    aliases.set(row.ics_alias.trim().toLowerCase(), sigla);
    seriesWithAlias += 1;
  }
}

// A format-level sigla with no series row of its own still needs to resolve, or
// every night of the format is unclassified for a reason that is not the file's.
for (const format of formats) {
  if (!catalogueBySigla.has(format.code)) {
    catalogueBySigla.set(format.code, { seriesId: null, formatId: format.id });
  }
}

say("");
say("  ── the catalogue ─────────────────────────────────────────────────────");
say(
  `     ${formats.length} format(s) · ${series.length} series · ` +
    `${seriesWithAlias} series carrying an ics_alias · ${pipelineRuleRows.length} pipeline rule(s)`
);

if (seriesWithAlias === 0) {
  say(
    "     ⚠ NO series carries an ics_alias. Every night will be unclassified for " +
      "that reason alone, which is a configuration gap and not a property of the file."
  );
}

/** The rules of one series: the format-level default, then the series override. */
function rulesForSigla(sigla) {
  const entry = catalogueBySigla.get(sigla);
  if (entry === undefined) return [];

  const merged = new Map();
  for (const row of pipelineRuleRows) {
    if (row.format_id !== entry.formatId || row.series_id !== null) continue;
    merged.set(row.piece_kind, ruleFromRow(row));
  }
  if (entry.seriesId !== null) {
    for (const row of pipelineRuleRows) {
      if (row.series_id !== entry.seriesId) continue;
      merged.set(row.piece_kind, ruleFromRow(row));
    }
  }
  return [...merged.entries()].map(([kind, rule]) => ({ kind, rule }));
}

function ruleFromRow(row) {
  return {
    anchorKind: row.anchor_kind,
    anchorWeekday: row.anchor_weekday,
    anchorDirection: row.anchor_direction,
    derivable: row.derivable,
    episodesFromLineup: row.episodes_from_lineup,
    episodeCount: row.episode_count,
  };
}

/* ────────────────────────────────────────────────────────────────────────────
 * Stage 3 — classification
 * ──────────────────────────────────────────────────────────────────────────── */

const classified = ics.classifyEntries(parsed.events, aliases);

const canonical = classified.pieces.filter((p) => p.namingConvention === "canonical").length;
const legacy = classified.pieces.filter((p) => p.namingConvention === "legacy").length;

say("");
say("  ── the four classes ──────────────────────────────────────────────────");
say(
  `     nights ${classified.nights.length} · pieces ${classified.pieces.length} ` +
    `(${canonical} canonical, ${legacy} legacy) · commitments ${classified.commitments.length} · ` +
    `unclassified ${classified.unclassified.length}`
);
say(
  `     ${classified.aliasUnresolved.length} entr(y/ies) carry a word no series claims · ` +
    `${classified.durationDisagreements.length} duration disagreement(s)`
);

if (classified.aliasUnresolved.length > 0) {
  say("");
  say("     ⚠ THE REPAIR IS NOT IN THIS SCRIPT and is not in any file.");
  say("       Set `ics_alias` on the party_series row, in the database, by hand.");
  say("       The values are words for spaces, and a space that is not acquired in");
  say("       writing is not named in a public repository. Nothing here guesses.");
  for (const finding of classified.aliasUnresolved) {
    say(`         ${printableUid(finding.uid)}  ${finding.reason}`);
  }
}

if (classified.unclassified.length > 0) {
  say("");
  say("     entries nobody may guess at — identifier and reason code, never a title:");
  for (const entry of classified.unclassified) {
    say(`         ${printableUid(entry.uid)}  ${entry.reason}`);
  }
}

/* ────────────────────────────────────────────────────────────────────────────
 * Stage 4 — what the declared calendar already holds
 *
 * ⚠ **Every read below is SCOPED, and that is the difference between a mirror
 * and the reconciler that used to live here.** A run that read every row would
 * hold the other calendar's rows in the same lists it uses to decide what to
 * remove, to hold the arriving progressivi against, and to write a snapshot of.
 * Reading the whole table and narrowing afterwards would put the boundary in
 * JavaScript, where the next edit can lose it; the boundary belongs in the
 * `WHERE`.
 *
 * ⚠ **The key-less rows are read by a SEPARATE statement**, and only when the
 * one-off argument is present. That separation is the whole design: the rows
 * that predate the column are not attributable to a calendar by anybody, so the
 * default is that a mirror cannot see them at all — which is the safe direction,
 * because a row a mirror cannot see is a row it cannot remove. The second read's
 * own length is the number the report prints.
 * ──────────────────────────────────────────────────────────────────────────── */

const PLAN_COLUMNS =
  "id, source_uid, series_id, number, venue_word, date, start_time, end_time, source_sequence, source_last_modified, linked_party_id, calendar_key";

/**
 * One scoped read plus, when the one-off argument is present, the read of the
 * rows that carry no key at all.
 *
 * ⚠ The two conditions are never combined into one expression. *Equal to this
 * key* and *has no key* are different questions, one of them is a transition
 * that ends in plan 58-11, and keeping them apart is what lets the second be
 * counted, reported, and eventually deleted along with the argument that
 * enables it.
 */
async function readScoped(table, columns, label) {
  const keyed = await db.from(table).select(columns).eq("calendar_key", calendarKey);
  if (keyed.error) {
    refuse("catalogue_unreadable", `reading the ${label} failed — ${describe(keyed.error)}`);
  }

  if (!options.adoptUnkeyedRows) return { rows: keyed.data ?? [], unkeyed: 0 };

  const keyless = await db.from(table).select(columns).is("calendar_key", null);
  if (keyless.error) {
    refuse(
      "catalogue_unreadable",
      `reading the key-less part of the ${label} failed — ${describe(keyless.error)}`
    );
  }

  return {
    rows: [...(keyed.data ?? []), ...(keyless.data ?? [])],
    unkeyed: (keyless.data ?? []).length,
  };
}

const planRead = await readScoped("production_plan", PLAN_COLUMNS, "plan table");
const pieceRead = await readScoped("production_piece", "id, calendar_key", "piece table");
const commitmentRead = await readScoped(
  "production_commitment",
  "id, calendar_key",
  "commitment table"
);

const planRows = planRead.rows;

/**
 * ⚠ **Two columns from the pieces and two from the commitments, where there used
 * to be fifteen and eight.**
 *
 * A reconciler read those rows to work out what had moved. A mirror does not
 * compare them: it removes them and writes the file back, so what they used to
 * say has no bearing on anything it plans. What is still read is what the
 * snapshot has to be able to give back — and for these two tables that is
 * *which rows went away*, since everything else about them comes from the file
 * that is about to be written again.
 *
 * The module says the same thing in its own shape: what it is handed carries two
 * lists where it used to carry four.
 */
const pieceRows = pieceRead.rows;
const commitmentRows = commitmentRead.rows;

/**
 * The plan rows this run's scope selects, by identifier.
 *
 * ⚠ Used for the checklist — which carries **no calendar key of its own** and is
 * therefore scoped **through these plan rows**, never by a second condition
 * written separately. Two selectors over the same rows is how one of them ends
 * up wider than the other.
 */
const scopedPlanIds = planRows.map((row) => row.id);

let checklistRows = [];
if (scopedPlanIds.length > 0) {
  const read = await db
    .from("production_checklist_item")
    .select("id, plan_id, kind, label, ticked_at, ticked_by, ticked_by_name")
    .in("plan_id", scopedPlanIds);
  if (read.error) {
    refuse("catalogue_unreadable", `reading the checklist failed — ${describe(read.error)}`);
  }
  checklistRows = read.data ?? [];
}

/* ────────────────────────────────────────────────────────────────────────────
 * ⚠ A STORED NIGHT NAMES ITS SERIES BY REFERENCE, NOT BY SPELLING
 *
 * The night row carries `series_id` — a reference into the catalogue — and NOT a
 * copy of the sigla. There is no such column, and its absence is a decision the
 * migration makes in as many words: a sigla has ONE owner, and a spelling kept
 * beside a key is a second owner that drifts the day somebody corrects one of
 * them. The piece table is the deliberate exception, because a piece records the
 * code the file WROTE and an unresolvable code has to survive as evidence.
 *
 * So the sigla is RESOLVED here, through the same map the classifier's aliases
 * were built from, and the resolution has a third answer that is neither a code
 * nor an absence: **a reference this run's catalogue cannot resolve.** It is
 * counted and reported below rather than folded into "no key", because the two
 * have different repairs — one is a night nobody gave a series, the other is a
 * catalogue that moved under a row.
 * ──────────────────────────────────────────────────────────────────────────── */

/** The sigla a stored night is written as, or null when it cannot be resolved. */
function siglaOf(row) {
  if (row.series_id === null || row.series_id === undefined) return null;
  return siglaBySeriesId.get(row.series_id) ?? null;
}

// The two ways a stored night ends up without a resolvable sigla, kept apart on
// purpose. Neither stops a mirror — it writes the file back regardless — but a
// night whose series the catalogue cannot answer for is a finding about the
// CATALOGUE, and a mirror that stayed silent about it would be dropping the one
// thing it did learn from the rows it is about to remove.
const planRowsWithoutSeries = planRows.filter((row) => row.series_id === null).length;
const planRowsWithUnresolvedSeries = planRows.filter(
  (row) => row.series_id !== null && siglaOf(row) === null
).length;

/**
 * A stored night's join key, from the sigla resolved above and its progressivo.
 *
 * ⚠ **Not an identity, and it is worth keeping the two words apart.** The key is
 * composed from CONTENT the file can change, so it is used only where a join to
 * a night is meant — the line-up count below, and placing a piece after the
 * rows have been written. Anything that has to survive the removal is keyed on
 * `source_uid` instead.
 */
function planKeyOf(row) {
  const sigla = siglaOf(row);
  if (sigla === null || row.number === null) return null;
  return ics.joinKey(sigla, row.number);
}

const planKeyById = new Map();
for (const row of planRows) {
  const key = planKeyOf(row);
  if (key !== null) planKeyById.set(row.id, key);
}

/** The stable identity of a plan row: the one the file maintains across edits. */
const planSourceUidById = new Map(planRows.map((row) => [row.id, row.source_uid]));

/**
 * What the module is given: **two lists**, and the shrinkage is the shape of
 * `ICS-01` rather than an economy. A mirror does not compare, so it is not asked
 * for the stored pieces and the stored commitments.
 */
const existing = {
  plans: planRows.map((row) => ({
    id: row.id,
    sourceUid: row.source_uid,
    // Resolved, never read off a column. See the block above.
    seriesCode: siglaOf(row),
    number: row.number,
    venueWord: row.venue_word,
    date: row.date,
    startTime: row.start_time,
    endTime: row.end_time,
    sourceSequence: row.source_sequence,
    sourceLastModified: row.source_last_modified,
    linkedPartyId: row.linked_party_id,
  })),
  checklistItems: checklistRows
    // A row whose plan this run did not read cannot be keyed to a `source_uid`,
    // and a restore keyed on nothing is a restore that lands anywhere. It cannot
    // happen given the read above; the filter is here so that it stays that way
    // if somebody widens the read.
    .filter((row) => planSourceUidById.has(row.plan_id))
    .map((row) => ({
      id: row.id,
      // ⚠ Not a column of this table. Joined here, BEFORE anything is removed —
      // which is the first step of the restore procedure.
      planSourceUid: planSourceUidById.get(row.plan_id),
      kind: row.kind,
      label: row.label,
      tickedAt: row.ticked_at,
      tickedBy: row.ticked_by,
      // ⚠ A person's name. It travels in memory, to the snapshot in the ignored
      // directory, and back to its own column. Nowhere else — never a line of
      // this transcript, never a tracked document.
      tickedByName: row.ticked_by_name,
    })),
};

const unkeyedRowsAdopted = planRead.unkeyed + pieceRead.unkeyed + commitmentRead.unkeyed;
const tickedItems = existing.checklistItems.filter((item) => item.tickedAt !== null).length;
const linkedNights = planRows.filter((row) => row.linked_party_id !== null).length;

say("");
say("  ── what this calendar already holds ──────────────────────────────────");
say(
  `     plans ${planRows.length} · pieces ${pieceRows.length} · ` +
    `commitments ${commitmentRows.length} · checklist items ${checklistRows.length}`
);
say(
  `     ${tickedItems} of those items carry a tick, and ${linkedNights} night(s) stand ` +
    "behind an announced one."
);

if (options.adoptUnkeyedRows) {
  say("");
  say(
    `     ⚠ ONE-OFF: --adopt-unkeyed-rows took in ${unkeyedRowsAdopted} row(s) that carry no ` +
      "calendar key at all — the rows written before the column existed."
  );
  say("       They are attributed to the calendar named above, which is a CLAIM somebody");
  say("       is making and not a fact the rows carry. Without this argument they are");
  say("       not read, not counted and not touched.");
} else {
  say("     Rows carrying no calendar key are not read, and cannot be touched.");
}

if (planRowsWithoutSeries > 0) {
  say(`     ⚠ ${planRowsWithoutSeries} stored night(s) carry no series at all.`);
}
if (planRowsWithUnresolvedSeries > 0) {
  // Its own count and its own sentence. This one is not a night nobody classified
  // — it is a night whose series the catalogue no longer answers for, and the
  // repair is in the catalogue rather than in the file.
  say(
    `     ⚠ ${planRowsWithUnresolvedSeries} stored night(s) name a series this run's ` +
      "catalogue could not resolve. That is a finding, not a tidy-up."
  );
}


/**
 * How many artists are credited on each night, by join key.
 *
 * Read from the **structured** line-up and never from the communicated text. A
 * key that is missing is *not yet knowable*, which is a different answer from
 * zero: it produces `depends_on_lineup` rather than a figure, so a night whose
 * line-up nobody has entered does not silently get told it owes no episodes
 * (D-44-13, OBS-03).
 */
const creditedArtistCounts = new Map();
const linkedPartyIds = planRows
  .filter((row) => row.linked_party_id !== null && planKeyById.has(row.id))
  .map((row) => row.linked_party_id);

if (linkedPartyIds.length > 0) {
  const { data, error } = await db
    .from("party_credits")
    .select("party_id")
    .in("party_id", linkedPartyIds);
  if (error) {
    refuse("catalogue_unreadable", `reading party_credits failed — ${describe(error)}`);
  }

  const countByParty = new Map();
  for (const credit of data ?? []) {
    countByParty.set(credit.party_id, (countByParty.get(credit.party_id) ?? 0) + 1);
  }
  for (const row of planRows) {
    if (row.linked_party_id === null) continue;
    const key = planKeyById.get(row.id);
    if (key === undefined) continue;
    if (!countByParty.has(row.linked_party_id)) continue;
    creditedArtistCounts.set(key, countByParty.get(row.linked_party_id));
  }
}

say(
  `     ${creditedArtistCounts.size} night(s) have a structured line-up this run can count. ` +
    "The rest are not-yet-knowable, which is not zero."
);

/* ────────────────────────────────────────────────────────────────────────────
 * Stage 5 — the plan of writes
 * ──────────────────────────────────────────────────────────────────────────── */

siglaInFile = [
  ...new Set([...classified.nights, ...classified.pieces].map((entry) => entry.seriesCode)),
].sort();

const seriesPipelines = siglaInFile.map((sigla) => ({
  seriesCode: sigla,
  /**
   * Whether the space hosting this series has to approve the material naming it.
   *
   * An INPUT, and a property of the space rather than of the format
   * (`brand-visual-system.md`, gate *lo spazio approva cio' che lo nomina*).
   * **Nothing in the schema stores it today**, so it is `false` here and the
   * consequence is stated out loud below rather than left as a checklist that
   * looks complete because an item was never generated.
   */
  requiresSpaceApproval: false,
  rules: rulesForSigla(sigla),
}));

const now = new Date().toISOString();

const plan = ics.reconcile(
  {
    // The declared scope, handed to the module that plans the removal. It is the
    // SAME value that stamps every inserted row, so the key a row is written
    // with and the key the next mirror deletes it by are one value rather than
    // two that agree today.
    calendarKey,
    nights: classified.nights,
    pieces: classified.pieces,
    commitments: classified.commitments,
    unclassified: classified.unclassified,
    unsupportedRecurrences: parsed.unsupportedRecurrences,
    creditedArtistCounts,
    recurrenceOccurrenceCap: RECURRENCE_OCCURRENCE_CAP,
  },
  existing,
  seriesPipelines,
  now
);

say("");
say("  ── the plan of this mirror ───────────────────────────────────────────");
say(
  `     removal scope: ONE declared condition — the calendar named above — in the ` +
    "order"
);
say(`       ${plan.deletionScope.order.map((step) => step.replace("production_", "")).join(" → ")}`);
say(
  "     The order is obligated by the foreign keys, not preferred: the last step is " +
    "ONE statement, because a self-reference is checked at the end of a statement."
);
say(
  `     writes back  plans ${plan.plansToInsert.length} · pieces ${plan.piecesToInsert.length} · ` +
    `commitments ${plan.commitmentsToInsert.length} · checklist items ${plan.checklistItemsToInsert.length}`
);
say(
  `     ${plan.plansThatSurviveDeletion.length} night row(s) do NOT enter the removal at ` +
    "all: they stand behind an announced night, and removing one would orphan a"
);
say("       night that may have tickets on sale. They are not written again either.");

const survivorsAbsentFromFile = plan.plansThatSurviveDeletion.filter(
  (row) => row.absentFromFile
).length;
say(
  `     of those, ${survivorsAbsentFromFile} survived an ABSENCE — the file no longer ` +
    "carries the entry. That number is the one to look at: the cause may be a"
);
say("       partial export or the wrong file, and it is a finding, not a tidy-up.");

say(
  `     puts back    ${plan.ticksToRestore.length} tick(s) and ${plan.linksToRestore.length} ` +
    "link(s), with their ORIGINAL actor and instant. A restore is not an act."
);
say(
  `     announced-night rows written: 0, and there is no path in this file that could.`
);

const proposals = plan.piecesToInsert.filter((row) => row.sourceUid === null).length;
say(
  `     of the piece writes, ${proposals} are PROPOSALS — a date the rule placed, not ` +
    "one the file wrote. ⚠ A mirror RECOMPUTES them every run: they are not"
);
say("       decisions somebody took once, and nothing about them survives a mirror.");

say(
  `     space-approval checklist items: 0, and that is a CONFIGURATION GAP rather than ` +
    "a measured zero — nothing stores which spaces must approve."
);

say("");
say("     ⚠ These counts are what this run BELIEVES it will do. The confirming count");
say("       is asked of the catalogue, which is a different instrument from the one");
say("       that caused the effect — it is a step of P-58-C and of plan 58-11, and");
say("       deliberately not of this code. A measure taken with the tool that produced");
say("       the effect is an echo.");

if (plan.seriesWithoutRules.length > 0) {
  say("");
  say(
    `     ⚠ ${plan.seriesWithoutRules.length} series in the file own no pipeline rule: ` +
      `${plan.seriesWithoutRules.join(", ")}`
  );
  say("       Their nights would draw an empty checklist that looks finished. A series");
  say("       code is a public sigla half, so it is safe to name here.");
}

if (plan.unsupportedRecurrences.length > 0) {
  say("");
  say(
    `     ${plan.unsupportedRecurrences.length} recurrence(s) this reader does not expand. ` +
      "Each keeps its own day and none is guessed at."
  );
}

/* ────────────────────────────────────────────────────────────────────────────
 * The guard of the progressivo — `ICS-01b`, D-58-01
 *
 * ⚠ **This is the third one-way switch of the project, and it now lives here.**
 * `production_plan_refuse_renumber` is `BEFORE UPDATE OF number`; a mirror
 * deletes and inserts, so that trigger never fires on this path. It **stays
 * installed** and still defends every other writer — what moved is the defence
 * of THIS caller, and D-58-01 is the dated authorisation for the move.
 *
 * ⚠ **It runs BEFORE anything is removed, and it refuses the WHOLE run.** Not
 * the row: a file in which one known entry came back renumbered is a file
 * somebody should look at before any of it is mirrored. Exit `2`, and nothing —
 * not even the snapshot — has been written.
 *
 * ⚠ **What it may name.** The sigla and the two progressivi, which are exactly
 * what is printed on a poster and therefore already public. Never the title of
 * the entry, never a date, never the identifier verbatim.
 *
 * A renumbering somebody actually wants passes an explicit argument, and the
 * report records that it was used — because the trace of a decision to renumber
 * has to outlive the terminal it was taken in.
 * ──────────────────────────────────────────────────────────────────────────── */

const storedNumberByUid = new Map(
  existing.plans
    .filter((row) => row.number !== null)
    .map((row) => [row.sourceUid, { number: row.number, seriesCode: row.seriesCode }])
);

/**
 * The FORMAT half of a sigla, and the venue half deliberately dropped.
 *
 * ⚠ **This is a conflict between two written rules, resolved the restrictive
 * way and recorded here rather than quietly picked** (`meta-gates.md`).
 *
 * The plan of this work says a refused renumbering must name the night in a
 * publishable form — *the sigla and the progressivo, which are on a poster*. But
 * a sigla has two halves and only the first is unconditionally public: the
 * per-venue half is an abbreviation of a SPACE, and the migration that closed the
 * calendar-key vocabulary refuses those halves in as many words, because a space
 * under negotiation named in a report is named in every copy of that report and
 * this repository is public.
 *
 * ⚠ And it is not theoretical here: printing the whole sigla made this run's own
 * output audit go red on **one token**, correctly, on a run that leaked nothing
 * else — the venue half of a sigla also occurs inside an entry title. The repair
 * this file prescribes for that is *say less*, never widen the rule, so the venue
 * half is dropped.
 *
 * What is left names the night well enough to act on: the format half — the same
 * vocabulary as the calendar key, which the same migration calls publishable —
 * the two progressivi, and the digest of the entry's own identifier, which is
 * the only printable form of an identifier in this file and correlates for
 * anybody holding the calendar.
 */
function formatHalfOf(seriesCode) {
  if (typeof seriesCode !== "string" || seriesCode === "") return "a series";
  const [formatHalf] = seriesCode.split("-");
  return formatHalf;
}

const renumberings = [];
for (const night of classified.nights) {
  const stored = storedNumberByUid.get(night.uid);
  if (stored === undefined) continue;
  if (stored.number === night.number) continue;
  renumberings.push({
    // The stored sigla when the catalogue could resolve it, otherwise the one the
    // file writes — reduced to its format half by the block above.
    formatHalf: formatHalfOf(stored.seriesCode ?? night.seriesCode),
    uid: night.uid,
    from: stored.number,
    to: night.number,
  });
}

if (renumberings.length > 0) {
  const listed = renumberings
    .map(
      (change) =>
        `${change.formatHalf} #${change.from} → #${change.to} (${printableUid(change.uid)})`
    )
    .join(" · ");

  if (!options.reauthoriseRenumbering) {
    refuse(
      "renumber_refused",
      `${renumberings.length} night(s) already held come back from the file carrying a ` +
        `different progressivo: ${listed}. A progressivo that has been given out is ` +
        "already on a poster — append, never renumber. NOTHING has been removed and " +
        "nothing has been put down. If this is meant, pass " +
        "--reauthorise-renumbering, and know that the choice is kept in this report."
    );
  }

  say("");
  say(
    `     ⚠ ${renumberings.length} RENUMBERING(S) RE-AUTHORISED by explicit argument: ${listed}`
  );
  say("       A progressivo that is already on a poster is being changed. This line is");
  say("       the record of that decision, and it is the only one there will be.");
}

if (printedIdentifiers > 0) {
  say("");
  say(
    `     ${printedIdentifiers} identifier(s) above are digests. None is verbatim: no raw ` +
      "identifier reaches this transcript, by the rule this file's header states."
  );
  if (identifiersCarryingATitleWord > 0) {
    say(
      `     ⚠ ${identifiersCarryingATitleWord} of them carry a word of an entry title, so ` +
        "printing that UID whole would have printed the title."
    );
  }
}

/* ────────────────────────────────────────────────────────────────────────────
 * The snapshot — written OUTSIDE this process, BEFORE anything is removed
 *
 * ⚠ **This is not bookkeeping, and it is the step most likely to look like it.**
 * Between the removal and the rewrite there is **no transaction** — the client
 * this script uses opens none — and this project has **no point-in-time
 * recovery**. `production_checklist_item` hangs off `production_plan` with
 * `ON DELETE CASCADE`, so the removal takes the ticks with it. If the process
 * dies in that gap, the file below is the only copy of the human state that
 * exists anywhere. `P-58-C` step 3 goes looking for exactly this file, and the
 * worst finding that procedure can make is that it is not there.
 *
 * WHAT IT HOLDS: the two restore lists of `ICS-03` — the ticks with their
 * original instant and actor, keyed by the plan's own `source_uid`, and the
 * links keyed the same way — plus the **entire content** of the rows the run is
 * about to remove. Everything, not the fields that look endangered: a restore
 * that only covers the cases somebody remembered is the hole `ICS-03` exists to
 * forbid.
 *
 * ⚠ WHERE IT MAY BE WRITTEN, and why it is checked rather than trusted. One of
 * the fields is `ticked_by_name`, **a person's name**, and the production
 * calendar's migration forbids it reaching anything under `.planning/` or the
 * repository at all — this repository is public and a publication is
 * irreversible. So the path is put to `git check-ignore` and the run **refuses**
 * unless git itself answers that it is ignored. The chosen directory sits inside
 * the material directory, which is not merely listed in `.gitignore` but held
 * there mechanically by check **F** of `npm run verify:persona` — that check
 * requires both that the directory is ignored and that nothing inside it is
 * already tracked, since a `.gitignore` does not remove from the index what is
 * already in it.
 *
 * ⚠ There is deliberately **no argument** for this path. An argument would be a
 * way to aim a file carrying a person's name at a tracked directory, and the
 * fixed location is also what lets `P-58-C` say where to look.
 *
 * ⚠ THE REPORT SAYS WHERE AND HOW MANY, NEVER WHAT. No name, no title, no
 * identifier. The file name is not printed either: it carries the run's own
 * clock, and the audit at the foot of this run reads every line for a year.
 * ──────────────────────────────────────────────────────────────────────────── */

const SNAPSHOT_DIR = join(ROOT, "docs", ".mirror-snapshots");

/**
 * Refuses unless git itself says the path is ignored.
 *
 * `git check-ignore` exits `0` when the path is ignored, `1` when it is not and
 * `128` on an error — so anything other than `0` is a refusal. Asking git is the
 * point: reading `.gitignore` and reasoning about it here would be a second
 * implementation of a rule git already owns, and the two would disagree on the
 * day somebody adds a negation.
 */
function refuseUnlessIgnored(path) {
  const answer = spawnSync("git", ["check-ignore", "-q", "--", path], { cwd: ROOT });
  if (answer.error) {
    refuse(
      "snapshot_path_unverifiable",
      `git could not be asked whether the snapshot path is ignored: ${answer.error.message}. ` +
        "The snapshot carries a person's name, so an unverified path is not written to."
    );
  }
  if (answer.status !== 0) {
    refuse(
      "snapshot_path_not_ignored",
      "the directory this run would write its snapshot into is NOT ignored by git. " +
        "That snapshot carries a person's name and the whole content of the rows " +
        "about to be removed, and this repository is public: a publication does not " +
        "come back. Nothing was written, including the snapshot."
    );
  }
}

/**
 * Writes the snapshot and returns how many rows it holds.
 *
 * @returns the counts, for the report — never the content
 */
function writeSnapshotBeforeRemoving(payload) {
  const fileName = `mirror-${calendarKey}-${Date.now()}.json`;
  const target = join(SNAPSHOT_DIR, fileName);

  // Checked BEFORE the directory is created, and on the file itself: a check on
  // the parent would pass while a negation rule further down un-ignored the
  // child.
  refuseUnlessIgnored(target);

  try {
    mkdirSync(SNAPSHOT_DIR, { recursive: true });
    writeFileSync(target, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  } catch (error) {
    refuse(
      "snapshot_unwritable",
      `the snapshot could not be written: ${error.message}. Nothing has been ` +
        "removed — a mirror that cannot take its snapshot does not start."
    );
  }

  return {
    // Relative, so the line carries no home directory and no user name. If this
    // ever trips the output audit on an ordinary word, the repair prescribed by
    // this file is to SAY LESS — print only the counts — and never to widen the
    // audit's rule.
    where: relative(ROOT, SNAPSHOT_DIR),
    rows:
      payload.ticks.length +
      payload.links.length +
      payload.rows.plans.length +
      payload.rows.pieces.length +
      payload.rows.commitments.length +
      payload.rows.checklistItems.length,
  };
}

/* ────────────────────────────────────────────────────────────────────────────
 * Stage 6 — the dry run stops here
 * ──────────────────────────────────────────────────────────────────────────── */

if (!options.apply) {
  say("");
  say("  ── dry run ───────────────────────────────────────────────────────────");
  say(`     ${ics.isEmptyPlan(plan) ? "THE PLAN IS EMPTY" : "the plan is not empty"}.`);
  say("     NOTHING WAS WRITTEN. No transaction was opened and no import-run row exists");
  say("     for this run — see the header for the conflict this resolves and its cost.");
  say("");
  say("     To write it: pass --apply, and read the counts above first.");
  // ⚠ The audit ANSWERS, and the answer decides the exit code. A check whose
  // failure leaves an OK token and an exit 0 behind it is not a check — and in a
  // repository with no error tracking the exit code is the only thing anything
  // downstream can read.
  const clean = auditOwnOutput();
  say("");
  say(clean ? "  IMPORT_DRY_RUN_OK" : "  IMPORT_DRY_RUN_WITH_LEAKED_OUTPUT");
  say("");
  process.exit(clean ? 0 : 1);
}

/* ────────────────────────────────────────────────────────────────────────────
 * Stage 7 — the mirror: snapshot, adopt, remove, write back, re-attach
 *
 * ⚠ **There is no transaction around any of this.** The client this script uses
 * opens none, and this project has no point-in-time recovery. Every step below
 * is ordered so that the state between two of them is a state somebody can come
 * back from — and the way back is `P-58-C`, not a second run.
 * ──────────────────────────────────────────────────────────────────────────── */

// FIRST, and before any statement of any kind. See the block that defines it:
// there is no transaction across the removal, so this file is the only copy of
// the human state that will exist if the process dies partway.
const snapshot = writeSnapshotBeforeRemoving({
  calendarKey,
  ticks: plan.ticksToRestore,
  links: plan.linksToRestore,
  rows: {
    plans: planRows,
    pieces: pieceRows,
    commitments: commitmentRows,
    checklistItems: checklistRows,
  },
});

say("");
say(
  `  ── snapshot ── ${snapshot.rows} row(s) written to ${snapshot.where}/ before anything ` +
    "is touched."
);
say("     git confirms that directory is ignored. Its contents are NEVER printed:");
say("     one field is a person's name. P-58-C step 3 is what reads it.");

let completedSteps = 0;

async function step(category, action) {
  const { error } = await action();
  if (error) failPartway(category, describe(error), completedSteps);
  completedSteps += 1;
}

// The run row, opened first so that a process killed halfway leaves a row with a
// null `finished_at` — which IS the observation, and must never be back-filled
// to make the table look tidy.
const opened = await db
  .from("production_import_run")
  .insert({
    calendar_key: calendarKey,
    file_byte_size: byteSize,
    entries_seen: parsed.events.length,
    entries_by_class: {
      night: classified.nights.length,
      piece: classified.pieces.length,
      commitment: classified.commitments.length,
      unclassified: classified.unclassified.length,
    },
    unclassified_count: classified.unclassified.length,
    dry_run: false,
  })
  .select("id")
  .single();

if (opened.error) {
  refuse("run_row_refused", `the import-run row was refused — ${describe(opened.error)}`);
}

const runId = opened.data.id;
say("");
// The run identifier goes out digested like every other one (the rule is in this
// file's header). It still correlates: the digest is `sha256` of the identifier
// cut to twelve characters, and the row it names is the newest one of the
// import-run table, so anybody reading the registry can recompute and match.
say(`  ── applying ── import run ${printableUid(runId)}`);

/* ── The one-off adoption (`ICS-02`, the closing half of a declared transition) ─
 *
 * ⚠ **The rows that predate the key are ADOPTED, not selected by a second
 * condition.** They are given the declared key first, and from that instant they
 * are inside the scope like everything else — which is what lets every removal
 * below carry ONE condition. A `DELETE` with an *or has no key* branch would be
 * a second, independently written selector over the same rows, and two selectors
 * is how one of them ends up wider than the other.
 *
 * ⚠ This is an `UPDATE` of `calendar_key` alone. It does not touch `number`, so
 * the renumbering trigger — which is `BEFORE UPDATE OF number` — is not
 * involved, and no monotone guard is crossed here.
 *
 * The claim it makes is a person's, taken with the argument. Plan 58-11 is where
 * that person stands in front of it.
 */
if (options.adoptUnkeyedRows && unkeyedRowsAdopted > 0) {
  for (const table of ["production_plan", "production_piece", "production_commitment"]) {
    await step("adopt_unkeyed", () =>
      db.from(table).update({ calendar_key: calendarKey }).is("calendar_key", null)
    );
  }
  say(
    `     ${unkeyedRowsAdopted} key-less row(s) adopted into this calendar. That closes the ` +
      "transition the column was born in, for these rows, once."
  );
}

/* ── The removal, in the order the foreign keys obligate ────────────────────
 *
 * The order is not preferred, it is forced, and each step says by what:
 *
 *   1. the checklist — its reference is the ONLY `ON DELETE CASCADE` in this
 *      schema. Emptying it explicitly, first, makes the number of ticks that go
 *      away a number somebody counted instead of a side effect nobody saw. It
 *      carries no key of its own, so it is scoped THROUGH the plan rows this run
 *      already read — the same rows, not a second condition;
 *   2. the pieces before the nights — that reference is `NO ACTION`, so removing
 *      a night that still has pieces raises a violation;
 *   3. the nights;
 *   4. the occupied days, in ONE statement — the self-reference is `NO ACTION`
 *      and `NO ACTION` is checked at the END of a statement, so one statement
 *      that carries parent and children away together passes while two in the
 *      wrong order do not.
 *
 * ⚠ **The direction of the mistake is the design.** A condition that is too wide
 * removes MORE than it should — this repository has paid for that direction once,
 * 63 rows across seven tables — and a narrow condition that is wrong finds
 * nothing.
 */

const survivingPlanIds = new Set(plan.plansThatSurviveDeletion.map((row) => row.id));
const planIdsToRemove = scopedPlanIds.filter((id) => !survivingPlanIds.has(id));

if (scopedPlanIds.length > 0) {
  // Every item the scope selects, survivors INCLUDED — the survival exception
  // subtracts from step 3, not from this one. Leaving one night's items behind
  // would produce a checklist half from this run and half from a previous one,
  // which is a state nobody can read and no report can explain. It is also why
  // the ticks of ALL nights were collected, not only the ones being removed.
  await step("remove_checklist", () =>
    db.from("production_checklist_item").delete().in("plan_id", scopedPlanIds)
  );
}

await step("remove_pieces", () =>
  db.from("production_piece").delete().eq("calendar_key", calendarKey)
);

if (planIdsToRemove.length > 0) {
  // TWO conditions, and the second one only ever NARROWS. `calendar_key` is the
  // declared scope; the identifier list is the survival exception of `ICS-03b`
  // expressed positively, and it is also the by-primary-key discipline that
  // `ai-engineering.md` requires of anything that removes production rows. If the
  // two ever disagreed, their intersection is the smaller set — which is the only
  // direction in which disagreement is safe.
  await step("remove_plans", () =>
    db
      .from("production_plan")
      .delete()
      .eq("calendar_key", calendarKey)
      .in("id", planIdsToRemove)
  );
}

// ONE statement. Splitting it is the mistake this comment exists to prevent.
await step("remove_commitments", () =>
  db.from("production_commitment").delete().eq("calendar_key", calendarKey)
);

say(
  `     removed: ${scopedPlanIds.length} night(s)' checklist · pieces · ` +
    `${planIdsToRemove.length} night(s) · occupied days — ` +
    `${plan.plansThatSurviveDeletion.length} night(s) untouched by ICS-03b.`
);

/* ── The write-back ─────────────────────────────────────────────────────────
 *
 * Plain inserts, not upserts, and the change is deliberate. An upsert made sense
 * against rows that were still there; against a scope that was just emptied a
 * conflict would mean the removal did not do what it said, and that is a finding
 * to raise rather than a state to merge into.
 */

/** The catalogue identifiers a plan row needs. The module makes no joins. */
function catalogueFor(sigla) {
  return catalogueBySigla.get(sigla) ?? { seriesId: null, formatId: null };
}

if (plan.plansToInsert.length > 0) {
  const rows = plan.plansToInsert.map((row) => {
    const catalogue = catalogueFor(row.seriesCode);
    return {
      source_uid: row.sourceUid,
      // Written HERE and only here: the number the file assigned, on a row that
      // does not exist yet. Nothing below updates this column, ever.
      number: row.number,
      venue_word: row.venueWord,
      date: row.date,
      start_time: row.startTime,
      end_time: row.endTime,
      source_sequence: row.sourceSequence,
      source_last_modified: row.sourceLastModified,
      format_id: catalogue.formatId,
      series_id: catalogue.seriesId,
      // Read off the row the module stamped, never passed separately: the key a
      // row is written with and the key the next mirror removes it by are ONE
      // value, not two that agree today.
      calendar_key: row.calendarKey,
      // `venue_id` and `venue_stage` stay null on purpose. Which space a night
      // happens in, and whether it is acquired, is a person's judgement recorded
      // in writing (`venue-acquisition.md`) — an import that inferred it from a
      // word in a title would be turning a candidate into a booking.
      last_seen_at: row.seenAt,
    };
  });
  await step("write_plans", () => db.from("production_plan").insert(rows));
}

// Read back, so that pieces and checklist items point at the identifiers the
// database actually handed out rather than at ones this process guessed. The
// read carries the scope, and it is what places the pieces of a SURVIVING night
// too — that row was never removed and never rewritten, but its pieces were.
const appliedPlans = await readScoped(
  "production_plan",
  "id, series_id, number, source_uid, calendar_key",
  "plan table"
);
const planIdByKey = new Map();
const planIdBySourceUid = new Map();
for (const row of appliedPlans.rows) {
  const key = planKeyOf(row);
  if (key !== null) planIdByKey.set(key, row.id);
  planIdBySourceUid.set(row.source_uid, row.id);
}

function pieceRowFor(row) {
  return {
    source_uid: row.sourceUid,
    plan_id: row.planKey === null ? null : planIdByKey.get(row.planKey) ?? null,
    series_code: row.seriesCode,
    number: row.number,
    kind: row.kind,
    part_marker: row.partMarker,
    date: row.date,
    origin: row.origin,
    unresolved_reason: row.unresolvedReason,
    conforms_to_rule: row.conformsToRule,
    naming_convention: row.namingConvention,
    source_sequence: row.sourceSequence,
    source_last_modified: row.sourceLastModified,
    calendar_key: row.calendarKey,
    last_seen_at: row.seenAt,
  };
}

if (plan.piecesToInsert.length > 0) {
  // ⚠ One statement for written pieces and proposals together, where there used
  // to be two. The split existed because an upsert keyed on `source_uid` would
  // duplicate a proposal on every run — a proposal has no `UID`, and Postgres
  // allows many nulls in a unique column. With the scope emptied first there is
  // no upsert and therefore no split: a proposal is simply a row the file did not
  // write, recomputed this run like every other one.
  await step("write_pieces", () =>
    db.from("production_piece").insert(plan.piecesToInsert.map(pieceRowFor))
  );
}

if (plan.commitmentsToInsert.length > 0) {
  const rows = plan.commitmentsToInsert.map((row) => ({
    source_uid: row.sourceUid,
    occurrence_date: row.occurrenceDate,
    start_time: row.startTime,
    end_time: row.endTime,
    title: row.title,
    recurrence_raw: row.recurrenceRaw,
    calendar_key: row.calendarKey,
    last_seen_at: row.seenAt,
  }));
  await step("write_commitments", () => db.from("production_commitment").insert(rows));
}

// An expanded occurrence points back at the entry it came from. Resolved after
// the inserts, by (source_uid, occurrence_date), which is that table's own
// unique key — never by matching a title.
const expansions = plan.commitmentsToInsert.filter((row) => row.expandedFromDate !== null);
if (expansions.length > 0) {
  const applied = await readScoped(
    "production_commitment",
    "id, source_uid, occurrence_date, calendar_key",
    "commitment table"
  );
  const commitmentIdByKey = new Map(
    applied.rows.map((row) => [`${row.source_uid}|${row.occurrence_date}`, row.id])
  );
  for (const row of expansions) {
    const parentId = commitmentIdByKey.get(`${row.sourceUid}|${row.expandedFromDate}`);
    const childId = commitmentIdByKey.get(`${row.sourceUid}|${row.occurrenceDate}`);
    if (parentId === undefined || childId === undefined || parentId === childId) continue;
    await step("link_expansion", () =>
      db.from("production_commitment").update({ expanded_from: parentId }).eq("id", childId)
    );
  }
}

if (plan.checklistItemsToInsert.length > 0) {
  const rows = plan.checklistItemsToInsert
    .filter((row) => planIdByKey.has(row.planKey))
    .map((row) => ({
      plan_id: planIdByKey.get(row.planKey),
      kind: row.kind,
      label: row.label,
      due_date: row.dueDate,
      sort_order: row.sortOrder,
    }));

  const unplaced = plan.checklistItemsToInsert.length - rows.length;
  if (unplaced > 0) {
    say(
      `     ⚠ ${unplaced} checklist item(s) name a night this run did not write, so they ` +
        "were not created. That is a finding, not a tidy-up."
    );
  }

  if (rows.length > 0) {
    await step("write_checklist", () =>
      db.from("production_checklist_item").insert(rows)
    );
  }
}

/* ── The re-attachment — the two exceptions of state (`ICS-03`) ─────────────
 *
 * ⚠ **A RESTORE IS NOT AN ACT.** The ticks go back with their ORIGINAL instant
 * and their ORIGINAL actor, written straight to their columns with the service
 * client. They do **not** go through the tick-recording function, which
 * re-records who ticked on every call, by a decision that function's own
 * migration states — running a restore through it would attribute every tick in
 * the calendar to whoever launched this import.
 *
 * ⚠ **Keyed on what survives.** A plan row's `id` is generated and did not
 * survive the removal, so both restores key on `source_uid`, and the ticks on
 * `(source_uid, kind, label)` — the item's own unique key with its generated
 * half swapped for the stable one.
 */

let linksRestored = 0;
for (const link of plan.linksToRestore) {
  const planId = planIdBySourceUid.get(link.planSourceUid);
  if (planId === undefined) {
    // Not silent, and not fatal: the row is gone and the link cannot be put
    // anywhere. It is the finding `P-58-C` exists for.
    say(
      "     ⚠ a link could not be put back: this run wrote no night with that identity. " +
        "The snapshot still holds it."
    );
    continue;
  }
  await step("restore_link", () =>
    db
      .from("production_plan")
      .update({ linked_party_id: link.linkedPartyId })
      .eq("id", planId)
  );
  linksRestored += 1;
}

let ticksRestored = 0;
let ticksUnplaced = 0;
for (const tick of plan.ticksToRestore) {
  const planId = planIdBySourceUid.get(tick.planSourceUid);
  if (planId === undefined) {
    ticksUnplaced += 1;
    continue;
  }
  await step("restore_tick", () =>
    db
      .from("production_checklist_item")
      .update({
        // The originals. Not now, and not whoever is running this.
        ticked_at: tick.tickedAt,
        ticked_by: tick.tickedBy,
        ticked_by_name: tick.tickedByName,
      })
      .eq("plan_id", planId)
      .eq("kind", tick.kind)
      .eq("label", tick.label)
  );
  ticksRestored += 1;
}

say(
  `     put back: ${ticksRestored} tick(s) and ${linksRestored} link(s), with the original ` +
    "actor and instant."
);
if (ticksUnplaced > 0) {
  say(
    `     ⚠ ${ticksUnplaced} tick(s) name a night this run did not write. They stay in the ` +
      "snapshot and nowhere else. That is a finding."
  );
}

// The run row is closed last, with the findings that survive a mirror: the
// recurrences this reader does not expand. The divergence list has no producer
// any more — a mirror does not compare, so it has nothing to disagree about —
// and the column is left as it was born rather than written with an empty list
// that would read as *measured and none found*.
const closed = await db
  .from("production_import_run")
  .update({
    finished_at: new Date().toISOString(),
    unsupported_recurrences: plan.unsupportedRecurrences.map((record) => ({
      source_uid: record.uid,
      reason: record.reason,
    })),
  })
  .eq("id", runId);

if (closed.error) {
  failPartway("run_row_unclosed", describe(closed.error), completedSteps);
}

say("");
say(`  ${completedSteps} write step(s) completed. The import-run row is closed.`);
say("  ⚠ These are the counts this run BELIEVES. Confirm them from the catalogue,");
say("  which is a different instrument from the one that caused the effect.");

// Same rule as the dry run's, with one difference that has to stay visible: the
// writes above have ALREADY happened. So the exit code is 1 and never 2 — the
// material leaked, the import did not fail — and the token says which of the two
// this run was.
const clean = auditOwnOutput();

say("");
say(clean ? "  IMPORT_APPLIED_OK" : "  IMPORT_APPLIED_WITH_LEAKED_OUTPUT");
say("");
process.exit(clean ? 0 : 1);

/* ────────────────────────────────────────────────────────────────────────────
 * The audit of this run's own output
 *
 * Every parsed title, stripped of the tokens that are already public, must leave
 * no token that occurs in the transcript — and no four-digit year may appear in
 * it either. Same device as check F of `verify-ics-import.mjs`, same reason: the
 * claim *this printed no material* is worth having only when it is measured.
 *
 * There is deliberately no exemption list. When it goes red on a coincidence the
 * repair is to SAY LESS, never to widen the rule. **It has already gone red once
 * here**, on this script's first run, and the block above the banner records what
 * was reworded and why.
 *
 * ⚠ It strips LESS than the golden check does. `verify-ics-import.mjs` also
 * strips the four format names and the five published sigle it declares; this
 * strips the kind labels and the sigle the classifier found, and no format name
 * at all. Stripping less means looking for more, and this script prints fewer
 * words than that one — so the stricter setting costs nothing here and would be
 * the wrong default to loosen by copying.
 * ──────────────────────────────────────────────────────────────────────────── */

/**
 * @returns `true` when this run's transcript carries no material. **The caller
 *   must branch on it.** It used to return nothing, print `✗ OUTPUT AUDIT
 *   FAILED` and let both call sites walk straight into an OK token and `exit 0`
 *   — so a run that leaked ended with the tail a person skims and the status a
 *   wrapper reads both saying it was fine. A check whose failure changes nothing
 *   observable is not a check, and this product has no error tracking to notice
 *   on its behalf.
 */
function auditOwnOutput() {
  const publicTokens = [...Object.values(ics.PIECE_KIND_LABELS), ...siglaInFile];

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

  say("");
  if (leaked.length === 0 && years.length === 0) {
    say(
      `  ✓ output audit: ${residual.size} residual title token(s), 0 of them in what this ` +
        "run printed · 0 four-digit years"
    );
    return true;
  }

  // The leaked tokens are NOT printed. Printing them to say they were printed is
  // the whole failure, performed by the check that found it. What IS printed is
  // enough to act on: how many, of which of the two kinds, and out of how large a
  // residual set — three numbers that name nothing.
  say("  ✗ OUTPUT AUDIT FAILED — this run's own output carries material.");
  if (leaked.length > 0) {
    say(
      `    ${leaked.length} of ${residual.size} residual title token(s) occur above. They are ` +
        "deliberately not listed: printing them to report them would perform the leak."
    );
  }
  if (years.length > 0) {
    say(`    ${years.length} four-digit year(s) appear above. A date is the first thing`);
    say("    this script may not say out loud.");
  }
  say("    DO NOT PASTE THIS RUN ANYWHERE. Reword the output; never widen the rule.");
  return false;
}

function escapeForRegex(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
