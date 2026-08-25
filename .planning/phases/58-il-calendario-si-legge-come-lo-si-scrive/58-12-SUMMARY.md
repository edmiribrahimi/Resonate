---
phase: 58-il-calendario-e-uno-specchio
plan: 12
subsystem: infra
tags: [cron, vercel, ics, supabase, nextjs, observability, secrecy]

requires:
  - phase: 58-04
    provides: "ICS-06 dichiarato su PiecesSection, e il conteggio dei controlli di verify-calendar-surface gia' corretto una volta"
  - phase: 58-10
    provides: "la lettura remota, le quattro categorie di rifiuto e la guardia del feed nello scrittore"
  - phase: 58-11
    provides: "il primo specchio a mano andato a buon fine, e la sorgente registrata"
provides:
  - "Una rotta di cron autenticata che specchia i calendari dichiarati, /api/cron/production-mirror"
  - "Sedici esiti come unione chiusa, con due Record totali: codice HTTP e frase del referto"
  - "La traduzione dichiarata fra i codici d'uscita dello scrittore e i codici HTTP"
  - "MIRRORED_TODAY: quali calendari un processo non presidiato specchia oggi, come Record totale su CALENDAR_KEYS"
  - "Tre stati PER CHIAVE sulla superficie: riuscito a <ora>, fallito a <ora>, non e' ancora girato"
  - "U12 in verify-calendar-surface.mjs: nessun byte di calendario raggiunge una stampa, un rifiuto o un corpo di risposta"
affects: [cron, calendario di produzione, superficie admin/calendar, gate di verifica]

tech-stack:
  added: []
  patterns:
    - "Dichiarazione prima della corsa (Record totale sul vocabolario chiuso) invece di eccezioni dentro una guardia"
    - "Unione chiusa di esiti con due Record totali sopra — codice e frase — sul modello di refund-expired-tokens"
    - "Traduzione esplicita exit code -> HTTP: 0/200, rifiuto/409, fallimento a meta'/500"
    - "Un gate che legge sorgenti FUORI dal proprio scope, con un secondo elenco di percorsi nominati uno per uno"
    - "Un gate che trova il proprio soggetto per dataflow leggero (identificatori legati al testo di una risposta) invece di averlo scritto dentro"

key-files:
  created:
    - src/app/api/cron/production-mirror/route.ts
  modified:
    - vercel.json
    - src/app/(admin)/admin/calendar/ImportRunSummary.tsx
    - src/app/(admin)/admin/(work)/calendar/page.tsx
    - scripts/verify-calendar-surface.mjs
    - .planning/phases/58-il-calendario-si-legge-come-lo-si-scrive/deferred-items.md

key-decisions:
  - "Il cron NON prende istantanea, e la ragione non e' il filesystem serverless: sul solo ramo che arriva a un DELETE l'istantanea sarebbe vuota per costruzione, perche' unattendedMirrorGuard rifiuta a meno che decisioni e legami siano entrambi zero"
  - "Il cron non specchia rsnt oggi: porta una spunta viva, e cancellarla e riscriverla resta un'autorizzazione del proprietario (voce differita 13, punto 1)"
  - "Il cron non specchia mtnlb: nessuna data dichiarata, quindi feed vuoto per mesi — la distinzione e' una dichiarazione, mai un'eccezione dentro la guardia (voce differita 10)"
  - "Nessuna via autorizzata oltre feed_shrank sul percorso del cron: un processo non presidiato non ha nessuno che prenda quella decisione ne' dove registrarla"
  - "Nessuna ri-autorizzazione del progressivo sul percorso del cron, per la stessa ragione"
  - "Un rifiuto risponde 409 e non 200: il confine 2xx e' l'intero canale osservabile di questa rotta"
  - "Il corpo della risposta non nomina la sigla ne' i due progressivi su un renumbering — solo un conteggio: quel corpo finisce in una dashboard, e la meta' venue di una sigla compare anche dentro un titolo"
  - "La pagina conserva DUE letture di production_import_run: quella complessiva ha due consumatori piu' vecchi della chiave e deve continuare a vedere righe senza chiave"
  - "L'orario del cron e' 30 8 * * * UTC = 10:30 a Torino d'estate, fuori da una notte 22->06"

patterns-established:
  - "Record totale sul vocabolario chiuso come punto in cui una decisione DEVE essere presa: una quarta chiave di calendario non compila finche' qualcuno non dichiara se un processo non presidiato puo' cancellarla"
  - "Un gate che, non riconoscendo il proprio soggetto in un file, FALLISCE invece di passare — il verde su niente e' trattato come un difetto"
  - "Due istanti per due stati: un run che ha finito porta l'istante in cui ha finito, uno che non ha finito porta quello in cui e' cominciato"

requirements-completed: [ICS-10, ICS-10b, ICS-06]

duration: ~3h
completed: 2026-08-25
---

# Fase 58 Piano 12: lo specchio gira da solo, e il suo esito si vede — Summary

**Il calendario si aggiorna da un cron autenticato che rifiuta tutto cio' che non sa
spiegare, dichiara in anticipo cosa non specchia invece di allentare una guardia, e
lascia sulla superficie tre stati per chiave che non si confondono — con la prima
difesa di `D-58-07` provata da un controllo che e' stato visto andare rosso quattro
volte.**

## Performance

- **Tasks:** 3 su 3
- **File toccati:** 5 (1 creato, 4 modificati) + `deferred-items.md`
- **Commit:** 3, piu' quello dei metadati

## Accomplishments

### Task 1 — la rotta di cron (`6ac7e57`)

`src/app/api/cron/production-mirror/route.ts`, e `vercel.json` con la sesta voce.

- **Autenticazione identica ai cron esistenti.** `Bearer ${process.env.CRON_SECRET}`,
  la stessa riga di `reconcile-refunds`. Senza segreto: **401**, misurato.
- **Sedici esiti, uno per causa**, con `MIRROR_HTTP` e `MIRROR_REPORT` come `Record`
  **totali** garantiti da `satisfies`. Feed vuoto e feed ristretto sono due membri
  distinti, entrambi non-2xx, e la separazione la porta gia' `guard.ts` — questo file
  non la reinventa.
- **Nessun contatore unico.** `/usr/bin/grep -c "errors" route.ts` → `0`.
- **La traduzione fra i due canali e' scritta nel file**, come tabella: `0`→`200`,
  rifiuto (`refuse`, nulla scritto) →`409`, fallimento a meta' (`failPartway`)→`500`.
  Le categorie sono agganciate una per una allo stesso canale che lo scrittore usa
  per la stessa causa.
- **Il corpo porta conteggi, nomi di esito e la chiave di calendario.** Nessun
  `source_uid`, nessun titolo, nessun indirizzo, nessun host, nessun conteggio per
  serata. Su un renumbering esce **un numero**, non la sigla e i due progressivi che
  lo scrittore puo' permettersi di stampare a un terminale.

### Task 2 — tre stati per chiave sulla superficie (`01ebf51`)

- La pagina legge **una riga per chiave** con tre query — il vocabolario e' chiuso e
  ha tre membri, quindi tre letture sono la risposta esatta. Una lettura delle ultime
  N righe sarebbe un'ipotesi su N, e il calendario caduto fuori dalla finestra
  disegnerebbe in silenzio *«mai specchiato»*.
- **I tre esiti della lettura restano tre**: righe, zero righe, lettura fallita. Il
  terzo si unisce all'unica regione d'allerta della pagina e non diventa mai lo stato
  vuoto.
- **I tre stati del blocco**, e nessuno e' il default di un altro: finito (i
  conteggi, e l'istante in cui **ha finito**), non finito (i conteggi arrivati fin
  li', l'istante in cui **e' cominciato**, badge neutro), mai girato (**una frase e
  nessun conteggio**).
- Le quattro regole del blocco valgono su cio' che si e' aggiunto: nessuno `0` al
  posto di *non abbiamo misurato*, nessun trattino, l'insieme delle non classificate
  alla stessa prominenza, nessuna cifra che sommi i tre ritrovamenti, e **i tipi
  continuano a non avere un campo per un titolo**.
- La chiave di calendario si mostra — e' una sigla di format, pubblica — scritta come
  la scrive il vocabolario, senza trasformazioni che la facciano leggere come una
  sigla da locandina.

### Task 3 — U12, la prima difesa provata (`323e059`)

`scripts/verify-calendar-surface.mjs` passa da undici a dodici controlli.

U12 legge **i due file che tengono in memoria i byte di un calendario** — la rotta e
lo scrittore — e asserisce che nessun valore letto dal corpo della risposta raggiunga
`console.*`, `say(`, `refuse(`, `failPartway(`, `stop(` o `NextResponse.json(`.

- **Trova il proprio soggetto** invece di averlo scritto dentro: raccoglie gli
  identificatori legati al testo di una risposta e verifica quelli. Un rename non lo
  rende verde.
- **Due forme**, perche' perdono in due modi: interpolazione in un template, e
  passaggio come argomento (intero, per membro o a fette).
- **Un file senza identificatore riconosciuto e' un fallimento**, non un passaggio.
- **I letterali sono assemblati**, la disciplina di U9: questo script sta in
  `scripts/`, e uno dei due file che legge sta li' accanto.
- **U12 non usa lo scope degli altri undici** e porta il suo elenco di due percorsi
  nominati uno per uno. Due elenchi separati, perche' uno allargato per sbaglio
  applicherebbe undici regole di rendering a un cron e a uno script.
- La prosa del conteggio e' aggiornata **insieme all'array** — dodici, e la
  provenienza dei due che non sono del §15.

## Verification

**Non esiste un test runner per il prodotto** (`CLAUDE.md`, guardrail 1). Nessuna
riga sotto dice *«i test passano»*: sono misure prese a mano e gate del repo.

### Eseguito contro il build di produzione

| prova | esito |
|---|---|
| richiesta senza header di autorizzazione | **401**, `{"error":"Unauthorized"}` |
| richiesta con `Bearer` sbagliato | **401** |
| richiesta con il segreto | **409**: `rsnt` e `mtnlb` `not_mirrored_by_declaration` con la loro ragione, `rmdb` `source_not_registered` |
| sorgente registrata con schema `http` | `source_address_invalid` — **e il valore non e' stampato** |
| sorgente `webcal://` su un host che non risolve | normalizzata a `https`, poi `source_unreachable` |
| l'host nel log di runtime | **zero occorrenze**: l'unica riga e' `[production_mirror.source_unreachable] calendar=rmdb {}` |

Il server e' stato avviato con credenziali fittizie e un `CRON_SECRET` di
laboratorio, su una porta libera; il worktree non ha `.env.local` (e' ignorato e vive
nel checkout principale), quindi **nessuna credenziale vera e' stata usata e nessuna
riga di produzione e' stata toccata**.

### Gate

- `npm run build` → **0**, e `/api/cron/production-mirror` compare nella mappa delle
  rotte
- `npx tsc --noEmit` → **0**, con la rotta dentro `--listFiles`
- `npm run verify:routes` → **0** (28 pagine, 27 pattern, 75 literal)
- `npm run verify:calendar-surface` → **0**, **dodici** verdi, **U2** e **U11**
  compresi
- `/usr/bin/grep -c "errors" src/app/api/cron/production-mirror/route.ts` → **0**
- `/usr/bin/grep -cE '(input type=|type="file"|onDrop|Dropzone)' ImportRunSummary.tsx`
  → **0**

### Prova per mutazione di U12 — quattro, e la prima ha fatto scattare l'assert

Ogni mutazione e' stata **asserita sul disco prima** di leggerne l'esito, ed e'
servito: la prima sostituzione `perl` aveva interpolato `${feedBody}` come variabile
**perl**, e la mutazione era arrivata **senza l'identificatore**. Leggerne l'esito
avrebbe certificato come vivo un controllo che non aveva niente da trovare — la
direzione di errore che `ai-engineering.md` chiama la peggiore. Rifatta con il
dollaro protetto.

| mutazione | esito |
|---|---|
| `console.error(\`M1 ${feedBody}\`)` nella rotta | **ROSSO** — `route.ts:627 — a calendar's bytes interpolated into console.error` |
| `console.error("M2", feedBody.slice(0, 80))` nella rotta | **ROSSO** — `route.ts:627 — a calendar's bytes handed to console.error` |
| `say(\`M3 ${body}\`)` nello scrittore | **ROSSO** — `import-production-calendar.mjs:991 — interpolated into say` |
| la lettura nascosta dietro un helper | **ROSSO** — ramo *«no value read from a response body was recognised here»* |

Entrambi i file mutati sono stati **ripristinati byte per byte**: `shasum -a 256`
identico a quello preso prima della prima mutazione
(`a0d08b4c…` per la rotta, `e340da59…` per lo scrittore).

### Procedura manuale, da eseguire quando la superficie sara' raggiungibile

La superficie non e' raggiungibile da chi ha eseguito (voce differita 11), quindi il
blocco **non e' stato guardato con gli occhi**. La procedura e' scritta invece che
evocata:

1. Entrare in `/admin/calendar` con un ruolo che porta `PRODUCTION_CALENDAR_MANAGE`.
2. In fondo alla lista deve comparire **«Last mirror, by calendar»** con **tre**
   sezioni, nell'ordine `rsnt · rmdb · mtnlb`.
3. Su `rsnt` e `rmdb` — che hanno corse registrate — devono comparire i conteggi e
   **un istante**. Su `mtnlb`, che non ne ha, deve comparire **la frase** e **nessun
   conteggio**: se compaiono degli zeri, il difetto e' quello che questo blocco esiste
   per non produrre.
4. Nessun controllo di caricamento, in nessuna delle tre sezioni.
5. La frase in coda sul limite dei rifiuti deve essere visibile senza aprire nulla.

## Deviations from Plan

### Auto-fixed / decisi in esecuzione

**1. [Rule 1 — il piano contava quattro cron, ne esistono cinque]**
- **Trovato durante:** Task 1
- **Il fatto:** il piano dice *«le quattro voci esistenti»* e chiede che `vercel.json`
  ne porti **cinque**. Sul disco ce n'erano gia' **cinque**
  (`reconcile-email-deliveries` compreso), quindi ora sono **sei**.
- **Deciso:** vince il disco, come *il calendario batte il tracker* applicato a un
  file di configurazione. Il criterio sostanziale del piano — *nessuna sovrapposizione
  di orario* — e' rispettato: `30 8` UTC e' libero fra `0 8` e `0 9`.

**2. [Rule 2 — l'orario del cron dichiara la sua ora locale, e `vercel.json` non puo']**
- **Trovato durante:** Task 1
- **Il fatto:** `time-and-scheduling.md` chiede che ogni modifica agli orari dichiari
  l'ora locale corrispondente e verifichi che non cada dentro una serata. JSON non
  ammette commenti.
- **Fatto:** la dichiarazione sta nella rotta, accanto alle sue altre configurazioni:
  `30 8 * * *` UTC = **10:30 a Torino d'estate, 09:30 d'inverno**, quattro ore e mezza
  dopo la fine piu' tarda possibile di una notte.

**3. [Rule 2 — il cron non prende istantanea, e la ragione va scritta]**
- **Trovato durante:** Task 1
- **Il fatto:** lo scrittore dichiara che *uno specchio che non puo' prendere la sua
  istantanea non parte*, e scrive quel file in una directory ignorata di `docs/`. Una
  funzione serverless non ha quel percorso, e non avrebbe comunque un filesystem che
  sopravvive alla chiamata.
- **Deciso, e il ragionamento e' nel file:** sul **solo ramo che arriva a un
  `DELETE`** l'istantanea sarebbe **vuota per costruzione**, perche'
  `unattendedMirrorGuard` gira prima e rifiuta se decisioni o legami sono `> 0`. Cio'
  che un'istantanea esiste per restituire sono esattamente quelle due eccezioni di
  stato; tutto il resto lo riscrive il feed alla corsa successiva. **Non e' una
  guardia allentata: e' la guardia che rende l'assenza corretta.**

**4. [Rule 2 — nessuna via autorizzata sul percorso non presidiato]**
- **Trovato durante:** Task 1
- **Il fatto:** lo scrittore ha `--accept-shrink` e `--reauthorise-renumbering`, ed
  entrambi registrano l'uso in un transcript che una persona legge.
- **Deciso:** **nessuno dei due esiste qui.** Un processo che nessuno guarda non ha
  chi prenda quella decisione ne' dove registrarla, quindi `feed_shrank` e
  `progressivo_changed` sono rifiuti secchi e aspettano una persona. E' la direzione
  che costa una serata a qualcuno invece di un calendario che nessuno rimette a posto.

**5. [Rule 2 — il renumbering non nomina la notte nel corpo della risposta]**
- **Trovato durante:** Task 1
- **Il fatto:** lo scrittore stampa la meta' format della sigla e i due progressivi,
  e la sua stessa prosa registra che stampare la sigla **intera** aveva fatto andare
  rosso il suo audit su un token: la meta' venue di una sigla compare anche dentro un
  titolo.
- **Fatto:** il corpo della risposta porta **un conteggio**. La differenza fra i due
  chiamanti e' il destinatario — un terminale che una persona sta guardando contro una
  dashboard in cui il corpo viene incollato.

### Le tre voci differite assegnate a questo piano

**Voce 10 — `mtnlb` rifiuta a ogni corsa. CHIUSA.**
`MIRRORED_TODAY` e' un `Record` **totale** su `CALENDAR_KEYS`: per ogni chiave dice
se un processo non presidiato la specchia, e quando non la specchia dice **perche'**,
con un vocabolario chiuso di due ragioni. `mtnlb` porta `no_declared_dates`: non viene
mai richiesta, mai letta, mai pianificata, quindi `mirrorGuard` **non viene
interrogato su di essa e non e' stato allentato di una riga**. Nessuna chiave esclusa
dentro la guardia, nessun feed vuoto tollerato. Il suo esito vale `200`, quindi **la
notte in cui una chiave specchiata rifiutera' per una ragione vera quel rosso sara'
l'unico rosso** — che era il danno concreto descritto dalla voce.
Un `Record` totale e non una lista: una lista avrebbe risposto per le chiavi di oggi
e taciuto sulla prossima.

**Voce 3 — lo strumento di rientro e la guardia esistono ma non sono esercitati.
La guardia e' ora SUL PERCORSO DEL CRON, e li' e' portante. NON CHIUSA.**
Il cron **e'** la corsa non presidiata per costruzione: una funzione serverless non ha
un terminale di controllo e non puo' procurarselo — che e' la forma onesta
dell'evidenza che `runSupervision` legge, e la ragione per cui la voce 20 e' un
ritrovamento sul terminale di una persona e non su questo chiamante.
`unattendedMirrorGuard` gira dopo il piano e prima di qualunque cancellazione, con i
conteggi presi da `plan.decisionsToRestore` e `plan.linksToRestore` — la stessa lista
che lo scrittore rimette, mai una seconda contata sul posto. **Ed e' cio' che rende
corretta l'assenza dell'istantanea** (deviazione 3).
**Cosa resta aperto:** `R15` non e' esercitato e `MIRROR_RESTORE_PATH_VERIFIED` resta
`false`. Esercitarlo richiede un database davanti e **un'autorizzazione datata a
scrivere in produzione**, che non esiste, e simularlo sarebbe la cosa peggiore che
quel gate possa fare. **Differita con ragione, non dimenticata.**

**Voce 13, punto 1 — cancellare e riscrivere `rsnt` con una spunta viva resta
un'autorizzazione del proprietario. RISPETTATA.**
`MIRRORED_TODAY` trattiene `rsnt` con la ragione `state_needs_a_person`, **per
dichiarazione**, prima della corsa. La dichiarazione **non sostituisce** la guardia e
viceversa: la prima impedisce che il tentativo venga fatto, la seconda rende sicuro il
tentativo quando viene fatto — su `rmdb` gira comunque, a ogni corsa, e rifiuterebbe
se domani nascesse una spunta li'.
Smette di valere quando `MIRROR_RESTORE_PATH_VERIFIED` diventa `true`, **oppure** con
un'autorizzazione datata del proprietario. Sono due decisioni diverse, e nessuna e'
un ritocco.

Le tre voci sono state annotate in `deferred-items.md` con la data e la forma della
chiusura.

## Deferred Issues

- **`verify:touch-targets` resta rosso** su due elementi di
  `src/app/(public)/events/[slug]/menu/GuestTokenDisplay.tsx` — una superficie del bar
  che questo piano non tocca. E' la **voce differita 12**, gia' registrata come
  precedente a questo lavoro. Fuori perimetro: non riparata, non allargato il gate.
- **Tre gate di `npm run verify` si RIFIUTANO** (`verify:capabilities`,
  `verify:scan-legibility`, `verify:section-export`) perche' il worktree non ha
  credenziali: `.env.local` e' ignorato e vive nel checkout principale. Un rifiuto non
  e' un fallimento **e non e' un passaggio**: quei tre non hanno misurato niente, e va
  detto invece di contarli fra i verdi.
- **Il primo giro vero del cron non e' stato fatto**, ed e' l'ordine di spedizione che
  il piano stesso prescrive: il codice deve essere in produzione, il primo specchio a
  mano deve essere andato a buon fine (lo e', piano 58-11), e la **prima richiesta la
  si fa di persona**, in un giorno senza serata. Finche' `PRODUCTION_CALENDAR_FEED_RMDB`
  non e' registrata sulla piattaforma, la prima corsa rispondera' `409
  source_not_registered` — che e' il comportamento corretto e non un difetto.
- **Il blocco della superficie non e' stato guardato con gli occhi** (voce differita
  11). La procedura manuale e' scritta sopra, passo per passo, invece che evocata.

## Threat Flags

Nessuna superficie di sicurezza nuova fuori dal `<threat_model>` del piano. Le due
cose che vale la pena rileggere accanto al registro:

| Flag | File | Descrizione |
|------|------|-------------|
| threat_flag: new-network-egress | `src/app/api/cron/production-mirror/route.ts` | Una richiesta uscente da un server verso un indirizzo registrato in variabile d'ambiente. E' il transito che `D-58-07` autorizza sotto cinque difese, ed e' **la meta' di `D-44-26` che cade**. La difesa 1 e' ora verificata da **U12**; le altre quattro sono agganciate al codice e nominate nel docblock. |
| threat_flag: unauthenticated-surface-check | `src/app/api/cron/production-mirror/route.ts` | Un endpoint pubblico che, raggiungibile senza segreto, cancellerebbe e riscriverebbe il calendario. `T-58-12-01` mitigata: **401 verificato con una richiesta**, senza header e con header sbagliato. |

## Self-Check: PASSED

File dichiarati come creati o modificati, verificati sul disco:

- `FOUND: src/app/api/cron/production-mirror/route.ts`
- `FOUND: vercel.json`
- `FOUND: src/app/(admin)/admin/calendar/ImportRunSummary.tsx`
- `FOUND: src/app/(admin)/admin/(work)/calendar/page.tsx`
- `FOUND: scripts/verify-calendar-surface.mjs`

Commit dichiarati, verificati in `git log`:

- `FOUND: 6ac7e57` — la rotta di cron e `vercel.json`
- `FOUND: 01ebf51` — i tre stati per chiave sulla superficie
- `FOUND: 323e059` — U12 e la prosa del conteggio
