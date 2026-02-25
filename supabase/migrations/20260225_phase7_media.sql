-- Phase 7: Event Media -- Member Uploads
-- Adds columns to event_media, creates event-media storage bucket, updates RLS

BEGIN;

-- Step 1: Add columns to existing event_media table
ALTER TABLE public.event_media
  ADD COLUMN uploaded_by uuid REFERENCES auth.users ON DELETE CASCADE,
  ADD COLUMN status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected')),
  ADD COLUMN file_size bigint;

-- Step 2: Add indexes
CREATE INDEX idx_event_media_event_id ON public.event_media (event_id);
CREATE INDEX idx_event_media_uploaded_by ON public.event_media (uploaded_by);
CREATE INDEX idx_event_media_status ON public.event_media (status);

-- Step 3: Drop existing overly-broad policies
DROP POLICY IF EXISTS event_media_select_all ON public.event_media;
DROP POLICY IF EXISTS event_media_all_admin ON public.event_media;

-- Step 4: New RLS policies

-- Approved media visible to all authenticated users
CREATE POLICY event_media_select_approved ON public.event_media
  FOR SELECT TO authenticated
  USING (status = 'approved');

-- Users can see their own media regardless of status
CREATE POLICY event_media_select_own ON public.event_media
  FOR SELECT TO authenticated
  USING (auth.uid() = uploaded_by);

-- Organizer/master can see all media (for moderation)
CREATE POLICY event_media_select_admin ON public.event_media
  FOR SELECT TO authenticated
  USING ((SELECT public.is_admin_or_organizer()));

-- Approved members can insert media (ticket check done in server action)
CREATE POLICY event_media_insert_member ON public.event_media
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = uploaded_by
    AND (SELECT public.get_user_status()) = 'approved'
  );

-- Members can delete their own uploads
CREATE POLICY event_media_delete_own ON public.event_media
  FOR DELETE TO authenticated
  USING (auth.uid() = uploaded_by);

-- Organizer/master can delete any media
CREATE POLICY event_media_delete_admin ON public.event_media
  FOR DELETE TO authenticated
  USING ((SELECT public.is_admin_or_organizer()));

-- Organizer/master can update status (approve/reject)
CREATE POLICY event_media_update_admin ON public.event_media
  FOR UPDATE TO authenticated
  USING ((SELECT public.is_admin_or_organizer()));

-- Step 5: Create storage bucket for member-uploaded event media
-- 104857600 = 100MB (videos up to 100MB)
INSERT INTO storage.buckets (id, name, public, file_size_limit)
  VALUES ('event-media', 'event-media', true, 104857600)
  ON CONFLICT DO NOTHING;

-- Step 6: Storage RLS policies for event-media bucket

-- Approved members can upload to event-media bucket
CREATE POLICY "Members can upload event media"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'event-media'
    AND (SELECT public.get_user_status()) = 'approved'
  );

-- Anyone can view event media (public bucket)
CREATE POLICY "Anyone can view event media"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'event-media');

-- Members can delete their own uploads from storage
-- Storage path: {eventId}/{userId}/{filename}
CREATE POLICY "Members can delete own event media"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'event-media'
    AND (storage.foldername(name))[2] = auth.uid()::text
  );

-- Organizer/master can delete any event media from storage
CREATE POLICY "Admins can delete event media"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'event-media'
    AND (SELECT public.is_admin_or_organizer())
  );

COMMIT;
