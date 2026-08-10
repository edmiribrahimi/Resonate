---
phase: 36-formats-series-numbering
plan: 07
subsystem: catalogue-writes
tags: [server-actions, capability-guard, service-client, named-refusals, public-repo]

# Dependency graph
requires:
  - phase: 36-formats-series-numbering
    provides: the applied schema — formats, party_series, their named constraints and their RLS (36-03, 36-05)
  - phase: 36-formats-series-numbering
    provides: /admin/formats bound to catalogue.manage on the branch that opens addresses (36-06)
  - phase: 32-capability-model-in-the-database
    provides: the `catalogue.manage` key, `requires_approved = true`, and `getAccessContext()`
provides:
  - createFormat, updateFormat, setFormatListed, retireFormat, restoreFormat
  - createSeries, updateSeries, retireSeries, restoreSeries
  - CatalogueRefusal — twenty named causes, and CatalogueResult, the returned shape every surface in this phase branches on
affects: [36-08, 36-09, 36-12, 36-13]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "A refusal is a RETURNED value, never a thrown message — declared as a divergence from the three sibling action modules that throw"
    - "A `23505` is resolved into a named cause by a READ, never by looking for a constraint name inside `error.message`"
    - "A forbidden field name is not written even in the sentence forbidding it, so the grep that guards it cannot go green on its own prose"
    - "Publication is its own export with its own name, so a save cannot perform one by accident"

key-files:
  created:
    - src/app/(admin)/admin/formats/actions.ts
    - .planning/phases/36-formats-series-numbering/36-07-SUMMARY.md
  modified: []

key-decisions:
  - "The `23505` branch asks the database again instead of reading the constraint name out of the error message — the plan named the constraints to branch on, and the constraint name lives in `error.message`, which the same plan forbids branching on. A read resolves it without either compromise"
  - "The series members of `CatalogueRefusal` were declared in task 1 rather than appended in task 2: one union written once reads as a contract, a union extended twice reads as an afterthought"
  - "`createSeries` and `retireSeries`/`restoreSeries` revalidate `/admin/formats` only, and each says why in place — a series with no nights is on no public surface, and a retired series changes no public string"
  - "Four refusal members beyond the plan's list — `invalid_id`, `invalid_sort_order`, `invalid_listed`, `precheck_failed` — because each is a distinct cause an untrusted POST can produce, and the alternative was a shared bucket"

patterns-established:
  - "Where the database has no second half, the action says so in the member's own comment: `format_retired` records that no constraint reads `formats.retired_at`, so deleting the check opens the operation rather than moving it"

requirements-completed: []  # deliberately empty — D-36-19

# Metrics
duration: 12min
completed: 2026-08-10
---

# Phase 36 Plan 07: The catalogue writes — Summary

**Nine server actions behind one non-exported guard that is the entire boundary, because the two tables they write carry no write policy at all — and twenty named refusals, none of which is a shared "something went wrong".**

## Performance

- **Duration:** ~12 min (16:50 → 17:02)
- **Tasks:** 2 of 2
- **Commits:** `938e011`, `91d5c93`
- **Database writes:** zero. Nothing here was executed against a database; see *What this does not prove*.

---

## What was built

`src/app/(admin)/admin/formats/actions.ts` — 1100 lines, one module, nine exported actions and two exported types.

### The guard, and why it is the whole boundary

`assertCatalogueManage()` is copied in shape from `admin/venues/actions.ts:64-85`, including both throw categories and the `console.error` on the second one only. It is **not exported**: every export of a `"use server"` module is a public endpoint, and a gate is not one.

Nine exported actions, nine calls, one each, each the first statement of its body:

```
403  const { userId } = await assertCatalogueManage();   createFormat
498  await assertCatalogueManage();                      updateFormat
584  await assertCatalogueManage();                      setFormatListed
646  await assertCatalogueManage();                      retireFormat
701  await assertCatalogueManage();                      restoreFormat
836  const { userId } = await assertCatalogueManage();   createSeries
929  await assertCatalogueManage();                      updateSeries
1007 await assertCatalogueManage();                      retireSeries
1064 await assertCatalogueManage();                      restoreSeries
```

The docblock states, in this order: that the client is `getServiceClient()` and why that is **not** the choice its sibling makes (`venues` has a P3 RLS write arm that refuses an unapproved caller a second time; these two tables have none, so the cookie client would be refused for everybody); that there is therefore **no second refusal underneath this file**; and that §4c of the applied migration names this guard from the other side, so the two files agree in writing rather than by coincidence.

### The refusal union — twenty values, each with its reason

`CatalogueRefusal` covers shape (`invalid_id`, `invalid_name`, `slug_empty`, `invalid_code`, `invalid_color`, `invalid_sort_order`, `invalid_listed`), state (`format_not_found`, `format_already_retired`, `format_not_retired`, `series_not_found`, `series_already_retired`, `series_not_retired`, `format_retired`), collisions (`color_taken`, `duplicate_code`, `duplicate_series_code`, `duplicate_refused_by_database`) and failure (`precheck_failed`, `write_failed`).

Where a member is also enforced at the row, its comment says why the two halves do not substitute for each other. Where it is **not**, the comment says that too — `format_retired` records that no constraint anywhere reads `formats.retired_at`, so deleting the check opens the operation rather than moving it.

`color_taken` carries no holder name on purpose: the surface that offers the colours already holds the catalogue and can name the holder from the colour it just tried, and a value that carried a name would put a format's name inside a refusal.

### Publication is its own act

`createFormat` takes three arguments — name, code, colour — and **no `listed`**. The insert does not name the column at all, so the row is born on the database's own `false` default. `setFormatListed` is a separate export with its own name, so a reader of the call sites can see where publication happens and a save of a name cannot perform one (D-36-17). `createFormat` revalidates `/admin/formats` and deliberately **not** `/events`, with the reason written in place.

### Retirement, both pairs

`retireFormat` / `restoreFormat` and `retireSeries` / `restoreSeries` write `retired_at`. **No delete exists in the module** (`grep -Eci "\.delete\(\)"` → 0), and both foreign keys are `ON DELETE RESTRICT`, which makes the absence structural rather than remembered.

`restoreFormat` is not a one-line inversion: retiring **released** the colour, because `formats_color_active_unique` is partial on `retired_at IS NULL`, so another active format may hold it now. That path returns `color_taken`, and the comment says why the restore is a decision with its own confirmation rather than an undo (`production-calendar.md`: a retired sigla is not cited again).

### The series half

`updateSeries` accepts **no format argument**. The comment names `event_parties_series_format_fk` and its `ON UPDATE NO ACTION`, and then makes the point the constraint alone cannot: the database's half is **conditional** — a series with no nights yet would be repointed happily — so removing the signature's half would open the operation for exactly the rows where nobody would notice.

Above `createSeries`, the sentence the series name deserves: it is the one field in this phase that publishes, and the helper text is **advice** while the § S2 fallback is **the rule**. No validation inspects a name for venue-like content, and the comment says why not: no test can tell a venue from a word, a rejected string teaches a workaround, and the structural fallback already holds the line.

---

## Verification — what was run, and what it can and cannot prove

| Gate | Result |
|---|---|
| `npx tsc --noEmit` after task 1 and after task 2 | **zero errors in this file**, both times |
| `npm run verify:routes` after task 1 and after task 2 | **PASS** — 61 `revalidatePath` literals checked, 0 skipped, both checks green |
| `npx eslint src/app/(admin)/admin/formats/actions.ts` | clean — no error, no warning |
| `npm run build` | **compiles**, then **fails the typecheck on two files this plan does not own** — see below |

### The build is red, and not because of this plan

`npm run build` currently stops at:

```
./src/app/(admin)/admin/(work)/events/[id]/edit/page.tsx:171:13
Type error: … is missing the following properties from type 'PartyInitialData': format_id, series_id, number

./src/app/(admin)/admin/(work)/events/new/page.tsx(59,10)
Type error: … is missing the following properties from type 'EventFormProps': formats, series
```

Both are consumers of `src/components/events/EventForm.tsx`, which is **modified in the working tree by plan 36-10**, running in parallel right now — the props became required and its two mount points have not been updated yet. Neither file is in this plan's `files_modified`, and this plan's execution context forbids touching them.

So the plan's automated gate was met the only way it honestly could be: `npx tsc --noEmit` typechecks the whole project **without stopping at the first file**, and it attributes zero errors to `src/app/(admin)/admin/formats/actions.ts`. `next build` runs the same compiler; what it adds over `tsc --noEmit` — bundling and prerender — succeeded (`✓ Compiled successfully`) before the typecheck stopped it.

Recorded rather than worked around: **this plan cannot produce a green `npm run build` on its own**, and it did not weaken anything to appear to.

### The grep gates from the plan

| Gate | Required | Got |
|---|---|---|
| `export async function assertCatalogueManage` | 0 | 0 |
| every export calls the guard before its first database call | all | 9 of 9, each the first statement |
| `getServiceClient` | ≥1 | 8, and the docblock explains why not the cookie client |
| a site that **branches** on `error.message` | 0 | 0 — nine occurrences, all inside a `console.error` template |
| `console.error(…, err\|error)` | 0 | 0 |
| the field that carries the rejected row | 0 | 0 — and **the name is not written anywhere in the file**, not even in the sentence forbidding it |
| `listed` set by anything but `setFormatListed` | 0 | 0 — `createFormat`'s insert does not name the column |
| `\.delete\(\)` | 0 | 0 |
| `Something went wrong\|An error occurred` | 0 | 0 |
| the reversed e | 0 | 0 |
| `bpm\|techno\|house music\|downtempo\|genre` | 0 | 0 |

### What this does **not** prove

- **Not one of these actions has been executed.** No row was written, no refusal was returned, no `23505` was classified. A green typecheck says the code compiles; it says nothing about whether `formats_color_active_unique` fires where the comment claims it does.
- **A green typecheck does not check a single column name.** No Supabase client in this repository is parameterised with `Database` (`36-06-SUMMARY.md` measured it at four call sites), so `.from("party_series").select("id, format_id")` would compile with any spelling. Every column and constraint name in this file was read out of the applied migration by hand; that is the only check performed.
- **The guard was never refused.** Nobody without `catalogue.manage` called any of these, and nobody pending called them either. What is proved is structural — nine exports, nine first-statement calls, one non-exported gate — not observed.
- **`/admin/formats` still has no page** (plan 36-09), so no surface imports this module and no `revalidatePath` here has ever run.

---

## Deviations from Plan

### Auto-fixed issues

**1. [Rule 1 — Bug] `createFormat` asked the guard twice**

- **Found during:** Task 1, immediately after writing the file.
- **Issue:** the body opened with a discarded `await assertCatalogueManage().then(…)` followed by the real call. `cache()` does not memoise inside a Server Action body (`src/lib/capabilities/server.ts:103-121`), so that is a second full round trip on every creation — and `[id]/assignments/actions.ts:170-178` records that **more than one guard call in one action is the defect and no compiler sees it**.
- **Fix:** one call, with that sentence written above it as the comment.
- **Commit:** `938e011`

**2. [Rule 2 — Missing critical] Four refusal members the plan's list did not name**

- **Found during:** Task 1, enumerating what an untrusted POST can carry.
- **Issue:** these actions take `formatId`, `sortOrder` and `listed` straight off a POST body. A malformed uuid reaches PostgREST as `22P02`; a non-integer sort order as `22P02` or `22003`; a non-boolean `listed` writes whatever coercion produces. Without their own values all three would have landed in `write_failed`, which is the shared bucket the plan's own objective forbids.
- **Fix:** `invalid_id`, `invalid_sort_order`, `invalid_listed`, plus `precheck_failed` for a read that had to happen before the write and could not — distinct from `write_failed` because the two say different things about whether an attempt was made.
- **Commit:** `938e011`

### Departures from the plan text, deliberate and stated

**1. The `23505` branch asks the database instead of reading the constraint name.**

The plan asks for two things that cannot both be taken literally: *"branch `23505` from `formats_color_active_unique` to the colour-taken refusal … the constraint name is on the error"*, and the acceptance criterion *"no site that branches on the message; every branch is on `error.code`"*. PostgREST puts the constraint name in `error.message`, and nowhere else that is safe to read — the other field that carries it is the one that also carries the rejected row.

Resolved by deciding the cause with a **read**: each collision is pre-checked before the write, so in the normal case the operator gets the named sentence without any error at all, and a `23505` that survives the pre-check is classified by asking the same question again. Both requirements are met, and a third thing is gained — the refusal no longer depends on a string this project does not control. The residual case has its own member, `duplicate_refused_by_database`, in the shape `[id]/assignments/actions.ts:134-141` uses for its own practically-unreachable value.

**2. The forbidden field name is not written in the file at all.**

The plan asks for a comment naming what must never be logged. Writing the literal would have made the acceptance grep match its own prohibition — and `[id]/assignments/actions.ts:58-62` already records why that is a defect: *a check whose only match is the sentence forbidding the thing is a check that gets ignored the third time it goes red.* The docblock describes the field, cites `postgrest-details-leaks-the-row.md`, and says explicitly that its name is withheld and why.

**3. The series refusal members were declared in task 1, not appended in task 2.**

Task 2 asks to *extend* the union. They were written into it at once instead. One union written once reads as a contract; a union extended twice reads as an afterthought, and the members were known before either half was typed. Both of task 2's acceptance criteria on the union are satisfied.

**4. `createSeries`, `retireSeries` and `restoreSeries` do not revalidate `/events`.**

The plan says *"where a catalogue change can alter what a visitor sees"*. A series with no nights is readable on no public surface at all — `party_series_select_published` grants a read only **through** a published night — and a retired series changes no public string, because the archive keeps rendering the name its nights ran under. Each of the three says so in place, and `retireSeries` names the asymmetry with `retireFormat` explicitly so the difference reads as a decision.

### Not done, on purpose

- **No `FMT-*` ticked in `REQUIREMENTS.md`** — D-36-19. This module has never been called: no refusal has reached a person, no row has been written, and the surface that would import it does not exist yet. The phase verification ticks them once, with the evidence beside it.
- **Nothing was touched in `admin/events/actions.ts` or `(public)/events/page.tsx`** — plans 36-10 and 36-11 own them and were committing to this branch while this ran.
- **The two red files were not repaired.** They belong to a plan in flight; fixing another agent's half-written change would have been a merge, not a fix.

## Issues Encountered

- The working tree is shared with two plans executing in parallel, so `git status` was never clean and `npm run build` was red for reasons unrelated to this work. Every commit staged exactly one path; `git diff --diff-filter=D` is empty for both.

## Known Stubs

None. Every action performs its write, every branch returns a named value, and no placeholder, mock or default stands in for a database call. The one thing that does not exist yet is the **caller**: `/admin/formats` has no page until plan 36-09, which is that plan's declared deliverable and not a stub here.

## Threat Flags

None new. Every item in the plan's register is addressed in the file:

- **T-36-07-01** — the guard is first in all nine exports, is not exported, and asks a key that is `requires_approved = true`.
- **T-36-07-02** — the service client's RLS bypass is the docblock's second paragraph, so the missing write policy cannot be mistaken for coverage.
- **T-36-07-03** — every branch is on `error.code`; every log is a template carrying `error.code` and `error.message`; the leaking field is neither read nor named.
- **T-36-07-04** — `createFormat` has no `listed` argument and its insert does not name the column.
- **T-36-07-05** — the helper text is advice, the § S2 fallback is the rule, and no content filter was added; all three sentences are in the comment above `createSeries`.
- **T-36-07-06** — no delete exists; `ON DELETE RESTRICT` on both keys makes it structural.
- **T-36-07-07** — twenty named values, no shared failure string.
- **T-36-07-SC** — no package was installed.

## Self-Check: PASSED

- `src/app/(admin)/admin/formats/actions.ts` — present, 1100 lines, contains `CatalogueRefusal`
- `938e011` — present in git history
- `91d5c93` — present in git history
- `git diff --diff-filter=D HEAD~1 HEAD` and the same for `938e011` — both empty; no tracked file was deleted
- Nine `export async function`, nine `await assertCatalogueManage()` in export bodies

---
*Phase: 36-formats-series-numbering*
*Written and verified 2026-08-10. Two clean typechecks attributing zero errors to this file, two green `verify:routes`, one clean eslint — and a red `npm run build` whose two errors are named, attributed and left alone.*
