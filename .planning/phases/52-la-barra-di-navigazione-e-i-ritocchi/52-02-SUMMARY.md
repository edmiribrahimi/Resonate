---
phase: 52-la-barra-di-navigazione-e-i-ritocchi
plan: 02
subsystem: planning / validazione
tags: [procedure, validazione, ui-spec, nav, gallery, porta, viewport]
requires: []
provides:
  - "52-PROCEDURES.md — PRE-LAB e P-52-A..G, scritte prima di essere percorse, sette Result: pending"
  - "52-VALIDATION.md — strategia di validazione per un repo senza test runner, mappa di 46 task"
  - "41-UI-SPEC §10 e §12, 52-UI-SPEC §D.1 — le tre raccomandazioni non bloccanti chiuse"
affects: [52-13, 52-14, 52-17]
tech-stack:
  added: []
  patterns: ["procedura scritta prima del codice che misura (forma di 51-PROCEDURES.md)", "aspettativa «atteso assente» scritta prima della corsa (D-52-28)"]
key-files:
  created:
    - .planning/phases/52-la-barra-di-navigazione-e-i-ritocchi/52-PROCEDURES.md
  modified:
    - .planning/phases/52-la-barra-di-navigazione-e-i-ritocchi/52-VALIDATION.md
    - .planning/phases/52-la-barra-di-navigazione-e-i-ritocchi/52-UI-SPEC.md
    - .planning/phases/41-shared-primitives-three-tier-layout/41-UI-SPEC.md
decisions:
  - "Nella mappa di 52-VALIDATION.md i comandi di 52-02-T2 e 52-17-T2 non sono copiati verbatim: cercano stringhe (segnaposto del modello, la frase vietata dal Guardrail 1) che, copiate nel file, li farebbero fallire su se stessi; la cella dice cosa controllano e rimanda al piano"
  - "Il tempo di npm run verify e' misurato e scritto com'e': ~4 s nel worktree, 22 passed e 2 REFUSED per credenziali mancanti; il rifiuto non e' dichiarato verde"
metrics:
  duration: "~35 min"
  completed: 2026-09-23
  tasks: 3
  files: 4
---

# Fase 52 Piano 02: procedure scritte prima, validazione onesta Summary

Le sette procedure manuali della fase (P-52-A..G, con `PRE-LAB`) esistono ora
**prima** del codice che misureranno, con passo · ruolo · cosa si deve osservare
e sette `Result: pending`; `P-52-F` dichiara prima del primo passo che il
ridimensionamento del viewport sotto la tastiera su Safari iOS e' **atteso
assente** e registra separatamente le quattro misure; `52-VALIDATION.md` dice
la verita' su un repo senza test runner; le tre raccomandazioni della UI-SPEC
sono chiuse nei documenti che le reggono.

## Cosa e' stato fatto

| Task | Nome | Commit | File |
|---|---|---|---|
| 1 | 52-PROCEDURES.md — P-52-A..G prima di percorrerle | `ad103bd` | `52-PROCEDURES.md` (312 righe) |
| 2 | 52-VALIDATION.md riempito onestamente | `bf7329c` | `52-VALIDATION.md` |
| 3 | Le tre raccomandazioni non bloccanti della UI-SPEC | `3659e4c` | `52-UI-SPEC.md`, `41-UI-SPEC.md` |

**Task 1.** `PRE-LAB` (laboratorio `ACTIVE_HEALTHY` con NXDOMAIN = `INACTIVE`;
commit servito scritto in `52-ESITI.md` prima; M2 applicata; i sei soggetti
letti da `.env.lab.seed.json`; banco dei media di 52-01; versione di iOS).
`P-52-A` porta la tabella attesa per soggetto (UI-SPEC §A.1) e undici passi
fra telefono e tablet; `P-52-B` il cancello e la sezione Gallery assente per
`attendee` (D-52-29); `P-52-C` la striscia appesa; `P-52-D` chip e cifra staff,
con i passi che il banco potrebbe non permettere marcati «non percorribile,
non fabbricato»; `P-52-E` la porta in due giri, radio accesa e modalita' aereo
vera, con l'asimmetria del rifiuto scritta in testa; `P-52-F` il riquadro
dell'aspettativa prima dei passi, quattro misure separate e il login provato
com'e' (decide `FOCUS_ROOT`, non e' un fallimento); `P-52-G` le otto sonde con
chi le esegue (1-4, 6-8 chi esegue 52-13; 5 il proprietario) e la finestra di
cache della sonda 1 (CDN 3600 s, service worker 1 h), da ripetere dopo la
finestra (Pitfall 15).

**Task 2.** Framework «nessuno», quick `npm run build` + gate del file, full
`npm run build && npm run verify`, runtime misurato; sampling per task, per
onda e prima della verifica di fase (con `verify:capabilities` e
`verify:refusal` contro la produzione dopo l'atto di 52-15); mappa di **46
task** dei piani 52-01..52-17 con requisito, minacce, tipo
(`static`/`database`/`manual`) e comando; Wave 0; Manual-Only che rimanda a
P-52-A..G; Sign-Off spuntato solo dove vero, `Approval: pending`.

**Task 3.** 52 §D.1 cita D-52-26 accanto al conteggio senza parentesi; 41 §12
registra l'unica eccezione `--faint` (TASK spenta, 3.54:1, bordo tratteggiato e
`aria-disabled` come canali dello stato); 41 §10 registra `z-10`
(`ScannerClient.tsx:2928`, striscia appesa) e `z-40` (`StickyBuyBar.tsx:121`)
con la frase datata che non aggiunge gradini. Le due citazioni `file:riga` sono
state rilette sul codice corrente. `git diff --numstat`: 41-UI-SPEC 14 righe
aggiunte, 0 tolte; 52-UI-SPEC 1 riga cambiata.

## Deviazioni dal piano

**1. [Rule 1 - Bug] Due comandi della mappa si sarebbero smentiti da soli**
- **Trovato durante:** task 2
- **Problema:** il piano chiede i comandi `<automated>` «come scritti nel
  piano». Quelli di 52-02-T2 e 52-17-T2 contengono le stringhe che il controllo
  di 52-02-T2 vieta in `52-VALIDATION.md` (i segnaposto del modello e la frase
  del Guardrail 1): copiati verbatim, il controllo falliva sul file stesso.
- **Correzione:** per quelle due righe la cella descrive cosa il comando
  controlla e rimanda al piano; l'eccezione e' dichiarata sopra la tabella.
- **File:** `52-VALIDATION.md` · **Commit:** `bf7329c`

**2. [Nota] Il runtime scritto e' una misura parziale, dichiarata come tale.**
`npm run verify` e' stato lanciato davvero (node_modules collegato, nessuna
installazione): ~4 s, 22 `passed`, 2 `REFUSED` per credenziali assenti nel
worktree. `npm run build` non e' stato cronometrato qui: il valore ~90 s viene
dalla fase 51 ed e' scritto con la sua fonte; la casella di latenza del
Sign-Off resta non spuntata.

## Known Stubs

Nessuno. I sette `Result: pending` e `walked: —` sono **voluti** (T-52-05): li
riempie la corsa di 52-14 in `52-ESITI.md`.

## Threat Flags

Nessuna superficie nuova. Controlli fatti per T-52-06: zero UUID nei due file
(`grep -cE "[0-9a-f]{8}-[0-9a-f]{4}-"` = 0), nessun ref di laboratorio, ruoli e
mai persone. Il ref di **produzione** compare in tre comandi riportati nella
mappa, ed e' gia' pubblico negli script del repo (`scripts/dev-lab.sh:9`,
`scripts/purge-attendances.mjs:125`): serve a provare che gli script lo
rifiutano.

## Self-Check: PASSED

- FOUND: `.planning/phases/52-la-barra-di-navigazione-e-i-ritocchi/52-PROCEDURES.md`
- FOUND: `.planning/phases/52-la-barra-di-navigazione-e-i-ritocchi/52-VALIDATION.md`
- FOUND: commit `ad103bd`, `bf7329c`, `3659e4c`
- I tre comandi `<automated>` del piano sono stati rilanciati e stampano OK
- Non toccati: `STATE.md`, `ROADMAP.md`, `52-ESITI.md`
