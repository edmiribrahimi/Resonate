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
 */

import { createHash } from 'node:crypto';

import {
  PERSONA_ROLES,
  PERSONA_STATUSES,
  PROBE_PAYLOADS,
  PROBE_TEXT,
  compareStrings,
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
  }

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
