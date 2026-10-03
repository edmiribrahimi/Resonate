-- ═══════════════════════════════════════════════════════════════════════════
-- I LiveCut delle nostre serate — la tabella, gli artisti del b2b, la RLS.
--
-- Fase 52.3, piano 02 (MUS-07, MUS-08).
--
-- Un LiveCut e' la registrazione del mix di UNO slot della timetable di una
-- serata gia' avvenuta, ospitata su SoundCloud. Uno per slot, non uno per dj:
-- un b2b e' UNA riga di `livecuts` con DUE righe in `livecut_artists`
-- (`production-calendar.md`, gate *un LiveCut per slot*).
--
-- MUS-07: i dati sono nostri, con la RLS nella STESSA migration — la tabella
-- senza le sue policy sarebbe, per il tempo fra due file, la line-up di ogni
-- bozza leggibile con la chiave anonima.
-- MUS-08: il Podcast e' separato PER COSTRUZIONE. Un mix inviato da un dj
-- candidato non ha una serata ne' uno slot: `party_id` e' NOT NULL e
-- `part_number` e' una posizione di timetable, quindi qui non ci puo' entrare.
-- Il Podcast, quando esistera', avra' la sua tabella e il suo titolo.
--
-- ADDITIVA: due tabelle nuove, nessuna riga esistente toccata. Va applicata
-- PRIMA del codice che la legge e la scrive (piani 52.3-04 e seguenti). Il
-- codice gia' in esercizio non la nomina.
--
-- Una transazione sola, senza `BEGIN;`: l'endpoint
-- `POST /v1/projects/{ref}/database/migrations` la avvolge da solo (misurato
-- il 2026-09-21, vedi `20260923180100_gallery_close_data.sql`).
--
-- Questo repository e' PUBBLICO: nessun nome d'artista, nessuna data e nessun
-- luogo in questo file — solo la forma delle righe che li conterranno.
--
-- Idempotente: `CREATE TABLE IF NOT EXISTS` con i vincoli DENTRO la tabella,
-- `IF NOT EXISTS` sugli indici, `DROP POLICY IF EXISTS` prima di ogni
-- `CREATE POLICY`. Un insieme di vincoli DIVERSO e' una migration nuova, mai
-- una modifica a questa (`supabase-data.md`, gate *migration in avanti*).
-- ═══════════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. public.livecuts — un mix, uno slot, una serata
-- ─────────────────────────────────────────────────────────────────────────────
--
-- LA FASCIA E' DENORMALIZZATA, e per una ragione misurata: non esiste uno slot
-- stabile a cui puntare. La tabella privata della timetable importata dallo
-- specchio del calendario viene cancellata e reinserita a ogni corsa, quindi un
-- FK verso di lei perderebbe i LiveCut alla prima importazione. Il legame e'
-- con la SERATA (`event_parties`) e con gli ARTISTI (`livecut_artists`), come
-- `party_credits`.
--
-- NESSUNA COLONNA DI TESTO LIBERO. Niente titolo, niente descrizione: il
-- titolo si CALCOLA (D-52.3-03, `src/lib/livecuts/title.ts`) da format,
-- progressivo, artisti e data. Un campo libero sarebbe un'uscita pubblica che
-- nessun predicato vede, e il primo posto dove finirebbe un indirizzo di
-- secret venue (`venue-secrecy.md`).

CREATE TABLE IF NOT EXISTS public.livecuts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- LA SERATA. NOT NULL e' la meta' strutturale di MUS-08. `CASCADE`, la stessa
  -- scelta di `party_credits.party_id`: cancellare la serata fa sparire i suoi
  -- LiveCut dall'indice; la traccia resta su SoundCloud. RESTRICT e'
  -- l'alternativa dichiarata, da portare al proprietario solo se la chiede.
  party_id uuid NOT NULL REFERENCES public.event_parties ON DELETE CASCADE,

  -- PTn: la posizione dello slot nella timetable. Si ordina per lui, mai per
  -- orario — una notte 22:00 → 06:00 ha slot dopo la mezzanotte che l'orario
  -- metterebbe in testa.
  part_number smallint NOT NULL
    CONSTRAINT livecuts_part_number_check CHECK (part_number BETWEEN 1 AND 24),

  -- La fascia dello slot, copiata dalla timetable al momento della scrittura.
  -- `slot_end` PUO' essere minore di `slot_start`: lo slot attraversa la
  -- mezzanotte, e non e' un errore.
  slot_start time NOT NULL,
  slot_end time NOT NULL,

  -- Host ESATTO, nessun parametro, nessun `javascript:`. La regex e' la difesa
  -- strutturale; l'oEmbed in admin e' quella che dice se il brano esiste.
  soundcloud_url text NOT NULL
    CONSTRAINT livecuts_soundcloud_url_check
    CHECK (soundcloud_url ~ '^https://soundcloud\.com/[A-Za-z0-9_-]+/[A-Za-z0-9_-]+$'),

  -- Estratto dall'html dell'oEmbed in admin. `bigint`: gli id di oggi stanno
  -- ben sotto 2^53, quindi in TypeScript e' un `number` senza perdita.
  soundcloud_track_id bigint NOT NULL
    CONSTRAINT livecuts_track_id_check CHECK (soundcloud_track_id > 0),

  mixcloud_url text NULL
    CONSTRAINT livecuts_mixcloud_url_check
    CHECK (mixcloud_url IS NULL OR mixcloud_url ~ '^https://www\.mixcloud\.com/[A-Za-z0-9_-]+/[A-Za-z0-9_-]+/?$'),

  duration_seconds integer NOT NULL
    CONSTRAINT livecuts_duration_check CHECK (duration_seconds > 0 AND duration_seconds < 86400),

  -- URL pubblico scritto SOLO da `/api/media/finalize-cover`, sotto
  -- `livecuts/<uuid>.jpg`, dopo la rimozione dei metadati.
  cover_url text NULL,

  -- NULL = bozza, invisibile a chi non tiene `staff.manage`.
  published_at timestamptz NULL,

  -- Chi ha SCRITTO la riga, mai chi suona. `SET NULL`: nessun vincolo lo legge.
  created_by uuid REFERENCES auth.users ON DELETE SET NULL,

  created_at timestamptz NOT NULL DEFAULT now(),
  -- Nessun trigger: lo scrive l'action a ogni UPDATE (piano 52.3-07).
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT livecuts_one_per_slot UNIQUE (party_id, part_number),

  -- Nessun LiveCut esce senza la sua cover.
  CONSTRAINT livecuts_published_has_cover CHECK (published_at IS NULL OR cover_url IS NOT NULL)
);

-- `livecuts_one_per_slot` ha gia' un btree che comincia da `party_id`; questo
-- indice esplicito e' dichiarato dal piano e rende evidente la lettura
-- «i LiveCut di questa serata» a chi legge il file.
CREATE INDEX IF NOT EXISTS idx_livecuts_party ON public.livecuts (party_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. public.livecut_artists — chi suona nello slot, per RELAZIONE
-- ─────────────────────────────────────────────────────────────────────────────
--
-- Mai un nome ripetuto qui: una relazione con una riga di `public.artists`.
-- `RESTRICT` sull'artista, come `party_credits`: cancellare un artista che ha un
-- LiveCut riscriverebbe in silenzio cosa e' stata quella serata. Si stacca
-- prima, ed e' un atto deliberato.

CREATE TABLE IF NOT EXISTS public.livecut_artists (
  livecut_id uuid NOT NULL REFERENCES public.livecuts ON DELETE CASCADE,
  artist_id uuid NOT NULL REFERENCES public.artists ON DELETE RESTRICT,
  sort_order smallint NOT NULL DEFAULT 0,
  PRIMARY KEY (livecut_id, artist_id)
);

-- La direzione inversa, «su quali LiveCut suona questo artista», ed e' cio' che
-- rende economico il RESTRICT: senza, cancellare un artista scandisce la tabella.
CREATE INDEX IF NOT EXISTS idx_livecut_artists_artist ON public.livecut_artists (artist_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. RLS — la lettura pubblica ereditata dalla serata, la scrittura a `staff.manage`
-- ─────────────────────────────────────────────────────────────────────────────
--
-- Il middleware e' UX, la RLS e' sicurezza (`CLAUDE.md`, principio 2): chi
-- legge una bozza lo decide la policy, non la pagina.
--
-- LETTURA PUBBLICA: solo LiveCut PUBBLICATI di eventi PUBBLICATI. Una bozza
-- porta la line-up di uno slot, e una line-up non annunciata e' materiale
-- (`sound-manifesto.md`): una lettura incondizionata la pubblicherebbe
-- all'INSERT, e la pubblicazione non si annulla.
--
-- SCRITTURA E LETTURA DELLE BOZZE: `staff.manage`, tenuto da master e organizer
-- soli — la stessa chiave di `events_*_staff` ed `event_parties_*_staff`
-- (`20260924120000_organizers_manage_all_events.sql`). `staff` e `attendee`
-- restano fuori. Nessuna chiave di capability nuova.
--
-- Il wrapper `(select …)` e' PORTANTE: Postgres valuta la chiamata una volta
-- per statement come InitPlan invece che una volta per riga
-- (`20260807000000_capability_model.sql:177-184`).

ALTER TABLE public.livecuts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.livecut_artists ENABLE ROW LEVEL SECURITY;

-- `ep.id = party_id` confronta l'alias interno con la colonna di QUESTA
-- tabella: `event_parties` non ha una colonna con quel nome, quindi il
-- riferimento non e' ambiguo (stessa forma di `party_credits_select_published`).
DROP POLICY IF EXISTS livecuts_select_published ON public.livecuts;
CREATE POLICY livecuts_select_published ON public.livecuts
  AS PERMISSIVE
  FOR SELECT
  USING (
    published_at IS NOT NULL
    AND EXISTS (
      SELECT 1
        FROM public.event_parties ep
        JOIN public.events e ON e.id = ep.event_id
       WHERE ep.id = party_id
         AND e.is_published = true
    )
  );

DROP POLICY IF EXISTS livecuts_select_staff ON public.livecuts;
CREATE POLICY livecuts_select_staff ON public.livecuts
  AS PERMISSIVE
  FOR SELECT
  USING ((select private.has_capability('staff.manage')));

DROP POLICY IF EXISTS livecuts_insert_staff ON public.livecuts;
CREATE POLICY livecuts_insert_staff ON public.livecuts
  AS PERMISSIVE
  FOR INSERT
  WITH CHECK ((select private.has_capability('staff.manage')));

DROP POLICY IF EXISTS livecuts_update_staff ON public.livecuts;
CREATE POLICY livecuts_update_staff ON public.livecuts
  AS PERMISSIVE
  FOR UPDATE
  USING ((select private.has_capability('staff.manage')))
  WITH CHECK ((select private.has_capability('staff.manage')));

DROP POLICY IF EXISTS livecuts_delete_staff ON public.livecuts;
CREATE POLICY livecuts_delete_staff ON public.livecuts
  AS PERMISSIVE
  FOR DELETE
  USING ((select private.has_capability('staff.manage')));

-- Gli artisti di un LiveCut sono esattamente pubblici quanto il LiveCut: la
-- stessa condizione, riletta attraverso il padre. `l.id = livecut_id` confronta
-- l'alias interno con la colonna di QUESTA tabella.
DROP POLICY IF EXISTS livecut_artists_select_published ON public.livecut_artists;
CREATE POLICY livecut_artists_select_published ON public.livecut_artists
  AS PERMISSIVE
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
        FROM public.livecuts l
        JOIN public.event_parties ep ON ep.id = l.party_id
        JOIN public.events e ON e.id = ep.event_id
       WHERE l.id = livecut_id
         AND l.published_at IS NOT NULL
         AND e.is_published = true
    )
  );

DROP POLICY IF EXISTS livecut_artists_select_staff ON public.livecut_artists;
CREATE POLICY livecut_artists_select_staff ON public.livecut_artists
  AS PERMISSIVE
  FOR SELECT
  USING ((select private.has_capability('staff.manage')));

DROP POLICY IF EXISTS livecut_artists_insert_staff ON public.livecut_artists;
CREATE POLICY livecut_artists_insert_staff ON public.livecut_artists
  AS PERMISSIVE
  FOR INSERT
  WITH CHECK ((select private.has_capability('staff.manage')));

DROP POLICY IF EXISTS livecut_artists_update_staff ON public.livecut_artists;
CREATE POLICY livecut_artists_update_staff ON public.livecut_artists
  AS PERMISSIVE
  FOR UPDATE
  USING ((select private.has_capability('staff.manage')))
  WITH CHECK ((select private.has_capability('staff.manage')));

DROP POLICY IF EXISTS livecut_artists_delete_staff ON public.livecut_artists;
CREATE POLICY livecut_artists_delete_staff ON public.livecut_artists
  AS PERMISSIVE
  FOR DELETE
  USING ((select private.has_capability('staff.manage')));

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. COMMENT ON — le scelte non ovvie, dove le legge il catalogo
-- ─────────────────────────────────────────────────────────────────────────────

COMMENT ON TABLE public.livecuts IS
  'LiveCut: il mix di UNO slot della timetable di una serata gia'' avvenuta, ospitato su SoundCloud. Uno per slot: un b2b e'' una riga con due artisti in livecut_artists. Un mix di un dj candidato non ha serata ne'' slot e qui non puo'' entrare (MUS-08). Nessun testo libero: il titolo si calcola (D-52.3-03). Fase 52.3.';

COMMENT ON COLUMN public.livecuts.party_id IS
  'La serata. NOT NULL per costruzione (MUS-08). ON DELETE CASCADE, come party_credits: cancellare la serata fa sparire i suoi LiveCut dall''indice; la traccia resta su SoundCloud. RESTRICT e'' l''alternativa dichiarata.';

COMMENT ON COLUMN public.livecuts.part_number IS
  'PTn: posizione dello slot nella timetable. Si ordina per lui, mai per orario.';

COMMENT ON COLUMN public.livecuts.slot_start IS
  'Inizio della fascia dello slot, denormalizzato dalla timetable (che non ha righe stabili).';

COMMENT ON COLUMN public.livecuts.slot_end IS
  'Fine della fascia dello slot. Puo'' essere minore di slot_start quando lo slot attraversa la mezzanotte (22:00 → 06:00).';

COMMENT ON COLUMN public.livecuts.soundcloud_url IS
  'URL della traccia: host esatto soundcloud.com, due segmenti, nessun parametro (livecuts_soundcloud_url_check).';

COMMENT ON COLUMN public.livecuts.soundcloud_track_id IS
  'Id numerico della traccia, estratto dall''oEmbed in admin; il widget lo usa come stringa.';

COMMENT ON COLUMN public.livecuts.mixcloud_url IS
  'Copia facoltativa su Mixcloud: host esatto www.mixcloud.com (livecuts_mixcloud_url_check).';

COMMENT ON COLUMN public.livecuts.cover_url IS
  'URL pubblico della cover, scritto SOLO da /api/media/finalize-cover sotto livecuts/<uuid>.jpg, dopo la rimozione dei metadati.';

COMMENT ON COLUMN public.livecuts.published_at IS
  'NULL = bozza, invisibile a chi non tiene staff.manage. Pubblicare richiede la cover (livecuts_published_has_cover).';

COMMENT ON COLUMN public.livecuts.created_by IS
  'Chi ha scritto la riga, mai chi suona. SET NULL alla cancellazione dell''account.';

COMMENT ON COLUMN public.livecuts.updated_at IS
  'Scritto dall''action a ogni UPDATE: nessun trigger.';

COMMENT ON TABLE public.livecut_artists IS
  'Chi suona nello slot di un LiveCut, per relazione con public.artists. Due righe = un b2b. Pubblica quanto il LiveCut padre.';

COMMENT ON COLUMN public.livecut_artists.artist_id IS
  'ON DELETE RESTRICT, come party_credits: si stacca prima di cancellare l''artista.';

COMMENT ON COLUMN public.livecut_artists.sort_order IS
  'Ordine dei nomi nel titolo calcolato. Solo visualizzazione.';

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. Cosa questa migration NON fa
-- ─────────────────────────────────────────────────────────────────────────────
--
-- * Nessuna chiave di capability nuova: `staff.manage` esiste ed e' quella che
--   governa gia' eventi e serate.
-- * Nessuna tabella `podcasts`: il Podcast non esiste ancora, e una tabella
--   vuota oggi sarebbe schema speculativo.
-- * Nessun riempimento: nessuna riga viene scritta qui. Il seme del laboratorio
--   e' un piano a parte, dichiarato.
-- * Nessun FK verso `production_lineup_slot`: e' privata e rifatta a ogni corsa
--   dello specchio, quindi la fascia si copia invece di puntarla.
