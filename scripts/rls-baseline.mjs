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
  event_media: {
    insert: {
      columns: ['event_id', 'url', 'type', 'uploaded_by'],
      values: ['{{events}}', `'https://example.invalid/rls-baseline-probe'`, `'photo'`, 'auth.uid()'],
    },
    update: 'caption',
  },
  // A party needs its event, a title and a start time. `venue_secret` defaults
  // to false, so nothing here creates a row that could later be revealed.
  event_parties: {
    insert: { columns: ['event_id', 'title', 'time'], values: ['{{events}}', PROBE_TEXT, `'18:00'::time`] },
    update: 'description',
  },
  // `slug` is unique; `is_published` defaults to false, so the probe row would
  // not be publicly visible even if it survived — and it does not.
  events: {
    insert: { columns: ['slug', 'title', 'date'], values: [PROBE_TEXT, PROBE_TEXT, 'current_date'] },
    update: 'description',
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

/** The tables a `{{placeholder}}` may point at. */
export const PROBE_REFERENCE_TABLES = [
  'discount_codes',
  'drink_orders',
  'event_parties',
  'events',
  'profiles',
  'ticket_tiers',
];

const PROBE_VERBS = ['delete', 'insert', 'update'];

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
  return refs;
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
    if (!(table in refs)) throw new Error(`probe payload references unknown table "${table}"`);
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
  } finally {
    const rechecked = await assertRowCountsUnchanged(target, tables, rowCountsBefore);
    say(`      clause 2/2: ${rechecked}/${tables.length} row counts re-read and unchanged after ${sent} probes`);
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
    },
  });

  return {
    path,
    rowCount: sorted.length,
    detail: `${sent} probes sent, ${refusals} refusals, ${successes} successes, ${
      sorted.filter((r) => r.conclusive_for_rls === false).length
    } inconclusive`,
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
