#!/usr/bin/env node
/**
 * verify-capabilities.mjs — one capability set, five sides, checked.
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
 * THE FIRST FOUR SIDES (phase decision D-33):
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
 * key — Phase 34 owns the decision, and five of the twelve keys gate tables
 * rather than routes.
 *
 * THE FIFTH SIDE (phase decision D-02, added by plan 43-02):
 *
 *   GRANT   `select role, capability, requires_approved from
 *           private.role_capabilities` — the rows themselves, compared against a
 *           declaration pre-registered in this file: every (role × capability)
 *           pair of the cross product is either a grant carrying its
 *           `requires_approved`, or a refusal, which is expressed in the database
 *           as the ABSENCE of a row. This side exists because a wrong grant row
 *           had no automated detector anywhere in this repository, and because
 *           the most dangerous shape of mistake — a refusal written as a
 *           `granted = false` row — would GRANT the capability, the resolver's
 *           `EXISTS` having no `granted` column in it (:209-216 of the model
 *           migration).
 *
 * WHAT A GREEN MEANS, AND WHAT IT DOES NOT. It means the four declarations name
 * the same strings, AND that every role holds exactly the set of capabilities
 * that was declared for it, with the `requires_approved` that was declared. It
 * still does not mean a policy is correct: which subjects a predicate admits is
 * measured by `npm run baseline:rls`, not here, and nothing in this file reads a
 * profile. Same distinction `verify-persona.mjs` draws between coherence and
 * correctness, and it has to be kept or the command becomes a stamp.
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
 *   0  the five sides agree (warnings do not change this)
 *   1  a comparison failed, or a side measured EMPTY
 *   2  the environment is wrong — a missing variable, an unknown flag, no
 *      Docker daemon. Nothing was measured, so nothing failed.
 *
 * SECRECY. `.planning/` is tracked and this repository is PUBLIC (CLAUDE.md
 * Guardrail 5). This script prints capability keys, policy names and grant rows
 * — all three are design, and a grant row is three columns of design: a role
 * label, a catalogue key and a boolean. It reads no row of `profiles`, so no
 * member and no staff member is named or counted; it writes no artefact; and every
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
 * Raised to NINE on 2026-08-08 by plan 43-07, which mints `register.read` in
 * `supabase/migrations/20260808002000_membership_register.sql` section 1 — a key
 * added in a plan, with its two grant rows and its policy, which is the only
 * legitimate reason this number moves.
 *
 * Raised to TWELVE on 2026-08-08 by plan 35-03, which mints `door.supervise`,
 * `media.upload` and `party.manage` in
 * `supabase/migrations/20260809001000_assignment_resolver.sql` section 1 — the
 * three keys `20260809000000_party_assignments.sql:340-342` already names as
 * per-night assignable and that had no catalogue row to point at. Each arrives
 * with a decision for all four roles, in this same commit.
 *
 * **Their CONSUMERS do not arrive with them, and that is visible rather than
 * hidden.** Side 4 reports all three as keys nobody asks for until plans 35-07,
 * 35-09, 35-11, 35-13, 35-16, 35-17 and 35-21 wire them. That warning is the
 * point — it is Phase 34's CAP-02 failure arriving early and cheaply — and
 * nothing here is adjusted to suppress it.
 *
 * Written here, not derived from either side, for the reason
 * `rls-baseline.mjs:113-130` states about its floors: a check that reads its
 * expectation off the thing it is checking cannot fail.
 *
 * **If this trips, look at the capability model, not at this constant.** Ten
 * keys means a capability was added — which is a design decision that belongs
 * in a plan, with a grant row and a policy or a route to go with it. Eight
 * means one was removed, and something is still asking for it.
 */
const EXPECTED_KEY_COUNT = 12;

/**
 * ── The pre-registered grant declaration (phase decision D-02) ─────────────
 *
 * Every (role × capability) pair of the cross product, declared as one of two
 * things and never as silence:
 *
 *   a GRANT — the `requires_approved` value the row must carry, `true` or `false`
 *   a REFUSAL — the string `REFUSED`, which means **no row at all**
 *
 * MEASURED on 2026-08-07 against
 * `supabase/migrations/20260807000000_capability_model.sql:390-423`. Written
 * here, not derived from `private.role_capabilities`, for the reason
 * `EXPECTED_KEY_COUNT` states above and `rls-baseline.mjs:113-130` states about
 * its floors: a check that reads its expectation off the thing it is checking
 * cannot fail.
 *
 * **If this trips, look at the capability model, not at this constant.** A pair
 * that changed here without a plan behind it is the check being edited to agree
 * with the defect it exists to find.
 *
 * WHY A REFUSAL IS AN ABSENCE AND NOT A COLUMN. The obvious alternative — a
 * `granted boolean` on `private.role_capabilities`, with `granted = false` rows
 * — is this phase's silent-widening trap, and it is worth naming before somebody
 * proposes it in good faith. The resolver at
 * `20260807000000_capability_model.sql:209-216` is:
 *
 *     select exists (
 *       select 1 from public.profiles p
 *       join private.role_capabilities rc on rc.role = p.role
 *       where p.id = (select auth.uid())
 *         and rc.capability = p_capability
 *         and (not rc.requires_approved or p.status = 'approved')
 *     );
 *
 * There is no `granted` in that `EXISTS`. A `granted = false` row therefore
 * **GRANTS** the capability — the refusal would read as an explicit denial to a
 * human and as a permission to Postgres, in every one of the 45 policy call
 * sites at once. So the refusal is declared HERE, in this constant, and the
 * database expresses it as the absence of a row. Do not add a `granted` column
 * without editing that resolver in the same migration; do not add one at all
 * while this constant exists to carry the meaning.
 *
 * The totals below are asserted as numbers, not only stated: a pair added to
 * this constant without a decision fails the arithmetic instead of sliding in.
 */
const ROLE_GRANTS = {
  master: {
    'staff.manage': false,
    'master.manage': false,
    'catalogue.manage': true,
    'membership.active': true,
    'admin.access': false,
    'organizer.access': false,
    // ── D-06, and this paragraph is the point of the two lines below ──────
    //
    // `door.operate`'s `requires_approved` is `false` on BOTH grants, and it
    // must stay false. Once ROLE-02's `role ⇒ approved` constraint exists this
    // flag will LOOK redundant and somebody will propose flipping it as
    // tidying. That is the ROADMAP's declared **"trap to refuse"**
    // (`.planning/ROADMAP.md:235-241`), and the migration says the same thing at
    // `20260807000000_capability_model.sql:415`: *"These two rows must not
    // become true."*
    //
    // The two guard DIFFERENT things. The constraint protects the database; this
    // row protects the night from the day the constraint is relaxed for one
    // special case. And the asymmetry that decides it is unchanged: refusing a
    // valid staff member at the door, in front of a queue, is worse than the
    // alternative — the first error happens in front of people, the second does
    // not.
    //
    // A reader who arrived here to remove the flag has now met the reason before
    // the value. Assertion 2 of side 5 fails on a flipped flag and names this.
    'door.operate': false,
    'membership.card.view': true,
    // D-19, plan 43-07. `master.manage`'s own description names *"changing
    // another member's role or status"*, so reading the record of those changes
    // needs no further justification. `requires_approved = true` on BOTH grants
    // of this key: the register contains rejections.
    'register.read': true,
    // ── ASSIGN-05, plan 35-03, and this is the SECOND pair of `false` rows ───
    //
    // `door.supervise` takes `requires_approved = false` on BOTH grants, and it
    // takes it for the reason written beside `door.operate` above, not by
    // imitation. Undoing a check-in is the action that CORRECTS a wrong refusal,
    // so it is the action least able to afford a second way of failing at the
    // door. Beside phase 43's `role ⇒ approved` constraint this flag will look
    // redundant; the constraint protects the database, this flag protects the
    // night from the day the constraint is relaxed for one special case.
    // Assertion 2 fails on a flipped flag and names the pair.
    'door.supervise': false,
    // `true`, and the difference from the two rows above is not an
    // inconsistency: neither of these happens in front of a queue, so the door's
    // reason does not reach them and an account whose own access was never
    // approved has no business on either.
    'media.upload': true,
    'party.manage': true,
  },
  organizer: {
    'staff.manage': false,
    // Refused: P2/P4 is master alone, and `master.manage` is what "reserved to
    // the master role" means. A row here would hand an organizer the deletion
    // of events, artists and venues.
    'master.manage': 'REFUSED',
    'catalogue.manage': true,
    'membership.active': true,
    // Refused: the middleware rule for `/admin/*` other than the scanner is
    // `role = master`. An organizer reaches `/organizer/*`, not `/admin/*`.
    'admin.access': 'REFUSED',
    'organizer.access': false,
    // D-06 — see the paragraph on `master.door.operate` above. This is the row
    // that matters at the door: an organizer whose status is still `pending`
    // must be able to scan.
    'door.operate': false,
    'membership.card.view': true,
    // D-19, plan 43-07. D-07 lets an organizer create and promote, and an actor
    // who cannot see the register cannot check their own work
    // (`community-membership.md`, gate *chi decide è tracciato*).
    //
    // THE `true` IS THE POINT OF THE KEY EXISTING. Gating the register on
    // `staff.manage` — whose flag is `false` — would have admitted an organizer
    // whose own access was never approved, to a table that holds rejections. The
    // "tidy" repair of flipping that flag is refused: it is the same `false`
    // that keeps `door.operate` open in front of a queue. A ninth key was minted
    // instead.
    'register.read': true,
    // ASSIGN-05, plan 35-03. `false` for the reason written beside
    // `master.door.supervise`, and it is the row that matters at the door: an
    // organizer whose status is still `pending` must be able to reverse a
    // check-in they just made by mistake.
    'door.supervise': false,
    // `true` on both, plan 35-03. Neither is at the door.
    'media.upload': true,
    'party.manage': true,
  },
  // ── The fourth role, added by plan 43-05 with its migration ───────────────
  //
  // Declared in the same commit as `20260808000500_staff_role.sql`, which is the
  // only order in which this side means anything: a declaration written after
  // the rows it checks has been fitted to them.
  //
  // Two grants and SIX refusals, and the six are the mechanism D-02 asks for.
  // `staff` is the role most likely to be quietly widened, because every one of
  // the six looks reasonable in isolation — a staff member who works the door
  // "obviously" needs `door.operate`, one who manages a guest list "obviously"
  // needs `staff.manage`. Without this list, a capability that is silently
  // absent is indistinguishable from a capability that was considered and
  // refused, and in six months nobody can tell which of the two they are looking
  // at. Listed here, the difference is readable, and adding a row makes this
  // side exit 1 naming the pair.
  //
  // The decision itself is D-03: work permissions are NOT granted by the role.
  // They come from Phase 35's per-night assignment and expire with the night.
  staff: {
    // Refused (D-03). The broad staff surface — events, parties, tickets,
    // tiers, drinks, guest lists, media moderation — is 34 policies wide and
    // permanent. A role that carried it would hand every past collaborator the
    // whole back office for ever.
    'staff.manage': 'REFUSED',
    // Refused (D-03). P2/P4 is master alone: deletion of events, artists and
    // venues.
    'master.manage': 'REFUSED',
    // Refused (D-03). The artists/venues write surface belongs to the organizer
    // definition, not to someone who worked a night.
    'catalogue.manage': 'REFUSED',
    // D-14 — every account is a member of the community, and refusing this would
    // make `staff` the only role that cannot RSVP to a night. It does NOT weaken
    // D-03: `member` already holds this exact grant with this exact flag, so
    // `staff` is levelled up TO member, not up FROM it.
    'membership.active': true,
    // Refused (D-03). `/admin/*` other than the scanner is `role = master`.
    'admin.access': 'REFUSED',
    // Refused (D-03). `/organizer/*` is the organizer area; `staff` has no
    // organizer surface, and `NAV_ITEMS` shows it none.
    'organizer.access': 'REFUSED',
    // Refused (D-03), and this is the load-bearing one. Working the door is the
    // per-night assignment of Phase 35, granted for one night and expiring with
    // it — not a property of having once been staff. A row here would let the
    // door of one night open every later night.
    //
    // If a later phase DOES grant it, it inherits the treatment of the two rows
    // above: `requires_approved = false`, for the reason written beside
    // `master.door.operate`. Refusing a valid staff member in front of a queue
    // is worse than the alternative.
    'door.operate': 'REFUSED',
    // D-01 — THE ONE THING THE ROLE GRANTS. Entry through the membership card,
    // permanently, including for someone who worked a single date.
    // `requires_approved = true` like every other role's card grant; plan
    // 43-06's `role ⇒ approved` rule then makes that flag always satisfied for
    // a staff account rather than a gate it can fail.
    'membership.card.view': true,
    // Refused (D-03, D-19). THE REGISTER HOLDS REJECTIONS, and reading a season
    // of them is not a night's work. Whatever a staff account may do on the
    // night it was assigned to comes from Phase 35 and expires with that night;
    // this key would not expire with anything.
    'register.read': 'REFUSED',
    // ── The three refusals plan 35-03 adds, and they are the phase's own test ─
    //
    // Refused (D-03). Working the door is the per-night assignment; SUPERVISING
    // one is narrower still. A row here would let the supervision of one night
    // reach every later night, which is the leak the assignment exists to stop.
    'door.supervise': 'REFUSED',
    // Refused (D-03), AND THIS IS THE ONE THAT PROVES THE MODEL WAS MEANT.
    // Being `staff` does not confer the ability to upload a night's media. A
    // photographer gets it from the ASSIGNMENT, for the night they worked, and
    // it expires with that night. A row here would make every past collaborator
    // an uploader to every future night, and the assignment would become a label
    // on something that was already true.
    //
    // `20260808000500_staff_role.sql:125-136` wrote this refusal down before the
    // key existed: *"the upload ROLE-01 refuses is Phase 35's per-night work
    // upload"*. This line is that sentence acquiring a pair to be checked on.
    'media.upload': 'REFUSED',
    // Refused (D-03). A night's back office is a night's, and `staff` has no
    // organizer surface at all — `NAV_ITEMS` shows it none.
    'party.manage': 'REFUSED',
  },
  member: {
    'staff.manage': 'REFUSED',
    'master.manage': 'REFUSED',
    'catalogue.manage': 'REFUSED',
    'membership.active': true,
    'admin.access': 'REFUSED',
    'organizer.access': 'REFUSED',
    // Refused, and this is the pair mutation A injects: a `member` with a
    // `door.operate` row works the door. Nothing else in the model would say no.
    'door.operate': 'REFUSED',
    'membership.card.view': true,
    // Refused (D-19), and this is the refusal that decides what `rejected` MEANS.
    // A member holding this key would read the register — including their own
    // rejection row — which turns `rejected` from a state into a communication.
    // `community-membership.md`, gate *un rifiuto è una comunicazione, non uno
    // stato*: that wording is chosen once, with care, and is not leaked from a
    // table. There is deliberately no own-row policy either, so this refusal is
    // not routed around by `attendances_select_own`'s precedent.
    'register.read': 'REFUSED',
    // Plan 35-03. Nothing grants any of the three. A member holding
    // `door.supervise` would reverse check-ins; `media.upload` is refused
    // because the member-level contribution is `membership.active`, which they
    // already hold — the two are different questions and this line is what keeps
    // them separable.
    'door.supervise': 'REFUSED',
    'media.upload': 'REFUSED',
    'party.manage': 'REFUSED',
  },
};

/**
 * The arithmetic, pre-registered beside the declaration it counts.
 *
 * 48 pairs = 4 roles × 12 capabilities. 26 grants: the sixteen the capability
 * model seeded (`20260807000000_capability_model.sql:386`, *"Sixteen grant
 * rows"*), plus the two `20260808000500_staff_role.sql` adds, plus the two
 * `20260808002000_membership_register.sql` adds for `register.read`, plus the
 * six `20260809001000_assignment_resolver.sql` adds for the three per-night
 * keys. 22 refusals — the eight that were already every pair the first migration
 * does NOT insert, plus the six `staff` refusals of D-02, plus the two
 * `register.read` refusals of D-19 (`staff` and `member`), plus the six the
 * three per-night keys owe to `staff` and `member`.
 *
 * The three numbers have now moved three times, all on 2026-08-08 and all
 * because the MODEL changed, which is the one legitimate reason to touch them:
 *
 *   24/16/8  → 32/18/14   plan 43-05, a fourth ROLE
 *   32/18/14 → 36/20/16   plan 43-07, a ninth CAPABILITY
 *   36/20/16 → 48/26/22   plan 35-03, THREE per-night CAPABILITIES
 *
 * Lowering a total to make a run pass is the failure this constant exists to
 * catch, and it has a recorded shape: mutation C of plan 43-02 did exactly that
 * in two steps and was caught by assertion 4 after slipping past the arithmetic.
 *
 * Asserted rather than described: a role or a capability added to `ROLE_GRANTS`
 * without a decision for each of its counterparts fails here first, before any
 * database is read.
 */
const EXPECTED_PAIR_COUNT = 48;
const EXPECTED_GRANT_COUNT = 26;
const EXPECTED_REFUSAL_COUNT = 22;

/** The marker a refusal carries in `ROLE_GRANTS`. It means: no row at all. */
const REFUSED = 'REFUSED';

/** The roles `ROLE_GRANTS` decides for, in declaration order. */
const DECLARED_ROLES = Object.keys(ROLE_GRANTS);

/**
 * The ONE place a (role, capability) pair becomes a Map key.
 *
 * One function, called by every half of every comparison below, and it is not
 * fastidiousness. Writing the same template literal in three places produced,
 * while this side was being written, a run in which all 24 pairs were reported
 * unaccounted and all 16 grants reported missing — with a declaration that was
 * entirely correct. The separators had drifted apart by one invisible
 * character, which no diff and no review shows. A comparison whose two halves
 * build their own keys is comparing its own typing, not the thing it measures;
 * this is the same lesson as the four sides themselves, one level down.
 *
 * `::` rather than a space: neither a role label nor a capability key can
 * contain it, so two distinct pairs cannot collide on one key, and the
 * separator is visible in a failure message.
 */
function pairKey(role, capability) {
  return `${role}::${capability}`;
}

/**
 * Flattens `ROLE_GRANTS` into one entry per pair, and checks its own arithmetic
 * before anything is measured.
 *
 * Each entry keeps its `role` and `capability` as FIELDS rather than as a key
 * to be split apart later. The key is an implementation detail of the Map; a
 * failure message that re-derives a role by splitting that key is one invisible
 * character away from printing `undefined` at the reader, which is how this
 * function was first written and what `pairKey` above records.
 *
 * This runs at module scope on purpose: it reads no database, no file and no
 * network, so there is no reason to defer it, and the earliest possible failure
 * is the one a reader can act on. A declaration that does not add up is not a
 * weaker expectation — it is a different one than the one that was reviewed.
 */
function flattenDeclaration() {
  const grants = new Map(); // pairKey -> { role, capability, requiresApproved }
  const refusals = new Map(); // pairKey -> { role, capability }
  const malformed = [];

  for (const [role, byCapability] of Object.entries(ROLE_GRANTS)) {
    for (const [capability, value] of Object.entries(byCapability)) {
      const pair = pairKey(role, capability);
      if (value === REFUSED) refusals.set(pair, { role, capability });
      else if (typeof value === 'boolean')
        grants.set(pair, { role, capability, requiresApproved: value });
      else
        malformed.push(
          `ROLE_GRANTS.${role}["${capability}"] is ${JSON.stringify(value)} — a pair is either ` +
            `a boolean requires_approved (a grant) or the string "${REFUSED}" (no row at all).`
        );
    }
  }

  const total = grants.size + refusals.size;
  const problems = [...malformed];
  if (total !== EXPECTED_PAIR_COUNT)
    problems.push(
      `ROLE_GRANTS declares ${total} pairs, expected ${EXPECTED_PAIR_COUNT} ` +
        `(${DECLARED_ROLES.length} roles × ${EXPECTED_KEY_COUNT} capabilities).`
    );
  if (grants.size !== EXPECTED_GRANT_COUNT)
    problems.push(
      `ROLE_GRANTS declares ${grants.size} grants, expected ${EXPECTED_GRANT_COUNT}.`
    );
  if (refusals.size !== EXPECTED_REFUSAL_COUNT)
    problems.push(
      `ROLE_GRANTS declares ${refusals.size} refusals, expected ${EXPECTED_REFUSAL_COUNT}.`
    );

  if (problems.length)
    refuse(
      'the pre-registered grant declaration does not add up, so nothing below it is the ' +
        'expectation that was reviewed:\n  - ' +
        problems.join('\n  - ') +
        '\nA role or a capability added without a decision for each of its counterparts fails ' +
        'here. Look at the capability model and at phase decision D-02, NOT at the totals. ' +
        'Nothing was measured against any database.',
      1
    );

  return { grants, refusals };
}

const DECLARATION = flattenDeclaration();

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
 *
 * Exported so that a mutation proof can assert its mutation was applied **using
 * this reader**, not a second one. `ai-engineering.md`'s *prova per mutazione*
 * gate asks for the mutation to be verified before its result is believed, and
 * the only assertion worth having is that the mutation is visible to the eyes
 * that are supposed to catch it. A separate grep can agree with the file and
 * still disagree with the parser.
 */
export function readCapObject(keysPath) {
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
 * The grant rows, read from whichever database the target points at.
 *
 * This is the read the header of this file said for two phases did not happen.
 * It is three columns and no member row: `role` is one of three design labels,
 * `capability` is a catalogue key, `requires_approved` is a flag. Nothing here
 * identifies a person, which is what keeps this script printable in a public
 * repository (CLAUDE.md Guardrail 5).
 *
 * `read_only: true` for the same mechanical reason as `readCatalogue`.
 */
async function readGrants(target) {
  const rows = await target.query(
    `select role, capability, requires_approved
       from private.role_capabilities
      order by role, capability`,
    { readOnly: true }
  );
  return rows.map((r) => ({
    role: String(r.role),
    capability: String(r.capability),
    // The Management API renders booleans as JSON booleans and the container
    // target through `pg` as JS booleans; both are compared as booleans here so
    // a string "false" can never read as truthy.
    requiresApproved: r.requires_approved === true || r.requires_approved === 'true',
  }));
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
  const grantRows = await readGrants(target);

  // ── the refusal, before any comparison ──────────────────────────────────
  //
  // An empty side makes every comparison below vacuously green, and a check
  // that cannot fail is not a check. This is the same refusal as
  // `verify-persona.mjs:225-233` and `rls-baseline.mjs`'s floors, and it is
  // stated as five independent clauses so the message names WHICH side was
  // empty rather than reporting "something is wrong".
  //
  // The GRANT clause is the one that matters most, and it is the least
  // intuitive: an empty `private.role_capabilities` denies EVERYTHING —
  // `has_capability` answers false for every subject and every key — while a
  // side-5 that only compared rows it found would report every grant missing
  // and every refusal honoured. Reporting the emptiness is the honest answer;
  // reporting "14 refusals confirmed" would be true and useless.
  const empty = [];
  if (tsKeys.length === 0) empty.push(`TS — ${capObject.reason ?? 'no keys parsed'}`);
  if (dbKeys.length === 0) empty.push('DB — private.capabilities returned no rows');
  if (policyKeys.size === 0)
    empty.push(`POLICY — no policy in ${policyRows} rows of pg_policies calls has_capability`);
  if (srcKeys.size === 0)
    empty.push(`SRC — no CAP. reference found in ${fileCount} files under src/`);
  if (grantRows.length === 0)
    empty.push(
      'GRANT — private.role_capabilities returned no rows, so every role holds NOTHING and ' +
        'every comparison of a grant below would report a loss rather than a mismatch'
    );
  if (empty.length) {
    say('');
    refuse(
      `${empty.length} of the five sides measured EMPTY, so every comparison below would be ` +
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
      `(${fileCount} files walked) · GRANT ${grantRows.length} rows\n`
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
          'because Phase 34 owns the decision, and because five of the twelve keys gate TABLES ' +
          'rather than routes.'
      );
    warn(
      '4 · every catalogue key is asked for by a policy or by src/',
      problems,
      `${dbKeys.length} keys, all reached: ${policyKeys.size} by policy, ${srcKeys.size} by src/`
    );
  }

  // ── 5 · the grant rows versus the pre-registered declaration (D-02) ──────
  //
  // Assertion 1 — "the side is not empty" — is the GRANT clause of the refusal
  // above, before any comparison, for the reason stated there. The three below
  // are the comparisons, and each message ends by naming what was NOT measured,
  // on the shape of `scripts/container/seed.mjs:317-324`: a failure that does
  // not say what it leaves unknown invites the reader to assume the rest is
  // fine.
  //
  // PROVED BY MUTATION, 2026-08-08 (`ai-engineering.md`, gate *prova per
  // mutazione*). A check never shown to fail proves nothing, and this project
  // has a recorded incident of a green read from a mutation that had not
  // applied — so each mutation below was confirmed applied, by `git status
  // --porcelain` or `git diff --stat`, BEFORE its result was read:
  //
  //   A  a scratch migration inserting ('member','door.operate',false) —
  //      the widening. Container only. Exit 1, naming member × door.operate.
  //   B  a scratch migration deleting ('organizer','door.operate') — the loss
  //      that shows up at the door. Container only. Exit 1, naming the pair.
  //   C  the member × door.operate entry removed from ROLE_GRANTS. Exit 1 from
  //      the arithmetic guard; with the two totals lowered to match — the shape
  //      of somebody making the check agree with the edit — exit 1 again, this
  //      time from assertion 4, naming the pair as UNACCOUNTED.
  //
  // Both targets were 5/5 green before any mutation and after every revert, and
  // no scratch migration survived the task. The messages are quoted verbatim in
  // `.planning/phases/43-role-model-account-creation/43-02-SUMMARY.md`.
  {
    const { grants, refusals } = DECLARATION;
    const problems = [];

    // Built with `pairKey`, the same function the declaration used — see its
    // comment for why that matters more than it looks.
    const foundByPair = new Map(); // pairKey -> requires_approved, as read
    for (const row of grantRows)
      foundByPair.set(pairKey(row.role, row.capability), row.requiresApproved);

    // ── assertion 2 · every declared grant has its row, with its flag ──────
    for (const [pair, { role, capability, requiresApproved: declared }] of grants) {
      if (!foundByPair.has(pair)) {
        problems.push(
          `${role} × ${capability} is a DECLARED GRANT with NO ROW in ` +
            'private.role_capabilities — THE ROLE SILENTLY LOST A CAPABILITY. ' +
            (capability === 'door.operate'
              ? 'This one is the door: the loss shows up as a refusal in front of a queue, at ' +
                'two in the morning, on a phone. '
              : '') +
            'Whether any OTHER source would still grant it was not measured — ' +
            'private.has_capability has exactly one source today, so there is none.'
        );
        continue;
      }
      const found = foundByPair.get(pair);
      if (found !== declared)
        problems.push(
          `${role} × ${capability} has requires_approved = ${found}, declared ${declared} — ` +
            'THE PREDICATE CHANGED. ' +
            (capability === 'door.operate'
              ? 'This is the ROADMAP\'s "trap to refuse" (.planning/ROADMAP.md:235-241) and the ' +
                'migration\'s own "These two rows must not become true" ' +
                '(20260807000000_capability_model.sql:415). The role constraint protects the ' +
                'database; this flag protects the night from the day the constraint is relaxed ' +
                'for one special case. '
              : '') +
            'Which subjects this now admits or refuses was not measured — this side reads the ' +
            'rows, never a profile.'
        );
    }

    // ── assertion 3 · every declared refusal has NO row ────────────────────
    for (const [pair, { role, capability }] of refusals) {
      if (!foundByPair.has(pair)) continue;
      problems.push(
        `${role} × ${capability} is a DECLARED REFUSAL but HAS A ROW in ` +
          `private.role_capabilities (requires_approved = ${foundByPair.get(pair)}) — ` +
          'THIS IS A WIDENING. private.has_capability matches on (role, capability) alone ' +
          '(20260807000000_capability_model.sql:209-216): there is no `granted` column in that ' +
          'EXISTS, so the row GRANTS the capability whatever it was meant to express. Every ' +
          `${role} now holds "${capability}" in every policy and every caller that asks for it, ` +
          'at once. Which policies those are was not measured here — side 2 lists the keys ' +
          'policies ask for, and src/ asks for more.'
      );
    }

    // ── assertion 4 · no pair is unaccounted, in either direction ──────────
    const declaredRoles = new Set(DECLARED_ROLES);
    for (const role of DECLARED_ROLES)
      for (const key of dbKeys) {
        const pair = pairKey(role, key);
        if (grants.has(pair) || refusals.has(pair)) continue;
        problems.push(
          `${role} × ${key} is UNACCOUNTED: the catalogue holds "${key}" and ROLE_GRANTS ` +
            `decides nothing for ${role}. A capability minted without a decision for each role ` +
            'is exactly what D-02 forbids — "considered and refused" must be distinguishable ' +
            'from "forgotten", and silence is the second. Whether the database has a row for ' +
            'this pair was not measured, because there is nothing to compare it against.'
        );
      }
    for (const row of grantRows)
      if (!declaredRoles.has(row.role))
        problems.push(
          `a row grants ${row.role} × ${row.capability}, and ROLE_GRANTS decides nothing for ` +
            `the role "${row.role}" — AN UNDECLARED ROLE HOLDS CAPABILITIES. Add the role to ` +
            'ROLE_GRANTS with a decision for every catalogue key, in the plan that introduces ' +
            'it. Nothing about what that role can reach was measured: this side can only ' +
            'compare against a declaration, and there is none.'
        );

    if (problems.length)
      problems.push(
        'Look at the capability model and at the migration that changed it, NOT at ROLE_GRANTS. ' +
          'Editing the declaration to agree with the database is editing the detector to agree ' +
          'with what it was built to detect.'
      );

    check(
      '5 · every role holds exactly the declared set of capabilities',
      problems,
      `${grants.size} grants and ${refusals.size} refusals over ${DECLARED_ROLES.length} roles × ` +
        `${dbKeys.length} keys, both directions, ${grantRows.length} rows read`
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

  console.log('\nverify-capabilities — one capability set, five sides\n');

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
    '\n  Note: this asserts that the four declarations name the same keys, AND that every role' +
      '\n  holds exactly the capabilities declared for it in ROLE_GRANTS, with the declared' +
      '\n  requires_approved — private.role_capabilities IS read here, since plan 43-02. It does' +
      '\n  NOT assert that any policy is correct: which subjects a predicate admits is measured' +
      '\n  by npm run baseline:rls, and no profile row is read by this script.\n'
  );

  if (failures.length) {
    say(`FAILED ${failures.length}/5: ${failures.join(' · ')}\n`);
    process.exit(1);
  }
  say(
    warnings.length
      ? `5/5 green, ${warnings.length} warning(s) — see above.\n`
      : '5/5 green, 0 warnings.\n'
  );
}
