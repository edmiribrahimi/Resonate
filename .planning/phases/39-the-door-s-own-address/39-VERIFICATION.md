---
phase: 39-the-door-s-own-address
verified: 2026-08-11T15:34:19Z
status: human_needed
lab_sitting_4: >
  2026-08-19, `.planning/v1.5-LAB-SITTING-4.md` — §0-§1 OSSERVATA sul filo, entrambi gli indirizzi: master e staff assegnato 200, membro 307, anonimo 307 verso /login?redirect=… — e quel parametro si chiama `redirect` mentre la pagina di accesso legge `next`.
score: 4/6 must-haves verified in code; 2 require the end-of-v1.5 sitting by design (D-39-07)
overrides_applied: 0
human_verification:
  - test: "39-DOOR-PASS.md §0-§1 (network on) — the move observed on the wire, both addresses"
    expected: "Both `/door` and `/admin/scanner` render the door with no 3xx on the wire; the bottom nav's Check-in href reads `/door`"
    why_human: "A source assertion cannot prove the absence of a redirect on the wire — a redirect is a response, not a line of code (39-DOOR-PASS.md §1.3's own reasoning)"
  - test: "39-DOOR-PASS.md §1.5 — a pending organizer account is drawn the Check-in entry"
    expected: "An organizer account in status `pending`, signed in, sees the Check-in tab in the bottom nav"
    why_human: "A rendered navigation is not a source fact; also this persona is unrepresentable in production (role_implies_approved.sql CHECK constraint), so this reading can only happen in the seeded container, per deferred-items.md D2"
  - test: "39-DOOR-PASS.md §2-§7 — the six procedures inherited from Phase 38 (P1, P2, P3, P4, P5, P7) plus test 8"
    expected: "Channel-loss, pocket-suspend, degraded-network and cross-device behaviours observed and timed as specified in each section"
    why_human: "Behavioural realtime/offline observations on physical devices; cannot be produced by build or script (39-VALIDATION.md 'Success criterion → sampling point' table)"
  - test: "39-DOOR-PASS.md §8 — THE DARK ROOM: radio off, both phones, launch from the home screen, scan, reconnect, sync, and §8.8 cold launch of the other address"
    expected: "A device with the radio off, launched from the home screen, reaches a working door at both addresses (one warm, one cold); scan produces a verdict; reconnect drains the offline queue"
    why_human: "This is STAFF-04 criterion 2 and criterion 3 by explicit design (D-39-07, 39-VALIDATION.md Manual-Only Verifications table). No build, script or static reading can show that a physical device opened a door offline"
  - test: "§0.6 — the deploy rule: deploy on a day with no night, make the first request yourself"
    expected: "The module-load map assertion in middleware.ts does not 500 the first request after the real deploy"
    why_human: "The assertion fires at first request in the deployed runtime, not at build time; this can only be observed on a live deploy (39-VALIDATION.md Manual-Only row 6)"
---

# Phase 39: The Door's Own Address Verification Report

**Phase Goal:** The door moves to its permanent address in a step of its own — never bundled
with the route collapse — and the move is proven on a device with the network off.

**Verified:** 2026-08-11T15:34:19Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths (Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | The door has one permanent address, reached without a redirect and without a network round trip | ✓ VERIFIED (code) / pending (wire) | `/door` exists as a real page (`src/app/(admin)/door/page.tsx:1-25`), bound in the same commit to the map's one `door.operate` entry (`src/lib/routes/capability-routes.ts:243-247`: `routes: ["/admin/scanner", "/door"]`). Neither page calls `redirect(`: `grep -c 'redirect(' "src/app/(admin)/door/page.tsx"` → `0`, same for `src/app/(admin)/admin/scanner/page.tsx` → `0`. `next.config.ts` has no `rewrites`: `grep -c rewrites next.config.ts` → `0`. `npm run build` exits `0` with both `ƒ /door` and `ƒ /admin/scanner` in the route table (measured directly). `npm run verify:routes` exits `0`, `pages found: 26`. The on-the-wire half — that neither request answers with a 3xx (D-39-02) — is exactly `39-DOOR-PASS.md §1.3`, still `Result: pending`, and cannot be closed by static reading (a redirect is a response, not a line of code) |
| 2 | A device that installed the door from the previous address still opens a working door after the move, launched from the home screen, network off | pending — human_needed by design | D-39-05 (`39-CONTEXT.md:54-64`) records, as a fact measured before this phase, that `public/manifest.json` has `start_url: "/"` and no `scope`, so this criterion is not about the old URL but about whether the radio-off launch reaches a working door at all. That is `39-DOOR-PASS.md §8.2-§8.4` and `§8.8` (cold, other address) — all `Result: pending`. The precondition it depends on, the warm-up (`§0.5`), is also `pending`. Nothing in the codebase can substitute for this; `39-VALIDATION.md`'s own sampling table marks it "no" for automated closure |
| 3 | The full door pass — dark room, network off, launch, scan, reconnect, sync — is executed on a device and written down, not asserted | pending — human_needed by design, correctly so | `39-DOOR-PASS.md` exists (526 lines), ten `## §` sections, 25 `Result:` lines, **all 25 read exactly `Result: pending`** (`grep -c '^Result:'` → 25, `grep -c '^Result: pending$'` → 25, zero divergence). This is the correct state per D-39-07: the phase's door pass absorbs Phase 38's deferred P1/P2/P3/P4/P5/P7 and UAT test 8, and closes both phases' behavioural evidence in one end-of-v1.5 sitting. `38-PROCEDURES.md` points at it (`grep -c '39-DOOR-PASS' 38-PROCEDURES.md` → 9), with one pointer line per absorbed procedure and P6 named as excluded (`38-PROCEDURES.md:328`) |

**Score:** 1/3 fully closed in code; 2/3 correctly deferred to the end-of-v1.5 sitting by an explicit owner decision (D-39-07), not a gap. Criterion 1's wire-level half (§1.3) is also deferred to the same sitting.

### D-39-06 (inherited item, phase-scoped alongside STAFF-04)

| Truth | Status | Evidence |
|---|--------|----------|
| The Check-in nav entry is filtered on `door.operate` — the same key the server refuses on — instead of role + approval | ✓ VERIFIED | `src/lib/rbac/roles.ts:89-96`: the Check-in `NAV_ITEMS` entry carries `roles: null, requireApproved: false, requireAuth: true, capability: CAP.DOOR_OPERATE`. The filter clause exists at `roles.ts:352-357`: `if (item.capability !== null) { const heldByRole = capabilities.includes(item.capability); … liveAssignmentCapabilities.includes(item.capability) }`. `grep -c 'roles: \["master", "organizer"\]' roles.ts` → `0` (the old role-list filter is gone) |
| Whether a `pending` organizer is actually *drawn* the entry | pending — human_needed | A rendered navigation is not a source fact (the project's own standing rule, restated in `39-03-PLAN.md`'s constraints and in `access-gating.md`'s gate *coerenza navigazione/permessi*). Closed only by `39-DOOR-PASS.md §1.5`, `Result: pending`. Additionally: this persona (`organizer`/`pending`) is **unrepresentable in production** since `supabase/migrations/20260808001000_role_implies_approved.sql:117`'s CHECK constraint — recorded honestly in `deferred-items.md` D2, so §1.5 can only be exercised in the seeded container, not against production |

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/app/(admin)/door/page.tsx` | The door's permanent address | ✓ VERIFIED | Exists, 25 lines, `export default async function DoorPage()` rendering `<DoorSurface />`, imported via `@/app/(admin)/admin/scanner/DoorSurface`. No `redirect(` call |
| `src/app/(admin)/admin/scanner/page.tsx` | The old address, kept permanently, real page | ✓ VERIFIED | Reduced to a thin page (measured 18 lines by the plan's own acceptance run), renders `<DoorSurface />`, no `redirect(` |
| `src/app/(admin)/admin/scanner/DoorSurface.tsx` | The shared guard, mounted twice | ✓ VERIFIED | Exists; the door's coarse predicate (`ctx.capabilities.has(CAP.DOOR_OPERATE) \|\| …liveAssignmentCapabilities…`) and `redirect("/dashboard")` refusal live here, confirmed unchanged across plan 39-03 by `git diff -- DoorSurface.tsx \| grep -cE '(capabilities\.has\(CAP\.DOOR_OPERATE\)\|redirect\("/dashboard"\)\|maySeeTheDoor)'` → `0` in that plan's own acceptance run |
| `src/lib/routes/capability-routes.ts` | One `door.operate` entry listing both addresses | ✓ VERIFIED | `[CAP.DOOR_OPERATE]: { routes: ["/admin/scanner", "/door"], assignmentOpenable: true, alsoGatesTables: true }` — confirmed at `capability-routes.ts:243-247`, one entry, `grep -c DOOR_OPERATE` unchanged before/after (no second predicate) |
| `src/lib/rbac/roles.ts` | `DOOR_HREF` verified against the map by a compile-time constraint | ✓ VERIFIED (mutation-tested) | `DOOR_HREF: Extract<DoorAddress, Route> = "/door"` where `DoorAddress = (typeof CAPABILITY_ROUTES)[typeof CAP.DOOR_OPERATE]["routes"][number]` (`roles.ts:80-83`). **Mutation test run directly by this verification**: removed `"/door"` from the map's `routes` array, ran `npx tsc --noEmit`, got `src/lib/rbac/roles.ts(83,7): error TS2322: Type '"/door"' is not assignable to type '"/admin/scanner"'.` File restored; `git status --short` clean afterward. This confirms the WR-01 finding from `39-REVIEW.md` (a runtime `throw` justified by a false premise) was genuinely repaired in commit `9f64e81` back to a real compile-time guarantee derived from the map, not hand-written |
| `src/lib/supabase/middleware.ts` | Module-load assertion over both addresses; `/door` in `protectedPrefixes` | ✓ VERIFIED | `DOOR_ADDRESSES` with a `for…of` asserting both the `resolveRoute` binding and `assignmentOpenable`, each throw naming the address. **Corrected 2026-08-11:** this row originally quoted it as a hand-written literal `["/admin/scanner", "/door"] as const`. Since commit `00fcdd4` it is **derived from the map** — `CAPABILITY_ROUTES[CAP.DOOR_OPERATE].routes` at `middleware.ts:195` — so the addresses are no longer declared in a second place. The verdict is unchanged and the mitigation is stronger than the one verified here. `protectedPrefixes` block: `"/dashboard", "/membership-card", "/attendance", "/admin", "/door"` — 5 entries, `/door` present |
| `39-DOOR-PASS.md` | The single dark-room procedure | ✓ VERIFIED (as a pending document, correctly) | 526 lines, 10 `## §` sections, 25/25 `Result: pending`, §9 maps every observation to a requirement, P6 excluded by name (`grep -c P6` → 9, never as a step), OQ3 deferred to `/gsd:discuss-phase` |
| `.claude/rules/checkin-offline.md` | Loads on the door's new address | ✓ VERIFIED | `paths:` frontmatter carries `"src/app/(admin)/door/**"` as its last entry; `npm run verify:persona` control G reports `26 righe verificate contro i frontmatter` and is green; the new gate *"l'indirizzo che si scalda e' quello che si usera'"* exists in the file |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| `src/app/(admin)/door/page.tsx` | `DoorSurface.tsx` | import of shared server component | ✓ WIRED | Confirmed by the build succeeding and both routes rendering the same guard |
| `src/lib/rbac/roles.ts` | `capability-routes.ts` | `Extract<DoorAddress, Route>` type derived from the map | ✓ WIRED (mutation-verified) | See mutation test above |
| `src/lib/supabase/middleware.ts` | `capability-routes.ts` | `resolveRoute` over `DOOR_ADDRESSES`, both arms asserted | ✓ WIRED | Both throws present, each naming its address (`middleware.ts:193-210`) |
| `src/lib/routes/organizer-redirects.ts` | `CAPABILITY_ROUTES[CAP.DOOR_OPERATE].routes` | fence 1 reads the map instead of matching `/scanner` | ✓ WIRED | `grep -c CAP.DOOR_OPERATE organizer-redirects.ts` ≥ 1, `grep -c 'includes("/scanner")'` → 0 (both confirmed in 39-02-SUMMARY's own acceptance run; not independently re-run here since this is a pre-existing, unmodified-since-review file). **Note:** `39-REVIEW.md` WR-02 found the equality-only rewrite gave up reachable coverage (a destination *under* `/admin/scanner` no longer trips fence 1, and the `from`-half is now dead by construction) — this finding was **not** among the two repaired in commit `9f64e81` and remains open |
| `src/components/layout/MobileNav.tsx` | `roles.ts` `getVisibleNavItems(role, status, capabilities, liveAssignmentCapabilities)` | required params, no defaults | ✓ WIRED | `grep -c 'liveAssignmentCapabilities?:' MobileNav.tsx` → `0` (required, not optional) |
| 13 `MobileNav` mount sites | `getAccessContext()` | capability sets threaded as serialisable arrays | ✓ WIRED | `grep -rl 'capabilities={\[' src/app \| wc -l` → 13 (confirmed) |

### Requirements Coverage

| Requirement | Source Plan(s) | Description | Status | Evidence |
|---|---|---|---|---|
| STAFF-04 | 39-01, 39-02, 39-03, 39-04 (all four) | "The door keeps its own address and is not moved in the same step as the rest, because a redirect needs a network the door may not have" | Executed in code; not yet closed | Two real addresses, no redirect, one map entry — verified above. Criteria 2 and 3 require the end-of-v1.5 sitting per D-39-07; `REQUIREMENTS.md:80` (checkbox unticked) already reflects this correctly as "Pending" |

No orphaned requirements: `grep -n "Phase 39" .planning/REQUIREMENTS.md` returns exactly the STAFF-04 row, and all four plans declare `requirements: [STAFF-04]`.

### Anti-Patterns Found

No `TBD`/`FIXME`/`XXX`/`TODO`/`HACK` debt markers were introduced by this phase's code changes. `39-REVIEW.md` (code review, `reviewed: 2026-08-11T15:26:28Z`) already performed a deep pass and found **0 Critical, 7 Warning, 4 Info**. Two of the seven warnings were repaired in commit `9f64e81` (confirmed above): WR-01 (the compile-time guard) and WR-05 (the missing "rejected organizer" row in the outcomes docblock, now present at `roles.ts:257-269`). The remaining five warnings and four info items are **still open** on this tree and are listed here rather than re-derived, since this verification's own reading confirms they are unaddressed:

| ID | File:line | What | Severity | Impact |
|---|---|---|---|---|
| WR-02 | `src/lib/routes/organizer-redirects.ts:145-175` | Redirect fence 1 narrowed to equality; a destination *under* a door address (e.g. a future `/admin/scanner/x`) no longer trips it, and the `from`-half is dead by construction | ⚠️ Warning | Latent — no such row exists today; becomes live only if a sub-address under `/admin/scanner` is ever bound |
| WR-03 | `middleware.ts:223-226`, `door/page.tsx:17-21` | `isUnderWorkTree` tests only the `admin` first segment; anything added under `/door/*` with no map entry falls through with **no bounce**, not even a refusal | ⚠️ Warning | Latent — `/door` itself is bound and covered; a future unbound child route would silently admit |
| WR-04 | `middleware.ts:188-211` | The module-load door assertion now covers two addresses with a hand-copied list; a throw here 500s the payment webhook, four crons and the scan path | ⚠️ Warning | Pre-existing risk class, widened in blast radius; mitigation is procedural only (§0.6) |
| WR-06 | `roles.ts:56`, `MobileNav.tsx:23-30` | The cold-cache hazard (a phone warmed at the old address has no `/door` cache entry) is mitigated only by a runbook line in `checkin-offline.md`, not measured or code-mitigated | ⚠️ Warning | This is exactly what `39-DOOR-PASS.md §0.5` and `§8.8` exist to observe — still `pending` |
| WR-07 | 7 files listed in `39-REVIEW.md` | Stale comments contradicting the line beneath them (e.g. `organizer-redirects.ts:10-13` and `staff-tabs.ts:59-62` still say the door has one address) | ⚠️ Warning | Documentation drift, not behavioural |
| IN-01 — IN-04 | various | Prefix-test inconsistency, ternary duplication, double-spread, unnecessary `async` | ℹ️ Info | Cosmetic |

None of these block the three success criteria: they are guard-strength and documentation-hygiene findings about *future* changes, not about whether the door's move today satisfies criterion 1.

### Human Verification Required

All items below are the correct, by-design remainder of this phase per `39-CONTEXT.md` D-39-07 and `39-VALIDATION.md`'s Manual-Only Verifications table — not gaps in the implementation. `39-DOOR-PASS.md` exists, is honest, and every one of its 25 observations reads `Result: pending`.

1. **The wire-level proof of criterion 1** (`39-DOOR-PASS.md §1.1–§1.5`)
   **Test:** Open `/door` and `/admin/scanner` online; read DevTools → Network for both status codes; read the rendered Check-in `href`; sign in as a `pending` organizer and check whether Check-in is drawn.
   **Expected:** Both addresses render the door, no 3xx status on either, `href` reads `/door`, and the `pending` organizer sees Check-in.
   **Why human:** A redirect is a response on the wire, not a line of code; a rendered navigation is not a source fact.

2. **Criterion 2 — offline reachability after the move** (`39-DOOR-PASS.md §0.5, §8.2–§8.4, §8.8`)
   **Test:** Warm both addresses online on the staff phone; go offline; launch from the home screen; reach the door at the warmed address; then repeat cold at the other address on the second phone.
   **Expected:** The warmed address renders offline; the cold address's outcome is the finding, whatever it is.
   **Why human:** No build/script/static reading can hold a phone. This is explicitly the point of `39-VALIDATION.md`'s Manual-Only table.

3. **Criterion 3 — the full door pass** (`39-DOOR-PASS.md §2–§8`)
   **Test:** Execute all ten sections of `39-DOOR-PASS.md` end to end, in a dark room, radio off, per the document's own instructions.
   **Expected:** Every observation recorded with a wall-clock time; §9 filled in.
   **Why human:** Behavioural, device-dependent, and explicitly deferred by owner decision D-39-07 to the end-of-v1.5 sitting shared with Phase 38's remaining procedures.

4. **§0.6 — the deploy rule**
   **Test:** Deploy on a day with no night; make the first request to a covered route yourself.
   **Expected:** No 500 from the module-load map assertion.
   **Why human:** Fires at first request in the deployed runtime, not at build time.

### Gaps Summary

No implementation gap was found. Every artifact the four plans committed to exists, is substantive, and is wired; the build, `verify:routes`, and `verify:persona` are all green on this tree; the one code-review finding that materially affected the strength of a security-relevant guard (WR-01, the compile-time door-address guarantee) was independently mutation-tested here and confirmed genuinely repaired, not just claimed repaired. STAFF-04's criteria 2 and 3 — and the wire-level half of criterion 1, and D-39-06's drawn-entry half — are correctly left open pending a physical device sitting, exactly as `39-CONTEXT.md`'s D-39-07 and `39-VALIDATION.md`'s sampling contract both say they must be. `39-DOOR-PASS.md` is the evidence that this is tracked rather than hand-waved: every one of its 25 Result fields reads `pending`, none is ticked.

Five open code-review warnings (WR-02 through WR-04, WR-06, WR-07) and four info items remain unaddressed from `39-REVIEW.md`. They describe reduced guard strength against *future* edits and stale prose, not a failure of any of the three success criteria today. They are reported here for visibility, not as blocking gaps.

---

*Verified: 2026-08-11T15:34:19Z*
*Verifier: Claude (gsd-verifier)*
