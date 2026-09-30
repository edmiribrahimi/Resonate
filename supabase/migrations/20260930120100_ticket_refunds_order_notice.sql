-- ═══════════════════════════════════════════════════════════════════════════
-- Il rimborso ricorda l'ordine e l'avviso al titolare.
--
-- Fase 52.2, piano 02 (RFD-01, RFD-04).
--
-- Due colonne su `public.ticket_refunds`, un indice parziale. Nessuna FK,
-- nessuna policy, nessun riempimento.
--
-- Una transazione sola, senza `BEGIN;`: l'endpoint
-- `POST /v1/projects/{ref}/database/migrations` la avvolge da solo.
-- ═══════════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. `refunded_order_id`: L'ORDINE, SCRITTO PRIMA DELLA CANCELLAZIONE
-- ─────────────────────────────────────────────────────────────────────────────
--
-- Stessa ragione di `refunded_ticket_id` (`20260805120000_door_scan_events.sql`
-- §2): la colonna deve **sopravvivere alla riga che nomina**. Una chiave
-- esterna — qualunque sia il suo ON DELETE — porterebbe via il valore o
-- bloccherebbe la cancellazione. Il percorso di rimborso la scrive **prima** di
-- cancellare il biglietto, perche' dopo non e' piu' leggibile.
--
-- Serve a due letture: il confronto per transazione (quanti biglietti di un
-- ordine sono stati rimborsati contro quanti ne ha emessi) e la porta, che deve
-- poter dire «rimborsato» invece di «sconosciuto».

ALTER TABLE public.ticket_refunds
  ADD COLUMN IF NOT EXISTS refunded_order_id uuid;

CREATE INDEX IF NOT EXISTS idx_ticket_refunds_refunded_order
  ON public.ticket_refunds (refunded_order_id)
  WHERE refunded_order_id IS NOT NULL;

COMMENT ON COLUMN public.ticket_refunds.refunded_order_id IS
  'L''ordine a cui apparteneva il biglietto rimborsato, scritto PRIMA della cancellazione. '
  'Volutamente senza FK: deve sopravvivere alla riga che nomina. NULL su un rimborso storico '
  'significa SCONOSCIUTO, non «nessun ordine»: i biglietti sono gia'' cancellati e nessun '
  'riempimento e'' possibile.';

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. `notified_email_id`: IL TITOLARE E' STATO AVVISATO?
-- ─────────────────────────────────────────────────────────────────────────────
--
-- L'id del fornitore della mail `ticket_refunded`. Il registro delle consegne
-- non puo' rispondere da solo: `email_deliveries.ticket_id` e' ON DELETE
-- CASCADE e il biglietto rimborsato viene cancellato, quindi la riga di
-- registro di quella mail porta `ticket_id` nullo per costruzione. Il legame
-- sta qui, sulla riga che sopravvive.

ALTER TABLE public.ticket_refunds
  ADD COLUMN IF NOT EXISTS notified_email_id text;

COMMENT ON COLUMN public.ticket_refunds.notified_email_id IS
  'L''id del fornitore della mail ticket_refunded inviata al titolare. NULL su un rimborso storico '
  'significa SCONOSCIUTO, non «nessun avviso»; su un rimborso nuovo significa che l''invio non e'' '
  'stato preso in carico.';

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. COSA QUESTA MIGRATION NON FA, PER DECISIONE
-- ─────────────────────────────────────────────────────────────────────────────
--
-- **Nessuna chiave esterna**, per la ragione del §1.
-- **Nessuna policy nuova**: le policy esistenti di `ticket_refunds` restano le
-- sole, e le colonne le scrive il percorso di rimborso lato server.
-- **Nessun riempimento**: i biglietti che i rimborsi storici nominavano non
-- esistono piu', e ogni valore sarebbe una supposizione.
