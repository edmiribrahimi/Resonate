# Roadmap: Resonate

## Completed Milestones

- [x] **v1.0** -- Trust-gated music events community: RBAC, referral/approval, SumUp ticketing, event media, branded emails (7 phases, 22 plans, 45 requirements) -- [archive](.planning/milestones/v1.0-ROADMAP.md)

## Current Milestone: v1.1

**Created:** 2026-03-05
**Depth:** Focused
**Phases:** 4
**Total v1.1 Requirements:** 18

### Phases

- [x] **Phase 8: SumUp Embedded Checkout** - Replace hosted checkout redirect with embedded widget for in-app payments
- [x] **Phase 9: Drink Menu & Purchase** - Per-event drink menu management, drink purchase via embedded checkout, drink order creation
- [x] **Phase 10: Drink Redemption** - Drink ticket display, redemption flow with anti-accidental-tap protection, served confirmation
- [ ] **Phase 11: Public Drink Menu** - QR-accessible public menu page per event, guest drink purchase without login

### Phase 8: SumUp Embedded Checkout
**Goal**: All payments happen inside the app without redirect
**Depends on**: v1.0 (existing SumUp integration)
**Requirements**: SUMP-01, SUMP-02, SUMP-03
**Plans:** 2 plans
Plans:
- [x] 08-01-PLAN.md -- Backend card-widget checkout + reusable SumUpCardWidget component
- [x] 08-02-PLAN.md -- Frontend integration: checkout modal in TierSelection and PendingIntentHandler
**Success Criteria**:
  1. Member clicks "Buy Ticket" and completes payment without leaving the page
  2. SumUp embedded widget renders inline on the event detail page
  3. Existing webhook flow (reserve_ticket RPC, QR generation, email) still works
  4. Both event tickets and future drink purchases use the same embedded checkout

### Phase 9: Drink Menu & Purchase
**Goal**: Members can browse and buy drinks for events they attend
**Depends on**: Phase 8 (embedded checkout)
**Requirements**: DRNK-01, DRNK-02, DRNK-03, DRNK-04, DRNK-05, DRNK-06
**Plans:** 2 plans
Plans:
- [x] 09-01-PLAN.md -- Database schema, types, server actions (CRUD + purchase), webhook extension
- [x] 09-02-PLAN.md -- Organizer drink menu page, DrinkMenu component, event page integration
**Success Criteria**:
  1. Organizer/admin can add drink items (name + price) to an event
  2. Event detail page shows a "Drinks" section with available items
  3. Member can select drinks and pay via embedded SumUp checkout
  4. Each purchased drink generates an individual redeemable token with status `purchased`

### Phase 10: Drink Redemption
**Goal**: Drinks are redeemed at the bar with anti-fraud protection
**Depends on**: Phase 9 (drink orders exist)
**Requirements**: DRNK-07, DRNK-08, DRNK-09, DRNK-10, DRNK-11
**Plans:** 2/2 plans complete
Plans:
- [x] 10-01-PLAN.md -- Backend: DB redemption function, webhook HMAC signing, redeemDrinkToken server action
- [x] 10-02-PLAN.md -- Frontend: DrinkTokenCard, RedeemConfirmationModal, event page + dashboard integration
**Success Criteria**:
  1. Member sees their purchased drink tickets on event page and dashboard
  2. Tapping "Redeem" triggers a confirmation dialog with 3-second countdown
  3. After confirmation, full-screen "SERVED" animation displays and token is burned
  4. Redeemed tokens show "Already redeemed" and cannot be reused
  5. Tokens are cryptographically signed (same pattern as event ticket QR)

### Phase 11: Public Drink Menu
**Goal**: Anyone at the event can scan a QR, see the drink menu, and buy drinks without logging in
**Depends on**: Phase 9 (drink menu data), Phase 10 (drink tokens)
**Requirements**: PMENU-01, PMENU-02, PMENU-03, PMENU-04
**Success Criteria**:
  1. `/events/[slug]/menu` is publicly accessible without authentication
  2. Page shows event name, date, and drink list with prices
  3. Guest can select drinks and pay via embedded SumUp checkout (no login required)
  4. After payment, drink token is shown directly on the page (stored in localStorage for retrieval)

## Progress

| Phase | Plans Complete | Status | Completed |
|-------|---------------|--------|-----------|
| 8. SumUp Embedded Checkout | 2/2 | Complete | 2026-03-06 |
| 9. Drink Menu & Purchase | 2/2 | Complete | 2026-03-06 |
| 10. Drink Redemption | 2/2 | Complete    | 2026-03-06 |
| 11. Public Drink Menu | 0/? | Not started | -- |

## Coverage

| Category | Requirements | Phase |
|----------|-------------|-------|
| SumUp Embedded | SUMP-01, SUMP-02, SUMP-03 | Phase 8 |
| Drink Menu | DRNK-01, DRNK-02, DRNK-03 | Phase 9 |
| Drink Purchase | DRNK-04, DRNK-05, DRNK-06 | Phase 9 |
| Drink Redemption | DRNK-07, DRNK-08, DRNK-09, DRNK-10, DRNK-11 | Phase 10 |
| Public Menu | PMENU-01, PMENU-02, PMENU-03, PMENU-04 | Phase 11 |

**Mapped: 18/18** -- all v1.1 requirements covered.

## Dependency Graph

```
Phase 8 (SumUp Embedded)
  |
  v
Phase 9 (Drink Menu & Purchase)
  |
  v
Phase 10 (Drink Redemption)
  |
  v
Phase 11 (Public Drink Menu)
```

---
*Roadmap created: 2026-03-05*
