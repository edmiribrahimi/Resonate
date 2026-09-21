-- ═══════════════════════════════════════════════════════════════════════════
-- Via lo stato, via il referral, via il flag che li univa alle capability
--
-- Fase 50 «Via le iscrizioni» — REG-02, REG-03, REG-04, REG-05.
-- Decisioni: D-50-01, D-50-03, D-50-07, D-50-08, D-50-09, D-50-16, D-50-20,
-- D-50-22, D-50-23, D-50-24.
--
-- ── IL VERSO DEL DEPLOY E' INVERTITO. CODICE PRIMA, QUESTA MIGRATION DOPO ───
--
-- **NON APPLICARE QUESTA MIGRATION PRIMA DEL DEPLOY DEL CODICE DELLA FASE 50.**
--
-- La regola di questo repository e' «migration prima, codice dopo». Esiste una
-- sola eccezione registrata, `20260809006000_event_media_server_upload_only.sql`,
-- che la inverte e dichiara il criterio: *«fra un peggioramento temporaneo e uno
-- stato invariato si sceglie lo stato invariato»*. Questa e' la seconda, e il
-- criterio dice la stessa cosa:
--
--   * **applicarla PRIMA** apre una finestra `42703 column does not exist` sul
--     codice ancora in produzione, che legge e scrive `profiles.status`:
--     il webhook dei pagamenti (`src/app/api/webhooks/sumup/route.ts:190` e
--     `:534`), la pagina membri, `purchaseTicket` e l'RSVP. **Il percorso del
--     denaro si romperebbe**, per la durata del deploy;
--   * **applicarla DOPO** non rompe niente: il codice gia' spinto non legge piu'
--     lo stato, la colonna resta popolata, `NOT NULL DEFAULT 'approved'`
--     continua a soddisfarsi da solo su ogni `INSERT`, e `has_capability`
--     continua a rispondere come oggi.
--
-- Fra una finestra che rompe un incasso e uno stato invariato si sceglie lo
-- stato invariato, e lo si scrive qui invece di lasciarlo scoprire a chi apre
-- la coda a meta'.
--
-- ── E UN'ECCEZIONE DENTRO L'ECCEZIONE: IL TRIGGER STA IN QUESTO FILE ────────
--
-- `public.handle_new_user()` inserisce ESPLICITAMENTE `status`, `referred_by` e
-- `approved_via` (`20260908120000:108-118`). Se le colonne cadessero in una
-- transazione e il trigger si ridefinisse in un'altra, esisterebbe un istante in
-- cui l'`INSERT` del trigger nomina colonne che non ci sono — e in quell'istante
-- **nessuno puo' creare un account, compreso chi ha appena pagato**. Per questo
-- la ridefinizione del trigger e il `DROP COLUMN` stanno nello stesso file e
-- nella stessa transazione. Una migration sola, una transazione sola.
--
-- ── UNA TRANSAZIONE SOLA, E NON C'E' `BEGIN;` PERCHE' NON SERVE ─────────────
--
-- **Misurato sul laboratorio il 2026-09-21 alle 12:35:43Z, non ricordato.**
-- L'endpoint `POST /v1/projects/{ref}/database/migrations` avvolge il corpo in
-- UNA transazione da solo: una sonda con `create table private._tx_probe(x int)`
-- seguita da `select 1/0` e' tornata `400 … division by zero`, e subito dopo
-- `to_regclass('private._tx_probe')` era **null** — la tabella non e'
-- sopravvissuta allo statement fallito. Aggiungere qui un `BEGIN;` esplicito
-- produrrebbe un `WARNING: there is already a transaction in progress` e un
-- `COMMIT` che chiude la transazione dell'endpoint a meta' del suo lavoro.
-- Nessuna delle sei migration della fase 49, applicate dallo stesso endpoint, lo
-- porta. Neanche questa.
--
-- ── COSA QUESTA MIGRATION NON FA, E VA LETTO PRIMA DI CERCARLO ──────────────
--
--   * **Non tocca `profiles.membership_code`.** E' la credenziale della porta e
--     la toglie la fase 51. Il conio in `handle_new_user` e' riportato qui
--     IDENTICO a `20260905130000`/`20260908120000` — `extensions.gen_random_bytes`,
--     cinque tentativi sulla sola collisione — perche' ridefinire una funzione
--     significa riscriverne il corpo per intero, non perche' cambi.
--   * **Non tocca `event_media.status`** ne' le altre sei colonne omonime su
--     altre tabelle (`pending_purchases`, `ticket_refunds`, `drink_orders`,
--     `drink_tokens`, `guest_list_entries`, `ticket_orders`,
--     `drink_refund_request`): sono la moderazione e gli stati d'ordine, non
--     l'accesso.
--   * **Non tocca `public.venue_for_parties`.** La fase 49 l'ha gia' riscritta
--     (`20260905131000:116`) e il `p.status` che si trova greppando
--     `20260810161000:534` appartiene a una definizione **superata**. Riletto
--     dal catalogo il 2026-09-21: la definizione viva nomina `status` solo
--     dentro un commento.
--   * **Non tocca `membership.card.view`**, che perde il flag insieme alla
--     colonna e resta come **debito dichiarato con il nome della fase che lo
--     chiude: la 51** (`MEM-01`). Anticiparne la rimozione toccherebbe la porta,
--     e la porta non e' mai in pacchetto (D-50-23).
--   * **Non cancella la CHIAVE `membership.active` dal catalogo**, solo le sue
--     quattro concessioni. Vedi la sezione 5b, che dice perche'.
--   * **Non tocca le policy di lettura e di cancellazione di `rsvps`**: D-50-22
--     tiene lo storico leggibile, e fra i suoi lettori c'e' la rivelazione del
--     venue, che e' una guardia monotona.
--
-- ── L'ORDINE DEI PASSI, CHE NON E' ESTETICO ────────────────────────────────
--
--   1. le dipendenze REGISTRATE che bloccano il `DROP COLUMN` (le policy e il
--      vincolo di tabella);
--   2. la policy di storage, che dipende da `get_user_status()`;
--   3. le SEI funzioni che leggono lo stato senza dipendenza dichiarata —
--      `CREATE OR REPLACE` su firma identica, che conserva l'ACL;
--   4. il registro, che guadagna il suo ottavo atto;
--   5. le cancellazioni, per ultime.
--
-- ── SEI FUNZIONI, NON QUATTRO: IL CATALOGO HA SMENTITO L'ELENCO ────────────
--
-- `50-RESEARCH.md` §1.2 elenca quattro funzioni da ridefinire. Interrogando
-- `pg_proc` sul laboratorio il 2026-09-21 (`pg_get_functiondef` filtrato su
-- `prokind = 'f'`) i lettori veri di `public.profiles.status` sono **sei**:
--
--     handle_new_user()                                    — in elenco
--     my_access_context()                                  — in elenco
--     my_access_context(uuid)                              — NON in elenco
--     private.has_capability(text, uuid)                   — in elenco
--     reconcile_master(text)                               — in elenco
--     record_membership_act(uuid,text,uuid,text,text,text,text,uuid) — NON in elenco
--
-- `my_access_context(uuid)` e' il sovraccarico per serata di
-- `20260809005000`, e porta la stessa chiave `'status'` nel payload.
-- `record_membership_act` e' **la piu' grave delle due**: e' `plpgsql`, quindi
-- il `DROP COLUMN` riesce e la funzione si rompe in silenzio — e con lei
-- `createAccount`, che e' l'unico modo di creare un account di staff, e
-- `reconcile_master`, che gira a ogni deploy. Un elenco letto dai file trova
-- cio' che una migration ha scritto; solo il catalogo trova cio' che c'e'.
-- ═══════════════════════════════════════════════════════════════════════════


-- ===========================================================================
-- 1. Le dipendenze REGISTRATE: due policy, una da ricreare e una da sostituire
-- ===========================================================================
--
-- Una policy e' una dipendenza registrata: finche' il suo predicato nomina la
-- colonna, `ALTER TABLE … DROP COLUMN` rifiuta. Si droppa e si ricrea nella
-- stessa transazione, e non c'e' istante in cui la tabella resta senza guardia.

-- ── 1a. `profiles_update_own` — CADE LO STATO, RESTA IL RUOLO ──────────────
--
-- **QUESTA E' LA GUARDIA ANTI-ESCALATION**, ed e' l'unica cosa che impedisce a
-- una persona di riscriversi il ruolo con un `PATCH /rest/v1/profiles`. Il
-- termine che cade e' **solo** `status = (SELECT profiles_1.status …)`. Il
-- termine `role = (SELECT profiles_1.role …)` **resta**, e resta identico.
--
-- Una `profiles_update_own` ricreata perdendo il termine sul ruolo non sarebbe
-- una semplificazione: sarebbe **una primitiva di escalation dei privilegi**,
-- consegnata a ogni sessione autenticata in una riga sola. Il modo di provare
-- che non e' successo non e' rileggere questo file — e' rileggere
-- `pg_policies.with_check` dal catalogo DOPO l'applicazione, e verificare che
-- contenga ancora `role` e non contenga piu' `status`. Il file dice cosa si
-- voleva applicare; `pg_policies` dice cosa sta girando.
--
-- Predicato preso dalla forma APPLICATA (`pg_policies`, laboratorio,
-- 2026-09-21), non ricomposto a memoria: `roles = {public}` — quindi nessuna
-- clausola `TO` —, `USING` invariato, `WITH CHECK` meno un congiunto.

DROP POLICY IF EXISTS profiles_update_own ON public.profiles;

CREATE POLICY profiles_update_own ON public.profiles
  AS PERMISSIVE
  FOR UPDATE
  USING (((select auth.uid()) = id))
  WITH CHECK (
    ((select auth.uid()) = id)
    AND (role = (
      SELECT profiles_1.role
        FROM public.profiles profiles_1
       WHERE (profiles_1.id = (select auth.uid()))
    ))
  );

-- ── 1b. `event_media_insert_member` → `event_media_insert_staff` (D-50-03) ──
--
-- La vecchia policy chiede `has_capability('membership.active')`. Senza il flag
-- `requires_approved` quella chiave diventa *«ha un profilo»*, cioe' **chiunque
-- abbia comprato un biglietto potrebbe inserire una riga in `event_media`** —
-- un allargamento su un percorso che `media-and-storage.md` (gate *chi carica
-- ha titolo*) e `venue-secrecy.md` presidiano insieme: una foto scattata dentro
-- una sede segreta porta le coordinate nei suoi byte. Quindi il predicato si
-- riscrive **per capability di lavoro**, non per stato e non per «utente
-- loggato».
--
-- **I DUE CONGIUNTI DELLA FASE 35 RESTANO, E NON ERANO NELLA PROPOSTA.**
-- `50-RESEARCH.md` §3.2 propone un predicato di tre termini, letto da
-- `20260807010000:189-193`. La policy **applicata** ne ha cinque: la fase 35 le
-- ha aggiunti (`20260809004500:414-426`) e sono
--
--     party_id IS NOT NULL                                — la riga nomina una serata
--     private.party_event_id(party_id) = event_id         — ed e' la serata DI QUESTO evento
--
-- Riscrivere dalla proposta invece che dal catalogo li avrebbe **tolti** — cioe'
-- avrebbe allargato la policy mentre il commit diceva di restringerla. Restano,
-- parola per parola.
--
-- **LA FORMA A DUE ARGOMENTI E' STATA SCRITTA, ed e' una scelta dichiarata.**
-- La nota di chiusura di `20260807010000` avverte che `has_capability` va
-- chiamata con UN argomento, perche' la lista bianca del comparatore della fase
-- 32 non accetta la forma a due. Quel comparatore era uno strumento di quella
-- fase: non e' uno script di questo repository e non e' fra i gate di
-- `npm run verify` (verificato il 2026-09-21 su `package.json`). La forma a due
-- argomenti e' invece l'unica che concede l'`INSERT` **al fotografo assegnato a
-- quella serata**, che e' la persona per cui l'arm dell'assegnazione esiste. Con
-- `party_id IS NOT NULL` garantito dal congiunto sopra, l'arm 2 di
-- `has_capability` puo' scattare; su una riga senza serata sarebbe `staff.manage`
-- da solo, cioe' fail closed.

DROP POLICY IF EXISTS event_media_insert_member ON public.event_media;

CREATE POLICY event_media_insert_staff ON public.event_media
  AS PERMISSIVE
  FOR INSERT
  TO authenticated
  WITH CHECK (
    ((select auth.uid()) = uploaded_by)
    AND (
      (select private.has_capability('staff.manage'))
      OR (select private.has_capability('media.upload', party_id))
    )
    AND (party_id IS NOT NULL)
    AND ((select private.party_event_id(party_id)) = event_id)
  );

-- ── 1c. `rsvps_insert_approved` — si droppa e NON si sostituisce ────────────
--
-- D-50-20: in `rsvps` non si scrive piu'. L'RSVP di una serata gratuita diventa
-- un ordine a totale zero (REG-06) e passa da `reserve_ticket_order`, non da
-- questa tabella. Togliere la sola policy di `INSERT` e' il modo di rendere
-- «sola lettura» **un fatto di schema** invece che una promessa in un documento.
--
-- **Le policy di lettura e di cancellazione restano** — `rsvps_select_own`,
-- `rsvps_select_admin`, `rsvps_delete_own` — perche' D-50-22 tiene lo storico
-- leggibile e quattro lettori continuano a servirsene, fra cui la rivelazione
-- del venue, che e' una guardia monotona e non si tocca. Su produzione la
-- tabella e' vuota (0 righe, misurato il 2026-09-21): il debito chiude a zero.

DROP POLICY IF EXISTS rsvps_insert_approved ON public.rsvps;

-- ── 1d. I tre `CHECK` di tabella, droppati PER NOME ────────────────────────
--
-- Postgres droppa da solo un vincolo di tabella che coinvolge la colonna
-- droppata. Quella pero' e' l'assunzione `A2`, e un'assunzione costa una riga in
-- meno di quanto costi scoprirla sbagliata a migration in corso. I tre nomi sono
-- quelli **misurati** in `50-MEASURES.md` (C5) con `pg_get_constraintdef`, nella
-- forma normale di Postgres, non composti a memoria.
--
-- `profiles_role_check` NON e' qui: non nomina lo stato e resta.

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_implies_approved;
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_status_check;
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_approved_via_check;


-- ===========================================================================
-- 2. La policy di storage, che dipendeva da `get_user_status()`
-- ===========================================================================
--
-- ── IL RESTRINGIMENTO E' REALE, E VA DETTO INVECE CHE SCOPERTO ─────────────
--
-- Cosi' scritta, questa policy **rifiuta chi ha solo un'assegnazione
-- `media.upload` per serata** — il fotografo della serata, che e' proprio la
-- persona per cui quell'arm esiste (`20260808000500:127-135`). Non e' una
-- svista: il bucket **non conosce la serata**. Il percorso di un oggetto e'
-- `{eventId}/{userId}/{ts}.{ext}` (`MediaUpload.tsx:401`), quindi non c'e' un
-- `party_id` da passare a `has_capability` da dentro `storage.objects`.
--
-- Le due strade erano: allargare il percorso del file alla serata, oppure
-- tenere il predicato di storage piu' stretto e lasciare che **il gate vero sia
-- la tabella** — che e' la forma gia' in uso da `20260809006000`, dove il solo
-- scrittore del bucket pubblico e' il ruolo di servizio. E' stata scelta la
-- seconda: un percorso di file e' un'interfaccia verso oggetti gia' depositati,
-- e cambiarla e' una migrazione di dati travestita da policy.
--
-- Chi legge fra sei mesi e trova un fotografo assegnato che non deposita in
-- quarantena sta leggendo questo paragrafo, non una svista.

DROP POLICY IF EXISTS event_media_quarantine_insert_approved ON storage.objects;

CREATE POLICY event_media_quarantine_insert_staff
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'event-media-quarantine'
    AND (select private.has_capability('staff.manage'))
  );


-- ===========================================================================
-- 3. Le sei funzioni che leggevano lo stato senza dipendenza dichiarata
-- ===========================================================================
--
-- `CREATE OR REPLACE` su **firma identica** per tutte e sei: conserva l'ACL, ed
-- e' una proprieta' misurata dello strumento (`49-AUTHORISATION.md`), non una
-- speranza. `proacl` viene riletto dal catalogo prima e dopo.

-- ── 3a. `private.has_capability(text, uuid)` — cade UN congiunto ───────────
--
-- L'arm 1 perde `and (not rc.requires_approved or p.status = 'approved')`.
-- **Nient'altro cambia**: ne' la firma, ne' l'arm 2 dell'assegnazione, ne' i
-- commenti che spiegano perche' l'arm 2 non ha mai guardato lo stato.
--
-- Cosa questo allarga, dichiarato una capability alla volta (§1.3):
--   `catalogue.manage`, `register.read`, `media.upload`, `party.manage`,
--   `venue.reveal`  — **nessun allargamento reale**: il `CHECK`
--   `profiles_role_implies_approved` rendeva ogni master/organizer/staff
--   `approved` per regola di database, quindi il congiunto era sempre vero per
--   ogni soggetto che poteva tenerle;
--   `membership.card.view`   — diventa «qualunque account»: debito dichiarato,
--   lo chiude la fase 51 (D-50-23);
--   `membership.active`      — diventerebbe «qualunque account», e per questo
--   le sue concessioni si cancellano alla sezione 5b.

CREATE OR REPLACE FUNCTION private.has_capability(
  p_capability text,
  p_party_id   uuid default null
) RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  -- ARM 1 — la concessione per ruolo. Identica a com'era, meno il congiunto
  -- sullo stato: la fase 50 toglie `role_capabilities.requires_approved`, e una
  -- chiave si tiene o non si tiene, senza un secondo asse.
  select exists (
    select 1
    from public.profiles p
    join private.role_capabilities rc on rc.role = p.role
    where p.id = (select auth.uid())
      and rc.capability = p_capability
  )
  -- ARM 2 — l'assegnazione per serata. INVARIATO, e non aveva mai letto ne'
  -- `requires_approved` ne' lo stato: la ragione e' scritta per esteso in
  -- `20260809001000_assignment_resolver.sql:295-320` e resta vera — una prova
  -- sullo stato qui sarebbe stata un modo nuovo di rifiutare qualcuno alla
  -- porta.
  or exists (
    select 1
    from public.party_assignments pa
    where p_party_id is not null
      and pa.party_id = p_party_id
      and pa.user_id = (select auth.uid())
      and pa.capability = p_capability
      -- ASSIGN-03: una revoca e' una riga aggiornata, mai una rimossa.
      and pa.revoked_at is null
      -- ASSIGN-02, sull'orologio del server, che nessun dispositivo puo'
      -- spostare.
      and now() < pa.ends_at
  );
$$;

-- ── 3b. `public.my_access_context()` e il suo sovraccarico per serata ───────
--
-- Entrambe le selezioni smettono di restituire `'status'` nel payload. **La
-- chiave sparisce, non diventa nulla**: un campo che c'e' sempre e vale `null`
-- e' un campo che qualcuno continuera' a leggere, e fra sei mesi qualcun altro
-- ci scrivera' sopra un ramo.
--
-- Il sovraccarico `my_access_context(uuid)` non era in `50-RESEARCH.md` §1.2:
-- l'ha trovato il catalogo. Le due definizioni restano parola per parola
-- identiche fra loro sulle chiavi comuni, com'e' scritto nel commento della
-- seconda — due payload con una forma sola.

CREATE OR REPLACE FUNCTION public.my_access_context()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  -- L'elenco delle capability e' DERIVATO dal predicato: una chiamata a
  -- private.has_capability per riga di catalogo. Non e' una seconda copia della
  -- giunzione profili-concessioni. Due implementazioni di una regola sono due
  -- definizioni, e due definizioni divergono — l'unica cosa che CAP-01 vieta.
  select jsonb_build_object(
    'capabilities', coalesce(
      (
        select jsonb_agg(c.key order by c.key)
        from private.capabilities c
        where private.has_capability(c.key)
      ),
      '[]'::jsonb
    ),
    'user_id', (select auth.uid()),
    'role', (
      select p.role from public.profiles p where p.id = (select auth.uid())
    ),
    -- La chiave 'status' STAVA QUI. Fase 50, REG-02: lo stato non esiste piu',
    -- e un payload che lo restituisse nullo inviterebbe a leggerlo.
    'live_assignment_capabilities', coalesce(
      (
        select jsonb_agg(distinct pa.capability order by pa.capability)
        from public.party_assignments pa
        where pa.user_id = (select auth.uid())
          and pa.revoked_at is null
          and now() < pa.ends_at
      ),
      '[]'::jsonb
    )
  );
$$;

CREATE OR REPLACE FUNCTION public.my_access_context(p_party_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  -- Stessa derivazione della forma senza argomento, con la serata passata
  -- all'arm 2 del risolutore.
  select jsonb_build_object(
    'capabilities', coalesce(
      (
        select jsonb_agg(c.key order by c.key)
        from private.capabilities c
        where private.has_capability(c.key, p_party_id)
      ),
      '[]'::jsonb
    ),
    'user_id', (select auth.uid()),
    'role', (
      select p.role from public.profiles p where p.id = (select auth.uid())
    ),
    -- La chiave 'status' STAVA QUI, identica a quella della forma senza
    -- argomento. Se ne va insieme a lei: i due payload devono avere una forma
    -- sola.
    'live_assignment_capabilities', coalesce(
      (
        select jsonb_agg(distinct pa.capability order by pa.capability)
        from public.party_assignments pa
        where pa.user_id = (select auth.uid())
          and pa.revoked_at is null
          and now() < pa.ends_at
      ),
      '[]'::jsonb
    )
  );
$$;

-- ── 3c. `public.record_membership_act(...)` — LA FUNZIONE CHE L'ELENCO NON
--        AVEVA, e quella che si sarebbe rotta in silenzio ───────────────────
--
-- E' `plpgsql`: il `DROP COLUMN` riesce e la funzione si rompe al primo
-- richiamo, con un `42703` dentro una `SECURITY DEFINER` che scrive il ruolo.
-- I due richiami che contano sono `createAccount` — **l'unico modo di creare un
-- account di staff in questo prodotto** — e `reconcile_master`, che gira a ogni
-- deploy. Non ridefinirla qui avrebbe prodotto esattamente la finestra che
-- questo file esiste per non aprire.
--
-- **LA FIRMA NON CAMBIA, E `p_status` RESTA — ACCETTATO E IGNORATO.** Toglierlo
-- cambierebbe la firma, e una firma nuova perde l'ACL (il `REVOKE`/`GRANT` di
-- `20260808002000:485-490`) e rompe nello stesso istante ogni chiamante
-- TypeScript che lo passa per nome. Quei chiamanti spariscono con il codice
-- della fase 50, che va in produzione PRIMA di questa migration (D-50-24):
-- finche' esistono devono poter chiamare senza errore. Il parametro resta nella
-- firma, non muove piu' niente, e questo commento e' la ragione.
--
-- **`status_before` e `status_after` diventano NULL**, e non `p_status`. La
-- migration che ha creato il registro lo dice gia': *«lascia la coppia dello
-- stato nulla quando lo stato non si e' mosso»* (`20260808002000:245`). Dopo
-- questa fase lo stato **non si muove mai**, perche' non esiste. Scriverci
-- `'approved'` significherebbe incidere nel registro una prova su un asse che
-- non c'e': le due colonne restano `text` nude — *prova di cio' che era vero
-- allora* — e le righe storiche restano leggibili, intatte.

CREATE OR REPLACE FUNCTION public.record_membership_act(
  p_subject_id  uuid,
  p_act         text,
  p_actor_id    uuid,
  p_actor_kind  text,
  p_role        text default null,
  p_status      text default null,
  p_note        text default null,
  p_party_id    uuid default null
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_subject record;
  v_act_id  uuid;
BEGIN
  -- Blocca e legge il soggetto com'e' ORA. `for update` e non una select
  -- semplice: i valori «prima» scritti nel registro devono essere quelli che
  -- questo statement sta per sovrascrivere.
  SELECT p.role, p.membership_code
    INTO v_subject
    FROM public.profiles p
   WHERE p.id = p_subject_id
     FOR UPDATE;

  IF NOT FOUND THEN
    -- Il messaggio nomina l'IDENTIFICATIVO del soggetto e nient'altro. Mai
    -- l'indirizzo, mai il nome: un messaggio sollevato raggiunge un log, e su
    -- questo progetto un log raggiunge uno screenshot.
    RAISE EXCEPTION 'membership_acts.subject_not_found: %', p_subject_id
      USING ERRCODE = 'no_data_found';
  END IF;

  -- La scrittura sul profilo, quando l'atto muove l'asse. **Un asse solo, ora:
  -- il ruolo.** `p_status` non muove niente — vedi il paragrafo sopra — quindi
  -- un atto che portasse solo uno stato non scrive nulla sul profilo e lascia
  -- comunque la sua riga nel registro, che e' il comportamento corretto: l'atto
  -- e' successo, l'asse che pretendeva di muovere non esiste.
  IF p_role IS NOT NULL THEN
    UPDATE public.profiles
       SET role = p_role
     WHERE id = p_subject_id;
  END IF;

  -- La riga di registro: il valore «prima» appena letto, quello «dopo» appena
  -- scritto, l'autore, la sua natura, e il codice di membership del soggetto
  -- come etichetta che gli sopravvive.
  INSERT INTO public.membership_acts (
    act, subject_id, subject_label,
    actor_id, actor_kind,
    role_before, role_after, status_before, status_after,
    party_id, note
  ) VALUES (
    p_act, p_subject_id, v_subject.membership_code,
    p_actor_id, p_actor_kind,
    v_subject.role, coalesce(p_role, v_subject.role),
    NULL, NULL,
    p_party_id, p_note
  )
  RETURNING id INTO v_act_id;

  RETURN v_act_id;
END;
$$;

-- ── 3d. `public.reconcile_master(text)` — la distinzione si COLLASSA ────────
--
-- Prima aveva due rami: *promosso* (il ruolo si muove) e *approvato* (lo stato
-- si muove). **Dopo questa fase ha un ramo solo**, perche' il secondo asse non
-- esiste — e il collasso e' dichiarato qui invece di essere dedotto da chi
-- leggera' un `IF` senza `ELSIF`.
--
-- Cio' che NON cambia, e che e' la ragione per cui questa funzione esiste:
-- l'ordine (promuovere prima, declassare dopo), la guardia sullo zero-master, la
-- risoluzione ambigua che RIFIUTA invece di scegliere, e il declassamento a
-- `member` che passa dal registro invece che intorno.

CREATE OR REPLACE FUNCTION public.reconcile_master(p_email text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_email     text;
  v_matches   int;
  v_target    record;
  v_act       text;
  v_promoted  boolean := false;
  v_others    uuid[];
  v_other     uuid;
  v_demoted   int := 0;
  v_masters   int;
BEGIN
  -- 1. Non impostata o malformata: NON fare niente, e dire quale delle due.
  v_email := lower(trim(coalesce(p_email, '')));

  IF v_email = '' THEN
    RETURN jsonb_build_object('outcome', 'unset', 'promoted', false, 'demoted', 0);
  END IF;

  IF position('@' IN v_email) = 0 THEN
    RETURN jsonb_build_object('outcome', 'malformed', 'promoted', false, 'demoted', 0);
  END IF;

  -- 2. Risolve l'account nominato, `lower(trim(...))` su ENTRAMBI i lati.
  --
  -- IL CONTEGGIO VIENE PRIMA, e non e' programmazione difensiva:
  -- `public.profiles.email` non porta alcun vincolo di unicita'
  -- (`schema.sql:56`, e `.planning/todos/pending/profiles-email-not-unique.md`).
  -- Con due righe corrispondenti un `LIMIT 1` ne sceglierebbe una a caso, la
  -- promuoverebbe e DECLASSEREBBE L'ALTRA — che potrebbe essere il master in
  -- carica. Una configurazione ambigua deve rifiutare di agire, non scegliere.
  SELECT count(*) INTO v_matches
    FROM public.profiles p
   WHERE lower(trim(p.email)) = v_email;

  IF v_matches = 0 THEN
    -- Il master in carica TIENE il ruolo: declassare prima che il nuovo master
    -- esista e' il lockout, non la riparazione.
    RETURN jsonb_build_object('outcome', 'no_such_account', 'promoted', false, 'demoted', 0);
  END IF;

  IF v_matches > 1 THEN
    RETURN jsonb_build_object('outcome', 'ambiguous', 'promoted', false, 'demoted', 0);
  END IF;

  SELECT p.id, p.role
    INTO v_target
    FROM public.profiles p
   WHERE lower(trim(p.email)) = v_email;

  -- 3. Promuove l'account nominato, se e solo se non e' gia' li'.
  --
  -- UN ASSE SOLO, DA QUESTA FASE IN POI. Il ramo `ELSIF v_target.status IS
  -- DISTINCT FROM 'approved' THEN v_act := 'approved'` **non esiste piu'**: non
  -- c'e' un secondo asse da riparare, quindi non c'e' una riparazione di stato
  -- da chiamare con un nome diverso. L'atto `'approved'` resta nel vocabolario
  -- del registro perche' le righe storiche lo portano; nessuno lo scrive piu'.
  IF v_target.role IS DISTINCT FROM 'master' THEN
    v_act := 'promoted';
  ELSE
    v_act := NULL;   -- lo stato stazionario, e il caso comune a ogni login
  END IF;

  IF v_act IS NOT NULL THEN
    -- Attraverso lo scrittore del registro, mai intorno: la scrittura sul
    -- profilo e la sua riga di registro sono una transazione sola.
    PERFORM public.record_membership_act(
      p_subject_id => v_target.id,
      p_act        => v_act,
      p_actor_id   => NULL,
      p_actor_kind => 'system',
      p_role       => 'master',
      p_status     => NULL,
      p_note       => 'reconciliation from the deployment environment (D-12)',
      p_party_id   => NULL
    );
    v_promoted := true;
  END IF;

  -- 4. Declassa ogni ALTRO account che tiene `master`.
  --
  -- Raggiunto solo quando l'account nominato tiene gia' `master`. QUELL'ORDINE
  -- e' la difesa principale contro lo stato senza master, e il passo 5 e'
  -- l'asserzione che l'ordine ha retto.
  SELECT array_agg(p.id)
    INTO v_others
    FROM public.profiles p
   WHERE p.role = 'master'
     AND p.id <> v_target.id;

  FOREACH v_other IN ARRAY coalesce(v_others, '{}'::uuid[]) LOOP
    -- `member`, e non `staff`. Declassare a `staff` non comprerebbe niente.
    PERFORM public.record_membership_act(
      p_subject_id => v_other,
      p_act        => 'demoted',
      p_actor_id   => NULL,
      p_actor_kind => 'system',
      p_role       => 'member',
      p_status     => NULL,
      p_note       => 'reconciliation from the deployment environment (D-12)',
      p_party_id   => NULL
    );
    v_demoted := v_demoted + 1;
  END LOOP;

  -- 5. La guardia sullo zero-master, controllata PRIMA che questa chiamata
  --    committi, non dopo. Un `RAISE` dentro una funzione annulla l'intera
  --    chiamata, promozione e righe di registro comprese.
  --
  --    Cosi' com'e' scritta, questa guardia NON PUO' SCATTARE: il passo 3 lascia
  --    l'account nominato con `master` e il passo 4 lo esclude per id. E' un
  --    filo teso su una MODIFICA FUTURA — invertire i passi 3 e 4, o allargare
  --    il predicato del ciclo, rende il conteggio raggiungibile, e a quel punto
  --    questa riga solleva invece di consegnare un prodotto senza
  --    amministratore.
  SELECT count(*) INTO v_masters
    FROM public.profiles p
   WHERE p.role = 'master';

  IF v_masters < 1 THEN
    RAISE EXCEPTION 'reconcile_master.zero_masters: the reconciliation would leave this product with no master'
      USING ERRCODE = 'RS001';
  END IF;

  RETURN jsonb_build_object(
    'outcome',  CASE WHEN v_promoted OR v_demoted > 0 THEN 'reconciled' ELSE 'unchanged' END,
    'promoted', v_promoted,
    'demoted',  v_demoted,
    'masters',  v_masters
  );
END;
$$;

-- ── 3e. `public.handle_new_user()` — via lo stato, via il referral ─────────
--
-- Perde `new_status`, `new_approved_via`, `referrer_id`, `ref_code` e **l'intero
-- ramo del referral** (D-50-08, REG-03).
--
-- **L'ORDINE DELLE SCRITTURE NON SI INVERTE** (D-50-07). L'`UPDATE` di
-- `guest_list_entries` resta DOPO l'`INSERT` del profilo: e' la riparazione
-- dell'8 settembre (`20260908120000`), e prima di quella correzione chiunque
-- avesse la mail in una guest list `pending`/`invited` **non poteva creare un
-- account**, perche' `guest_list_entries.profile_id` e' una chiave esterna verso
-- un profilo che ancora non esisteva (`23503`). Chi e' invitato da guest list
-- continua a ricevere il proprio account leggero **solo** perche' quella
-- marcatura passa dopo.
--
-- **IL RUOLO NON SI LEGGE DAI METADATI, E NON E' UNA DIMENTICANZA.** D-50-08
-- dice *«il trigger resta solo per creare il profilo con il ruolo che arriva dai
-- metadati»*; il trigger **non lo ha mai fatto** (§0/C8) e non impara a farlo
-- qui. Il ruolo lo scrive `createAccount` dopo, passando da `record_membership_act`
-- (`members/actions.ts:2487-2493`). Aggiungerlo al trigger creerebbe un modo
-- nuovo di ottenere un ruolo passando dai metadati di `createUser`, cioe' una
-- primitiva di escalation su un percorso che nessuna policy guarda:
-- `access-gating.md`, gate *escalation privilegi*. **Deliberatamente non fatto.**
--
-- **NESSUN `LIMIT 1` NUOVO SU `public.profiles` CERCATO PER INDIRIZZO.** Il
-- `SELECT … INTO guest_list_match … LIMIT 1` che resta e' su
-- `guest_list_entries`, dove la mail non e' una chiave d'identita'. Su
-- `public.profiles` la mail **non e' unica** (`schema.sql:56`, todo
-- `.planning/todos/pending/profiles-email-not-unique.md`), e il `SELECT` che la
-- interrogava — quello del referrer — se ne va con il referral.
--
-- Il conio del codice e' quello indurito a fine fase 49: `extensions.gen_random_bytes`,
-- alfabeto di 32 caratteri per 10 posizioni, cinque tentativi sulla SOLA
-- collisione della chiave unica, ogni altra violazione rilanciata com'e'. E'
-- riportato qui identico perche' ridefinire una funzione significa riscriverne
-- il corpo per intero — **non e' cambiato niente**.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  new_code text;
  chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  guest_list_match uuid;
  v_bytes bytea;
  v_attempt int;
  v_conname text;
  v_inserted boolean := false;
BEGIN
  -- (1) La sola domanda rimasta prima di scrivere: questa mail e' in una voce
  -- di guest list ancora da registrare? Nessuna scrittura qui.
  --
  -- Il ramo con `guest_list_event_id` nei metadati non passa di qui e non lo
  -- faceva nemmeno prima: chi arriva per invito diretto non ha una voce da
  -- marcare per indirizzo.
  IF (new.raw_user_meta_data->>'guest_list_event_id') IS NULL THEN
    SELECT id INTO guest_list_match
    FROM public.guest_list_entries
    WHERE LOWER(email) = LOWER(new.email) AND status IN ('pending', 'invited')
    LIMIT 1;
  END IF;

  -- (2) Il profilo. `role` e' CABLATO a 'member': vedi il paragrafo sopra.
  FOR v_attempt IN 1..5 LOOP
    v_bytes := extensions.gen_random_bytes(10);
    new_code := 'RSN-';
    FOR i IN 1..10 LOOP
      new_code := new_code || substr(chars, (get_byte(v_bytes, i - 1) % 32) + 1, 1);
    END LOOP;

    IF EXISTS (SELECT 1 FROM public.profiles WHERE membership_code = new_code) THEN
      CONTINUE;
    END IF;

    BEGIN
      INSERT INTO public.profiles (id, email, full_name, membership_code, role)
      VALUES (
        new.id,
        new.email,
        coalesce(new.raw_user_meta_data->>'full_name', ''),
        new_code,
        'member'
      );
      v_inserted := true;
      EXIT;
    EXCEPTION WHEN unique_violation THEN
      GET STACKED DIAGNOSTICS v_conname = CONSTRAINT_NAME;
      IF v_conname IS DISTINCT FROM 'profiles_membership_code_key' THEN
        RAISE;
      END IF;
    END;
  END LOOP;

  IF NOT v_inserted THEN
    RAISE EXCEPTION 'membership_code_collision_after_5_attempts'
      USING HINT = 'Cinque codici da 50 bit collisi di seguito: e'' un evento che a questa scala non accade per caso. Guardare il generatore, non la fortuna.';
  END IF;

  -- (3) Adesso il profilo esiste, e la chiave esterna ha un bersaglio.
  IF guest_list_match IS NOT NULL THEN
    UPDATE public.guest_list_entries
    SET status = 'registered', profile_id = new.id, updated_at = now()
    WHERE id = guest_list_match;
  END IF;

  RETURN new;
END;
$$;

COMMENT ON FUNCTION public.handle_new_user() IS
  'Conia public.profiles.membership_code — una credenziale della porta — con extensions.gen_random_bytes (pgcrypto 1.3, CSPRNG OpenSSL). Alfabeto ABCDEFGHJKLMNPQRSTUVWXYZ23456789 (32 caratteri) x 10 = 2^50. Ritenta fino a 5 volte sulla sola collisione di profiles_membership_code_key, rilanciando ogni altra violazione. 2026-09-08 (P-CODE-4): la voce di guest_list_entries si marca registered DOPO l''inserimento del profilo, perche'' profile_id e'' una chiave esterna verso profiles — l''ordine NON si inverte. 2026-09-21 (fase 50, D-50-08/D-50-09): via lo stato, via approved_via e via l''intero ramo del referral. Il ruolo resta CABLATO a member e non si legge dai metadati di createUser: lo scrive createAccount dopo, passando dal registro.';


-- ===========================================================================
-- 4. Il registro guadagna il suo atto di cancellazione (D-50-16)
-- ===========================================================================
--
-- D-50-16: togliere l'accesso a qualcuno significa **cancellare l'account**, e
-- una cancellazione senza traccia contraddice `community-membership.md`, gate
-- *chi decide e' tracciato*. Il registro e' `append-only`
-- (`20260808005000`) e `subject_id … ON DELETE SET NULL` (`20260808002000:188`):
-- la riga **sopravvive al soggetto**, con `subject_id` a `NULL` per costruzione
-- e `subject_label` che porta **il codice di membership — mai un indirizzo e mai
-- un nome**. E' gia' la regola scritta in quella migration, e vale identica per
-- l'atto nuovo.
--
-- **DIECI VALORI, NON OTTO.** `50-RESEARCH.md` §1.6 dice *«il `CHECK` porta
-- ancora i sette valori»*, letto da `20260808002000:174-183`. Il vincolo
-- **applicato**, riletto con `pg_get_constraintdef` il 2026-09-21, ne porta
-- **nove**: i sette piu' `'assigned'` e `'unassigned'`, aggiunti da
-- `20260809002000_assignment_acts.sql`. Ricrearlo con otto valori avrebbe
-- **tolto dal vocabolario due atti** — e su un registro append-only un valore
-- tolto e' una storia che non si puo' piu' scrivere, oltre che un `23514` sulle
-- righe che gia' lo portano. Nove piu' `'deleted'` fa dieci.
--
-- Allargare un `CHECK` e' additivo: non puo' fallire sui dati esistenti.

ALTER TABLE public.membership_acts
  DROP CONSTRAINT IF EXISTS membership_acts_act_check;

ALTER TABLE public.membership_acts
  ADD CONSTRAINT membership_acts_act_check
  CHECK (act = ANY (ARRAY[
    'created'::text,
    'approved'::text,
    'rejected'::text,
    'promoted'::text,
    'demoted'::text,
    'deactivated'::text,
    'reactivated'::text,
    'assigned'::text,
    'unassigned'::text,
    'deleted'::text
  ]));

COMMENT ON CONSTRAINT membership_acts_act_check ON public.membership_acts IS
  'Dieci atti. I sette del registro originale (20260808002000), i due delle assegnazioni (20260809002000) e deleted, aggiunto dalla fase 50 (D-50-16): togliere l''accesso a qualcuno significa cancellare l''account, e una cancellazione lascia la sua riga. subject_id va a NULL per costruzione (ON DELETE SET NULL) e subject_label porta il codice di membership, mai un indirizzo e mai un nome. approved, rejected, deactivated e reactivated restano nel vocabolario perche'' le righe storiche li portano: nessuno li scrive piu''.';


-- ===========================================================================
-- 5. Le cancellazioni, per ultime
-- ===========================================================================

-- ── 5a. `public.get_user_status()` ────────────────────────────────────────
--
-- `plpgsql`, quindi nessuna dipendenza dichiarata: il `DROP COLUMN` sarebbe
-- riuscito lasciandola viva e rotta. Il suo unico lettore era la policy di
-- quarantena della sezione 2, gia' sostituita.

DROP FUNCTION IF EXISTS public.get_user_status();

-- ── 5b. `membership.active`: via le CONCESSIONI, resta la chiave ───────────
--
-- Senza `requires_approved` questa chiave diventerebbe *«ha un profilo»*, cioe'
-- qualunque account, compreso l'account leggero di chi ha solo comprato un
-- biglietto. I suoi due lettori di policy spariscono in questo stesso file —
-- `event_media_insert_member` riscritta (1b), `rsvps_insert_approved` droppata
-- (1c) — quindi la chiave resta **senza lettori di policy**, e le quattro
-- concessioni si cancellano: nessun ruolo la tiene piu', e REG-05 si chiude in
-- modo strutturale invece che testuale.
--
-- **LA CHIAVE, PERO', RESTA NEL CATALOGO, E LA RAGIONE E' D-50-28.**
-- `scripts/verify-capabilities.mjs` confronta `private.capabilities` con
-- l'oggetto `CAP` di `src/lib/capabilities/keys.ts` in entrambe le direzioni
-- (controlli 0, 1 e 3). Cancellare la riga qui, mentre `CAP.MEMBERSHIP_ACTIVE`
-- vive ancora in TypeScript e `capability-routes.ts` ne dichiara la voce,
-- renderebbe quel gate **rosso** fino al piano che tocca il codice — e *un gate
-- rosso lasciato indietro e' un gate che nessuno rilancia*. La riga di catalogo
-- e la costante TypeScript si tolgono nello stesso commit, nel piano che smonta
-- le superfici. Registrato in `deferred-items.md`.
--
-- **IL `DO` CHE CONTROLLA PRIMA DI CANCELLARE.** Una `DELETE` su un catalogo di
-- permessi che non verifica di essere l'ultima e' una `DELETE` che si scopre in
-- produzione. Questo blocco rilegge `pg_policies` — cioe' cio' che sta girando,
-- non cio' che questo file crede di aver scritto — e **solleva** se una qualsiasi
-- policy nomina ancora la chiave.

DO $$
DECLARE
  v_lettori text;
BEGIN
  SELECT string_agg(schemaname || '.' || tablename || '.' || policyname, ', ')
    INTO v_lettori
    FROM pg_policies
   WHERE coalesce(qual, '') || coalesce(with_check, '') LIKE '%membership.active%';

  IF v_lettori IS NOT NULL THEN
    RAISE EXCEPTION
      'membership.active ha ancora lettori di policy: %', v_lettori
      USING HINT = 'Le concessioni non si cancellano finche'' una policy le legge: la cancellazione trasformerebbe quelle policy in un rifiuto silenzioso e permanente.';
  END IF;
END;
$$;

DELETE FROM private.role_capabilities WHERE capability = 'membership.active';

COMMENT ON TABLE private.role_capabilities IS
  'Le concessioni per ruolo. Fase 50: la colonna requires_approved e'' stata rimossa insieme a profiles.status — una chiave si tiene o non si tiene, senza un secondo asse. Le quattro concessioni di membership.active sono state cancellate nella stessa migration: la chiave resta nel catalogo finche'' CAP.MEMBERSHIP_ACTIVE vive in src/lib/capabilities/keys.ts, e le due se ne vanno insieme (D-50-28).';

-- ── 5c. Il flag, e poi le tre colonne ─────────────────────────────────────
--
-- `requires_approved` esce per ultimo fra gli oggetti del modello delle
-- capability: il suo unico lettore era l'arm 1 di `has_capability`, ridefinito
-- alla sezione 3a. Riletto dal catalogo il 2026-09-21: nessun'altra funzione lo
-- nomina, nessuna policy, nessuna vista, nessun indice.

ALTER TABLE private.role_capabilities DROP COLUMN IF EXISTS requires_approved;

-- E queste sono le tre righe per cui esiste tutto il resto del file.
--
-- `status` e' `text NOT NULL DEFAULT 'approved'`; `referred_by` e' un `uuid`
-- verso `public.profiles(id)` `ON DELETE SET NULL`, valorizzato su **zero**
-- profili in entrambi i database (misurato il 2026-09-21, M6); `approved_via`
-- e' un `text` nullabile. Nessun indice li copre, nessuna vista li legge.
--
-- **IRREVERSIBILE, e questo repository non ha PITR.** Per questo la stessa
-- migration e' stata applicata prima al laboratorio, con la procedura scritta,
-- e in produzione entra sotto un'autorizzazione datata a parte — **dopo** il
-- deploy del codice.

ALTER TABLE public.profiles DROP COLUMN IF EXISTS status;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS referred_by;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS approved_via;
