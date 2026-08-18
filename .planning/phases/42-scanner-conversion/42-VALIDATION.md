---
phase: 42
slug: scanner-conversion
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-08-18
---

# Phase 42 — Validation Strategy

> **Attenzione a leggere questo file da solo — 2026-08-18.** Tutte e 37 le righe
> qui sotto portano ancora `⬜ pending`, comprese cinque che sono chiuse: la
> chiusura e' registrata in `42-BASELINE.md` §Step 5 e in `42-VERIFICATION.md`,
> non qui. **La fonte di cosa e' chiuso e' `42-VERIFICATION.md`**, e la riga 3m
> non e' *pending*: e' permanentemente non chiudibile (`DEF-42-04`). Questo
> disallineamento e' rumore documentale, non un difetto di codice — ma chi
> legge solo questo file non puo' saperlo, ed e' per questo che la nota sta in
> testa invece che in fondo.



> Contratto di validazione per il campionamento del feedback durante l'esecuzione.
> Derivato da `42-RESEARCH.md` (misurato 2026-08-18) e da `42-CONTEXT.md`
> D-42-01…D-42-08.
>
> **Questa fase ha un vincolo che nessuna delle precedenti aveva:** una parte della
> mappa **non è eseguibile oggi**. D-42-04 blocca le onde di conversione fino a che
> il door pass non sia stato eseguito sullo scanner **non convertito**, alla prima
> porta reale. La colonna **Quando** dice, riga per riga, da che lato del vincolo
> sta ognuna — perché è la differenza fra un piano che si può cominciare e uno che no.
>
> Nessuna data, sede, sigla di serata o nome di persona: `.planning/` è tracciato e
> questo repository è **pubblico**. Tutto è ancorato a **eventi**.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | **Nessuno.** Nessuno script `test` in `package.json`; nessun `*.test.*` / `*.spec.*` nell'albero. È un repository `CLAUDE.md` Guardrail 1 |
| **Config file** | nessuno |
| **Quick run command** | `npm run build` — che **è** il typecheck di Next; non esiste uno script `typecheck` separato |
| **Full suite command** | `npm run verify` (`scripts/verify-all.mjs`) + `npm run build` |
| **Stato di partenza** | ⚠ `npm run verify` **esce 2 oggi** su un albero corretto: `checkManifest()` rifiuta su quattro voci morte (DEF-45-01, D-42-06). Verificato eseguendolo il 2026-08-18 |
| **Gate nuovo di questa fase** | `scripts/verify-scan-legibility.mjs` (D-42-05) — oklch → sRGB lineare, **Brettel, Viénot & Mollon 1997 a due semipiani**, CIEDE2000, soglia **10** |
| **Runtime stimato** | ~90–180 s per la coppia, dominato dal build |

**Nessun passo di nessun piano può dire «i test lo prenderanno».** La parola *test*
non descrive niente che esista qui. Ciò che esiste è un build che typechecka, una
famiglia di script che asseriscono sul sorgente, e **procedure scritte che una
persona esegue**. Su questa fase la seconda categoria è insolitamente forte e la
terza è insolitamente decisiva: il criterio 1 e il criterio 3 si chiudono **al buio,
su un dispositivo, con una fila davanti**, e nessuno strumento di questo repository
rende un pixel.

---

## Sampling Rate

- **Dopo ogni commit di task:** `npm run build`
- **Dopo ogni onda:** `npm run build` + `npm run verify`
- **Dopo ogni commit che tocca un colore dentro il perimetro:** `npm run verify:scan-legibility`
  *(dalla sua registrazione in poi — vedi la nota sulla registrazione ritardata qui sotto)*
- **Se viene toccato un file sotto `.claude/rules/**` o `CLAUDE.md`:** `npm run verify:persona`,
  con la voce di changelog e il bump di versione **nello stesso commit**
- **Prima di `/gsd:verify-work`:** tutto quanto sopra verde, **più** il reperto meccanico
  rifatto e confrontato riga per riga, **più** ogni procedura scritta con un `Result:`
  diverso da `pending`
- **Latenza massima del feedback:** ~180 s

### ⚠ Due conseguenze di campionamento che il piano deve assorbire

**1. `verify:scan-legibility` non può essere registrato in `verify-all.mjs` in wave 0.**
Il gate rilegge i colori dal sorgente. Sul codice **non convertito** la terna misura
un minimo di **2,1** (`42-CONTEXT.md`, tabella dello stato di oggi), quindi il gate
esce **1** finché la conversione non è avvenuta — e la conversione è bloccata da
D-42-04 fino alla prima porta reale. Registrarlo in wave 0 significa lasciare
`npm run verify` **rosso per tutto l'intervallo bloccato**, che è esattamente la
condizione in cui un gate viene spento (`verify-media-strip.mjs:51-62`, §0 rule 3,
citata tre volte in questa famiglia di file).

> **Forma onesta:** in wave 0 lo script si **scrive** e si **prova per mutazione**
> (D-42-05) invocandolo a mano; la riga in `package.json` e la voce in
> `verify-all.mjs` `OFFLINE` viaggiano nell'**onda di conversione**, insieme al colore
> che le rende vere. Le due modifiche restano nello stesso commit fra loro
> (`verify-all.mjs:176-194` rifiuta l'intera suite se un nome sta in una sola delle due liste).

**2. L'apertura del recinto non può stare in wave 0, per la stessa ragione.**
D-42-07 fa entrare i tre percorsi in `CONVERTED` **nello stesso commit** in cui
`PHASE_42_PATHS` sparisce. Misurato eseguendo il gate: nel momento in cui accade,
`verify:conversion` va rosso su **A** (64 utility di palette grezza per superficie),
**B** (42 utility di token legacy) e **D** (nessuna delle due pagine della porta
importa `PageShell`), e `verify:dialogs` e `verify:touch-targets` con loro. Se quel
commit è in wave 0, cinque check restano rossi per tutto l'intervallo bloccato.
**Il recinto si apre nell'onda che converte**, non prima. Ciò che wave 0 può e deve
fare senza toccare la porta è tutto il resto: DEF-45-01, le sei pagine di produzione,
i meccanismi di check D e check E scritti **prima** del primo run rosso (D-41-16), e
la scrittura del gate.

---

## Il vincolo di sequenza (D-42-04), come tre soglie

Ogni riga della mappa porta una di queste tre etichette nella colonna **Quando**.

| Etichetta | Significato | Evento che la sblocca |
|---|---|---|
| **ORA** | Eseguibile oggi. Non tocca nessun file dello scanner | — |
| **ONDA** | Eseguibile solo dentro le onde di conversione | **Il door pass sullo scanner NON convertito**, eseguito alla prima porta reale (D-42-04 punto 3) |
| **PORTA** | Chiudibile solo da una persona, a una porta reale | La serata stessa — e per due righe, **la porta successiva** a quella |

**Nessuna data compare in questo documento.** Chi esegue legge il calendario in
`docs/`, che è ignorato da git. Scrivere qui la data, la sede o la sigla la
pubblicherebbe, e una pubblicazione non si annulla.

---

## Per-Task Verification Map

Gli ID dei task li assegna il planner; questa mappa lega **comportamenti** a evidenze,
così che ogni task possa citare una riga. `⬜ pending` ovunque — nulla è stato eseguito.

### Wave 0 — i gate, e non un file dello scanner

| # | Comportamento | Criterio / Decisione | Quando | Tipo | Comando automatico | Esiste | Stato |
|---|---|---|---|---|---|---|---|
| 0a | `checkManifest()` non rifiuta: le quattro voci Finance/Analytics fuori da `CONVERTED` | D-42-06 · DEF-45-01 | **ORA** | source assertion | `npm run verify:conversion` (exit ≠ 2) | ✅ esiste | ⬜ pending |
| 0b | Check F verde: le sei pagine di produzione delle fasi 44/45 hanno una disposizione dichiarata | D-42-08 §1 | **ORA** | census sul tree | `npm run verify:conversion` (check F) | ✅ esiste, ❌ W0 la disposizione | ⬜ pending |
| 0c | Il **reperto meccanico** pre-conversione è catturato e committato: 13 blocchi, con SHA e data | D-42-04 §2 | **ORA** | script che stampa il sorgente | `node scripts/…` → `42-BASELINE.md` | ❌ W0 | ⬜ pending |
| 0d | `verify-scan-legibility.mjs` esiste e la sua **prova per mutazione** passa in tutti e quattro i versi | D-42-05 | **ORA** | il gate contro sé stesso | invocato a mano, non ancora in `verify-all` | ❌ W0 | ⬜ pending |
| 0e | I meccanismi di check D e check E sono scritti **prima** del primo run rosso | D-41-16 · D-42-08 §2 | **ORA** | source assertion | `npm run verify:conversion` (resta verde) | ❌ W0 | ⬜ pending |

### Criterio 1 — accetta e rifiuta saturi e inequivocabili, ognuno con un secondo canale

| # | Comportamento | Criterio / Decisione | Quando | Tipo | Comando automatico | Esiste | Stato |
|---|---|---|---|---|---|---|---|
| 1a | I **quattro canali** esistono in sorgente per ognuno dei tre esiti: colore, glifo, permanenza, vibrazione | DS-04 (2ª metà) · SC-1 | **ORA** | source assertion | grep su `ScanFlash.tsx:76-118` + `haptics.ts:17-40` | ❌ W0 | ⬜ pending |
| 1b | Tutti i siti di `showFlash` passano un titolo: lo stato è **scritto a parole**, non solo dipinto | DS-04 · SC-1 | **ORA** | source assertion | conteggio dei siti + tipo per sito | ❌ W0 | ⬜ pending |
| 1c | Le tre coppie del flash **più** la pillola *Offline* stanno ≥ **10** in tutte e quattro le simulazioni | DS-04 · SC-1 · D-42-05 | **ONDA** | il gate nuovo | `npm run verify:scan-legibility` | ❌ W0 | ⬜ pending |
| 1d | Il gate è registrato e la suite intera resta verde | D-42-05 | **ONDA** | aggregato | `npm run verify` | ✅ estendere | ⬜ pending |
| 1e | I **due** commenti falsi sono corretti — `ScanFlash.tsx:65-72` e `ScannerClient.tsx:2792-2798` | D-42-02 | **ONDA** | assertion negativa | grep: nessuna delle due frasi sopravvive | ❌ W0 | ⬜ pending |
| 1f | Il terzo stato è cambiato in **entrambi** i posti: il flash **e** la cronologia a `ScannerClient.tsx:3282-3320` | D-42-02 | **ONDA** | source assertion | grep: zero `amber-500` nel perimetro | ❌ W0 | ⬜ pending |
| 1g | L'inchiostro del glifo rispetta la regola scelta, e il suo contrasto è misurato sui tre riempimenti compositi | D-42-02 · `globals.css:176-178` | **ONDA** | check dentro `verify:scan-legibility` | `npm run verify:scan-legibility` | ❌ W0 | ⬜ pending |
| 1h | **Una persona distingue accetta da rifiuta** a distanza di braccio, al buio, con una mano | SC-1 | **PORTA** | **manuale** | nessuno — vedi Manual-Only | ❌ W0 | ⬜ pending |
| 1i | **Il terzo stato si legge come *già registrato*, mai come un rifiuto** | SC-1 · `ScanFlash.tsx:14-20` | **PORTA** | **manuale** | nessuno — vedi Manual-Only | ❌ W0 | ⬜ pending |

### Criterio 2 — il mirino si centra a ogni larghezza invece di stirarsi

| # | Comportamento | Criterio / Decisione | Quando | Tipo | Comando automatico | Esiste | Stato |
|---|---|---|---|---|---|---|---|
| 2a | Check D verde su **entrambe** le pagine della porta — shell importata, o meccanismo dichiarato che le perdona per nome | RESP-05 · SC-2 · D-42-08 | **ONDA** | source assertion | `npm run verify:conversion` (check D) | ✅ estendere | ⬜ pending |
| 2b | Il contenitore del mirino dichiara un massimo e si centra; la superficie non è più a piena larghezza | RESP-05 · SC-2 | **ONDA** | source assertion | grep sul contenitore di `#qr-reader` | ❌ W0 | ⬜ pending |
| 2c | `qrbox`, `fps` e `facingMode` sono **invariati**: il criterio 2 tocca il contenitore, mai la decodifica | RESP-05 · SC-3 | **ONDA** | diff sul reperto | confronto con `42-BASELINE.md` blocco 11 | ❌ W0 | ⬜ pending |
| 2d | **Una persona conferma** che il mirino è centrato e lavorabile su telefono, tablet e desktop reali | SC-2 | **PORTA** | **manuale** | nessuno — vedi Manual-Only | ❌ W0 | ⬜ pending |

### Criterio 3 — ogni comportamento invariato

| # | Comportamento | Criterio / Decisione | Quando | Tipo | Comando automatico | Esiste | Stato |
|---|---|---|---|---|---|---|---|
| 3a | Il build passa: è il typecheck, ed è l'unica verifica automatica del prodotto | SC-3 · Guardrail 1-2 | **ORA** e a ogni onda | build | `npm run build` | ✅ esiste | ⬜ pending |
| 3b | Check A verde: nessuna utility di palette grezza raggiungibile, salvo le deroghe **dichiarate** per accetta e rifiuta | DS-04 · D-42-01 | **ONDA** | source assertion | `npm run verify:conversion` (check A) | ✅ esiste | ⬜ pending |
| 3c | Check B verde: zero utility di token legacy nel perimetro (**42** oggi) | DS-04 | **ONDA** | source assertion | `npm run verify:conversion` (check B) | ✅ esiste | ⬜ pending |
| 3d | Check E verde dopo la cancellazione di `MobileNav`: la porta **non** prende la colonna da 224px | D-42-03 · D-42-08 §2 | **ONDA** | source assertion | `npm run verify:conversion` (check E) | ✅ estendere | ⬜ pending |
| 3e | `verify:dialogs` verde: la ragione di `ScanFlash.tsx:135` è passata dal recinto a `EXEMPT_SHELLS` | D-42-08 §3 | **ONDA** | source assertion | `npm run verify:dialogs` | ✅ estendere | ⬜ pending |
| 3f | `verify:touch-targets` ha una disposizione dichiarata per i **14** elementi sotto i 44px | D-42-08 §3 | **ONDA** | source assertion | `npm run verify:touch-targets` | ✅ estendere | ⬜ pending |
| 3g | Le **18** citazioni in prosa a `MobileNav` hanno una disposizione: corrette, o debito con la sua ragione | D-42-03 | **ONDA** | assertion negativa | grep su `src/` e `scripts/` | ❌ W0 | ⬜ pending |
| 3h | Il reperto meccanico rifatto è **identico riga per riga** al blocco pre-conversione | SC-3 · D-42-04 §4 | **ONDA** | diff | `diff` contro `42-BASELINE.md` | ❌ W0 | ⬜ pending |
| 3i | I tre `delay` (1500 / 2500 / 2000) e i tre pattern aptici sono invariati | SC-3 | **ONDA** | diff sul reperto | blocchi 1-3 | ❌ W0 | ⬜ pending |
| 3j | I **26** siti di `showFlash` sono ancora 26, ognuno con lo stesso esito | SC-3 | **ONDA** | diff sul reperto | blocco 4 | ❌ W0 | ⬜ pending |
| 3k | `DB_VERSION` e `MAX_SYNC_ATTEMPTS` invariati — una versione di DB che sale in una fase di colore è un difetto per definizione | SC-3 · `checkin-offline.md` | **ONDA** | diff sul reperto | blocco 7 | ❌ W0 | ⬜ pending |
| 3l | Le quattro tabelle di messaggi d'errore sono **byte per byte** — le cause restano distinte | SC-3 · Operating Principle 6 | **ONDA** | diff sul reperto | blocco 13 | ❌ W0 | ⬜ pending |
| 3m | **Il door pass è stato eseguito sullo scanner NON convertito** — la linea di base del criterio 3, la prima che questo progetto avrà mai | SC-3 · D-42-04 §3 | **PORTA** | **manuale** | nessuno — vedi Manual-Only | ❌ W0 | ⬜ pending |
| 3n | **Il door pass è stato rieseguito sul convertito**, con un prima e un dopo | SC-3 · D-42-04 §5 | **PORTA successiva** | **manuale** | nessuno — vedi Manual-Only | ❌ W0 | ⬜ pending |
| 3o | **L'aptico si sente**, ed è distinguibile al tatto per i tre esiti | SC-3 · `haptics.ts:32-34` | **PORTA** | **manuale** | nessuno — vedi Manual-Only | ❌ W0 | ⬜ pending |
| 3p | **La coda offline sopravvive** alla chiusura dell'app e al riavvio del dispositivo | SC-3 · `checkin-offline.md` gate *coda durevole* | **PORTA** | **manuale** | nessuno — vedi Manual-Only | ❌ W0 | ⬜ pending |
| 3q | **La torcia si accende**, e il ritorno automatico avviene ai tre dwell | SC-3 | **PORTA** | **manuale** | nessuno — vedi Manual-Only | ❌ W0 | ⬜ pending |
| 3r | **La porta renderizza con la radio spenta**, all'indirizzo a cui quel dispositivo sarà mandato | SC-3 · `checkin-offline.md` gate *l'indirizzo che si scalda* | **PORTA** | **manuale** | nessuno — vedi Manual-Only | ❌ W0 | ⬜ pending |
| 3s | **L'annullamento funziona offline**, ed è registrato con chi e quando | SC-3 · `checkin-offline.md` gate *annullamento limitato* | **PORTA** | **manuale** | nessuno — vedi Manual-Only | ❌ W0 | ⬜ pending |

*Stato: ⬜ pending · ✅ verde · ❌ rosso · ⚠️ instabile*

### Aritmetica della mappa

| | righe |
|---|---|
| **Totale** | **37** |
| **ORA** — eseguibili oggi, nessun file dello scanner toccato | **8** (0a-0e, 1a, 1b, 3a) |
| **ONDA / PORTA** — bloccate dietro il door pass sul non convertito | **29** |
| di cui **automatiche** | 19 |
| di cui **manuali**, non chiudibili da nessun comando | **10** (1h, 1i, 2d, 3m-3s) |

**Continuità di campionamento.** Nel periodo bloccato ci sono **8** righe attive, e
la latenza resta sotto i 180 s per tutte e otto. Nell'onda di conversione nessuna
sequenza di tre task consecutivi resta senza una verifica automatica: `npm run build`
gira a ogni commit e `verify:conversion` a ogni onda.

---

## Wave 0 Requirements

- [ ] **Le quattro voci morte fuori da `CONVERTED`** — `scripts/conversion-manifest.mjs`.
      È DEF-45-01, ed è la riparazione che quel documento già descrive: *«la
      riparazione è la rimozione delle quattro voci, non un allargamento del matcher»*
- [ ] **Una disposizione per le sei pagine di produzione** delle fasi 44/45 — `calendar`,
      `calendar/[id]`, `location`, `location/[id]`, `manifesto`, `visual`. **Non sono
      di questa fase**: sono debito delle fasi che le hanno costruite, e vanno registrate
      come tali. Le tre uscite che il gate stesso offre sono `CONVERTED`, un **recinto**
      per nome, o `NON_DECLARABLE`
- [ ] **`scripts/verify-scan-legibility.mjs`** — scritto, ma **non ancora registrato**
      (vedi §Sampling Rate nota 1). Metodo obbligato per nome: oklch → sRGB lineare,
      **Brettel, Viénot & Mollon 1997 a due semipiani**, CIEDE2000, soglia **10**.
      `refuse()` → exit 2 se una sorgente non è leggibile; `failures.push()` → exit 1
      se una coppia scende sotto soglia. **Un rifiuto che assorbe un fallimento è il
      difetto** (`verify-all.mjs:196-212`)
- [ ] **La prova per mutazione del gate**, in quattro versi, con l'asserzione che la
      mutazione sia stata **applicata** prima di leggerne l'esito: rimessa l'ambra → exit 1 ·
      pillola *Offline* non individuabile → exit 2 · `theme.css` illeggibile → exit 2 ·
      terzo stato su `--sem-info` → exit 0
- [ ] **Il colore della pillola *Offline* sollevato in una costante nominata** — è
      l'unico modo perché il gate la **legga** invece di indovinarla: oggi `bg-yellow-500`
      compare 10 volte su cinque funzionalità diverse e non ha un'ancora testuale unica
- [ ] **Il meccanismo di check D** per una superficie che è schermo pieno per costruzione,
      sulla forma di `TYPOGRAPHIC_MEASURES` — scritto **prima** del primo run rosso (D-41-16)
- [ ] **Il meccanismo di check E**: `PHONE_LOCKED_NAV_WRAPPER` → `DoorSurface.tsx`
      **e** la stessa path in `NAV_MODULES`. **Due modifiche, non una**: con una sola il
      gate esce 2 (D-42-08 §2, provato)
- [ ] **`42-BASELINE.md`** — il reperto meccanico pre-conversione, 13 blocchi, con lo SHA
      del commit e la data. Committato **prima** di qualunque conversione: è l'unica cosa
      che rende la parola *invariato* misurabile su un file di 3449 righe
- [ ] **`42-PROCEDURES.md`** — le procedure scritte per le dieci righe manuali, sul
      modello di `44-PROCEDURES.md`, **ogni `Result:` che parte da `pending`**. Le righe
      3m-3s sono un rimando a `39-DOOR-PASS.md` §8 con l'aggiunta del prima/dopo
- [ ] **La disposizione dei 14 touch target** — decisa e scritta prima del primo run rosso.
      Le due uscite oneste: allargare il perimetro dichiarandolo, oppure registrarli come
      debito con la loro misura. **Non**: abbassare il gate

---

## Manual-Only Verifications

| Comportamento | Criterio | **Perché nessun comando la chiude** | Istruzioni |
|---|---|---|---|
| Accetta e rifiuta sono distinguibili a distanza di braccio, al buio | SC-1 | **Nessuno strumento di questo repository rende un pixel.** `verify:scan-legibility` misura la distanza fra due **tinte**; una tinta separabile su un grafico e uno schermo leggibile a due metri con la coda dell'occhio sono affermazioni diverse. E il caso peggiore misurato (15,5 in deuteranopia) è *sufficiente*, non *comodo*: D-42-01 lo dichiara, e dice che per un deuteranope il canale che porta davvero il rifiuto è il **glifo**. Solo un occhio può confermarlo | Schermo a **luminosità minima**, stanza buia, una mano sola, dispositivo a distanza di braccio. Provocare i tre esiti in sequenza. Registrare, verbatim, quale si è riconosciuto **prima di leggere le parole** |
| Il terzo stato si legge come *già registrato*, mai come un rifiuto | SC-1 | La distinzione fra *«questa persona entra, e qualcuno guardi dopo»* e *«questa persona non entra»* è un giudizio su come uno schermo si legge, e nessuna asserzione lo regge. È anche l'asimmetria del dominio: un falso rifiuto avviene **davanti a una fila** | Scansionare due volte lo stesso codice. Registrare, verbatim, cosa la persona ha fatto per prima: ha ammesso o ha esitato |
| Il mirino è centrato e lavorabile a tre larghezze | SC-2 | Un'asserzione sul sorgente prova che **una classe c'è**. Che il riquadro sia raggiungibile con un pollice su un tablet in orizzontale è una proprietà della mano, non della stringa. `verify-conversion.mjs` lo dice del proprio verde: *«it reads a class string and an import graph, renders nothing and measures no pixel»* | Aprire la porta su telefono, tablet e desktop. Registrare a ogni larghezza: il mirino è centrato, il riquadro di decodifica è raggiungibile, nessuna informazione critica è uscita dallo schermo |
| **Il door pass sullo scanner NON convertito** | SC-3 | **Non esiste un *prima*.** `39-VERIFICATION.md` è `human_needed` per questa ragione: le correzioni delle fasi 31 e 39 non hanno mai girato a una porta reale. Nessun comando può produrre un'osservazione che nessuno ha ancora fatto — e senza di essa la parola *invariato* del criterio 3 non ha un termine di paragone | `39-DOOR-PASS.md` §0.6 e §8, integralmente, **prima** di qualunque conversione. Ogni `Result:` compilato con l'ora a muro e l'osservazione verbatim |
| **Il door pass rieseguito sul convertito** | SC-3 | Il criterio 3 lo dice nei suoi termini letterali — *«verified by running the door pass again on a device»*. È un confronto fra due osservazioni umane, e la prima non esiste ancora | Lo stesso percorso, sullo stesso modello di dispositivo, con lo stesso ruolo. Confronto riga per riga con il pass precedente. **Ogni differenza è un difetto della conversione**, finché non è argomentato il contrario |
| L'aptico si sente, ed è distinguibile al tatto | SC-3 | **iOS degrada `navigator.vibrate` a nulla** (`haptics.ts:8`). Un grep prova che la chiamata c'è, mai che il dispositivo vibri — e il pattern è il canale che funziona quando lo schermo non viene guardato | I tre esiti, dispositivo in tasca o in mano senza guardare. Registrare se i tre si distinguono **al solo tatto**, e su quale sistema operativo |
| La coda offline sopravvive alla chiusura dell'app e al riavvio | SC-3 | È IndexedDB su un dispositivo reale. *«Una coda in memoria non è una coda: è una speranza»* (`checkin-offline.md`). Nessun gate qui apre un browser | Radio spenta, alcune scansioni, app chiusa, dispositivo riavviato, app riaperta. Registrare il conteggio della coda prima e dopo |
| La torcia si accende, e il ritorno automatico avviene ai tre dwell | SC-3 | `getCapabilities().torch` dipende dal dispositivo; il `setTimeout` a `ScanFlash.tsx:127` è un fatto di runtime, e che il flash **riabiliti la decodifica** uscendo lo è ancora di più | Accendere e spegnere la torcia. Cronometrare i tre esiti. Registrare che dopo ogni flash la scansione successiva è possibile **senza toccare nulla** |
| La porta renderizza con la radio spenta, all'indirizzo giusto | SC-3 | Le chiavi della cache runtime **sono URL**: i due indirizzi della porta sono due voci indipendenti, e scaldarne uno **non** scalda l'altro (`checkin-offline.md`). È una proprietà di un dispositivo specifico in un momento specifico, e nessuno script la può riprodurre | Aprire l'indirizzo **online** su quel dispositivo, poi radio spenta, poi lanciare **dall'icona installata**. Registrare quale documento è comparso, verbatim |
| L'annullamento funziona offline ed è attribuito | SC-3 | È un percorso offline, per dispositivo, e la sua attribuzione — chi e quando — è il motivo per cui esiste il gate. Nessun comando qui osserva un'operazione privilegiata mentre avviene | Radio spenta, una scansione, poi l'annullamento. Registrare che la voce compare fra gli annullamenti tenuti sul dispositivo, e che riporta chi e quando |

---

## Validation Sign-Off

- [ ] Ogni task ha una verifica `<automated>` oppure una dipendenza da Wave 0
- [ ] Continuità di campionamento: mai 3 task consecutivi senza una verifica automatica
- [ ] Wave 0 copre ogni riferimento MANCANTE
- [ ] Nessun flag watch-mode
- [ ] Latenza del feedback < 180 s
- [ ] **Il reperto meccanico è committato prima di qualunque conversione**
- [ ] **Il door pass sul non convertito è eseguito prima della prima onda di conversione** *(D-42-04 — è un gate di esecuzione, non una preferenza)*
- [ ] ~~`nyquist_compliant: true` nel frontmatter~~ — **deliberatamente false, vedi sotto**

### Perché `nyquist_compliant: false` è il valore corretto, e non una lacuna

Dieci delle trentasette righe si chiudono sull'osservazione di una persona, **e le due
più importanti si chiudono al buio, a una porta reale, con una fila davanti**. Non è
una carenza di strumentazione a cui si può rimediare: è la natura della superficie.
Il criterio 1 chiede che due schermi siano *inequivocabili* per un essere umano di
fretta; il criterio 3 chiede che *niente sia cambiato* in un sistema il cui
comportamento vive fuori dal repository — in una fotocamera, in un motore aptico, in
una cache di documenti e in una coda IndexedDB su un dispositivo che nessuno di questi
script tocca.

Mettere il flag a `true` asserirebbe una copertura automatica che non esiste, in un
repository il cui primo guardrail è che non esiste. Le fasi 31, 36, 44 e 45 portano
lo stesso `false` per la stessa ragione.

**Cosa questa fase aggiunge comunque**, e vale scriverlo: `verify:scan-legibility` è
il primo strumento di questo progetto che misura una proprietà **percettiva** invece
di una stringa, e nasce perché la stessa affermazione era stata scritta due volte nel
codice — a `ScanFlash.tsx:65-72` e a `ScannerClient.tsx:2792-2798` — ed era falsa
entrambe le volte. Un commento non ha impedito il difetto; un gate lo renderà
impossibile da reintrodurre. È un avanzamento reale in ciò che *verificato* può
significare qui, e **restringe l'insieme manuale senza eliminarlo**.

**Approvazione:** pending
