#!/usr/bin/env node
/**
 * verify-conversion.mjs — a surface declared converted is checked by walking
 * what it actually reaches, not by trusting the claim.
 *
 * WHAT IT ASSERTS, in one sentence: **for every surface `CONVERTED` declares,
 * nothing reachable from its page file through the import graph carries a raw
 * palette utility or a legacy token utility; every primitive `PRIMITIVES`
 * publishes has at least one importer; and the page's width comes from the
 * shell rather than from a maximum written on the page.**
 *
 * This is **G1 (checks A, B, C) and G4 (check D) in one script**, over one
 * manifest, with one walk. They are not split, and the reason is not economy:
 * two scripts reading the same manifest would resolve the same paths two ways,
 * and the day the two resolvers disagree is the day one of them is measuring a
 * file the other is not. `41-VALIDATION.md` lists them as separate gates
 * because they answer separate questions (DS-07 criterion 1, RESP-02 criterion
 * 4b); a question is not a file.
 *
 * WHY A STRUCTURAL CHECK AND NOT A TEST. There is no test runner for the
 * product — no `test` script, no `*.test.*`, no `*.spec.*` (`CLAUDE.md`
 * Guardrail 1) — and `npm run build` cannot see any of this. A raw palette
 * utility compiles. A legacy alias compiles. A component nobody imports
 * compiles. A page writing its own maximum compiles. Every failure this script
 * looks for is green to the type checker and invisible to the browser console;
 * it is wrong only against a contract written in a document, and a document
 * does not run.
 *
 * ── WHAT A GREEN DOES NOT MEAN (cosa un verde NON significa) ────────────────
 *
 *   - IT PROVES THAT **NO UNCONVERTED FILE IS REACHABLE** FROM A DECLARED
 *     SURFACE. It does **not** prove the conversion is RIGHT. It is blind to an
 *     inline hex written in a style attribute, to a class built by string
 *     concatenation or held in a lookup table, and to a layout that is simply
 *     ugly. **H41-1 — every converted surface observed at three widths by a
 *     person — is the only thing that says a surface is workable**, and no tick
 *     here stands in for it.
 *   - CHECK D SAYS A MAXIMUM IS DECLARED AND THAT THE PAGE DID NOT OVERRIDE IT.
 *     **It does not say the chosen width is right.** That is UI-SPEC Open
 *     Question 2, it is one line in the shell, and it touches no page.
 *   - THE SCOPE IS THE MANIFEST, AND NOTHING ELSE. A surface nobody declared is
 *     not scanned and not counted as a failure. The printed surface count is
 *     the honest reading of this gate — the tick only says the declared ones
 *     came back clean.
 *   - **THE BUILT STYLESHEET IS NEVER READ, AND THAT IS DELIBERATE.**
 *     DEF-41-01 measured that Tailwind compiles class strings out of
 *     `.planning/**` and out of comments. A gate that read `.next/static/css`
 *     as evidence that product code uses a class would be reading a phase
 *     document and calling it code. This script reads only files under `src/`
 *     that a declared surface actually reaches.
 *   - IT CANNOT FOLLOW A SPECIFIER IT CANNOT RESOLVE. It refuses rather than
 *     narrowing quietly — see the refusals — but a component reached through a
 *     runtime lookup, a re-export chain built at runtime, or a package is
 *     outside the walk by construction.
 *
 * ── THE FOUR CHECKS ─────────────────────────────────────────────────────────
 *
 *   A. **No raw palette utility** in any file of any converted surface's
 *      closure. Tailwind's default colour families reached through a colour
 *      utility prefix. See the scrim paragraph for the one shape that is
 *      tolerated and why enumerating three of its five measured opacities
 *      would have been a false red.
 *
 *   B. **No legacy token utility.** The four names Phase 40 kept as aliases.
 *      This check reports on **converted surfaces only**, and says so on every
 *      run: D-41-13 empties those names of consumers one whole surface at a
 *      time, and **removing the aliases is a bonus that must never become the
 *      schedule.**
 *
 *   C. **Every published primitive has at least one importer, counted per
 *      named export.** Per symbol and not per file, because two files in this
 *      tree each carry two rungs of one ladder published waves apart; a
 *      file-level count goes green on the first importer of either and never
 *      sees the orphaned one.
 *
 *   D. **The container** — G4. Three assertions: the shell declares the three
 *      maxima and only those; every converted page imports the shell and writes
 *      no maximum of its own; and the width recorded in the manifest agrees
 *      with §4's two closed lists.
 *
 * ── THE TWO EXEMPTIONS, DECLARED BEFORE THE CHECKS EXIST ────────────────────
 *
 * §0 rule 3: *a gate that goes red on a correct file gets switched off, and
 * then it guards nothing*. Both exemptions are named constants carrying their
 * reason, and the report prints them — **a green states what it forgave.**
 *
 *   1. `src/app/globals.css` — the token layer itself. It is where the palette
 *      legitimately exists as a literal, and it is what every other file reads
 *      instead of writing a colour. (It is also not reachable by this walk,
 *      which follows code imports; the entry is written anyway, because an
 *      exemption that exists only as an accident of the walk is an exemption
 *      nobody can see.)
 *   2. `src/app/(admin)/admin/formats/ColorSwatchPicker.tsx` — **the one file
 *      that legitimately carries brand hexes.** A format's identification
 *      colour is *data on a catalogue row*, not a CSS token: it is chosen by an
 *      organiser, stored per row and rendered as a swatch.
 *      `verify-semantic-separation.mjs` already exempts the same file for the
 *      same reason, and this script names it in the same shape rather than
 *      inventing a second one.
 *
 * ── THE SCRIM, AND WHY IT IS A SHAPE RATHER THAN A LIST OF THREE ────────────
 *
 * §13's G1 row says the raw-palette matcher must not flag `bg-black/60`,
 * `bg-black/80` or `bg-black/90` — eleven modal scrims and a full-bleed media
 * viewer carry them and every one is correct. Measured on this tree, the
 * translucent-black overlay appears at **five** opacities, not three: the two
 * §13 does not name live in the media upload preview.
 *
 * Enumerating the three named values would therefore open this gate **red on a
 * correct file** the day a media surface converts — precisely the outcome §0
 * rule 3 exists to prevent, and §0 *"outranks everything below"*, §13
 * included. So the tolerated shape is **translucent black through the
 * background utility, at any opacity**: a scrim is a depth decision, not a
 * colour choice, and it has no token because it is not part of the palette.
 *
 * **Opaque black is not a scrim and is not tolerated**, nor is translucent
 * black through any other utility prefix. The report prints every scrim it
 * forgave, with its file and line, so the tolerance is visible on a green
 * rather than discovered on a red.
 *
 * The nine two-stop accent fades need no exemption at all: measured, they are
 * built from **token** names, which this matcher does not contain. That is
 * proven by an asserted mutation rather than argued — see the SUMMARY.
 *
 * ── THE BOUNDARY GUARDS, AND THE LINE IN THE TREE THAT NEEDED BOTH ──────────
 *
 * Both matchers use `(?<![a-zA-Z0-9-])PREFIX-(NAME)(?![a-z0-9-])`, the
 * technique `verify-tokens.mjs:535-554` documents, with the names sorted
 * longest-first so the four-syllable legacy name is offered before the one that
 * is its prefix.
 *
 * LEADING guard, and this tree already contains the line that needs it. The
 * payment callback's own source carries the word *auto-redirect*, inside which
 * a colour-utility prefix is followed by a hyphen and a palette family name.
 * Without the leading guard the first converted surface in the phase flags
 * itself, on a word, in prose. TRAILING guard, same construction: without it a
 * default scale name would be read as a token name and vice versa.
 *
 * The names are built as **parts** and never spelled as a whole utility in this
 * file. That is not tidiness: per DEF-41-01 a complete utility written here
 * would be a live Tailwind candidate and would ship a dead rule.
 *
 * ── COMMENT HYGIENE, WHICH THIS GATE HAD TO EXTEND ──────────────────────────
 *
 * Comment lines are blanked before any counting, with the line-shape heuristic
 * `verify-tokens.mjs:437-450` uses — deliberately not a tokeniser, because
 * WR-07 (`32-REVIEW.md`) records that a real comment parser written in this
 * repository was unsound.
 *
 * **DEF-41-02 is why this script's stripper has a fourth opener.** The sibling
 * heuristic recognises a line starting with two slashes, a star, or a block
 * opener or closer — and **a JSX comment matches none of them**: its opening
 * line starts with a brace. Measured consequence, on the first surface this
 * gate scans: the payment callback's success branch carries a one-line JSX
 * comment whose prose contains the *auto-redirect* case above. Read as code, it
 * is a hit; read as what it is, it is a sentence.
 *
 * So a JSX comment is a fourth line shape here, and a JSX comment that opens
 * without closing on its own line blanks the lines up to its closer. That is
 * still a line shape and not a parse. Its error direction is stated rather than
 * assumed: **it can blank more than it should** if a line's first characters
 * are a JSX comment opener inside a string, which is why the opener must be at
 * the start of the trimmed line. The count of lines blanked this way is printed
 * on every run, so the extension is measurable rather than trusted.
 *
 * ── WHY THE HELPERS ARE LOCAL AND NOT IMPORTED ──────────────────────────────
 *
 * `41-07-PLAN.md` names `listScannableFiles`, `liveLines`, `consumerPattern`
 * and `refuse` as exports of `verify-tokens.mjs`. **They cannot be imported.**
 * That module runs its seven checks at module scope and ends in
 * `process.exit()` (`:1041-1058`), with no main-module guard, so importing it
 * runs the TOKEN gate and exits this process with the TOKEN gate's verdict —
 * this script would exit 0 having measured nothing, which is the vacuous green
 * it exists to prevent. Plan 41-02 measured exactly this and both of its gates
 * are self-contained for the same reason; the three older sibling gates each
 * declare their own walk and their own comment heuristic. **Self-contained is
 * the house shape for a gate.**
 *
 * `scripts/conversion-manifest.mjs` IS imported, and safely: nothing runs at
 * its import time, by construction and by its own docblock.
 *
 * SECRECY. `.planning/` is tracked and this repository is PUBLIC (`CLAUDE.md`
 * Guardrail 5). This script reads only committed files under `src/`, prints
 * only paths, line numbers and source lines, opens no network connection, reads
 * no environment variable and writes no artefact.
 *
 * Zero dependencies. Node built-ins only, ESM. Deliberately NOT wired into
 * `npm run build`: `next build` is the type gate, and a type gate that starts
 * failing for a reason that is not a type teaches everyone to ignore it.
 *
 * Usage:
 *   node scripts/verify-conversion.mjs
 *
 * (Not registered in `package.json` by plan 41-07. Plan 41-12 owns that file
 * and registers all six new gates at once, so no two plans in a wave contend
 * for it.)
 *
 * Exit codes:
 *   0  all four checks passed
 *   1  at least one failed — each is printed with its file, its line and the
 *      exact thing found
 *   2  nothing was measured: the manifest is missing, unimportable, empty or
 *      inconsistent; a declared page file is not on disk; a surface's closure
 *      is empty; a local specifier could not be resolved; or the shell is
 *      missing. **No verdict is implied by a 2.**
 */

import { readdirSync, readFileSync, existsSync, lstatSync } from 'node:fs';
import { dirname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SRC_DIR = `${ROOT}/src`;

const SCANNED_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs'];
const SKIP_DIRS = new Set(['node_modules', '.next', '.git']);

/** A refusal is not a failure: it means the measurement did not happen. */
function refuse(message) {
  console.log(`\nFATAL: ${message}\n`);
  process.exit(2);
}

function toRelative(abs) {
  return abs.slice(ROOT.length + 1).split(sep).join('/');
}

function listScannableFiles(dir, extensions = SCANNED_EXTENSIONS) {
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

/* ────────────────────────────────────────────────────────────────────────────
 * Comment hygiene — the sibling heuristic, plus the JSX form DEF-41-02 records
 * ──────────────────────────────────────────────────────────────────────────── */

const JSX_COMMENT_OPEN = '{/' + '*';
const JSX_COMMENT_CLOSE = '*' + '/}';

/** How many lines the JSX extension blanked, across every file read this run. */
let jsxCommentLinesBlanked = 0;

/** The three sibling openers. A line shape, not a parse — see the header. */
function isSiblingCommentLine(trimmed) {
  return (
    trimmed.startsWith('//') ||
    trimmed.startsWith('*') ||
    trimmed.startsWith('/' + '*')
  );
}

const liveLinesCache = new Map();

/**
 * The file's lines with every comment blanked, carriage returns removed.
 *
 * Cached: check C reads every file under `src/` once per primitive export
 * otherwise, and the JSX counter must not count the same line twice.
 */
function liveLines(relPath) {
  const cached = liveLinesCache.get(relPath);
  if (cached) return cached;

  const raw = readFileSync(`${ROOT}/${relPath}`, 'utf8').split('\n');
  const out = [];
  let insideJsxComment = false;

  for (const line of raw) {
    const text = line.split('\r').join('');
    const trimmed = text.trim();

    if (insideJsxComment) {
      out.push('');
      jsxCommentLinesBlanked += 1;
      if (trimmed.includes(JSX_COMMENT_CLOSE)) insideJsxComment = false;
      continue;
    }
    if (trimmed.startsWith(JSX_COMMENT_OPEN)) {
      out.push('');
      jsxCommentLinesBlanked += 1;
      if (!trimmed.includes(JSX_COMMENT_CLOSE)) insideJsxComment = true;
      continue;
    }
    out.push(isSiblingCommentLine(trimmed) ? '' : text);
  }

  liveLinesCache.set(relPath, out);
  return out;
}

const liveSourceCache = new Map();

/** The live source as one string — for the import clauses, which span lines. */
function liveSource(relPath) {
  const cached = liveSourceCache.get(relPath);
  if (cached !== undefined) return cached;
  const joined = liveLines(relPath).join('\n');
  liveSourceCache.set(relPath, joined);
  return joined;
}

/* ────────────────────────────────────────────────────────────────────────────
 * The exemptions — named, with their reasons, BEFORE any check exists
 * ──────────────────────────────────────────────────────────────────────────── */

/**
 * Exemption 1 — the token layer itself.
 *
 * It is the one file where the palette exists as a literal on purpose: it is
 * what every other file reads *instead of* writing a colour. It is also not
 * reachable by an import walk over code, so this entry changes no outcome
 * today. It is written anyway, because an exemption that holds only by an
 * accident of the walk is an exemption nobody can see, and the day a surface
 * imports the stylesheet it would become a silent red.
 */
export const TOKEN_LAYER_FILE = 'src/app/globals.css';

/**
 * Exemption 2 — the one file that legitimately carries brand hexes.
 *
 * A format's identification colour is **data on a catalogue row**, chosen by an
 * organiser and stored per row, not a CSS token. `verify-semantic-separation.mjs`
 * exempts this exact path for this exact reason; the name is repeated here
 * rather than imported, for the module-scope reason in the header.
 *
 * `41-VALIDATION.md` records the disposition as **accept**, not mitigate: the
 * hexes it carries are already published in `.claude/rules/brand-visual-system.md`.
 */
export const CATALOGUE_FILE = 'src/app/(admin)/admin/formats/ColorSwatchPicker.tsx';

/** The two, as a list, so the report can print what it forgave. */
export const EXEMPT_PATHS = [
  [TOKEN_LAYER_FILE, 'the token layer — where the palette legitimately is a literal'],
  [CATALOGUE_FILE, 'the format catalogue swatch — a brand hex that is data on a row, not a token'],
];

const EXEMPT_SET = new Set(EXEMPT_PATHS.map(([path]) => path));

/* ────────────────────────────────────────────────────────────────────────────
 * The import-closure walk
 * ──────────────────────────────────────────────────────────────────────────── */

/**
 * Extensions the walk will resolve a local specifier to.
 *
 * **`.ts` is included, and the plan asked only for `.tsx`.** Measured reason,
 * not a preference: with `.tsx` alone the first declared surface has an
 * **unresolved** specifier — its own server action — so the walk would stop
 * there and the gate would report a green over a closure it had silently
 * narrowed. With `.ts`, that surface's closure resolves completely, zero
 * specifiers left dangling. A `.ts` module can hold a class string as easily as
 * a component can (a variants map is the ordinary way), so excluding it is a
 * hole in exactly the direction that produces a green.
 */
const RESOLVE_EXTENSIONS = ['.tsx', '.ts', '.jsx', '.js', '.mjs', '.cjs'];

/** Local specifiers pointing at these are content, not code: not followed. */
const NON_CODE_SUFFIXES = ['.css', '.json', '.svg', '.png', '.jpg', '.jpeg', '.webp', '.avif', '.ico'];

/**
 * Resolve one local specifier to a repository-relative path, or `null`.
 *
 * `@/*` maps to `./src/*` — read from `tsconfig.json`, not assumed. A bare
 * package specifier is not local and is not the walk's business.
 */
const resolveCache = new Map();

/*
 * The cache key is a JSON pair, and it is written that way after a defect this
 * file carried for one revision. The first version separated the two halves
 * with a NUL, on the reasoning that no path contains one — true, and beside the
 * point: **a NUL anywhere in a source file makes it BINARY to `grep` and to
 * `file`**, and every `grep` over this gate then returns nothing at all rather
 * than zero. In a repository whose entire verification method is grep and
 * written evidence (`CLAUDE.md` Guardrail 1), a file no grep can read is a
 * silent failure with a green face — and it fired immediately, by turning a
 * mutation assertion into a false negative that read as *"the substitution did
 * not land"* when it had. Printable separators only.
 */
function resolveSpecifier(spec, fromRel) {
  const fromDir = fromRel.split('/').slice(0, -1).join('/');
  const key = JSON.stringify([fromDir, spec]);
  if (resolveCache.has(key)) return resolveCache.get(key);
  const result = resolveSpecifierUncached(spec, fromRel);
  resolveCache.set(key, result);
  return result;
}

function resolveSpecifierUncached(spec, fromRel) {
  let base;
  if (spec.startsWith('@/')) {
    base = `src/${spec.slice(2)}`;
  } else if (spec.startsWith('./') || spec.startsWith('../')) {
    const dir = fromRel.split('/').slice(0, -1).join('/');
    base = resolve(`/${dir}`, spec).slice(1);
  } else {
    return null;
  }

  for (const ext of RESOLVE_EXTENSIONS) {
    if (existsSync(`${ROOT}/${base}${ext}`)) return `${base}${ext}`;
  }
  for (const ext of RESOLVE_EXTENSIONS) {
    if (existsSync(`${ROOT}/${base}/index${ext}`)) return `${base}/index${ext}`;
  }
  if (existsSync(`${ROOT}/${base}`) && RESOLVE_EXTENSIONS.some((e) => base.endsWith(e))) {
    return base;
  }
  return null;
}

function isLocalSpecifier(spec) {
  return spec.startsWith('@/') || spec.startsWith('./') || spec.startsWith('../');
}

function isNonCodeSpecifier(spec) {
  return NON_CODE_SUFFIXES.some((suffix) => spec.endsWith(suffix));
}

/*
 * The clause matchers.
 *
 * The clause class excludes `;` and both quote characters, so a match cannot
 * run from one statement's opening keyword across an intervening statement to a
 * later `from` — the failure that would silently attribute one file's imports
 * to another.
 */
const NAMED_IMPORT_RE = /\bimport\s+([^;'"]*?)\s*from\s*['"]([^'"]+)['"]/g;
const REEXPORT_RE = /\bexport\s+([^;'"]*?)\s*from\s*['"]([^'"]+)['"]/g;
const SIDE_EFFECT_IMPORT_RE = /\bimport\s*['"]([^'"]+)['"]/g;
const DYNAMIC_IMPORT_RE = /\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g;

/** Every local specifier `relPath` reaches, in live lines. */
function localSpecifiers(relPath) {
  const source = liveSource(relPath);
  const specs = [];
  for (const re of [NAMED_IMPORT_RE, REEXPORT_RE]) {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(source)) !== null) specs.push(m[2]);
  }
  for (const re of [SIDE_EFFECT_IMPORT_RE, DYNAMIC_IMPORT_RE]) {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(source)) !== null) specs.push(m[1]);
  }
  return specs.filter(isLocalSpecifier);
}

/**
 * The transitive closure of one page file, and every local specifier it could
 * not resolve.
 *
 * **The walk passes THROUGH an excluded file rather than stopping at it.** A
 * spine member is excluded from the *checks* because its conversion is another
 * plan's; it is not a wall. Stopping there would hide any non-spine file that a
 * surface reaches only by way of the spine, which is a narrowing in the
 * direction that produces a green.
 */
function importClosure(entryRel) {
  const reached = new Set();
  const unresolved = [];
  const queue = [entryRel];

  while (queue.length > 0) {
    const rel = queue.shift();
    if (reached.has(rel)) continue;
    reached.add(rel);

    for (const spec of localSpecifiers(rel)) {
      if (isNonCodeSpecifier(spec)) continue;
      const target = resolveSpecifier(spec, rel);
      if (target === null) {
        unresolved.push({ from: rel, spec });
        continue;
      }
      if (!reached.has(target)) queue.push(target);
    }
  }

  return { reached: [...reached].sort(), unresolved };
}

/** `**` crosses separators, `*` does not, everything else is literal. */
function globToRegExp(glob) {
  let out = '^';
  for (let i = 0; i < glob.length; i += 1) {
    const ch = glob[i];
    if (ch === '*') {
      if (glob[i + 1] === '*') {
        out += '.*';
        i += 1;
        if (glob[i + 1] === '/') i += 1;
      } else {
        out += '[^/]*';
      }
      continue;
    }
    out += ch.replace(/[.+?^${}()|[\]\\]/g, '\\$&');
  }
  return new RegExp(`${out}$`);
}

/* ────────────────────────────────────────────────────────────────────────────
 * The matchers — built from parts, never spelled as a whole utility
 * ──────────────────────────────────────────────────────────────────────────── */

/**
 * The twelve utility prefixes through which a colour reaches a surface. The
 * same list `verify-tokens.mjs:271-284` and `verify-semantic-separation.mjs`
 * both carry, for the same reason: a colour arriving through a thirteenth
 * prefix is a prefix nobody has met yet, and adding it is a decision.
 */
const COLOUR_UTILITY_PREFIXES = [
  'bg', 'text', 'border', 'ring', 'from', 'to', 'via',
  'fill', 'stroke', 'shadow', 'outline', 'decoration',
];

/**
 * Tailwind's default colour families, plus the two achromatic names.
 *
 * A converted surface reads the token layer; it does not name a palette. **The
 * two achromatic names are in the list on purpose:** finding A2 is that 64
 * lines in this tree fill with the accent and write the achromatic light ink
 * over it at **2.91 : 1**, against WCAG 1.4.3's 4.5 : 1. Forbidding the name is
 * the mechanical form of closing A2, and the button ladder already carries the
 * computed alternative.
 *
 * **The one legitimate future case, written now so it is a decision and not a
 * discovery:** the ink over a full-bleed media scrim, where the ground is the
 * scrim rather than a token. The plan that converts a media surface either adds
 * a token for it or adds a line to this constant with its reason — and either
 * way somebody reads it.
 */
const PALETTE_NAMES = [
  'slate', 'gray', 'zinc', 'neutral', 'stone',
  'red', 'orange', 'amber', 'yellow', 'lime', 'green', 'emerald', 'teal',
  'cyan', 'sky', 'blue', 'indigo', 'violet', 'purple', 'fuchsia', 'pink', 'rose',
  'black', 'white',
];

/**
 * The four names Phase 40 kept as aliases in the token layer — `--background`,
 * `--foreground`, `--card` and `--card-border` — as the utilities that consume
 * them.
 *
 * Sorted longest-first by the matcher, so the compound name is offered before
 * the name that is its prefix and a boundary utility is not read as a consumer
 * of the shorter one. The trailing guard does the rest: the line-weight token
 * shares no name with any of these and is not matched.
 */
const LEGACY_TOKEN_NAMES = ['card-border', 'card', 'background', 'foreground'];

/**
 * The matcher for a set of colour names.
 *
 * `scale` is what distinguishes the two callers, and **getting it wrong is the
 * defect this gate's own mutation proof caught before it was committed.**
 *
 * `verify-tokens.mjs:535-554` uses a bare trailing guard, `(?![a-z0-9-])`,
 * because there the numeric scale is precisely what must NOT match: it is
 * looking for TOKEN names, and a default scale name wearing one is the false
 * positive it is defending against. **This gate is looking for the opposite
 * thing**, so the same guard, copied unchanged, refuses every palette utility
 * that carries a number — which is nearly all of them. Borrowed with the scale
 * segment omitted, check A matched only the two achromatic names and went green
 * on a deliberately planted default scale utility.
 *
 * So the palette matcher takes an OPTIONAL numeric scale between the name and
 * the trailing guard, and the legacy-name matcher does not: those four names
 * have no scale, and admitting one there would loosen a check for nothing.
 */
function utilityPattern(names, { scale = false } = {}) {
  const sorted = [...names].sort((a, b) => b.length - a.length);
  const scalePart = scale ? '(?:-\\d{1,3})?' : '';
  return new RegExp(
    `(?<![a-zA-Z0-9-])(?:${COLOUR_UTILITY_PREFIXES.join('|')})-(${sorted.join('|')})${scalePart}(?![a-z0-9-])`,
    'g'
  );
}

/**
 * The tolerated scrim: **translucent** black through the background prefix, at
 * any opacity. Opaque black is not a scrim, and no other prefix is one.
 *
 * Decided on the matched occurrence and its immediate right-hand context, never
 * on the line — a line carrying a correct scrim and an incorrect palette
 * utility must still fail on the second, and testing the line would forgive
 * both.
 */
const SCRIM_PREFIX = 'bg';
const SCRIM_OPACITY_RE = /^\/\d+(?![a-z0-9-])/;

function isToleratedScrim(hit) {
  if (hit.name !== 'black') return false;
  if (hit.match !== `${SCRIM_PREFIX}-black`) return false;
  return SCRIM_OPACITY_RE.test(hit.rest);
}

function findUtilityHits(relPath, pattern) {
  const hits = [];
  liveLines(relPath).forEach((line, i) => {
    pattern.lastIndex = 0;
    let m;
    while ((m = pattern.exec(line)) !== null) {
      hits.push({
        path: relPath,
        line: i + 1,
        name: m[1],
        match: m[0],
        rest: line.slice(m.index + m[0].length),
        source: line.trim(),
      });
    }
  });
  return hits;
}

/* ────────────────────────────────────────────────────────────────────────────
 * §4's two closed lists — check D's third assertion reads these
 * ──────────────────────────────────────────────────────────────────────────── */

/**
 * The shell, by exact path. Not derived from `PRIMITIVES`: if that list ever
 * loses the entry, deriving it would make check D silently stop checking
 * anything, which is the failure direction that prints a tick.
 */
export const SHELL_FILE = 'src/components/ui/PageShell.tsx';

/** §4's three forms, and the only three maxima the shell may declare. */
export const DECLARED_MAXIMA = ['max-w-5xl', 'max-w-7xl', 'max-w-sm'];

/**
 * §4's `wide` list, closed, and edited by decision rather than by diff.
 * A surface whose primary object is a dense table or a multi-column grid.
 */
export const WIDE_ROUTES = [
  ['/admin/members', 'the member table — the densest table in the product'],
  ['/admin/finance', 'the finance ledger — a wide transaction table'],
  ['/admin/events/[id]/sales', 'the per-event sales table'],
  ['/admin/events/[id]/tickets', 'the ticket table, with its refund actions'],
  ['/admin/events/[id]/guest-list', 'the guest-list table'],
  ['/admin/events/[id]/review', 'the media review grid'],
  ['/admin/events/[id]/analytics', 'the per-event KPI grid'],
  ['/admin/analytics', 'the analytics overview KPI grid'],
  ['/admin/analytics/members', 'the member-analytics tables'],
  ['/admin/analytics/compare', 'the comparison table — two editions side by side'],
  ['/admin/members/growth', 'the growth series, read as a grid'],
  ['/gallery', 'the public media grid'],
];

/**
 * §4's `focus` list, also closed. A single-purpose screen with one card and one
 * action. Three of the four already carried the narrow maximum before the
 * shell existed, so this form is adoption rather than a choice.
 */
export const FOCUS_ROUTES = [
  ['/login', 'one card, one action'],
  ['/register', 'one card, one action'],
  ['/set-password', 'one card, one action'],
  ['/payment/callback', 'one card, one action — and the outcome of a payment'],
];

const WIDE_SET = new Set(WIDE_ROUTES.map(([route]) => route));
const FOCUS_SET = new Set(FOCUS_ROUTES.map(([route]) => route));

/** §4's rule, as a function: on a list, or `default`, and `default` is an answer. */
function expectedWidth(route) {
  if (WIDE_SET.has(route)) return 'wide';
  if (FOCUS_SET.has(route)) return 'focus';
  return 'default';
}

/* ────────────────────────────────────────────────────────────────────────────
 * The declared orphan debt — check C's equivalent of G6's REMAINING
 * ──────────────────────────────────────────────────────────────────────────── */

/**
 * Published primitives that have **no importer today**, each with the reason
 * and the work that closes it.
 *
 * **Why this list exists rather than a red.** Check C's rule is that zero
 * importers is a failure. Measured on this tree, one entry in `PRIMITIVES` has
 * zero — so the gate as specified could only ship red, and a gate that ships
 * red is a gate somebody switches off before it has ever guarded anything
 * (§0 rule 3, `verify-media-strip.mjs:51-62`). `verify-breakpoints.mjs`
 * established the answer one plan ago: a **debt with a number on it that can
 * only go down**, printed loudly on every green, each entry naming the work
 * that removes it.
 *
 * The three states are the same three:
 *
 *   - an orphan **not** on this list  → FAILURE. This is the check.
 *   - an orphan **on** this list      → printed loudly, exit still 0.
 *   - an entry that **gained** an importer → STALE notice with the instruction
 *     to delete the line. Not a failure, because the file is correct; printed
 *     anyway, because a debt left recorded after it is paid is a gate quietly
 *     loosened — it would permit re-orphaning exactly what was just adopted.
 *
 * An entry naming a symbol that `PRIMITIVES` does not publish is a FAILURE: a
 * forgiveness for something nobody declared forgives an unknown amount.
 *
 * Shape: `[path, exportName, reason]`.
 */
/*
 * EMPTY, AND THAT IS THE MEASURED STATE — not a list nobody got round to filling.
 *
 * It held exactly one entry when this gate shipped: the icon rung, published by
 * plan 41-03 with zero importers because the file meant to adopt it had been
 * converted on a parallel branch where it did not yet exist. Plan 41-08 closed
 * it from the other direction — the media viewer's close control is a 44 x 44
 * icon rung now — and the gate's own STALE notice said what to do next, which
 * was to delete the line rather than leave a paid debt on the books.
 *
 * **What is NOT closed, and must not be read as closed:** the toast's dismiss
 * control still carries a hand-written copy of that contract, and no plan in
 * this phase declares that file. DEF-41-03's structural half is still owed. The
 * gate cannot see it, because the gate counts importers and the count is now
 * one — which is the honest limit of what a mechanical check can say, and the
 * reason it is written here instead of being left to the count.
 */
export const ORPHANS_DECLARED = [];

/* ────────────────────────────────────────────────────────────────────────────
 * The refusals, taken together, BEFORE any tick is printed
 * ──────────────────────────────────────────────────────────────────────────── */

console.log('\n  verify-conversion — a declared surface is checked by walking what it reaches\n');

let manifest;
try {
  manifest = await import('./conversion-manifest.mjs');
} catch (error) {
  refuse(
    'scripts/conversion-manifest.mjs could not be imported, so there is no list of\n' +
      '       converted surfaces to walk. Nothing was measured.\n' +
      `       ${error && error.message ? error.message : String(error)}`
  );
}

const { SPINE, PHASE_42_PATHS, PRIMITIVES, CONVERTED, checkManifest, convertedSpinePaths } = manifest;

for (const [name, value] of [
  ['SPINE', SPINE], ['PHASE_42_PATHS', PHASE_42_PATHS],
  ['PRIMITIVES', PRIMITIVES], ['CONVERTED', CONVERTED],
]) {
  if (!Array.isArray(value)) {
    refuse(
      `the manifest does not export ${name} as an array. This script reads four declared\n` +
        '       lists and a check function; a manifest with a different shape is a manifest\n' +
        '       this gate cannot measure, and guessing at the new shape would be worse than\n' +
        '       refusing. Nothing was measured.'
    );
  }
}
if (typeof checkManifest !== 'function' || typeof convertedSpinePaths !== 'function') {
  refuse(
    'the manifest does not export checkManifest() and convertedSpinePaths(). Its own\n' +
      '       docblock requires a consumer to call the first before reading a single entry.\n' +
      '       Nothing was measured.'
  );
}

/*
 * The manifest's own refusals come first and are reported verbatim. They cover
 * an empty CONVERTED, an empty PRIMITIVES, a declared page file that is not on
 * disk, a fourth width, and a stale SPINE or PRIMITIVES path. Re-deriving them
 * here would be a second author for one rule.
 */
const manifestVerdict = checkManifest();
if (!manifestVerdict.ok) {
  refuse(
    `the manifest refuses, with ${manifestVerdict.refusals.length} reason(s):\n\n       ` +
      manifestVerdict.refusals.join('\n\n       ')
  );
}

if (!existsSync(SRC_DIR)) {
  refuse(`src/ does not exist at ${toRelative(SRC_DIR)} — nothing was scanned.`);
}

const allSrcFiles = listScannableFiles(SRC_DIR);
if (allSrcFiles.length === 0) {
  refuse(
    'the walk of src/ found no scannable file — a vacuous green is not a green.\n' +
      `       Extensions looked for: ${SCANNED_EXTENSIONS.join(', ')}`
  );
}

if (!existsSync(`${ROOT}/${SHELL_FILE}`)) {
  refuse(
    `${SHELL_FILE} does not exist. Check D reads that exact path — it is the one file\n` +
      '       §4 says owns the content maximum — and parsing whatever moved into the name\n' +
      '       would be worse than refusing. If the shell genuinely moved, SHELL_FILE in this\n' +
      '       script moves with it, in the same commit. Nothing was measured.'
  );
}

/* ── the walk ─────────────────────────────────────────────────────────────── */

const spinePaths = new Set(convertedSpinePaths());
const phase42Patterns = PHASE_42_PATHS.map(([glob, reason]) => ({ glob, reason, re: globToRegExp(glob) }));

function phase42Match(relPath) {
  return phase42Patterns.find((p) => p.re.test(relPath)) ?? null;
}

const surfaces = [];
const excludedSpine = new Set();
const excludedPhase42 = new Map();
const exemptionsApplied = new Set();

for (const [route, pageFile, width, reason] of CONVERTED) {
  if (!existsSync(`${ROOT}/${pageFile}`)) {
    refuse(
      `CONVERTED names ${route} at ${pageFile}, which is not on disk. Nothing was measured.`
    );
  }

  const { reached, unresolved } = importClosure(pageFile);

  if (unresolved.length > 0) {
    refuse(
      `the closure of ${route} has ${unresolved.length} local specifier(s) this walk could\n` +
        '       not resolve, so part of that surface was never opened. A narrowed walk is the\n' +
        '       failure direction that prints a tick. Nothing was measured.\n\n       ' +
        unresolved.map(({ from, spec }) => `${from}  ->  ${spec}`).join('\n       ')
    );
  }

  const scanned = [];
  for (const rel of reached) {
    if (EXEMPT_SET.has(rel)) {
      exemptionsApplied.add(rel);
      continue;
    }
    if (spinePaths.has(rel)) {
      excludedSpine.add(rel);
      continue;
    }
    const p42 = phase42Match(rel);
    if (p42) {
      excludedPhase42.set(rel, p42.glob);
      continue;
    }
    scanned.push(rel);
  }

  if (scanned.length === 0) {
    refuse(
      `the closure of ${route} is empty after exclusions — every file it reaches, its own\n` +
        '       page file included, is declared spine, Phase 42 or exempt. A surface whose\n' +
        '       whole closure is excluded is a surface this gate cannot say anything about,\n' +
        '       and saying it cleanly is not the same as saying nothing. Nothing was measured.'
    );
  }

  surfaces.push({ route, pageFile, width, reason, reached, scanned });
}

/* ── print what was counted, before any verdict ───────────────────────────── */

const allScanned = new Set();
for (const s of surfaces) for (const rel of s.scanned) allScanned.add(rel);

console.log(`  surfaces declared converted : ${surfaces.length}`);
console.log(`  files reached by the walk   : ${new Set(surfaces.flatMap((s) => s.reached)).size}`);
console.log(`  files scanned by A, B and D : ${allScanned.size}`);
console.log(`  excluded as converted spine : ${excludedSpine.size}`);
console.log(`  excluded as Phase 42        : ${excludedPhase42.size}`);
console.log(`  files walked under src/     : ${allSrcFiles.length}   (check C's scope)`);
console.log(`  lines blanked as JSX comments: ${jsxCommentLinesBlanked}   (DEF-41-02)`);

console.log(`\n  exemptions declared: ${EXEMPT_PATHS.length}`);
for (const [path, why] of EXEMPT_PATHS) {
  const applied = exemptionsApplied.has(path) ? 'applied' : 'not reached by any closure';
  console.log(`      ${path}  — ${applied}`);
  console.log(`         ${why}`);
}

if (excludedSpine.size > 0) {
  console.log('\n  spine excluded from A, B and D — converted by plans 41-03 and 41-04:');
  for (const rel of [...excludedSpine].sort()) console.log(`      ${rel}`);
}
if (excludedPhase42.size > 0) {
  console.log('\n  Phase 42 excluded by path — the door and the scanner are not this phase (§0 rule 7):');
  for (const [rel, glob] of [...excludedPhase42].sort()) console.log(`      ${rel}   (${glob})`);
}

console.log('\n  the surfaces, and what each reaches:\n');
for (const s of surfaces) {
  console.log(`      ${s.route}  [${s.width}]  — ${s.scanned.length} file(s) scanned`);
  for (const rel of s.scanned) console.log(`          ${rel}`);
}
console.log('');

const failures = [];

/* ────────────────────────────────────────────────────────────────────────────
 * check A — no raw palette utility
 * ──────────────────────────────────────────────────────────────────────────── */

const palettePattern = utilityPattern(PALETTE_NAMES, { scale: true });
const paletteHits = [];
const scrimsForgiven = [];

for (const s of surfaces) {
  for (const rel of s.scanned) {
    for (const hit of findUtilityHits(rel, palettePattern)) {
      if (isToleratedScrim(hit)) {
        scrimsForgiven.push({ ...hit, route: s.route });
        continue;
      }
      paletteHits.push({ ...hit, route: s.route });
    }
  }
}

console.log('  check A — raw palette utilities in a converted surface\'s closure:\n');
console.log(`      palette families matched : ${PALETTE_NAMES.length}`);
console.log(`      utility prefixes matched : ${COLOUR_UTILITY_PREFIXES.length}`);
console.log(`      translucent-black scrims tolerated : ${scrimsForgiven.length}`);
for (const scrim of scrimsForgiven) {
  const opacity = (scrim.rest.match(/^\/\d+/) ?? [''])[0];
  console.log(`          ${scrim.path}:${scrim.line}   ${scrim.match}${opacity}`);
}
console.log('');

if (paletteHits.length > 0) {
  failures.push('A');
  console.log(`  ✗ A  ${paletteHits.length} raw palette utilit(y/ies) reachable from a converted surface:\n`);
  for (const hit of paletteHits) {
    console.log(`       ${hit.path}:${hit.line}   ${hit.match}     (reached from ${hit.route})`);
    console.log(`         ${hit.source}`);
  }
  console.log(
    '\n       A converted surface reads the token layer; it does not name a palette. The\n' +
      '       translucent-black scrim is the one tolerated shape and is printed above. If a\n' +
      '       colour genuinely has no token, the answer is a token with its arithmetic — not\n' +
      '       a default scale name that no later change can find.\n'
  );
} else {
  console.log(
    `  ✓ A  no raw palette utility in ${allScanned.size} file(s) reachable from ` +
      `${surfaces.length} converted surface(s)\n`
  );
}

/* ────────────────────────────────────────────────────────────────────────────
 * check B — no legacy token utility
 * ──────────────────────────────────────────────────────────────────────────── */

const legacyPattern = utilityPattern(LEGACY_TOKEN_NAMES);
const legacyHits = [];

for (const s of surfaces) {
  for (const rel of s.scanned) {
    for (const hit of findUtilityHits(rel, legacyPattern)) legacyHits.push({ ...hit, route: s.route });
  }
}

console.log('  check B — legacy token utilities, ON CONVERTED SURFACES ONLY:\n');
console.log(`      legacy names matched : ${LEGACY_TOKEN_NAMES.length}`);
console.log(
  '      scope: this check reports on the declared surfaces and NOTHING ELSE. D-41-13\n' +
    '      empties these names of consumers one whole surface at a time, and removing the\n' +
    '      aliases from the token layer is a BONUS that must never become the schedule.\n'
);

if (legacyHits.length > 0) {
  failures.push('B');
  console.log(`  ✗ B  ${legacyHits.length} legacy token utilit(y/ies) on a converted surface:\n`);
  for (const hit of legacyHits) {
    console.log(`       ${hit.path}:${hit.line}   ${hit.match}     (reached from ${hit.route})`);
    console.log(`         ${hit.source}`);
  }
  console.log(
    '\n       These four are aliases in the token layer, so the rename changes no pixel. A\n' +
      '       surface declared converted has, by that declaration, finished reading them.\n'
  );
} else {
  console.log(
    `  ✓ B  no legacy token utility in ${allScanned.size} file(s) across ` +
      `${surfaces.length} converted surface(s)\n`
  );
}

/* ────────────────────────────────────────────────────────────────────────────
 * check C — every published primitive has an importer, per named export
 * ──────────────────────────────────────────────────────────────────────────── */

const importMapCache = new Map();

/**
 * `relPath`'s named imports, grouped by the file each specifier resolves to.
 *
 * Built once per file rather than once per (file, primitive) pair — with seven
 * published exports and 250-odd files the naive shape re-reads and re-resolves
 * the whole tree seven times.
 *
 * **A re-export is deliberately not an import here.** Check C asks whether
 * anything MOUNTS the primitive; a barrel that forwards the symbol answers a
 * different question, and answering it would let one unused barrel adopt every
 * orphan in the tree at once.
 */
function fileImportMap(relPath) {
  const cached = importMapCache.get(relPath);
  if (cached) return cached;

  const byTarget = new Map();
  const source = liveSource(relPath);
  NAMED_IMPORT_RE.lastIndex = 0;
  let m;
  while ((m = NAMED_IMPORT_RE.exec(source)) !== null) {
    const [, clause, spec] = m;
    if (!isLocalSpecifier(spec)) continue;
    const target = resolveSpecifier(spec, relPath);
    if (target === null) continue;
    const braces = clause.match(/\{([^}]*)\}/);
    if (!braces) continue;
    let symbols = byTarget.get(target);
    if (!symbols) {
      symbols = new Set();
      byTarget.set(target, symbols);
    }
    for (const raw of braces[1].split(',')) {
      const name = raw.trim().replace(/^type\s+/, '').split(/\s+as\s+/)[0].trim();
      if (name) symbols.add(name);
    }
  }

  importMapCache.set(relPath, byTarget);
  return byTarget;
}

/** The symbols `relPath` imports from `targetRel`, by resolved path. */
function importedSymbolsFrom(relPath, targetRel) {
  return fileImportMap(relPath).get(targetRel) ?? new Set();
}

const orphanDeclared = new Map(
  ORPHANS_DECLARED.map(([path, exportName, reason]) => [`${path}::${exportName}`, reason])
);
if (orphanDeclared.size !== ORPHANS_DECLARED.length) {
  refuse(
    'ORPHANS_DECLARED holds a duplicated path+export pair, so one of the two reasons is\n' +
      '       silently ignored. The measurement did not happen.'
  );
}

const importerCounts = [];
for (const [path, exportName] of PRIMITIVES) {
  const importers = [];
  for (const rel of allSrcFiles) {
    if (rel === path) continue;
    if (importedSymbolsFrom(rel, path).has(exportName)) importers.push(rel);
  }
  importerCounts.push({ path, exportName, importers });
}

const primitivesKeys = new Set(PRIMITIVES.map(([path, exportName]) => `${path}::${exportName}`));
const orphanEntriesUnknown = [...orphanDeclared.keys()].filter((key) => !primitivesKeys.has(key));

const orphansUndeclared = [];
const orphansForgiven = [];
const orphansStale = [];

for (const entry of importerCounts) {
  const key = `${entry.path}::${entry.exportName}`;
  if (entry.importers.length === 0) {
    if (orphanDeclared.has(key)) orphansForgiven.push({ ...entry, reason: orphanDeclared.get(key) });
    else orphansUndeclared.push(entry);
  } else if (orphanDeclared.has(key)) {
    orphansStale.push(entry);
  }
}

console.log('  check C — importers per published primitive, counted PER NAMED EXPORT:\n');
for (const { path, exportName, importers } of importerCounts) {
  const mark = importers.length === 0 ? '✗' : '·';
  console.log(`    ${mark}  ${String(importers.length).padStart(3)}  ${exportName}   (${path})`);
  for (const rel of importers) console.log(`              ${rel}`);
}
console.log('');

if (orphanEntriesUnknown.length > 0) {
  failures.push('C');
  console.log(`  ✗ C  ${orphanEntriesUnknown.length} ORPHANS_DECLARED entr(y/ies) name a symbol PRIMITIVES does not publish:\n`);
  for (const key of orphanEntriesUnknown) console.log(`       ${key.split('::').join('  ->  ')}`);
  console.log(
    '\n       A forgiveness for something nobody declared forgives an unknown amount. If the\n' +
      '       primitive was renamed or removed, its ORPHANS_DECLARED line goes with it, in the\n' +
      '       same commit.\n'
  );
}

if (orphansUndeclared.length > 0) {
  if (!failures.includes('C')) failures.push('C');
  console.log(`  ✗ C  ${orphansUndeclared.length} published primitive(s) have ZERO importers and are not declared:\n`);
  for (const { path, exportName } of orphansUndeclared) {
    console.log(`       ${exportName}   (${path})`);
  }
  console.log(
    '\n       This repository already records the failure rather than imagining it:\n' +
      '       src/components/ui/Skeleton.tsx is correct, complete and has ZERO importers,\n' +
      '       while 102 hand-rolled placeholder blocks live in 20 files. D-41-04 exists\n' +
      '       because of that file: NO PLAN SHIPS A PRIMITIVE WITHOUT CONVERTING A SURFACE\n' +
      '       ONTO IT IN THE SAME PLAN. Either give it a consumer, or take it out of\n' +
      '       PRIMITIVES — a list of claims is how a gate becomes a rubber stamp.\n'
  );
}

if (!failures.includes('C')) {
  const adopted = importerCounts.length - orphansForgiven.length;
  console.log(
    `  ✓ C  ${adopted} of ${importerCounts.length} published export(s) have at least one importer, ` +
      `and every\n       orphan is declared\n`
  );
}

if (orphansForgiven.length > 0) {
  console.log(`  ! C  ${orphansForgiven.length} published primitive(s) are ORPHANED, declared, and still owed:\n`);
  for (const { path, exportName, reason } of orphansForgiven) {
    console.log(`       ${exportName}   (${path})`);
    console.log(`         ${reason.replace(/(.{86}) /g, '$1\n         ')}`);
  }
  console.log(
    '\n       Not a failure, and not an exemption either: it is a DEBT WITH A NUMBER ON IT,\n' +
      '       printed on every run, which can only go down. The alternative was a gate that\n' +
      '       ships red — and a gate that ships red is switched off before it has guarded\n' +
      '       anything (§0 rule 3). Read this number, not the tick.\n'
  );
}

if (orphansStale.length > 0) {
  console.log(`  ! C  ${orphansStale.length} ORPHANS_DECLARED entr(y/ies) are STALE — the primitive now has an importer:\n`);
  for (const { path, exportName, importers } of orphansStale) {
    console.log(`       ${exportName}   (${path}) — ${importers.length} importer(s)  → adopted; remove this entry`);
  }
  console.log(
    '\n       Not a failure: the tree is correct. Printed anyway, because a debt left recorded\n' +
      '       after it is paid is a gate quietly loosened — it would permit re-orphaning\n' +
      '       exactly what was just adopted.\n'
  );
}

/* ────────────────────────────────────────────────────────────────────────────
 * check D — the container. This is G4.
 * ──────────────────────────────────────────────────────────────────────────── */

const MAX_WIDTH_RE = /(?<![a-zA-Z0-9-])max-w-[a-z0-9[\]./-]+/g;

const shellMaxima = new Set();
liveLines(SHELL_FILE).forEach((line) => {
  MAX_WIDTH_RE.lastIndex = 0;
  let m;
  while ((m = MAX_WIDTH_RE.exec(line)) !== null) shellMaxima.add(m[0]);
});

const maximaMissing = DECLARED_MAXIMA.filter((name) => !shellMaxima.has(name));
const maximaExtra = [...shellMaxima].filter((name) => !DECLARED_MAXIMA.includes(name));

const pagesWithoutShell = [];
const pagesWithOwnMaximum = [];
const widthDisagreements = [];

for (const s of surfaces) {
  const importsShell = importedSymbolsFrom(s.pageFile, SHELL_FILE).has('PageShell');
  if (!importsShell) pagesWithoutShell.push(s);

  liveLines(s.pageFile).forEach((line, i) => {
    MAX_WIDTH_RE.lastIndex = 0;
    let m;
    while ((m = MAX_WIDTH_RE.exec(line)) !== null) {
      pagesWithOwnMaximum.push({ route: s.route, path: s.pageFile, line: i + 1, match: m[0], source: line.trim() });
    }
  });

  const expected = expectedWidth(s.route);
  if (expected !== s.width) widthDisagreements.push({ route: s.route, declared: s.width, expected });
}

console.log('  check D — the container (G4):\n');
console.log(`      maxima the shell declares : ${[...shellMaxima].sort().join(' · ') || '(none)'}`);
console.log(`      §4 wide list  : ${WIDE_ROUTES.length} route(s), closed`);
console.log(`      §4 focus list : ${FOCUS_ROUTES.length} route(s), closed`);
console.log(`      surfaces whose width was compared against §4 : ${surfaces.length}\n`);

if (maximaMissing.length > 0 || maximaExtra.length > 0) {
  failures.push('D');
  if (maximaMissing.length > 0) {
    console.log(`  ✗ D  ${SHELL_FILE} does not declare ${maximaMissing.length} of §4's three maxima:\n`);
    for (const name of maximaMissing) console.log(`       ${name}`);
    console.log('');
  }
  if (maximaExtra.length > 0) {
    console.log(`  ✗ D  ${SHELL_FILE} declares ${maximaExtra.length} maximum(s) §4 does not have:\n`);
    for (const name of maximaExtra) console.log(`       ${name}`);
    console.log(
      '\n       A fourth maximum is a fourth tier, and §4 has three. Adding one is a decision\n' +
        '       that edits the contract first, not a class added to the shell.\n'
    );
  }
}

if (pagesWithoutShell.length > 0) {
  if (!failures.includes('D')) failures.push('D');
  console.log(`  ✗ D  ${pagesWithoutShell.length} converted page(s) do not import the shell:\n`);
  for (const s of pagesWithoutShell) console.log(`       ${s.route}   ${s.pageFile}`);
  console.log('');
}

if (pagesWithOwnMaximum.length > 0) {
  if (!failures.includes('D')) failures.push('D');
  console.log(`  ✗ D  ${pagesWithOwnMaximum.length} maximum(s) written on a converted page itself:\n`);
  for (const hit of pagesWithOwnMaximum) {
    console.log(`       ${hit.path}:${hit.line}   ${hit.match}     (${hit.route})`);
    console.log(`         ${hit.source}`);
  }
  console.log(
    '\n       D-41-06: the maximum is owned by the shell and never by a page. A page writing\n' +
      '       its own has taken the width back, and the contract then holds in one file and\n' +
      '       not in the tree.\n'
  );
}

if (widthDisagreements.length > 0) {
  if (!failures.includes('D')) failures.push('D');
  console.log(`  ✗ D  ${widthDisagreements.length} width(s) disagree with §4's closed lists:\n`);
  for (const { route, declared, expected } of widthDisagreements) {
    const list = expected === 'default' ? 'neither closed list' : `§4's ${expected} list`;
    console.log(`       ${route} — the manifest records "${declared}", ${list} makes it "${expected}"`);
  }
  console.log(
    '\n       Those lists are edited by decision, so this is not a typo to correct quietly:\n' +
      '       one of the two is wrong, and which one is a question for a person.\n'
  );
}

if (!failures.includes('D')) {
  console.log(
    `  ✓ D  the shell declares §4's three maxima and only those; all ${surfaces.length} converted\n` +
      '       page(s) import it, write no maximum of their own, and carry the width §4 assigns\n'
  );
}

/* ── verdict ──────────────────────────────────────────────────────────────── */

console.log('');
if (failures.length === 0) {
  console.log(
    `  CONVERSION_OK — all four checks passed over ${surfaces.length} declared surface(s), ` +
      `${allScanned.size} file(s) scanned.`
  );
  console.log(
    '\n  Read the header before treating this as safety. It proves that NO UNCONVERTED FILE\n' +
      '  IS REACHABLE from a declared surface. It does NOT prove the conversion is right: it\n' +
      '  is blind to an inline hex, to a class built by concatenation, and to an ugly layout.\n' +
      '  Check D says a maximum is declared and that the page did not override it — NOT that\n' +
      '  the chosen width is right, which is UI-SPEC Open Question 2. H41-1, every converted\n' +
      '  surface observed at three widths by a person, is the only thing that says a surface\n' +
      '  is workable, and it is a human’s.\n'
  );
  process.exit(0);
}
console.log(`  CONVERSION_FAIL — ${failures.length} check(s) failed: ${failures.join(', ')}\n`);
process.exit(1);
