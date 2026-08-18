---
phase: 42-scanner-conversion
plan: 03
subsystem: verification-gates
tags: [ds-04, colour, accessibility, cvd, gate, mutation-proof]
requires:
  - "scripts/lib/comments.mjs — liveLinesFrom"
  - "node_modules/tailwindcss/theme.css — la palette grezza, come dipendenza"
  - "src/app/globals.css — i token del brand con valori letterali"
provides:
  - "scripts/verify-scan-legibility.mjs — la misura dei tre esiti come comando con due uscite non nulle distinte"
  - "il nome CONNECTIVITY_PILL.offlineDot, che il piano 42-06 deve introdurre alla lettera"
  - "la matrice delle distanze della terna decisa, minimo 14,0 sui compositi"
  - "l'arbitrato fra le due misure precedenti, con il documento sbagliato corretto in loco"
affects:
  - "42-06 — deve introdurre la costante con quel nome esatto"
  - "42-11 — registra il gate in package.json e verify-all.mjs, con l'onda del colore"
  - "42-04 — la ramificazione sull'inchiostro del glifo non serve: 3,87 supera il pavimento"
tech-stack:
  added: []
  patterns:
    - "invokedDirectly: il gate e' importabile senza eseguirsi, cosi' l'arbitrato usa la sua aritmetica invece di una seconda copia"
    - "un'esclusione che rilegge la propria premessa dal sorgente e fallisce chiusa quando la premessa cade"
key-files:
  created:
    - "scripts/verify-scan-legibility.mjs"
    - ".planning/phases/42-scanner-conversion/42-03-FINDINGS.md"
  modified:
    - ".planning/phases/42-scanner-conversion/42-CONTEXT.md"
decisions:
  - "Il gate resta NON registrato: sulla terna di oggi misurerebbe 2,1 e sarebbe rosso per tutto l'intervallo che D-42-04 blocca (D-42-09)"
  - "Il nome della costante della pillola e' CONNECTIVITY_PILL con chiave offlineDot, chiavi piatte, utility scritte per esteso"
  - "Il pavimento di contrasto applicato al glifo e' 3:1 (grafica, WCAG 1.4.11), dichiarato a ogni esecuzione"
  - "Il documento corretto e' 42-CONTEXT.md; 42-RESEARCH.md §0 non si tocca, e la ragione e' scritta"
metrics:
  tasks: 3
  commits: 3
  duration: "~1h"
  completed: 2026-08-18
---

# Fase 42 Piano 03: Il gate della leggibilita' della porta — Sommario

Il gate della leggibilita' esiste, e' provato per mutazione in cinque direzioni,
e l'aritmetica ha dato torto a entrambe le misure precedenti su tre celle.

## Cosa e' stato costruito

`scripts/verify-scan-legibility.mjs` — 712 righe, zero dipendenze npm, solo
`node:` e `./lib/`. Rilegge **ogni colore da un file sorgente**: i tre esiti
dalle chiavi di `FLASH_STATES`, l'inchiostro dal glifo condiviso, la palette
grezza da `theme.css` in `oklch`, i token da `globals.css`, la pillola di
connettivita' da una costante nominata. Converte in sRGB lineare con le matrici
Ottosson, **compone il riempimento sul fondo alla sua alpha in luce lineare** —
perche' il numero che una persona vede e' il composito, e nessuna delle due
tabelle precedenti lo considerava — simula **Brettel, Vienot & Mollon 1997 a due
semipiani**, e misura in **CIEDE2000** con soglia **10**.

Sull'albero di oggi **esce 2** e nomina la costante che manca. E' la risposta
corretta: la pillola non e' ancora sollevata, quindi nulla e' stato misurato.

## Le tre cose che valgono piu' del codice

**1. L'esclusione che verifica la propria premessa.** Accetta-contro-pillola e'
esclusa perche' il flash copre il viewport e nasconde l'intestazione in cui la
pillola vive. Il gate **rilegge il contenitore del flash** invece di credere a
quella frase: se smette di essere ancorato a tutti i bordi, misura la coppia e
rossa **nominando la premessa caduta**, non un colore. La direzione 5 di
mutazione lo prova, e ha prodotto un numero che serve al progetto: con la terna
decisa, quella coppia sta a **5,5 in protanopia**. L'idea differita di
trasformare il flash in una card ha adesso il suo costo misurato prima invece
che scoperto dopo.

**2. Le mutazioni asserite prima di leggerne l'esito.** Cinque direzioni, e per
ognuna il comando che dimostra che la mutazione era andata a segno. Direzione 4
(terna decisa) exit **0** con minimo **14,0**; direzione 1 (ambra rimessa) exit
**1**; direzioni 2 e 3 exit **2**; direzione 5 exit **1**. Tutto su un ramo
usa-e-getta, cancellato, con il ripristino provato per percorso esatto — nessun
file dello scanner e' cambiato, perche' D-42-04 lo vieta.

**3. L'arbitrato, che ha rovesciato una premessa del piano.** Il piano si
aspettava che il gate desse ragione a una delle due tabelle. Ne ha date **tre**
risposte: sulla direzione sta con il contesto; sulla tritanopia pure, e la
ragione e' strutturale (la ricerca dichiara il metodo a piano singolo del 1999,
povero proprio li'); ma **su tre celle non riproduce nessuna delle due**. Una e'
decidibile senza credere a nessun modello di visione, perche' e' a vista normale
dove non c'e' simulazione: rifiuta-contro-terzo-stato vale **33,1**, non 38,4, e
lo sbagliano **entrambe** — il che dice che le due misure non erano indipendenti
quanto sembravano.

La cella che conta di piu': **accetta contro terzo stato, in protanopia, sta a
7,0** e non a 10,2. Entrambe le tabelle la davano appena sopra la soglia. Con
l'ambra di oggi il difetto non era solo la pillola *Offline*: anche
l'accettazione e il gia'-registrato sono confondibili.

L'arbitro e' stato verificato prima di arbitrare: CIEDE2000 riproduce 14 dei 15
vettori pubblicati da Sharma alla quarta decimale, e la conversione L\*a\*b\*
riproduce esattamente i valori di riferimento dei primari sRGB.

## Deviazioni dal piano

**1. [Regola 3 — bloccante] `node_modules` assente nel worktree.**
Il worktree non ha dipendenze installate, e il gate legge `theme.css` da li'.
Risolto con un **collegamento simbolico** alla copia del repository principale —
`node_modules` e' in `.gitignore`, quindi non entra in nessun commit, e il
worktree non e' stato modificato in modo tracciabile. Nessun pacchetto e' stato
installato: la regola 3 esclude gli install, e questo non lo e'.

**2. [Regola 2 — correttezza] Il gate e' importabile senza eseguirsi.**
Il piano non lo chiedeva. Serve perche' l'arbitrato del task 3 deve confrontare
i numeri del gate con due tabelle che misuravano i **token grezzi** e non i
compositi: senza il guard, quel confronto avrebbe richiesto **una seconda copia
della stessa aritmetica**, cioe' una terza tabella invece di un verdetto su due.
Il pattern e' di casa — `invokedDirectly` in `rls-baseline.mjs:2594` e
`verify-capabilities.mjs:1435`.

**3. [reperto] La ramificazione sull'inchiostro del glifo non serve.**
Il piano 42-04 teneva pronta una deroga: *se il composito del rifiuto scende
sotto il pavimento di contrasto, quello stato solo resta bianco*. Misurato,
`red-600/90` sul token di fondo da' **3,87 : 1**, sopra il pavimento grafica di
3:1. L'inchiostro resta **uno solo** per tutti e tre gli stati, e la simmetria
non si rompe.

**4. [reperto] La terna decisa passa con 14,0, non con 15,5.**
Non cambia nessuna decisione — 14 supera 10 con margine — ma e' una cifra che
verra' citata, ed e' corretta in `42-CONTEXT.md` con la sua data.

## Cosa NON e' stato fatto, e perche'

- **Nessun file sotto `src/` e' cambiato.** D-42-04 blocca ogni modifica alla
  porta fino al primo door pass su superficie non convertita. Le mutazioni sono
  vissute su un ramo cancellato.
- **Il gate non e' registrato.** Ne' `package.json` ne' `verify-all.mjs` lo
  nominano — verificato, zero occorrenze in entrambi. Registrato oggi
  misurerebbe la terna attuale, minimo 2,1, e resterebbe rosso per settimane:
  *un gate che nasce rosso e' un gate che qualcuno spegne*. La registrazione
  viaggia con il colore (D-42-09, piano 42-11).
- **Nessun pacchetto installato.** `culori`, `colorjs.io` e `color-blind` sono
  rifiutati in anticipo da `42-RESEARCH.md` §10 e non sono stati proposti.
- **Nessuna soglia toccata, nessun colore sostituito.** `DEROGATIONS` e'
  dichiarata e vuota.

## Verifica

Non esiste un test runner per il prodotto, quindi nulla qui e' "verificato
perche' i test passano". Cosa e' stato eseguito:

| Comando | Esito |
|---|---|
| `node scripts/verify-scan-legibility.mjs` | exit **2**, nomina la costante mancante |
| `LC_ALL=C /usr/bin/grep -c 'verify:scan-legibility' package.json scripts/verify-all.mjs` | **0** e **0** |
| `LC_ALL=C /usr/bin/grep -n "^import" scripts/verify-scan-legibility.mjs` | solo `node:fs`, `node:path`, `node:url`, `./lib/comments.mjs` |
| cinque direzioni di mutazione | 0 · 1 · 2 · 2 · 1, ognuna con la mutazione asserita |
| CIEDE2000 contro i vettori di Sharma | 14/15 alla quarta decimale |
| L\*a\*b\* contro i valori di riferimento dei primari sRGB | esatta |
| `git status --porcelain -- src/ scripts/` dopo il ripristino | vuoto |
| `npm run build` | exit **0** |

## Debito e voci lasciate aperte

- **La pillola *Offline* non e' ancora sollevata**, quindi il gate rifiuta. E'
  lavoro del piano 42-06, e il nome che deve introdurre e' fissato in
  `42-03-FINDINGS.md` §1.
- **`42-RESEARCH.md` §0 non e' stato toccato**, deliberatamente: la sua
  `DISCORDANZA 1` obietta a una tabella gia' ritirata, e la sua colonna
  tritanopia diverge per il metodo che dichiara di se'. La ragione e' scritta in
  `42-03-FINDINGS.md` §4.5 perche' non sembri una dimenticanza.
- **Accetta contro pillola a 5,5 in protanopia** e' un vincolo nuovo sull'idea
  differita del flash-come-card. Non e' un difetto oggi; e' il prezzo di quella
  scelta, adesso noto.

## Self-Check: PASSED

- `scripts/verify-scan-legibility.mjs` — presente
- `.planning/phases/42-scanner-conversion/42-03-FINDINGS.md` — presente
- `.planning/phases/42-scanner-conversion/42-CONTEXT.md` — modificato, 67 righe
  aggiunte, nessuna rimossa
- commit `6a5452a`, `778bbeb`, `407be3f` — presenti nella history del ramo
- nessuna cancellazione di file in nessuno dei tre commit
