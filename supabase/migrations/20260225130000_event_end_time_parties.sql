-- Add end_time and pre-party / after-party fields to events
alter table public.events
  add column if not exists end_time time,
  add column if not exists preparty_title text,
  add column if not exists preparty_time time,
  add column if not exists preparty_location text,
  add column if not exists afterparty_title text,
  add column if not exists afterparty_time time,
  add column if not exists afterparty_location text;
