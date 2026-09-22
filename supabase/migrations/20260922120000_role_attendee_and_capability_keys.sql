-- ═══════════════════════════════════════════════════════════════════════════
-- Chi compra si chiama `attendee`, e due chiavi escono dal catalogo
--
-- Fase 51 «Via le superfici da socio e la porta» — MEM-01.
-- Decisioni: D-51-06 (il ruolo), D-51-07 (le due chiavi di capability).
--
-- ── IL VERSO DEL DEPLOY: CODICE PRIMA, QUESTA MIGRATION SUBITO DOPO ────────
--
-- **NON APPLICARE QUESTA MIGRATION PRIMA DEL DEPLOY DEL CODICE DELLA FASE 51.**
--
-- E' il verso della fase 50, e per una ragione diversa. Li' si toglieva una
-- colonna, e applicare prima avrebbe aperto una finestra `42703` sul codice
-- ancora in produzione. Qui non si toglie niente al codice: si **allarga cio'
-- che puo' essere scritto**, e chi scrive il valore nuovo e' il codice.
--
--   * **applicarla PRIMA del deploy** lascerebbe in produzione un codice che
--     scrive ancora `'member'` contro un `CHECK` che alla fine di questo file
--     ammette solo `'attendee'`: ogni creazione di account riceverebbe `23514`
--     per tutta la durata del deploy;
--   * **applicarla SUBITO DOPO** apre la finestra opposta, piu' corta e
--     dichiarata: fra il deploy e questa migration il codice scrive gia'
--     `'attendee'` e il `CHECK` non lo ammette ancora — quindi una creazione di
--     account riceve `23514` per il tempo fra due passi consecutivi dello
--     stesso atto.
--
-- **Quella finestra e' dichiarata nel piano 51-13** (passo (a) → passo (b),
-- minaccia T-51-59, disposizione *accept, dichiarata*), e sta nel testo
-- dell'autorizzazione che chi la concede legge **prima** di concederla. Non e'
-- un effetto da scoprire a meta': e' un costo scritto, su un progetto che nella
-- finestra non ha serate in vendita.
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
-- Vedi `20260921120000_drop_status_and_referral.sql:42-55`.
--
-- E la transazione unica **e' il meccanismo, non una comodita'**: i due `CHECK`,
-- i due `UPDATE` e le due funzioni stanno qui insieme perche' se uno rifiuta
-- **nulla** e' applicato. `20260808000500_staff_role.sql:88-94` scrive per
-- esteso il modo di fallire contro cui quella scelta esiste — *«due migration
-- separate, la prima applicata e la seconda no, e un database di produzione che
-- ammette un ruolo che non possiede alcuna capacita'»*.
--
-- ── COSA QUESTA MIGRATION NON FA, E VA LETTO PRIMA DI CERCARLO ─────────────
--
--   * **Non tocca `door_scan_events_subject_type_check`**, che ammette
--     `'membership'` fra i valori di `subject_type`. **D-51-13 lo conserva come
--     valore storico**: e' il registro delle convalide alla porta, e non si
--     riscrive. Una migration che cercasse «i `CHECK` che dicono membership» e
--     li riscrivesse tutti cancellerebbe una decisione presa.
--   * **Non tocca `email_deliveries_category_check`**, che ammette ancora
--     `member_approved`, `member_reactivated` e `member_rejected` — tre
--     categorie di posta di un flusso che la fase 50 ha rimosso dal prodotto.
--     Toglierle significa decidere cosa fare delle righe storiche che le
--     portano, e quella decisione non e' di questa fase.
--   * **Non tocca `profiles.membership_code`**, ne' il registro degli atti, ne'
--     il suo nome: il conio del codice e la rinomina in `account_acts` sono
--     della migration del piano 51-12 (D-51-02, D-51-08, D-51-15). Anticiparli
--     qui spezzerebbe l'ordine dichiarato e metterebbe due atti irreversibili
--     nella stessa transazione.
--   * **Non tocca `public.attendances`**: la svuota e la toglie il piano 51-12
--     (D-51-14), dopo istantanea e autorizzazione datata.
--   * **Non tocca alcuna policy.** Letto sul catalogo vivo il 2026-09-22 alle
--     13:30:51Z, interrogando `pg_policies` **sul predicato** e non su un nome
--     di funzione: **zero righe** nominano il ruolo nel proprio `USING` o
--     `WITH CHECK`. Il modello a capability confronta valori
--     (`private.role_capabilities.role` fa join su `public.profiles.role` dentro
--     `private.has_capability`), non enumera il ruolo — ed e' questo che rende
--     la rinomina una migration di dati invece di una riscrittura di decine di
--     policy. Una lettura che torna vuota dove *poteva* esserci qualcosa e' una
--     misura, non un'assenza di lavoro.
--
-- ── L'ORDINE DEI PASSI, CHE NON E' ESTETICO ───────────────────────────────
--
--   1. `profiles_role_check` allargato a CINQUE valori;
--   2. `role_capabilities_role_check` allargato a CINQUE valori;
--   3. `UPDATE private.role_capabilities` — le concessioni prima;
--   4. `UPDATE public.profiles` — i profili dopo;
--   5. i due `CHECK` stretti a QUATTRO valori;
--   6. il `DEFAULT` della colonna;
--   7. le due funzioni che portano il letterale nel corpo;
--   8. il `DO` che rilegge `pg_policies` prima di cancellare;
--   9. le due cancellazioni dal catalogo dei permessi.
--
-- **Perche' i `CHECK` si allargano prima e si stringono dopo.** Un
-- `ALTER TABLE … ADD CONSTRAINT` **valida le righe esistenti**, e all'inizio di
-- questo file le righe portano ancora `'member'`: un vincolo che ammettesse
-- solo i quattro valori nuovi verrebbe rifiutato con **23514**. Le due strade
-- pulite erano (a) cinque valori, `UPDATE`, poi quattro, e (b)
-- `ADD CONSTRAINT … NOT VALID` seguito da `VALIDATE CONSTRAINT`. **(a) e' la
-- forma che questo repository gia' scrive** — due `ALTER` per vincolo, nomi
-- espliciti, `20260808000500:70-101` — ed e' leggibile da chi non conosce
-- `NOT VALID`. Questo e' **l'unico punto del file che puo' fallire per una
-- ragione di dati**, ed e' la ragione per cui si prova sul laboratorio prima.
--
-- **Perche' il `DEFAULT` sta al passo 6 e non al 4.** `51-CATALOG.md` §1d
-- osserva che un `DEFAULT 'member'` sopravvissuto a un `CHECK` gia' stretto
-- farebbe fallire con `23514` la prima `INSERT` senza `role` esplicito. Dentro
-- **questa** transazione quella finestra non esiste, e non per fortuna: il primo
-- `ALTER TABLE public.profiles` del passo 1 prende un lock `ACCESS EXCLUSIVE`
-- sulla tabella e lo tiene fino al commit, quindi fra il passo 5 e il passo 6
-- nessun'altra sessione puo' inserire. La divergenza si scrive invece di
-- correggersi in silenzio: **fuori** da una transazione sola l'ordine del
-- catalogo sarebbe l'unico giusto.
--
-- ── DUE FUNZIONI PORTANO IL LETTERALE, NON UNA: IL CATALOGO HA SMENTITO ────
--
-- `51-RESEARCH.md:388` scriveva, in grassetto, *«nessuna funzione e nessuna
-- policy contiene il letterale `'member'` nel proprio corpo vivo — l'unica
-- ricorrenza e' `20260921120000:837` dentro `handle_new_user`»*.
--
-- Interrogando `pg_proc` sul laboratorio il 2026-09-22 alle 13:28:46Z, con i
-- commenti **spogliati prima del confronto** (D-50-02, senza i quali questo
-- repository produce falsi positivi a ogni riga di prosa), le funzioni che
-- portano il letterale sono **due**:
--
--     handle_new_user()            riga 48 del corpo spogliato — il ruolo cablato
--     reconcile_master(text)       riga 103 — `p_role => 'member'`
--
-- **La seconda gira a ogni deploy.** Non scrive su `profiles.role` — verificato
-- alle 13:29:58Z, zero righe con `update`, `insert` o `delete` nel corpo
-- spogliato: la funzione *registra* la promozione e le retrocessioni senza
-- eseguirle. Ma il valore che passa atterra in
-- `public.membership_acts.role_after`, che e' `text` **senza `CHECK`** (§2b del
-- catalogo: sulla tabella vivono due soli `CHECK`, e nessuno e' sul ruolo).
-- Senza questo file, dal giorno dopo il registro inciderebbe `'member'` — un
-- valore che nessun vincolo ammette piu' e che nessun profilo porta — **su ogni
-- deploy che retroceda un master, senza sollevare nulla**. E' la forma di
-- fallimento che `meta-gates.md` chiama silenziosa, in un registro che nessuno
-- guarda finche' non serve.
--
-- Entrambe si ridefiniscono con `CREATE OR REPLACE` su **firma identica**, che
-- conserva l'ACL, e riportando `SECURITY DEFINER` e `SET search_path = ''`:
-- `CREATE OR REPLACE` **non li eredita da solo**, e tutte e due li portano.
-- Il corpo si riscrive per intero perche' `REPLACE` sostituisce: cambia **solo**
-- il letterale del ruolo.
--
-- ── UN TRIGGER SCATTA SULL'`UPDATE` DEL RUOLO, E NESSUN DOCUMENTO LO DICEVA ─
--
-- `profiles_release_expired_assignments` e'
-- `BEFORE UPDATE OF role ON public.profiles FOR EACH ROW
--  WHEN (old.role IS DISTINCT FROM new.role)`, e chiama
-- `public.release_expired_assignee_roles(OLD.id)`, che **scrive su una seconda
-- tabella**: `UPDATE public.party_assignments SET assignee_role = NULL,
-- expired_at = now()` sulle assegnazioni gia' scadute di quel profilo.
--
-- Quindi il passo 4 di questo file ha un percorso di scrittura verso
-- `public.party_assignments` che il suo `UPDATE` non nomina — cio' che
-- `ai-engineering.md` chiama *«una cascata e' un percorso di scrittura che
-- nessuno ha dichiarato, e va enumerata leggendo i vincoli, non ricordandola»*,
-- applicato a un trigger invece che a una chiave esterna.
--
-- **Misurato il 2026-09-22 alle 13:38:57Z (laboratorio) e 13:39:03Z
-- (produzione): ZERO righe verrebbero rilasciate su entrambi**, perche' nessun
-- profilo con ruolo `member` ha assegnazioni — coerente con D-51-03, *«staff e
-- organizer non scansionano: sono in servizio»*, e con il fatto che chi compra
-- non lavora una serata. Il trigger scatta (una volta per profilo toccato) e non
-- scrive nulla. Il numero e' zero **oggi** e va ripreso il giorno dell'atto in
-- produzione; si dichiara qui perche' se un domani un `attendee` avesse
-- un'assegnazione, questa migration la scadrebbe in silenzio.
--
-- ── DOPO QUESTO FILE, DUE RUOLI RESTANO CON ZERO CONCESSIONI ───────────────
--
-- `membership.card.view` e' concessa a tutti e quattro i ruoli, e **`staff` e
-- `member` non hanno altro**: una concessione ciascuno, ed e' quella
-- (misurato 13:32:05Z). Cancellarla porta `private.role_capabilities` da **32
-- righe a 28**, e le quattro che escono sono **l'intero patrimonio di
-- `attendee` e l'intero patrimonio di `staff`**. Master resta a 16, organizer a
-- 14, gli altri due a **zero**.
--
-- Per `attendee` e' la conseguenza voluta: chi compra un biglietto non ha
-- capacita' di lavoro, e D-51-09 dice che la sua pagina mostra solo i biglietti.
--
-- **Per `staff` no, e va guardata invece che scoperta.**
-- `20260808000500_staff_role.sql:88-94` dichiara per esteso che il modo di
-- fallire contro cui quel file era scritto e' *«una produzione che ammette un
-- ruolo che non possiede alcuna capacita'»*. Dopo questa fase lo staff e' in
-- quello stato **per riga di catalogo** — e cio' che lo fa lavorare alla porta
-- non e' piu' il ruolo ma l'**assegnazione alla serata**
-- (`live_assignment_capabilities` in `my_access_context`, `party_assignments`).
-- Non e' un blocco e non e' un difetto: e' un'asimmetria dichiarata.
-- ═══════════════════════════════════════════════════════════════════════════


-- ===========================================================================
-- 1. `profiles_role_check` — allargato a CINQUE valori
-- ===========================================================================
--
-- Cinque, e il quinto e' transitorio: vive dal passo 1 al passo 5 di questo
-- stesso file, cioe' meno di una transazione. Non e' uno stato che qualcuno
-- possa osservare — il lock `ACCESS EXCLUSIVE` di questo `ALTER` lo impedisce —
-- ed e' l'unico modo di far passare la validazione sulle righe che portano
-- ancora il valore vecchio.

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_role_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('master', 'organizer', 'staff', 'member', 'attendee'));


-- ===========================================================================
-- 2. `role_capabilities_role_check` — il secondo vincolo, lo stesso movimento
-- ===========================================================================
--
-- Il ruolo e' vincolato in DUE posti, non uno. Questo guarda la tabella delle
-- concessioni, e il commento che lo creo' dice perche' esiste: *«rispecchia
-- `UserRole` in `src/types/database.ts`»* (`20260807000000:118-119`). Uno
-- specchio aggiornato a meta' non e' piu' uno specchio — e l'`UPDATE` del passo
-- 3 verrebbe rifiutato con **23514** proprio contro questo vincolo.

ALTER TABLE private.role_capabilities
  DROP CONSTRAINT IF EXISTS role_capabilities_role_check;

ALTER TABLE private.role_capabilities
  ADD CONSTRAINT role_capabilities_role_check
  CHECK (role IN ('master', 'organizer', 'staff', 'member', 'attendee'));


-- ===========================================================================
-- 3. Le concessioni prima
-- ===========================================================================
--
-- Una riga sul laboratorio e una in produzione (misurate 13:31:26Z e 13:31:49Z):
-- e' `membership.card.view` concessa a `member`, che il passo 9 cancellera'
-- comunque. Si muove lo stesso, e non e' lavoro sprecato: se il passo 9 un
-- giorno cambiasse idea, questa riga sarebbe l'unica a portare ancora un valore
-- che nessun vincolo ammette.

UPDATE private.role_capabilities
   SET role = 'attendee'
 WHERE role = 'member';


-- ===========================================================================
-- 4. I profili dopo — e il trigger scatta qui
-- ===========================================================================
--
-- Cinque righe sul laboratorio, DUE in produzione (13:31:26Z e 13:31:49Z).
-- E in produzione **non esiste alcun profilo `staff`**: il laboratorio ne ha uno
-- perche' `seed-lab-door.mjs` lo semina. E' una differenza fra i due ambienti da
-- conoscere prima, non a meta' di una procedura.
--
-- `profiles_release_expired_assignments` scatta una volta per riga — vedi
-- l'intestazione. Zero scritture su `party_assignments`, misurate su entrambi i
-- progetti, da rimisurare il giorno dell'atto in produzione.

UPDATE public.profiles
   SET role = 'attendee'
 WHERE role = 'member';


-- ===========================================================================
-- 5. I due `CHECK` stretti a QUATTRO valori
-- ===========================================================================
--
-- Adesso nessuna riga porta piu' il valore vecchio, quindi la validazione passa.
-- Da qui in avanti `'member'` non e' piu' scrivibile in nessuna delle due
-- tabelle.

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_role_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('master', 'organizer', 'staff', 'attendee'));

COMMENT ON CONSTRAINT profiles_role_check ON public.profiles IS
  'Quattro valori: master, organizer, staff, attendee. Fase 51 (D-51-06): member e'' diventato attendee, perche'' chi partecipa compra o e'' invitato — non e'' un socio, e chiamarlo cosi'' produceva bug di accesso. Non guest, che alla porta e nella coda offline e'' gia'' l''invitato in lista; non buyer, sbagliato per chi entra da guest list senza pagare. Il valore member e'' stato scrivibile fino a questa migration e non lo e'' piu'': le righe che lo portavano sono state spostate nella stessa transazione, quindi non resta nemmeno leggibile in questa tabella. Rispecchia UserRole in src/types/database.ts e role_capabilities_role_check in private.';


ALTER TABLE private.role_capabilities
  DROP CONSTRAINT IF EXISTS role_capabilities_role_check;

ALTER TABLE private.role_capabilities
  ADD CONSTRAINT role_capabilities_role_check
  CHECK (role IN ('master', 'organizer', 'staff', 'attendee'));

COMMENT ON CONSTRAINT role_capabilities_role_check ON private.role_capabilities IS
  'Lo specchio di profiles_role_check, e i due si muovono sempre insieme: private.has_capability confronta role_capabilities.role con profiles.role per VALORE, quindi due insiemi diversi non darebbero un errore ma un rifiuto silenzioso. Quattro valori dalla fase 51 (D-51-06). Non esiste, deliberatamente, alcun CHECK che leghi un ruolo a un insieme di capability: quale ruolo tiene cosa e'' affare del seed, ed e'' dato (20260807000000:118-119).';


-- ===========================================================================
-- 6. Il `DEFAULT` della colonna
-- ===========================================================================
--
-- `DEFAULT 'member'` era stato posato da `20260224_rbac_migration.sql:14` e non
-- era mai stato rimosso. Letto dal catalogo il 2026-09-22 alle 13:31:10Z:
-- **nessun'altra colonna, in nessuno schema, porta un default che nomina
-- `member`**. Questo e' l'unico movimento di default necessario.
--
-- Non e' decorativo: `handle_new_user` nomina `role` esplicitamente, ma
-- qualunque altra `INSERT` su `public.profiles` che lo ometta prende questo
-- valore.

ALTER TABLE public.profiles
  ALTER COLUMN role SET DEFAULT 'attendee';

COMMENT ON COLUMN public.profiles.role IS
  'Il ruolo dell''account. Quattro valori (profiles_role_check), default attendee dalla fase 51 (D-51-06) — era member, posato da 20260224_rbac_migration.sql:14 e mai rimosso fino a qui. attendee e'' il ruolo dell''account leggero di chi ha comprato un biglietto o e'' stato invitato: NON e'' un socio, e non diventa automaticamente il socio di un''eventuale associazione. Gli account di lavoro — master, organizer, staff — li scrive createAccount passando dal registro degli atti, mai i metadati di createUser.';


-- ===========================================================================
-- 7. Le due funzioni che portano il letterale nel corpo
-- ===========================================================================
--
-- ── 7a. `public.handle_new_user()` — il ruolo e' CABLATO, e resta cablato ──
--
-- Ridefinita per intero perche' `CREATE OR REPLACE` sostituisce il corpo, non lo
-- modifica. **Cambia una cosa sola: il letterale del ruolo.**
--
-- Il conio del codice e' quello indurito a fine fase 49 —
-- `extensions.gen_random_bytes`, alfabeto di 32 caratteri per 10 posizioni,
-- cinque tentativi sulla SOLA collisione della chiave unica, ogni altra
-- violazione rilanciata com'e' — ed e' riportato qui **identico**. Il codice
-- socio lo toglie la migration del piano 51-12 (D-51-02): anticiparlo qui
-- spezzerebbe l'ordine dichiarato in intestazione.
--
-- **L'ORDINE DELLE SCRITTURE NON SI INVERTE** (D-50-07). L'`UPDATE` di
-- `guest_list_entries` resta DOPO l'`INSERT` del profilo: e' la riparazione
-- dell'8 settembre (`20260908120000`), e prima di quella chiunque avesse la mail
-- in una guest list `pending`/`invited` **non poteva creare un account**
-- (`23503`).
--
-- **IL RUOLO NON SI LEGGE DAI METADATI, E NON E' UNA DIMENTICANZA.** Leggerlo da
-- `raw_user_meta_data` creerebbe un modo nuovo di ottenere un ruolo passando dai
-- metadati di `createUser`, cioe' una primitiva di escalation su un percorso che
-- nessuna policy guarda (`access-gating.md`). Lo scrive `createAccount` dopo,
-- passando dal registro.

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

  -- (2) Il profilo. `role` e' CABLATO ad 'attendee' dalla fase 51 (D-51-06):
  -- vedi il paragrafo sopra. Era 'member', ed e' l'unica riga cambiata.
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
        'attendee'
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
  'Conia public.profiles.membership_code — una credenziale della porta — con extensions.gen_random_bytes (pgcrypto 1.3, CSPRNG OpenSSL). Alfabeto ABCDEFGHJKLMNPQRSTUVWXYZ23456789 (32 caratteri) x 10 = 2^50. Ritenta fino a 5 volte sulla sola collisione di profiles_membership_code_key, rilanciando ogni altra violazione. 2026-09-08 (P-CODE-4): la voce di guest_list_entries si marca registered DOPO l''inserimento del profilo, perche'' profile_id e'' una chiave esterna verso profiles — l''ordine NON si inverte. 2026-09-21 (fase 50, D-50-08/D-50-09): via lo stato, via approved_via e via l''intero ramo del referral. 2026-09-22 (fase 51, D-51-06): il ruolo cablato e'' attendee, non piu'' member — e resta CABLATO, non letto dai metadati di createUser: lo scrive createAccount dopo, passando dal registro.';


-- ── 7b. `public.reconcile_master(text)` — gira a ogni deploy ───────────────
--
-- **Questa ridefinizione la ricerca non la chiedeva: la chiede il catalogo.**
-- Vedi il paragrafo «due funzioni portano il letterale» in intestazione.
--
-- Cambia una cosa sola: il `p_role` del ramo di retrocessione, che era
-- `'member'`. Cio' che NON cambia, e che e' la ragione per cui questa funzione
-- esiste: l'ordine (promuovere prima, declassare dopo), la guardia sullo
-- zero-master, e la risoluzione ambigua che RIFIUTA invece di scegliere.
--
-- Chiama ancora `public.record_membership_act`. La rinomina del registro in
-- `account_acts` e' della migration del piano 51-12, che **ridefinira' di nuovo
-- questa stessa funzione** per seguire il nome nuovo: due ridefinizioni
-- consecutive sulla stessa firma, e l'ordine e' quello giusto — qui si muove il
-- valore, li' il nome dello scrittore. Se le due si invertissero, quella del
-- 51-12 riporterebbe qui il letterale vecchio.

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
    -- `attendee`, e non `staff`. Declassare a `staff` non comprerebbe niente.
    --
    -- Fase 51 (D-51-06): era `'member'`. Il valore atterra in
    -- `membership_acts.role_after`, che e' `text` SENZA `CHECK`: lasciato
    -- com'era, il registro avrebbe continuato a incidere un valore che nessun
    -- vincolo ammette piu', a ogni deploy, senza sollevare nulla.
    PERFORM public.record_membership_act(
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

COMMENT ON FUNCTION public.reconcile_master(text) IS
  'ROLE-04 / D-12: riconcilia chi tiene master contro l''indirizzo fornito dall''ambiente di deploy. Promuove l''account nominato, declassa ogni altro master, e scrive ogni atto nel registro con actor_kind = system (D-22). D-16: un argomento non impostato, malformato, ambiguo o senza riscontro non declassa nessuno, e la chiamata non lascia mai zero master. La regola e'' versionata qui; l''indirizzo e'' un argomento, perche'' questo repository e'' pubblico. 2026-09-21 (fase 50): un asse solo, via il ramo dello stato. 2026-09-22 (fase 51, D-51-06): il declassamento registra attendee, non piu'' member — il valore atterra in role_after, che non ha CHECK, quindi un letterale morto non avrebbe sollevato nulla. SECURITY DEFINER e scrive il ruolo: execute e'' revocato a public, anon e authenticated, e concesso al solo service_role.';


-- ===========================================================================
-- 8. Il `DO` che rilegge `pg_policies` PRIMA di cancellare
-- ===========================================================================
--
-- Una `DELETE` su un catalogo di permessi che non verifica di essere l'ultima e'
-- una `DELETE` che si scopre in produzione. Questo blocco rilegge `pg_policies`
-- — cioe' cio' che sta girando, non cio' che questo file crede di aver scritto —
-- e **solleva** se una qualsiasi policy nomina ancora una delle due chiavi.
--
-- E' la stessa forma di `20260921120000:966-981`, allargata da una chiave a due.
-- Al 2026-09-22 la lettura e' vuota su entrambe, ma il blocco resta: e' scritto
-- contro il giorno in cui non lo sara'.

DO $$
DECLARE
  v_lettori text;
BEGIN
  SELECT string_agg(schemaname || '.' || tablename || '.' || policyname, ', ')
    INTO v_lettori
    FROM pg_policies
   WHERE coalesce(qual, '') || coalesce(with_check, '') LIKE '%membership.active%'
      OR coalesce(qual, '') || coalesce(with_check, '') LIKE '%membership.card.view%';

  IF v_lettori IS NOT NULL THEN
    RAISE EXCEPTION
      'membership.active / membership.card.view hanno ancora lettori di policy: %', v_lettori
      USING HINT = 'Una chiave non si cancella finche'' una policy la legge: la cancellazione trasformerebbe quelle policy in un rifiuto silenzioso e permanente.';
  END IF;
END;
$$;


-- ===========================================================================
-- 9. Le due chiavi escono dal catalogo (D-51-07)
-- ===========================================================================
--
-- **Prima le concessioni, poi le chiavi, in due passi espliciti** — anche se
-- `private.role_capabilities.capability` e'
-- `references private.capabilities(key) on delete cascade`
-- (`20260807000000:122`) e la cascata dichiarata le porterebbe via in uno. E' il
-- pattern della casa, e si legge: chi apre questo file vede quante righe di
-- concessione escono senza doverlo dedurre da un vincolo scritto altrove.
--
-- `membership.active` tiene **zero** concessioni: le sue quattro sono state
-- cancellate dalla fase 50 (D-50-28), che lascio' la CHIAVE nel catalogo
-- **apposta** — perche' `scripts/verify-capabilities.mjs` confronta
-- `private.capabilities` con l'oggetto `CAP` di TypeScript in entrambe le
-- direzioni, e toglierla da sola avrebbe reso quel gate rosso fino al piano che
-- tocca il codice. **Questo e' quel piano**, e le due se ne vanno nello stesso
-- commit: il debito che la fase 50 aveva dichiarato con il nome della fase che
-- lo chiude si chiude qui.
--
-- `membership.card.view` tiene **quattro** concessioni — `master`, `organizer`,
-- `staff` e chi ora e' `attendee`. La sua pagina e il suo storico sono gia' via
-- (piano 51-04): la chiave apriva due indirizzi che non esistono piu'.
--
-- 17 chiavi → **15**. 32 concessioni → **28**.

DELETE FROM private.role_capabilities
 WHERE capability IN ('membership.active', 'membership.card.view');

DELETE FROM private.capabilities
 WHERE key IN ('membership.active', 'membership.card.view');

COMMENT ON TABLE private.role_capabilities IS
  'Le concessioni per ruolo. Fase 50: la colonna requires_approved e'' stata rimossa insieme a profiles.status — una chiave si tiene o non si tiene, senza un secondo asse. Fase 51 (D-51-06, D-51-07): il ruolo member si chiama attendee, e le chiavi membership.active e membership.card.view sono uscite dal catalogo insieme alla costante CAP che le rispecchiava — il debito dichiarato dalla fase 50 e'' chiuso. 28 righe: 16 a master, 14 a organizer, ZERO a staff e ZERO ad attendee. Per attendee e'' voluto, chi compra non lavora. Per staff e'' un''asimmetria dichiarata: cio'' che lo fa lavorare alla porta non e'' piu'' il ruolo ma l''assegnazione alla serata (party_assignments, live_assignment_capabilities), quindi il modo di fallire descritto in 20260808000500:88-94 qui non si applica — ma va riletto prima di aggiungere un ruolo nuovo.';

COMMENT ON TABLE private.capabilities IS
  'Il catalogo delle chiavi di capability, rispecchiato dall''oggetto CAP in src/lib/capabilities/keys.ts. 15 chiavi dalla fase 51 (D-51-07): membership.active e membership.card.view sono uscite qui, e nello stesso commit dal TypeScript — scripts/verify-capabilities.mjs confronta i due insiemi in ENTRAMBE le direzioni, quindi muoverne uno solo rende quel gate rosso. Nessun test runner prova questa corrispondenza: la prova quel gate, e ha bisogno di un database vivo.';
