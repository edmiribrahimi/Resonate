---
phase: 51-via-le-superfici-da-socio-e-la-porta
plan: 11
subsystem: access-gating
tags: [registro-atti, account-acts, rinomina, D-51-08, D-51-15, banchi, rls-baseline]

requires:
  - phase: 51-via-le-superfici-da-socio-e-la-porta
    plan: 09
    provides: "le sette letture di `membership_code` gia' uscite da `admin/members/actions.ts`, e il disambiguatore a 8 cifre come forma gia' stabilita"
  - phase: 51-via-le-superfici-da-socio-e-la-porta
    plan: 10
    provides: "`UserRole` con `attendee` e `Profile` senza il codice socio — cioe' `database.ts` gia' fermo, pronto a ricevere il rinomina del tipo di riga"
  - phase: 51-via-le-superfici-da-socio-e-la-porta
    plan: 08
    provides: "il ruolo `attendee` gia' seminato dai due banchi: qui si tocca solo la colonna della credenziale"

provides:
  - "`src/lib/account/acts.ts` — il vocabolario del registro, spostato con la sua storia e i suoi dieci valori"
  - "`AccountAct`, `AccountActorKind`, `AccountActRow`: tre tipi rinominati e nessun consumatore rimasto indietro"
  - "zero occorrenze di `membership_acts` e `record_membership_act` sotto `src/`, commenti compresi"
  - "la pagina del registro che MOSTRA `subject_label` invece di ricostruirlo, e distingue «esiste senza nome» da «non c'e' piu'» dal DATO"
  - "tre banchi scritti per lo schema DOPO il piano 51-12, che lo dichiarano accanto a se' stessi"

affects:
  - "51-12 — la migration deve rinominare funzione, tabella, i due CHECK e la policy ESATTAMENTE con i nomi che questo piano ha gia' scritto nel codice; e deve ridefinire `record_account_act` partendo dal corpo che il piano 51-08 ha lasciato"
  - "51-13 — i due passi (questo codice e quella migration) vanno in produzione dentro un solo atto autorizzato, uno dopo l'altro: fra i due la creazione di un account fallisce"
  - "la corsa della linea di base RLS — `npm run baseline:rls` e `baseline:container` non girano finche' la migration del 51-12 non e' applicata, e lo dicono"

tech-stack:
  added: []
  patterns:
    - "Un modulo che e' LA SORGENTE di un letterale si sposta con ogni suo importatore nello stesso commit: non c'e' redirect per un import, e il build e' l'unico gate"
    - "Un rinomina non e' una modifica di insieme: quando un `CHECK` specchia un'unione, dichiarare che cambia TABELLA e non valori evita che il prossimo lettore creda rotto lo specchio"
    - "Una superficie mostra l'etichetta che la riga porta e non ne calcola una propria: due etichette sullo stesso atto divergerebbero sulle righe vecchie, e un registro append-only non puo' avere due verita'"
    - "«Esiste e non ha nome» si distingue da «non c'e' piu'» dal DATO (un insieme degli id letti davvero), mai dall'etichetta vuota"
    - "Grep-igiene estesa ai nomi ritirati: nemmeno il commento che spiega il rinomina scrive il nome vecchio, cosi' che una ricerca per nome trovi i lettori veri"
    - "Un banco scritto per lo schema di domani lo dichiara in testa e dice COME fallisce su quello di oggi — nei due versi, con i due SQLSTATE"

key-files:
  created:
    - "src/lib/account/acts.ts (da `src/lib/membership/acts.ts`, con `git mv`)"
  modified:
    - "src/types/database.ts"
    - "src/app/(admin)/admin/members/actions.ts"
    - "src/app/(admin)/admin/(work)/members/register/page.tsx"
    - "src/app/(admin)/admin/(work)/members/page.tsx"
    - "src/app/(admin)/admin/events/[id]/assignments/actions.ts"
    - "src/app/api/auth/callback/route.ts"
    - "src/lib/email-delivery/categories.ts"
    - "src/lib/door/outcome.ts"
    - "scripts/rls-baseline.mjs"
    - "scripts/container/seed.mjs"
    - "scripts/seed-lab-door.mjs"

key-decisions:
  - "I dieci valori dell'unione restano tutti: quattro non li scrive piu' nessuno dalla fase 50, ma sono valori da LEGGERE e un'unione che non sa nominare una riga esistente rende illeggibile la storia che il registro esiste per conservare"
  - "Il nome vecchio non si scrive nemmeno nel commento che racconta il rinomina (grep-igiene, pattern della fase 51 piano 09): il docblock spiega il passaggio senza nominarlo"
  - "Il ripiego dell'etichetta dell'attore non e' sparito ma e' cambiato di fonte: dal codice letto su `profiles` alle prime 8 cifre di `actor_id`, che e' un dato dell'ATTO e non di un'altra tabella"
  - "La voce `attendances` esce da `PROBE_PAYLOADS` insieme al rinomina: la stessa migration toglie la tabella (D-51-14) e un solo residuo basta a fermare la corsa dopo"
  - "La sentinella di `subject_label` nel probe smette di avere forma di credenziale: un banco che conia stringhe a forma di codice dice una cosa falsa su di se' a chiunque trovi la riga"
  - "Il titolo visibile della pagina resta «Membership acts»: cambiarlo e' una decisione di copy sul nome della superficie, non un effetto del rinomina degli oggetti — sta alla verifica di fase, non qui"

patterns-established:
  - "Quando un piano di codice precede la sua migration, ogni file scritto per lo schema futuro porta accanto a se' la finestra: cosa fallisce, con quale SQLSTATE, e quale piano la chiude"

requirements-completed: [MEM-01]

duration: ~70min
completed: 2026-09-22
---

# Fase 51 Piano 11: il registro degli atti si chiama `account_acts` nel codice — Riepilogo

**Il vocabolario del registro vive in `src/lib/account/`, i tre tipi e ogni
chiamante portano il nome nuovo, la pagina del registro ha smesso di
ricostruire un'etichetta che la funzione SQL calcolera' da se', e i tre banchi
seminano cio' che lo schema avra' — dichiarando, accanto a se' stessi, che
finche' la migration del piano 51-12 non e' applicata non girano.**

## Performance

- **Durata:** ~70 minuti
- **Task:** 3, piu' un quarto commit di correzione (sotto, fra le deviazioni)
- **File modificati:** 11 (uno dei quali spostato con `git mv`)
- **Verifica:** `npm run build` **exit 0** dopo ogni task — nessun test runner
  esiste per il prodotto (`meta-gates.md`). In piu': `npm run verify:persona`
  **7/7 verdi** (nessun path morto dopo la cancellazione di
  `src/lib/membership/`) e `npm run verify:mirror-guards` **MIRROR_GUARDS_OK**.

## Cosa e' stato fatto

### Task 1 — il modulo si sposta, i due tipi cambiano nome (`dc917a4`)

`git mv src/lib/membership/acts.ts src/lib/account/acts.ts`, directory vecchia
cancellata. `MembershipAct` → `AccountAct`, `MembershipActorKind` →
`AccountActorKind`, e in `database.ts` `MembershipActRow` → `AccountActRow`.

Il modulo resta **la sorgente**: continua a non importare nulla, per la ragione
gia' scritta nel suo docblock. L'unione ha ancora **dieci** valori.

Il docblock guadagna un blocco che dichiara la cosa che un lettore sbaglierebbe
da solo: **il `CHECK` cambia tabella e non valori**. La regola dell'unico commit
(«modificare un insieme significa modificarlo su entrambi i lati») non e' stata
violata, perche' questo non e' un commit che modifica un insieme.

### Task 2 — i tre chiamanti (`6eebe34`)

`rpc("record_membership_act")` → `rpc("record_account_act")`;
`from("membership_acts")` → `from("account_acts")`; i due `CHECK` e la policy di
lettura nominati con il nome che prendono dal piano 51-12.

**La pagina del registro ha smesso di leggere `profiles.membership_code`.** Il
`select` chiede ora solo `id, full_name`. Cio' che quella colonna copriva —
un account che esiste e non ha nome — resta coperto, ma **dal dato**: un
`Set` degli id davvero trovati distingue i quattro casi che quella funzione
distingue apposta («e' il sistema», «non c'e' piu'», «c'e' e non ha nome»,
«non ho potuto leggere»), e l'account senza nome si nomina con le **prime 8
cifre del proprio identificativo**, che e' un dato dell'atto e non di un'altra
tabella.

### Task 3 — i banchi e la linea di base (`a6879fb`, corretto da `2035590`)

- `rls-baseline.mjs`: la voce del probe si chiama `account_acts` e torna al suo
  posto alfabetico; la sentinella di `subject_label` passa da una stringa a
  forma di credenziale alla sentinella generica del probe; `profiles` perde la
  colonna dal payload; la voce `attendances` esce.
- `container/seed.mjs` e `seed-lab-door.mjs`: gli `insert` non scrivono piu'
  quella colonna. In `seed.mjs` il campo delle persone e' uscito **con il suo
  unico scrittore** invece di restare vuoto.
- `seed-lab-door.mjs` conserva il rifiuto del ref di produzione come prima riga
  eseguita. `rls-baseline-compare.mjs` **non compare nel diff** (D-50-02).

## LA FINESTRA — cosa non funziona finche' il piano 51-12 non e' applicato

**E' il verso dichiarato della fase: codice prima, schema dopo.** Queste sono
le righe che dipendono dall'applicazione della migration del piano 51-12, per
nome e per numero:

| File:riga | Cosa dipende | Cosa succede prima della migration |
|---|---|---|
| `src/app/(admin)/admin/members/actions.ts:805` | `rpc("record_account_act", …)` | **la creazione di un account fallisce** — `42883`, e l'azione risponde `write_failed` con il suo avviso |
| `src/app/(admin)/admin/(work)/members/register/page.tsx:229` | `from("account_acts")` | la pagina del registro non legge — `42P01`, e mostra il suo stato d'errore, che e' scritto apposta per non somigliare a un registro vuoto |
| `src/app/(admin)/admin/(work)/members/register/page.tsx:189, :466` e `…/members/page.tsx:185` | il nome della policy `account_acts_select_register_read` | prosa: nomina la policy come si chiamera' (il `RENAME TO` non muove i satelliti, li rinomina il 51-12 uno per uno) |
| `src/app/(admin)/admin/members/actions.ts:373, :502` | i due `CHECK` `account_acts_act_check` e `account_acts_actor_attributed` | prosa, stessa ragione |
| `scripts/rls-baseline.mjs:1155` (voce `account_acts`) e l'assenza della voce `attendances` | i nomi delle tabelle RLS del bersaglio | `baseline:rls` **si ferma subito e lo dice**, dai due lati del controllo: «has no entry for» e «names tables that are not RLS-enabled tables» |
| `scripts/rls-baseline.mjs` (payload `profiles`), `scripts/container/seed.mjs:495, :519`, `scripts/seed-lab-door.mjs:245` | l'assenza della colonna della credenziale nell'`insert` | **`23502`**: quella colonna e' `text UNIQUE NOT NULL` **senza default** (`schema.sql:58`), quindi ometterla oggi e' una violazione di not-null |

**Non esiste una forma che vada bene a entrambi gli schemi**, e i due versi
falliscono in due modi diversi: ometterla prima da' `23502`, nominarla dopo
darebbe `42703`. Per questo i banchi dichiarano in testa per quale schema sono
scritti.

**In produzione i due passi stanno dentro un solo atto autorizzato, uno dopo
l'altro (piano 51-13)**, e la finestra dura minuti su un progetto senza
traffico. Sul laboratorio dura quanto il piano 51-12.

**Il laboratorio, al momento di questo piano, e' alla migration 1** (ruolo
`attendee`): `membership_acts` e `profiles.membership_code` esistono ancora la'.
Quindi nessuno dei tre banchi e nessuna creazione di account funziona contro il
laboratorio finche' il 51-12 non e' applicato — e **non e' un difetto da
indagare**, e' questa finestra.

**Cosa il piano 51-12 deve rispettare, alla lettera:** funzione
`record_account_act`, tabella `account_acts`, `CHECK` `account_acts_act_check` e
`account_acts_actor_attributed`, policy `account_acts_select_register_read`.
Sono i nomi gia' scritti nel codice; una migration che ne scegliesse altri
lascerebbe la finestra aperta per sempre. E `record_account_act` si ridefinisce
**partendo dal corpo che il piano 51-08 ha lasciato** (D-51-15: `subject_label`
= prime 8 cifre di `subject_id`, nella stessa migration del `DROP COLUMN`).

## Deviazioni dal piano

### 1. [Rule 3 — bloccante] I tipi dei due importatori sono entrati nel commit del task 1

Il task 1 chiede `npm run build` verde, ma il rinomina dei tipi rompe
`register/page.tsx` e `members/actions.ts`, che sono file del task 2. Sono
entrati nel primo commit **i soli rinomina di tipo**; le stringhe a runtime e la
prosa sono rimaste al task 2. E' lo stesso precedente del piano 51-09
(`WritableRole` nel commit del task 1).

### 2. [Rule 3 — bloccante] Due file fuori da `files_modified`

Il criterio del task 2 chiede **zero** occorrenze di `membership_acts` sotto
`src/`. Due file lo violavano e non erano in elenco:

- `src/app/(admin)/admin/events/[id]/assignments/actions.ts:284` — un commento
  che nomina la tabella;
- `src/app/(admin)/admin/(work)/members/page.tsx:185` — il nome della policy.

Piu' `src/lib/door/outcome.ts:74`, che citava il modulo **per path**: una
citazione a un file che non esiste piu' e' un path morto, e l'ha seguito.

### 3. [Rule 2 — funzionalita' mancante] Il campo orfano nelle persone di `seed.mjs`

Il piano dice «qui si tocca **solo** la colonna». Tolto l'`insert`, il campo
`membershipCode` delle persone restava **senza un solo lettore**, insieme a due
paragrafi che ne giustificavano la forma. E' uscito con il suo unico scrittore:
un campo che nessuno riempie e' una domanda per chi legge (pattern registrato
dal piano 51-09).

### 4. [Rule 2] La voce `attendances` fuori da `PROBE_PAYLOADS`

Il piano non la nomina. Ma la stessa migration del 51-12 **toglie quella
tabella** (D-51-14), e `PROBE_PAYLOADS` viene confrontata con l'elenco delle
tabelle RLS del bersaglio nei due versi: lasciarla avrebbe fermato la prima
corsa dopo la migration su un residuo che non c'entra con cio' che si stava
misurando. Nessun altro piano della fase tocca quel file.

### 5. [Rule 1 — bug] Un commento che diceva mezza verita' (`2035590`)

I commenti scritti nel task 3 spiegavano il `42703` che si prenderebbe
**tenendo** la colonna dopo il `DROP`, e tacevano che **toglierla la rompe
anche oggi** con `23502`. Corretto in un commit a parte: chi lancia il banco
prima del 51-12 leggerebbe il fallimento come un difetto.

## Cosa NON e' stato fatto, e perche'

- **Il titolo visibile della pagina resta «Membership acts»**, e la rotta resta
  `/admin/members/register`. Il piano rinomina gli **oggetti**, non la copy di
  una superficie; e il docblock di quel file registra che il suo titolo e' una
  decisione presa con cura (non si chiama «libro soci» apposta). Cambiarlo e'
  una decisione di copy, da prendere dove si prendono quelle.
- **`src/utils/qr.ts:54-57`** continua a nominare `membership_code`: dice
  esplicitamente che la colonna, il suo trigger e il suo tipo escono con il
  piano 51-12. E' una citazione corretta del piano che la chiude, non un
  lettore rimasto indietro.
- **`rls-baseline-compare.mjs`** non e' stato toccato (D-50-02): confronta due
  artefatti su disco, non un database.

## Note per chi verifica

- La pagina del registro **non e' stata aperta in un browser**: non esiste test
  runner e il laboratorio e' alla migration 1, quindi quella lettura non puo'
  riuscire oggi. La prova osservabile e' rimandata al piano 51-12, che crea
  davvero un account sul laboratorio e legge la riga che ne esce.
- I tre banchi **non sono stati eseguiti**, per la stessa ragione; sono stati
  verificati con `node --check` (sintassi) e per grep.

## Tracking — e perche' e' stato fatto a mano

`gsd-sdk query state.advance-plan` e `state.update-progress` sono stati
**lanciati e annullati**: su questo `STATE.md` hanno scritto
`completed_plans: 57` su `total_plans: 56` (cioe' 100% su una fase a meta'),
hanno portato «Plan: 1 of 14» a «2 of 14» — un numero che non corrisponde a
nessuna posizione reale — e hanno riscritto **una riga di prosa dentro il
racconto della fase 37**, sostituendo *«Status: Executing Phase 51»* con
*«Status: Ready to execute»* a 250 righe di distanza dal punto in cui quella
frase significava qualcosa. `git checkout` ha rimesso il file com'era.

Al suo posto, la modifica misurata e minima:

- `ROADMAP.md`: `51-11-PLAN.md` spuntato, e **11/15 → 12/15**, contato dai
  SUMMARY su disco — la stessa modifica che l'orchestratore fa fra un'onda e
  l'altra (`2967ec7`).
- `STATE.md`: **solo il frontmatter**, `last_updated` e
  `completed_plans 45 → 46`. Il contatore globale era gia' indietro prima di
  questo piano e **non e' stato ricalcolato**: sommare uno a un conteggio
  lasciato indietro e' onesto, riscriverlo su una semantica che non ho potuto
  stabilire non lo sarebbe.
- `requirements.mark-complete` **non e' stato eseguito**: questo progetto non ha
  un `REQUIREMENTS.md` — i requisiti stanno nelle tabelle di `ROADMAP.md`, e
  `MEM-01` e' li'.

## Self-Check: PASSED

Verificato dopo la scrittura di questo riepilogo:

- `src/lib/account/acts.ts` — **FOUND**; `src/lib/membership/` — **assente**
- `AccountActRow` in `src/types/database.ts` — **FOUND**
- `record_membership_act` / `membership_acts` sotto `src/` — **0 occorrenze**
- `membership_code` nei tre banchi — **0 occorrenze**
- `account_acts` in `scripts/rls-baseline.mjs` — **FOUND**;
  `PRODUCTION_REF` in `scripts/seed-lab-door.mjs` — **FOUND**
- commit `dc917a4`, `6eebe34`, `a6879fb`, `2035590` — **tutti presenti in
  `git log`**
- `npm run build` — **exit 0**
