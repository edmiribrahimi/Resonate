-- Make quantity optional (NULL = unlimited) and add show_remaining toggle
ALTER TABLE public.ticket_tiers
  ALTER COLUMN quantity DROP NOT NULL,
  ALTER COLUMN quantity DROP DEFAULT,
  ADD COLUMN show_remaining boolean NOT NULL DEFAULT true;
