# Phase 17: Alternative Payment Methods

## Goal
Enable Satispay, MyBank, Apple Pay, and Google Pay as payment options alongside card payments via the SumUp Card Widget.

## Requirements
- **APM-01**: Satispay enabled (available in Italy, redirect-based)
- **APM-02**: MyBank enabled (available in Italy, redirect-based)
- **APM-03**: Apple Pay enabled via Card Widget (requires domain verification)
- **APM-04**: Google Pay enabled via Card Widget (requires domain onboarding)
- **APM-05**: Checkout creation includes `redirect_url` for APM redirect flows

## Key Files
- `src/lib/sumup.ts` (will be SDK client by then) -- checkout creation needs `redirect_url`
- `src/components/events/SumUpCardWidget.tsx` -- may need `googlePay` config option
- SumUp Dashboard > Settings > For developers > Payment wallets -- manual setup for Apple/Google Pay domains

## Integration Details

### Satispay & MyBank (redirect-based APMs)
- Card Widget shows them automatically if enabled on merchant account
- Checkout must include `redirect_url` for redirect-back after payment
- Customer provides: first name, last name, country, email
- Payment flow: Widget -> redirect to APM -> redirect back to app

### Apple Pay
- Requires domain verification via SumUp Dashboard (Settings > For developers > Payment wallets)
- Card Widget handles Apple Pay UI natively when configured
- Alternative: custom integration via `PUT /v0.1/checkouts/{id}/apple-pay-session`

### Google Pay
- Requires domain onboarding via SumUp Dashboard
- Card Widget shows Google Pay button when configured
- `googlePay` config option on `SumUpCard.mount()` for customization
- Use `#sumup-widget:google-pay-demo-mode` URL hash for testing screenshots

## Dependencies
- Phase 13 (SDK migration -- checkout creation with redirect_url)

## Manual Steps Required
- Admin must enable APMs in SumUp Dashboard
- Admin must register domains for Apple Pay and Google Pay in SumUp Dashboard
- These are one-time setup steps, not automatable via API

## Success Criteria
- Checkout creation includes `redirect_url` pointing back to event/drink page
- Card Widget displays available APMs based on merchant configuration
- Satispay and MyBank redirect flows complete successfully
- Apple Pay and Google Pay buttons appear when domains are verified
