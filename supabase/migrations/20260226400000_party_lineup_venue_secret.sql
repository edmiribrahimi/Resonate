-- Add lineup and venue_secret to event_parties
-- These fields are now managed per-party (sub-event) instead of only at event level.

ALTER TABLE event_parties
  ADD COLUMN IF NOT EXISTS lineup text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS venue_secret boolean NOT NULL DEFAULT false;

-- Backfill from parent event values
UPDATE event_parties ep
SET
  lineup = COALESCE(e.lineup, '{}'),
  venue_secret = COALESCE(e.venue_secret, false)
FROM events e
WHERE ep.event_id = e.id;
