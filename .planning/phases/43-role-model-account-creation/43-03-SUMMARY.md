---
phase: 43
plan: 03
subsystem: supabase-data
tags: [container-harness, constraints, role-model, seed, detector]
requires:
  - "43-01 — the live constraint names and the zero-violating-row count"
provides:
  - "the seed-time drop-and-restore that keeps the four forbidden personas seedable once ROLE-02's constraint exists (D-05)"
  - "ROLE-02's only automated detector: four forbidden writes, four 23514s under the declared constraint name"
  - "the pinned rendering plan 43-06 flips `present` against, measured in postgres:17.6 and copied from the run"
  - "the assertion that keeps eleven `profiles × update` cells from silently flipping to 23514"
affects:
  - "plan 43-06 — flips one boolean in the same commit as its migration"
  - "plan 43-08 — appends `staff` to PERSONA_ROLES; the ordering hazard is now guarded"
tech-stack:
  added: []
  patterns:
    - "pre-registered declaration asserted against reality, never the reverse (verify-capabilities.mjs:107-121 shape)"
    - "seed-time relaxation in try/finally, copying the on_auth_user_created precedent"
    - "one enumerated tolerance instead of a wildcard, rls-baseline-compare.mjs discipline"
key-files:
  created: []
  modified:
    - "scripts/container/seed.mjs"
decisions:
  - "renderedDef pins production's rendering and the NOT VALID marker is a separate enumerated suffix, so the container-vs-production difference is exactly one string and one boolean, both named"
  - "the min(pk) assertion runs whether or not the constraint is present — a guard that first runs on the day it is needed is a guard nobody has seen run"
  - "the restore is bound to the drop having actually run, so a failure in the persona loop is not replaced by `constraint already exists`"
  - "PERSONA_ROLES and PERSONA_STATUSES left untouched — adding `staff` is plan 43-08's deliberate re-baseline"
metrics:
  duration: ~55 min
  completed: 2026-08-08
---

# Phase 43 Plan 03: The Seam That Keeps the Four Forbidden Personas — Summary

`scripts/container/seed.mjs` now drops ROLE-02's constraint around the persona
loop and restores it `NOT VALID` after — and, having restored it, watches it
refuse the four writes it forbids. The seam is inert today (`present: false`) and
was proved against a real constraint before being switched back off.

## What this plan actually bought

Two things that did not exist in this repository this morning:

1. **ROLE-03 keeps its price paid in advance.** Four of the nine seeded personas
   — `organizer/pending`, `organizer/rejected`, `master/pending`,
   `master/rejected` — become unrepresentable when plan 43-06 lands. They carry
   the sixteen write-matrix cells that caught phase 32's worst defect. The
   relaxation exists **before** the constraint does, so the net is never lost and
   then rebuilt under pressure.

2. **ROLE-02 gets its only automated detector.** `43-VALIDATION.md` marked *"a
   violating write is refused by the database"* ❌ Wave 0. There is no test runner
   for this product (`CLAUDE.md` Guardrail 1), and B1/B2/B3 never read
   `pg_constraint`, so without this the phase's central rule would have been a
   line in a migration that somebody believes.

## Task-by-Task

### Task 1 — the declaration, the relaxation, the probe row (commit `8d514f7`)

`ROLE_IMPLIES_APPROVED` holds the constraint's name, the predicate exactly as
plan 43-06 will write it, `present: false`, and `renderedDef`. It is **declared,
never derived**, on the reasoning `verify-capabilities.mjs:107-121` already
states: a check that reads its expectation off the thing it is checking cannot
fail. The paragraph beside it forbids editing the constant to make a run go
green, in the same register `assertDiscriminating` already uses — *investigate
the seed, never lower the requirement*.

Both directions of disagreement throw, and each message ends by naming what was
not measured:

- declared present, container absent → every assertion below would pass by having
  nothing to test;
- declared absent, container present → the four forbidden personas were about to
  be seeded against a rule this file does not know the shape of.

The drop sits before the existing `try`; the restore sits inside the existing
`finally`, `NOT VALID`, with the measured reason beside it.

**`assertProbeRowSatisfiesTheRule`** closes the fragility `43-RESEARCH.md` § B.3
flagged and recommended nailing down. The write matrix's `update` probe targets
`min(pk)` for one row per table (`rls-baseline.mjs:1221-1231`, `:1270-1271`), and
a `NOT VALID` CHECK refuses any update to an already-violating row *including on
a column the rule does not mention*. Index 1 is `master/approved` only because
`PERSONA_ROLES` starts at `master` and `PERSONA_STATUSES` starts at `approved`.
Move `pending` to the front and eleven `profiles × update` cells stop being an RLS
verdict and start being `23514`, which the comparator would report as eleven
changed cells with no visible cause. The assertion message says exactly that.

Two choices here are stricter than the plan asked for, both for the same reason:

- The key expression is built with the matrix's own exported `pkExpression`
  rather than a hand-written `min(id)`. `pkExpression` renders `"id"::text`, so a
  literal `min(id)` would be a **uuid** ordering compared against the matrix's
  **text** ordering — the two agree for today's ids and need not agree tomorrow.
  An assertion that picks a different row than the thing it guards guards
  nothing. One declaration, two readers, which is this file's own stated rule for
  `PROBE_PAYLOADS`.
- It runs whether or not the constraint is present. The hazard is dormant until
  43-06; a guard that first executes on the day it is needed is a guard nobody has
  ever seen run.

### Task 2 — the two assertions (commit `063e344`)

**Assertion 1 — the same object production enforces.** Reads back
`pg_get_constraintdef(oid)` and `convalidated`, compares against the pinned
`renderedDef` plus exactly one enumerated suffix (`NOT_VALID_SUFFIX`), never a
wildcard — the discipline `rls-baseline-compare.mjs` follows, because a
comparison with a wildcard in it has stopped being able to fail. It asserts
`convalidated = false` in the container and prints, on every run, that
production's is `true`, that this is the price of the `NOT VALID` restore, and
that **no capture would notice**: B1 dumps policies, B2/B3 fingerprint personas,
none of the three reads `pg_constraint`.

**Assertion 2 — the rule actually refuses.** Attempts the four forbidden writes
as new rows outside the persona range and requires, on each, SQLSTATE `23514`
**and** the declared constraint name — a `23514` from `profiles_status_check` or
`profiles_approved_via_check` would otherwise be a green for the wrong reason.
Then asserts the row count is unchanged: a refused insert must write nothing. Its
comment states that it is ROLE-02's only automated detector, so anyone about to
delete it knows what they are deleting.

Both print an explicit `skipped:` line when `present` is false, naming what was
not measured, rather than passing silently.

**One thing deliberately not printed.** `error.detail` on `public.profiles`
carries `Failing row contains (…)` — every column, membership code included
(`43-MEASUREMENTS.md` measurement 5, and reproduced incidentally here). These
rows are synthetic, but the habit of printing that field is the one that
publishes a door credential the day the same shape appears in product code. The
assertions print code and constraint name only.

**Identity convention.** The four probe rows obey the file's own rules: ids whose
first group is the literal `43000004`, addresses at `.invalid`, names that are
ROLEs, and membership codes `RSN-SEED4301`…`4` — whose `0` and `1` the trigger's
alphabet `ABCDEFGHJKLMNPQRSTUVWXYZ23456789` cannot mint. None is ever written.
They are built to the convention anyway, because the day one *is* written is the
day the rule stopped working, and on that day the row must still be unmistakably
synthetic.

### Task 3 — proved against a real constraint (commit `c5f01c1`)

A scratch migration `29999999999998_probe_role_implies_approved.sql` carried the
predicate verbatim inside `BEGIN; … COMMIT;`, `present` was flipped to `true`,
and **both edits were confirmed applied before any result was read** — `git
status --porcelain` showed the untracked migration, and `git diff` showed
`-  present: false` / `+  present: true` as the single applied hunk. This is
`ai-engineering.md`'s *prova per mutazione* gate, which exists because a
substitution that silently failed once made a working check look broken; the same
error in the other direction would certify a dead check as alive.

**The four observations, verbatim from the run:**

```
      profiles_role_implies_approved restored: CHECK (((role <> ALL (ARRAY['master'::text, 'organizer'::text, 'staff'::text])) OR (status = 'approved'::text))) NOT VALID
      convalidated=false here, true in production — the price of the NOT VALID restore, and no capture reads pg_constraint, which is why it is asserted rather than compared
      refused organizer/pending   23514 profiles_role_implies_approved
      refused organizer/rejected  23514 profiles_role_implies_approved
      refused master/pending      23514 profiles_role_implies_approved
      refused master/rejected     23514 profiles_role_implies_approved
      4/4 forbidden writes refused, profiles still 9 rows
      profiles × update probes master/approved — satisfies profiles_role_implies_approved
      seeded 20 tables, 9 profiles, 9/9 role × status cells
      profiles role × status: master/approved=1 master/pending=1 master/rejected=1 member/approved=1 member/pending=1 member/rejected=1 organizer/approved=1 organizer/pending=1 organizer/rejected=1
  ✓ seed — 20 tables seeded, 9 profiles
```

**The rendered definition, for plan 43-06 to pin against** — copied from the run,
not composed:

```
CHECK (((role <> ALL (ARRAY['master'::text, 'organizer'::text, 'staff'::text])) OR (status = 'approved'::text)))
```

Postgres re-prints `role not in (…)` as `role <> ALL (ARRAY[…])`. A hand-written
expectation would have been wrong in a way that looks right, which is the whole
reason this is measured rather than declared from the migration's source.

**Negative control 2 — the `NOT VALID` is what makes the restore possible.**
Changing the restore to a plain `add constraint` and re-running:

```
  ✗ check constraint "profiles_role_implies_approved" of relation "profiles" is violated by some row
```

Restored.

**Negative control 1 — and it found a defect, which is why controls exist.**
Commenting out the drop and re-running did **not** produce the seed's refusal. It
produced:

```
  ✗ constraint "profiles_role_implies_approved" for relation "profiles" already exists
```

An exception thrown from a `finally` **replaces** the exception from the `try`.
The persona loop had raised its `23514` exactly as designed, and the restore —
attempted although no drop had happened — overwrote it with a message about a
duplicate constraint. An operator would have been handed a cause that points at
the wrong thing entirely: `meta-gates.md`, *zero fallimenti silenziosi*, a
failure whose distinguishing category is lost on the way out.

Fixed inline: the restore is now bound to a `relaxed` flag set only when the drop
actually ran, not to the declaration. With that fix the control reports the real
violation:

```
  ✗ new row for relation "profiles" violates check constraint "profiles_role_implies_approved"
```

Restored, and the green re-observed with the constraint present.

**A correction to the plan's own prediction.** The plan expected the seed to
throw *"on the fifth persona"*. It throws on the **second**: personas are built
`for role of PERSONA_ROLES { for status of PERSONA_STATUSES }` with `master`
first and `approved` first, so index 1 is `master/approved` and index 2 is
`master/pending` — the first forbidden pair. The behaviour the plan wanted (throw
rather than under-fill the grid) is what happened; only the ordinal was wrong.

Then: `present` back to `false`, scratch migration deleted, and the whole thing
re-run green in the state the phase actually leaves the tree in.

## Deviations from Plan

### Auto-fixed issues

**1. [Rule 1 — Bug] The restore in the `finally` masked the seed's own failure**
- **Found during:** Task 3, negative control 1
- **Issue:** the restore was gated on `ROLE_IMPLIES_APPROVED.present`, so if the
  drop had not run — or had not taken — the `finally` raised `constraint …
  already exists`, replacing the `try`'s real exception. A misleading cause in
  place of a distinguishable one.
- **Fix:** a `relaxed` flag set only when the drop actually executed; the restore
  is bound to it. The reason is written beside the code, including that it was
  measured rather than foreseen.
- **Files modified:** `scripts/container/seed.mjs`
- **Commit:** `c5f01c1`

**2. [Rule 2 — Missing correctness] `min(id)` replaced by the matrix's own `pkExpression`**
- **Found during:** Task 1
- **Issue:** the plan's `select … where id = (select min(id) …)` compares uuids,
  while `resolveProbeKeys` compares `"id"::text`. Two orderings that agree today
  and are not required to agree tomorrow. An assertion that names a different row
  than the thing it guards is decoration.
- **Fix:** `pkExpression` imported from `rls-baseline.mjs` and used to build the
  key, so the assertion cannot drift from the probe it protects.
- **Files modified:** `scripts/container/seed.mjs`
- **Commit:** `8d514f7`

### Deliberate scope choices

- **The `min(pk)` assertion runs unconditionally**, not only when the constraint
  is present. Reason written above and in the code.
- **`renderedDef` pins production's rendering, not the container's.** The
  ` NOT VALID` marker is a separate named constant, so the difference between the
  two databases is exactly one enumerated suffix and one boolean, both asserted.
  Plan 43-06 can pin the identical string.

## What was NOT verified

- **No test runner exists for this product** (`CLAUDE.md` Guardrail 1). Nothing
  here is claimed verified because tests pass. Every claim above is a line of
  output from a run, a `pg_constraint` read, or a cited file.
- **The container is not production.** Everything measured here is
  `postgres:17.6` built from the base schema plus the migrations. The constraint
  itself does not exist in production yet — that is plan 43-06.
- **`convalidated` is `false` here and will be `true` in production.** That is
  asserted and printed, not resolved: it is the structural price of the restore.
  The predicate is identical; the validation flag is not.
- **The rendering was measured against a probe migration, not against 43-06's
  real one.** If 43-06 writes the predicate differently — a different literal
  order, a different spelling — `renderedDef` will not match, and assertion 1
  will say so. That is the assertion working, not a defect here.
- **The four probe inserts are refused by the CHECK before the foreign key to
  `auth.users` fires.** Measured in `postgres:17.6` (`ExecConstraints` precedes
  the AFTER-row referential trigger) and re-asserted on every run by requiring
  the constraint's own name in the error, so it stays measured rather than
  assumed.
- **Nothing in `src/` changed**, and `npm run build` was run anyway as the
  regression check the plan asked for.

## Verification

| Check | Result |
|---|---|
| `node --check scripts/container/seed.mjs` | silent |
| `npm run baseline:container -- --seed-only --report` (tree as left) | exit 0, 9/9 grid cells, both `skipped:` lines printed |
| same, with the probe migration and `present: true` | exit 0, 9/9 cells, 4× `23514`, count unchanged, `master/approved` |
| `ls supabase/migrations/ \| grep '^2999'` | nothing |
| `git status --porcelain` after task 3 | only `scripts/container/seed.mjs` |
| `npm run build` | `✓ Compiled successfully`, 45/45 static pages |
| `npm run verify:capabilities -- --target=container` | `5/5 green, 0 warnings` — no grant row touched, so no declaration update was owed |

## Threat Flags

None. The plan's own register is fully covered: T-43-03-01 through -06 all
mitigated as written, and the `2999…` scratch migration is gone with an automated
check asserting it.

## Self-Check: PASSED

- `scripts/container/seed.mjs` — FOUND
- `.planning/phases/43-role-model-account-creation/43-03-SUMMARY.md` — FOUND
- `supabase/migrations/29999999999998_probe_role_implies_approved.sql` — correctly ABSENT
- commit `8d514f7` — FOUND
- commit `063e344` — FOUND
- commit `c5f01c1` — FOUND
