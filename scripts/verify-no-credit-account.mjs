#!/usr/bin/env node
/**
 * verify-no-credit-account.mjs — the structural guard for ASSIGN-07.
 *
 * WHAT IT ASSERTS, in one sentence: **no file of the credit path contains the
 * substring `auth.admin.`**, matched case-insensitively, with exactly two
 * declared exemptions.
 *
 * WHY THAT SENTENCE. ASSIGN-07 says that crediting a person must never create an
 * account for them. In a community whose entry is by referral and manual
 * approval, **an account IS membership** (`PROJECT.md`; `community-membership.md`,
 * gate *nessuna corsia grigia*), so a surface that credits a photographer and
 * quietly provisions them an account has not added a convenience: it has opened
 * a way in that bypasses the approval the whole product is built around. There
 * are exactly two APIs in this repository that create an account —
 * `auth.admin.createUser` and `auth.admin.generateLink` — and both are reached
 * through the same substring.
 *
 * ── THE HONEST NOTE, and it belongs at the top rather than the bottom ────────
 *
 * There is **no test runner for the product** in this repository (`CLAUDE.md`,
 * Environment Guardrail 1). This script is therefore the ONLY automatic
 * guarantee ASSIGN-07 can have, and what it guarantees is a **STRUCTURAL
 * ABSENCE** — that the credit path does not name the account-creating API.
 *
 * It does NOT guarantee that the credit path behaves well:
 *   - it says nothing about whether a credit grants anything (that guarantee is
 *     the MISSING COLUMN on `public.party_credits` and the missing field on
 *     `PartyCreditRow`, held by the database and by `npm run build`);
 *   - it says nothing about who may write a credit (that is `catalogue.manage`,
 *     asked in the surface's own guard);
 *   - it says nothing about whether an unannounced line-up stays private (that
 *     is the RLS in `20260809003000_party_credits.sql`, measured by
 *     `npm run baseline:container`).
 *
 * Absence is checkable; good behaviour is not. Whoever reads a green here must
 * know exactly what that green claims, or the green becomes a stamp.
 *
 * ── FIVE IMPLEMENTATION DECISIONS, inherited from the analogue with the
 *    incident behind each one (`scripts/verify-no-header-identity.mjs:36-100`) ─
 *
 * 1. **Literal substring, never a regular expression over source text, and
 *    deliberately NOT `splitCodeAndComments` from `verify-capabilities.mjs`.**
 *    WR-07 (`32-REVIEW.md`) records that this repository's comment stripper is
 *    unsound: a regex literal containing a quote — one exists at
 *    `src/app/(auth)/register/page.tsx:13` — opens a phantom string that runs
 *    for many lines, so line comments inside that span land in the "code"
 *    bucket. A security assertion built on a parser that an unrelated file can
 *    defeat is not an assertion. `String.prototype.includes` cannot be defeated
 *    by a regex literal.
 *
 * 2. **Case-insensitive, by lower-casing the haystack before the `includes`.**
 *    The recorded incident of this exact class in this repository:
 *    `grep -c 'CREATE POLICY' supabase/schema.sql` returns **0** while
 *    `grep -ci` returns **37**. That zero was written down as a fact and became
 *    a false guardrail. A check that returns the right number for the wrong
 *    reason is worse than no check.
 *
 * 3. **Comments are COUNTED, not filtered.** Decision 1 removed the only comment
 *    parser available and writing a second would re-import the defect it was
 *    rejected for. The over-report has a direction and it is the safe one: this
 *    meter can only ever demand MORE deletion, never less, so it cannot pass a
 *    credit path that still names the API. Each hit is LABELLED `code` or
 *    `comment?` by a trivial "does the trimmed line start with // or *"
 *    heuristic — **presentational only**. The label never changes the verdict.
 *
 * 4. **The exemptions are EXACT relative paths, compared for equality** — not
 *    substrings, not globs, not basenames — and they are **printed on every run,
 *    pass or fail**, because an exemption nobody sees is an exemption that
 *    grows. If an exempt file ever disappears (a rename, a refactor), this
 *    script **REFUSES** rather than exempting whatever moved into the name: the
 *    next thing to occupy that path would inherit permission to create accounts.
 *
 * 5. **An empty measurement is a refusal, not a pass.** Zero files on the credit
 *    path would make the verdict vacuously green, and a check that cannot fail
 *    is not a check — the same refusal `verify-capabilities.mjs`,
 *    `rls-baseline.mjs` and `verify-no-header-identity.mjs` all make.
 *
 * ── THE PERIMETER IS COMPUTED, NOT LISTED ───────────────────────────────────
 *
 * A hand-written list of files would be correct on the day it was written and
 * silently wrong on the day somebody adds `src/lib/credits/publish.ts`. So the
 * perimeter is a SEARCH, and a file enters it two ways:
 *
 *   - **by name** — its path contains `credit` (a `credits/` directory, a
 *     `credit-…` module, a `…-credits.ts`);
 *   - **by mention** — its text names `public.party_credits` or the row type,
 *     which catches a file that handles credits without being named for them.
 *
 * The second rule is what makes a NEW file of the credit path arrive inside the
 * measurement instead of outside it. The perimeter is printed on every run with
 * the reason each file entered, so a reader can see precisely what was measured
 * rather than trusting that it was the right thing.
 *
 * SCOPE. Only `src/`. This file lives in `scripts/` and names the needle as a
 * constant, so a perimeter widened to `scripts/` would flag the meter itself;
 * whoever widens it owns that exemption and must declare it here.
 *
 * SECRECY. `.planning/` is tracked and this repository is PUBLIC (`CLAUDE.md`
 * Guardrail 5). This script reads only files already committed here, prints only
 * paths, line numbers and offending source lines, opens no network connection,
 * reads no environment variable and writes no artefact.
 *
 * Zero dependencies. Node built-ins only, ESM.
 *
 * Usage:
 *   npm run verify:no-credit-account
 *
 * Exit codes, the three this repository's scripts already use:
 *   0  no file of the credit path can create an account
 *   1  at least one can — every hit is listed, with its path and line
 *   2  nothing was measured: `src/` is missing, an exempt file has moved, or the
 *      credit path holds no scannable file. No verdict is implied by a 2.
 */

import { readdirSync, readFileSync, existsSync, lstatSync, realpathSync } from 'node:fs';
import { dirname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SRC_DIR = `${ROOT}/src`;

/**
 * The needle, lower-cased once. Every haystack is lower-cased before the
 * comparison, which is what makes the match case-insensitive without a RegExp.
 *
 * It is the PREFIX and not either full method name on purpose: `createUser` and
 * `generateLink` are the two that exist today, and a third one added to the same
 * namespace tomorrow would be caught without anybody remembering to add it here.
 */
export const ACCOUNT_API_NEEDLE = 'auth.admin.';

/** A file joins the perimeter if its PATH contains this, lower-cased. */
export const PATH_MARKER = 'credit';

/** …or if its TEXT contains one of these, lower-cased. */
export const MENTION_MARKERS = ['party_credits', 'partycredit'];

/**
 * The two files with the right to create an account, as normalised
 * repository-relative paths, verified at
 * `.planning/phases/35-per-night-assignments/35-PATTERNS.md` § 4 with their four
 * call sites.
 *
 * They are listed rather than derived, and the list is SHORT on purpose: this
 * assertion is worth exactly as much as the number of holes in it. A third entry
 * is a decision about who may admit a member, and it belongs in a commit that
 * says so.
 */
export const EXEMPT_PATHS = [
  'src/lib/guest-list/process-entry.ts',
  'src/app/(admin)/admin/members/actions.ts',
];

/** Extensions worth reading. Everything else under `src/` is an asset. */
const SCANNED_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs'];

/** Never walked. There is no `node_modules` under `src/`; belt and braces. */
const SKIP_DIRS = new Set(['node_modules', '.next', '.git']);

/**
 * A refusal is not a failure. It means the measurement did not happen, so no
 * verdict below it means anything — and printing a verdict under a refused
 * measurement is exactly the shape this script exists to stop.
 */
function refuse(message, code) {
  console.log(`\nFATAL: ${message}\n`);
  process.exit(code);
}

/** Repository-relative, forward-slashed, comparable for equality. */
export function toRelative(abs) {
  return abs.slice(ROOT.length + 1).split(sep).join('/');
}

/**
 * Every scannable file under `dir`, as repository-relative paths.
 *
 * Symlinks are skipped: following one could walk out of the repository, and a
 * hit reported at a path nobody can open is a failure message that wastes the
 * reader's time at the worst moment.
 */
export function listScannableFiles(dir) {
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
      if (!SCANNED_EXTENSIONS.some((ext) => entry.name.endsWith(ext))) continue;
      out.push(toRelative(child));
    }
  };
  walk(dir);
  return out.sort();
}

/**
 * Why a file is on the credit path, or `null` if it is not.
 *
 * Exported so a reader — and a mutation proof — can ask the question about one
 * file without running the whole measurement.
 */
export function perimeterReason(relPath, source) {
  if (relPath.toLowerCase().includes(PATH_MARKER)) return 'name';
  const haystack = source.toLowerCase();
  if (MENTION_MARKERS.some((m) => haystack.includes(m))) return 'mention';
  return null;
}

/**
 * The reader. Every line of one file that names the account-creating API.
 *
 * Exported so that a mutation proof can assert its mutation was applied **using
 * this reader**, not a second grep. `ai-engineering.md`'s *prova per mutazione*
 * gate asks for the mutation to be verified before its result is believed, and
 * the only assertion worth having is that the mutation is visible to the eyes
 * that are supposed to catch it: a separate grep can agree with the file and
 * still disagree with this function.
 *
 * Counts LINES, not occurrences — a line naming the API twice is one hit.
 */
export function findAccountApiLines(relPath, source) {
  const hits = [];
  const lines = source.split('\n');
  for (let i = 0; i < lines.length; i += 1) {
    const raw = lines[i].split('\r').join('');
    if (!raw.toLowerCase().includes(ACCOUNT_API_NEEDLE)) continue;
    const text = raw.trim();
    // Presentational only — see decision 3 in the file comment. This label
    // never touches the verdict, so a mislabel costs a glance and nothing else.
    const looksLikeComment =
      text.startsWith('//') || text.startsWith('*') || text.startsWith('/*');
    hits.push({ path: relPath, line: i + 1, text, looksLikeComment });
  }
  return hits;
}

/** The whole measurement, as data. Exported for the same reason as above. */
export function scan() {
  const files = listScannableFiles(SRC_DIR);
  const perimeter = [];
  const hits = [];
  for (const rel of files) {
    if (EXEMPT_PATHS.includes(rel)) continue;
    const source = readFileSync(`${ROOT}/${rel}`, 'utf8');
    const reason = perimeterReason(rel, source);
    if (!reason) continue;
    perimeter.push({ path: rel, reason });
    hits.push(...findAccountApiLines(rel, source));
  }
  return { files, perimeter, hits };
}

// ── the run ────────────────────────────────────────────────────────────────

/**
 * Direct invocation, compared on REAL paths.
 *
 * `verify-capabilities.mjs:624` compares `resolve(process.argv[1])` with
 * `fileURLToPath(import.meta.url)`, and that comparison is unsound whenever any
 * component of the path is a symlink: Node resolves `import.meta.url` through
 * the link and leaves `process.argv[1]` as typed. Measured while writing
 * `verify-no-header-identity.mjs`: run from `/tmp/...` — and `/tmp` is a symlink
 * to `private/tmp` on macOS — the guard evaluated false, so the script loaded
 * its exports, asserted nothing, printed nothing and **exited 0**. A silent
 * green from a check that never ran is the exact failure this repository keeps
 * recording, and it arrives in the one place nobody looks: a passing gate.
 */
const realOrSelf = (p) => {
  try {
    return realpathSync(p);
  } catch {
    return resolve(p);
  }
};
const invokedDirectly =
  Boolean(process.argv[1]) &&
  realOrSelf(process.argv[1]) === realOrSelf(fileURLToPath(import.meta.url));

if (invokedDirectly) {
  console.log('\nverify-no-credit-account — can the credit path create an account\n');

  if (!existsSync(SRC_DIR)) {
    refuse(`${toRelative(SRC_DIR)} does not exist. Nothing was measured.`, 2);
  }

  // Decision 4. Checked BEFORE the walk, so a moved exemption refuses instead of
  // producing a verdict whose perimeter silently changed underneath it.
  const missingExemptions = EXEMPT_PATHS.filter((rel) => !existsSync(`${ROOT}/${rel}`));
  if (missingExemptions.length) {
    refuse(
      `${missingExemptions.length} of the ${EXEMPT_PATHS.length} exempt files DO NOT EXIST:\n` +
        missingExemptions.map((rel) => `      ${rel}`).join('\n') +
        '\n\n' +
        'They were not scanned and they were not found, so this run asserts nothing. Re-point\n' +
        'EXEMPT_PATHS at the new location ON PURPOSE, in a commit that says so — do NOT let an\n' +
        'exemption follow a name, because the next thing to move into that name inherits\n' +
        'permission to create an account, and in this community an account is membership.',
      2
    );
  }

  const { files, perimeter, hits } = scan();

  if (files.length === 0) {
    refuse(
      `the walk of ${toRelative(SRC_DIR)} found no ${SCANNED_EXTENSIONS.join('/')} file, so the\n` +
        'verdict below would be vacuously green. A check that cannot fail is not a check.',
      2
    );
  }

  console.log(`  walked   : ${files.length} files under src/`);
  console.log(`  needle   : "${ACCOUNT_API_NEEDLE}", literal substring, matched case-insensitively.`);
  console.log('             Comments are COUNTED, not filtered — see decision 3 in this file.');
  console.log(`  exempt   : ${EXEMPT_PATHS.length} file(s), the ONLY ones permitted to create an account —`);
  for (const rel of EXEMPT_PATHS) console.log(`             ${rel}`);
  console.log('             printed on every run, pass or fail: an exemption nobody sees is one that grows.\n');

  if (perimeter.length === 0) {
    refuse(
      'the credit path holds NO scannable file, so the verdict below would be vacuously green.\n' +
        `A file joins it by name (its path contains "${PATH_MARKER}") or by mention (its text names\n` +
        `${MENTION_MARKERS.map((m) => `"${m}"`).join(' or ')}). Neither matched anything.\n` +
        '\n' +
        'This is a REFUSAL and not a pass. If the credit surface has not been built yet, that is\n' +
        'the expected state and this 2 is the correct answer — it says "nothing was measured",\n' +
        'which is the truth. It becomes a 0 the moment the first file of that path exists.',
      2
    );
  }

  console.log(`  perimeter: ${perimeter.length} file(s) on the credit path, with why each entered —`);
  for (const entry of perimeter) console.log(`             [${entry.reason.padEnd(7)}] ${entry.path}`);
  console.log('             computed, never listed: a file added to this path tomorrow arrives');
  console.log('             INSIDE the measurement instead of outside it.\n');

  if (hits.length === 0) {
    console.log(`  ✓ no file of the credit path names "${ACCOUNT_API_NEEDLE}".\n`);
    console.log(
      '  WHAT THIS GREEN CLAIMS, precisely: crediting somebody cannot provision them an\n' +
        '  account, because the credit path does not name the API that would. It claims NOTHING\n' +
        '  about whether a credit grants anything — that guarantee is the MISSING COLUMN on\n' +
        '  public.party_credits and the missing field on PartyCreditRow — and NOTHING about who\n' +
        '  may write a credit, which is catalogue.manage, asked in the surface\'s own guard.\n' +
        '  There is no test runner for the product; absence is checkable, good behaviour is not.\n'
    );
    process.exit(0);
  }

  const byFile = new Map();
  for (const hit of hits) {
    if (!byFile.has(hit.path)) byFile.set(hit.path, []);
    byFile.get(hit.path).push(hit);
  }

  console.log(
    `  ✗ ${hits.length} line(s) across ${byFile.size} file(s) of the credit path can create an account:\n`
  );
  for (const [path, fileHits] of byFile) {
    for (const hit of fileHits) {
      const label = hit.looksLikeComment ? ' [comment?]' : '';
      console.log(`      ${path}:${hit.line}:${label} ${hit.text}`);
    }
  }

  const commentish = hits.filter((h) => h.looksLikeComment).length;
  console.log(
    `\n  ${hits.length} line(s): ${hits.length - commentish} in code, ${commentish} comment-shaped\n` +
      '  (the label is presentational; both count toward the verdict).\n'
  );
  console.log(
    '  WHAT THIS MEANS, precisely: each line above is a surface on the credit path reaching the\n' +
      '  account-creating API. Entry to this community is by referral or by manual approval, so\n' +
      '  creating an account IS granting membership — and a credit is an ATTRIBUTION, decided by\n' +
      '  whoever curates the catalogue, not by whoever admits members. A path that does both\n' +
      '  turns "credit a photographer" into "admit a member" with nobody having decided it.\n'
  );
  console.log(
    '  THE FIX IS NOT AN EXEMPTION. Move the account creation to one of the two files that\n' +
      '  already hold that right, where it goes through the approval it is supposed to.\n' +
      '  Widening EXEMPT_PATHS to silence this is opening a second door and calling it a\n' +
      '  configuration change.\n'
  );
  process.exit(1);
}
