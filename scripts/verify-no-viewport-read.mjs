#!/usr/bin/env node
/**
 * verify-no-viewport-read.mjs — the tier is decided by the browser at paint, and
 * no JavaScript anywhere under `src/` asks how wide the window is.
 *
 * WHAT IT ASSERTS, in one sentence: **`matchMedia`, `useSyncExternalStore` and
 * `innerWidth` occur ZERO times in the live lines of every scannable file under
 * `src/`.**
 *
 * There is no exemption list, and the absence of one is the point.
 * `41-UI-SPEC.md` §0 rule 6 measured all three at zero on this tree and decided
 * the phase adds none; §13's G7 row records the exemptions as *"none. Zero
 * today; the gate keeps it zero"*. A gate whose allow-list is empty because
 * nothing legitimate needs it is the cheapest gate there is.
 *
 * WHY A STRUCTURAL CHECK AND NOT A TEST. There is no test runner in this
 * repository — no `test` script, no `*.test.*`, no `*.spec.*` (`CLAUDE.md`
 * Guardrail 1) — so "verified" here means `npm run build` plus a structural
 * check plus a written manual procedure. And `npm run build` is blind to this
 * one by construction: `window.matchMedia("(min-width: 768px)")` is valid
 * TypeScript, types clean, renders without warning, and looks perfect on the
 * machine of whoever wrote it. It fails on somebody else's device, as a flash of
 * the tier the server guessed wrong — the server has no viewport, so the first
 * paint is always the fallback branch and the correct one arrives after
 * hydration. That is an observation, not an exception, and no type gate can
 * reach it.
 *
 * The failure is also invisible after the fact: this project has **no error
 * tracking at all** (`meta-gates.md`, verified 2026-08-05), so a tier that
 * flashes wrong on a member's phone reaches a human only when a human happens to
 * be holding that phone. A check that runs before the merge is the only place
 * this is cheap.
 *
 * And the rule is worth a gate rather than a paragraph because it is the kind of
 * rule that gets re-litigated one `useEffect` at a time. Nobody proposes
 * "let us read the viewport in JavaScript"; somebody proposes one hook, for one
 * component, with a good reason. The second one cites the first.
 *
 * ── WHAT A GREEN DOES NOT MEAN (cosa un verde NON significa) ────────────────
 *
 *   - THIS READS TEXT, NOT BEHAVIOUR. It cannot see a viewport read reached
 *     through a renamed import (`import { matchMedia as mq }`), one reached
 *     through a dependency's own code, or one assembled by string concatenation
 *     (`` window[`inner${"Width"}`] ``). Every one of those is a real way to
 *     break §0 rule 6 while this script stays green.
 *   - IT SAYS NOTHING ABOUT WHETHER THE CSS-ONLY SWITCH IS CORRECT. Zero
 *     viewport reads is the statement that no JavaScript is deciding the tier.
 *     It is not the statement that the tier it lands on is the right one. A
 *     dialog can be CSS-only and still be a sheet at 1400px, a table can be
 *     CSS-only and still be unreadable at 768px. **H41-2** — sheet, window,
 *     Escape, background scroll, observed at three widths by a person — is what
 *     closes what this cannot see, and it is a human's, not a script's.
 *   - IT DOES NOT PROVE THE BUNDLE A DEVICE RECEIVED. It reads the files in the
 *     working tree. What a phone downloaded through a service worker with the
 *     radio off is a different claim, and it belongs to the door procedure.
 *   - A GREEN HERE IS THE SHAPE MOST LIKELY TO BE FALSE, because the subject is
 *     legitimately empty: this check passes by finding nothing, which is exactly
 *     what a check that measured nothing also does. That is the whole reason for
 *     the refusal below — see the exit-code note on 2.
 *
 * ── A NOTE ON `useSyncExternalStore` ────────────────────────────────────────
 *
 * It is a general React primitive, not a viewport API, and it has legitimate
 * non-viewport uses — subscribing to an online/offline store, for one, which is
 * not hypothetical in a product with `src/lib/offline/`. It is named here anyway
 * because §0 rule 6 named it: it is the idiomatic way a `useMediaQuery` hook is
 * written, and the phase decided the count stays at zero rather than at "zero
 * viewport ones". If a legitimate non-viewport use ever arrives, **removing the
 * name is a DECISION that edits this constant** — not a diff nobody reads, and
 * not a `// eslint-disable` at the call site.
 *
 * ── THE ONE CHECK ───────────────────────────────────────────────────────────
 *
 *   A. None of the three names appears in a live line of any scannable file
 *      under `src/`. Every hit is printed with its file, its line number and the
 *      source line, so a red says what to delete rather than that something is
 *      wrong.
 *
 * MATCHING IS DELIBERATELY LOOSE — a plain substring, with no word boundary.
 * `useSyncExternalStoreWithSelector` contains `useSyncExternalStore` and is
 * caught; `window.innerWidth`, `globalThis.innerWidth` and a destructured
 * `const { innerWidth } = window` are all caught. On an ABSENCE check the error
 * direction of a loose match is to report MORE, never less, and reporting more
 * on a check that should find nothing costs a sentence of explanation, while
 * reporting less costs the rule.
 *
 * ── COMMENT HYGIENE, WHICH IS LOAD-BEARING HERE ─────────────────────────────
 *
 * Comment lines are blanked BEFORE any counting, with the line-shape heuristic
 * (`//`, `*`, `/*`, `*​/`) that `verify-tokens.mjs:437-450` and
 * `verify-media-strip.mjs:163` already use — deliberately not a tokeniser,
 * because WR-07 (`32-REVIEW.md`) records that a real comment parser written here
 * was unsound. Without the blanking, a component that documents *why* it does
 * not read the viewport would fail the gate for saying so, and the fix everyone
 * would reach for is deleting the explanation.
 *
 * The heuristic's error direction is to KEEP a trailing comment on a code line,
 * which can only make this script report MORE. On an absence check that is safe.
 *
 * ── WHY THE HELPERS ARE LOCAL AND NOT IMPORTED ──────────────────────────────
 *
 * `41-02-PLAN.md` asked for `listScannableFiles` and `liveLines` to be imported
 * from `./verify-tokens.mjs`, which exports both. **They cannot be**, and the
 * reason is worth recording so nobody re-tries it:
 *
 *     node -e "import('./scripts/verify-tokens.mjs').then(…)"
 *     → prints all seven TOKENS checks, then TOKENS_OK, then exits 0.
 *       The `.then` never runs.
 *
 * `verify-tokens.mjs` runs its checks at module scope and ends in
 * `process.exit()` (`:1041-1058`). Importing it does not borrow two functions;
 * it RUNS THE TOKEN GATE AND EXITS THIS PROCESS WITH THE TOKEN GATE'S VERDICT.
 * This script would then exit 0 having measured nothing — a vacuous green
 * wearing another gate's ✓, which is precisely the spoofing threat T-41-06 the
 * plan asks this file to defend against.
 *
 * The cross-script import the plan cites (`verify-capabilities.mjs:145`) works
 * because its target, `rls-baseline.mjs`, has a main-module guard at `:2594`.
 * `verify-tokens.mjs` has none. And the three sibling GATES —
 * `verify-media-strip.mjs:130,163`, `verify-sunset-gradient.mjs:152,185`,
 * `verify-semantic-separation.mjs:270,303` — each declare their own `SKIP_DIRS`
 * and their own walk. Self-contained is the house shape for a gate.
 *
 * **The sentence used to end "and their own `isCommentLine`", and that half was
 * a mistake with a price (D-41.1-07).** `41.1-PATTERNS.md` §5.1 measured **six
 * byte-identical copies** of that four-line function, digest `35d258011314`, two
 * of them in scripts nobody had counted; `41.1-RESEARCH.md` §4.2 measured it
 * false-red on three of seven comment shapes. What made `verify-tokens.mjs`
 * unimportable was its **process exit at module scope**, not the fact of
 * importing — which is why the precedent that always worked, `rls-baseline.mjs`,
 * works: it has a main-module guard. `scripts/lib/comments.mjs` is not a gate at
 * all: it never exits, prints nothing and asserts nothing, and it is proved
 * against all eight shapes by `verify-comment-stripper.mjs`. So the walk stays
 * local and the stripper is imported. The superseded sentence stays visible with
 * the measurement that superseded it (`PageShell.tsx:42-46`).
 *
 * Adding the guard to `verify-tokens.mjs` was the alternative and was refused:
 * plan 41-01 owns that file in this same wave, and two plans editing one file in
 * parallel is the contention this phase is structured to avoid.
 *
 * SECRECY. `.planning/` is tracked and this repository is PUBLIC (`CLAUDE.md`
 * Guardrail 5). This script reads only committed files, prints only paths, line
 * numbers and source lines, opens no network connection, reads no environment
 * variable and writes no artefact.
 *
 * Zero dependencies. Node built-ins only, ESM. Deliberately NOT wired into
 * `npm run build`: `next build` is the type gate, and a type gate that starts
 * failing for a reason that is not a type teaches everyone to ignore it — the
 * same decision already taken for `verify-no-header-identity.mjs` and
 * `verify-media-strip.mjs`.
 *
 * Usage:
 *   node scripts/verify-no-viewport-read.mjs
 *
 * (Not registered in `package.json` by plan 41-02. Plan 41-12 owns that file and
 * registers all six new gates at once, so no two plans in a wave contend for it.)
 *
 * Exit codes:
 *   0  the check passed — all three names have zero occurrences
 *   1  at least one occurrence — each is printed with its file, line and source
 *   2  nothing was measured: `src/` is missing, or the walk found no scannable
 *      file. No verdict is implied by a 2. This exit exists because the check
 *      passes by finding nothing, so "found nothing" and "looked nowhere" print
 *      the same ✓ unless they are told apart here.
 */

import { readdirSync, readFileSync, existsSync, lstatSync } from 'node:fs';
import { dirname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

import { liveLinesFrom } from './lib/comments.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SRC_DIR = `${ROOT}/src`;

/**
 * The three names `41-UI-SPEC.md` §0 rule 6 measured at zero and decided stay at
 * zero. Removing one is a DECISION that edits this constant, with the reason
 * written beside it — see the `useSyncExternalStore` note in the header.
 */
export const VIEWPORT_READS = [
  ['matchMedia', 'the media-query API — the direct way to read a breakpoint in JavaScript'],
  ['useSyncExternalStore', 'the idiomatic way a useMediaQuery hook subscribes to that API'],
  ['innerWidth', 'the raw pixel width of the window, on `window` or on `globalThis`'],
];

const SCANNED_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs'];
const SKIP_DIRS = new Set(['node_modules', '.next', '.git']);

/** A refusal is not a failure: it means the measurement did not happen. */
function refuse(message) {
  console.log(`\nFATAL: ${message}\n`);
  process.exit(2);
}

export function toRelative(abs) {
  return abs.slice(ROOT.length + 1).split(sep).join('/');
}

export function listScannableFiles(dir, extensions = SCANNED_EXTENSIONS) {
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
      if (!extensions.some((ext) => entry.name.endsWith(ext))) continue;
      out.push(toRelative(child));
    }
  };
  walk(dir);
  return out.sort();
}

/**
 * The refusal every consumer of the shared stripper carries (T-41.1-03).
 *
 * A file whose comment never closes is a file the stripper cannot measure, and
 * a gate that kept going would have produced a green about nothing. Measured on
 * 2026-08-13: this fires on **zero** of the 263 files under `src/`, so it is
 * prevention rather than a wave-0 blocker.
 */
function refuseUnterminated(relPath, unterminated) {
  refuse(
    `${relPath}:${unterminated.lineNo} opens a ${unterminated.kind} comment that never closes.\n` +
      '       The shared stripper (scripts/lib/comments.mjs) cannot say where that comment ends,\n' +
      '       so every line after it is unmeasurable and any verdict here would be a green about\n' +
      '       nothing. Measured 2026-08-13: zero of the 263 files under src/ trip this, so it is\n' +
      '       prevention rather than a blocker. NOTHING WAS MEASURED.'
  );
}

/**
 * The file's lines, comments blanked, carriage returns removed.
 *
 * The four-line `isCommentLine` that stood here — `41.1-RESEARCH.md` §4.1's
 * family A, six byte-identical copies at digest `35d258011314` — is gone.
 * §4.4 measured the extraction over all 263 files under `src/`: against family
 * A, **zero lines become live** and 1322 become blank, of which **zero** carry
 * any of this gate's three needles. This is an absence check, so blanking more
 * can only under-report; it cannot redden a correct file.
 */
export function liveLines(relPath) {
  const raw = readFileSync(`${ROOT}/${relPath}`, 'utf8').split('\n');
  const { lines, unterminated } = liveLinesFrom(raw);
  if (unterminated !== null) refuseUnterminated(relPath, unterminated);
  return lines;
}

/** Every occurrence of `name` in `relPath`'s live lines, as `{ line, source }`. */
export function findOccurrences(relPath, name) {
  const hits = [];
  liveLines(relPath).forEach((line, i) => {
    if (!line.includes(name)) return;
    // Count every occurrence on the line, not just the line itself.
    let from = 0;
    for (;;) {
      const at = line.indexOf(name, from);
      if (at === -1) break;
      hits.push({ line: i + 1, source: line.trim() });
      from = at + name.length;
    }
  });
  return hits;
}

// ── the refusals, taken together, BEFORE any tick is printed ────────────────
//
// A refusal printed after a ✓ has already been believed. Everything that could
// make the measurement vacuous is settled here, before anything encouraging
// appears on the screen.

console.log('\n  verify-no-viewport-read — the viewport is never read in JavaScript\n');

if (!existsSync(SRC_DIR)) {
  refuse(`src/ does not exist at ${toRelative(SRC_DIR)} — nothing was scanned.`);
}

const files = listScannableFiles(SRC_DIR);

if (files.length === 0) {
  refuse(
    'the walk of src/ found no scannable file — a vacuous green is not a green.\n' +
      `       Extensions looked for: ${SCANNED_EXTENSIONS.join(', ')}`
  );
}

// ── check A ────────────────────────────────────────────────────────────────

const counted = new Map();
const failures = [];

for (const [name] of VIEWPORT_READS) {
  const hits = [];
  for (const file of files) {
    for (const hit of findOccurrences(file, name)) {
      hits.push({ file, ...hit });
    }
  }
  counted.set(name, hits);
}

console.log(`  files walked under src/: ${files.length}\n`);
console.log('  occurrences, in live lines:\n');
for (const [name, reason] of VIEWPORT_READS) {
  const n = counted.get(name).length;
  console.log(`    ${n === 0 ? '·' : '✗'}  ${String(n).padStart(3)}  ${name}`);
  console.log(`           ${reason}`);
}
console.log('');

for (const [name] of VIEWPORT_READS) {
  const hits = counted.get(name);
  if (hits.length === 0) continue;
  if (!failures.includes('A')) failures.push('A');
  console.log(`  ✗ A  ${name} — ${hits.length} occurrence(s):\n`);
  for (const hit of hits) {
    console.log(`       ${hit.file}:${hit.line}`);
    console.log(`         ${hit.source}`);
  }
  console.log('');
}

if (failures.length === 0) {
  console.log(
    `  ✓ A  matchMedia, useSyncExternalStore and innerWidth have zero occurrences\n` +
      `       in the live lines of ${files.length} file(s) under src/`
  );
}

// ── verdict ────────────────────────────────────────────────────────────────
console.log('');
if (failures.length === 0) {
  console.log('  NO_VIEWPORT_READ_OK — the one check passed.');
  console.log(
    '\n  Read the header before treating this as safety. It reads TEXT, not behaviour:\n' +
      '  it cannot see a viewport read reached through a renamed import, through a\n' +
      '  dependency, or built by string concatenation. And it never says the CSS-only\n' +
      '  switch is RIGHT — only that no JavaScript is deciding the tier. Whether the\n' +
      '  tier it lands on is the correct one is H41-2, observed at three widths by a\n' +
      '  person, and no green here stands in for it.\n'
  );
  process.exit(0);
}
console.log(
  '  NO_VIEWPORT_READ_FAIL — the viewport is read in JavaScript.\n\n' +
    '  41-UI-SPEC.md §0 rule 6: every tier difference is a CSS media query, evaluated\n' +
    '  by the browser at paint, so the server HTML is correct at every width and there\n' +
    '  is no flash of the tier you guessed wrong. The server has no viewport; a read in\n' +
    '  JavaScript can only run after hydration, so the first paint is always the branch\n' +
    '  that was guessed. Delete the read and express the difference in CSS.\n'
);
process.exit(1);
