---
phase: 11
plan: 2
subsystem: drinks
tags: [frontend, qr-code, guest-flow, localStorage, redemption]
dependency-graph:
  requires: [phase-11-01-backend, phase-10-redemption]
  provides: [public-menu-page, guest-ordering, guest-token-display, event-qr-code]
  affects: [organizer-drinks-page]
tech-stack:
  added: [qrcode.react]
  patterns: [localStorage-persistence, custom-event-ipc, url-param-fallback, service-client-public-fetch]
key-files:
  created:
    - src/app/(public)/events/[slug]/menu/page.tsx
    - src/app/(public)/events/[slug]/menu/EventQRCode.tsx
    - src/app/(public)/events/[slug]/menu/GuestLoginBanner.tsx
    - src/app/(public)/events/[slug]/menu/GuestDrinkMenu.tsx
    - src/app/(public)/events/[slug]/menu/GuestTokenDisplay.tsx
  modified:
    - src/app/(organizer)/organizer/events/[id]/drinks/page.tsx
decisions:
  - QR code uses dual rendering (SVG for display, Canvas for PNG download) with qrcode.react
  - GuestDrinkMenu communicates with GuestTokenDisplay via CustomEvent (guestOrderComplete) to avoid prop drilling through server component
  - GuestRedeemConfirmationModal inlined in GuestTokenDisplay to keep guest redeem action isolated from authenticated flow
  - localStorage stores array of order IDs per event, URL param contains only latest order ID
metrics:
  duration: 221s
  completed: 2026-03-06
---

# Phase 11 Plan 2: Frontend for Public Drink Menu Summary

Public menu page at /events/[slug]/menu with guest drink ordering via SumUp, localStorage + URL token persistence, inline GuestRedeemConfirmationModal with 3-second countdown + SERVED animation, QR code with PNG download on both menu page (org/admin) and organizer drinks management page.

## Tasks Completed

| Task | Description | Status |
|------|-------------|--------|
| 1 | Menu page server component + EventQRCode + GuestLoginBanner | Done |
| 2 | GuestDrinkMenu + GuestTokenDisplay with redemption flow | Done |
| 3 | Add QR code to organizer drinks management page | Done |

## Commits

| Hash | Message |
|------|---------|
| dfd3743 | feat(11-02): add menu page, EventQRCode, and GuestLoginBanner |
| f067b59 | feat(11-02): add GuestDrinkMenu and GuestTokenDisplay with redemption flow |
| 11a692b | feat(11-02): add QR code to organizer drinks management page |

## Key Implementation Details

### Menu Page Server Component (Task 1)
- Fetches event by slug via `getServiceClient()` (no auth required for public access)
- Fetches available drink items ordered by sort_order
- Checks auth status: `createClient()` + `getUser()` for QR code visibility (org/admin only)
- Conditional rendering: QR code for org/admin, login banner for guests, token display for guests
- Includes `generateMetadata` for SEO
- Event cover image with gradient overlay when present

### EventQRCode (Task 1)
- `QRCodeSVG` (size=200, level="H") for display with `data-qr-svg` attribute
- Hidden `QRCodeCanvas` (size=400, level="H") with ref for high-resolution PNG download
- Sanitized filename: `eventTitle.replace(/[^a-zA-Z0-9]/g, "-").toLowerCase()`
- Wrapped in branded card with title and subtitle

### GuestLoginBanner + GuestWarningModal (Task 1)
- Persistent info-style banner with login link to `/login?redirect=/events/${slug}/menu`
- `GuestWarningModal` (named export) warns about token loss before checkout
- Two CTAs: "Log in first" (link) and "Continue as guest" (callback)
- Modal follows existing codebase pattern: fixed inset-0 z-50 bg-black/60 backdrop-blur-sm

### GuestDrinkMenu (Task 2)
- Fork of DrinkMenu with `purchaseDrinksGuest` from `./actions`
- Flow: Order -> purchaseDrinksGuest -> GuestWarningModal -> SumUpCheckoutModal -> complete
- After payment: stores orderId in localStorage, updates URL with `?order=orderId`, dispatches `guestOrderComplete` CustomEvent
- State additions: `showWarning`, `orderId`, `pendingCheckoutId`

### GuestTokenDisplay (Task 2)
- On mount: collects order IDs from URL param + localStorage, deduplicates, fetches tokens from `/api/drinks/tokens`
- Listens for `guestOrderComplete` CustomEvent from GuestDrinkMenu
- Polls pending orders every 3 seconds (max 10 retries = 30 seconds)
- Inline `GuestDrinkTokenCard`: identical UI to DrinkTokenCard but uses guest redeem modal
- Inline `GuestRedeemConfirmationModal`: identical to RedeemConfirmationModal (countdown ring at 60fps, SERVED full-screen overlay with scale animation, auto-dismiss after 3s) but imports `redeemDrinkTokenGuest`
- Sort: purchased first, redeemed last; grid-cols-2 gap-3

### Organizer QR Code Integration (Task 3)
- Extended event query to include `slug` column
- Built `menuUrl` from `NEXT_PUBLIC_APP_URL` + event slug
- Rendered `EventQRCode` below `DrinkMenuManager` in px-6 container

## Deviations from Plan

None - plan executed exactly as written.

## Verification

- TypeScript compilation: PASSED (npx tsc --noEmit, zero errors)
- qrcode.react installed successfully
- page.tsx is a server component that fetches event + drinks without auth: VERIFIED
- GuestDrinkMenu uses purchaseDrinksGuest and shows GuestWarningModal before checkout: VERIFIED
- GuestTokenDisplay loads tokens from localStorage + URL param, polls pending orders: VERIFIED
- GuestRedeemConfirmationModal has identical countdown + SERVED animation to original: VERIFIED
- EventQRCode renders SVG + provides PNG download: VERIFIED
- GuestLoginBanner shows persistent banner + exports GuestWarningModal: VERIFIED
- QR code only visible to org/admin on menu page: VERIFIED (role check in server component)
- QR code present on organizer drinks management page: VERIFIED

## Self-Check: PASSED
