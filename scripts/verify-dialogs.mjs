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
 * ── THE TWO DECLARED EXCEPTIONS, WRITTEN BEFORE THE GATE (§0 rule 3) ────────
 *
 * They are **not the same kind of thing**, and collapsing them would have hidden
 * a real debt behind a real exemption:
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
 *   2. `src/components/media/MyMediaSection.tsx` — **on `REMAINING`, and the
 *      reason the signature is not keyed on its attribute.** It carries the
 *      tree's **only** `role="dialog"` — one hit, measured — and it is a
 *      hand-rolled overlay rather than a `<dialog>`. A signature keyed on that
 *      attribute would find this one file and miss the other seventeen. §13
 *      names it for that reason; it is not an exemption from the debt, and
 *      §8.3's own list of the eleven overlays that go away includes it.
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
 * it is a sentence. Its error direction is stated rather than assumed: the
 * opener must be at the start of the trimmed line, so the shape **can blank
 * more than it should** only when a line begins with a JSX comment opener
 * inside a string. The count of lines blanked this way is printed on every run.
 *
 * ── WHY THE UTILITIES ARE COMPOSED FROM PARTS AND NEVER SPELLED ─────────────
 *
 * DEF-41-01, measured: **Tailwind compiles class strings out of comments and
 * out of `.planning/`**, and it has already emitted a malformed rule from one.
 * `scripts/` is inside the project root and is not ignored, so a complete
 * utility written in this file would be a live candidate. Every needle below is
 * therefore assembled at run time and no whole utility appears as a literal.
 *
 * ── WHY THE HELPERS ARE LOCAL AND NOT IMPORTED ──────────────────────────────
 *
 * `verify-tokens.mjs` exports `listScannableFiles` and `liveLines`, and they
 * **cannot be imported**: that module runs its seven checks at module scope and
 * ends in `process.exit()` with no main-module guard, so importing it runs the
 * TOKEN gate and exits this process with the TOKEN gate's verdict — this script
 * would exit 0 having measured nothing. Plan 41-02 measured exactly that, and
 * every sibling gate declares its own walk and its own comment heuristic.
 * **Self-contained is the house shape for a gate.**
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

function isSiblingCommentLine(trimmed) {
  return (
    trimmed.startsWith('//') ||
    trimmed.startsWith('*') ||
    trimmed.startsWith('/' + '*')
  );
}

const liveLinesCache = new Map();

/** The file's lines with every comment blanked, carriage returns removed. */
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
 * Exception 2 — NOT exempt. It is on `REMAINING`, and it is the reason this
 * gate's signature is not keyed on `role="dialog"`. See the header.
 */
export const ROLE_DIALOG_OVERLAY = 'src/components/media/MyMediaSection.tsx';

export const DECLARED_EXCEPTIONS = [
  [
    FULL_BLEED_VIEWER,
    'exempt from check B — a full-bleed media viewer at every tier, carrying a heavier scrim than a sheet. Declared an exception by §8.3 before this gate existed, and deliberately NOT on REMAINING: a file that will never convert is not a debt, and a list that can never reach zero is a number that lies',
  ],
  [
    ROLE_DIALOG_OVERLAY,
    'NOT exempt, and on REMAINING — it is the tree\'s ONLY role="dialog" (one hit, measured) and is a hand-rolled overlay rather than a <dialog>. A signature keyed on that attribute would find this one file and miss every other copy in the tree, which is why the check is keyed on the shell instead',
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
 * it: the set that decides what is skipped IS the set the refusal is keyed on,
 * and the two cannot drift apart by an edit to either.
 *
 * **THE THREE REASONS STAY APART, and that is the substance rather than the
 * wording.** This gate keeps `fenced by path, never measured` and `exempt from
 * this check … measured, declared correct` on separate printed lines because
 * they are different facts about a file:
 *
 *   - **the primitive itself** — check B measures copies OF it; the one
 *     implementation cannot be one of its own copies.
 *   - **exempt** — a file somebody **measured and declared correct** as what it
 *     is. A statement about its markup, made by a person.
 *   - **fenced** — a file **nobody measured at all**. A scope boundary, saying
 *     nothing whatever about the markup behind it.
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
 * `OVERLAY_PARTS` checked against its own description, on EVERY run.
 *
 * Six fixed strings, assembled the same way the regexes are. If any of them
 * disagrees with its expectation the run **refuses** — a matcher that does not
 * behave as its own docblock describes has not measured this tree, it has
 * measured something else, and a verdict from it would be a number nobody can
 * read.
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
 */
const MATCHER_PROBES = [
  {
    verdict: 'no match',
    label: 'the positioning utility at the end of a longer word',
    line:
      '<div className="pre' + POSITION_UTILITY + ' ' + INSET_UTILITY + ' ' + RUNG_PREFIX + '[60]">',
    expected: false,
  },
  {
    verdict: 'match',
    label: 'the three parts at a bracketed rung other than the incumbents\'',
    line: '<div className="' + POSITION_UTILITY + ' ' + INSET_UTILITY + ' ' + RUNG_PREFIX + '[70]">',
    expected: true,
  },
  {
    verdict: 'match',
    label: 'the three parts at a two-digit numeric rung',
    line: '<div className="' + POSITION_UTILITY + ' ' + INSET_UTILITY + ' ' + RUNG_PREFIX + '50">',
    expected: true,
  },
  {
    verdict: 'match',
    label: 'the three parts at a SINGLE-DIGIT rung (WR-03)',
    line: '<div className="' + POSITION_UTILITY + ' ' + INSET_UTILITY + ' ' + RUNG_PREFIX + '0">',
    expected: true,
  },
  {
    verdict: 'match',
    label: 'the three parts at the auto KEYWORD rung (WR-03)',
    line: '<div className="' + POSITION_UTILITY + ' ' + INSET_UTILITY + ' ' + RUNG_PREFIX + 'auto">',
    expected: true,
  },
  {
    verdict: 'match',
    label: 'the three parts at a NEGATIVE rung (WR-05)',
    line:
      '<div className="' +
      POSITION_UTILITY +
      ' ' +
      INSET_UTILITY +
      ' ' +
      '-' +
      RUNG_PREFIX +
      '10">',
    expected: true,
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
 * Shape: `[path, reason, target]`.
 */
export const REMAINING = [
  // ── the eleven hand-rolled overlays. None of them handles Escape, none traps
  // focus, none makes the document behind it inert — measured. Every dialog on
  // the public purchase path is among them.
  [
    'src/app/(public)/tickets/[id]/RefundRequestButton.tsx',
    'a hand-rolled overlay on the ticket surface — a refund request, which is money leaving',
    'the /tickets/[id] surface',
  ],
  [
    'src/app/(public)/events/[slug]/RedeemConfirmationModal.tsx',
    'a hand-rolled SHEET overlay — one of the four the primitive takes its phone form from',
    'the public event page',
  ],
  [
    'src/app/(public)/events/[slug]/SumUpCheckoutModal.tsx',
    'a hand-rolled SHEET overlay on the purchase path — byte-identical sheet half to the one above',
    'the public event page',
  ],
  [
    'src/app/(public)/events/[slug]/SecretVenueDialog.tsx',
    'a hand-rolled overlay that shows a venue — venue-secrecy primary, and the one on this list whose conversion is Critical rather than visual',
    'the public event page',
  ],
  [
    'src/app/(public)/events/[slug]/menu/GuestLoginBanner.tsx',
    'a hand-rolled SHEET overlay on the drinks menu',
    'the drinks menu surface',
  ],
  [
    'src/app/(public)/events/[slug]/menu/GuestTokenDisplay.tsx',
    'a hand-rolled SHEET overlay holding a drink token at the bar',
    'the drinks menu surface',
  ],
  [
    'src/app/(admin)/admin/events/[id]/tickets/RefundActions.tsx',
    'a hand-rolled overlay on the work surface that issues a refund',
    'the event tickets work surface',
  ],
  [
    'src/components/admin/RefundDialog.tsx',
    'a hand-rolled overlay shared by the refund paths',
    'the work surfaces that reach it',
  ],
  [
    'src/components/venues/EditVenueButton.tsx',
    'a hand-rolled overlay editing a venue — on §8.3\'s closed lg list once it converts',
    'the venues work surface',
  ],
  [
    'src/components/artists/EditArtistButton.tsx',
    'a hand-rolled overlay editing an artist — on §8.3\'s closed lg list once it converts',
    'the artists work surface',
  ],
  [
    ROLE_DIALOG_OVERLAY,
    'a hand-rolled overlay, and the tree\'s only role="dialog" — see the declared exceptions above: named by §13 as a warning about signature choice, not exempted from the debt',
    'the member media surface',
  ],

  // ── the native shells this plan does not convert. Each already has the
  // platform behaviours; what each still has is its own copy of the shell.
  [
    'src/app/(admin)/admin/events/[id]/reveal/RevealVenueDialog.tsx',
    'a native shell, and the UI of a MONOTONE guard: once the reveal is sent, the address is public and there is no undo. §2.1 names it explicitly as the wrong first consumer — "prove it on the hardest correct file" is not "convert the most dangerous surface first"',
    'the venue reveal surface',
  ],
  [
    'src/components/venues/CreateVenueModal.tsx',
    'a native shell, and the ANCESTOR this primitive was extracted from. Not converted here because a second surface imports it — the event form — so converting it converts two surfaces at once, which is the event-form knot',
    'the venues work surface and the event form',
  ],
  [
    'src/components/artists/CreateArtistModal.tsx',
    'a native shell, byte-identical to the ancestor, and mounted from the same event form',
    'the artists work surface and the event form',
  ],

  // PAID by plan 41-09 task 2 — the three native shells on `/admin/formats`
  // (`CreateFormatModal`, `CreateSeriesModal`, `RetireFormatDialog`) were on
  // this list when the gate was written and hold no shell now. Their lines left
  // in the same commit that converted them, which is what a paid debt looks
  // like: the number went 17 → 14 and nothing else moved.
];

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

if (!existsSync(`${ROOT}/${PRIMITIVE_FILE}`)) {
  refuse(
    `the primitive is not on disk at ${PRIMITIVE_FILE}. Check A has nothing to read and\n` +
      '       checks B and C would be measuring a tree with no dialog in it. Nothing was measured.'
  );
}

if (REMAINING.length === 0) {
  refuse(
    'REMAINING is empty. If every copy really is gone, that is the end of this migration\n' +
      '       and the emptiness should be a DECISION written above the constant — not a list\n' +
      '       that quietly emptied itself while nobody was reading.'
  );
}

const declaredPaths = new Map(REMAINING.map(([path, reason, target]) => [path, { reason, target }]));

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
 * a reader is given is the reason the loop would actually have acted on.
 */
function neverOpenedReason(path) {
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
      '       Either the entry leaves REMAINING as a declared decision, or the fence or the\n' +
      '       exemption does. Both are decisions, and which one is a question for a person, not\n' +
      '       for this script. Nothing was measured.'
  );
}

/*
 * The matcher against its own description, before it is pointed at the tree.
 * Run here so a disagreement refuses with nothing measured; PRINTED further
 * down, immediately before check B's numbers, where a reader meets it.
 */
const probeRows = MATCHER_PROBES.map((probe) => ({
  ...probe,
  measured: isOverlayLine(probe.line) ? 'match' : 'no match',
}));

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

console.log(`  lines blanked as JSX comments : ${jsxCommentLinesBlanked}   (DEF-41-02)\n`);

console.log('  declared exceptions: 2\n');
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

for (const [path] of declaredPaths) {
  if (!existsSync(`${ROOT}/${path}`)) {
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
