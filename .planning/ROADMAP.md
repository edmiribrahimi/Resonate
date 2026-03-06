# Roadmap: Resonate

## Completed Milestones

- [x] **v1.0** -- Trust-gated music events community: RBAC, referral/approval, SumUp ticketing, event media, branded emails (7 phases, 22 plans, 45 requirements) -- [archive](.planning/milestones/v1.0-ROADMAP.md)
- [x] **v1.1** -- SumUp embedded checkout + drink ordering system: embedded payments, drink menu CRUD, token redemption with anti-fraud, public QR menu for guests (5 phases, 9 plans, 18 requirements) -- [archive](.planning/milestones/v1.1-ROADMAP.md)

## Current Milestone: v1.2 -- SumUp API Deep Integration

**Goal:** Admin finance dashboard with real-time SumUp transaction data, in-app refund management, and payout reports. Transforms SumUp from "payment pipe" to "financial visibility layer."

**Requirements:** 17 (3 API + 6 Finance + 5 Refund + 3 Payout)

### Phase 13: SumUp API Client Enhancement
**Goal:** Refactor SumUp client to support multi-version API calls and define TypeScript types for all new endpoints.
**Requirements:** API-01, API-02, API-03
**Success criteria:**
- `src/lib/sumup.ts` uses versionless base URL with per-call version prefixes
- Functions: `listTransactions()`, `getTransaction()`, `refundTransaction()` (existing), `listPayouts()`
- TypeScript interfaces for all API response shapes
- `.env.local.example` updated with `SUMUP_API_KEY` and `SUMUP_MERCHANT_CODE`

### Phase 14: Admin Finance Dashboard
**Goal:** New admin section with transaction list, cursor-based pagination, filters, and transaction detail view.
**Requirements:** FIN-01, FIN-02, FIN-03, FIN-04, FIN-05, FIN-06
**Depends on:** Phase 13
**Success criteria:**
- "Finance" tab in AdminNav, `/admin/finance` route
- Transaction list with amount, date, status, description columns
- Prev/next pagination via SumUp cursor refs
- Date range + status filters
- Click-to-expand transaction detail (fee, card type, last 4 digits)
- ECOM filter applied by default

### Phase 15: Refund Management
**Goal:** Admin can issue full or partial refunds from the transaction detail view with confirmation flow.
**Requirements:** REF-01, REF-02, REF-03, REF-04, REF-05
**Depends on:** Phase 14
**Success criteria:**
- "Refund" button on successful, non-refunded transactions
- Confirmation dialog with full/partial toggle and custom amount input
- Warning about non-refundable SumUp fees
- Server action calls SumUp refund API
- Optimistic UI update after successful refund

### Phase 16: Payout Reports
**Goal:** Admin can view SumUp payout (bank transfer) history with date range filtering.
**Requirements:** PAY-01, PAY-02, PAY-03
**Depends on:** Phase 13
**Success criteria:**
- `/admin/finance/payouts` sub-page (tab or link from finance dashboard)
- Payout list with amount, date, status, type columns
- Date range picker for filtering
- Handles payout types: PAYOUT, CHARGE_BACK_DEDUCTION, REFUND_DEDUCTION

---
*Roadmap updated: 2026-03-06*
