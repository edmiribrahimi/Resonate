---
phase: 34-one-work-surface
plan: 15
subsystem: persona + route tree
tags: [route-groups, persona, verify-persona, D-34-17, deletion]
requires:
  - "34-07 — R-WORK-ROUTES and the eight shared modules moved out of the organizer tree"
  - "34-06, 34-09..34-14 — the fourteen page files deleted before this plan"
  - "34-08 — ORGANIZER_REDIRECTS, which is what answers `/organizer` after the deletion"
provides:
  - "`src/app/(organizer)/` does not exist"
  - "a persona that describes the tree that exists — three route groups plus `(auth)`"
  - "`npm run verify:persona` green (7/7) with checks A, B and G no longer at risk"
affects:
  - "34-17 — the redirect walk, which is now the only record of the fifteen organizer addresses"
  - "39 — the door leaves `(admin)`; the geography section already says it sits outside `(work)`"
tech-stack:
  added: []
  patterns:
    - "a reversed decision is recorded as a reversal with its reason, never replaced silently"
key-files:
  created: []
  modified:
    - "CLAUDE.md (two index rows)"
    - ".claude/rules/access-gating.md (frontmatter)"
    - ".claude/rules/nextjs-architecture.md (frontmatter + geography + one gate + one imperative)"
    - ".claude/rules/meta-gates.md (priority table row)"
    - ".claude/rules/ai-engineering.md (context budget re-measured)"
    - ".claude/CHANGELOG.md (1.7.0)"
    - "src/lib/supabase/middleware.ts (a comment naming the deleted tree)"
  deleted:
    - "src/app/(organizer)/organizer/page.tsx"
decisions:
  - "D-34-17 honoured literally: deletion and persona correction in one commit, because check B compares two sides"
  - "The middleware comment corrected rather than excepted — plan 34-07 had excepted it; this plan is the commit after which it becomes false"
  - "`.claude/CHANGELOG.md` deliberately still names the deleted glob: a dated record is the one place that must"
metrics:
  duration: "~25 min"
  completed: 2026-08-10
requirements: [STAFF-01, STAFF-02]
---

# Phase 34 Plan 15: Delete the organizer tree, correct the persona — Summary

`src/app/(organizer)/` is gone, and the five places where the persona still
declared it are corrected **in the same commit** — `0997989`, eight files, one
deletion.

## The census, before anything was deleted

`find "src/app/(organizer)" -type f` returned **exactly one path**:

```
src/app/(organizer)/organizer/page.tsx
```

Every other file of that tree is accounted for and none was orphaned:

| Where it went | Who moved it |
|---|---|
| the fourteen other `page.tsx` files, deleted at their collapsed twins | plans 34-06, 34-09 … 34-14 |
| the eight shared modules (`actions.ts`, co-located client components) | plan 34-07, by `git mv`, to `src/app/(admin)/admin/…` |
| this last file | this plan |

The one that remained was a bare `redirect("/admin/events")` whose own docblock
named plan 34-15 as its owner. Nothing was deleted that no plan had decided
about.

`/organizer` keeps answering: `ORGANIZER_REDIRECTS` row 1 translates it to
`/admin/events` in `src/middleware.ts`, before route resolution — deliberately
to a rendered address and never to another redirect.

## The three checks that were at risk, and why one commit

`npm run verify:persona` is the repository's only automatic check. Deleting the
route group put three of its seven at risk at once:

| Check | What it asserts | Where it would have failed |
|---|---|---|
| **A** | no declared glob is dead | `access-gating.md` and `nextjs-architecture.md` frontmatter |
| **B** | `CLAUDE.md`'s index and each frontmatter declare the same glob set | `CLAUDE.md` index rows for Access & Gating and Next.js Architecture — **B compares two sides, so fixing one alone fails it from the other direction** |
| **G** | every priority-table row routes to a module that really loads there | `meta-gates.md`, the row naming both groups |

That is the mechanical reason D-34-17 says *same commit* rather than *next
commit*, and it is the reason the five edits are not a follow-up.

Result after the commit:

```
7/7 verdi.
```

with A reporting `56 glob su 941 file` and G `24 righe verificate contro i
frontmatter`.

## The edit that mattered most was prose

`nextjs-architecture.md` said *«Quattro route group, e il gruppo **e' il
pubblico»***. After D-34-02 the group is **not** the audience, and that is
accepted deliberately. A gate telling a future reader that putting a file in
`(admin)` is an access decision, when it no longer is, is the failure
`meta-gates.md` records as **worse than no table** — it makes someone believe a
gate is watching.

The rewritten geography now states:

- **three** route groups of audience — `(public)`, `(members)`, `(admin)` — plus
  `(auth)`, which is not an audience but the path to becoming one
- the group picks the **address**, not the authorisation; what decides who
  reaches a surface is **`src/lib/routes/capability-routes.ts`**, read by the
  middleware, the page guard and the navigation
- **the RLS is still the boundary** — that map decides where a *redirect*
  happens, not who may read a row
- the nested **`(work)`** group holds the route files of every work surface, and
  **R-WORK-ROUTES** with its one-line reason: a route group governs routing and
  nothing else, so moving a non-route module in buys nothing and changes the
  specifier in every importer — several of them on the public purchase path
- **`/admin/scanner` sits outside `(work)` deliberately**, so no layout wraps
  the door and Phase 39 can move it alone

The old sentence is **reversed with its reason, not replaced quietly** — the
house rule `src/app/(admin)/admin/scanner/page.tsx` already applies in its own
docblock, because a decision reversed without its reason reads as an oversight.

The gate and the imperative that repeated the same claim moved with it:
`Gate gruppo = pubblico` → **`Gate il gruppo non autorizza`**, with the concrete
situation that trips it (a new surface under `(admin)` with no row in the map),
plus a second imperative for R-WORK-ROUTES.

## The claim is checked, not asserted

```
$ find "src/app/(admin)/admin/(work)" -type f ! -name 'page.tsx' ! -name 'loading.tsx' ! -name 'layout.tsx'
$
```

Empty. R-WORK-ROUTES held across every plan of this phase without one
exception, which is the only reason the census can be quoted as evidence rather
than as a hope.

```
$ find "src/app/(admin)" -name page.tsx | wc -l
      23
```

22 work surfaces plus the door — the collapsed tree's full census.

## Verification

| Check | Result |
|---|---|
| `test ! -d "src/app/(organizer)"` | GONE |
| `npm run verify:persona` | **7/7 verdi**, exit 0 |
| `rm -rf .next && npm run build` | **exit 0** |
| `grep -rn '(organizer)' src/ .claude/rules/ CLAUDE.md` | zero matches |
| `find "src/app/(admin)" -name page.tsx \| wc -l` | 23 |
| `(work)` non-route census | empty |
| `git show --name-only HEAD` | deletion + all five persona edits in **one** commit |
| build output searched for `/organizer` | 0 occurrences |

**The `rm -rf .next` is load-bearing and was done twice.** `tsconfig.json`
includes `.next/types/**/*.ts`; a stale generated route union would still hold
`/organizer/*` and validate routes that no longer exist. A green build
immediately after deleting page files is Pitfall 4's warning sign, not evidence.

**Not claimed:** that `verify:persona` proves any gate is *correct*. It proves
the files agree with each other — its own closing note says so, and it is not
wired to `next build` on purpose. This repository has no test runner for the
product.

## Deviations from Plan

### Auto-fixed issues

**1. [Rule 1 — false comment] `src/lib/supabase/middleware.ts:438-444`**
- **Found during:** Task 1, on the pre-deletion sweep
- **Issue:** the comment read *"the redirect table's fifteen rows are exactly
  the fifteen `page.tsx` files under `src/app/(organizer)`"* — a measurement in
  the present tense about a tree this commit deletes. Plan 34-07 had explicitly
  excepted it (*"zero references … middleware prose excepted"*); **this is the
  commit after which the exception becomes a false statement**, and the plan's
  own criterion asks for zero matches in `src/`.
- **Fix:** reworded to the past with its provenance intact — the measurement was
  taken while the second tree still stood — and pointed at
  `scripts/verify-organizer-redirects.sh`, since the redirect table is now the
  only record of what those fifteen addresses were, which is why it is walked
  rather than trusted.
- **Files modified:** `src/lib/supabase/middleware.ts`
- **Note:** the sibling plan 34-16 does not touch this file; checked before
  editing.

**2. [Rule 2 — CLAUDE.md hard gate] `.claude/CHANGELOG.md` 1.7.0 and the
context-budget measurement**
- **Found during:** Task 2
- **Issue:** `ai-engineering.md` makes it an imperative — *"When modifying
  CLAUDE.md or any rules module: bump the version and write the changelog entry
  in the same commit"* — and its `Gate eval` requires a written load-and-fire
  scenario per modified module, since no test can be run. Neither file was in
  the plan's `files_modified`.
- **Fix:** changelog entry **1.7.0** (MINOR — a behavioural gate reversed, two
  glob sets narrowed) with the load-and-fire scenario:
  `src/app/(admin)/admin/(work)/artists/page.tsx` → `CLAUDE.md` + `meta-gates` +
  `access-gating` + `nextjs-architecture`, and `Gate il gruppo non autorizza` as
  the gate a new unbound surface must trip.
- **Files modified:** `.claude/CHANGELOG.md`, `.claude/rules/ai-engineering.md`

**3. [Rule 2 — dated measurement inside the gate that mandates measuring]
`Gate context budget`**
- **Found during:** Task 2, running `verify:persona`
- **Issue:** the gate recorded *2026-08-05, worst case `EventTabs.tsx`, 32.579
  byte ≈ 9.050 token*. Measured now, **the worst case has changed file**:
  `src/app/(admin)/admin/scanner/ScannerClient.tsx`, **38.240 byte ≈ 10.622
  token** of a 12.000 ceiling. The gate's own text says a change of worst-case
  file means the project moved and *"va guardato, non solo registrato"* — so a
  stale number inside it is `Gate documentazione datata` applied to itself.
- **Why it moved:** phase 34 brought every work surface under `(admin)`, where
  `access-gating` and `nextjs-architecture` now load alongside `checkin-offline`.
  Of the +3.039 bytes this plan added to `nextjs-architecture.md` (≈ +845
  tokens), the rest of the shift predates it.
- **Fix:** number, file and date updated; **margin 1.378 tokens recorded
  explicitly**, with the note that the next prose addition to any of those five
  files must be weighed rather than improvised.
- **Files modified:** `.claude/rules/ai-engineering.md`

### Conflict resolved and declared (`meta-gates.md`, rule 3)

The plan's criterion `grep -rn 'src/app/(organizer)' .claude/ CLAUDE.md` returns
0 collides with `ai-engineering.md`'s changelog obligation: a changelog entry
that may not name what was removed is not a changelog, and the reversal-with-
reason house rule requires naming it. **Resolution:** the criterion is honoured
over everything the persona *declares or describes* — `.claude/rules/**` and
`CLAUDE.md`, which are exactly what checks A, B and G read — and
`.claude/CHANGELOG.md` is excluded as a **dated historical record loaded by no
`paths:`**. Two pre-existing v1.4.0 entries already named the glob and were left
alone; rewriting history to satisfy a grep would be the worse failure.

## Known stubs

None.

## Threat flags

None. No migration, no capability granted, revoked or re-scoped, no new key, no
route handler added, and `/admin/scanner` was not moved. The commit's only
runtime change is the deletion of a page whose address a redirect already
answers.

## Self-Check: PASSED

- `src/app/(organizer)` — absent (`test ! -d` → GONE)
- `.planning/phases/34-one-work-surface/34-15-SUMMARY.md` — present
- commit `0997989` — present in `git log`, carrying all eight files
- `npm run verify:persona` — 7/7, exit 0
- `rm -rf .next && npm run build` — exit 0
- `.planning/STATE.md`, `.planning/ROADMAP.md` — untouched by this agent
