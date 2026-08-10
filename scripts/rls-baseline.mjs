#!/usr/bin/env node
/**
 * rls-baseline.mjs — the CAP-03 evidence harness.
 *
 * Why it exists: phase 32 replaces the predicate of every RLS policy in this
 * database while promising that a master, an organizer and a member can do
 * neither more nor less than before. That is a measurement problem, not a
 * coding one — 67 policies cannot be judged by reading a diff — and **a
 * baseline taken after the change is not a baseline**. This script captures
 * what the database actually reports, before anything moves, as a committable
 * artefact that someone else can re-capture and compare.
 *
 * What it does NOT prove: nothing here says a policy is *correct*. It says
 * what the applied policy set *is*, in Postgres's own rendering, so that a
 * later capture can be compared byte for byte. Correctness is a human
 * judgement made against that comparison — the same distinction
 * `verify-persona.mjs` draws between coherence and correctness.
 *
 * Zero dependencies, pure ESM, node built-ins only. `fetch` is global.
 *
 * Usage:
 *   npm run baseline:rls                                    B1+B2+B5 — nothing writes
 *   npm run baseline:rls -- --only=B1 --target=production --phase-point=pre
 *   npm run baseline:rls -- --target=container --only=B1,B2,B3
 *   npm run baseline:rls -- --only=B3 --i-know-this-writes  the write probes, on production
 *   npm run baseline:rls -- --phase-point=post-10 --overwrite   re-capture over an existing file
 *
 * TWO REFUSALS THAT ARE THE DEFAULT, because both destructive paths used to be
 * the path of least resistance (32-REVIEW.md, CR-02):
 *
 *   1. **A captured artefact is never overwritten.** Every destination path is
 *      checked BEFORE anything is measured, and an existing file aborts the run
 *      with exit 1, naming the file and naming `--overwrite`. It is checked a
 *      second time in `writeArtefact`, so an importing script cannot skip it.
 *      A baseline is evidence, not a cache: re-capturing over `pre` makes every
 *      later comparison agree for the worst possible reason.
 *   2. **B3 is not in the default set, and on production it needs
 *      `--i-know-this-writes`.** B3 sends 220+ `read_only: false` INSERT/UPDATE/
 *      DELETE transactions. They roll back, and that is asserted twice — but a
 *      default that writes to production is opt-out safety, which is not safety.
 *
 *
 * This file is BOTH a CLI and a module. `scripts/rls-baseline-container.mjs`
 * imports `captureB1`, `captureB2` and `captureB3` from here and runs them
 * against a throwaway PostgreSQL 17.6 container, so the capture logic exists
 * once. Everything below the `main` guard runs only when this file is the
 * entry point.
 *
 * Exit codes, copied from `verify-persona.mjs`:
 *   0  every requested artefact was captured and written
 *   1  a check failed — an implausible measurement, a refused write
 *   2  the environment is wrong — a missing variable, an unknown flag
 *
 * WHY THE PERSONA PROBES CANNOT USE `read_only: true`. B2 and B3 impersonate a
 * subject with `set local role`, and that statement is REFUSED under the API's
 * read-only flag with `42501: permission denied to set role "authenticated"`
 * (verified 2026-08-06, and again by this plan). So the probes run in a
 * READ-WRITE transaction and the safety does not come from the API at all: it
 * comes from the trailing `rollback;` on every probe string, asserted before a
 * single byte reaches the network, and from re-reading all 20 row counts
 * afterwards and asserting they are unchanged. Two independent clauses,
 * reported separately — because satisfying one says nothing about the other.
 *
 * Everything that does NOT switch role — the policy dump, the advisors, the
 * schema reads, the row-count re-read — still uses `read_only: true`, which is
 * a hard guarantee (an INSERT under it fails `25006`).
 *
 * SECRECY. `.planning/` is tracked and this repository is PUBLIC
 * (CLAUDE.md Guardrail 5). The access token, the project reference and the
 * Supabase URL are read here and are never printed and never written into an
 * artefact. Every string this script prints passes through `redact()` first,
 * so a leak needs two mistakes rather than one.
 */

import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PHASE_DIR = `${ROOT}/.planning/phases/32-capability-model-in-the-database`;
const BASELINE_DIR = `${PHASE_DIR}/baseline`;
const MANAGEMENT_API = 'https://api.supabase.com';

/**
 * ── The determinism contract (phase decision D-15) ────────────────────────
 *
 * These artefacts are committed, and their whole value is that a later
 * capture can be diffed against them. A file that reorders itself between two
 * identical runs produces a diff that HIDES the real one — which is worse
 * than no artefact at all, because it trains the reader to skim diffs.
 *
 * So, fixed by this file and read by every later plan:
 *
 *   1. The top-level object emits its keys in the order
 *      `artefact`, `target`, `postgres_version`, `captured_at`,
 *      `phase_point`, `rows`. An artefact may append its own trailing key
 *      after `rows` (B5 appends `invariants`); the six above never move.
 *   2. Every row object is rebuilt here with an explicit key order. The
 *      order the API happens to return is not a contract.
 *   3. Every row array is sorted by a declared composite key, with a plain
 *      codepoint comparison — never `localeCompare`, whose result depends on
 *      the machine's locale.
 *   4. Every nested array is sorted too.
 *   5. `JSON.stringify(value, null, 2)` plus exactly one trailing newline.
 *   6. `captured_at` is a DATE, never a timestamp. A capture that differs
 *      only in its clock is a diff that teaches the reader to ignore diffs.
 */
const ARTEFACT_KEY_ORDER = [
  'artefact',
  'target',
  'postgres_version',
  'captured_at',
  'phase_point',
  'rows',
];

/** The artefacts this script knows how to capture. */
const KNOWN_ARTEFACTS = ['B1', 'B2', 'B3', 'B5'];

/**
 * The targets this script can reach. `production` is the Management API;
 * `container` is a throwaway PostgreSQL 17.6 built by
 * `scripts/rls-baseline-container.mjs` from this repository's own SQL, which is
 * loaded lazily so that a production capture never touches Docker and a
 * container capture never reads a Supabase credential.
 */
const KNOWN_TARGETS = ['production', 'container'];

/**
 * ── Pre-registered plausibility floors ────────────────────────────────────
 *
 * All three numbers were MEASURED against the production database on
 * 2026-08-06 and written here before this harness ran for the first time.
 * They exist for one reason: a harness that cannot fail is not evidence. A
 * broken parser, a query that silently returns nothing, an API that answers
 * `[]` — each of those produces a green run and an empty baseline, and an
 * empty baseline makes every later comparison pass vacuously.
 *
 * The same refusal, in the same spirit, is `verify-persona.mjs:225-233`.
 *
 * **If a floor trips, the correct response is to investigate the database,
 * not to lower the number.** A policy count below 67 means policies were
 * dropped; a table count below 20 means RLS was disabled somewhere. Both are
 * findings, and both are more important than the capture that was refused.
 */
const FLOOR_POLICY_ROWS = 67;
const FLOOR_RLS_ENABLED_TABLES = 20;

/**
 * NOT a floor, deliberately. `auth_rls_initplan` was 26 on 2026-08-06 and
 * this phase exists to drive it to 0, so asserting it would make the
 * post-phase capture fail for succeeding. It is recorded here so that a
 * PRE-phase capture reporting anything other than 26 is visible as a finding.
 */
const MEASURED_AUTH_RLS_INITPLAN = 26;

// ── secrecy ────────────────────────────────────────────────────────────────

/** Values that must never reach stdout, stderr or an artefact. */
const SECRETS = [];

export function registerSecret(value) {
  if (typeof value === 'string' && value.length >= 4) SECRETS.push(value);
}

/**
 * Redacts every registered secret from a string.
 *
 * Defence in depth, not the primary control: the primary control is that no
 * code path writes a secret anywhere. This exists because an API error body
 * is written by someone else and can echo back what it was sent.
 */
function redact(text) {
  let out = String(text);
  for (const secret of SECRETS) out = out.split(secret).join('«redacted»');
  return out;
}

export function say(message) {
  console.log(redact(message));
}

function fail(message, code) {
  console.error(redact(message));
  process.exit(code);
}

// ── environment ────────────────────────────────────────────────────────────

/**
 * Reads the credentials from `.env.local` (gitignored) when that file exists,
 * and otherwise from the ambient environment — a worktree or a CI runner has
 * no `.env.local`, and refusing there would be refusing for the wrong reason.
 *
 * A missing variable is exit 2, not 1: nothing was measured, so nothing
 * failed. The message names the variable, because "environment is wrong" with
 * no name is the silent failure `meta-gates.md` forbids.
 *
 * Exported so that `scripts/verify-capabilities.mjs` reaches the same database
 * through the same door. A second env loader would be a second place for the
 * project reference to be read and a second place for it to be forgotten in
 * `registerSecret` — and the whole redaction guarantee is that every printed
 * string passes through one list.
 */
export function loadEnvironment() {
  const envFile = `${ROOT}/.env.local`;
  if (existsSync(envFile)) {
    try {
      process.loadEnvFile(envFile);
    } catch (error) {
      fail(`FATAL: .env.local exists but could not be parsed: ${error.message}`, 2);
    }
  }

  const token = process.env.SUPABASE_ACCESS_TOKEN;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  const missing = [];
  if (!token) missing.push('SUPABASE_ACCESS_TOKEN');
  if (!supabaseUrl) missing.push('NEXT_PUBLIC_SUPABASE_URL');
  if (missing.length) {
    fail(
      `FATAL: missing environment variable(s): ${missing.join(', ')}. ` +
        'Set them in .env.local (gitignored) or in the environment. Nothing was measured.',
      2
    );
  }

  let projectRef;
  try {
    projectRef = new URL(supabaseUrl).hostname.split('.')[0];
  } catch {
    fail('FATAL: NEXT_PUBLIC_SUPABASE_URL is not a URL. Nothing was measured.', 2);
  }
  if (!projectRef) {
    fail('FATAL: could not derive the project reference from NEXT_PUBLIC_SUPABASE_URL.', 2);
  }

  registerSecret(token);
  registerSecret(projectRef);
  registerSecret(supabaseUrl);

  return { token, projectRef };
}

// ── the target ─────────────────────────────────────────────────────────────

/**
 * One target = one way to run a SQL string and read rows back.
 *
 * `management-api` is the only target this plan implements. Plan 32-04 adds a
 * throwaway-container target behind this same signature, which is why every
 * SQL string in this file is plain SQL with nothing API-specific in it: the
 * container target must be able to run the identical string.
 *
 * Exported for `scripts/verify-capabilities.mjs`, which needs to read
 * `private.capabilities` and `pg_policies` from the APPLIED database. It reuses
 * this rather than constructing a second client: a second client is a second
 * place to forget `read_only`, and a second thing to keep in step with this one.
 */
export function createManagementApiTarget({ token, projectRef }) {
  const base = `${MANAGEMENT_API}/v1/projects/${projectRef}`;

  async function query(sql, { readOnly }) {
    if (typeof readOnly !== 'boolean') {
      throw new Error('query() requires an explicit readOnly flag — the caller decides, never a default');
    }
    const response = await fetch(`${base}/database/query`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: sql, read_only: readOnly }),
    });
    const body = await response.text();
    if (!response.ok) {
      throw new Error(`[management-api/query] HTTP ${response.status}: ${body}`);
    }
    try {
      return JSON.parse(body);
    } catch {
      throw new Error('[management-api/query] the response was not JSON');
    }
  }

  async function get(path) {
    const response = await fetch(`${base}${path}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const body = await response.text();
    if (!response.ok) {
      throw new Error(`[management-api/get ${path}] HTTP ${response.status}: ${body}`);
    }
    try {
      return JSON.parse(body);
    } catch {
      throw new Error(`[management-api/get ${path}] the response was not JSON`);
    }
  }

  return { name: 'management-api', query, get };
}

// ── determinism helpers ────────────────────────────────────────────────────

/** Codepoint comparison. `localeCompare` would make the artefact machine-dependent. */
export function compareStrings(a, b) {
  const left = a === null || a === undefined ? '' : String(a);
  const right = b === null || b === undefined ? '' : String(b);
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

/** Sorts rows by a declared composite key. */
function sortRows(rows, keys) {
  return [...rows].sort((a, b) => {
    for (const key of keys) {
      const verdict = compareStrings(a[key], b[key]);
      if (verdict !== 0) return verdict;
    }
    return 0;
  });
}

/**
 * Parses a Postgres text-rendered array — `pg_policies.roles` arrives as the
 * string `{public}`, not as a JSON array — into a sorted array of strings.
 *
 * `roles` is part of the B1 comparison: a `TO authenticated` clause added or
 * removed anywhere must show up in the diff. Element order inside a Postgres
 * name[] carries no meaning, so sorting is safe and makes the artefact stable.
 */
function parsePgTextArray(value) {
  if (value === null || value === undefined) return null;
  if (Array.isArray(value)) return [...value].map(String).sort(compareStrings);
  const text = String(value).trim();
  if (!text.startsWith('{') || !text.endsWith('}')) return [text];
  const inner = text.slice(1, -1);
  if (inner === '') return [];

  const elements = [];
  let current = '';
  let quoted = false;
  for (let i = 0; i < inner.length; i += 1) {
    const char = inner[i];
    if (quoted) {
      if (char === '\\') {
        current += inner[i + 1] ?? '';
        i += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        current += char;
      }
    } else if (char === '"') {
      quoted = true;
    } else if (char === ',') {
      elements.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  elements.push(current);
  return elements.sort(compareStrings);
}

/** `PostgreSQL 17.6 on aarch64-…` → `17.6`. The rest is machine detail. */
function reducePostgresVersion(raw) {
  const match = /PostgreSQL (\d+\.\d+)/.exec(String(raw ?? ''));
  return match ? match[1] : null;
}

/** UTC date, never a timestamp. See the determinism contract, rule 6. */
function capturedAtDate() {
  return new Date().toISOString().slice(0, 10);
}

// ── artefact writing ───────────────────────────────────────────────────────

/**
 * The pre-phase capture on production is the unsuffixed file, so that
 * `32-BASELINE-policies.json` is always the thing every later capture is
 * compared against.
 *
 * The container's capture carries `.container` before the extension. The two
 * targets measure different things — production is the schema truth, the
 * container is the persona truth (phase decision D-22) — so they must never
 * land on the same filename. Each artefact also carries its own `target` key,
 * so a file that gets moved still says what it is.
 *
 * **A naming convention is not a guard.** Until 2026-08-06 the sentence above
 * ended "…and a later capture never overwrites it by accident", and no such
 * mechanism existed: `pre` was the DEFAULT phase point and `writeArtefact`
 * called `writeFileSync` unconditionally, so `npm run baseline:rls` with no
 * arguments — the first line of this file's own usage block — replaced all four
 * committed pre-phase artefacts with post-phase data. Every later
 * `--before=pre` comparison would then report `clean` because it was comparing
 * a capture with itself. That is CR-02 in `32-REVIEW.md`, and
 * `assertArtefactsWritable` plus the `existsSync` refusal below are what make
 * the sentence true instead of aspirational.
 */
function artefactPath(slug, phasePoint, targetSuffix = '') {
  const suffix = phasePoint === 'pre' ? '' : `.${phasePoint}`;
  return `${BASELINE_DIR}/32-BASELINE-${slug}${targetSuffix}${suffix}.json`;
}

/** The slug each artefact writes to. Read by `assertArtefactsWritable`. */
const ARTEFACT_SLUGS = { B1: 'policies', B2: 'reads', B3: 'writes', B5: 'advisors' };

/**
 * Whether this process has been given explicit permission to overwrite a
 * captured artefact. Off unless a CLI asked for it.
 *
 * A module flag rather than an environment variable, deliberately:
 * `scripts/rls-baseline-container.mjs` imports `writeArtefact` and reads **no**
 * environment variable at all — a property its own header states and proves with
 * `grep -c 'process\.env'`, and which is what keeps the container target unable
 * to reach a real database. Reading `process.env` here would execute on the
 * container path and quietly cost that proof.
 */
let overwriteAllowed = false;

/** Called by a CLI, never by a capture. See `overwriteAllowed`. */
export function allowArtefactOverwrite() {
  overwriteAllowed = true;
}

function overwriteRefusal(path) {
  return (
    `refusing to overwrite ${relative(ROOT, path)} — it already exists. A captured ` +
    'baseline is evidence, not a cache: re-capturing over it makes every later ' +
    'comparison agree with itself and report clean. Capture to a new ' +
    '--phase-point, or pass --overwrite if replacing this exact file is the ' +
    'intention, and say why in the commit.'
  );
}

/**
 * The refusal, hoisted ahead of every measurement.
 *
 * `writeArtefact` refuses too, and that refusal is the one that cannot be
 * bypassed — but it arrives AFTER the capture has run, and B3's capture is 220+
 * read-write transactions against production. A guard that fires after the
 * probes have been sent prevents the wrong half of the damage. So the CLI calls
 * this first, over every artefact it was asked for, and a single existing file
 * aborts the whole run before a byte reaches the network or Docker starts.
 *
 * Throws with every offending path named, not just the first: a run refused
 * four times in a row teaches nothing the first message did not.
 */
export function assertArtefactsWritable({ only, phasePoint, targetSuffix = '' }) {
  if (overwriteAllowed) return;
  const existing = only
    .map((id) => artefactPath(ARTEFACT_SLUGS[id], phasePoint, targetSuffix))
    .filter((path) => existsSync(path));
  if (!existing.length) return;
  throw new Error(
    `refusing to run: ${existing.length} artefact${existing.length === 1 ? '' : 's'} for ` +
      `--phase-point=${phasePoint} already exist${existing.length === 1 ? 's' : ''} and ` +
      'nothing was measured.\n' +
      existing.map((path) => `      · ${relative(ROOT, path)}`).join('\n') +
      '\n    A captured baseline is evidence, not a cache: re-capturing over it makes every ' +
      'later comparison agree with itself and report clean. Capture to a new --phase-point, ' +
      'or pass --overwrite if replacing these exact files is the intention, and say why in ' +
      'the commit.'
  );
}

function writeArtefact({ artefact, slug, target, postgresVersion, phasePoint, rows, trailing, targetSuffix }) {
  const payload = {};
  const values = {
    artefact,
    target,
    postgres_version: postgresVersion,
    captured_at: capturedAtDate(),
    phase_point: phasePoint,
    rows,
  };
  for (const key of ARTEFACT_KEY_ORDER) payload[key] = values[key];
  if (trailing) for (const [key, value] of Object.entries(trailing)) payload[key] = value;

  mkdirSync(BASELINE_DIR, { recursive: true });
  const path = artefactPath(slug, phasePoint, targetSuffix ?? '');

  // The second of the two refusals, and the one that cannot be routed around:
  // every capture in this file and in the container runner comes through here.
  // The pre-flight above is the kind one; this is the correct one.
  if (existsSync(path) && !overwriteAllowed) {
    throw new Error(overwriteRefusal(path));
  }

  writeFileSync(path, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  return path;
}

// ── B1 — the policy dump ───────────────────────────────────────────────────

/**
 * All policies in `public`, as Postgres itself re-prints them.
 *
 * This is deliberately NOT a read of `supabase/migrations/**`. Postgres
 * normalises a predicate into its own rendering, so comparing renderings
 * compares what is APPLIED — and the migrations have already drifted from the
 * database once in this project (31-VERIFICATION.md).
 */
const B1_SQL = `
select schemaname, tablename, policyname, cmd, permissive, roles, qual, with_check
  from pg_policies
 where schemaname = 'public'
`;

/**
 * The supporting facts, in one read-only round trip.
 *
 * `policy_count` and `rls_enabled_tables` are the plausibility floors' input;
 * `pg_version` is here because plan 32-04 builds a throwaway container that
 * must MATCH the production major.minor, and a baseline that does not record
 * which Postgres rendered its predicates cannot be compared against one that
 * was rendered by a different Postgres.
 */
const FACTS_SQL = `
select
  (select count(*)::int from pg_policies where schemaname = 'public') as policy_count,
  (select count(*)::int from pg_class c
     join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind = 'r' and c.relrowsecurity) as rls_enabled_tables,
  version() as pg_version
`;

/**
 * One facts read per target per run, shared by every artefact captured in that
 * run.
 *
 * Keyed by the TARGET, not by the module. A single process can now hold both a
 * production target and a container target, and a module-level cache would hand
 * production's numbers to the container — a mix-up that would look like
 * agreement.
 */
const factsByTarget = new WeakMap();

async function getFacts(target) {
  if (!factsByTarget.has(target)) {
    factsByTarget.set(
      target,
      target.query(FACTS_SQL, { readOnly: true }).then((rows) => {
        const row = rows[0] ?? {};
        return {
          policyCount: row.policy_count,
          rlsEnabledTables: row.rls_enabled_tables,
          postgresVersion: reducePostgresVersion(row.pg_version),
        };
      })
    );
  }
  return factsByTarget.get(target);
}

export async function captureB1(target, { phasePoint }) {
  const facts = await getFacts(target);
  const { postgresVersion, rlsEnabledTables } = facts;

  const raw = await target.query(B1_SQL, { readOnly: true });
  const rows = sortRows(
    raw.map((row) => ({
      schemaname: row.schemaname,
      tablename: row.tablename,
      policyname: row.policyname,
      cmd: row.cmd,
      permissive: row.permissive,
      roles: parsePgTextArray(row.roles),
      qual: row.qual ?? null,
      with_check: row.with_check ?? null,
    })),
    ['tablename', 'policyname', 'cmd']
  );

  // The refusal comes BEFORE the write. A file written from an implausible
  // measurement is worse than no file: it looks like evidence.
  if (rows.length < FLOOR_POLICY_ROWS) {
    throw new Error(
      `implausible measurement: ${rows.length} policy rows, floor is ${FLOOR_POLICY_ROWS} ` +
        '(measured 2026-08-06). Nothing was written. Investigate the database — do not lower the floor.'
    );
  }
  if (rlsEnabledTables < FLOOR_RLS_ENABLED_TABLES) {
    throw new Error(
      `implausible measurement: ${rlsEnabledTables} tables with RLS enabled, floor is ` +
        `${FLOOR_RLS_ENABLED_TABLES} (measured 2026-08-06). Nothing was written. ` +
        'Investigate the database — do not lower the floor.'
    );
  }

  const path = writeArtefact({
    artefact: 'B1',
    slug: 'policies',
    target: target.name,
    targetSuffix: target.artefactSuffix ?? '',
    postgresVersion,
    phasePoint,
    rows,
    trailing: {
      supporting_counts: {
        policy_count: facts.policyCount,
        rls_enabled_tables: rlsEnabledTables,
      },
    },
  });

  return {
    path,
    rowCount: rows.length,
    detail: `postgres ${postgresVersion}, ${rlsEnabledTables} RLS-enabled tables`,
  };
}

// ── personas ───────────────────────────────────────────────────────────────

/**
 * ── The fourteen personas (phase decision D-11, widened by plan 43-08) ─────
 *
 * The full 4×3 role × status grid, plus `authenticated/no-profile`, plus
 * `anon`. The grid is the MINIMUM that can distinguish P1 from P3: they
 * disagree on exactly one pair, `organizer/pending`, who may insert a ticket
 * tier but not a venue. Drop a row of the grid and that asymmetry — the one
 * CAP-03 must reproduce rather than resolve — becomes invisible.
 *
 * `authenticated/no-profile` is not padding either. The middleware's
 * `?? "member"` default and the NULL-versus-false behaviour of
 * `is_admin_or_organizer()` for a missing profile row are both BEHAVIOUR, and
 * neither is observable with any other persona.
 *
 * A persona that does not exist on a target is recorded `absent`, never
 * omitted — an omitted row is indistinguishable from a row that agreed.
 *
 * ── WHY `'staff'` IS APPENDED AFTER `'member'`, AND NOT ANYWHERE ELSE ──────
 *
 * THE ORDER OF THESE TWO ARRAYS IS LOAD-BEARING. It is not a style choice and
 * it is not alphabetical by accident of taste.
 *
 * `scripts/container/seed.mjs:208-230` assigns each seeded persona an id of the
 * form `32000004-0000-4000-8000-<index padded>`, where `index` runs through the
 * NESTED LOOP `for role of PERSONA_ROLES { for status of PERSONA_STATUSES }`.
 * So index 1 — and therefore the LOWEST persona id in `public.profiles` — is
 * `PERSONA_ROLES[0]/PERSONA_STATUSES[0]`.
 *
 * The write matrix's `update` probe targets exactly that row: `resolveProbeKeys`
 * (`:1221-1231`) takes `min(pk)` and `buildProbeStatement` (`:1270-1271`) writes
 * `where (pk) = '<key>'`. Since plan 43-06 the container restores
 * `profiles_role_implies_approved` **NOT VALID**, and a NOT VALID CHECK refuses
 * every update to an already-violating row — even on a column the predicate does
 * not mention. If `min(id)` ever landed on a forbidden pair, every
 * `profiles × update` cell would stop being an RLS verdict and start being a
 * `23514`, and `rls-baseline-compare.mjs` would report them as changed cells
 * with no visible cause. That was **eleven** cells before this plan and is
 * **fourteen** after it.
 *
 * Which edits are safe, stated so the next person does not have to derive it:
 *
 *   - appending `'staff'` AFTER `'member'` — safe, index 1 stays
 *     `master/approved`, a compliant pair. This is what was done.
 *   - inserting `'staff'` BEFORE `'master'` — also safe, because
 *     `staff/approved` complies with the rule too.
 *   - reordering `PERSONA_STATUSES` — **NOT SAFE**. Move `'pending'` to the
 *     front and index 1 becomes `master/pending`, which the rule forbids, and
 *     the fourteen `profiles × update` cells flip.
 *
 * `seed.mjs:723-756` asserts this on every run rather than trusting the comment,
 * because a comment is not a guard.
 */
export const PERSONA_ROLES = ['master', 'organizer', 'member', 'staff'];
export const PERSONA_STATUSES = ['approved', 'pending', 'rejected'];
const PERSONA_ANON = 'anon';
const PERSONA_NO_PROFILE = 'authenticated/no-profile';
export const PERSONA_LABELS = [
  PERSONA_ANON,
  PERSONA_NO_PROFILE,
  ...PERSONA_ROLES.flatMap((role) => PERSONA_STATUSES.map((status) => `${role}/${status}`)),
].sort(compareStrings);

/**
 * Which personas a target is REQUIRED to offer. An absent persona that was
 * expected is exit 1, because a matrix quietly missing its most interesting
 * rows is the failure mode `verify-persona.mjs:225-233` refuses.
 *
 * Production holds 4 profiles — 1 master/approved and 3 member/approved. There
 * is no organizer and no non-approved row, which is precisely why plan 32-04
 * exists: only a seeded container can carry the other seven.
 *
 * The container is required to offer **all fourteen**. That is the reason it
 * exists: `organizer/pending` — the one pair where P1 and P3 disagree — cannot
 * be measured anywhere else, and a container that quietly failed to seed it
 * would produce a matrix indistinguishable from production's.
 *
 * **`production` is deliberately UNCHANGED by plan 43-08.** The `staff` role
 * exists in a committed migration that has not been applied, so production holds
 * no `staff` row and none of the three `staff/*` personas can resolve there.
 * Adding one here would make every production capture exit 1 for a reason that
 * is TRUE and is NOT a defect — the loudest possible way to teach the next
 * reader that this list is noise. It gains a `staff` entry on the day a `staff`
 * row genuinely exists in production, and not before.
 */
const EXPECTED_PERSONAS = {
  production: [PERSONA_ANON, PERSONA_NO_PROFILE, 'master/approved', 'member/approved'],
  container: [...PERSONA_LABELS],
};

/** A subject uuid is embedded in a SQL literal; refuse anything that is not one. */
const UUID_SHAPE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

const NIL_UUID = '00000000-0000-0000-0000-000000000000';

export function assertUuid(value, what) {
  if (!UUID_SHAPE.test(String(value ?? ''))) {
    throw new Error(`${what} is not a uuid — refusing to build SQL from it`);
  }
  return value;
}

/**
 * The twelve role × status personas, resolved to the LOWEST id in each cell so
 * the choice is deterministic across runs.
 *
 * **The uuid is used and discarded: only the label reaches the artefact.**
 * `.planning/` is tracked and this repository is PUBLIC (CLAUDE.md Guardrail
 * 5) — a member's uuid is a member identifier, and publishing one is
 * irreversible. Every resolved uuid is registered with `redact()` so it cannot
 * reach an error message either.
 *
 * **THE ROLE LIST HERE IS A SECOND SITE, AND IT DOES NOT DERIVE FROM
 * `PERSONA_ROLES`.** It is a SQL literal, so a role added to the array above and
 * forgotten here is seeded, is counted in the grid, and is then silently skipped
 * by `resolvePersonas` — the persona would come back `absent` on a target that
 * actually holds it, which reads as "nothing to measure" instead of "the
 * resolver has a typo". `'staff'` was added to BOTH in plan 43-08. The literal
 * is not interpolated on purpose: this string is embedded in SQL, and the file's
 * rule is that nothing reaches a statement without having been written down.
 */
const PERSONA_SQL = `
select role, status, (array_agg(id order by id))[1]::text as subject
  from public.profiles
 where role in ('master','organizer','member','staff')
   and status in ('approved','pending','rejected')
 group by role, status
`;

async function resolvePersonas(target) {
  const resolved = new Map();

  // `anon` needs no subject: it is impersonated by the claims role alone.
  resolved.set(PERSONA_ANON, { subject: null, dbRole: 'anon' });

  // `authenticated/no-profile` needs no data, so it is available on EVERY
  // target: a uuid that is asserted not to exist in `public.profiles`.
  let orphan = null;
  for (let attempt = 0; attempt < 3 && orphan === null; attempt += 1) {
    const candidate = crypto.randomUUID();
    const [row] = await target.query(
      `select count(*)::int as n from public.profiles where id = '${assertUuid(candidate, 'candidate')}'::uuid`,
      { readOnly: true }
    );
    if (row?.n === 0) orphan = candidate;
  }
  if (orphan === null) {
    throw new Error('could not generate a uuid absent from public.profiles in three attempts');
  }
  registerSecret(orphan);
  resolved.set(PERSONA_NO_PROFILE, { subject: orphan, dbRole: 'authenticated' });

  for (const row of await target.query(PERSONA_SQL, { readOnly: true })) {
    const label = `${row.role}/${row.status}`;
    if (!PERSONA_LABELS.includes(label)) continue;
    registerSecret(row.subject);
    resolved.set(label, { subject: assertUuid(row.subject, label), dbRole: 'authenticated' });
  }

  return resolved;
}

/**
 * One persona transaction: claims, role, the body, `rollback;`.
 *
 * The claims statement is written as `… is not null` on purpose. The Supabase
 * query endpoint returns the LAST result set that has rows, and a bare
 * `select set_config(...)` returns the claims JSON — which carries the subject
 * uuid. Reducing it to a boolean means the uuid cannot come back in a response
 * at all, so it cannot be written by a later reader who trusts the response.
 */
function personaTransaction({ subject, dbRole }, body) {
  const claims =
    subject === null ? '{"role":"anon"}' : `{"sub":"${assertUuid(subject, 'subject')}","role":"authenticated"}`;
  return [
    'begin;',
    `select set_config('request.jwt.claims', '${claims}', true) is not null as claims_set;`,
    `set local role ${dbRole};`,
    body,
    'rollback;',
  ].join('\n');
}

// ── the table set every persona artefact is measured over ──────────────────

/**
 * The RLS-enabled tables in `public`, with their primary-key columns.
 *
 * Read from `pg_catalog`, NOT from `information_schema`. Under
 * `read_only: true` the query endpoint runs as `supabase_read_only_user`, and
 * `information_schema.table_constraints` filters by privilege — it returns
 * ZERO rows for that user, so an `information_schema` key lookup would report
 * "no primary key" for all 20 tables. Measured, not assumed.
 */
const TABLE_SQL = `
select rel.relname as table_name,
       array_to_string(array_agg(att.attname order by k.ord), ',') as pk_columns
  from pg_constraint con
  join pg_class rel on rel.oid = con.conrelid
  join pg_namespace n on n.oid = rel.relnamespace
  cross join lateral unnest(con.conkey) with ordinality as k(attnum, ord)
  join pg_attribute att on att.attrelid = rel.oid and att.attnum = k.attnum
 where n.nspname = 'public' and con.contype = 'p' and rel.relkind = 'r' and rel.relrowsecurity
 group by rel.relname
`;

/** Every RLS-enabled table in `public`, whether or not it has a primary key. */
const RLS_TABLE_SQL = `
select c.relname as table_name
  from pg_class c join pg_namespace n on n.oid = c.relnamespace
 where n.nspname = 'public' and c.relkind = 'r' and c.relrowsecurity
`;

/** Keyed by target, for the same reason `factsByTarget` is. */
const tablesByTarget = new WeakMap();

export async function getTables(target) {
  if (!tablesByTarget.has(target)) {
    tablesByTarget.set(
      target,
      (async () => {
      const all = (await target.query(RLS_TABLE_SQL, { readOnly: true })).map((r) => r.table_name);
      const keyed = await target.query(TABLE_SQL, { readOnly: true });
      const byName = new Map(keyed.map((r) => [r.table_name, String(r.pk_columns).split(',')]));

      // A fingerprint without a stable key is not a fingerprint — it is a
      // number that happens to be the same. Refuse rather than pretend.
      const unkeyed = all.filter((name) => !byName.has(name)).sort(compareStrings);
      if (unkeyed.length) {
        throw new Error(
          `these RLS-enabled tables report no primary key: ${unkeyed.join(', ')}. ` +
            'A fingerprint needs a stable key. Nothing was written.'
        );
      }
      if (all.length < FLOOR_RLS_ENABLED_TABLES) {
        throw new Error(
          `implausible measurement: ${all.length} RLS-enabled tables, floor is ${FLOOR_RLS_ENABLED_TABLES} ` +
            '(measured 2026-08-06). Nothing was written. Investigate the database — do not lower the floor.'
        );
      }

      return all
        .sort(compareStrings)
        .map((name) => ({ table: name, pkColumns: byName.get(name) }));
      })()
    );
  }
  return tablesByTarget.get(target);
}

/** `id::text` — or, for a composite key, the columns joined by a separator. */
export function pkExpression(pkColumns) {
  return pkColumns.map((c) => `"${c}"::text`).join(` || '|' || `);
}

/**
 * All 20 row counts in one privileged read-only round trip.
 *
 * Read as the API's own role, NOT under a persona: this is the ground truth
 * the B3 rollback guarantee compares against, and a count filtered by a policy
 * would compare a policy against itself.
 */
async function readRowCounts(target, tables) {
  const sql = `select ${tables
    .map((t) => `(select count(*)::int from public."${t.table}") as "${t.table}"`)
    .join(',\n       ')}`;
  const [row] = await target.query(sql, { readOnly: true });
  const counts = {};
  for (const t of tables) counts[t.table] = row?.[t.table] ?? null;
  return counts;
}

// ── B2 — the persona read matrix ───────────────────────────────────────────

/**
 * For every persona and every RLS table: how many rows are visible, and a
 * fingerprint of WHICH rows they are.
 *
 * The count alone is too weak — a policy can change which rows it shows
 * without changing how many — so the row is `count` AND the md5 of the sorted
 * primary keys. The md5 is what makes the artefact publishable: it identifies
 * a row set without naming a single row.
 *
 * `vacuous` is the honesty flag, and what it means became sharper the moment a
 * SEEDED target existed. `count = 0` fingerprints as `d41d8cd9…`, the md5 of
 * the empty string, and Pitfall 3 names that fingerprint as the warning sign.
 * But a zero has two very different causes:
 *
 *   - **the table holds no rows at all** — then two captures agree for a reason
 *     that has nothing to do with any policy, and the cell proves nothing;
 *   - **the table holds rows and the persona sees none of them** — then the
 *     zero IS the policy, and it is one of the strongest cells in the matrix.
 *
 * On production the two coincide, because thirteen of the twenty tables are
 * empty. On the container they never coincide, because the seed guarantees
 * every table at least two rows. So `vacuous` is `count = 0` **and** the table
 * globally empty — the same rule D-19 already applies to an `ok:0` in B3.
 * Marking a real refusal as vacuous would discard exactly the evidence the
 * container exists to produce.
 *
 * The global counts are read once with the privileged role and carried in the
 * `table_row_counts` trailing key, so the judgement can be audited from the
 * artefact instead of taken on trust.
 *
 * Reads cannot write, so all 20 tables are batched into ONE transaction per
 * persona and the request count stays at one per persona. The one-probe-per-request
 * rule applies to B3, where a statement could write.
 */
function buildB2Body(tables) {
  return `${tables
    .map(
      (t) =>
        `select '${t.table}' as "table", count(*)::int as "count", ` +
        `md5(coalesce(string_agg(${pkExpression(t.pkColumns)}, ',' order by ${pkExpression(t.pkColumns)}), '')) as pk_md5 ` +
        `from public."${t.table}"`
    )
    .join('\nunion all\n')};`;
}

export async function captureB2(target, { phasePoint, targetName }) {
  const { postgresVersion } = await getFacts(target);
  const tables = await getTables(target);
  const personas = await resolvePersonas(target);

  const expected = EXPECTED_PERSONAS[targetName] ?? [];
  const missing = expected.filter((label) => !personas.has(label));
  if (missing.length) {
    throw new Error(
      `these personas were expected on target "${targetName}" and are absent: ${missing.join(', ')}. ` +
        'Nothing was written — a matrix missing the personas it exists to measure is not evidence.'
    );
  }

  // The privileged, unfiltered row count per table — the ground truth that
  // separates "the table was empty" from "the policy showed nothing".
  const globalCounts = await readRowCounts(target, tables);

  const body = buildB2Body(tables);
  const rows = [];

  for (const label of PERSONA_LABELS) {
    const persona = personas.get(label);
    if (!persona) {
      // Absent, never omitted. A null count is vacuous by definition: it
      // proves nothing, and must not be read as agreement.
      for (const t of tables) {
        rows.push({ persona: label, table: t.table, count: null, pk_md5: null, vacuous: true });
      }
      continue;
    }
    const measured = await target.query(personaTransaction(persona, body), { readOnly: false });
    const byTable = new Map(measured.map((r) => [r.table, r]));
    for (const t of tables) {
      const r = byTable.get(t.table);
      if (!r) throw new Error(`persona ${label} returned no row for table ${t.table} — the read is broken`);
      rows.push({
        persona: label,
        table: t.table,
        count: r.count,
        pk_md5: r.pk_md5,
        // A zero on a table that HOLDS rows is the policy refusing, and that is
        // evidence. Only a zero on a globally empty table proves nothing.
        vacuous: r.count === 0 && (globalCounts[t.table] ?? 0) === 0,
      });
    }
    say(`      ${label}: ${tables.length} tables read`);
  }

  const sorted = sortRows(rows, ['persona', 'table']);

  // The whole-matrix refusal. If every cell is vacuous the capture measured
  // nothing, and a later comparison would pass for the worst possible reason.
  if (sorted.every((r) => r.vacuous)) {
    throw new Error(
      'implausible measurement: every cell of the read matrix is vacuous. Nothing was written. ' +
        'Either the impersonation is not taking effect or the target holds no data.'
    );
  }

  const path = writeArtefact({
    artefact: 'B2',
    slug: 'reads',
    target: target.name,
    targetSuffix: target.artefactSuffix ?? '',
    postgresVersion,
    phasePoint,
    rows: sorted,
    trailing: {
      personas: PERSONA_LABELS.map((label) => ({
        persona: label,
        resolved: personas.has(label),
      })),
      // Why each vacuous cell is vacuous, auditable from the file itself.
      table_row_counts: Object.fromEntries(
        [...tables].map((t) => t.table).sort(compareStrings).map((name) => [name, globalCounts[name] ?? null])
      ),
    },
  });

  const present = PERSONA_LABELS.filter((label) => personas.has(label)).length;
  return {
    path,
    rowCount: sorted.length,
    detail: `${present}/${PERSONA_LABELS.length} personas resolved, ${tables.length} tables, ${
      sorted.filter((r) => r.vacuous).length
    } vacuous cells`,
  };
}

// ── B3 — the persona write matrix ──────────────────────────────────────────

/**
 * ── The payload table ─────────────────────────────────────────────────────
 *
 * B3 is the ONLY artefact that can baseline a `WITH CHECK` clause: no read
 * ever touches one, and four of this phase's five inherited predicates (P3 on
 * `artists`/`venues`, P5 on `event_media`/`rsvps`) live there. Without it the
 * phase cannot tell a preserved rule from a widened one on those four tables.
 *
 * One entry per RLS-enabled table: the `INSERT` column list with a minimal
 * valid value expression, and the column an `UPDATE` sets to its own current
 * value. **The harness refuses to run B3 if any enumerated table has no entry**
 * — `verify-persona.mjs`'s refusal pattern applied to coverage, because a write
 * matrix that silently skips a table is a matrix that cannot fail.
 *
 * Two conventions carry the meaning:
 *
 *   - `auth.uid()` is used for every column that names the SUBJECT — `user_id`,
 *     `added_by`, `uploaded_by`, `requested_by`, `operator_id`. The ownership
 *     predicates (`auth.uid() = user_id`) are what those columns exist for, and
 *     a fixed literal would turn every persona's probe into a refusal for the
 *     wrong reason.
 *   - `{{table}}` is a foreign key, substituted with the lowest existing id of
 *     the referenced table, resolved ONCE with a privileged read. Resolving it
 *     inside the persona transaction — as the plan first proposed — would run
 *     the sub-select under that persona's READ policies, so `master` and
 *     `member` would be probing different rows and the matrix would stop being
 *     a matrix. Where the referenced table is empty the nil uuid is used and
 *     the insert fails `23503`, which D-19 records as inconclusive rather than
 *     hiding.
 *
 * **No `UPDATE` column here is a monotone guard.** `venue_reveal_email_sent`,
 * `rsvps.venue_reveal_sent`, `tickets.venue_reveal_sent` and every payment
 * status column are deliberately absent: `meta-gates.md` allows a change to
 * make a one-way switch harder to trip, never easier, and a probe has no
 * business near one even inside a rolled-back transaction.
 */
export const PROBE_TEXT = `'rls-baseline-probe'`;

/**
 * The instant a probe's — or a seeded row's — permission window closes.
 *
 * A FIXED LITERAL, AND NEVER `now()`, for two reasons that are different from
 * each other and both load-bearing (plan 35-06 task 1):
 *
 *   1. **`now()` is the clock, and a probe that depends on the clock is not the
 *      same probe twice.** `door_scan_events.scanned_at` may take `now()`
 *      because *when the scan happened* is genuinely the moment of the write.
 *      *When a permission ends* is not: it is a boundary the writer computes
 *      from the night (`20260809000000_party_assignments.sql`, section 3d), and
 *      a probe that recomputes it per run has stopped being comparable between
 *      two captures.
 *   2. **`now()` made every seeded assignment expired on arrival**, and that is
 *      the defect this constant actually fixes. `seed.mjs` materialises this
 *      same payload into real rows, so `ends_at = now()` produced two
 *      assignments whose window had already closed at the instant they were
 *      written. The resolver's ARM 2 tests `now() < pa.ends_at`
 *      (`20260809001000_assignment_resolver.sql:355`), so those rows could never
 *      grant anything — a seeded assignment that cannot resolve is a row the
 *      third axis cannot be measured against.
 *
 * The value is far enough out that no run of this harness will reach it, and it
 * is written as an absolute UTC instant rather than a local one: this file's
 * comparisons must not move with the machine's zone. The night's REAL boundary
 * is computed by `public.party_end_instant(date, time)` and belongs to the
 * writer, not here — nothing in this harness is entitled to invent one.
 */
export const PROBE_FUTURE_INSTANT = `'2099-12-31 23:00:00+00'::timestamptz`;

export const PROBE_PAYLOADS = {
  // A name and a slug, both unique; the sentinel collides with no real row.
  artists: { insert: { columns: ['name', 'slug'], values: [PROBE_TEXT, PROBE_TEXT] }, update: 'bio' },
  // A check-in belongs to an event and to the subject checking in.
  attendances: {
    insert: { columns: ['event_id', 'user_id'], values: ['{{events}}', 'auth.uid()'] },
    update: 'checked_in_at',
  },
  // Both columns are foreign keys and together the primary key; production
  // holds no discount code, so this one is expected to fail 23503.
  discount_code_tiers: {
    insert: { columns: ['discount_code_id', 'tier_id'], values: ['{{discount_codes}}', '{{ticket_tiers}}'] },
    update: 'tier_id',
  },
  // A code hangs off a party; type and amount are constrained by CHECKs.
  discount_codes: {
    insert: {
      columns: ['party_id', 'code', 'discount_type', 'discount_amount'],
      values: ['{{event_parties}}', PROBE_TEXT, `'fixed'`, '1'],
    },
    update: 'code',
  },
  // Every text column is CHECK-constrained; these are the allowed literals.
  door_scan_events: {
    insert: {
      columns: [
        'party_id',
        'event_id',
        'subject_type',
        'outcome',
        'scanned_at',
        'operator_id',
        'device_id',
        'source',
      ],
      values: [
        '{{event_parties}}',
        '{{events}}',
        `'membership'`,
        `'not_valid'`,
        'now()',
        'auth.uid()',
        PROBE_TEXT,
        `'online'`,
      ],
    },
    update: 'device_id',
  },
  // A menu line: an event, a name, a non-negative price.
  drink_items: {
    insert: { columns: ['event_id', 'name', 'price'], values: ['{{events}}', PROBE_TEXT, '0'] },
    update: 'name',
  },
  // `items` is jsonb and NOT NULL; an empty array is the minimal valid value.
  drink_orders: {
    insert: {
      columns: ['event_id', 'sumup_checkout_id', 'total_amount', 'items'],
      values: ['{{events}}', PROBE_TEXT, '0', `'[]'::jsonb`],
    },
    update: 'sumup_checkout_id',
  },
  // A token belongs to an order; `token` and `status` have defaults.
  drink_tokens: {
    insert: {
      columns: ['order_id', 'event_id', 'drink_name', 'price'],
      values: ['{{drink_orders}}', '{{events}}', PROBE_TEXT, '0'],
    },
    update: 'drink_name',
  },
  // `type` is CHECK-constrained to photo|video; `uploaded_by` is the subject —
  // this is the P5 (`status = approved`) surface, so the owner column matters.
  //
  // ── WHY `event_id` IS NOT `{{events}}` ANY MORE (plan 35-18) ──────────────
  //
  // Since `20260809004500_event_media_party_id.sql` the row must name a NIGHT,
  // and `event_media_insert_member` demands that the night belong to THIS
  // event. The two placeholders cannot express that: `{{events}}` and
  // `{{event_parties}}` are resolved INDEPENDENTLY — one privileged
  // `min(id::text)` per table, see `resolveProbeReferences` — so nothing
  // correlates them. With the old entry the probe would compose an incoherent
  // pair on any database where those two minima disagree, every insert cell
  // would turn into a refusal FOR THE WRONG REASON, and a matrix that refuses
  // for the wrong reason is worse than one that does not run: it looks like a
  // result.
  //
  // The correction does NOT touch the placeholder machinery. `values` are SQL
  // expressions — `door_scan_events` already uses `now()` and `auth.uid()` —
  // so the pair is made coherent INSIDE the payload: `party_id` takes the
  // placeholder, and `event_id` is derived from it.
  //
  // ── AND WHY THE DERIVATION IS A FUNCTION AND NOT A SUB-SELECT ─────────────
  //
  // A plain sub-select reading `public.event_parties` for that id
  // would run under the PERSONA's read policies:
  // `event_parties_select_published` only shows a night whose event is
  // published, and `event_parties_select_admin` shows every night to
  // `staff.manage`. The same expression would then yield the event id for a
  // master and NULL for a member — a `23502` for one persona and a real probe
  // for another. `private.party_event_id(uuid)` is `SECURITY DEFINER` (and
  // granted to `authenticated` and `anon`) precisely so the value is the SAME
  // FOR EVERY PERSONA, which is the invariant that makes the matrix a matrix.
  //
  // THE DEGENERATE CASE, stated rather than met: if `event_parties` were empty
  // the placeholder is the nil uuid, the function returns NULL, and the insert
  // fails `23502` — which D-19 records as INCONCLUSIVE, not as a refusal. That
  // is the behaviour already provided for, not a new one.
  //
  // NOTE ON THE QUOTES, because getting them wrong produces a syntax error and
  // not a wrong measurement: `substituteReferences` expands `{{table}}` to
  // `'<uuid>'::uuid` — the literal quotes AND the cast are part of the
  // substitution. So the placeholder is written BARE here, exactly as every
  // other entry in this table writes it.
  event_media: {
    insert: {
      columns: ['event_id', 'party_id', 'url', 'type', 'uploaded_by'],
      values: [
        '(select private.party_event_id({{event_parties}}))',
        '{{event_parties}}',
        `'https://example.invalid/rls-baseline-probe'`,
        `'photo'`,
        'auth.uid()',
      ],
    },
    update: 'caption',
  },
  // A party needs its event, a title, a start time — and, since
  // `20260810120000_formats_and_series.sql`, a FORMAT and a SERIES, both
  // `NOT NULL`. `venue_secret` defaults to false, so nothing here creates a row
  // that could later be revealed.
  //
  // (The sentence that stood here until plan 36-04 said a party needs its event,
  // a title and a start time. It became false the moment section 9 of that
  // migration ran, and leaving it is how the next person learns the wrong
  // contract — so it was rewritten rather than appended to.)
  //
  // ── WHY THIS ROW IS THE ONE `36-VALIDATION.md` WARNS ABOUT ────────────────
  //
  // With three columns and two of them `NOT NULL`, the old payload would fail
  // `23502` for EVERY persona, and `baseline:compare` would report a *permission
  // movement* on fourteen cells that had simply stopped measuring. That is a
  // green which means the opposite of what it looks like, and everything below
  // exists to keep this row measuring the INSERT POLICY and nothing else.
  //
  // ── WHY `format_id` IS NOT AN INDEPENDENT `{{formats}}` ───────────────────
  //
  // `event_parties_series_format_fk` is `(series_id, format_id) REFERENCES
  // public.party_series (id, format_id)` (`20260810120000:871-885`): the two
  // columns are ONE fact. A format resolved independently of the series
  // contradicts it on any database where those two minima disagree —
  // `resolveProbeReferences` resolves each placeholder with its own
  // `min(id::text)` and nothing correlates them — and every cell of this row
  // would then refuse `23503`. A refusal for the wrong reason is exactly as
  // fatal to the measurement as the `23502` this payload was widened to avoid,
  // and harder to notice, because it looks like a policy decision.
  //
  // `{{party_series_format}}` is the format OF THAT SERIES, resolved once on the
  // privileged connection. See `DERIVED_PROBE_REFERENCES` below for why it is
  // not a scalar sub-select — that is the same trap `event_media` fell into
  // above, and here it would cost four cells that the `pre-36` capture records
  // as `ok:1`.
  //
  // ── AND WHY `number` IS A SUB-SELECT, WHICH IS SAFE HERE AND ONLY HERE ────
  //
  // `event_parties_format_series_number_unique` refuses a repeated triple, so a
  // CONSTANT would collide with a seeded night whenever `{{party_series}}`
  // resolved to a series that already had one — and the catalogue rows the
  // migration inserts carry `gen_random_uuid()` ids, so WHICH series is lowest
  // differs from run to run. A cell that is `ok:1` in one capture and `23505` in
  // the next is not a measurement.
  //
  // `max(number) + 1` reads `public.event_parties` under the persona, and unlike
  // the `party_series` read it would replace, that is harmless — because the
  // personas whose computed value can matter are exactly the six the INSERT
  // policy admits, and `event_parties_insert_admin` and
  // `event_parties_select_admin` are THE SAME PREDICATE
  // (`20260225150000_party_architecture.sql:40-45`). Every persona that can
  // insert sees every night and computes the true next number; the eight the
  // policy refuses are refused `42501` before a unique index is ever consulted,
  // since index insertion happens after the RLS `WITH CHECK` and not before it.
  //
  // `coalesce(…, 0) + 1` is also what satisfies `event_parties_number_positive`
  // (`number > 0`) on an empty series.
  event_parties: {
    insert: {
      columns: ['event_id', 'title', 'time', 'format_id', 'series_id', 'number'],
      values: [
        '{{events}}',
        PROBE_TEXT,
        `'18:00'::time`,
        '{{party_series_format}}',
        '{{party_series}}',
        '(select coalesce(max(ep."number"), 0) + 1 from public.event_parties ep where ep."series_id" = {{party_series}})',
      ],
    },
    update: 'description',
  },
  // `slug` is unique; `is_published` defaults to false, so the probe row would
  // not be publicly visible even if it survived — and it does not.
  events: {
    insert: { columns: ['slug', 'title', 'date'], values: [PROBE_TEXT, PROBE_TEXT, 'current_date'] },
    update: 'description',
  },
  // ── THE CATALOGUE OF IDENTITIES (plan 36-04) ───────────────────────────────
  //
  // `slug`, `name` and `code` are three separate axes and all three take the
  // sentinel, which `materialise` rewrites to `seed-formats-<n>` per seeded row
  // — so `formats_slug_unique` and `formats_code_unique` hold for BOTH rows the
  // seed plants, without this payload having to know how many rows that is.
  //
  // THE COLOUR IS THE ONE THAT NEEDS THOUGHT, and a constant would break the
  // SEED rather than the probe. `formats_color_active_unique` is a PARTIAL
  // unique index over `color` where `retired_at IS NULL`
  // (`20260810120000_formats_and_series.sql:183-185`), and both seeded rows are
  // active, so a hard-coded `'#123456'` would refuse row 2 with `23505` and the
  // seed would stop before a single night existed. The value is therefore
  // DERIVED FROM THE SENTINEL — six hex characters of its md5 — which differs
  // per seeded row, is deterministic (two identical runs must build the same
  // database, which is what makes a diff between two captures mean anything),
  // and satisfies `formats_color_hex_check` (`^#[0-9A-Fa-f]{6}$`) because md5
  // renders lowercase hex. No random, for the same reason the seed silences the
  // membership-code trigger.
  //
  // `listed` IS DELIBERATELY NOT SET and defaults to false. A probe row must
  // never be one the anonymous key could read, and `formats_select_listed` is
  // `USING (listed = true)`; the seeded rows inherit the same default, which is
  // also what makes the `formats` READ cell discriminate — the four listed
  // catalogue rows for everyone, and the unlisted ones only for whoever holds
  // `catalogue.manage`.
  //
  // This table has RLS on and **no INSERT, UPDATE or DELETE policy at all**,
  // deliberately (`20260810120000_formats_and_series.sql:452-476`): writes
  // arrive with the service client. So every insert cell of this row is expected
  // to refuse `42501` for EVERY persona including `master/approved` — the same
  // shape as `party_credits`, `party_assignments`, `membership_acts`, `profiles`
  // and `tickets`.
  formats: {
    insert: {
      columns: ['slug', 'name', 'code', 'color'],
      values: [PROBE_TEXT, PROBE_TEXT, PROBE_TEXT, `'#' || substr(md5(${PROBE_TEXT}), 1, 6)`],
    },
    update: 'name',
  },
  // `added_by` references `profiles` and is NOT NULL: the subject adds the guest.
  guest_list_entries: {
    insert: {
      columns: ['event_id', 'first_name', 'last_name', 'added_by'],
      values: ['{{events}}', PROBE_TEXT, PROBE_TEXT, 'auth.uid()'],
    },
    update: 'error_message',
  },
  // The register of acts on a member's role and status (plan 43-07). It has RLS
  // on and **no INSERT, UPDATE or DELETE policy at all**, deliberately
  // (`20260808002000_membership_register.sql`, section 3): the only writer is
  // `public.record_membership_act`, which runs as its definer. So every cell of
  // this row of the matrix is expected to refuse `42501` for EVERY persona
  // including `master/approved` — the same shape as `profiles` and `tickets`,
  // and it is the assertion that proves "append-only by construction" rather
  // than merely stating it.
  //
  // WHY `actor_kind = 'system'` AND NO `actor_id`, where the convention above
  // says a subject column takes `auth.uid()`. There is no ownership predicate
  // on this table for `auth.uid()` to satisfy, and the table-level CHECK
  // `membership_acts_actor_attributed` refuses `kind = 'user'` with a null
  // actor. Postgres evaluates table constraints BEFORE the RLS `WITH CHECK`, so
  // a payload carrying `auth.uid()` would report `23514` instead of `42501` for
  // every persona whose `auth.uid()` is null — a refusal for the wrong reason,
  // which is the one failure this payload table's header warns about. A `system`
  // act is a legitimate row shape and satisfies the constraint unconditionally.
  //
  // `subject_label` takes a code-shaped sentinel and not the generic probe
  // string, because that column is documented as a membership code and never an
  // address; same sentinel shape as the `profiles` payload's `membership_code`.
  //
  // `note` is the update column: it is the only column here that is neither
  // evidence of what was true then nor part of the attribution, so a probe
  // touching it cannot be read as an attempt to rewrite an act.
  membership_acts: {
    insert: {
      columns: ['act', 'subject_label', 'actor_kind'],
      values: [`'created'`, `'RSN-PROBE00'`, `'system'`],
    },
    update: 'note',
  },
  // One unique column. `.invalid` is the reserved TLD — it can reach no inbox.
  newsletter_subscribers: {
    insert: { columns: ['email'], values: [`'rls-baseline-probe@example.invalid'`] },
    update: 'unsubscribed_at',
  },
  // Per-night assignments (plan 35-02). RLS on, and **no INSERT, UPDATE or
  // DELETE policy at all**, deliberately (`20260809000000_party_assignments.sql`,
  // section 3f): the only writer is the `SECURITY DEFINER` function of plan
  // 35-04. So every cell of this row is expected to refuse `42501` for EVERY
  // persona including `master/approved` — the same shape as `membership_acts`,
  // `profiles` and `tickets`.
  //
  // WHICH OF THE TWO SUBJECT COLUMNS TAKES `auth.uid()` — the question
  // `35-PATTERNS.md` § 13 raised and the plan did not close, answered here.
  //
  // This table has TWO columns naming a subject, `user_id` and `assigned_by`,
  // and `party_assignments_no_self_grant` refuses the row when they are equal
  // (ASSIGN-04). The convention above — `auth.uid()` for every subject column —
  // cannot be applied to both: it would report `23514` for every persona, which
  // is a refusal for the WRONG REASON and the one failure this payload table's
  // header warns about. Table constraints are evaluated before the RLS
  // `WITH CHECK`, so a constraint violation hides the policy decision entirely.
  //
  // `user_id` takes `{{profiles}}`, not `auth.uid()`, and that is deliberate:
  // there is no ownership predicate on a WRITE here for `auth.uid()` to satisfy.
  // The only policy that reads it is a SELECT policy and no INSERT can reach it,
  // because this table has no write policy at all.
  //
  // `assigned_by` is the awkward one, because the SEED and the PROBE want
  // opposite things from it. The seed inserts real rows as the superuser, with
  // RLS bypassed, so it needs a value that satisfies the foreign key to
  // `auth.users`; the probe needs a value that is NON-NULL for every persona
  // (including `anon`, whose `auth.uid()` is null → `23502`) and NEVER equal to
  // `user_id` (including `master/approved`, which IS the lowest profile id that
  // `{{profiles}}` resolves to in a probe → `23514`).
  //
  //   coalesce(nullif(auth.uid(), {{profiles}}), '35000002-…'::uuid)
  //
  // does both. In the seed `auth.uid()` becomes the owning persona's id and
  // `{{profiles}}` the row's referenced persona — never the same one — so the
  // fallback is not reached and the foreign key is satisfied by a real account.
  // In the probe the fallback catches exactly the two personas that would
  // otherwise refuse for the wrong reason, with an id in the phase-35 identity
  // space (`scripts/container/seed.mjs:241-247`: first group `35000002` — phase
  // 35, plan 02 — an id no real account holds). It never has to satisfy the
  // foreign key there, because RLS refuses before the key is checked — the same
  // property the `profiles` payload relies on with its `gen_random_uuid()` id.
  //
  // If the fallback were ever reached in the seed, the run fails LOUDLY with
  // `23503` naming the key. That is the acceptable direction: a refused run, not
  // a green matrix built on a row that is not what it claims to be.
  //
  // `assignee_role` is `'master'` because `party_assignments_live_role_present`
  // requires a LIVE row to carry a staff role, and both rows the seed inserts
  // point at `PERSONA_ROLES[0]` — which `scripts/container/seed.mjs:741-749`
  // pins as `master` and warns against reordering. Seeding LIVE rows rather than
  // revoked ones is the point: it is the only place in this harness where the
  // composite key `(user_id, assignee_role) → public.profiles (id, role)` is
  // actually exercised, so a legitimate assignment being insertable is measured
  // instead of assumed.
  //
  // `granted_at` is the UPDATE column: the three columns that decide whether an
  // assignment is LIVE — `ends_at`, `revoked_at`, `revoked_by` — are deliberately
  // absent from the update probe for the same reason the monotone guards are
  // absent from every other payload here. A probe has no business near a column
  // that widens a door permission, even inside a transaction that rolls back.
  //
  // **AND `revoked_at` IS NOT ITSELF A MONOTONE GUARD**, which is worth saying
  // because the next reader will assume it is. `meta-gates.md` names exactly
  // three one-way switches — `venue_reveal_sent`, a payment status reaching
  // `completed`, and a format's series numbering — and none of them is this. A
  // revocation can be followed by a fresh grant: `party_assignments_live_unique`
  // is PARTIAL on `revoked_at IS NULL` (`20260809000000:514-516`) precisely so
  // re-granting after a revocation is not refused by a rule about the past. It is
  // kept out of the update probe because it WIDENS a door permission in one
  // direction, not because it cannot be undone.
  //
  // `ends_at` takes `PROBE_FUTURE_INSTANT` and NEVER `now()` — see that constant.
  // In the probe it makes the row a legitimate future-dated grant instead of one
  // that has already expired; in the seed, which materialises this same payload,
  // it is the difference between two rows the resolver can grant on and two rows
  // that could never resolve at all.
  party_assignments: {
    insert: {
      columns: ['party_id', 'user_id', 'capability', 'assignee_role', 'assigned_by', 'ends_at'],
      values: [
        '{{event_parties}}',
        '{{profiles}}',
        `'door.operate'`,
        `'master'`,
        `coalesce(nullif(auth.uid(), {{profiles}}), '35000002-0000-4000-8000-000000000001'::uuid)`,
        PROBE_FUTURE_INSTANT,
      ],
    },
    update: 'granted_at',
  },
  // Public credits for a night (plan 35-05). RLS on, and **no INSERT, UPDATE or
  // DELETE policy at all**, deliberately (`20260809003000_party_credits.sql`,
  // section 3): writes arrive from the catalogue surface with the service
  // client. So every cell of this row is expected to refuse `42501` for EVERY
  // persona including `master/approved` — the same shape as `party_assignments`,
  // `membership_acts`, `profiles` and `tickets`.
  //
  // NO COLUMN HERE TAKES `auth.uid()`, and that is not an oversight in the
  // convention above: this table HAS no column naming an account. That absence
  // is the guarantee ASSIGN-06 is made of, so a payload that invented one would
  // be probing a table that does not exist. `created_by` is the account that
  // INSERTED the row, the seed fills it as the owner column
  // (`scripts/container/seed.mjs:515-522`), and no probe sets it because a probe
  // is not trying to own anything — the same treatment `artists` and `venues`
  // already get.
  //
  // `{{artists}}` is why `artists` joins the referenceable list below. It has to
  // resolve to a REAL row: `artist_id` is `NOT NULL REFERENCES public.artists`,
  // so the nil uuid would make the insert fail `23503` — a refusal for the wrong
  // reason, which D-19 would then record as inconclusive on all fourteen
  // personas, and the row of the matrix would prove nothing about the policy.
  //
  // `sort_order` is the update column. The three columns that decide WHOSE
  // attribution a night carries — `party_id`, `artist_id`, `credit` — are
  // deliberately absent from the update probe: a probe has no business rewriting
  // who played a night, even inside a transaction that rolls back, for the same
  // reason no monotone guard appears in any payload here.
  party_credits: {
    insert: {
      columns: ['party_id', 'artist_id', 'credit'],
      values: ['{{event_parties}}', '{{artists}}', `'dj'`],
    },
    update: 'sort_order',
  },
  // ── WHICH RUN of a format a night belongs to (plan 36-04) ─────────────────
  //
  // `format_id` takes the placeholder BARE, per the quoting note on
  // `event_media` above. `{{formats}}` is why `formats` joins the referenceable
  // list below: `party_series.format_id` is `NOT NULL REFERENCES public.formats`,
  // so the nil uuid would make the insert fail `23503` on every persona and
  // measure the foreign key instead of the policy — the same sentence the
  // `artists` entry earned in plan 35-05.
  //
  // `party_series_format_code_unique` is `(format_id, code)` and the code
  // carries the sentinel, so the two seeded rows differ there even if they were
  // to share a format — which they do not: row n points at `formats` row n.
  //
  // Like `public.formats`, this table has RLS on and **no write policy at all**
  // (`20260810120000_formats_and_series.sql:452-476`), so every insert cell of
  // this row is expected to refuse `42501` for EVERY persona. What is NOT
  // expected to be uniform is the READ cell: this table is readable only
  // through `catalogue.manage` or through a PUBLISHED night, and the container
  // publishes no event — so the read row is a gate that answers for two personas
  // and refuses twelve, which is the whole point of section 4b of that migration.
  party_series: {
    insert: {
      columns: ['format_id', 'name', 'code'],
      values: ['{{formats}}', PROBE_TEXT, PROBE_TEXT],
    },
    update: 'name',
  },
  // A checkout the subject started, against an existing tier.
  pending_purchases: {
    insert: {
      columns: ['event_id', 'tier_id', 'user_id', 'sumup_checkout_id'],
      values: ['{{events}}', '{{ticket_tiers}}', 'auth.uid()', PROBE_TEXT],
    },
    update: 'error_message',
  },
  // `id` references auth.users, so a fresh uuid can never satisfy the FK — but
  // no INSERT policy exists on `profiles` at all, so RLS refuses first (42501)
  // and the cell is conclusive. `full_name` is the update column deliberately:
  // `role` and `status` are the privilege-escalation surface and belong to
  // CAP-06's dedicated probe, not to a generic matrix cell.
  profiles: {
    insert: {
      columns: ['id', 'email', 'full_name', 'membership_code'],
      values: ['gen_random_uuid()', `'rls-baseline-probe@example.invalid'`, PROBE_TEXT, `'RSN-PROBE00'`],
    },
    update: 'full_name',
  },
  // The P5 surface: `rsvps_insert_approved` needs `auth.uid() = user_id` AND
  // status approved, so the subject column must be `auth.uid()` or the cell
  // would refuse for the wrong reason.
  rsvps: {
    insert: {
      columns: ['event_id', 'user_id', 'party_id'],
      values: ['{{events}}', 'auth.uid()', '{{event_parties}}'],
    },
    update: 'reminder_sent',
  },
  // `requested_by` is the subject; `amount` is NOT NULL.
  ticket_refunds: {
    insert: { columns: ['requested_by', 'amount'], values: ['auth.uid()', '0'] },
    update: 'admin_note',
  },
  // A tier needs an event, a name and a non-negative price.
  ticket_tiers: {
    insert: { columns: ['event_id', 'name', 'price'], values: ['{{events}}', PROBE_TEXT, '0'] },
    update: 'name',
  },
  // No INSERT policy exists on `tickets` either — tickets are minted by
  // `reserve_ticket()`, a SECURITY DEFINER function — so every persona refuses.
  tickets: {
    insert: {
      columns: ['event_id', 'user_id', 'amount_paid'],
      values: ['{{events}}', 'auth.uid()', '0'],
    },
    update: 'sumup_transaction_code',
  },
  // The named evidence cell: member → 42501, master → ok:1.
  venues: { insert: { columns: ['name', 'slug'], values: [PROBE_TEXT, PROBE_TEXT] }, update: 'bio' },
};

/**
 * The tables a `{{placeholder}}` may point at.
 *
 * `artists` was added by plan 35-05 for `party_credits.artist_id`, which is
 * `NOT NULL` against it: without a real id there, the probe would fail `23503`
 * on every persona and measure the foreign key instead of the policy.
 *
 * `formats` was added by plan 36-04 for `party_series.format_id`, and
 * `party_series` for `event_parties.series_id`. Both are `NOT NULL` against
 * their table since `20260810120000_formats_and_series.sql`, and both earn their
 * place for exactly the reason `artists` did: without a real id the row measures
 * a key instead of a policy.
 */
export const PROBE_REFERENCE_TABLES = [
  'artists',
  'discount_codes',
  'drink_orders',
  'event_parties',
  'events',
  'formats',
  'party_series',
  'profiles',
  'ticket_tiers',
];

/**
 * ── A SECOND KIND OF REFERENCE: a COLUMN of the row another one picked ────────
 *
 * `{{table}}` above resolves to the lowest id of a table, and that is enough
 * while every foreign key on a probe row is INDEPENDENT of every other. Plan
 * 36-04 introduced the first row where two of them are not:
 * `event_parties_series_format_fk` demands that `(series_id, format_id)` name a
 * PAIR that really exists in `public.party_series`, so a format resolved as "the
 * lowest format" contradicts "the lowest series" on any database where those two
 * minima disagree — and `23503` on every persona is a row that has stopped
 * measuring the policy, which is the failure `36-VALIDATION.md` names.
 *
 * ── WHY THIS IS NOT A SCALAR SUB-SELECT IN THE PAYLOAD ───────────────────────
 *
 * `(select format_id from public.party_series where id = …)` is the shorter
 * answer and the wrong one, and the reason is measurable rather than stylistic:
 * that sub-select runs under the PERSONA'S read policies, and
 * `public.party_series` is readable only through
 * `party_series_select_catalogue_manage` or through a published night.
 * `catalogue.manage` carries `requires_approved = true`
 * (`20260807000000_capability_model.sql:399-400`) while INSERT on
 * `public.event_parties` does not — the `pre-36` capture records `ok:1` for
 * `master/pending`, `master/rejected`, `organizer/pending` and
 * `organizer/rejected`. Those four would read NULL, insert NULL into a `NOT
 * NULL` column and report `23502`, which D-19 records as INCONCLUSIVE. Four
 * measured grants would become four cells that measure nothing, and the
 * comparator would call it a movement.
 *
 * `event_media` met the same problem in plan 35-18 and solved it with
 * `private.party_event_id(uuid)`, a `SECURITY DEFINER` function that answers the
 * SAME VALUE FOR EVERY PERSONA. There is no such function for a series, and a
 * harness does not get to add one to the schema. Resolving the value HERE —
 * once, on the privileged connection, in the same breath as every other
 * reference — buys the same invariant without touching the database.
 *
 * THE DEGENERATE CASE, stated rather than met: if the base reference is the nil
 * uuid (its table is empty) the derived value is the nil uuid too, and the
 * insert fails `23503` — which D-19 records as inconclusive, not as a refusal.
 */
const DERIVED_PROBE_REFERENCES = [
  {
    name: 'party_series_format',
    from: 'party_series',
    column: 'format_id',
    why: "a night's format must be the format of its own series",
  },
];

const PROBE_VERBS = ['delete', 'insert', 'update'];

/** The label a constraint probe carries; it is a connection, never a person. */
const PRIVILEGED_LABEL = 'privileged/service-path';

/**
 * ── The constraint probes — a SECOND kind of probe, and the reason it is second
 *
 * WHY THIS IS NOT A CELL OF THE MATRIX ABOVE. The write matrix answers ONE
 * question — *who may write a row* — and it answers it under a persona, so RLS
 * decides. This answers a DIFFERENT question — *does the database refuse a
 * dishonest row* — and the answer must not depend on RLS at all. Folding the two
 * into one cell would give a matrix that is red for the right reason and
 * unreadable for the wrong one: the reader cannot tell a policy refusal from a
 * constraint refusal by looking at a colour.
 *
 * AND ON `party_assignments` THE TWO CANNOT SHARE A CELL EVEN IN PRINCIPLE. That
 * table has RLS on and **no write policy at all** (`20260809000000`, section 3f),
 * so every persona is refused `42501` before a single constraint is evaluated.
 * A persona-level self-grant probe would therefore report `42501` on all fourteen
 * cells and measure NOTHING about ASSIGN-04 — a green that means "we never got
 * there". So the probe runs on the PRIVILEGED connection, which is not a
 * shortcut: it is the path the rule actually has to hold on. The migration says
 * it in one line (`20260809000000:302-304`): *«the service client bypasses every
 * RLS policy and bypasses no constraint»*, and that is exactly why ASSIGN-04 is a
 * `CHECK` and not a policy. This probe exercises the same bypass.
 *
 * WHAT MAKES THE ROW MEASURE ONE RULE AND NOT ANY OTHER. Every other condition
 * on the row is deliberately SATISFIED: `capability` is an assignable key,
 * `assignee_role` is `'master'` and matches the role of the profile
 * `{{profiles}}` resolves to (so the composite key would hold if it were
 * reached), both revocation columns are null (so `revocation_paired` and
 * `live_role_present` hold), and `ends_at` is a real future instant. The ONLY
 * thing wrong with it is that `assigned_by` equals `user_id`. If a run reports
 * `23514` from a DIFFERENT constraint, the row has drifted and the probe is
 * measuring something else — which is why the constraint's NAME is asserted and
 * not only the SQLSTATE.
 *
 * ── WHY `door.supervise` AND NOT `door.operate`, MEASURED ────────────────────
 *
 * The obvious key is `door.operate`, and it is wrong here. The seed materialises
 * the ordinary `party_assignments` payload into two LIVE rows, and row 1 is
 * `door.operate` for the very account `{{profiles}}` resolves to on the very
 * night `{{event_parties}}` resolves to. A probe carrying `door.operate` is
 * therefore ALSO a duplicate against `party_assignments_live_unique`
 * (`20260809000000:514-516`), and that is not a hypothetical: the mutation proof
 * of plan 35-06 measured it on 2026-08-09. With the `CHECK` in place the cell
 * was green — `ExecConstraints` runs before the index insert, so the `CHECK`
 * won the race — and with the `CHECK` dropped the cell came back `23505` from
 * the unique index instead of succeeding.
 *
 * A cell that stays red under BOTH conditions is the failure this probe exists
 * to avoid, one level up: the reader cannot tell "self-grants are refused" from
 * "that row happened to be a duplicate". `door.supervise` is assignable
 * (`party_assignments_capability_assignable`), exists in the catalogue after
 * `20260809001000_assignment_resolver.sql`, and no seeded row carries it — so
 * the self-grant is the ONLY thing left for the database to object to, and the
 * mutation makes the insert SUCCEED rather than fail differently.
 *
 * If a later plan seeds a `door.supervise` assignment for the lowest profile on
 * the lowest night, this key has to move again — and the symptom will be exactly
 * the one above: a mutation run that reports `23505` instead of a success.
 *
 * CONTAINER ONLY, and stated rather than left implicit: this probe writes
 * without a persona, and the one thing that keeps that safe is the rollback plus
 * the fact that a container is destroyed minutes later. A production capture
 * prints that it was skipped — silence would read as a pass.
 *
 * ── THE `42501` BRANCH IS NOT DEFENSIVE PADDING; IT WAS MADE TO FIRE ─────────
 *
 * Measured 2026-08-09, plan 35-06's mutation proof, direction B: the SAME probe
 * string with `set local role authenticated` injected comes back `42501` **even
 * with the `CHECK` present**. The write is refused before the constraint is ever
 * evaluated, so under any role RLS applies to, ASSIGN-04 cannot be measured at
 * all — with or without the rule. Two consequences, both written down because
 * the second one is the kind that gets "tidied" away:
 *
 *   1. the privileged connection is not a convenience here, it is the ONLY place
 *      this rule is observable;
 *   2. a reader who later moves this probe under a persona will get a green-
 *      looking `42501` on a table where the constraint has been deleted. That is
 *      the failure the branch exists to name out loud, and direction D of the
 *      same proof observed exactly it — `42501` with the constraint dropped,
 *      byte-identical to `42501` with it present.
 *
 * (Superuser `FORCE ROW LEVEL SECURITY` was tried first and does NOT reproduce
 * this: a superuser bypasses RLS regardless. Recorded so the next person does
 * not spend the run finding out.)
 */
export const CONSTRAINT_PROBES = [
  {
    id: 'ASSIGN-04',
    what: 'nobody assigns to themselves',
    table: 'party_assignments',
    sqlstate: '23514',
    constraint: 'party_assignments_no_self_grant',
    insert: {
      columns: ['party_id', 'user_id', 'capability', 'assignee_role', 'assigned_by', 'ends_at'],
      values: [
        '{{event_parties}}',
        '{{profiles}}',
        // NOT `door.operate` — see the paragraph above; that key makes this row a
        // duplicate as well as a self-grant, and a cell that is red twice over
        // cannot say which rule it is reporting.
        `'door.supervise'`,
        `'master'`,
        // The self-grant, and the whole point: the SAME account in both columns.
        '{{profiles}}',
        PROBE_FUTURE_INSTANT,
      ],
    },
  },
];

/**
 * The token no probe string may contain, in any casing. The guard below is the
 * only place in this file that is allowed to name it.
 */
const FORBIDDEN_PROBE_TOKEN = /\bcommit\b/i;

/** A key that matches no row, used when a table is empty. */
const NO_SUCH_KEY = 'rls-baseline-no-such-key';

const SQLSTATE_IN_ERROR = /ERROR:\s+([0-9A-Z]{5}):/;

/**
 * The lowest existing id of each referenced table, read ONCE with the
 * privileged role so every persona probes the same row.
 */
async function resolveProbeReferences(target) {
  const sql = PROBE_REFERENCE_TABLES.map(
    (t) => `select '${t}' as "table", min("id"::text) as ref from public."${t}"`
  ).join('\nunion all\n');
  const rows = await target.query(sql, { readOnly: true });
  const refs = {};
  for (const row of rows) {
    const value = row.ref ?? NIL_UUID;
    if (row.ref) registerSecret(row.ref);
    refs[row.table] = value;
  }
  for (const t of PROBE_REFERENCE_TABLES) {
    if (!(t in refs)) refs[t] = NIL_UUID;
  }
  // AFTER the union and never inside it: a derived reference is a column of the
  // row the union just picked, so it cannot be read until that row is known.
  // Same connection, same privileged role, same one-value-for-every-persona
  // guarantee — see `DERIVED_PROBE_REFERENCES`.
  for (const derived of DERIVED_PROBE_REFERENCES) {
    refs[derived.name] = await resolveDerivedReference(target, refs, derived);
  }
  return refs;
}

/** One derived reference: `<column>` of the row `<from>` resolved to. */
async function resolveDerivedReference(target, refs, { from, column }) {
  const base = refs[from];
  if (!base || base === NIL_UUID) return NIL_UUID;
  const rows = await target.query(
    `select "${column}"::text as ref from public."${from}" where "id" = '${base}'::uuid`,
    { readOnly: true }
  );
  const value = rows[0]?.ref ?? null;
  if (!value) return NIL_UUID;
  registerSecret(value);
  return value;
}

/**
 * The lowest existing primary key of every table, as the same text expression
 * B2 fingerprints with — so a composite key needs no special case.
 */
async function resolveProbeKeys(target, tables) {
  const sql = tables
    .map((t) => `select '${t.table}' as "table", min(${pkExpression(t.pkColumns)}) as key from public."${t.table}"`)
    .join('\nunion all\n');
  const rows = await target.query(sql, { readOnly: true });
  const keys = {};
  for (const row of rows) {
    if (row.key) registerSecret(row.key);
    keys[row.table] = row.key ?? NO_SUCH_KEY;
  }
  return keys;
}

export function substituteReferences(expression, refs) {
  return expression.replace(/\{\{([a-z_]+)\}\}/g, (_, table) => {
    if (!(table in refs)) {
      throw new Error(
        `probe payload references "${table}", which is neither a table of PROBE_REFERENCE_TABLES ` +
          'nor a name in DERIVED_PROBE_REFERENCES'
      );
    }
    return `'${refs[table]}'::uuid`;
  });
}

/**
 * The probe body.
 *
 * A plpgsql block rather than `… returning 1`, and the reason is a real
 * confound: Postgres applies the SELECT policy to a `RETURNING` clause, so a
 * row a `WITH CHECK` allowed but a `USING` hid would be reported as a refusal.
 * That would measure the read policy inside the write matrix. `GET DIAGNOSTICS`
 * reads the affected-row count without asking to see anything, and the block
 * runs as the impersonated role, so RLS applies exactly as it would to the
 * bare statement.
 */
function wrapProbe(statement) {
  return [
    'do $probe$ declare affected_rows integer; begin',
    `  ${statement}`,
    '  get diagnostics affected_rows = row_count;',
    `  perform set_config('rls_probe.affected', affected_rows::text, true);`,
    'end $probe$;',
    `select current_setting('rls_probe.affected')::int as affected;`,
  ].join('\n');
}

function buildProbeStatement({ verb, table, pkColumns, payload, refs, key }) {
  const where = `(${pkExpression(pkColumns)}) = '${key}'`;
  if (verb === 'insert') {
    const columns = payload.insert.columns.map((c) => `"${c}"`).join(', ');
    const values = payload.insert.values.map((v) => substituteReferences(v, refs)).join(', ');
    return `insert into public."${table}" (${columns}) values (${values});`;
  }
  if (verb === 'update') {
    return `update public."${table}" set "${payload.update}" = "${payload.update}" where ${where};`;
  }
  return `delete from public."${table}" where ${where};`;
}

/**
 * ── The rollback guarantee, clause 1 of 2 ─────────────────────────────────
 *
 * Every probe string must end in `rollback;` and must not contain the token
 * that would make a probe permanent, in any casing. Checked over the WHOLE
 * probe list before a single byte reaches the network, so a bad string can
 * never be the one that gets sent while the guard is still deciding.
 *
 * This is one of two independent clauses, reported separately — the shape
 * `verify-persona.mjs:319-356` uses for check F, because satisfying one
 * condition says nothing about the other.
 */
function assertProbesRollBack(probes) {
  const offenders = [];
  for (const probe of probes) {
    const label = `${probe.persona}/${probe.table}/${probe.verb}`;
    if (!/rollback;$/.test(probe.sql)) offenders.push(`${label}: does not end in a rollback`);
    if (FORBIDDEN_PROBE_TOKEN.test(probe.sql)) offenders.push(`${label}: contains the forbidden token`);
  }
  if (offenders.length) {
    throw new Error(
      `${offenders.length} probe string(s) failed the rollback guarantee and NOTHING was sent:\n` +
        offenders.map((o) => `        ${o}`).join('\n')
    );
  }
  return probes.length;
}

/**
 * ── The rollback guarantee, clause 2 of 2 ─────────────────────────────────
 *
 * Re-read all 20 row counts and assert each equals the count read before the
 * run. This is the only thing standing between a probe and a permanent write,
 * and it runs whether the capture succeeded or failed — a run that aborted
 * halfway is exactly when a row is most likely to have been left behind.
 */
async function assertRowCountsUnchanged(target, tables, before) {
  const after = await readRowCounts(target, tables);
  const moved = tables
    .map((t) => t.table)
    .filter((name) => before[name] !== after[name])
    .sort(compareStrings);
  if (moved.length) {
    throw new Error(
      `ROW COUNTS MOVED on: ${moved
        .map((n) => `${n} ${before[n]} → ${after[n]}`)
        .join(', ')}. A probe was not rolled back. Investigate the database immediately.`
    );
  }
  return tables.length;
}

/**
 * `ok:<n>` or the SQLSTATE alone — never the message, which can carry a value.
 *
 * Two targets, two ways of learning the SQLSTATE, and both must be exact. The
 * container target attaches `error.sqlstate` (`pg` calls it `code`); the
 * Management API only ever gives prose, so its SQLSTATE is parsed out of an
 * HTTP 400 body and out of nothing else. Anything that is neither is a BROKEN
 * MEASUREMENT and the caller rethrows it — an unreachable target must never be
 * recorded as a database that denies.
 */
function probeSqlstate(error) {
  if (typeof error?.sqlstate === 'string' && /^[0-9A-Z]{5}$/.test(error.sqlstate)) return error.sqlstate;
  const message = String(error?.message ?? '');
  if (!message.startsWith('[management-api/query] HTTP 400')) return null;
  const match = SQLSTATE_IN_ERROR.exec(message);
  return match ? match[1] : null;
}

/**
 * D-19 — a result outside `{ok:*, 42501}` is recorded with
 * `conclusive_for_rls: false`. It still must be identical before and after; it
 * simply proves less. And an `ok:0` on a table that holds no rows at all is
 * inconclusive for the same reason: nothing was there to refuse.
 */
function isConclusiveForRls(result, verb, globalRowCount) {
  if (result === '42501') return true;
  if (!result.startsWith('ok:')) return false;
  if (verb === 'insert') return true;
  return globalRowCount > 0;
}

/**
 * Runs every constraint probe and CLASSIFIES the refusal instead of counting it.
 *
 * The classification is the deliverable, not the pass/fail. Four outcomes are
 * distinguishable and each one means something different:
 *
 *   * `23514` + the declared constraint name → the rule refused, and it was that
 *     rule. This is the only pass.
 *   * `42501` → RLS stopped the write BEFORE the constraint was evaluated. The
 *     probe measured the policy set and learnt nothing about the constraint, so
 *     it is a FAILURE OF THE PROBE and never a pass. Recorded in those words,
 *     because "refused" and "refused by the thing we were asking about" are not
 *     the same sentence and a colour cannot tell them apart.
 *   * `23514` from another constraint, or any other SQLSTATE (`23503`, `23502`,
 *     `23505`) → the row drifted and something else caught it first.
 *   * no error at all → the rule is not enforced. This is the loudest one.
 *
 * Returns `{ rows, failures }` rather than throwing, so that TWO readers can use
 * it: `captureB3`, which throws on any failure because a capture built on an
 * unmeasured invariant is not evidence, and the mutation proof, which needs to
 * OBSERVE the failure that a deliberately dropped constraint produces. A runner
 * that could only throw would have made the mutation proof impossible to write
 * against the real code, and a mutation proved against a copy of the code proves
 * nothing about the code.
 */
export async function runConstraintProbes(target, options = {}) {
  const refs = options.refs ?? (await resolveProbeReferences(target));

  const probes = CONSTRAINT_PROBES.map((probe) => ({
    persona: PRIVILEGED_LABEL,
    table: probe.table,
    verb: 'insert',
    probe,
    sql: [
      'begin;',
      `insert into public."${probe.table}" (${probe.insert.columns
        .map((c) => `"${c}"`)
        .join(', ')}) values (${probe.insert.values.map((v) => substituteReferences(v, refs)).join(', ')});`,
      'rollback;',
    ].join('\n'),
  }));

  // The same clause-1 guarantee the matrix gets, over the same function: these
  // strings write without a persona, so they are the ones that would matter most.
  assertProbesRollBack(probes);

  const rows = [];
  const failures = [];

  for (const { probe, sql } of probes) {
    const { id, table, constraint, sqlstate: expected } = probe;
    let observed = null;
    let verdict = null;

    try {
      await target.query(sql, { readOnly: false });
      observed = 'no error';
      verdict = `the insert SUCCEEDED — "${constraint}" did not refuse it`;
    } catch (error) {
      const code = probeSqlstate(error);
      // Same rule as the matrix: a failure that is not a SQL refusal is a broken
      // measurement, never a result. An unreachable database must not be
      // recorded as a database that enforces.
      if (!code) throw error;
      const name = typeof error?.constraint === 'string' && error.constraint ? error.constraint : null;
      observed = name ? `${code} ${name}` : code;

      if (code === expected && name === constraint) {
        verdict = 'refused as declared';
      } else if (code === '42501') {
        verdict =
          'stopped by RLS before the CHECK was evaluated — the policy set was measured and ' +
          `"${constraint}" was NOT`;
      } else if (code === expected) {
        verdict = `${expected} from "${name ?? 'unnamed'}" — expected "${constraint}"`;
      } else {
        verdict = `refused ${code}, which is not ${expected} — the row was caught before the CHECK`;
      }
    }

    const pass = verdict === 'refused as declared';
    rows.push({
      id,
      table,
      constraint,
      expected_sqlstate: expected,
      observed,
      verdict,
      pass,
    });
    if (!pass) failures.push(`${id} on ${table}: ${verdict} (observed ${observed})`);
    say(`      ${pass ? '✓' : '✗'} ${id.padEnd(10)} ${table.padEnd(20)} ${observed.padEnd(38)} ${verdict}`);
  }

  return { rows, failures };
}

export async function captureB3(target, { phasePoint, targetName }) {
  const { postgresVersion } = await getFacts(target);
  const tables = await getTables(target);
  const personas = await resolvePersonas(target);

  const expected = EXPECTED_PERSONAS[targetName] ?? [];
  const missingPersonas = expected.filter((label) => !personas.has(label));
  if (missingPersonas.length) {
    throw new Error(
      `these personas were expected on target "${targetName}" and are absent: ${missingPersonas.join(', ')}. ` +
        'Nothing was written.'
    );
  }

  // Coverage refusal, before anything else: a payload table that has drifted
  // from the schema produces a matrix that cannot fail.
  const enumerated = tables.map((t) => t.table);
  const missingPayloads = enumerated.filter((name) => !(name in PROBE_PAYLOADS)).sort(compareStrings);
  if (missingPayloads.length) {
    throw new Error(
      `PROBE_PAYLOADS has no entry for: ${missingPayloads.join(', ')}. Nothing was written — a write ` +
        'matrix that silently skips a table is a matrix that cannot fail.'
    );
  }
  const stalePayloads = Object.keys(PROBE_PAYLOADS)
    .filter((name) => !enumerated.includes(name))
    .sort(compareStrings);
  if (stalePayloads.length) {
    throw new Error(
      `PROBE_PAYLOADS names tables that are not RLS-enabled tables of this target: ${stalePayloads.join(', ')}. ` +
        'Nothing was written — the payload table has drifted from the schema.'
    );
  }

  const refs = await resolveProbeReferences(target);
  const keys = await resolveProbeKeys(target, tables);

  const rowCountsBefore = await readRowCounts(target, tables);

  // Build EVERY probe string first, then check them all, then send.
  const probes = [];
  for (const label of PERSONA_LABELS) {
    const persona = personas.get(label);
    if (!persona) continue;
    for (const t of tables) {
      for (const verb of PROBE_VERBS) {
        const statement = buildProbeStatement({
          verb,
          table: t.table,
          pkColumns: t.pkColumns,
          payload: PROBE_PAYLOADS[t.table],
          refs,
          key: keys[t.table],
        });
        probes.push({
          persona: label,
          table: t.table,
          verb,
          sql: personaTransaction(persona, wrapProbe(statement)),
        });
      }
    }
  }

  const checked = assertProbesRollBack(probes);
  say(`      clause 1/2: ${checked} probe strings end in a rollback and carry no forbidden token`);

  const rows = [];
  let constraintRows = [];
  let constraintFailures = [];
  let sent = 0;
  try {
    for (const probe of probes) {
      let result;
      try {
        const [row] = await target.query(probe.sql, { readOnly: false });
        result = `ok:${row?.affected ?? 0}`;
      } catch (error) {
        const sqlstate = probeSqlstate(error);
        // A failure that is not a SQL refusal is a BROKEN MEASUREMENT, not a
        // result. Writing it would be the silent failure `meta-gates.md`
        // forbids: an unreachable API would look like a database that denies.
        if (!sqlstate) throw error;
        result = sqlstate;
      }
      sent += 1;
      rows.push({
        persona: probe.persona,
        table: probe.table,
        verb: probe.verb,
        result,
        conclusive_for_rls: isConclusiveForRls(result, probe.verb, rowCountsBefore[probe.table] ?? 0),
      });
      if (sent % 60 === 0) say(`      ${sent}/${probes.length} probes sent`);
    }

    // The constraint probes run INSIDE this try on purpose: clause 2/2 below
    // then re-reads the row counts after them too, so the one probe in this
    // file that writes without a persona is covered by the same guarantee as
    // the 966 that do.
    if (targetName === 'container') {
      const outcome = await runConstraintProbes(target, { refs });
      constraintRows = outcome.rows;
      constraintFailures = outcome.failures;
    } else {
      say(
        `      constraint probes: skipped on target "${targetName}" — they write without a persona, ` +
          'and the container is the only target this harness is allowed to do that to. Said out loud ' +
          'because a silent skip reads as a pass.'
      );
    }
  } finally {
    const rechecked = await assertRowCountsUnchanged(target, tables, rowCountsBefore);
    say(`      clause 2/2: ${rechecked}/${tables.length} row counts re-read and unchanged after ${sent} probes`);
  }

  // After the guarantee, never before it: a run that discovered an unenforced
  // constraint still has to prove it left no row behind.
  if (constraintFailures.length) {
    throw new Error(
      `${constraintFailures.length} constraint probe(s) did not refuse as declared:\n` +
        constraintFailures.map((f) => `        ${f}`).join('\n') +
        '\n        Nothing was written. A capture whose named structural guarantees were not ' +
        'observed is not evidence of them — investigate the constraint, never the expectation.'
    );
  }

  // Absent personas are recorded, never omitted.
  for (const label of PERSONA_LABELS) {
    if (personas.has(label)) continue;
    for (const t of tables) {
      for (const verb of PROBE_VERBS) {
        rows.push({ persona: label, table: t.table, verb, result: 'absent', conclusive_for_rls: false });
      }
    }
  }

  const sorted = sortRows(rows, ['persona', 'table', 'verb']);

  // A matrix where every cell refuses, or every cell succeeds, is not
  // measuring RLS — it is measuring a connection.
  const refusals = sorted.filter((r) => r.result === '42501').length;
  const successes = sorted.filter((r) => r.result.startsWith('ok:')).length;
  if (refusals === 0 || successes === 0) {
    throw new Error(
      `implausible measurement: ${refusals} refusals and ${successes} successes. Nothing was written — ` +
        'a matrix with none of one kind is not measuring row-level security.'
    );
  }

  const path = writeArtefact({
    artefact: 'B3',
    slug: 'writes',
    target: target.name,
    targetSuffix: target.artefactSuffix ?? '',
    postgresVersion,
    phasePoint,
    rows: sorted,
    trailing: {
      rollback_guarantee: {
        probe_strings_checked: checked,
        every_string_ends_in_rollback: true,
        no_string_carries_the_forbidden_token: true,
        row_counts_rechecked: tables.length,
        row_counts_unchanged: true,
      },
      // A TRAILING key and not a row of `rows`: `rls-baseline-compare.mjs`
      // indexes B3 rows by `(persona, table, verb)` and would report every
      // constraint probe as a `b3_cell_added` against every earlier capture.
      // These are a different measurement and they live beside the matrix, not
      // inside it. Sorted by id so the file cannot reorder itself.
      constraint_probes: sortRows(constraintRows, ['id']),
    },
  });

  return {
    path,
    rowCount: sorted.length,
    detail: `${sent} probes sent, ${refusals} refusals, ${successes} successes, ${
      sorted.filter((r) => r.conclusive_for_rls === false).length
    } inconclusive, ${constraintRows.filter((r) => r.pass).length}/${
      constraintRows.length
    } constraint probes refused as declared`,
  };
}

// ── B5 — the independent advisor oracle ────────────────────────────────────

/**
 * Supabase's own linter, read as a third-party oracle.
 *
 * Its value is that it is not us. B1 says what the policy set IS; B5 says
 * what a tool that has never read this plan thinks of it. When the phase
 * drives `auth_rls_initplan` from 26 to 0 while `multiple_permissive_policies`
 * (46), `unindexed_foreign_keys` (35) and `unused_index` (14) do not move,
 * that is an outside witness both to the intended change and to the absence
 * of an unintended one.
 *
 * Entity identity comes from `cache_key`, not from `metadata`. That is not a
 * preference: for `auth_rls_initplan` the metadata names only the TABLE, and
 * the 26 POLICIES are the whole point of the artefact. `cache_key` carries
 * schema, table and policy name, is derived from the entity, and is therefore
 * stable across runs. It holds table, policy and function names only — all
 * publishable.
 */
async function fetchAdvisor(target, kind) {
  const payload = await target.get(`/advisors/${kind}`);
  const lints = Array.isArray(payload) ? payload : (payload.lints ?? []);
  const byName = new Map();
  for (const lint of lints) {
    if (!byName.has(lint.name)) byName.set(lint.name, []);
    byName.get(lint.name).push(String(lint.cache_key ?? ''));
  }
  return [...byName.entries()].map(([name, entities]) => ({
    advisor: kind,
    name,
    count: entities.length,
    entities: [...new Set(entities)].sort(compareStrings),
  }));
}

/**
 * The two standing invariants that live in the Supabase dashboard rather than
 * in git, plus the exposed-schema list.
 *
 * They are captured here because **nothing in this repository would notice if
 * either changed.** `hook_custom_access_token_enabled` must stay false or
 * CAP-04 breaks silently — a capability minted into a token takes up to
 * `jwt_exp` seconds to take effect. `db_schema` must keep excluding `private`
 * or every security-definer helper this phase writes becomes a REST endpoint.
 *
 * NOTE, and it is the reason this reduction is written by hand: the
 * `/postgrest` endpoint returns the project's PostgREST **JWT secret** in the
 * same response. Only `db_schema` is read out of it, the raw response is never
 * stored, and the secret is registered with `redact()` so it cannot reach an
 * error message either. Do not "simplify" this by spreading the response.
 */
async function fetchInvariants(target) {
  const auth = await target.get('/config/auth');
  const postgrest = await target.get('/postgrest');
  registerSecret(postgrest?.jwt_secret);

  return {
    hook_custom_access_token_enabled: auth?.hook_custom_access_token_enabled ?? null,
    jwt_exp: auth?.jwt_exp ?? null,
    db_schema: postgrest?.db_schema ?? null,
  };
}

export async function captureB5(target, { phasePoint }) {
  const { postgresVersion } = await getFacts(target);

  const performance = await fetchAdvisor(target, 'performance');
  const security = await fetchAdvisor(target, 'security');

  // Same refusal as B1: an advisor that answers nothing is a broken read, not
  // a clean database. This database had 121 performance lints on 2026-08-06.
  if (performance.length === 0) {
    throw new Error(
      'implausible measurement: the performance advisor returned zero lints. Nothing was written. ' +
        'Investigate the API response — an empty advisor is a broken read, not a clean database.'
    );
  }

  const invariants = await fetchInvariants(target);
  const rows = sortRows([...performance, ...security], ['advisor', 'name']);

  const path = writeArtefact({
    artefact: 'B5',
    slug: 'advisors',
    target: target.name,
    targetSuffix: target.artefactSuffix ?? '',
    postgresVersion,
    phasePoint,
    rows,
    trailing: { invariants },
  });

  const initplan = rows.find((r) => r.name === 'auth_rls_initplan');
  const note =
    initplan && initplan.count !== MEASURED_AUTH_RLS_INITPLAN
      ? ` — NOTE: auth_rls_initplan is ${initplan.count}, measured ${MEASURED_AUTH_RLS_INITPLAN} on 2026-08-06`
      : '';

  return {
    path,
    rowCount: rows.length,
    detail: `${performance.length} performance lint kinds, ${security.length} security${note}`,
  };
}

// ── CLI ────────────────────────────────────────────────────────────────────

/**
 * The default artefact set, and why B3 is not in it.
 *
 * B3 is the only capture that sends `read_only: false` INSERT/UPDATE/DELETE
 * transactions, and against `production` those go to the live database. They
 * roll back, and that is asserted twice and independently — but the default
 * invocation of a script is what a hurried person runs, and a destructive
 * default protected by an assertion is still a destructive default. Ask for it
 * by name. (32-REVIEW.md, CR-02.)
 */
const DEFAULT_ARTEFACTS = ['B1', 'B2', 'B5'];

function parseArgs(argv) {
  const options = {
    target: 'production',
    only: [...DEFAULT_ARTEFACTS],
    phasePoint: 'pre',
    overwrite: false,
    acceptsWrites: false,
  };

  for (const arg of argv) {
    const [flag, value] = arg.split('=');
    switch (flag) {
      case '--target':
        options.target = value;
        break;
      case '--only':
        options.only = String(value ?? '')
          .split(',')
          .map((s) => s.trim().toUpperCase())
          .filter(Boolean);
        break;
      case '--phase-point':
        options.phasePoint = value;
        break;
      case '--overwrite':
        options.overwrite = true;
        break;
      case '--i-know-this-writes':
        options.acceptsWrites = true;
        break;
      default:
        fail(
          `FATAL: unknown flag ${flag}. Known flags: --target, --only, --phase-point, ` +
            '--overwrite, --i-know-this-writes.',
          2
        );
    }
  }

  if (!KNOWN_TARGETS.includes(options.target)) {
    fail(
      `FATAL: unknown target "${options.target}". Known: ${KNOWN_TARGETS.join(', ')}.`,
      2
    );
  }
  if (options.target === 'container' && options.only.includes('B5')) {
    fail(
      'FATAL: B5 is the Supabase advisor and has no container equivalent. Ask for --only=B1,B2,B3 ' +
        'on the container, and capture B5 against production. Nothing was measured.',
      2
    );
  }
  if (!options.only.length) {
    fail('FATAL: --only was given with no artefact id. Nothing was measured.', 2);
  }
  for (const id of options.only) {
    if (!KNOWN_ARTEFACTS.includes(id)) {
      fail(`FATAL: unknown artefact "${id}". Known: ${KNOWN_ARTEFACTS.join(', ')}.`, 2);
    }
  }
  if (!/^[a-z0-9-]+$/.test(String(options.phasePoint))) {
    fail('FATAL: --phase-point must be lowercase letters, digits and hyphens.', 2);
  }
  if (options.target === 'production' && options.only.includes('B3') && !options.acceptsWrites) {
    fail(
      'FATAL: B3 sends INSERT, UPDATE and DELETE transactions to the PRODUCTION database. ' +
        'They roll back — asserted before the first byte leaves, and re-asserted by re-reading ' +
        'every row count afterwards — but that is a reason to allow it deliberately, not a ' +
        'reason to do it by default. Pass --i-know-this-writes to accept, or run the write ' +
        'matrix on the throwaway target with --target=container. Nothing was measured.',
      2
    );
  }

  return options;
}

const CAPTURES = { B1: captureB1, B2: captureB2, B3: captureB3, B5: captureB5 };

/**
 * Runs the requested captures against an already-built target and returns the
 * ids that failed. Shared by this file's CLI and by the container runner, so
 * neither can drift into reporting a capture differently from the other.
 */
export async function runCaptures(target, { only, phasePoint, targetName }) {
  const failed = [];
  for (const id of only) {
    try {
      const { path, rowCount, detail } = await CAPTURES[id](target, { phasePoint, targetName });
      say(`  ✓ ${id} → ${relative(ROOT, path)} (${rowCount} rows${detail ? `, ${detail}` : ''})`);
    } catch (error) {
      say(`  ✗ ${id} — ${error.message}`);
      failed.push(id);
    }
  }
  return failed;
}

// ── main ───────────────────────────────────────────────────────────────────

/**
 * Everything above is importable; nothing above runs on import. Without this
 * guard, `import { captureB1 } from './rls-baseline.mjs'` would demand a
 * Supabase access token and start capturing production — which is exactly what
 * the container target must never do.
 */
const invokedDirectly = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (invokedDirectly) {
  const options = parseArgs(process.argv.slice(2));

  console.log('\nrls-baseline — phase 32 evidence harness\n');

  if (options.overwrite) {
    allowArtefactOverwrite();
    say('  ! --overwrite: captured artefacts may be replaced. Say why in the commit.');
  }

  // Before the credential is read, before Docker starts, before one probe is
  // sent. A refusal that arrives after the measurement has already run costs
  // the production database 220+ write transactions to tell you it will not
  // write a file.
  try {
    assertArtefactsWritable({
      only: options.only,
      phasePoint: options.phasePoint,
      targetSuffix: options.target === 'container' ? '.container' : '',
    });
  } catch (error) {
    fail(`FATAL: ${error.message}\n`, 1);
  }

  let failures = [];

  if (options.target === 'container') {
    // Loaded here and nowhere else: this import pulls in `pg` and shells out to
    // Docker, and a production capture must do neither.
    const { withContainer } = await import('./rls-baseline-container.mjs');
    await withContainer(async ({ target }) => {
      failures = await runCaptures(target, {
        only: options.only,
        phasePoint: options.phasePoint,
        targetName: options.target,
      });
    });
  } else {
    const environment = loadEnvironment();
    const target = createManagementApiTarget(environment);
    failures = await runCaptures(target, {
      only: options.only,
      phasePoint: options.phasePoint,
      targetName: options.target,
    });
  }

  console.log('');

  if (failures.length) {
    fail(`FAILED ${failures.length}/${options.only.length}: ${failures.join(' · ')}\n`, 1);
  }

  say(`${options.only.length}/${options.only.length} captured.\n`);
}
