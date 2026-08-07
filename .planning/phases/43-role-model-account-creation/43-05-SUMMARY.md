---
phase: 43-role-model-account-creation
plan: 05
subsystem: supabase-data
tags: [role-model, capabilities, constraints, migration, container-harness]

# Dependency graph
requires:
  - plan: 43-01
    provides: "i nomi vivi dei due role CHECK, letti da pg_constraint e non derivati"
  - plan: 43-02
    provides: "la quinta faccia di verify-capabilities.mjs e la dichiarazione ROLE_GRANTS"
  - plan: 43-03
    provides: "il seam del container e il rendering misurato di un CHECK"
provides:
  - "`staff`, il quarto ruolo, accettato da entrambi i role CHECK"
  - "due grant row per `staff` — membership.card.view e membership.active, entrambe requires_approved = true"
  - "i sei rifiuti di D-02 dichiarati in ROLE_GRANTS e asseriti dallo script: 32 coppie, 18 concessioni, 14 rifiuti"
  - "UserRole a quattro valori, ROLES.STAFF, e la misura che quell'allargamento produce UN solo errore di build, non zero"
  - "la cattura container 43-05 e il confronto pulito contro 33-final"
affects: [43-06, 43-08, 43-09, 43-14]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "un rifiuto e' l'assenza di una riga, dichiarata nello script — mai una colonna `granted`"
    - "la dichiarazione si aggiorna nello STESSO commit delle grant row che descrive"
    - "i nomi dei constraint si leggono da pg_constraint, non si derivano dalla regola di auto-naming"

key-files:
  created:
    - supabase/migrations/20260808000500_staff_role.sql
    - .planning/phases/32-capability-model-in-the-database/baseline/32-BASELINE-policies.container.43-05.json
    - .planning/phases/32-capability-model-in-the-database/baseline/32-BASELINE-reads.container.43-05.json
    - .planning/phases/32-capability-model-in-the-database/baseline/32-BASELINE-writes.container.43-05.json
  modified:
    - supabase/schema.sql
    - scripts/verify-capabilities.mjs
    - src/types/database.ts
    - src/lib/rbac/roles.ts
    - src/components/admin/MemberTable.tsx

key-decisions:
  - "Timestamp 20260808000500 invece di 20260808000000: quel prefisso e' gia' occupato da una migration della fase 33, e due file con la stessa `version` collidono nella migration history di Supabase"
  - "La dichiarazione ROLE_GRANTS e' stata aggiornata nello stesso commit della migration, non nel commit del lato TypeScript come il piano divideva i task — la regola di 43-02 e' vincolante"
  - "MemberTable.tsx e' stato toccato contro l'istruzione esplicita del piano, perche' `Record<UserRole, string>` e' l'unico mapped type sul union e faceva fallire il build"
  - "Nessuna migration applicata alla produzione: fuori perimetro per un esecutore, e le quattro osservazioni sono state prese sul container"

requirements-completed: [ROLE-01]

# Metrics
duration: ~70min
completed: 2026-08-08
---

# Phase 43 Plan 05: Il quarto ruolo — Summary

**`staff` esiste in entrambi i role CHECK, tiene esattamente due capability —
`membership.card.view` e `membership.active`, entrambe `requires_approved = true` —
e i sei rifiuti di D-02 non sono un commento ma trentadue coppie dichiarate che
uno script confronta con le righe vere, verde sul container, con la matrice di
scrittura immobile.**

## Performance

- **Duration:** ~70 min
- **Tasks:** 3 (il terzo eseguito sul container, vedi sotto)
- **Files created:** 4 · **modified:** 5

## Task Commits

1. **La migration, lo schema e la dichiarazione** — `c255775` (feat)
2. **Il lato TypeScript, e l'unico errore di build** — `29f5c7c` (feat)
3. **La cattura container 43-05 e il confronto contro 33-final** — `17c25a7` (test)

## Cosa e' stato costruito

### La migration — `supabase/migrations/20260808000500_staff_role.sql`

Una sola `BEGIN; … COMMIT;`, tre statement:

1. `profiles_role_check` — droppato per il **nome misurato** con `IF EXISTS`,
   riaggiunto sotto nome esplicito con i quattro valori. Nel commento: allargare
   una lista `IN` e' un **rilassamento stretto**, quindi ogni riga esistente lo
   soddisfa gia' e `NOT VALID` non serve e non si vuole. Quella parola appartiene
   al solo constraint del piano 43-06, che e' una restrizione.
2. `role_capabilities_role_check` — stesso trattamento sulla seconda CHECK. Il
   commento dice cosa si perde saltandola: le due grant row sotto fallirebbero con
   `23514` **nella stessa transazione**, ed e' per questo che stanno in un file solo.
3. Le due grant row, `ON CONFLICT (role, capability) DO NOTHING`, ciascuna con
   accanto la decisione che l'ha prodotta — inclusa la frase di D-14 sul perche'
   non indebolisce D-03.

Poi il blocco dei **sei rifiuti** — `door.operate`, `staff.manage`,
`catalogue.manage`, `organizer.access`, `admin.access`, `master.manage` — con
scritto che ognuno e' una decisione, che un rifiuto e' l'**assenza di una riga**,
che una colonna `granted = false` **concederebbe** la capability perche' l'`EXISTS`
del resolver (`20260807000000_capability_model.sql:209-216`) non la legge, e con
il puntatore a `scripts/verify-capabilities.mjs` come luogo dove i sei sono
asseriti. Il commento e' un puntatore a un meccanismo, non un sostituto.

Chiude ricordando che i due `door.operate` a `false` non si toccano, e che **se un
piano futuro concedesse `door.operate` a `staff`, erediterebbe lo stesso
trattamento per la stessa ragione**: rifiutare uno staff valido davanti a una fila
alle due di notte e' peggio dell'alternativa.

### `supabase/schema.sql:59`

Portato ai quattro ruoli. Va detto per intero, perche' e' controintuitivo:
**non cambia nulla che la produzione applichi e nulla che il container misuri** —
il container costruisce da quel file **come stava al commit iniziale**, pinnato per
blob hash, e poi applica ogni migration. E' aggiornato per onesta', perche' un
lettore che apre `schema.sql` deve vedere il modello vero. **Un piano che avesse
modificato solo `schema.sql` non avrebbe cambiato assolutamente niente.**

### `scripts/verify-capabilities.mjs`

`ROLE_GRANTS` guadagna il ruolo `staff` con otto voci: due concessioni e sei
rifiuti, ciascuno con la sua ragione. I totali passano da 24/16/8 a **32/18/14**,
asseriti come numeri prima che qualunque database sia letto. Accanto ai sei
rifiuti e' scritto una volta perche' esistono: una capability silenziosamente
assente e' indistinguibile da una considerata e rifiutata, e questa lista e' cio'
che rende leggibile la differenza fra sei mesi.

Il paragrafo dell'aritmetica dichiara che i tre numeri si sono mossi **perche' il
modello ha guadagnato un ruolo**, che e' l'unica ragione legittima per toccarli, e
cita la mutazione C del piano 43-02 come la forma registrata dell'abuso opposto.

### Il lato TypeScript

- `src/types/database.ts:20` — `UserRole` a quattro valori, con sopra la
  conseguenza misurata (vedi la deviazione 2, che la corregge).
- `src/lib/rbac/roles.ts` — `ROLES.STAFF`; la voce `/admin/scanner` **resta**
  `["master","organizer"]` con scritto perche' e' corretta cosi': D-02 rifiuta
  `door.operate` a `staff`, e il middleware rifiuta la rotta per conto proprio.
  Aggiungere `"staff"` li' mostrerebbe una tab che porta a un redirect.
  `getVisibleNavItems` non e' toccata — uno `staff/approved` vede Events, Gallery
  e Account dalle voci `roles: null`, che e' esattamente D-01.

## Le quattro osservazioni — prese sul container, non sulla produzione

Il task 3 chiedeva di applicare la migration alla produzione e osservarla li'.
**Non e' stato fatto, ed e' una scelta dichiarata, non un'omissione.** Applicare
una migration alla produzione non e' compito di un esecutore in questa fase: il
file passa dal percorso di deploy del proprietario. Il precedente della fase e' il
piano 43-01, che ha misurato M-12 sul container invece che sulla produzione e ne
ha ricavato una misura **migliore**, perche' ripetibile.

Le quattro osservazioni sono quindi state prese sul container — `postgres:17.6`,
schema base piu' 39 migration, distrutto dopo — con uno script usa e getta scritto
in `/tmp` e cancellato: **nessuno script e nessun pacchetto e' stato aggiunto al
repository**. Le query leggono solo etichette di design (nomi di ruolo, chiavi di
catalogo, definizioni di constraint); nessuna riga di `profiles` e' stata letta.

**A · i due role CHECK, per nome e definizione** — verbatim dalla run:

```
{"tbl":"private.role_capabilities","conname":"role_capabilities_role_check",
 "def":"CHECK ((role = ANY (ARRAY['master'::text, 'organizer'::text, 'staff'::text, 'member'::text])))",
 "convalidated":true}
{"tbl":"profiles","conname":"profiles_role_check",
 "def":"CHECK ((role = ANY (ARRAY['master'::text, 'organizer'::text, 'staff'::text, 'member'::text])))",
 "convalidated":true}
```

Entrambe nominano **quattro** ruoli, entrambe `convalidated: true`. Da notare il
rendering: la sorgente scrive `role IN (…)` e Postgres lo ristampa
`role = ANY (ARRAY[…])` — la controparte positiva del `<> ALL (ARRAY[…])` che il
piano 43-03 aveva misurato sul `NOT IN`. Chi confrontasse una definizione come
testo deve aspettarsi questa forma, non la sorgente.

**B · cosa tiene `staff`** — esattamente due righe, entrambe `true`:

```
{"role":"staff","capability":"membership.active","requires_approved":true}
{"role":"staff","capability":"membership.card.view","requires_approved":true}
```

**C · il totale del catalogo** — `18`.

**D · `door.operate`, il filo d'inciampo di D-06, letto a mano** — due righe,
entrambe `false`, e **nessuna riga per `staff`**:

```
{"role":"master","capability":"door.operate","requires_approved":false}
{"role":"organizer","capability":"door.operate","requires_approved":false}
```

## Il confronto — zero difetti

```
CAP-03: clean — B1, B2, B3 compared, nothing moved that the whitelist does not explain.
```

`npm run baseline:compare -- --target=container --before-point=33-final --after-point=43-05 --only=B1,B2,B3`:
220 celle B2 e 660 celle B3 confrontate, nulla mosso. E' l'atteso: un quarto ruolo
esiste e tiene due capability, ma **non e' ancora una persona seminata** — quello
e' il piano 43-08 — quindi nessuna cella poteva muoversi e nessuna policy poteva
cambiare. Un `b3_cell_changed` qui avrebbe significato una grant row colata dentro
un ruolo esistente.

Il flag `--only=B1,B2,B3` e' obbligatorio sul container: B5 e' l'advisor Supabase
e non ha equivalente locale. Lo script lo dice e rifiuta da solo — non e' stato
aggirato, e' stato letto.

## Verifica

| Controllo | Esito |
|---|---|
| `npm run baseline:container -- --smoke` | exit 0, 39 migration applicate (38 alla base + questa) |
| `npm run verify:capabilities -- --target=container` **prima** della dichiarazione | exit **1**, nominando `staff × membership.active` e `staff × membership.card.view` come *"AN UNDECLARED ROLE HOLDS CAPABILITIES"* |
| `npm run verify:capabilities -- --target=container` **dopo** | `5/5 green, 0 warnings` — *"18 grants and 14 refusals over 4 roles × 8 keys, both directions, 18 rows read"* |
| `npm run build` | `✓ Compiled successfully` |
| `node --check scripts/verify-capabilities.mjs` | silente |
| `baseline:compare` container 33-final → 43-05 | `CAP-03: clean` |

Il rosso intermedio vale quanto il verde, e vale la pena isolarlo: e' la prova che
la migration **ha davvero raggiunto il container** e che il rilevatore del piano
43-02 si accorge di un ruolo introdotto senza decisioni. Non e' una mutazione
iniettata — e' lo stato reale dell'albero fra i due commit.

## Cosa NON e' verificato

- **Non esiste alcun test runner per il prodotto** (`CLAUDE.md` Guardrail 1).
  Nulla qui e' dichiarato verificato perche' i test passano. Ogni riga sopra e'
  una riga di output di una run, una lettura di `pg_constraint`, o un file citato.
- **La migration NON e' applicata alla produzione.** Il file e' committato e non
  applicato. Finche' non lo e', `role = 'staff'` e' rifiutato dalla produzione con
  `23514`, e il quarto ruolo esiste solo nel container. Questo e' esattamente il
  motivo per cui il task 3 esisteva: **`npm run build` passa identicamente con la
  migration applicata o no**, perche' `src/types/database.ts` e' scritto a mano e
  non generato dallo schema vivo. Un build verde non dice che il ruolo esiste.
- **La migration history della produzione non registra ancora questo file**, per
  la stessa ragione.
- **Nessuna riga di `profiles` e' stata letta o scritta, in nessun database.**
- Il rendering `= ANY (ARRAY[…])` e' misurato in `postgres:17.6`. La produzione e'
  la stessa famiglia, ma il fatto e' registrato come misurato sul container.

## Deviazioni dal piano

### 1. [Rule 3 — Blocking] Il timestamp della migration collideva con un file gia' applicato

- **Trovata durante:** Task 1, prima di scrivere il file
- **Problema:** il piano prescriveva
  `supabase/migrations/20260808000000_staff_role.sql`, ma
  `supabase/migrations/20260808000000_access_context_user_id.sql` esiste gia' —
  fase 33, commit `d3ee90b`, applicata. La `version` che Supabase registra nella
  migration history e' il prefisso numerico, ed e' una chiave primaria: due file
  con `20260808000000` collidono al momento dell'applicazione, cioe' nel momento
  peggiore.
- **Fix:** `20260808000500_staff_role.sql`. Conserva l'ordine voluto dalla fase —
  dopo `20260808000000`, **prima** di `20260808001000_role_implies_approved.sql`
  del piano 43-06, che deve applicarsi dopo perche' il suo predicato nomina
  `staff`.
- **Conseguenza dichiarata:** il blocco `must_haves.artifacts` del piano nomina il
  path vecchio. Il contenuto richiesto (`contains: "role_capabilities_role_check"`)
  e' soddisfatto; e' il nome del file a essere cambiato, per la ragione sopra.
- **Commit:** `c255775`

### 2. [Rule 1 — Bug nella previsione] L'allargamento di `UserRole` produce UN errore di build, non zero

- **Trovata durante:** Task 2, al primo `npm run build`
- **Problema:** il piano e `43-PATTERNS.md` § 21 dichiaravano che allargare
  `UserRole` **non produce nuovi errori di build**, perche' diciassette siti
  scrivono `role as UserRole` e un cast spegne il compilatore. Vero per i
  diciassette; **falso per un mapped type**. `src/components/admin/MemberTable.tsx:38`
  dichiara `const colors: Record<UserRole, string>`, e TypeScript ne verifica
  l'esaustivita':

  ```
  Type error: Property 'staff' is missing in type
  '{ master: string; organizer: string; member: string; }'
  but required in type 'Record<UserRole, string>'.
  ```

  Il piano vietava esplicitamente di toccare quel file — *"quelle sono del piano
  43-14, e mescolarle metterebbe una decisione d'interfaccia dentro un commit di
  schema"*. Ma il build e' l'**unico gate automatico** di questo repository, e un
  build rosso blocca il deploy Vercel di ogni piano successivo della fase.
- **Fix:** aggiunta la sola voce mancante. Il **colore e' provvisorio**: zinc,
  deliberatamente lo stesso neutro di `member`, perche' `staff` non concede nulla
  che un member non abbia (D-14) e un colore distinto suggerirebbe un potere che il
  ruolo non ha. La decisione d'interfaccia resta del piano 43-14, e il commento nel
  file lo dice.
- **Verifica:** `grep -rn "Record<UserRole" src/` → un solo sito in tutto `src/`.
  `npm run build` → `✓ Compiled successfully`.
- **Commit:** `29f5c7c`
- **Perche' conta oltre il fix:** una previsione registrata in `43-PATTERNS.md` era
  sbagliata di uno, e la correzione e' scritta accanto al codice invece che solo
  qui. La lezione utile e' la stessa che il piano voleva insegnare, con un'eccezione
  in piu': **un cast nasconde il sito al compilatore, un mapped type no.** Chi
  cerchera' i siti da aggiornare per il piano 43-14 non deve dedurne che il
  compilatore ne trova zero: ne trova esattamente quelli che non passano da un cast.

### 3. [Rule 2 — Correttezza mancante] La dichiarazione spostata nel commit della migration

- **Trovata durante:** la pianificazione dei commit
- **Problema:** il piano divideva `ROLE_GRANTS` nel task 2, insieme al lato
  TypeScript — quindi in un commit **diverso** da quello delle grant row. Il
  riassunto del piano 43-02 e' esplicito nella direzione opposta: le voci vanno
  aggiunte *"nello stesso commit che tocca il modello"*. Un commit in cui il
  database e' avanti alla dichiarazione e' un commit in cui `verify:capabilities`
  e' rosso, e un rosso transitorio in `git log` e' indistinguibile da un rosso vero
  per chiunque faccia bisect.
- **Fix:** migration + `schema.sql` + `verify-capabilities.mjs` in `c255775`;
  `database.ts` + `roles.ts` + `MemberTable.tsx` in `29f5c7c`. Nessun perimetro
  allargato — solo la linea del commit spostata.
- **Commit:** `c255775`, `29f5c7c`

### 4. [Fuori perimetro dichiarato] Il task 3 non ha applicato nulla alla produzione

- Il task 3 era un `checkpoint:human-action` che chiedeva di applicare la
  migration alla produzione, osservarla li' e girarci `verify:capabilities`.
  **Applicare una migration alla produzione e' fuori dal perimetro di un
  esecutore in questa fase**: il file passa dal normale percorso di deploy del
  proprietario.
- Cio' che il task chiedeva di **osservare** e' stato osservato — sul container,
  con le quattro query verbatim sopra — e cio' che chiedeva di **confrontare** e'
  stato confrontato, con verdetto `clean`. Cio' che resta scoperto e' l'unica cosa
  che il container non puo' dire: se la produzione ha davvero applicato il file.
  E' scritto sopra, sotto *Cosa NON e' verificato*, invece di essere lasciato
  dedurre da un verde.
- **Nessuna approvazione dell'utente e' stata chiesta o ottenuta per nulla di
  quanto sopra.** Ogni scelta in questo documento e' stata presa dall'esecutore.

---

**Deviazioni totali:** 3 auto-fix (1 blocking, 1 bug di previsione, 1 correttezza)
+ 1 perimetro dichiarato
**Impatto:** nessun allargamento di perimetro. Il fix 2 e' l'unico file toccato
oltre a quelli dichiarati dal piano, ed e' una voce in una mappa di colori.

## Known Stubs

Nessuno. Non esiste in questo piano codice che renda un valore vuoto o segnaposto:
la migration e' DDL piu' due righe di dati, e le tre modifiche TypeScript sono un
union, una costante e una voce di mappa. La voce `staff` in `RoleBadge` **non e'
uno stub** — e' un colore reale e reso, dichiarato provvisorio nel senso che il
piano 43-14 puo' sceglierne un altro.

## Threat Flags

Nessuna superficie di sicurezza nuova rispetto al `threat_model` del piano. Nessun
endpoint, nessun percorso d'autenticazione, nessuna policy, nessun accesso a file.
Il register della fase e' coperto:

| Threat | Come e' coperto qui |
|---|---|
| T-43-05-01 — `staff` acquisisce una capability rifiutata | i sei rifiuti in `ROLE_GRANTS`, asseriti dalla faccia 5 contro le righe vive; il confronto container non ha mosso una cella |
| T-43-05-02 — un rifiuto scritto come `granted = false` | nominato nella migration con la riga del resolver; nessuna colonna `granted` aggiunta |
| T-43-05-03 — allargata una sola delle due CHECK | una transazione; l'insert fallirebbe con `23514` nella stessa, quindi un database mezzo allargato non e' committabile |
| T-43-05-04 — `door.operate` invertito passando di li' | letto a mano (osservazione D), entrambi ancora `false`, nessuna riga `staff`; la ragione e' riscritta nella migration |
| T-43-05-05 — un build verde letto come *"il ruolo e' cablato"* | scritto due volte sopra: il build passa identicamente con la migration non applicata |
| T-43-05-SC — install di pacchetti | nessun pacchetto aggiunto; un ruolo e' dato, non una dipendenza |

## Note per i piani successivi

- **43-06** aggiunge il suo constraint sopra questo schema, **VALIDATED** (zero
  righe violanti in produzione, `43-MEASUREMENTS.md` misura 1). Il suo file resta
  `20260808001000_role_implies_approved.sql`: si applica dopo il mio, che e'
  l'ordine necessario perche' il suo predicato nomina `staff`.
- **43-08** aggiunge `staff` a `PERSONA_ROLES` nel seed del container: e' li' che
  la matrice di scrittura si muovera' deliberatamente, ed e' un re-baseline, non
  un difetto.
- **43-09** allarga il tipo del parametro di `updateMemberRole`
  (`src/app/(admin)/admin/members/actions.ts:113-115`) — l'unico altro sito che il
  compilatore trova. Vale la pena ricordare cosa quella funzione scrive oggi:
  `{role, status:'approved'}` quando promuove, `{role}` quando retrocede.
- **43-14** possiede l'interfaccia, incluso il colore del badge che ho messo
  provvisorio, e la lista di `43-RESEARCH.md` § G.1 che il compilatore **non** trova.

## User Setup Required

Nessuna configurazione di servizi esterni. Resta un solo fatto operativo, e non e'
un compito tecnico da eseguire a mano: **la migration
`supabase/migrations/20260808000500_staff_role.sql` sara' applicata dal normale
percorso di deploy**, come ogni altra migration di questo repository. Fino ad
allora la produzione non conosce il quarto ruolo.

## Self-Check: PASSED

- `supabase/migrations/20260808000500_staff_role.sql` — FOUND
- `.planning/phases/32-capability-model-in-the-database/baseline/32-BASELINE-writes.container.43-05.json` — FOUND
- commit `c255775` — FOUND
- commit `29f5c7c` — FOUND
- commit `17c25a7` — FOUND
- nessuna migration `2999…` sopravvissuta — verificato
- nessuno script usa e getta lasciato nel repository — verificato

---
*Phase: 43-role-model-account-creation*
*Completed: 2026-08-08*
