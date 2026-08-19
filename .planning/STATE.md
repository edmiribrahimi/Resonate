---
gsd_state_version: 1.0
milestone: v1.6
milestone_name: "Piattaforma, non community"
status: phase-executed
stopped_at: "Fase 48 in corso il 2026-08-20 — catalogo e colori fatti (SunSet cancellato, RamaDub #6E8BFF misurato, 184 spazi conservati). L'import del calendario e' APPLICATO ma ha prodotto un RITROVAMENTO: lo strumento vuole una sola istantanea e i file sono due, quindi ognuno marca assente cio' che l'altro ha scritto. NON riapplicare finche' il proprietario non sceglie."
last_updated: "2026-08-19T20:00:00.000Z"
last_activity: "2026-08-19 -- v1.5 archiviata e spedita (tag v1.5, Production success); v1.6 aperta con roadmap in .planning/ROADMAP.md"
progress:
  total_phases: 11
  completed_phases: 0
  total_plans: 6
  completed_plans: 6
  percent: 9
---

# State: Resonate

## Project Reference

See: .planning/PROJECT.md (updated 2026-08-05)

**Core Value:** Members can discover events, confirm attendance, and buy tickets within a trusted, curated community -- the gating mechanism (referral + approval) is what makes the community valuable.

> ⚠ **Questa riga e' vera oggi e smette di esserlo dentro v1.6.** Il perno della
> milestone toglie le iscrizioni e i soci; `DOC-01` la riscrive **in fondo**, non
> adesso, perche' uno stato che descrive un futuro non e' uno stato. Fino ad
> allora la si legge come cio' che il prodotto e' ancora, non come cio' che
> vogliamo che resti.

**Stack:** Next.js 16 + Supabase + Tailwind CSS v4 + PWA (Vercel hosting)

**Current Focus:** v1.6 **48** — catalogo e colori fatti; l'import del calendario e' fermo su un ritrovamento che serve una decisione del proprietario

## Current Position

**Milestone v1.6 aperta il 2026-08-19.** Roadmap scritta in
`.planning/ROADMAP.md`: undici fasi (47..57), due binari — il perno («piattaforma, non
community», decisione del proprietario del 2026-08-14) e l'impianto (undici voci
sulle superfici).

**La fase 47 e' pianificata**: sei piani in tre onde, contesto in
`.planning/phases/47-il-token-che-si-beve-e-si-fa-rimborsare/47-CONTEXT.md`.
L'onda 1 e' 47-01 (la migration), 47-05 (i 5 secondi) e 47-06 (il runbook);
l'onda 2 e' 47-02 (il cron) e 47-03 (la richiesta); l'onda 3 e' 47-04 (la
decisione), che chiude perche' senza il conteggio non ha il dato su cui decidere.

Il difetto che la fase ripara e' stato **riprodotto in laboratorio**, non
dedotto: `deactivate_drink_token` azzera `activated_at`, unica traccia di
un'attivazione, e `purchased` e' lo stato su cui il rimborso seleziona. Referto
in `.planning/v1.6-PHASE-47-PROBE.md`.

Dopo la 47 viene la **48**:
cancellazione di SunSet, RamaDub a `#2B4BE8`, e import del calendario di
produzione dai due `.ics` forniti — con la prova a vuoto letta per intero prima
di qualunque `--apply`.

**Due cose misurate il 2026-08-19 che la pianificazione di 49 deve gia' sapere:**

- l'acquisto di un biglietto parte da `auth.getUser()`
  (`src/app/(public)/events/[slug]/actions.ts:97`) — **non esiste acquisto da
  ospite per i biglietti**, mentre per i drink esiste;
- la pagina della serata legge `userTicket` **al singolare**
  (`src/app/(public)/events/[slug]/page.tsx:640`) — **un ordine con piu'
  biglietti e' una cosa che i biglietti non hanno mai fatto**.

---

# Archivio di sessione — v1.5

*Tutto cio' che segue e' lo stato della v1.5 al momento della sua chiusura,
conservato per intero. La milestone e' archiviata in
`.planning/milestones/v1.5-ROADMAP.md` e verificata in
`.planning/v1.5-MILESTONE-AUDIT.md`.*


# State: Resonate

## Project Reference

See: .planning/PROJECT.md (updated 2026-08-05)

**Core Value:** Members can discover events, confirm attendance, and buy tickets within a trusted, curated community -- the gating mechanism (referral + approval) is what makes the community valuable.

**Stack:** Next.js 16 + Supabase + Tailwind CSS v4 + PWA (Vercel hosting)

**Current Focus:** Phase 42 — scanner-conversion

## Current Position

Phase: 42 (scanner-conversion) — EXECUTING
quattro, tre onde, gate automatici verdi. `39-VERIFICATION.md` e' `human_needed`:
i criteri 2 e 3 li chiude solo `39-DOOR-PASS.md` §8, alla serata di fine v1.5,
insieme al lotto della fase 38 (D-39-07). Vedi `## Deploy della v1.5 — 2026-08-19

**Spedita.** `origin/main` da `033e3c6` a `3e43be5`, 90 commit, piu' il tag
`v1.5`. Deployment GitHub/Vercel: **Production, success**.

**Le condizioni sono state misurate, non ricordate:**

- **Niente di privato nel diff:** `docs/` 0, `.firecrawl/` 0, `.env*` 0, ref del
  laboratorio 0, segreti 0. 75 file, di cui 25 di prodotto.
- **Zero migration nel diff** — il codice non chiede allo schema nulla che non
  abbia gia'. L'ordine migration→deploy non era un rischio in questa spedizione.
- **Giorno senza serata:** letto dal calendario in `docs/` (che resta locale),
  263 voci totali, **0** nella finestra ieri/oggi/domani.
- **Produzione inerte:** 0 serate future, 0 biglietti, 0 acquisti pendenti,
  0 ordini bar, 0 scansioni. Nessuno alla porta mentre si spediva.

**La prima richiesta dopo il deploy e' stata fatta a mano**, come la fase 39
pretende, su **18 rotte piu' 2 API**: pubbliche **200**, protette **307** al
login, `/organizer` **308** (il rewrite della fase 34 e' vivo),
`/api/webhooks/sumup` **405** su GET, `/api/cron/venue-reveal` **401** senza
segreto. **Zero 500** — l'assertion della mappa a module load ha retto.

> **Una cosa scoperta facendolo:** l'apice `resonatemotion.com` risponde **307**
> verso `www.`, su **ogni** rotta comprese le pubbliche. La prima sonda leggeva
> l'apice e dava 307 dappertutto — sembrava un guasto totale ed era un
> reindirizzamento di dominio. **L'host canonico e' `www.`**, ed e' quello su cui
> vanno fatte le prossime sonde.

**Cosa il deploy NON cambia:** le 88 voci `human_needed` restano aperte, il
criterio 3 della fase 42 resta perso, e da oggi **la porta in produzione e'
quella convertita, mai esercitata da nessuno**. Alla prima porta reale,
correzioni mai usate e superficie ridipinta girano insieme, senza error tracking.

## Deferred Items

**Trenta voci riconosciute e differite alla chiusura della v1.5, il 2026-08-19.**
Riconosciute significa **viste e accettate**, non risolte: nessuna di queste è
chiusa da questa chiusura, e la milestone si archivia portandosele dietro
dichiarate.

| Categoria | Voce | Stato |
|---|---|---|
| todo | `form-untick-venue-secret-leaves-no-trace` | aperto — venue-secrecy, access-gating |
| todo | `module-load-throws-500-the-whole-middleware-surface` | aperto |
| todo | `postgrest-details-leaks-the-row` | aperto — access-gating, checkin-offline |
| todo | `profiles-email-not-unique` | aperto |
| uat | `07-UAT.md` | testing |
| uat | `32-HUMAN-UAT.md`, `33-HUMAN-UAT.md`, `35-UAT.md`, `37-HUMAN-UAT.md`, `38-HUMAN-UAT.md`, `39-HUMAN-UAT.md`, `43-HUMAN-UAT.md`, `46-UAT.md` | partial |
| uat | `35-HUMAN-UAT.md` | written |
| verifica | `24-VERIFICATION.md`, `45-VERIFICATION.md` | gaps_found |
| verifica | `05`, `34`, `35`, `37`, `38`, `39`, `40`, `41`, `41.1`, `41.2`, `43`, `44`, `46` | human_needed |
| domanda aperta | `40-CONTEXT.md` | 1 |

**Le tre che pesano più delle altre, e la ragione per cui:**

1. **Il criterio 3 della fase 42 non è chiudibile e non lo sarà mai** — `DEF-42-04`.
   Non è differito: è **perso**. La riga 3m doveva misurare lo scanner non
   convertito, e quel codice non esiste più.
2. **88 voci `human_needed` su dodici verifiche**, tutte della stessa specie.
   **UN DIFETTO SULLA PORTA, trovato il 2026-08-19 e riparato** (`v1.5-LAB-SITTING-5.md`):
   ogni scansione rispondeva `500 Ticket lookup failed` — la QUARTA faccia dello
   stesso `PGRST200`, e la sola sull'unica superficie che non perdona. Non si era
   mai vista perche' la porta non e' mai stata percorsa. Dopo la riparazione la
   porta ha funzionato per la prima volta: `200 recorded`, `403` a chi non e'
   assegnato, `409 already_recorded` alla seconda scansione.
   Sei sedute di laboratorio il 2026-08-19 (`v1.5-LAB-SITTING.md`, `-2.md`,
   `-3.md`, `-4.md`) ne hanno **chiuse 31**, e l'ultima ha aggredito anche le
   fasi mai toccate — 46 (le sei procedure che il proprietario aveva declinato il
   14 agosto e riaperto il 19), 44 P1 e P4, 39 §0-§1, 38 P7 e le due voci
   Critical di 41.1/41.2. **Il conteggio vero delle voci `human_needed` e' 91**,
   non 88: contato dai file, non citato. Delle 41 aggredite ne restano 18:
   **12 non eseguibili in nessun ambiente** (un telefono in una mano, una
   fotocamera, IndexedDB, una stanza buia — piu' `M-43-05/06`, che chiede una
   casella postale vera), **4 bloccate dal Reperto 5**, **2 impossibili per
   costruzione**. Il laboratorio e' stato ricostruito e ricancellato lo stesso
   giorno; la ricetta e ora **anche gli attrezzi** stanno in `42-LAB.md`,
   `scripts/lab-bootstrap.mjs` e `scripts/lab-fidelity.mjs`.
   **Difetti in produzione trovati cosi', che nessun gate aveva visto — e
   RIPARATI il 2026-08-19** (`v1.5-REPAIRS.md`, sei file, zero migration, ognuno
   esercitato in laboratorio prima di essere dichiarato):
   il link d'invito non faceva entrare nessuno; la **rivelazione del venue non
   partiva per nessuna via** — ne' a mano ne' dal cron, perche' il modulo e'
   condiviso; il cron dei promemoria portava lo stesso incorporamento rotto e
   riportava «0 inviati» come successo; e `resend.batch.send` **non lancia** su
   un rifiuto, quindi un lotto respinto veniva contato come inviato e marcava
   `reminder_sent = true` per sempre. Sbloccate anche le voci 2 e 3 della fase 37.
   **Spedite il 2026-08-19**: `origin/main` a `8760340`, deployment Production
   **success**, prima richiesta fatta a mano su 14 rotte piu' 4 API sull'host
   canonico `www.` — pubbliche 200, protette 307, `/set-password` **200**, i due
   cron **401** senza segreto, webhook e finalize **405** su GET. **Zero 500.**
   **Restano aperti per decisione, non per codice:** la riconciliazione di
   `MASTER_EMAIL` che su un accesso con password non gira mai, e la cancellazione
   di un account che ha agito (tocca l'immutabilita' del registro e
   `legal-compliance.md`).
3. **La porta in produzione non è mai stata esercitata**: zero account `staff`,
   zero assegnazioni, zero scansioni. Il meccanismo è provato in laboratorio; la
   sua adozione no.

## Blockers`.

**Fase 38, stato reale al 2026-08-11.** 38-01…38-06 eseguiti, uniti e con build
verde dopo ogni fusione d'onda. **38-07 e' fermo a 1 task su 3**: ha raccolto le
prove meccaniche (9 controlli G, 8 sonde S, build 0) e si e' fermato ai due
checkpoint bloccanti. **P1…P7 sono tutte `pending`, nessuna eseguita.**

**Attenzione al contatore del frontmatter.** `completed_plans` conta i SUMMARY.md
su disco, e 38-07 ne ha scritto uno *fermandosi al checkpoint* — quindi il numero
dice 7 su 7 mentre il lavoro e' 6 su 7. La riga vera e' questa, non quella.

- **Migration `20260811120000_live_attendance_channel.sql` APPLICATA in
  produzione**, versione `20260811111530`, dall'endpoint migrations. Zero righe
  mosse, **dimostrato**: set a cascata camminato su 102 vincoli letti da
  `pg_constraint`, 27 tabelle, 81 righe prima e 81 dopo. Le sette tabelle
  dell'incidente D12 sono dentro il perimetro misurato.

- Autorizzazione del proprietario a scrivere in produzione: concessa il
  2026-08-11 per quella sola applicazione, **spesa alle 11:15:24 UTC ed
  esaurita**. **P6 ne richiede una nuova e separata** — l'esecutore di 38-07 si e'
  fermato prima anche dello snapshot, che sarebbe stato il primo passo di una
  procedura senza permesso di partire.

- **Nessun requisito e' chiuso da cio' che gira qui.** Ogni sonda passa dalla
  Management API come `supabase_read_only_user`, che **scavalca la RLS**: LIVE-06
  resta aperto fino a P7. Quattro trigger in `pg_trigger` non sono un messaggio
  su un filo — LIVE-01 resta aperto fino a P5.

- Due buchi che **solo** una procedura umana puo' vedere: il canale che si unisce,
  dice `SUBSCRIBED` e non consegna nulla (solo P5), e il fan-out sulla notte
  assente che degrada LIVE-01 in LIVE-04 senza un errore da nessuna parte (solo
  P6). In entrambi i casi il paracadute da 5 minuti tiene ogni schermo giusto.
serie e' in produzione dal 2026-08-10** (piano 36-05, versione `20260810144239`):
questa riga diceva ancora "PLANNED, not yet executed" e da oggi sarebbe stata
falsa contro un database.
Plan: 1 of 12
(contati sui SUMMARY.md presenti su disco, non supposti). Il contatore avanza di
uno per piano, e le onde di questa fase girano in parallelo: `state.begin-phase`
lo riporta a 1 a ogni chiamata, quindi il numero va riletto dai file. **Quindici
SUMMARY su quindici: la fase e' eseguita.** Il piano 37-13 ha chiuso l'onda 7 il
2026-08-11 — con due delle sue misure dichiarate **non eseguibili** invece che
sostituite, e undici voci `human_needed` consolidate nel suo SUMMARY. Le onde 8 e
9 (piani 37-14 e 37-15) hanno chiuso i reperti del code review: CR-01, WR-01,
WR-03, WR-05, WR-06, WR-07, WR-08 e la voce 4 di `deferred-items.md`.
Status: Executing Phase 42
scritto «riportato come avvenuto, non misurato da me» — ed era la cosa giusta da
scrivere dalla sua posizione. La misura pero' esiste, ed e' dell'orchestratore
che gliel'aveva riportato:

- **Entrambe le migration applicate.** Schema letto dai **cataloghi**, non dalla
  risposta del `POST`: `venues_select_public` → 0, `venues_select_staff` → 1,
  `venue_for_parties` e `party_start_instant` → 1 ciascuna, `prosecdef = true`,
  `search_path = ""`.

- **Istantanea su 21 tabelle prima e dopo: 21/21 identiche.** Zero righe mosse.
- **`origin/main` a `1dfd6f7` e oltre**, da `b1f1ce9` del 9 agosto. Verificato
  con `git rev-list --left-right --count`: `0 0`.

- **Fuga chiusa, misurata sul sito vero, da anonimo senza cookie:** 8 aghi
  dichiarati su 4 documenti reali → **0 occorrenze**, mentre il nome del locale
  della serata **non** segreta compare 4 volte negli stessi documenti. E' quel
  si' che rende leggibile lo zero.

- **Sonda REST per chiave primaria:** prima `200` con l'indirizzo, dopo `200`
  con zero righe. La strada positiva (`venue_for_parties` su serata non segreta)
  risponde con nome, indirizzo e link Maps.

Verifica umana: ancora aperta, voce 5 di `deferred-items.md`. `VENUE-01` e
`VENUE-02` **non spuntati** — nessuno dei due e' stato esercitato con una
sessione di ruolo vera.

Note:
        14 piani in 9 onde. Plan-checker: **VERIFICATION PASSED, 0 blocker**, un
        warning documentale chiuso prima del commit. Sei requisiti su sei
        coperti; due con prova automatica (le sonde di vincolo), quattro con
        procedure manuali scritte.

        `36-CONTEXT.md` — diciotto decisioni. `36-VISUAL-SOURCE.md` — il sistema
        visivo distillato dal tracker di produzione, che risulta essere gia' un
        design system implementato. `36-UI-SPEC.md` — checker 6/6.
        `36-RESEARCH.md` — 1680 righe misurate. `36-PATTERNS.md` — 15 analoghi
        su 18 file, 3 lacune dichiarate. `36-VALIDATION.md` —
        `nyquist_compliant: false` **deliberato**.

        **Vincolo d'ordine, `[BLOCKING]`:** il baseline `pre-36` (piano 36-01) si
        cattura **prima che esista il file di migration** — un baseline preso
        dopo il cambiamento non e' un baseline. E la sonda di scrittura del
        baseline va allargata (piano 36-04) o smette di misurare in silenzio,
        producendo un verde che significa il contrario.

        **La migration si applica dall'endpoint migrations della Management API**
        (piano 36-05), non con la CLI, che qui non e' installata.

        **Trovato durante la ricerca, ri-misurato in produzione, NON di questa
        fase:** l'indirizzo di una serata con `venue_secret = true` e' leggibile
        con la sola chiave anonima — `venues_select_public` e' `using (true)` e
        `event_parties.venue_id` e' leggibile per gli eventi pubblicati. Todo
        `secret-venue-address-readable-by-anon.md`, **assegnato alla fase 37**
        dal proprietario. Prima di scegliere il rimedio va misurato se lo stesso
        percorso esista anche via `events` o `event_media`.
        → **CHIUSO il 2026-08-11.** La precondizione e' stata eseguita: `events`
        non ha piu' colonne di indirizzo ed `event_media` non e' leggibile da
        `anon`, quindi la porta RLS era una sola. Rimedio applicato e **misurato
        sul sito vero**: 8 aghi dichiarati, 0 occorrenze su 4 documenti reali. Il
        todo e' in `.planning/todos/completed/`.

        **Fasi 31, 32, 33, 43, 35, 34: 92/92 piani eseguiti.** Il disco e questo
        file concordano dal 2026-08-10; fino a quel giorno questo blocco
        dichiarava ancora la fase 34 in esecuzione al piano 1 di 17.

        **Ramo:** `gsd/phase-32-capability-model-in-the-database`. ~~82 commit
        oltre `origin/main`. Niente e' stato spinto.~~ **Superato il 2026-08-11:
        tutto e' stato spinto.** `origin/main` e' passato da `b1f1ce9` (9 agosto)
        alla punta del ramo — 230+ commit, le fasi 34, 36 e 37 insieme — e Vercel
        ha deployato. Locale e remoto allineati (`0 0`). La riga e' rovesciata
        qui invece che cancellata: un ramo «mai spinto» che diventa la produzione
        e' il genere di cambiamento che chi rilegge deve vedere accadere.

        **Debito di verifica aperto — 32 voci `human_needed`,** tutte della
        stessa specie: nessuno strumento di questo repository puo' autenticarsi
        come un ruolo. `43-VERIFICATION.md` 14 · `35-VERIFICATION.md` 9 ·
        `34-VERIFICATION.md` 9. Una sessione con cinque account — master,
        organizer/approved, organizer/pending seminato a mano, staff, member —
        ne chiude la maggior parte. La fase 36 costruisce superfici pubbliche
        sopra quel modello: il debito non e' suo, ma le sta sotto.
Last activity: 2026-08-18 -- Phase 42 execution started

**Phase 31: EXECUTED, NOT VERIFIED.** 13 of 13 plans, 61 commits on
`gsd/phase-31-live-defects-at-the-door-and-the-bar`. One of its four blocking
checkpoints is now closed (the migration is applied); three remain, plus the RLS
half of the fourth. `31-VALIDATION.md` keeps `nyquist_compliant: false`
deliberately.

Progress: [██████████] 100%
          phase 32 — 11 plans, 0 executed

## Decisions

Fixed by the project owner before planning — not re-opened at plan time:

- Live freshness uses a **push channel**, not polling — mandatory full reload on every reconnection, infrequent safety reload underneath (Phase 38)
- Undoing a check-in requires a **supervising capability** — door-only assignment cannot undo (Phase 35)
- Venue reveal stays scheduled **plus** a manual path for master and organizer, confirmed and recorded (Phase 37)
- The interface stays **English only** — no translation work this milestone
- [Phase 36]: Il baseline `pre-36` e' catturato su entrambi i bersagli **prima** che
  esista un file di migration di fase 36 — la precondizione e' asserita da un comando
  incatenato alla cattura, non dichiarata a memoria. Figure di partenza: 72 policy,
  23 tabelle con RLS, **1/1** sonde di vincolo che rifiutano come dichiarato

- [Phase 36]: La serata del 7 feb 2026, primo tempo, e' l'atto di apertura della notte e non un'edizione: stesso format e stessa serie della notte, NESSUN numero (proprietario, 2026-08-10)
- [Phase 36]: number resta nullable su event_parties mentre format_id e series_id diventano NOT NULL — una serata senza numero e' un atto e non ha sigla propria; la guardia della migration conta solo i format_id nulli
- [Phase 36]: Le due notti in archivio sono RSNT-001 e RSNT-002, confermate contro la controprova RSNT-008 citata in production-calendar.md:86 — da qui in poi la numerazione e' monotona
- [Phase 36]: Cinque nomi di serie autorizzati per un file pubblico: re:sonate, re:sonate x Perlone, RamaDub x Booze, RamaDub x Muro, SunSet. MotionLab parte senza serie e l'assenza e' il punto
- [Phase 36]: Il nome pubblico della serie di Nizza e' 're:sonate x Perlone'; production-calendar.md scrive ancora 'Resonate x Perlone' e va allineato come aggiornamento del modulo persona, fuori da questa fase
- [Phase 36]: la migration di format e serie e' scritta e verificata in container, NON applicata. Le colonne stanno prima della RLS: la policy nomina ep.series_id, e Postgres rifiuta una policy che legge una colonna inesistente
- [Phase 36]: il join della policy delle serie e' qualificato — ep.series_id = party_series.id. La forma non qualificata sarebbe USING (true) travestita
- [Phase 36]: 36-06: EventParty.number e' number | null — la migration mette NOT NULL su due colonne di tre; una notte che e' l'atto di un'altra notte non ha progressivo
- [Phase 36]: 36-06: /admin/formats legato a catalogue.manage (non organizer.access): requires_approved sposta il rifiuto all'indirizzo invece che su ogni bottone
- [Phase 36]: 36-06: la tab Formats rimandata al piano che crea la pagina (36-09) — StaffTab.href e' Route, un indirizzo statico entra nell'unione generata solo dopo che una page.tsx lo serve
- [Phase 36]: 36-04: la sonda di scrittura risolve il formato della serie come referenza derivata privilegiata, non come sotto-select — catalogue.manage pretende approved, e quattro celle oggi ok:1 sarebbero diventate 23502
- [Phase 36]: 36-04: punto container catturato. 966 celle di scrittura e 322 di lettura preesistenti IDENTICHE, zero 23502; sonde di vincolo che rifiutano come dichiarato **3/3**, era 1/1. `party_series_select_published` non e' mai stato esercitato come concessione: il container non pubblica eventi
- [Phase 36]: 36-05: migration APPLICATA in produzione dall'endpoint migrations, versione `20260810144239`. I diciotto scarti della history precedono la fase; non e' stata aggiunta la diciannovesima, e ripararli resta una chiamata del proprietario (`PUT` fa upsert senza applicare)
- [Phase 36]: 36-05: `party_series_select_published` visto CONCEDERE per la prima volta — con la chiave anonima la produzione restituisce UNA serie su sei (`RSNT`, l'unica con una serata pubblicata). Le cinque invisibili — `BZ`, `MR`, `PRLN`, `SNST`, `UNCL` — includono le quattro che portano un luogo nel nome. Prova a livello di identita' di riga (`pk_md5`), non di conteggio
- [Phase 36]: 36-05: `event_parties_select_published` byte-identico fra `pre-36` e `post-36` (md5 `43e7f547`), 72 policy preesistenti su 72 immobili, 322 celle di lettura condivise con 0 mosse. Le tre serate portano l'assegnazione confermata da 36-02 e il format di ripiego tiene **0** righe
- [Phase 36]: 36-11: il cancello sul nome di un marker usa la BANDIERA MEMORIZZATA `venue_secret`, non `isVenueVisible` — dei due candidati vince il piu' stretto (`venue-secrecy.md`, default chiuso), e il predicato e' dichiarato nel codice. `!== false`, cosi' una riga mancante o un join fallito valgono come segreto
- [Phase 36]: 36-11: un embed PostgREST di `party_series` attraverso `event_parties` deve portare `!event_parties_series_id_fkey`. MISURATO contro la produzione con la chiave anonima: la forma non qualificata risponde `HTTP 300 PGRST201` — due relazioni esistono — e fallisce in SILENZIO, perche' PostgREST restituisce `data: null` senza eccezione e la pagina renderebbe «nessun evento»
- [Phase 36]: 36-11: la riga dei chip non riceve i risultati. La garanzia che nessuna proprieta' di un chip dipenda dai dati e' la LISTA DELLE PROP, non una regola da ricordare: uno slug ritirato che esiste davvero si comporta identico a uno inventato (misurato), e nessun conteggio raggiunge una label, un `aria-label` o un `title`
- [Phase 36]: 36-10: la categoria di un rifiuto viaggia come VALORE di ritorno e mai come messaggio lanciato — Next redige i messaggi delle Server Action in produzione
- [Phase 36]: 36-10: i tre campi di catalogo stanno anche sul blocco a serata singola, perche' anche quello scrive una riga di event_parties
- [Phase 36]: 36-08: le tabelle dei rifiuti sono ristrette ai rifiuti raggiungibili invece che totali su CatalogueRefusal — un Record totale avrebbe scritto nel modale il token che il gate 'questo form non puo' annunciare un format' vieta
- [Phase 36]: 36-08: il vincolo sul gradiente e' reso inesprimibile invece che validato — il controllo colore offre solo campiture piatte e non esiste input attraverso cui un gradiente possa arrivare
- [Phase 36]: 36-08: il catch dei due modali ramifica sulla FORMA del fallimento, non sul messaggio, perche' una build di produzione redige il messaggio di un errore lanciato da una Server Action
- [Phase ?]: 36-09: la mappa dei colori presi esclude i format ritirati — l'indice di unicita' e' parziale su retired_at IS NULL, e la scelta e' stata verificata aprendo la pagina, non dal build
- [Phase ?]: 36-09: nessuna scrittura su produzione per fabbricare un verde — il rifiuto color_taken sul ripristino resta dichiarato come D8
- [Phase 36]: V3: la sessione e' stata coniata con la service key su autorizzazione esplicita e datata del proprietario (2026-08-10), dopo che l'esecutore si e' fermato a chiederla invece di procurarsela — Nessuno strumento del repository puo' autenticarsi come un ruolo (rls-baseline simula le persona via set_config). La strada alternativa — copiare il profilo Chrome del proprietario — e' un'estrazione di credenziali e non era autorizzata. Sessione revocata globalmente a fine procedura e revoca verificata.
- [Phase 36]: V3: la serata seminata porta number NULL, contro un criterio del piano che lo vuole non nullo — bump_series_watermark alza highest_assigned con GREATEST e non lo abbassa mai, nemmeno cancellando la serata: un numero avrebbe lasciato un salto permanente nel progressivo di una serie, prodotto da un test, su una delle tre guardie monotone. Il campo non e' obbligatorio e il form dichiara quella forma nel placeholder.
- [Phase ?]: D-36-19 onorata: i sei FMT-* spuntati una volta sola, dalla verifica di fase, con l'evidenza accanto a ciascuno
- [Phase ?]: nyquist_compliant di fase 36 resta false: cinque requisiti su sei si provano solo a mano
- [Phase 37]: ~~applicata SOLO la prima delle due migration in produzione (versione 20260810210214). 20260810161000_venues_read_narrowed.sql resta applicata a zero per scelta del proprietario: revocare anon su public.venues rompe le pagine pubbliche SENZA deploy (sono tutte dinamiche) mentre la riparazione (37-05/37-06) ne richiede uno, e il ramo di lavoro e' 181 commit avanti a origin/main~~ → **SUPERATA il 2026-08-11.** Entrambe le migration sono applicate: la history di produzione porta `20260811001927 venues_read_narrowed`, applicata alle 00:19. Questa riga contraddiceva il blocco Blockers piu' in basso, che gia' dichiarava la fuga chiusa e la seconda migration applicata. La divergenza e' stata **misurata** dalla cattura del baseline di fase 38 (piano 38-01, poi ri-letta da 38-04), non dedotta. Rovesciata invece che cancellata: una decisione superata senza la sua ragione si rilegge come una svista
- [Phase 37]: Inventario cascate corretto: 18 tabelle da event_parties, non 17 — discount_code_tiers arriva a due salti, via discount_codes e via ticket_tiers
- [Phase 37]: 37-10: il rifiuto di un percorso di segretezza torna come VALORE, mai come messaggio lanciato — Next redige i messaggi di una Server Action in produzione
- [Phase 37]: 37-10: un conteggio che alimenta un atto irreversibile dichiara se ha potuto misurare (unavailable), non solo quanto
- [Phase 37]: 37-10: nessun secondo verdetto sul ruolo — re_hide_requires_master lo decide la funzione SQL, che legge il ruolo al proprio interno
- [Phase 37]: 37-14: su una bozza chi ha staff.manage vede il nome del locale — is_published governa i quattro rami del pubblico e non quello dello staff. Non e' un allargamento: quella chiave legge gia' public.venues per venues_select_staff, misurato da 37-13 (0 righe dalla funzione, 2 leggendo diretto)
- [Phase 37]: 37-14: la precondizione della rivelazione manuale e' la SEDE COLLEGATA (venue_id), non il testo libero — la strada pubblica verso un indirizzo fa JOIN public.venues ON v.id = ep.venue_id, e una serata con solo testo libero spenderebbe l'interruttore su un segnaposto
- [Phase 37]: 37-14: cambiare la sede di una serata gia' rivelata e' rifiutato con una categoria propria (venue_link_locked), non sotto la frase di venue_secret_locked — le due mandano la persona in due posti diversi
- [Phase 37]: 37-14: sulla lettura dell'evento in pagina pubblica anche il fallimento di trasporto viene lanciato, non degradato — li' l'unica alternativa alla verita' e' dichiarare a un visitatore, e a un crawler, che l'evento non esiste

- [Phase 37]: D-37-30 — il ripiego a invii singoli degrada UNA volta e non ritenta oltre: un singolo che fallisce da solo e' un fatto da riportare, e il conteggio dei mancanti e' gia' il posto dove viene riportato
- [Phase 37]: D-37-31 — nessuna costante di pacing nel ripiego. La funzione gira dentro un cron con un budget di orologio: dormire scambierebbe «qualche persona non raggiunta» con «la corsa muore e ogni serata successiva resta non raggiunta»
- [Phase 37]: D-37-32 — l'orizzonte di `retryOutlook` e' «ripremere adesso», ed e' cio' che rende decidibile la classificazione delle quote: il tempo le libera, un secondo clic no
- [Phase 37]: D-37-33 — l'aggregato di `retryOutlook` pende verso `may_help`: fra dire «smetti di provare» a chi poteva ancora essere raggiunto e invitare un tentativo inutile, venue-secrecy.md ha gia' dichiarato quale delle due costa di piu'
- [Phase 37]: D-37-34 — i riportabili del cron sono un `Record` TOTALE sull'unione, non una lista di tre nomi: una lista risponde per oggi e non dice niente sul prossimo membro
- [Phase 37]: D-37-35 — `updateVenue` tipizza anche i due rifiuti del gate, non solo i due del database: il bottone e' disegnato per ogni organizer mentre la scrittura pretende lo stato approvato, quindi quel rifiuto e' raggiungibile con una pressione ordinaria

## Accumulated Context

### Key Files

- `src/lib/supabase/middleware.ts` -- session refresh + role/status resolution (header injection removed in Phase 33)
- `src/lib/offline/checkin-store.ts` -- IndexedDB offline store (clear-and-replace bug, Phase 31)
- `src/lib/offline/sync-manager.ts` -- offline sync queue (deletes conflict evidence, Phase 31)
- `src/app/api/tickets/checkin/route.ts` -- ticket QR check-in (conflict encoded as HTTP 200)
- `src/app/api/membership/verify/route.ts` -- membership QR verify + attendance
- `src/app/(admin)/admin/scanner/ScannerClient.tsx` -- scanner client (converted last, Phase 42)
- `src/app/api/cron/venue-reveal/**` -- scheduled reveal (manual path added Phase 37)
- `supabase/migrations/**` -- the actual security boundary; capability model lands here (Phase 32)
- `src/app/sw.ts` -- service worker (release wholeness, Phase 40; door precache, Phase 39)

### Notes

- Production data is nearly empty (2 events, 3 parties, 1 ticket, 4 profiles) — the safest moment for a deep change
- No test runner: verification is `npm run build` plus written manual procedures, including a dark-venue network-off door pass
- FIX-01 and FIX-02 were applied on 2026-08-05, ahead of the roadmap; they remain mapped to Phase 31 and are marked complete

## Blockers

()

- **[Fase 42, 2026-08-18] DEROGA DEL PROPRIETARIO: il cancello d'ordine e' stato scavalcato, e il criterio 3 non e' piu' chiudibile.** Le onde 3-8 sono state eseguite con la riga 3m di `42-PROCEDURES.md` a `pending`. La riga era il primo *prima* che questo progetto avrebbe mai avuto per il comportamento della porta; non essendo stata presa mentre lo scanner era non convertito, **non e' piu' prendibile**. Decisione del proprietario, con il costo enunciato prima della scelta e l'alternativa (seduta di laboratorio con 3m e 3n appaiati) disponibile e non presa. Registrata in `DEF-42-04`, nel blocco di deroga di `42-PROCEDURES.md` riga 3m e nel commit. **Cio' che la deroga NON copre:** alla prima porta reale, correzioni di comportamento mai esercitate (fasi 31 e 39) e una superficie ridipinta gireranno insieme, e questo repository non ha error tracking.

- **[Fase 42, 2026-08-18 — SUPERATO dalla deroga qui sopra] Sette piani su dodici erano FERMI, e la loro scadenza era un atto invece che una data.** Onde 0, 1 e 2 eseguite e fuse su `main` (piani 42-01 … 42-05): il gate `verify:conversion` torna a misurare (exit 2 -> 0), il reperto pre-conversione dello scanner esiste ed e' riproducibile byte per byte, il gate di leggibilita' e' scritto e provato per mutazione, la tabella delle sostituzioni e' decisa, e i meccanismi di deroga esistono **prima** della corsa che li userebbe. Gate post-merge dopo ogni onda: `npm run build` 0, `verify:conversion` 0, `verify:persona` 7/7. **Zero file sotto `src/` toccati in tutte e tre le onde** — misurato con `git diff --name-only`, non ricordato.

  **Le onde 3-8 (`42-06` … `42-12`) portano `blocked_on: the-door-pass-on-the-unconverted-scanner`.** Il vincolo viene dagli *Ordering Constraints* del roadmap: lo scanner si converte per ultimo, e **solo dopo che le correzioni di comportamento della porta (31, 39) hanno girato a una serata vera**. Al 2026-08-18 quella serata non c'e' stata: la 39 e' in produzione dal 14 agosto, ma `/door` non e' mai stato esercitato da nessuno. Il door pass e' `39-DOOR-PASS.md` §8 piu' le dieci procedure di `42-PROCEDURES.md`, tutte `Result: pending`.

  **Perche' non e' scheduling.** Una conversione spedita prima non rende il criterio 3 piu' difficile: lo rende **impossibile**, perche' la linea di base andrebbe presa su codice che non esisterebbe piu'. E la prima porta reale girerebbe insieme su correzioni mai usate e su una superficie ridipinta, senza error tracking a dire quale delle due ha ceduto.

  **Due guardie d'ordine restano deliberatamente chiuse, e un verde oggi le violerebbe:** `verify-scan-legibility.mjs` **non e' registrato** in `verify-all.mjs` ne' in `package.json` (verificato: zero occorrenze in entrambi) — registrato ora misurerebbe la terna di oggi, minimo 2,1, e resterebbe rosso per settimane; `PHASE_42_PATHS` resta **chiuso**, le due pagine della porta ancora nel bucket *fenced*. Si aprono entrambe con l'onda che cambia il colore, mai prima.

  **Tre reperti dell'onda 0-1 che i piani a valle ereditano, e che correggono cio' che era scritto:** l'arbitrato del colore non ha un vincitore fra le due misure precedenti — su tre celle **sbagliano entrambe**, e rifiuta-contro-terzo-stato vale 33,1 e non 38,4; con l'ambra, accetta-contro-terzo-stato in protanopia sta a **7,0**, non a 10,2; i bersagli tattili sono **quattordici** e il piano ne elencava dieci, quindi chi avesse pagato «i dieci elencati» avrebbe lasciato quattro rossi dentro l'onda che prometteva di chiuderli.

  **Tre voci differite aperte, nessuna chiudibile da un agente:** DEF-42-01 (le sei superfici di produzione delle fasi 44/45 appartengono al perimetro della 42? decisione del proprietario), DEF-42-02, DEF-42-03 (quattordici bersagli sotto i 44px sulla porta — chiede un piano proprio, dietro lo stesso vincolo d'ordine).

- **[Fase 38, decisione del proprietario 2026-08-11] Le sette procedure umane di fase 38 sono DIFFERITE al lotto di fine v1.5**, insieme alle 32 voci `human_needed` di 43, 35 e 34: chiedono tutte la stessa cosa — una sessione con cinque account veri, piu' due telefoni. **Differito non e' verificato:** LIVE-01 e LIVE-06 restano aperti, e i due difetti che solo P5 e P6 possono vedere restano non visti (il canale che si unisce, dice `SUBSCRIBED` e non consegna nulla; il fan-out sulla notte assente che degrada LIVE-01 in LIVE-04 senza un errore da nessuna parte).

  **Il differimento e' sicuro oggi, e la misura e' questa** (sonde read-only, 2026-08-11): `tickets`, `guest_list_entries`, `ticket_refunds` e `door_scan_events` hanno **0 righe in totale**; gli eventi pubblicati sono 2 ma le **serate future pubblicate sono 0** e i **tier in vendita 0**. I quattro trigger sono vivi e nessuna scrittura puo' raggiungerli.

  **UNA voce non segue il lotto, e la sua scadenza e' un atto invece che una data: il primo esercizio del percorso di trigger va fatto PRIMA della prossima serata pubblicata con i biglietti in vendita.** Da quel momento il primo acquisto vero e' il primo esercizio, e senza error tracking un wrapper che sollevasse fuori dalla chiamata a `realtime.send` farebbe fallire l'acquisto senza che nessuno sappia perche'. Serve una scrittura sola — la forma di P6 — non i due telefoni.

  Nota di stato: il client di fase 38 **non e' deployato** (44 commit oltre `origin/main`, nessuno spinto) mentre la migration **e' applicata**. Produzione corre il rischio senza avere il beneficio, ed e' inerte solo finche' regge la misura qui sopra.

- **[Fase 39, 2026-08-11] Il codice e' eseguito, la fase NON e' chiusa — e la roadmap lo diceva sbagliato per qualche minuto.** Quattro piani, tre wave, tutti i gate automatici verdi (`npm run build` exit 0, `verify:routes` PASS, `verify:persona` 7/7). Ma `39-VERIFICATION.md` e' `human_needed`: **i criteri 2 e 3 si chiudono solo con un telefono in una stanza buia**, alla stessa serata di fine v1.5 del lotto qui sopra (D-39-07, che assorbe P1–P5, P7 e il test 8 della fase 38; P6 resta fuori perche' scrive in produzione). `39-DOOR-PASS.md` e' pronto con **ogni `Result` a `pending`**, ed e' lo stato giusto.

  La casella della roadmap era stata marcata `[x] (completed 2026-08-11)` da `roadmap.update-plan-progress` all'atterraggio del quarto SUMMARY, non da `phase.complete`, che non e' mai stato lanciato. **Corretta a `[ ]` con la ragione accanto**: un `[x]` su una fase il cui unico punto e' che non e' ancora provata e' esattamente il fallimento silenzioso che questo repo si e' gia' scritto di non ripetere. La fase 38, nello stesso stato e diretta alla stessa serata, era gia' `[ ]`.

  **Due regole che non sono codice e vanno lette prima di spedire.**

  1. **Il riscaldamento.** `self.__SW_MANIFEST` precacha **zero documenti**: ogni documento offline viene da una cache `NetworkFirst` a 24 h / 32 voci, calda solo da una visita online precedente, e **le chiavi di cache sono URL** — quindi scaldare `/admin/scanner` **non** scalda `/door`. Senza `39-DOOR-PASS.md` §0.5 la stanza buia misura soltanto che al nuovo indirizzo non e' mai passato nessuno.
  2. **La regola di deploy.** L'assertion della mappa in `src/lib/supabase/middleware.ts` e' un `throw` a **module load dentro un bundle di middleware**: scatta alla **prima richiesta dopo il deploy**, non a `npm run build`, e una mappa sbagliata e' un **500 su ogni rotta coperta dal middleware** — webhook dei pagamenti e check-in compresi (WR-04). **Si spedisce in un giorno senza serata, e la prima richiesta la si fa di persona.** Vale anche per la fase 38, che condivide lo stesso arretrato non spinto.

  **La domanda sulla cache e' CHIUSA, e in anticipo sulla stanza buia.** Chiesto al proprietario l'11 agosto: la porta merita una regola di cache runtime piu' lunga di 24 ore? **No.** Nessun codice cambia; cambia lo stato del numero — 24 ore e' il tetto **scelto**, non il default ereditato. **Conseguenza accettata: il riscaldamento non e' un passo di migrazione, e' un costo di ogni serata**, e il gate `l'indirizzo che si scalda e' quello che si usera'` non scade con questa fase. Scritto in `.claude/rules/checkin-offline.md` (persona 1.11.1) cosi' si carica sulla porta invece di vivere in un documento di fase. **Cosa il no NON chiude:** il tetto di 32 voci LRU e' un'altra domanda — un documento della porta puo' essere sfrattato *dentro* la finestra, e in quale bucket competa resta `OQ2`, una lettura da fare in §0.5.

- **[2026-08-14] L'ARRETRATO E' DEPLOYATO.** `origin/main` da `2029a10` (11 agosto) a
  `5d5f1ff`: **619 commit, 177 file di prodotto, cinque fasi** — 38 (live attendance),
  39 (l'indirizzo della porta), 40 (brand tokens), 41 + 41.1 + 41.2 (conversione
  visiva), 46 (fallimenti silenziosi sul denaro). Le riparazioni del percorso del
  denaro sono in produzione: fino a oggi produzione girava il codice che taceva.

  **Le condizioni erano soddisfatte, e sono state misurate prima di premere, non
  ricordate:** build verde; `verify:persona` 7/7; `docs/` e `.firecrawl/` ignorati e
  zero file tracciati al loro interno; **ordine migration→deploy gia' corretto** — la
  sola migration del diff, `live_attendance_channel`, era applicata in produzione
  dall'11 agosto (versione `20260811111530`, letta dalla history, non da questo file),
  quindi il codice non chiedeva nulla che lo schema non avesse.

  **La finestra, letta dalla produzione:** 0 serate future pubblicate (l'ultima e'
  l'8 maggio), 0 biglietti, 0 ordini bar, 0 scansioni alla porta, 0 acquisti pendenti.
  Nessuno alla porta mentre si spediva.

  **Il rischio del deploy e' CHIUSO.** L'assertion della mappa in
  `src/lib/supabase/middleware.ts:197` e' un `throw` a module load: scatta alla prima
  richiesta, non a `npm run build`, e una mappa sbagliata sarebbe stata **500 su ogni
  rotta coperta dal middleware**, webhook SumUp e check-in compresi. La prima richiesta
  e' stata fatta deliberatamente, su tredici rotte piu' due API: **nessun 500**.
  Pubbliche 200; protette 307 al login; `/organizer` → 308 a `/admin/events` (il
  rewrite dei vecchi indirizzi della fase 34 e' vivo); `/api/webhooks/sumup` 405 su GET;
  `/api/cron/venue-reveal` 401 senza segreto.

  **Marcatore usato, invece di contare i minuti:** `/door` rispondeva **404** prima del
  deploy — l'indirizzo della fase 39 non era mai stato in produzione — e ha smesso di
  esserlo dopo. E' quel cambiamento a datare l'atterraggio.

  **Cosa il deploy NON chiude:** le 83 voci `human_needed` restano tutte aperte. Ed e'
  cambiato il verso dell'urgenza della fase 39: **da oggi la porta in produzione e'
  quella nuova, e `/door` non e' mai stato esercitato da nessuno.**

- **D7 — MISURATO IN PRODUZIONE il 2026-08-14, non piu' solo dedotto.** Il middleware
  scrive `?redirect=` e la pagina di login legge `?next=`: la destinazione dopo il
  login si perde su ogni indirizzo protetto. Osservato dal vivo nella prima richiesta:
  `/door` → `/login?redirect=%2Fdoor`, mentre `src/app/(auth)/login/page.tsx:64` legge
  `next`. Il difetto e' **dichiarato nel codice** che lo produce
  (`src/lib/supabase/middleware.ts:519`), quindi e' noto e non nuovo — pre-esistente,
  non della fase 36. **Cio' che e' nuovo e' dove arriva:** `/door` e' fra gli indirizzi
  che lo subiscono, quindi uno staff che apre la porta e deve autenticarsi **non torna
  alla porta** dopo il login. Alle due di notte, davanti a una fila, con la rete che
  non prende. Da guardare **prima** del door pass, perche' il door pass lo incontrera'
  al primo passo e si fermera' li'.

- D12 — 63 righe di produzione cancellate durante la verifica di fase 36 in sette tabelle (drink_orders 28, drink_tokens 16, drink_items 10, pending_purchases 6, tickets 1, ticket_tiers 1, guest_list_entries 1). Eventi e serate ripristinati byte-identici; queste no. PITR non attivo — decisione del proprietario.
- ~~Fase 37: la lettura anonima degli indirizzi di sede resta APERTA in produzione~~ → **RISOLTO il 2026-08-11.** Seconda migration applicata e arretrato deployato come un atto solo, nell'ordine migration→deploy (l'inverso avrebbe fatto lanciare /events con PGRST202: pagine giu' invece che degradate). `venues_select_public` non esiste piu'; la strada pubblica e' `venue_for_parties`, che concede per serata. Misurato sul sito vero da anonimo senza cookie: 8 aghi dichiarati su 4 documenti reali → 0 occorrenze, mentre il nome del locale della serata NON segreta compare 4 volte negli stessi documenti

## Session Continuity

**Last session:** 2026-08-17T16:02:46.308Z
**Stopped at:** Phase 45 context gathered
commits on `gsd/phase-31-live-defects-at-the-door-and-the-bar`. Branch not merged,
nothing pushed. `main` is 14 commits ahead of `origin/main`.

**Owner decision this session:** staff always get in — the door decides on role
alone, and `updateMemberRole` sets `status = 'approved'` when it grants the
organizer role. Demotion does not revoke approval.

**Found and fixed mid-phase:** the service worker was never built in production
(`@serwist/next` is a webpack plugin, Next 16 builds with Turbopack). `npm run
build` is now `next build --webpack`. v1.4's "IndexedDB + service worker" was only
ever the IndexedDB half.

**Found and recorded, not fixed:** none of the four Supabase clients is
parameterised with `Database`, so no column name in any query is checked by the
build. This narrows what a green build means everywhere, not only in phase 31.

**Working rule, set by the owner on 2026-08-06.** During construction, a
verification checkpoint is deferred unless its outcome changes *what we write*.
Applying the migration was necessary immediately — the refund probe's result
decided a clause of the migration itself, and phases 32+ write against that
schema. Checks that merely validate an already-made, easily reversible choice —
a colour read in the dark, a cache bucket on a phone, a door pass — are collected
and run at the end. **Deferred is not verified:** this file and
`31-VERIFICATION.md` must keep saying which of the two each one is.

*One exception to watch:* a check whose failure destroys **data** rather than code
stops being deferrable once that data exists. The IndexedDB v2→v3 upgrade must be
exercised **before the first real night**, not at some abstract end of
construction. Today no staff phone holds a v2 database with real check-ins,
because no event is published — which is precisely why the rule is safe now.

**Manual work owed, batched by the owner's choice** — see `31-VERIFICATION.md`:

1. ~~Apply the phase 31 migration~~ — **DONE 2026-08-06.** Applied through the
   Supabase Management API's migrations endpoint (`SUPABASE_ACCESS_TOKEN` is in
   `.env.local`; the CLI is still not installed), recorded as version
   `20260806111113`, eight structural observations verified. **Doing it revealed a
   third foreign key to `tickets` that no plan had seen — `pending_purchases`, the
   SumUp payment record — still `NO ACTION` and blocking the refund's delete. The
   migration was corrected before being applied.**
   **Still owed:** confirm a logged-in member reads **zero rows** from
   `door_scan_events`. The Management API bypasses RLS, so no query of mine can
   settle it — only a real member session can.

2. The `apis` cache check on a phone, production build
3. The dark-room amber-versus-yellow legibility check
4. The door pass — six scans, radio off, plus the IndexedDB v2→v3 upgrade on a
   device that already holds a v2 database

**Migrations can now be applied from here.** `POST /v1/projects/{ref}/database/migrations`
with the access token — the migrations endpoint, **not** `/database/query`, so the
project's migration history stays truthful. Note a pre-existing drift found while
doing it: `20260508000000_drink_token_active_state.sql` is applied in production
but absent from the history (its content was verified present). Repairing that is
the owner's call; `PUT` on the same endpoint upserts without applying.

**Next step:** `/gsd-execute-phase 32`. Note the command form: GSD is installed as
user skills here, so it is `/gsd-…` with a hyphen — the `gsd:` plugin namespace
does not exist on this machine, though GSD's own generated text uses it.

---
*State initialized: 2026-03-10 — v1.5 roadmap 2026-08-05*

### Roadmap Evolution

- **2026-08-11 — Fasi 44 e 45 aggiunte alla v1.5** (decisione del proprietario), in
  esecuzione **dopo la 42**. Portano PROD-01 e PROD-02, promossi fuori da
  *Future Requirements*: erano differiti per una ragione dichiarata ciascuno —
  PROD-01 aspettava il modello delle capability **e** quello dei format, PROD-02 le
  sole capability — e **entrambe le ragioni sono scadute** con le fasi 32
  (2026-08-06) e 36 (2026-08-10). Un differimento la cui ragione e' scaduta non e'
  piu' una decisione che qualcuno sta prendendo.

  - **Fase 44** — il calendario di produzione entra nel prodotto: import nel
    database, **mai attraverso il repository**, che e' pubblico.

  - **Fase 45** — ogni sezione di produzione ha il proprio diritto d'accesso,
    perche' non portano lo stesso rischio: lo scouting tiene trattative aperte, il
    sistema visivo non tiene niente di segreto.

  - **Perche' dopo il visivo e non prima:** e' la regola che la fase 41 scrive su
    se' stessa — una superficie si converte intera o non si converte. La sezione
    Produzione e' il piu' grande insieme di superfici nuove del progetto;
    costruirla prima dei token e dei componenti condivisi creerebbe il piu' grande
    mezzo-convertito del prodotto e costringerebbe 41 e 42 a riaprire ogni schermo
    appena scritto.

  - **Vincolo che viaggia con la decisione:** «gli stessi layout dell'artifact»
    significa la stessa **costruzione**, mai lo stesso **contenuto**. I mockup
    contengono nomi di sede, line-up e date; `docs/` e `.firecrawl/` sono in
    `.gitignore` apposta e il controllo F di `verify:persona` lo verifica.
