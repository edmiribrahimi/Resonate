-- Discount Codes Migration
-- Adds discount codes system for ticket purchases: discount_codes table,
-- discount_code_tiers junction table, column additions, RLS policies,
-- and updated reserve_ticket() RPC with atomic usage limit checking.

-- ============================================================
-- 1. discount_codes table
-- ============================================================

CREATE TABLE public.discount_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  party_id uuid NOT NULL REFERENCES public.event_parties ON DELETE CASCADE,
  code text NOT NULL,
  discount_type text NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
  discount_amount numeric(10,2) NOT NULL CHECK (discount_amount > 0),
  max_uses integer,  -- NULL = unlimited
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Case-insensitive unique constraint per party
CREATE UNIQUE INDEX discount_codes_party_code_unique
  ON public.discount_codes (party_id, LOWER(code));

-- ============================================================
-- 2. discount_code_tiers junction table
-- ============================================================

CREATE TABLE public.discount_code_tiers (
  discount_code_id uuid NOT NULL REFERENCES public.discount_codes ON DELETE CASCADE,
  tier_id uuid NOT NULL REFERENCES public.ticket_tiers ON DELETE CASCADE,
  PRIMARY KEY (discount_code_id, tier_id)
);

-- ============================================================
-- 3. Column additions to existing tables
-- ============================================================

ALTER TABLE public.tickets
  ADD COLUMN discount_code_id uuid REFERENCES public.discount_codes ON DELETE SET NULL;

ALTER TABLE public.pending_purchases
  ADD COLUMN discount_code_id uuid REFERENCES public.discount_codes ON DELETE SET NULL;

-- ============================================================
-- 4. RLS policies for discount_codes
-- ============================================================

ALTER TABLE public.discount_codes ENABLE ROW LEVEL SECURITY;

-- SELECT: open (buyers need to read for validation; codes distributed via passaparola)
CREATE POLICY discount_codes_select ON public.discount_codes
  FOR SELECT USING (true);

-- INSERT: admin/organizer only
CREATE POLICY discount_codes_insert ON public.discount_codes
  FOR INSERT WITH CHECK ((SELECT public.is_admin_or_organizer()));

-- UPDATE: admin/organizer only
CREATE POLICY discount_codes_update ON public.discount_codes
  FOR UPDATE USING ((SELECT public.is_admin_or_organizer()));

-- DELETE: admin/organizer only
CREATE POLICY discount_codes_delete ON public.discount_codes
  FOR DELETE USING ((SELECT public.is_admin_or_organizer()));

-- ============================================================
-- 5. RLS policies for discount_code_tiers
-- ============================================================

ALTER TABLE public.discount_code_tiers ENABLE ROW LEVEL SECURITY;

CREATE POLICY discount_code_tiers_select ON public.discount_code_tiers
  FOR SELECT USING (true);

CREATE POLICY discount_code_tiers_insert ON public.discount_code_tiers
  FOR INSERT WITH CHECK ((SELECT public.is_admin_or_organizer()));

CREATE POLICY discount_code_tiers_update ON public.discount_code_tiers
  FOR UPDATE USING ((SELECT public.is_admin_or_organizer()));

CREATE POLICY discount_code_tiers_delete ON public.discount_code_tiers
  FOR DELETE USING ((SELECT public.is_admin_or_organizer()));

-- ============================================================
-- 6. Updated reserve_ticket() RPC with discount code validation
-- ============================================================

CREATE OR REPLACE FUNCTION public.reserve_ticket(
  p_tier_id uuid,
  p_user_id uuid,
  p_event_id uuid,
  p_party_id uuid,
  p_sumup_checkout_id text,
  p_sumup_transaction_code text,
  p_amount_paid numeric,
  p_discount_code_id uuid DEFAULT NULL
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
  v_max_uses integer;
  v_current_uses integer;
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
  IF v_quantity IS NOT NULL AND v_sold_count >= v_quantity THEN
    RAISE EXCEPTION 'Tier sold out';
  END IF;

  -- Validate discount code usage atomically (if provided)
  IF p_discount_code_id IS NOT NULL THEN
    SELECT max_uses INTO v_max_uses
    FROM public.discount_codes
    WHERE id = p_discount_code_id AND is_active = true
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Invalid or inactive discount code';
    END IF;

    IF v_max_uses IS NOT NULL THEN
      SELECT COUNT(*) INTO v_current_uses
      FROM public.tickets
      WHERE discount_code_id = p_discount_code_id;

      IF v_current_uses >= v_max_uses THEN
        RAISE EXCEPTION 'Discount code usage limit reached';
      END IF;
    END IF;
  END IF;

  -- Insert ticket with discount_code_id
  INSERT INTO public.tickets (
    event_id, party_id, tier_id, user_id,
    sumup_checkout_id, sumup_transaction_code, amount_paid,
    discount_code_id
  )
  VALUES (
    p_event_id, p_party_id, p_tier_id, p_user_id,
    p_sumup_checkout_id, p_sumup_transaction_code, p_amount_paid,
    p_discount_code_id
  )
  RETURNING id INTO v_ticket_id;

  RETURN v_ticket_id;
END;
$$;
