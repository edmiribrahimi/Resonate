---
phase: 46-silent-failures-on-the-money-path
verified: 2026-08-14T20:41:28Z
status: human_needed
lab_sitting_4: >
  2026-08-19, `.planning/v1.5-LAB-SITTING-4.md` — Le sei procedure ESEGUITE in laboratorio il 2026-08-19, rovesciando il rifiuto del 2026-08-14 su istruzione del proprietario. Quattro osservate (1, 3, 4, 6), due a meta' (2, 5).
score: 12/12 code-level must-haves verified; 6/6 manual procedures pending
overrides_applied: 0
gaps: []
deferred: []
human_verification:
  - test: "Purchase pre-check permissive direction, fault-injected"
    expected: "One safe log line per fault (`purchaseTicket.tier_list_unreadable` / `.sold_count_unreadable` / `.discount_usage_unreadable`), containing only code= and message=, no row content — and the purchase is NOT refused by the pre-check (D-46-05 is the decided behaviour)"
    why_human: "Needs a running app against a real Supabase project with an induced transient read error; forbidden in a worktree pointed at .env.local and forbidden in production (46-03-SUMMARY.md)"
  - test: "Organizer menu-closing refusal, two roles + induced write failure"
    expected: "The account without staff.manage sees 'This account may not set the closing time…'; the account with staff.manage sees 'Saving the closing time failed…(code)' on an induced write failure; the Clear path shows the stored value, never an emptied field, on the same failure"
    why_human: "Needs two accounts and an environment that is neither this worktree nor production (46-04-SUMMARY.md)"
  - test: "Guest drink-receipt custody read, corrupted localStorage"
    expected: "'We could not read the drinks saved on this device…' appears, announced via role=\"alert\", not a blank screen and not the empty-wallet screen"
    why_human: "Needs a running app, DevTools storage corruption and a real purchased token (46-05-SUMMARY.md, procedure a)"
  - test: "Guest token-status poll, endpoint blocked or 500"
    expected: "TOKENS_ARRIVING immediately, then at the tenth tick (~30s) TOKENS_UNREACHABLE or TOKENS_REFUSED depending on the induced fault, and the poll genuinely stops (Network panel confirms no further requests)"
    why_human: "Needs a running app and a blocked/failing network endpoint (46-05-SUMMARY.md, procedure b)"
  - test: "Public event page, induced sold-count read failure"
    expected: "No remaining figure printed anywhere; the PLACES_UNKNOWN sentence appears beside both purchase-control sites; the purchase control stays live and pressable; no venue address appears that was not already visible"
    why_human: "Needs a running app with the service-role key or DB host made unreachable for one call (46-06-SUMMARY.md)"
  - test: "Refund cron, induced cleanup-delete failure then a clean run"
    expected: "First invocation: non-2xx status, run marked failed in the hosting dashboard, body shows deleteRequested > deleted; second invocation with the fault cleared: 200, outcome cron_refund_ok, deleted === deleteRequested"
    why_human: "Observed in the hosting dashboard, outside the repository, by whoever watches deployments (46-07-SUMMARY.md)"
---

# Phase 46: Silent Failures on the Money Path — Verification Report

**Phase Goal:** A failure on a path that carries money produces an effect somebody can see. There is no error tracking, so logging the error is not sufficient.
**Narrowed perimeter (authoritative):** `46-CONTEXT.md` `<domain>` — the members-area-dependent findings (`DI-41.2-01/-07/-09…-12`, `DEF-41.2-A`) are out of scope by D-46-11, and roadmap success criteria 3 and the "five RSVP refusals" half of criterion 2 are **declared, not silently missed**.
**Verified:** 2026-08-14T20:41:28Z
**Status:** human_needed
**Re-verification:** No — initial verification.

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | OBS-03: a failed read is never rendered as a legitimate value — `GuestTokenDisplay.tsx` custody | ✓ VERIFIED | `storeGuestOrder` returns `GuestCustodyWriteResult` (`GuestTokenDisplay.tsx:209-227`); `getGuestOrderIds` returns `ReadResult<string[], …>`, no `return []` on catch (`:244-257`); early-return predicate distinguishes *none* from *unreadable* (`:1011-1018`) |
| 2 | OBS-03: the failed token fetch/poll never reports the same value as "on its way" | ✓ VERIFIED | Four-member `Record<GuestTokenFetchState, string>` replaces `"unknown"` (`GuestTokenDisplay.tsx:295-326`); bound sets terminal state before `clearInterval` (`:938-941`); `orderStatus: "unknown"` count is 0 in the tree |
| 3 | OBS-03: the two capacity reads and the discount-usage read in `purchaseTicket` distinguish *counted zero* from *could not count* | ✓ VERIFIED | `PurchasePrecheckUnreadable` total `Record` (`admin/events/actions.ts:1232-1246`); tier-list read `:1349-1358`; sold-count read `:1366-1379`; discount usage-limit read `:1510-1529`, all destructure `error` and log via `logPurchasePrecheckUnreadable` |
| 4 | OBS-03: the refund cron's delete count is a measurement, never the intended length | ✓ VERIFIED | `.delete({ count: "exact" })` at `route.ts:317`; `deletedCount = count ?? 0` at `:325` — no coalesce to `tokenIdsToDelete.length` anywhere in the tree |
| 5 | OBS-03: the public event page's three counts never coalesce a failed read to zero | ✓ VERIFIED | `soldError \|\| count === null` guards at `page.tsx:629`, `:823`; `spotsUnknown` on the RSVP path `:672-704`; `count ?? 0` pattern removed (confirmed by diff, `46-06-SUMMARY.md`'s "every line removed" list) |
| 6 | OBS-04: `updateMenuClosesAt`'s three causes travel as a returned value, never a thrown message | ✓ VERIFIED | `grep -c 'throw new Error'` inside the function body → 0 (`menu/actions.ts:139-184`); `MenuCloseResult` with `success`/`error`/`refusal` (`:100-104`); total `Record<MenuCloseRefusal, string>` (`:87-93`) |
| 7 | OBS-04: a refusal category added without its sentence fails the build (totality is proved, not assumed) | ✓ VERIFIED | 46-02's throwaway probe and 46-04's/46-07's in-file asserted mutations each reproduced `Type error: Property '…' is missing in type … but required in type 'Record<…>'`, confirmed applied by grep before the build was read, then reverted (`46-02-SUMMARY.md`, `46-04-SUMMARY.md`, `46-07-SUMMARY.md`); no probe file survives in the tree or in `git log -S` on any committed blob |
| 8 | OBS-04: `updateMenuClosesAt`'s "you may not" stays distinct from "it did not save" | ✓ VERIFIED | Three module-private constants, three distinct approved sentences (`menu/actions.ts:68-93`); caller renders `refusalSentence` in a `role="alert"` region (`PartyDrinkMenu.tsx:163, 322-328`) |
| 9 | OBS-02: an organizer, a guest and an anonymous visitor each get an on-screen effect, not a log line, for their respective in-perimeter faults | ✓ VERIFIED (code) / pending (person) | Sentences render in place at all five surfaces (menu-closing, custody, token fetch/poll, public event page, cron report). The refund cron additionally goes non-2xx on failure — the one free observable effect (D-46-06, extended by the owner's answer A) |
| 10 | OBS-02 is honestly NOT claimed where D-46-05 keeps a pre-check permissive | ✓ VERIFIED | `46-03-SUMMARY.md` states in its own words: "This plan closes OBS-03. This plan does NOT close OBS-02 for these three sites" — matches the code: the three pre-check reads produce a safe log line and no refusal (`admin/events/actions.ts:1305-1334`) |
| 11 | Every shipped sentence matches `46-COPY.md` verbatim, one wording per cause | ✓ VERIFIED | All 16 approved sentences found exactly once each across the tree by exact string grep (see command block below); no reworded, shortened, or run-time-composed variant found |
| 12 | The monotone guards hold: no migration, no webhook, no package change | ✓ VERIFIED | `git diff --stat 4f01ed2..537b1cd -- supabase/migrations/` → empty; `-- src/app/api/webhooks/` → empty; `-- package.json package-lock.json` → empty; exactly the 8 files named across the seven plans are touched |

**Score:** 12/12 code-level truths verified. Roadmap criteria 3 and criterion 2's RSVP half are confirmed **declared as unmet** (see Accepted Risks), not silently missed — they are not counted against this score, per the narrowed perimeter.

**The verbatim-sentence check, run directly:**

```
$ grep -rlF "<each of the 16 approved sentences>" src/ | wc -l   → 1, for every one of the 16
```

### Required Artifacts

| Artifact | Expected | Status | Details |
|---|---|---|---|
| `src/lib/failure/money-path.ts` | The shared construction: `SafeError`, `logMoneyPathFailure`, `ReadResult` | ✓ VERIFIED | Exactly 3 exports (`:105`, `:123`, `:140`); `SafeError` has no `details` field (`:105-108`); imports nothing |
| `src/app/(admin)/admin/events/actions.ts` — `purchaseTicket` | Three reads say which failure they had, direction unchanged | ✓ VERIFIED | `:1232-1529`; permissive docblock records D-46-05, D-46-07 residual (`:1305-1334`) |
| `src/app/(public)/events/[slug]/menu/actions.ts` — `updateMenuClosesAt` | Three causes as returned categories | ✓ VERIFIED | `:68-184`; 0 throws in function body |
| `src/app/(public)/events/[slug]/menu/PartyDrinkMenu.tsx` — `MenuCloseControl` | Renders the returned category, transport-rejection caught | ✓ VERIFIED | `refusalSentence` state `:163`; `role="alert"` region `:322-328`; `updateMenuClosesAt(party.id` called twice, both wrapped |
| `src/app/(public)/events/[slug]/menu/GuestTokenDisplay.tsx` | Custody + fetch/poll unions, third-state early return, preventive notice | ✓ VERIFIED | 1078 lines; unions `:152-173`, `:295-326`; early return `:1011-1018`; `RECEIPT_KEEP_TAB_OPEN` rendered `:1049-1051`, suppressed while a failure sentence shows |
| `src/app/(public)/events/[slug]/menu/GuestDrinkMenu.tsx` | `localStorage.removeItem` still inside `.then`, comment-only diff | ✓ VERIFIED | `:162`, `.then(() => localStorage.removeItem(key)).catch(() => {})`; comment block `:139-159` documents why it must stay there |
| `src/app/(public)/events/[slug]/page.tsx` | Three counts carry a third state; `PLACES_UNKNOWN` at both control sites; reveal guards intact | ✓ VERIFIED | `soldKnown`/`spotsUnknown` throughout `:129-828`; sentence at `:1196`, `:1531`; reveal ternary 3 arms + null tail `:1366-1408`; `dynamic = "force-dynamic"` present (`:284`), `generateMetadata` absent (0 occurrences) |
| `src/app/api/cron/refund-expired-tokens/route.ts` | Truthful delete count, non-2xx on any failure incl. `refundErrors > 0` | ✓ VERIFIED | `:47-141` construction; `.delete({ count: "exact" })` `:317`; outcome ordering (money before cleanup) `:332-339` |

All eight artifacts: exists ✓, substantive ✓ (no stub bodies, no placeholder text), wired ✓ (callers read and render the returned category — traced per surface above).

### Key Link Verification

| From | To | Via | Status | Details |
|---|---|---|---|---|
| `updateMenuClosesAt` | `MenuCloseControl` | returned `MenuCloseResult` | WIRED | Caller reads `result.refusal`/`result.error`, renders in `role="alert"` (`PartyDrinkMenu.tsx:163-246, 322-328`) |
| `getGuestOrderIds` / `storeGuestOrder` | `GuestTokenDisplay`'s early return + banner | `ReadResult` / `GuestCustodyWriteResult` | WIRED | `custodyFailure` state set on `!written.ok` / `!saved.ok` (`:809, 830, 858`), drawn at `:997-1051` |
| `fetchTokensForOrders` + poll | `GuestTokenDisplay`'s failure sentence | `GuestTokenFetchState` | WIRED | `fetchState` set on every discard site (`:779, 789`) and at the poll bound (`:939`), drawn via `GUEST_TOKEN_FETCH_MESSAGE` |
| the three count reads | `page.tsx`'s `PLACES_UNKNOWN` region | `soldKnown` / `spotsUnknown` | WIRED | `{eventTiers.some((t) => !t.soldKnown) && …}` (`:1190-1196`); `{(party.spotsUnknown \|\| party.tiers.some(…)) && …}` (`:1525-1531`) — control itself untouched (`grep -c '<TierSelection'` → 2, unchanged) |
| the delete + refund loop | the cron's HTTP status | `CronRefundOutcome` → `CRON_REFUND_HTTP` | WIRED | `respond(outcome, counts)` (`:341-346`) reads status from the total map; a fifth undeclared outcome fails the build (proved by mutation, reverted) |
| `reserve_ticket` (DB) | `purchaseTicket`'s permissive pre-check | documented, not code-linked | CONFIRMED BY DESIGN | `reserve_ticket` locks `FOR UPDATE`, counts and `RAISE EXCEPTION 'Tier sold out'` (`20260310100000_discount_codes.sql:130-147`), validates `max_uses` under lock (`:150-169`) — read directly, matches the docblock's claim exactly |

### Data-Flow Trace (Level 4)

Not separately run as a distinct trace: every artifact above is a Server Action / Server Component reading directly from Supabase inside the same function that renders or returns the refusal — there is no intermediate cache or prop-drilled empty default hiding a hollow wire. The one prop-flow worth checking explicitly — `TierSelection`'s `sold`/`available` props — is confirmed **byte-identical in type**, with `soldKnown` carried as a sibling field rather than folded into those props (`46-06-SUMMARY.md`, `page.tsx:130, 148`), so the out-of-perimeter consumer needs no change and cannot silently swallow the third state.

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|---|---|---|---|
| Build is green (also the typecheck gate) | `npm run build` | Exit 0, `/events/[slug]` and `/events/[slug]/menu` render `ƒ` (dynamic) | ✓ PASS |
| Dialog gate holds (no toast under a Dialog-rendering file) | `node scripts/verify-dialogs.mjs` | `DIALOGS_OK — all three checks passed` | ✓ PASS |
| `useToast` absent from the two files that render `Dialog` | `grep -c useToast GuestTokenDisplay.tsx PartyDrinkMenu.tsx` | `0` / `0` | ✓ PASS |
| Monotone guards | `git diff --stat 4f01ed2..537b1cd -- supabase/migrations/ src/app/api/webhooks/ package.json package-lock.json` | all empty | ✓ PASS |
| No debt markers in phase-touched files | `grep -nE "TBD\|FIXME\|XXX\|TODO\|HACK\|PLACEHOLDER"` on all 8 touched files | 0 matches | ✓ PASS |
| No whole-error-object logging introduced by this phase | `git diff` on the 8 files for added/removed `console.error` lines, cross-checked against `logMoneyPathFailure`/`toSafeError`/`logUnreadableCount` call sites | Pre-existing `console.error(insertError)` sites (`admin/events/actions.ts:1586,1876`; `menu/actions.ts:334`; `page.tsx:480,558,779,963`) fall **outside every diff hunk** — confirmed untouched, not phase-introduced | ✓ PASS |

Runtime-only behaviors (fault injection against a real database, an induced network failure, two live accounts) cannot be spot-checked without a running app and are correctly routed to human verification below — this matches `46-VALIDATION.md`'s own "Two gaps that nothing in this repository can close."

### Probe Execution

No `scripts/*/tests/probe-*.sh` exist for this phase and none is referenced by any plan or SUMMARY. The phase's mutation proofs (OBS-04's totality property) were run as **in-file asserted mutations**, not standalone probe scripts, and are recorded above under Observable Truth #7 with their exact `Type error` output quoted in `46-02-SUMMARY.md`, `46-04-SUMMARY.md` and `46-07-SUMMARY.md`. Each states the mutation was confirmed applied by grep **before** the build was read, satisfying `ai-engineering.md`'s *prova per mutazione* gate.

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|---|---|---|---|---|
| OBS-02 | 46-01 (declared), 46-04/-05/-06/-07 (implemented) | An effect a person can see, not a log line | ✓ SATISFIED (code) / manual verification pending | Sentences rendered in place at 5 surfaces; cron goes non-2xx on failure. `REQUIREMENTS.md:264` traceability row correctly lists status "Pending" — matches: no manual procedure has been run yet |
| OBS-03 | 46-01 (declared), 46-02/-03/-05/-06 (implemented) | A failed read is never rendered as a legitimate value | ✓ SATISFIED | All five named sites (`DI-41.2-03`, `DI-41.2-08`, `F-46-01`, `DI-TODO-A`, `DI-TODO-B`) verified in code above. `REQUIREMENTS.md:265` |
| OBS-04 | 46-01 (declared), 46-02/-04 (implemented) | Distinguishable causes, returned value, never thrown | ✓ SATISFIED | `DI-41.2-06`, `-06b` both verified; totality proved by mutation. `REQUIREMENTS.md:266` |
| OBS-05 | Not created (D-46-11) | Would have covered `DI-41.2-09` | N/A — correctly absent | `grep -c 'OBS-05' REQUIREMENTS.md` → 0 |

No orphaned requirements found: `.planning/REQUIREMENTS.md`'s `Phase 46` rows are exactly OBS-02, OBS-03, OBS-04, matching what the plans declare.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|---|---|---|---|---|
| `.planning/todos/pending/unchecked-count-reads-decide-money-paths.md` | frontmatter `resolves_phase:` | Folded todo (per `46-CONTEXT.md` "folded whole, both sites") left in `pending/` with `resolves_phase:` empty instead of moved to `.planning/todos/completed/` with `resolves_phase: 46` | ℹ️ Info | Paperwork only — the cron site is fully resolved by 46-07 (observable failure, non-2xx), and the discount-usage site is resolved by 46-03 **with a deliberate reversal of the todo's own proposed remedy** (the todo asked for a refusal; D-46-05/D-46-08 keep it permissive because `reserve_ticket` fails closed). The reversal is documented in `46-CONTEXT.md` and `46-03-SUMMARY.md`, so no reader is misled by the code — only by the todo tracker still listing this as open work with the old remedy implied. Not a code gap; recommend moving the file at phase close |

No TBD/FIXME/XXX/TODO/HACK/PLACEHOLDER markers found in any of the eight files this phase touched. No empty `catch` blocks were introduced (the one pre-existing empty `.catch(() => {})` in `GuestDrinkMenu.tsx:163` is out-of-perimeter by D-46-11 and is explicitly annotated as deliberate, not discovered). No whole-error-object or `error.details` logging was introduced.

### Accepted Risks — confirmed declared, not raised as gaps

| Risk | Declared where | Confirmation |
|---|---|---|
| D-46-05 — `purchaseTicket`'s pre-check stays permissive on a failed read | `46-CONTEXT.md:84-91`, `admin/events/actions.ts:1305-1334` | `reserve_ticket` read directly: locks `FOR UPDATE` (`:130-133`), counts and raises `Tier sold out` (`:140-147`), validates `max_uses` under lock (`:150-169`) — the docblock's claim matches the migration byte-for-byte |
| D-46-07 — a guest can pay and receive no ticket (last discount use, double submit); left silent | `46-CONTEXT.md:96-102`, `admin/events/actions.ts:1330-1334`, `page.tsx:326-330` | Confirmed still open and still silent; the deferred seat-reservation phase is its stated fix, not this one |
| D-46-10c — no bar-side lookup shipped; guest-facing half only | `46-CONTEXT.md:127-134`, `GuestTokenDisplay.tsx:71-74` | Confirmed: no sentence in `46-COPY.md` §2 or in the rendered code sends a guest to "the bar" or names a channel |
| 46-06's free-RSVP gap — figure disappears, no sentence, on a free-RSVP night with an unreadable count | `page.tsx` (`46-06-SUMMARY.md`, "## Known gap, accepted") | Confirmed: `spotsUnknown` suppresses the invented number on both roads to `null`, but `EVENT_PAGE_REFUSAL`'s one sentence is drawn only at the paid-tier sites (`:1196, :1531`), never at a bare RSVP control — matches the owner's recorded decision |
| Criterion 3 and criterion 2's "five RSVP refusals" — not met by this phase | `ROADMAP.md:1088`, `46-CONTEXT.md:51-55` | Confirmed declared in both the roadmap and the context before verification, not discovered here; their code (`DI-41.2-09`, `DI-41.2-20`) is under review for deletion (D-46-11) and untouched by this phase's diff |

### Human Verification Required

All six items are listed in the frontmatter `human_verification` block above, each already written out as a step-by-step procedure with `Result: pending` in its owning plan's SUMMARY (`46-03`, `46-04`, `46-05` ×2, `46-06`, `46-07`). None can be run from this verification pass: they require either a running app against a real (non-production, non-`.env.local`-worktree) Supabase project with an induced fault, two live accounts, or observation in the hosting dashboard — none of which this read-only verification pass may touch (per `<verification_environment>` and `D-41.2-04`).

### Gaps Summary

No code-level gap was found. Every in-perimeter finding (`DI-41.2-02/-03/-04/-06/-06b/-08`, `F-46-01`, `DI-TODO-A`, `DI-TODO-B`) has a total-`Record` construction, a rendered sentence verbatim from the approved `46-COPY.md`, and — where D-46-05/D-46-07/D-46-10c apply — an explicit, written acceptance of the residual risk rather than a silent one. The monotone guards (`meta-gates.md`) are untouched by diff. The two roadmap success criteria that cannot be met by this phase were declared unmet before this verification ran, in both `ROADMAP.md` and `46-CONTEXT.md`, and are correctly not counted against the phase.

The phase's own validation contract (`46-VALIDATION.md`) already anticipated this outcome: it marks six behaviors as "manual, needs a running app" and states plainly that "nothing here is verified because tests pass." `status: human_needed` reflects that contract being honoured, not a shortfall — every mechanical check in `46-VALIDATION.md`'s Requirement → Proof Map that could run without a live environment has been re-run independently in this verification pass and passed.

---

*Verified: 2026-08-14T20:41:28Z*
*Verifier: Claude (gsd-verifier)*
