---
gsd_state_version: 1.0
milestone: v1.5
milestone_name: Platform Layout, Access Model & Door Fixes
status: executing
stopped_at: Phase 39 code executed — 4 piani, gate automatici verdi; NON chiusa: 39-VERIFICATION.md e' human_needed, criteri 2 e 3 alla serata di fine v1.5 (D-39-07)
last_updated: "2026-08-11T14:29:40.844Z"
last_activity: 2026-08-11 -- Phase 39 executed, verification human_needed
progress:
  total_phases: 13
  completed_phases: 9
  total_plans: 132
  completed_plans: 128
  percent: 69
---

# State: Resonate

## Project Reference

See: .planning/PROJECT.md (updated 2026-08-05)

**Core Value:** Members can discover events, confirm attendance, and buy tickets within a trusted, curated community -- the gating mechanism (referral + approval) is what makes the community valuable.

**Stack:** Next.js 16 + Supabase + Tailwind CSS v4 + PWA (Vercel hosting)

**Current Focus:** Phase 39 — The Door's Own Address

## Current Position

Phase: 39 (The Door's Own Address) — **EXECUTED, NOT CLOSED.** Quattro piani su
quattro, tre onde, gate automatici verdi. `39-VERIFICATION.md` e' `human_needed`:
i criteri 2 e 3 li chiude solo `39-DOOR-PASS.md` §8, alla serata di fine v1.5,
insieme al lotto della fase 38 (D-39-07). Vedi `## Blockers`.

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
Plan: 1 of 4
(contati sui SUMMARY.md presenti su disco, non supposti). Il contatore avanza di
uno per piano, e le onde di questa fase girano in parallelo: `state.begin-phase`
lo riporta a 1 a ogni chiamata, quindi il numero va riletto dai file. **Quindici
SUMMARY su quindici: la fase e' eseguita.** Il piano 37-13 ha chiuso l'onda 7 il
2026-08-11 — con due delle sue misure dichiarate **non eseguibili** invece che
sostituite, e undici voci `human_needed` consolidate nel suo SUMMARY. Le onde 8 e
9 (piani 37-14 e 37-15) hanno chiuso i reperti del code review: CR-01, WR-01,
WR-03, WR-05, WR-06, WR-07, WR-08 e la voce 4 di `deferred-items.md`.
Status: Phase 39 executed — awaiting the end-of-v1.5 sitting (human_needed)
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
Last activity: 2026-08-11 -- Phase 39 execution started

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

- **[Fase 38, decisione del proprietario 2026-08-11] Le sette procedure umane di fase 38 sono DIFFERITE al lotto di fine v1.5**, insieme alle 32 voci `human_needed` di 43, 35 e 34: chiedono tutte la stessa cosa — una sessione con cinque account veri, piu' due telefoni. **Differito non e' verificato:** LIVE-01 e LIVE-06 restano aperti, e i due difetti che solo P5 e P6 possono vedere restano non visti (il canale che si unisce, dice `SUBSCRIBED` e non consegna nulla; il fan-out sulla notte assente che degrada LIVE-01 in LIVE-04 senza un errore da nessuna parte).

  **Il differimento e' sicuro oggi, e la misura e' questa** (sonde read-only, 2026-08-11): `tickets`, `guest_list_entries`, `ticket_refunds` e `door_scan_events` hanno **0 righe in totale**; gli eventi pubblicati sono 2 ma le **serate future pubblicate sono 0** e i **tier in vendita 0**. I quattro trigger sono vivi e nessuna scrittura puo' raggiungerli.

  **UNA voce non segue il lotto, e la sua scadenza e' un atto invece che una data: il primo esercizio del percorso di trigger va fatto PRIMA della prossima serata pubblicata con i biglietti in vendita.** Da quel momento il primo acquisto vero e' il primo esercizio, e senza error tracking un wrapper che sollevasse fuori dalla chiamata a `realtime.send` farebbe fallire l'acquisto senza che nessuno sappia perche'. Serve una scrittura sola — la forma di P6 — non i due telefoni.

  Nota di stato: il client di fase 38 **non e' deployato** (44 commit oltre `origin/main`, nessuno spinto) mentre la migration **e' applicata**. Produzione corre il rischio senza avere il beneficio, ed e' inerte solo finche' regge la misura qui sopra.

- **[Fase 39, 2026-08-11] Il codice e' eseguito, la fase NON e' chiusa — e la roadmap lo diceva sbagliato per qualche minuto.** Quattro piani, tre wave, tutti i gate automatici verdi (`npm run build` exit 0, `verify:routes` PASS, `verify:persona` 7/7). Ma `39-VERIFICATION.md` e' `human_needed`: **i criteri 2 e 3 si chiudono solo con un telefono in una stanza buia**, alla stessa serata di fine v1.5 del lotto qui sopra (D-39-07, che assorbe P1–P5, P7 e il test 8 della fase 38; P6 resta fuori perche' scrive in produzione). `39-DOOR-PASS.md` e' pronto con **ogni `Result` a `pending`**, ed e' lo stato giusto.

  La casella della roadmap era stata marcata `[x] (completed 2026-08-11)` da `roadmap.update-plan-progress` all'atterraggio del quarto SUMMARY, non da `phase.complete`, che non e' mai stato lanciato. **Corretta a `[ ]` con la ragione accanto**: un `[x]` su una fase il cui unico punto e' che non e' ancora provata e' esattamente il fallimento silenzioso che questo repo si e' gia' scritto di non ripetere. La fase 38, nello stesso stato e diretta alla stessa serata, era gia' `[ ]`.

  **Due regole che non sono codice e vanno lette prima di spedire.**
  1. **Il riscaldamento.** `self.__SW_MANIFEST` precacha **zero documenti**: ogni documento offline viene da una cache `NetworkFirst` a 24 h / 32 voci, calda solo da una visita online precedente, e **le chiavi di cache sono URL** — quindi scaldare `/admin/scanner` **non** scalda `/door`. Senza `39-DOOR-PASS.md` §0.5 la stanza buia misura soltanto che al nuovo indirizzo non e' mai passato nessuno.
  2. **La regola di deploy.** L'assertion della mappa in `src/lib/supabase/middleware.ts` e' un `throw` a **module load dentro un bundle di middleware**: scatta alla **prima richiesta dopo il deploy**, non a `npm run build`, e una mappa sbagliata e' un **500 su ogni rotta coperta dal middleware** — webhook dei pagamenti e check-in compresi (WR-04). **Si spedisce in un giorno senza serata, e la prima richiesta la si fa di persona.** Vale anche per la fase 38, che condivide lo stesso arretrato non spinto.

  **Una domanda torna al proprietario DOPO la stanza buia, non prima:** la porta merita una regola di cache runtime piu' lunga di 24 ore? E' una decisione di prodotto su quanto vecchia puo' essere una porta, e il gate della porta dice che una superficie stantia e' un rischio. Si osserva §8, poi `/gsd:discuss-phase` con l'osservazione allegata.

- D7 — il middleware scrive ?redirect= e la pagina di login legge ?next=: la destinazione dopo il login si perde su ogni indirizzo protetto. Pre-esistente, non della fase 36
- D12 — 63 righe di produzione cancellate durante la verifica di fase 36 in sette tabelle (drink_orders 28, drink_tokens 16, drink_items 10, pending_purchases 6, tickets 1, ticket_tiers 1, guest_list_entries 1). Eventi e serate ripristinati byte-identici; queste no. PITR non attivo — decisione del proprietario.
- ~~Fase 37: la lettura anonima degli indirizzi di sede resta APERTA in produzione~~ → **RISOLTO il 2026-08-11.** Seconda migration applicata e arretrato deployato come un atto solo, nell'ordine migration→deploy (l'inverso avrebbe fatto lanciare /events con PGRST202: pagine giu' invece che degradate). `venues_select_public` non esiste piu'; la strada pubblica e' `venue_for_parties`, che concede per serata. Misurato sul sito vero da anonimo senza cookie: 8 aghi dichiarati su 4 documenti reali → 0 occorrenze, mentre il nome del locale della serata NON segreta compare 4 volte negli stessi documenti

## Session Continuity

**Last session:** 2026-08-11T13:30:07.041Z
**Stopped at:** Phase 39 context gathered — /door deciso, vecchio indirizzo permanente, un solo passaggio alla porta a fine v1.5
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
