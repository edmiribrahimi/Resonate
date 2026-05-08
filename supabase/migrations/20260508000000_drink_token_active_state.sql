-- Two-step drink token redemption
-- Adds 'active' as an intermediate state between 'purchased' and 'redeemed'.
-- Customer activates the token (purchased -> active), then the bartender
-- finalizes the redemption (active -> redeemed). The customer can also
-- cancel an activation (active -> purchased).

-- 1. Update CHECK constraint to allow 'active'
ALTER TABLE public.drink_tokens DROP CONSTRAINT IF EXISTS drink_tokens_status_check;
ALTER TABLE public.drink_tokens
  ADD CONSTRAINT drink_tokens_status_check
  CHECK (status IN ('purchased', 'active', 'redeemed', 'refunded'));

-- 2. Track activation timestamp (NULL until first activation)
ALTER TABLE public.drink_tokens
  ADD COLUMN IF NOT EXISTS activated_at timestamptz;

-- 3. New RPC: activate (purchased -> active)
CREATE OR REPLACE FUNCTION public.activate_drink_token(p_token_id uuid)
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

  -- Idempotent: already active
  IF v_token.status = 'active' THEN
    RETURN false;
  END IF;

  IF v_token.status <> 'purchased' THEN
    RAISE EXCEPTION 'Token cannot be activated from status: %', v_token.status;
  END IF;

  UPDATE public.drink_tokens
  SET status = 'active',
      activated_at = now()
  WHERE id = p_token_id;

  RETURN true;
END;
$$;

-- 4. New RPC: deactivate (active -> purchased) — customer cancels mid-activation
CREATE OR REPLACE FUNCTION public.deactivate_drink_token(p_token_id uuid)
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

  -- Idempotent: not active anymore (already cancelled or moved on)
  IF v_token.status = 'purchased' THEN
    RETURN false;
  END IF;

  IF v_token.status <> 'active' THEN
    RAISE EXCEPTION 'Token cannot be deactivated from status: %', v_token.status;
  END IF;

  UPDATE public.drink_tokens
  SET status = 'purchased',
      activated_at = NULL
  WHERE id = p_token_id;

  RETURN true;
END;
$$;

-- 5. Update redeem (now requires active state — bartender finalization)
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

  -- Idempotent: already redeemed
  IF v_token.status = 'redeemed' THEN
    RETURN false;
  END IF;

  -- Must be activated by the customer first
  IF v_token.status <> 'active' THEN
    RAISE EXCEPTION 'Token must be activated before being served (current: %)', v_token.status;
  END IF;

  UPDATE public.drink_tokens
  SET status = 'redeemed',
      redeemed_at = now()
  WHERE id = p_token_id;

  RETURN true;
END;
$$;
