-- Add optional start / expiration timestamps to ticket tiers
ALTER TABLE public.ticket_tiers
  ADD COLUMN starts_at timestamptz NULL,
  ADD COLUMN expires_at timestamptz NULL;
