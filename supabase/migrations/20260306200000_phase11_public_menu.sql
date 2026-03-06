-- Phase 11: Allow unauthenticated (anon) users to read drink items
-- Needed for public menu page at /events/[slug]/menu
DROP POLICY IF EXISTS drink_items_select ON public.drink_items;

CREATE POLICY drink_items_select ON public.drink_items
  FOR SELECT TO anon, authenticated USING (true);
