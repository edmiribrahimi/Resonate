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
 * This is **G1 (checks A, B, C) and G4 (checks D and E) in one script**, over one
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
 *   - CHECK E COMPARES A **DECLARED WIDTH** AGAINST A **MOUNTED NAVIGATION**,
 *     and says nothing whatever about whether a card is centred. It reads a
 *     class string and an import graph; it renders nothing, measures no pixel
 *     and opens no viewport. **H41-1 and `41-CR01-PASS.md` are the only things
 *     that say any of the four focus surfaces looks right**, and both are owed
 *     and unmade. A green on E means the two declarations agree with each
 *     other — not that either of them is what a person would want to see.
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
 * ── THE FIVE CHECKS ─────────────────────────────────────────────────────────
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
 *   E. **The clearance against the mount** — also G4, and the check CR-01 did
 *      not have. Check D was green on all four broken surfaces throughout,
 *      because a maximum-width matcher cannot see a form reserving room for a
 *      navigation its surfaces do not mount. Two parts:
 *
 *        E1. The shell's focus root — read by the name it is declared under,
 *            not by guessing at a branch — reserves NEITHER navigation
 *            property, still declares a height and a centring, and the shell
 *            **still reads both properties elsewhere**. The clearance left one
 *            form; it did not leave the primitive, and a check that could not
 *            tell those apart would go green on a shell that had dropped it for
 *            the twelve wide routes as well.
 *
 *        E2. For every converted surface, `width === "focus"` **if and only
 *            if** no navigation module is reachable — from the page's own
 *            closure OR from any ancestor layout's. It is a two-way assertion
 *            and not a prohibition: a navigation-free surface at another width
 *            reserves a column that is not there, and a focus surface that
 *            mounts navigation sits under its own bar. When 41.1 or 41.2 first
 *            declares the former, this check goes red, and THAT RED IS CORRECT
 *            — it is when `PageShell` gets the `nav` prop plan 41-13
 *            deliberately did not write, with its first consumer in the same
 *            commit (D-41-04).
 *
 *      **Why E2 climbs, and the three files it would otherwise redden.** A
 *      layout is not imported by the pages it wraps, so a closure-only check
 *      calls `/admin/formats`, `/admin/members` and `/admin/members/register`
 *      navigation-free — all three correct, all three getting their `AppNav`
 *      from `src/app/(admin)/admin/(work)/layout.tsx`. A gate that reddens a
 *      correct file is switched off (§0 rule 3), so the walk climbs the route
 *      segments to `src/app` and enumerates the layouts it finds, refusing on
 *      any `layout.*` basename carrying an extension it does not test.
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
 *   0  all five checks passed
 *   1  at least one failed — each is printed with its file, its line and the
 *      exact thing found
 *   2  nothing was measured: the manifest is missing, unimportable, empty or
 *      inconsistent; a declared page file is not on disk or is not under
 *      `src/app`; a surface's closure is empty; a local specifier could not be
 *      resolved; the shell is missing; a declared navigation module is not on
 *      disk; a `layout.*` file carries an extension the walk does not test; the
 *      shell's focus root declaration is not the one accepted form; or the focus
 *      BRANCH's frozen window cannot be read — no opener, two openers, a file
 *      shorter than the window, the single `className={FOCUS_ROOT}` sitting
 *      outside the window, or the frozen shape itself carrying a navigation
 *      property. **No verdict is implied by a 2.**
 *
 *      Every exit-2 message in check E's read carries one of two markers on its
 *      first line, and they mean different things to whoever meets a red suite:
 *      `SHAPE CHANGED` says a person changed the focus branch or its declaration
 *      and the frozen expectation in this file has to be updated with it;
 *      `GATE CANNOT READ` says this gate is broken or blindfolded and nothing it
 *      would print about the branch could be trusted.
 *
 * A run that BOTH failed a check and then hit a refusal exits **1**, not 2, and
 * prints the FATAL and the failure. A refusal means a measurement did not
 * happen; it does not unsay one that did, and reporting such a run as REFUSED
 * made the aggregate print "Nothing failed" over a run in which something had
 * (41-GAP-REVIEW.md WR-01).
 *
 * **Whether that rule can fire on THIS tree is a measurement, not an assertion,
 * and the measurement says no.** Taken 2026-08-13, with the command that takes
 * each number, because these move whenever a line is added above them:
 *
 *   - `grep -nE '^[[:space:]]*failures\.push\(' | head -1` → the first is at
 *     line **1724**. Nothing below it has run when an earlier refusal is
 *     raised, so `failures` is empty at every call site above it. (Both greps
 *     are anchored to the line start on purpose: the unanchored forms match
 *     this paragraph, and a number measured by a command that reads the
 *     sentence claiming it is not a measurement.)
 *   - `grep -nE '^[[:space:]]*refuse\(' ` → **24** call sites. **23** are above
 *     1724. Exactly **one** is below it, at line **1839**: the
 *     `ORPHANS_DECLARED` duplicate check, the only refusal that structurally
 *     cannot be hoisted, because it needs check C's data.
 *   - that one compares `orphanDeclared.size` with `ORPHANS_DECLARED.length`,
 *     and `ORPHANS_DECLARED` (line **1042**) is `[]` — so the comparison is 0
 *     against 0, **false on every run, for any tree**, until the list is
 *     populated.
 *
 * Therefore **no refusal in this file can fire after a failure on this tree
 * today**. The rule above is written for the shape that becomes reachable when
 * 41.1 or 41.2 first puts an entry on that list; it is not a description of
 * what this tree does, and it was carrying the opposite claim until
 * 41-GAP-REVIEW-2.md WR-02 did the arithmetic.
 *
 * The mechanism is not taken on trust either — it is re-proven by a run, not by
 * a citation. Exercised by mutation in plan 41-20 (trigger B) and again in plan
 * 41-25, both times with a duplicated pair on `ORPHANS_DECLARED` plus a
 * script-only lever reddening check A: FATAL first, then
 * `CONVERSION_FAIL — 1 check(s) had ALREADY failed`, exit **1**.
 * `41-25-SUMMARY.md` carries the run verbatim.
 *
 * **What the next reader should do, and what they must not.** Re-measure the
 * three numbers before believing this paragraph; if the list is still `[]`,
 * this paragraph is still the truth and the sentence above it is still not.
 * Do **not** manufacture a reachable refusal so the rule reads as live:
 * building a gate to support a claim is the same defect family as the claim
 * itself. And do **not** hoist the `ORPHANS_DECLARED` refusal to tidy the count
 * — 41-20 deliberately left it where it is (41-20-SUMMARY.md, decision 1), and
 * hoisting *every* refusal above *every* failure would leave `refuse()`'s
 * exit-1 branch with no site at all: a rule nothing can trip, which is the
 * defect on the other side of this same coin.
 */

import { readdirSync, readFileSync, existsSync, lstatSync } from 'node:fs';
import { dirname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SRC_DIR = `${ROOT}/src`;

const SCANNED_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs'];
const SKIP_DIRS = new Set(['node_modules', '.next', '.git']);

/**
 * The letters of the checks that have already failed.
 *
 * Declared **here**, above `refuse()`, rather than beside check A where it is
 * filled: `refuse()` reads it, and a `const` referenced before its declaration
 * throws a `ReferenceError` — which this file's own header says a gate must
 * never emit, because a broken gate is indistinguishable from a finding.
 */
const failures = [];

/**
 * A refusal is not a failure: it means the measurement did not happen.
 *
 * **But a refusal must not absorb a failure that already did.** Every refusal
 * in this file is now raised before any verdict prints, so `failures` is empty
 * at almost every call site. Almost: the `ORPHANS_DECLARED` duplicate refusal
 * is the one call site that sits BELOW the first `failures.push` — but its
 * condition is `0 !== 0` while that list is empty, so it is a site the rule
 * has, not a case the rule reaches. **The exit-code header carries the
 * measurement; read it before repeating that this branch is live.**
 * Measured before this change (41-GAP-REVIEW.md WR-01, reproduced with
 * two script-only levers): `✗ A` printed, then the FATAL, then **exit 2** — so
 * `verify-all.mjs` reported the run REFUSED and printed "Nothing failed" over a
 * run in which check A had failed on three files.
 *
 * So when something was measured and was wrong, this exits **1** and says both
 * things. The FATAL line is still printed first and unchanged, so a refusal is
 * still legible as a refusal; what changes is which verdict the run carries to
 * the aggregate. A measurement that happened outranks one that did not.
 */
function refuse(message) {
  console.log(`\nFATAL: ${message}\n`);

  if (failures.length > 0) {
    console.log(
      `  CONVERSION_FAIL — ${failures.length} check(s) had ALREADY failed when the refusal above\n` +
        `  was raised: ${failures.join(', ')}. This run exits 1, not 2.\n\n` +
        '  A refusal means a measurement did not happen; it does not unsay one that did. Exiting\n' +
        '  2 here would report the whole run as REFUSED, and the aggregate would then print\n' +
        '  "Nothing failed" over a run in which something did — a failure with a neutral face,\n' +
        '  which is the shape meta-gates.md names. Both are above: read the FATAL for what could\n' +
        '  not be measured, and the ✗ line(s) for what was measured and is wrong.\n'
    );
    process.exit(1);
  }

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

/**
 * Every file under `dir`, whatever its extension.
 *
 * The empty string is an extension every basename ends with, so this is the
 * same walk — same skipped directories, same symlink refusal — with the filter
 * opened. It exists for the layout enumeration, whose whole purpose is to find
 * a `layout.*` the extension list would have skipped: filtering that walk by
 * the list it is checking against would make it agree with itself.
 */
function listEveryFile(dir) {
  return listScannableFiles(dir, ['']);
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
 * The two modules through which a navigation reaches a surface — check E2.
 *
 * They are two rather than one, and the reason is measured rather than
 * stylistic: `AppNav` carries **both tiers** — the bar below 768px and the
 * leading column at and above it — while `MobileNav` is the thin wrapper that
 * renders `AppNav` locked to its phone form, so the door keeps today's layout
 * (D-41-21). **Either one reachable is navigation mounted**, and a check that
 * knew only the first would call the door navigation-free.
 *
 * **A path here that is not on disk REFUSES.** A stale entry does not report
 * "no navigation found on any surface" as a red — it reports it as agreement,
 * because the four focus surfaces would then match a check that had stopped
 * looking, and the other four would fail for a reason that is not theirs. That
 * is the direction that prints a tick, and this file does not take it.
 */
export const NAV_MODULES = [
  ['src/components/layout/AppNav.tsx', 'both tiers — the bar below 768px, the leading column at and above it'],
  ['src/components/layout/MobileNav.tsx', 'the wrapper that renders AppNav locked to its phone form (D-41-21)'],
];

const NAV_MODULE_PATHS = NAV_MODULES.map(([path]) => path);

/**
 * The identifier the shell declares its focus root under — check E1 reads the
 * literal BY THIS NAME.
 *
 * A marker beats a heuristic: it forces the author to say so, and it is
 * greppable. That is the same choice §13's exemption 4 already makes, and it is
 * why plan 41-13 hoisted the string out of the JSX instead of leaving check E
 * to recognise a branch by its shape.
 */
export const FOCUS_ROOT_IDENTIFIER = 'FOCUS_ROOT';

/**
 * §3.2's two navigation custom properties, **by name**.
 *
 * Named, never spelled as the arbitrary-value utilities that read them: per
 * DEF-41-01 a whole utility written in this file is a live Tailwind candidate
 * and would ship a dead rule. A bare custom-property name is not a candidate;
 * the utility that wraps it is. `PageShell.tsx`'s own docblock states the same
 * rule, for the same reason, about the same two names.
 */
const NAV_PROPERTIES = ['--nav-inset-inline-start', '--nav-inset-block-end'];

/**
 * The route root, every basename Next WRAPS a page with, and the four
 * extensions it resolves one at.
 *
 * **Why a list and not `layout.` alone.** Next renders `template.tsx` around a
 * page in the same position a layout occupies. Until this list existed, that
 * basename was neither climbed nor refused on, so a `src/app/(auth)/template.tsx`
 * mounting a navigation left all four focus surfaces reported navigation-free,
 * E2 found agreement, and the tick printed (41-GAP-REVIEW.md WR-05 — reproduced
 * on the shipped gate before this edit: exit 0, `✓ E`, and `/login`,
 * `/register`, `/set-password` all in the `none` column). A hole in the very
 * enumeration check E depends on.
 *
 * Searching MORE wrappers can only make this gate more likely to FIND a
 * navigation, never less — the same argument `ancestorLayoutFiles` already made
 * for collecting both extensions when one directory carries two.
 *
 * ── `default.` is excluded, and this is the decision, not an omission ────────
 *
 * A `default.tsx` is a **parallel-route slot fallback**, not a wrapper around
 * the page: it is what Next renders INTO a named slot when that slot has no
 * match for the current URL. Climbing it would let a sibling slot's imports be
 * counted as a navigation mounted over a surface that never renders it — a red
 * on a correct file, which is the worse of the two failure directions (D-41-19,
 * and §0 rule 3: a gate that goes red on correct code gets switched off).
 *
 * **Revisit condition, named so it is checkable rather than remembered: the
 * first parallel route in this tree** — the first `@slot/` directory under
 * `src/app`, at which point a `default.*` becomes reachable and this exclusion
 * is re-argued in the same commit that introduces it. Measured 2026-08-12:
 * `find src/app -name "default.*"` returns nothing, and no `@`-prefixed
 * directory exists, so the exclusion costs nothing today.
 *
 * The extension list carries the same rule it always did: the enumeration
 * refuses on any wrapper basename carrying a fifth extension that could
 * plausibly be a route module. A walk that silently skips a wrapper is a
 * narrowing in the direction that prints a tick — the same rule this file
 * already applies to an unresolved specifier, and the reason the enumeration
 * reads EVERY file under the route root rather than only the ones the scanner's
 * extension list admits.
 */
const APP_DIR_REL = 'src/app';
const WRAPPER_BASENAMES = ['layout.', 'template.'];
const WRAPPER_EXTENSIONS = ['.tsx', '.ts', '.jsx', '.js'];

/**
 * Extensions at which Next could never resolve a route file, with the reason
 * each is not one. A wrapper-named file carrying one of these is **skipped**,
 * not refused on.
 *
 * `src/app/layout.module.css` is the standard Next name for a layout's CSS
 * module; `layout.tsx.orig` is what a merge conflict leaves behind. Both are
 * CORRECT files, and until this list existed either took the whole conversion
 * gate to exit 2 — which through `verify-all.mjs` is `VERIFY_REFUSED` for the
 * entire suite (41-GAP-REVIEW.md WR-06). Measured before this edit, with one
 * `src/app/layout.module.css` holding a single CSS comment: **exit 2**, FATAL
 * naming it, nothing measured. §0 rule 3, quoted three times in this file
 * family: a gate that goes red on correct code gets switched off.
 *
 * **Narrowing the refusal to "not a stylesheet" must not become narrowing it to
 * "nothing."** This is a closed allow-list of extensions that CANNOT be a route
 * module, never a heuristic about what looks like one: an extension in neither
 * list still refuses, because an unknown extension is exactly the case the
 * refusal was written for. Proven in that direction too — `src/app/layout.mts`
 * refuses, and a fix that stopped it from refusing would be a hole dressed as a
 * fix.
 *
 * **`.mdx` is deliberately absent.** Next resolves route files at it whenever
 * `pageExtensions` says so, which makes it plausibly a module. It refuses, and
 * that is the safe direction.
 *
 * **The trailing tilde, added in round 3, and the analysis that justifies it.**
 * `.orig`, `.rej` and `.bak` covered the merge-conflict and manual-copy
 * artefacts; the tilde form — what emacs, gedit and some JetBrains
 * configurations write beside the file being edited — was not on the list, so
 * one stray `layout.tsx~` took the conversion gate to exit 2 and, through
 * `verify-all.mjs`, reported all sixteen gates as `VERIFY_REFUSED`
 * (41-GAP-REVIEW-2.md WR-04; reproduced on the shipped gate before this edit —
 * exit 2, FATAL naming the file). It is WR-06's exact shape, reintroduced by an
 * incomplete allow-list.
 *
 * Every entry here makes the gate SKIP something, and every skip is somewhere a
 * real wrapper could hide, so the false-positive analysis belongs beside the
 * entry rather than in a document: **what this entry matches is any path under
 * the route root whose basename starts with a climbed wrapper prefix AND ends
 * with a tilde. Next resolves no route file at a name ending in `~` under any
 * `pageExtensions`, so no legitimate wrapper can be skipped by it.** The entry
 * is not a dotted extension, and needs no new mechanism: the enumeration below
 * matches with `rel.endsWith(ext)`, which already handles a bare suffix.
 *
 * **`layout.json` is NOT added, and that is a decision rather than an
 * oversight.** The review names it as refusing for the same reason, and it
 * does; it sits outside the six items this round was scoped to, so it is
 * recorded in `41-25-SUMMARY.md` as named and deliberately not taken — the same
 * treatment 41-20 gave the `MIN_HEIGHT_RE` weakness it left open. Until it is
 * taken, `src/app/layout.json` refuses, which is the safe direction.
 */
const NON_ROUTE_WRAPPER_EXTENSIONS = [
  ['.css', 'a stylesheet — layout.module.css is the standard Next name for a layout CSS module'],
  ['.scss', 'a stylesheet'],
  ['.sass', 'a stylesheet'],
  ['.less', 'a stylesheet'],
  ['.md', 'documentation — Next resolves no route file at .md'],
  ['.orig', 'what a merge conflict leaves behind'],
  ['.rej', 'what a rejected patch hunk leaves behind'],
  ['.bak', 'a backup copy'],
  ['~', 'an editor backup — the trailing-tilde form of .bak; Next resolves no route file at it'],
];

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

for (const [path, why] of NAV_MODULES) {
  if (!existsSync(`${ROOT}/${path}`)) {
    refuse(
      `NAV_MODULES names ${path}\n` +
        `       — ${why} —\n` +
        '       which is not on disk. Check E asks of every surface whether it mounts a\n' +
        '       navigation, and a module path this gate cannot find makes EVERY surface look\n' +
        '       navigation-free: the four focus surfaces would then AGREE with a check that\n' +
        '       had stopped looking, and a green there would be the worst of the three\n' +
        '       outcomes. If a navigation module genuinely moved, NAV_MODULES moves with it in\n' +
        '       the same commit. Nothing was measured.'
    );
  }
}

if (!existsSync(`${ROOT}/${APP_DIR_REL}`)) {
  refuse(`${APP_DIR_REL} does not exist, so check E has no route tree to climb. Nothing was measured.`);
}

/*
 * Every file under the route root whose basename begins with one of the wrapper
 * prefixes, whatever its extension — deliberately not filtered by the scanner's
 * extension list, since the whole point is to find the one the walk would not
 * have tested.
 */
const wrapperFilesUnderApp = listEveryFile(`${ROOT}/${APP_DIR_REL}`).filter((rel) =>
  WRAPPER_BASENAMES.some((base) => rel.split('/').pop().startsWith(base))
);

const wrappersWithUnknownExtension = wrapperFilesUnderApp.filter(
  (rel) => !WRAPPER_EXTENSIONS.some((ext) => rel.endsWith(ext))
);

/*
 * The refusal is reserved for an extension that could plausibly be a route
 * module. Everything on NON_ROUTE_WRAPPER_EXTENSIONS is skipped instead — and
 * printed under the wrapper list with the reason, so a green states what it
 * passed over rather than going quiet about it.
 */
const skippedWrappers = [];
const wrappersWithUntestedExtension = [];
for (const rel of wrappersWithUnknownExtension) {
  const known = NON_ROUTE_WRAPPER_EXTENSIONS.find(([ext]) => rel.endsWith(ext));
  if (known) skippedWrappers.push({ rel, why: known[1] });
  else wrappersWithUntestedExtension.push(rel);
}

if (wrappersWithUntestedExtension.length > 0) {
  refuse(
    `${wrappersWithUntestedExtension.length} file(s) under ${APP_DIR_REL} are named as a wrapper\n` +
      `       (${WRAPPER_BASENAMES.join(', ')}) but carry an extension check E's ancestor walk does\n` +
      `       not test (${WRAPPER_EXTENSIONS.join(', ')}), and which is not on the list of\n` +
      `       extensions Next could never resolve a route file at\n` +
      `       (${NON_ROUTE_WRAPPER_EXTENSIONS.map(([ext]) => ext).join(', ')}):\n\n       ` +
      wrappersWithUntestedExtension.join('\n       ') +
      '\n\n       A wrapper is where three of the eight declared surfaces get their navigation, and\n' +
      '       a walk that skips one reports those surfaces as navigation-free — which is a\n' +
      '       narrowing in the direction that prints a tick. Either the extension joins\n' +
      '       WRAPPER_EXTENSIONS in the same commit and is climbed, or — if Next could never\n' +
      '       resolve a route file at it — it joins NON_ROUTE_WRAPPER_EXTENSIONS carrying the\n' +
      '       reason it is not one. Otherwise the file is not a wrapper and should not be named\n' +
      '       like one. Nothing was measured.'
  );
}

for (const [route, pageFile] of CONVERTED) {
  if (!pageFile.startsWith(`${APP_DIR_REL}/`)) {
    refuse(
      `CONVERTED names ${route} at ${pageFile}, which is not under ${APP_DIR_REL}. Check E climbs\n` +
        '       from a page file to the route root to find the layouts that wrap it; a page file\n' +
        '       outside that tree makes the climb find NOTHING and report the surface as\n' +
        '       navigation-free, whatever it actually mounts. Nothing was measured.'
    );
  }
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

/* ── check E's measurement, taken here so its refusals precede every tick ────
 *
 * **E1's read honours that sentence from this change, and did not before it.**
 * Until now only E2's refusals sat here; E1's three — no declaration, two
 * declarations, not a single closed literal — sat with E1's *comparisons*,
 * below check D's verdict. Measured consequence (41-GAP-REVIEW.md WR-01,
 * reproduced on the shipped gate before this edit): renaming the constant
 * printed `✓ A`, `✓ B`, `✓ C`, `✓ D` and only then the FATAL, exit 2. Had any
 * of those four been a `✗`, the aggregate would have called the whole run
 * REFUSED and printed "Nothing failed" over a run in which something did.
 *
 * So E1's read is part of the same measurement as E2's, taken at the same
 * point, and only the comparisons are left below. What is hoisted is the read
 * and nothing else: the assertions still live beside their report, where a
 * reader expects them.
 */

/* ── E1's read: the shell's focus root, and the branch that renders it ────── */

const FOCUS_ROOT_DECL_RE = new RegExp(`\\b(?:const|let|var)\\s+${FOCUS_ROOT_IDENTIFIER}\\b`);

/**
 * The literal, required to close on the same line — and tolerant of a trailing
 * comment after it, in either syntax.
 *
 * A focus root spread over several lines, or built by concatenation, is not a
 * thing this gate can read — and reading half of it would assert the absence of
 * a property from a fragment, which is exactly how a check goes green on a
 * defect it never saw. So that is a refusal and not a pass. **That requirement
 * is unchanged**: the closing quote still has to be on the same line as the
 * opening one, and a declaration whose literal continues onto the next line
 * still refuses.
 *
 * What changed is the tail. `liveLines` blanks a line that STARTS with `//`,
 * never one that ends with it, so `const FOCUS_ROOT = "…"; // …` — an ordinary
 * and entirely correct line — hit the end-of-line anchor and took the whole
 * conversion gate to exit 2, and through `verify-all.mjs` the whole suite to
 * `VERIFY_REFUSED` (41-GAP-REVIEW.md WR-06 half 2; measured before this edit:
 * exit 2, FATAL quoting the line verbatim). §0 rule 3: a gate that goes red on
 * correct code gets switched off.
 *
 * **Round 3 added the block form, and it is the SAME argument, not a second
 * one.** Fixing the `//` form and leaving the block form left the rule
 * half-applied, one comment syntax away from where it had just been fixed: the
 * identical declaration carrying a trailing block comment still took the gate
 * to exit 2 and, through `verify-all.mjs`, the whole suite to `VERIFY_REFUSED`
 * (41-GAP-REVIEW-2.md WR-03; reproduced on the shipped gate before this edit —
 * exit 2, FATAL quoting the line verbatim). The tail now accepts either opener,
 * and accepts a block comment that does NOT close on the line, because once the
 * value has been captured between its two quotes nothing that follows on that
 * line can change it.
 *
 * **Why the anchor was relaxed rather than the comment stripped — one or the
 * other, not both, and this is the third syntax that one argument covers.** A
 * stripper would be a second transformation of the line, running before the
 * regex and needing its own notion of where a comment begins; a `//` or a `/*`
 * INSIDE the double-quoted literal would be indistinguishable from one after
 * it, and truncating there would hand the regex a fragment and change the value
 * read. That is the exact failure the refusal below exists to prevent, and this
 * file family already records two incomplete strippers — DEF-41-02 and
 * DEF-41-06 — so a fourth would be the pattern rather than the exception. The
 * tail here cannot do that: the capture group is still bounded by the same two
 * quotes, so **the literal read is byte-for-byte the literal, comment or no
 * comment** — asserted by comparing the value the report prints with and
 * without one, and again for a literal whose own contents open a block comment.
 *
 * **What the widened tail hits, so it can be checked rather than trusted.** It
 * hits only what follows the literal's CLOSING quote, past an optional
 * semicolon and whitespace: a `//` to end of line, or a `/*` to end of line.
 * Nothing before that quote. So a concatenation, a literal continuing onto the
 * next line, a single-quoted literal and a backtick literal all still refuse,
 * and each was exercised in that direction — narrowing a refusal to "not this"
 * must not become narrowing it to "nothing". No correct declaration is caught
 * by the widening: it only stops catching correct ones.
 */
const FOCUS_ROOT_LITERAL_RE = /=\s*"((?:[^"\\]|\\.)*)"\s*;?\s*(?:\/\/.*|\/\*[\s\S]*)?$/;

const shellLines = liveLines(SHELL_FILE);
const focusRootDeclarations = [];
shellLines.forEach((line, i) => {
  if (FOCUS_ROOT_DECL_RE.test(line)) focusRootDeclarations.push({ lineNo: i + 1, text: line });
});

if (focusRootDeclarations.length === 0) {
  refuse(
    `${SHELL_FILE} declares no ${FOCUS_ROOT_IDENTIFIER}, so check E has nothing to read.\n` +
      '       The focus form is the one CR-01 broke, and this gate reads it by the name it is\n' +
      '       declared under rather than by recognising a branch — a marker beats a heuristic,\n' +
      '       and a heuristic that finds nothing is indistinguishable from a form that reserves\n' +
      '       nothing. If the constant was renamed, FOCUS_ROOT_IDENTIFIER is renamed with it in\n' +
      '       the same commit. Nothing was measured.'
  );
}

if (focusRootDeclarations.length > 1) {
  refuse(
    `${SHELL_FILE} declares ${FOCUS_ROOT_IDENTIFIER} ${focusRootDeclarations.length} times, at line(s) ` +
      `${focusRootDeclarations.map((d) => d.lineNo).join(', ')}.\n` +
      '       Check E would then assert against whichever one it read first, while the shell\n' +
      '       rendered the other. Nothing was measured.'
  );
}

const focusRootLineNo = focusRootDeclarations[0].lineNo;
const focusRootLiteralMatch = focusRootDeclarations[0].text.match(FOCUS_ROOT_LITERAL_RE);

if (!focusRootLiteralMatch) {
  refuse(
    `${SHELL_FILE}:${focusRootLineNo} declares ${FOCUS_ROOT_IDENTIFIER}, but not as a double-quoted\n` +
      '       literal closing on that line, so check E cannot read the whole of it. Asserting\n' +
      '       that a navigation property is absent from a FRAGMENT of the focus root is how a\n' +
      '       check goes green on a defect it never saw, and CR-01 is precisely a defect that\n' +
      '       four green checks never saw. Line, verbatim:\n\n       ' +
      focusRootDeclarations[0].text.trim() +
      '\n\n       Nothing was measured.'
  );
}

const focusRoot = focusRootLiteralMatch[1];

/**
 * The branch that RENDERS, asserted against the constant that was READ.
 *
 * **Why this is not redundant with the three assertions below, in one sentence:
 * this round's verifier appended CR-01 to the render site, left `FOCUS_ROOT`
 * byte-identical, and the reintroduced line was counted TOWARD assertion 3
 * ("the shell still reads both properties elsewhere") — so the defect fed the
 * check meant to catch it, and check E printed its tick over 248px of leading
 * padding against 24px trailing (GAP-CR-02).** A reader who trims this as
 * duplicated work reopens exactly that.
 *
 * The pattern is built from `FOCUS_ROOT_IDENTIFIER` — the same marker the
 * declaration scan above uses — so the two cannot drift apart: rename the
 * constant and both stop finding it, rather than one of them silently
 * continuing to pass.
 *
 * `shellLines` is comment-stripped, so a documented example of the correct form
 * cannot satisfy this.
 */
const FOCUS_BRANCH_RE = new RegExp(`className=\\{${FOCUS_ROOT_IDENTIFIER}\\}`);
const focusBranchLines = [];
shellLines.forEach((line, i) => {
  if (FOCUS_BRANCH_RE.test(line)) focusBranchLines.push(i + 1);
});

/*
 * The exactly-one assertion on that render site is NOT raised here, and the
 * move is the WR-03 subsumption rather than a relaxation.
 *
 * Measured on the shipped gate: appending the clearance to the outer element
 * through a template literal — the single most likely shape a reintroduction
 * takes, because it is what a person writes to "add one class" — makes this
 * count zero, and the refusal delivered a genuine CR-01 regression to the
 * aggregate as "nothing was measured" for all sixteen gates. So the count is
 * taken here and JUDGED below, after the frozen window has been scanned for the
 * defect: when the window carries a navigation property, that is a measurement
 * that happened and was wrong, and it is reported as a FAILURE. The refusal is
 * kept for the case where the window is clean and the render site still cannot
 * be located — there the gate really did not measure the focus form.
 */

/* ── E1's read, part two: the focus branch as a FROZEN SHAPE ─────────────────
 *
 * **This is round 4 of one guard, and it is the round that changes direction.**
 *
 * Round 1 asserted on the `FOCUS_ROOT` constant and the reintroduction moved to
 * the render site. Round 2 asserted on the outer element and it moved to the
 * inner element. Round 3 asserted on the branch as a brace-balanced region and
 * it moved to the SHAPE of the branch: the balance opened on any brace that
 * raised it — including the JSX expression brace on the opener's own line — so
 * an `if` written without block braces truncated a seven-line region to three,
 * and the reintroduced line was then printed in the report as EVIDENCE that the
 * property "survives elsewhere". A ternary, a `}` inside a string and a
 * concatenation behind a block comment took the same door.
 *
 * **The diagnosis is not a missing syntax. It is that an unrecognised shape
 * produced a GREEN**, and every escape in three rounds went through that door.
 * Enumerating a fourth syntax would be round 4 of the same mistake.
 *
 * So the direction is inverted. This read no longer hunts for the defect inside
 * a shape it recognises. It asserts that the branch has EXACTLY the one frozen
 * expected shape, line by line, over a window whose length is the frozen
 * shape's length and whose start is the single opener. **No brace is counted
 * anywhere in the derivation.** A ternary, a brace-less `if`, a brace inside a
 * string, a fragment, a nested conditional, an extracted helper, a reordered
 * attribute and any refactor nobody has imagined are all simply "not the
 * expected shape", and none of them can produce a tick.
 *
 * **What was removed, said rather than deleted quietly.** The brace-balance
 * derivation is gone, and with it the two refusals that depended on it: the one
 * that fired when the opener opened no block, and the one that fired when the
 * balance never returned to zero. The first was measured firing only on a shape
 * its own message does not name, while the shape it does name — a ternary —
 * passed green; the second described a condition the frozen comparison now
 * reaches first, and reaches without needing to be right about braces.
 *
 * **The accepted cost, written here rather than discovered in 41.1.** This gate
 * will refuse a LEGITIMATE refactor of the focus branch until somebody updates
 * the frozen shape below. That is the correct direction — it fails closed — but
 * it puts a red suite in front of whoever next edits the shell, so the refusal
 * prints the expected shape, the found window, the first position at which they
 * differ, and the single action that resolves it.
 */
const FOCUS_BRANCH_OPEN_RE = /\bwidth\s*===\s*(?:"focus"|'focus')/;

/**
 * The two markers, on the first line of every refusal in this read.
 *
 * One says a person changed the branch and the expectation here must be updated
 * with it; the other says this gate is broken or blindfolded. A reader meeting a
 * red suite has to be able to tell those apart without opening this file, and
 * three rounds of refusals that all read alike are why they are constants rather
 * than a phrasing convention.
 */
const SHAPE_CHANGED_MARKER = 'SHAPE CHANGED';
const GATE_CANNOT_READ_MARKER = 'GATE CANNOT READ';

/**
 * The two utility tokens the focus branch's inner element carries, assembled
 * from fragments so that neither appears contiguously in this script's source.
 *
 * **DEF-41-01 is the reason, and it is sharper here than anywhere else in this
 * file.** Tailwind compiles class strings out of everything it scans, comments
 * and phase documents included. A FROZEN COPY OF PRODUCT CODE OUTLIVES THE
 * PRODUCT CODE IT COPIES — that is what freezing means — so a whole utility
 * written here would keep a rule alive in the stylesheet after the shell had
 * dropped it, and the gate meant to notice a change would itself be the reason
 * the change had no effect.
 *
 * **`DECLARED_MAXIMA` above writes three whole utilities, and that is not
 * licence.** It predates this rule, and it is a different risk: it is a
 * DECLARATION the gate compares the shell against, not a frozen copy of product
 * code. One of its three entries is the same token the frozen entries below
 * carry, which is also why the no-whole-utility grep in this round's acceptance
 * criteria is bounded to the frozen shape's own array literal rather than run
 * over the whole file — the overlap is expected, not a contradiction.
 */
const FOCUS_TOKEN_WIDTH_FULL = 'w-' + 'ful' + 'l';
const FOCUS_TOKEN_MAX_NARROW = 'max-' + 'w-' + 's' + 'm';

/**
 * The frozen expected shape of the focus branch: the exact trimmed text of each
 * line, in order, first entry being the opener and last the line that closes
 * the `if` block.
 *
 * This is a literal copy, not a pattern. It IS the expected shape, and anything
 * that is not it is a deviation — which is the whole of round 4's inversion.
 * The render-site entry is built from `FOCUS_ROOT_IDENTIFIER` so that renaming
 * the constant moves both this expectation and the scan that reads it, rather
 * than leaving one of them silently passing.
 */
const FOCUS_BRANCH_SHAPE = [
  'if (width === "focus") {',
  'return (',
  '<div className={' + FOCUS_ROOT_IDENTIFIER + '}>',
  '<div className={`' +
    FOCUS_TOKEN_WIDTH_FULL +
    ' ' +
    FOCUS_TOKEN_MAX_NARROW +
    ' ${className}`.trimEnd()}>{children}</div>',
  '</div>',
  ');',
  '}',
];

/**
 * The frozen shape's self-check, run on every run BEFORE it certifies anything.
 *
 * Without it, the refusal above instructs a reader to *update the frozen shape*
 * — and updating it to include a navigation property would make this gate
 * certify the exact defect it exists to catch. That is the fifth escape, and it
 * would be written into the gate's own error message.
 *
 * The test is against the ASSEMBLED entry, the string the array actually holds
 * once the fragments are joined, and not against this file's source text, which
 * by construction does not carry those tokens contiguously at all. This branch
 * is exercised by transiently injecting a property name into one entry, in the
 * same fragment-assembled form as its neighbours, and requiring a refusal — a
 * refusal branch described and never run is a defect this file family has
 * already met.
 */
const frozenShapeCarryingDefect = [];
FOCUS_BRANCH_SHAPE.forEach((entry, i) => {
  for (const prop of NAV_PROPERTIES) {
    if (entry.includes(prop)) frozenShapeCarryingDefect.push({ index: i, prop, entry });
  }
});

if (frozenShapeCarryingDefect.length > 0) {
  refuse(
    `${GATE_CANNOT_READ_MARKER} — the frozen expected shape of the focus branch, declared in\n` +
      '       this file, itself carries a navigation property:\n\n' +
      frozenShapeCarryingDefect
        .map(({ index, prop, entry }) => `         entry ${index + 1}  ${prop}\n           ${entry}`)
        .join('\n') +
      '\n\n       WHAT THIS MEANS. This gate certifies the branch by comparing it against that\n' +
      '       shape. A shape carrying the clearance would certify a focus form that reserves a\n' +
      '       column and a bar its four routes do not mount — CR-01, blessed by its own guard.\n' +
      '       Nothing this gate would say about the branch can be trusted while this holds.\n\n' +
      '       WHAT TO DO. Every other refusal in this read tells a reader to update the frozen\n' +
      '       shape when the branch legitimately changes. This is the one edit that instruction\n' +
      '       does not license: remove the property from the entry above. If the focus form is\n' +
      '       genuinely meant to reserve navigation clearance again, that is a product decision\n' +
      '       about §4\'s closed focus list, and it is made there and not by editing a gate.\n\n' +
      '       Nothing was measured.'
  );
}

const focusBranchOpeners = [];
shellLines.forEach((line, i) => {
  if (FOCUS_BRANCH_OPEN_RE.test(line)) focusBranchOpeners.push({ lineNo: i + 1, text: line });
});

/**
 * The instruction every refusal below ends with. A refusal that fires on correct
 * code without saying what to do is how a gate gets switched off (§0 rule 3,
 * D-41-19's second failure mode), so the legitimate forms are named.
 */
const FOCUS_BRANCH_WIDENING_NOTE =
  '       WHAT A LEGITIMATE CHANGE DOES. Several future forms would trip this and all of them\n' +
  '       are legitimate: the branch rewritten as a ternary, the branch extracted into its own\n' +
  '       component, the opener written as part of a compound condition, an attribute\n' +
  '       reordered. In every case the instruction is the same: update the frozen expectation\n' +
  '       in this file, in the same commit, carrying the measurement that justified it. It\n' +
  '       does not get deleted, and the branch does not get inlined to make it quiet.\n\n';

if (focusBranchOpeners.length !== 1) {
  const where =
    focusBranchOpeners.length > 0
      ? `at line(s) ${focusBranchOpeners.map((o) => o.lineNo).join(', ')}`
      : 'nowhere in the file';
  refuse(
    `${GATE_CANNOT_READ_MARKER} — ${SHELL_FILE} opens the focus branch ` +
      `${focusBranchOpeners.length} time(s), found ${where}.\n` +
      '       Exactly one is required.\n\n' +
      '       WHAT WAS MEASURED AND FOUND. The comparison that selects the focus form was looked\n' +
      '       for over the whole comment-stripped file, tolerant of whitespace and of either\n' +
      '       quote style. The frozen window is ANCHORED on that single opener; with no opener,\n' +
      '       or with two, there is no anchor and the assertion would cover nothing.\n\n' +
      '       WHY THIS IS A REFUSAL AND NOT A FAILURE. Nothing about the clearance was measured.\n' +
      '       Reporting a pass here would be reporting agreement with a branch never read — the\n' +
      '       failure direction that prints a tick, and the one CR-01 already took three times.\n\n' +
      FOCUS_BRANCH_WIDENING_NOTE +
      '       Nothing was measured.'
  );
}

const focusBranchStart = focusBranchOpeners[0].lineNo;
const focusWindowEnd = focusBranchStart + FOCUS_BRANCH_SHAPE.length - 1;

if (focusWindowEnd > shellLines.length) {
  refuse(
    `${GATE_CANNOT_READ_MARKER} — ${SHELL_FILE} has ${shellLines.length} line(s), and the frozen\n` +
      `       window anchored on the opener at line ${focusBranchStart} needs ` +
      `${FOCUS_BRANCH_SHAPE.length}, ending at line ${focusWindowEnd}.\n` +
      '       The file is shorter than the shape this gate expects, so there is nothing to\n' +
      '       compare against and nothing to scan.\n\n' +
      FOCUS_BRANCH_WIDENING_NOTE +
      '       Nothing was measured.'
  );
}

/**
 * The frozen window: a fixed number of lines from the opener, and NOT a region
 * derived from the source.
 *
 * `lines` holds the trimmed live text at each position. The comparison, the
 * defect scan and the evidence exclusion all read this one object, so there is
 * no second derivation that could disagree with the first.
 */
const focusWindow = {
  start: focusBranchStart,
  end: focusWindowEnd,
  lineCount: FOCUS_BRANCH_SHAPE.length,
  lines: [],
};
for (let n = focusWindow.start; n <= focusWindow.end; n += 1) {
  focusWindow.lines.push({ lineNo: n, text: shellLines[n - 1], trimmed: shellLines[n - 1].trim() });
}

/**
 * The comparison. Byte-for-byte against the frozen entry, position by position.
 *
 * Internal whitespace is significant, and a comment-only line inside the branch
 * blanks to the empty string and therefore differs. **Both are deviations and
 * both fail closed**, which is accepted here rather than left for a reader to
 * discover: the alternative is a normaliser, and a normaliser is one more thing
 * that has to recognise a shape.
 */
let focusShapeMatched = true;
let focusShapeFirstDifference = null;
for (let i = 0; i < FOCUS_BRANCH_SHAPE.length; i += 1) {
  if (focusWindow.lines[i].trimmed === FOCUS_BRANCH_SHAPE[i]) continue;
  focusShapeMatched = false;
  focusShapeFirstDifference = {
    index: i,
    lineNo: focusWindow.lines[i].lineNo,
    expected: FOCUS_BRANCH_SHAPE[i],
    found: focusWindow.lines[i].trimmed,
  };
  break;
}

/**
 * The defect scan, taken over the window INDEPENDENTLY of whether the shape
 * matched.
 *
 * This scan recognises nothing: it is a fixed-length window anchored on the
 * opener, and every line of it is read for both property names. That is the
 * half that makes an unanticipated refactor carrying a reintroduction a
 * FAILURE rather than a refusal — a measurement happened, and it was wrong.
 */
const propertiesInFocusBranch = [];
for (const { lineNo, text } of focusWindow.lines) {
  for (const prop of NAV_PROPERTIES) {
    if (text.includes(prop)) propertiesInFocusBranch.push({ prop, lineNo, text });
  }
}

/*
 * The verdict split.
 *
 * A deviation that CARRIES a navigation property is a failure and is reported
 * below with the other `✗ E` verdicts; it must not be swallowed by a refusal
 * here, because a refusal reports a real regression to the aggregate as
 * "nothing was measured". A deviation that carries none is a refusal, because
 * this gate genuinely cannot certify a shape it has never been shown.
 */
if (propertiesInFocusBranch.length === 0 && !focusShapeMatched) {
  const expectedBlock = FOCUS_BRANCH_SHAPE.map(
    (entry, i) => `         ${String(i + 1).padStart(2)}  ${entry}`
  ).join('\n');
  const foundBlock = focusWindow.lines
    .map(({ lineNo, trimmed }) => `         ${String(lineNo).padStart(4)}  ${trimmed}`)
    .join('\n');
  refuse(
    `${SHAPE_CHANGED_MARKER} — ${SHELL_FILE}'s focus branch is not the shape this gate froze.\n\n` +
      '       WHAT WAS EXPECTED, in order, trimmed:\n\n' +
      expectedBlock +
      '\n\n       WHAT WAS FOUND, over the window anchored on the single opener at line ' +
      `${focusWindow.start} and running ${focusWindow.lineCount} line(s) to ${focusWindow.end}:\n\n` +
      foundBlock +
      `\n\n       FIRST DIFFERENCE — position ${focusShapeFirstDifference.index + 1}, at line ` +
      `${focusShapeFirstDifference.lineNo}:\n` +
      `         expected  ${focusShapeFirstDifference.expected}\n` +
      `         found     ${focusShapeFirstDifference.found}\n\n` +
      '       WHY THIS IS A REFUSAL AND NOT A FAILURE. No navigation property was found in the\n' +
      '       window, so nothing was measured as wrong — but the branch is not the shape the\n' +
      '       frozen expectation describes, and three rounds of this guard were escaped by a\n' +
      '       shape it did not recognise being treated as clean. It refuses instead.\n\n' +
      '       WHAT TO DO. If a person made this change, it is legitimate and the resolution is\n' +
      '       one action: update the frozen shape in this file, in the same commit as the\n' +
      '       branch, so the expectation and the code are edited together. Keep it free of both\n' +
      '       navigation property names — this gate asserts that separately on every run and\n' +
      '       will refuse if the expectation is edited to permit the defect it exists to catch.\n\n' +
      FOCUS_BRANCH_WIDENING_NOTE +
      '       Nothing was measured.'
  );
}

/*
 * The render-site assertions, raised only when the window came back clean.
 *
 * When the window carries the defect the failure below is the verdict, and
 * refusing here would replace it with "nothing was measured" — WR-03.
 */
const focusRootRenderLineNo = focusBranchLines.length === 1 ? focusBranchLines[0] : null;

if (propertiesInFocusBranch.length === 0 && focusBranchLines.length !== 1) {
  const where =
    focusBranchLines.length > 0 ? `at line(s) ${focusBranchLines.join(', ')}` : 'nowhere in the file';
  refuse(
    `${GATE_CANNOT_READ_MARKER} — ${SHELL_FILE} renders ${FOCUS_ROOT_IDENTIFIER} as the whole of\n` +
      `       exactly one className ${focusBranchLines.length} time(s) — found ${where}. Exactly one is\n` +
      '       required, and the frozen window came back carrying no navigation property.\n\n' +
      '       WHY THIS IS A REFUSAL AND NOT A FAILURE. Check E1 asserts against the CONSTANT:\n' +
      '       that its literal reserves neither navigation property, that it still declares a\n' +
      '       height and a centring. A focus root assembled from that constant PLUS anything\n' +
      '       else is a form this gate did not read, and asserting a property is absent from a\n' +
      '       fragment is how a check goes green on a defect it never saw. Nothing was measured\n' +
      '       as wrong here — the window is clean — but the form on screen was not read.\n\n' +
      '       WHAT A LEGITIMATE CHANGE DOES. If the focus branch one day needs a second class,\n' +
      '       the named candidate is the `nav` prop D-41-04 deliberately did not write, arriving\n' +
      '       with its first consumer. Then the frozen shape is updated in the same commit,\n' +
      '       carrying the measurement that justified it.\n\n' +
      '       Nothing was measured.'
  );
}

if (
  propertiesInFocusBranch.length === 0 &&
  focusRootRenderLineNo !== null &&
  (focusRootRenderLineNo < focusWindow.start || focusRootRenderLineNo > focusWindow.end)
) {
  refuse(
    `${GATE_CANNOT_READ_MARKER} — ${SHELL_FILE}:${focusRootRenderLineNo} renders ` +
      `${FOCUS_ROOT_IDENTIFIER} as the whole of a\n` +
      `       className, but that line falls OUTSIDE the frozen window, lines ${focusWindow.start}-${focusWindow.end}.\n\n` +
      '       WHAT WAS MEASURED AND FOUND. The exactly-one assertion is satisfied by an\n' +
      '       occurrence anywhere in the file. It was, and the occurrence is not in the window —\n' +
      '       so the focus form on screen is built from something this gate never read, while the\n' +
      '       constant it did read renders somewhere else.\n\n' +
      '       WHY THIS IS A REFUSAL AND NOT A FAILURE. Nothing about the focus form was measured.\n' +
      '       Asserting the absence of a property from a constant the focus branch does not\n' +
      '       render is agreement with a form that was never opened.\n\n' +
      FOCUS_BRANCH_WIDENING_NOTE +
      '       Nothing was measured.'
  );
}

/* ── E2's read: the layouts each surface climbs through ───────────────────── */

const layoutClosureCache = new Map();

/**
 * One ancestor layout's closure, refusing on an unresolved specifier exactly as
 * a page's does — a layout whose closure was silently narrowed is a layout
 * whose navigation this gate might not find, and not finding it reports the
 * surfaces below as navigation-free.
 */
function layoutClosure(rel) {
  const cached = layoutClosureCache.get(rel);
  if (cached) return cached;

  const { reached, unresolved } = importClosure(rel);
  if (unresolved.length > 0) {
    refuse(
      `the closure of the layout ${rel} has ${unresolved.length} local specifier(s) this walk\n` +
        '       could not resolve, so part of it was never opened — and a layout is where three\n' +
        '       of the eight declared surfaces get their navigation. A narrowed walk here\n' +
        '       reports those surfaces as navigation-free, which is the failure direction that\n' +
        '       prints a tick. Nothing was measured.\n\n       ' +
        unresolved.map(({ from, spec }) => `${from}  ->  ${spec}`).join('\n       ')
    );
  }

  layoutClosureCache.set(rel, reached);
  return reached;
}

/**
 * Every wrapper that wraps `pageFile`, nearest first, from the page's own
 * directory up to the route root inclusive.
 *
 * It climbs **directories**, which is what Next nests wrappers by — a route
 * group like `(work)` or `(admin)` is a directory and is therefore climbed
 * through, not around. Every basename in `WRAPPER_BASENAMES` and every
 * extension is collected if several ever sat in one directory: Next would
 * render its own combination, and searching all of them can only make this gate
 * MORE likely to find a navigation, never less.
 *
 * It reads `WRAPPER_BASENAMES` — the same list the enumeration under the route
 * root reads — so the two cannot drift apart: a basename added there is climbed
 * here, instead of being enumerated by one and skipped by the other.
 */
function ancestorLayoutFiles(pageFile) {
  const found = [];
  let dir = pageFile.split('/').slice(0, -1).join('/');

  for (;;) {
    for (const base of WRAPPER_BASENAMES) {
      for (const ext of WRAPPER_EXTENSIONS) {
        /* `base` carries its own trailing dot, `ext` leads with one. */
        const candidate = `${dir}/${base}${ext.slice(1)}`;
        if (existsSync(`${ROOT}/${candidate}`)) found.push(candidate);
      }
    }
    if (dir === APP_DIR_REL) break;
    const parent = dir.split('/').slice(0, -1).join('/');
    if (parent === '' || parent === dir) break;
    dir = parent;
  }

  return found;
}

const navigationBySurface = surfaces.map((s) => {
  const layouts = ancestorLayoutFiles(s.pageFile);

  const ownModules = NAV_MODULE_PATHS.filter((path) => s.reached.includes(path));
  const layoutMounts = [];
  for (const layoutFile of layouts) {
    const reached = layoutClosure(layoutFile);
    const modules = NAV_MODULE_PATHS.filter((path) => reached.includes(path));
    if (modules.length > 0) layoutMounts.push({ layoutFile, modules });
  }

  const modules = [...new Set([...ownModules, ...layoutMounts.flatMap((m) => m.modules)])].sort();

  let through = null;
  if (ownModules.length > 0) through = "the page's own closure";
  else if (layoutMounts.length > 0) through = layoutMounts[0].layoutFile;

  return { ...s, layouts, modules, through, mounted: modules.length > 0 };
});

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

/* `failures` is declared at the top of this file, above refuse(), which reads
 * it. See its docblock there: a refusal must not absorb a failure. */

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

/* ────────────────────────────────────────────────────────────────────────────
 * check E — the clearance a surface reserves against the navigation it mounts.
 * Also G4, and the check CR-01 did not have.
 * ──────────────────────────────────────────────────────────────────────────── */

/* ── E1: the shell's focus root — the comparisons only ────────────────────────
 *
 * The read that produces `focusRoot`, `focusRootLineNo` and `shellLines` is
 * taken far above, with E2's, so all three of its refusals precede every tick
 * (WR-01). What is left here is what compares.
 * ──────────────────────────────────────────────────────────────────────────── */

/* Patterns, not literals: a whole utility written here would be a live Tailwind
 * candidate (DEF-41-01). Same construction as MAX_WIDTH_RE above. */
const MIN_HEIGHT_RE = /(?<![a-zA-Z0-9-])min-h-[a-z0-9[\]./-]+/;
const CENTRING_RE = /(?<![a-zA-Z0-9-])(?:justify|items|place|self)-center(?![a-z0-9-])/;

const propertiesInFocusRoot = NAV_PROPERTIES.filter((prop) => focusRoot.includes(prop));
const focusRootHasHeight = MIN_HEIGHT_RE.test(focusRoot);
const focusRootHasCentring = CENTRING_RE.test(focusRoot);

/**
 * `MIN_HEIGHT_RE` and `CENTRING_RE` are **not** subsumed by the region check
 * below, and this sentence is here so the next reader does not close them by
 * assumption. The region bounds WHERE the two properties may not appear; it
 * says nothing about what the constant's height and centring utilities actually
 * produce, which is 41-GAP-REVIEW.md CR-02 and is still open.
 */

/*
 * `propertiesInFocusBranch` — every occurrence of either property on any line of
 * the frozen window — is computed with the rest of check E's read, far above,
 * so that the verdict split and every refusal it governs precede the first tick.
 * `propertiesInFocusRoot` above stays and is not redundant with it: the constant
 * is declared OUTSIDE the branch, so the window does not cover it.
 */

/**
 * Evidence that a property survives ELSEWHERE — with the frozen window excluded.
 *
 * This exclusion is the half that stops the defect certifying itself. Before it,
 * a clearance appended inside the branch was counted here as proof that "the
 * shell still reads both properties elsewhere": measured on the shipped gate,
 * the defect's own line was listed as evidence for the assertion meant to catch
 * it (GAP-CR-02), and again a round later when a brace-less `if` truncated the
 * derived region so the reintroduced line fell outside it. **It is keyed on the
 * window now, and the window's length does not depend on the branch's shape** —
 * so no rewrite can move the defect's line out of the exclusion.
 *
 * `propertiesDroppedEntirely` still evaluates over the narrowed set, and still
 * holds on a correct tree: the default and wide branch reads both properties,
 * outside the window, so the assertion that the clearance did not leave the
 * primitive is unweakened.
 */
const propertyReadsElsewhere = new Map(NAV_PROPERTIES.map((prop) => [prop, []]));
shellLines.forEach((line, i) => {
  const lineNo = i + 1;
  if (lineNo === focusRootLineNo) return;
  if (lineNo >= focusWindow.start && lineNo <= focusWindow.end) return;
  for (const prop of NAV_PROPERTIES) {
    if (line.includes(prop)) propertyReadsElsewhere.get(prop).push(lineNo);
  }
});
const propertiesDroppedEntirely = NAV_PROPERTIES.filter((prop) => propertyReadsElsewhere.get(prop).length === 0);

/* ── E2: the width against the mount ──────────────────────────────────────── */

const reservesWithoutMounting = navigationBySurface.filter((s) => !s.mounted && s.width !== 'focus');
const mountsUnderTheFocusForm = navigationBySurface.filter((s) => s.mounted && s.width === 'focus');

/* ── the report, before any verdict ───────────────────────────────────────── */

console.log('  check E — the declared width against the navigation actually mounted (G4):\n');

console.log(`      navigation modules declared : ${NAV_MODULES.length}`);
for (const [path, why] of NAV_MODULES) {
  console.log(`          ${path}`);
  console.log(`             ${why}`);
}

console.log(
  `      wrapper files under ${APP_DIR_REL} : ${wrapperFilesUnderApp.length}` +
    `   (basenames climbed: ${WRAPPER_BASENAMES.join(', ')})`
);
for (const rel of wrapperFilesUnderApp) console.log(`          ${rel}`);

/* A green states what it passed over: the skips, with the reason each was one. */
console.log(`      of those, skipped as not a route module : ${skippedWrappers.length}`);
for (const { rel, why } of skippedWrappers) {
  console.log(`          ${rel}`);
  console.log(`             ${why}`);
}

/* The window, printed before anything derived from it. A window whose length is
 * frozen cannot be silently truncated, but it can be anchored on the wrong line,
 * so its bounds, the shape verdict and the defect count are all in the gate's
 * own output rather than inferred from a tick. */
console.log(
  `      the focus branch, ${SHELL_FILE}:${focusWindow.start}-${focusWindow.end}` +
    `   (${focusWindow.lineCount} line(s), anchored on the single opener; no brace counted)`
);
console.log(`      the frozen expected shape                 : ${FOCUS_BRANCH_SHAPE.length} line(s)`);
console.log(
  `      the window matches the frozen shape       : ${focusShapeMatched ? 'yes' : 'NO'}` +
    (focusShapeMatched
      ? ''
      : `   (first difference at position ${focusShapeFirstDifference.index + 1}, line ${focusShapeFirstDifference.lineNo})`)
);
for (const { lineNo, trimmed } of focusWindow.lines) {
  console.log(`          ${String(lineNo).padEnd(4)}: ${trimmed}`);
}
console.log(
  `          ${FOCUS_ROOT_IDENTIFIER} rendered at line ` +
    `${focusRootRenderLineNo === null ? 'NOT AS THE WHOLE OF EXACTLY ONE className' : focusRootRenderLineNo}`
);
console.log(
  `          navigation propert(y/ies) found inside the window: ${propertiesInFocusBranch.length}`
);

console.log(`      the shell's focus root, ${SHELL_FILE}:${focusRootLineNo}`);
console.log(`          ${FOCUS_ROOT_IDENTIFIER} = "${focusRoot}"`);
for (const prop of NAV_PROPERTIES) {
  const at = propertyReadsElsewhere.get(prop);
  const where = at.length > 0 ? `read at line(s) ${at.join(', ')}` : 'NOT READ ANYWHERE';
  console.log(`          ${prop.padEnd(26)} — outside the focus branch: ${where}`);
}

console.log('\n      route                         width    navigation   reached through');
for (const s of navigationBySurface) {
  const mark = s.mounted ? 'mounted' : 'none';
  const via = s.mounted ? `${s.modules.map((m) => m.split('/').pop()).join(' + ')}  via  ${s.through}` : '—';
  console.log(`      ${s.route.padEnd(29)} ${s.width.padEnd(8)} ${mark.padEnd(12)} ${via}`);
}

const mountedCount = navigationBySurface.filter((s) => s.mounted).length;
console.log(
  `\n      ${mountedCount} of ${navigationBySurface.length} surface(s) mount a navigation; ` +
    `${navigationBySurface.length - mountedCount} do not.\n` +
    "      That partition is the check: the ones that do not are exactly §4's focus list, or\n" +
    '      one of the two halves below fails.\n'
);

if (propertiesInFocusRoot.length > 0) {
  failures.push('E');
  console.log(
    `  ✗ E  the focus root declares ${propertiesInFocusRoot.length} navigation propert(y/ies) — this is CR-01:\n`
  );
  for (const prop of propertiesInFocusRoot) console.log(`       ${prop}`);
  console.log(
    `\n       ${SHELL_FILE}:${focusRootLineNo}\n         ${FOCUS_ROOT_IDENTIFIER} = "${focusRoot}"\n\n` +
      "       §4's focus list is closed at four routes and NOT ONE OF THEM mounts a navigation,\n" +
      '       so a clearance reserved here is a column and a bar left empty. Measured when this\n' +
      '       last happened: 248px leading against 24px trailing at and above 768px, putting a\n' +
      '       centred card 112px right of the viewport centre; ~96px of bottom padding below\n' +
      '       768px under a card with no bar beneath it. Four checks were green throughout.\n'
  );
}

if (propertiesInFocusBranch.length > 0) {
  if (!failures.includes('E')) failures.push('E');
  console.log(
    `  ✗ E  the focus branch reads ${propertiesInFocusBranch.length} navigation propert(y/ies) — this is CR-01,\n` +
      `       reintroduced inside ${SHELL_FILE}:${focusWindow.start}-${focusWindow.end}:\n`
  );
  for (const { prop, lineNo, text } of propertiesInFocusBranch) {
    console.log(`       ${prop}  at line ${lineNo}`);
    console.log(`         ${text.trim()}`);
  }
  console.log(
    "\n       §4's focus list is closed at four routes and NOT ONE OF THEM mounts a navigation,\n" +
      '       so a clearance reserved here is a column and a bar left empty. Measured when this\n' +
      '       last happened: 248px leading against 24px trailing at and above 768px, putting a\n' +
      '       centred card 112px right of the viewport centre; ~96px of bottom padding below\n' +
      '       768px under a card with no bar beneath it. Four checks were green throughout.\n\n' +
      '       The assertion above it reads the CONSTANT and would not have seen this: three\n' +
      '       previous rounds each fixed this at the point the defect was last seen, and each\n' +
      '       time it reappeared somewhere the fix did not look. This one reads every line of a\n' +
      '       window whose length is frozen, so no rewrite of the branch can move a line out of\n' +
      '       it.\n' +
      (focusShapeMatched
        ? ''
        : '\n       THE SHAPE ALSO DEVIATES from the frozen expectation, and this is reported as a\n' +
          '       FAILURE rather than as a refusal on purpose: a measurement happened and it was\n' +
          '       wrong. Reporting it as "nothing was measured" would hand the aggregate a real\n' +
          '       regression wearing a neutral face. Update the frozen shape only after the\n' +
          '       property above is removed.\n')
  );
}

if (!focusRootHasHeight || !focusRootHasCentring) {
  if (!failures.includes('E')) failures.push('E');
  console.log('  ✗ E  the focus root no longer declares the form it is supposed to be:\n');
  if (!focusRootHasHeight) console.log('       no minimum-height utility');
  if (!focusRootHasCentring) console.log('       no centring utility');
  console.log(
    `\n       ${SHELL_FILE}:${focusRootLineNo}\n         ${FOCUS_ROOT_IDENTIFIER} = "${focusRoot}"\n\n` +
      '       This assertion exists so that EMPTYING the string cannot satisfy the one above.\n' +
      '       A focus root that declares nothing reserves no navigation clearance either, and a\n' +
      '       check that accepted it would be forgiving the removal of the whole form in order\n' +
      '       to praise the removal of two properties from it.\n'
  );
}

if (propertiesDroppedEntirely.length > 0) {
  if (!failures.includes('E')) failures.push('E');
  console.log(
    `  ✗ E  ${SHELL_FILE} no longer reads ${propertiesDroppedEntirely.length} navigation propert(y/ies) ANYWHERE:\n`
  );
  for (const prop of propertiesDroppedEntirely) console.log(`       ${prop}`);
  console.log(
    '\n       The clearance left the focus form; it did not leave the primitive. The default\n' +
      '       and wide forms still own it, for the twelve routes on §4\'s wide list and for\n' +
      '       every work surface that mounts the navigation — twenty-four of them wrapped by\n' +
      "       one layout. Dropping it here does not centre four cards: it puts every OTHER\n" +
      '       converted surface under its own bar, which is the same defect facing the other\n' +
      '       way and on six times as many screens.\n'
  );
}

if (reservesWithoutMounting.length > 0) {
  if (!failures.includes('E')) failures.push('E');
  console.log(
    `  ✗ E  ${reservesWithoutMounting.length} surface(s) reserve navigation clearance they do not mount:\n`
  );
  for (const s of reservesWithoutMounting) {
    console.log(`       ${s.route} — declared "${s.width}", whose shell form reserves the clearance`);
    console.log(`         no navigation module in its own closure (${s.reached.length} file(s))`);
    console.log(`         nor in any of its ${s.layouts.length} ancestor layout(s): ${s.layouts.join(', ') || '(none)'}`);
  }
  console.log(
    '\n       **This red is the one plan 41-13 asked for, and it is correct rather than false.**\n' +
      '       Such a surface really does reserve a column and a bar that are not there. It is\n' +
      "       the moment PageShell gets the `nav` prop 41-13 deliberately did not write — a\n" +
      '       primitive capability with zero consumers is the defect this phase exists to\n' +
      '       prevent (Skeleton.tsx, correct and unimported, beside 102 hand-rolled copies), so\n' +
      '       the prop is written HERE, with its first consumer, in the same commit (D-41-04).\n' +
      '       Widening this check to make the red go away would be the other way round.\n'
  );
}

if (mountsUnderTheFocusForm.length > 0) {
  if (!failures.includes('E')) failures.push('E');
  console.log(
    `  ✗ E  ${mountsUnderTheFocusForm.length} focus surface(s) mount a navigation the focus form reserves nothing for:\n`
  );
  for (const s of mountsUnderTheFocusForm) {
    console.log(`       ${s.route} — ${s.modules.join(' + ')}  via  ${s.through}`);
  }
  console.log(
    '\n       The focus form reserves nothing, by census: §4\'s focus list is closed at four\n' +
      '       routes and none of them mounts a navigation. One that does would sit UNDER ITS\n' +
      '       OWN BAR on a phone and behind its own column above 768px. Either the surface is\n' +
      "       not focus, or the navigation does not belong on it — and which of the two is a\n" +
      '       question for a person, because both lists are edited by decision.\n'
  );
}

if (!failures.includes('E')) {
  console.log(
    `  ✓ E  the focus branch has the one frozen shape (${focusWindow.lineCount} line(s), at ` +
      `${SHELL_FILE}:${focusWindow.start}-${focusWindow.end}),\n` +
      '       no line of it reads either navigation property, nor does the focus root, while the\n' +
      `       shell still reads both OUTSIDE that window, and all ${navigationBySurface.length} converted surface(s)\n` +
      '       declare the width their mounted navigation calls for — focus if and only if none\n' +
      '       is mounted\n'
  );
}

/* ── verdict ──────────────────────────────────────────────────────────────── */

console.log('');
if (failures.length === 0) {
  console.log(
    `  CONVERSION_OK — all five checks passed over ${surfaces.length} declared surface(s), ` +
      `${allScanned.size} file(s) scanned.`
  );
  console.log(
    '\n  Read the header before treating this as safety. It proves that NO UNCONVERTED FILE\n' +
      '  IS REACHABLE from a declared surface. It does NOT prove the conversion is right: it\n' +
      '  is blind to an inline hex, to a class built by concatenation, and to an ugly layout.\n' +
      '  Check D says a maximum is declared and that the page did not override it — NOT that\n' +
      '  the chosen width is right, which is UI-SPEC Open Question 2. Check E says a declared\n' +
      '  width agrees with a mounted navigation — NOT that a card is centred: it reads a class\n' +
      '  string and an import graph, renders nothing and measures no pixel. H41-1, every\n' +
      '  converted surface observed at three widths by a person, and 41-CR01-PASS.md for the\n' +
      '  four focus routes, are the only things that say a surface is workable. Both are a\n' +
      '  human’s, and both are still owed.\n'
  );
  process.exit(0);
}
console.log(`  CONVERSION_FAIL — ${failures.length} check(s) failed: ${failures.join(', ')}\n`);
process.exit(1);
