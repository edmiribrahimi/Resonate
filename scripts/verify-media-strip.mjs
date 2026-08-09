#!/usr/bin/env node
/**
 * verify-media-strip.mjs — one writer toward the public media bucket, and it
 * strips first.
 *
 * WHAT IT ASSERTS, in one sentence: **no file under `src/` writes into the
 * `event-media` bucket except `src/app/api/media/finalize/route.ts`, and in that
 * file the call to `stripImageMetadata` precedes every write.**
 *
 * WHY A STRUCTURAL CHECK AND NOT A TEST ON ONE FILE. A test that reads the
 * finalize route proves the finalize route. It says nothing about the second
 * writer somebody adds in four months — a "quick" direct upload from a new
 * admin surface, a re-publish in a cron, a component copy-pasted from the one
 * this phase rewrote. The property that makes the strip a gate is not "the route
 * is correct", it is "there is nowhere else to go". Absence is checkable.
 *
 * ── WHAT A GREEN DOES NOT MEAN (cosa un verde NON significa) ────────────────
 *
 *   - It does NOT prove `sharp` actually removes the metadata. That is a
 *     RUNTIME property of a library on real bytes, and this script never
 *     executes anything. The proof is the manual procedure in
 *     `35-HUMAN-UAT.md`: a file with known GPS goes in, the object fetched back
 *     from the public bucket comes out without it. Nothing here can stand in
 *     for that.
 *   - It proves NOTHING about videos. This phase does not strip them: the video
 *     branch of the finalize route publishes the bytes as received, and refuses
 *     only when the night's venue is secret. A green here is silent about every
 *     video that is not refused.
 *   - It does NOT mean the migration was APPLIED. Check D reads a FILE in
 *     `supabase/migrations/`. Row 15 of the queue in `35-HUMAN-UAT.md` is a
 *     hand-applied step, and **until it is applied the strip is bypassable**:
 *     an approved session can write to `event-media` straight from a browser.
 *     This script cannot see a database and will not pretend to.
 *   - It does NOT mean anybody is authorised. Capability grants are
 *     `verify:capabilities`, and even that one reads a catalogue. **RLS is the
 *     security boundary** (`CLAUDE.md`, operating principle 2), not a script.
 *
 * ── THE FIVE CHECKS ─────────────────────────────────────────────────────────
 *
 *   A. No file under `src/`, other than the finalize route, writes to the
 *      `event-media` bucket.
 *   B. In the finalize route, the LAST `stripImageMetadata(` sits above the
 *      FIRST write to `event-media`.
 *   C. `src/components/media/MediaUpload.tsx` names the public bucket nowhere —
 *      it deposits into the quarantine bucket and calls the route.
 *   D. Row 15 exists, drops the member upload policy BY THE NAME THAT MIGRATION
 *      ACTUALLY CREATED, and no later migration recreates an INSERT policy for
 *      `authenticated` on that bucket.
 *   E. `sharp` is declared in `dependencies`.
 *
 * ── THE PREFIX TRAP, WHICH IS THE WHOLE DIFFICULTY OF CHECK A ───────────────
 *
 * `event-media-quarantine` STARTS WITH `event-media`. A naive
 * `line.includes('event-media')` therefore flags every correct file — the
 * rewritten upload component above all — and a check that fails on a correct
 * file gets switched off, after which it guards nothing. So the bucket is
 * matched as a QUOTED LITERAL, `"event-media"` / `'event-media'` / backtick,
 * which the quarantine name cannot satisfy: its closing quote comes eleven
 * characters later. The failure this avoids is not hypothetical — it is the
 * shape recorded twice in this phase already (`35-17`, `35-20` deviation 5),
 * and once during THIS plan's own container probe, whose expectation matched
 * the quarantine policy for exactly this reason.
 *
 * ── COMMENT HYGIENE, WHICH IS LOAD-BEARING HERE ─────────────────────────────
 *
 * Comment lines are removed BEFORE counting. Without that, this very file —
 * which names both `event-media` and `stripImageMetadata` in prose, repeatedly —
 * and the paragraphs inside the files it inspects would decide the verdict on
 * their own. A check invalidated by its own documentation is a precedent this
 * repository has already recorded.
 *
 * The stripper is a LINE-SHAPE heuristic (`//`, `*`, `/*`), deliberately not a
 * tokeniser: WR-07 (`32-REVIEW.md`) records that this repository's real comment
 * parser is unsound — a regex literal containing a quote opens a phantom string
 * that swallows many lines. The heuristic errs by keeping a trailing comment on
 * a code line, which can only ever make this script report MORE, never less. For
 * check A that direction is safe. For check B it is not, so B is written to
 * survive it: see the paragraph on B below.
 *
 * SECRECY. `.planning/` is tracked and this repository is PUBLIC (`CLAUDE.md`
 * Guardrail 5). This script reads only committed files, prints only paths, line
 * numbers and source lines, opens no network connection, reads no environment
 * variable and writes no artefact.
 *
 * Zero dependencies. Node built-ins only, ESM. Deliberately NOT wired into
 * `npm run build`: `next build` is the type gate, and a type gate that starts
 * failing for a reason that is not a type teaches everyone to ignore it — the
 * same decision already taken for `verify-no-header-identity.mjs`.
 *
 * Usage:
 *   npm run verify:media-strip
 *
 * Exit codes:
 *   0  every check passed
 *   1  at least one failed — each is printed with its file and line
 *   2  nothing was measured: `src/` is missing, the route has moved, or the walk
 *      found no scannable file. No verdict is implied by a 2.
 */

import { readdirSync, readFileSync, existsSync, lstatSync } from 'node:fs';
import { dirname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SRC_DIR = `${ROOT}/src`;
const MIGRATIONS_DIR = `${ROOT}/supabase/migrations`;

/** The one file allowed to write the public bucket. An exact path, compared for equality. */
export const FINALIZE_ROUTE = 'src/app/api/media/finalize/route.ts';

/** The one component this phase rewrote, checked on its own by check C. */
export const UPLOAD_COMPONENT = 'src/components/media/MediaUpload.tsx';

/** The public bucket. Never matched as a bare substring — see the prefix trap. */
export const PUBLIC_BUCKET = 'event-media';

/** The private transit bucket. Present here only so the report can name it. */
export const QUARANTINE_BUCKET = 'event-media-quarantine';

/** The stripper's exported name, matched with its opening parenthesis. */
export const STRIP_CALL = 'stripImageMetadata(';

/** Row 15 of the hand-applied queue. */
export const ROW_15 = '20260809006000_event_media_server_upload_only.sql';

/** The migration that created the policy row 15 drops. */
export const UPLOAD_POLICY_SOURCE = '20260225120000_phase7_media.sql';

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

/** Line-shape comment heuristic. See the hygiene paragraph for why not a parser. */
export function isCommentLine(raw) {
  const t = raw.trim();
  return t.startsWith('//') || t.startsWith('*') || t.startsWith('/*') || t.startsWith('*/');
}

/**
 * Does this line name the public bucket AS A BUCKET?
 *
 * Quoted-literal match, so `event-media-quarantine` cannot satisfy it: after
 * `event-media` the quarantine spelling continues with `-`, never with the
 * closing quote. Exported so a mutation proof can assert its mutation is
 * visible to THIS reader rather than to a second grep that may disagree with it.
 */
export function namesPublicBucket(raw) {
  return (
    raw.includes(`"${PUBLIC_BUCKET}"`) ||
    raw.includes(`'${PUBLIC_BUCKET}'`) ||
    raw.includes(`\`${PUBLIC_BUCKET}\``)
  );
}

/** Every non-comment line of `relPath` that names the public bucket, in any role. */
export function findPublicBucketLines(relPath) {
  const lines = readFileSync(`${ROOT}/${relPath}`, 'utf8').split('\n');
  const hits = [];
  for (let i = 0; i < lines.length; i += 1) {
    const raw = lines[i].split('\r').join('');
    if (isCommentLine(raw)) continue;
    if (!namesPublicBucket(raw)) continue;
    hits.push({ path: relPath, line: i + 1, text: raw.trim() });
  }
  return hits;
}

/** Does this line bind the public bucket literal to a name? */
export function bindsPublicBucket(raw) {
  return new RegExp(`=\\s*(["'\`])${PUBLIC_BUCKET}\\1`).test(raw);
}

/**
 * Every non-comment line of `relPath` that **WRITES** to the public bucket.
 *
 * NAMING IT IS NOT WRITING TO IT, and conflating the two is not pedantry: the
 * first version of this check flagged `deleteMedia`
 * (`src/app/(public)/events/[slug]/actions.ts`), which calls `.remove()` on that
 * bucket. That call is not a publish — it is the one `media-and-storage.md`
 * (gate *moderazione = rimozione*) requires to keep working, and the one row 15
 * deliberately preserves the DELETE policies for. A check that fails on the file
 * it exists to protect gets switched off, and then it guards nothing.
 *
 * So a hit is one of two things:
 *
 *   1. the bucket named in a statement that also contains `.upload(`. The pair
 *      is split across lines in this codebase's style (`.from("event-media")`
 *      then `.upload(`), so the statement window runs forward to the next `;` or
 *      at most `STATEMENT_WINDOW` lines — never the whole file, or an unrelated
 *      upload further down would be attributed to this bucket.
 *
 *   2. the bucket BOUND to a name (`const b = "event-media"`). This is the only
 *      cheap way to close the obvious evasion: hoist the literal into a constant
 *      and `.from(b).upload(...)` names no bucket on any line, so rule 1 sees
 *      nothing. There are zero such bindings today.
 *
 * THE HOLE THAT REMAINS, stated rather than left to be found: a bucket name
 * assembled at runtime — a template, a concatenation, a value read from
 * configuration — is invisible to both rules. This script cannot follow a value;
 * it reads text. The property that actually holds the line is the RLS policy row
 * 15 removes: after it, the bucket refuses a browser write regardless of how the
 * name was spelled. This script is the guard against a SERVER-side second
 * writer, which is the one RLS cannot refuse.
 */
const STATEMENT_WINDOW = 8;

export function findPublicBucketWrites(relPath) {
  const lines = readFileSync(`${ROOT}/${relPath}`, 'utf8').split('\n');
  const live = lines.map((l) => {
    const raw = l.split('\r').join('');
    return isCommentLine(raw) ? '' : raw;
  });

  const hits = [];
  for (let i = 0; i < live.length; i += 1) {
    const raw = live[i];
    if (raw === '') continue;

    if (bindsPublicBucket(raw)) {
      hits.push({
        path: relPath,
        line: i + 1,
        text: raw.trim(),
        kind: 'binds the bucket name to a variable',
      });
      continue;
    }

    if (!namesPublicBucket(raw)) continue;

    let window = raw;
    for (let j = i + 1; j < Math.min(i + 1 + STATEMENT_WINDOW, live.length); j += 1) {
      if (window.includes(';')) break;
      window += `\n${live[j]}`;
    }
    if (window.includes('.upload(')) {
      hits.push({
        path: relPath,
        line: i + 1,
        text: raw.trim(),
        kind: 'writes to the bucket (.upload in the same statement)',
      });
    }
  }
  return hits;
}

/** Every non-comment line of `relPath` that calls the stripper. */
export function findStripLines(relPath) {
  const lines = readFileSync(`${ROOT}/${relPath}`, 'utf8').split('\n');
  const hits = [];
  for (let i = 0; i < lines.length; i += 1) {
    const raw = lines[i].split('\r').join('');
    if (isCommentLine(raw)) continue;
    if (!raw.includes(STRIP_CALL)) continue;
    hits.push({ path: relPath, line: i + 1, text: raw.trim() });
  }
  return hits;
}

// ── the run ────────────────────────────────────────────────────────────────

if (!existsSync(SRC_DIR)) refuse('`src/` does not exist. Nothing was measured.');
if (!existsSync(MIGRATIONS_DIR)) refuse('`supabase/migrations/` does not exist. Nothing was measured.');
if (!existsSync(`${ROOT}/${FINALIZE_ROUTE}`)) {
  refuse(
    `${FINALIZE_ROUTE} does not exist. The exemption cannot be applied to a file that\n` +
      '       has moved, and exempting whatever moved into the name would be worse than\n' +
      '       refusing. Nothing was measured.'
  );
}
if (!existsSync(`${ROOT}/${UPLOAD_COMPONENT}`)) {
  refuse(`${UPLOAD_COMPONENT} does not exist. Check C has no subject. Nothing was measured.`);
}

const files = listScannableFiles(SRC_DIR);
if (files.length === 0) {
  refuse('the walk of `src/` found no scannable file. A vacuous green is not a green.');
}

const failures = [];

console.log('\nverify-media-strip — one writer toward the public bucket, and it strips first');
console.log(`  scanned ${files.length} file(s) under src/`);
console.log(`  exemption (exactly one): ${FINALIZE_ROUTE}\n`);

// ── A. nobody else names the public bucket ─────────────────────────────────
const strayHits = [];
for (const rel of files) {
  if (rel === FINALIZE_ROUTE) continue;
  strayHits.push(...findPublicBucketWrites(rel));
}
if (strayHits.length === 0) {
  console.log('  ✓ A  no file under src/ other than the finalize route writes to the public bucket');
} else {
  console.log(`  ✗ A  ${strayHits.length} line(s) outside the finalize route write to "${PUBLIC_BUCKET}":`);
  for (const h of strayHits) console.log(`         ${h.path}:${h.line}: [${h.kind}] ${h.text}`);
  console.log(
    `\n       Each is a SECOND path toward a public bucket. The metadata strip lives in\n` +
      `       ${FINALIZE_ROUTE} and nowhere else, so bytes that reach\n` +
      `       "${PUBLIC_BUCKET}" by another route are published as received —\n` +
      '       GPS coordinates included. Deposit into\n' +
      `       "${QUARANTINE_BUCKET}" and call POST /api/media/finalize instead.\n`
  );
  failures.push('A');
}

// ── B. the strip precedes the write, in the route ──────────────────────────
//
// This compares line numbers, which proves an ORDER and not a PROPERTY: plan
// 35-20 measured a mutation that publishes the UNSTRIPPED bytes while keeping
// this ordering green (its M2). That is stated here rather than left implicit,
// because a reader who mistakes B for a guarantee stops looking for the guard
// that actually holds — which is the route's own structural assertions, listed
// in `35-20-SUMMARY.md`. B's real job is narrower and still worth having: it
// catches a write that is inserted ABOVE the strip.
const routeStrip = findStripLines(FINALIZE_ROUTE);
const routeWrites = findPublicBucketLines(FINALIZE_ROUTE);

if (routeStrip.length === 0) {
  console.log(`  ✗ B  ${FINALIZE_ROUTE} contains no live call to ${STRIP_CALL}`);
  console.log(
    '\n       A finalize route that never strips is the whole defect, wearing the name of\n' +
      '       the fix. (Comment lines are filtered before counting, so a call left COMMENTED\n' +
      '       OUT by a botched restore reads as absent — which is the correct reading.)\n'
  );
  failures.push('B');
} else if (routeWrites.length === 0) {
  console.log(`  ✗ B  ${FINALIZE_ROUTE} never names "${PUBLIC_BUCKET}" in code`);
  console.log(
    '\n       Nothing publishes. Either the route stopped writing, or the bucket name moved\n' +
      '       into a constant this check cannot see — in which case check A has stopped\n' +
      '       meaning anything too, and both must be repaired together.\n'
  );
  failures.push('B');
} else {
  const lastStrip = routeStrip[routeStrip.length - 1].line;
  const firstWrite = routeWrites[0].line;
  if (lastStrip < firstWrite) {
    console.log(
      `  ✓ B  the strip precedes the write in the route (last ${STRIP_CALL} at :${lastStrip}, ` +
        `first write at :${firstWrite})`
    );
  } else {
    console.log(
      `  ✗ B  a write to "${PUBLIC_BUCKET}" at ${FINALIZE_ROUTE}:${firstWrite} sits at or above ` +
        `the last ${STRIP_CALL} at :${lastStrip}`
    );
    console.log(
      '\n       Bytes can reach the public bucket without having passed the stripper. If the\n' +
        '       bucket name was hoisted into a constant at the top of the file, move it back\n' +
        '       inline at the single write — the reason is written in that file.\n'
    );
    failures.push('B');
  }
}

// ── C. the upload component names only the quarantine bucket ───────────────
const componentHits = findPublicBucketLines(UPLOAD_COMPONENT);
if (componentHits.length === 0) {
  console.log(`  ✓ C  ${UPLOAD_COMPONENT} names the public bucket nowhere`);
} else {
  console.log(`  ✗ C  ${componentHits.length} line(s) in ${UPLOAD_COMPONENT} name the public bucket:`);
  for (const h of componentHits) console.log(`         ${h.path}:${h.line}: ${h.text}`);
  console.log(
    '\n       The browser must not write to the public bucket. It deposits into\n' +
      `       "${QUARANTINE_BUCKET}" and lets POST /api/media/finalize publish.\n` +
      '       (C overlaps A on purpose: this is the file the defect grew in, and a named\n' +
      '       check tells a reader where to look instead of making them scan a list.)\n'
  );
  failures.push('C');
}

// ── D. the door is closed in a file, and no later file reopens it ──────────
//
// Two halves. The first is the one that matters most and is easiest to get
// wrong: `DROP POLICY IF EXISTS "…"` with a MISSPELLED name is a silent no-op
// that applies cleanly and leaves the door open. So the name row 15 drops is
// compared, byte for byte, against the name the ORIGINAL migration created.
const migrations = existsSync(MIGRATIONS_DIR)
  ? readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith('.sql')).sort()
  : [];

const dPart = [];

if (!migrations.includes(ROW_15)) {
  dPart.push(`${ROW_15} does not exist: nothing closes the browser's write on the public bucket.`);
} else {
  const row15 = readFileSync(`${MIGRATIONS_DIR}/${ROW_15}`, 'utf8');
  const dropped = [...row15.matchAll(/DROP\s+POLICY\s+(?:IF\s+EXISTS\s+)?"([^"]+)"\s+ON\s+storage\.objects/gi)]
    .map((m) => m[1]);

  const source = existsSync(`${MIGRATIONS_DIR}/${UPLOAD_POLICY_SOURCE}`)
    ? readFileSync(`${MIGRATIONS_DIR}/${UPLOAD_POLICY_SOURCE}`, 'utf8')
    : '';
  const createdInsertNames = [
    ...source.matchAll(
      /CREATE\s+POLICY\s+"([^"]+)"\s+ON\s+storage\.objects\s+FOR\s+INSERT[\s\S]*?bucket_id\s*=\s*'event-media'/gi
    ),
  ].map((m) => m[1]);

  if (createdInsertNames.length === 0) {
    dPart.push(
      `${UPLOAD_POLICY_SOURCE} no longer creates an INSERT policy on the public bucket, so there ` +
        'is nothing to compare row 15 against. Either the door was moved or this check is stale.'
    );
  } else {
    const unmatched = createdInsertNames.filter((n) => !dropped.includes(n));
    if (unmatched.length > 0) {
      dPart.push(
        `${ROW_15} does not drop ${unmatched.map((n) => `"${n}"`).join(', ')} — the INSERT ` +
          `policy ${UPLOAD_POLICY_SOURCE} creates on the public bucket. A DROP POLICY IF EXISTS ` +
          'with a name that matches nothing applies cleanly and changes nothing.'
      );
    }
  }
}

// The second half: no LATER migration may recreate an INSERT policy for
// `authenticated` on that bucket. This is what stops a future phase from
// reopening the door without noticing it did.
const laterReopens = [];
for (const file of migrations) {
  if (file <= ROW_15) continue;
  const sql = readFileSync(`${MIGRATIONS_DIR}/${file}`, 'utf8');
  const statements = [
    ...sql.matchAll(/CREATE\s+POLICY[\s\S]*?(?=CREATE\s+POLICY|DROP\s+POLICY|COMMIT|$)/gi),
  ].map((m) => m[0]);
  for (const stmt of statements) {
    const isInsertOnObjects = /ON\s+storage\.objects\s+FOR\s+INSERT/i.test(stmt);
    const forAuthenticated = /TO\s+authenticated/i.test(stmt);
    // Quoted-literal again: `'event-media-quarantine'` must not count.
    const namesPublic = /'event-media'/.test(stmt) || /"event-media"/.test(stmt);
    if (isInsertOnObjects && forAuthenticated && namesPublic) {
      laterReopens.push(file);
      break;
    }
  }
}
if (laterReopens.length > 0) {
  dPart.push(
    `these migration(s) recreate an INSERT policy for \`authenticated\` on the public bucket ` +
      `after row 15: ${laterReopens.join(', ')}. That reopens the door row 15 closed.`
  );
}

if (dPart.length === 0) {
  console.log(
    `  ✓ D  ${ROW_15} drops the upload policy by the name ` +
      `${UPLOAD_POLICY_SOURCE} created, and no later migration recreates it`
  );
} else {
  console.log('  ✗ D  the door toward the public bucket is not closed in the migrations:');
  for (const line of dPart) console.log(`         ${line}`);
  console.log(
    '\n       Reminder, and it is not a formality: even a green D means only that a FILE says\n' +
      '       so. Row 15 is applied BY HAND, after the deploy. Until somebody applies it, an\n' +
      '       approved session can write to the public bucket from a browser and skip the\n' +
      '       strip entirely.\n'
  );
  failures.push('D');
}

// ── E. the stripper's library is a declared dependency ─────────────────────
let pkg = null;
try {
  pkg = JSON.parse(readFileSync(`${ROOT}/package.json`, 'utf8'));
} catch {
  refuse('package.json could not be read or parsed. Nothing was measured.');
}
if (pkg.dependencies && typeof pkg.dependencies.sharp === 'string') {
  console.log(`  ✓ E  sharp is declared in dependencies (${pkg.dependencies.sharp})`);
} else {
  console.log('  ✗ E  sharp is not declared in `dependencies` of package.json');
  console.log(
    '\n       The stripper imports it. In `devDependencies`, or absent, the production build\n' +
      '       resolves nothing and every photo upload refuses with\n' +
      '       `media_strip.tool_unavailable` — which is the fail-closed direction, and still\n' +
      '       a product whose gallery does not work.\n'
  );
  failures.push('E');
}

// ── verdict ────────────────────────────────────────────────────────────────
console.log('');
if (failures.length === 0) {
  console.log('  MEDIA_STRIP_OK — all five checks passed.');
  console.log(
    '  Read the header before treating this as safety: it says nothing about whether sharp\n' +
      '  really removes metadata, nothing about videos, and nothing about row 15 being\n' +
      '  APPLIED.\n'
  );
  process.exit(0);
}
console.log(`  MEDIA_STRIP_FAIL — ${failures.length} check(s) failed: ${failures.join(', ')}\n`);
process.exit(1);
