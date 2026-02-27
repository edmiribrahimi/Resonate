-- Allow anonymous users to read ticket tiers (for public event pages)
DROP POLICY ticket_tiers_select ON public.ticket_tiers;

CREATE POLICY ticket_tiers_select ON public.ticket_tiers
  FOR SELECT USING (true);
