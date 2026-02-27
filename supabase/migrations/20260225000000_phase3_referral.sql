-- Phase 3: Referral & Approval System Migration
-- Adds referred_by column and updates handle_new_user trigger with referral logic
-- Run in Supabase SQL Editor as a single transaction

BEGIN;

-- ============================================================
-- Step 1: Add referred_by column (self-referencing FK)
-- ============================================================
-- Tracks which approved member referred this user.
-- ON DELETE SET NULL: if the referrer's account is deleted, the referred
-- member keeps their account but the referral link becomes NULL.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS referred_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

-- ============================================================
-- Step 2: Update handle_new_user trigger with referral logic
-- ============================================================
-- Reads referral_code from auth metadata, resolves referrer by membership_code,
-- and sets status accordingly:
--   - Valid referral (approved member's membership_code) -> status = 'approved'
--   - No referral / invalid code / referrer not approved -> status = 'pending'
--
-- NOTE: DDL column default is 'approved' but this trigger body explicitly sets
-- status. If this trigger fails to set status, the column default kicks in as
-- a safe fallback.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  new_code text;
  chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  ref_code text;
  referrer_id uuid;
  new_status text;
BEGIN
  -- Generate membership code (RSN- prefix + 8 random chars)
  new_code := 'RSN-';
  FOR i IN 1..8 LOOP
    new_code := new_code || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  END LOOP;

  -- Read referral code from signup metadata
  ref_code := new.raw_user_meta_data->>'referral_code';

  -- Resolve referrer: must be an approved member with matching membership_code
  IF ref_code IS NOT NULL AND ref_code <> '' THEN
    SELECT id INTO referrer_id
    FROM public.profiles
    WHERE membership_code = ref_code AND status = 'approved';
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

COMMIT;
