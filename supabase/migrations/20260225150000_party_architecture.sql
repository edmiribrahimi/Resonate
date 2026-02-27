-- Party-Based Event Architecture Migration
-- Each event becomes a container for 1-3 parties (preparty, main, afterparty)
-- Each party has its own access type, ticket tiers, and RSVP tracking

-- ============================================================
-- 1a. Create event_parties table
-- ============================================================

CREATE TABLE public.event_parties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('preparty', 'main', 'afterparty')),
  title text NOT NULL,
  description text,
  time time NOT NULL,
  end_time time,
  location text,
  access_type text NOT NULL DEFAULT 'paid' CHECK (access_type IN ('free_public', 'free_rsvp', 'paid')),
  capacity integer CHECK (capacity IS NULL OR capacity > 0),
  sort_order smallint NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (event_id, type)
);

CREATE INDEX idx_event_parties_event_id ON public.event_parties (event_id);

ALTER TABLE public.event_parties ENABLE ROW LEVEL SECURITY;

-- Published events' parties readable by anyone
CREATE POLICY event_parties_select_published ON public.event_parties
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = event_id AND e.is_published = true
    )
  );

-- Admin/organizer can see all parties (including unpublished events)
CREATE POLICY event_parties_select_admin ON public.event_parties
  FOR SELECT USING ((SELECT public.is_admin_or_organizer()));

-- Admin/organizer can insert parties
CREATE POLICY event_parties_insert_admin ON public.event_parties
  FOR INSERT WITH CHECK ((SELECT public.is_admin_or_organizer()));

-- Owner or master can update parties
CREATE POLICY event_parties_update_own ON public.event_parties
  FOR UPDATE USING (
    (SELECT public.is_admin_or_organizer())
    AND (
      (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'master'
      OR EXISTS (
        SELECT 1 FROM public.events e
        WHERE e.id = event_id AND e.created_by = auth.uid()
      )
    )
  );

-- Owner or master can delete parties
CREATE POLICY event_parties_delete_own ON public.event_parties
  FOR DELETE USING (
    (SELECT public.is_admin_or_organizer())
    AND (
      (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'master'
      OR EXISTS (
        SELECT 1 FROM public.events e
        WHERE e.id = event_id AND e.created_by = auth.uid()
      )
    )
  );

-- ============================================================
-- 1b. Backfill existing events -> main party
-- ============================================================

INSERT INTO public.event_parties (event_id, type, title, time, end_time, location, access_type, capacity, sort_order)
SELECT id, 'main', title, time, end_time, location, 'paid', capacity, 1
FROM public.events;

-- Backfill preparty rows from existing flat columns where data exists
INSERT INTO public.event_parties (event_id, type, title, time, location, access_type, sort_order)
SELECT id, 'preparty',
  COALESCE(preparty_title, 'Pre-party'),
  preparty_time,
  preparty_location,
  'paid',
  0
FROM public.events
WHERE preparty_time IS NOT NULL;

-- Backfill afterparty rows from existing flat columns where data exists
INSERT INTO public.event_parties (event_id, type, title, time, location, access_type, sort_order)
SELECT id, 'afterparty',
  COALESCE(afterparty_title, 'After-party'),
  afterparty_time,
  afterparty_location,
  'paid',
  2
FROM public.events
WHERE afterparty_time IS NOT NULL;

-- ============================================================
-- 1c. Add party_id to dependent tables
-- ============================================================

-- ticket_tiers: add party_id FK, backfill, set NOT NULL
ALTER TABLE public.ticket_tiers ADD COLUMN party_id uuid REFERENCES public.event_parties ON DELETE CASCADE;

UPDATE public.ticket_tiers tt
SET party_id = (
  SELECT ep.id FROM public.event_parties ep
  WHERE ep.event_id = tt.event_id AND ep.type = 'main'
);

ALTER TABLE public.ticket_tiers ALTER COLUMN party_id SET NOT NULL;

-- tickets: add party_id FK, backfill, set NOT NULL, update unique constraint
ALTER TABLE public.tickets ADD COLUMN party_id uuid REFERENCES public.event_parties ON DELETE CASCADE;

UPDATE public.tickets t
SET party_id = (
  SELECT ep.id FROM public.event_parties ep
  WHERE ep.event_id = t.event_id AND ep.type = 'main'
);

ALTER TABLE public.tickets ALTER COLUMN party_id SET NOT NULL;

ALTER TABLE public.tickets DROP CONSTRAINT tickets_event_id_user_id_key;
ALTER TABLE public.tickets ADD CONSTRAINT tickets_party_id_user_id_key UNIQUE (party_id, user_id);

-- rsvps: add party_id FK, backfill, set NOT NULL, update unique constraint
ALTER TABLE public.rsvps ADD COLUMN party_id uuid REFERENCES public.event_parties ON DELETE CASCADE;

UPDATE public.rsvps r
SET party_id = (
  SELECT ep.id FROM public.event_parties ep
  WHERE ep.event_id = r.event_id AND ep.type = 'main'
);

ALTER TABLE public.rsvps ALTER COLUMN party_id SET NOT NULL;

ALTER TABLE public.rsvps DROP CONSTRAINT rsvps_event_id_user_id_key;
ALTER TABLE public.rsvps ADD CONSTRAINT rsvps_party_id_user_id_key UNIQUE (party_id, user_id);

-- pending_purchases: add party_id FK, backfill, set NOT NULL
ALTER TABLE public.pending_purchases ADD COLUMN party_id uuid REFERENCES public.event_parties ON DELETE CASCADE;

UPDATE public.pending_purchases pp
SET party_id = (
  SELECT ep.id FROM public.event_parties ep
  WHERE ep.event_id = pp.event_id AND ep.type = 'main'
);

ALTER TABLE public.pending_purchases ALTER COLUMN party_id SET NOT NULL;

-- ============================================================
-- 1d. Drop old columns from events
-- ============================================================

ALTER TABLE public.events
  DROP COLUMN time,
  DROP COLUMN end_time,
  DROP COLUMN location,
  DROP COLUMN capacity,
  DROP COLUMN preparty_title,
  DROP COLUMN preparty_time,
  DROP COLUMN preparty_location,
  DROP COLUMN afterparty_title,
  DROP COLUMN afterparty_time,
  DROP COLUMN afterparty_location;

-- ============================================================
-- 1e. Update reserve_ticket() RPC
-- ============================================================

CREATE OR REPLACE FUNCTION public.reserve_ticket(
  p_tier_id uuid,
  p_user_id uuid,
  p_event_id uuid,
  p_party_id uuid,
  p_sumup_checkout_id text,
  p_sumup_transaction_code text,
  p_amount_paid numeric
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_ticket_id uuid;
  v_sold_count integer;
  v_quantity integer;
  v_existing_ticket uuid;
BEGIN
  -- Check if user already has a ticket for this party
  SELECT id INTO v_existing_ticket
  FROM public.tickets
  WHERE party_id = p_party_id AND user_id = p_user_id;

  IF v_existing_ticket IS NOT NULL THEN
    RAISE EXCEPTION 'User already has a ticket for this party';
  END IF;

  -- Lock the tier row to prevent concurrent modifications
  SELECT quantity INTO v_quantity
  FROM public.ticket_tiers
  WHERE id = p_tier_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Ticket tier not found';
  END IF;

  -- Count existing tickets for this tier
  SELECT COUNT(*) INTO v_sold_count
  FROM public.tickets
  WHERE tier_id = p_tier_id;

  -- Check availability
  IF v_sold_count >= v_quantity THEN
    RAISE EXCEPTION 'Tier sold out';
  END IF;

  -- Insert ticket with both event_id and party_id
  INSERT INTO public.tickets (
    event_id, party_id, tier_id, user_id,
    sumup_checkout_id, sumup_transaction_code, amount_paid
  )
  VALUES (
    p_event_id, p_party_id, p_tier_id, p_user_id,
    p_sumup_checkout_id, p_sumup_transaction_code, p_amount_paid
  )
  RETURNING id INTO v_ticket_id;

  RETURN v_ticket_id;
END;
$$;
