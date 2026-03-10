---
phase: 26-discount-codes
verified: 2026-03-10T02:30:00Z
status: passed
score: 4/4 success criteria verified
must_haves:
  truths:
    - "Organizer can create/edit/delete discount codes per party with: code string, discount type (percentage/fixed), discount amount, optional max uses, active toggle, optional tier restriction"
    - "Buyer sees 'Hai un codice sconto?' input field during ticket checkout; entering a valid code shows the discounted price before payment"
    - "Validation is case-insensitive, rejects codes that would bring price below EUR 1.00, enforces usage limits, and only accepts codes for the correct party"
    - "SumUp checkout uses the discounted amount; ticket record stores discount_code_id for traceability; sales dashboard shows discount usage"
  artifacts:
    - path: "supabase/migrations/20260310100000_discount_codes.sql"
      status: verified
    - path: "supabase/schema.sql"
      status: verified
    - path: "src/types/database.ts"
      status: verified
    - path: "src/app/(organizer)/organizer/events/[id]/tickets/actions.ts"
      status: verified
    - path: "src/app/(public)/events/[slug]/TierSelection.tsx"
      status: verified
    - path: "src/app/(organizer)/organizer/events/actions.ts"
      status: verified
    - path: "src/app/api/webhooks/sumup/route.ts"
      status: verified
    - path: "src/components/tickets/AddDiscountCodeForm.tsx"
      status: verified
    - path: "src/components/tickets/DiscountCodeCard.tsx"
      status: verified
    - path: "src/app/(organizer)/organizer/events/[id]/tickets/page.tsx"
      status: verified
    - path: "src/components/events/SalesDashboard.tsx"
      status: verified
    - path: "src/app/(organizer)/organizer/events/[id]/sales/page.tsx"
      status: verified
    - path: "src/app/(admin)/admin/events/[id]/sales/page.tsx"
      status: verified
---

# Phase 26: Discount Codes Verification Report

**Phase Goal:** Organizers can create discount codes per party that apply percentage or fixed discounts to any ticket tier -- buyers enter codes manually during checkout, case-insensitive validation, with optional usage limits and minimum price guard (SumUp EUR 1.00 minimum)
**Verified:** 2026-03-10T02:30:00Z
**Status:** passed
**Re-verification:** No -- initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Organizer can create/edit/delete discount codes per party with: code string, type (percentage/fixed), amount, optional max uses, active toggle, optional tier restriction | VERIFIED | `createDiscountCode`, `updateDiscountCode`, `deleteDiscountCode` server actions in actions.ts (lines 240-477); AddDiscountCodeForm.tsx (203 lines) with all fields; DiscountCodeCard.tsx (315 lines) with display/edit/delete modes; tickets page renders "Codici Sconto" section per party (line 263) |
| 2 | Buyer sees "Hai un codice sconto?" input during checkout; entering valid code shows discounted price | VERIFIED | TierSelection.tsx line 322: "Hai un codice sconto?" toggle; lines 298-305: strikethrough + green discounted price display; handleValidateCode() calls validateDiscountCode server action; confirmation banner with "Rimuovi" button (lines 346-359) |
| 3 | Validation is case-insensitive, rejects codes below EUR 1.00, enforces usage limits, party-scoped | VERIFIED | validateDiscountCode uses `.ilike("code", code.trim())` (line 498); purchaseTicket server-side check `finalPrice < 1.00` (line 745); usage limit check `count >= max_uses` in both validateDiscountCode (line 516) and purchaseTicket (line 734); party_id check (line 713); RPC FOR UPDATE lock on discount_codes (migration line 153-154) |
| 4 | SumUp checkout uses discounted amount; ticket stores discount_code_id; sales dashboard shows discount usage | VERIFIED | purchaseTicket passes `amount: finalPrice` to createCheckout (line 766); pending_purchases stores `discount_code_id: validatedDiscountCodeId` (line 785); webhook passes `p_discount_code_id: purchase.discount_code_id` to reserve_ticket RPC (route.ts line 58); SalesDashboard shows discount badge per buyer (line 174-176) and "Codici Sconto" summary section (lines 228-248) |

**Score:** 4/4 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `supabase/migrations/20260310100000_discount_codes.sql` | DB migration for discount_codes schema, RLS, RPC | VERIFIED | 186 lines: CREATE TABLE discount_codes, discount_code_tiers, ALTER tickets/pending_purchases, 8 RLS policies, updated reserve_ticket() RPC with p_discount_code_id DEFAULT NULL and FOR UPDATE lock |
| `supabase/schema.sql` | Schema reflects new tables/columns | VERIFIED | discount_codes table (line 488), discount_code_tiers (line 505), unique index (line 501), RLS policies (lines 517-543) |
| `src/types/database.ts` | DiscountCode, DiscountCodeTier interfaces | VERIFIED | DiscountCode interface (lines 109-119), DiscountCodeTier (lines 121-124), Ticket.discount_code_id (line 136), PendingPurchase.discount_code_id (line 197) |
| `src/app/(organizer)/organizer/events/[id]/tickets/actions.ts` | CRUD + validation server actions | VERIFIED | createDiscountCode (line 240), updateDiscountCode (line 335), deleteDiscountCode (line 441), validateDiscountCode (line 483) -- all fully implemented with validation, error handling, Italian messages |
| `src/app/(public)/events/[slug]/TierSelection.tsx` | Discount code input + discounted price display | VERIFIED | 387 lines: discount state management, computeDiscountedPrice helper, handleValidateCode, collapsible input (only for partyId != null), strikethrough + green price, EUR 1.00 client guard, anonymous intent with discountCodeId |
| `src/app/(organizer)/organizer/events/actions.ts` | purchaseTicket with discount validation | VERIFIED | Signature accepts discountCodeId (line 535), server-side validation (lines 699-750), finalPrice computation, EUR 1.00 minimum check, SumUp checkout with finalPrice, pending_purchases stores discount_code_id |
| `src/app/api/webhooks/sumup/route.ts` | Webhook passes discount_code_id to RPC | VERIFIED | p_discount_code_id: purchase.discount_code_id ?? null (line 58) |
| `src/components/tickets/AddDiscountCodeForm.tsx` | Form for creating discount codes | VERIFIED | 203 lines: code, type, amount, max uses, tier multi-checkbox, active toggle, createDiscountCode call |
| `src/components/tickets/DiscountCodeCard.tsx` | Display/edit/delete discount code component | VERIFIED | 315 lines: display mode (code, badge, usage, tiers), edit mode (all fields), delete with confirm (only if used === 0), PressableCard wrapper |
| `src/app/(organizer)/organizer/events/[id]/tickets/page.tsx` | Tickets page with discount codes section | VERIFIED | Imports AddDiscountCodeForm and DiscountCodeCard (lines 9-10), fetches discount_codes with junction (line 100), computes usage counts, groups by party, renders "Codici Sconto" section per party (line 263) |
| `src/components/events/SalesDashboard.tsx` | Sales dashboard with discount tracking | VERIFIED | BuyerData.discountCode field (line 16), DiscountSummary interface (line 19), discountSummary prop (line 32), "Sconto" column with green badge (lines 174-176), "Codici Sconto" summary section (lines 228-248) |
| `src/app/(organizer)/organizer/events/[id]/sales/page.tsx` | Organizer sales page passes discount data | VERIFIED | discount_code_id in rawBuyers query (line 82), discount code map and summary (lines 88-147), discountSummary prop passed (line 181) |
| `src/app/(admin)/admin/events/[id]/sales/page.tsx` | Admin sales page passes discount data | VERIFIED | Identical pattern: discount_code_id in query (line 69), code map/summary (lines 75-130), discountSummary prop (line 157) |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| TierSelection.tsx | validateDiscountCode | Server action import + call | WIRED | Import line 5, called in handleValidateCode (line 199) |
| TierSelection.tsx | purchaseTicket | Passes discountCodeId as 3rd param | WIRED | Line 230: `purchaseTicket(partyId, selectedTierId, discount?.id ?? null)` |
| purchaseTicket() | discount_codes table | Supabase query by ID | WIRED | Lines 705-709: `.from("discount_codes").select(...).eq("id", discountCodeId)` |
| purchaseTicket() | SumUp createCheckout | finalPrice in amount | WIRED | Line 766: `amount: finalPrice` (not tier.price) |
| purchaseTicket() | pending_purchases | discount_code_id insert | WIRED | Line 785: `discount_code_id: validatedDiscountCodeId` |
| Webhook route.ts | reserve_ticket RPC | p_discount_code_id from purchase | WIRED | Line 58: `p_discount_code_id: purchase.discount_code_id ?? null` |
| AddDiscountCodeForm | createDiscountCode | Form submit handler | WIRED | Import line 4, called in handleSubmit (line 39) |
| DiscountCodeCard | updateDiscountCode/deleteDiscountCode | Edit/delete handlers | WIRED | Imports lines 6-8, called in handleUpdate (line 66) and handleDelete (line 94) |
| tickets/page.tsx | discount_codes table | Supabase SELECT query | WIRED | Line 100: `.from("discount_codes").select(...)` |
| Organizer sales page | SalesDashboard | discountSummary prop | WIRED | Line 181: `discountSummary={discountSummaryData}` |
| Admin sales page | SalesDashboard | discountSummary prop | WIRED | Line 157: `discountSummary={discountSummaryData}` |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| SC-01 | 26-01, 26-03 | Organizer can create/edit/delete discount codes per party with: code, type, amount, max uses, active, tier restriction | SATISFIED | Full CRUD server actions + UI components (AddDiscountCodeForm, DiscountCodeCard) on tickets page per party |
| SC-02 | 26-02 | Buyer sees "Hai un codice sconto?" input; entering valid code shows discounted price | SATISFIED | TierSelection.tsx collapsible input, validateDiscountCode call, strikethrough + green price display |
| SC-03 | 26-01, 26-02 | Case-insensitive validation, EUR 1.00 minimum, usage limits, party-scoped | SATISFIED | ilike for case-insensitive; client-side >= 1.00 guard; server-side < 1.00 rejection; max_uses check in validateDiscountCode, purchaseTicket, and RPC (FOR UPDATE lock); party_id match in all validators |
| SC-04 | 26-02, 26-03 | SumUp uses discounted amount; ticket stores discount_code_id; sales dashboard shows usage | SATISFIED | finalPrice in createCheckout; discount_code_id in pending_purchases + webhook passthrough to reserve_ticket RPC; SalesDashboard discount badge + summary section on both organizer and admin |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| - | - | None found | - | - |

No TODO, FIXME, placeholder, or stub patterns detected in any of the 13 phase artifacts. No empty implementations. No console.log-only handlers.

### Human Verification Required

### 1. End-to-End Discount Purchase Flow

**Test:** Create a discount code (e.g., "TEST20", percentage, 20%), navigate to buyer page, enter code, verify strikethrough pricing appears, complete SumUp checkout, verify ticket record has discount_code_id in database.
**Expected:** Full flow works: code entry -> discounted prices shown -> SumUp checkout at discounted amount -> ticket created with discount_code_id.
**Why human:** Requires real SumUp checkout + database inspection.

### 2. Invalid Code Error Messages

**Test:** Enter invalid code, exhausted code, inactive code for various party tiers.
**Expected:** Italian error messages ("Codice non valido", "Codice esaurito", "Codice non piu attivo") appear in red text.
**Why human:** Requires running app with real database state.

### 3. EUR 1.00 Minimum Visual Feedback

**Test:** Create a fixed discount of EUR 14.00 on a EUR 15.00 tier and a EUR 10.00 tier. Apply discount code.
**Expected:** EUR 15.00 tier shows strikethrough EUR 15.00 + green EUR 1.00. EUR 10.00 tier keeps original price (no green/strikethrough) since discount would bring it below EUR 1.00.
**Why human:** Visual behavior verification needs rendered UI.

### 4. Discount Code CRUD on Tickets Page

**Test:** Create, edit, and delete discount codes from the organizer tickets page.
**Expected:** Form creates code with all fields, edit mode pre-fills values, delete only shows for unused codes, page revalidates after each action.
**Why human:** Requires interactive UI testing with database state.

### Gaps Summary

No gaps found. All 4 success criteria (SC-01 through SC-04) are fully satisfied with substantive implementations across 13 artifacts, all properly wired together. The implementation covers:

- **Database layer:** Complete schema with discount_codes table, junction table, column additions, RLS policies, and atomic RPC usage limit checking with FOR UPDATE locks.
- **Server layer:** Full CRUD + validation server actions with Italian error messages, server-side discount validation in purchaseTicket with EUR 1.00 minimum enforcement.
- **Buyer UI:** Collapsible discount code input (party-scoped only), strikethrough + green discounted pricing, client-side EUR 1.00 guard, anonymous intent preservation.
- **Organizer UI:** AddDiscountCodeForm + DiscountCodeCard components following existing patterns, "Codici Sconto" section per party on tickets page.
- **Sales tracking:** SalesDashboard discount badge per buyer + usage summary section, both organizer and admin sales pages pass discount data.
- **Webhook flow:** discount_code_id flows from pending_purchases through webhook to reserve_ticket RPC for atomic recording on tickets.

All 6 commits verified as existing in git history.

---

_Verified: 2026-03-10T02:30:00Z_
_Verifier: Claude (gsd-verifier)_
