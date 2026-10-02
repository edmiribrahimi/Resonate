-- ═══════════════════════════════════════════════════════════════════════════
-- La cover si scrive solo dal server: via le policy di event-images
--
-- Fase 52.1, piano 13 (DBT-14). Decisione: D-52.1-18 — la cover passa dallo
-- stesso stripper delle foto, a una chiave generata dal server
-- (`covers/<uuid>.jpg`), e l'unico scrittore del bucket pubblico `event-images`
-- e' il ruolo di servizio dentro `POST /api/media/finalize-cover`.
--
-- ── CHIUSURA: SI APPLICA DOPO IL DEPLOY DELLA ROUTE DI COVER, MAI PRIMA ─────
--
--   * **questa migration PRIMA del codice**: il form di oggi carica la cover
--     dal browser in `event-images`. Senza la policy INSERT la scrittura e'
--     rifiutata e **nessuna serata puo' cambiare cover** finche' il codice
--     nuovo non e' servito. Non e' una fuga, e' un guasto del form (T-52.1-24);
--   * **il codice PRIMA di questa migration**: il codice nuovo scrive col ruolo
--     di servizio, che non passa dalla RLS. Nulla si rompe; nel frattempo un
--     browser con `is_admin_or_organizer()` potrebbe ancora scrivere nel bucket
--     a mano — la finestra che questo file chiude.
--
-- Ordine: **deploy della route `READY` → questo file**. Sul laboratorio lo
-- percorre il piano 52.1-20 (P-521-E, con la sonda anonima di lista PRIMA
-- dell'atto); in produzione l'atto 3. Il piano 52.1-13 lo SCRIVE e non lo
-- applica in nessun progetto.
--
-- Nessun `BEGIN;`: il file e' una unita' sola applicata dalla Management API,
-- come gli altri della fase.
--
-- ── COSA NON FA ─────────────────────────────────────────────────────────────
--
--   * **Non tocca `storage.buckets`.** `event-images` resta `public = true`: le
--     cover sono pubbliche per scelta, si servono per URL. Nessun
--     `DELETE FROM storage.buckets` (il trigger di Storage lo rifiuta comunque).
--   * **Non tocca la quarantena** (`'event-media-quarantine'`): il form deposita
--     li' con `event_media_quarantine_insert_staff` (`staff.manage`), e il `DO`
--     sotto verifica che ci sia ancora.
--   * **Non cancella le cover esistenti** ne' le cover sostituite: un oggetto
--     vecchio resta raggiungibile al suo URL (debito dichiarato nella
--     VERIFICATION). Le cinque cover di produzione censite il 2026-10-01 sono
--     senza GPS; il loro URL porta ancora il nome del file finche' qualcuno non
--     le ricarica.


-- ===========================================================================
-- 1. Via le tre policy di scrittura e la SELECT pubblica
-- ===========================================================================
--
-- Nomi RILETTI da `20260225100000_phase5_events.sql` (step 5), dove sono nate
-- e da allora mai riscritte (ricerca 52.1, `pg_policies` di produzione letto il
-- 2026-10-01: stesse quattro, stessi nomi). Un `DROP POLICY IF EXISTS` con un
-- nome sbagliato passa pulito e non toglie nulla: e' per questo che il `DO`
-- della sezione 2 non cerca i nomi ma il bucket.
--
-- Le tre di scrittura (INSERT, UPDATE, DELETE per `authenticated` con
-- `is_admin_or_organizer()`): dopo questo file scrive solo il ruolo di
-- servizio, che la RLS non vede.
--
-- La SELECT `public` «Anyone can view event images»: un bucket pubblico serve i
-- file per URL SENZA passare dalla RLS; questa policy serve solo a ELENCARE il
-- bucket (ricerca 52.1, assunzione A4). Elencare `event-images` vuol dire
-- leggere tutte le chiavi — comprese le vecchie `covers/<timestamp>-<nome>` —
-- senza sessione. A4 e' un'assunzione: la sonda anonima di lista di P-521-E la
-- prova sul laboratorio prima dell'atto, e se una cover smettesse di servirsi
-- per URL il piano 52.1-20 si ferma li'.

DROP POLICY IF EXISTS "Organizers can upload event images" ON storage.objects;
DROP POLICY IF EXISTS "Organizers can update event images" ON storage.objects;
DROP POLICY IF EXISTS "Organizers can delete event images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view event images" ON storage.objects;


-- ===========================================================================
-- 2. Il `DO` che rilegge il catalogo
-- ===========================================================================
--
-- Rilegge cio' che e' scritto, non cio' che questo file crede di aver scritto,
-- nella forma di `20260923180100_gallery_close_data.sql` §6. Il bucket si cerca
-- come LETTERALE QUOTATO (`'event-images'`) nel `qual` e nel `with_check`, cosi'
-- una policy con un nome diverso da quelli della sezione 1 viene trovata lo
-- stesso.

DO $$
DECLARE
  v_rimaste     integer;
  v_immagini    boolean;
  v_quarantena  integer;
BEGIN
  SELECT count(*) INTO v_rimaste
    FROM pg_policies
   WHERE schemaname = 'storage'
     AND tablename  = 'objects'
     AND (   coalesce(qual, '')       LIKE '%''event-images''%'
          OR coalesce(with_check, '') LIKE '%''event-images''%');

  SELECT public INTO v_immagini
    FROM storage.buckets WHERE id = 'event-images';

  SELECT count(*) INTO v_quarantena
    FROM pg_policies
   WHERE schemaname = 'storage'
     AND tablename  = 'objects'
     AND (   coalesce(qual, '')       LIKE '%''event-media-quarantine''%'
          OR coalesce(with_check, '') LIKE '%''event-media-quarantine''%');

  IF v_rimaste > 0 THEN
    RAISE EXCEPTION '% policy su storage.objects nominano ancora il bucket event-images', v_rimaste
      USING HINT = 'D-52.1-18: l''unico scrittore della cover e'' il ruolo di servizio in /api/media/finalize-cover. Una policy con un nome non previsto va letta in pg_policies e tolta per nome.';
  END IF;

  IF v_immagini IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'il bucket event-images ha public = %, atteso true e invariato', v_immagini
      USING HINT = 'Questa migration toglie solo policy. Le cover sono pubbliche per scelta; un valore nullo vuol dire che il bucket non esiste.';
  END IF;

  IF v_quarantena = 0 THEN
    RAISE EXCEPTION 'nessuna policy su storage.objects nomina event-media-quarantine'
      USING HINT = 'Il form deposita la cover in quarantena con event_media_quarantine_insert_staff (staff.manage): senza, nessuna cover si puo'' caricare.';
  END IF;
END;
$$;
