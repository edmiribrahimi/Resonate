#!/usr/bin/env node
/**
 * verify-no-header-identity.mjs — the burn-down meter for CAP-05, criterion 1.
 *
 * WHAT IT ASSERTS, in one sentence: **no file under `src/` other than
 * `src/lib/supabase/middleware.ts` contains the substring `x-user-`**, matched
 * case-insensitively.
 *
 * WHY THAT SENTENCE AND NOT A NICER ONE. Criterion 1 of this phase is a
 * *structural* property, not a sample: a surface that cannot read the header
 * cannot be fooled by it. Sampling three pages and finding them well-behaved
 * says nothing about the other forty-one. Absence is checkable; good behaviour
 * is not.
 *
 * WHAT A GREEN MEANS, AND — the part that matters — WHAT IT DOES NOT.
 *   - It means no application surface derives an identity from an inbound
 *     request header. That is the whole claim.
 *   - It does NOT mean the middleware's strip works. That is a runtime
 *     property of a running server and it belongs to `probe-forged-identity.sh`,
 *     which has a positive control. This script never starts a server.
 *   - It does NOT mean anything is authorised correctly. **The middleware is
 *     UX; RLS is the security boundary** (`CLAUDE.md`, operating principle 2).
 *     A file that reads no header can still ask the database for rows it should
 *     not get, and this script would print a cheerful zero.
 *   - It does NOT prove a capability is granted to the right role. That is
 *     `verify-capabilities.mjs`, and even that one reads the catalogue and not
 *     the grants (D-32-L).
 *
 * THIS CHECK IS EXPECTED TO FAIL UNTIL PLAN 33-14 LANDS, AND THAT IS ITS
 * PURPOSE. It is a burn-down meter during phase 33 and a regression guard
 * afterwards. Measured 2026-08-07, before the first conversion: **98** lines
 * across **45** files. It is deliberately NOT wired into `npm run build`:
 * `next build` is the type gate, and a type gate that starts failing halfway
 * through a phase for a reason unrelated to types teaches everyone to ignore it.
 *
 * ── FIVE IMPLEMENTATION DECISIONS, EACH WITH THE INCIDENT BEHIND IT ─────────
 *
 * 1. **Literal substring, never a regular expression over source text, and
 *    deliberately NOT `splitCodeAndComments` from `verify-capabilities.mjs`.**
 *    WR-07 (`32-REVIEW.md`) records that this repository's comment stripper is
 *    unsound: a regex literal containing a quote — one exists at
 *    `src/app/(auth)/register/page.tsx:13` — opens a phantom string that runs
 *    for many lines, so line comments inside that span land in the "code"
 *    bucket. A security assertion built on a parser that an unrelated file can
 *    defeat is not an assertion. `String.prototype.includes` cannot be defeated
 *    by a regex literal.
 *
 * 2. **Case-insensitive, by lower-casing the haystack before the `includes`.**
 *    HTTP header names are case-insensitive and `headers().get()` is too, so
 *    `headers().get("X-User-Role")` reads exactly the same value a lower-case
 *    search cannot see. This repository has a recorded incident of precisely
 *    this class: `grep -c 'CREATE POLICY' supabase/schema.sql` returns **0**
 *    while `grep -ci` returns **37**, because that file is lower-case and the
 *    migrations are upper-case. That zero was written down as a fact and became
 *    the false guardrail D-32-C, which tells readers not to look where 37
 *    policies are. A check that returns the right number for the wrong reason
 *    is worse than no check.
 *
 * 3. **Comments are COUNTED, not filtered — deliberately, and this is the one
 *    place this script over-reports.** Decision 1 removed the only comment
 *    parser available, and writing a second one would re-import the defect it
 *    was rejected for. The consequence is that a line like the stale mention at
 *    `src/types/database.ts:389` counts toward the verdict even though a comment
 *    is not a reader. That error has a direction, and it is the safe one: the
 *    meter can only ever demand MORE deletion, never less, so it cannot pass a
 *    tree that still reads the header. Each hit IS labelled `code` or `comment?`
 *    in the report by a trivial "does the trimmed line start with // or *"
 *    heuristic — **presentational only**. The label never changes the verdict,
 *    so a mislabel costs a reader one glance and costs the assertion nothing.
 *
 * 4. **The exemption is ONE exact relative path, compared for equality.** Not a
 *    substring, not a glob, not a basename. `src/lib/supabase/middleware.ts` is
 *    the only file permitted to name these headers, because it is the only file
 *    permitted to SET them. If it is ever renamed — the Next.js
 *    `middleware` → `proxy` deprecation is real and is deliberately not this
 *    phase's work — this script REFUSES rather than quietly exempting whatever
 *    moved into the name. The exemption is printed on every run, pass or fail,
 *    so a reader always knows the assertion has exactly one hole and where.
 *
 * 5. **An empty measurement is a refusal, not a pass.** Zero scannable files
 *    would make the verdict vacuously green, and a check that cannot fail is
 *    not a check — the same refusal `verify-capabilities.mjs` and
 *    `rls-baseline.mjs` make.
 *
 * SECRECY. `.planning/` is tracked and this repository is PUBLIC (`CLAUDE.md`
 * Guardrail 5). This script reads only files already committed here, prints
 * only paths, line numbers and the offending source lines, opens no network
 * connection, reads no environment variable and writes no artefact.
 *
 * Zero dependencies. Node built-ins only, ESM.
 *
 * Usage:
 *   npm run verify:no-header-identity
 *
 * Exit codes, the three this repository's scripts already use:
 *   0  no file outside the exemption names an identity header
 *   1  at least one does — every one is listed, with its path and line
 *   2  nothing was measured: `src/` is missing, the exempt file has moved, or
 *      the walk found no scannable file. No verdict is implied by a 2.
 */

import { readdirSync, readFileSync, existsSync, lstatSync, realpathSync } from 'node:fs';
import { dirname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SRC_DIR = `${ROOT}/src`;

/**
 * The needle, lower-cased once. Every haystack is lower-cased before the
 * comparison, which is what makes the match case-insensitive without a RegExp.
 */
export const HEADER_NEEDLE = 'x-user-';

/**
 * The single exemption, as a normalised repository-relative path.
 *
 * This is a `const` and not an array on purpose: the assertion is worth exactly
 * as much as the number of holes in it, and a list invites a second entry.
 */
export const EXEMPT_PATH = 'src/lib/supabase/middleware.ts';

/** Extensions worth reading. Everything else under `src/` is an asset. */
const SCANNED_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs'];

/** Never walked. There is no `node_modules` under `src/`; belt and braces. */
const SKIP_DIRS = new Set(['node_modules', '.next', '.git']);

/**
 * A refusal is not a failure. It means the measurement did not happen, so no
 * verdict below it means anything — and printing a verdict under a refused
 * measurement is exactly the shape this script exists to stop.
 */
function refuse(message, code) {
  console.log(`\nFATAL: ${message}\n`);
  process.exit(code);
}

/** Repository-relative, forward-slashed, comparable for equality. */
export function toRelative(abs) {
  return abs.slice(ROOT.length + 1).split(sep).join('/');
}

/**
 * Every scannable file under `dir`, as repository-relative paths.
 *
 * Symlinks are skipped: following one could walk out of the repository, and a
 * hit reported at a path nobody can open is a failure message that wastes the
 * reader's time at the worst moment.
 */
export function listScannableFiles(dir) {
  const out = [];
  const walk = (abs) => {
    for (const entry of readdirSync(abs, { withFileTypes: true })) {
      if (SKIP_DIRS.has(entry.name)) continue;
      const child = `${abs}/${entry.name}`;
      if (lstatSync(child).isSymbolicLink()) continue;
      if (entry.isDirectory()) {
        walk(child);
        continue;
      }
      if (!entry.isFile()) continue;
      if (!SCANNED_EXTENSIONS.some((ext) => entry.name.endsWith(ext))) continue;
      out.push(toRelative(child));
    }
  };
  walk(dir);
  return out.sort();
}

/**
 * The reader. Every line of one file that names an identity header.
 *
 * Exported so that a mutation proof can assert its mutation was applied **using
 * this reader**, not a second grep. `ai-engineering.md`'s *prova per mutazione*
 * gate asks for the mutation to be verified before its result is believed, and
 * the only assertion worth having is that the mutation is visible to the eyes
 * that are supposed to catch it: a separate grep can agree with the file and
 * still disagree with this function.
 *
 * Counts LINES, not occurrences — a line naming the header twice is one hit —
 * so the number is directly comparable with
 * `grep -rni 'x-user-' src/ | grep -v 'src/lib/supabase/middleware.ts' | wc -l`.
 */
export function findHeaderLines(relPath) {
  const source = readFileSync(`${ROOT}/${relPath}`, 'utf8');
  const hits = [];
  const lines = source.split('\n');
  for (let i = 0; i < lines.length; i += 1) {
    const raw = lines[i].split('\r').join('');
    if (!raw.toLowerCase().includes(HEADER_NEEDLE)) continue;
    const text = raw.trim();
    // Presentational only — see decision 3 in the file comment. This label
    // never touches the verdict, so a mislabel costs a glance and nothing else.
    const looksLikeComment =
      text.startsWith('//') || text.startsWith('*') || text.startsWith('/*');
    hits.push({ path: relPath, line: i + 1, text, looksLikeComment });
  }
  return hits;
}

/** The whole measurement, as data. Exported for the same reason as above. */
export function scan() {
  const files = listScannableFiles(SRC_DIR);
  const scanned = files.filter((rel) => rel !== EXEMPT_PATH);
  const hits = [];
  for (const rel of scanned) hits.push(...findHeaderLines(rel));
  return { files, scanned, hits };
}

/**
 * Assertion B — the strip is ARMED, as LIVE CODE.
 *
 * Assertion A (the census above) exempts the middleware, so by construction it
 * can say nothing about the three lines that do the actual work. This is the
 * check for those three lines, and it exists because the property it guards is
 * the one thing a green census cannot imply.
 *
 * Two failure modes, and the filter is what separates them from a pass:
 *
 *   1. The lines are COMMENTED OUT. `scripts/probe-forged-identity.sh` comments
 *      out exactly these three lines as its positive control and restores them
 *      afterwards. An unfiltered `grep -c` counts the commented copies and
 *      reports 3 — a green from a disarmed guard, produced by a botched
 *      restore, on the only remaining protection against a future reader.
 *   2. A `set` comes back. That is worse than a missing `delete`, because it
 *      manufactures a value that looks authoritative to whoever reads it.
 *
 * The filter drops any line whose first non-space character begins a comment
 * (`//`, `*`, `/*`). It is deliberately crude: a header name inside a string
 * literal on a comment-shaped line is not a thing this file has ever contained,
 * and a crude filter that is obviously correct beats a parser that is subtly
 * not. (`scripts/verify-capabilities.mjs` is the cautionary case — WR-07: a
 * string literal containing an apostrophe defeats its parser, and one exists at
 * `src/app/(auth)/register/page.tsx:13`.)
 */
export const EXPECTED_DELETES = 3;

export function stripCounts(source) {
  const live = source
    .split('\n')
    .filter((line) => !/^\s*(\/\/|\*|\/\*)/.test(line));
  const count = (needle) =>
    live.filter((line) => line.includes(needle)).length;
  return {
    deletes: count(`requestHeaders.delete("${HEADER_NEEDLE}`),
    sets: count(`requestHeaders.set("${HEADER_NEEDLE}`),
  };
}

function inspectStrip() {
  const counts = stripCounts(readFileSync(`${ROOT}/${EXEMPT_PATH}`, 'utf8'));
  return {
    ...counts,
    ok: counts.deletes === EXPECTED_DELETES && counts.sets === 0,
  };
}

// ── the run ────────────────────────────────────────────────────────────────

/**
 * Direct invocation, compared on REAL paths.
 *
 * `verify-capabilities.mjs:624` compares `resolve(process.argv[1])` with
 * `fileURLToPath(import.meta.url)`, and that comparison is unsound whenever any
 * component of the path is a symlink: Node resolves `import.meta.url` through
 * the link and leaves `process.argv[1]` as typed. **MEASURED while writing this
 * script**: run from `/tmp/...` — and `/tmp` is a symlink to `private/tmp` on
 * macOS — the guard evaluated false, so the script loaded its exports, asserted
 * nothing, printed nothing and **exited 0**. A silent green from a check that
 * never ran is the exact failure this repository keeps recording, and it would
 * arrive in the one place nobody looks: a passing gate.
 *
 * `realpathSync` on both sides removes the whole class. It is wrapped because a
 * path that cannot be resolved must not throw here — a crash in the guard would
 * trade a silent pass for a noisy one, and neither is a measurement.
 */
const realOrSelf = (p) => {
  try {
    return realpathSync(p);
  } catch {
    return resolve(p);
  }
};
const invokedDirectly =
  Boolean(process.argv[1]) &&
  realOrSelf(process.argv[1]) === realOrSelf(fileURLToPath(import.meta.url));

if (invokedDirectly) {
  console.log('\nverify-no-header-identity — who still trusts an inbound identity header\n');

  if (!existsSync(SRC_DIR)) {
    refuse(`${toRelative(SRC_DIR)} does not exist. Nothing was measured.`, 2);
  }

  if (!existsSync(`${ROOT}/${EXEMPT_PATH}`)) {
    refuse(
      `the one exempt file, ${EXEMPT_PATH}, DOES NOT EXIST.\n` +
        '\n' +
        'It was not scanned and it was not found, so this run asserts nothing. The likely\n' +
        'cause is the Next.js `middleware` → `proxy` rename, which is real and is deliberately\n' +
        'not this phase\'s work. Re-point EXEMPT_PATH at the new file ON PURPOSE, in a commit\n' +
        'that says so — do NOT let the exemption follow a name, because the next thing to move\n' +
        'into that name inherits permission to trust client-supplied input.',
      2
    );
  }

  const { files, scanned, hits } = scan();

  if (files.length === 0) {
    refuse(
      `the walk of ${toRelative(SRC_DIR)} found no ${SCANNED_EXTENSIONS.join('/')} file, so the\n` +
        'verdict below would be vacuously green. A check that cannot fail is not a check.',
      2
    );
  }

  console.log(`  scanned  : ${scanned.length} files under src/`);
  console.log(`  exempt   : ${EXEMPT_PATH} — the ONLY file permitted to name these headers,`);
  console.log('             because it is the only file permitted to DELETE them. After plan');
  console.log('             33-14 NOTHING may set them, and assertion B below enforces that.');
  console.log(`  needle   : "${HEADER_NEEDLE}", literal substring, matched case-insensitively.`);
  console.log('             Comments are COUNTED, not filtered — see decision 3 in this file.\n');

  const strip = inspectStrip();
  console.log(
    `  strip    : ${strip.deletes} live delete(s), ${strip.sets} live set(s) in ${EXEMPT_PATH}` +
      ` (comments filtered)\n`
  );

  if (hits.length === 0 && strip.ok) {
    console.log(`  ✓ A. no file outside ${EXEMPT_PATH} names an identity header.`);
    console.log(
      `  ✓ B. the strip is ARMED: exactly ${EXPECTED_DELETES} live deletes, no live set.\n`
    );
    console.log(
      '  This says nothing about whether the middleware strip works at runtime — that is\n' +
        '  scripts/probe-forged-identity.sh — and nothing about whether anything is authorised\n' +
        '  correctly. The middleware is UX; RLS is the security boundary.\n'
    );
    process.exit(0);
  }

  if (!strip.ok) {
    console.log('  ✗ B. THE STRIP IS NOT ARMED.\n');
    console.log(
      `      expected: ${EXPECTED_DELETES} live \`requestHeaders.delete("${HEADER_NEEDLE}…")\` and 0 live\n` +
        `                \`requestHeaders.set("${HEADER_NEEDLE}…")\` in ${EXEMPT_PATH}\n` +
        `      measured: ${strip.deletes} delete(s), ${strip.sets} set(s)\n`
    );
    console.log(
      '      Comment lines are filtered BEFORE counting, and that is load-bearing. An\n' +
        '      unfiltered count reads 3 for a middleware whose three delete lines were left\n' +
        '      COMMENTED OUT by a botched restore after a positive-control mutation — a green\n' +
        '      from a disarmed guard, on the one line that protects every future reader.\n'
    );
    console.log(
      '      A live `set` is worse than a missing `delete`: it manufactures a value that\n' +
        '      looks authoritative. Nothing may set these names again.\n'
    );
    if (hits.length === 0) process.exit(1);
  }

  const byFile = new Map();
  for (const hit of hits) {
    if (!byFile.has(hit.path)) byFile.set(hit.path, []);
    byFile.get(hit.path).push(hit);
  }

  console.log(`  ✗ ${hits.length} line(s) across ${byFile.size} file(s) name an identity header:\n`);
  for (const [path, fileHits] of byFile) {
    for (const hit of fileHits) {
      const label = hit.looksLikeComment ? ' [comment?]' : '';
      console.log(`      ${path}:${hit.line}:${label} ${hit.text}`);
    }
  }

  const commentish = hits.filter((h) => h.looksLikeComment).length;
  console.log(
    `\n  ${hits.length} line(s): ${hits.length - commentish} in code, ${commentish} comment-shaped\n` +
      '  (the label is presentational; both count toward the verdict).\n'
  );
  console.log(
    '  WHAT THIS MEANS, precisely: each line above is a surface deriving an identity from an\n' +
      '  INBOUND REQUEST HEADER, which is client-supplied input — the client can send whatever\n' +
      `  it likes. Only ${EXEMPT_PATH} may set those names, so anything read\n` +
      '  elsewhere is trusted on the strength of a middleware that runs before it rather than\n' +
      '  on a session. Replace each read with a server-side identity resolved from the session.\n'
  );
  console.log(
    '  If this is phase 33 and the count is falling, that is the meter working as intended.\n' +
      '  It is EXPECTED to exit 1 until plan 33-14 lands.\n'
  );
  process.exit(1);
}
