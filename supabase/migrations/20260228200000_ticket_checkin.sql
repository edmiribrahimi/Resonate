ALTER TABLE public.tickets
  ADD COLUMN checked_in boolean DEFAULT false,
  ADD COLUMN checked_in_at timestamptz,
  ADD COLUMN checked_in_by uuid REFERENCES auth.users;
CREATE INDEX idx_tickets_checked_in ON public.tickets (checked_in, event_id);
