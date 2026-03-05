-- Add toggle to control whether ticket purchase reveals venue immediately
ALTER TABLE public.event_parties
  ADD COLUMN IF NOT EXISTS venue_reveal_on_purchase boolean DEFAULT true;

-- Track whether venue reveal email has been sent per ticket/rsvp
ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS venue_reveal_sent boolean DEFAULT false;
ALTER TABLE public.rsvps ADD COLUMN IF NOT EXISTS venue_reveal_sent boolean DEFAULT false;

-- Track whether venue reveal emails have been sent for a party (to avoid re-processing)
ALTER TABLE public.event_parties ADD COLUMN IF NOT EXISTS venue_reveal_email_sent boolean DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_tickets_venue_reveal ON public.tickets (venue_reveal_sent) WHERE venue_reveal_sent = false;
CREATE INDEX IF NOT EXISTS idx_rsvps_venue_reveal ON public.rsvps (venue_reveal_sent) WHERE venue_reveal_sent = false;
