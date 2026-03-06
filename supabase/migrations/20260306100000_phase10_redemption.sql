-- Phase 10: Drink Token Redemption
-- Adds redeem_drink_token SECURITY DEFINER function for atomic token redemption

CREATE OR REPLACE FUNCTION public.redeem_drink_token(p_token_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_token record;
BEGIN
  -- Lock the row to prevent concurrent redemption
  SELECT * INTO v_token
  FROM public.drink_tokens
  WHERE id = p_token_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Token not found: %', p_token_id;
  END IF;

  -- Idempotent: already redeemed
  IF v_token.status = 'redeemed' THEN
    RETURN false;
  END IF;

  -- Mark as redeemed
  UPDATE public.drink_tokens
  SET status = 'redeemed',
      redeemed_at = now()
  WHERE id = p_token_id;

  RETURN true;
END;
$$;
