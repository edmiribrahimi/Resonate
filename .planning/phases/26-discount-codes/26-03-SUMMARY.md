---
phase: 26-discount-codes
plan: 03
subsystem: ticketing
tags: [discount-codes, ui, crud, sales-dashboard]
dependency_graph:
  requires: [discount_codes_table, discount_code_tiers_table, discount_code_crud]
  provides: [AddDiscountCodeForm, DiscountCodeCard, discount_tickets_page_section, discount_sales_tracking]
  affects: [tickets-page, sales-dashboard, organizer-sales, admin-sales]
tech_stack:
  added: []
  patterns: [AddTierForm-pattern, TierCard-pattern, PressableCard-wrapper, junction-table-query]
key_files:
  created:
    - src/components/tickets/AddDiscountCodeForm.tsx
    - src/components/tickets/DiscountCodeCard.tsx
  modified:
    - src/app/(organizer)/organizer/events/[id]/tickets/page.tsx
    - src/components/events/SalesDashboard.tsx
    - src/app/(organizer)/organizer/events/[id]/sales/page.tsx
    - src/app/(admin)/admin/events/[id]/sales/page.tsx
decisions:
  - DiscountCodeCard derives initial selectedTierIds from tier_names matching (display-to-id resolution)
  - Tier selection uses multi-checkbox approach (not multi-select dropdown) for better mobile UX
  - Discount summary section only renders when discountSummary prop is provided and non-empty (backward compatible)
  - Admin sales page gets identical discount tracking pattern as organizer sales page
metrics:
  duration_seconds: 233
  completed: "2026-03-10T02:16:53Z"
---

# Phase 26 Plan 03: Organizer CRUD UI + Sales Dashboard Discount Tracking Summary

AddDiscountCodeForm and DiscountCodeCard components following AddTierForm/TierCard patterns, tickets page Codici Sconto section per party, SalesDashboard discount badge per buyer and usage summary.

## Task Execution

### Task 1: AddDiscountCodeForm + DiscountCodeCard components
**Commit:** f4229f1

**AddDiscountCodeForm** (`src/components/tickets/AddDiscountCodeForm.tsx`):
- Client component following AddTierForm pattern exactly
- Props: eventId, partyId, tiers (for tier selection)
- Fields: code (text), discount type (select: Percentuale/Fisso), amount (dynamic label), max uses, tier selection (multi-checkbox), active toggle
- Hidden tier_ids field with JSON string of selected tier IDs
- useTransition for createDiscountCode server action, error display, form reset on success
- Same Tailwind classes as AddTierForm (rounded-2xl border border-card-border bg-card p-4)

**DiscountCodeCard** (`src/components/tickets/DiscountCodeCard.tsx`):
- Client component following TierCard pattern exactly
- Props: DiscountCodeWithUsage (code, type, amount, max_uses, is_active, used, tier_names), eventId, tiers
- Display mode: code (bold mono) + active/inactive badge, discount info, usage count, tier restriction
- Edit mode: same form fields as AddDiscountCodeForm, prepopulated, Save/Cancel buttons
- Delete: window.confirm, only shown when used === 0
- PressableCard wrapper, formatPrice for fixed amounts

### Task 2: Tickets page discount section + sales dashboard discount tracking
**Commit:** 9121430

**Tickets page** (`tickets/page.tsx`):
- Fetches discount codes with junction table data (discount_code_tiers)
- Computes usage counts per code via tickets table
- Resolves tier names from tier IDs for display
- Groups discount codes by party_id
- Renders "Codici Sconto" section per party after tier cards: AddDiscountCodeForm + DiscountCodeCard list

**SalesDashboard** (`SalesDashboard.tsx`):
- BuyerData extended with optional discountCode field
- New DiscountSummary interface and optional discountSummary prop
- Desktop table: added "Sconto" column with green badge
- Mobile cards: discount code badge next to purchase date
- New "Codici Sconto" summary section after buyers (code, discount info, usage count)

**Organizer sales page** (`organizer/.../sales/page.tsx`):
- Added discount_code_id to rawBuyers query
- Fetches discount_codes for used IDs, builds code map and summary data
- Passes discountCode per buyer and discountSummary to SalesDashboard

**Admin sales page** (`admin/.../sales/page.tsx`):
- Same discount tracking pattern as organizer sales page
- Passes discountSummary to SalesDashboard

## Deviations from Plan

None -- plan executed exactly as written.

## Verification Results

| Check | Result |
|-------|--------|
| AddDiscountCodeForm.tsx exists | PASS |
| DiscountCodeCard.tsx exists | PASS |
| createDiscountCode referenced in form | PASS |
| updateDiscountCode/deleteDiscountCode referenced in card | PASS |
| "Codici Sconto" on tickets page | PASS |
| AddDiscountCodeForm/DiscountCodeCard imported in tickets page | PASS |
| discountSummary/discountCode in SalesDashboard | PASS |
| discount_code_id in organizer sales query | PASS |
| discount_code_id in admin sales query | PASS |
| TypeScript compilation (npx tsc --noEmit) | PASS |

## Decisions Made

1. **Tier selection via multi-checkbox** -- Better mobile UX than multi-select dropdown, consistent with the checkbox pattern used elsewhere (show_remaining, is_active).
2. **Derive selectedTierIds from tier_names** -- DiscountCodeCard resolves initial tier selections by matching tier names from display data against the tiers prop, avoiding an extra tier_id query.
3. **Backward-compatible discountSummary** -- The prop is optional, so existing SalesDashboard usage (without discount data) continues to work unchanged.
4. **Admin parity** -- Admin sales page receives identical discount tracking to organizer sales page for consistent reporting.

## Self-Check: PASSED

All files exist, all commits verified.
