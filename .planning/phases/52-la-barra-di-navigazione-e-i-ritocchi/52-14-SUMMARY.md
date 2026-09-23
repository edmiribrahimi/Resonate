---
phase: 52-la-barra-di-navigazione-e-i-ritocchi
plan: 14
subsystem: navigazione, porta, media, accesso (verifica su dispositivo)
tags: [nav-01, nav-02, nav-03, nav-04, nav-05, nav-06, nav-07, laboratorio, iphone, safari, procedure-manuali]
requires:
  - "52-13: M2 sul laboratorio, lab.resonatemotion.com a 7a79353"
  - "52-02: le procedure P-52-A..G"
provides:
  - "52-ESITI.md: PRE-LAB, gli esiti di P-52-A..G con la fonte di ciascuno, tre difetti con evidenza, la decisione sul login (D-52-28)"
  - "52-PROCEDURES.md: walked 2026-09-23, riquadri Result compilati"
affects:
  - "piano di chiusura (da aprire con /gsd:plan-phase 52 --gaps): difetto 1 almeno, piu' 2 e 3, e la ri-misura sul simulatore"
  - "52-15: NON parte prima del piano di chiusura"
  - "52-17: il VERIFICATION eredita P-52-E passo 6, il video di P-52-G e la sonda 7 come non percorsi"
tech-stack:
  added: []
  patterns:
    - "quattro fonti con un ordine di autorita': a mano su iPhone > iPhone pilotato > iPhone simulato > Chrome headless; un passo passato solo in Chrome non e' un esito da iPhone"
key-files:
  created:
    - .planning/phases/52-la-barra-di-navigazione-e-i-ritocchi/52-14-SUMMARY.md
  modified:
    - .planning/phases/52-la-barra-di-navigazione-e-i-ritocchi/52-ESITI.md
    - .planning/phases/52-la-barra-di-navigazione-e-i-ritocchi/52-PROCEDURES.md
decisions:
  - "D-52-28: il login resta com'e' (`resta`), registrato da chi coordinava la corsa a nome del proprietario, la cui risposta letterale e' un requisito (niente zoom al tocco) e non una scelta fra le due opzioni; `allinea` si riapre se la ri-misura dopo la correzione del difetto 1 mostra «Sign In» coperto con il fuoco sulla password"
  - "La correzione dello zoom e' 16 px sui campi a larghezza di telefono, non maximum-scale: D-41-08 vieta di bloccare lo zoom"
  - "La fase non va in produzione con i tre difetti aperti: 52-15 aspetta un piano di chiusura"
metrics:
  duration: "corsa 16:13Z → 17:15Z; registrazione ~30 min"
  completed: 2026-09-23
  tasks: 3
  files: 3
---

# Fase 52 Piano 14: la corsa sul laboratorio, su iPhone — Summary

La barra, il pannello, la gallery, la striscia, i chip, la porta a cinque
linguette e la tastiera sono stati provati **sul laboratorio**, su un **iPhone
vero** del proprietario (iOS 26.7), a mano e pilotato. Le prove sono state
completate da un iPhone simulato (iOS 27.0) e da Chrome headless. **Le
procedure passano**, tranne i passi che il banco non permette, dichiarati non
percorsi. **Ma la corsa ha trovato tre difetti**, e il primo e' della porta:
Safari ingrandisce la pagina a ogni tocco su un campo, e l'ingrandimento resta.
**La fase non va in produzione cosi'.**

## Task

| Task | Nome | Commit | File |
|---|---|---|---|
| 1 | PRE-LAB — laboratorio, commit servito, account del banco | `98dec25` | `52-ESITI.md` |
| 2 | Il proprietario percorre P-52-A..G sul laboratorio | `9803593` | `52-ESITI.md`, `52-PROCEDURES.md` |
| 3 | Il login: la decisione D-52-28 | `9803593` | `52-ESITI.md`, `52-PROCEDURES.md` |

## Gli esiti, per procedura

Il dettaglio passo per passo, con la fonte e l'ora di ciascun esito, e' in
`52-ESITI.md`, sezione *La corsa*.

| Procedura | Esito | Cosa non e' stato percorso, o solo fuori dall'iPhone |
|---|---|---|
| P-52-A | **passa** | `Escape` e i passi da tablet (9-11) **solo in Chrome a 1024 px**: nessun tablet vero |
| P-52-B | **passa** | — (il passo 4 con lo `staff` non assegnato creato dall'app, a mano) |
| P-52-C | **passa** | passo 4 (tablet) solo in Chrome |
| P-52-D | **passa**, due passi non percorsi | 2 (nessun format con sola bozza) e 5 (nessun momento a zero serate): il banco non li permette |
| P-52-E | **passa**, un passo non percorso | 6 (scansione di un QR e annullamento da Recent): nessuna fotocamera nelle corse pilotate, non fatto a mano |
| P-52-F | **aperta — difetto 1** | le misure 1-3 passano; la 4 **atteso assente — osservato assente** su iOS 26.7 e 27.0; il login e' misurato e deciso |
| P-52-G | immagini **passano**; video non percorso | il banco non ha un video; sonda 7 senza un caricamento nuovo |

Lo `staff` non assegnato che mancava sul banco e' stato **creato dall'app** dal
`master` alle 16:21Z: la mail d'invito e' arrivata, la password e' stata
impostata dal link, l'accesso e' riuscito.

## Difetti aperti (gap per il piano di chiusura)

1. **Zoom di Safari sui campi — Critical per la porta.** Ogni campo ha 14 px
   (`src/components/ui/Input.tsx:103`, `text-sm`). Su iOS il tocco porta lo
   scale a 1,1436 (390 → 341 px) e l'ingrandimento **resta dopo il blur**. Alla
   porta si perdono a destra «QR Scan» e la linguetta Alerts. Misurato sul
   simulatore su ricerca della porta, login e codice sconto; visto dal
   proprietario su Members, login e impostazione della password. In Blink zero
   overflow. **Correzione provata:** con i campi a 16 px lo scale resta 1.
   **Vincolo:** D-41-08 vieta di bloccare lo zoom, quindi la correzione e' 16 px
   sui campi a larghezza di telefono, non `maximum-scale`. **Requisito del
   proprietario:** *«se sono sulla pagina di login, e clicco sul campo mail o
   password, non deve avvenire lo zoom»*.
2. **La pagina Account di uno `staff` dice «Attendee».**
   `src/app/(members)/account/page.tsx:254-259` conosce solo `master` e
   `organizer`. E' il gate lessicale del progetto: `attendee` e' l'account
   leggero di chi ha comprato.
3. **Un indirizzo con il punto finale produce «The write failed».** Il codice
   `validation_failed` dell'autenticazione non ha una voce propria in
   `CreateAccountForm.tsx` e ricade su `write_failed` (`:115-121`), che parla
   di un guasto del database. Il messaggio non e' silenzioso, ma porta fuori
   strada.

**Il piano 52-15 (produzione) NON parte prima di un piano di chiusura**
(`/gsd:plan-phase 52 --gaps`) che corregga **almeno il difetto 1**. Nello
stesso piano c'e' la **ri-misura sul simulatore**: scale 1 al tocco su porta,
login e codice sconto, e il login di D-52-28 misurato di nuovo.

## La decisione sul login (D-52-28)

- **La misura:** con il fuoco su email, password e «Sign In» sono coperti. Con
  il fuoco su password, Safari scorre e tutti e tre sono in vista (simulatore,
  e la schermata del proprietario conforme).
- **La risposta del proprietario, testuale:** *«se sono sulla pagina di login, e
  clicco sul campo mail o password, non deve avvenire lo zoom (come accade
  ora). non so quale delle due scelte sia»*.
- **La scelta: `resta`.** L'ha registrata chi coordinava la corsa, a nome del
  proprietario, perche' la risposta e' un requisito che nessuna delle due
  opzioni soddisfa: e' il difetto 1. `FOCUS_ROOT` e il suo digest non si
  toccano. **`allinea` resta disponibile** se, dopo la correzione, «Sign In»
  risultasse coperto con il fuoco sulla password.

## Fatti registrati (non difetti)

- **Manage events dice «No events yet» all'`organizer`.** La lista e' filtrata
  per `created_by` (`admin/(work)/events/page.tsx:119`, D-34-06), e le serate
  del banco le ha create il `master`.
- **A radio spenta l'avviso della guest list e il pallino di Alerts non
  arrivano subito:** dopo ~40 s in Chrome, ~2 minuti sul telefono. Li accende
  il timeout dell'heartbeat realtime, non lo spegnimento della radio.
- **Da confermare che sia voluto:** con una ricerca attiva, i contatori della
  porta seguono il filtro.

## Deviazioni dal piano

- **Quattro fonti invece di una.** Il piano chiedeva la corsa del proprietario
  su iPhone. Il proprietario ha percorso a mano la parte che solo lui poteva
  fare: `staff` non assegnato, organizer, Members, login. Il resto e' stato
  misurato sul suo stesso telefono pilotato, su un iPhone simulato e in
  Chrome. Ogni esito porta la sua fonte. I passi passati **solo in Chrome**
  sono dichiarati tali e non contano come esiti da iPhone.
- **Il task 3 si e' chiuso con una scelta registrata a nome del proprietario.**
  La risposta non era una delle due opzioni. Sono registrate insieme le sue
  parole, la scelta, chi l'ha fatta e perche'.
- **Difetti trovati invece di una procedura soltanto percorsa.** Sono documentati
  come gap, non corretti qui: il piano tocca solo documenti.

## Known Stubs

Nessuno: il piano non tocca codice.

## Verifica

Solo documenti: `npm run build` non serve. Grep del piano: `Corsa sul
laboratorio` presente e zero UUID in `52-ESITI.md` (task 1); `P-52-F` e
«atteso assente» presenti (task 2); `login` presente e `walked: 2026-09-23`
(task 3). Zero indirizzi email, zero ref di laboratorio, zero UUID nei due file.

## Self-Check: PASSED

- FOUND: `52-ESITI.md`, `52-PROCEDURES.md`, `52-14-SUMMARY.md`
- FOUND: commit `98dec25` (task 1), `9803593` (task 2 e 3)
- Zero UUID ed email nel SUMMARY; i gap sono dichiarati e **52-15 e' bloccato**
  fino al piano di chiusura: il Self-Check dice che i file concordano, non che la
  fase e' pronta.
