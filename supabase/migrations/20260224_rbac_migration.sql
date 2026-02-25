-- Phase 2: Schema & RBAC Foundation Migration
-- Run in Supabase SQL Editor as a single transaction
-- Migrates from is_admin boolean to role-based access control

BEGIN;

-- ============================================================
-- Step 1: Add role and status columns with CHECK constraints
-- ============================================================
-- Using CHECK constraints (not native PostgreSQL ENUMs) for easier production modifications.
-- Default role='member', status='approved' so existing users remain fully functional.

ALTER TABLE public.profiles
  ADD COLUMN role text NOT NULL DEFAULT 'member'
    CHECK (role IN ('master', 'organizer', 'member')),
  ADD COLUMN status text NOT NULL DEFAULT 'approved'
    CHECK (status IN ('pending', 'approved', 'rejected'));

-- ============================================================
-- Step 2: Migrate existing data
-- ============================================================
-- All existing users keep status='approved' (they registered before gating existed).
-- is_admin=true users become organizers (master is assigned via MASTER_EMAIL env var at app layer).

UPDATE public.profiles SET role = 'organizer' WHERE is_admin = true;

-- ============================================================
-- Step 3: Drop old RLS policies that reference is_admin
-- ============================================================
-- Must drop these BEFORE dropping is_admin column (dependency order)

-- Profiles
DROP POLICY IF EXISTS "Public profiles are viewable by owner" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

-- Events
DROP POLICY IF EXISTS "Published events are viewable by all" ON public.events;
DROP POLICY IF EXISTS "Admins can manage events" ON public.events;

-- RSVPs
DROP POLICY IF EXISTS "Users can view own RSVPs" ON public.rsvps;
DROP POLICY IF EXISTS "Users can create own RSVPs" ON public.rsvps;
DROP POLICY IF EXISTS "Users can delete own RSVPs" ON public.rsvps;
DROP POLICY IF EXISTS "Admins can view all RSVPs" ON public.rsvps;

-- Attendances
DROP POLICY IF EXISTS "Users can view own attendances" ON public.attendances;
DROP POLICY IF EXISTS "Admins can manage attendances" ON public.attendances;

-- Event Media
DROP POLICY IF EXISTS "Event media viewable by all" ON public.event_media;
DROP POLICY IF EXISTS "Admins can manage media" ON public.event_media;

-- Newsletter Subscribers
DROP POLICY IF EXISTS "Admins can view subscribers" ON public.newsletter_subscribers;

-- ============================================================
-- Step 4: Drop the old is_admin column
-- ============================================================

ALTER TABLE public.profiles DROP COLUMN is_admin;

-- ============================================================
-- Step 4: Update handle_new_user trigger function
-- ============================================================
-- New users default to role='member', status='approved'.
-- Phase 3 will change default status to 'pending' when referral system is added.
-- Preserves existing membership_code generation logic (RSN- prefix + 8 random chars).

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  new_code text;
  chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
BEGIN
  new_code := 'RSN-';
  FOR i IN 1..8 LOOP
    new_code := new_code || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  END LOOP;

  INSERT INTO public.profiles (id, email, full_name, membership_code, role, status)
  VALUES (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    new_code,
    'member',
    'approved'
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- Step 5: Create security definer helper functions for RLS
-- ============================================================
-- These bypass RLS internally and are cached by Postgres optimizer per-statement.
-- STABLE volatility allows optimizer to call once per query instead of per-row.

CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS text AS $$
BEGIN
  RETURN (
    SELECT role FROM public.profiles
    WHERE id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.get_user_status()
RETURNS text AS $$
BEGIN
  RETURN (
    SELECT status FROM public.profiles
    WHERE id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.is_master()
RETURNS boolean AS $$
BEGIN
  RETURN (SELECT public.get_user_role()) = 'master';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.is_admin_or_organizer()
RETURNS boolean AS $$
DECLARE
  user_role text;
BEGIN
  user_role := (SELECT public.get_user_role());
  RETURN user_role = 'master' OR user_role = 'organizer';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ============================================================
-- Step 7: Create new role-based RLS policies
-- ============================================================
-- Naming convention: {table}_{operation}_{who}
-- Helper functions used instead of inline subqueries for performance.

-- PROFILES ---------------------------------------------------

-- Users can read their own profile
CREATE POLICY profiles_select_own ON public.profiles
  FOR SELECT USING (auth.uid() = id);

-- Master and organizers can read all profiles
CREATE POLICY profiles_select_admin ON public.profiles
  FOR SELECT USING ((SELECT public.is_admin_or_organizer()));

-- Users can update their own profile (but cannot change role or status)
CREATE POLICY profiles_update_own ON public.profiles
  FOR UPDATE USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    AND role = (SELECT role FROM public.profiles WHERE id = auth.uid())
    AND status = (SELECT status FROM public.profiles WHERE id = auth.uid())
  );

-- Master can update any profile (for role/status changes)
CREATE POLICY profiles_update_master ON public.profiles
  FOR UPDATE USING ((SELECT public.is_master()));

-- EVENTS -----------------------------------------------------

-- Published events viewable by all (including anonymous via early_access logic)
CREATE POLICY events_select_published ON public.events
  FOR SELECT USING (
    is_published = true
    AND (
      early_access_until IS NULL
      OR early_access_until <= now()
      OR auth.uid() IS NOT NULL
    )
  );

-- Organizers and master can manage all events
CREATE POLICY events_all_admin ON public.events
  FOR ALL USING ((SELECT public.is_admin_or_organizer()));

-- RSVPs ------------------------------------------------------

-- Users can view their own RSVPs
CREATE POLICY rsvps_select_own ON public.rsvps
  FOR SELECT USING (auth.uid() = user_id);

-- Approved members can create RSVPs
CREATE POLICY rsvps_insert_approved ON public.rsvps
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
    AND (SELECT public.get_user_status()) = 'approved'
  );

-- Users can delete their own RSVPs
CREATE POLICY rsvps_delete_own ON public.rsvps
  FOR DELETE USING (auth.uid() = user_id);

-- Admin/organizer can view all RSVPs
CREATE POLICY rsvps_select_admin ON public.rsvps
  FOR SELECT USING ((SELECT public.is_admin_or_organizer()));

-- ATTENDANCES ------------------------------------------------

-- Users can view own attendances
CREATE POLICY attendances_select_own ON public.attendances
  FOR SELECT USING (auth.uid() = user_id);

-- Admin/organizer can manage all attendances
CREATE POLICY attendances_all_admin ON public.attendances
  FOR ALL USING ((SELECT public.is_admin_or_organizer()));

-- EVENT MEDIA ------------------------------------------------

-- All authenticated users can view media
CREATE POLICY event_media_select_all ON public.event_media
  FOR SELECT USING (true);

-- Admin/organizer can manage media
CREATE POLICY event_media_all_admin ON public.event_media
  FOR ALL USING ((SELECT public.is_admin_or_organizer()));

-- NEWSLETTER SUBSCRIBERS -------------------------------------

-- Admin/organizer can view subscribers
CREATE POLICY newsletter_select_admin ON public.newsletter_subscribers
  FOR SELECT USING ((SELECT public.is_admin_or_organizer()));

COMMIT;
