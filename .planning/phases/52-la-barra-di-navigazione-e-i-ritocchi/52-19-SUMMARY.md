---
phase: 52-la-barra-di-navigazione-e-i-ritocchi
plan: 19
subsystem: ui
tags: [safari-ios, zoom, form-controls, door, typography, gap-closure]
requires:
  - phase: 52-14
    provides: "il difetto 1 misurato (scala 1,1436 al tocco su campi a 14 px)"
  - phase: 52-18
    provides: "difetti 2 e 3 chiusi; il tree da cui parte la linea di base"
provides:
  - "campi di testo, select e textarea a 16 px dove Safari zoomerebbe: primitivo sotto md, rete CSS non a strati sotto pointer: coarse"
  - "deroga datata 41-UI-SPEC §7.4, §8.6 e §12 armonizzati"
  - "misure prima/dopo sul simulatore iOS 27.0 in 52-ESITI.md «Chiusura delle lacune»"
  - "laboratorio al commit della correzione, READY"
affects: [52-15]
tech-stack:
  added: []
  patterns: ["regola CSS fuori da @layer come rete sopra le utility di Tailwind 4, dichiarata e commentata"]
key-files:
  created:
    - .planning/phases/52-la-barra-di-navigazione-e-i-ritocchi/52-19-SUMMARY.md
  modified:
    - src/components/ui/Input.tsx
    - src/components/ui/AutocompleteInput.tsx
    - src/app/globals.css
    - .planning/phases/41-shared-primitives-three-tier-layout/41-UI-SPEC.md
    - .planning/phases/52-la-barra-di-navigazione-e-i-ritocchi/52-ESITI.md
key-decisions:
  - "Lo zoom al fuoco si previene con 16 px sui campi, non bloccando la scala (D-41-08 intatto)"
  - "Rete CSS sotto pointer: coarse senza limite di larghezza: su tablet i campi sono a 16 px anche sopra md, costo visivo accettato"
  - "D-52-28 resta: con il fuoco sulla password «Sign In» e' sopra la tastiera, misurato a scala 1"
  - "La ricerca della porta cresce da 46 a 49 px (interlinea relativa di text-sm): accettato, non compensato"
requirements-completed: []
duration: 20min
completed: 2026-09-23
---

# Fase 52 Piano 19: Safari non zooma piu' al tocco sui campi — Summary

**Campi a 16 px dove Safari iOS zoomerebbe (primitivo `text-base md:text-sm` + rete CSS fuori da `@layer` sotto `pointer: coarse`): scala da 1,1436 a 1 su login, ricerca della porta e codice sconto, misurata prima e dopo con la stessa sonda sul simulatore; laboratorio READY al commit.**

## Prestazioni

- **Durata:** circa 20 minuti (17:52Z → 18:12Z)
- **Task:** 3/3
- **File modificati:** 5

## Cosa e' stato fatto

1. **Linea di base** (commit `5eb41168`, senza correzione, 17:54–17:57Z): la sonda
   Appium con tocco nativo sul simulatore iPhone 17e / iOS 27.0, contro
   `npm run dev:lab`, riproduce il difetto — **1,1436** al tocco e dopo il blur su
   email e password del login, ricerca della porta, codice sconto; **1,1427** in
   orizzontale. Controllo di validita' superato: la sonda vede il difetto.
2. **La correzione** (`9b425f85`): `CONTROL` di `Input.tsx` e
   `AutocompleteInput.tsx` a `text-base md:text-sm` (con `min-h-11` intatto e il
   docblock datato); in `globals.css`, subito dopo le regole D-52-06, una regola
   **fuori da ogni `@layer`** sotto `@media (pointer: coarse)` con `font-size: 1rem`
   su input che aprono la tastiera, textarea e select, commentata con le cinque
   scelte del piano. `layout.tsx`, `ScannerClient.tsx` e `PageShell.tsx` invariati;
   nessun `maximum-scale` ne' `user-scalable=no` nel codice. 41-UI-SPEC: §7.4 deroga
   datata, §8.6 stringa aggiornata con rimando, §12 armonizzato in due punti
   (`userScalable` e «Body stays 14px minimum», come chiesto dal controllore).
3. **Dopo la correzione** (18:04–18:06Z): 16 px e **scala 1** al tocco e dopo il
   blur su tutti e sei i campi, `scrollWidth` = larghezza ovunque; alla porta
   «QR Scan» e Alerts a 366 su 390, a tastiera aperta. **P-52-F passo 5**: con il
   fuoco sulla password, password e «Sign In» in vista — D-52-28 `resta`
   confermato. Laboratorio deployato e `READY`.

## Commit dei task

1. **Task 1: linea di base** — `493932d4` (docs)
2. **Task 2: 16 px sui campi, deroga, gate** — `9b425f85` (fix)
3. **Task 3: ri-misura e laboratorio** — `93cfbcc4` (docs, misure dopo) e `39dc0e55` (docs, riga del deploy, locale)

## Verifica

Non esiste un test runner per il prodotto: **nessuna affermazione qui dice che «i
test passano»**. La verifica e':

- `npm run build` exit 0 sul tree di `9b425f85` (l'unico commit successivo prima
  del push tocca solo `52-ESITI.md`);
- `verify:tokens`, `verify:touch-targets`, `verify:conversion`,
  `verify:breakpoints`, `verify:no-viewport-read`: tutti exit 0. Nessun digest
  aggiornato: `verify:conversion` custodisce `PageShell.tsx`, non toccato;
- la misura su Safari simulato, prima e dopo, in `52-ESITI.md` «Chiusura delle
  lacune», con le ore UTC;
- sul laboratorio il CSS servito contiene la regola; nella build di produzione la
  regola e' al livello superiore del foglio, fuori da `@layer`.

**Da fare, umano:** la conferma sull'iPhone del proprietario (iOS 26.7) su
`lab.resonatemotion.com` — login e ricerca della porta.

### Deploy del laboratorio — precondizioni misurate prima del push (18:07Z)

| Controllo | Esito |
|---|---|
| `origin/main` prima | `65e9cc5` |
| `git merge-base --is-ancestor origin/lab main` | si' (avanzamento veloce da `7a79353e`, 19 commit) |
| file sotto `docs/`, `.firecrawl/`, `.env*` nel diff | 0 |
| ref del laboratorio fra le righe aggiunte | 0 |
| token (`sbp_`, `sk_`, `re_`, JWT) fra le righe aggiunte | 0 |
| UUID fra le righe aggiunte | **2 — vedi Deviazioni, punto 3** |

Push `git push origin main:lab` alle 18:07:33Z (`7a79353e..93cfbcc4`); deploy del
ramo `lab`, sha `93cfbcc`, creato 18:07:38Z, **`READY` 18:08:54Z**, alias
`lab.resonatemotion.com` presente (API Vercel senza `teamId`). Controllo esterno:
`/gallery` anonimo → `location: /login?next=%2Fgallery`; `/login` → 200.
`origin/main` dopo: `65e9cc5`, identico.

## Deviazioni dal piano

1. **[Rule 3 - Blocco] Cache di sviluppo con il foglio di stile vecchio.** Il primo
   giro dopo la correzione (18:01–18:02Z) ha trovato la ricerca della porta ancora
   a 14 px e 1,1436: Turbopack serviva il CSS di prima, senza la rete (verificato
   leggendo il foglio servito). Svuotata la cache di sviluppo (`.next/dev`,
   artefatto non versionato) e riavviato il server, la regola c'e' e la corsa buona
   e' delle 18:04–18:06Z. Il giro scartato e' registrato in `52-ESITI.md` perche'
   prova che il primitivo da solo non basta alla porta.
2. **Due differenze dall'atteso nella linea di base**, registrate e non corrette:
   il `select` nativo **non zooma gia' a 14 px** su iOS 27 (menu a comparsa del
   sistema), quindi per lui la misura dice solo «non peggiora»; in orizzontale
   l'iPhone 17e e' largo **750 px, sotto `md`**, non sopra 768 come atteso — il caso
   che motiva la rete senza limite di larghezza qui non si presenta.
3. **UUID fra le righe spinte su `lab`.** I due UUID sono l'**UDID del simulatore
   iPhone 17e**, scritto nel testo di `52-19-PLAN.md` dal commit di pianificazione
   `0a5ff081` (non da questo piano). Non e' un id di database, di persona o di
   serata ne' una credenziale: identifica un dispositivo virtuale su questo Mac.
   Il push l'ha pubblicato con il resto: la precondizione esiste per gli id di
   riga, e questo non lo e'. Toglierlo dalla storia avrebbe voluto dire riscrivere
   commit gia' fatti, e non e' stato fatto. **Questo SUMMARY e `52-ESITI.md` non lo
   riportano.**
4. **La ricerca della porta cresce da 46 a 49 px.** Il piano chiedeva che la rete
   cambiasse solo la dimensione del testo, e cosi' e'; ma in Tailwind 4
   l'interlinea di `text-sm` e' un rapporto (1,25/0,875), quindi segue il testo a
   16 px. Posizione e larghezza invariate (alto 126, largo 342); il bersaglio era
   gia' sopra i 44 px e `verify:touch-targets` resta verde. Non compensato: fissare
   un'interlinea nella rete avrebbe cambiato quella di ogni altro campo.
5. **P-52-F passo 5, dettaglio.** Con il fuoco sulla password l'email non e'
   coperta dalla tastiera ma scorsa sopra il bordo alto (Safari porta la password
   in cima all'area visibile). La condizione di arresto del piano riguardava «Sign
   In», che e' in vista: D-52-28 non si riapre.

## Nota sui requisiti

Il `requirements: [NAV-01]` del frontmatter del piano e' **solo nominale**: il
difetto e' **debito di qualita' emerso dalla corsa di 52-14**, non un requisito
NAV nuovo, e non chiude ne' apre alcun requisito. Per questo nessun requisito
viene marcato completo da questo piano.

## Minacce

T-52-84 (porta fuori schermo) e T-52-85 (zoom a due dita) mitigati e misurati;
T-52-86 (push pubblico) con le precondizioni sopra e la deviazione 3 dichiarata;
T-52-87 (credenziali) — password letta a runtime da `.env.lab.local`, sonda solo
nella scratchpad, nessun indirizzo ne' password in `.planning/`; T-52-88 — la
sonda rifiuta ogni host diverso da `localhost`, `dev:lab` rifiuta la produzione;
T-52-89 accettato (la porta offline prende il CSS nuovo all'aggiornamento del
service worker; in produzione e' 52-15); T-52-90 misurato, non scattato.
Nessuna superficie nuova.

## Stub

Nessuno.

## Prossimo passo

52-15 (l'atto in produzione) puo' partire: difetto 1 chiuso e rimisurato,
D-52-28 confermato, laboratorio al commit. Prima, se possibile, la conferma del
proprietario sul suo iPhone.

## Self-Check: PASSED

File e commit verificati: 52-19-SUMMARY.md, 52-ESITI.md, 41-UI-SPEC.md, Input.tsx, AutocompleteInput.tsx, globals.css; commit 493932d4, 9b425f85, 93cfbcc4, 39dc0e55 presenti.
