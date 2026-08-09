---
phase: 35-per-night-assignments
plan: 14
subsystem: validation
tags: [human-uat, manual-verification, coverage-declaration, deferred-debt, sign-off, wave-9]

# Dependency graph
requires:
  - plan: 35-01
    provides: "`35-HUMAN-UAT.md` con la coda 6+8+1 in testa, il falso verde del build e gli undici segnaposto — questo piano sostituisce i segnaposto, non la testa"
  - plan: 35-22
    provides: "la prova 11 gia' scritta, con i suoi tre casi e la finestra del caso C — la ragione per cui le prove sono tredici e non dodici"
  - plan: 35-06
    provides: "il terzo asse del seed, e la ragione per cui ogni cattura anteriore a `35-06-final` e' un comparatore sporco"
  - plan: 35-21
    provides: "le due prove contro container che il baseline da solo non da', le sei mutazioni di `verify:media-strip`, e la tredicesima voce di debito indirizzata a questo piano per nome"
  - plan: 35-13
    provides: "le quattro procedure gia' esercitate sul codice (upgrade IndexedDB, N scansioni, undo offline, notte finita) — riportate qui invece che riscritte a memoria"
provides:
  - "tredici procedure manuali eseguibili senza chiedere niente a nessuno, ognuna con chi, cosa serve prima, i passi, cosa deve succedere e cosa significa se non succede"
  - "le quattro finestre che si chiudono, dichiarate in testa al file con il costo del ritardo"
  - "la dichiarazione di copertura come dati: 4 requisiti su 8 chiudibili, 4 con una meta' irraggiungibile, ASSIGN-01 con la sua"
  - "tredici voci di debito differito, ognuna con la ragione, piu' i due debiti chiusi dentro la fase dichiarati RITIRATI per nome"
  - "la riconciliazione delle undici voci di `deferred-items.md`: quattro chiuse, una ritirata perche' falsa, cinque aperte, una di sequenza"
  - "il sign-off di `35-VALIDATION.md`: `wave_0_complete: true`, `nyquist_compliant: true`, e la voce che resta aperta con il nome del documento che la chiudera'"
affects: [35-VERIFICATION, 34]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "una numerazione gia' pubblicata e gia' citata da tre documenti non si rinumera per far tornare un piano: si scrive la tabella di corrispondenza"
    - "un debito ritirato si dichiara ritirato, perche' sparire dall'elenco e cadere dall'elenco si assomigliano troppo"
    - "una voce di sign-off non soddisfatta resta non spuntata e nomina chi dovrebbe soddisfarla"
    - "una procedura che descrive una superficie inesistente non e' una procedura: e' un invito a cercare qualcosa che non c'e'"
    - "l'ordine dei casi di una prova sta in testa alla prova, perche' chi legge in fondo ha gia' fatto la cosa che l'ordine vietava"

key-files:
  created:
    - .planning/phases/35-per-night-assignments/35-14-SUMMARY.md
  modified:
    - .planning/phases/35-per-night-assignments/35-HUMAN-UAT.md
    - .planning/phases/35-per-night-assignments/35-VALIDATION.md

key-decisions:
  - "Le prove sono TREDICI, non dodici. La numerazione di `35-HUMAN-UAT.md` era gia' pubblicata e gia' citata da `deferred-items.md` voce 11, da `35-22-SUMMARY.md` e dalla dichiarazione di copertura: rinumerare per far tornare il piano avrebbe rotto tre riferimenti vivi. La corrispondenza piano→file e' scritta per intero, cosi' che ogni criterio d'accettazione resti verificabile"
  - "Dove `35-VALIDATION.md` dice «migration 12» intende la riga **14** (`20260809005000_live_assignment_flag.sql`): la numerazione e' cambiata quando il piano 35-18 ha inserito due righe prima di lei. Corretto in `35-HUMAN-UAT.md`, NON in `35-VALIDATION.md` — quella tabella e' una dichiarazione onesta e non si ritocca per farla concordare a valle"
  - "La procedura 3 dice che il rifiuto dell'undo NON dipende dalla redazione di produzione: `POST /api/tickets/checkin/undo` e' una route e il rifiuto torna come VALORE nel corpo. La meta' soggetta a redazione e' il caricamento media, che passa da due Server Action e si distingue PER POSIZIONE. Scritto invece di ereditato, perche' la premessa del piano avrebbe mandato a cercare la redazione dove non c'e'"
  - "La procedura 6 dichiara che la superficie di catalogo dei crediti NON ESISTE — nessun file di `src/` scrive o legge `party_credits` — e che l'elenco degli assegnabili FILTRA i `member`. Senza queste due righe la procedura mandava qualcuno a cercare due controlli inesistenti e a concludere che la fase e' rotta"
  - "Tredicesima voce di debito raccolta da 35-20/35-21: l'oggetto gia' spogliato e orfano nel bucket pubblico. Non era fra le dodici del piano; 35-21 l'ha indirizzata a questo documento per nome"
  - "La voce 7 del Validation Sign-Off resta NON spuntata: `35-VERIFICATION.md` non esiste ed e' deliverable del verificatore. La dichiarazione e' scritta e pronta, ma spuntare significherebbe dichiarare fatto un documento che non c'e'"
  - "`status: partial` diventa `status: written`, non `complete`: scritto e' il deliverable, eseguito non lo e', e le tredici prove portano tutte `status: pending`"

requirements-completed: []

# Metrics
metrics:
  duration: "~70 min"
  completed: 2026-08-09
  tasks_completed: 3
  tasks_total: 3
  checkpoint_open: false
---

# Fase 35 Piano 14: le tredici prove che nessun comando puo' eseguire — Summary

**In un repository senza test runner del prodotto, una procedura scritta non e'
documentazione: e' l'unica prova che esistera' per la meta' di questa fase che
nessuno strumento raggiunge.** Questo piano scrive quella lista, dichiara cosa e'
coperto e cosa no come **dati** invece che come giudizio, da' un nome a ogni
debito, e firma il contratto di validazione contro cio' che e' **successo** —
lasciando aperta la sola voce che non poteva chiudere.

Il file e' scritto per **una persona che tiene un telefono a una porta alle due
di notte**, non per chi lo rivedra' alla scrivania. Ogni prova dice **chi**,
**cosa serve prima**, **i passi**, **cosa deve succedere** e — la riga che manca
piu' spesso e che decide tutto — **cosa significa se non succede**, cosi' che chi
esegue sappia distinguere un verde da un fallimento plausibile.

---

## Cosa e' stato fatto

| Task | Nome | Commit | File |
|---|---|---|---|
| 1 | Le tredici procedure, e le quattro finestre che si chiudono | `b7ac16b` | `35-HUMAN-UAT.md` |
| 2 | La copertura come dati, e il debito con il suo nome | `6bd66ba` | `35-HUMAN-UAT.md` |
| 3 | Il sign-off del contratto di validazione | `0f55061` | `35-VALIDATION.md` |

**Lingua.** Prosa e messaggi di commit in italiano, come ogni documento di questa
fase. Identificatori, nomi di file, tabelle e colonne in inglese. Le frasi
d'interfaccia sono citate **testualmente in inglese**, perche' e' quello che
comparira' sullo schermo e chi verifica deve poterlo confrontare carattere per
carattere.

**Nessun file di `src/`, `supabase/` o `scripts/` e' stato toccato.** Il piano e'
interamente documentale: `npm run build` non e' stato eseguito perche' non c'e'
niente da compilare, e `npm run verify:persona` non e' stato eseguito perche'
ne' `CLAUDE.md` ne' `.claude/**` sono nel diff.

---

## Task 1 — le procedure

### Le quattro finestre che si chiudono, e perche' sono in testa

| Prova | Finestra | Cosa si perde ad aspettare |
|---|---|---|
| **12** — upgrade IndexedDB v4 → v5 su coda non vuota | prima della prima serata reale | L'unica **irreversibile**: distrugge **dati**, non codice. Presenze gia' scansionate che spariscono da un telefono in silenzio, senza error tracking che lo dica |
| **7** — `staff` assegnato RAGGIUNGE lo scanner | prima della prima serata reale | Il fallimento si scoprirebbe **davanti a una fila** |
| **10** — i metadati escono dal file | prima del primo caricamento da dentro una sede segreta | E' l'unico momento in cui il fallimento diventa **irreversibile**: `venue-secrecy.md` non ha rollback |
| **11**, caso **C** | fra il deploy e l'applicazione della riga 8 | **Applicando la coda per prima il caso non e' rimandato: e' perso** |

**Le altre nove non hanno una finestra**, e dirlo e' parte del deliverable: una
lista in cui tutto e' urgente e' una lista in cui niente lo e'.

L'ordine **C → coda → A e B** e' salito **in testa** alla prova 11 e non e'
rimasto solo dentro il caso C. La ragione e' meccanica: chi legge quella nota in
fondo ha gia' applicato la coda, cioe' ha gia' fatto la cosa che la nota vietava.

### Le procedure, e da dove viene ognuna

| # | Cosa prova | Req | Fonte del comportamento descritto |
|---|---|---|---|
| 1 | la notte finita nasconde e non cancella | ASSIGN-02 | 35-13 Prova D, esercitata sul codice |
| 2 | la scansione in coda si risolve dopo una revoca | ASSIGN-03 | 35-10, 35-11, 35-13 |
| 3 | il rifiuto e' una frase distinguibile | ASSIGN-05 | 35-11, 35-13, 35-21 |
| 4 | l'undo offline non aggira la supervisione | ASSIGN-05 | 35-13 Prova C |
| 5 | N scansioni ⇒ N check-in, zero autorizzazioni | ASSIGN-08 | 35-10, 35-13 Prova B |
| 6 | la superficie fa quello che dice | ASSIGN-01, 06 | 35-08, 35-05 |
| 7 | l'assegnatario RAGGIUNGE lo scanner | ASSIGN-01 | 35-15, 35-17 |
| 8 | «photo» sblocca il caricamento, su UNA notte | ASSIGN-01 | 35-16, 35-21 |
| 9 | l'organizer di una notte, e il gate che deve fallire | ASSIGN-01 | 35-09, 35-17 |
| 10 | i metadati escono davvero dal file | ASSIGN-01 | 35-19, 35-20, 35-21 |
| 11 | l'assegnatario SCANSIONA quella notte | ASSIGN-01, 08 | 35-22 — gia' scritta, non toccata nel contenuto |
| 12 | l'upgrade IndexedDB non perde una presenza | ASSIGN-02, 08 | 35-13 Prova A |
| 13 | la demozione bloccata nomina le serate | ASSIGN-01, 03 | 35-08 |

**Le procedure descrivono cio' che e' stato costruito davvero, non cio' che il
piano prevedeva.** Da qui le quattro correzioni sotto, in *Deviazioni*.

### Due trappole del comparatore, scritte perche' producono difetti falsi

**1. Non confrontare contro una cattura anteriore al terzo asse.** Il piano 35-06
ha aggiunto tre account e tre assegnazioni al seed (`6f40458`): contro `35-19` il
comparatore riporta **12 difetti `b2_count_changed`** che non vengono dalla
migration in esame. `35-19` e' la trappola peggiore **perche' il nome sembra
recente**: e' stata presa in un worktree parallelo piu' vecchio. La regola
scritta: **si confronta contro `35-06-final` o piu' recente**.

**2. Un `baseline:container` verde NON prova che la porta dello storage sia
chiusa.** La cattura registra **solo lo schema `public`** — `grep -c '"storage"'`
= **0** su ogni cattura di questa fase — e un `DROP POLICY IF EXISTS` con il nome
sbagliato e' un **no-op che si applica pulito**: verde e bucato. Chi verifica
deve fare come il piano 35-21, che ha provato la riga 15 contro **due container**
costruiti apposta.

---

## Task 2 — la copertura, e il debito

### La dichiarazione, come dati

**Chiudibili automaticamente: quattro su otto** — ASSIGN-01 *limitatamente al
permesso*, ASSIGN-04, ASSIGN-06, ASSIGN-07. Per ognuno e' scritto **quale**
comando lo chiude e **perche' quel comando basta**: per ASSIGN-01 la parte che
conta e' che B2/B3 restino **byte-identiche su ogni altra tabella**, cioe' la
prova che l'assegnazione **non filtra altrove**; per ASSIGN-06 la **prova
negativa**, che un credito da' la stessa matrice di un `member`.

**Con una meta' irraggiungibile: quattro su otto** — ASSIGN-02, 03, 05, 08.
Quella meta' **vive su un telefono, con la radio spenta, in un build di
produzione**.

**La precisazione su ASSIGN-01, non addolcita:** la matrice prova il
**permesso**, non che la persona **arrivi** allo strumento — e il piano 35-22 ha
aggiunto un terzo pezzo che per ventuno piani non era nemmeno elencato:
**arrivare allo strumento non e' usarlo**. La consegna di ASSIGN-01 **dipende da
un piano scritto dentro la fase dopo che il buco era stato trovato**.

**La frase che vale per tutte, scritta dove non si puo' mancare:** `npm run
build` e' un typecheck e **passa senza che nessuna migration sia applicata`; **un
build verde in questa fase non e' evidenza**. E non esiste alcun test runner del
prodotto.

### Il debito: due ritirati, tredici aperti

**Ritirati per nome** — la mancata sanitizzazione EXIF e lo scarto fra
`media.upload` per-notte ed `event_media` per-evento: **chiusi dentro questa
fase** per decisione del proprietario del 2026-08-08, con i piani 35-18 e
35-19/35-20/35-21. Sono dichiarati ritirati invece di sparire, perche' un elenco
che si accorcia in silenzio e' indistinguibile da uno a cui e' caduta una riga.

**Tredici voci aperte**, ognuna con **cosa manca** e **perche' non e' stato
fatto**. Nessuna dice «da valutare». Le tre che meritano di essere lette due
volte:

- **6 — i video non sono spogliati.** La mitigazione che c'e' e' il **rifiuto**
  su una notte con `venue_secret` vero *o non leggibile*; cio' che resta aperto
  e' che su una serata **non segreta** un video passa **non spogliato**, con
  luogo e ora dello scatto. **Impedisce che «sanitizzazione EXIF spedita» venga
  letto come «tutti i media sono puliti».**
- **10 — `.from("attendance")` interroga una tabella che non esiste.** Il braccio
  **rifiuta sempre**, e correggerlo **allarga** chi puo' caricare: e' una
  modifica al gating, non una pulizia. Nominata perche' altrimenti verrebbe
  «sistemata» da qualcuno che non sa di star allargando un permesso.
- **13 — l'oggetto spogliato e orfano** nel bucket pubblico se `registerMedia`
  fallisce dopo la pubblicazione: fuori moderazione, raggiungibile per URL, e
  invisibile all'interfaccia perche' per l'interfaccia non esiste.

### La riconciliazione con `deferred-items.md`

Le undici voci di quel file sono state riconciliate **una per una, per nome e
senza cancellarne nessuna**:

| Esito | Voci |
|---|---|
| **CHIUSE** | **1** (35-04, misurata: 24 ore esatte di divergenza) · **5** (35-10, misurata) · **7** (35-22) · **9** (35-21) |
| **RITIRATA — l'affermazione era falsa** | **2**: `src/components/scanner/**` **esiste**, e `verify:persona` e' verde su tutti e 58 i glob, **controllo A compreso** |
| **APERTE** | **3** (cancellazione artista accreditato) · **4** (l'uscita dalla demozione non ha un pulsante) · **6** (semantica `NULL` del registro, fuori fase) · **8** (undo offline non arriva al server) · **10** (ramo rimborsi) |
| **SEQUENZA, non un debito** | **11**: C → coda → A e B |

**Due cose vanno dette al di la' del conteggio.**

**La voce 9 risulta CHIUSA dal piano 35-21, e `deferred-items.md` non lo sa
ancora.** Il file la porta come *«DA SAPERE PRIMA DEL DEPLOY»*: era la finestra
in cui il caricamento rifiutava **per tutti**, organizer e master compresi, e si
e' chiusa alla wave 8 quando `partyId` e' diventato obbligatorio e passato. Il
piano 35-21 lo ha scritto nel proprio SUMMARY e ha indicato che qualcuno lo
riporti. **Questo piano lo registra in `35-HUMAN-UAT.md` e non riscrive
`deferred-items.md`**, per contratto di worktree.

**Le due voci aperte che qualcuno sara' tentato di «sistemare» nel modo
sbagliato**, e che quindi portano il non-fare scritto accanto:

- **La voce 10, il ramo dei rimborsi.** E' **preesistente** e vale **identica per
  `master` e per `organizer`**. Chiuderla **solo per gli assegnatari**
  costruirebbe una **porta a due velocita'**: la stessa persona ammessa dal
  telefono di un organizer e rifiutata da quello di uno staff, la stessa sera,
  alla stessa porta. **Si chiude per tutti i ruoli insieme o non si chiude** — e
  la direzione va scelta ricordando che alla porta un controllo in piu' e' un
  modo in piu' di rifiutare.
- **La voce 8, l'undo offline.** **Non e' un difetto di correttezza**: se
  l'ammissione non ha mai raggiunto il server, lo stato finale del server e'
  *«non e' successo niente»*, che e' corretto. Cio' che si perde e' la
  **traccia**, ed e' **dichiarata sullo schermo** — *«Undone at the door, held on
  this device (N)»* — invece che silenziosa.

---

## Task 3 — il sign-off

`wave_0_complete: true`. **Sei** voci su sei, non cinque: la sesta
(`verify:media-strip`) e' entrata in questo documento quando i piani 35-19/20/21
sono entrati nella fase, e contarne cinque l'avrebbe lasciata senza verdetto.
Ognuna porta accanto **il piano che l'ha soddisfatta**, e in due casi il piano
non e' quello che il documento si aspettava: le due voci `PROBE_PAYLOADS` le
hanno spedite 35-02 e 35-05, e il piano 35-06 le ha **trovate gia' presenti** e
lo ha dichiarato invece di rivendicarle.

`nyquist_compliant: true`, **misurato**: ventidue piani, e per ognuno il numero
di blocchi `<automated>` e' maggiore o uguale al numero di task. **Zero task
senza verifica automatica**, quindi anche la continuita' di campionamento e' vera
per costruzione. Vale la pena scrivere il caso opposto: la fase 31 tiene
`nyquist_compliant: false` **deliberatamente**, e tenerlo falso con una ragione e'
una risposta legittima. Metterlo vero **senza guardare** sarebbe stato l'unico
errore possibile su quella riga.

**Una voce resta NON spuntata**, ed e' la settima: la dichiarazione di copertura
riportata nel `35-VERIFICATION.md`. **Quel documento non esiste** — e' deliverable
del verificatore di fase e nessun piano lo produce. La dichiarazione e' scritta
con gli stessi ID in `35-HUMAN-UAT.md` ed e' pronta da riportare. Spuntarla
adesso avrebbe dichiarato fatto un documento che non c'e'.

**Invariati come da contratto:** la tabella *Per-Requirement Verification Map* e
la sezione *Feedback Latency Tiers*. Verificato sul diff: le uniche righe che le
nominano sono le voci di sign-off che le citano.

---

## Deviazioni dal piano

### 1. [Rule 1 — Bug] Le prove sono tredici, non dodici, e la numerazione del piano non e' quella del file

- **Trovata durante:** Task 1.
- **Il fatto:** `35-14-PLAN.md` numera dodici procedure per conto suo. Il file
  ne portava gia' undici con una numerazione **pubblicata e citata** da
  `deferred-items.md` voce 11, da `35-22-SUMMARY.md` e dalla dichiarazione di
  copertura in fondo al file stesso. In particolare la **prova 11** e' la
  scansione (piano 35-22), mentre nel piano il numero 11 e' l'organizer di una
  notte.
- **Cosa e' stato fatto:** la numerazione **del file** vince. Le due procedure
  nuove sono la **12** e la **13**. E' scritta una **tabella di corrispondenza
  piano ↔ file** per intero, cosi' che ogni criterio d'accettazione del piano
  resti verificabile senza indovinare.
- **Perche' non l'altra scelta:** rinumerare avrebbe rotto tre riferimenti vivi
  in documenti gia' pubblicati su un repository pubblico.
- **File:** `35-HUMAN-UAT.md` · **Commit:** `b7ac16b`

### 2. [Rule 1 — Bug] «Senza la migration 12» sono la riga 14, e il numero e' cambiato sotto i piedi al documento

- **Trovata durante:** Task 1, scrivendo la procedura 7.
- **Il fatto:** il piano e `35-VALIDATION.md` dicono *«senza la migration 12 la
  prova e' falsa-negativa»*. Il file che aggiunge `live_assignment_capabilities`
  al payload del middleware e' `20260809005000_live_assignment_flag.sql`, che
  nella coda di oggi e' la **riga 14**. Era la dodicesima quando la coda della
  fase 35 era di otto righe; il piano **35-18** ne ha inserite **due** prima di
  lei (`…004500` e `…004600`) e l'ha spinta in fondo.
- **Cosa e' stato fatto:** la procedura 7 nomina la **riga 14 per nome di file**,
  e una nota accanto alla tabella spiega che `35-VALIDATION.md` intende la stessa
  riga sotto la numerazione vecchia. **`35-VALIDATION.md` non e' stato
  corretto**: la sua tabella *Manual-Only* e' una dichiarazione onesta di cosa un
  comando puo' provare, e il piano vieta di ritoccarla per farla concordare a
  valle.
- **Perche' conta:** senza la nota, chi esegue la prova 7 con la riga 12 applicata
  e la 14 no registrerebbe un **fallimento di ASSIGN-01** dove c'e' solo una
  migration mancante — e andrebbe a «correggere» un codice corretto.
- **File:** `35-HUMAN-UAT.md` · **Commit:** `b7ac16b`

### 3. [Rule 1 — Bug] Il rifiuto dell'undo non e' soggetto alla redazione di produzione

- **Trovata durante:** Task 1, scrivendo la procedura 3.
- **Il fatto:** il piano motiva la procedura 3 con *«Next redige i messaggi delle
  Server Action soltanto in produzione»*, applicandolo all'undo. Ma
  `POST /api/tickets/checkin/undo` e' una **route**, non una Server Action: il
  rifiuto torna come **valore** nel corpo (`"status":"door_supervision_required"`)
  e il client lo legge da li', **mai da `err.message`** — quindi la frase si vede
  anche in sviluppo. La meta' davvero soggetta a redazione e' il **caricamento
  media**, che passa da due Server Action e dove il piano 35-21 distingue gli
  esiti **per posizione** proprio perche' la categoria non arriva.
- **Cosa e' stato fatto:** la procedura 3 copre **entrambe** le meta' e spiega la
  differenza. Resta **dichiarata valida solo in build di produzione**, e la
  ragione e' scritta: e' li' che il prodotto vive, e una regressione verso
  `err.message` sarebbe **invisibile in sviluppo e totale in produzione**.
- **File:** `35-HUMAN-UAT.md` · **Commit:** `b7ac16b`

### 4. [Rule 2 — funzionalita' critica mancante] La procedura 6 descriveva due controlli che non esistono

- **Trovata durante:** Task 1.
- **Il fatto, misurato:** (a) **la superficie di catalogo dei crediti non
  esiste** — `grep -rn "party_credits" src/` restituisce solo il tipo di riga in
  `src/types/database.ts` e un commento; il piano 35-05 ha spedito la tabella e
  il comando, non una pagina. (b) L'elenco degli assegnabili **filtra**
  `role in ('master','organizer','staff')`: un `member` non compare, quindi non
  si puo' «tentare di assegnarlo» dall'interfaccia.
- **Cosa e' stato fatto:** la procedura 6 dice **entrambe le cose**, sposta la
  parte del credito su passi `[serve una mano tecnica]` — inserimento a mano,
  matrice, `npm run verify:no-credit-account` — e marca il tentativo su un
  `member` come forzatura **sul filo**.
- **Perche' non l'alternativa:** lasciarla come scritta avrebbe mandato qualcuno
  a cercare un pulsante inesistente e a concludere che la fase non ha consegnato
  ASSIGN-06. Una procedura che descrive una superficie che non c'e' non e' una
  procedura.
- **File:** `35-HUMAN-UAT.md` · **Commit:** `b7ac16b`

### 5. [Rule 2 — funzionalita' critica mancante] La tredicesima voce di debito

- **Trovata durante:** Task 2, leggendo `35-21-SUMMARY.md` constatazione 2.
- **Il fatto:** il piano elenca dodici voci. I piani 35-20 e 35-21 ne hanno
  indirizzata una **tredicesima a questo documento per nome**: l'oggetto **gia'
  spogliato** e **orfano** nel bucket pubblico quando `registerMedia` fallisce
  dopo la pubblicazione — fuori moderazione, raggiungibile per URL, invisibile
  all'interfaccia.
- **Cosa e' stato fatto:** aggiunta come voce **13**, con la mitigazione che
  esiste (il rifiuto e' visibile e dice di avvisare un organizer) e la ragione
  del rinvio (uno spazzino sul bucket pubblico, lo stesso lavoro della voce 11 su
  un'altra area).
- **File:** `35-HUMAN-UAT.md` · **Commit:** `6bd66ba`

### 6. [Rule 2] Le voci di Wave 0 sono sei, non cinque

- **Trovata durante:** Task 3.
- **Il fatto:** il piano dice *«spuntare le cinque voci di Wave 0»*. Il documento
  ne porta **sei**: la sesta, `verify:media-strip`, e' entrata quando i piani
  35-19/20/21 sono entrati nella fase.
- **Cosa e' stato fatto:** spuntate tutte e sei, con una nota che dichiara la
  discrepanza. Contarne cinque avrebbe lasciato una precondizione **senza
  verdetto**, cioe' non spuntata per distrazione invece che per ragione.
- **File:** `35-VALIDATION.md` · **Commit:** `0f55061`

### 7. [Rule 2] La settima voce di sign-off resta aperta

- **Trovata durante:** Task 3.
- **Il fatto:** la voce chiede che la dichiarazione di copertura sia **riportata
  nel `35-VERIFICATION.md`**. Quel file **non esiste** e nessun piano di questa
  fase lo produce: e' deliverable del verificatore.
- **Cosa e' stato fatto:** la voce resta **non spuntata**, con scritto perche' e
  **chi** la chiudera'. Il piano dice esplicitamente che una voce non soddisfatta
  resta non spuntata: qui e' stato applicato anche dove spuntare sarebbe stato
  comodo.
- **File:** `35-VALIDATION.md` · **Commit:** `0f55061`

### 8. [Rule 2] Le due trappole del comparatore, scritte dove chi verifica le legge

- **Trovata durante:** Task 1, contro `35-18-SUMMARY.md:326-337`,
  `35-15-SUMMARY.md:217-223` e `35-21-SUMMARY.md:241-273`.
- **Il fatto:** un confronto contro `35-19` produce **12 difetti falsi**, e un
  `baseline:container` verde **non vede `storage.objects`** — quindi non dice
  niente sulla porta che la riga 15 chiude.
- **Cosa e' stato fatto:** una sezione nel corpo del documento, accanto al «falso
  verde», perche' chi verifica arriva da li'. Senza, la prima persona che esegue
  il confronto registra dodici difetti inesistenti e ne cerca la causa nel posto
  sbagliato — e la seconda legge un verde e conclude che il bucket e' chiuso.
- **File:** `35-HUMAN-UAT.md` · **Commit:** `b7ac16b`

### 9. [Rule 2] `status: partial` diventa `status: written`, non `complete`

- **Trovata durante:** Task 2.
- **Il fatto:** il file era `partial` perche' mancavano le procedure. Ora ci
  sono, ma **nessuna e' stata eseguita**.
- **Cosa e' stato fatto:** `status: written`, con la riga che dice cosa
  significa: le procedure esistono e sono eseguibili, e **non** significa che
  qualcuno le abbia fatte. Aggiunti `procedures_total: 13`,
  `procedures_closed: 0` e `closing_windows` al frontmatter, cosi' che il fatto
  sia leggibile senza aprire il corpo.
- **File:** `35-HUMAN-UAT.md` · **Commit:** `6bd66ba`

---

## Verifica — e cosa questi verdi dicono davvero

**Non esistono test del prodotto.** Nessuna riga qui sotto e' «i test passano».

| Criterio | Comando | Esito |
|---|---|---|
| Procedure con requisito | `grep -c 'ASSIGN-0'` | **PASS** — 43 (richiesto ≥ 12) |
| Procedure con `status: pending` | `grep -c 'status: pending'` | **PASS** — 15 righe, **13 procedure** (richiesto ≥ 12) |
| I nove file di migration nominati | `grep -o '20260809…\.sql' \| sort -u \| wc -l` | **PASS** — **9** esatti |
| `verify:media-strip` nominato | `grep -q` | **PASS** |
| Nessun indirizzo di posta | `! grep -qiE "@(gmail\|outlook\|resonatemotion)"` | **PASS** |
| Nessuna sede, nessun nome | `grep -niE "booze\|muro\|perlone\|torino\|via \|corso "` | **PASS** — solo occorrenze di «percorso» |
| Le nove ancore del task 2 | `ASSIGN-07`, `verify:no-credit-account`, `entry_role`, `lineup`, `EXIF`, `NAV_ITEMS`, `attendances`, `quarantena`, `ritirat` | **PASS** — `COVERAGE_OK` |
| Il sign-off ha booleani reali | `grep -qE "^nyquist_compliant: (true\|false)"` e `^wave_0_complete:` | **PASS** — `SIGNOFF_OK` |
| *Feedback Latency Tiers* presente e invariata | `grep -q` + lettura del diff | **PASS** — le uniche righe del diff che la nominano sono le voci di sign-off |
| *Per-Requirement Verification Map* invariata | lettura del diff | **PASS** — nessuna riga della tabella nel diff |
| La coda 6 + 8 + 1 e' ancora in testa | lettura | **PASS** — non spostata; l'unica aggiunta prima di «Il falso verde» e' la sezione delle finestre |
| Lunghezza di `35-HUMAN-UAT.md` | `wc -l` | **PASS** — 1385 righe (richiesto ≥ 300) |
| Nessun file cancellato | `git diff --diff-filter=D` | **PASS** — nessuno |
| `STATE.md` / `ROADMAP.md` / `deferred-items.md` | non nel diff | **PASS** — non modificati |
| Nessuno stub | `grep -E 'TODO\|FIXME\|placeholder\|coming soon'` | **PASS** — nessuna occorrenza |

### Cosa queste verifiche NON provano

- **Nessuna delle tredici procedure e' stata eseguita.** Sono tutte
  `status: pending`. Il deliverable e' il documento **scritto**; eseguirlo
  richiede una serata, un telefono e la coda applicata.
- **Nessuna migration di questa fase e' applicata in produzione.** Le sei della
  fase 43 lo sono; le nove di questa no — riga 15 compresa. **Finche' la riga 15
  non e' applicata, la spoglia dei metadati e' aggirabile**: una sessione di
  membro approvato puo' scrivere in `event-media` da una console del browser e
  pubblicare una foto con dentro le coordinate GPS. Il codice spedito **non
  chiude quella porta**; la chiude l'operazione manuale.
- **Nessun grep prova che una procedura sia eseguibile.** I controlli automatici
  di questo piano contano occorrenze: che una persona con un telefono possa
  seguire i passi senza chiedere niente a nessuno **non e' misurabile da un
  comando**, e resta un giudizio dichiarato.
- **La riconciliazione con `deferred-items.md` e' una lettura, non una
  modifica.** Quel file **non e' stato toccato** e continua a portare la voce 9
  come aperta.
- **`npm run build` non e' stato eseguito** perche' nessun file di `src/` e' nel
  diff, e **non avrebbe detto niente** su questi documenti.

---

## Threat Flags

Le voci del threat register del piano, con come sono coperte.

| ID | Disposizione | Come, e con quale prova |
|---|---|---|
| T-35-68 | mitigato | Ruoli, mai persone: il documento non contiene nomi, indirizzi di posta, codici di membership, date non annunciate ne' sedi. Asserito con due grep — `@(gmail\|outlook\|resonatemotion)` e i nomi delle sedi in rotazione — entrambi a zero. La tabella dei ruoli in testa alle procedure esiste apposta perche' chi esegue non sia tentato di scrivere il nome dell'account che ha usato |
| T-35-69 | mitigato | La dichiarazione di copertura e' scritta come **dati**, con la frase che un build verde non e' evidenza in questa fase, ripetuta dove non si puo' mancare. E la riga che nessun documento di questa fase puo' dire «verificato perche' i test passano» |
| T-35-70 | mitigato | Tredici voci di debito, ognuna con la ragione del rinvio; i due debiti **chiusi** dentro la fase dichiarati **ritirati per nome** invece di sparire dall'elenco; e le undici voci di `deferred-items.md` riconciliate una per una, **nessuna cancellata** — compresa quella **ritirata perche' falsa**, che resta come smentita con il comando che chiunque puo' rieseguire |
| T-35-71 | mitigato | La settima voce di sign-off resta **non spuntata** e nomina il documento che la chiudera'. Le sei voci di Wave 0 portano ognuna il piano che l'ha soddisfatta, e in due casi quel piano **non e' quello previsto** |
| T-35-93 | mitigato | La precisazione su ASSIGN-01 e' scritta in due punti — nella dichiarazione e nella nota alla prova 7 — e le procedure **7**, **8** e **9** sono quella meta'. Piu' il terzo pezzo che il piano non prevedeva: **arrivare allo strumento non e' usarlo**, che e' la prova **11** |

### Superfici non previste dal piano

| Flag | File | Descrizione |
|---|---|---|
| threat_flag: stale-reference | `.planning/phases/35-per-night-assignments/35-VALIDATION.md` | La riga *Manual-Only* dice *«senza la migration 12»* intendendo la riga **14**. Non corretta di proposito — la tabella non si ritocca — quindi la discrepanza **resta nel repository** e vive solo grazie alla nota in `35-HUMAN-UAT.md`. Se un giorno quella nota sparisse, il numero sbagliato tornerebbe autorevole |
| threat_flag: unreconciled-document | `.planning/phases/35-per-night-assignments/deferred-items.md` | La voce **9** e' chiusa dal piano 35-21 e quel file la porta ancora come aperta. Registrato in `35-HUMAN-UAT.md`; il file **non e' stato toccato** per contratto di worktree. Chi lo aggiornera' deve segnarla `CHIUSA il 2026-08-09 dal piano 35-21` |

---

## Self-Check: PASSED

| Oggetto | Esito |
|---|---|
| `.planning/phases/35-per-night-assignments/35-HUMAN-UAT.md` | **FOUND** — 1385 righe |
| `.planning/phases/35-per-night-assignments/35-VALIDATION.md` | **FOUND** |
| `.planning/phases/35-per-night-assignments/35-14-SUMMARY.md` | **FOUND** |
| Commit `b7ac16b` | **FOUND** |
| Commit `6bd66ba` | **FOUND** |
| Commit `0f55061` | **FOUND** |
| `.planning/STATE.md` | **NON MODIFICATO**, come da contratto |
| `.planning/ROADMAP.md` | **NON MODIFICATO**, come da contratto |
| `.planning/phases/35-per-night-assignments/deferred-items.md` | **NON MODIFICATO**, come da contratto — letto e riconciliato, non riscritto |
