#!/usr/bin/env node
/**
 * verify-dialogs.mjs — one dialog implementation, and a written list of the
 * copies still standing.
 *
 * WHAT IT ASSERTS, in one sentence: **the `Dialog` primitive carries the
 * signature §8.3 fixes; every OTHER file declaring a dialog shell of its own is
 * on a declared list that can only shrink; and no file that renders `Dialog`
 * imports the toast.**
 *
 * `41-UI-SPEC.md` §8.3 extracts one dialog from **eighteen** copies measured on
 * this tree — seven native `<dialog>` + `showModal()` shells whose class string
 * is byte-identical across six of them, and eleven hand-rolled full-screen
 * overlays that are not `<dialog>` elements at all. D-41-09's instruction is
 * that an eighteenth is not built beside them.
 *
 * WHY A STRUCTURAL CHECK AND NOT A TEST. There is no test runner in this
 * repository — no `test` script, no `*.test.*`, no `*.spec.*` (`CLAUDE.md`
 * Guardrail 1). And `npm run build` cannot see any of this: a hand-rolled
 * overlay compiles, renders, and looks like a dialog. What it is missing is
 * **Escape, the focus trap and background inertness**, which `showModal()`
 * supplies by specification and which measurement says **none of the eleven
 * overlays implements**. That is not an error; it is an absence, and an absence
 * is exactly what a build cannot report.
 *
 * ── WHAT A GREEN DOES NOT MEAN (cosa un verde NON significa) ────────────────
 *
 *   - **IT DOES NOT SAY A DIALOG BEHAVES.** It reads class strings and import
 *     clauses. Whether Escape actually closes the panel, whether the sheet
 *     really rises from the bottom edge below 768 px, and whether the page
 *     behind it scrolls are **H41-2**, which is a person at two widths. No tick
 *     here stands in for that, and the scroll-lock half of it is recorded as
 *     unverified in research.
 *   - **A GREEN ON `REMAINING` IS NOT PROGRESS.** Fourteen files still carrying
 *     their own shell is a green, and it is supposed to be: the list exists so
 *     this gate can be switched on TODAY rather than after the migration
 *     (`verify-media-strip.mjs:51-62`; §0 rule 3). **Read the printed count,
 *     not the tick.**
 *   - **CHECK C READS AN IMPORT, NOT A RENDER.** A file that imports the
 *     primitive is treated as rendering it. A file that reaches the toast by
 *     any route other than an import clause — a context read through a
 *     re-export, a helper that raises one on its behalf — is invisible here.
 *   - **IT CANNOT SEE A CLASS BUILT BY CONCATENATION.** `` `fixed inset-0 ${z}` ``
 *     is text this script does not assemble. It reads lines.
 *   - **IT CANNOT SEE A CLASS SPLIT ACROSS TWO LINES.** The overlay is three
 *     parts on ONE line. A formatter that wraps a long class attribute puts the
 *     rung on the next line and the shell becomes invisible — before this
 *     change and after it. Matching across lines is a different change with a
 *     different risk (a class attribute has no line-oriented end), so the limit
 *     is **declared here rather than closed**: a green does not mean no copy
 *     was wrapped.
 *   - **IT DOES NOT JUDGE THE COPIES IT TOLERATES.** A file on `REMAINING` is
 *     not blessed; it is *counted*. Every one of them is a dialog without a
 *     focus trap.
 *   - **CHECK B DOES NOT READ THE DOOR.** Five files — the scanner route, the
 *     scanner's components and the door's second address — are fenced out of
 *     check B by path, because they are **Phase 42's** (`PHASE_42_EXEMPT_PATHS`
 *     below). If a nineteenth hand-rolled dialog is written behind that fence,
 *     this gate is silent about it, for as long as the fence stands. Those five
 *     files are **UNMEASURED, not approved**, and the report says so on every
 *     run in those words.
 *
 * ── THE THREE CHECKS ────────────────────────────────────────────────────────
 *
 *   A. **The primitive's signature.** `src/components/ui/Dialog.tsx` carries
 *      `showModal()` and the sheet↔window pair — the bottom-edge cross-axis
 *      alignment and its `md:` centred counterpart. Each is asserted against a
 *      **hard-coded expected count**, and **fewer than expected FAILS**. That
 *      direction is the point: an over-specific signature that matched nothing
 *      would otherwise pass by measuring nothing, which is this gate's own
 *      vacuous green.
 *
 *      More than expected is a loud notice rather than a failure. Growth is not
 *      the failure this check exists for, and a gate that reddens on a correct
 *      file gets switched off — but a signature that quietly doubled is a
 *      second implementation arriving, so it is printed.
 *
 *   B. **No second shell, except on the list.** A file other than the primitive
 *      that declares a dialog shell — either the hand-rolled overlay shape, or
 *      a native `<dialog>` element — must be on `REMAINING`. A file NOT on it
 *      FAILS. An entry whose path is gone FAILS; a list that cannot be measured
 *      is a decoration. An entry whose file no longer carries a shell is a
 *      **STALE** notice to delete, not a failure.
 *
 *      The hand-rolled shape is `OVERLAY_PARTS`, three boundary-guarded regexes
 *      that match the rung as a FAMILY rather than as one literal, and that
 *      prove themselves against five fixed probes on every run (WR-09, WR-03).
 *
 *      **The subject is the SHELL, not one class string.** §13's G2 row names
 *      the hand-rolled overlay's utility, and taken literally that matches ten
 *      of the eighteen copies and **none of the six byte-identical native
 *      shells** — which are the copies D-41-09 is actually about, and the two
 *      that name each other in their own docblocks are among them. A check that
 *      counted only the side effect would have gone green while six copies of
 *      the extracted thing stood untouched; this phase has already produced one
 *      debt that closed itself that way (DEF-41-03), and the lesson written
 *      there is to name the thing rather than count a side effect.
 *
 *   C. **No dialog raises a toast.** A native `<dialog>` paints in the **top
 *      layer**, above every `z-index` including the toast container's. A dialog
 *      reporting success by toast reports it **invisibly** — the silent failure
 *      `meta-gates.md` forbids, in a project with **no error tracking**. So a
 *      dialog reports its own outcome in its own panel, and this check asserts
 *      it rather than leaving it remembered (§8.3).
 *
 *      It is **vacuous while nothing imports the primitive**, and says so in
 *      those words rather than printing a tick — the confession shape
 *      `verify-tokens.mjs:818-822` already uses.
 *
 * ── THE DECLARATIONS: THREE EXEMPTIONS AND ONE NON-EXEMPTION (§0 rule 3) ────
 *
 * They are **not the same kind of thing**, and collapsing them would hide a real
 * debt behind a real exemption. Two were written before this gate existed; two
 * arrived with plan 41.2-19 in wave 8, and the section is restated with today's
 * membership because a paragraph describing a two-entry list above a four-entry
 * one is exactly the drift this gate is written against.
 *
 *   1. `src/components/media/Lightbox.tsx` — **exempt from check B, for good.**
 *      A full-bleed media viewer at every tier, carrying a heavier scrim than a
 *      sheet. It is a native `<dialog>` and is correct as one; §8.3 declares it
 *      an exception in advance precisely so a G2 demanding the sheet form does
 *      not open red on a correct file. It is therefore **not on `REMAINING`**:
 *      a file that will never convert is not a debt, and putting it on a list
 *      that only shrinks would guarantee the number never reaches zero, which
 *      makes the number lie.
 *
 *   2. `src/components/media/MyMediaSection.tsx` — **NOT exempt, and the reason
 *      the signature is not keyed on its attribute.** It carries the tree's
 *      **only** `role="dialog"` — one hit, measured. A signature keyed on that
 *      attribute would find this one file and miss every other copy in the tree.
 *      **This paragraph used to end *"it is on `REMAINING`"*, and that stopped
 *      being true in wave 6**: plan 41.2-14 took it off the debt by DELEGATION,
 *      rendering entry 1 instead of declaring a shell, and plan 41.2-19 deleted
 *      the entry. The superseded half is recorded rather than removed, in this
 *      file's house shape.
 *
 *   3. `…/events/[slug]/RedeemConfirmationModal.tsx` — **two of three overlays
 *      exempt, D-41.2-06, the owner's.** They are the screens a BARTENDER
 *      operates on a guest's phone. Inside the primitive the row that reverts a
 *      token becomes full-width under the thumb: money going backwards at a
 *      counter, at two in the morning, with a queue in front.
 *
 *   4. `…/events/[slug]/menu/GuestTokenDisplay.tsx` — **two of three shells
 *      exempt, D-41.2-07**, granted under 3's RULE and **not by analogy to it**.
 *      Plan 41.2-12 had 3 in its context, declined to inherit it, and re-derived
 *      the argument from this file's own comments — an argument that runs both
 *      ways, the serve area losing the whole screen while Cancel gains the whole
 *      width. *An exemption is granted per file, on that file's own argument, or
 *      it becomes a technique for making a list empty.*
 *
 * ── COMMENT HYGIENE, WHICH IS LOAD-BEARING IN THIS GATE ABOVE ALL ───────────
 *
 * Comment lines are blanked before any counting, with the line-shape heuristic
 * `verify-tokens.mjs:437-450` uses — deliberately not a tokeniser, because
 * WR-07 (`32-REVIEW.md`) records that a real comment parser written in this
 * repository was unsound.
 *
 * **This gate needs it more than its siblings do**, and not hypothetically:
 * the dialog files **document their own class strings in their docblocks**.
 * `41-PATTERNS.md` §2.1 quotes the shell; the primitive's own header explains
 * the utilities it drops. A gate that counted comments would count its own
 * documentation and would find a second implementation inside a sentence
 * explaining that there is only one.
 *
 * **DEF-41-02 is why the stripper has a fourth opener.** The sibling heuristic
 * recognises a line starting with two slashes, a star, or a block opener or
 * closer — and a **JSX** comment matches none of them, because its opening line
 * starts with a brace. `MyMediaSection.tsx:179` opens one immediately above the
 * overlay this gate must count, and the formats surface carries several. Read
 * as code, a JSX comment quoting a class string is a hit; read as what it is,
 * it is a sentence. The count of lines blanked this way is printed on every
 * run.
 *
 * ── A CLAIM THIS HEADER MADE, AND WHAT WITHDREW IT (41-29) ──────────────────
 *
 * Until 41-29 the paragraph above ended with a stated error direction:
 *
 *     "Its error direction is stated rather than assumed: the opener must be at
 *      the start of the trimmed line, so the shape **can blank more than it
 *      should** only when a line begins with a JSX comment opener inside a
 *      string."
 *
 * **That sentence was false, and it is withdrawn.** The bound it claimed — over
 * blanking only inside a string — was disproved by a shape with no string
 * anywhere in it: a comment that OPENS AND CLOSES on its own line, followed by
 * live code after the closer. The stripper blanked the whole line, so check B
 * could not see an overlay that a single leading comment sat in front of: a
 * nineteenth hand-rolled shell for the price of one comment, with `REMAINING`
 * unmoved and this gate green. `41-GAP-REVIEW-4.md` CR-02 measured it here,
 * with its control, and the sibling conversion gate carried the identical hole
 * on its check A and on both of its frozen digests. It is the third false
 * docblock claim this file family has carried, which is why it is quoted here
 * rather than deleted.
 *
 * **The bound the shipped code has, in both directions.** A leading comment now
 * consumes only its own span: everything after its closer is live text, and the
 * span is replaced by the same number of spaces so no column moves.
 *
 *   - still blanked MORE than it should: a line that BEGINS with those
 *     characters as part of a multi-line string literal loses its leading span;
 *     and a JSX comment closed with a space between the star-slash and the
 *     brace is not recognised as closed, so it blanks onward to its real
 *     closer;
 *   - no longer blanked, and used to be: every character after a leading
 *     comment's closer — which is where the whole of CR-01 and CR-02 lived.
 *
 * Neither direction is asserted here. Both are re-proved on every run by the
 * matcher self-check below, which now measures the stripper as well: two probes
 * for an overlay behind a leading closed comment, two for prose quoting the
 * same three parts that must still cost nothing.
 *
 * ── WHY THE UTILITIES ARE COMPOSED FROM PARTS AND NEVER SPELLED ─────────────
 *
 * DEF-41-01, measured: **Tailwind compiles class strings out of comments and
 * out of `.planning/`**, and it has already emitted a malformed rule from one.
 * `scripts/` is inside the project root and is not ignored, so a complete
 * utility written in this file would be a live candidate. Every needle below is
 * therefore assembled at run time and no whole utility appears as a literal.
 *
 * ── WHY THE WALK IS LOCAL AND THE STRIPPER IS NOT ───────────────────────────
 *
 * `verify-tokens.mjs` exports `listScannableFiles` and `liveLines`, and they
 * **cannot be imported**: that module runs its seven checks at module scope and
 * ends in `process.exit()` with no main-module guard, so importing it runs the
 * TOKEN gate and exits this process with the TOKEN gate's verdict — this script
 * would exit 0 having measured nothing. Plan 41-02 measured exactly that.
 *
 * **The conclusion drawn from it was too wide, and this is the correction.**
 * The sentence used to end *"every sibling gate declares its own walk and its
 * own comment heuristic — self-contained is the house shape for a gate"*, and
 * the second half of that was a mistake with a price. `41.1-RESEARCH.md` §4.1
 * measured **four families of the comment heuristic across ten scripts**, none
 * correct on all seven shapes, and round 5 measured one of them hiding a
 * money-domain entry while the gate printed a conversion notice and exited 0.
 *
 * What made `verify-tokens.mjs` unimportable was its **process exit at module
 * scope**, not the fact of importing. `scripts/lib/comments.mjs` is not a gate:
 * it never exits, prints nothing and asserts nothing, and it is proved by
 * `verify-comment-stripper.mjs` against all eight shapes. So the walk stays
 * local — self-contained is still right for a gate — and the stripper is now
 * imported (D-41.1-07). The superseded sentence stays visible with the
 * measurement that superseded it, because a decision undone without its
 * measurement reads as a slip (`PageShell.tsx:42-46`).
 *
 * ── THE TWO REFUSAL DEFECTS THIS GATE CARRIED, AND WHAT CLOSED THEM (41.1-02) ─
 *
 * `DEF-41-07` registered four defects in the refusal machinery of this gate and
 * of `verify-conversion.mjs`. **Two of them are this file's**, and both are
 * closed here:
 *
 *   - **item 1** — `neverOpenedReason()`'s existence guard covered ONE of its
 *     three branches, so a declared path that is not on disk was given a
 *     confident explanation of why it was never opened. The obligation is now
 *     discharged once, above all three.
 *   - **item 4** — one typo, two verdicts: `existsSync` on the house APFS volume
 *     is case-insensitive (`CLAUDE.md` Guardrail 6) while the walk is case-exact,
 *     so a mis-cased entry refused here and failed on a case-sensitive volume.
 *     `walked` is now the authority and the spelling is confirmed against the
 *     directory's own entries.
 *
 * **A numbering note, so the next reader does not re-derive it.** Plan
 * `41.1-02`'s own prose calls these *"items 1 and 3"*; the register in
 * `.planning/phases/41-shared-primitives-three-tier-layout/deferred-items.md`
 * numbers the case-typo defect **4**, and its item 3 is a different defect
 * entirely — a permitted site keyed on a line's text rather than its position,
 * which lives in `verify-conversion.mjs` and is **plan 41.1-04's**. Item 2 is
 * that file's too. This gate carries neither.
 *
 * **AND ITEM 4 IS A CLASS RATHER THAN A LINE.** Every `existsSync` whose subject
 * is a DECLARED path rather than a walked one has the same exposure, including
 * `scripts/conversion-manifest.mjs:410,426,436`. Plan `41.1-04` owns those three;
 * they are named here so the class is inherited rather than rediscovered.
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
 *   node scripts/verify-dialogs.mjs
 *
 * (Not registered in `package.json` by plan 41-09. Plan 41-12 owns that file
 * and registers all six new gates at once, so no two plans in a wave contend
 * for it.)
 *
 * Exit codes:
 *   0  all three checks passed
 *   1  at least one failed — each is printed with its file and its line
 *   2  nothing was measured: `src/` is missing, the walk found no scannable
 *      file, the primitive is not on disk, or `REMAINING` is empty. **No
 *      verdict is implied by a 2.**
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
 * The three tokens stay, because `MATCHER_PROBES` below builds probe lines out
 * of them. The stripper that used to sit here does not: it is imported.
 */
const JSX_COMMENT_OPEN = '{/' + '*';
const JSX_COMMENT_CLOSE = '*' + '/}';
/** The block comment's closer, assembled at run time like the two above. */
const BLOCK_COMMENT_CLOSE = '*' + '/';

/**
 * **The superseded paragraph, kept visible with the measurement that superseded
 * it.** What stood here was round 5's span implementation, and it said the
 * closer is looked for *"from the opener's LAST character"* — right for the JSX
 * opener, wrong for the block opener, whose degenerate form then read as already
 * closed and handed its body back as code (WR-04). It looked for the JSX closer
 * as an exact three-character token, so a comment closed with whitespace before
 * the brace never closed and the state ran to end of file (CR-02). And it pushed
 * an empty line for the terminating line of a multi-line comment, so live code
 * on that line was invisible (CR-01).
 *
 * `41.1-RESEARCH.md` §4.4 measured the extraction over all 263 files under
 * `src/`: against this gate's incumbent family, **zero lines become live** and
 * 66 become blank. The merged stripper can only blank more here, so no verdict
 * on this tree moves because of the swap.
 */
const liveLinesCache = new Map();

/**
 * TWO counters, not one, and they are printed BELOW the walk — WR-02.
 *
 * **The defect this replaces.** There was one counter and it was printed before
 * check B walked `src/`. At that point exactly one file had been read — the
 * primitive — so the number described `Dialog.tsx` and not the run. A counter
 * that cannot report a blindness spike is the one thing a counter like this is
 * for, and in a repository with **no error tracking** a printed number is one of
 * the few observables a gate has at all (`meta-gates.md`). This one observed the
 * wrong thing.
 *
 * **Why two numbers rather than one.** They are the two directions of the
 * stripper, and collapsing them hides whichever one moved:
 *
 *   - **lines blanked whole** — the line was comment to its end. This is
 *     DEF-41-02's direction: prose quoting a class string must cost nothing. A
 *     spike here is a gate seeing LESS of the tree.
 *   - **leading spans consumed** — a comment ended and live code continued on the
 *     same line, so the span became spaces and the code stayed visible. This is
 *     CR-01 and CR-02's direction, and it is the number that would have moved
 *     when an overlay behind a leading closed comment stopped being invisible.
 *
 * Both are measured over the files THIS RUN opened, and that count is printed
 * beside them: a count without its denominator is not a measurement.
 */
let commentLinesBlanked = 0;
let commentSpansStripped = 0;

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
    const rawLine = raw[i].split('\r').join('');
    if (rawLine.trim() === '') continue;
    if (lines[i] === '') {
      commentLinesBlanked += 1;
      continue;
    }
    /*
     * Live code survived on a line the stripper touched: a LEADING SPAN was
     * consumed and replaced by the same number of spaces. Compared against the
     * carriage-return-stripped raw line so a CRLF file does not read as a
     * stripped span on every line of it.
     */
    if (lines[i] !== rawLine) commentSpansStripped += 1;
  }

  liveLinesCache.set(relPath, lines);
  return lines;
}

/* ────────────────────────────────────────────────────────────────────────────
 * The primitive, and the signature §8.3 fixes
 * ──────────────────────────────────────────────────────────────────────────── */

export const PRIMITIVE_FILE = 'src/components/ui/Dialog.tsx';

/**
 * The signature, as `[label, needle, expectedCount]`.
 *
 * The two class needles are **assembled**, never spelled, for the DEF-41-01
 * reason in the header. The counts are what this tree measures today, and they
 * are hard-coded so that a needle which stopped matching cannot pass as an
 * absence of failures.
 *
 * `showModal()` is the platform behaviour the whole extraction rests on:
 * Escape, the focus trap, background inertness and the top layer arrive with
 * it and with nothing else. The pair is the sheet↔window switch — the phone
 * form on the bottom edge, the tablet-and-up form centred — and §8.3 fixes the
 * whole difference between the two tiers at three class pairs of CSS, of which
 * this is the one that cannot be mistaken for anything else.
 */
export const SIGNATURE = [
  ['showModal()', 'showModal()', 1],
  ['the sheet alignment', 'items-' + 'end', 1],
  ['the window alignment', 'md:items-' + 'center', 1],
];

/* ────────────────────────────────────────────────────────────────────────────
 * The two declared exceptions — named constants, with their reasons
 * ──────────────────────────────────────────────────────────────────────────── */

/**
 * Exception 1 — exempt from check B, permanently. See the header.
 *
 * A full-bleed media viewer is not a sheet and not a window. §8.3 and §13's G2
 * row both name it before this gate existed, which is the point of §0 rule 3:
 * an exemption discovered on a gate's first red run is an exemption nobody
 * trusts.
 */
export const FULL_BLEED_VIEWER = 'src/components/media/Lightbox.tsx';

/**
 * Exception 2 — NOT exempt, and NOT on `REMAINING` either, since plan 41.2-14.
 * It is the reason this gate's signature is not keyed on `role="dialog"`.
 *
 * **The superseded claim, kept rather than deleted** (`PageShell.tsx:42-46`'s
 * house shape): this constant's docblock read *"NOT exempt. It is on
 * `REMAINING`"* until wave 8. The second half stopped being true when plan
 * 41.2-14 took the file off the list **by DELEGATION** — it now renders the
 * declared permanent exemption above instead of declaring a shell of its own —
 * and the entry was deleted by plan 41.2-19 after the tree agreed.
 *
 * The first half is unchanged and is why the constant survives its entry: this
 * is still the tree's only `role="dialog"`, and it is still the worked reason
 * the signature is keyed on the SHELL. A rule whose only specimen has been
 * deleted is a rule the next reader re-derives as a preference.
 */
export const ROLE_DIALOG_OVERLAY = 'src/components/media/MyMediaSection.tsx';

/**
 * Exception 3 — the bartender's two screens on the public event page.
 * **D-41.2-06, the owner's, 2026-08-14.** Implemented here by plan 41.2-19.
 */
export const BARTENDER_REDEEM_SCREENS =
  'src/app/(public)/events/[slug]/RedeemConfirmationModal.tsx';

/**
 * Exception 4 — the bartender's two screens on the drinks menu.
 * **D-41.2-07, granted under D-41.2-06's RULE and not by analogy to it.**
 *
 * The distinction is the whole point and it is why this is a separate constant
 * with a separate reason: *an exemption is granted per file, on that file's own
 * argument, or it becomes a technique for making a list empty.* Plan 41.2-12
 * had D-41.2-06 in its context and **explicitly declined to inherit it**,
 * measured this file, and produced the argument from this file's own comments.
 * A refusal that declines an available precedent and re-derives the argument is
 * worth more than one that cites it.
 */
export const BARTENDER_TOKEN_SCREENS =
  'src/app/(public)/events/[slug]/menu/GuestTokenDisplay.tsx';

/**
 * The four declarations this gate prints on every run, before it counts.
 *
 * **Two of the four are exemptions, one is a non-exemption, and the fourth is
 * an exemption too — and they are printed together on purpose.** A reader who
 * meets only the exemptions cannot tell which decisions were taken and which
 * were merely never taken. This gate already refuses to let *exempt* and
 * *fenced* collapse into one word (`NEVER_MEASURED_BY_B` vs the Phase 42
 * fence); the same discipline says a declared NON-exemption is worth printing.
 *
 * **AN EXEMPTION WITHOUT ITS REASON IS INDISTINGUISHABLE FROM A FILE NOBODY GOT
 * TO** (D-41.2-06). So each reason travels with its entry, in the gate, and the
 * two bartender entries carry **two arguments and not one argument cited
 * twice** — because two executors, in separate worktrees, with no contact, hit
 * the same shape on two different files and refused it independently, and the
 * second declined the first's precedent while doing so.
 */
export const DECLARED_EXCEPTIONS = [
  [
    FULL_BLEED_VIEWER,
    'exempt from check B — a full-bleed media viewer at every tier, carrying a heavier scrim than a sheet. Declared an exception by §8.3 before this gate existed, and deliberately NOT on REMAINING: a file that will never convert is not a debt, and a list that can never reach zero is a number that lies',
  ],
  [
    ROLE_DIALOG_OVERLAY,
    'NOT exempt, and no longer on REMAINING either — it is the tree\'s ONLY role="dialog" (one hit, measured) and WAS a hand-rolled overlay. A signature keyed on that attribute would find this one file and miss every other copy in the tree, which is why the check is keyed on the shell instead; that reason is why this line survives its list entry. Plan 41.2-14 took it off the debt by DELEGATION rather than by a shell swap — it renders the exemption above — and plan 41.2-19 deleted the entry after the tree agreed at zero',
  ],
  [
    BARTENDER_REDEEM_SCREENS,
    'exempt from check B for TWO of its three overlays — D-41.2-06, the owner\'s. The guest\'s confirmation converted; the other two are the screens a BARTENDER operates, and they will never convert. The reason is the file\'s own, written before this phase: the serve area "takes the whole screen" so a bartender "doesn\'t have to aim", and the row that reverts the token is "kept narrow so the bartender\'s tap can\'t hit it by mistake". Inside the primitive that reverting row becomes a full-width control in the actions region, directly under the thumb — money going backwards at a counter, at two in the morning, with a queue in front and the guard LOOSENED instead of tightened. A file that will never convert is not a debt. NOT extended to any other file by analogy',
  ],
  [
    BARTENDER_TOKEN_SCREENS,
    'exempt from check B for TWO of its three shells — D-41.2-07, granted under D-41.2-06\'s RULE and on THIS file\'s own argument, which plan 41.2-12 re-derived after explicitly declining to inherit the twin\'s decision. The argument differs from the twin\'s and runs in BOTH directions: the serve area "takes the whole screen above the Cancel row", so inside the primitive it becomes a panel body at the panel\'s own width — the bartender HAS TO AIM — while the narrow Cancel becomes a full-width control in the actions region under the thumb. The guard would loosen on the reversible act and tighten on the irreversible one, which is the exact inverse of what this surface needs. Both shells were kept LEGIBLE to the matcher throughout, so REMAINING never fell for a reason nobody wrote down',
  ],
];

/* ────────────────────────────────────────────────────────────────────────────
 * WHAT CHECK B NEVER OPENS — derived ONCE, and the refusal is keyed on all of it
 * ──────────────────────────────────────────────────────────────────────────── */

/**
 * The files check B skips before `shellShapes()` reads a line of them.
 *
 * **WHY THIS CONSTANT EXISTS AT ALL (WR-01).** Check B's loop skipped three
 * categories — the primitive, the declared exemption, and the fenced paths — and
 * the refusal below covered only the third. `stale` is computed as *on disk and
 * not in `measuredShells`*, so putting either of the other two on `REMAINING`
 * produced the identical wrong report the fence refusal was written to prevent:
 * the run printed `→ converted; remove this entry` about a file it had never
 * opened, and `REMAINING = measuredShells.size` fell by one. Measured on this
 * tree before the fix, with `FULL_BLEED_VIEWER` added to `REMAINING`: exit **0**,
 * `! B 1 REMAINING entr(y/ies) are STALE`, `REMAINING = 14` against fifteen
 * declared entries — while `Lightbox.tsx:82` still carries a native shell.
 *
 * **A debt counter that falls because the gate stopped looking** is the
 * proxy-goes-quiet defect this phase has already paid for twice (DEF-41-03, then
 * WR-02 inside the fence this phase had just added). It reappeared here because
 * two lists said what is skipped and only one of them was refused on.
 *
 * So there is now ONE list. Check B's loop reads it, and the refusal is keyed on
 * it.
 *
 * **AND THE SENTENCE THAT USED TO CLOSE THAT PARAGRAPH WAS FALSE (CR-03).** It
 * read, verbatim: *"the set that decides what is skipped IS the set the refusal
 * is keyed on, and the two cannot drift apart by an edit to either."* It is
 * quoted here rather than deleted, because a claim withdrawn silently reads as a
 * slip, and a false sentence in a gate's header is what the next reader trusts
 * without re-deriving it.
 *
 * **What made it false was not an edit — it was a category no edit ever added to
 * either list.** Check B skips on THREE mechanisms and only two of them are
 * lists: this Map, the fence, and **not being in `files` at all**. `files` is
 * `listScannableFiles(SRC_DIR)`, a walk restricted to `src/` and to
 * `SCANNED_EXTENSIONS`, so a `REMAINING` entry naming a real path outside `src/`,
 * or carrying an extension the walk does not scan, was never opened by any loop
 * and reached neither list. `stale` is computed as *on disk and not in
 * `measuredShells`*, so the same wrong report returned a third time. Measured on
 * this tree before the fix, with one entry naming a real stylesheet under `src/`:
 * exit **0**, one entry marked STALE with `→ converted; remove this entry`, and
 * `REMAINING` one below the declared count — about a file the gate never opened.
 *
 * **What is true now, and true by construction rather than by list maintenance:**
 * `neverOpenedReason()` is keyed on all three mechanisms. The third is `walked`,
 * a Set built from the very `files` array check B's loop iterates — not a fourth
 * list somebody must remember to edit. A list can drift from the loop; a set
 * derived from the loop's own input cannot, which is the difference between a
 * guarantee and a habit.
 *
 * **Two properties of that branch are load-bearing, and neither is decoration:**
 *
 *   - It is tested **FIRST**, because a path outside `files` never reaches the
 *     loop at all — the fence and this Map never got the chance to act on it. A
 *     path that is both fenced and unwalked is not fenced in any operative sense.
 *   - It is **guarded on the path existing on disk**. This refusal is computed
 *     BEFORE `missing` is, so an unguarded membership test would turn a
 *     `REMAINING` entry with a typo — today a FAILURE, *names a path that does
 *     not exist* — into a refusal. That is a failure laundered into "nothing was
 *     measured": this defect wearing the fix's clothes. A non-existent path
 *     returns null here and reaches the failure it reaches today.
 *
 * **AND THE SECOND PROPERTY WAS TRUE OF ONE BRANCH OUT OF THREE (DEF-41-07 item
 * 1, repaired by 41.1-02).** The paragraph above is kept exactly as it stood
 * rather than rewritten, because it states the right obligation — and the code
 * discharged it only on the walk branch. THIS Map's branch and the fence branch
 * each returned their reason with no existence test at all, so a `REMAINING`
 * entry naming a non-existent path that happened to match a fence glob refused
 * with a confident *"fenced — behind that glob"* about a file that is not there.
 * CR-03 established it with a run on a disposable copy: exit **2** rather than a
 * failure, and the refusal propagates as *nothing was measured* across the whole
 * aggregate. The obligation is now discharged ONCE, above all three branches, so
 * the three are equal by construction rather than by three copies of one test.
 *
 * **And the existence question is now asked case-exactly (DEF-41-07 item 4).**
 * `existsSync` on the house APFS volume is case-insensitive while the walk is
 * case-exact, so one typo had two verdicts depending on the machine. `walked` is
 * the authority and `existsSync` is a second opinion that can only rule a path
 * out — see `existsCaseExact`, which also names the sibling exposure in
 * `conversion-manifest.mjs` that plan 41.1-04 owns.
 *
 * **THE REASONS STAY APART, and that is the substance rather than the wording.**
 * This gate keeps `fenced by path, never measured` and `exempt from this check …
 * measured, declared correct` on separate printed lines because they are
 * different facts about a file:
 *
 *   - **the primitive itself** — check B measures copies OF it; the one
 *     implementation cannot be one of its own copies.
 *   - **exempt** — a file somebody **measured and declared correct** as what it
 *     is. A statement about its markup, made by a person.
 *   - **fenced** — a file **nobody measured at all**. A scope boundary, saying
 *     nothing whatever about the markup behind it.
 *   - **not in the walk** — a path that exists, and that this gate's own walk
 *     does not produce. Not a statement about the file and not a scope boundary
 *     either: the gate simply cannot reach it, and says which shapes it can.
 *
 * Collapsing them into one sentence in the refusal would re-lose the distinction
 * the docblock below keeps deliberately, so the refusal prints the reason **per
 * entry**.
 *
 * Shape: `path -> { kind, reason }`.
 */
export const NEVER_MEASURED_BY_B = new Map([
  [
    PRIMITIVE_FILE,
    {
      kind: 'the primitive itself',
      reason:
        'check B measures copies OF it — the one implementation cannot be one of its own copies',
    },
  ],
  [
    FULL_BLEED_VIEWER,
    {
      kind: 'exempt — measured and declared correct',
      reason:
        'a full-bleed media viewer, right to be a native shell and wrong to be a sheet; declared by §8.3 before this gate existed. A file that will never convert is not a debt',
    },
  ],
  /*
   * THE TWO BARTENDER FILES, ADDED BY PLAN 41.2-19 (D-41.2-06 and D-41.2-07).
   *
   * They enter HERE and not only in `DECLARED_EXCEPTIONS`, and the two lists are
   * not interchangeable: this Map is what check B's loop reads, and the refusal
   * above is keyed on it. A file declared an exception in the printed list but
   * absent from this Map would be OPENED by check B, found to carry a shell, and
   * reported as an UNDECLARED COPY — a red on a file a person measured and
   * declared correct, which is §0 rule 3's own definition of how a gate gets
   * switched off. WR-01 is the record of the two lists drifting the other way.
   *
   * **Each carries its OWN reason, not one reason cited twice.** An exemption
   * without its reason is indistinguishable from a file nobody got to, and this
   * gate's whole architecture keeps *exempt* (somebody measured it and declared
   * it correct) apart from *fenced* (nobody measured it at all).
   */
  [
    BARTENDER_REDEEM_SCREENS,
    {
      kind: 'exempt — measured and declared correct (D-41.2-06, the owner)',
      reason:
        "two of its three overlays are the BARTENDER's screens and will never convert: the serve area takes the whole screen so a bartender does not have to aim, and the row that reverts a token is kept narrow so a tap cannot hit it by mistake. Inside the primitive that row goes full-width under the thumb — money going backwards at a counter with a queue in front. A file that will never convert is not a debt",
    },
  ],
  [
    BARTENDER_TOKEN_SCREENS,
    {
      kind: 'exempt — measured and declared correct (D-41.2-07, under D-41.2-06\'s rule, on this file\'s own argument)',
      reason:
        'two of its three shells are the BARTENDER\'s screens, refused by plan 41.2-12 after it explicitly declined to inherit the twin\'s decision. This file\'s argument runs BOTH ways: the serve area becomes a panel body so the bartender has to aim, while the narrow Cancel goes full-width under the thumb — the guard loosening on the reversible act and tightening on the irreversible one',
    },
  ],
]);

/* ────────────────────────────────────────────────────────────────────────────
 * THE PHASE 42 FENCE — a scope boundary, and deliberately NOT a third exception
 * ──────────────────────────────────────────────────────────────────────────── */

/**
 * The paths check B does not read, because they belong to another phase.
 *
 * **A FENCE IS NOT AN EXEMPTION, and the difference is the whole reason this
 * constant is separate from `DECLARED_EXCEPTIONS` above.**
 *
 *   - `FULL_BLEED_VIEWER` is a file somebody **measured and declared correct**
 *     as what it is: a full-bleed media viewer, right to be a `<dialog>` and
 *     wrong to be a sheet.
 *   - These three globs are files **nobody measured at all**. Nothing here says
 *     the markup behind them is right. It says this phase does not open them.
 *
 * Collapsing the two into one word — in the code or, worse, in the report a
 * reader actually sees — is how a scope boundary quietly turns into an approval.
 * The constant keeps the sibling gate's name (`verify-touch-targets.mjs:499`) so
 * the two fences are recognisably the same mechanism; the **report** does not
 * spell it as an exemption, and that is on purpose.
 *
 * WHY THE FENCE EXISTS, AND WHY IT LANDED BEFORE THE MATCHER WIDENED. The
 * overlay matcher below is keyed on the SHAPE of an overlay rather than on one
 * z rung. Widening it that way, on this tree, reddens exactly one correct file:
 * **`src/components/scanner/ScanFlash.tsx:135`** — the door's accept/refuse
 * flash. It is `role="status"`, `aria-live="assertive"`, and it dismisses itself
 * on a timer: there is nothing to trap focus for and nothing for Escape to
 * close. **It is not a dialog**, converting it to the primitive would be wrong,
 * and it is not a `REMAINING` candidate either — that list's own header says
 * every entry is a dialog without a focus trap, so an entry for it would be a
 * false statement about a Phase 42 surface. A red on a correct file is the
 * failure §0 rule 3 says gets a gate switched off, so the fence is declared
 * FIRST and the matcher widens BEHIND it.
 *
 * **CHECKS A AND C ARE NOT FENCED, and that is a decision.** Check A reads the
 * primitive itself, which is nobody's door. Check C asks whether a dialog
 * reports its outcome invisibly — that is a **silent-failure report**, and a
 * phase boundary is a reason not to MODIFY a file, never a reason to go quiet
 * about a failure (`meta-gates.md`, zero fallimenti silenziosi). Measured on
 * this tree, not assumed: **no file behind the fence imports the primitive**, so
 * check C's numbers are identical either way today — the exclusion would cost
 * nothing now and would cost the wrong thing later.
 *
 * By path and not by judgement, because the failure mode of a judgement is a
 * gate that widens its own scope one convenient file at a time.
 *
 * **AN OVERLAP WITH `REMAINING` IS A REFUSAL, NOT A WARNING (WR-02).** The two
 * lists say incompatible things about the same file: `REMAINING` says *a shell
 * is still standing here and it is a debt*, the fence says *this phase never
 * opens this file*. Before this refusal existed, the fence won by construction —
 * check B `continue`s on a fenced file before `shellShapes` is ever called, so
 * the path landed in `stale` (on disk, not in `measuredShells`) and the run
 * printed `→ converted; remove this entry` about a file it had not read, while
 * `REMAINING = measuredShells.size` fell by one. **A debt counter going down
 * because the gate stopped looking** is the proxy-goes-quiet defect this phase
 * has already paid for once (DEF-41-03), reappearing inside the fence this phase
 * had just added.
 *
 * A warning would not have been enough, because the number is what a reader
 * believes and the number was already wrong by the time the warning printed. So
 * the overlap is raised **before check B measures anything** — before the loop
 * that populates `measuredShells` — and nothing is printed on a run whose two
 * lists contradict each other.
 *
 * **The arrival condition, named rather than left to be discovered:** zero
 * overlap on this tree today, and it goes live the moment Phase 42 moves or adds
 * a dialog under `src/components/scanner/**`, `src/app/(admin)/**\/scanner/**`
 * or `src/app/(admin)/door/**` — a file that would then be both a declared debt
 * and a path nobody measured. Which of the two lists gives way is a decision for
 * a person, and the refusal says so instead of choosing.
 *
 * Shape: `[glob, reason]`. The globs are compared with the manifest's
 * `PHASE_42_PATHS` before anything is measured, and a drift refuses.
 */
export const PHASE_42_EXEMPT_PATHS = [
  [
    'src/app/(admin)/**/scanner/**',
    'the scanner surface and its route — Phase 42 decides what the door looks like, and check B never reads a line of it',
  ],
  [
    'src/components/scanner/**',
    "the scanner's components — including the accept/refuse flash at ScanFlash.tsx:135, which is a status layer and not a dialog, and which the widened matcher would otherwise redden",
  ],
  [
    'src/app/(admin)/door/**',
    "the door's second address (STAFF-04) — fencing one address and not the other would fence half a thing",
  ],
];

/**
 * `**` crosses separators, `*` does not, everything else is literal.
 *
 * Copied from `verify-touch-targets.mjs:863-880` rather than imported: a gate is
 * self-contained in this repository (see the header), and the module that would
 * be the natural home for shared helpers is the one that exits at module scope.
 */
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
 * What a dialog shell looks like, in the two shapes it takes today
 * ──────────────────────────────────────────────────────────────────────────── */

/**
 * Shape 1 — the hand-rolled overlay. Three parts on ONE line.
 *
 * **All three are required together, because each alone is ordinary**: the
 * positioning utility is everywhere and the inset is common. That sentence has
 * always been true and it stays.
 *
 * **THE RUNG IS A FAMILY, NOT A LITERAL — and this is what changed.** The
 * matcher used to require ONE specific z rung, the one the eleven incumbents
 * happen to carry. But `41-UI-SPEC.md` §10 keeps that rung declared **for
 * anything that must clear the navigation WITHOUT being modal**, which makes it
 * a property an overlay usually has and never the property that makes it one.
 * A nineteenth copy written one rung up, one rung down, or at any arbitrary
 * rung was invisible to check B — a gate gone quiet while the thing it tracks is
 * still there (WR-09, `41-REVIEW.md`). So the rung matches as a family.
 *
 * **THE FAMILY IS THE WHOLE FAMILY, BECAUSE THE PRINTED SENTENCE PROMISED IT
 * (WR-02's sibling, WR-03).** The first widening stopped at two-or-more digits
 * and a bracketed integer, while the report told every reader *"a copy at any
 * rung is seen"*. Single-digit rungs and the `auto` keyword are real utilities,
 * and a nineteenth overlay written at either was invisible exactly as a
 * two-digit one had been — with the report asserting otherwise. Two ways out
 * existed: narrow the sentence, or widen the matcher.
 *
 * **The matcher widened, and the direction was chosen on a measurement rather
 * than on taste.** Every overlay line under `src/` carrying all three parts uses
 * a bracketed rung — twelve at one rung, four at another, one at a third — and
 * the tree holds **no single-digit and no keyword rung at all**. The delta of
 * widening is therefore measured **zero**: it cannot redden a correct file here,
 * and it leaves a reader believing something true. Narrowing the sentence would
 * have cost the same zero and bought a weaker gate.
 *
 * **AND THE NEGATIVE FORM IS PART OF THE FAMILY (WR-05), FOR THE THIRD TIME AND
 * THE SAME REASON.** The printed sentence promised *"a copy is seen at any rung
 * WRITTEN OUT in the class string"* and named exactly two exclusions — a rung
 * reached through a variable, and a class string built by concatenation. A
 * negative rung is written out and is neither, and the left boundary blocked it:
 * `LEFT_BOUNDARY` refuses a preceding hyphen, so the minus sign of the negative
 * form stopped the match. An overlay written at a negative rung was invisible to
 * check B while the report asserted the opposite.
 *
 * The direction was again chosen on a measurement: the tree holds **zero**
 * negative rungs, in the strict form and in the loose one, so the delta of the
 * widening is a measured zero — the same argument, remeasured on this tree on
 * this day rather than inherited from the round that made it.
 *
 * **THE OPTIONAL MINUS DOES NOT REOPEN WHAT THE LEFT BOUNDARY DEFENDS**, which is
 * the failure mode that matters more (§0 rule 3: a gate that reddens correct code
 * gets switched off). The boundary is evaluated BEFORE the optional sign, so a
 * rung token preceded by a word character or by a hyphen still cannot match at
 * either entry point: on an ordinary hyphenated utility the engine's attempt at
 * the hyphen fails the look-behind on the word character before it, and its
 * attempt at the rung prefix fails the look-behind on the hyphen. A custom
 * property fails too, since a doubled hyphen leaves no way to reach the prefix.
 * Measured on this tree: no correct file is reddened, and the delta is 0 lines.
 *
 * What the family covers now: one or more digits, the `auto` keyword, or an
 * arbitrary bracketed value with no whitespace inside — each optionally negated.
 * What it still cannot see is unchanged and stated in the header and in the
 * printed sentence: a rung reached through a **variable**, and a class string
 * built by **concatenation**.
 *
 * **BOTH TOKENS ARE BOUNDARY-GUARDED, and that guards the opposite error.**
 * `line.includes` on the positioning utility also fired on the same letters at
 * the end of an ordinary English word — a **red on a correct file**, which §0
 * rule 3 records as the failure that gets a gate switched off, and which is a
 * worse outcome than the miss it was meant to fix. The guards are this
 * repository's own technique, `verify-tokens.mjs:553-559`.
 *
 * **WIDENING THE RUNG IS WHAT MADE THE PHASE 42 FENCE NECESSARY.** On this tree
 * the family matcher reddens exactly one correct file —
 * `src/components/scanner/ScanFlash.tsx:135`, the door's accept/refuse status
 * flash, which is not a dialog — so `PHASE_42_EXEMPT_PATHS` above was declared
 * FIRST and this widening landed behind it. The two changes are connected, not
 * coincidental, and mutation A in `41-16-SUMMARY.md` is where the connection was
 * observed rather than argued.
 *
 * Every fragment is concatenated and no complete utility appears as a literal —
 * the DEF-41-01 reason in the header, which now covers the positioning utility
 * too, since it used to be spelled whole.
 */
const LEFT_BOUNDARY = '(?<![' + '\\w-])';
const RIGHT_BOUNDARY = '(?![' + '\\w-])';
const POSITION_UTILITY = 'fix' + 'ed';
const INSET_UTILITY = 'inset-' + '0';
const RUNG_PREFIX = 'z' + '-';
/** The optional leading minus — the negative form of the rung (WR-05). */
const RUNG_SIGN = '-' + '?';
/** One-or-more digits, the auto keyword, or an arbitrary bracketed value. */
const RUNG_FAMILY = '(?:' + '\\d+' + '|' + 'auto' + '|' + '\\[[^\\]\\s]+\\]' + ')';

export const OVERLAY_PARTS = [
  new RegExp(LEFT_BOUNDARY + POSITION_UTILITY + RIGHT_BOUNDARY),
  new RegExp(LEFT_BOUNDARY + INSET_UTILITY + RIGHT_BOUNDARY),
  new RegExp(LEFT_BOUNDARY + RUNG_SIGN + RUNG_PREFIX + RUNG_FAMILY + RIGHT_BOUNDARY),
];

/** The one place the three parts are asked about a line. */
function isOverlayLine(line) {
  return OVERLAY_PARTS.every((re) => re.test(line));
}

/**
 * `OVERLAY_PARTS` and the STRIPPER checked against their own description, on
 * EVERY run.
 *
 * Ten fixed strings, assembled the same way the regexes are, and every one of
 * them is measured through the shared stripper before it reaches the
 * matcher. If any disagrees with its expectation the run **refuses** — a
 * matcher that does not behave as its own docblock describes has not measured
 * this tree, it has measured something else, and a verdict from it would be a
 * number nobody can read.
 *
 * **The last four arrived with 41-29, and they are the reason the probes now go
 * through the stripper.** Until then the self-check fed `isOverlayLine` a raw
 * string, so it said nothing about the helper the matcher is FED from — which
 * is exactly where the defect was: a line whose trimmed text started with a
 * closed comment was blanked entire, and the overlay after that comment was
 * invisible to check B on a green run (`41-GAP-REVIEW-4.md` CR-02). Two of the
 * four carry the direction that defect broke — an overlay behind a leading
 * closed comment, in both comment forms — and two carry the OPPOSITE
 * direction, which is DEF-41-02's whole reason: prose quoting the three parts
 * must still cost nothing, whether it is a full-line JSX comment or a docblock
 * continuation. A fix that bought sight by reddening a correct file would fail
 * here, on every run, rather than in a review four rounds later.
 *
 * Three of them arrived with a widening, and each is a shape the report already
 * claimed to see while the regex did not: a single-digit rung and the keyword one
 * (WR-03), then the negative form (WR-05).
 *
 * **The first probe carries the OPPOSITE direction**, and it stays: the
 * positioning utility at the end of a longer word must NOT match. That is the
 * boundary guard, and the guard is what the optional minus sign was checked
 * against — a widening whose cost is a red on a correct file is not a widening
 * worth having.
 *
 * **THESE PROBES ARE NOT THE EVIDENCE.** They are six strings written by the
 * same hand as the regexes above, so they share its blind spots and cannot
 * discover a file nobody thought of. The evidence is the live run on the real
 * tree — and this exact defect is why the distinction is written here rather
 * than assumed: three probes of this shape passed while the widened matcher
 * reddened a correct file at the door — and, on the other side of the same coin,
 * three probes of this shape passed for a whole round while the printed sentence
 * promised a family the regex did not match.
 *
 * ── EVERY `line` IS A LINE ARRAY, AND THAT IS WR-01's FIX ────────────────────
 *
 * Until `41.1-02` each row's `line` was a single STRING fed through
 * `stripLeadingComments` alone, under a comment claiming it was *"the path a
 * real line takes"*. **It was not.** Check B reads `liveLines`, and the
 * multi-line state — the thing that decides whether a comment's body is prose or
 * code, and the thing CR-01 and CR-02 both live in — exists only there. A
 * self-check built on the single-line function is not weak at seeing that state:
 * it is **structurally unable** to reach it.
 *
 * So every row now carries an ARRAY of raw lines and goes through
 * `liveLinesFrom`, which is exactly the function `liveLines` calls on a real
 * file. A row matches when ANY of its live lines matches — which is precisely
 * how `shellShapes` decides a file carries a shell.
 *
 * **The four rows at the end were INEXPRESSIBLE before the array**, and that is
 * the evidence WR-01 is closed rather than merely described. They come in two
 * pairs, and the pairing is the point:
 *
 *   - **CR-01** — a multi-line JSX comment whose TERMINATING line carries a live
 *     overlay after the closer. Expected **match**: span-stripping resumes after
 *     the closer instead of pushing an empty line.
 *   - **CR-02** — a JSX comment whose closer carries whitespace before the
 *     closing brace, with a live overlay on a later line. Expected **match**: the
 *     closer is a regular expression, not the exact three-character token, so the
 *     state does not run to end of file.
 *   - **and each of those two has its CONTROL**, in the opposite direction: the
 *     same multi-line comment with the three parts quoted INSIDE the body and no
 *     live code after the closer. Expected **no match**, because prose must still
 *     cost nothing (DEF-41-02).
 *
 * The controls are not decoration and they are not symmetry for its own sake.
 * **A `match` expectation cannot discriminate against a stripper that sees too
 * much code** — a blind stripper matches too, for the wrong reason, and the row
 * goes green. The two `no match` controls are the rows that actually go red when
 * the multi-line state is taken away, which is what makes this table able to
 * report the defect it exists for rather than merely to describe it.
 */
const MATCHER_PROBES = [
  {
    verdict: 'no match',
    label: 'the positioning utility at the end of a longer word',
    line: [
      '<div className="pre' + POSITION_UTILITY + ' ' + INSET_UTILITY + ' ' + RUNG_PREFIX + '[60]">',
    ],
    expected: false,
  },
  {
    verdict: 'match',
    label: 'the three parts at a bracketed rung other than the incumbents\'',
    line: [
      '<div className="' + POSITION_UTILITY + ' ' + INSET_UTILITY + ' ' + RUNG_PREFIX + '[70]">',
    ],
    expected: true,
  },
  {
    verdict: 'match',
    label: 'the three parts at a two-digit numeric rung',
    line: ['<div className="' + POSITION_UTILITY + ' ' + INSET_UTILITY + ' ' + RUNG_PREFIX + '50">'],
    expected: true,
  },
  {
    verdict: 'match',
    label: 'the three parts at a SINGLE-DIGIT rung (WR-03)',
    line: ['<div className="' + POSITION_UTILITY + ' ' + INSET_UTILITY + ' ' + RUNG_PREFIX + '0">'],
    expected: true,
  },
  {
    verdict: 'match',
    label: 'the three parts at the auto KEYWORD rung (WR-03)',
    line: [
      '<div className="' + POSITION_UTILITY + ' ' + INSET_UTILITY + ' ' + RUNG_PREFIX + 'auto">',
    ],
    expected: true,
  },
  {
    verdict: 'match',
    label: 'the three parts at a NEGATIVE rung (WR-05)',
    line: [
      '<div className="' +
        POSITION_UTILITY +
        ' ' +
        INSET_UTILITY +
        ' ' +
        '-' +
        RUNG_PREFIX +
        '10">',
    ],
    expected: true,
  },
  {
    verdict: 'match',
    label: 'an overlay behind a leading CLOSED JSX comment (41-29, CR-02)',
    line: [
      JSX_COMMENT_OPEN +
        ' the lid ' +
        JSX_COMMENT_CLOSE +
        ' <div className="' +
        POSITION_UTILITY +
        ' ' +
        INSET_UTILITY +
        ' ' +
        RUNG_PREFIX +
        '[60]">',
    ],
    expected: true,
  },
  {
    verdict: 'match',
    label: 'an overlay behind a leading CLOSED block comment (41-29)',
    line: [
      '/' +
        '*' +
        ' the lid ' +
        BLOCK_COMMENT_CLOSE +
        ' <div className="' +
        POSITION_UTILITY +
        ' ' +
        INSET_UTILITY +
        ' ' +
        RUNG_PREFIX +
        '[60]">',
    ],
    expected: true,
  },
  {
    verdict: 'no match',
    label: 'a FULL-LINE JSX comment quoting the three parts (DEF-41-02)',
    line: [
      JSX_COMMENT_OPEN +
        ' the shell is ' +
        POSITION_UTILITY +
        ' ' +
        INSET_UTILITY +
        ' ' +
        RUNG_PREFIX +
        '[60] ' +
        JSX_COMMENT_CLOSE,
    ],
    expected: false,
  },
  {
    verdict: 'no match',
    label: 'a docblock CONTINUATION line quoting the three parts (DEF-41-02)',
    line: [
      '* the shell is ' + POSITION_UTILITY + ' ' + INSET_UTILITY + ' ' + RUNG_PREFIX + '[60]',
    ],
    expected: false,
  },

  // ── the four MULTI-LINE rows (WR-01). None of these can be written as a single
  // string, which is why they did not exist before `liveLinesFrom` took an array.
  {
    verdict: 'match',
    label: 'MULTI-LINE: an overlay on the TERMINATING line of a JSX comment (CR-01)',
    line: [
      JSX_COMMENT_OPEN + ' the lid, opened here and',
      ' terminated here ' +
        JSX_COMMENT_CLOSE +
        ' <div className="' +
        POSITION_UTILITY +
        ' ' +
        INSET_UTILITY +
        ' ' +
        RUNG_PREFIX +
        '[60]">',
    ],
    expected: true,
  },
  {
    verdict: 'no match',
    label: 'MULTI-LINE control: the same comment quoting the three parts in its BODY',
    line: [
      JSX_COMMENT_OPEN + ' the lid, opened here and',
      ' the shell is ' +
        POSITION_UTILITY +
        ' ' +
        INSET_UTILITY +
        ' ' +
        RUNG_PREFIX +
        '[60], terminated here ' +
        JSX_COMMENT_CLOSE,
    ],
    expected: false,
  },
  {
    verdict: 'match',
    label: 'MULTI-LINE: a closer with WHITESPACE before the brace, overlay after (CR-02)',
    line: [
      JSX_COMMENT_OPEN + ' the lid, closed with a space before its brace',
      ' ' +
        BLOCK_COMMENT_CLOSE +
        ' } <div className="' +
        POSITION_UTILITY +
        ' ' +
        INSET_UTILITY +
        ' ' +
        RUNG_PREFIX +
        '[60]">',
    ],
    expected: true,
  },
  {
    verdict: 'no match',
    label: 'MULTI-LINE control: the same spaced closer, three parts quoted in the BODY',
    line: [
      JSX_COMMENT_OPEN + ' the lid, closed with a space before its brace, and',
      ' the shell is ' +
        POSITION_UTILITY +
        ' ' +
        INSET_UTILITY +
        ' ' +
        RUNG_PREFIX +
        '[60] ' +
        BLOCK_COMMENT_CLOSE +
        ' }',
    ],
    expected: false,
  },
];

/** Shape 2 — a native `<dialog>` element written outside the primitive. */
const NATIVE_SHELL_RE = /<dialog\b/;

function shellShapes(relPath) {
  const found = [];
  liveLines(relPath).forEach((line, i) => {
    if (isOverlayLine(line)) {
      found.push({ line: i + 1, shape: 'hand-rolled overlay', source: line.trim() });
    }
    if (NATIVE_SHELL_RE.test(line)) {
      found.push({ line: i + 1, shape: 'native <dialog>', source: line.trim() });
    }
  });
  return found;
}

/* ────────────────────────────────────────────────────────────────────────────
 * REMAINING — the copies still standing, with what will remove each
 * ──────────────────────────────────────────────────────────────────────────── */

/**
 * Every file other than the primitive that still declares a dialog shell.
 *
 * **Measured on this tree, not copied from a document**: eleven hand-rolled
 * overlays and seven native shells, of which one — the media viewer — is a
 * declared exception rather than a debt, so the list opened at **seventeen**.
 * Plan 41-09 converted three of them in the same commit that removed their
 * lines, and it stands at **fourteen**.
 *
 * THE DISCIPLINE, which is the whole point of the constant existing:
 *
 *   - **Removing an entry is what converting a dialog looks like.** When a file
 *     stops carrying a shell, its line leaves this list in the same commit.
 *   - **Adding an entry is a DECISION that edits this constant**, not a diff
 *     nobody reads (`verify-sunset-gradient.mjs:141-149`). It means somebody
 *     wrote a nineteenth copy of a thing that exists once, and the reason
 *     belongs on the line.
 *   - The reason and the target travel WITH the entry
 *     (`verify-routes.mjs:130-152`), because a list of paths whose reasons live
 *     somewhere else is a list whose reasons stop being true unnoticed.
 *
 * **The `target` column names a conversion unit, and NOT a plan — deliberately.**
 * Measured across every `*-PLAN.md` in this phase: **no remaining plan in Phase
 * 41 declares any of these files.** Writing a plan number here would be a claim
 * about work nobody has scheduled, which is the shape DEF-41-03 records — a
 * debt that looked owned and was not. What is true is the surface each one
 * belongs to, so that is what is written.
 *
 * ── THE GROUP TAG (D-41.1-11) ───────────────────────────────────────────────
 *
 * Shape: `[path, group, reason, target]`. The group is a **tuple field and not a
 * separate list per group**, and the reason is the decisive one rather than the
 * tidy one:
 *
 *   1. **The reason must travel with the entry** — `verify-routes.mjs:130-152`'s
 *      established form, quoted in this gate's own header. Splitting into
 *      per-group lists puts the group in the LIST NAME, which leaves an entry
 *      able to sit in the wrong list silently. Two of the entries below were
 *      already mislabelled in prose; a per-group list would have made them
 *      structurally wrong instead of merely wrong, and correcting a sentence
 *      would have meant moving a file between lists.
 *   2. `conversion-manifest.mjs:80` already carries a **state** column as a third
 *      field (`[path, state, reason]`) with a docblock saying the column is
 *      load-bearing. The tag is the same construction and needs no new idea.
 *
 * **THE VOCABULARY IS CLOSED AT FOUR VALUES** — `work`, `public-member-money`,
 * `phase-42`, `exempt` — and an unknown or missing tag is a **REFUSAL**, not a
 * warning. An untagged entry is not a small omission: it makes the per-group
 * count meaningless, and a meaningless count is worse than no count at all,
 * because criterion 2 and criterion 4 of this phase are read off it.
 *
 * **THE TAGS ARE ASSIGNED FROM THE MEASURED IMPORTERS, NEVER FROM THE PATH
 * PREFIX.** `EditArtistButton.tsx` reads like an admin component and its only
 * importer is `src/app/(public)/artists/[slug]/page.tsx:5`; a tag derived from a
 * glob would have misfiled it, and the same derivation would have misfiled
 * `MediaUpload.tsx` in the sibling breakpoints gate. Three entries below are
 * tagged `work` although they sit outside `(work)/`: they are reached through a
 * work page's import closure and are paid by the knot plans (D-41.1-19).
 *
 * ── A CLASS, AND NOT FIVE TYPOS ─────────────────────────────────────────────
 *
 * **Five reason strings across two gates named the wrong surface** — three in
 * `verify-tables.mjs`, two here — and every one of them was true of an
 * INTENTION and never of the tree. `EditArtistButton.tsx` was filed under an
 * artists admin surface when no work page reaches it at all;
 * `CreateVenueModal.tsx` was filed under a venues admin surface beside the event
 * form when the event form is its only importer.
 *
 * Five is a pattern, not five slips, and the pattern has a mechanism: a surface
 * name is a sentence somebody believed, while an importer is something a command
 * prints. **So every target below now names the importer it was re-derived
 * from, with its line.** The reason travels with the entry *so that it stays
 * true*, and a sentence that cannot be re-derived cannot stay true.
 *
 * **The two withdrawn phrases are DESCRIBED here and not quoted verbatim, and
 * that is a deliberate departure from this file's own habit** of keeping a
 * superseded sentence visible word for word (`PageShell.tsx:42-46`). The reason
 * is the same one that keeps whole utility class strings out of this file
 * (DEF-41-01): a phrase that survives anywhere in the file cannot be grepped for.
 * Reproducing them would have left `grep -n` unable to answer *does any entry
 * still name the wrong surface?* — and that grep is the only cheap check a later
 * reader has. The withdrawal is recorded; the strings are not, on purpose.
 */
/**
 * ── THE LIST IS EMPTY, AND THAT IS A DECISION RATHER THAN A DRIFT ────────────
 *
 * The emptiness guard below refuses an empty `REMAINING` and says why in its own
 * sentence: *"the emptiness should be a DECISION written above the constant —
 * not a list that quietly emptied itself while nobody was reading."* This is
 * that decision, and the guard now reads it instead of refusing blind. The shape
 * is `verify-tables.mjs:534-571`'s, **copied rather than invented**, because a
 * gate in this tree has already made this transition once.
 *
 * **Written 2026-08-14 by plan 41.2-19, the phase's final reconciliation.** The
 * last seven entries left in two movements, and the two are different acts:
 *
 *   - **FIVE were PAID and printed STALE.** `RefundRequestButton.tsx` and
 *     `GuestLoginBanner.tsx` (plan 41.2-02, the two unreachable files D-41.2-03
 *     ordered converted rather than deleted); `SumUpCheckoutModal.tsx` (plan
 *     41.2-10, the shared money core); `SecretVenueDialog.tsx` (plan 41.2-16,
 *     knot 3, the one whose conversion was Critical rather than visual);
 *     `MyMediaSection.tsx` (plan 41.2-14, and it is the phase's one debt paid by
 *     **DELEGATION** — it renders the declared permanent exemption instead of
 *     re-shelling onto the primitive).
 *   - **TWO were RECLASSIFIED, and that is not a deletion.**
 *     `RedeemConfirmationModal.tsx` (D-41.2-06, the owner's) and
 *     `GuestTokenDisplay.tsx` (D-41.2-07, granted under that rule on its own
 *     file's argument) left this list for `DECLARED_EXCEPTIONS` and
 *     `NEVER_MEASURED_BY_B` above, **each carrying its own reason**. They still
 *     declare shells and the gate still knows it; what changed is that a person
 *     measured them and declared them correct. The debt list is empty and what
 *     remains is DECLARED CORRECT rather than forgotten — which is how criterion
 *     3 closes honestly instead of by relaxation.
 *
 * **Every one of the seven was re-derived from the tree first**, with a second
 * instrument that deliberately does NOT use the gates' shared comment stripper
 * (D-41.1-22) — asking the gate what it thinks is not a check on the gate. That
 * instrument reproduced a known non-zero on a positive fixture and a known zero
 * on a negative one before it reported anything, and refuses with exit 2 if it
 * cannot: wave 4 of this phase recorded a corroborating instrument that returned
 * 0/0/0 on eight files, four of which the gates reported with 3, 1, 1 and 3
 * overlays, and believing it would have authorised deleting **every** entry with
 * a second instrument's agreement on each deletion. Raw counts measured
 * 2026-08-14: **0** for all five paid entries (two of them 1, in a DOCBLOCK, at
 * `SecretVenueDialog.tsx:97` and `MyMediaSection.tsx:41` — raw ABOVE stripped,
 * which is the harmless direction) and **2** and **2** for the two reclassified,
 * which is the number the gate reports and the reason they are not deletions.
 * **No row's raw count came out LOWER than its stripped count**, which is the
 * direction that would have stopped the deletion.
 *
 * **Why an empty list here does not become a number that lies.** Check B is a
 * TREE-SIDE accounting, not a list-side one: it opens **every** walked file
 * except the primitive, the four declarations above and the Phase 42 fence, and
 * a file found carrying a shell that is on no list fails as an **UNDECLARED
 * COPY** — never as a missing list entry. With the list empty the arithmetic is
 * `measured shells = 1 primitive + 0 remaining + 3 exempt files + 0 fenced`, and
 * a ninth hand-rolled shell written tomorrow reddens check B on its own path.
 * The migration can therefore be closed without the gate losing its teeth, which
 * is exactly the condition the guard was protecting.
 *
 * **What this does NOT say.** It does not say Escape closes anything, that a
 * sheet rises from the bottom edge below 768px, or that the page behind a panel
 * stops scrolling. Those are H41-2 — a person, at two widths — and they are
 * still owed. `null` here means the migration is open; an object means it is
 * closed, and the guard requires all three fields so a truthy placeholder cannot
 * satisfy it.
 */
export const MIGRATION_CLOSED = {
  date: '2026-08-14',
  by: 'plan 41.2-19',
  why:
    'every hand-rolled dialog shell in the tree is either the primitive, or one of the ' +
    'three files a person measured and declared correct with its reason on the line; ' +
    'check B still opens every other walked file, so a ninth copy written tomorrow fails ' +
    'as an undeclared copy rather than as a missing list entry',
};

export const REMAINING = [
  // ── the eleven hand-rolled overlays. None of them handled Escape, none
  // trapped focus, none made the document behind it inert — measured. Every
  // dialog on the public purchase path was among them, and none is now.
  //
  // PAID by plan 41.2-02 — `src/app/(public)/tickets/[id]/RefundRequestButton.tsx`
  // and `src/app/(public)/events/[slug]/menu/GuestLoginBanner.tsx`, the two files
  // D-41.2-03 ordered CONVERTED rather than deleted or exempted. Neither is
  // reached by any closure, so no surface conversion would ever have cleared
  // them as a by-product and criterion 3 could not have closed without an
  // explicit disposition. Exempting the banner would have been a lie — its
  // import is commented out with a restore note — and deleting either would have
  // answered a product question this phase does not own, on a public repository,
  // irreversibly.
  //
  // PAID by plan 41.2-10 — `src/app/(public)/events/[slug]/SumUpCheckoutModal.tsx`,
  // the shared money core, converted ONCE in wave 5 as spine precisely so that
  // three surfaces in later waves would not all open the same file.
  //
  // PAID by plan 41.2-16 — `src/app/(public)/events/[slug]/SecretVenueDialog.tsx`,
  // knot 3, and the one entry on this list whose conversion was CRITICAL rather
  // than visual: it stands where a secret address does not. It reached the
  // platform's modal without one conditional line changing, its three unlock
  // branches still three and its deliberate two-bullet asymmetry intact.
  //
  // PAID by plan 41.2-14 — `src/components/media/MyMediaSection.tsx`, and this
  // one is the phase's only debt paid by DELEGATION rather than by a shell swap:
  // the tree's only role-marked overlay now renders the file already declared
  // PERMANENTLY EXEMPT instead of declaring a shell of its own. That was decided
  // in writing BEFORE the diff, which is why it is not an exemption granted by
  // analogy — see `ROLE_DIALOG_OVERLAY` above, whose docblock keeps its own
  // superseded sentence rather than deleting it.
  //
  // **The declared list went 7 → 0. The PRINTED `REMAINING` went 2 → 2, then
  // 2 → 0 by RECLASSIFICATION, and the difference between those two movements is
  // the whole substance of this commit.** This gate prints two numbers on
  // purpose: the declared count is this constant's length, and `REMAINING` is
  // the live count of files check B opened and found still carrying a shell. All
  // five paid files stopped carrying one in their own plans' commits, so the
  // live count had already fallen and the gate had been printing all five STALE
  // — *"converted; remove this entry"* — ever since. That notice is what makes
  // these five deletions a RESPONSE rather than a tidy.
  //
  // RECLASSIFIED by plan 41.2-19, and NOT deleted — the two bartender files,
  // `RedeemConfirmationModal.tsx` (D-41.2-06) and `GuestTokenDisplay.tsx`
  // (D-41.2-07). Both still declare shells; both were measured at **2** raw
  // overlay lines apiece on 2026-08-14, agreeing with the gate exactly. They
  // moved to `DECLARED_EXCEPTIONS` and `NEVER_MEASURED_BY_B` above, each with
  // its own argument. Neither was rewritten into a form the gate cannot see:
  // silencing a number without changing the thing is the fifth mechanism this
  // phase recorded, and `REMAINING` stayed at its honest value through wave 7.
  //
  // PAID by plan 41.1-17 — the two refund overlays,
  // `src/app/(admin)/admin/events/[id]/tickets/RefundActions.tsx` and
  // `src/components/admin/RefundDialog.tsx`, both converted as SPINE in wave 7
  // precisely so that the two wave-8 plans reaching them would not both open the
  // same file. Both were tagged `work` — reached through a work page's import
  // closure though they sit outside `(work)/` — so these two are the deletions
  // that took the WORK GROUP to 0 and left it there.
  //
  // Deleted by plan 41.1-24 (D-41.1-22) after re-deriving both from the tree
  // with a raw needle count that does NOT use the gates' shared comment
  // stripper. Hand-rolled overlay markers measured 2026-08-14: **0** and **0**.
  // The gate had been printing both STALE — *"converted; remove this entry"* —
  // which is what makes these deletions a response rather than a tidy.
  // PAID by plan 41.1-07 task 1 — `src/components/venues/EditVenueButton.tsx`
  // was the only entry on this list sitting squarely on the work surface, and it
  // declares no shell of its own now: it mounts the Dialog primitive, so Escape,
  // the focus trap and the inert background come from the platform rather than
  // from a copy. Declared entries went 14 → 13 and the work group 4 → 3; the
  // MEASURED number did not move, because the file had already stopped carrying
  // a shell in that plan's own commit and this gate had been printing it STALE
  // ever since — *"converted; remove this entry"*. That notice is what makes this
  // deletion a response rather than a tidy, and nothing else on the list moved.
  //
  // Deleted by plan 41.1-11, not by 41.1-07: D-41.1-22 gives every gate edit in a
  // wave to the wave's reconciliation, and the entry was re-derived from the tree
  // before the line was removed rather than taken from the SUMMARY that reported
  // it — the gate's verdict and a second instrument agreed at zero.
  // PAID by plan 41.2-04 task 2 — `src/components/artists/EditArtistButton.tsx`
  // was this phase's first dialog conversion, and it landed on the cheapest
  // correct place for one: a surface carrying no money and no address. Its
  // hand-rolled overlay, panel and heading are gone for the Dialog primitive at
  // §8.3's closed lg size, so Escape, the focus trap, background inertness and
  // the top layer come from the platform instead of from a copy.
  //
  // **Declared entries went 8 → 7 and the tag balance went
  // `public-member-money` 8 → 7; the WORK GROUP was 0 before and is 0 after, and
  // no entry was moved between groups to make any count come out right.** The
  // MEASURED number did not move — `REMAINING = 5` before and after — because
  // the file had already stopped carrying a shell in plan 41.2-04's own commit
  // and this gate had been printing it STALE ever since: *"converted; remove
  // this entry"*. That notice is what makes this a response rather than a tidy.
  //
  // Deleted by plan 41.2-05 (D-41.1-22), after re-deriving it from the tree with
  // a **second instrument that does not use the gates' shared comment stripper**
  // — a raw needle count over the un-stripped file for all three parts of the
  // hand-rolled shell on one line, and for the native shell. Measured
  // 2026-08-14: **0** and **0**, agreeing with the gate exactly. Every one of
  // this list's eight entries was re-derived the same way before one line was
  // removed, and not one raw count came out LOWER than the stripped count, which
  // is the direction that would have stopped the deletion.
  //
  // TWO ENTRIES THAT ARE ALSO STALE STAY, AND THAT IS A DECISION.
  // `RefundRequestButton.tsx` and `GuestLoginBanner.tsx` were converted by plan
  // 41.2-02 and this gate prints both STALE. They are NOT deleted here, and the
  // reason is not that deleting them would empty the list — it would not, and
  // both remaining groups stay non-empty either way. The reason is that a
  // deletion belongs in the same wave that writes the gate's CLOSURE DECISION,
  // which is plan 41.2-19. Split across two waves a deletion is a tidy-up that
  // happens to shrink a counter; kept beside `MIGRATION_CLOSED` it is an answer
  // with its reasoning next to it. This repository has four recorded recurrences
  // of a debt that went quiet because a counter fell for a reason nobody wrote
  // down, and the defence is that a number only ever moves in the same commit as
  // the sentence explaining why. **That commit is this one**, and both entries
  // left in it: the two stale ones with the five, and the two live ones by
  // reclassification, all beside the closure decision above.

  // ── the native shells this plan does not convert. Each already has the
  // platform behaviours; what each still has is its own copy of the shell.
  // PAID by plan 41.1-20 — `RevealVenueDialog.tsx`, the UI of a MONOTONE guard,
  // converted last among the three knots and with its domain gate held: the
  // conditional deciding whether the panel is drawn, and every prop it is given,
  // are byte-identical. It was tagged `work`, reached from the edit page through
  // the reveal panel.
  //
  // PAID by plan 41.1-19 — the two creation modals,
  // `src/components/venues/CreateVenueModal.tsx` and
  // `src/components/artists/CreateArtistModal.tsx`, both mounted from the event
  // form and both converted as satellites of the event-form knot.
  //
  // **A DISAGREEMENT WITH THIS PLAN'S OWN EXPECTATION, RECORDED RATHER THAN
  // RESOLVED QUIETLY.** Plan 41.1-24 expected the list to keep every
  // `public-member-money` entry as Phase 41.2's, and these two carry that tag —
  // but they are CONVERTED, measured on the tree, and the gate had been printing
  // both STALE. The tree wins over any plan's expectation (D-41.1-22): an entry
  // left behind because its tag says it belongs to a later phase is a gate
  // quietly loosened, and it would permit re-adding the very shell that was just
  // removed. The tag was never a claim about whether a file had converted; it
  // says which group's debt the file counted against while it was still owed.
  // No entry was moved between groups to make a count come out right.
  //
  // All three deleted by plan 41.1-24 (D-41.1-22) after re-deriving each from the
  // tree with a raw needle count that does not use the gates' shared comment
  // stripper. Measured 2026-08-14: **0**, **0**, **0**.

  // PAID by plan 41-09 task 2 — the three native shells on `/admin/formats`
  // (`CreateFormatModal`, `CreateSeriesModal`, `RetireFormatDialog`) were on
  // this list when the gate was written and hold no shell now. Their lines left
  // in the same commit that converted them, which is what a paid debt looks
  // like: the number went 17 → 14 and nothing else moved.
];

/**
 * The group vocabulary, CLOSED at four values (D-41.1-11, RESEARCH §5.2).
 *
 *   - `work`                 — this phase's surface, including the three files
 *                              reached only through a work page's import closure.
 *   - `public-member-money`  — the public, member and money surfaces. Phase 41.2's.
 *   - `phase-42`             — the door. Behind this gate's fence today, so no
 *                              entry carries it; the value exists because the
 *                              fence's own arrival condition says an entry could.
 *   - `exempt`               — declared correct as what it is. The tree's three
 *                              exemptions are all deliberately NOT on this list,
 *                              so no entry carries this value either: a file
 *                              that will never convert is not a debt, and a list
 *                              that cannot reach zero lies. *(This read "the
 *                              tree's one exemption" until wave 8; D-41.2-06 and
 *                              D-41.2-07 added the two bartender files, each on
 *                              its own argument.)*
 *
 * **Two of the four are unused today, and that is written down rather than left
 * to be noticed.** An unused value is not dead vocabulary here: `phase-42` is
 * what an entry arriving behind the fence would carry, and the fence's own
 * paragraph says which of the two lists must then give way.
 */
export const GROUPS = ['work', 'public-member-money', 'phase-42', 'exempt'];

/** The one group every criterion of this phase is read off. */
export const WORK_GROUP = 'work';

/* ────────────────────────────────────────────────────────────────────────────
 * Check C's subjects — the files that render the primitive
 * ──────────────────────────────────────────────────────────────────────────── */

/** The specifier a consumer imports the primitive by. */
const PRIMITIVE_SPECIFIER = 'ui/Dialog';

/** What a dialog must never reach for. */
const TOAST_HOOK = 'useToast';

/* ── the refusals, taken together, BEFORE any tick is printed ──────────────── */

console.log(
  '\n  verify-dialogs — one implementation, and a written list of the copies still standing\n'
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

/**
 * What check B's loop actually iterates — the same array, not a second list.
 *
 * Derived rather than declared: this is the third mechanism by which a file goes
 * unopened (CR-03, and see `NEVER_MEASURED_BY_B` above for the claim it makes
 * true). A fourth hand-maintained list would be a fourth occurrence waiting.
 *
 * **It is declared HERE, immediately after the walk that produces it**, because
 * `existsCaseExact` below is keyed on it and the primitive's own existence
 * refusal now asks that function. It used to be declared beside
 * `neverOpenedReason`; nothing about it moved except its position.
 */
const walked = new Set(files);

/* ────────────────────────────────────────────────────────────────────────────
 * CASE-EXACT EXISTENCE — DEF-41-07 item 4, and it is a CLASS rather than a line
 * ──────────────────────────────────────────────────────────────────────────── */

/**
 * `existsSync` on the house volume answers a question nobody asked.
 *
 * **The defect, as DEF-41-07 item 4 states it.** The house volume is APFS and
 * **case-insensitive** (`CLAUDE.md` Guardrail 6), so `existsSync` returns true
 * for a declared path whose case does not match the file on disk — while the
 * walk's own output is **case-exact**. A `REMAINING` entry carrying a case-typo
 * therefore landed in the not-in-the-walk branch and **REFUSED** here, while the
 * same entry on a case-sensitive volume was `missing` and **FAILED**. One typo,
 * two verdicts, decided by which machine ran the gate — and on the house machine
 * it is the refusal, which is *"the laundering the guard exists to prevent"* in
 * that register's own words.
 *
 * **The repair, and the order is the substance.** Membership in `walked` — the
 * set built from the walk's own case-exact output — is asked FIRST and is the
 * authority. `existsSync` is consulted only after that, and only as a cheap
 * negative: it can rule a path out, and it can never rule one in on its own,
 * because its yes is confirmed segment by segment against the directory's own
 * entries. `readdirSync` returns names as the filesystem stores them on APFS and
 * on a case-sensitive volume alike (APFS is case-INSENSITIVE but
 * case-PRESERVING), so the answer this function gives does not move between the
 * two. That is the whole property: not "the typo now refuses", but **the verdict
 * for one typo is the same verdict on every filesystem**.
 *
 * **And the verdict it settles on is the FAILURE, not the refusal.** DEF-41-07
 * item 1's own text calls a typo'd entry *"today a FAILURE"* and names turning it
 * into a refusal *"a failure laundered into 'nothing was measured'"*; item 4
 * calls the house machine's refusal the laundering itself. A refusal would also
 * suppress the other thirteen entries' verdicts, so it reports LESS about a tree
 * the gate could read perfectly well. `check B ✗ names a path that does not
 * exist` is reached on both volumes now.
 *
 * **THIS IS A CLASS AND NOT A LINE, and the siblings are named so the class is
 * not re-derived.** `scripts/conversion-manifest.mjs:410,426,436` carry the
 * identical exposure — three `existsSync` calls whose subject is a declared path
 * rather than a walked one. **Plan 41.1-04 owns those three**; this gate does not
 * touch that file, and naming them here is what keeps the next reader from
 * finding the class a third time and calling it new.
 */
const directoryEntriesCache = new Map();

function directoryEntries(absDir) {
  const cached = directoryEntriesCache.get(absDir);
  if (cached !== undefined) return cached;
  let entries;
  try {
    entries = readdirSync(absDir);
  } catch {
    entries = null;
  }
  directoryEntriesCache.set(absDir, entries);
  return entries;
}

/** Every segment of `relPath` spelled exactly as the directory holding it spells it. */
function spelledExactly(relPath) {
  let abs = ROOT;
  for (const segment of relPath.split('/')) {
    const entries = directoryEntries(abs);
    if (entries === null || !entries.includes(segment)) return false;
    abs = `${abs}/${segment}`;
  }
  return true;
}

/**
 * Is there a file at EXACTLY this path, spelled exactly this way?
 *
 * `walked.has` first — the authority. `existsSync` second, and it is a second
 * OPINION: its yes is never taken on its own.
 */
function existsCaseExact(relPath) {
  if (walked.has(relPath)) return true;
  if (!existsSync(`${ROOT}/${relPath}`)) return false;
  return spelledExactly(relPath);
}

if (!existsCaseExact(PRIMITIVE_FILE)) {
  refuse(
    `the primitive is not on disk at ${PRIMITIVE_FILE}. Check A has nothing to read and\n` +
      '       checks B and C would be measuring a tree with no dialog in it. Nothing was measured.\n' +
      '       Asked case-exactly (DEF-41-07 item 4): on the house volume existsSync would answer\n' +
      '       yes to a mis-cased constant here and check A would then measure a file this gate\n' +
      '       did not name.'
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
      'REMAINING is empty. If every copy really is gone, that is the end of this migration\n' +
        '       and the emptiness should be a DECISION written above the constant — not a list\n' +
        '       that quietly emptied itself while nobody was reading.\n' +
        '       Set MIGRATION_CLOSED to an object carrying a date, the plan that closed it, and\n' +
        '       why. A truthy placeholder does not satisfy this: all three fields are required.'
    );
  }
}

/*
 * The tag validator, and it REFUSES rather than warning (D-41.1-11).
 *
 * An entry with an unknown or missing tag is not a small omission: every
 * per-group number below is derived from these tags, criterion 2 and criterion 4
 * of this phase are read off the work-group one, and a count computed over an
 * entry nobody classified is a number that looks like a measurement. A
 * meaningless count is worse than no count, so nothing is measured at all.
 *
 * Raised HERE, above every refusal that follows and far above check B's loop,
 * for the reason `PHASE_42_EXEMPT_PATHS` gives about its own overlap refusal:
 * the number is what a reader believes, so a run that cannot compute it honestly
 * must not reach a tick, a STALE notice, or a count.
 */
const untagged = REMAINING.filter(([, group]) => !GROUPS.includes(group));

if (untagged.length > 0) {
  refuse(
    `${untagged.length} REMAINING entr(y/ies) carry a group tag that is not in the closed set:\n\n       ` +
      untagged
        .map(([path, group]) => `${path}\n         tag: ${group === undefined ? '(missing)' : `"${group}"`}`)
        .join('\n\n       ') +
      `\n\n       The vocabulary is closed at: ${GROUPS.join(', ')}.\n` +
      '       Every per-group number this gate prints is derived from these tags, and this\n' +
      "       phase's criterion 2 and criterion 4 are read off the work-group one. A count\n" +
      '       computed over an entry nobody classified looks exactly like a measurement and is\n' +
      '       not one, and a meaningless count is worse than no count. Which group an entry\n' +
      '       belongs to is a decision for a person — taken from the file\'s MEASURED IMPORTERS,\n' +
      '       never from its path prefix. NOTHING WAS MEASURED.'
  );
}

const declaredPaths = new Map(
  REMAINING.map(([path, group, reason, target]) => [path, { group, reason, target }])
);

if (declaredPaths.size !== REMAINING.length) {
  refuse(
    `REMAINING has ${REMAINING.length} entries but only ${declaredPaths.size} distinct paths —\n` +
      '       a duplicated path means one of the two reasons is silently ignored.'
  );
}

/*
 * The fence in this gate and the fence in the manifest must be the SAME fence.
 * Two lists that drift is how one gate ends up guarding a path another one
 * scans, with neither report saying so — and a fence nobody cross-checked is a
 * fence nobody verified, which is why a failed import refuses too rather than
 * falling back to the local list.
 *
 * `scripts/conversion-manifest.mjs` is safe to import: read before relying on
 * it, it declares constants and two functions and does no work at module scope,
 * so it cannot do to this process what `verify-tokens.mjs` would (see the header
 * on why the helpers here are local).
 */
let manifest;
try {
  manifest = await import(`${ROOT}/scripts/conversion-manifest.mjs`);
} catch (error) {
  refuse(
    'scripts/conversion-manifest.mjs could not be imported, so this gate could not\n' +
      '       cross-check its Phase 42 fence against the manifest\'s. A fence nobody verified\n' +
      `       is a fence nobody should trust. Nothing was measured.\n\n       ${error.message}`
  );
}

const manifestFence = (manifest.PHASE_42_PATHS ?? []).map(([glob]) => glob).sort();
const localFence = PHASE_42_EXEMPT_PATHS.map(([glob]) => glob).sort();

if (JSON.stringify(manifestFence) !== JSON.stringify(localFence)) {
  refuse(
    "this gate's Phase 42 fence and the manifest's do not match, so one of the two is\n" +
      '       guarding a path the other scans. Nothing was measured.\n\n' +
      `       manifest: ${manifestFence.join(', ')}\n` +
      `       gate:     ${localFence.join(', ')}`
  );
}

const fencePatterns = PHASE_42_EXEMPT_PATHS.map(([glob, reason]) => ({
  glob,
  reason,
  re: globToRegExp(glob),
}));

function fenceMatch(relPath) {
  return fencePatterns.find(({ re }) => re.test(relPath)) ?? null;
}

/*
 * REMAINING ∩ everything check B never opens — raised HERE, and the position is
 * half the fix (WR-02); the OTHER half is the width of the set (WR-01).
 *
 * This sits above check B's loop on purpose: that loop is where a skipped file is
 * passed over before `shellShapes` reads it, and every number this gate prints is
 * derived from what the loop collected. A run whose two lists contradict each
 * other must not reach a tick, a STALE notice, or a count — see the paragraph in
 * `PHASE_42_EXEMPT_PATHS` below for why this is a refusal rather than a warning.
 *
 * The categories are tested in the SAME ORDER the loop skips them, so the reason
 * a reader is given is the reason the loop would actually have acted on. The walk
 * comes first for that exact reason: a path the walk never produced does not
 * reach the loop at all, so neither the Map nor the fence ever acted on it.
 */

/*
 * `walked` used to be declared here. It is declared immediately after the walk
 * that produces it — see `existsCaseExact` above, which is keyed on it.
 */

/**
 * Why this file was never opened by check B, or `null` if it was.
 *
 * **DEF-41-07 item 1 — the existence obligation now covers all THREE branches,
 * and it used to cover one.** The walk branch tested existence; the
 * `NEVER_MEASURED_BY_B` branch and the fence branch each returned their reason
 * **unconditionally**, so a declared path that is not on disk was handed a
 * confident explanation of why it was never opened — *"the primitive itself"*,
 * *"fenced — behind that glob"* — when the true and simpler fact is that there is
 * no such file. CR-03 established it with a run: one entry naming a non-existent
 * scanner component produced exit **2** rather than a failure, and a refusal
 * propagates as *nothing was measured* across the whole aggregate.
 *
 * The obligation is now discharged **once, at the top**, rather than repeated
 * three times: a path that is not in `walked` and does not exist case-exactly
 * returns `null` here and reaches the failure it has always deserved. Nothing
 * below the guard can be reached by a path that is not on disk, which is what
 * makes the three branches equal rather than merely all-guarded.
 *
 * **The order of the three is unchanged and is load-bearing.** The walk is tested
 * FIRST because a path outside `files` never reaches check B's loop at all — the
 * Map and the fence never got the chance to act on it, so a path that is both
 * fenced and unwalked is not fenced in any operative sense.
 *
 * **What did NOT change: a typo is still a FAILURE, not a refusal.** That was the
 * property the old guard existed for — *"a failure laundered into 'nothing was
 * measured'"* — and it is now true on a case-sensitive volume as well, because
 * the existence question is asked case-exactly (DEF-41-07 item 4; see
 * `existsCaseExact`).
 */
function neverOpenedReason(path) {
  if (!existsCaseExact(path)) return null;

  if (!walked.has(path)) {
    return (
      'NOT IN THE WALK — this path is on disk, and this gate\'s walk does not produce\n' +
      '         it. The walk covers files under src/ carrying one of these extensions:\n' +
      `         ${SCANNED_EXTENSIONS.join(', ')}. So check B never opened this path and\n` +
      '         cannot tell a debt somebody PAID from one it simply never read'
    );
  }
  const skip = NEVER_MEASURED_BY_B.get(path);
  if (skip) return `${skip.kind}\n         ${skip.reason}`;
  const behind = fenceMatch(path);
  if (behind) {
    return (
      'fenced — behind that glob, never opened; a SCOPE BOUNDARY that says nothing\n' +
      '         whatever about this file\'s markup\n' +
      `         behind: ${behind.glob}`
    );
  }
  return null;
}

const unmeasurableRemaining = [...declaredPaths.keys()]
  .map((path) => ({ path, why: neverOpenedReason(path) }))
  .filter(({ why }) => why !== null);

if (unmeasurableRemaining.length > 0) {
  refuse(
    `${unmeasurableRemaining.length} REMAINING entr(y/ies) name a file check B NEVER OPENS:\n\n       ` +
      unmeasurableRemaining.map(({ path, why }) => `${path}\n         ${why}`).join('\n\n       ') +
      '\n\n       Check B opens none of these, so any verdict it printed about one would be a\n' +
      '       verdict on a file it never read. This gate cannot tell a debt somebody PAID from\n' +
      '       one it simply never opened — and left alone it reports the second as the first,\n' +
      '       marking the entry STALE ("converted; remove this entry") and dropping REMAINING\n' +
      '       by one. A debt counter that falls because the gate stopped looking is worse than\n' +
      '       no counter.\n\n' +
      '       Either the entry leaves REMAINING as a declared decision, or the thing that keeps\n' +
      '       this gate from opening it does — the fence, the exemption, or, for a path the walk\n' +
      '       does not produce, the path itself, corrected to one the walk reaches. Each of those\n' +
      '       is a decision, and which one is a question for a person, not for this script.\n' +
      '       Nothing was measured.'
  );
}

/*
 * The matcher AND the stripper against their own description, before either is
 * pointed at the tree. Run here so a disagreement refuses with nothing
 * measured; PRINTED further down, immediately before check B's numbers, where a
 * reader meets it.
 *
 * The probe goes through the shared stripper first, because that is the path a
 * real line takes: check B reads `liveLines`, never the raw file. Measuring the
 * matcher on a raw string tested half the pipeline and called it the whole of it
 * (41-29).
 *
 * **And half was still what it tested until D-41.1-07.** WR-01: the probe used
 * to go through the single-line function alone, which is structurally unable to
 * exercise the multi-line state that `liveLines` carries. It went through
 * `liveLinesFrom` from 41.1-01 — but on a one-line array, which is the whole
 * pipeline for a one-line file and still not the multi-line state.
 *
 * **41.1-02 closes it.** Every probe row is now a LINE ARRAY, four of them carry
 * more than one line, and a row matches when ANY of its live lines matches —
 * which is exactly how `shellShapes` decides a real file carries a shell. The
 * probe now takes the path a real line takes, in the only sense of that phrase
 * that can be checked.
 */
const probeRows = MATCHER_PROBES.map((probe) => {
  const { lines, unterminated } = liveLinesFrom(probe.line);
  return {
    ...probe,
    unterminated,
    measured: lines.some((line) => isOverlayLine(line)) ? 'match' : 'no match',
  };
});

/*
 * A probe whose own comment never closes is a probe nobody can read a verdict
 * from: every line after the opener is blanked, so the row would report `no
 * match` for a reason that has nothing to do with the matcher. Raised as a
 * refusal rather than a failure, because it says the SELF-CHECK is malformed —
 * and a malformed self-check has measured nothing about this tree.
 */
const malformedProbes = probeRows.filter((row) => row.unterminated !== null);

if (malformedProbes.length > 0) {
  refuse(
    `${malformedProbes.length} of ${MATCHER_PROBES.length} matcher probe(s) open a comment that\n` +
      '       never closes, so their verdicts describe the probe rather than the matcher:\n\n       ' +
      malformedProbes
        .map((row) => `${row.label}\n         unterminated ${row.unterminated.kind} comment opened on probe line ${row.unterminated.lineNo}`)
        .join('\n\n       ') +
      '\n\n       NOTHING WAS MEASURED — no check-B verdict follows.'
  );
}

const probeDisagreements = probeRows.filter((row) => row.measured !== row.verdict);

if (probeDisagreements.length > 0) {
  refuse(
    `the overlay matcher disagrees with its own description on ${probeDisagreements.length} of\n` +
      `       ${MATCHER_PROBES.length} fixed probe(s):\n\n       ` +
      probeDisagreements
        .map((row) => `${row.label}\n         expected ${row.verdict}, got ${row.measured}`)
        .join('\n\n       ') +
      '\n\n       A matcher that does not behave as its docblock says has not measured this tree,\n' +
      '       it has measured something else. NOTHING WAS MEASURED — no check-B verdict follows.'
  );
}

const failures = [];

console.log(`  files walked under src/       : ${files.length}`);

/* ── check A — the primitive's signature ──────────────────────────────────── */

const primitiveLines = liveLines(PRIMITIVE_FILE);

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

const signatureRows = SIGNATURE.map(([label, needle, expected]) => ({
  label,
  needle,
  expected,
  measured: countNeedle(primitiveLines, needle),
}));

/*
 * The comment counters used to print HERE, and here is before check B walks
 * `src/` — so they described the one file check A had just read. They are two
 * numbers now and they print below the walk, at the end of the run. See the
 * counters' own docblock (WR-02).
 */

/*
 * The count is DERIVED and not a literal, since plan 41.2-19 took it from two to
 * four. A hard-coded 2 printed above a four-entry list is the smallest possible
 * version of the defect this whole gate is written against: a number that stops
 * describing the thing beside it, in the report a reader actually sees.
 */
console.log(`  declared exceptions and non-exceptions: ${DECLARED_EXCEPTIONS.length}\n`);
for (const [path, reason] of DECLARED_EXCEPTIONS) {
  console.log(`      ${path}`);
  console.log(`         ${reason}\n`);
}

console.log(`  check A — the signature of ${PRIMITIVE_FILE}:\n`);
for (const row of signatureRows) {
  const mark = row.measured < row.expected ? '✗' : row.measured > row.expected ? '!' : '·';
  console.log(
    `    ${mark}  ${row.label.padEnd(22)} expected ${row.expected}, measured ${row.measured}`
  );
}
console.log('');

const dropped = signatureRows.filter((row) => row.measured < row.expected);
const grownSignature = signatureRows.filter((row) => row.measured > row.expected);

if (dropped.length > 0) {
  failures.push('A');
  console.log(`  ✗ A  ${dropped.length} part(s) of the signature are BELOW their expected count:\n`);
  for (const row of dropped) {
    console.log(`       ${row.label} — expected ${row.expected}, measured ${row.measured}`);
  }
  console.log(
    '\n       A signature that matches nothing passes every other check by measuring nothing.\n' +
      '       Either the primitive lost a property §8.3 fixes, or the needle stopped matching —\n' +
      '       and both of those are this gate going blind, not this gate being satisfied.\n'
  );
} else {
  console.log(
    `  ✓ A  the primitive carries showModal() and the sheet↔window pair, each at its\n` +
      `       expected count, in ${primitiveLines.length} live line(s)\n`
  );
}

if (grownSignature.length > 0) {
  console.log(`  ! A  ${grownSignature.length} part(s) of the signature appear MORE often than recorded:\n`);
  for (const row of grownSignature) {
    console.log(`       ${row.label} — expected ${row.expected}, measured ${row.measured}`);
  }
  console.log(
    '\n       Not a failure: growth is not what this check defends against, and a gate that\n' +
      '       reddens on a correct file gets switched off. Printed loudly anyway, because a\n' +
      '       signature that doubled is usually a second implementation arriving inside the\n' +
      '       file that exists to be the only one.\n'
  );
}

/* ── check B — no second shell, except on the list ────────────────────────── */

const measuredShells = new Map();
const fenced = new Map();
/** Of the walked files, the ones `NEVER_MEASURED_BY_B` skipped — counted, not assumed. */
const neverOpened = new Map();
let opened = 0;

/*
 * The two `continue`s below are driven by `NEVER_MEASURED_BY_B` and by the
 * fence, in that order — the same two lists, in the same order, that the
 * refusal above is keyed on. Hard-coded comparisons here were how the loop and
 * the refusal drifted apart in the first place (WR-01).
 */
for (const file of files) {
  const skip = NEVER_MEASURED_BY_B.get(file);
  if (skip) {
    neverOpened.set(file, skip);
    continue;
  }
  const behind = fenceMatch(file);
  if (behind) {
    fenced.set(file, behind.glob);
    continue;
  }
  opened += 1;
  const found = shellShapes(file);
  if (found.length > 0) measuredShells.set(file, found);
}

const undeclared = [];
const missing = [];
const stale = [];

/*
 * Asked CASE-EXACTLY, and that is the other half of DEF-41-07 item 4: this is the
 * verdict a mis-cased entry now reaches, and it must be the same verdict on the
 * house volume and on a case-sensitive one. `existsSync` alone answered yes here
 * on APFS, so a mis-cased entry skipped `missing` and went on to be reported
 * STALE — a debt counter falling because the gate could not spell.
 */
for (const [path] of declaredPaths) {
  if (!existsCaseExact(path)) {
    missing.push(path);
    continue;
  }
  if (!measuredShells.has(path)) stale.push(path);
}

for (const [file, found] of measuredShells) {
  if (!declaredPaths.has(file)) undeclared.push({ file, found });
}

console.log(`  the matcher self-check — ${MATCHER_PROBES.length} fixed probes, on every run:\n`);
for (const row of probeRows) {
  console.log(`      ${row.measured.padEnd(9)} ${row.label}`);
}
console.log(
  '\n      The rung is matched as a FAMILY: one or more digits, the auto keyword, or an\n' +
    '      arbitrary bracketed value — each of them optionally NEGATIVE. So a copy is seen at\n' +
    '      any rung WRITTEN OUT in the class string — and only there. TWO SHAPES IT STILL DOES\n' +
    '      NOT SEE: a rung reached through a VARIABLE, and a class string assembled by\n' +
    '      CONCATENATION; this script reads lines, it does not build them. Both tokens are\n' +
    '      boundary-guarded, and the guard is evaluated BEFORE the optional minus sign, so\n' +
    '      neither a longer word nor an ordinary hyphenated utility can redden a correct file.\n' +
    '      These strings are the matcher describing itself — they are NOT the evidence. The\n' +
    '      live run below is.\n'
);

console.log('  the Phase 42 fence — paths check B NEVER reads:\n');
for (const [glob, reason] of PHASE_42_EXEMPT_PATHS) {
  console.log(`      ${glob}`);
  console.log(`         ${reason}`);
}
console.log(
  `\n      ${fenced.size} walked file(s) fall behind it. This is a SCOPE BOUNDARY, not an approval:\n` +
    '      nothing here says their markup is right, only that this phase did not open them.\n' +
    '      If a hand-rolled dialog is written behind that fence, check B is silent about it.\n'
);

console.log('  check B — dialog shells declared OUTSIDE the primitive:\n');
console.log(`      files walked under src/         : ${files.length}`);
console.log(`      never opened by check B         : ${neverOpened.size + fenced.size}`);
for (const [path, skip] of NEVER_MEASURED_BY_B) {
  console.log(`         ${neverOpened.has(path) ? 1 : 0}  ${skip.kind}`);
  console.log(`            ${path}`);
}
console.log(`         ${fenced.size}  fenced by path, NEVER MEASURED — a scope boundary, not an approval`);
console.log('            (Phase 42 — see the fence above)');
console.log(`      files check B opened            : ${opened}`);
console.log(`      of those, carrying a shell      : ${measuredShells.size}`);
console.log(`      REMAINING entries declared      : ${REMAINING.length}`);
console.log(
  '\n      walked = never opened + opened, and opened = carrying a shell + clean. The two\n' +
    '      never-opened rows are DIFFERENT FACTS: exempt means a person measured the file and\n' +
    '      declared it correct; fenced means nobody measured it at all.\n'
);
console.log(`      REMAINING = ${measuredShells.size}\n`);

/*
 * The per-group breakdown, counted over `measuredShells` — the same set
 * `REMAINING` is printed from, never over `REMAINING.length`. Counting the
 * declared list instead would produce a work-group number that stays put while a
 * file converts and its entry is still sitting there marked STALE, which is the
 * proxy-goes-quiet defect wearing a group tag.
 */
const groupCounts = new Map(GROUPS.map((group) => [group, 0]));
const workGroupEntries = [];

for (const path of measuredShells.keys()) {
  const declared = declaredPaths.get(path);
  const group = declared === undefined ? '(undeclared)' : declared.group;
  groupCounts.set(group, (groupCounts.get(group) ?? 0) + 1);
  if (group === WORK_GROUP) workGroupEntries.push(path);
}

console.log(
  `      by group: ${[...groupCounts]
    .filter(([group, n]) => n > 0 || GROUPS.includes(group))
    .map(([group, n]) => `${group} ${n}`)
    .join(' · ')}\n`
);

const workGroupRemaining = groupCounts.get(WORK_GROUP) ?? 0;

console.log(`      WORK GROUP REMAINING = ${workGroupRemaining}`);
console.log(
  '         ↑ the line this phase\'s criteria are read off. A criterion that cannot be\n' +
    '           read off a gate is a claim (D-41.1-11).\n'
);

if (workGroupRemaining === 0) {
  console.log(
    '  ★ THE WORK GROUP IS EMPTY — every dialog on this phase\'s surface has converted.\n' +
      '       Printed as loudly as STALE is, because it is the condition this phase exits on\n' +
      '       and a number nobody notices reaching zero is a number that was not doing its job.\n'
  );
} else {
  for (const path of workGroupEntries) {
    console.log(`         ${path}`);
  }
  console.log(
    '\n      Those PATHS, and not that number, are what a later plan reconciles against\n' +
      '      (D-41.1-16): a debt tracked by a proxy metric is closed by anything that moves\n' +
      '      the metric, and this phase has four recorded recurrences of exactly that. Diff\n' +
      '      the entries.\n'
  );
}

if (missing.length > 0) {
  failures.push('B');
  console.log(`  ✗ B  ${missing.length} REMAINING entr(y/ies) name a path that does not exist:\n`);
  for (const path of missing) console.log(`       ${path}`);
  console.log(
    '\n       A list that cannot be measured is a decoration, and a decoration that looks\n' +
      '       like a measurement is worse than nothing. If the file moved, its line moves\n' +
      '       with it in the same commit.\n'
  );
}

if (undeclared.length > 0) {
  if (!failures.includes('B')) failures.push('B');
  console.log(`  ✗ B  ${undeclared.length} file(s) declare a dialog shell and are not on REMAINING:\n`);
  for (const { file, found } of undeclared) {
    console.log(`       ${file}`);
    for (const hit of found) console.log(`         :${hit.line}  [${hit.shape}]  ${hit.source}`);
  }
  console.log(
    '\n       One dialog implementation exists: src/components/ui/Dialog.tsx. It supplies\n' +
      '       Escape, the focus trap, background inertness and the top layer from the platform,\n' +
      '       and the sheet↔window switch from three class pairs. Import it — or, if this file\n' +
      '       genuinely cannot use it, say so on a REMAINING entry, which is a decision\n' +
      '       somebody will read.\n'
  );
}

if (!failures.includes('B')) {
  console.log(
    `  ✓ B  every one of the ${measuredShells.size} file(s) still declaring a shell is on REMAINING,\n` +
      '       and no undeclared copy exists\n'
  );
}

if (stale.length > 0) {
  console.log(`  ! B  ${stale.length} REMAINING entr(y/ies) are STALE — the file no longer carries a shell:\n`);
  for (const path of stale) {
    console.log(`       ${path}  → converted; remove this entry`);
  }
  console.log(
    '\n       Not a failure: a converted file is correct, and a gate that goes red on a correct\n' +
      '       file gets switched off (§0 rule 3). Printed loudly anyway, because an entry left\n' +
      '       behind is a gate quietly loosened — it would permit re-adding exactly the copy\n' +
      '       that was just removed.\n'
  );
}

/* ── check C — no dialog raises a toast ───────────────────────────────────── */

const renderers = [];
for (const file of files) {
  if (file === PRIMITIVE_FILE) continue;
  const source = liveLines(file).join('\n');
  if (!source.includes(PRIMITIVE_SPECIFIER)) continue;
  renderers.push(file);
}

const toastOffenders = [];
for (const file of [PRIMITIVE_FILE, ...renderers]) {
  const hits = [];
  liveLines(file).forEach((line, i) => {
    if (line.includes(TOAST_HOOK)) hits.push({ line: i + 1, source: line.trim() });
  });
  if (hits.length > 0) toastOffenders.push({ file, hits });
}

console.log('  check C — the toast, in a panel that paints above it:\n');
console.log(`      files importing the primitive : ${renderers.length}`);
for (const file of renderers) console.log(`         ${file}`);
console.log('');

if (toastOffenders.length > 0) {
  failures.push('C');
  console.log(`  ✗ C  ${toastOffenders.length} file(s) rendering Dialog reach for the toast:\n`);
  for (const { file, hits } of toastOffenders) {
    console.log(`       ${file}`);
    for (const hit of hits) console.log(`         :${hit.line}  ${hit.source}`);
  }
  console.log(
    '\n       A native <dialog> paints in the TOP LAYER, which is above every z-index —\n' +
      '       including the toast container. A dialog that reports by toast reports\n' +
      '       INVISIBLY, and this project has no error tracking, so a message nobody sees\n' +
      '       is a message that exists nowhere. Pass a status to the dialog instead: it\n' +
      '       reports its own outcome inside its own panel (§8.3).\n'
  );
} else if (renderers.length === 0) {
  console.log(
    '  ✓ C  vacuously: no file imports the primitive yet, so there is no dialog that\n' +
      '       could raise a toast. NOTHING WAS MEASURED BY THIS CHECK — read this line,\n' +
      '       not the tick.\n'
  );
} else {
  console.log(
    `  ✓ C  none of the ${renderers.length} file(s) rendering Dialog imports the toast, and\n` +
      '       neither does the primitive\n'
  );
}

/* ── comment hygiene, measured over the run and printed BELOW it (WR-02) ───── */

console.log('');
console.log(
  `  comment hygiene — measured over the ${liveLinesCache.size} file(s) this run actually opened,\n` +
    `  out of ${files.length} walked (D-41.1-07, one shared stripper):\n`
);
console.log(
  `      lines blanked whole           : ${commentLinesBlanked}   (DEF-41-02 — prose quoting a class string costs nothing)`
);
console.log(
  `      leading spans consumed        : ${commentSpansStripped}   (CR-01, CR-02 — live code kept on a comment's line)`
);
console.log(
  '\n      Printed HERE, below the walk, and not above it: until 41.1-02 one counter printed\n' +
    '      before check B opened a single file, so it described the primitive and not the run\n' +
    '      and could not report a blindness spike — which is the only thing a counter like this\n' +
    '      is for. This project has NO ERROR TRACKING, so a printed number is one of the few\n' +
    '      observables a gate has at all.\n'
);

/* ── verdict ──────────────────────────────────────────────────────────────── */

console.log('');
if (failures.length === 0) {
  console.log(
    `  DIALOGS_OK — all three checks passed. REMAINING = ${measuredShells.size} file(s) still ` +
      'declare\n  a dialog shell of their own.'
  );
  console.log(
    '\n  That number is the point of the green, not the tick. Read the header before treating\n' +
      '  this as safety: it reads CLASS STRINGS AND IMPORT CLAUSES, not behaviour. Whether\n' +
      '  Escape closes the panel, whether the sheet rises from the bottom edge below 768px,\n' +
      '  and whether the page behind it scrolls are H41-2 — a person, at two widths — and no\n' +
      '  tick here stands in for that.\n'
  );
  process.exit(0);
}
console.log(`  DIALOGS_FAIL — ${failures.length} check(s) failed: ${failures.join(', ')}\n`);
process.exit(1);
