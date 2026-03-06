# Phase 10: Drink Redemption - Context

**Gathered:** 2026-03-06
**Status:** Ready for planning

<domain>
## Phase Boundary

Members redeem purchased drink tokens at the bar using their phone. Each token is individually redeemable with anti-accidental-tap protection (3-second confirmation) and a full-screen "SERVED" animation. Tokens are cryptographically signed to prevent forgery. Redeemed tokens cannot be reused.

</domain>

<decisions>
## Implementation Decisions

### Drink Ticket Display
- Each drink token displayed as an individual card (voucher style) — one card per purchased drink
- Card shows drink name, price, and a prominent "Redeem" button
- Purchased tokens have active/vibrant styling; redeemed tokens show muted "Already redeemed" state
- Design goal: professional, premium feel — each card should feel like a tangible voucher

### Countdown & Confirmation
- Tapping "Redeem" opens a confirmation dialog with a circular progress animation (Apple Watch confirmation style)
- Circle fills over 3 seconds, then the "Confirm" button becomes active
- During countdown, user sees the drink name and a clear "Hold to confirm" indication
- Cannot dismiss early by accident — deliberate anti-fraud interaction

### "SERVED" Animation
- After confirmation, full-screen overlay displays with animated success state
- Dismisses after ~3 seconds or on tap
- Should feel celebratory but on-brand for Resonate (not over the top)
- Token marked `redeemed` in database immediately on confirmation

### Token Placement
- **Event page:** New "My Drinks" section appears below the drink menu (only if user has tokens for this event)
- **Dashboard:** Drink tokens also visible on member dashboard for quick access
- Both locations show the same card component with full redeem capability

### Cryptographic Signing
- Drink tokens signed using same HMAC pattern as event tickets (`src/utils/qr.ts` — `generateTicketToken`/`verifyTicketToken`)
- Token value = `{token_id}.{hmac_signature}` using `TICKET_SIGNING_SECRET`
- Signature verified server-side before any redemption is processed

### Claude's Discretion
- Exact animation style and colors for "SERVED" screen (check animato, particelle, or blend — should match Resonate's brand: dark theme, accent color)
- Card layout details (exact spacing, typography, icon choices)
- How the "My Drinks" section integrates visually with the existing event page layout
- Dashboard widget design for drink tokens
- Loading and error states during redemption
- Whether to show a count badge for unredeemed drinks

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/utils/qr.ts`: `generateTicketToken()` / `verifyTicketToken()` — HMAC signing with `TICKET_SIGNING_SECRET`, reuse for drink token signing
- `src/app/(public)/events/[slug]/DrinkMenu.tsx`: Existing drink menu component with card-based layout and accent styling
- `src/app/(public)/events/[slug]/SumUpCheckoutModal.tsx`: Modal pattern with overlay, can inform confirmation dialog structure
- Tailwind CSS v4 with custom theme: `bg-card`, `border-card-border`, `text-accent`, `text-muted` tokens

### Established Patterns
- Card components use `rounded-xl border border-card-border bg-card p-3/p-4`
- Success states use `border-green-500/30 bg-green-500/10 text-green-400`
- Buttons use `rounded-full bg-accent` with `active:scale-95 active:opacity-80` transitions
- Server actions pattern in `src/app/(organizer)/organizer/events/actions.ts`

### Integration Points
- `src/app/(public)/events/[slug]/page.tsx` line 670: Drinks section renders for authenticated users — add "My Drinks" section nearby
- `drink_tokens` table: already has `status` (purchased/redeemed), `redeemed_at`, `token` fields
- `fulfill_drink_order` PL/pgSQL function creates tokens with status `purchased`
- RLS: `drink_tokens_select_own` policy lets users read their own tokens; `drink_tokens_select_admin` for organizers
- Dashboard location: member routes under `(members)` route group

</code_context>

<specifics>
## Specific Ideas

- "Rendi l'esperienza il piu professionale possibile" — the redemption flow should feel polished and premium
- Each token is a standalone voucher the member shows to the barista
- The barista does NOT have their own device — the member's phone is the only UI (per REQUIREMENTS.md out-of-scope)
- Circular progress countdown similar to Apple Watch "confirm" interaction

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 10-drink-redemption*
*Context gathered: 2026-03-06*
