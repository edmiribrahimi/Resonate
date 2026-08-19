#!/usr/bin/env node
/**
 * verify-semantic-separation.mjs — a state is not a format, a format is not a
 * state, and the palette has one editable source.
 *
 * WHAT IT ASSERTS, in one sentence: **every `--sem-*` token in
 * `src/app/globals.css` is declared with a literal value and no `var()` crosses
 * the boundary in either direction, no brand hex declared in `:root` appears in
 * any file under `src/` other than two exempted paths, no single line under
 * `src/` both applies a `sem-` colour utility and identifies a format, the five
 * sunset hexes offered by the catalogue's colour control equal the token values
 * they duplicate, and no token is named after a format or a sigla.**
 *
 * WHY A STRUCTURAL CHECK AND NOT A TEST ON ONE FILE. DS-02 is the half of
 * Phase 40 that is easiest to lose **without anything breaking**. When a
 * semantic drifts into a brand colour the screen still renders: a state simply
 * starts looking like a format, and nothing anywhere reports it. `npm run build`
 * cannot see it — a hex is a valid string and a `var()` is a valid value — and
 * this repository has **no test runner for the product** and **no error
 * tracking** (`CLAUDE.md` Guardrail 1, `meta-gates.md`). A review catches this
 * on the day somebody happens to look at the right diff. A gate catches it on
 * every commit, which is the only frequency that matters for a defect whose
 * symptom is a screen looking slightly wrong to nobody in particular.
 *
 * `40-UI-SPEC.md` §3.4 argued that the `--sem-*` prefix *"is what lets a script
 * hold it"* and then commissioned no script. This is that script.
 *
 * ── WHAT A GREEN DOES NOT MEAN (cosa un verde NON significa) ────────────────
 *
 *   - A grep reads DECLARATIONS, NOT INTENT. It cannot see a semantic expressed
 *     as a raw hex it does not know about, a format colour reached through a
 *     variable renamed on the way, or a class name built by string
 *     concatenation (`` `bg-${tone}` ``). This script reads text; it cannot
 *     follow a value.
 *   - It does NOT say a colour is RIGHT. `--sem-warn` `#FFB25E` IS `--amber` IS
 *     SunSet's identification colour, so an amber mark cannot tell a reader
 *     *caution* from *this is a SunSet night* by hue alone — `40-UI-SPEC.md`
 *     Open Question 3, which is why anything amber carries text. No regular
 *     expression closes that; a person does.
 *   - Check C is LINE-SCOPED, not file-scoped, and deliberately so (see the
 *     trap section). A file that shows a format and a stage badge in two
 *     different places is correct and this script says nothing about it.
 *   - Check B reads the hexes CURRENTLY declared in `:root`. A brand value that
 *     was never a token — an email palette, a hard-coded chart colour — is
 *     invisible to it. DI-40-01 (`src/emails/`) is exactly that case and is
 *     deferred, not covered.
 *   - It reads no stylesheet other than the token file. `.css` files are not in
 *     the walk, so a second stylesheet added later carrying a brand hex would
 *     pass. If one is added, widen SCANNED_EXTENSIONS in the same commit.
 *   - It never opens `.next/`. The emitted bundle is not evidence about source
 *     — Tailwind scans the token file itself as an input, so the bundle
 *     contains names that zero surfaces apply (measured in 40-02, deviation 4).
 *
 * ── THE FIVE CHECKS ─────────────────────────────────────────────────────────
 *
 *   A. Semantics are declared literally, on BOTH sides. In `:root`, every
 *      `--sem-*` value is a `#`-hex or an `rgba(` and contains no `var(`; and
 *      no other `:root` declaration reaches into the semantic set with
 *      `var(--sem-`. Inside `@theme inline`, a `var(--sem-x)` reference is
 *      admissible only in the matching `--color-sem-x` entry.
 *   B. One home for a brand hex. No file under `src/`, other than the two
 *      exemptions, contains any hex declared in the token file's `:root`.
 *   C. A semantic never identifies a format. No LINE under `src/` carries both a
 *      `sem-`-prefixed colour utility and a format identifier — the string
 *      `color_hex`, or a CamelCase format name.
 *   D. The palette has one editable source. The five sunset hexes in
 *      `ColorSwatchPicker.tsx`'s catalogue equal the token values they
 *      duplicate, compared case-insensitively.
 *   E. No format becomes a token. No token in `:root` and no `--color-*` mapping
 *      is named after a format or a sigla.
 *
 * ── THE TWO EXEMPTIONS, AND WHY DELETING THEM WOULD BE THE MISTAKE ──────────
 *
 * Both are EXACT PATHS compared for equality, and both `refuse()` (exit 2) if
 * the path no longer exists: exempting whatever moved into the name would be
 * worse than refusing.
 *
 * 1. `src/app/(admin)/admin/formats/ColorSwatchPicker.tsx`
 *
 *    Its six hexes are **data on a `formats` row**, not CSS tokens. The database
 *    constraint `formats_color_hex_check` wants `#RRGGBB`, the value arrives at
 *    runtime and is applied through an inline `style`, and Tailwind cannot
 *    generate a class from a runtime value. Declaring `bg-mtnlb` would
 *    reintroduce the compile-time format constant Phase 36 spent a migration
 *    removing, and would make changing a format's colour **a deploy**
 *    (D-36-12, `40-UI-SPEC.md` §0 rule 4 and §3.3).
 *
 *    THE DISAGREEMENT, RECORDED SO IT IS NOT REDISCOVERED AND "FIXED":
 *    `40-CONTEXT.md` calls this file *"the one place they must stop being a
 *    local literal"*. `40-UI-SPEC.md` rule 4 and §7 keep it exactly as it is.
 *    The conflict is resolved toward the UI-SPEC — later, and more specific
 *    (`40-PATTERNS.md` §1). Anyone opening that file to "finish" DS-01 would be
 *    deleting the constraint DS-03 leans on: the picker offers **flat swatches
 *    only**, no free hex field and no picker, so there is no input through which
 *    a gradient could arrive. *A constraint that cannot be expressed cannot be
 *    violated.*
 *
 * 2. `src/app/layout.tsx`
 *
 *    `viewport.themeColor` is painted by the browser **before any stylesheet
 *    loads**, so it cannot be read from a CSS custom property. It is the one
 *    place a brand value must be a literal in TypeScript, and check F of
 *    `verify-tokens.mjs` already asserts its exact value. The exemption is by
 *    path, not by value, so this script stays silent about it in either
 *    direction and the other script owns the assertion.
 *
 * A THIRD exemption exists in check D and is a VALUE, not a path: the
 * catalogue's sixth swatch, `neutral` `#8C82A6`. It is the deliberate neutral —
 * the answer a format gives when the honest answer is *not yet decided* — chosen
 * on its own merits, and it happens to hold the same value as `--soy`, which
 * D-40-06 keeps OUT of the token set because its meaning *«must be asked, not
 * deduced»*. The coincidence is recorded (`40-PATTERNS.md` §0) and **does not
 * answer the question**. The two must not be merged before that answer arrives,
 * so `neutral` is compared against nothing.
 *
 * ── THE TRAP: A GATE THAT GOES RED ON A CORRECT FILE GETS SWITCHED OFF ──────
 *
 * That failure mode is written into `verify-media-strip.mjs:51-62` because this
 * repository has already paid for it. Three things are correct TODAY and this
 * script must stay green on all three:
 *
 *   - the six brand hexes in `ColorSwatchPicker.tsx` — exemption 1;
 *   - `#0A0712` in `layout.tsx` — exemption 2;
 *   - every two-stop accent fade (`bg-gradient-to-br from-accent/30
 *     to-accent/5`, 15 files under `src/` use a `bg-gradient*` utility). Those
 *     follow `--accent` wherever it is retargeted and are correct. Nothing here
 *     matches the word "gradient": that is the sibling gate's subject, and it
 *     matches a four-stop signature rather than a word for exactly this reason.
 *
 * And check C is LINE-scoped rather than file-scoped on purpose. Phases 44 and
 * 45 will build surfaces that legitimately show a format AND a stage badge in
 * the same file. A gate that went red on those is a gate that gets removed, and
 * a removed gate guards nothing.
 *
 * The `sem-` utility is matched at a BOUNDARY — not preceded by `[a-zA-Z0-9-]`,
 * so `auto-rows-min` does not become a consumer through the prefix `to` — and
 * the trailing side is left open so `bg-sem-crit` and `bg-sem-crit/20` both
 * match.
 *
 * ── COMMENT HYGIENE, WHICH IS LOAD-BEARING HERE ─────────────────────────────
 *
 * Comment lines are blanked BEFORE any counting. Without that, the token file's
 * own paragraphs — which name every hex in the palette, repeatedly — and
 * `ColorSwatchPicker.tsx`'s docblock would decide the verdict. A check
 * invalidated by its own documentation is a precedent this repository has
 * already recorded twice: `ColorSwatchPicker.tsx:22-27` states its rule by
 * OMITTING the string it forbids, and 40-02 had to rephrase a comment for the
 * same reason.
 *
 * The stripper is a LINE-SHAPE heuristic (`//`, `*`, `/*`, `*\/`), deliberately
 * not a tokeniser: WR-07 (`32-REVIEW.md`) records that a real comment parser
 * written in this repository was unsound. Its error direction is to KEEP a
 * trailing comment on a code line, which can only ever make this script report
 * MORE, never less. Every check here fails on presence, so that direction is
 * safe.
 *
 * SECRECY. `.planning/` is tracked and this repository is PUBLIC (`CLAUDE.md`
 * Guardrail 5). This script reads only committed files, prints only paths, line
 * numbers and source lines, opens no network connection, reads no environment
 * variable and writes no artefact. Every hex named in this file was already
 * public in `.claude/rules/brand-visual-system.md` before today. No venue, no
 * unannounced date, no line-up, no personal name. And nothing here says what a
 * format SOUNDS like: three of the four have no written manifesto, and a script
 * comment is not where one gets written (`sound-manifesto.md`).
 *
 * Zero dependencies. Node built-ins only, ESM. Deliberately NOT wired into
 * `npm run build`: `next build` is the type gate, and a type gate that starts
 * failing for a reason that is not a type teaches everyone to ignore it — the
 * same decision already taken for `verify-tokens.mjs`, `verify-media-strip.mjs`
 * and `verify-no-header-identity.mjs`.
 *
 * Usage:
 *   npm run verify:semantic-separation
 *
 * Exit codes:
 *   0  every check passed
 *   1  at least one failed — each is printed with its file and line
 *   2  nothing was measured: `src/` is missing, the token file has moved, an
 *      exemption path has moved, the walk found no scannable file, `:root`
 *      could not be located, the token file declares NO `--sem-*` token, or the
 *      catalogue could not be read. No verdict is implied by a 2.
 */

import { readdirSync, readFileSync, existsSync, lstatSync } from 'node:fs';
import { dirname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

import { liveLinesFrom } from './lib/comments.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SRC_DIR = `${ROOT}/src`;

/** The one stylesheet the root layout loads. An exact path, compared for equality. */
export const TOKEN_FILE = 'src/app/globals.css';

/** Exemption 1 — format identification colours are data on a row. See the header. */
export const CATALOGUE_FILE = 'src/app/(admin)/admin/formats/ColorSwatchPicker.tsx';

/** Exemption 2 — the browser paints themeColor before any stylesheet loads. */
export const THEME_COLOR_FILE = 'src/app/layout.tsx';

/** The two exemptions, as a set, so the report can count what it applied. */
export const EXEMPT_PATHS = [CATALOGUE_FILE, THEME_COLOR_FILE];

/**
 * The twelve Tailwind utility prefixes through which a COLOUR token reaches a
 * surface. The same list `verify-tokens.mjs` carries, and for the same reason.
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
 * The catalogue keys whose hex DUPLICATES a token value, and the token each one
 * duplicates. Five of the six.
 *
 * `neutral` is absent on purpose and the reason is in the header: it is the
 * deliberate neutral, it coincides with `--soy`, and D-40-06 keeps `--soy` out
 * of the token set until somebody says what it is for. Adding `neutral` here
 * would merge two decisions that have not been merged.
 */
export const CATALOGUE_TO_TOKEN = {
  amber: '--amber',
  orange: '--orange',
  pink: '--pink',
  pinkSoft: '--pink-soft',
  violet: '--violet',
  blue: '--blue',
};

/** The catalogue key deliberately compared against nothing. Named so the report can say so. */
export const CATALOGUE_UNCOMPARED = 'neutral';

/**
 * Format names and siglas, lower-cased.
 *
 * A token named after one of these is the compile-time format constant Phase 36
 * removed, coming back through the token layer.
 */
export const FORMAT_NAMES = [
  // 'sunset' e 'snst' sono usciti il 2026-08-20 con il format (`CAT-01`). Un
  // format cancellato non ha piu' un nome da proteggere, e tenerlo qui avrebbe
  // fatto fallire il controllo su una prosa che lo nomina come storia.
  'ramadub',
  'motionlab',
  'resonate',
  'rmdb',
  'mtnlb',
  'rsnt',
];

/**
 * Format identifiers as they appear in source — check C's other half.
 *
 * `color_hex` is the column a format's identification colour arrives on.
 * The three CamelCase names are the format names as `brand-visual-system.md`
 * spells them, and the spelling is the point: they are matched exactly, never
 * case-insensitively, so an ordinary English word does not become a format.
 */
export const FORMAT_IDENTIFIERS = ['color_hex', 'RamaDub', 'MotionLab'];

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
 * family A, six byte-identical copies at digest `35d258011314` — is gone, and
 * the stripper is imported (D-41.1-07). §4.4 measured the extraction over all
 * 263 files under `src/`: against family A, **zero lines become live** and 1322
 * become blank.
 *
 * **One of those 1322 is this gate's own near miss, and it is worth naming.**
 * `src/components/formats/FormatMarker.tsx:128` sits inside a JSX comment that
 * family A read as code, and it names a format identifier. Check C fails on a
 * line carrying a semantic colour **utility** together with a format identifier;
 * that line carries a custom property instead, so it does not match today —
 * *purely by luck of phrasing*, as DEF-41-02 put it. Blanking it closes a latent
 * false red and moves no count.
 */
export function liveLines(relPath) {
  const raw = readFileSync(`${ROOT}/${relPath}`, 'utf8').split('\n');
  const { lines, unterminated } = liveLinesFrom(raw);
  if (unterminated !== null) refuseUnterminated(relPath, unterminated);
  return lines;
}

/** The `{ start, end }` line indices of the first block opened by `openerRe`, or `null`. */
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
    return null;
  }
  return null;
}

const DECLARATION_RE = /^\s*(--[a-zA-Z0-9-]+)\s*:\s*([^;]+);\s*$/;

/** Every `--name: value;` declared inside `block`, with its line number. */
export function declarationsIn(live, block) {
  const out = [];
  for (let i = block.start; i <= block.end; i += 1) {
    const m = DECLARATION_RE.exec(live[i]);
    if (m === null) continue;
    out.push({ name: m[1], value: m[2].trim(), line: i + 1 });
  }
  return out;
}

/** Every six-digit hex in `value`, upper-cased, no eight-digit form admitted. */
export function hexesIn(value) {
  const out = [];
  const re = /#([0-9A-Fa-f]{6})(?![0-9A-Fa-f])/g;
  let m;
  while ((m = re.exec(value)) !== null) out.push(`#${m[1].toUpperCase()}`);
  return out;
}

/**
 * Check B's matcher.
 *
 * A hex is matched with a leading guard (not preceded by an alphanumeric, so a
 * longer identifier does not carry one) and a trailing guard (not followed by a
 * hex digit, so `#0A0712FF` is not `#0A0712`).
 */
export function brandHexPattern(hexes) {
  const bodies = hexes.map((h) => h.slice(1)).sort();
  return new RegExp(`(?<![0-9A-Za-z])#(${bodies.join('|')})(?![0-9A-Fa-f])`, 'gi');
}

/**
 * Check C's matcher for a `sem-` colour utility.
 *
 * Leading guard only. The trailing side is left open on purpose: `bg-sem-crit`
 * and `bg-sem-crit/20` must both match, and so must a longer semantic name
 * added later.
 */
export const SEM_UTILITY_RE = new RegExp(
  `(?<![a-zA-Z0-9-])(?:${UTILITY_PREFIXES.join('|')})-sem-[a-z0-9-]+`,
  'g'
);

/** The catalogue's `key: { hex: "#RRGGBB", … }` entries, with line numbers. */
export function catalogueEntries(relPath) {
  const live = liveLines(relPath);
  const out = [];
  const re = /^\s*([A-Za-z][A-Za-z0-9]*)\s*:\s*\{\s*hex:\s*"(#[0-9A-Fa-f]{6})"/;
  for (let i = 0; i < live.length; i += 1) {
    const m = re.exec(live[i]);
    if (m === null) continue;
    out.push({ key: m[1], hex: m[2].toUpperCase(), line: i + 1 });
  }
  return out;
}

/** True when any hyphen-delimited segment of `name` is a format name or sigla. */
export function hasFormatSegment(name) {
  return name
    .toLowerCase()
    .split('-')
    .some((segment) => FORMAT_NAMES.includes(segment));
}

// ── the run ────────────────────────────────────────────────────────────────

if (!existsSync(SRC_DIR)) refuse('`src/` does not exist. Nothing was measured.');

if (!existsSync(`${ROOT}/${TOKEN_FILE}`)) {
  refuse(
    `${TOKEN_FILE} does not exist. Every check reads that exact path for the declared\n` +
      '       values, and parsing whatever moved into the name would be worse than refusing.\n' +
      '       If the token layer genuinely moved, TOKEN_FILE in this script moves with it —\n' +
      '       in the same commit, because the gate and the thing it guards are one change.\n' +
      '       Nothing was measured.'
  );
}

for (const exempt of EXEMPT_PATHS) {
  if (existsSync(`${ROOT}/${exempt}`)) continue;
  refuse(
    `${exempt} does not exist. It is one of this script's two exemptions, applied by\n` +
      '       EXACT PATH, and exempting whatever moved into the name would be worse than\n' +
      "       refusing. Read this script's header before moving it: the reason each path is\n" +
      '       exempt is written there, and a move that does not carry the reason with it\n' +
      '       turns an exemption into an unexplained hole. Nothing was measured.'
  );
}

const files = listScannableFiles(SRC_DIR);
if (files.length === 0) {
  refuse('the walk of `src/` found no scannable file. A vacuous green is not a green.');
}

const tokenLive = liveLines(TOKEN_FILE);

const rootBlock = findBlock(tokenLive, /^\s*:root\s*\{/);
if (rootBlock === null) {
  refuse(
    `the \`:root { … }\` block could not be located in ${TOKEN_FILE} (or it is never\n` +
      '       closed). Every declared value this script knows about comes from that block, so\n' +
      '       a run without it would report "no semantic is declared wrong" and call it a\n' +
      '       pass. Nothing was measured.'
  );
}

const rootDeclarations = declarationsIn(tokenLive, rootBlock);
const semDeclarations = rootDeclarations.filter((d) => d.name.startsWith('--sem-'));
if (semDeclarations.length === 0) {
  refuse(
    `the \`:root\` block in ${TOKEN_FILE} declares NO \`--sem-*\` token. Checks A and C\n` +
      '       would both be vacuous, and two vacuous ticks read exactly like two passes. This\n' +
      '       script must never report a green about a semantic set that does not exist.\n' +
      '       Nothing was measured.'
  );
}

const themeBlock = findBlock(tokenLive, /^\s*@theme\b[^{]*\{/);
const themeDeclarations = themeBlock === null ? [] : declarationsIn(tokenLive, themeBlock);
const colourMappings = themeDeclarations.filter((d) => d.name.startsWith('--color-'));

const declaredValues = new Map(rootDeclarations.map((d) => [d.name, d.value]));

const brandHexes = [...new Set(rootDeclarations.flatMap((d) => hexesIn(d.value)))].sort();
if (brandHexes.length === 0) {
  refuse(
    `the \`:root\` block in ${TOKEN_FILE} declares no hex value at all. Check B would\n` +
      '       have nothing to look for and would tick green over every file under src/.\n' +
      '       Nothing was measured.'
  );
}

const catalogue = catalogueEntries(CATALOGUE_FILE);
const comparableKeys = Object.keys(CATALOGUE_TO_TOKEN);
const missingCatalogueKeys = comparableKeys.filter(
  (key) => !catalogue.some((entry) => entry.key === key)
);
if (missingCatalogueKeys.length > 0) {
  refuse(
    `${CATALOGUE_FILE} does not offer ${missingCatalogueKeys.join(', ')}. Check D compares\n` +
      '       the catalogue against the token file key by key, and a key it cannot find is a\n' +
      '       comparison that silently does not happen. If the catalogue genuinely changed\n' +
      '       shape, CATALOGUE_TO_TOKEN in this script changes with it, in the same commit.\n' +
      '       Nothing was measured.'
  );
}

const failures = [];

console.log('\nverify-semantic-separation — a state is not a format, and the palette has one source');
console.log(`  token file: ${TOKEN_FILE}`);
console.log(`  scanned ${files.length} file(s) under src/`);
console.log(
  `  --sem-* tokens declared: ${semDeclarations.length} · brand hexes declared in :root: ` +
    `${brandHexes.length} · --color-* mappings: ${colourMappings.length}`
);
console.log(`  exemptions applied by exact path: ${EXEMPT_PATHS.length}`);
for (const exempt of EXEMPT_PATHS) console.log(`         ${exempt}`);
console.log(
  `  catalogue values compared in check D: ${comparableKeys.length} of ${catalogue.length} ` +
    `offered (\`${CATALOGUE_UNCOMPARED}\` is compared against nothing — see the header)\n`
);

// ── A. semantics are declared literally, on both sides ─────────────────────
const crossings = [];

for (const d of semDeclarations) {
  if (d.value.includes('var(')) {
    crossings.push({
      line: d.line,
      text: `${d.name}: ${d.value};`,
      why: 'a semantic declared through a reference instead of a literal',
    });
    continue;
  }
  if (!/#[0-9A-Fa-f]{3,8}\b/.test(d.value) && !d.value.includes('rgba(')) {
    crossings.push({
      line: d.line,
      text: `${d.name}: ${d.value};`,
      why: 'a semantic whose value is neither a hex nor an rgba() literal',
    });
  }
}

for (const d of rootDeclarations) {
  if (d.name.startsWith('--sem-')) continue;
  if (!d.value.includes('var(--sem-')) continue;
  crossings.push({
    line: d.line,
    text: `${d.name}: ${d.value};`,
    why: 'a non-semantic token declared through the semantic set',
  });
}

for (const d of colourMappings) {
  if (!d.value.includes('var(--sem-')) continue;
  const exposedName = d.name.slice('--color-'.length);
  if (d.value === `var(--${exposedName})`) continue;
  crossings.push({
    line: d.line,
    text: `${d.name}: ${d.value};`,
    why: 'a utility exposing a semantic under a name that is not its own',
  });
}

if (crossings.length === 0) {
  console.log(
    `  ✓ A  all ${semDeclarations.length} --sem-* token(s) carry literal values, and no var() ` +
      'crosses the boundary in either direction'
  );
} else {
  console.log(`  ✗ A  ${crossings.length} declaration(s) cross the semantic boundary:`);
  for (const h of crossings) console.log(`         ${TOKEN_FILE}:${h.line}: ${h.text}  — ${h.why}`);
  console.log(
    '\n       The separation between a state and a brand colour is STRUCTURAL, because there\n' +
      '       is no chromatic separation to lean on: two of the four semantics coincide in\n' +
      '       VALUE with something else in the system. A single var() across that boundary\n' +
      '       dissolves it — and dissolves it silently, since the screen renders identically\n' +
      '       either way. Write the value twice and record the coincidence in a comment: that\n' +
      '       is what makes separating them later a value change and not a refactor\n' +
      '       (40-UI-SPEC.md §3.4 device 2).\n'
  );
  failures.push('A');
}

// ── B. one home for a brand hex ────────────────────────────────────────────
const hexPattern = brandHexPattern(brandHexes);
const strayHexes = [];
for (const rel of files) {
  if (EXEMPT_PATHS.includes(rel)) continue;
  const live = liveLines(rel);
  for (let i = 0; i < live.length; i += 1) {
    let m;
    hexPattern.lastIndex = 0;
    while ((m = hexPattern.exec(live[i])) !== null) {
      strayHexes.push({ path: rel, line: i + 1, hex: `#${m[1].toUpperCase()}`, text: live[i].trim() });
    }
  }
}
if (strayHexes.length === 0) {
  console.log(
    `  ✓ B  none of the ${brandHexes.length} declared hex(es) appears under src/ outside the ` +
      `${EXEMPT_PATHS.length} exempted path(s)`
  );
} else {
  console.log(`  ✗ B  ${strayHexes.length} line(s) under src/ carry a hex the token file declares:`);
  for (const h of strayHexes) console.log(`         ${h.path}:${h.line}: [${h.hex}] ${h.text}`);
  console.log(
    '\n       A brand value written into a component is a second home for a colour, and the\n' +
      '       two homes drift. Retargeting the token then reaches every surface EXCEPT this\n' +
      '       one, which keeps rendering the previous generation with a green build and\n' +
      '       nothing to tell anyone. Use the utility, or the token through a var(). If the\n' +
      '       value genuinely cannot be read from CSS — the browser paints it before the\n' +
      '       stylesheet loads, or it is data on a row — that is an EXEMPTION, and an\n' +
      "       exemption is an exact path added to this script WITH ITS REASON in the header.\n"
  );
  failures.push('B');
}

// ── C. a semantic never identifies a format ────────────────────────────────
const conflations = [];
for (const rel of files) {
  const live = liveLines(rel);
  for (let i = 0; i < live.length; i += 1) {
    SEM_UTILITY_RE.lastIndex = 0;
    const utility = SEM_UTILITY_RE.exec(live[i]);
    if (utility === null) continue;
    const identifier = FORMAT_IDENTIFIERS.find((id) => live[i].includes(id));
    if (identifier === undefined) continue;
    conflations.push({
      path: rel,
      line: i + 1,
      utility: utility[0],
      identifier,
      text: live[i].trim(),
    });
  }
}
if (conflations.length === 0) {
  console.log(
    `  ✓ C  no line under src/ carries both a sem- colour utility and a format identifier ` +
      `(${files.length} file(s) read)`
  );
} else {
  console.log(`  ✗ C  ${conflations.length} line(s) use a semantic to identify a format:`);
  for (const h of conflations) {
    console.log(`         ${h.path}:${h.line}: [${h.utility} + ${h.identifier}] ${h.text}`);
  }
  console.log(
    '\n       A semantic says what STATE something is in; a format identification colour says\n' +
      '       WHICH NIGHT it is. Painting one with the other makes a reader unable to tell a\n' +
      '       caution from a format by looking — and the hue cannot disambiguate, because\n' +
      '       --sem-warn holds the same value as SunSet\'s identification colour. A format\n' +
      '       colour arrives as data on a row and is applied through an inline style; a state\n' +
      '       is a sem- utility. They do not meet on one line.\n' +
      '       This check is LINE-scoped: a file showing both, in two different places, is\n' +
      '       correct and is not what this reports.\n'
  );
  failures.push('C');
}

// ── D. the palette has one editable source ─────────────────────────────────
const divergences = [];
for (const key of comparableKeys) {
  const tokenName = CATALOGUE_TO_TOKEN[key];
  const entry = catalogue.find((e) => e.key === key);
  const declared = declaredValues.get(tokenName);
  if (declared === undefined) {
    divergences.push({
      key,
      tokenName,
      line: entry.line,
      catalogueHex: entry.hex,
      declaredValue: '(not declared)',
    });
    continue;
  }
  if (declared.trim().toUpperCase() === entry.hex) continue;
  divergences.push({
    key,
    tokenName,
    line: entry.line,
    catalogueHex: entry.hex,
    declaredValue: declared.trim(),
  });
}
if (divergences.length === 0) {
  console.log(
    `  ✓ D  all ${comparableKeys.length} compared catalogue value(s) equal the token they ` +
      'duplicate'
  );
} else {
  console.log(`  ✗ D  ${divergences.length} catalogue value(s) diverge from the token file:`);
  for (const h of divergences) {
    console.log(
      `         ${CATALOGUE_FILE}:${h.line}: ${h.key} = ${h.catalogueHex}, but ` +
        `${h.tokenName} = ${h.declaredValue}`
    );
  }
  console.log(
    '\n       The sunset scale exists in two forms a computer cannot share — CSS custom\n' +
      '       properties for styling, TypeScript literals for the value the database stores.\n' +
      '       ONE of them is the source a person edits; the other is asserted equal to it\n' +
      '       here. Two hand-maintained copies of a palette is how a palette acquires a\n' +
      '       seventh colour nobody decided (40-UI-SPEC.md §3.2). Decide which one moved and\n' +
      '       move the other to match — do not relax this check, and do not add the value to\n' +
      '       both by hand a second time.\n'
  );
  failures.push('D');
}

// ── E. no format becomes a token ───────────────────────────────────────────
const exposedColourNames = new Set(colourMappings.map((d) => d.name.slice('--color-'.length)));
const formatTokens = [];
const considered = [
  ...rootDeclarations.map((d) => ({ ...d, bare: d.name.slice(2), where: ':root' })),
  ...colourMappings.map((d) => ({
    ...d,
    bare: d.name.slice('--color-'.length),
    where: '@theme inline',
  })),
];
for (const d of considered) {
  if (!hasFormatSegment(d.bare)) continue;
  /*
   * --grad-sunset is NOT a format token, and the distinction is the whole
   * subtlety of this check: it names a GRADIENT — SunSet's exclusive signature,
   * one declaration and one application route — and it carries no --color-*
   * mapping, so no `bg-`/`text-` utility exists for it and no surface can reach
   * it by accident. A gradient token that stayed unexposed is the mechanical
   * form of the prohibition. A gradient token that acquired a --color-* mapping
   * would be a format colour with a utility, which is exactly what this check
   * exists to refuse, so exposure removes the exemption.
   */
  const isGradientToken = d.bare.startsWith('grad-');
  const isExposed = exposedColourNames.has(d.bare);
  if (isGradientToken && !isExposed) continue;
  formatTokens.push(d);
}
if (formatTokens.length === 0) {
  console.log(
    '  ✓ E  no token and no utility is named after a format or a sigla ' +
      '(--grad-sunset names a gradient, and is exposed through no --color-* mapping)'
  );
} else {
  console.log(`  ✗ E  ${formatTokens.length} token(s) carry a format name:`);
  for (const h of formatTokens) {
    console.log(`         ${TOKEN_FILE}:${h.line}: ${h.name} in ${h.where}`);
  }
  console.log(
    '\n       A per-format token is the compile-time format constant Phase 36 spent a\n' +
      '       migration removing, coming back through the token layer. The four\n' +
      '       identification colours are DATA ON A `formats` ROW, applied through an inline\n' +
      '       style: that is what makes changing a format\'s colour something other than a\n' +
      '       deploy, and what lets a fifth format exist without a stylesheet edit\n' +
      '       (D-36-12, 40-UI-SPEC.md §0 rule 4).\n'
  );
  failures.push('E');
}

// ── verdict ────────────────────────────────────────────────────────────────
console.log('');
if (failures.length === 0) {
  console.log('  SEMANTIC_SEPARATION_OK — all five checks passed.');
  console.log(
    '  Read the header before treating this as safety: a grep reads declarations, not\n' +
      '  intent. It is silent about a semantic written as a raw hex it does not know, about a\n' +
      '  format colour reached through a variable renamed on the way, and about a class name\n' +
      '  built by string concatenation — and it never says a colour is RIGHT. An amber mark\n' +
      '  still cannot tell a reader "caution" from "this is a SunSet night" by hue, which is\n' +
      '  why anything amber carries text. That one stays human.\n'
  );
  process.exit(0);
}
console.log(
  `  SEMANTIC_SEPARATION_FAIL — ${failures.length} check(s) failed: ${failures.join(', ')}\n`
);
process.exit(1);
