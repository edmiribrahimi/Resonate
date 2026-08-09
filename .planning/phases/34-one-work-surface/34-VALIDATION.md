---
phase: 34
slug: one-work-surface
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-08-09
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
| CAP-02 | A capability key bound to no route fails the production build | type-level totality over `CapabilityKey` | `rm -rf .next && npm run build`, **proved by mutation**: add a 13th key to `CAP` and confirm the build fails | ❌ Wave 1 | ⬜ pending |
| CAP-02 (inverse) | A staff route bound to no key fails the build | `_everyStaffRouteIsBound` assertion | same, after deleting one route from the map | ❌ Wave 1 | ⬜ pending |
| CAP-02 (chain) | The database catalogue matches `CAP` | `verify-capabilities` sides 1–3, 5 | `npm run verify:capabilities` | ✅ exists — **needs a database, no CI** | ⬜ pending |
| STAFF-01 | Each work surface exists once | file census | `find "src/app/(admin)" -name page.tsx \| wc -l` → 23, and `src/app/(organizer)` must not exist | ❌ Wave 4 | ⬜ pending |
| STAFF-01 | The merged surface renders by entitlement | **manual, per role** — no instrument can see this | M-1 … M-5 | ❌ Wave 5 | ⬜ pending |
| STAFF-02 | Old addresses answer 308 to the right twin | redirect walk | `bash scripts/verify-organizer-redirects.sh` — 15 rows, status + `Location` each | ❌ Wave 1 (table) / Wave 5 (run) | ⬜ pending |
| STAFF-02 | **No redirect matches or points at `/admin/scanner`** | module-load assertion in the redirect table | any import, therefore `npm run build` | ❌ Wave 1 | ⬜ pending |
| STAFF-03 | A hidden nav entry has a matching server-side refusal | type-level — nav and middleware read the same map, so they cannot disagree about the *key* | `npm run build` | ❌ Wave 2 | ⬜ pending |
| STAFF-03 | The key bound to a route is the *right* key | **manual** — no type can hold this | M-1 … M-6 | ❌ Wave 5 | ⬜ pending |
| STAFF-03 | `revalidatePath` targets a route that exists | `scripts/verify-routes.mjs` | `node scripts/verify-routes.mjs` | ❌ Wave 4 | ⬜ pending |
| all | No row-level permission moved | container baseline | `baseline:container` ×2 + `baseline:compare` | ✅ exists | ⬜ pending |
| all | Persona coherence survives the deletion of a route group | `verify:persona` checks A, B, G | `npm run verify:persona` | ✅ exists | ⬜ pending |

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

## Validation Sign-Off

- [ ] Every plan task carries either an automated command from the map above or a named M-procedure
- [ ] Sampling continuity: no three consecutive tasks without `npm run build`
- [ ] Wave 0 gaps closed in Wave 1
- [ ] CAP-02's gate **proved by mutation** in both directions, with the mutation confirmed applied before its result is read
- [ ] M-9 run **before and after** the middleware plan
- [ ] No test framework installed
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
