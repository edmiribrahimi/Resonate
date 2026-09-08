-- ============================================================================
-- 20260908120000 — la voce di guest list si aggiorna DOPO che il profilo esiste
-- ============================================================================
--
-- IL DIFETTO, MISURATO IN LABORATORIO IL 2026-09-08 (P-CODE-4, `49-ESITI.md`).
--
-- `handle_new_user()` e' un trigger AFTER INSERT su `auth.users`. Quando la
-- mail del nuovo utente coincide con una voce di `guest_list_entries` in stato
-- `pending` o `invited`, la versione precedente (20260905130000, righe 151-153)
-- eseguiva
--
--     UPDATE public.guest_list_entries
--     SET status = 'registered', profile_id = new.id, ...
--
-- PRIMA di `INSERT INTO public.profiles`. Ma `guest_list_entries.profile_id`
-- e' una chiave esterna verso `public.profiles(id)` (20260310000000, riga 54),
-- non differibile: al momento dell'UPDATE il profilo non esiste ancora, la
-- chiave esterna scatta con
--
--     23503 insert or update on table "guest_list_entries" violates foreign
--           key constraint "guest_list_entries_profile_id_fkey"
--
-- e l'intero INSERT in `auth.users` viene annullato. Conseguenza: chi ha la
-- mail in una guest list `pending`/`invited` NON PUO' creare un account — ne'
-- da `/register`, ne' per creazione in-app da un admin. La via «invito da
-- guest list» con `guest_list_event_id` nei metadati non passa da questo ramo
-- e non era colpita.
--
-- Produzione e laboratorio erano identici su questo punto (stessa chiave
-- esterna, stesso corpo del trigger, md5 uguale), quindi il difetto era vivo
-- in produzione dal 2026-03-10.
--
-- LA CORREZIONE E' UNA SOLA: l'UPDATE si sposta DOPO l'inserimento riuscito del
-- profilo. Tutto il resto del corpo — la decisione su stato e via
-- d'approvazione, il conio del codice con gen_random_bytes, i cinque tentativi
-- sulla sola collisione — resta identico a 20260905130000, riga per riga.
--
-- Ordine delle scritture, ora: (1) decidere stato/via; (2) inserire il profilo;
-- (3) marcare la voce di guest list con il profilo che adesso esiste.
-- ============================================================================

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
  -- (1) Stato e via d'approvazione. Nessuna scrittura qui.
  IF (new.raw_user_meta_data->>'guest_list_event_id') IS NOT NULL THEN
    new_status := 'approved';
    new_approved_via := 'guest_list';
  ELSE
    SELECT id INTO guest_list_match
    FROM public.guest_list_entries
    WHERE LOWER(email) = LOWER(new.email) AND status IN ('pending', 'invited')
    LIMIT 1;

    IF guest_list_match IS NOT NULL THEN
      new_status := 'approved';
      new_approved_via := 'guest_list';
      -- L'UPDATE della voce era QUI. Vedi (3).
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

  -- (2) Il profilo, con il codice coniato da gen_random_bytes. Identico a
  -- 20260905130000: cinque tentativi sulla sola collisione del codice, ogni
  -- altra violazione rilanciata com'e'.
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
  'Conia public.profiles.membership_code — una credenziale della porta — con extensions.gen_random_bytes (pgcrypto 1.3, CSPRNG OpenSSL, installato nello schema extensions e verificato da pg_extension). Alfabeto ABCDEFGHJKLMNPQRSTUVWXYZ23456789 (32 caratteri) x 10 = 2^50, contro i 2^40 nominali del random() non crittografico di prima. Dieci e'' il massimo che BARE_MEMBERSHIP_PATTERN accetta alla porta (ScannerClient.tsx:71). Modulo 32 su un byte non ha bias perche'' 256 = 8 x 32. Ritenta fino a 5 volte sulla sola collisione di profiles_membership_code_key, rilanciando ogni altra violazione. Fase 49, D-49-01, 2026-09-05. I codici emessi prima NON sono stati rigenerati. 2026-09-08 (P-CODE-4): la voce di guest_list_entries si marca registered DOPO l''inserimento del profilo, perche'' profile_id e'' una chiave esterna verso profiles e prima del profilo non ha un bersaglio — con l''ordine precedente ogni iscrizione di una mail in guest list falliva con 23503.';
