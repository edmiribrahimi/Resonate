---
phase: 43
slug: role-model-account-creation
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-08-07
---

# Phase 43 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Derived from `43-RESEARCH.md` § Validation Architecture, which measured the
> detection map rather than assuming it.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | **None for the product.** `package.json` has no `test` script; no `*.test.*` / `*.spec.*` file exists. **None is added by this phase.** |
| **Config file** | none |
| **Quick run command** | `npm run build` (this is also the typecheck gate) |
| **Full suite command** | `npm run build && npm run verify:capabilities && npm run verify:no-header-identity && npm run verify:persona && npm run baseline:container` |
| **Evidence harness** | `npm run baseline:container` → B1 policy dump, B2 read matrix, B3 write matrix; `npm run baseline:compare` diffs two captures |
| **Estimated runtime** | build ~90s; container baseline several minutes |

> **Nothing in this phase may be reported as passing tests. There are none.**
> The verification that exists is: the compile gate, the container evidence
> harness, the four `verify:*` scripts, and written manual procedures.

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
| **Phase end, before `/gsd:verify-work`** | full suite + the ten written manual procedures | `ACCT-02`, `ACCT-03` and `ACCT-05` live there and nowhere else. |

- **Max feedback latency:** one plan. No plan that changes DDL, a policy, a grant row or the seed may close without its container comparison.

---

## Per-Task Verification Map

Filled at planning time, one row per task across the fifteen plans. **A row whose
only automated command is `npm run build` says so explicitly** — the tables below
record exactly what that does not prove: not that a migration applied, not that a
column name is real, not that a capability key is spelled correctly, and not that
`role` is handled anywhere it is enumerated.

`M-…` names a written manual procedure. `M-12` lives in `32-HUMAN-UAT.md`; every
`M-43-…` is written by plan 43-15 and may be **executed** later under the owner's
batching rule — but *deferred is not verified*, and this table keeps the two apart.

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | Detector Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-----------------|--------|
| 43-01-T1 | 43-01 | 1 | ROLE-02 (D-15, D-06) | manual, blocking | `grep` asserts M-12 no longer reads `[pending]` | ✅ M-12 exists | ⬜ |
| 43-01-T2 | 43-01 | 1 | ROLE-02 (D-04) | measurement | `grep` over `43-MEASUREMENTS.md` + address-shape refusal | ✅ Management API, read-only | ⬜ |
| 43-01-T3 | 43-01 | 1 | ROLE-02 (D-04) | measurement | `grep -c "23514"` over `43-MEASUREMENTS.md` | ✅ one guarded live probe | ⬜ |
| 43-02-T1 | 43-02 | 1 | ROLE-01 (D-02, D-06) | static | `node --check scripts/verify-capabilities.mjs` | ➕ built here | ⬜ |
| 43-02-T2 | 43-02 | 1 | ROLE-01 (D-02) | assertion | `npm run verify:capabilities` → `5/5 green`, both targets | ➕ built here (Wave 0) | ⬜ |
| 43-02-T3 | 43-02 | 1 | ROLE-01 (D-02) | mutation proof | three mutations each observed exiting 1 | ➕ built here | ⬜ |
| 43-03-T1 | 43-03 | 2 | ROLE-03 (D-05) | assertion | `npm run baseline:container -- --seed-only --report` | ➕ built here (Wave 0) | ⬜ |
| 43-03-T2 | 43-03 | 2 | ROLE-02 (D-04) | assertion | same run: four `23514`s + `pg_get_constraintdef` read-back | ➕ built here — **ROLE-02's only automated detector** | ⬜ |
| 43-03-T3 | 43-03 | 2 | ROLE-03 (D-05) | mutation proof | scratch migration + `--seed-only --report`, two negative controls | ➕ built here | ⬜ |
| 43-04-T1 | 43-04 | 2 | ACCT-03 (D-23) | build-only + manual | `npm run build`; `grep -rn "updateUser"` → 2 hits. **Build proves compilation only** | ❌ semantics manual (M-43-03) | ⬜ |
| 43-04-T2 | 43-04 | 2 | ACCT-03 | build-only + manual | `npm run build`; `npm run verify:no-header-identity`. **Allow-list cases are written observations, not tests** | ❌ manual | ⬜ |
| 43-04-T3 | 43-04 | 2 | ACCT-03 (D-23) | manual, blocking | none — a real inbox and a deployed build | ❌ M-43-03 | ⬜ |
| 43-05-T1 | 43-05 | 3 | ROLE-01 (D-01, D-02, D-14) | container | `npm run baseline:container -- --smoke` | ✅ | ⬜ |
| 43-05-T2 | 43-05 | 3 | ROLE-01 (D-02, D-14) | assertion | `npm run verify:capabilities -- --target=container` → `5/5 green` | ➕ 43-02's fifth side | ⬜ |
| 43-05-T3 | 43-05 | 3 | ROLE-01 | schema apply, blocking | `baseline:compare --before-point=33-final --after-point=43-05` → zero defects | ✅ comparator | ⬜ |
| 43-06-T1 | 43-06 | 4 | ROLE-02 (D-04, D-06) | static | `grep -rn "role_implies_approved" src/` → 0; re-measured row count | ✅ | ⬜ |
| 43-06-T2 | 43-06 | 4 | ROLE-03 (D-05) | assertion | `npm run baseline:container -- --seed-only --report` → 9 of 9 cells, four `23514`s | ➕ 43-03's seam | ⬜ |
| 43-06-T3 | 43-06 | 4 | ROLE-02 (D-04) | schema apply, blocking | `baseline:compare --before-point=43-05 --after-point=43-06`; by-hand refusal in production | ✅ + manual | ⬜ |
| 43-07-T1 | 43-07 | 5 | ACCT-04 (D-11, D-18, D-19, D-22) | container | `npm run baseline:container -- --smoke`; policy/`search_path`/`revoke` greps | ✅ | ⬜ |
| 43-07-T2 | 43-07 | 5 | ACCT-04 (D-22) | build + assertion | `npm run build` (`CAP_DESCRIPTIONS` totality is genuinely proved); `verify:capabilities` `5/5` | ✅ | ⬜ |
| 43-07-T3 | 43-07 | 5 | ACCT-04 | schema apply, blocking | `baseline:compare --before-point=43-06 --after-point=43-07`; `has_function_privilege` → false | ✅ 22 append-only cells | ⬜ |
| 43-08-T1 | 43-08 | 6 | ROLE-01, ROLE-03 (D-01, D-05) | assertion | `--seed-only --report` → 12 grid cells, six refused writes | ➕ built here (Wave 0) | ⬜ |
| 43-08-T2 | 43-08 | 6 | ROLE-01 (D-02, D-14) | re-baseline | `baseline:compare --before-point=43-07 --after-point=43-08`; staff ≡ member cell-for-cell | ✅ + a one-off comparison | ⬜ |
| 43-09-T1 | 43-09 | 6 | ROLE-02 (D-04) | build-only | `npm run build`; `grep` no branch on message text. **Build proves compilation only — not the RPC name, not an argument order** | ❌ M-43-04 | ⬜ |
| 43-09-T2 | 43-09 | 6 | ACCT-04, ACCT-01 (D-11, D-21, D-07) | build-only | `npm run build`; `verify:no-header-identity`; `grep` no `"master"` target | ❌ M-43-08, M-43-07 | ⬜ |
| 43-09-T3 | 43-09 | 6 | ACCT-04 | build-only | `npm run build`; `grep` no asserted count. **The harness never proves an act was recorded** | ❌ M-43-08 | ⬜ |
| 43-10-T1 | 43-10 | 7 | ACCT-05 (D-13) | build-only | `npm run build`; migration greps for no CHECK and no FK | ❌ M-43-10 | ⬜ |
| 43-10-T2 | 43-10 | 7 | ACCT-05 (D-13, D-17) | build-only | `npm run build`; `profiles` query count in `verify/route.ts` unchanged | ❌ M-43-10 | ⬜ |
| 43-10-T3 | 43-10 | 7 | ACCT-05 | schema apply, blocking | `baseline:compare --before-point=43-08 --after-point=43-10` → zero defects; one real scan | ✅ + manual | ⬜ |
| 43-11-T1 | 43-11 | 7 | ACCT-01, ACCT-02, ACCT-04 (D-07, D-08, D-09, D-20) | build-only | `npm run build`; greps for no sleep, no env fallback, no `qr.ts` generator | ❌ M-43-01, M-43-07 | ⬜ |
| 43-11-T2 | 43-11 | 7 | ACCT-03 (D-10) | static | `grep` finds no interpolated password and no `ɘ` in the template | ✅ static half | ⬜ |
| 43-11-T3 | 43-11 | 7 | ACCT-01 | build-only | `npm run build`; notice-cause greps | ❌ M-43-01 | ⬜ |
| 43-12-T1 | 43-12 | 8 | ROLE-04 (D-12, D-16, D-22) | container | `--smoke`; greps: no address, `search_path`, `revoke`, `'system'` | ✅ applies | ⬜ |
| 43-12-T2 | 43-12 | 8 | ROLE-04 (D-16) | build-only | `npm run build`; `grep` no direct role write left in the route | ❌ M-43-05, M-43-06 | ⬜ |
| 43-12-T3 | 43-12 | 8 | ROLE-04 | schema apply, blocking | none automated — four cases run by hand, master count never zero | ❌ M-43-06, **the phase's highest-consequence check** | ⬜ |
| 43-13-T1 | 43-13 | 8 | ACCT-05 (D-17) | build-only | `npm run build`; `deleteObjectStore` count unchanged | ❌ M-43-11 | ⬜ |
| 43-13-T2 | 43-13 | 8 | ACCT-05 (D-17) | build-only | `npm run build`; `refuse(` call-site count unchanged | ❌ M-43-11 | ⬜ |
| 43-13-T3 | 43-13 | 8 | ACCT-05 (D-17) | manual, blocking | none — a device at v3 with a queued scan. **Not deferrable** (`.planning/STATE.md`) | ❌ M-43-11 | ⬜ |
| 43-14-T1 | 43-14 | 9 | ROLE-01, ROLE-02, ACCT-05 (D-01, D-04, D-13) | build-only | `npm run build`; `grep` no `e.message` rendered. **One of twenty-one role sites errors at compile time** | ❌ M-43-04, M-43-10 | ⬜ |
| 43-14-T2 | 43-14 | 9 | ACCT-04 (D-19, D-22) | build-only | `npm run build`; `grep` no service client on the read surface | ❌ M-43-09 (a real member session) | ⬜ |
| 43-15-T1 | 43-15 | 10 | all nine | documentation | procedure-count and address-shape greps | n/a — writing, not detecting | ⬜ |
| 43-15-T2 | 43-15 | 10 | ROLE-01, ROLE-03, ACCT-04 | comparison | `baseline:compare --before-point=33-final --after-point=43-final` | ✅ | ⬜ |
| 43-15-T3 | 43-15 | 10 | all nine | documentation | this table, reconciled against what was observed | n/a | ⬜ |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky ·
Detector: ✅ exists · ➕ built by this phase · ❌ manual only*

### Sampling continuity

No three consecutive tasks lack an automated verify. The longest run of
build-only tasks is **43-11-T1 → 43-11-T3**, and it is broken by 43-11-T2's
static assertion and closed by 43-12-T1's container run in the following wave.
Every plan that changes DDL, a policy, a grant row or the seed carries its own
`baseline:container` **and** `baseline:compare` — 43-05, 43-06, 43-07, 43-08 and
43-10 — so the maximum feedback latency stays one plan.

---

## Requirement → Detection Map

| Req | Behaviour | What detects a failure | Command / procedure | Exists? |
|---|---|---|---|---|
| ROLE-01 | `role = 'staff'` accepted by **both** role constraints | Container build applies every migration and names the failing file | `npm run baseline:container -- --smoke` | ✅ |
| ROLE-01 | `staff` holds exactly the intended capabilities | B3 write matrix — **only if `staff` joins `PERSONA_ROLES`**; otherwise nothing automated sees it | `baseline:container` + `baseline:compare` | ⚠️ conditional |
| ROLE-01 | catalogue and `CAP` agree | `verify-capabilities.mjs` four-sided parity on the **catalogue** | `npm run verify:capabilities` | ✅ |
| ROLE-01 / D-02 | every capability has an **explicit** decision for `staff` | Nothing today — `verify-capabilities.mjs` never reads `role_capabilities` | new fifth-side assertion | ❌ Wave 0 |
| ROLE-02 / D-04 | a violating write is refused by the database | Container assertion: attempt the four forbidden inserts **after** the constraint is restored, assert `23514` on each | new assertion in `scripts/container/seed.mjs` | ❌ Wave 0 |
| ROLE-02 | the refusal is **distinguishable**, not generic | Manual only — Next redacts a Server Action message in production, so `next dev` proves nothing about production | M-43-04 | ❌ Wave 0 |
| ROLE-03 / D-05 | the four forbidden personas survive seeding | The seed grid assertion already **throws** on a hole — this is the ROLE-03 detector and it exists | `npm run baseline:container -- --seed-only --report` | ✅ |
| ROLE-03 | the sixteen cells still carry evidence | `baseline:compare` B3 `b3_cell_missing` / `b3_cell_changed`; `absent` and `inconclusive` are reported separately, so a cell that stopped proving anything is not read as agreement | `npm run baseline:compare` | ✅ |
| ROLE-03 | the constraint is the **same object** in container and production | A `NOT VALID` restore changes `convalidated` and no capture notices | new read-back of `pg_get_constraintdef` | ❌ Wave 0 |
| ROLE-04 / D-12 | demotion happens | Manual — two accounts and an env-var change | M-43-05 | ❌ Wave 0 |
| ROLE-04 / D-16 | an unset or unmatched `MASTER_EMAIL` demotes **nobody** | Manual, and the **highest-consequence check in the phase**: getting it wrong is a lockout | M-43-06 | ❌ Wave 0 |
| ACCT-01 / D-20 | an organizer cannot create or promote to `master` | B3 cannot see it — the ceiling lives in a Server Action, not a policy | M-43-07 + a `grep` assertion that no path passes `role: 'master'` | ❌ Wave 0 |
| ACCT-02 / D-09 | valid for entry **before first login** | Manual, and load-bearing: needs a created account, a real party, a phone, and a scan before the account has ever signed in | M-43-01 | ❌ Wave 0 |
| ACCT-02 | valid for entry with the **radio off** | Manual, and the procedure must test **both orders** relative to the roster download — an account created after the download is predicted to be refused | M-43-02 | ❌ Wave 0 |
| ACCT-03 / D-10 | the message carries a link, never a password | Static `grep` for an interpolated secret in the template; semantics manual | grep + M-43-03 | ❌ Wave 0 |
| ACCT-03 / D-23 | the link **actually lets a password be set** | Manual — and it **fails today**: no set-password surface exists | M-43-03 | ❌ Wave 0 |
| ACCT-04 / D-11 | all five acts land in one register | B3 proves who may write; it never proves that a successful approval also wrote its row. **This is ACCT-04's real risk and the harness does not cover it.** | M-43-08 + a container assertion that calls the path and counts rows | ❌ Wave 0 |
| ACCT-04 | the register is **append-only** | B3 proves this well: `update` and `delete` must refuse for **every** persona, `master/approved` included — 22 cells of real evidence | `npm run baseline:container` | ✅ once the table exists |
| ACCT-04 / D-19 | a member reads zero register rows | Manual for production — the Management API bypasses RLS; B2 measures the *policy* in the container | M-43-09 + B2 | ⚠️ container yes, production manual |
| ACCT-05 / D-13 | a free staff entry appears in the night's attendance | Manual — scan a staff card at a real party, read the night's list | M-43-10 | ❌ Wave 0 |
| ACCT-05 / D-17 | the marker survives the **offline** path | Manual — the IndexedDB upgrade must be exercised, and a queued scan must not be stranded | M-43-11 | ❌ Wave 0 |

### What the container write matrix can observe

The net that already caught a real defect. Being exact about its reach:

**It can observe** — the register's append-only property (new table × 3 verbs × 9 seeded personas, plus `anon` and `authenticated`/no-profile); the register's read boundary; that no existing verdict moved (every table × verb × persona cell must be byte-identical to the pre-phase capture apart from the register's new ones); **the four forbidden personas' sixteen cells**, which is what ROLE-03 exists to preserve; and `staff`'s own read and write cells — **only** if `staff` joins `PERSONA_ROLES`.

**It cannot observe** — any middleware verdict (all four route rules live in `middleware.ts`; the harness speaks SQL, which is why M-12 cannot be substituted); any Server Action gate (ACCT-01's ceiling is `verifyMaster` versus `verifyAdminOrOrganizer`); anything about email, the link, or the door's offline path; and **whether an act was recorded** at all.

### What `npm run build` proves — and does not

**Proves:** TypeScript compiles; the capability-description map stays total over the key union; a widened `updateMemberRole` parameter type is checked at its call sites.

**Does not prove:** that a capability key string is spelled correctly (the RPC client is untyped, so a misspelling is a runtime `false` — at the door, a refusal in front of a queue); that a migration applies or a constraint exists; that a column name in any query is real; **that `role` is handled anywhere it is enumerated** — one of twenty-one sites errors, because seventeen `role as UserRole` casts launder the new value silently; that the invitation carries a link and not a password; that an account is admissible at the door.

---

## Wave 0 Requirements

- [ ] `scripts/container/seed.mjs` — constraint drop/restore in `try/finally`, restoring `NOT VALID` (ROLE-03 / D-05)
- [ ] `scripts/container/seed.mjs` — assert the row the write matrix probes still satisfies the constraint, so the `profiles × update` cells cannot silently flip
- [ ] `scripts/container/seed.mjs` — read back `pg_get_constraintdef` after the restore and assert it matches the migration's predicate (ROLE-02)
- [ ] `scripts/container/seed.mjs` — attempt the four forbidden writes **after** the restore and assert `23514` on each. **This is ROLE-02's only automated detector.**
- [ ] `scripts/verify-capabilities.mjs` — a fifth side: every `(role × capability)` pair is a grant row or a **declared refusal** (ROLE-01 / D-02)
- [ ] `scripts/rls-baseline.mjs` — `staff` in `PERSONA_ROLES` and `PERSONA_SQL`, with the re-baseline owned by its own plan (`b2_persona_added` / `b3_cell_added` have no override flag)
- [ ] `43-HUMAN-UAT.md` — eleven written procedures: M-43-01 (entry before first login), M-43-02 (entry with the radio off, both orders), M-43-03 (the link sets a password), M-43-04 (the refusal is distinguishable in a **production** build), M-43-05 (demotion), M-43-06 (unmatched `MASTER_EMAIL` demotes nobody), M-43-07 (an organizer cannot reach `master`), M-43-08 (five acts, one register), M-43-09 (a member reads zero register rows, real session), M-43-10 (a staff entry in the night's attendance, and readable), M-43-11 (the IndexedDB upgrade strands no queued scan)
- [ ] **`32-HUMAN-UAT.md` M-12 — run before the constraint migration** (D-15). Its window closes permanently with that migration.
- [ ] Framework install: **none.** No test runner is added by this phase.

---

## Manual-Only Verifications

| Behaviour | Requirement | Why manual | Procedure |
|---|---|---|---|
| The scanner page opens for an account whose access was never approved | D-15 / D-06 | A middleware verdict; the harness speaks SQL | `32-HUMAN-UAT.md` M-12 — **before the constraint migration** |
| Entry works before the account has ever signed in | ACCT-02 | Needs a real party, a phone and a scan | M-43-01 |
| Entry works with the radio off, in both orders relative to the roster download | ACCT-02 | The offline store is on a device | M-43-02 |
| The invitation link lets a password be set | ACCT-03 / D-23 | Semantics of an email and a browser flow | M-43-03 |
| A refused write is distinguishable, not "something went wrong" | ROLE-02 | Next redacts Server Action messages in production only | M-43-04 |
| Demotion happens, and an unmatched `MASTER_EMAIL` demotes nobody | ROLE-04 / D-16 | Env-var change across two accounts; a lockout if wrong | M-43-05, M-43-06 |
| An organizer cannot reach `master` | ACCT-01 / D-20 | A Server Action gate, invisible to a policy probe | M-43-07 |
| Five acts, one register, with author and timestamp | ACCT-04 / D-11 | The harness proves who may write, never that the act was recorded | M-43-08 |
| A member reads zero register rows in **production** | D-19 | The Management API bypasses RLS | M-43-09 |
| A staff entry appears in the night's attendance and is readable | ACCT-05 | A count is not a detector of legibility | M-43-10 |
| The IndexedDB upgrade strands no queued scan | D-17 | The door is a device, and this is the phase's only door change | M-43-11 |

---

## The coverage claim, stated honestly

Of the nine requirements, **two** (`ROLE-03`, and `ACCT-04`'s append-only half)
have strong automated detection. **One** (`ROLE-01`'s constraint) has weak
automated detection. **Six** depend primarily on written manual procedures, and
three of those (`ACCT-02` before first login, `ACCT-02` with the radio off,
`ACCT-03`'s link) cannot be observed by any tool in this repository.

**A phase that reports itself verified without those procedures written and
executed has verified two of nine.**

---

## Validation Sign-Off

- [ ] Every task has an automated verify or a named Wave 0 dependency
- [ ] Sampling continuity: no three consecutive tasks without an automated verify
- [ ] Wave 0 covers every ❌ in the detection map
- [ ] No watch-mode flags
- [ ] M-12 executed and recorded **before** the constraint migration (D-15)
- [ ] The eleven `43-HUMAN-UAT.md` procedures are **written** (execution may defer per decision 12; writing may not)
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
