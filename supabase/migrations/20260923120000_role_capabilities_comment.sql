-- 20260923120000_role_capabilities_comment.sql
--
-- Una migration di solo COMMENT, e la ragione per cui esiste sta nella riga
-- che corregge: il commento scritto da
-- `20260922120000_role_attendee_and_capability_keys.sql:638-639` dice
-- «28 righe: 16 a master, 14 a organizer» — e 16 + 14 fa 30, non 28. I numeri
-- veri sono 15 e 13: misurati due volte nello stesso commit
-- (`scripts/verify-capabilities.mjs`, `EXPECTED_GRANT_COUNT = 28`, cammino su
-- `ROLE_GRANTS` → master 15 / organizer 13) e riletti dalla produzione il
-- 2026-09-22 alle 19:15:55Z. Sedici e quattordici erano i valori PRIMA della
-- cancellazione delle quattro concessioni di `membership.card.view`.
-- Trovato dal code review della fase 51 (WR-05).
--
-- Il file del 2026-09-22 NON si edita: e' applicato in produzione e sul
-- laboratorio, e una migration applicata e' un fatto storico
-- (`supabase-data.md`, gate migration in avanti). Si corregge in avanti, qui.
-- Il testo e' identico a quello del 2026-09-22 tranne i due numeri.
--
-- Nessuna riga toccata, nessun privilegio, nessuna policy: `COMMENT ON` scrive
-- in `pg_description` e basta. Idempotente per costruzione.

COMMENT ON TABLE private.role_capabilities IS
  'Le concessioni per ruolo. Fase 50: la colonna requires_approved e'' stata rimossa insieme a profiles.status — una chiave si tiene o non si tiene, senza un secondo asse. Fase 51 (D-51-06, D-51-07): il ruolo member si chiama attendee, e le chiavi membership.active e membership.card.view sono uscite dal catalogo insieme alla costante CAP che le rispecchiava — il debito dichiarato dalla fase 50 e'' chiuso. 28 righe: 15 a master, 13 a organizer, ZERO a staff e ZERO ad attendee (la migration del 2026-09-22 scriveva 16 e 14, i valori di prima della cancellazione: corretti qui il 2026-09-23). Per attendee e'' voluto, chi compra non lavora. Per staff e'' un''asimmetria dichiarata: cio'' che lo fa lavorare alla porta non e'' piu'' il ruolo ma l''assegnazione alla serata (party_assignments, live_assignment_capabilities), quindi il modo di fallire descritto in 20260808000500:88-94 qui non si applica — ma va riletto prima di aggiungere un ruolo nuovo.';
