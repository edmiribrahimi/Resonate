#!/usr/bin/env node
/**
 * rls-baseline-container.mjs — the throwaway PostgreSQL 17.6 target.
 *
 * WHY IT EXISTS. Production holds four profiles: one `master/approved` and
 * three `member/approved`. **There is no organizer and no non-approved row**,
 * and `organizer/pending` is precisely the pair where the two live definitions
 * of "organizer" disagree — P1 lets a pending organizer insert a ticket tier,
 * P3 forbids the same person a venue. Plan `32-03` measured the consequence:
 * seven of eleven personas are `absent` on production and 191 of 220 read cells
 * are vacuous. Production gives SCHEMA truth; only a container gives PERSONA
 * truth. Neither alone is a baseline, so this phase captures both.
 *
 * WHAT IT DOES. Starts `postgres:17.6` — production's exact major.minor, because
 * a baseline rendered by a different planner is a baseline of a different
 * database — applies the shim, the repository's base schema and all 33
 * migrations, seeds nine personas and at least two differently-owned rows in
 * every table, hands the result to the SAME capture functions
 * `scripts/rls-baseline.mjs` runs against production, and destroys the
 * container. Always destroys it, including on failure.
 *
 * IT CANNOT TOUCH A REAL DATABASE. It only ever connects to a container it
 * started itself, on an ephemeral loopback port with a password generated for
 * that one run and written nowhere (threat T-32-04-01). It reads **no**
 * environment variable at all: `grep -c 'process\.env' scripts/rls-baseline-container.mjs`
 * returns **0**, so there is no path by which `NEXT_PUBLIC_SUPABASE_URL` or
 * `SUPABASE_ACCESS_TOKEN` could reach it. The three occurrences of the word
 * SUPABASE in this file are all in this sentence.
 *
 * Usage:
 *   npm run baseline:container                 build, seed, capture B1+B2+B3, destroy
 *   npm run baseline:container -- --smoke      build, assert, destroy — no seed, no capture
 *   npm run baseline:container -- --seed-only --report   build, seed, print the row report, destroy
 *
 * Exit codes, the same three `verify-persona.mjs` and `rls-baseline.mjs` use:
 *   0  everything asked for succeeded
 *   1  a check failed — a migration did not apply, a version mismatch, too few
 *      RLS tables, an under-seeded table
 *   2  the environment is wrong — no `docker` on the path, or its daemon is not
 *      answering. Nothing was measured, so nothing failed.
 */

import { execFileSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import pg from 'pg';

import {
  captureB1,
  captureB2,
  captureB3,
  compareStrings,
  say,
} from './rls-baseline.mjs';

const { Client, Pool } = pg;

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SHIM_PATH = `${ROOT}/scripts/container/auth-shim.sql`;
const MIGRATIONS_DIR = `${ROOT}/supabase/migrations`;

/** Production's exact major.minor. A different planner is a different baseline. */
const REQUIRED_POSTGRES_VERSION = '17.6';
const IMAGE = `postgres:${REQUIRED_POSTGRES_VERSION}`;

/**
 * The floor, copied from `rls-baseline.mjs` for the same reason it exists
 * there: a container that applied half the migrations and reported success
 * would produce a baseline that agrees with production for no reason at all.
 */
const FLOOR_RLS_ENABLED_TABLES = 20;

/**
 * ── Where the container's schema comes from, and why it is not just the
 *    migrations ─────────────────────────────────────────────────────────────
 *
 * Phase decision D-21 says "built from `supabase/migrations/**`". Measured while
 * implementing it: **the 33 migrations cannot build this database on their own.**
 * Six of the twenty tables — `profiles`, `events`, `rsvps`, `attendances`,
 * `event_media`, `newsletter_subscribers` — are created by NO migration, and the
 * first migration opens with `ALTER TABLE public.profiles ADD COLUMN role`.
 * They come from `supabase/schema.sql`, which the file's own header calls the
 * "fresh database setup".
 *
 * The current `supabase/schema.sql` cannot be that base either: it has been
 * partially updated alongside five later migrations, so it already carries
 * `role`, `status`, `ticket_tiers` and `discount_codes`, and re-applying those
 * migrations over it fails on a duplicate column and a duplicate table.
 *
 * The base that DOES compose is `supabase/schema.sql` **as it stood at the
 * initial commit**, before any migration existed. That is production's real
 * construction history — the initial schema, then the migrations in order — and
 * it is read out of this repository's own object database, not hand-written.
 * The blob hash is asserted so a rebased or amended history is caught rather
 * than silently producing a different schema.
 */
const BASE_SCHEMA_COMMIT = 'dd2a2c2b0ed843447e532dc165b6e0984d0e4de0';
const BASE_SCHEMA_PATH = 'supabase/schema.sql';
const BASE_SCHEMA_BLOB = '1288730b4e5d98dc0babd1226a05039efd6ef147';

// ── docker ─────────────────────────────────────────────────────────────────

function docker(args, options = {}) {
  return execFileSync('docker', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], ...options });
}

/**
 * Exit 2, never 1. A missing daemon means nothing was measured — the
 * environment is wrong, not the measurement. Collapsing the two would make a
 * laptop with Docker Desktop closed indistinguishable from a database whose
 * migrations no longer apply.
 */
export function assertDockerAvailable() {
  try {
    docker(['--version']);
  } catch {
    console.error(
      'FATAL: `docker` is not on the PATH. The container target cannot be built. Nothing was measured.'
    );
    process.exit(2);
  }
  try {
    docker(['info', '--format', '{{.ServerVersion}}']);
  } catch {
    console.error(
      'FATAL: the Docker daemon is not answering (`docker info` failed). Start Docker and re-run. Nothing was measured.'
    );
    process.exit(2);
  }
}

// ── the container lifecycle ────────────────────────────────────────────────

async function waitForReadiness(connectionString, { timeoutMs = 90_000 } = {}) {
  const deadline = Date.now() + timeoutMs;
  let lastError = null;
  while (Date.now() < deadline) {
    const client = new Client({ connectionString });
    try {
      await client.connect();
      await client.query('select 1');
      await client.end();
      return;
    } catch (error) {
      lastError = error;
      try {
        await client.end();
      } catch {
        /* the connect failed; there is nothing to close */
      }
      await new Promise((r) => setTimeout(r, 250));
    }
  }
  throw new Error(`the container never became ready: ${lastError?.message ?? 'unknown'}`);
}

function startContainer() {
  const name = `rls-baseline-${randomBytes(6).toString('hex')}`;
  // Generated per run and never written anywhere. Nothing outside this process
  // can reach the container: the port is bound to loopback only.
  const password = randomBytes(24).toString('hex');

  docker([
    'run',
    '--rm',
    '-d',
    '--name',
    name,
    '-e',
    `POSTGRES_PASSWORD=${password}`,
    '-e',
    'POSTGRES_DB=postgres',
    '-p',
    '127.0.0.1::5432',
    IMAGE,
  ]);

  const mapped = docker(['port', name, '5432']).trim().split('\n')[0];
  const port = mapped.split(':').pop();
  if (!/^\d+$/.test(String(port))) {
    throw new Error(`could not read the container's mapped port (docker port said "${mapped}")`);
  }

  return { name, connectionString: `postgresql://postgres:${password}@127.0.0.1:${port}/postgres` };
}

function destroyContainer(name) {
  try {
    docker(['rm', '-fv', name]);
  } catch {
    // `--rm` may have removed it already. A container that is gone is the
    // outcome we wanted; only a container that survives is a problem, and the
    // caller reports that separately.
  }
}

// ── building the schema ────────────────────────────────────────────────────

function readBaseSchema() {
  const blob = execFileSync('git', ['rev-parse', `${BASE_SCHEMA_COMMIT}:${BASE_SCHEMA_PATH}`], {
    cwd: ROOT,
    encoding: 'utf8',
  }).trim();
  if (blob !== BASE_SCHEMA_BLOB) {
    throw new Error(
      `the base schema blob is ${blob}, expected ${BASE_SCHEMA_BLOB}. The history this container is ` +
        'built from has changed. Nothing was measured — investigate before lowering this assertion.'
    );
  }
  return execFileSync('git', ['show', `${BASE_SCHEMA_COMMIT}:${BASE_SCHEMA_PATH}`], {
    cwd: ROOT,
    encoding: 'utf8',
  });
}

export function listMigrations() {
  return readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort(compareStrings);
}

/**
 * Applies one SQL file and, on failure, names the FILE and the SQLSTATE.
 *
 * "A migration failed" with no filename is the silent failure `meta-gates.md`
 * forbids: 33 files and one error message is not a diagnosis.
 */
async function applyFile(client, label, sql) {
  try {
    await client.query(sql);
  } catch (error) {
    throw new Error(
      `${label} failed to apply — SQLSTATE ${error.code ?? 'unknown'}: ${error.message}` +
        (error.position ? ` (at character ${error.position})` : '')
    );
  }
}

async function buildSchema(client) {
  await applyFile(client, 'scripts/container/auth-shim.sql', readFileSync(SHIM_PATH, 'utf8'));
  await applyFile(client, `${BASE_SCHEMA_COMMIT.slice(0, 7)}:${BASE_SCHEMA_PATH}`, readBaseSchema());

  const migrations = listMigrations();
  for (const file of migrations) {
    await applyFile(client, `supabase/migrations/${file}`, readFileSync(`${MIGRATIONS_DIR}/${file}`, 'utf8'));
  }
  return migrations.length;
}

async function assertVersionAndRls(client) {
  const { rows: versionRows } = await client.query('select version() as v');
  const match = /PostgreSQL (\d+\.\d+)/.exec(String(versionRows[0]?.v ?? ''));
  const version = match ? match[1] : null;
  if (version !== REQUIRED_POSTGRES_VERSION) {
    throw new Error(
      `the container reports PostgreSQL ${version ?? 'unknown'}, and this baseline requires ` +
        `${REQUIRED_POSTGRES_VERSION} — production's exact version. A predicate rendered by a different ` +
        'planner is not comparable. Nothing was measured.'
    );
  }

  const { rows: tableRows } = await client.query(
    `select count(*)::int as n from pg_class c join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relkind = 'r' and c.relrowsecurity`
  );
  const rlsTables = tableRows[0]?.n ?? 0;
  if (rlsTables < FLOOR_RLS_ENABLED_TABLES) {
    throw new Error(
      `only ${rlsTables} tables report row-level security after the migrations, floor is ` +
        `${FLOOR_RLS_ENABLED_TABLES}. The schema did not build. Nothing was measured.`
    );
  }

  return { version, rlsTables };
}

/**
 * RLS narrows a grant; it cannot create one. If `anon` and `authenticated` were
 * missing table privileges here, every persona would refuse every write and
 * every read would be empty — and the container's matrix would agree with
 * production's for a reason that has nothing to do with a policy. Measured on
 * production (`32-03-SUMMARY.md` F6), asserted here.
 */
async function assertGrants(client) {
  const { rows } = await client.query(
    `select c.relname as t, r.rolname as who,
            bool_and(has_table_privilege(r.rolname, c.oid, p)) as ok
       from pg_class c
       join pg_namespace n on n.oid = c.relnamespace
       cross join (values ('anon'), ('authenticated')) as r(rolname)
       cross join unnest(array['select','insert','update','delete']) as p
      where n.nspname = 'public' and c.relkind = 'r' and c.relrowsecurity
      group by c.relname, r.rolname`
  );
  const missing = rows
    .filter((r) => !r.ok)
    .map((r) => `${r.t}/${r.who}`)
    .sort(compareStrings);
  if (missing.length) {
    throw new Error(
      `these table/role pairs lack one of SELECT, INSERT, UPDATE, DELETE: ${missing.join(', ')}. ` +
        'A 42501 would then mean a missing grant, not a policy refusal. Nothing was measured.'
    );
  }
  return rows.length;
}

// ── the target, behind the same signature production uses ──────────────────

/**
 * `query(sql, { readOnly })` and `get(path)` — the exact shape
 * `createManagementApiTarget()` returns, so `captureB1`, `captureB2` and
 * `captureB3` are SHARED rather than copied.
 *
 * Three details are not cosmetic:
 *
 *   1. **The last non-empty result set.** The Supabase query endpoint returns
 *      it (32-03 finding F3) and the capture code is written against that. `pg`
 *      returns every result of a multi-statement string, so the same reduction
 *      happens here or the two targets would disagree about what a probe
 *      returned.
 *   2. **`sqlstate` on the error.** `probeSqlstate()` reads `error.sqlstate`
 *      when it is there; `pg` calls it `error.code`, so it is copied across.
 *      Without it every container probe would look like a broken measurement.
 *   3. **A destroyed connection after a failure.** A probe string is
 *      `begin; … rollback;`. When the statement inside raises, the transaction
 *      aborts and the SESSION is left in `25P02`, so the next probe on that
 *      connection would fail for the previous probe's reason. The connection is
 *      discarded rather than returned to the pool.
 */
export function createContainerTarget(pool) {
  function rowsOf(result) {
    const results = Array.isArray(result) ? result : [result];
    let rows = [];
    for (const r of results) if (Array.isArray(r?.rows) && r.rows.length) rows = r.rows;
    return rows;
  }

  async function query(sql, { readOnly }) {
    if (typeof readOnly !== 'boolean') {
      throw new Error('query() requires an explicit readOnly flag — the caller decides, never a default');
    }
    const client = await pool.connect();
    let broken = false;
    try {
      if (readOnly) {
        // The container's equivalent of the API's `read_only` flag: a
        // read-only transaction, so a stray write fails 25006 exactly as it
        // does against production.
        await client.query('begin read only');
        try {
          return rowsOf(await client.query(sql));
        } finally {
          await client.query('rollback').catch(() => {});
        }
      }
      return rowsOf(await client.query(sql));
    } catch (error) {
      broken = true;
      if (error.code && !error.sqlstate) error.sqlstate = error.code;
      throw error;
    } finally {
      client.release(broken);
    }
  }

  async function get(path) {
    throw new Error(
      `the container target has no Management API: "${path}" is a Supabase service, not a database ` +
        'object. B5 (the advisor oracle) is production-only, and the baseline README says so rather ' +
        'than leaving it as a gap.'
    );
  }

  return { name: 'postgres-container', artefactSuffix: '.container', query, get };
}

// ── the whole lifecycle, always destroying ─────────────────────────────────

/**
 * Builds a container, hands `{ target, client, facts }` to `body`, and destroys
 * the container whatever happens. `body` never learns the container's name or
 * password, and nothing outside this function can reach it.
 */
export async function withContainer(body, { seed = true } = {}) {
  assertDockerAvailable();

  let container = null;
  let pool = null;
  let admin = null;
  try {
    container = startContainer();
    say(`      container started from ${IMAGE}`);
    await waitForReadiness(container.connectionString);

    admin = new Client({ connectionString: container.connectionString });
    await admin.connect();

    const applied = await buildSchema(admin);
    say(`      applied the shim, the base schema and ${applied} migration files`);

    const facts = await assertVersionAndRls(admin);
    say(`      postgres ${facts.version}, ${facts.rlsTables} tables with row-level security`);

    const checkedGrants = await assertGrants(admin);
    say(`      ${checkedGrants} table/role grant pairs verified`);

    let seedReport = null;
    if (seed) {
      // Loaded only when it is needed, so `--smoke` proves the container builds
      // without depending on the seed at all.
      const { seedContainer } = await import('./container/seed.mjs');
      seedReport = await seedContainer(admin);
    }

    pool = new Pool({ connectionString: container.connectionString, max: 4 });
    const target = createContainerTarget(pool);

    return await body({ target, admin, facts, seedReport });
  } finally {
    if (pool) await pool.end().catch(() => {});
    if (admin) await admin.end().catch(() => {});
    if (container) {
      destroyContainer(container.name);
      let survivors = '';
      try {
        survivors = docker(['ps', '-a', '--filter', `name=${container.name}`, '--format', '{{.Names}}']).trim();
      } catch {
        survivors = '';
      }
      say(
        survivors
          ? `      WARNING: the container ${container.name} survived removal — remove it by hand`
          : '      container destroyed, nothing left behind'
      );
    }
  }
}

// ── CLI ────────────────────────────────────────────────────────────────────

function parseArgs(argv) {
  const options = { smoke: false, seedOnly: false, report: false, phasePoint: 'pre' };
  for (const arg of argv) {
    const [flag, value] = arg.split('=');
    switch (flag) {
      case '--smoke':
        options.smoke = true;
        break;
      case '--seed-only':
        options.seedOnly = true;
        break;
      case '--report':
        options.report = true;
        break;
      case '--phase-point':
        options.phasePoint = value;
        break;
      default:
        console.error(
          `FATAL: unknown flag ${flag}. Known flags: --smoke, --seed-only, --report, --phase-point.`
        );
        process.exit(2);
    }
  }
  if (!/^[a-z0-9-]+$/.test(String(options.phasePoint))) {
    console.error('FATAL: --phase-point must be lowercase letters, digits and hyphens.');
    process.exit(2);
  }
  return options;
}

const invokedDirectly = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (invokedDirectly) {
  const options = parseArgs(process.argv.slice(2));
  console.log('\nrls-baseline-container — phase 32 evidence harness, throwaway target\n');

  let exitCode = 0;
  try {
    await withContainer(
      async ({ target, seedReport }) => {
        if (options.smoke) {
          say('  ✓ smoke — the container built, asserted and is about to be destroyed');
          return;
        }
        if (seedReport && options.report) {
          for (const line of seedReport.lines) say(`      ${line}`);
        }
        if (options.seedOnly) {
          say(`  ✓ seed — ${seedReport.tables} tables seeded, ${seedReport.profiles} profiles`);
          return;
        }
        for (const [id, capture] of [
          ['B1', captureB1],
          ['B2', captureB2],
          ['B3', captureB3],
        ]) {
          const { path, rowCount, detail } = await capture(target, {
            phasePoint: options.phasePoint,
            targetName: 'container',
          });
          say(`  ✓ ${id} → ${path.replace(`${ROOT}/`, '')} (${rowCount} rows${detail ? `, ${detail}` : ''})`);
        }
      },
      { seed: !options.smoke }
    );
  } catch (error) {
    console.error(`\n  ✗ ${error.message}\n`);
    exitCode = 1;
  }

  console.log('');
  process.exit(exitCode);
}
