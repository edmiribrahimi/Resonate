---
phase: 31
slug: live-defects-at-the-door-and-the-bar
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-08-05
source: 31-RESEARCH.md § Validation Architecture
---

# Phase 31 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

> **There is no test runner for the product.** `package.json` has no `test` script and
> the repository contains no `*.test.*` / `*.spec.*` file (verified 2026-08-05). **No
> requirement in this phase may be called verified because "tests pass."** Each one is
> proved by exactly one of three kinds of evidence, named explicitly per row:
>
> - **`file:line`** — a static assertion someone can re-check by opening the file
> - **observable** — a behaviour visible on screen, in the data, or in the response
> - **manual** — a written procedure naming the role, the device, the network state, and what must be seen
>
> `npm run verify:persona` does **not** apply here: it runs only when `CLAUDE.md` or
> `.claude/**` changes, and it verifies the persona's coherence, never the product's
> correctness.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | **none** — no runner exists for the product |
| **Config file** | none |
| **Quick run command** | `npm run build` — the Next typecheck, and the only automatic gate |
| **Full suite command** | `npm run build` + every manual procedure below, executed and written into `31-VERIFICATION.md` |
| **Estimated runtime** | build ~minutes; the manual door pass is a scheduled session, not a command |

**If a runner were introduced** (recorded, *not* proposed for this phase): it would need a
DOM-less IndexedDB (`fake-indexeddb`) for the merge and the rekey, and a fetch stub for the
four sync buckets — and it would still not cover the camera, the haptics, the service
worker or the dark venue. Introducing it here would make the phase about tooling.

---

## Sampling Rate

- **After every task commit:** `npm run build` — the typecheck must pass before the commit
- **After every plan wave:** `npm run build` + every **file:line** assertion for that plan's requirements, re-read and quoted
- **Before `/gsd-verify-work`:** every **manual** row executed against **a production build or a preview deployment — never `npm run dev`**, on a phone, including at least one full pass with the radio physically off
- **Max feedback latency:** one build for static evidence; the door pass is once per phase, scheduled

> **Why never `npm run dev`:** the service worker is disabled in development
> (`next.config.ts:9`). Every offline verification run in dev measures the wrong cache
> and proves nothing.

---

## Per-Requirement Verification Map

Task IDs are assigned when the plans are written; this map is keyed by requirement and is
the contract each plan's tasks must satisfy.

| Req | Behaviour | Evidence kind | Concrete step / assertion | Status |
|---|---|---|---|---|
| FIX-01 | Inbound `x-user-*` never reaches server code | **file:line** + **observable** | `src/lib/supabase/middleware.ts:131-133` deletes all three **before** `:136-138` sets them. `curl -H "x-user-role: master" <deployment>/` returns the anonymous page | ✅ applied 2026-08-05 |
| FIX-02 | Second "serve" fails distinctly | **file:line** + **manual** | `organizer/events/actions.ts:1189-1199` and `menu/actions.ts:305-315` throw on `applied === false`. Manual: as organizer, press Serve twice on one token — the second shows "already been served" and the count does not move | ✅ applied 2026-08-05 |
| FIX-03 | A genuine duplicate survives sync | **manual** (two devices, network off) | Two staff sessions offline scan the same ticket; reconnect both. One `door_scan_events` row with `outcome = 'already_recorded'`; the queue entry is removed **only after** that row exists; the review list shows one `two_devices` entry | ⬜ pending |
| FIX-04 | Three outcomes, identical on and off | **manual** (production build, on then off) | Six scans — valid / repeat / unknown — once online, once with the radio off. Three screens, the same three, in the same order; the repeat shows a time and an operator **both** times | ⬜ pending |
| FIX-04a | The third outcome states a fact, not a verdict | **observable** + **file:line** | The amber flash reads "Recorded at HH:MM by ⟨role label⟩" and contains no cause word. Assert `cause` is `NULL` on the row the scanner produced | ⬜ pending |
| FIX-05 | An unsynced check-in survives a refresh | **manual** (network off, then refresh) | Offline check-in; force a refresh with the queue non-empty. Still shown as arrived, still one pending entry, `checkedInAt` unchanged | ⬜ pending |
| FIX-06 | The cache is never empty during a refresh | **manual** + **observable** | Throttle to 3G, let the `"apis"` cache serve a stale payload, refresh. The guard refuses, the count does not drop, the screen says the list was not refreshed. DevTools → Application → IndexedDB: row count never reaches 0 | ⬜ pending |
| FIX-07 | Same person, two parties, one device | **manual** (network off) | Offline, check the same membership code in at two parties. `pendingCheckins` holds **two** rows with distinct keys — read both in DevTools and record them in `31-VERIFICATION.md` | ⬜ pending |
| FIX-08 | A permanent failure is recorded as failed | **manual** + **observable** | Queue a scan for a deleted member, reconnect: it leaves `pending`, appears once under "could not be recorded" with its reason, and is never retried. Separately: expire the session, reconnect → `blocked`, sign-in prompt, queue intact | ⬜ pending |
| FIX-09 | Refunded ticket admitted and flagged | **manual** ×3 + **observable** | (a) refund **before** the night, scan online → admitted, amber, review entry `refunded_before_night`; (b) same with the radio off → admitted, flagged on sync; (c) refund **after** the night's start → **no** review entry, the finance surface shows it | ⬜ pending |
| FIX-10 | The queued scan carries the signed token | **file:line** + **manual** | The `offlineSync && directTicketId` branch is **gone** from `checkin/route.ts` (assert by grep). Offline scan → `pendingCheckins` holds a `uuid.64-hex` token, not a bare id. Negative: `POST /api/tickets/checkin {"ticketId":"…","offlineSync":true}` as organizer returns `not_valid` | ⬜ pending |
| FIX-11 | The review list, classified by cause | **manual** (four seeded cases) + **observable** | Produce all four on one night: double read (same operator, same device, seconds apart), a second unused ticket for the same holder, two devices minutes apart, an invalid signature. Three rows; the double read **absent from the list and present in the counter**; the invalid signature also surfaced at the door when the network returns | ⬜ pending |
| FIX-11 | Empty on a normal night | **observable** | A night with no conflicts: the list renders its designed empty state, no badge, no notification | ⬜ pending |
| FIX-12 | Prose for the supervisor, identifiers for a master | **observable** + **file:line** | The technical view's copied text contains no `@` and no full name — verify by pasting into a plain editor. Assert `door_scan_events` has no name/email column (schema read) | ⬜ pending |
| FIX-13 | No automatic label on a member | **file:line (negative)** | `grep -rn 'from("profiles")'` over the files this phase adds or changes returns **zero writes**. Assert the review list carries no per-member aggregate. Record the grep **and its output** in `31-VERIFICATION.md` | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Nothing else can be built against a contract that does not exist yet:

- [ ] `src/lib/door/outcome.ts` — the shared three-outcome union
- [ ] The migration for `door_scan_events` **with its RLS policy in the same file**, plus the refund-evidence columns — everything server-side depends on it
- [ ] `src/types/database.ts` — the matching interfaces, in the same commit as the migration (`supabase-data.md`)
- [ ] The service-worker `/api/*` override in `src/app/sw.ts` — **first**, because until it lands every offline verification measures the wrong cache
- [ ] A stable `deviceId` written once into IndexedDB — `door_scan_events.device_id` is NOT NULL and the `two_devices` classification is impossible without it
- [ ] A written door runbook for the verification night — devices, accounts, what to do if the scanner fails entirely, and who decides (`checkin-offline.md`)

---

## Manual-Only Verifications

Everything touching the camera, the haptics, the service worker or the dark venue is
manual by nature — there is no runner, and a runner would not reach them either.

| Behaviour | Requirement | Why manual | Instructions |
|---|---|---|---|
| The door pass with the radio off | FIX-03, FIX-04, FIX-05, FIX-06, FIX-07, FIX-09, FIX-10 | The service worker and the offline queue only exist in a production build on a real device | Production build or preview deploy, on a phone, radio physically off. Run the six-scan sequence, then reconnect and observe the sync |
| The two-devices conflict | FIX-03, FIX-11 | Requires two distinct `device_id` values, which a second browser profile does not reproduce | Two installs on two devices, both offline, same ticket, minutes apart |
| The four seeded conflict causes | FIX-11 | Classification can only be judged against real rows produced by real scans | Seed all four on one night, then read the review list |

*A `31-VERIFICATION.md` without a single `file:line` citation does not satisfy the gate.*

---

## Validation Sign-Off

- [ ] Every requirement above has its evidence kind named and its evidence recorded
- [ ] `npm run build` green at every task commit
- [ ] Wave 0 complete before any dependent work
- [ ] The manual door pass executed against a production build, on a phone, radio off
- [ ] Results written into `31-VERIFICATION.md` with `file:line` citations
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
