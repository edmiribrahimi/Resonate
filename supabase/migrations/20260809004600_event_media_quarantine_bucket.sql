-- The quarantine bucket — a place where bytes can land without being reachable
-- Phase 35, Plan 19: ASSIGN-01, threat T-35-101
--
-- Changes:
-- 1. storage.buckets — a new bucket `event-media-quarantine`, private, with the
--    same per-file ceiling as `event-media`
-- 2. storage.objects — ONE insert policy for `authenticated`, carrying the same
--    predicate the public bucket carries today
--
-- Two changes, ONE transaction — and here the halves are not symmetrical, which
-- is why they are enumerated instead of assumed:
--
--   * the bucket without its insert policy is a bucket nobody can write into.
--     Harmless, and useless: the browser upload of plan 35-20 would fail with a
--     row-level refusal and the strip would never run;
--   * the policy without the bucket cannot be exercised at all — `bucket_id`
--     would match nothing — but it WOULD sit on `storage.objects` naming a
--     bucket that does not exist, which is the kind of orphan the next reader
--     removes as tidying, three weeks before somebody creates the bucket.
--
-- WHAT THIS FILE IS FOR. `media-and-storage.md` requires that every uploaded
-- image be stripped of its metadata **before it becomes reachable**. Two facts
-- of this repository, read rather than remembered, decide the architecture:
--
--   * `20260225120000_phase7_media.sql:64-66` — the `event-media` bucket is
--     `public`. Anything that lands there is readable by URL, immediately;
--   * `src/components/media/MediaUpload.tsx:160-162` — the upload goes from the
--     BROWSER straight to storage, and the product accepts photos up to 50 MB
--     (`:11`) against a documented 4.5 MB ceiling on a serverless request body.
--     Routing the bytes THROUGH the server inside an HTTP request is not a
--     matter of taste: it is not possible.
--
-- So the bytes land in a bucket that is **private**, and the server picks them
-- up from there. A file that has not been stripped yet is reachable by nobody,
-- which is literally what the gate asks for.
--
-- ─────────────────────────────────────────────────────────────────────────────
-- COSA QUESTO FILE NON FA, e la finestra che resta aperta
--
-- Questo file **non toglie a nessuno** il permesso di scrivere nel bucket
-- pubblico `event-media`. Quel permesso viene revocato dalla quindicesima riga
-- della coda — `20260809006000_event_media_server_upload_only.sql`, piano
-- 35-21 — che e' l'UNICA riga della coda che si applica **dopo il deploy** del
-- codice di questa fase: applicarla prima romperebbe i caricamenti dei membri
-- fino al deploy.
--
-- Conseguenza, dichiarata e non scoperta a valle: **finche' quella riga non e'
-- applicata, la spoglia dei metadati e' aggirabile** scrivendo direttamente nel
-- bucket pubblico dal browser, esattamente come si fa oggi. E' una finestra
-- nota, la sua durata e' quella di un deploy, e sta scritta qui perche' un gate
-- coperto a meta' che si legge come coperto e' peggio di un gate assente.
-- `35-HUMAN-UAT.md` lo registra come prova 10, falsa-positiva finche' la riga 15
-- non e' applicata.
--
-- Questo file e' la **riga 13** della coda ed e' puramente additivo: non tocca
-- nessuna policy esistente, non tocca `event-media`, non tocca nessuna tabella
-- di `public`.
--
-- IDEMPOTENZA, voce per voce. Questa coda si applica A MANO, una riga alla
-- volta, e senza queste righe una seconda esecuzione solleva `42710`, manda in
-- rollback la transazione e lascia NON APPLICATO tutto cio' che segue
-- (WR-04 della code review del 2026-08-08). Ri-eseguire deve essere sicuro, o
-- nessuno ri-esegue quando dovrebbe.
--   * `ON CONFLICT DO NOTHING` sull'insert del bucket, come gia' fa la fase 7;
--   * `DROP POLICY IF EXISTS` prima dell'unica policy creata.
--
-- NOTA DI FORMA. Il criterio di accettazione di questo piano greppa il file per
-- le due clausole di policy che qui NON devono esistere. Se il paragrafo che
-- spiega la loro assenza le citasse per esteso, sarebbe l'unico match del file e
-- il controllo si annullerebbe da solo. Sono quindi **descritte** — «lettura» e
-- «cancellazione» — e non scritte. Stessa scelta, e stessa ragione, di
-- `35-02-SUMMARY.md` deviazione 3 e `35-05-SUMMARY.md` deviazione 3.

BEGIN;

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. The bucket
--
-- `public` is `false`, and that single boolean is the whole mitigation of
-- T-35-101. `venue-secrecy.md`, gate *il path non e' una password*: an unlisted
-- URL is not a protected URL. The path of an upload in the sibling bucket is
-- `${eventId}/${userId}/${timestamp}-${i}.${ext}` — derivable from two
-- identifiers that circulate — so protection here cannot come from the
-- difficulty of guessing a name. It comes from the bucket being private.
--
-- The 104857600 ceiling is not a fresh decision: it is the same value
-- `event-media` carries (`20260225120000_phase7_media.sql:64-66`), read from
-- that line rather than rewritten from memory. A transit area with a SMALLER
-- ceiling would refuse files the destination accepts, and the refusal would
-- arrive at the member as a storage error with no cause attached.
--
-- There is no `COMMENT` on the following row and there cannot be: a bucket is a
-- ROW in `storage.buckets`, not a schema object, and `COMMENT ON` has nothing to
-- attach to. What the bucket is for is therefore written here, where the next
-- reader of this file will find it: it is a TRANSIT AREA. Its objects live for
-- the length of one strip. Whoever finds an old object in there is looking at an
-- interrupted upload, not at an archive — and plan 35-20 owns the sweep that
-- removes them.

INSERT INTO storage.buckets (id, name, public, file_size_limit)
  VALUES (
    'event-media-quarantine',
    'event-media-quarantine',
    false,
    104857600
  )
  ON CONFLICT DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Who may write into it — the same people as today, and not one more
--
-- The predicate below is the SAME predicate the existing insert policy on the
-- public bucket carries (`20260225120000_phase7_media.sql:70-77`): the bucket
-- id, and an approved status. That policy is named there and is deliberately
-- NOT named here, because naming it would read as this file touching it. It
-- does not.
--
-- The identity of the predicate is the point. `media-and-storage.md`, gate *chi
-- carica ha titolo*, and its imperative *«when widening who may upload: treat it
-- as an access change»*: this step widens NOTHING. It moves where the bytes land
-- first. Anyone who could upload before can upload now; anyone who could not,
-- still cannot. An access change would be a different file, with its own
-- reasoning, in front of a different reader.
--
-- `(SELECT public.get_user_status())` keeps the wrapper the original carries:
-- the sub-select is what makes the call evaluate once per statement instead of
-- once per row (`20260807000000_capability_model.sql:177-184`, measured with
-- EXPLAIN on this database).
--
-- The policy name follows this phase's convention — `<subject>_<verb>_<question>`
-- — rather than the quoted prose names phase 7 gave its storage policies. The
-- divergence is deliberate: an unquoted identifier is greppable, and every
-- policy written since `20260805120000_door_scan_events.sql` uses this form.

DROP POLICY IF EXISTS event_media_quarantine_insert_approved ON storage.objects;

CREATE POLICY event_media_quarantine_insert_approved
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'event-media-quarantine'
    AND (SELECT public.get_user_status()) = 'approved'
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. The two policies this file does NOT create, and the omission IS the design
--
-- There is no read policy and no deletion policy on this bucket, for anybody.
-- Only two other places in this repository omit a policy on purpose
-- (`20260805120000_door_scan_events.sql:158-163` and
-- `20260808002000_membership_register.sql:345-349`), so without this paragraph
-- the next reader takes the gap for a bug and repairs it.
--
-- In a private bucket the protection **is** the absence of a read policy. Add
-- one for `authenticated` and a member can fetch back the file just deposited —
-- which turns the quarantine into a second public bucket with a longer name, and
-- makes a not-yet-stripped file reachable again. That is precisely, and only,
-- what this bucket exists to prevent.
--
-- The server does not need one written for it either. The service role does not
-- go through row-level security at all (`src/lib/supabase/service.ts`), so the
-- route of plan 35-20 reads the object, strips it, writes the result to
-- `event-media` and removes the original without any policy here granting it
-- anything. Writing a permissive policy "for the server" would be granting to
-- everyone in order to serve someone who never asked.
--
-- The direction of the error is the same as everywhere else in this file: if a
-- read cannot be authorised, nothing is read. Fail closed — `venue-secrecy.md`,
-- gate *default chiuso*, which on this path is the rule and not the exception.

COMMIT;
