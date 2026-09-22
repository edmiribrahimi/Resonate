---
phase: 51-via-le-superfici-da-socio-e-la-porta
plan: 10
subsystem: auth
tags: [typescript, rbac, middleware, supabase, lexicon, postgrest-redaction]

requires:
  - phase: 51-06
    provides: "`/dashboard` diventa `/account`, e i due letterali `\"member\"` lasciati nella pagina spostata"
  - phase: 51-08
    provides: "il `CHECK` `profiles_role_check` con `attendee` gia' applicato al laboratorio, e la segnalazione D-51-08-C sul middleware"
provides:
  - "`UserRole` a quattro valori, il quarto `attendee` (D-51-06)"
  - "`Profile` senza il codice socio (D-51-02)"
  - "`ROLES.ATTENDEE` al posto di `ROLES.MEMBER`"
  - "le risoluzioni di ripiego del middleware rinominate senza allargare un solo permesso"
  - "una parola sola — `Attendee` — su cinque ripieghi testuali dentro tre mail"
  - "i commenti che descrivevano il codice socio come credenziale viva corretti in cinque file"
affects: [51-11, 51-12, 51-13, 57]

tech-stack:
  added: []
  patterns:
    - "Lo specchio dichiarato: `UserRole` e `profiles_role_check` si muovono insieme, e il tipo lo scrive accanto a se'"
    - "Un nome rimosso non si ricopia nella prosa che ne registra la rimozione, o il grep che prova la cancellazione resta rosso per un commento"

key-files:
  created:
    - .planning/phases/51-via-le-superfici-da-socio-e-la-porta/51-10-SUMMARY.md
  modified:
    - src/types/database.ts
    - src/lib/rbac/roles.ts
    - src/lib/supabase/middleware.ts
    - src/app/(members)/account/page.tsx
    - src/app/(public)/tickets/refund-actions.ts
    - src/app/api/webhooks/sumup/route.ts
    - src/app/api/cron/event-reminders/route.ts
    - src/lib/errors/redact.ts
    - src/lib/failure/money-path.ts
    - src/lib/tickets/guest-identity.ts
    - src/app/api/tickets/attendance/route.ts
    - src/app/(public)/events/[slug]/page.tsx

key-decisions:
  - "La parola scelta per i ripieghi verso una persona e' `Attendee`, la stessa del ruolo: vera sia per chi compra sia per chi e' invitato, e una sola su tutti i siti"
  - "La riga di log del percorso degradato del middleware non scrive `attendee`: dice l'insieme di capacita' VUOTO, che e' cio' che il codice fa davvero"
  - "`membership_code` esce da `database.ts` con zero occorrenze residue, non una: il tipo del registro non porta l'identificatore, solo la prosa `membership code`"
  - "Il sesto ripiego `\"Member\"` (`src/lib/venue-reveal/reveal-party-venue.ts:567`) NON e' stato toccato: fuori perimetro, codice venue-secrecy"

patterns-established:
  - "Un commento che cita un precedente cancellato si tiene per la REGOLA che ha fissato, dichiarando che il codice citato non esiste piu'"
  - "Quando un vincolo perde la ragione che lo reggeva, il commento dichiara che la ragione superstite e' piu' debole invece di tacere"

requirements-completed: [MEM-01]

duration: 12min
completed: 2026-09-22
---

# Fase 51 Piano 10: il quarto ruolo si chiama `attendee` — Riepilogo

**Il tipo, la costante, le risoluzioni di ripiego del middleware, la pagina
dell'account e cinque ripieghi testuali dentro le mail smettono di dire
«member»; i commenti che descrivevano il codice socio come una credenziale viva
dichiarano che non lo e' piu'.**

## Performance

- **Duration:** 12 min (primo commit 17:17, ultimo 17:21 locale; installazione
  dipendenze e verifiche incluse)
- **Tasks:** 3 su 3
- **Files modified:** 12

## Task Commits

1. **Task 1: il tipo, la costante e le risoluzioni di ripiego** — `5e3461e` (refactor)
2. **Task 2: la pagina dell'account smette di leggere il codice socio** — `9d69c40` (refactor)
3. **Task 3: il lessico verso le persone e i commenti datati** — `644f2c5` (refactor)

## Accomplishments

- `UserRole = "master" | "organizer" | "staff" | "attendee"`
  (`src/types/database.ts:99`), con accanto la ragione d'ordine: il vincolo
  `profiles_role_check` dichiara di rispecchiare questo tipo, la faccia SQL e'
  gia' passata col piano 51-08, e il verso del deploy e' **codice prima,
  migration subito dopo** (51-13).
- `Profile` non dichiara piu' il codice socio. **Occorrenze di
  `membership_code` in `database.ts`: 0.**
- `ROLES.MEMBER` → `ROLES.ATTENDEE` (`src/lib/rbac/roles.ts:109`). Zero
  consumatori misurati prima e dopo (`grep -rn 'ROLES.MEMBER' src scripts` →
  vuoto).
- Middleware: quattro paragrafi e la riga di log del percorso degradato non
  nominano piu' due assi che non esistono (uno cancellato nella fase 50, uno
  rinominato qui). **Nessuna decisione di capability nel diff.**
- Pagina account: `membership_code` fuori dalla `select`, i due letterali ad
  `attendee`, e il lessico visibile fuori da «Member».
- Cinque ripieghi `|| "Member"` → `|| "Attendee"` dentro tre percorsi (rimborso,
  webhook dei pagamenti, cron dei promemoria).
- Cinque commenti che descrivevano il codice socio come credenziale viva:
  corretti conservando la regola.

## I percorsi di denaro: nessun cambio di comportamento, provato dal diff

Il commit `644f2c5` tocca i tre percorsi di denaro in **cinque righe, una per
sito**, e ogni riga cambia **un solo token**. Le intestazioni degli hunk
(`git diff HEAD~1 HEAD --unified=0`) sono queste, e non ce ne sono altre su
quei file:

| File | Hunk | Riga |
|---|---|---|
| `src/app/(public)/tickets/refund-actions.ts` | `@@ -376 +376 @@ approveRefund` | `memberName: requesterProfile.full_name \|\| "Attendee",` |
| `src/app/(public)/tickets/refund-actions.ts` | `@@ -467 +467 @@ rejectRefund` | idem |
| `src/app/api/webhooks/sumup/route.ts` | `@@ -239 +239 @@ POST` | `memberName: profile.full_name \|\| "Attendee",` |
| `src/app/api/cron/event-reminders/route.ts` | `@@ -175 +175 @@ GET` | `name: profile.full_name \|\| "Attendee",` |
| `src/app/api/cron/event-reminders/route.ts` | `@@ -188 +188 @@ GET` | idem |

`-1 +1` su ogni hunk: nessuna riga aggiunta, nessuna tolta, nessun ramo
spostato. In particolare:

- **La regola del webhook non si allenta**: *«ALWAYS verify via GET checkout API
  (never trust webhook body for status)»* e l'idempotenza su entrambi i rami
  **non compaiono nel diff** — nessuna delle righe che le implementano e' stata
  letta come modificata da git.
- **Il nome della prop resta `memberName`**: rinominarla avrebbe aperto i
  componenti mail (`src/emails/**`), che non sono nei miei `files_modified`.
  E' una divergenza lessicale residua, dichiarata sotto.
- Nessuna policy RLS toccata da questo piano, su nessun file.

## Il segreto del venue: un diff di soli commenti, con i numeri

`src/app/(public)/events/[slug]/page.tsx` ha **un solo hunk**:

```
@@ -329,2 +329,4 @@ const EVENT_PAGE_REFUSAL: Record<EventPageRefusal, string> = {
```

Sei righe cambiate in tutto (`grep -cE '^[+-][^+-]'` sul diff → **6**), tutte
dentro il docblock che spiega perche' `logMoneyPathFailure` non riceve l'oggetto
d'errore intero. Un `grep -iE '^[+-].*(venue|secret|reveal|if |return)'` sullo
stesso diff **non trova nulla**: nessuna condizione attorno all'indirizzo,
nessuna attorno a `venue_secret`, nessuna attorno a `venue_reveal_sent` e'
stata spostata, allargata o anticipata. La guardia monotona resta esattamente
dove stava.

## Deviations from Plan

### 1. [Rule 1 — premessa falsa] La verifica automatica del Task 1 chiedeva `membership_code` **una** volta in `database.ts`

- **Found during:** Task 1
- **Issue:** il piano asserisce
  `test $(grep -c "membership_code" src/types/database.ts) -eq 1`, attribuendo
  l'occorrenza residua «al tipo di riga del registro, che muove il piano
  51-11». Misurato: nel file c'era **una sola** occorrenza,
  `Profile.membership_code:114`, ed e' quella che il task doveva togliere.
  `MembershipActRow` parla di *«membership code»* in prosa (`:938`, `:946`,
  `:1109`), mai dell'identificatore. La verifica sarebbe stata verde solo
  ricopiando il nome in un commento — cioe' facendo l'opposto della regola che
  `roles.ts` scrive accanto alla rimozione della fase 50: *«il suo nome non si
  ricopia, o il grep che prova la cancellazione resta rosso per una prosa»*.
- **Fix:** rimossa l'occorrenza, prosa scritta **senza** ricopiare
  l'identificatore. Il conteggio e' **0**, che soddisfa l'acceptance criterion
  («l'unica occorrenza residua **ammessa**…» — ammessa, non richiesta) ed e'
  piu' stretto della verifica automatica.
- **Verification:** `grep -c 'membership_code' src/types/database.ts` → `0`
- **Committed in:** `5e3461e`

### 2. [Rule 1 — prosa che descrive un meccanismo morto] `ROLES.STAFF`, `src/lib/rbac/roles.ts`

- **Found during:** Task 1
- **Issue:** il commento sopra la costante che stavo modificando prometteva che
  `staff` *«grants exactly one thing — entry to a night through the membership
  card, permanently»*. La card, la pagina che la mostrava e la rotta che la
  confrontava sono uscite coi piani 51-04 e 51-05: la frase descriveva una
  porta che non si apre piu'.
- **Fix:** la promessa e' stata **cancellata**, non corretta, e al suo posto sta
  una riga che dice quando e perche' e' caduta. Cio' che resta vero — `staff`
  non porta permessi di lavoro, quelli vengono dall'assegnazione per serata —
  e' intatto.
- **Committed in:** `5e3461e`

### 3. [Rule 1 — log che descrive uno stato che non esiste] riga di log del middleware

- **Found during:** Task 1
- **Issue:** `[capabilities.resolve_failed]` scriveva *«Failing closed to
  member/pending with no capabilities»*. `pending` non esiste dalla fase 50,
  `member` non esiste da qui, e il codice **non risolve piu' alcun ruolo di
  ripiego**: fallisce chiuso con l'insieme di capacita' vuoto.
- **Fix:** la riga dice ora *«Failing closed to the empty capability set»*.
  **Non** scrive `attendee`, che riaffermerebbe un default di ruolo che il
  codice non ha piu'. La **categoria** dell'errore (`[capabilities.resolve_failed]`)
  e' intatta, quindi il gate *zero fallimenti silenziosi* non si muove: cambia
  la frase, non la distinguibilita'.
- **Committed in:** `5e3461e`

### 4. [Rule 1 — D-51-08-C, consegnato a me dall'onda 2] `middleware.ts:683`

- **Found during:** Task 1
- **Issue:** il paragrafo sulla mappa route↔capability diceva *«`/membership-card`
  e `/attendance` SONO nella mappa»*. Falso dal piano 51-04 (pagine cancellate)
  e dal 51-08 (voci uscite). Nello stesso elenco compariva `/dashboard`, che il
  piano 51-06 ha sostituito con `/account`.
- **Fix:** l'esempio e' stato **cancellato** e sostituito da due frasi che dicono
  cosa e' successo: le pagine sono state eliminate, quindi le voci sono uscite
  con loro, e **non** perche' il giudizio sia cambiato. `/dashboard` → `/account`
  nell'elenco degli indirizzi che la mappa non giudica (ed e' ancora vero: il
  nuovo indirizzo non ci sta, come il vecchio).
- **Committed in:** `5e3461e`

### 5. [Rule 1 — lessico visibile incoerente] «Member since» sulla pagina account

- **Found during:** Task 2
- **Issue:** il piano elenca tre siti nella pagina (la `select`, i due letterali)
  piu' «il ripiego del nome visibile». Con quelli sistemati, l'intestazione
  avrebbe mostrato il badge **Attendee** sopra la riga **«Member since March
  2026»**: due parole per la stessa persona sulla stessa schermata, che e'
  esattamente la divergenza che il piano vieta al Task 3.
- **Fix:** la riga dice «Attendee since», e la variabile locale che la alimenta
  e' stata rinominata di conseguenza. Nessun dato diverso: e' sempre
  `profile.created_at`.
- **Committed in:** `9d69c40`

### 6. [Rule 1 — commento che cita una rotta cancellata] `attendance/route.ts`

- **Found during:** Task 3
- **Issue:** il paragrafo che giustifica il rifiuto falso alla porta citava
  `membership/list/route.ts:45-52` come precedente vivo. Quella rotta e' uscita
  col piano 51-04.
- **Fix:** la **citazione resta**, perche' la regola che fissa — *«adding a
  status test would create a NEW way to refuse somebody at the door»* — e'
  sopravvissuta al codice che l'ha applicata per primo. Il commento dichiara ora
  che rotta e credenziale non esistono piu'. **Non ho toccato nulla della
  semantica di `already_recorded` ne' dell'union `DoorSubjectType`**, come il
  prompt d'onda chiedeva.
- **Committed in:** `644f2c5`

---

**Total deviations:** 6 auto-fixed (6× Rule 1). Tutte e sei sono correzioni di
**prosa o di lessico visibile** su righe adiacenti a quelle che il piano mi
chiedeva di toccare; nessuna cambia un ramo, un permesso o una query. Nessuno
scope creep: zero file fuori dai `files_modified` del piano.

## Issues Encountered

### `npm run build` esce 1 — per il file di un altro esecutore della stessa onda

`npm run build` **non e' verde in questo worktree**, e va detto per intero
invece che aggirato.

```
./src/components/admin/MemberTable.tsx:453:8
Type error: This comparison appears to be unintentional because the types
'"organizer" | "staff" | "attendee"' and '"member"' have no overlap.
```

`npx tsc --noEmit -p tsconfig.json` riporta **quell'errore e nessun altro**:
tsc elenca tutti gli errori, non si ferma al primo, quindi la misura e'
completa. I dodici file di questo piano sono puliti.

`MemberTable.tsx` e' nei `files_modified` del **piano 51-09**, che gira in
parallelo in questa stessa onda. E' la conseguenza attesa dello split: **io
stringo il tipo, loro spostano i consumatori**, e i due lati non possono essere
verdi nello stesso worktree. Gli altri letterali misurati — tutti di 51-09 —
non danno errore solo perche' vivono dentro union locali:

| Sito | Perche' non e' rosso oggi |
|---|---|
| `src/app/(admin)/admin/members/actions.ts:965` | `type WritableRole` e' un'union locale, non derivata da `UserRole` |
| `src/app/(admin)/admin/members/CreateAccountForm.tsx:165,182,199` | `RoleValue` locale |
| `src/components/admin/MemberTable.tsx:405,481,501,742` | parametro e `<option>` con union locale |

**Non ho toccato nessuno di quei file**, come il prompt d'onda impone. Il verde
va misurato **dopo il merge di 51-09**, e finche' quel merge non c'e' un rosso
su `MemberTable.tsx:453` e' il segnale corretto, non una regressione.

### `npm run verify`

`VERIFY_FAIL — 2: verify:venue-surfaces, verify:touch-targets` — **esattamente i
due rossi preesistenti dichiarati nel prompt d'onda**, e su siti che il mio diff
non tocca:

- `verify:venue-surfaces` → una sola asserzione, `G2
  src/app/(public)/payment/callback/actions.ts`. Non ho allargato alcuna
  allow-list.
- `verify:touch-targets` → tre elementi:
  `GuestTokenDisplay.tsx:689`, `GuestTokenDisplay.tsx:702`, `ticket-order.tsx:270`.

Piu' **due rifiutati** (`verify:capabilities`, `verify:section-export`), che
escono con 2 perche' un worktree non ha `.env.local`: **non hanno misurato
nulla, e un rifiuto non e' un verde**. Lo stesso vale per la parte credenziata
di `verify:routes`.

## Debito dichiarato, e chi lo deve raccogliere

1. **Un SESTO ripiego `|| "Member"` esiste, e non l'ho toccato:**
   `src/lib/venue-reveal/reveal-party-venue.ts:567` — `name: fullName || "Member"`,
   dentro la mail di rivelazione del venue. **Non e' nei miei `files_modified`**
   ed e' codice venue-secrecy (Critical). Il piano parlava di cinque siti; sono
   sei, e finche' il sesto non si muove la fase spedisce cinque «Attendee» e un
   «Member» per la stessa situazione — la divergenza che il Task 3 vieta. **Va
   preso da chi apre quel file**, con la stessa parola.
2. **Il nome della prop delle mail resta `memberName`**
   (`RefundApprovedEmail`, `RefundRejectedEmail`, `TicketConfirmationEmail`).
   Rinominarla tocca `src/emails/**`, fuori perimetro.
3. **`Member since` non e' l'unico residuo di prosa**: `src/app/(admin)/**` e i
   componenti admin parlano ancora di «member» nell'interfaccia (colonna,
   etichette, `<option>`), ed e' territorio del piano 51-09.
4. **Riaperto, esplicitamente, in `guest-identity.ts`:** il vincolo *«nessun
   account nasce senza un pagamento verificato»* poggiava su due ragioni, e una
   e' caduta con la credenziale della porta. Il commento lo **dichiara** invece
   di tacerlo: chi un giorno volesse spostare il conio all'avvio del checkout non
   trovera' piu' una porta a fermarlo, e dovra' decidere sul dato personale.
   Vale `legal-compliance.md`, gate *i dati dei soci non sono i dati del
   prodotto*.
5. **Segnalazioni dell'onda 2 che restano di nessuno** (verificate, non toccate,
   perche' fuori dai miei `files_modified`):
   - `src/app/(auth)/set-password/SetPasswordForm.tsx:343` — punta ancora al
     vecchio indirizzo e riceve un 308.
   - `src/lib/routes/organizer-redirects.ts:41` — docblock datato.

## Note per il piano 51-13

Il verso del deploy dichiarato dal piano 51-08 **e' quello che questo codice
pretende**: la migration che porta `attendee` nel `CHECK` di produzione deve
arrivare **subito dopo** il codice, e nella finestra fra i due un profilo scritto
con il nome nuovo verrebbe rifiutato con `23514`. Nel laboratorio la migration
c'e' gia'.

## Threat Flags

Nessuna nuova superficie di sicurezza introdotta: il diff non aggiunge endpoint,
non aggiunge percorsi d'autenticazione, non tocca policy RLS e non apre accessi
a file. `T-51-42` (elevation of privilege sul ripiego del middleware) e'
mitigato per costruzione — il ripiego cambia nome e la decisione resta
l'insieme vuoto — e `T-51-44` (redazione) conserva la regola cambiando solo
l'esempio.

## Next Phase Readiness

- **51-09** deve mergiare perche' `npm run build` torni verde: e' l'unico
  ostacolo misurato.
- **51-11** trova `database.ts` senza l'identificatore del codice socio; il tipo
  del registro e' intatto.
- **51-12** trova zero letture della colonna sulla pagina dell'account.
- **51-13** e' l'atto che allinea la produzione al tipo scritto qui.

## Self-Check: PASSED

- **Dodici file dichiarati come modificati** — tutti presenti (`test -f` su
  ognuno, dodici `FOUND`).
- **Tre commit dichiarati** — tutti in `git log`: `5e3461e`, `9d69c40`,
  `644f2c5`.
- **Nessuna cancellazione di file** in nessuno dei tre commit
  (`git diff --diff-filter=D --name-only HEAD~1 HEAD` vuoto su tutti e tre).
- **Nessun file non tracciato** lasciato indietro (`git status --short` pulito
  dopo l'ultimo commit; gli script monouso stanno nello scratchpad, fuori dal
  repository, perche' `.planning/` e' pubblico).
- `STATE.md`, `ROADMAP.md` e `.claude/**` **non compaiono in nessun diff**.

---
*Phase: 51-via-le-superfici-da-socio-e-la-porta*
*Completed: 2026-09-22*
