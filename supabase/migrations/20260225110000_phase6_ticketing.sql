-- Phase 6: Ticketing & Payments
-- Creates ticket_tiers, tickets, pending_purchases tables
-- RLS policies, indexes, and atomic reserve_ticket function

-- ============================================================
-- Ticket Tiers (defined per event by organizers)
-- ============================================================

CREATE TABLE public.ticket_tiers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events ON DELETE CASCADE,
  name text NOT NULL,
  price numeric(10,2) NOT NULL CHECK (price >= 0),
  quantity integer NOT NULL CHECK (quantity > 0),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ============================================================
-- Tickets (one per member per event)
-- ============================================================

CREATE TABLE public.tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events ON DELETE CASCADE,
  tier_id uuid NOT NULL REFERENCES public.ticket_tiers ON DELETE RESTRICT,
  user_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  sumup_checkout_id text UNIQUE,
  sumup_transaction_code text,
  amount_paid numeric(10,2) NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE (event_id, user_id)
);

-- ============================================================
-- Pending Purchases (tracks checkout initiation before SumUp confirmation)
-- ============================================================

CREATE TABLE public.pending_purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events ON DELETE CASCADE,
  tier_id uuid NOT NULL REFERENCES public.ticket_tiers ON DELETE RESTRICT,
  user_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  sumup_checkout_id text UNIQUE NOT NULL,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'completed', 'failed', 'expired')),
  ticket_id uuid REFERENCES public.tickets,
  error_message text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ============================================================
-- Indexes
-- ============================================================

CREATE INDEX idx_tickets_event_id ON public.tickets (event_id);
CREATE INDEX idx_tickets_user_id ON public.tickets (user_id);
CREATE INDEX idx_tickets_tier_id ON public.tickets (tier_id);
CREATE INDEX idx_ticket_tiers_event_id ON public.ticket_tiers (event_id);
CREATE INDEX idx_pending_purchases_checkout ON public.pending_purchases (sumup_checkout_id);

-- ============================================================
-- RLS Policies
-- ============================================================

ALTER TABLE public.ticket_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pending_purchases ENABLE ROW LEVEL SECURITY;

-- Ticket tiers: anyone authenticated can read (for purchase UI)
CREATE POLICY ticket_tiers_select ON public.ticket_tiers
  FOR SELECT TO authenticated USING (true);

-- Ticket tiers: organizers/master can manage
CREATE POLICY ticket_tiers_insert ON public.ticket_tiers
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT public.is_admin_or_organizer()));

CREATE POLICY ticket_tiers_update ON public.ticket_tiers
  FOR UPDATE TO authenticated
  USING ((SELECT public.is_admin_or_organizer()));

CREATE POLICY ticket_tiers_delete ON public.ticket_tiers
  FOR DELETE TO authenticated
  USING ((SELECT public.is_admin_or_organizer()));

-- Tickets: members can read their own tickets
CREATE POLICY tickets_select_own ON public.tickets
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Tickets: organizers/master can read all tickets (for sales dashboard)
CREATE POLICY tickets_select_admin ON public.tickets
  FOR SELECT TO authenticated
  USING ((SELECT public.is_admin_or_organizer()));

-- Tickets: insert only via the reserve_ticket function (SECURITY DEFINER)
-- No direct insert policy needed for regular users

-- Pending purchases: users can see their own
CREATE POLICY pending_select_own ON public.pending_purchases
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- ============================================================
-- Atomic Reservation Function
-- ============================================================

CREATE OR REPLACE FUNCTION public.reserve_ticket(
  p_tier_id uuid,
  p_user_id uuid,
  p_event_id uuid,
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
  -- Check if user already has a ticket for this event
  SELECT id INTO v_existing_ticket
  FROM public.tickets
  WHERE event_id = p_event_id AND user_id = p_user_id;

  IF v_existing_ticket IS NOT NULL THEN
    RAISE EXCEPTION 'User already has a ticket for this event';
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
    event_id, tier_id, user_id,
    sumup_checkout_id, sumup_transaction_code, amount_paid
  )
  VALUES (
    p_event_id, p_tier_id, p_user_id,
    p_sumup_checkout_id, p_sumup_transaction_code, p_amount_paid
  )
  RETURNING id INTO v_ticket_id;

  RETURN v_ticket_id;
END;
$$;
