# Phase 3: Referral & Approval System - Research

**Researched:** 2026-02-24
**Domain:** Supabase auth metadata, referral link system, admin bulk actions, Next.js App Router registration flow
**Confidence:** HIGH

## Summary

Phase 3 implements a trust-gated community access system. The core technical challenges are: (1) passing a referral code through the Supabase email-confirmation signup flow, (2) adding a `referred_by` column to the profiles table and wiring it into the `handle_new_user` trigger, (3) extending the existing MemberTable component to support a pending tab, bulk approve/reject, and expandable detail rows, and (4) displaying the referral link on the dashboard and membership card pages.

The existing codebase is well-structured for these additions. The `handle_new_user` trigger already reads `new.raw_user_meta_data`, the `MemberTable` component has placeholder columns for "Referred By" and "Events," and the middleware already resolves role/status from the profiles table. The existing `membership_code` (format `RSN-XXXXXXXX`) is ideal for reuse as the referral code -- no separate code generation needed.

**Primary recommendation:** Reuse the existing `membership_code` as the referral code. Pass it through the signup flow via `raw_user_meta_data.referral_code`, then resolve the referrer in the `handle_new_user` trigger and set `status` accordingly. Extend the existing admin actions to support organizer approval (not just master) and add bulk operations.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Referral link visible in TWO places: member's dashboard page AND membership card page
- Only approved members get a referral link -- pending/rejected members cannot invite anyone
- Referral link redirects straight to /register with referral code pre-filled -- no intermediate welcome/landing page
- Registration form looks identical whether referred or not -- no visual indication of referral code being used
- Referred users get standard welcome messaging -- no mention of who referred them
- Non-referred users redirect to /dashboard after signup which shows the existing "pending approval" message (built in Phase 2)
- Default new user status stays "approved" for now -- do NOT change the handle_new_user trigger default yet. The referral detection logic sets status based on whether a valid referral code was provided, but the trigger default remains "approved" so existing manual signups aren't broken. This can be flipped to "pending" by the master later or in a future update.
- Approval queue lives as a tab/filter on the EXISTING /admin/members and /organizer/members pages -- not a separate page
- Both master AND organizers can approve/reject pending members
- Bulk approve/reject supported: checkboxes on pending members with "Approve selected" / "Reject selected" buttons
- Pending member info shown: name, email, signup date -- no Instagram or social media fields
- No Instagram/social field on registration form
- Referral tracking is admin-only -- members do NOT see who they've referred
- "Referred by" info shown in an expandable member detail row (not as a column in the main table)
- Referral count per member shown in the expandable detail: "Referred X members"
- Expandable detail also includes attendance context (events attended, attendance count) for a fuller admin picture
- The existing MemberTable component from Phase 2 should be extended (not replaced) to support the pending tab, bulk actions, and expandable detail rows
- Phase 2's handle_new_user trigger defaults to status='approved' -- the referral system should set status at registration time based on referral code presence, not change the trigger default

### Claude's Discretion
- Referral link format (reuse membership_code vs separate referral code)
- Referral code storage approach (new column, separate table, or reuse existing field)
- Expandable row implementation pattern (accordion, modal, slide-out)
- How to wire referral detection into the registration/auth callback flow
- Tab/filter implementation on the existing member management pages
- Bulk action UI pattern (toolbar, sticky footer, inline buttons)

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| REFR-01 | Each approved member has a unique referral link (e.g. /join?ref=RSN-XXXXXXXX using membership_code) | Reuse existing `membership_code` column -- already unique, already generated. Link format: `/register?ref=RSN-XXXXXXXX`. See Architecture Pattern 1. |
| REFR-02 | Members can view and copy their referral link from their profile/dashboard | Add referral link section to dashboard page (approved state) and membership card page. See Architecture Pattern 3. |
| REFR-03 | Registration form accepts referral code from URL parameter | Read `ref` searchParam in register page, store in hidden state, pass via `signUp({ options: { data: { referral_code } } })`. See Architecture Pattern 2. |
| REFR-04 | Users who register via valid referral link are automatically set to status "approved" | The `handle_new_user` trigger resolves `referral_code` from `new.raw_user_meta_data`, looks up the referrer profile, and sets `status='approved'` + `referred_by` if valid. See Architecture Pattern 1. |
| REFR-05 | Users who register without referral link are set to status "pending" | Same trigger: when `referral_code` is NULL or invalid, set `status='pending'`. Trigger default stays `'approved'` in DDL but the trigger body overrides it. See Common Pitfall 1 for the nuance. |
| REFR-06 | Referral relationship tracked in profile (referred_by field) | Add `referred_by UUID REFERENCES public.profiles(id)` column to profiles. Set in `handle_new_user` trigger. See Schema Migration section. |
| APPR-01 | Pending members can browse published events but cannot RSVP, buy tickets, or upload media | Already enforced by Phase 2 RLS policies (`rsvps_insert_approved` requires `status='approved'`). Middleware blocks `/membership-card` and `/attendance` for non-approved. No new work needed beyond verifying existing enforcement. |
| APPR-02 | Master user and Organizers see a list of pending members awaiting approval | Extend MemberTable with a "Pending" tab/filter preset that auto-filters to `status='pending'`. See Architecture Pattern 4. |
| APPR-03 | Master user and Organizers can approve or reject pending members | Extend server actions: create `approveMember` and `rejectMember` actions callable by both master and organizer (update `verifyMaster` -> `verifyAdminOrOrganizer`). Add bulk variants. See Architecture Pattern 5. |
</phase_requirements>

## Standard Stack

### Core (already installed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js | 16.1.6 | App Router, Server Components, Server Actions | Project framework |
| @supabase/supabase-js | 2.97.0 | Supabase client, auth, database | Project ORM/auth |
| @supabase/ssr | 0.8.0 | Server-side Supabase client with cookie handling | SSR auth |
| React | 19.2.3 | UI framework | Project framework |
| Tailwind CSS | 4.x | Styling | Project styling |

### Supporting (already installed)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| qrcode | 1.5.4 | QR code generation for membership cards | Already used in MembershipCardView |

### No New Dependencies Needed

This phase requires zero new npm packages. All functionality is achievable with the existing stack:
- Referral code reuses existing `membership_code` -- no nanoid needed
- URL parameter reading uses Next.js built-in `searchParams`
- Clipboard API is a browser native (`navigator.clipboard.writeText`)
- Bulk selection is standard React state management
- Expandable rows are CSS/state toggles

## Architecture Patterns

### Recommended Changes Overview
```
supabase/
  migrations/
    20260224_phase3_referral.sql    # New migration: add referred_by, update trigger
  schema.sql                        # Updated canonical schema

src/
  app/
    (auth)/register/page.tsx        # MODIFY: read ?ref param, pass to signUp metadata
    (members)/dashboard/page.tsx    # MODIFY: add referral link for approved members
    (members)/membership-card/page.tsx  # MODIFY: add referral link section
    (admin)/admin/members/
      page.tsx                      # MODIFY: pass showActions=true (already done), fetch referred_by data
      actions.ts                    # MODIFY: add approveMember/rejectMember/bulkApprove/bulkReject, update auth check
    (organizer)/organizer/members/
      page.tsx                      # MODIFY: pass showActions=true, fetch referred_by data
    api/auth/callback/route.ts      # No changes needed
  components/
    admin/MemberTable.tsx           # MODIFY: add pending tab, bulk checkboxes, expandable rows
  lib/supabase/middleware.ts        # No changes needed (already resolves status)
  types/database.ts                 # MODIFY: add referred_by to Profile type
```

### Pattern 1: Referral Code via Supabase Auth Metadata (CRITICAL PATH)

**What:** Pass the referral code through the signup flow using `raw_user_meta_data`, then resolve it in the `handle_new_user` PostgreSQL trigger.

**Why this approach:** The `handle_new_user` trigger fires on `auth.users` INSERT and has access to `new.raw_user_meta_data`. This is the only reliable point to set `status` and `referred_by` atomically during user creation -- no race conditions, no separate API call needed.

**Registration page changes:**
```typescript
// src/app/(auth)/register/page.tsx
// Read referral code from URL (client component uses useSearchParams)
import { useSearchParams } from "next/navigation";

// Inside component:
const searchParams = useSearchParams();
const referralCode = searchParams.get("ref") || "";

// Pass in signUp call:
const { error } = await supabase.auth.signUp({
  email,
  password,
  options: {
    data: {
      full_name: fullName,
      referral_code: referralCode || undefined,  // Only include if present
    },
  },
});
```

**Updated handle_new_user trigger:**
```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  new_code text;
  chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  ref_code text;
  referrer_id uuid;
  new_status text;
BEGIN
  -- Generate membership code
  new_code := 'RSN-';
  FOR i IN 1..8 LOOP
    new_code := new_code || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  END LOOP;

  -- Resolve referral code
  ref_code := new.raw_user_meta_data->>'referral_code';

  IF ref_code IS NOT NULL AND ref_code <> '' THEN
    -- Look up the referrer by membership_code, must be approved
    SELECT id INTO referrer_id
    FROM public.profiles
    WHERE membership_code = ref_code
      AND status = 'approved';
  END IF;

  -- Set status based on referral validity
  IF referrer_id IS NOT NULL THEN
    new_status := 'approved';
  ELSE
    new_status := 'pending';
  END IF;

  INSERT INTO public.profiles (id, email, full_name, membership_code, role, status, referred_by)
  VALUES (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    new_code,
    'member',
    new_status,
    referrer_id
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**Key insight:** The trigger default in the DDL column definition stays `'approved'` (as user decided), but the trigger function body explicitly sets status based on referral code presence. The DDL default is only used if the trigger somehow fails to set status, which provides a safe fallback.

**Confidence:** HIGH -- `raw_user_meta_data` access in triggers is a well-documented Supabase pattern. The existing trigger already uses `new.raw_user_meta_data->>'full_name'` successfully.

### Pattern 2: Referral Link URL Structure

**What:** Use `/register?ref=RSN-XXXXXXXX` as the referral link format.

**Why not `/join?ref=...`:** REFR-01 suggests `/join?ref=`, but creating a `/join` route just to redirect to `/register?ref=` adds unnecessary complexity. The user decision says "Referral link redirects straight to /register with referral code pre-filled." Using `/register?ref=` directly is simpler and matches the decision.

**Link format:** `{NEXT_PUBLIC_APP_URL}/register?ref={membership_code}`

**Confidence:** HIGH -- direct match with user decision.

### Pattern 3: Referral Link Display (Dashboard + Membership Card)

**What:** Show the referral link with a copy button for approved members on both the dashboard and membership card pages.

**Dashboard integration:**
```typescript
// In the approved state section of dashboard (where membership card link is)
// Add a new card below the existing ones:
<div className="rounded-2xl border border-card-border bg-card p-5">
  <p className="text-sm text-muted">Invite a friend</p>
  <div className="mt-2 flex items-center gap-2">
    <input
      readOnly
      value={referralLink}
      className="flex-1 truncate rounded-lg border border-card-border bg-background px-3 py-2 text-sm text-muted"
    />
    <button onClick={handleCopy} className="...">
      {copied ? "Copied!" : "Copy"}
    </button>
  </div>
</div>
```

**Membership card integration:** Add a similar section below the card, before the "How to use your card" section.

**Data requirement:** Both pages need to fetch `membership_code` from the profiles table. The membership card page already has a TODO for this (`const membershipCode = "RSN-DEMO1234"`). Phase 3 should fix this by fetching from the database.

**Clipboard API pattern:**
```typescript
const [copied, setCopied] = useState(false);
const handleCopy = async () => {
  await navigator.clipboard.writeText(referralLink);
  setCopied(true);
  setTimeout(() => setCopied(false), 2000);
};
```

**Confidence:** HIGH -- standard browser API, no library needed.

### Pattern 4: Pending Tab / Filter Preset on Admin Pages

**What:** Add tab-style filter buttons (All / Pending / Approved / Rejected) above the existing filter controls on the member management pages.

**Implementation approach:** Add a `statusTab` state that pre-sets the `statusFilter`. Tabs are visually styled buttons, not browser tabs. The "Pending" tab shows a badge count.

```typescript
// Tab bar above filters
<div className="mb-4 flex gap-2">
  {["all", "pending", "approved", "rejected"].map((tab) => (
    <button
      key={tab}
      onClick={() => setStatusTab(tab)}
      className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
        statusTab === tab
          ? "bg-accent text-white"
          : "bg-card text-muted hover:text-foreground"
      }`}
    >
      {tab === "pending" ? `Pending (${pendingCount})` : capitalize(tab)}
    </button>
  ))}
</div>
```

**Key detail:** When "Pending" tab is active, the existing `statusFilter` dropdown should be hidden or synced to avoid conflicting filters.

**Confidence:** HIGH -- simple state management extension of existing filter pattern.

### Pattern 5: Bulk Approve/Reject

**What:** Add checkboxes to member rows (only visible when "Pending" tab is active) with a toolbar showing "Approve selected" and "Reject selected" buttons.

**State management:**
```typescript
const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

// Header checkbox (select all visible)
const toggleAll = () => {
  if (selectedIds.size === filtered.length) {
    setSelectedIds(new Set());
  } else {
    setSelectedIds(new Set(filtered.map(m => m.id)));
  }
};
```

**Server action for bulk operations:**
```typescript
// actions.ts
export async function bulkApproveMember(memberIds: string[]) {
  const supabase = await createClient();
  await verifyAdminOrOrganizer(supabase);

  const { error } = await supabase
    .from("profiles")
    .update({ status: "approved" })
    .in("id", memberIds);

  if (error) throw new Error(`Bulk approve failed: ${error.message}`);

  revalidatePath("/admin/members");
  revalidatePath("/organizer/members");
  return { success: true };
}
```

**Toolbar pattern:** Sticky bar at the top of the table area (not a footer) that appears only when items are selected:
```typescript
{selectedIds.size > 0 && (
  <div className="mb-4 flex items-center gap-3 rounded-xl border border-accent/30 bg-accent/5 px-4 py-3">
    <span className="text-sm font-medium">{selectedIds.size} selected</span>
    <button onClick={handleBulkApprove} className="...">Approve selected</button>
    <button onClick={handleBulkReject} className="...">Reject selected</button>
  </div>
)}
```

**Confidence:** HIGH -- standard React pattern, no library needed.

### Pattern 6: Expandable Member Detail Row

**What:** Clicking a member row expands an accordion section showing: referred by, referral count, and attendance context.

**Implementation:** Use a `expandedId` state (only one row expanded at a time). When a row is clicked, toggle the expanded section below it.

```typescript
const [expandedId, setExpandedId] = useState<string | null>(null);

// In the table body, after each <tr>:
{expandedId === member.id && (
  <tr>
    <td colSpan={showActions ? 8 : 7} className="px-4 py-4 bg-card/20">
      <div className="grid grid-cols-3 gap-4 text-sm">
        <div>
          <p className="text-muted">Referred by</p>
          <p>{member.referrer_name || "Direct signup"}</p>
        </div>
        <div>
          <p className="text-muted">Referred members</p>
          <p>{member.referral_count}</p>
        </div>
        <div>
          <p className="text-muted">Events attended</p>
          <p>{member.attendance_count}</p>
        </div>
      </div>
    </td>
  </tr>
)}
```

**Data fetching:** The admin/organizer pages need to fetch additional data:
```typescript
// Fetch referrer info via a left join or separate query
const { data: members } = await supabase
  .from("profiles")
  .select(`
    id, email, full_name, role, status, membership_code, created_at, referred_by,
    referrer:profiles!referred_by(full_name)
  `)
  .order("created_at", { ascending: false });

// Fetch referral counts (how many people each member referred)
const { data: referralCounts } = await supabase
  .rpc("get_referral_counts");  // Or use a subquery/view
```

**Simpler approach (no RPC):** Compute referral counts client-side from the member list:
```typescript
const referralCountMap = new Map<string, number>();
members.forEach(m => {
  if (m.referred_by) {
    referralCountMap.set(m.referred_by, (referralCountMap.get(m.referred_by) || 0) + 1);
  }
});
```

**Confidence:** HIGH for accordion pattern, MEDIUM for attendance data (depends on Phase 5 attendances table being populated -- for now show 0 or "N/A" as placeholder).

### Anti-Patterns to Avoid
- **Separate referral codes table:** Overengineering. The `membership_code` is already unique per member and serves as the referral code.
- **Client-side referral validation:** Never validate the referral code on the client. The trigger does it server-side, ensuring atomic status assignment.
- **Changing the trigger DEFAULT:** The user explicitly decided the DDL default stays `'approved'`. The trigger body handles status assignment. Do NOT alter the column default.
- **Creating a /join route:** The user decided the link redirects straight to /register. No landing page, no intermediate route.

## Schema Migration

### New Column: referred_by

```sql
-- Add referred_by column to profiles
ALTER TABLE public.profiles
  ADD COLUMN referred_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL;
```

**Why ON DELETE SET NULL:** If the referrer's account is deleted, the referred member should not be affected. The referral history is preserved as NULL (orphaned) rather than cascading deletion.

### Updated handle_new_user Trigger

See Pattern 1 above for the full trigger. Key changes from Phase 2:
1. Reads `referral_code` from `new.raw_user_meta_data`
2. Looks up referrer by `membership_code` (must be `status='approved'`)
3. Sets `status='approved'` if referrer found, `status='pending'` if not
4. Sets `referred_by` to referrer's UUID if found

### Updated RLS Policies

No new RLS policies needed. The existing `profiles_update_master` policy allows master to update any profile. However, organizers currently cannot update profiles (only master can via `profiles_update_master`). Phase 3 needs a new policy:

```sql
-- Organizers can update member status (for approve/reject)
CREATE POLICY profiles_update_organizer ON public.profiles
  FOR UPDATE USING (
    (SELECT public.get_user_role()) = 'organizer'
  )
  WITH CHECK (
    -- Organizers can only change status, not role
    role = (SELECT role FROM public.profiles WHERE id = profiles.id)
  );
```

**Alternative approach:** Use a service-role client in the server actions (bypassing RLS), similar to how master promotion works in the auth callback. This is simpler and avoids complex RLS policies. **Recommendation: Use service-role client** for approve/reject actions, consistent with existing pattern.

### Updated TypeScript Types

```typescript
// src/types/database.ts
export interface Profile {
  id: string;
  email: string;
  full_name: string;
  membership_code: string;
  role: UserRole;
  status: UserStatus;
  referred_by: string | null;  // NEW
  created_at: string;
  updated_at: string;
}
```

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Referral code generation | Custom UUID/nanoid code | Existing `membership_code` | Already unique, already generated per user, already in RSN-XXXXXXXX format |
| Clipboard copy | Custom clipboard utility | `navigator.clipboard.writeText()` | Browser native API, supported in all modern browsers |
| Referral code validation | API endpoint for validation | PostgreSQL trigger lookup | Atomic with user creation, no race conditions, no extra round trip |
| Bulk operations | Custom batch processing | Supabase `.in()` filter | Single query updates multiple rows efficiently |
| Tab/filter UI | Tab library (Radix, Headless UI) | Simple button group with state | Three buttons don't need a library; existing Tailwind classes suffice |

**Key insight:** This phase has zero new dependencies. Every feature builds on existing infrastructure: the membership_code, the handle_new_user trigger, the MemberTable component, the server actions pattern, and the middleware status enforcement.

## Common Pitfalls

### Pitfall 1: Trigger Default vs. Trigger Body Status Assignment
**What goes wrong:** Confusion between the column DEFAULT ('approved') and the status set by the trigger body. If the trigger body has a bug and fails to set status, the DEFAULT kicks in and every user becomes 'approved' -- bypassing the referral gate entirely.
**Why it happens:** The user explicitly decided to keep the DDL default as 'approved' for backward compatibility with manual signups.
**How to avoid:** Ensure the trigger body ALWAYS explicitly sets status (never omit it from the INSERT). Add a comment in the trigger explaining the intentional override of the column default.
**Warning signs:** New users appearing as 'approved' without a referrer in `referred_by`.

### Pitfall 2: Referral Code Not Persisting Through Email Confirmation
**What goes wrong:** The referral code is lost between signup and email confirmation because it's stored only in client state.
**Why it happens:** Supabase email confirmation creates the user on signup (INSERT into auth.users triggers `handle_new_user`), but the user isn't authenticated until they click the confirmation link. The `raw_user_meta_data` is stored at signup time, NOT at confirmation time.
**How to avoid:** This is actually NOT a problem. The trigger fires on INSERT (signup), not on confirmation. The `raw_user_meta_data` including `referral_code` is available immediately. Status is set correctly at signup time. No extra work needed.
**Warning signs:** None -- this is a non-issue but worth documenting to prevent unnecessary "fixes."

### Pitfall 3: Organizer Approve/Reject Blocked by RLS
**What goes wrong:** Organizer server actions fail with permission errors because the `profiles_update_master` policy only allows master updates.
**Why it happens:** Phase 2 only implemented master-level update policies. The organizer can read all profiles but cannot update them.
**How to avoid:** Use a service-role Supabase client (bypassing RLS) in approve/reject server actions, gated by application-level role verification. This matches the existing pattern in `auth/callback/route.ts`.
**Warning signs:** "Row level security policy violation" errors when organizers try to approve members.

### Pitfall 4: MembershipCardPage Uses Hardcoded membership_code
**What goes wrong:** The referral link shows "RSN-DEMO1234" instead of the real code.
**Why it happens:** The membership card page has `const membershipCode = "RSN-DEMO1234"` -- a Phase 2 TODO that was never resolved.
**How to avoid:** Fetch the actual `membership_code` from the profiles table. This is a prerequisite for showing the referral link on the membership card page.
**Warning signs:** All referral links from the membership card page pointing to the same demo code.

### Pitfall 5: Bulk Actions and Stale UI State
**What goes wrong:** After bulk approve/reject, the selected checkboxes remain checked on rows that no longer match the pending filter.
**Why it happens:** `revalidatePath` triggers a server re-render but client state (`selectedIds`) persists.
**How to avoid:** Clear `selectedIds` after bulk action completes. Use `startTransition` to ensure the UI update is batched with the server revalidation.
**Warning signs:** Phantom checkboxes on rows that moved from "pending" to "approved."

### Pitfall 6: Self-Referral Loop
**What goes wrong:** A user could theoretically construct a referral link using their own membership code and re-register with the same email.
**Why it happens:** No explicit check for self-referral in the trigger.
**How to avoid:** This is a non-issue in practice. Supabase auth prevents duplicate email registrations. A new user doesn't have a membership_code yet (it's generated during signup), so they can't self-refer. But if paranoia is warranted, add a check that `referrer_id <> new.id` in the trigger.

## Code Examples

### Migration SQL (verified pattern from existing codebase)
```sql
-- Phase 3: Referral System Migration
BEGIN;

-- Step 1: Add referred_by column
ALTER TABLE public.profiles
  ADD COLUMN referred_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Step 2: Update handle_new_user trigger to handle referral codes
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  new_code text;
  chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  ref_code text;
  referrer_id uuid;
  new_status text;
BEGIN
  -- Generate membership code (same logic as Phase 2)
  new_code := 'RSN-';
  FOR i IN 1..8 LOOP
    new_code := new_code || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  END LOOP;

  -- Resolve referral code from signup metadata
  ref_code := new.raw_user_meta_data->>'referral_code';

  IF ref_code IS NOT NULL AND ref_code <> '' THEN
    SELECT id INTO referrer_id
    FROM public.profiles
    WHERE membership_code = ref_code
      AND status = 'approved';
  END IF;

  -- Set status: approved if valid referral, pending otherwise
  IF referrer_id IS NOT NULL THEN
    new_status := 'approved';
  ELSE
    new_status := 'pending';
  END IF;

  INSERT INTO public.profiles (id, email, full_name, membership_code, role, status, referred_by)
  VALUES (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    new_code,
    'member',
    new_status,
    referrer_id
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMIT;
```

### Service-Role Client for Approve/Reject Actions
```typescript
// Pattern from existing auth/callback/route.ts
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

function getServiceClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// In server action:
export async function approveMember(memberId: string) {
  const supabase = await createClient();
  await verifyAdminOrOrganizer(supabase);  // Auth check with user's session

  const serviceClient = getServiceClient();  // Bypass RLS for the update
  const { error } = await serviceClient
    .from("profiles")
    .update({ status: "approved" })
    .eq("id", memberId);

  if (error) throw new Error(`Failed to approve: ${error.message}`);
  revalidatePath("/admin/members");
  revalidatePath("/organizer/members");
  return { success: true };
}
```

### Supabase Self-Referencing Join (for referrer name)
```typescript
// Fetch profiles with referrer name via Supabase foreign key join
const { data: members } = await supabase
  .from("profiles")
  .select(`
    id, email, full_name, role, status, membership_code, created_at, referred_by,
    referrer:profiles!referred_by(full_name)
  `)
  .order("created_at", { ascending: false });

// Result shape: { ...profile, referrer: { full_name: "John Doe" } | null }
```

### Copy-to-Clipboard with Feedback
```typescript
"use client";
import { useState } from "react";

function CopyReferralLink({ membershipCode }: { membershipCode: string }) {
  const [copied, setCopied] = useState(false);
  const referralLink = `${window.location.origin}/register?ref=${membershipCode}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const input = document.createElement("input");
      input.value = referralLink;
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="rounded-2xl border border-card-border bg-card p-5">
      <p className="text-sm text-muted">Invite a friend</p>
      <div className="mt-2 flex items-center gap-2">
        <input
          readOnly
          value={referralLink}
          className="flex-1 truncate rounded-lg border border-card-border bg-background px-3 py-2 text-sm font-mono text-muted"
        />
        <button
          onClick={handleCopy}
          className="shrink-0 rounded-lg border border-accent/40 px-3 py-2 text-sm font-medium text-accent transition-colors hover:bg-accent/10"
        >
          {copied ? "Copied!" : "Copy"}
        </button>
      </div>
    </div>
  );
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Separate referral codes table | Reuse membership_code | Phase 3 design decision | No schema bloat, single source of truth |
| Client-side referral validation | Trigger-level validation | Supabase pattern | Atomic, tamper-proof status assignment |
| Master-only approval | Master + Organizer approval | Phase 3 requirement | Broader approval authority via service-role client |
| Individual approve/reject | Bulk approve/reject | Phase 3 requirement | Efficient admin workflow |

## Open Questions

1. **Supabase self-referencing foreign key join syntax**
   - What we know: Supabase supports `profiles!referred_by(full_name)` syntax for self-joins via PostgREST
   - What's unclear: Whether this exact syntax works for self-referencing tables in the JS client (PostgREST normally uses the FK constraint name for disambiguation)
   - Recommendation: Test during implementation. Fallback: fetch referrer names in a separate query or compute client-side from the already-fetched member list.

2. **Attendance count in expandable detail**
   - What we know: The `attendances` table exists with `event_id` and `user_id`
   - What's unclear: Whether any attendance records exist yet (events/ticketing are Phase 5-6)
   - Recommendation: Show "0 events attended" as default. The query is simple (`SELECT COUNT(*) FROM attendances WHERE user_id = ?`), but since no attendance data exists yet, show the field as a placeholder. Phase 5 will populate it.

3. **Organizer members page: showActions currently false**
   - What we know: The organizer page passes `showActions={false}` to MemberTable. Phase 3 requires organizers to approve/reject.
   - What's unclear: Should organizers see ALL actions (promote/demote/deactivate) or only approve/reject?
   - Recommendation: Change to `showActions={true}` but with a new `role` prop to MemberTable that controls which actions are visible. Organizers see only approve/reject for pending members, not promote/demote/deactivate.

## Sources

### Primary (HIGH confidence)
- Supabase Auth signUp docs: https://supabase.com/docs/reference/javascript/auth-signup - Verified `options.data` metadata pattern
- Supabase User Management docs: https://supabase.com/docs/guides/auth/managing-user-data - Verified `raw_user_meta_data` trigger access
- Supabase Redirect URLs docs: https://supabase.com/docs/guides/auth/redirect-urls - Verified emailRedirectTo behavior
- Next.js useSearchParams docs: https://nextjs.org/docs/app/api-reference/functions/use-search-params - Verified client-side search params access
- Existing codebase: `handle_new_user` trigger, `MemberTable` component, `auth/callback/route.ts` service-role pattern

### Secondary (MEDIUM confidence)
- Supabase community discussion on signUp metadata: https://github.com/orgs/supabase/discussions/7113 - Confirmed metadata persistence through email confirmation
- Supabase community discussion on profile triggers: https://github.com/orgs/supabase/discussions/3491 - Confirmed trigger-based profile creation patterns

### Tertiary (LOW confidence)
- Self-referencing Supabase join syntax: Needs validation during implementation. PostgREST documentation suggests it works but exact client syntax for self-joins may need disambiguation hints.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Zero new dependencies, all existing libraries
- Architecture: HIGH - Builds directly on existing patterns (trigger metadata, service-role client, MemberTable extension)
- Schema migration: HIGH - Simple ALTER TABLE + trigger update, following Phase 2 migration pattern exactly
- Pitfalls: HIGH - Based on direct codebase analysis (found hardcoded membershipCode, identified RLS gap for organizers)
- Referral flow: HIGH - `raw_user_meta_data` access in triggers already proven by `full_name` field
- Self-referencing join: MEDIUM - Standard PostgREST feature but self-join syntax needs implementation verification

**Research date:** 2026-02-24
**Valid until:** 2026-03-24 (stable -- no fast-moving dependencies)
