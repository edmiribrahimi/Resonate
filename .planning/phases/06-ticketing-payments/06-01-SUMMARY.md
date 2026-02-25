---
phase: 06-ticketing-payments
plan: 01
subsystem: ticketing-data-foundation
tags: [database, migration, rls, sumup, email, types]
dependency_graph:
  requires: [events-table, profiles-table, is_admin_or_organizer-function]
  provides: [ticket_tiers-table, tickets-table, pending_purchases-table, reserve_ticket-rpc, sumup-client, email-attachments, ticketing-types]
  affects: [schema.sql, database.ts, email.ts]
tech_stack:
  added: [SumUp Checkout API v0.1]
  patterns: [SELECT FOR UPDATE atomic reservation, SECURITY DEFINER RPC, CID email attachments]
key_files:
  created:
    - supabase/migrations/20260225_phase6_ticketing.sql
    - src/lib/sumup.ts
  modified:
    - supabase/schema.sql
    - src/types/database.ts
    - src/lib/email.ts
decisions:
  - "Used SELECT FOR UPDATE row-level locking in reserve_ticket for atomic oversell prevention"
  - "Extended sendEmail with optional attachments via spread operator to maintain backward compatibility"
metrics:
  duration: 102s
  completed: 2026-02-25T12:55:30Z
---

# Phase 6 Plan 01: Ticketing Data Foundation Summary

Database schema for ticket tiers/tickets/pending purchases with atomic reservation function using SELECT FOR UPDATE locking, SumUp Checkout API client wrapper, and email utility extended for CID inline attachments.

## Tasks Completed

| Task | Name | Commit | Key Files |
|------|------|--------|-----------|
| 1 | Database migration for ticketing tables, RLS, and atomic reservation | 71d7a12 | supabase/migrations/20260225_phase6_ticketing.sql, supabase/schema.sql |
| 2 | TypeScript types, SumUp API client, and email attachments | 0a391b8 | src/types/database.ts, src/lib/sumup.ts, src/lib/email.ts |

## What Was Built

### Database Migration
- **ticket_tiers** table: event_id, name, price (numeric 10,2), quantity with CHECK constraints
- **tickets** table: tier_id, user_id, sumup_checkout_id (UNIQUE), amount_paid, UNIQUE(event_id, user_id) one-per-member constraint
- **pending_purchases** table: tracks SumUp checkout lifecycle with status enum (pending/completed/failed/expired)
- **5 indexes** for common query patterns (event, user, tier, checkout lookups)
- **RLS policies**: authenticated read on tiers, own-ticket read, admin read-all, admin tier management
- **reserve_ticket** SECURITY DEFINER function: checks existing ticket, locks tier via FOR UPDATE, counts sold, raises on sold out, inserts atomically

### TypeScript Types
- TicketTier, Ticket, PendingPurchase interfaces matching schema exactly
- Proper union type for PendingPurchase.status field

### SumUp API Client
- createCheckout: POST to SumUp with hosted_checkout enabled, uses SUMUP_API_KEY and SUMUP_MERCHANT_CODE env vars
- getCheckout: GET checkout by ID for payment verification, returns typed status/transactions

### Email Extension
- sendEmail now accepts optional `attachments` array for CID inline images
- Backward compatible -- existing callers unaffected (attachments is optional)

## Deviations from Plan

None -- plan executed exactly as written.

## Verification

- Migration file exists with all 3 tables, RLS, indexes, and reserve_ticket function with FOR UPDATE
- `npx next build` passes with 0 errors
- sumup.ts exports createCheckout and getCheckout
- email.ts sendEmail accepts optional attachments
- database.ts has TicketTier, Ticket, PendingPurchase interfaces
