---
phase: 10
plan: 2
subsystem: drinks
tags: [frontend, ux, redemption, animation, components]
dependency-graph:
  requires: [redeem-drink-token-rpc, hmac-signed-tokens, redeem-server-action]
  provides: [drink-token-card, redeem-confirmation-modal, my-drinks-section, dashboard-drink-tokens]
  affects: [event-page, dashboard-page]
tech-stack:
  added: []
  patterns: [conic-gradient-countdown, css-keyframe-animation, client-state-management, useTransition-server-action]
key-files:
  created:
    - src/app/(public)/events/[slug]/DrinkTokenCard.tsx
    - src/app/(public)/events/[slug]/RedeemConfirmationModal.tsx
    - src/app/(public)/events/[slug]/MyDrinks.tsx
    - src/app/(members)/dashboard/DashboardDrinkTokens.tsx
  modified:
    - src/app/(public)/events/[slug]/page.tsx
    - src/app/(members)/dashboard/page.tsx
decisions:
  - Both event page and dashboard use same DrinkTokenCard with full redeem capability (per locked user decision)
  - Dashboard groups tokens by event with 48h visibility window for recently-redeemed tokens
  - Circular countdown uses conic-gradient with 16ms interval (~60fps) for smooth animation
metrics:
  duration: 122s
  completed: 2026-03-06
---

# Phase 10 Plan 2: Frontend Drink Token Display and Redemption UX Summary

DrinkTokenCard voucher cards with purchased/redeemed states, 3-phase RedeemConfirmationModal (circular countdown, server-side confirm, full-screen SERVED animation), integrated on both event page and dashboard with full redeem capability.

## Tasks Completed

| Task | Description | Status |
|------|-------------|--------|
| 1 | DrinkTokenCard and RedeemConfirmationModal components | Done |
| 2 | MyDrinks section, DashboardDrinkTokens wrapper, event page and dashboard integration | Done |

## Commits

| Hash | Message |
|------|---------|
| b198808 | feat(10-02): add DrinkTokenCard and RedeemConfirmationModal components |
| 072279b | feat(10-02): add MyDrinks section, DashboardDrinkTokens, and page integrations |

## Key Implementation Details

### DrinkTokenCard (Task 1)
- **Purchased state:** Vibrant card with `border-accent/30 bg-gradient-to-br from-card to-accent/5`, drink name, formatted price (EUR de-DE), full-width "Redeem" button with `bg-accent` and `active:scale-95`
- **Redeemed state:** Muted card with `opacity-60`, green checkmark, "Already redeemed" text, no Redeem button
- Opens `RedeemConfirmationModal` on Redeem tap, passes signed token and callbacks

### RedeemConfirmationModal (Task 1)
- **Phase 1 (Countdown):** 3-second circular progress ring using `conic-gradient` updated at ~60fps via `setInterval(16ms)`. Inner circle creates ring effect. Countdown seconds displayed in center, checkmark on completion. Confirm button disabled (`opacity-50 cursor-not-allowed`) until countdown finishes.
- **Phase 2 (Redeeming):** Calls `redeemDrinkToken(signedToken)` server action via `useTransition`. Spinner on button during pending state. No optimistic update -- waits for server confirmation.
- **Phase 3 (SERVED):** Full-screen overlay (`z-[100]`) with "SERVED" text in `text-6xl font-bold text-accent`, CSS scale-in animation (0.5 to 1.0 over 400ms ease-out). Auto-dismisses after 3 seconds or on tap. Calls `onRedeemed()` then `onClose()` on dismiss.
- Error handling: Shows red error text in modal on failure, allows retry or close.

### MyDrinks Section (Task 2)
- Client component managing local token state via `useState` (initialized from server props)
- Sorts tokens: unredeemed (purchased) first, redeemed last
- `grid grid-cols-2 gap-3` layout for voucher card feel
- `onRedeemed` callback updates token status in local state without page reload

### Event Page Integration (Task 2)
- Queries `drink_tokens` for authenticated user's tokens for this event
- Renders `MyDrinks` section below existing `DrinkMenu` section
- Only shown when user has tokens (`userDrinkTokens.length > 0`)

### DashboardDrinkTokens (Task 2)
- Client wrapper component that renders DrinkTokenCard (same component as event page)
- Groups tokens by event with Link to event page, formatted date
- Local state management for redeem updates per group
- Sort: unredeemed first within each group

### Dashboard Integration (Task 2)
- Queries `drink_tokens` with `events(title, slug, date)` join, grouped by event
- Filters: shows events with unredeemed tokens OR tokens redeemed within last 48 hours
- Sorts groups: events with unredeemed tokens first
- Renders between "My Tickets" and "My Media" sections
- Only shown for `isMemberRole` users with tokens

## Deviations from Plan

None - plan executed exactly as written.

## Verification

- TypeScript compilation: PASSED (npx tsc --noEmit, zero errors)
- DrinkTokenCard renders purchased state with Redeem button and redeemed state with checkmark: VERIFIED
- RedeemConfirmationModal has 3-phase flow (countdown -> confirm -> SERVED): VERIFIED
- MyDrinks integrated on event page below DrinkMenu: VERIFIED
- DashboardDrinkTokens uses DrinkTokenCard with full redeem capability: VERIFIED
- Both locations use same DrinkTokenCard component: VERIFIED

## Self-Check: PASSED
