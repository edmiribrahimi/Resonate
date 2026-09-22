-- ═══════════════════════════════════════════════════════════════════════════
-- Via il codice socio, il registro prende il nome degli account, e le presenze
-- escono dallo schema
--
-- Fase 51 «Via le superfici da socio e la porta» — MEM-01, MEM-02.
-- Decisioni: D-51-02 (via `profiles.membership_code`), D-51-08 (il registro si
-- chiama `account_acts`), D-51-14 (via `public.attendances`), D-51-15
-- (`subject_label` porta le prime 8 cifre dell'identificativo del soggetto).
--
-- ── IL VERSO DEL DEPLOY: CODICE PRIMA, QUESTA MIGRATION SUBITO DOPO ────────
--
-- **NON APPLICARE QUESTA MIGRATION PRIMA DEL DEPLOY DEL CODICE DELLA FASE 51.**
--
-- Questo file rinomina una funzione e una tabella che il codice di prodotto
-- chiama **per nome**, e toglie una colonna che il codice ha gia' smesso di
-- leggere (piani 51-09 e 51-11). Un rinomina ha una finestra su **entrambi** i
-- lati, e l'asimmetria e' la DURATA, non il genere del guasto:
--
--   * **applicarla PRIMA del deploy** lascia in produzione un codice che chiama
--     ancora lo scrittore col nome vecchio e legge il registro col nome vecchio:
--     dalla sezione 4 in poi ne' l'uno ne' l'altro esistono, quindi `42883` e
--     `42P01` **per tutta la durata del deploy** — e su quel percorso c'e' la
--     creazione degli account;
--   * **applicarla SUBITO DOPO** apre la finestra opposta: il codice gia' spinto
--     chiama `public.record_account_act` e legge `public.account_acts`, che non
--     esistono ancora. Stessi due codici, ma per il tempo fra **due passi
--     consecutivi dello stesso atto autorizzato** (piano 51-13), su un progetto
--     che in quella finestra non ha serate in vendita.
--
-- Fra una finestra lunga quanto un deploy e una lunga quanto due passi si
-- sceglie la seconda, e la si scrive qui invece di lasciarla scoprire a chi apre
-- la coda a meta'. E' lo stesso criterio di
-- `20260809006000_event_media_server_upload_only.sql` — *«fra un peggioramento
-- temporaneo e uno stato invariato si sceglie lo stato invariato»* — applicato
-- a due peggioramenti temporanei, dove il criterio diventa: il piu' corto.
--
-- **Sulla colonna il verso e' gia' scontato.** Tre banchi
-- (`scripts/rls-baseline.mjs`, `scripts/container/seed.mjs`,
-- `scripts/seed-lab-door.mjs`) hanno smesso di nominarla nei propri `insert`
-- con il piano 51-11, e oggi prendono `23502`, perche' la colonna e'
-- `text UNIQUE NOT NULL` **senza default**. Questa migration e' cio' che li
-- rende di nuovo validi: non c'e' una forma che vada bene a entrambi gli schemi.
--
-- ── E UN'ECCEZIONE DENTRO L'ECCEZIONE: LO SCRITTORE STA IN QUESTO FILE ─────
--
-- Lo scrittore del registro e' `plpgsql`, legge `p.membership_code` in un
-- `SELECT … FOR UPDATE` e lo incide in `subject_label`, che e' `NOT NULL`.
-- **Misurato sul laboratorio il 2026-09-22 alle 13:37:57Z**, non ricordato:
-- `pg_depend` sul `refobjsubid` di quella colonna porta **una sola** dipendenza
-- registrata, il vincolo `UNIQUE`. Nessuna vista, nessuna colonna generata,
-- nessuna regola di riscrittura.
--
-- Cioe': `ALTER TABLE … DROP COLUMN` da solo **RIESCE**, si porta via il vincolo
-- e il suo indice, e **lascia rotto in silenzio** lo scrittore — e con lui la
-- creazione degli account, che e' l'unico modo di creare un account di lavoro, e
-- `reconcile_master`, che gira a ogni deploy. La fase 50 ha pagato esattamente
-- questo errore e l'ha scritto dentro il proprio file
-- (`20260921120000:104-113`). Per questo la ridefinizione dello scrittore e il
-- `DROP COLUMN` stanno nello stesso file e nella stessa transazione. Una
-- migration sola, una transazione sola.
--
-- ── UNA TRANSAZIONE SOLA, E NON C'E' `BEGIN;` PERCHE' NON SERVE ────────────
--
-- **Misurato sul laboratorio il 2026-09-21 alle 12:35:43Z dalla fase 50, e non
-- rimisurato qui perche' la misura e' dell'ENDPOINT, non del file.**
-- `POST /v1/projects/{ref}/database/migrations` avvolge il corpo in UNA
-- transazione da solo: una sonda con `create table private._tx_probe(x int)`
-- seguita da `select 1/0` e' tornata `400 … division by zero`, e subito dopo
-- `to_regclass('private._tx_probe')` era **null** — la tabella non e'
-- sopravvissuta allo statement fallito. Un `BEGIN;` esplicito qui produrrebbe
-- `WARNING: there is already a transaction in progress` e un `COMMIT` che chiude
-- a meta' la transazione dell'endpoint. Nessuna migration della fase 49, della
-- 50 e della 51 lo porta. Neanche questa.
--
-- ── I CORPI NOMINANO GIA' GLI OGGETTI COME SI CHIAMERANNO ALLA FINE ────────
--
-- Le sezioni 1, 2 e 3 scrivono `INSERT INTO public.account_acts` e
-- `PERFORM public.record_account_act(…)` **prima** che le sezioni 4 e 5 creino
-- quei due nomi. Funziona, e non per fortuna: un corpo `plpgsql` non viene
-- risolto per nome alla creazione — e' **la stessa proprieta'** che rende
-- possibile il guasto silenzioso del paragrafo qui sopra. Qui la si usa nel
-- verso utile: alla fine dell'unica transazione ogni nome esiste, e ogni corpo
-- nomina cio' che c'e'.
--
-- L'ordine inverso — rinominare prima, ridefinire dopo — funzionerebbe
-- altrettanto. Non e' quello scelto perche' `CREATE OR REPLACE` deve atterrare
-- sulla **firma identica** per conservare l'ACL, e tenere la riscrittura accanto
-- al nome che la funzione porta ancora e' cio' che rende quella firma verificabile
-- leggendo il file invece che ricordandolo.
--
-- ── SI APPLICA UNA VOLTA SOLA, E LO DICE INVECE DI FINGERE ────────────────
--
-- `supabase-data.md` (gate *idempotenza DDL*) chiede `IF EXISTS` / `IF NOT
-- EXISTS`, perche' una migration che fallisce alla seconda esecuzione blocca un
-- deploy in un momento scomodo. **Su un rinomina quella forma non esiste**:
-- PostgreSQL non ha `RENAME CONSTRAINT … IF EXISTS` ne' `ALTER POLICY … IF
-- EXISTS`, e la sezione 5 ne fa **otto** in fila.
--
-- Mettere `IF EXISTS` solo dove la sintassi lo permette produrrebbe il caso
-- peggiore, non il migliore: alla seconda esecuzione il rinomina della tabella
-- verrebbe **saltato in silenzio** e la riga dopo fallirebbe comunque, nominando
-- un vincolo su una tabella che non si chiama piu' cosi'. Un fallimento con la
-- causa sbagliata e' peggio di un fallimento con la causa giusta.
--
-- Quindi: le due cancellazioni — la colonna e la tabella — tengono `IF EXISTS`,
-- perche' li' la forma costa nulla e sono i due passi irreversibili; il rinomina
-- no, e **questo file si applica una volta**, il che e' esattamente cio' che
-- `POST /v1/projects/{ref}/database/migrations` registra nella history.
--
-- ── COSA QUESTA MIGRATION NON FA, E VA LETTO PRIMA DI CERCARLO ─────────────
--
--   * **Non cancella nemmeno una riga di `public.attendances`.** Le cancella
--     `scripts/purge-attendances.mjs`, per chiave primaria su una lista
--     catturata, con la sua istantanea e il suo contatore preso da una fonte
--     diversa (D-51-04). Il blocco `DO` della sezione 7 **rifiuta** il `DROP` se
--     la tabella non e' vuota: l'ordine e' meccanico, non ricordato. Un `DROP`
--     su una tabella piena cancellerebbe righe **che nessuno ha contato**.
--     Misurato il 2026-09-22 alle 13:42:29Z (laboratorio) e 13:42:35Z
--     (produzione): **zero righe su entrambi**, in entrambe le popolazioni —
--     `party_id` valorizzato e `party_id` nullo.
--   * **Non tocca `public.door_scan_events`**, e in particolare non stringe il
--     suo `CHECK` su `subject_type`: D-51-13 conserva `'membership'` come
--     **valore storico**, e sul laboratorio **una riga lo usa** (residuo della
--     corsa `P-50-8` del 2026-09-21, letto il 2026-09-22 alle 13:43:26Z). Il
--     registro delle convalide alla porta non si riscrive.
--   * **Non tocca `status_before` e `status_after`** del registro. Sono
--     sopravvissute alla fase 50 che ha tolto l'asse dello stato, sono `text`
--     nullabili, e **in produzione 2 righe su 2 le portano valorizzate**.
--     Tenerle come storia o toglierle e' una decisione da prendere con quel
--     numero davanti — non un effetto collaterale di un rinomina.
--   * **Non tocca il trigger `profiles_release_expired_assignments`**, che
--     scatta su `BEFORE UPDATE OF role` e scrive su `public.party_assignments`.
--     Questo file **non esegue alcun `UPDATE` del ruolo**, quindi qui quel
--     trigger non scatta mai. Lo scrive perche' non e' in nessun documento di
--     fase e si trova solo interrogando `pg_trigger`.
--   * **Non aggiunge un `CHECK` a `role_after`**, che continua a non averne uno.
--   * **Non rinomina la rotta `/admin/members/register` ne' il titolo visibile
--     della pagina.** Quella e' copy di una superficie, non un oggetto di
--     schema, e si decide dove si decidono quelle (piano 51-11).
--   * **Non riscrive nessuna riga del registro.** E' append-only e un rinomina
--     non tocca una riga: gli atti gia' incisi restano quelli, compresi quelli
--     che portano `role_before` con il valore di ruolo ritirato dal piano 51-08.
--     Un registro che si correggesse da solo non sarebbe un registro.
--   * **Non tocca la produzione.** Si applica **prima al laboratorio**, con la
--     procedura scritta (piano 51-12); in produzione entra sotto
--     un'autorizzazione datata a parte, dopo il deploy del codice (piano 51-13).
--
-- ── L'ORDINE DEI PASSI, CHE NON E' ESTETICO ───────────────────────────────
--
--   1. lo **scrittore** del registro, ridefinito su firma identica: via la
--      lettura della colonna, e `subject_label` calcolata (D-51-15);
--   2. `handle_new_user`, ridefinita PER INTERO senza il conio del codice —
--      e' il trigger che inserisce il profilo, e nomina la colonna in un
--      `INSERT`;
--   3. i **due chiamanti** dello scrittore, che il rinomina della sezione 4 non
--      seguirebbe da soli;
--   4. il rinomina della funzione, con `ALTER FUNCTION … RENAME TO`, che
--      conserva ACL e `SECURITY DEFINER` — `DROP` + `CREATE` no;
--   5. il rinomina della tabella e dei suoi **satelliti, uno per uno**;
--   6. il `DROP COLUMN`, in coda e con la propria dichiarazione;
--   7. la guardia sul vuoto, e il `DROP TABLE` della tabella delle presenze.
--
-- ── SETTE VINCOLI E TRE INDICI, NON DUE E DUE — E LA DECISIONE CHE NE SEGUE ─
--
-- `51-RESEARCH.md` §4.5 nomina **due** vincoli da rinominare. Il catalogo, letto
-- sul laboratorio il 2026-09-22 alle 13:36:10Z e 13:36:36Z, ne conta **sette**
-- col prefisso del nome vecchio — 3 `CHECK`, 3 chiavi esterne, 1 chiave
-- primaria — e **tre** indici, perche' il terzo e' quello della chiave primaria.
-- `ALTER TABLE … RENAME TO` **non ne muove nessuno**.
--
-- **La decisione, presa qui ed esplicitamente come `51-CATALOG.md` chiede: si
-- rinominano tutti e sette.** La ragione non e' funzionale — un vincolo col nome
-- vecchio continua a funzionare. E' di **leggibilita' del catalogo**: un residuo
-- col prefisso vecchio su una tabella che si chiama `account_acts` e' cio' che
-- una fase successiva ritrova credendo che la tabella di prima esista ancora. E'
-- lo stesso motivo per cui qui sotto si riscrive anche il `COMMENT ON TABLE`,
-- che oggi descrive per esteso un meccanismo nominando l'oggetto sbagliato.
--
-- L'indice della chiave primaria **segue il proprio vincolo**: rinominare il
-- vincolo rinomina anche il suo indice. Gli altri due indici non hanno un
-- vincolo e si rinominano per nome.
--
-- **L'ACL non si rifa'.** E' una colonna di `pg_class` (`relacl`), quindi
-- viaggia con la tabella: il `REVOKE INSERT, UPDATE, DELETE … FROM PUBLIC,
-- service_role` di `20260808005000` sopravvive al rinomina. Ma si **rilegge
-- dopo**, contro la linea di base scritta in `51-CATALOG.md` §2e — dove
-- `service_role` e' l'unico dei quattro beneficiari senza quei tre privilegi. Se
-- dopo il rinomina li avesse di nuovo, il registro avrebbe smesso di essere
-- append-only **senza che una riga di SQL lo dica**. E si rilegge da
-- `pg_class.relacl` con `aclexplode`, **non** da
-- `information_schema.role_table_grants`, che dal Management API e' **cieca**:
-- torna zero righe, e zero righe li' non significa «nessun privilegio».
-- ═══════════════════════════════════════════════════════════════════════════


-- ===========================================================================
-- 1. Lo scrittore del registro — via la colonna, dentro l'etichetta
-- ===========================================================================
--
-- `CREATE OR REPLACE` su **firma identica**: conserva l'ACL — e questa funzione
-- ha `EXECUTE` revocato a `public`, `anon` e `authenticated` e concesso al solo
-- `service_role`. Non conserva invece `SECURITY DEFINER` ne' `proconfig`, che
-- sono riscritti qui sopra a mano, riga per riga.
--
-- Cambiano **due cose sole**, e nient'altro:
--
--   (a) il `SELECT … FOR UPDATE` non chiede piu' la colonna della credenziale;
--   (b) `subject_label` diventa **le prime 8 cifre dell'identificativo del
--       soggetto** (D-51-15), calcolate qui e non lato applicazione — o ci
--       sarebbero due modi di chiamare la stessa persona in due posti che devono
--       concordare.
--
-- **IL LIMITE DI QUELL'ETICHETTA, DICHIARATO INVECE CHE SCOPERTO.** Il codice
-- che c'era prima era una colonna di `public.profiles`: sopravviveva alla
-- cancellazione del soggetto, perche' il registro se ne teneva una copia. Le 8
-- cifre **non sopravvivono allo stesso modo**: sono un prefisso di
-- `subject_id`, e quando il soggetto viene cancellato `subject_id` diventa
-- nullo (`ON DELETE SET NULL`, D-50-16) mentre l'etichetta resta — quindi la
-- riga ricorda **un prefisso che non punta piu' a niente**. E' meno di prima, ed
-- e' il prezzo dichiarato di non tenere in giro una credenziale che nessuna
-- porta verifica piu' (D-51-02). La riga del registro resta, l'atto resta
-- attribuito, e cio' che si perde e' la possibilita' di ricongiungere due atti
-- dello stesso soggetto cancellato — cosa che gia' oggi `subject_id` nullo
-- impedisce.
--
-- Cio' che NON cambia, e che e' la ragione per cui questa funzione esiste: la
-- scrittura sul profilo e la sua riga di registro in **una sola transazione**,
-- il `SELECT … FOR UPDATE` che legge il «prima» che questo statement sta per
-- sovrascrivere, e il `RAISE EXCEPTION` che nomina **solo l'identificativo**.

CREATE OR REPLACE FUNCTION public.record_membership_act(
  p_subject_id  uuid,
  p_act         text,
  p_actor_id    uuid,
  p_actor_kind  text,
  p_role        text DEFAULT NULL,
  p_status      text DEFAULT NULL,
  p_note        text DEFAULT NULL,
  p_party_id    uuid DEFAULT NULL
)
RETURNS uuid
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
  --
  -- Un asse solo: il ruolo. La colonna della credenziale non si chiede piu'
  -- (D-51-02) e in questa stessa transazione, alla sezione 6, non esiste piu'.
  SELECT p.role
    INTO v_subject
    FROM public.profiles p
   WHERE p.id = p_subject_id
     FOR UPDATE;

  IF NOT FOUND THEN
    -- Il messaggio nomina l'IDENTIFICATIVO del soggetto e nient'altro. Mai
    -- l'indirizzo, mai il nome: un messaggio sollevato raggiunge un log, e su
    -- questo progetto un log raggiunge uno screenshot.
    --
    -- Il prefisso del messaggio cambia col nome della tabella; l'`ERRCODE` no,
    -- ed e' su quello che i chiamanti si diramano (`P0002`), mai sul testo.
    RAISE EXCEPTION 'account_acts.subject_not_found: %', p_subject_id
      USING ERRCODE = 'no_data_found';
  END IF;

  -- La scrittura sul profilo, quando l'atto muove l'asse. **Un asse solo: il
  -- ruolo.** `p_status` non muove niente — l'asse dello stato e' uscito con la
  -- fase 50 — quindi un atto che portasse solo uno stato non scrive nulla sul
  -- profilo e lascia comunque la sua riga nel registro, che e' il comportamento
  -- corretto: l'atto e' successo, l'asse che pretendeva di muovere non esiste.
  IF p_role IS NOT NULL THEN
    UPDATE public.profiles
       SET role = p_role
     WHERE id = p_subject_id;
  END IF;

  -- La riga di registro: il valore «prima» appena letto, quello «dopo» appena
  -- scritto, l'autore, la sua natura, e l'etichetta del soggetto — che dalla
  -- fase 51 e' un prefisso del suo identificativo, non una credenziale.
  --
  -- `left(p_subject_id::text, 8)` e non un cast troncato: `subject_label` e'
  -- `NOT NULL`, e a questo punto `p_subject_id` non puo' essere nullo, perche'
  -- il `SELECT … FOR UPDATE` qui sopra non avrebbe trovato nulla e la funzione
  -- avrebbe gia' sollevato.
  INSERT INTO public.account_acts (
    act, subject_id, subject_label,
    actor_id, actor_kind,
    role_before, role_after, status_before, status_after,
    party_id, note
  ) VALUES (
    p_act, p_subject_id, left(p_subject_id::text, 8),
    p_actor_id, p_actor_kind,
    v_subject.role, coalesce(p_role, v_subject.role),
    NULL, NULL,
    p_party_id, p_note
  )
  RETURNING id INTO v_act_id;

  RETURN v_act_id;
END;
$$;


-- ===========================================================================
-- 2. `handle_new_user()` — via il conio, per intero
-- ===========================================================================
--
-- E' il trigger `AFTER INSERT` su `auth.users`, ed e' l'unico generatore del
-- codice socio esistente: `extensions.gen_random_bytes(10)` su un alfabeto di
-- 32 caratteri, cinque tentativi sulla sola collisione di
-- `profiles_membership_code_key`. **Tutto quel meccanismo esce qui**, perche' la
-- colonna che riempiva esce alla sezione 6, e un `INSERT` che la nomina dopo
-- prenderebbe `42703` — cioe' **nessuno potrebbe piu' creare un account**.
--
-- **Il ciclo dei cinque tentativi esce con il motivo per cui esisteva.** Quel
-- `EXCEPTION WHEN unique_violation` ingoiava **una sola** violazione — quella
-- dell'indice della credenziale — e rilanciava ogni altra. Senza quella colonna
-- non c'e' collisione da ritentare, e ogni violazione di unicita' viaggia al
-- chiamante: che e' gia' cio' che faceva per tutte le altre.
--
-- Il ruolo resta **CABLATO** ad `attendee` (D-51-06, piano 51-08): non si legge
-- dai metadati di `createUser`, lo scrive `createAccount` dopo, passando dal
-- registro.
--
-- E l'ordine dei due passi **non si inverte** (P-CODE-4, 2026-09-08): la voce di
-- guest list si marca `registered` DOPO l'inserimento del profilo, perche'
-- `profile_id` e' una chiave esterna verso `public.profiles`.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  guest_list_match uuid;
BEGIN
  -- (1) La sola domanda prima di scrivere: questa mail e' in una voce di guest
  -- list ancora da registrare? Nessuna scrittura qui.
  --
  -- Il ramo con `guest_list_event_id` nei metadati non passa di qui: chi arriva
  -- per invito diretto non ha una voce da marcare per indirizzo.
  IF (new.raw_user_meta_data->>'guest_list_event_id') IS NULL THEN
    SELECT id INTO guest_list_match
    FROM public.guest_list_entries
    WHERE LOWER(email) = LOWER(new.email) AND status IN ('pending', 'invited')
    LIMIT 1;
  END IF;

  -- (2) Il profilo. Quattro colonne, non piu' cinque: la credenziale della porta
  -- non esiste piu' (D-51-02) e non c'e' piu' niente da coniare. `role` resta
  -- CABLATO ad `attendee` (D-51-06).
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    'attendee'
  );

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
  'Inserisce la riga di public.profiles alla creazione di un utente. 2026-09-08 (P-CODE-4): la voce di guest_list_entries si marca registered DOPO l''inserimento del profilo, '
  'perche'' profile_id e'' una chiave esterna verso profiles: l''ordine NON si inverte. '
  '2026-09-21 (fase 50, D-50-08/D-50-09): via lo stato, via approved_via e via l''intero ramo del referral. '
  '2026-09-22 (fase 51, D-51-06): il ruolo cablato e'' attendee, e resta CABLATO, non letto dai metadati di createUser: lo scrive createAccount dopo, passando dal registro. '
  '2026-09-22 (fase 51, D-51-02): via il conio della credenziale della porta, il suo alfabeto e i suoi cinque tentativi sulla collisione. La colonna che riempiva non esiste piu'', e nessuna porta la verificava.';


-- ===========================================================================
-- 3. I due chiamanti dello scrittore
-- ===========================================================================
--
-- **`ALTER FUNCTION … RENAME TO` non muove i suoi chiamanti**, e una `PERFORM`
-- su una funzione inesistente e' un errore a tempo di esecuzione che nessuno
-- vede finche' un organizer non crea un account o un deploy non passa.
--
-- I chiamanti sono **due**, letti dal catalogo il 2026-09-22 alle 13:35:42Z:
-- `reconcile_master(text)` con due siti, `record_party_assignment_act(…)` con
-- uno. Entrambi ridefiniti qui, nella stessa transazione del rinomina.
--
-- **I corpi sono quelli VIVI sul laboratorio, riletti da `pg_get_functiondef`
-- il 2026-09-22, non quelli delle migration storiche.** `CREATE OR REPLACE`
-- **sostituisce** il corpo per intero: ripartire da un corpo piu' vecchio
-- farebbe resuscitare cio' che una migration successiva aveva tolto — in
-- concreto, il letterale di ruolo che il piano 51-08 ha appena sostituito nel
-- ramo di retrocessione di `reconcile_master`. Cambia **solo** il nome dello
-- scrittore chiamato, e la prosa che lo nominava.

-- ── 3a. `record_party_assignment_act(…)` ──────────────────────────────────
CREATE OR REPLACE FUNCTION public.record_party_assignment_act(p_party_id uuid, p_subject_id uuid, p_capability text, p_act text, p_actor_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_assignee_role  text;
  v_ends_at        timestamptz;
  v_assignment_id  uuid;
BEGIN
  -- Only the two acts this register has words for. Any other value would reach
  -- `account_acts_act_check` and come back as a `23514` naming a constraint
  -- about the register, for a mistake that was made about the ARGUMENT — the
  -- right error for the wrong reader.
  IF p_act NOT IN ('assigned', 'unassigned') THEN
    RAISE EXCEPTION 'party_assignments.unknown_act: %', p_act
      USING ERRCODE = 'invalid_parameter_value';
  END IF;

  -- An unattributed grant or revocation is refused HERE, with its own name,
  -- rather than downstream. Without this it still fails — `assigned_by` is NOT
  -- NULL (`23502`), `party_assignments_revocation_paired` refuses a half
  -- revocation (`23514`), `account_acts_actor_attributed` refuses an
  -- authorless act (`23514`) — but it fails as three different codes depending
  -- on the branch, and a caller cannot branch on the CAUSE. D-11: an
  -- unattributed act is indistinguishable from an act whose author was simply
  -- not written.
  IF p_actor_id IS NULL THEN
    RAISE EXCEPTION 'party_assignments.actor_required: % %', p_party_id, p_subject_id
      USING ERRCODE = 'invalid_parameter_value';
  END IF;

  IF p_act = 'assigned' THEN

    -- ── 1. The subject, as they are IN THIS STATEMENT ──────────────────────
    --
    -- `FOR UPDATE` is not caution. `assignee_role` is a COPY of the role at the
    -- grant, and the composite foreign key
    -- `party_assignments_assignee_role_fk` checks that copy against the live
    -- row. Without the lock a concurrent demotion can land between this read
    -- and the insert, and the row would then carry a role its holder no longer
    -- has — which is D-A defeated by timing rather than by design.
    SELECT p.role
      INTO v_assignee_role
      FROM public.profiles p
     WHERE p.id = p_subject_id
       FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'party_assignments.subject_not_found: %', p_subject_id
        USING ERRCODE = 'no_data_found';
    END IF;

    -- ── 2. When the night is over — computed HERE, never sent by a client ───
    --
    -- A boundary supplied by the caller is a permission window chosen by
    -- whoever is being checked. This reads it from the night, through the one
    -- SQL implementation of the midnight rule
    -- (`20260809000000_party_assignments.sql`, section 1).
    --
    -- **BOTH COLUMNS COME FROM THE PARTY. THERE IS NO JOIN TO `public.events`,
    -- AND THAT IS THE POINT.** `public.events` also has a `date`, and reading
    -- the boundary from it is the obvious thing to write and is wrong:
    -- `20260226300000_multi_sub_events.sql:20-27` gave `public.event_parties`
    -- its OWN `date` and backfilled it from the parent, precisely so a
    -- sub-event can sit on a different calendar day from the event containing
    -- it. Measured against a container, the two readings diverge by exactly
    -- twenty-four hours on such a night — and the direction of that error is
    -- the UNSAFE one: an `ends_at` a day early is an assignment that expires
    -- BEFORE the night, which is a member of staff refused at the door in front
    -- of a queue (`CLAUDE.md`, operating principle 3, the worse of the two
    -- failures). Recorded as item 1 of
    -- `.planning/phases/35-per-night-assignments/deferred-items.md`, and the
    -- same expression is written out at section 3d of the migration above.
    --
    -- Every TypeScript call site already passes the PARTY's date —
    -- `review/page.tsx:164`, `checkin/route.ts:438`, `venue-reveal/route.ts:40`,
    -- `event-reminders/route.ts:40`, and every `menuCloseInstant`. This is the
    -- SQL half of that same rule; fed the other column the two halves answer
    -- different questions while looking identical.
    --
    -- THE FALLBACK IS NOT AN INVENTED DEFAULT. `event_parties.end_time` is
    -- nullable (`20260225150000_party_architecture.sql:16`), and `'06:00'` is
    -- the DECLARED close of a night in this product — it runs 22:00 → 06:00 —
    -- the same literal `review/page.tsx:164` uses on the TypeScript side. Its
    -- error direction is the safe one: a window slightly too wide admits;
    -- a window too narrow refuses.
    SELECT public.party_end_instant(ep.date, coalesce(ep.end_time, '06:00'::time))
      INTO v_ends_at
      FROM public.event_parties ep
     WHERE ep.id = p_party_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'party_assignments.party_not_found: %', p_party_id
        USING ERRCODE = 'no_data_found';
    END IF;

    -- ── 3. The row ─────────────────────────────────────────────────────────
    --
    -- **NO `ON CONFLICT`, deliberately.** The partial unique index
    -- `party_assignments_live_unique` must REFUSE a second live assignment of
    -- the same capability on the same night to the same person, with `23505`,
    -- and the caller branches on that code. Swallowing it with a `DO NOTHING`
    -- would return success for an operation that did not happen, and the
    -- surface would show a grant that is somebody else's.
    --
    -- The other refusals are NOT caught either, and travel to the caller
    -- intact: `23514` from `party_assignments_no_self_grant` (nobody assigns to
    -- themselves — ASSIGN-04) and from
    -- `party_assignments_capability_assignable`, `23503` from the composite
    -- `party_assignments_assignee_role_fk` (only a staff role may hold a live
    -- assignment — D-A). A caller branches on `error.code` and NEVER on a
    -- parsed message — Next redacts a Server Action's message in a production
    -- build — and never logs or returns `error.details`, which on these tables
    -- carries the ENTIRE failing row
    -- (`20260808001000_role_implies_approved.sql:194-201`).
    INSERT INTO public.party_assignments (
      party_id, user_id, capability, assignee_role, assigned_by, ends_at
    ) VALUES (
      p_party_id, p_subject_id, p_capability, v_assignee_role, p_actor_id, v_ends_at
    )
    RETURNING id INTO v_assignment_id;

  ELSE

    -- ── THE REVOCATION IS AN UPDATE. IT IS NEVER A DELETE. ─────────────────
    --
    -- ASSIGN-03: recorded rather than deleted. The reason is a question that
    -- gets asked AFTER the revocation and that a deleted row cannot answer:
    -- the offline drain arrives with a scan stamped `scannedAt` and asks *was
    -- this assignment live at that moment?* A revoked row answers — it carries
    -- `granted_at` and `revoked_at`. A deleted row does not, and the scan stays
    -- hanging: neither admitted nor refused, which is precisely the state the
    -- door cannot be left in.
    --
    -- Nulling `assignee_role` is what RELEASES the holder's role from the
    -- composite foreign key: with `MATCH SIMPLE` the key stops being checked
    -- the moment one of its columns is null, so after this the person can be
    -- demoted while the revoked row survives to prove the revocation happened.
    -- Without this line it looks like a forgotten field; it is the mechanism
    -- (`20260809000000_party_assignments.sql`, section 3b), and
    -- `party_assignments_live_role_present` refuses the row without it anyway.
    UPDATE public.party_assignments
       SET revoked_at    = now(),
           revoked_by    = p_actor_id,
           assignee_role = NULL
     WHERE party_id   = p_party_id
       AND user_id    = p_subject_id
       AND capability = p_capability
       AND revoked_at IS NULL
    RETURNING id INTO v_assignment_id;

    -- A revocation that found nothing to revoke is NOT a quiet success. It is
    -- the information that two people are looking at two different states —
    -- one of them at a screen showing an assignment that was already revoked,
    -- or revoked by somebody else a moment ago. Returning normally here would
    -- make that invisible, and there is no error tracking to catch it later.
    IF NOT FOUND THEN
      RAISE EXCEPTION 'party_assignments.no_live_assignment: % % %',
        p_party_id, p_subject_id, p_capability
        USING ERRCODE = 'no_data_found';
    END IF;

  END IF;

  -- ── THE ACT, IN THE SAME TRANSACTION AS THE ROW ABOVE ────────────────────
  --
  -- Both role/status arguments are NULL because an assignment moves NEITHER
  -- axis. That is what makes `record_account_act` skip its
  -- `public.profiles` write entirely (`20260808002000:437-442`): this function
  -- must not change who somebody IS, and passing a role here is the one way it
  -- could.
  --
  -- ── WHAT THAT DOES **NOT** MEAN, MEASURED RATHER THAN ASSUMED ────────────
  --
  -- It does not leave the four register columns null. The shared writer
  -- computes them itself — `role_before = v_subject.role`,
  -- `role_after = coalesce(p_role, v_subject.role)`
  -- (`20260808002000:459-460`) — so on an assignment act all four come out
  -- NON-NULL and equal: before == after, on both axes. Measured against a
  -- container; the opposite was written here first, and was wrong.
  --
  -- **`before == after` is this register's way of saying an act moved neither
  -- axis, and for an assignment that is the true statement, told in the shape
  -- the writer produces.** The nullability described at
  -- `20260808002000:244-246` is a property of the COLUMNS, not of any row this
  -- writer emits; no act recorded through it has ever left them null, and that
  -- divergence predates this file and is not repaired by it (an applied
  -- migration is not edited — `supabase-data.md`, gate *migration in avanti*).
  --
  -- And the by-product is worth naming, because a later reader will need it:
  -- `role_before` on the `assigned` act **preserves the role its holder held at
  -- the grant** — which is precisely the fact `party_assignments.assignee_role`
  -- is nulled out of on revocation, and which
  -- `20260809000000_party_assignments.sql` declared as the accepted price of
  -- the composite-key mechanism. The price is paid on the operational table and
  -- refunded here. That is what having a register instead of a second column
  -- is for.
  --
  -- `p_note` is NULL because a note about an assignment could only name a
  -- person, and this register speaks in identifiers: since D-51-15 its
  -- `subject_label` is the first 8 digits of the subject own id, and no
  -- column of it could hold a name.
  --
  -- `'user'` and never `'system'`: an assignment always has a human author.
  -- The null-actor guard at the top is what makes that statement enforceable
  -- rather than hopeful.
  PERFORM public.record_account_act(
    p_subject_id,   -- p_subject_id
    p_act,          -- p_act: 'assigned' or 'unassigned'
    p_actor_id,     -- p_actor_id
    'user',         -- p_actor_kind
    NULL,           -- p_role
    NULL,           -- p_status
    NULL,           -- p_note
    p_party_id      -- p_party_id — the column D-18 was rewritten for
  );

  RETURN v_assignment_id;
END;
$$;

-- ── 3b. `reconcile_master(text)` — gira a ogni deploy ─────────────────────
--
-- Due siti di chiamata, non uno: il ramo di promozione e quello di
-- retrocessione. Il corpo e' quello che il piano 51-08 ha lasciato — il
-- letterale di ruolo del ramo di retrocessione e' gia' quello nuovo — e qui
-- cambia solo il nome dello scrittore.

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
  -- `public.profiles.email` non porta alcun vincolo di unicita'. Con due righe
  -- corrispondenti un `LIMIT 1` ne sceglierebbe una a caso, la promuoverebbe e
  -- DECLASSEREBBE L'ALTRA — che potrebbe essere il master in carica. Una
  -- configurazione ambigua deve rifiutare di agire, non scegliere.
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
  -- UN ASSE SOLO, dalla fase 50 in poi: non c'e' un secondo asse da riparare,
  -- quindi non c'e' una riparazione di stato da chiamare con un nome diverso.
  IF v_target.role IS DISTINCT FROM 'master' THEN
    v_act := 'promoted';
  ELSE
    v_act := NULL;   -- lo stato stazionario, e il caso comune a ogni login
  END IF;

  IF v_act IS NOT NULL THEN
    -- Attraverso lo scrittore del registro, mai intorno: la scrittura sul
    -- profilo e la sua riga di registro sono una transazione sola.
    PERFORM public.record_account_act(
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
    -- `attendee`, e non `staff`. Declassare a `staff` non comprerebbe niente.
    --
    -- Fase 51 (D-51-06): era `'member'`. Il valore atterra in
    -- `account_acts.role_after`, che e' `text` SENZA `CHECK`: lasciato
    -- com'era, il registro avrebbe continuato a incidere un valore che nessun
    -- vincolo ammette piu', a ogni deploy, senza sollevare nulla.
    PERFORM public.record_account_act(
      p_subject_id => v_other,
      p_act        => 'demoted',
      p_actor_id   => NULL,
      p_actor_kind => 'system',
      p_role       => 'attendee',
      p_status     => NULL,
      p_note       => 'reconciliation from the deployment environment (D-12)',
      p_party_id   => NULL
    );
    v_demoted := v_demoted + 1;
  END LOOP;

  -- 5. La guardia sullo zero-master, controllata PRIMA che questa chiamata
  --    committi. Un `RAISE` dentro una funzione annulla l'intera chiamata.
  --
  --    Cosi' com'e' scritta, questa guardia NON PUO' SCATTARE: il passo 3 lascia
  --    l'account nominato con `master` e il passo 4 lo esclude per id. E' un
  --    filo teso su una MODIFICA FUTURA.
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

-- ===========================================================================
-- 4. Il rinomina della funzione
-- ===========================================================================
--
-- `ALTER FUNCTION … RENAME TO` e non `DROP` + `CREATE`: conserva l'ACL e
-- `SECURITY DEFINER`. Su questa funzione l'ACL **e' la difesa** — `EXECUTE` e'
-- revocato a `public`, `anon` e `authenticated` e concesso al solo
-- `service_role` — e un `DROP` la azzererebbe, restituendo a `PUBLIC`
-- l'`EXECUTE` di default su una funzione che scrive il ruolo di un account.
--
-- La firma e' quella del catalogo, otto argomenti, letta il 2026-09-22 alle
-- 13:35:42Z. Gli argomenti con `DEFAULT` non entrano nella firma di identita'.

ALTER FUNCTION public.record_membership_act(uuid, text, uuid, text, text, text, text, uuid)
  RENAME TO record_account_act;

COMMENT ON FUNCTION public.record_account_act(uuid, text, uuid, text, text, text, text, uuid) IS
  'D-11 / ACCT-04 / D-51-08: esegue la scrittura su profiles e la sua riga di registro in UNA transazione, cosi'' che una mutazione non possa riuscire mentre il suo atto fallisce. '
  'L''attore e'' un argomento perche'' ogni percorso di mutazione usa il client di servizio, sotto cui auth.uid() e'' nullo: un trigger registrerebbe nessuno. '
  '2026-09-22 (fase 51, D-51-15): subject_label sono le prime 8 cifre di subject_id, calcolate qui e non lato applicazione. Limite dichiarato: e'' un prefisso di un identificativo che, '
  'alla cancellazione del soggetto, diventa nullo — quindi l''etichetta sopravvive ma non punta piu'' a nulla. E'' meno di cio'' che copriva la credenziale della porta, ed e'' il prezzo di non tenerne piu'' una. '
  'SECURITY DEFINER e scrive il ruolo: execute e'' revocato a public, anon e authenticated, e concesso al solo service_role.';


-- ===========================================================================
-- 5. Il rinomina della tabella, e i suoi satelliti uno per uno
-- ===========================================================================
--
-- `ALTER TABLE … RENAME TO` sposta **la tabella e nient'altro**: non i vincoli,
-- non gli indici, non le policy, non il commento. Sette vincoli, due indici
-- espliciti e una policy si rinominano qui a mano — vedi il paragrafo
-- «sette vincoli e tre indici» in intestazione per la decisione e la ragione.

ALTER TABLE public.membership_acts RENAME TO account_acts;

-- I tre `CHECK`. Il primo e' l'unione dei dieci atti — **cambia tabella, non
-- valori**: i dieci restano tutti, compresi i quattro che dalla fase 50 non
-- scrive piu' nessuno ma che sono valori da LEGGERE, perche' un'unione che non
-- sa nominare una riga esistente rende illeggibile la storia che il registro
-- esiste per conservare.
ALTER TABLE public.account_acts
  RENAME CONSTRAINT membership_acts_act_check TO account_acts_act_check;
ALTER TABLE public.account_acts
  RENAME CONSTRAINT membership_acts_actor_attributed TO account_acts_actor_attributed;
ALTER TABLE public.account_acts
  RENAME CONSTRAINT membership_acts_actor_kind_check TO account_acts_actor_kind_check;

-- Le tre chiavi esterne. Nessun elenco di fase le nominava: le ha trovate il
-- catalogo (`51-CATALOG.md` §2b).
ALTER TABLE public.account_acts
  RENAME CONSTRAINT membership_acts_actor_id_fkey TO account_acts_actor_id_fkey;
ALTER TABLE public.account_acts
  RENAME CONSTRAINT membership_acts_party_id_fkey TO account_acts_party_id_fkey;
ALTER TABLE public.account_acts
  RENAME CONSTRAINT membership_acts_subject_id_fkey TO account_acts_subject_id_fkey;

-- La chiave primaria. Rinominare il **vincolo** rinomina anche il suo indice:
-- e' per questo che il terzo indice della tabella non compare qui sotto.
ALTER TABLE public.account_acts
  RENAME CONSTRAINT membership_acts_pkey TO account_acts_pkey;

-- I due indici che non hanno un vincolo alle spalle.
ALTER INDEX public.idx_membership_acts_actor   RENAME TO idx_account_acts_actor;
ALTER INDEX public.idx_membership_acts_subject RENAME TO idx_account_acts_subject;

-- L'unica policy della tabella. Il nome e' gia' scritto nel codice di prodotto
-- (piano 51-11): una migration che ne scegliesse un altro lascerebbe aperta per
-- sempre la finestra che questo file chiude.
ALTER POLICY membership_acts_select_register_read ON public.account_acts
  RENAME TO account_acts_select_register_read;

-- Il commento, riscritto: quello di prima descriveva per esteso il meccanismo
-- append-only nominando un oggetto che dopo questa riga non esiste.
COMMENT ON TABLE public.account_acts IS
  'D-11 / ACCT-04 / D-51-08: il registro degli atti sul ruolo di un account. Append-only, e append-only anche contro il proprio scrittore, per due meccanismi: '
  'la RLS senza alcuna policy di scrittura rifiuta anon, authenticated e ogni sessione utente; il REVOKE di 20260808005000 rifiuta service_role, che porta BYPASSRLS e potrebbe '
  'altrimenti riscrivere o cancellare le righe che registrano gli atti che compie. Quel REVOKE sopravvive al rinomina del 2026-09-22 perche'' un ACL vive in pg_class.relacl e viaggia con la tabella. '
  'L''unico percorso di scrittura e'' public.record_account_act, che gira come il proprio definer. '
  '2026-09-22 (fase 51, D-51-08): il registro prende il nome degli ACCOUNT. L''asse dello stato non esiste dalla fase 50 e la porta non legge piu'' una credenziale da socio; '
  'le colonne status_before e status_after restano come storia, con le righe che le portano.';


-- ===========================================================================
-- 6. La colonna
-- ===========================================================================
--
-- E' la riga per cui esiste tutto il resto del file.
--
-- `membership_code` e' `text UNIQUE NOT NULL` **senza default**
-- (`51-CATALOG.md` §2f). Il vincolo `UNIQUE` e il suo indice cadono con la
-- colonna: e' l'unica dipendenza registrata, `deptype = 'a'`, misurata il
-- 2026-09-22 alle 13:37:57Z. Le due funzioni `plpgsql` che la nominavano sono
-- state ridefinite alle sezioni 1 e 2, **in questa stessa transazione**, ed e'
-- l'intero motivo per cui stanno in questo file.
--
-- **IRREVERSIBILE, e questo repository non ha PITR.** Per questo la stessa
-- migration si applica prima al laboratorio, con la procedura scritta, e in
-- produzione entra sotto un'autorizzazione datata a parte — **dopo** il deploy
-- del codice.
--
-- Una credenziale che nessuna porta verifica non deve esistere (D-51-02): dal
-- 2026-09-21 la porta non ha piu' un percorso che la legga, e una credenziale
-- viva senza un verificatore e' solo una superficie d'attacco in cerca di un uso.

ALTER TABLE public.profiles DROP COLUMN IF EXISTS membership_code;


-- ===========================================================================
-- 7. Le presenze — la guardia, poi la tabella
-- ===========================================================================
--
-- D-51-14: `public.attendances` si toglie, con le sue **due** policy, i suoi
-- **cinque** vincoli e i suoi **quattro** indici. Dopo la fase 51 nessuno la
-- scrive e nessuno la legge: l'unico scrittore vivo era la rotta di verifica
-- socio, cancellata dal piano 51-03, e l'ultimo lettore era il terzo ramo
-- dell'annullamento alla porta, uscito con MEM-03.
--
-- **LA GUARDIA NON E' UNA CORTESIA.** Rende **meccanico** l'ordine che D-51-04
-- impone: prima la cancellazione per chiave primaria su una lista catturata —
-- con il suo conteggio, la sua istantanea e il suo contatore preso da una fonte
-- diversa, che e' `scripts/purge-attendances.mjs` — e **poi** il `DROP` di una
-- tabella vuota. Un `DROP` su una tabella piena cancellerebbe righe che nessuno
-- ha contato, e sarebbe il ripudio esatto dell'incidente che
-- `ai-engineering.md` registra: 63 righe di produzione su sette tabelle, senza
-- istantanea, su un repository senza PITR.
--
-- `EXECUTE` e non una `SELECT` statica: se la tabella non c'e' piu' — la
-- migration si riapplica, o un ambiente l'ha gia' persa — il `RETURN` esce
-- prima, e nessuno statement che la nomina arriva mai a essere preparato.

DO $$
DECLARE
  v_righe bigint;
BEGIN
  IF to_regclass('public.attendances') IS NULL THEN
    RAISE NOTICE 'attendances: gia'' assente, niente da contare e niente da togliere.';
    RETURN;
  END IF;

  EXECUTE 'select count(*) from public.attendances' INTO v_righe;

  IF v_righe > 0 THEN
    RAISE EXCEPTION 'attendances.not_empty: % righe ancora presenti', v_righe
      USING ERRCODE = 'RS002',
            HINT = 'Il DROP non si esegue su una tabella che nessuno ha contato. Prima scripts/purge-attendances.mjs, che conta per provenienza, scrive l''istantanea, cattura gli id e cancella per chiave; poi questa migration.';
  END IF;
END;
$$;

-- **Senza `CASCADE`, e deliberatamente.** Il catalogo dice che nulla pende da
-- questa tabella — `pg_constraint` con `confrelid`, zero righe sul laboratorio
-- e in produzione, letto il 2026-09-22 alle 13:42:49Z e 13:43:00Z. Se fra quella
-- misura e oggi qualcosa fosse comparso, un `CASCADE` se lo porterebbe via in
-- silenzio, mentre senza la migration **fallisce e lo nomina**. Il verso
-- dell'errore e' il punto.
--
-- Le due policy e i quattro indici cadono con la tabella: sono oggetti suoi, non
-- oggetti che pendono da lei.

DROP TABLE IF EXISTS public.attendances;
