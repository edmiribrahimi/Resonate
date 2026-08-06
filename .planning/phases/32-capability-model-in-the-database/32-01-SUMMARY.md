---
phase: 32-capability-model-in-the-database
plan: 01
subsystem: evidence-harness
tags: [rls, baseline, cap-03, management-api, determinism]
requires: []
provides:
  - "scripts/rls-baseline.mjs — B1 (pg_policies dump) and B5 (advisor oracle) capture against a Management-API target"
  - "the artefact format every later plan in this phase reads (D-15)"
  - "the target abstraction plan 32-04 puts a container behind"
affects:
  - "package.json (one scripts entry)"
tech-stack:
  added: []
  patterns:
    - "zero-dependency ESM script, node built-ins only, global fetch"
    - "pre-registered plausibility floors with the reason inline (verify-persona.mjs:225-233)"
    - "three exit codes: 0 green, 1 a check failed, 2 the environment is wrong"
    - "deterministic committable JSON: fixed key order, codepoint sort, date-only timestamp"
key-files:
  created:
    - scripts/rls-baseline.mjs
  modified:
    - package.json
decisions:
  - "Entity identity in B5 comes from the advisor's cache_key, not from metadata: for auth_rls_initplan the metadata names only the table, and the 26 policies are the whole point of the artefact"
  - "B1 and B5 each append one artefact-specific trailing key after rows (supporting_counts, invariants); the six D-15 keys keep their declared order"
  - "The harness loads .env.local when it exists and falls back to the ambient environment, so a worktree or a CI runner is not refused for the wrong reason"
metrics:
  tasks: 2
  commits: 2
  duration: ~50 min
  completed: 2026-08-06
---

# Phase 32 Plan 01: The Read-Only Half of the CAP-03 Evidence Harness — Summary

A zero-dependency Node harness that captures the applied policy set and the
Supabase advisors from a live target as byte-deterministic, committable JSON —
and refuses to write anything when the measurement is implausible.

## What was built

**`scripts/rls-baseline.mjs`** (452 → 641 lines across two commits), ESM, node
built-ins only, `fetch` global, no dependency added. `grep -c "from ['\"][^n]"`
returns **0** — every import is `node:`-prefixed.

| Piece | What it does |
|---|---|
| `loadEnvironment()` | reads `SUPABASE_ACCESS_TOKEN` and `NEXT_PUBLIC_SUPABASE_URL` from `.env.local` (gitignored) or the ambient environment; derives the project reference from the URL's first hostname label; exit **2** naming the missing variable |
| `createManagementApiTarget()` | one `query(sql, {readOnly})` and one `get(path)`; `readOnly` has **no default** — the caller decides, so no query can become read-write by omission |
| the determinism contract | a comment block fixing D-15: key order, explicit per-row key order, codepoint sort (never `localeCompare`), sorted nested arrays, `JSON.stringify(v, null, 2)` + one newline, `captured_at` a **date** |
| `captureB1()` | `pg_policies` restricted to `schemaname='public'`, eight columns, sorted by `tablename, policyname, cmd`; `roles` parsed from Postgres's `{public}` text rendering into a sorted array so an added or removed `TO` clause shows in the diff |
| `captureB5()` | both advisors reduced to `{advisor, name, count, entities[]}`; plus the three standing invariants |
| `redact()` | every printed string passes through it; the token, the project reference, the Supabase URL and the PostgREST JWT secret are registered as secrets |

**`package.json:11`** — `"baseline:rls": "node scripts/rls-baseline.mjs"`.

## The measured figures — every one reproduces the research

Captured from production on 2026-08-06 with `npm run baseline:rls -- --only=B1,B5 --target=production`:

| Fact | Captured | `32-RESEARCH.md` § *Measured Baseline* |
|---|---|---|
| policy rows in `public` | **67** | 67 ✓ |
| tables with RLS enabled | **20** | 20 ✓ |
| `postgres_version` | **17.6** | 17.6 ✓ |
| `auth_rls_initplan` | **26** | 26 ✓ |
| `multiple_permissive_policies` | **46** | 46 ✓ |
| `unindexed_foreign_keys` | **35** | 35 ✓ |
| `unused_index` | **14** | 14 ✓ |
| `function_search_path_mutable` | **13** | 13 ✓ |
| `anon_security_definer_function_executable` | **14** | 14 ✓ |
| `authenticated_security_definer_function_executable` | **14** | 14 ✓ |
| `auth_leaked_password_protection` | **1** | 1 ✓ |
| `hook_custom_access_token_enabled` | **false** | false ✓ |
| `jwt_exp` | **3600** | 3600 ✓ |
| `db_schema` | **`public,graphql_public`** | same ✓ |

**No divergence.** The research was not invalidated by a migration applied in
between, and the P1/P2 populations confirm from the dump rather than from the
document:

```
$ grep -c 'is_admin_or_organizer' …/32-BASELINE-policies.json
34
$ grep -c 'is_master' …/32-BASELINE-policies.json
3
$ grep -c 'get_user_status' …/32-BASELINE-policies.json
2
```

34 (P1), 3 (P2), 2 (P5) — the counts `32-RESEARCH.md` § *The five predicates
that exist today* records.

## Observed verification

**1. A wrong environment exits 2, naming the variable.** `.env.local` removed,
only the URL supplied:

```
$ NEXT_PUBLIC_SUPABASE_URL=https://placeholder.supabase.co node scripts/rls-baseline.mjs --only=B1
FATAL: missing environment variable(s): SUPABASE_ACCESS_TOKEN. Set them in .env.local (gitignored) or in the environment. Nothing was measured.
exit=2
```

**2. Two consecutive captures are byte-identical.** Both artefacts, `cmp`
rather than `git diff`, because this plan commits no artefact and `git diff`
on untracked files is empty for the wrong reason:

```
$ cmp run1/32-BASELINE-policies.json  …/32-BASELINE-policies.json  → B1 BYTE-IDENTICAL
$ cmp run1/32-BASELINE-advisors.json  …/32-BASELINE-advisors.json  → B5 BYTE-IDENTICAL
```

**3. The floor was proved by mutation, and the mutation was verified as
applied before its result was read** (`ai-engineering.md`, gate *prova per
mutazione*). `FLOOR_POLICY_ROWS` 67 → 999, `grep -n` confirming line 99 held
`999`, the existing artefact deleted first:

```
  ✗ B1 — implausible measurement: 67 policy rows, floor is 999 (measured 2026-08-06).
        Nothing was written. Investigate the database — do not lower the floor.
FAILED 1/1: B1
exit=1
$ test -f …/32-BASELINE-policies.json  → policies-file-exists=1   (no file)
```

Reverted to 67, `grep -n` confirming the revert, re-captured: byte-identical to
the pre-mutation run.

**4. Nothing publishable-forbidden reached an artefact.** `grep -nE
'[0-9a-f]{8}-[0-9a-f]{4}'` over both files returns nothing (exit 1), and a
direct containment check against the live values of `SUPABASE_ACCESS_TOKEN`,
`NEXT_PUBLIC_SUPABASE_URL`, the project reference, `SUPABASE_SERVICE_ROLE_KEY`,
`NEXT_PUBLIC_SUPABASE_ANON_KEY` and `MASTER_EMAIL`, plus an email-shaped regex,
reports **CLEAN**.

**5. Source secrecy.** `grep -nE '(SUPABASE_ACCESS_TOKEN|supabase\.co)'` over
the script returns three lines: `:44` the API host constant
`https://api.supabase.com`, `:162` reading the variable, `:166` naming it in
the missing-variable message. No line writes either into an artefact or to
stdout.

**6. `npm run build` passes** — run after each task commit. There is no test
runner for the product; this is the typecheck gate and nothing under `src/`
changed.

## Findings

**F1 — `GET /v1/projects/{ref}/postgrest` returns the project's PostgREST JWT
secret** in the same response as `db_schema`. This was not in the research and
is exactly threat T-32-01-04's shape: the obvious implementation — store the
response, read `db_schema` off it later — would have written a live credential
into a **public** repository, irreversibly. The harness reads exactly one field
out of that response, never stores the rest, and registers the secret with
`redact()` so it cannot reach an error message either. The reason is written
beside the code so the next reader does not "simplify" it. **The value was
returned into a local session log during this plan's probing; it is in no file
and in no commit, but rotating it is the conservative call and is the owner's
to make.**

**F2 — `pg_policies.roles` arrives from the Management API as the *string*
`{public}`, not as a JSON array.** Left raw it would have been an opaque blob
in the diff. It is parsed into a sorted array, which is what makes an
added-or-removed `TO authenticated` clause visible in B1 — and
`32-PATTERNS.md` § *Shape P5* is explicit that `pg_policies.roles` is part of
B1 and that no `TO` clause may move.

**F3 — the advisor's `metadata` does not name the policy.** For
`auth_rls_initplan` it carries `{name: <table>, type: "table", schema:
"public"}` only; the policy name lives in `cache_key` and in the prose
`detail`. Entity identity therefore comes from `cache_key`, which is derived
from the entity and stable across runs. Had this been taken from `metadata`,
B5 would have named 8 tables where it needs to name 26 policies, and CAP-06's
per-policy evidence would have had no oracle.

## Deviations from Plan

### Auto-fixed issues

**1. [Rule 3 — Blocking] Task 1's verification requires a working B1 capture,
which the plan assigns to Task 2**

- **Found during:** Task 1
- **Issue:** Task 1's `<verify>` runs `node scripts/rls-baseline.mjs --only=B1`
  and its acceptance criteria assert a two-run byte-identical capture, but
  Task 2's action says "Add the B1 capture". Task 1 cannot be verified as
  written without it.
- **Fix:** Task 1 implements the skeleton **and** the B1 policy dump plus the
  `version()` read (`postgres_version` is one of D-15's six declared keys, so
  the format cannot be declared without it). Task 2 adds the supporting
  counts, both plausibility floors and B5, as written. Both tasks' verify
  commands then run as specified.
- **Files modified:** `scripts/rls-baseline.mjs`
- **Commits:** `3ea3754`, `416a006`

**2. [Rule 2 — Missing critical functionality] `redact()` over every printed
string**

- **Found during:** Task 1
- **Issue:** the plan requires that the token, the project reference and the
  URL never reach stdout or an artefact. Not printing them is a property of
  every code path, and a code path someone adds later — an API error body
  echoing what it was sent, for instance — is outside that guarantee.
- **Fix:** a `SECRETS` registry and a `redact()` applied by `say()` and
  `fail()`. The primary control remains that nothing writes a secret; this
  makes a leak need two mistakes instead of one. Extended in Task 2 to the
  PostgREST JWT secret (finding F1).
- **Files modified:** `scripts/rls-baseline.mjs`
- **Commits:** `3ea3754`, `416a006`

**3. [Rule 3 — Blocking] `.env.local` and `node_modules` do not exist in a
worktree**

- **Issue:** this plan executed in a git worktree, which holds no gitignored
  file. `process.loadEnvFile('.env.local')` would have thrown, and `npm run
  build` had no `next` to run.
- **Fix, in the code:** the harness loads `.env.local` **when it exists** and
  otherwise reads the ambient environment — a worktree or a CI runner should
  not be refused for the wrong reason, and the exit-2 refusal still fires on
  the variable itself. This is behaviour the real repository benefits from
  too.
- **Fix, in the execution environment only:** `.env.local` and `node_modules`
  were symlinked into the worktree from the main checkout for the duration,
  and **both symlinks were removed before the SUMMARY commit**. Both paths are
  gitignored (`.gitignore:4`, `:34`); neither was ever staged.
- **Files modified:** `scripts/rls-baseline.mjs`
- **Commit:** `3ea3754`

**4. [Format clarification] one trailing key per artefact**

D-15 declares six top-level keys in order. B1 needs to report the RLS-enabled
table count and B5 the three dashboard invariants, and neither is a row. Each
artefact appends **one** object after `rows` — `supporting_counts` and
`invariants`. The six declared keys keep their order and position; the rule is
written into the determinism comment block so a later plan reading the format
finds it there rather than by surprise.

## No artefact was committed

Deliberate, and it is the plan's instruction: the first committed capture is
plan `32-04`, against both targets. The artefacts produced here were written to
`.planning/phases/32-capability-model-in-the-database/baseline/`, verified, and
**deleted** before the SUMMARY commit. `git status` shows the directory as
never having existed in the index.

## What this does not cover

- **B2, B3 and B4 are not built.** B2 and B3 need persona impersonation in a
  read-write transaction ending `rollback;` — plan `32-03`. B4 is hand-written.
- **Only the `production` target exists.** `--target` refuses anything else
  with exit 2. Plan `32-04` puts a PostgreSQL 17.6 container behind the same
  `query()` signature; `32-VALIDATION.md` § *Known blocking dependency* still
  records Docker availability as unverified, and this plan did not verify it.
- **The floors are floors, not equalities.** A policy count *above* 67 does not
  trip anything. That is correct for a pre-phase capture and is the comparison
  B1's whitelist performs later, not the harness's job.

## Self-Check: PASSED

- `scripts/rls-baseline.mjs` — FOUND
- `package.json` contains `baseline:rls` at `:11` — FOUND
- commit `3ea3754` — FOUND
- commit `416a006` — FOUND
- no file deletions in either commit — CONFIRMED
