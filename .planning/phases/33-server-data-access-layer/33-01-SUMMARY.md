---
phase: 33-server-data-access-layer
plan: 01
subsystem: access-gating
tags: [capabilities, dal, rls, ownership, migration]
requires: []
provides:
  - "public.my_access_context() -> user_id"
  - "AccessContextResult.userId"
  - "ownsOrIsMaster / assertEventOwnership"
affects:
  - "plans 33-02..33-14 (every surface that will stop reading x-user-*)"
  - "phase 34 STAFF-03 (owns removing role/status from the payload)"
  - "phase 35 (hasCapability(key, { partyId }) stays source-compatible)"
tech-stack:
  added: []
  patterns:
    - "one resolver, extended — not a second module (CAP-01)"
    - "identity as a nullable value, never an empty string"
    - "two distinct thrown categories, never one collapsed catch"
key-files:
  created:
    - supabase/migrations/20260808000000_access_context_user_id.sql
    - src/lib/capabilities/guards.ts
  modified:
    - src/types/database.ts
    - src/lib/capabilities/server.ts
decisions:
  - "D-33-01-A: userId is `string | null` and NEVER `\"\"` — plans 33-07/08/09 depend on this"
  - "D-33-01-B: the master short-circuit runs before the ownership read, consolidating on the action-level polarity"
  - "D-33-01-C: assertEventOwnership takes the Supabase client as a parameter; plan 33-09 decides which client is correct"
  - "D-33-01-D: MASTER_MANAGE chosen by the QUESTION asked, not by the predicate that currently matches"
metrics:
  duration: "~50 min"
  completed: 2026-08-07
  tasks: 4
  commits: 4
requirements: [CAP-05]
---

# Phase 33 Plan 01: The One Module Summary

`my_access_context()` now returns the caller's own `auth.uid()`, `getAccessContext()`
surfaces it as `userId: string | null`, and the ten scattered event-ownership
decisions have a single definition to converge on — with `CAP-03: clean` on both
targets proving the migration moved no permission.

## What was built

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | `user_id` in the payload, and in the type | `d3ee90b` | `supabase/migrations/20260808000000_access_context_user_id.sql`, `src/types/database.ts` |
| 2 | `userId` on `AccessContextResult` | `babe086` | `src/lib/capabilities/server.ts` |
| 3 | the one ownership definition | `f87a5e1` | `src/lib/capabilities/guards.ts` |
| 4 | CAP-03 on both targets | `b5410b4` | 10 baseline artefacts |

### The migration

**Filename:** `supabase/migrations/20260808000000_access_context_user_id.sql`
**Applied to production:** yes, via the Management API `POST /v1/projects/{ref}/database/query`,
the same door `scripts/rls-baseline.mjs` uses (its `loadEnvironment` +
`createManagementApiTarget` were reused so the project ref and the token pass through
the one redaction list). `GET /v1/projects/{ref}/postgrest` — the endpoint that returns
the JWT signing secret — **was not touched**.

It re-issues `CREATE OR REPLACE FUNCTION public.my_access_context()` with one added key,
`'user_id', (select auth.uid())`, keeping `language sql` / `stable` / `security definer` /
`set search_path = ''` and re-issuing `REVOKE … FROM public, anon` + `GRANT … TO
authenticated`. One transaction. `20260807000000_capability_model.sql` was **not** edited —
`git diff --stat` on it is empty.

Verified against the applied database, as impersonated authenticated subjects:

```
subject#0..#3: user_id_is_self=true  other_keys_identical=true  key_count=4
temporary function left behind: 0
anon refused with 42501: true
```

`other_keys_identical` is a real byte comparison, not an argument: the OLD three-key body
was re-created as a `SECURITY DEFINER` function inside the probe transaction and both were
called as the same subject, so the before/after runs simultaneously instead of across time.
Everything rolled back, and the rollback was re-read and asserted.

**Post-state ACL:** `postgres=X/postgres | authenticated=X/postgres | service_role=X/postgres`
— no `PUBLIC`, no `anon`.

## Decisions

**`userId` is `null`, never `""`.** Plans 33-07, 33-08 and 33-09 depend on this being true.
The eleven sites being replaced read `headersList.get("x-user-id") || ""`, which refused an
absent identity for an accidental reason — `""` happens to compare unequal to every real id.
`null` states the fact. The safety that the honest type demands is made once, in
`ownsOrIsMaster`, and never again.

**No fallback in the resolver.** An absent `user_id` on an authenticated payload maps to
`null`, not to a `supabase.auth.getUser()` rescue. That rescue would restore exactly the
round trip this migration exists to avoid, on exactly the paths where `cache()` does not
save you.

**The master short-circuit comes before the read.** Eight pages express "master passes" as
an implicit else, which quietly makes a master's verdict depend on whether the `events`
SELECT policy lets them read the row. Two actions short-circuit first. Consolidating on the
short-circuit is the only direction that stays correct if that policy is ever narrowed.

**`assertEventOwnership` takes the client as a parameter.** Two of the three call sites read
`events.created_by` under RLS and the third bypasses it. Those are not the same read (D-4).
A function that silently picked one would be the phase-32 `event_parties` trap in a new
costume. Plan 33-09 decides, with evidence.

**`MASTER_MANAGE`, chosen by the question.** *"May this person manage an event they do not
own"* is the reserved-operation question, not *"may they reach the admin area"*. Three keys
resolve to the same predicate today; picking by predicate is invisible until phase 35.

## Verification

**There is no test runner for this product, and none was added. Nothing here is verified
because tests pass.** What was actually run:

| Check | Result |
|---|---|
| `rm -rf .next && npm run build` after each task commit | passes |
| `git diff --stat supabase/migrations/20260807000000_capability_model.sql` | empty |
| `grep -c '46 files' src/lib/capabilities/server.ts` | `0` |
| `grep -n 'catch' src/lib/capabilities/server.ts` outside comments | none |
| `grep -v '^ *\*' src/lib/capabilities/guards.ts \| grep -c 'catch'` | `0` |
| `npm run baseline:compare --target=production --only=B1,B2` `33-pre`→`33-post` | **CAP-03: clean** — 67 policies, 0 unexplained; 220 read cells |
| `npm run baseline:compare --target=container --only=B1,B2,B3` `33-pre`→`33-post` | **CAP-03: clean** — 67 policies, 220 read cells, 660 write cells |
| `npm run verify:capabilities` | exit 0, 4/4 green, 0 warnings |

`33-pre` was captured **before** the migration was applied, on both targets.

### The named invariants, read out of the container write matrix

| Cell | `33-pre` | `33-post` |
|---|---|---|
| `organizer/pending` · `ticket_tiers` · insert | `ok:1` | `ok:1` |
| `organizer/pending` · `venues` · insert | `42501` | `42501` |
| `master/approved` · `profiles` · update | `42P17` | `42P17` |
| `member/approved` · `profiles` · update | `42P17` | `42P17` |
| `organizer/pending` · `profiles` · update | `42P17` | `42P17` |

`private.role_capabilities` on production, read directly: `door.operate` is
`requires_approved=false` for both `master` and `organizer`. Unchanged.

### What the green verdicts do NOT say

- **`verify:capabilities` reads the catalogue, never the grants.** It compares
  `src/lib/capabilities/keys.ts` against `private.capabilities` and against the keys used in
  policies and in `src/`. It does not read `private.role_capabilities`, so a green there is
  not a statement about who can do what (D-32-L). This plan adds no key; the expected result
  was unchanged parity, and that is what it reported.
- **B1/B2/B3 do not read function bodies.** The `CAP-03: clean` pair is a statement about
  policies, RLS-enabled tables, per-persona read counts and per-persona write outcomes. It
  proves the migration moved *nothing else*; it is not a second confirmation that the
  function changed. That confirmation is the four-subject probe above.
- **B2 on production is 78.2% vacuous** (172/220 cells agreed with a count of zero on a
  globally empty table). Production holds four profiles and no organizer row. The container
  carries the persona truth: 0% vacuous, 11/11 personas.
- **B3 proves nothing on 19/660 container cells** (2.9%) where a constraint, not a policy,
  answered.

### Mutation proofs — every check here was broken on purpose first

`ai-engineering.md`, gate *prova per mutazione*: each mutation was asserted to have been
**applied** before its result was read.

| Mutation | Asserted applied | Result |
|---|---|---|
| Old body loses its `'role'` key | `MUTATED_BODY.includes("'role',")` is false | `other_keys_identical` → **false** ✓ flips |
| `user_id` compared to a different subject | the two subject ids differ | `user_id_is_self` → **false** ✓ flips |
| `guards.ts` returns `"not-a-boolean"` | `grep -n 'not-a-boolean'` matched line 111 | `npm run build` → **type error at guards.ts:111** ✓ the build gate really sees the new file |

### The mutation that did NOT flip — and what it taught

Deleting `if (!ctx.userId) return false;` from `ownsOrIsMaster` **changed no answer.** The
mutation was confirmed applied (`grep -c` → 0) and the behavioural probe still refused every
case. The reason: `if (!createdBy) return false;` already catches the `null` / `null` case,
and `createdBy === ctx.userId` with a string owner and a null identity is false anyway.

Rather than report a green from an insensitive check — which is precisely the false negative
this project has a recorded incident for — a three-way mutation was run to find which line
carries the refusal:

| Variant | `ownsOrIsMaster(userId: null, createdBy: null)` |
|---|---|
| as shipped | `false` — refuses |
| identity refusal removed, `!createdBy` kept | `false` — still refuses |
| `!createdBy` weakened to `=== undefined`, identity refusal kept | `false` — still refuses |
| **both weakened** | **`true` — ADMITS** |

So the two lines are a **redundant pair**: neither is decoration, neither is independently
load-bearing, and the pair is what survives a future edit to either one. That finding is
written into the file's own comment so the next editor does not delete one because "the other
covers it". The plan's stated trap is real — it is real for the *naive* transcription, which
has no `!createdBy` line at all.

The behavioural probe ran the **real** `ownsOrIsMaster`, compiled from source by the project's
own `tsc` (`guards.ts` + `keys.ts` only; the two type-only imports erase), across nine inputs:

```
master + null owner -> admit      master + other owner -> admit
null identity + null owner -> REFUSE     null identity + real owner -> refuse
null owner + real user -> refuse   undefined owner -> refuse   "" owner -> refuse
non-owner -> refuse                owner -> admit
ALL 9 AS SPECIFIED
```

## Manual verification still owed

`guards.ts` has **no caller yet** — plans 33-07, 33-08 and 33-09 write them. Until then the
end-to-end proof that an organizer is refused another organizer's event through the new path
cannot be performed, because the old header path is still the one running. The written
procedure belongs to whichever plan first converts a page:

1. Sign in as an `organizer`/`approved` subject who does not own event *E*.
2. Visit `/organizer/events/<E>/edit`. **Observe:** `notFound()` / redirect, not the form.
3. Sign in as `master`. Visit the same URL. **Observe:** the form renders.
4. With the master session, temporarily revoke `master.manage` from `master` in
   `private.role_capabilities` inside a transaction, reload, **observe the refusal**, roll back.
   Step 4 is the mutation proof for the short-circuit and must not be skipped.

## Deviations from Plan

**None affecting scope.** Two departures from the letter of the plan, both recorded above:

1. **[Rule 2 — missing critical information]** The plan's task 3 asserts that
   `if (!ctx.userId) return false;` is "the reason the function exists". Measured, that line
   is redundant with its neighbour today. The line was **kept** (the plan is binding, and the
   pair is what makes the guard survive a future edit) and the measured redundancy was written
   into the file comment, so a later reader is not misled into thinking one line alone holds
   the boundary. Commit `f87a5e1`.
2. Task 4's container command in the plan passes `--only=B1,B2,B3`;
   `scripts/rls-baseline-container.mjs` does not accept `--only` (`FATAL: unknown flag`). Its
   known flags are `--smoke, --seed-only, --report, --phase-point, --overwrite`, and it
   captures B1+B2+B3 by default. The default run was used. The instrument was **not** edited.

## Deferred / noted, not fixed here

- **D-32-C is confirmed on the current tree.** `CLAUDE.md` Guardrail 3 and
  `.claude/rules/supabase-data.md` both claim `supabase/schema.sql` has zero `CREATE POLICY`.
  The cause is case: `schema.sql` is lowercase, the migrations uppercase. Every policy search
  must be case-insensitive. Not this plan's file to fix.
- `20260807000000_capability_model.sql:245` still reads "46 files". It is an applied
  migration and was deliberately left alone; the correction is a supersession note in the new
  migration's header, naming the line. The three TypeScript copies are corrected —
  `src/types/database.ts` and `src/lib/capabilities/server.ts` here,
  `src/lib/supabase/middleware.ts:76` in plan 33-14.
- Pre-existing `npm run lint` state (~21 errors / ~108 warnings) is untouched and unrelated.
- `server-only` was **not** adopted. It is optional, required by no criterion, and this plan
  installs nothing.

## Known Stubs

None. `guards.ts` has no caller yet by design — that is the next plans' work, not a stub:
every function in it is complete and exercised by the behavioural probe above.

## Threat Flags

None. The only surface added is one key on an existing `SECURITY DEFINER` function that takes
no argument, and the CAP-03 pair proves nothing else moved. T-33-01 through T-33-05 are all
mitigated as the plan's register specifies; T-33-05 (`accept`) holds because this plan
installs no package.

## Self-Check: PASSED

- `supabase/migrations/20260808000000_access_context_user_id.sql` — FOUND
- `src/lib/capabilities/guards.ts` — FOUND
- `src/lib/capabilities/server.ts` — FOUND (modified)
- `src/types/database.ts` — FOUND (modified)
- 10 baseline artefacts at `33-pre` / `33-post` — FOUND
- commits `d3ee90b`, `babe086`, `f87a5e1`, `b5410b4` — FOUND in `git log`
