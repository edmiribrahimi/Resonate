-- Add party_id to drink tables to support per-party drink menus

-- ============================================================
-- drink_items: add party_id
-- ============================================================
ALTER TABLE public.drink_items
  ADD COLUMN party_id uuid REFERENCES public.event_parties(id) ON DELETE CASCADE;

CREATE INDEX idx_drink_items_party_id ON public.drink_items (party_id);

-- ============================================================
-- drink_orders: add party_id
-- ============================================================
ALTER TABLE public.drink_orders
  ADD COLUMN party_id uuid REFERENCES public.event_parties(id) ON DELETE CASCADE;

-- ============================================================
-- drink_tokens: add party_id
-- ============================================================
ALTER TABLE public.drink_tokens
  ADD COLUMN party_id uuid REFERENCES public.event_parties(id) ON DELETE CASCADE;

-- ============================================================
-- Update fulfill_drink_order to propagate party_id
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
  SELECT * INTO v_order
  FROM public.drink_orders
  WHERE id = p_order_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Drink order not found: %', p_order_id;
  END IF;

  IF v_order.status = 'completed' THEN
    RETURN 0;
  END IF;

  FOR v_item IN SELECT * FROM jsonb_array_elements(v_order.items)
  LOOP
    FOR v_i IN 1..(v_item->>'quantity')::integer
    LOOP
      INSERT INTO public.drink_tokens (
        order_id,
        event_id,
        party_id,
        user_id,
        drink_item_id,
        drink_name,
        price,
        status
      ) VALUES (
        p_order_id,
        v_order.event_id,
        v_order.party_id,
        v_order.user_id,
        (v_item->>'drink_item_id')::uuid,
        v_item->>'drink_name',
        (v_item->>'price')::numeric,
        'purchased'
      );

      v_token_count := v_token_count + 1;
    END LOOP;
  END LOOP;

  UPDATE public.drink_orders
  SET status = 'completed',
      updated_at = now()
  WHERE id = p_order_id;

  RETURN v_token_count;
END;
$$;
