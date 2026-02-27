CREATE TABLE public.ticket_refunds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES public.tickets ON DELETE CASCADE,
  requested_by uuid NOT NULL REFERENCES auth.users,
  processed_by uuid REFERENCES auth.users,
  reason text,
  admin_note text,
  amount numeric(10,2) NOT NULL,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected')),
  sumup_status text
    CHECK (sumup_status IN ('pending', 'completed', 'failed')),
  type text NOT NULL DEFAULT 'user_request'
    CHECK (type IN ('user_request', 'admin_initiated')),
  created_at timestamptz DEFAULT now(),
  processed_at timestamptz
);

ALTER TABLE public.ticket_refunds ENABLE ROW LEVEL SECURITY;

-- Users can see their own refund requests
CREATE POLICY refunds_select_own ON public.ticket_refunds
  FOR SELECT USING (requested_by = auth.uid());

-- Admin/organizer can see all refund requests
CREATE POLICY refunds_select_admin ON public.ticket_refunds
  FOR SELECT USING ((SELECT public.is_admin_or_organizer()));

-- Users can insert their own refund requests
CREATE POLICY refunds_insert_own ON public.ticket_refunds
  FOR INSERT WITH CHECK (requested_by = auth.uid());

-- Admin/organizer can update refund requests (approve/reject)
CREATE POLICY refunds_update_admin ON public.ticket_refunds
  FOR UPDATE USING ((SELECT public.is_admin_or_organizer()));
