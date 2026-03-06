# Phase 19: Fixes

## Goal
Remove unused features (card tokenization, payout reports), fix UI bugs (bottom navbar, drink menu count, dashboard default tab), add member-name transaction search for quick ticket refunds, and configure SumUp API keys for live payments.

## Requirements
- **FIX-01**: Remove all card tokenization code (Phase 18)
- **FIX-02**: Remove payout reports (Phase 16 code)
- **FIX-03**: Bottom navbar (MobileNav) always visible on menu page and scanner page
- **FIX-04**: Drink menu button: remove misleading item count, show "View available drinks" instead
- **FIX-05**: Dashboard default tab should be "events" not "members"
- **FIX-06**: Search transactions by member name for quick ticket refunds. Search returns only ticket purchases (pending_purchases). Refund button kept on all transactions in regular list. Use case: member denied entry (sold out, dress code, behavior, etc.)
- **FIX-07**: Configure SumUp API keys for live payments

## Key Files

### FIX-01 (Card Tokenization Removal)
**Delete:**
- `src/app/(members)/dashboard/SavedCardsSection.tsx`
- `supabase/migrations/20260306500000_phase18_card_tokenization.sql`

**Modify (remove tokenization code):**
- `src/types/database.ts` -- remove `sumup_customer_id` from Profile
- `src/lib/sumup.ts` -- remove Phase 18 section (lines 83-252): getOrCreateCustomer, createTokenizationCheckout, processWithSavedCard, listSavedCards, deactivateCard
- `src/app/(members)/dashboard/actions.ts` -- remove getSavedCards, deleteSavedCard, payWithSavedCard
- `src/app/(organizer)/organizer/events/actions.ts` -- remove purchaseTicketWithSavedCard, purchaseDrinksWithSavedCard, tokenization imports (lines 1123-1513)
- `src/app/(public)/events/[slug]/TierSelection.tsx` -- remove saved card payment method selector, save-card checkbox, purchaseTicketWithSavedCard import
- `src/app/(public)/events/[slug]/menu/GuestDrinkMenu.tsx` -- remove saved card payment method selector, purchaseDrinksWithSavedCard import
- `src/app/(public)/events/[slug]/menu/PartyDrinkMenu.tsx` -- remove savedCards prop pass-through
- `src/app/(public)/events/[slug]/page.tsx` -- remove listSavedCards import, savedCards fetching, savedCards props to TierSelection
- `src/app/(public)/events/[slug]/menu/page.tsx` -- remove listSavedCards import, savedCards fetching, savedCards props
- `src/app/(members)/dashboard/page.tsx` -- remove listSavedCards import, sumup_customer_id fetch, SavedCardsSection rendering
- `src/app/api/webhooks/sumup/route.ts` -- remove tokenization checkout comments

### FIX-02 (Payout Reports Removal)
**Delete:**
- `src/app/(admin)/admin/finance/payouts/page.tsx` (and directory)
- `src/components/admin/PayoutList.tsx`
- `src/components/admin/FinanceSubNav.tsx`

**Modify:**
- `src/app/(admin)/admin/finance/page.tsx` -- remove FinanceSubNav import and rendering
- `src/app/(admin)/admin/finance/actions.ts` -- remove listPayouts function

### FIX-03 (Bottom Navbar)
**Modify:**
- `src/app/(public)/events/[slug]/menu/page.tsx` -- add MobileNav with role/status
- `src/app/(admin)/admin/scanner/page.tsx` -- add MobileNav with role/status

### FIX-04 (Drink Menu Count)
**Modify:**
- `src/app/(public)/events/[slug]/page.tsx` -- drink items query (line ~334) needs party_id filter

### FIX-05 (Dashboard Default Tab)
**Modify:**
- `src/components/admin/AdminNav.tsx` -- reorder tabs: events first
- `src/components/layout/OrganizerNav.tsx` -- reorder tabs: events first
- Create `src/app/(admin)/admin/page.tsx` -- redirect to /admin/events
- Create `src/app/(organizer)/organizer/page.tsx` -- redirect to /organizer/events
- `src/lib/rbac/roles.ts` -- change admin nav href from /admin/members to /admin/events

### FIX-06 (Search by Member Name + Ticket-only Refunds)
**Modify/Create:**
- `src/app/(admin)/admin/finance/actions.ts` -- add searchTicketsByMember server action, add admin RLS policy migration
- `src/components/admin/TransactionList.tsx` -- add search input, hide refund button for drink transactions
- New migration for admin read policy on pending_purchases

### FIX-07 (SumUp API Keys)
- Document production env var setup (SUMUP_API_KEY, SUMUP_MERCHANT_CODE)
- Verify `.env.local.example` is up to date

## Dependencies
- None (all fixes are independent of each other)

## Constraints
- Refunds are ONLY for tickets, never for drinks
- MobileNav must always be visible (PWA app pattern)
- No new npm dependencies needed

## Success Criteria
- No card tokenization code in codebase
- No payout reports code in codebase
- MobileNav visible on all app pages (menu, scanner)
- Drink menu shows correct count per party
- /admin and /organizer redirect to events tab
- Admin can search member by name and refund their ticket
- SumUp API keys configured for production
