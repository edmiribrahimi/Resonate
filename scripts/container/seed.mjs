/**
 * seed.mjs — twelve personas and two differently-owned rows in every table.
 *
 * (Nine until plan 43-08, which added the `staff` row of the grid. The count is
 * never written down twice: everything below derives it from
 * `PERSONA_ROLES.length × PERSONA_STATUSES.length`.)
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
 * database rule — a staff role implies `approved` — and six of the twelve
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
  PROBE_FUTURE_INSTANT,
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

/**
 * The tables a `{{placeholder}}` in a payload may point at.
 *
 * `artists` was added by plan 35-05 for `party_credits.artist_id`. It is not in
 * `SEED_ORDER` and does not need to be: `rest` is sorted, and `artists` sorts
 * before `party_credits`, so its ids exist by the time the credits are seeded.
 */
const REFERENCEABLE = [
  'artists',
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
  /**
   * Flipped to `true` by plan 43-06, in the same commit as the migration
   * `supabase/migrations/20260808001000_role_implies_approved.sql`, exactly as
   * the paragraph above requires. From here on the assertions below are live:
   * they read the real constraint, not a scratch one.
   */
  present: true,
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
 * The SIX states the rule forbids — the ones D-05 exists to keep seedable, and
 * the ones assertion 2 then proves are actually refused.
 *
 * **Six, not four, since plan 43-08.** `ROLE_IMPLIES_APPROVED.predicate` names
 * three roles — `master`, `organizer`, `staff` — and two non-approved statuses
 * exist, so the rule forbids 3 × 2 = 6 pairs. Until 43-08 this list held only
 * the four that the persona grid could produce, because `staff` was not a
 * persona; the moment it became one, a list of four would have been a detector
 * that watched two thirds of the rule and reported a green for the whole of it.
 * `staff/pending` and `staff/rejected` are the two the phase itself created, so
 * they are precisely the two whose refusal was least evidenced.
 *
 * They obey this file's identity convention exactly as the twelve personas do
 * (threat T-32-04-02): an id whose first group is the literal `43000004` —
 * phase 43, plan 03 — an address at the reserved `.invalid` TLD that can reach
 * no inbox, a name that is a ROLE and never a person, and a membership code
 * `handle_new_user()` **cannot** mint, since its alphabet
 * `ABCDEFGHJKLMNPQRSTUVWXYZ23456789` contains neither `0` nor `1`.
 *
 * None of these rows is ever written: every one of the six is refused. They are
 * built to the convention anyway, because the day one of them IS written is the
 * day the rule stopped working, and on that day the row must still be
 * unmistakably synthetic.
 */
const FORBIDDEN_WRITES = [
  { role: 'organizer', status: 'pending' },
  { role: 'organizer', status: 'rejected' },
  { role: 'master', status: 'pending' },
  { role: 'master', status: 'rejected' },
  { role: 'staff', status: 'pending' },
  { role: 'staff', status: 'rejected' },
].map((cell, i) => ({
  ...cell,
  label: `${cell.role}/${cell.status}`,
  id: `43000004-0000-4000-8000-${String(i + 1).padStart(12, '0')}`,
  email: `seed-forbidden-${cell.role}-${cell.status}@example.invalid`,
  fullName: `Seed Forbidden ${cell.role} ${cell.status}`,
  membershipCode: `RSN-SEED430${i + 1}`,
}));

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
 * THE NEAREST PRECEDENT IN THIS FILE IS `FORBIDDEN_WRITES`, and it is only
 * NEAR. That list grew from four to six when `staff` became a persona — an axis
 * that got LONGER. This is an axis that did not exist, so the shape below is
 * designed rather than copied, and the design rule taken from that precedent is
 * the one that matters: **a detector that watches part of a rule reports a green
 * for the whole of it.** Seeding two of these three would be exactly that.
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
 * ALL FOUR ARE `staff/approved`, deliberately. Role and status are held
 * CONSTANT so that the only thing left varying is the assignment — that is what
 * makes this an axis rather than four more cells. It also means they satisfy
 * `profiles_role_implies_approved` on their own and need no relaxation of it.
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
  status: 'approved',
  label: `staff/approved · ${persona.axis}`,
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
 * that it is not a member's identifier.
 */
function seedUuid(seed) {
  const h = createHash('md5').update(`rls-baseline-container:${seed}`).digest('hex');
  return `32000004-${h.slice(0, 4)}-4${h.slice(4, 7)}-8${h.slice(7, 10)}-${h.slice(10, 22)}`;
}

/**
 * The twelve grid personas, in a fixed order, with their synthetic identities.
 *
 * **The nesting order of these two loops is what assigns `index`, and `index` is
 * what the write matrix's `update` probe follows** — see the long comment on
 * `PERSONA_ROLES` in `rls-baseline.mjs` and `assertProbeRowSatisfiesTheRule`
 * below, which asserts the consequence on every run.
 */
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

  // Six of the twelve personas below violate the rule by construction —
  // `organizer/pending`, `organizer/rejected`, `master/pending`,
  // `master/rejected`, and since plan 43-08 `staff/pending` and
  // `staff/rejected`. They are the only reason phase 32's write matrix caught
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

  // ── the twelve personas ──────────────────────────────────────────────────
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

    // ── the third axis, accounts only ─────────────────────────────────────
    //
    // Here rather than in their own block because they need the same two things
    // the grid personas need: the code-minting trigger silenced, so two runs
    // produce the same database, and a row in `auth.users` before a row in
    // `public.profiles`. Their ASSIGNMENTS are seeded much later, after the
    // nights exist — see `seedThirdAxis`.
    //
    // They are appended AFTER the grid and their ids sort after `32000004…`, and
    // that is load-bearing twice over: `resolvePersonas` resolves each grid cell
    // to its LOWEST id, so `staff/approved` keeps resolving to the grid persona
    // and no matrix row moves; and `min(pk)` on `public.profiles` keeps naming
    // `master/approved`, which is what `assertProbeRowSatisfiesTheRule` below
    // exists to protect.
    for (const p of THIRD_AXIS_PERSONAS) {
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
    // by the time this line runs, six of the rows just seeded violate the
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

  // AFTER the loop, and the order is a foreign key rather than a preference:
  // `party_assignments.party_id` points at `public.event_parties`, and the
  // composite key `(user_id, assignee_role) → public.profiles (id, role)` is
  // evaluated at the insert. Both have to exist first.
  await seedThirdAxis(admin, {
    nights: seededIds.get('event_parties') ?? [],
    granter: byLabel.get('master/approved'),
  });
  await assertThirdAxis(admin, { nights: seededIds.get('event_parties') ?? [] });

  // AFTER the axis is known to discriminate, and not before: this one reads the
  // door register THROUGH the policy, and its expectations are only meaningful
  // once the assignments behind them are known to be live and per-night.
  await assertDoorRegisterByAssignment(admin, {
    nights: seededIds.get('event_parties') ?? [],
    granter: byLabel.get('master/approved'),
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
 * the same role and the same status, and three different answers.
 *
 * `assigned_by` is `master/approved`, an account from the grid and never one of
 * the three: `party_assignments_no_self_grant` (ASSIGN-04) refuses a row whose
 * granter is its subject, and a seed that tripped it would fail here with
 * `23514` instead of producing data. The distinctness is asserted rather than
 * argued, because the failure mode of getting it wrong is a seed that cannot
 * run at all and a reader who has to work out why.
 *
 * NO CONSTRAINT IS RELAXED HERE, and that is a decision. The seed drops
 * `profiles_role_implies_approved` around the persona loop because six of the
 * twelve grid personas are unrepresentable without it (D-05). Nothing of the
 * kind applies to this table: all three accounts are `staff`, all three are
 * `approved`, and `party_assignments_assignee_role_fk` must therefore hold on
 * every one of these rows. **If it does not, the seed has just found a defect in
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
      'master/approved was not resolved, so no account can be the granter of the seeded assignments. ' +
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
 * WHY IT IS HERE AND NOT IN THE READ MATRIX. B2 measures the twelve role ×
 * status personas, and `resolvePersonas` resolves each cell to the LOWEST id in
 * it — deliberately, so no matrix row moves when accounts are appended
 * (`rls-baseline.mjs:722-747`). Every account of the third axis therefore sorts
 * behind the grid's `staff/approved` and **no capture ever impersonates one**.
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
 *   1. `master/approved` sees EVERY row. This is the one that would catch a
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
      who: 'master/approved',
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
 * The six writes are the six states D-05 keeps seedable — the same six,
 * deliberately, so that the seed both demonstrates they can be created with the
 * rule relaxed and demonstrates they cannot be created with it in force. Two of
 * them, `staff/pending` and `staff/rejected`, exist only because plan 43-08 made
 * `staff` a persona; they are the states of the role this phase invented, and
 * before 43-08 nothing in this repository had ever watched the rule refuse them.
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
      `      skipped: ${name} is declared absent, so the ${FORBIDDEN_WRITES.length} forbidden writes ` +
        'were not attempted and ' +
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
      `public.profiles held ${before[0].n} rows before the ${FORBIDDEN_WRITES.length} forbidden ` +
        `writes and ${after[0].n} ` +
        'after. A refused insert must write nothing, so at least one of them was refused after ' +
        'landing — which would mean the grid, the fingerprints and the write matrix are all measuring ' +
        'a database with a row nobody intended. Nothing was measured.'
    );
  }

  // The count is derived, never typed: a hard-coded `4/4` would have kept
  // printing a full score while two of the six went unwatched.
  say(
    `      ${FORBIDDEN_WRITES.length}/${FORBIDDEN_WRITES.length} forbidden writes refused, ` +
      `profiles still ${after[0].n} rows`
  );
}

/**
 * ── The two lines that prevent a silent fourteen-cell regression ──────────
 *
 * (Eleven cells before plan 43-08, fourteen after: one `profiles × update` cell
 * per persona, and the grid grew from nine personas to twelve.)
 *
 * The write matrix's `update` probe touches exactly ONE row per table:
 * `buildProbeStatement` (`rls-baseline.mjs:1270-1271`) writes
 * `where (pk) = '<key>'`, and `key` comes from `resolveProbeKeys` (`:1221-1231`)
 * as `min(pk)` — the LOWEST primary key.
 *
 * A `NOT VALID` CHECK refuses **any** update to an already-violating row,
 * including an update to a column the predicate does not mention
 * `[VERIFIED: 43-RESEARCH.md § B.1b]`. So if the row `min(pk)` picks is one of
 * the six forbidden personas, all fourteen `profiles × update` cells stop being
 * an RLS verdict and become a `23514` — and `rls-baseline-compare.mjs` would
 * report fourteen `b3_cell_changed` defects with no visible cause.
 *
 * Today that row is `master/approved`, and it is so **only** because of the
 * order of two arrays: persona ids are `…-<index padded>` assigned by
 * `for role of PERSONA_ROLES { for status of PERSONA_STATUSES }`, with
 * `PERSONA_ROLES = ['master','organizer','member','staff']` and
 * `PERSONA_STATUSES = ['approved','pending','rejected']`, so index 1 is
 * `master/approved`. Move `pending` to the front of `PERSONA_STATUSES` and
 * index 1 becomes `master/pending`.
 *
 * Plan 43-08 appended `'staff'` after `'member'` for exactly this reason, which
 * leaves index 1 untouched; inserting it before `'master'` would also have been
 * safe, since `staff/approved` complies. **Reordering `PERSONA_STATUSES` would
 * not be**, and no comment prevents that — this assertion does.
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
        `wrote ${PERSONA_ROLES.length * PERSONA_STATUSES.length} personas and the matrix targets ` +
        'min(pk) among them, so an empty answer means the personas are not there. Nothing was measured.'
    );
  }

  const staffRole = ['master', 'organizer', 'staff'].includes(row.role);
  if (staffRole && row.status !== 'approved') {
    throw new Error(
      `the row the write matrix probes with \`update\` is ${row.role}/${row.status}, which violates ` +
        `"${ROLE_IMPLIES_APPROVED.name}". Once that constraint exists it is restored NOT VALID, and a ` +
        'NOT VALID CHECK refuses every update to an already-violating row — even on a column the rule ' +
        'does not mention. All fourteen `profiles × update` cells would stop reporting an RLS verdict ' +
        'and start reporting 23514, and the comparator would call them fourteen changed cells with no ' +
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
