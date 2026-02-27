-- Multi Sub-Event Architecture Migration
-- Removes fixed party types (preparty/main/afterparty), adds date per sub-event,
-- renames location -> venue_text, makes party_id nullable for event-level tickets,
-- renames events.location_secret -> venue_secret

-- ============================================================
-- 1. event_parties: remove type constraints, add date, rename location
-- ============================================================

-- Drop unique constraint on (event_id, type)
ALTER TABLE public.event_parties DROP CONSTRAINT event_parties_event_id_type_key;

-- Drop CHECK constraint on type
ALTER TABLE public.event_parties DROP CONSTRAINT event_parties_type_check;

-- Drop the type column entirely
ALTER TABLE public.event_parties DROP COLUMN type;

-- Add date column
ALTER TABLE public.event_parties ADD COLUMN date date NOT NULL DEFAULT CURRENT_DATE;

-- Backfill date from parent event
UPDATE public.event_parties ep
SET date = e.date
FROM public.events e
WHERE ep.event_id = e.id;

-- Rename location -> venue_text
ALTER TABLE public.event_parties RENAME COLUMN location TO venue_text;

-- Add venue_id FK if not exists (it was added in venues migration)
-- ALTER TABLE public.event_parties ADD COLUMN IF NOT EXISTS venue_id uuid REFERENCES public.venues(id);

-- ============================================================
-- 2. events: rename location_secret -> venue_secret
-- ============================================================

ALTER TABLE public.events RENAME COLUMN location_secret TO venue_secret;

-- ============================================================
-- 3. ticket_tiers: make party_id nullable (for event-level tiers)
-- ============================================================

ALTER TABLE public.ticket_tiers ALTER COLUMN party_id DROP NOT NULL;

-- Add CHECK: at least one of party_id or event_id must be set
ALTER TABLE public.ticket_tiers ADD CONSTRAINT ticket_tiers_party_or_event
  CHECK (party_id IS NOT NULL OR event_id IS NOT NULL);

-- ============================================================
-- 4. tickets: make party_id nullable, update unique constraints
-- ============================================================

ALTER TABLE public.tickets ALTER COLUMN party_id DROP NOT NULL;

-- Drop existing unique constraint
ALTER TABLE public.tickets DROP CONSTRAINT tickets_party_id_user_id_key;

-- Add partial unique for party-specific tickets
CREATE UNIQUE INDEX tickets_party_user_unique
  ON public.tickets (party_id, user_id)
  WHERE party_id IS NOT NULL;

-- Add partial unique for event-level (master) tickets
CREATE UNIQUE INDEX tickets_event_user_master_unique
  ON public.tickets (event_id, user_id)
  WHERE party_id IS NULL;

-- ============================================================
-- 5. pending_purchases: make party_id nullable
-- ============================================================

ALTER TABLE public.pending_purchases ALTER COLUMN party_id DROP NOT NULL;

-- ============================================================
-- 6. Update reserve_ticket() to handle NULL party_id (master ticket)
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
  -- Check for duplicate ticket
  IF p_party_id IS NOT NULL THEN
    -- Party-specific ticket: check by party_id + user_id
    SELECT id INTO v_existing_ticket
    FROM public.tickets
    WHERE party_id = p_party_id AND user_id = p_user_id;
  ELSE
    -- Event-level (master) ticket: check by event_id + user_id WHERE party_id IS NULL
    SELECT id INTO v_existing_ticket
    FROM public.tickets
    WHERE event_id = p_event_id AND user_id = p_user_id AND party_id IS NULL;
  END IF;

  IF v_existing_ticket IS NOT NULL THEN
    RAISE EXCEPTION 'User already has a ticket for this';
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

  -- Insert ticket
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
