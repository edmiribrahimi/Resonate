---
phase: 42-scanner-conversion
verified: 2026-08-18T21:21:23Z
verified_at_commit: e4b2300
status: human_needed — e il criterio 3 e' PERMANENTEMENTE NON CHIUDIBILE (DEF-42-04)
score: 50/50 must-have di piano verificati · 0/3 criteri di successo del roadmap chiusi
roadmap_criteria:
  - id: SC-1
    text: "Accept and refuse stay saturated and unmistakable at arm's length in a dark room, and each carries a second channel besides colour"
    mechanical_half: verified
    human_half: open
    closes_with: "righe 1h e 1i di 42-PROCEDURES.md — una persona, alla prima porta reale"
  - id: SC-2
    text: "The viewfinder centres at every width instead of stretching, on phone, tablet and desktop"
    mechanical_half: verified
    human_half: open
    closes_with: "riga 2d — tre dispositivi veri e una mano; non serve una porta, si puo' fare oggi"
  - id: SC-3
    text: "Every scanner behaviour — flash timing, haptics, auto-return, torch, offline verdict, undo — is unchanged from before the conversion, verified by running the door pass again on a device"
    status: PERMANENTEMENTE_NON_CHIUDIBILE
unclosable:
  - criterion: SC-3
    reason: >-
      Il criterio chiede un confronto fra due osservazioni umane. La prima — riga 3m,
      il door pass sullo scanner NON convertito — non e' mai stata eseguita, e il codice
      su cui andava misurata non esiste piu'. Non e' deferred, non e' pending, non e'
      partial, non e' human_needed: non ha piu' un oggetto da misurare, in modo permanente.
    decided_by: proprietario
    decided_at: 2026-08-18
    recorded_in:
      - "commit 5e85d6b"
      - "DEF-42-04 in deferred-items.md"
      - "blocco di deroga datato alla riga 3m di 42-PROCEDURES.md"
    alternative_offered_and_declined: "seduta di laboratorio su ambiente usa-e-getta, 3m e 3n appaiati in condizioni identiche"
    residual_risk_not_covered_by_the_derogation: >-
      Alla prima porta reale correzioni di comportamento mai esercitate (fasi 31 e 39) e
      una superficie ridipinta gireranno insieme, e questo repository non ha error tracking.
      Se qualcosa cede davanti a una fila, nessuno potra' dire quale delle due l'ha causato.
      Rischio accettato, non rimosso.
  - item: "riga 3n eseguita da sola"
    note: >-
      Produce una descrizione, non un confronto. Resta la prima osservazione del
      comportamento della porta che questo progetto avra' — e da li' in poi il *prima*
      di qualunque cosa venga dopo — ma non chiude SC-3 e non va scritta come se lo facesse.
mechanical_claim:
  claim: "nulla di comportamentale si e' mosso"
  status: verified_independently
  method: >-
    node scripts/capture-scanner-baseline.mjs rieseguito dal verificatore sull'albero
    principale a e4b2300, regione diffabile estratta per uguaglianza di riga intera e
    confrontata con la regione BEFORE di 42-BASELINE.md
  raw_differing_lines: 118
  normalised_differing_lines: 3
  normalised_differences:
    - "bg-amber-500/90 → bg-sem-done/90 (ScanFlash.tsx:110)"
    - "bg-red-500/90 → bg-red-600/90 (ScanFlash.tsx:125)"
    - "files scanned 306 → 305 (MobileNav.tsx cancellato dal piano 42-07)"
  normaliser_mutation_test_by_verifier: "delay 1500 → 1600 catturato: 8 righe divergenti contro 6 della corsa onesta"
  determinism_check_by_verifier: "due esecuzioni consecutive byte-identiche"
gates_measured_by_verifier:
  - "npm run verify → exit 0 · 20 gate eseguiti, 20 passed, 0 FAILED, 0 REFUSED · 23 dichiarati, 3 non eseguibili qui con la ragione stampata"
  - "npm run build → exit 0 (e' anche il typecheck; non esiste test runner per il prodotto)"
  - "npm run verify:persona → 7/7"
  - "npm run verify:scan-legibility → exit 0 · coppia piu' stretta 14.0 su soglia 10 · glifo 8.18 / 5.49 / 3.87 su soglia 3:1"
  - "npm run verify:conversion → exit 0 · PHASE_42_PATHS = [] · /admin/scanner e /door dichiarati in CONVERTED"
gate_mutation_tests_by_verifier:
  - "bg-red-600/90 → bg-red-500/90: verify:scan-legibility exit 1, accept↔refuse 8.4 in deuteranopia sotto la soglia 10"
  - "riempimento con token inesistente: verify:scan-legibility exit 2 — REFUSED, «Nothing was measured», distinto dal rosso"
  - "deroga per utility rimossa da check A: verify:conversion exit 1, nomina ScanFlash.tsx:97 bg-green-500 — la deroga non e' un permesso in bianco"
  - "glob morto aggiunto a PENDING_SURFACES: verify:conversion exit 2 — il recinto si dissolve rumorosamente"
open_debt: # nessuna di queste e' di questa fase da chiudere, e nessuna e' trovata da un gate
  - id: DEF-42-06
    what: "tre confini di controllo a 2,05 : 1 contro il minimo 3 : 1 di WCAG 1.4.11"
    where:
      - "src/app/(admin)/admin/scanner/ScannerClient.tsx:2706 — il bottone che sceglie SU QUALE SERATA la porta sta lavorando"
      - "src/app/(admin)/admin/scanner/ScannerClient.tsx:2867 — il bottone che accende e spegne LA FOTOCAMERA"
      - "src/app/(admin)/admin/scanner/ScannerClient.tsx:3106 — il campo che cerca un ospite per nome QUANDO LA SCANSIONE E' GIA' FALLITA"
    why_no_gate_finds_it: "scripts/verify-tokens.mjs:374 conosce il nome --control ma nessun controllo verifica che un confine di controllo lo porti"
  - id: DEF-42-03
    what: "quattordici bersagli tattili sotto i 44px sulla porta"
    ceiling: "scripts/verify-touch-targets.mjs:1288 — count 14, puo' solo scendere"
    named_here: "la riga della cronologia e' la strada dell'annullamento (handleUndoCheckIn, verify-touch-targets.mjs:1415); i due elementi piu' piccoli dell'intero prodotto sono le pillole che annunciano che qualcosa NON e' stato registrato"
  - id: DEF-42-01
    what: "sei pagine di produzione delle fasi 44 e 45, in un recinto nominato e attribuito"
  - id: DEF-42-02
    what: "le cifre dei contatori della porta non sono tabulari"
  - id: DEF-42-04
    what: "il criterio 3 senza termine di paragone — vedi unclosable"
  - id: DEF-42-07
    what: "capture-scanner-baseline.mjs dichiara «unconverted» a ogni esecuzione — verificato: l'intestazione della cattura di oggi lo dice ancora"
  - id: DEF-42-08
    what: "la riga 3h chiede «identico riga per riga» e riga per riga non lo e'"
  - id: DEF-42-05
    what: "CHIUSA il 2026-08-18 dal piano 42-08 — unica delle otto voci non aperta"
human_verification: # dieci righe in 42-PROCEDURES.md, dieci `Result: pending`, nessuna compilata da questa verifica
  - row: "1h"
    test: "Accettazione e rifiuto distinti a distanza di braccio, al buio, con una mano"
    expected: "Una persona li distingue senza esitare, con la coda dell'occhio"
    why_human: "verify:scan-legibility misura la distanza fra due tinte, non la leggibilita' di uno schermo a due metri"
  - row: "1i"
    test: "Il terzo stato letto come *gia' registrato*, mai come un rifiuto"
    expected: "Una seconda persona che non ha letto la procedura lo legge come *gia' registrato*"
    why_human: "un falso rifiuto avviene davanti a una fila; nessun comando rende un pixel"
  - row: "2d"
    test: "Il mirino centrato e lavorabile su telefono, tablet e desktop reali"
    expected: "Il riquadro di decodifica e' raggiungibile con un pollice a tutte e tre le larghezze"
    why_human: "una classe in sorgente prova che la classe c'e'; la raggiungibilita' e' una proprieta' di una mano — eseguibile OGGI, non serve una porta"
  - row: "3n"
    test: "Il door pass sul convertito"
    expected: "Una descrizione del comportamento della porta convertita"
    why_human: "nessuno strumento di questo repository vibra un telefono o accende una torcia — e questa riga NON chiude il criterio 3"
  - row: "3o"
    test: "L'aptico sentito, e i tre esiti distinti al solo tatto"
    expected: "Su una delle due famiglie di sistema operativo la risposta onesta attesa e' *niente affatto*, e quello e' un risultato"
    why_human: "haptics.ts:19/25/38 sono chiamate, non sensazioni"
  - row: "3p"
    test: "La coda offline sopravvive alla chiusura dell'app e al riavvio del dispositivo"
    expected: "Le voci in coda ci sono ancora dopo il riavvio"
    why_human: "«una coda in memoria non e' una coda: e' una speranza»"
  - row: "3q"
    test: "La torcia si accende, e il ritorno automatico riabilita la decodifica alle tre permanenze"
    expected: "Dopo il lampo lo scanner decodifica di nuovo"
    why_human: "uno scanner che mostra il colore giusto e poi smette di decodificare e' uno scanner che ha fallito sembrando corretto"
  - row: "3r"
    test: "La porta renderizza con la radio spenta, all'indirizzo a cui quel dispositivo viene mandato"
    expected: "Rende a /door e a /admin/scanner — le chiavi della cache sono URL, scaldarne uno non scalda l'altro"
    why_human: "nessun gate spegne una radio"
  - row: "3s"
    test: "L'annullamento funziona offline ed e' attribuito — chi e quando"
    expected: "Con un ruolo che detiene il permesso funziona; con uno che non lo detiene, un rifiuto silenzioso e' il reperto"
    why_human: "la capability si legge in sorgente, il comportamento alla porta no"
  - row: "3m"
    test: "Il door pass sullo scanner NON convertito"
    expected: "—"
    why_human: "NON e' un item di verifica umana in attesa: e' impossibile. Elencata qui solo perche' nessuno la marchi `skipped` o `n/a` — `pending` resta lo stato letterale"
requirements:
  - id: DS-04
    status: "meta' meccanica SATISFIED · meta' percettiva aperta (righe 1h, 1i)"
  - id: RESP-05
    status: "meta' *centres* SATISFIED · meta' *behaviour unchanged* provata SOLO per le costanti e le strade (righe 3n-3s aperte, SC-3 non chiudibile)"
notes:
  - "Nessun blocco `gaps:` in questo documento, e non e' una dimenticanza: nulla di quanto resta aperto e' chiudibile da un piano di gap-closure. Cio' che e' aperto e' o un'osservazione umana (dieci righe di 42-PROCEDURES.md) o un debito attribuito e numerato (DEF-42-*), o e' permanentemente non chiudibile (SC-3)."
  - "La conversione non e' spedita: main e' 81 commit avanti a origin/main. Chi spinge fa scattare il rischio residuo descritto in unclosable — correzioni mai esercitate e superficie ridipinta insieme, senza error tracking."
---

# Fase 42: Scanner Conversion — Reperto di verifica

**Obiettivo di fase (ROADMAP.md):** *«The scanner is the last surface to take the
visual system, and it takes colour, contrast and type only — its behaviour is a
safety surface and is not touched.»*

**Verificato:** 2026-08-18T21:21:23Z, sull'albero principale a `e4b2300`, working
tree pulito prima e dopo ogni misura.
**Ri-verifica:** no — prima verifica di questa fase.
**Stato:** `human_needed`, **e il criterio 3 e' permanentemente non chiudibile.**

---

## 0. La frase che va letta prima di ogni tabella

**Il criterio 3 di questa fase non e' chiuso, non e' aperto, non e' rimandato: non e'
chiudibile, e non lo sara' mai.** Chiede che il comportamento sia invariato *rispetto
a prima della conversione*, **verificato rieseguendo il door pass**. La misura di quel
*prima* era la riga **3m** — il door pass sullo scanner **non convertito**. Non e'
stata eseguita; il cancello d'ordine e' stato scavalcato dal proprietario il
**2026-08-18**, con il costo enunciato prima della scelta e un'alternativa
(seduta di laboratorio con 3m e 3n appaiati) offerta e declinata; le onde 3-8 sono
partite comunque. **Da quel momento la riga non ha piu' un oggetto da misurare.**

Verificato in modo indipendente: commit `5e85d6b` esiste e dice esattamente questo;
`DEF-42-04` in `deferred-items.md` lo registra; il blocco di deroga datato sta dentro
`42-PROCEDURES.md` alla riga 3m; `42-06-SUMMARY.md:65-81` dichiara che il proprio
`checkpoint:human-verify` bloccante e' stato risolto **da una decisione e non da
un'osservazione**.

**Venti gate verdi non dicono nulla di questo.** Dicono che i colori sono separabili
e che i token sono quelli giusti. **Nessuno di loro dice che la porta funziona.**

---

## 1. I tre criteri di successo del roadmap

| # | Criterio | Meta' meccanica | Meta' umana | Verdetto |
|---|---|---|---|---|
| 1 | *Accept and refuse stay saturated and unmistakable at arm's length in a dark room, and each carries a second channel besides colour* | **VERIFICATA** — `npm run verify:scan-legibility` exit **0**, coppia piu' stretta **14.0** su soglia **10**; quattro canali a `file:riga` (§3) | **APERTA** — righe **1h**, **1i** | **non chiuso** |
| 2 | *The viewfinder centres at every width instead of stretching, on phone, tablet and desktop* | **VERIFICATA** — massimi a `ScannerClient.tsx:2668`, `:2791`, `:3242`; decodifica intatta a `:1554-1555` | **APERTA** — riga **2d**, eseguibile oggi | **non chiuso** |
| 3 | *Every scanner behaviour … is unchanged from before the conversion, verified by running the door pass again on a device* | il reperto prova che **le costanti e le strade** non si sono mosse | il *prima* non esiste e non puo' piu' esistere | **PERMANENTEMENTE NON CHIUDIBILE** |

**Punteggio del contratto roadmap: 0 su 3 chiusi.** Due hanno la meta' meccanica
verificata e la meta' umana aperta; uno non ha piu' un termine di paragone.

---

## 2. L'affermazione meccanica, riprodotta e non ereditata

L'unica affermazione falsificabile della fase — *nulla di comportamentale si e' mosso*
— e' stata **rimisurata dal verificatore**, non letta da un SUMMARY.

```sh
node scripts/capture-scanner-baseline.mjs > after-now.txt          # exit 0
cut(BEGIN, END) su 42-BASELINE.md  → before-region.md   (295 righe)
cut(BEGIN, END) su after-now.txt   → after-region.md    (295 righe)
diff → 118 righe divergenti
normalise (le quattro regole di 42-BASELINE.md §Step 2) → diff:
```

```
8,9c8,9
< | already_recorded | `already_recorded` | `bg-amber-500/90` | **2500** | L |
< | error | `error` | `bg-red-500/90` | **2000** | L |
---
> | already_recorded | `already_recorded` | `bg-sem-done/90` | **2500** | L |
> | error | `error` | `bg-red-600/90` | **2000** | L |
203c203
<   files scanned:                 306
---
>   files scanned:                 305
```

**Tre differenze, esattamente quelle dichiarate**: i due riempimenti d'esito
(`ScanFlash.tsx:110` e `:125`) e il conteggio dei file scansionati, sceso di uno per
la cancellazione di `src/components/layout/MobileNav.tsx` (piano 42-07). Nessuna
permanenza, nessun pattern aptico, nessun `DB_VERSION`, nessun `fps`, nessun `qrbox`,
nessuna tabella di messaggi si e' mossa.

Tre controlli in piu', fatti dal verificatore e non presenti come rivendicazione
altrui:

| controllo | risultato |
|---|---|
| determinismo della cattura: due esecuzioni consecutive | **byte-identiche** |
| mutazione `delay: 1500` → `1600`, poi ripristino | **catturata** — 8 righe divergenti contro le 6 della corsa onesta: il normalizzatore non nasconde una permanenza |
| regione AFTER incorporata in `42-BASELINE.md` contro la cattura fresca | **identica**, a meno del rinominare i marcatori |

**Cosa questo prova, alla lettera:** che **le costanti** e **le strade** non si sono
mosse. **Cosa non prova:** che il **comportamento** non si sia mosso. Le due
affermazioni non sono la stessa, e la seconda e' §5.

---

## 3. Artefatti, tre livelli piu' il flusso dei dati

| Artefatto | Esiste | Sostanziale | Cablato | Evidenza |
|---|---|---|---|---|
| `src/components/scanner/ScanFlash.tsx` | si' | si' | si' | `FLASH_STATES` a `:95`; tre riempimenti a `:97`, `:110`, `:125`; tre permanenze **1500 / 2500 / 2000** sulle stesse righe; glifi a `:104`, `:119`, `:132`; `text-ground` a `:35`; `setTimeout` a `:146`; `role="status"` + `aria-live="assertive"` a `:156-157`; la frase **ritirata** ancora visibile a `:65-70` |
| `src/app/(admin)/admin/scanner/ScannerClient.tsx` | si' | si' | si' | massimi a `:2668`, `:2791`, `:3242`; decodifica a `:1554-1555` (`facingMode: "environment"`, `fps: 15`, `qrbox 280×280`); mappatura esito→aptico unica a `:1621`; pillola in costante a `:437-438`; la seconda frase ritirata a `:2826` |
| `src/app/(admin)/admin/scanner/DoorSurface.tsx` | si' | si' | si' | `import AppNav` a `:4`; `<AppNav form="phone">` a `:151-152` — la ragione per cui il wrapper esisteva, trasferita e non persa |
| `src/components/layout/MobileNav.tsx` | **cancellato** | — | — | `ls src/components/layout/` → solo `AppNav.tsx`; `grep -rn "MobileNav" src/ scripts/` → **zero** occorrenze. Nessuna frase nomina piu' un file che non esiste |
| `scripts/verify-scan-legibility.mjs` | si' | si' | **registrato** | `package.json:21` **e** `scripts/verify-all.mjs:266`, entrambi — un nome in uno solo dei due rifiuterebbe la suite |
| `scripts/conversion-manifest.mjs` | si' | si' | si' | `PHASE_42_PATHS = []` a `:240`; `/admin/scanner` e `/door` in `CONVERTED` con larghezza `default` e ragione scritta nel dominio della porta; `PENDING_SURFACES` con i quattro glob delle sei pagine delle fasi 44/45 |
| `scripts/verify-touch-targets.mjs` | si' | si' | si' | `DOOR_TARGET_DEBT_CEILING = { count: 14 }` a `:1288`; `DOOR_TARGET_DEBT` a `:1353` con **14 voci contate a macchina**, fra cui `handleUndoCheckIn(record)` a `:1415` |
| `scripts/capture-scanner-baseline.mjs` | si' | si' | si' | 13 blocchi, deterministico (verificato); **dichiara ancora «unconverted»** in intestazione — e' `DEF-42-07`, aperto |
| `42-BASELINE.md`, `42-PROCEDURES.md`, `42-MAPPING.md`, `42-03/05/12-FINDINGS.md`, `deferred-items.md` | si' | si' | si' | regione AFTER incorporata e verificata; dieci `Result: pending`; otto voci `DEF-42-*` |

**Livello 4 — il dato scorre?** Il flusso qui non e' una fetch ma **un colore che
arriva a uno schermo**: `FLASH_STATES[type].bg` e' composto nella stringa di classe
dell'overlay a `ScanFlash.tsx:154`, e gli **stessi tre esiti sono disegnati una
seconda volta** nella cronologia a `ScannerClient.tsx:3332`, `:3346`, `:3360`. Ridipingerne
una sola avrebbe lasciato la porta a dire due cose diverse della stessa scansione:
sono state ridipinte entrambe. **Che il colore arrivi a un occhio e' §5.**

---

## 4. Gate, build e prove per mutazione — misurati qui, non citati

| comando | esito |
|---|---|
| `npm run verify` | **exit 0** · 23 dichiarati, **20 eseguiti, 20 passed, 0 FAILED, 0 REFUSED**; 3 non eseguibili qui con la ragione stampata (`verify:redirects` serve un server, `verify:ics` serve il materiale in `docs/` che git ignora, `verify:refusal` serve un'autorizzazione datata) |
| `npm run build` | **exit 0** — ed e' il typecheck: **non esiste test runner per il prodotto** |
| `npm run verify:persona` | **7/7**, caso peggiore 11318 token su un tetto di 12000 |
| `npm run verify:scan-legibility` | **exit 0** — minimo delle coppie **14.0**, glifo **8,18 / 5,49 / 3,87 : 1** su un minimo di **3 : 1** |
| `npm run verify:conversion` | **exit 0** — recinto vuoto, due indirizzi della porta dichiarati |

**Quattro prove per mutazione, applicate e ritirate dal verificatore** (albero
ripulito e gate riportato a verde dopo ognuna):

| mutazione | esito atteso | esito osservato |
|---|---|---|
| `bg-red-600/90` → `bg-red-500/90` (il rosso di ieri) | rosso | **exit 1** — `accept↔refuse` a **8.4** in deuteranopia, sotto la soglia 10 |
| riempimento che nomina un token inesistente | **rifiuto**, non rosso | **exit 2** — *«Nothing was measured»* |
| deroga per utility rimossa da check A | rosso | **exit 1** — nomina `ScanFlash.tsx:97 bg-green-500` |
| glob morto aggiunto a `PENDING_SURFACES` | rifiuto | **exit 2** — *«a fence that catches nothing is not a smaller fence»* |

Le prime due chiudono la domanda che conta su un gate nuovo: **distingue un rosso da
un rifiuto**, e **il rosso di ieri sarebbe stato rosso**. La terza dice che una
deroga e' per utility e non e' un permesso in bianco. La quarta dice che il recinto
si dissolve rumorosamente invece di marcire.

**E la riga che il gate stampa di se', che vale quanto il suo exit code:** *«A pass
says the tints are separable. It never says the door works.»*

---

## 5. Le dieci righe che nessun comando chiude

`42-PROCEDURES.md` porta **dieci** procedure e **dieci `Result: pending`**. Questa
verifica **non ne ha compilata nessuna**, e non doveva: un `Result` vuoto e' una
procedura non eseguita, mai un *verificato per ispezione*.

| riga | cosa misura | chi la chiude |
|---|---|---|
| **1h** | accettazione e rifiuto distinti a distanza di braccio, al buio, con una mano | staff, prima porta reale |
| **1i** | il terzo stato letto come *gia' registrato*, mai come rifiuto | idem, con una seconda persona che non ha letto la procedura |
| **2d** | il mirino centrato **e lavorabile** a tre larghezze | tre dispositivi veri e una mano — **si puo' fare oggi** |
| **3m** | il door pass sul **non convertito** | **nessuno, mai** — vedi §0 |
| **3n** | il door pass sul **convertito** | prima porta reale — produce una **descrizione**, non un confronto |
| **3o** | l'aptico sentito, i tre esiti distinti al tatto | idem — su una famiglia di OS la risposta onesta attesa e' *niente affatto*, **e quello e' un risultato** |
| **3p** | la coda che sopravvive a un riavvio | idem |
| **3q** | la torcia, e il ritorno automatico che **riabilita la decodifica** | idem |
| **3r** | la porta che rende con la radio spenta, ai **due** indirizzi | idem — le chiavi della cache sono URL |
| **3s** | l'annullamento offline e **attribuito** | un ruolo che ha il permesso, e poi uno che non ce l'ha |

**Nove eseguibili, una impossibile.** La riga 3m resta scritta `pending`: non va
marcata `skipped` ne' `n/a`, perche' `pending` e' il suo stato letterale e il blocco
di deroga accanto dice perche' non diventera' altro.

---

## 6. Due voci aperte che nessun gate trova, e che non si assorbono

### 6.1 — DEF-42-06: tre confini di controllo a **2,05 : 1** contro il minimo **3 : 1**

| riga | elemento | cosa fa alla porta |
|---|---|---|
| `ScannerClient.tsx:2706` | `<button>` | sceglie **su quale serata** la porta sta lavorando |
| `ScannerClient.tsx:2867` | `<button>` | accende e spegne **la fotocamera** |
| `ScannerClient.tsx:3106` | `<input type="text">` | cerca un ospite **per nome, quando la scansione e' gia' fallita** |

Verificato riga per riga: tutti e tre portano `border-line`. `src/app/globals.css:44`
vieta esattamente questo in lettere — *«NONE of these may carry the boundary of a text
input, a select, a secondary or ghost button, a checkbox or the scanner target»* — e
dichiara che il piu' forte dei tre si ferma a **2,05 : 1** contro i **3 : 1** che WCAG
1.4.11 chiede a un confine non testuale. La destinazione giusta esiste: `--control`,
a `globals.css` §controlli, misurata fra 6,29 e 7,14.

**Perche' nessun verde lo trovera', verificato in prima persona:**
`scripts/verify-tokens.mjs:374-375` conosce il nome `control` **solo come nome
ammesso in un elenco**. Nessun controllo verifica che un confine di controllo lo
porti. Un verde su questa porta **non dice nulla di questa voce.**

### 6.2 — DEF-42-03: **quattordici** bersagli tattili sotto il minimo

`scripts/verify-touch-targets.mjs:1288` fissa il tetto a **14** e `:1353` porta la
lista, contata a macchina: **14 voci**. Due vanno nominate e non solo contate:

- **La riga della cronologia e' la strada dell'annullamento** —
  `verify-touch-targets.mjs:1415`, `handleUndoCheckIn(record)`. Un bersaglio troppo
  piccolo li' e' un annullamento mancato davanti a una fila.
- **I due elementi piu' piccoli dell'intero prodotto sono le pillole che annunciano
  che qualcosa NON e' stato registrato** — `verify-touch-targets.mjs:1317`. Le uniche
  due righe che dicono che una scansione non e' andata a buon fine sono le due piu'
  difficili da colpire.

Non pagato qui per una ragione scritta e coerente col mandato: ingrandire un bersaglio
**cambia il layout**, e la seconda meta' di RESP-05 e' che il comportamento non cambi
per effetto del lavoro visivo. **Il tetto e' un cricchetto che puo' solo scendere**, e
il gate stesso dice *«Fix the ELEMENT, not this gate»*.

### 6.3 — Le altre voci, per completezza

Otto voci `DEF-42-*` in tutto: **sette aperte** (01, 02, 03, 04, 06, 07, 08) e **una
chiusa** — DEF-42-05, dal piano 42-08, leggendo il termine di paragone mancante dai
due rami di un `if` invece di inventarlo. **DEF-42-08** merita una riga qui perche'
riguarda questa stessa verifica: la riga **3h** di `42-VALIDATION.md` chiede *«identico
riga per riga»*, e **riga per riga non lo e'** — 118 righe grezze, tre dopo la
normalizzazione. **Chiude nel senso che proteggeva e fallisce nel senso in cui e'
scritta**, e non e' stata riscritta a posteriori, il che e' la scelta corretta.

---

## 7. Copertura dei requisiti

| Requisito | Piani che lo dichiarano | Stato | Evidenza |
|---|---|---|---|
| **DS-04** — *Scanner feedback colours stay saturated and unmistakable, and colour is never the only channel* | 42-01, 42-02, 42-03, 42-04, 42-05, 42-06, 42-08, 42-09, 42-11, 42-12 | **meta' meccanica SATISFIED · meta' percettiva APERTA** | tre riempimenti in un solo lookup (`ScanFlash.tsx:95`); gate exit 0, minimo 14.0; quattro canali — glifo (`:104/:119/:132`), permanenza (`1500/2500/2000`), vibrazione (`haptics.ts:19/25/38`), parole (**26 siti su 26 passano un titolo**, contati a macchina). Restano 1h e 1i |
| **RESP-05** — *The scanner centres rather than stretches, and its behaviour is unchanged by the visual work* | 42-01, 42-02, 42-04, 42-05, 42-07, 42-10, 42-11, 42-12 | **meta' *centres* SATISFIED · meta' *behaviour unchanged* provata SOLO per costanti e strade** | massimi a `:2668`, `:2791`, `:3242`, presi fra i tre della shell; decodifica byte-identica a `:1554-1555`; reperto §2. La seconda meta' non e' chiudibile nei termini del criterio 3 |

**Nessun requisito orfano.** `.planning/REQUIREMENTS.md:267-268` mappa a questa fase
esattamente `DS-04` e `RESP-05`, entrambi dichiarati nei piani. Entrambi restano
`Pending` nella tabella di tracciabilita' e con la casella `- [ ]` non barrata alle
righe 122 e 136 — **ed e' corretto cosi'**: barrarli con dieci procedure `pending` e
il criterio 3 senza termine di paragone sarebbe la firma di un lavoro che nessuno ha
visto.

---

## 8. Anti-pattern

| Ricerca | File misurati | Esito |
|---|---|---|
| `TBD`, `FIXME`, `XXX` | tutti i file di prodotto e di script toccati dalla fase | **zero** |
| `TODO`, `HACK`, `PLACEHOLDER`, *not yet implemented*, *coming soon* | idem | **zero** |
| `TBD`, `FIXME`, `XXX` | `.planning/phases/42-scanner-conversion/**`, `.planning/STATE.md` | **zero** |
| token legacy sulla porta (`card-border`, `bg-card`, `text-body`, `border-card`) | `ScannerClient.tsx`, `ScanFlash.tsx` | **zero** — il piano 42-09 tiene |
| palette grezza nel perimetro | `ScanFlash.tsx`, `ScannerClient.tsx`, `DoorSurface.tsx` | **quattro occorrenze, tutte deroghe dichiarate per utility e per riga**: `bg-green-500/90` (`:97`), `bg-red-600/90` (`:125`), `bg-green-500/15 text-green-500` e `bg-green-500` (`ScannerClient.tsx:437-438`) |
| file nominati e inesistenti | `src/`, `scripts/` | **zero** riferimenti a `MobileNav` |

**Una sola osservazione di igiene documentale, e non e' un blocco.**
`42-VALIDATION.md` porta ancora `⬜ pending` su tutte e 37 le righe, comprese le
cinque che `42-BASELINE.md` §Step 5 dichiara **chiuse** (3i, 3j, 3k, 3l, 2c). Chi
legge solo `42-VALIDATION.md` non puo' sapere che cosa si e' chiuso: la mappa dello
stato vive in `42-BASELINE.md` e in `42-12-FINDINGS.md`. E' rumore, non un difetto di
codice — ma un documento di validazione che resta tutto `pending` a fase eseguita
smette di essere una mappa.

---

## 9. Verdetto, senza ammorbidirlo

**Che cosa un verde prova, qui.** Che i tre esiti sono separabili in visione normale e
nelle tre dicromie simulate, con margine (14.0 contro 10) e con il rosso di ieri
misurato **sotto** soglia; che il glifo si stacca dal proprio riempimento su tutti e
tre; che le costanti che decidono un esito — permanenze, aptici, `DB_VERSION`,
`MAX_SYNC_ATTEMPTS`, `fps`, `qrbox`, `facingMode`, la finestra di doppia lettura, le
quattro tabelle di messaggi — **non si sono mosse**, e che il tipo compila.

**Che cosa un verde non puo' provare.** Che qualcuno, in una stanza buia, a distanza
di braccio, con una mano e una fila davanti, distingua un'accettazione da un rifiuto;
che il terzo stato non venga letto come un rifiuto; che il telefono vibri; che la
torcia si accenda; che dopo il lampo lo scanner **riprenda a decodificare**; che la
coda sopravviva a un riavvio; che l'annullamento funzioni con la radio spenta e resti
attribuito; che il mirino sia raggiungibile con un pollice su un tablet in orizzontale.
**Nessuno strumento di questo repository rende un pixel o vibra un telefono**, e non
esiste error tracking: alla porta, la frase sullo schermo e' l'unico osservatore.

**Che cosa una persona deve ancora scoprire entrando in una stanza buia.** Le nove
righe eseguibili di `42-PROCEDURES.md` — otto alla prima porta reale, una (2d) oggi,
con tre dispositivi e una mano.

**E che cosa non si sapra' mai.** Se il comportamento della porta e' invariato
**rispetto a prima**. Quella domanda ha perso il proprio termine di paragone il
2026-08-18, per decisione presa e registrata, non per incidente. La fase ha convertito
la superficie, ha misurato cio' che era misurabile, ha scritto per intero cio' che non
lo era, e **non rivendica il criterio 3**. Questo documento chiude la fase dicendolo,
invece di chiuderla come se il criterio esistesse ancora.

---

*Verificato: 2026-08-18T21:21:23Z · commit `e4b2300` · working tree pulito*
*Verificatore: Claude (gsd-verifier) — nessuna affermazione di questo documento e'
presa da un SUMMARY: ogni riga e' un `file:riga` letto, un comando eseguito con il suo
exit code, o una mutazione applicata e ritirata.*
