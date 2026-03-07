-- Add 'refunded' status to drink_tokens, refunded_at column,
-- and sumup_transaction_code to drink_orders for refund processing.

-- ============================================================
-- drink_tokens: expand status check to include 'refunded'
-- ============================================================

ALTER TABLE public.drink_tokens DROP CONSTRAINT drink_tokens_status_check;
ALTER TABLE public.drink_tokens ADD CONSTRAINT drink_tokens_status_check
  CHECK (status IN ('purchased', 'redeemed', 'refunded'));

ALTER TABLE public.drink_tokens ADD COLUMN refunded_at timestamptz;

-- ============================================================
-- drink_orders: store SumUp transaction code for refunds
-- ============================================================

ALTER TABLE public.drink_orders ADD COLUMN sumup_transaction_code text;

-- ============================================================
-- Update redeem_drink_token to reject refunded tokens
-- ============================================================

CREATE OR REPLACE FUNCTION public.redeem_drink_token(p_token_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_token record;
BEGIN
  SELECT * INTO v_token
  FROM public.drink_tokens
  WHERE id = p_token_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Token not found: %', p_token_id;
  END IF;

  IF v_token.status = 'redeemed' THEN
    RETURN false;
  END IF;

  IF v_token.status = 'refunded' THEN
    RAISE EXCEPTION 'Token has been refunded';
  END IF;

  UPDATE public.drink_tokens
  SET status = 'redeemed',
      redeemed_at = now()
  WHERE id = p_token_id;

  RETURN true;
END;
$$;
