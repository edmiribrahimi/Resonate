---
phase: 50-via-le-iscrizioni
plan: 07
subsystem: auth
tags: [server-actions, supabase, rbac, membership-register, next, react]

requires:
  - phase: 50-via-le-iscrizioni
    plan: 02
    provides: "la migration applicata al laboratorio (`status`, `referred_by`, `approved_via` via), il `CHECK` degli atti allargato a dieci con `deleted`, `record_membership_act` che conserva `p_status` accettato e ignorato"
  - phase: 50-via-le-iscrizioni
    plan: 01
    provides: "le undici famiglie di vincoli bloccanti rilette dal catalogo in `50-MEASURES.md` M10 — tre in piu' di quelle che `50-RESEARCH.md` §4.1 elencava"
provides:
  - "`deleteAccount`: l'unica via per togliere l'accesso, che misura tredici insiemi di tracce PRIMA e rifiuta con dodici codici distinti (i due dei rimborsi ne condividono uno) e una frase che dice quali e con quanti elementi"
  - "la riga di registro `act = 'deleted'` scritta PRIMA della cancellazione, con `subject_label` = il codice di membership"
  - "le sei azioni dell'asse dello stato rimosse dal codice e dalla superficie, con le tre mail che ne dipendevano"
  - "la pagina membri ridotta a una lista di account: ruolo, codice, data, «crea account», «cancella account»"
  - "il referral sparito da ogni superficie di `src/`, e la pagina che lo misurava cancellata con la sua riga nella mappa delle rotte"
  - "`MembershipAct` con `deleted`: la meta' TypeScript del `CHECK` allargato dal 50-02"
affects: [50-08, 50-09, 50-11, 50-12, 51, 52]

tech-stack:
  added: []
  patterns:
    - "un'azione distruttiva censisce gli insiemi che la bloccano PRIMA di toccare qualunque cosa, e conserva la traduzione del `23503` come rete: il conteggio dice quali e quanti, l'errore residuo dice che qualcosa e' comparso dopo"
    - "un vocabolario di fallimento per azione (`DeleteAccountFailure` accanto a `CreateAccountFailure`), unito nel `Record` esaustivo del componente che disegna le frasi: aggiungere una causa senza una frase e' un errore di build"
    - "la riga di registro di un atto irreversibile si scrive PRIMA dell'atto: il verso sbagliato lascia una cancellazione senza traccia, e il verso giusto al massimo una traccia in piu' — che si legge"

key-files:
  created: []
  modified:
    - src/app/(admin)/admin/members/actions.ts
    - src/components/admin/MemberTable.tsx
    - src/app/(admin)/admin/(work)/members/page.tsx
    - src/app/(admin)/admin/members/MemberActionNotice.tsx
    - src/lib/membership/acts.ts
    - src/app/(admin)/admin/(work)/members/register/page.tsx
    - src/lib/routes/capability-routes.ts
    - src/app/(members)/membership-card/page.tsx
    - src/app/(members)/membership-card/loading.tsx
    - src/app/(members)/dashboard/page.tsx
    - src/lib/analytics/cross-event-queries.ts
    - scripts/conversion-manifest.mjs

key-decisions:
  - "Gli insiemi che bloccano la cancellazione sono TREDICI e non otto: gli undici del catalogo (`50-MEASURES.md` M10), piu' i biglietti e le assegnazioni RICEVUTE, che cascherebbero in silenzio"
  - "`party_assignments.user_id` e' CASCADE e blocca lo stesso: cancellare un account porterebbe via le righe che dicono chi era assegnato quando ha scansionato — stessa strada dei biglietti, si rifiuta invece di allargare la cascata"
  - "Task 1 e task 2 sono un commit solo: fra i due l'albero e' rosso, perche' MemberTable importa le azioni che il task 1 cancella e chiama la funzione che il task 1 crea"
  - "`DeleteAccountFailure` e' un'unione separata da `MemberActFailure`: metterci dentro dodici cause che `updateMemberRole` non puo' produrre sarebbe un'unione che promette cause irraggiungibili"
  - "`approved`, `rejected`, `deactivated` e `reactivated` RESTANO in `MembershipAct` e nessuno li scrive piu': il registro e' append-only e un'unione che non sa nominare una riga esistente rende illeggibile la storia"
  - "Quattro commenti che contenevano la stringa cercata da un criterio sono stati riscritti: un commento che sconfigge un grep e' un criterio che nessuno puo' eseguire (lezione registrata dal piano 34-03)"

patterns-established:
  - "Una causa gestita ma irraggiungibile si CANCELLA: `act_underivable`, `self_approve`, `self_reject`, `self_deactivate`, `self_reactivate`, `readmission_before_role_change`, `status_unchanged`, `no_subjects_selected` sono uscite con l'asse che nominavano"
  - "Un elenco nominale dentro una misura datata si toglie invece di correggerlo a ogni cancellazione: restano il numero, la data e la fonte"

requirements-completed: [REG-02, REG-03, REG-04]

duration: 25min
completed: 2026-09-21
---

# Phase 50 Plan 07: Un asse solo, e un'azione che puo' dire di no Summary

**Le sei azioni dell'asse dello stato non esistono piu'; al loro posto `deleteAccount` censisce tredici insiemi di tracce prima di toccare qualunque cosa, rifiuta con dodici codici distinti e una frase che dice quali insiemi hanno bloccato e con quanti elementi, scrive la riga di registro PRIMA della cancellazione e cancella l'utente Auth lasciando cascare il profilo. Il referral non esiste piu' in nessuna superficie di `src/`.**

## Performance

- **Duration:** ~25 min
- **Started:** 2026-09-21T13:03Z (circa)
- **Completed:** 2026-09-21T13:28Z
- **Tasks:** 3 su 3 (i primi due in un commit solo)
- **Files modified:** 20 (12 modificati, 6 cancellati, 2 documenti di pianificazione)

## Task Commits

1. **Task 1 + Task 2 fusi: le sei azioni via, `deleteAccount` dentro, la pagina ridotta** — `ee0669a` (feat)
2. **Task 3: via il referral e la pagina che lo misurava** — `c8e11d1` (feat)
3. **Quattro commenti che sconfiggevano i criteri, due che erano diventati falsi** — `c926804` (fix)
4. **Il manifesto della conversione nominava una pagina che non c'e' piu'** — `a1c1b8c` (fix)

> **Perche' i task 1 e 2 sono un commit solo.** E' la stessa ragione del
> `219e273` del 50-02. `MemberTable.tsx` importa le sei azioni che il task 1
> cancella e chiama `deleteAccount`, che il task 1 crea: qualunque ordine si
> scelga, fra i due commit l'albero non compila. Un commit.

## Accomplishments

### `deleteAccount` — il censimento, il rifiuto, la traccia

`src/app/(admin)/admin/members/actions.ts:2041` — `export async function deleteAccount`.

La sequenza, in ordine, e l'ordine e' la parte che conta:

| # | Cosa | Dove |
|---|---|---|
| 1 | guardia `verifyAdminOrOrganizer` (`staff.manage`), la stessa degli altri atti | `:2045-2046` |
| 2 | **una** lettura del soggetto: ruolo (regola 1) e codice di membership | `:2053-2058`, via `assertSubjectActionable` a `:901-943` |
| 3 | censimento di **tredici** insiemi, prima di toccare qualunque cosa | `:2074` → `censusBlockingSets` a `:1931-1958` |
| 4 | **riga di registro**, `act: "deleted"` | `:2098-2102` |
| 5 | `auth.admin.deleteUser`, profilo per cascata | `:2113-2114` |
| 6 | il `23503` residuo tradotto nella sua causa | `:2116-2143` |

**Il codice di membership si legge al passo 2 e non dopo**, perche' dopo non
c'e' piu' una riga da cui leggerlo (`:922`, `select("role, membership_code")`).

**La riga di registro sta PRIMA della cancellazione**, e il prezzo e' dichiarato
nel docblock a `:2014-2021`: se la cancellazione fallisce dopo, il registro
porta un `deleted` per un account che esiste ancora. E' il verso giusto dei due
— una traccia in piu' si legge, una cancellazione senza traccia non si contesta
(`community-membership.md`, gate *chi decide e' tracciato*) — e la frase che
l'operatore riceve lo dice (`MemberActionNotice.tsx:334-346`).

### Tredici insiemi, non otto

`50-RESEARCH.md` §4.1 dichiarava *«sette vincoli bloccano»* ed elencava otto
colonne. `50-MEASURES.md` M10 ne ha contati **undici** rileggendo `pg_constraint`
invece del testo delle migration. `BLOCKING_SETS`
(`actions.ts:1820-1912`) ne porta tredici:

| Insieme | Colonna | Perche' blocca |
|---|---|---|
| biglietti | `tickets.user_id` | CASCADE — li cancellerebbe |
| assegnazioni ricevute | `party_assignments.user_id` | CASCADE — vedi sotto |
| assegnazioni concesse | `party_assignments.assigned_by` | RESTRICT |
| scansioni alla porta | `door_scan_events.operator_id` | NO ACTION, NOT NULL |
| biglietti convalidati | `tickets.checked_in_by` | NO ACTION |
| presenze registrate | `attendances.checked_in_by` | **non era in §4.1** |
| ospiti ammessi | `guest_list_entries.checked_in_by` | **non era in §4.1** |
| voci di guest list create | `guest_list_entries.added_by` | NO ACTION, NOT NULL |
| voci di guest list a suo nome | `guest_list_entries.profile_id` | NO ACTION |
| rimborsi richiesti | `ticket_refunds.requested_by` | NO ACTION, NOT NULL |
| rimborsi processati | `ticket_refunds.processed_by` | **nominato, mai contato** |
| artisti creati | `artists.created_by` | NO ACTION |
| sedi create | `venues.created_by` | NO ACTION |

Le due che §4.1 non aveva **sono due porte**: sono le colonne che registrano chi
ha ammesso qualcuno. Un piano che le avesse ignorate avrebbe scoperto il `23503`
davanti a una fila.

**Il `failure` restituito e' quello del PRIMO insieme non vuoto, il `detail` li
nomina tutti** con il loro conteggio (`describeBlockingSets` a `:1967-1971`,
usata a `:2085`, e il ritorno a `:2094`). L'ordine
di `BLOCKING_SETS` e' stabile per costruzione, quindi due cancellazioni
identiche ricevono la stessa risposta.

**Un errore di lettura durante il censimento non si ingoia**: `censusBlockingSets`
restituisce `null` (`:1943-1952`) e la cancellazione **non procede** (il ramo a
`:2076-2082`). Procedere su un censimento parziale significherebbe cancellare
credendo di aver guardato.

### La superficie

`src/components/admin/MemberTable.tsx` — via `StatusTab`, `StatusBadge`,
`BULK_TAB_STATUS`, le quattro schede, la colonna di stato, il filtro degli
stati, la selezione multipla, il riquadro espandibile e il blocco referral.

Restano: nome, indirizzo, **ruolo**, **codice di membership** (colonna nuova:
`:620-627`) e data. Le azioni sono il cambio di ruolo e **«Delete account»**, che
e' l'unico piolo distruttivo (`ACTION_VARIANT` a `:189-193`), chiede conferma
(`DeleteConfirm` a `:294`) e **mostra la frase del rifiuto alla lettera**
(`:430-437`): le cause della cancellazione non si riscrivono e non si collassano.

La conferma nomina cio' che costa, in cinque righe (`:306-319`), fra cui le due
che non si possono dedurre da nessun'altra parte: *«It cannot be undone. There
is no point-in-time recovery on this database»* e *«Nobody is told … the person
finds out at the door.»*

**I due commenti sul posto gratuito permanente sono sopravvissuti**, ed e' il
gate *la capienza e' finita* di `community-membership.md`: `:113-117` (perche'
`staff` deve restare trovabile a colpo d'occhio) e `:556-576` (perche' il
conteggio si fa su `members` e mai su `filtered`, e perche' gli organizer si
contano a parte). La legenda a `:683-690` dice *«a permanent free seat at a
venue that holds 150–300 people»*.

### Il referral

Cancellati — `## File cancellati` sotto. Modificati: `capability-routes.ts:315`
non porta piu' l'indirizzo della pagina della crescita (e `/admin/newsletter`
resta, D-50-17); `membership-card/page.tsx:91` chiede un campo solo
(`select("membership_code")`); `membership-card/loading.tsx:59-63` non disegna
piu' uno scheletro per un controllo che non arrivera'.

**La carta in se' non e' stata toccata.** La toglie la fase 51 (`MEM-01`), con
la rete spenta.

## File cancellati

| Percorso | Perche' |
|---|---|
| `src/components/membership/CopyReferralLink.tsx` | costruiva `/register?ref=<codice>`; il referral esce dal prodotto (D-50-08) |
| `src/app/(admin)/admin/(work)/members/growth/page.tsx` | la pagina che misurava la crescita spaccata fra referral e ingressi diretti (D-50-10) |
| `src/app/(admin)/admin/(work)/members/growth/loading.tsx` | il suo segnaposto — **non era nell'elenco del piano**, e uno scheletro per una rotta che non esiste e' un 404 con l'animazione |
| `src/components/analytics/MemberGrowthChart.tsx` | disegnava le due bande referral/organico |
| `src/components/analytics/GrowthSummaryCard.tsx` | la percentuale di referral |
| `src/lib/analytics/member-queries.ts` | **il modulo intero**: era `fetchMemberGrowth` piu' i due tipi che serviva, e niente altro |

La directory `src/app/(admin)/admin/(work)/members/growth/` non esiste piu'.

## Decisions Made

1. **Tredici insiemi invece di dodici — `party_assignments.user_id` blocca.**
   Quella chiave e' CASCADE, quindi il database non rifiuterebbe: cancellerebbe
   in silenzio le righe che dicono chi era assegnato a una serata. E'
   `checkin-offline.md`, *una revoca non e' mai una cancellazione, resta nel
   registro perche' la porta deve poter chiedere dopo se qualcuno era assegnato
   nel momento in cui ha scansionato*. Stessa strada dei biglietti: si rifiuta,
   non si allarga ne' si restringe la cascata. Ed esiste gia' la via d'uscita —
   `revokeAssignmentsAndDemote`, che revoca **registrando**.

2. **`DeleteAccountFailure` e' un'unione a se'.** Metterla in `MemberActFailure`
   avrebbe offerto a `updateMemberRole` dodici cause che non puo' produrre.
   `CreateAccountFailure` aveva gia' fatto questa scelta. Le quattro cause
   condivise si unificano da sole, e `MemberActionNotice` le disegna una volta.

3. **`MemberNoticeKind` diventa l'unione delle due.** Il `Record` esaustivo resta
   il punto in cui aggiungere una causa senza una frase e' un errore di build —
   il meccanismo per cui quel file esiste. `MemberActionNotice.tsx:70-73`.

4. **`approved`, `rejected`, `deactivated`, `reactivated` restano in
   `MembershipAct`.** Nessuno li scrive piu', ma le righe storiche li portano e
   il registro e' append-only: un'unione che non sapesse nominare una riga
   esistente renderebbe illeggibile la storia che il registro esiste per
   conservare. Dichiarato in `acts.ts:48-62`.

5. **Quattro commenti riscritti perche' sconfiggevano un criterio.** Contenevano
   la stringa che un criterio di accettazione cerca col grep. E' la lezione
   registrata dal piano 34-03, e due di quei quattro **erano anche diventati
   falsi**: gli elenchi in `capability-routes.ts` che dimostrano l'assenza di
   ambiguita' fra i pattern nominavano un indirizzo che la mappa non ha piu'.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] `MembershipAct` non aveva `deleted`**
- **Found during:** Task 1
- **Issue:** il 50-02 ha allargato il `CHECK` del database a dieci valori; la meta' TypeScript era rimasta a nove, e `act: "deleted"` non compilava. `acts.ts` dichiara esso stesso che le due meta' si modificano nello stesso commit — quel commit e' questo.
- **Fix:** `"deleted"` aggiunto all'unione, piu' il paragrafo che spiega perche' quattro valori restano senza nessuno che li scriva.
- **Files modified:** `src/lib/membership/acts.ts:106`
- **Verification:** `npm run build` verde.
- **Committed in:** `ee0669a`

**2. [Rule 3 - Blocking] `MemberActionNotice.tsx` non era nell'elenco del piano**
- **Found during:** Task 1
- **Issue:** `NOTICES` e' un `Record<MemberNoticeKind, Notice>` **totale**. Togliere `act_underivable` dall'unione lascia una chiave in eccesso; aggiungere le cause della cancellazione lascia tredici chiavi mancanti. In entrambi i versi il build e' rosso, e non c'era modo di evitarlo.
- **Fix:** l'unione si allarga a `DeleteAccountFailure`, le tredici frasi nuove sono scritte, le otto che il server non puo' piu' produrre sono cancellate (`act_underivable`, `self_approve`, `self_reject`, `self_deactivate`, `self_reactivate`, `readmission_before_role_change`, `status_unchanged`, `no_subjects_selected`), e `self_delete` entra.
- **Files modified:** `src/app/(admin)/admin/members/MemberActionNotice.tsx`
- **Verification:** `npm run build` verde; nessuna chiave in eccesso e nessuna mancante, che e' esattamente cio' che il `Record` totale asserisce.
- **Committed in:** `ee0669a`

**3. [Rule 2 - Missing Critical] L'atto `deleted` non aveva un'etichetta nel registro**
- **Found during:** Task 1
- **Issue:** `ACT_LABELS` e' un `Record<string, string>`, quindi il build non se ne accorge: la riga si sarebbe disegnata col valore grezzo. E' **l'unico atto la cui riga e' tutto cio' che resta del soggetto** — `subject_id` va a `NULL` per costruzione — quindi mostrarlo male e' mostrare male l'unica traccia che esiste.
- **Fix:** una riga, `deleted: "Account deleted"`, piu' il docblock che dice perche' i quattro valori storici restano.
- **Files modified:** `src/app/(admin)/admin/(work)/members/register/page.tsx:130`
- **Verification:** letto a occhio contro il `CHECK` a dieci valori del 50-02.
- **Committed in:** `ee0669a`

**4. [Rule 3 - Blocking] `dashboard/page.tsx` montava il secondo `CopyReferralLink`**
- **Found during:** Task 3
- **Issue:** `50-RESEARCH.md` §2 elenca **due** mount del controllo del referral; l'elenco `files_modified` di questo piano ne copriva uno. Il file appartiene al piano **50-08**, che gira in un'onda successiva: cancellare il componente lasciando in piedi l'import e' un build rosso subito.
- **Fix:** import e mount rimossi, con il commento che dice a chi legge perche' il taglio e' arrivato da un altro piano.
- **Files modified:** `src/app/(members)/dashboard/page.tsx` — import rimosso (era `:12`), mount sostituito dal commento a `:733-738`
- **Verification:** `npm run build` verde.
- **Committed in:** `c8e11d1`

**5. [Rule 1 - Bug] `cross-event-queries.ts` leggeva la colonna del referral**
- **Found during:** Task 3
- **Issue:** `fetchReferralChains` faceva `select("id, full_name, referred_by")` su `profiles`. **Non e' nell'inventario di §2** e non e' nell'elenco di nessun piano. Il modulo non e' importato da nessuna superficie — le pagine di analytics sono uscite il 2026-08-14 — quindi dopo la migration non si sarebbe rotto davanti a nessuno: si sarebbe rotto **in silenzio**, con un `42703`, il giorno in cui qualcuno l'avesse riaperto credendolo buono.
- **Fix:** `fetchReferralChains` e l'interfaccia `ReferralChain` rimosse, con la ragione al loro posto. Il resto del modulo legge `tickets`, `drink_orders` e `attendances` e resta.
- **Files modified:** `src/lib/analytics/cross-event-queries.ts:23-37` (il blocco di commento che le sostituisce)
- **Verification:** `/usr/bin/grep -rn "referred_by" src/` restituisce una riga sola, `src/types/database.ts:110`, che appartiene ai piani 50-03 e 50-09.
- **Committed in:** `c8e11d1`

**6. [Rule 3 - Blocking] `MembershipCardView.tsx` rimandava al file cancellato**
- **Found during:** Task 3
- **Issue:** un commento nominava `CopyReferralLink.tsx` come il vicino che adotta la primitiva della card. Non e' un errore di compilazione, ma il criterio del piano chiede zero riferimenti in tutto `src/`, e un rimando a un file inesistente e' una nota che manda il lettore in un vicolo cieco.
- **Fix:** una frase riscritta.
- **Files modified:** `src/components/membership/MembershipCardView.tsx:49-51`
- **Verification:** grep a zero su tutto `src/`.
- **Committed in:** `c8e11d1`

**7. [Rule 3 - Blocking] `verify:conversion` rifiutava con exit 2**
- **Found during:** verifica finale, `npm run verify`
- **Issue:** `scripts/conversion-manifest.mjs:768` nomina la pagina della crescita come superficie convertita, e `checkManifest()` rifiuta per una voce che nomina un file non su disco. **Il file e' nell'elenco del piano 50-06**, che gira in parallelo — ma su una riga a duecento righe di distanza (`/register`, `:574`), quindi il merge non collide, e D-50-28 vuole il gate aggiornato dalla cosa che lo rompe.
- **Fix:** voce rimossa con la ragione scritta accanto, sulla stessa forma della correzione di `/admin/finance` del 2026-08-18. La cautela che la voce portava — la crescita e' leggibile solo accanto a quanti posti ha una serata — resta scritta.
- **Files modified:** `scripts/conversion-manifest.mjs:767-793`
- **Verification:** `npm run verify:conversion` → `CONVERSION_OK`, sei controlli su 37 superfici dichiarate.
- **Committed in:** `a1c1b8c`

---

**Total deviations:** 7 auto-corrette (4 bloccanti, 2 funzionalita' critica mancante, 1 bug).
**Impact on plan:** nessuna e' allargamento di perimetro. Cinque sono file che il piano non elencava ma che il piano rompeva; due (`acts.ts`, `MemberActionNotice.tsx`) erano inevitabili per costruzione, perche' il `CHECK` a dieci valori e il `Record` totale vivono dove vivono.

## Verification — cosa e' stato eseguito, e cosa un verde NON dice

**Non esiste alcun test runner per il prodotto** (`CLAUDE.md`, Guardrail 1).
Niente di quanto segue e' una prova di comportamento.

| Comando | Esito |
|---|---|
| `npm run build` | verde (include il typecheck di Next) |
| `npm run verify:routes` | `PASS` — tre controlli verdi, 30 indirizzi protetti, 26 pattern |
| `npm run verify:tables` | `TABLES_OK` — tre controlli, `REMAINING = 0` |
| `npm run verify:dialogs` | `DIALOGS_OK` — tre controlli, `REMAINING = 0` |
| `npm run verify:conversion` | `CONVERSION_OK` — sei controlli, 37 superfici, 206 file |
| `npm run verify` (aggregato) | **due rossi, entrambi PRE-ESISTENTI e gia' differiti dal 50-02** |

**I due rossi dell'aggregato non sono di questo piano**, e sono gli stessi che
`deferred-items.md` registra dal 2026-09-21:

- `verify:venue-surfaces` G2 — `src/app/(public)/payment/callback/actions.ts`
  seleziona una colonna fuori dall'elenco autorizzato;
- `verify:touch-targets` — tre elementi senza altezza dichiarata:
  `GuestTokenDisplay.tsx:689` e `:702`, `src/emails/ticket-order.tsx:231`.

Nessuno dei cinque file nominati e' toccato da questo piano.

`verify:capabilities` e `verify:section-export` **hanno rifiutato**, non
fallito: un worktree non ha `.env.local`. Non e' un verde ed e' detto qui invece
che omesso. Il piano non tocca chiavi di capability, quindi non c'e' niente che
quel gate avrebbe dovuto misurare — ma «non c'era niente da misurare» e «nessuno
ha misurato» restano due cose diverse.

### Criteri di accettazione, misurati

```
six actions        0    (atteso 0)
deleteAccount      1    (atteso 1)
approved_via       0    (atteso 0)
profile_missing    7    (atteso ≥1 — la diagnosi NON e' stata cancellata)
'deleted'          1    (atteso ≥1)
23503             14    (atteso ≥1)
delete_account_*  28    (atteso ≥16)
frase generica     0    (atteso 0)
categorie mail     0    (atteso 0)
StatusTab|Badge|BULK_TAB_STATUS   0   (atteso 0)
referred_by|referrer|Direct signup 0  (atteso 0, in MemberTable)
deleteAccount in MemberTable       2  (atteso ≥1)
posto gratuito|free seat           4  (atteso ≥1)
referred_by|status in members/page 0  (atteso 0)
/admin/members/growth in capability-routes  0  (atteso 0)
/admin/newsletter in capability-routes      7  (atteso ≥1)
membership_code in membership-card/page     3  (atteso ≥1)
```

**Un criterio non e' soddisfatto per intero, ed e' dichiarato invece che
aggirato.** `/usr/bin/grep -rc "referred_by\|approved_via" src/` non restituisce
zero: resta `src/types/database.ts:110-111`. **Quel file non appartiene a questo
piano** — e' nell'elenco del 50-03, che gira in parallelo in questa stessa onda,
e del 50-09. Toccarlo mentre un altro agente lo modifica e' esattamente cio' che
`ai-engineering.md` (gate multi-agent) vieta.

### P-50-3 — descritta, non eseguita

La procedura manuale che vede `deleteAccount` **rifiutare con la causa** non e'
stata percorsa: si percorre sul **laboratorio** (`npm run dev:lab`), che e' il
solo posto dove una cancellazione irreversibile si puo' provare, e il soggetto
c'e' gia' — `50-MEASURES.md` M2 misura sul banco **un profilo con un biglietto**,
che e' il caso esatto del primo insieme di `BLOCKING_SETS`.

Cosa si deve osservare, per un operatore `master` sulla pagina membri:

1. su quel soggetto, «Delete account» → conferma → la risposta dice **«1
   biglietto»** e non «qualcosa non ha funzionato»;
2. nessuna riga sparisce: il conteggio dei biglietti sul banco resta quello di
   prima, e il registro **non** guadagna un `deleted`;
3. su un account pulito, lo stesso controllo cancella, e
   `/admin/members/register` mostra **Account deleted** con il codice di
   membership come etichetta e il soggetto a `NULL`;
4. sulla propria riga il controllo **non e' disegnato**, e una chiamata diretta
   risponde `self_delete`.

## Issues Encountered

**La ricerca aveva due inventari incompleti, e li hanno chiusi due fonti
diverse.** §4.1 contava sette vincoli dove il catalogo ne ha undici — l'ha
corretto l'onda 0 con `50-MEASURES.md` M10, ed e' la ragione per cui il
censimento parte da tredici insiemi invece che da otto. §2 elencava gli
inventari del referral senza `cross-event-queries.ts` — l'ha trovato un grep
ricorsivo su tutto `src/` invece che sulla lista dei file del piano. **Le due
mancanze hanno la stessa forma**: un elenco compilato leggendo un testo (le
migration, i file nominati) invece che interrogando la fonte (il catalogo, il
tree).

Nient'altro ha richiesto problem-solving: il build e' rimasto verde a ogni
commit.

## Segnalazioni per le fasi a valle

### `NAV-05` (fase 52) trovera' una superficie diversa da quella che descrive

`50-RESEARCH.md` §7.5 lo chiede per nome. La cifra `staff` e' **un link con
filtro** e le altre due no — oggi a `src/components/admin/MemberTable.tsx:659-665`
(il `<button>`; la cifra e' nello `<span>` a `:664`). Era a `:1109` prima di
questo piano.

`NAV-05` vuole le altre cifre come questa. **Ma le cifre ora sono TRE e non
quattro**: la quarta contava le richieste in attesa, e non esistono piu'
richieste. E le quattro schede di stato sopra i filtri — che erano l'altra meta'
di quella navigazione — non esistono piu' nemmeno loro. La 52 troverà una barra
di conteggi piu' corta e senza schede: **e' un requisito da rileggere, non da
applicare alla lettera.**

### Due voci differite in `deferred-items.md`

- **`src/lib/guest-list/process-entry.ts:165-178`** legge `status` e scrive
  **entrambe** le colonne cancellate, su un percorso di guest list. Nessuno dei
  dodici piani della fase possiede quel file — verificato leggendo tutti gli
  elenchi `files_modified`. Dopo la migration e' un `42703` mentre si prepara una
  serata. **Va chiusa dentro la fase** (D-50-24), non differita alla 51.
- **`assigned` e `unassigned` non hanno un'etichetta** in `ACT_LABELS`: difetto
  della fase 35, due righe, invisibile al build perche' il `Record` e' su
  `string`.

### Per il 50-08

Le tre mail dell'asse dello stato **non hanno piu' mittenti**: `sendApprovalEmail`,
`sendReadmissionEmail` e `sendRejectionEmail` sono uscite da
`admin/members/actions.ts` con i loro `import`. I **modelli** —
`member-approved.tsx`, `member-rejected.tsx`, `member-reactivated.tsx` — sono
ora senza consumatori e si possono cancellare senza rompere nulla.

### Per il 50-09

`membership-card/page.tsx` passa ancora `status` ad `AppNav`, e viene dal
risolutore e non da `profiles` (`:80`, `:163`). E' la prop che il 50-09 toglie
insieme al componente: toglierla da una sola delle sue chiamate lascerebbe
`AppNav` con una prop che meta' dell'albero passa e meta' no. Dichiarato nel
commento a `:72-79`.

## Next Phase Readiness

- REG-02, REG-03 e REG-04 sono chiusi lato codice. **REG-04 nella forma di
  D-50-05**: entrano i quattro ruoli piu' l'account leggero, e l'unica uscita e'
  la cancellazione.
- Il codice di questo piano **non legge ne' scrive** `status`, `referred_by` o
  `approved_via`, e **non si rompe** se le colonne esistono ancora: e' il verso
  di deploy che D-50-24 impone.
- Resta aperto, e blocca il deploy in produzione: `process-entry.ts`.

## Self-Check: PASSED

Verificato prima di chiudere, perche' un SUMMARY che cita una riga sbagliata
manda il prossimo lettore in un posto che non contiene cio' che gli e' stato
promesso — e nei due piani precedenti di questa fase e' successo sette volte.

- **I quattro commit esistono** sul ramo di questo worktree: `ee0669a`,
  `c8e11d1`, `c926804`, `a1c1b8c`, tutti con `d4033eb` come base.
- **I quattordici file citati sono su disco**, e i sei cancellati non lo sono —
  verificati uno per uno con `test -f`/`test -d`.
- **Ventiquattro citazioni `file:riga` rilette dal file**, non dalla memoria.
  **Undici erano sfalsate e sono state corrette**: le sei righe della tabella
  della sequenza di `deleteAccount`, i due estremi di `assertSubjectActionable`
  e di `BLOCKING_SETS`, e tre riferimenti in `MemberTable.tsx` (il piolo
  distruttivo, la colonna del codice, la legenda).
- **Una imprecisione di conteggio corretta in tre punti**, nel SUMMARY e nel
  codice: gli insiemi sono **tredici**, i codici **dodici** — i due dei
  rimborsi ne condividono uno. Il docblock di `DeleteAccountFailure` e
  l'intestazione delle frasi in `MemberActionNotice.tsx` dicevano dodici di
  entrambi.
- **`npm run build` rilanciato dopo le correzioni ai docblock**: verde.

---
*Phase: 50-via-le-iscrizioni*
*Completed: 2026-09-21*
