---
phase: 34
slug: one-work-surface
status: executed
nyquist_compliant: false
nyquist_unmet: "M-9 was to be run BEFORE and AFTER the middleware plan (34-03). Neither half was run — deferred by the owner's decision of 2026-08-09 — and the before half is unrecoverable, because the state it would have read no longer exists. Every other sign-off item is met; see 34-VERIFICATION.md § Nyquist sign-off."
wave_0_complete: true
created: 2026-08-09
last_measured: 2026-08-10
---

# Phase 34 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Derived from `34-RESEARCH.md` § Validation Architecture, which measured every
> instrument below against the current repository on 2026-08-09.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | **none — and none is proposed.** `package.json` has no `test` script; no `*.test.*` / `*.spec.*` file exists in the repository |
| **Config file** | none |
| **Quick run command** | `rm -rf .next && npm run build` — this is also the typecheck, and after Wave 1 it is also the CAP-02 gate |
| **Full suite command** | `rm -rf .next && npm run build && npm run verify:persona && npm run verify:capabilities && npm run verify:no-header-identity` |
| **Estimated runtime** | ~2 min for the quick run; `verify:capabilities` additionally **needs a live database** and there is **no CI**, so it is a written pre-deploy step, not an automation |

> **The `rm -rf .next` is not superstition.** A stale `.next` produces a false
> build failure after a worktree merge — recorded in `33-CONTEXT.md` and
> re-verified for this phase.

---

## Sampling Rate

- **After every task commit:** `rm -rf .next && npm run build`
- **After every plan wave:** the full suite command above, plus
  `bash scripts/verify-organizer-redirects.sh` once the redirect table exists
- **Before `/gsd:verify-work`:** full suite green, redirect walk green, container
  baseline captured and compared, and **every written procedure below executed
  and recorded with its date** in `34-VERIFICATION.md`
- **Max feedback latency:** ~120 s for the quick run

---

## Per-Task Verification Map

| Requirement | Behaviour | Test Type | Automated Command | File Exists | Status |
|---|---|---|---|---|---|
| CAP-02 | A capability key bound to no route fails the production build | type-level totality over `CapabilityKey` | `rm -rf .next && npm run build`, **proved by mutation**: add a 13th key to `CAP` and confirm the build fails | ✅ `capability-routes.ts:344` | ✅ **done** — mutation A, 34-01 |
| CAP-02 (inverse) | A staff route bound to no key fails the build | `_everyStaffRouteIsBound` assertion | same, after deleting one route from the map | ✅ `capability-routes.ts:394` | ✅ **done** — mutations B1 **and** B2, 34-01 |
| CAP-02 (chain) | The database catalogue matches `CAP` | `verify-capabilities` sides 1–3, 5 | `npm run verify:capabilities` | ✅ exists — **needs a database, no CI** | ✅ **run by hand** 2026-08-10, 5/5 green — a written pre-deploy step, not an automation |
| STAFF-01 | Each work surface exists once | file census | `find "src/app/(admin)" -name page.tsx \| wc -l` → 23, and `src/app/(organizer)` must not exist | ✅ Wave 4 + 34-15 | ✅ **done** — 23 pages, tree GONE, `(work)` non-route census empty |
| STAFF-01 | The merged surface renders by entitlement | **manual, per role** — no instrument can see this | M-1 … M-5 | ✅ exists | 🟡 **`human_needed`** — unrun, owner decision 2026-08-09 |
| STAFF-02 | Old addresses answer 308 to the right twin | redirect walk | `bash scripts/verify-organizer-redirects.sh` — 15 rows, status + `Location` each | ✅ Wave 1 (table) / 34-17 (run) | ✅ **done** — walked 15/15 at 307, flipped, **re-walked** 15/15 at 308 |
| STAFF-02 | **No redirect matches or points at `/admin/scanner`** | module-load assertion in the redirect table | any import, therefore `npm run build` | ✅ `organizer-redirects.ts:147` | ✅ **holds after the flip** — but see 34-03 Finding 1: it fires on the **first request**, not at build time |
| STAFF-03 | A hidden nav entry has a matching server-side refusal | type-level — nav and middleware read the same map, so they cannot disagree about the *key* | `npm run build` | ✅ Wave 2 | ✅ **done** in one direction only — a **drawn** entry has a matching rule; the converse does not hold and is not claimed |
| STAFF-03 | The key bound to a route is the *right* key | **manual** — no type can hold this | M-1 … M-6 | ✅ exists | 🟡 **`human_needed`** — unrun, owner decision 2026-08-09 |
| STAFF-03 | `revalidatePath` targets a route that exists | `scripts/verify-routes.mjs` | `node scripts/verify-routes.mjs` | ✅ Wave 4 | ✅ **done** — exit 0, 47 literals, 0 offenders, 0 skipped |
| all | No row-level permission moved | container baseline | `baseline:container` ×2 + `baseline:compare` | ✅ exists | ✅ **clean** — and it **cannot see a route**; this phase edits no migration, so the green was near-guaranteed |
| all | Persona coherence survives the deletion of a route group | `verify:persona` checks A, B, G | `npm run verify:persona` | ✅ exists | ✅ **7/7** — worst case moved to the door's client, margin **1 378** tokens |

---

## Wave 0 Requirements

- [ ] `src/lib/routes/capability-routes.ts` — the route↔capability map; CAP-02 in both directions
- [ ] `src/lib/routes/organizer-redirects.ts` — the 15-row redirect table, carrying the `/admin/scanner` assertion
- [ ] `scripts/verify-organizer-redirects.sh` — STAFF-02, mechanical
- [ ] `scripts/verify-routes.mjs` — STAFF-03's `revalidatePath` half, which no type can see
- [ ] `typedRoutes: true` in `next.config.ts` plus the **14 measured type errors** it surfaces today
- [ ] **No test framework is installed, and that must not change.** Adding one is out of scope and would be the phase quietly becoming a different phase

---

## Manual-Only Verifications

Nine procedures. Each must be **written before it is run**, executed by a person,
and recorded in `34-VERIFICATION.md` with its date and its observed result.
**Roles only, never people** — this repository is public.

| # | Role / state | Steps | What must be observed |
|---|---|---|---|
| M-1 | `master` / `approved` | Sign in, open the collapsed nav, visit all 23 addresses | Every nav entry present; every address renders; **no address bounces** |
| M-2 | `organizer` / `approved` | Sign in, open the nav, visit all 23 | Finance, Analytics ×3, Newsletter and `members/growth` **bounce to `/dashboard`**; everything else renders; **`/admin/members/register` renders** — this is the folded todo closing |
| M-3 | `organizer` / **`pending`** | Seed the row by hand — Phase 43's constraint forbids the state (`43-CONTEXT.md` D-15) | Events and tickets surfaces render (`staff.manage` ignores status); **`/admin/members/register` bounces** (`register.read` requires approved); **`/admin/scanner` renders** — `door.operate` is `requires_approved = false` by decision D-06, and this is the observation that defends it |
| M-4 | `staff` / `approved` | Sign in, open the nav | **No staff entry at all**; all 23 addresses bounce; `/membership-card` and `/attendance` render. This is 43-CONTEXT's deferred question **observed rather than asserted** |
| M-5 | `member` / `approved` | Sign in | Identical to M-4 — a member and a staff account see the same staff surface, which is none |
| M-6 | any role holding a **live per-night** `party.manage` | Open `/admin/events/<id>/review?party=<assigned>`, then `?party=<other>` | The assigned night renders; the other **refuses on the page, not in the middleware** |
| M-7 | signed in, any staff role | Visit all 15 `/organizer/*` addresses in a browser | 308 to the right twin, and the twin renders. **Start signed in** — a signed-out run measures the known `?next=` / `?redirect=` mismatch instead of the redirect |
| M-8 | `organizer` / `approved` | On `/admin/members`, approve an account | The list **refreshes without a manual reload** — the only observable proof that the surviving `revalidatePath` is the right one |
| M-9 | door device, **network off** | Open `/admin/scanner`, scan | **Unchanged from before the phase.** Run it **before and after** the middleware plan, not once |

**M-8 and M-9 are the two that would otherwise be discovered by a person at a bad
moment** — M-8 by an organizer approving someone and seeing nothing happen, M-9
at a door, in front of a queue. Neither has an automated substitute, and there is
no error tracking to report either failure on its own.

---

## The container baseline — what it proves, and the claim it does not support

```bash
npm run baseline:container -- --phase-point=pre-34    # B1+B2+B3, throwaway postgres:17.6
# … the phase …
npm run baseline:container -- --phase-point=post-34
npm run baseline:compare -- --only=B1,B2,B3 --before-dir=… --after-dir=…
```

Use the **container**, not the production baseline: `rls-baseline-container.mjs`
reads no environment variable and connects only to a container it starts itself,
while `baseline:rls` refuses destructive writes without `--i-know-this-writes`.
A captured artefact is never overwritten — an existing file aborts naming
`--overwrite`.

**The honest boundary, which corrects a sentence in `34-CONTEXT.md`.** That file
called a green comparison *"the instrument that proves no permission moved —
which for this phase is the whole claim."* **It is not the whole claim.** B1
dumps `pg_policies`; B2 and B3 are persona read/write matrices; B5 is the
Supabase advisor. **None of them can see a route.** This phase edits no
migration, so a green comparison is close to guaranteed and proves only that *no
row-level permission moved* — true, worth recording, and a small part of what
this phase changes. **What moves is who reaches which address**, and the only
instruments for that are the map's type-level assertions and a person signing in
as each role. `34-VERIFICATION.md` must say this, rather than letting a green
baseline stand in for evidence it cannot produce.

---

## Validation Sign-Off — measured 2026-08-10

- [x] Every plan task carries either an automated command from the map above or a named M-procedure
- [x] Sampling continuity: no three consecutive tasks without `npm run build` — every SUMMARY records a build per task commit
- [x] Wave 0 gaps closed in Wave 1 — plans 34-01 and 34-08
- [x] CAP-02's gate **proved by mutation** in both directions, with the mutation confirmed applied before its result is read — mutations A, B1 and B2, transcripts in `34-01-SUMMARY.md` and gathered in `34-VERIFICATION.md`
- [ ] **M-9 run before and after the middleware plan** — **NOT MET, and it is the one that cannot be caught up.** Neither half was run (owner decision of 2026-08-09). The **before** half is unrecoverable: plan 34-03 rewrote the code that judges the request, so the state a baseline would have read no longer exists. When the after finally runs it must be written as *observed after, not observed before, no comparison made.*
- [x] No test framework installed — and none was proposed
- [ ] `nyquist_compliant: true` set in frontmatter — **withheld**, on the item above alone

**Approval:** `human_needed`. Six of seven sign-off items are met and the
automated suite is green end to end; the seventh failed in the only way that
cannot be repaired later, which is why the flag stays `false` rather than being
granted on a six-out-of-seven reading.
