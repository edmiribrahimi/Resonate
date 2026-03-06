---
gsd_state_version: 1.0
milestone: v1.2
milestone_name: "SumUp Full Platform Integration"
status: in_progress
stopped_at: Completed 18-01-PLAN.md
last_updated: "2026-03-06T17:23:00Z"
progress:
  total_phases: 6
  completed_phases: 5
  total_plans: 9
  completed_plans: 7
---

# State: Resonate

## Project Reference

**Core Value:** Members can discover events, confirm attendance, and buy tickets within a trusted, curated community -- the gating mechanism (referral + approval) is what makes the community valuable.

**Stack:** Next.js 16 + Supabase + Tailwind CSS v4 + PWA (Vercel hosting)

**Current Focus:** v1.2 milestone -- SumUp full platform integration (SDK, admin finance, refunds, payouts, APMs, card tokenization)

## Current Position

**Phase:** 18 of 18 -- Card Tokenization (IN PROGRESS)
**Plan:** 1/3
**Status:** Plan 01 complete. Database migration (sumup_customer_id on profiles), 5 SumUp SDK wrapper functions for customer CRUD, tokenization checkout, saved card payment, and card management.

```
[Phase Progress]  #######_____________  1/3 plans in phase 18

[Overall]         ###############_____  7/9 plans complete (across all phases)
```

## Phase Dependencies

```
Phase 13 (SDK) ─┬─> Phase 14 (Dashboard) ──> Phase 15 (Refunds)
                ├─> Phase 16 (Payouts)
                ├─> Phase 17 (APMs)
                └─> Phase 18 (Tokenization) [also depends on Phase 17]
```

Phases 14, 16, 17 can execute in parallel after Phase 13.

## Decisions

1. **[Phase 13]** Singleton SDK pattern -- `@sumup/sdk` instantiated once at module level, exported for Phase 14-18 reuse
2. **[Phase 13]** Type assertions for backward compat -- SDK types are conservative (optional fields), assertions preserve exact call site contracts
3. **[Phase 13]** Export raw SDK client -- `export { sumup }` enables direct SDK access in future phases
4. **[Phase 14]** AdminNav optional role prop -- backward compatible, Finance tab shown only for master
5. **[Phase 14]** All admin pages pass role to AdminNav -- ensures Finance tab visible from any admin page for master users
6. **[Phase 14]** Server-side cursor extraction -- listTransactions parses SumUp links[] array and returns simple nextCursor/nextCursorParam to client
7. **[Phase 14]** CursorEntry interface with { cursor, param } for back-navigation fidelity instead of string[]
8. **[Phase 14]** Initial useEffect kept with [] deps; fetchTransactions callback only used by pagination/filter buttons
9. **[Phase 14]** Detail cache cleared on filter apply to avoid stale data across different result sets
10. **[Phase 17]** Optional redirectUrl in createCheckout -- backward compatible, undefined harmless in SDK call
11. **[Phase 17]** Google Pay config conditional on env var -- avoids errors before dashboard setup
12. **[Phase 17]** Callback page polls 5x at 2s intervals for PENDING to handle webhook race condition
13. **[Phase 16]** FinanceSubNav uses exact match for Transactions tab, startsWith for Payouts to prevent both being active
14. **[Phase 16]** Initial useEffect with [] deps pattern for PayoutList (same as TransactionList) for predictable mount behavior
15. **[Phase 16]** Default 30-day date range calculated inline at component level, no separate utility
16. **[Phase 15]** Refund button inside TransactionDetailInline -- detail already loaded, fee_amount available for dialog
17. **[Phase 15]** StatusBadge enhanced with refundedAmount prop for PARTIALLY REFUNDED display
18. **[Phase 15]** handleRefundComplete invalidates detailCache instead of optimistic detail update for fresh SumUp data
19. **[Phase 15]** Single commit for both tasks since RefundDialog import makes them interdependent
20. **[Phase 18]** UUID Supabase used as SumUp customer_id for direct 1:1 mapping -- no separate ID table needed
21. **[Phase 18]** sumup_customer_id nullable TEXT column with partial index (lazy creation pattern)
22. **[Phase 18]** getOrCreateCustomer handles 404 (not found) and 409 (conflict/race) for idempotent customer creation
23. **[Phase 18]** processWithSavedCard returns unified shape for both CheckoutSuccess and CheckoutAccepted (3DS redirect)

## Performance Metrics

| Metric | Value |
|--------|-------|
| Plans completed | 7 |
| Plans failed | 0 |
| Requirements done | 23/26 |
| Phases complete | 5/6 |

## Session Continuity

**Last session:** 2026-03-06T17:23:00Z
**Stopped at:** Completed 18-01-PLAN.md
**What happened:** Executed Phase 18 Plan 01 -- Card Tokenization Foundation. Created database migration adding sumup_customer_id TEXT column to profiles with partial index. Updated Profile TypeScript type. Added 5 new SumUp SDK wrapper functions: getOrCreateCustomer (idempotent with 404/409 handling), createTokenizationCheckout (SETUP_RECURRING_PAYMENT purpose), processWithSavedCard (server-side token payment with 3DS support), listSavedCards, deactivateCard. TypeScript and build pass clean. Requirement TOK-01 satisfied.
**Next step:** Execute Phase 18 Plan 02 (Save Card UI) -- checkout flow with tokenization support and card management.

---
*State initialized: 2026-03-06*
*Last updated: 2026-03-06T17:23:00Z*
