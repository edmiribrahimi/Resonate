# Roadmap: Resonate

## Completed Milestones

- [x] **v1.0** -- Trust-gated music events community: RBAC, referral/approval, SumUp ticketing, event media, branded emails (7 phases, 22 plans, 45 requirements) -- [archive](.planning/milestones/v1.0-ROADMAP.md)
- [x] **v1.1** -- SumUp embedded checkout + drink ordering system: embedded payments, drink menu CRUD, token redemption with anti-fraud, public QR menu for guests (5 phases, 9 plans, 18 requirements) -- [archive](.planning/milestones/v1.1-ROADMAP.md)
- [x] **v1.2** -- SumUp API deep integration: official SDK, admin finance dashboard, refunds, APMs (Satispay/MyBank/Apple Pay/Google Pay), menu closing + auto-refund (7 phases, 12 plans, 33 requirements) -- [archive](.planning/milestones/v1.2-ROADMAP.md)
- [x] **v1.3** -- Refinement & Intelligence: analytics (PostHog + Recharts dashboards), layout elegance (motion, skeletons, toast), guest list management, discount codes, navigation consolidation (9 phases, 19 plans, 60 requirements) -- [archive](.planning/milestones/v1.3-ROADMAP.md)
- [x] **v1.4** -- Check-in Overhaul: party selection, continuous QR scanner with flash/haptic, offline support, membership door check-in (2 phases, 5 plans, 16 requirements) -- [archive](.planning/milestones/v1.4-ROADMAP.md)
- [x] **v1.5** -- Platform Layout, Access Model & Door Fixes: capability model in the database, server data-access layer, fourth role, per-night assignments, one work surface, format model, brand tokens, production calendar and sections (18 phases, 261 plans, 76 requirements) -- **archiviata con debito dichiarato, non `passed`** -- [archive](.planning/milestones/v1.5-ROADMAP.md) - [audit](.planning/v1.5-MILESTONE-AUDIT.md)

---

# Milestone v1.6 — Piattaforma, non community

## Overview

v1.6 fa due cose che sembrano indipendenti e non lo sono.

**Il perno.** re:sonate smette di essere una community e diventa una
piattaforma: nessuno si iscrive piu', entrano solo organizer e staff, e l'app
diventa il posto dove si guardano gli eventi, si comprano i biglietti, si
guardano foto e video e si ascoltano i LiveCut. E' una decisione del
proprietario del **2026-08-14**, presa per essere aperta subito dopo la chiusura
della v1.5.

**L'impianto.** Undici voci sulle superfici: il catalogo dei format allineato
alla realta', la barra di navigazione con i suoi due pulsanti nuovi, la sezione
TASK, la sezione Location portata alla parita' con il tracker di produzione, le
pagine visual per format, e un servizio navetta.

**Perche' stanno nella stessa milestone e in quest'ordine.** L'impianto
costruisce cancelli, e il perno smonta i ruoli e gli stati su cui quei cancelli
si appoggerebbero. Costruire la barra di navigazione prima del perno significa
costruirla due volte: una per un mondo con `member` e `pending`, e una per il
mondo senza. Il proprietario lo ha deciso esplicitamente il 2026-08-19:
*«dentro v1.6, smonta anche il perno»*.

**Il vincolo che il perno impone a tutto il resto:** niente cancelli nuovi su
`status`. E' un valore che sta per smettere di variare, e un gate costruito su
di esso e' un gate che nasce gia' morto. Dove un cancello su `status` fosse
inevitabile per coerenza con le superfici accanto, va **dichiarato come debito
che questa milestone rimuove**, non lasciato implicito.

### Il fatto che ha cambiato la forma del perno

Misurato il 2026-08-19, prima di pianificare: **oggi non si puo' comprare un
biglietto senza account.** L'acquisto parte da `auth.getUser()`
(`src/app/(public)/events/[slug]/actions.ts:97`), e la pagina della serata legge
`userTicket` **al singolare** (`src/app/(public)/events/[slug]/page.tsx:640`):
un account, un biglietto, perche' l'account *e'* l'identita'.

Ne discendono due cose che non erano nella richiesta e che il perno non puo'
evitare:

1. **L'acquisto da ospite va costruito PRIMA di togliere le iscrizioni**, o
   esiste una finestra in cui l'app non vende piu' niente.

2. **Un ordine con piu' biglietti e' una cosa che i biglietti non hanno mai
   fatto.** I drink si': hanno ordini con piu' voci, il token in `localStorage`
   e `claimGuestOrders`. Quello e' il precedente da seguire, e sta gia' in
   questo codice.

## Phases

> **Numerazione: 47 → 57, e non riparte da uno.** I numeri di fase **continuano
> attraverso le milestone** — v1.3 ha chiuso a 28, v1.4 a 30, v1.5 a 46 — e le
> cartelle sotto `.planning/phases/` portano quel numero. Durante la
> conversazione che ha prodotto questa roadmap le fasi sono state chiamate
> `F0..F10`: quella numerazione **non esiste piu'**, e' stata corretta prima di
> qualunque citazione fuori da questo file, ed e' l'ultimo momento in cui era
> lecito farlo. Da qui in avanti **nessuna fase viene rinumerata**.

Execution order **is** the list order. Un numero di fase e' un'identita', non
una posizione: vale la stessa regola della v1.5 e nessuna fase viene rinumerata
per assecondare una decisione presa dopo che e' stata citata.

- [ ] **47** — Il token che si beve e si fa rimborsare (`DRK`) — **difetto vivo, va per primo** · *pianificata 2026-08-19: 6 piani, 3 onde*
- [ ] **48** — Il catalogo dei format dice la verita' (`CAT`)
- [ ] **49** — Comprare senza account (`BUY`)
- [x] **50** — Via le iscrizioni (`REG`) — chiusa il 2026-09-21: 12 piani, VERIFICATION passed, produzione aggiornata
- [x] **51** — Via le superfici da socio, e la porta (`MEM`) — chiusa il 2026-09-23: VERIFICATION passed, spinta e dispiegata
- [x] **52** — La barra di navigazione e i ritocchi (`NAV`) — chiusa il 2026-09-23: 19 piani, VERIFICATION passed (approvata dal proprietario), in produzione dal 18:28:33Z; debito dichiarato → fase 52.1
- [ ] **52.1** — Chiusura del debito della fase 52 (`DBT`) — **inserita il 2026-09-23**: il debito di `52-VERIFICATION.md` e gli avvisi di `52-REVIEW.md`, DBT-04..07, 09, 10, 13, 14 (DBT-01/02/03/08/11/12 ritirati alle 20:30Z: via la gallery)
- [ ] **52.2** — Il carrello che non si chiude, e il rimborsato alla porta (`CART`, `RFD`) — **inserita il 2026-09-30**: sospesi chiusi con la verita' di SumUp, ripresa dello stesso ordine, una sola mail a +1h (Garante), rimborsato avvisato e poi rifiutato alla porta; indipendente dalla 52.1
- [ ] **52.3** — La pagina Music: i LiveCut delle nostre serate (`MUS`) — **inserita il 2026-09-30**: ricerca con screenshot prima della forma, pagina pubblica per serata e slot, un player caricato al play, niente genere e niente venue segreto, prima sul laboratorio; i diritti al legale prima del primo LiveCut reale
- [ ] **53** — TASK (`TASK`)
- [ ] **54** — Location, alla pari con il tracker (`LOC`)
- [ ] **55** — Visual, una pagina per format (`VIS`)
- [ ] **56** — La navetta (`SHTL`)
- [ ] **57** — I documenti che ancora difendono la community (`DOC`)
- [ ] **58** — Il calendario e' uno specchio (`ICS`) — *aperta e riscritta il 2026-08-20; toglie la riconciliazione al centro, e dopo la ricerca guadagna la sorgente per link e lo specchio automatico*

---

## Phase Details

### Phase 58: Il calendario e' uno specchio

Aperta dai tre ritrovamenti della fase 48 e **riscritta il 2026-08-20**, dopo una
domanda del proprietario: *«il calendario deve semplicemente riportare cosa e'
scritto nel calendario, senza tutte queste riconciliazioni — a cosa servono?»*

**La risposta e' stata misurata invece che argomentata**, e gli ha dato ragione:

| cosa la riconciliazione protegge | quante ce n'erano |
|---|---|
| spunte di checklist | 14 voci, **0 spuntate** |
| legami con una serata pubblicata | 2 piani, **0 legati** |
| proposte della regola | **6** |

**Una sola delle tre esisteva.** La riconciliazione stava difendendo stati che non
c'erano ancora, e nel farlo rompeva l'unica cosa che c'era: ha prodotto 66 assenze
false, poi 17 timbri che non si toglievano, e un'asimmetria fra tabelle che
esisteva solo per gestirle.

| ID | Requisito |
|---|---|
| **ICS-01** | Cio' che viene dal calendario e' **uno specchio**: si cancella e si riscrive dal file. Nessun timbro di assenza, nessuna divergenza, nessun aggiornamento campo per campo. Una voce che il file non porta piu' **non c'e' piu'**. |
| **ICS-01b** | La guardia sul **progressivo** sopravvive allo specchio: un `source_uid` gia' noto che arriva con un numero diverso fa **rifiutare** l'import, che **non scrive niente** e nomina la serata e i due numeri. Una rinumerazione voluta passa da una **riautorizzazione esplicita**, che si registra nel referto. *(D-58-01.)* |
| **ICS-02** | Lo specchio e' **ristretto al calendario che si sta importando**. Importare il satellite non tocca le righe della notte. Lo scopo si **dichiara** — arriva dalla sorgente registrata, mai dedotto dal contenuto ne' dal nome del file — e senza di esso l'import **rifiuta**, senza default. Vocabolario **chiuso** di tre chiavi, una per format: `rsnt`, `rmdb`, `mtnlb`; ogni aggiunta futura e' una migration dichiarata, e **nessuna chiave nomina uno spazio**. *(D-58-06.)* |
| **ICS-03** | **Due sole eccezioni di stato, nominate**: le **spunte** di checklist e il **legame con una serata pubblicata**. Si riagganciano per `source_uid`, non si ricreano, e un ripristino **conserva chi aveva spuntato**. Nessuna terza eccezione senza che qualcuno la dichiari qui. |
| **ICS-03b** | Una eccezione di **sopravvivenza**, distinta dalle due di stato: una riga di piano che porta un **legame con una serata pubblicata non si cancella mai**, qualunque cosa dica il file. Il referto **conta** le righe sopravvissute a un'assenza. *(D-58-02.)* |
| **ICS-04** | I titoli si leggono: un **nome** dove la grammatica canonica pretende la sigla si risolve dalla mappa degli alias che gia' esiste. |
| **ICS-05** | Un pezzo **senza numero** si aggancia alla serata **dalla data**, nella direzione che la regola di pipeline dichiara. |
| **ICS-06** | Le **proposte** — date che la regola calcola e il file non porta — **si ricalcolano a ogni import**, e la superficie lo dichiara invece di lasciarle sembrare durevoli. |
| **ICS-07** | La riga che fa fallire l'audit del referto quando si scrive una proposta e' **riscritta**. L'audit non si allarga. |
| **ICS-08** | `Timetable` nudo e' un **pezzo della notte**, agganciato per data dalla sua regola gia' esistente (`RSNT / timetable / self / on`). Se quel giorno non porta una serata classificata, l'esito e' **non classificata** — visibile. *(D-58-03.)* |
| **ICS-08b** | `Flyering` diventa il **settimo tipo di pezzo**: `PIECE_KINDS`, `PIECE_KIND_LABELS`, il `CHECK` di `production_piece`, il `CHECK` di `production_pipeline_rule` e `database.ts` cambiano **nello stesso commit**. La sua regola di ancora **non e' mai stata misurata**: il piano decide se nasce o se il tipo esiste senza regola, dichiarandolo. *(D-58-04.)* |
| **ICS-09** | La **sorgente e' un indirizzo**, non un file esportato a mano: ogni calendario si registra una volta con la sua chiave. Il link vive **solo** in variabile d'ambiente — mai nel repo, mai in `.planning/`, mai nel referto, mai nei log — e senza sorgente registrata l'import **rifiuta**. *(D-58-05.)* |
| **ICS-10** | Lo specchio **gira da solo**, e le sue due guardie sono la ragione per cui e' accettabile: **(a)** un feed vuoto o drasticamente piu' piccolo del precedente fa **rifiutare** senza cancellare niente; **(b)** l'esito e l'ora dell'**ultimo specchio riuscito per chiave** sono **visibili su una superficie**, e un fallimento e' distinguibile da «non e' ancora girato». Il percorso e' autenticato. *(D-58-05; questo progetto non ha error tracking, quindi un log non e' un effetto osservabile.)* |
| **ICS-10b** | Il cron gira **sulla piattaforma**, il che **rovescia meta' di `D-44-26`**: il `.ics` transita da un server. Le cinque difese che sostituiscono la superficie che non esisteva sono **requisiti**, non intenzioni — il corpo del feed non si stampa mai, nessuna persistenza ne' cache, errori **per categoria senza riecheggiare il contenuto**, il link registrato come segreto **host compreso**, e **nessun controllo di caricamento** sulla superficie (l'altra meta' di `D-44-26` non cade). Un controllo sul sorgente prova la prima, o non esiste. *(D-58-07.)* |

**Goal:** cio' che viene dal calendario si cancella e si riscrive dal file, per
quel calendario — con due sole eccezioni di stato nominate, una di sopravvivenza,
e una lettura dei titoli che capisce cosa sta specchiando.

**Plans:** 12 plans in 9 waves

Plans:

- [x] 58-01-PLAN.md — i due gate sintetici (grammatica dei titoli · guardie dello specchio), rossi e non registrati *(onda 0)*
- [x] 58-02-PLAN.md — le tre procedure `P-58-A`/`P-58-B`/`P-58-C` e le misure d'apertura, prese prima che lo specchio le cancelli *(onda 0)*
- [x] 58-03-PLAN.md — `ICS-04` + `ICS-05`: un nome dove va la sigla, e il numero che si trova *(onda 1)*
- [x] 58-04-PLAN.md — `ICS-06`: le proposte si ricalcolano, e la superficie lo dice *(onda 1)*
- [x] 58-05-PLAN.md — `ICS-07`: nessun identificativo grezzo nel referto *(onda 1)*
- [x] 58-06-PLAN.md — `ICS-08` + `ICS-08b`: la timetable e' un pezzo, il volantinaggio e' il settimo tipo *(onda 2)*
- [x] 58-07-PLAN.md — `ICS-02`: la chiave di calendario, chiusa da un `CHECK` e indicizzata *(onda 3)*
- [x] 58-08-PLAN.md — `ICS-01`/`ICS-03`/`ICS-03b`: lo specchio nel modulo puro, in sottrazione *(onda 4)*
- [x] 58-09-PLAN.md — lo scrittore che cancella: rifiuti in ordine, istantanea, riaggancio, guardia del progressivo *(onda 5)*
- [x] 58-10-PLAN.md — `ICS-09` + `ICS-10a`: la sorgente e' un indirizzo, e la guardia del feed *(onda 6)*
- [x] 58-11-PLAN.md — il primo specchio, a mano, con autorizzazione datata *(onda 7, checkpoint bloccante)*
  > **CHIUSO il 2026-08-22**, dopo essere stato chiuso parzialmente il 2026-08-20. *(Il 20:)* lo specchio ha girato presidiato su due chiavi (`rsnt` con il passaggio una tantum, poi `rmdb`), i conteggi sono stati riconfermati **dal catalogo**, e la chiave di calendario e' `NOT NULL` sulle tre tabelle specchiate — versione `20260820205137`, riverificata dal catalogo il 22. *(Il 22:)* **`P-58-A` e `P-58-B` sono ESEGUITE** — diciassette `Result` con un'osservazione, e i sette pendenti sono **tutti e soli** quelli di `P-58-C`, che e' un rientro. **`ICS-03` e `ICS-03b` sono chiusi dall'evidenza di una procedura**; `ICS-01`, `ICS-01b`, `ICS-02` e `ICS-07` erano gia' chiusi.
  > ⚠ **Due cose restano aperte e sono nominate invece che arrotondate.** *(a)* La **superficie** resta irraggiungibile da chi esegue — i passi 14, 19 e 24 dichiarano una seconda lettura **non presa** (voce 11-bis). *(b)* Lo specchio **riaggancia le spunte e non gli annullamenti**, e la guardia della corsa non presidiata legge la stessa lista: **e' un prerequisito del 58-12, non un lavoro futuro** (voce 21).

- [x] 58-12-PLAN.md — `ICS-10`/`ICS-10b`: il cron e i tre stati per chiave sulla superficie *(onda 8)*

> **L'ordine delle onde non e' libero.** La lettura dei titoli va **prima** dello
> specchio (uno specchio che capisce il 70% del file cancellerebbe e
> riscriverebbe il 70% del file); `P-58-C` si scrive **prima** del primo
> `--apply`; il primo specchio gira **a mano** prima che il cron lo faccia girare
> senza nessuno che guardi.

> **Questa fase toglie codice al centro e ne aggiunge ai bordi.** Spariscono le
> assenze, le divergenze, l'asimmetria fra tabelle e i 17 timbri falsi — che non
> esisterebbero. Resta la lettura dei titoli, che serve comunque: **uno specchio
> che non capisce cosa sta specchiando riporta 31 voci su 104 come «non
> classificate»**.
>
> **E il 2026-08-20 il proprietario ha allargato il perimetro**, in due punti
> misurabili: `ICS-08b` apre una lista di tipi che era chiusa per scelta, e
> `ICS-09`/`ICS-10` spostano la sorgente da un file esportato a mano a un
> indirizzo riletto da un processo non presidiato. La seconda e' la piu' pesante:
> **cancella e riscrive senza nessuno che guardi, in un progetto senza error
> tracking.** Le due guardie di `ICS-10` non sono rifiniture — sono la ragione
> per cui quel processo e' accettabile, e la procedura di ripristino va scritta
> prima del primo giro, non dopo il primo incidente.

> **Il progressivo perde la sua guardia strutturale, e la riga qui sotto e'
> l'autorizzazione.** Il trigger che rifiuta la rinumerazione e'
> `BEFORE UPDATE OF number`, e uno specchio non fa mai `UPDATE`: la terza guardia
> monotona del progetto smetterebbe di esistere senza che una riga di SQL lo
> dichiari. `ICS-01b` la ricostruisce nell'applicazione — che e' l'unico posto
> rimasto in cui puo' stare — e `meta-gates.md` pretende che l'allentamento sia
> **autorizzato per iscritto**: questa e' la scrittura.

> **`ICS-06` e' la contropartita dello specchio, e va detta.** Uno specchio puro
> cancella le proposte a ogni giro. Va bene — a patto che sia **dichiarato** che si
> ricalcolano, invece di lasciar credere a chi le guarda che siano state decise
> una volta.

> **`ICS-03` e' il confine, ed e' l'unica riga che va difesa nel tempo.** Ogni
> stato umano che nasce dopo — una nota, un'assegnazione, un allegato — o entra in
> quella lista **con una decisione scritta**, oppure il primo import lo cancella
> senza che nessuno se ne accorga.

---

### Phase 47: Il token che si beve e si fa rimborsare

Un difetto **riprodotto in laboratorio il 2026-08-19**, non dedotto: referto in
[`v1.6-47-PROBE.md`](v1.6-47-PROBE.md), sonda in
`scripts/probe-drink-token-cycle.mjs`. **Va per primo** perche' 49 apre
l'acquisto agli ospiti, e quello moltiplica i drink venduti.

> **La prova, in una riga.** Cinque cicli attiva -> annulla su un token comprato,
> in un ambiente misurato fedele alla produzione su **dieci cataloghi su dieci**:
> stato finale `purchased`, `activated_at` **NULL**, e il predicato del rimborso
> **lo seleziona**. Le controprove tengono: servire due volte non e' possibile, e
> il database rifiuta di annullare un token servito.
>
> ⚠ **`DRK-04` distrugge la possibilita' di rimisurare.** Una volta che
> l'annullamento smette di azzerare `activated_at`, il comportamento vecchio non
> e' piu' osservabile. Ecco perche' la prova e' stata fatta **prima** di
> pianificare, e non dopo.

| ID | Requisito |
|---|---|
| **DRK-01** | **Nessun cron emette piu' rimborsi.** `/api/cron/refund-expired-tokens` smette di chiamare `refundTransaction()`. |
| **DRK-02** | Un token non riscattato si rimborsa **su richiesta**, entro una finestra dalla chiusura del menu: **72 ore di default, modificabile**. |
| **DRK-03** | L'emissione resta dietro `STAFF_MANAGE` — solo admin e organizer. Gia' vero oggi, e non si allenta. |
| **DRK-04** | `deactivate_drink_token` **smette di azzerare `activated_at`**, e le attivazioni si **contano**. Un token annullato ha una storia. |
| **DRK-05** | Un token **mai attivato** si rimborsa **automaticamente, su richiesta**. |
| **DRK-05b** | Un token **attivato e disattivato una o piu' volte** puo' comunque essere **richiesto** — la richiesta non e' mai rifiutata — ma il rimborso e' **manuale, dopo revisione**, con il conteggio delle attivazioni davanti a chi decide. |
| **DRK-06** | La schermata SERVED resta in vista **5 secondi** invece di 3 (`GuestTokenDisplay.tsx:426`). Si congeda comunque da sola: **la lettura avviene al tocco, prima della versata**, quindi la schermata deve sopravvivere alla lettura, non al gesto. |
| **DRK-07** | La schermata SERVED **non puo' comparire senza la conferma del server**. E' vero oggi per costruzione e va **preservato come invariante**, non ottimizzato. |
| **DRK-08** | Il runbook del bar — *si tocca, si legge SERVED, poi si versa* — e' scritto, e vive nella sezione TASK (53). |

> ## Il difetto, per intero, perche' non si dimentichi perche' esiste questa fase
>
> **Cosa NON e' il problema** — verificato leggendo il codice:
>
> - **riscattare due volte e' impossibile**: `redeem_drink_token` prende il lock
>   sulla riga (`FOR UPDATE`), e' idempotente, e restituisce `false` se il token
>   era gia' servito; l'azione controlla quel booleano e solleva
>   (`menu/actions.ts:456`);
> - **lo schermo non puo' dire SERVED senza il server**: `setPhase("served")` sta
>   **dopo** l'`await`, e un fallimento riporta ad `active` mostrando l'errore;
> - **non esiste coda offline per i drink**: senza rete non cambia nulla, in
>   nessun verso.
>
> **Cosa e' il problema.** Il cliente controlla **due** transizioni — attiva e
> annulla — il barista una sola: serve. E `deactivate_drink_token` riporta il
> token da `active` a `purchased` **azzerando `activated_at`**, che e' l'**unica**
> traccia di un'attivazione: non c'e' tabella di audit e non c'e' contatore.
>
> Da cui: attivo, il barista versa *prima* di premere, annullo, e il token torna
> `purchased` **senza memoria**. Ripetuto tutta la sera. E `purchased` e'
> esattamente lo stato su cui il rimborso seleziona
> (`refund-expired-tokens/route.ts:165`). Ha bevuto tutta la sera, si e' fatto
> ridare i soldi, e **nel database non e' rimasto niente che dica che sia
> successo**.
>
> **Nessuno l'ha fatto**: in produzione ci sono zero ordini bar.
>
> **DRK-04 e' l'unico pezzo che non si recupera dopo.** Ogni annullamento che
> avviene prima di quella modifica e' una storia persa per sempre.
>
> **La sequenza al banco, dichiarata dal proprietario il 2026-08-19:** il barista
> tocca lo schermo mentre il token e' attivo, **legge SERVED al tocco**, e **solo
> allora versa**. La verifica sta *prima* del gesto, non durante.
>
> **Da cui DRK-06 nella forma che ha.** Una prima stesura di questa fase chiedeva
> che la schermata non si chiudesse affatto, temendo un barista che preme, si
> gira a prendere il bicchiere e torna a conferma scaduta. Quel timore descrive un
> ordine diverso — *premi, versa, poi verifica* — che non e' quello in uso. Con la
> lettura al tocco, la schermata deve sopravvivere alla **lettura**: cinque secondi
> bastano, e la correzione e' registrata qui invece di lasciare in piedi un
> requisito nato da una sequenza sbagliata.
>
> **DRK-07 invece non si allenta, ed e' il fondamento di tutto il resto.** La
> procedura funziona **solo** perche' quella schermata e' una conferma del server:
> chi la rendesse ottimistica per «velocizzare l'UX» toglierebbe al barista
> l'unico controllo che ha in mano, e nessuno se ne accorgerebbe finche' qualcuno
> non beve gratis tutta la sera.
>
> **La forma decisa il 2026-08-19, e la distinzione che porta.** Il barista **non
> consegna mai il drink prima di vedere SERVED**: la procedura, da sola,
> **previene** il ciclo. Cio' che la procedura non fa e' **renderlo visibile** —
> e i due casi lasciano oggi dati identici, `purchased` con `activated_at` a
> `NULL`. Non si potrebbe verificare che la procedura sia stata seguita, ne'
> difendere un barista accusato ingiustamente.
>
> Da cui la divisione:
>
> - **mai attivato** → rimborso **automatico su richiesta**;
> - **attivato e disattivato una o piu' volte** → la richiesta **si puo' sempre
>   fare e non viene rifiutata**, ma il rimborso e' **manuale, dopo revisione**.
>
> **DRK-04 e' il presupposto di entrambe.** Senza la traccia dell'attivazione e
> senza il conteggio, i due casi sono **indistinguibili**, e la regola qui sopra
> non e' applicabile: non esiste il dato su cui deciderebbe.
>
> **Una cosa residua, detta una volta.** Il barista guarda uno schermo sul
> telefono di un estraneo: vale che sia **lui a toccarlo**, su una schermata viva.
> Uno screenshot di un SERVED precedente e' identico a quello vero.
>
> ⚠ **Da verificare in fase di piano, non qui:** lo stesso cron cancella i token
> `redeemed` e `refunded` 24 ore dopo la chiusura del menu. La finestra di
> richiesta e' 72. Vanno guardate insieme prima di toccare l'una o l'altro.

### Phase 48: Il catalogo dei format dice la verita'

Apre la milestone perche' il catalogo lo leggono quattro superfici a valle: la
barra dei format nella pagina eventi, le viste della sezione Location, le pagine
visual, e i chip di TASK. Farlo dopo significa riaprire quattro superfici.

| ID | Requisito |
|---|---|
| **CAT-01** | Il format SunSet e' **cancellato**: riga di catalogo, sue serate, e ogni riferimento nel codice dell'app. Resta **solo** nel tracker di produzione, per memoria (decisione del proprietario, 2026-08-19). |
| **CAT-02** | RamaDub porta **`#2B4BE8`** nel catalogo e nei token di brand. |
| **CAT-03** | `brand-visual-system.md` e' aggiornato **nello stesso commit** di CAT-02: oggi dichiara che RamaDub e' arancio `#FF7A2F` piatto e che il gradiente tramonto e' firma esclusiva di SunSet. Due righe che CAT-01 e CAT-02 rendono false. |
| **CAT-04** | Il calendario di produzione e' importato dai due file `.ics` forniti dal proprietario, con `npm run import:calendar` **a vuoto letto per intero prima** di `--apply`. |
| **CAT-05** | Le voci di calendario che non appartengono a nessun format del catalogo sono **classificate esplicitamente dalla prova a vuoto**. Nessuna entra per default e nessuna viene scartata in silenzio: sono contate e riportate. |

> **CAT-01 e' una deroga dichiarata a una guardia monotona.** `meta-gates.md`
> elenca la numerazione di serie fra i tre interruttori a senso unico: *«un
> progressivo assegnato e' gia' su una locandina»*. Il costo e' stato enunciato
> al proprietario il 2026-08-19 con due alternative — ritirare il format tenendo
> le serate, oppure ritirarlo e non importarle — e la cancellazione e' stata
> scelta. **Il file `.ics` aggiornato fornito subito dopo non contiene piu'
> alcuna occorrenza di SunSet** (misurato: 0 su 79 voci, contro 3 su 91 nella
> versione precedente), quindi l'import e la cancellazione non si contraddicono.

### Phase 49: Comprare senza account

Il primo passo del perno, e va prima di 50 per la ragione detta sopra.

| ID | Requisito |
|---|---|
| **BUY-01** | Un ordine puo' contenere **piu' biglietti**. |
| **BUY-02** | Il tetto di biglietti per ordine e' **6 di default, modificabile per serata** dall'organizer. |
| **BUY-03** | L'acquisto **non richiede un account**: una mail basta. |
| **BUY-04** | I biglietti si ritrovano **senza login**, dalla credenziale del biglietto e dalla mail — sul modello dei token drink da ospite, che in questo codice esiste gia'. |
| **BUY-05** | Il codice del biglietto smette di nascere da `Math.random()` (`src/utils/qr.ts:49`). |

> **Perche' BUY-05 e' un requisito di questa fase e non un ritocco rimandabile.**
> La firma del biglietto e' HMAC; **il codice no**. Finche' esiste un account,
> il codice non e' l'unica cosa che lega una persona al suo acquisto. Con
> l'acquisto da ospite **lo diventa**: e' l'unica prova che qualcuno ha pagato.
> La fase che rende quel codice l'unica credenziale e' la fase che deve
> ripararlo.

> **Perche' il tetto e' 6, e perche' il numero e' un fatto di dominio.**
> Le sedi in target stanno fra 150 e 300 persone, e **dopo il perno il biglietto
> e' l'unica cosa che regola chi entra**: non c'e' piu' un'approvazione a monte.
> Senza account, un tetto alto e' una persona che ne compra cinquanta e li
> rivende — cioe' la serata che sceglie il suo pubblico da sola. Sei e' un gruppo
> di amici con un solo pagante.

> ⚠ **BUY-05 ha cambiato bersaglio il 2026-09-05, e la riga sopra e' lasciata
> come sta perche' si veda quale premessa e' caduta.** `src/utils/qr.ts:49`
> **non** genera il codice del biglietto: sta dentro `generateMembershipCode()`,
> riguarda la membership card e **non ha nessun importatore in `src/`** — e'
> codice morto. La credenziale del biglietto e' gia' `gen_random_uuid()` con
> firma HMAC-SHA256. Il difetto vero e' `membership_code`, coniato dal `random()`
> **non crittografico** di plpgsql dentro `handle_new_user` e sufficiente **da
> solo** ad ammettere alla porta. **Si ripara in questa fase** (`D-49-01`,
> decisione del proprietario), perche' e' la fase che comincia a coniarne uno per
> ogni persona che compra.

**Goal:** una persona che non ci conosce vede una serata, compra fino a sei
biglietti con il solo indirizzo mail, li ritrova senza login, e li fa passare
alla porta — anche con la radio spenta.

**Plans:** 2/11 plans executed

Plans:

- [x] 49-01-PLAN.md — lo schema dell'ordine: righe, tetto, attribuzione, etichetta
- [x] 49-02-PLAN.md — la credenziale della porta coniata con `crypto`
- [x] 49-03-PLAN.md — il perimetro che l'account leggero allarga (misura + decisione)
- [x] 49-04-PLAN.md — l'azione d'acquisto senza account
- [x] 49-05-PLAN.md — la mail che porta biglietti e link, dentro il registro delle consegne
- [x] 49-06-PLAN.md — la superficie del biglietto senza login, e il gate delle superfici esteso
- [x] 49-07-PLAN.md — il webhook: identita' al pagamento, N biglietti, esito visibile
- [x] 49-08-PLAN.md — la UI d'acquisto, il tetto dell'organizer, la pagina che elenca
- [x] 49-09-PLAN.md — l'indirizzo a chi compra dopo la rivelazione (Critical)
- [x] 49-10-PLAN.md — la porta con un biglietto al portatore
- [x] 49-11-PLAN.md — le cinque procedure manuali, scritte ed eseguite

### Phase 50: Via le iscrizioni

| ID | Requisito |
|---|---|
| **REG-01** | `/register` e ogni percorso di auto-iscrizione sono rimossi. |
| **REG-02** | Lo stato `pending` e' smontato: il valore, le mail di approvazione e rifiuto, e le superfici che lo mostrano. |
| **REG-03** | Il referral (*invite a friend*) e' rimosso. |
| **REG-04** | Entrano `master`, `admin`, `organizer`, `staff` **piu' l'account leggero** di chi compra o e' invitato da guest list (ruolo `member` fino alla 51, revisione del perno del 2026-08-22). Nessuno si iscrive: gli account di staff li crea un admin o un organizer **dentro l'app** — percorso che esiste gia' dalla fase 43 — e il signup pubblico e' spento anche in Supabase Auth. *(Riscritto il 2026-09-21 in discussione di fase.)* |
| **REG-05** | Nessun cancello nuovo su `status`. Quelli esistenti che sopravvivono a questa fase sono **elencati** come debito che 51 o 57 chiudono. |
| **REG-06** | L'RSVP di una serata gratuita e' **un ordine a totale zero**: nome, cognome e mail come nell'acquisto, stessa mail con QR e link firmato, stesso account leggero, stessa porta — senza SumUp. *(Aggiunto il 2026-09-21, decisione del proprietario: «uguale a comprare un ticket ma senza acquisto».)* |

> **REG-06, precisazione del 2026-09-21 (`D-50-18b`).** I due moduli — a pagamento
> e gratuito — chiedono **`Full name` e mail**, un campo solo per il nome e non
> «nome e cognome» separati. Il nome va **nell'account** (`profiles.full_name`) e
> **mai** sul biglietto: `holder_label` resta un progressivo e il biglietto resta
> al portatore (`D-49-03`).

**Plans:** 12/12 plans complete

Plans:
**Wave 1**

- [x] 50-01-PLAN.md — il banco di prova senza lo stato, la serata gratuita seminata, e le sette misure prese in sola lettura
- [x] 50-02-PLAN.md — la migration che smonta `status`, il referral e il trigger, in una transazione sola (laboratorio)

**Wave 2** *(blocked on Wave 1 completion)*

- [x] 50-03-PLAN.md — la migration additiva dell'ordine a totale zero: checkout nullabile, `buyer_name`, il livello a prezzo 0
- [x] 50-06-PLAN.md — via `/register`, via la home, la barra e la frase del login
- [x] 50-07-PLAN.md — «cancella account» con i suoi rifiuti, via le sei azioni di stato e via il referral

**Wave 3** *(blocked on Wave 2 completion)*

- [x] 50-04-PLAN.md — il nome nell'account su entrambi i percorsi, e l'azione dell'ordine gratuito

**Wave 4** *(blocked on Wave 3 completion)*

- [x] 50-05-PLAN.md — le superfici della prenotazione gratuita, e via il pulsante RSVP

**Wave 5** *(blocked on Wave 4 completion)*

- [x] 50-08-PLAN.md — il percorso del denaro senza stato, il dashboard, i media, le quattro mail

**Wave 6** *(blocked on Wave 5 completion)*

- [x] 50-09-PLAN.md — la barra perde lo stato, i tipi cadono per ultimi, REG-05 a zero, e il runbook

**Wave 7** *(blocked on Wave 6 completion)*

- [x] 50-10-PLAN.md — le otto procedure percorse sul laboratorio, signup spento compreso

**Wave 8** *(blocked on Wave 7 completion)*

- [x] 50-11-PLAN.md — la terza autorizzazione, il deploy, le migration di produzione e le cancellazioni

**Wave 9** *(blocked on Wave 8 completion)*

- [x] 50-12-PLAN.md — i moduli della persona, il changelog, e `50-VERIFICATION.md`

### Phase 51: Via le superfici da socio, e la porta

| ID | Requisito |
|---|---|
| **MEM-01** | La membership card e' rimossa: superficie, rotta e capability. |
| **MEM-02** | Lo storico delle presenze e' rimosso. |
| **MEM-03** | `/api/membership/verify` e' rimosso **insieme al suo precache nel service worker e alla sua coda offline**. |
| **MEM-04** | La rimozione e' verificata **su un dispositivo con la rete spenta**, prima e dopo, e la procedura e' scritta passo per passo. |

> **Fase separata, e non in pacchetto con nient'altro.** E' la stessa regola che
> la v1.5 ha applicato all'indirizzo della porta: *un redirect ha bisogno di una
> rete che la porta e' progettata per non avere*. Qui si toglie un percorso che
> il service worker precachea e che la coda offline conosce, e una rimozione
> parziale si manifesta **alle due di notte, davanti a una fila**. E l'asimmetria
> resta quella di sempre: rifiutare un ospite valido e' peggio che ammetterne uno
> doppio.

**Plans:** 15/15 plans executed

Plans:
**Wave 1**

- [x] 51-01-PLAN.md — `P-51-1` scritta, e la corsa «prima» a radio spenta sul codice attuale (checkpoint del proprietario)
- [x] 51-02-PLAN.md — via il ramo socio dalla coda offline, dallo scanner e dall'annullamento; IndexedDB a v6
- [x] 51-03-PLAN.md — via `/api/membership/verify` e `/list`, le due regole del service worker, e il glob morto della persona
- [x] 51-04-PLAN.md — via la membership card e lo storico presenze: superfici, mappe di rotta, manifest, alias italiano
- [x] 51-05-PLAN.md — il catalogo del laboratorio e i conteggi, prima che esista una riga di migration

**Wave 2** *(blocked on Wave 1)*

- [x] 51-06-PLAN.md — `/account` nasce da `/dashboard`, con il 308 permanente e le liste d'accesso
- [x] 51-07-PLAN.md — lo schermo della porta: opaco, senza nome, con la testata ferma e l'avviso derivato
- [x] 51-08-PLAN.md — migration 1: ruolo `attendee` e le due chiavi di capability, applicata al laboratorio

**Wave 3** *(blocked on Wave 2)*

- [x] 51-09-PLAN.md — le superfici di lavoro: niente piu' `member`, niente piu' codice socio
- [x] 51-10-PLAN.md — il tipo, il middleware, la pagina dell'account e il lessico verso le persone
- [x] 51-15-PLAN.md — il check-in per nome entra in coda a radio spenta (chiusura del buco misurato da P-51-1, scritto il 2026-09-22)

**Wave 4** *(blocked on Wave 3)*

- [x] 51-11-PLAN.md — il registro diventa `account_acts` nel codice, e i banchi smettono di seminare il codice socio

**Wave 5** *(blocked on Wave 4)*

- [x] 51-12-PLAN.md — migration 2: via il codice socio, registro rinominato, `attendances` svuotata per chiave e tolta (laboratorio)

**Wave 6** *(blocked on Wave 5)*

- [x] 51-13-PLAN.md — la produzione, sotto autorizzazione datata: deploy, due migration, la cancellazione SENZA SOGGETTI (zero righe), permesso ESAURITO il 2026-09-22T19:24:05Z

**Wave 7** *(blocked on Wave 6)*

- [x] 51-14-PLAN.md — `P-51-1` corsa «dopo» e `51-VERIFICATION.md` (checkpoint del proprietario)

### Phase 52: La barra di navigazione e i ritocchi

| ID | Requisito |
|---|---|
| **NAV-01** | La barra ha **quattro voci**, in quest'ordine: Events · Check-in · **TASK** · **Management**. Home non esiste (`/` resta il redirect a `/events`). Gallery e Account vivono **dentro** Management; chi non ha Management (`attendee`, anonimo) vede Events · Account. TASK e' **disegnata ma spenta** finche' la fase 53 non la costruisce. *(Riscritto il 2026-09-23, decisione del proprietario, D-52-01..05 in `52-CONTEXT.md`; diceva «Home · Events · Gallery · Check-in · TASK · Account · Management».)* |
| **NAV-02** — **RITIRATO il 2026-09-23 (fase 52.1, DBT-13: la gallery esce dal prodotto; era vero alla chiusura della 52)** | La gallery e' raggiungibile solo da chi ha `gallery.view` (admin, organizer, staff): **voce nel pannello Management, riga nella mappa delle rotte, e guardia in cima alla pagina**. |
| **NAV-03** | Management e' un **pannello che scende**, con le voci in **ordine alfabetico**, e sparisce dalla pagina Account. |
| **NAV-04** | Da telefono, dentro uno strumento di management, la barra degli strumenti resta **appesa in alto**. |
| **NAV-05** | Nella pagina membri il numero `staff` **non e' piu' un link con filtro**: si comporta come le altre tre cifre (`MemberTable.tsx:1109`). |
| **NAV-06** | Nella pagina eventi compaiono **solo i format che hanno almeno una serata** — passata o futura — visibile a chi guarda. |
| **NAV-07** — **RITIRATO il 2026-09-23 (fase 52.1, DBT-13; era vero alla chiusura della 52)** | La gallery chiude **anche i dati**, non solo l'indirizzo: le righe approvate di `event_media` si leggono solo con `gallery.view` (RLS), il bucket delle foto diventa **privato** e le immagini si servono con **URL firmati**; i link pubblici gia' emessi vengono censiti e convertiti. *(Aggiunto il 2026-09-23, decisione del proprietario dopo la ricerca: «il middleware e' UX, la RLS e' sicurezza» — un cancello sull'indirizzo senza un cancello sui dati non chiude niente.)* |

> **NAV-02 non e' una sola modifica ma tre, e la prima da sola non protegge
> niente.** Oggi `/gallery` **non e' nella mappa delle rotte affatto**: nascondere
> la voce di barra lascerebbe l'indirizzo aperto a chiunque lo digiti. Hiding a
> nav item is not protecting a route — e' scritto in `ManagementSection.tsx` e
> vale qui.
>
> **Il cancello e' temporaneo per costruzione.** Il perno dice che l'app e' anche
> il posto dove si guardano foto e video: la gallery si riapre togliendo una
> riga, quando ci sara' qualcosa da pubblicare.

> **NAV-06 si costruisce dall'array di eventi gia' letto, PRIMA del filtro per
> format, e mai da una seconda interrogazione.** Una lettura del tipo *«questo
> format ha qualcosa?»* e' l'unico canale che rivela una bozza **senza mostrare
> niente**: nessuna ispezione visiva della pagina potrebbe coglierla. Ricavando
> il chip dall'array, la riga varia con chi guarda ma non gli mostra mai nulla
> che non stia gia' vedendo. E il calcolo va fatto **prima** del filtro per
> format, o selezionandone uno spariscono tutti gli altri.

**Plans:** 19/19 plans complete

Plans:
**Wave 1**

- [x] 52-01-PLAN.md — censimento di NAV-07 su laboratorio e produzione (solo numeri) e banco dei media sul laboratorio
- [x] 52-02-PLAN.md — procedure P-52-A..G scritte prima della corsa, VALIDATION onesta, note della UI-SPEC in 41 §10/§12
- [x] 52-03-PLAN.md — NAV-05: la cifra staff come le altre; la legenda staff vera dopo `gallery.view`
- [x] 52-04-PLAN.md — NAV-06: chip dalle serate visibili, prima del filtro; riga assente a zero
- [x] 52-05-PLAN.md — la porta a cinque linguette (Recent, Alerts), ricerca contigua alla lista, viewport con l'aspettativa iOS scritta

**Wave 2** *(blocked on Wave 1 completion)*

- [x] 52-06-PLAN.md — M1 additiva (`gallery.view`, `storage_path`, policy `EXISTS`) con catalogo TS e gate, applicata al laboratorio

**Wave 3** *(blocked on Wave 2 completion)*

- [x] 52-07-PLAN.md — la barra a quattro voci, TASK spenta, pannello Management (foglio e colonna); via «Management Tools»
- [x] 52-08-PLAN.md — NAV-02: prefisso, allow-list e guardia su `/gallery`; il modulo di firma; immagini che dichiarano il guasto
- [x] 52-09-PLAN.md — `purge-media-orphans.mjs`: rimozione per chiave di rifiutati e orfani, provata sul laboratorio
- [x] 52-10-PLAN.md — `restrip-event-media.mjs`: le foto pre-stripper ripassate dallo stripper vero, provata con GPS sul laboratorio

**Wave 4** *(blocked on Wave 3 completion)*

- [x] 52-11-PLAN.md — via la colonna Work; la striscia degli strumenti appesa e alfabetica (NAV-04)
- [x] 52-12-PLAN.md — firma sulla pagina della serata e in moderazione; `registerMedia`/`deleteMedia` per chiave; sezione Gallery sotto `gallery.view`

**Wave 5** *(blocked on Wave 4 completion)*

- [x] 52-13-PLAN.md — M2 scritta; deploy del ramo `lab`; M2 sul laboratorio; sonde, `verify:refusal` gruppo gallery, linea di base RLS

**Wave 6** *(blocked on Wave 5 completion)*

- [x] 52-14-PLAN.md — la corsa del proprietario sul laboratorio, su iPhone, e la decisione sul login (checkpoint) — tre difetti aperti (zoom di Safari sui campi, Critical per la porta): 52-15 non parte prima di un piano di chiusura

**Wave 7** *(blocked on Wave 6 completion)* — chiusura delle lacune della corsa

- [x] 52-18-PLAN.md — difetti 2 e 3: lo `staff` su Account legge «Staff»; un indirizzo rifiutato dall'autenticazione ha la sua frase (`address_refused`), non «The write failed»

**Wave 8** *(blocked on Wave 7 completion)*

- [x] 52-19-PLAN.md — difetto 1 (Critical, la porta): campi a 16 px sotto puntatore grossolano, niente blocco dello zoom (D-41-08), deroga datata in 41-UI-SPEC §7.4; misura prima/dopo su Safari simulato, P-52-F passo 5 rimisurato, laboratorio al commit della correzione

**Wave 9** *(blocked on Wave 8 completion)*

- [x] 52-15-PLAN.md — atto 1 in produzione: M1 → deploy → M2, sotto `52-AUTHORISATION.md` (checkpoint) — in produzione dal 2026-09-23 18:28:33Z; M1 `20260923182638`, M2 `20260923182908`; `verify:capabilities` verde; autorizzazione ESAURITA

**Wave 10** *(blocked on Wave 9 completion)*

- [x] 52-16-PLAN.md — atto 2 in produzione: rimozione per chiave e ri-spogliatura, sotto `52-AUTHORISATION-MEDIA.md` (checkpoint)

**Wave 11** *(blocked on Wave 10 completion)*

- [x] 52-17-PLAN.md — persona (media-and-storage, access-gating), sonda di cache dopo la finestra, `52-VERIFICATION.md` (checkpoint)

### Phase 52.1: Chiusura del debito della fase 52 (INSERTED)

**Inserita il 2026-09-23, decisione del proprietario:** *(riscritta alle 20:30Z: la gallery esce dal prodotto, DBT-13/14; DBT-01/02/03/08/11/12 ritirati)* *«basta che chiudiamo tutto il
debito»*. Il perimetro e' **la tabella «Il debito che questa fase lascia» di
`52-VERIFICATION.md`** piu' **gli 8 WR e le 8 IN di `52-REVIEW.md`**. Non e' una
fase di feature: ogni voce chiude una cosa che la 52 ha dichiarato aperta, e la
VERIFICATION della 52.1 cita voce per voce dove e' stata chiusa — o, per le tre
voci non chiudibili per costruzione, dove e' scritto perche'.

**Goal:** la fase 52 non lascia debito che una fase possa chiudere. Chi rifiuta una
foto la toglie davvero; nessun secondo scrittore sul bucket resta fuori dai gate; i
video di una serata a sede segreta non portano coordinate; i passi di procedura
saltati sono percorsi; gli avvisi della review sono chiusi.

| ID | Requisito |
|---|---|
| **DBT-01** — **RITIRATO il 2026-09-23 alle 20:30Z (la gallery esce dal prodotto, D-52.1-17)** | ~~**Rimozione = rimozione (Critical).** *(Riscritto il 2026-09-23 alle 20:14Z: la moderazione non esiste piu', D-52.1-13.)* Togliere una foto o un video dalla pagina dei media di una serata rimuove **l'oggetto** dal bucket e la riga, **subito**, per chiave, con conferma, log con categoria e conteggio visibile: `deleteMedia` (`events/[slug]/actions.ts`) acquista il suo chiamante. Niente finestra, niente cron, niente migration. Provato sul laboratorio; la produzione oggi ha 0 media.~~ |
| **DBT-02** — **RITIRATO il 2026-09-23 alle 20:30Z (la gallery esce dal prodotto, D-52.1-17)** | ~~**Nessun secondo scrittore fuori dai gate.** Il controllo A di `verify:media-strip` cammina anche `scripts/`, con `restrip-event-media.mjs` dichiarato come unico scrittore ammesso e verificato per l'ordine «spoglia, poi scrivi» — oppure lo script viene ritirato ora che non ha soggetti. Una delle due, decisa e scritta.~~ |
| **DBT-03** — **RITIRATO il 2026-09-23 alle 20:30Z (la gallery esce dal prodotto, D-52.1-17)** | ~~**I video non portano coordinate.** Decisione del proprietario fra due strade: uno stripper per i metadati video (atom `udta`/GPS) nel percorso di finalize, oppure **il rifiuto dei video sulle serate a sede segreta** finche' uno stripper non esiste. In entrambi i casi il comportamento e' esplicito all'utente che carica, mai silenzioso.~~ |
| **DBT-04** | **I passi di procedura non percorsi sono percorsi**, sul laboratorio: P-52-D 2 e 5, **P-52-E 6 (l'annullamento alla porta con un QR vero, da telefono)**, P-52-G video e sonda 7, e i passi da tablet (P-52-A 9-11, P-52-C 4) su un tablet vero o su un simulatore iPad dichiarato tale. Esiti datati in `52-ESITI.md` o in un `52.1-ESITI.md`. |
| **DBT-05** | **La porta non tace senza rete.** L'avviso della guest list e il pallino di Alerts si accendono **quando cade la radio**, non quando scade il timeout del canale realtime (oggi ~40 s in Chrome, ~2 minuti sul telefono). Misura prima/dopo sul telefono, non solo in Chrome (`checkin-offline.md`). |
| **DBT-06** | **Le 8 WR della review sono chiuse** (`52-REVIEW.md`): WR-01 lettura dell'evento in moderazione che scarta `error`; WR-02 `force-dynamic` sulla gallery; WR-03 `uploaded_by` serializzato al client senza consumatori; WR-04 stato «could not be loaded» legato all'id di riga invece che all'URL firmato; WR-05 `aria-live` degli avvisi solo con il tab Alerts attivo; WR-06 `seed-lab-media.mjs` ramo (c) rotto dopo M2; WR-07 corpi d'errore del Management API stampati (fino a 300 byte) in due script; WR-08 istantanea dei byte scritta prima del bivio `--dry-run`. |
| **DBT-07** | **Le 8 IN della review sono chiuse o dichiarate**, insieme alla ricognizione lessicale che la 52 aveva rimandato alla 57: commenti «public bucket» (`finalize.ts`, `finalize/route.ts`, `may-upload.ts`, `MediaReviewGrid.tsx`), `getVisibleNavItems` (`server.ts`, `middleware.ts`), «of the seventeen keys» in `verify-capabilities.mjs`, «M2 drops the column». |
| **DBT-08** — **RITIRATO il 2026-09-23 alle 20:30Z (la gallery esce dal prodotto, D-52.1-17)** | ~~**La cache ha una procedura.** Per la prossima volta che un bucket pubblico **con contenuto** viene chiuso: come si invalida il bordo della CDN (o, se non si puo', quanto si aspetta e cosa si dice), provato sul laboratorio con un oggetto in cache, con i tempi. Sta in `media-and-storage.md`, gate *cache e contenuto rimosso*.~~ |
| **DBT-09** | **Le copie locali hanno una fine.** Le sei `.env.attendances-snapshot.*` della fase 51 ancora sul disco: decisione del proprietario (cancellare per nome o tenere fino a una data scritta), registrata come per le istantanee della 52 (`legal-compliance.md`). |
| **DBT-11** — **RITIRATO il 2026-09-23 alle 20:30Z (la gallery esce dal prodotto, D-52.1-17)** | ~~**Chi carica dallo staff con un iPhone non trova un muro (Critical, media).** Una foto **HEIC** e un video **`.mov`** (QuickTime, spesso HEVC) si **accettano e si spogliano** sul server — mai rifiutati — con lo stesso ordine «spoglia, poi scrivi» delle foto JPEG; le foto escono in JPEG **ridimensionate** (lato lungo 2560 px, D-52.1-16), i video non si ricodificano; la riga registra il tipo dell'oggetto scritto; `verify:media-strip` copre i nuovi tipi; la prova per mutazione usa un `.heic` e un `.mov` veri con posizione attiva. **Il tetto e' 50 MB per file, dichiarato** con un messaggio vero prima dell'invio e una guida breve per lo staff; **nessuna compressione nel browser** (superata il 2026-09-23 alle 20:14Z). *(Decisioni del proprietario: «se un utente con iphone carica un heic, non deve venire rifiutato»; «tetto dichiarato di 50mb».)*~~ |
| **DBT-12** — **RITIRATO il 2026-09-23 alle 20:30Z (la gallery esce dal prodotto, D-52.1-17)** | ~~**Carica solo lo staff, e pubblica subito (Critical, media e sede segreta).** *(Decisione del proprietario, 2026-09-23: «gli utenti e' inutile che carichino i files. dovremo caricarli noi dello staff, selezionando le foto/video migliori»; «la moderazione delle foto non esiste piu'»; «No, tutto approvato subito»; caricamento «entrambe».)* Il titolo a caricare resta quello di oggi (master, organizer, staff assegnato); un caricamento nasce **pubblicato**; la coda «Pending», approva/rifiuta e i loro testi spariscono; la pagina di moderazione diventa la **pagina dei media della serata** (elenco, caricamento, rimozione); il caricamento sta **sia** sulla pagina della serata **sia** li'. La regola entra in `media-and-storage.md` come gate *chi carica seleziona*; l'asse `status` resta in tabella come non piu' usato, dichiarato.~~ |
| **DBT-13** | **La gallery esce dal prodotto (Critical: accesso, dati, sede segreta).** *(Decisione del proprietario, 2026-09-23: «e se eliminassimo del tutto la gallery? mettiamo giusto la cover dell'evento e basta» → «Sì, via la gallery».)* Rotta `/gallery`, voce in Management, componenti e route dei media, script di laboratorio, sezioni dei gate; poi, **dopo il deploy**, una migration in produzione sotto atto datato: `event_media`, i due bucket, `gallery.view` e le sue concessioni. `verify:capabilities` e `npm run verify` verdi con i conteggi nuovi. NAV-02 e NAV-07 **ritirati** in roadmap. Sul laboratorio i media seminati tolti per chiave prima dei bucket. |
| **DBT-14** | **La cover passa dal server ed e' 16:9 (Critical: sede segreta).** Il caricamento della cover non scrive piu' dal browser nel bucket pubblico: passa dal server con lo stripper di `strip-metadata.ts`, accetta **HEIC** da iPhone, ridimensiona, esce in JPEG; la policy di scrittura di `event-images` si chiude al solo server. Formato dichiarato **16:9** (esportazione orizzontale della locandina, 1920×1080; *«la cover sull'evento ci sta che sia in 16:9. preferisco»*), mostrata **intera, mai ritagliata** (`aspect-video`; da desktop via il `max-h-80` che oggi taglia), miniature quadrate dal centro. Le cover esistenti in produzione censite prima. |
| **DBT-10** | **Cio' che non si chiude si dichiara, una volta sola:** NAV-07 decide chi vede una foto, non cosa c'e' dentro (criterio di moderazione, non confine tecnico); D-52-28 `resta` (decisione del proprietario); l'UDID di simulatore nel testo di `52-19-PLAN.md` (dichiarato, non riscritto). La VERIFICATION della 52.1 le cita come chiuse per dichiarazione, con il rimando. |
| **DBT-15** — **aggiunto il 2026-09-30 (decisione del proprietario: «dobbiamo raccogliere piu' informazioni possibili, anche dei carrelli abbandonati… analisi di mercato»)** | **I carrelli abbandonati si leggono, senza tenere le persone.** Sull'ordine si registra **da dove arriva** la persona (sorgente letta dal link d'ingresso: Instagram, newsletter, diretto, volantino) e **a che passo si ferma** (modulo del fornitore mai aperto / aperto e non tentato / tentato e rifiutato — oggi «mai tentato» copre i primi due); l'imbuto di Analytics conta anche **l'effetto della mail di ripresa** (ordini pagati dopo la mail) e ha una **vista tra serate**, non solo per serata. **Conservazione dichiarata:** i numeri restano per sempre; `buyer_email` e `buyer_name` degli ordini **mai pagati** si tolgono dopo un periodo fisso (proposta 90 giorni), con la frase nell'informativa — periodo e frase **al legale**, risposta registrata con la data (`legal-compliance.md`, gate *i dati dei soci non sono i dati del prodotto*; `comms-analytics.md`, gate PII). Nessun dato in piu' senza una ragione scritta accanto alla colonna. |
| **DBT-16** — **aggiunto il 2026-09-30 (trovato chiudendo il laboratorio della 52.2)** | **`npm run verify` torna verde, e i tre rossi sono di prima della 52.2.** Misurato sulla punta di `main` il 2026-09-30 alle 21:48Z e riletto su `origin/main`: (1) `verify:tables` — la `<table>` nella mail all'organizer (`src/lib/tickets/organizer-alert.ts:355`) e' HTML di posta, non puo' usare `DataTable`: **esenzione dichiarata** su `REMAINING` con la ragione, oppure la mail cambia forma; (2) `verify:breakpoints` A — `@2xl:` in `src/app/(public)/events/EventTabs.tsx` (commit 8d94a2a4 del 2026-09-24) e' una **container query** di Tailwind 4, non il quarto breakpoint di viewport che §2.1 vieta: **decisione sul gate** (riconoscere `@<tier>:` come variante di contenitore) o sul codice; (3) `verify:breakpoints` B — `sm:flex-row` in `src/app/(public)/tickets/order/[token]/ResendTicketsForm.tsx:62` (7ea21df4, 2026-09-24) → `md:`. Tutti e tre sono in produzione dal 2026-09-28; nessuno e' della 52.2, che li dichiara in `52.2-ESITI.md`. Il gate «verify verde» torna a valere come precondizione di deploy dalla 52.1 in poi. |
| **DBT-17** — **aggiunto il 2026-10-01 (decisione del proprietario: «la pagina manage tickets dovrebbe avere solo i tier e i discount codes»)** | **Manage tickets configura, Sales racconta.** `admin/(work)/events/[id]/tickets/page.tsx` tiene **solo** i tier (evento e serata) e i codici sconto; le sezioni «Sold tickets», «Orders without tickets» e «Paid, address never sent» **passano a** `sales/page.tsx`, accanto all'incasso e ai venduti per tier. Il pulsante **Refund resta in un posto solo, Sales**: oggi e' su entrambe le pagine (`sales/page.tsx:41-43` lo dichiara da se'), e due elenchi con lo stesso controllo divergono. Nessun cambio di dati: spostamento di sezioni server, stessi lettori, stesse guardie `mayManageEvent`. Provato sul laboratorio da telefono prima della produzione; le procedure della porta e degli ordini (`52.2-PROCEDURES.md`) rilette con i nuovi indirizzi. |
| **DBT-18** — **aggiunto il 2026-10-01 (decisione del proprietario: «vorrei poter trascinare i tiers cosi' da poterli ordinare a piacimento»; dettagli decisi alle 01:10 locali)** | **L'ordine dei tier lo decide chi li gestisce, come in Promemoria su iPhone.** Oggi `ticket_tiers` **non ha una colonna d'ordine** e i lettori non concordano: admin per `created_at` (`tickets/page.tsx:206`, `sales/page.tsx:117`), pagina pubblica e preventivo per `price` (`events/[slug]/page.tsx:655,1001`, `order-quote.ts:458`). Serve: una migration additiva `ticket_tiers.sort_order integer NOT NULL DEFAULT 0` con backfill per prezzo (al deploy il pubblico vede l'ordine di oggi); **un solo** ordinamento — `sort_order, price, created_at` — in **tutti** i lettori, cosi' **l'ordine deciso in admin e' quello che vede il pubblico sulla pagina della serata** (D4: il prezzo non comanda piu'). In Manage tickets una **modalita' «Riordina»** (D2): un pulsante la apre, compare la **maniglia a tre linee a destra** di ogni riga, **si trascina solo dalla maniglia** (D1: scorrere la pagina resta libero), la riga si solleva dopo una pressione prolungata **come su iPhone** (D7, ~0,5 s) e si lascia dove serve; **niente frecce**; si salva **solo con «Fatto»** (D3), in **una** scrittura dell'ordine intero della serata sotto `mayManageEvent`; «Annulla» ripristina l'ordine di prima. Vale **per serata**, e i tier «Event Pass» dell'evento fanno una lista a parte (D5). **Lo stesso metodo su desktop, tablet e telefono** (D6): mouse, penna e dito, con una libreria leggera (es. `@dnd-kit`, pointer e touch con ritardo di attivazione; nel repo non c'e' nulla). Assunzioni da confermare: un tier creato dopo va **in coda**; in modalita' Riordina gli altri controlli della riga (modifica, cancella) sono nascosti fino a Fatto/Annulla. Gate: nessuna riga di prezzo o quantita' cambia col riordino; provato sul laboratorio da telefono, tablet e desktop prima della produzione. |
| **DBT-19** — **aggiunto il 2026-10-01 (il proprietario: «non vedo Who works, dove si trova esattamente?»)** | **Una pagina che nessuno collega non esiste.** «Who works» (`admin/(work)/events/[id]/assignments`, l'assegnazione dello staff alla porta) **non ha alcun link nell'interfaccia**: `src/components/events/EventList.tsx:115-122` elenca sei voci per serata — Edit, Manage Tickets, Sales, Guest List, Media, Analytics — e mancano **Who works** e **Drinks**, mentre **Media** c'e' ancora dopo l'uscita della gallery (DBT-13). Si raggiunge solo digitando l'indirizzo, che il proprietario non poteva sapere. Correzione: le voci della card dicono le pagine che esistono — via Media, dentro Who works (e Drinks se la pagina resta); il gate dei touch target che cita «six» si aggiorna con il conteggio nuovo; e `npm run verify:routes` guadagna il controllo inverso: **ogni pagina di lavoro della serata ha almeno un link** che la raggiunge. Provato da telefono sul laboratorio. |

**Depends on:** Phase 52
**Plans:** 0 plans

Plans:
- [ ] TBD (run /gsd-plan-phase 52.1 to break down)

> **Ordine dentro la fase:** DBT-01 e DBT-03 sono decisioni/feature Critical
> (media, sede segreta) e vogliono la domanda al proprietario prima del codice
> (`meta-gates.md`, «misura due volte»); DBT-06/07 sono ritocchi; DBT-04/05
> vogliono un telefono e il laboratorio. Nessuna scrittura in produzione senza
> un atto datato, come per la 52.

### Phase 52.2: Il carrello che non si chiude, e il rimborsato alla porta (INSERTED)

**Inserita il 2026-09-30, decisione del proprietario**, dopo un ordine di 10 €
rimasto «Checkout never confirmed» sulla card *Orders without tickets* e dopo
una ricerca (materiale in `.firecrawl/cart-recovery/`, fuori dal repo). Tre
fatti misurati quel giorno la governano:

- **Nulla chiude un ordine `pending`.** Nessun `valid_until` sul checkout, il
  webhook ignora `FAILED` ed `EXPIRED`, nessun cron rilegge i sospesi; chiudere
  il modulo carta butta via il checkout e il Buy successivo crea un **nuovo**
  ordine. Non esiste alcun evento di analytics sull'inizio o la fine di un
  checkout biglietti: il tasso di abbandono e' ignoto.
- **La mail di recupero e' vincolata nella forma, non nel gusto.** Garante
  privacy, provv. 17 luglio 2024, doc. web 10084158: senza una vendita
  effettiva il soft spam (art. 130 c. 4) non si applica; senza intento
  promozionale e' ammessa **una sola** comunicazione con il link di ripresa,
  contestuale all'abbandono, senza offerte, prevista nell'informativa. Una
  seconda mail, o uno sconto, e' marketing e vuole un consenso che al checkout
  non si raccoglie.
- **I piani decidono il meccanismo.** Vercel e' **Hobby** (cron solo
  giornalieri, con scarto fino a 59 minuti); Resend e' **free** (100 mail al
  giorno) e accetta l'invio programmato con annullamento — verificato il
  2026-09-30 con due mail di prova al master, entrambe annullate: nei primi
  ~2 secondi dopo la programmazione l'annullamento risponde «Email is not
  scheduled». Supabase e' free, `pg_cron` disponibile ma **non scelto**: uno
  scheduler fuori da `vercel.json` fallisce in silenzio.

**Goal:** un ordine aperto e non pagato ha una scadenza, un numero e una sola
via di ritorno; un biglietto rimborsato viene detto a chi lo aveva, e **poi**
rifiutato alla porta. Niente di questo allarga chi entra: cambia solo cio' che
il prodotto sa dire di cio' che e' gia' successo.

| ID | Requisito |
|---|---|
| **CART-01** | **Il checkout si misura — dal database.** Ogni ordine registra dispositivo (`ticket_orders.device`), metodo di pagamento (`payment_method`: carta, Apple Pay) e, se chiuso senza incasso, la causa (`closed_reason`); da queste tre colonne l'imbuto in Analytics conta checkout aperti, pagati, mai tentati, rifiutati e ancora aperti, e il tasso di abbandono — senza email ne' nome. *(Riscritta il 2026-09-30 con cio' che si e' spedito: «due eventi PostHog» e' superato da Q1 del 2026-09-30 — PostHog non e' configurato in produzione e l'imbuto si conta dal database.)* |
| **CART-02** | **Ogni checkout ha una scadenza.** `valid_until` a 30 minuti alla creazione (la ricerca della fase 6 lo chiedeva; mai fatto). Dopo, quel checkout non e' piu' pagabile: chi riprende ne apre uno nuovo sullo stesso ordine. |
| **CART-03** | **Un sospeso si chiude con la verita' di SumUp (Critical: denaro).** Un cron giornaliero rilegge gli ordini `pending` piu' vecchi di 30 minuti con `GET checkout` e la lista dei tentativi: mai tentato → `expired`; tentativo rifiutato → chiuso con la causa, **distinto** da «pagato e non emesso», che resta l'unico caso con il bottone *Retry issuing*; `PAID` trovato in ritardo → **emette**, per lo stesso percorso del webhook, mai il contrario. La card *Orders without tickets* smette di dire «non sappiamo». |
| **CART-04** | **Lo stesso ordine si riprende.** La pagina dell'ordine con token, per un `pending`, offre *Riprendi il pagamento*: riapre il pagamento sullo stesso ordine, con gli stessi dati, senza riscrivere nulla (nuovo checkout se il precedente e' scaduto). Mai l'indirizzo, come sul biglietto (`venue-secrecy.md`). |
| **CART-05** | **Una sola mail, a un'ora, annullabile (Critical: comms, legale).** Alla creazione dell'ordine si programma su Resend la mail *«il tuo ordine e' rimasto aperto»* a +1h con il link di ripresa; alla conferma del pagamento il webhook la **annulla**, riprovando perche' nei primi secondi Resend la dichiara non ancora programmata; un annullamento fallito e' loggato con categoria propria e avvisa l'organizer. Contenuto: titolo, data, tier, link. **Niente sconto, niente urgenza inventata, niente indirizzo.** Una per ordine per costruzione, tracciata in `email_deliveries`, e **non parte** finche' CART-06 non e' in produzione. |
| **CART-06** | **L'informativa prevede la comunicazione.** La privacy policy del prodotto dichiara la mail di ripresa dell'ordine come comunicazione di servizio, una sola, su base di legittimo interesse. **Il professionista ha dato via libera il 2026-09-30** (registrato in `52.2-CONTEXT.md`); il testo lo scrive la fase, e va in produzione **nello stesso deploy** di CART-05. `comms-analytics.md` acquista il vincolo del Garante come gate. |
| **RFD-01** | **Ogni rimborso avvisa il titolare (Critical: denaro).** Oggi la mail parte solo quando lo staff approva una richiesta; il rimborso diretto da admin — la strada usata per i tre biglietti di prova del 2026-09-28 — **non avvisa nessuno**. Manda la stessa mail; e la manda anche il cron che scopre un rimborso fatto sulla dashboard SumUp. Categoria propria. |
| **RFD-02** | **Il cron dei rimborsi legge dove SumUp scrive.** Per una transazione rimborsata per intero, l'endpoint che il cron interroga risponde `SUCCESSFUL` con importo rimborsato **nullo**: il rimborso compare solo negli eventi della transazione. Verificato sui documenti SumUp, poi il cron guarda li'. Finche' non lo fa, un rimborso dalla dashboard lascia il biglietto valido. |
| **RFD-03** | **Rimborsato prima della serata = rifiuto (Critical: porta).** *(Decisione del proprietario, 2026-09-30: «un biglietto rimborsato prima della serata diventa un rifiuto, una volta che il rimborsato riceve la mail».)* Online e offline, un QR il cui biglietto ha un rimborso approvato datato prima dell'inizio serata e' **rifiutato** con la ragione *Refunded*, al posto dell'attuale «ammesso con flag» (FIX-09). Il manifest offline porta gia' `refundedAt`. **Va in produzione solo dopo RFD-01**, mai insieme e mai prima: si rifiuta solo chi e' stato avvisato (`checkin-offline.md`, asimmetria della porta). Il rimborso dopo l'inizio serata resta com'e', dichiarato. |
| **RFD-04** | **L'ordine di un rimborsato dice la verita'.** La pagina dell'ordine non dice piu' «i biglietti stanno arrivando» quando sono stati rimborsati: dice rimborsato, con la data. Oggi l'ordine resta `completed` senza traccia ed e' indistinguibile da un webhook che non ha emesso. |

**Decisioni gia' prese (D-52.2):**

- **D-52.2-01** — Il meccanismo della mail e' l'invio programmato di Resend con
  annullamento, non un cron ogni 5 minuti (servirebbe Vercel Pro, che non si
  compra per questo) e non `pg_cron` (scheduler invisibile).
- **D-52.2-02** — Niente sconti, niente sequenze, niente SMS o WhatsApp: i primi
  due per il Garante e perche' il prezzo di un tier e' pubblico e uguale per
  tutti (`community-membership.md`, gate *stessa regola per tutti*); il terzo
  perche' il telefono e' un dato in piu' senza ragione dichiarata.
- **D-52.2-03** — Nessun timer «riservato per N minuti»: un ordine aperto non
  riserva posti, e la promessa sarebbe falsa.
- **D-52.2-04** — Per l'ordine del 2026-09-28 non si scrive a mano: nessun
  tentativo di pagamento, e una mail non prevista dall'informativa e' il caso
  Iliad in piccolo.

**Verifica, in un repo senza test:** `npm run build`, piu' procedure scritte e
percorse **sul laboratorio**: (A) ordine aperto e abbandonato → dopo un'ora
arriva una sola mail con il link → dal link si paga; (B) ordine pagato con
Apple Pay entro pochi secondi → **nessuna** mail; (C) rimborso da admin → mail
al titolare → il QR e' rifiutato online e offline; (D) ordine con tentativo
rifiutato → il cron lo chiude con la causa giusta e senza *Retry issuing*.

**Depends on:** Phase 52 (la porta a cinque linguette), Phase 51 (FIX-09 e il
manifest con `refundedAt`). **Indipendente dalla 52.1**: l'ordine fra le due lo
decide il proprietario.
**Plans:** 12/17 plans executed

Plans:
- [x] 52.2-01-PLAN.md — le procedure PRE-LAB e A-F scritte prima del codice; VALIDATION onesta
- [x] 52.2-02-PLAN.md — tre migration (ordini, rimborsi, categorie), tipi, vocabolario; applicate al laboratorio [BLOCKING]
- [x] 52.2-03-PLAN.md — i mattoni SumUp: valid_until opzionale, disattivazione, rimborsi da events[], un solo POST al webhook
- [x] 52.2-04-PLAN.md — CART-06: il paragrafo dell'informativa e il gate del Garante nella persona
- [x] 52.2-05-PLAN.md — le due mail nel layout condiviso, order-resume.ts (freni, annullamento), refund-notice.ts, due avvisi all'organizer
- [x] 52.2-06-PLAN.md — CART-03: il cron close-pending-orders (ottavo) e la card che smette di dire «non sappiamo»
- [x] 52.2-07-PLAN.md — CART-01 dal database: fetchTicketFunnel dietro mayManageEvent
- [x] 52.2-08-PLAN.md — acquisto, webhook, ritorno: scadenza, dispositivo, metodo, programmare prima del ritorno, annullare prima di tutto, Q4
- [x] 52.2-09-PLAN.md — RFD-01/02: le tre strade di rimborso avvisano, il cron per transazione contro il registro
- [x] 52.2-10-PLAN.md — CART-04/RFD-04: ripresa dello stesso ordine, pagina «Refunded», banner sullo stesso dispositivo
- [x] 52.2-11-PLAN.md — RFD-03: vocabolario della porta e ramo offline
- [x] 52.2-12-PLAN.md — RFD-03: predicato unico dietro DOOR_REFUSE_REFUNDED_ENABLED, porta online e manifest
- [ ] 52.2-13-PLAN.md — il laboratorio al codice della fase e le procedure A-F percorse → 52.2-ESITI.md
- [ ] 52.2-14-PLAN.md — atto 1: migration in produzione e deploy (mail di ripresa e porta spente)
- [ ] 52.2-15-PLAN.md — atto 2: Q2 riletto e rifiuto alla porta acceso, dopo RFD-01
- [ ] 52.2-16-PLAN.md — atto 3: ORDER_RESUME_EMAIL_ENABLED acceso con l'informativa gia' pubblicata
- [ ] 52.2-17-PLAN.md — persona (otto cron, sospesi, rimborsi, porta) e 52.2-VERIFICATION.md con l'approvazione

### Phase 52.3: La pagina Music: i LiveCut delle nostre serate (INSERTED)

**Inserita il 2026-09-30, decisione del proprietario:** *«vorrei aggiungere
sull'app una pagina dove i visitatori trovano tutta la musica che noi facciamo
(come i livecut che sono su soundcloud)»*, e poi: *«facciamo che farlo prima in
lab cosi' posso vedere effettivamente come verrebbe. […] dev'essere una cosa
fatta bene e professionale e in linea con la nostra app. prima esegui una nuova
deep research sui competitors»*. Un'anteprima disegnata su canvas e' stata
giudicata *«molto grossolana»*: il giudizio si da' sulla pagina vera, servita
dal laboratorio.

**Goal:** una pagina pubblica dove chi non ci conosce ascolta cio' che abbiamo
gia' fatto, costruita con la stessa disciplina delle altre superfici del
prodotto: le registrazioni delle nostre serate, una per slot della timetable,
senza un aggettivo sul suono e senza un indirizzo che non sia gia' pubblico.

> **Cio' che governa la pagina sta in tre moduli che si consultano a mano.**
> `production-calendar.md`: **LiveCut non e' Podcast** — il LiveCut discende da
> una serata, uno per slot, un b2b e' una puntata sola; il Podcast e' il mix di
> un candidato, non esiste ancora, e pubblicato accanto ai materiali di un
> format viene letto come un annuncio di line-up. `sound-manifesto.md`: nessun
> format ha un manifesto scritto, quindi **la pagina non allude al genere**.
> `brand-visual-system.md`: `re:sonate` con la e normale, RamaDub `#6E8BFF`
> piatto, MotionLab neutro, date in inglese britannico, il nome del locale in
> tipografia e mai il suo logo.

| ID | Requisito |
|---|---|
| **MUS-01** | **La ricerca precede la forma.** Una ricerca sui riferimenti — pagine musica di club, collettivi, listening bar, radio e festival — con **testo e screenshot** di ogni pagina, e un giudizio su cosa le rende professionali. La pagina si disegna dopo, e la ricerca vive in `52.3-RESEARCH.md` con i nomi dei siti (sono pubblici) e mai con materiale nostro non annunciato. |
| **MUS-02** | **Una pagina pubblica `/music`**, aperta ai visitatori, nella navigazione pubblica accanto a Events e Artists, con anteprima del link (Open Graph) come le serate. |
| **MUS-03** | **La serata con i suoi slot.** I LiveCut sono raggruppati **per serata**, nell'ordine della timetable, con la chiave della serata, la data, l'orario e il numero di puntate. Un b2b e' una scheda sola. Filtri per format e per artista. |
| **MUS-04** | **La scheda porta:** copertina 1:1 (la cover del martedi', 2000×2000), artista collegato alla sua pagina esistente, fascia oraria dello slot, durata, titolo nella grammatica gia' decisa (`<artista> @ <format>, 17 Oct 26`). Il nome del locale compare solo dove il format lo porta gia' nel nome. |
| **MUS-05** | **Niente genere, niente venue segreto.** Nessun tag di genere, nessun aggettivo sul suono, nessuna descrizione che alluda a una scena. Un LiveCut di una notte a sede segreta non porta il venue in copertina, titolo o descrizione, prima e dopo la serata (`venue-secrecy.md`; `verify:venue-surfaces` esteso alla pagina). |
| **MUS-06** | **Un solo player, caricato al play.** Un player persistente per la pagina, alimentato dalle schede; nessun iframe di terzi finche' l'utente non preme play (`site-speed`: la pagina resta leggera); nessun autoplay; ogni scheda ha «Open on SoundCloud». |
| **MUS-07** | **I dati sono nostri.** Una tabella dei LiveCut legata a serata, slot e artista, con l'indirizzo SoundCloud, la durata e la cover; RLS nella stessa migration; lettura pubblica solo dei pezzi pubblicati; scrittura di master e organizer. Lo staff li inserisce **dalla pagina della serata** in admin. |
| **MUS-08** | **Podcast: uno spazio, non un contenuto.** La struttura prevede la seconda famiglia separata per costruzione, **invisibile** finche' il formato non esiste; nessun mix di candidati entra in questa fase. |
| **MUS-09** | **Prima sul laboratorio.** La pagina si costruisce sul ramo `lab`, si serve da `lab.resonatemotion.com` con dati di prova dichiarati (artisti fittizi o gia' pubblici, nessuna data non annunciata), si mostra al proprietario con screenshot e numeri, e va in produzione **solo su «vai»** — con la stessa disciplina del `verify:venue-surfaces` e del build. |
| **MUS-10** | **I diritti prima della prima pubblicazione (legale).** Tre domande al professionista, registrate con la data: il consenso scritto del dj alla registrazione e alla pubblicazione (riga del brief di booking), gli adempimenti SIAE/SCF per un set suonato in un locale e pubblicato online, la copertura della registrazione nell'accordo col locale. L'informativa acquista il paragrafo sul player di terzi caricato al play. Nessun LiveCut reale va in produzione prima delle tre risposte. |

**Decisioni gia' prese (D-52.3):**

- **D-52.3-01** — SoundCloud resta la casa dei LiveCut; Mixcloud e' una seconda
  casa possibile (licenziato, niente takedown), decisa in fase se costa una
  pubblicazione in piu' il martedi'. **Niente feed podcast verso Apple e
  Spotify**: un episodio scaricabile e' distribuzione dei brani altrui, e le
  fonti riportano rimozioni e sospensioni.
- **D-52.3-02** — Il player legge i nostri dati, non l'API SoundCloud (lo stato
  del `client_id` pubblico non e' certo); l'oEmbed di SoundCloud si usa al piu'
  in admin per verificare un link.
- **D-52.3-03** — La grammatica dei titoli e' quella gia' decisa il 2026-08-15
  per SoundCloud; la pagina la mostra, non la reinventa.
- **D-52.3-04** — Il canvas del 2026-09-30 non e' il riferimento visivo: e' un
  ordine di lettura (titolo, una frase, ascolta altrove, filtri, serata con i
  suoi slot, player in fondo). Il riferimento visivo e' l'app com'e' oggi.

**Verifica, in un repo senza test:** `npm run build`, `npm run
verify:venue-surfaces` esteso, e la prova sul laboratorio davanti al
proprietario: pagina desktop e telefono, un play che apre il player senza
ricaricare la pagina, un LiveCut di una serata a sede segreta senza indirizzo
in nessuna superficie, la scheda che porta all'artista.

**Depends on:** Phase 52.2 (ordine deciso dal proprietario: *«subito dopo la
52.2»*), Phase 52 (la barra di navigazione). La 52.1 resta in coda dopo.
**Plans:** 0 plans

Plans:
- [ ] TBD (run /gsd-plan-phase 52.3 to break down)

### Phase 53: TASK

La checklist a quattro fasi del tracker di produzione entra nell'app, e
**il tracker smette di comandare**: resta come fotografia del giorno in cui e'
stata scritta, e lo dichiara.

| ID | Requisito |
|---|---|
| **TASK-01** | Ogni voce e' **rivolta a un ruolo** — organizer o staff — e questo decide a chi compare come *disponibile*. |
| **TASK-02** | Ogni voce puo' essere **presa in carico da una persona**. Presa in carico e completamento sono **due atti distinti**: nessuna voce si dichiara fatta prima di essere stata presa. |
| **TASK-03** | Chi prende e chi completa **restano scritti**, con quando. |
| **TASK-04** | Il badge porta **due numeri**: quante voci sono disponibili per te, e quante ne hai in mano. |
| **TASK-05** | Chi ha un runbook assegnato lo vede dentro TASK. |
| **TASK-06** | Il contenuto iniziale si carica da un **file locale**, con uno script fuori dal prefisso `verify:`, sul modello di `seed:spaces`. |

> **TASK-06 non e' una preferenza di implementazione: e' il Guardrail 5.**
> La checklist del tracker nomina **spazi in trattativa, numeri di telefono e
> indirizzi mail**. Quel contenuto vive nel database, che e' privato e sotto RLS.
> **Non puo' entrare in un file del repository**, che e' pubblico e dove una
> pubblicazione non si annulla: un file spinto resta nei fork, nelle cache dei
> mirror e nella history anche dopo la rimozione.

> **Il runbook non e' un concetto nuovo**: esiste gia' nel progetto come la
> procedura che si segue alla porta (`31-DOOR-RUNBOOK.md`). Si aggancia alle
> **assegnazioni per serata** costruite nella fase 35: il tuo runbook e' la
> procedura del ruolo che hai quella sera.

### Phase 54: Location, alla pari con il tracker

I 184 spazi e i 1840 attributi sono **gia' in produzione** dalla fase 45, e i
dieci attributi corrispondono uno a uno alle colonne-criterio del tracker.
Manca la superficie.

| ID | Requisito |
|---|---|
| **LOC-01** | **Quattro sotto-viste** — Resonate, RamaDub, MotionLab, Tutte — con il conteggio sulla linguetta e la riga appesa sotto la testata. (Erano cinque: SunSet esce con CAT-01.) |
| **LOC-02** | Per ogni vista: intro, **quattro statistiche**, filtri per categoria con la meccanica isola-poi-accumula, conteggio risultati, ordinamento. |
| **LOC-03** | Tabella a **intestazioni variabili per vista**; nella vista Tutte, i punteggi dei format affiancati con il bordo sulla cella verificata. |
| **LOC-04** | Legenda, nota di metodo, nota per format. |
| **LOC-05** | Le tre cautele: l'intro dichiara che **nessuno e' stato chiamato**; ogni nome porta **il suo stato**; ogni punteggio e' marcato **derivato**. |
| **LOC-06** | L'**indirizzo resta fuori dalla lista**. Sta sulla scheda del singolo spazio, dove gia' e'. |

> **LOC-05 e' la condizione a cui il proprietario ha concesso la parita'**
> (2026-08-19). `SpaceList.tsx` oggi rifiuta la classifica di proposito, citando
> `venue-acquisition.md`: *una classifica non e' una disponibilita'*. La parita'
> con il tracker **rovescia quella scelta**, e la rovescia consapevolmente: il
> punteggio misura quanto uno spazio *sarebbe* adatto, mai se ci ospiterebbe, e
> la superficie deve dirlo da sola.

> **Tre celle del tracker resteranno vuote, ed e' la conseguenza accettata di una
> decisione, non un difetto da correggere dopo.** Il seed della fase 45 escluse
> per dichiarazione quattro gruppi di campi, e il proprietario ha scelto di non
> aggiungerli (2026-08-19): mancano quindi il **regime giuridico** — con lui il
> sottotitolo della colonna *Fino a tardi* e la statistica sul tesseramento — le
> **tre frasi di evidenza**, e il **segno del vino naturale**.

### Phase 55: Visual, una pagina per format

Oggi l'app ha il contenitore — capitolato, palette, archivio — e **nessuna**
delle pagine per format del tracker.

| ID | Requisito |
|---|---|
| **VIS-01** | Una pagina dedicata per **RamaDub** e una per **MotionLab**. (Erano tre: SunSet esce con CAT-01.) |
| **VIS-02** | Ogni pagina porta la struttura del tracker: cappello con lo stato, *Le scelte fatte*, i mockup, *I pezzi di ogni data* con la loro ancora temporale, *Domande aperte*. |
| **VIS-03** | **MotionLab resta neutro.** Non ha ancora una palette, e i suoi materiali non prendono in prestito quella di un altro format. |
| **VIS-04** | Nessuna pagina allude al **genere musicale** di un format la cui identita' sonora non e' scritta. |

> **VIS-03 e VIS-04 sono due gate del progetto, non prudenza.**
> `brand-visual-system.md`: *un format senza palette resta neutro — prendere in
> prestito il tramonto per riempire il vuoto e' il modo in cui un format perde
> l'identita' prima di averla*. E `sound-manifesto.md`: dove l'identita' sonora
> non e' scritta, **i materiali non possono alludervi**.

### Phase 56: La navetta

| ID | Requisito |
|---|---|
| **SHTL-01** | Sull'acquisto si sceglie **quante navette**, da 0 fino al numero di biglietti dell'ordine. **Un posto vale una persona**: quattro persone in navetta sono quattro navette comprate. |
| **SHTL-01b** | Il posto **viaggia sul biglietto**, non sull'ordine: dei biglietti dell'ordine, N ne portano uno, e il biglietto lo dichiara. Al ritrovo risponde il biglietto. |
| **SHTL-08** | **Navetta gratuita: nessun biglietto e nessun QR in piu'.** Esiste solo il biglietto d'ingresso alla festa. Ne discende che su un servizio gratuito un tetto limita **quante navette si vendono, non chi sale**. |
| **SHTL-09** | **Navetta a pagamento: nessun secondo QR.** Il QR del biglietto e' uno solo e vale per entrambe le cose. Cosa quel biglietto abbia diritto di fare lo **risolve il server** — e, senza rete, la cache locale — **mai il contenuto del QR**, che resta codice piu' firma. |
| **SHTL-10** | Lo stesso QR viene letto **due volte, da due atti diversi**: la **salita**, dallo staff autista, e l'**ingresso**, dallo staff porta. Sono **due segni distinti** sul biglietto: nessuno dei due consuma l'altro, e un biglietto salito non e' un biglietto entrato. |
| **SHTL-13** | **L'ingresso non dipende dalla salita.** Chi ha comprato la navetta e poi decide di non prenderla entra alla festa **normalmente**: il suo QR non e' mai stato letto dall'autista, e alla porta questo non cambia nulla — nessun avviso, nessuno stato intermedio, nessuna esitazione. |
| **SHTL-11** | Quale dei due atti compie uno scanner lo decide **l'assegnazione di quella serata**, non un interruttore che l'operatore puo' sbagliare. |
| **SHTL-12** | Entrambi gli atti funzionano **senza rete**: coda, archivio locale e riconoscimento dei doppioni li distinguono. Verificato **su due dispositivi con la rete spenta**, e la procedura e' scritta passo per passo. |
| **SHTL-02** | Il servizio puo' essere **gratuito o a pagamento**, per serata. |
| **SHTL-02b** | Il **numero di posti ancora disponibili si mostra solo quando il servizio e' a pagamento**. Su un servizio gratuito con tetto, l'opzione smette semplicemente di essere selezionabile quando e' pieno, senza contatore pubblico. |
| **SHTL-03** | Se e' **a pagamento il tetto e' obbligatorio**; se e' **gratuito il tetto e' facoltativo**, e senza tetto e' illimitato. **Il vincolo vive nel database**, non nel form. |
| **SHTL-04** | Un tetto si puo' **alzare, mai portare sotto quanto e' gia' stato venduto**. |
| **SHTL-05** | Chi ha preso la navetta riceve, **insieme ai biglietti**, il link del gruppo WhatsApp dove vivono i dettagli. |
| **SHTL-06** | Il link arriva nella mail e sulla pagina del biglietto, **dietro la credenziale del biglietto**. Sulla pagina pubblica della serata non compare mai. |
| **SHTL-07** | Se e' a pagamento, lo stato del pagamento si verifica **interrogando SumUp**, mai fidandosi di cio' che il webhook annuncia, e il percorso e' **idempotente in entrambi i rami**. |

> **Il link e' un invito che non si ritira.** Un invito WhatsApp e' riusabile e
> inoltrabile: chi ce l'ha entra, e chi lo gira fa entrare. Se nel gruppo si
> condivide il punto di ritrovo — e si condividera' — **il gruppo diventa un
> canale di rivelazione del venue**. E' la stessa forma di `venue_reveal_sent`:
> l'app puo' cambiare quale link consegna d'ora in poi, **non puo' togliere dal
> gruppo chi c'e' gia'**. La revoca vive su WhatsApp, e va saputo prima di usarlo.
>
> **Un rimborso non toglie nessuno dal gruppo.** Nessuna riga di codice cambia
> questo: la ripulitura e' un gesto umano che qualcuno deve fare.

> **Il numero di navette e' un CONTROLLO, non una cifra di pianificazione**
> — correzione del proprietario, 2026-08-19, che sostituisce una riga precedente
> di questo stesso documento. Un posto vale una persona: **quattro persone in
> navetta sono quattro navette comprate**, non una.
>
> **Da cui SHTL-01b, che non e' un dettaglio di implementazione ma la condizione
> perche' la regola sopra sia vera.** Un numero che vive sull'ordine non ferma
> nessuno al ritrovo — chi ne ha comprata una si presenta in due e l'autista li
> conta. Un numero che vive **sul biglietto** e' verificabile, perche' il
> biglietto e' gia' la cosa che una persona porta con se'. Una regola d'acquisto
> non applicabile al ritrovo non e' una regola: e' una speranza.
>
> ⚠ **Il check-in di oggi e' UN SEGNO SOLO, e questo e' il difetto che 56 deve
> risolvere prima di ogni altra cosa** — decisione del proprietario, 2026-08-19:
> il QR si legge due volte, dall'autista e alla porta.
>
> Il percorso attuale marca il biglietto come **entrato**. Se lo scansiona
> l'autista al ritrovo, alla porta quel biglietto risulta **gia' entrato**: la
> porta rifiuta un ospite valido, che e' l'errore peggiore che questo prodotto
> possa fare, perche' avviene **davanti a una fila** e non si recupera con una
> scusa. `checkin-offline.md`, e l'asimmetria vale identica al ritrovo: un rifiuto
> in strada alle nove di sera e' lo stesso errore, in un posto dove non c'e'
> nemmeno un supervisore.
>
> **Da cui SHTL-10: due segni, non uno.** *Salito* ed *entrato* convivono sullo
> stesso biglietto e nessuno dei due consuma l'altro.
>
> **E da cui SHTL-13, che e' l'altra meta' della stessa proprieta' e va scritta
> a parte perche' si sbaglia da sola.** SHTL-10 dice che la salita non consuma
> l'ingresso; SHTL-13 dice che **l'ingresso non pretende la salita**. Chi compra
> la navetta e poi ci ripensa e' un caso ordinario, non un'anomalia: il suo
> biglietto alla porta deve leggersi **identico a qualunque altro**. Un implementatore
> che aggiunge una spia *«navetta non usata»* per completezza sta mettendo alla
> porta una ragione per fermarsi a guardare — e alla porta ogni esitazione e' una
> fila. La porta pone **una** domanda: questo biglietto puo' entrare. E da cui **SHTL-11**: se
> l'atto dipendesse da un interruttore sullo schermo, il primo autista che parte
> con lo scanner in modalita' porta brucerebbe l'ingresso di un pullman intero.
>
> **E da cui SHTL-12, che e' la parte che costa.** Il ritrovo ha meno rete della
> porta, non piu'. I due atti devono attraversare interi la coda offline e il
> service worker, e il riconoscimento dei doppioni deve sapere **di quale atto**
> parla — o una salita accodata e un ingresso accodato si annullano a vicenda al
> primo momento di rete.

> **Va ultima**, e non insieme all'impianto — e ora per due ragioni invece di una.
> E' il secondo percorso del denaro in un progetto che **non ha alcun
> tracciamento degli errori**, ed e' anche, dal 2026-08-19, **una fase della
> porta**: SHTL-10, SHTL-11 e SHTL-12 modificano lo scanner, la coda offline e il
> service worker. Vale la regola che la v1.5 si e' data e non ha mai rotto — **il
> lavoro sulla porta non sta in pacchetto con nient'altro, e si verifica su un
> dispositivo con la rete spenta**, non alla scrivania con la fibra. Nessun fallimento
> di produzione raggiunge un essere umano da solo, e un percorso critico nuovo
> senza osservabilita' va costruito sapendolo.

### Phase 57: I documenti che ancora difendono la community

| ID | Requisito |
|---|---|
| **DOC-01** | `PROJECT.md` non dichiara piu' che *«the gating mechanism is what makes the community valuable»*. |
| **DOC-02** | `CLAUDE.md` non apre piu' con *«il gating E' il prodotto»*. |
| **DOC-03** | `community-membership.md` e `access-gating.md` descrivono il modello che esiste dopo il perno. |
| **DOC-04** | `npm run verify:persona` e' verde: nessun path morto, indice e frontmatter concordi, context budget rimisurato. |

> **Chiude in fondo, e non apre.** I moduli della persona hanno `paths:` che
> puntano a file veri: cancellare una superficie prima di aggiornarli lascia un
> gate acceso su un percorso morto, e riscrivere l'identita' prima che la cosa sia
> sparita significa descrivere un futuro che non c'e' ancora. **Ogni fase che
> cancella si porta dietro il proprio aggiornamento di modulo**; questa chiude
> l'identita' quando la cosa e' davvero sparita.

---

## Decisions Fixed Before Planning

Decise dal proprietario e non riaperte in fase di piano.

| Decisione | Data | Vale per |
|---|---|---|
| **Nessun rimborso automatico**: nessun cron muove denaro | 2026-08-19 | 47, 56 |
| Un token non riscattato si rimborsa **su richiesta entro 72h** dalla chiusura del menu — default modificabile | 2026-08-19 | 47 |
| Chi **annulla** un token attivo puo' sempre **chiedere** il rimborso; cambia solo che e' **manuale dopo revisione**, non automatico | 2026-08-19 | 47 |
| Il barista **tocca, legge SERVED al tocco, poi versa** — e SERVED resta 5 secondi | 2026-08-19 | 47, 53 |
| Il perno «piattaforma, non community» entra in **questa** milestone, non nella successiva | 2026-08-19 | 49, 50, 51, 57 |
| SunSet e' **cancellato**, non ritirato — format e serate. Resta solo nel tracker, per memoria | 2026-08-19 | 48, 54, 55 |
| RamaDub e' **`#2B4BE8`** | 2026-08-19 | 48 |
| La sezione Location va **alla pari con il tracker, con le cautele addosso** | 2026-08-19 | 54 |
| I campi che il seed della fase 45 escluse **non vengono aggiunti** in questa milestone | 2026-08-19 | 54 |
| Management e' **un pannello che scende**, non una pagina | 2026-08-19 | 52 |
| TASK comanda, **il tracker smette** | 2026-08-19 | 53 |
| La navetta e' **un posto per persona, portato dal biglietto** — quattro persone, quattro navette | 2026-08-19 | 56 |
| Il **contatore dei posti** si mostra solo quando il servizio e' a pagamento | 2026-08-19 | 56 |
| **Un solo QR letto due volte**: salita dall'autista, ingresso alla porta — quindi due segni distinti sul biglietto | 2026-08-19 | 56 |
| La navetta **gratuita non emette nulla**: esiste solo il biglietto d'ingresso | 2026-08-19 | 56 |
| I dettagli della navetta vivono **su WhatsApp**, non nell'app: niente corse, orari, cambio o disdetta | 2026-08-19 | 56 |
| Tetto biglietti **6 di default, modificabile** | 2026-08-19 | 49 |
| Il **nodo legale** e' chiuso: non si riapre | 2026-08-14 | tutte |
| L'interfaccia resta **in inglese**: nessuna traduzione in questa milestone | ereditata da v1.5 | tutte |
| Un numero di fase e' **un'identita', non una posizione** | ereditata da v1.5 | tutte |

## Ordering Constraints

Non preferenze: ognuno ha un modo di fallire dietro.

- **47 prima di tutto.** E' un difetto vivo sul percorso del denaro, indipendente
  da questa milestone, e **49 lo amplifica**: aprire l'acquisto agli ospiti
  moltiplica i drink venduti. La v1.5 si e' data la stessa regola e l'ha
  rispettata — i difetti vivi vanno per primi.

- **Il catalogo prima delle superfici.** Il catalogo dei format lo leggono la
  barra della pagina eventi, le viste della Location, le pagine visual e i chip
  di TASK. Cancellare un format e cambiarne il colore **dopo** aver costruito
  quattro superfici significa riaprirle tutte e quattro.

- **L'acquisto da ospite prima della rimozione delle iscrizioni.** Invertirli
  apre una finestra in cui l'app **non vende piu' niente**. Non e' un rischio
  teorico: e' l'unico ordine possibile.

- **Il perno prima dell'impianto.** L'impianto costruisce cancelli; il perno
  smonta i ruoli e gli stati su cui si appoggerebbero. Invertirli significa
  costruire la barra di navigazione due volte.

- **La porta non e' mai in pacchetto.** MEM-03 toglie un percorso che il service
  worker precachea e che la coda offline conosce. Si verifica **su un dispositivo
  con la rete spenta**, in una fase che non contiene nient'altro.

- **TASK dopo la barra.** Il pulsante e la sezione arrivano insieme: una barra
  con un pulsante che non porta da nessuna parte e' peggio di una barra senza.

- **La navetta ultima, e trattata come lavoro sulla porta.** E' il secondo
  percorso del denaro, e dal 2026-08-19 e' anche una modifica allo scanner, alla
  coda offline e al service worker (SHTL-10..12). Nessuna delle due cose si
  costruisce nello stesso respiro di un lavoro di impianto, e la seconda si
  verifica **con la rete spenta, su due dispositivi**.

- **I documenti in fondo.** Un modulo della persona aggiornato prima della
  cancellazione descrive un futuro; aggiornato molto dopo, difende un morto.

## Il gate della verifica, in un repository senza test

Non esiste un test runner per il prodotto: `package.json` non ha script `test` e
non esiste alcun file `*.test.*` o `*.spec.*`. **Nessuna fase di questa milestone
puo' essere dichiarata verificata perche' «i test passano».**

La verifica minima e' `npm run build`, che e' anche il typecheck. Vi si
aggiungono `npm run verify:routes`, `npm run verify:tokens`,
`npm run verify:persona` — quest'ultimo obbligatorio in **ogni** fase che tocca
`CLAUDE.md` o `.claude/**`, e da rilanciare **dopo** una cancellazione, mai
prima: il build non conosce i glob della persona.

Per tutto cio' che tocca **accesso, denaro, porta o venue** — cioe' 49, 50, 51,
52 e 56 — serve una **procedura manuale scritta**: quali passi, con quale ruolo,
e cosa si deve osservare. Scritta, non evocata: in un repository senza test e'
l'unica prova che esistera'.

## Cosa NON entra in questa milestone

- **I campi di scouting esclusi dal seed della fase 45** — regime giuridico,
  prontezza, vino naturale, le tre frasi di evidenza. Decisione del proprietario.

- **La palette di MotionLab.** Non e' decisa, e non si inventa qui.
- **Il manifesto sonoro di Resonate, RamaDub e MotionLab.** Non e' scritto.
  *«Non e' ancora deciso»* e' la risposta corretta.

- **Il tracciamento degli errori.** Resta assente, e 56 lo dichiara invece di
  lasciar credere che qualcuno se ne accorgera'.

- **La riapertura della gallery al pubblico.** Il cancello di NAV-02 e' costruito
  per essere tolto, non per restare.

## Domande aperte, da decidere dentro la milestone

- **Una navetta pagata e non usata si rimborsa?** **Chiuso il 2026-08-19: no,
  niente si rimborsa in automatico.** Il rimborso lo emette un admin o un
  organizer, caso per caso, guardato di persona. 47 toglie l'unico cron che
  faceva il contrario.
