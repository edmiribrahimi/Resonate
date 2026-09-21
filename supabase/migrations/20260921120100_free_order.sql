-- ═══════════════════════════════════════════════════════════════════════════
-- L'ordine a totale zero: rappresentabile, senza toccare niente del denaro
--
-- Fase 50 «Via le iscrizioni» — REG-06.
-- Decisioni: D-50-18, D-50-18b, D-50-19, D-50-24, D-50-26.
--
-- Questa migration rende RAPPRESENTABILE un ordine che nessuno paga. Non scrive
-- il percorso — quello e' il piano 50-04 — e non tocca la firma ne' il corpo di
-- `reserve_ticket_order`, che fa gia' il lavoro giusto: transazionale, con
-- `FOR UPDATE` sull'ordine, idempotente sul ramo `completed`
-- (`20260905120100:77-84`), tetto per serata (`:122-136`) e capienza del tier
-- confrontata con `quantity` e non con 1 (`:145-163`).
--
-- ── IL VERSO DEL DEPLOY E' INVERTITO. CODICE PRIMA, QUESTA MIGRATION DOPO ───
--
-- **NON APPLICARE QUESTA MIGRATION ALLA PRODUZIONE PRIMA DEL DEPLOY DEL CODICE
-- DELLA FASE 50.** Vale l'inversione dichiarata da D-50-24 e scritta per esteso
-- nella migration che la precede (`20260921120000_drop_status_and_referral.sql`,
-- sezione «il verso del deploy»), che a sua volta cita il precedente
-- `20260809006000_event_media_server_upload_only.sql`: *fra un peggioramento
-- temporaneo e uno stato invariato si sceglie lo stato invariato*.
--
-- Qui il criterio dice la stessa cosa, e per un motivo suo:
--
--   * **applicarla PRIMA** non romperebbe il percorso pagato — le due colonne
--     sono additive e il vincolo che sostituisce l'unicita' e' lo stesso sulle
--     righe che hanno un checkout — ma ANTICIPEREBBE il riempimento (sezione 3)
--     su un database dove nessun codice sa ancora cosa farsene: si creerebbero
--     livelli di biglietto a prezzo zero su serate gratuite **prima** che esista
--     il percorso che li usa, cioe' righe visibili alle letture pubbliche della
--     serata senza una strada per prenotarle;
--   * **applicarla DOPO** il deploy non rompe niente: il codice gia' spinto
--     regge la colonna `NOT NULL` finche' c'e' — il percorso gratuito e' nuovo,
--     non riscrive quello pagato — e il riempimento nasce nello stesso momento
--     in cui qualcosa sa leggerlo.
--
-- La produzione arriva nel piano 50-11, sotto autorizzazione datata, dopo il
-- deploy del codice (D-50-24). Fino ad allora questa migration vive **solo sul
-- laboratorio**, ed e' li' che e' stata applicata e riletta dal catalogo.
--
-- ── UNA TRANSAZIONE SOLA, E NON C'E' `BEGIN;` PERCHE' NON SERVE ─────────────
--
-- Misurato sul laboratorio il 2026-09-21 alle 12:35:43Z e registrato nel
-- SUMMARY del piano 50-02: l'endpoint `POST /v1/projects/{ref}/database/
-- migrations` avvolge il corpo in UNA transazione da solo. Un `BEGIN;` esplicito
-- qui produrrebbe un `WARNING: there is already a transaction in progress`.
-- Nessuna delle sei migration della fase 49 lo porta, e questa non fa eccezione.
--
-- ── COSA QUESTA MIGRATION NON FA, E VA SCRITTO ─────────────────────────────
--
--   * **non tocca `reserve_ticket_order`** — ne' la firma, ne' il corpo, ne' il
--     suo permesso. La funzione resta concessa al solo `service_role`
--     (`20260905120100:293-297`), e non c'e' un solo `GRANT` ne' un solo
--     `REVOKE` in questo file. `20260905150000_reserve_ticket_service_only.sql`
--     esiste per aver tolto esattamente quel permesso a `anon` e
--     `authenticated` su `reserve_ticket`: non si riapre per comodita' di un
--     percorso gratuito. Il percorso nuovo passa dal client di servizio, come
--     il webhook;
--   * **non rende nullabile `tickets.tier_id` ne' `ticket_orders.tier_id`.** E'
--     la ragione per cui il livello a prezzo zero esiste: rendere nullabile
--     `tickets.tier_id` (`20260225110000:26`) significherebbe toccare la tabella
--     del denaro e ogni lettura che ne dipende, dentro una fase che ha gia' una
--     migration irreversibile accanto a questa;
--   * **non allarga alcun `CHECK` su `issued_via`**, che e' testo nudo con
--     default `'guest_checkout'` (`20260905120100:28`) e accetta gia' un valore
--     nuovo — `free_rsvp` — senza che nessuno debba toccare un vincolo;
--   * **non tocca `public.rsvps`.** Lo storico resta in sola lettura (D-50-22):
--     i suoi quattro lettori, fra cui la rivelazione del venue e il cron dei
--     promemoria, continuano a servirlo.
-- ═══════════════════════════════════════════════════════════════════════════


-- ─────────────────────────────────────────────────────────────────────────────
-- 1. `ticket_orders.sumup_checkout_id`: nullabile, con l'unicita' INTATTA
-- ─────────────────────────────────────────────────────────────────────────────
--
-- `20260905120000:54-57` scrive che `sumup_checkout_id text UNIQUE NOT NULL`
-- **E' l'idempotenza del pagamento**: la garanzia che due consegne dello stesso
-- webhook non diventino due ordini. Quella garanzia qui **non si indebolisce di
-- un grado**, e la ragione e' aritmetica e non retorica: un indice unico
-- PARZIALE ristretto a `WHERE sumup_checkout_id IS NOT NULL` e' **esattamente lo
-- stesso vincolo** sulle righe che hanno un checkout. Un ordine pagato ha sempre
-- un checkout — lo scrive chi apre il checkout, prima di ogni altra cosa
-- (`guest-purchase-actions.ts:312`) — quindi ogni riga del percorso pagato resta
-- dentro il predicato dell'indice. Cio' che esce dal predicato e' solo cio' che
-- un checkout non ce l'ha: l'ordine a totale zero, che nessun webhook consegna.
--
-- La forma e' gia' in uso due volte in questo stesso schema
-- (`20260905120000:230-238`, i due indici ristretti a `order_id IS NULL`): non
-- e' un'invenzione di questa fase, e' il modo in cui questa tabella scrive i
-- vincoli che valgono su un sottoinsieme.
--
-- PERCHE' NULLABILE E NON UN VALORE SINTETICO — LA RAGIONE E' MISURATA.
--
-- `src/app/api/cron/reconcile-refunds/route.ts:105` esce con `continue` quando
-- un biglietto non ha ne' checkout ne' codice di transazione; a `:110-111`
-- chiama `getCheckout(...)` su chi ha il primo e non il secondo. E
-- `reserve_ticket_order` COPIA il campo dall'ordine al biglietto
-- (`20260905120100:233`), quindi la scelta si propaga da qui fino al cron.
--
-- Un valore sintetico — `free-<uuid>`, `rsvp:<id>`, qualunque cosa — supererebbe
-- quel `continue` e manderebbe **ogni giorno, per ogni biglietto gratuito mai
-- emesso**, una richiesta verso un fornitore per un checkout che non esiste.
-- Non e' un costo che si paga una volta: e' una funzione crescente del numero
-- di RSVP, verso un terzo, per sempre. Un valore nullo cade sul `continue` alla
-- prima riga e il cron non se ne accorge.
--
-- Il nome dell'indice e' lo STESSO del vincolo che sostituisce, di proposito:
-- chi cercasse domani `ticket_orders_sumup_checkout_id_key` in un messaggio
-- `23505` o in un `onConflict` deve trovarlo dove si aspetta di trovarlo. E'
-- uno spostamento di forma, non di garanzia.

ALTER TABLE public.ticket_orders
  ALTER COLUMN sumup_checkout_id DROP NOT NULL;

ALTER TABLE public.ticket_orders
  DROP CONSTRAINT IF EXISTS ticket_orders_sumup_checkout_id_key;

CREATE UNIQUE INDEX IF NOT EXISTS ticket_orders_sumup_checkout_id_key
  ON public.ticket_orders (sumup_checkout_id) WHERE sumup_checkout_id IS NOT NULL;

COMMENT ON COLUMN public.ticket_orders.sumup_checkout_id IS
  'NULLABILE DAL 2026-09-21, e l''unicita'' NON si e'' indebolita: l''indice unico PARZIALE '
  'ticket_orders_sumup_checkout_id_key (WHERE sumup_checkout_id IS NOT NULL) e'' lo stesso vincolo '
  'sulle righe che un checkout ce l''hanno. NULL significa ordine a totale zero (RSVP, REG-06), mai '
  '«checkout perso». NON metterci un valore sintetico: il cron di riconciliazione interrogherebbe il '
  'fornitore ogni giorno per ogni biglietto gratuito mai emesso (reconcile-refunds/route.ts:105,110-111).';


-- ─────────────────────────────────────────────────────────────────────────────
-- 2. `ticket_orders.buyer_name`: dove il nome ha una casa, e dove NON ce l'ha
-- ─────────────────────────────────────────────────────────────────────────────
--
-- D-50-18b: il modulo a pagamento e quello gratuito chiedono gli stessi due
-- campi — `Full name` (un campo solo) e mail — e il nome va **nell'account**,
-- via `createUser({ user_metadata: { full_name } })` e da li' in
-- `profiles.full_name`, come fa gia' il percorso guest list
-- (`process-entry.ts:238-242`).
--
-- PERCHE' ALLORA UNA COLONNA SULL'ORDINE. Perche' sul percorso PAGATO l'account
-- non esiste quando il modulo viene compilato: nasce al **webhook**, dopo la
-- verifica dell'incasso — ed e' la stessa ragione per cui `user_id` e'
-- nullabile (`20260905120000:47-52`). Fra il modulo e il webhook passano minuti
-- o ore; senza una casa sull'ordine il nome raccolto non arriverebbe **mai**
-- all'account, e il campo sul modulo sarebbe teatro.
--
-- DOVE IL NOME NON VA, e non e' una raccomandazione:
--
--   * **non su `tickets.holder_label`**, che porta un progressivo dentro
--     l'ordine — «2 di 6» — e che `20260905120000:162-169` dichiara per esteso:
--     *«NON E'' UN NOME e non deve diventarlo: il biglietto e'' al portatore
--     (D-49-03), e un nome sullo schermo dello staff fa rifiutare un ospite
--     valido oppure diventa teatro»*;
--   * **non sullo schermo dello staff.** La porta legge una firma, non
--     un'anagrafe. Nessuna lettura del percorso di check-in tocca questa
--     colonna, e nessuna deve cominciare.
--
-- NESSUN DEFAULT E NESSUN RIEMPIMENTO, per la stessa ragione con cui
-- `20260905120000:171-176` li rifiuta su `issued_via` e
-- `20260808003000_attendances_entry_role.sql` sui suoi: l'unico valore
-- disponibile a un riempimento sarebbe una supposizione di oggi scritta dentro
-- un fatto di ieri, e in un rapporto si leggerebbe come misurata.

ALTER TABLE public.ticket_orders
  ADD COLUMN IF NOT EXISTS buyer_name text;

COMMENT ON COLUMN public.ticket_orders.buyer_name IS
  'Il nome raccolto dal modulo (D-50-18b), e sta QUI perche'' sul percorso pagato l''account nasce al '
  'webhook, ore dopo: senza una casa sull''ordine il nome non arriverebbe mai a profiles.full_name. '
  'NULL significa «raccolto prima che questa colonna esistesse», mai «anonimo»: nessun default, '
  'nessun riempimento. IL NOME NON VA SUL BIGLIETTO: l''etichetta del portatore resta un '
  'progressivo (D-49-03), e lo schermo dello staff alla porta non mostra nomi.';


-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Il livello di biglietto a prezzo zero per le serate gratuite CHE GIA' CI SONO
-- ─────────────────────────────────────────────────────────────────────────────
--
-- IL VINCOLO CHE NESSUN DOCUMENTO A MONTE NOMINAVA:
-- `ticket_orders.tier_id uuid NOT NULL REFERENCES ticket_tiers ON DELETE
-- RESTRICT` (`20260905120000:62`) — e una serata `free_rsvp` **non ha tier**.
-- Un livello sotto c'e' `tickets.tier_id NOT NULL` (`20260225110000:26`).
-- Renderli nullabili significherebbe aprire la tabella del denaro; un livello a
-- prezzo zero **non tocca niente**, ed e' rappresentabile oggi:
--
--   * `ticket_tiers.price numeric CHECK (price >= 0)` — zero e' ammesso
--     (`20260225110000:13`);
--   * `quantity` e' nullabile dal 2026-02-27 e `NULL` significa ILLIMITATO
--     (`20260227100000_tier_optional_quantity.sql:2-4`);
--   * `party_id` e' nullabile con un `CHECK` che pretende almeno uno fra
--     `party_id` ed `event_id` (`20260226300000:44-48`) — qui si valorizzano
--     entrambi.
--
-- E dentro `reserve_ticket_order` fa il lavoro giusto senza una riga nuova: il
-- ramo della capienza (`20260905120100:145-163`) prende `tt.quantity FOR UPDATE`
-- e confronta `venduti + quantity` con quel numero. Cioe' **la capienza della
-- serata gratuita viene applicata dentro la transazione** — l'unico posto dove
-- regge sotto concorrenza. La capienza della serata si copia qui una volta; se
-- l'organizer la cambia dopo, il piano 50-04 e' cio' che tiene allineati i due
-- numeri, non questa migration.
--
-- `quantity = NULL` QUANDO LA SERATA NON DICHIARA CAPIENZA, e non e' una svista:
-- `event_parties.capacity` e' nullabile con `CHECK (capacity IS NULL OR capacity
-- > 0)` (`20260225150000:19`), e `NULL` li' significa «capienza non dichiarata».
-- `NULL` su `ticket_tiers.quantity` significa «illimitato». Sono la stessa cosa
-- detta due volte, ed e' la traduzione corretta: mettere un numero inventato
-- sarebbe dichiarare un limite che la serata non ha dichiarato.
--
-- ── QUESTA E' UNA SCRITTURA DI DATI, E VA DICHIARATA COME TALE ──────────────
--
-- E' l'unica istruzione di questa fase che **crea righe** fuori dalle
-- cancellazioni del piano 50-11. **Quante righe tocca si MISURA, non si
-- suppone**: il conteggio va riletto dal catalogo dopo l'applicazione e
-- riportato nel SUMMARY, sia per il laboratorio sia, un giorno, per la
-- produzione. Il `NOT EXISTS` la rende rieseguibile senza creare doppioni.

INSERT INTO public.ticket_tiers (event_id, party_id, name, price, quantity)
SELECT ep.event_id, ep.id, 'RSVP', 0, ep.capacity
FROM public.event_parties ep
WHERE ep.access_type = 'free_rsvp'
  AND NOT EXISTS (
    SELECT 1
    FROM public.ticket_tiers tt
    WHERE tt.party_id = ep.id
      AND tt.price = 0
  );


-- ─────────────────────────────────────────────────────────────────────────────
-- 4. A cosa serve quel livello, chi lo crea, e CHI NON PUO' CREARLO
-- ─────────────────────────────────────────────────────────────────────────────
--
-- NESSUN VINCOLO DI UNICITA' NUOVO, ed e' una scelta con un costo dichiarato.
-- Un indice unico parziale `WHERE price = 0` vieterebbe a una serata **a
-- pagamento** di avere un livello omaggio — che oggi e' rappresentabile e che il
-- banco di prova del laboratorio usa davvero (`scripts/seed-lab-door.mjs`, tier
-- `Lab` a `0` su una serata `paid`). La garanzia che di livelli a zero per
-- serata gratuita ne esista **uno** non viene da un vincolo che restringe un
-- caso legittimo: viene dal fatto che il livello e' creato **una volta, in un
-- posto solo** — qui per le serate che esistono gia', e alla creazione e alla
-- modifica della serata dal piano 50-04.
--
-- E DAL PERCORSO PUBBLICO NON SI CREA. Se al momento della prenotazione il
-- livello manca, l'azione **rifiuta con la sua causa**; non lo conia. Un
-- percorso pubblico che puo' creare un livello di biglietto e' una seconda
-- strada verso l'emissione — cioe' esattamente la superficie che questa fase
-- restringe altrove — e nascerebbe dentro un percorso concorrente, dove
-- servirebbe una guardia di unicita' che la riga qui sopra dichiara di non
-- volere.

COMMENT ON TABLE public.ticket_tiers IS
  'I livelli di biglietto di una serata. Un livello a price = 0 su una serata free_rsvp e'' cio'' che '
  'rende rappresentabile l''ordine a totale zero di REG-06: e'' lui a portare la capienza che la RPC '
  'di riserva applica DENTRO la transazione. Lo crea la serata — questa migration per le '
  'serate che esistevano gia'', il percorso di creazione/modifica della serata da qui in avanti. '
  'NESSUN PERCORSO PUBBLICO PUO'' CREARLO: se manca al momento della prenotazione, l''azione rifiuta '
  'con la sua causa. Nessun vincolo di unicita'' su price = 0, di proposito: una serata a pagamento '
  'puo'' legittimamente avere un livello omaggio.';
