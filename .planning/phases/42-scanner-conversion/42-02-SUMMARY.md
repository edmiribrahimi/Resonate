---
phase: 42-scanner-conversion
plan: 02
subsystem: check-in & offline — il reperto pre-conversione e le procedure manuali
tags: [baseline, determinismo, rifiuto, door-pass, procedure, wave-0]
requires:
  - "42-RESEARCH.md §6.1 — la specifica dei tredici blocchi"
  - "42-VALIDATION.md — le dieci righe manuali e i loro perche'"
  - "39-DOOR-PASS.md §0.6 e §8 — il pass a cui 3m e 3n rimandano"
provides:
  - "scripts/capture-scanner-baseline.mjs — la cattura deterministica, rieseguibile dopo la conversione"
  - "42-BASELINE.md — lo stato pre-conversione dello scanner, con SHA e data"
  - "42-PROCEDURES.md — dieci procedure, dieci Result: pending"
affects:
  - "ogni onda di conversione della fase 42: il diff del blocco invariante si fa contro 42-BASELINE.md"
  - "la riga 3m e' il gate d'esecuzione dei piani bloccati di questa fase"
tech-stack:
  added: []
  patterns:
    - "cattura deterministica con intestazione fuori dalla regione diffabile, tagliata su due marcatori"
    - "rifiuto esplicito exit 2 con FATAL: che nomina il blocco, provato per mutazione"
key-files:
  created:
    - "scripts/capture-scanner-baseline.mjs"
    - ".planning/phases/42-scanner-conversion/42-BASELINE.md"
    - ".planning/phases/42-scanner-conversion/42-PROCEDURES.md"
  modified: []
decisions:
  - "Le quattro tabelle di messaggi sono un blocco proprio (13), separate dall'uscita della suite: 42-RESEARCH §6.1 le impastava insieme, 42-VALIDATION riga 3l le vuole byte per byte da sole"
  - "L'uscita di npm run verify NON entra nella regione diffabile: e' contesto in prosa sotto il marcatore, perche' wave 0 la muove di proposito e una riparazione non dev'essere leggibile come regressione"
  - "Il blocco 12 stampa il solo codice d'uscita del build: la sua uscita porta tempi e dimensioni, e sarebbe la sola riga non deterministica del reperto"
  - "42-BASELINE.md e 42-PROCEDURES.md restano in inglese come 39-DOOR-PASS.md e 45-PROCEDURES.md: una procedura confrontata riga per riga con un pass deve stare nella lingua di quel pass"
metrics:
  duration: "~50 min"
  completed: 2026-08-18
  tasks: 3
  commits: 3
  files_created: 3
  files_modified: 0
---

# Phase 42 Plan 02: il reperto meccanico e le dieci procedure — Summary

La parola *invariato* e' diventata un diff su un file di 3449 righe: tredici blocchi
catturati da uno script deterministico prima che la conversione tocchi qualsiasi cosa,
piu' dieci procedure scritte per cio' che nessun comando di questo repository puo'
chiudere — tutte a `pending`.

## Cosa e' stato costruito

**`scripts/capture-scanner-baseline.mjs`** legge l'albero e stampa i tredici blocchi
di invarianza. Non tocca un solo file del prodotto: `git status --porcelain -- src/`
resta vuoto durante e dopo.

Misurato su questo albero, e sono i numeri che il confronto post-conversione dovra'
ritrovare identici:

| blocco | cosa dice |
|---|---|
| 1 | tre dwell — 1500 / 2500 / 2000 ms, distinti |
| 2 | tre pattern aptici — `200`, `[100, 50, 100]`, `[300, 80, 120]`, distinti |
| 3 | il corpo di `showFlash`, 14 righe, con la mappatura esito → aptico |
| 4 | **26** siti di `showFlash`, **26 con titolo** — 15 `error`, 8 `already_recorded`, 5 `success` |
| 5 | l'unione `DoorOutcome`, tre discriminanti |
| 6 | **sei** path di glifo, non tre: gli stessi tre stati sono disegnati due volte |
| 7 | `DB_NAME`, `DB_VERSION = 5`, `MAX_SYNC_ATTEMPTS = 8`, piu' i tre tipi della coda |
| 8 | le quattro strade — `ticketOnline` 3, `ticketOffline` 3, `membershipOnline` 3, `membershipOffline` 2 — e le altre sei funzioni che lampeggiano |
| 9 | l'uscita di `verify-routes`, exit 0 |
| 10 | `DOUBLE_READ_WINDOW_SECONDS = 20` |
| 11 | `fps 15`, `qrbox 280×280`, `facingMode environment` |
| 12 | `npm run build`, exit **0** |
| 13 | le quattro tabelle di messaggi, byte per byte |

**Il determinismo e' la proprieta' che rende il reperto utile**, ed e' provato, non
dichiarato: due run consecutivi danno byte identici (`diff` muto). Data e SHA stanno
nell'intestazione, **sopra** il marcatore su cui il confronto taglia, quindi non
compaiono mai in un diff.

**Il rifiuto e' provato per mutazione.** Rinominato `FLASH_STATES` in
`ScanFlash.tsx`, con la mutazione **asserita prima** di leggerne l'esito (3
occorrenze del nome nuovo, 0 del vecchio) — lo script esce **2** con
`FATAL: block 1 could not be captured`, e non stampa nulla. Ripristinato con
`git checkout --` sul singolo file, riasserito il ripristino, e la cattura torna
byte-identica a quella di prima.

**`42-BASELINE.md`** e' quella cattura, presa su `d3ae238` con lo scanner
**non convertito**. La regione diffabile e' byte-identica a una cattura fresca:
provato tagliando sui due marcatori, 295 righe uguali. Sotto il marcatore, due
sezioni in prosa che nessun diff tocca — il contesto della suite (exit 2, quattro
gate che **rifiutano**, due dei quali sono lavoro di wave 0) e le **nove** righe di
cio' che il reperto non prova, chiuse dalla frase da cui dipende la fase: prova che
le costanti e le strade non si sono mosse, non che il comportamento non l'abbia
fatto.

**`42-PROCEDURES.md`** porta **dieci** procedure e **dieci** `Result: pending` —
righe 1h, 1i, 2d e 3m-3s. Ognuna dice cosa prova, perche' nessun comando la chiude
(con la ragione presa da `42-VALIDATION.md`, non inventata), i passi numerati, e che
le osservazioni si scrivono **verbatim**. Per 1h e 1i la distinzione e' l'intero
contenuto: cosa si e' riconosciuto **prima di leggere le parole sullo schermo**,
registrato separatamente da cio' che si e' letto dopo.

## Le due righe che sono la spina dorsale

**3m — il door pass sullo scanner NON convertito** gira alla prima porta reale,
prima che qualunque conversione esca. Finche' legge `pending`, **nessun piano
bloccato di questa fase puo' partire**: e' scritto nella nota in testa al documento
come gate d'esecuzione, non come preferenza di scheduling. Una conversione spedita
prima non produce una fase piu' difficile da verificare — produce un criterio che non
si potra' mai chiudere, perche' la linea di base andava presa su codice che non
esiste piu'.

**3n — lo stesso pass sul convertito**, alla porta dopo, riga per riga contro il
primo. Ogni differenza e' un difetto della conversione finche' non e' argomentato il
contrario, e l'argomento si scrive accanto alla differenza.

Entrambe **rimandano** a `39-DOOR-PASS.md` §0.6 e §8 invece di riscriverli: una
procedura copiata deriva da quella che ha copiato, e il confronto e' per numero di
sezione di quel documento.

## Deviazioni dal piano

**Nessuna deviazione di comportamento.** Tre note di esecuzione, tutte dentro il
perimetro che il piano stesso aveva dichiarato:

1. **La correzione che il piano aveva gia' fatto sua** — `42-RESEARCH.md` §6.1 impasta
   le quattro tabelle di messaggi nel suo blocco 13 insieme all'uscita della suite,
   mentre `42-VALIDATION.md` riga 3l le pretende come blocco a se'. Il piano aveva gia'
   deciso di separarle, ed e' cosi' che sono uscite: blocco 13 = le quattro tabelle,
   l'uscita della suite in una sezione di contesto **sotto** la regione diffabile.

2. **`npm run verify` non e' invocato dallo script.** Verificato eseguendolo due volte:
   la sua uscita porta i **tempi per gate** (`0.0s` contro `0.1s` fra due run), quindi
   includerla renderebbe il reperto non deterministico — la proprieta' che lo rende
   utile. Il contesto della suite e' quindi scritto in prosa nel documento, dove il
   piano lo voleva comunque, e dove il taglio sul marcatore lo esclude dal confronto.

3. **`node_modules` assente nel worktree.** Il blocco 12 richiede il codice d'uscita del
   build, e senza dipendenze il build non gira. Risolto con un symlink a quello del
   repository principale — `node_modules` e' in `.gitignore`, non e' entrato in nessun
   commit, e il symlink e' stato rimosso alla fine. `git status --porcelain -- src/` e'
   rimasto vuoto per tutta l'esecuzione.

## Cosa questo piano NON ha toccato

Nessun file dello scanner. Il vincolo d'ordine della fase 42 dice che la conversione
e' l'ultima, e solo dopo che il door pass e' girato a una porta reale. Questo piano
**misura** la superficie, e una linea di base presa dopo una modifica non e' una linea
di base: `git status --porcelain -- src/` e' stato controllato dopo ogni task e dopo
la prova per mutazione, ed e' sempre stato vuoto.

## Verifica

**Non esistono test per il prodotto**, e nulla qui e' verificato perche' "i test
passano". Cio' che e' stato eseguito:

| prova | comando | esito |
|---|---|---|
| determinismo | due catture consecutive + `diff` | **byte identici** |
| rifiuto | `FLASH_STATES` rinominato, mutazione asserita prima | **exit 2**, `FATAL: block 1` |
| ripristino | `git checkout --` sul singolo file + riasserzione | 3 occorrenze, cattura di nuovo identica |
| regione diffabile | taglio sui marcatori, `diff` contro cattura fresca | **295 righe uguali** |
| typecheck | `npm run build` | **exit 0** |
| pubblicazione | grep date/sedi/sigle su entrambi i documenti | solo la data d'intestazione delle procedure |
| conteggio procedure | `grep -c "^Result: pending"` | **10** |
| perimetro | `git status --porcelain -- src/` | vuoto |

**Cosa resta aperto, e non e' una lacuna:** dieci righe si chiudono
sull'osservazione di una persona, e le due che decidono la fase si chiudono al
buio, a una porta reale, con una fila davanti. `42-PROCEDURES.md` le rende
eseguibili; non le esegue, e nessun piano di questa fase e' autorizzato a
riempirne un `Result`.

## Self-Check: PASSED

- `scripts/capture-scanner-baseline.mjs` — FOUND (672 righe)
- `.planning/phases/42-scanner-conversion/42-BASELINE.md` — FOUND (373 righe)
- `.planning/phases/42-scanner-conversion/42-PROCEDURES.md` — FOUND (392 righe)
- `d3ae238` — FOUND
- `246d10c` — FOUND
- `d4d28ee` — FOUND
