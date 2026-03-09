-- Guest List Management: schema migration
-- Phase 24, Plan 01: Database foundation
--
-- Changes:
-- 1. Add approved_via column to profiles
-- 2. Add ticket_type column to tickets
-- 3. Make tier_id nullable on tickets
-- 4. Create guest_list_entries table with indexes, unique constraint, and RLS
-- 5. Update handle_new_user() trigger for guest list auto-approval

BEGIN;

-- =============================================================================
-- 1. Add approved_via to profiles
-- =============================================================================
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

-- =============================================================================
-- 2. Add ticket_type to tickets
-- =============================================================================
ALTER TABLE public.tickets
  ADD COLUMN IF NOT EXISTS ticket_type text NOT NULL DEFAULT 'purchased'
    CHECK (ticket_type IN ('purchased', 'guest_list'));

-- =============================================================================
-- 3. Make tier_id nullable on tickets (guest list tickets have no tier)
-- =============================================================================
ALTER TABLE public.tickets ALTER COLUMN tier_id DROP NOT NULL;

-- =============================================================================
-- 4. Create guest_list_entries table
-- =============================================================================
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

-- =============================================================================
-- 4b. RLS policies for guest_list_entries
-- =============================================================================
ALTER TABLE public.guest_list_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY guest_list_select_admin ON public.guest_list_entries
  FOR SELECT USING ((SELECT public.is_admin_or_organizer()));

CREATE POLICY guest_list_insert_admin ON public.guest_list_entries
  FOR INSERT WITH CHECK ((SELECT public.is_admin_or_organizer()));

CREATE POLICY guest_list_update_admin ON public.guest_list_entries
  FOR UPDATE USING ((SELECT public.is_admin_or_organizer()));

CREATE POLICY guest_list_delete_admin ON public.guest_list_entries
  FOR DELETE USING ((SELECT public.is_admin_or_organizer()));

-- =============================================================================
-- 5. Update handle_new_user() trigger
-- =============================================================================
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
    WHERE LOWER(email) = LOWER(new.email) AND status IN ('pending', 'invited')
    LIMIT 1;

    IF guest_list_match IS NOT NULL THEN
      new_status := 'approved';
      new_approved_via := 'guest_list';
      -- Update guest list entry status
      UPDATE public.guest_list_entries
      SET status = 'registered', profile_id = new.id, updated_at = now()
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

COMMIT;
