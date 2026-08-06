#!/usr/bin/env node
/**
 * rls-baseline-compare.mjs — the CAP-03 verdict.
 *
 * Why it exists: `rls-baseline.mjs` captures what the database answered.
 * This script answers the only question CAP-03 actually asks — **did anything
 * move that the whitelist does not explain?** Sixty-seven policies, 220 read
 * cells, 660 write cells and eight advisor lints cannot be judged by reading a
 * diff; without a mechanical comparator CAP-03 is an opinion.
 *
 * What it does NOT do (phase decision D-25): it never repairs a mismatch and
 * never rewrites a baseline. It opens both files read-only. Its only outputs
 * are a verdict, a defect list and an exit code. There is no write path in
 * this file — no `writeFileSync`, no `mkdirSync`, no `fetch`.
 *
 * Zero dependencies, pure ESM, node built-ins only. This phase installs no
 * package.
 *
 * Usage:
 *   npm run baseline:compare -- --only=B1 --before=<file> --after=<file>
 *   npm run baseline:compare -- --only=B2,B3 --before-dir=<dir> --after-dir=<dir>
 *   npm run baseline:compare -- --only=B5 --expect-initplan=0
 *
 * Exit codes, copied from `verify-persona.mjs` and `rls-baseline.mjs`:
 *   0  every requested comparison is clean
 *   1  a defect — something moved that the whitelist does not explain
 *   2  the environment or the invocation is wrong — a missing file, an
 *      unknown flag, an unstated expectation
 *
 * ── The whitelist (phase decision D-23) ───────────────────────────────────
 *
 * Exactly **two** transformations are legal. No third is added without an
 * explicit written decision in `32-VERIFICATION.md`.
 *
 *   T1  the token `auth.uid()` becomes `(select auth.uid())`
 *   T2  one of the five enumerated P1–P5 fragments becomes
 *       `(select private.has_capability('<key>'))`
 *
 * T2's legal left-hand sides are **enumerated below, not pattern-matched**.
 * A whitelist loose enough to absorb a real change is worth nothing
 * (T-32-05-02), so each one is a literal string and a fragment that is one
 * character different is a defect.
 *
 * ── Why the enumeration is written in Postgres's rendering, not in SQL ────
 *
 * B1 is a dump of `pg_policies`, and `pg_policies` re-prints the **parsed**
 * expression rather than the text the migration wrote. Measured on the
 * committed baseline: the migration source
 *
 *     (SELECT public.is_admin_or_organizer())
 *
 * is stored and re-printed as
 *
 *     ( SELECT is_admin_or_organizer() AS is_admin_or_organizer)
 *
 * — schema qualifier resolved away, an alias added, the whitespace changed.
 * Plan `32-05`'s D-23 lists the left-hand sides in **source** form. Comparing
 * source forms against a re-print would report a defect on all 67 rows. The
 * enumeration below is therefore the same five predicates in the form B1
 * actually holds, verified against the committed artefact. Recorded as a
 * deviation in `32-05-SUMMARY.md`.
 *
 * The same fact governs the right-hand sides: a migration that writes
 * `(select private.has_capability('x'))` will be re-printed as
 * `( SELECT private.has_capability('x'::text) AS has_capability)`. Both forms
 * are accepted, and **only** those two — the tolerance is two enumerated
 * alternatives, never a wildcard. If Postgres renders a third shape the
 * comparison fails as `predicate_unexplained`, which is the safe direction:
 * it fails loudly rather than passing quietly.
 *
 * ── One predicate that looks like the whitelist and is not ────────────────
 *
 * `event_media_select_approved` reads `(status = 'approved'::text)`. That is
 * the **row's own** column, not the caller's membership status, and it is not
 * a capability. It is deliberately absent from the enumeration.
 */

import { existsSync, readFileSync } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PHASE_DIR = `${ROOT}/.planning/phases/32-capability-model-in-the-database`;
const BASELINE_DIR = `${PHASE_DIR}/baseline`;

const KNOWN_ARTEFACTS = ['B1', 'B2', 'B3', 'B5'];
const ARTEFACT_SLUG = { B1: 'policies', B2: 'reads', B3: 'writes', B5: 'advisors' };
const KNOWN_TARGETS = ['production', 'container'];

/**
 * The three lint counts `32-VALIDATION.md`'s CAP-03 row asks to hold still.
 *
 * `unused_index` is **deliberately not here.** Finding F3 of
 * `baseline/README.md`: the advisor derives it from
 * `pg_stat_user_indexes.idx_scan`, so it counts indexes not scanned since the
 * statistics were last reset. It read 14 in `32-RESEARCH.md` and 12 in plan
 * `32-04`'s capture, **on the same day, with no schema change between them**.
 * Pinning it would produce a false failure, and a comparator that cries wolf
 * is a comparator someone will start passing `|| true` to. It is reported as
 * a movement instead, with this reason printed beside it.
 */
const PINNED_LINTS = ['multiple_permissive_policies', 'unindexed_foreign_keys'];
const LINT_MOVES_ALWAYS_ALLOWED = {
  unused_index:
    'derived from pg_stat_user_indexes.idx_scan — moves with database use, ' +
    'not with schema (baseline/README.md, finding F3)',
};

// ── the reporter ───────────────────────────────────────────────────────────

const defects = [];
const movements = [];

function say(line = '') {
  console.log(line);
}

/** A defect. Never repaired, only reported — D-25. */
function defect(kind, where, detail) {
  defects.push({ kind, where, detail });
  say(`  ✗ ${kind} — ${where}`);
  for (const line of String(detail).split('\n')) say(`      ${line}`);
}

function ok(label, detail) {
  say(`  ✓ ${label}`);
  if (detail) for (const line of String(detail).split('\n')) say(`      ${line}`);
}

/**
 * The summary line for one artefact. A `✓` printed next to a defect list is a
 * report that contradicts itself, so the tick is earned per artefact: it is
 * shown only when nothing was recorded since `mark` was taken.
 */
function summary(mark, label, detail) {
  if (defects.length === mark) ok(label, detail);
  else {
    say(`  ✗ ${label}`);
    if (detail) for (const line of String(detail).split('\n')) say(`      ${line}`);
  }
}

/** A measurement that is not a verdict — how much the agreement is worth. */
function measure(text) {
  movements.push(text);
  for (const line of String(text).split('\n')) say(`      ${line}`);
}

function fatal(message) {
  console.error(`\n${message}\n`);
  process.exit(2);
}

// ── normalisation ──────────────────────────────────────────────────────────

/**
 * Whitespace, and the case of a `SELECT` keyword that opens a sub-select.
 * Nothing else. This does not parse SQL — it collapses the two things
 * Postgres's own printer varies between an equivalent source and its
 * re-print, and leaves every other character alone.
 *
 * Caveat, stated rather than hidden: a `(select` sequence inside a string
 * literal would be uppercased too. No predicate in the 67 contains one; if
 * one ever does, the comparison fails as `predicate_unexplained` rather than
 * passing wrongly.
 */
function norm(sql) {
  return String(sql)
    .replace(/\s+/g, ' ')
    .replace(/\(\s*select\b/gi, '(SELECT')
    .trim();
}

// ── T2: the five enumerated left-hand sides ────────────────────────────────

/**
 * Each entry is the **exact** normalised string as `pg_policies` prints it,
 * taken from the committed pre-phase B1. `P1` and `P3` differ by a `status`
 * check and `32-PATTERNS.md` calls collapsing them the phase's single
 * highest-risk mapping — so they are two entries, never one pattern.
 *
 * P5 carries its wrapping parentheses because it is a fragment of a larger
 * `AND`, and Postgres prints one parenthesis level around each operand: the
 * replacement `(SELECT private.has_capability('x') AS has_capability)` sits
 * at that same level.
 */
const T2_LEFT_HAND_SIDES = [
  {
    id: 'P1',
    what: 'is_admin_or_organizer() — role only, status ignored (34 policies)',
    text: '(SELECT is_admin_or_organizer() AS is_admin_or_organizer)',
  },
  {
    id: 'P2',
    what: 'is_master() — master only, via the helper',
    text: '(SELECT is_master() AS is_master)',
  },
  {
    id: 'P3',
    what: "inline EXISTS on profiles — role IN (organizer, master) AND status = 'approved'",
    text:
      "(EXISTS (SELECT 1 FROM profiles WHERE ((profiles.id = auth.uid()) AND " +
      "(profiles.role = ANY (ARRAY['organizer'::text, 'master'::text])) AND " +
      "(profiles.status = 'approved'::text))))",
  },
  {
    id: 'P4',
    what: 'inline EXISTS on profiles — role = master, no status',
    text:
      "(EXISTS (SELECT 1 FROM profiles WHERE ((profiles.id = auth.uid()) AND " +
      "(profiles.role = 'master'::text))))",
  },
  {
    id: 'P5',
    what: "get_user_status() = 'approved' — status only, role irrelevant",
    text: "((SELECT get_user_status() AS get_user_status) = 'approved'::text)",
  },
];

const T1_TOKEN = 'auth.uid()';

/** Sentinels. Chosen outside anything SQL can legally contain. */
const SENTINEL_T2 = '\u0001';
const SENTINEL_T1 = '\u0002';

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * `(select auth.uid())` as written, or `( SELECT auth.uid() AS uid)` as
 * Postgres re-prints it. Two alternatives, both anchored — not a wildcard.
 */
const T1_RIGHT_HAND_SIDE = '\\(SELECT auth\\.uid\\(\\)(?: AS [a-z_][a-z0-9_]*)?\\)';

/**
 * `(select private.has_capability('<key>'))` as written, or
 * `( SELECT private.has_capability('<key>'::text) AS has_capability)` as
 * re-printed. The key is the only free variable, and it is captured so the
 * run can report the capability-to-policy mapping as a by-product — the phase
 * gate needs that mapping and it must be derived from the applied database,
 * never hand-maintained.
 */
const T2_RIGHT_HAND_SIDE =
  "\\(SELECT private\\.has_capability\\('([A-Za-z0-9_.]+)'(?:::text)?\\)(?: AS [a-z_][a-z0-9_]*)?\\)";

/** Every index at which `needle` occurs in `haystack`, non-overlapping. */
function occurrences(haystack, needle) {
  const found = [];
  let from = 0;
  for (;;) {
    const at = haystack.indexOf(needle, from);
    if (at === -1) return found;
    found.push(at);
    from = at + needle.length;
  }
}

/** Every non-empty-through-full subset of `items`, ordered by size ascending. */
function subsetsBySize(items) {
  const out = [];
  for (let mask = 0; mask < 1 << items.length; mask += 1) {
    const picked = items.filter((_, i) => mask & (1 << i));
    out.push(picked);
  }
  out.sort((a, b) => a.length - b.length);
  return out;
}

const MAX_CANDIDATES = 4096;

/**
 * Can `after` be reached from `before` by applying the whitelist, and only
 * the whitelist?
 *
 * Returns `{ transformations, t2 }` on success — `transformations` is a set
 * of `'T1'` / `'T2'`, `t2` is the list of `{ lhs, key }` replacements — or
 * `null` when the after predicate is not reachable, which is a defect.
 *
 * The search prefers the **fewest** transformations that explain the change,
 * so an unchanged predicate is reported as unchanged rather than as a
 * vacuously-satisfied transformation.
 */
function explainPredicate(beforeRaw, afterRaw) {
  if (beforeRaw == null && afterRaw == null) return { transformations: [], t2: [] };
  if (beforeRaw == null || afterRaw == null) return null;

  const before = norm(beforeRaw);
  const after = norm(afterRaw);

  // Every legal T2 site in the before predicate, longest left-hand side
  // first so that a fragment nested inside another is never split.
  const sites = [];
  const claimed = [];
  const byLength = [...T2_LEFT_HAND_SIDES].sort((a, b) => b.text.length - a.text.length);
  for (const lhs of byLength) {
    for (const at of occurrences(before, lhs.text)) {
      const end = at + lhs.text.length;
      if (claimed.some(([s, e]) => at < e && s < end)) continue;
      claimed.push([at, end]);
      sites.push({ lhs, at, end });
    }
  }

  const uidSites = occurrences(before, T1_TOKEN);
  const total = 2 ** sites.length * 2 ** uidSites.length;
  if (total > MAX_CANDIDATES) {
    return { tooComplex: total };
  }

  for (const t2Picked of subsetsBySize(sites)) {
    // Substitute the chosen T2 sites right-to-left so earlier indices stay valid.
    let withT2 = before;
    for (const site of [...t2Picked].sort((a, b) => b.at - a.at)) {
      withT2 = withT2.slice(0, site.at) + SENTINEL_T2 + withT2.slice(site.end);
    }

    // `auth.uid()` occurrences that survived T2 — the ones inside a replaced
    // EXISTS body are gone, which is why T2 is applied first.
    const survivingUid = occurrences(withT2, T1_TOKEN);

    for (const t1Picked of subsetsBySize(survivingUid)) {
      let candidate = withT2;
      for (const at of [...t1Picked].sort((a, b) => b - a)) {
        candidate = candidate.slice(0, at) + SENTINEL_T1 + candidate.slice(at + T1_TOKEN.length);
      }

      const pattern = escapeRe(candidate)
        .split(escapeRe(SENTINEL_T2))
        .join(T2_RIGHT_HAND_SIDE)
        .split(escapeRe(SENTINEL_T1))
        .join(T1_RIGHT_HAND_SIDE);

      const match = new RegExp(`^${pattern}$`).exec(after);
      if (!match) continue;

      const keys = match.slice(1);
      const transformations = [];
      if (t1Picked.length) transformations.push('T1');
      if (t2Picked.length) transformations.push('T2');
      return {
        transformations,
        t2: t2Picked
          .sort((a, b) => a.at - b.at)
          .map((site, i) => ({ lhs: site.lhs.id, what: site.lhs.what, key: keys[i] })),
      };
    }
  }
  return null;
}

// ── artefact loading ───────────────────────────────────────────────────────

function loadArtefact(path, expectedId, side) {
  if (!existsSync(path)) {
    fatal(
      `FATAL: the ${side} ${expectedId} artefact does not exist at ${relative(ROOT, path)}.\n` +
        'Nothing was compared. Capture it first with `npm run baseline:rls`.'
    );
  }
  let parsed;
  try {
    parsed = JSON.parse(readFileSync(path, 'utf8'));
  } catch (error) {
    fatal(`FATAL: ${relative(ROOT, path)} is not readable JSON — ${error.message}. Nothing was compared.`);
  }
  if (parsed.artefact !== expectedId) {
    fatal(
      `FATAL: ${relative(ROOT, path)} declares artefact "${parsed.artefact}", not ${expectedId}. ` +
        'Comparing two different artefacts would produce a meaningless verdict. Nothing was compared.'
    );
  }
  return parsed;
}

/**
 * Two captures of two different targets are not a before and an after.
 * Refused as an environment error rather than reported as 67 defects.
 */
function assertSameTarget(id, before, after) {
  if (before.target !== after.target) {
    fatal(
      `FATAL: ${id} before was captured against "${before.target}" and after against ` +
        `"${after.target}". Those are two databases, not two moments. Nothing was compared.`
    );
  }
}

const key = (...parts) => parts.join('␟');

// ── B1 — the policy set and its predicates ─────────────────────────────────

function compareB1(before, after) {
  say('\nB1 — the policy set');
  assertSameTarget('B1', before, after);

  const index = (artefact) => {
    const map = new Map();
    for (const row of artefact.rows) map.set(key(row.tablename, row.policyname, row.cmd), row);
    return map;
  };
  const b = index(before);
  const a = index(after);

  // ── structural first, before a single predicate is read (D-24) ──────────
  const onlyBefore = [...b.keys()].filter((k) => !a.has(k));
  const onlyAfter = [...a.keys()].filter((k) => !b.has(k));

  // A rename destroys the comparison itself: B1 joins on `policyname`, so a
  // renamed policy reads as one dropped and one added, and every predicate
  // under it silently stops being compared.
  const renamed = [];
  for (const kb of [...onlyBefore]) {
    const rb = b.get(kb);
    for (const ka of onlyAfter) {
      const ra = a.get(ka);
      if (ra.tablename !== rb.tablename || ra.cmd !== rb.cmd) continue;
      if (norm(ra.qual ?? '') !== norm(rb.qual ?? '')) continue;
      if (norm(ra.with_check ?? '') !== norm(rb.with_check ?? '')) continue;
      renamed.push([rb, ra]);
      onlyBefore.splice(onlyBefore.indexOf(kb), 1);
      onlyAfter.splice(onlyAfter.indexOf(ka), 1);
      break;
    }
  }

  for (const [rb, ra] of renamed) {
    defect(
      'policy_renamed',
      `${rb.tablename}.${rb.policyname} (${rb.cmd})`,
      `renamed to "${ra.policyname}". D-24: predicates are replaced in place under the ` +
        'existing name, whatever a naming convention would have preferred — B1 joins on\n' +
        'policyname, so a rename destroys the comparison rather than appearing in it.'
    );
  }
  for (const k of onlyBefore) {
    const row = b.get(k);
    defect(
      'policy_dropped',
      `${row.tablename}.${row.policyname} (${row.cmd})`,
      'present in the before capture, absent from the after. D-24: a dropped policy is a defect ' +
        'regardless of predicates.'
    );
  }
  for (const k of onlyAfter) {
    const row = a.get(k);
    defect(
      'policy_added',
      `${row.tablename}.${row.policyname} (${row.cmd})`,
      'absent from the before capture, present in the after. Permissive policies are OR’d ' +
        '(supabase-data.md, gate RLS contestuale), so an added policy widens.'
    );
  }

  // ── the roles and permissive columns ────────────────────────────────────
  //
  // The plan's task 1 says `event_media_insert_member` is the one policy in
  // the set carrying `TO authenticated`. Measured on the committed baseline:
  // **20** of the 67 carry a non-`public` roles list. The column is even less
  // decorative than the plan supposed, so it is compared on every surviving
  // triple. Recorded as a deviation in `32-05-SUMMARY.md`.
  let rolesChecked = 0;
  for (const [k, rb] of b) {
    const ra = a.get(k);
    if (!ra) continue;
    rolesChecked += 1;
    const rolesBefore = JSON.stringify(rb.roles);
    const rolesAfter = JSON.stringify(ra.roles);
    if (rolesBefore !== rolesAfter) {
      defect(
        'roles_changed',
        `${rb.tablename}.${rb.policyname} (${rb.cmd})`,
        `TO clause moved: ${rolesBefore} → ${rolesAfter}. Widening or narrowing the role list ` +
          'changes who the policy applies to before any predicate is evaluated.'
      );
    }
    if (rb.permissive !== ra.permissive) {
      defect(
        'permissive_changed',
        `${rb.tablename}.${rb.policyname} (${rb.cmd})`,
        `${rb.permissive} → ${ra.permissive}. PERMISSIVE policies are OR’d and RESTRICTIVE ` +
          'ones are AND’d: flipping one inverts how it combines with every other policy on the table.'
      );
    }
    if (rb.schemaname !== ra.schemaname) {
      defect(
        'schema_changed',
        `${rb.tablename}.${rb.policyname} (${rb.cmd})`,
        `${rb.schemaname} → ${ra.schemaname}.`
      );
    }
  }

  // ── the supporting counts ───────────────────────────────────────────────
  //
  // `rls_enabled_tables` is not decoration. A table with RLS switched off
  // shows **no** policy change at all — its policies survive verbatim and stop
  // being enforced. That is the largest possible widening and the one this
  // artefact could otherwise miss entirely.
  const scb = before.supporting_counts ?? {};
  const sca = after.supporting_counts ?? {};
  for (const name of ['policy_count', 'rls_enabled_tables']) {
    if (scb[name] !== sca[name]) {
      defect(
        'supporting_count_changed',
        name,
        `${scb[name]} → ${sca[name]}. ` +
          (name === 'rls_enabled_tables'
            ? 'A table whose RLS is switched off keeps every policy row and enforces none of them.'
            : 'The policy set changed size.')
      );
    }
  }

  // ── predicates ──────────────────────────────────────────────────────────
  const tally = { unchanged: 0, T1: 0, T2: 0, both: 0, unexplained: 0 };
  const mapping = [];
  // A tally alone would say "1 by T1" without saying which policy. The name is
  // the part a human has to check against the migration, so it is printed.
  const transformed = [];

  for (const [k, rb] of b) {
    const ra = a.get(k);
    if (!ra) continue;
    const used = new Set();
    let failed = false;

    for (const clause of ['qual', 'with_check']) {
      const result = explainPredicate(rb[clause], ra[clause]);
      if (result && result.tooComplex) {
        defect(
          'predicate_too_complex',
          `${rb.tablename}.${rb.policyname} (${rb.cmd}) ${clause}`,
          `${result.tooComplex} whitelist candidates exceeds the ${MAX_CANDIDATES} cap. ` +
            'Refused rather than truncated — a truncated search would report "unexplained" for a\n' +
            'predicate it never finished examining, which is a false defect dressed as a real one.'
        );
        failed = true;
        continue;
      }
      if (!result) {
        defect(
          'predicate_unexplained',
          `${rb.tablename}.${rb.policyname} (${rb.cmd}) ${clause}`,
          `before: ${rb[clause] === null ? '(null)' : norm(rb[clause])}\n` +
            `after : ${ra[clause] === null ? '(null)' : norm(ra[clause])}\n` +
            'Not reachable by T1 or T2. Exactly two transformations are legal (D-23); a third ' +
            'needs a written decision in 32-VERIFICATION.md, not a looser whitelist.'
        );
        failed = true;
        continue;
      }
      for (const t of result.transformations) used.add(t);
      for (const entry of result.t2) {
        mapping.push({
          table: rb.tablename,
          policy: rb.policyname,
          cmd: rb.cmd,
          clause,
          lhs: entry.lhs,
          key: entry.key,
        });
      }
    }

    if (failed) {
      tally.unexplained += 1;
    } else if (used.size === 0) {
      tally.unchanged += 1;
    } else {
      const label = used.has('T1') && used.has('T2') ? 'T1+T2' : used.has('T1') ? 'T1' : 'T2';
      if (label === 'T1+T2') tally.both += 1;
      else if (label === 'T1') tally.T1 += 1;
      else tally.T2 += 1;
      transformed.push({ label, where: `${rb.tablename}.${rb.policyname} (${rb.cmd})` });
    }
  }

  const clean =
    tally.unexplained === 0 &&
    onlyBefore.length === 0 &&
    onlyAfter.length === 0 &&
    renamed.length === 0;

  if (clean && defects.length === 0) {
    ok(
      `B1 — ${b.size} policies, every difference explained by the whitelist`,
      `${tally.unchanged} unchanged · ${tally.T1} by T1 · ${tally.T2} by T2 · ` +
        `${tally.both} by both · ${tally.unexplained} unexplained\n` +
        `${rolesChecked} roles/permissive pairs compared · ` +
        `policy_count ${sca.policy_count} · rls_enabled_tables ${sca.rls_enabled_tables}`
    );
  } else {
    say(
      `      ${tally.unchanged} unchanged · ${tally.T1} by T1 · ${tally.T2} by T2 · ` +
        `${tally.both} by both · ${tally.unexplained} unexplained`
    );
  }

  if (transformed.length) {
    say('\n      transformed, policy by policy:');
    for (const t of transformed.sort((x, y) => x.where.localeCompare(y.where))) {
      say(`        ${t.label.padEnd(6)} ${t.where}`);
    }
  }

  if (mapping.length) {
    say('\n      capability → policy, derived from the applied database:');
    for (const m of mapping.sort((x, y) => key(x.key, x.table, x.policy).localeCompare(key(y.key, y.table, y.policy)))) {
      say(`        ${m.key.padEnd(24)} ${m.lhs}  ${m.table}.${m.policy} (${m.cmd} ${m.clause})`);
    }
  }
}

// ── B2 — the persona read matrix ───────────────────────────────────────────

function compareB2(before, after) {
  say('\nB2 — the persona read matrix');
  const mark = defects.length;
  assertSameTarget('B2', before, after);

  const index = (artefact) => {
    const map = new Map();
    for (const row of artefact.rows) map.set(key(row.persona, row.table), row);
    return map;
  };
  const b = index(before);
  const a = index(after);

  for (const k of b.keys()) {
    if (a.has(k)) continue;
    const row = b.get(k);
    defect(
      'b2_cell_missing',
      `${row.persona} × ${row.table}`,
      'measured before, absent after. The target must not change between captures.'
    );
  }
  for (const k of a.keys()) {
    if (b.has(k)) continue;
    const row = a.get(k);
    defect(
      'b2_cell_added',
      `${row.persona} × ${row.table}`,
      'absent before, measured after. The target must not change between captures.'
    );
  }

  let vacuousBoth = 0;
  let compared = 0;
  for (const [k, rb] of b) {
    const ra = a.get(k);
    if (!ra) continue;
    compared += 1;
    if (rb.count !== ra.count) {
      defect(
        'b2_count_changed',
        `${rb.persona} × ${rb.table}`,
        `${rb.count} → ${ra.count} rows visible. ` +
          (ra.count > rb.count ? 'This persona now sees MORE.' : 'This persona now sees FEWER.')
      );
    } else if (rb.pk_md5 !== ra.pk_md5) {
      // Same count, different rows. This is the change a count-only
      // comparison would miss entirely.
      defect(
        'b2_fingerprint_changed',
        `${rb.persona} × ${rb.table}`,
        `count unchanged at ${rb.count}, but the primary-key fingerprint moved:\n` +
          `${rb.pk_md5} → ${ra.pk_md5}\n` +
          'The policy shows a different set of rows, not a different number of them.'
      );
    } else if (rb.vacuous !== ra.vacuous) {
      // Not a widening — a data change. Naming it precisely matters: two
      // matrices captured over different data are not a before and an after,
      // and collapsing this into "widened" would be a lie in the other
      // direction.
      defect(
        'b2_vacuity_changed',
        `${rb.persona} × ${rb.table}`,
        `count and fingerprint identical (${rb.count} rows), but vacuous went ` +
          `${rb.vacuous} → ${ra.vacuous}. A cell is vacuous only when the persona saw nothing ` +
          'AND the table is globally empty, so this says the table’s population changed\n' +
          'between the two captures. That is not a policy change — it is the two captures no ' +
          'longer measuring the same database, which is worse, because it invalidates every\n' +
          'other cell’s agreement.'
      );
    }
    if (rb.vacuous && ra.vacuous) vacuousBoth += 1;
  }

  // The persona resolution list. A persona that was never resolved has
  // nothing but empty cells, and an agreement over those proves nothing.
  const pb = new Map((before.personas ?? []).map((p) => [p.persona, p.resolved]));
  const pa = new Map((after.personas ?? []).map((p) => [p.persona, p.resolved]));
  for (const [persona, resolved] of pb) {
    if (!pa.has(persona)) {
      defect('b2_persona_missing', persona, 'present in the before capture, absent from the after.');
    } else if (pa.get(persona) !== resolved) {
      defect(
        'b2_persona_resolution_changed',
        persona,
        `resolved ${resolved} → ${pa.get(persona)}. The set of personas the target can hold ` +
          'changed, so the two matrices do not cover the same ground.'
      );
    }
  }
  for (const persona of pa.keys()) {
    if (!pb.has(persona)) {
      defect('b2_persona_added', persona, 'absent from the before capture, present in the after.');
    }
  }

  const resolved = [...pa.values()].filter(Boolean).length;
  const pct = compared ? ((vacuousBoth / compared) * 100).toFixed(1) : '0.0';
  summary(
    mark,
    `B2 — ${compared} cells compared`,
    `${resolved}/${pa.size} personas resolved on this target`
  );
  measure(
    `B2 vacuous fraction: ${vacuousBoth}/${compared} (${pct}%) agreed with a count of zero on a ` +
      'globally empty table — that agreement has nothing to do with a policy, and it is the ' +
      'honest measure of how much the rest is worth.'
  );
}

// ── B3 — the persona write matrix ──────────────────────────────────────────

/** `ok:<n>` means the write was permitted; anything else is a SQLSTATE. */
const permitted = (result) => String(result).startsWith('ok:');

function compareB3(before, after) {
  say('\nB3 — the persona write matrix');
  const mark = defects.length;
  assertSameTarget('B3', before, after);

  const index = (artefact) => {
    const map = new Map();
    for (const row of artefact.rows) map.set(key(row.persona, row.table, row.verb), row);
    return map;
  };
  const b = index(before);
  const a = index(after);

  for (const k of b.keys()) {
    if (a.has(k)) continue;
    const r = b.get(k);
    defect('b3_cell_missing', `${r.persona} × ${r.table} × ${r.verb}`, 'probed before, absent after.');
  }
  for (const k of a.keys()) {
    if (b.has(k)) continue;
    const r = a.get(k);
    defect('b3_cell_added', `${r.persona} × ${r.table} × ${r.verb}`, 'absent before, probed after.');
  }

  let compared = 0;
  let inconclusive = 0;
  let absent = 0;
  for (const [k, rb] of b) {
    const ra = a.get(k);
    if (!ra) continue;
    compared += 1;
    // Two very different reasons a cell proves nothing, and collapsing them
    // would flatter the target that has fewer personas. `absent` means the
    // persona does not exist on this target and no probe was ever sent;
    // everything else inconclusive means a probe ran and a constraint, not a
    // policy, produced the answer.
    if (rb.result === 'absent' && ra.result === 'absent') absent += 1;
    else if (!rb.conclusive_for_rls || !ra.conclusive_for_rls) inconclusive += 1;

    if (rb.result !== ra.result) {
      const wasPermitted = permitted(rb.result);
      const isPermitted = permitted(ra.result);
      let direction;
      if (!wasPermitted && isPermitted) {
        direction =
          'WIDENING — the database refused this write before and permits it now. This is the ' +
          'exact shape CAP-03 forbids.';
      } else if (wasPermitted && !isPermitted) {
        direction =
          'NARROWING — the database permitted this write before and refuses it now. Narrowing ' +
          'is a defect too: CAP-03 says neither more nor less.';
      } else if (wasPermitted && isPermitted) {
        // Both accepted, different row counts. On an UPDATE or a DELETE that
        // is the USING clause changing which rows it matches — a widening or
        // a narrowing that never raises a SQLSTATE, and therefore the one a
        // comparator looking only at "permitted vs refused" would wave through.
        const wasRows = Number(String(rb.result).slice(3));
        const isRows = Number(String(ra.result).slice(3));
        direction =
          (isRows > wasRows
            ? 'WIDENING WITHOUT AN ERROR — the statement was accepted both times, but it now '
            : 'NARROWING WITHOUT AN ERROR — the statement was accepted both times, but it now ') +
          `affects ${isRows} rows instead of ${wasRows}. On an UPDATE or a DELETE that is the ` +
          'USING clause matching a different set of rows.\nNo SQLSTATE is raised either way, so ' +
          'this is the change a permitted-vs-refused comparison would wave through.';
      } else {
        direction =
          'the SQLSTATE changed. Two refusals are not the same fact: 42P17 (recursion) and ' +
          '42501 (denied) are different behaviours, and collapsing them would hide exactly\n' +
          'the change D-32-A leaves to the owner.';
      }
      defect(
        'b3_result_changed',
        `${rb.persona} × ${rb.table} × ${rb.verb}`,
        `${rb.result} → ${ra.result}\n${direction}`
      );
    } else if (rb.conclusive_for_rls !== ra.conclusive_for_rls) {
      defect(
        'b3_conclusiveness_changed',
        `${rb.persona} × ${rb.table} × ${rb.verb}`,
        `result identical (${rb.result}) but conclusive_for_rls went ` +
          `${rb.conclusive_for_rls} → ${ra.conclusive_for_rls}. The cell means something ` +
          'different from what it meant before.'
      );
    }
  }

  // The after capture's own safety clauses. A probe run whose rollbacks did
  // not hold, or whose row counts moved, is not evidence of anything — and
  // its cells would be compared as if they were.
  const guarantee = after.rollback_guarantee;
  if (guarantee) {
    if (guarantee.every_string_ends_in_rollback !== true) {
      defect(
        'b3_rollback_guarantee_broken',
        'after capture',
        'every_string_ends_in_rollback is not true. The after matrix was produced by probes ' +
          'that may have committed. It cannot be compared.'
      );
    }
    if (guarantee.row_counts_unchanged !== true) {
      defect(
        'b3_row_counts_moved',
        'after capture',
        'row_counts_unchanged is not true. The probes changed the database they were measuring.'
      );
    }
  }

  const probed = compared - absent;
  const conclusive = probed - inconclusive;
  const pct = compared ? ((absent + inconclusive) / compared) * 100 : 0;
  summary(mark, `B3 — ${compared} cells compared`);
  measure(
    `B3 proves nothing on ${absent + inconclusive}/${compared} cells (${pct.toFixed(1)}%): ` +
      `${absent} where the persona does not exist on this target and no probe was ever sent, ` +
      `and ${inconclusive} where a probe ran but a constraint — not a policy — answered.\n` +
      `${conclusive} of ${compared} cells carry real evidence.`
  );
}

// ── B5 — the independent oracle ────────────────────────────────────────────

function compareB5(before, after, { expectInitplan, allowLintMove }) {
  say('\nB5 — the advisor, an oracle that has never read this plan');
  assertSameTarget('B5', before, after);

  const index = (artefact) => {
    const map = new Map();
    for (const row of artefact.rows) map.set(row.name, row);
    return map;
  };
  const b = index(before);
  const a = index(after);

  /**
   * An ABSENT lint is a lint with a count of ZERO.
   *
   * Measured on this project, 2026-08-06, comparing the post-07 and post-09
   * advisor captures: `auth_rls_initplan` reads 20 in one and is **not present
   * at all** in the other, while the seven other lints are present in both. The
   * Supabase advisor emits a row per lint only when that lint has at least one
   * entity; it does not emit a zero.
   *
   * Before this was measured, the comparator read an absent lint as
   * `undefined`, so `--expect-initplan=0` — the terminal state CAP-06 requires,
   * and the only state in which the advisor names none of the 26 — could not be
   * satisfied by any database. The expectation was unreachable, not merely
   * awkward to state.
   *
   * **This is expressive, not permissive, and every branch below is stricter or
   * equal after the change:**
   *
   *   * `--expect-initplan=n` still asserts equality with a stated `n`. `0` now
   *     means what it says instead of never matching.
   *   * a PINNED lint that disappears now reads `46 → 0` and is still
   *     `b5_pinned_lint_moved`, where before it was `b5_lint_missing` — same
   *     defect, better sentence.
   *   * any other lint that disappears now falls into the general movement
   *     check as `n → 0`, so it still needs `--allow-lint-move` and a written
   *     reason. Nothing became automatically forgivable.
   *
   * A lint kind absent BEFORE and present after is still reported separately as
   * `b5_lint_added`, because a new kind of finding is a different event from a
   * count that grew.
   */
  const countOf = (map, name) => (map.has(name) ? map.get(name).count : 0);

  for (const name of a.keys()) {
    if (!b.has(name)) {
      defect('b5_lint_added', name, `absent before, ${a.get(name).count} after — a new lint kind appeared.`);
    }
  }

  // ── the intended movement ───────────────────────────────────────────────
  const initBefore = countOf(b, 'auth_rls_initplan');
  const initAfter = countOf(a, 'auth_rls_initplan');
  const initAfterHow = a.has('auth_rls_initplan')
    ? ''
    : ' (the advisor no longer reports the lint at all, which is how it says zero)';
  if (expectInitplan === 'unchanged') {
    if (initBefore !== initAfter) {
      defect(
        'b5_initplan_moved',
        'auth_rls_initplan',
        `${initBefore} → ${initAfter}, but --expect-initplan=unchanged was stated.`
      );
    } else {
      ok(`auth_rls_initplan unchanged at ${initAfter}, as stated`);
    }
  } else {
    const expected = Number(expectInitplan);
    if (initAfter !== expected) {
      defect(
        'b5_initplan_unexpected',
        'auth_rls_initplan',
        `${initBefore} → ${initAfter}, but --expect-initplan=${expected} was stated. ` +
          'The wrap migration is the only thing that may move this number, and it must move it ' +
          'all the way.'
      );
    } else {
      ok(`auth_rls_initplan ${initBefore} → ${initAfter}, as stated${initAfterHow}`);
    }
  }

  // ── the required stillness ──────────────────────────────────────────────
  for (const name of PINNED_LINTS) {
    const cb = countOf(b, name);
    const ca = countOf(a, name);
    if (cb !== ca) {
      defect(
        'b5_pinned_lint_moved',
        name,
        `${cb} → ${ca}. This lint is structural. Movement means the policy SET was restructured ` +
          'rather than its predicates replaced — which is the failure the independent oracle\n' +
          'exists to catch.'
      );
    }
  }

  // ── everything else ─────────────────────────────────────────────────────
  //
  // Over the UNION of both sides, not over `after` alone: a lint that vanished
  // is a movement to zero and must be explained like any other. Iterating only
  // `after` would skip it, which is exactly the case that reached zero here.
  const governed = new Set(['auth_rls_initplan', ...PINNED_LINTS]);
  for (const name of new Set([...b.keys(), ...a.keys()])) {
    if (governed.has(name)) continue;
    // Absent BEFORE is a new kind of finding, already reported as
    // b5_lint_added; reporting it again as a movement would double-count it.
    if (!b.has(name)) continue;
    const cb = countOf(b, name);
    const ca = countOf(a, name);
    if (cb === ca) continue;
    const how = a.has(name) ? '' : ' (the lint is no longer reported at all)';
    const reason = LINT_MOVES_ALWAYS_ALLOWED[name];
    if (reason) {
      measure(`${name} ${cb} → ${ca}${how} — not pinned: ${reason}`);
    } else if (allowLintMove.includes(name)) {
      measure(`${name} ${cb} → ${ca}${how} — allowed by --allow-lint-move=${name}`);
    } else {
      defect(
        'b5_lint_moved',
        name,
        `${cb} → ${ca}${how}. Every advisor movement needs an explanation. ` +
          `If this one is intended, state it: --allow-lint-move=${name}, and write the reason\n` +
          'into 32-VERIFICATION.md. A comparator that guesses is a comparator that excuses.'
      );
    }
  }

  // ── the two standing configuration invariants ───────────────────────────
  //
  // Both live in the Supabase dashboard, outside git. Nothing in the
  // repository would notice if either changed, so they are asserted on every
  // run rather than only at the phase gate (T-32-05-04).
  const ib = before.invariants ?? {};
  const ia = after.invariants ?? {};

  if (ia.hook_custom_access_token_enabled !== false) {
    defect(
      'b5_auth_hook_enabled',
      'hook_custom_access_token_enabled',
      `is ${JSON.stringify(ia.hook_custom_access_token_enabled)}, expected false. ` +
        'CAP-04 promises a grant takes effect on the NEXT REQUEST with no session or token\n' +
        'refresh. A custom access-token hook puts the answer inside the JWT, where it lives ' +
        `until the token expires — ${ia.jwt_exp ?? 'jwt_exp'} seconds of stale authority.\n` +
        'CAP-04 would break silently: nothing would error, grants would simply arrive late.'
    );
  } else if (ib.hook_custom_access_token_enabled !== false) {
    defect(
      'b5_auth_hook_changed',
      'hook_custom_access_token_enabled',
      `${JSON.stringify(ib.hook_custom_access_token_enabled)} → false. It is correct now and ` +
        'was not before; say so deliberately rather than absorbing it.'
    );
  } else {
    ok('hook_custom_access_token_enabled still false — CAP-04 reads live, not from the token');
  }

  if (ia.db_schema !== 'public,graphql_public') {
    defect(
      'b5_db_schema_changed',
      'db_schema',
      `is ${JSON.stringify(ia.db_schema)}, expected "public,graphql_public". D-06 rests on it: ` +
        'the `private` schema is unreachable through PostgREST only because it is not in this\n' +
        'list. Adding it there would expose the capability catalogue to any client with an anon key.'
    );
  } else if (ib.db_schema !== ia.db_schema) {
    defect('b5_db_schema_before_differs', 'db_schema', `${JSON.stringify(ib.db_schema)} → ${JSON.stringify(ia.db_schema)}.`);
  } else {
    ok('db_schema still "public,graphql_public" — the private schema stays unreachable (D-06)');
  }
}

// ── CLI ────────────────────────────────────────────────────────────────────

function parseArgs(argv) {
  const options = {
    only: [...KNOWN_ARTEFACTS],
    target: 'production',
    beforeDir: BASELINE_DIR,
    afterDir: null,
    beforePoint: 'pre',
    afterPoint: 'pre',
    before: null,
    after: null,
    expectInitplan: null,
    allowLintMove: [],
  };

  for (const arg of argv) {
    const at = arg.indexOf('=');
    const flag = at === -1 ? arg : arg.slice(0, at);
    const value = at === -1 ? undefined : arg.slice(at + 1);
    switch (flag) {
      case '--only':
        options.only = String(value ?? '')
          .split(',')
          .map((s) => s.trim().toUpperCase())
          .filter(Boolean);
        break;
      case '--target':
        options.target = value;
        break;
      case '--before':
        options.before = value;
        break;
      case '--after':
        options.after = value;
        break;
      case '--before-dir':
        options.beforeDir = value;
        break;
      case '--after-dir':
        options.afterDir = value;
        break;
      case '--before-point':
        options.beforePoint = value;
        break;
      case '--after-point':
        options.afterPoint = value;
        break;
      case '--expect-initplan':
        options.expectInitplan = value;
        break;
      case '--allow-lint-move':
        options.allowLintMove = String(value ?? '')
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean);
        break;
      default:
        fatal(
          `FATAL: unknown flag ${flag}. Known flags: --only, --target, --before, --after, ` +
            '--before-dir, --after-dir, --before-point, --after-point, --expect-initplan, ' +
            '--allow-lint-move.'
        );
    }
  }

  if (!options.only.length) fatal('FATAL: --only was given with no artefact id. Nothing was compared.');
  for (const id of options.only) {
    if (!KNOWN_ARTEFACTS.includes(id)) {
      fatal(`FATAL: unknown artefact "${id}". Known: ${KNOWN_ARTEFACTS.join(', ')}.`);
    }
  }
  if (!KNOWN_TARGETS.includes(options.target)) {
    fatal(`FATAL: unknown target "${options.target}". Known: ${KNOWN_TARGETS.join(', ')}.`);
  }
  if (options.target === 'container' && options.only.includes('B5')) {
    fatal(
      'FATAL: B5 is the Supabase advisor and has no container equivalent. There is nothing to ' +
        'compare. Ask for --only=B1,B2,B3 on the container.'
    );
  }
  if ((options.before || options.after) && options.only.length !== 1) {
    fatal(
      'FATAL: --before/--after name one file each, so exactly one --only artefact must be given. ' +
        'Use --before-dir/--after-dir to compare several.'
    );
  }
  if (Boolean(options.before) !== Boolean(options.after)) {
    fatal('FATAL: --before and --after must be given together.');
  }

  // The expectation is stated by the caller, never guessed. A comparator that
  // assumes an expectation is a comparator that excuses one.
  if (options.only.includes('B5')) {
    if (options.expectInitplan === null) {
      fatal(
        'FATAL: comparing B5 requires --expect-initplan=<n>|unchanged.\n' +
          'The same comparator runs after the model migration (where 26 is still correct), after ' +
          'the capability cutover (where 20 is required) and after the wrap migration (where 0 is).\n' +
          'Stating which one you expect is the whole point; guessing it would turn the oracle ' +
          'into a rubber stamp. Nothing was compared.'
      );
    }
    // Any non-negative integer, DERIVED by the caller and stated — not an
    // enumeration of the two endpoints.
    //
    // Why this was widened, in plan 32-07: the original list was 26 | 0 |
    // unchanged, on the assumption that only the wrap migration can move this
    // number. That assumption is wrong, and `32-RESEARCH.md` § (e) class C had
    // already said so: the four `artists`/`venues` organizer policies and the
    // two master ones carry their only bare `auth.uid()` INSIDE the inline
    // EXISTS that the capability replacement deletes outright. Replacing the
    // predicate therefore removes the token with it, and the advisor moves
    // 26 → 20 in a migration that wrapped nothing.
    //
    // This is an EXPRESSIVE widening, not a permissive one. `--expect-initplan=n`
    // still asserts `initAfter === n` exactly, and a value must still be stated:
    // the alternative available to plan 32-07 was to drop B5 from the comparison
    // altogether, which would have blinded the one oracle that has never read
    // the plan — a far worse trade than letting it be told a third number.
    const expectation = String(options.expectInitplan);
    if (expectation !== 'unchanged' && !/^\d+$/.test(expectation)) {
      fatal(
        `FATAL: --expect-initplan="${options.expectInitplan}" is neither a non-negative ` +
          'integer nor the word "unchanged". The expectation must be derived from the ' +
          'post-migration predicate set and stated, never guessed.'
      );
    }
  }

  options.afterDir = options.afterDir ?? options.beforeDir;
  return options;
}

function artefactPath(dir, id, target, point) {
  const targetSuffix = target === 'container' ? '.container' : '';
  const pointSuffix = point === 'pre' ? '' : `.${point}`;
  return resolve(ROOT, dir, `32-BASELINE-${ARTEFACT_SLUG[id]}${targetSuffix}${pointSuffix}.json`);
}

const invokedDirectly =
  process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (invokedDirectly) {
  const options = parseArgs(process.argv.slice(2));

  console.log('\nrls-baseline-compare — the CAP-03 verdict\n');

  const COMPARE = { B1: compareB1, B2: compareB2, B3: compareB3, B5: compareB5 };

  for (const id of options.only) {
    const beforePath = options.before
      ? resolve(ROOT, options.before)
      : artefactPath(options.beforeDir, id, options.target, options.beforePoint);
    const afterPath = options.after
      ? resolve(ROOT, options.after)
      : artefactPath(options.afterDir, id, options.target, options.afterPoint);

    const before = loadArtefact(beforePath, id, 'before');
    const after = loadArtefact(afterPath, id, 'after');

    COMPARE[id](before, after, {
      expectInitplan: options.expectInitplan,
      allowLintMove: options.allowLintMove,
    });
    say(`      before: ${relative(ROOT, beforePath)}  (${before.captured_at}, ${before.phase_point})`);
    say(`      after : ${relative(ROOT, afterPath)}  (${after.captured_at}, ${after.phase_point})`);
  }

  // Gathered in one block at the end, the way `verify-persona.mjs` prints its
  // `misure:`. These are the numbers `32-VERIFICATION.md` has to carry — how
  // much of the agreement is vacuous, and which advisor lints moved without
  // being a defect. A verdict that did not say them would be a verdict nobody
  // could weigh.
  if (movements.length) {
    say('\n  measurements — these belong in 32-VERIFICATION.md, not only on this screen:');
    for (const m of movements) {
      for (const line of String(m).split('\n')) say(`    ${line}`);
    }
  }

  say('');
  say(
    '  Note: this script compares two captures. It does not say a policy is correct — it says ' +
      'what moved.\n  Correctness is a human judgement made against this comparison, and this ' +
      'repository has no test runner.'
  );
  say('');

  if (defects.length) {
    const kinds = [...new Set(defects.map((d) => d.kind))].sort();
    console.error(`CAP-03: ${defects.length} defects — ${kinds.join(' · ')}\n`);
    process.exit(1);
  }

  say(`CAP-03: clean — ${options.only.join(', ')} compared, nothing moved that the whitelist does not explain.\n`);
}

export { explainPredicate, norm, T2_LEFT_HAND_SIDES };
