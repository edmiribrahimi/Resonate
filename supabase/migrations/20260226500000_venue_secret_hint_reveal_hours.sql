ALTER TABLE public.event_parties
  ADD COLUMN IF NOT EXISTS venue_secret_hint text,
  ADD COLUMN IF NOT EXISTS venue_reveal_hours integer;
