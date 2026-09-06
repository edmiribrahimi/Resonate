-- =============================================================================
-- Fase 49 — l'indirizzo lo legge chi ha un biglietto per QUELLA serata
-- =============================================================================
--
-- DECISIONE DEL PROPRIETARIO, 2026-09-05 — scelta `stringi`.
--
-- La domanda gli e' stata posta con queste parole, ed e' trascritta qui perche'
-- una decisione senza la sua domanda, riletta fra sei mesi, si legge come una
-- preferenza:
--
--   «Chi ha comprato un biglietto per una serata puo' leggere l'indirizzo di
--    tutte le altre. Oggi non succede perche' gli approvati sono quattro; dalla
--    fase 49 lo diventa ogni acquirente. Cosa facciamo?»
--
-- SI RESTRINGE E NON SI ALLARGA — `venue-secrecy.md`, e la direzione consentita
-- da una guardia monotona e' una sola.
--
-- Le due opzioni disponibili e non prese, con il loro costo, stanno in
-- `.planning/phases/49-comprare-senza-account/49-PERIMETER.md`. Non si
-- riassumono qui: una scelta di cui si e' persa l'alternativa non e' piu'
-- rileggibile come scelta, e il posto dove l'alternativa vive e' quel documento.
--
-- COSA CAMBIA, ED E' UNA COSA SOLA.
--
-- L'arm 5 concedeva a chiunque avesse il proprio `public.profiles.status` a
-- «approved» — SENZA ALCUN BIGLIETTO, e per QUALUNQUE serata segreta
-- pubblicata — appena si apriva la finestra della rivelazione, o appena
-- qualcuno rivelava a mano, o a serata iniziata.
--
-- Dopo, la condizione temporale e' IDENTICA — i suoi tre termini non si toccano,
-- compreso il terzo — e cambia soltanto CHI: non piu' «un profilo approvato», ma
-- **chi ha un biglietto per QUELLA serata**.
--
-- Perche' contava adesso e non fra sei mesi. Il ramo esiste dal 2026-08-10
-- (livello 2 di D-37-02, preso allora con il costo scritto). Il 2026-08-22 quel
-- livello e' stato tolto DALLA PAGINA e la funzione non e' stata riscritta con
-- lei: la divergenza e' quindi PREESISTENTE a questa fase. Cio' che questa fase
-- fa non e' aprirla — e' MOLTIPLICARNE LA POPOLAZIONE, perche'
-- `src/app/api/webhooks/sumup/route.ts` porta allo stato approvato ogni
-- acquirente. In produzione i profili sono quattro; dopo sarebbero stati quanti
-- i clienti, per sempre, anche per le serate a cui non vanno.
--
-- COSA NON CAMBIA, ED E' TUTTO IL RESTO.
--
-- Gli arm 1, 2, 3 e 4 sono riportati parola per parola dal corpo installato,
-- letto da `pg_get_functiondef` il 2026-09-06 e trovato identico al file
-- `20260810161000_venues_read_narrowed.sql`. Una funzione non si modifica per
-- rami: si sostituisce intera, quindi i rami che non cambiano vanno ricopiati —
-- e ricopiarli dalla FONTE INSTALLATA invece che dal ricordo e' la ragione per
-- cui il corpo e' stato riletto prima di scrivere questo file.
--
-- In particolare **l'arm 2 non si tocca**, ed e' il ramo che serve i ruoli con
-- titolarita' sulla serata: `master` e `organizer` tengono `staff.manage` per
-- concessione di ruolo (`private.role_capabilities`, letta dal catalogo), e
-- leggono l'indirizzo da li' — sopra il pavimento della pubblicazione, quindi
-- anche su un evento in bozza. Hanno inoltre un secondo cammino indipendente da
-- questa funzione: la policy `venues_select_staff` su `public.venues`.
--
-- LA CONSEGUENZA ACCETTATA, SCRITTA E NON SCOPERTA.
--
-- **Si toglie qualcosa a chi oggi ce l'ha.** Un profilo approvato senza
-- biglietto per quella serata smette di leggere l'indirizzo DA QUESTO RAMO. In
-- produzione, misurato il 2026-09-06: sono i due profili con ruolo `member`, che
-- passano da tre serate lette su tre (due segrete) a una sola, la non segreta,
-- dall'arm 1.
--
-- E un caso che merita di essere nominato invece che evocato: l'arm 2 chiama
-- `private.has_capability('staff.manage')` **senza passare `p_party_id`**, e il
-- ramo per-serata di quella funzione e' condizionato a `p_party_id is not null`.
-- Quindi l'arm 2 risponde alla sola concessione per RUOLO, mai a
-- un'assegnazione per serata: una persona con ruolo `member` assegnata alla
-- porta non e' servita dall'arm 2 e, dopo questa migration, non legge
-- l'indirizzo da questa funzione. Oggi `public.party_assignments` ha zero righe
-- e non esiste alcun conto con ruolo staff, quindi nessuno e' in quella
-- situazione — ma quando la porta verra' esercitata la prima volta, e' li' che
-- si guarda.
--
-- L'UNICO ANGOLO IN CUI QUESTO CAMBIO ALLARGA, DICHIARATO PERCHE' LA GUARDIA
-- MONOTONA LO PRETENDE.
--
-- Il nuovo arm 5 non e' un sottoinsieme perfetto del vecchio, e l'angolo e'
-- questo: **il titolare di un biglietto il cui profilo NON e' approvato**, su una
-- serata con `venue_reveal_on_purchase = false`, dopo il momento della
-- rivelazione. Prima non lo leggeva da nessun ramo — l'arm 3 e' chiuso dal flag,
-- l'arm 5 dallo stato. Dopo lo legge dall'arm 5.
--
-- E' voluto, e non e' una svista: il cron della rivelazione tratta gia' come
-- titolare chiunque abbia un biglietto, **senza leggere ruolo ne' stato**, e
-- gli spedisce l'indirizzo. La tabella riscritta il 2026-08-22 in
-- `venue-secrecy.md` dice *«la pagina del proprio biglietto: il venue, appena la
-- rivelazione scatta»* — e non nomina lo stato. Un ramo che rifiutasse a quella
-- persona cio' che la posta le ha gia' mandato sarebbe la divergenza, non
-- l'allineamento. E' inoltre coerente con `D-49-03`, che rende il biglietto **al
-- portatore**: e' il biglietto a dare diritto, non chi lo tiene.
--
-- L'insieme e' **vuoto oggi** (`public.tickets` ha zero righe) e resta minuscolo
-- dopo, perche' il webhook approva chi paga. Sta scritto qui e nel messaggio di
-- commit perche' la guardia monotona chiede che un allargamento, anche di un
-- angolo, sia autorizzato ed esplicito — e questo rientra alla lettera nel
-- perimetro autorizzato il 2026-09-06, che descrive la migration come *«l'arm 5
-- guarda un biglietto per quella serata invece di `profiles.status`»*.
--
-- PERCHE' NON C'E' NESSUN `REVOKE` E NESSUN `GRANT` QUI SOTTO.
--
-- `CREATE OR REPLACE FUNCTION` su una firma identica **conserva l'ACL**. Il
-- catalogo, riletto il 2026-09-06, porta
-- `{postgres=X, anon=X, authenticated=X, service_role=X}`, e `anon` ci sta PER
-- DECISIONE: e' l'unica strada pubblica verso un indirizzo, e restringe
-- internamente — per un chiamante anonimo `auth.uid()` e' nullo, quindi gli arm
-- 3, 4 e 5 non possono che rispondere falso, e `private.has_capability` non
-- trova profilo. Riemettere la coppia REVOKE/GRANT non aggiungerebbe nulla e
-- darebbe due occasioni di sbagliare su un oggetto del cammino del venue.
-- **I permessi non si toccano: si rileggono dopo.**
-- =============================================================================

CREATE OR REPLACE FUNCTION public.venue_for_parties(
  p_party_ids uuid[]
) RETURNS TABLE (
  party_id        uuid,
  venue_id        uuid,
  name            text,
  slug            text,
  address         text,
  google_maps_url text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT
    ep.id,
    v.id,
    v.name,
    v.slug,
    v.address,
    v.google_maps_url
  FROM public.event_parties ep
  JOIN public.events e ON e.id = ep.event_id
  JOIN public.venues v ON v.id = ep.venue_id
  WHERE ep.id = ANY(p_party_ids)
    AND (
      -- ARM 2 — staff. INVARIATO. Ricopiato dal corpo installato, non riscritto.
      -- Vale `event.created_by`-piu'-largo e policy-rimossa-piu'-stretto come
      -- documentato in `20260810161000_venues_read_narrowed.sql:398-414`: qui
      -- non si ridiscute, si conserva.
      --
      -- Sta FUORI dal pavimento della pubblicazione, e la posizione e' la
      -- decisione: e' l'unico ramo che una serata in bozza risponde. Il numero
      -- del ramo resta 5-su-5 di D-37-02: rinumerarli romperebbe ogni
      -- riferimento scritto nella fase 37 e in questa.
      (select private.has_capability('staff.manage'))

      OR (
        -- IL PAVIMENTO DELLA PUBBLICAZIONE, sotto i quattro rami pubblici e
        -- solo quelli. Un evento non pubblicato non risponde a chi non e' staff.
        e.is_published
        AND (
          -- ARM 1 — la serata non e' segreta (D-37-24). INVARIATO. Vero anche
          -- per un lettore senza alcuna sessione, ed e' la decisione: e' il
          -- comportamento di oggi e coincide con le locandine, che il nome di un
          -- locale pubblico lo scrivono per esteso.
          ep.venue_secret = false

          -- ARM 3 — un biglietto per questa serata, o un biglietto MASTER per il
          -- suo evento (`party_id IS NULL`), **e solo dove l'acquisto e'
          -- configurato per sbloccare l'indirizzo**. INVARIATO.
          --
          -- `coalesce(…, true)` e non una lettura nuda, perche' e' la semantica
          -- della pagina e non una scelta presa qui: la colonna e' un `boolean`
          -- annullabile con `DEFAULT true`, e la pagina la normalizza con
          -- `?? true` prima che il predicato la veda. Una lettura nuda
          -- varrebbe NULL — quindi non-vero — su ogni riga anteriore al default,
          -- e il ramo si chiuderebbe in silenzio per un titolare a cui la pagina
          -- l'indirizzo lo mostra.
          OR (
            coalesce(ep.venue_reveal_on_purchase, true)
            AND EXISTS (
              SELECT 1
              FROM public.tickets t
              WHERE t.user_id = (select auth.uid())
                AND (
                  t.party_id = ep.id
                  OR (t.party_id IS NULL AND t.event_id = ep.event_id)
                )
            )
          )

          -- ARM 4 — un RSVP per questa serata (D-37-10). INVARIATO.
          --
          -- Deliberatamente NON sotto `venue_reveal_on_purchase`: un RSVP non e'
          -- un acquisto, e appenderlo a quel flag significherebbe che spegnerlo
          -- toglie l'indirizzo a chi ha detto che viene MENTRE IL CRON CONTINUA
          -- A SPEDIRGLIELO — che e' esattamente l'asimmetria che l'arm 4 chiude.
          OR EXISTS (
            SELECT 1
            FROM public.rsvps r
            WHERE r.user_id = (select auth.uid())
              AND r.party_id = ep.id
          )

          -- ARM 5 — RISCRITTO, ed e' l'unica differenza di questa migration.
          -- Decisione del proprietario del 2026-09-05, scelta `stringi`.
          -- SI RESTRINGE E NON SI ALLARGA — `venue-secrecy.md`, e la direzione
          -- consentita da una guardia monotona e' una sola.
          --
          -- PRIMA: `EXISTS (SELECT 1 FROM public.profiles p WHERE p.id =
          -- auth.uid() AND p.status …)` letto come approvato — cioe' uno STATO,
          -- senza guardare a quale serata.
          -- ADESSO: **un biglietto per QUESTA serata**, o un biglietto master per
          -- il suo evento.
          --
          -- Il secondo ramo dell'OR — `party_id IS NULL AND event_id` — c'e'
          -- perche' un biglietto «master» vale per l'evento intero: escluderlo
          -- toglierebbe l'indirizzo a chi ha pagato per esserci, che e' l'errore
          -- nella direzione sbagliata. E' la stessa coppia di forme che l'arm 3
          -- usa e che il cron della rivelazione tratta gia' come titolarita':
          -- letta da li', non ri-derivata.
          --
          -- `EXISTS` e non una sottoquery scalare, e non e' un dettaglio di
          -- stile. Dal piano 49-01 gli unici indici unici rimasti su
          -- `public.tickets` sono la chiave primaria e i due parziali ristretti
          -- a `order_id IS NULL`: **un biglietto che appartiene a un ordine non
          -- e' piu' unico per (serata, utente)**, che e' il punto di `BUY-01`.
          -- Una scalare che assumesse una riga sola fallirebbe alla prima
          -- persona che ne compra due per la stessa serata — cioe' al caso che
          -- questa fase esiste per rendere possibile.
          --
          -- LA CONDIZIONE TEMPORALE E' IDENTICA A PRIMA. I tre termini non si
          -- toccano:
          --   * `venue_revealed_at IS NOT NULL` — l'atto manuale. E' cio' che
          --     rende il bottone OSSERVABILE: premuto prima della finestra, la
          --     pagina si apre. Deliberatamente NON `venue_reveal_email_sent`,
          --     che il cron alza anche su una serata con ZERO destinatari —
          --     quel booleano aprirebbe una serata soltanto spazzata.
          --   * la finestra — `now()` oltre `inizio - venue_reveal_hours`.
          --   * la serata e' iniziata. Sembra assorbito dal secondo e NON lo e':
          --     su un `venue_reveal_hours` negativo — la colonna e' un `integer`
          --     nudo senza `CHECK` — il termine della finestra apre DOPO la
          --     porta, mentre questo apre ANCORA alla porta. Si conserva.
          --
          -- Su `coalesce(ep.venue_reveal_hours, 25)`: e' la SECONDA CASA di quel
          -- numero. La prima e' `DEFAULT_VENUE_REVEAL_HOURS` in
          -- `src/utils/datetime.ts`. Postgres non importa TypeScript, quindi la
          -- duplicazione e' inevitabile e percio' DICHIARATA invece che subita.
          -- 25 e non 24 perche' il piano e' Hobby: il cron gira una volta al
          -- giorno con +-59 minuti di jitter, quindi due esecuzioni consecutive
          -- possono distare 24h59m e una finestra di 24 ore non e' garantita
          -- contenerne una.
          OR (
            EXISTS (
              SELECT 1
              FROM public.tickets t
              WHERE t.user_id = (select auth.uid())
                AND (
                  t.party_id = ep.id
                  OR (t.party_id IS NULL AND t.event_id = ep.event_id)
                )
            )
            AND (
              ep.venue_revealed_at IS NOT NULL
              OR now() >= public.party_start_instant(ep.date, ep.time)
                   - make_interval(hours => coalesce(ep.venue_reveal_hours, 25))
              OR now() > public.party_start_instant(ep.date, ep.time)
            )
          )
        )
      )
    );
$$;

COMMENT ON FUNCTION public.venue_for_parties(uuid[]) IS
  'The ONE public road to a venue address, and it decides PER NIGHT, never per venue. '
  'A night is returned with all four venue fields or not at all: absent means NO ENTITLEMENT, and the caller renders the hint. '
  'Five arms: (1) the night is not secret; (2) staff.manage; '
  '(3) a ticket for the night or a master ticket for its event, AND venue_reveal_on_purchase (coalesced to true), which is the same conjunction the page predicate applies; '
  '(4) an RSVP for the night, deliberately NOT gated on venue_reveal_on_purchase since an RSVP is not a purchase (D-37-10); '
  '(5) A TICKET FOR THIS NIGHT - or a master ticket for its event - once venue_revealed_at is set, or at the reveal window, or after the night has started. '
  'ARM 5 WAS REWRITTEN IN PHASE 49 (owner decision, 2026-09-05, option ''stringi''). It used to grant on profiles.status alone, with no ticket and for ANY published secret night. '
  'The webhook raises every buyer to that state, so from phase 49 the arm would have grown with the customer list, silently, for nights they do not attend. '
  'It narrows and does not widen - venue-secrecy.md, and a monotone guard allows one direction only. The three temporal terms are UNCHANGED. '
  'The one corner where it widens is DECLARED: a ticket holder whose profile is not approved, on a night with venue_reveal_on_purchase false, after the reveal - refused before, granted now. '
  'That matches the cron, which already mails the address to any ticket holder without reading role or status, and D-49-03, which makes the ticket a bearer instrument. '
  'events.is_published gates arms 1, 3, 4 and 5 and NOT arm 2: on a DRAFT event only staff.manage is answered. '
  'Arm 2 answers the ROLE grant of staff.manage only - it passes no p_party_id, so a per-night party_assignment never opens it. '
  'SECURITY DEFINER with no subject argument: it resolves the caller itself and cannot be asked about anybody else. '
  'THE 25 IN coalesce(venue_reveal_hours, 25) LIVES IN TWO PLACES - here and DEFAULT_VENUE_REVEAL_HOURS in src/utils/datetime.ts. '
  'Postgres cannot import TypeScript. Changing one without the other does not fail loudly: it moves a window, and behind this window is an address.';
