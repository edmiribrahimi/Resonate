-- ═══════════════════════════════════════════════════════════════════════════
-- Un tier porta una descrizione: cosa include
--
-- Decisione del proprietario, 2026-09-24: ogni livello di biglietto puo' dire
-- cosa comprende («2 drink inclusi», «ingresso dopo mezzanotte», ...). Il testo
-- si legge in QUATTRO posti — la pagina pubblica della serata, la pagina del
-- biglietto, la pagina d'ordine del guest e la mail d'ordine — perche' e' alla
-- porta, col biglietto sul telefono, che lo staff decide se un drink e' dovuto.
--
-- ── E' COPY PUBBLICA, LETTA PRIMA DELL'ACQUISTO ──────────────────────────────
--
-- Chiunque apra la pagina della serata la vede, anche senza biglietto. Quindi
-- **non descrive mai un posto**: ne' un indirizzo, ne' un indizio sulla sede.
-- E' `venue-secrecy.md` applicato a un campo di testo libero: nessun predicato
-- puo' vederlo, quindi il vincolo sta su chi scrive, e il form lo dice sotto
-- la casella. Il gate delle superfici (`verify:venue-surfaces`, controllo G2)
-- ammette la colonna per nome sulla pagina d'ordine, deliberatamente.
--
-- ── ADDITIVA, NULLABLE, SENZA DEFAULT ────────────────────────────────────────
--
-- Le righe esistenti restano senza descrizione e ogni superficie che la
-- disegna la salta quando e' nulla: il codice vecchio, che seleziona `*` o
-- `name`, non cambia comportamento. Si puo' applicare prima o dopo il deploy.
--
-- Il tetto a 500 caratteri e' il tetto di cio' che si stampa in una mail e si
-- legge su un telefono in fila: l'applicazione lo ripete, il database lo
-- garantisce.
--
-- Una transazione sola, senza `BEGIN;`: l'endpoint
-- `POST /v1/projects/{ref}/database/migrations` la avvolge da solo (misurato
-- il 2026-09-21, vedi `20260923180100_gallery_close_data.sql`).
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE public.ticket_tiers
  ADD COLUMN description text
    CONSTRAINT ticket_tiers_description_length
      CHECK (description IS NULL OR char_length(description) <= 500);

COMMENT ON COLUMN public.ticket_tiers.description IS
  'Cosa include il livello. Copy pubblica: pagina serata, biglietto, ordine, mail. Mai un posto (venue-secrecy).';
