-- ═══════════════════════════════════════════════════════════════════════════
-- Leggere i carrelli abbandonati senza tenere le persone.
--
-- Fase 52.1, piano 21 (DBT-15, D-52.1-20).
--
-- Il proprietario, 2026-09-30: «dobbiamo raccogliere piu' informazioni
-- possibili, anche dei carrelli abbandonati… analisi di mercato». La risposta
-- di questa migration e' raccogliere i NUMERI — da dove arriva chi compra, a
-- quale passo si ferma — e rendere possibile togliere le PERSONE dagli ordini
-- mai pagati, senza ancora farlo.
--
-- Tre colonne su `public.ticket_orders`, un `DROP NOT NULL` con il suo CHECK.
-- Nessuna policy, nessun riempimento, nessuna cancellazione.
--
-- ADDITIVA: va applicata PRIMA del codice che la scrive (piani 52.1-23 e
-- 52.1-24). Il codice gia' in esercizio non legge ne' scrive le colonne nuove.
--
-- Una transazione sola, senza `BEGIN;`: l'endpoint
-- `POST /v1/projects/{ref}/database/migrations` la avvolge da solo (misurato
-- il 2026-09-21, vedi `20260923180100_gallery_close_data.sql`).
-- ═══════════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. PERCHE' `entry_source`: DA DOVE ARRIVA CHI COMPRA
-- ─────────────────────────────────────────────────────────────────────────────
--
-- Si legge dal parametro `utm_source` del link d'ingresso e si RIDUCE a cinque
-- valori. **Il grezzo non si salva**: un testo libero preso da un URL e' un
-- vettore di dati personali (un indirizzo, un nome, un identificativo di
-- campagna cucito su una persona), e una colonna che lo accogliesse
-- conserverebbe cio' che nessuno ha deciso di raccogliere. Il vocabolario
-- chiuso e' la mitigazione, non un dettaglio di forma.
--
--   instagram   il link e' arrivato da Instagram (bio, storia, inserzione)
--   newsletter  il link e' arrivato dalla newsletter
--   flyer       il link e' arrivato dal volantino (QR stampato)
--   direct      nessun parametro: link digitato, condiviso a mano, segnalibro
--   other       un parametro c'era, ma non e' fra quelli riconosciuti
--
-- NULL = ordine nato prima di questa colonna, mai «sconosciuto»: lo
-- sconosciuto ha due nomi propri, `direct` e `other`.

ALTER TABLE public.ticket_orders
  ADD COLUMN IF NOT EXISTS entry_source text
    CONSTRAINT ticket_orders_entry_source_check
      CHECK (entry_source IS NULL OR entry_source IN
        ('instagram', 'newsletter', 'flyer', 'direct', 'other'));

COMMENT ON COLUMN public.ticket_orders.entry_source IS
  'Da dove arriva chi compra, ridotto dal parametro utm_source del link d''ingresso a un vocabolario '
  'chiuso: instagram, newsletter, flyer, direct (nessun parametro), other (parametro non riconosciuto). '
  'Il valore grezzo NON si salva: testo libero da un URL e'' un vettore di dati personali. '
  'NULL = ordine nato prima di questa colonna, MAI «sconosciuto». Nessun riempimento.';

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. PERCHE' `checkout_form`: IL PASSO IN CUI CI SI FERMA
-- ─────────────────────────────────────────────────────────────────────────────
--
-- Un carrello abbandonato non e' un evento solo: chi non apre mai il modulo di
-- pagamento e chi lo apre e poi lo chiude si sono fermati in due punti diversi
-- dell'imbuto, e chiedono due correzioni diverse. **L'API di checkout di SumUp
-- non lo sa** (A5): un checkout scaduto non dice se il modulo e' stato visto.
-- Il segnale deve venire da noi.
--
--   not_opened  scritto all'insert dal codice nuovo: l'ordine esiste, il
--               modulo non e' ancora stato mostrato
--   opened      scritto dal segnale firmato del modulo di pagamento quando si
--               monta davanti a chi compra
--
-- NULL = ordine nato prima di questa colonna.

ALTER TABLE public.ticket_orders
  ADD COLUMN IF NOT EXISTS checkout_form text
    CONSTRAINT ticket_orders_checkout_form_check
      CHECK (checkout_form IS NULL OR checkout_form IN ('not_opened', 'opened'));

COMMENT ON COLUMN public.ticket_orders.checkout_form IS
  'Il passo dell''imbuto raggiunto: not_opened (scritto all''insert, modulo di pagamento mai mostrato) '
  'o opened (scritto dal segnale firmato del modulo). Serve a distinguere dove si ferma un carrello '
  'abbandonato: l''API di SumUp non lo dice. NULL = ordine nato prima di questa colonna. Nessun dato '
  'personale, nessun riempimento.';

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. PERCHE' `pii_cleared_at`, E PERCHE' `buyer_email` PUO' DIVENTARE NULLO
-- ─────────────────────────────────────────────────────────────────────────────
--
-- I numeri restano per sempre; le persone no. Email e nome di un ordine MAI
-- pagato si tolgono dopo un periodo fisso, **ancora da decidere con il
-- professionista** (`52.1-LEGALE-PII.md`; la proposta e' 90 giorni, D-52.1-20):
-- la migration rende possibile la cancellazione, **non la esegue**. Il
-- meccanismo e' un piano separato (52.1-24) e nasce spento.
--
-- Il CHECK dice in una riga l'unico modo in cui un ordine perde l'indirizzo:
--
--   buyer_email IS NOT NULL
--   OR (status = 'expired' AND pii_cleared_at IS NOT NULL)
--
-- Un ordine pagato non perde mai l'indirizzo: e' quello a cui sono partiti i
-- biglietti e a cui partira' un eventuale avviso di rimborso. Un ordine non
-- pagato lo perde solo attraverso la cancellazione tracciata, che lascia
-- `pii_cleared_at` come prova di quando e' avvenuta. Un `UPDATE` che mettesse
-- NULL senza la data, o su un ordine non scaduto, viene rifiutato dal database
-- e non dal codice.
--
-- **Il pagamento tardivo su un ordine gia' cancellato** e' impossibile per
-- costruzione: `close-pending-orders` disattiva il checkout a 30 minuti, mesi
-- prima di qualunque cancellazione. Se accadesse, il CHECK rifiuterebbe il
-- passaggio a `completed` di una riga senza indirizzo, e il webhook lo
-- registra con la sua categoria (`paid_after_pii_cleared`) e un avviso
-- all'organizer: il denaro resta su SumUp, il rimborso e' manuale.
--
-- `buyer_name` e' gia' nullabile (D-50-18b) e non ha bisogno di nulla qui.

ALTER TABLE public.ticket_orders
  ADD COLUMN IF NOT EXISTS pii_cleared_at timestamptz;

COMMENT ON COLUMN public.ticket_orders.pii_cleared_at IS
  'Quando email e nome di questo ordine mai pagato sono stati tolti. NULL = mai tolti. E'' l''unica '
  'condizione, insieme a status = expired, sotto cui buyer_email puo'' essere nullo '
  '(ticket_orders_buyer_email_cleared_check). Il periodo di conservazione e'' da decidere con il '
  'professionista; questa colonna non lo fissa.';

ALTER TABLE public.ticket_orders
  ALTER COLUMN buyer_email DROP NOT NULL;

ALTER TABLE public.ticket_orders
  ADD CONSTRAINT ticket_orders_buyer_email_cleared_check
    CHECK (buyer_email IS NOT NULL OR (status = 'expired' AND pii_cleared_at IS NOT NULL));

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. COSA QUESTA MIGRATION NON FA, PER DECISIONE
-- ─────────────────────────────────────────────────────────────────────────────
--
-- **Nessuna policy nuova.** Le colonne le scrive il solo `service_role`;
-- `ticket_orders_select_own` resta l'unica policy della tabella.
--
-- **Nessun riempimento.** Ogni colonna nasce NULL sulle righe esistenti, e
-- NULL vuol dire «prima della colonna».
--
-- **Nessuna cancellazione.** Nessuna riga perde email o nome per effetto di
-- questa migration: il CHECK lo permette, l'interruttore del piano 52.1-24 lo
-- esegue, e solo dopo la risposta datata del professionista.
