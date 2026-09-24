-- ═══════════════════════════════════════════════════════════════════════════
-- Ogni organizer gestisce ogni serata — via la proprieta' dal confine RLS
--
-- Decisione del proprietario, 2026-09-24: *«gli organizer possono modificare
-- eventi che non hanno creato loro. Se Ets crea un evento, Rebecca puo'
-- gestirlo in toto»*. Fino a oggi quattro policy legavano UPDATE e DELETE al
-- creatore (`events.created_by`) o al master; da oggi la domanda e' una sola,
-- «tiene `staff.manage`?», la stessa che gia' governa la lettura
-- (`events_select_admin`) e l'inserimento.
--
-- ── COSA CAMBIA, MISURATO SUL CATALOGO VIVO IL 2026-09-24 ──────────────────
--
-- Le sole policy di `public` il cui corpo nominava `created_by` erano queste
-- quattro (interrogazione su `pg_policies`, letta prima di scrivere):
--
--   events.events_update_own          uid = created_by OR master.manage
--   events.events_delete_own          uid = created_by OR master.manage
--   event_parties.event_parties_update_own   staff.manage AND (master OR creatore dell'evento)
--   event_parties.event_parties_delete_own   staff.manage AND (master OR creatore dell'evento)
--
-- `master.manage` e' concesso al solo master, `staff.manage` a master e
-- organizer (`private.role_capabilities`, riletta lo stesso giorno). Quindi il
-- master non perde niente e l'organizer guadagna esattamente le righe altrui.
-- Nessun altro ruolo tiene `staff.manage`: `staff` e `attendee` restano fuori.
--
-- Il codice applicativo fa la stessa sostituzione nello stesso commit
-- (`src/lib/capabilities/guards.ts`, `mayManageEvent`): la RLS resta il
-- confine, la guardia in Node resta la cortesia che risponde con una frase.
--
-- I nomi cambiano perche' il predicato cambia: una policy chiamata `_own` che
-- non guarda piu' il proprietario e' una riga che mente a chi la legge.
--
-- Una transazione sola, senza `BEGIN;`: l'endpoint la avvolge da solo.
-- ═══════════════════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS events_update_own ON public.events;
DROP POLICY IF EXISTS events_delete_own ON public.events;

CREATE POLICY events_update_staff ON public.events
  AS PERMISSIVE
  FOR UPDATE
  USING ((select private.has_capability('staff.manage')))
  WITH CHECK ((select private.has_capability('staff.manage')));

CREATE POLICY events_delete_staff ON public.events
  AS PERMISSIVE
  FOR DELETE
  USING ((select private.has_capability('staff.manage')));

DROP POLICY IF EXISTS event_parties_update_own ON public.event_parties;
DROP POLICY IF EXISTS event_parties_delete_own ON public.event_parties;

CREATE POLICY event_parties_update_staff ON public.event_parties
  AS PERMISSIVE
  FOR UPDATE
  USING ((select private.has_capability('staff.manage')))
  WITH CHECK ((select private.has_capability('staff.manage')));

CREATE POLICY event_parties_delete_staff ON public.event_parties
  AS PERMISSIVE
  FOR DELETE
  USING ((select private.has_capability('staff.manage')));
