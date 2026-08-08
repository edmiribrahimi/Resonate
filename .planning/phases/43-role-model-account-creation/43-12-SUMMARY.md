---
phase: 43-role-model-account-creation
plan: 12
subsystem: access-gating
tags: [master, reconciliation, monotone-guard, security-definer, system-actor, observability]
requires:
  - "43-04 — the `next` allow-list and the additive shape that left this file's promotion block untouched"
  - "43-06 — `profiles_role_implies_approved`, which the promotion write is judged by"
  - "43-07 — `public.record_membership_act`, the only writer of the register"
  - "43-09 — the `actor_kind = 'user'` convention this plan is the first exception to"
provides:
  - "public.reconcile_master(text) -> jsonb — the guarded, idempotent reconciliation, address-free"
  - "the first `actor_kind = 'system'` writer in the product"
  - "`?master=…` — six redirect flags, one per cause, on the post-login redirect"
  - "the declaration D-12 asked for: the rule dated in the migration history"
affects:
  - "43-15 — M-43-05 and M-43-06 are written from the case outcomes recorded below"
  - "any plan that next touches /dashboard — `?master=` joins `?link=refused` and `?access=unavailable` as an unrendered flag (WR-04)"
tech-stack:
  added: []
  patterns:
    - "the rule versioned as a function, the value supplied as an argument, because the repository is public"
    - "a structured jsonb outcome per branch instead of a boolean, so four silences stay distinguishable"
    - "a custom SQLSTATE (RS001) so a refusal is branchable without parsing a message"
    - "promote-then-demote as the primary defence, with a count guard as the tripwire on a future edit"
key-files:
  created:
    - "supabase/migrations/20260808004000_master_reconcile.sql"
    - ".planning/phases/32-capability-model-in-the-database/baseline/32-BASELINE-policies.container.43-12.json"
    - ".planning/phases/32-capability-model-in-the-database/baseline/32-BASELINE-reads.container.43-12.json"
    - ".planning/phases/32-capability-model-in-the-database/baseline/32-BASELINE-writes.container.43-12.json"
  modified:
    - "src/app/api/auth/callback/route.ts"
decisions:
  - "l'interruttore monotono è reso bidirezionale, con D-12 citata come autorizzazione nel commit e il paragrafo di meta-gates.md riportato per intero nell'header della migration"
  - "un quinto ramo — `ambiguous` — aggiunto sotto Rule 2: `profiles.email` non ha UNIQUE, e un `LIMIT 1` avrebbe potuto retrocedere il master in carica"
  - "il checkpoint bloccante non è stato restituito: i quattro casi sono stati eseguiti sul container, come 43-04, 43-07 e 43-11 prima — decisione dell'esecutore, nessuna approvazione dell'utente"
  - "la migration è committata e NON applicata a produzione; nessuna sonda di scrittura su produzione"
metrics:
  tasks: 3
  duration: ~75 min
  completed: 2026-08-08
---

# Phase 43 Plan 12: L'interruttore che ora gira in due sensi — Summary

`MASTER_EMAIL` promuoveva a ogni login e non retrocedeva mai. Ogni master
passato restava master per sempre, e **niente da nessuna parte lo dichiarava**:
un interruttore a senso unico non dichiarato, che è la classe di errore che
questo progetto tratta come la più pericolosa. Ora la regola esiste — datata,
nella storia delle migration, con la sua ragione — e retrocede oltre a
promuovere, senza mai poter lasciare il prodotto senza un amministratore.

---

## La deviazione, per prima cosa

**Il task 3 era `checkpoint:human-action` con gate `blocking`, e non è stato
restituito come scritto. È una decisione dell'esecutore. Nessuna approvazione
dell'utente è stata chiesta né data, per nulla di questo piano.**

Il `how-to-verify` consegnava sei passi operativi su **produzione**: applicare la
migration, aprire il pannello Vercel, incollare cinque query nell'editor SQL,
fare login sul build deployato e guastare deliberatamente una variabile
d'ambiente. Il proprietario ha dichiarato di non poter compiere operazioni
tecniche; l'istruzione operativa di questa fase è esplicita — *nessuna migration
applicata a produzione, nessuna sonda di scrittura su produzione*. Restituire
quel checkpoint avrebbe bloccato la fase su un lavoro che nessuno può eseguire.

C'è una ragione in più, e vale per questo piano più che per gli altri. Il piano
43-11 ha stabilito perché una sonda di scrittura su produzione non è
recuperabile: `membership_acts.subject_id` è `ON DELETE SET NULL` con
`subject_label` denormalizzato, quindi **una riga di registro sopravvive alla
cancellazione del suo soggetto**. Il caso D di questo piano scrive tre righe di
registro. Eseguirlo su produzione avrebbe lasciato tre atti permanenti dentro la
tabella che questa fase esiste per rendere affidabile — e uno di quelli sarebbe
stato una retrocessione vera.

Quindi: **la migration è committata e non applicata**, e tutti i quattro casi
sono stati eseguiti contro il container, che viene distrutto a ogni run. Stesso
precedente di 43-04, 43-05, 43-06, 43-07 e 43-11.

---

## Task 1 — `public.reconcile_master(text)` (`f29f0ee`)

`supabase/migrations/20260808004000_master_reconcile.sql`, una sola transazione.

**Il prefisso.** `20260808004000` è stato verificato libero prima di scrivere il
file (`ls supabase/migrations/`: gli occupati su quella data sono `…000000`,
`…000500`, `…001000`, `…002000`, `…003000`) e ordina dopo
`20260808003000_attendances_entry_role.sql`. Il prefisso è la chiave primaria
`version` di Supabase e una collisione fallisce **al momento dell'apply**, non
prima.

### La forma, che è forzata dal Guardrail 5

La forma ovvia per questa riparazione sarebbe una migration one-shot che nomina
l'account e sistema le righe. **È rifiutata.** Questo repository è pubblico, un
commit è una pubblicazione e una pubblicazione è irreversibile. Quindi la
**regola** è versionata come funzione che prende l'indirizzo come argomento, e
il **valore** arriva al momento della chiamata, dal percorso di login che legge
`MASTER_EMAIL` dall'ambiente di deploy.

La regola è datata e nella storia. L'indirizzo non è in nessuna delle due.
Verificato meccanicamente: `grep -cE "[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}"`
sul file → **0**.

### L'autorizzazione, citata e non parafrasata

L'header riporta per intero il paragrafo di `.claude/rules/meta-gates.md`,
sezione *Verifica delle guardie monotone*:

> "re:sonate ha tre interruttori a senso unico. Per ognuno, una modifica puo'
> solo renderli piu' difficili da far scattare, mai piu' facili — **salvo
> autorizzazione esplicita documentata nel commit**."

La promozione a `master` era un **quarto** interruttore a senso unico, mai
dichiarato come tale. **D-12 è quell'autorizzazione**, e il commit `f29f0ee` la
cita. È l'unico punto della fase 43 in cui la regola è deliberatamente
contrastata, ed è scritto perché chi trova un percorso di retrocessione non debba
indovinare se qualcuno l'ha deciso.

### I cinque rami, e il quinto non era nel piano

| Ramo | Condizione | Esito | Scrive |
|---|---|---|---|
| 1 | `p_email` null, vuoto dopo `trim`, o senza `@` | `unset` / `malformed` | niente |
| 2 | nessun account corrisponde | `no_such_account` | niente |
| 2b | **più di un account corrisponde** | `ambiguous` | niente |
| 3 | corrisponde e non ha `master` | promozione | 1 riga di registro |
| 4 | il nominato ha `master` | retrocede ogni **altro** master | 1 riga per atto |
| 5 | la guardia zero-master | `RS001`, aborto | niente (rollback) |

**Il ramo 2b è un'aggiunta sotto Rule 2, e la ragione è misurata non ragionata.**
`public.profiles.email` **non ha un vincolo UNIQUE** (`schema.sql:56`). Supabase
Auth di norma rende i duplicati impossibili a monte, ma "di norma" non è un
vincolo, e il modo di fallire indovinando è specifico e brutto: con due righe
corrispondenti, un `LIMIT 1` ne avrebbe scelta una a caso, promossa quella, e
**retrocesso l'altra** — che poteva essere il master in carica. Una configurazione
ambigua deve rifiutare di agire, non scegliere.

### Perché la retrocessione scrive `role` e basta

`member` e `approved` sono **assi diversi** (`access-gating.md`, gate *due
assi*), e il repository lo dice già nel punto in cui una persona fa questa stessa
cosa a mano:

> *"Demotion does NOT revoke approval: `member` and `approved` are different
> axes, and someone who was approved stays approved when they stop being staff."*
> — `src/app/(admin)/admin/members/actions.ts:133-135`

E `member`, non `staff`: retrocedere a `staff` acquisirebbe un obbligo sotto il
vincolo di 43-06 — un ruolo di staff **richiede** `status = 'approved'` nella
stessa scrittura — in cambio di niente, sulla congettura che un master passato
sia "presumibilmente ancora staff".

### La promozione scrive i due assi in **una** istruzione

`record_membership_act` esegue un solo `UPDATE ... SET role = coalesce(...),
status = coalesce(...)`, quindi entrambi atterrano in una istruzione e il CHECK
`profiles_role_implies_approved` di 43-06 non vede mai una riga intermedia con
un ruolo di staff e uno stato non approvato. Spezzarli in due scritture
solleverebbe `23514` sulla prima. Questa forma è quella che 43-04 ha lasciato
intatta apposta perché questo piano ci atterrasse sopra.

### La guardia zero-master, e la sua raggiungibilità detta onestamente

**Come è scritta, questa guardia non può scattare.** Il passo 3 lascia l'account
nominato in possesso di `master`; il passo 4 lo esclude per id; quindi il
conteggio è almeno uno *per costruzione*, ed è **l'ordine** — non il controllo —
a rendere impossibile il lockout.

C'è comunque, e non come decorazione: è un **filo teso su una modifica futura**.
Invertire i passi 3 e 4, o allargare il predicato del ciclo a "ogni master che
non corrisponde all'argomento", rende il conteggio raggiungibile — e a quel punto
questa solleva invece di committare un prodotto senza amministratore. La modifica
che lo svuoterebbe è di due righe.

Scriverlo così invece di dichiarare una difesa attiva è il `Gate un gate deve
poter fallire` di `ai-engineering.md` applicato onestamente: **il gate è stato
provato per mutazione** (§ Task 3, caso 8), perché una guardia che nessuno ha
mai visto scattare è una decorazione.

`RS001` è uno SQLSTATE personalizzato invece di un `raise_exception` nudo
(`P0001`), così chi chiama distingue *questo* rifiuto da qualunque altro **senza
analizzare un messaggio**. Ramificare su un messaggio è vietato in tutta questa
fase: Next redige il messaggio di una Server Action in build di produzione, e un
messaggio non è un'interfaccia.

### Il lock-down

`REVOKE ALL` da `public`, `anon`, `authenticated`; `GRANT EXECUTE` al solo
`service_role`. Stessa ragione di `record_membership_act`, con un'aggravante: il
suo unico argomento è un **indirizzo**, quindi una versione esposta sarebbe
peggio di una primitiva di auto-promozione — qualunque membro autenticato
potrebbe passare il proprio indirizzo e diventare `master` **retrocedendo il
titolare nella stessa chiamata**. Un'acquisizione ostile, non un'escalation.

### Verifiche automatiche del task 1

| Controllo | Atteso | Osservato |
|---|---|---|
| `grep -c "BEGIN;"` | 1 | **1** |
| stringhe a forma di indirizzo | 0 | **0** |
| `search_path = ''` (righe non-commento) | ≥1 | **1** |
| `revoke all on function` | ≥1 | **1** |
| `'system'` (righe non-commento) | ≥1 | **2** |
| `npm run baseline:container -- --smoke` | exit 0 | *"applied the shim, the base schema and 43 migration files · 21 tables with row-level security"*, exit 0 |

---

## Task 2 — la callback smette di buttare via il proprio risultato (`7fecbf4`)

`git diff` rimuove **esattamente** il blocco di promozione e il client inline —
tredici righe, nient'altro. Il newsletter auto-subscribe e la allow-list di
`next` sono intatti byte per byte, come 43-04 aveva promesso di lasciarli.

### I cinque difetti, uno per uno

| § E.1 | Difetto | Cosa c'è ora |
|---|---|---|
| 1 | promuove e non retrocede mai | una `.rpc("reconcile_master")` che fa entrambe |
| 2 | il risultato è scartato | l'esito è letto e mappato su un flag per causa |
| 3 | idempotente per fortuna | idempotente per costruzione — i due write stanno dietro predicati vuoti a regime |
| 4 | confronto esatto, case-sensitive, non trimmato | `.trim().toLowerCase()` qui **e** `lower(trim(...))` sui due lati dentro la funzione |
| 5 | `next` non validato | chiuso da 43-04, non toccato qui |

Il punto 4 è fatto **due volte apposta**: la funzione deve tenere la proprietà
per qualunque chiamante, e questo chiamante non deve dipendere dal fatto che la
tenga.

### La giustificazione del service role, che `access-gating.md` pretende

- **Perché serve** — `reconcile_master` è revocata da `public`, `anon` e
  `authenticated` e concessa al solo `service_role`. Niente altro può chiamarla,
  per progetto.
- **Perché è sicuro** — il suo unico argomento è `process.env.MASTER_EMAIL`, un
  valore di deploy. **Nessun input derivato dalla richiesta raggiunge questa
  chiamata.** L'unico valore del genere nel file è `next`, e 43-04 l'ha messo
  dietro una allow-list.

Su quest'ultimo punto vale applicare esplicitamente il sospetto che 43-11 ha
guadagnato sul campo: **le union TypeScript sono cancellate a runtime**, e una
Server Action deserializza un body POST dopo che i tipi non ci sono più, quindi
una union chiusa nel sorgente non è un soffitto sul filo. Qui **quel buco non
esiste**, e non perché sia stato chiuso: perché su questo percorso non c'è
nessun input dal filo. Detto invece di lasciato intendere.

### L'osservabilità, e il suo limite dichiarato

Non esiste error tracking in questo prodotto: un `console.error` raggiunge
nessuno. L'esito è letto e mappato su **un flag per causa** sul redirect
post-login, nella forma che `middleware.ts:137-139` usa già per
`?access=unavailable`:

| Esito | Flag | Significato |
|---|---|---|
| `unset` | `?master=unconfigured` | la variabile non c'è — nessuno promosso, nessuno retrocesso |
| `malformed` | `?master=malformed` | c'è e non è un indirizzo |
| `ambiguous` | `?master=ambiguous` | corrisponde a più di un account |
| `no_such_account` | `?master=unknown` | non corrisponde a nessuno — il titolare tiene il ruolo |
| `RS001` | `?master=refused` | la guardia zero-master ha abortito |
| altro errore | `?master=unavailable` | la riconciliazione non è girata |
| `reconciled` | *(nessuno)* | il suo effetto osservabile è la riga di registro |
| `unchanged` | *(nessuno)* | il caso comune di ogni login a regime |

Nessuna stringa di fallback condivisa: l'anti-pattern del newsletter è
registrato in questo repo e non è ripetuto.

**Il limite, detto e non implicato: nulla renderizza `?master=` oggi**,
esattamente come nulla renderizza `?link=refused` (43-04) né
`?access=unavailable` (WR-04, differito). L'URL *è* l'effetto osservabile — più
di una riga di log in un prodotto senza error tracking, meno di un avviso.
Renderizzarlo appartiene al piano che tocca `/dashboard` per primo.

**Perché una riconciliazione riuscita è silenziosa.** Non è una svista: l'effetto
osservabile di una retrocessione è la sua riga in `public.membership_acts`, che è
il posto giusto. Mettere un flag sul redirect di un estraneo metterebbe un evento
amministrativo davanti a qualcuno che non lo riguarda.

**I log portano `error.code` e `error.message`, mai l'oggetto e mai
`error.details`** — che su una violazione di CHECK contro `profiles` pubblica
l'intera riga fallita, indirizzo e `membership_code` compresi.

### Dove sta la chiamata, e perché non dentro `if (user)`

La riconciliazione riguarda l'account che l'ambiente di deploy nomina, **non chi
ha appena fatto login**. Farla dipendere da un `getUser()` che riesce legherebbe
due cose che non sono legate. Sta subito dopo lo scambio del codice, ed è una
sola andata-e-ritorno **sulla route di callback, non nel middleware**: non è sul
percorso della porta.

### Verifiche automatiche del task 2

| Controllo | Atteso | Osservato |
|---|---|---|
| `npm run build` | passa | `✓ Compiled successfully` |
| `reconcile_master` (righe non-commento) | ≥1 | **7** |
| `getServiceClient` (righe non-commento) | ≥1 | **2** |
| scrittura diretta del ruolo master nella route | 0 | **0** |
| `npm run verify:no-header-identity` | zero lettori | **entrambe le asserzioni passano** — 238 file, 0 lettori, strip armato (3 delete vivi, 0 set) |

---

## Task 3 — i quattro casi, misurati sul container (`3883739`)

Sonda usa-e-getta in `/tmp`, eseguita e poi **cancellata**; il container è
distrutto a ogni run. Tre account throwaway creati **dentro** quel container, con
indirizzi sotto `example.invalid` (RFC 2606, riservato) — la stessa convenzione
di `scripts/container/seed.mjs`. **Nessun indirizzo reale è stato usato, e
nessuno compare qui.** Nessuna mail è partita. Seed disattivato, così il vincolo
di 43-06 è VALIDO e il registro parte vuoto: ogni riga che appare sotto è una che
questa funzione ha scritto.

Stato iniziale: **due** master, **zero** righe di registro.

### 1 · Il privilegio di esecuzione — il controllo che, se fosse `true`, fermerebbe la fase

| ruolo | `has_function_privilege(…, 'execute')` |
|---|---|
| `authenticated` | **false** |
| `anon` | **false** |
| `public` | **false** |
| `service_role` | true |

ACL grezza: `{postgres=X/postgres,service_role=X/postgres}` ·
`prosecdef = t` · `proconfig = ["search_path=\"\""]`.

### 2 · I quattro casi

| Caso | Chiamata | Esito | master dopo | righe di registro dopo |
|---|---|---|---|---|
| **A** | `reconcile_master(null)` | `{"outcome":"unset","promoted":false,"demoted":0}` | 2 | 0 |
| **B** | `reconcile_master('   ')` | `{"outcome":"unset","promoted":false,"demoted":0}` | 2 | 0 |
| **C1** | `reconcile_master('nobody-here')` | `{"outcome":"malformed","promoted":false,"demoted":0}` | 2 | 0 |
| **C2** | `reconcile_master(<indirizzo senza account>)` | `{"outcome":"no_such_account","promoted":false,"demoted":0}` | 2 | 0 |
| **D** | `reconcile_master(<il valore configurato>)` | `{"outcome":"reconciled","promoted":true,"demoted":2,"masters":1}` | **1** | **3** |

**Il controllo del lockout, asserito e non guardato a occhio:** il conteggio dei
master e quello delle righe di registro sono **identici allo stato iniziale dopo
A, B, C1 e C2** — asserzione unica, `true`. È il controllo che
`43-VALIDATION.md` chiama il più conseguente della fase, ed è il caso C.

**Il caso D è stato chiamato con il valore throwaway scritto tutto in maiuscole e
con due spazi in testa e due in coda** — apposta: è il difetto 4 di § E.1 provato
invece che affermato. Ha trovato l'account lo stesso.

### 3 · Le tre righe di registro scritte dal caso D

| `act` | `actor_kind` | attore | `role_before → role_after` | `status_before → status_after` |
|---|---|---|---|---|
| `promoted` | **`system`** | **null** | `member` → `master` | `pending` → `approved` |
| `demoted` | **`system`** | **null** | `master` → `member` | `approved` → **`approved`** |
| `demoted` | **`system`** | **null** | `master` → `member` | `approved` → **`approved`** |

Tre cose si leggono qui e nessuna è stata affermata:

1. **`actor_kind = 'system'` con attore null** su tutte e tre — l'unica
   combinazione senza attore che il CHECK di 43-07 permette. D-22, misurata.
2. **`status` non si muove sulle retrocessioni**: `approved` → `approved`. I due
   assi restano separati.
3. **La promozione ha mosso i due assi insieme**, `pending`/`member` →
   `approved`/`master`, senza sollevare `23514`. Il container ha il vincolo di
   43-06 valido, quindi questo è il *one statement* provato, non descritto.

`subject_label` è in tutti e tre i casi un **codice di membership**, mai un
indirizzo — il valore non è riportato qui perché è la sola credenziale della
porta, e non serve a nessuno che legga questo documento. Controllo meccanico
sull'intera tabella: righe la cui etichetta o nota contiene una `@` → **0**.

### 4 · Idempotenza per costruzione, non per fortuna

| Chiamata | Esito | righe di registro |
|---|---|---|
| D #2 | `{"outcome":"unchanged","promoted":false,"demoted":0,"masters":1}` | **3** (invariate) |
| D #3 | `{"outcome":"unchanged","promoted":false,"demoted":0,"masters":1}` | **3** (invariate) |

**Come è garantito**, che il piano chiede esplicitamente di dire: i due write non
sono protetti da un `if` che qualcuno potrebbe togliere, ma dai **predicati** che
li selezionano. La promozione gira solo se `role IS DISTINCT FROM 'master'` (o lo
stato non è `approved`); il ciclo di retrocessione itera su
`role = 'master' AND id <> <il nominato>`, che a regime è **l'insieme vuoto**.
Un prodotto non cambiato che fa login due volte al giorno produce **zero** righe.
Conta più qui che in una one-shot: un registro che guadagnasse due righe al
giorno per sempre diventerebbe illeggibile, che è lo stesso fallimento
dell'essere vuoto.

### 5 · Il ramo `ambiguous`, provato

Portando un secondo profilo sullo stesso indirizzo (2 corrispondenze):

```
reconcile_master(<ambiguo>) -> {"outcome":"ambiguous","promoted":false,"demoted":0}
NOTHING CHANGED: true       (master 1 → 1, righe 3 → 3)
```

Un ramo aggiunto che nessuno vede scattare è una decorazione. Questo scatta.

### 6 · La guardia zero-master, **provata per mutazione**

La guardia non può scattare nella funzione vera. Quindi è stata provata su un
mutante a un solo token — soglia `< 1` → `< 99`, nome cambiato — e **la mutazione
è stata asserita applicata prima di leggerne l'esito** (`ai-engineering.md`,
`Gate prova per mutazione`: se la sostituzione non va a segno, il verde che segue
è un falso negativo).

```
MUTATION APPLIED (asserted before reading its result): true
before mutant call    masters=2  register_rows=3
mutant raised: code=RS001 message=reconcile_master.zero_masters: …no master
after  mutant call    masters=2  register_rows=3
ABORTED, NOT PARTIAL: true
```

Due proprietà, entrambe misurate: **lo SQLSTATE è `RS001`**, e il `RAISE`
**abortisce le scritture già fatte** — il mutante aveva una promozione e una
retrocessione da annullare, e il conteggio dei master e quello delle righe sono
tornati identici. Non esiste uno stato in cui alcune retrocessioni sono atterrate
e poi la guardia si è lamentata.

### 7 · La cattura e il confronto, in **questo** piano

Attesa **dichiarata prima di leggerla**: zero differenze. La migration aggiunge
una funzione e nessuna tabella, colonna, policy o riga di grant, quindi la write
matrix non ha nulla di nuovo da sondare.

`baseline:compare --target=container --before-point=43-10 --after-point=43-12
--only=B1,B2,B3`:

```
B1  68 unchanged · 0 by T1 · 0 by T2 · 0 by both · 0 unexplained
    policy_count 68 · rls_enabled_tables 21 — entrambi fermi
B2  294 celle confrontate, nulla mosso · 0/294 vacue
B3  882 celle confrontate, nulla mosso · 860/882 portano evidenza reale
CAP-03: clean
```

**Zero difetti è il risultato atteso ed è il punto**: una differenza qui avrebbe
significato che la migration ha toccato qualcosa che non doveva. Rimandarlo a
43-15 sarebbe stato il batching che questa fase vieta ovunque.

`npm run verify:capabilities -- --target=container` → **5/5 green, 0 warnings.**

---

## Che cosa il verde dimostra, e che cosa no

`CLAUDE.md` Guardrail 1: **non esiste alcun test runner per il prodotto.** Niente
qui è dichiarato verificato perché "i test passano".

- `npm run build` dimostra che il file **compila**. Non dimostra che la migration
  esista, né che gli otto nomi di parametro di `record_membership_act` o il nome
  del parametro `p_email` siano scritti giusti: **nessun client Supabase di
  questo repository è parametrizzato con `Database`**, quindi il nome della
  funzione e ogni chiave dell'oggetto passato alla `.rpc()` sono stringhe che il
  compilatore non guarda.
- **Quei nomi sono però stati eseguiti**, non solo compilati: la sonda del task 3
  ha chiamato `public.reconcile_master(...)` per nome contro lo schema costruito
  dalle migration reali. Quello che resta non eseguito è il ponte
  TypeScript→PostgREST: che `p_email` sia la chiave che PostgREST si aspetta, e
  che `RS001` arrivi al client JS come `error.code`. **Quest'ultima è
  un'assunzione, non una misurazione**, segnalata come 43-09 ha segnalato la
  stessa cosa per `P0002`. La degradazione è sicura: se non arriva, il ramo cade
  su `unavailable` e il fallimento resta osservabile, solo meno preciso.
- Il container non è produzione. Prova che la funzione si applica, gira e si
  comporta come descritto contro *lo schema che le migration costruiscono*.

---

## Le procedure manuali — M-43-05 e M-43-06, scritte, non eseguite

Il piano 43-15 le trasforma in `43-HUMAN-UAT.md`. **Nessun indirizzo compare
qui**: si scrive *il valore configurato*.

> **M-43-05 — la riconciliazione, dal login vero.** Sul sito deployato, dopo che
> `20260808004000_master_reconcile.sql` è stata applicata:
>
> 1. Prima di tutto, nel pannello Vercel: verificare che `MASTER_EMAIL` **non
>    abbia spazi né un a-capo in coda**. Precedente registrato su una variabile
>    sorella (`NEXT_PUBLIC_APP_URL`, che ruppe il webhook SumUp).
> 2. Fare login con un account qualunque. **Atteso:** si atterra sulla dashboard
>    e la barra degli indirizzi **non** contiene `master=`.
> 3. `select count(*) from public.profiles where role = 'master';` →
>    **atteso: 1**, e quell'uno è l'account che `MASTER_EMAIL` nomina.
> 4. `select act, actor_kind, at from public.membership_acts order by at desc
>    limit 5;` → **atteso: nessuna riga nuova** rispetto a prima del login.
>    Se ne compare una a ogni login, la riconciliazione sta scrivendo a vuoto e
>    va fermata.
>
> Registrare data ed esito dei passi 2, 3 e 4. **Stato: non ancora eseguita.**
> Data: ______

> **M-43-06 — il valore sbagliato non svuota il prodotto.** È il controllo che
> `43-VALIDATION.md` chiama il più conseguente della fase, perché sbagliarlo è un
> lockout. **Da fare in una finestra in cui qualcuno può rimettere subito a posto
> la variabile.**
>
> 1. Annotare `select count(*) from public.profiles where role = 'master';`.
> 2. Nel pannello Vercel, **svuotare** `MASTER_EMAIL` e attendere il redeploy.
> 3. Fare login. **Atteso:** la barra degli indirizzi finisce con
>    `master=unconfigured`, e il conteggio del passo 1 **non è cambiato**.
> 4. Rimettere `MASTER_EMAIL` a un valore **ben formato che non corrisponde a
>    nessun account** e attendere il redeploy. Fare login. **Atteso:**
>    `master=unknown`, e il conteggio **ancora non è cambiato**. *Questo è il
>    caso che conta: il titolare tiene il ruolo.*
> 5. **Ripristinare subito il valore corretto**, attendere il redeploy, fare
>    login. **Atteso:** nessun `master=` nell'indirizzo, conteggio invariato.
>
> Se in un qualunque punto il conteggio del passo 1 scende, **fermarsi e
> ripristinare la variabile**: è la condizione che la guardia esiste per
> impedire. **Stato: non ancora eseguita.** Data: ______

---

## Deviazioni dal piano

### Decisioni dell'esecutore (nessuna approvazione dell'utente chiesta né data)

**1. [Deviazione — checkpoint policy] Il task 3 `[BLOCKING]` non è stato
restituito; i quattro casi sono stati eseguiti sul container.**
- **Trovata durante:** task 3
- **Problema:** il checkpoint consegnava sei operazioni su produzione a un
  proprietario che ha dichiarato di non poterle compiere, e l'istruzione della
  fase vieta esplicitamente di applicare migration a produzione e di sondarla in
  scrittura. In più il caso D scrive tre righe di registro, e per la ragione di
  43-11 (`ON DELETE SET NULL` + `subject_label` denormalizzato) quelle righe
  sarebbero rimaste permanenti.
- **Decisione:** eseguire tutti e quattro i casi, più tre osservazioni non
  chieste, contro un container distrutto a fine run.
- **Esito:** ogni criterio di accettazione del task 3 è misurato sopra tranne i
  due che richiedono una persona (il pannello Vercel e un login sul build
  deployato), che sono scritti come M-43-05 e M-43-06 e lasciati aperti.

**2. [Rule 2 — funzionalità critica mancante] Un quinto ramo, `ambiguous`.**
- **Trovata durante:** task 1, leggendo `schema.sql:56`
- **Problema:** il piano prevedeva quattro rami. `public.profiles.email` non ha
  UNIQUE: con due righe corrispondenti un `LIMIT 1` avrebbe promosso una a caso e
  **retrocesso l'altra**, che poteva essere il master in carica. Un lockout per
  la porta di servizio del lockout.
- **Fix:** un `count(*)` prima della risoluzione; `> 1` rifiuta e non tocca
  nulla.
- **File:** `supabase/migrations/20260808004000_master_reconcile.sql` ·
  **Commit:** `f29f0ee` · **Provato:** § Task 3, caso 5

**3. [Rule 2 — zero fallimenti silenziosi] Due flag in più di quelli chiesti.**
- **Problema:** il piano chiedeva un flag per il valore malformato/non impostato
  e uno per la guardia sollevata. Restavano scoperti l'account inesistente — che
  D-16 richiede *esplicitamente* sia osservabile — e il fallimento generico della
  chiamata.
- **Fix:** sei valori di flag, uno per causa, nessuna stringa condivisa.
- **File:** `src/app/api/auth/callback/route.ts` · **Commit:** `7fecbf4`

**4. [decisione minore] La chiamata sta fuori da `if (user)`.**
- Il piano non lo specificava. La riconciliazione riguarda l'account che
  l'ambiente nomina, non chi ha fatto login; legarla a un `getUser()` che riesce
  legherebbe due cose non legate. Motivo scritto accanto alla riga.

---

## Conseguenze da dichiarare

1. **`?master=` si aggiunge ai flag che nessuno renderizza.** Ora sono tre:
   `?access=unavailable` (WR-04), `?link=refused` (43-04) e questo. Il debito è
   riconosciuto e cresce; il piano che tocca `/dashboard` per primo dovrebbe
   chiuderli tutti e tre insieme, non uno alla volta.
2. **Il registro guadagna il suo primo scrittore non umano.** Fino a qui ogni
   riga aveva `actor_kind = 'user'`. Chi legge il registro d'ora in poi vede due
   specie di atti e deve saperlo: un `demoted` di sistema non è la decisione di
   nessuno, è una configurazione che è cambiata.
3. **Niente è deployato.** La migration è committata e non applicata; in
   produzione la callback continuerà a comportarsi come prima finché non lo è. La
   funzione non esiste ancora là, quindi **al primo deploy del solo codice senza
   la migration, ogni login produrrebbe `?master=unavailable`**. Vanno insieme.

---

## Criteri di successo

| # | Criterio | Stato |
|---|---|---|
| 1 | `MASTER_EMAIL` retrocede oltre a promuovere (ROLE-04, D-12) | ✅ misurato — caso D: 1 promosso, 2 retrocessi, in una chiamata |
| 2 | un valore non impostato, malformato, ambiguo o non corrispondente non retrocede nessuno, e non si arriva mai a zero master (D-16) | ✅ misurato — A, B, C1, C2 e il caso ambiguo lasciano conteggi identici; la guardia provata per mutazione |
| 3 | un fallimento è visibile a una persona, non solo a un log | ✅ sei flag, uno per causa — **con il limite dichiarato: nulla li renderizza oggi** |
| 4 | ogni atto è attribuito come atto di sistema (D-22) | ✅ misurato — tre righe, tutte `actor_kind = 'system'` con attore null |
| 5 | l'interruttore è dichiarato: regola datata nella storia, commit che cita l'autorizzazione | ✅ `f29f0ee`, con il paragrafo di `meta-gates.md` per intero nell'header |

---

## Known Stubs

Nessuno. Nessun valore vuoto codificato, nessun placeholder, nessun componente
non cablato. La cosa che non è renderizzata — `?master=` — non è uno stub: è un
effetto osservabile deliberatamente parziale, con il suo limite scritto sia nel
codice sia qui, e appartiene al debito WR-04 già aperto.

---

## Threat Model Outcomes

| Threat ID | Disposizione | Esito |
|---|---|---|
| T-43-12-01 zero master | mitigate | ordine promuovi-poi-retrocedi come difesa primaria; guardia `RS001` provata per mutazione, aborto e non parziale; casi A/B/C misurati |
| T-43-12-02 funzione chiamabile da una sessione autenticata | mitigate | misurato: `authenticated`, `anon`, `public` → **false**; `service_role` → true |
| T-43-12-03 `search_path` mutabile | mitigate | misurato: `proconfig = ["search_path=\"\""]`, `prosecdef = t` |
| T-43-12-04 `MASTER_EMAIL` controllato da un attaccante | accept | registrato, non mitigato in codice: chi può scrivere quella variabile controlla già il deploy |
| T-43-12-05 retrocessione senza autore | mitigate | tre righe di registro, `actor_kind = 'system'`, attore null |
| T-43-12-06 fallimento invisibile | mitigate | esito letto, sei flag, log con `code`/`message` soli |
| T-43-12-07 l'indirizzo pubblicato in migration o summary | mitigate | `grep` a forma di indirizzo sulla migration → 0; questo documento non ne contiene; le righe di registro contengono 0 `@` |
| T-43-12-08 guardia monotona senza autorizzazione | mitigate | paragrafo di `meta-gates.md` per intero nell'header, D-12 citata nel commit |
| T-43-12-SC pacchetti | accept | **nessun pacchetto aggiunto**; `package.json` invariato |

## Threat Flags

Nessuna superficie di sicurezza nuova fuori dal `<threat_model>` del piano. La
sola introdotta — una seconda funzione `SECURITY DEFINER` in `public` che scrive
`role` — è T-43-12-02/03, con mitigazione misurata sopra.

---

## Self-Check: PASSED

File dichiarati creati, verificati presenti:

- `supabase/migrations/20260808004000_master_reconcile.sql` — FOUND
- `.planning/…/baseline/32-BASELINE-policies.container.43-12.json` — FOUND
- `.planning/…/baseline/32-BASELINE-reads.container.43-12.json` — FOUND
- `.planning/…/baseline/32-BASELINE-writes.container.43-12.json` — FOUND
- `src/app/api/auth/callback/route.ts` — FOUND, modificato

Commit dichiarati, verificati nel log:

- `f29f0ee` — FOUND
- `7fecbf4` — FOUND
- `3883739` — FOUND

Gate automatici, eseguiti dopo l'ultimo commit di codice:

- `npm run build` → `✓ Compiled successfully`
- `npm run verify:capabilities -- --target=container` → `5/5 green, 0 warnings`
- `npm run verify:no-header-identity` → entrambe le asserzioni passano
- `npm run baseline:container -- --smoke` → exit 0, 43 file di migration
- `baseline:compare --target=container 43-10 → 43-12 --only=B1,B2,B3` → CAP-03 clean

**Nessun indirizzo, nessun codice di membership e nessun nome compare in questo
documento.** Nessuna migration è stata applicata a produzione e nessuna sonda di
scrittura ha toccato produzione.
