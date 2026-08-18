---
phase: 42-scanner-conversion
plan: 07
subsystem: ui
tags: [navigation, door, gates, dead-prose, deletion]

requires:
  - phase: 42-scanner-conversion (42-05)
    provides: le due modifiche di check E scritte parola per parola e provate su mutazione usa-e-getta
  - phase: 42-scanner-conversion (42-04)
    provides: il censimento delle citazioni, misurato per riga invece che per voce
  - phase: 42-scanner-conversion (42-06)
    provides: la superficie della porta gia' passata sul colore
provides:
  - un componente in meno nell'albero — il wrapper della forma telefono e' cancellato
  - la porta monta AppNav con form="phone" direttamente, senza clearance di colonna
  - check E ripuntato sulla porta, con l'indebolimento del discriminante scritto nella voce che lo porta
  - zero frasi nell'albero che nominano un file inesistente
affects: [42-08, 42-09, 42-11, 42-12]

tech-stack:
  added: []
  patterns:
    - "quando un wrapper muore, la ragione per cui esisteva si trasferisce dove serve invece di sparire col file"
    - "le due meta' di un gate si spostano nello stesso commit, perche' ognuna da sola e' un rifiuto"
    - "un discriminante che si indebolisce lo dichiara nella propria voce, insieme all'alternativa piu' solida declinata"
    - "un conteggio si rimisura quando l'albero si muove, non si riporta"

key-files:
  created:
    - .planning/phases/42-scanner-conversion/42-07-SUMMARY.md
  deleted:
    - src/components/layout/MobileNav.tsx
  modified:
    - src/app/(admin)/admin/scanner/DoorSurface.tsx
    - src/components/layout/AppNav.tsx
    - src/app/(admin)/admin/scanner/page.tsx
    - src/app/globals.css
    - src/types/database.ts
    - src/lib/rbac/roles.ts
    - src/lib/capabilities/server.ts
    - src/lib/supabase/middleware.ts
    - src/app/(public)/artists/[slug]/page.tsx
    - src/app/(admin)/admin/(work)/venues/[slug]/page.tsx
    - src/app/(admin)/admin/(work)/layout.tsx
    - src/app/(admin)/admin/(work)/events/[id]/tickets/page.tsx
    - scripts/conversion-manifest.mjs
    - scripts/verify-conversion.mjs

key-decisions:
  - "Il discriminante di check E resta il PERCORSO e non la prop: l'alternativa piu' solida e' nominata e declinata dentro la voce NAV_MODULES, con la ragione — questa fase cambia colore, contrasto e tipo, e riscrivere un discriminante non e' nessuna delle tre"
  - "La ragione del wrapper (la porta non prende la colonna da 224px) si trasferisce in DUE posti: il docblock della prop `form` in AppNav.tsx, dove il prossimo lettore la cerca, e la sezione nuova in DoorSurface.tsx, dove il cambio avviene"
  - "La citazione storica a roles.ts:50 resta una citazione, con sostituzione editoriale fra parentesi quadre dichiarata come tale — non una parafrasi silenziosa"
  - "L'aritmetica quindici→quattordici della SPINE e' riscritta invece che corretta in silenzio, cosi' che la voce uscita non venga ri-derivata come una mancante"

patterns-established:
  - "Prova per mutazione applicata a un gate che si sposta: la meta' rimossa, l'esito letto DOPO aver asserito che la mutazione fosse andata a segno, il ripristino riasserito"
  - "Un conteggio che sopravvive a un cambio va ricontato, non riportato: sopravvivere per caso e' il modo in cui il prossimo cambio lo rompe in silenzio"

requirements-completed: [RESP-05]

duration: ~50min
completed: 2026-08-18
---

# Fase 42 Piano 07: Un wrapper muore, la ragione per cui esisteva no — Summary

**`src/components/layout/MobileNav.tsx` e' cancellato, la porta monta `<AppNav form="phone">` direttamente e senza clearance di colonna, check E misura la stessa cosa di ieri perche' le sue due meta' si sono spostate insieme — e nessuna delle venticinque righe di prosa che nominavano quel file punta piu' al nulla.**

## Il gate d'esecuzione, che era bloccante

Il piano si apre con un blocco `⛔ BLOCKED — do not start this plan until the door
pass has been run`, e rimanda alla riga **3m** di `42-PROCEDURES.md`.

**Quella riga porta una deroga esplicita del proprietario, datata 2026-08-18**, che
dichiara le onde 3-8 della fase 42 eseguite con la riga a `pending`, e la riga
**non piu' eseguibile** — lo scanner non convertito che doveva misurare non esiste
piu'. Questo piano e' l'onda 4. **Il gate non e' stato interpretato: e' stato letto
dove la sua deroga e' scritta**, e la deroga registra anche cosa si perde (il
criterio 3 resta privo di termine di paragone, in modo permanente) e cosa non
cambia (il rischio della prima porta reale e' stato accettato, non rimosso).

## Cosa e' stato fatto

### Task 1 — un commit solo, e doveva esserlo

`47933c4` porta insieme sei cose, perche' ognuna da sola lascia rotto il build o
un gate in rifiuto:

| # | Cosa | Cosa succede senza |
|---|---|---|
| 1 | `DoorSurface.tsx` importa e monta `AppNav` con `form="phone"` | build |
| 2 | Il docblock dello stesso file corretto, piu' una sezione nuova che porta la ragione del wrapper | nulla — ma la ragione morirebbe col file |
| 3 | `src/components/layout/MobileNav.tsx` cancellato | — |
| 4 | Voce `SPINE` rimossa da `conversion-manifest.mjs` | **exit 2**, il manifest rifiuta prima di arrivare al gate |
| 5 | `PHONE_LOCKED_NAV_WRAPPER` → `PHONE_LOCKED_NAV_MOUNT`, ripuntata sulla porta | **exit 2** |
| 6 | La stessa path dichiarata in `NAV_MODULES`, con la sua ragione | **exit 2**, il pairing rifiuta |

Le due modifiche di gate (5 e 6) sono **trascritte** da `42-05-FINDINGS.md` §1.2,
verbatim, non ri-derivate qui.

### Task 2 — le frasi che nominavano un file cancellato

`778097a`. Diciannove righe su dieci file, tutte dentro marcatori di commento.

## Il conteggio, che il piano dava per diciotto

**Il piano dice *«eighteen sentences»*; `42-MAPPING.md` §11.2 lo aveva gia'
corretto misurando, e la misura e' stata rifatta qui invece che ereditata.**

```
LC_ALL=C /usr/bin/grep -rn "MobileNav" src/ scripts/ | wc -l   →  32
```

- **2** dentro il file stesso (`MobileNavProps`, la funzione) — muoiono col file
- **5** sono codice: l'import, il mount, la voce `SPINE`, la voce `NAV_MODULES`,
  la costante
- **25** sono prosa, su **quattordici file**

Delle venticinque di prosa, **6 stavano dentro i file del task 1** (due in
`DoorSurface.tsx`, una nel docblock del recinto del manifest, tre in
`verify-conversion.mjs`) e sono uscite li'; le altre **19** sono il task 2.
`42-RESEARCH.md` §3.4 le raggruppava in quattordici **voci** contate come diciotto
**frasi**: nessuno dei due numeri e' il numero di righe da editare, ed e' la riga
l'unita' con cui si edita.

## Le tre che non erano rinomine

**(i) `AppNav.tsx` — la ragione muore, la prop sopravvive.** Il docblock di `form`
diceva che `"phone"` e' *«cio' che il wrapper accanto a questo file rende, ed e' il
motivo per cui quel file esiste ancora»*. Ora nomina il consumatore che resta — la
porta, che monta direttamente e per scelta — e **perche'**: la superficie di
check-in si lavora con una mano a un ingresso e non da' 224 px a una colonna. Senza
quella frase la prop resta senza un perche', e il prossimo lettore la propone per
la rimozione.

**(ii) `globals.css` — il vincolo resta, cambia il nome.** La frase avverte che
ri-derivare l'altezza della barra dal markup invaliderebbe silenziosamente il
letterale in quattro file. **Il vincolo e' esattamente altrettanto vero dopo**:
dipende dal markup della navigazione, che ora vive solo in `AppNav.tsx`. Cambiato
il nome, **non toccato il resto della frase** — cancellarla toglierebbe l'unico
posto in cui quel vincolo e' scritto.

**(iii) `roles.ts:52` e `:297` — il conteggio, che era gia' falso prima di oggi.**

Entrambe dicevano *«tutti e tredici i mount di `<MobileNav>`»`*. **Premessa
riasserita qui, non ereditata dal prompt:**

```
LC_ALL=C /usr/bin/grep -rn "<AppNav" src/ | grep -v "^src/components/layout/AppNav.tsx"
   →  14 righe, di cui 1 e' prosa (DoorSurface.tsx:74)  →  13 mount reali
```

Il wrapper ne aveva **uno**. La frase contava gli `AppNav` e li chiamava col nome
sbagliato. Dopo la cancellazione: 13 − 1 (il mount dentro il wrapper) + 1
(`DoorSurface`) = **tredici** — il numero sopravvive, cambia l'identita' di un
sito.

E la premessa che `:52` afferma — *tutti e tredici chiamano `getAccessContext()`* —
e' stata riverificata sui tredici percorsi, non dedotta: tutti e tredici compaiono
in `grep -rln "getAccessContext()" src/app/`, la porta a `DoorSurface.tsx:130`. Il
fatto e' scritto **dentro** `roles.ts`, non solo qui, perche' un conteggio corretto
per caso e' un conteggio che il prossimo cambio rompe in silenzio.

## L'affermazione dell'assertion del middleware — il ragionamento, non l'asserzione

`src/lib/supabase/middleware.ts` porta un `throw` a **module load** dentro un
bundle di middleware: non scatta a `npm run build`, scatta **alla prima richiesta
dopo il deploy**, e una mappa sbagliata e' un 500 su ogni rotta che il middleware
copre — webhook SumUp e check-in inclusi.

**Cosa e' stato modificato in quel file: una riga di commento, la 314**, che
nominava il wrapper fra i due componenti `"use client"` che prendono `role` e
`status`. Nient'altro.

**Perche' l'assertion regge ancora, ragionato invece che affermato.** Il blocco
legge le proprie premesse da tre posti, e nessuno dei tre e' toccato da questo
piano:

```js
const DOOR_ADDRESSES = CAPABILITY_ROUTES[CAP.DOOR_OPERATE].routes;
for (const doorAddress of DOOR_ADDRESSES) {
  const doorBinding = resolveRoute(doorAddress);
  // throw se non risolve a door.operate, throw se non e' assignment-openable
}
```

1. `CAPABILITY_ROUTES` vive in `src/lib/routes/capability-routes.ts:275-279` e
   dichiara `routes: ["/admin/scanner", "/door"]`, `assignmentOpenable: true`.
   **`git status --short src/lib/routes/` e' vuoto: il file non e' stato aperto.**
2. `resolveRoute` e `CAP.DOOR_OPERATE` non compaiono in nessun hunk di questo
   piano.
3. Cancellare un componente di navigazione **non e' un percorso**: non aggiunge,
   non rimuove e non rilega alcun indirizzo. L'insieme su cui il ciclo itera e i
   valori che confronta sono byte per byte quelli di ieri.

Quindi l'assertion non e' "ancora verde per fortuna": **le sue premesse non sono
nel perimetro di questo piano**, e le due pagine che i due indirizzi servono
compaiono entrambe nell'output di `next build` (`/admin/scanner`, `/door`).

## La porta — nessun comportamento cambia

Colore, contrasto, tipo e struttura. **Nessuna attesa, nessuna aptica, nessuna
coda, nessun esito, nessun auto-return, nessuna torcia.** `ScannerClient.tsx` non
e' stato aperto in scrittura — e' del piano 42-08 in quest'onda, e
`git log --name-only` sui due commit non lo nomina.

E **la porta non prende la colonna**: nessuna clearance dichiarata in
`DoorSurface.tsx`, verificato dal gate stesso — la porta **non** e' fra i dodici
file che check E accoppia.

## Verifica

Nessun test runner esiste per il prodotto. Quello che segue e' stato **eseguito**,
non evocato.

| Comando | Esito |
|---|---|
| `npm run build` | **0** — compilato, typecheck passato, 60 rotte |
| `npm run verify:conversion` | **0** — `CONVERSION_OK`, `✓ E` |
| `npm run verify:dialogs` | **0** — `DIALOGS_OK`, `REMAINING = 0` |
| `npm run verify:touch-targets` | **0** — `PASSED` |
| `node scripts/verify-all.mjs` | **2** — 17 gate passati, 0 falliti, **2 rifiutati per credenziali assenti** |
| `LC_ALL=C /usr/bin/grep -rc "MobileNav" src/ scripts/` | **0** su entrambi gli alberi |
| `LC_ALL=C /usr/bin/grep -rn "from .*MobileNav" src/` | nessun risultato |

**I due rifiuti di `verify-all` sono ambientali e lo dicono di se'.**
`verify:capabilities` e `verify:section-export` rifiutano perche'
`SUPABASE_ACCESS_TOKEN` e `NEXT_PUBLIC_SUPABASE_URL` non sono impostate — *«a
worktree has no `.env.local`, which is gitignored and lives in the main
checkout»*, parole del gate. **Un rifiuto non e' un fallimento e non e' un pass:**
quei due non hanno misurato nulla, e nessuna riga di questo piano tocca capability
o export.

### La prova per mutazione — eseguita, non ricordata

L'acceptance criterion chiede che togliere **la sola** voce `NAV_MODULES` porti il
gate a exit 2. Eseguito, con la mutazione **asserita applicata prima di leggerne
l'esito**:

```
MUTATION APPLIED — NAV_MODULES entry removed
EXIT=2
FATAL: GATE CANNOT READ — check E's pairing names 1 navigation module(s)
       NAV_MODULES does not declare:
         src/app/(admin)/admin/scanner/DoorSurface.tsx
       …
       Nothing was measured.
```

Ripristinato, riasserito presente, gate rieseguito: **exit 0, `CONVERSION_OK`**.
E' lo stesso stato `S1` che `42-05-FINDINGS.md` §1.3 aveva registrato su un albero
usa-e-getta — riprodotto sull'albero vero.

### Check E, in output

```
navigation modules declared : 2
    src/components/layout/AppNav.tsx
       both tiers — the bar below 768px, the leading column at and above it
    src/app/(admin)/admin/scanner/DoorSurface.tsx
       the file that mounts AppNav locked to its phone form (D-42-03)

✓ E  … and the 12 file(s) declaring the column clearance at the md tier are
     EXACTLY the 12 file(s) mounting the responsive navigation form
```

## File cancellati — l'elenco che l'orchestratore deve rivedere

Il merge helper blocca deliberatamente un branch che porta cancellazioni. Questo
branch ne porta **una**, ed e' l'oggetto del piano:

| File | Ragione |
|---|---|
| `src/components/layout/MobileNav.tsx` | Wrapper di una riga il cui unico compito era passare `form="phone"`. Precedeva la prop; una volta che la prop esiste e' un livello vuoto. **Cancellazione prevista dal piano 42-07 (task 1, punto 3) e annunciata da D-41-21**, che diceva gia' *«Phase 42 deletes this file»*. Il suo consumatore unico (`DoorSurface.tsx`) monta ora il primitivo direttamente, e la ragione per cui il wrapper esisteva e' trasferita in `AppNav.tsx` e `DoorSurface.tsx`. |

Nessun'altra cancellazione: `git diff --diff-filter=D --name-only` sul secondo
commit e' vuoto.

## L'onesta' che va in eredita' — il discriminante si e' indebolito

| | Prima | Dopo |
|---|---|---|
| Cos'e' il file escluso da check E | un file dedicato, la cui **unica** ragione d'essere era passare `form="phone"` | un file che fa **anche** la guardia d'accesso |
| Se smettesse di passare `form="phone"` | impossibile senza svuotare il file | **il gate resterebbe verde** |

**Scritto dentro la voce `NAV_MODULES`, che e' dove il prossimo lettore lo trova**,
insieme all'alternativa piu' solida — *il discriminante diventa la prop invece del
percorso* — **dichiarata e declinata con la sua ragione**: questa fase cambia
colore, contrasto e tipo, e riscrivere il discriminante di un gate non e' nessuna
delle tre. Farlo dentro un'onda di conversione significherebbe che, se il gate si
comportasse diversamente, nessuno saprebbe se e' la conversione o il discriminante
nuovo.

`DoorSurface.tsx` porta il rimando alla stessa limitazione, per non lasciarla in un
solo posto.

## Deviazioni dal piano

### [Regola 1 — frase falsa] L'aritmetica della SPINE

**Trovato durante:** task 1, punto 4.
**Problema:** il docblock di `SPINE` diceva *«D-41-01 counts fourteen spine members
and this list has fifteen entries»*, spiegando la discrepanza col wrapper. Tolta la
voce, la lista ne ha quattordici e la frase diventava falsa — la stessa classe di
difetto che questa fase e' qui a chiudere.
**Correzione:** riscritta al passato con la ragione della perdita, invece che
corretta in silenzio, cosi' che la voce uscita non venga ri-derivata come una
mancante.
**File:** `scripts/conversion-manifest.mjs`. **Commit:** `47933c4`.

### [Regola 1 — frase falsa] Due stringhe di output del gate

**Trovato durante:** task 1, punto 6.
**Problema:** due messaggi che il gate **stampa** (non commenti) dicevano *«the
phone-locked wrapper»* e *«it mounts the phone-locked wrapper instead»*. Non
contenevano il literal `MobileNav`, quindi non erano fra le venticinque, ma
descrivevano una cosa che non esiste — a un lettore che legge il rosso alle due di
notte.
**Correzione:** riformulate su *the phone-locked mount* / *the navigation locked to
the phone form*, e il riferimento a D-41-21 diventa `D-42-03, superseding D-41-21`.
**File:** `scripts/verify-conversion.mjs`. **Commit:** `47933c4`.

### [Regola 1 — frase stantia] Il conteggio «exactly two files» nel docblock del discriminante

**Trovato durante:** task 1, punto 6.
**Problema:** la stessa frase da riscrivere diceva *«Measured 2026-08-13 that
yields exactly two files»* e *«every other mount site reaches the navigation
through the wrapper»*. Entrambe superate dall'onda 1: il gate ne accoppia dodici.
**Correzione:** la misura datata e' stata tolta invece che aggiornata a un numero
che il prossimo `CONVERTED` rifara' stantio; resta la regola, piu' il fatto che la
porta e' assente da entrambe le meta' **per costruzione**.
**File:** `scripts/verify-conversion.mjs`. **Commit:** `47933c4`.

Nessuna deviazione di Regola 4: nessuna decisione architetturale e' stata presa qui.

## Debito — nulla aperto, nulla chiuso

`DEF-42-01` … `DEF-42-05` restano **tutte aperte** e nessuna era di questo piano.
`PHASE_42_PATHS` **non e' stato aperto**: e' del piano 42-11, e il docblock del
recinto e' stato corretto **senza** rimuovere il recinto.

Nessun nuovo debito differito.

## Cosa questo verde NON dice

- **Non dice che la porta funzioni.** Dice che compila, che i gate accettano e che
  nessuna riga di comportamento e' stata toccata. Che si legga alle due di notte
  con una fila davanti e' il door pass, ed e' di una persona — e la riga 3m che
  avrebbe dato il *prima* non e' piu' eseguibile.
- **Non dice che il discriminante sia solido.** Dice che e' piu' debole di ieri e
  che l'indebolimento e' scritto dove si trova.
- **Non dice che i due gate rifiutati siano verdi.** Non hanno misurato nulla.

## Self-Check: PASSED

File asseriti su disco:

- `FOUND: .planning/phases/42-scanner-conversion/42-07-SUMMARY.md`
- `FOUND: src/app/(admin)/admin/scanner/DoorSurface.tsx`
- `FOUND: scripts/verify-conversion.mjs`
- `ABSENT (previsto): src/components/layout/MobileNav.tsx`

Commit asseriti in `git log`:

- `FOUND: 47933c4` — refactor(42-07), 4 file, 1 cancellazione
- `FOUND: 778097a` — docs(42-07), 11 file, 0 cancellazioni
