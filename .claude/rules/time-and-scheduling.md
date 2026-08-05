---
paths:
  - "src/utils/formatTime.ts"
  - "src/utils/datetime.ts"
  - "src/app/api/cron/**"
  - "vercel.json"
---

# Time & Scheduling — Operational Gates

## Before Touching

date, orari, finestre di un cron, promemoria, scadenze, conteggi per giorno,
qualunque confronto fra "adesso" e l'orario di una serata
-> stabilire **in quale fuso** sta ogni valore: il dato in tabella, il runtime
che lo legge, e l'essere umano che lo leggera'.

## Perche' questo dominio esiste qui

re:sonate e' un progetto **torinese** che gira su un runtime **in UTC**, e le
sue serate **attraversano la mezzanotte**: `RSNT` va 22:00 → 06:00. Nessuna di
queste tre cose e' un dettaglio di formattazione.

**CORRETTO il 2026-08-05.** Il fuso ora e' dichiarato in un posto solo —
`src/utils/datetime.ts`, `EVENT_TIME_ZONE = "Europe/Rome"` — e tutti e dieci i
punti che confrontavano una serata con "adesso" passano da li':
`partyStartInstant()` per l'inizio, `menuCloseInstant()` per la chiusura del
menu (che incapsula anche la regola *chiusura prima di mezzogiorno = giorno
successivo*, prima ripetuta in cinque varianti), `zonedDateString()` per il
giorno di Torino.

**Il difetto che c'era, e che questo modulo esiste per non far tornare:**

- `src/app/api/cron/venue-reveal/route.ts:36` e
  `src/app/api/cron/event-reminders/route.ts:36` costruiscono l'orario della
  serata con `new Date(\`${p.date}T${p.time}\`)`. Una stringa **senza offset**
  viene interpretata nel fuso **del runtime**: su Vercel, UTC. Una serata delle
  22:00 italiane diventa quindi mezzanotte, e ogni finestra calcolata da li'
  slitta di **due ore in estate, una in inverno**.
- Su `venue-reveal` quello slittamento non e' cosmetico: il cron gira **una
  volta al giorno**, quindi due ore di scarto possono spostare la rivelazione
  **di un intero giro** — cioe' rivelare il venue **il giorno dopo**, quando la
  serata e' gia' cominciata. La guardia monotona regge (non rivela in
  anticipo), ma il fallimento sull'altro lato — nessuno sa dove andare — non e'
  meno grave, ed e' quello che si vede alla porta.
- `event-reminders:27` filtra con `now.toISOString().split("T")[0]`: e' il
  **giorno UTC**. Fra mezzanotte e le 02:00 italiane il giorno UTC e' ancora
  quello precedente.
- `src/utils/formatTime.ts` usa `getHours()`/`getDate()`, che rendono nell'ora
  **locale del processo**: sul server e' UTC, nel browser e' l'ora dell'utente.
  Lo stesso timestamp puo' comparire con due orari diversi a seconda di dove
  viene reso.

Erano **fatti misurati, non ipotesi** — e la forma in cui si sono presentati e'
la piu' pericolosa: nessun errore, nessun log, nessun crash. Solo una finestra
spostata di due ore.

**Regola che ne discende:** un valore `date` + `time` letto dal database **non
si passa mai a `new Date()`**. Si passa alle funzioni di `src/utils/datetime.ts`.
Se ne serve una nuova, si aggiunge li' — non si riscrive la conversione sul
posto, che e' esattamente come sono nate le sei varianti precedenti.

## La mezzanotte sta dentro la serata

Una notte Resonate comincia il sabato e finisce la domenica. Di conseguenza:

- **"Il giorno dell'evento" e' ambiguo per otto ore.** Un conteggio, un filtro o
  un report per data va definito sulla **serata**, non sul giorno solare.
- **"Domani" alle 03:00 significa fra 21 ore, non fra 45.** Ogni promemoria
  calcolato in giorni interi sbaglia proprio nella fascia in cui il pubblico e'
  sveglio.
- Il calendario di produzione lo dice gia' a modo suo: la voce della notte ha
  **una testa e una coda**. Vedi `production-calendar.md`.

## Quality Gates

- **Gate ogni istante ha un fuso dichiarato**: Nessuna data costruita da una stringa senza offset in un percorso che decide qualcosa. Se il valore in tabella e' un'ora locale di Torino, va convertita esplicitamente prima di confrontarla con `now`. **Un confronto fra un'ora locale e un istante UTC non e' sbagliato di poco: e' sbagliato di due ore, e due ore contengono l'inizio di una serata.**
- **Gate l'ora legale non e' costante**: L'offset di Torino cambia due volte l'anno, e il calendario copre agosto→luglio: **il cambio ci sta dentro, sempre**. Ogni conversione usa il fuso `Europe/Rome`, mai un offset fisso di `+1` o `+2`.
- **Gate la finestra di un cron copre il proprio intervallo**: Un cron giornaliero vede il mondo una volta ogni 24 ore. La sua finestra deve essere **almeno larga quanto l'intervallo fra due esecuzioni**, altrimenti un elemento che cade nel mezzo non viene visto ne' prima ne' dopo. Restringere una finestra e' un modo silenzioso di perdere elementi.
- **Gate lo scarto si somma alla granularita'**: Un errore di fuso di due ore su un cron giornaliero non produce un errore di due ore: produce **un giorno intero**, perche' sposta l'elemento oltre il confine dell'unica finestra utile. Vale in modo assoluto per `venue-reveal`.
- **Gate la serata, non il giorno**: Ogni raggruppamento, filtro o conteggio che riguarda una serata usa la **finestra della serata** (inizio → fine, mezzanotte inclusa), mai `date = oggi`. Un check-in delle 02:30 appartiene alla serata di ieri.
- **Gate reso dove, con che ora**: Una data resa sul server e una resa nel browser possono differire. Per gli orari che contano — porta, chiusura del menu, rivelazione — **dichiara il fuso accanto al valore** invece di lasciare che il lettore lo indovini.
- **Gate l'orario del cron e' una decisione**: Gli orari in `vercel.json` sono **UTC**. `0 6 * * *` non e' "le sei del mattino": e' **le otto italiane d'estate**. Ogni modifica dichiara l'ora locale corrispondente, e verifica che non cada dentro una serata ancora in corso — alle 06:00 locali la porta sta chiudendo.
- **Gate niente aritmetica sui giorni per le ancore editoriali**: Le ancore della pipeline (−2 giorni, +4 giorni) sono **delta dalla serata**, non giorni della settimana: se un format cambia giorno, i delta reggono da soli. Vedi `production-calendar.md`, gate ancora non conteggio.

## Imperative Behaviors

- When parsing a stored date and time: attach the intended time zone explicitly, never rely on the runtime's
- When converting for Turin: use `Europe/Rome`, never a fixed offset
- When writing a cron window: make it at least as wide as the interval between runs
- When a night crosses midnight: group by the night's window, never by calendar day
- When scheduling in `vercel.json`: state the local time it corresponds to, and check it is not inside a running night
- When displaying a decisive time: say which time zone it is in
- When a time bug touches the venue reveal: treat it as Critical — late is as bad as early, in the other direction
