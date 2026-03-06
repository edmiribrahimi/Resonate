-- Phase 12: Remove unused p_transaction_code parameter from fulfill_drink_order
-- The transaction code was never stored or used in the function body

-- Drop the old 2-parameter signature (PostgreSQL function overloading)
DROP FUNCTION IF EXISTS public.fulfill_drink_order(uuid, text);

-- Create the new 1-parameter version
CREATE OR REPLACE FUNCTION public.fulfill_drink_order(
  p_order_id uuid
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
