ALTER TABLE public.tickets ADD COLUMN reminder_sent boolean DEFAULT false;
ALTER TABLE public.rsvps ADD COLUMN reminder_sent boolean DEFAULT false;
CREATE INDEX idx_tickets_reminder ON public.tickets (reminder_sent) WHERE reminder_sent = false;
CREATE INDEX idx_rsvps_reminder ON public.rsvps (reminder_sent) WHERE reminder_sent = false;
