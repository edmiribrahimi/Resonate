---
phase: 32-capability-model-in-the-database
plan: 10
subsystem: capability-model
status: COMPLETE — 4/4 green on BOTH targets, 0 warnings, nine mutations fired
tags: [cap-01, capability-keys, verification-script, mutation-proof, parity]
requires:
  - "32-06 — supabase/migrations/20260807000000_capability_model.sql, whose section 7 is the catalogue this script reads"
  - "32-08 — src/lib/capabilities/keys.ts, the TypeScript side, and its recorded lesson that a census can count comments as readers"
  - "32-09 — the applied policy set whose predicates are the POLICY side, and its recorded lesson that a probe which cannot fail will be quoted"
  - "32-04/32-05 — scripts/rls-baseline.mjs and rls-baseline-container.mjs, whose environment loader, Management API target and throwaway container are reused rather than rewritten"
provides:
  - "scripts/verify-capabilities.mjs — the four-sided key check, 673 lines, node built-ins plus the baseline harness"
  - "npm run verify:capabilities — the entry point, with --target=production (default) and --target=container"
  - "CAP-01 evidence (iii): the one thing about the capability model that no compiler in this repository can hold is now held by a command"
  - "the measured fact that production and a container built from this repository's own 37 migrations agree on all four sets"
  - "nine mutation proofs, each asserted as applied with the CHECK'S OWN reader before its result was read"
affects:
  - "scripts/rls-baseline.mjs — two functions gained an `export` keyword and a comment saying why. No behaviour changed; the CLI was re-run and still captures B1."
  - "package.json — one script entry"
  - "nothing in src/, nothing in supabase/. This plan changed no product code and applied no migration."
tech-stack:
  added: []
  patterns:
    - "a set declared in four places, compared in both directions per pair, with the failure naming the key AND the side it is missing from"
    - "the empty-side refusal, stated as four independent clauses so the message names WHICH side was empty"
    - "a pre-registered expectation that says, in its own comment, that a trip means looking at the model rather than at the constant"
    - "comments stripped by a string-aware scanner before counting callers — a mention is not a caller"
    - "the applied-assertion made with the check's own parser, not a second grep"
    - "the write-side mutation delivered as a throwaway migration file that RAISES unless its own effect landed"
key-files:
  created:
    - scripts/verify-capabilities.mjs
  modified:
    - scripts/rls-baseline.mjs
    - package.json
decisions:
  - "The plan's mutation 5, in its literal form, CANNOT end at exit 0. Inserting a catalogue row necessarily makes DB nine, which trips both the pre-registered count and TS-versus-DB. Measured, not argued: M5a exits 1. The reachable form of the same question is M5b — an existing key that nothing asks for any more — and it exits 0."
  - "Emptying ONE side empties TWO. With no CAP object in keys.ts every CAP. reference in src/ stops resolving, so the refusal names TS and SRC. Reported rather than smoothed over: the refusal message enumerates every empty side, which is why this was visible at all."
  - "The SRC side is read with comments stripped by a string-aware scanner, not a regex. `//` occurs inside ordinary string literals in this codebase (every `https://`), and a naive strip would silently stop counting a CAP. reference on those lines."
  - "A `CAP.MEMBER` that resolves to nothing is reported as its own branch of comparison 3. The compiler would catch it, but this script must not walk past it in silence on a tree it can read and the compiler has not yet seen."
  - "POLICY is read from pg_policies and never from the migration files. 32-09 is the precedent: a migration generated from a plan's prose instead of from the applied dump would have left two policies unwrapped."
  - "The regex requires `(` and an opening quote after the function name. Postgres renders each of the 45 call sites with an `AS has_capability` alias, so the bare word occurs 90 times; matching the word would have been counting the alias."
metrics:
  tasks_completed: 2
  tasks_total: 2
  commits: 2
  duration: ~1h20m
  completed: 2026-08-06
---

# Phase 32 Plan 10: The Four Declarations of One Capability Set, Checked

**`4/4 green, 0 warnings` on production AND on a throwaway container, and the
two agree on every one of the four sets.**

```
TS 8 · DB 8 · POLICY 4 (45 call sites in 67 policies) · SRC 4 (230 files walked)

by policy : catalogue.manage, master.manage, membership.active, staff.manage
by src/   : admin.access, door.operate, membership.card.view, organizer.access
```

**The two consuming sides partition the eight keys exactly, with no overlap and
no remainder.** That is why comparison 4 warns about nothing: every catalogue
key is asked for by a policy or by application code, and none is asked for by
both. It is a fact about this model, not a property of the check — and if a
later phase moves a key from one side to the other, this line is where it shows.

Nine mutations were run and **all nine fired**. Every one was asserted as
applied *before* its result was read, and the assertion was made with the
check's own reader rather than a second grep.

---

## Why this script exists, in the terms the phase already uses

`src/lib/door/outcome.ts` gets half its cross-check for free: its literals are
mirrored by a SQL `CHECK` constraint, so the database physically refuses a row
that disagrees. **A capability key has no such mirror.** It is a string in a
TypeScript object, a row in `private.capabilities`, and a string literal inside
a policy body — and no Supabase client in this repository is parameterised with
`Database`, so `private.has_capability('staf.manage')` is valid SQL that returns
`false` forever.

A misspelled capability key is therefore a **runtime denial, not a compile
error**. At the door, a denial is the failure that happens in front of a queue.

The structural analog is `verify-persona.mjs` check **G**, and the analogy is
exact: check G exists because the priority table in `meta-gates.md` was a
*second index* that nobody verified and had already drifted. A capability key is
a **fourth** declaration of the same set, with less protection than that table
had.

---

## What was built

| Artefact | What it is |
|---|---|
| `scripts/verify-capabilities.mjs` | 673 lines. Four sets, five reported comparisons (one pre-registered count plus the plan's four), an empty-side refusal, two targets. Node built-ins plus the baseline harness. |
| `package.json` | `"verify:capabilities": "node scripts/verify-capabilities.mjs"` |
| `scripts/rls-baseline.mjs` | `loadEnvironment` and `createManagementApiTarget` gained `export` and a comment saying why. No behaviour changed. |

**Commits**

| Hash | What |
|---|---|
| `9d87157` | task 1 — the check, the npm entry, the two exports |
| `0ea34de` | task 2 — `readCapObject` exported so the mutation proof asserts with the check's own parser |

### The four sides (D-33)

| Side | Read from | Why from there |
|---|---|---|
| **TS** | the `CAP` object in `src/lib/capabilities/keys.ts`, as **text** | importing it would need a TypeScript loader and tie the check to a build step — and would make the mutation proof impossible, because a deliberately broken `keys.ts` must still be readable by the thing meant to catch it |
| **DB** | `select key from private.capabilities`, `read_only: true` | the catalogue is the one definition |
| **POLICY** | every quoted argument to `has_capability(` in a `qual` or `with_check` in `pg_policies` | from the **applied** database, never from the migration files. A migration file records an intention; `pg_policies` says what is running. `32-09-SUMMARY.md` is the precedent — a migration generated from the plan's prose instead of the applied dump would have left two policies unwrapped |
| **SRC** | every `CAP.` member reference under `src/`, `keys.ts` excluded, **comments stripped** | a key named only in a comment is a mention, not a caller |

### The failure messages name the key AND the side

Not "parity failed". Each of the four comparisons is reported in both directions
and every problem line carries the key, the side it is missing from, and what
the consequence is:

```
"phantom.ts.only" is in src/lib/capabilities/keys.ts but has NO ROW in
private.capabilities — MISSING FROM THE DATABASE. Every check against it
answers false, forever.

"mastr.manage" is asked for by 1 policy clause(s) but has NO ROW in
private.capabilities — MISSING FROM THE CATALOGUE. private.has_capability
returns false for an unknown key, so these policies DENY SILENTLY AND FOREVER:
  artists.artists_delete_master (qual)
```

This repository has **no error tracking**, so a failure that matters must have
an observable effect. Here the effect is the non-zero exit and the named key;
the diagnosis is in the same line as the verdict, not in a log nobody reads.

---

## Finding 1 — the plan's mutation 5 could not have ended at exit 0

`32-10-PLAN.md` task 2 asks, for mutation 5: *"On the container, insert a
catalogue row nothing asks for → comparison 4 warns, naming it, and the exit
code stays `0`."*

**Measured: it exits `1`, and no database could make it exit `0`.** Inserting a
catalogue row makes `DB = 9`, which necessarily trips two other checks — the
pre-registered count, and TS-versus-DB in the "missing from TypeScript"
direction. The warning fires and names the key, exactly as asked; the exit code
cannot follow, because the mutation that produces the orphan also produces two
failures.

```
M5a  probe migration inserts orphan.never.asked          exit 1
     ✗ 0 · both declarations hold the pre-registered 8 keys
     ✗ 1 · TS and DB name the same keys
     ! 4 · "orphan.never.asked" is in the catalogue but NEITHER a policy NOR src/ asks for it
```

So the question the plan actually wants answered — *does the warning leave the
exit code alone?* — was put to the check in its reachable form: **take an
existing key and remove its caller.**

```
M5b  the CAP.MEMBERSHIP_CARD_VIEW reference in middleware.ts re-pointed
     TS 8 · DB 8 · POLICY 4 · SRC 3                       exit 0
     ✓ 0  ✓ 1  ✓ 2  ✓ 3
     ! 4 · "membership.card.view" is in the catalogue but NEITHER a policy NOR src/ asks for it
     4/4 green, 1 warning(s)
```

**Both were run.** This is the same shape as `32-09-SUMMARY.md`'s finding 2 —
`--expect-initplan=0` was unsatisfiable because the advisor stops emitting a
lint rather than reporting zero — and it is the reason the brief for this plan
said to ask *"is the green state actually reachable?"* of every criterion. It
was worth asking twice.

---

## Finding 2 — emptying one side empties two, and the refusal says so

Mutation 6 empties `keys.ts`. The plan expects the TS side to measure empty.
Measured:

```
FATAL: 2 of the four sides measured EMPTY, so every comparison below would be
vacuously green:
  - TS — no `export const CAP` in src/lib/capabilities/keys.ts
  - SRC — no CAP. reference found in 230 files under src/
A check that cannot fail is not a check. Nothing is asserted.
```

With no `CAP` object there is nothing for a `CAP.MEMBER` reference to resolve
against, so **SRC collapses with TS**. That is correct behaviour and it was only
visible because the refusal enumerates every empty side instead of reporting
"something is empty". A refusal that named one side would have been a true
statement that hid a second one.

---

## Finding 3 — the 32-08 lesson, made to fire

`32-08-SUMMARY.md` records a census that read 46 before and 46 after while the
real number moved 45 → 44, because it **counted comments as readers**. The SRC
side of this check is a census of exactly that kind, so comments are stripped
before counting — by a string-aware scanner rather than a regex, because `//`
occurs inside ordinary string literals in this codebase (every `https://`) and a
naive strip would silently stop counting a `CAP.` reference on those lines.

Mutation **M5c** leaves the key in a comment and nowhere else:

```
applied? CAP.MEMBERSHIP_CARD_VIEW in code: false · in comments: true
exit 0
! 4 · "membership.card.view" is in the catalogue but NEITHER a policy NOR src/
      asks for it (mentioned only in a comment: src/lib/supabase/middleware.ts
      — a mention is not a caller).
  named only in comments (not counted as callers): membership.card.view
```

The comment half of the scanner's output is **not discarded**: it is used to
annotate the warning. A key that is mentioned but not called is a different
situation from a key nobody has heard of, and the reader is told which one it
is.

---

## Finding 4 — 45 call sites render 90 occurrences of the word

Postgres re-prints every capability sub-select with an alias:

```
( SELECT private.has_capability('master.manage'::text) AS has_capability)
```

So `grep -o 'has_capability'` over the applied dump returns **90** for **45**
call sites. The extractor requires a `(` and an opening quote after the function
name, which keeps it off the alias, and it accepts the `::text` cast Postgres
adds. Had it matched the word, the POLICY side would have been a count of
aliases — right-looking, and wrong. This is the 32-08 lesson again, in SQL.

---

## The nine mutation proofs

Every one recorded with three lines: the mutation, the proof it was applied, the
output observed. **The applied-assertion uses the check's own reader** —
`readCapObject` and `splitCodeAndComments`, both exported for that purpose with
the reason written beside them. A separate grep can agree with the file and
still disagree with the parser; `ai-engineering.md`'s *prova per mutazione* gate
was written from an incident of exactly that, in `verify-persona.mjs`.

| # | Mutation | Applied-assertion | Observed | Exit |
|---|---|---|---|---|
| **M1** | `PHANTOM_TS_ONLY: "phantom.ts.only"` added to `CAP` | `readCapObject` sees **9** entries including `phantom.ts.only` | ✗0 ✗1 — names `phantom.ts.only`, *MISSING FROM THE DATABASE* | `1` |
| **M2** | probe migration inserts `phantom.db.only` — **container** | the run applied **38** migration files, and the probe `RAISE`s unless the catalogue holds 9 rows | ✗0 ✗1 — names `phantom.db.only`, *MISSING FROM TYPESCRIPT* | `1` |
| **M3** | `ALTER POLICY artists_delete_master … has_capability('mastr.manage')` — **container** | **38** files applied, and the probe `RAISE`s unless `pg_policies` shows `mastr.manage` | ✗2 — names `mastr.manage` at `artists.artists_delete_master (qual)`, *DENY SILENTLY AND FOREVER*. POLICY moves 4 → 5 | `1` |
| **M4a** | scratch `src/mutation-probe-4a.ts` with `CAP.PHANTOM_MEMBER` | `splitCodeAndComments` sees it **in code**, and sees a decoy `CAP.MEMBERSHIP_CARD_VIEW` **only in comments** | ✗3 — names the member and the file. SRC stays 4: an unresolvable member is not a key | `1` |
| **M4b** | `keys.ts` + scratch file, `CAP.PHANTOM_SRC_ONLY` → `phantom.src.only` | `readCapObject` resolves the member; `splitCodeAndComments` sees the reference in code | ✗0 ✗1 ✗3 — comparison 3 names `phantom.src.only` **and** `src/mutation-probe-4b.ts` | `1` |
| **M5a** | probe migration inserts `orphan.never.asked` — **container** | **38** files applied, probe `RAISE`s unless 9 rows | !4 names it; ✗0 ✗1 fire too — see *Finding 1* | `1` |
| **M5b** | the `CAP.MEMBERSHIP_CARD_VIEW` reference in `middleware.ts` re-pointed | the substitution matched (asserted, not assumed); `splitCodeAndComments` confirms none left in executable code | !4 names `membership.card.view`; 0–3 all green | **`0`** |
| **M5c** | the same, with the key left in a `/* … */` | in code `false`, in comments `true` | !4 names it **and** annotates *"a mention is not a caller"* | **`0`** |
| **M6** | `keys.ts` emptied | `readCapObject` parses **0** entries | the refusal, naming **two** empty sides — see *Finding 2* | `1` |

```
9/9 mutations fired as expected
```

**No production row was written.** The three write-side mutations (M2, M3, M5a)
ran on throwaway PostgreSQL 17.6 containers built from this repository's own SQL
and destroyed after each run — `docker ps -a --filter name=rls-baseline` is
empty. The five production-target runs use `read_only: true`, under which an
INSERT fails `25006`.

**Restoration, asserted rather than assumed:**

```
keys.ts       SHA-256 identical to before: true
middleware.ts SHA-256 identical to before: true
probe migration removed, both scratch files removed
git status --porcelain: (only the tracked export change, which was then committed)
```

The driver restores in a `finally`, so an assertion failure mid-run still leaves
the tree clean. It lives in the scratchpad and is not committed: its result is
this table, and the discipline is written here so the next reader does not have
to re-derive it.

---

## Deviations from Plan

### Auto-fixed

**1. [Rule 3 — Blocking] the baseline harness's target function was not exported**

- **Found during:** task 1, writing the first line that needed it.
- **Issue:** the plan requires reusing `scripts/rls-baseline.mjs`'s Management
  API target and environment loader "rather than constructing a second API
  client". Neither `loadEnvironment` nor `createManagementApiTarget` carried
  `export`, so the reuse the plan mandates was not possible.
- **Fix:** `export` added to both, each with a comment stating why it is
  exported — a second client is a second place to forget `read_only`, and a
  second place to forget `registerSecret`, which is the whole basis of the
  redaction guarantee.
- **Why it is safe:** nothing above the `main` guard in that file runs on
  import, by that file's own design and its own comment. Re-verified after the
  change: `npm run baseline:rls -- --only=B1` still captures B1 (the throwaway
  artefact was deleted immediately and never staged).
- **Commit:** `9d87157`

**2. [Rule 3 — Blocking] the applied-assertion needed the check's own parser**

- **Found during:** task 2, writing the first mutation.
- **Issue:** the mutation gate demands the mutation be asserted as applied
  before its result is read. An assertion made with a separate `grep` can agree
  with the file while disagreeing with the parser the check actually uses —
  which is the failure mode the gate was written from.
- **Fix:** `readCapObject` exported alongside `splitCodeAndComments`, with the
  reason written beside it. Both mutation drivers assert with them.
- **Commit:** `0ea34de`

### Done that the plan did not ask for

- **A container target (`--target=container`).** The plan's mutations 2, 3 and 5
  are specified "on the container", and the check had no way to reach one. It
  now loads `withContainer` lazily — only for that flag, so a production run
  touches neither `pg` nor Docker — and with `seed: false`, because this check
  reads the catalogue and the predicates, which are schema rather than rows.
  Its second, unplanned value: **production and a container built from the
  repository's own 37 migrations agree on all four sets**, which is an
  independent statement that the committed SQL reproduces what is running.
- **A fifth reported check, numbered 0** — the pre-registered count of eight, on
  both TS and DB. The plan asks for the constant; making it a *reported*
  comparison is what makes a trip legible rather than buried in a message.
- **Three mutations beyond the plan's six** — M4a (an unresolvable `CAP.`
  member), M5b (the reachable form of mutation 5) and M5c (the comment-only
  key). Each closes a way the check could have been green while wrong.

### Not done

- **`STATE.md`, `ROADMAP.md`, `deferred-items.md`** — untouched. The first two
  belong to the orchestrator; everything that would have gone to the third is in
  *Deferred* below.
- **Nothing in `src/` or `supabase/` was changed.** Every edit to those trees
  during the mutation proofs was reverted and asserted by SHA-256.
- **No migration was applied to production.** This plan writes no SQL that
  survives a run.
- **`32-VERIFICATION.md`** — the phase's deliverable, not this plan's.

---

## Deferred (for the orchestrator to merge)

- **D-32-K (new) — the two consuming sides partition the eight keys exactly, and
  Phase 34 should know it.** Four keys are asked for **only** by policies
  (`staff.manage`, `master.manage`, `catalogue.manage`, `membership.active`) and
  four **only** by `src/` (`admin.access`, `organizer.access`, `door.operate`,
  `membership.card.view`). CAP-02 will fail the build for a capability mapped to
  no route — and **four of the eight will never have a route**, because they
  gate tables. If CAP-02 is written as "every capability has a route", it fails
  on half the model on day one. This check reports the split every run; the
  numbers are in the header of every green.
- **D-32-L (new) — the check reads the catalogue, not the grants.**
  `private.role_capabilities` is not read at all, so a key granted to the wrong
  role passes this check unmoved. That is deliberate — grants are behaviour, and
  behaviour is what the B2/B3 write matrices measure — but it means
  `verify:capabilities` green is **not** a statement that permissions are right.
  The script says so in its own closing note, and `32-VERIFICATION.md` should
  repeat it, because a command with `verify` in its name will be quoted.
- **D-32-H — confirmed again, from a third direction.** 32-07 proved the
  container catches a capability collapse that B1 passes; 32-09 proved B1
  catches a misapplied wrap that the container passes. This plan adds a third
  detector for a third defect: **neither B1 nor B3 would notice a key that is
  spelled differently in `keys.ts` and in the catalogue**, because both artefacts
  compare a database against itself. `verify:capabilities` is the only thing in
  the repository that compares the database against the TypeScript. The net now
  has three parts, and the table in `baseline/README.md` should have three rows.
- **D-32-C — `CLAUDE.md` Guardrail 3 is factually wrong.** It claims
  `supabase/schema.sql` holds zero `CREATE POLICY`. Counted today: **37**
  `CREATE POLICY` and **11** `ENABLE ROW LEVEL SECURITY`. RLS lives in **both**
  that file and the migrations. Not repaired here — `CLAUDE.md` is the persona,
  and changing it requires the four clauses of `ai-engineering.md`'s
  *instruction architecture* gate plus a changelog entry, which is its own piece
  of work.
- **D-32-A — untouched.** No `profiles` policy was read or written by this plan.
- **Pre-existing `npm run lint` state** — 21 errors / 108 warnings, none in any
  file this plan opened. `npx eslint scripts/verify-capabilities.mjs
  scripts/rls-baseline.mjs` is clean.

---

## Threat Flags

None. This plan opens no network endpoint, adds no auth path, changes no schema
and touches no trust boundary. It reads two system views and one private table,
read-only, and writes no artefact.

The plan's own register, with what closed each row:

| Threat | Closed by |
|---|---|
| **T-32-10-01** a consistency check green because it measured nothing | the empty-side refusal on all four sides, enumerated separately (M6 fired and named **two**); the pre-registered `EXPECTED_KEY_COUNT = 8` on TS and DB; and nine mutations, each asserted applied with the check's own reader before its result was read |
| **T-32-10-02** a mutation proof leaving a row in production | the three write-side mutations ran on throwaway containers, destroyed after each, `docker ps -a` empty; the five production runs are `read_only: true`, under which an INSERT fails `25006`; `keys.ts` and `middleware.ts` restored and asserted by SHA-256 |
| **T-32-10-03** a policy asking for a key that does not exist, denying silently forever | comparison 2 treats it as a **failure**, reads from `pg_policies` rather than the migration files, and M3 proved it fires — naming the key, the table, the policy and the clause |
| **T-32-10-04** the script writing catalogue contents into a public artefact | it writes **no** artefact. It prints keys and policy names, which are design; it reads no row of `profiles`; every printed string goes through the harness's `redact`; and it calls `query()` and never `get()` — the Management API's project endpoints can carry the project's signing secret, and the way not to leak a value is not to fetch it |
| **T-32-10-SC** npm installs | nothing was installed. `node:` built-ins, plus `./rls-baseline.mjs`, plus — only under `--target=container` — the already-present `pg` devDependency |

---

## Manual verification procedure (there is no test runner)

Written out because in this repository the written procedure is the only
evidence that will exist. Steps 1–2 need `SUPABASE_ACCESS_TOKEN` and
`NEXT_PUBLIC_SUPABASE_URL`; step 3 needs Docker. **Nothing below writes a row.**

1. `npm run verify:capabilities`
   → must end **`4/4 green, 0 warnings.`** with the header reading
   `TS 8 · DB 8 · POLICY 4 (45 call sites in 67 policies) · SRC 4`.
   **The four numbers are the measurement; the ticks are the verdict.** If TS or
   DB is not 8, comparison 0 says so and the correct response is to look at the
   capability model, not at `EXPECTED_KEY_COUNT`.

2. Read the two `measures:` lines.
   → `by policy` must hold `catalogue.manage, master.manage, membership.active,
   staff.manage` and `by src/` must hold `admin.access, door.operate,
   membership.card.view, organizer.access`. **A key moving from one line to the
   other is a real change** — it means a table gate became a route gate or the
   reverse — and it is exactly what Phase 34's CAP-02 will act on.

3. `npm run verify:capabilities -- --target=container`
   → must build from **37 migration files**, end `4/4 green, 0 warnings.`, print
   `container destroyed, nothing left behind`, and report the **same four
   numbers** as step 1. A disagreement between the two targets means the
   committed migrations no longer reproduce what production is running.

4. Break it on purpose, once, and watch it fire — because a check nobody has
   seen fail is a check nobody has any reason to trust:
   ```
   # add   PHANTOM: "phantom.key",   inside the CAP object, then:
   npm run verify:capabilities     # must exit 1 and NAME phantom.key
   git checkout -- src/lib/capabilities/keys.ts
   npm run verify:capabilities     # must return to 4/4 green
   ```
   **Assert the edit landed before believing the result.** A substitution that
   silently fails to match produces a green that means nothing — and in the
   other direction certifies a dead check as working. That is a recorded
   incident in this repository, not a hypothetical.

5. `npm run build` (after `rm -rf .next` — a stale cache produced a false build
   failure in this phase) → green.

**What must be observed:** `4/4 green, 0 warnings` on both targets, the same
four counts on both, the two `measures:` lines partitioning the eight keys, and
a deliberate break producing exit 1 with the key named.

**What this procedure cannot tell you:** whether a capability is granted to the
right roles. `private.role_capabilities` is never read. A green here means the
four declarations name the same strings — coherence, not correctness, the same
distinction `verify-persona.mjs` draws about the persona.

---

## Self-Check: PASSED

```
$ [ -f scripts/verify-capabilities.mjs ]                             FOUND (673 lines)
$ grep -n '"verify:capabilities"' package.json                       FOUND (line 11)
$ grep -c 'private.capabilities' scripts/verify-capabilities.mjs     FOUND (must_have)
$ grep -c 'pg_policies'          scripts/verify-capabilities.mjs     FOUND (key_link)
$ grep -c 'keys\.ts'             scripts/verify-capabilities.mjs     FOUND (key_link)
$ git log --oneline -2  →  9d87157, 0ea34de                          FOUND
$ git diff --diff-filter=D --name-only HEAD~1 HEAD  (each commit)    (empty — no deletions)

$ npm run verify:capabilities                                        4/4 green, 0 warnings
$ npm run verify:capabilities -- --target=container                  4/4 green, 0 warnings
    both: TS 8 · DB 8 · POLICY 4 (45 call sites in 67 policies) · SRC 4
$ npm run build (after rm -rf .next)                                 green
$ npx eslint scripts/verify-capabilities.mjs scripts/rls-baseline.mjs   no output
$ npm run baseline:rls -- --only=B1   (after the export change)      still captures B1
$ git status --porcelain                                             (empty)
$ docker ps -a --filter name=rls-baseline                            (empty)
$ secret/PII scan of both committed scripts                          CLEAN
```

- **9 mutations fired, 9/9 as expected, and every one was asserted as applied
  before its result was read** — with `readCapObject` and
  `splitCodeAndComments`, the check's own readers, and for the three container
  mutations with a probe migration that `RAISE`s unless its own effect landed
  plus a `38 migration files` line in the run's own output.
- **Two mutations produced a result the plan did not predict**, and both are
  reported rather than absorbed: M5a cannot reach exit 0 (Finding 1) and M6
  empties two sides rather than one (Finding 2).
- `STATE.md`, `ROADMAP.md`, `deferred-items.md` untouched — CONFIRMED.
- **No product code was changed.** `src/` and `supabase/` are byte-identical to
  their state at `0879760`; the only files this plan changed are
  `scripts/verify-capabilities.mjs`, `scripts/rls-baseline.mjs` and
  `package.json`.
- The `node_modules` and `.env.local` symlinks used for the production reads
  were removed before the final commit; both paths are gitignored and neither
  was ever staged.
