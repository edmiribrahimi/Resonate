#!/usr/bin/env node
/**
 * verify-breakpoints.mjs — two prefixes are the contract, and the files still
 * carrying a third are a written list rather than somebody's memory.
 *
 * WHAT IT ASSERTS, in one sentence: **`xl:` and `2xl:` have ZERO occurrences in
 * the live lines under `src/`, and `sm:` appears only in the files `REMAINING`
 * declares, never more times than it records.**
 *
 * `41-UI-SPEC.md` §2.1 fixes the tiers on **two** of Tailwind's five defaults —
 * phone unprefixed, tablet `md:` (768px, the portrait-tablet edge exactly),
 * desktop `lg:` (1024px, iPad landscape). `sm:` 640px is the prefix that puts
 * the **tablet layout on a phone held sideways** and the **phone layout on a
 * portrait iPad**, which is why it is being removed rather than kept.
 *
 * D-41-05 decided the 44 existing `sm:` uses are **migrated, not
 * grandfathered**. That decision is what `REMAINING` encodes: not an exemption
 * nobody can see, but a debt with a number on it that can only go down.
 *
 * WHY A STRUCTURAL CHECK AND NOT A TEST. There is no test runner in this
 * repository — no `test` script, no `*.test.*`, no `*.spec.*` (`CLAUDE.md`
 * Guardrail 1). And `npm run build` cannot see this: `sm:grid-cols-3` is a
 * perfectly valid Tailwind class. It compiles, it emits a rule, it works. It is
 * wrong only against a contract written in a document, and a document does not
 * run. The failure it produces is not an error but a layout that is subtly wrong
 * at one width on one class of device — the kind nobody reports, because the
 * person seeing it assumes it is meant to look that way.
 *
 * ── WHAT A GREEN DOES NOT MEAN (cosa un verde NON significa) ────────────────
 *
 *   - THIS COUNTS PREFIXES, NOT LAYOUTS. A file using only `md:` and `lg:`
 *     passes this gate and can still be wrong at every width — columns that
 *     collide, a table that overflows, a control that lands under the thumb.
 *     **H41-1** — every converted surface observed at three widths by a person —
 *     is the only thing that says otherwise, and no green here stands in for it.
 *   - IT CANNOT SEE A PREFIX BUILT BY CONCATENATION. `` `${bp}:hidden` `` or a
 *     lookup table of class strings is invisible to it. This script reads text.
 *   - A GREEN ON `REMAINING` IS NOT PROGRESS. Twenty-two files still carrying
 *     `sm:` is a green, and it is supposed to be: the list exists so the gate can
 *     be switched on TODAY rather than after the migration, which is the whole
 *     of `verify-media-strip.mjs:51-62`'s lesson. Read the printed count, not
 *     the tick.
 *   - IT SAYS NOTHING ABOUT `md:` OR `lg:` BEING USED WELL. §2.2 records that
 *     the multi-column grid is the ONLY genuinely three-tier axis in the
 *     product; an `lg:` rule written on a dialog, a table or the navigation has
 *     invented a tier the contract does not have, and that is a review, not a
 *     regex.
 *   - IT DOES NOT SEE A `max-sm:` VARIANT IT WAS NOT TOLD ABOUT. `max-sm:` and
 *     `min-sm:` ARE counted (see the matching note). Any other arbitrary variant
 *     that reaches 640px by another spelling is not.
 *
 * ── THE TWO CHECKS ──────────────────────────────────────────────────────────
 *
 *   A. **No fourth prefix, anywhere.** `xl:` and `2xl:` have zero occurrences.
 *      No exemption, and none is coming: both were measured at zero on this
 *      tree, so this check has never had a legitimate exception to carry.
 *
 *   B. **`sm:` only where it is declared.** A file NOT in `REMAINING` carrying
 *      `sm:` fails. A file IN `REMAINING` carrying MORE than its recorded count
 *      fails. A `REMAINING` entry whose path does not exist fails — a list that
 *      cannot be measured is a decoration, and a decoration that looks like a
 *      measurement is worse than nothing (`.claude/rules/ai-engineering.md`,
 *      *un gate deve poter fallire*).
 *
 *      Carrying FEWER than recorded is NOT a failure — it is a conversion in
 *      progress, and a gate that went red on a half-converted correct file is a
 *      gate that gets switched off (§0 rule 3). It is reported as a STALE
 *      notice instead, loudly, because a count left too high is a gate quietly
 *      loosened: it would permit re-adding what was just removed.
 *
 * ── ON EXEMPTING PHASE 42'S PATHS, WHICH THIS GATE DOES NOT DO ──────────────
 *
 * §0 rule 7 asks every gate in this phase to exempt `src/app/(admin)/**\/scanner/**`,
 * `src/components/scanner/**` and `src/app/(admin)/door/**` by path. §13's G6 row
 * says this gate's exemptions are *"none. This one has no legitimate exception,
 * which is what makes it worth writing"*. The two are in tension, and
 * `meta-gates.md` resolves it: **when two gates produce contradictory
 * requirements, the more restrictive wins.** No path exemption, therefore.
 *
 * Nothing is being forced by that choice — the door and the scanner carry
 * **zero** `sm:`, `xl:` and `2xl:` today, so the strict reading costs them
 * nothing. If Phase 42 needs a breakpoint there, it needs `md:` or `lg:` like
 * everything else, and that is the contract rather than an oversight.
 *
 * ── THE BOUNDARY GUARDS, AND THE FILE THAT PROVED THEY ARE BOTH NEEDED ──────
 *
 * The pattern is `(?<![a-zA-Z0-9-])(?:max-|min-)?NAME:(?=[a-z!\[-])`, and each
 * of the three parts was earned:
 *
 * LEADING, zero-width. Without `(?<![a-zA-Z0-9-])`, the name `xl` is found
 * inside `2xl:hidden` and every `2xl:` is counted twice, once under each name.
 * It is the same guard `verify-tokens.mjs:535-554` documents, for the same
 * reason — `--line` is a prefix of `--line-soft` there, `xl` of `2xl` here.
 *
 * TRAILING, zero-width, AND THIS ONE IS NOT COSMETIC. A Tailwind prefix is
 * followed immediately by a class name; an object key is followed by a space.
 * `src/components/ui/Skeleton.tsx:34-36` is:
 *
 *     sm: "h-8 w-8",
 *     md: "h-12 w-12",
 *     lg: "h-16 w-16",
 *
 * — a TypeScript size map, entirely correct, containing no breakpoint at all.
 * Without the trailing guard this gate opens red on it, and §0 rule 3 says
 * exactly what happens next: the gate goes red on a correct file, somebody
 * switches it off, and it guards nothing. The precedent is written into
 * `verify-media-strip.mjs:51-62` because this repository has already paid for it
 * twice. Worse than the red would have been the "fix": putting `Skeleton.tsx` on
 * `REMAINING` with a reason claiming a migration that does not exist, and then
 * one day migrating a size API to `md:`.
 *
 * THE GUARDS ARE VERIFIED BY RECONCILIATION, not by inspection. With both,
 * this script measures **44 uses in 22 files** for `sm:`, **5 in 3** for `lg:`,
 * and **zero** for `md:`, `xl:` and `2xl:` — which is, line for line,
 * `41-UI-SPEC.md` §1's independently taken inventory. Without the trailing
 * guard it measures 45 in 23, 6 in 4, and 1 `md:`, and reconciles with nothing.
 * `grep -rlE '\bsm:' src --include='*.tsx' | wc -l` returns **23** for the same
 * reason, and is the wrong oracle for this list.
 *
 * `max-sm:` AND `min-sm:` ARE COUNTED as `sm:` uses. They are how somebody keeps
 * a 640px line while passing a gate that only looks for the bare prefix. Neither
 * appears in the tree today (measured zero); the alternation costs nine
 * characters and closes the evasion before it is invented.
 *
 * ── COMMENT HYGIENE, WHICH IS LOAD-BEARING HERE ─────────────────────────────
 *
 * Comment lines are blanked BEFORE any counting, with the line-shape heuristic
 * (`//`, `*`, `/*`, `*​/`) that `verify-tokens.mjs:437-450` and
 * `verify-media-strip.mjs:163` already use — deliberately not a tokeniser,
 * because WR-07 (`32-REVIEW.md`) records that a real comment parser written here
 * was unsound. It matters concretely: several files document their dual-render
 * by quoting `sm:hidden` in a docblock, and a check invalidated by its own
 * documentation is a precedent this repository has already recorded.
 *
 * The heuristic's error direction is to KEEP a trailing comment on a code line,
 * which can only make this script report MORE. Both checks fail on presence, so
 * that direction is safe.
 *
 * ── WHY THE HELPERS ARE LOCAL AND NOT IMPORTED ──────────────────────────────
 *
 * `41-02-PLAN.md` asked for `listScannableFiles` and `liveLines` to be imported
 * from `./verify-tokens.mjs`, which exports both. **They cannot be**:
 *
 *     node -e "import('./scripts/verify-tokens.mjs').then(…)"
 *     → prints all seven TOKENS checks, then TOKENS_OK, then exits 0.
 *       The `.then` never runs.
 *
 * `verify-tokens.mjs` runs its checks at module scope and ends in
 * `process.exit()` (`:1041-1058`), so importing it RUNS THE TOKEN GATE AND EXITS
 * THIS PROCESS WITH THE TOKEN GATE'S VERDICT — this script would exit 0 having
 * measured nothing, which is the spoofing threat T-41-06 it exists to defend
 * against. The cross-script import the plan cites
 * (`verify-capabilities.mjs:145`) works because its target `rls-baseline.mjs`
 * has a main-module guard at `:2594`. The three sibling GATES
 * (`verify-media-strip.mjs:130,163`, `verify-sunset-gradient.mjs:152,185`,
 * `verify-semantic-separation.mjs:270,303`) each declare their own walk and
 * their own `isCommentLine`: self-contained is the house shape for a gate.
 *
 * SECRECY. `.planning/` is tracked and this repository is PUBLIC (`CLAUDE.md`
 * Guardrail 5). This script reads only committed files, prints only paths, line
 * numbers and source lines, opens no network connection, reads no environment
 * variable and writes no artefact.
 *
 * Zero dependencies. Node built-ins only, ESM. Deliberately NOT wired into
 * `npm run build`: `next build` is the type gate, and a type gate that starts
 * failing for a reason that is not a type teaches everyone to ignore it.
 *
 * Usage:
 *   node scripts/verify-breakpoints.mjs
 *
 * (Not registered in `package.json` by plan 41-02. Plan 41-12 owns that file and
 * registers all six new gates at once, so no two plans in a wave contend for it.)
 *
 * Exit codes:
 *   0  both checks passed
 *   1  at least one failed — each is printed with its file and its count
 *   2  nothing was measured: `src/` is missing, or the walk found no scannable
 *      file. No verdict is implied by a 2.
 */

import { readdirSync, readFileSync, existsSync, lstatSync } from 'node:fs';
import { dirname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SRC_DIR = `${ROOT}/src`;

/** The prefixes §2.1 forbids outright. Measured zero; the gate keeps them zero. */
export const FORBIDDEN_PREFIXES = ['xl', '2xl'];

/** The prefix being migrated away. Its debt is `REMAINING`. */
export const MIGRATING_PREFIX = 'sm';

/**
 * Every file still carrying `sm:`, with the count it carries today and the
 * conversion unit that will remove it.
 *
 * **Measured on this tree, not copied**: 44 uses in 22 files, which reconciles
 * exactly with `41-UI-SPEC.md` §1's independent inventory. The class-by-class
 * destination of each use is §2.3.
 *
 * THE DISCIPLINE, which is the whole point of the constant existing:
 *
 *   - **Removing an entry is what converting a surface looks like.** When the
 *     last `sm:` leaves a file, its line leaves this list in the same commit.
 *   - **Lowering a count is a partial conversion**, and is allowed. The gate
 *     reports a count left too high as STALE rather than failing, because a
 *     stale-high count is a loosened gate.
 *   - **Adding an entry is a DECISION that edits this constant** — not a diff
 *     nobody reads (`verify-sunset-gradient.mjs:141-149`). It means somebody
 *     chose 640px over §2.1's two tiers, and the reason belongs on the line.
 *   - The reason travels WITH the entry (`verify-routes.mjs:130-152`), because
 *     a list of paths with the reasons kept somewhere else is a list whose
 *     reasons stop being true without anybody noticing.
 *
 * Only files a measurement actually found are listed. An entry no file backs is
 * a decoration that makes the list look thorough, so a missing path FAILS check
 * B rather than being skipped.
 */
export const REMAINING = [
  // ── the multi-column grid axis (§2.2) — the one genuinely three-tier axis.
  // `sm:grid-cols-2` becomes `md:grid-cols-2`; `sm:grid-cols-3` becomes
  // `md:grid-cols-2 lg:grid-cols-3`, gaining the middle step it skipped.
  [
    'src/app/(admin)/admin/(work)/analytics/loading.tsx',
    2,
    'the analytics KPI grids — the grid axis, §2.2 (one grid-cols-3 gains its middle step)',
  ],
  [
    'src/app/(admin)/admin/(work)/analytics/members/loading.tsx',
    1,
    'the member-analytics skeleton grid — the grid axis, §2.2',
  ],
  [
    'src/app/(admin)/admin/(work)/analytics/members/page.tsx',
    1,
    'the member-analytics KPI grid — the grid axis, §2.2',
  ],
  [
    'src/app/(admin)/admin/(work)/analytics/page.tsx',
    1,
    'the analytics overview KPI grid — the grid axis, §2.2',
  ],
  [
    'src/app/(admin)/admin/(work)/events/[id]/analytics/loading.tsx',
    1,
    'the per-event analytics skeleton grid — the grid axis, §2.2',
  ],
  [
    'src/app/(admin)/admin/(work)/events/[id]/analytics/page.tsx',
    1,
    'the per-event analytics KPI grid — the grid axis, §2.2',
  ],
  // PAID by plan 41-08 — `src/app/(public)/gallery/loading.tsx` (2) and
  // `src/components/media/MediaGrid.tsx` (1) held three of this list's uses and
  // hold none now. The grids they carry gained §2.2's desktop step and kept
  // their phone layout, which is what §2.3's map actually says for a grid whose
  // base column count was never itself a prefixed rule.
  ['src/components/analytics/KPIDashboard.tsx', 1, 'the KPI card grid — the grid axis, §2.2'],
  [
    'src/components/media/MediaReviewGrid.tsx',
    1,
    'the moderation grid — the grid axis, §2.2 (its lg:grid-cols-3 already stays, §2.3)',
  ],
  ['src/components/media/MediaUpload.tsx', 1, 'the upload preview grid — the grid axis, §2.2'],

  // ── the four sheet modals — absorbed by the Dialog primitive, §8.3. These
  // uses are not migrated to `md:` and then kept: the primitive owns
  // `items-end md:items-center` and the sheet radius, so the classes are
  // DELETED from the call site when the surface converts.
  [
    'src/app/(public)/events/[slug]/RedeemConfirmationModal.tsx',
    4,
    'a sheet modal — absorbed by the Dialog primitive, §8.3 (plus one sm:text-5xl, §2.1)',
  ],
  [
    'src/app/(public)/events/[slug]/SumUpCheckoutModal.tsx',
    4,
    'a sheet modal — absorbed by the Dialog primitive, §8.3 (its sm:max-h-[90vh] becomes an unprefixed max-h-[85dvh], §2.3)',
  ],
  [
    'src/app/(public)/events/[slug]/menu/GuestLoginBanner.tsx',
    3,
    'a sheet modal — absorbed by the Dialog primitive, §8.3',
  ],
  [
    'src/app/(public)/events/[slug]/menu/GuestTokenDisplay.tsx',
    4,
    'a sheet modal — absorbed by the Dialog primitive, §8.3 (plus one sm:text-5xl, §2.1)',
  ],

  // ── the table dual-renders — consolidated onto the one table breakpoint,
  // `md`, by the DataTable primitive, §8.8. `sm:block` / `sm:hidden` is the
  // cards-or-table switch.
  [
    'src/components/analytics/DrinkSalesBreakdown.tsx',
    2,
    'a table dual-render — consolidated onto md by DataTable, §8.8',
  ],
  [
    'src/components/analytics/MemberSpendTable.tsx',
    2,
    'a table dual-render — consolidated onto md by DataTable, §8.8',
  ],
  [
    'src/components/analytics/ReferralChainTable.tsx',
    2,
    'a table dual-render — consolidated onto md by DataTable, §8.8',
  ],
  [
    'src/components/events/SalesDashboard.tsx',
    2,
    'a table dual-render — consolidated onto md by DataTable, §8.8',
  ],
  [
    'src/components/admin/MemberTable.tsx',
    4,
    'the filter grid (§2.2) and the toolbar row (§2.1) — the dual-render itself is already lg: and moves to md: with DataTable, §8.8',
  ],
  [
    'src/components/admin/TransactionList.tsx',
    3,
    'the filter grid (§2.2) and the toolbar row (§2.1) — the dual-render itself is already lg: and moves to md: with DataTable, §8.8',
  ],

  // ── a plain md: equivalent, §2.1.
  [
    'src/app/(admin)/admin/events/[id]/assignments/AssignmentsClient.tsx',
    1,
    'one sm:grid-cols-[1fr_auto_auto] assignment row — its md: equivalent, §2.1',
  ],
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
 * The matcher for one breakpoint prefix. Both guards are zero-width, so two
 * prefixes on one line cannot swallow each other. See the boundary-guard
 * paragraph for why each part is there.
 */
export function prefixPattern(name) {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(?<![a-zA-Z0-9-])(?:max-|min-)?${escaped}:(?=[a-z!\\[-])`, 'g');
}

/** Every use of `name` in `relPath`'s live lines, as `{ line, source }`. */
export function findPrefixUses(relPath, name) {
  const pattern = prefixPattern(name);
  const hits = [];
  liveLines(relPath).forEach((line, i) => {
    const matches = line.match(pattern);
    if (!matches) return;
    for (let k = 0; k < matches.length; k += 1) {
      hits.push({ line: i + 1, source: line.trim() });
    }
  });
  return hits;
}

// ── the refusals, taken together, BEFORE any tick is printed ────────────────

console.log('\n  verify-breakpoints — two prefixes, and a written list of the files still carrying a third\n');

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

if (REMAINING.length === 0) {
  refuse(
    'REMAINING is empty. If every sm: really is gone, this gate has become check A\n' +
      '       alone and the emptiness should be a DECISION written above the constant —\n' +
      '       not a list that quietly emptied itself.'
  );
}

const failures = [];
console.log(`  files walked under src/: ${files.length}\n`);

// ── check A — no fourth prefix, anywhere ───────────────────────────────────

const forbiddenHits = new Map();
for (const name of FORBIDDEN_PREFIXES) {
  const hits = [];
  for (const file of files) {
    for (const hit of findPrefixUses(file, name)) hits.push({ file, ...hit });
  }
  forbiddenHits.set(name, hits);
}

console.log('  check A — the prefixes §2.1 forbids outright:\n');
for (const name of FORBIDDEN_PREFIXES) {
  const n = forbiddenHits.get(name).length;
  console.log(`    ${n === 0 ? '·' : '✗'}  ${String(n).padStart(3)}  ${name}:`);
}
console.log('');

for (const name of FORBIDDEN_PREFIXES) {
  const hits = forbiddenHits.get(name);
  if (hits.length === 0) continue;
  if (!failures.includes('A')) failures.push('A');
  console.log(`  ✗ A  ${name}: — ${hits.length} occurrence(s), and this prefix has no exemption:\n`);
  for (const hit of hits) {
    console.log(`       ${hit.file}:${hit.line}`);
    console.log(`         ${hit.source}`);
  }
  console.log('');
}

if (!failures.includes('A')) {
  console.log(`  ✓ A  xl: and 2xl: have zero occurrences in ${files.length} file(s) under src/\n`);
}

// ── check B — sm: only where it is declared ────────────────────────────────

const declared = new Map(REMAINING.map(([path, count, reason]) => [path, { count, reason }]));

if (declared.size !== REMAINING.length) {
  refuse(
    `REMAINING has ${REMAINING.length} entries but only ${declared.size} distinct paths —\n` +
      '       a duplicated path means one of the two counts is silently ignored.'
  );
}

const measured = new Map();
let measuredTotal = 0;
for (const file of files) {
  const hits = findPrefixUses(file, MIGRATING_PREFIX);
  if (hits.length === 0) continue;
  measured.set(file, hits);
  measuredTotal += hits.length;
}

const undeclared = [];
const grown = [];
const stale = [];
const missing = [];

for (const [path, { count }] of declared) {
  if (!existsSync(`${ROOT}/${path}`)) {
    missing.push(path);
    continue;
  }
  const actual = (measured.get(path) ?? []).length;
  if (actual > count) grown.push({ path, declared: count, actual });
  else if (actual < count) stale.push({ path, declared: count, actual });
}

for (const [file, hits] of measured) {
  if (!declared.has(file)) undeclared.push({ file, hits });
}

const declaredTotal = REMAINING.reduce((sum, [, count]) => sum + count, 0);

console.log('  check B — sm:, against the declared list:\n');
console.log(`      REMAINING entries declared : ${REMAINING.length}`);
console.log(`      sm: uses declared          : ${declaredTotal}`);
console.log(`      files measured carrying sm: : ${measured.size}`);
console.log(`      sm: uses measured          : ${measuredTotal}`);

const heaviest = [...measured.entries()].sort((a, b) => b[1].length - a[1].length).slice(0, 3);
if (heaviest.length > 0) {
  console.log('\n      the three files with the most remaining:');
  for (const [file, hits] of heaviest) {
    console.log(`        ${String(hits.length).padStart(3)}  ${file}`);
  }
}
console.log('');

if (missing.length > 0) {
  failures.push('B');
  console.log(`  ✗ B  ${missing.length} REMAINING entr(y/ies) name a path that does not exist:\n`);
  for (const path of missing) console.log(`       ${path}`);
  console.log(
    '\n       A list that cannot be measured is a decoration. If the file was deleted or\n' +
      '       moved, its line leaves REMAINING in the same commit.\n'
  );
}

if (undeclared.length > 0) {
  if (!failures.includes('B')) failures.push('B');
  console.log(`  ✗ B  ${undeclared.length} file(s) carry sm: and are not on REMAINING:\n`);
  for (const { file, hits } of undeclared) {
    console.log(`       ${file} — ${hits.length} use(s)`);
    for (const hit of hits) console.log(`         :${hit.line}  ${hit.source}`);
  }
  console.log(
    '\n       §2.1 fixes the tiers on md: (768px, the portrait-tablet edge) and lg: (1024px).\n' +
      '       sm: 640px puts the tablet layout on a phone held sideways and the phone layout\n' +
      '       on a portrait iPad. Use md: — or, if 640px really is the right line for this\n' +
      '       surface, say so on a REMAINING entry, which is a decision somebody will read.\n'
  );
}

if (grown.length > 0) {
  if (!failures.includes('B')) failures.push('B');
  console.log(`  ✗ B  ${grown.length} file(s) on REMAINING carry MORE sm: than recorded:\n`);
  for (const { path, declared: d, actual } of grown) {
    console.log(`       ${path} — declared ${d}, measured ${actual} (+${actual - d})`);
    for (const hit of measured.get(path) ?? []) {
      console.log(`         :${hit.line}  ${hit.source}`);
    }
  }
  console.log(
    '\n       REMAINING is a debt that only goes down. A file on it may be converted or left\n' +
      '       alone; it may not grow. Adding a use here is choosing 640px on a surface already\n' +
      '       scheduled to leave it.\n'
  );
}

if (failures.includes('B') === false) {
  console.log(
    `  ✓ B  sm: appears in ${measured.size} file(s), every one of them declared, none above its\n` +
      `       recorded count — ${measuredTotal} use(s) still to migrate (D-41-05)\n`
  );
}

if (stale.length > 0) {
  console.log(`  ! B  ${stale.length} REMAINING entr(y/ies) are STALE — the file carries fewer than recorded:\n`);
  for (const { path, declared: d, actual } of stale) {
    console.log(
      `       ${path} — declared ${d}, measured ${actual}` +
        (actual === 0 ? '  → converted; remove this entry' : `  → lower the count to ${actual}`)
    );
  }
  console.log(
    '\n       Not a failure: a half-converted file is correct, and a gate that goes red on a\n' +
      '       correct file gets switched off (§0 rule 3). It is printed loudly anyway, because\n' +
      '       a count left too high is a gate quietly loosened — it would permit re-adding\n' +
      '       exactly what was just removed.\n'
  );
}

// ── verdict ────────────────────────────────────────────────────────────────
console.log('');
if (failures.length === 0) {
  console.log(
    `  BREAKPOINTS_OK — both checks passed. ${measured.size} file(s) still carry sm:, ` +
      `${measuredTotal} use(s).`
  );
  console.log(
    '\n  That number is the point of the green, not the tick. Read the header before\n' +
      '  treating this as safety: it counts PREFIXES, NOT LAYOUTS. A file using only md:\n' +
      '  and lg: passes here and can still be wrong at every width. H41-1 — every converted\n' +
      '  surface observed at three widths by a person — is the only thing that says\n' +
      '  otherwise, and it is a human’s.\n'
  );
  process.exit(0);
}
console.log(`  BREAKPOINTS_FAIL — ${failures.length} check(s) failed: ${failures.join(', ')}\n`);
process.exit(1);
