# Phase 24: Guest List Management - Research

**Researched:** 2026-03-09
**Domain:** Supabase Auth Admin API, email invitations (Resend), CSV parsing, guest-to-member lifecycle, free ticket generation
**Confidence:** HIGH

## Summary

Phase 24 is the most complex feature in v1.3 -- it touches the auth trigger (`handle_new_user()`), creates a new database table (`guest_list_entries`), introduces a new ticket type (`guest_list`), adds an approval tracking column (`approved_via`), requires a new email template (invitation), and must integrate with the existing check-in system for guests without email (name-based lookup). The core technical challenge is programmatic user creation via `supabase.auth.admin.createUser()` which DOES fire the existing `handle_new_user()` trigger on `auth.users` INSERT. This trigger currently sets `status = 'pending'` for users without a valid referral code, which would defeat the purpose of guest list auto-approval. The trigger must be modified to check `raw_user_meta_data` for a `guest_list_event_id` key and set `status = 'approved'` + `approved_via = 'guest_list'` accordingly.

The second major concern is the free ticket creation pathway. Current tickets always flow through SumUp payment (webhook -> `reserve_ticket()` RPC). Guest list free tickets bypass SumUp entirely -- they are created directly via service client INSERT with `amount_paid = 0` and `sumup_checkout_id = NULL`. This means a new `ticket_type` column (`purchased` | `guest_list`) is needed on the `tickets` table, and the sales dashboard must distinguish paid vs free tickets. The refund flow must also guard against attempting SumUp refunds on `amount_paid = 0` tickets.

CSV bulk import should use PapaParse (client-side, zero dependencies, ~14kb) for parsing in the browser with preview/validation before server-side processing. Batch processing of guest entries must respect both Supabase auth admin rate limits (~30-50 createUser calls before hitting general rate limits) and Resend email rate limits (2 requests/second, 3000 emails/month on free plan). Sequential processing with status tracking per entry is the safe approach.

**Primary recommendation:** Build the `guest_list_entries` table as the central orchestration entity. Each entry tracks its own lifecycle (added -> invited -> registered -> ticket_issued -> checked_in). Process entries individually with status updates so bulk operations can resume on failure. Modify the `handle_new_user()` trigger FIRST before implementing any auto-registration logic.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| GSTL-01 | Organizer adds guests by name/surname/email (email optional) | `guest_list_entries` table with nullable email, server action with organizer verification |
| GSTL-02 | View guest list with status per entry | Status field on `guest_list_entries` (invited/registered/has_ticket/checked_in), joined with profiles and tickets tables |
| GSTL-03 | System sends branded invitation email with QR code | New `GuestInvitationEmail` react-email template, Resend sendEmail with QR attachment (same pattern as ticket-confirmation) |
| GSTL-04 | Non-member guests with email auto-registered and auto-approved | `supabase.auth.admin.createUser()` with `email_confirm: true` + `user_metadata.guest_list_event_id`, modified `handle_new_user()` trigger |
| GSTL-05 | Existing approved members get free ticket | Check-before-create pattern: lookup email in profiles, if approved -> create ticket directly with `ticket_type: 'guest_list'`, `amount_paid: 0` |
| GSTL-06 | Pending members auto-approved then get free ticket | Service client updates profile `status = 'approved'`, `approved_via = 'guest_list'`, then creates free ticket |
| GSTL-07 | Remove guest with warning if ticket issued | Delete from `guest_list_entries`, warn if `ticket_id IS NOT NULL` (ticket remains valid, just unlinked from guest list) |
| GSTL-08 | Per-party granularity (nullable party_id) | `guest_list_entries.party_id` nullable FK to `event_parties`, NULL means all parties |
| GSTL-09 | New user registering with matching email auto-approved | Modified `handle_new_user()` trigger checks `guest_list_entries` for email match, sets `approved_via = 'guest_list'` |
| GSTL-10 | CSV bulk import with parse/validate/deduplicate/preview | PapaParse client-side parsing, validation server action, batch processing with per-entry status tracking |
| GSTL-11 | Clone guest list from previous event | Server action copies `guest_list_entries` from source event to target event (name/email only, reset status) |
| GSTL-12 | Guests without email: name lookup check-in at door | Attendee list API extended to include guest_list_entries without tickets, name search matches both ticket holders and guest-list-only entries |
| GSTL-13 | Invitation email includes event details, QR, password-set link | `auth.admin.generateLink({ type: 'invite', email })` generates password-set link, embedded in invitation email template |
| GSTL-14 | Profiles track approval method | `approved_via` column on `profiles` (referral/guest_list/admin_manual), backfill existing approved users |
| GSTL-15 | Tickets distinguish type, dashboard separates paid vs free | `ticket_type` column on `tickets` (purchased/guest_list), update sold tickets display and analytics queries |
| GSTL-16 | Email deliverability via SPF/DKIM/DMARC | Resend handles SPF and DKIM automatically on domain add; DMARC TXT record must be added to `resonatemotion.com` DNS |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@supabase/supabase-js` | ^2.97.0 | Auth admin API (`createUser`, `generateLink`), DB operations | Already installed. `auth.admin` requires service_role key (server-side only) |
| `resend` | ^6.9.2 | Email sending (invitation emails) | Already installed. Same `sendEmail()` pattern as existing ticket confirmation |
| `@react-email/components` | ^1.0.8 | Email template rendering | Already installed. Same `EmailLayout` + `BRAND` pattern |
| `qrcode` | ^1.5.4 | QR code generation for invitation emails | Already installed. Same `QRCode.toBuffer()` pattern as webhook |
| `papaparse` | ^5.4.x | Client-side CSV parsing for bulk import | De facto standard (~700k weekly downloads), zero dependencies, ~14kb, browser-native |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `posthog-node` | ^5.28.0 | Server-side event tracking for guest processing | Already installed. Track guest_added, guest_invited, guest_registered events |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| PapaParse | csv-parse/sync | csv-parse is Node.js only, PapaParse works client-side for immediate preview |
| PapaParse | Native FileReader + split | Handles quoted fields, BOM, encoding incorrectly -- CSV is deceptively complex |
| auth.admin.createUser | signUp | signUp triggers email confirmation flow and has stricter rate limits (30/hour); admin.createUser with email_confirm:true is immediate |

**Installation:**
```bash
npm install papaparse @types/papaparse
```

## Architecture Patterns

### Recommended Project Structure
```
src/
  app/
    (organizer)/organizer/events/[id]/
      guest-list/
        page.tsx              # Guest list management page (Server Component)
        GuestListClient.tsx   # Client component for interactive UI
        actions.ts            # Server actions: addGuest, removeGuest, processGuest, cloneGuestList
        CSVImport.tsx         # Client component for CSV upload/preview
    api/
      guest-list/
        process/route.ts      # API route for batch guest processing (long-running)
  emails/
    guest-invitation.tsx      # New invitation email template
  lib/
    guest-list/
      process-entry.ts        # Core logic: register user, create ticket, send email
      csv-validator.ts        # CSV validation and deduplication logic
supabase/
  migrations/
    YYYYMMDD_guest_list.sql   # New table + schema changes
```

### Pattern 1: Guest Entry Processing Pipeline
**What:** Each guest list entry goes through a deterministic pipeline: validate -> check existing user -> register or skip -> approve if needed -> create ticket -> send email -> update status.
**When to use:** Every time a guest is added (single or bulk).
**Example:**
```typescript
// Source: Codebase pattern from src/app/(admin)/admin/members/actions.ts
async function processGuestEntry(entry: GuestListEntry): Promise<ProcessResult> {
  const serviceClient = getServiceClient();

  // 1. Check if email already exists in profiles
  if (entry.email) {
    const { data: existingProfile } = await serviceClient
      .from("profiles")
      .select("id, status, email")
      .eq("email", entry.email)
      .single();

    if (existingProfile) {
      // Existing member: auto-approve if pending, then create ticket
      if (existingProfile.status === "pending") {
        await serviceClient
          .from("profiles")
          .update({ status: "approved", approved_via: "guest_list" })
          .eq("id", existingProfile.id);
      }
      // Create free ticket (check for duplicates first)
      const ticketId = await createFreeTicket(entry.event_id, entry.party_id, existingProfile.id);
      return { status: "ticket_created", profile_id: existingProfile.id, ticket_id: ticketId };
    }

    // 2. New user: create via admin API
    const { data: authUser, error: authError } = await serviceClient.auth.admin.createUser({
      email: entry.email,
      email_confirm: true,
      user_metadata: {
        full_name: `${entry.first_name} ${entry.last_name}`,
        guest_list_event_id: entry.event_id,
      },
    });

    if (authError) throw authError;

    // 3. Generate password-set link
    const { data: linkData } = await serviceClient.auth.admin.generateLink({
      type: "invite",
      email: entry.email,
    });

    // 4. Create free ticket
    const ticketId = await createFreeTicket(entry.event_id, entry.party_id, authUser.user.id);

    // 5. Send invitation email with QR + password link
    await sendGuestInvitation(entry, linkData, ticketId);

    return { status: "registered_and_invited", profile_id: authUser.user.id, ticket_id: ticketId };
  }

  // No email: entry stays as name-only for door check-in
  return { status: "name_only" };
}
```

### Pattern 2: Free Ticket Creation (Bypassing SumUp)
**What:** Create a ticket directly via service client INSERT, not through `reserve_ticket()` RPC (which expects SumUp payment data).
**When to use:** Guest list free tickets only.
**Example:**
```typescript
// Source: Adapted from existing reserve_ticket() logic
async function createFreeTicket(
  eventId: string,
  partyId: string | null,
  userId: string
): Promise<string> {
  const serviceClient = getServiceClient();

  // Check for existing ticket (same logic as reserve_ticket)
  const existingQuery = serviceClient
    .from("tickets")
    .select("id")
    .eq("event_id", eventId)
    .eq("user_id", userId);

  if (partyId) {
    existingQuery.eq("party_id", partyId);
  } else {
    existingQuery.is("party_id", null);
  }

  const { data: existing } = await existingQuery.single();
  if (existing) {
    return existing.id; // Already has a ticket, return it
  }

  // Insert free ticket directly
  const { data: ticket, error } = await serviceClient
    .from("tickets")
    .insert({
      event_id: eventId,
      party_id: partyId,
      tier_id: null, // Guest list tickets don't have a tier -- see schema notes below
      user_id: userId,
      sumup_checkout_id: null,
      sumup_transaction_code: null,
      amount_paid: 0,
      ticket_type: "guest_list",
    })
    .select("id")
    .single();

  if (error) throw error;
  return ticket.id;
}
```

**Schema note:** The `tier_id` column currently has `NOT NULL` constraint and FK to `ticket_tiers`. For guest list tickets, either: (a) create a special "Guest List" tier per event with `price: 0, quantity: null`, or (b) make `tier_id` nullable. Option (a) is cleaner because it preserves existing constraints and lets the tier be visible in the organizer's tier management UI. Decision: **create a "Guest List" tier automatically when the first guest is added.**

### Pattern 3: Modified handle_new_user() Trigger
**What:** Extend the trigger to check for guest list metadata and auto-approve.
**When to use:** This is the database migration, not application code.
**Example:**
```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  new_code text;
  chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  ref_code text;
  referrer_id uuid;
  new_status text;
  new_approved_via text;
  guest_list_match uuid;
BEGIN
  -- Generate membership code
  new_code := 'RSN-';
  FOR i IN 1..8 LOOP
    new_code := new_code || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  END LOOP;

  -- Check for guest list metadata (from admin.createUser)
  IF (new.raw_user_meta_data->>'guest_list_event_id') IS NOT NULL THEN
    new_status := 'approved';
    new_approved_via := 'guest_list';
  ELSE
    -- Check if email matches any guest list entry (organic registration)
    SELECT id INTO guest_list_match
    FROM public.guest_list_entries
    WHERE email = new.email AND status IN ('pending', 'invited')
    LIMIT 1;

    IF guest_list_match IS NOT NULL THEN
      new_status := 'approved';
      new_approved_via := 'guest_list';
      -- Update guest list entry status
      UPDATE public.guest_list_entries
      SET status = 'registered', profile_id = new.id
      WHERE id = guest_list_match;
    ELSE
      -- Standard referral check
      ref_code := new.raw_user_meta_data->>'referral_code';
      IF ref_code IS NOT NULL AND ref_code <> '' THEN
        SELECT id INTO referrer_id
        FROM public.profiles
        WHERE membership_code = ref_code AND status = 'approved';
      END IF;

      IF referrer_id IS NOT NULL THEN
        new_status := 'approved';
        new_approved_via := 'referral';
      ELSE
        new_status := 'pending';
        new_approved_via := NULL;
      END IF;
    END IF;
  END IF;

  INSERT INTO public.profiles (id, email, full_name, membership_code, role, status, referred_by, approved_via)
  VALUES (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    new_code,
    'member',
    new_status,
    referrer_id,
    new_approved_via
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### Anti-Patterns to Avoid
- **Modifying auth.users directly:** Never INSERT/UPDATE `auth.users` rows. Always use `supabase.auth.admin.*` methods.
- **Bypassing the trigger:** Do not use service_role to INSERT into profiles and skip the trigger. The trigger ensures consistency (membership code generation, referral tracking).
- **Creating tickets without duplicate checks:** Always check for existing ticket at the same event/party before INSERT. The unique index on `(party_id, user_id)` will catch this, but handle it gracefully.
- **Processing all CSV rows in a single Promise.all:** This overwhelms rate limits. Process sequentially or in small batches (5-10) with status tracking.
- **Sending emails synchronously in the request:** Use fire-and-forget pattern (same as existing `sendApprovalEmail` in admin/members/actions.ts).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| CSV parsing | Custom string.split() parser | PapaParse | Quoted fields, BOM markers, encoding detection, multiline values are all edge cases that break naive parsers |
| QR code generation | Canvas-based QR renderer | `qrcode` library (already installed) | Error correction levels, proper encoding, PNG/DataURL output |
| Email HTML rendering | String template literals | `@react-email/components` (already installed) | Consistent cross-client rendering, reusable EmailLayout, BRAND constants |
| User creation | Raw SQL INSERT into auth.users | `supabase.auth.admin.createUser()` | Handles password hashing, email confirmation, triggers, session management |
| Password reset links | Custom token generation | `supabase.auth.admin.generateLink({ type: 'invite' })` | Cryptographically secure, time-limited, handles redirect URLs |
| Email deduplication | Manual email comparison | SQL UNIQUE constraint on `(event_id, email)` + `ON CONFLICT DO NOTHING` | Race conditions, case sensitivity (use `LOWER(email)`) |

**Key insight:** The Supabase auth admin API and existing email infrastructure handle the hardest parts. The custom code is orchestration logic (check state, call API, update status), not crypto or auth protocol implementation.

## Common Pitfalls

### Pitfall 1: handle_new_user() Trigger Not Updated Before createUser Calls
**What goes wrong:** `auth.admin.createUser()` fires the `handle_new_user()` trigger which sets `status = 'pending'` for users without a referral code. Guest list users end up pending, defeating auto-approval.
**Why it happens:** Developer implements guest processing before updating the trigger, or forgets to deploy the migration.
**How to avoid:** The database migration adding `approved_via` column and updating `handle_new_user()` MUST be the FIRST task in this phase, before any application code.
**Warning signs:** Guest list users show as "pending" in admin members list despite being on a guest list.

### Pitfall 2: Duplicate Tickets for Existing Members
**What goes wrong:** Organizer adds an email to the guest list that belongs to an existing member who already bought a paid ticket. The system creates a second (free) ticket, and the member has two tickets for the same event.
**Why it happens:** The free ticket creation doesn't check for existing paid tickets.
**How to avoid:** Before creating a free ticket, ALWAYS check `tickets` table for existing ticket at the same event. If a paid ticket exists, mark the guest list entry as "already_has_ticket" and skip ticket creation.
**Warning signs:** Check-in shows duplicate entries; ticket count exceeds expected attendance.

### Pitfall 3: tier_id NOT NULL Constraint Blocks Free Tickets
**What goes wrong:** The `tickets.tier_id` column has a NOT NULL constraint with FK to `ticket_tiers`. Guest list tickets don't go through a tier selection flow.
**Why it happens:** The original schema assumed all tickets have a tier (because all tickets were purchased through a tier).
**How to avoid:** Create a dedicated "Guest List" tier per event (price: 0, quantity: null) automatically when the first guest is added. This preserves the FK constraint and makes guest list tickets visible in the tier management UI. The tier can be hidden from the public purchase UI.
**Warning signs:** INSERT fails with "null value in column tier_id violates not-null constraint."

### Pitfall 4: Resend Rate Limits on Bulk Guest Import
**What goes wrong:** Organizer imports 200 guests via CSV. System tries to send 200 invitation emails at once. Resend enforces 2 requests/second, so the operation fails after ~2 seconds.
**Why it happens:** Emails sent in a tight loop without throttling.
**How to avoid:** Process emails sequentially with a small delay (500ms) between each, or use Resend's batch API (up to 100 emails per call). Track `email_sent` status per entry so failed sends can be retried.
**Warning signs:** Resend returns 429 status codes; some guests receive invitations while others don't.

### Pitfall 5: Supabase Auth Admin Rate Limits on Bulk createUser
**What goes wrong:** Bulk import of 200 guests triggers 200 `auth.admin.createUser()` calls. Supabase hits its general rate limit (~30-50 requests before throttling).
**Why it happens:** Admin API has different rate limits from signup, but still has limits.
**How to avoid:** Process in batches of 10, with 2-second delay between batches. Track `registered` status per entry so the operation can resume. Show progress to the organizer.
**Warning signs:** createUser returns errors after ~30 successful calls; partial guest list processing.

### Pitfall 6: Email Case Sensitivity in Lookups
**What goes wrong:** Guest added as "John@Example.com" doesn't match existing profile with email "john@example.com".
**Why it happens:** PostgreSQL text comparison is case-sensitive by default.
**How to avoid:** Always normalize emails to lowercase before storage and comparison. Use `LOWER(email)` in queries and constraints. The `guest_list_entries` UNIQUE constraint should be on `(event_id, LOWER(email))`.
**Warning signs:** Duplicate entries for the same person with different email casing.

### Pitfall 7: Refund Flow Crashes on amount_paid = 0 Tickets
**What goes wrong:** The refund flow assumes all tickets have a SumUp transaction and `amount_paid > 0`. When it encounters a guest list ticket, it tries to initiate a SumUp refund for zero.
**Why it happens:** Refund logic was written before free tickets existed.
**How to avoid:** Add a guard in the refund flow: if `amount_paid === 0` or `ticket_type === 'guest_list'`, show "This is a complimentary ticket -- no refund needed" instead of the refund form.
**Warning signs:** SumUp API errors when processing "refund" for a free ticket.

## Code Examples

### Database Migration: guest_list_entries + Schema Changes
```sql
-- Source: Codebase analysis of existing migrations pattern

-- 1. Add approved_via to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS approved_via text
    CHECK (approved_via IN ('referral', 'guest_list', 'admin_manual'));

-- Backfill existing approved users
UPDATE public.profiles
SET approved_via = 'referral'
WHERE status = 'approved' AND referred_by IS NOT NULL AND approved_via IS NULL;

UPDATE public.profiles
SET approved_via = 'admin_manual'
WHERE status = 'approved' AND referred_by IS NULL AND approved_via IS NULL;

-- 2. Add ticket_type to tickets
ALTER TABLE public.tickets
  ADD COLUMN IF NOT EXISTS ticket_type text NOT NULL DEFAULT 'purchased'
    CHECK (ticket_type IN ('purchased', 'guest_list'));

-- 3. Make tier_id nullable for guest list tickets
ALTER TABLE public.tickets ALTER COLUMN tier_id DROP NOT NULL;

-- 4. Create guest_list_entries table
CREATE TABLE public.guest_list_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events ON DELETE CASCADE,
  party_id uuid REFERENCES public.event_parties ON DELETE CASCADE,
  first_name text NOT NULL,
  last_name text NOT NULL,
  email text,
  added_by uuid NOT NULL REFERENCES public.profiles(id),
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'invited', 'registered', 'ticket_issued', 'checked_in', 'already_has_ticket', 'failed')),
  profile_id uuid REFERENCES public.profiles(id),
  ticket_id uuid REFERENCES public.tickets(id),
  error_message text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Unique constraint: one entry per email per event (case-insensitive)
CREATE UNIQUE INDEX guest_list_entries_event_email_unique
  ON public.guest_list_entries (event_id, LOWER(email))
  WHERE email IS NOT NULL;

-- Indexes
CREATE INDEX idx_guest_list_event_id ON public.guest_list_entries (event_id);
CREATE INDEX idx_guest_list_email ON public.guest_list_entries (LOWER(email)) WHERE email IS NOT NULL;
CREATE INDEX idx_guest_list_status ON public.guest_list_entries (status);

-- RLS
ALTER TABLE public.guest_list_entries ENABLE ROW LEVEL SECURITY;

-- Organizer/master can manage guest lists
CREATE POLICY guest_list_select_admin ON public.guest_list_entries
  FOR SELECT USING ((SELECT public.is_admin_or_organizer()));

CREATE POLICY guest_list_insert_admin ON public.guest_list_entries
  FOR INSERT WITH CHECK ((SELECT public.is_admin_or_organizer()));

CREATE POLICY guest_list_update_admin ON public.guest_list_entries
  FOR UPDATE USING ((SELECT public.is_admin_or_organizer()));

CREATE POLICY guest_list_delete_admin ON public.guest_list_entries
  FOR DELETE USING ((SELECT public.is_admin_or_organizer()));

-- 5. Update handle_new_user() trigger (see Architecture Patterns section)
```

### Guest Invitation Email Template
```typescript
// Source: Based on existing src/emails/ticket-confirmation.tsx pattern
import { Button, Heading, Img, Text } from "@react-email/components";
import * as React from "react";
import { EmailLayout, BRAND } from "./components/email-layout";

interface GuestInvitationEmailProps {
  guestName: string;
  eventTitle: string;
  eventDate: string;
  eventTime: string;
  partyTitle?: string;
  claimUrl: string; // Password-set URL from generateLink
}

export function GuestInvitationEmail({
  guestName,
  eventTitle,
  eventDate,
  eventTime,
  partyTitle,
  claimUrl,
}: GuestInvitationEmailProps) {
  return (
    <EmailLayout preview={`You're invited to ${eventTitle}`}>
      <Heading style={{ color: BRAND.accent, fontSize: "24px", fontWeight: "bold", margin: "0 0 16px", fontFamily: "'Orbitron', 'Arial', sans-serif" }}>
        You're Invited, {guestName}
      </Heading>
      <Text style={{ color: BRAND.foreground, fontSize: "18px", fontWeight: "bold", lineHeight: "1.4", margin: "0 0 4px", fontFamily: "'Orbitron', 'Arial', sans-serif" }}>
        {eventTitle}
      </Text>
      <Text style={{ color: BRAND.muted, fontSize: "14px", lineHeight: "1.5", margin: "0 0 4px" }}>
        {partyTitle || ""}
      </Text>
      <Text style={{ color: BRAND.muted, fontSize: "14px", lineHeight: "1.5", margin: "0 0 24px" }}>
        {eventDate} &middot; {eventTime}
      </Text>
      <Img src="cid:ticket-qr" alt="Ticket QR Code" width="200" height="200" style={{ margin: "0 auto", display: "block" }} />
      <Text style={{ color: BRAND.muted, fontSize: "12px", lineHeight: "1.5", margin: "16px 0 24px", textAlign: "center" as const }}>
        Show this QR code at the door for entry
      </Text>
      <Button href={claimUrl} style={{ backgroundColor: BRAND.accent, color: "#ffffff", fontWeight: "bold", borderRadius: "9999px", padding: "12px 32px", fontSize: "14px", textDecoration: "none", display: "inline-block", fontFamily: "'Orbitron', 'Arial', sans-serif" }}>
        Set Your Password & Claim Account
      </Button>
    </EmailLayout>
  );
}
```

### CSV Validation Pattern
```typescript
// Source: PapaParse documentation + project patterns
import Papa from "papaparse";

interface CSVGuest {
  first_name: string;
  last_name: string;
  email?: string;
}

interface ValidationResult {
  valid: CSVGuest[];
  errors: { row: number; message: string }[];
  duplicates: { row: number; email: string }[];
}

export function parseAndValidateCSV(file: File): Promise<ValidationResult> {
  return new Promise((resolve) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => h.trim().toLowerCase().replace(/\s+/g, "_"),
      complete: (results) => {
        const valid: CSVGuest[] = [];
        const errors: { row: number; message: string }[] = [];
        const duplicates: { row: number; email: string }[] = [];
        const seenEmails = new Set<string>();

        results.data.forEach((row: Record<string, string>, idx: number) => {
          const rowNum = idx + 2; // +2 for header + 1-indexed
          const firstName = row.first_name?.trim() || row.name?.trim();
          const lastName = row.last_name?.trim() || row.surname?.trim();
          const email = row.email?.trim().toLowerCase();

          if (!firstName || !lastName) {
            errors.push({ row: rowNum, message: "Missing first_name or last_name" });
            return;
          }

          if (email) {
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
              errors.push({ row: rowNum, message: `Invalid email: ${email}` });
              return;
            }
            if (seenEmails.has(email)) {
              duplicates.push({ row: rowNum, email });
              return;
            }
            seenEmails.add(email);
          }

          valid.push({ first_name: firstName, last_name: lastName, email: email || undefined });
        });

        resolve({ valid, errors, duplicates });
      },
    });
  });
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `supabase.auth.signUp()` for programmatic registration | `supabase.auth.admin.createUser()` with `email_confirm: true` | Supabase v2 | No confirmation email sent, instant account, higher rate limits |
| Manual token generation for invite links | `auth.admin.generateLink({ type: 'invite' })` | Supabase v2 | Cryptographic tokens, automatic expiry, handles redirect |
| Resend individual sends in loop | Resend batch API (up to 100 per call) | Resend 2024 | Single API call for bulk, counts as 1 request against rate limit |
| All tickets require SumUp checkout | Direct INSERT for free tickets | This phase | New `ticket_type` column distinguishes purchased vs guest_list |

**Deprecated/outdated:**
- `supabase.auth.admin.inviteUserByEmail()`: Still works but `generateLink({ type: 'invite' })` gives more control over the email content (custom template vs Supabase default)
- PapaParse `react-papaparse` wrapper: Unnecessary in this project; direct PapaParse import is simpler and lighter

## Open Questions

1. **tier_id handling for guest list tickets**
   - What we know: `tier_id` is currently NOT NULL with FK to `ticket_tiers`. Free tickets need a tier to satisfy the constraint.
   - What's unclear: Should we make `tier_id` nullable or create a hidden "Guest List" tier?
   - Recommendation: Make `tier_id` nullable. This is simpler than auto-creating hidden tiers and avoids polluting the tier management UI. The `ticket_type` column already distinguishes guest list tickets. Update all queries that JOIN on tier to handle NULL.

2. **Guest list entry for users without email -- check-in flow**
   - What we know: NAV-04 requires the check-in page to show a unified attendee list. Currently it only shows ticket holders.
   - What's unclear: How to check in a name-only guest (no ticket, no QR code).
   - Recommendation: The attendee list API (`/api/tickets/attendance`) should be extended to include guest list entries without tickets. Add a separate check-in mechanism: organizer taps a guest name -> confirms check-in -> updates `guest_list_entries.status = 'checked_in'`. This is name-based, not QR-based.

3. **generateLink type: 'invite' vs 'recovery'**
   - What we know: `generateLink({ type: 'invite' })` creates a new user AND generates a link. `generateLink({ type: 'recovery' })` generates a password reset link for an existing user.
   - What's unclear: If we use `createUser()` first (to trigger the handle_new_user), then `generateLink({ type: 'invite' })`, does it create a duplicate user?
   - Recommendation: Use `createUser()` first, then `generateLink({ type: 'recovery' })` to generate the password-set link. The invite type also creates users, which would conflict. Recovery type works on existing users.

4. **Guest approval permanence**
   - What we know: GSTL-14 tracks `approved_via: guest_list` but doesn't specify if this is permanent.
   - What's unclear: Should guest-list-approved members keep permanent community access, or should it be event-scoped?
   - Recommendation: Per existing decisions, approval is permanent once granted (consistent with referral approval). The `approved_via` column tracks HOW they were approved for audit purposes only.

5. **Resend batch API vs sequential sends**
   - What we know: Resend batch API sends up to 100 emails per call. The free plan allows 3000 emails/month with 2 req/s rate limit.
   - What's unclear: Whether the batch API is available on the free plan.
   - Recommendation: Start with sequential sends (same pattern as existing `bulkApproveMember`), add 500ms delay between sends. If batch API is available, switch to it for 100+ guest imports.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Manual testing (no automated test framework detected in project) |
| Config file | none |
| Quick run command | `npm run build` (type checking) |
| Full suite command | `npm run build && npm run lint` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| GSTL-01 | Add guest to list | manual | Manual: organizer adds guest via form | N/A |
| GSTL-02 | View guest list with status | manual | Manual: check status display | N/A |
| GSTL-03 | Invitation email sent | manual | Manual: check Resend dashboard for sent email | N/A |
| GSTL-04 | Auto-registration | manual | Manual: verify profile created with status=approved | N/A |
| GSTL-05 | Free ticket for approved member | manual | Manual: check ticket exists with amount_paid=0 | N/A |
| GSTL-06 | Auto-approve pending member | manual | Manual: verify status change from pending to approved | N/A |
| GSTL-07 | Remove guest with warning | manual | Manual: remove guest, verify warning if ticket exists | N/A |
| GSTL-08 | Per-party assignment | manual | Manual: add guest to specific party, verify party_id | N/A |
| GSTL-09 | Email match auto-approval | manual | Manual: register with guest-list email, verify auto-approved | N/A |
| GSTL-10 | CSV import | manual | Manual: upload CSV, verify parse/validate/preview/import | N/A |
| GSTL-11 | Clone guest list | manual | Manual: clone from previous event, verify entries copied | N/A |
| GSTL-12 | Name lookup check-in | manual | Manual: search name at door, check in without QR | N/A |
| GSTL-13 | Invitation with password link | manual | Manual: click link in email, set password, login | N/A |
| GSTL-14 | approved_via tracking | manual | Manual: check profile approved_via column in DB | N/A |
| GSTL-15 | ticket_type separation | manual | Manual: check sold tickets list shows paid vs free | N/A |
| GSTL-16 | SPF/DKIM/DMARC | manual | Manual: use mail-tester.com or MXToolbox to verify records | N/A |

### Sampling Rate
- **Per task commit:** `npm run build` (catches type errors)
- **Per wave merge:** `npm run build && npm run lint`
- **Phase gate:** Full manual regression on critical flows

### Wave 0 Gaps
- None -- no automated test infrastructure to scaffold. Build verification is sufficient for this project.

## Sources

### Primary (HIGH confidence)
- Codebase analysis: `supabase/migrations/20260225000000_phase3_referral.sql` (handle_new_user trigger)
- Codebase analysis: `supabase/migrations/20260225110000_phase6_ticketing.sql` (tickets schema, reserve_ticket RPC)
- Codebase analysis: `supabase/migrations/20260226300000_multi_sub_events.sql` (party_id nullable, unique constraints)
- Codebase analysis: `src/app/api/webhooks/sumup/route.ts` (ticket creation + email flow)
- Codebase analysis: `src/app/(admin)/admin/members/actions.ts` (member approval + email pattern)
- Codebase analysis: `src/lib/email.ts` (Resend sendEmail utility)
- Codebase analysis: `src/utils/qr.ts` (QR generation + HMAC signing)
- Codebase analysis: `src/types/database.ts` (Ticket, Profile, EventParty interfaces)
- Codebase analysis: `src/app/api/tickets/attendance/route.ts` (attendee list API)
- [Supabase auth.admin.createUser docs](https://supabase.com/docs/reference/javascript/auth-admin-createuser)
- [Supabase auth.admin.generateLink docs](https://supabase.com/docs/reference/javascript/auth-admin-generatelink)

### Secondary (MEDIUM confidence)
- [Supabase Auth Rate Limits](https://supabase.com/docs/guides/auth/rate-limits) - admin API limits not explicitly documented but general limits apply
- [Resend Rate Limits and Quotas](https://resend.com/docs/knowledge-base/account-quotas-and-limits) - 2 req/s, 3000/month free
- [PapaParse Documentation](https://www.papaparse.com/docs) - CSV parsing API
- [Resend DMARC Setup](https://resend.com/docs/dashboard/domains/dmarc) - SPF/DKIM auto-handled, DMARC manual

### Tertiary (LOW confidence)
- Supabase auth admin createUser rate limits (~30-50 before general throttle) - based on community reports, not official docs
- Resend batch API availability on free plan - not confirmed in documentation

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - all libraries already installed except PapaParse, APIs documented
- Architecture: HIGH - patterns extend existing codebase (same server action structure, same email pattern, same service client usage)
- Pitfalls: HIGH - 7 pitfalls identified from direct codebase analysis of trigger, schema, and payment flow
- Database schema: HIGH - analyzed all relevant migrations and existing constraints
- Auth admin API: MEDIUM - API is documented but rate limits for admin operations are not explicitly stated
- Email deliverability (SPF/DKIM/DMARC): MEDIUM - Resend auto-handles SPF/DKIM, DMARC needs DNS verification

**Research date:** 2026-03-09
**Valid until:** 2026-04-09 (stable APIs, no major version changes expected)
