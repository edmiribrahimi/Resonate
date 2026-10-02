-- ═══════════════════════════════════════════════════════════════════════════
-- La cancellazione degli ordini mai pagati e' ritirata: i dati restano.
--
-- Fase 52.1, piano 21 (DBT-15), correttiva di `20261001120300_order_entry_source.sql`.
--
-- **D-52.1-31 — decisione del proprietario, 2026-10-02, letterale: «deve
-- rimanere cosi' com'e' oggi».** Email e nome degli ordini mai pagati NON si
-- cancellano mai. La §3 di M-B rendeva possibile quella cancellazione —
-- `pii_cleared_at`, `buyer_email` nullabile, il CHECK che legava le due cose —
-- e M-B era gia' stata applicata al laboratorio (2026-10-02T21:51:16Z,
-- versione 20261002215116) quando la decisione e' arrivata.
--
-- Una migration applicata non si riscrive: si corregge in avanti. Questa toglie
-- esattamente cio' che la §3 aveva aggiunto e rimette `buyer_email` com'era.
-- `entry_source` e `checkout_form` (§1 e §2 di M-B) restano: sono numeri, non
-- persone, e non dipendono dalla cancellazione.
--
-- In produzione M-B e questa correttiva arrivano insieme nell'atto 4 (piano
-- 52.1-27), una dopo l'altra: lo stato finale e' lo stesso del laboratorio.
--
-- Una transazione sola, senza `BEGIN;`: l'endpoint
-- `POST /v1/projects/{ref}/database/migrations` la avvolge da solo.
-- ═══════════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. IL CHECK PRIMA, POI LA COLONNA CHE NOMINA
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.ticket_orders
  DROP CONSTRAINT IF EXISTS ticket_orders_buyer_email_cleared_check;

ALTER TABLE public.ticket_orders
  DROP COLUMN IF EXISTS pii_cleared_at;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. `buyer_email` TORNA NOT NULL, COM'ERA DA `20260905120000_ticket_orders.sql`
-- ─────────────────────────────────────────────────────────────────────────────
--
-- Nessuna riga e' mai stata messa a NULL: nessun codice scriveva il nullo, e il
-- CHECK lo avrebbe ammesso solo con `pii_cleared_at` valorizzato, che nessuno ha
-- mai scritto. Se una riga nulla esistesse, questa istruzione fallirebbe e
-- l'intera migration si annullerebbe: e' il comportamento voluto, non si
-- riempie un indirizzo inventato.

ALTER TABLE public.ticket_orders
  ALTER COLUMN buyer_email SET NOT NULL;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. COSA QUESTA MIGRATION NON FA
-- ─────────────────────────────────────────────────────────────────────────────
--
-- Non tocca `entry_source` ne' `checkout_form`, ne' i loro CHECK e COMMENT.
-- Nessuna policy, nessuna riga riscritta.
