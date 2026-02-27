ALTER TABLE public.rsvps
  ADD COLUMN checked_in boolean DEFAULT false,
  ADD COLUMN checked_in_at timestamptz;
CREATE INDEX idx_rsvps_checked_in ON public.rsvps (checked_in, party_id);
