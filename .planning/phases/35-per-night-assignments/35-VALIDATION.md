---
phase: 35
slug: per-night-assignments
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-08-08
---

# Phase 35 — Validation Strategy

> Contratto di validazione per il campionamento del feedback durante l'esecuzione.
>
> **Derivato da** `35-RESEARCH.md § Validation Architecture`, che porta le
> citazioni `file:riga` a sostegno di ogni riga di questo documento.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | **NESSUNO per il prodotto.** `package.json` non ha script `test`; non esiste alcun `*.test.*` ne' `*.spec.*` |
| **Config file** | none — e Wave 0 **non** ne installa uno: introdurre un runner e' una decisione di progetto, non un dettaglio di piano, e non sta su questo ROADMAP |
| **Quick run command** | `npm run build` — che **e' anche** il typecheck (non esiste uno script `typecheck` separato) |
| **Full suite command** | `npm run build && npm run verify:capabilities && npm run verify:no-header-identity && npm run verify:no-credit-account && npm run verify:media-strip && npm run verify:persona` |
| **Estimated runtime** | vedi *Feedback Latency Tiers* sotto: i tre livelli hanno costi di ordini di grandezza diversi e **non vanno riassunti in un numero solo** |

**L'harness a container esiste gia' ed e' progettato per essere esteso** (fasi 32
e 43):

| Script | Righe | Cosa fa | Perche' conta qui |
|---|---|---|---|
| `scripts/rls-baseline-container.mjs` | 561 | avvia `postgres:17.6` (major.minor di produzione), applica `schema.sql` + tutte le migration, semina 14 persone, cattura, **distrugge sempre** il container | **Non legge alcuna variabile d'ambiente**: non esiste percorso per cui tocchi un database vero |
| `scripts/container/seed.mjs` | 875 | semina le persone, **rilassando `role ⇒ approved` durante la semina e ripristinandolo dopo** | conserva le quattro persone che quel vincolo rende irrappresentabili — le stesse che hanno preso l'unico difetto serio della fase 32 |
| `scripts/rls-baseline.mjs` | 1874 | B1 policy · B2 matrice di lettura · **B3 matrice di scrittura** | `PROBE_PAYLOADS` (`:1069`) **si rifiuta di eseguire B3** se una tabella con RLS non ha la sua voce: una tabella nuova **obbliga** a dichiarare il payload |
| `scripts/verify-capabilities.mjs` | 1176 | cinque lati; `ROLE_GRANTS` (`:173`) pretende una decisione per **ogni** coppia ruolo × capability | esce 1 nominando la coppia sia quando un rifiuto dichiarato acquista una riga sia quando un grant dichiarato la perde |
| `scripts/verify-no-header-identity.mjs` | 396 | verifica strutturale a grep | e' **il modello** da riusare per ASSIGN-07 |

---

## Feedback Latency Tiers

> Questa sezione esiste perche' la riga *«max feedback latency ~120 s»* era
> **falsa per una parte dei task di questa fase**. La cattura a container e'
> dichiarata dallo stesso documento come *«dell'ordine dei minuti»*: annunciare
> 120 s per tutti sarebbe stato un numero che nessuno avrebbe mai osservato.
>
> **Nessuna verifica viene indebolita per farla rientrare in un livello.**
> L'harness a container e' l'**unico** posto in cui la DDL di questa fase viene
> esercitata prima che una persona la applichi a mano: e' il costo giusto da
> pagare, e va pagato dove serve invece che nascosto.

| Livello | Comando | Latenza | Quando |
|---|---|---|---|
| **T1 — typecheck** | `npm run build` | **~120 s** | dopo **ogni** commit di task. E' anche l'unico livello che gira su un task senza DDL |
| **T2 — verifiche strutturali** | `npm run verify:capabilities`, `npm run verify:no-header-identity`, `npm run verify:no-credit-account`, `npm run verify:persona` | **secondi** — sono grep strutturali e interrogazioni di catalogo | dopo ogni wave, e dentro i task che coniano chiavi |
| **T3 — cattura a container** | `npm run baseline:container [-- --phase-point=…]`, `npm run baseline:compare` | **minuti** — avvia `postgres:17.6`, applica `schema.sql` piu' l'intera coda di migration, semina, cattura e distrugge il container | **solo** sui task che producono o modificano DDL |

**I task che pagano T3, dichiarati per nome** — cosi' che nessuno si aspetti da
loro la latenza di T1. La riga e' stata **rimisurata leggendo i blocchi
`<automated>` di tutti i piani** dopo la revisione del 2026-08-08, perche' la
versione precedente ometteva `35-09 T3` e `35-15 T3` pur essendo entrambi
chiamanti di `baseline:container`, e una riga incompleta rende falso il
sign-off che dice *«ogni task che paga T3 e' nominato li'»*:

35-01 T3 · 35-02 T1 e T3 · 35-03 T1, T2 e T3 · 35-04 T1 e T3 · 35-05 T1 e T3 ·
35-06 T3 · 35-07 T1 e T2 · 35-08 T1 · 35-09 T2 e T3 · 35-10 T1 · 35-11 T1 ·
35-12 T1 · 35-13 T1 · 35-14 T2 · 35-15 T1 e T3 · 35-16 T1 · 35-17 T1 e T2 ·
**35-18 T1, T2 e T3** · **35-19 T1 e T3** · **35-20 T1** · **35-21 T1, T2 e T3**.

Due note che la riga da sola non porta. **35-01 paga T3 nel comando del task,
non nel suo `<automated>`**: la cattura `35-pre` e' una esecuzione a container a
tutti gli effetti, e ometterla perche' il verify e' un `test -f` sarebbe
contarla per dove sta scritta invece che per quello che costa. E **35-21 e' il
solo piano che paga anche T2 su uno script nuovo** (`verify:media-strip`), che
va provato per mutazione cinque volte prima di poter essere creduto.

Il livello T1 e' la **frequenza di campionamento**; T3 e' il **gate**. Un task
che paga T3 e' un task il cui esito non e' osservabile in altro modo, e
sostituirlo con un grep sarebbe scambiare un controllo per un rituale.

---

## Sampling Rate

- **Dopo ogni commit di task:** T1 (`npm run build`)
- **Dopo ogni wave:** T1 + T2 (`npm run verify:capabilities -- --target=container` + `npm run verify:no-header-identity`, piu' `npm run verify:persona` se la persona e' stata toccata)
- **Sui task con DDL:** T3, come dichiarato nella tabella sopra
- **Gate di fase, prima di `/gsd:verify-work`:** T3 completo (`npm run baseline:container` con confronto contro la cattura **pre-fase**, `npm run baseline:compare`), **piu'** `35-HUMAN-UAT.md` **scritto** — non eseguito: eseguirlo richiede una serata
- **Max feedback latency:** dipende dal livello, ed e' dichiarato in *Feedback Latency Tiers*. Il numero **~120 s vale per T1**, cioe' per i task senza cattura a container

---

## Per-Requirement Verification Map

Il planner deve mappare ogni task su una di queste righe. La colonna **Copertura
automatica** e' la dichiarazione onesta di cosa un comando puo' provare.

| Req | Cosa deve essere vero | `npm run build` prova | Container / write matrix prova | Copertura automatica | Serve una persona con un telefono |
|---|---|---|---|---|---|
| **ASSIGN-01** | una persona assegnata a una notte usa gli strumenti di quella notte e di nessun'altra | che compili; **nulla** sui permessi | B3 su `party_assignments`; **e B2/B3 su ogni altra tabella devono restare byte-identiche**, `event_media` **inclusa** nonostante il piano 35-18 ne cambi la forma di riga — e' la prova che l'assegnazione non filtra altrove | ⚠️ **solo sul permesso** | **si'** — la matrice prova che il **permesso** e' per-notte, non che la persona **arrivi** allo strumento. Il routing e le tre superfici si osservano solo aprendo l'applicazione: procedure 9, 10, 11 e 12 |
| **ASSIGN-02** | l'accesso non sopravvive alla notte | nulla | il predicato `now() < ends_at` spostando **`ends_at`, mai `now()`** | ⚠️ parziale | **si'** — il ramo offline |
| **ASSIGN-03** | revoca registrata, coda mai appesa | nulla | che la revoca sia una riga e non una `DELETE` (SQL); che il drain giudichi al tempo `scannedAt` (chiamata HTTP diretta) | ⚠️ meta' | **si'** — la coda vive in IndexedDB |
| **ASSIGN-04** | nessuno si assegna da solo | nulla | sonda B3 con `assigned_by = user_id` deve tornare `23514`; **e la mutazione va provata**: rimuovere il `CHECK` deve far diventare verde la cella | ✅ piena | no |
| **ASSIGN-05** | undo rifiutato a chi ha solo la porta, permesso a un organizer | nulla | solo il lato server, con due sessioni via HTTP | ⚠️ parziale | **si'** — la frase distinguibile e' osservabile **solo in build di produzione**, e il ramo offline vive sul dispositivo |
| **ASSIGN-06** | un credito non concede nulla e puo' esistere senza account | **meta', ed e' insolita**: un credito che *provasse* a portare un account non compilerebbe, se il tipo di riga non ha il campo | B2/B3 su `party_credits`; **prova negativa**: una persona con un credito e nessuna assegnazione ha la stessa matrice di un `member` | ✅ piena | solo per la superficie |
| **ASSIGN-07** | creare un credito non crea un account | nulla | nulla | ✅ **solo se si scrive lo script**: grep strutturale sul modello di `verify-no-header-identity.mjs`, esce 1 se il percorso del credito importa l'admin API | no |
| **ASSIGN-08** | risolto **una volta** all'apertura, non a ogni scan | nulla | nulla | ❌ nessuna | **si', interamente**: N scansioni ⇒ N chiamate di check-in e **ZERO** chiamate d'autorizzazione, contate nel pannello di rete |

---

## Wave 0 Requirements

Nessuno di questi installa un framework: sono le **precondizioni di misurabilita'**
dell'harness che esiste gia'.

- [ ] **La cattura di baseline PRIMA della prima riga di DDL.** Una baseline
      presa dopo il cambiamento non e' una baseline. Precedente esplicito in
      `.planning/STATE.md` per la fase 32.
- [ ] La voce di `PROBE_PAYLOADS` per `party_assignments` **e** per
      `party_credits` — senza, **B3 si rifiuta di girare**. E la voce
      **esistente** di `event_media` va aggiornata (piano 35-18): la policy di
      inserimento pretende che la serata appartenga all'evento, e i due
      segnaposto `{{events}}` e `{{event_parties}}` sono risolti in modo
      indipendente, quindi una coppia incoerente farebbe rifiutare ogni cella
      **per il motivo sbagliato**.
- [ ] Le decisioni in `ROLE_GRANTS` per ogni chiave di capability nuova, una per
      ogni ruolo (quattro ruoli dalla fase 43).
- [ ] **Il terzo asse nel seed del container.** La griglia odierna e' ruolo ×
      stato; un'**assegnazione** e' un terzo asse. Il seed deve produrre almeno
      *staff assegnato alla notte 1*, *staff assegnato alla notte 2*, *staff non
      assegnato* — **altrimenti ASSIGN-01 e' vacuo in ogni cella** — e almeno una
      persona che tiene `party.manage`, altrimenti il terzo braccio della policy
      del registro della porta e' una riga che nessuna cella attraversa.
- [ ] Lo script strutturale per ASSIGN-07.
- [ ] Lo script strutturale `verify:media-strip` (piano 35-21), provato per
      mutazione su tutti e cinque i suoi controlli.

---

## Manual-Only Verifications

Il deliverable per queste e' `35-HUMAN-UAT.md`, sul modello di
`43-HUMAN-UAT.md` — **scritto**, con l'ordine di applicazione in testa e le
finestre che si chiudono dichiarate.

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| L'accesso a una notte finita non funziona su un dispositivo che non ha visto la rete da ore | ASSIGN-02 | nessuno strumento del repo raggiunge un dispositivo con la radio spenta; e l'orologio del telefono e' **evidenza, mai autorita'** (`verify/route.ts:343-345`) | scanner aperto prima della fine della notte, radio spenta, scansione dopo `ends_at`; osservare quale delle due parti decide |
| Una scansione gia' in coda non resta appesa quando l'assegnazione viene revocata | ASSIGN-03 | la coda vive in IndexedDB sul telefono | scansionare offline, revocare l'assegnazione dal server, riaccendere la radio, osservare il drain: la scansione deve **risolversi**, non finire in `blocked` in attesa di un login che non la sbloccherebbe |
| Il rifiuto dell'undo arriva come **frase distinguibile**, non come «qualcosa e' andato storto» | ASSIGN-05 | Next redige i messaggi delle Server Action **solo in produzione** | build di produzione, sessione assegnata alla sola porta, tentare l'undo; poi la stessa azione da organizer |
| L'undo locale con la radio spenta non aggira la supervisione | ASSIGN-05 | il ramo e' in `ScannerClient.tsx:869-892` e vive sul dispositivo | radio spenta, tentare l'undo di una scansione in coda con una sessione assegnata alla sola porta |
| L'autorizzazione si risolve una volta sola | ASSIGN-08 | «quante volte una chiamata parte» e' comportamento del client | pannello di rete aperto, N scansioni consecutive: **N chiamate di check-in, zero chiamate d'autorizzazione** |
| La superficie di assegnazione fa quello che dice | ASSIGN-01, ASSIGN-06 | interfaccia | assegnare e revocare da `/organizer/events/[id]/…`, verificare l'atto nel registro con autore e timestamp |
| **Una persona `staff` assegnata alla porta RAGGIUNGE lo scanner** | ASSIGN-01 | il rimbalzo avviene nel middleware, prima che qualunque pagina esista: nessuna matrice e nessun typecheck lo vede. **[serve una mano tecnica]**: senza la migration 12 applicata la prova e' falsa-negativa **per configurazione** | sessione `staff` senza assegnazione ⇒ rimbalzo; assegnata alla porta di una notte ⇒ entra, e nella lista compare **quella notte e nessun'altra**. Osservare che le tre cause del rimbalzo sono **tre schermate diverse** |
| **L'assegnazione «photo» sblocca il caricamento, e senza non lo sblocca** | ASSIGN-01 | il gate vive in due Server Action e l'esito si vede solo dall'interfaccia pubblica dell'evento | tentare il caricamento da una sessione `staff` non assegnata ⇒ rifiuto che dice **quale** dei due motivi e'; assegnare come «photo» a una notte dell'evento ⇒ il caricamento riesce |
| **L'organizer di una notte vede quella notte e non l'altra** | ASSIGN-01 | il gate si valuta sulla serata risolta dall'indirizzo: e' un gate che **deve poter fallire**, e il fallimento si osserva cambiando l'indirizzo a mano | evento con **due** serate, assegnazione su una sola; aprire la revisione di quella ⇒ si vede; cambiare la serata nell'indirizzo ⇒ rimbalza. Una lista **vuota** invece di un rimbalzo significa che manca il braccio `party.manage` nella policy |
| **I metadati escono davvero dal file, e il video verso una notte segreta e' rifiutato** | ASSIGN-01 | nessuno strumento del repository apre un file e ne legge l'EXIF: la spoglia e' una proprieta' **a tempo d'esecuzione**, e lo script strutturale prova il *percorso*, non il *risultato*. **[serve una mano tecnica]**, e vale **solo con la quindicesima migration applicata** | foto con GPS **noto e annotato prima**, caricata da un fotografo assegnato; scaricare l'oggetto **dall'URL pubblico** e ispezionarlo: nessuna coordinata, nessuna data di scatto, nessun modello, e l'orientamento invariato. Poi un **video** verso una serata con sede segreta ⇒ rifiuto con la sua frase. La prova vale **un file**: `npm run verify:media-strip` e' l'altra meta' e non la sostituisce |

---

## Validation Sign-Off

- [ ] Ogni task porta un `<automated>` verify oppure una dipendenza esplicita da Wave 0
- [ ] Continuita' di campionamento: mai 3 task consecutivi senza verifica automatica
- [ ] Wave 0 copre tutti i riferimenti MANCANTI sopra
- [ ] Nessun flag di watch-mode
- [ ] Latenza di feedback dichiarata **per livello** in *Feedback Latency Tiers*, e ogni task che paga T3 e' nominato li'
- [ ] `35-HUMAN-UAT.md` **scritto** prima della chiusura di fase
- [ ] La dichiarazione di copertura onesta e' riportata nel `35-VERIFICATION.md`: **4 requisiti su 8 chiudibili automaticamente (01 limitatamente al permesso, 04, 06, 07); gli altri quattro (02, 03, 05, 08) hanno una meta' che nessuno strumento di questo repository puo' raggiungere — e ASSIGN-01 ha la propria: che la persona assegnata ARRIVI allo strumento**
- [ ] `nyquist_compliant: true` impostato nel frontmatter

**Approval:** pending
