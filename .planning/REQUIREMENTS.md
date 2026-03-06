# Requirements: Resonate v1.2

**Defined:** 2026-03-06
**Core Value:** Members can discover events, confirm attendance, and buy tickets within a trusted, curated community -- the gating mechanism (referral + approval) is what makes the community valuable.

## v1.2 Requirements

### SumUp API Client Enhancement

- [ ] **API-01**: SumUp client supports multiple API versions (v0.1, v1.0, v1.1, v2.1) from a single base URL without version prefix
- [ ] **API-02**: TypeScript types defined for all SumUp API responses (transactions, payouts, receipts)
- [ ] **API-03**: `SUMUP_API_KEY` and `SUMUP_MERCHANT_CODE` documented in `.env.local.example`

### Admin Finance Section

- [ ] **FIN-01**: New "Finance" tab in admin navigation accessible only to master role
- [ ] **FIN-02**: `/admin/finance` page shows a list of all SumUp transactions (tickets + drinks) with amount, date, status, and description
- [ ] **FIN-03**: Transaction list supports cursor-based pagination (prev/next navigation)
- [ ] **FIN-04**: Transaction list supports filtering by date range and status (successful, refunded, failed, chargeback)
- [ ] **FIN-05**: Clicking a transaction shows detail view with fee amount, card type, last 4 digits, and payment method
- [ ] **FIN-06**: Transactions are filtered by `payment_type=ECOM` to show only online payments

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

## Out of Scope

| Feature | Reason |
|---------|--------|
| Card tokenization / saved cards | Future milestone -- requires customer management |
| Receipt data in confirmation emails | Medium priority -- keep scope focused |
| Checkout cleanup cron job | Medium priority -- SumUp manages expiration internally |
| CSV export of transactions | Can be added later if needed |
| Google Pay / Apple Pay | Requires merchant registration with Google/Apple |
| OAuth 2.0 flow | API key sufficient for single-merchant use case |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| API-01 | Phase 13 | Pending |
| API-02 | Phase 13 | Pending |
| API-03 | Phase 13 | Pending |
| FIN-01 | Phase 14 | Pending |
| FIN-02 | Phase 14 | Pending |
| FIN-03 | Phase 14 | Pending |
| FIN-04 | Phase 14 | Pending |
| FIN-05 | Phase 14 | Pending |
| FIN-06 | Phase 14 | Pending |
| REF-01 | Phase 15 | Pending |
| REF-02 | Phase 15 | Pending |
| REF-03 | Phase 15 | Pending |
| REF-04 | Phase 15 | Pending |
| REF-05 | Phase 15 | Pending |
| PAY-01 | Phase 16 | Pending |
| PAY-02 | Phase 16 | Pending |
| PAY-03 | Phase 16 | Pending |

**Coverage:** 17 requirements (3 API + 6 Finance + 5 Refund + 3 Payout)

---
*Requirements defined: 2026-03-06*
