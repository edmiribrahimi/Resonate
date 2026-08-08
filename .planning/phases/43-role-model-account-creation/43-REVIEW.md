---
phase: 43-role-model-account-creation
reviewed: 2026-08-08
depth: standard
files_reviewed: 31
files_reviewed_list:
  - scripts/container/seed.mjs
  - scripts/rls-baseline-container.mjs
  - scripts/rls-baseline.mjs
  - scripts/verify-capabilities.mjs
  - src/app/(admin)/admin/members/CreateAccountForm.tsx
  - src/app/(admin)/admin/members/MemberActionNotice.tsx
  - src/app/(admin)/admin/members/actions.ts
  - src/app/(admin)/admin/members/page.tsx
  - src/app/(admin)/admin/members/register/page.tsx
  - src/app/(admin)/admin/scanner/ScannerClient.tsx
  - src/app/(auth)/set-password/SetPasswordForm.tsx
  - src/app/(auth)/set-password/page.tsx
  - src/app/(members)/dashboard/page.tsx
  - src/app/api/auth/callback/route.ts
  - src/app/api/membership/list/route.ts
  - src/app/api/membership/verify/route.ts
  - src/components/admin/MemberTable.tsx
  - src/components/auth/ResetPasswordButton.tsx
  - src/emails/account-invitation.tsx
  - src/lib/capabilities/keys.ts
  - src/lib/membership/acts.ts
  - src/lib/offline/checkin-store.ts
  - src/lib/offline/sync-manager.ts
  - src/lib/rbac/roles.ts
  - src/types/database.ts
  - supabase/migrations/20260808000500_staff_role.sql
  - supabase/migrations/20260808001000_role_implies_approved.sql
  - supabase/migrations/20260808002000_membership_register.sql
  - supabase/migrations/20260808003000_attendances_entry_role.sql
  - supabase/migrations/20260808004000_master_reconcile.sql
  - supabase/schema.sql
findings:
  critical: 1
  warning: 8
  info: 5
  total: 14
status: issues_found
---

# Fase 43 — Code Review Report

**Reviewed:** 2026-08-08
**Depth:** standard
**Files Reviewed:** 31
**Status:** issues_found

## Summary

Ho letto i 31 file nel perimetro contro i gate del progetto, non contro buone
pratiche generiche. Quattro aree reggono la lettura avversariale senza cedere:

- **La porta.** `src/app/api/membership/list/route.ts:87-90` non ha guadagnato
  alcun filtro: `.not("membership_code","is",null)` e nient'altro — nessun
  `.eq("role", …)`, nessun `.eq("status", …)`. Il roster ammette esattamente le
  stesse righe di prima. `cacheMembers` (`checkin-store.ts:1053-1095`) resta un
  merge e non svuota nulla; il passo `oldVersion < 4`
  (`checkin-store.ts:425-457`) non crea, non distrugge e non riscrive alcuna
  riga, quindi nessuna coda in attesa viene persa nell'upgrade;
  `checkInMemberLocally` (`:794-830`) preserva la voce già accodata invece di
  sovrascriverla. `parseDoorEntryRole` (`verify/route.ts:83-88`) scrive NULL e
  **ammette** su un'etichetta sconosciuta.
- **La guardia monotona.** Nessuna riga tocca `door.operate`; i due
  `requires_approved = false` restano dove sono e `staff` non riceve alcuna riga
  `door.operate` (`20260808000500_staff_role.sql:111-137`).
- **Le due funzioni SECURITY DEFINER.** Entrambe portano `SET search_path = ''`
  con ogni riferimento qualificato, nessun SQL dinamico, e la coppia
  `REVOKE`-poi-`GRANT` nell'ordine giusto
  (`20260808002000:484-488`, `20260808004000:368-372`).
- **La disciplina su `error.details`.** Nei siti *nuovi o toccati* la regola è
  rispettata senza eccezioni: `actions.ts:281-286`, `list/route.ts:99-102`,
  `verify/route.ts:610-613`, `register/page.tsx:189-192`,
  `callback/route.ts:195-201`, `SetPasswordForm.tsx:242-246`.

Quello che non regge è **il soffitto sui privilegi**. La fase ha chiuso due
buchi di validazione a runtime (`isWritableRole`, `subject_is_master`) e ne ha
lasciato aperto un terzo, sulla stessa tabella, con la stessa scrittura, dietro
una porta diversa: `rejectMember`. Il resto sono otto Warning, di cui tre
riguardano l'ordine di deploy e l'osservabilità di un percorso privilegiato che
oggi non produce **nessuna** riga di log.

---

## Critical Issues

### CR-01: un organizer può demolire il master via `rejectMember` — il soffitto D-07 è chiuso su una porta su tre

**File:** `src/app/(admin)/admin/members/actions.ts:811-846` (`rejectMember`),
`src/app/(admin)/admin/members/actions.ts:991-1007` (`bulkRejectMember`),
`src/app/(admin)/admin/members/actions.ts:783-809` (`approveMember`)

**Issue.**
`updateMemberRole` porta due metà del soffitto, entrambe scritte in questa fase:
`isWritableRole` a runtime (`:613-615`, `:653-655`) e il rifiuto del soggetto
`master` (`:682-684`), con il commento che dice perché — *«senza (2)
l'allargamento lascerebbe un organizer degradare il master»*.

`rejectMember` è gated sulla **stessa** capability (`verifyAdminOrOrganizer` →
`CAP.STAFF_MANAGE`, `:377-385`), scrive **la stessa cosa** — `role: "member"`,
più `status: "rejected"` (`:825-831`) — e non porta **né** il controllo sul
soggetto **né** il controllo su sé stessi. Lo stesso vale per
`bulkRejectMember` (`:1003`). Il file lo dichiara pure, a `:817-822`:
*«`rejected` e `deactivated` sono la stessa scrittura»* — e `deactivateMember`
è master-only per decisione esplicita (D-21, `:731-755`).

Ne discendono tre conseguenze, tutte raggiungibili:

1. **Un organizer degrada e respinge il master.** Una Server Action è un
   endpoint pubblico: il fatto che `MemberTable.tsx:273-276` disegni `--` sulla
   riga di un master è un'affordance, non un confine. Il client service bypassa
   la RLS, `record_membership_act` non guarda i ruoli, e
   `profiles_role_implies_approved` è soddisfatto da `role='member'`.
2. **La restrizione master-only su `deactivateMember` è aggirabile.**
   `rejectMember` esegue byte per byte la stessa `UPDATE`. Simmetricamente
   `approveMember` (`:789-794`) scrive `status: "approved"`, che è la scrittura
   di `reactivateMember`, anch'essa master-only.
3. **Manca il self-check.** La fase ha aggiunto `self_reactivate` a
   `reactivateMember` (`:764-766`) chiamandolo *«un'incoerenza che il prossimo
   avrebbe copiato invece di notare»* — e si è fermata una funzione prima:
   `approveMember` e `rejectMember` non ce l'hanno.

**Scenario di fallimento concreto.**
Attore: un organizer autenticato (basta `staff.manage`, che ignora lo stato).
Chiama la Server Action `rejectMember` con l'id del master — l'id è visibile
nella pagina `/organizer/members` o nel payload della tabella.

- `guarded` → `verifyAdminOrOrganizer` → passa.
- `record_membership_act(p_subject_id=<master>, p_act='rejected', p_role='member', p_status='rejected')`.
- `UPDATE public.profiles SET role='member', status='rejected'` → il CHECK di
  43-06 non si oppone (`member` può essere `rejected`).
- Esito: **nessun account tiene più `master`.** `master.manage` sparisce,
  `/admin/*` diventa irraggiungibile, e `WritableRole` non contiene `'master'`
  — quindi il ruolo **non è ripristinabile dal prodotto**. L'unica via di
  ritorno è `reconcile_master` al prossimo login, che dipende da `MASTER_EMAIL`
  configurato *e* dalla migration 43-12 già applicata; se il master demolito
  non è quello nominato da `MASTER_EMAIL`, la demolizione è definitiva.

Con `bulkRejectMember([<master>])` lo stesso esito, senza nemmeno il self-check.

*Provenienza, detta per onestà:* il buco esiste da prima della fase
(`git show 291447e^:…/actions.ts` — `rejectMember` scriveva già
`{status:'rejected', role:'member'}` sotto `verifyAdminOrOrganizer`). Non lo
declasso per questo: 43-09 ha riscritto entrambe le funzioni, ha ragionato
esattamente su questo soffitto e lo ha chiuso sulla funzione accanto. È dentro
il perimetro della fase, non fuori.

**Fix.** Estrarre il controllo che `updateMemberRole` già ha e applicarlo alle
tre azioni raggiungibili da un organizer. Concretamente, in `actions.ts`:

```ts
/** Il soggetto non è un master, e non sei tu. Una lettura, prima di ogni atto. */
async function assertSubjectWritable(
  serviceClient: ServiceClient,
  ctx: ActorContext,
  memberId: string,
  selfDetail: string
): Promise<{ ok: true } | { ok: false; failure: MemberActFailure; detail: string }> {
  if (memberId === ctx.userId) {
    return { ok: false, failure: "forbidden", detail: selfDetail };
  }
  const { data: subject, error } = await serviceClient
    .from("profiles").select("role").eq("id", memberId).maybeSingle();
  if (error) return writeFailure("assertSubjectWritable", error);
  if (!subject) return { ok: false, failure: "subject_not_found", detail: "no_profile" };
  if (String(subject.role) === "master") {
    return { ok: false, failure: "forbidden", detail: "subject_is_master" };
  }
  return { ok: true };
}
```

Chiamarla all'inizio del corpo di `approveMember`, `rejectMember` e, per ogni
`subjectId`, dentro il ciclo di `runBulk` (`:911-925`) — dove un soggetto
rifiutato diventa un `outcome` con la sua causa, che è già la forma che quel
ciclo produce. `MemberActionNotice.tsx:197-205` disegna già
`subject_is_master`; servono due nuove voci in `FORBIDDEN_BY_DETAIL` per
`self_approve` e `self_reject`.

**Verifica manuale** (non ci sono test in questo repo — `CLAUDE.md` Guardrail 1):
con un account `organizer/approved`, dalla console del browser sulla pagina
`/organizer/members`, invocare la Server Action `rejectMember` con l'id del
master; leggere `public.profiles` per il master **prima e dopo**. Atteso dopo
il fix: `role` e `status` invariati, nessuna riga nuova in
`public.membership_acts`, e la notice `subject_is_master` sullo schermo.
Ripetere con `bulkRejectMember([<master>])` e con `rejectMember(<il proprio id>)`.

---

## Warnings

### WR-01: `membership_acts` non è append-only contro `service_role` — manca la REVOKE sulle DML

**File:** `supabase/migrations/20260808002000_membership_register.sql:337-343`,
`supabase/migrations/20260808002000_membership_register.sql:484-488`

**Issue.** La migration afferma: *«con la RLS abilitata e nessuna policy di
scrittura, nessuna sessione — authenticated, anonima, o quella di un master —
può aggiungere, modificare o rimuovere una riga. Questo è ciò che significa
"append-only per costruzione"»*. Per quelle tre categorie è vero. Non è vero
per `service_role`, che in Supabase è creato **`BYPASSRLS`**: la RLS non lo
tocca, e i grant di default di Supabase su `schema public` gli lasciano
`INSERT`, `UPDATE` e `DELETE` sulla tabella appena creata. La `REVOKE` scritta
in questo file (`:484-485`) riguarda **la funzione**, non la tabella.

**Scenario concreto.** `getServiceClient()` è costruito in
`actions.ts:18-23` e usato da ogni atto del file. Una riga qualsiasi —
un futuro `cleanup`, un cron, o un errore di battitura in un `.delete()` senza
filtro — cancella righe del registro; e chiunque ottenga
`SUPABASE_SERVICE_ROLE_KEY` può riscrivere `actor_id` su un atto già compiuto.
Il registro è l'unica cosa che risponde a *chi ha lasciato entrare questa
persona* (`community-membership.md`, gate *chi decide è tracciato*): un registro
riscrivibile dallo stesso client che compie gli atti risponde a quella domanda
solo finché nessuno mente.

**Fix.** Nella stessa migration, dopo la `CREATE TABLE`:

```sql
REVOKE INSERT, UPDATE, DELETE ON public.membership_acts
  FROM anon, authenticated, service_role;
GRANT SELECT ON public.membership_acts TO anon, authenticated, service_role;
```

`BYPASSRLS` non bypassa i grant di tabella, quindi dopo questo l'unica via di
scrittura resta `public.record_membership_act`, che gira come definer
(`postgres`) — che è esattamente ciò che il paragrafo dichiara. Aggiungere la
riga alla dichiarazione pre-registrata di `scripts/verify-capabilities.mjs` o
un'asserzione in `scripts/container/seed.mjs` (un `DELETE` come `service_role`
che deve rispondere `42501`), altrimenti la proprietà torna a essere una frase.

---

### WR-02: `createAccount` è gated su `staff.manage`, che ignora lo stato — un organizer `pending` o `rejected` può creare account approvati

**File:** `src/app/(admin)/admin/members/actions.ts:1219-1221`,
`src/app/(admin)/admin/members/actions.ts:377-385`

**Issue.** `createAccount` chiama `verifyAdminOrOrganizer`, che chiede
`CAP.STAFF_MANAGE`. Le due righe di grant misurate in `43-MEASUREMENTS.md`
(misura 3) portano `requires_approved = false` per `master` e per `organizer`.
Quindi la capability risponde `true` a un organizer `pending` o `rejected`.

Questa è la stessa obiezione che la fase solleva contro sé stessa in
`20260808002000_membership_register.sql:72-88` (D-19) per giustificare la
**nona chiave**: *«gating su `staff.manage` ammetterebbe un organizer il cui
accesso non è mai stato approvato»*. Quel ragionamento è stato applicato a una
**lettura** (il registro) e non alla **scrittura** più privilegiata che la fase
introduce — la creazione di un account già approvato, che
`community-membership.md` (gate *nessuna corsia grigia*) classifica come
eccezione al gating da contare e attribuire.

**Scenario concreto.** Oggi (migrations non applicate) un account
`organizer/pending` esiste ed è rappresentabile — è una delle personas del
container. Chiama `createAccount({email, fullName, role:'organizer'})`:
il gate passa, l'account viene creato `approved`, l'invito parte. Una persona
la cui domanda non è mai stata approvata ha appena approvato qualcun altro,
e può replicarsi.

Dopo l'applicazione di 43-06 il caso `organizer/pending` diventa
irrappresentabile e il buco si chiude **per effetto collaterale di un CHECK in
un altro file**. Il ROADMAP prevede esplicitamente il giorno in cui quel CHECK
verrà rilassato *«per un caso speciale legittimo»*: in quel giorno questo
percorso si riapre senza che nulla in `actions.ts` cambi. È l'argomento con cui
la fase difende `door.operate`, applicato al contrario.

**Fix.** Rendere la dipendenza esplicita invece che implicita. La forma minima,
dentro `verifyAdminOrOrganizer` o in un guard dedicato usato dal solo
`createAccount`:

```ts
if (ctx.status !== "approved") {
  return { ok: false, failure: "forbidden", detail: "actor_not_approved" };
}
```

con la sua voce in `FORBIDDEN_BY_DETAIL`. In alternativa, coniare una chiave
`account.create` con `requires_approved = true` su entrambe le righe, come è
stato fatto per `register.read` e per la stessa ragione. Non toccare il flag di
`staff.manage`: è il `false` che tiene aperta la porta.

---

### WR-03: `/dashboard?master=<qualsiasi cosa>` viene disegnato alla lettera dentro un avviso attendibile

**File:** `src/app/(members)/dashboard/page.tsx:84`,
`src/app/(members)/dashboard/page.tsx:317-335`

**Issue.** `masterFlag` è `readParam(params.master)` — nessun confronto con un
insieme chiuso — e la condizione di rendering è la sua **presenza**. Il valore
grezzo finisce a `:333` dentro un riquadro ambra intestato *«A check on the
owner account did not complete at sign-in»*. I due flag fratelli della stessa
funzione sono invece confrontati con un valore noto (`:50`, `:64`), e il
commento a `:70-80` dichiara la ragione: il vocabolario di 43-12 non era
leggibile da lì. Ora lo è — `MasterFlag` in `callback/route.ts:103-115` ha sei
valori.

**Scenario concreto.** Un link
`https://<host>/dashboard?master=Il+tuo+account+e+sospeso.+Chiama+il+numero+…`
consegna al membro, sulla **sua** dashboard, dentro un pannello che il prodotto
ha disegnato per essere creduto, un testo scelto dall'attaccante. React fa
l'escape dell'HTML, quindi non c'è XSS; resta un'iniezione di testo in una
superficie fidata, che è la materia prima di un social engineering — e questo è
un prodotto dove il canale di contatto atteso è una mail transazionale. La
lunghezza non è limitata (`break-words` limita i danni al layout, non al
contenuto).

**Fix.** Confrontare con il vocabolario chiuso, come fanno gli altri due flag:

```ts
const MASTER_FLAGS = new Set([
  "unconfigured", "malformed", "ambiguous", "unknown", "refused", "unavailable",
]);
const raw = readParam(params.master);
const masterFlag = raw && MASTER_FLAGS.has(raw) ? raw : null;
```

e dare a ciascuno dei sei la propria frase, che è la regola che il resto della
fase applica ovunque. Un valore non riconosciuto non si disegna: non è un
silenzio, è il rifiuto di ripetere una stringa scelta da chi ha costruito
l'URL.

---

### WR-04: `20260808001000_role_implies_approved.sql` non è idempotente

**File:** `supabase/migrations/20260808001000_role_implies_approved.sql:103-105`

**Issue.** `ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_implies_approved …`
senza un `DROP CONSTRAINT IF EXISTS` che lo preceda. `supabase-data.md`, gate
*idempotenza DDL*: *«una migration che fallisce alla seconda esecuzione blocca
un deploy in un momento scomodo»*. Il file sorella
`20260808000500_staff_role.sql:71-76` usa la forma corretta
(drop-`IF EXISTS`-poi-add) e ne spiega il perché a `:42-45`; questo file no.

**Scenario concreto.** `supabase db push` su un database dove il vincolo esiste
già — un apply parziale, un branch di preview seedato, un rollback della tabella
`schema_migrations` — risponde `42710 constraint "profiles_role_implies_approved"
… already exists`, la transazione fa rollback e **tutte** le migration
successive della coda restano non applicate. Su una fase le cui cinque migration
vanno applicate a mano dal proprietario, è precisamente il momento scomodo.

**Fix.**

```sql
ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_role_implies_approved;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_role_implies_approved
  CHECK (role NOT IN ('master', 'organizer', 'staff') OR status = 'approved');
```

Il `DROP` è sicuro: la riaggiunta è VALIDATED e riesegue la scansione su tutte
le righe, quindi non c'è finestra in cui il vincolo sia più debole di prima.

---

### WR-05: il callback dipende in modo duro da una migration non applicata — ogni login degrada rumorosamente per tutti

**File:** `src/app/api/auth/callback/route.ts:186-188`,
`src/app/api/auth/callback/route.ts:274`

**Issue.** `reconcileMaster()` è chiamata **incondizionatamente** dopo ogni
`exchangeCodeForSession` riuscito, e fa `rpc("reconcile_master")`. Finché
`20260808004000_master_reconcile.sql` non è applicata, PostgREST risponde
`PGRST202` (funzione inesistente) → il ramo `error` (`:190-203`) → `unavailable`
→ `destination.searchParams.set("master", "unavailable")` (`:313-315`) → e
`dashboard/page.tsx:317` disegna il banner ambra **a ogni membro, a ogni
login**.

Lo stesso vale per `record_membership_act`: fino all'apply, **ogni** atto sui
membri (`approveMember`, `rejectMember`, `updateMemberRole`, i due bulk,
`createAccount`) risponde `write_failed` con `detail=PGRST202`. La superficie
admin dei membri è fuori uso dal momento del deploy del codice fino al momento
dell'apply, e le due cose sono operazioni separate fatte da mani separate.

Non sto ri-segnalando il fatto noto che le migration sono committate e non
applicate. Sto segnalando che **il codice non tollera quello stato** e che
nessuna riga del repo dichiara l'ordine obbligato.

**Fix.** Due mosse, nessuna delle quali è codice difensivo generico:

1. Scrivere l'ordine dove viene letto — in `43-HUMAN-UAT.md` e nel messaggio di
   commit di deploy: *applicare le cinque migration **prima** di promuovere il
   build*. È l'unica forma di runbook che questo repo ha.
2. Non mostrare a tutti un guasto su cui nessuno può agire: cambiare la
   condizione a `:317` in `masterFlag && canReachManagementTools` — la variabile
   esiste già a `:245` — così il banner raggiunge chi può agire e non i 150
   membri che leggono *«se non sei quella persona, non c'è nulla da fare»*.

---

### WR-06: una promozione o una demozione a `master` non produce alcuna riga di log

**File:** `src/app/api/auth/callback/route.ts:214-222`,
`supabase/migrations/20260808004000_master_reconcile.sql:245-304`

**Issue.** `case "reconciled": case "unchanged": return null;` — nessun
`console.error`, nessun `console.info`, nessun flag. Quindi la scrittura più
privilegiata del prodotto — promuovere un account a `master` e degradare ogni
altro master a `member` — avviene **in silenzio totale a livello applicativo**.
La migration risponde che l'effetto osservabile è la riga in
`public.membership_acts`; è vero, e non è sufficiente:

- l'unica superficie che legge quel registro è `/admin/members/register`, sotto
  `/admin/*`, gated su `admin.access`, che è **il master soltanto**. Il master
  appena degradato non può leggere la riga che spiega perché;
- `meta-gates.md`, verificato 2026-08-05: non esiste error tracking, quindi
  *«un fallimento che conta deve avere un effetto osservabile»*. Qui non c'è né
  il log né l'effetto — c'è una riga in una tabella che nessuno interroga se non
  sa già di doverlo fare.

`unchanged` è giustamente silenzioso: è il caso comune di ogni login.
`reconciled` non lo è: significa che il ruolo più alto del prodotto si è mosso.

**Scenario concreto.** `MASTER_EMAIL` viene cambiato su Vercel (o corretto per
un refuso che finisce per coincidere con l'indirizzo di un membro esistente):
la funzione non ha alcun ramo che rifiuti di promuovere un account ordinario —
`v_matches = 1` basta. Al primo login di **chiunque**, quel membro diventa
`master`/`approved` e l'incumbent diventa `member`. Nessun log, nessun avviso,
nessuna mail. Lo si scopre quando qualcuno prova ad aprire `/admin`.

**Fix.** Distinguere i due esiti silenziosi, e loggare quello che non lo è:

```ts
case "reconciled": {
  const d = data as { promoted?: boolean; demoted?: number; masters?: number };
  console.error(
    `[auth.reconcile_master] the master role moved: promoted=${d.promoted} ` +
      `demoted=${d.demoted} masters=${d.masters}`
  );
  return null;          // nessun flag verso l'utente: non è un atto suo
}
case "unchanged":
  return null;
```

E, separatamente, aprire `/admin/members/register` a `register.read` invece che
ad `admin.access` — la voce è già tracciata in
`.planning/todos/pending/register-read-unreachable-for-organizers.md`, ma questo
finding è la ragione per cui non è solo una scomodità: senza quella pagina,
l'unico effetto osservabile di una demozione è illeggibile da chi l'ha subita.

---

### WR-07: `ResetPasswordButton` collassa ogni causa in «Failed — try again», senza log

**File:** `src/components/auth/ResetPasswordButton.tsx:36`,
`src/components/auth/ResetPasswordButton.tsx:14-17`

**Issue.** `setStatus(error ? "error" : "sent")`. Un indirizzo non presente, una
chiave Resend mancante, un rate limit di GoTrue, una rete assente e un
`redirectTo` fuori dalla allow-list producono la stessa parola. Non c'è nemmeno
un `console.error`: la causa non esiste da nessuna parte, né per l'utente né per
chi sviluppa. È letteralmente il precedente registrato in
`.planning/codebase/CONCERNS.md` (il form newsletter), e `meta-gates.md` lo
vieta per nome.

Il ramo `:14-17` è peggio: `!user?.email` — cioè *non sei autenticato* — viene
disegnato come *«Failed — try again»*, un invito a ripetere un'azione che non
può riuscire.

Lo segnalo perché la fase ha toccato questo file per curare il loop D-23 e ha
riscritto la riga sopra (`:32-34`) lasciando intatta quella sotto: il pulsante
ora manda l'utente nel posto giusto e continua a non dire nulla quando non ci
riesce. Ed è la via di rimedio che `CreateAccountForm.tsx:110-141` indica per
tre delle sue undici notice (*«send them a password reset from the sign-in
page»*), quindi il percorso di recupero dell'invito fallito termina qui.

**Fix.** Adottare la forma che questa stessa fase usa in
`SetPasswordForm.tsx:66-97` — un valore per causa, una frase per valore:

```ts
type ResetOutcome = "no_session" | "rejected" | "transport" | "sent";
// …
if (!user?.email) {
  console.error("[reset-password.no_session] getUser returned no email");
  setStatus("no_session");   // «Non risulti connesso: accedi e riprova.»
  return;
}
const { error } = await supabase.auth.resetPasswordForEmail(/* … */);
if (error) {
  console.error(
    `[reset-password.rejected] code=${error.code ?? "none"} ` +
      `status=${error.status ?? "none"} message=${error.message}`
  );
  setStatus("rejected");
  return;
}
setStatus("sent");
```

Verifica manuale: con la rete disabilitata premere il pulsante e leggere la
frase; ripetere con una sessione scaduta. Le due frasi devono essere diverse.

---

### WR-08: `createAccount` lascia un utente auth orfano e la ritentata è bloccata per sempre

**File:** `src/app/(admin)/admin/members/actions.ts:1282-1358`

**Issue.** L'ordine è dichiarato e ragionato (`:1045-1057`): tutto il
verificabile senza effetti collaterali viene prima di `createUser`. Resta però
che ogni fallimento **dopo** `:1283` lascia dietro un utente in `auth.users`:

- `profile_missing` (`:1348-1358`) — il trigger non ha scritto il profilo;
- `channelError` (`:1343-1346`) — la `UPDATE` su `profiles` è fallita;
- un `recordAct` fallito (`:1382-1384`).

La notice `profile_missing` (`CreateAccountForm.tsx:84-93`) lo dice all'operatore
con precisione — *«non ritentare con lo stesso indirizzo, verrà rifiutato come
già esistente»* — ma **il prodotto non offre alcuna superficie per rimuovere
quell'utente**: nessuna `deleteUser` in `src/`, nessuna pagina. L'indirizzo è
bruciato fino a un intervento manuale sulla dashboard Supabase, che non è nel
runbook.

**Scenario concreto.** Il trigger `handle_new_user` fallisce (una entry di guest
list con dati inattesi, un vincolo su `profiles`): l'operatore ottiene la notice
corretta, la persona non ha account utilizzabile, e ogni tentativo successivo
sullo stesso indirizzo risponde `already_exists` — la notice che dice
*«questa persona esiste già, mandale un reset password»*, che è **falso** in
questo caso e manda l'operatore su una strada che non porta da nessuna parte.

**Fix.** Compensare l'unico effetto collaterale che questa funzione ha creato,
sui rami dove è certo che nulla di utile sia rimasto:

```ts
if (!channelRows || channelRows.length === 0) {
  console.error(/* … invariato … */);
  // Compensazione: l'utente auth è stato creato da QUESTA chiamata, pochi ms fa,
  // e senza profilo non è utilizzabile da nessuno. Rimuoverlo restituisce
  // l'indirizzo, così la ritentata non incontra `already_exists`.
  const { error: cleanupError } =
    await serviceClient.auth.admin.deleteUser(memberId);
  if (cleanupError) {
    console.error(
      `[members.orphan_left] createAccount: subject=${memberId} ` +
        `code=${cleanupError.code ?? "unknown"}`
    );
  }
  return { ok: false, failure: "profile_missing", detail: "trigger_did_not_run" };
}
```

Se la compensazione non è desiderata, allora la notice `already_exists`
(`CreateAccountForm.tsx:76-83`) deve smettere di affermare *«se la persona
esiste ma non riesce ad accedere, mandale un reset»*: con un profilo mancante
il reset arriva a un account senza riga in `profiles`, e la persona resta fuori
comunque. In quel caso la notice deve nominare la dashboard Supabase come unica
via.

---

## Info

### IN-01: siti pre-esistenti che loggano l'oggetto `error` intero in `verify/route.ts`

**File:** `src/app/api/membership/verify/route.ts:249-253`,
`:285`, `:345-348`, `:659`

Nessuno dei quattro è stato introdotto o modificato da questa fase (il diff
mostra che l'unico sito toccato, `:610-613`, è stato **ristretto** a
`code`/`message`). Li registro separatamente, non come regressione:
`.planning/todos/pending/postgrest-details-leaks-the-row.md` li copre già. Uno
merita comunque una nota: `:249-253` è dentro `recordScanEvent`, e questa fase
ha cambiato ciò che l'INSERT accanto trasporta — quando lo sweep arriverà,
quello è il primo da fare, perché è nel percorso della porta.

### IN-02: `admin/members/page.tsx:63` rende `error.message` di PostgREST al client

Pre-esistente e non toccato. Su una superficie master-only il costo è basso, ma
è la sola pagina della fase che disegna un messaggio del database invece di una
categoria — l'opposto della regola che `MemberActionNotice.tsx` applica due
componenti più in là. Sostituire con una frase fissa più `error.code`.

### IN-03: `approved_via = 'admin_manual'` resta scritto su un profilo la cui approvazione è stata poi rifiutata

**File:** `src/app/(admin)/admin/members/actions.ts:1337-1341`

Il canale è scritto a `:1337` e l'approvazione a `:1374`. Se `recordAct`
fallisce, resta un profilo `member`/`pending` che dichiara di essere stato
approvato a mano da qualcuno. È l'inverso esatto dello stato che D-08 vuole
prevenire. Ramo oggi quasi irraggiungibile (il CHECK di 43-06 non può scattare
su questo percorso), quindi Info e non Warning; una riga di compensazione
insieme a quella di WR-08 lo chiude.

### IN-04: la allow-list del `next` fissa la forma dello slug senza nulla che la leghi a `slugify.ts`

**File:** `src/app/api/auth/callback/route.ts:44-49`

`[a-z0-9-]{1,80}` è derivato da `src/utils/slugify.ts:11-20`, come il commento
dichiara. Nessun meccanismo tiene i due allineati: uno slug legacy più lungo di
80 caratteri, o con un carattere fuori set, fa degradare silenziosamente il
percorso RSVP→registrazione a `/dashboard?link=refused`. Vale la pena una query
una tantum su `public.events.slug` che verifichi che tutti gli slug esistenti
soddisfino il pattern, e riportarne l'esito nel VERIFICATION della fase.

### IN-05: `MemberActionNotice` disegna `detail` alla lettera, che su due cause è un messaggio d'errore grezzo

**File:** `src/app/(admin)/admin/members/MemberActionNotice.tsx:292-304`,
`src/app/(admin)/admin/members/actions.ts:422-424`, `:436-438`

Il file dichiara il residuo e lo motiva. Lo registro solo perché
`describe(error)` restituisce `error.message` di un throw arbitrario: se un
giorno un `.rpc()` viene fatto lanciare invece che ritornare, quel messaggio può
portare con sé il testo di un errore PostgREST. Il confine oggi tiene perché
`recordAct` ritorna sempre; è una proprietà da non perdere in un refactor.

---

## Riparazioni applicate — 2026-08-08

Tre finding su quattordici sono stati chiusi. **Gli altri undici restano aperti
per scelta**, non per dimenticanza: non sono stati toccati e non vanno letti
come risolti.

| Finding | Esito | Commit |
|---|---|---|
| **CR-01** | ✅ chiuso | `2db9ebf` |
| **WR-01** | ✅ chiuso | `2561c2e` |
| **WR-05** | ✅ chiuso | `b6127dd` |
| WR-02 · WR-03 · WR-04 · WR-06 · WR-07 · WR-08 · IN-01…IN-05 | ⬜ non toccati, differiti deliberatamente | — |

### CR-01 — chiuso, e la regola scelta per il gruppo di atti

Il finding chiedeva di chiudere **la classe, non l'istanza**. La regola sta
scritta in cima al gruppo di atti in `src/app/(admin)/admin/members/actions.ts`,
in tre parti che un settimo atto eredita:

1. **Nessun atto del gruppo raggiunge un soggetto che porta `master`.** Uniforme
   sotto **entrambi** i gate e indipendente da chi chiama — quindi vale anche per
   `deactivateMember` e `reactivateMember`, che prima potevano aggredire un
   master. `WritableRole` **non** e' stata allargata: la via di recupero resta
   `reconcile_master`, dove D-12 l'ha messa. La regola e' la controparte, un
   livello sopra, della guardia zero-master della funzione: il database rifiuta
   di **arrivare** a zero master, questo file rifiuta di **puntare** all'unico che
   c'e'.
2. **Nessun atto del gruppo raggiunge il proprio autore.** Il self-check che
   43-09 aveva fermato una funzione prima di `approveMember` e `rejectMember` —
   cioe' esattamente la copia che quel piano temeva.
3. **L'atto nomina la transizione che compie.** Due transizioni di stato sono
   **riservate** alla coppia `master.manage` e rifiutate a ogni atto del gate
   largo, chiunque chiami:

   - `approved -> rejected` **e'** `deactivateMember` — ritirare un accesso gia'
     concesso;
   - `rejected -> approved` **e'** `reactivateMember` — ripristinarne uno.

   Sotto il gate largo si **decide una domanda aperta** (`pending -> …`) e si puo'
   riaffermare uno stato gia' posseduto. Non si ribalta una decisione presa dal
   gate stretto. E' questo che rende la coppia master-only una restrizione invece
   che una strada piu' lunga verso la stessa scrittura.

   La regola 3 non e' solo la riparazione del permesso: e' cio' che tiene onesto
   il **registro**. `acts.ts:41-45` dice che `rejected` e `deactivated` sono due
   atti per una scrittura perche' rispondono a due ragioni diverse, e il registro
   e' l'unico posto dove quella differenza sopravvive. Lasciare che
   `approveMember` resusciti un account rifiutato scriverebbe `approved` dove
   `reactivated` e' cio' che e' successo: una storia che si nomina male e' peggio
   di una storia mancante, perche' viene letta come vera.

   Vincola anche `updateMemberRole`: una promozione a `organizer`/`staff` scrive
   `status='approved'` nella stessa istruzione, quindi una promozione puntata su
   un account rifiutato e' una riattivazione da una terza porta. Una retrocessione
   passa il ruolo da solo e non e' vincolata.

**Cosa e' cambiato in concreto.** Un solo guard condiviso,
`assertSubjectActionable`, chiamato da `updateMemberRole`, `approveMember`,
`rejectMember`, `deactivateMember`, `reactivateMember` e — per ogni soggetto —
dal ciclo di `runBulk`. `createAccount` e' l'unico atto del gruppo che non lo
chiama, e il perche' e' scritto accanto invece che lasciato come un'assenza: non
ha un soggetto che il chiamante possa nominare.

`ownsReservedTransitions` ha default `false`, cosi' un settimo atto che
dimenticasse il flag ottiene la risposta **restrittiva** — la direzione in cui un
flag dimenticato deve fallire.

**Nel bulk un soggetto rifiutato non sparisce.** `BulkSubjectOutcome` guadagna
`detail`, `MemberTable` lo passa a `MemberActionNotice`, e cinque nuove voci
entrano in `FORBIDDEN_BY_DETAIL` (`self_approve`, `self_reject`,
`withdrawal_is_master_only`, `restoration_is_master_only`, piu' un
`subject_is_master` riformulato perche' ora copre tutti gli atti). Il contratto
di 43-14 — una frase distinguibile per causa — regge: *«5 selezionati, 4 respinti,
1 rifiutato perche' e' il master»* resta diverso da *«5 respinti»*.

**La superficie non cambia**, e la coincidenza va detta: `MemberTable` gia'
offriva Approve/Reject solo su una riga `pending` (`:406`), il bulk solo sulla
scheda pending (`:781`) e il cambio ruolo solo su una `approved` (`:318`). La
regola 3 fa **rifiutare al server** cio' che la superficie gia' non offre — che e'
l'intera differenza fra nascondere un controllo e rifiutare una richiesta.

### WR-01 — chiuso, con una deviazione dal fix proposto

Nuova migration `supabase/migrations/20260808005000_membership_acts_append_only.sql`
(prefisso verificato libero, ordina dopo `20260808004000`). `20260808002000` non
e' stata toccata: e' committata, puo' essere gia' applicata, e il prefisso e' la
chiave primaria `version` di Supabase.

**Deviazione:** `anon` e `authenticated` **conservano** i loro grant; la REVOKE
colpisce `PUBLIC` e `service_role`. La forma proposta dal finding li revocava
tutti e tre, ed e' stata scritta cosi' per prima:
`verify:capabilities --target=container` si e' rifiutato di misurare alcunche'.

> *«these table/role pairs lack one of SELECT, INSERT, UPDATE, DELETE:
> membership_acts/anon, membership_acts/authenticated. A 42501 would then mean a
> missing grant, not a policy refusal. Nothing was measured.»*

La premessa di `scripts/rls-baseline-container.mjs:290-320` — *RLS narrows a
grant; it cannot create one* — e' che quelle due ruote tengano tutti e quattro i
privilegi DML su **ogni** tabella con RLS, cosi' che un `42501` nelle sue sonde
significhi «una policy ha rifiutato». Toglierli su una tabella acceca l'unico
controllo automatico che questo repo ha sul modello d'accesso, e lo acceca su
tutte le tabelle. E per quelle due ruote il livello sarebbe **ridondante**: la RLS
senza policy di scrittura le rifiuta gia' del tutto — il paragrafo di
`20260808002000` e' vero per loro. Il buco e' `service_role`, che porta
`BYPASSRLS`, ed e' `service_role` che la migration chiude.

**Misurato su container usa e getta** (mai su produzione: le righe di
`membership_acts` sopravvivono al soggetto, quindi una sonda dal vivo lascerebbe
un atto falso permanente in una tabella d'audit):

| sonda come `service_role` | con la migration | senza |
|---|---|---|
| `DELETE ... WHERE false` | `42501 permission denied` | **`NO REFUSAL`, rowCount=0** |
| `UPDATE ... WHERE false` | `42501 permission denied` | **`NO REFUSAL`, rowCount=0** |
| `INSERT` | `42501 permission denied` | `23502` — arriva al NOT NULL della tabella, cioe' **supera del tutto il controllo dei grant** |
| `SELECT count(*)` | ok | ok |
| `record_membership_act(...)` | registro `2 -> 3` | registro `2 -> 3` |

La riga che conta e' la prima: prima della migration risponde «DELETE 0», che e'
un successo. La via legittima — la funzione definer — continua a scrivere.

**Non mecanizzato, e va detto.** Il finding suggeriva anche un'asserzione
permanente in `scripts/container/seed.mjs`. Non e' stata aggiunta: quel file
appartiene a 43-08 e ampliarlo qui sarebbe uscito dal perimetro di questa
riparazione. La proprieta' e' **misurata oggi** con la sonda sopra, e **non e'
sorvegliata** contro una futura migration che rigrantasse le DML. Voce da aprire.

### WR-05 — chiuso, e come le due cose restano distinguibili

`PGRST202`, `42883` e `42P01` significano ora *«questo deploy e' avanti rispetto
al suo database»*: **NO-OP, nessun flag, nessun banner**. Tre codici e non uno,
per la ragione che 43-09 diede su `P0002`: quale etichetta sopravviva a PostgREST
e' un'assunzione, non una misurazione.

**Come si distinguono da un fallimento vero** — la domanda che il finding pone e
a cui bisogna rispondere, perche' senza error tracking un errore che solo logga
non raggiunge nessuno:

1. **categoria di log propria** — `[auth.reconcile_master.schema_absent]`, che
   nomina la coda di migration da applicare, contro `[auth.reconcile_master]` di
   ogni altro ramo. Due prefissi, mai una riga sola;
2. **valore di ritorno diverso** — `null` (nessun flag) contro `"unavailable"`,
   `"refused"` e i quattro flag di esito, **che continuano a disegnare il
   banner**. Una sola causa e' stata separata *fuori* da `unavailable`, non
   ripiegata *dentro*;
3. **l'effetto osservabile non sparisce, cambia pubblico.** Finche' la coda non e'
   applicata, ogni atto su `/admin/members` risponde `write_failed` con la sua
   notice — `record_membership_act` manca dallo stesso database — e
   `/admin/members/register` e' vuota. L'operatore incontra il guasto la prima
   volta che prova a lavorare; i 150 membri no.

Corretta anche una nota di quel file diventata falsa (*«nothing renders it
today»* del flag `?master=`, che la dashboard invece disegna) — ed e' proprio la
ragione per cui il fix serve.

**Non fatto:** la seconda mossa proposta da WR-05, cioe' condizionare il banner
di `dashboard/page.tsx:317` a `canReachManagementTools`. Resta aperta insieme a
WR-03, che riguarda la stessa condizione di rendering. E **l'ordine di deploy —
cinque migration PRIMA di promuovere il build — non e' ancora scritto in
`43-HUMAN-UAT.md`**: e' l'altra meta' di WR-05 e resta aperta.

### Verifica eseguita

| comando | esito |
|---|---|
| `npm run build` | **exit 0** — `✓ Compiled successfully`, typecheck di Next incluso |
| `npx tsc --noEmit` | **exit 0** |
| `npm run verify:capabilities -- --target=container` | **5/5 verde, 0 warning**, 44 migration applicate, 42 coppie tabella/ruolo verificate |
| sonda WR-01 su container usa e getta | tabella sopra, provata per mutazione |

**Cio' che quel verde NON prova** (`CLAUDE.md` Guardrail 1: non esiste alcun test
runner per il prodotto, e nessun client Supabase e' parametrizzato con
`Database`): che `assertSubjectActionable` rifiuti davvero un soggetto master a
runtime, che i nuovi `detail` arrivino alla superficie, e che `PGRST202` sia
l'etichetta che PostgREST emette per una funzione assente. Quella e' evidenza
manuale, e non e' stata raccolta qui.

**Procedura manuale da eseguire prima di dichiarare la fase verificata:**

1. Con un account `organizer/approved`, dalla console del browser su
   `/organizer/members`, invocare la Server Action `rejectMember` con l'id del
   master. Leggere `public.profiles` per il master **prima e dopo**. Atteso:
   `role` e `status` invariati, **nessuna** riga nuova in
   `public.membership_acts`, notice `subject_is_master` sullo schermo.
2. Ripetere con `bulkRejectMember([<id del master>])`. Atteso: il rapporto dice
   *0 su 1*, e la riga del soggetto porta la frase di `subject_is_master` — non
   sparisce dal conteggio.
3. Ripetere con `rejectMember(<il proprio id>)`. Atteso: `self_reject`.
4. `approveMember(<un account rejected>)`. Atteso:
   `restoration_is_master_only`, e nessuna riga nel registro.
   `rejectMember(<un account approved>)`. Atteso:
   `withdrawal_is_master_only`.
5. Su un ambiente con il build deployato e le migration **non** applicate:
   effettuare un login qualunque. Atteso: la barra degli indirizzi **non**
   contiene `master=`, nessun banner ambra, e nei log del server compare
   `[auth.reconcile_master.schema_absent]`.

**Nessuna migration e' stata applicata a produzione. Nessuna mail e' stata
inviata. Nessuna sonda ha toccato un database di produzione.**

---

_Reviewed: 2026-08-08_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
_Fixed: 2026-08-08 — CR-01, WR-01, WR-05. Gli altri undici finding restano aperti._
