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
 *   - **IT DOES NOT JUDGE THE COPIES IT TOLERATES.** A file on `REMAINING` is
 *     not blessed; it is *counted*. Every one of them is a dialog without a
 *     focus trap.
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
 * What a dialog shell looks like, in the two shapes it takes today
 * ──────────────────────────────────────────────────────────────────────────── */

/**
 * Shape 1 — the hand-rolled overlay. Three parts on ONE line.
 *
 * All three are required together because each alone is ordinary: the
 * positioning utility is everywhere, the inset is common, and the rung is
 * shared with anything that must clear the navigation without being modal
 * (§10 keeps that rung declared on purpose). Together on one line they are the
 * overlay, and eleven files carry exactly that.
 */
const OVERLAY_PARTS = ['fixed', 'inset-' + '0', 'z-' + '[60]'];

/** Shape 2 — a native `<dialog>` element written outside the primitive. */
const NATIVE_SHELL_RE = /<dialog\b/;

function shellShapes(relPath) {
  const found = [];
  liveLines(relPath).forEach((line, i) => {
    if (OVERLAY_PARTS.every((part) => line.includes(part))) {
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
for (const file of files) {
  if (file === PRIMITIVE_FILE) continue;
  if (file === FULL_BLEED_VIEWER) continue;
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

console.log('  check B — dialog shells declared OUTSIDE the primitive:\n');
console.log(`      REMAINING entries declared     : ${REMAINING.length}`);
console.log(`      files measured carrying a shell : ${measuredShells.size}`);
console.log(`      exempt from this check          : 1  (${FULL_BLEED_VIEWER})`);
console.log(`\n      REMAINING = ${measuredShells.size}\n`);

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
