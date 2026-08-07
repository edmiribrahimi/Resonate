---
phase: 33
slug: server-data-access-layer
status: open
nyquist_compliant: false
nyquist_outstanding: "Criterion 2 on the money path. `/admin/finance` is already gated non-forgeably by the middleware's `admin.access` rule independently of this phase, so the probe written for it cannot fire — see § *Criterion 2 and the money path*. The evidence that does carry criterion 2 is plan 33-12's positive-controlled probe plus plan 33-14's structural census; the money-path row is recorded OWED rather than green."
wave_0_complete: false
wave_0_note: "The two instruments this phase's criteria depend on — `scripts/verify-no-header-identity.mjs` and `scripts/probe-forged-identity.sh` — do not exist yet. Plan 33-02 (wave 1) builds them, and no conversion plan may be verified before they do."
created: 2026-08-07
updated: 2026-08-07
source: 33-RESEARCH.md § Validation Architecture
---

# Phase 33 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

> **There is no test runner for the product.** `package.json` has `dev`, `build`,
> `start`, `lint`, `verify:persona`, `verify:capabilities` and the three baseline
> scripts, and nothing else; no `*.test.*` or `*.spec.*` file exists.
> **No criterion here may be called verified because "tests pass."** Each is
> proved by exactly one of:
>
> - **`file:line`** — a static assertion anyone can re-open
> - **mechanical** — a command with a stated expected number, re-runnable
> - **observable** — a behaviour visible in a response, on a screen, or in the data
> - **manual** — a written procedure naming the role and the steps, executed and written down

> **This phase's hardest criterion is 2, and it is a sensitivity problem, not a
> coding one.** "A forged header is answered exactly as an anonymous request"
> is trivially true on any surface that some *other* mechanism already protects.
> A probe placed there reports "no difference" because it cannot see one. The
> phase has already recorded two surfaces of that shape — `/events` (RLS refuses
> unpublished rows to `anon` regardless) and `/admin/finance` (the middleware
> refuses `/admin/*` to anyone without `admin.access`, resolved from the session).
> **A probe that has never been shown to fire proves nothing.** Every criterion-2
> claim in this phase must name the mechanism that would make it fail.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Product test framework** | **none** — and none is introduced, deliberately (`CLAUDE.md` Guardrail 1) |
| **Automatic gate** | `npm run build` → `next build --webpack`, which is also the typecheck. Proves the TypeScript is well-formed. **Proves nothing about a capability key, a policy or a verdict** |
| **Persona gate** | `npm run verify:persona` — covers `.claude/**` consistency only, never the product |
| **Quick run** | `npm run build` |
| **Full run** | `rm -rf .next && npm run build` + `npm run verify:no-header-identity` + `npm run verify:capabilities` + `baseline:rls` / `baseline:container` / `baseline:compare` at a new `--phase-point` + `scripts/probe-forged-identity.sh` with its positive control |

**A stale `.next` after a worktree merge produces a false build failure** (pitfall
P-6). `rm -rf .next` before diagnosing anything.

---

## The instruments

Two are inherited from phase 32 and must not be reinvented. Two are built by
plan **33-02** in wave 1 and do not exist until it lands.

| ID | Instrument | What it asserts | Status |
|---|---|---|---|
| **I1** | `npm run baseline:rls` / `baseline:container` + `baseline:compare` | CAP-03-style comparison: no role's reach moved. Two targets, because production holds no organizer and no non-approved row | inherited, exists |
| **I2** | `npm run verify:capabilities` | four-sided key parity | inherited, exists |
| **I3** | `npm run verify:no-header-identity` (`scripts/verify-no-header-identity.mjs`) | **no file under `src/` other than `src/lib/supabase/middleware.ts` contains the substring `x-user-`**, matched case-**insensitively** against a lower-cased haystack | **built by 33-02** |
| **I4** | `scripts/probe-forged-identity.sh` | the criterion-2 procedure, with its surface, its observable and its positive control encoded in comments | **built by 33-02** |

**What I2 does not say, and must be quoted with:** it reads the **catalogue**
(`private.capabilities`), never the **grants** (`private.role_capabilities`).
A green is not a statement about who can do what (D-32-L). A command named
`verify` will otherwise be cited as if it were.

**Why I3 is case-insensitive, and why that is not fussiness.** HTTP header names
are case-insensitive and `headers().get()` is too, so `headers().get("X-User-Role")`
reads the same value a lower-case grep cannot see. This repository has a recorded
incident of exactly that class: `grep -c 'CREATE POLICY' supabase/schema.sql`
returns **0** while `grep -ci` returns **37**, and that zero became the false
guardrail D-32-C, which tells readers not to look where 37 policies are. **A
check that returns the right number for the wrong reason is worse than no check.**
Every ad-hoc `x-user-` census run alongside I3 must carry `-i` for the same
reason, or the "independent" cross-check is weaker than the instrument it audits.
Measured 2026-08-07: `grep -rn` and `grep -rni` both report **98** today, so
adding `-i` does not disturb the recorded pre-phase figure.

**I4's observable is `Add Item`, never byte size.** Two anonymous requests to the
same URL differed by up to 2.3 KB in `next dev` (build ids, RSC nonces).
**MEASURED** — a size assertion in a plan is noise dressed as evidence.

---

## Per-Criterion Verification Map

Criteria are `ROADMAP.md:172-175`. Requirement: **CAP-05**.

| # | Behaviour | Evidence kind | Concrete evidence | Status |
|---|---|---|---|---|
| **1** | No page, server action or API route derives a role or an identity from a request header | **mechanical** + file:line | (i) `npm run verify:no-header-identity` exits **0**; (ii) the independent census `grep -rni 'x-user-' src/ \| grep -v 'src/lib/supabase/middleware.ts'` → **0 lines**, against the pre-phase **98** (97 reads across 44 files + one stale comment at `src/types/database.ts:389`); (iii) `src/lib/supabase/middleware.ts` contains **no** `requestHeaders.set("x-user-` and **exactly three** `requestHeaders.delete("x-user-`, counted with comment lines filtered out | ⬜ pending |
| **1** | The build still typechecks | **mechanical** | `rm -rf .next && npm run build` | ⬜ pending |
| **2** | A forged identity header is answered exactly as an anonymous request | **manual, scripted, with a positive control** | `scripts/probe-forged-identity.sh` on `(public)/events/[slug]/menu` in three states — converted (0/0), mutated with the three strip lines commented out (**must fire**: `Add Item` 1 in forged, 0 in anon), restored (0/0). The mutation must be asserted applied (`git diff --stat` non-empty) **before** its result is read. Plan **33-12**, checkpoint task 4 | ⬜ pending |
| **2** | …structurally, rather than by sampling | **mechanical** | After 33-14, no surface reads the header at all, so the probe's green is a **consequence of the census** rather than a sample of it. If the control cannot be re-established in the mutated state *because no reader survives*, that is the correct end state and must be **stated as such**, never reported as a pass | ⬜ pending |
| **2** | …including on the paths that move money | **see § below** | **The written `/admin/finance` check is insensitive and is not evidence.** The money path's criterion-2 evidence is the two rows above: 33-12's positive-controlled probe and 33-14's structural census, which together cover `src/app/(admin)/admin/finance/actions.ts` because it is one of the 44 readers that disappear | ⚠️ **OWED as a direct observation** |
| **3** | Each divergent check is one function; the duplicates are deleted, not left unused | **mechanical** + file:line | (i) `grep -rn 'function verifyOrganizer\|function verifyEventOwnership' src/` → **0**; (ii) `grep -rniE 'role !== ?"(master\|organizer)"' src/` → **0**, against **52** today — the pattern must be case-insensitive and must not assume the variable is called `profile`, because `src/app/api/membership/verify/route.ts:104` calls it `userProfile` and a `profile.role !== ` pattern scores **0** on that file whether the code is there or not; (iii) `grep -rn 'created_by !== ' src/` → only the shared guard; (iv) each plan's summary lists the deleted `file:line`s, reconciled in 33-14 | ⬜ pending |
| **4** | `npm run build` passes and every role reaches exactly the surfaces it reached before | **artefact** + **manual** | (i) `baseline:rls` / `baseline:container` at `--phase-point=33-final`, compared against `33-pre` → **`CAP-03: clean` on both targets**; (ii) the eleven-persona sweep re-run by hand (33-14, checkpoint task 4); (iii) the `profiles` UPDATE cells still report `42P17` for every persona — D-32-A is out of bounds and must be **observably** still out of bounds | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ partial*

---

## Criterion 2 and the money path — the row that is owed, and why

`33-RESEARCH.md` § *Validation Architecture* marked the money-path row
**owed** because it "needs a session". That is true but it is not the whole
reason, and the whole reason changes what the row can ever prove.

**Measured, against the code as it stands before this phase:**

- `supabase/migrations/20260807000000_capability_model.sql:408` grants
  `admin.access` to **`master` alone**. No other role holds it.
- `src/lib/supabase/middleware.ts:172-177` refuses `/admin/*` — which is the
  route a Server Action in `src/app/(admin)/admin/finance/actions.ts` POSTs to —
  to anyone whose resolved capability set lacks `CAP.ADMIN_ACCESS`. That set
  comes from `public.my_access_context()`, i.e. **from the session**, and has
  since phase 32.
- `src/lib/supabase/middleware.ts:210-212` deletes every inbound `x-user-*`
  unconditionally, on Server Action POSTs as well as GET renders (**MEASURED**:
  `[ZZPROBE-ACTION] role=null status=null id=null`).

So a forged `x-user-role: master` on `/admin/finance` is refused **twice**, by
two mechanisms this phase does not change, before `requireMaster()` runs at all.
The forged request and the plain anonymous request return the same thing
**before and after** the conversion, whatever `requireMaster()` reads. The check
is green because the surface is protected elsewhere — not because the conversion
worked.

**A genuine positive control for that one file is not cheaply constructible.**
Making the probe fire requires defeating *both* pre-existing mechanisms: the
strip and the `/admin` capability gate. Reverting only the `requireMaster()`
conversion changes nothing observable. Mutating the strip is plan 33-12's
positive control and belongs there, on the one surface where it is the only
protection; mutating the middleware's `/admin` gate is out of the question. The
honest disposition is therefore:

- the `/admin/finance` steps stay in plan 33-03's checkpoint as a **regression
  check** — a master still lists transactions, an organizer is still bounced —
  which is criterion **4** evidence, not criterion **2** evidence;
- criterion 2 for the money path is carried by 33-12's positive-controlled probe
  (the mechanism *is* shown to fire) plus 33-14's structural census (the finance
  action is one of the 44 readers that disappears);
- this row is recorded **OWED as a direct observation**, and
  `nyquist_compliant` stays **false**.

`32-VERIFICATION.md` set the precedent: **deferred is not verified**, and a
deliberate `false` beats an unearned `true`.

**This is the third instance of one defect shape in two phases** — D-32-I (a
refused `UPDATE` raises nothing and matches no row), the insensitive `/events`
probe, and now this. The rule it produces, which belongs in every future plan:
*name the mechanism that would make the check fail, before writing the check.*

---

## Sampling Rate

- **Per task commit:** `npm run build`, from a cleared `.next` if a merge preceded it.
- **Per wave merge:** `npm run build` + the census delta
  (`npm run verify:no-header-identity` count, and `grep -rni 'x-user-' src/ | grep -v 'src/lib/supabase/middleware.ts' | wc -l`).
  I3 is a **burn-down meter** during the phase: it is *expected to exit 1* until
  33-14 lands, and that is its purpose. Do not wire it into `npm run build`.
- **Phase gate:** full build + I3 + I2 + the baseline pair on both targets + the
  probe with its positive control, before `/gsd:verify-work`.

> A `33-VERIFICATION.md` without a single `file:line` citation does not satisfy
> the project's gate.

---

## Wave 0 requirements — what must exist before the conversions are verifiable

Plan **33-02** owns all of these. Nothing in waves 2–3 can be called verified
until they exist.

- [ ] `scripts/verify-no-header-identity.mjs` (I3) — literal substring match,
      lower-cased haystack, **not** the WR-07 comment parser (a regex literal
      containing a quote defeats it); exactly one exemption, compared as a
      normalised relative path and printed in the output; proved by **mutation**
      with an upper-case probe file, with the mutation asserted applied before
      the result is read.
- [ ] `scripts/probe-forged-identity.sh` (I4) — page mode and server-action mode,
      asserting on `Add Item`; comments carrying why that surface and no other,
      why not byte size, why `/events` is not a valid probe, and the `Origin`
      requirement.
- [ ] A `33-pre` baseline capture on **both** targets, taken **before** the first
      conversion lands. A baseline taken after the change is not a baseline.
- [ ] The recorded decision that the money-path criterion-2 row is **OWED**
      rather than executed — taken here, before conversion begins, as
      `33-RESEARCH.md` § *Wave 0 gaps* requires.

*There is no gap for "install a test framework": none is introduced,
deliberately.*

---

## Manual-only verifications

| Behaviour | Criterion | Why manual | Where |
|---|---|---|---|
| The forged-header probe with its positive control | 2 | The claim is about two request/response pairs and a deliberate mutation of a running server; no static assertion expresses it | 33-12, checkpoint task 4 |
| A master still lists transactions; an organizer is still bounced from `/admin/finance` | 4 | Needs a real session against the SumUp API | 33-03, checkpoint task 3 |
| The door admits a `pending` organizer, with the network on and off | 4 | Needs a device, a queue and a network toggle | 33-04, checkpoint |
| The eleven-persona sweep | 4 | Eleven sessions across eleven surfaces | 33-14, checkpoint task 4 |
| Five navigations on one session after the injection is deleted | — | The cookie re-application loop sits directly below the edited block; a break logs everyone out and looks nothing like a header change | 33-14, checkpoint step 7 |

---

## Advisor lints — two pinned, one never

Carried forward from phase 32 **as corrected**, not as originally written.

`multiple_permissive_policies` (**46**) and `unindexed_foreign_keys` (**35**) are
structural properties of the schema. They are pinned, and
`scripts/rls-baseline-compare.mjs:102` pins exactly those two.

**`unused_index` must never be pinned.** `32-VALIDATION.md` originally pinned it
at **14** and that pin was wrong: the advisor derives the lint from
`pg_stat_user_indexes.idx_scan`, so it counts indexes *not scanned since the
statistics were last reset* and moves as the database is **used**, with no schema
change at all. Measured during phase 32: **14** on 2026-08-06, **12** the same
day with no DDL in between, **13** after an index was added. A criterion that
fails for a reason unrelated to the change teaches the reader to wave the check
through — and the next time it will be the pinned lint that moved.

This phase changes **one** thing in the database: the `user_id` field on
`my_access_context()`. No policy, table or grant moves. A CAP-03 defect means
something did. **Do not pin, do not whitelist, do not pass `--allow-lint-move`**
— it is LINT-wide, not entity-wide (D-32-G).

---

## Known blocking dependencies

- **Docker availability is unverified for the container target**, and criterion
  4's evidence — not its code — depends on it. Production alone cannot produce
  the comparison: it holds 4 profiles, all approved, with **no organizer and no
  non-approved row**, which are precisely the personas whose reach this phase
  must preserve unchanged.
- **A `33-pre` capture must exist before the first conversion commit.** If wave 2
  starts without it, criterion 4 has no comparison and the phase cannot close
  green by any later effort.
- **I3 and I4 do not exist yet.** Any plan verified before 33-02 lands is
  verified against instruments that are not there.

---

## Validation Sign-Off

- [ ] `33-pre` baseline captured on **both** targets before the first conversion
- [ ] I3 and I4 exist, and I3 was proved by an applied, asserted mutation
- [ ] `npm run build` green at every task commit
- [ ] `npm run verify:no-header-identity` exits 0 at the phase gate
- [ ] The census reads **0** against the pre-phase **98**, with `-i`
- [ ] The probe run in all three states, and the positive control's outcome
      recorded — including "could not be re-established, and why"
- [ ] `CAP-03: clean` on both targets at `33-final`
- [ ] The eleven-persona sweep executed and written down, step by step
- [ ] The money-path criterion-2 row recorded **OWED**, with this document's
      reason, in `33-VERIFICATION.md`
- [ ] `nyquist_compliant` left **false** unless the owed row is actually executed

**Approval:** pending
