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
- [ ] **50** — Via le iscrizioni (`REG`)
- [ ] **51** — Via le superfici da socio, e la porta (`MEM`)
- [ ] **52** — La barra di navigazione e i ritocchi (`NAV`)
- [ ] **53** — TASK (`TASK`)
- [ ] **54** — Location, alla pari con il tracker (`LOC`)
- [ ] **55** — Visual, una pagina per format (`VIS`)
- [ ] **56** — La navetta (`SHTL`)
- [ ] **57** — I documenti che ancora difendono la community (`DOC`)
- [ ] **58** — Il calendario e' uno specchio (`ICS`) — *aperta e riscritta il 2026-08-20; toglie la riconciliazione al centro, e dopo la ricerca guadagna la sorgente per link e lo specchio automatico*

---

## Phase Details

### 58 — Il calendario e' uno specchio

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

### 47 — Il token che si beve e si fa rimborsare

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

### 48 — Il catalogo dei format dice la verita'

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

### 49 — Comprare senza account

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

### 50 — Via le iscrizioni

| ID | Requisito |
|---|---|
| **REG-01** | `/register` e ogni percorso di auto-iscrizione sono rimossi. |
| **REG-02** | Lo stato `pending` e' smontato: il valore, le mail di approvazione e rifiuto, e le superfici che lo mostrano. |
| **REG-03** | Il referral (*invite a friend*) e' rimosso. |
| **REG-04** | Entrano solo `master`, `admin`, `organizer`, `staff`. Gli account li crea un admin o un organizer **dentro l'app** — percorso che esiste gia' dalla fase 43. |
| **REG-05** | Nessun cancello nuovo su `status`. Quelli esistenti che sopravvivono a questa fase sono **elencati** come debito che 51 o 57 chiudono. |

### 51 — Via le superfici da socio, e la porta

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

### 52 — La barra di navigazione e i ritocchi

| ID | Requisito |
|---|---|
| **NAV-01** | L'ordine della barra e': Home · Events · Gallery · Check-in · **TASK** · Account · **Management**. |
| **NAV-02** | La gallery e' raggiungibile solo da chi ha `gallery.view` (admin, organizer, staff): **voce di barra, riga nella mappa delle rotte, e guardia in cima alla pagina**. |
| **NAV-03** | Management e' un **pannello che scende**, con le voci in **ordine alfabetico**, e sparisce dalla pagina Account. |
| **NAV-04** | Da telefono, dentro uno strumento di management, la barra degli strumenti resta **appesa in alto**. |
| **NAV-05** | Nella pagina membri il numero `staff` **non e' piu' un link con filtro**: si comporta come le altre tre cifre (`MemberTable.tsx:1109`). |
| **NAV-06** | Nella pagina eventi compaiono **solo i format che hanno almeno una serata** — passata o futura — visibile a chi guarda. |

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

### 53 — TASK

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

### 54 — Location, alla pari con il tracker

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

### 55 — Visual, una pagina per format

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

### 56 — La navetta

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

### 57 — I documenti che ancora difendono la community

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
