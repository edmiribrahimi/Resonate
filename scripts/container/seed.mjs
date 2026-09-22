/**
 * seed.mjs — four personas and two differently-owned rows in every table.
 *
 * (Nine until plan 43-08, which added the `staff` row of the grid; twelve from
 * then until phase 50. The count is never written down twice: everything below
 * derives it from `PERSONA_ROLES.length`.)
 *
 * ── HOW MANY PEOPLE THERE WERE, HOW MANY REMAIN, AND WHY ──────────────────
 *
 * TWELVE grid personas, then FOUR. The grid had two axes, ROLE and STATUS —
 * four roles × three statuses — and phase 50 deletes `profiles.status` from the
 * database altogether (D-50-01). A column that does not exist cannot be an axis,
 * so the grid collapses onto its remaining one: `master`, `organizer`, `attendee`,
 * `staff`, one persona each. Nobody was dropped for being surplus; eight of the
 * twelve were a state, and the state is gone.
 *
 * SIX MORE WENT WITH THEM, and they are the ones worth naming. `FORBIDDEN_WRITES`
 * held six rows — `organizer/pending`, `organizer/rejected`, `master/pending`,
 * `master/rejected`, `staff/pending`, `staff/rejected` — whose whole purpose was
 * to be REFUSED by phase 43's role-implies-approved CHECK, and this file was the
 * only place in the repository that ever watched that rule refuse anything
 * (ROLE-02's only automated detector, `43-VALIDATION.md`). The rule is dropped by
 * the same migration that drops the column: the detector is not being deleted
 * while the thing it watched survives — it is being retired WITH it. Said out
 * loud because a harness that quietly slims down makes whoever reads it in six
 * months think something was lost.
 *
 * *In italiano, perche' il conto va detto nella lingua in cui questa fase e'
 * stata decisa: erano DODICI persone nella griglia, piu' SEI scritture rifiutate,
 * e restano QUATTRO persone — una per ruolo. Nessuna e' stata tolta perche' di
 * troppo: otto erano uno stato, e lo stato non esiste piu'.*
 *
 * The four that remain still satisfy the two guarantees below: `attendee` and
 * `master` are two distinct owners, and every RLS table still gets two rows.
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
 *      personas** — one `attendee`, one `master`.
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
 * A seeded code can therefore never collide with an attendee's.
 *
 * NOTHING HERE WRITES `profiles.status`, AND THAT IS WHAT MAKES IT RUN ON BOTH
 * SIDES OF PHASE 50's MIGRATION. The column is `NOT NULL DEFAULT 'approved'`
 * until the migration lands, so an insert that does not name it satisfies it by
 * itself — and every persona is then approved, which is the only thing phase
 * 43's role-implies-approved CHECK ever asked of a staff role, so this file no
 * longer has to drop and restore that constraint. After the migration the column
 * is gone and the same statements keep working.
 */

import { createHash } from 'node:crypto';

import {
  PERSONA_ROLES,
  PROBE_FUTURE_INSTANT,
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
 *
 * `formats` and `party_series` were added by plan 36-04, BEFORE `event_parties`
 * and in that order, and neither could have been left to `rest`. Sorting is what
 * carries `artists` (see below) and it is not enough here: `event_parties` is
 * INSIDE this list, so it is seeded before a single sorted table is touched — a
 * table the night points at must therefore be inside this list too, or its rows
 * do not exist yet and the run stops with the message `referencedBy` raises.
 * `formats` precedes `party_series` for the same reason one step down:
 * `party_series.format_id` is `NOT NULL REFERENCES public.formats`.
 */
const SEED_ORDER = [
  'events',
  'formats',
  'party_series',
  'event_parties',
  'ticket_tiers',
  'discount_codes',
  'drink_orders',
];

/**
 * The tables a `{{placeholder}}` in a payload may point at.
 *
 * `artists` was added by plan 35-05 for `party_credits.artist_id`. It is not in
 * `SEED_ORDER` and does not need to be: `rest` is sorted, and `artists` sorts
 * before `party_credits`, so its ids exist by the time the credits are seeded.
 *
 * `formats` and `party_series` were added by plan 36-04 and DO need `SEED_ORDER`
 * as well, for the reason written above them.
 */
const REFERENCEABLE = [
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
 * ── The references that are a COLUMN of another reference's row ──────────────
 *
 * `rls-baseline.mjs` resolves `{{party_series_format}}` by READING the database
 * on the privileged connection: the format of the series `{{party_series}}`
 * picked. Here there is nothing to read yet — the row is being written — but
 * there is something better than a read. Row n of every table points at ROW n of
 * every table it references, so the format of `party_series` row n IS `formats`
 * row n, and the derived reference is simply the base table's row at the same
 * index.
 *
 * THAT ALIGNMENT IS NOT TAKEN ON TRUST, and it does not need its own assertion:
 * `event_parties_series_format_fk` is `(series_id, format_id) REFERENCES
 * public.party_series (id, format_id)`, so a seed that got the pairing wrong
 * could not insert a single night — it would stop here with `23503` naming that
 * constraint. That is the direction this file always chooses: a refused run,
 * never a green matrix built on a row that is not what it claims to be.
 */
const DERIVED_REFERENCES = { party_series_format: 'formats' };

/**
 * ── WHAT USED TO BE HERE, AND WHY IT IS NOT ──────────────────────────────
 *
 * `ROLE_IMPLIES_APPROVED` (the pre-registered declaration of phase 43's rule
 * D-04), `NOT_VALID_SUFFIX` and `FORBIDDEN_WRITES` (the six refused rows that
 * were ROLE-02's only automated detector in this repository) stood here until
 * phase 50.
 *
 * They were not deleted to make a run go green — which is precisely what the
 * paragraph they carried forbade. They were retired with their subject: phase 50
 * drops `profiles.status`, and phase 43's rule is a CHECK on that column,
 * dropped by the same migration. A detector whose rule no longer exists is not a
 * detector; keeping it would have meant asserting the presence of a constraint
 * the schema deliberately no longer holds, and the seed would have refused to
 * run on its own declaration.
 *
 * The consequence, said instead of discovered: ROLE-02 has no automated evidence
 * any more, because the requirement it guarded has been withdrawn (D-50-01,
 * D-50-04). If a rule of that shape is ever wanted again, the shape to copy is
 * in git history at this line, not in memory.
 */

/**
 * ── THE THIRD AXIS ────────────────────────────────────────────────────────
 *
 * WHAT IS MISSING WITHOUT IT. This file's grid has exactly two axes, ROLE and
 * STATUS, and until phase 35 that was the whole of what could make two accounts
 * behave differently. An **assignment** is a third one, and it is not a wider
 * version of either: two accounts identical in role and in status now differ in
 * what they may do at ONE night, and at no other.
 *
 * `35-VALIDATION.md` states the consequence in the only terms that matter:
 * without three accounts that differ ONLY by assignment, **ASSIGN-01 is vacuous
 * in every cell**. The property to prove is *«uses the tools of that night and
 * of no other»*, and proving it needs at least one (person, night) pair whose
 * answer is `false` while the SAME person on ANOTHER night answers `true`. One
 * assigned account cannot produce that pair; two accounts on the same night
 * cannot either.
 *
 * THE NEAREST PRECEDENT IN THIS FILE WAS `FORBIDDEN_WRITES`, retired in phase
 * 50 with the rule it watched (see the note where it stood). It was only NEAR
 * anyway: that list grew from four to six when `staff` became a persona — an
 * axis that got LONGER. This is an axis that did not exist, so the shape below
 * is designed rather than copied, and the design rule taken from that precedent
 * is the one that matters: **a detector that watches part of a rule reports a
 * green for the whole of it.** Seeding two of these three would be exactly
 * that.
 *
 * WHY THE FOURTH ROW — the REVOKED one — IS NOT OPTIONAL. It is the only place
 * in this harness where a revoked assignment exists at all, and it answers two
 * questions no live row can:
 *
 *   * a revoked row does NOT grant (ASSIGN-03), and it must fail to grant *while
 *     still inside its window* — which is why its `ends_at` is the same future
 *     instant the live rows carry. Had it been given a past `ends_at`, the row
 *     would have been denied by EXPIRY and would have proved nothing whatever
 *     about revocation;
 *   * a revoked row does not block its holder's demotion, because
 *     `assignee_role` is `NULL` and a `MATCH SIMPLE` composite key is not
 *     checked when a referencing column is null (`20260809000000`, section 3b).
 *
 * IDENTITIES. Same convention as the twelve personas and the six forbidden
 * writes, and for the same reason (threat T-32-04-02, and CLAUDE.md guardrail 5
 * — this repository is PUBLIC): a first uuid group that is the literal
 * `35000001` and belongs to no real account, an address on the reserved
 * `.invalid` TLD that can reach no inbox, a `fullName` that is a ROLE AND ITS
 * AXIS and never a person, and a `membershipCode` `handle_new_user()` cannot
 * mint — its alphabet `ABCDEFGHJKLMNPQRSTUVWXYZ23456789` holds neither `0` nor
 * `1`, and every code here holds both.
 *
 * The `35000001` block is distinct from the `35000002-…-000000000001` literal
 * plan 35-02 pinned as the probe's `assigned_by` fallback: two blocks, two
 * purposes, and neither can be mistaken for the other or for an account.
 *
 * ALL FOUR ARE `staff`, deliberately. The role is held CONSTANT so that the
 * only thing left varying is the assignment — that is what makes this an axis
 * rather than four more cells. (Until phase 50 they were `staff/approved`, and
 * the approved half was what let them satisfy phase 43's role-implies-approved
 * CHECK without relaxing it. There is no status left to hold constant, and no
 * constraint left to satisfy.)
 *
 * ── WHY THERE IS A FOURTH ACCOUNT, AND WHY IT CARRIES A DIFFERENT KEY ──────
 *
 * Added by plan 35-09. The first three all carry `door.operate`, so between
 * them they can only ever exercise ONE of the per-night arms wherever a policy
 * has more than one.
 *
 * `20260809004000_door_scan_events_by_assignment.sql` has two: `door.operate`
 * for whoever worked the door, and `party.manage` for whoever runs the night.
 * With only the first three accounts seeded, **no reachable situation would
 * traverse the second one** — it would be a line of SQL that no persona, no
 * probe and no capture could distinguish from a line that had been deleted.
 * `ai-engineering.md`, gate *un gate deve poter fallire*: a guard nothing can
 * trip is decoration that makes something look watched.
 *
 * The fourth account therefore holds `party.manage` on night 1 and **no door
 * assignment at all**. That absence is the load-bearing half: an account
 * holding both would be admitted by the door arm and would say nothing about
 * the manage arm.
 *
 * ── THE COLLISION THIS DELIBERATELY DOES NOT CAUSE ────────────────────────
 *
 * Plan 35-06 recorded a warning against its own future: **seed a
 * `door.supervise` for the LOWEST profile on the LOWEST night and the ASSIGN-04
 * constraint probe starts colliding again**, reporting `23505` from
 * `party_assignments_live_unique` instead of the success its mutation run
 * expects (`rls-baseline.mjs`, `CONSTRAINT_PROBES`). Three things keep this
 * fourth row clear of it: the key is `party.manage` and not `door.supervise`,
 * the subject is a `35000001…` account and not `min(id)` of `public.profiles`,
 * and the partial unique index is on `(party_id, user_id, capability)` — all
 * three columns differ. Written down because the next person adding a row here
 * needs the rule, not the outcome.
 */

/** The key the door axis is measured on: three accounts, one worked door. */
const THIRD_AXIS_CAPABILITY = 'door.operate';

/**
 * The key the FOURTH account holds. Assignable by
 * `party_assignments_capability_assignable`, and a per-night arm of
 * `door_scan_events_select_admin` in its own right.
 */
const THIRD_AXIS_MANAGE_CAPABILITY = 'party.manage';

/** Both keys, in the order the assertions below report them. */
const THIRD_AXIS_CAPABILITIES = [THIRD_AXIS_CAPABILITY, THIRD_AXIS_MANAGE_CAPABILITY];

/** The constraint whose survival the third axis depends on, asserted by name. */
const THIRD_AXIS_ROLE_FK = 'party_assignments_assignee_role_fk';

const THIRD_AXIS_PERSONAS = [
  { key: 'assigned-night1', axis: 'assigned night1', night: 0, capability: THIRD_AXIS_CAPABILITY },
  { key: 'assigned-night2', axis: 'assigned night2', night: 1, capability: THIRD_AXIS_CAPABILITY },
  { key: 'unassigned', axis: 'unassigned', night: null, capability: THIRD_AXIS_CAPABILITY },
  // The fourth: runs night 1, works nobody's door. See the paragraph above.
  { key: 'manages-night1', axis: 'manages night1', night: 0, capability: THIRD_AXIS_MANAGE_CAPABILITY },
].map((persona, i) => ({
  ...persona,
  role: 'staff',
  label: `staff · ${persona.axis}`,
  id: `35000001-0000-4000-8000-${String(i + 1).padStart(12, '0')}`,
  email: `seed-staff-${persona.key}@example.invalid`,
  fullName: `Seed Persona staff ${persona.axis}`,
  membershipCode: `RSN-SEED350${i + 1}`,
}));

/**
 * A deterministic, obviously synthetic uuid.
 *
 * The first group is the literal `32000004` — phase 32, plan 04 — so anyone who
 * finds one of these in a database knows immediately where it came from and
 * that it is not an attendee's identifier.
 */
function seedUuid(seed) {
  const h = createHash('md5').update(`rls-baseline-container:${seed}`).digest('hex');
  return `32000004-${h.slice(0, 4)}-4${h.slice(4, 7)}-8${h.slice(7, 10)}-${h.slice(10, 22)}`;
}

/**
 * The four grid personas, in a fixed order, with their synthetic identities.
 *
 * **The order of `PERSONA_ROLES` is what assigns `index`, and `index` is what
 * the write matrix's `update` probe follows** — see the long comment on
 * `PERSONA_ROLES` in `rls-baseline.mjs`. `min(pk)` on `public.profiles` is
 * therefore `PERSONA_ROLES[0]`, today `master`.
 *
 * TWO LOOPS UNTIL PHASE 50, one now: the inner one walked `PERSONA_STATUSES`
 * and there is no status column left to walk. The ids keep the same shape and
 * the same `32000004…` block, so index 1 still names the same persona it always
 * did.
 */
function buildPersonas() {
  const personas = [];
  let index = 0;
  for (const role of PERSONA_ROLES) {
    index += 1;
    personas.push({
      label: role,
      role,
      // Readable rather than hashed: a persona uuid is read by a human far
      // more often than the row uuids are.
      id: `32000004-0000-4000-8000-${String(index).padStart(12, '0')}`,
      email: `seed-${role}@example.invalid`,
      // A ROLE, never a person. `.planning/` and this repository are public.
      fullName: `Seed Persona ${role}`,
      membershipCode: `RSN-SEED000${index}`,
    });
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
 *
 * A DERIVED name resolves to the table it derives FROM — `{{party_series_format}}`
 * needs `formats` seeded and nothing else — so the seeding loop below asks for
 * the same rows the derivation will read.
 */
function referencedBy(payload) {
  const found = new Set();
  for (const value of payload.values) {
    for (const [, name] of String(value).matchAll(/\{\{([a-z_]+)\}\}/g)) {
      const table = DERIVED_REFERENCES[name] ?? name;
      if (!REFERENCEABLE.includes(table)) {
        throw new Error(
          `a probe payload references "${name}", which the seed cannot provide. Known referenceable ` +
            `tables: ${REFERENCEABLE.join(', ')}. Known derived references: ` +
            `${Object.keys(DERIVED_REFERENCES).join(', ')}.`
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
  const rowOwners = [byLabel.get('attendee'), byLabel.get('master')];

  // ── NO CONSTRAINT IS DROPPED HERE ANY MORE ───────────────────────────────
  //
  // Until phase 50 this line dropped phase 43's role-implies-approved CHECK and
  // a `finally` restored it `NOT VALID`, because six of the twelve personas
  // violated it by construction (phase 43 D-05). None of the four below
  // violates anything: no persona carries a status, the column's own
  // `DEFAULT 'approved'` answers for them while it still exists, and after the
  // migration neither the column nor the constraint is there to answer to.
  //
  // The drop-and-restore is not being skipped — it has nothing left to relax.

  // ── the four personas ────────────────────────────────────────────────────
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
        `insert into public.profiles (id, email, full_name, membership_code, role)
         values ($1::uuid, $2, $3, $4, $5)`,
        [p.id, p.email, p.fullName, p.membershipCode, p.role]
      );
    }

    // ── the third axis, accounts only ─────────────────────────────────────
    //
    // Here rather than in their own block because they need the same two things
    // the grid personas need: the code-minting trigger silenced, so two runs
    // produce the same database, and a row in `auth.users` before a row in
    // `public.profiles`. Their ASSIGNMENTS are seeded much later, after the
    // nights exist — see `seedThirdAxis`.
    //
    // They are appended AFTER the grid and their ids sort after `32000004…`, and
    // that is load-bearing: `resolvePersonas` resolves each grid cell to its
    // LOWEST id, so `staff` keeps resolving to the grid persona and no matrix
    // row moves; and `min(pk)` on `public.profiles` keeps naming `master`.
    for (const p of THIRD_AXIS_PERSONAS) {
      await admin.query(
        `insert into auth.users (id, email, raw_user_meta_data) values ($1::uuid, $2, '{}'::jsonb)`,
        [p.id, p.email]
      );
      await admin.query(
        `insert into public.profiles (id, email, full_name, membership_code, role)
         values ($1::uuid, $2, $3, $4, $5)`,
        [p.id, p.email, p.fullName, p.membershipCode, p.role]
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

      // The derived references, taken from the rows just chosen.
      // `substituteReferences` does not know the difference and does not need
      // to: it only requires the key to be present in `refs`.
      for (const [derived, base] of Object.entries(DERIVED_REFERENCES)) {
        if (base in refs) refs[derived] = refs[base];
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

  // AFTER the loop, and the order is a foreign key rather than a preference:
  // `party_assignments.party_id` points at `public.event_parties`, and the
  // composite key `(user_id, assignee_role) → public.profiles (id, role)` is
  // evaluated at the insert. Both have to exist first.
  await seedThirdAxis(admin, {
    nights: seededIds.get('event_parties') ?? [],
    granter: byLabel.get('master'),
  });
  await assertThirdAxis(admin, { nights: seededIds.get('event_parties') ?? [] });

  // AFTER the axis is known to discriminate, and not before: this one reads the
  // door register THROUGH the policy, and its expectations are only meaningful
  // once the assignments behind them are known to be live and per-night.
  await assertDoorRegisterByAssignment(admin, {
    nights: seededIds.get('event_parties') ?? [],
    granter: byLabel.get('master'),
  });

  return assertDiscriminating(admin, allTables, owners, [...personas, ...THIRD_AXIS_PERSONAS]);
}

/**
 * ── Seeds the third axis: two live assignments, one revocation ────────────
 *
 * Four rows, three accounts, two nights. The shape is the whole argument:
 *
 *   | account            | night 1              | night 2 |
 *   |--------------------|----------------------|---------|
 *   | assigned night1    | LIVE `door.operate`  | —       |
 *   | assigned night2    | —                    | LIVE    |
 *   | unassigned         | REVOKED              | —       |
 *
 * Read down the "night 1" column and the axis is visible: three accounts with
 * the same role, and three different answers.
 *
 * `assigned_by` is `master`, an account from the grid and never one of
 * the three: `party_assignments_no_self_grant` (ASSIGN-04) refuses a row whose
 * granter is its subject, and a seed that tripped it would fail here with
 * `23514` instead of producing data. The distinctness is asserted rather than
 * argued, because the failure mode of getting it wrong is a seed that cannot
 * run at all and a reader who has to work out why.
 *
 * NO CONSTRAINT IS RELAXED HERE, and that is a decision — one that outlived its
 * counter-example. Until phase 50 the seed dropped phase 43's
 * role-implies-approved CHECK around the persona loop, because six of the twelve
 * grid personas were unrepresentable without it (D-05). Nothing of the kind ever
 * applied to this table: all three accounts are `staff`, and
 * `party_assignments_assignee_role_fk` must therefore hold on every one of these
 * rows. **If it does not, the seed has just found a defect in
 * the key and must fail loudly rather than seed around it** — which is what an
 * unguarded `insert` does, and why there is no `try` here.
 */
async function seedThirdAxis(admin, { nights, granter }) {
  if (nights.length < 2) {
    throw new Error(
      `the third axis needs at least two nights and public.event_parties seeded ${nights.length}. ` +
        'ASSIGN-01 is the property "that night and no other", so a single night cannot express it: ' +
        'every account would answer the same on the only night there is. Nothing was measured.'
    );
  }
  if (!granter) {
    throw new Error(
      'master was not resolved, so no account can be the granter of the seeded assignments. ' +
        'Nothing was measured.'
    );
  }

  const clashes = THIRD_AXIS_PERSONAS.filter((p) => p.id === granter.id).map((p) => p.label);
  if (clashes.length) {
    throw new Error(
      `the granter is also the subject of: ${clashes.join(', ')}. ` +
        '`party_assignments_no_self_grant` would refuse those rows with 23514, and a seed that trips ' +
        'ASSIGN-04 has produced no data rather than proved anything. Give the third axis its own ids.'
    );
  }

  const [assignedToOne, assignedToTwo, unassigned, managesOne] = THIRD_AXIS_PERSONAS;
  const rows = [
    { n: 1, persona: assignedToOne, party: nights[0], live: true },
    { n: 2, persona: assignedToTwo, party: nights[1], live: true },
    // The revoked row belongs to the UNASSIGNED account on purpose: it is the
    // strongest form of "a revocation grants nothing", since the account it
    // belongs to holds nothing else anywhere.
    { n: 3, persona: unassigned, party: nights[0], live: false },
    // Plan 35-09. The manage arm of `door_scan_events_select_admin` has no
    // other way to be reached: it is `party.manage`, on ONE night, for an
    // account with no door assignment anywhere.
    { n: 4, persona: managesOne, party: nights[0], live: true },
  ];

  for (const row of rows) {
    const id = `35000001-0000-4000-8000-${String(1000 + row.n).padStart(12, '0')}`;
    if (row.live) {
      await admin.query(
        `insert into public.party_assignments
           (id, party_id, user_id, capability, assignee_role, assigned_by, ends_at)
         values ($1::uuid, $2::uuid, $3::uuid, $4, $5, $6::uuid, ${PROBE_FUTURE_INSTANT})`,
        [id, row.party, row.persona.id, row.persona.capability, row.persona.role, granter.id]
      );
    } else {
      // `assignee_role` NULL and both revocation columns filled: the only shape
      // `party_assignments_live_role_present` and
      // `party_assignments_revocation_paired` accept together for a revoked row.
      await admin.query(
        `insert into public.party_assignments
           (id, party_id, user_id, capability, assignee_role, assigned_by, ends_at, revoked_at, revoked_by)
         values ($1::uuid, $2::uuid, $3::uuid, $4, null, $5::uuid, ${PROBE_FUTURE_INSTANT}, now(), $5::uuid)`,
        [id, row.party, row.persona.id, row.persona.capability, granter.id]
      );
    }
  }
}

/**
 * ── Assertion 4: the axis actually discriminates ──────────────────────────
 *
 * The inserts above succeeding says the rows were ACCEPTED. It does not say they
 * mean anything: three rows all pointing at the same night, or all already
 * expired, would insert perfectly and leave ASSIGN-01 exactly as vacuous as it
 * was. So the grid is read back with the RESOLVER'S OWN LIVENESS PREDICATE —
 * `revoked_at is null and now() < ends_at`, the two conditions
 * `20260809001000_assignment_resolver.sql:353-355` tests — and compared against
 * the shape this file declares.
 *
 * The predicate is re-stated here rather than borrowed from the resolver, and
 * that is on purpose: `private.has_capability` answers about `auth.uid()`, so it
 * cannot be asked about somebody else, and a checker that reads its expectation
 * off the thing it checks cannot fail (`rls-baseline.mjs:113-130`, same rule).
 * The price is a second site for two conditions, and the mitigation is that this
 * paragraph names the first one.
 *
 * `THIRD_AXIS_ROLE_FK` is asserted by NAME for the reason
 * `20260808001000_role_implies_approved.sql:179-181` states as a rule: whoever
 * renames a constraint renames it in the seed too. A renamed key with this
 * assertion still passing would be an assertion about a constraint that no
 * longer exists.
 */
async function assertThirdAxis(admin, { nights }) {
  const { rows: keyRows } = await admin.query(
    `select 1 from pg_constraint
      where conrelid = 'public.party_assignments'::regclass and conname = $1`,
    [THIRD_AXIS_ROLE_FK]
  );
  if (!keyRows.length) {
    throw new Error(
      `"${THIRD_AXIS_ROLE_FK}" is not on public.party_assignments. The third axis is three staff ` +
        'accounts whose live assignments are held to their role BY THAT KEY, so without it the rows ' +
        'below prove nothing about D-A. If the constraint was renamed, rename it here too — the same ' +
        'rule 20260808001000_role_implies_approved.sql:179-181 states. Nothing was measured.'
    );
  }

  // What the grid must look like: for each account, exactly ONE `true` — on ITS
  // night and with ITS key — and `false` in the other three cells. Both keys are
  // read for EVERY account, not just for the one that holds each: a cell that is
  // never read is a cell that cannot disagree, and the claim being made here is
  // that `party.manage` on night 1 belongs to ONE account rather than to the
  // three that merely work a door.
  const expected = new Map();
  for (const persona of THIRD_AXIS_PERSONAS) {
    for (const capability of THIRD_AXIS_CAPABILITIES) {
      for (let n = 0; n < 2; n += 1) {
        expected.set(
          `${persona.key}#${capability}#${n}`,
          persona.night === n && persona.capability === capability
        );
      }
    }
  }

  const wrong = [];
  const observedLines = [];
  for (const persona of THIRD_AXIS_PERSONAS) {
    for (const capability of THIRD_AXIS_CAPABILITIES) {
      const answers = [];
      for (let n = 0; n < 2; n += 1) {
        const { rows } = await admin.query(
          `select exists (
             select 1 from public.party_assignments pa
              where pa.user_id = $1::uuid
                and pa.party_id = $2::uuid
                and pa.capability = $3
                and pa.revoked_at is null
                and now() < pa.ends_at
           ) as live`,
          [persona.id, nights[n], capability]
        );
        const live = rows[0].live === true;
        answers.push(live);
        const want = expected.get(`${persona.key}#${capability}#${n}`);
        if (live !== want) {
          wrong.push(
            `${persona.label} · ${capability} on night ${n + 1}: ${live} (expected ${want})`
          );
        }
      }
      // Only the row an account actually holds is printed; the six all-false
      // cross-check rows are asserted above and would drown the report.
      if (persona.capability === capability) {
        observedLines.push(
          `${persona.axis.padEnd(16)} ${capability.padEnd(13)} night1=${answers[0]} night2=${answers[1]}`
        );
      }
    }
  }

  if (wrong.length) {
    throw new Error(
      `the third axis does not discriminate: ${wrong.join('; ')}. ASSIGN-01 is the property "that ` +
        'night and no other", and it needs one (person, night) pair answering false while the SAME ' +
        'person answers true on another night. Without that pair every cell of the matrix agrees for ' +
        'the one reason that proves nothing. Investigate the seeded rows, never the expectation. ' +
        'Nothing was measured about ASSIGN-01.'
    );
  }

  const { rows: revoked } = await admin.query(
    `select count(*)::int as n from public.party_assignments
      where revoked_at is not null and revoked_by is not null and assignee_role is null`
  );
  if (revoked[0].n !== 1) {
    throw new Error(
      `the seed holds ${revoked[0].n} revoked assignments and the third axis declares exactly 1. ` +
        'The revoked row is the only evidence in this harness that a revocation withholds a grant ' +
        'while the window is still open, and that a revoked row stops blocking its holder demotion. ' +
        'Nothing was measured about ASSIGN-03.'
    );
  }

  for (const line of observedLines) say(`      third axis  ${line}`);
  say(
    `      third axis  1 revoked row, ends_at still in the future — revocation withholds the grant ` +
      'on its own, not by expiry'
  );
}

/**
 * ── Assertion 5: the door register is read BY ASSIGNMENT, and by whom ─────
 *
 * Added by plan 35-09, and it measures the policy
 * `door_scan_events_select_admin` as re-written by
 * `20260809004000_door_scan_events_by_assignment.sql`.
 *
 * WHY IT IS HERE AND NOT IN THE READ MATRIX. B2 measures the grid personas, and
 * `resolvePersonas` resolves each cell to the LOWEST id in it — deliberately, so
 * no matrix row moves when accounts are appended (`rls-baseline.mjs:722-747`).
 * Every account of the third axis therefore sorts behind the grid's `staff` and
 * **no capture ever impersonates one**.
 * B2 can say that nobody who could read this table before reads less of it now;
 * it cannot say anything at all about the two arms this phase added. This
 * function is the only place in the repository that can.
 *
 * WHY THE POLICY IS INSPECTED BEFORE IT IS MEASURED. Every expectation below
 * except the first is a count of rows a persona can see, and the ones that
 * matter are ZEROES — "this night and no other" is a zero on the other night.
 * **A zero is also what a missing arm produces, and what a missing policy
 * produces, and what an empty table produces.** So three things are asserted
 * before a single count is read: the policy exists, its predicate names all
 * three capabilities, and the register actually holds rows on both nights. Any
 * of the three absent and the counts below would be a page of agreeing zeroes
 * measuring nothing — the "green screen rather than evidence" this file's own
 * header refuses (threat T-32-04-03).
 *
 * WHY IT IMPERSONATES RATHER THAN RE-STATING THE PREDICATE. `assertThirdAxis`
 * above re-states the resolver's liveness test in SQL, and says why: a checker
 * that reads its expectation off the thing it checks cannot fail. Here the
 * opposite choice is right, because here the thing under test is **the policy**
 * — the argument is that a session with these claims sees these rows, and there
 * is no way to make that argument except by opening such a session. `set local
 * role authenticated` inside a transaction that is rolled back is the same
 * mechanism `personaTransaction` uses, and plan 35-06 measured that it genuinely
 * stops bypassing RLS (its constraint-probe direction B, where the same
 * statement went from succeeding to `42501`).
 *
 * WHAT EACH EXPECTATION IS FOR:
 *
 *   1. `master` sees EVERY row. This is the one that would catch a
 *      narrowing done by role: whoever read the whole register yesterday reads
 *      the whole register today, and the number says so rather than a paragraph.
 *   2. `assigned night1` sees night 1's rows and ZERO of night 2's — ASSIGN-01
 *      on the surface where it is a read rather than a permission.
 *   3. `unassigned` sees ZERO. Its only row is revoked, its window still open:
 *      the zero is revocation's doing and not expiry's.
 *   4. `manages night1` sees night 1's rows and ZERO of night 2's, **through the
 *      `party.manage` arm and no other** — it holds no door assignment anywhere.
 *      Without this account the arm exists and nothing reaches it, and the page
 *      it was written for would show an empty list to somebody entitled to the
 *      night while raising no error at all.
 */
async function assertDoorRegisterByAssignment(admin, { nights, granter }) {
  const TABLE = 'public.door_scan_events';
  const POLICY = 'door_scan_events_select_admin';
  const ARMS = ['staff.manage', THIRD_AXIS_CAPABILITY, THIRD_AXIS_MANAGE_CAPABILITY];

  const { rows: policyRows } = await admin.query(
    `select pg_get_expr(polqual, polrelid) as qual
       from pg_policy
      where polname = $1 and polrelid = $2::regclass`,
    [POLICY, TABLE]
  );
  if (!policyRows.length) {
    throw new Error(
      `"${POLICY}" is not on ${TABLE}. Every count below would be zero for want of a policy rather ` +
        'than for want of an assignment, and the two are indistinguishable from a number. Nothing ' +
        'was measured about ASSIGN-01 on the door register.'
    );
  }
  const qual = policyRows[0].qual ?? '';
  const missingArms = ARMS.filter((arm) => !qual.includes(`'${arm}'`));
  if (missingArms.length) {
    throw new Error(
      `"${POLICY}" does not name ${missingArms.join(', ')} in its predicate:\n        ${qual}\n` +
        'The zeroes this function is about to read would then be the absence of an arm and not the ' +
        'absence of an assignment. If an arm was deliberately removed, remove its expectation here in ' +
        'the same commit — do not let this assertion keep passing about a policy that no longer has ' +
        'the shape it asserts.'
    );
  }

  const perNight = [];
  for (const night of nights.slice(0, 2)) {
    const { rows } = await admin.query(
      `select count(*)::int as n from ${TABLE} where party_id = $1::uuid`,
      [night]
    );
    perNight.push(rows[0].n);
  }
  const total = perNight[0] + perNight[1];
  if (perNight[0] < 1 || perNight[1] < 1) {
    throw new Error(
      `${TABLE} holds ${perNight[0]} row(s) on night 1 and ${perNight[1]} on night 2, and this ` +
        'assertion needs at least one on each. With an empty night, "sees that night" and "sees ' +
        'nothing" are the same number and the per-night arms cannot be told from a policy that ' +
        'refuses everybody. Seed a row per night. Nothing was measured.'
    );
  }

  /** Counts what one subject can actually SELECT, through the policy. */
  async function visibleTo(subject) {
    await admin.query('begin');
    try {
      await admin.query(`select set_config('request.jwt.claims', $1, true) is not null`, [
        JSON.stringify({ sub: subject, role: 'authenticated' }),
      ]);
      await admin.query('set local role authenticated');
      const seen = [];
      for (const night of nights.slice(0, 2)) {
        const { rows } = await admin.query(
          `select count(*)::int as n from ${TABLE} where party_id = $1::uuid`,
          [night]
        );
        seen.push(rows[0].n);
      }
      const { rows: all } = await admin.query(`select count(*)::int as n from ${TABLE}`);
      return { perNight: seen, total: all[0].n };
    } finally {
      await admin.query('rollback');
    }
  }

  const [assignedToOne, assignedToTwo, unassigned, managesOne] = THIRD_AXIS_PERSONAS;
  const cases = [
    {
      who: 'master',
      subject: granter.id,
      // The whole register. Not "at least as much as before" — ALL of it, which
      // is what the old role-only predicate gave and what arm 1 reproduces.
      want: { perNight: [perNight[0], perNight[1]], total },
      because: 'staff.manage — the register did not shrink for whoever already had it',
    },
    {
      who: assignedToOne.axis,
      subject: assignedToOne.id,
      want: { perNight: [perNight[0], 0], total: perNight[0] },
      because: 'door.operate on night 1 — that night and no other',
    },
    {
      who: assignedToTwo.axis,
      subject: assignedToTwo.id,
      want: { perNight: [0, perNight[1]], total: perNight[1] },
      because: 'door.operate on night 2 — the same property, the other way round',
    },
    {
      who: unassigned.axis,
      subject: unassigned.id,
      want: { perNight: [0, 0], total: 0 },
      because: 'one revoked row, window still open — revocation withholds, not expiry',
    },
    {
      who: managesOne.axis,
      subject: managesOne.id,
      want: { perNight: [perNight[0], 0], total: perNight[0] },
      because: 'party.manage on night 1, and NO door assignment — the third arm, traversed',
    },
  ];

  const wrong = [];
  const lines = [];
  for (const c of cases) {
    const seen = await visibleTo(c.subject);
    const ok =
      seen.total === c.want.total &&
      seen.perNight[0] === c.want.perNight[0] &&
      seen.perNight[1] === c.want.perNight[1];
    if (!ok) {
      wrong.push(
        `${c.who}: saw night1=${seen.perNight[0]} night2=${seen.perNight[1]} total=${seen.total} ` +
          `(expected ${c.want.perNight[0]}/${c.want.perNight[1]}/${c.want.total})`
      );
    }
    lines.push(
      `${c.who.padEnd(17)} night1=${String(seen.perNight[0]).padStart(2)} ` +
        `night2=${String(seen.perNight[1]).padStart(2)} total=${String(seen.total).padStart(2)}  ${c.because}`
    );
  }

  if (wrong.length) {
    throw new Error(
      `the door register is not read by assignment: ${wrong.join('; ')}. ` +
        'A count that came in TOO HIGH is a night readable by somebody who did not work it and does ' +
        'not run it (T-35-43). A count that came in TOO LOW is worse on the surface it feeds: the ' +
        'night-review page renders this table through the cookie-bound client, and there an empty ' +
        'list is the DESIGNED state of a quiet evening — it would say "no problems" to a person ' +
        'without permission to see the problems, raising no error anywhere (T-35-47). Investigate ' +
        'the policy and the seeded assignments, never the expectation.'
    );
  }

  for (const line of lines) say(`      door register  ${line}`);
}

/**
 * ── THE THREE ASSERTIONS THAT WENT WITH THE RULE ─────────────────────────
 *
 * Assertion 1 (`assertConstraintObject` — the container holds the same CHECK
 * production does, `NOT VALID` aside), assertion 2 (`assertForbiddenWritesRefused`
 * — the rule actually refuses its six forbidden writes) and the fourteen-cell
 * guard (`assertProbeRowSatisfiesTheRule` — `min(pk)` on `public.profiles` must
 * be a row the `NOT VALID` CHECK does not already reject) stood here until
 * phase 50.
 *
 * All three were assertions ABOUT phase 43's role-implies-approved CHECK,
 * dropped by the same migration that drops `profiles.status` (D-50-01). None of the three
 * has a subject left: there is no constraint to compare, no forbidden pair to
 * push, and no `NOT VALID` CHECK that could refuse an update to an
 * already-violating row — because no row violates anything.
 *
 * The three assertions below — the third axis, the door register, the
 * discriminating floor — are untouched, and they are the ones that were never
 * about status.
 */

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

  // ONE AXIS SINCE PHASE 50. This read used to be `group by role, status` and
  // expected `PERSONA_ROLES.length × PERSONA_STATUSES.length` cells; the status
  // axis no longer exists in the database, and an assertion that counts cells no
  // row can occupy is a red gate left behind (D-50-28). What it still refuses is
  // the same failure: a grid with a hole, where a role nobody holds cannot be
  // told from a role whose policy refuses everybody.
  const { rows: grid } = await admin.query(
    `select role, count(*)::int as n from public.profiles group by role order by role`
  );
  const expectedCells = PERSONA_ROLES.length;
  if (grid.length !== expectedCells) {
    throw new Error(
      `the profiles table holds ${grid.length} of the ${expectedCells} roles. A role with no rows ` +
        'behaves exactly like a role every policy refuses, and no capture can tell the two apart. ' +
        'Nothing was measured.'
    );
  }

  const lines = [
    ...allTables.sort(compareStrings).map((t) => {
      const column = owners.get(t);
      return `${t.padEnd(24)} ${String(counts[t]).padStart(3)} rows${column ? `  owner: ${column}` : ''}`;
    }),
    `profiles role: ${grid.map((g) => `${g.role}=${g.n}`).join(' ')}`,
  ];

  say(`      seeded ${allTables.length} tables, ${personas.length} profiles, ${expectedCells}/${expectedCells} roles`);

  return { tables: allTables.length, profiles: personas.length, counts, lines };
}
