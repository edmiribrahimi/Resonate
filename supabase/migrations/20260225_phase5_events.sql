-- Phase 5: Event Management Schema Updates
-- Adds created_by column, replaces permissive RLS with ownership-based policies,
-- sets up storage bucket for event cover images.
BEGIN;

-- Step 1: Add created_by column to events table
ALTER TABLE public.events
  ADD COLUMN created_by uuid REFERENCES auth.users ON DELETE SET NULL;

-- Step 2: Drop the overly-permissive existing policy
DROP POLICY IF EXISTS events_all_admin ON public.events;

-- Step 3: Create granular RLS policies for event management

-- Organizers and master can view all events (including unpublished, for management)
CREATE POLICY events_select_admin ON public.events
  FOR SELECT USING ((SELECT public.is_admin_or_organizer()));

-- Organizers and master can create events
CREATE POLICY events_insert_admin ON public.events
  FOR INSERT WITH CHECK ((SELECT public.is_admin_or_organizer()));

-- Organizers can update their own events; master can update any
CREATE POLICY events_update_own ON public.events
  FOR UPDATE USING (
    auth.uid() = created_by
    OR (SELECT public.is_master())
  );

-- Organizers can delete their own events; master can delete any
CREATE POLICY events_delete_own ON public.events
  FOR DELETE USING (
    auth.uid() = created_by
    OR (SELECT public.is_master())
  );

-- Step 4: Create storage bucket for event cover images
-- NOTE: INSERT INTO storage.buckets may not work in all Supabase environments.
-- If this fails, create the bucket manually via Supabase Dashboard:
--   Name: event-images, Public: true
INSERT INTO storage.buckets (id, name, public)
  VALUES ('event-images', 'event-images', true)
  ON CONFLICT DO NOTHING;

-- Step 5: Storage RLS policies for event-images bucket

-- Organizers can upload event images
CREATE POLICY "Organizers can upload event images"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'event-images'
    AND (SELECT public.is_admin_or_organizer())
  );

-- Anyone can view event images (public bucket)
CREATE POLICY "Anyone can view event images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'event-images');

-- Organizers can update event images
CREATE POLICY "Organizers can update event images"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'event-images'
    AND (SELECT public.is_admin_or_organizer())
  );

-- Organizers can delete event images
CREATE POLICY "Organizers can delete event images"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'event-images'
    AND (SELECT public.is_admin_or_organizer())
  );

COMMIT;
