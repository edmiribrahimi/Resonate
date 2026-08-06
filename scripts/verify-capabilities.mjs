#!/usr/bin/env node
/**
 * verify-capabilities.mjs — the four declarations of one capability set, checked.
 *
 * WHY THIS EXISTS, and it is the same reason `verify-persona.mjs` grew its
 * check G: a set that is written down in more than one place, with nothing
 * between the copies, has already drifted — the only open question is when
 * somebody notices. Check G exists because the priority table in
 * `meta-gates.md` was a SECOND index that nobody verified. A capability key is
 * a FOURTH declaration of the same thing, and it has less protection than the
 * table did.
 *
 * WHY `npm run build` CANNOT DO THIS. `src/lib/door/outcome.ts` gets half its
 * cross-check for free: its literals are mirrored by a SQL `CHECK` constraint,
 * so the database physically refuses a row that disagrees. A capability key has
 * no such mirror. It is a string in a TypeScript object, a row in
 * `private.capabilities`, and a string literal inside a policy body — and **no
 * Supabase client in this repository is parameterised with `Database`**
 * (`src/lib/supabase/client.ts:4`, `server.ts:7`, `middleware.ts:15`,
 * `service.ts:4`), so `supabase.rpc("my_access_context")` is untyped and
 * `private.has_capability('staf.manage')` is valid SQL that returns `false`
 * forever. A misspelled capability key is therefore a **runtime denial, not a
 * compile error** — and a denial is the failure that happens in front of a
 * queue. That is CAP-01 evidence (iii), and it is the gap this script closes.
 *
 * THE FOUR SIDES (phase decision D-33):
 *
 *   TS      the values of the `CAP` object in `src/lib/capabilities/keys.ts`,
 *           read from the FILE rather than imported, so this script does not
 *           depend on a build step and can run against a mutated tree.
 *   DB      `select key from private.capabilities` — the catalogue.
 *   POLICY  every single-quoted argument to `has_capability(` appearing in a
 *           `qual` or a `with_check` in `pg_policies` for schema `public`, read
 *           from the APPLIED database and never from the migration files. A
 *           migration file says what somebody intended to apply; `pg_policies`
 *           says what is running.
 *   SRC     every `CAP.` member reference under `src/`, excluding `keys.ts`
 *           itself, with comments stripped — because a key named only in a
 *           comment is not a caller, and counting it as one is how a census
 *           reads unchanged while the thing it counts has moved.
 *
 * The fourth side exists because Phase 34's CAP-02 will fail the production
 * build for a capability mapped to no route. A key that nothing asks for today
 * is that failure arriving early, so it is reported as a WARNING naming the
 * key — Phase 34 owns the decision, and four of the eight keys gate tables
 * rather than routes.
 *
 * WHAT A GREEN MEANS, AND WHAT IT DOES NOT. It means the four declarations name
 * the same strings. It does not mean a capability is granted to the right
 * roles, and it does not mean a policy is correct — `private.role_capabilities`
 * is not read here at all. Same distinction `verify-persona.mjs` draws between
 * coherence and correctness, and it has to be kept or the command becomes a
 * stamp.
 *
 * Zero new dependencies. Node built-ins, plus the baseline harness's own
 * environment loader and Management API target — reused rather than rewritten,
 * because a second API client is a second place to forget `read_only` and a
 * second place to forget to register the project reference as a secret.
 *
 * Usage:
 *   npm run verify:capabilities
 *   npm run verify:capabilities -- --target=container
 *
 * Exit codes, the three this repository's scripts already use:
 *   0  the four sets agree (warnings do not change this)
 *   1  a comparison failed, or a side measured EMPTY
 *   2  the environment is wrong — a missing variable, an unknown flag, no
 *      Docker daemon. Nothing was measured, so nothing failed.
 *
 * SECRECY. `.planning/` is tracked and this repository is PUBLIC (CLAUDE.md
 * Guardrail 5). This script prints capability keys and policy names, which are
 * design; it reads no row of `profiles`; it writes no artefact; and every
 * string that could have come back from the network is printed through the
 * harness's `say()`, which redacts the token, the project reference and the
 * Supabase URL. It calls `query()` and never `get()`: the Management API's
 * project endpoints can carry the project's signing secret in their responses,
 * and the way not to leak a value is not to fetch it.
 */

import { readdirSync, readFileSync, existsSync, lstatSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { createManagementApiTarget, loadEnvironment, say } from './rls-baseline.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const KEYS_FILE = 'src/lib/capabilities/keys.ts';
const SRC_DIR = `${ROOT}/src`;

/**
 * ── The pre-registered expectation ────────────────────────────────────────
 *
 * MEASURED on 2026-08-06 against `supabase/migrations/20260807000000_capability_model.sql`
 * section 7 and against `src/lib/capabilities/keys.ts`: eight rows, eight keys.
 * Written here, not derived from either side, for the reason
 * `rls-baseline.mjs:113-130` states about its floors: a check that reads its
 * expectation off the thing it is checking cannot fail.
 *
 * **If this trips, look at the capability model, not at this constant.** Nine
 * keys means a capability was added — which is a design decision that belongs
 * in a plan, with a grant row and a policy or a route to go with it. Seven
 * means one was removed, and something is still asking for it.
 */
const EXPECTED_KEY_COUNT = 8;

/** The targets this script can reach, borrowed from the baseline harness. */
const KNOWN_TARGETS = ['production', 'container'];

/** Directories never walked when collecting the SRC side. */
const SKIP_DIRS = new Set(['node_modules', '.next', '.git']);

// ── reporting ──────────────────────────────────────────────────────────────

const failures = [];
const warnings = [];
const notes = [];

function check(label, problems, detail) {
  if (problems.length === 0) {
    say(`  ✓ ${label}`);
    if (detail) say(`      ${detail}`);
  } else {
    say(`  ✗ ${label}`);
    for (const p of problems) say(`      ${String(p).replace(/\n/g, '\n      ')}`);
    failures.push(label);
  }
}

function warn(label, problems, detail) {
  if (problems.length === 0) {
    say(`  ✓ ${label}`);
    if (detail) say(`      ${detail}`);
    return;
  }
  say(`  ! ${label}`);
  for (const p of problems) say(`      ${String(p).replace(/\n/g, '\n      ')}`);
  warnings.push(label);
}

/**
 * `refuse` is not `check`. A refusal means the measurement did not happen, so
 * no comparison below it means anything — and continuing to print green ticks
 * under a refused measurement is exactly the shape this script exists to stop.
 */
function refuse(message, code) {
  say(`\nFATAL: ${message}\n`);
  process.exit(code);
}

// ── TypeScript, read as text ───────────────────────────────────────────────

/**
 * Removes comments while leaving string, template and regex contents intact.
 *
 * Written rather than regexed for one measured reason: `//` occurs inside
 * ordinary string literals in this codebase (every `https://`), and a naive
 * line-comment strip would eat the rest of those lines. Losing a line is not a
 * loud failure — it is a `CAP.` reference that silently stops being counted,
 * which turns into a false "nobody asks for this key" warning at best and a
 * missed comparison-3 failure at worst.
 *
 * Returns both halves. The comment half is not discarded: a key that appears
 * ONLY in a comment is reported, because that is the difference between a
 * caller and a mention, and `32-08-SUMMARY.md` records what happens when a
 * census cannot tell them apart.
 */
export function splitCodeAndComments(source) {
  let code = '';
  let comments = '';
  const n = source.length;
  // Stack of open template literals; each entry counts the `{` depth of the
  // `${ … }` expression currently being scanned as code.
  const templates = [];
  let i = 0;

  while (i < n) {
    const c = source[i];
    const next = source[i + 1];

    if (c === '/' && next === '/') {
      let j = i + 2;
      while (j < n && source[j] !== '\n') j += 1;
      comments += `${source.slice(i, j)}\n`;
      code += ' ';
      i = j;
      continue;
    }

    if (c === '/' && next === '*') {
      let j = i + 2;
      while (j < n && !(source[j] === '*' && source[j + 1] === '/')) j += 1;
      const end = Math.min(j + 2, n);
      comments += `${source.slice(i, end)}\n`;
      code += ' ';
      i = end;
      continue;
    }

    if (c === '"' || c === "'") {
      let j = i + 1;
      while (j < n) {
        if (source[j] === '\\') {
          j += 2;
          continue;
        }
        if (source[j] === c) {
          j += 1;
          break;
        }
        j += 1;
      }
      code += source.slice(i, j);
      i = j;
      continue;
    }

    if (c === '`') {
      templates.push(0);
      code += c;
      i += 1;
      // Consume template chars until `${` (back to code) or the closing tick.
      while (i < n && templates.length) {
        if (source[i] === '\\') {
          code += source.slice(i, i + 2);
          i += 2;
          continue;
        }
        if (source[i] === '`') {
          templates.pop();
          code += source[i];
          i += 1;
          continue;
        }
        if (source[i] === '$' && source[i + 1] === '{') {
          // Hand the expression back to the outer loop by breaking out; the
          // depth counter tells us when the template resumes.
          code += '${';
          i += 2;
          let depth = 1;
          while (i < n && depth > 0) {
            const e = source[i];
            if (e === '{') depth += 1;
            else if (e === '}') depth -= 1;
            if (depth === 0) break;
            code += e;
            i += 1;
          }
          code += '}';
          i += 1;
          continue;
        }
        code += source[i];
        i += 1;
      }
      continue;
    }

    code += c;
    i += 1;
  }

  return { code, comments };
}

/**
 * The `CAP` object's member names and values, parsed out of the file.
 *
 * Read as TEXT on purpose. Importing it would need a TypeScript loader, would
 * tie this check to a build step, and — the reason that actually decides it —
 * would make the mutation proof impossible to run: a deliberately broken
 * `keys.ts` must still be readable by the thing that is supposed to catch it.
 */
function readCapObject(keysPath) {
  if (!existsSync(keysPath)) {
    return { entries: [], reason: `${KEYS_FILE} does not exist` };
  }
  const { code } = splitCodeAndComments(readFileSync(keysPath, 'utf8'));
  const start = code.indexOf('export const CAP');
  if (start === -1) {
    return { entries: [], reason: `no \`export const CAP\` in ${KEYS_FILE}` };
  }
  const open = code.indexOf('{', start);
  const close = code.indexOf('}', open);
  if (open === -1 || close === -1) {
    return { entries: [], reason: `the \`CAP\` object in ${KEYS_FILE} is not a closed literal` };
  }
  const body = code.slice(open + 1, close);
  const entries = [...body.matchAll(/([A-Z][A-Z0-9_]*)\s*:\s*["']([^"']+)["']/g)].map((m) => ({
    member: m[1],
    key: m[2],
  }));
  return { entries, reason: entries.length ? null : `the \`CAP\` object in ${KEYS_FILE} has no entries` };
}

// ── the SRC side ───────────────────────────────────────────────────────────

function listSourceFiles(dir) {
  const out = [];
  const walk = (abs) => {
    for (const name of readdirSync(abs)) {
      if (SKIP_DIRS.has(name)) continue;
      const child = `${abs}/${name}`;
      const st = lstatSync(child);
      if (st.isSymbolicLink()) continue;
      if (st.isDirectory()) walk(child);
      else if (/\.(ts|tsx|mts|cts)$/.test(name)) out.push(child);
    }
  };
  walk(dir);
  return out;
}

/**
 * Every `CAP.MEMBER` reference under `src/`, with its file, split into the ones
 * that resolve against the `CAP` object and the ones that do not.
 *
 * `keys.ts` is excluded because it is the declaration, not a caller. The
 * negative lookbehind stops `RECAP.TOTAL` and `MYCAP.X` from being read as
 * capability references — the 32-08 lesson, which is that a count of things
 * *shaped like* the thing is not a count of the thing.
 */
function readSourceReferences(memberToKey) {
  const resolved = new Map(); // key -> [file:line]
  const unresolved = []; // { member, where }
  const commentOnly = new Map(); // key -> [file]
  const files = listSourceFiles(SRC_DIR);

  for (const abs of files) {
    const rel = abs.slice(ROOT.length + 1);
    if (rel === KEYS_FILE) continue;
    const source = readFileSync(abs, 'utf8');
    const { code, comments } = splitCodeAndComments(source);

    const inCode = new Set();
    for (const m of code.matchAll(/(?<![A-Za-z0-9_$.])CAP\.([A-Z][A-Z0-9_]*)/g)) {
      const member = m[1];
      inCode.add(member);
      const key = memberToKey.get(member);
      if (key === undefined) {
        unresolved.push({ member, where: rel });
        continue;
      }
      // The line number is computed from the ORIGINAL source: `code` is the
      // same length as `source` only by accident of how comments are blanked,
      // and an off-by-a-lot line number in a failure message is worse than none.
      const idx = source.indexOf(`CAP.${member}`);
      const line = idx === -1 ? 0 : source.slice(0, idx).split('\n').length;
      const at = `${rel}${line ? `:${line}` : ''}`;
      if (!resolved.has(key)) resolved.set(key, []);
      if (!resolved.get(key).includes(at)) resolved.get(key).push(at);
    }

    for (const m of comments.matchAll(/(?<![A-Za-z0-9_$.])CAP\.([A-Z][A-Z0-9_]*)/g)) {
      const member = m[1];
      if (inCode.has(member)) continue;
      const key = memberToKey.get(member);
      if (key === undefined) continue;
      if (!commentOnly.has(key)) commentOnly.set(key, []);
      if (!commentOnly.get(key).includes(rel)) commentOnly.get(key).push(rel);
    }
  }

  return { resolved, unresolved, commentOnly, fileCount: files.length };
}

// ── the DB and POLICY sides ────────────────────────────────────────────────

/**
 * The catalogue, read from whichever database the target points at.
 *
 * `read_only: true` is passed explicitly. Nothing in this script writes, and
 * the flag is the mechanical guarantee of that rather than a promise: an
 * INSERT under it fails `25006`.
 */
async function readCatalogue(target) {
  const rows = await target.query(
    'select key from private.capabilities order by key',
    { readOnly: true }
  );
  return rows.map((r) => String(r.key));
}

/**
 * Every capability key a live policy asks for, with the policies that ask.
 *
 * Read from `pg_policies` — Postgres's own re-print of the APPLIED policy —
 * because a migration file records an intention and this comparison is about
 * what is running. `32-09-SUMMARY.md` is the precedent: a migration generated
 * from the plan's prose instead of from the applied dump would have left two
 * policies unwrapped.
 *
 * The regex requires a `(` and an opening quote after the function name, which
 * is what keeps it off the `AS has_capability` alias Postgres appends to every
 * one of these sub-selects — 45 call sites render 90 occurrences of the bare
 * word, and counting those would be counting the alias, not the call.
 */
async function readPolicyKeys(target) {
  const rows = await target.query(
    `select tablename, policyname, cmd, qual, with_check
       from pg_policies
      where schemaname = 'public'
      order by tablename, policyname, cmd`,
    { readOnly: true }
  );

  const keys = new Map(); // key -> [table.policy (clause)]
  let callSites = 0;
  for (const row of rows) {
    for (const clause of ['qual', 'with_check']) {
      const text = row[clause];
      if (!text) continue;
      for (const m of String(text).matchAll(
        /(?:private\.)?has_capability\s*\(\s*'((?:[^']|'')*)'/g
      )) {
        const key = m[1].replace(/''/g, "'");
        callSites += 1;
        const at = `${row.tablename}.${row.policyname} (${clause})`;
        if (!keys.has(key)) keys.set(key, []);
        if (!keys.get(key).includes(at)) keys.get(key).push(at);
      }
    }
  }
  return { keys, policyRows: rows.length, callSites };
}

// ── CLI ────────────────────────────────────────────────────────────────────

function parseArgs(argv) {
  const options = { target: 'production' };
  for (const arg of argv) {
    const [flag, value] = arg.split('=');
    if (flag === '--target') {
      if (!KNOWN_TARGETS.includes(value)) {
        refuse(
          `--target must be one of ${KNOWN_TARGETS.join(', ')} (got "${value ?? ''}"). Nothing was measured.`,
          2
        );
      }
      options.target = value;
      continue;
    }
    refuse(`unknown flag ${flag}. Known flags: --target. Nothing was measured.`, 2);
  }
  return options;
}

// ── the run ────────────────────────────────────────────────────────────────

async function run(target, targetLabel) {
  const capObject = readCapObject(`${ROOT}/${KEYS_FILE}`);
  const memberToKey = new Map(capObject.entries.map((e) => [e.member, e.key]));
  const tsKeys = [...new Set(capObject.entries.map((e) => e.key))].sort();

  const dbKeys = [...new Set(await readCatalogue(target))].sort();
  const { keys: policyKeys, policyRows, callSites } = await readPolicyKeys(target);
  const { resolved: srcKeys, unresolved, commentOnly, fileCount } = readSourceReferences(memberToKey);

  // ── the refusal, before any comparison ──────────────────────────────────
  //
  // An empty side makes every comparison below vacuously green, and a check
  // that cannot fail is not a check. This is the same refusal as
  // `verify-persona.mjs:225-233` and `rls-baseline.mjs`'s floors, and it is
  // stated as four independent clauses so the message names WHICH side was
  // empty rather than reporting "something is wrong".
  const empty = [];
  if (tsKeys.length === 0) empty.push(`TS — ${capObject.reason ?? 'no keys parsed'}`);
  if (dbKeys.length === 0) empty.push('DB — private.capabilities returned no rows');
  if (policyKeys.size === 0)
    empty.push(`POLICY — no policy in ${policyRows} rows of pg_policies calls has_capability`);
  if (srcKeys.size === 0)
    empty.push(`SRC — no CAP. reference found in ${fileCount} files under src/`);
  if (empty.length) {
    say('');
    refuse(
      `${empty.length} of the four sides measured EMPTY, so every comparison below would be ` +
        'vacuously green:\n  - ' +
        empty.join('\n  - ') +
        '\nA check that cannot fail is not a check. Nothing is asserted.',
      1
    );
  }

  say(`  measured against: ${targetLabel}`);
  say(
    `      TS ${tsKeys.length} · DB ${dbKeys.length} · POLICY ${policyKeys.size} ` +
      `(${callSites} call sites in ${policyRows} policies) · SRC ${srcKeys.size} ` +
      `(${fileCount} files walked)\n`
  );

  // ── the pre-registered count ────────────────────────────────────────────
  {
    const problems = [];
    if (tsKeys.length !== EXPECTED_KEY_COUNT)
      problems.push(
        `TS has ${tsKeys.length} keys, expected ${EXPECTED_KEY_COUNT}: ${tsKeys.join(', ')}`
      );
    if (dbKeys.length !== EXPECTED_KEY_COUNT)
      problems.push(
        `DB has ${dbKeys.length} keys, expected ${EXPECTED_KEY_COUNT}: ${dbKeys.join(', ')}`
      );
    if (problems.length)
      problems.push(
        'If this is right, the model changed — a capability was added or removed. That is a ' +
          'design decision with a grant row and a policy or a route behind it, and it belongs in ' +
          'a plan. Look at the model, NOT at EXPECTED_KEY_COUNT.'
      );
    check(
      `0 · both declarations hold the pre-registered ${EXPECTED_KEY_COUNT} keys`,
      problems,
      `${tsKeys.length} in ${KEYS_FILE}, ${dbKeys.length} in private.capabilities`
    );
  }

  // ── 1 · TS versus DB, both directions ───────────────────────────────────
  {
    const dbSet = new Set(dbKeys);
    const tsSet = new Set(tsKeys);
    const problems = [];
    for (const key of tsKeys)
      if (!dbSet.has(key))
        problems.push(
          `"${key}" is in ${KEYS_FILE} but has NO ROW in private.capabilities — ` +
            'MISSING FROM THE DATABASE. Every check against it answers false, forever.'
        );
    for (const key of dbKeys)
      if (!tsSet.has(key))
        problems.push(
          `"${key}" is a row in private.capabilities but is NOT in ${KEYS_FILE} — ` +
            'MISSING FROM TYPESCRIPT. No caller can ask for it without writing the string by hand.'
        );
    check('1 · TS and DB name the same keys', problems, `${tsKeys.length} keys, both directions`);
  }

  // ── 2 · POLICY versus DB ────────────────────────────────────────────────
  {
    const dbSet = new Set(dbKeys);
    const problems = [];
    for (const [key, sites] of [...policyKeys.entries()].sort())
      if (!dbSet.has(key))
        problems.push(
          `"${key}" is asked for by ${sites.length} policy clause(s) but has NO ROW in ` +
            'private.capabilities — MISSING FROM THE CATALOGUE. private.has_capability returns ' +
            'false for an unknown key, so these policies DENY SILENTLY AND FOREVER:\n  ' +
            sites.join('\n  ')
        );
    check(
      '2 · every key a policy asks for exists in the catalogue',
      problems,
      `${policyKeys.size} keys used by policies: ${[...policyKeys.keys()].sort().join(', ')}`
    );
  }

  // ── 3 · SRC versus DB ───────────────────────────────────────────────────
  {
    const dbSet = new Set(dbKeys);
    const problems = [];
    for (const { member, where } of unresolved)
      problems.push(
        `${where} references CAP.${member}, which is NOT a member of the CAP object in ` +
          `${KEYS_FILE} — UNRESOLVABLE IN TYPESCRIPT.`
      );
    for (const [key, sites] of [...srcKeys.entries()].sort())
      if (!dbSet.has(key))
        problems.push(
          `"${key}" is asked for by application code but has NO ROW in ` +
            'private.capabilities — MISSING FROM THE CATALOGUE. The call resolves to false ' +
            'for every subject, which reads as a permissions bug:\n  ' +
            sites.join('\n  ')
        );
    check(
      '3 · every key application code asks for exists in the catalogue',
      problems,
      `${srcKeys.size} keys used in src/: ${[...srcKeys.keys()].sort().join(', ')}`
    );
  }

  // ── 4 · keys nobody asks for — a WARNING, named (D-33) ──────────────────
  {
    const asked = new Set([...policyKeys.keys(), ...srcKeys.keys()]);
    const orphans = dbKeys.filter((k) => !asked.has(k));
    const problems = orphans.map((key) => {
      const mentioned = commentOnly.get(key);
      return (
        `"${key}" is in the catalogue but NEITHER a policy NOR src/ asks for it` +
        (mentioned ? ` (mentioned only in a comment: ${mentioned.join(', ')} — a mention is not a caller)` : '') +
        '.'
      );
    });
    if (problems.length)
      problems.push(
        "Phase 34's CAP-02 will fail the production build for a capability mapped to no route. " +
          'This is that failure, arriving early and cheaply. It is a warning and not a failure ' +
          'because Phase 34 owns the decision, and because four of the eight keys gate TABLES ' +
          'rather than routes.'
      );
    warn(
      '4 · every catalogue key is asked for by a policy or by src/',
      problems,
      `${dbKeys.length} keys, all reached: ${policyKeys.size} by policy, ${srcKeys.size} by src/`
    );
  }

  // Not a comparison — a measurement worth printing, because the coverage of
  // the two consuming sides is the thing Phase 34 will act on.
  notes.push(
    `by policy : ${[...policyKeys.keys()].sort().join(', ')}\n` +
      `by src/   : ${[...srcKeys.keys()].sort().join(', ')}`
  );
  if (commentOnly.size)
    notes.push(
      `named only in comments (not counted as callers): ${[...commentOnly.keys()].sort().join(', ')}`
    );
}

// ── main ───────────────────────────────────────────────────────────────────

const invokedDirectly = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (invokedDirectly) {
  const options = parseArgs(process.argv.slice(2));

  console.log('\nverify-capabilities — the four declarations of one capability set\n');

  try {
    if (options.target === 'container') {
      // Imported here and nowhere else: this pulls in `pg` and shells out to
      // Docker, and a production run must do neither. `seed: false` because
      // this check reads the catalogue and the policy predicates — schema, not
      // rows — so nine seeded personas would be time spent on nothing.
      const { withContainer } = await import('./rls-baseline-container.mjs');
      await withContainer(async ({ target }) => run(target, 'postgres-container (throwaway)'), {
        seed: false,
      });
    } else {
      const environment = loadEnvironment();
      const target = createManagementApiTarget(environment);
      await run(target, 'production (Management API, read_only)');
    }
  } catch (error) {
    // Printed through `say`, not `console.error`: an API error body is written
    // by somebody else and can echo back what it was sent.
    say(`\n  ✗ the measurement did not complete — ${error.message}\n`);
    process.exit(1);
  }

  if (notes.length) {
    say('\n  measures:');
    for (const n of notes) say(`    ${n.replace(/\n/g, '\n    ')}`);
  }

  say(
    '\n  Note: this asserts that the four declarations name the same keys. It does NOT assert' +
      '\n  that a capability is granted to the right roles — private.role_capabilities is not' +
      '\n  read here — and it does not assert that any policy is correct.\n'
  );

  if (failures.length) {
    say(`FAILED ${failures.length}/4: ${failures.join(' · ')}\n`);
    process.exit(1);
  }
  say(
    warnings.length
      ? `4/4 green, ${warnings.length} warning(s) — see above.\n`
      : '4/4 green, 0 warnings.\n'
  );
}
