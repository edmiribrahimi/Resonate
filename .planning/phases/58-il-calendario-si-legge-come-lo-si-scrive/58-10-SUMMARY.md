---
phase: 58-il-calendario-si-legge-come-lo-si-scrive
plan: 10
subsystem: production-calendar
tags: [ics, sorgente-remota, guardia-feed, segreti, timeout, categorie-errore, vocabolario-chiuso]

# Dependency graph
requires:
  - phase: 58-il-calendario-si-legge-come-lo-si-scrive
    provides: "58-01 — il contratto dell'ordine dei rifiuti e le sette asserzioni del predicato, scritte prima del codice"
  - phase: 58-il-calendario-si-legge-come-lo-si-scrive
    provides: "58-09 — lo scrittore come specchio, l'istantanea, il gate 2 che asserisce la sorgente registrata senza ancora leggerla"
  - phase: 58-il-calendario-si-legge-come-lo-si-scrive
    provides: "58-07 — calendar_key su quattro tabelle e CALENDAR_KEYS come vocabolario chiuso"
provides:
  - "src/lib/production/ics/guard.ts — il predicato puro della guardia del feed, tre esiti chiusi, soglia esportata"
  - "La soglia dello specchio come POLITICA dichiarata: 0.75, scelta e non misurata, con il verso dell'errore e la condizione di revisione scritti accanto"
  - "La sorgente e' un indirizzo registrato in variabile d'ambiente, ed e' l'UNICA via: --file e --docs-dir sono usciti dal percorso di import"
  - "L'indirizzo, il suo host e la sua forma normalizzata sono segreti registrati prima di ogni riga stampata del blocco"
  - "La lettura remota con timeout esplicito, cache no-store, corpo che non lascia la funzione e non tocca il disco"
  - "Quattro categorie d'errore di lettura piu' due di guardia, mai un contatore unico"
  - "--accept-shrink: l'uscita autorizzata dalla guardia, che copre solo il feed rimpicciolito e resta scritta nel referto"
  - "verify:mirror-guards registrato in package.json e nella lista OFFLINE dell'aggregato, verde su V0..V7 e R1..R3"
affects: [58-11, 58-12]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Una soglia senza dati sotto si dichiara scelta, con il verso in cui sbaglia e l'evento che la rivedra' — mai presentata come misura"
    - "L'uscita autorizzata da una guardia non e' un parametro del predicato: un predicato che risponde ok perche' glielo hanno chiesto ha smesso di misurare"
    - "Una guardia riceve conteggi, mai liste: cio' che non tiene in mano non puo' finire in un messaggio d'errore"
    - "Un riscrittura di schema si fa sulla stringa e si ri-parsifica: assegnare .protocol a uno schema non-speciale e' ignorato in silenzio"
    - "Una risposta 2xx che non e' un calendario si distingue da un calendario vuoto: le due mandano a guardare posti diversi"
    - "Il corpo di una risposta esterna si legge dentro una funzione e non ne esce: cosi' «nessuna persistenza» e' una proprieta' dello scope, non una promessa"
    - "Chiudere una seconda strada significa toglierla, non documentarla come sconsigliata"

key-files:
  created:
    - src/lib/production/ics/guard.ts
  modified:
    - src/lib/production/ics/index.ts
    - scripts/import-production-calendar.mjs
    - scripts/verify-ics-reachable.mjs
    - scripts/verify-all.mjs
    - package.json

key-decisions:
  - "La soglia e' 0.75 e non 0.5: il criterio di validazione della fase chiede che un feed DIMEZZATO rifiuti, e con 0.5 un feed dimezzato cade esattamente sul margine ammesso"
  - "L'autorizzazione a superare la guardia sta nel chiamante, non nel predicato: il modulo dice sempre cio' che vede, e chi ha l'argomento decide se cio' che vede e' un rifiuto o un'accettazione — e lo scrive"
  - "MIRROR_EMPTY_IS_NEVER_AUTHORISED e' un valore esportato e non una frase: una regola lasciata solo in prosa e' a una modifica distratta da un'autorizzazione che svuota un calendario"
  - "feed_empty e feed_shrank restano DUE categorie: mandano a guardare posti diversi e solo una delle due e' autorizzabile"
  - "Le categorie di lettura sono quattro e non tre: 401/403/404 (l'indirizzo non concede piu') e ogni altro non-2xx (il fornitore rifiuta o cade) sono separate, perche' la prima si ripara ri-registrando la variabile e la seconda no"
  - "Il conteggio precedente si legge dal registro delle corse, non contando le righe nelle tabelle specchiate: contarle direbbe cosa c'e' ADESSO, cioe' proprio cio' che una corsa precedente interrotta avrebbe reso sbagliato"
  - "Un registro illeggibile e' un RIFIUTO e non «prima corsa»: una prima corsa e' ammessa a scrivere, e non e' una cosa da dedurre da un errore"
  - "webcal: si accetta e si riscrive; file: si rifiuta e non si segue — seguirlo riaprirebbe la seconda strada che ICS-09 ha chiuso"
  - "verify:mirror-guards sta in OFFLINE e non in NEEDS_MATERIAL: non apre materiale, non chiede credenziali, e non ne passa nessuna ai figli"

requirements-completed: [ICS-09, ICS-10]

# Metrics
duration: 70min
completed: 2026-08-20
---

# Fase 58 Piano 10: La sorgente e' un indirizzo, e la guardia e' la ragione per cui il cron e' accettabile — Summary

**Lo specchio legge da un indirizzo che non e' scritto da nessuna parte tranne
che in una variabile d'ambiente, si ferma quando cio' che arriva e' vuoto o si e'
ristretto sotto una soglia dichiarata come politica, e sa dire in quale dei sei
modi ha fallito senza ripetere una sola parola di cio' che ha letto.**

## Performance

- **Duration:** ~70 min
- **Tasks:** 2 / 2
- **Files:** 1 creato, 5 modificati
- **`import-production-calendar.mjs`:** 2.301 → 2.638 righe
- **`src/lib/production/ics/`:** 7 → 8 moduli

## Task Commits

1. **Task 1: il predicato puro della guardia** — `aa14f37` (feat)
2. **Task 2: la sorgente e' un indirizzo, e il link e' un segreto** — `83a6ecc` (feat)

---

## La soglia, e perche' non e' quella ovvia

Il piano chiede una soglia **dichiarata come politica** e vieta di fingere una
misura. Il docblock di `guard.ts` scrive tre cose accanto al numero: che e'
**scelto e non misurato** (nessun feed di questo progetto si e' mai ristretto,
quindi non c'e' niente da misurare), **in quale verso sbaglia** (rifiuta di piu',
mai di meno — un rifiuto costa una serata a una persona, un'accettazione costa un
calendario che nessuno rimette a posto), e **quale evento la rivedra'** (il primo
scarto vero e voluto che venga rifiutato: quello porta la distribuzione che oggi
manca).

**Il valore e' `0.75`, e non e' arbitrario nella scelta della cifra.** Il
criterio di validazione della fase dice, testualmente, *prova con feed a zero
eventi e con feed **dimezzato** → uscita 2*. Con una soglia a `0.5` un feed
dimezzato cade **esattamente sul margine ammesso** — `Math.ceil(100 × 0.5) = 50`,
e 50 e' ammesso — quindi passerebbe. `0.75` e' il primo valore ragionevole che
soddisfa il criterio scritto. Questo e' un vincolo derivato dalla fase, non una
stima di quanto un calendario si muove: la distinzione e' scritta nel modulo.

## L'uscita autorizzata non e' un parametro del predicato

Il piano chiede che uno scarto voluto passi da un argomento esplicito e che
**l'uso di quell'argomento si registri nel referto**. La forma scelta tiene le
due cose separate:

- `mirrorGuard()` **dice sempre cio' che vede**. Non ha un parametro di
  autorizzazione, perche' un predicato che rispondesse `ok` su richiesta avrebbe
  smesso di misurare, e il referto porterebbe un verdetto invece di
  un'osservazione.
- `--accept-shrink` vive nell'importatore. Quando c'e' e la guardia dice
  `feed_shrank`, la corsa procede e **stampa la riga che dice che qualcuno ha
  deciso**. E' la stessa forma della riautorizzazione del progressivo di 58-09.
- L'autorizzazione copre **solo** `feed_shrank`. Il fatto e' esportato come
  valore (`MIRROR_EMPTY_IS_NEVER_AUTHORISED`) e non come frase: una regola
  lasciata in prosa e' a una modifica distratta da un'autorizzazione che svuota
  un calendario.

## Le cinque difese di `D-58-07`, e dove ciascuna vive

| Difesa | Dove | Come si vede |
|---|---|---|
| **1** — il corpo non si stampa mai | `readRegisteredFeed()` | il corpo e' letto **dentro** la funzione e non ne esce: quello che torna e' il parse, i byte e le righe. Nessun rifiuto del percorso interpola un carattere del corpo — il rifiuto del lettore porta il **codice** del lettore, che e' una parola di vocabolario chiuso, non una citazione |
| **2** — nessuna persistenza | idem | richiesta con `cache: "no-store"` e intestazione corrispondente; `readFileSync`/`readdirSync`/`statSync` sono **usciti** dall'import di `node:fs`, e la riga che li toglieva porta la ragione |
| **3** — categorie distinte | idem + guardia | sei categorie, mai un contatore unico. Vedi la tabella sotto |
| **4** — il link e' un segreto, host compreso | gate 2 | `registerSecret` su **tre** stringhe: il valore registrato, l'host, e la forma normalizzata che la richiesta usa davvero |
| **5** — nessun controllo di caricamento | non toccato | e' la meta' di `D-44-26` che **non cade**: `44-UI-SPEC.md` §11.3 e il controllo **U2** di `verify-calendar-surface.mjs` restano validi e questo piano non li ha sfiorati |

### Le categorie, e perche' sono sei e non quattro

Il piano ne chiede quattro — irraggiungibile, non autorizzato, non un calendario,
troppo piccolo. Ne esistono **sei**, e i due allargamenti vanno entrambi nel verso
della distinzione, mai in quello opposto:

| Categoria | Quando | Dove manda a guardare |
|---|---|---|
| `feed_unreachable` | niente ha risposto: rete, risoluzione del nome, o il timeout | la rete |
| `feed_unauthorised` | ha risposto `401`, `403` o `404` | **la variabile**: e' cosi' che si vede una ri-pubblicazione, il vecchio indirizzo smette di funzionare |
| `feed_unavailable` | ha risposto con qualunque altro non-2xx | **il fornitore**: un `503` e un `403` non si riparano nello stesso posto, e una sola etichetta manderebbe meta' dei lettori nel posto sbagliato |
| `feed_not_a_calendar` | `2xx` il cui corpo non e' un calendario leggibile | l'indirizzo |
| `feed_empty` | zero voci in arrivo | **l'export** |
| `feed_shrank` | sotto la soglia dichiarata | il calendario, e la decisione di chi lo tiene |

C'e' anche `bad_feed_source` (la variabile e' impostata ma non e' un indirizzo, o
porta uno schema che questa corsa non legge) e `register_unreadable` (il registro
delle corse non si legge, quindi la guardia **non e' applicabile** — ed e' un
rifiuto, non una prima corsa).

## Cosa e' stato misurato, e cosa no

**Provato eseguendo, con uscita e categoria lette dal processo:**

| Caso | Uscita | Categoria |
|---|---|---|
| `--apply --calendar rsnt` senza sorgente registrata | `2` | `missing_feed_source` — e il messaggio nomina **la variabile**, mai un valore |
| variabile impostata a qualcosa che non e' un indirizzo | `2` | `bad_feed_source` |
| variabile con schema di file locale | `2` | `bad_feed_source` — rifiutato, non seguito |
| indirizzo con schema di sottoscrizione, credenziali assenti | `2` | `missing_credential` — **conferma l'ordine**: sorgente prima, credenziali dopo |
| host che non risolve | `2` | `feed_unreachable`, con `TypeError / ENOTFOUND` e nessun indirizzo stampato |
| indirizzo che risponde `404` | `2` | `feed_unauthorised` |
| indirizzo che risponde `200` con una pagina che non e' un calendario | `2` | `feed_not_a_calendar` |

**Provato per mutazione:** `mirrorGuard` con `<` cambiato in `<=` fa andare rosso
**solo** `V5`, il caso esattamente al margine — cioe' il gate misura davvero il
verso della soglia, e non la sola presenza della funzione. Ripristinato.

**NON misurato, e dichiarato invece che simulato:** l'applicazione della guardia
**dentro** l'importatore. Il conteggio precedente si legge dal registro delle
corse, quindi dal database: come `R4`, non e' esercitabile senza credenziali
vere, e un caso finto che passa farebbe credere presidiata una guardia che non lo
e'. Il predicato e' verde su sette casi; il **cablaggio** del predicato lo vedra'
la prima corsa vera, che e' il piano **58-11**, sorvegliata.

**Nessun `--apply` e' stato eseguito da questo piano.** Nessuna riga e' stata
scritta in produzione: le corse di prova sopra hanno tutte rifiutato prima di
qualunque scrittura, e cinque di esse contro credenziali finte che non
raggiungono nessun database.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] La riscrittura dello schema di sottoscrizione non faceva nulla**

- **Trovato durante:** Task 2, provando un indirizzo con schema di sottoscrizione
- **Problema:** la prima stesura assegnava `parsed.protocol = "https:"` sull'oggetto
  gia' analizzato. Lo standard delle URL **ignora in silenzio** un'assegnazione di
  schema quando quello di partenza non e' fra quelli che chiama *speciali*: il
  valore non cambia, l'assegnazione sembra riuscita, e il controllo tre righe
  sotto rifiutava un indirizzo **appena riparato**. Misurato rosso su un indirizzo
  perfettamente valido.
- **Correzione:** la riscrittura avviene sulla **stringa**, ancorata all'inizio, e
  l'indirizzo viene ri-analizzato. Il paragrafo accanto racconta il caso, perche'
  una riparazione che fallisce senza dirlo e' il fallimento silenzioso che questo
  progetto continua a registrare.
- **File:** `scripts/import-production-calendar.mjs`
- **Commit:** `83a6ecc`

**2. [Rule 2 - Funzionalita' critica mancante] Una pagina qualunque con `200` passava per un calendario vuoto**

- **Trovato durante:** Task 2, provando un indirizzo che risponde `200` con HTML
- **Problema:** il lettore condiviso rifiuta **solo** sui due limiti di
  dimensione. Su una pagina che non e' un calendario torna senza rifiuto e con
  **zero voci** — e la corsa si sarebbe fermata un gate piu' in la', come
  `feed_empty`. E' la categoria sbagliata, ed e' esattamente il fallimento contro
  cui esiste la difesa 3: `feed_empty` manda a guardare l'export, mentre cio' che
  e' successo e' che l'indirizzo ha risposto `200` con la pagina di qualcun altro
  — un muro di accesso, un portale, la pagina d'errore di un fornitore. Sono due
  riparazioni diverse.
- **Correzione:** il controllo della busta del calendario e' fatto **prima** del
  lettore, con una parola chiave del formato — non materiale — e produce
  `feed_not_a_calendar`. Verificato: la stessa prova ora risponde con la categoria
  giusta.
- **File:** `scripts/import-production-calendar.mjs`
- **Commit:** `83a6ecc`

**3. [Rule 1 - Prosa diventata falsa] Tre blocchi di commento descrivevano un mondo che non esiste piu'**

- L'intestazione dichiarava che il calendario **non transita mai da un server**
  (`D-44-26` intera). Riscritta: **meta'** e' caduta il 2026-08-20 con `D-58-07`,
  meta' no, ed entrambe le meta' sono nominate.
- Il commento del client di servizio giustificava la meta' *nessun input non
  fidato* con *«l'unico input e' un file sulla macchina che tiene la chiave»*. Da
  oggi l'input arriva **dalla rete** e il corpo lo scrive qualcun altro: il
  paragrafo dice cosa risponde adesso a quella meta' — il contenuto che arriva da
  un indirizzo e' **dato, mai istruzione**, lo scopo della cancellazione viene da
  un **argomento** e mai dal corpo, e la guardia decide su un **conteggio**.
- `verify-ics-reachable.mjs` diceva che `MIRROR_DELETION_ORDER` e
  `MIRRORED_TABLES` *«li consumera' il piano 58-09»*. Il piano 58-09 e' passato e
  li consuma — ma **dentro l'oggetto che il riconciliatore restituisce**, mai per
  nome dal barrel. La ragione per cui restano fuori dall'elenco e' cambiata, ed e'
  scritta.
- **Commit:** `83a6ecc`

### Allargamenti dichiarati

**Sei categorie invece di quattro.** Vedi la tabella sopra. Entrambi gli
allargamenti — `feed_unavailable` staccato da `feed_unauthorised`, e
`feed_empty`/`feed_shrank` tenuti separati — vanno **verso** la distinzione. Il
criterio del piano, *«non esiste un contatore unico `errors`»*, e' soddisfatto a
maggior ragione.

## Un fatto sull'ordine, misurato e non dedotto

Il piano chiede che link e host siano registrati **prima del primo `say()`**.
Cio' che e' vero, e vale la pena scriverlo esattamente: le due registrazioni
avvengono prima della **prima riga di quel blocco**, e le righe stampate prima
sono letterali fissi (l'intestazione, la modalita', la chiave di calendario) che
non toccano la sorgente. La registrazione non puo' avvenire piu' in alto senza
rompere il contratto dell'ordine: il nome della variabile **deriva dalla chiave di
calendario**, che il passo 2 deve aver gia' validato. La garanzia effettiva e'
quella che il file dichiara — ogni stringa stampata passa da `redact()`, e la
lista e' piena prima che qualunque riga possa portare l'indirizzo.

## Cosa un verde NON dice

- **Non dice che lo specchio sia sicuro.** `verify:mirror-guards` dice che
  **queste strade non portano a una scrittura**. Il ripristino (`P-58-C`) e' altra
  cosa e resta con il suo buco dichiarato: il passo 5 non ha ancora uno strumento
  (voce 3 di `deferred-items.md`), e deve esistere **prima** del primo `--apply`,
  che e' 58-11.
- **Non dice che la guardia scatti in produzione.** Il predicato e' misurato; il
  suo cablaggio no, per la ragione scritta sopra.
- **Non ci sono test**, qui come in tutto il repository. La verifica e' `npm run
  build`, i gate sintetici, e le corse di prova elencate sopra con la loro uscita
  e la loro categoria.

## Stato dei gate

| Comando | Esito |
|---|---|
| `npm run verify:mirror-guards` | `0` — V0..V7 e R1..R3 verdi, R4 dichiarato rimandato a `P-58-B` |
| `npm run verify:ics-reachable` | `0` — 8 moduli, 23 simboli |
| `npm run build` | `0` |
| `npm run verify` | il gate nuovo e' **fra gli eseguiti** e passa (`verify:mirror-guards 0 passed`) |

⚠ **`npm run verify` resta rosso su `verify:touch-targets`, ed e' preesistente.**
Misurato **prima** di questo piano sul commit di base della fase e **dopo**: nei
due casi la coda dell'aggregato e' identica — *VERIFY_FAIL — 1:
verify:touch-targets, AND 3 refused*. Fuori perimetro, non toccato.

## Threat Flags

Nessuna superficie nuova oltre a quelle gia' nel registro del piano. La lettura
remota e' la superficie che il registro descrive, ed e' coperta da `T-58-10-01`
… `T-58-10-06`.

⚠ **Una nota di dominio che il piano non chiedeva ma che vale scritta.** Da questo
commit esiste un percorso per cui **contenuto scritto fuori dal progetto entra nel
prodotto**, e quel contenuto porta indirizzi di sedi. Non anticipa una
rivelazione — nessuna tabella toccata da questo percorso alimenta la mail del
venue, e `venue_reveal_sent` non e' fra le colonne che questo script scrive — ma
la distanza fra le due cose e' diminuita di un passo, e la difesa che la tiene
aperta e' la stessa che tiene il corpo fuori dal referto. Il piano **58-12** deve
verificarla **sul sorgente**, non dichiararla.

## Self-Check: PASSED

- `src/lib/production/ics/guard.ts` — FOUND
- `scripts/import-production-calendar.mjs` — FOUND
- `scripts/verify-all.mjs` — FOUND
- `scripts/verify-ics-reachable.mjs` — FOUND
- commit `aa14f37` — FOUND
- commit `83a6ecc` — FOUND
