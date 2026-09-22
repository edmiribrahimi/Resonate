---
phase: 51-via-le-superfici-da-socio-e-la-porta
plan: 09
subsystem: ui
tags: [access-gating, ruoli, attendee, server-action, email, react-email]

requires:
  - phase: 51-via-le-superfici-da-socio-e-la-porta
    plan: 08
    provides: "il `CHECK` di laboratorio che ammette `attendee` e rifiuta `member` con 23514, e il catalogo a 15 chiavi"
  - phase: 51-via-le-superfici-da-socio-e-la-porta
    plan: 06
    provides: "/account al posto di /dashboard, e la grep-igiene sui nomi di tabella nei commenti"
  - phase: 51-via-le-superfici-da-socio-e-la-porta
    plan: 04
    provides: "la card socio e /api/membership/* cancellati — cioe' le superfici che la prosa di questi file ancora prometteva"
  - phase: 50-via-le-iscrizioni
    provides: "il verso del deploy dichiarato da D-50-24: il codice smette di leggere una colonna PRIMA che la migration la tolga"

provides:
  - "sei superfici di lavoro che scrivono, filtrano e contano il ruolo `attendee`, e nessuna che scriva `member`"
  - "`WritableRole` e `ROLE_RANK` sul valore nuovo — il tetto resta a tre, `master` non e' rappresentabile"
  - "zero letture di `profiles.membership_code` sotto `src/app/(admin)`, salvo la pagina del registro che e' del piano 51-11"
  - "un disambiguatore fra omonimi che non e' una credenziale: le prime 8 cifre dell'identificativo, la forma di D-51-15"
  - "`account-invitation.tsx` in inglese, con l'oggetto, e senza le tre promesse che non erano piu' vere"

affects:
  - "51-10 — porta `attendee` dentro `UserRole`, e allora il ponte a stringa in MemberTable.tsx puo' sparire"
  - "51-11 — `membership_acts` -> `account_acts`: la chiamata rpc in actions.ts e' stata lasciata INVARIATA apposta"
  - "51-12 — il `DROP COLUMN` del codice socio: questo piano e' il suo prerequisito, e la funzione SQL calcolera' `subject_label` da se'"
  - "51-15 — la porta: il commento di CreateAccountForm non descrive piu' il meccanismo dello scanner, quindi non invecchiera' con lui"

tech-stack:
  added: []
  patterns:
    - "Il VALORE di un ruolo e' un dato imposto dal `CHECK`; l'ETICHETTA e' discrezione della superficie. La distinzione e' scritta accanto a entrambe, perche' un valore sbagliato e' un 23514 a runtime e non un errore di build"
    - "Un lettore di colonna esce PRIMA del `DROP COLUMN`, mai dopo: al contrario la superficie non mostra un vuoto, riceve un 42703"
    - "Un ponte fra due piani paralleli si dichiara nel punto in cui esiste, con la condizione che lo fa sparire — un `const role: string` con scritto quale piano lo rende inutile"
    - "Una copy che descrive il meccanismo di un ALTRO file invecchia senza che nessuno se ne accorga: si riscrive sul fatto che non dipende da quel meccanismo"

key-files:
  created: []
  modified:
    - "src/components/admin/MemberTable.tsx"
    - "src/app/(admin)/admin/members/CreateAccountForm.tsx"
    - "src/app/(admin)/admin/members/actions.ts"
    - "src/app/(admin)/admin/(work)/members/page.tsx"
    - "src/app/(admin)/admin/(work)/events/[id]/assignments/page.tsx"
    - "src/app/(admin)/admin/events/[id]/assignments/AssignmentsClient.tsx"
    - "src/emails/account-invitation.tsx"

key-decisions:
  - "L'etichetta visibile e' «Attendee», la stessa parola del valore: una sola parola nelle due superfici, e nessun terzo vocabolario da imparare"
  - "`WritableRole` e `ROLE_RANK` sono entrati nel commit del task 1 invece che in quello del task 2: senza, il build si ferma sul confronto fra l'unione scritta e il valore nuovo, e il task 1 doveva uscire verde"
  - "Il ruolo si legge come `string` dentro `MemberActions` finche' il piano 51-10 non allarga `UserRole`: cio' che si puo' SCRIVERE resta chiuso in `WritableRole` e in `isWritableRole`, quindi il ponte non allenta nessun confine"
  - "Nessun sostituto applicativo per `subject_label`: lo calcola la funzione SQL (D-51-15), o sarebbero due verita' che divergono"
  - "Il campo opzionale che portava il codice dentro i fallimenti e' uscito insieme al suo unico scrittore, invece di restare vuoto: un campo che nessuno riempie e' una domanda per chi legge"

patterns-established:
  - "Grep-igiene sui commenti: il nome di una colonna in via di cancellazione non si scrive nemmeno nel commento che ne spiega l'uscita, cosi' che una ricerca per nome trovi i lettori veri"
  - "Una mail e il suo oggetto si muovono nello stesso commit: due meta' dello stesso messaggio in due lingue, anche per un solo deploy, si leggono come due mittenti"

requirements-completed: [MEM-01]

duration: ~75min
completed: 2026-09-22
---

# Fase 51 Piano 09: le superfici di lavoro parlano di `attendee` e non leggono piu' una credenziale — Riepilogo

**Sei superfici di lavoro scrivono il valore di ruolo che il `CHECK` ammette, il codice socio esce da ognuna di esse prima che la colonna cada, e chi assegna una serata distingue ancora due omonimi — con le prime 8 cifre di un identificativo, che non apre niente.**

## Performance

- **Durata:** ~75 minuti
- **Task:** 3, ognuno con il suo commit
- **File modificati:** 7
- **Verifica:** `npm run build` **exit 0** dopo ogni task (nessun test runner esiste per il prodotto — `meta-gates.md`)

## Cosa e' stato fatto

| Task | Cosa | Commit |
|---|---|---|
| 1 | La tabella dei membri e il form di creazione sul valore `attendee`, colonna del codice socio cancellata | `6aaa3f5` |
| 2 | Le azioni sui membri senza le due letture del codice, la pagina d'elenco, e la mail d'invito riscritta in inglese | `aaf5cd6` |
| 3 | Le assegnazioni, e il disambiguatore che sostituisce il codice | `3f8cb7c` |

## Il valore e l'etichetta, tenuti distinti per iscritto

Il piano chiedeva di sceglierne una e usarla in entrambe le superfici. L'etichetta
e' **«Attendee»**, uguale al valore, e la ragione e' scritta in tutti e due i
file: il valore lo impone `profiles_role_check` — **quattro valori e nessun
altro** dal piano 51-08 — mentre l'etichetta e' discrezione del prodotto. La
distinzione conta perche' i due errori hanno facce diverse: cambiare l'etichetta
non rompe niente, cambiare il valore produce un `23514` **a creazione avviata**,
quando l'utente Auth esiste gia'.

**Il rifiuto torna come valore distinto, e non e' stato costruito qui: esisteva.**
Due cause, non una, e la distinzione e' quella giusta:

- un valore che `isWritableRole` non riconosce non arriva mai al database —
  `invalid_input` con `detail: "role"`, **prima** di ogni effetto;
- un valore che passa il predicato e viene rifiutato dal vincolo —
  `constraint_refused`, dal codice `23514` letto su `error.code`.

Nessuno dei due e' un messaggio: Next redige i messaggi delle Server Action in
produzione, e questo file non ne legge nessuno.

## Il codice socio, e perche' esce adesso e non dopo

`profiles.membership_code` cade nel piano **51-12**. Se una superficie lo
leggesse ancora dopo il `DROP COLUMN`, PostgREST non restituirebbe un valore
vuoto: restituirebbe **`42703`**, cioe' il ramo d'errore di quella pagina su ogni
caricamento. E' il verso del deploy che D-50-24 ha gia' dichiarato per `status`,
applicato alla colonna successiva.

Sono uscite **sette** letture, in cinque file:

| Dove | Cosa leggeva | Cosa resta |
|---|---|---|
| `MemberTable.tsx` | la colonna «Code» col ripiego `--` | quattro colonne, nessun ripiego |
| `(work)/members/page.tsx` | la `select` e la proiezione | la `select` senza |
| `actions.ts`, `assertSubjectActionable` | il codice del soggetto, per il registro | solo il ruolo |
| `actions.ts`, `createAccount` | la rilettura del codice appena coniato | niente: l'account esiste, e la causa lo dice |
| `actions.ts`, `deleteAccount` | il codice restituito al chiamante | l'id dell'atto |
| `(work)/events/[id]/assignments/page.tsx` | il tipo e la `select` | nome, ruolo, id |
| `AssignmentsClient.tsx` | il codice accanto al nome, **due volte** | 8 cifre dell'id |

**Dove il codice era l'etichetta del soggetto verso il registro degli atti, non
e' stato sostituito qui.** La calcola la funzione SQL dal piano 51-12 (D-51-15), e
duplicarla lato applicazione avrebbe creato due modi di chiamare la stessa
persona in due posti che devono concordare. La chiamata `rpc` a
`record_membership_act` e' **invariata**: la rinomina e' del piano 51-11.

## Il disambiguatore, con il suo limite dichiarato

`AssignmentsClient.tsx` mostrava il codice socio **accanto al nome**, ed era
l'unico modo di distinguere due omonimi quando si sceglie chi lavora una serata.
Al suo posto le **prime 8 cifre dell'identificativo del profilo**, la stessa forma
che D-51-15 sceglie per il registro — o la stessa persona avrebbe due nomi brevi
in due posti, e nessuno dei due sarebbe riconoscibile.

Il limite e' **scritto accanto**, non lasciato da scoprire:

- **non e' una credenziale** — non apre niente, non ammette nessuno;
- **non e' un dato personale** — non dice ne' il nome ne' l'indirizzo;
- **non sopravvive alla cancellazione del soggetto** — il codice di prima restava
  nel registro anche dopo, questo e' un puntatore a una riga che puo' non
  esserci piu'. Serve a distinguere due presenti, mai a ricordare un assente.

**Nessuna interrogazione nuova:** l'identificativo era gia' nella riga che la
pagina seleziona, perche' e' la chiave con cui l'assegnazione si scrive.

## La mail d'invito: riscritta, non tradotta

Era l'ultimo template in italiano su tredici, e `comms-analytics.md` 1.23.0 lo
aveva lasciato li' **dichiarando perche'**: il contenuto era superato oltre la
lingua. Tre affermazioni sono uscite con la traduzione, e la terza non era nel
piano:

1. **l'invito personale** — il referral, rimosso dalla fase 50;
2. **«alla porta basta il tuo nome»** — l'ingresso per nome da una lista di soci,
   che la fase 51 sta togliendo. Prometterlo manderebbe qualcuno in fila senza
   niente in mano;
3. **«chiedi un link nuovo dalla pagina di accesso, con Password dimenticata»** —
   **quel controllo non esiste.** Verificato: `/login` non offre alcun reset, e
   `ResetPasswordButton` vive su `/account`, cioe' **dietro la password che
   questa mail serve a creare**. Una via d'uscita nominata e inesistente e'
   peggio di nessuna: la persona la cerca.

L'oggetto vive in `actions.ts` ed e' entrato nello **stesso commit**. Il
ripiego del nome era `"ciao"` ed e' diventato `"Hello"` (irraggiungibile:
`createAccount` rifiuta un nome vuoto con `invalid_input`).

Il template non contiene la `e` rovesciata — verificato con `grep`, **zero**,
nemmeno nei commenti — e non nomina alcun luogo.

## Deviazioni dal piano

### 1. [Rule 3 — Blocking] `WritableRole` e `ROLE_RANK` spostati nel task 1

- **Trovato durante:** Task 1
- **Problema:** il piano assegnava `WritableRole` al task 2, ma il task 1 deve
  uscire con `npm run build` **exit 0**. `createAccount(input: { role: WritableRole })`
  e `updateMemberRole(id, to)` ricevono il valore dalle due superfici del task 1:
  con l'unione ancora su `"member"`, il build si ferma con *«types have no overlap»*.
- **Fix:** `WritableRole` e la chiave di `ROLE_RANK` sono entrati nel commit del
  task 1, insieme ai due commenti che nominavano il valore vecchio. Le letture
  del codice socio, che erano l'altra meta' del task 2, sono restate al task 2.
- **Verifica:** `npm run build` exit 0 dopo ogni commit.
- **Commit:** `6aaa3f5`

### 2. [Rule 3 — Blocking] Il ruolo letto come stringa in `MemberActions`

- **Trovato durante:** Task 1
- **Problema:** `UserRole` in `src/types/database.ts` e' del piano **51-10**, che
  corre accanto a questo nella stessa onda. Finche' non allarga l'unione,
  `member.role === "attendee"` e' un errore di build su un confronto che a
  runtime e' **giusto** — il valore arriva da `profiles.role`, non dal file.
- **Fix:** un `const role: string = member.role` dentro `MemberActions`, con
  accanto la condizione che lo rende inutile (l'unione allargata dal 51-10). Cio'
  che si puo' **scrivere** resta chiuso altrove — `WritableRole` nella sorgente,
  `isWritableRole` contro il filo — quindi il ponte non allenta nessun confine
  d'accesso.
- **Dipendenza da dichiarare:** quando il piano 51-10 sara' unito, quella riga
  puo' sparire e i quattro confronti tornare sull'unione.
- **Commit:** `6aaa3f5`

### 3. [Rule 1 — Bug] Prosa d'interfaccia che descriveva superfici cancellate

- **Trovato durante:** Task 1 e Task 2
- **Problema:** copy **visibile all'operatore**, non commenti, che descriveva
  cose non piu' vere. La conferma di cancellazione prometteva *«their membership
  card stops working at the door»* (la card e' uscita col piano 51-04) e
  *«the row keeps the membership code»* (esce col 51-12); la legenda dello staff
  diceva *«free entry through the membership card»*; tre notifiche di
  `CreateAccountForm` dicevano *«the account works at the door with the code
  below»*; una diceva *«a staff role must belong to an approved account»*,
  vincolo caduto con la fase 50; due indirizzavano a un reset password che non
  esiste; il complemento del nome diceva *«the door shows it»*, contro D-51-05.
- **Fix:** riscritte sul fatto che non dipende dal meccanismo in movimento. La
  riga del registro *«keeps a short identifier of the account»* e' vera sia
  prima sia dopo il 51-12, apposta. Il suggerimento sul ruolo non nomina piu' ne'
  la credenziale ne' il ramo offline dello scanner — che e' del piano 51-15 — ma
  solo il fatto strutturale: un telefono gia' offline lavora sulla lista che ha
  scaricato.
- **Verifica:** `npm run build` exit 0; nessun riferimento residuo alle due
  superfici cancellate nei file toccati.
- **Commit:** `6aaa3f5`, `aaf5cd6`

---

**Totale deviazioni:** 3 auto-fix (2 blocking, 1 bug).
**Impatto:** nessuno scostamento di perimetro — i file sono i sette del piano.
Le due deviazioni blocking sono conseguenze dell'ordine delle onde, la terza e'
copy falsa dentro i file che il piano assegna.

## Cosa NON e' stato toccato, di proposito

- **`src/types/database.ts`, `src/lib/rbac/roles.ts`, `src/lib/supabase/middleware.ts`** — piano 51-10, in corso nella stessa onda.
- **`src/app/(admin)/admin/(work)/members/register/page.tsx`** — due letture del codice socio restano li': e' la pagina del registro, ed e' del piano **51-11**. La verifica del piano la esclude per nome.
- **La chiamata `rpc("record_membership_act", …)`** — invariata, per lo stesso motivo.
- **`ScannerClient.tsx`** — piano 51-15.

## Verifiche eseguite

| Verifica | Esito |
|---|---|
| `npm run build` (typecheck di Next incluso) | **exit 0**, dopo ognuno dei tre task |
| `grep -c '"member"'` su `MemberTable.tsx` e `CreateAccountForm.tsx` | **0** su entrambi |
| `grep -c "membership_code"` su `MemberTable.tsx` | **0** (anche nei commenti) |
| `grep -c "membership_code"` su `actions.ts` e `(work)/members/page.tsx` | **0** su entrambi |
| `grep -c "membership_code"` sui due file delle assegnazioni | **0** su entrambi |
| `grep -rn "membership_code" "src/app/(admin)"` | **2 righe**, entrambe in `register/page.tsx` — il piano 51-11 |
| `grep` per la `e` rovesciata in `account-invitation.tsx` | **0** |
| `npm run verify:conversion` | `CONVERSION_OK` |
| `npm run verify:tables` | `TABLES_OK` |
| `npm run verify:dialogs` | verde |
| `npm run verify:routes` | `PASS`, exit 0 |
| `npm run verify:semantic-separation` | `SEMANTIC_SEPARATION_OK` |
| `npm run verify:comment-stripper` | `COMMENT_STRIPPER_OK` |

**Le verifiche che parlano con un database non sono state eseguite** — nessuna
scrittura, nessuna lettura, ne' sul laboratorio ne' sulla produzione: questo
piano non tocca lo schema, e i rossi dichiarati contro la produzione restano
fino al piano 51-13.

## Debito differito, trovato e non toccato

**`npm run verify:touch-targets` e' ROSSO, e lo era gia'.** Tre elementi non
dichiarano il minimo di 44px:

- `src/app/(public)/events/[slug]/menu/GuestTokenDisplay.tsx:689` e `:702`
- `src/emails/ticket-order.tsx:270`

**Misurato che il rosso precede questo piano**: rimettendo `account-invitation.tsx`
alla versione del commit di base il gate fallisce **sugli stessi tre elementi**.
Nessuno dei tre e' in un file di questo piano, e `account-invitation.tsx` compare
nella tabella del gate con **un elemento e zero violazioni** — il pulsante
riscritto passa. Fuori perimetro (`SCOPE BOUNDARY`): registrato qui invece che in
`deferred-items.md` perche' quel file e' condiviso con gli altri esecutori
dell'onda e un'aggiunta in coda produrrebbe un conflitto al merge.

## Note per chi viene dopo

- **51-10**: appena `UserRole` include `attendee`, il `const role: string` in
  `MemberActions` (`MemberTable.tsx`) puo' sparire e i quattro confronti tornare
  sull'unione. E' l'unico punto di questo piano che aspetta quel piano.
- **51-12**: nessuna superficie di lavoro interroga piu' la colonna. Resta la
  pagina del registro, del 51-11, che va tolta **prima** del `DROP COLUMN`.
- **51-11**: `DeleteAccountData` non porta piu' un'etichetta del soggetto, e
  `assertSubjectActionable` restituisce il solo ruolo. Il registro se la calcola.

## Self-Check: PASSED

I sette file dichiarati esistono sul disco, e i tre commit esistono nella
history del worktree (`6aaa3f5`, `aaf5cd6`, `3f8cb7c`, in coda a `0490d4a`).

---
*Fase: 51-via-le-superfici-da-socio-e-la-porta*
*Completato: 2026-09-22*
