-- ═══════════════════════════════════════════════════════════════════════════
-- Calendar, Location e Visual escono anche dallo schema: dieci tabelle, due
-- funzioni, una colonna, sette policy, tre chiavi
--
-- Fase 53, piano 07 (CUT-01). Decisione del proprietario del 2026-10-14: via
-- TASK, Calendar, Location e Visual (D-53-02, lo specchio ICS compreso);
-- Manifesto resta, e la sua policy brand-wide si riscrive sulla sola chiave del
-- manifesto PRIMA che le altre tre escano (D-53-04); nessuna copia prima di
-- buttare (D-53-05); la rimozione e' per chiave e con riconteggio, mai a
-- cascata senza lettura prima (D-53-03).
--
-- ── RIMOZIONE: SI APPLICA DOPO IL DEPLOY DEL CODICE ─────────────────────────
--
-- Il codice nuovo (piani 53-01, 53-05, 53-06, 53-13) non nomina piu' nessuna
-- di queste tabelle, nessuna di queste chiavi, ne' la colonna della parola-sede
-- della serie. Fra il deploy e questo file il catalogo tiene tre chiavi che
-- nessuno legge, e `npm run verify:capabilities` lo dice per forma (intervallo
-- rosso dichiarato in `scripts/verify-capabilities.mjs`).
--
-- Ordine: **deploy del codice `READY` → `scripts/purge-production-tools.mjs`
-- (righe e oggetti per chiave) → questo file**. Sul laboratorio lo percorre il
-- piano 53-08; in produzione il piano 53-11, sotto autorizzazione datata. Il
-- piano 53-07 lo SCRIVE e non lo applica in nessun progetto.
--
-- ── UNA TRANSAZIONE SOLA, SENZA UN BEGIN ESPLICITO PERCHE' NON SERVE ──────
--
-- `POST /v1/projects/{ref}/database/migrations` avvolge il corpo in UNA
-- transazione (misurato dalla fase 50; stessa sezione di
-- `20261001120200_gallery_removal.sql`). Se un `DO` solleva — quello delle
-- precondizioni o quello della rilettura — **nulla** di questo file e'
-- applicato.
--
-- ── COSA QUESTA MIGRATION NON FA, E VA LETTO PRIMA DI CERCARLO ─────────────
--
--   * **Non tocca la quarantena della cover** — il bucket
--     `'event-media-quarantine'` e la sua policy
--     `event_media_quarantine_insert_staff`. Dopo questa fase servono SOLO alla
--     cover della serata. Il `DO` della sezione 7 pretende che la policy ci sia
--     ancora esattamente una volta.
--   * **Non tocca `event-images`** (le cover, pubbliche per scelta), ne'
--     `party_assignments` (nessuna delle tre chiavi e' mai stata assegnabile:
--     il vincolo `party_assignments_capability_assignable` ammette solo le tre
--     voci della porta e della serata).
--   * **Non cancella il bucket `'visual-archive'` dall'SQL.** Supabase rifiuta
--     ogni cancellazione diretta sulle tabelle di storage con un trigger a
--     livello di istruzione, anche a zero righe (*«42501: Direct deletion from
--     storage tables is not allowed»*). Oggetti e bucket li toglie l'API
--     Storage, dentro lo script per chiave, PRIMA di questo file. Qui esce solo
--     la policy del bucket.
--   * **Non cancella dati.** Le precondizioni della sezione 1 pretendono ZERO
--     righe in ognuna delle dieci tabelle, ZERO righe delle sezioni che escono
--     nelle due tabelle che restano, ZERO oggetti e nessun bucket. Se ce n'e',
--     la rimozione per chiave e' un passo PRIMA di questo file
--     (`scripts/purge-production-tools.mjs`), non una cascata nascosta qui.
--   * **Non usa la parola che porta via in silenzio.** Nessuna istruzione di
--     questo file chiede la propagazione automatica ai dipendenti: se un
--     oggetto esterno che nessun inventario ha visto dipende da una tabella che
--     esce, il `DROP` deve FERMARSI e nominarlo.
--
-- ── REVERSIBILITA', DICHIARATA ──────────────────────────────────────────────
--
-- Nessuna. Lo schema si potrebbe ricostruire dalle migration che l'hanno fatto,
-- ma i DATI no: per decisione del proprietario (D-53-05) non e' stata fatta
-- alcuna copia prima della rimozione — calendario e scouting hanno una fonte
-- fuori dal prodotto, il resto e' stato dichiarato da buttare. Un ritorno
-- indietro e' una decisione nuova, non un `UNDO`.
--
-- **Dopo l'applicazione in produzione, niente Instant Rollback su Vercel**:
-- riporterebbe in vita il deploy che chiama ogni mattina il cron dello specchio
-- su tabelle che non esistono piu'. Si va solo avanti.
--
-- ⚠ QUESTO FILE E' UNA PUBBLICAZIONE (repo pubblico): nessun path di oggetto,
-- nessun identificativo di riga, nessuna serata, nessuna sede, nessun account.


-- ===========================================================================
-- 1. Precondizioni: niente da perdere, o non si parte
-- ===========================================================================
--
-- Ogni conteggio ha la sua ragione per essere zero:
--
--   * **le dieci tabelle che escono** — un `DROP TABLE` porterebbe via le righe
--     senza una traccia. `to_regclass` prima, perche' un progetto su cui una
--     tabella e' gia' assente non e' un errore: e' un passo gia' fatto.
--   * **`production_section` con `section = 'visual'`** — la tabella resta, ma
--     il `CHECK` riscritto alla sezione 5 si valida su ogni riga.
--   * **`production_open_question` con le tre sezioni che escono** — la tabella
--     resta, e una riga di una sezione senza policy diventerebbe illeggibile
--     per sempre: un dato che nessuno vede ma che nessuno ha tolto.
--   * **oggetti e bucket `'visual-archive'`** — senza la policy nessuno potrebbe
--     piu' leggerli dal prodotto, e la tabella che li indicizza esce qui.

DO $$
DECLARE
  v_tabella  text;
  v_righe    bigint;
  v_oggetti  bigint;
  v_bucket   bigint;
BEGIN
  FOREACH v_tabella IN ARRAY ARRAY[
    'production_lineup_slot',
    'production_checklist_item',
    'production_piece',
    'production_commitment',
    'production_plan',
    'production_import_run',
    'production_pipeline_rule',
    'production_space_attribute',
    'production_space',
    'production_visual_asset'
  ]
  LOOP
    IF to_regclass('public.' || v_tabella) IS NOT NULL THEN
      EXECUTE format('SELECT count(*) FROM public.%I', v_tabella) INTO v_righe;
      IF v_righe > 0 THEN
        RAISE EXCEPTION 'public.% ha ancora % righe', v_tabella, v_righe
          USING HINT = 'La rimozione per chiave e'' un passo PRIMA di questa migration (scripts/purge-production-tools.mjs).';
      END IF;
    END IF;
  END LOOP;

  IF to_regclass('public.production_section') IS NOT NULL THEN
    EXECUTE 'SELECT count(*) FROM public.production_section WHERE section = ''visual'''
      INTO v_righe;
    IF v_righe > 0 THEN
      RAISE EXCEPTION 'public.production_section (sezione visual) ha ancora % righe', v_righe
        USING HINT = 'La rimozione per chiave e'' un passo PRIMA di questa migration (scripts/purge-production-tools.mjs).';
    END IF;
  END IF;

  IF to_regclass('public.production_open_question') IS NOT NULL THEN
    EXECUTE 'SELECT count(*) FROM public.production_open_question WHERE section IN (''visual'', ''location'', ''calendar'')'
      INTO v_righe;
    IF v_righe > 0 THEN
      RAISE EXCEPTION 'public.production_open_question (sezioni visual, location, calendar) ha ancora % righe', v_righe
        USING HINT = 'La rimozione per chiave e'' un passo PRIMA di questa migration (scripts/purge-production-tools.mjs).';
    END IF;
  END IF;

  SELECT count(*) INTO v_oggetti
    FROM storage.objects
   WHERE bucket_id = 'visual-archive';

  IF v_oggetti > 0 THEN
    RAISE EXCEPTION 'il bucket visual-archive ha ancora % oggetti', v_oggetti
      USING HINT = 'La rimozione per chiave e'' un passo PRIMA di questa migration (scripts/purge-production-tools.mjs): gli oggetti si tolgono dall''API Storage, mai dall''SQL.';
  END IF;

  SELECT count(*) INTO v_bucket
    FROM storage.buckets
   WHERE id = 'visual-archive';

  IF v_bucket > 0 THEN
    RAISE EXCEPTION 'il bucket visual-archive esiste ancora (% riga in storage.buckets)', v_bucket
      USING HINT = 'La rimozione per chiave e'' un passo PRIMA di questa migration (scripts/purge-production-tools.mjs): il bucket si cancella dall''API Storage dopo aver riletto zero oggetti.';
  END IF;
END;
$$;


-- ===========================================================================
-- 2. Via le policy che leggono le tre chiavi SU TABELLE CHE RESTANO
-- ===========================================================================
--
-- Nomi RILETTI dalle migration:
--   * `visual_archive_select_visual` su `storage.objects` —
--     `20260817120400_visual_archive_bucket.sql:198-208`;
--   * `production_section_select_visual` —
--     `20260817120300_production_sections_access.sql:194`;
--   * `production_open_question_select_{visual,location,calendar}` — stesso
--     file, `:291`, `:300`, `:309`.
--
-- Le policy delle dieci tabelle che escono NON si nominano: un `DROP TABLE`
-- porta via le policy della tabella stessa (sono oggetti dipendenti, non
-- esterni). Qui servono solo quelle che vivono su tabelle che restano.
--
-- Un `DROP POLICY IF EXISTS` con un nome sbagliato passa pulito e non toglie
-- nulla: per questo il `DO` della sezione 7 non cerca i nomi, cerca le chiavi
-- e il letterale quotato del bucket.

DROP POLICY IF EXISTS visual_archive_select_visual ON storage.objects;

DROP POLICY IF EXISTS production_section_select_visual ON public.production_section;

DROP POLICY IF EXISTS production_open_question_select_visual   ON public.production_open_question;
DROP POLICY IF EXISTS production_open_question_select_location ON public.production_open_question;
DROP POLICY IF EXISTS production_open_question_select_calendar ON public.production_open_question;


-- ===========================================================================
-- 3. La policy brand-wide, riscritta sulla sola chiave del manifesto —
--    PRIMA che le altre tre escano dal catalogo (D-53-04)
-- ===========================================================================
--
-- Forma di partenza: `20260817120300_production_sections_access.sql:321-332`,
-- un braccio `section IS NULL` aperto a chi teneva UNA QUALUNQUE delle quattro
-- chiavi di sezione. Dopo questa fase le sezioni sono una sola, quindi il
-- braccio si riduce al manifesto. **Restringe e non allarga**: chi tiene la
-- chiave del manifesto (master e organizer) e' lo stesso insieme che teneva le
-- altre tre, quindi nessuno perde una lettura che oggi ha, e nessuno la guadagna.
--
-- Perche' PRIMA delle chiavi: una chiave cancellata sotto una policy che la
-- legge non solleva nulla — `private.has_capability` risponde falso, e la
-- policy diventa un rifiuto silenzioso e permanente. Riscritta qui, la policy
-- non legge piu' nessuna chiave che esce; il `DO` della sezione 7 lo rilegge.

DROP POLICY IF EXISTS production_open_question_select_brandwide ON public.production_open_question;

CREATE POLICY production_open_question_select_brandwide ON public.production_open_question
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING (
    section IS NULL
    AND (SELECT private.has_capability('production.manifesto.manage'))
  );


-- ===========================================================================
-- 4. Via le dieci tabelle, figli prima dei padri — poi due funzioni, una colonna
-- ===========================================================================
--
-- **Le dipendenze, rilette dai vincoli delle migration** (non dalla memoria):
--
--   * `production_lineup_slot.plan_id` → `production_plan`
--     (`20260822120000_production_lineup_slot.sql:62`, propaga la cancellazione);
--   * `production_checklist_item.plan_id` → `production_plan`
--     (`20260815120000_production_calendar.sql:661`, propaga);
--   * `production_piece.plan_id` → `production_plan` (`:345`, nessuna regola:
--     blocca);
--   * `production_commitment.expanded_from` → se stessa (`:523`, nessuna regola);
--   * `production_space_attribute.space_id` → `production_space`
--     (`20260817120100_production_location.sql:544`, RESTRICT: blocca).
--
-- Nessuna tabella che RESTA ha una chiave esterna verso una che esce
-- (`REFERENCES public.production_` su tutte le migration: solo i cinque
-- riferimenti interni qui sopra). L'ordine figli → padri rende ogni `DROP`
-- possibile senza chiedere propagazioni: se un progetto avesse una dipendenza
-- esterna che nessun inventario ha visto, il `DROP` si ferma e la nomina.
--
-- Con ogni tabella cadono i suoi oggetti dipendenti e solo quelli: policy RLS
-- (le `_select_production_calendar_manage`, `_select_location`,
-- `_select_visual`), indici, vincoli, e il trigger
-- `production_plan_refuse_renumber`. La funzione del trigger NON cade con la
-- tabella: si toglie per nome subito dopo, come `record_checklist_tick`, che
-- scriveva solo su una tabella che non c'e' piu' (firma riletta da
-- `20260815120100_production_calendar_access.sql:442-447` e `:567`).

DROP TABLE IF EXISTS public.production_lineup_slot;
DROP TABLE IF EXISTS public.production_checklist_item;
DROP TABLE IF EXISTS public.production_piece;
DROP TABLE IF EXISTS public.production_commitment;
DROP TABLE IF EXISTS public.production_plan;
DROP TABLE IF EXISTS public.production_import_run;
DROP TABLE IF EXISTS public.production_pipeline_rule;
DROP TABLE IF EXISTS public.production_space_attribute;
DROP TABLE IF EXISTS public.production_space;
DROP TABLE IF EXISTS public.production_visual_asset;

DROP FUNCTION IF EXISTS public.refuse_production_plan_renumber();
DROP FUNCTION IF EXISTS public.record_checklist_tick(uuid, boolean, uuid, text);

-- La parola-sede della serie: l'unica colonna su una tabella che resta, e il
-- suo vincolo d'unicita' (`20260815120000_production_calendar.sql:812-845`).
-- Serviva solo all'aggancio fra il feed del calendario e le serie: lo specchio
-- e' uscito (D-53-02), e una colonna senza lettori invita a riempirla.
-- Prima il vincolo, poi la colonna, nella stessa istruzione.

ALTER TABLE public.party_series
  DROP CONSTRAINT IF EXISTS party_series_ics_alias_unique,
  DROP COLUMN IF EXISTS ics_alias;


-- ===========================================================================
-- 5. Il `CHECK` di `production_section`: una voce, non due
-- ===========================================================================
--
-- Lo stesso nome di `20260817120200_production_sections.sql:151-152`, riscritto
-- con `DROP CONSTRAINT IF EXISTS` + `ADD CONSTRAINT` (forma di
-- `gallery_removal.sql` §4). **Restringe e non allarga**: la sezione visual non
-- si puo' piu' scrivere. Le precondizioni della sezione 1 garantiscono che
-- nessuna riga la porti, quindi la validazione non puo' fallire.

ALTER TABLE public.production_section
  DROP CONSTRAINT IF EXISTS production_section_section_check;

ALTER TABLE public.production_section
  ADD CONSTRAINT production_section_section_check
  CHECK (section IN ('manifesto'));


-- ===========================================================================
-- 6. Le tre chiavi escono dal catalogo — prima le concessioni, poi le chiavi
-- ===========================================================================
--
-- Due passi espliciti anche se `private.role_capabilities.capability` propaga
-- la cancellazione dalla chiave (`20260807000000`): chi apre il file deve
-- vedere quante concessioni escono senza dedurlo da un vincolo scritto altrove.
--
-- **Sei concessioni escono**: le tre chiavi a master e a organizer
-- (`20260817120000_production_section_keys.sql:165-174`). Nessuna assegnazione
-- per serata le porta: il vincolo di `party_assignments` non le ha mai ammesse.
--
-- 14 chiavi → **11**. 26 concessioni → **20**: master 11, organizer 9,
-- **staff 0**, attendee 0.
--
-- Questa sezione viene DOPO la sezione 3, e l'ordine e' il punto (D-53-04):
-- quando le chiavi spariscono, nessuna policy le legge piu'.

DELETE FROM private.role_capabilities
 WHERE capability IN ('production.calendar.manage', 'production.location.manage', 'production.visual.manage');

DELETE FROM private.capabilities
 WHERE key IN ('production.calendar.manage', 'production.location.manage', 'production.visual.manage');


-- ===========================================================================
-- 7. Il `DO` che rilegge il catalogo e solleva se l'invariante non tiene
-- ===========================================================================
--
-- Rilegge cio' che e' scritto, non cio' che questo file crede di aver scritto
-- (forma di `gallery_removal.sql` §6). Il bucket si cerca come LETTERALE
-- QUOTATO (`'visual-archive'`) nel `qual` e nel `with_check`; le chiavi si
-- cercano in OGNI policy di OGNI schema e nel corpo di ogni funzione, perche' un
-- nome di policy sbagliato in sezione 2 non deve poter lasciare un lettore vivo.

DO $$
DECLARE
  v_tabella         text;
  v_presenti        text := NULL;
  v_funzioni        text;
  v_colonna         integer;
  v_archivio        integer;
  v_quarantena      integer;
  v_lettori         integer;
  v_nomi_lettori    text;
  v_corpi           text;
  v_brandwide       text;
  v_brandwide_n     integer;
  v_chiavi          integer;
  v_concessioni     integer;
  v_master          integer;
  v_organizer       integer;
  v_staff           integer;
  v_attendee        integer;
  v_residue         integer;
  v_immagini        boolean;
  v_check           text;
BEGIN
  -- (a) le dieci tabelle, assenti
  FOREACH v_tabella IN ARRAY ARRAY[
    'production_lineup_slot',
    'production_checklist_item',
    'production_piece',
    'production_commitment',
    'production_plan',
    'production_import_run',
    'production_pipeline_rule',
    'production_space_attribute',
    'production_space',
    'production_visual_asset'
  ]
  LOOP
    IF to_regclass('public.' || v_tabella) IS NOT NULL THEN
      v_presenti := coalesce(v_presenti || ', ', '') || v_tabella;
    END IF;
  END LOOP;

  IF v_presenti IS NOT NULL THEN
    RAISE EXCEPTION 'tabelle ancora presenti dopo il DROP: %', v_presenti;
  END IF;

  -- (b) le due funzioni, assenti
  SELECT concat_ws(', ',
           CASE WHEN to_regprocedure('public.refuse_production_plan_renumber()') IS NOT NULL
                THEN 'refuse_production_plan_renumber()' END,
           CASE WHEN to_regprocedure('public.record_checklist_tick(uuid, boolean, uuid, text)') IS NOT NULL
                THEN 'record_checklist_tick(uuid, boolean, uuid, text)' END)
    INTO v_funzioni;

  IF v_funzioni <> '' THEN
    RAISE EXCEPTION 'funzioni rimaste senza tabella: %', v_funzioni;
  END IF;

  -- (c) la colonna della parola-sede, assente
  SELECT count(*) INTO v_colonna
    FROM information_schema.columns
   WHERE table_schema = 'public'
     AND table_name   = 'party_series'
     AND column_name  = 'ics_alias';

  IF v_colonna <> 0 THEN
    RAISE EXCEPTION 'public.party_series.ics_alias esiste ancora dopo il DROP COLUMN';
  END IF;

  -- (d) nessuna policy su storage.objects col letterale quotato del bucket
  SELECT count(*) INTO v_archivio
    FROM pg_policies
   WHERE schemaname = 'storage'
     AND tablename  = 'objects'
     AND (   coalesce(qual, '')       LIKE '%''visual-archive''%'
          OR coalesce(with_check, '') LIKE '%''visual-archive''%');

  IF v_archivio > 0 THEN
    RAISE EXCEPTION '% policy su storage.objects nominano ancora il bucket ''visual-archive''', v_archivio
      USING HINT = 'Una policy con un nome non previsto va letta in pg_policies (cercando il letterale quotato) e tolta per nome.';
  END IF;

  -- (e) la quarantena della cover, intatta: esattamente una policy
  SELECT count(*) INTO v_quarantena
    FROM pg_policies
   WHERE schemaname = 'storage'
     AND tablename  = 'objects'
     AND policyname = 'event_media_quarantine_insert_staff'
     AND coalesce(with_check, '') LIKE '%''event-media-quarantine''%';

  IF v_quarantena <> 1 THEN
    RAISE EXCEPTION 'event_media_quarantine_insert_staff trovata % volte sul bucket event-media-quarantine, attesa 1', v_quarantena
      USING HINT = 'La quarantena serve alla cover della serata: questa migration non deve toccarla.';
  END IF;

  -- (f) nessuna policy, in nessuno schema, legge una delle tre chiavi
  SELECT count(*),
         string_agg(schemaname || '.' || tablename || '.' || policyname, ', ')
    INTO v_lettori, v_nomi_lettori
    FROM pg_policies
   WHERE coalesce(qual, '') || coalesce(with_check, '') LIKE '%production.calendar.manage%'
      OR coalesce(qual, '') || coalesce(with_check, '') LIKE '%production.location.manage%'
      OR coalesce(qual, '') || coalesce(with_check, '') LIKE '%production.visual.manage%';

  IF v_lettori <> 0 THEN
    RAISE EXCEPTION 'le chiavi tolte hanno ancora % lettori di policy: %', v_lettori, v_nomi_lettori
      USING HINT = 'Una chiave non si cancella finche'' una policy la legge: la policy diventerebbe un rifiuto silenzioso e permanente.';
  END IF;

  -- (g) nessuna funzione dei due schemi applicativi nomina una delle tre chiavi
  SELECT string_agg(n.nspname || '.' || p.proname, ', ')
    INTO v_corpi
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname IN ('public', 'private')
     AND (   p.prosrc LIKE '%production.calendar.manage%'
          OR p.prosrc LIKE '%production.location.manage%'
          OR p.prosrc LIKE '%production.visual.manage%');

  IF v_corpi IS NOT NULL THEN
    RAISE EXCEPTION 'funzioni che nominano ancora una chiave tolta: %', v_corpi;
  END IF;

  -- (h) la brand-wide c'e', una volta, e legge solo il manifesto
  SELECT count(*), max(coalesce(qual, ''))
    INTO v_brandwide_n, v_brandwide
    FROM pg_policies
   WHERE schemaname = 'public'
     AND tablename  = 'production_open_question'
     AND policyname = 'production_open_question_select_brandwide';

  IF v_brandwide_n <> 1 THEN
    RAISE EXCEPTION 'production_open_question_select_brandwide trovata % volte, attesa 1', v_brandwide_n;
  END IF;

  IF v_brandwide NOT LIKE '%production.manifesto.manage%'
     OR v_brandwide LIKE '%production.calendar.manage%'
     OR v_brandwide LIKE '%production.location.manage%'
     OR v_brandwide LIKE '%production.visual.manage%' THEN
    RAISE EXCEPTION 'production_open_question_select_brandwide non legge la sola chiave del manifesto: %', v_brandwide;
  END IF;

  -- (i) il catalogo, ricontato
  SELECT count(*) INTO v_chiavi      FROM private.capabilities;
  SELECT count(*) INTO v_concessioni FROM private.role_capabilities;

  SELECT count(*) FILTER (WHERE role = 'master'),
         count(*) FILTER (WHERE role = 'organizer'),
         count(*) FILTER (WHERE role = 'staff'),
         count(*) FILTER (WHERE role = 'attendee')
    INTO v_master, v_organizer, v_staff, v_attendee
    FROM private.role_capabilities;

  SELECT (SELECT count(*) FROM private.capabilities
           WHERE key IN ('production.calendar.manage', 'production.location.manage', 'production.visual.manage'))
       + (SELECT count(*) FROM private.role_capabilities
           WHERE capability IN ('production.calendar.manage', 'production.location.manage', 'production.visual.manage'))
       + (SELECT count(*) FROM public.party_assignments
           WHERE capability IN ('production.calendar.manage', 'production.location.manage', 'production.visual.manage'))
    INTO v_residue;

  IF v_residue > 0 THEN
    RAISE EXCEPTION 'le tre chiavi tolte compaiono ancora % volte fra catalogo, concessioni e assegnazioni', v_residue;
  END IF;

  IF v_chiavi <> 11 THEN
    RAISE EXCEPTION 'private.capabilities ha % chiavi, attese 11', v_chiavi
      USING HINT = 'Lo stesso numero di EXPECTED_KEY_COUNT in scripts/verify-capabilities.mjs e delle chiavi di CAP in src/lib/capabilities/keys.ts.';
  END IF;

  IF v_concessioni <> 20 THEN
    RAISE EXCEPTION 'private.role_capabilities ha % concessioni, attese 20', v_concessioni
      USING HINT = 'master 11, organizer 9, staff 0, attendee 0 — EXPECTED_GRANT_COUNT in scripts/verify-capabilities.mjs.';
  END IF;

  IF v_master <> 11 OR v_organizer <> 9 OR v_staff <> 0 OR v_attendee <> 0 THEN
    RAISE EXCEPTION 'ripartizione delle concessioni inattesa: master %, organizer %, staff %, attendee % (attese 11, 9, 0, 0)',
      v_master, v_organizer, v_staff, v_attendee;
  END IF;

  -- (j) le cover restano pubbliche, invariate
  SELECT public INTO v_immagini
    FROM storage.buckets WHERE id = 'event-images';

  IF v_immagini IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'il bucket event-images ha public = %, atteso true e invariato', v_immagini
      USING HINT = 'Questa migration non tocca le cover. Un valore nullo vuol dire che il bucket non esiste.';
  END IF;

  -- (k) il CHECK di production_section ammette solo il manifesto
  SELECT pg_get_constraintdef(oid) INTO v_check
    FROM pg_constraint
   WHERE conrelid = 'public.production_section'::regclass
     AND conname  = 'production_section_section_check';

  IF v_check IS NULL OR v_check LIKE '%visual%' OR v_check NOT LIKE '%manifesto%' THEN
    RAISE EXCEPTION 'production_section_section_check non e'' quello atteso: %', coalesce(v_check, '(assente)');
  END IF;
END;
$$;


-- ===========================================================================
-- 8. I commenti, ricontati
-- ===========================================================================

COMMENT ON TABLE private.capabilities IS
  'Il catalogo delle chiavi di capability, rispecchiato dall''oggetto CAP in src/lib/capabilities/keys.ts. 11 chiavi dal 2026-10-14 (fase 53, CUT-01): le tre chiavi di sezione del calendario, di Location e del visual sono uscite con le loro superfici, qui e nello stesso ramo dal TypeScript — scripts/verify-capabilities.mjs confronta i due insiemi in ENTRAMBE le direzioni, quindi muoverne uno solo rende quel gate rosso. La sola sezione di produzione rimasta e'' il manifesto (production.manifesto.manage), che legge anche la policy brand-wide di production_open_question. Nessun test runner prova questa corrispondenza: la prova quel gate, e ha bisogno di un database vivo. 20261014120000_production_tools_removal.sql.';

COMMENT ON TABLE private.role_capabilities IS
  'Le concessioni per ruolo. 20 righe dal 2026-10-14 (fase 53, CUT-01): 11 a master, 9 a organizer, ZERO a staff e ZERO ad attendee. Sono uscite sei concessioni, le tre chiavi di sezione del calendario, di Location e del visual a master e organizer. Per attendee lo zero e'' voluto, chi compra non lavora. Per staff e'' un''asimmetria dichiarata: cio'' che lo fa lavorare non e'' il ruolo ma l''assegnazione alla serata (party_assignments: door.operate, door.supervise, party.manage) — va riletto prima di aggiungere un ruolo nuovo. 20261014120000_production_tools_removal.sql.';
