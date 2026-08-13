#!/usr/bin/env node
/**
 * verify-sunset-gradient.mjs — SunSet's signature is declared once and worn by
 * nobody.
 *
 * WHAT IT ASSERTS, in one sentence: **the four-stop `94deg` signature appears
 * exactly once across the token file and everything under `src/`, that once is
 * in the token file, and no file under `src/` — the declaration site excepted —
 * either contains the signature or reaches the gradient by name.**
 *
 * WHY A STRUCTURAL CHECK AND NOT A TEST ON ONE FILE. *«Il colore non si
 * eredita»* — the sunset gradient is **SunSet's exclusive signature**
 * (`brand-visual-system.md`), and a format that borrowed it would be wearing
 * another format's identity. There is no technical objection to that happening:
 * a gradient renders perfectly wherever it is written, the build stays green,
 * and the mistake is only visible to somebody who knows what the four stops
 * mean. `36-VISUAL-SOURCE.md:86-94` records the artifact saying it twice in
 * different words — *«il tramonto resta a SunSet»* — and drawing a
 * palette-less format's wireframe **deliberately neutral** rather than filling
 * it with somebody else's sunset. A test on one file proves that file. What
 * makes this a rule is that there is nowhere else the signature can be. Absence
 * is checkable.
 *
 * ── WHAT A GREEN DOES NOT MEAN (cosa un verde NON significa) ────────────────
 *
 *   - It cannot see a gradient COMPOSED AT RUNTIME — four stops fetched from a
 *     catalogue row, a string built by concatenation, or four separate
 *     `color-stop` variables assembled in a style object. This script reads
 *     text; it cannot follow a value.
 *   - It does NOT say a SunSet surface looks right. It says no OTHER surface has
 *     taken SunSet's signature. Whether the gradient is used well, where it is
 *     used at all, is a judgement about a night and not a regular expression.
 *   - It says nothing about materials. The rule it enforces exists because a
 *     format with no palette must **declare its emptiness** rather than borrow
 *     one — and that is a production rule about locandine and stories as much as
 *     about CSS. A green here reaches the product only.
 *   - It reads `src/` and the token file, and DELIBERATELY NOT `.next/`. The
 *     `bg-grad-sunset` rule is present in the EMITTED BUNDLE with zero surfaces
 *     applying it, because Tailwind scans the token file itself as a source and
 *     finds the utility name at its declaration site — measured on a real build
 *     artefact in 40-02, deviation 4. A gate reading the build output would
 *     conclude the gradient is applied, go red on a correct tree, and be
 *     switched off.
 *   - It does NOT read `.planning/` or `docs/`. This repository writes the
 *     signature down in prose in its planning documents ON PURPOSE, and a gate
 *     that reported its own documentation is the defect
 *     `ColorSwatchPicker.tsx:22-27` already records.
 *
 * ── THE THREE CHECKS ────────────────────────────────────────────────────────
 *
 *   A. Declared exactly once. The signature appears once across the scanned set,
 *      and that once is in the token file. Two occurrences fail; ZERO
 *      occurrences is a `refuse()` (exit 2), because a gate that cannot find the
 *      thing it guards has measured nothing.
 *   B. Applied by zero files. No file under `src/` contains the signature, and
 *      none reaches the gradient by name — neither `var(--grad-sunset)` nor the
 *      utility `bg-grad-sunset`. The allow-list is explicit and EMPTY TODAY.
 *   C. The check excludes its own declaration site. The token file is exempt
 *      from B by exact path, with a `refuse()` if it has moved.
 *
 * ── THE TRAP, MEASURED RATHER THAN ARGUED ───────────────────────────────────
 *
 * **15 files under `src/` use a `bg-gradient*` utility**, and two of them are
 * accent fades — `(public)/tickets/[id]/page.tsx` and
 * `(members)/dashboard/page.tsx` carry `bg-gradient-to-br from-accent/30
 * to-accent/5`. Those are **accent fades, not the sunset gradient**: they follow
 * `--accent` wherever it is retargeted, and they are correct today.
 *
 * A check that fired on the word "gradient" would go red on all fifteen, be
 * declared noisy, and be switched off — after which it guards nothing. That
 * failure mode is written into `verify-media-strip.mjs:51-62` because this
 * repository has already paid for it. **The signature, and only the signature:**
 * `linear-gradient` with `94deg` and the four stops in order. Nothing here
 * matches the word.
 *
 * ── NORMALISATION, AND WHY IT IS NOT A FORMATTING CHECK ─────────────────────
 *
 * Before matching, each file is lower-cased, its comment lines are blanked, and
 * every run of whitespace — newlines included — collapses to a single space,
 * with each surviving character keeping the line it came from so a hit can still
 * be reported as `path:line`. A four-stop signature that a formatter split
 * across two lines must still match, or this stops being a gate about a brand
 * and becomes a gate about line width.
 *
 * ── COMMENT HYGIENE, WHICH IS LOAD-BEARING HERE ─────────────────────────────
 *
 * Comment lines are blanked BEFORE matching. The token file's own paragraphs
 * explain the gradient at length, and any file that documented the rule would
 * otherwise fail it. The precedent is explicit: `ColorSwatchPicker.tsx:22-27`
 * states this very rule and applies it by **omitting** the gradient string,
 * *precisely so an acceptance check does not match the sentence forbidding the
 * thing*.
 *
 * The stripper is a LINE-SHAPE heuristic (`//`, `*`, `/*`, `*\/`), deliberately
 * not a tokeniser: WR-07 (`32-REVIEW.md`) records that a real comment parser
 * written in this repository was unsound. Its error direction is to KEEP a
 * trailing comment on a code line, which can only ever make this script report
 * MORE, never less — and both checks here fail on presence, so that direction is
 * safe. It costs one thing, stated rather than discovered: the signature written
 * as a trailing comment on a code line WOULD be reported. That is the safe way
 * round.
 *
 * SECRECY. `.planning/` is tracked and this repository is PUBLIC (`CLAUDE.md`
 * Guardrail 5). This script reads only committed files, prints only paths, line
 * numbers and source lines, opens no network connection, reads no environment
 * variable and writes no artefact. The six values in the signature were already
 * public in `.claude/rules/brand-visual-system.md` before today. No venue, no
 * unannounced date, no line-up, no personal name — and nothing here says what
 * SunSet, or any format, SOUNDS like (`sound-manifesto.md`).
 *
 * Zero dependencies. Node built-ins only, ESM. Deliberately NOT wired into
 * `npm run build`, for the reason `verify-tokens.mjs` states.
 *
 * Usage:
 *   npm run verify:sunset-gradient
 *
 * Exit codes:
 *   0  every check passed
 *   1  at least one failed — each is printed with its file and line
 *   2  nothing was measured: `src/` is missing, the token file has moved, the
 *      walk found no scannable file, or the signature could not be found at all.
 *      No verdict is implied by a 2.
 */

import { readdirSync, readFileSync, existsSync, lstatSync } from 'node:fs';
import { dirname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

import { liveLinesFrom } from './lib/comments.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SRC_DIR = `${ROOT}/src`;

/**
 * The one stylesheet the root layout loads, and the gradient's declaration site.
 * An exact path, compared for equality — check C.
 */
export const TOKEN_FILE = 'src/app/globals.css';

/** The token's name, and the one utility that carries it. */
export const GRADIENT_TOKEN = 'grad-sunset';

/**
 * The files allowed to APPLY SunSet's gradient.
 *
 * **Explicit, and empty today** (`40-UI-SPEC.md` §7 clause 3): no SunSet surface
 * exists yet. Adding the first one is a DECISION that edits this constant — not
 * a diff nobody reads. An entry here is an exact path, and it should arrive with
 * a comment saying which surface it is and why that surface is SunSet's.
 */
export const ALLOW_LIST = [];

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

const liveLinesCache = new Map();

/**
 * The file's lines, comments blanked, carriage returns removed.
 *
 * **This gate was the second of the two `41.1-PATTERNS.md` §5.1 found.**
 * D-41.1-07 named eight scripts; the count was taken with a grep for the
 * state-machine identifiers, and this file carries only the line-shape half —
 * the four-line `isCommentLine` at digest `35d258011314`, in six copies rather
 * than four. Deleting it here is what makes *"one module"* true rather than
 * nearly true.
 *
 * §4.4 measured the extraction over all 263 files under `src/`: against family
 * A, **zero lines become live**. Both consumers below fail on presence of the
 * gradient, so blanking more can only under-report, never redden.
 */
function liveLines(relPath) {
  const cached = liveLinesCache.get(relPath);
  if (cached) return cached;

  const raw = readFileSync(`${ROOT}/${relPath}`, 'utf8').split('\n');
  const { lines, unterminated } = liveLinesFrom(raw);
  if (unterminated !== null) refuseUnterminated(relPath, unterminated);

  liveLinesCache.set(relPath, lines);
  return lines;
}

/**
 * The file lower-cased, comments blanked, every whitespace run collapsed to one
 * space — plus, for every surviving character, the source line it came from.
 *
 * The line map is the whole reason this is not a one-line `replace`: a hit has
 * to be reportable as `path:line`, and a report without a line number is a
 * report somebody has to go looking for.
 */
export function normalised(relPath) {
  const raw = liveLines(relPath);
  let text = '';
  const lineOf = [];
  const push = (ch, line) => {
    if (/\s/.test(ch)) {
      if (text.length === 0) return;
      if (text[text.length - 1] === ' ') return;
      text += ' ';
      lineOf.push(line);
      return;
    }
    text += ch;
    lineOf.push(line);
  };
  for (let i = 0; i < raw.length; i += 1) {
    const live = raw[i].toLowerCase();
    for (const ch of live) push(ch, i + 1);
    push(' ', i + 1); // the newline itself becomes a separator
  }
  return { text, lineOf };
}

/**
 * The four-stop `94deg` signature — `40-UI-SPEC.md` §7, published there and
 * declared by plan 40-02.
 *
 * Written as a pattern rather than a string so a formatter's spacing cannot
 * defeat it. `\s*` and `\s+` each match at most one space against the
 * normalised text, which is the point: the shape is fixed, the whitespace is
 * not.
 */
export const SIGNATURE_RE =
  /linear-gradient\(\s*94deg\s*,\s*#ffb25e\s+0%\s*,\s*#ff7a2f\s+30%\s*,\s*#ff5c93\s+62%\s*,\s*#a874e8\s+100%\s*\)/g;

/** Every occurrence of the signature in `relPath`, with its line number. */
export function findSignature(relPath) {
  const { text, lineOf } = normalised(relPath);
  const hits = [];
  SIGNATURE_RE.lastIndex = 0;
  let m;
  while ((m = SIGNATURE_RE.exec(text)) !== null) {
    hits.push({ path: relPath, line: lineOf[m.index] ?? 0 });
  }
  return hits;
}

/**
 * Every reference to the gradient BY NAME in `relPath`, with its line number.
 *
 * Matched at a boundary on both sides, so a longer name that merely contains
 * this one is not a reference — and so `bg-grad-sunset`, `var(--grad-sunset)`
 * and a bare `--grad-sunset` all are.
 */
export function findNameReferences(relPath) {
  const raw = liveLines(relPath);
  const re = new RegExp(`(?<![a-zA-Z0-9])${GRADIENT_TOKEN}(?![a-zA-Z0-9-])`, 'g');
  const hits = [];
  for (let i = 0; i < raw.length; i += 1) {
    const line = raw[i];
    if (line === '') continue;
    re.lastIndex = 0;
    if (!re.test(line.toLowerCase())) continue;
    hits.push({ path: relPath, line: i + 1, text: line.trim() });
  }
  return hits;
}

// ── the run ────────────────────────────────────────────────────────────────

if (!existsSync(SRC_DIR)) refuse('`src/` does not exist. Nothing was measured.');

if (!existsSync(`${ROOT}/${TOKEN_FILE}`)) {
  refuse(
    `${TOKEN_FILE} does not exist. It is the gradient's declaration site, exempt from\n` +
      '       check B by exact path, and exempting whatever moved into the name would be\n' +
      '       worse than refusing. If the token layer genuinely moved, TOKEN_FILE in this\n' +
      '       script moves with it — in the same commit, because the gate and the thing it\n' +
      '       guards are one change. Nothing was measured.'
  );
}

const srcFiles = listScannableFiles(SRC_DIR);
if (srcFiles.length === 0) {
  refuse('the walk of `src/` found no scannable file. A vacuous green is not a green.');
}

const scanned = [TOKEN_FILE, ...srcFiles];

const failures = [];

const signatureHits = scanned.flatMap((rel) => findSignature(rel));
if (signatureHits.length === 0) {
  refuse(
    'the four-stop 94deg signature was not found anywhere in the scanned set — not even\n' +
      `       in ${TOKEN_FILE}. A gate that cannot find the thing it guards has measured\n` +
      '       nothing, and a green here would say "no surface has taken SunSet\'s signature"\n' +
      '       when what actually happened is that the signature stopped existing. Either the\n' +
      '       declaration was removed (in which case DS-03 has no subject and this script has\n' +
      '       no job) or its shape changed (in which case SIGNATURE_RE moves in the same\n' +
      '       commit, and 40-UI-SPEC.md §7 is the source it moves toward). Nothing was\n' +
      '       measured.'
  );
}

const applications = [];
for (const rel of srcFiles) {
  if (rel === TOKEN_FILE) continue; // check C — the declaration site
  if (ALLOW_LIST.includes(rel)) continue;
  for (const hit of findSignature(rel)) {
    applications.push({ ...hit, how: 'the signature, written out' });
  }
  for (const hit of findNameReferences(rel)) {
    applications.push({ ...hit, how: `the name \`${GRADIENT_TOKEN}\`` });
  }
}

console.log('\nverify-sunset-gradient — declared once, worn by nobody');
console.log(`  declaration site (exempt from check B): ${TOKEN_FILE}`);
console.log(`  scanned ${scanned.length} file(s) — the token file and ${srcFiles.length} under src/`);
console.log(`  never read: .next/ (the bundle carries the utility with zero surfaces applying it)`);
console.log(`  ALLOW_LIST length: ${ALLOW_LIST.length}\n`);

// ── A. declared exactly once, in the token file ────────────────────────────
const outsideTokenFile = signatureHits.filter((h) => h.path !== TOKEN_FILE);
if (signatureHits.length === 1 && outsideTokenFile.length === 0) {
  console.log(
    `  ✓ A  the four-stop 94deg signature appears exactly once: ${signatureHits[0].path}:` +
      `${signatureHits[0].line}`
  );
} else {
  console.log(`  ✗ A  the signature appears ${signatureHits.length} time(s):`);
  for (const h of signatureHits) console.log(`         ${h.path}:${h.line}`);
  console.log(
    '\n       The gradient exists as exactly ONE token, and no component composes the stops\n' +
      '       itself: a surface either uses the single utility that carries it or it does not\n' +
      '       have the gradient (40-UI-SPEC.md §7 clauses 1 and 2). A second copy is a second\n' +
      '       source for a brand fact, and the two drift — after which retargeting the token\n' +
      '       reaches every surface except the copy, silently.\n'
  );
  failures.push('A');
}

// ── B. applied by zero files ───────────────────────────────────────────────
if (applications.length === 0) {
  console.log(
    `  ✓ B  no file under src/ applies the gradient — ${srcFiles.length} file(s) read, ` +
      `${ALLOW_LIST.length} allowed`
  );
} else {
  console.log(`  ✗ B  ${applications.length} line(s) under src/ apply SunSet's gradient:`);
  for (const h of applications) {
    console.log(`         ${h.path}:${h.line}: via ${h.how}${h.text ? ` — ${h.text}` : ''}`);
  }
  console.log(
    '\n       "Il colore non si eredita." The sunset gradient is SunSet\'s EXCLUSIVE\n' +
      '       signature, and a surface that is not SunSet wearing it takes the meaning away\n' +
      '       from the format it belongs to — for every visitor at once, and on every\n' +
      '       material that copies the screen afterwards. A format with no palette of its own\n' +
      '       stays NEUTRAL until it has one; borrowing the sunset is how a format loses its\n' +
      '       identity before acquiring one (brand-visual-system.md, 36-VISUAL-SOURCE.md).\n' +
      '       If this file IS a SunSet surface, that is a decision: add its exact path to\n' +
      '       ALLOW_LIST in this script, with a comment saying which surface it is.\n'
  );
  failures.push('B');
}

// ── C. the exclusion excludes something ────────────────────────────────────
//
// This check printed `✓` unconditionally and could not fail — which made it a
// decoration, and `ai-engineering.md`'s *un gate deve poter fallire* says a
// guard no reachable situation can trip is worse than no guard, because it
// makes something look watched that is not.
//
// What it now asserts is the thing check B's correctness rests on: the path
// check B exempts must be the path that actually declares the signature. If the
// declaration moves and `TOKEN_FILE` is not moved with it, B exempts a file that
// declares nothing while scanning the real declaration site as a consumer — and
// then B goes red on the one file that is *supposed* to carry the gradient,
// which is how a correct tree gets a gate switched off.
//
// Reachable, and reached: with `TOKEN_FILE` pointing at a file with no
// signature and the signature present in a `.tsx` under `src/`, A and B fail on
// the declaration site itself. C names the cause the other two only symptomise.
const declarationHits = findSignature(TOKEN_FILE);
if (declarationHits.length === 0) {
  console.log(
    `  ✗ C  check B exempts ${TOKEN_FILE} by exact path, but that file does not contain the\n` +
      '       signature. The exemption is therefore protecting a file that declares nothing,\n' +
      '       while the file that DOES declare the gradient is scanned as a consumer — so\n' +
      '       check B will go red on the one file allowed to carry it, and A will report the\n' +
      '       declaration as an application. Move TOKEN_FILE to wherever the declaration now\n' +
      '       lives, in the same commit that moved it.\n'
  );
  failures.push('C');
} else {
  console.log(
    `  ✓ C  check B's exempt path (${TOKEN_FILE}) is the path that actually declares the ` +
      `signature — ${declarationHits.length} occurrence(s) there`
  );
}

// ── verdict ────────────────────────────────────────────────────────────────
console.log('');
if (failures.length === 0) {
  console.log('  SUNSET_GRADIENT_OK — all three checks passed.');
  console.log(
    '  Read the header before treating this as safety: it cannot see a gradient composed\n' +
      '  at runtime from values on a catalogue row, nor one assembled by string\n' +
      '  concatenation, nor one expressed as four separate colour-stop variables. And it\n' +
      '  does not say a SunSet surface looks right — it says no OTHER surface has taken\n' +
      "  SunSet's signature.\n"
  );
  process.exit(0);
}
console.log(`  SUNSET_GRADIENT_FAIL — ${failures.length} check(s) failed: ${failures.join(', ')}\n`);
process.exit(1);
