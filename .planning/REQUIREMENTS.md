# Requirements: Resonate v1.1

**Defined:** 2026-03-05
**Core Value:** Members can discover events, confirm attendance, and buy tickets within a trusted, curated community -- the gating mechanism (referral + approval) is what makes the community valuable.

## v1.1 Requirements

### SumUp Embedded Checkout

- [x] **SUMP-01**: All payments (event tickets + drinks) use SumUp embedded widget instead of hosted checkout redirect
- [x] **SUMP-02**: Payment completes without leaving the app -- member stays on the same page throughout checkout
- [x] **SUMP-03**: Existing ticket purchase webhook flow continues to work with embedded checkout

### Drink Menu Management

- [x] **DRNK-01**: Organizer or admin can configure a drink menu per event (name, price per item)
- [x] **DRNK-02**: Drink menu is visible on the event detail page to authenticated members
- [x] **DRNK-03**: Organizer or admin can add, edit, and remove drink items from an event's menu

### Drink Purchase Flow

- [x] **DRNK-04**: Authenticated member can select drinks and purchase via SumUp embedded checkout
- [x] **DRNK-05**: After successful payment, a drink order is created with a unique cryptographic token and status `purchased`
- [x] **DRNK-06**: Each drink in an order has its own individual redeemable token (buying 2 beers = 2 separate tokens)

### Drink Redemption

- [x] **DRNK-07**: Member can view their purchased drink tickets on the event page and dashboard
- [x] **DRNK-08**: Tapping "Redeem" on a drink ticket shows a confirmation dialog with 3-second countdown before the confirm button activates
- [x] **DRNK-09**: After confirmation, the drink ticket shows a full-screen "SERVED" animation and the token is marked `redeemed` in DB
- [x] **DRNK-10**: A redeemed drink ticket cannot be redeemed again -- shows "Already redeemed" state
- [x] **DRNK-11**: Drink ticket tokens are cryptographically signed to prevent forgery (same pattern as event ticket QR)

### Public Drink Menu

- [x] **PMENU-01**: `/events/[slug]/menu` is publicly accessible without authentication and shows event name, date, and drink list with prices
- [x] **PMENU-02**: Guest can select drinks and pay via embedded SumUp checkout (no login required)
- [x] **PMENU-03**: Guest drink purchases create orders with null user_id and return orderId for localStorage persistence
- [x] **PMENU-04**: Guest can retrieve their drink tokens by order_id via API route (service-role, user_id null guard)

## Out of Scope

| Feature | Reason |
|---------|--------|
| Barista device/scanner | Barista has no device; redemption happens on member's phone |
| Drink inventory tracking | Not needed for v1.1; organizer manages availability manually |
| Drink categories/photos | Keep it simple; name + price is sufficient |
| Refunds for drinks | Manual via SumUp dashboard |
| Order history/receipts | Member sees purchased drinks on event page; no separate receipt page |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| SUMP-01 | Phase 8 (08-01, 08-02) | Complete |
| SUMP-02 | Phase 8 (08-02) | Complete |
| SUMP-03 | Phase 8 (08-01) | Complete |
| DRNK-01 | Phase 9 (09-01, 09-02) | Complete |
| DRNK-02 | Phase 9 (09-02) | Complete |
| DRNK-03 | Phase 9 (09-01, 09-02) | Complete |
| DRNK-04 | Phase 9 (09-01, 09-02) | Complete |
| DRNK-05 | Phase 9 (09-01) | Complete |
| DRNK-06 | Phase 9 (09-01) | Complete |
| DRNK-07 | Phase 10 (10-02) | Complete |
| DRNK-08 | Phase 10 (10-02) | Complete |
| DRNK-09 | Phase 10 (10-01, 10-02) | Complete |
| DRNK-10 | Phase 10 (10-01, 10-02) | Complete |
| DRNK-11 | Phase 10 (10-01) | Complete |
| PMENU-01 | Phase 11 (11-01) | Complete |
| PMENU-02 | Phase 11 (11-02) | Complete |
| PMENU-03 | Phase 11 (11-01) | Complete |
| PMENU-04 | Phase 11 (11-01) | Complete |

**Coverage:** 18 requirements (3 SumUp + 11 Drinks + 4 Public Menu)

---
*Requirements defined: 2026-03-05*
