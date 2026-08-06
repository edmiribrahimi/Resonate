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
 *   npm run baseline:rls
 *   npm run baseline:rls -- --only=B1 --target=production --phase-point=pre
 *
 * Exit codes, copied from `verify-persona.mjs`:
 *   0  every requested artefact was captured and written
 *   1  a check failed — an implausible measurement, a refused write
 *   2  the environment is wrong — a missing variable, an unknown flag
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
const KNOWN_ARTEFACTS = ['B1', 'B5'];

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

function registerSecret(value) {
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

function say(message) {
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
 */
function loadEnvironment() {
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
 */
function createManagementApiTarget({ token, projectRef }) {
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
function compareStrings(a, b) {
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
 * The pre-phase capture is the unsuffixed file, so that
 * `32-BASELINE-policies.json` is always the thing every later capture is
 * compared against, and a later capture never overwrites it by accident.
 */
function artefactPath(slug, phasePoint) {
  const suffix = phasePoint === 'pre' ? '' : `.${phasePoint}`;
  return `${BASELINE_DIR}/32-BASELINE-${slug}${suffix}.json`;
}

function writeArtefact({ artefact, slug, target, postgresVersion, phasePoint, rows, trailing }) {
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
  const path = artefactPath(slug, phasePoint);
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

/** One facts read per run, shared by every artefact captured in that run. */
let factsPromise = null;

async function getFacts(target) {
  if (!factsPromise) {
    factsPromise = target.query(FACTS_SQL, { readOnly: true }).then((rows) => {
      const row = rows[0] ?? {};
      return {
        policyCount: row.policy_count,
        rlsEnabledTables: row.rls_enabled_tables,
        postgresVersion: reducePostgresVersion(row.pg_version),
      };
    });
  }
  return factsPromise;
}

async function captureB1(target, { phasePoint }) {
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

async function captureB5(target, { phasePoint }) {
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

function parseArgs(argv) {
  const options = { target: 'production', only: [...KNOWN_ARTEFACTS], phasePoint: 'pre' };

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
      default:
        fail(`FATAL: unknown flag ${flag}. Known flags: --target, --only, --phase-point.`, 2);
    }
  }

  if (options.target !== 'production') {
    fail(`FATAL: unknown target "${options.target}". This plan implements "production" only.`, 2);
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

  return options;
}

// ── main ───────────────────────────────────────────────────────────────────

const options = parseArgs(process.argv.slice(2));
const environment = loadEnvironment();
const target = createManagementApiTarget(environment);

console.log('\nrls-baseline — phase 32 evidence harness\n');

const failures = [];

const CAPTURES = { B1: captureB1, B5: captureB5 };

for (const id of options.only) {
  try {
    const { path, rowCount, detail } = await CAPTURES[id](target, {
      phasePoint: options.phasePoint,
    });
    say(`  ✓ ${id} → ${relative(ROOT, path)} (${rowCount} rows${detail ? `, ${detail}` : ''})`);
  } catch (error) {
    say(`  ✗ ${id} — ${error.message}`);
    failures.push(id);
  }
}

console.log('');

if (failures.length) {
  fail(`FAILED ${failures.length}/${options.only.length}: ${failures.join(' · ')}\n`, 1);
}

say(`${options.only.length}/${options.only.length} captured.\n`);
