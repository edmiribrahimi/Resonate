---
phase: 50-via-le-iscrizioni
plan: 09
subsystem: rbac
tags: [next, react, typescript, navigation, capability-model, catalogue, runbook]

requires:
  - phase: 50-via-le-iscrizioni
    plan: 02
    provides: "la migration applicata al laboratorio — `profiles.status` via, `my_access_context` ridefinita su entrambi i sovraccarichi senza la chiave `'status'`, `role_capabilities.requires_approved` via"
  - phase: 50-via-le-iscrizioni
    plan: 06
    provides: "`NAV_ITEMS` gia' potato: la voce `Home` uscita, `/gallery` con il cancello dell'approvazione gia' spento, la voce `Account` visibile anche da anonimo"
  - phase: 50-via-le-iscrizioni
    plan: 08
    provides: "`src/` senza una sola lettura o scrittura di `profiles.status`, `approved_via`, `referred_by`; `may-upload.ts:291` gia' chiuso"
  - phase: 50-via-le-iscrizioni
    plan: 05
    provides: "`P-50-7` percorsa sul laboratorio, con il suo esito osservato"
  - phase: 50-via-le-iscrizioni
    plan: 01
    provides: "i due soggetti distinti di `P-50-3` e la serata `free_rsvp` seminati sul banco"
provides:
  - "`getVisibleNavItems(role, capabilities, liveAssignmentCapabilities)`: la firma perde il secondo parametro, e i tredici punti d'innesto li ha nominati il compilatore"
  - "`NavItem` senza il campo dell'approvazione e il filtro senza il suo ramo, tolti nello stesso commit"
  - "`AccessContextResult`, `ANONYMOUS_CONTEXT` e la mappatura del payload senza la chiave che la funzione di database non manda piu'"
  - "`src/types/database.ts` senza i sei simboli: l'unione dei tre stati, il campo sul profilo, le due colonne del referral, il secondo asse di una concessione, il campo del payload"
  - "REG-05 chiusa a ZERO dal catalogo del laboratorio, con le due correzioni alle query e il perimetro del grep scritto accanto al comando"
  - "`50-RUNBOOK.md`: otto procedure con ruolo, ambiente, passi numerati e osservabili, piu' i due passi manuali che nessun codice esegue"
affects: [50-10, 50-11, 50-12, 51, 52]

tech-stack:
  added: []
  patterns:
    - "una proprieta' scritta in un docblock («tutti i punti d'innesto lo passano, quindi un quattordicesimo e' un errore di compilazione») si SPENDE con una sonda: si rende obbligatoria una prop finta, si legge l'elenco che il compilatore produce, e si toglie la sonda — l'elenco non si costruisce a memoria e la proprieta' resta provata invece che ricordata"
    - "un campo e il ramo che lo legge si tolgono nello stesso commit: uno senza l'altro lascia o un campo che nessuno legge o un ramo che nessuno raggiunge, e sono due modi diversi di far credere che l'asse esista ancora"
    - "un grep di chiusura si misura in DUE forme e la forma autorevole guarda il database: un grep sui file puo' dire «pulito» mentre il catalogo dice il contrario, e viceversa"
    - "il perimetro di un gate testuale si scrive ACCANTO al comando, e il censimento di cio' che esclude si scrive per intero: un perimetro senza censimento e' un perimetro che qualcuno allarghera' in silenzio"

key-files:
  created:
    - .planning/phases/50-via-le-iscrizioni/50-RUNBOOK.md
  modified:
    - src/lib/rbac/roles.ts
    - src/lib/capabilities/server.ts
    - src/lib/supabase/middleware.ts
    - src/components/layout/AppNav.tsx
    - src/types/database.ts
    - src/app/(public)/events/page.tsx
    - src/app/(public)/events/[slug]/page.tsx
    - src/app/(public)/events/[slug]/menu/page.tsx
    - src/app/(public)/tickets/page.tsx
    - src/app/(public)/tickets/[id]/page.tsx
    - src/app/(public)/gallery/page.tsx
    - src/app/(public)/artists/[slug]/page.tsx
    - src/app/(public)/newsletter/page.tsx
    - src/app/(members)/dashboard/page.tsx
    - src/app/(members)/attendance/page.tsx
    - src/app/(members)/membership-card/page.tsx
    - src/app/(admin)/admin/(work)/layout.tsx
    - src/app/(admin)/admin/scanner/DoorSurface.tsx
    - src/app/(admin)/admin/(work)/venues/page.tsx
    - src/app/(admin)/admin/(work)/artists/page.tsx
    - src/app/(admin)/admin/(work)/members/register/page.tsx
    - src/app/(admin)/admin/(work)/events/new/page.tsx
    - src/app/(admin)/admin/(work)/events/[id]/tickets/page.tsx
    - src/app/(admin)/admin/(work)/events/[id]/assignments/page.tsx
    - .planning/phases/50-via-le-iscrizioni/deferred-items.md

key-decisions:
  - "L'elenco dei punti d'innesto e' stato prodotto dal COMPILATORE e non a memoria: una prop obbligatoria finta su `AppNavProps`, `tsc --noEmit`, tredici file nominati, sonda rimossa. Tredici, quanti `roles.ts` ne dichiarava — terza misura di fila"
  - "Il campo dell'approvazione esce da `NavItem` benche' fosse obbligatorio PER COSTRUZIONE: un campo obbligatorio che ogni voce deve mettere a falso non e' una domanda a cui si risponde, e' una domanda senza soggetto"
  - "Il nome dei simboli cancellati NON si ricopia nei commenti che ne registrano la cancellazione: il fatto si registra, il token no, o il grep resta rosso per una prosa (disciplina 50-07/50-08)"
  - "`membership_acts.status_before` / `status_after` RESTANO, con accanto la frase della loro migration: sono prova di cio' che era vero allora, non un puntatore a cio' che e' vero adesso"
  - "`membership.active` NON si chiude qui (opzione b): le due meta' se ne vanno insieme o il gate resta rosso, e chiuderla avrebbe richiesto una terza migration fuori dal perimetro di un'autorizzazione datata gia' scritta"
  - "Il criterio `grep -rcE … src/` = 0 non e' soddisfacibile dentro il perimetro dichiarato: misurato, censito per intero in `deferred-items.md`, e NON aggirato allargando il grep"
  - "La prosa resa falsa da QUESTA modifica e' stata corretta dove sta, `src/lib/supabase/middleware.ts` incluso; la prosa resa falsa dalla migration del 50-02 e' stata censita, non riscritta"

patterns-established:
  - "Una sonda di compilazione (prop obbligatoria finta + `tsc --noEmit` + rimozione) e' il modo di spendere una proprieta' dichiarata in un docblock quando le modifiche sono gia' state fatte a mano: prova la proprieta' invece di fidarsene"
  - "Un runbook si scrive PRIMA di percorrere le procedure, e RIPORTA quelle gia' percorse invece di ripeterle, con il piano e la data che le hanno prodotte"

requirements-completed: [REG-01, REG-02, REG-03, REG-05]

duration: 25min
completed: 2026-09-21
---

# Phase 50 Plan 09: La sottrazione chiusa, e le otto procedure scritte prima di percorrerle

**La barra si filtra su sessione, ruolo e capability — e l'elenco e' intero. Nessun tipo descrive piu' una colonna che non esiste. REG-05 e' a zero sul catalogo, provata con le query corrette e con il perimetro scritto accanto al comando. Le otto procedure esistono scritte.**

## Performance

- **Duration:** ~25 min
- **Completed:** 2026-09-21
- **Tasks:** 3 su 3
- **Commits:** 4 (`8e28588`, `f64bffb`, `619cce6`, `2ed1db6`)

---

## Task 1 — la barra perde lo stato, e il compilatore nomina i tredici

`8e28588`.

### L'elenco l'ha fatto il compilatore, e la prova e' stata *spesa*

`roles.ts` dichiarava una proprieta' e la usava come argomento: *«all 13
`<AppNav>` mount sites pass them, so a fourteenth that forgets is a build error
naming the file»*. Il piano chiede di spenderla.

Le modifiche ai tredici siti erano gia' state scritte quando il build e' tornato
verde, quindi **il build non avrebbe nominato nessuno** — e dichiarare «il
compilatore li ha nominati» sarebbe stato ricordare, non misurare. La proprieta'
e' stata **provata con una sonda**: una prop obbligatoria finta aggiunta a
`AppNavProps`, `npx tsc --noEmit`, e l'elenco letto dagli errori.

```
# `npx tsc --noEmit`, righe DELLA SONDA: si sono mosse dopo la misura, con le
# correzioni di prosa dello stesso task
src/app/(admin)/admin/(work)/layout.tsx:146
src/app/(admin)/admin/scanner/DoorSurface.tsx:151
src/app/(members)/attendance/page.tsx:141
src/app/(members)/dashboard/page.tsx:696
src/app/(members)/membership-card/page.tsx:161
src/app/(public)/artists/[slug]/page.tsx:279
src/app/(public)/events/[slug]/menu/page.tsx:379
src/app/(public)/events/[slug]/page.tsx:1959
src/app/(public)/events/page.tsx:697
src/app/(public)/gallery/page.tsx:125
src/app/(public)/newsletter/page.tsx:61
src/app/(public)/tickets/[id]/page.tsx:394
src/app/(public)/tickets/page.tsx:400
```

**Tredici. Sonda poi rimossa** (`AppNav.tsx` ripristinato dal suo duplicato
prima del commit, `grep -c "__probe"` → 0).

**Il numero coincide con i tredici dichiarati in `roles.ts`**, ed e' la **terza**
misura di fila: 34-05 (quando il conteggio crollo' da 44 a 13), dopo la fase 42
(ancora 13, con un mount che cambiava identita'), e oggi. Nessuna differenza da
dichiarare.

### `src/lib/rbac/roles.ts`

| Riga | Cosa |
|---|---|
| `:94` | `export type { UserRole }` — l'export del tipo dello stato e' uscito; il tipo non esiste piu' a monte |
| `:108-118` | le costanti dei tre valori dello stato, **uscite**, con il commento che registra che c'erano. Nessun consumatore fuori dal file (rimisurato prima di toglierle) |
| `:155-180` | il campo dell'approvazione di `NavItem`, **uscito** |
| `:425-430` | la firma: `(role, capabilities, liveAssignmentCapabilities)`. `isApproved` non esiste piu' |
| `:438-449` | il ramo del filtro, **uscito** |
| `:390-407` | il docblock degli esiti, riscritto **per la terza volta in una fase** |

**Il campo era obbligatorio per costruzione, e l'argomento che lo teneva tale era
buono**: un campo opzionale lascia a una voce aggiunta fra due anni la liberta'
di dimenticare la domanda, uno obbligatorio rende il dimenticarla un errore di
compilazione. Il commento a `:155-180` lo dichiara, e dichiara perche' va tolto
lo stesso: **la domanda che poneva non ha piu' un modo di essere posta**, perche'
non esiste piu' l'asse su cui rispondeva. Un campo obbligatorio che ogni voce
deve mettere a falso non e' una domanda a cui si risponde, e' una domanda senza
soggetto — e continuare a porla insegna al prossimo lettore che l'asse esiste.

**Campo e ramo escono nello stesso commit.** Toglierne uno solo avrebbe lasciato
o un campo che nessuno legge o un ramo che nessuno raggiunge: due modi diversi
di far credere che l'asse sia ancora li'.

**Gli esiti della barra, dopo: quattro dove ce n'erano sette.** Anonimo →
Events, Gallery, Account→`/login`. `member` → Events, Gallery,
Account→`/dashboard`. Organizer/master → le tre piu' Check-in. Staff → le tre,
piu' Check-in quando e' assegnato a una serata in corso. `pending`, `approved` e
`rejected` producevano **tre barre diverse per lo stesso ruolo**, e quell'asse
non esiste piu'.

### `src/lib/capabilities/server.ts`

`:255` `AccessContextResult`, `:288` `ANONYMOUS_CONTEXT`, il tipo del payload e
la mappatura: la chiave dello stato e' uscita da tutti e quattro. Il commento a
`:509-515` dice perche' **non e' stata lasciata cadere in silenzio**: la funzione
di database non la mette piu' nel payload (50-02, entrambi i sovraccarichi),
quindi mapparla avrebbe prodotto `null` per tutti — *un valore che si legge come
«non approvato» invece che come «la domanda non esiste piu'»*. Sono due cose
diverse, e la seconda non ha un posto in quell'oggetto.

### `StaffNav` — verificata, e invariata

Il piano chiede di guardarla **anche se il compilatore non la nomina**, perche'
una seconda barra che filtrasse su un criterio scomparso sarebbe un cancello che
smette di scattare senza che nessuno se ne accorga (T-50-43).

**Misurato:** `/usr/bin/grep -n "status\|Status\|approved" src/components/staff/StaffNav.tsx` → **nessuna riga**. La firma e'
`StaffNav({ capabilities, form })` (`:106`) e il filtro e' `visibleStaffTabs(capabilities)`
(`:109`). **Non c'era niente da togliere**, e il fatto e' stato misurato invece
che assunto. `PageShell.tsx` allo stesso modo: nomina `AppNav` in un commento e
non riceve nessuna identita'.

### I tredici punti d'innesto

In ognuno: la prop via, la lettura dalla destrutturazione di `getAccessContext()`
via, l'`import` del tipo via. **In nessuno dei tredici lo stato era letto per
altro** — verificato riga per riga prima di togliere, che e' la condizione che il
piano poneva («dove invece era letto per altro, fermarsi e riportarlo»).
**Nessun secondo lettore trovato**, che e' il risultato atteso a questo punto
della fase.

---

## Task 2 — i tipi per ultimi, e la prova che REG-05 si chiude a zero

`f64bffb`.

### I sei simboli, in `src/types/database.ts`

| Riga | Cosa |
|---|---|
| `:100-108` | l'unione dei tre valori dello stato, **uscita**, con il commento che dice perche' cade **per ultima** |
| `:116-124` | `Profile` perde i tre campi: lo stato e le due colonne del referral |
| `:1315-1329` | `RoleCapability` perde il secondo asse di una concessione |
| `:1361-1375` | `AccessContext` perde il campo che la funzione di database non manda piu' |

**Perche' per ultimi, e non e' un dettaglio d'ordine:** erano letti da tutta
l'onda precedente, e toglierli prima avrebbe reso rosso ogni build intermedio —
in un repository dove il compilatore e' **l'unico controllo automatico che
esiste**.

Il commento a `:116-124` porta la ragione che vale per tutti e sei: nessun client
di questo repository e' parametrizzato con un generico `Database`, quindi il
compilatore **non** confronta questi campi con lo schema. Un campo di troppo qui
non e' un errore di build: e' un invito a scrivere una `select` che il database
rifiuta con `42703`.

### `MembershipActRow` — i due campi dello stato RESTANO

`:920-937`, il paragrafo aggiunto: la fase ha tolto dal prodotto l'asse
dell'approvazione, e **questi due non escono con lui**, con accanto la frase
della loro migration citata alla lettera — *«una etichetta di stato memorizzata
e' PROVA DI CIO' CHE ERA VERO ALLORA, non un puntatore a cio' che e' vero
adesso»* (`20260808002000:224-243`).

`/usr/bin/grep -c "status_before\|status_after" src/types/database.ts` → **5**.

**Chi fra sei mesi cerchera' residui li trovera': il paragrafo esiste perche'
sappia che sono storia, non debito.** T-50-46 mitigata.

---

## REG-05 — la prova, in due forme, e il perimetro

### (a) Dal catalogo, sul LABORATORIO — la forma autorevole

Eseguite il 2026-09-21 in sola lettura, con uno script che **rifiuta il
riferimento di produzione come prima riga eseguita** (verificato prima della
prima `fetch`: `target_is_prod_ref=NO`).

```
--- (1) la colonna profiles.status
[{"n":0}]

--- (1b) le tre colonne dell'asse e del referral
[{"n":0}]

--- (2) funzioni il cui CODICE (commenti spogliati) nomina profiles ... status
[{"fn":[]}]

--- (2b) controprova: p.status / profiles.status nel codice spogliato
[{"fn":[]}]

--- (3) policy che nominano get_user_status o requires_approved
[{"p":[]}]

--- (3b) LA FORMA CHE VEDE: policy che nominano profiles E status (ogni schema)
[{"p":[]}]

--- (4) la funzione get_user_status esiste ancora?
[{"n":0}]

--- (5) role_capabilities.requires_approved esiste ancora?
[{"n":0}]
```

**Le query usate sono quelle CORRETTE dal piano 50-02, non quelle di §1.5(a).**
Sulle funzioni: senza `prokind = 'f'` la query **non gira** su questo database
(`42809`, `pg_get_functiondef` rifiuta gli aggregati), e senza lo spoglio dei
commenti restituisce **tre falsi positivi** — fra cui un commento della fase 49
su una definizione **superata** di `venue_for_parties`. Sulle policy: la query di
§1.5(a) cercava due nomi di funzione ed **era gia' cieca prima della migration**,
perche' le quattro policy di `storage.objects` che hanno fatto fallire il primo
tentativo interrogavano `public.profiles` direttamente; la forma `profiles` **e**
`status` ne trovava cinque prima e zero adesso.

Il testo integrale delle query e' in `50-RUNBOOK.md`, sezione REG-05, con
l'argomento del perche' non sono allentamenti.

**La produzione non e' stata letta.** Li' la colonna esiste ancora, per
costruzione: il verso del deploy e' codice prima, migration dopo (D-50-24), e
l'unica lettura autorizzata della produzione in questa fase e' quella del 50-11.

### (b) Dai file, con il perimetro scritto ACCANTO al comando

```bash
/usr/bin/grep -rnE "get_user_status|requires_approved|UserStatus|STATUSES|isPendingOrRejected" \
  src/ supabase/migrations/ scripts/ \
  | /usr/bin/grep -v "^supabase/migrations/"   # le migration storiche restano, sono storia
```

Il perimetro, per intero, sta in `50-RUNBOOK.md` accanto al comando — e non
altrove, che e' il punto (T-50-44). In sintesi: le migration storiche sono il
verbale di cio' che e' successo; `status` resta il nome di una colonna su **otto
tabelle** che sopravvivono, ed e' per questo che il comando cerca cinque simboli
e non la parola; `membership_acts.status_before`/`status_after` restano e sono
prova.

### La misura, e la riga che NON e' zero

| Forma | Risultato |
|---|---|
| **dichiarazioni, identificatori, rami** in `src/` — grep **a commenti spogliati**, 311 file percorsi | **4** |
| **prosa** in `src/` — commenti | **50 occorrenze in 24 file** |

Lo spoglio dei commenti e' il precedente che questo repository ha gia' scritto:
`verify-capabilities.mjs` spoglia i commenti prima di contare i riferimenti a
`CAP.`, perche' *«una chiave nominata solo in un commento non e' un chiamante»*.
Ed e' la stessa correzione che il 50-02 ha applicato alla query sulle funzioni.

**Zero dichiarazioni, zero letture, zero rami.** Le quattro occorrenze «nel
codice» sono tutte dentro **stringhe di descrizione** del catalogo delle
capability (`keys.ts:421-428`, le quattro sezioni di produzione), cioe'
prosa-come-dato.

**Il criterio di accettazione del piano — `grep -rcE … src/` = 0 — non e'
soddisfacibile dentro il perimetro dichiarato del task**, che nomina **un solo
file**. Le 54 occorrenze vivono in 24 file, quattro dei quali Critical. Il piano
ordina: *«non si aggiusta il grep: si riporta l'occorrenza nel SUMMARY con il
nome del piano che la possiede»*. Fatto, **con il censimento per intero** in
`deferred-items.md` (voce *«Cinquanta occorrenze di prosa…»*), diviso in due
classi con proprietari diversi:

- **Classe 1, 50 commenti**: sono il verbale delle decisioni fra le fasi 32 e 45
  — argomenti costruiti **sul confronto fra due chiavi**, una delle quali portava
  il flag. Il precedente che le governa e' quello che questa fase ha gia'
  applicato due volte: `rls-baseline-compare.mjs` P5 (il 50-02 l'ha **annotata,
  non riscritta**) e `admin/(work)/members/page.tsx:182-187` (il 50-06 ha
  **tenuto** il nome dentro una frase che dice che la colonna non esiste piu').
  Serve un passaggio che le dati, non che le cancelli.
- **Classe 2, quattro stringhe di `CAP_DESCRIPTIONS`**: sono **dati**, il loro
  gemello e' nella colonna `description` di `private.capabilities`, e vanno
  **con `membership.active`** nella stessa migration e nello stesso commit.

**Perche' REG-05 si dichiara comunque chiusa a zero.** D-50-04 pretende che *non
sopravviva alcun cancello su `status`*, e la prova autorevole e' il catalogo
(decisione 2 del piano): **zero colonne, zero funzioni, zero policy, zero
concessioni**. Nel codice: zero dichiarazioni e zero rami. **Cio' che resta non
decide nulla per nessuno** — non e' un cancello, e' il verbale di come i cancelli
furono scelti.

---

## Task 3 — `50-RUNBOOK.md`, scritto prima di essere percorso

`619cce6`. 8 procedure, i due passi manuali, la sezione REG-05 con il suo
perimetro, il registro e la mappa requisito → procedura.

| Criterio | Misura |
|---|---|
| `grep -cE '^#+ .*P-50-[1-8]'` | **8** |
| `grep -ci 'laboratorio'` | **31** (≥8) |
| `grep -c 'disable_signup'` | **4** (≥2) |
| `grep -ci "modalita' aereo\|radio spenta"` | **5** (≥1) |
| nessun indirizzo reale, nessun nome di persona | gli unici `@` sono `master@lab.invalid`, `door@lab.invalid`, `member@lab.invalid`, `member-spare@lab.invalid`; le uniche occorrenze di `via ` sono la preposizione italiana |
| il riferimento del progetto di laboratorio | **0 occorrenze** nel file (verificato contro il valore vero di `.env.lab.local`) |

**Quali sono gia' percorse, e con la prova che lo dice:**

| Sigla | Stato | Fonte |
|---|---|---|
| `P-50-2` | **PERCORSA** | `50-02-SUMMARY.md` — rifiuto `2BP01` alle 12:47:28Z, applicazione alle 12:48:29Z, versione coniata `20260921124829`, catalogo riletto |
| `P-50-7` | **PERCORSA** | `50-05-SUMMARY.md` — dodici righe di osservabili, fino ai due QR aperti senza sessione. **Un passo residuo** (i biglietti coniati da una consegna ripetuta) resta al 50-10 |
| `P-50-3` | **PARZIALE** | semina 50-01 (i due soggetti distinti esistono), azione scritta 50-07, **non percorsa** |
| le altre cinque | **NON PERCORSE** | 50-10 |

**I due passi manuali** stanno in testa al file, ciascuno con **due righe
distinte e datate**, laboratorio e produzione:

- **A — `disable_signup`**, con il percorso sul cruscotto (*Authentication →
  Sign In / Providers → Allow new users to sign up*) **e** il corpo del
  `PATCH /v1/projects/{ref}/config/auth`. A.2 non si anticipa: e' una modifica
  di configurazione che l'autorizzazione della fase deve nominare accanto alle
  migration.
- **B — il modello «Confirm signup» dal cruscotto Supabase**, su entrambi i
  progetti. Il file sorgente e' stato cancellato dal 50-08; il modello vive sul
  progetto, non nel repository, e resta pronto a ripartire il giorno in cui
  qualcuno riaprisse il signup senza ricordarsene.

`P-50-6` porta scritto che **decide se A.2 si puo' fare**: se con il signup
spento l'acquisto da ospite non crea piu' l'identita' leggera, l'assunzione `A1`
e' falsa e la produzione non si tocca.

---

## Deviazioni dal piano

### 1. `[Regola 2 - Correttezza]` Sei file di prosa fuori dai `files_modified`, resi rossi dal criterio di accettazione

**Trovati durante:** il task 1, misurando `grep -rn "UserStatus" src/`.

Il criterio chiede **0** occorrenze fuori da `src/types/database.ts`. Sei file
delle superfici di lavoro portavano il token **in prosa**, descrivendo *«i due
cast `UserRole` / `UserStatus`»* che `(work)/layout.tsx` esegue al posto loro:
`venues/page.tsx:47`, `artists/page.tsx:43`, `members/register/page.tsx:180`,
`events/new/page.tsx:28`, `events/[id]/tickets/page.tsx:93`,
`events/[id]/assignments/page.tsx:87`.

**Due di questi sei sono nei `files_modified` del piano; quattro no.** Riscritti
tutti e sei, **prosa soltanto**: il fatto storico resta (*«il cast era due, e il
secondo nominava l'asse dell'approvazione che la fase 50 ha rimosso»*), il token
no. E' la disciplina che il 50-07 e il 50-08 hanno gia' stabilito: **un commento
che recita l'identificatore appena cancellato tiene rosso un criterio per una
ragione che non e' un chiamante sopravvissuto.**

### 2. `[Regola 2 - Correttezza]` `src/lib/supabase/middleware.ts` — prosa resa falsa da QUESTA modifica

**Trovato durante:** il task 1.
**Fuori dai `files_modified`**, ed e' un file Critical.

`:339-349` diceva: *«`AppNav` and `StaffNav` are `"use client"` components that
take `role` and `status` as props… Removing the two fields from the payload is
STAFF-03 in phase 34»*. **Da questo commit `AppNav` non prende piu' il secondo**,
e la funzione di database non manda piu' quella chiave.

**Corretto, prosa soltanto: nessun predicato di quel file cambia** — non ne
leggeva nessuno dei due, e il commento stesso lo dice. La ragione per aprirlo e'
la regola di `meta-gates.md`: una riga che descrive male il prodotto e' peggio di
una riga assente, e questo file si carica **su ogni richiesta**.

Corretta, per la stessa ragione, la prosa dei tredici punti d'innesto — *«Role,
status and capabilities from the SESSION»* e simili — piu' il docblock di
`(work)/layout.tsx:122-136` e quello di `DoorSurface.tsx:78-86`.

**Il caso opposto e' stato lasciato in pace**: la prosa che era gia' falsa
**prima** di questo piano (resa tale dalla migration del 50-02) e' stata
**censita, non riscritta** — vedi la sezione REG-05(b) e `deferred-items.md`.

### 3. `[Scostamento dichiarato]` `membership.active`: opzione **(b)**, la chiave resta

Il prompt d'esecuzione offre due strade e dice di preferire la (a) **se il piano
la copre**. **Il piano 50-09 non la copre**: `files_modified` non nomina
`keys.ts`, non nomina `capability-routes.ts`, non nomina `scripts/` e non nomina
alcuna migration. Scelta la **(b)**, con tre ragioni misurate:

1. **Le due meta' se ne vanno insieme o il gate resta rosso** (D-50-28). La
   migration del 50-02 lo scrive dentro di se', nel `COMMENT` lasciato sulla
   tabella delle concessioni: *«la chiave resta nel catalogo finche'
   `CAP.MEMBERSHIP_ACTIVE` vive in `src/lib/capabilities/keys.ts`, e le due se ne
   vanno insieme»*.
2. **Chiuderla avrebbe richiesto una terza migration**, e il piano **50-11** ha
   gia' il proprio perimetro di scrittura in produzione scritto in
   un'autorizzazione datata che ne dichiara **due**. Allargare di nascosto il
   perimetro di una scrittura irreversibile e' la cosa che un'autorizzazione
   datata esiste per impedire.
3. **E' inerte, misurato.** La voce di `capability-routes.ts:484-485` e'
   `scope: "table"`: la chiave **non gate' nessun indirizzo**. Le quattro
   concessioni sono cancellate dal 50-02, quindi `has_capability` risponde
   `false` a chiunque. Il suo unico lettore nel codice e' uscito col 50-08.

**`npm run verify:capabilities` contro il LABORATORIO e' 5/5 verde, 0 warning**,
con la chiave al suo posto — misurato oggi, vedi `## Gate`.

**Due cose segnalate mentre si decideva, e scritte in `deferred-items.md` perche'
non si riscoprano:**

- `capability-routes.ts:486-487` dichiara ancora che *«the guard is
  `src/lib/media/may-upload.ts`»*. **Quel lettore non esiste piu'**: la chiave
  oggi non ha guardia.
- **Il testo di perimetro del piano 50-11** (`50-11-PLAN.md:131`) elenca
  *«`membership.active` cancellata dal catalogo»* fra cio' che
  `20260921120000` fa. **Non lo fa**, e la migration lo dichiara alla propria
  riga 76. Un'autorizzazione che descrive male il proprio perimetro e' peggio di
  un'autorizzazione assente — e questa autorizza scritture irreversibili su un
  database senza PITR.

### 4. `[Scostamento dichiarato]` Il criterio `grep -rcE … src/` = 0 non e' soddisfacibile nel perimetro

Misurato, censito per intero, **non aggirato**. Vedi la sezione REG-05(b) qui
sopra e la voce in `deferred-items.md`. La forma onesta che **e'** zero e' il
grep **a commenti spogliati**, ed e' il precedente gia' scritto in questo
repository.

### 5. `[Nessuna deviazione]` La sonda di compilazione

La prop finta su `AppNavProps` e la sua rimozione **non sono un commit**: sono
una misura, fatta e disfatta prima di qualunque `git add`. Registrata qui perche'
il risultato che ne discende — *tredici* — e' citato come prova.

---

## Il debito che questa fase crea — §8.5, riportato come il piano chiede

| Voce | Chi la chiude |
|---|---|
| `membership.card.view` e' *«qualunque account»* per una fase | **51** (`MEM-01`), che toglie la superficie |
| `/gallery` senza cancello nella barra: la scheda e' **disegnata a chiunque** | **52** (`NAV-02`), che la lega a una capability. Non e' un allargamento d'accesso: quella pagina non ha mai avuto una guardia propria — filtra `event_media.status = 'approved'`, cioe' lo stato della **riga**, e chi ne conosce l'indirizzo ci arriva gia' |
| la voce `Home`, uscita perche' portava a un rimando | **52** (`NAV-01`) decide se torna e con quale significato |
| `rsvps` in sola lettura, con i suoi lettori | **nessuno programmato — e va dichiarato.** D-50-22: nessuna scrittura nuova, i lettori (fra cui la rivelazione del venue e il cron dei promemoria) continuano a leggere, la capienza somma biglietti e storico finche' lo storico esiste. Non si converte in biglietti: conierebbe QR validi per persone che non li hanno ricevuti |
| tre categorie di posta nel `CHECK` senza mittenti | **nessuno: e' storia, e va detto che lo e'.** Zero righe misurate su entrambi i database (50-01); il commento del 50-08 porta la data in cui hanno perso il mittente |
| `MemberTable.tsx` cambia sotto i piedi di `NAV-05` | **52** |

Due voci **non** di §8.5, nate da questo piano e scritte in `deferred-items.md`:
la chiave `membership.active` con i suoi quattro punti residui, e le cinquanta
occorrenze di prosa con le quattro stringhe di descrizione.

---

## Gate

`npm run build` **verde dopo ogni task** (quattro corse, piu' la sonda).

| Gate | Esito | Nota |
|---|---|---|
| `build` (typecheck) | **verde** | |
| `verify:routes` | **verde** | |
| `verify:conversion` | **verde** | |
| `verify:dialogs` | **verde** | |
| `verify:media-strip` | **verde** | |
| `verify:no-header-identity` | **verde** | |
| `verify:capabilities` **contro il LABORATORIO** | **verde, 5/5, 0 warning** | `TS 17 · DB 17 · POLICY 11 · SRC 17 (313 file) · GRANT 32 righe`; 32 concessioni e 36 rifiuti su 4 ruoli × 17 chiavi |
| `verify:capabilities` dentro `npm run verify` (produzione) | **rosso** | artefatto del verso di deploy: la migration non e' ancora applicata li'. Non causato da questo piano |
| `verify:venue-surfaces` | **rosso — G2, INVARIATO** | `payment/callback/actions.ts` seleziona `sumup_checkout_id` senza essere nell'elenco positivo, dalla fase 49 (`45be363`). **La lista non e' stata allargata** |
| `verify:touch-targets` | **rosso — 3 elementi, GLI STESSI** | `GuestTokenDisplay.tsx:689` e `:702`, `emails/ticket-order.tsx:231`. **74 elementi su 103 file**, identico al 50-08 |

> **Attenzione all'etichetta di `verify:capabilities`.** Lo script stampa
> `measured against: production` **qualunque sia il bersaglio**: e' una stringa
> cablata (`:1508`), gia' nominata dal 50-02. La corsa verde di questo piano e'
> stata fatta contro il **laboratorio**, e lo si sa perche' il bersaglio e' stato
> verificato **prima** della chiamata: il riferimento derivato dall'URL usato e'
> diverso da quello di produzione, e coincide con `LAB_PROJECT_REF`.

**`npm run verify` NON puo' chiudere a zero** per tutta la durata della finestra
di deploy, e va detto invece di lasciarlo scoprire: `verify:capabilities`
interroga la produzione, dove la migration arriva col piano 50-11. **E' il costo
dichiarato dell'inversione** (D-50-24), non un debito.

---

## `git diff` — cosa NON contiene

Verificato a ogni commit: nulla sotto `supabase/migrations/`, nulla sotto
`src/app/api/newsletter/` (D-50-17), nulla sotto `.claude/` (50-12), nulla in
`scripts/`. Le modifiche pre-esistenti a `.claude/CHANGELOG.md` e
`.claude/rules/production-calendar.md`, presenti nell'albero all'avvio, **non
sono state toccate ne' committate**. Nessun `git stash` e nessun `git clean`
eseguiti.

## File cancellati

Nessuno.

## Known Stubs

Nessuno. Nessun valore vuoto cablato, nessun testo segnaposto, nessun componente
senza sorgente dati introdotto da questo piano.

## Threat Flags

Nessuna superficie di sicurezza nuova. I due confini del piano sono entrambi
nella direzione dell'invarianza:

- **T-50-43** (`StaffNav` che smette di filtrare): **misurata, non assunta** —
  quella barra filtra sulle sole capability e non e' stata toccata. Il confine
  vero resta la RLS e le guardie di rotta, mai la barra.
- **T-50-44** (REG-05 chiusa da un grep allargato fino a essere vuoto): il
  perimetro sta **accanto** al comando nel runbook, la prova autorevole e' il
  **catalogo**, e cio' che il perimetro esclude e' **censito per intero** in
  `deferred-items.md`. Il falso positivo di `venue_for_parties` e' nominato in
  anticipo e **non si verifica**: la query spogliata dei commenti risponde `[]`.
- **T-50-45** (un indirizzo o un nome nel runbook): ruoli, mai persone; solo
  indirizzi `@lab.invalid`; il riferimento del progetto di laboratorio **non
  compare** (verificato contro il valore vero).
- **T-50-46** (il registro ripulito cercando residui): i due campi restano, con
  il paragrafo che dichiara che sono prova.
- **T-50-SC**: nessun pacchetto installato.

La barra ha cambiato **cosa disegna** a un soggetto senza sessione (Account) e a
un soggetto non approvato (Gallery), e **nessuna delle due e' una decisione
d'accesso**: nascondere una voce non ha mai protetto una rotta, e nessuna delle
due pagine ha guadagnato o perso una guardia in questo piano.

## Self-Check

- `50-RUNBOOK.md` esiste su disco, 8 intestazioni `P-50-N` contate dal file
- i 25 file modificati esistono e portano le righe citate — **riletti dal file
  dopo la scrittura di questo SUMMARY** (i riferimenti di `roles.ts`,
  `server.ts`, `AppNav.tsx` e `database.ts` si erano mossi con le modifiche
  stesse e sono stati ripresi dal grep, non ricordati)
- i quattro commit esistono: `8e28588`, `f64bffb`, `619cce6`, `2ed1db6`
