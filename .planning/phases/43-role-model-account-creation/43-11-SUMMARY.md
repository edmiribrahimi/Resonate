---
phase: 43
plan: 11
subsystem: access-gating
tags: [account-creation, approval, register, invitation, recovery-link, service-role]
requires:
  - "43-04 — the /set-password surface and the callback's enumerated `next` allow-list this invitation aims at"
  - "43-07 — public.record_membership_act and its eight parameter names"
  - "43-09 — MemberActFailure, the `guarded` helper and the returned-tag discipline"
  - "43-01 measurement 6 — generateLink accepts options.redirectTo for type: 'recovery' and returns properties.redirect_to"
provides:
  - "createAccount — the phase's privileged creation path, gated by STAFF_MANAGE"
  - "the runtime half of D-07's ceiling: isWritableRole, which also closes the same hole on updateMemberRole"
  - "the properties.redirect_to assertion plan 43-04 assigned to this plan"
  - "the Italian member-facing invitation, the repository's first Italian template"
  - "readAppUrl — NEXT_PUBLIC_APP_URL read trimmed, with no or-default anywhere in this file"
affects:
  - "src/app/(admin)/admin/members/actions.ts — plan 43-14 adds `staff` to the members table's own role control"
  - "src/lib/email.ts — untouched here, but it still logs the whole Resend error object (recorded below)"
tech-stack:
  added: []
  patterns:
    - "an update that RETURNS its rows, replacing a sleep as the trigger read-back"
    - "a requested redirect asserted against the returned one, turning a silent auth misconfiguration into a named failure"
    - "a closed union held twice — unrepresentable in the source, unreachable from the wire"
    - "member-facing transactional copy in Italian while the interface stays English"
key-files:
  created:
    - "src/emails/account-invitation.tsx"
    - "src/app/(admin)/admin/members/CreateAccountForm.tsx"
  modified:
    - "src/app/(admin)/admin/members/actions.ts"
    - "src/app/(admin)/admin/members/page.tsx"
decisions:
  - "no live createAccount probe was run against production: the register's subject_id is ON DELETE SET NULL with a denormalised subject_label, so a throwaway's act row would survive its own cleanup permanently inside the audit table this phase exists to make trustworthy"
  - "the D-07 ceiling is enforced at runtime as well as in the type, against the plan's stated reasoning — a Server Action is a public endpoint and TypeScript is erased before the POST body is deserialised; the same guard was added to updateMemberRole, whose gate widened to organizers in 43-09"
  - "a twelfth failure cause, invitation_link_misaimed, was added so a redirect the auth service did not honour refuses the send instead of mailing a link that lands on a page with no password field"
  - "the module-level app URL constant lost its or-default, so a missing variable now fails the approval mail loudly instead of pointing it at a host this project does not own"
  - "task 2 was committed before task 1 so that every commit builds on its own"
  - "executor decisions throughout; no user approval was sought and none was given"
metrics:
  duration: ~75 min
  completed: 2026-08-08
---

# Phase 43 Plan 11: Creare un account è approvarlo — Summary

`ACCT-01` … `ACCT-04` in una sola superficie: un master o un organizer crea un
account come `member`, `staff` o `organizer`; l'account nasce **approvato**, con
`approved_via = 'admin_manual'`, il suo codice di membership e la sua riga nel
registro con l'autore; e la persona riceve **un link per impostare la password,
mai una password**.

Il meccanismo esisteva già in `src/lib/guest-list/process-entry.ts:218-251`.
Quello che non è stato riusato sono i suoi tre difetti: la `sleep` di 500 ms al
posto di una rilettura, il fallimento del link ingoiato in un fallback su
`/login`, e la lettura di `NEXT_PUBLIC_APP_URL` con un or-default verso un host
che questo progetto non possiede.

**Nessuna email è stata inviata ad alcuna casella reale.** Nessuna migration è
stata applicata alla produzione. Nessun account è stato creato in produzione.

---

## Le decisioni prese dall'esecutore — nessuna approvazione dell'utente

Il proprietario ha dichiarato di non poter eseguire operazioni tecniche e ha
delegato la scelta dell'approccio. Tutto ciò che segue è una decisione
dell'esecutore, registrata come tale. **Nessuna approvazione è stata chiesta e
nessuna è stata data.**

### 1. Il soffitto di D-07 è tenuto due volte, non una

Il piano dice — ed è un'affermazione forte, scritta bene — che l'assenza di
`'master'` dall'unione è *più forte* di un controllo a runtime, perché «un
percorso che non c'è non si può raggiungere».

**È vero nel sorgente e non è vero sul filo.** Una Server Action è un endpoint
pubblico con una firma comoda (`nextjs-architecture.md`, gate *server action
autorizzata*): i suoi argomenti sono deserializzati da un corpo POST, e
TypeScript è cancellato molto prima che ciò accada. Una richiesta costruita a
mano da un organizer autenticato, con `role: "master"`, sarebbe arrivata a
`record_membership_act` senza opposizione — `profiles_role_check` ammette
`master`, perché master è un ruolo reale — e il potere auto-replicante che D-07
vieta sarebbe stato concesso da un valore che nel sorgente non compare mai.

Quindi il soffitto ora è tenuto due volte, e nessuna delle due metà è ridondante:

| Livello | Meccanismo | Cosa impedisce |
|---|---|---|
| sorgente | `WritableRole` non ha `'master'` | che qualcuno **scrivendo codice qui** lo produca per errore |
| filo | `isWritableRole()`, contro lo stesso insieme chiuso | che qualcuno **inviando byte qui** lo produca di proposito |

**Lo stesso buco era aperto su `updateMemberRole`**, ed è stato chiuso nello
stesso commit. Non è debito preesistente indifferente: il piano 43-09 ha
**allargato** quel gate agli organizer (D-21), quindi da quel momento la strada
per una richiesta costruita a mano è aperta a un ruolo in più. La regola di
scopo dice di non riparare ciò che non si è rotto — ma questo è un
sollevamento di privilegio su un percorso che questa fase ha appena reso più
largo, nello stesso file, in tre righe.

### 2. Nessun sondaggio dal vivo contro la produzione

Il criterio di successo chiede che il link sia verificato **confrontando**
`properties.redirect_to` con il valore richiesto, non per assunzione. Il
confronto è costruito e la sua logica è stata **eseguita** (tabella più sotto).
Non è stata invece eseguita una `createAccount` reale contro la produzione, e la
ragione è specifica e vale la pena scriverla:

`membership_acts.subject_id` è `REFERENCES auth.users ON DELETE SET NULL`, con
`subject_label` denormalizzato apposta perché *«una riga sopravviva al suo
soggetto»* (`20260808002000_membership_register.sql:188-190`). Cancellare
l'account usa e getta **non cancella la sua riga di registro**: lascerebbe per
sempre un atto `created` dentro la tabella d'audit che questa fase esiste per
rendere affidabile. Il piano 43-01 ha potuto usare un account usa e getta perché
il registro non esisteva ancora; qui esiste, e il costo della misura è permanente.

Conseguenza, detta invece che sottintesa: **quello che il build verde non prova
è elencato più sotto, e non è poco.**

### 3. Una dodicesima causa: `invitation_link_misaimed`

Il piano prevede due fallimenti d'invito. Ne esiste un terzo, e ignorarlo
avrebbe prodotto esattamente il guasto silenzioso che il confronto serve a
evitare: se il target richiesto non è nell'allow-list dei redirect, Auth **non
rifiuta** — ripiega sul site URL e restituisce un link che funziona, atterra
altrove, e non lo dice. Inviarlo sarebbe peggio che non inviarlo, perché il
fallimento diventerebbe la confusione di una persona invece dell'avviso di un
operatore. Quindi il messaggio **non parte**, e la causa ha la sua frase.

### 4. L'or-default sull'URL è sparito dall'intero file

La verifica del piano pretende zero occorrenze di `NEXT_PUBLIC_APP_URL ||`. La
costante a livello di modulo, che serviva alla mail di approvazione, ne aveva
una. Sostituita da `readAppUrl()`: valore `trim`-ato, senza default, e
`sendApprovalEmail` ora **solleva** se manca. Le due chiamate a quella funzione
sono fire-and-forget con un `.catch` che logga, quindi il risultato è una riga
di log distinguibile invece di una mail di approvazione che punta a un host che
non è nostro. `.trim()` non è pulizia difensiva: è l'incidente registrato su
**quella esatta variabile**, una newline in coda che ruppe il webhook SumUp.

### 5. Ordine dei commit invertito

Task 2 (il template) è stato committato prima del Task 1 (l'azione che lo
importa), perché altrimenti il commit del Task 1 non avrebbe compilato. Nessun
altro cambiamento di contenuto.

---

## Task per task

### Task 2 — l'invito (commit `7ea14f5`)

`src/emails/account-invitation.tsx`, sulla struttura di `member-approved.tsx` —
il template più corto e l'atto più vicino, dato che D-08 dice che creare *è*
approvare.

**La copy è in italiano, e rompe di proposito ogni analogo.** Tutti gli altri
template del repository sono in inglese; `comms-analytics.md`, gate *template in
italiano*: le transazionali verso i membri sono in italiano, **l'interfaccia
resta in inglese**. Le due lingue convivono per destinatario. Su questo
messaggio conta il doppio: chiede a qualcuno di cliccare un link e digitare una
password, cioè la forma esatta che una persona fa bene a diffidare.

**La frase che rende D-09 utile invece che solo vera**, ed è la riga su cui si è
lavorato di più:

> *Il tuo ingresso è già attivo: sei tra i membri in lista all'entrata da
> subito, anche prima di impostare la password. Alla porta basta il tuo nome.*

Quello che **non** dice, di proposito: *mostra il tuo QR alla porta*. Il codice
di membership è una credenziale reale e il percorso della porta non legge né
ruolo né stato (43-RESEARCH § C.2, tracciato riga per riga) — ma per **vedere**
quel codice bisogna aprire l'app, e aprire l'app significa aver impostato questa
password. Promettere una schermata che non possono ancora aprire sarebbe lo
stesso errore nell'altra direzione.

**Nessuna password, in nessuna forma.** Non esiste una prop per una password,
non esiste una credenziale temporanea, non c'è un punto del file dove un
segreto possa essere interpolato. Il link arriva dal chiamante.

Il footer condiviso dentro `EmailLayout` resta in inglese: cambiarlo
modificherebbe ogni messaggio che il prodotto invia, e appartiene a chi possiede
il layout.

### Task 1 — `createAccount` (commit `6731e90`)

Gate `verifyAdminOrOrganizer` (`STAFF_MANAGE`), perché creare **è** approvare e
quello è il gate dell'approvazione.

**L'ordine, e perché è quello.** Tutto ciò che si può controllare senza effetti
collaterali viene controllato **prima**: il gate, l'indirizzo, il nome, il
ruolo, l'URL del sito. Ogni fallimento *dopo* `createUser` lascia dietro di sé
un utente di autenticazione, e un secondo tentativo sbatte contro
`already_exists`. Rifiutare presto non costa niente; rifiutare tardi costa un
account orfano e una conversazione confusa.

| # | Passo | Se fallisce |
|---|---|---|
| 0 | gate, validazione, URL del sito | niente è stato creato |
| 1 | `auth.admin.createUser`, `email_confirm: true` | `already_exists` (idempotenza) o `write_failed` |
| 2 | `approved_via = 'admin_manual'`, **con `.select("id")`** | `profile_missing` se zero righe, `constraint_refused` / `write_failed` altrimenti |
| 3 | `record_membership_act`, atto `created`, ruolo + stato in una transazione | `constraint_refused` / `profile_missing` / `write_failed` |
| 4 | rilettura del codice di membership | **non fatale** — loggata, portata come assenza |
| 5 | `generateLink({type:'recovery', options:{redirectTo}})` | `invitation_link_failed`, **con il codice** |
| 6 | confronto `properties.redirect_to` ↔ richiesto | `invitation_link_misaimed`, **con il codice**, e **non si invia** |
| 7 | `sendAccountInvitation`, **awaited** | `invitation_send_failed`, **con il codice** |

**La sleep sostituita da una rilettura che è anche una scrittura.**
L'`update` di `approved_via` porta `.select("id")`: un update che non matcha
alcuna riga restituisce un **array vuoto** con `error: null`. Così *«il trigger
`handle_new_user` non ha scritto il profilo»* smette di essere un silenzio e
diventa `profile_missing` — e lo diventa **deterministicamente**, senza
dipendere dalla mappatura `P0002 → error.code` che il piano 43-09 ha segnalato
come **assunzione e non misura**. Quella mappatura è comunque onorata, come
seconda rete, tramite `asCreateFailure`.

**`approved_via` è scritto prima dell'atto, non dopo.** Se fallisce, il profilo
resta esattamente come il trigger l'ha scritto — `member`, `pending`, non
approvato — e il registro non contiene nulla che dica il contrario. L'ordine
inverso avrebbe lasciato un account approvato con il canale non registrato, che
è lo stato che D-08 esiste per impedire. Il valore è `admin_manual`, uno dei tre
ammessi da `profiles_approved_via_check`: **nessuna quarta etichetta inventata,
nessun vincolo allargato.**

**Ruolo e stato si muovono in una sola istruzione.** È D-08 (l'account nasce
approvato, non rimesso nella coda da cui è appena uscito) ed è anche la ragione
per cui `profiles_role_implies_approved` non può scattare su questo percorso: lo
stato intermedio vietato — un ruolo staff su un account `pending` — non esiste
mai. Un `createUser` semplice lascia `status = 'pending'`, quindi scrivere il
solo ruolo sarebbe stato un `23514` secco per `staff` e `organizer`.

**Il codice di membership viene dal trigger.** `src/utils/qr.ts` non è chiamato:
`grep -rn "generateMembershipCode" src/app/(admin)/admin/members/` → **0**. Due
generatori per un identificatore divergono, e quello del trigger è quello di cui
la porta si fida già.

**Cosa può raggiungere il chiamante più largo** — un **organizer**, detto
esplicitamente come 43-09 fece per `updateMemberRole`:

| Asse | Portata |
|---|---|
| ruolo | `member`, `staff`, `organizer`. Nient'altro, né nel sorgente né sul filo |
| soggetto | **solo un account nuovo.** L'azione non ha un parametro id: un indirizzo duplicato è rifiutato prima di ogni scrittura, quindi non può essere usata per toccare, ri-approvare o ri-assegnare un ruolo a chi esiste già — master compreso |
| stato | `approved`, sempre. Non esiste un argomento per cambiarlo |

**Il client service-role, giustificato come `access-gating.md` pretende.**
`auth.admin.createUser` e `auth.admin.generateLink` esistono **solo** su un
client service-role: nessuna policy RLS può concederli. L'altra metà della
regola — *mai raggiungibile da input non fidato* — è tenuta così: il gate gira
prima che il client sia costruito, l'indirizzo è `trim`-ato e minuscolo, il
ruolo è testato contro un insieme chiuso, e nessun valore fornito dal chiamante
raggiunge una query che nomini una riga diversa da quella appena creata.

**Il residuo, nominato invece che sottinteso:** `already_exists` è un oracolo
sull'esistenza di un account, e questo repository **non ha alcun rate limiting**
(`access-gating.md`, verificato 2026-08-05). Il gate è la mitigazione — master e
organizer hanno titolo a sapere chi è nella community — e nessun percorso non
autenticato raggiunge questa azione.

### Task 3 — il form (commit `90f1277`)

`CreateAccountForm.tsx`, nella forma di `newsletter/ComposeForm.tsx` +
`FailureNotice.tsx`: una card chiusa che si apre, `useTransition`, e un reclamo
d'input disegnato **diversamente** da un fallimento etichettato. Montato sopra
la tabella in `page.tsx`.

**L'esaustività è meccanica, non promessa.** `NOTICES` è un
`Record<NoticeKind, …>`: una causa aggiunta all'azione senza copy qui **non
compila**. Non c'è nessuna stringa di ripiego condivisa, da nessuna parte.

---

## Le dodici cause, e la loro copy

Undici dal server, più una solo-client (`transport_unavailable`, quando
l'azione non è mai tornata e non c'è alcuna etichetta da leggere).
`nothing_to_do` e `subject_not_found` sono **assenti di proposito**: creare
cambia sempre qualcosa, e un soggetto inesistente qui è `profile_missing`, che
dice *il trigger non è partito* e non *ricarica la lista*.

| Causa | In che stato è il mondo | Il titolo che l'operatore legge |
|---|---|---|
| `capabilities_unavailable` | niente tentato | *Permission lookup failed — this is not a refusal* |
| `forbidden` | niente tentato | *You do not hold the capability to create accounts* |
| `invalid_input` | niente creato | *The server refused the details* |
| `app_url_missing` | **niente creato**, controllato prima di ogni scrittura | *The site address is not configured — nothing was created* |
| `already_exists` | niente creato, **e nessuna seconda mail** | *That address already has an account* |
| `profile_missing` | utente auth sì, profilo no; **non approvato, non ammissibile** | *The account was created in Auth, but its profile was not written* |
| `constraint_refused` | il database ha rifiutato l'approvazione | *The database refused the approval — not this screen* |
| `write_failed` | dipende da quanto è arrivato; niente inviato | *The write failed* |
| `invitation_link_failed` | **account creato, approvato, ammissibile**; nessun messaggio | *The account exists and works at the door — the invitation does not* |
| `invitation_link_misaimed` | come sopra; il link esisteva ma puntava altrove, **non inviato** | *…the link pointed somewhere else* |
| `invitation_send_failed` | come sopra; il provider non ha accettato | *…the message did not leave* |
| `transport_unavailable` | ignoto da qui | *The server did not answer* |

Le tre righe in grassetto mostrano **il codice di membership** restituito
dall'azione e dicono di **non creare di nuovo** quella persona: un secondo
tentativo prende `already_exists`, che è il rifiuto giusto ma la conversazione
sbagliata.

**La nota fissa accanto al campo ruolo** — non un errore, perché è vera ogni
volta:

> *Create staff accounts **before the night**, not during it. A door phone that
> has already gone offline does not know an account created after it downloaded
> its list, and will refuse the code. If it happens, check the person in from
> the list instead of scanning again.*

La ragione è **misurata**, non prudenziale: un telefono alla porta senza rete
rifiuta un codice che il roster scaricato non conosce
(`ScannerClient.tsx`, `membershipOffline`), perché un QR di membership **non
porta firma** e ammetterne uno sconosciuto offline sarebbe un buco illimitato
invece che limitato. È la metà di superficie del limite onesto di ACCT-02
(T-43-11-07, disposizione `accept`), e non è stata aggirata per ingegneria.

**Il `<select>` offre `member`, `staff`, `organizer`.** Non offre `master`, e un
commento dice perché nessuno deve «completare» la lista: il soffitto sta
nell'unione chiusa dell'azione e nel suo ri-test lato server, non qui.
Aggiungere `master` aggiungerebbe un'opzione che il server rifiuta, non una
capacità.

---

## Verifica

### Le asserzioni statiche del piano

| Controllo | Comando | Risultato |
|---|---|---|
| il build passa | `npm run build` | **passa**, typecheck di Next incluso, zero errori |
| nessuna sleep | `grep -v '^\s*\*' actions.ts \| grep -c setTimeout` | **0** |
| il canale è scritto | `grep -c admin_manual` (non-commento) | **3** |
| nessun or-default sull'URL | `grep -v '^\s*\*' \| grep -cE 'NEXT_PUBLIC_APP_URL \|\|'` | **0** |
| il generatore di `qr.ts` non è chiamato | `grep -rn generateMembershipCode admin/members/` | **0** |
| **ACCT-03 — nessuna password interpolata** | `grep -icE "password[\"'\`]?\s*[:=]" account-invitation.tsx` | **0** |
| **il brand ha la e normale** | `grep -c "<e rovesciata>" account-invitation.tsx` | **0** |
| il template passa da `EmailLayout` | `grep -c EmailLayout` | **4** |
| una causa per notifica | `grep -c invitation_link_failed CreateAccountForm.tsx` | **1**, e l'esaustività è imposta dal `Record` |
| la nota fissa esiste | `grep -ci "before the night"` | **1** |
| nessun `console.log` residuo | `grep -rn console.log admin/members/` | **0** |

Tre di questi controlli hanno richiesto una modifica **ai commenti** per essere
onesti: il carattere della e rovesciata, la stringa `setTimeout` e la stringa
`NEXT_PUBLIC_APP_URL ||` comparivano nella prosa che li spiega, e un `grep` che
conta le citazioni non asserisce nulla. Ora nessuno dei tre appare nel file,
nemmeno in un commento, e ogni commento dice perché.

### Il confronto sul redirect, **eseguito** e non letto

`sameRedirectTarget` è stato estratto **verbatim** (671 byte, estrazione
ancorata, nessuna modifica) in un file `.mts` sotto `/tmp` ed eseguito con lo
strip dei tipi di Node. Non può essere importato dov'è: il modulo è `"use
server"` e importa `next/cache` e `@supabase/supabase-js`. Che sia una copia è
detto, non glissato. Lo script è stato cancellato e non è mai stato dentro il
worktree.

| Valore restituito da Auth | Esito |
|---|---|
| identico al richiesto | MATCH |
| con lo slash finale sul path | MATCH |
| con l'host in maiuscolo | MATCH |
| con un parametro estraneo in più | MATCH |
| **il site URL secco — la firma di una voce mancante nell'allow-list** | **MISMATCH** |
| il callback ma con `next=/dashboard` | **MISMATCH** |
| un host diverso | **MISMATCH** |
| `http` invece di `https` | **MISMATCH** |
| senza il parametro `next` | **MISMATCH** |
| stringa vuota | **MISMATCH** |
| non un URL | **MISMATCH** |

Il caso che conta è il quinto: è **esattamente** ciò che Auth restituisce quando
il target richiesto non è ammesso, ed è ciò che senza questa asserzione sarebbe
stato scoperto da una persona che ha seguito un invito ed è atterrata su una
dashboard senza campo password. Le quattro varianti cosmetiche restano MATCH,
perché un falso allarme qui **blocca un invito**.

Il piano 43-04 ha già letto l'allow-list in sola lettura e ha trovato che ogni
origine deployata porta una voce `/**`, quindi la risposta di produzione è già
sì. Questo confronto non è ridondante: è ciò che **mantiene vera** quella
risposta se un giorno la configurazione cambia.

### Cosa il build verde NON prova

Obbligatorio dirlo, perché nessun client Supabase di questo repository è
parametrizzato con `Database`:

1. che `public.record_membership_act` **esista** sul database di produzione;
2. che i suoi **otto nomi di parametro** siano scritti giusti;
3. che `approved_via`, `membership_code` e gli altri nomi di colonna siano
   quelli veri;
4. che un `23514` arrivi al client JS come `error.code` **su questo percorso**
   (misurato altrove in 43-01, non qui);
5. che un indirizzo duplicato produca davvero `email_exists` **o**
   `user_already_exists` su questa istanza GoTrue — entrambe le etichette sono
   riconosciute proprio perché quale delle due emetta non è conoscibile da qui
   senza creare un duplicato contro la produzione;
6. che il trigger `handle_new_user` scriva il profilo prima che `createUser`
   ritorni. Il codice **non lo assume**: se non è così, il risultato è
   `profile_missing`, forte e visibile, invece di un account fantasma.

**Non esiste alcun test runner per il prodotto** (`CLAUDE.md`, Guardrail 1), e
nessuno è stato aggiunto. Niente qui è dichiarato verificato perché «i test
passano».

---

## Le procedure manuali — scritte, non eseguite

Il piano 43-15 le trasforma in `43-HUMAN-UAT.md`. **Nessuna è stata eseguita**:
tutte richiedono di creare un account vero e di far partire un messaggio vero
verso una casella vera, che non è una decisione dell'esecutore.

> **M-43-01 — un account creato entra prima del primo accesso.**
> 1. Da `/admin/members`, aprire *Create an account*. Inserire un indirizzo di
>    prova che **si controlla**, un nome, ruolo `member`. Premere *Create and
>    invite*.
> 2. **Atteso:** pannello verde con *«… was created as member, approved, and
>    invited»* e il codice di membership in monospazio. Annotare il codice.
> 3. Nella tabella sotto, verificare che la riga esista con stato `approved` e
>    ruolo `member`.
> 4. **Senza aprire il messaggio e senza accedere**, dallo scanner con la rete
>    attiva scansionare o inserire quel codice di membership su una serata
>    aperta.
> 5. **Atteso:** ingresso registrato, con il nome mostrato. Se viene rifiutato,
>    ACCT-02 non regge e va segnalato.
>
> Data: ______   Esito al passo 5: ______

> **M-43-02 — la stessa cosa con la radio spenta, nei due ordini.**
> *Ordine A:* creare l'account, **poi** far scaricare il roster al telefono
> della porta, **poi** mettere il telefono offline e scansionare.
> **Atteso: ammesso.**
> *Ordine B:* far scaricare il roster, mettere il telefono offline, **poi**
> creare l'account, poi scansionare.
> **Atteso: rifiutato**, con *«Not in the member list on this device — check
> them in from the list instead»*. **Questo è il comportamento corretto**, non
> un difetto: è T-43-11-07 e la nota fissa del form lo annuncia in anticipo.
>
> Data: ______   Esito A: ______   Esito B: ______

> **M-43-03 — il link imposta una password.** (Estende quella del piano 43-04.)
> 1. Aprire il messaggio arrivato all'indirizzo di prova. **Verificare prima di
>    tutto che non contenga alcuna password**, nessun codice temporaneo, nessun
>    indirizzo di venue.
> 2. La copy è in italiano e dice che l'ingresso è già attivo.
> 3. Premere *Imposta la tua password*.
> 4. **Atteso:** si arriva su una pagina intitolata *Set your password* con due
>    campi. Se si arriva alla dashboard, il redirect non è stato onorato — e in
>    quel caso il form avrebbe dovuto mostrare `invitation_link_misaimed` e
>    **non** inviare nulla: segnalare la contraddizione.
> 5. Impostare la password, uscire, rientrare con quella password.
>
> Data: ______   Esito ai passi 1 e 4: ______

> **M-43-07 — un organizer non raggiunge `master`.**
> 1. Con una sessione **organizer**, aprire il form: il menu Role offre
>    `Member`, `Staff`, `Organizer` e **non** `Master`.
> 2. Creare un account come `organizer`. **Atteso:** riesce.
> 3. La parte che conta è la seconda, e va fatta da chi sa usare gli strumenti
>    del browser: rieseguire la stessa richiesta sostituendo il ruolo con
>    `master`. **Atteso:** l'operazione fallisce con *«The server refused the
>    details»* e **nessun account master compare** nella tabella.
> 4. Stessa prova su un cambio di ruolo dalla tabella membri, verso `master`.
>    **Atteso:** rifiutato.
>
> Data: ______   Esito ai passi 3 e 4: ______

---

## Deviazioni dal piano

### Decisioni dell'esecutore (nessuna approvazione chiesta né data)

**1. [Rule 2 — funzionalità critica mancante] Il soffitto di D-07 anche a
runtime, e la stessa chiusura su `updateMemberRole`.**
- **Trovato durante:** Task 1
- **Problema:** l'unione chiusa è una garanzia di compilazione; una Server
  Action deserializza un corpo POST dopo che i tipi sono stati cancellati. Un
  `role: "master"` costruito a mano sarebbe stato scritto.
- **Correzione:** `isWritableRole()` contro lo stesso insieme chiuso, in
  `createAccount` **e** in `updateMemberRole` — quest'ultimo perché 43-09 ne ha
  allargato il gate agli organizer nella stessa fase.
- **File:** `src/app/(admin)/admin/members/actions.ts`
- **Commit:** `6731e90`

**2. [Rule 2] Una dodicesima causa, `invitation_link_misaimed`.**
- **Trovato durante:** Task 1
- **Problema:** un target non ammesso non produce un errore: produce un link
  che atterra altrove in silenzio.
- **Correzione:** confronto strutturale su `properties.redirect_to`, causa
  propria, **e l'invito non parte**.
- **Commit:** `6731e90`

**3. [Rule 2] L'or-default sull'URL del sito rimosso anche dal percorso
dell'approvazione.**
- **Trovato durante:** Task 1
- **Problema:** la verifica del piano pretende zero occorrenze, e la costante di
  modulo ne aveva una che serviva a `sendApprovalEmail`. Il default puntava a un
  host che questo progetto non possiede.
- **Correzione:** `readAppUrl()` senza default, con `trim`; `sendApprovalEmail`
  solleva e la sua `.catch` lo logga con categoria propria.
- **Commit:** `6731e90`

**4. [Ordine] Task 2 committato prima del Task 1.**
- Il commit del Task 1 importa il template: l'ordine inverso non avrebbe
  compilato. Nessun cambiamento di contenuto.

**5. [Politica dei checkpoint] Nessun checkpoint restituito, nessuna prova dal
vivo contro la produzione.** Le ragioni sono nella sezione in cima. Il
confronto sul redirect è stato invece **eseguito** su una copia estratta.

### Debito registrato invece che lasciato da scoprire

**`src/lib/email.ts:38` logga l'intero oggetto d'errore di Resend.**
`console.error("Email send failed:", error)` — questo file non è stato toccato
(non è tra i quattro dichiarati) e nessuna delle sue chiamate qui gli passa
altro che il necessario, ma la disciplina che il piano 43-09 ha imposto sugli
errori PostgREST vale nella stessa forma per un errore di provider: un oggetto
d'errore serializzato per intero può portare più di quanto si intendeva. Chi
tocca `src/lib/email.ts` lo restringa a `error.name` e `error.message`.

**Le tre citazioni tolte dai commenti.** La e rovesciata, `setTimeout` e
l'or-default non compaiono più nemmeno nella prosa che li spiega, per non
rendere ambigui i `grep`. È leggibilità barattata con verificabilità, e il
baratto è dichiarato in ogni punto in cui è stato fatto.

---

## Criteri di successo

| # | Criterio | Stato |
|---|---|---|
| 1 | un master o un organizer crea come `member`/`staff`/`organizer`, e nessun percorso raggiunge `master` (ACCT-01, D-07, D-20) | **soddisfatto**, e tenuto due volte — la metà a runtime è nuova rispetto al piano. La prova osservabile è M-43-07 |
| 2 | l'account è `approved`, con `approved_via = 'admin_manual'` e un codice di membership, valido all'ingresso senza login (ACCT-02, D-08, D-09) | **costruito e typecheckato**; la metà comportamentale è M-43-01 e M-43-02, scritte e non eseguite |
| 3 | il messaggio porta un link verso la superficie del set-password, e mai una password (ACCT-03, D-10) | **soddisfatto in modo statico** — nessuna password interpolata, asserito da `grep`; il target è **asserito a runtime** invece che assunto; la conferma end-to-end è M-43-03 |
| 4 | l'atto è nel registro con autore e data, nella stessa transazione del profilo (ACCT-04, D-11) | **costruito** — un'unica `.rpc` che fa entrambe le scritture. Che la funzione esista e che gli otto nomi siano giusti è M-43-08, non un build verde |
| 5 | ogni fallimento è una parola sua sullo schermo, compreso quello in cui l'account esiste e l'invito no | **soddisfatto**, dodici cause, esaustività imposta dal compilatore |

## Esiti del threat model

| ID | Disposizione | Esito |
|---|---|---|
| T-43-11-01 organizer che posta `role: 'master'` | mitigate | **rafforzato oltre il piano**: unione chiusa *più* test a runtime; il `<select>` è dichiarato non-confine in un commento. Lo stesso buco è stato chiuso su `updateMemberRole` |
| T-43-11-02 input non fidato verso il client service-role | mitigate | gate prima della costruzione del client; indirizzo `trim`/minuscolo; ruolo contro insieme chiuso; nessun valore del chiamante nomina una riga diversa da quella creata. Uso giustificato nel commit |
| T-43-11-03 oracolo sull'esistenza di un account | mitigate | gate a master e organizer; nessun percorso non autenticato. **Nessun rate limiting esiste in questo repository** — detto, non implicito |
| T-43-11-04 una password che vive per sempre in una casella | mitigate | nessuna password generata né inviata; `type: 'recovery'`; asserzione `grep` sul template, risultato **0** |
| T-43-11-05 account creato senza traccia di chi | mitigate | `record_membership_act` nella stessa transazione della scrittura sul profilo, attore da `ctx.userId`, mai da un campo del form |
| T-43-11-06 successo parziale silenzioso | mitigate | tre cause distinte per l'invito, nessuna ingoiata, tutte con il codice di membership |
| T-43-11-07 account creato a serata iniziata, rifiutato a una porta offline | accept | **portato in copy**, non aggirato: nota fissa accanto al campo ruolo, con la risposta del runbook. M-43-02 lo mette alla prova nei due ordini |
| T-43-11-08 link d'invito inoltrato o intercettato | accept | vita e uso singolo sono di Supabase Auth; `mailer_otp_exp` misurato a 3600 in 43-04 e non modificato |
| T-43-11-SC installazioni di pacchetti | accept | **nessun pacchetto aggiunto**, `package.json` invariato |

## Threat Flags

| Flag | File | Descrizione |
|---|---|---|
| threat_flag: information-disclosure | `src/lib/email.ts` | preesistente e non modificato qui: la funzione condivisa d'invio logga l'intero oggetto d'errore del provider. Nessun percorso di questo piano gli passa un valore sensibile, ma la restrizione a `name` e `message` appartiene a chi tocca quel file |

## Self-Check: PASSED

- `src/emails/account-invitation.tsx` — FOUND
- `src/app/(admin)/admin/members/CreateAccountForm.tsx` — FOUND
- `src/app/(admin)/admin/members/actions.ts` — FOUND, modificato
- `src/app/(admin)/admin/members/page.tsx` — FOUND, modificato
- commit `7ea14f5` — FOUND
- commit `6731e90` — FOUND
- commit `90f1277` — FOUND
- i quattro file del piano 43-10 — **non toccati** (`git diff --name-only` sulla
  base elenca esattamente i quattro file dichiarati qui)
- nessun indirizzo, nessun uuid, nessun nome di persona e nessun riferimento di
  progetto compare in questo documento
