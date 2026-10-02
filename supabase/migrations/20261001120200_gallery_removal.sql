-- ═══════════════════════════════════════════════════════════════════════════
-- La gallery esce anche dallo schema: `event_media`, le sue policy, due chiavi
--
-- Fase 52.1, piano 18 (DBT-13). Il proprietario, il 2026-09-23 alle 20:30Z:
-- *«e se eliminassimo del tutto la gallery? mettiamo giusto la cover
-- dell'evento e basta»* → **«Sì, via la gallery»**. Decisione: D-52.1-17 — la
-- gallery esce dal prodotto, schema compreso, con una migration in produzione
-- sotto atto datato (D-52.1-28, Management API).
--
-- ── RIMOZIONE: SI APPLICA DOPO IL DEPLOY DEL CODICE CHE SMETTE DI USARE QUESTI
--    OGGETTI — ORDINE INVERSO AL 52-15 ─────────────────────────────────────
--
-- Nel 52-15 lo schema veniva PRIMA (M1 additiva) e il codice dopo. Qui si
-- TOGLIE, quindi il verso si rovescia:
--
--   * **questa migration PRIMA del codice**: il codice di oggi legge
--     `event_media`, firma gli oggetti di `event-media` e chiede `gallery.view`
--     e `media.upload`. Con la tabella e le chiavi gia' via, ogni pagina che le
--     tocca risponde errore — un guasto visibile, e la pagina della serata e'
--     fra quelle;
--   * **il codice PRIMA di questa migration**: il codice nuovo non nomina piu'
--     nessuno di questi oggetti (piani 52.1-16, 52.1-18, 52.1-29). Nulla si
--     rompe; nel frattempo il catalogo tiene due chiavi che nessuno legge, e
--     `npm run verify:capabilities` lo dice per nome (intervallo rosso
--     dichiarato in `scripts/verify-capabilities.mjs`).
--
-- Ordine: **deploy del codice `READY` → questo file**. Sul laboratorio lo
-- percorre il piano 52.1-20; in produzione l'atto 3 (piano 52.1-25). Il piano
-- 52.1-18 lo SCRIVE e non lo applica in nessun progetto.
--
-- ── UNA TRANSAZIONE SOLA, E NON C'E' `BEGIN;` PERCHE' NON SERVE ────────────
--
-- `POST /v1/projects/{ref}/database/migrations` avvolge il corpo in UNA
-- transazione (misurato dalla fase 50 il 2026-09-21; vedi
-- `20260923180100_gallery_close_data.sql`, stessa sezione). Se un `DO` solleva
-- — quello delle precondizioni o quello della rilettura — **nulla** di questo
-- file e' applicato: ne' la tabella tolta, ne' le chiavi, ne' il vincolo.
--
-- ── COSA QUESTA MIGRATION NON FA, E VA LETTO PRIMA DI CERCARLO ─────────────
--
--   * **Non tocca la quarantena** — il bucket `'event-media-quarantine'` e la
--     sua policy `event_media_quarantine_insert_staff` (`staff.manage`). Servono
--     all'archivio del visual (`ArchiveUpload.tsx`, `finalize-archive`) e alla
--     cover (`finalize-cover`, piano 52.1-13). Il nome resta storico: si
--     dichiara, non si rinomina. Il `DO` della sezione 6 pretende che la policy
--     ci sia ancora, perche' `event-media` e' una SOTTOSTRINGA di
--     `event-media-quarantine` e ogni confronto qui usa il letterale QUOTATO.
--   * **Non tocca `event-images`** (le cover, pubbliche per scelta) ne' gli altri
--     bucket pubblici. Il `DO` rilegge `event-images`.
--   * **Non cancella il bucket `event-media`.** Supabase rifiuta ogni `DELETE` su
--     `storage.buckets` con un trigger a livello di ISTRUZIONE — anche a zero
--     righe (*«42501: Direct deletion from storage tables is not allowed»*,
--     ricerca 52.1, Pitfall 2). Il bucket lo cancella l'API Storage, come passo
--     dell'atto, dopo aver riletto zero oggetti. Qui restano solo le sue policy
--     da togliere.
--   * **Non tocca le righe storiche degli atti.** Chi ha assegnato e revocato una
--     «Photo» resta scritto nel registro degli atti di account: la riga
--     sopravvive alla chiave, come sopravvive alla persona (D-50-16).
--   * **Non cancella dati.** Le precondizioni della sezione 1 pretendono ZERO
--     righe, ZERO oggetti e ZERO assegnazioni: se ce n'e', la rimozione per
--     chiave e' un passo PRIMA di questo file, fatto a mano e guardato una riga
--     alla volta, non una cascata nascosta qui dentro.
--
-- ── REVERSIBILITA', DICHIARATA ──────────────────────────────────────────────
--
-- Si torna indietro solo RICOSTRUENDO: la tabella dalle migration che l'hanno
-- fatta, le chiavi dai loro `INSERT`, le concessioni dalle loro righe. Non c'e'
-- nulla da recuperare — produzione 0 righe, 0 oggetti, 0 assegnazioni il
-- 2026-10-01 — ma un ritorno indietro e' una decisione nuova, non un `UNDO`.
--
-- ⚠ QUESTO FILE E' UNA PUBBLICAZIONE (repo pubblico): nessun path di oggetto,
-- nessun identificativo di riga, nessuna serata, nessuna sede, nessun account.


-- ===========================================================================
-- 1. Precondizioni: niente da perdere, o non si parte
-- ===========================================================================
--
-- Tre conteggi, e ognuno ha la sua ragione per essere zero:
--
--   * **righe di `public.event_media`** — un `DROP TABLE` le porterebbe via
--     senza una traccia. Produzione 0 il 2026-10-01; il laboratorio e' stato
--     svuotato per chiave nel piano 52.1-16.
--   * **oggetti in `storage.objects` con `bucket_id = 'event-media'`** — senza la
--     tabella nessuno potrebbe piu' firmarli, e il bucket non si cancella con
--     oggetti dentro.
--   * **righe di `public.party_assignments` con `capability = 'media.upload'`,
--     VIVE O REVOCATE** — e le revocate contano quanto le vive, per due ragioni
--     di schema: `party_assignments_capability_fkey` punta a
--     `private.capabilities(key)` SENZA `ON DELETE`, quindi la `DELETE` della
--     chiave alla sezione 5 fallirebbe; e il `CHECK` riscritto alla sezione 4 si
--     valida su OGNI riga, revocate comprese. Una revoca e' una riga
--     aggiornata, mai una rimossa (ASSIGN-03): toglierla e' la rimozione per
--     chiave, dichiarata nell'atto, mentre l'atto di assegnazione e quello di
--     revoca restano nel registro.

DO $$
DECLARE
  v_righe     integer;
  v_oggetti   integer;
  v_vive      integer;
  v_revocate  integer;
BEGIN
  IF to_regclass('public.event_media') IS NOT NULL THEN
    EXECUTE 'SELECT count(*) FROM public.event_media' INTO v_righe;
  ELSE
    v_righe := 0;
  END IF;

  SELECT count(*) INTO v_oggetti
    FROM storage.objects
   WHERE bucket_id = 'event-media';

  SELECT count(*) FILTER (WHERE revoked_at IS NULL AND expired_at IS NULL),
         count(*) FILTER (WHERE revoked_at IS NOT NULL OR expired_at IS NOT NULL)
    INTO v_vive, v_revocate
    FROM public.party_assignments
   WHERE capability = 'media.upload';

  IF v_righe > 0 THEN
    RAISE EXCEPTION 'public.event_media ha ancora % righe: la gallery non si toglie con dei media dentro', v_righe
      USING HINT = 'La rimozione per chiave e'' un passo PRIMA di questa migration (D-52.1-17): righe e oggetti si tolgono a mano, guardati uno per uno.';
  END IF;

  IF v_oggetti > 0 THEN
    RAISE EXCEPTION 'il bucket event-media contiene ancora % oggetti', v_oggetti
      USING HINT = 'Senza la tabella nessuno potrebbe firmarli ne'' cancellarli dal prodotto. Si tolgono per chiave dall''API Storage, prima di questo file.';
  END IF;

  IF v_vive + v_revocate > 0 THEN
    RAISE EXCEPTION 'party_assignments ha ancora % assegnazioni media.upload (vive: %, revocate o scadute: %)', v_vive + v_revocate, v_vive, v_revocate
      USING HINT = 'Anche le revocate bloccano: la chiave e'' referenziata senza ON DELETE e il CHECK riscritto si valida su ogni riga. Prima si revocano le vive, poi le righe si tolgono per chiave; gli atti restano nel registro.';
  END IF;
END;
$$;


-- ===========================================================================
-- 2. Via le policy di `storage.objects` del bucket `'event-media'`
-- ===========================================================================
--
-- Nomi RILETTI dalle migration (`20260225120000_phase7_media.sql` step 6,
-- `20260923180000_gallery_view_and_media_paths.sql` §7) e dal catalogo del
-- laboratorio (`pg_policies`, sola lettura, 2026-10-02): tre vive, tutte col
-- letterale `'event-media'`, piu' le due gia' tolte da migration precedenti e
-- ripetute qui con `IF EXISTS` perche' un progetto rimasto indietro non porti
-- con se' un braccio orfano. Un `DROP POLICY IF EXISTS` con un nome sbagliato
-- passa pulito e non toglie nulla: e' per questo che il `DO` della sezione 6
-- non cerca i nomi ma il bucket.
--
-- `event_media_objects_select_by_row` va tolta PRIMA della tabella: la sua
-- `EXISTS` legge `public.event_media`, e una policy che dipende dalla tabella
-- farebbe rifiutare il `DROP TABLE` della sezione 3.

DROP POLICY IF EXISTS event_media_objects_select_by_row   ON storage.objects;
DROP POLICY IF EXISTS "Members can delete own event media" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete event media"      ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view event media"        ON storage.objects;
DROP POLICY IF EXISTS "Members can upload event media"     ON storage.objects;


-- ===========================================================================
-- 3. Via la tabella — e cosa cade con lei
-- ===========================================================================
--
-- **La cascata, dichiarata.** Con la tabella cadono i suoi oggetti DIPENDENTI,
-- e solo quelli: le sette policy RLS (`event_media_select_gallery`, che legge
-- `gallery.view`; `event_media_insert_staff`, che legge `media.upload`;
-- `event_media_select_own`, `event_media_select_admin`,
-- `event_media_update_admin`, `event_media_delete_own`,
-- `event_media_delete_admin`), il trigger `event_media_require_party`, gli
-- indici, i vincoli e la colonna `party_id` con la sua chiave esterna verso le
-- serate.
--
-- **Senza la parola `CASCADE`, e apposta.** Il laboratorio non ha alcun oggetto
-- ESTERNO che dipenda da `event_media` (nessuna chiave esterna verso di lei,
-- nessuna vista: `pg_constraint` e `pg_depend` letti il 2026-10-02). Se un
-- progetto ne avesse uno che nessun inventario ha visto, il `DROP` deve
-- FERMARSI e nominarlo — non portarlo via in silenzio.
--
-- La funzione del trigger NON cade con la tabella: vive in `private` ed e' un
-- oggetto a se'. Si toglie per nome subito dopo, perche' una funzione che
-- nomina una tabella che non esiste e' un relitto che il prossimo lettore
-- prenderebbe per un pezzo vivo.

DROP TABLE IF EXISTS public.event_media;

DROP FUNCTION IF EXISTS private.event_media_require_party();


-- ===========================================================================
-- 4. Il `CHECK` di `party_assignments`: tre voci assegnabili, non quattro
-- ===========================================================================
--
-- Lo stesso nome di `20260809000000_party_assignments.sql:377`, riscritto con
-- `DROP CONSTRAINT IF EXISTS` + `ADD CONSTRAINT`. **Restringe e non allarga**:
-- l'assegnabile per serata perde «Photo», che dopo la gallery non apriva nulla
-- — Who works non la offre piu' (piano 52.1-18). Le precondizioni della sezione
-- 1 garantiscono che nessuna riga, nemmeno revocata, porti la voce che esce.

ALTER TABLE public.party_assignments
  DROP CONSTRAINT IF EXISTS party_assignments_capability_assignable;

ALTER TABLE public.party_assignments
  ADD CONSTRAINT party_assignments_capability_assignable
  CHECK (capability IN ('door.operate', 'door.supervise', 'party.manage'));


-- ===========================================================================
-- 5. Le due chiavi escono dal catalogo — prima le concessioni, poi le chiavi
-- ===========================================================================
--
-- La forma di `20260922120000_role_attendee_and_capability_keys.sql` §9: due
-- passi espliciti anche se `private.role_capabilities.capability` e'
-- `on delete cascade`, perche' chi apre il file deve vedere quante concessioni
-- escono senza dedurlo da un vincolo scritto altrove.
--
-- **Cinque concessioni escono**: `gallery.view` a master, organizer e staff;
-- `media.upload` a master e organizer. Nessun altro registro del resolver le
-- elenca: le assegnazioni per serata sono la sola altra tabella che punta al
-- catalogo, e la sezione 1 le ha pretese a zero.
--
-- **Perche' `media.upload` non resta come asse non usato.** Nessun percorso vivo
-- la legge: l'archivio del visual usa `production.visual.manage`
-- (`src/lib/media/may-upload.ts`, `mayUploadToVisualSection`), la cover usa
-- `staff.manage` + `assertMayManageEvent` (`/api/media/finalize-cover`, piano
-- 52.1-13). Una chiave senza lettori e' una concessione dormiente che domani
-- qualcuno ricollega a un percorso senza rileggere perche' esisteva.
--
-- 16 chiavi → **14**. 31 concessioni → **26**: master 14, organizer 12,
-- **staff 0**, attendee 0. Staff torna a zero concessioni per ruolo — lavora per
-- assegnazione alla serata (porta, supervisione, organizzazione della serata).

DELETE FROM private.role_capabilities
 WHERE capability IN ('gallery.view', 'media.upload');

DELETE FROM private.capabilities
 WHERE key IN ('gallery.view', 'media.upload');


-- ===========================================================================
-- 6. Il `DO` che rilegge il catalogo e solleva se l'invariante non tiene
-- ===========================================================================
--
-- Rilegge cio' che e' scritto, non cio' che questo file crede di aver scritto
-- (forma di `20260923180100_gallery_close_data.sql` §6). Il bucket si cerca come
-- LETTERALE QUOTATO (`'event-media'`) nel `qual` e nel `with_check`: un
-- confronto per sottostringa scambierebbe la quarantena per la gallery — e la
-- quarantena DEVE restare.

DO $$
DECLARE
  v_tabella     regclass;
  v_funzione    regprocedure;
  v_gallery     integer;
  v_quarantena  integer;
  v_lettori     text;
  v_chiavi      integer;
  v_concessioni integer;
  v_residue     integer;
  v_staff       integer;
  v_immagini    boolean;
  v_check       text;
BEGIN
  v_tabella  := to_regclass('public.event_media');
  v_funzione := to_regprocedure('private.event_media_require_party()');

  SELECT count(*) INTO v_gallery
    FROM pg_policies
   WHERE schemaname = 'storage'
     AND tablename  = 'objects'
     AND (   coalesce(qual, '')       LIKE '%''event-media''%'
          OR coalesce(with_check, '') LIKE '%''event-media''%');

  SELECT count(*) INTO v_quarantena
    FROM pg_policies
   WHERE schemaname = 'storage'
     AND tablename  = 'objects'
     AND policyname = 'event_media_quarantine_insert_staff'
     AND coalesce(with_check, '') LIKE '%''event-media-quarantine''%';

  SELECT string_agg(schemaname || '.' || tablename || '.' || policyname, ', ')
    INTO v_lettori
    FROM pg_policies
   WHERE coalesce(qual, '') || coalesce(with_check, '') LIKE '%gallery.view%'
      OR coalesce(qual, '') || coalesce(with_check, '') LIKE '%media.upload%';

  SELECT count(*) INTO v_chiavi      FROM private.capabilities;
  SELECT count(*) INTO v_concessioni FROM private.role_capabilities;

  SELECT (SELECT count(*) FROM private.capabilities
           WHERE key IN ('gallery.view', 'media.upload'))
       + (SELECT count(*) FROM private.role_capabilities
           WHERE capability IN ('gallery.view', 'media.upload'))
       + (SELECT count(*) FROM public.party_assignments
           WHERE capability IN ('gallery.view', 'media.upload'))
    INTO v_residue;

  SELECT count(*) INTO v_staff
    FROM private.role_capabilities
   WHERE role = 'staff';

  SELECT public INTO v_immagini
    FROM storage.buckets WHERE id = 'event-images';

  SELECT pg_get_constraintdef(oid) INTO v_check
    FROM pg_constraint
   WHERE conrelid = 'public.party_assignments'::regclass
     AND conname  = 'party_assignments_capability_assignable';

  IF v_tabella IS NOT NULL THEN
    RAISE EXCEPTION 'public.event_media esiste ancora dopo il DROP';
  END IF;

  IF v_funzione IS NOT NULL THEN
    RAISE EXCEPTION 'private.event_media_require_party() esiste ancora: la funzione del trigger e'' rimasta senza tabella';
  END IF;

  IF v_gallery > 0 THEN
    RAISE EXCEPTION '% policy su storage.objects nominano ancora il bucket ''event-media''', v_gallery
      USING HINT = 'Una policy con un nome non previsto va letta in pg_policies (cercando il letterale quotato) e tolta per nome.';
  END IF;

  IF v_quarantena <> 1 THEN
    RAISE EXCEPTION 'event_media_quarantine_insert_staff trovata % volte sul bucket event-media-quarantine, attesa 1', v_quarantena
      USING HINT = 'La quarantena serve all''archivio del visual e alla cover: questa migration non deve toccarla.';
  END IF;

  IF v_lettori IS NOT NULL THEN
    RAISE EXCEPTION 'gallery.view / media.upload hanno ancora lettori di policy: %', v_lettori
      USING HINT = 'Una chiave non si cancella finche'' una policy la legge: la policy diventerebbe un rifiuto silenzioso e permanente.';
  END IF;

  IF v_residue > 0 THEN
    RAISE EXCEPTION 'gallery.view / media.upload compaiono ancora % volte fra catalogo, concessioni e assegnazioni', v_residue;
  END IF;

  IF v_chiavi <> 14 THEN
    RAISE EXCEPTION 'private.capabilities ha % chiavi, attese 14', v_chiavi
      USING HINT = 'Lo stesso numero di EXPECTED_KEY_COUNT in scripts/verify-capabilities.mjs e delle chiavi di CAP in src/lib/capabilities/keys.ts.';
  END IF;

  IF v_concessioni <> 26 THEN
    RAISE EXCEPTION 'private.role_capabilities ha % concessioni, attese 26', v_concessioni
      USING HINT = 'master 14, organizer 12, staff 0, attendee 0 — EXPECTED_GRANT_COUNT in scripts/verify-capabilities.mjs.';
  END IF;

  IF v_staff <> 0 THEN
    RAISE EXCEPTION 'staff tiene ancora % concessioni per ruolo, attese 0', v_staff;
  END IF;

  IF v_immagini IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'il bucket event-images ha public = %, atteso true e invariato', v_immagini
      USING HINT = 'Questa migration non tocca le cover. Un valore nullo vuol dire che il bucket non esiste.';
  END IF;

  IF v_check IS NULL OR v_check LIKE '%media.upload%' OR v_check NOT LIKE '%party.manage%' THEN
    RAISE EXCEPTION 'party_assignments_capability_assignable non e'' quello atteso: %', coalesce(v_check, '(assente)');
  END IF;
END;
$$;


-- ===========================================================================
-- 7. I commenti, ricontati
-- ===========================================================================

COMMENT ON TABLE private.capabilities IS
  'Il catalogo delle chiavi di capability, rispecchiato dall''oggetto CAP in src/lib/capabilities/keys.ts. 14 chiavi dalla fase 52.1 (DBT-13, D-52.1-17): gallery.view e media.upload sono uscite con la gallery, qui e nello stesso piano dal TypeScript — scripts/verify-capabilities.mjs confronta i due insiemi in ENTRAMBE le direzioni, quindi muoverne uno solo rende quel gate rosso. media.upload non e'' rimasta come asse non usato: nessun percorso vivo la leggeva (l''archivio del visual usa production.visual.manage, la cover staff.manage). Nessun test runner prova questa corrispondenza: la prova quel gate, e ha bisogno di un database vivo. 20261001120200_gallery_removal.sql.';

COMMENT ON TABLE private.role_capabilities IS
  'Le concessioni per ruolo. 26 righe dalla fase 52.1 (DBT-13): 14 a master, 12 a organizer, ZERO a staff e ZERO ad attendee. Per attendee e'' voluto, chi compra non lavora. Per staff e'' un''asimmetria dichiarata, tornata tale quando gallery.view e'' uscita con la gallery: cio'' che lo fa lavorare non e'' il ruolo ma l''assegnazione alla serata (party_assignments: door.operate, door.supervise, party.manage), quindi il modo di fallire descritto in 20260808000500:88-94 qui non si applica — ma va riletto prima di aggiungere un ruolo nuovo. 20261001120200_gallery_removal.sql.';
