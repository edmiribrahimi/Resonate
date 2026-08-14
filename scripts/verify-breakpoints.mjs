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
 *      Since 41.1-03 every entry also carries a **group tag** from a closed
 *      vocabulary, assigned from the file's measured importer and never from
 *      its path. Check B prints files and uses per group plus a
 *      `WORK GROUP REMAINING` line — the line phase 41.1's criterion 4 is read
 *      off. A missing or unknown tag is a **refusal**, not a failure: see
 *      `GROUP_TAGS`.
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
 * Comment lines are blanked BEFORE any counting — deliberately not by a
 * tokeniser, because WR-07 (`32-REVIEW.md`) records that a real comment parser
 * written here was unsound. It matters concretely: several files document their
 * dual-render by quoting a 640px-prefixed utility in a docblock, and a check
 * invalidated by its own documentation is a precedent this repository has
 * already recorded.
 *
 * **The blanking is now done by `scripts/lib/comments.mjs`, and the sentence
 * that stood here about its error direction was half right.** It said the
 * heuristic's error direction is *to KEEP a trailing comment on a code line,
 * which can only make this script report MORE* — true of a trailing comment, and
 * false of a multi-line one, where the four-line heuristic handed every body
 * line back as code. That is a **false red on a correct file**, not
 * over-reporting, and §0 rule 3 says what happens next: the gate reddens,
 * somebody switches it off, and it guards nothing. `41.1-RESEARCH.md` §4.2
 * measured it on three of seven shapes.
 *
 * The merged stripper's error direction is the opposite and the safe one: a line
 * whose first characters are a block opener inside a string blanks MORE than it
 * should. Both checks here fail on presence, so blanking more can only
 * under-report, never redden a correct file.
 *
 * ── WHY THE WALK IS LOCAL AND THE STRIPPER IS NOT ───────────────────────────
 *
 * `41-02-PLAN.md` asked for `listScannableFiles` and `liveLines` to be imported
 * from `./verify-tokens.mjs`, which exports both. **They cannot be**:
 *
 *     node -e "import('./scripts/verify-tokens.mjs').then(…)"
 *     → prints all seven TOKENS checks, then TOKENS_OK, then exits 0.
 *       The `.then` never runs.
 *
 * `verify-tokens.mjs` runs its checks at module scope and ends in
 * `process.exit()`, so importing it RUNS THE TOKEN GATE AND EXITS THIS PROCESS
 * WITH THE TOKEN GATE'S VERDICT — this script would exit 0 having measured
 * nothing, which is the spoofing threat T-41-06 it exists to defend against.
 *
 * **The conclusion drawn from that was too wide, and this is the correction.**
 * The paragraph used to end *"each declare their own walk and their own
 * `isCommentLine`: self-contained is the house shape for a gate"*, and the
 * second half of it had a price: `41.1-PATTERNS.md` §5.1 measured **six
 * byte-identical copies** of that four-line function, digest `35d258011314`,
 * two of them in scripts nobody had counted. What made `verify-tokens.mjs`
 * unimportable was its **process exit at module scope**, not the fact of
 * importing — the precedent that always worked (`verify-capabilities.mjs:145`
 * importing `rls-baseline.mjs`) works because its target has a main-module
 * guard. `scripts/lib/comments.mjs` is not a gate at all: it never exits, prints
 * nothing and asserts nothing. So the walk stays local and the stripper is
 * imported (D-41.1-07).
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
 *   2  nothing was measured: `src/` is missing, the walk found no scannable
 *      file, `REMAINING` is empty, or a `REMAINING` entry carries a group tag
 *      that is missing or outside the closed vocabulary. No verdict is implied
 *      by a 2. The last of those is a refusal and not a failure for a stated
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

/** The prefixes §2.1 forbids outright. Measured zero; the gate keeps them zero. */
export const FORBIDDEN_PREFIXES = ['xl', '2xl'];

/** The prefix being migrated away. Its debt is `REMAINING`. */
export const MIGRATING_PREFIX = 'sm';

/**
 * The four groups a `REMAINING` entry may belong to, and the only four.
 *
 * **Why the tag is load-bearing HERE, unlike on `verify-tables.mjs`.** Phase
 * 41.1's criterion 4 reads *"G6's `REMAINING` is empty for the work group"*,
 * and this list is **mixed**: 1 of its 6 entries is the work surface and 5 are
 * not. Without the tag the criterion is satisfied by eye, off a flat list of
 * paths, and **a criterion that cannot be read off a gate is a claim**
 * (D-41.1-11). The sibling gate's entries all happen to be `work`; these do not,
 * and never did.
 *
 * *(This paragraph read "14 of its 19 entries" when it was written in 41.1-03,
 * and the ratio has moved the whole way the phase intends it to: **every one of
 * the thirteen entries that has left this list was `work`, and not one
 * `public-member-money` entry has moved at all.** That is the criterion working
 * rather than the tag drifting — 41.2 owns the five that remain. Restated here
 * with today's figures because the argument is about a RATIO, and a ratio quoted
 * from a list that has since halved is an argument the next reader cannot
 * check.)*
 *
 * **An unknown or missing tag is a REFUSAL (exit 2), not a failure** — the same
 * distinction this gate already draws: a failure says *the tree is wrong*, a
 * refusal says *nothing was measured*. An entry with no group does not make the
 * per-group counts smaller, it makes them **wrong**: the entry drops out of
 * every group while the totals still look plausible, and criterion 4 is read
 * off one of those totals.
 *
 * The vocabulary is closed rather than free text so a typo — `work ` with a
 * trailing space, `Work`, `works` — cannot open a fifth group of one entry that
 * no criterion reads.
 *
 *   - `work`                — the work surface Phase 41.1 converts
 *   - `public-member-money` — the public / member / money surfaces, Phase 41.2's
 *   - `phase-42`            — deferred to Phase 42
 *   - `exempt`              — carried for a reason that will never be paid
 *
 * `phase-42` and `exempt` are in the vocabulary for completeness and are not
 * used on this list today.
 */
export const GROUP_TAGS = ['work', 'public-member-money', 'phase-42', 'exempt'];

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
 *   - **A GROUP COUNT THAT FALLS IS SUBJECT TO THE SAME DEFECT AS A TOTAL THAT
 *     FALLS.** This rule is new in 41.1-03 and it is the one the other four do
 *     not carry. *A debt tracked by a proxy metric is closed by anything that
 *     moves the metric* (D-41.1-16, four recorded recurrences in this project).
 *     Splitting the debt into groups multiplies the proxies rather than fixing
 *     them: `WORK GROUP REMAINING = 0` is reached just as well by converting
 *     fourteen files as by re-tagging one of them `phase-42`. So the per-wave
 *     reconciliation **diffs the ENTRIES against the tree, never the counts** —
 *     and a tag that changed is a decision that has to be defended on the line,
 *     exactly like a count that went down.
 *
 * Only files a measurement actually found are listed. An entry no file backs is
 * a decoration that makes the list look thorough, so a missing path FAILS check
 * B rather than being skipped.
 *
 * ── The `group` column, added in 41.1-03 ────────────────────────────────────
 *
 * A fourth field, not a fourth list: the count and the reason already travel
 * with the entry, and the group has to travel the same way or an entry sits in
 * the wrong list silently. (`conversion-manifest.mjs:80` carries a state column
 * the same way and says in its docblock that the column is load-bearing.)
 *
 * **Every tag is assigned from the file's measured IMPORTER, never from its
 * path prefix.** Two entries make that a rule rather than a preference, and
 * they fail in opposite directions:
 *
 *   - `src/components/media/MediaUpload.tsx` is **not** under
 *     `(public)/events/[slug]/**` at all — it is a shared component — and it is
 *     nonetheless `public-member-money`, because its only importer is
 *     `src/app/(public)/events/[slug]/MediaGallerySection.tsx:8`. **A tag
 *     derived from a glob would have missed it**, and it would have been
 *     counted as one of the fourteen files Phase 41.1 has to clear.
 *   - `AssignmentsClient.tsx` lives outside `(work)` — R-WORK-ROUTES keeps
 *     non-route modules a level out — and is `work`, because the only thing
 *     that mounts it is
 *     `src/app/(admin)/admin/(work)/events/[id]/assignments/page.tsx:8`.
 *
 * That single pair is the whole argument for tagging by **decision**: the path
 * is where a file lives, the importer is which surface it is on, and only the
 * second one is what a criterion about a surface means. It is the same class of
 * defect as the three wrong target strings 41.1-03 corrected on
 * `verify-tables.mjs` — all of them written from the folder rather than the
 * importer.
 *
 * **The measured split, and a corrected estimate.** `41.1-CONTEXT.md`'s
 * D-41.1-11 estimated *"roughly fifteen are work-group and four are
 * `(public)/events/[slug]/**`"*. Measured on this tree on 2026-08-13 it is
 * **14 work / 21 uses** and **5 public-member-money / 16 uses** — the fifth
 * being `MediaUpload.tsx` above, which is why the estimate of four was low.
 * The correction is recorded with its command rather than silently applied:
 *
 *   grep -rn "<ComponentName>" src --include="*.tsx" --include="*.ts"
 *
 * run once per entry, reading only the `import` lines and discarding mentions
 * inside docblocks — a file NAMED in a comment is not a file imported, and
 * reading the one as the other is how these strings go wrong.
 *
 * Shape: `[path, count, reason, group]`.
 */
/**
 * ── THE LIST IS EMPTY, AND THAT IS A DECISION RATHER THAN A DRIFT ────────────
 *
 * The emptiness guard below refuses an empty `REMAINING` and says why in its own
 * sentence: *"the emptiness should be a DECISION written above the constant —
 * not a list that quietly emptied itself."* This is that decision, and the guard
 * now reads it instead of refusing blind. The shape is
 * `verify-tables.mjs:534-571`'s, **copied rather than invented**, because a gate
 * in this tree has already made this transition once and inventing a second
 * shape for the same act is how two gates stop being comparable.
 *
 * **Written 2026-08-14 by plan 41.2-19, the phase's final reconciliation.** The
 * last five entries were all `public-member-money`, all PAID, and all had been
 * printing STALE — *"declared N, measured 0 → converted; remove this entry"* —
 * since their own plans' commits:
 *
 *   - `src/components/media/MediaUpload.tsx` (1) — plan 41.2-18, and it held the
 *     tree's **LAST** use of the retired tier. Its grid axis was MIGRATED by
 *     copying the analog's RULE rather than its literal string: the base stays
 *     at two columns because these are square thumbnails.
 *   - `…/events/[slug]/RedeemConfirmationModal.tsx` (4) — plan 41.2-10.
 *   - `…/events/[slug]/SumUpCheckoutModal.tsx` (4) — plan 41.2-10, the shared
 *     money core.
 *   - `…/events/[slug]/menu/GuestLoginBanner.tsx` (3) — plan 41.2-02, one of the
 *     two unreachable files D-41.2-03 ordered converted.
 *   - `…/events/[slug]/menu/GuestTokenDisplay.tsx` (4) — plan 41.2-12.
 *
 * **The two bartender files are on this list's DELETIONS and on the sibling
 * gate's EXEMPTIONS, and that is not a contradiction.** `RedeemConfirmationModal`
 * and `GuestTokenDisplay` hold shells a person measured and declared correct
 * (D-41.2-06, D-41.2-07) — an exemption about the SHELL. The retired-tier prefix
 * is a different debt on the same files and it is simply PAID: raw counts on
 * 2026-08-14, **0** and **0**. An exemption is granted for a specific thing on a
 * specific file, never for the file as such, or it becomes a technique for
 * making every list empty at once.
 *
 * **All five were re-derived from the tree first**, with a second instrument
 * that deliberately does NOT use the gates' shared comment stripper (D-41.1-22),
 * and that instrument reproduced a known non-zero on a positive fixture and a
 * known zero on a negative one before reporting anything — refusing with exit 2
 * if it could not. Wave 4 of this phase recorded a corroborating instrument that
 * measured NOTHING and therefore agreed with everything; believing it would have
 * authorised deleting every entry with a second instrument's agreement on each
 * deletion. Raw counts measured 2026-08-14: **0, 0, 0, 0, 0**. No row's raw
 * count came out LOWER than its stripped count, which is the direction that
 * would have stopped the deletion.
 *
 * **Why an empty list here does not become a number that lies.** Check B is a
 * TREE-SIDE accounting, not a list-side one: it walks **every** file under
 * `src/`, and any file carrying the prefix while on no entry FAILS as
 * `undeclared` — never as a missing list entry. With the list empty the gate
 * becomes, in arithmetic, *the prefix appears nowhere*: `0 declared + 0 measured
 * + 0 undeclared`, and a single use written tomorrow reddens check B on its own
 * path with its own line number. That is the outcome this gate's own header
 * already names — *two prefixes, and a written list of the files still carrying
 * a third* — with the third list now at nothing. Check A never depended on the
 * list at all.
 *
 * **What this does NOT say.** It COUNTS PREFIXES, NOT LAYOUTS. A file using only
 * the two permitted tiers is counted at zero here and can still be wrong at
 * every width. H41-1 — every converted surface observed at three widths by a
 * person — is the only thing that says otherwise, and it is still owed. `null`
 * here means the migration is open; an object means it is closed, and the guard
 * requires all three fields so a truthy placeholder cannot satisfy it.
 */
export const MIGRATION_CLOSED = {
  date: '2026-08-14',
  by: 'plan 41.2-19',
  why:
    'no file under src/ carries the retired tier any more; check B still walks every ' +
    'file and fails an undeclared one on its own path, so with the list empty the gate ' +
    'becomes "the prefix appears nowhere" without losing the ability to catch the next use',
};

export const REMAINING = [
  // ── the multi-column grid axis (§2.2) — the one genuinely three-tier axis.
  // `sm:grid-cols-2` becomes `md:grid-cols-2`; `sm:grid-cols-3` becomes
  // `md:grid-cols-2 lg:grid-cols-3`, gaining the middle step it skipped.
  // The six route files: they ARE work-surface routes, so for these six alone
  // the path and the importer say the same thing. They are still tagged by the
  // same rule as the rest, not by their prefix.
  // PAID by plan 41-08 — `src/app/(public)/gallery/loading.tsx` (2) and
  // `src/components/media/MediaGrid.tsx` (1) held three of this list's uses and
  // hold none now. The grids they carry gained §2.2's desktop step and kept
  // their phone layout, which is what §2.3's map actually says for a grid whose
  // base column count was never itself a prefixed rule.
  //
  // ── PAID BY WAVE 5 — SEVEN ENTRIES ON THE GRID AXIS ────────────────────────
  //
  // Every one of the seven was a KPI or skeleton grid declaring the multi-column
  // axis from the SMALL prefix, which is the defect §2.2 exists for: it puts
  // three columns into the 544px a portrait tablet leaves. All seven gained the
  // middle step, which is the whole content of this axis's migration.
  //
  //   PAID by plan 41.1-12 — `(work)/analytics/members/loading.tsx` (1) and
  //   `(work)/analytics/members/page.tsx` (1). **The page file is the fourth
  //   entry on the member-analytics surface, and it is the reason this
  //   reconciliation counted on the tree instead of reading a number out of a
  //   plan.** That plan's own acceptance text named THREE entries — the two
  //   tables and the loading file — and the page carries one too, for the same
  //   KPI grid the loading file mirrors. Plan 41.1-12 measured the discrepancy
  //   itself and reported it rather than quietly satisfying the smaller number.
  //   A reconciliation working from the plan's figure would have removed three
  //   and left a fourth entry asserting something that had stopped being true,
  //   which is precisely how a debt list starts to lie.
  //
  //   PAID by plan 41.1-13 — `(work)/events/[id]/analytics/loading.tsx` (1) and
  //   `(work)/events/[id]/analytics/page.tsx` (1).
  //
  //   PAID by plan 41.1-14 — `(work)/analytics/loading.tsx` (2),
  //   `(work)/analytics/page.tsx` (1) and `components/analytics/KPIDashboard.tsx`
  //   (1). Three entries and four uses, not six: that plan corrected its own
  //   plan's figure with a measurement, and this gate agrees from the other side.
  //
  // The six route files above were the entries for which the path and the
  // importer happened to say the same thing — they ARE work-surface routes — and
  // they were tagged by the same importer rule as the rest all the same, never
  // by their prefix. That rule's worked counter-examples are in the `group`
  // paragraph above and at the foot of this list.
  // PAID by plan 41.1-09 task 1 — `src/components/media/MediaReviewGrid.tsx`
  // held one of this list's uses and holds none now. Its grid gained §2.2's
  // middle step, so the small-tier column rule became a tablet-tier one and the
  // image size hint moved with the boundary. Declared entries went 19 → 18 and
  // declared uses 37 → 36; the work group's DECLARED figures went 14 → 13 files
  // and 21 → 20 uses. The measured numbers did not move here, because the file
  // had already stopped carrying the prefix in that plan's own commit and this
  // gate had been printing it STALE ever since — *"converted; remove this
  // entry"*, which is what makes this a response rather than a tidy.
  //
  // Deleted by plan 41.1-11 (D-41.1-22), after re-deriving it from the tree with
  // a second instrument rather than trusting either the gate or the SUMMARY.
  // The file the tag exists for. It sits in `src/components/media/` — nowhere
  // near `(public)/events/[slug]/**` — and it is 41.2's all the same, because
  // `MediaGallerySection` is the only thing that mounts it. A tag derived from
  // a glob over the public route group would have missed this entry and
  // counted it among the fourteen this phase has to clear. Its neighbour
  // `MediaReviewGrid.tsx` sits in the SAME folder and is `work`: the folder
  // decides nothing, the importer decides everything.
  // PAID by plan 41.2-18 task 2 — `src/components/media/MediaUpload.tsx` held
  // this list's last grid-axis use and, as it turned out, the tree's LAST use of
  // the retired tier anywhere. The axis was migrated by copying the analog's
  // RULE rather than its literal string: these are square thumbnails, so the
  // base stays at two columns and the axis gains the tablet step instead of
  // inheriting a text grid's shape. It is also the file this docblock's `group`
  // paragraph argues from — it sits in `src/components/media/`, nowhere near the
  // public event route, and was `public-member-money` all the same because
  // `MediaGallerySection.tsx:8` is the only thing that mounts it. **That
  // argument is kept here in full rather than allowed to leave with its entry**,
  // for the same reason its counter-example was kept when it left: a rule whose
  // only worked specimens have both been deleted is a rule the next reader
  // re-derives as a preference.

  // ── the four sheet modals — absorbed by the Dialog primitive, §8.3. These
  // uses were not migrated to the tablet tier and then kept: the primitive owns
  // the sheet↔window pair and the sheet radius, so the classes were DELETED
  // from the call site when each surface converted.
  //
  // PAID by plan 41.2-02 — `…/menu/GuestLoginBanner.tsx` (3), one of the two
  // unreachable files D-41.2-03 ordered CONVERTED rather than deleted or
  // exempted: no closure reaches it, so no surface conversion would ever have
  // cleared it as a by-product.
  //
  // PAID by plan 41.2-10 — `…/RedeemConfirmationModal.tsx` (4) and
  // `…/SumUpCheckoutModal.tsx` (4), the shared money core, converted once in
  // wave 5 as spine so that three later surfaces would not all open it.
  //
  // PAID by plan 41.2-12 — `…/menu/GuestTokenDisplay.tsx` (4).
  //
  // **TWO OF THOSE FOUR ARE EXEMPT ON THE SIBLING DIALOGS GATE AND DELETED
  // HERE, AND THAT IS NOT A CONTRADICTION.** D-41.2-06 and D-41.2-07 exempt the
  // bartender SHELLS in `RedeemConfirmationModal.tsx` and `GuestTokenDisplay.tsx`
  // — an exemption about one specific thing in one specific file. The retired
  // tier is a different debt on the same two files, and it is simply paid: raw
  // counts 0 and 0. An exemption granted for a FILE rather than for a THING
  // would empty every list at once, which is the technique both decisions
  // explicitly refuse.
  //
  // ── WHAT THIS COMMIT MOVED ────────────────────────────────────────────────
  //
  // Declared entries **5 → 0** and declared uses **16 → 0**; the work group was
  // 0 before and is 0 after, and no entry was moved between groups to make any
  // count come out right. **The MEASURED numbers did not move at all** — 0 files
  // and 0 uses before and after — because every one of the five had already
  // stopped carrying the prefix in its own plan's commit and this gate had been
  // printing all five STALE ever since. That notice is what makes these five
  // deletions a RESPONSE rather than a tidy, and the emptiness that results is
  // declared in `MIGRATION_CLOSED` above rather than left to be noticed.
  //
  // All five deleted by plan 41.2-19 (D-41.1-22) after re-deriving each from the
  // tree with a second instrument that does NOT use the gates' shared comment
  // stripper and that proved it can see — a known non-zero on a positive fixture
  // and a known zero on a negative one — before it reported anything. Measured
  // 2026-08-14: **0, 0, 0, 0, 0**.

  // ── the table dual-renders — consolidated onto the one table breakpoint,
  // `md`, by the DataTable primitive, §8.8. `sm:block` / `sm:hidden` is the
  // cards-or-table switch.
  // The tables here are the same ones `verify-tables.mjs` carries, and the two
  // gates agree entry for entry on which surface each belongs to — five apiece
  // when this paragraph was written, **one apiece since plan 41.1-16**, and the
  // two lists were re-derived from the tree in the same commit so they could not
  // drift apart in it. Their importers were re-measured in 41.1-03; three of the
  // target strings on the sibling gate were wrong, so none was taken on trust.
  // PAID by plan 41-10 — `src/components/admin/MemberTable.tsx` held four of
  // this list's uses and holds none now. Its dual-render moved onto the
  // DataTable primitive at md (§8.8), its filter row took the same boundary
  // (§2.1), and the detail region's three-column grid did too. The gate printed
  // it as STALE first, which is what made this deletion a response rather than
  // a tidy.
  //
  // ── PAID BY WAVE 5 — FOUR MORE OF THE TABLE DUAL-RENDERS ───────────────────
  //
  //   PAID by plan 41.1-12 — `MemberSpendTable.tsx` (2) and
  //   `ReferralChainTable.tsx` (2).
  //   PAID by plan 41.1-13 — `DrinkSalesBreakdown.tsx` (2).
  //   PAID by plan 41.1-15 — `TransactionList.tsx` (3): the filter grid (§2.2)
  //   and the toolbar row (§2.1). Its dual-render was already at 1024px and
  //   moved to md with DataTable (§8.8). Its entry carried a measurement worth
  //   keeping, because it is a worked instance of the rule this list's `group`
  //   paragraph argues: **two docblocks NAME that file** —
  //   `(work)/newsletter/page.tsx:10` and
  //   `admin/events/[id]/reveal/VenueRevealPanel.tsx:172` — and **named is not
  //   imported**. Its only importer was `(work)/finance/page.tsx:2`, which is
  //   what made it `work`. Reading a mention in a comment as an import is how
  //   these strings go wrong, and it is the same defect class as the six
  //   wrong-surface reason strings this phase family has now corrected.
  //
  // `SalesDashboard.tsx` (2) is the ONE table dual-render that stays, on both
  // this gate and `verify-tables.mjs`. Plan 41.1-21 converts it in wave 8. It is
  // also this list's whole work group now, which is why criterion 4's
  // `WORK GROUP REMAINING` line reads 1 rather than 0.
  //
  // ── WHAT THIS COMMIT DID AND DID NOT MOVE ──────────────────────────────────
  //
  // Declared entries **17 → 6** and declared uses **35 → 18**; the work group's
  // DECLARED figures **12 → 1 file** and **19 → 2 uses**. **The MEASURED numbers
  // did not move at all** — 6 files and 18 uses before and after — and that is
  // correct rather than suspicious: every one of the eleven files had already
  // stopped carrying the prefix in its own plan's commit, and this gate had been
  // printing all eleven as STALE ever since. Declared and measured now agree
  // exactly, which is the state a reconciliation exists to restore.
  //
  // Deleted by plan 41.1-16 (D-41.1-22), after re-deriving **every** entry on
  // this list from the tree with a second instrument that deliberately does NOT
  // use the gates' shared comment stripper. Tree and SUMMARYs agreed entry for
  // entry; no claim had to be refused, and that is stated because the procedure
  // exists for the case where it is false.
  // PAID by plan 41.1-21 task 1 — `src/components/events/SalesDashboard.tsx`
  // held this list's whole work group: 2 declared uses of the small prefix on a
  // table dual-render, consolidated onto the one permitted breakpoint by
  // DataTable. It was also the last entry on `verify-tables.mjs`'s list, and the
  // two fell in the same conversion. **Declared entries 6 → 5; the work group's
  // declared figures 1 file → 0 and 2 uses → 0, so criterion 4's
  // `WORK GROUP REMAINING` line reads 0 rather than 1.** The MEASURED number had
  // already been 0 and the gate had been printing it STALE — *"declared 2,
  // measured 0 → converted; remove this entry"* — which is what makes this
  // deletion a response rather than a tidy.
  //
  // Deleted by plan 41.1-24 (D-41.1-22) after re-deriving it from the tree with a
  // raw count that does NOT use the gates' shared comment stripper. Small-prefix
  // occurrences measured 2026-08-14: **0**. The five entries that stay are not
  // work and are Phase 41.2's; none was moved between groups.

  // ── a plain md: equivalent, §2.1.
  //
  // PAID by plan 41.1-08 task 2 — `AssignmentsClient.tsx` held the last use on
  // this axis and holds none now: the one small-tier rule was a track template
  // and not a column count, and it was paid by reading the class rather than by
  // moving it up a tier. Declared entries went 18 → 17 and declared uses 36 → 35;
  // the work group's DECLARED figures went 13 → 12 files and 20 → 19 uses. The
  // measured numbers did not move, for the same reason as the entry above: the
  // gate had been printing it STALE since that plan's own commit.
  //
  // **This deletion takes the second of the two files this docblock's `group`
  // paragraph argues from**, and the argument survives it. That paragraph names
  // `MediaUpload.tsx` (outside `(work)`, tagged `public-member-money`) and this
  // file (outside `(work)`, tagged `work`) as the pair proving a tag comes from
  // the importer and never from the path. The first is still on the list; the
  // second is now only in this comment. **It is deliberately kept here in full
  // rather than allowed to leave with its entry** — a rule whose only worked
  // counter-example has been deleted is a rule the next reader will re-derive as
  // a preference. The measurement that made it `work`: its only importer was
  // `src/app/(admin)/admin/(work)/events/[id]/assignments/page.tsx:8`, a work
  // route, with R-WORK-ROUTES keeping the client module a level out of the group.
  //
  // Deleted by plan 41.1-11 (D-41.1-22), re-derived from the tree first.
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
 * **The four-line `isCommentLine` that stood here is gone, and this is the
 * record of it.** It was `41.1-RESEARCH.md` §4.1's family A, in **six**
 * byte-identical copies across `scripts/` (digest `35d258011314`), of which the
 * comment-hygiene paragraph above named three. Family A read within a line only:
 * no JSX awareness, no multi-line state. Its stated error direction — *to KEEP a
 * trailing comment on a code line, which can only make this script report MORE* —
 * was true and was only half the story: on a multi-line comment it handed every
 * body line back as code, which is **false-red, not over-reporting**, and §0
 * rule 3 says what happens to a gate that reddens on a correct file.
 *
 * §4.4 measured the extraction over all 263 files under `src/`: against family A,
 * **zero lines become live** and 1322 become blank, of which exactly one carries
 * a gate needle anywhere (`FormatMarker.tsx:128`, a custom property that matches
 * no check today). So this gate cannot redden, and none of its counts moves.
 *
 * The paragraph is corrected rather than deleted, in the house shape
 * (`PageShell.tsx:42-46`).
 */
export function liveLines(relPath) {
  const raw = readFileSync(`${ROOT}/${relPath}`, 'utf8').split('\n');
  const { lines, unterminated } = liveLinesFrom(raw);
  if (unterminated !== null) refuseUnterminated(relPath, unterminated);
  return lines;
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
      'REMAINING is empty. If every use of the migrating prefix really is gone, that is the\n' +
        '       end of this migration and the emptiness should be a DECISION written above the\n' +
        '       constant — not a list that quietly emptied itself.\n' +
        '       Set MIGRATION_CLOSED to an object carrying a date, the plan that closed it, and\n' +
        '       why. A truthy placeholder does not satisfy this: all three fields are required.'
    );
  }
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
        '       group total while the totals still look plausible, and phase 41.1 criterion 4 is\n' +
        '       read off one of those totals. Nothing was measured.'
    );
  }
  if (!GROUP_TAG_SET.has(group)) {
    refuse(
      `the REMAINING entry ${path} carries the group tag "${group}", which is not in the\n` +
        `       closed vocabulary: ${GROUP_TAGS.join(', ')}.\n` +
        '       The vocabulary is closed on purpose: free text lets a typo open a fifth group of\n' +
        '       one entry that no criterion reads. If a fifth group is genuinely needed, that is a\n' +
        '       DECISION that edits GROUP_TAGS with its reason, not a string typed on an entry.\n' +
        '       Nothing was measured.'
    );
  }
}

const declared = new Map(
  REMAINING.map(([path, count, reason, group]) => [path, { count, reason, group }])
);

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

/**
 * The per-group counts, on the same basis as the totals above: a file counts
 * for its group while it still carries at least one `sm:`, and the uses counted
 * are the ones MEASURED on the tree, not the ones declared. Declared and
 * measured agree while nothing is STALE, and when they disagree the stale
 * notice below says so by name.
 *
 * **Computed over the DECLARED entries only.** A file carrying `sm:` while on
 * no entry is check B's failure and belongs to no group — it appears in the
 * undeclared list below and in no total here. That is deliberate: inventing a
 * group for it would let an undeclared file be silently absorbed into a count
 * somebody reads a criterion off.
 */
const filesByGroup = new Map(GROUP_TAGS.map((tag) => [tag, 0]));
const usesByGroup = new Map(GROUP_TAGS.map((tag) => [tag, 0]));
for (const [path, { group }] of declared) {
  const actual = (measured.get(path) ?? []).length;
  if (actual === 0) continue;
  filesByGroup.set(group, filesByGroup.get(group) + 1);
  usesByGroup.set(group, usesByGroup.get(group) + actual);
}

console.log('\n      by group (measured):');
for (const tag of GROUP_TAGS) {
  console.log(
    `        ${tag.padEnd(20)} ${String(filesByGroup.get(tag)).padStart(3)} file(s)  ` +
      `${String(usesByGroup.get(tag)).padStart(3)} use(s)`
  );
}
console.log(
  `\n      WORK GROUP REMAINING = ${filesByGroup.get('work')}` +
    `      (${usesByGroup.get('work')} sm: use(s))`
);

if (filesByGroup.get('work') === 0) {
  console.log(
    '\n  ★  WORK GROUP REMAINING = 0 — no file on the work surface carries sm: any more.\n' +
      '     This is the line phase 41.1 criterion 4 is read off, and it now reads zero.\n\n' +
      '     Read it for exactly what it is. It COUNTS PREFIXES, NOT LAYOUTS: a work file using\n' +
      '     only md: and lg: is counted at zero here and can still be wrong at every width\n' +
      '     (H41-1, a person at three widths). And a count that FELL is not by itself evidence\n' +
      "     that work happened — `WORK GROUP REMAINING = 0` is reached just as well by\n" +
      '     re-tagging fourteen entries as by converting fourteen files. The reconciliation\n' +
      '     diffs the ENTRIES against the tree, never the counts (D-41.1-16).\n'
  );
}

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
