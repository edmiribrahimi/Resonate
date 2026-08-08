---
phase: 43-role-model-account-creation
plan: 06
subsystem: supabase-data
tags: [role-model, constraints, check, container-harness, door]

# Dependency graph
requires:
  - plan: 43-01
    provides: "la misura 1 — zero righe violanti in produzione — e i nomi vivi dei constraint letti da pg_constraint"
  - plan: 43-03
    provides: "il seam del container: drop prima del loop delle persone, restore NOT VALID nel finally, e il rendering misurato"
  - plan: 43-05
    provides: "il ruolo `staff` che il predicato nomina, e il precedente sulla collisione dei timestamp"
provides:
  - "`profiles_role_implies_approved`: un ruolo di staff implica un account approvato, per regola del database (D-04, ROLE-02)"
  - "la dichiarazione del seam attiva — quattro scritture vietate rifiutate con 23514 sotto il nome dichiarato (D-05, ROLE-03)"
  - "la cattura container 43-06 e il confronto pulito contro 43-05"
  - "la ragione per cui i due `door.operate` a false sopravvivono, scritta dove il prossimo lettore guardera' (D-06)"
affects: [43-08, 43-09, 43-14]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "una regola che vale per tutti i percorsi di scrittura si scrive una volta nel database, non una quinta volta nell'applicazione"
    - "un CHECK si aggiunge VALIDATED quando le righe esistenti sono state contate; NOT VALID congela, non rimanda"
    - "il constraint si nomina esplicitamente: un CHECK inline sarebbe auto-nominato e ne verrebbero applicati due"

key-files:
  created:
    - supabase/migrations/20260808001000_role_implies_approved.sql
    - .planning/phases/32-capability-model-in-the-database/baseline/32-BASELINE-policies.container.43-06.json
    - .planning/phases/32-capability-model-in-the-database/baseline/32-BASELINE-reads.container.43-06.json
    - .planning/phases/32-capability-model-in-the-database/baseline/32-BASELINE-writes.container.43-06.json
  modified:
    - scripts/container/seed.mjs

key-decisions:
  - "Misura 1 ri-eseguita in sola lettura immediatamente prima della DDL: zero righe violanti, quindi il constraint e' aggiunto VALIDATED e nessuna decisione per riga era dovuta"
  - "Migration e flip della dichiarazione in UN commit solo, contro la divisione in due task del piano: un commit in cui la migration esiste e il seam e' spento e' un commit in cui il seed rifiuta la run"
  - "Nessuna migration applicata alla produzione: fuori perimetro per un esecutore. Le osservazioni sono state prese sul container, che per questo caso e' la misura migliore, non il ripiego"
  - "I due `door.operate` a `requires_approved = false` non sono stati toccati, e la ragione e' riscritta nella migration invece che solo qui"

requirements-completed: [ROLE-02, ROLE-03]

# Metrics
duration: ~45min
completed: 2026-08-08
---

# Phase 43 Plan 06: La regola che il database applica — Summary

**Un account che tiene un ruolo di staff — `master`, `organizer`, `staff` — e'
`approved` per regola del database. Una scrittura che lo lascerebbe non
approvato viene rifiutata da un CHECK con nome, non da un call site che si e'
ricordato. Il container continua a seminare le quattro persone che la regola
vieta, e le sedici celle che hanno preso il difetto peggiore della fase 32
portano ancora evidenza. I due `door.operate` a `false` non sono stati toccati.**

## Performance

- **Duration:** ~45 min
- **Tasks:** 3 (il terzo eseguito sul container — vedi la deviazione 3)
- **Files created:** 4 · **modified:** 1

## Task Commits

1. **La migration e il flip della dichiarazione, in un commit solo** — `fb4994c` (feat)
2. **La cattura container 43-06 e il confronto contro 43-05** — `8312769` (test)

## La misura che decide la DDL, ri-eseguita prima di scriverla

`43-RESEARCH.md` chiama la misura 1 il fatto piu' deperibile della fase, e il
task 1 chiedeva di ri-eseguirla immediatamente prima della DDL. **Fatto il
2026-08-08**, in sola lettura (`read_only: true` su ogni query) attraverso la
Management API, con uno script usa e getta scritto in `/tmp` e cancellato subito
dopo: **nessuno script e nessun pacchetto e' stato aggiunto al repository**.

```
measurement 1 — violating rows: []
measurement 1 — totals: [{"total_profiles":4,"approved":4,"staff_roles":1}]
```

**Zero righe violanti**, identico al valore che il piano 43-01 aveva registrato.
I totali sono stati letti separatamente perche' un group-by vuoto e' anche cio'
che restituisce una tabella vuota, e le due cose devono restare distinguibili.

**Cosa decide.** Il constraint e' aggiunto **VALIDATED**. Postgres ha percorso
ogni riga esistente contro il predicato dentro lo stesso `ALTER TABLE`, e nessuna
riga e' esentata. Se il conteggio fosse stato diverso da zero, questo file non
esisterebbe ancora: la decisione per singolo account e' del proprietario, e un
`NOT VALID` preso per non fermarsi avrebbe **congelato** quelle righe contro
qualunque update futuro, anche su una colonna che la regola non nomina — per
esempio un cambio di indirizzo email attraverso
`20260225140000_sync_email_change.sql`.

**Due fatti letti nella stessa run, e vanno detti.**

**A · i tre CHECK di `public.profiles` in produzione**, tutti `convalidated: true`:

```
profiles_approved_via_check  CHECK ((approved_via = ANY (ARRAY['referral'::text, 'guest_list'::text, 'admin_manual'::text])))
profiles_role_check          CHECK ((role = ANY (ARRAY['master'::text, 'organizer'::text, 'member'::text])))
profiles_status_check        CHECK ((status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text])))
```

`profiles_role_check` nomina ancora **tre** ruoli. Cioe': la produzione **non ha
ancora applicato** `20260808000500_staff_role.sql` del piano 43-05, che e'
committata e non applicata. E' esattamente lo stato che quel riassunto dichiara,
e non e' un problema per questo file — il predicato che ho scritto e' un
confronto testuale e resta corretto in entrambi i mondi — ma **fissa l'ordine di
applicazione**: 43-05 prima, 43-06 dopo. Il prefisso del mio file (`…001000`)
ordina dopo il suo (`…000500`) proprio per questo, ed e' scritto anche dentro la
migration.

**B · i due `door.operate`, riletti a mano dalla produzione prima di scrivere:**

```
{"role":"master","capability":"door.operate","requires_approved":false}
{"role":"organizer","capability":"door.operate","requires_approved":false}
```

Entrambi ancora `false`, e nessuna riga per `staff`. Il filo d'inciampo di D-06
e' intatto, ed e' stato guardato **prima** di aggiungere la regola che lo fa
sembrare superfluo, non dopo.

## Il file — `supabase/migrations/20260808001000_role_implies_approved.sql`

Un `BEGIN; … COMMIT;`, uno statement, piu' un `COMMENT ON CONSTRAINT` che porta
la regola dentro il database e non solo dentro il file:

```sql
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_role_implies_approved
  CHECK (role NOT IN ('master', 'organizer', 'staff') OR status = 'approved');
```

**Il prefisso e' libero, verificato prima di scegliere il nome.**
`ls supabase/migrations/` non contiene nessun `20260808001000`, e il file ordina
dopo `20260808000500_staff_role.sql`. Il piano 43-05 ha sbattuto contro questa
collisione — `20260808000000` era gia' occupato da una migration della fase 33 —
e la `version` che Supabase registra e' il prefisso numerico, cioe' una chiave
primaria: due file che collidono falliscono **al momento dell'applicazione**, che
e' il momento peggiore.

L'intestazione porta le cinque cose che il task chiedeva, e ognuna e' portante:

1. **Cosa cambia**, e che e' il criterio 2 della fase 43 (D-04, ROLE-02).
2. **Il paragrafo sulle righe esistenti**, nella forma di
   `20260805120000:235-239`: il conteggio, la data, e la conseguenza — zero
   righe violanti, quindi VALIDATED, quindi ogni riga della tabella e' stata
   percorsa contro la regola. E accanto, perche' `NOT VALID` sarebbe stato un
   difetto due volte invece che una prudenza.
3. **Perche' un CHECK e non un trigger**, con i quattro risultati di bypass
   nominati: `SECURITY DEFINER` no, superuser no, `session_replication_role =
   'replica'` no — e `ALTER TABLE … DISABLE TRIGGER`, che e' disponibile al
   **proprietario** della tabella, misurato `postgres`, cioe' il ruolo con cui le
   migration vengono applicate. Un trigger si spegnerebbe con una riga dentro una
   migration futura restando visibile nello schema: un lettore vedrebbe
   un'applicazione che non gira. Il trigger e' registrato come **considerato e
   rifiutato**, non come dimenticato.
4. **La trappola da rifiutare**, citata per esteso dal ROADMAP, con
   `20260807000000_capability_model.sql:415` e D-06 nominati.
5. **Il seam**: il seed droppa e ripristina questo constraint per nome, il
   restore e' `NOT VALID` perche' a quel punto quattro righe lo violano, e **non
   e' un workaround** — quelle quattro persone sono l'unica ragione per cui la
   matrice di scrittura della fase 32 ha preso il suo difetto peggiore, sedici
   celle, tutte loro. Chi rinomina il constraint deve rinominarlo anche li', e la
   dichiarazione del seed rifiuta la run se non lo fa.

**Il nome e' esplicito, e non e' pignoleria.** Un `CHECK` inline verrebbe
auto-nominato, e siccome `profiles_role_check` esiste gia' il secondo
atterrerebbe come `profiles_role_check1`: **entrambi applicati**, nessuno dei due
cercabile per intenzione.

**Nessuna guardia applicativa aggiunta.** `grep -rn "role_implies_approved" src/`
restituisce **zero**. Non e' una dimenticanza: una quinta funzione che si ricorda
e' precisamente il difetto che D-04 esiste per abolire.

## I dieci percorsi di scrittura, riletti invece che dati per buoni

Il piano dava per verificato che il constraint atterri senza rompere niente. L'ho
riletto io, `.update(` per `.update(`:

| Percorso | Cosa scrive | Esito |
|---|---|---|
| `src/app/api/auth/callback/route.ts:120` | `{role:'master', status:'approved'}` | compatibile |
| `src/app/api/webhooks/sumup/route.ts:88` | `{status:'approved'}` | compatibile |
| `admin/members/actions.ts:139` (promozione/retrocessione) | `{role, status:'approved'}` / `{role}` | compatibile |
| `admin/members/actions.ts:164, :241, :321` (reject, deactivate) | `{status:'rejected', role:'member'}` | compatibile — **retrocede nello stesso statement**, che e' esattamente perche' rifiutare un organizer non si rompe |
| `admin/members/actions.ts:181, :208, :277` (approve, reactivate) | `{status:'approved'}` | compatibile |
| `src/lib/guest-list/process-entry.ts:160` | `{status:'approved', approved_via:'guest_list'}` | compatibile |
| `handle_new_user()` (`20260310000000_guest_list.sql:145`) | insert `role='member'` | compatibile |
| `sync_email_change` (`20260225140000:9`) | solo `email` | compatibile, **e qui il VALIDATED conta**: con un `NOT VALID` una riga violante preesistente sarebbe stata congelata anche contro questo update |

Nessun altro sito scrive `role` o `status` su `profiles`. **Il constraint
atterra senza rompere nessun percorso esistente** — verificato, non ereditato.

## Le quattro osservazioni del container — contro il constraint vero

Il piano 43-03 aveva provato il seam contro una migration di prova usa e getta.
Questa run e' la prima contro quella reale. Verbatim:

```
      profiles_role_implies_approved restored: CHECK (((role <> ALL (ARRAY['master'::text, 'organizer'::text, 'staff'::text])) OR (status = 'approved'::text))) NOT VALID
      convalidated=false here, true in production — the price of the NOT VALID restore, and no capture reads pg_constraint, which is why it is asserted rather than compared
      refused organizer/pending   23514 profiles_role_implies_approved
      refused organizer/rejected  23514 profiles_role_implies_approved
      refused master/pending      23514 profiles_role_implies_approved
      refused master/rejected     23514 profiles_role_implies_approved
      4/4 forbidden writes refused, profiles still 9 rows
      profiles × update probes master/approved — satisfies profiles_role_implies_approved
      seeded 20 tables, 9 profiles, 9/9 role × status cells
      profiles role × status: master/approved=1 master/pending=1 master/rejected=1 member/approved=1 member/pending=1 member/rejected=1 organizer/approved=1 organizer/pending=1 organizer/rejected=1
  ✓ seed — 20 tables seeded, 9 profiles
```

`exit=0`.

1. **La griglia riporta il 3 × 3 pieno.** `organizer/pending`,
   `organizer/rejected`, `master/pending` e `master/rejected` sono state seminate
   **con la regola in vigore** — droppata attorno al loop e ripristinata dopo.
   ROLE-03 e' dimostrato, non dichiarato.
2. **La definizione riletta coincide** con `renderedDef` piu' l'unico suffisso
   enumerato, e `convalidated` e' `false` qui contro il `true` della produzione.
   La differenza fra i due oggetti e' esattamente una stringa e un booleano,
   entrambi nominati.
3. **Quattro `23514` sotto il nome dichiarato**, e il conteggio delle righe non
   si muove: un insert rifiutato non deve scrivere niente. Un `23514` proveniente
   da `profiles_status_check` sarebbe stato un verde per la ragione sbagliata, e
   per questo l'asserzione pretende **anche il nome**.
4. **La riga `min(pk)` e' ancora `master/approved`**, quindi le undici celle
   `profiles × update` non hanno cambiato significato.

Niente e' stato abbassato e nessuna asserzione e' stata rilassata. La
`renderedDef` misurata dal piano 43-03 contro una migration di prova ha retto
contro quella vera: **il predicato che ho scritto e quello dichiarato nel seed
rendono identici**, il che e' la prova che i due file dicono la stessa cosa e non
due cose simili.

## Il confronto — zero difetti

```
CAP-03: clean — B1, B2, B3 compared, nothing moved that the whitelist does not explain.
```

`npm run baseline:compare -- --target=container --before-point=43-05
--after-point=43-06 --only=B1,B2,B3`: **220 celle B2 e 660 celle B3 confrontate,
nulla mosso.** E' l'atteso, ed e' il motivo per cui la cattura esiste: il
constraint cambia cosa si puo' **scrivere** su `profiles`, non cambia nessuna
policy e nessuna persona. Una cella `profiles × update` che si fosse mossa
avrebbe significato che la riga sonda della matrice era diventata una riga
congelata — il pericolo che `43-RESEARCH.md` § B.3 aveva nominato e che
l'asserzione del piano 43-03 sorveglia.

Il flag `--only=B1,B2,B3` e' obbligatorio sul container: B5 e' l'advisor Supabase
e non ha equivalente locale. Lo script lo dice e rifiuta da solo.

## M-12 — la finestra era gia' chiusa prima di scrivere

Il task 3 rifiuta di procedere finche' il test 1 di `32-HUMAN-UAT.md` legge
`[pending]`. Controllato **prima** di scrivere la DDL:

> `result: PASS (capability resolution) — 2026-08-08.` […] `public.my_access_context()`
> per la persona `organizer` / `pending` ha restituito
> `capabilities = [door.operate, organizer.access, staff.manage]`.

Verdetto e data ci sono. La misura era stata presa sul container proprio perche'
ripetibile — e la nota del piano 43-01 prevedeva questo momento: *"puo' essere
ri-misurata dopo 43-06 per dimostrare che lo stato e' diventato
irrappresentabile"*. E' quello che i quattro `23514` qui sopra dimostrano.

## Cosa NON e' verificato

- **Non esiste alcun test runner per il prodotto** (`CLAUDE.md` Guardrail 1).
  Nulla qui e' dichiarato verificato perche' i test passano. Ogni riga sopra e'
  una riga di output di una run, una lettura di `pg_constraint`, o un file
  citato.
- **`npm run build` non dimostra niente di tutto questo, e va detto in chiaro.**
  Il build passa **identicamente** con la migration applicata o non applicata,
  perche' `src/types/database.ts` e' scritto a mano e non generato dallo schema
  vivo. Un build verde non dice che la regola esiste da nessuna parte.
- **La migration NON e' applicata alla produzione.** Il file e' committato e non
  applicato — vedi la deviazione 3. Finche' non lo e', la regola vive solo nel
  container, e la produzione accetta ancora una scrittura che lascerebbe un
  organizer non approvato.
- **Il rifiuto a mano in produzione non e' stato osservato**, per la stessa
  ragione: richiede che il constraint sia applicato. Cio' che il piano voleva
  metterci accanto — la stessa istruzione che riusciva prima — esiste in forma
  container: `organizer/pending` era una delle nove persone seminate ed e' ora
  una delle quattro rifiutate con `23514`. E' la stessa dimostrazione, su un
  database ripetibile, senza creare in produzione una riga che porta un
  `membership_code`, cioe' l'unica credenziale della porta.
- **Nessuna riga di `profiles` e' stata scritta in produzione.** Le uniche query
  di produzione di questo piano sono quattro `select` in sola lettura, e
  restituiscono etichette e conteggi: nessun uuid, nessun indirizzo, nessun nome.
- Il rendering `<> ALL (ARRAY[…])` e' misurato in `postgres:17.6`.

## Deviazioni dal piano

### 1. [Rule 2 — Correttezza mancante] Task 1 e task 2 in un commit solo

- **Trovata durante:** la pianificazione dei commit
- **Problema:** il piano separa la migration (task 1) dal flip di `present` (task
  2), ma il proprio blocco `key_links` pretende *"in the same commit as the
  migration"*, e il paragrafo dentro `seed.mjs` scritto dal piano 43-03 lo dice
  di nuovo. Committare la sola migration avrebbe prodotto un commit in cui la
  dichiarazione dice `present: false` mentre il file che la rende vera esiste: il
  seed **rifiuta** quella run per progetto, e un rosso transitorio in `git log` e'
  indistinguibile da un rosso vero per chiunque faccia bisect.
- **Fix:** un commit, `fb4994c`. Stesso precedente del piano 43-05, deviazione 3.
- **Commit:** `fb4994c`

### 2. [Rule 2 — Correttezza mancante] `COMMENT ON CONSTRAINT` aggiunto

- **Problema:** il piano prescriveva il solo `ALTER TABLE`. Ma chi incontra
  questo constraint la prima volta lo incontra come un `23514` in un log, non
  come un file: a quel punto ha il **nome** e nient'altro, e la ragione sta in un
  file di migration che deve sapere di dover cercare.
- **Fix:** un `COMMENT ON CONSTRAINT` di tre righe dentro la stessa transazione —
  la regola, la sua direzione unica (`member` puo' tenere qualunque stato), la
  data della misura, e il puntatore al seam. Interrogabile con `\dd` o da
  `pg_description`, cioe' raggiungibile da chi sta guardando il database e non il
  repository.
- **Perimetro:** nessun allargamento — stesso file, stessa transazione, nessun
  effetto sui dati.
- **Commit:** `fb4994c`

### 3. [Fuori perimetro dichiarato] Il task 3 non ha applicato nulla alla produzione

- Il task 3 era un `checkpoint:human-action` che chiedeva di applicare la
  migration alla produzione, osservare un rifiuto a mano su un account usa e
  getta e rileggere i due `door.operate`. **Applicare una migration alla
  produzione e' fuori dal perimetro di un esecutore in questa fase**: il file
  passa dal normale percorso di deploy del proprietario, come ogni altra
  migration di questo repository.
- Cio' che il task chiedeva di **osservare** e' stato osservato dove poteva
  esserlo: la misura 1 e i due `door.operate` **sulla produzione**, in sola
  lettura; il rifiuto, il read-back del constraint e la griglia **sul
  container**. Cio' che chiedeva di **confrontare** e' stato confrontato, con
  verdetto `clean`.
- Cio' che resta scoperto e' l'unica cosa che il container non puo' dire: se la
  produzione ha applicato il file. E' scritto sopra, sotto *Cosa NON e'
  verificato*, invece di essere lasciato dedurre da un verde.
- **Nessuna approvazione dell'utente e' stata chiesta o ottenuta per nulla di
  quanto sopra.** Ogni scelta in questo documento e' stata presa
  dall'esecutore.

---

**Deviazioni totali:** 2 auto-fix di correttezza + 1 perimetro dichiarato.
**Impatto:** nessun file toccato oltre a quelli dichiarati dal piano.

## La trappola, e perche' non e' stata presa

I due `door.operate` a `requires_approved = false` **non sono stati toccati**, e
la ragione non e' che il piano lo vietava: e' che il constraint e quel flag
sorvegliano due cose diverse. Il constraint protegge il database. Il flag
protegge la notte **dal giorno in cui il constraint verra' rilassato per un caso
speciale** — e quel giorno la clausola in piu' nel predicato sara' scritta da
qualcuno con una buona ragione, mentre nessuno si ricordera' di rimettere a posto
la porta.

Detto in concreto, perche' *"difesa in profondita'"* e' troppo vago per essere
azionabile: il giorno in cui qualcuno aggiunge `… OR role = 'x'` al predicato,
`requires_approved = false` e' cio' che tiene la porta aperta mentre quell'
eccezione esiste. **Un flag che sembra ridondante il giorno in cui viene scritto
e' l'unico tipo che c'e' ancora il giorno in cui serve.** E l'asimmetria non e'
cambiata: rifiutare uno staff valido davanti a una fila, alle due di notte, resta
peggio dell'alternativa.

Verificato tre volte in questo piano: letto dalla produzione prima di scrivere
(entrambi `false`), riscritto per esteso dentro la migration con la citazione del
ROADMAP, e pinnato da `verify:capabilities`, `5/5 green, 0 warnings`.

## Verifica

| Controllo | Esito |
|---|---|
| misura 1 ri-eseguita in produzione, sola lettura, 2026-08-08 | `[]` — zero righe violanti; totali 4 / 4 / 1 |
| prefisso `20260808001000` libero e successivo a `…000500` | verificato con `ls supabase/migrations/` |
| `grep -c 'BEGIN;'` sulla migration | 2 (una nel commento, **una** come statement) |
| un solo `BEGIN;` / `COMMIT;` non commentati | 2 righe, cioe' una coppia |
| `grep -c 'door.operate'` sulla migration | 5 |
| `grep -rn 'role_implies_approved' src/` | **0** — nessuna copia applicativa della regola |
| `node --check scripts/container/seed.mjs` | silenzioso |
| `npm run baseline:container -- --seed-only --report` | **exit 0**, 9/9 celle, 4 × `23514`, 9 righe invariate, sonda `master/approved` |
| `npm run baseline:compare` container 43-05 → 43-06 | `CAP-03: clean`, 220 + 660 celle, nulla mosso |
| `npm run verify:capabilities -- --target=container` | `5/5 green, 0 warnings` |
| `npm run build` | `✓ Compiled successfully` — **e passerebbe identico con la migration non applicata** |

## Known Stubs

Nessuno. Il piano produce DDL e un booleano: non c'e' un valore vuoto, un
segnaposto o un componente non cablato.

## Threat Flags

Nessuna superficie di sicurezza nuova rispetto al `threat_model` del piano.
Nessun endpoint, nessun percorso d'autenticazione, nessuna policy, nessun accesso
a file. Il register e' coperto:

| Threat | Come e' coperto qui |
|---|---|
| T-43-06-01 — un ruolo di staff lasciato non approvato | il CHECK con nome, misurato non aggirabile da `SECURITY DEFINER`, superuser e `session_replication_role`; quattro scritture vietate asserite rifiutate nel container. **La gamba in produzione resta scoperta finche' la migration non e' applicata**, ed e' scritto sopra |
| T-43-06-02 — il flag di `door.operate` rimosso come ridondante | il ROADMAP citato nella migration, `20260807000000:415` nominato, i due valori riletti dalla produzione, e `verify:capabilities` verde |
| T-43-06-03 — le sedici celle perse per la nuova regola | il seam esercitato contro il constraint vero: 9/9 celle, l'asserzione della griglia rifiuta un buco invece di riempire meno |
| T-43-06-04 — una riga violante congelata da un `NOT VALID` | misura 1 ri-eseguita immediatamente prima della DDL; zero righe, quindi VALIDATED. Un conteggio non nullo avrebbe fermato il piano |
| T-43-06-05 — una quinta guardia applicativa | `grep -rn "role_implies_approved" src/` → 0, riportato in tabella |
| T-43-06-06 — la finestra di M-12 chiusa prima di correre | test 1 di `32-HUMAN-UAT.md` letto **prima** di scrivere: `PASS … 2026-08-08` |
| T-43-06-SC — install di pacchetti | nessun pacchetto aggiunto |

## Note per i piani successivi

- **43-08** aggiunge `staff` a `PERSONA_ROLES`. Attenzione all'ordine: se
  `PERSONA_STATUSES` cambiasse ordine, la riga `min(pk)` smetterebbe di essere
  `master/approved` e undici celle `profiles × update` diventerebbero `23514`
  senza causa visibile. L'asserzione che lo sorveglia gira gia' a ogni run.
- **43-09** allarga `updateMemberRole`. La funzione scrive gia' `{role,
  status:'approved'}` in promozione: e' compatibile con il constraint per
  costruzione, e **non deve guadagnare un controllo applicativo** che ripeta la
  regola.
- **Chiunque scriva un percorso d'errore su `profiles`**: si dirama su
  `error.code === '23514'`, mai su un messaggio (Next lo redige in produzione), e
  `error.details` non si logga e non si restituisce mai — su questa tabella
  PostgREST ci mette la riga intera, `membership_code` e indirizzo email
  compresi. Da oggi una violazione di CHECK sulla pagina membri e' un evento
  ordinario, non raro.

## Setup richiesto

Nessuna configurazione di servizi esterni. Resta un solo fatto operativo, e non
e' un compito tecnico da eseguire a mano: **le migration
`20260808000500_staff_role.sql` e `20260808001000_role_implies_approved.sql`
saranno applicate dal normale percorso di deploy, in quest'ordine**. Fino ad
allora la regola non e' in vigore in produzione.

## Self-Check: PASSED

- `supabase/migrations/20260808001000_role_implies_approved.sql` — FOUND
- `scripts/container/seed.mjs` — FOUND
- `.planning/phases/32-capability-model-in-the-database/baseline/32-BASELINE-writes.container.43-06.json` — FOUND
- commit `fb4994c` — FOUND
- commit `8312769` — FOUND
- nessuno script usa e getta lasciato nel repository — verificato
- nessuna migration applicata alla produzione — verificato

---
*Phase: 43-role-model-account-creation*
*Completed: 2026-08-08*
