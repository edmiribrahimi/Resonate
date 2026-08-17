---
phase: 45-production-sections-section-by-section
plan: 05
subsystem: access-control
tags: [capability-model, routing, production-sections, key-split]
requires:
  - "supabase/migrations/20260817120000_production_section_keys.sql (piano 45-03) — le quattro descrizioni"
  - "supabase/migrations/20260817120500_production_read_retire.sql (piano 45-03) — la ritirata, applicata dal 45-09"
  - "src/lib/routes/capability-routes.ts, il binding del calendario spostato dal piano 44-09"
provides:
  - "CAP.PRODUCTION_CALENDAR_MANAGE · PRODUCTION_MANIFESTO_MANAGE · PRODUCTION_VISUAL_MANAGE · PRODUCTION_LOCATION_MANAGE"
  - "un binding per chiave: il calendario sul ramo routes:, le altre tre su scope: \"table\""
  - "l'aspettativa pre-registrata del gate capability sul modello a diciassette chiavi"
  - "il commit che il deploy del piano 45-08 trasporta"
affects:
  - "piano 45-08 (applica la migration additiva — DOPO questo deploy)"
  - "piano 45-09 (applica la ritirata — DOPO il 45-08)"
  - "piano 45-11 (crea /admin/location e sposta il suo binding dal ramo table)"
  - "piano 45-12 (crea /admin/manifesto e /admin/visual e sposta i loro binding)"
  - "piano 45-18 (aggiunge le tre tab in staff-tabs.ts, dopo le pagine)"
tech-stack:
  added: []
  patterns:
    - "rinomina con portata dichiarata: stesse rotte, stesso flag, stessa portata per ruolo"
    - "il ramo table-only come dichiarazione onesta per una chiave senza pagina, con il piano che la sposta scritto dentro"
    - "il rosso pre-registrato: due intervalli dichiarati prima che arrivino"
key-files:
  created: []
  modified:
    - src/lib/capabilities/keys.ts
    - src/lib/routes/capability-routes.ts
    - src/lib/routes/staff-tabs.ts
    - scripts/verify-capabilities.mjs
    - src/app/(admin)/admin/calendar/actions.ts
    - src/app/(admin)/admin/(work)/calendar/page.tsx
    - src/app/(admin)/admin/(work)/calendar/[id]/page.tsx
    - src/app/(admin)/admin/(work)/calendar/loading.tsx
    - src/app/(admin)/admin/(work)/calendar/[id]/loading.tsx
    - .planning/phases/45-production-sections-section-by-section/deferred-items.md
decisions:
  - "La byte-identita' delle quattro descrizioni vince sul criterio grep == 0, perche' i due si contraddicono: la descrizione del calendario contiene 'production.read' per costruzione"
  - "Le tre nuove chiavi non portano alsoGatesTables: le loro tabelle non esistono, e una dichiarazione in anticipo sui fatti e' la stessa bugia al contrario"
  - "assertProductionRead rinominata: un nome che mente viene creduto sopra il codice su cui sta"
metrics:
  duration: ~55 min
  completed: 2026-08-17
  tasks: 3
  files: 10
  commits: 3
---

# Fase 45 Piano 05: la meta' in codice dello split — Summary

Quattro chiavi di sezione dichiarate, quattro binding, il calendario spostato
sulla propria chiave in tutti i suoi nove siti, e l'aspettativa pre-registrata
del gate capability portata sul modello a diciassette — **con il rosso dichiarato
in anticipo invece che scoperto a meta' sequenza.**

## Cosa e' stato costruito

**Nessuna migration e' stata applicata.** Il database tiene ancora quattordici
chiavi, `production.read` compresa, e nessuna delle quattro. Il piano 45-08
applica quella additiva, il 45-09 la ritirata. Questo commit e' quello che il
deploy del 45-08 trasporta: **il codice punta a chiavi che nel database non
esistono finche' quel deploy non e' avvenuto**, ed e' esattamente per questo che
la migration additiva lascia `production.read` e i suoi due grant al loro posto —
il bundle vecchio continua a chiedere la chiave vecchia, che risponde ancora si'.

**Chi raggiunge cosa non e' cambiato, in nessuna delle due direzioni.** Le stesse
due ruoli — `master` e `organizer` — raggiungevano il calendario prima e lo
raggiungono dopo; `staff` e `member` erano rifiutati prima e lo sono dopo, ora su
quattro chiavi invece che su una. Il vincolo 3 di D-45-04 e' cio' che rende la
frase controllabile invece che asserita, e `verify-capabilities.mjs` e' dove i
trentasei grant e i trentadue rifiuti sono dichiarati riga per riga.

---

## Task 1 — `keys.ts`: quattro chiavi, quattro descrizioni, e le ragioni

Commit: `39b6454`

### Le prove meccaniche

| Criterio | Atteso dal piano | Misurato |
|---|---|---|
| `grep -cE "production\.(calendar\|manifesto\|visual\|location)\.manage"` | 8 | **8** (4 in `CAP`, 4 in `CAP_DESCRIPTIONS`) |
| `grep -ci "bet on the signup path"` | 4 | **4** |
| `grep -c "production.read"` | 0 | **9** — vedi deviazione 1 |
| descrizioni byte-identiche alla migration | 4 su 4 | **4 su 4** |

### Le quattro comparazioni, eseguite e non affermate

Confronto meccanico fra la stringa dopo `'<key>',` nella migration e la stringa
dopo `"<key>":` in `CAP_DESCRIPTIONS`:

```
production.calendar.manage     IDENTICAL (973 chars)
production.manifesto.manage    IDENTICAL (883 chars)
production.visual.manage       IDENTICAL (899 chars)
production.location.manage     IDENTICAL (1019 chars)
ALL FOUR BYTE-IDENTICAL — exit 0
```

Le quattro lunghezze coincidono con quelle estratte dalla migration **prima** che
`keys.ts` fosse toccato, il che e' la parte che rende il confronto una misura e
non un'eco: se avessi estratto entrambe le stringhe dopo aver scritto il file,
avrei confrontato la mia copia con se stessa.

### Cosa portano i docblock, oltre ai nomi

Una sezione per chiave, sul modello che il piano 44-04 aveva scritto per la
quattordicesima: la **domanda** a cui risponde (mai il predicato); i **cinque
riusi respinti** con la direzione dell'errore — `production.read` tenuta per
tutte e quattro, `organizer.access`, `catalogue.manage`, `admin.access`,
`staff.manage` — e per ognuna delle tre nuove sezioni la direzione e' quella
della sezione, non una copia:

- sul **manifesto**, `production.read` lo concederebbe con la stessa chiave della
  lista location: il manifesto e' un documento che **esce dal perimetro**, e la
  lista scouting e' l'unica cosa che non deve viaggiare con lui;
- sul **visual**, una sezione il cui contenuto **diventa una pubblicazione**
  condividerebbe la chiave con una che non deve mai esserlo — obblighi opposti
  sullo stesso grant;
- sulla **location**, `catalogue.manage` sarebbe peggio di forma-contro-domanda:
  `venues` tiene spazi **acquisiti** e questa sezione tiene spazi **non
  acquisiti**, e un grant solo cancellerebbe la distinzione che
  `venue-acquisition.md` esiste per tenere.

E la frase per cui lo split esiste, scritta **una volta e dove il lettore
successivo la incontra** — nella sezione *Named by the question, not by the
predicate*, cioe' accanto alla regola che applica: le quattro chiavi risolvono
allo stesso predicato **oggi**, e sono quattro perche' **una** possa essere tolta
senza le altre, cosa che una sola `production.read` non poteva essere.

### Il build rosso fra Task 1 e Task 2, misurato

Il piano si aspettava un fallimento che nominasse `CAPABILITY_ROUTES`. Il testo
misurato e' un altro:

```
./src/app/(admin)/admin/(work)/calendar/[id]/page.tsx:184:29
Type error: Property 'PRODUCTION_READ' does not exist on type '{ ... 12 more ...;
  readonly PRODUCTION_LOCATION_MANAGE: "production.location.manage"; }'.
```

`tsc` si ferma al **primo** errore, e cinque siti consumano ancora
`CAP.PRODUCTION_READ`: quello del binding totale esiste ma non viene raggiunto.
E' la stessa classe di errore — il compilatore che fa il suo mestiere, e nomina
i siti che il Task 2 ripara — ma il criterio del piano descriveva una conseguenza
che l'ordine di `tsc` non produce. Registrato come misura, non come riparazione.

Il tipo stampato nell'errore e' l'altra evidenza utile: `12 more ...` piu' le
cinque nominate fa diciassette membri di `CAP`.

---

## Task 2 — I binding e i sette siti restanti del calendario

Commit: `684c341`

| Criterio | Atteso | Misurato |
|---|---|---|
| `CAP.PRODUCTION_READ` sotto `src/` | 0 | **0** |
| `"production.read"` / `'production.read'` letterali sotto `src/` | 0 | **0** |
| `scope: "table"` (dichiarazioni) | +3 | **5 → 8** |
| `alsoGatesTables: true` (dichiarazioni) | invariato | **6 → 6** |
| binding del calendario: due rotte + flag | si' | **si'** |
| `href:` in `staff-tabs.ts` | invariato | **8 → 8** |
| `npm run build` | exit 0 | **`✓ Compiled successfully`** |
| `npm run verify:routes` | exit 0 | **PASS, exit 0** |

### La rideriva del controllo di ambiguita', e perche' e' corta

Il piano chiedeva di **ri-derivare** il paragrafo dell'ambiguita' invece di
ereditarlo. La derivazione onesta e' questa: **questo commit aggiunge zero
pattern.** Le due rotte del calendario attraversano immutate, e le tre chiavi
nuove stanno sul ramo che non ne dichiara nessuna. Misurato invece che assunto:

```
node scripts/verify-routes.mjs --print-patterns   # prima
node scripts/verify-routes.mjs --print-patterns   # dopo
diff → IDENTICAL
```

Ventisei pattern prima, ventisei dopo, nello stesso ordine. **Un pareggio non
puo' essere introdotto da un insieme che non e' cresciuto**, e questa e'
un'affermazione piu' forte del controllo per classi, non piu' debole. La
derivazione per pattern resta comunque scritta nel file, perche' il prossimo
piano che aggiunge un indirizzo li' ne avra' bisogno — e perche' il `throw` gira
**al module load dentro il bundle del middleware**: un pareggio non e' una pagina
rotta, e' un 500 su ogni rotta che il middleware copre, webhook dei pagamenti e
percorso di scansione alla porta inclusi.

### Il conteggio di `alsoGatesTables`, ricontato leggendo il file

Il commento diceva *«six of the fourteen»*. Ora dice **«six of the seventeen»**,
e la parte interessante e' che **il denominatore si e' mosso e il numeratore no**
— esattamente il caso che un lettore sbaglierebbe facendo aritmetica. Solo una
delle quattro chiavi nuove porta il flag, perche' solo il calendario ha policy
oggi. Le altre tre gaterebbero righe che non esistono: **scriverlo sarebbe una
dichiarazione in anticipo sui fatti, che e' la stessa bugia di D-34-11 nella
direzione opposta.**

### La trappola scritta dentro ognuna delle tre, con il piano che la scioglie

Le tre entry table-only portano il loro `reason` obbligatorio e ognuna nomina
**quale piano la sposta** — 45-11 per location, 45-12 per manifesto e visual —
cosi' l'obbligo e' **assolto invece che ricordato**. E ognuna porta la trappola:
una pagina agganciata a una chiave table-only e' irraggiungibile **per tutti**,
`resolveRoute` restituisce `null`, il middleware fallisce chiuso, **nessun errore
di build e niente in un log** — e questo prodotto non ha error tracking, quindi
una superficie giu' per tutti e' una superficie che nessuno scopre se non
aprendola.

Sulla location c'e' una riga in piu', e la direzione conta: e' la sezione le cui
righe portano un indirizzo civico, e **table-only rifiuta tutti** — che e' la
direzione giusta in cui sbagliare.

### La rinomina del guard, che non e' cosmetica

`assertProductionRead` → `assertProductionCalendarManage`, e la categoria lanciata
`forbidden.production_read_required` → `forbidden.production_calendar_manage_required`.
**Un helper chiamato `assertProductionRead` che chiede `production.calendar.manage`
e' un nome che viene creduto sopra il codice su cui sta**, da chiunque cerchi il
gate con un grep invece di aprirlo — e un rifiuto che nomina una chiave ritirata
manda chi lo legge alla riga sbagliata.

Verificato prima di rinominare che **nessun consumatore** intercetti quella
stringa: `grep -rn "production_read_required"` la trova solo nel file che la
lancia. Le **due categorie diverse** restano diverse: un rifiuto nel merito e
un'identita' irrisolvibile, che *non e'* un rifiuto nel merito.

### Nessuna tab aggiunta

`staff-tabs.ts` cambia **una riga** — la capability della tab Calendar — e il
ciclo al module load e' cio' che la rende sicura: chiede a `resolveRoute` cosa
dice la mappa sullo stesso indirizzo e lancia se i due dissentono, quindi una tab
lasciata sulla chiave ritirata avrebbe fatto fallire `next build` per nome.

Le tre tab sorelle **non** arrivano qui: `StaffTab.href` e' `Route`, un indirizzo
statico entra nell'unione generata solo quando un `page.tsx` lo serve, e nessuna
delle tre pagine e' su disco. I due workaround respinti per iscritto a
`:117-126` **restano respinti** — non diventano accettabili perche' ora li
vogliono tre tab invece di una. Sono del piano 45-18.

---

## Task 3 — L'aspettativa pre-registrata

Commit: `6ffbe3b`

| Criterio | Atteso | Misurato |
|---|---|---|
| `EXPECTED_KEY_COUNT = 17` | 1 | **1** |
| `EXPECTED_PAIR_COUNT = 68` | 1 | **1** |
| `EXPECTED_GRANT_COUNT = 36` | 1 | **1** |
| `EXPECTED_REFUSAL_COUNT = 32` | 1 | **1** |
| `'production.<sezione>.manage'` nel file | ≥8 | **16** (4 ruoli × 4 chiavi) |
| `production.read` fuori dai commenti | 0 | **0** |
| `npm run build` | exit 0 | **`✓ Compiled successfully`** |

### I numeri sono stati **ricalcolati dalla tabella**, non dedotti dal paragrafo

Camminando `ROLE_GRANTS` invece di fidarsi dell'aritmetica scritta nel piano:

```
roles 4 · distinct capabilities 17
pairs 68 · grants 36 · refusals 32
per-role key counts: master=17 organizer=17 staff=17 member=17
has production.read: false
```

I quattro numeri coincidono con quelli che il piano aveva calcolato — ma la
coincidenza vale qualcosa **solo perche' la misura e' arrivata dopo e da un'altra
strada**. Il paragrafo accanto alle costanti ora dichiara l'ordine: *se la
tabella e il paragrafo dissentono, la tabella e' il fatto e il paragrafo e'
l'errore*.

### La forma di questo sesto spostamento, che e' la prima non-addizione

`56/30/26 → 68/36/32`, e vale la pena nominare la forma: **il totale dei grant
sale di sei mentre il numero di soggetti che raggiungono la superficie di
produzione resta identico** — due ruoli, prima e dopo. Un totale che sale senza
che nessuno guadagni portata e' come si legge uno split in questa tabella, e
leggerlo come un allargamento sarebbe leggere l'aritmetica invece del modello.

### I quattro rifiuti di `staff` sono quattro paragrafi, non uno moltiplicato

Il meccanismo e' lo stesso — l'assenza di una riga — e la **ragione e' diversa
per sezione**, che e' l'unica cosa che rende un rifiuto controllabile invece che
abitudinario: il calendario perche' chi sta alla porta entra per far entrare la
gente; il manifesto perche' e' un documento costruito per essere consegnato a un
terzo; il visual perche' il suo contenuto diventa una pubblicazione; la location
perche' **e' il rifiuto che costa di piu' se viene allentato** — ogni riga e' uno
spazio che nessuno ha chiamato, con un indirizzo, e una trattativa nominata fuori
da chi tratta e' una trattativa resa pubblica.

---

## I due intervalli rossi, dichiarati prima di arrivare

Scritti accanto a `EXPECTED_KEY_COUNT`, in questo commit:

| Intervallo | Il database tiene | Il file dichiara | Da / a |
|---|---|---|---|
| **1** | 14 chiavi (`production.read` inclusa) | 17 | da questo commit al piano **45-08** |
| **2** | 18 chiavi (le 4 nuove + `production.read`) | 17 | dal 45-08 al piano **45-09** |

Verde solo dopo il 45-09. **Nessuno dei due si ripara editando una costante** —
e' precisamente il fallimento che quella costante esiste per prendere, e ha una
forma registrata: la mutazione C del piano 43-02 lo fece in due passi.

E una cosa in piu', che il piano chiedeva di dire: **un run che nell'intervallo 1
riportasse un MATCH a diciassette non sarebbe un sollievo — sarebbe un
ritrovamento**, perche' vorrebbe dire che la migration e' stata applicata fuori
ordine.

### Cosa e' stato misurato davvero, qui dentro

```
node scripts/verify-capabilities.mjs   → exit 2
FATAL: missing environment variable(s): SUPABASE_ACCESS_TOKEN,
       NEXT_PUBLIC_SUPABASE_URL. Nothing was measured.
```

**Exit 2, non 1.** `.env.local` e' gitignored e vive nel checkout principale: un
worktree non ne ha copia (DEF-45-02). Quindi **l'intervallo 1 e' dichiarato qui e
non osservato qui**: il gate rifiuta prima di leggere il database, e un rifiuto
non e' ne' un verde ne' un rosso — non ha misurato nulla.

### `npm run verify` — exit 2, e non per causa mia

Il criterio del piano diceva *exit 0*. Misurato: **exit 2**, con tre gate che
rifiutano:

- `verify:conversion` e `verify:touch-targets` — nominano quattro superfici
  rimosse quando Finance e Analytics sono passate a SumUp (`/admin/analytics`, le
  sue due figlie, `/admin/finance`). **DEF-45-01**, pre-esistente a questa fase.
  Nessun file che ho toccato compare nei loro messaggi.
- `verify:capabilities` — credenziali assenti nel worktree. **DEF-45-02**.

Nessun gate che ha raggiunto un verdetto ha riportato un fallimento. Ho
**deliberatamente non riparato** i primi due: lo `SCOPE BOUNDARY` li assegna a chi
ha rimosso quelle superfici, e ripararli qui nasconderebbe chi li ha prodotti.

---

## Deviations from Plan

### 1. [Rule 4 — contraddizione fra due criteri del piano] `grep "production.read" == 0` **non e' soddisfacibile** insieme alla byte-identita'

- **Trovata durante:** Task 1, sul primo grep di accettazione.
- **Il conflitto, in una riga:** la descrizione di `production.calendar.manage`
  — che il piano impone di copiare **byte per byte** dalla migration — contiene
  la stringa `production.read`, nella frase *«minted by the split of
  production.read into four section keys (D-45-04)»*. Le due condizioni non
  possono valere insieme.
- **Cosa ho scelto:** la **byte-identita'**, e non il grep.
- **Perche', e non e' una preferenza:** la byte-identita' e' `must_haves.truths`
  #1 **e** un `key_link` verso la migration; il grep e' un **proxy** per una cosa
  piu' stretta — *nessun percorso di codice chiede piu' la chiave ritirata*. La
  seconda si puo' misurare direttamente, e l'ho misurata:

  | Controllo | Risultato |
  |---|---|
  | `grep -rn 'CAP\.PRODUCTION_READ' --include='*.ts' --include='*.tsx' src` | **0 righe** |
  | `grep -rn "\"production\.read\"\|'production\.read'" ... src` | **0 righe** |

  Le ventitre occorrenze rimaste sotto `src/` sono **ventidue righe di commento**
  che registrano lo split — *«una decisione rovesciata senza la sua ragione si
  legge come una svista»* — piu' **una riga**, la descrizione byte-identica.
  Nessuna e' un gate.
- **La strada che ho rifiutato, e perche':** modificare la migration del piano
  45-03 per togliere quella frase. Non e' ancora applicata, quindi il *gate
  migration in avanti* non lo vieterebbe — ma e' l'artefatto di un altro piano,
  gia' committato nell'onda 1, e cambiarlo cambierebbe **in silenzio cio' che il
  45-08 applichera'**. Un cambio cross-piano non si fa unilateralmente.
- **Conseguenza per chi verifica:** chi esegue il grep letterale del piano lo
  vedra' rosso. Sopra ci sono i due comandi che tornano zero **e** dicono la cosa
  giusta.

### 2. [misura, non riparazione] Il build fra Task 1 e Task 2 nomina un consumatore, non `CAPABILITY_ROUTES`

`tsc` si ferma al primo errore. Testo registrato per intero nella sezione del
Task 1. Nessuna azione: il criterio descriveva una conseguenza che l'ordine di
`tsc` non produce, e forzarla avrebbe richiesto di riordinare il lavoro attorno
a un messaggio d'errore.

### 3. [Rule 2 — registrazione fuori scope] `deferred-items.md` — DEF-45-03

**Nessun controllo, in nessun ambiente, confronta le descrizioni delle
capability.** `keys.ts:29-36`, la migration `:97-102` e il piano 45-05 affermano
tutti e tre che *«the only thing that compares them is verify-capabilities.mjs,
which needs a live database»*. Misurato: `grep -n "description"
scripts/verify-capabilities.mjs` restituisce **una sola riga**, ed e' un commento
su `master.manage`. Il gate legge le `key` e non tocca mai la colonna
`description`.

E' il pattern che `ai-engineering.md` chiama *Gate hallucination con un passaggio
in piu'*: un documento derivato afferma una copertura che non esiste, e chi legge
smette di rileggere le stringhe a mano perche' crede che qualcuno lo faccia per
lui. **Registrata e non riparata** — le due strade (aggiungere un lato al gate,
oppure correggere le tre frasi) vanno pesate da chi possiede il gate. Reso piu'
costoso da questo piano, che porta le stringhe da allineare da una a quattro.

Nessun'altra deviazione. **Nessun gate di autenticazione incontrato.**

---

## Verification

- `npm run build` — **`✓ Compiled successfully`** al termine del Task 2 e ancora
  al termine del Task 3. E' il typecheck di Next, che qui e' l'unico gate dei
  tipi: **non esiste alcun test runner per il prodotto**, e nessuna riga di
  questo SUMMARY va letta come «i test passano».
- `npm run verify:routes` — **PASS, exit 0**. 26 pattern, 24 pagine, ogni pagina
  risolve a un pattern della mappa.
- `verify-routes.mjs --print-patterns` — **identico byte per byte** prima e dopo.
- Byte-identita' delle quattro descrizioni — **4 su 4**, confronto meccanico
  eseguito e riportato sopra.
- Ricalcolo di `ROLE_GRANTS` — **17 / 68 / 36 / 32**, camminando la tabella.
- `npm run verify` — **exit 2**, tre rifiuti, tutti e tre pre-esistenti
  (DEF-45-01, DEF-45-02).
- `node scripts/verify-capabilities.mjs` — **exit 2**, credenziali assenti.

### Cosa un verde **non** significa

Il build e il gate delle rotte passano entrambi **contro un database che tiene
ancora una chiave chiamata `production.read` e nessuna delle quattro dichiarate
qui**. I tipi vengono da un file scritto a mano, non dal database. Nessun build
in questo repository legge un `.sql`.

E la RLS resta il confine: quello che ho toccato — la mappa delle rotte, i guard
di pagina, le tab — decide dove avviene un **redirect**, non chi legge una riga.
Le sei policy stanno nella migration, e finche' il 45-08 non la applica **chiedono
ancora `production.read`** nel database, mentre il codice chiede
`production.calendar.manage`. Le due meta' si riallineano al deploy, e nel
frattempo nessuno viene rifiutato perche' la chiave vecchia e i suoi due grant
sono ancora li'.

### La procedura manuale, per quando il 45-08 sara' applicato

In un repo senza test questa e' l'unica prova che esistera', quindi e' scritta
invece che evocata. Dopo il deploy di questo commit **e** l'applicazione della
migration additiva:

1. Con un account `master`: aprire `/admin/calendar` → la lista si carica.
   Aprire una serata → la pagina di dettaglio si carica. **Se una delle due
   reindirizza a `/dashboard`, il grant non e' arrivato**: leggere
   `private.role_capabilities` prima di toccare il codice.
2. Con lo stesso account: spuntare una voce di checklist → la spunta viene
   registrata con il nome. E' il percorso che passa da
   `assertProductionCalendarManage`, cioe' la rinomina di questo piano.
3. Con un account `staff`: aprire `/admin/calendar` → redirect. **E la tab
   Calendar non deve essere disegnata** — ma nasconderla non protegge niente, e
   il punto del passo e' il redirect, non la tab.
4. Aprire `/admin/manifesto`, `/admin/visual`, `/admin/location` con un `master`:
   **404**, perche' le pagine non esistono. Se una di quelle risponde, qualcosa
   e' stato creato fuori dai piani 45-11 e 45-12.
5. `npm run verify:capabilities` **con credenziali**: rosso nell'intervallo 2
   (18 contro 17), verde solo dopo il 45-09.

---

## Known Stubs

Nessuno. Le tre chiavi senza pagina **non sono stub**: sono dichiarazioni oneste
sul ramo che significa *questa chiave non apre alcun indirizzo*, ognuna con il
piano che la sposta scritto dentro. Uno stub e' un valore vuoto che arriva a una
UI e sembra un dato; qui non c'e' UI, e il ramo table-only rifiuta tutti invece
di mostrare un vuoto.

## Threat Flags

Nessuna superficie di sicurezza nuova. Nessuna rotta aggiunta — la lista dei
pattern e' identica prima e dopo. Nessun nuovo endpoint, nessun nuovo uso del
service client, nessun percorso verso un indirizzo pubblico, nessun accesso a
`venue_for_parties`. Le tre chiavi nuove non aprono nulla per nessuno.

Il registro delle minacce del piano resta coperto: T-45-04 (nessuna finestra di
rifiuto — la migration additiva lascia la chiave vecchia in piedi), T-45-05
(ambiguita' ri-derivata e misurata: zero pattern aggiunti), T-45-04b (le tre
entry sul ramo table-only con `reason` e piano che le sposta), T-45-12 (ogni
numero mosso porta la sua ragione e il suo piano), T-45-SC (nessun pacchetto
installato).

## Self-Check: PASSED

- `.planning/phases/45-production-sections-section-by-section/45-05-SUMMARY.md` — FOUND
- `src/lib/capabilities/keys.ts` — FOUND
- `src/lib/routes/capability-routes.ts` — FOUND
- `src/lib/routes/staff-tabs.ts` — FOUND
- `scripts/verify-capabilities.mjs` — FOUND
- commit `39b6454` — FOUND
- commit `684c341` — FOUND
- commit `6ffbe3b` — FOUND
