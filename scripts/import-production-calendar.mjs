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
 * an issue. It prints **counts, identifiers and reason codes**, and it prints no
 * title, no date, no venue word, no line-up and **not even the name of the file
 * it read** — that name carries a date. A failure is logged with `error.code`
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
 * ── FOUR THINGS IT CANNOT DO, BY CONSTRUCTION ───────────────────────────────
 *
 *   1. **It writes nothing unless `--apply` is passed.** A dry run is the
 *      DEFAULT. A tool that writes production when invoked with no arguments is
 *      a tool that will one day be invoked with no arguments.
 *   2. **It removes nothing, ever.** There is no removal statement in this file
 *      and no list that could carry one. An entry missing from the file gets an
 *      `absent_since` stamp and a reported count. A partial export, a renamed
 *      `UID` or the wrong file must not wipe the archive, and a plan row already
 *      standing behind an announced night survives absence unconditionally,
 *      because removing it would orphan a night with tickets on sale.
 *   3. **It never touches the announced-night table** — `event_parties`, named
 *      here once, in the sentence forbidding it, and nowhere else. Announcing a
 *      night is a separate, deliberate act (D-44-06), and that single bridge is
 *      what makes renumbering structurally impossible rather than merely
 *      forbidden.
 *   4. **It never generates a progressivo.** No counter, no arithmetic on a
 *      stored number, no query for the highest one. A known `UID` arriving with
 *      a different number is reported as a divergence and written to no row —
 *      and the update payload built below carries no `number` field at all. The
 *      trigger `refuse_production_plan_renumber` from plan 44-04 is the second
 *      layer, the one that survives a caller who forgot this one.
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
 * ── ARGUMENTS ───────────────────────────────────────────────────────────────
 *
 *   `--dry-run`         print the plan and write nothing. **THE DEFAULT.**
 *   `--apply`           perform the writes. Must be passed explicitly.
 *   `--file <path>`     one snapshot, by path. Overrides the search.
 *   `--docs-dir <dir>`  where to search for the newest `.ics`. Defaults to
 *                       `docs/` beside this repository. The directory name
 *                       carries no date; a snapshot's file name does, which is
 *                       why the search prints neither.
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

import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { createHash } from "node:crypto";
import { registerHooks } from "node:module";
import { dirname, join, resolve } from "node:path";
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
 */
function failPartway(category, message, written) {
  say("");
  say(`  FAILED [${category}] — ${redact(message)}`);
  say("");
  say(`  ⚠ ${written} write step(s) had already completed and STAY WRITTEN.`);
  say("    Re-run with --dry-run first: the reconciler is keyed on the file's own");
  say("    UIDs, so a second pass plans only what the first did not finish.");
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
    // `--dry-run` is recorded rather than acted on, because it is already the
    // default. What it is FOR is the case below: passed together with `--apply`
    // it makes the invocation ambiguous, and the two orders of the same pair
    // must not mean two different things.
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
  say("  --dry-run         print the plan and write nothing. THE DEFAULT.");
  say("  --apply           perform the writes. Must be passed explicitly.");
  say("  --file <path>     one snapshot, by path.");
  say("  --docs-dir <dir>  where to search for the newest snapshot.");
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
 * Gate 1 — credentials, BEFORE the file is opened
 *
 * First on purpose. A refusal that has already read the material is a refusal
 * that did work it did not need to do, and the discipline this script is asked
 * for is *never a partial run*: if the run cannot finish, it does not start.
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
 * Gate 2 — the material
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
 * The module — read, never re-implemented
 *
 * Node resolves nothing extensionless and the bundler does, so the hook appends
 * `.ts` for a relative specifier naming a file on disk and defers everything
 * else. It changes how the modules are FOUND, never what they DO — which is the
 * property that lets this script drive the same code the product imports, rather
 * than a second reader that agrees with it today.
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
 * So it is measured rather than assumed: a UID that carries a word of any parsed
 * title is printed as a digest instead, and the substitution is announced. The
 * repair is never an exemption list — that is the argument
 * `scripts/verify-ics-import.mjs:127-147` makes and it travels unchanged.
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

let digestedIdentifiers = 0;

/**
 * The sigle this file uses, filled in once the entries have been classified.
 *
 * Declared here, and with `let`, because the output audit reads it and the audit
 * now runs on refusals too — several of which happen before classification. An
 * empty list there is the conservative direction: it strips fewer words as
 * already-public and therefore looks for more of them in the transcript.
 */
let siglaInFile = [];

/** A `UID` in a form that is safe to print, or a stable digest of one. */
function printableUid(uid) {
  const carriesATitleWord = [...tokensOf(uid)].some((token) => titleTokens.has(token));
  if (!carriesATitleWord) return uid;
  digestedIdentifiers += 1;
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
 * Stage 4 — the snapshot of what the six tables already hold
 * ──────────────────────────────────────────────────────────────────────────── */

const planRows = await readAll(
  "production_plan",
  "id, source_uid, series_id, number, venue_word, date, start_time, end_time, source_sequence, source_last_modified, absent_since, linked_party_id",
  "plan table"
);
const pieceRows = await readAll(
  "production_piece",
  "id, source_uid, plan_id, series_code, number, kind, part_marker, date, origin, unresolved_reason, conforms_to_rule, naming_convention, source_sequence, source_last_modified, absent_since",
  "piece table"
);
const commitmentRows = await readAll(
  "production_commitment",
  "id, source_uid, occurrence_date, start_time, end_time, title, recurrence_raw, absent_since",
  "commitment table"
);
const checklistRows = await readAll(
  "production_checklist_item",
  "id, plan_id, kind, label, due_date, sort_order",
  "checklist table"
);

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

/** A stored night's join key, from the sigla resolved above and its progressivo. */
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

// The two ways a stored night ends up without a key, kept apart on purpose.
const planRowsWithoutSeries = planRows.filter((row) => row.series_id === null).length;
const planRowsWithUnresolvedSeries = planRows.filter(
  (row) => row.series_id !== null && siglaOf(row) === null
).length;

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
    absentSince: row.absent_since,
    linkedPartyId: row.linked_party_id,
  })),
  pieces: pieceRows.map((row) => ({
    id: row.id,
    sourceUid: row.source_uid,
    seriesCode: row.series_code,
    number: row.number,
    kind: row.kind,
    partMarker: row.part_marker,
    date: row.date,
    origin: row.origin,
    unresolvedReason: row.unresolved_reason,
    conformsToRule: row.conforms_to_rule,
    namingConvention: row.naming_convention,
    sourceSequence: row.source_sequence,
    sourceLastModified: row.source_last_modified,
    absentSince: row.absent_since,
  })),
  commitments: commitmentRows.map((row) => ({
    id: row.id,
    sourceUid: row.source_uid,
    occurrenceDate: row.occurrence_date,
    startTime: row.start_time,
    endTime: row.end_time,
    title: row.title,
    recurrenceRaw: row.recurrence_raw,
    absentSince: row.absent_since,
  })),
  checklistItems: checklistRows
    .filter((row) => planKeyById.has(row.plan_id))
    .map((row) => ({
      id: row.id,
      planKey: planKeyById.get(row.plan_id),
      kind: row.kind,
      label: row.label,
      dueDate: row.due_date,
      sortOrder: row.sort_order,
    })),
};

const checklistRowsWithoutKey = checklistRows.length - existing.checklistItems.length;

say("");
say("  ── what the six tables already hold ──────────────────────────────────");
say(
  `     plans ${planRows.length} · pieces ${pieceRows.length} · ` +
    `commitments ${commitmentRows.length} · checklist items ${checklistRows.length}`
);
if (planRowsWithoutSeries > 0) {
  say(
    `     ⚠ ${planRowsWithoutSeries} stored night(s) carry no series at all, so they ` +
      "cannot be keyed and are not compared."
  );
}
if (planRowsWithUnresolvedSeries > 0) {
  // Its own count and its own sentence. This one is not a night nobody classified
  // — it is a night whose series the catalogue no longer answers for, and the
  // repair is in the catalogue rather than in the file.
  say(
    `     ⚠ ${planRowsWithUnresolvedSeries} stored night(s) name a series this run's ` +
      "catalogue could not resolve. They are not compared, and their pieces and"
  );
  say("       checklist cannot be placed. That is a finding, not a tidy-up.");
}
if (checklistRowsWithoutKey > 0) {
  say(
    `     ⚠ ${checklistRowsWithoutKey} checklist item(s) hang off a night with no ` +
      "resolvable series or no progressivo, so they cannot be keyed and are not compared."
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
say("  ── the plan of writes ────────────────────────────────────────────────");
say(
  `     plans        insert ${plan.plansToInsert.length}  ·  update ${plan.plansToUpdate.length}`
);
say(
  `     pieces       insert ${plan.piecesToInsert.length}  ·  update ${plan.piecesToUpdate.length}`
);
say(
  `     commitments  insert ${plan.commitmentsToInsert.length}  ·  update ${plan.commitmentsToUpdate.length}`
);
say(
  `     checklist    insert ${plan.checklistItemsToInsert.length}  ·  update ${plan.checklistItemsToUpdate.length}`
);
say(
  `     absences ${plan.absences.length} (stamped, never removed) · ` +
    `divergences ${plan.divergences.length} · seen ${plan.seen.plans.length + plan.seen.pieces.length + plan.seen.commitments.length}`
);
say(
  `     announced-night rows written: 0, and there is no path in this file that could.`
);
say(`     rows removed: 0, and there is no path in this file that could.`);

const proposals = plan.piecesToInsert.filter((row) => row.sourceUid === null).length;
say(
  `     of the piece inserts, ${proposals} are PROPOSALS — a date the rule placed, not ` +
    "one the file wrote."
);

say(
  `     space-approval checklist items: 0, and that is a CONFIGURATION GAP rather than ` +
    "a measured zero — nothing stores which spaces must approve."
);

if (plan.seriesWithoutRules.length > 0) {
  say("");
  say(
    `     ⚠ ${plan.seriesWithoutRules.length} series in the file own no pipeline rule: ` +
      `${plan.seriesWithoutRules.join(", ")}`
  );
  say("       Their nights would draw an empty checklist that looks finished. A series");
  say("       code is a public sigla half, so it is safe to name here.");
}

if (plan.divergences.length > 0) {
  say("");
  say("     divergences — the file and the product disagree. Identifier and code only:");
  for (const record of plan.divergences) {
    say(`         ${record.subject}  ${printableUid(record.sourceUid)}  ${record.reason}`);
  }
  say(
    "       A row whose progressivo or series code moved enters NEITHER update list. " +
      "It is reported and written nowhere; the trigger is the second layer."
  );
}

if (plan.absences.length > 0) {
  say("");
  say("     absences — an entry the file no longer carries. The row STAYS:");
  const linked = plan.absences.filter((record) => record.linkedToAnnouncedNight).length;
  for (const record of plan.absences) {
    say(
      `         ${record.subject}  ${record.id}  ${record.reason}` +
        (record.linkedToAnnouncedNight ? "  ⚠ stands behind an announced night" : "")
    );
  }
  if (linked > 0) {
    say(
      `       ${linked} of them stand behind a night that has been announced. Removing ` +
        "such a row would orphan a night with tickets on sale, so nothing does."
    );
  }
}

if (plan.unsupportedRecurrences.length > 0) {
  say("");
  say(
    `     ${plan.unsupportedRecurrences.length} recurrence(s) this reader does not expand. ` +
      "Each keeps its own day and none is guessed at."
  );
}

if (digestedIdentifiers > 0) {
  say("");
  say(
    `     ⚠ ${digestedIdentifiers} identifier(s) were printed as a digest instead of ` +
      "verbatim, because the UID carries a word of an entry title."
  );
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
 * Stage 7 — the writes
 *
 * Order matters and it is the order of the foreign keys: the run row, then the
 * plans (which pieces and checklist items point at), then everything else.
 * ──────────────────────────────────────────────────────────────────────────── */

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
say(`  ── applying ── import run ${runId}`);

/** The catalogue identifiers a plan row needs. The reconciler makes no joins. */
function catalogueFor(sigla) {
  return catalogueBySigla.get(sigla) ?? { seriesId: null, formatId: null };
}

if (plan.plansToInsert.length > 0) {
  const rows = plan.plansToInsert.map((row) => {
    const catalogue = catalogueFor(row.seriesCode);
    return {
      source_uid: row.sourceUid,
      // Written HERE and only here: this is the number the file assigned, on a
      // row that does not yet exist. No update payload below carries this column.
      number: row.number,
      venue_word: row.venueWord,
      date: row.date,
      start_time: row.startTime,
      end_time: row.endTime,
      source_sequence: row.sourceSequence,
      source_last_modified: row.sourceLastModified,
      format_id: catalogue.formatId,
      series_id: catalogue.seriesId,
      // `venue_id` and `venue_stage` stay null on purpose. Which space a night
      // happens in, and whether it is acquired, is a person's judgement recorded
      // in writing (`venue-acquisition.md`) — an import that inferred it from a
      // word in a title would be turning a candidate into a booking.
      last_seen_at: row.seenAt,
    };
  });
  await step("plan_insert", () =>
    db.from("production_plan").upsert(rows, { onConflict: "source_uid" })
  );
}

for (const row of plan.plansToUpdate) {
  const payload = {
    // The REFERENCE, resolved from the sigla the file writes — never the sigla
    // itself. A row only reaches this list when its sigla did NOT move, so this
    // is the value already stored, except on the one row that had none: that one
    // gets its series, which is a repair rather than a renumbering.
    series_id: catalogueFor(row.seriesCode).seriesId,
    venue_word: row.venueWord,
    date: row.date,
    start_time: row.startTime,
    end_time: row.endTime,
    source_sequence: row.sourceSequence,
    source_last_modified: row.sourceLastModified,
    last_seen_at: row.seenAt,
    updated_at: row.seenAt,
  };
  // ⚠ No progressivo here, and its absence is the point. `PlanUpdate` carries
  // the value already stored, so writing it would be a no-op — until the day it
  // is not, and that day is the one the guard exists for.
  if (row.clearsAbsence) payload.absent_since = null;
  await step("plan_update", () =>
    db.from("production_plan").update(payload).eq("id", row.id)
  );
}

// Re-read the plans, so that pieces and checklist items point at the identifiers
// the database actually handed back rather than at ones this process guessed.
const appliedPlans = await readAll(
  "production_plan",
  "id, series_id, number",
  "plan table"
);
const planIdByKey = new Map();
for (const row of appliedPlans) {
  const key = planKeyOf(row);
  if (key !== null) planIdByKey.set(key, row.id);
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
    last_seen_at: row.seenAt,
  };
}

// Split on purpose. A proposal has no `UID` because it does not exist in the
// file, and Postgres allows many nulls in a unique column — so an upsert keyed
// on that column would insert a second copy of every proposal on every run. The
// reconciler honours a proposal's idempotence against the snapshot instead, and
// this split is the half of that bargain the caller owes.
const writtenPieces = plan.piecesToInsert.filter((row) => row.sourceUid !== null);
const proposedPieces = plan.piecesToInsert.filter((row) => row.sourceUid === null);

if (writtenPieces.length > 0) {
  await step("piece_insert", () =>
    db
      .from("production_piece")
      .upsert(writtenPieces.map(pieceRowFor), { onConflict: "source_uid" })
  );
}
if (proposedPieces.length > 0) {
  await step("piece_propose", () =>
    db.from("production_piece").insert(proposedPieces.map(pieceRowFor))
  );
}

for (const row of plan.piecesToUpdate) {
  const payload = { ...pieceRowFor(row), updated_at: row.seenAt };
  if (row.clearsAbsence) payload.absent_since = null;
  await step("piece_update", () =>
    db.from("production_piece").update(payload).eq("id", row.id)
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
    last_seen_at: row.seenAt,
  }));
  await step("commitment_insert", () =>
    db
      .from("production_commitment")
      .upsert(rows, { onConflict: "source_uid,occurrence_date" })
  );
}

for (const row of plan.commitmentsToUpdate) {
  const payload = {
    occurrence_date: row.occurrenceDate,
    start_time: row.startTime,
    end_time: row.endTime,
    title: row.title,
    recurrence_raw: row.recurrenceRaw,
    last_seen_at: row.seenAt,
    updated_at: row.seenAt,
  };
  if (row.clearsAbsence) payload.absent_since = null;
  await step("commitment_update", () =>
    db.from("production_commitment").update(payload).eq("id", row.id)
  );
}

// An expanded occurrence points back at the entry it came from. Resolved after
// the inserts, by (source_uid, occurrence_date), which is that table's own
// unique key — never by matching a title.
const expansions = plan.commitmentsToInsert.filter((row) => row.expandedFromDate !== null);
if (expansions.length > 0) {
  const appliedCommitments = await readAll(
    "production_commitment",
    "id, source_uid, occurrence_date",
    "commitment table"
  );
  const commitmentIdByKey = new Map(
    appliedCommitments.map((row) => [`${row.source_uid}|${row.occurrence_date}`, row.id])
  );
  for (const row of expansions) {
    const parentId = commitmentIdByKey.get(`${row.sourceUid}|${row.expandedFromDate}`);
    const childId = commitmentIdByKey.get(`${row.sourceUid}|${row.occurrenceDate}`);
    if (parentId === undefined || childId === undefined || parentId === childId) continue;
    await step("commitment_link", () =>
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
    // `ignoreDuplicates` and not a merge: a re-import may neither duplicate an
    // item nor reopen a ticked one. The tick belongs to whoever did the work.
    await step("checklist_insert", () =>
      db
        .from("production_checklist_item")
        .upsert(rows, { onConflict: "plan_id,kind,label", ignoreDuplicates: true })
    );
  }
}

for (const row of plan.checklistItemsToUpdate) {
  // Only the due date and the position. This payload carries no tick and never
  // will: a tick is a person recording that something got done.
  await step("checklist_update", () =>
    db
      .from("production_checklist_item")
      .update({ due_date: row.dueDate, sort_order: row.sortOrder })
      .eq("id", row.id)
  );
}

// Absences: a stamp, on the row, by its own identifier. Nothing is removed.
const absenceTable = {
  plan: "production_plan",
  piece: "production_piece",
  commitment: "production_commitment",
};
for (const record of plan.absences) {
  await step("absence_stamp", () =>
    db
      .from(absenceTable[record.subject])
      .update({ absent_since: record.absentSince })
      .eq("id", record.id)
  );
}

// The presence stamp, kept apart from the updates so that *still there* and
// *moved* stay two different statements.
const seenGroups = [
  ["production_plan", plan.seen.plans],
  ["production_piece", plan.seen.pieces],
  ["production_commitment", plan.seen.commitments],
];
for (const [table, ids] of seenGroups) {
  if (ids.length === 0) continue;
  await step("presence_stamp", () =>
    db.from(table).update({ last_seen_at: now }).in("id", ids)
  );
}

// The run row is closed last, with the findings as identifiers and reason codes.
const closed = await db
  .from("production_import_run")
  .update({
    finished_at: new Date().toISOString(),
    divergences: plan.divergences.map((record) => ({
      subject: record.subject,
      source_uid: record.sourceUid,
      reason: record.reason,
    })),
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
say("  Run again with --dry-run: the plan must be empty. If it is not, that is a");
say("  finding, and re-running until it looks right is not an answer.");

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
