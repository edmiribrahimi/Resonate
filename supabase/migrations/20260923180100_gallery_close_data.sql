-- ═══════════════════════════════════════════════════════════════════════════
-- La gallery chiude anche i dati: righe, oggetti e bucket
--
-- Fase 52 «La barra di navigazione e i ritocchi» — NAV-07. M2 di due.
-- Decisione: D-52-25 — *nessuna foto di una serata segreta puo' essere
-- raggiungibile da un URL non firmato*. M1 e' `20260923180000_gallery_view_and_media_paths.sql`.
--
-- ── NON APPLICARE PRIMA DEL DEPLOY DEL CODICE CHE FIRMA ────────────────────
--
-- **Questa migration si applica DOPO che il codice della fase 52 e' servito
-- (dispiegamento `READY`), mai prima.** E' il verso opposto a M1, e la ragione
-- e' la stessa letta dall'altro lato: qui si TOGLIE cio' che il codice vecchio
-- usa.
--
--   * **questa migration PRIMA del codice**: le pagine di oggi disegnano
--     l'indirizzo PUBBLICO dell'oggetto (`url`). Con il bucket privato quell'
--     indirizzo risponde errore: ogni immagine e ogni video della gallery, della
--     pagina della serata e della moderazione diventano un riquadro rotto — per
--     TUTTI, master compreso (ricerca §I.6, Pitfall 10). Non e' una fuga, e' un
--     guasto visibile a ogni persona che apre una pagina con dei media;
--   * **il codice PRIMA di questa migration**: il codice nuovo firma
--     `storage_path` con il client della sessione, e la firma passa gia' oggi
--     dal braccio di M1 (`event_media_objects_select_by_row`). Nessuna
--     immagine si rompe: nel frattempo il bucket resta pubblico, cioe' la
--     finestra di NAV-07 resta aperta finche' questo file non la chiude.
--
-- L'ordine e' un vincolo duro, in tre passi, e sul laboratorio e' stato
-- percorso nello stesso ordine della produzione (piano 52-13):
--   **M1 additiva → deploy del codice che firma, `READY` → M2 (questo file)**.
-- In produzione lo percorre il piano 52-15, sotto un'autorizzazione datata.
--
-- ── UNA TRANSAZIONE SOLA, E NON C'E' `BEGIN;` PERCHE' NON SERVE ────────────
--
-- `POST /v1/projects/{ref}/database/migrations` avvolge il corpo in UNA
-- transazione da solo — misurato sul laboratorio dalla fase 50 il 2026-09-21
-- alle 12:35:43Z (una sonda con `create table` seguita da `select 1/0` e'
-- tornata `400`, e la tabella non esisteva). Un `BEGIN;` esplicito produrrebbe
-- `WARNING: there is already a transaction in progress` e un `COMMIT` che
-- chiude a meta' la transazione dell'endpoint. Vedi
-- `20260923180000_gallery_view_and_media_paths.sql`, stessa sezione.
--
-- E la transazione unica e' il meccanismo: se il `DO` della sezione 6 solleva,
-- **nulla** di questo file e' applicato — ne' il vincolo, ne' la policy, ne' il
-- bucket. Un bucket privato con la policy larga ancora in piedi, o una colonna
-- obbligatoria con righe nulle, e' lo stato a meta' che la transazione esclude.
--
-- ── COSA QUESTA MIGRATION NON FA, E VA LETTO PRIMA DI CERCARLO ─────────────
--
--   * **Non tocca `event_media_select_own`** (chi ha caricato vede le proprie
--     righe, qualunque stato) **ne' `event_media_select_admin`** (`staff.manage`,
--     la moderazione vede tutto). Restano come sono: sono i bracci di chi carica
--     e di chi modera, non della gallery.
--   * **Non tocca le policy di UPDATE e DELETE** su `event_media`, ne'
--     `event_media_insert_staff`.
--   * **Non tocca le due policy di DELETE su `storage.objects`** per il bucket
--     `event-media` (quella di chi ha caricato e quella di organizer/master): la
--     cancellazione di un media resta com'e'.
--   * **Non tocca `event_media_objects_select_by_row`** (M1): e' la sola porta di
--     lettura degli oggetti che resta, ed e' quella da cui passa ogni firma.
--   * **Non tocca `event-images`** ne' gli altri bucket pubblici (locandine,
--     foto delle sedi, foto degli artisti): sono pubblici per scelta e restano
--     pubblici. Il `DO` lo rilegge per `event-images`.
--
-- ── REVERSIBILITA', DICHIARATA ──────────────────────────────────────────────
--
-- Si torna indietro solo ALLARGANDO: ricreare il braccio del bucket pubblico,
-- rimettere `public = true`, riportare la lettura delle righe approvate a ogni
-- sessione. Ma **cio' che e' stato visto mentre era aperto resta visto**
-- (`venue-secrecy.md`, *guardie monotone*): un URL pubblico copiato, una foto
-- scaricata, una copia in cache CDN fino al suo `max-age` non rientrano con un
-- `UPDATE`. Il contrario vale anche subito dopo questa migration: per un'ora
-- (il `max-age` di default degli oggetti) la CDN puo' servire ancora un oggetto
-- per indirizzo pubblico. La sonda 1 di `P-52-G` si ripete dopo quella finestra,
-- ed e' solo la seconda misura che puo' dire «chiuso» (Pitfall 15).
--
-- ⚠ QUESTO FILE E' UNA PUBBLICAZIONE (repo pubblico): nessun path di oggetto,
-- nessun identificativo di riga, nessuna serata, nessuna sede.


-- ===========================================================================
-- 1. Il secondo backfill: le righe nate fra M1 e il deploy
-- ===========================================================================
--
-- Fra M1 e il deploy il codice VECCHIO inserisce righe con `url` e senza
-- `storage_path` — ed e' voluto, e' la ragione per cui M1 ha lasciato la colonna
-- nullable. Qui si ripete la stessa estrazione di M1 sezione 3, solo sulle righe
-- ancora nulle. Una riga il cui `url` non ha la forma del prefisso pubblico
-- resta nulla, e il `DO` della sezione 6 solleva PRIMA che il vincolo della
-- sezione 2 venga controllato dal catalogo: una riga cosi' si guarda una per
-- una, non si indovina.

UPDATE public.event_media
   SET storage_path = substring(url from '/storage/v1/object/public/event-media/(.+)$')
 WHERE storage_path IS NULL
   AND url IS NOT NULL;


-- ===========================================================================
-- 2. `storage_path` diventa obbligatoria
-- ===========================================================================
--
-- Da qui una riga senza chiave d'oggetto non puo' nascere: il codice che firma
-- non ha un fallback su `url`, e una riga senza chiave sarebbe un media che
-- nessuno puo' vedere ne' cancellare (`media.storage_path_missing`, piano 52-12).
-- Se una riga fosse ancora nulla, questo `ALTER` solleverebbe `23502` e la
-- transazione tornerebbe indietro intera; il `DO` lo ridice con un messaggio
-- che spiega cosa guardare.

ALTER TABLE public.event_media
  ALTER COLUMN storage_path SET NOT NULL;


-- ===========================================================================
-- 3. Le righe approvate si leggono con `gallery.view`
-- ===========================================================================
--
-- `event_media_select_approved` mostrava le righe approvate a QUALUNQUE
-- sessione autenticata — un `attendee` compreso, che il cancello di pagina di
-- NAV-02 teneva fuori da `/gallery` ma non dall'API. Il middleware e' UX, la RLS
-- e' sicurezza: qui il confine passa dalla pagina ai dati.
--
-- Stesso predicato di catalogo di tutte le altre chiavi, nella forma
-- `(SELECT private.has_capability(...))` che il planner valuta una volta per
-- interrogazione (initplan), non una volta per riga.
--
-- E il braccio sull'oggetto (M1) si chiude da solo con questo: la sua `EXISTS`
-- gira sotto la RLS di `event_media` di chi firma, quindi chi non vede la riga
-- non vede l'oggetto e non ne conia un URL.

DROP POLICY IF EXISTS event_media_select_approved ON public.event_media;
DROP POLICY IF EXISTS event_media_select_gallery ON public.event_media;

CREATE POLICY event_media_select_gallery
  ON public.event_media
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING (
    status = 'approved'
    AND (SELECT private.has_capability('gallery.view'))
  );


-- ===========================================================================
-- 4. Via il braccio del bucket pubblico
-- ===========================================================================
--
-- «Anyone can view event media» era una SELECT senza `TO` su `storage.objects`,
-- cioe' per `anon` compreso: e' il braccio che rendeva ogni oggetto leggibile
-- per indirizzo. Cade con il bucket pubblico della sezione 5.

DROP POLICY IF EXISTS "Anyone can view event media" ON storage.objects;


-- ===========================================================================
-- 5. Il bucket diventa privato
-- ===========================================================================
--
-- Un `UPDATE`, non un `INSERT … ON CONFLICT DO NOTHING`: il bucket esiste, e
-- quella forma non ne corregge le impostazioni (`20260817120400_visual_archive_bucket.sql`,
-- paragrafo sull'idempotenza). Con `public = false` l'endpoint
-- `/object/public/event-media/...` smette di servire l'oggetto; resta solo la
-- via firmata.

UPDATE storage.buckets
   SET public = false
 WHERE id = 'event-media';

-- ── Le assenze, DESCRITTE e non scritte ────────────────────────────────────
--
-- Stessa scelta di forma di `20260817120400:123-128` e di M1: i controlli
-- automatici cercano le clausole vietate nel testo dei file, e un paragrafo che
-- le scrivesse per esteso sarebbe l'unica corrispondenza.
--
--   * **Nessun braccio di scrittura per le sessioni sul bucket.** Il deposito
--     passa solo dalla rotta di finalizzazione con la chiave di servizio, dopo
--     lo stripper (`npm run verify:media-strip`, controllo D).
--   * **Nessun braccio di lettura per il chiamante anonimo**, ne' sulle righe
--     ne' sugli oggetti. Dopo questo file l'anonimo non legge nulla della
--     gallery, per nessuna via.
--
-- WHAT TO DO INSTEAD, se le miniature non si caricano dopo questa migration.
-- La riparazione in buona fede e' «le miniature non caricano, apri il bucket»
-- — ed e' nominata qui perche' chi la incontra la riconosca. Riaprire il bucket
-- rende raggiungibile per URL ogni foto, rifiutate e in attesa comprese, e
-- quelle delle serate segrete con loro: e' la finestra che questo file chiude.
-- La risposta giusta e' **una firma che manca**, non un bucket aperto: quale
-- client ha coniato l'URL (deve essere quello della SESSIONE, mai la chiave di
-- servizio), se quella sessione tiene `gallery.view` o `staff.manage`, se la
-- riga ha `storage_path`, e se l'URL e' scaduto
-- (`src/lib/media/sign-event-media.ts`: 3600 s la gallery, 300 s la
-- moderazione). Se una lettura non si puo' autorizzare, non si legge nulla:
-- fallisce chiuso (`venue-secrecy.md`, *gate default chiuso*).


-- ===========================================================================
-- 6. Il `DO` che solleva se l'invariante non tiene
-- ===========================================================================
--
-- Rilegge il catalogo — cio' che e' scritto, non cio' che questo file crede di
-- aver scritto — nella forma di
-- `20260922120000_role_attendee_and_capability_keys.sql:587-603`.
--
-- La seconda condizione cerca il bucket come LETTERALE QUOTATO nel `qual`
-- (`'event-media'`), perche' `event-media-quarantine` contiene `event-media`
-- come sottostringa: un controllo per sottostringa scambierebbe le policy della
-- quarantena per policy della gallery.

DO $$
DECLARE
  v_senza       integer;
  v_larghe      integer;
  v_pubblico    boolean;
  v_immagini    boolean;
  v_gallery     integer;
  v_approved    integer;
  v_anyone      integer;
BEGIN
  SELECT count(*) INTO v_senza
    FROM public.event_media
   WHERE storage_path IS NULL;

  SELECT count(*) INTO v_larghe
    FROM pg_policies
   WHERE schemaname = 'storage'
     AND tablename  = 'objects'
     AND cmd IN ('SELECT', 'ALL')
     AND qual LIKE '%''event-media''%'
     AND roles::text[] <> ARRAY['authenticated']::text[];

  SELECT public INTO v_pubblico
    FROM storage.buckets WHERE id = 'event-media';

  SELECT public INTO v_immagini
    FROM storage.buckets WHERE id = 'event-images';

  SELECT count(*) INTO v_gallery
    FROM pg_policies
   WHERE schemaname = 'public'
     AND tablename  = 'event_media'
     AND policyname = 'event_media_select_gallery'
     AND qual LIKE '%gallery.view%';

  SELECT count(*) INTO v_approved
    FROM pg_policies
   WHERE schemaname = 'public'
     AND tablename  = 'event_media'
     AND policyname = 'event_media_select_approved';

  SELECT count(*) INTO v_anyone
    FROM pg_policies
   WHERE schemaname = 'storage'
     AND tablename  = 'objects'
     AND policyname = 'Anyone can view event media';

  IF v_senza > 0 THEN
    RAISE EXCEPTION '% righe di event_media restano senza storage_path dopo il secondo backfill', v_senza
      USING HINT = 'Il loro url non ha la forma del prefisso pubblico del bucket, o e'' nullo. Una riga cosi'' si guarda una per una: nessun backfill euristico.';
  END IF;

  IF v_larghe > 0 THEN
    RAISE EXCEPTION '% policy di lettura su storage.objects per il bucket event-media non sono ristrette a authenticated', v_larghe
      USING HINT = 'NAV-07: l''unica lettura degli oggetti e'' event_media_objects_select_by_row, TO authenticated. Un braccio per anon o per public riapre gli oggetti per indirizzo.';
  END IF;

  IF v_pubblico IS DISTINCT FROM false THEN
    RAISE EXCEPTION 'il bucket event-media ha public = %, atteso false', v_pubblico
      USING HINT = 'D-52-25: nessuna foto raggiungibile da un URL non firmato. Un valore nullo vuol dire che il bucket non esiste.';
  END IF;

  IF v_immagini IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'il bucket event-images ha public = %, atteso true e invariato', v_immagini
      USING HINT = 'Questa migration chiude SOLO event-media. Le locandine sono pubbliche per scelta.';
  END IF;

  IF v_gallery <> 1 THEN
    RAISE EXCEPTION 'event_media_select_gallery trovata % volte con gallery.view nel predicato, attesa 1', v_gallery;
  END IF;

  IF v_approved <> 0 THEN
    RAISE EXCEPTION 'event_media_select_approved esiste ancora: le righe approvate resterebbero leggibili da ogni sessione';
  END IF;

  IF v_anyone <> 0 THEN
    RAISE EXCEPTION 'la policy «Anyone can view event media» esiste ancora su storage.objects';
  END IF;
END;
$$;


-- ===========================================================================
-- 7. I commenti, ricontati
-- ===========================================================================

COMMENT ON POLICY event_media_select_gallery ON public.event_media IS
  'NAV-07 (fase 52, D-52-25): le righe approvate si leggono solo con gallery.view — per ruolo master, organizer e staff; attendee no (D-52-12). Sostituisce event_media_select_approved, che le mostrava a ogni sessione autenticata. Restano accanto, in OR, event_media_select_own (chi ha caricato) e event_media_select_admin (staff.manage, la moderazione). Il braccio sull''oggetto event_media_objects_select_by_row gira sotto questa RLS: chi non vede la riga non firma l''oggetto. 20260923180100_gallery_close_data.sql.';

COMMENT ON COLUMN public.event_media.storage_path IS
  'La chiave dell''oggetto nel bucket event-media: cio'' che si firma (NAV-07, fase 52, D-52-25). Nata nullable in M1 (20260923180000_gallery_view_and_media_paths.sql) con backfill dal url pubblico; obbligatoria da M2 (20260923180100_gallery_close_data.sql), che ha ripetuto il backfill per le righe nate fra le due migration e solo allora ha messo il NOT NULL. Il bucket e'' privato da M2: si legge solo per URL firmato. Mai un URL intero: lo vieta event_media_storage_path_is_a_key.';

COMMENT ON COLUMN public.event_media.url IS
  'Storia, non un indirizzo. Era l''URL pubblico dell''oggetto; dal codice della fase 52 non si scrive piu'' (le righe nuove lo portano nullo) e nessuna superficie lo legge. Da M2 (20260923180100_gallery_close_data.sql) il bucket event-media e'' privato, quindi un valore presente risponde errore. Si firma storage_path.';
