-- Add menu_closes_at field to event_parties
-- When set, the drink menu for this party closes at this time instead of end_time
ALTER TABLE public.event_parties
  ADD COLUMN menu_closes_at time;
