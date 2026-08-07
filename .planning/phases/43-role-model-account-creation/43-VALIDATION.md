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

*To be populated by the planner: one row per task, citing the requirement, the
detection command from the map below, and whether the detector already exists or
is a Wave 0 gap. A task whose only verification is `npm run build` must say so
explicitly — the table below records exactly what that does not prove.*

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | Detector Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-----------------|--------|
| — | — | — | — | — | — | — | ⬜ to be filled at planning |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

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
