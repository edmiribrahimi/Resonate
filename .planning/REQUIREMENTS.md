# Requirements: Resonate v1.2

**Defined:** 2026-03-06
**Core Value:** Members can discover events, confirm attendance, and buy tickets within a trusted, curated community -- the gating mechanism (referral + approval) is what makes the community valuable.

## v1.2 Requirements

### SumUp SDK Migration

- [x] **SDK-01**: Replace custom `src/lib/sumup.ts` with official `@sumup/sdk` package as the single SumUp client
- [x] **SDK-02**: All existing checkout and refund operations work unchanged after migration (createCheckout, getCheckout, refundTransaction)
- [x] **SDK-03**: `SUMUP_API_KEY` and `SUMUP_MERCHANT_CODE` documented in `.env.local.example`

### Admin Finance Section

- [x] **FIN-01**: New "Finance" tab in admin navigation accessible only to master role
- [x] **FIN-02**: `/admin/finance` page shows a list of all SumUp transactions (tickets + drinks) with amount, date, status, and description
- [ ] **FIN-03**: Transaction list supports cursor-based pagination (prev/next navigation)
- [ ] **FIN-04**: Transaction list supports filtering by date range and status (successful, refunded, failed, chargeback)
- [ ] **FIN-05**: Clicking a transaction shows detail view with fee amount, card type, last 4 digits, and payment method
- [x] **FIN-06**: Transactions are filtered by `payment_type=ECOM` to show only online payments

### Refund Management

- [ ] **REF-01**: Transaction detail view includes a "Refund" button (only for successful, non-refunded transactions)
- [ ] **REF-02**: Refund confirmation dialog shows transaction amount and allows choosing full or partial refund
- [ ] **REF-03**: Partial refund allows entering a custom amount (validated <= original amount)
- [ ] **REF-04**: After successful refund, transaction status updates in the list without page reload
- [ ] **REF-05**: Refund dialog shows warning that SumUp fees are not refundable

### Payout Reports

- [ ] **PAY-01**: `/admin/finance/payouts` page shows list of SumUp payouts (bank transfers received)
- [ ] **PAY-02**: Payout list supports date range filter with start/end date pickers
- [ ] **PAY-03**: Each payout shows amount, date, status, and type (payout, chargeback deduction, refund deduction)

### Alternative Payment Methods

- [ ] **APM-01**: Satispay enabled as payment option (available in Italy, no custom integration -- Card Widget handles it)
- [ ] **APM-02**: MyBank enabled as payment option (available in Italy, redirect-based flow)
- [ ] **APM-03**: Apple Pay enabled via Card Widget with domain verification completed
- [ ] **APM-04**: Google Pay enabled via Card Widget with domain onboarding completed
- [ ] **APM-05**: Checkout creation includes `redirect_url` parameter for APM redirect flows

### Card Tokenization

- [ ] **TOK-01**: Resonate member profile linked to SumUp customer (created on first purchase or opt-in)
- [ ] **TOK-02**: Member can save their card during checkout via `purpose: "SETUP_RECURRING_PAYMENT"` flow
- [ ] **TOK-03**: Returning member sees "Pay with saved card" option that charges their stored payment instrument
- [ ] **TOK-04**: Member can view and delete saved cards from their profile/settings

## Out of Scope

| Feature | Reason |
|---------|--------|
| Receipt data in confirmation emails | Medium priority -- keep scope focused |
| Checkout cleanup cron job | SumUp manages expiration internally |
| CSV export of transactions | Can be added later if needed |
| OAuth 2.0 flow | API key sufficient for single-merchant use case |
| Recurring/subscription payments | Card tokenization covers one-tap, not auto-billing |
| In-person terminal payments | Resonate is online-only |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| SDK-01 | Phase 13 | Complete |
| SDK-02 | Phase 13 | Complete |
| SDK-03 | Phase 13 | Complete |
| FIN-01 | Phase 14 | Complete |
| FIN-02 | Phase 14 | Complete |
| FIN-03 | Phase 14 | Pending |
| FIN-04 | Phase 14 | Pending |
| FIN-05 | Phase 14 | Pending |
| FIN-06 | Phase 14 | Complete |
| REF-01 | Phase 15 | Pending |
| REF-02 | Phase 15 | Pending |
| REF-03 | Phase 15 | Pending |
| REF-04 | Phase 15 | Pending |
| REF-05 | Phase 15 | Pending |
| PAY-01 | Phase 16 | Pending |
| PAY-02 | Phase 16 | Pending |
| PAY-03 | Phase 16 | Pending |
| APM-01 | Phase 17 | Pending |
| APM-02 | Phase 17 | Pending |
| APM-03 | Phase 17 | Pending |
| APM-04 | Phase 17 | Pending |
| APM-05 | Phase 17 | Pending |
| TOK-01 | Phase 18 | Pending |
| TOK-02 | Phase 18 | Pending |
| TOK-03 | Phase 18 | Pending |
| TOK-04 | Phase 18 | Pending |

**Coverage:** 26 requirements (3 SDK + 6 Finance + 5 Refund + 3 Payout + 5 APM + 4 Tokenization)

---
*Requirements defined: 2026-03-06*
