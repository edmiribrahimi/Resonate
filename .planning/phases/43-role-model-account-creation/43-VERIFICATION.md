---
phase: 43-role-model-account-creation
verified: 2026-08-08
status: human_needed
score: "9/9 con codice e DDL a posto e corretti alla lettura · 4/9 con evidenza automatica, misurata solo su container · 0/9 osservati in produzione"
must_haves_total: 9
code_in_place: 9
automated_evidence: 4
observed_in_production: 0
deployed: false
migrations_committed: 6
migrations_applied: 0
manual_procedures_written: 16
manual_procedures_executed: 0
review_findings_open: 11
verifier_measurements_run:
  - "npm run build → exit 0"
  - "npm run verify:no-header-identity → exit 0"
  - "npm run verify:persona → 7/7 verdi"
  - "npm run verify:capabilities --target=container → 5/5 verde, 0 warning, 44 migration applicate"
  - "npm run verify:capabilities --target=production → FAILED 4/5 (misura della distanza dal deploy)"
  - "npm run baseline:container -- --seed-only --report → 6/6 rifiuti 23514, 12/12 celle role×status"
  - "SELECT slug FROM public.events (sola lettura) → 2 slug, 0 violano [a-z0-9-]{1,80} — chiude IN-04"
human_verification:
  - test: "Applicare le sei migration nell'ordine di 43-HUMAN-UAT.md, poi promuovere il build"
    expected: "Le sei applicano senza errore; il codice va dopo, mai prima"
    why_human: "Nessuno strumento del repo applica migration a produzione, e l'ordine e' l'unica cosa che rende eseguibili le altre quindici prove"
  - test: "Prima del deploy: rendere idempotente 20260808001000_role_implies_approved.sql (WR-04)"
    expected: "DROP CONSTRAINT IF EXISTS prima dell'ADD, come fa la migration sorella a :71-76"
    why_human: "Decisione del proprietario su un file di migration, in una fase che si applica a mano"
  - test: "M-43-01 — un account appena creato entra alla porta prima di aver mai fatto login"
    expected: "Il codice tessera e' ammesso, l'ingresso e' registrato"
    why_human: "ACCT-02: serve una serata, un telefono e una scansione. Nessuno strumento di questo repository puo' raggiungerlo"
  - test: "M-43-02 — lo stesso ingresso con la radio spenta, nei due ordini rispetto al download del roster"
    expected: "Il primo ordine ammette; il secondo e' previsto in rifiuto, ed e' il limite onesto di una porta offline"
    why_human: "Lo store offline vive su un dispositivo"
  - test: "M-43-03 — seguire il link dell'invito e impostare davvero una password"
    expected: "Il link atterra su /set-password e la password viene accettata"
    why_human: "ACCT-03: semantica di una mail piu' un flusso browser. Nessun link e' mai stato seguito"
  - test: "M-43-04 · W-43-14-B — una scrittura rifiutata dal CHECK e' distinguibile, non «qualcosa e' andato storto»"
    expected: "Una frase per causa"
    why_human: "Next redige i messaggi delle Server Action solo in produzione: next dev non prova nulla"
  - test: "M-43-05 · M-43-06 — MASTER_EMAIL promuove e degrada, e un valore non corrispondente non degrada nessuno"
    expected: "Il conteggio dei master non scende mai a zero"
    why_human: "La prova a piu' alta conseguenza della fase: sbagliarla e' un lockout. Misurata su container, mai in produzione"
  - test: "M-43-07 — un organizer non raggiunge master, ne' creando ne' promuovendo"
    expected: "Rifiuto con detail role_not_writable"
    why_human: "Il soffitto e' una guard in una Server Action, invisibile a una sonda di policy"
  - test: "M-43-08 — i sei atti piu' la creazione scrivono davvero la loro riga nel registro"
    expected: "Una riga per atto, con autore e timestamp"
    why_human: "ACCT-04: la matrice di scrittura prova CHI puo' scrivere, mai CHE un atto sia stato registrato. Nessun piano l'ha chiusa e nessuno poteva"
  - test: "M-43-09 · W-43-14-E — un membro legge zero righe di registro in produzione"
    expected: "Zero righe"
    why_human: "La Management API bypassa la RLS: solo una sessione vera misura la RLS"
  - test: "M-43-10 — un ingresso staff compare nella lista della serata ed e' leggibile"
    expected: "L'ingresso c'e' e si capisce che e' staff"
    why_human: "ACCT-05: un conteggio non e' un rilevatore di leggibilita'"
  - test: "M-43-11 — l'upgrade IndexedDB su un telefono con una scansione in coda"
    expected: "Nessuna riga persa, la coda si sincronizza"
    why_human: "La porta e' un dispositivo, e questa e' l'unica modifica alla porta della fase"
  - test: "W-43-14-A · C · D · F — le quattro camminate d'interfaccia"
    expected: "Il quarto ruolo e' trovabile e assegnabile; un batch nomina quale soggetto ha fallito; il registro si legge e nomina un atto di sistema come tale; i tre flag di arrivo appaiono solo quando impostati"
    why_human: "Giudizi d'interfaccia"
  - test: "Le cinque prove della riparazione CR-01 in coda a 43-REVIEW.md"
    expected: "subject_is_master, self_reject, restoration_is_master_only, withdrawal_is_master_only, e nessun banner ambra con le migration non applicate"
    why_human: "Il guard e' a runtime; il build non prova che rifiuti davvero"
owner_decision_required:
  - decision: "Un organizer non puo' piu' riaprire una domanda respinta — solo il master puo'"
    surfaced_by: "La riparazione CR-01, regola 3 (restoration_is_master_only)"
    why: "E' un cambiamento alla politica d'accesso, e la politica d'accesso di questo progetto non e' scritta da nessuna parte. Nessuno l'ha approvato: e' stato deciso da un esecutore"
    reference: "src/app/(admin)/admin/members/actions.ts:722-733"
deferred_debt:
  - ".planning/todos/pending/postgrest-details-leaks-the-row.md"
  - ".planning/todos/pending/profiles-email-not-unique.md"
  - ".planning/todos/pending/register-read-unreachable-for-organizers.md"
  - "43-REVIEW.md — undici finding aperti: WR-02, WR-03, WR-04, WR-06, WR-07, WR-08, IN-01…IN-05"
---

# Fase 43: Role Model & Account Creation — Verification Report

**Obiettivo (ROADMAP):** i quattro ruoli esistono, con `staff` che concede
l'ingresso e nient'altro; master e organizer creano account, e ogni atto che
cambia chi e' qualcuno viene registrato con il suo autore.

**Verificato:** 2026-08-08
**Stato:** `human_needed`

---

## La frase da cui parte tutto il resto

**Niente di questa fase e' in produzione.** Le sei migration sono committate e
**nessuna e' applicata**; il codice non e' deployato. L'ho misurato io, non l'ho
letto in un SUMMARY:

```
npm run verify:capabilities -- --target=production
  → FAILED 4/5
  DB has 8 keys, expected 9
  "register.read" ... has NO ROW in private.capabilities
  master × register.read      — NO ROW in private.role_capabilities
  organizer × register.read   — NO ROW in private.role_capabilities
  staff × membership.active   — NO ROW in private.role_capabilities
  staff × membership.card.view — NO ROW in private.role_capabilities
```

Produzione porta oggi **8 chiavi e 16 righe di grant** — esattamente la linea di
base della fase 32. `staff` esiste nel codice e **non esiste nel database che i
membri raggiungono**. Ogni verde di questa fase e' stato misurato su un
`postgres:17.6` usa e getta, costruito dalle migration e distrutto subito dopo.

Un verdetto `passed` sarebbe stato falso. Un verdetto `gaps_found` sarebbe stato
altrettanto falso nell'altra direzione: **non ho trovato un solo must-have il cui
codice manchi, sia uno stub, o non sia collegato.** Cio' che manca non e' codice:
e' una persona davanti a un browser e una persona alla porta.

---

## Cosa ho misurato io, oggi, in questo worktree

Il worktree principale ha Docker e `.env.local` — che il worktree
dell'esecutore non aveva. Ho quindi potuto rifare le misure invece di crederci.

| Comando | Esito |
|---|---|
| `npm run build` | **exit 0** — `✓ Compiled successfully`, typecheck di Next incluso |
| `npm run verify:no-header-identity` | **exit 0** — la strip e' armata, 3 delete vivi, nessun set vivo |
| `npm run verify:persona` | **7/7 verdi** |
| `npm run verify:capabilities -- --target=container` | **5/5 verde, 0 warning** — 44 migration applicate, 21 tabelle con RLS, 42 coppie tabella/ruolo, **20 grant e 16 rifiuti su 4 ruoli × 9 chiavi, in entrambe le direzioni** |
| `npm run verify:capabilities -- --target=production` | **FAILED 4/5** — vedi sopra. E' la misura della distanza dal deploy |
| `npm run baseline:container -- --seed-only --report` | **6/6 scritture proibite rifiutate**, `23514 profiles_role_implies_approved` su ognuna; **12/12 celle role × status**; `pg_get_constraintdef` riletto |
| `SELECT slug FROM public.events` (sola lettura) | **2 slug, 0 violano `[a-z0-9-]{1,80}`** — chiude IN-04 |

Nessuna migration applicata. Nessuna mail inviata. Nessuna scrittura su
produzione: l'unica query di produzione e' stata una `SELECT` su `events.slug`.

L'uscita testuale della sonda seed, che vale piu' di qualunque riassunto:

```
profiles_role_implies_approved restored:
  CHECK (((role <> ALL (ARRAY['master','organizer','staff'])) OR (status = 'approved'))) NOT VALID
refused organizer/pending   23514 profiles_role_implies_approved
refused organizer/rejected  23514 profiles_role_implies_approved
refused master/pending      23514 profiles_role_implies_approved
refused master/rejected     23514 profiles_role_implies_approved
refused staff/pending       23514 profiles_role_implies_approved
refused staff/rejected      23514 profiles_role_implies_approved
6/6 forbidden writes refused, profiles still 12 rows
profiles role × status: master/approved=1 master/pending=1 master/rejected=1
  member/approved=1 member/pending=1 member/rejected=1
  organizer/approved=1 organizer/pending=1 organizer/rejected=1
  staff/approved=1 staff/pending=1 staff/rejected=1
```

Le quattro persone proibite ci sono ancora tutte e quattro. ROLE-03 regge, ed e'
l'unico requisito di questa fase che regge **completamente**, perche' il suo
soggetto *e'* il container.

---

## La trappola — il controllo che, se fallisse, invaliderebbe tutto il resto

Il ROADMAP dice che `door.operate`'s `requires_approved = false` **sembrera'**
ridondante una volta esistente il CHECK, e che qualcuno proporra' di rimuoverlo
come pulizia. Verificato per ispezione diretta, non per fiducia:

- `supabase/migrations/20260807000000_capability_model.sql:416-417` —
  `('master','door.operate',false)` e `('organizer','door.operate',false)`.
  **Entrambe le righe sono ancora `false`, ed entrambe sono ancora li'.**
- `grep -rn "UPDATE private.role_capabilities|DELETE FROM private.role_capabilities"
  supabase/migrations/` → **nessun risultato in tutto il repository.** Nessuna
  migration della fase 43 tocca quelle righe.
- `supabase/migrations/20260808001000_role_implies_approved.sql:113-140` — la
  trappola e' scritta **dentro il file che la creerebbe**, con la citazione
  testuale del ROADMAP e la ragione: *«il giorno in cui qualcuno aggiunge
  `... OR role = 'x'` al predicato sopra per un caso speciale legittimo,
  `requires_approved = false` e' cio' che tiene la porta aperta mentre
  quell'eccezione esiste»*.
- `supabase/migrations/20260808000500_staff_role.sql:143-145` — `staff` riceve
  **nessuna** riga `door.operate`, dichiarato come rifiuto esplicito e non come
  assenza.
- `scripts/verify-capabilities.mjs:200,223` — `'door.operate': false` su entrambi
  i grant, `:286,:308` — `'door.operate': 'REFUSED'` per `staff` e per `member`.
  **La quinta sponda lo rilegge a ogni esecuzione**, ed e' verde sul container.

**ROLE-03 / D-06: VERIFICATO.** La trappola e' stata rifiutata, ed e' stata
rifiutata *per iscritto nel posto dove un lettore futuro la incontrera'*, che era
la meta' difficile della richiesta.

---

## Requisito per requisito, con l'evidenza

### ROLE-01 — `staff` concede l'ingresso e nient'altro

| Dove | Cosa c'e' |
|---|---|
| `supabase/migrations/20260808000500_staff_role.sql:76` e `:101` | **entrambi** i CHECK di ruolo allargati a `('master','organizer','staff','member')` — i due che `43-RESEARCH.md` aveva misurato, non uno solo |
| `20260808000500_staff_role.sql:122,136` | due sole righe di grant: `('staff','membership.card.view',true)` e `('staff','membership.active',true)` |
| `20260808000500_staff_role.sql:143-145` | i sei rifiuti dichiarati: `door.operate`, `staff.manage`, `catalogue.manage`, `organizer.access`, `admin.access`, `master.manage` |
| `src/types/database.ts:38` | `export type UserRole = "master" \| "organizer" \| "staff" \| "member"` |
| `src/lib/rbac/roles.ts:14` | `STAFF: "staff"` |
| `src/lib/rbac/roles.ts:68-78` | la voce di navigazione Check-in **non** guadagna `"staff"`, con la ragione scritta: *«mostrerebbe un tab che porta a un redirect»* |
| `src/lib/supabase/middleware.ts:181` | `/admin/scanner` e' giudicato da `door.operate` prima del ramo `/admin`, e `staff` non ce l'ha |

**Migration, tipi e catalogo concordano**, e non l'ho dedotto: la quinta sponda
di `verify-capabilities` lo misura leggendo `private.role_capabilities` e ha
letto **20 grant e 16 rifiuti su 36 coppie**, in entrambe le direzioni, verde.

**Una precisazione dovuta.** ROLE-01 dice *«concede esattamente una cosa»*, e le
capability sono **due**: `membership.card.view` e `membership.active`. E' **D-14**
(`43-CONTEXT.md:81`), decisione del proprietario del 2026-08-07: rifiutare
`membership.active` renderebbe `staff` l'unico ruolo che non puo' fare RSVP a una
serata. Non e' una deriva, e' un raffinamento datato — ma il testo di ROLE-01 in
`.planning/REQUIREMENTS.md:59` dice ancora *«esattamente una cosa»*, e quella riga
andrebbe allineata quando il proprietario chiudera' il requisito.

**Verdetto:** codice e DDL corretti; **rilevatore automatico esiste e e' verde**
(la prima volta che questo repository ha un rilevatore di una riga di grant
sbagliata); **assente da produzione**.

### ROLE-02 — `role ⇒ approved`, per regola del database

`supabase/migrations/20260808001000_role_implies_approved.sql:103-105`:

```sql
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_role_implies_approved
  CHECK (role NOT IN ('master', 'organizer', 'staff') OR status = 'approved');
```

Il nome e' esplicito per una ragione misurata (`:97-101`): un CHECK inline
sarebbe atterrato come `profiles_role_check1`, **entrambi applicati e nessuno dei
due greppabile per intento**.

Misurato da me sul container: **sei** scritture proibite, ognuna rifiutata con
`23514` **e** con il nome del vincolo — quindi un verde per la ragione sbagliata
e' impossibile. Le quattro persone di ROLE-03 piu' le due nuove di `staff`.

**Ogni percorso di scrittura su `public.profiles` resta compatibile col vincolo**,
e non e' un'assunzione: `updateMemberRole` scrive `status = 'approved'` nella
stessa istruzione che concede un ruolo staff
(`src/app/(admin)/admin/members/actions.ts:845`, `statusWrite`), `rejectMember`
scrive `role: "member"` insieme a `status: "rejected"` — che il CHECK ammette — e
`createAccount` crea gia' `approved`.

**Il buco che resta e' l'idempotenza**, ed e' aperto: la migration **non** ha
`DROP CONSTRAINT IF EXISTS` prima dell'`ADD`, mentre la sorella
`20260808000500_staff_role.sql:71-76` ce l'ha e ne spiega il perche'. E' WR-04,
lasciato aperto deliberatamente. Su una fase che il proprietario applica **a
mano, sei file in ordine**, un `42710 already exists` alla seconda esecuzione
manda in rollback la transazione e **lascia non applicate tutte le migration
successive della coda**. E' il momento scomodo di cui parla
`supabase-data.md`, gate *idempotenza DDL*.

**Verdetto:** DDL corretto, rilevatore automatico verde sul container, **non
applicato**. **Da riparare prima del deploy**, non dopo.

### ROLE-03 — l'arnese conserva le quattro persone proibite

Misurato da me: `12/12` celle `role × status`, `organizer/pending`,
`organizer/rejected`, `master/pending`, `master/rejected` tutte presenti dopo il
seed, il vincolo riletto e ripristinato `NOT VALID`, e la differenza rispetto a
produzione (`convalidated=false` qui, `true` la') **stampata su ogni
esecuzione** invece che lasciata da scoprire.

**Verdetto: VERIFICATO senza riserve.** E' l'unico requisito la cui verifica non
dipende da un deploy, perche' il suo soggetto e' il container stesso.

### ROLE-04 — `MASTER_EMAIL` degrada oltre che promuovere

| Dove | Cosa c'e' |
|---|---|
| `supabase/migrations/20260808004000_master_reconcile.sql:337-338` | la guardia zero-master: `IF v_masters < 1 THEN RAISE EXCEPTION 'reconcile_master.zero_masters: …'` — controllata **prima** del commit |
| `20260808004000:368-372` | `REVOKE` poi `GRANT`, nell'ordine giusto, su una funzione `SECURITY DEFINER` che scrive `role` |
| `src/app/api/auth/callback/route.ts:236,351` | `reconcileMaster()` chiamata dopo lo scambio di sessione |
| `src/app/api/auth/callback/route.ts:182` | `SCHEMA_AHEAD_OF_DATABASE = new Set(["PGRST202","42883","42P01"])` — la riparazione WR-05: un database indietro rispetto al deploy e' un NO-OP silenzioso verso l'utente e una categoria di log propria (`:268`, `[auth.reconcile_master.schema_absent]`), non un banner ambra a 150 membri |

**Verdetto:** codice e DDL a posto. Il comportamento e' stato misurato **sul
container** dal piano 43-12 (cinque casi, conteggio master mai zero, guardia
provata per mutazione) e **mai in produzione**. M-43-05 e M-43-06 restano, e
M-43-06 e' **la prova a piu' alta conseguenza della fase**: sbagliarla e' un
lockout, cioe' esattamente il difetto che D-12 esiste per riparare.

**Un residuo aperto che vale la pena nominare (WR-06):** una promozione o una
degradazione a `master` **non produce nessuna riga di log applicativa**
(`callback/route.ts:214-222`, `case "reconciled": return null`). L'unico effetto
osservabile e' la riga in `membership_acts`, e l'unica superficie che la legge —
`/admin/members/register` — sta sotto `/admin/*`, quindi dietro `admin.access`,
**che e' il master soltanto** (`src/lib/supabase/middleware.ts:187`). *Il master
appena degradato non puo' leggere la riga che spiega perche'.* In un repository
senza error tracking (`meta-gates.md`, verificato 2026-08-05) questo e' un
fallimento che non raggiunge nessuno.

### ACCT-01 — creazione e promozione, col soffitto

Il soffitto e' tenuto **due volte**, e nessuna delle due e' ridondante:

- `src/app/(admin)/admin/members/actions.ts:755` —
  `type WritableRole = "organizer" | "staff" | "member"`: `'master'` non e'
  rappresentabile nel sorgente;
- `actions.ts:796` — `isWritableRole`, e `:836` / `:1502` che la invocano a
  runtime. Il commento a `:770-795` dice perche': *«una Server Action e' un
  endpoint pubblico, TypeScript e' cancellato prima che il body POST venga
  deserializzato»*. Il soffitto nel tipo non ferma i byte; questo predicato si'.

**D-21 e' stato fatto**, e non era ereditato: `updateMemberRole` era master-only
(`verifyMaster()`), oggi e' `guarded("updateMemberRole", verifyAdminOrOrganizer, …)`
a `actions.ts:832`. Un organizer promuove a organizer; nessuno arriva a master.

**La riparazione CR-01 e' reale e l'ho letta.** `assertSubjectActionable`
(`actions.ts:681-745`) esiste, e' chiamata da `updateMemberRole` (`:851`),
`deactivateMember` (`:913`), `reactivateMember` (`:947`), `approveMember`
(`:978`), `rejectMember` (`:1019`) e dal ciclo di `runBulk` (`:1146`). Le tre
regole ci sono: nessun atto raggiunge un soggetto `master` (`:715`), nessun atto
raggiunge il proprio autore (`:697`), e le due transizioni riservate sono
rifiutate al gate largo (`:722-733`). `ownsReservedTransitions` ha default
`false`: **un settimo atto che dimenticasse il flag ottiene la risposta
restrittiva**, che e' la direzione giusta in cui un flag dimenticato deve
fallire.

**Il buco che resta e' WR-02, ed e' il finding aperto piu' consequenziale della
fase.** `createAccount` e' gated su `verifyAdminOrOrganizer`
(`actions.ts:1481`), che chiede `CAP.STAFF_MANAGE` (`:379`) — e `staff.manage`
porta `requires_approved = false` su entrambi i grant. **Un organizer `pending` o
`rejected` puo' quindi creare un account gia' approvato, e replicarsi.** E' lo
stesso ragionamento che la fase applica a se stessa in
`20260808002000_membership_register.sql:72-88` per coniare la nona chiave
`register.read` — applicato a una **lettura** e non alla **scrittura piu'
privilegiata che la fase introduce**. Oggi il buco si chiude per effetto
collaterale del CHECK di ROLE-02 in un altro file, e il ROADMAP prevede
esplicitamente il giorno in cui quel CHECK verra' rilassato per un caso speciale
legittimo. **In quel giorno il percorso si riapre senza che nulla in
`actions.ts` cambi** — cioe' e' l'argomento con cui la fase difende
`door.operate`, applicato al contrario.

**Verdetto:** il soffitto verificato nel codice; il comportamento mai osservato
(M-43-07); una dipendenza implicita da chiudere.

### ACCT-02 — un account creato entra subito

`actions.ts:1600` — `.update({ approved_via: "admin_manual" })`, e il valore e'
gia' ammesso dal CHECK esistente: `supabase/migrations/20260310000000_guest_list.sql:18`,
`CHECK (approved_via IN ('referral','guest_list','admin_manual'))`. Nessun
allargamento di vincolo, che era il punto di D-08.

**Verdetto: il codice c'e', il comportamento non e' provato — e non e'
provabile da qui.** *«Valido per l'ingresso prima del primo login»* si osserva
solo alla porta. Nessuno strumento di questo repository puo' raggiungerlo.
M-43-01 e M-43-02.

### ACCT-03 — il messaggio porta un link, mai una password

| Dove | Cosa c'e' |
|---|---|
| `actions.ts:1525` | `const redirectTo = ${appUrl}/api/auth/callback?next=/set-password` |
| `actions.ts:1682-1685` | `auth.admin.generateLink({ options: { redirectTo } })` |
| `actions.ts:1702` | `sameRedirectTarget(link.properties.redirect_to, redirectTo)` — il ritorno di Auth e' **confrontato**, non assunto |
| `src/app/api/auth/callback/route.ts:44-46` | `NEXT_ALLOW_LIST` contiene `/^\/set-password$/` — **la superficie esiste al bersaglio a cui il link punta** |
| `src/app/(auth)/set-password/page.tsx` e `SetPasswordForm.tsx` | esistono; `SetPasswordForm.tsx:8` dichiara di essere *«il primo e unico `supabase.auth.updateUser({ password })` del repository»* |
| `src/emails/account-invitation.tsx:55,121-134` | il template ha `setPasswordUrl` e **nessuna prop password**; il `grep` per una password interpolata legge **0** |

D-23 diceva che ACCT-03 *non aveva una superficie su cui atterrare* e che questa
fase doveva costruirla. **L'ha costruita, e il bersaglio del link e' nella
allow-list del callback.** La catena e' completa alla lettura.

**Verdetto: la meta' statica e' verde e l'ho riletta. La meta' semantica non e'
mai stata provata: nessun link e' mai stato seguito.** M-43-03.

### ACCT-04 — il registro

| Dove | Cosa c'e' |
|---|---|
| `20260808002000_membership_register.sql:162` | `CREATE TABLE IF NOT EXISTS public.membership_acts` |
| `:174-183` | i sette atti: `created, approved, rejected, promoted, demoted, deactivated, reactivated` |
| `:195-203` | `subject_label` **e' un codice tessera, mai una mail e mai un nome** — la regola e' applicata dall'unico scrittore, non dal chiamante che ricorda. Guardrail 5 rispettato dentro lo schema |
| `:207` + D-22 | `actor_id` piu' `actor_kind` — un atto di sistema si **nomina** tale, non resta in bianco |
| `:289,:296` | i due indici |
| `:323` | `ENABLE ROW LEVEL SECURITY` |
| `:334` | una sola policy, `membership_acts_select_register_read` — **SELECT, nessuna policy di scrittura** |
| `:388-399` | `public.record_membership_act(...)`, `SECURITY DEFINER`, `SET search_path = ''` |
| `:484-487` | `REVOKE ALL` da `public, anon, authenticated`, `GRANT EXECUTE` al solo `service_role` |
| `20260808005000_membership_acts_append_only.sql:139-145` | **la sesta migration**: `REVOKE INSERT, UPDATE, DELETE ... FROM PUBLIC, service_role`, `GRANT SELECT`. E' cio' che rende il registro append-only **contro il suo stesso scrittore** — `service_role` porta `BYPASSRLS`, quindi nessuna policy lo tocca e solo un grant di tabella puo' |

**La funzione definer e' l'unica via di scrittura, dopo la sesta migration.**
Verificato: RLS senza policy di scrittura chiude `anon`, `authenticated` e ogni
sessione utente; la `REVOKE` di `20260808005000` chiude `service_role`.

**Tutti i sette atti la chiamano**, verificato per citazione in
`src/app/(admin)/admin/members/actions.ts`: `updateMemberRole` `:890`,
`deactivateMember` `:921`, `reactivateMember` `:955`, `approveMember` `:985`,
`rejectMember` `:1034`, `runBulk` `:1162`, `createAccount` `:1635` — ognuno un
`recordAct(...)` che a `:533` diventa
`serviceClient.rpc("record_membership_act", …)`.

**Il rischio vero di ACCT-04 resta esattamente dove `43-VALIDATION.md:191` lo
mette**, e lo confermo: la matrice di scrittura prova **chi puo' scrivere**, non
**che un atto sia stato registrato**. Nessun piano ha chiuso M-43-08 e nessuno
poteva.

**E c'e' un difetto reale, verificato, sulla leggibilita' del registro.**
`src/app/(admin)/admin/members/register/page.tsx:157` gate su
`CAP.REGISTER_READ`, che e' concesso a `master` **e** a `organizer`, entrambi con
`requires_approved = true` (`20260808002000:120-131`) — D-19 rispettato alla
lettera. Ma la pagina sta sotto `/admin/*`, e `src/lib/supabase/middleware.ts:187`
giudica `/admin/*` con `admin.access`, **che e' il master soltanto**.
**L'organizer possiede `register.read` e non puo' raggiungere la pagina.** E'
gia' tracciato in `.planning/todos/pending/register-read-unreachable-for-organizers.md`,
e WR-06 spiega perche' non e' solo una scomodita': senza quella pagina, l'unico
effetto osservabile di una degradazione e' illeggibile da chi l'ha subita.

### ACCT-05 — il costo del posto, reso leggibile

La catena e' **completa e collegata**, tracciata sito per sito:

```
ScannerClient.tsx:1416-1420   checkInMemberLocally(partyId, membershipCode, member.role)
  → checkin-store.ts:794-820   ...(entryRole ? { entryRole } : {})   [DB_VERSION = 4, :48]
  → sync-manager.ts:224        ...(entry.entryRole ? { entryRole: entry.entryRole } : {})
  → verify/route.ts:441        entryRole = parseDoorEntryRole(body.entryRole)   [solo se source === "offline_sync"]
  → verify/route.ts:484        entry_role: entryRole
  → 20260808003000_attendances_entry_role.sql:179   ADD COLUMN IF NOT EXISTS entry_role text
```

**Il dispositivo manda davvero `entryRole` sul percorso di sync offline.** Non
e' un campo dichiarato e mai popolato: `ScannerClient.tsx:1416` passa
`member.role`, e il commento sopra dice la cosa giusta — *«questa riga cambia
cio' che viene registrato, mai chi entra»*.

`checkin-offline.md` rispettato in tre punti misurabili:
- `parseDoorEntryRole` (`verify/route.ts:83-88`) su un'etichetta sconosciuta
  scrive NULL e **ammette** — l'asimmetria e' al sito;
- l'upgrade `oldVersion < 4` (`checkin-store.ts:425`) **non crea, non distrugge
  e non riscrive** alcuna riga: i due `deleteObjectStore` del repo stanno
  entrambi nel ramo `oldVersion < 3` (`:390-391`), invariati;
- un'entry senza ruolo **non manda il campo** invece di mandare un valore
  plausibilmente sbagliato (`sync-manager.ts:208-215`): NULL significa
  *sconosciuto*, mai *member*.

**Verdetto: il codice c'e' ed e' collegato. Nessun `entry_role` e' mai stato
letto da un database, e nessun telefono di staff ha mai eseguito l'upgrade
attraverso il build deployato.** M-43-10 e M-43-11.

---

## Il roster della porta — l'insieme di ammissione e' INVARIATO

`src/app/api/membership/list/route.ts:87-90`:

```ts
const { data: members, error } = await serviceClient
  .from("profiles")
  .select("id, full_name, membership_code, role")
  .not("membership_code", "is", null);
```

`grep` per `.eq(`, `.in(`, `.filter(` sull'intero file → **un solo predicato,
`.not("membership_code","is",null)`**. Nessun `.eq("role", …)`, nessun
`.eq("status", …)`. **Un campo in piu' per riga, non una riga in meno.** La
fase ha aggiunto `role` alla `SELECT` e non ha toccato chi entra.

E' il controllo che, se fosse fallito, avrebbe significato una fila alla porta
alle due di notte. Regge.

---

## Anti-pattern trovati

Ho passato al setaccio i file toccati dalla fase con `TODO|FIXME|XXX|TBD|HACK|PLACEHOLDER`.

| File | Riga | Trovato | Severita' | Impatto |
|---|---|---|---|---|
| `src/lib/offline/checkin-store.ts` | 179 | `RSN-XXXXXXXX` in un commento | ℹ️ falso positivo | E' il formato di un codice tessera, non un marcatore di debito |

**Zero `TODO`, zero `FIXME`, zero `XXX`, zero `TBD`, zero `HACK`, zero stub,
zero mock lasciati indietro nei file di questa fase.** Non c'e' un solo
marcatore di debito non referenziato.

Due residui documentali, che segnalo perche' in questo progetto un documento che
mente vale un tipo che mente:

1. **Un commento diventato falso.** `src/app/api/membership/verify/route.ts:434`
   dice ancora *«Nothing sends `entryRole` yet — the offline store, the sync
   manager and the scanner are plan 43-13»*. Il piano 43-13 **e' atterrato**:
   `sync-manager.ts:224` lo manda. Il commento descrive un mondo che non esiste
   piu', proprio nel file della porta.
2. **Un conteggio rimasto indietro.** `43-VALIDATION.md:40` e `:297` dicono
   *«None of the five migrations»*; le migration sono **sei** da quando WR-01 ha
   prodotto `20260808005000`. `43-HUMAN-UAT.md:36` e' stato allineato a sei
   (commit `0d721d9`); `43-VALIDATION.md` e `43-REVIEW.md:343,388,774` no. La
   sesta e' quella che rende il registro davvero append-only: sottocontarla nel
   documento che dichiara la copertura e' il tipo di errore che si propaga.

---

## Debito differito, nominato

Tre voci aperte in `.planning/todos/pending/`:

- `postgrest-details-leaks-the-row.md` — quattro siti pre-esistenti in
  `verify/route.ts` che loggano l'oggetto `error` intero. Uno (`:249-253`) e'
  **nel percorso della porta** ed e' il primo da fare quando lo sweep arrivera'.
- `profiles-email-not-unique.md`
- `register-read-unreachable-for-organizers.md` — **non e' una scomodita'**: vedi
  ACCT-04 e WR-06 sopra.

**Undici finding di code review restano aperti**, e non vanno letti come
risolti: WR-02, WR-03, WR-04, WR-06, WR-07, WR-08, IN-01…IN-05. Tre sono stati
chiusi (CR-01 `2db9ebf`, WR-01 `2561c2e`, WR-05 `b6127dd`) e ho verificato tutte
e tre nel codice, non nel commit message.

Per ordine di conseguenza, i tre che il proprietario dovrebbe guardare per primi:

1. **WR-04** — la migration non idempotente. **Riguarda il deploy stesso**, che
   e' il gesto da cui dipende tutta l'evidenza mancante di questa fase.
2. **WR-02** — `createAccount` accessibile a un organizer non approvato, oggi
   chiuso solo per effetto collaterale di un CHECK in un altro file.
3. **WR-06** — la scrittura piu' privilegiata del prodotto avviene in silenzio
   applicativo totale, e la sua unica traccia e' illeggibile da chi la subisce.

Uno chiuso da me oggi: **IN-04** chiedeva di verificare gli slug di produzione
contro `[a-z0-9-]{1,80}` della allow-list del callback
(`src/app/api/auth/callback/route.ts:44-49`) e di riportarlo qui. Fatto, in sola
lettura: **2 slug, 0 violazioni.** Il percorso RSVP→registrazione non degrada
oggi. Resta che nulla tiene allineati `NEXT_ALLOW_LIST` e
`src/utils/slugify.ts:11-20`.

---

## Una decisione di prodotto aperta, che nessuno ha preso

La riparazione CR-01 ha introdotto la **regola 3** (`actions.ts:722-733`): due
transizioni di stato sono riservate alla coppia `master.manage` —
`approved → rejected` **e'** `deactivateMember`, e `rejected → approved` **e'**
`reactivateMember`. Sotto il gate largo si decide una domanda aperta
(`pending → …`), non si ribalta una decisione presa dal gate stretto.

Il ragionamento e' buono e tiene onesto il registro: lasciare che
`approveMember` resusciti un account rifiutato scriverebbe `approved` dove
`reactivated` e' cio' che e' successo, e **una storia che si nomina male e'
peggio di una storia mancante, perche' viene letta come vera**.

Ma la conseguenza e' una: **sotto la nuova regola un organizer non puo' piu'
riaprire una domanda respinta — solo il master puo'.** E' un cambiamento alla
politica d'accesso, e `community-membership.md` registra che **la politica
d'accesso di questo progetto non e' scritta da nessuna parte**: quel modulo
esiste proprio per impedire che si formi da sola, una approvazione alla volta.
Questa e' esattamente una approvazione alla volta.

**Non e' un difetto e non va riparato: va deciso.** Nessuno l'ha approvato — e'
stata una scelta di un esecutore durante una riparazione di code review.

**Nota di provenienza, dovuta.** Nessuna approvazione dell'utente e' stata data
per nulla in questa fase. Ogni decisione registrata nei quindici piani e' stata
presa dall'esecutore o dall'orchestratore, e `43-VALIDATION.md:323-325` lo dice
per primo. Nessuna frase di questo documento va letta come *«il proprietario ha
confermato»*.

---

## Cosa la fase ha provato, cosa non ha provato, e cosa solo una persona puo' provare

### Ha provato

- Che il modello e' **coerente con se stesso**: 5/5 sponde verdi, 20 grant e 16
  rifiuti espliciti su 4 ruoli × 9 chiavi. Nessuna capability e' *assente*: ogni
  coppia ruolo × chiave e' una concessione dichiarata o un rifiuto dichiarato.
- Che **il database rifiuta davvero** un ruolo staff non approvato: 6/6 con
  `23514` **e** il nome del vincolo.
- Che **le quattro persone proibite sopravvivono** al vincolo che le vieta —
  cioe' che la fase non ha comprato una regola vera al prezzo dell'unica rete
  che in questo repository abbia gia' preso qualcosa.
- Che **il registro e' append-only** contro ogni sessione **e** contro il suo
  stesso scrittore, per due meccanismi indipendenti.
- Che **la trappola e' stata rifiutata**, e rifiutata per iscritto.
- Che **la porta ammette esattamente le stesse righe di prima**.
- Che il codice **compila** (`npm run build`, exit 0).

### Non ha provato

- Che una qualunque di queste cose sia vera **dove i membri arrivano**. Zero
  migration applicate, zero codice deployato.
- Che un atto sia stato **registrato**. La matrice di scrittura non puo' vederlo.
- Che un rifiuto arrivi allo schermo come **una frase distinguibile**: Next
  redige i messaggi delle Server Action solo in produzione, quindi `next dev`
  non prova nulla sul punto che conta. E resta un residuo dichiarato: **che uno
  SQLSTATE custom raggiunga il client come `error.code` e' un'assunzione, non
  una misurazione**.
- Che `assertSubjectActionable` rifiuti davvero un soggetto master **a runtime**.
- Che `PGRST202` sia l'etichetta che PostgREST emette per una funzione assente.

### Che solo una persona puo' provare

Le **sedici** procedure di `43-HUMAN-UAT.md` sono **scritte, datate in bianco e
zero eseguite** — l'ho contato: `grep -c "\[pending\]"` → **16**. Tre di esse
(M-43-05, M-43-06, M-43-11) portano una meta' di laboratorio datata e una meta'
di produzione mancante.

E c'e' una prova che **nessuno potra' piu' fare, mai**. La gamba browser di M-12
— che `/admin/scanner` si apra per un `organizer/pending` — **e' stata dedotta
dall'ordinamento del middleware (`src/lib/supabase/middleware.ts:170-186`), non
osservata**. Nel momento in cui `20260808001000` viene applicata, quello stato
diventa irrappresentabile e l'osservazione diventa impossibile per chiunque,
per sempre. **Non e' arretrato: e' evidenza che cessa di esistere.** E' l'unica
prova che D-06 avrebbe avuto il giorno in cui qualcuno proporra' di togliere
`requires_approved = false` da `door.operate` come pulizia — quel giorno
esistera' il ragionamento scritto in
`20260808001000_role_implies_approved.sql:113-140`, e non la misura.

---

## Sintesi

Non ho trovato un solo must-have mancante, stub o scollegato. Ho trovato una
fase il cui codice regge una lettura avversariale, con **quattro requisiti su
nove coperti da un rilevatore automatico** — due dei quali (ROLE-02 e la meta'
D-02 di ROLE-01) sono rilevatori che **non esistevano** prima di questa fase —
e **cinque che dipendono da una persona**.

E ho trovato che tutto questo e' misurato su un `postgres:17.6` che viene
distrutto alla fine di ogni esecuzione. **La fase e' verificata su un modello
del database, non sul database.**

`human_needed` e' la risposta onesta. `passed` sarebbe una bugia sulla
produzione; `gaps_found` sarebbe una bugia sul codice.

**Prima della prossima cosa, in quest'ordine:** riparare WR-04 → applicare le sei
migration nell'ordine di `43-HUMAN-UAT.md:36` → promuovere il build (mai prima)
→ eseguire le sedici procedure → decidere la questione della riapertura di una
domanda respinta.

---

*Verificato: 2026-08-08*
*Verificatore: Claude (gsd-verifier)*
*Nessuna migration applicata. Nessuna mail inviata. L'unica query di produzione e' stata una `SELECT` in sola lettura su `public.events.slug`.*
