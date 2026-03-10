-- Track refunded amount on drink_orders so analytics survive token cleanup.

ALTER TABLE public.drink_orders
  ADD COLUMN refunded_amount numeric(10,2) NOT NULL DEFAULT 0;

-- Backfill from any remaining refunded tokens
UPDATE public.drink_orders o
SET refunded_amount = sub.total_refunded
FROM (
  SELECT order_id, SUM(price) AS total_refunded
  FROM public.drink_tokens
  WHERE status = 'refunded'
  GROUP BY order_id
) sub
WHERE o.id = sub.order_id;
