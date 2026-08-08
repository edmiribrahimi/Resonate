---
phase: 43-role-model-account-creation
plan: 09
subsystem: access-gating
tags: [register, attribution, server-action, tagged-result, capability, bulk]
requires:
  - "43-07 — public.record_membership_act, the only writer of the register"
  - "43-06 — profiles_role_implies_approved, the constraint whose 23514 this file makes legible"
  - "43-05 — the `staff` role, which the widened parameter union accepts"
  - "43-01 — measurement 5 (error.code = 23514) and finding 1 (error.details publishes the whole row)"
provides:
  - "MemberActFailure / MemberActResult<T> — the tagged result all eight acts return"
  - "BulkSubjectOutcome / BulkActData — per-subject outcomes and a measured count"
  - "the six single acts, each one .rpc() to record_membership_act"
  - "updateMemberRole widened to verifyAdminOrOrganizer, accepting organizer | staff | member"
affects:
  - "43-11 — writes `created` through the same function; may reuse recordAct's shape"
  - "43-12 — the register-read surface; this plan is what puts rows in it"
  - "43-14 — owns MemberTable; the notice copy here is provisional and marked so"
  - "43-15 — writes manual procedure M-43-08, the only evidence the RPC call actually works"
tech-stack:
  added: []
  patterns:
    - "the failure category is decided by POSITION and by error.code, never by a message a framework may redact"
    - "error.code crosses the wire, error.message is logged, error.details is never touched"
    - "the actor is narrowed to non-null in the type, so an unattributed act cannot be written"
    - "a batch is a loop with per-subject outcomes and a count derived from them"
key-files:
  created: []
  modified:
    - "src/app/(admin)/admin/members/actions.ts"
    - "src/components/admin/MemberTable.tsx"
decisions:
  - "D-21 applied surgically: only updateMemberRole widens; deactivate and reactivate stay master-only"
  - "D-07 held twice — 'master' absent from the writable union, AND a master subject refused, because the widening opened a door the surface only hid"
  - "a sixth failure cause, nothing_to_do, rather than a silent success for an empty batch or an unchanged role"
  - "MemberTable touched because the build required it and because otherwise a refusal would have drawn nothing at all"
  - "no migration applied, no email sent, nothing measured against a database"
metrics:
  tasks: 3
  duration: ~1h
  completed: 2026-08-08
---

# Phase 43 Plan 09: Sei atti, un registro — Summary

Gli otto atti che cambiano chi è qualcuno passano ora da una sola `.rpc()` a
`record_membership_act`: la mutazione e la sua registrazione nella stessa
transazione. Il rifiuto del database arriva a chi guarda lo schermo **come
valore**, non come messaggio — e un batch non dichiara più successi che non ha
avuto.

Tre cambiamenti che stanno insieme, come diceva l'obiettivo del piano: senza il
primo il registro resta vuoto, senza il secondo ACCT-01 non esiste, senza il
terzo il vincolo di 43-06 scatta in un giorno in cui nessuno sa leggerlo.

---

## Task 1 — un fallimento che sopravvive al confine della Server Action (`420fee1`)

Il vocabolario, modellato sull'unico precedente del repository
(`src/app/(admin)/admin/newsletter/actions.ts:62-135`) e non ri-derivato.

**`MemberActFailure`, sei cause.** Cinque chieste dal piano più una:

| causa | da dove viene, per POSIZIONE |
|---|---|
| `capabilities_unavailable` | un throw uscito da `getAccessContext()`, catturato nel primo `try` di `guarded` |
| `forbidden` | un `{ok:false}` **restituito** dalla guardia — la posizione opposta, non un testo |
| `constraint_refused` | `error.code === "23514"` |
| `subject_not_found` | `error.code === "P0002"`, oppure un profilo assente su una lettura `maybeSingle()` |
| `write_failed` | qualunque altro errore del database, o un throw imprevisto dal corpo |
| `nothing_to_do` | **la sesta**: selezione vuota, o un ruolo già uguale a quello richiesto |

La sesta esiste perché il registro ha sette valori e **nessuno significa "non è
successo niente"**. Restituire un successo per una selezione vuota, o scrivere
un atto per un cambio di ruolo che non cambia il ruolo, sarebbe una riga di
storia che il database non ha mai compiuto.

**`constraint_refused` è l'unica causa di questo file che può arrivare da una
REGOLA e non da un difetto**, ed è scritto nel commento accanto alla sua
definizione. La frase che una persona leggerà, scritta qui e riportata nella
copy provvisoria di `MemberTable.tsx`:

> *this account holds a staff role, and a staff role must be approved — the
> write was refused by the database, not by this screen.*

Esiste perché **il giorno in cui il vincolo scatta non sia il giorno in cui
qualcuno impara la parola «redatto»**.

**Il campo che attraversa il filo, e i due che non lo attraversano.** Dalla
misurazione 43-01, finding 1: su una violazione di CHECK contro `public.profiles`,
`error.details` riporta *l'intera riga fallita* — uuid, indirizzo, nome
completo e `membership_code`, che è l'unica credenziale della porta. Quindi, in
questo file:

- `error.code` — decide la categoria, ed è **l'unico campo restituito** al
  chiamante (`detail` è il codice, non il messaggio);
- `error.message` — porta il nome del vincolo, è sicuro, e viene **solo
  loggato**;
- `error.details` — mai letto, mai loggato, mai restituito;
- l'oggetto errore intero — mai loggato, perché `console.error(x, err)`
  serializza `details` insieme a tutto il resto.

**I quattro `console.error("…", err)` preesistenti sono stati resi sicuri**
mentre ero nel file, come suggerito: erano i quattro fallimenti d'invio mail,
e due di loro stampavano **l'indirizzo del membro** (`…to ${m.email}:`). Ora
c'è `logEmailFailure`, che scrive categoria, azione e **id del soggetto** — un
uuid nomina la riga senza nominare la persona, che è la stessa regola che
`record_membership_act` segue per `subject_label`. Lo sweep esteso a tutto il
repository resta fuori perimetro ed è tracciato in
`.planning/todos/pending/postgrest-details-leaks-the-row.md`.

**`unstable_rethrow` in tutti e tre i `catch`**, con la ragione citata da
`newsletter/actions.ts:106-113`: Next segnala il proprio flusso di controllo
lanciando, e un `catch` che lo inghiottisse trasformerebbe una navigazione in un
errore renderizzato.

### La deviazione del task 1, dichiarata subito

**`MemberTable.tsx` è stato toccato, e il build lo imponeva.** `handleAction`
dichiarava `(action: () => Promise<{ success: boolean }>)`: cambiare la forma di
ritorno degli atti rende quel parametro non soddisfatto, e `npm run build` —
l'unico gate automatico del prodotto — sarebbe rimasto rosso, bloccando ogni
piano successivo della fase.

Ma c'era una seconda ragione, più importante della prima. Gli atti **non
lanciano più**, quindi i due `catch` di quel file erano diventati irraggiungibili:
senza intervento un atto rifiutato avrebbe disegnato **niente** — il caso
peggiore, perché si legge come successo. È `meta-gates.md`, *zero fallimenti
silenziosi*, e in questo progetto non esiste error tracking, quindi la riga di
log non raggiunge nessuno.

Quindi: una mappa `FAILURE_NOTICE` con **una frase distinta per causa**, marcata
**provvisoria** nel codice e **di proprietà di 43-14**, che possiede la
formulazione, la collocazione e lo stile. Nessuna decisione d'interfaccia è
stata presa qui: solo la riparazione che tiene onesto il cambiamento.

---

## Task 2 — sei atti, un registro, una transazione ciascuno (`97687ec`)

Ogni atto singolo è ora **una** `.rpc("record_membership_act", …)` con gli otto
argomenti passati per nome ed esplicitamente, `p_party_id` compreso — perché il
giorno in cui la fase 35 lo valorizza sia un diff di una riga.

| atto | valore nel registro | scrittura |
|---|---|---|
| `approveMember` | `approved` | `status: approved` |
| `rejectMember` | `rejected` | `role: member`, `status: rejected` |
| `deactivateMember` | `deactivated` | `role: member`, `status: rejected` |
| `reactivateMember` | `reactivated` | `status: approved` |
| `updateMemberRole` (verso `organizer`/`staff`) | `promoted` | ruolo **e** `approved`, nella stessa istruzione |
| `updateMemberRole` (verso `member`) | `demoted` | il ruolo **soltanto** |

`rejected` e `deactivated` restano due atti per la stessa scrittura, per la
ragione che `acts.ts:41-45` mette per iscritto: uno rifiuta una domanda, l'altro
ritira un accesso concesso, e il registro è l'unico posto dove quella differenza
sopravvive.

**La frase delle due assi sopravvive verbatim** —
*«Demotion does NOT revoke approval: `member` and `approved` are different axes
…, and someone who was approved stays approved when they stop being staff»* — e
la retrocessione passa il ruolo da solo, così la funzione lascia lo stato dov'è.

**L'attore.** `ctx.userId` da **un solo** `getAccessContext()` per azione
(`cache()` non memoizza dentro una Server Action, misurato in
`capabilities/server.ts:103-116`), e `actor_kind: 'user'` sempre. Il tipo
`ActorContext = AccessContextResult & { userId: string }` porta il non-null
attraverso la guardia, così **è il compilatore e non un revisore** a impedire
che venga scritto un atto senza autore — che il CHECK
`membership_acts_actor_attributed` rifiuterebbe comunque, ma a runtime.
`npm run verify:no-header-identity`: **`✓ A` e `✓ B`, zero lettori di header**.

### L'allargamento, dichiarato e circoscritto

`updateMemberRole` passa da `verifyMaster()` a `verifyAdminOrOrganizer()`, e il
commento sopra la funzione lo chiama **widening** a lettere piene, nominando
D-21 e D-07 — perché il commit non lo faccia passare inosservato a chi legge.
Il parametro passa a `"organizer" | "staff" | "member"`, l'unico punto della
fase in cui il compilatore aiuta.

**Nient'altro si muove.** `deactivateMember` e `reactivateMember` restano su
`verifyMaster`, e le due guardie restano due funzioni non fuse — anche
parametrizzare la chiave sarebbe stata la stessa fusione travestita da
argomento, e il blocco di commento che lo dice è stato esteso invece che
rimosso.

### Il soffitto, e la metà che il piano non aveva previsto

D-07 regge in **due** punti, non uno:

1. **il bersaglio** non può essere `master`: non è membro dell'unione
   `WritableRole`, non è argomento di nulla e nessun ramo lo scrive. È
   irrappresentabile, non validato — un `if` si può togliere, un membro d'unione
   assente non si raggiunge.
2. **il soggetto** non può essere un `master`: rifiutato con
   `forbidden` / `subject_is_master`.

Il secondo è una **deviazione [Rule 2]** e nasce esattamente dall'allargamento:
finché l'atto era master-only, un organizer non poteva retrocedere il master.
Da oggi la porta è aperta, e la superficie la nasconde soltanto
(`MemberTable.tsx`, *"Don't show role actions for other masters"*) — mentre una
Server Action è un endpoint pubblico con una firma comoda
(`nextjs-architecture.md`, gate *server action autorizzata*). Nascondere non è
rifiutare.

Conseguenza per il grep del piano: `"master"` compare **3 volte** nel file — due
in una tabella di equivalenza dentro un commento, una nel confronto di rifiuto
sopra. Nessuna è un bersaglio di scrittura.

---

## Task 3 — due atti bulk che non possono dichiarare un successo che non hanno avuto (`96fb3f3`)

Erano una sola istruzione su `.in()` che restituiva
`{ success: true, count: memberIds.length }` — **un conteggio affermato
dall'input**, che avrebbe riportato N qualunque cosa il database avesse fatto.
Non sembra un errore: sembra una ricevuta.

Il registro decide la forma da solo — una riga per soggetto, quindi un ciclo — e
`community-membership.md` (gate *chi decide è tracciato*) chiede la stessa cosa
dall'altro lato: un atto su uno stato, con chi e quando. Una riga sola per molti
soggetti non lo soddisfa.

- **outcome per soggetto** — `{ subjectId, ok, failure? }`;
- **il conteggio è misurato dagli outcome**. `memberIds.length` è letto una
  volta in una costante chiamata `requested` e usato **solo come denominatore di
  un rapporto**;
- **un soggetto rifiutato non aborta gli altri**: una serie di approvazioni in
  cui una riga è rifiutata deve approvare le altre, e chi sa *quale* ha fallito
  può agire — chi sente dire «il batch è fallito» può solo ricominciare;
- **la mail parte solo verso i soggetti il cui atto è atterrato**. Approvare
  nessuno e scrivergli comunque è la stessa bugia del conteggio affermato,
  raccontata al membro invece che all'operatore;
- entrambi restano su `verifyAdminOrOrganizer`, invariati.

Sulla superficie, un batch parzialmente fallito riporta **entrambi i numeri** e
**ogni causa distinta**, e lascia **selezionati i soggetti rifiutati**, così il
tentativo successivo è un clic e non una ricerca a mano nella lista.

---

## Le firme cambiate, per il piano 43-14

Otto firme cambiano. Nessuna lancia più.

```ts
export type MemberActFailure =
  | "capabilities_unavailable" | "forbidden" | "constraint_refused"
  | "subject_not_found" | "write_failed" | "nothing_to_do";

export type MemberActResult<T> =
  | { ok: true; data: T }
  | { ok: false; failure: MemberActFailure; detail: string };

export type BulkSubjectOutcome = { subjectId: string; ok: boolean; failure?: MemberActFailure };
export type BulkActData = { succeeded: number; failed: number; outcomes: BulkSubjectOutcome[] };
```

| atto | prima | adesso |
|---|---|---|
| `updateMemberRole(id, "organizer" \| "member")` | `{ success: true }`, lanciava | `updateMemberRole(id, "organizer" \| "staff" \| "member")` → `MemberActResult<{memberId, actId}>` |
| `deactivateMember` · `reactivateMember` · `approveMember` · `rejectMember` | `{ success: true }`, lanciavano | `MemberActResult<{memberId, actId}>` |
| `bulkApproveMember` · `bulkRejectMember` | `{ success: true, count }`, lanciavano | `MemberActResult<BulkActData>` |

**Nessuna di queste è rimasta source-compatible**, e non lo poteva essere: un
risultato che portasse ancora `success: boolean` avrebbe lasciato ogni
chiamante libero di ignorare la causa, che è esattamente il difetto. L'unico
chiamante nel repository è `src/components/admin/MemberTable.tsx`, aggiornato
qui — **43-14 lo possiede**, e ciò che vi troverà è: la mappa `FAILURE_NOTICE`
(sei frasi, marcate provvisorie), `handleAction` che ramifica su `result.ok`, e
`handleBulk` con il suo `bulkNotice`.

---

## Deviazioni dal piano

### 1. [Rule 2 — funzionalità critica mancante] Un soggetto `master` è rifiutato in `updateMemberRole`

- **Trovata durante:** task 2, scrivendo l'allargamento del gate.
- **Problema:** con `verifyAdminOrOrganizer` un organizer può chiamare
  `updateMemberRole(<id del master>, "member")` e retrocedere il master. Non è
  una promozione, quindi il soffitto di D-07 sul *bersaglio* non lo copriva, ma
  si raggiunge dalla stessa porta che questo piano apre.
- **Fix:** lettura del ruolo corrente del soggetto e rifiuto
  `forbidden` / `subject_is_master`.
- **File:** `src/app/(admin)/admin/members/actions.ts` · **Commit:** `97687ec`

### 2. [Rule 2 — zero fallimenti silenziosi] `MemberTable.tsx` è stato modificato

- **Trovata durante:** task 1.
- **Due ragioni, entrambe vincolanti:** (a) il build lo imponeva —
  `handleAction` dichiarava `Promise<{success: boolean}>`; (b) senza intervento
  un atto rifiutato non avrebbe disegnato nulla, perché i `catch` di quel file
  erano diventati irraggiungibili.
- **Perimetro tenuto stretto:** copy provvisoria marcata tale, nessuna
  decisione d'interfaccia, 43-14 resta il proprietario.
- **File:** `src/components/admin/MemberTable.tsx` · **Commit:** `420fee1`, `96fb3f3`

### 3. [decisione dell'esecutore] Una sesta causa, `nothing_to_do`

Il piano ne chiedeva «almeno cinque». La sesta copre selezione vuota e ruolo
invariato, che prima erano rispettivamente un throw e un caso non gestito.
Alternativa scartata: scrivere comunque un atto — il registro non ha un valore
per «non è successo niente», e inventarlo significa mettere in storia una
transizione mai avvenuta.

### 4. [scostamento dai comandi di verifica del piano, non dai criteri]

Due grep del piano non danno il numero che il piano si aspettava, e i criteri
d'accettazione reggono comunque. Lo dico invece di lasciarlo trovare:

| grep del piano | atteso | osservato | perché |
|---|---|---|---|
| `grep -c "memberIds.length"` == 0 | 0 | **3** | una è il commento che spiega la forma rimossa, una è `const requested = memberIds.length` (denominatore di un rapporto), una è dentro lo stesso commento. **Nessuna è restituita come conteggio di successi**, che è il criterio. |
| `grep -c "\"master\""` | (non dichiarato) | **3** | due in una tabella dentro un commento, una nel rifiuto di un soggetto master. Nessuna è un bersaglio di scrittura. |

---

## Verifica — e ciò che NON prova

**Eseguito, dopo l'ultimo commit di codice:**

| comando | esito |
|---|---|
| `npm run build` | `✓ Compiled successfully`, TypeScript eseguito, tabella delle 64 rotte emessa |
| `npm run verify:no-header-identity` | `✓ A` · `✓ B` — 236 file, nessun lettore di header fuori dal middleware |
| `grep unstable_rethrow` (righe non-commento) | 3 — uno per `catch` |
| `grep record_membership_act` (righe non-commento) | 2 — la `.rpc()` e il tipo del suo helper |
| `grep 'error.message ==='` | 0 |
| `grep 'error.details'` | 2, **entrambe righe di commento** (72, 80) che dicono di non leggerlo |
| `grep '.update('` | 0 su `profiles` per atti — restano solo le `.rpc()` |

**E adesso ciò che quel verde non prova, perché in questo repository è la parte
che conta.**

`CLAUDE.md` Guardrail 1: **non esiste alcun test runner per il prodotto**, e
nessun client Supabase di questo repository è parametrizzato con `Database`.
Quindi `npm run build` prova che questo file **compila** e non prova:

- che `record_membership_act` esista con quel nome;
- che gli otto nomi di parametro siano scritti giusti;
- che il SQLSTATE `P0002` sollevato dalla funzione arrivi al client come
  `error.code === "P0002"` — **questa è un'assunzione, non una misurazione**.
  `23514` è misurato (43-01, misurazione 5); la mappatura di un `RAISE
  EXCEPTION` personalizzato attraverso PostgREST **non lo è**. Se non regge, la
  causa degrada a `write_failed`, che resta visibile e distinguibile da un
  successo — ma la frase mostrata sarebbe quella sbagliata.

**L'evidenza comportamentale di questo piano è manuale**: procedura M-43-08
(cinque atti, un registro), scritta dal piano 43-15. Non è stata eseguita qui e
non poteva esserlo: la migration di 43-07 **non è applicata a produzione**, e
questa fase non applica migration a produzione.

**Nessuna migration è stata applicata. Nessuna mail è stata inviata.
Nessuna misura è stata presa contro un database** — né produzione né container:
`scripts/container/seed.mjs` e `scripts/rls-baseline.mjs` appartengono al piano
43-08, che gira in parallelo, e non sono stati toccati.

**Nessuna approvazione dell'utente esiste per nulla di questo piano.** Ogni
decisione qui è dell'esecutore.

---

## Un vincolo che resta acceso

Il registro ora ha uno scrittore per sei atti su sette. Il settimo, `created`, è
il piano 43-11. Finché **la migration di 43-07 non è deployata**, questo codice
gira contro un database che non ha la funzione: ogni atto risponderebbe con un
errore PostgREST (funzione inesistente) classificato `write_failed`, e la
superficie disegnerebbe *"The write failed. Nothing was changed."* — che è vero,
visibile e non silenzioso, ma **è il deploy della migration a rendere questa
pagina funzionante**, non questo commit. Va detto, perché l'ordine di deploy è
una precondizione e non un dettaglio: `staff_role` → `role_implies_approved` →
`membership_register` → questo codice.

---

## Criteri di successo

1. **Ogni atto che cambia chi qualcuno è scrive il registro nella stessa
   transazione del cambiamento** (D-11, ACCT-04) — ✅ nel codice: sei atti
   singoli e due bulk, tutti su `record_membership_act`, nessuna `.update()`
   residua su `profiles`. **Verificato dal compilatore, non da un database**.
2. **Un organizer può promuovere a `organizer` o `staff`, e nessun percorso
   raggiunge `master`** (D-07, D-21, ACCT-01) — ✅ gate allargato solo su
   `updateMemberRole`; `master` assente dall'unione scrivibile **e** rifiutato
   come soggetto.
3. **Una scrittura rifiutata dal vincolo arriva come `constraint_refused`, in
   build di produzione** (D-04, ROLE-02) — ✅ per costruzione: la categoria è un
   valore deciso da `error.code`, e nessun ramo confronta un messaggio. Il
   comportamento a runtime è M-43-08.
4. **Un atto bulk riporta ciò che è successo davvero, per soggetto** — ✅
   outcome per soggetto, conteggio derivato, `memberIds.length` mai restituito
   come successo.

---

## Known Stubs

Nessuno stub di dati. Un solo elemento dichiarato **provvisorio**: la mappa
`FAILURE_NOTICE` in `src/components/admin/MemberTable.tsx` — sei frasi reali,
non segnaposto, che disegnano una causa distinta ciascuna, marcate nel codice
come di proprietà del piano 43-14 per formulazione e stile. Nessun valore vuoto
codificato, nessun componente non cablato, nessun TODO lasciato.

---

## Threat Flags

Una superficie nuova non prevista dal `<threat_model>` del piano, e la sua
mitigazione è già dentro:

| Flag | File | Descrizione |
|------|------|-------------|
| threat_flag: elevation_of_privilege | `src/app/(admin)/admin/members/actions.ts` | L'allargamento di D-21 rende raggiungibile da un organizer la retrocessione del **master** — un percorso che il threat register non nominava perché guarda al bersaglio e non al soggetto. Mitigato: `forbidden` / `subject_is_master`. |

---

## Self-Check: PASSED

File dichiarati modificati, verificati presenti:

- `src/app/(admin)/admin/members/actions.ts` — FOUND
- `src/components/admin/MemberTable.tsx` — FOUND
- `.planning/phases/43-role-model-account-creation/43-09-SUMMARY.md` — FOUND

Commit dichiarati, verificati nel log:

- `420fee1` — FOUND
- `97687ec` — FOUND
- `96fb3f3` — FOUND
