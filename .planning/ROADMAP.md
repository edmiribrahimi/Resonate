# Roadmap: Resonate

## Completed Milestones

- [x] **v1.0** -- Trust-gated music events community: RBAC, referral/approval, SumUp ticketing, event media, branded emails (7 phases, 22 plans, 45 requirements) -- [archive](.planning/milestones/v1.0-ROADMAP.md)

## Current Milestone: v1.1

**Created:** 2026-03-05
**Depth:** Focused
**Phases:** 3
**Total v1.1 Requirements:** 14

### Phases

- [ ] **Phase 8: SumUp Embedded Checkout** - Replace hosted checkout redirect with embedded widget for in-app payments
- [ ] **Phase 9: Drink Menu & Purchase** - Per-event drink menu management, drink purchase via embedded checkout, drink order creation
- [ ] **Phase 10: Drink Redemption** - Drink ticket display, redemption flow with anti-accidental-tap protection, served confirmation

### Phase 8: SumUp Embedded Checkout
**Goal**: All payments happen inside the app without redirect
**Depends on**: v1.0 (existing SumUp integration)
**Requirements**: SUMP-01, SUMP-02, SUMP-03
**Success Criteria**:
  1. Member clicks "Buy Ticket" and completes payment without leaving the page
  2. SumUp embedded widget renders inline on the event detail page
  3. Existing webhook flow (reserve_ticket RPC, QR generation, email) still works
  4. Both event tickets and future drink purchases use the same embedded checkout

### Phase 9: Drink Menu & Purchase
**Goal**: Members can browse and buy drinks for events they attend
**Depends on**: Phase 8 (embedded checkout)
**Requirements**: DRNK-01, DRNK-02, DRNK-03, DRNK-04, DRNK-05, DRNK-06
**Success Criteria**:
  1. Organizer/admin can add drink items (name + price) to an event
  2. Event detail page shows a "Drinks" section with available items
  3. Member can select drinks and pay via embedded SumUp checkout
  4. Each purchased drink generates an individual redeemable token with status `purchased`

### Phase 10: Drink Redemption
**Goal**: Drinks are redeemed at the bar with anti-fraud protection
**Depends on**: Phase 9 (drink orders exist)
**Requirements**: DRNK-07, DRNK-08, DRNK-09, DRNK-10, DRNK-11
**Success Criteria**:
  1. Member sees their purchased drink tickets on event page and dashboard
  2. Tapping "Redeem" triggers a confirmation dialog with 3-second countdown
  3. After confirmation, full-screen "SERVED" animation displays and token is burned
  4. Redeemed tokens show "Already redeemed" and cannot be reused
  5. Tokens are cryptographically signed (same pattern as event ticket QR)

## Progress

| Phase | Plans Complete | Status | Completed |
|-------|---------------|--------|-----------|
| 8. SumUp Embedded Checkout | 0/? | Not started | -- |
| 9. Drink Menu & Purchase | 0/? | Not started | -- |
| 10. Drink Redemption | 0/? | Not started | -- |

## Coverage

| Category | Requirements | Phase |
|----------|-------------|-------|
| SumUp Embedded | SUMP-01, SUMP-02, SUMP-03 | Phase 8 |
| Drink Menu | DRNK-01, DRNK-02, DRNK-03 | Phase 9 |
| Drink Purchase | DRNK-04, DRNK-05, DRNK-06 | Phase 9 |
| Drink Redemption | DRNK-07, DRNK-08, DRNK-09, DRNK-10, DRNK-11 | Phase 10 |

**Mapped: 14/14** -- all v1.1 requirements covered.

## Dependency Graph

```
Phase 8 (SumUp Embedded)
  |
  v
Phase 9 (Drink Menu & Purchase)
  |
  v
Phase 10 (Drink Redemption)
```

---
*Roadmap created: 2026-03-05*
