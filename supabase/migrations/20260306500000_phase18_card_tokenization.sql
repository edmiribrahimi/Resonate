-- Phase 18: Card Tokenization
-- Add sumup_customer_id to profiles for SumUp customer linking.
-- Enables lazy creation pattern: column populated only when a member
-- chooses to save a card for future payments.

-- ============================================================
-- profiles: add sumup_customer_id
-- ============================================================
ALTER TABLE public.profiles
  ADD COLUMN sumup_customer_id TEXT;

-- Partial index for fast lookup (only rows that have a customer linked)
CREATE INDEX idx_profiles_sumup_customer_id
  ON public.profiles (sumup_customer_id)
  WHERE sumup_customer_id IS NOT NULL;
