/**
 * seed.mjs — nine personas and two differently-owned rows in every table.
 *
 * WHY THE SHAPE OF THE DATA IS THE WHOLE POINT. `32-RESEARCH.md` § *Pitfall 3*:
 * production is nearly empty, thirteen of its twenty tables hold no rows, and
 * an empty table fingerprints as `d41d8cd9…` — the md5 of the empty string — on
 * both sides of any comparison. **A policy could be inverted and that
 * fingerprint would not move.** So this file guarantees two things, and refuses
 * to hand the database to the capture if either fails:
 *
 *   1. every one of the 20 RLS tables holds **at least two** rows;
 *   2. every table that HAS an owner column holds rows owned by **two different
 *      personas** — one `member/approved`, one `master/approved`.
 *
 * Without (2) "mine" and "not mine" are indistinguishable, `auth.uid() = user_id`
 * is satisfied by everything or by nothing, and the baseline is a green screen
 * rather than evidence (threat T-32-04-03).
 *
 * WHY IT REUSES `PROBE_PAYLOADS`. The write matrix already declares, per table,
 * a minimal valid row. Declaring a second set here would let the two drift, and
 * the day they drifted the seed would populate columns the probes never touch —
 * so a probe could be refused for a reason no seeded row could exercise. One
 * declaration, two readers.
 *
 * WHY EVERY PRIMARY KEY IS EXPLICIT. B2's fingerprint is the md5 of the sorted
 * visible primary keys. `default gen_random_uuid()` would make that md5 differ
 * between two identical runs, and the determinism contract (D-15) exists so
 * that a diff between two captures means something. Every seeded key is derived
 * from `(table, row index)` and is therefore identical on every run, on every
 * machine.
 *
 * NOTHING HERE RESEMBLES A REAL MEMBER (threat T-32-04-02). Every uuid is built
 * from the literal string `32000004` plus an md5 of a table name — no value is
 * copied from production. Every address is at `.invalid`, the reserved TLD that
 * can reach no inbox. Every name is a ROLE, never a person. And every
 * membership code is one a real signup **cannot** mint: `handle_new_user()`
 * draws from `ABCDEFGHJKLMNPQRSTUVWXYZ23456789`, an alphabet with no `0` and no
 * `1`, while every code here is `RSN-SEED000<n>` — three zeroes in the middle.
 * A seeded code can therefore never collide with a member's.
 *
 * WHY THIS FILE ALSO CARRIES ROLE-02's ONLY AUTOMATED DETECTOR. Phase 43 adds a
 * database rule — a staff role implies `approved` — and four of the nine
 * personas above become unrepresentable the moment it lands. Losing them would
 * cost the sixteen write-matrix cells that caught phase 32's worst defect, so
 * the seed drops the constraint around the persona loop and restores it after
 * (D-05). Having dropped and restored it, the seed is then the one place in this
 * repository that can watch the rule refuse a write — so it does, deliberately,
 * rather than trusting the DDL. See `ROLE_IMPLIES_APPROVED` below.
 */

import { createHash } from 'node:crypto';

import {
  PERSONA_ROLES,
  PERSONA_STATUSES,
  PROBE_PAYLOADS,
  PROBE_TEXT,
  compareStrings,
  pkExpression,
  say,
  substituteReferences,
} from '../rls-baseline.mjs';

/** How many rows every non-`profiles` table gets. Two is the minimum that can discriminate. */
const ROWS_PER_TABLE = 2;

/**
 * The owner columns, in the order a table's PRIMARY owner is chosen when it has
 * more than one. Derived against the live schema rather than declared per
 * table, so a column added by a later migration cannot leave a table
 * single-owner without anyone noticing.
 */
const OWNER_COLUMN_PRIORITY = [
  'user_id',
  'uploaded_by',
  'added_by',
  'requested_by',
  'operator_id',
  'created_by',
];

/**
 * Seeding order. Not alphabetical: a foreign key has to point at a row that
 * already exists. Everything not named here is seeded afterwards, in sorted
 * order, and by then every referenced table is populated.
 */
const SEED_ORDER = ['events', 'event_parties', 'ticket_tiers', 'discount_codes', 'drink_orders'];

/** The tables a `{{placeholder}}` in a payload may point at. */
const REFERENCEABLE = [
  'discount_codes',
  'drink_orders',
  'event_parties',
  'events',
  'profiles',
  'ticket_tiers',
];

/**
 * ── The pre-registered declaration of ROLE-02's rule ──────────────────────
 *
 * WHAT IT IS. Phase 43 decision D-04: an account holding a staff role
 * (`master`, `organizer`, `staff`) is `approved` **by database rule**, not by a
 * convention four call sites remembered. Plan 43-06 adds it as a CHECK on
 * `public.profiles`.
 *
 * WHY IT IS DECLARED HERE INSTEAD OF READ. Written down, not derived from the
 * database, for the reason `verify-capabilities.mjs:107-121` gives about its own
 * constant and `rls-baseline.mjs:113-130` about its floors: **a check that reads
 * its expectation off the thing it is checking cannot fail.** The seed asserts
 * reality against this declaration and never the reverse.
 *
 * HOW IT IS MAINTAINED. `present` is `false` until plan 43-06 lands, and 43-06
 * flips it to `true` **in the same commit as the migration**. A disagreement
 * between this declaration and the container is a failure of one of the two —
 * either the migration shipped without its declaration, or the declaration
 * claims a rule the database does not hold. **It is never a reason to edit this
 * constant so a run goes green.** Editing it to silence a throw converts the
 * only automated detector ROLE-02 has into a comment. That is the same move
 * `assertDiscriminating` forbids by name below: investigate the seed, never
 * lower the requirement.
 *
 * `renderedDef` is Postgres' own printing of the constraint, measured in the
 * container by plan 43-03 task 3 and pinned here — Postgres re-prints a
 * predicate in its own normal form, so the comparison cannot be against the
 * migration's source text.
 */
const ROLE_IMPLIES_APPROVED = {
  name: 'profiles_role_implies_approved',
  /** Exactly as plan 43-06's migration writes it. */
  predicate: "role not in ('master','organizer','staff') or status = 'approved'",
  /** Flipped to `true` by plan 43-06, in the same commit as the migration. */
  present: false,
  /**
   * `pg_get_constraintdef(oid)` as production would render it — i.e. WITHOUT
   * the trailing marker a `NOT VALID` constraint carries.
   *
   * MEASURED 2026-08-08 in `postgres:17.6`, against a throwaway migration
   * carrying `predicate` above verbatim, and COPIED from the run rather than
   * composed: Postgres re-prints `role not in (…)` as `role <> ALL (ARRAY[…])`,
   * so a hand-written expectation would have been wrong in a way that looks
   * right. See `assertConstraintObject` for how the one legitimate difference
   * from production is enumerated rather than wildcarded.
   */
  renderedDef:
    "CHECK (((role <> ALL (ARRAY['master'::text, 'organizer'::text, 'staff'::text])) OR (status = 'approved'::text)))",
};

/**
 * The single tolerated difference between the container's constraint and
 * production's, spelled out instead of matched loosely.
 *
 * The restore below is `NOT VALID` — mandatory, see the `finally` — and Postgres
 * marks that in `pg_get_constraintdef` with this exact suffix. One enumerated
 * alternative, never a wildcard: `rls-baseline-compare.mjs` takes the same line,
 * because a comparison with a wildcard in it stops being able to fail.
 */
const NOT_VALID_SUFFIX = ' NOT VALID';

/**
 * The four states the rule forbids — the ones D-05 exists to keep seedable, and
 * the ones assertion 2 then proves are actually refused.
 *
 * They obey this file's identity convention exactly as the nine personas do
 * (threat T-32-04-02): an id whose first group is the literal `43000004` —
 * phase 43, plan 03 — an address at the reserved `.invalid` TLD that can reach
 * no inbox, a name that is a ROLE and never a person, and a membership code
 * `handle_new_user()` **cannot** mint, since its alphabet
 * `ABCDEFGHJKLMNPQRSTUVWXYZ23456789` contains neither `0` nor `1`.
 *
 * None of these rows is ever written: every one of the four is refused. They are
 * built to the convention anyway, because the day one of them IS written is the
 * day the rule stopped working, and on that day the row must still be
 * unmistakably synthetic.
 */
const FORBIDDEN_WRITES = [
  { role: 'organizer', status: 'pending' },
  { role: 'organizer', status: 'rejected' },
  { role: 'master', status: 'pending' },
  { role: 'master', status: 'rejected' },
].map((cell, i) => ({
  ...cell,
  label: `${cell.role}/${cell.status}`,
  id: `43000004-0000-4000-8000-${String(i + 1).padStart(12, '0')}`,
  email: `seed-forbidden-${cell.role}-${cell.status}@example.invalid`,
  fullName: `Seed Forbidden ${cell.role} ${cell.status}`,
  membershipCode: `RSN-SEED430${i + 1}`,
}));

/**
 * A deterministic, obviously synthetic uuid.
 *
 * The first group is the literal `32000004` — phase 32, plan 04 — so anyone who
 * finds one of these in a database knows immediately where it came from and
 * that it is not a member's identifier.
 */
function seedUuid(seed) {
  const h = createHash('md5').update(`rls-baseline-container:${seed}`).digest('hex');
  return `32000004-${h.slice(0, 4)}-4${h.slice(4, 7)}-8${h.slice(7, 10)}-${h.slice(10, 22)}`;
}

/** The nine grid personas, in a fixed order, with their synthetic identities. */
function buildPersonas() {
  const personas = [];
  let index = 0;
  for (const role of PERSONA_ROLES) {
    for (const status of PERSONA_STATUSES) {
      index += 1;
      const label = `${role}/${status}`;
      personas.push({
        label,
        role,
        status,
        // Readable rather than hashed: a persona uuid is read by a human far
        // more often than the row uuids are.
        id: `32000004-0000-4000-8000-${String(index).padStart(12, '0')}`,
        email: `seed-${role}-${status}@example.invalid`,
        // A ROLE, never a person. `.planning/` and this repository are public.
        fullName: `Seed Persona ${role} ${status}`,
        membershipCode: `RSN-SEED000${index}`,
      });
    }
  }
  return personas;
}

/**
 * Substitutes the probe payload's placeholders for this particular seeded row.
 *
 * `auth.uid()` is the SUBJECT in a probe. In a seed there is no subject, so it
 * becomes the owning persona's id — which is what makes row 1 and row 2
 * differently owned, and therefore what makes `auth.uid() = user_id`
 * discriminating rather than universally true or universally false.
 */
function materialise(expression, { ownerId, refs, table, index }) {
  let out = substituteReferences(expression, refs);
  out = out.split('auth.uid()').join(`'${ownerId}'::uuid`);
  out = out.split(`'rls-baseline-probe@example.invalid'`).join(`'seed-${table}-${index}@example.invalid'`);
  out = out.split(PROBE_TEXT).join(`'seed-${table}-${index}'`);
  return out;
}

/**
 * The tables a payload's `{{placeholder}}`s actually name. Anything outside
 * `REFERENCEABLE` is a typo in the payload table and is refused rather than
 * silently resolved to nothing.
 */
function referencedBy(payload) {
  const found = new Set();
  for (const value of payload.values) {
    for (const [, table] of String(value).matchAll(/\{\{([a-z_]+)\}\}/g)) {
      if (!REFERENCEABLE.includes(table)) {
        throw new Error(
          `a probe payload references "${table}", which the seed cannot provide. Known referenceable ` +
            `tables: ${REFERENCEABLE.join(', ')}.`
        );
      }
      found.add(table);
    }
  }
  return [...found].sort(compareStrings);
}

/** The constraint as the container actually holds it, or `null` if it is absent. */
async function readRoleImpliesApproved(admin) {
  const { rows } = await admin.query(
    `select pg_get_constraintdef(oid) as def, convalidated
       from pg_constraint
      where conrelid = 'public.profiles'::regclass
        and contype = 'c'
        and conname = $1`,
    [ROLE_IMPLIES_APPROVED.name]
  );
  return rows[0] ?? null;
}

/**
 * The declaration and the database must agree before a single persona is
 * inserted, and BOTH directions of disagreement are a refusal.
 *
 * The asymmetry is the point. A missing constraint when one is declared means
 * every assertion below would pass by having nothing to test. A present
 * constraint when none is declared means the seed was one statement away from
 * pushing four forbidden personas at a rule it does not know the shape of — and
 * whatever it then observed would be about an unknown object.
 */
function assertDeclarationAgrees(observed) {
  const { name, present } = ROLE_IMPLIES_APPROVED;

  if (present && !observed) {
    throw new Error(
      `the declaration says "${name}" exists on public.profiles and the container does not have it. ` +
        'Either plan 43-06 has not landed and `present` was flipped early, or a migration was removed ' +
        'while the flag stayed true. Do NOT flip the flag back to make this pass — the flag records ' +
        'what the migrations are supposed to contain. Nothing about ROLE-02 was measured.'
    );
  }

  if (!present && observed) {
    throw new Error(
      `the container holds "${name}" on public.profiles and the declaration says it does not exist. ` +
        'A migration landed without `ROLE_IMPLIES_APPROVED.present` being flipped in the same commit, ' +
        'and the four forbidden personas were about to be seeded against a rule this file does not ' +
        'know the shape of. Flip `present` to true and pin `renderedDef` from the migration; do not ' +
        'delete the constraint. Nothing about ROLE-02 was measured.'
    );
  }
}

async function ownerColumnsOf(admin) {
  const { rows } = await admin.query(
    `select c.relname as t, a.attname as col
       from pg_class c
       join pg_namespace n on n.oid = c.relnamespace
       join pg_attribute a on a.attrelid = c.oid and a.attnum > 0 and not a.attisdropped
      where n.nspname = 'public' and c.relkind = 'r' and c.relrowsecurity
        and a.attname = any($1)`,
    [OWNER_COLUMN_PRIORITY]
  );
  const byTable = new Map();
  for (const row of rows) {
    const current = byTable.get(row.t);
    const rank = OWNER_COLUMN_PRIORITY.indexOf(row.col);
    if (current === undefined || rank < OWNER_COLUMN_PRIORITY.indexOf(current)) {
      byTable.set(row.t, row.col);
    }
  }
  return byTable;
}

/**
 * Seeds the container and refuses to return a database that cannot discriminate.
 *
 * Runs as the container superuser, which is what makes seeding possible at all:
 * RLS does not apply to the owner of a table, so the seed can place rows a
 * persona would never be allowed to place — which is exactly what a write
 * matrix needs in order to have something to refuse.
 */
export async function seedContainer(admin) {
  // The table list is read with the admin client directly rather than through
  // the capture's `getTables()`: that one speaks the target protocol, and at
  // seed time no target exists yet — the pool is opened after this returns.
  const { rows: tableRows } = await admin.query(
    `select c.relname as table_name
       from pg_class c join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relkind = 'r' and c.relrowsecurity`
  );
  const allTables = tableRows.map((r) => r.table_name).sort(compareStrings);

  const missingPayloads = allTables.filter((t) => !(t in PROBE_PAYLOADS)).sort(compareStrings);
  if (missingPayloads.length) {
    throw new Error(
      `PROBE_PAYLOADS has no entry for: ${missingPayloads.join(', ')}. The seed cannot invent a row ` +
        'shape the write matrix does not declare — one declaration, two readers.'
    );
  }

  const owners = await ownerColumnsOf(admin);
  const personas = buildPersonas();
  const byLabel = new Map(personas.map((p) => [p.label, p]));
  const rowOwners = [byLabel.get('member/approved'), byLabel.get('master/approved')];

  // ── the seam ROLE-02 and ROLE-03 share ───────────────────────────────────
  //
  // Before anything is written: the declaration and the database must agree
  // about whether the rule exists at all.
  assertDeclarationAgrees(await readRoleImpliesApproved(admin));

  // Four of the nine personas below violate the rule by construction —
  // `organizer/pending`, `organizer/rejected`, `master/pending`,
  // `master/rejected`. They are the only reason phase 32's write matrix caught
  // its worst defect, sixteen cells and every one of them theirs, so D-05 keeps
  // them seedable by dropping the constraint here and restoring it in the
  // `finally` below.
  //
  // A CHECK leaves no gentler route, and that is measured rather than assumed
  // (`43-RESEARCH.md` § B.1, § B.3, all in `postgres:17.6`): a CHECK cannot be
  // DEFERRABLE, `NOT VALID` still refuses every new violating insert, and
  // neither SECURITY DEFINER, nor superuser, nor `session_replication_role =
  // 'replica'` bypasses it. Drop-and-restore is the only option that works.
  // `relaxed` is not decoration. The restore below lives in a `finally`, and an
  // exception thrown from a `finally` REPLACES the exception from the `try` —
  // so a restore attempted when no drop happened would report
  //   constraint "profiles_role_implies_approved" for relation "profiles" already exists
  // in place of the seed's real failure. Measured: that is exactly what this
  // harness printed while plan 43-03 task 3 was proving the drop necessary. A
  // path that swallows a distinguishable cause into a misleading message is the
  // pattern `meta-gates.md` forbids, so the restore is bound to the drop having
  // actually run rather than to the declaration.
  let relaxed = false;
  if (ROLE_IMPLIES_APPROVED.present) {
    await admin.query(`alter table public.profiles drop constraint "${ROLE_IMPLIES_APPROVED.name}"`);
    relaxed = true;
  }

  // ── the nine personas ────────────────────────────────────────────────────
  //
  // The trigger `on_auth_user_created` mints a membership code with `random()`.
  // It is real product behaviour and it is left installed; it is only silenced
  // for the length of the seed, because a random code would make two identical
  // runs produce two different databases and the determinism contract is what
  // makes a diff between two captures mean anything.
  await admin.query('alter table auth.users disable trigger on_auth_user_created');
  try {
    for (const p of personas) {
      await admin.query(
        `insert into auth.users (id, email, raw_user_meta_data) values ($1::uuid, $2, '{}'::jsonb)`,
        [p.id, p.email]
      );
      await admin.query(
        `insert into public.profiles (id, email, full_name, membership_code, role, status)
         values ($1::uuid, $2, $3, $4, $5, $6)`,
        [p.id, p.email, p.fullName, p.membershipCode, p.role, p.status]
      );
    }
  } finally {
    await admin.query('alter table auth.users enable trigger on_auth_user_created');

    // `NOT VALID` IS MANDATORY, and the reason is measured rather than reasoned:
    // by the time this line runs, four of the rows just seeded violate the
    // predicate, and a plain `add constraint` fails with
    //   ERROR: check constraint "…" of relation "profiles" is violated by some row
    // `[VERIFIED: postgres:17.6, 43-RESEARCH.md § B.3, and reproduced against
    // this harness by plan 43-03 task 3]`. `NOT VALID` skips the validating scan
    // of existing rows; it does NOT relax enforcement — every new violating
    // write is still refused, which is exactly what assertion 2 then proves.
    //
    // The price is real and is asserted rather than hidden: the container's
    // constraint is `convalidated = false` where production's is `true`, and no
    // capture would notice — B1 dumps policies, B2/B3 fingerprint personas, and
    // none of the three reads `pg_constraint`. See `assertConstraintObject`.
    if (relaxed) {
      await admin.query(
        `alter table public.profiles
           add constraint "${ROLE_IMPLIES_APPROVED.name}"
           check (${ROLE_IMPLIES_APPROVED.predicate})
           not valid`
      );
    }
  }

  await assertConstraintObject(admin);
  await assertForbiddenWritesRefused(admin);
  await assertProbeRowSatisfiesTheRule(admin);

  // ── every other table, two rows, two owners ──────────────────────────────
  const seededIds = new Map([['profiles', personas.map((p) => p.id)]]);
  const rest = allTables.filter((t) => t !== 'profiles' && !SEED_ORDER.includes(t)).sort(compareStrings);

  for (const table of [...SEED_ORDER, ...rest]) {
    const payload = PROBE_PAYLOADS[table].insert;
    const keys = await primaryKeyColumns(admin, table);
    const ids = [];

    for (let index = 1; index <= ROWS_PER_TABLE; index += 1) {
      const owner = rowOwners[(index - 1) % rowOwners.length];

      // Row n points at row n of every table it references, so a table whose
      // primary key IS its two foreign keys — `discount_code_tiers` — gets two
      // distinct rows instead of the same one twice.
      //
      // Only the tables this payload actually names are resolved. Resolving all
      // six would demand that `events` — the first table seeded — already have
      // a `discount_codes` row to point at.
      const refs = {};
      for (const t of referencedBy(payload)) {
        const pool = seededIds.get(t) ?? [];
        refs[t] = pool[(index - 1) % Math.max(pool.length, 1)] ?? null;
        if (!refs[t]) {
          throw new Error(
            `${table} row ${index} references ${t}, which has not been seeded yet. Fix SEED_ORDER — ` +
              'a seed that silently inserts a null foreign key produces a row no policy can be about.'
          );
        }
      }

      const columns = [...payload.columns];
      const values = payload.values.map((v) => materialise(v, { ownerId: owner.id, refs, table, index }));

      // An explicit primary key, because the fingerprint has to be stable.
      const id = seedUuid(`${table}#${index}`);
      if (keys.length === 1 && keys[0] === 'id' && !columns.includes('id')) {
        columns.unshift('id');
        values.unshift(`'${id}'::uuid`);
      }

      // The owner column when the payload does not already carry it — `events`,
      // `artists` and `venues` are owned through `created_by`, which no probe
      // sets because a probe is not trying to own anything.
      const ownerColumn = owners.get(table);
      if (ownerColumn && !columns.includes(ownerColumn)) {
        columns.push(ownerColumn);
        values.push(`'${owner.id}'::uuid`);
      }

      await admin.query(
        `insert into public."${table}" (${columns.map((c) => `"${c}"`).join(', ')}) values (${values.join(', ')})`
      );
      ids.push(id);
    }

    seededIds.set(table, ids);
  }

  return assertDiscriminating(admin, allTables, owners, personas);
}

/**
 * ── Assertion 1: the container enforces the same object production does ───
 *
 * The restore above is `NOT VALID`, and that leaves the container holding a
 * constraint that is not byte-for-byte production's: `convalidated` is `false`
 * here and `true` there (measured on production, `43-MEASUREMENTS.md`
 * measurement 2, where all four live CHECKs are validated).
 *
 * **No capture would notice.** B1 dumps policies, B2 and B3 fingerprint persona
 * visibility, and not one of the three reads `pg_constraint`. A container
 * enforcing a subtly different object than production, with every comparator
 * green, is exactly the failure `seed.mjs`'s own header calls a green screen
 * rather than evidence. So the difference is asserted here, deliberately, and
 * printed on every run.
 *
 * The comparison is against `renderedDef` — a rendering MEASURED once and pinned
 * — never against the migration's source text, because Postgres re-prints a
 * predicate in its own normal form (`role not in (…)` comes back as
 * `role <> ALL (ARRAY[…])`). And the tolerance is exactly one enumerated
 * alternative, `NOT_VALID_SUFFIX`, never a wildcard: `rls-baseline-compare.mjs`
 * enumerates its alternatives for the same reason, since a comparison with a
 * wildcard in it has stopped being able to fail.
 */
async function assertConstraintObject(admin) {
  const { name, present, renderedDef } = ROLE_IMPLIES_APPROVED;

  if (!present) {
    say(
      `      skipped: ${name} is declared absent, so the constraint read-back measured nothing ` +
        '(plan 43-06 flips `present`)'
    );
    return;
  }

  const observed = await readRoleImpliesApproved(admin);
  if (!observed) {
    throw new Error(
      `"${name}" is not on public.profiles after the restore. The \`finally\` that re-adds it did not ` +
        'run, or it ran and did not take. Every assertion about ROLE-02 below this line would pass by ' +
        'having nothing to test. Nothing was measured.'
    );
  }

  if (!renderedDef) {
    throw new Error(
      `ROLE_IMPLIES_APPROVED.renderedDef is null while \`present\` is true. Postgres renders the ` +
        'constraint as:\n' +
        `        ${observed.def}\n` +
        'Pin that string (minus the trailing marker) in the declaration — measured, never composed. ' +
        'Until it is pinned, nothing compares the container\'s constraint with production\'s.'
    );
  }

  const expected = `${renderedDef}${NOT_VALID_SUFFIX}`;
  if (observed.def !== expected) {
    throw new Error(
      `"${name}" is not the object this file declares.\n` +
        `        expected: ${expected}\n` +
        `        observed: ${observed.def}\n` +
        'One of the two is wrong: either the migration changed the predicate without the declaration ' +
        'following it, or the restore in this file drifted from the migration. Editing `renderedDef` ' +
        'to match is only correct if the migration genuinely changed — otherwise it silences the one ' +
        'check that can tell the container from production. Nothing about ROLE-02 was measured.'
    );
  }

  if (observed.convalidated !== false) {
    throw new Error(
      `"${name}" came back convalidated=${observed.convalidated} in the container, and the restore is ` +
        'written NOT VALID. Either the restore lost its NOT VALID — in which case it should have ' +
        'failed outright on the four seeded rows — or something validated it afterwards. Nothing ' +
        'about ROLE-02 was measured.'
    );
  }

  say(`      ${name} restored: ${observed.def}`);
  say(
    '      convalidated=false here, true in production — the price of the NOT VALID restore, and no ' +
      'capture reads pg_constraint, which is why it is asserted rather than compared'
  );
}

/**
 * ── Assertion 2: the rule actually refuses ────────────────────────────────
 *
 * **This is ROLE-02's ONLY automated detector in this repository**
 * (`43-VALIDATION.md`). There is no test runner for this product (CLAUDE.md
 * Guardrail 1), B1/B2/B3 do not read `pg_constraint`, and no comparator watches
 * a write get refused. Whoever is about to delete this function is deleting the
 * only mechanical evidence that D-04 is enforced at all; after that, the rule is
 * a line in a migration that somebody believes.
 *
 * The four writes are the four states D-05 keeps seedable — the same four,
 * deliberately, so that the seed both demonstrates they can be created with the
 * rule relaxed and demonstrates they cannot be created with it in force.
 *
 * WHAT IS ASSERTED, AND WHY NOT THE MESSAGE. The branch is SQLSTATE `23514`
 * (`43-MEASUREMENTS.md` measurement 5), plus the constraint's own name from the
 * error's CONSTRAINT NAME field: a `23514` raised by `profiles_status_check` or
 * `profiles_approved_via_check` would otherwise be a green for the wrong reason.
 * The predicate is checked before the foreign key to `auth.users` fires, so the
 * refusal is the CHECK's and not the FK's — `[VERIFIED: postgres:17.6,
 * ExecConstraints runs before the AFTER-row referential trigger]`, and the
 * constraint-name assertion is what keeps that measured rather than assumed.
 *
 * WHAT IS DELIBERATELY NOT PRINTED. `error.detail` on this table carries
 * `Failing row contains (…)` — every column of the offending row, membership
 * code included (`43-MEASUREMENTS.md` measurement 5). Here the row is synthetic,
 * but the habit of printing that field is the one that publishes a door
 * credential the day the same shape appears in product code. Code and
 * constraint name only.
 */
async function assertForbiddenWritesRefused(admin) {
  const { name, present } = ROLE_IMPLIES_APPROVED;

  if (!present) {
    say(
      `      skipped: ${name} is declared absent, so the four forbidden writes were not attempted and ` +
        'ROLE-02 has no automated evidence in this run'
    );
    return;
  }

  const { rows: before } = await admin.query('select count(*)::int as n from public.profiles');

  const wrong = [];
  for (const row of FORBIDDEN_WRITES) {
    let error = null;
    try {
      await admin.query(
        `insert into public.profiles (id, email, full_name, membership_code, role, status)
         values ($1::uuid, $2, $3, $4, $5, $6)`,
        [row.id, row.email, row.fullName, row.membershipCode, row.role, row.status]
      );
    } catch (caught) {
      error = caught;
    }

    if (!error) {
      wrong.push(`${row.label}: the insert SUCCEEDED`);
      continue;
    }
    if (error.code !== '23514') {
      wrong.push(`${row.label}: SQLSTATE ${error.code ?? 'none'} (expected 23514)`);
      continue;
    }
    if (error.constraint !== name) {
      wrong.push(`${row.label}: 23514 from "${error.constraint ?? 'unnamed'}" (expected "${name}")`);
      continue;
    }
    say(`      refused ${row.label.padEnd(19)} 23514 ${error.constraint}`);
  }

  if (wrong.length) {
    throw new Error(
      `the rule "${name}" did not refuse every write it forbids: ${wrong.join('; ')}. This is ` +
        "ROLE-02's only automated detector, so a failure here means the phase's central rule is not " +
        'enforced — or is enforced by a different constraint than the one declared. Do not relax the ' +
        'expectation to get past it. Nothing about ROLE-02 was measured.'
    );
  }

  const { rows: after } = await admin.query('select count(*)::int as n from public.profiles');
  if (after[0].n !== before[0].n) {
    throw new Error(
      `public.profiles held ${before[0].n} rows before the four forbidden writes and ${after[0].n} ` +
        'after. A refused insert must write nothing, so at least one of them was refused after ' +
        'landing — which would mean the grid, the fingerprints and the write matrix are all measuring ' +
        'a database with a row nobody intended. Nothing was measured.'
    );
  }

  say(`      4/4 forbidden writes refused, profiles still ${after[0].n} rows`);
}

/**
 * ── The two lines that prevent a silent eleven-cell regression ────────────
 *
 * The write matrix's `update` probe touches exactly ONE row per table:
 * `buildProbeStatement` (`rls-baseline.mjs:1270-1271`) writes
 * `where (pk) = '<key>'`, and `key` comes from `resolveProbeKeys` (`:1221-1231`)
 * as `min(pk)` — the LOWEST primary key.
 *
 * A `NOT VALID` CHECK refuses **any** update to an already-violating row,
 * including an update to a column the predicate does not mention
 * `[VERIFIED: 43-RESEARCH.md § B.1b]`. So if the row `min(pk)` picks is one of
 * the four forbidden personas, all eleven `profiles × update` cells stop being
 * an RLS verdict and become a `23514` — and `rls-baseline-compare.mjs` would
 * report eleven `b3_cell_changed` defects with no visible cause.
 *
 * Today that row is `master/approved`, and it is so **only** because of the
 * order of two arrays: persona ids are `…-<index padded>` assigned by
 * `for role of PERSONA_ROLES { for status of PERSONA_STATUSES }`, with
 * `PERSONA_ROLES = ['master','organizer','member']` and
 * `PERSONA_STATUSES = ['approved','pending','rejected']`
 * (`rls-baseline.mjs:638-639`), so index 1 is `master/approved`. Move `pending`
 * to the front of `PERSONA_STATUSES` and index 1 becomes `master/pending`.
 * Appending `'staff'` after `'member'` is safe; inserting it before `'master'`
 * gives `staff/approved`, which also complies.
 *
 * That is luck, not design, so it is asserted. The assertion runs whether or not
 * the constraint is present: the hazard is dormant until plan 43-06, and a guard
 * that only starts running on the day it is needed is a guard nobody has seen
 * run.
 *
 * The key expression is built with the matrix's own `pkExpression`, not a
 * hand-written `min(id)`, so the two cannot drift into naming different rows —
 * the same "one declaration, two readers" rule this file applies to
 * `PROBE_PAYLOADS`.
 */
async function assertProbeRowSatisfiesTheRule(admin) {
  const keys = await primaryKeyColumns(admin, 'profiles');
  const expression = pkExpression(keys);
  const { rows } = await admin.query(
    `select role, status
       from public.profiles
      where (${expression}) = (select min(${expression}) from public.profiles)`
  );

  const row = rows[0];
  if (!row) {
    throw new Error(
      'no profiles row was returned for the key the write matrix probes with `update`. The seed ' +
        'wrote nine personas and the matrix targets min(pk) among them, so an empty answer means the ' +
        'personas are not there. Nothing was measured.'
    );
  }

  const staffRole = ['master', 'organizer', 'staff'].includes(row.role);
  if (staffRole && row.status !== 'approved') {
    throw new Error(
      `the row the write matrix probes with \`update\` is ${row.role}/${row.status}, which violates ` +
        `"${ROLE_IMPLIES_APPROVED.name}". Once that constraint exists it is restored NOT VALID, and a ` +
        'NOT VALID CHECK refuses every update to an already-violating row — even on a column the rule ' +
        'does not mention. All eleven `profiles × update` cells would stop reporting an RLS verdict ' +
        'and start reporting 23514, and the comparator would call them eleven changed cells with no ' +
        'visible cause. The likely edit is a reordering of PERSONA_STATUSES or PERSONA_ROLES in ' +
        'rls-baseline.mjs: index 1 must stay a compliant pair. Fix the ordering, do not weaken this ' +
        'check. Nothing was measured about writes on profiles.'
    );
  }

  say(`      profiles × update probes ${row.role}/${row.status} — satisfies ${ROLE_IMPLIES_APPROVED.name}`);
}

async function primaryKeyColumns(admin, table) {
  const { rows } = await admin.query(
    `select att.attname as col
       from pg_constraint con
       join pg_class rel on rel.oid = con.conrelid
       join pg_namespace n on n.oid = rel.relnamespace
       cross join lateral unnest(con.conkey) with ordinality as k(attnum, ord)
       join pg_attribute att on att.attrelid = rel.oid and att.attnum = k.attnum
      where n.nspname = 'public' and con.contype = 'p' and rel.relname = $1
      order by k.ord`,
    [table]
  );
  return rows.map((r) => r.col);
}

/**
 * The refusal, and it is the reason this file is worth its length.
 *
 * A seed that silently under-fills a table produces a baseline that agrees for
 * the one reason that proves nothing. Exit 1 naming the table, on the same
 * principle as `rls-baseline.mjs`'s plausibility floors: investigate the seed,
 * never lower the requirement.
 */
async function assertDiscriminating(admin, allTables, owners, personas) {
  const counts = {};
  for (const table of allTables) {
    const { rows } = await admin.query(`select count(*)::int as n from public."${table}"`);
    counts[table] = rows[0].n;
  }

  const thin = allTables.filter((t) => counts[t] < ROWS_PER_TABLE).sort(compareStrings);
  if (thin.length) {
    throw new Error(
      `these tables hold fewer than ${ROWS_PER_TABLE} rows after seeding: ${thin
        .map((t) => `${t} (${counts[t]})`)
        .join(', ')}. A table with one row cannot distinguish "mine" from "not mine". Nothing was measured.`
    );
  }

  const singleOwner = [];
  for (const [table, column] of owners) {
    const { rows } = await admin.query(
      `select count(distinct "${column}")::int as n from public."${table}"`
    );
    if (rows[0].n < 2) singleOwner.push(`${table}.${column} (${rows[0].n})`);
  }
  if (singleOwner.length) {
    throw new Error(
      `these owner columns carry rows from fewer than 2 distinct personas: ${singleOwner
        .sort(compareStrings)
        .join(', ')}. An ownership predicate would then be true for everything or false for ` +
        'everything, and it would move nothing when inverted. Nothing was measured.'
    );
  }

  const { rows: grid } = await admin.query(
    `select role, status, count(*)::int as n from public.profiles group by role, status order by role, status`
  );
  const expectedCells = PERSONA_ROLES.length * PERSONA_STATUSES.length;
  if (grid.length !== expectedCells) {
    throw new Error(
      `the profiles table holds ${grid.length} of the ${expectedCells} role × status pairs. ` +
        '`organizer/pending` is the one cell where the two definitions of "organizer" disagree, and a ' +
        'grid with a hole cannot show it. Nothing was measured.'
    );
  }

  const lines = [
    ...allTables.sort(compareStrings).map((t) => {
      const column = owners.get(t);
      return `${t.padEnd(24)} ${String(counts[t]).padStart(3)} rows${column ? `  owner: ${column}` : ''}`;
    }),
    `profiles role × status: ${grid.map((g) => `${g.role}/${g.status}=${g.n}`).join(' ')}`,
  ];

  say(`      seeded ${allTables.length} tables, ${personas.length} profiles, ${expectedCells}/${expectedCells} role × status cells`);

  return { tables: allTables.length, profiles: personas.length, counts, lines };
}
