#!/usr/bin/env node
/**
 * verify-tokens.mjs — a token a utility reads is a token that exists, and no
 * colour reaches a surface through a hex written twice.
 *
 * WHAT IT ASSERTS, in one sentence: **every `var(--x)` inside
 * `src/app/globals.css` resolves to a name that file declares, every
 * `@theme inline` mapping is a one-to-one forward reference into `:root`,
 * nothing is declared twice, no token name that is NOT exposed as a utility has
 * a consumer under `src/`, and no `var(--token, #hex)` fallback exists
 * anywhere.**
 *
 * WHY A STRUCTURAL CHECK AND NOT A TEST ON ONE FILE. There is no test runner in
 * this repository, and — more to the point — the build cannot see this failure.
 * `@tailwindcss/postcss` 4.2.1 was run directly on a fixture containing
 * `bg-ground` (declared), `bg-accent-hover` (undeclared) and
 * `totally-unknown-class`:
 *
 *     BUILD: OK (no error thrown)
 *     warnings: []
 *       .bg-ground              emitted? YES
 *       .bg-accent-hover        emitted? no
 *       .totally-unknown-class  emitted? no
 *
 * No rule, no warning, no error, exit clean. Tailwind cannot distinguish a typo
 * from a string that merely looks like a class name, so it is silent by design.
 * `npm run build` is the only automatic gate this repository has, and it is
 * blind to exactly the failure this script exists for. A test that reads
 * `globals.css` proves `globals.css`; it says nothing about the rename somebody
 * makes in four months, in a commit that touches no consumer and goes green.
 * The property that makes a token layer a system is not "the file is correct",
 * it is "no utility reads a name that is not there". Absence is checkable.
 *
 * And there is no error tracking in this project (`meta-gates.md`): a colour
 * that disappears in production reaches a human only when a human looks.
 *
 * ── WHAT A GREEN DOES NOT MEAN (cosa un verde NON significa) ────────────────
 *
 *   - A grep reads DECLARATIONS, NOT INTENT. It cannot see a colour written as
 *     a raw hex in a component, a token reached through a variable renamed on
 *     the way, or a utility assembled by string concatenation
 *     (`` `bg-${name}` ``). This script cannot follow a value; it reads text.
 *   - It does NOT say a colour is RIGHT. Contrast is arithmetic
 *     (`40-UI-SPEC.md` §4) and legibility at a dark door is an observation, not
 *     a regular expression. A perfectly declared token can still be unreadable
 *     at two in the morning on somebody's phone.
 *   - It cannot see a consumer of a name that was renamed AND never added to
 *     KNOWN_TOKEN_NAMES. That list is the only memory this script has of names
 *     that used to exist. Editing it is PART OF the rename, not an afterthought
 *     — see the comment above the constant.
 *   - It does NOT prove the stylesheet a device actually received. One chunk
 *     emitted is a build fact; one chunk delivered to a phone with the radio
 *     off is a different claim, and it belongs to the door procedure.
 *   - Check D is an ABSENCE check on names that are currently unexposed. It
 *     says nothing about whether an EXPOSED token is used correctly — a
 *     semantic token painted onto a format, or the reverse, is a separate gate.
 *   - CHECK F PROVES THE FILE, AND PROVES NOTHING ABOUT THE LABEL ON ANY HOME
 *     SCREEN. On iOS NO manifest field updates after installation; on Android
 *     `name` and `short_name` are not among the fields that trigger an update,
 *     though `background_color` and `theme_color` are. So a green here is THE
 *     FILE BEING RIGHT, NOT A PHONE BEING RIGHT — and the two are different
 *     claims. The label under the icon on an already-installed app stays what
 *     it was at install time, and the only way to see the new one is a fresh
 *     install. That observation is H1, it is a human's, and IT GETS ONE
 *     ATTEMPT PER DEVICE: once the app is reinstalled, the before-state is
 *     gone. Nothing in this script can stand in for it.
 *
 * ── THE SIX CHECKS ──────────────────────────────────────────────────────────
 *
 *   A. Every `var(--x)` inside the token file resolves — `--x` is declared in
 *      `:root`, or in the `@theme` block, or is one of the `next/font`
 *      variables, which are declared on the generated class that sits on
 *      `<html>` and not in `:root`.
 *
 *      THE THIRD ORIGIN WAS ADDED IN PLAN 40-03, and it is a correction to
 *      this script rather than a loosening of it. Tailwind EMITS every
 *      `@theme` name into `:root` of the built stylesheet — measured, not
 *      assumed:
 *
 *          :root{--font-sans:var(--font-inter),system-ui,…;--font-mono:…}
 *
 *      So `font-family: var(--font-sans)` on `body` resolves at runtime. Until
 *      40-03 no plain CSS rule in this file referenced a `@theme` name, so the
 *      hole could not show; the moment `body` was retargeted onto the
 *      interface role it went red on a CORRECT file, which is the one failure
 *      mode that gets a gate switched off (`verify-media-strip.mjs:51-62`).
 *
 *      It does not weaken what A guards. A typo — `var(--font-intr)` — is
 *      declared in neither block and still fails, and the half-rename between
 *      `@theme` and `:root` is check B's job, which is untouched: every
 *      `--color-<name>` must still be exactly `var(--<name>)`.
 *   B. Every `--color-<name>` entry in `@theme inline` is exactly
 *      `var(--<name>)` — the same name on both sides, never a literal, never a
 *      chain to a differently-named token. `--font-*` entries are exempt from
 *      the same-name rule and are covered by A instead.
 *   C. Nothing is declared twice: no repeated name in `:root`, no repeated
 *      `--color-*` in `@theme inline`.
 *   D. A name with no utility has no consumer. For every name in
 *      KNOWN_TOKEN_NAMES that is not exposed — not declared in `:root`, or
 *      declared but carrying no `--color-<name>` mapping — the number of
 *      `(prefix)-<name>` occurrences under `src/` must be ZERO.
 *   E. No `var(--token, #hex)` fallback anywhere under `src/` or in the token
 *      file. The single sanctioned exception, `var(--new, var(--old))`, has no
 *      `#` in it and therefore cannot match.
 *   F. `public/manifest.json` reads the brand and the ground, and the reversed
 *      glyph appears exactly once. Added by plan 40-03 — see the section below,
 *      because F exists for a different reason from A–E.
 *
 * ── WHY CHECK F IS HERE AT ALL, WHICH IS NOT THE REASON A–E ARE ─────────────
 *
 * A–E guard a rename that no build can see. F guards something simpler and
 * more annoying: **JSON admits no comment.**
 *
 * `src/app/layout.tsx` can carry its brand rule as a comment directly above the
 * value it governs, and it does. `public/manifest.json` cannot carry one at
 * all. So the rule that governs its four brand-bearing values — the installed
 * app name, the short name, the splash colour and the OS chrome colour — has
 * nowhere in the file to live, and the only reader still looking in a year is a
 * script. That is the whole argument, and it is the one `verify-media-strip.mjs`
 * already makes for itself: where a convention cannot be written next to the
 * thing, it has to be CHECKED.
 *
 * What F asserts:
 *   - `name` and `short_name` are the brand with a normal `e`
 *     (`.claude/rules/brand-visual-system.md`, gate *grafia del brand*);
 *   - `background_color` and `theme_color` are `--ground`, compared
 *     case-insensitively, so a correct value in the other case never goes red;
 *   - `src/app/layout.tsx` carries the same ground on `viewport.themeColor` and
 *     no longer carries the previous generation's black;
 *   - the reversed glyph U+0258 appears in `src/` and `public/` in EXACTLY ONE
 *     place, in `src/app/layout.tsx`, ON A COMMENT LINE.
 *
 * THE GLYPH CHECK IS WRITTEN TO STAY GREEN ON THE ONE CORRECT HIT, and that is
 * not a detail — it is the difference between a gate and a nuisance. The single
 * occurrence is inside the comment that EXPLAINS the rule; it is the rule's own
 * documentation, not a violation.
 *
 * TWO CONSEQUENCES OF THAT, both deliberate:
 *
 *   - THE LINE NUMBER IS NOT PINNED. Plan 40-03's own criteria named
 *     `layout.tsx:16`, and this very plan moved the line to `:56` by inserting
 *     the font docblock above the metadata. A gate pinned to a line number
 *     would have been invalidated by the commit that wrote it, would go red on
 *     a correct file, and would be switched off. F asserts the FILE and the
 *     COMMENT-LINE nature, and PRINTS the line it found.
 *   - `public/images/` IS EXCLUDED. Artwork is exactly where the reversed glyph
 *     is allowed to live — it is a drawn mark, and the logo is where it belongs.
 *     Binary files are not scanned at all: the UTF-8 encoding of U+0258 is two
 *     bytes that any image can contain by coincidence, and a gate that goes red
 *     on a PNG teaches everyone to ignore it.
 *
 * And THIS SCRIPT NEVER WRITES THE GLYPH LITERALLY. It is built from its code
 * point. A check whose only match is its own prohibition gets ignored the third
 * time it goes red — the precedent is `ColorSwatchPicker.tsx:22-27`, which
 * states its rule by OMITTING the string it forbids, and plan 40-02 already had
 * to rephrase a comment for this exact reason.
 *
 * ── WHAT CHECK F DOES NOT CLOSE, enumerated so it is not ticked over ────────
 *
 * DS-06's own word is *everywhere*, and this phase's criterion 4 covers page
 * titles, social previews and the installed app name. **A green on F must not
 * be read as closing DS-06.** `40-UI-SPEC.md` §6.4 enumerates 25 further
 * `Resonate` literals in 15 files, of which three classes are UNOWNED in v1.5:
 *
 *   - the Wallet pass — `lib/apple-wallet.ts:82` `organizationName`, `:88`
 *     `logoText`. Visible on a member's phone, and a pass already issued is not
 *     recalled;
 *   - the payment sheet — `components/SumUpCardWidget.tsx:113` `merchantName`.
 *     Changing a merchant name is a PAYMENTS decision, not a typography one;
 *   - every email subject, body and footer — and the `From` name is really
 *     `RESEND_FROM_EMAIL`, AN ENVIRONMENT VALUE SET ON VERCEL THAT NO COMMIT
 *     CAN FIX. The brand's spelling in every outgoing mail is currently a
 *     deployment variable.
 *
 * None of those is edited by plan 40-03, and this script does not check them:
 * a check over files nobody owns produces a red nobody can clear.
 *
 * ── THE BOUNDARY TRAP, WHICH IS THE WHOLE DIFFICULTY OF CHECK D ─────────────
 *
 * Two shapes, and both break a naive `includes`.
 *
 * FORWARD. `bg-amber-500` is Tailwind's DEFAULT palette, not a token named
 * `amber`. `bg-pink-soft` is the token `pink-soft`, not the token `pink`.
 * Without a trailing guard — the matched name must be followed by a character
 * that is NOT `[a-z0-9-]` — this check reports 12 files that are entirely
 * correct today, and rather more once the default scales are looked at. A gate
 * that goes red on a correct file gets switched off, after which it guards
 * nothing. That failure mode is not hypothetical: it is written into
 * `verify-media-strip.mjs:51-62` because this repository has already paid for
 * it twice.
 *
 * BACKWARD. `auto-rows-min` contains `to-rows`, and `to` is one of the twelve
 * utility prefixes. So the prefix needs a LEADING guard too — it must not be
 * preceded by `[a-zA-Z0-9-]`. Without it, every gradient-free layout class
 * beginning with a word that happens to end in a prefix becomes a consumer.
 *
 * AND THE NAMES THEMSELVES NEST. `--line` is a prefix of `--line-soft` and
 * `--line-strong`; `--ink` of `--ink-2`; `--accent` of `--accent-hover`, which
 * exists in the file today. The alternation is therefore sorted LONGEST FIRST,
 * so the engine offers `line-soft` before `line` and a match is attributed to
 * the name that actually appears.
 *
 * ── COMMENT HYGIENE, WHICH IS LOAD-BEARING HERE ─────────────────────────────
 *
 * Comment lines are blanked BEFORE any counting. Without that, this very file —
 * which names tokens and utility prefixes in prose, repeatedly, and would be
 * scanned by nothing here but sets the precedent — and the token file's own
 * `/* … *\/` paragraphs would decide the verdict. A check invalidated by its own
 * documentation is a precedent this repository has already recorded.
 *
 * The stripper is a LINE-SHAPE heuristic (`//`, `*`, `/*`, `*\/`), deliberately
 * not a tokeniser, and it is the same one `verify-media-strip.mjs` uses: WR-07
 * (`32-REVIEW.md`) records that a real comment parser written here was unsound.
 * The heuristic's error direction is to KEEP a trailing comment on a code line,
 * which can only ever make this script report MORE, never less. For checks A, D
 * and E — all of which fail on presence — that direction is safe. It does mean
 * a CSS block comment whose interior lines start with something other than `*`
 * is not fully stripped; the token file has no such comment today, and the same
 * safe direction applies if one appears.
 *
 * ── THE HOLE THAT REMAINS, stated rather than left to be found ──────────────
 *
 * A utility name built at runtime is invisible to check D, and a colour written
 * as a raw hex in a component is invisible to all five. This script reads text.
 * The property that actually holds the line is that the token layer lives in
 * ONE file loaded by the root layout — so a document carries the whole old set
 * or the whole new set, never half of either (`40-UI-SPEC.md` §8.3 clause 1).
 * This script is the guard against the half-rename, which is the one that file
 * cannot refuse on its own.
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
 *   npm run verify:tokens
 *
 * Exit codes:
 *   0  every check passed
 *   1  at least one failed — each is printed with its file and line
 *   2  nothing was measured: `src/` is missing, the token file has moved, the
 *      walk found no scannable file, `:root` could not be located or is empty,
 *      or `public/manifest.json` is missing or is not parseable JSON. No
 *      verdict is implied by a 2.
 */

import { readdirSync, readFileSync, existsSync, lstatSync } from 'node:fs';
import { dirname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SRC_DIR = `${ROOT}/src`;

/** The one stylesheet the root layout loads. An exact path, compared for equality. */
export const TOKEN_FILE = 'src/app/globals.css';

/**
 * The twelve Tailwind utility prefixes that can take a colour token.
 *
 * Not "every prefix Tailwind has" — every prefix through which a COLOUR token
 * reaches a surface. A name that appears after one of these and is not declared
 * is a colour that silently does not paint.
 */
export const UTILITY_PREFIXES = [
  'bg',
  'text',
  'border',
  'ring',
  'from',
  'to',
  'via',
  'fill',
  'stroke',
  'shadow',
  'outline',
  'decoration',
];

/**
 * The union of every colour-ish token name this repository has declared in
 * either generation.
 *
 * WHAT THIS LIST IS: the mechanical form of `40-UI-SPEC.md` §8.3 clause 3 —
 * *token names are additive within a release; a name any shipped document still
 * reads is not deleted, it is emptied of consumers first and removed second. A
 * rename is a removal wearing a friendly word.*
 *
 * So the two edits are not symmetrical, and both are part of the work:
 *
 *   - ADDING a name here is part of DECLARING a token. Until the name is in
 *     this list, check D cannot see a consumer of it, and a half-rename passes.
 *   - REMOVING a name here is part of PROVING it has no readers. Take it out
 *     while a file still reads it and the gate goes quiet about exactly the
 *     failure it was written for.
 *
 * This list is the only memory this script has of names that used to exist.
 */
export const KNOWN_TOKEN_NAMES = [
  // declared today
  'background',
  'foreground',
  'card',
  'card-border',
  'muted',
  'accent',
  'accent-hover',
  // surfaces
  'ground',
  'surface',
  'raised',
  'sunk',
  // ink
  'ink',
  'ink-2',
  'faint',
  // lines
  'line-soft',
  'line',
  'line-strong',
  // the control boundary — a line group name may not carry it (41-UI-SPEC §5.2)
  'control',
  // semantic states
  'sem-crit',
  'sem-warn',
  'sem-info',
  'sem-done',
  // brand scale
  'amber',
  'orange',
  'pink',
  'pink-soft',
  'violet',
  'violet-deep',
  'grad-sunset',
  // layout, not colour — no utility exists for either, and check D asserts so
  'nav-inset-block-end',
  'nav-inset-inline-start',
];

/**
 * The `next/font` variables.
 *
 * They are NOT declared in `:root`: `next/font` emits them on a generated class
 * that sits on `<html>` (`.__variable_e087fb{--font-orbitron:…}`), so check A
 * must not demand a `:root` declaration for them. Verified in the built output.
 */
export const FONT_VARIABLES = ['--font-orbitron', '--font-inter'];

// ── check F's subjects ─────────────────────────────────────────────────────

/** The OS-read static asset. An exact path: the platform reads this one. */
export const MANIFEST_FILE = 'public/manifest.json';

/** The root layout — the only file allowed to carry the reversed glyph. */
export const LAYOUT_FILE = 'src/app/layout.tsx';

/** The brand, with a NORMAL `e`. `brand-visual-system.md`, gate *grafia del brand*. */
export const BRAND_NAME = 're:sonate';

/** `--ground`. Compared case-insensitively — the same colour, either case. */
export const GROUND_HEX = '#0A0712';

/** The previous generation's black, which must no longer appear in the layout. */
export const RETIRED_BLACK = '#0a0a0a';

/**
 * The reversed `e`, U+0258 — BUILT FROM ITS CODE POINT, NEVER WRITTEN OUT.
 *
 * A check whose only match is its own prohibition gets ignored the third time
 * it goes red. Writing the glyph here would put a second occurrence into the
 * repository, and this script would then be reporting on itself the moment the
 * scan scope widened by one directory.
 */
export const REVERSED_E = String.fromCodePoint(0x0258);

/**
 * Where the glyph is looked for — TEXT extensions only.
 *
 * U+0258 encodes to two UTF-8 bytes that any binary can carry by coincidence,
 * so reading a PNG as text is a red on a correct file waiting to happen.
 */
export const GLYPH_EXTENSIONS = [
  '.ts',
  '.tsx',
  '.js',
  '.jsx',
  '.mjs',
  '.cjs',
  '.css',
  '.json',
  '.html',
  '.svg',
  '.txt',
  '.webmanifest',
];

/** Artwork is where the drawn mark is ALLOWED to live — the logo is its home. */
export const GLYPH_EXCLUDED_PREFIXES = ['public/images/', 'public/icons/'];

const SCANNED_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs'];
const STYLESHEET_EXTENSIONS = ['.css'];
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

/** Line-shape comment heuristic. See the hygiene paragraph for why not a parser. */
export function isCommentLine(raw) {
  const t = raw.trim();
  return t.startsWith('//') || t.startsWith('*') || t.startsWith('/*') || t.startsWith('*/');
}

/** The file's lines, comments blanked, carriage returns removed. */
export function liveLines(relPath) {
  return readFileSync(`${ROOT}/${relPath}`, 'utf8')
    .split('\n')
    .map((l) => {
      const raw = l.split('\r').join('');
      return isCommentLine(raw) ? '' : raw;
    });
}

/**
 * The `{ start, end }` line indices of the first block whose opening line
 * matches `openerRe`, or `null`.
 *
 * Brace counting, not a regex over the whole file: `@theme inline { … }` and
 * `:root { … }` both contain declarations that must not be read from anywhere
 * else in the file, and `@supports` / `@utility` blocks sit between them.
 */
export function findBlock(live, openerRe) {
  for (let i = 0; i < live.length; i += 1) {
    if (!openerRe.test(live[i])) continue;
    let depth = 0;
    let opened = false;
    for (let j = i; j < live.length; j += 1) {
      for (const ch of live[j]) {
        if (ch === '{') {
          depth += 1;
          opened = true;
        } else if (ch === '}') {
          depth -= 1;
        }
      }
      if (opened && depth <= 0) return { start: i, end: j };
    }
    return null; // opened and never closed
  }
  return null;
}

const DECLARATION_RE = /^\s*(--[a-zA-Z0-9-]+)\s*:\s*([^;]+);\s*$/;

/**
 * Every `--name: value;` declared inside `block`, with its line number.
 *
 * Conservative on purpose: a declaration is only read from a line SHAPED like a
 * declaration, never from anywhere the two hyphens merely appear. No script in
 * this repository parsed CSS before this one, so the matching is written to
 * under-read rather than to guess.
 */
export function declarationsIn(live, block) {
  const out = [];
  for (let i = block.start; i <= block.end; i += 1) {
    const m = DECLARATION_RE.exec(live[i]);
    if (m === null) continue;
    out.push({ name: m[1], value: m[2].trim(), line: i + 1 });
  }
  return out;
}

/** Every `var(--x)` reference in `live`, with its line number. */
export function varReferencesIn(live) {
  const out = [];
  const re = /var\(\s*(--[a-zA-Z0-9-]+)/g;
  for (let i = 0; i < live.length; i += 1) {
    let m;
    re.lastIndex = 0;
    while ((m = re.exec(live[i])) !== null) {
      out.push({ name: m[1], line: i + 1, text: live[i].trim() });
    }
  }
  return out;
}

/**
 * A `var(--token, #hex)` fallback — check E.
 *
 * `var(--new, var(--old))` is the single sanctioned bridge and has no `#`, so
 * it cannot match. Anything else with a hex behind the comma is the half-state
 * made permanent: the one place that keeps working while everything around it
 * changes generation (`40-UI-SPEC.md` §8.3 clause 2).
 */
const HEX_FALLBACK_RE = /var\(\s*--[a-zA-Z0-9-]+\s*,\s*#/;

export function findHexFallbacks(relPath) {
  const live = liveLines(relPath);
  const hits = [];
  for (let i = 0; i < live.length; i += 1) {
    if (!HEX_FALLBACK_RE.test(live[i])) continue;
    hits.push({ path: relPath, line: i + 1, text: live[i].trim() });
  }
  return hits;
}

/**
 * The consumer regex for check D — see the boundary trap in the header.
 *
 * Leading guard: the prefix must not be preceded by `[a-zA-Z0-9-]`, so
 * `auto-rows-min` is not a consumer of a token named `rows-min` through the
 * prefix `to`.
 * Trailing guard: the name must not be followed by `[a-z0-9-]`, so
 * `bg-amber-500` is Tailwind's default scale and not the token `amber`.
 * Names sorted longest-first so `line-soft` is offered before `line`.
 *
 * Every name comes from KNOWN_TOKEN_NAMES, a literal in this file, so there is
 * no untrusted input to escape — the list is `[a-z0-9-]` by construction.
 */
export function consumerPattern(names) {
  const sorted = [...names].sort((a, b) => b.length - a.length);
  return new RegExp(
    `(?<![a-zA-Z0-9-])(?:${UTILITY_PREFIXES.join('|')})-(${sorted.join('|')})(?![a-z0-9-])`,
    'g'
  );
}

export function findConsumers(relPath, pattern) {
  const live = liveLines(relPath);
  const hits = [];
  for (let i = 0; i < live.length; i += 1) {
    let m;
    pattern.lastIndex = 0;
    while ((m = pattern.exec(live[i])) !== null) {
      hits.push({ path: relPath, line: i + 1, name: m[1], text: live[i].trim() });
    }
  }
  return hits;
}

// ── the run ────────────────────────────────────────────────────────────────

if (!existsSync(SRC_DIR)) refuse('`src/` does not exist. Nothing was measured.');
if (!existsSync(`${ROOT}/${TOKEN_FILE}`)) {
  refuse(
    `${TOKEN_FILE} does not exist. Every check reads that exact path, and parsing\n` +
      '       whatever moved into the name would be worse than refusing. If the token layer\n' +
      '       genuinely moved, TOKEN_FILE in this script moves with it — in the same commit,\n' +
      '       because the gate and the thing it guards are one change. Nothing was measured.'
  );
}

const files = listScannableFiles(SRC_DIR);
if (files.length === 0) {
  refuse('the walk of `src/` found no scannable file. A vacuous green is not a green.');
}

/*
 * Check F's two refusals, taken here with the others rather than mid-run: a
 * refusal means the measurement DID NOT HAPPEN, and that reads better before
 * any tick has been printed than after four of them.
 */
if (!existsSync(`${ROOT}/${MANIFEST_FILE}`)) {
  refuse(
    `${MANIFEST_FILE} does not exist. Check F is the only reader of a rule the file\n` +
      '       itself cannot carry — JSON admits no comment — so a run without it would drop\n' +
      '       the brand rule on the installed app name silently, which is the one outcome\n' +
      '       this check exists to prevent. If the manifest genuinely moved, MANIFEST_FILE in\n' +
      '       this script moves with it, in the same commit. Nothing was measured.'
  );
}

let manifest;
try {
  manifest = JSON.parse(readFileSync(`${ROOT}/${MANIFEST_FILE}`, 'utf8'));
} catch (err) {
  refuse(
    `${MANIFEST_FILE} is not parseable JSON: ${err.message}\n` +
      '       An unparseable manifest is not a failed check, it is an absent measurement —\n' +
      '       and it is worse than either, because the browser will not install the app from\n' +
      '       it at all. Fix the JSON, then re-run. Nothing was measured.'
  );
}

if (!existsSync(`${ROOT}/${LAYOUT_FILE}`)) {
  refuse(
    `${LAYOUT_FILE} does not exist. Check F reads the browser chrome colour and the one\n` +
      '       sanctioned occurrence of the reversed glyph from that exact path. Nothing was\n' +
      '       measured.'
  );
}

const tokenLive = liveLines(TOKEN_FILE);

const rootBlock = findBlock(tokenLive, /^\s*:root\s*\{/);
if (rootBlock === null) {
  refuse(
    `the \`:root { … }\` block could not be located in ${TOKEN_FILE} (or it is never\n` +
      '       closed). Every declaration this script knows about comes from that block, so a\n' +
      '       run without it would report "no token is declared" and call it a pass. Nothing\n' +
      '       was measured.'
  );
}

const rootDeclarations = declarationsIn(tokenLive, rootBlock);
if (rootDeclarations.length === 0) {
  refuse(
    `the \`:root\` block in ${TOKEN_FILE} declares no token. Zero declarations makes\n` +
      '       checks A, B, C and D vacuous at once, and four vacuous ticks read exactly like\n' +
      '       four passes. Nothing was measured.'
  );
}

const themeBlock = findBlock(tokenLive, /^\s*@theme\b[^{]*\{/);
const themeDeclarations = themeBlock === null ? [] : declarationsIn(tokenLive, themeBlock);

const declaredNames = new Set(rootDeclarations.map((d) => d.name));

/**
 * Names declared in the `@theme` block — the THIRD origin check A accepts.
 *
 * Tailwind emits each of these into `:root` of the built stylesheet, so a
 * plain CSS rule in this file may legitimately reference one. Kept as its own
 * set rather than merged into `declaredNames`, so checks B, C and D keep
 * reading `:root` and only `:root` and nothing else changes meaning.
 */
const themeDeclaredNames = new Set(themeDeclarations.map((d) => d.name));
const colourMappings = themeDeclarations.filter((d) => d.name.startsWith('--color-'));
const fontMappings = themeDeclarations.filter((d) => d.name.startsWith('--font-'));
/**
 * The SECOND way a token reaches a utility, and forgetting it made this gate go
 * red on a correct file.
 *
 * A `--color-<name>` mapping in `@theme` is the common route, and it generates a
 * whole family (`bg-`, `text-`, `border-`, …). But Tailwind v4 also takes a
 * standalone `@utility <class> { … }`, which generates exactly one class and no
 * `--color-*` entry — and that is how `bg-grad-sunset` is declared, because the
 * sunset gradient must reach `background-image` and nothing else.
 *
 * Read only from the `--color-*` mappings, `grad-sunset` counts as UNEXPOSED,
 * so check D treats `bg-grad-sunset` in a page as a consumer of a token with no
 * utility — and fails. On a file that is correct: `verify-sunset-gradient.mjs`
 * carries an `ALLOW_LIST` written expressly so the first SunSet surface can
 * apply that class. Two gates in the same phase, contradicting each other, and
 * the one that would have been switched off is this one.
 *
 * So a name exposed by EITHER route is exposed. The prefix is stripped rather
 * than matched loosely: `@utility bg-grad-sunset` exposes `grad-sunset`, and a
 * class whose name is not a known token prefixed by a utility prefix exposes
 * nothing and is ignored.
 */
// Deliberately the SAME list check D's consumer pattern uses (:271), not a copy:
// a gate that recognised a prefix it does not search for — or searched for one it
// does not recognise — would be wrong in one of the two directions, silently.
const standaloneUtilityNames = new Set();
for (const line of tokenLive) {
  const m = line.match(/^\s*@utility\s+([a-z0-9-]+)\s*\{/);
  if (!m) continue;
  const cls = m[1];
  for (const prefix of UTILITY_PREFIXES) {
    if (cls.startsWith(`${prefix}-`)) {
      standaloneUtilityNames.add(cls.slice(prefix.length + 1));
      break;
    }
  }
}

const exposedNames = new Set([
  ...colourMappings
    .map((d) => d.name.slice('--color-'.length))
    .filter((n) => declaredNames.has(`--${n}`)),
  ...[...standaloneUtilityNames].filter((n) => declaredNames.has(`--${n}`)),
]);

const unexposed = KNOWN_TOKEN_NAMES.filter((n) => !exposedNames.has(n));

const failures = [];

console.log('\nverify-tokens — a token a utility reads is a token that exists');
console.log(`  token file: ${TOKEN_FILE}`);
console.log(`  scanned ${files.length} file(s) under src/`);
console.log(
  `  declared in :root: ${rootDeclarations.length} · exposed as utilities: ${exposedNames.size}` +
    `${fontMappings.length > 0 ? ` · font mappings: ${fontMappings.length}` : ''}`
);
console.log(
  `  known names: ${KNOWN_TOKEN_NAMES.length} · currently UNEXPOSED and therefore under check D: ` +
    `${unexposed.length}\n`
);

// ── A. every var(--x) in the token file resolves ───────────────────────────
const unresolved = [];
for (const ref of varReferencesIn(tokenLive)) {
  if (declaredNames.has(ref.name)) continue;
  if (themeDeclaredNames.has(ref.name)) continue;
  if (FONT_VARIABLES.includes(ref.name)) continue;
  unresolved.push(ref);
}
if (unresolved.length === 0) {
  console.log(
    `  ✓ A  every var(--x) in ${TOKEN_FILE} resolves to a :root declaration ` +
      `(or to an @theme declaration, or to a next/font variable)`
  );
} else {
  console.log(`  ✗ A  ${unresolved.length} reference(s) in ${TOKEN_FILE} resolve to nothing:`);
  for (const h of unresolved) console.log(`         ${TOKEN_FILE}:${h.line}: [${h.name}] ${h.text}`);
  console.log(
    '\n       This is the half-rename caught at the source: the `@theme` mapping renamed and\n' +
      '       the `:root` declaration not, or the reverse. A `var()` that resolves to nothing\n' +
      '       produces no declaration at all — the property is simply dropped, in silence.\n' +
      '       Declare the name in `:root` or in `@theme`, or point the reference at the name\n' +
      '       that exists. If it is a new `next/font` variable, add it to FONT_VARIABLES in\n' +
      '       this script.\n'
  );
  failures.push('A');
}

// ── B. every @theme colour mapping is a one-to-one forward reference ───────
const crooked = [];
for (const m of colourMappings) {
  const name = m.name.slice('--color-'.length);
  if (m.value !== `var(--${name})`) {
    crooked.push({ ...m, expected: `var(--${name})` });
  }
}
if (themeBlock === null) {
  console.log('  ✗ B  no `@theme` block was found: no token is exposed as a utility at all');
  console.log(
    '\n       Without `@theme inline`, `:root` declares custom properties that no Tailwind\n' +
      '       class can reach. Every `bg-*` / `text-*` written against them emits nothing —\n' +
      '       and emits it silently, which is the failure this whole script exists for.\n'
  );
  failures.push('B');
} else if (crooked.length === 0) {
  console.log(
    `  ✓ B  all ${colourMappings.length} --color-* mapping(s) are one-to-one forward references ` +
      'into :root'
  );
} else {
  console.log(`  ✗ B  ${crooked.length} --color-* mapping(s) are not one-to-one:`);
  for (const h of crooked) {
    console.log(`         ${TOKEN_FILE}:${h.line}: ${h.name}: ${h.value};  (expected ${h.expected})`);
  }
  console.log(
    '\n       Every `--color-<name>` must be exactly `var(--<name>)` — the same name on both\n' +
      '       sides, never a literal and never a chain to a differently-named token. A literal\n' +
      '       here puts the same colour in two places, and the two drift. A chain makes the\n' +
      '       utility name and the token name disagree, so a later rename of one leaves the\n' +
      '       other pointing at a ghost. `--font-*` entries are exempt and are checked by A.\n'
  );
  failures.push('B');
}

// ── C. nothing is declared twice ───────────────────────────────────────────
const duplicates = [];
const seenRoot = new Map();
for (const d of rootDeclarations) {
  if (seenRoot.has(d.name)) {
    duplicates.push({ ...d, first: seenRoot.get(d.name), where: ':root' });
  } else {
    seenRoot.set(d.name, d.line);
  }
}
const seenTheme = new Map();
for (const d of colourMappings) {
  if (seenTheme.has(d.name)) {
    duplicates.push({ ...d, first: seenTheme.get(d.name), where: '@theme inline' });
  } else {
    seenTheme.set(d.name, d.line);
  }
}
if (duplicates.length === 0) {
  console.log('  ✓ C  no token is declared twice in :root, no --color-* is mapped twice');
} else {
  console.log(`  ✗ C  ${duplicates.length} duplicate declaration(s):`);
  for (const h of duplicates) {
    console.log(
      `         ${TOKEN_FILE}:${h.line}: ${h.name} in ${h.where}, already declared at :${h.first}`
    );
  }
  console.log(
    '\n       The last one wins, silently, and the first one stays in the file looking\n' +
      '       authoritative. This is the shape a palette acquires a colour nobody decided:\n' +
      '       two values, one name, and a reader who trusts whichever they scrolled to.\n'
  );
  failures.push('C');
}

// ── D. a name with no utility has no consumer ──────────────────────────────
if (unexposed.length === 0) {
  console.log(
    '  ✓ D  vacuously: every known name is exposed as a utility, so there is no unexposed\n' +
      '       name for a consumer to read. Nothing was measured by this check.'
  );
} else {
  const pattern = consumerPattern(unexposed);
  const strayConsumers = [];
  for (const rel of files) {
    strayConsumers.push(...findConsumers(rel, pattern));
  }
  if (strayConsumers.length === 0) {
    console.log(
      `  ✓ D  none of the ${unexposed.length} unexposed name(s) has a consumer under src/ ` +
        `(${files.length} file(s) read)`
    );
  } else {
    const names = [...new Set(strayConsumers.map((h) => h.name))].sort();
    console.log(
      `  ✗ D  ${strayConsumers.length} line(s) under src/ read ${names.length} name(s) that are ` +
        `not exposed as utilities: ${names.join(', ')}`
    );
    for (const h of strayConsumers) console.log(`         ${h.path}:${h.line}: [${h.name}] ${h.text}`);
    console.log(
      '\n       Each of these is a colour that does not paint. Tailwind emits no rule for a\n' +
        '       utility whose token it cannot resolve, and emits no warning either — the\n' +
        '       element renders with whatever it inherits, which usually looks "slightly off"\n' +
        '       rather than broken. Either declare the name in `:root` AND map it in\n' +
        '       `@theme inline`, or change the consumer to a name that is exposed. Do not\n' +
        '       remove the name from KNOWN_TOKEN_NAMES to quiet this: that deletes the only\n' +
        '       memory this gate has of it.\n'
    );
    failures.push('D');
  }
}

// ── E. no var(--token, #hex) fallback ──────────────────────────────────────
const stylesheets = listScannableFiles(SRC_DIR, STYLESHEET_EXTENSIONS);
const fallbackScope = [...new Set([TOKEN_FILE, ...stylesheets, ...files])];
const fallbacks = [];
for (const rel of fallbackScope) {
  fallbacks.push(...findHexFallbacks(rel));
}
if (fallbacks.length === 0) {
  console.log(
    `  ✓ E  no var(--token, #hex) fallback in ${fallbackScope.length} file(s) — the token file ` +
      'and everything under src/'
  );
} else {
  console.log(`  ✗ E  ${fallbacks.length} hex fallback(s):`);
  for (const h of fallbacks) console.log(`         ${h.path}:${h.line}: ${h.text}`);
  console.log(
    '\n       A hex fallback looks like safety and is the half-state made permanent: the one\n' +
      '       place that keeps working while everything around it changes generation, so the\n' +
      '       screen ends up carrying two generations at once and nobody is told\n' +
      '       (`40-UI-SPEC.md` §8.3 clause 2). If a token is genuinely new in this release,\n' +
      '       bridge it with `var(--new, var(--old))` — the sanctioned form, and the one that\n' +
      '       goes away when the old name does. Never with a literal.\n'
  );
  failures.push('E');
}

// ── F. the manifest reads the brand and the ground; one glyph, in a comment ─
const manifestProblems = [];

for (const key of ['name', 'short_name']) {
  if (manifest[key] !== BRAND_NAME) {
    manifestProblems.push(
      `${MANIFEST_FILE}: ${key} is ${JSON.stringify(manifest[key])}, expected "${BRAND_NAME}"`
    );
  }
}

for (const key of ['background_color', 'theme_color']) {
  const value = manifest[key];
  if (typeof value !== 'string' || value.toLowerCase() !== GROUND_HEX.toLowerCase()) {
    manifestProblems.push(
      `${MANIFEST_FILE}: ${key} is ${JSON.stringify(value)}, expected "${GROUND_HEX}" ` +
        '(compared case-insensitively)'
    );
  }
}

const layoutRaw = readFileSync(`${ROOT}/${LAYOUT_FILE}`, 'utf8');
if (!layoutRaw.includes(`themeColor: "${GROUND_HEX}"`)) {
  manifestProblems.push(
    `${LAYOUT_FILE}: viewport.themeColor is not \`themeColor: "${GROUND_HEX}"\``
  );
}
// Case-INsensitive, and the reason is that CSS is: `#0A0A0A` and `#0a0a0a` are
// the same colour to every browser and different strings to `includes`. The
// retired black would have walked straight past this check in upper case — two
// lines below a comparison that already lower-cases what it reads.
if (layoutRaw.toLowerCase().includes(RETIRED_BLACK.toLowerCase())) {
  manifestProblems.push(
    `${LAYOUT_FILE}: still carries ${RETIRED_BLACK}, the previous generation's black ` +
      '(matched case-insensitively — hex is case-insensitive in CSS)'
  );
}

/* The glyph, over text files under src/ and public/, artwork excluded. */
const glyphScope = [
  ...listScannableFiles(SRC_DIR, GLYPH_EXTENSIONS),
  ...(existsSync(`${ROOT}/public`) ? listScannableFiles(`${ROOT}/public`, GLYPH_EXTENSIONS) : []),
].filter((rel) => !GLYPH_EXCLUDED_PREFIXES.some((p) => rel.startsWith(p)));

const glyphHits = [];
for (const rel of glyphScope) {
  const lines = readFileSync(`${ROOT}/${rel}`, 'utf8').split('\n');
  for (let i = 0; i < lines.length; i += 1) {
    if (!lines[i].includes(REVERSED_E)) continue;
    glyphHits.push({ path: rel, line: i + 1, comment: isCommentLine(lines[i]) });
  }
}

if (glyphHits.length !== 1) {
  manifestProblems.push(
    `the reversed glyph U+0258 appears on ${glyphHits.length} line(s), expected exactly 1: ` +
      (glyphHits.length === 0
        ? 'none found — the comment that documents the rule may have been deleted'
        : glyphHits.map((h) => `${h.path}:${h.line}`).join(', '))
  );
} else {
  const [hit] = glyphHits;
  if (hit.path !== LAYOUT_FILE) {
    manifestProblems.push(
      `the reversed glyph U+0258 is at ${hit.path}:${hit.line}, expected inside ${LAYOUT_FILE}`
    );
  } else if (!hit.comment) {
    manifestProblems.push(
      `the reversed glyph U+0258 at ${hit.path}:${hit.line} is NOT on a comment line — it is ` +
        'only sanctioned as the documentation of its own rule, never as a value'
    );
  }
}

if (manifestProblems.length === 0) {
  const where = glyphHits[0];
  console.log(
    `  ✓ F  ${MANIFEST_FILE} reads the brand and the ground; ${LAYOUT_FILE} carries the same\n` +
      `       chrome colour; the reversed glyph appears exactly once, at ${where.path}:${where.line}, ` +
      'on a comment line'
  );
} else {
  console.log(`  ✗ F  ${manifestProblems.length} problem(s) with the machine-read brand values:`);
  for (const p of manifestProblems) console.log(`         ${p}`);
  console.log(
    '\n       These four values are read by the OPERATING SYSTEM, not by a page, and JSON\n' +
      '       admits no comment — which is why this check exists rather than a note beside\n' +
      '       them. The name is the label under the icon on a home screen; the two colours\n' +
      '       are the PWA splash and the OS chrome, and left on the previous black they show\n' +
      '       a seam at every launch that no surface conversion can ever reach.\n' +
      '       The reversed glyph is a DRAWN mark: it lives inside the logo artwork and, in\n' +
      '       exactly one place, inside the comment that explains that rule. In a name it\n' +
      '       produces a word search cannot find and a screen reader says as a phoneme.\n' +
      '       Fixing this file does NOT change an already-installed app: on iOS no manifest\n' +
      '       field updates after install. That part is a human observation, not a check.\n'
  );
  failures.push('F');
}

// ── check G — the one link between a font token and the DOM that carries it ─
//
// Check A EXEMPTS the `--font-*` names from needing a `:root` declaration, and
// it is right to: `next/font` emits them on a generated class that sits on
// `<html>`. But that exemption leaves a hole exactly the shape of this phase's
// central failure. Delete `${inter.variable}` from the `<html>` className and:
//
//   - `next/font` still runs, so the class is still generated
//   - `--font-sans` in `:root` still references `var(--font-inter)`
//   - checks A–F all stay GREEN, because none of them reads the DOM
//   - `npm run build` stays green, because nothing is a type error
//   - and every surface in the product silently falls back to system-ui
//
// That is a silent colour-class failure in the typography half, and it is the
// same species the whole phase exists to make impossible. The menu page now
// depends on this line alone, having had its local escape removed.
//
// This reads the SOURCE, so it proves the className is written — not that a
// browser applied it. That remains an observation.
const layoutSrc = readFileSync(`${ROOT}/${LAYOUT_FILE}`, 'utf8');
const htmlTag = layoutSrc.match(/<html\b[^>]*>/);
const fontVarProblems = [];

if (!htmlTag) {
  fontVarProblems.push(
    `no <html …> element found in ${LAYOUT_FILE}. This check reads the root element's ` +
      'className; without it, nothing was measured.'
  );
} else {
  for (const name of FONT_VARIABLES) {
    // `--font-orbitron` is emitted by the `orbitron` call's `variable` option,
    // and reaches the DOM as `orbitron.variable` in the className. Match the
    // identifier, not the token name: the token name never appears here.
    const ident = name.replace(/^--font-/, '');
    if (!new RegExp(`\\b${ident}\\.variable\\b`).test(htmlTag[0])) {
      fontVarProblems.push(
        `the <html> element in ${LAYOUT_FILE} does not carry \`${ident}.variable\`, so ` +
          `\`${name}\` reaches no element and every var() reading it resolves to nothing.`
      );
    }
  }
}

if (fontVarProblems.length === 0) {
  console.log(
    `  ✓ G  the <html> element in ${LAYOUT_FILE} carries all ${FONT_VARIABLES.length} ` +
      `next/font variable(s): ${FONT_VARIABLES.join(', ')}`
  );
} else {
  console.log(`  ✗ G  ${fontVarProblems.length} problem(s) wiring the type roles to the DOM:`);
  for (const p of fontVarProblems) console.log(`         ${p}`);
  console.log(
    '\n       Check A deliberately exempts the --font-* names from needing a :root\n' +
      '       declaration, because next/font emits them on a generated class rather than in\n' +
      '       :root. This check is the other half of that exemption. Without it, removing\n' +
      '       one identifier from the root className leaves every other check green, leaves\n' +
      '       the build green, and drops the whole product to system-ui — with nothing\n' +
      '       anywhere reporting it.\n'
  );
  failures.push('G');
}

// ── verdict ────────────────────────────────────────────────────────────────
console.log('');
if (failures.length === 0) {
  console.log('  TOKENS_OK — all seven checks passed.');
  console.log(
    '  Read the header before treating this as safety: a grep reads declarations, not\n' +
      '  intent. It is silent about a colour written as a raw hex, about a utility built by\n' +
      '  string concatenation, about a name renamed and never added to KNOWN_TOKEN_NAMES —\n' +
      '  and it never says a colour is RIGHT. Contrast is arithmetic; legibility at a dark\n' +
      '  door is an observation.\n' +
      '  And F proves THE FILE, not a phone: on iOS no manifest field updates after install,\n' +
      '  so the label under the icon on an already-installed app is still the old one. That\n' +
      '  is a human observation, it gets one attempt per device, and no green replaces it.\n'
  );
  process.exit(0);
}
console.log(`  TOKENS_FAIL — ${failures.length} check(s) failed: ${failures.join(', ')}\n`);
process.exit(1);
