#!/usr/bin/env node
/**
 * import-production-calendar.mjs — the production calendar, read from the
 * address that registers it, into the database, printing counts and never a line
 * of what it read.
 *
 * WHAT IT DOES, in one sentence: **it reads one calendar from the address
 * registered for it in the environment, drives `src/lib/production/ics/` to
 * parse, classify and reconcile it against what the seven production tables
 * already hold, prints the resulting plan of writes as counts, and — only when
 * `--apply` is passed explicitly — performs those writes.**
 *
 * ── ⚠ THE SOURCE IS AN ADDRESS, AND THE FILE ARGUMENTS ARE GONE (`ICS-09`) ──
 *
 * This script used to take `--file` and `--docs-dir` and read the newest
 * snapshot sitting in a gitignored directory on one machine. **Both arguments
 * have been removed from the import path**, and the removal is declared here
 * rather than left for somebody to notice from an error.
 *
 * The reason is not tidiness. D-58-05 says the source of a calendar is an
 * address registered once per calendar key, and `ICS-09` says that **without it
 * the import refuses — it does not fall back to a file and it does not fall back
 * to a default.** A second way in that still worked would be a fallback nobody
 * declared: the run would succeed on the one machine that holds the material and
 * quietly mirror a stale export, which is precisely the failure the registration
 * exists to prevent. Leaving the arguments in place would have meant *not having
 * closed it*.
 *
 * The gate `npm run verify:ics` still opens the material for itself. That is a
 * **measurement** of a file, not a write to a database, and the distinction is
 * the whole reason it may keep doing so.
 *
 * ── ⚠ HALF OF D-44-26 FELL ON 2026-08-20, AND HALF DID NOT (D-58-07) ────────
 *
 * D-44-26 forbade **two** things: (1) an upload control inside the product, and
 * (2) the calendar transiting a server at all. The owner reversed **(2) only**,
 * for the scheduled mirror, and the reason the prohibition existed did not
 * evaporate with it: it became a thing to **defend by construction** instead of
 * a surface that happened not to exist.
 *
 * **(1) stays forbidden, word for word.** No Server Action that accepts a file,
 * no route that receives one, no drag target anywhere. `44-UI-SPEC.md` §11.3 and
 * check **U2** of `verify-calendar-surface.mjs` remain valid and are not
 * touched by this file.
 *
 * The five defences that replace the surface that used not to exist are
 * requirements and not good intentions — the body is never printed, nothing is
 * persisted, the failures are reported by distinct category, the address and its
 * host are registered secrets, and the product gains no upload control. They are
 * implemented below, each beside the line that carries it.
 *
 * **Where this disagrees with the research, and it does:** `44-RESEARCH.md`
 * §Import Path recommends building the upload **as well as** this script, and
 * weighs it fairly. That recommendation is still refused, and it is refused by
 * the half of D-44-26 that stands.
 *
 * ── ⚠ THIS RUN'S OUTPUT IS A PUBLICATION SURFACE ────────────────────────────
 *
 * What arrives from the address — unannounced dates, spaces under negotiation,
 * line-ups — is material this repository must never publish, and
 * `github.com/edmiribrahimi/Resonate` is public. The same holds for `docs/`,
 * gitignored and held there by check **F** of `npm run verify:persona`, which is
 * where this run's snapshot of the rows it removes is written.
 *
 * So the rule is narrower than "be careful": somebody will paste this run into
 * an issue. It prints **counts, digested identifiers and reason codes**, and it
 * prints no title, no date, no venue word, no line-up and **not one byte of what
 * it read** — that is defence 1 of D-58-07, and it is absolute because from plan
 * 58-12 this run happens on a platform whose runtime logs are retained. A
 * failure is logged with `error.code`
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
 *   `--accept-shrink`   allow a calendar that arrives carrying fewer entries
 *                       than the declared floor to be mirrored anyway. Without
 *                       it, that is a refusal. It covers a SHRUNK feed only:
 *                       **an empty one is never authorisable**, whatever is
 *                       passed. Its use is recorded in the report, in the same
 *                       shape as the renumbering re-authorisation, because a
 *                       guard with no authorised exit is a guard somebody
 *                       removes.
 *   `--reauthorise-renumbering`
 *                       allow a known entry to come back with a different
 *                       progressivo. Without it, that is a refusal. Its use is
 *                       recorded in the report, because a progressivo is
 *                       already on a poster.
 *   `--unattended`      DECLARE THAT NOBODY IS WATCHING. It only ever narrows:
 *                       it can make the second guard refuse and can never make
 *                       it admit. There is deliberately **no `--attended`** —
 *                       attendance is read from this process's own input stream,
 *                       because a mechanism that can be passed out of habit is
 *                       not a guard. See `src/lib/production/ics/guard.ts`.
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

// ⚠ `readFileSync`, `readdirSync` and `statSync` are gone from this list, and
// that is the removal `ICS-09` asked for made visible in one line: this script
// no longer opens the material at all. What is left writes the snapshot of the
// rows it is about to remove, and reads nothing but its own environment file.
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
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
    /**
     * The authorised way past the feed guard, and past `feed_shrank` ONLY.
     *
     * ⚠ There is deliberately no argument here that reads bytes from anywhere
     * other than the registered address: `--file` and `--docs-dir` were removed
     * with `ICS-09`, and the header says why. An unrecognised `--file` now lands
     * in `unknown` below and REFUSES, which is the honest answer — better than a
     * flag silently ignored on a run somebody believed had read their export.
     */
    acceptShrink: false,
    reauthoriseRenumbering: false,
    adoptUnkeyedRows: false,
    /**
     * The caller declaring that NOBODY IS WATCHING this run.
     *
     * ⚠ **It only ever narrows, and there is deliberately no opposite of it.**
     * Attendance is not a claim a caller may make: it is read from the process's
     * own input stream, which a scheduled invocation cannot acquire by being
     * edited. A `--attended` would be a flag that silences a guard, and a flag
     * that silences a guard ends up in a shell alias. This one can only make the
     * guard fire, so typing it out of habit is harmless — which is what lets a
     * person exercise the unattended path from a terminal on purpose.
     */
    unattended: false,
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
    else if (argument === "--accept-shrink") options.acceptShrink = true;
    else if (argument === "--unattended") options.unattended = true;
    else if (argument === "--calendar") {
      i += 1;
      options.calendar = argv[i] ?? null;
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
say("calendar import — into the seven tables, in counts");
say("");

if (options.help) {
  say("  --dry-run          print the plan and write nothing. THE DEFAULT.");
  say("  --apply            perform the writes. Must be passed explicitly.");
  say("  --calendar <key>   WHICH calendar this run mirrors. REQUIRED, no default.");
  say("  --accept-shrink    allow a source that arrives smaller than the declared floor.");
  say("                     Covers a shrunk source only; an empty one is never allowed.");
  say("  --reauthorise-renumbering");
  say("                     allow a known entry back with a different progressivo.");
  say("  --adopt-unkeyed-rows");
  say("                     ONE-OFF: give the declared key to the rows that predate it.");
  say("  --unattended       declare that nobody is watching. It can only REFUSE more,");
  say("                     never less, and there is no opposite of it.");
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
  say("  MODE: --apply  ⚠ THIS RUN WRITES to the seven tables.");
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
 * **Nothing bypasses this any more, because there is nothing left to bypass it
 * with.** `--file` and `--docs-dir` are gone (`ICS-09`, declared at the top of
 * this file): the registration no longer merely asserts that this deployment
 * mirrors this calendar — it is now the ONLY way bytes reach this run.
 *
 * ── ⚠ THE HOST IS REGISTERED TOO, AND THAT IS NOT BELT-AND-BRACES ───────────
 *
 * Defence 4 of D-58-07 asks for both. The whole address is the secret, but a
 * network-layer message is written by somebody else and routinely carries **only
 * the host** — *getaddrinfo ENOTFOUND ‹host›* is the shape. A redaction list
 * holding the full address would not match that string, and the provider's host
 * alone already narrows down who could have published this calendar. So both go
 * in, and both go in **before the first `say()` of this block**: the guarantee
 * this file offers is that every printed string passes through one list, and a
 * list that gets filled after the first line is not that guarantee.
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
registerSecret(feedSource.trim());

/**
 * The address this run reads from, and the two things settled while parsing it.
 *
 * ⚠ **The scheme is normalised, not guessed.** A calendar published from a Mac
 * is commonly handed out under the `webcal:` scheme, which is the same request
 * over TLS with a different word in front. It is rewritten here, once, where a
 * reader can see it happen — rather than left to fail later as *unreachable*,
 * which would send somebody looking at their network for an hour.
 *
 * ⚠ **The rewrite is done on the STRING and the address re-parsed, and that is
 * not a stylistic choice — the obvious version does nothing.** Assigning to
 * `.protocol` on a parsed address whose scheme is not one the URL standard calls
 * *special* is **silently ignored**: the assignment appears to succeed, the
 * value does not change, and the refusal below then fires on an address that had
 * just been repaired. It was written the obvious way first and measured going
 * red on a perfectly good subscription address. A repair that fails without
 * saying so is the silent failure this project keeps writing down.
 *
 * ⚠ **Anything that is neither of the two is a refusal, not a coercion.** A
 * `file:` address would turn the registration back into a local read and quietly
 * reopen the door `ICS-09` closed; an unknown scheme is a typo or a paste of
 * something else entirely. Neither gets repaired into a request.
 */
function resolveFeedAddress(raw) {
  // On the string, before parsing, and anchored at the start so it cannot touch
  // anything inside the address.
  const normalised = raw.replace(/^webcal:/i, "https:");

  let parsed;
  try {
    parsed = new URL(normalised);
  } catch {
    refuse(
      "bad_feed_source",
      `${feedSourceVariableName} is set but is not an address. Its VALUE is not printed ` +
        "here and will not be: it is readable by anybody holding it. Check the variable " +
        "where it is configured."
    );
  }

  // The host goes into the redaction list before it can appear in any message —
  // including the refusal three lines below, which names a scheme and nothing
  // else.
  registerSecret(parsed.hostname);

  if (parsed.protocol !== "https:") {
    refuse(
      "bad_feed_source",
      `${feedSourceVariableName} carries a scheme this run will not read from. Two are ` +
        "accepted — the secure web one, and the calendar-subscription one, which is " +
        "rewritten to it. A local-file scheme is refused rather than followed: it would " +
        "reopen the second way in that ICS-09 closed."
    );
  }

  // The normalised form as well as the raw one. `new URL()` may add a trailing
  // slash or lower-case the host, so the string this run actually requests can
  // differ by a character from the one the variable holds — and a redaction list
  // matches by substring, not by intent.
  registerSecret(parsed.href);

  return parsed;
}

const feedAddress = resolveFeedAddress(feedSource.trim());

say("  ✓ a source is registered for this calendar (never printed, redacted everywhere)");
say("    the address AND its host are registered secrets — a network message carries the");
say("    host on its own, and the host alone narrows down who published this calendar.");
say("");

/* ────────────────────────────────────────────────────────────────────────────
 * Gate 3 — credentials, BEFORE the source is read
 *
 * ⚠ **Third now, and it used to be first.** The move is the refusal order this
 * file's header states and `scripts/verify-mirror-guards.mjs` fixes: with the
 * credentials first, all three cases above answer `missing_credential` and the
 * gate measures the wrong thing.
 *
 * It still comes before the material, and since `ICS-09` that ordering buys more
 * than it used to: a refusal that has already read the source is a refusal that
 * pulled unannounced dates and spaces under negotiation into this process for no
 * reason. The discipline this script is asked for is *never a partial run* — if
 * the run cannot finish, it does not start, and it does not read.
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
 * Gate 4 — the material, read from the registered address
 *
 * ⚠ **This block had no analogue to copy from and was written from nothing.**
 * There is exactly one call to the platform's HTTP reader outside a browser
 * anywhere in this repository — `scripts/rls-baseline.mjs` — and it has **no
 * timeout** and distinguishes only *not-OK* from *not-JSON*. The one piece of
 * code here that IS copied whole is the secrecy list, which that same file owns
 * and which this file already uses.
 *
 * ── ⚠ THE FOUR WAYS THIS CAN FAIL ARE FOUR, AND NEVER ONE ───────────────────
 *
 * Defence 3 of D-58-07, and the *zero silent failures* gate taken from the hard
 * side: distinguish the causes **without echoing what produced them**. This
 * project has already paid once for a `catch` that collapsed them — the
 * newsletter form answering *«qualcosa è andato storto»* to a network problem, a
 * missing key and an address already subscribed alike, recorded in
 * `.planning/codebase/CONCERNS.md`.
 *
 *   `feed_unreachable`     nothing answered: network, name resolution, or the
 *                          timeout fired
 *   `feed_unauthorised`    an answer arrived and it was 401, 403 or 404 — the
 *                          address no longer grants this calendar, which is the
 *                          expected shape after a re-publication invalidates the
 *                          old one
 *   `feed_unavailable`     an answer arrived with any other non-2xx status. Kept
 *                          apart from the one above ON PURPOSE: a reader chasing
 *                          a 503 looks at the provider, a reader chasing a 403
 *                          looks at the registration, and one label for both
 *                          sends half of them to the wrong place
 *   `feed_not_a_calendar`  a 2xx whose body is not a readable calendar — bounds
 *                          exceeded, or the parser refused it
 *
 * and the fourth family of the requirement, *too small*, is the feed guard —
 * which likewise answers in **two** categories rather than one, for the reason
 * `src/lib/production/ics/guard.ts` states: only one of the two can ever be
 * authorised.
 *
 * ── ⚠ NOTHING IS PERSISTED, AND NOTHING OF THE BODY IS PRINTED ──────────────
 *
 * Defences 1 and 2. The body is read inside the function below and **never
 * leaves it**: what comes out is the parse result, the byte size and the line
 * count. Nothing writes it to disk, the request is made with no store, and no
 * refusal on this path interpolates a single character of it — a parser refusal
 * carries the parser's own reason code, which is a word from a closed
 * vocabulary and not a quotation.
 * ──────────────────────────────────────────────────────────────────────────── */

/**
 * How long this run waits for the calendar, in milliseconds.
 *
 * ⚠ Chosen, not measured — same discipline as the guard's floor. It exists
 * because from plan 58-12 nobody is watching: a read with no bound is a run that
 * does not end, and a scheduled job that does not end is one that never reports.
 */
const FEED_TIMEOUT_MS = 20_000;

/**
 * Reads the calendar and returns **the parse and two counts**. Never the body.
 *
 * @returns `{ parsed, byteSize, physicalLineCount }`
 */
async function readRegisteredFeed() {
  let response;
  try {
    response = await globalThis.fetch(feedAddress, {
      // Defence 2: no HTTP cache anywhere along the path. A cached calendar is a
      // copy of the material sitting somewhere nobody declared.
      cache: "no-store",
      redirect: "follow",
      headers: {
        "cache-control": "no-store",
        accept: "text/calendar",
      },
      signal: AbortSignal.timeout(FEED_TIMEOUT_MS),
    });
  } catch (error) {
    // ⚠ **The name and the system code, never `error.message`.** A network
    // message routinely interpolates the host — *getaddrinfo ENOTFOUND ‹host›* —
    // and while the host is a registered secret and would be redacted, the rule
    // this file keeps is to not print the thing rather than to rely on the net
    // catching it. `name` distinguishes a timeout from a failed connection and
    // `cause.code` is a symbolic constant that names nothing.
    const symptom = `${error?.name ?? "error"}${
      typeof error?.cause?.code === "string" ? ` / ${error.cause.code}` : ""
    }`;
    refuse(
      "feed_unreachable",
      `the registered source did not answer within ${FEED_TIMEOUT_MS}ms, or could not be ` +
        `reached at all: ${symptom}. Nothing was read, so nothing was written. The ` +
        "address itself is not printed."
    );
  }

  if (response.status === 401 || response.status === 403 || response.status === 404) {
    refuse(
      "feed_unauthorised",
      `the registered source answered ${response.status}: this address no longer grants ` +
        "this calendar. That is what a re-publication looks like from here — the old " +
        `address stops working. Re-register ${feedSourceVariableName} with the new one.`
    );
  }

  if (!response.ok) {
    refuse(
      "feed_unavailable",
      `the registered source answered ${response.status}. That is the provider refusing ` +
        "or failing for a reason that is not access — it is reported apart from the " +
        "access case so that whoever reads this looks at the right place."
    );
  }

  const body = await response.text();
  const bytes = Buffer.byteLength(body, "utf8");
  const lines = body.split(/\r?\n/).length;

  if (bytes > ics.MAX_INPUT_BYTES) {
    refuse(
      "feed_not_a_calendar",
      `what arrived is larger than the ${ics.MAX_INPUT_BYTES}-byte bound the parser ` +
        "declares. Something that size is not this calendar."
    );
  }
  if (lines > ics.MAX_INPUT_LINES) {
    refuse(
      "feed_not_a_calendar",
      `what arrived carries more than the ${ics.MAX_INPUT_LINES}-line bound the parser ` +
        "declares."
    );
  }

  /*
   * ⚠ THE ENVELOPE IS CHECKED HERE AND NOT LEFT TO THE READER, and it was added
   * after measuring what happens without it.
   *
   * The shared reader refuses only on the two bounds: handed a page of HTML it
   * comes back with no refusal and **zero entries**, and the run would then be
   * stopped one gate later by the feed guard — as `feed_empty`. That is the
   * wrong category, and the wrong category is the whole failure defence 3 of
   * D-58-07 exists against: `feed_empty` sends a person to look at their export,
   * when what actually happened is that the address answered `200` with somebody
   * else's page — a sign-in wall, a captive portal, a provider's error page.
   * Those are two different repairs.
   *
   * The literal below is an iCalendar keyword, not material.
   */
  if (!/^BEGIN:VCALENDAR/im.test(body)) {
    refuse(
      "feed_not_a_calendar",
      "the registered source answered successfully, but what came back is not a calendar " +
        "at all — it carries no calendar envelope. It is reported apart from an empty " +
        "calendar on purpose: an empty one means look at the export, this one means look " +
        "at the address."
    );
  }

  const result = ics.parseIcs(body);

  if (result.refusal !== null) {
    // The reason is the parser's own code — a member of a closed vocabulary —
    // and never a quotation of what it was reading.
    refuse(
      "feed_not_a_calendar",
      `the reader refused what arrived: ${result.refusal.reason}. A 2xx answer that is ` +
        "not a calendar is a different finding from an address that does not answer, and " +
        "it is reported as one."
    );
  }

  // The body goes out of scope here and is never returned, never stored and
  // never assigned to anything that outlives this call.
  return { parsed: result, byteSize: bytes, physicalLineCount: lines };
}

const feed = await readRegisteredFeed();
const parsed = feed.parsed;
const byteSize = feed.byteSize;
const physicalLineCount = feed.physicalLineCount;

// From here on, every exit — refusal, failure or success — is audited.
auditReady = true;

const distinctUids = new Set(parsed.events.map((event) => event.uid)).size;

say("");
say("  ── what arrived ──────────────────────────────────────────────────────");
say(
  `     ${byteSize} bytes · ${physicalLineCount} lines · ${parsed.events.length} entries · ` +
    `${distinctUids} distinct UIDs · ${parsed.malformed.length} malformed line(s)`
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

/**
 * Every word this file's entries carry — **titles and notes both**.
 *
 * ⚠ The note half was added the day the parser started reading `DESCRIPTION`,
 * and it went in first: a reader that reads notes before its redaction knows
 * about notes is a reader that can print one. The measured notes carry the name
 * of whoever is playing and the hour they play, so a UID derived from one is the
 * same leak as a UID derived from a title — and there is no argument for
 * measuring one and not the other.
 */
const titleTokens = new Set();
for (const event of parsed.events) {
  for (const token of tokensOf(event.summary)) titleTokens.add(token);
  for (const token of tokensOf(event.description)) titleTokens.add(token);
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
 * the seven production tables carry **no write policy at all** (D-44-22), exactly
 * as the catalogue tables do not (`formats/actions.ts:17-22`), so a cookie
 * client is refused for everybody and this is not a preference — it is the only
 * client that can write these rows.
 *
 * ⚠ **The untrusted-input half changed on 2026-08-20 and is written out rather
 * than left standing.** It used to read *the only input is a file on the machine
 * that holds the key*. Since `ICS-09` the input arrives **over the network**,
 * from an address, and the body is written by somebody else. What answers the
 * half now is that no part of that body reaches this client as an instruction:
 * it is parsed by pure modules into typed rows, the calendar key that scopes
 * every removal comes from an ARGUMENT and never from the body (D-58-05,
 * *the scope is declared, not deduced*), and the guard below decides whether the
 * run may proceed on a **count**. Content from an address is data. It is never a
 * command — `ai-engineering.md`, gate *prompt security*, is the same rule for a
 * different reader.
 *
 * The product still has no HTTP surface that receives a calendar, and that half
 * of D-44-26 did not fall.
 */
const db = createClient(credentials.url, credentials.serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

/** Logs `error.code` and `error.message`. Never the object, never its third field. */
function describe(error) {
  return `${error?.code ?? "no_code"}: ${error?.message ?? "no message"}`;
}

/* ────────────────────────────────────────────────────────────────────────────
 * Gate 5 — the feed guard (`ICS-10`, guard a)
 *
 * ⚠ **It runs HERE, which is before every removal and before the plan is even
 * built.** The order is the point: a run that is going to refuse should refuse
 * having done as little as possible, and a run that refuses on this gate has
 * opened no transaction, taken no snapshot and deleted nothing. The exit is `2`,
 * which in this repository means *nothing was written* — so *nothing failed*.
 *
 * The comparison is **two counts and nothing else**, and the predicate that
 * makes it lives in `src/lib/production/ics/guard.ts`, where the threshold is
 * declared as a policy that was chosen rather than measured. Read that module
 * before changing the number here, because the number is not here.
 *
 * ⚠ **The previous count comes from the register, not from the tables.** The
 * question is *how much did the last successful mirror of THIS calendar carry*,
 * and only `production_import_run` answers it: counting rows in the mirrored
 * tables would count what is there now, which is exactly what a half-finished
 * previous run would have made wrong. A dry run writes no register row (this
 * file's header says why), so the previous count is always the last **applied**
 * one.
 * ──────────────────────────────────────────────────────────────────────────── */

const lastRun = await db
  .from("production_import_run")
  .select("entries_seen")
  .eq("calendar_key", calendarKey)
  .eq("dry_run", false)
  .not("finished_at", "is", null)
  .order("finished_at", { ascending: false })
  .limit(1);

if (lastRun.error) {
  // Not folded into the catalogue's category: a register this run cannot read is
  // a guard this run cannot apply, and proceeding as though there were no
  // previous mirror would turn an unreadable register into permission to delete.
  refuse(
    "register_unreadable",
    `the import register could not be read, so the feed guard cannot be applied — ` +
      `${describe(lastRun.error)}. It is refused rather than treated as a first run: ` +
      "a first run is allowed to write, and that is not something to infer from an error."
  );
}

/**
 * How many entries the last applied mirror of this calendar carried.
 *
 * ⚠ `null` and `0` are different answers and stay different: `null` is *there is
 * no previous applied mirror for this key* — the first pass, which the guard
 * cannot forbid. A row whose `entries_seen` is genuinely absent is treated the
 * same way for the same reason, and that is the conservative direction only
 * because the empty-feed rule below fires regardless of what came before.
 */
const previousEntries =
  lastRun.data.length === 0 || lastRun.data[0].entries_seen === null
    ? null
    : lastRun.data[0].entries_seen;

const feedVerdict = ics.mirrorGuard({
  previousEntries,
  currentEntries: parsed.events.length,
});

say("");
say("  ── the feed guard ────────────────────────────────────────────────────");
if (previousEntries === null) {
  say(
    `     no previous applied mirror for this calendar · ${parsed.events.length} entr(y/ies) ` +
      "arriving. A first pass is admitted; the guard cannot forbid the beginning."
  );
} else {
  say(
    `     previous ${previousEntries} · arriving ${parsed.events.length} · floor ` +
      `${ics.mirrorShrinkMargin(previousEntries)} (${ics.MIRROR_SHRINK_FLOOR} of the previous)`
  );
}

if (feedVerdict === "feed_empty") {
  refuse(
    "feed_empty",
    "what arrived carries no entries at all. That is a wrong export or a source that " +
      "stopped answering with a calendar — it is never a decision, and no argument " +
      "authorises it. Nothing was removed."
  );
}

if (feedVerdict === "feed_shrank" && !options.acceptShrink) {
  refuse(
    "feed_shrank",
    "what arrived is smaller than the declared floor, so this run would have deleted " +
      "the calendar and written back less than it removed. The floor is a policy that " +
      "was chosen and not measured, and it errs towards refusing. If the calendar really " +
      "did lose those entries, say so with --accept-shrink; the report will record that " +
      "you did."
  );
}

if (feedVerdict === "feed_shrank") {
  // The authorised exit, recorded — the same shape as the renumbering
  // re-authorisation, and for the same reason: a guard that can be walked past
  // silently is a guard nobody can audit afterwards.
  say(
    "     ⚠ AUTHORISED: --accept-shrink was passed, so a source below the floor is being " +
      "mirrored anyway. This line is the record of that decision."
  );
} else {
  say("     ✓ admitted.");
}
say("");

/**
 * One read, and a **label** that is not the table's own name.
 *
 * The label exists for one reason and it is worth stating rather than looking
 * arbitrary: every one of the seven tables is named with a prefix that is also an
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

/* ── what the NOTES said, and what they did not ───────────────────────────────
 *
 * Four counts, and they are four because they answer four different questions
 * about the same property. Rolling them into *"notes read"* would hide the two
 * that matter most: how many nights owe their progressivo to a note rather than
 * to a title, and how many lines this run **saw and refused to read**.
 *
 * ⚠ Every one of them is a COUNT. A note names whoever is playing on a date
 * nobody has announced, so nothing here prints a word of one — and the output
 * audit at the bottom is what measures that rather than this comment asserting
 * it.
 */
const entriesWithNote = parsed.events.filter((event) => event.description.length > 0);
const notesRead = entriesWithNote.filter(
  (event) => ics.readNoteDeclaration(event.description) !== null
).length;
const nightsNumberedByNote = classified.nights.filter(
  (night) => night.numberSource === "note"
).length;
const piecesWithDeclaredNight = classified.pieces.filter(
  (piece) => piece.declaredNightKey !== null
).length;
/* ── THE LINE-UP, READ BY THE SLOT ────────────────────────────────────────────
 *
 * Owner's decision, 2026-08-22: the line-up stops being declared unread. The
 * same decision carried the correction that shapes this block:
 *
 *     A LIVECUT IS COUNTED FROM THE SLOTS, NEVER FROM THE NAMES. A B2B IS ONE
 *     RECORDING, NOT TWO.
 *
 * So a slot is a note line that **ends in a window**, and a note line that is a
 * bare name is deliberately NOT one — a night's own note lists its people
 * without windows, and those are exactly the lines a counter must not count.
 * Measured on this run's own feeds: one night carries six names in five slots.
 *
 * ⚠ **A slot is gathered from whichever note declares it, and merged by window.**
 * The same slot is routinely written twice — once by a timetable that names who
 * plays it, once by the LiveCut of that set which names only its part — and they
 * are one slot. The named version wins; the count is unaffected either way.
 *
 * ⚠ **Nothing below prints a name.** The slot values carry people playing on
 * dates nobody has announced. They reach a column and stop there; every line
 * this block says is a count, and the audit at the foot of this run is what
 * measures that rather than this comment asserting it.
 */
const eventByUid = new Map(parsed.events.map((event) => [event.uid, event]));

/** night join key → Map<"start|end", { slot, sourceUid }>. Merged by window. */
const lineupSlotsByNight = new Map();

function gatherSlots(nightKey, uid) {
  if (nightKey === null || nightKey === undefined) return;
  const event = eventByUid.get(uid);
  if (event === undefined) return;

  const slots = ics.readNoteSlots(event.description);
  if (slots.length === 0) return;

  if (!lineupSlotsByNight.has(nightKey)) lineupSlotsByNight.set(nightKey, new Map());
  const windows = lineupSlotsByNight.get(nightKey);

  for (const slot of slots) {
    const window = `${slot.startTime}|${slot.endTime}`;
    const already = windows.get(window);
    if (already !== undefined) {
      // Only ever FILLS IN. A note that names the players beats one that only
      // declared the window; two notes that both name them are left as the first
      // said, because picking between them here would be the guess this reader
      // never makes.
      if (already.slot.artists.length === 0 && slot.artists.length > 0) {
        windows.set(window, { slot, sourceUid: event.uid });
      }
      continue;
    }
    windows.set(window, { slot, sourceUid: event.uid });
  }
}

for (const night of classified.nights) gatherSlots(night.key, night.uid);
for (const piece of classified.pieces) {
  const declared =
    piece.declaredNightKey !== null
      ? piece.declaredNightKey
      : piece.seriesCode !== null && piece.number !== null
        ? ics.joinKey(piece.seriesCode, piece.number)
        : null;
  gatherSlots(declared, piece.uid);
}

/**
 * The count the LiveCut rule reads: **rows of the slot table**, per night.
 *
 * ⚠ It used to be `party_credits`, one row per person, and this run reported
 * `0 night(s)` because nothing has ever filled that table — a zero where the
 * data existed and was not being collected. Both halves are fixed here: the
 * source is the calendar's own notes, and the unit is the slot.
 */
const lineupSlotCounts = new Map();
for (const [nightKey, windows] of lineupSlotsByNight) {
  lineupSlotCounts.set(nightKey, windows.size);
}

const lineupSlotTotal = [...lineupSlotsByNight.values()].reduce(
  (total, windows) => total + windows.size,
  0
);
const lineupSlotsNamed = [...lineupSlotsByNight.values()].reduce(
  (total, windows) =>
    total + [...windows.values()].filter((held) => held.slot.artists.length > 0).length,
  0
);
// Note lines that are neither the declaration nor a slot: bare names, without a
// window. Counted so that *they are not episodes* is a number somebody can see.
const lineupLinesWithoutWindow = entriesWithNote.reduce((total, event) => {
  const lines = event.description.split("\n").filter((line) => line.trim().length > 0);
  const slots = ics.readNoteSlots(event.description).length;
  return total + Math.max(0, lines.length - 1 - slots);
}, 0);

say("");
say("  ── what the notes said ───────────────────────────────────────────────");
say(
  `     ${entriesWithNote.length} entr(y/ies) carry a note · ${notesRead} read as ` +
    `<word> <NNN>, <date> · ${entriesWithNote.length - notesRead} declared UNREAD ` +
    "(left to the title alone, never guessed)"
);
say(
  `     ${nightsNumberedByNote} night(s) take their progressivo from a note rather than ` +
    `a title · ${piecesWithDeclaredNight} piece(s) arrive already naming their night`
);
say(
  `     ${classified.noteDisagreements.length} entr(y/ies) whose note contradicts their ` +
    "title — the TITLE stands, and the contradiction is counted, never corrected"
);
if (classified.noteDisagreements.length > 0) {
  for (const finding of classified.noteDisagreements) {
    say(`         ${printableUid(finding.uid)}  ${finding.reason}`);
  }
}
/* ── the calendar contradicting ITSELF ────────────────────────────────────────
 *
 * An entry whose note names **this very entry** — the note's leading word is the
 * title, character for character — and then declares a date the entry does not
 * sit on. One of them exists in the measured feeds.
 *
 * It is not the same thing as a note naming some other night, which is what
 * every piece's note does and is entirely normal. It is the calendar disagreeing
 * with itself in two places, and the way out is for a person to look at the
 * entry: either it was moved and the note was not, or the note was corrected and
 * the entry was not.
 *
 * ⚠ **It is counted here because otherwise it is silent.** The reader's refusal
 * to promote such an entry to a night is correct — attaching a night to a day
 * its own note contradicts is exactly the guess this module never makes — but
 * the consequence is that the entry falls quietly among the days taken by
 * somebody else, and a correct refusal that nobody is told about is the failure
 * shape `meta-gates.md` names first. There is no error tracking in this product,
 * so the observable effect has to be a line in this report.
 *
 * A COUNT, not a list of entries: the identifier is available through the digest
 * below, and the date itself is the one thing this script may never say.
 */
const notesContradictingTheirOwnDate = entriesWithNote.filter((event) => {
  const declaration = ics.readNoteDeclaration(event.description);
  if (declaration === null) return false;
  if (declaration.head.trim().toLowerCase() !== event.summary.trim().toLowerCase()) {
    return false;
  }
  const date = event.startDate;
  return (
    Number(date.slice(5, 7)) !== declaration.month ||
    Number(date.slice(8, 10)) !== declaration.day
  );
});

if (notesContradictingTheirOwnDate.length > 0) {
  say("");
  say(
    `     ⚠ ${notesContradictingTheirOwnDate.length} entr(y/ies) carry a note that names ` +
      "THIS entry and then declares a different date."
  );
  say("       The calendar disagrees with itself in two places. This run does NOT pick one:");
  say("       it leaves the entry where its title alone put it, which is visible and");
  say("       correctable. Either the entry was moved and the note was not, or the other");
  say("       way round — and only a person looking at it can say which.");
  for (const event of notesContradictingTheirOwnDate) {
    say(`         ${printableUid(event.uid)}  note_declares_a_different_date`);
  }
}

say("");
say("  ── the line-up, by the slot ──────────────────────────────────────────");
say(
  `     ${lineupSlotsByNight.size} night(s) declare a line-up · ${lineupSlotTotal} slot(s) · ` +
    `${lineupSlotsNamed} of them name who plays`
);
say(
  "     ⚠ ONE LIVECUT PER SLOT, NEVER PER NAME. Two artists back to back are one set,"
);
say(
  "       so counting the people plans an episode nobody owes. A slot that names nobody"
);
say(
  "       still counts: its window was declared, only its names were not."
);
say(
  `     ${lineupLinesWithoutWindow} further note line(s) are names WITHOUT a window and are ` +
    "deliberately not slots."
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
  say("     entries nobody is allowed to guess at — identifier and reason code, never a title:");
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

/**
 * The slots already stored for the nights in scope.
 *
 * ⚠ **Read for ONE reason: the snapshot.** Like the checklist, this table
 * carries no calendar key of its own and hangs off the plan row with a cascade,
 * so the removal below takes its rows away — and a snapshot that did not cover
 * them would be a copy of something other than what got removed
 * (`ai-engineering.md`, gate *un'istantanea prima copre cio' che si tocca*).
 *
 * ⚠ **These rows carry people's names, and they are never printed.** They go
 * into the snapshot file — the same one that already carries `ticked_by_name`,
 * written only to a directory git itself confirms is ignored — and into no line
 * this run says. Unlike a tick, a slot is not human state: the write-back below
 * rebuilds it from the feed, which is why the restore path does not put slots
 * back and does not need to.
 */
let lineupSlotRows = [];
if (scopedPlanIds.length > 0) {
  const read = await db
    .from("production_lineup_slot")
    .select("id, plan_id, source_uid, start_time, end_time, artists, sort_order")
    .in("plan_id", scopedPlanIds);
  if (read.error) {
    refuse(
      "catalogue_unreadable",
      `reading the stored line-up failed — ${describe(read.error)}`
    );
  }
  lineupSlotRows = read.data ?? [];
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
/*
 * ⚠ TWO COUNTS, NOT ONE, AND THE SECOND ONE IS WHY THIS PLAN EXISTS.
 *
 * A checklist row carries a decision in either direction. Ticked: an actor and
 * an instant. UN-ticked: an actor and NO instant, because clearing the instant
 * is how an untick is written — `record_checklist_tick` says so in one statement
 * and its migration says so in prose. So a single count of *items that carry a
 * tick* reports zero over a calendar that holds a person's decision, and that is
 * exactly what it did: measured 0 and 1 on 2026-08-24.
 *
 * Neither number names anybody. They are counts.
 */
const tickedItems = existing.checklistItems.filter((item) => item.tickedAt !== null).length;
const untickedItems = existing.checklistItems.filter(
  (item) => item.tickedAt === null && (item.tickedBy !== null || item.tickedByName !== null)
).length;
const linkedNights = planRows.filter((row) => row.linked_party_id !== null).length;

say("");
say("  ── what this calendar already holds ──────────────────────────────────");
say(
  `     plans ${planRows.length} · pieces ${pieceRows.length} · ` +
    `commitments ${commitmentRows.length} · checklist items ${checklistRows.length}`
);
say(
  `     ${tickedItems} of those items carry a tick and ${untickedItems} carry an UNTICK — ` +
    `both are decisions with an author. ${linkedNights} night(s) stand behind an ` +
    "announced one."
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


/* ── WHERE THE EPISODE COUNT COMES FROM, AND WHERE IT USED TO ────────────────
 *
 * It comes from {@link lineupSlotCounts}, built far above out of this run's own
 * notes, one entry per **slot**. It is not rebuilt here.
 *
 * ⚠ **It used to come from `party_credits`, joined through
 * `production_plan.linked_party_id`, ONE ROW PER PERSON.** Two things were wrong
 * with that and only one of them was visible:
 *
 *   1. **Visible.** That table holds zero rows and no plan row carries a link,
 *      so this line reported `0 night(s) have a structured line-up` — a zero
 *      where the data existed, in the calendar, and was simply not being
 *      collected. A zero that means *not collected* is the third answer arriving
 *      dressed as a measurement, which this file forbids everywhere else.
 *   2. **Invisible, and worse.** It counted **people**. A LiveCut is the
 *      recording of a set, and two artists playing back to back are one set —
 *      so a night with six names in five slots would have been told it owes six
 *      episodes. The sixth cannot exist, and nobody would have found out until
 *      the day it was due. Corrected by the owner on 2026-08-22; the field is
 *      called `lineupSlotCounts` now so the name stops instructing the next
 *      reader to count the wrong thing.
 *
 * A night missing from the map is *not yet knowable*, which is a different
 * answer from zero: it produces `depends_on_lineup` rather than a figure, so a
 * night whose line-up nobody has written does not silently get told it owes no
 * episodes (D-44-13, OBS-03).
 */
say(
  `     ${lineupSlotCounts.size} night(s) have a structured line-up this run can count, ` +
    `${lineupSlotTotal} slot(s) between them. The rest are not-yet-knowable, which is not zero.`
);

/* ────────────────────────────────────────────────────────────────────────────
 * Stage 5 — the plan of writes
 * ──────────────────────────────────────────────────────────────────────────── */

/**
 * The sigle this file names — and **only** the ones it names.
 *
 * ⚠ THE `null` IS FILTERED HERE, AND IT IS NOT A REPAIR: IT IS A CASE THAT DOES
 * NOT BELONG IN THIS LIST. Since `ICS-04`/`ICS-05` a piece may legitimately
 * carry `seriesCode === null` — the bare title that names no series, which
 * `reconcile` joins to a night by date in its second pass. A piece without a
 * series **has no series pipeline, by definition**: there is no sigla to build a
 * `SeriesPipeline` for, and `reconcile` already searches every pipeline for such
 * a piece rather than one (`reconcile.ts`, *WHICH SERIES MAY ANSWER FOR THIS
 * PIECE*). Letting the null through built a pipeline whose `seriesCode` was
 * `null` and `indexPipelines` died on it with a bare `TypeError` — measured
 * 2026-08-20 against the live feed, 16 of 17 pieces on one calendar and 8 of 8
 * on another. No synthetic gate could have caught it: it needs a real feed.
 *
 * ⚠ **`??` and `|| ""` are forbidden here**, and this is the reason spelled out
 * so nobody re-adds one as a one-line tidy-up: an empty-string sigla would
 * become a live key in the pipeline `Map`, and every series-less piece in the
 * file would then inherit that one bucket's rules. A piece measured against
 * another series' anchors is a wrong `conforms_to_rule` stored on a row, which
 * is worse than the crash it replaced.
 *
 * The filter also keeps the null out of `auditOwnOutput`'s `publicTokens`, where
 * it is a third harm rather than the same one twice: a `null` there is either a
 * throw inside the leak check or the literal word *null* allow-listed out of it.
 */
siglaInFile = [
  ...new Set(
    [...classified.nights, ...classified.pieces]
      .map((entry) => entry.seriesCode)
      .filter((code) => code !== null)
  ),
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
    lineupSlotCounts,
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
say("       night that could have tickets on sale. They are not written again either.");

const survivorsAbsentFromFile = plan.plansThatSurviveDeletion.filter(
  (row) => row.absentFromFile
).length;
say(
  `     of those, ${survivorsAbsentFromFile} survived an ABSENCE — the file no longer ` +
    "carries the entry. That number is the one to look at: the cause could be a"
);
say("       partial export or the wrong file, and it is a finding, not a tidy-up.");

say(
  `     puts back    ${plan.decisionsToRestore.length} checklist decision(s) and ` +
    `${plan.linksToRestore.length} link(s), with their ORIGINAL actor and instant. ` +
    "A restore is not an act."
);
{
  const backTicked = plan.decisionsToRestore.filter((row) => row.decision === "ticked").length;
  say(
    `       of those decisions, ${backTicked} are ticks and ` +
      `${plan.decisionsToRestore.length - backTicked} are UNTICKS. An untick has an ` +
      "author and no instant, and no feed can rebuild either one."
  );
}
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

/* ── how much of this join is derivation ──────────────────────────────────────
 *
 * Printed as two numbers rather than one, because *the calendar said which
 * night* and *a rule worked out which night* are not the same claim. The second
 * is the one with two ways to be wrong, and it is the one this run should want
 * to see shrinking.
 */
{
  const bySource = plan.numberlessAttachmentsBySource;
  say("");
  say(
    `     pieces with no progressivo, placed: ${bySource.declared} by the night their ` +
      `NOTE names · ${bySource.window} by a date window`
  );
  if (bySource.declared === 0 && bySource.window > 0) {
    // Not a failure. It is the state the calendar is in when no note names a
    // night this file also carries — and saying so is cheaper than letting a
    // reader conclude the note path is broken.
    say(
      "       none was placed by declaration: either the notes name no night this file " +
        "carries, or the words they use have no alias yet."
    );
  }
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
 * The guard of the unattended run — deferred item 3, point 2
 *
 * ⚠ **It runs HERE: after the plan is built and before ANYTHING is written**,
 * not even the snapshot. Exit `2`, which in this repository means nothing was
 * written, so nothing failed.
 *
 * WHAT IT PROTECTS, and it is one row rather than a category. Every row in the
 * six mirrored tables is re-derivable from the calendar: delete it and the next
 * successful mirror puts it back. **A tick is not.** The calendar does not
 * record who ticked a box, so a tick is the only state in this system that a
 * half-dead run loses for good — with no transaction across the gap and no
 * point-in-time recovery behind it.
 *
 * On 2026-08-20 the first one was pressed, inside a scope a mirror deletes. The
 * deferred item that asked for this guard had named that exact moment as its
 * trigger, in advance, while the count was still zero.
 *
 * ⚠ **The counts come from the plan and are not counted a second time here.**
 * `decisionsToRestore` and `linksToRestore` ARE the two exceptions of state of
 * `ICS-03` — collected by the module that owns the definition, before any
 * removal. Counting them again in this file would be a second spelling of one
 * fact, which is how two spellings start to differ.
 *
 * ⚠ **And the first of those two lists used to be narrower than this guard
 * needed, which is the defect this run's shape now forbids.** It held the rows
 * carrying an INSTANT, so a scope with one untick and no tick was counted `0`,
 * this guard answered `ok`, and an unwatched run would have deleted a person's
 * decision with no number in this report going down. One list, two readers: the
 * writer puts back exactly what the guard counted, and a run that would not put
 * something back is a run this guard refuses.
 *
 * ⚠ **A dry run does not refuse, it REPORTS.** Nothing is written on that path,
 * so there is nothing to protect; what a person needs there is to know what the
 * unattended path would answer, before they hand this calendar to one.
 *
 * ── ⚠ THE LIMIT OF WHERE THIS SITS, STATED RATHER THAN LEFT TO BE FOUND ─────
 *
 * By the time this guard can answer, **the feed has already been read**: its
 * counts live in the database, the client that reads them is created after the
 * source is fetched, and the fetch happens at gate 4. So a refusal here has
 * pulled unannounced dates into this process for a run that will write nothing.
 * That is a narrower harm than a deletion and it is not nothing, and the repair
 * — moving the fetch after the scope read — is a restructuring of this file's
 * gate order, which has its own contract and its own gate. It is not undertaken
 * here, and it is written down instead of being discovered later.
 * ──────────────────────────────────────────────────────────────────────────── */

const supervision = ics.runSupervision({
  // `process.stdin.isTTY` is `undefined` rather than `false` when there is no
  // terminal, so the comparison is explicit: the predicate is total, and this
  // side of the boundary should not depend on that.
  interactiveTerminal: process.stdin.isTTY === true,
  declaredUnattended: options.unattended,
});

const unattendedVerdict = ics.unattendedMirrorGuard({
  supervision,
  decisionsAtRisk: plan.decisionsToRestore.length,
  // NOT the length of the restore list. See `ReconcilePlan.linksAtRisk`: the
  // list is over-collected on purpose, and a link on a row `ICS-03b` keeps out
  // of the deletion is not something this run could lose.
  linksAtRisk: plan.linksAtRisk,
  restorePathVerified: ics.MIRROR_RESTORE_PATH_VERIFIED,
});

say("");
say("  ── the second guard ──────────────────────────────────────────────────");
say(
  `     ${supervision} · at stake ${plan.decisionsToRestore.length} decision(s) + ` +
    `${plan.linksAtRisk} link(s) at risk ` +
    `(${plan.linksToRestore.length} put back, ` +
    `${plan.plansThatSurviveDeletion.length} on rows that never leave) · way back exercised: ` +
    `${ics.MIRROR_RESTORE_PATH_VERIFIED ? "yes" : "NO"}`
);

if (unattendedVerdict !== "ok" && options.apply) {
  refuse(
    "unattended_state_at_risk",
    "nobody is watching this one, and what it would delete holds state no calendar " +
      "can rebuild: the file does not say who ticked a box, nor who un-ticked one. " +
      "There is no transaction " +
      "across the gap and no way back that has ever been exercised. Nothing was " +
      "removed. Two ways forward, and they are different decisions: run it where a " +
      "person can see it, or exercise the way back once and record that it worked."
  );
}

if (unattendedVerdict !== "ok") {
  say("     ⚠ an unwatched run would REFUSE here. This one writes nothing anyway.");
} else if (supervision === "attended") {
  say("     ✓ admitted — a person is here, so the way back is theirs to take.");
} else {
  say("     ✓ admitted — nothing at stake that a second pass could not put back.");
}
say("");

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
      payload.rows.checklistItems.length +
      payload.rows.lineupSlots.length,
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
  /**
   * ⚠ **THE SNAPSHOT CARRIES ITS OWN INSTANT, and the file name does not count
   * as one.** `P-58-C` step 3 has to check this snapshot against the run that
   * died — an older one belongs to a different pass, and restoring from it puts
   * back ticks that were deliberately removed in between. A name can be typed,
   * copied, renamed by an archiver or produced by a clock nobody controls; the
   * only instant worth checking is one written inside by the process that took
   * it. Without this field the restore path refuses, which is the direction that
   * costs a person an evening rather than a tick.
   */
  takenAt: new Date().toISOString(),
  /**
   * What shape this file is, so a reader can refuse an unknown one instead of
   * guessing at it. It is a constant, not a version number to be negotiated:
   * when the shape changes, so does this word, and a restore path that does not
   * recognise it stops.
   *
   * ⚠ **The wording avoids every word its reader prints, and that is not
   * fussiness.** The restore path audits its own transcript against every string
   * in this file, with no exemption list. A marker sharing a word with one of
   * that reader's refusal categories would make every such refusal go red on
   * itself — the check failing on the very field this project wrote. Measured
   * on 2026-08-22 with the obvious spelling, which carried the word its
   * categories are named after.
   */
  shape: ics.MIRROR_SNAPSHOT_SHAPE,
  calendarKey,
  /**
   * ⚠ **`decisions`, and it used to be `ticks` — the rename is why the shape
   * marker moved for the first time.**
   *
   * The reader's field contract is untouched: an entry still carries the plan's
   * `source_uid`, the item's `kind` and `label`, and the three trace columns. What
   * changed is **which rows are in the list** — an untick travels now, with its
   * author and a null instant — and that is a change of MEANING rather than of
   * shape. A reader that took the old name to mean *the ticks* would be right
   * about a `mirror-state-1` file and wrong about this one, so the two files say
   * which they are.
   *
   * ⚠ **And the old marker stays readable.** `restore-mirror-snapshot.mjs`
   * accepts both and reads whichever field is present: the snapshots already on
   * disk are the way back for a run that died before today, and making them
   * unreadable to buy a name would cost the one row nothing else can rebuild.
   */
  decisions: plan.decisionsToRestore,
  links: plan.linksToRestore,
  rows: {
    plans: planRows,
    pieces: pieceRows,
    commitments: commitmentRows,
    checklistItems: checklistRows,
    /**
     * ⚠ **Added 2026-08-22, and the shape marker above deliberately did NOT
     * change.** That marker names the contract the RESTORE path reads — the
     * instant, the ticks and the links — and that contract is untouched: the
     * restore path does not look at `rows` at all. Bumping it would have made
     * every snapshot taken today unreadable by the only tool that can put a tick
     * back, which is the direction that costs a person the one row nothing else
     * can rebuild.
     *
     * These rows are here because the removal takes them, not because anything
     * gives them back: a slot is rebuilt from the feed on the next run.
     */
    lineupSlots: lineupSlotRows,
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

/**
 * A write whose EFFECT is measured rather than merely attempted.
 *
 * ⚠ `step` above cannot tell a restore that landed from one that matched no
 * row: `supabase-js` answers `{ data: null, error: null }` for an `UPDATE` whose
 * `WHERE` selects nothing. A counter next to the call therefore counts attempts,
 * and the line that reads it says *put back N checklist decision(s) … with the
 * original actor and instant* while nothing was written.
 *
 * The miss is reachable. The deletion above removes checklist items for EVERY
 * scoped plan, survivors included, while the rewrite only recreates items for
 * the nights the file still carries — so a linked night that has left the file
 * keeps its plan row and loses its checklist, and `(plan_id, kind, label)`
 * matches nothing. Labels carry a progressivo (`LiveCut 3`), so a changed
 * timetable produces the same miss on a night that never left.
 *
 * That tick is the one piece of production state no feed can rebuild.
 *
 * @returns how many rows the write actually touched
 */
async function stepCounting(category, action) {
  const { data, error } = await action();
  if (error) failPartway(category, describe(error), completedSteps);
  completedSteps += 1;
  return data?.length ?? 0;
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

  // The line-up, by the same selector and for the same reason. The cascade on
  // `plan_id` would take these rows anyway when a night goes — but the survivors
  // of `ICS-03b` do not go, and leaving their slots behind would produce a
  // line-up half from this run and half from a previous one. Explicit, so the
  // number is one somebody counted rather than a side effect nobody saw.
  await step("remove_lineup", () =>
    db.from("production_lineup_slot").delete().in("plan_id", scopedPlanIds)
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

/* ── the line-up, written back BY THE SLOT ───────────────────────────────────
 *
 * ⚠ **One row per slot, and the array is where several people go.** A b2b is one
 * set and therefore one LiveCut, so the schema that stores it has to make the
 * obvious count — `count(*)` — the right count. A table with one row per person
 * would have made the wrong count the easy one.
 *
 * ⚠ **This is the only place in this script where a person's name is written
 * anywhere.** It goes into a column behind row-level security. Nothing about
 * these rows is printed: the line below is a count, and a failure is reported by
 * `error.code` and `error.message` and never by PostgREST's third field, which
 * carries the whole rejected row.
 */
const lineupRowsToWrite = [];
for (const [nightKey, windows] of lineupSlotsByNight) {
  const planId = planIdByKey.get(nightKey);
  if (planId === undefined) continue;
  let order = 0;
  for (const held of [...windows.values()].sort((a, b) =>
    a.slot.startTime.localeCompare(b.slot.startTime)
  )) {
    lineupRowsToWrite.push({
      plan_id: planId,
      source_uid: held.sourceUid,
      start_time: held.slot.startTime,
      end_time: held.slot.endTime,
      artists: held.slot.artists,
      sort_order: order,
    });
    order += 1;
  }
}

const lineupUnplaced = lineupSlotTotal - lineupRowsToWrite.length;
if (lineupUnplaced > 0) {
  say(
    `     ⚠ ${lineupUnplaced} slot(s) name a night this run did not write, so they were ` +
      "not created. That is a finding, not a tidy-up."
  );
}

if (lineupRowsToWrite.length > 0) {
  await step("write_lineup", () =>
    db.from("production_lineup_slot").insert(lineupRowsToWrite)
  );
  say(
    `     line-up: ${lineupRowsToWrite.length} slot(s) written across ` +
      `${new Set(lineupRowsToWrite.map((row) => row.plan_id)).size} night(s). ` +
      "One LiveCut is owed per slot, never per name."
  );
}

/* ── The re-attachment — the two exceptions of state (`ICS-03`) ─────────────
 *
 * ⚠ **A RESTORE IS NOT AN ACT.** The ticks go back with their ORIGINAL instant
 * and their ORIGINAL actor, written straight to their columns with the service
 * client. They do **not** go through the tick-recording function, which
 * re-records who ticked on every call, by a decision that function's own
 * migration states — running a restore through it would attribute every decision
 * in the calendar to whoever launched this import. And it could not express an
 * untick's restore at all: that function takes a direction and writes `now()` or
 * `NULL` accordingly, so it would put back the direction and lose the actor's
 * identity in the same statement.
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
  const touched = await stepCounting("restore_link", () =>
    db
      .from("production_plan")
      .update({ linked_party_id: link.linkedPartyId })
      .eq("id", planId)
      .select("id")
  );
  if (touched === 0) {
    say(
      "     ⚠ a link matched NO row: the night was written, but this update touched " +
        "nothing. The snapshot still holds it. That is a finding."
    );
    continue;
  }
  linksRestored += touched;
}

let decisionsRestored = 0;
let decisionsUnplaced = 0;
let unticksRestored = 0;
for (const decision of plan.decisionsToRestore) {
  const planId = planIdBySourceUid.get(decision.planSourceUid);
  if (planId === undefined) {
    decisionsUnplaced += 1;
    continue;
  }
  const touched = await stepCounting("restore_decision", () =>
    db
      .from("production_checklist_item")
      .update({
        // The originals. Not now, and not whoever is running this.
        //
        // ⚠ `ticked_at` is NULL on an untick, and writing that null is the whole
        // restore of that direction: the row comes out of the rewrite with all
        // three columns empty, so putting the actor back without the null would
        // be putting back half a trace. The two columns below carry the half the
        // calendar cannot rebuild; this one carries which way the person decided.
        ticked_at: decision.tickedAt,
        ticked_by: decision.tickedBy,
        ticked_by_name: decision.tickedByName,
      })
      .eq("plan_id", planId)
      .eq("kind", decision.kind)
      .eq("label", decision.label)
      .select("id")
  );
  if (touched === 0) {
    // The night was written; this item was not. Its label carries a progressivo,
    // so a changed timetable renames it — and a linked night absent from the
    // file keeps its plan row while losing its checklist entirely.
    decisionsUnplaced += 1;
    continue;
  }
  decisionsRestored += touched;
  if (decision.decision === "unticked") unticksRestored += 1;
}

say(
  `     put back: ${decisionsRestored} checklist decision(s) — of which ${unticksRestored} ` +
    `UNTICK(s) — and ${linksRestored} link(s), with the original actor and instant.`
);
say(
  `     and these are ROWS TOUCHED, read back from each write — not attempts counted ` +
    "beside it."
);
if (decisionsUnplaced > 0) {
  say(
    `     ⚠ ${decisionsUnplaced} decision(s) did not land: either the night was never ` +
      "written, or it was and the item was not — a renamed label, or a checklist the " +
      "rewrite did not recreate. They stay in the snapshot and nowhere else. That is a " +
      "finding, and P-58-C is what reads it."
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
 * Every parsed title **and every parsed note**, stripped of the tokens that are
 * already public, must leave no token that occurs in the transcript — and no
 * four-digit year may appear in it either. Same device as check F of
 * `verify-ics-import.mjs`, same reason: the claim *this printed no material* is
 * worth having only when it is measured.
 *
 * ⚠ **The note half is the condition under which reading notes is admissible at
 * all**, not a refinement of it. A note carries the name of whoever is playing on
 * a date that has not been announced (`sound-manifesto.md`: *chi suona a una data
 * non ancora comunicata non si scrive qui e non si scrive nel repo*), and this
 * repository is public, so a note word in a transcript that gets pasted into a
 * tracked document is irreversible. It went in with the reading, in one commit.
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
    // ⚠ TITLE **AND** NOTE. The note half landed in the same commit as the
    // parser's reading of `DESCRIPTION`, and the ordering is the whole point: a
    // note names whoever is playing and at what hour, so extending the reading
    // without extending this audit would have made the claim *this printed no
    // material* stop covering the material most worth covering. The audit is not
    // the primary control — no path prints a note — but it is the half that is
    // measured rather than asserted.
    for (const source of [event.summary, event.description]) {
      let remainder = source;
      for (const token of publicTokens) {
        remainder = remainder.split(new RegExp(escapeForRegex(token), "gi")).join(" ");
      }
      for (const token of tokensOf(remainder)) residual.add(token);
    }
  }

  const printed = tokensOf(transcript.join("\n"));
  const leaked = [...residual].filter((token) => printed.has(token));
  const years = [...printed].filter((token) => /^(19|20)\d{2}$/.test(token));

  say("");
  if (leaked.length === 0 && years.length === 0) {
    const noted = parsed.events.filter((event) => event.description.length > 0).length;
    say(
      `  ✓ output audit: ${residual.size} residual token(s) across ${parsed.events.length} ` +
        `titles and ${noted} note(s), 0 of them in what this run printed · 0 four-digit years`
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
      `    ${leaked.length} of ${residual.size} residual token(s) of a title or a note occur ` +
        "above. They are " +
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
