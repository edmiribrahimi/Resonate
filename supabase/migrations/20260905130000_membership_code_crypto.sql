-- =============================================================================
-- Fase 49 — BUY-05 ripuntato da D-49-01: il codice della porta da un CSPRNG
-- =============================================================================
--
-- QUESTA MIGRATION NON RIGENERA NESSUN CODICE ESISTENTE.
--
-- In produzione ci sono quattro profili, e ognuno tiene un `membership_code`
-- che e' **una credenziale della porta in mano a una persona reale**.
-- Riscriverli con un UPDATE invaliderebbe quelle credenziali senza che il loro
-- portatore lo sappia — e lo scoprirebbe davanti a una fila, che
-- `checkin-offline.md` dichiara l'errore piu' costoso di questo prodotto.
-- Lasciarli com'erano e' **una decisione del proprietario** (`D-49-01`), non una
-- dimenticanza: sotto non c'e' nessuna riga che tocchi `public.profiles`, e non
-- deve comparirne una in una migration successiva senza la sua ragione scritta.
--
-- IL BERSAGLIO, E PERCHE' E' QUESTO E NON `qr.ts`.
--
-- `BUY-05` era scritto su una premessa falsa: diceva che il codice del biglietto
-- nasce da `Math.random()` in `src/utils/qr.ts:49`. Quella riga sta dentro
-- `generateMembershipCode()`, che ha **zero importatori** — codice morto — e il
-- biglietto non ha affatto un codice generato: la sua credenziale e'
-- `tickets.id`, un `gen_random_uuid()` con firma HMAC-SHA256 e confronto a
-- tempo costante. La proprieta' che il requisito voleva **e' gia' vera sul
-- biglietto**.
--
-- La debolezza vera e' qui. `public.handle_new_user` conia `membership_code`
-- con il `random()` di plpgsql — un PRNG **non crittografico e seminato**,
-- quindi predicibile da chi ne osservi abbastanza uscite — e quel codice
-- **ammette da solo alla porta**: `src/app/api/membership/verify/route.ts:114`
-- cerca il profilo per codice e `src/app/api/tickets/attendance/route.ts:145`
-- dichiara di ammettere **senza leggere ne' ruolo ne' stato**.
--
-- PERCHE' ADESSO. Questa e' la fase che comincia a coniarne uno **per ogni
-- persona che compra**: e' la fase che moltiplica la popolazione che tiene una
-- credenziale indovinabile, quindi e' la fase che deve ripararla — prima della
-- 51, che sarebbe quella deputata a rimuovere la superficie.
--
-- LO SPAZIO, DICHIARATO E NON STIMATO.
--
--   prima:  alfabeto 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' (32 caratteri) x  8 =
--           32^8  = 2^40 — e i 40 bit sono un **tetto**, non una misura: con un
--           PRNG seminato l'entropia vera e' quella del seme, non quella del
--           conteggio dei caratteri.
--   dopo:   stesso alfabeto x 10 = 32^10 = 2^50, da un CSPRNG — quindi i 50 bit
--           sono la misura, non un tetto.
--
-- LA FORMA NON E' LIBERA, ED E' IL VINCOLO CHE DECIDE IL 10.
-- `src/app/(admin)/admin/scanner/ScannerClient.tsx:71` porta
-- `BARE_MEMBERSHIP_PATTERN = /^RSN-[A-Z0-9]{6,10}$/i`, e `:69`
-- `MEMBERSHIP_PATTERN = /code=RSN-/i`. **Dieci e' il massimo che la porta
-- accetta**: undici caratteri sarebbero un codice che lo scanner rifiuta, e la
-- porta e' fuori dal perimetro di questa fase. Prefisso e alfabeto restano
-- identici apposta.
--
-- CHE COSA E' IL GENERATORE, VERIFICATO E NON ASSUNTO.
-- `pgcrypto` 1.3 e' installato, **nello schema `extensions`** — letto da
-- `pg_extension join pg_namespace`, non ricordato. Da qui
-- `extensions.gen_random_bytes(10)`, che e' il CSPRNG di OpenSSL: la chiamata e'
-- qualificata perche' questa funzione gira con `search_path = ''` (sotto).
-- Il ripiego dichiarato, se un giorno l'estensione non ci fosse, e'
-- `gen_random_uuid()`, che su PostgreSQL 13+ e' anch'esso un CSPRNG — ma oggi
-- non serve, e scrivere quale si usa serve a far **verificare** l'affermazione
-- a chi legge, invece di fargliela credere.
--
-- IL MAPPING BYTE -> CARATTERE E' ESATTO, E VA DETTO PERCHE' NON E' OVVIO.
-- Un byte vale 0..255, l'alfabeto ha 32 caratteri, e **256 = 8 x 32**: il resto
-- modulo 32 copre i 32 caratteri esattamente otto volte ciascuno, quindi non
-- introduce alcun bias. Con un alfabeto di lunghezza non potenza di due lo
-- introdurrebbe, e servirebbe il rifiuto per rigetto. La riga qui sotto e'
-- corretta **grazie al 32**, non in generale.
--
-- `SET search_path = ''`, E PERCHE' STA IN QUESTA MIGRATION E NON IN UN'ALTRA.
-- Letto da `pg_proc` prima di scrivere: questa funzione e' `SECURITY DEFINER`
-- con `proconfig = NULL`, cioe' **senza `search_path` fissato**, mentre
-- `venue_for_parties` e `reserve_ticket_order` ce l'hanno. E' una lacuna di
-- irrobustimento nota, e gira **a ogni singola registrazione** — cioe' sulla
-- popolazione che questa fase sta per moltiplicare. Si chiude qui perche' la
-- funzione si sta riscrivendo comunque: aprire una seconda migration per una
-- riga sarebbe due occasioni di sbagliare invece di una.
--
-- Ogni oggetto non di sistema e' qualificato: `public.guest_list_entries`,
-- `public.profiles`, `extensions.gen_random_bytes`. Le funzioni di sistema
-- (`substr`, `get_byte`, `lower`, `now`, `coalesce`) vivono in `pg_catalog`, che
-- Postgres cerca **implicitamente** anche con `search_path` vuoto — e' la stessa
-- convenzione di `reserve_ticket_order`.
--
-- MISURATO, non dedotto: i due trigger che questa funzione puo' far scattare a
-- valle — `guest_list_entries_notify_attendance` su `public.guest_list_entries`
-- e `profiles_release_expired_assignments` su `public.profiles` — hanno **gia'
-- entrambi `search_path=""` nel proprio `proconfig`. Quindi fissarlo qui non
-- puo' cambiare come si risolvono i loro nomi: non ereditano il nostro.
-- (Il secondo e' comunque `BEFORE UPDATE OF role` e su un INSERT non scatta.)
--
-- IL RITENTATIVO NON E' UN ORNAMENTO.
-- `public.profiles.membership_code` e' `text UNIQUE NOT NULL`, e la funzione
-- attuale non ritenta. Siccome il trigger scatta **dentro** l'INSERT su
-- `auth.users`, una collisione non produce un codice doppio: fa fallire la
-- **creazione dell'account**. Da questa fase in poi quel fallimento avverrebbe
-- **dopo un pagamento gia' incassato** — qualcuno ha pagato e non ha l'identita'
-- a cui il biglietto si attacca. A 50 bit e con una popolazione dell'ordine
-- delle migliaia, cinque tentativi sono sovrabbondanti; il ramo esiste perche'
-- costa zero e la sua assenza costa un incasso senza account.
--
-- ZERO FALLIMENTI SILENZIOSI. Il progetto **non ha error tracking**: un errore
-- qui non raggiunge nessun essere umano da solo. Per questo i due modi di
-- fallire non si collassano — `membership_code_collision_after_5_attempts` e'
-- una causa propria e cercabile, e qualunque **altra** violazione di unicita'
-- (per esempio `profiles_pkey`) viene **rilanciata invariata** invece di essere
-- contata come una collisione che non e'.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  new_code text;
  chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  ref_code text;
  referrer_id uuid;
  new_status text;
  new_approved_via text;
  guest_list_match uuid;
  v_bytes bytea;
  v_attempt int;
  v_conname text;
  v_inserted boolean := false;
BEGIN
  -- ───────────────────────────────────────────────────────────────────────────
  -- 1. Stato e attribuzione — corpo corrente, riportato integralmente
  -- ───────────────────────────────────────────────────────────────────────────
  -- Nulla in questo blocco cambia rispetto alla versione applicata. E' qui per
  -- intero e non per differenza perche' `CREATE OR REPLACE` sostituisce la
  -- funzione tutta: cio' che non si riscrive, si cancella.

  IF (new.raw_user_meta_data->>'guest_list_event_id') IS NOT NULL THEN
    new_status := 'approved';
    new_approved_via := 'guest_list';
  ELSE
    -- Registrazione organica il cui indirizzo e' gia' in guest list
    SELECT id INTO guest_list_match
    FROM public.guest_list_entries
    WHERE LOWER(email) = LOWER(new.email) AND status IN ('pending', 'invited')
    LIMIT 1;

    IF guest_list_match IS NOT NULL THEN
      new_status := 'approved';
      new_approved_via := 'guest_list';
      UPDATE public.guest_list_entries
      SET status = 'registered', profile_id = new.id, updated_at = now()
      WHERE id = guest_list_match;
    ELSE
      ref_code := new.raw_user_meta_data->>'referral_code';
      IF ref_code IS NOT NULL AND ref_code <> '' THEN
        SELECT id INTO referrer_id
        FROM public.profiles
        WHERE membership_code = ref_code AND status = 'approved';
      END IF;

      IF referrer_id IS NOT NULL THEN
        new_status := 'approved';
        new_approved_via := 'referral';
      ELSE
        new_status := 'pending';
        new_approved_via := NULL;
      END IF;
    END IF;
  END IF;

  -- ───────────────────────────────────────────────────────────────────────────
  -- 2. Il codice della porta, coniato da un CSPRNG — e l'INSERT che lo posa
  -- ───────────────────────────────────────────────────────────────────────────
  -- Conio e inserimento stanno **nello stesso giro** apposta: un codice generato
  -- fuori dal ciclo non sarebbe ritentabile, e ritentare l'INSERT con lo stesso
  -- codice ricadrebbe nella stessa collisione all'infinito.

  FOR v_attempt IN 1..5 LOOP
    v_bytes := extensions.gen_random_bytes(10);
    new_code := 'RSN-';
    FOR i IN 1..10 LOOP
      -- 256 = 8 x 32: il resto modulo 32 e' esatto su QUESTO alfabeto.
      new_code := new_code || substr(chars, (get_byte(v_bytes, i - 1) % 32) + 1, 1);
    END LOOP;

    -- Il controllo a monte: costa una ricerca su un indice unico gia' esistente
    -- (`profiles_membership_code_key`) ed evita di consumare un sottotransazione
    -- nel caso comune.
    IF EXISTS (SELECT 1 FROM public.profiles WHERE membership_code = new_code) THEN
      CONTINUE;
    END IF;

    -- La rete vera. Il controllo qui sopra e' un TOCTOU: fra il SELECT e
    -- l'INSERT un'altra registrazione puo' prendersi lo stesso codice.
    -- L'autorita' resta il vincolo unico, e questo blocco lo ascolta invece di
    -- sperare che non parli.
    BEGIN
      INSERT INTO public.profiles (id, email, full_name, membership_code, role, status, referred_by, approved_via)
      VALUES (
        new.id,
        new.email,
        coalesce(new.raw_user_meta_data->>'full_name', ''),
        new_code,
        'member',
        new_status,
        referrer_id,
        new_approved_via
      );
      v_inserted := true;
      EXIT;
    EXCEPTION WHEN unique_violation THEN
      GET STACKED DIAGNOSTICS v_conname = CONSTRAINT_NAME;
      IF v_conname IS DISTINCT FROM 'profiles_membership_code_key' THEN
        -- Non e' una collisione del codice: e' un'altra cosa, e va vista com'e'.
        -- Contarla fra i cinque tentativi la travestirebbe da collisione e
        -- nasconderebbe la causa vera dietro un messaggio che non le appartiene.
        RAISE;
      END IF;
    END;
  END LOOP;

  IF NOT v_inserted THEN
    RAISE EXCEPTION 'membership_code_collision_after_5_attempts'
      USING HINT = 'Cinque codici da 50 bit collisi di seguito: e'' un evento che a questa scala non accade per caso. Guardare il generatore, non la fortuna.';
  END IF;

  RETURN new;
END;
$$;

COMMENT ON FUNCTION public.handle_new_user() IS
  'Conia public.profiles.membership_code — una credenziale della porta — con extensions.gen_random_bytes (pgcrypto 1.3, CSPRNG OpenSSL, installato nello schema extensions e verificato da pg_extension). Alfabeto ABCDEFGHJKLMNPQRSTUVWXYZ23456789 (32 caratteri) x 10 = 2^50, contro i 2^40 nominali del random() non crittografico di prima. Dieci e'' il massimo che BARE_MEMBERSHIP_PATTERN accetta alla porta (ScannerClient.tsx:71). Modulo 32 su un byte non ha bias perche'' 256 = 8 x 32. Ritenta fino a 5 volte sulla sola collisione di profiles_membership_code_key, rilanciando ogni altra violazione. Fase 49, D-49-01, 2026-09-05. I codici emessi prima NON sono stati rigenerati.';
