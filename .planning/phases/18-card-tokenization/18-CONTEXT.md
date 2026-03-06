# Phase 18: Card Tokenization

## Goal
Members can save their card for faster repeat payments. Links Resonate profiles to SumUp customers and stores payment instruments for one-tap checkout.

## Requirements
- **TOK-01**: Resonate profile linked to SumUp customer (sumup_customer_id column)
- **TOK-02**: "Save card" flow via `purpose: "SETUP_RECURRING_PAYMENT"` checkout
- **TOK-03**: "Pay with saved card" option for returning members
- **TOK-04**: View and delete saved cards from profile settings

## Key Files
- `src/lib/sumup.ts` (SDK client) -- `sumup.customers.create()`, `sumup.customers.listPaymentInstruments()`
- `src/components/events/SumUpCardWidget.tsx` -- needs tokenization mode support
- Database: `profiles` table needs `sumup_customer_id` column

## Flow Details

### First-time Card Save
1. Create SumUp customer via `sumup.customers.create()` with member's name + email
2. Store returned `customer_id` in `profiles.sumup_customer_id`
3. Create checkout with `purpose: "SETUP_RECURRING_PAYMENT"` and `customer_id`
4. Card Widget processes -- authorization charge is instantly reimbursed
5. Payment instrument token stored by SumUp on the customer

### Pay with Saved Card
1. Retrieve saved instruments via `sumup.customers.listPaymentInstruments(customerId)`
2. Show "Pay with saved card (Visa **** 1234)" option in checkout UI
3. Create checkout with `customer_id`
4. Process checkout via SDK with stored token (server-side, no Card Widget needed)

### Card Management
1. List saved cards from `sumup.customers.listPaymentInstruments()`
2. Delete card via `sumup.customers.deactivatePaymentInstrument(customerId, token)`
3. UI in member profile/settings page

## Database Migration
```sql
ALTER TABLE profiles ADD COLUMN sumup_customer_id TEXT;
```

## Dependencies
- Phase 13 (SDK migration -- customers resource)
- Phase 17 (APMs -- redirect_url in checkout, shared checkout improvements)

## Gotchas
- Tokenization checkout creates a real authorization (then instantly refunded) -- member sees temporary charge
- `mandate` object needed for compliance if processing server-side without Card Widget
- Card Widget handles consent UI automatically when `purpose` is set

## Success Criteria
- SumUp customer created and linked to profile on first save
- Card Widget tokenization flow works (authorization + instant refund)
- Returning member can pay with stored card without re-entering details
- Member can view last-4-digits and delete saved cards from settings
