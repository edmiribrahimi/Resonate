#!/usr/bin/env node
/**
 * verify-all.mjs — one command that runs every gate which can run without a
 * server, and says which failed, which refused, and which it did not run.
 *
 * WHAT IT ASSERTS, in one sentence: **every `verify:*` entry this repository
 * declares is accounted for by this run — executed and given a verdict, or named
 * as not run with the reason it was not run.**
 *
 * ── WHY THIS FILE EXISTS ────────────────────────────────────────────────────
 *
 * `40-REVIEW.md` WR-09: there is no CI in this repository. No
 * `.github/workflows/`, no pre-commit hook that runs a gate, no `test` script.
 * Every gate runs only when a person types its name, and Phase 41 took the count
 * from ten to sixteen. **Six more gates nobody runs is not verification, it is
 * six more files.** D-41-18 calls the aggregate the cheapest high-value item in
 * the phase; this is it.
 *
 * ── THE TWO DESIGN DECISIONS, STATED RATHER THAN ABSORBED ───────────────────
 *
 * Nothing in this repository ran another script before this file. The FORM of a
 * gate is copied from the sixteen that exist; the COMPOSITION has no precedent,
 * so its two choices are written down here instead of being discovered later by
 * somebody reading the code.
 *
 *   1. **A REFUSAL IS NOT A FAILURE.** `verify-tokens.mjs` sets the convention
 *      every gate in this phase follows — `0 = passed · 1 = failed · 2 =
 *      refused`, and *"a refusal is not a failure: it means the measurement did
 *      not happen."* An aggregate that collapsed the two would turn "nothing was
 *      measured" into either "something is broken" or, far worse, into a tick.
 *      **A green that measured nothing is the exact defect this phase's gates
 *      were written to prevent**, and an aggregate is the last place it could be
 *      reintroduced — one exit code is about to stand for fifteen measurements.
 *      So exit 2 travels up unchanged, and the word printed is REFUSED.
 *
 *   2. **A GATE THAT NEEDS A RUNNING SERVER IS NOT IN THE DEFAULT RUN, AND IS
 *      PRINTED ANYWAY.** `verify-organizer-redirects.sh` says in its own header
 *      that it needs `npm run dev` and therefore cannot be part of `npm run
 *      build`. Running it here would make this command fail on a laptop with no
 *      server for a reason that has nothing to do with the tree. Omitting it
 *      SILENTLY would be worse: a green that quietly covers fifteen of sixteen
 *      gates is a green that lied by omission. It is in `NEEDS_SERVER`, and
 *      `NEEDS_SERVER` is printed on every single run, pass or fail.
 *
 *   2b. **AND THE SAME ARGUMENT, ONE PRECONDITION OVER.** Phase 44 added a gate
 *      whose missing precondition is not a server but a FILE: `verify:ics` reads
 *      the production calendar out of `docs/`, which is gitignored, never
 *      deployed and never cloned, so it exists on exactly one machine. On every
 *      other machine that gate refuses — correctly — and this runner would report
 *      a REFUSED it can do nothing about, on every single run, until somebody
 *      stopped reading the word.
 *
 *      So it is declared in `NEEDS_MATERIAL` and not run here. **`NEEDS_MATERIAL`
 *      is a third list rather than a second entry in `NEEDS_SERVER`** because the
 *      reason printed beside a name is the whole value of naming it, and *needs a
 *      running dev server* would be a false sentence about this one. Two gates
 *      are not run here, for two different reasons, and a reader of a green is
 *      told both.
 *
 * ── WHAT A GREEN HERE DOES NOT MEAN ─────────────────────────────────────────
 *
 *   - **IT IS NOT A TEST RUN.** There is no test runner for the product
 *     (`CLAUDE.md` Guardrail 1): no `test` script, no `*.test.*`, no `*.spec.*`.
 *     Nothing below executes a line of product code. Every gate here reads files
 *     and asserts structure. A green says the tree agrees with contracts written
 *     in documents — never that a screen works.
 *   - **`verify:persona` COVERS THE PERSONA, NOT THE PRODUCT**, and coherence,
 *     not correctness. Its green says the instruction files agree with each
 *     other. It says nothing about `src/`.
 *   - **IT SAYS NOTHING A PERSON HAS NOT LOOKED AT.** Phase 41 ends with six
 *     observations no script can make — H41-1 … H41-6, written down in
 *     `.planning/phases/41-shared-primitives-three-tier-layout/41-RELEASE-PASS.md`
 *     before the sitting that makes them. H41-4 in particular is the ONLY thing
 *     in this repository that proves anything is 44px: every touch-target gate
 *     reads a class string, and a class string is not a box.
 *   - **IT DOES NOT RUN THE BUILD.** `npm run build` is this repository's
 *     typecheck (`CLAUDE.md` Guardrail 2) and it is a separate command on
 *     purpose: it is slow, and a gate table that took four minutes to print
 *     would be a gate table nobody runs. Run both.
 *
 * ── ONE LIMIT, MEASURED AND NOT PAPERED OVER ────────────────────────────────
 *
 * **This runner cannot always tell a gate that FAILED from a gate that CRASHED**,
 * because Node exits 1 for an uncaught exception exactly as a red check does.
 * The mitigation is cheap and printed: **stderr is shown for every gate that did
 * not pass**. A red check in this repository writes its verdict to stdout and
 * leaves stderr empty; a crash writes a stack trace to stderr. If you see a
 * stack trace, you are looking at a broken gate and not at a broken tree — and
 * a broken gate is the one failure that must never be read as a finding.
 *
 * ── HOW THE LIST IS BUILT, AND WHY IT IS NOT A SECOND COPY ──────────────────
 *
 * The names below are declared. **The command each one runs is NOT** — it is
 * read out of `package.json` at run time, the same way
 * `verify-organizer-redirects.sh` parses the redirect table out of its source
 * module instead of re-typing it. A second copy of a command is drift waiting to
 * happen, and it drifts silently: the copy keeps passing while the real entry
 * moves.
 *
 * ── THE RECONCILIATION, AND THE SITUATION THAT WOULD TRIP IT ────────────────
 *
 * The reconciliation at the end of the run is the whole point of the file, and
 * **what it compares is verdicts, not lengths.** It takes every `verify:*` name
 * this repository can be said to have — every one `package.json` registers, and
 * every one this runner declares — and checks it against the set of names this
 * run said something about: a name that got a verdict (it ran), a name in
 * `NEEDS_SERVER` (declared, not run here, and printed with its reason), a name
 * reported absent but optional, or a name reported MISSING. A name in none of
 * those got **no verdict** from this run, and that is a REFUSAL — exit 2 — not a
 * line printed under a tick.
 *
 * **The two refusals before the run do not already guarantee this.** They compare
 * LISTS, and they compare them before anything executes: `declared` against
 * `knownNames`, in both directions. This one compares VERDICTS, afterwards. A
 * name can be declared in `package.json`, known to this runner, present on disk —
 * and still come out of the run with nothing said about it. Nothing earlier
 * would notice.
 *
 * ── THE PARTITION IS DELIBERATELY NON-EXHAUSTIVE. THAT IS THE MECHANISM. ────
 *
 * **`ABSENT_STATES` is load-bearing and is not a tidy-up.** The plan loop below
 * labels each entry `runnable`, `absent` or `unregistered`. `runnable` is matched
 * by equality; the other two are matched by **membership of `ABSENT_STATES`**.
 * Three named states, three buckets, and **a fourth state matches none of them**.
 *
 * That is the point. The concrete situation this file guards — because a gate
 * whose triggering situation nobody wrote down is a gate nobody can trust — is
 * that somebody adds a fourth `state` to the plan loop below: a `skipped`, a
 * `deferred`, a `stale`. That entry now falls through all three filters, is
 * dropped between planning and reporting, and the reconciliation catches it and
 * refuses. **That is T-41-44 arriving from inside this file instead of from
 * `package.json`** — and the reason a mismatch is a REFUSAL rather than a
 * failure: this run did not measure everything the repository declares, which is
 * not the same statement as "something is wrong with the tree".
 *
 * **The edit that would silently undo all of it** is keying either `absent*`
 * filter back on the complement of `runnable` — testing that `state` is not
 * `"runnable"` instead of testing membership. It reads like a simplification and
 * it is the regression: with a complement, the three filters become exhaustive
 * over every possible value of `state`, every fourth state lands deterministically
 * in one of the `absent*` buckets, `unaccounted` can never be non-empty again, and
 * the paragraph above becomes false while still sitting here claiming to be true.
 * That is not a hypothesis: it is what shipped between 41-14 and 41-22, and
 * 41-GAP-REVIEW.md CR-01 is the review that measured it.
 *
 * **So when a genuine fourth state is introduced**, do one of exactly two things,
 * and never the third:
 *   - add it to `ABSENT_STATES` **in the same commit**, with the reason it is a
 *     non-runnable state written beside it; or
 *   - accept the refusal — the run really did not account for that entry, and
 *     exit 2 is the honest report of that;
 *   - **never** widen a filter to a complement to make the refusal go away.
 *
 * ── WHY THE DOMAIN IS THE UNION AND NOT `declared` ALONE ────────────────────
 *
 * The comparison runs over `declared ∪ knownNames`, not over `declared`. Keying
 * it on `declared` alone leaves the same hole one step to the side: a novel state
 * introduced on an entry `package.json` does NOT register is invisible to a check
 * that only looks at registered names.
 *
 * Widening a refusal's domain risks refusing on a correct tree, which D-41-19
 * calls the worse failure mode, so the reasoning is written out rather than
 * assumed: `undeclaredHere` guarantees `declared ⊆ knownNames`, so the union IS
 * `knownNames`; and `missingRequired` guarantees every name in
 * `knownNames \ declared` is an OPTIONAL `OFFLINE` entry, which the plan loop
 * labels `unregistered` — a member of `ABSENT_STATES` — so it reaches
 * `absentOptional` and is accounted for. Every `NEEDS_SERVER` and every
 * `NEEDS_MATERIAL` name is accounted for by construction. Nothing on a correct
 * tree becomes unaccounted, and the run that returns the recorded baseline is the
 * proof of it, not this paragraph.
 *
 * ── AND A REFUSAL DOES NOT OUTRANK A FAILURE, IN EITHER DIRECTION ──────────
 *
 * Design decision 1 above says a refusal is not a failure, and that stands. Its
 * converse is what `41-GAP-REVIEW.md` WR-01 found here: **a failure must not be
 * reportable as a refusal either.** This reconciliation fires after every gate
 * has run, so `failed` and `absentRequired` are already known when it does. When
 * either is non-empty the FATAL still prints — a refusal stays legible as a
 * refusal — and then the run carries the FAILURE verdict and exits 1. A
 * measurement that happened outranks one that did not.
 *
 * The exit codes of the unmixed branches are unchanged. A run with only refusals
 * is still 2 and a run with only failures is still 1, because that distinction is
 * this file's reason to exist and it is not traded away for the fix.
 *
 * **What changed with it is a sentence, and a sentence is what a reader
 * believes.** The refusal branch used to close by asserting flatly that nothing
 * had failed — which this runner cannot establish, and which is why that exact
 * wording is gone from this file rather than merely softened, so it cannot be
 * copied back from a comment. A gate that prints a red and then exits 2 is
 * indistinguishable from here from one that refused before measuring anything, so
 * the line now says the narrower thing that is true: no gate that REACHED a
 * verdict reported a failure, a refused gate may itself have been failing when it
 * refused, and its output is above under "what they said".
 */

import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

/* ────────────────────────────────────────────────────────────────────────────
 * OFFLINE — the gates that run with no server and no credentials
 * ──────────────────────────────────────────────────────────────────────────── */

/**
 * Shape: `[npmScriptName, optional, note]`.
 *
 * `optional` is `true` for exactly one entry and the reason is written in it.
 * An optional gate that is not on disk is reported ABSENT with its note and does
 * NOT fail the run; **any other missing gate is a failure**, because a gate that
 * vanished from the tree while its name stayed in `package.json` is the shape of
 * a check that went quiet while the thing it tracked is still there.
 *
 * `note` is printed for a gate that refuses, is absent, or is unknown — the
 * three states where a reader needs to know something the exit code does not
 * say.
 */
const OFFLINE = [
  [
    "verify:persona", false,
    "covers the PERSONA, not the product, and coherence, not correctness",
  ],
  [
    "verify:capabilities", false,
    "needs Supabase credentials in .env.local; without them it REFUSES (exit 2) " +
      "and nothing about the capability model was measured. That is its honest " +
      "state on any machine that does not hold them, and it is not a pass",
  ],
  ["verify:no-header-identity", false, ""],
  ["verify:no-credit-account", false, ""],
  ["verify:media-strip", false, ""],
  ["verify:routes", false, ""],
  ["verify:tokens", false, ""],
  ["verify:semantic-separation", false, ""],
  ["verify:sunset-gradient", false, ""],
  ["verify:conversion", false, "Phase 41 — G1 and G4"],
  ["verify:dialogs", false, "Phase 41 — G2"],
  ["verify:tables", false, "Phase 41 — G3"],
  ["verify:breakpoints", false, "Phase 41 — G6"],
  ["verify:no-viewport-read", false, "Phase 41 — G7"],
  [
    "verify:comment-stripper", false,
    "Phase 41.1 — wave 0. It measures the MODULE the other ten gates import, not " +
      "the tree: eight comment shapes, each of which has blinded or false-reddened " +
      "a gate on this repository. It is listed after them on purpose — read its " +
      "matrix before believing any REMAINING count printed above",
  ],
  [
    "verify:touch-targets", true,
    "Phase 41 — G5. Plan 41-11 was permitted to end by deleting this gate " +
      "rather than shipping one that reddened on correct code. It did not: the " +
      "gate exists and went red on two real elements on its first run. If it is " +
      "ever absent, that decision is recorded in 41-11-SUMMARY.md and this line " +
      "is how the aggregate says fifteen gates ran and not sixteen",
  ],
];

/* ────────────────────────────────────────────────────────────────────────────
 * NEEDS_SERVER — declared, never run here, printed on every run
 * ──────────────────────────────────────────────────────────────────────────── */

/** Shape: `[npmScriptName, reason]`. */
const NEEDS_SERVER = [
  [
    "verify:redirects",
    "needs a running dev server; its own header says it cannot be part of the build",
  ],
];

/* ────────────────────────────────────────────────────────────────────────────
 * NEEDS_MATERIAL — declared, never run here, printed on every run
 *
 * The same shape and the same contract as `NEEDS_SERVER`, for the gate whose
 * missing precondition is a file rather than a process. Adding a NAME to a list
 * is not adding a RUNNER: nothing below spawns these, on purpose.
 * ──────────────────────────────────────────────────────────────────────────── */

/** Shape: `[npmScriptName, reason]`. */
const NEEDS_MATERIAL = [
  [
    "verify:ics",
    "scripts/verify-ics-import.mjs reads the production calendar out of docs/, which " +
      "is gitignored and therefore exists on the owner's machine and nowhere else. It " +
      "refuses (exit 2) everywhere else, so running it here would print a REFUSED on " +
      "every run of every other machine. Run it by hand where the material is: " +
      "`npm run verify:ics`",
  ],
];

/* ────────────────────────────────────────────────────────────────────────────
 * Reading package.json, which is the single source of every command
 * ──────────────────────────────────────────────────────────────────────────── */

/** A refusal is not a failure: it means the measurement did not happen. */
function refuse(message) {
  console.log(`\n  FATAL: ${message}\n`);
  process.exit(2);
}

const pkgPath = join(ROOT, "package.json");
if (!existsSync(pkgPath)) {
  refuse("package.json is not on disk. Nothing was measured.");
}

let pkg;
try {
  pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
} catch (error) {
  refuse(
    `package.json could not be parsed: ${error.message}\n` +
      "       The list of gates is read from it, so nothing was measured."
  );
}

const scripts = pkg.scripts ?? {};
const declared = Object.keys(scripts).filter((name) => name.startsWith("verify:"));

console.log("");
console.log("verify-all — every gate that runs without a server, and what was not run");
console.log("");
console.log(
  "  A refusal is not a failure: it means the measurement did not happen.\n" +
    "  0 = passed  ·  1 = FAILED  ·  anything else = REFUSED, and nothing was measured.\n"
);

/* ── the reconciliation, before anything runs ─────────────────────────────── */

const offlineNames = OFFLINE.map(([name]) => name);
const serverNames = NEEDS_SERVER.map(([name]) => name);
const materialNames = NEEDS_MATERIAL.map(([name]) => name);
const knownNames = new Set([...offlineNames, ...serverNames, ...materialNames]);

const undeclaredHere = declared.filter((name) => !knownNames.has(name));
const missingFromPkg = [...knownNames].filter((name) => !declared.includes(name));

if (undeclaredHere.length > 0) {
  refuse(
    `package.json declares ${undeclaredHere.length} verify:* entr(y/ies) this runner does not\n` +
      `       know about: ${undeclaredHere.join(", ")}\n` +
      "       They were NOT run. A table that omits a registered gate while printing a tick is\n" +
      "       a green that lied by omission — add each name to OFFLINE, to NEEDS_SERVER or\n" +
      "       to NEEDS_MATERIAL."
  );
}

const missingRequired = missingFromPkg.filter((name) => {
  const entry = OFFLINE.find(([n]) => n === name);
  return !entry || entry[1] !== true;
});
if (missingRequired.length > 0) {
  refuse(
    `this runner declares ${missingRequired.length} gate(s) that package.json does not:\n` +
      `       ${missingRequired.join(", ")}\n` +
      "       Either the entry was removed and this list moves with it in the same commit, or\n" +
      "       a gate lost its registration and now runs nowhere. Nothing was measured."
  );
}

/* ── resolve each offline gate to a file on disk ──────────────────────────── */

/** `node scripts/x.mjs` → `scripts/x.mjs`. Any other shape is a refusal. */
function scriptPathOf(name, command) {
  const parts = command.trim().split(/\s+/);
  if (parts.length !== 2 || parts[0] !== "node") {
    refuse(
      `${name} runs "${command}", which is not the "node <path>" shape this runner can\n` +
        "       resolve to a file. A gate whose command it cannot read is a gate it cannot\n" +
        "       check the existence of, and guessing is how a runner reports on the wrong file."
    );
  }
  return parts[1];
}

const plan = [];
for (const [name, optional, note] of OFFLINE) {
  if (!declared.includes(name)) {
    // Only reachable for an optional gate — the required case refused above.
    plan.push({ name, state: "unregistered", optional, note });
    continue;
  }
  const rel = scriptPathOf(name, scripts[name]);
  if (!existsSync(join(ROOT, rel))) {
    plan.push({ name, state: "absent", optional, note, rel });
    continue;
  }
  plan.push({ name, state: "runnable", optional, note, rel });
}

/**
 * The non-runnable states the plan loop above actually produces, listed by name.
 *
 * **Read the file header before changing this.** Matching membership of this set
 * rather than the complement of `"runnable"` is what makes the three filters
 * below NON-EXHAUSTIVE, and non-exhaustive is what gives the reconciliation at
 * the end of this run something it can catch. A fourth `state` matches none of
 * the three, is dropped between planning and reporting, and refuses there.
 *
 *   - `absent`       — registered in `package.json`, but the file it points at is
 *                      not on disk.
 *   - `unregistered` — this runner declares it, `package.json` does not. Only
 *                      reachable for an optional gate; the required case refused
 *                      before the loop ran.
 *
 * A new non-runnable state belongs here, with its reason, in the commit that
 * introduces it. Widening either filter back to a complement restores the
 * identity CR-01 found and is the one edit this file asks you not to make.
 */
const ABSENT_STATES = new Set(["absent", "unregistered"]);

const absentRequired = plan.filter((p) => ABSENT_STATES.has(p.state) && !p.optional);
const absentOptional = plan.filter((p) => ABSENT_STATES.has(p.state) && p.optional);
const runnable = plan.filter((p) => p.state === "runnable");

/* ────────────────────────────────────────────────────────────────────────────
 * Run every gate to completion — a run that stops early tells you about one
 * gate and hides fourteen
 * ──────────────────────────────────────────────────────────────────────────── */

console.log(`  Running ${runnable.length} gate(s). Every one runs to completion.\n`);

const results = [];
for (const item of runnable) {
  const started = Date.now();
  const run = spawnSync(process.execPath, [item.rel], {
    cwd: ROOT,
    encoding: "utf8",
  });
  const seconds = ((Date.now() - started) / 1000).toFixed(1);

  let code;
  let verdict;
  if (run.error) {
    code = "spawn";
    verdict = "REFUSED";
  } else if (run.status === null) {
    code = `signal ${run.signal}`;
    verdict = "REFUSED";
  } else if (run.status === 0) {
    code = 0;
    verdict = "passed";
  } else if (run.status === 1) {
    code = 1;
    verdict = "FAILED";
  } else {
    code = run.status;
    verdict = "REFUSED";
  }

  results.push({
    ...item,
    code,
    verdict,
    seconds,
    stdout: run.stdout ?? "",
    stderr: run.stderr ?? "",
    spawnError: run.error ? run.error.message : "",
  });

  const mark = verdict === "passed" ? "·" : verdict === "FAILED" ? "✗" : "?";
  console.log(`    ${mark} ${item.name.padEnd(28)} ${String(code).padStart(8)}  ${verdict}  ${seconds}s`);
}

/* ────────────────────────────────────────────────────────────────────────────
 * The report
 * ──────────────────────────────────────────────────────────────────────────── */

const failed = results.filter((r) => r.verdict === "FAILED");
const refused = results.filter((r) => r.verdict === "REFUSED");
const passed = results.filter((r) => r.verdict === "passed");

console.log("");
console.log("  ── the table ──────────────────────────────────────────────────────────");
console.log("");
console.log(`    ${"gate".padEnd(28)} ${"exit".padStart(8)}  verdict`);
for (const r of results) {
  console.log(`    ${r.name.padEnd(28)} ${String(r.code).padStart(8)}  ${r.verdict}`);
}

/* ── what did not run, printed on every run, pass or fail ─────────────────── */

console.log("");
console.log("  ── NOT RUN, and why ───────────────────────────────────────────────────");
console.log("");
for (const [name, reason] of [...NEEDS_SERVER, ...NEEDS_MATERIAL]) {
  console.log(`    ${name} — not run: ${reason}`);
}
for (const p of absentOptional) {
  const how =
    p.state === "unregistered"
      ? "not present; package.json carries no entry for it"
      : `not present on disk at ${p.rel}`;
  console.log(`    ${p.name} — ${how}`);
  if (p.note) console.log(`        ${p.note}`);
}
for (const p of absentRequired) {
  console.log(`    ${p.name} — MISSING, and this is a failure, not an omission.`);
  if (p.rel) console.log(`        package.json points at ${p.rel}, which is not on disk.`);
}

/* ── the count, reconciled out loud ───────────────────────────────────────── */

const accounted =
  results.length +
  NEEDS_SERVER.length +
  NEEDS_MATERIAL.length +
  absentOptional.length +
  absentRequired.length;
console.log("");
console.log("  ── the count ──────────────────────────────────────────────────────────");
console.log("");
console.log(`    package.json declares          ${String(declared.length).padStart(3)}  verify:* entr(y/ies)`);
console.log(`    run here                       ${String(results.length).padStart(3)}`);
console.log(`      of which passed              ${String(passed.length).padStart(3)}`);
console.log(`      of which FAILED              ${String(failed.length).padStart(3)}`);
console.log(`      of which REFUSED             ${String(refused.length).padStart(3)}  — nothing was measured by these`);
console.log(`    needs a server, not run        ${String(NEEDS_SERVER.length).padStart(3)}`);
console.log(`    needs the material, not run    ${String(NEEDS_MATERIAL.length).padStart(3)}`);
console.log(`    declared absent                ${String(absentOptional.length).padStart(3)}`);
console.log(`    MISSING                        ${String(absentRequired.length).padStart(3)}`);
console.log(`                                   ───`);
console.log(`    accounted for                  ${String(accounted).padStart(3)}`);

/* ── the reconciliation, keyed on verdicts obtained and not on a count ─────── */

// Every name this run said something about: it ran and got a verdict, or it was
// named as not run, or as absent, or as MISSING. The comparison that follows is
// against THIS set rather than against a total, because a total is arithmetic
// over the same partition that produced it and cannot disagree with itself.
const measuredOrExplained = new Set([
  ...results.map((r) => r.name),
  ...NEEDS_SERVER.map(([name]) => name),
  ...NEEDS_MATERIAL.map(([name]) => name),
  ...absentOptional.map((p) => p.name),
  ...absentRequired.map((p) => p.name),
]);

// The domain is every name this repository can be said to have — registered in
// `package.json`, or declared by this runner — and not `declared` alone. A novel
// `state` introduced on an entry `package.json` does not register would be
// invisible to a check keyed on `declared`, which is the same hole one step to
// the side. The file header carries the reasoning for why this cannot refuse on
// a correct tree, and the baseline run is what proves it.
const reconciliationDomain = new Set([...declared, ...knownNames]);

const unaccounted = [...reconciliationDomain].filter((name) => !measuredOrExplained.has(name));

/**
 * The reconciliation's refusal, carried to the verdict block when a failure was
 * already recorded. Empty on every other run.
 *
 * **Why this refusal is handled here and not inside `refuse()`.** Every other
 * `refuse()` call site in this file fires before a single gate has been spawned —
 * `package.json` unreadable, a name declared here and not there, a command whose
 * shape cannot be resolved. At those points `failed` and `absentRequired` do not
 * exist yet, and nothing has been measured, so a refusal is the only honest
 * report. This one fires **after** every gate has run. Those two situations are
 * genuinely different, and burying a condition inside `refuse()` would make the
 * code pretend they are the same.
 */
let reconciliationGap = [];

if (unaccounted.length > 0) {
  const gap =
    `${unaccounted.length} declared verify:* entr(y/ies) got no verdict from this run:\n` +
    `       ${unaccounted.join(", ")}\n` +
    "       They did not run, and they were not named as not run either. This run CANNOT\n" +
    "       claim to account for every gate this repository declares — in package.json or\n" +
    "       in this runner's own lists. Nothing about those was measured.";

  if (failed.length > 0 || absentRequired.length > 0) {
    // A measurement that happened outranks one that did not. The FATAL prints
    // exactly as it would otherwise — a refusal stays legible as a refusal — and
    // then the run carries the FAILURE verdict to the block below and exits 1.
    // 41-GAP-REVIEW.md WR-01 is the record of what the other order costs: a run
    // that failed a check and then refused was reported REFUSED, under a closing
    // line that said nothing had failed.
    console.log(`\n  FATAL: ${gap}\n`);
    reconciliationGap = unaccounted;
  } else {
    refuse(gap);
  }
}

/* ── the output of anything that did not pass ─────────────────────────────── */

const notPassed = [...failed, ...refused];
if (notPassed.length > 0) {
  console.log("");
  console.log("  ── what they said ─────────────────────────────────────────────────────");
  for (const r of notPassed) {
    console.log("");
    console.log(`  ═══ ${r.name} — ${r.verdict} (exit ${r.code}) ═══`);
    if (r.note) console.log(`      note: ${r.note}`);
    if (r.spawnError) console.log(`      could not start: ${r.spawnError}`);
    const out = r.stdout.trimEnd();
    if (out) console.log(out);
    const err = r.stderr.trimEnd();
    if (err) {
      console.log("");
      console.log("      ── stderr ──");
      console.log(err);
      // Only fires on what a Node stack trace actually looks like. A note that
      // printed on every refusal — most of which write a plain FATAL line to
      // stderr and are working exactly as designed — would train a reader to
      // skip the one case where it matters.
      if (/^\s+at .+:\d+:\d+\)?$/m.test(err)) {
        console.log(
          "\n      THAT IS A STACK TRACE: the GATE is broken, not the tree. Node exits 1 for an\n" +
            "      uncaught exception exactly as a red check does, and this runner cannot tell\n" +
            "      them apart from the exit code alone. Fix the gate before reading its verdict\n" +
            "      as a finding."
        );
      }
    }
  }
}

/* ── verdict ──────────────────────────────────────────────────────────────── */

console.log("");
if (failed.length > 0 || absentRequired.length > 0) {
  const names = [...failed.map((r) => r.name), ...absentRequired.map((p) => `${p.name} (missing)`)];
  console.log(`  VERIFY_FAIL — ${names.length}: ${names.join(", ")}`);
  if (reconciliationGap.length > 0) {
    console.log(
      `  AND the reconciliation above refused on ${reconciliationGap.length} entr(y/ies) — ` +
        `${reconciliationGap.join(", ")}.\n` +
        "  This run exits 1, not 2: a refusal means a measurement did not happen, and it does\n" +
        "  not unsay one that did. Both are printed — read the FATAL for what could not be\n" +
        "  measured, and the names above for what was measured and is wrong."
    );
  }
  if (refused.length > 0) {
    console.log(
      `  AND ${refused.length} refused — ${refused.map((r) => r.name).join(", ")}. ` +
        "Those measured NOTHING;\n  they are not part of the failure and they are not part of any pass either."
    );
  }
  console.log("");
  process.exit(1);
}

if (refused.length > 0) {
  console.log(
    `  VERIFY_REFUSED — ${refused.length} gate(s) could not measure: ${refused
      .map((r) => r.name)
      .join(", ")}`
  );
  console.log(
    "\n  No gate that reached a verdict reported a failure. That is a narrower statement than\n" +
      "  \"nothing failed\", and the difference is not pedantry: a gate that printed a red and\n" +
      "  THEN refused exits 2, and from here it is indistinguishable from one that refused\n" +
      "  before measuring anything. Its own output is reproduced above under \"what they\n" +
      "  said\", and that is where the answer is — this line cannot tell you.\n" +
      "\n  A refusal is not a pass either: those gates measured NOTHING, and this command exits\n" +
      "  2 rather than 0 so that no script and no reader can mistake the two. Read each one's\n" +
      "  note above — a refusal usually names something the environment is missing, not\n" +
      "  something the tree got wrong.\n"
  );
  process.exit(2);
}

console.log(`  VERIFY_OK — ${passed.length} gate(s) passed.`);
console.log(
  "\n  Read the NOT RUN block before treating this as verification: this command runs no\n" +
    "  product code, executes no test — there is no test runner in this repository — and\n" +
    "  proves nothing anybody looked at. `npm run build` is the typecheck and is separate.\n" +
    "  The six observations no script can make are in\n" +
    "  .planning/phases/41-shared-primitives-three-tier-layout/41-RELEASE-PASS.md, and H41-4\n" +
    "  is the only thing in this repository that proves anything is 44px.\n"
);
process.exit(0);
