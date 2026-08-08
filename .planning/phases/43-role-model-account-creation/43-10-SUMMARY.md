---
phase: 43-role-model-account-creation
plan: 10
subsystem: checkin-offline
tags: [attendances, entry-role, denormalisation, door, roster, evidence]
requires:
  - "43-05 — il ruolo `staff`, l'etichetta che questa colonna deve poter registrare"
  - "43-08 — il punto di cattura `43-08`, da cui parte il confronto della write matrix"
  - "20260805120000_door_scan_events.sql — il principio: l'evidenza che deve sopravvivere alla riga che nomina si denormalizza al momento della scrittura"
provides:
  - "public.attendances.entry_role — text, nullable, senza default, senza FK, senza CHECK"
  - "Attendance.entry_role in src/types/database.ts, tipato string | null"
  - "il campo `entryRole` sul body di POST /api/membership/verify — la superficie che il piano 43-13 implementa"
  - "`role` nel payload di GET /api/membership/list — l'etichetta che il device deve poter mettere in cache"
  - "le tre osservazioni sulla colonna, prese su container: nullable, nessun default, nessuna constraint nuova"
affects:
  - "43-13 — possiede lo store offline, il sync manager e lo scanner: deve mettere in cache `role` e rimandarlo come `entryRole`"
  - "43-14 — la meta' di interfaccia: leggere i numeri della serata per entry_role"
  - "43-15 — scrive la procedura manuale M-43-10, che e' l'unica prova che il percorso scriva davvero"
tech-stack:
  added: []
  patterns:
    - "il set chiuso si deriva da ROLES a runtime invece di ribattere quattro literal — la migration ha rifiutato un CHECK per non avere una quarta enumerazione"
    - "una etichetta non riconosciuta scrive NULL e AMMETTE: alla porta il default sull'incerto e' ammettere e registrare"
    - "l'errore si logga come { code, message } — mai intero, mai `details`, che su una violazione porta la riga"
key-files:
  created:
    - "supabase/migrations/20260808003000_attendances_entry_role.sql"
    - ".planning/phases/32-capability-model-in-the-database/baseline/32-BASELINE-policies.container.43-10.json"
    - ".planning/phases/32-capability-model-in-the-database/baseline/32-BASELINE-reads.container.43-10.json"
    - ".planning/phases/32-capability-model-in-the-database/baseline/32-BASELINE-writes.container.43-10.json"
  modified:
    - "src/types/database.ts"
    - "src/app/api/membership/verify/route.ts"
    - "src/app/api/membership/list/route.ts"
decisions:
  - "Il checkpoint bloccante del task 3 e' stato eseguito su un container usa e getta, non su produzione — stessa strada di ogni piano di questa fase. La migration resta committata e non applicata"
  - "Due criteri di accettazione del task 3 NON sono soddisfatti e sono nominati come tali: il conteggio dei NULL preesistenti in produzione, e uno scan reale attraverso il build deployato"
  - "Nessun CHECK sul set dei ruoli: sarebbe la quarta enumerazione, e un 23514 dentro l'insert della porta rifiuta un ospite valido davanti a una fila"
  - "Nessun indice: entry_role non e' una colonna di lookup, e un indice si pagherebbe sul lato scrittura, che qui e' la porta"
  - "Il ramo 23505 non riscrive l'entry_role della prima ammissione"
metrics:
  tasks: 3
  duration: ~1h30m
  completed: 2026-08-08
---

# Phase 43 Plan 10: ACCT-05, da vero a leggibile — Summary

`ACCT-05` era gia' strutturalmente vero prima di questo piano e lo sarebbe
rimasto senza scrivere una riga: l'insert della presenza non ha un ramo sul
ruolo ne' uno sullo stato, quindi un account `staff` che scansiona la propria
tessera produce gia' oggi una riga identica a quella di chiunque altro.
**L'ingresso gratuito e' contato.** Quello che non era e' **leggibile**.

Da questo piano la serata ha un posto dove registrare *cosa era* un ingresso —
una colonna, una parola nella query che gia' girava alla porta, un campo nel
roster — e la meta' offline ha una superficie dichiarata contro cui il piano
43-13 puo' lavorare.

---

## Task 1 — una colonna nullable, e cosa significa NULL (`1486c6f`)

`supabase/migrations/20260808003000_attendances_entry_role.sql`. Prefisso
verificato libero e successivo a `20260808002000_membership_register.sql`: la
collisione di prefisso e' il difetto che il piano 43-05 ha gia' incontrato e
fallisce **al momento dell'apply**, non prima.

Una transazione, una istruzione:

```sql
ALTER TABLE public.attendances
  ADD COLUMN IF NOT EXISTS entry_role text;
```

Le quattro decisioni sono scritte nel file con la loro ragione:

| Decisione | Perche' |
|---|---|
| **nullable, nessun default** | Nessun backfill, e non puo' essercene uno: l'unico valore disponibile a un backfill e' il ruolo **attuale** dell'account, cioe' esattamente il valore che la decisione 2 rifiuta. **NULL significa "scritta prima che la colonna esistesse", mai "era un member"** — la stessa distinzione che `20260805120000` fa per `refunded_ticket_id` |
| **nessuna FK, nessun join** | Il valore e' evidenza di cosa era vero **alla porta**, non un puntatore a cosa e' vero adesso. `profiles.role` e' mutabile — il piano 43-09 gli ha dato sei scrittori — e un join farebbe cambiare il numero della serata scorsa a una retrocessione del mese prossimo. `entry_role` e `profiles.role` **possono divergere, e la divergenza e' il registro che funziona** |
| **nessun CHECK** | Sarebbe la **quarta** enumerazione dei ruoli da allargare, dopo il CHECK su `profiles`, quello su `private.role_capabilities` e l'unione `UserRole`. Su questa tabella il costo del quarto sito e' un `23514` **dentro l'insert della porta**, davanti a una fila: qui un vincolo rifiuta un ospite valido, ed e' l'errore che `checkin-offline.md` esiste per impedire |
| **non un booleano** | `is_free_staff_entry` e' piu' stretto e sara' sbagliato: anche un ospite omaggio e' un ingresso gratuito e non e' staff |

Aggiunta nel commit del task 3, dopo aver scritto il codice: la
**riconciliazione dei tre modi** in cui un NULL puo' arrivare anche su una riga
scritta dopo l'apply — riga preesistente, sync in coda senza etichetta (fino a
43-13), etichetta non riconosciuta. Sono lo stesso significato, `unknown`, e
nessuno dei tre e' *era un member*. Senza quel paragrafo la migration avrebbe
continuato a dire una frase vera e **incompleta**, che e' il modo in cui la
documentazione di un file diventa una bugia.

### RLS, considerata esplicitamente

Il middleware non e' sicurezza; qui non c'entra affatto, perche' questa colonna
non passa da nessun middleware. La RLS di PostgreSQL e' **row-level**: una
colonna nuova su una tabella esistente e' raggiungibile esattamente dalle policy
che gia' raggiungono la riga. `public.attendances` ne ha due, entrambe lasciate
intatte:

- `attendances_select_own` — `(select auth.uid()) = user_id`. Un membro puo' gia'
  leggere le proprie righe di presenza e ora legge la propria `entry_role`: il
  proprio ruolo sulla propria presenza. **Nessuna riga di nessun altro diventa
  leggibile.**
- `attendances_all_admin` — `private.has_capability('staff.manage')`. E' da qui
  che si legge il report della serata.

**Nessuna policy aggiunta, e aggiungerne una sarebbe stato l'errore**: le policy
`PERMISSIVE` sono in OR, quindi una policy nuova su questa tabella potrebbe solo
allargare chi legge le presenze di tutta la community.

### Nessun indice, e non e' una dimenticanza

`supabase-data.md` chiede un indice su ogni colonna usata per trovare **una
singola riga**. `entry_role` non lo e': nessuno cerca una persona per ruolo
d'ingresso. Il suo lettore e' un aggregato su una serata, gia' ristretto da
`idx_attendances_party`, sopra un party che sta in una sede da 150–300 persone.
E un indice qui si pagherebbe dal lato sbagliato: ogni riga di questa tabella la
scrive la porta, un INSERT alla volta, con una persona davanti al telefono.

`src/types/database.ts` porta la colonna nello stesso commit, tipata
`string | null` e **non** `UserRole | null`: senza CHECK il database puo'
contenere un'etichetta che l'unione non sa nominare, e un tipo che promettesse
`UserRole` sarebbe un tipo che mente. Con la nota, come il piano 43-07 per il
registro, che **nessun client Supabase di questo repository e' parametrizzato
con `Database`** — quindi quel nome di campo non e' controllato da niente in
nessun call site.

---

## Task 2 — una parola nella query della porta, un campo nel roster (`b98e390`)

### `verify/route.ts`

`role` entra nel select del profilo **che gia' girava**, non in uno nuovo:

```ts
.select("id, full_name, membership_code, role")
```

Le query su `profiles` in quel file sono **tre prima e tre dopo** — questa,
quella del GET, e il lookup dell'operatore nel ramo 23505, di cui il percorso di
check-in ne raggiunge al massimo due. `checkin-offline.md`: alla porta una query
lenta e' una fila, e un secondo round trip per scan e' un secondo round trip per
persona in piedi davanti al telefono (T-43-10-03).

`entry_role` viene scritto nell'insert **esistente**, con questa precedenza:

1. su un sync in coda (`source === "offline_sync"`) vale l'etichetta che il
   device ha portato, validata contro il set chiuso — e' D-17: il marker deve
   essere quello preso **alla porta**;
2. altrimenti il ruolo appena letto dal profilo, perche' online la porta e la
   scrittura sono lo stesso momento e il valore appena letto **e'** il valore
   della porta.

`checked_in_at` sopra prende l'orologio del server invece di quello del
telefono, e questo valore va nella direzione opposta apposta. Non e' una
contraddizione: un orologio e' un fatto che il server stabilisce meglio del
device, mentre *cosa diceva il roster quando una persona e' stata ammessa* e' un
fatto che solo il device possiede.

Il set chiuso viene da `ROLES` (`src/lib/rbac/roles.ts`), legato all'unione da
una **annotazione e non da un cast**:

```ts
const KNOWN_ROLES: readonly UserRole[] = Object.values(ROLES);
```

Lo specchio e' asimmetrico e la asimmetria e' scritta: un valore in `ROLES` che
l'unione non nomina e' un errore di build; l'unione che cresce mentre `ROLES` no
non lo e', e produrrebbe un ruolo reale scritto come NULL — cioe' la direzione
sicura, perche' l'ingresso viene comunque ammesso e il marker legge *unknown*.

**L'asimmetria della porta, applicata dove serve.** Un'etichetta fuori dal set
chiuso non e' un motivo per rifiutare un ingresso: scrive NULL, logga con una
categoria sua, e **ammette la persona**. Rifiutare un ospite valido avviene
davanti a una fila; un report con un ingresso marcato *sconosciuto* e' un numero
letto a una scrivania, dopo, da qualcuno che puo' chiedere.

L'effetto osservabile che il gate *zero fallimenti silenziosi* pretende **non**
sta alla porta, ed e' una scelta dichiarata sul posto: mostrare all'operatore un
avviso su un'etichetta su cui non puo' fare niente mentre la gente aspetta e'
rumore. L'effetto sta dove il difetto e' azionabile — un `entry_role` NULL su
una riga scritta dopo l'apply si vede nel report della serata. E' **piu' debole**
di un effetto alla porta, ed e' scritto che lo e'.

Il ramo 23505 **non riscrive** l'`entry_role` della prima ammissione: il marker
appartiene al primo ingresso, quello che ha occupato un posto.

### `list/route.ts` — e la frase che il piano ha reso falsa

`role` entra nel select e quindi nel payload. L'intestazione del file diceva
*«this plan changes who may call, not the path and not the response body»*: era
vera della fase 32 e da questo piano e' **falsa**. Sostituita, non integrata.

> **IL SET DI AMMISSIONE ALLA PORTA E' INVARIATO.** Il filtro resta
> `membership_code IS NOT NULL`, **senza `role` e senza `status`**, esattamente
> come prima. E' aggiunto un campo per riga, **non e' tolta una riga**. Chiunque
> fosse nel roster prima di questo piano c'e' anche dopo. Questa lista e' quello
> che il telefono cerca alle due di notte senza rete, e una persona che manca da
> qui viene rifiutata davanti a una fila.

E' scritto nel file, non solo qui, che il filtro largo e' deliberato.

Perche' un'etichetta di ruolo nel roster e' **design e non nuovo dato
personale** (T-43-10-04, `accept`): quel payload porta gia' ogni nome e ogni
`membership_code` della community — la sola credenziale della porta — a ogni
telefono che puo' lavorare a una porta. Contro quello, sapere che un account e'
`staff` invece che `member` non e' una categoria nuova di esposizione: e' un
campo in piu' dentro un confine gia' attraversato, protetto dalla stessa
capability. Detto esplicitamente nell'header, invece di lasciarlo dedurre.

La rotta resta `NetworkOnly` nel service worker: **nessuna regola di cache e
nessuna invalidazione e' toccata**.

---

## Task 3 — la colonna osservata, e la meta' che resta non misurata (`4803895`)

Il task 3 era un `checkpoint:human-action` bloccante che chiedeva di applicare
la migration a produzione e di scansionare una tessera vera. **Non e' stato
fatto**, ed e' una decisione dell'esecutore presa contro la politica di questa
fase: nessun passo tecnico viene consegnato al proprietario, e ogni piano di
questa fase ha lasciato le migration committate e non applicate, prendendo le
proprie osservazioni sul container.

### Cosa e' stato osservato davvero

Su un `postgres:17.6` usa e getta — la major.minor esatta di produzione —
costruito come lo costruisce `rls-baseline-container.mjs`: shim, schema base al
commit iniziale, poi ogni migration in ordine.

| Osservazione | Risultato |
|---|---|
| versione | `PostgreSQL 17.6` |
| applicate prima della nuova | 1 shim + 1 schema base + **41 migration** |
| `entry_role` **prima** | non esiste (0 righe in `information_schema.columns`) |
| constraint su `attendances` **prima** | 5: `attendances_pkey`, `..._event_id_fkey`, `..._user_id_fkey`, `..._party_id_fkey`, `..._checked_in_by_fkey` |
| apply della migration | senza errore |
| `entry_role` **dopo** | `entry_role \| text \| is_nullable YES \| (no default)` |
| constraint su `attendances` **dopo** | **le stesse 5** — nessun CHECK, nessuna FK aggiunta |
| seconda applicazione dello stesso file | senza errore (`IF NOT EXISTS`) |
| la colonna accetta `'staff'` | si', e lo restituisce |
| policy RLS su `attendances` | `attendances_all_admin`, `attendances_select_own` — invariate |

Il container e' stato distrutto; non ha mai avuto una porta esposta e non legge
nessuna variabile d'ambiente.

### Il confronto della baseline: zero difetti

```
npm run baseline:container -- --phase-point=43-10
npm run baseline:compare -- --target=container --before-point=43-08 --after-point=43-10 --only=B1,B2,B3
```

**`CAP-03: clean`.** B1 — 68 policy, 68 invariate, 0 inspiegate. B2 — 294 celle
di lettura confrontate, 14/14 personas risolte, frazione vacua 0/294. B3 — 882
celle di scrittura confrontate, 860 con evidenza reale. **Niente si e' mosso**,
che e' l'attesa: una colonna non aggiunge una persona ne' una cella.

`--only=B1,B2,B3` e' obbligatorio e non e' una scorciatoia: senza, il confronto
esce `FATAL` perche' B5 e' l'advisor Supabase e sul container non esiste.

`npm run verify:capabilities -- --target=container`: **5/5 green, 0 warning**,
com'era prima.

### Le due cose che il task 3 chiedeva e che NON sono state misurate

Nominate, non aggirate:

1. **Il conteggio dei NULL preesistenti in produzione non esiste.** Sul
   container appena costruito e' `0`, e quel numero **non e' una misura di
   produzione**: dice solo che una tabella vuota e' vuota. Il numero vero — le
   presenze scritte prima che questa colonna esistesse — si legge quando la
   migration viene applicata, e va registrato **insieme alla frase che dice che
   quel NULL significa "prima della colonna" e mai "erano member"**. E' il primo
   passo di M-43-10.
2. **Nessuno scan reale ha attraversato la rotta.** Niente e' deployato e la
   colonna non esiste in produzione. Quello che il container prova e' che la
   colonna accetta e restituisce un'etichetta; quello che **non** prova e' che
   la rotta la scriva. Non c'e' un client parametrizzato con `Database`, quindi
   un refuso nell'insert compilerebbe: l'unico controllo meccanico fatto qui e'
   che il nome della colonna nella migration e la chiave nell'insert siano la
   stessa stringa — `entry_role` in entrambi. **Non e' una prova che il percorso
   funzioni.** Quella prova e' M-43-10, scritta dal piano 43-15.

Un `npm run build` verde **non** dice che la migration esiste ne' che i nomi
sono giusti. Dice che il TypeScript compila.

---

## Per il piano 43-13 — la superficie, esatta

Il device deve mandare **`entryRole`**, camelCase, sul body di
`POST /api/membership/verify`, accanto a `code`, `partyId`, `scannedAt`,
`deviceId`, `source`. Viene letto **solo** quando `source === "offline_sync"` e
scritto sulla colonna snake_case `attendances.entry_role`.

Il valore da mandare e' il `role` che il roster portava quando l'ingresso e'
stato preso: `GET /api/membership/list` ora lo restituisce per ogni membro.

Una cosa da sapere prima di iniziare: **`cacheMembers`
(`src/lib/offline/checkin-store.ts:939-955`) dichiara il parametro come
`Array<{id, full_name, membership_code}>` e scarta tutto il resto**. Il campo
`role` arriva oggi dal JSON come `any`, quindi non produce nessun errore di
build e viene semplicemente perso: il piano 43-13 deve allargare quel tipo, lo
store IndexedDB e `findMember`. Nessuno di quei file e' stato toccato qui.

E il fallback, dichiarato: finche' 43-13 non e' arrivato, ogni ingresso preso
con la radio spenta sincronizza **senza marker** e scrive NULL. E' vero, non e'
un difetto, e non e' *"era un member"*.

---

## Deviazioni dal piano

### Decise dall'esecutore

**1. [Checkpoint] Il task 3 non e' stato eseguito su produzione**

- **Trovato in:** task 3, un `checkpoint:human-action` con `gate="blocking"`
- **Cosa chiedeva:** applicare la migration a produzione, contare i NULL
  preesistenti, e scansionare una tessera vera attraverso il build deployato con
  un account usa e getta poi cancellato
- **Cosa e' stato fatto:** le osservazioni di schema prese su un container usa e
  getta; migration committata e **non applicata**; nessun account creato, nessuno
  scan reale, nessuna mail
- **Perche':** la politica di questa fase vieta di consegnare passi tecnici al
  proprietario, e ogni piano precedente ha preso la stessa strada. Il container
  risponde alle domande di **schema** (forma della colonna, constraint, RLS,
  matrice) e non puo' rispondere a quelle di **produzione** (quanti NULL
  preesistenti) ne' a quelle di **percorso** (uno scan vero)
- **Conseguenza dichiarata:** due criteri di accettazione del task 3 restano non
  soddisfatti e sono elencati sopra per nome. Vanno in M-43-10

### Auto-corrette

**2. [Rule 2 — errore silenzioso] `list/route.ts` non loggava il fallimento del fetch del roster**

- **Trovato in:** task 2, leggendo il ramo `if (error)`
- **Problema:** rispondeva 500 senza scrivere niente da nessuna parte. Il 500 e'
  un effetto osservabile — lo scanner segnala il refresh fallito — ma nessuno
  avrebbe mai potuto dire **perche'** la porta ha passato una serata su un
  roster vecchio
- **Correzione:** una categoria di log propria, con `{ code, message }` soltanto
- **Commit:** `b98e390`

**3. [Rule 2 — divulgazione] il log dell'insert di presenza portava l'oggetto errore intero**

- **Trovato in:** task 2, sul ramo che questo piano modifica
- **Problema:** su una violazione di constraint PostgREST mette la **riga**
  in `error.details`, e la riga di questo insert nomina un membro. La misura
  43-01 ha gia' osservato quella forma pubblicare nome completo e
  `membership_code`
- **Correzione:** `{ code: insertError.code, message: insertError.message }`. La
  restrizione arriva con questo piano perche' e' questo piano a cambiare cosa
  l'insert porta
- **Commit:** `b98e390`

**4. [Rule 1 — il commento rompeva la propria asserzione]**

- **Trovato in:** task 2, eseguendo la verifica del piano
- **Problema:** il commento che documentava l'invariante *"nessuna seconda query
  su `profiles`"* citava letteralmente il pattern `grep`, e veniva contato da
  esso: 3 prima, 4 dopo — un falso positivo prodotto dalla propria
  documentazione
- **Correzione:** l'invariante e' scritta a parole, con la ragione per cui non
  cita il pattern
- **Commit:** `b98e390`

**5. [Rule 2 — documentazione incompleta] i tre modi in cui arriva un NULL**

- **Trovato in:** dopo il task 2, rileggendo la migration contro il codice
- **Problema:** la migration diceva *NULL significa "scritta prima che la colonna
  esistesse"*, frase vera ma incompleta dal momento in cui il codice scrive NULL
  anche su un sync senza etichetta e su un'etichetta non riconosciuta
- **Correzione:** paragrafo di riconciliazione dei tre casi, tutti con lo stesso
  significato `unknown`
- **Commit:** `4803895` (la migration non e' applicata da nessuna parte:
  `Gate migration in avanti` vieta di modificarne una **gia' applicata**)

---

## Debito differito, non corretto

- **`recordScanEvent` logga l'oggetto errore intero**
  (`src/app/api/membership/verify/route.ts`, ramo `door_scan_events insert
  failed`). Preesistente e **non toccato da questo piano**, quindi fuori
  perimetro. Il rischio e' minore di quello corretto sopra — la riga di
  `door_scan_events` porta uuid, `device_id` e `source`, nessun nome e nessun
  `membership_code` — ma e' la stessa forma, e va stretto quando qualcuno tocca
  quel ramo. Riportato, non risolto.

---

## Threat Flags

Nessuna superficie di sicurezza nuova fuori dal `<threat_model>` del piano.
Nessun endpoint nuovo, nessun percorso di autenticazione nuovo, nessuna policy.
Il solo cambiamento di superficie e' un campo in piu' nel payload del roster,
gia' registrato come T-43-10-04 e accettato con la sua ragione scritta nel file.

---

## Verifica

- `npm run build` — verde (l'ultima volta sull'albero finale). **Dice che il
  TypeScript compila. Non dice che la migration esiste, non dice che i nomi
  delle colonne sono giusti, e non c'e' un test runner per il prodotto.**
- `npm run verify:capabilities -- --target=container` — **5/5 green, 0 warning**
- `npm run baseline:compare -- --target=container --before-point=43-08 --after-point=43-10 --only=B1,B2,B3`
  — **CAP-03: clean**, zero difetti
- Le tre osservazioni di schema sul container, sopra
- La meta' di leggibilita' di ACCT-05 — se i numeri della serata si riescano
  davvero a leggere — resta **manuale**, procedura M-43-10, scritta dal piano
  43-15; la meta' di interfaccia e' il piano 43-14. Dichiarato, non implicito.

## Self-Check: PASSED

File dichiarati creati, verificati presenti sul disco:

- `supabase/migrations/20260808003000_attendances_entry_role.sql` — FOUND
- `.planning/phases/32-capability-model-in-the-database/baseline/32-BASELINE-policies.container.43-10.json` — FOUND
- `.planning/phases/32-capability-model-in-the-database/baseline/32-BASELINE-reads.container.43-10.json` — FOUND
- `.planning/phases/32-capability-model-in-the-database/baseline/32-BASELINE-writes.container.43-10.json` — FOUND

Commit dichiarati, verificati in `git log`:

- `1486c6f` — FOUND
- `b98e390` — FOUND
- `4803895` — FOUND

Nessuno dei quattro file del piano 43-11 e' stato toccato; `git diff --name-only`
sulla base della fase elenca sette file, tutti dentro il perimetro dichiarato.
