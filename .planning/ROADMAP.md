# Roadmap: Resonate

## Completed Milestones

- [x] **v1.0** -- Trust-gated music events community: RBAC, referral/approval, SumUp ticketing, event media, branded emails (7 phases, 22 plans, 45 requirements) -- [archive](.planning/milestones/v1.0-ROADMAP.md)
- [x] **v1.1** -- SumUp embedded checkout + drink ordering system: embedded payments, drink menu CRUD, token redemption with anti-fraud, public QR menu for guests (5 phases, 9 plans, 18 requirements) -- [archive](.planning/milestones/v1.1-ROADMAP.md)

## Current Milestone: v1.2 -- SumUp API Deep Integration

**Goal:** Full SumUp platform integration: official SDK, admin finance dashboard, refunds, payouts, alternative payment methods (Satispay, MyBank, Apple/Google Pay), and card tokenization for returning customers.

**Requirements:** 26 (3 SDK + 6 Finance + 5 Refund + 3 Payout + 5 APM + 4 Tokenization)

### Phase 13: SumUp SDK Migration
**Goal:** Replace custom `src/lib/sumup.ts` with official `@sumup/sdk` package. All existing checkout/refund operations work unchanged.
**Requirements:** SDK-01, SDK-02, SDK-03
**Plans:** 1 plan
Plans:
- [x] 13-01-PLAN.md -- Install @sumup/sdk, rewrite sumup.ts with SDK wrappers, document env vars
**Success criteria:**
- `@sumup/sdk` installed, SumUp client singleton created
- `createCheckout()`, `getCheckout()`, `refundTransaction()` reimplemented via SDK
- All call sites updated (webhook handler, ticket/drink purchase, refund)
- `.env.local.example` updated with `SUMUP_API_KEY` and `SUMUP_MERCHANT_CODE`
- Existing payment flows pass manual smoke test

### Phase 14: Admin Finance Dashboard
**Goal:** New admin section with transaction list, cursor-based pagination, filters, and transaction detail view.
**Requirements:** FIN-01, FIN-02, FIN-03, FIN-04, FIN-05, FIN-06
**Depends on:** Phase 13
**Plans:** 2 plans
Plans:
- [ ] 14-01-PLAN.md -- Finance tab in AdminNav, finance page shell, server actions, transaction table
- [ ] 14-02-PLAN.md -- Cursor-based pagination, date/status filters, click-to-expand detail view
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
- Server action calls `sumup.transactions.refund()`
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

### Phase 17: Alternative Payment Methods
**Goal:** Enable Satispay, MyBank, Apple Pay, and Google Pay as payment options alongside card payments.
**Requirements:** APM-01, APM-02, APM-03, APM-04, APM-05
**Depends on:** Phase 13
**Success criteria:**
- Checkout creation includes `redirect_url` for APM redirect flows
- Satispay and MyBank available as payment options (Card Widget handles UI)
- Apple Pay configured with domain verification via SumUp Dashboard
- Google Pay configured with domain onboarding via SumUp Dashboard
- Payment Widget shows available APMs based on `listAvailablePaymentMethods()`

### Phase 18: Card Tokenization
**Goal:** Members can save their card for faster repeat payments. SumUp Customers API links Resonate profiles to saved payment instruments.
**Requirements:** TOK-01, TOK-02, TOK-03, TOK-04
**Depends on:** Phase 13, Phase 17
**Success criteria:**
- SumUp customer created and linked to Resonate profile (stored `sumup_customer_id`)
- "Save card for future payments" checkbox during checkout creates tokenization checkout
- Returning member sees "Pay with saved card" option using stored token
- Member can view and delete saved cards from profile settings
- Card Widget `purpose: "SETUP_RECURRING_PAYMENT"` flow works end-to-end

---
*Roadmap updated: 2026-03-06*
