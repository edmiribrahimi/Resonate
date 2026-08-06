---
phase: 32
slug: capability-model-in-the-database
status: closed
nyquist_compliant: false
nyquist_outstanding: "CAP-04 evidence (ii) — the revoke/restore demonstration with five timestamps. Written out as procedure M-01 in 32-VERIFICATION.md; NOT executed."
wave_0_complete: true
created: 2026-08-06
updated: 2026-08-06
source: 32-RESEARCH.md § Validation Architecture
---

# Phase 32 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

> **There is no test runner for the product.** `package.json` has `dev`, `build`,
> `start`, `lint`, `verify:persona` and nothing else; no `*.test.*` or `*.spec.*`
> file exists. **No requirement here may be called verified because "tests pass."**
> Each is proved by exactly one of:
>
> - **`file:line`** — a static assertion anyone can re-open
> - **observable** — a behaviour visible in a response, on a screen, or in the data
> - **manual** — a written procedure naming the role and the steps, executed and written down

> **This phase's hardest requirement is CAP-03, and it is a measurement problem,
> not a coding one.** "Neither more nor less than before" across 67 policies cannot
> be judged by reading a diff. It is answered by capturing what the database
> actually permits **before** anything moves, and comparing after. **A baseline
> taken after the change is not a baseline.**

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Product test framework** | **none** — and none is introduced, deliberately |
| **Automatic gate** | `npm run build` → `next build --webpack`, which is also the typecheck. Proves the TypeScript is well-formed. **Proves nothing about any column, table or RPC name** — no Supabase client is parameterised with `Database` |
| **Persona gate** | `npm run verify:persona` — covers `.claude/**` consistency only, never the product |
| **Evidence harness** | a script under `scripts/` calling the Supabase Management API, producing committable JSON under `.planning/phases/32-capability-model-in-the-database/baseline/` |
| **Quick run** | `npm run build` |
| **Full run** | `npm run build` **plus** the five baseline artefacts re-captured and compared |

---

## The five baseline artefacts

Captured **twice**: against a throwaway **PostgreSQL 17.6** container (production is
17.6) seeded with one profile per role × status and at least two differently-owned
rows per table — 7 personas, full coverage — **and** against production for the
three personas that exist there.

> **Why both.** Production holds 4 profiles: 1 master, 3 members, all approved.
> **There is no organizer and no non-approved row** — precisely the personas where
> the inconsistency this phase must preserve actually lives. Production gives
> schema truth; only the container gives persona coverage.

| ID | Artefact | What it captures |
|---|---|---|
| **B1** | `32-BASELINE-policies.json` | 67 rows of `pg_policies`, compared by normalised diff against a two-transformation whitelist |
| **B2** | `32-BASELINE-reads.json` | persona × table: row count **and** md5 of the sorted visible primary keys |
| **B3** | `32-BASELINE-writes.json` | persona × table × verb: `ok` or the SQLSTATE |
| **B4** | `32-BASELINE-surfaces.md` | `file:line` and exact predicate for all 4 middleware rules, 5 guard families, 4 door routes, `NAV_ITEMS`, 21 role reads — **written by hand from the code, before anything moves** |
| **B5** | `32-BASELINE-advisors.json` | the Supabase advisor as an independent oracle |

**Probe safety, learned by running it:** `read_only: true` cannot switch role, so
probes run read-write — therefore **every write-probe string ends `rollback;`**,
never `commit`, one probe per request, and all row counts are re-asserted
unchanged afterwards.

---

## Per-Requirement Verification Map

| Req | Behaviour | Evidence kind | Concrete evidence | Status |
|---|---|---|---|---|
| **CAP-01** | One definition, three callers | **file:line** + observable | (i) exactly one definition: `select count(*) from pg_proc … proname='has_capability'` → **1**; (ii) `grep -c 'is_admin_or_organizer\|is_master\|get_user_status'` over the post-change `pg_policies` dump → **0**; (iii) the same capability key appears in `private.capabilities`, in the policy predicate, and in `src/lib/capabilities/keys.ts` — asserted by a script, because the build cannot | ✅ **green** |
| **CAP-03** | Neither more nor less | **B1 + B2 + B3 + B4 + B5** | B1 diff explained entirely by the whitelist · B2 every count **and** fingerprint identical · B3 every cell identical **including SQLSTATE** · B4 predicate column character-identical or the equivalence written · B5 `auth_rls_initplan` 26 → **0** while `multiple_permissive_policies` (46) and `unindexed_foreign_keys` (35) **do not move** — ~~and `unused_index` (14)~~ **UNPINNED, see below** | ✅ **green** |
| **CAP-04** | A grant takes effect on the next request, no session or token refresh | observable + **manual** + file:line | (i) `GET /config/auth` → `hook_custom_access_token_enabled = false` **and `jwt_exp = 3600`**, captured in B5 and re-asserted at `final` — ✅ **measured**; (ii) **manual:** the **revoke**-then-restore demonstration with five timestamps (D-35 — it revokes first, because granting to `member` would widen access for every member for the length of the demonstration) — ⬜ **NOT EXECUTED**, written out as procedure **M-01** in `32-VERIFICATION.md`; (iii) `grep -rn 'my_capabilities\|has_capability' src` shows no call reading from a token — ✅ **measured**, three hits, all three in comments | ⚠️ **structure proved, demonstration OWED** |
| **CAP-06** | All 26 reviewed, per policy, with the result recorded | **file:line** + observable | (i) the **26-row** table lives in `32-CAP06-REVIEW.md` and is referenced by `32-VERIFICATION.md` rather than duplicated — table, policy, cmd, class A–E, transformation, measured result; (ii) B5 after → `auth_rls_initplan` **0** (the advisor stops reporting the lint, which is how it says zero); (iii) `EXPLAIN` before and after for both class-**D** policies and the class-**E** policy — no correlated subquery became an InitPlan; the `EXISTS` **changed shape** to a hashed semi-join as a second-order effect and was then settled by row-count probe rather than by argument; class E raises `42P17` at plan time on both sides, recorded as the honest absence it is; (iv) the privilege-escalation write probe for `role` **and** `status`, before and after, on **both** targets — `42P17` every time | ✅ **green** |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ partial*

### The `unused_index` pin is REMOVED — corrected at the phase gate

The CAP-03 row above originally pinned `unused_index` at **14** alongside
`multiple_permissive_policies` (46) and `unindexed_foreign_keys` (35).

**That number was never stable and the pin was wrong.** The advisor derives that
lint from `pg_stat_user_indexes.idx_scan`: it counts indexes *not scanned since
the statistics were last reset*, so it moves as the database is **used**, with no
schema change at all. Measured: `32-RESEARCH.md` and plan 32-01 both read **14**
on 2026-08-06; plan 32-04's capture, **the same day and with no DDL in between**,
read **12**; it has read 13 since 32-06 added `idx_role_capabilities_capability`.

A criterion that fails for a reason unrelated to the change teaches the reader to
wave the check through — and the next time it will be the pinned lint that moved.
`multiple_permissive_policies` and `unindexed_foreign_keys` are **structural**
properties of the schema rather than of its usage, and they stay pinned; both
held across the whole phase. Recorded in `baseline/README.md` § F3 and
implemented in `scripts/rls-baseline-compare.mjs`, which pins two and not three.

---

## Sampling Rate

- **Per task commit:** `npm run build`
- **Per wave merge:** `npm run build` + re-capture **B1** and **B5** and diff — both read-only, seconds
- **Phase gate:** all five artefacts re-captured on **both** targets, all comparisons clean, plus the CAP-04 manual procedure executed and written into `32-VERIFICATION.md`

> A `32-VERIFICATION.md` without a single `file:line` citation does not satisfy the
> project's gate.

---

## Wave 0 Requirements — what must exist before any DDL is written

- [ ] `scripts/rls-baseline.mjs` — captures B1, B2, B3, B5 against a target given by env; deterministic JSON; one probe per request; every write probe ends `rollback;`; asserts all 20 row counts unchanged afterwards
- [ ] `scripts/rls-baseline-container.mjs` (or a flag on the above) — builds a throwaway **PostgreSQL 17.6** container from `supabase/migrations/**`, seeds 7 personas and ≥2 differently-owned rows per table, runs the same capture. `pg@^8.18.0` is already a devDependency; the precedent is plan `31-03`
- [ ] `32-BASELINE-surfaces.md` (B4) — written by hand from the code, before anything moves
- [ ] **Baseline captured on both targets and committed before the first migration file exists**

*There is no gap for "install a test framework": none is introduced, deliberately.*

---

## Manual-Only Verifications

| Behaviour | Requirement | Why manual | Instructions |
|---|---|---|---|
| A grant takes effect without a token refresh | CAP-04 | The claim is about elapsed time between a write and a reload; no static assertion can express it | Two browsers, a member signed in, a master granting and revoking. Record both reload timestamps |

---

## Known blocking dependency

**Docker availability is unverified for the container target**, and CAP-03's
evidence — not its code — depends on it. Production alone cannot produce the
baseline, because the personas that matter do not exist there.

---

## Validation Sign-Off

- [ ] Baseline captured on both targets **before** the first migration
- [ ] `npm run build` green at every task commit
- [ ] All five artefacts re-captured and compared clean at the phase gate
- [ ] The CAP-04 manual procedure executed, with both timestamps recorded
- [ ] 26 rows in the CAP-06 review table, each with its class and result
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
