---
phase: 26-discount-codes
plan: 01
subsystem: ticketing
tags: [discount-codes, database, server-actions, rpc]
dependency_graph:
  requires: []
  provides: [discount_codes_table, discount_code_tiers_table, discount_code_crud, validateDiscountCode]
  affects: [tickets, pending_purchases, reserve_ticket_rpc]
tech_stack:
  added: []
  patterns: [junction-table, for-update-lock, ilike-case-insensitive]
key_files:
  created:
    - supabase/migrations/20260310100000_discount_codes.sql
  modified:
    - supabase/schema.sql
    - src/types/database.ts
    - src/app/(organizer)/organizer/events/[id]/tickets/actions.ts
decisions:
  - Junction table (discount_code_tiers) for many-to-many discount-to-tier mapping instead of nullable tier_id
  - Open SELECT RLS for discount_codes (buyers need to validate codes, distribution is passaparola)
  - Italian error messages for all discount code validation (Codice non valido, Codice non piu attivo, Codice esaurito)
  - p_discount_code_id DEFAULT NULL preserves backward compatibility with existing reserve_ticket() calls
metrics:
  duration_seconds: 211
  completed: "2026-03-10T02:09:46Z"
---

# Phase 26 Plan 01: Discount Codes Database Foundation Summary

Discount codes database schema with RLS, atomic RPC usage limit checking, TypeScript types, and CRUD+validation server actions following existing tier management pattern.

## Task Execution

### Task 1: Database migration -- discount_codes schema, RLS, RPC update
**Commit:** c659ca4

Created migration `20260310100000_discount_codes.sql` with:
- `discount_codes` table: id, party_id, code, discount_type (percentage/fixed), discount_amount, max_uses, is_active, timestamps
- Case-insensitive unique index `(party_id, LOWER(code))`
- `discount_code_tiers` junction table for tier-specific targeting
- `discount_code_id` column added to `tickets` (ON DELETE SET NULL) and `pending_purchases`
- RLS policies: open SELECT, admin/organizer for INSERT/UPDATE/DELETE on both tables
- Updated `reserve_ticket()` RPC with `p_discount_code_id uuid DEFAULT NULL` parameter, FOR UPDATE lock on discount_codes row, atomic usage count check

Updated `schema.sql` with new table definitions and RLS policies (appended, no existing entries modified).

### Task 2: TypeScript types + CRUD and validation server actions
**Commit:** 6d587bf

**Types added to `database.ts`:**
- `DiscountCode` interface with all table fields
- `DiscountCodeTier` interface (junction table)
- `discount_code_id: string | null` added to `Ticket` and `PendingPurchase` interfaces

**Server actions added to `tickets/actions.ts`:**
- `createDiscountCode(eventId, partyId, formData)` -- validates inputs, inserts code + junction rows, handles duplicate code error (23505)
- `updateDiscountCode(discountCodeId, eventId, formData)` -- updates code fields, deletes+re-inserts junction rows for tier associations
- `deleteDiscountCode(discountCodeId, eventId)` -- checks ticket usage count, throws if code has been used, cascade deletes junction rows
- `validateDiscountCode(partyId, code)` -- public action, ilike for case-insensitive matching, checks is_active, checks usage limits, returns applicable_tier_ids (null = all tiers)

All actions follow existing tier CRUD pattern (verifyOrganizer, verifyEventOwnership, service client for master).

## Deviations from Plan

None -- plan executed exactly as written.

## Verification Results

| Check | Result |
|-------|--------|
| Migration creates discount_codes table | PASS |
| Migration creates discount_code_tiers junction table | PASS |
| reserve_ticket() has p_discount_code_id DEFAULT NULL | PASS |
| DiscountCode interface in database.ts | PASS |
| All 4 server actions exported | PASS |
| validateDiscountCode uses ilike | PASS |
| deleteDiscountCode checks usage before deletion | PASS |
| TypeScript compilation (npx tsc --noEmit) | PASS |

## Decisions Made

1. **Junction table for tier targeting** -- Many-to-many via `discount_code_tiers` instead of nullable `tier_id` on discount_codes. Allows a code to apply to multiple specific tiers. Empty junction = all tiers.
2. **Open SELECT RLS** -- Buyers need to validate codes via client queries. Codes are distributed via passaparola, so open SELECT poses no security concern.
3. **Italian error messages** -- All user-facing errors in Italian (Codice non valido, Codice non piu attivo, Codice esaurito) matching the app's language.
4. **DEFAULT NULL for backward compatibility** -- `p_discount_code_id uuid DEFAULT NULL` ensures existing webhook calls to `reserve_ticket()` continue working without modification.

## Self-Check: PASSED

All files exist, all commits verified.
