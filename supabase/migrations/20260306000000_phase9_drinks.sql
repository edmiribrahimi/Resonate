-- Phase 9: Drink Menu & Purchase
-- Creates drink_items, drink_orders, drink_tokens tables
-- RLS policies, indexes, and fulfill_drink_order function

-- ============================================================
-- Drink Items (menu for each event, managed by organizers)
-- ============================================================

CREATE TABLE public.drink_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  name text NOT NULL,
  price numeric(10,2) NOT NULL CHECK (price >= 0),
  sort_order integer NOT NULL DEFAULT 0,
  is_available boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- Drink Orders (tracks checkout before and after payment)
-- ============================================================

CREATE TABLE public.drink_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  sumup_checkout_id text NOT NULL,
  total_amount numeric(10,2) NOT NULL,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'completed', 'failed', 'expired')),
  items jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- Drink Tokens (one per unit purchased, redeemable at bar)
-- ============================================================

CREATE TABLE public.drink_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.drink_orders(id) ON DELETE CASCADE,
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  drink_item_id uuid REFERENCES public.drink_items(id) ON DELETE SET NULL,
  drink_name text NOT NULL,
  price numeric(10,2) NOT NULL,
  token text NOT NULL UNIQUE DEFAULT gen_random_uuid()::text,
  status text NOT NULL DEFAULT 'purchased'
    CHECK (status IN ('purchased', 'redeemed')),
  redeemed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- Indexes
-- ============================================================

CREATE INDEX idx_drink_items_event_id ON public.drink_items (event_id);
CREATE INDEX idx_drink_orders_checkout ON public.drink_orders (sumup_checkout_id);
CREATE INDEX idx_drink_orders_event_user ON public.drink_orders (event_id, user_id);
CREATE INDEX idx_drink_tokens_order_id ON public.drink_tokens (order_id);
CREATE INDEX idx_drink_tokens_event_user ON public.drink_tokens (event_id, user_id);

-- ============================================================
-- RLS Policies
-- ============================================================

ALTER TABLE public.drink_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drink_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drink_tokens ENABLE ROW LEVEL SECURITY;

-- Drink items: any authenticated user can read (for purchase UI)
CREATE POLICY drink_items_select ON public.drink_items
  FOR SELECT TO authenticated USING (true);

-- Drink items: organizers/master can manage
CREATE POLICY drink_items_insert ON public.drink_items
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT public.is_admin_or_organizer()));

CREATE POLICY drink_items_update ON public.drink_items
  FOR UPDATE TO authenticated
  USING ((SELECT public.is_admin_or_organizer()));

CREATE POLICY drink_items_delete ON public.drink_items
  FOR DELETE TO authenticated
  USING ((SELECT public.is_admin_or_organizer()));

-- Drink orders: users can see their own orders
CREATE POLICY drink_orders_select_own ON public.drink_orders
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Drink tokens: users can see their own tokens
CREATE POLICY drink_tokens_select_own ON public.drink_tokens
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Drink tokens: organizers/master can view all tokens (for redemption at bar)
CREATE POLICY drink_tokens_select_admin ON public.drink_tokens
  FOR SELECT TO authenticated
  USING ((SELECT public.is_admin_or_organizer()));

-- ============================================================
-- Fulfill Drink Order Function
-- Called after successful SumUp payment to create drink tokens
-- ============================================================

CREATE OR REPLACE FUNCTION public.fulfill_drink_order(
  p_order_id uuid,
  p_transaction_code text
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_order record;
  v_item jsonb;
  v_i integer;
  v_token_count integer := 0;
BEGIN
  -- Fetch the order
  SELECT * INTO v_order
  FROM public.drink_orders
  WHERE id = p_order_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Drink order not found: %', p_order_id;
  END IF;

  -- Idempotent: if already completed, return 0
  IF v_order.status = 'completed' THEN
    RETURN 0;
  END IF;

  -- Loop through items JSONB array and create tokens (quantity expansion)
  FOR v_item IN SELECT * FROM jsonb_array_elements(v_order.items)
  LOOP
    FOR v_i IN 1..(v_item->>'quantity')::integer
    LOOP
      INSERT INTO public.drink_tokens (
        order_id,
        event_id,
        user_id,
        drink_item_id,
        drink_name,
        price,
        status
      ) VALUES (
        p_order_id,
        v_order.event_id,
        v_order.user_id,
        (v_item->>'drink_item_id')::uuid,
        v_item->>'drink_name',
        (v_item->>'price')::numeric,
        'purchased'
      );

      v_token_count := v_token_count + 1;
    END LOOP;
  END LOOP;

  -- Mark order as completed
  UPDATE public.drink_orders
  SET status = 'completed',
      updated_at = now()
  WHERE id = p_order_id;

  RETURN v_token_count;
END;
$$;
