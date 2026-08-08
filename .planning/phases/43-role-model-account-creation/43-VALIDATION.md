---
phase: 43
slug: role-model-account-creation
status: executed-partly-unverified
nyquist_compliant: false
wave_0_complete: true
created: 2026-08-07
updated: 2026-08-08
---

# Phase 43 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Derived from `43-RESEARCH.md` § Validation Architecture, which measured the
> detection map rather than assuming it.
>
> **Reconciled against what was observed on 2026-08-08**, at the close of the
> phase, by plan 43-15. Where a row's claim and the phase's evidence disagreed,
> the evidence won and the claim was rewritten.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | **None for the product.** `package.json` has no `test` script; no `*.test.*` / `*.spec.*` file exists. **None was added by this phase** — verified at close. |
| **Config file** | none |
| **Quick run command** | `npm run build` (this is also the typecheck gate) |
| **Full suite command** | `npm run build && npm run verify:capabilities && npm run verify:no-header-identity && npm run verify:persona && npm run baseline:container` |
| **Evidence harness** | `npm run baseline:container` → B1 policy dump, B2 read matrix, B3 write matrix; `npm run baseline:compare` diffs two captures |
| **Estimated runtime** | build ~90s; container baseline several minutes |

> **Nothing in this phase may be reported as passing tests. There are none.**
> The verification that exists is: the compile gate, the container evidence
> harness, the four `verify:*` scripts, and written manual procedures.

**A second fact, true at close and not true at planning time:** every automated
green in this file was measured on **the container**, a throwaway `postgres:17.6`
built from the migrations. **None of the five migrations this phase wrote is
applied to production, and none of the code is deployed.** A green here says the
model is right; it does not say the model is anywhere the members can reach.

---

## Sampling Rate

| When | What runs | Why at that rate |
|---|---|---|
| **Every task commit** | `npm run build` | Cheap, and the only compile gate. Catches one of twenty-one role-enumeration sites and nothing else. |
| **Every plan touching a capability key or the catalogue** | `npm run verify:capabilities` | Reads the live catalogue; drift between `keys.ts` and the grant rows is otherwise a runtime `false` — at the door, a refusal in front of a queue. |
| **Every plan adding an identity read** | `npm run verify:no-header-identity` | Phase 33 took the header-reader count to 0; a regression must not surface in Phase 34. |
| **Every plan touching `CLAUDE.md` or `.claude/**`** | `npm run verify:persona` | The repo's only mutation-proven check. |
| **Every plan changing DDL, a policy, a grant row, or the seed** | `npm run baseline:container` **and** `npm run baseline:compare` against the pre-phase capture | **The sampling-rate argument.** Phase 32's worst defect was introduced by one plan (32-07) and caught by the write matrix. Comparing only at phase end would leave the defect installed across every intervening plan, and the rework is proportional to what was built on top. **Do not batch this to the end.** |
| **Once, before the constraint migration** | `32-HUMAN-UAT.md` **M-12** | D-15. After the constraint it is unrunnable, permanently. |
| **Phase end, before `/gsd:verify-work`** | full suite + the written manual procedures | `ACCT-02`, `ACCT-03` and `ACCT-05` live there and nowhere else. |

- **Max feedback latency:** one plan. No plan that changed DDL, a policy, a grant
  row or the seed closed without its container comparison. **Held: 43-05, 43-06,
  43-07, 43-08, 43-10 and 43-12 each carry their own capture and their own
  comparison, and 43-15 carries the whole-of-phase one.**

---

## Per-Task Verification Map

One row per task across the fifteen plans. **A row whose only automated command
is `npm run build` says so explicitly** — the tables below record exactly what
that does not prove: not that a migration applied, not that a column name is
real, not that a capability key is spelled correctly, and not that `role` is
handled anywhere it is enumerated.

`M-…` names a written manual procedure. `M-12` lives in `32-HUMAN-UAT.md`; every
`M-43-…` and every `W-43-14-…` is written in `43-HUMAN-UAT.md` and may be
**executed** later under the owner's batching rule — but *deferred is not
verified*, and this table keeps the two apart.

**What a ✅ means in this table, exactly:** the row's named automated command ran
and was green. On a build-only row that means **the code compiled and nothing
else**. A ⬜ means some part of the row's stated verification did not run — in
every case here because it needs production, a person, or both.

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | Detector Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-----------------|--------|
| 43-01-T1 | 43-01 | 1 | ROLE-02 (D-15, D-06) | manual, blocking | `grep` asserts M-12 no longer reads `[pending]` | ✅ M-12 exists | ✅ capability leg PASS 2026-08-08; **browser leg never observed, now permanently unobservable** |
| 43-01-T2 | 43-01 | 1 | ROLE-02 (D-04) | measurement | `grep` over `43-MEASUREMENTS.md` + address-shape refusal | ✅ Management API, read-only | ✅ |
| 43-01-T3 | 43-01 | 1 | ROLE-02 (D-04) | measurement | `grep -c "23514"` over `43-MEASUREMENTS.md` | ✅ one guarded live probe | ✅ |
| 43-02-T1 | 43-02 | 1 | ROLE-01 (D-02, D-06) | static | `node --check scripts/verify-capabilities.mjs` | ➕ built here | ✅ |
| 43-02-T2 | 43-02 | 1 | ROLE-01 (D-02) | assertion | `npm run verify:capabilities` → `5/5 green`, both targets | ➕ built here (Wave 0) | ✅ green on both targets **at the time**; production went expectedly red once 43-05 and 43-07 landed undeployed |
| 43-02-T3 | 43-02 | 1 | ROLE-01 (D-02) | mutation proof | three mutations each observed exiting 1 | ➕ built here | ✅ three directions, each asserted applied before its result was read |
| 43-03-T1 | 43-03 | 2 | ROLE-03 (D-05) | assertion | `npm run baseline:container -- --seed-only --report` | ➕ built here (Wave 0) | ✅ |
| 43-03-T2 | 43-03 | 2 | ROLE-02 (D-04) | assertion | same run: four `23514`s + `pg_get_constraintdef` read-back | ➕ built here — **ROLE-02's only automated detector** | ✅ widened to **six** by 43-08 |
| 43-03-T3 | 43-03 | 2 | ROLE-03 (D-05) | mutation proof | scratch migration + `--seed-only --report`, two negative controls | ➕ built here | ✅ and a negative control found a real defect — a `finally` masking the seed's own failure |
| 43-04-T1 | 43-04 | 2 | ACCT-03 (D-23) | build-only + manual | `npm run build`; `grep -rn "updateUser"` → 2 hits. **Build proves compilation only** | ❌ semantics manual (M-43-03) | ✅ build-only |
| 43-04-T2 | 43-04 | 2 | ACCT-03 | build-only + manual | `npm run build`; `npm run verify:no-header-identity`. **Allow-list cases are written observations, not tests** | ❌ manual | ✅ build-only; the nine refusals were produced by **executing** an extracted copy of the resolver |
| 43-04-T3 | 43-04 | 2 | ACCT-03 (D-23) | manual, blocking | none — a real inbox and a deployed build | ❌ M-43-03 | ⬜ the allow-list was closed by a read-only measurement instead; **no link was ever followed** |
| 43-05-T1 | 43-05 | 3 | ROLE-01 (D-01, D-02, D-14) | container | `npm run baseline:container -- --smoke` | ✅ | ✅ |
| 43-05-T2 | 43-05 | 3 | ROLE-01 (D-02, D-14) | assertion | `npm run verify:capabilities -- --target=container` → `5/5 green` | ➕ 43-02's fifth side | ✅ and it went **red first**, naming the undeclared role — the detector proved itself on real state |
| 43-05-T3 | 43-05 | 3 | ROLE-01 | schema apply, blocking | `baseline:compare --before-point=33-final --after-point=43-05` → zero defects | ✅ comparator | ✅ `CAP-03: clean`; **no migration applied to production** |
| 43-06-T1 | 43-06 | 4 | ROLE-02 (D-04, D-06) | static | `grep -rn "role_implies_approved" src/` → 0; re-measured row count | ✅ | ✅ zero violating rows re-measured read-only immediately before the DDL |
| 43-06-T2 | 43-06 | 4 | ROLE-03 (D-05) | assertion | `npm run baseline:container -- --seed-only --report` → 9 of 9 cells, four `23514`s | ➕ 43-03's seam | ✅ |
| 43-06-T3 | 43-06 | 4 | ROLE-02 (D-04) | schema apply, blocking | `baseline:compare --before-point=43-05 --after-point=43-06`; by-hand refusal in production | ✅ + manual | ⬜ comparison `clean`; **the production by-hand refusal was not run — no migration applied** |
| 43-07-T1 | 43-07 | 5 | ACCT-04 (D-11, D-18, D-19, D-22) | container | `npm run baseline:container -- --smoke`; policy/`search_path`/`revoke` greps | ✅ | ✅ |
| 43-07-T2 | 43-07 | 5 | ACCT-04 (D-22) | build + assertion | `npm run build` (`CAP_DESCRIPTIONS` totality is genuinely proved); `verify:capabilities` `5/5` | ✅ | ✅ |
| 43-07-T3 | 43-07 | 5 | ACCT-04 | schema apply, blocking | `baseline:compare --before-point=43-06 --after-point=43-07`; `has_function_privilege` → false | ✅ 22 append-only cells | ✅ 47 differences, all four classes predicted; `authenticated`/`anon`/`public` all **false** |
| 43-08-T1 | 43-08 | 6 | ROLE-01, ROLE-03 (D-01, D-05) | assertion | `--seed-only --report` → 12 grid cells, six refused writes | ➕ built here (Wave 0) | ✅ and the tally is now **derived** from the list length, not typed — the old `4/4` would have kept printing full marks over six |
| 43-08-T2 | 43-08 | 6 | ROLE-01 (D-02, D-14) | re-baseline | `baseline:compare --before-point=43-07 --after-point=43-08`; staff ≡ member cell-for-cell | ✅ + a one-off comparison | ✅ 261 predicted, 261 observed; **zero cells where `staff` exceeds `member`** |
| 43-09-T1 | 43-09 | 6 | ROLE-02 (D-04) | build-only | `npm run build`; `grep` no branch on message text. **Build proves compilation only — not the RPC name, not an argument order** | ❌ M-43-04 | ✅ build-only |
| 43-09-T2 | 43-09 | 6 | ACCT-04, ACCT-01 (D-11, D-21, D-07) | build-only | `npm run build`; `verify:no-header-identity`; `grep` no `"master"` target | ❌ M-43-08, M-43-07 | ✅ build-only |
| 43-09-T3 | 43-09 | 6 | ACCT-04 | build-only | `npm run build`; `grep` no asserted count. **The harness never proves an act was recorded** | ❌ M-43-08 | ✅ build-only |
| 43-10-T1 | 43-10 | 7 | ACCT-05 (D-13) | build-only | `npm run build`; migration greps for no CHECK and no FK | ❌ M-43-10 | ✅ build-only + three schema observations on the container |
| 43-10-T2 | 43-10 | 7 | ACCT-05 (D-13, D-17) | build-only | `npm run build`; `profiles` query count in `verify/route.ts` unchanged | ❌ M-43-10 | ✅ build-only |
| 43-10-T3 | 43-10 | 7 | ACCT-05 | schema apply, blocking | `baseline:compare --before-point=43-08 --after-point=43-10` → zero defects; one real scan | ✅ + manual | ⬜ comparison `clean`; **two criteria explicitly not measured — the pre-existing NULL count in production, and one real scan through the route** |
| 43-11-T1 | 43-11 | 7 | ACCT-01, ACCT-02, ACCT-04 (D-07, D-08, D-09, D-20) | build-only | `npm run build`; greps for no sleep, no env fallback, no `qr.ts` generator | ❌ M-43-01, M-43-07 | ✅ build-only; the D-07 ceiling gained a **runtime** half the plan had argued was unnecessary |
| 43-11-T2 | 43-11 | 7 | ACCT-03 (D-10) | static | `grep` finds no interpolated password and no `ɘ` in the template | ✅ static half | ✅ **0** |
| 43-11-T3 | 43-11 | 7 | ACCT-01 | build-only | `npm run build`; notice-cause greps | ❌ M-43-01 | ✅ build-only; the redirect comparison was **executed** on an extracted copy, eleven cases |
| 43-12-T1 | 43-12 | 8 | ROLE-04 (D-12, D-16, D-22) | container | `--smoke`; greps: no address, `search_path`, `revoke`, `'system'` | ✅ applies | ✅ address-shape grep on the migration → **0** |
| 43-12-T2 | 43-12 | 8 | ROLE-04 (D-16) | build-only | `npm run build`; `grep` no direct role write left in the route | ❌ M-43-05, M-43-06 | ✅ build-only |
| 43-12-T3 | 43-12 | 8 | ROLE-04 | schema apply, blocking | none automated — four cases run by hand, master count never zero | ❌ M-43-06, **the phase's highest-consequence check** | ⬜ **all four cases plus a fifth were run — on the container.** Master count and register rows identical after A, B, C1, C2; the zero-master guard proved by mutation. The production leg is M-43-05 and M-43-06 |
| 43-13-T1 | 43-13 | 8 | ACCT-05 (D-17) | build-only | `npm run build`; `deleteObjectStore` count unchanged | ❌ M-43-11 | ✅ build-only, count **4 before and 4 after** |
| 43-13-T2 | 43-13 | 8 | ACCT-05 (D-17) | build-only | `npm run build`; `refuse(` call-site count unchanged | ❌ M-43-11 | ✅ build-only, count **5 before and 5 after** |
| 43-13-T3 | 43-13 | 8 | ACCT-05 (D-17) | manual, blocking | none — a device at v3 with a queued scan. **Not deferrable** (`.planning/STATE.md`) | ❌ M-43-11 | ⬜ **exercised on real Chromium with real IndexedDB, both upgrade paths, no row lost** — but not on a staff phone through the deployed build, and no `entry_role` was read from any database |
| 43-14-T1 | 43-14 | 9 | ROLE-01, ROLE-02, ACCT-05 (D-01, D-04, D-13) | build-only | `npm run build`; `grep` no `e.message` rendered. **One of twenty-one role sites errors at compile time** | ❌ M-43-04, M-43-10 | ✅ build-only; all twenty-one sites walked with a recorded verdict, two defects found |
| 43-14-T2 | 43-14 | 9 | ACCT-04 (D-19, D-22) | build-only | `npm run build`; `grep` no service client on the read surface | ❌ M-43-09 (a real member session) | ✅ build-only, `getServiceClient` on the register page → **0** |
| 43-14-T3 | 43-14 | 9 | ROLE-04, ACCT-03 | build-only | `npm run build`. *(Added mid-plan by the orchestrator, outside the plan)* | ❌ W-43-14-F | ✅ build-only; two of the three arrival flags now render by value, the third by presence |
| 43-15-T1 | 43-15 | 10 | all nine | documentation | procedure-count and address-shape greps | n/a — writing, not detecting | ✅ 22 headings, 16 procedures, all eleven `M-43-…` and all six `W-43-14-…`, **zero** address-shaped and **zero** uuid-shaped strings |
| 43-15-T2 | 43-15 | 10 | ROLE-01, ROLE-03, ACCT-04 | comparison | `baseline:compare --before-point=33-final --after-point=43-final` | ✅ | ✅ **308 predicted, 308 observed**, six classes, no seventh |
| 43-15-T3 | 43-15 | 10 | all nine | documentation | this table, reconciled against what was observed | n/a | ✅ |

*Status: ⬜ some stated verification did not run · ✅ the named automated command ran green · ❌ red · ⚠️ flaky ·
Detector: ✅ exists · ➕ built by this phase · ❌ manual only*

### Sampling continuity

Held. No three consecutive tasks lack an automated verify. The longest run of
build-only tasks is **43-11-T1 → 43-11-T3**, broken by 43-11-T2's static
assertion and closed by 43-12-T1's container run in the following wave. Every
plan that changed DDL, a policy, a grant row or the seed carried its own
`baseline:container` **and** `baseline:compare` — 43-05, 43-06, 43-07, 43-08,
43-10 and 43-12 — so the maximum feedback latency stayed one plan.

### The whole-of-phase comparison

`baseline:compare --target=container --before-point=33-final --after-point=43-final --only=B1,B2,B3`,
run 2026-08-08 with its expectation committed **first** at `8009f2a`:

| Class | Predicted | Observed |
|---|---|---|
| `b3_cell_added` | 222 | **222** |
| `b2_cell_added` | 74 | **74** |
| `b2_count_changed` | 6 | **6** |
| `b2_persona_added` | 3 | **3** |
| `supporting_count_changed` | 2 | **2** |
| `policy_added` | 1 | **1** |
| **total** | **308** | **308** |

Zero of every class that had to read zero — no `b3_cell_changed`, no
`b2_fingerprint_changed`, no cell or persona missing, no policy removed or
changed. B1: `67 unchanged · 0 unexplained`. **The phase's entire footprint on
the write matrix is one declared list, and it matches.**

**The production target could not be compared, and the reason is threefold and
declared, not worked around:** `.env.local` does not exist in the execution
worktree, so `baseline:rls` exits before reading anything; even with credentials
the harness refuses because `membership_acts` is not an RLS-enabled table of that
target (43-07); and past that, three persona labels are ones production cannot
resolve (43-08). All three close on the day the migrations are applied.

---

## Requirement → Detection Map

| Req | Behaviour | What detects a failure | Command / procedure | State at close |
|---|---|---|---|---|
| ROLE-01 | `role = 'staff'` accepted by **both** role constraints | Container build applies every migration and names the failing file | `npm run baseline:container -- --smoke` | ✅ green, container only |
| ROLE-01 | `staff` holds exactly the intended capabilities | B3 write matrix — **only if `staff` joins `PERSONA_ROLES`** | `baseline:container` + `baseline:compare` | ✅ **the condition is met**: 43-08 added `staff` to `PERSONA_ROLES` **and** `PERSONA_SQL`. Measured cell-for-cell: zero cells where `staff` exceeds `member` |
| ROLE-01 | catalogue and `CAP` agree | `verify-capabilities.mjs` four-sided parity on the **catalogue** | `npm run verify:capabilities` | ✅ container; production red until deploy |
| ROLE-01 / D-02 | every capability has an **explicit** decision for `staff` | ~~Nothing today~~ → **a fifth side that reads `private.role_capabilities`** | `npm run verify:capabilities` | ✅ **built in 43-02**, 36 pairs / 20 grants / 16 refusals, proved by mutation in three directions |
| ROLE-02 / D-04 | a violating write is refused by the database | Container assertion: attempt the forbidden inserts **after** the constraint is restored, assert `23514` on each | `scripts/container/seed.mjs` | ✅ **built in 43-03**, widened to **six** in 43-08. `23514` **and** the declared constraint name required, so a green for the wrong reason is impossible |
| ROLE-02 | the refusal is **distinguishable**, not generic | Manual only — Next redacts a Server Action message in production, so `next dev` proves nothing about production | M-43-04, W-43-14-B | ❌ **written, pending.** And a named residue: that a custom SQLSTATE reaches the client as `error.code` is an **assumption, not a measurement** — if it fails, the failure stays visible but the sentence is the wrong one |
| ROLE-03 / D-05 | the four forbidden personas survive seeding | The seed grid assertion **throws** on a hole | `npm run baseline:container -- --seed-only --report` | ✅ 12/12 cells; four personas became six |
| ROLE-03 | the sixteen cells still carry evidence | `baseline:compare` B3 `b3_cell_missing` / `b3_cell_changed` | `npm run baseline:compare` | ✅ **measured at close: 252 cells across the four forbidden personas, 0 absent, 244 conclusive for RLS** |
| ROLE-03 | the constraint is the **same object** in container and production | A `NOT VALID` restore changes `convalidated` and no capture notices | read-back of `pg_get_constraintdef` | ✅ **built in 43-03.** Asserts the rendering plus exactly one enumerated suffix, and prints on every run that `convalidated` differs and that no capture reads `pg_constraint` |
| ROLE-04 / D-12 | demotion happens | Manual — two accounts and an env-var change | M-43-05 | ❌ written, pending in production; **measured on the container 2026-08-08** (1 promoted, 2 demoted, three system-attributed register rows) |
| ROLE-04 / D-16 | an unset or unmatched `MASTER_EMAIL` demotes **nobody** | Manual, and the **highest-consequence check in the phase**: getting it wrong is a lockout | M-43-06 | ❌ written, pending in production; **five cases measured on the container**, counts identical, guard proved by mutation |
| ACCT-01 / D-20 | an organizer cannot create or promote to `master` | B3 cannot see it — the ceiling lives in a Server Action, not a policy | M-43-07 + a `grep` assertion | ❌ written, pending. The ceiling is now held **twice** — absent from the union **and** re-tested on the request body |
| ACCT-02 / D-09 | valid for entry **before first login** | Manual, and load-bearing | M-43-01 | ❌ written, pending. **No tool in this repository can reach it** |
| ACCT-02 | valid for entry with the **radio off** | Manual, both orders relative to the roster download | M-43-02 | ❌ written, pending. **The second order is predicted to be refused, and that is the honest limit of an offline door, not a defect** — the runbook answer and the surface copy are both recorded |
| ACCT-03 / D-10 | the message carries a link, never a password | Static `grep` for an interpolated secret in the template | grep + M-43-03 | ✅ static half green (**0**); ❌ semantic half pending |
| ACCT-03 / D-23 | the link **actually lets a password be set** | Manual — ~~and it fails today: no set-password surface exists~~ | M-43-03 | ❌ pending, **but the premise changed**: the surface was built in 43-04 and the allow-list was closed by a read-only measurement. **No link has been followed** |
| ACCT-04 / D-11 | all five acts land in one register | B3 proves who may write; it never proves that a successful approval also wrote its row | M-43-08 | ❌ **written, pending — and this is still ACCT-04's real risk.** No plan closed it and none could |
| ACCT-04 | the register is **append-only** | B3: `update` and `delete` must refuse for **every** persona | `npm run baseline:container` | ✅ **42 cells measured at close**: `insert → 42501` ×14, `update → ok:0` ×14, `delete → ok:0` ×14, `master/approved` included. **Zero cells where a write landed** |
| ACCT-04 / D-19 | a member reads zero register rows | Manual for production — the Management API bypasses RLS | M-43-09 · W-43-14-E + B2 | ⚠️ container measured (only the two approved staff personas read rows); **production manual, pending** |
| ACCT-05 / D-13 | a free staff entry appears in the night's attendance | Manual — scan a staff card at a real party, read the night's list | M-43-10 | ❌ written, pending. **A count is not a detector of legibility**, so the observation is the answer, not the row |
| ACCT-05 / D-17 | the marker survives the **offline** path | Manual — the IndexedDB upgrade must be exercised, and a queued scan must not be stranded | M-43-11 | ❌ pending on a phone; **both upgrade paths exercised on real Chromium with real IndexedDB, no row lost**, and the wire body read for all three queued entries |

### What the container write matrix can observe

**It can observe** — the register's append-only property (measured: 42 cells);
the register's read boundary; that no existing verdict moved (measured at close:
zero `b3_cell_changed` across the whole phase); **the four forbidden personas'
cells**, which is what ROLE-03 exists to preserve (measured: 252 cells, 0
absent); and `staff`'s own read and write cells, now that `staff` is a probed
persona.

**It cannot observe** — any middleware verdict (which is why M-12 cannot be
substituted); any Server Action gate (ACCT-01's ceiling is a guard, not a
policy); anything about email, the link, or the door's offline path; and
**whether an act was recorded** at all.

### What `npm run build` proves — and does not

**Proves:** TypeScript compiles; the capability-description map stays total over
the key union; a widened `updateMemberRole` parameter type is checked at its call
sites. **One mapped type was found by the compiler that the phase had predicted
it would not find** — `Record<UserRole, string>` — so the planning claim of
"zero new build errors" was wrong by one, and the correction is recorded beside
the code.

**Does not prove:** that a capability key string is spelled correctly; that a
migration applies or a constraint exists; that a column name in any query is
real; **that `role` is handled anywhere it is enumerated** — twenty of
twenty-one sites are invisible to it; that the invitation carries a link and not
a password; that an account is admissible at the door; that a function exists on
the database with the name and the eight parameter names the code calls it by.

---

## Wave 0 Requirements

- [x] `scripts/container/seed.mjs` — constraint drop/restore in `try/finally`, restoring `NOT VALID` (ROLE-03 / D-05) — **landed in 43-03**
- [x] `scripts/container/seed.mjs` — assert the row the write matrix probes still satisfies the constraint — **landed in 43-03** as `assertProbeRowSatisfiesTheRule`, built with the matrix's own `pkExpression` so it cannot drift from the probe it guards, and running unconditionally
- [x] `scripts/container/seed.mjs` — read back `pg_get_constraintdef` after the restore and assert it matches the migration's predicate (ROLE-02) — **landed in 43-03**
- [x] `scripts/container/seed.mjs` — attempt the forbidden writes **after** the restore and assert `23514` on each. **ROLE-02's only automated detector** — **landed in 43-03** at four, **widened to six in 43-08** with the tally derived from the list length instead of typed
- [x] `scripts/verify-capabilities.mjs` — a fifth side: every `(role × capability)` pair is a grant row or a **declared refusal** (ROLE-01 / D-02) — **landed in 43-02**, proved by mutation in three directions
- [x] `scripts/rls-baseline.mjs` — `staff` in `PERSONA_ROLES` and `PERSONA_SQL`, with the re-baseline owned by its own plan — **landed in 43-08**, 261 differences predicted and 261 observed
- [x] `43-HUMAN-UAT.md` — the written procedures — **landed in 43-15.** Sixteen: M-43-01 … M-43-11 plus the six `W-43-14-…` interface walkthroughs. **Written, not executed**
- [x] **`32-HUMAN-UAT.md` M-12 — run before the constraint migration** (D-15) — **half closed in 43-01, and the other half can never close.** The capability leg is PASS (2026-08-08, on the phase-32 container, with a working negative control). The browser leg — that `/admin/scanner` renders — was **deduced from the middleware's ordering, never observed**, and once `20260808001000` is applied the state is unrepresentable and the observation becomes impossible for anyone, permanently
- [x] Framework install: **none.** No test runner was added by this phase — verified at close

**`wave_0_complete: true`** — every detector Wave 0 called for exists and was
green before the thing it detects arrived. **Read with the eighth item's
residue**, which is a permanent hole and not a queued task.

---

## Manual-Only Verifications

All sixteen live in `43-HUMAN-UAT.md`, in the order a person can actually work
through them, with the deploy ordering stated first.

| Behaviour | Requirement | Why manual | Procedure |
|---|---|---|---|
| The scanner page opens for an account whose access was never approved | D-15 / D-06 | A middleware verdict; the harness speaks SQL | `32-HUMAN-UAT.md` M-12 — **window permanently closed** |
| Entry works before the account has ever signed in | ACCT-02 | Needs a real party, a phone and a scan | M-43-01 |
| Entry works with the radio off, in both orders relative to the roster download | ACCT-02 | The offline store is on a device | M-43-02 |
| The invitation link lets a password be set | ACCT-03 / D-23 | Semantics of an email and a browser flow | M-43-03 |
| A refused write is distinguishable, not "something went wrong" | ROLE-02 | Next redacts Server Action messages in production only | M-43-04, W-43-14-B |
| Demotion happens, and an unmatched `MASTER_EMAIL` demotes nobody | ROLE-04 / D-16 | Env-var change across two accounts; a lockout if wrong | M-43-05, M-43-06 |
| An organizer cannot reach `master` | ACCT-01 / D-20 | A Server Action gate, invisible to a policy probe | M-43-07 |
| Five acts, one register, with author and timestamp | ACCT-04 / D-11 | The harness proves who may write, never that the act was recorded | M-43-08 |
| A member reads zero register rows in **production** | D-19 | The Management API bypasses RLS | M-43-09 · W-43-14-E |
| A staff entry appears in the night's attendance and is readable | ACCT-05 | A count is not a detector of legibility | M-43-10 |
| The IndexedDB upgrade strands no queued scan | D-17 | The door is a device, and this is the phase's only door change | M-43-11 |
| The fourth role is findable, countable and grantable | ROLE-01 / D-13 | An interface judgement | W-43-14-A |
| A batch names which subject failed | ACCT-04 | An interface judgement | W-43-14-C |
| The register reads, and names a system act as one | ACCT-04 / D-22 | An interface judgement | W-43-14-D |
| The three arrival flags render, and only when set | ROLE-04 / ACCT-03 | An interface judgement | W-43-14-F |

---

## The coverage claim, stated honestly

**Updated in fact on 2026-08-08, unchanged in bluntness.**

Of the nine requirements, **four** now have strong automated detection where two
did at planning time:

- `ROLE-03` — unchanged, and now measured at close: 252 cells across the four
  forbidden personas, none absent;
- `ACCT-04`'s append-only half — 42 cells, no write landed anywhere;
- `ROLE-02`'s *"a violating write is refused"* — **gained a detector in plan
  43-03**, which `43-VALIDATION.md` had marked ❌ Wave 0;
- `ROLE-01`'s D-02 half, *"every capability has an explicit decision for
  `staff`"* — **gained a detector in plan 43-02**, the first automated detector
  of a wrong grant row this repository has ever had.

`ROLE-01`'s constraint half remains weakly detected. **Six requirements still
depend primarily on written manual procedures, and three of those** —
`ACCT-02` before first login, `ACCT-02` with the radio off, `ACCT-03`'s link —
**cannot be observed by any tool in this repository.**

And a fact that did not exist when this claim was first written, which makes it
worse rather than better:

> **Every automated green in this file was measured on a throwaway container.
> None of the five migrations is applied to production and none of the code is
> deployed.** Until that changes, the phase is verified on a model of the
> database, not on the database.

**A phase that reports itself verified without those procedures executed has
verified four of nine, on a database nobody uses.**

`nyquist_compliant` stays **false**, and `status` reads
**`executed-partly-unverified`**. All sixteen procedures carry `[pending]`;
three of them (**M-43-05**, **M-43-06**, **M-43-11**) carry a dated
laboratory half and a missing production half. This is the same distinction
phase 31 kept deliberately, and the owner's own rule requires it: *deferred is
not verified.* **A flag is not flipped to describe an intention.**

---

## Validation Sign-Off

- [x] Every task has an automated verify or a named Wave 0 dependency
- [x] Sampling continuity: no three consecutive tasks without an automated verify
- [x] Wave 0 covers every ❌ in the detection map
- [x] No watch-mode flags
- [x] M-12 executed and recorded **before** the constraint migration (D-15) — **capability leg only**; the browser leg is permanently unobservable and is recorded as such rather than as outstanding work
- [x] The `43-HUMAN-UAT.md` procedures are **written** (execution may defer per decision 12; writing may not)
- [ ] `nyquist_compliant: true` set in frontmatter — **deliberately not set.** Sixteen of sixteen procedures are `[pending]`

**Approval:** none. **No user approval was sought or given for anything in this
phase.** Every decision recorded across the fifteen plans was taken by the
executor or the orchestrator, and each one says so where it was taken.
