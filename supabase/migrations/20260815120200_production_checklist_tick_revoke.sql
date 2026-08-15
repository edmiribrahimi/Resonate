-- ============================================================================
-- 20260815120200 — the tick function stops being reachable without a session
-- ============================================================================
--
-- WHAT THIS FIXES, AND WHY IT IS ITS OWN MIGRATION
--
-- `20260815120100_production_calendar_access.sql` states, about
-- `record_checklist_tick`, that "with no grant to `authenticated`, the function
-- is unreachable at /rest/v1/rpc/… for a user session". That sentence is
-- false as written, and the read-back after applying it proved so:
--
--   proacl = {=X/postgres,postgres=X/postgres,anon=X/postgres,
--             authenticated=X/postgres,service_role=X/postgres}
--
-- **Postgres grants EXECUTE to PUBLIC by default on every new function.** A
-- `GRANT` alone therefore adds a role beside a default that is already open; it
-- is the `REVOKE` that closes it. The analog this project already had —
-- `record_venue_reveal_act`, at `20260810160000_*.sql:598-607` — is two
-- statements for exactly that reason, and its own comment says so. The access
-- migration cited the GRANT half of that pair and omitted the REVOKE half.
--
-- The applied migration is NOT edited: its content is already in the project's
-- migration history, and rewriting a file that has been applied makes the
-- history a description of something that never ran. The correction travels
-- forward, which is the same discipline this project applies to a payment that
-- reconciles: correct ahead, never pretend backwards.
--
-- WHAT IT COST WHILE IT WAS OPEN
--
-- The six tables are empty, so a call could only reach `actor_unknown` or
-- `item_not_found` — but those two codes differ, and the difference is an
-- oracle about whether a profile exists, reachable with no session at all and
-- with no rate limiting anywhere in this product. After the calendar is
-- imported it would become the ability to tick a checklist item and attribute
-- it to somebody else, which is the trace this phase exists to keep honest.
--
-- IDEMPOTENT: REVOKE of an absent privilege and GRANT of a present one are both
-- no-ops. Running this twice changes nothing the second time.
--
-- NO MATERIAL: this file carries no venue, no date and no line-up. It names one
-- function and three roles.
-- ============================================================================

BEGIN;

-- REVOKE first, GRANT second, as two statements and in this order — the shape
-- `record_venue_reveal_act` uses, and for the reason its comment gives.
REVOKE ALL ON FUNCTION public.record_checklist_tick(uuid, boolean, uuid, text)
  FROM public, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.record_checklist_tick(uuid, boolean, uuid, text)
  TO service_role;

COMMENT ON FUNCTION public.record_checklist_tick(uuid, boolean, uuid, text) IS
  'PROD-01: records a checklist tick together with who made it and when, in one transaction, so the trace cannot fail while the tick succeeds — a divergence nothing in this product would report, since there is no error tracking. '
  'The actor is an ARGUMENT because auth.uid() is null under the service client. That is precisely why execute is revoked from public, anon and authenticated and granted to service_role alone: a caller that could reach this function could choose the author of a tick, and a trace whose author is chosen by the caller is a claim, not a trace. '
  'The entitlement check lives in the calling Server Action, not here: has_capability answers about auth.uid(), which is null on every path that reaches this function, so a check here would refuse every legitimate tick. '
  'Refusals are RETURNED VALUES and not exceptions: on a constraint violation PostgREST returns the entire failing row in error.details, and a row of production_plan carries the venue word.';

COMMIT;
