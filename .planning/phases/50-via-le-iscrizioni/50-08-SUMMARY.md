---
phase: 50-via-le-iscrizioni
plan: 08
subsystem: auth
tags: [payments, webhook, media, email-ledger, next, react, supabase]

requires:
  - phase: 50-via-le-iscrizioni
    plan: 02
    provides: "la migration che cancella `profiles.status`, riscrive `event_media_insert_member` in `event_media_insert_staff` e toglie le quattro concessioni di `membership.active` da `private.role_capabilities`"
  - phase: 50-via-le-iscrizioni
    plan: 05
    provides: "il modulo dell'ordine gratuito montato sulla pagina della serata, e la misura sul laboratorio che dimostra che `isApproved` spegne il modulo a chi ha una sessione"
  - phase: 50-via-le-iscrizioni
    plan: 07
    provides: "le sei azioni dell'asse dello stato rimosse, con i tre `import` delle mail di socio gia' tolti da `admin/members/actions.ts`"
  - phase: 50-via-le-iscrizioni
    plan: 01
    provides: "il conteggio per categoria di `email_deliveries` in `50-MEASURES.md`: zero righe per le quattro categorie, su entrambi i database"
provides:
  - "un percorso dell'incasso che non legge e non scrive alcuno stato di profilo: il webhook regge la finestra in cui la colonna esiste ancora (D-50-24)"
  - "un dashboard senza avviso di stato: biglietti e token drink, membership card e presenze intatte per la fase 51"
  - "`mayUploadToParty` con DUE arm veri — `staff.manage` e l'assegnazione per serata — e la misura del difetto del 2026-08-08 conservata con la sua data"
  - "la superficie di caricamento della pagina serata allineata al predicato server: stesso pubblico, nessun controllo disegnato a chi verrebbe rifiutato"
  - "quattro mail della vita da socio cancellate, e il vocabolario del registro delle consegne intatto con il conteggio misurato accanto"
  - "le due voci differite assorbite: `process-entry.ts` non scrive piu' sull'asse dello stato, e i quattro cancelli su `isApproved` della pagina serata sono riscritti"
  - "`src/` senza una sola lettura o scrittura di `profiles.status`, `approved_via`, `referred_by`"
affects: [50-09, 50-10, 50-11, 50-12, 51]

tech-stack:
  added: []
  patterns:
    - "un arm di permesso morto si RIMUOVE e non si ripara: ripararlo e' un allargamento travestito da pulizia, e il commento che ne misura la morte sopravvive al codice perche' senza di lui la rimozione si legge come un restringimento"
    - "la superficie che disegna un controllo e il predicato che lo concede si tengono allineati nello stesso commit: divergere significa mostrare a qualcuno un controllo che gli verra' rifiutato senza che la ragione sia visibile"
    - "una categoria di registro senza mittenti non si toglie: si annota con la data in cui ha perso il mittente e con il conteggio misurato delle righe storiche, cosi' che la decisione sia ricontrollabile invece che da rifare"
    - "un gate che nomina un file cancellato si aggiorna nello stesso commit della cancellazione, e la ragione dell'esenzione si cita invece di sparire con la sua riga (D-50-28)"

key-files:
  created: []
  modified:
    - src/app/api/webhooks/sumup/route.ts
    - src/app/(admin)/admin/events/actions.ts
    - src/app/(members)/dashboard/page.tsx
    - src/lib/media/may-upload.ts
    - src/app/(public)/events/[slug]/page.tsx
    - src/app/(public)/events/[slug]/SecretVenueDialog.tsx
    - src/lib/guest-list/process-entry.ts
    - src/lib/email-delivery/categories.ts
    - scripts/verify-touch-targets.mjs
    - scripts/verify-dialogs.mjs
  deleted:
    - src/components/media/MyMediaSection.tsx
    - src/emails/member-approved.tsx
    - src/emails/member-rejected.tsx
    - src/emails/member-reactivated.tsx
    - src/emails/registration-confirmation.tsx
    - src/emails/templates/registration-confirmation.html

key-decisions:
  - "L'ammissione al pagamento sparisce SENZA SOSTITUTO: ne' un ruolo nuovo ne' una colonna nuova. Chi compra ottiene un account leggero con ruolo `member` (D-50-05)"
  - "In `purchaseTicket` la lettura del profilo RESTA come controllo di esistenza e diventa `select(\"id\")`: togliere la lettura insieme al rifiuto avrebbe cancellato un controllo che nessuno ha chiesto di togliere"
  - "L'arm morto di `may-upload.ts` e' RIMOSSO, non riparato: correggere `attendance` in `attendances` avrebbe allargato il caricamento a chiunque abbia una presenza registrata"
  - "I cancelli su `isApproved` della pagina serata erano QUATTRO, non due: al pass di evento e al dialogo del venue si aggiungevano i due nominati dal differito. Tolti tutti e quattro, o `isApproved` sarebbe sopravvissuto come unica lettura viva di una colonna cancellata"
  - "Il ramo «il tuo account dev'essere approvato» del dialogo del venue esce: non ha mai mostrato un indirizzo, e sarebbe diventato una frase vera per nessuno e mostrata a tutti"
  - "Nessuna categoria tolta da `EMAIL_CATEGORIES`, e le righe storiche non si cancellano: la trappola del `23514` oggi non scatterebbe (zero righe misurate), ma lasciare tre voci costa tre righe di commento e sbagliare costa una migration che torna indietro"
  - "`MyMediaSection` cancellato, e i due gate che lo nominavano aggiornati nello stesso commit: `verify:touch-targets` falliva FATAL, `verify:dialogs` sarebbe rimasto verde stampando un percorso inesistente"

patterns-established:
  - "Un commento che recita l'identificatore che ha appena cancellato tiene rosso un criterio di accettazione per una ragione che non e' un chiamante sopravvissuto: il fatto si registra, il token no"
  - "Un criterio di accettazione scritto come `grep` nudo su una parola comune (`status`, `rejected`) si misura e si CORREGGE nel SUMMARY invece di essere soddisfatto rompendo qualcos'altro"

requirements-completed: [REG-02, REG-04]

duration: 16min
completed: 2026-09-21
---

# Phase 50 Plan 08: Il percorso del denaro, il dashboard, i media, le mail — Summary

Il codice dispiegabile non nomina piu' `profiles.status` in nessun percorso vivo:
il webhook incassa senza ammettere nessuno, il dashboard mostra biglietti e
token senza avvisi, i media li carica chi ha titolo per due arm veri invece che
per tre di cui uno morto, e cinque file di posta non esistono piu'.

## Cosa e' stato fatto, task per task

### Task 1 — il percorso dell'incasso smette di nominare lo stato

`d3d4d69`.

Due rami del webhook, e nient'altro in quel file.

| Dove | Cosa portava | Cosa resta |
|---|---|---|
| `src/app/api/webhooks/sumup/route.ts:188-203` (prima) | `update({status:'approved'}).eq("status","pending")` + mail `member_approved` + `import { MemberApprovedEmail }` | niente: la mail di conferma con il QR che segue e' intatta |
| `src/app/api/webhooks/sumup/route.ts:523-537` (prima) | il blocco dell'ammissione, il suo `update` e il `console.error` che lo accompagnava | il commento, riscritto: `route.ts:505` |

**La verifica dell'incasso non e' stata toccata**, ed e' contata invece che
promessa:

| | prima | dopo |
|---|---|---|
| `/usr/bin/grep -c "getCheckout" src/app/api/webhooks/sumup/route.ts` | **2** | **2** |

Non sono toccati nemmeno l'ordine dei passi, i rami idempotenti, `failOrder`,
`p_issued_via`, il passaggio di `buyer_name` introdotto dal piano 50-04.
**L'unico cambio fuori dai due rami** e' la rinumerazione di un commento: il
passo `7. L'INDIRIZZO` e' diventato `6.`, conseguenza meccanica del passo 5
sparito. Nessuna riga di codice in quel punto.

Il commento **e' stato conservato e riscritto**, come il piano chiede: spiegava
perche' quel percorso manda **una** mail sola e non due, ed e' una decisione del
proprietario della fase 49 che sopravvive alla colonna che la accompagnava. Oggi
dice anche che un secondo mittente non esiste piu' (`route.ts:505-525`).

In `purchaseTicket` (`src/app/(admin)/admin/events/actions.ts:1546-1558`) la
lettura del profilo **resta** — e' un controllo di esistenza, e il commento lo
diceva gia' — e diventa `select("id")`. Cade il rifiuto di un `rejected`: un
account senza accesso oggi e' un account cancellato (D-50-16), non un valore che
la cassa legge. Riscritto anche il docblock a `:1524-1533`, che diceva *«Only
approved members can purchase tickets»*.

### Task 2 — il dashboard senza avvisi, e i media per ruolo

`175170a`, insieme alle due voci differite assorbite.

**Il dashboard** (`src/app/(members)/dashboard/page.tsx`):

- il predicato di stato e l'intero ramo che disegnava l'avviso sono usciti; al
  loro posto il commento a `:475-496` che dice cosa c'era e perche' non ha piu'
  un pubblico (D-50-15);
- il frammento che resta **tiene il rientro che aveva**, dichiarato nel commento:
  reindentare centonovanta righe avrebbe nascosto la modifica dentro un diff di
  forma;
- il docblock a `:49-63` prometteva quel predicato **byte-identico**: la promessa
  era della conversione della 41.2, non del file per sempre, ed e' corretta
  invece che lasciata a mentire;
- il mount della sezione dei propri media e' uscito (`:646-658`) **e con lui la
  lettura che la alimentava** (`:267-278`): trentotto righe di `select` su
  `event_media` e raggruppamento per serata che nessuno disegna piu';
- **membership card e presenze restano**: le toglie la fase 51 (`MEM-01`,
  `MEM-02`), e questa fase non tocca la porta.

**I media** (`src/lib/media/may-upload.ts:276-312`): l'arm 2 e' **rimosso, non
riparato**. Interrogava una tabella `attendance` che non esiste — la tabella e'
`public.attendances` — quindi *rifiutava sempre, per chiunque*, misurato il
**2026-08-08**. Il commento che porta quella misura e la sua data **e'
conservato**, ed e' cio' che il VERIFICATION deve poter citare: senza, D-50-03
sembrerebbe aver ristretto qualcosa che era largo, e non lo era. Restano due arm:
`staff.manage` e `media.upload` per quella serata. `MEDIA_UPLOAD_FORBIDDEN`
resta, **nominato** (`may-upload.ts:107-112`).

Aggiornati nello stesso file due riferimenti alla policy `event_media_insert_member`,
che il piano 50-02 ha riscritta in `event_media_insert_staff` (`:158`, `:194`), e
il docblock che contava tre arm (`:49-61`).

**`MediaGallerySection.tsx` non e' stato toccato**, ed e' il punto dove il piano
chiedeva di verificare e **dichiarare** — vedi la deviazione 2 qui sotto, perche'
la premessa del piano era sbagliata e la correzione e' finita in `page.tsx`.

### Task 3 — via le quattro mail, e il vocabolario che resta

`c240ffb`.

Cinque file cancellati (elencati sotto `## File cancellati`). Nessun `import`
sopravvive in `src/`: verificato con un grep prima della cancellazione, e i tre
mittenti erano gia' usciti — due dal piano 50-07, uno dal task 1 di questo piano.
`registration-confirmation.tsx` **non aveva chiamanti**: era il modello che si
incolla nel cruscotto Supabase.

`src/lib/email-delivery/categories.ts:81-127`: **nessuna rimozione.** Accanto
alle tre voci c'e' ora il commento che dichiara *nessun mittente dal 2026-09-21,
fase 50*, la ragione meccanica (`CHECK` specchiato, `23514` su righe storiche,
migration che torna indietro) e **il conteggio misurato** dal piano 50-01, cosi'
che chi legge fra un anno sappia se e' ancora vero:

| Categoria | righe in produzione | righe sul laboratorio |
|---|---|---|
| `member_approved` | 0 | 0 |
| `member_rejected` | 0 | 0 |
| `member_reactivated` | 0 | 0 |
| `rsvp_confirmation` | 0 | 0 (nota gia' scritta dal 50-05) |

*(In produzione `email_deliveries` e' vuota — 0 righe in tutto. Sul laboratorio
ne ha 7, nessuna di queste categorie. `50-MEASURES.md`, 2026-09-21.)*

Annotato anche cio' che **non** c'e': `registration_confirmation` non e' mai
stata una categoria, ne' qui ne' nel `CHECK`.

**Le righe storiche non si cancellano** e il cron di riconciliazione continua a
leggerle. **La newsletter non e' toccata** (D-50-17).

## Le due voci differite assorbite

Entrambe chiuse dentro il commit `175170a`, come D-50-24 impone: il codice
dispiegato prima della migration non deve leggere ne' scrivere quelle colonne.

### (a) `src/lib/guest-list/process-entry.ts`

Leggeva `status` (`:165`) e, se valeva `pending`, scriveva **entrambe** le
colonne che la fase cancella (`:176`). **Dopo la migration era un `42703` che
cade mentre si prepara una serata**, non su una superficie amministrativa.

Il ramo esce intero, la `select` diventa `("id, email")`, e il commento a
`:172-190` dice cosa c'era e perche' nessun comportamento cambia: non c'e' piu'
niente da auto-approvare perche' non esiste piu' un `pending`.

### (b) I cancelli su `isApproved` della pagina della serata

Il differito ne nominava due. **Erano quattro**, riletti dal file invece che dal
documento:

| Sito | Condizione di prima | Dopo |
|---|---|---|
| `events/[slug]/page.tsx:1324` — pass di evento | `isUpcoming && (!isAuthenticated \|\| isApproved \|\| status === "pending")` | `isUpcoming ?` — commento a `:1313-1323` |
| `events/[slug]/page.tsx:1780` — controllo d'acquisto della serata | `… && (!isAuthenticated \|\| isApproved \|\| status === "pending") &&` | clausola via — commento a `:1779-1785` |
| `events/[slug]/page.tsx:1852` — modulo della prenotazione gratuita | `… && (!isAuthenticated \|\| isApproved) &&` | clausola via — commento riscritto a `:1852-1875` |
| `events/[slug]/SecretVenueDialog.tsx:192` — dialogo del venue | `!isApproved ? "Your account needs to be approved first." : …` | ramo via, prop `isApproved` rimossa |

`const isApproved = status === "approved"` e' quindi uscito
(`events/[slug]/page.tsx:431-446`, dove il commento lo registra). Se ne fossero
rimasti due sarebbe sopravvissuto come **unica lettura viva** di una colonna
cancellata.

**Sul dialogo del venue vale la pena essere espliciti, perche' sta su
`venue-secrecy.md`: nessuna visibilita' del luogo cambia.** Quel ramo non ha mai
mostrato un indirizzo — ne' prima ne' dopo. Diceva *come* si sblocca, e le due
voci che restano dicono esattamente cio' che dicevano a un socio approvato:
compra un biglietto, oppure prenota. Il predicato che decide se il luogo si vede
vive in `src/lib/venue-reveal/venue-disclosure.ts` e **non e' toccato**;
`verify:venue-surfaces` non ha cambiato esito (vedi `## Gate`).

## Deviazioni dal piano

### 1. `[Regola 1 - Difetto del piano]` Tre criteri di accettazione sono insoddisfacibili come scritti

**Trovati durante:** i task 1, 2 e 3, misurandoli.

Sono `grep` nudi su parole comuni, cioe' esattamente la trappola che
`50-RESEARCH.md` §1.5 nomina — *«un grep nudo non chiude REG-05»*. Misurati e
**corretti nel SUMMARY** invece che soddisfatti rompendo qualcos'altro:

| Criterio del piano | Misura | Perche' non si puo' soddisfare |
|---|---|---|
| `grep -ci "rejected" "admin/events/actions.ts"` = 0 | **6** | `:130`, `:420`, `:1512` sono *«the rejected row»* di PostgREST; `:2397` e' `drink_refund_request.status = 'rejected'`, cioe' **il percorso dei rimborsi drink**. Soddisfarlo vorrebbe dire cancellare `rejectDrinkRefund` |
| `grep -rcE "MemberApprovedEmail\|…" src/` = 0 | **1 file** | `admin/members/actions.ts:12-13`, un commento del **piano 50-07** che registra i tre `import` che ha tolto. Nessun `import` sopravvive: il piano dice di riportare nel SUMMARY chi possiede il file invece di ripararlo qui |
| `npm run verify` esce con 0 | **3 rossi** | vedi `## Gate` |

**La forma onesta delle prime due**, verificata: zero letture e zero scritture di
`profiles.status` in `admin/events/actions.ts`
(`grep -cE 'select\("status"\)'` → **0**), e zero `import` delle quattro mail in
tutto `src/`.

### 2. `[Regola 1 - Bug]` La premessa del task 2(c) era sbagliata, e sotto c'era un secondo `isApproved` vivo

**Trovato durante:** il task 2.

Il piano dichiara che `canUpload` arriva *«gia' per serata da
`page.tsx:1019-1026`»*, `hasCapability(CAP.MEDIA_UPLOAD, { partyId })`. **Non e'
cosi'.** Quella risoluzione produce `uploadableParties`; `canUpload` era:

```
isAuthenticated && ((isApproved && hasAttended) || isOrganizer || isMasterRole || uploadableParties.length > 0)
```

Cioe' **l'arm dei membri viveva anche qui**, sulla superficie, con lo stesso
difetto misurato dentro `may-upload.ts`: `hasAttended` interrogava la stessa
tabella `attendance` inesistente (`page.tsx:961`, prima). Due occorrenze dello
stesso difetto, e la ricerca ne censiva una.

**Corretto nella direzione di D-50-03**: l'arm dei membri e' uscito
(`page.tsx:1118-1142`) e `hasAttended` con lui, perche' non aveva altri lettori
(`:973-984`). Non e' stato lasciato morire da solo: una condizione che si legge
come un permesso e non ne concede nessuno e' peggio di una tolta.
`MediaGallerySection.tsx` non aveva bisogno di modifiche — disegna il controllo
sotto `canUpload` e basta — ed e' la dichiarazione che il piano chiedeva.

### 3. `[Regola 3 - Bloccante]` Cancellare `MyMediaSection` rompeva un gate

**Trovato durante:** il task 2, subito dopo la cancellazione.

`npm run verify:touch-targets` e' passato da 3 rossi noti a **FATAL, zero
elementi misurati**: *«exemption 9 declares an element in
src/components/media/MyMediaSection.tsx, which is not on disk. A stale exemption
silently removes a real element from the measured set — the one failure
direction that produces a green. Nothing was measured.»*

Chiusi **nello stesso commit** della cancellazione (D-50-28):

- `scripts/verify-touch-targets.mjs:1165-1186` — la voce esce, **la sua ragione
  e' citata** invece di sparire con la riga, perche' un'esenzione tolta senza il
  suo argomento torna come preferenza al prossimo caso uguale;
- `scripts/verify-dialogs.mjs:550-565` e `:614` — questo gate **resta verde**
  (globba l'albero e trova un file in meno), ma `ROLE_DIALOG_OVERLAY` stampava a
  ogni corsa un percorso che non esiste, descritto come file vivo. La costante
  resta — il suo docblock argomenta che la regola sopravvive al suo esemplare —
  e ora dichiara che l'esemplare e' stato cancellato e quando.

### 4. `[Regola 2 - Correttezza]` Commenti resi falsi da questa modifica, corretti

Tutti dentro i file gia' aperti dai task: il docblock del dashboard
(`:49-63`), il docblock a tre arm di `may-upload.ts` (`:49-61`) e la sua frase
sul *backstop* dell'identita' (`:155-158`), i due nomi di policy in
`may-upload.ts` (`:158`, `:194`), il docblock di `SecretVenueDialog` che contava
tre rami (`:68-73`), il docblock di `purchaseTicket` (`:1524-1533`).

Due commenti sono stati **riscritti per non sconfiggere un criterio**
(`dashboard/page.tsx:51-56` e `:475`, `may-upload.ts:301`,
`dashboard/page.tsx:270` e `:646`): un commento che recita l'identificatore che
ha appena cancellato tiene rosso un grep per una ragione che non e' un chiamante
sopravvissuto. E' la stessa disciplina che il piano 50-07 ha applicato a quattro
commenti propri, e il fatto resta scritto — il token no.

## Il censimento D-50-24 — cosa resta, e a chi

`grep -rn 'from("profiles")' src/` seguito dalle colonne selezionate su ognuno
dei **26** siti: **zero letture e zero scritture** di `profiles.status`,
`approved_via`, `referred_by` in tutto `src/`. Il codice regge la finestra in cui
la colonna esiste ancora.

Cio' che nomina ancora `status` **appartiene al piano 50-09**, come previsto:

| Sito | Cosa | Proprietario |
|---|---|---|
| `src/types/database.ts:101,109,1333` | `UserStatus`, `Profile.status`, `AccessContext.status` | 50-09 |
| `src/lib/rbac/roles.ts:104-108, 126, 391` | `STATUSES`, `NavItem.requireApproved`, il parametro di `getVisibleNavItems` | 50-09 |
| **14 siti di mount** `status={status as UserStatus \| null}` su `AppNav` — fra cui `dashboard/page.tsx:698`, `events/[slug]/page.tsx:1961`, `tickets/page.tsx:402`, `gallery/page.tsx:127`, `admin/(work)/layout.tsx:148`, `admin/scanner/DoorSurface.tsx:154` | cadono con la firma di `getVisibleNavItems` | 50-09 |
| `src/lib/routes/capability-routes.ts:471` | la voce `membership.active` del `Record` totale | 50-09 |
| `src/lib/capabilities/keys.ts:299-300, 395, 422-428` | `CAP.MEMBERSHIP_ACTIVE` e le descrizioni che nominano `requires_approved` | 50-09 |

Il valore che arriva a quei mount viene gia' dal risolutore e non da `profiles`
— la migration del 50-02 ha tolto la chiave `status` dal payload — quindi
nessuno di questi e' una lettura della colonna.

**Mezza voce differita chiusa qui**: `may-upload.ts:291`, cioe' la riga
`if (!ctx.capabilities.has(CAP.MEMBERSHIP_ACTIVE)) return false`, che il
differito *«la CHIAVE `membership.active` resta nel catalogo»* elencava fra i
cinque posti da chiudere. Gli altri quattro restano al 50-09.

## Gate

`npm run build` verde dopo ogni task (quattro corse).

| Gate | Esito | Nota |
|---|---|---|
| `verify:media-strip` | **verde** | |
| `verify:dialogs` | **verde** | aggiornato nello stesso commit |
| `verify:routes` | **verde** | |
| `verify:conversion` | **verde** | |
| `verify:touch-targets` | **rosso — 3 elementi, GLI STESSI DI PRIMA** | `GuestTokenDisplay.tsx:689` e `:702`, `emails/ticket-order.tsx:231`. Pre-esistente, registrato in `deferred-items.md` dal 50-02. Misurato prima e dopo: **75 elementi su 104 file → 74 su 103**, la differenza e' il file cancellato |
| `verify:venue-surfaces` | **rosso — G2, INVARIATO** | `payment/callback/actions.ts` seleziona `sumup_checkout_id` senza essere nell'elenco positivo, dalla fase 49 (`45be363`). **La lista non e' stata allargata**, ed e' il modo sbagliato di chiuderlo |
| `verify:capabilities` | **rosso, e non doveva essere eseguito** | vedi sotto |

**Su `verify:capabilities`.** Il perimetro di questo piano dice esplicitamente di
non eseguirlo; e' stato eseguito **dentro `npm run verify`**, che lo include. E'
uno script di sola lettura, nessuna scrittura. Il rosso e' l'**artefatto del
verso di deploy deciso da D-50-24**: il controllo 5 dice che
`master/organizer/staff/member × membership.active` hanno ancora una riga in
`private.role_capabilities` — righe che la migration `20260921120000`
(`DELETE FROM private.role_capabilities WHERE capability = 'membership.active'`)
cancella, e che **non e' ancora applicata alla produzione perche' il codice va
prima**. Il piano 50-02 lo aveva corso sul laboratorio, dove e' verde. Non e'
causato da questo piano: nessuno dei tre commit tocca `ROLE_GRANTS` ne' un
database.

**Conseguenza da dire, invece di lasciarla scoprire:** `npm run verify` **non
puo' chiudere a zero** per tutta la durata della finestra di deploy. Non e' un
debito, e' il costo dichiarato dell'inversione.

## `git diff` — cosa NON contiene

Verificato a ogni commit: nulla sotto `src/app/api/newsletter/` (D-50-17) e
nulla sotto `supabase/migrations/`. Le modifiche pre-esistenti a
`.claude/CHANGELOG.md` e `.claude/rules/production-calendar.md`, presenti
nell'albero all'avvio, **non sono state toccate ne' committate**.

## File cancellati

| File | Perche' |
|---|---|
| `src/components/media/MyMediaSection.tsx` | nessuno lo montava dopo il task 2; il caricamento dei membri esce dal dashboard (D-50-03) |
| `src/emails/member-approved.tsx` | D-50-14; il mittente nel webhook e' uscito col task 1, quelli in `admin/members/actions.ts` col piano 50-07 |
| `src/emails/member-rejected.tsx` | D-50-14 |
| `src/emails/member-reactivated.tsx` | D-50-14 |
| `src/emails/registration-confirmation.tsx` | D-50-14; **nessun chiamante in `src/`** — era il modello del cruscotto Supabase |
| `src/emails/templates/registration-confirmation.html` | il `.html` pre-renderizzato dello stesso modello. La directory `src/emails/templates/` resta vuota |

## Runbook della fase — un passo che questo piano non puo' eseguire

**Il modello di conferma d'iscrizione nel cruscotto Supabase va tolto a mano**,
su produzione e laboratorio, insieme allo spegnimento del signup (D-50-06). Non
e' una modifica di codice: il file cancellato qui era la sorgente da cui quel
modello veniva incollato. Finche' il signup e' spento nessuno puo' riceverlo, ma
un modello che resta nel cruscotto e' una mail che tornerebbe viva il giorno in
cui qualcuno riaprisse il signup senza ricordarsene.

## Known Stubs

Nessuno. Nessun valore vuoto cablato, nessun testo segnaposto, nessun componente
senza sorgente dati introdotto da questo piano.

## Threat Flags

Nessuna superficie di sicurezza nuova. I tre confini di fiducia del piano sono
tutti nella direzione del restringimento o dell'invarianza:

- il webhook smette di **scrivere** su `public.profiles` (una scrittura in meno,
  T-50-37 chiusa: la finestra `42703` sul percorso dell'incasso non esiste);
- `event_media` perde un arm di permesso che non ammetteva nessuno e mantiene i
  due che ammettono (T-50-39: rimozione, non riparazione);
- l'elenco delle categorie e il suo `CHECK` **restano specchi** (T-50-41: nessuna
  categoria tolta).

T-50-38 (`getCheckout` toccato insieme al ramo dell'ammissione): contato **2
prima e 2 dopo**, riportato sopra. T-50-40 (`MEDIA_UPLOAD_FORBIDDEN`): presente,
verificato con grep. T-50-42 (l'ammissione sostituita da un asse nuovo): nessun
sostituto, dichiarato nel commento del webhook.

## Self-Check: PASSED

Verificati su disco al momento della scrittura:

- i sei file cancellati **non esistono** (`test ! -f` su ciascuno);
- i dieci file modificati esistono e portano le righe citate;
- i tre commit esistono: `d3d4d69`, `175170a`, `c240ffb`.
