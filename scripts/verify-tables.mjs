#!/usr/bin/env node
/**
 * verify-tables.mjs — one table implementation, one breakpoint, and a written
 * list of the tables still rendering their own.
 *
 * WHAT IT ASSERTS, in one sentence: **every `<table` under `src/` is either
 * inside the `DataTable` primitive, on a declared list that can only shrink, or
 * the one named exemption; the primitive switches between its two trees at
 * exactly one breakpoint and never transforms either of them; and no file that
 * imports the primitive introduces a second breakpoint for the same switch.**
 *
 * `41-UI-SPEC.md` §8.8 consolidates **seven** tables measured on this tree. Six
 * of them already render twice — a real table above a breakpoint and a card
 * list below it — and the thing they disagree about is *which* breakpoint: four
 * switch at 640px and two at 1024px. D-41-17 is explicit that DS-09's content is
 * therefore **consolidation, not construction**, and that is what this gate
 * measures: not whether a table exists, but whether the tree has one answer to
 * the same question.
 *
 * WHY A STRUCTURAL CHECK AND NOT A TEST. There is no test runner in this
 * repository — no `test` script, no `*.test.*`, no `*.spec.*` (`CLAUDE.md`
 * Guardrail 1). And `npm run build` cannot see any of this: a seventh
 * hand-rolled dual-render compiles and renders. What differs is a number in a
 * media query, and a number that disagrees with five other numbers is not an
 * error — it is an inconsistency, and an inconsistency is exactly what a build
 * cannot report.
 *
 * ── WHAT A GREEN DOES NOT MEAN (cosa un verde NON significa) ────────────────
 *
 *   - **IT DOES NOT SAY A TABLE IS READABLE ON A PHONE.** It reads class
 *     strings and import clauses. Whether the cards carry the columns that
 *     mattered, whether anything scrolls sideways at 390px, and whether a
 *     seven-column table is comprehensible as a card is **H41-3**, which is a
 *     person holding a phone. No tick here stands in for that.
 *   - **A GREEN ON `REMAINING` IS NOT PROGRESS.** A table still rendering its
 *     own dual-render is a green, and it is supposed to be: the list exists so
 *     this gate can be switched on TODAY rather than after the migration
 *     (`verify-media-strip.mjs:51-62`; §0 rule 3). **Read the printed count, not
 *     the tick.** *(This sentence read "Five tables" until plan 41.1-16, when
 *     wave 5 took the list to one. Restated rather than left standing: a
 *     sentence whose figure has stopped being true reads to the next person
 *     either as an open obligation or as a file nobody maintains.)*
 *   - **IT DOES NOT JUDGE THE TABLES IT TOLERATES.** A file on `REMAINING` is
 *     not blessed; it is *counted*. The one that remains switches at a
 *     breakpoint §2.1 does not have — as four of the original five did.
 *   - **IT CANNOT SEE A CLASS BUILT BY CONCATENATION.** `` `hidden ${bp}:block` ``
 *     is text this script does not assemble. It reads lines.
 *   - **IT READS `.ts`-FAMILY FILES ONLY.** `src/emails/templates/` holds an
 *     HTML email carrying four layout tables, and they are **not in scope and
 *     must never be**: a table is how an email client is laid out at all, there
 *     is no card branch available in that medium, and Phase 40 already deferred
 *     the email palette as DI-40-01. The extension list is the fence, and it is
 *     printed on every run so the exclusion is visible rather than implicit.
 *   - **CHECK B READS THE SWITCH, NOT THE LAYOUT.** It asserts that the
 *     branch-visibility utilities in the primitive and in its importers name one
 *     breakpoint. A grid inside a card that steps at another breakpoint is a
 *     different question and belongs to `verify-breakpoints.mjs`.
 *
 * ── THE THREE CHECKS ────────────────────────────────────────────────────────
 *
 *   A. **One table implementation.** Every `<table` under `src/` lives in the
 *      primitive, on `REMAINING`, or in the one exemption. A file carrying one
 *      and named by none of the three FAILS. **The literal count is printed**,
 *      so the gate says what it counted rather than only whether it was happy.
 *
 *      The primitive's own count is asserted against a hard-coded expected
 *      value, and **fewer than expected FAILS**. That direction is the point: a
 *      primitive that lost its table would otherwise pass check A by having
 *      nothing to find, which is this gate's own vacuous green.
 *
 *   B. **One breakpoint, and two trees that are never transformed.** Three
 *      things, because they are three halves of one mechanism:
 *
 *      1. The primitive declares the branch switch at **`md`** and at no other
 *         breakpoint. Any other prefix on a branch-visibility utility FAILS,
 *         in the primitive or in any file importing it.
 *      2. The two required halves of the switch are present at their expected
 *         counts, and fewer FAILS — same argument as check A's floor.
 *      3. **No display override on the table parts.** §8.8 rejects that
 *         technique by name: MDN's ARIA `table` page documents that it destroys
 *         the native table semantics and WebKit bugs 243474 and 257458 record
 *         header-and-cell association still breaking under it — on the platform
 *         that IS every browser on this product's primary device. A green here
 *         says the mechanism is still two trees.
 *
 *   C. **The declared list.** `REMAINING` names every table not yet converted,
 *      with the reason it is still there and the surface that will remove it. An
 *      entry whose path is gone FAILS — a list that cannot be measured is a
 *      decoration. An entry whose file no longer carries a table is a **STALE**
 *      notice to delete, not a failure: a gate that reddens on a correct file
 *      gets switched off.
 *
 *      Since 41.1-03 every entry also carries a **group tag** from a closed
 *      vocabulary, and check C prints the count per group plus a
 *      `WORK GROUP REMAINING` line — the line phase 41.1's criterion 2 is read
 *      off. A missing or unknown tag is a **refusal**, not a failure: see
 *      `GROUP_TAGS`.
 *
 * ── THE ONE EXEMPTION, WRITTEN BEFORE THE GATE'S FIRST RUN (D-41-16) ────────
 *
 * `src/app/(admin)/admin/events/[id]/review/ReviewListClient.tsx` — the
 * copy-out diagnostic grid. **Its own copy says it exists to be pasted into a
 * diagnostic tool**, which is a use a card list actively destroys: a rectangle
 * of identifiers that can be selected and copied stops being one the moment it
 * becomes a stack of labelled cards. It keeps its table and its sideways
 * scroller **at every width**, and it is therefore an EXEMPTION and not a debt
 * — it is deliberately NOT on `REMAINING`, because a file that will never
 * convert, on a list that can only shrink, guarantees the number never reaches
 * zero, and a number that cannot reach zero is a number that lies. That is the
 * distinction plan 41-09 had to draw between its own two exceptions, and it is
 * drawn here in advance rather than rediscovered.
 *
 * D-41-16, in its own words: *an exemption discovered on a gate's first red run
 * is an exemption nobody trusts, and that gate gets switched off.* This one is
 * in `41-UI-SPEC.md` §8.8 and §13's G3 row, in this constant, and in this
 * header, before the gate has run once.
 *
 * **What the exemption does NOT cover — and this half is now PAID.** It exempts
 * the TABLE, not the type size. §8.8 is explicit that the grid does not keep its
 * 11px text — 11px is not a declared size, the grid is all identifiers, and it
 * takes the label/data size (12px) at `--muted` on `--surface`, **6.78 : 1**.
 * The accepted consequence is that 12px is wider than 11px and the grid scrolls
 * slightly more, on a surface that scrolls by design.
 *
 * This paragraph used to end *"that change belongs to the plan that converts the
 * review surface, not to the plan that wrote this gate"*, and it was the record
 * that the work was owed rather than forgotten. **Plan 41.1-09 was that plan and
 * the change has landed**, so the clause is retired here by plan 41.1-11, which
 * owns the wave's gate edits (D-41.1-22). The wording is quoted rather than
 * removed, because a record that stops saying *owed* without saying *paid* is
 * indistinguishable from one nobody kept up.
 *
 * **The exemption is unchanged.** The table stays, at every width, for ever.
 *
 * ── COMMENT HYGIENE ─────────────────────────────────────────────────────────
 *
 * Comment lines are blanked before any counting, with the line-shape heuristic
 * `verify-tokens.mjs:437-450` uses and the JSX opener DEF-41-02 adds — a JSX
 * comment's first line starts with a brace and matches none of the three
 * sibling shapes, so without the fourth opener a sentence explaining a class
 * string is read as a use of it. The count of lines blanked that way is printed
 * on every run. The error direction is stated rather than assumed: the opener
 * must be at the start of the trimmed line, so the shape can blank MORE than it
 * should only where a line begins with a JSX comment opener inside a string.
 *
 * ── WHY THE UTILITIES ARE COMPOSED FROM PARTS AND NEVER SPELLED ─────────────
 *
 * DEF-41-01, measured: **Tailwind compiles class strings out of comments and out
 * of `.planning/`**, and it has already emitted a malformed rule from one.
 * `scripts/` is inside the project root and is not ignored, so a complete
 * utility written in this file would be a live candidate. Every needle below is
 * assembled at run time and no whole utility appears as a literal.
 *
 * ── WHY THE HELPERS ARE LOCAL AND NOT IMPORTED ──────────────────────────────
 *
 * `verify-tokens.mjs` exports a walk and a comment stripper and they **cannot
 * be imported**: that module runs its checks at module scope and ends in
 * `process.exit()` with no main-module guard, so importing it would run the
 * TOKEN gate and exit this process with the TOKEN gate's verdict — this script
 * would exit 0 having measured nothing. Plan 41-02 measured exactly that.
 * **Self-contained is the house shape for a gate.**
 *
 * SECRECY. `.planning/` is tracked and this repository is PUBLIC (`CLAUDE.md`
 * Guardrail 5). This script reads only committed files under `src/`, prints only
 * paths, line numbers and source lines, opens no network connection, reads no
 * environment variable and writes no artefact. **It prints no row of data**: the
 * surface it was written for renders members' names and addresses, and a gate
 * that quoted a source line from a fixture would be the one place personal data
 * could reach a terminal. It quotes source, never state.
 *
 * Zero dependencies. Node built-ins only, ESM. Deliberately NOT wired into
 * `npm run build`: `next build` is the type gate, and a type gate that starts
 * failing for a reason that is not a type teaches everyone to ignore it.
 *
 * Usage:
 *   node scripts/verify-tables.mjs
 *
 * (Not registered in `package.json` by plan 41-10. Plan 41-12 owns that file and
 * registers all six new gates at once, so no two plans in a wave contend for it.)
 *
 * Exit codes:
 *   0  all three checks passed
 *   1  at least one failed — each is printed with its file and its line
 *   2  nothing was measured: `src/` is missing, the walk found no scannable
 *      file, the primitive is not on disk, the exemption's path is gone,
 *      `REMAINING` is empty, or a `REMAINING` entry carries a group tag that is
 *      missing or outside the closed vocabulary. **No verdict is implied by a
 *      2.** The last of those is a refusal and not a failure for a stated
 *      reason: a per-group count computed over a partially tagged list is a
 *      number nobody can read, and printing it anyway would be worse than
 *      printing nothing.
 */

import { readdirSync, readFileSync, existsSync, lstatSync } from 'node:fs';
import { dirname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

import { liveLinesFrom } from './lib/comments.mjs';

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
 * Comment hygiene — ONE stripper, imported, no private copy (D-41.1-07)
 * ──────────────────────────────────────────────────────────────────────────── */

/**
 * This gate no longer carries a stripper. It imports one.
 *
 * **The superseded implementation, recorded with the measurement that
 * superseded it.** What stood here was `41.1-RESEARCH.md` §4.1's family C: a JSX
 * multi-line state, whole-line blanking, and **no block state at all**. It was
 * false-red on a block comment inside a JSX opening tag and on a multi-line
 * block comment with prose body lines (S2, W3), and blind on a closed JSX
 * comment carrying live code after its closer (S3, S4, S5) — because whole-line
 * blanking cannot see live code on a comment's line by construction.
 *
 * §4.4 measured the extraction over all 263 files under `src/`: **zero lines
 * become live** anywhere, so this gate cannot redden from the swap.
 *
 * The paragraph is corrected rather than deleted, in the house shape
 * (`PageShell.tsx:42-46`): a decision undone without its measurement reads as a
 * slip to the next person.
 */
const liveLinesCache = new Map();

/** How many non-blank lines the shared stripper blanked, across this run. */
let commentLinesBlanked = 0;

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

/** The file's lines with every comment blanked, carriage returns removed. */
function liveLines(relPath) {
  const cached = liveLinesCache.get(relPath);
  if (cached) return cached;

  const raw = readFileSync(`${ROOT}/${relPath}`, 'utf8').split('\n');
  const { lines, unterminated } = liveLinesFrom(raw);
  if (unterminated !== null) refuseUnterminated(relPath, unterminated);

  for (let i = 0; i < raw.length; i += 1) {
    if (lines[i] === '' && raw[i].trim() !== '') commentLinesBlanked += 1;
  }

  liveLinesCache.set(relPath, lines);
  return lines;
}

/* ────────────────────────────────────────────────────────────────────────────
 * The primitive, and what §8.8 fixes about it
 * ──────────────────────────────────────────────────────────────────────────── */

export const PRIMITIVE_FILE = 'src/components/ui/DataTable.tsx';

/** The specifier a consumer imports the primitive by. */
const PRIMITIVE_SPECIFIER = 'ui/DataTable';

/** The element this gate counts. Everything else is a class string. */
const TABLE_ELEMENT = '<' + 'table';

/**
 * The primitive's own table count, hard-coded so that a needle which stopped
 * matching cannot pass as an absence of failures. One table, one primitive.
 */
const PRIMITIVE_TABLE_COUNT = 1;

/**
 * The branch switch, as `[label, needle, expectedCount]`.
 *
 * Assembled, never spelled, for the DEF-41-01 reason in the header. **Fewer
 * than expected FAILS**; more is a loud notice, because growth is not what this
 * defends against and a gate that reddens on a correct file gets switched off —
 * but a switch that doubled is usually a second implementation arriving inside
 * the file that exists to be the only one.
 */
export const SWITCH_SIGNATURE = [
  ['the table branch', 'md:' + 'block', 1],
  ['the card branch', 'md:' + 'hidden', 1],
];

/**
 * The one breakpoint a branch switch may name, and the four it may not.
 *
 * §2.1 gives this product two boundaries and one of them is 768px. The four
 * below are every other prefix Tailwind offers by default; naming them
 * explicitly rather than matching "any prefix that is not the permitted one"
 * means a prefix nobody has met yet is a decision that edits this list, not a
 * silent pass.
 */
const SWITCH_BREAKPOINT = 'md';
const OTHER_BREAKPOINTS = ['sm', 'lg', 'xl', '2xl'];

/**
 * The utilities that hide or show a branch. A breakpoint prefix on one of these
 * IS the switch; a breakpoint prefix on a grid's column count, a flex direction
 * or a type size is a different question and belongs to
 * `verify-breakpoints.mjs`.
 *
 * ── The boundary guard, and the defect it closes ─────────────────────────────
 *
 * **Measured while converting the first surface onto the primitive:** a plain
 * substring test reads a column-count utility as a branch switch, because the
 * switch's own name is a prefix of it — the utility that sets a grid's columns
 * at 1024px BEGINS with the utility that shows a grid at 1024px. The member
 * table's detail region carries exactly that shape, and the gate would have
 * reddened on a correct file the first time anything imported the primitive.
 *
 * `verify-media-strip.mjs:51-62` records what happens next: a gate that goes
 * red on a correct file gets switched off, and a gate that is switched off
 * guards nothing. So the utility must be the WHOLE utility — a trailing
 * character that could continue it disqualifies the match — and the leading
 * guard keeps the breakpoint from being read out of the middle of a longer
 * word.
 *
 * This is `verify-conversion.mjs`'s own recorded lesson arriving a second time:
 * a matcher borrowed in shape from a sibling carries the sibling's PURPOSE, and
 * the boundary a token hunt needs is not the boundary a switch hunt needs.
 */
const BRANCH_UTILITIES = ['hidden', 'block', 'flex', 'grid', 'table'];

function branchUtilityPattern(breakpoint, utility) {
  const escaped = breakpoint.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(
    `(?<![a-zA-Z0-9-])${escaped}:${utility}(?![a-zA-Z0-9-])`
  );
}

/**
 * The rejected mechanism, in the two spellings it could arrive in: a `display`
 * declaration in a style object or a stylesheet, and Tailwind's own display
 * utilities applied through an arbitrary child selector at the table parts.
 *
 * Assembled from parts for the DEF-41-01 reason, and matched on the primitive
 * and its importers only — a `display` property elsewhere in the tree is not
 * this gate's business.
 */
const DISPLAY_OVERRIDE_RE = new RegExp(
  ['display' + '\\s*:\\s*(?:block|grid|flex)', '\\[&_(?:td|tr|th|tbody|thead)\\]:'].join('|')
);

/* ────────────────────────────────────────────────────────────────────────────
 * The one exemption — a named constant, with its reason, before the first run
 * ──────────────────────────────────────────────────────────────────────────── */

/**
 * The copy-out diagnostic grid. **Exempt from check A, permanently.** See the
 * header for the whole argument.
 *
 * Deliberately NOT on `REMAINING`: an exemption and a debt are different kinds
 * of thing, and a file that will never convert on a list that can only shrink
 * makes the number lie.
 *
 * ── THE ONE CLAUSE THAT WAS AN OBLIGATION AND IS NOW HISTORY ────────────────
 *
 * The reason below used to end *"…and that change belongs to the plan that
 * converts the review surface, not to this one"*. **That plan has landed** —
 * 41.1-09, which converted `/admin/events/[id]/review` — and the change is in
 * the tree: the undeclared eleven-pixel size is gone and the grid takes the
 * label/data size, with the accepted consequence that it scrolls slightly more.
 *
 * So the clause is retired by plan 41.1-11, which owns the wave's gate edits
 * (D-41.1-22). **Retired, not deleted in silence**: a sentence describing owed
 * work, left standing after the work is done, is the same defect as a `REMAINING`
 * entry left standing after its debt is paid — it reads to the next person as an
 * open obligation, and they either redo it or conclude the file is not maintained.
 * The withdrawn wording is quoted above so the correction can be told apart from
 * a drive-by (`src/components/ui/PageShell.tsx:42-46`, this file family's habit).
 *
 * **The exemption itself is untouched, and that is the load-bearing half.**
 * `ReviewListClient.tsx` stays a table for ever (D-41-16, D-41.1-14): the type
 * size was the one thing the exemption never covered, and paying it changes
 * nothing about what the exemption says. Nothing here puts the file on a debt
 * list, and its absence from every one of them is asserted by grep after this
 * edit, because the failure mode on this file is a tidy rather than a decision.
 */
export const REVIEW_GRID_FILE =
  'src/app/(admin)/admin/events/[id]/review/ReviewListClient.tsx';

export const REVIEW_GRID_REASON =
  'exempt from check A — the copy-out diagnostic grid, whose own copy says it exists to be ' +
  'pasted into a diagnostic tool. A card list actively destroys the thing it is for: a ' +
  'rectangle of identifiers that can be selected and copied stops being one when it becomes a ' +
  'stack of labelled cards. It keeps its table and its sideways scroller at every width ' +
  '(§8.8, §13 G3 row, D-41-16). What the exemption never covered has been PAID by plan ' +
  '41.1-09: the undeclared eleven-pixel type is gone and the grid takes the label/data size ' +
  'at 6.78:1, and it scrolls slightly more for it';

/* ────────────────────────────────────────────────────────────────────────────
 * The group tag — a closed vocabulary, validated at load
 * ──────────────────────────────────────────────────────────────────────────── */

/**
 * The four groups a `REMAINING` entry may belong to, and the only four.
 *
 * **Why a tag at all.** Phase 41.1's criterion 2 reads *"G3's `REMAINING` is
 * empty for the work group"*, and this list is flat: without the tag that
 * criterion is read by eye off a list of paths, and **a criterion that cannot
 * be read off a gate is a claim** (D-41.1-11). The tag makes the sentence a
 * printed number.
 *
 * **An unknown or missing tag is a REFUSAL (exit 2), not a failure.** The
 * distinction is the same one this gate already draws everywhere else: a
 * failure says *the tree is wrong*, a refusal says *nothing was measured*. A
 * per-group count taken over a list where one entry has no group is not a
 * smaller measurement — it is a wrong one, because the entry silently vanishes
 * from every group total and the totals still add up to something that looks
 * plausible.
 *
 * The vocabulary is deliberately closed rather than free text. A free-text
 * group would let a typo — `work ` with a trailing space, `Work`, `works` —
 * open a fifth group of one entry that no criterion reads, which is the exact
 * shape of the defect the tag exists to prevent.
 *
 *   - `work`                — the work surface Phase 41.1 converts
 *   - `public-member-money` — the public / member / money surfaces, Phase 41.2's
 *   - `phase-42`            — deferred to Phase 42
 *   - `exempt`              — carried for a reason that will never be paid
 *
 * `exempt` is in the vocabulary for completeness and **is not used here**: this
 * gate's one exemption is a separate constant, deliberately not a `REMAINING`
 * entry (see `REVIEW_GRID_FILE` above and the refusal at the foot of the
 * pre-flight checks). If an `exempt` tag ever appears on this list, read that
 * refusal's reasoning first — it almost certainly means an exemption has been
 * tidied onto a list that can only shrink.
 */
export const GROUP_TAGS = ['work', 'public-member-money', 'phase-42', 'exempt'];

/* ────────────────────────────────────────────────────────────────────────────
 * REMAINING — the tables not yet converted, with what will remove each
 * ──────────────────────────────────────────────────────────────────────────── */

/**
 * Every file other than the primitive that still renders a table of its own,
 * excluding the exemption above.
 *
 * **Measured on this tree, not copied from a document.** Seven tables exist in
 * the `.ts` family; one is the exemption; **six open this list**. Four of the six
 * switch at 640px and two at 1024px, which is the disagreement §8.8 exists to
 * end.
 *
 * **The member table opened this list and left it one commit later**, taking it
 * from six to five. That is not a formality: the alternative — writing the gate
 * after the conversion so it could open at five — would have been a gate that
 * never went red on the file it was written for. A debt entered and then paid in
 * the same plan is the only kind whose payment anybody can check.
 *
 * THE DISCIPLINE, which is the whole point of the constant existing:
 *
 *   - **Removing an entry is what converting a table looks like.** When a file
 *     stops rendering its own table, its line leaves this list in the same
 *     commit.
 *   - **Adding an entry is a DECISION that edits this constant**, not a diff
 *     nobody reads (`verify-sunset-gradient.mjs:141-149`). It means somebody
 *     built an eighth dual-render beside a primitive that exists, and the reason
 *     belongs on the line.
 *   - The reason and the target travel WITH the entry
 *     (`verify-routes.mjs:130-152`), because a list of paths whose reasons live
 *     somewhere else is a list whose reasons stop being true unnoticed.
 *
 * **The `target` column names a conversion unit and NOT a plan — deliberately.**
 * Measured across every `*-PLAN.md` in this phase: **no remaining plan in Phase
 * 41 declares any of these five files.** Writing a plan number here would be a
 * claim about work nobody has scheduled, which is the shape DEF-41-03 records —
 * a debt that looked owned and was not. What is true is the surface each one
 * belongs to, so that is what is written.
 *
 * **The `group` column, added in 41.1-03.** A fourth field, not a fourth list:
 * the reason and the target already travel with the entry, and the group has to
 * travel the same way or an entry can sit in the wrong list silently
 * (`conversion-manifest.mjs:80` carries a state column the same way, and says
 * in its own docblock that the column is load-bearing).
 *
 * **Every entry is `work`** — five of them when this paragraph was written, one
 * since plan 41.1-16. So criterion 2 for THIS gate is simply *"`REMAINING`
 * reaches 0"*, and the tag adds nothing here **except honesty about that** —
 * which is worth the field. Two reasons it is still worth carrying: the same tag
 * on `verify-breakpoints.mjs` is load-bearing (6 entries there today, 1 work and
 * 5 not — it was 14 of 19 when this was written, and every one of the thirteen
 * that left was work), and a list whose group is implicit because "they all
 * happen to be the same today" stops being true the first time somebody adds the
 * second entry.
 *
 * Shape: `[path, reason, target, group]`.
 */
/**
 * ── THE LIST IS EMPTY, AND THAT IS A DECISION RATHER THAN A DRIFT ────────────
 *
 * The emptiness guard below refuses an empty `REMAINING` and says why in its own
 * sentence: *"the emptiness should be a DECISION written above the constant —
 * not a list that quietly emptied itself while nobody was reading."* This is
 * that decision, and the guard now reads it instead of refusing blind.
 *
 * **Written 2026-08-14 by plan 41.1-24, the phase's final reconciliation.** The
 * last entry — `src/components/events/SalesDashboard.tsx` — was paid by plan
 * 41.1-21 and removed here after being re-derived from the tree with a raw
 * needle count that does NOT use the gates' shared comment stripper: asking the
 * gate what it thinks is not a check on the gate. Measured `<table` occurrences
 * in that file on 2026-08-14: **0**. The gate had been printing it STALE.
 *
 * **Why an empty list here does not become a number that lies.** This gate's
 * check A is a TREE-SIDE accounting, not a list-side one: it counts every
 * `<table` occurrence under `src/` and requires each to be the primitive, on
 * `REMAINING`, or the declared exemption. With the list empty the arithmetic is
 * 2 = 1 primitive + 0 remaining + 1 exempt, and an eighth hand-rolled table
 * added tomorrow makes check A fail as an unaccounted file — not as a missing
 * list entry. The migration can therefore be closed without the gate losing its
 * teeth, which is exactly the condition the guard was protecting.
 *
 * **What this does NOT say.** It does not say the cards carry the columns that
 * mattered. That is H41-3 — a person holding a phone — and it is still owed.
 * `null` here means the migration is open; an object means it is closed and the
 * guard requires all three fields, so this cannot be satisfied by a truthy
 * placeholder.
 */
export const MIGRATION_CLOSED = {
  date: '2026-08-14',
  by: 'plan 41.1-24',
  why:
    'every hand-rolled table on the work surface is gone; check A still accounts for ' +
    'every table occurrence in the tree, so an empty list is closable without the gate ' +
    'losing the ability to catch the next one',
};

export const REMAINING = [
  // PAID by plan 41-10 task 2 — `src/components/admin/MemberTable.tsx` opened
  // this list and holds no table now. Its line left in the same commit that
  // converted it, which is what a paid debt looks like: the number went 6 → 5
  // and nothing else moved. The gate printed it as STALE first — *"converted;
  // remove this entry"* — which is the notice that made this deletion a
  // response rather than a tidy.
  // PAID by plan 41.1-12 task 1 — `src/components/analytics/MemberSpendTable.tsx`
  // was seven columns in two hand-written branches, the file §8.8 named as the
  // best specimen of the technique this primitive consolidates, and it holds no
  // table now: one column declaration, seven slots. It is DataTable's second
  // adopter, which is what turns one proof into a pattern.
  //
  // PAID by plan 41.1-12 task 2 — `src/components/analytics/ReferralChainTable.tsx`
  // held the third. Its conversion is the one that changed a fact rather than a
  // layout: the old body held ONE cell spanning all three columns with a native
  // disclosure inside it, so three headers labelled columns no cell aligned to.
  // The three are actual cells now, and the disclosure became the expansion
  // apparatus, which is why that file crossed to the client.
  //
  // PAID by plan 41.1-13 — `src/components/analytics/DrinkSalesBreakdown.tsx`,
  // the fourth adopter, on the per-event analytics surface.
  //
  // PAID by plan 41.1-15 tasks 1 and 2 — `src/components/admin/TransactionList.tsx`
  // was the second of the two that switched at 1024px and is now the fifth
  // adopter at md. §8.9 named it as the first proof for the skeleton because it
  // defined a local placeholder eight lines below the import that could have
  // brought the shared one; that placeholder is gone.
  //
  // **The declared list went 5 → 1 and the work group went 5 → 1. The PRINTED
  // `REMAINING` did not move, and that is correct rather than suspicious.** This
  // gate prints two different numbers on purpose: `REMAINING entries declared`
  // is this constant's length, and `REMAINING` is the live count of declared
  // files that STILL render a table. All four files above stopped rendering one
  // in their own plans' commits, so the live count had already fallen to 1 and
  // the gate had been printing all four as STALE — *"converted; remove this
  // entry"* — ever since. The notice is what makes these four deletions a
  // response rather than a tidy, and a reader who conflates the two numbers will
  // read this commit as work vanishing.
  //
  // Deleted by plan 41.1-16 (D-41.1-22), after re-deriving each of the five from
  // the tree with a second instrument that deliberately does NOT use the gates'
  // shared comment stripper — asking the gate what it thinks is not a check on
  // the gate. Raw needle counts on 2026-08-14: 0, 0, 0, 0 for the four above and
  // **1** for the entry that stays. Tree and SUMMARYs agreed entry for entry; no
  // claim had to be refused.
  //
  // PAID by plan 41.1-21 task 1 — `src/components/events/SalesDashboard.tsx`
  // was the last entry on this list and the last hand-rolled table on the work
  // surface: a dual-render switching at 640px, on a surface that moves money.
  // It is DataTable's sixth importer now.
  //
  // **The declared list went 1 → 0. The PRINTED `REMAINING` did not move, and
  // that is correct rather than suspicious** — the same two-numbers distinction
  // this block already records above. `REMAINING entries declared` is this
  // constant's length; `REMAINING` is the live count of declared files that
  // STILL render a table. That file stopped rendering one in plan 41.1-21's own
  // commit, so the live count had already been 0 and the gate had been printing
  // it STALE — *"converted; remove this entry"* — ever since. The notice is what
  // makes this deletion a response rather than a tidy.
  //
  // Deleted by plan 41.1-24 (D-41.1-22), after re-deriving it from the tree with
  // a raw needle count that does not use the gates' shared comment stripper.
  // Measured 2026-08-14: **0**. Tree and SUMMARY agreed; no claim had to be
  // refused. The emptiness that results is declared in `MIGRATION_CLOSED` above.
];

/**
 * ── The three targets that named a surface which does not import the file ────
 *
 * Recorded here rather than edited away, in this file's own house shape
 * (`src/components/ui/PageShell.tsx:42-46`): **a decision undone without the
 * measurement that undid it reads as a slip**, and the next reader has no way
 * to tell a correction from a drive-by.
 *
 * What the three used to say, and what was measured on 2026-08-13:
 *
 *   - `DrinkSalesBreakdown` and `ReferralChainTable` both named an analytics
 *     surface with no segment on it. They do not share one: the first is
 *     mounted only by the **per-event** analytics page and the second only by
 *     **member** analytics, so the one string named neither of them correctly.
 *   - `TransactionList` named a tickets surface. **No tickets page imports it.**
 *     Its only importer is `/admin/finance`.
 *
 * The command, run per file, and its result is what is now on the line:
 *
 *   grep -rn "<ComponentName>" src --include="*.tsx" --include="*.ts"
 *
 *   MemberSpendTable      → (work)/analytics/members/page.tsx:4
 *   DrinkSalesBreakdown   → (work)/events/[id]/analytics/page.tsx:12
 *   ReferralChainTable    → (work)/analytics/members/page.tsx:6
 *   SalesDashboard        → (work)/events/[id]/sales/page.tsx:8
 *   TransactionList       → (work)/finance/page.tsx:2
 *
 * (`TransactionList` and `SalesDashboard` are also NAMED in three docblocks —
 * `(work)/newsletter/page.tsx:10`, `admin/events/[id]/reveal/VenueRevealPanel.tsx:172`,
 * `(work)/events/[id]/tickets/page.tsx:25` — and named is not imported. Reading
 * a mention as an importer is how a target string goes wrong in the first
 * place, so the distinction is written down instead of assumed.)
 *
 * **The class, which matters more than the three lines.** A reason travels with
 * an entry *so that it stays true*; if it can drift, it is decoration with the
 * authority of a measurement. Five of these were wrong across two gates —
 * three here and two in `verify-dialogs.mjs` — which is a **pattern**, not five
 * typos: every one of them was written from the file's PATH rather than from
 * its importer, and a path is not a surface. The rule that follows:
 * **re-derive the target from the importer, never from the folder the file
 * sits in.** `AssignmentsClient.tsx` on the sibling gate is the same lesson in
 * the opposite direction — it lives outside `(work)` and is a work file,
 * because a work page is the only thing that mounts it.
 */

/* ── the refusals, taken together, BEFORE any tick is printed ──────────────── */

console.log(
  '\n  verify-tables — one table implementation, one breakpoint, and the copies still standing\n'
);

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

if (!existsSync(`${ROOT}/${PRIMITIVE_FILE}`)) {
  refuse(
    `the primitive is not on disk at ${PRIMITIVE_FILE}. Checks A and B have nothing to\n` +
      '       read, and check C would be counting a debt against an implementation that does\n' +
      '       not exist. Nothing was measured.'
  );
}

if (!existsSync(`${ROOT}/${REVIEW_GRID_FILE}`)) {
  refuse(
    `the declared exemption names ${REVIEW_GRID_FILE}, which is not on disk.\n` +
      '       Exempting whatever later moves into that name would be worse than refusing:\n' +
      '       an exemption is a decision about a specific file, not about a path. Nothing\n' +
      '       was measured.'
  );
}

if (REMAINING.length === 0) {
  const c = MIGRATION_CLOSED;
  const complete =
    c &&
    typeof c === 'object' &&
    typeof c.date === 'string' &&
    c.date.length > 0 &&
    typeof c.by === 'string' &&
    c.by.length > 0 &&
    typeof c.why === 'string' &&
    c.why.length > 0;

  if (!complete) {
    refuse(
      'REMAINING is empty. If every hand-rolled table really is gone, that is the end of\n' +
        '       this migration and the emptiness should be a DECISION written above the constant —\n' +
        '       not a list that quietly emptied itself while nobody was reading.\n' +
        '       Set MIGRATION_CLOSED to an object carrying a date, the plan that closed it, and\n' +
        '       why. A truthy placeholder does not satisfy this: all three fields are required.'
    );
  }
}

const declaredPaths = new Map(
  REMAINING.map(([path, reason, target]) => [path, { reason, target }])
);

if (declaredPaths.size !== REMAINING.length) {
  refuse(
    `REMAINING has ${REMAINING.length} entries but only ${declaredPaths.size} distinct paths —\n` +
      '       a duplicated path means one of the two reasons is silently ignored.'
  );
}

/* ── the group tag, validated before any count is computed ─────────────────── */

const GROUP_TAG_SET = new Set(GROUP_TAGS);

for (const entry of REMAINING) {
  const [path, , , group] = entry;
  if (group === undefined || group === null || group === '') {
    refuse(
      `the REMAINING entry ${path} carries no group tag.\n` +
        `       Every entry declares one of: ${GROUP_TAGS.join(', ')}.\n` +
        '       This is a refusal and not a failure because an untagged entry does not make the\n' +
        '       per-group counts smaller — it makes them WRONG. The entry drops out of every\n' +
        "       group total while the totals still look plausible, and criterion 2 is read off\n" +
        '       one of those totals. Nothing was measured.'
    );
  }
  if (!GROUP_TAG_SET.has(group)) {
    refuse(
      `the REMAINING entry ${path} carries the group tag "${group}", which is not in the\n` +
        `       closed vocabulary: ${GROUP_TAGS.join(', ')}.\n` +
        '       The vocabulary is closed on purpose: a free-text group lets a typo open a fifth\n' +
        '       group of one entry that no criterion reads. If a fifth group is genuinely needed,\n' +
        '       that is a DECISION that edits GROUP_TAGS with its reason, not a string typed on an\n' +
        '       entry. Nothing was measured.'
    );
  }
}

if (declaredPaths.has(REVIEW_GRID_FILE)) {
  refuse(
    `${REVIEW_GRID_FILE} is BOTH the declared exemption and a REMAINING entry.\n` +
      '       Those are different kinds of thing: a file that will never convert, placed on a\n' +
      '       list that can only shrink, guarantees the number never reaches zero — and a debt\n' +
      '       whose number cannot reach zero is not a debt, it is a decoration.'
  );
}

const failures = [];

/* ────────────────────────────────────────────────────────────────────────────
 * The measurements
 * ──────────────────────────────────────────────────────────────────────────── */

function countNeedle(lines, needle) {
  let n = 0;
  for (const line of lines) {
    let from = 0;
    for (;;) {
      const at = line.indexOf(needle, from);
      if (at === -1) break;
      n += 1;
      from = at + needle.length;
    }
  }
  return n;
}

function tableHits(relPath) {
  const hits = [];
  liveLines(relPath).forEach((line, i) => {
    if (line.includes(TABLE_ELEMENT)) hits.push({ line: i + 1, source: line.trim() });
  });
  return hits;
}

const measuredTables = new Map();
let literalTableCount = 0;
for (const file of files) {
  const hits = tableHits(file);
  if (hits.length === 0) continue;
  literalTableCount += hits.length;
  measuredTables.set(file, hits);
}

console.log(`  files walked under src/       : ${files.length}`);
console.log(`  extensions in scope           : ${SCANNED_EXTENSIONS.join(', ')}`);
console.log(
  `  lines blanked as comments     : ${commentLinesBlanked}   (DEF-41-02, D-41.1-07)\n`
);

console.log('  declared exemptions: 1\n');
console.log(`      ${REVIEW_GRID_FILE}`);
console.log(`         ${REVIEW_GRID_REASON}\n`);

/* ── check A — one table implementation ───────────────────────────────────── */

const primitiveLines = liveLines(PRIMITIVE_FILE);
const primitiveTables = countNeedle(primitiveLines, TABLE_ELEMENT);

const undeclaredTables = [];
for (const [file, hits] of measuredTables) {
  if (file === PRIMITIVE_FILE) continue;
  if (file === REVIEW_GRID_FILE) continue;
  if (declaredPaths.has(file)) continue;
  undeclaredTables.push({ file, hits });
}

console.log('  check A — every table element under src/:\n');
console.log(`      literal "${TABLE_ELEMENT}" occurrences  : ${literalTableCount}`);
console.log(`      files carrying at least one   : ${measuredTables.size}`);
console.log(`      in the primitive              : ${primitiveTables}   (expected ${PRIMITIVE_TABLE_COUNT})`);
console.log(`      on REMAINING                  : ${REMAINING.length}`);
console.log(`      exempt                        : 1\n`);

if (primitiveTables < PRIMITIVE_TABLE_COUNT) {
  failures.push('A');
  console.log(
    `  ✗ A  the primitive carries ${primitiveTables} table element(s), expected ${PRIMITIVE_TABLE_COUNT}:\n\n` +
      `       ${PRIMITIVE_FILE}\n\n` +
      '       A primitive with no table passes every other check by having nothing to find.\n' +
      '       Either the implementation moved, or the needle stopped matching — and both of\n' +
      '       those are this gate going blind, not this gate being satisfied.\n'
  );
}

if (undeclaredTables.length > 0) {
  if (!failures.includes('A')) failures.push('A');
  console.log(
    `  ✗ A  ${undeclaredTables.length} file(s) render a table and are neither on REMAINING nor exempt:\n`
  );
  for (const { file, hits } of undeclaredTables) {
    console.log(`       ${file}`);
    for (const hit of hits) console.log(`         :${hit.line}  ${hit.source}`);
  }
  console.log(
    '\n       One table implementation exists: src/components/ui/DataTable.tsx. It renders one\n' +
      '       data array as a table above 768px and as cards below it, from one column\n' +
      '       declaration, with neither tree ever transformed. Import it — or, if this file\n' +
      '       genuinely cannot use it, say so on a REMAINING entry, which is a decision\n' +
      '       somebody will read.\n'
  );
}

if (!failures.includes('A')) {
  console.log(
    `  ✓ A  all ${literalTableCount} table element(s) in ${measuredTables.size} file(s) are accounted for:\n` +
      `       ${primitiveTables} in the primitive, ${REMAINING.length} on REMAINING, 1 exempt\n`
  );
}

/* ── check B — one breakpoint, and two trees never transformed ─────────────── */

const importers = [];
for (const file of files) {
  if (file === PRIMITIVE_FILE) continue;
  if (liveLines(file).join('\n').includes(PRIMITIVE_SPECIFIER)) importers.push(file);
}

const switchRows = SWITCH_SIGNATURE.map(([label, needle, expected]) => ({
  label,
  needle,
  expected,
  measured: countNeedle(primitiveLines, needle),
}));

/**
 * A branch-visibility utility carrying a breakpoint other than the permitted
 * one, in the primitive or in a file that imports it.
 */
const wrongBreakpoint = [];
for (const file of [PRIMITIVE_FILE, ...importers]) {
  liveLines(file).forEach((line, i) => {
    for (const bp of OTHER_BREAKPOINTS) {
      for (const utility of BRANCH_UTILITIES) {
        if (!branchUtilityPattern(bp, utility).test(line)) continue;
        wrongBreakpoint.push({
          file,
          line: i + 1,
          needle: `${bp}:${utility}`,
          source: line.trim(),
        });
      }
    }
  });
}

const displayOverrides = [];
for (const file of [PRIMITIVE_FILE, ...importers]) {
  liveLines(file).forEach((line, i) => {
    if (DISPLAY_OVERRIDE_RE.test(line)) {
      displayOverrides.push({ file, line: i + 1, source: line.trim() });
    }
  });
}

console.log('  check B — one breakpoint, two trees, neither transformed:\n');
console.log(`      the permitted breakpoint      : ${SWITCH_BREAKPOINT}`);
console.log(`      breakpoints refused           : ${OTHER_BREAKPOINTS.join(', ')}`);
console.log(`      files importing the primitive : ${importers.length}`);
for (const file of importers) console.log(`         ${file}`);
console.log('');
for (const row of switchRows) {
  const mark = row.measured < row.expected ? '✗' : row.measured > row.expected ? '!' : '·';
  console.log(
    `    ${mark}  ${row.label.padEnd(20)} expected ${row.expected}, measured ${row.measured}`
  );
}
console.log('');

const droppedSwitch = switchRows.filter((row) => row.measured < row.expected);
const grownSwitch = switchRows.filter((row) => row.measured > row.expected);

if (droppedSwitch.length > 0) {
  failures.push('B');
  console.log(`  ✗ B  ${droppedSwitch.length} half/halves of the branch switch are BELOW their expected count:\n`);
  for (const row of droppedSwitch) {
    console.log(`       ${row.label} — expected ${row.expected}, measured ${row.measured}`);
  }
  console.log(
    '\n       A switch that matches nothing passes every other check by measuring nothing.\n' +
      '       Either the primitive lost a branch, or the needle stopped matching.\n'
  );
}

if (wrongBreakpoint.length > 0) {
  if (!failures.includes('B')) failures.push('B');
  console.log(
    `  ✗ B  ${wrongBreakpoint.length} branch-visibility utilit(y/ies) name a breakpoint other than ${SWITCH_BREAKPOINT}:\n`
  );
  for (const hit of wrongBreakpoint) {
    console.log(`       ${hit.file}:${hit.line}   ${hit.needle}`);
    console.log(`         ${hit.source}`);
  }
  console.log(
    '\n       §2.1 gives this product ONE boundary between the phone form and everything\n' +
      '       above it, and §8.8 puts the table-or-cards switch on it. Six tables already\n' +
      '       dual-rendered before this primitive existed, at two DIFFERENT breakpoints, and\n' +
      '       ending that disagreement is what DS-09 actually is (D-41-17). A second\n' +
      '       breakpoint here restarts it.\n'
  );
}

if (displayOverrides.length > 0) {
  if (!failures.includes('B')) failures.push('B');
  console.log(`  ✗ B  ${displayOverrides.length} display override(s) on a table's parts:\n`);
  for (const hit of displayOverrides) {
    console.log(`       ${hit.file}:${hit.line}`);
    console.log(`         ${hit.source}`);
  }
  console.log(
    '\n       §8.8 rejects this technique BY NAME. MDN\'s ARIA table page documents that\n' +
      '       overriding the display of a table\'s parts destroys the native table semantics,\n' +
      '       and WebKit bugs 243474 and 257458 record header-and-cell association still\n' +
      '       breaking under it. This product\'s primary device is a phone, and on iOS every\n' +
      '       browser is WebKit — so the platform where the override is least reliable is the\n' +
      '       platform the card layout exists for. The mechanism is two trees, one hidden,\n' +
      '       NEITHER EVER TRANSFORMED.\n'
  );
}

if (!failures.includes('B')) {
  console.log(
    `  ✓ B  the primitive switches at ${SWITCH_BREAKPOINT} and at no other breakpoint, in itself and in\n` +
      `       its ${importers.length} importer(s), and no table part is transformed\n`
  );
  if (importers.length === 0) {
    console.log(
      '  !    HALF OF THAT TICK MEASURED NOTHING. No file imports the primitive yet, so the\n' +
        '       importer half of check B scanned zero files: only the primitive itself was read.\n' +
        '       Read this line, not the tick.\n'
    );
  }
}

if (grownSwitch.length > 0) {
  console.log(`  ! B  ${grownSwitch.length} half/halves of the switch appear MORE often than recorded:\n`);
  for (const row of grownSwitch) {
    console.log(`       ${row.label} — expected ${row.expected}, measured ${row.measured}`);
  }
  console.log(
    '\n       Not a failure: growth is not what this check defends against, and a gate that\n' +
      '       reddens on a correct file gets switched off. Printed loudly anyway, because a\n' +
      '       switch that doubled is usually a second branch pair arriving inside the file\n' +
      '       that exists to hold the only one.\n'
  );
}

/* ── check C — the declared list ───────────────────────────────────────────── */

const missing = [];
const stale = [];
for (const [path] of declaredPaths) {
  if (!existsSync(`${ROOT}/${path}`)) {
    missing.push(path);
    continue;
  }
  if (!measuredTables.has(path)) stale.push(path);
}

console.log('  check C — the tables still rendering their own:\n');
console.log(`      REMAINING entries declared    : ${REMAINING.length}`);
console.log(`      still carrying a table        : ${REMAINING.length - missing.length - stale.length}\n`);
for (const [path, , target, group] of REMAINING) {
  console.log(`      ${path}   [${group}]`);
  console.log(`         → ${target}`);
}

/**
 * The per-group counts, on the same basis as the total: an entry counts for its
 * group only while its file still renders a table. A missing path and a STALE
 * entry are already reported separately, and neither is a debt anybody owes.
 */
const owedByGroup = new Map(GROUP_TAGS.map((tag) => [tag, 0]));
const missingSet = new Set(missing);
const staleSet = new Set(stale);
for (const [path, , , group] of REMAINING) {
  if (missingSet.has(path) || staleSet.has(path)) continue;
  owedByGroup.set(group, owedByGroup.get(group) + 1);
}
const owedTotal = REMAINING.length - missing.length - stale.length;
const groupBreakdown = GROUP_TAGS.map((tag) => `${tag} ${owedByGroup.get(tag)}`).join(' · ');

console.log(`\n      REMAINING = ${owedTotal}      ${groupBreakdown}`);
console.log(`      WORK GROUP REMAINING = ${owedByGroup.get('work')}\n`);

if (owedByGroup.get('work') === 0) {
  console.log(
    '  ★  WORK GROUP REMAINING = 0 — no file on the work surface renders a table of its own.\n' +
      '     This is the line phase 41.1 criterion 2 is read off, and it now reads zero.\n\n' +
      '     Read it for exactly what it is. It says every work-surface entry left this list;\n' +
      '     it does NOT say the cards carry the columns that mattered (H41-3, a person holding\n' +
      '     a phone), and a count that FELL is not by itself evidence that work happened —\n' +
      '     a debt tracked by a proxy metric is closed by anything that moves the metric\n' +
      '     (D-41.1-16, four recorded recurrences). The per-wave reconciliation diffs the\n' +
      '     ENTRIES against the tree, never the count.\n'
  );
}

if (missing.length > 0) {
  failures.push('C');
  console.log(`  ✗ C  ${missing.length} REMAINING entr(y/ies) name a path that does not exist:\n`);
  for (const path of missing) console.log(`       ${path}`);
  console.log(
    '\n       A list that cannot be measured is a decoration, and a decoration that looks\n' +
      '       like a measurement is worse than nothing. If the file moved, its line moves\n' +
      '       with it in the same commit.\n'
  );
} else {
  console.log(
    `  ✓ C  every one of the ${REMAINING.length} declared entr(y/ies) names a file on disk, with the\n` +
      '       reason it is still there and the surface that will remove it\n'
  );
}

if (stale.length > 0) {
  console.log(`  ! C  ${stale.length} REMAINING entr(y/ies) are STALE — the file no longer renders a table:\n`);
  for (const path of stale) {
    console.log(`       ${path}  → converted; remove this entry`);
  }
  console.log(
    '\n       Not a failure: a converted file is correct, and a gate that goes red on a correct\n' +
      '       file gets switched off (§0 rule 3). Printed loudly anyway, because an entry left\n' +
      '       behind is a gate quietly loosened — it would permit re-adding exactly the table\n' +
      '       that was just removed.\n'
  );
}

/* ── verdict ──────────────────────────────────────────────────────────────── */

console.log('');
if (failures.length === 0) {
  const owed = REMAINING.length - missing.length - stale.length;
  console.log(
    `  TABLES_OK — all three checks passed. REMAINING = ${owed} file(s) still render a table\n` +
      '  of their own, and one is exempt for good.'
  );
  console.log(
    '\n  That number is the point of the green, not the tick. Read the header before treating\n' +
      '  this as safety: it reads CLASS STRINGS AND IMPORT CLAUSES, not behaviour. Whether the\n' +
      '  cards carry the columns that mattered, whether anything scrolls sideways at 390px,\n' +
      '  and whether a seven-column table is comprehensible as a card are H41-3 — a person\n' +
      '  holding a phone — and no tick here stands in for that.\n'
  );
  process.exit(0);
}
console.log(`  TABLES_FAIL — ${failures.length} check(s) failed: ${failures.join(', ')}\n`);
process.exit(1);
