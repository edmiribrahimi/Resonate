-- ═══════════════════════════════════════════════════════════════════════════
-- La gallery ha una chiave, e una foto ha un indirizzo che si firma
--
-- Fase 52 «La barra di navigazione e i ritocchi» — NAV-02, NAV-07. M1 di due.
-- Decisioni: D-52-12 (la chiave `gallery.view`, per ruolo a master, organizer e
-- staff), D-52-13 (`/gallery` entra nella mappa delle rotte sotto quella
-- chiave), D-52-25 (NAV-07: la gallery chiude anche i DATI, non solo la rotta).
--
-- ── IL VERSO DEL DEPLOY: QUESTA MIGRATION PRIMA, IL CODICE DOPO ────────────
--
-- **Applicare PRIMA del deploy del codice della fase 52.** E' il verso opposto
-- a quello della fase 51, e la ragione e' la stessa letta dall'altro lato: qui
-- si AGGIUNGE cio' che il codice nuovo scrive e legge.
--
--   * **codice PRIMA di questa migration**: `registerMedia` nuovo scriverebbe
--     `storage_path`, una colonna che non c'e' — ogni caricamento riceverebbe
--     `42703` — e la mappa delle rotte chiederebbe `gallery.view`, una chiave
--     che il catalogo non conosce: `private.has_capability` risponde falso per
--     una chiave ignota, quindi `/gallery` sarebbe rifiutata A TUTTI (fallisce
--     chiuso, nessuna fuga — ma la gallery sparisce anche a chi la tiene);
--   * **questa migration PRIMA del codice**: il codice di oggi continua a
--     funzionare senza accorgersene. Scrive `url` e non `storage_path` — e qui
--     `storage_path` nasce NULLABLE apposta (vedi sotto); legge `url` — e `url`
--     resta popolato; carica sul bucket pubblico — e il bucket resta pubblico.
--
-- L'ordine di NAV-07 e' un vincolo duro, in tre passi:
--   **M1 (questo file) additiva → deploy del codice che firma → M2 che chiude**
--   (`20260923180100_gallery_close_data.sql`, piano 52-13).
--
-- ── UNA TRANSAZIONE SOLA, E NON C'E' `BEGIN;` PERCHE' NON SERVE ────────────
--
-- **Misurato sul laboratorio il 2026-09-21 alle 12:35:43Z dalla fase 50, e non
-- rimisurato qui perche' la misura e' dell'endpoint, non del file.**
-- `POST /v1/projects/{ref}/database/migrations` avvolge il corpo in UNA
-- transazione da solo: una sonda con `create table private._tx_probe(x int)`
-- seguita da `select 1/0` e' tornata `400 … division by zero`, e subito dopo
-- `to_regclass('private._tx_probe')` era **null**. Un `BEGIN;` esplicito qui
-- produrrebbe `WARNING: there is already a transaction in progress` e un
-- `COMMIT` che chiude a meta' la transazione dell'endpoint.
-- Vedi `20260921120000_drop_status_and_referral.sql:42-55` e
-- `20260922120000_role_attendee_and_capability_keys.sql:32-42`.
--
-- E la transazione unica e' il meccanismo: se il `DO` della sezione 8 solleva,
-- **nulla** di questo file e' applicato — ne' la chiave, ne' la colonna, ne' la
-- policy. Un catalogo con la chiave e senza le sue concessioni, o una colonna
-- senza il suo backfill, e' lo stato a meta' che la transazione esclude.
--
-- ── COSA QUESTA MIGRATION NON FA, E VA LETTO PRIMA DI CERCARLO ─────────────
--
--   * **Non chiude il bucket `event-media`.** Resta pubblico. Chiuderlo prima
--     del deploy del codice che firma renderebbe ogni foto gia' mostrata un
--     riquadro vuoto — la pagina di oggi usa l'URL pubblico. E' di M2.
--   * **Non tocca `event_media_select_approved`**, che oggi mostra le righe
--     approvate a QUALUNQUE sessione autenticata, `attendee` compreso. Legarla a
--     `gallery.view` e' di M2: fatto qui, il codice di oggi — che legge con la
--     sessione — perderebbe le righe prima di avere la pagina che le chiede a
--     chi le tiene.
--   * **Non toglie la policy «Anyone can view event media»** su
--     `storage.objects`. E' il braccio del bucket pubblico, e cade con lui in M2.
--   * **Non rende `storage_path` obbligatoria.** Il vincolo di non-nullita'
--     arriva in M2, dopo un secondo backfill delle righe nate fra M1 e il deploy.
--
-- ── LA CORREZIONE ALLA RICERCA, DICHIARATA (planner, 2026-09-23) ───────────
--
-- `52-RESEARCH.md` §I.4 metteva `storage_path` obbligatoria gia' in M1. Ma fra
-- M1 e il deploy il codice **di oggi** inserisce righe senza `storage_path`
-- (`registerMedia` scrive solo `url`, `src/app/(public)/events/[slug]/actions.ts`):
-- con la colonna obbligatoria in M1 **il caricamento si rompe in produzione**
-- per tutta la finestra — lo stesso guasto che §I.6 attribuiva al solo ordine
-- inverso. Quindi qui `storage_path` nasce nullable con backfill, `url` perde
-- il vincolo di non-nullita' (innocuo per il codice di oggi, che lo scrive
-- ancora; necessario al codice nuovo, che smette di scriverlo), e M2 ripete il
-- backfill e solo allora chiude. **Nessuna finestra rompe il caricamento.**
--
-- ── LE RIGHE CHE ESISTONO GIA' (gate *default sulle righe esistenti*) ──────
--
-- Censimento del piano 52-01 (`52-ESITI.md`): **produzione zero righe**;
-- laboratorio cinque, seminate dal banco. Su entrambi i progetti **zero** `url`
-- di forma diversa dal prefisso pubblico del bucket, quindi il backfill della
-- sezione 3 copre ogni riga per costruzione. Il `DO` della sezione 8 lo
-- pretende comunque: la produzione puo' ricevere righe fra il censimento e
-- l'atto, e una riga di forma diversa si guarda una per una, non si indovina.
--
-- ⚠ QUESTO FILE E' UNA PUBBLICAZIONE (repo pubblico): nessun path di oggetto,
-- nessun identificativo di riga, nessuna serata, nessuna sede.


-- ===========================================================================
-- 1. La chiave (D-52-12)
-- ===========================================================================
--
-- Due colonne e non tre: `requires_approved` non esiste dalla fase 50
-- (`20260921120000_drop_status_and_referral.sql`). La descrizione e'
-- BYTE-IDENTICA alla voce di `CAP_DESCRIPTIONS` in
-- `src/lib/capabilities/keys.ts`, nello stesso commit: una chiave non ha uno
-- specchio SQL che il compilatore possa tenere, e l'unico confronto e'
-- `scripts/verify-capabilities.mjs`, contro un database vivo.

INSERT INTO private.capabilities (key, description) VALUES
  (
    'gallery.view',
    'See the gallery: the approved photos and videos of the nights. Granted by role to master, organizer and staff (phase 52, D-52-12) — for staff it is the one key the role holds by itself, while the door stays with the per-night assignment. attendee does not hold it: a ticket is not a seat in the archive. From NAV-07 it gates the rows of event_media as well as the /gallery address.'
  )
ON CONFLICT (key) DO NOTHING;


-- ===========================================================================
-- 2. Le tre concessioni — e il rifiuto che e' un'assenza
-- ===========================================================================
--
-- `staff` la tiene **per ruolo**, ed e' la sua prima concessione per ruolo dalla
-- fase 51 (che gliele aveva tolte tutte, D-51-07). Non riapre il modo di fallire
-- di `20260808000500_staff_role.sql:88-94` al contrario: vedere l'archivio delle
-- serate non e' lavoro alla porta, e la porta resta dell'assegnazione
-- (`party_assignments`, `live_assignment_capabilities`).
--
-- `attendee` NON la tiene, e il rifiuto e' l'assenza di una riga — mai una riga
-- con un valore negativo: `private.has_capability` e' un `EXISTS`, e una riga
-- «negata» concederebbe (`scripts/verify-capabilities.mjs`, paragrafo su
-- `ROLE_GRANTS`). Il rifiuto e' dichiarato la', nel blocco `attendee`.

INSERT INTO private.role_capabilities (role, capability) VALUES
  ('master',    'gallery.view'),
  ('organizer', 'gallery.view'),
  ('staff',     'gallery.view')
ON CONFLICT (role, capability) DO NOTHING;


-- ===========================================================================
-- 3. `storage_path` — la chiave dell'oggetto, cio' che si firma
-- ===========================================================================
--
-- Un URL firmato si conia da una CHIAVE di oggetto, non da un URL pubblico. La
-- colonna nasce nullable (vedi la correzione alla ricerca in testata) e si
-- popola dalle righe esistenti estraendo cio' che segue il prefisso pubblico
-- del bucket. Una riga il cui `url` non ha quella forma resta nulla — e la
-- sezione 8 solleva, perche' una riga cosi' si guarda, non si indovina.
--
-- ⚠ Il nome nel `url` e' quello che `getPublicUrl` ha composto. Se un nome di
-- oggetto contenesse caratteri codificati nell'URL, l'estrazione porterebbe la
-- forma codificata e l'`EXISTS` della sezione 7 non troverebbe l'oggetto: la
-- firma fallirebbe CHIUSA. La rilettura del piano 52-06 sul laboratorio conta
-- le righe la cui `storage_path` non corrisponde ad alcun oggetto.

ALTER TABLE public.event_media
  ADD COLUMN IF NOT EXISTS storage_path text;

UPDATE public.event_media
   SET storage_path = substring(url from '/storage/v1/object/public/event-media/(.+)$')
 WHERE storage_path IS NULL;


-- ===========================================================================
-- 4. `url` perde il vincolo di non-nullita'
-- ===========================================================================
--
-- Il codice nuovo smette di scriverlo: da M2 il bucket e' privato, e un URL
-- pubblico di un oggetto privato e' un indirizzo che risponde 400. `url` resta
-- come storia — e smette di funzionare il giorno in cui il bucket si chiude.
-- Oggi e' innocuo: il codice in produzione lo scrive ancora su ogni riga.

ALTER TABLE public.event_media
  ALTER COLUMN url DROP NOT NULL;


-- ===========================================================================
-- 5. Una chiave e' una chiave, non un URL
-- ===========================================================================
--
-- Il `CHECK` ammette il nullo (fino a M2) e rifiuta cio' che comincia con uno
-- schema o con una barra: un `storage_path` che fosse un URL intero sarebbe il
-- `url` di prima con un altro nome, e la firma non troverebbe mai l'oggetto.

ALTER TABLE public.event_media
  DROP CONSTRAINT IF EXISTS event_media_storage_path_is_a_key;

ALTER TABLE public.event_media
  ADD CONSTRAINT event_media_storage_path_is_a_key
  CHECK (storage_path IS NULL OR (storage_path !~ '^(https?:|/)' AND length(storage_path) > 0));


-- ===========================================================================
-- 6. L'indice (gate *indici sulle colonne di lookup*)
-- ===========================================================================
--
-- L'`EXISTS` della sezione 7 cerca una riga per `storage_path` a ogni firma.
-- Unico perche' un oggetto e' una foto: due righe sullo stesso oggetto
-- renderebbero la moderazione ambigua (approvare l'una lascerebbe l'altra a
-- decidere cosa si vede). Se il backfill producesse un duplicato, la creazione
-- dell'indice solleverebbe e la transazione tornerebbe indietro intera.

CREATE UNIQUE INDEX IF NOT EXISTS event_media_storage_path_key
  ON public.event_media (storage_path);


-- ===========================================================================
-- 7. Chi puo' leggere un oggetto per firmarlo: chi vede la sua RIGA
-- ===========================================================================
--
-- Un braccio di lettura su `storage.objects`, `TO authenticated`, legato al
-- bucket e a una riga di `public.event_media` il cui `storage_path` e' il nome
-- dell'oggetto. Si firma con il client della SESSIONE — mai con la chiave di
-- servizio, che non passa dalla RLS e firmerebbe tutto — quindi la sottoquery
-- gira sotto la RLS di `event_media` di chi firma: chi non vede la riga non
-- vede l'oggetto, e non puo' coniarne un URL (assunzione A8 della ricerca, che
-- la sonda 3 del piano 52-13 prova). Il path da solo non basta: indovinare il
-- nome di un oggetto rifiutato o in attesa non apre nulla, perche' la riga non
-- e' visibile (`venue-secrecy.md`, *il path non e' una password*).
--
-- `TO authenticated` per la stessa ragione di `20260817120400_visual_archive_bucket.sql`
-- sezione 2: per un chiamante anonimo il predicato non potrebbe che rispondere
-- falso, e la clausola restringe a uno i ruoli su cui il prossimo lettore deve
-- ragionare.
--
-- **Oggi non cambia cio' che si legge**: le policy PERMISSIVE sono in OR, e
-- finche' il braccio del bucket pubblico esiste questo e' un sottoinsieme di
-- cio' che quello gia' apre. Nasce qui perche' il codice che firma deve poter
-- firmare PRIMA che M2 tolga il braccio largo — altrimenti fra M2 e la prima
-- firma ogni immagine sarebbe rotta.

DROP POLICY IF EXISTS event_media_objects_select_by_row ON storage.objects;

CREATE POLICY event_media_objects_select_by_row
  ON storage.objects
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'event-media'
    AND EXISTS (
      SELECT 1
        FROM public.event_media m
       WHERE m.storage_path = storage.objects.name
    )
  );

-- ── Le due assenze, DESCRITTE e non scritte ────────────────────────────────
--
-- Stessa scelta di forma di `20260817120400:123-128`: i controlli automatici
-- cercano le clausole vietate nel testo dei file, e un paragrafo che le
-- scrivesse per esteso sarebbe l'unica corrispondenza — e farebbe diventare
-- rosso un file corretto.
--
--   * **Nessun braccio di scrittura per le sessioni sul bucket pubblico.**
--     Il deposito di un oggetto passa solo dalla rotta di finalizzazione con la
--     chiave di servizio, dopo lo stripper (`npm run verify:media-strip`,
--     controllo D, che guarda ogni migration successiva a quella che lo chiuse).
--   * **Nessun braccio per il chiamante anonimo.** Oggi l'anonimo legge per URL
--     perche' il bucket e' pubblico; da M2 non legge nulla.
--
-- WHAT TO DO INSTEAD, se un'immagine della gallery non si carica dopo M2: la
-- domanda e' quale client ha coniato l'URL firmato e se quella sessione vede
-- la riga — mai se il bucket debba tornare pubblico. Riaprire il bucket rende
-- raggiungibile per URL ogni foto, rifiutate e in attesa comprese, e quelle
-- delle serate segrete con loro.


-- ===========================================================================
-- 8. Il `DO` che solleva se l'invariante non tiene
-- ===========================================================================
--
-- Rilegge il catalogo — cio' che e' scritto, non cio' che questo file crede di
-- aver scritto — e solleva su quattro conti. Nella forma di
-- `20260922120000_role_attendee_and_capability_keys.sql:587-603`.

DO $$
DECLARE
  v_gallery   integer;
  v_totale    integer;
  v_attendee  integer;
  v_senza     integer;
BEGIN
  SELECT count(*) INTO v_gallery
    FROM private.role_capabilities WHERE capability = 'gallery.view';
  SELECT count(*) INTO v_totale
    FROM private.role_capabilities;
  SELECT count(*) INTO v_attendee
    FROM private.role_capabilities WHERE role = 'attendee';
  SELECT count(*) INTO v_senza
    FROM public.event_media WHERE storage_path IS NULL;

  IF v_gallery <> 3 THEN
    RAISE EXCEPTION 'gallery.view ha % concessioni, attese 3 (master, organizer, staff)', v_gallery
      USING HINT = 'D-52-12: la chiave si concede per ruolo a tre ruoli e a nessun altro.';
  END IF;

  IF v_totale <> 31 THEN
    RAISE EXCEPTION 'private.role_capabilities ha % righe, attese 31 (16 master, 14 organizer, 1 staff, 0 attendee)', v_totale
      USING HINT = 'Un totale diverso vuol dire che il catalogo si e'' mosso fuori da un piano: si guarda il modello, non questo numero.';
  END IF;

  IF v_attendee <> 0 THEN
    RAISE EXCEPTION 'attendee tiene % concessioni, attese 0', v_attendee
      USING HINT = 'Chi compra un biglietto non ha capacita'' di lavoro ne'' di archivio (D-51-09, D-52-12).';
  END IF;

  IF v_senza > 0 THEN
    RAISE EXCEPTION '% righe di event_media restano senza storage_path dopo il backfill', v_senza
      USING HINT = 'Il loro url non ha la forma del prefisso pubblico del bucket. Una riga di forma diversa si guarda una per una e non si indovina: nessun backfill euristico.';
  END IF;
END;
$$;


-- ===========================================================================
-- 9. I commenti, ricontati
-- ===========================================================================
--
-- Il commento su `private.role_capabilities` e' riscritto per intero dal testo
-- di `20260923120000_role_capabilities_comment.sql`, con i numeri RICONTATI:
-- 28 + 3 = 31; master 15 + 1 = 16, organizer 13 + 1 = 14, staff 0 + 1 = 1.

COMMENT ON TABLE private.role_capabilities IS
  'Le concessioni per ruolo. Fase 50: la colonna requires_approved e'' stata rimossa insieme a profiles.status — una chiave si tiene o non si tiene, senza un secondo asse. Fase 51 (D-51-06, D-51-07): il ruolo member si chiama attendee, e le chiavi membership.active e membership.card.view sono uscite dal catalogo insieme alla costante CAP che le rispecchiava. Fase 52 (D-52-12): entra gallery.view, concessa per ruolo a master, organizer e staff. 31 righe: 16 a master, 14 a organizer, 1 a staff (gallery.view, fase 52, D-52-12), ZERO ad attendee. Per attendee e'' voluto, chi compra non lavora e non tiene l''archivio. Staff tiene una chiave per ruolo, la gallery; la porta resta dell''assegnazione alla serata (party_assignments, live_assignment_capabilities), quindi il modo di fallire descritto in 20260808000500:88-94 qui non si applica — ma va riletto prima di aggiungere un ruolo nuovo.';

COMMENT ON TABLE private.capabilities IS
  'Il catalogo delle chiavi di capability, rispecchiato dall''oggetto CAP in src/lib/capabilities/keys.ts. 16 chiavi dalla fase 52 (D-52-12: gallery.view); 15 dalla fase 51 (D-51-07). scripts/verify-capabilities.mjs confronta i due insiemi in ENTRAMBE le direzioni, quindi muoverne uno solo rende quel gate rosso. Nessun test runner prova questa corrispondenza: la prova quel gate, e ha bisogno di un database vivo.';

COMMENT ON COLUMN public.event_media.storage_path IS
  'La chiave dell''oggetto nel bucket event-media: cio'' che si firma (NAV-07, fase 52, D-52-25). Popolata dal url pubblico per le righe esistenti. Nullable fino a M2 (20260923180100_gallery_close_data.sql), che ripete il backfill per le righe nate fra le due migration e solo allora la rende obbligatoria. Mai un URL intero: lo vieta event_media_storage_path_is_a_key.';
