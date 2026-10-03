#!/usr/bin/env node
/**
 * verify-media-strip.mjs — one writer toward the PUBLIC cover bucket, and the
 * module it calls strips first.
 *
 * WHAT IT ASSERTS, in one sentence: **no file under `src/` writes into the
 * `event-images` bucket except `src/app/api/media/finalize-cover/route.ts`, that
 * route hands it to the shared finalize module as a `cover-jpeg` with a
 * server-generated key, in that module the call to `stripImageMetadata`
 * precedes every write and no destination is written down, the event form never
 * names the bucket, and the migrations leave no client write policy on it.**
 *
 * ── WHAT CHANGED ON 2026-10-02, AND WHY (DBT-13, plan 52.1-29) ──────────────
 *
 * Until that day this gate was written around the GALLERY bucket,
 * `event-media`: one writer (`src/app/api/media/finalize/route.ts`), the upload
 * component that must name only the quarantine (`src/components/media/
 * MediaUpload.tsx`), and row 15 of the hand-applied queue
 * (`20260809006000_event_media_server_upload_only.sql`) closing the browser's
 * INSERT. **The gallery left the product with plan 52.1-16** (D-52.1-17): the
 * route and the component are deleted, and a gate that pretends a deleted file
 * refuses on every run — which is what this one did between the two plans, the
 * named red interval n. 2 of `52.1-VALIDATION.md`.
 *
 * So the gallery checks were retired, in the dated form below (see "RETIRED"),
 * and the gate now covers **the only public bucket that receives
 * photographs**: `event-images`, the cover of a night — the bucket where the
 * cover of a night with a secret venue lands, readable by URL with no session.
 * The four cover checks plan 52.1-13 added ("·cover") stay as they were; check
 * B (the order in the shared module) and check E (`sharp` declared) stay
 * because they never depended on the gallery; check F (the module holds no
 * destination) is generalised from `event-media` to `event-images`, the one
 * destination whose default would PUBLISH.
 *
 * The private dj-photograph archive (`visual-archive`, written by
 * `/api/media/finalize-archive`) is NOT a subject of check A·cover: a private
 * bucket written by a second route is a filing question, not a publication,
 * and the strip it gets is check B's — the same module, the same order.
 *
 * ── WHAT CHANGED ON 2026-10-03, AND WHY (phase 52.3, plan 52.3-03) ─────────
 *
 * The cover route learned a second key prefix: a LiveCut cover is written at
 * `livecuts/<uuid>.jpg`, by the SAME route, through the SAME stripper, into the
 * SAME bucket — never by a second writer (`media-and-storage.md`). So check
 * B·cover now asserts that the route's live code carries BOTH whole template
 * literals, {@link COVER_KEY_TEMPLATES}, and NO OTHER template literal built on
 * `${crypto.randomUUID()}`: a third prefix would be a new public path nobody
 * reviewed. The literals are matched whole on purpose — a prefix held in a
 * variable would hide what is written, so the route spells both out.
 * Check C·cover stays on `EventForm.tsx` alone: the LiveCut form does not exist
 * yet, and plan 52.3-10 adds it to C·cover in the same commit as the form — a
 * gate that demands an absent file refuses on every run.
 *
 * ── LINE CITATIONS OF THIS FILE ELSEWHERE ───────────────────────────────────
 *
 * Eleven comments in other gates cite `verify-media-strip.mjs:51-62`, `:130`
 * and `:163` (the lesson "a gate that reddens on correct work gets switched
 * off", and the line-shape comment heuristic). **Those numbers refer to this
 * file as it stood before 2026-10-02**, at commit `02be087e`. The lessons
 * survive here: the first is the reason every refusal below names its cause,
 * the second is `scripts/lib/comments.mjs`, which this file imports.
 *
 * ── WHAT A GREEN DOES NOT MEAN (cosa un verde NON significa) ────────────────
 *
 *   - It does NOT prove `sharp` actually removes the metadata. That is a
 *     RUNTIME property of a library on real bytes, and this script never
 *     executes anything. The proof is the manual procedure P-521-E (plan
 *     52.1-20, on the laboratory): a cover with known GPS goes in, the object
 *     fetched back from the public URL comes out without it.
 *   - It does NOT mean `20261001120100_cover_server_only.sql` was APPLIED.
 *     Check D·cover reads a FILE. Until that migration is applied (plan 52.1-20
 *     on the lab, act 3 in production, after the route is deployed) a browser
 *     with `is_admin_or_organizer()` can still write into the bucket by hand.
 *   - It does NOT mean anybody is authorised. Capability grants are
 *     `verify:capabilities`, and **RLS is the security boundary** (`CLAUDE.md`,
 *     operating principle 2), not a script.
 *   - It says nothing about `venue-photos` and `artist-photos`, the other two
 *     public buckets: they do not receive photographs through the stripper and
 *     are outside this gate — stated rather than implied.
 *
 * ── THE PREFIX TRAP AND COMMENT HYGIENE ─────────────────────────────────────
 *
 * Buckets are matched as QUOTED LITERALS (`"event-images"`, `'event-images'`,
 * backtick), never as substrings, so that a longer name sharing a prefix cannot
 * satisfy the match — the trap `event-media-quarantine` set for the gallery
 * bucket, recorded twice in phase 35. Comment lines are blanked BEFORE any
 * counting by the shared stripper, so prose — this header included — cannot
 * decide a verdict.
 *
 * SECRECY. `.planning/` is tracked and this repository is PUBLIC (`CLAUDE.md`
 * Guardrail 5). This script reads only committed files, prints only paths, line
 * numbers and source lines, opens no network connection, reads no environment
 * variable and writes no artefact.
 *
 * Zero dependencies. Node built-ins only, ESM. Deliberately NOT wired into
 * `npm run build`: `next build` is the type gate.
 *
 * Usage:
 *   npm run verify:media-strip
 *
 * Exit codes:
 *   0  every check passed
 *   1  at least one failed — each is printed with its file and line
 *   2  nothing was measured: `src/` is missing, a subject file has moved, or the
 *      walk found no scannable file. No verdict is implied by a 2.
 */

import { readdirSync, readFileSync, existsSync, lstatSync } from 'node:fs';
import { dirname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

import { liveLinesFrom } from './lib/comments.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SRC_DIR = `${ROOT}/src`;
const MIGRATIONS_DIR = `${ROOT}/supabase/migrations`;

/**
 * The one file that performs the sequence — download, strip, write — since plan
 * 45-17 moved it out of the route.
 *
 * ── WHY THE CHECK MOVED WITH IT, WHICH IS THE ONLY HONEST OPTION ────────────
 *
 * Check B compares line numbers **in the file where the strip and the write
 * actually are**. Until plan 45-17 that was the route. A second destination then
 * arrived — the private dj-photograph archive of `20260817120400` — and two
 * copies of a sequence whose correctness is an ORDER is one copy that will stop
 * stripping. The sequence therefore lives in one module and both routes call it.
 *
 * Leaving check B pointed at the route would have produced **the worst possible
 * outcome for a gate**: `findStripLines(FINALIZE_ROUTE)` returns nothing, B
 * reddens on a correct tree, and the repair somebody reaches for is switching
 * the check off. Pointing it at the module keeps the property it was written to
 * hold — *the strip precedes the write* — measured where the two statements now
 * sit.
 *
 * *(2026-10-02: "the gallery bucket" in the paragraph below is
 * `event-media`, retired with the gallery; the same reasoning now holds for
 * `event-images`, which is what check A·cover reads.)*
 *
 * ── AND WHAT WOULD HAVE BEEN LOST SILENTLY IF ONLY B HAD MOVED ──────────────
 *
 * Check A finds a second writer by looking for the gallery bucket's name in the
 * same statement as a write call. After the extraction, a file could name the
 * gallery bucket and hand it to the shared module WITHOUT any `.upload(` on the
 * line — invisible to A, and a green about nothing in the other direction. So
 * the module's entry point is in {@link WRITE_CALLS}: naming the gallery bucket
 * in a call to it counts as writing to the gallery bucket, which is what it is.
 */
export const STRIP_MODULE = 'src/lib/media/finalize.ts';

/**
 * The shared module's entry point — matched as a **bare identifier**, with NO
 * opening parenthesis, and that is the second thing plan 45-17's probe caught.
 *
 * The four storage calls above are spelled `.upload(` and friends because a
 * method cannot carry a type argument between its name and its parenthesis. This
 * one can, and both of its callers use it:
 *
 *     finalizeStrippedUpload<never>({ …
 *
 * so `'finalizeStrippedUpload('` matched **neither** call site. The check went on
 * printing a tick. Dropping the parenthesis costs nothing here because comments
 * are blanked before any line is read, so a mention in prose cannot match — and
 * the import line that also carries the identifier ends with a `;`, which is the
 * boundary the statement window stops at.
 *
 * Named here rather than inline because it appears in three places — the
 * {@link WRITE_CALLS} list, {@link findWriteCallLines} and check F's report —
 * and three spellings of one identifier is two that stop matching after a
 * rename.
 */
export const FINALIZE_CALL = 'finalizeStrippedUpload';

/** The public cover bucket. Matched as a quoted literal only. */
export const COVER_BUCKET = 'event-images';

/** The one file allowed to hand the cover bucket to a write. An exact path. */
export const COVER_ROUTE = 'src/app/api/media/finalize-cover/route.ts';

/**
 * The only key templates the cover route may write (check B·cover), whole.
 * `covers/` is the cover of a night; `livecuts/` is the cover of a LiveCut
 * (phase 52.3). Any other template on `${crypto.randomUUID()}` is a refusal.
 */
export const COVER_KEY_TEMPLATES = [
  'covers/${crypto.randomUUID()}.jpg',
  'livecuts/${crypto.randomUUID()}.jpg',
];

/** The form that used to write the cover from the browser (check C·cover). */
export const COVER_FORM = 'src/components/events/EventForm.tsx';

/** M-C: the migration that closes the bucket's write policies. */
export const COVER_MIGRATION = '20261001120100_cover_server_only.sql';

/** The migration that created the four policies M-C drops. */
export const COVER_POLICY_SOURCE = '20260225100000_phase5_events.sql';

/** The private transit bucket, named only so the report can say where to deposit. */
export const QUARANTINE_BUCKET = 'event-media-quarantine';

/** The stripper's exported name, matched with its opening parenthesis. */
export const STRIP_CALL = 'stripImageMetadata(';

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

const liveLinesCache = new Map();

/**
 * The file's lines, comments blanked, carriage returns removed.
 *
 * **This gate was one of the two `41.1-PATTERNS.md` §5.1 found.** D-41.1-07
 * named eight scripts carrying the stripper; the count was taken with a grep for
 * the state-machine identifiers, and this file carries only the line-shape half
 * — the four-line `isCommentLine` at digest `35d258011314`, in six copies rather
 * than four. It is deleted here rather than left, because closing a phase that
 * says *"one module"* while byte-identical copies survive in the same directory
 * is the shape DEF-41-06 recorded and this phase exists to close.
 *
 * The three places that asked *"is this line a comment?"* now ask the live line
 * whether it came back blank, which is the same question answered with the
 * multi-line state family A never had. §4.4: **zero lines become live**, so this
 * gate cannot redden.
 */
function liveLines(relPath) {
  const cached = liveLinesCache.get(relPath);
  if (cached) return cached;

  const raw = readFileSync(`${ROOT}/${relPath}`, 'utf8').split('\n');
  const { lines, unterminated } = liveLinesFrom(raw);
  if (unterminated !== null) refuseUnterminated(relPath, unterminated);

  liveLinesCache.set(relPath, lines);
  return lines;
}

/**
 * *(2026-10-02: this paragraph was written for `findPublicBucketWrites`, the
 * gallery-bucket version retired with the gallery; `findBucketWrites` below is
 * the same two rules parameterised by bucket, and it is the one that runs.)*
 *
 * Every non-comment line of `relPath` that **WRITES** to the gallery bucket.
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
 *   1. the bucket named in a statement that also contains one of
 *      {@link WRITE_CALLS}. The pair is split across lines in this codebase's
 *      style (`.from("event-media")` then `.upload(`), so the statement window
 *      runs forward to the next `;` or at most `STATEMENT_WINDOW` lines — never
 *      the whole file, or an unrelated write further down would be attributed to
 *      this bucket.
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

/**
 * What counts as WRITING to the bucket — WR-06 of the code review of 2026-08-09.
 *
 * **`.upload(` was the whole list, and three of `@supabase/storage-js`'s writes
 * are not spelled `.upload(`.** They are literals, they would have been
 * invisible, and the third is the one that matters most:
 *
 *   | call | what it does to a PUBLIC bucket |
 *   |---|---|
 *   | `.copy(src, dst)` | creates a new object — bytes never stripped |
 *   | `.move(src, dst)` | the same, and removes the original |
 *   | `.createSignedUploadUrl(path)` | hands the **browser** a direct write permit |
 *   | `.uploadToSignedUrl(path, token, file)` | spends one of those permits |
 *
 * `createSignedUploadUrl` is the worst of the four, and it is the reason this
 * list exists rather than a second `includes`. Row 15 of the hand-applied queue
 * (`20260809006000_event_media_server_upload_only.sql`) takes the browser's
 * `INSERT` policy away; a `createSignedUploadUrl` issued from the service role
 * would **hand it straight back**, with the migration still formally applied and
 * this script still green. That is the shape this phase has already caught twice
 * inside itself (35-17, and 35-20's M2): a check the thing it watches can
 * satisfy.
 *
 * `.remove(` is deliberately NOT here. Deleting is not publishing, it is the
 * operation `media-and-storage.md` (gate *moderazione = rimozione*) requires to
 * keep working, and row 15 preserves the DELETE policies on purpose. A check
 * that fails on the file it exists to protect gets switched off.
 *
 * Each entry is proved by mutation — inserted into a real file under `src/`,
 * asserted to have landed, the script run, then reverted. The proofs are in the
 * REVIEW-FIX report for this finding; the list is not "obviously right", it is
 * measured.
 */
const WRITE_CALLS = [
  '.upload(',
  '.copy(',
  '.move(',
  '.createSignedUploadUrl(',
  '.uploadToSignedUrl(',
  // Plan 45-17. Handing the gallery bucket's name to the shared module IS
  // writing to the gallery bucket; without this entry the extraction would have
  // opened a second path that names the bucket on a line carrying no storage
  // call at all. Proved by mutation like the four above.
  FINALIZE_CALL,
];

/** The write call this window contains, or `null`. Named so the failure says which. */
function writeCallIn(window) {
  return WRITE_CALLS.find((call) => window.includes(call)) ?? null;
}

/**
 * Every non-comment line of `relPath` carrying one of {@link WRITE_CALLS},
 * regardless of which bucket it writes to.
 *
 * This is how check B measures a module whose DESTINATION IS AN ARGUMENT: there
 * is no bucket literal to look for, and looking for one would have made a
 * correct module read as one that never writes. {@link FINALIZE_CALL} is
 * excluded here — it is a write for the purposes of check A, which is about a
 * caller naming a bucket, and it is emphatically not one inside the module that
 * implements it, where it would match nothing anyway.
 */
export function findWriteCallLines(relPath) {
  const live = liveLines(relPath);
  const hits = [];
  for (let i = 0; i < live.length; i += 1) {
    const raw = live[i];
    if (raw === '') continue;
    const call = WRITE_CALLS.find((c) => c !== FINALIZE_CALL && raw.includes(c));
    if (call === undefined) continue;
    hits.push({ path: relPath, line: i + 1, text: raw.trim(), call });
  }
  return hits;
}

/** Every non-comment line of `relPath` that calls the stripper. */
export function findStripLines(relPath) {
  const live = liveLines(relPath);
  const hits = [];
  for (let i = 0; i < live.length; i += 1) {
    const raw = live[i];
    if (raw === '') continue;
    if (!raw.includes(STRIP_CALL)) continue;
    hits.push({ path: relPath, line: i + 1, text: raw.trim() });
  }
  return hits;
}

/** Does this line name `bucket` as a quoted literal? */
export function namesBucket(raw, bucket) {
  return (
    raw.includes(`"${bucket}"`) || raw.includes(`'${bucket}'`) || raw.includes(`\`${bucket}\``)
  );
}

/**
 * Every live line of `relPath` that WRITES to `bucket` — the same two rules as
 * {@link findPublicBucketWrites} (a write call in the same statement, forward
 * AND backward; or the literal bound to a name), parameterised by bucket. It
 * was a second copy beside the gallery version until 2026-10-02; the gallery
 * version is retired and this is now the only one.
 */
export function findBucketWrites(relPath, bucket) {
  const live = liveLines(relPath);
  const binds = new RegExp(`=\\s*(["'\`])${bucket}\\1`);
  const hits = [];
  for (let i = 0; i < live.length; i += 1) {
    const raw = live[i];
    if (raw === '') continue;
    if (binds.test(raw)) {
      hits.push({ path: relPath, line: i + 1, text: raw.trim(), kind: 'binds the bucket name to a variable' });
      continue;
    }
    if (!namesBucket(raw, bucket)) continue;
    let window = raw;
    for (let j = i + 1; j < Math.min(i + 1 + STATEMENT_WINDOW, live.length); j += 1) {
      if (window.includes(';')) break;
      window += `\n${live[j]}`;
    }
    for (let j = i - 1; j >= Math.max(0, i - STATEMENT_WINDOW); j -= 1) {
      const previous = live[j];
      if (previous.includes(';')) break;
      window += `\n${previous}`;
    }
    const call = writeCallIn(window);
    if (call !== null) {
      hits.push({ path: relPath, line: i + 1, text: raw.trim(), kind: `writes to the bucket (${call} in the same statement)` });
    }
  }
  return hits;
}

/** Every live line of `relPath` that names `bucket`, in any role. */
export function findBucketLines(relPath, bucket) {
  const live = liveLines(relPath);
  const hits = [];
  for (let i = 0; i < live.length; i += 1) {
    if (live[i] === '' || !namesBucket(live[i], bucket)) continue;
    hits.push({ path: relPath, line: i + 1, text: live[i].trim() });
  }
  return hits;
}

/*
 * ── RETIRED: THE GALLERY BUCKET'S CHECKS A, C AND D STOOD HERE UNTIL
 *    2026-10-02, AND THEIR FILES ARE GONE ─────────────────────────────────────
 *
 * (DBT-13, D-52.1-17; retired by plan 52.1-29 after plan 52.1-16 deleted the
 * gallery.) Quoted so the reasons survive the specimens:
 *
 *   - `FINALIZE_ROUTE = 'src/app/api/media/finalize/route.ts'` — *"the one file
 *     allowed to NAME the gallery bucket as a destination"*. Check A: no other
 *     file under `src/` writes to `event-media`. The route is deleted; the
 *     exemption refused (exit 2) from the moment it was.
 *   - `UPLOAD_COMPONENT = 'src/components/media/MediaUpload.tsx'` — check C:
 *     *"the browser must not write to the gallery bucket. It deposits into the
 *     quarantine and lets POST /api/media/finalize publish."* The component is
 *     deleted.
 *   - `PUBLIC_BUCKET = 'event-media'` — named "public" and private since
 *     2026-09-23 (NAV-07); the constant kept its name because it was pinned.
 *     It is gone with the checks that read it, and so are
 *     `namesPublicBucket`, `findPublicBucketLines`, `bindsPublicBucket` and
 *     `findPublicBucketWrites`. Check F, which asserted the shared module names
 *     it nowhere, is re-pointed below to `event-images`.
 *   - `ROW_15 = '20260809006000_event_media_server_upload_only.sql'` and
 *     `UPLOAD_POLICY_SOURCE = '20260225120000_phase7_media.sql'` — check D:
 *     row 15 drops the member INSERT policy *"by the name that migration
 *     actually created"*, and no later migration recreates one. The two
 *     migrations stay in `supabase/migrations/` (history is not rewritten);
 *     the bucket and its policies leave the database with plan 52.1-25.
 *
 * **What was NOT kept, said so rather than left implied:** a check that nobody
 * writes into `event-media` at all. The bucket is private, has no reader in
 * the product and is dropped by plan 52.1-25; a writer added before then would
 * publish nothing to anyone. What this gate exists for — a photograph's GPS
 * reaching a URL anybody can open — now has exactly one bucket, below.
 *
 * The lesson that outlives them is the BACKWARD statement window in
 * `findBucketWrites`: measured during plan 45-17 with a probe that named the
 * bucket on a property line BELOW the call to the shared module, and passed a
 * forward-only check while publishing from a second file.
 */


// ── the run ────────────────────────────────────────────────────────────────

if (!existsSync(SRC_DIR)) refuse('`src/` does not exist. Nothing was measured.');
if (!existsSync(MIGRATIONS_DIR)) refuse('`supabase/migrations/` does not exist. Nothing was measured.');
if (!existsSync(`${ROOT}/${STRIP_MODULE}`)) {
  refuse(
    `${STRIP_MODULE} does not exist. Checks B and F have no subject: the sequence\n` +
      '       download-strip-write lives there since plan 45-17, and measuring its ORDER\n' +
      '       somewhere else would be measuring a different file. Nothing was measured.'
  );
}
for (const required of [COVER_ROUTE, COVER_FORM]) {
  if (!existsSync(`${ROOT}/${required}`)) {
    refuse(`${required} does not exist. The cover checks have no subject. Nothing was measured.`);
  }
}

const files = listScannableFiles(SRC_DIR);
if (files.length === 0) {
  refuse('the walk of `src/` found no scannable file. A vacuous green is not a green.');
}

const migrations = readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith('.sql')).sort();

const failures = [];

console.log('\nverify-media-strip — one writer toward the public cover bucket, and it strips first');
console.log(`  scanned ${files.length} file(s) under src/`);
console.log(`  public bucket "${COVER_BUCKET}", exemption (exactly one): ${COVER_ROUTE}\n`);

// ── A·cover. one writer, and it is the cover route ─────────────────────────
const coverStray = [];
for (const rel of files) {
  if (rel === COVER_ROUTE) continue;
  coverStray.push(...findBucketWrites(rel, COVER_BUCKET));
}
const coverRouteWrites = findBucketWrites(COVER_ROUTE, COVER_BUCKET);
if (coverStray.length === 0 && coverRouteWrites.length > 0) {
  console.log(
    `  ✓ A·cover  the only writer of "${COVER_BUCKET}" under src/ is ${COVER_ROUTE} ` +
      `(:${coverRouteWrites[0].line})`
  );
} else {
  if (coverStray.length > 0) {
    console.log(`  ✗ A·cover  ${coverStray.length} line(s) outside the cover route write to "${COVER_BUCKET}":`);
    for (const h of coverStray) console.log(`         ${h.path}:${h.line}: [${h.kind}] ${h.text}`);
    console.log(
      '\n       Each is a path into a PUBLIC bucket that skips the stripper: a cover with\n' +
        '       the GPS of the place it was taken, readable by URL with no session. Deposit\n' +
        `       into "${QUARANTINE_BUCKET}" and call POST /api/media/finalize-cover.\n`
    );
  }
  if (coverRouteWrites.length === 0) {
    console.log(
      `  ✗ A·cover  ${COVER_ROUTE} no longer writes to "${COVER_BUCKET}" in a way this check sees —\n` +
        '         either the cover stopped being published, or the write moved out of WRITE_CALLS.'
    );
  }
  failures.push('A·cover');
}

// ── B·cover. the route hands the bucket to the stripping module, as a cover ─
//
// The ORDER strip-then-write is check B's, measured in the shared module. What
// is specific to the cover is the call: the bucket, the `cover-jpeg` encoding
// (JPEG, 1920 px, no EXIF) and a server-generated `covers/` key, all in the one
// call to the module. A `same-format` here would publish the original format at
// the original size — still stripped, but not the cover D-52.1-18 decided.
{
  const live = liveLines(COVER_ROUTE);
  const start = live.findIndex((l) => l.includes(FINALIZE_CALL) && !l.includes('import') && !/^\s*[A-Za-z_]+,\s*$/.test(l));
  let call = '';
  if (start >= 0) {
    for (let j = start; j < Math.min(start + 15, live.length); j += 1) {
      call += `\n${live[j]}`;
      if (live[j].includes('});')) break;
    }
  }
  const problems = [];
  if (start < 0) problems.push(`no live call to ${FINALIZE_CALL}`);
  else {
    if (!namesBucket(call, COVER_BUCKET)) problems.push(`the call does not name "${COVER_BUCKET}"`);
    if (!call.includes('encoding: "cover-jpeg"')) problems.push('the call does not pass encoding: "cover-jpeg"');
    if (!call.includes('destinationKey')) problems.push('the call does not pass a destinationKey');
    if (!call.includes('unstrippable: null')) problems.push('the call admits un-strippable bytes (unstrippable is not null)');
  }
  // Both key literals, whole (2026-10-03, phase 52.3) — and no third one.
  for (const template of COVER_KEY_TEMPLATES) {
    if (!live.some((l) => l.includes(template))) {
      problems.push(`the route does not generate the key as ${template}`);
    }
  }
  const UUID_TEMPLATE_RE = /`[^`]*\$\{crypto\.randomUUID\(\)\}[^`]*`/g;
  live.forEach((l, i) => {
    for (const m of l.matchAll(UUID_TEMPLATE_RE)) {
      const inner = m[0].slice(1, -1);
      if (!COVER_KEY_TEMPLATES.includes(inner)) {
        problems.push(
          `line ${i + 1} builds a key template that is not one of the two allowed: ${m[0]} ` +
            '— a new prefix in the public bucket is a new path nobody reviewed'
        );
      }
    }
  });
  if (problems.length === 0) {
    console.log(
      `  ✓ B·cover  ${COVER_ROUTE}:${start + 1} calls ${FINALIZE_CALL} with "${COVER_BUCKET}", ` +
        'cover-jpeg, a server-generated key — covers/<uuid>.jpg or livecuts/<uuid>.jpg, no other — and no un-strippable gate'
    );
  } else {
    console.log(`  ✗ B·cover  ${COVER_ROUTE}:`);
    for (const p of problems) console.log(`         ${p}`);
    failures.push('B·cover');
  }
}

// ── C·cover. the form names the public bucket nowhere ──────────────────────
const formHits = findBucketLines(COVER_FORM, COVER_BUCKET);
if (formHits.length === 0) {
  console.log(`  ✓ C·cover  ${COVER_FORM} names "${COVER_BUCKET}" nowhere`);
} else {
  console.log(`  ✗ C·cover  ${formHits.length} line(s) in ${COVER_FORM} name the public cover bucket:`);
  for (const h of formHits) console.log(`         ${h.path}:${h.line}: ${h.text}`);
  console.log(
    '\n       This is the file the browser upload grew in. It deposits into the quarantine\n' +
      '       and lets POST /api/media/finalize-cover publish.\n'
  );
  failures.push('C·cover');
}

// ── D·cover. the migrations close the browser's write, and nothing reopens it ─
{
  const dCover = [];
  if (!migrations.includes(COVER_MIGRATION)) {
    dCover.push(`${COVER_MIGRATION} does not exist: nothing closes the browser's write on "${COVER_BUCKET}".`);
  } else {
    const mc = readFileSync(`${MIGRATIONS_DIR}/${COVER_MIGRATION}`, 'utf8');
    const dropped = [...mc.matchAll(/DROP\s+POLICY\s+(?:IF\s+EXISTS\s+)?"([^"]+)"\s+ON\s+storage\.objects/gi)].map((m) => m[1]);
    const source = existsSync(`${MIGRATIONS_DIR}/${COVER_POLICY_SOURCE}`)
      ? readFileSync(`${MIGRATIONS_DIR}/${COVER_POLICY_SOURCE}`, 'utf8')
      : '';
    // Statement by statement (split on `;`), so a lazy match cannot run from one
    // policy into the next and attribute a name to the wrong bucket.
    const created = source
      .split(';')
      .map((stmt) => stmt.match(/CREATE\s+POLICY\s+"([^"]+)"\s+ON\s+storage\.objects\s+FOR\s+(INSERT|UPDATE|DELETE|SELECT)/i) && /'event-images'/.test(stmt) ? stmt.match(/CREATE\s+POLICY\s+"([^"]+)"/i)[1] : null)
      .filter((n) => n !== null);
    if (created.length === 0) {
      dCover.push(`${COVER_POLICY_SOURCE} creates no policy on "${COVER_BUCKET}" any more: nothing to compare M-C against.`);
    } else {
      const unmatched = created.filter((n) => !dropped.includes(n));
      if (unmatched.length > 0) {
        dCover.push(
          `${COVER_MIGRATION} does not drop ${unmatched.map((n) => `"${n}"`).join(', ')}, created by ` +
            `${COVER_POLICY_SOURCE}. A DROP POLICY IF EXISTS with a wrong name applies cleanly and changes nothing.`
        );
      }
    }
    if (/CREATE\s+POLICY[\s\S]*?'event-images'/i.test(mc.split('\n').filter((l) => !l.trim().startsWith('--')).join('\n'))) {
      dCover.push(`${COVER_MIGRATION} itself creates a policy on "${COVER_BUCKET}".`);
    }
  }
  const reopened = [];
  for (const file of migrations) {
    if (file <= COVER_MIGRATION) continue;
    const sql = readFileSync(`${MIGRATIONS_DIR}/${file}`, 'utf8');
    for (const stmt of sql.split(';')) {
      if (
        /CREATE\s+POLICY/i.test(stmt) &&
        /ON\s+storage\.objects\s+FOR\s+(INSERT|UPDATE|ALL)/i.test(stmt) &&
        /TO\s+[^;]*\b(authenticated|anon|public)\b/i.test(stmt) &&
        /'event-images'/.test(stmt)
      ) {
        reopened.push(file);
        break;
      }
    }
  }
  if (reopened.length > 0) {
    dCover.push(`these migration(s) recreate a client write policy on "${COVER_BUCKET}" after M-C: ${reopened.join(', ')}.`);
  }
  if (dCover.length === 0) {
    console.log(
      `  ✓ D·cover  ${COVER_MIGRATION} drops every policy ${COVER_POLICY_SOURCE} created on ` +
        `"${COVER_BUCKET}", and no later migration gives a client a write on it`
    );
  } else {
    console.log(`  ✗ D·cover  the browser's write on "${COVER_BUCKET}" is not closed in the migrations:`);
    for (const line of dCover) console.log(`         ${line}`);
    failures.push('D·cover');
  }
  console.log(
    `\n  Reminder: D·cover reads a FILE. ${COVER_MIGRATION} is applied after the route is\n` +
      '  deployed (plan 52.1-20 on the lab, act 3 in production) — until then the browser\n' +
      '  write policies still exist in the catalogue.'
  );
}

// ── B. the strip precedes the write, in the module that does both ──────────
//
// This compares line numbers, which proves an ORDER and not a PROPERTY: plan
// 35-20 measured a mutation that publishes the UNSTRIPPED bytes while keeping
// this ordering green (its M2). That is stated here rather than left implicit,
// because a reader who mistakes B for a guarantee stops looking for the guard
// that actually holds — which is the module's own structural assertions. B's
// real job is narrower and still worth having: it catches a write inserted ABOVE
// the strip.
//
// Measured in `src/lib/media/finalize.ts` since plan 45-17, and the write is
// matched by CALL rather than by bucket name — the module's destination is an
// argument, which is the whole reason a second destination could be added
// without a second copy of the sequence.
const moduleStrip = findStripLines(STRIP_MODULE);
const moduleWrites = findWriteCallLines(STRIP_MODULE);

if (moduleStrip.length === 0) {
  console.log(`  ✗ B  ${STRIP_MODULE} contains no live call to ${STRIP_CALL}`);
  console.log(
    '\n       A finalize module that never strips is the whole defect, wearing the name of\n' +
      '       the fix. (Comment lines are filtered before counting, so a call left COMMENTED\n' +
      '       OUT by a botched restore reads as absent — which is the correct reading.)\n'
  );
  failures.push('B');
} else if (moduleWrites.length === 0) {
  console.log(`  ✗ B  ${STRIP_MODULE} performs no write this check can see`);
  console.log(
    '\n       Nothing lands anywhere. Either the module stopped writing, or the write moved\n' +
      '       to a call outside WRITE_CALLS — in which case check A has stopped meaning\n' +
      '       anything too, and both must be repaired together.\n'
  );
  failures.push('B');
} else {
  const lastStrip = moduleStrip[moduleStrip.length - 1].line;
  const firstWrite = moduleWrites[0].line;
  if (lastStrip < firstWrite) {
    console.log(
      `  ✓ B  the strip precedes the write in ${STRIP_MODULE} (last ${STRIP_CALL} at ` +
        `:${lastStrip}, first write at :${firstWrite} via ${moduleWrites[0].call})`
    );
  } else {
    console.log(
      `  ✗ B  a write at ${STRIP_MODULE}:${firstWrite} (${moduleWrites[0].call}) sits at or ` +
        `above the last ${STRIP_CALL} at :${lastStrip}`
    );
    console.log(
      '\n       Bytes can reach a destination bucket without having passed the stripper.\n' +
        '       The order in that file IS the guarantee: download, strip, write, and the\n' +
        '       write is the last statement.\n'
    );
    failures.push('B');
  }
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
      '       a product whose cover upload does not work.\n'
  );
  failures.push('E');
}

// ── F. the shared module holds no destination of its own ───────────────────
//
// Plan 45-17, re-pointed 2026-10-02 (plan 52.1-29). The module's destination is
// a REQUIRED ARGUMENT with no default, and this check is the mechanical half of
// that sentence: the PUBLIC bucket's name must not appear in that file in any
// role at all — not as a fallback, not as a `??`, not as a constant "for the
// common case".
//
// Until 2026-10-02 this read the gallery bucket (`event-media`). It reads
// `event-images` now because the asymmetry it guards did not move, only its
// subject did: a default that pointed at the private archive would be a filing
// mistake, recoverable by moving an object; a default that points at the
// public bucket PUBLISHES a photograph nobody decided to publish, readable by
// URL with no session, and in this domain an accidental publication is read as
// an announcement. The two errors are not the same size, so the check guards
// the one that does not come back.
const moduleBucketHits = findBucketLines(STRIP_MODULE, COVER_BUCKET);

if (moduleBucketHits.length === 0) {
  console.log(
    `  ✓ F  ${STRIP_MODULE} names "${COVER_BUCKET}" nowhere — its destination is an argument`
  );
} else {
  console.log(
    `  ✗ F  ${moduleBucketHits.length} line(s) in ${STRIP_MODULE} name the public cover bucket:`
  );
  for (const h of moduleBucketHits) console.log(`         ${h.path}:${h.line}: ${h.text}`);
  console.log(
    '\n       A default destination is how a FILED photograph becomes a PUBLISHED one. The\n' +
      `       destination is a required field of the request this module takes; ${FINALIZE_CALL}\n` +
      "       has no fallback and must not grow one.\n"
  );
  failures.push('F');
}


// ── verdict ────────────────────────────────────────────────────────────────
console.log('');
if (failures.length === 0) {
  console.log(
    '  MEDIA_STRIP_OK — all seven checks passed (four on the public cover bucket, B and F on the\n' +
      '  shared module, E on the dependency).'
  );
  console.log(
    '  Read the header before treating this as safety: it says nothing about whether sharp\n' +
      '  really removes metadata, and nothing about M-C being APPLIED.\n'
  );
  process.exit(0);
}
console.log(`  MEDIA_STRIP_FAIL — ${failures.length} check(s) failed: ${failures.join(', ')}\n`);
process.exit(1);
