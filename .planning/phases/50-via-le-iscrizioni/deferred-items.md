# Fase 50 — voci differite, trovate durante l'esecuzione

Cose scoperte mentre si eseguiva un piano, **fuori dal perimetro del task che le
ha trovate**. Non sono state corrette li': sono scritte qui perche' qualcuno
decida dove vanno.

---

## ~~D-50-01 lascia scoperto `scripts/rls-baseline.mjs`~~ — ASSORBITA

> **CHIUSA dal piano 50-02, 2026-09-21**, nello stesso commit della migration che
> la rendeva vera — che e' esattamente cio' che D-50-28 chiede. `PERSONA_STATUSES`
> e' stata rimossa, `PERSONA_LABELS` porta i quattro ruoli piu' `anon` e
> `authenticated/no-profile`, `PERSONA_SQL` non seleziona piu' la colonna e
> `resolvePersonas` etichetta per ruolo. Le personas passano da quattordici a sei,
> e cio' che si perde con la seconda asse — la coppia `organizer/pending`, l'unica
> che distingueva P1 da P3 — e' dichiarato nel docblock invece di sparire in
> silenzio: non e' una riga che la matrice smette di coprire, e' una riga che
> nessun database puo' piu' contenere.

**Trovata:** piano 50-01, task 2 (2026-09-21).
**Fuori perimetro perche':** il task dichiara `scripts/container/seed.mjs` e nient'altro.

`scripts/container/seed.mjs` non nomina piu' `profiles.status`, ma il modulo da
cui importa continua a farlo, e in tre punti che la migration dell'onda 1 rende
falsi:

| File:riga | Cosa contiene | Cosa succede dopo la migration |
|---|---|---|
| `scripts/rls-baseline.mjs:674` | `export const PERSONA_STATUSES = ['approved','pending','rejected']` | resta esportato e non lo importa piu' nessuno |
| `scripts/rls-baseline.mjs:680` | le etichette delle persone, `ruolo/stato` | etichette su un asse che non esiste |
| `scripts/rls-baseline.mjs:742-746` | `resolvePersonas`: `select role, status … where status in ('approved','pending','rejected') group by role, status` | **`42703`**: la colonna non esiste, e il banco di prova del container si ferma qui |

La terza riga e' quella che conta: e' una `select` su una colonna cancellata, e
fallisce. `50-02` aggiorna `scripts/rls-baseline-compare.mjs` (il testo del
predicato inciso nella linea di base) ma **non** `rls-baseline.mjs`.

**Chi la chiude:** da decidere — il piano che porta la migration (onda 1) e' il
posto naturale, perche' D-50-28 vuole il gate aggiornato **nello stesso commit**
della cosa che cambia.

**Perche' non e' stata chiusa qui:** `rls-baseline.mjs` e' la matrice delle
sonde, non un banco di semina; toccarla dentro un task che dichiara un altro
file avrebbe significato modificare un gate senza che nessun criterio di
accettazione lo guardasse.

---

## La CHIAVE `membership.active` resta nel catalogo, e va tolta con la costante TypeScript

**Trovata:** piano 50-02, task 1 (2026-09-21).
**Fuori perimetro perche':** chiuderla qui avrebbe richiesto di toccare `src/`, che
il piano 50-02 esclude per intero (`git diff --stat` senza modifiche sotto `src/`).

Il piano 50-02 dichiara che `membership.active` *«si CANCELLA dal catalogo, non si
allarga»*. Cancellata e' stata **meta'**: le **quattro concessioni** in
`private.role_capabilities` (nessun ruolo la tiene piu'), non la **chiave** in
`private.capabilities`.

La ragione e' meccanica e verificata leggendo il gate:
`scripts/verify-capabilities.mjs` confronta `private.capabilities` con l'oggetto
`CAP` di `src/lib/capabilities/keys.ts` **in entrambe le direzioni** — controllo 0
(`EXPECTED_KEY_COUNT`, asserito su TS **e** su DB con una costante sola),
controllo 1 (TS↔DB) e controllo 3 (SRC↔DB). Togliere la riga di catalogo mentre
`CAP.MEMBERSHIP_ACTIVE` vive ancora in TypeScript renderebbe quel gate **rosso**
fino al piano che tocca il codice — ed e' precisamente cio' che D-50-28 vieta.

| Dove | Cosa | Chi la toglie |
|---|---|---|
| `private.capabilities` | la riga `membership.active` | il piano che smonta le superfici |
| `src/lib/capabilities/keys.ts:300,395` | `CAP.MEMBERSHIP_ACTIVE` e la sua descrizione | idem |
| `src/lib/routes/capability-routes.ts:471` | la voce `scope: "table"` (il `Record` e' totale: senza di lei `npm run build` fallisce) | idem |
| `src/lib/media/may-upload.ts:291` | `if (!ctx.capabilities.has(CAP.MEMBERSHIP_ACTIVE)) return false` | idem |
| `scripts/verify-capabilities.mjs` | le quattro righe `'membership.active': 'REFUSED'` e `EXPECTED_KEY_COUNT` 17 → 16 | idem, **stesso commit** |

**Nessun comportamento cambia quando arrivera'.** L'arm 2 di `mayUploadToParty`
e' gia' morto dal 2026-08-08 (interroga una tabella `attendance` che non esiste,
`may-upload.ts:265-281`), e con le concessioni cancellate `has_capability`
risponde comunque `false` a chiunque.

---

## Due gate rossi PRE-ESISTENTI, non toccati dal 50-02

**Trovati:** piano 50-02, corsa di `npm run verify` (2026-09-21).
**Fuori perimetro perche':** vivono in `src/`, e il piano 50-02 non tocca `src/`
(`git diff --name-only` non porta un solo file sotto `src/`). Nessuno dei due e'
stato reso rosso da questa onda.

| Gate | Cosa dice |
|---|---|
| `verify:touch-targets` | tre elementi senza altezza minima dichiarata: `GuestTokenDisplay.tsx:689` e `:702` (due `<button>`), `src/emails/ticket-order.tsx:231` (un `<a>`) |
| `verify:venue-surfaces` | G2 — `src/app/(public)/payment/callback/actions.ts` seleziona `{id, status, sumup_checkout_id, ticket_id}`; l'insieme autorizzato e' `{id, status, ticket_id}` |

Il secondo e' su un percorso di rivelazione, quindi **non e' debito estetico**:
l'elenco positivo esiste perche' una colonna che non si legge non si puo'
stampare. Va guardato da chi possiede quella superficie, e il modo di chiuderlo
e' correggere la `select`, mai allargare l'asserzione.

---

## `src/lib/routes/next-redirect.ts:72-73` nomina righe che non esistono piu'

**Trovata:** piano 50-06, task 3 (2026-09-21).
**Fuori perimetro perche':** quel file non e' nei `files_modified` di 50-06, e il
file stesso dichiara che **aggiungere una voce a quella allow-list e' una
decisione d'accesso**: non e' un file su cui passare per sistemare un commento
mentre altri piani della stessa onda lavorano vicino.

Il docblock dell'allow-list dei `?next=` spiega due voci nominando per riga i
file che le producono, e 50-06 ha cancellato due di quei riferimenti:

| Voce dell'allow-list | Prosa che la spiega | Cosa e' cambiato |
|---|---|---|
| `/events/<slug>` | *«prodotta da `RsvpButton.tsx:35` e `TierSelection.tsx:224`, inoltrata da `register/page.tsx:45`»* | `register/page.tsx` **e' stato cancellato** |
| `/events/<slug>/menu` | *«prodotta da `GuestLoginBanner.tsx:42` e `:138`»* | delle due **ne resta una**, il link d'accesso; l'altra era il link d'iscrizione |

**Le due voci dell'allow-list restano giuste** — entrambi gli indirizzi sono
ancora prodotti da qualcuno, e nessun pattern va aggiunto ne' tolto. E' la
**prosa che li attribuisce** a essere invecchiata.

**Chi la chiude:** un piano che apra quel file per una ragione propria. Candidato
naturale **50-05**, che riscrive `RsvpButton` — uno dei due produttori nominati.

---

## `GuestDrinkMenu.tsx:366` passa una prop che non esiste piu'

**Trovata:** piano 50-06, task 3 (2026-09-21).
**Fuori perimetro perche':** `GuestDrinkMenu.tsx` non e' nei `files_modified` di
50-06.

`GuestWarningModal` ha perso la prop `onSignUp` insieme al ramo *iscriviti*. Il
**solo** sito di render e' **commentato** da prima di questa fase
(`src/app/(public)/events/[slug]/menu/GuestDrinkMenu.tsx:360-369`, *«Pre-checkout
warning modal temporarily disabled»*) e dentro il commento passa ancora
`onSignUp={handleWarningSignUp}`.

**Nessun effetto oggi:** il codice e' commentato, il typecheck non lo vede, il
build resta verde. **Ma chi riabilitera' il pannello non compila** finche' non
toglie quella riga — e riabilitarlo e' una decisione di prodotto, non di questo
piano.

Il fatto e' scritto anche **dentro** `GuestLoginBanner.tsx`, nel docblock di
`GuestWarningModal`, cosi' che chi riabilita lo trovi leggendo invece che dal
typecheck.

---

## Conferma: `verify:venue-surfaces` G2 e' ANCORA rosso

**Riconfermato:** piano 50-06, task 3 (2026-09-21), su `d4033eb` prima di
qualunque modifica del piano.

E' la seconda riga della voce «Due gate rossi PRE-ESISTENTI» qui sopra, e non si
e' chiusa da sola. Misurato ora: `src/app/(public)/payment/callback/actions.ts`
e' stato toccato l'ultima volta dal commit `45be363` (fase 49), che ha aggiunto
la lettura di `sumup_checkout_id` **senza** aggiungerla alla lista positiva del
controllo G2.

`sumup_checkout_id` non porta un luogo, quindi **oggi non c'e' un indirizzo
esposto**. Il danno e' un altro, e cresce: la lista e' positiva **di proposito**
— il suo valore sta nel fatto che una colonna che nessuno ha pensato di vietare
diventa rossa lo stesso — e un rosso lasciato acceso la trasforma in rumore.
Quando arrivera' il rosso vero, sara' letto come «il solito».

**Non riparato da 50-06 di proposito:** quel gate sta su `venue-secrecy.md`, dove
allentare un'asserzione per far passare un rosso e' l'unica modifica del repo che
non si annulla.

## ~~`process-entry.ts` scrive ancora sull'asse dello stato~~ — ASSORBITA

> **CHIUSA dal piano 50-08, 2026-09-21**, commit `175170a`, dentro la fase come
> la voce stessa chiedeva. Il ramo dell'auto-approvazione e' uscito intero — non
> c'e' piu' niente da auto-approvare perche' non esiste piu' un `pending` — e la
> `select` e' scesa a `("id, email")`. Nessun comportamento cambia: chi e' in
> guest list ottiene il suo biglietto gratuito come prima, e la porta legge il
> biglietto, mai uno stato del profilo. Il commento a
> `src/lib/guest-list/process-entry.ts:172-190` registra cosa c'era.

**Trovata:** piano 50-07, task 3 (2026-09-21).
**Fuori perimetro perche':** il file non e' nell'elenco `files_modified` di
nessuno dei dodici piani della fase — verificato leggendoli tutti — e sta sul
percorso della guest list, che e' biglietteria, non superficie membri.

`src/lib/guest-list/process-entry.ts:165-178` legge `status` dal profilo e, se
vale `pending`, scrive **entrambe** le colonne che la fase cancella:

```
.select("id, status, email")            // :165
if (existingProfile.status === "pending")   // :173
  .update({ status: "approved", approved_via: "guest_list" })   // :176
```

**Dopo la migration in produzione questo ramo e' un `42703`**, e non cade su una
superficie amministrativa: cade quando si processa una voce di guest list, cioe'
mentre si prepara una serata. `50-RESEARCH.md` §2 lo cita nella riga del trigger
ma non in quella dei consumatori, e nessun piano lo raccoglie.

**Cosa serve:** togliere il ramo intero — non c'e' piu' niente da
auto-approvare, perche' non c'e' piu' un `pending` — e ridurre la `select` a
`("id, email")`. Nessun comportamento cambia: ogni account e' gia' quello che
sara'.

**Chi la chiude:** il piano dell'ultima onda che tocca il codice prima del
deploy. **Va chiusa dentro la fase**, non differita alla 51: D-50-24 dice che il
codice dispiegato prima della migration non deve leggere ne' scrivere quelle
colonne, e questa riga fa entrambe.

---

## `assigned` e `unassigned` non hanno un'etichetta nel registro

**Trovata:** piano 50-07, task 1 (2026-09-21), aggiungendo quella di `deleted`.
**Fuori perimetro perche':** e' un difetto della fase 35, non di questa: i due
atti sono nati senza etichetta e `ACT_LABELS` e' un `Record<string, string>`,
quindi `npm run build` non se ne accorge.

`src/app/(admin)/admin/(work)/members/register/page.tsx:109-131` mappa otto
valori su dieci. Le righe `assigned` e `unassigned` — quelle delle assegnazioni
per serata — si disegnano col loro valore grezzo invece che in parole.

Non corretto qui perche' il perimetro del task era l'atto `deleted`, e
sistemare un difetto vicino ma diverso dentro un commit che ne dichiara un altro
e' il modo in cui una modifica diventa illeggibile.

**Chi la chiude:** chiunque tocchi quella superficie. Sono due righe.

---

## Il pannello biglietti legge TUTTI i livelli di un evento, e non filtra `access_type`

**Trovata:** piano 50-04, task 3 (2026-09-21), verificando l'assunzione `A5`.
**Fuori perimetro perche':** oggi non produce nessun effetto, e ripararla dentro
un commit che ne dichiara un altro l'avrebbe resa illeggibile.

`src/app/(admin)/admin/(work)/events/[id]/tickets/page.tsx:198-202` legge i
livelli con `.eq("event_id", eventId)` e basta. Il livello `RSVP` a prezzo zero
di una serata gratuita **rientra in quella lettura**.

Non compare sullo schermo per una ragione che sta **altrove**: il rendering
cicla sulle serate (`:602`), e quelle sono filtrate a `access_type = 'paid'`
(`:194`). Cioe' la difesa e' in un posto diverso da quello che la garantisce: il
giorno in cui quel ciclo mostrasse anche le serate gratuite, il livello di
prenotazione comparirebbe fra i livelli a pagamento con il suo modulo di
modifica e il suo pulsante di cancellazione — e cancellarlo chiude le
prenotazioni di quella serata senza che niente lo dica.

**Cosa serve:** o il filtro sulla lettura dei livelli, o una decisione
dichiarata su come il livello di prenotazione si mostra all'organizer (che
**potrebbe** essere utile vederlo: e' li' che si legge quanti posti restano).

**Chi la chiude:** chiunque tocchi quella superficie, o il piano che dara' una
faccia alla capienza di una serata gratuita.

---

## ~~Con la colonna `status` via, chi ha una sessione non vede piu' ne' il modulo della prenotazione ne' il controllo d'acquisto~~ — ASSORBITA

> **CHIUSA dal piano 50-08, 2026-09-21**, commit `175170a`, prima che la
> migration raggiunga la produzione — che e' precisamente la condizione che
> questa voce poneva.
>
> **I cancelli erano QUATTRO, non due.** Riletti dal file invece che dal
> documento: oltre ai due nominati qui sotto (`:1738` acquisto, `:1826`
> prenotazione), il **pass di evento** portava la stessa condizione, e il
> **dialogo del venue segreto** aveva un ramo `!isApproved` che diceva *«il tuo
> account dev'essere approvato»*. Lasciandone due, `isApproved` sarebbe
> sopravvissuto come unica lettura viva di una colonna cancellata.
>
> La regola applicata e' quella della fase: **chi ha una sessione compra e
> prenota esattamente come un anonimo**, nessuno stato. `const isApproved` non
> esiste piu' (`events/[slug]/page.tsx:431-446`).
>
> **La visibilita' del luogo non cambia**, e vale la pena scriverlo: quel ramo
> del dialogo non ha mai mostrato un indirizzo, ne' prima ne' dopo. Il predicato
> che decide se il luogo si vede vive in `venue-disclosure.ts` e non e' toccato;
> `verify:venue-surfaces` non ha cambiato esito.
>
> **Una seconda occorrenza dello stesso difetto e' emersa nello stesso piano e
> non era censita da nessuna parte:** `canUpload` (`page.tsx:1109`, prima)
> portava `(isApproved && hasAttended)` — l'arm dei membri del caricamento
> media, sulla superficie. Uscito con D-50-03, insieme a `hasAttended`, che
> interrogava la stessa tabella `attendance` inesistente di `may-upload.ts`.

**Trovata:** piano 50-05 (2026-09-21), **misurata sul laboratorio**, dove la
migration della fase e' gia' applicata e `profiles.status` **non esiste piu'**.
**Fuori perimetro perche':** il piano 50-05 ordina esplicitamente di montare il
modulo *«alle stesse condizioni di prima»* — e' una sostituzione di controllo,
non un cambio di chi vede cosa — e il docblock della pagina dichiara che
toccare `isApproved` e' **un cambio di verdetto su chi puo' comprare**, che
pretende un'autorizzazione scritta propria.

I due rami della pagina della serata si disegnano cosi':

| Ramo | Condizione | `src/app/(public)/events/[slug]/page.tsx` |
|---|---|---|
| acquisto | `!isAuthenticated \|\| isApproved \|\| status === "pending"` | `:1738` |
| prenotazione gratuita | `!isAuthenticated \|\| isApproved` | `:1826` |

`isApproved` e' `status === "approved"` (`:430`), e `status` arriva da
`getAccessContext()`. **Quando la colonna non c'e' piu', quel valore e' `null`
per tutti**: entrambe le condizioni restano vere solo per chi **non** ha una
sessione. Cioe' un anonimo prenota e compra, e chi ha fatto login **non vede
nessuno dei due controlli**.

**Misurato, non dedotto:** sul laboratorio, entrato come socio con la sessione
attiva, la pagina di `lab-free-night` renderizza **zero campi** del modulo
(`document.querySelectorAll('input')` → `[]`), mentre da anonimo, sulla stessa
pagina e nello stesso minuto, il modulo c'e' e prenota.

**Perche' oggi in produzione non si vede:** il verso del deploy e' **codice
prima, migration dopo** (`D-50-24`), e finche' la colonna esiste un socio
approvato passa. **Il difetto si apre nell'istante del `DROP COLUMN`**, ed e'
esattamente la meta' della finestra che quella decisione non copre: D-50-24
chiede che il codice regga *la colonna ancora presente*, e questa e' la
condizione opposta.

**Cosa serve:** il piano che toglie `status` dal codice (50-09, e cio' che la
11 dispiega) deve togliere **anche queste due condizioni**, non solo le
letture della colonna. Un `grep` per `profiles.status` non le trova: qui la
colonna non si nomina, si nomina un valore che da lei discende.

**Chi la chiude:** 50-09 / 50-11, prima che la migration raggiunga la
produzione.

---

## Il docblock di `SecretVenueDialog.tsx` descrive ancora DUE chip

**Trovata:** piano 50-08, task 2 (2026-09-21), aprendo il file per togliere il
ramo `!isApproved`.
**Fuori perimetro perche':** era gia' falsa **prima** di questo piano — il chip
`Sign up` e' uscito con D-50-11, e il sito di render porta gia' il suo commento
— e correggerla qui avrebbe messo dentro un commit che dichiara un cancello
d'accesso una modifica di prosa che non c'entra.

`src/app/(public)/events/[slug]/SecretVenueDialog.tsx:124-137` spiega perche' le
due vie d'ingresso sono `Chip` e non `Button`, e le nomina: *«`Sign up` and
`Sign in` navigate inside this application»*, *«the two chips are drawn the
same»*.

**Ne resta uno.** Il render (`:257-263`) disegna il solo `Sign in`, e accanto ha
gia' il commento che dice perche' — *«un chip solo, dalla fase 50 (D-50-11)»*.
E' la **prosa a monte** a essere invecchiata, non il codice.

**Nessun effetto oggi:** e' un docblock. Ma sta su un file di
`venue-secrecy.md`, dove un lettore che arriva di corsa si fida della prosa
prima del render.

**Chi la chiude:** chiunque apra quel file per una ragione propria. Sono due
frasi.

---

## La CHIAVE `membership.active` resta nel catalogo — il 50-09 NON la chiude, e dice perche'

**Riconfermata e decisa:** piano 50-09, task 2 (2026-09-21).
**La voce originale** e' quella del piano 50-02 qui sopra, che elencava **cinque**
punti da toccare. **Uno e' stato chiuso** dal piano 50-08
(`src/lib/media/may-upload.ts:291`, l'arm che leggeva la chiave). **I quattro
restanti non sono stati chiusi qui, ed e' una decisione, non una dimenticanza.**

| Dove | Cosa | Stato |
|---|---|---|
| `private.capabilities` | la riga `membership.active` | **resta** |
| `src/lib/capabilities/keys.ts` | `CAP.MEMBERSHIP_ACTIVE` e la sua descrizione | **resta** |
| `src/lib/routes/capability-routes.ts` | la voce `scope: "table"` del `Record` totale | **resta** |
| `src/lib/media/may-upload.ts:291` | l'arm che la leggeva | **CHIUSO dal 50-08** |
| `scripts/verify-capabilities.mjs` | le quattro righe `'membership.active': 'REFUSED'` e i conteggi | **resta** |

**Perche' il 50-09 non la chiude.** Le due meta' — la chiave in TypeScript e la
riga nel catalogo — **se ne vanno insieme o rompono il gate**: D-50-28. La
migration `20260921120000` lo scrive dentro di se', nel `COMMENT` che ha lasciato
sulla tabella delle concessioni: *«la chiave resta nel catalogo finche'
`CAP.MEMBERSHIP_ACTIVE` vive in `src/lib/capabilities/keys.ts`, e le due se ne
vanno insieme»*. Chiuderla qui avrebbe richiesto **una terza migration** applicata
al laboratorio — e il piano 50-09 non ne dichiara nessuna nei propri
`files_modified`, mentre il piano **50-11** ha gia' il proprio perimetro di
scrittura in produzione scritto in un'autorizzazione datata. **Allargare di
nascosto il perimetro di una scrittura irreversibile e' la cosa che
un'autorizzazione datata esiste per impedire.**

**Perche' e' inerte, misurato e non dedotto.** La voce di
`capability-routes.ts:484-485` e' `scope: "table"`: la chiave **non gate' nessun
indirizzo**. Le quattro concessioni sono state cancellate dal 50-02, quindi
`has_capability('membership.active')` risponde `false` a chiunque. Il suo unico
lettore nel codice e' uscito col 50-08. `npm run verify:capabilities` contro il
**laboratorio** e' **5/5 verde** con la chiave al suo posto (misurato il
2026-09-21 dal piano 50-09).

**Difetto da correggere insieme a lei, e nominato adesso perche' non si
riscopra:** `capability-routes.ts:486-487` dichiara ancora che *«the guard is
`src/lib/media/may-upload.ts`»*. Quel lettore non esiste piu'. La chiave oggi
**non ha guardia**, ed e' la descrizione piu' onesta del suo stato.

**Da correggere anche nel piano 50-11:** il suo testo di perimetro
(`50-11-PLAN.md:131`) elenca *«`membership.active` cancellata dal catalogo»* fra
cio' che `20260921120000` fa. **Non lo fa** — la migration cancella le quattro
**concessioni** e lo dichiara alla riga 76 del proprio file. Un'autorizzazione
che descrive male il proprio perimetro e' peggio di un'autorizzazione assente.

**Chi la chiude:** il primo piano che porti una migration su
`private.capabilities`. Candidata naturale la **fase 51** (`MEM-01`), che smonta
la superficie della membership card e tocca gia' `membership.card.view`: due
chiavi, una migration, un commit.

---

## Cinquanta occorrenze di prosa nominano ancora `requires_approved`, e quattro sono DATI

**Trovata:** piano 50-09, task 2, misurando il criterio di accettazione
(2026-09-21).
**Fuori perimetro perche':** il task 2 del piano 50-09 dichiara **un solo file**,
`src/types/database.ts`. Le occorrenze vivono in **24 file**, fra cui quattro
Critical (`admin/venues/actions.ts`, `admin/members/actions.ts`,
`api/tickets/checkin/route.ts`, `lib/door/require-operator.ts`).

Il criterio di accettazione del piano chiede
`grep -rcE "UserStatus|requires_approved|get_user_status|isPendingOrRejected|STATUSES" src/` = 0.
**Misurato: 54 occorrenze.** Il codice **e' a zero** — zero dichiarazioni, zero
identificatori, zero rami: provato con il grep **a commenti spogliati**, 311 file
percorsi. Cio' che resta si divide in due classi diverse, e confonderle sarebbe
l'errore:

### Classe 1 — **50 commenti**, in 24 file

Sono **il verbale di cio' che e' stato deciso** fra le fasi 32 e 45: perche'
`catalogue.manage` invece di `staff.manage`, perche' un rifiuto e' stato
spostato piu' presto, perche' la porta non chiede l'approvazione. Argomenti
costruiti **sul confronto fra due chiavi**, una delle quali portava il flag.

| File | Occ. |
|---|---|
| `src/lib/capabilities/keys.ts` | 14 (di cui 4 sono **Classe 2**) |
| `src/app/(admin)/admin/venues/actions.ts` | 5 |
| `src/app/(admin)/admin/artists/actions.ts` | 4 |
| `src/lib/routes/capability-routes.ts` | 3 |
| `src/app/(public)/events/[slug]/actions.ts` | 3 |
| `src/app/(admin)/admin/members/actions.ts` | 3 |
| `src/lib/routes/staff-tabs.ts`, `src/lib/media/may-upload.ts`, `src/app/(public)/events/[slug]/menu/actions.ts`, `src/app/(admin)/admin/(work)/members/page.tsx` | 2 ciascuno |
| `src/lib/door/require-operator.ts`, `src/lib/capabilities/guards.ts`, `src/app/api/tickets/checkin/route.ts`, `src/app/(public)/tickets/refund-actions.ts`, `src/app/(public)/artists/[slug]/page.tsx`, `src/app/(admin)/admin/newsletter/actions.ts`, `src/app/(admin)/admin/formats/actions.ts`, `src/app/(admin)/admin/events/[id]/reveal/actions.ts`, `src/app/(admin)/admin/(work)/venues/page.tsx`, `src/app/(admin)/admin/(work)/venues/[slug]/page.tsx`, `src/app/(admin)/admin/(work)/members/register/page.tsx`, `src/app/(admin)/admin/(work)/formats/page.tsx`, `src/app/(admin)/admin/(work)/events/[id]/edit/page.tsx`, `src/app/(admin)/admin/(work)/artists/page.tsx` | 1 ciascuno |

Una sola nomina `get_user_status`: `keys.ts:299`, e' l'etichetta del predicato
**P5** della fase 32.

**Precedente che governa questa classe, e che questa fase ha gia' applicato due
volte.** `scripts/rls-baseline-compare.mjs` P5: il piano 50-02 ha deciso di
**non riscrivere** quella stringa, perche' *«riscriverla per assomigliare al
database di oggi non la renderebbe piu' vera: renderebbe il comparatore
incapace di spiegare le righe che esiste per spiegare»* — e le ha messo accanto
la data che l'ha resa storia. E `admin/(work)/members/page.tsx:182-187`, dove il
piano 50-06 ha **tenuto** il nome della colonna dentro una frase che dice
*«quella colonna non esiste piu' (D-50-01)»*: **annotare, non cancellare.**

**Cosa serve davvero, e non e' una riscrittura.** Un passaggio che metta accanto
a ciascuna la data in cui e' diventata storia — non che la cancelli. Cancellarla
toglierebbe l'argomento senza sostituirlo, e al primo caso uguale qualcuno
rifarebbe la scelta da capo.

### Classe 2 — **quattro stringhe di descrizione**, `keys.ts:421-428`

Queste **non sono commenti**: sono `CAP_DESCRIPTIONS`, cioe' **dati**, e il loro
gemello vive nella colonna `description` di `private.capabilities`. Ognuna delle
quattro contiene la frase:

> *«That is a BET on the signup path staying closed: reopen a path that can
> create a pending organizer and this flag is reconsidered in the same commit.»*

**Quella scommessa e' stata vinta da questa fase**, nella direzione prevista: il
percorso d'iscrizione e' chiuso per sempre e il flag non esiste piu'. La frase
chiede esplicitamente un commit, e quel commit **non e' questo**, per la stessa
ragione meccanica di `membership.active`: il docblock di `CAP_DESCRIPTIONS`
dichiara che l'allineamento di queste stringhe con le righe del catalogo e'
*«`scripts/verify-capabilities.mjs`'s job, and that check needs a live
database»*. Toccare le stringhe senza toccare le righe apre una divergenza che
**nessun gate misura oggi**, e chiuderla richiede una migration.

**Due descrizioni sono gia' false per la stessa ragione, e non sono state
introdotte da questo piano:** `catalogue.manage` dice *«Requires an approved
status as well as the role»* e `membership.active` dice *«Status only; every
role holds it once approved»*. Entrambe sono diventate false con la migration
del **50-02**.

**Chi chiude entrambe le classi:** la Classe 2 va **con `membership.active`**,
nella stessa migration e nello stesso commit — sono lo stesso problema, la
stessa tabella e lo stesso gate. La Classe 1 e' prosa e puo' viaggiare da sola,
con chiunque apra ciascuno di quei file per una ragione propria.

**Cosa NON si fa:** allargare il perimetro del grep finche' diventa verde. Il
censimento sta qui **per intero** proprio perche' nessuno possa farlo in
silenzio (T-50-44).

---

# Voci differite dal piano 50-10 (2026-09-21)

Trovate **percorrendo** le procedure sul laboratorio. Nessuna e' in perimetro:
il piano 50-10 dichiara due soli file (`50-RUNBOOK.md`, `50-ESITI.md`), e
ripararle significherebbe toccare uno script di banco, una migration o una
stringa di copy che nessun criterio di accettazione stava guardando.

## 1. `--reset` del banco della porta si ferma su un `23505`, e la fase 50 e' la causa

**File:** `scripts/seed-lab-door.mjs`, la lista `tabelle` della funzione `reset`.

`ticket_orders` e' cancellata **prima** di `tickets`. La chiave
`tickets.order_id` e' `ON DELETE SET NULL`, quindi quella cancellazione fa
scattare un `UPDATE … SET order_id = NULL` su tutti i biglietti dell'ordine — e
li porta dentro il predicato dell'indice parziale:

```sql
CREATE UNIQUE INDEX tickets_party_user_unique ON public.tickets
  USING btree (party_id, user_id)
  WHERE ((party_id IS NOT NULL) AND (order_id IS NULL));
```

Un ordine gratuito con **due biglietti per la stessa persona sulla stessa
serata** — la forma normale di `P-50-7` — li porta dentro **in collisione**:

```
ERROR: 23505: duplicate key value violates unique constraint "tickets_party_user_unique"
CONTEXT: SQL statement "UPDATE ONLY "public"."tickets" SET "order_id" = NULL …"
```

**Aggiramento usato**, scritto per intero perche' la prossima persona non debba
ritrovarlo:

```sql
delete from public.attendances;
delete from public.door_scan_events;
delete from public.tickets;
```

…poi `--reset` come al solito.

**Seconda avvertenza sullo stesso comando:** `--reset` **non** rimuove
`.env.lab.seed.json`, e `--seed` rifiuta di girare finche' quel file esiste. Va
spostato via a mano fra i due.

**Cosa NON si conclude:** che il prodotto sia rotto. Nessuna superficie del
prodotto cancella un `ticket_orders`. Cio' che si conclude e' che **cancellare
un ordine non e' piu' un'operazione sicura** da quando esistono gli ordini
gratuiti, e che chi un giorno scrivesse quello strumento deve saperlo.

**Proprietario naturale:** chiunque tocchi `seed-lab-door.mjs`, oppure il piano
che dara' all'organizer uno strumento per correggere un ordine (gia' differito
dalla fase 49).

## 2. `PRE-SEED` non semina il titolo che `P-50-4` passo 4.5 pretende

**File:** `scripts/seed-lab-door.mjs`, l'unica `insert` in `party_assignments`.

Semina `capability = 'door.operate'`. L'arm per serata di
`src/lib/media/may-upload.ts:270` chiede **`media.upload`**. Con il banco
prescritto, lo staff assegnato alla serata X riceve **sulla propria serata**
`403 forbidden.media_upload_required` — e il passo 4.5 sembra un difetto del
prodotto mentre e' un difetto del banco.

Aggiunta a mano durante la corsa una seconda assegnazione `media.upload` sulla
serata a pagamento; il passo si comporta allora come scritto. Il runbook porta
ora la precondizione `PRE-MEDIA`; **lo script no**.

## 3. Tre rifiuti in inglese portano il conteggio in italiano

**File:** `src/app/(admin)/admin/members/actions.ts` (i dettagli delle cause di
`deleteAccount`) e il conio di `holder_label`.

Osservato: `(1 biglietto)`, `(1 assegnazione ricevuta)`, `(1 scansione operata
alla porta)` dentro frasi interamente inglesi; `holder_label` vale `1 di 2` e
`2 di 2` su un biglietto che lo staff legge alla porta. ROADMAP fissa
l'interfaccia in **inglese**.

Non blocca niente e non e' un difetto d'accesso. E' copy, e si vede in due
posti che contano: una pagina amministrativa e lo schermo della porta.

## 4. Il dialogo di creazione account nomina una coda che non esiste piu'

**Superficie:** pagina membri, testo sopra il modulo «Create an account».

> *«Creating an account approves it. The person is admitted to the community
> without going through the pending queue, and the act is recorded with your
> name against it.»*

Dopo questa fase **non esiste nessuna coda di approvazione**. La frase descrive
un prodotto che non c'e'.

**Perche' il censimento di 50-09 non la vede:** quel censimento guarda
dichiarazioni, identificatori e rami — non prosa rivolta a un operatore. E' la
stessa Classe 1 gia' aperta li', su una superficie invece che in un commento.

## 5. `Your Drinks` resta su «Loading your drinks…» per sempre se un token non si risolve

**Superficie:** `/events/<slug>/menu` da ospite.

Osservato **in condizione sintetica**: iniettato a mano nel `localStorage` un id
d'ordine che non esiste, la sezione «Your Drinks» resta su *«Loading your
drinks...»* senza limite e **senza dire niente**. Nessun errore, nessuna frase.

**La condizione era artificiale**, ed e' la ragione per cui questa voce e'
un'osservazione e non un difetto accertato — ma un ospite il cui ordine sia
stato cancellato o rimborsato arriverebbe nello stesso stato per una strada
vera. E' la forma che `meta-gates.md` chiama *fallimento silenzioso*, su una
superficie da ospite.

**Da accertare prima di ripararlo:** se il percorso sia raggiungibile senza
iniezione.

## 6. Il catalogo dei format del laboratorio non e' fedele alla produzione

**Tabella:** `public.formats`, sui due database, letta nella stessa corsa.

| | laboratorio | produzione |
|---|---|---|
| righe | **cinque** | **quattro** |
| il format **cancellato il 2026-08-20** | **presente**, `listed: true`, `retired_at: null` | **assente** |
| colore di RamaDub | `#FF7A2F` | `#6E8BFF` |

La sigla del format cancellato **non si scrive qui**: vale il gate di
`production-calendar.md`, *una sigla ritirata non si cita, nemmeno per spiegare
la storia*.

**Le due conseguenze:**

1. **Sulla barra pubblica del laboratorio compare un filtro per un format che
   non esiste piu'**, e il colore che porta RamaDub e' quello che
   `brand-visual-system.md` dichiara **senza proprietario** dal 2026-08-20.
2. Il laboratorio e' dichiarato *«fedele alla produzione»* e su questa tabella
   **non lo e'**. Nessuna delle otto procedure di questa fase dipende da
   `formats`; la prossima potrebbe, e la misurerebbe contro un catalogo che la
   produzione non ha.

**Proprietario naturale:** chi possiede il laboratorio, con un allineamento di
`formats` — non una migration, perche' la produzione e' gia' corretta.

---

## 7. DECISIONE DEL PROPRIETARIO — lo schermo della porta mostra il nome dell'acquirente

**Trovata percorrendo `P-50-8`** (checkpoint del piano 50-10, 2026-09-21, sul
laboratorio, su un telefono in modalita' aereo). Visibile in due schermate su
quattro: sotto il segno di spunta verde della prima lettura e sotto l'orologio
viola della seconda.

**Cosa dicono le decisioni gia' prese.** `D-50-18b`: il nome raccolto dal modulo
gratuito va **all'account**, non allo schermo dello staff. `D-49-03`: il
biglietto e' **al portatore** — quindi il nome sullo schermo non e' nemmeno
un'informazione su chi sta effettivamente passando la porta, ma su chi ha
comprato.

**Non arriva da `holder_label`,** che `P-50-7` ha verificato privo di nome e che
lo e' ancora. Arriva dal profilo, lungo un percorso che esiste da prima di
questa fase:

| Dove | Cosa fa |
|---|---|
| `src/app/api/tickets/attendance/route.ts:814-864` | la lista scaricata sul telefono legge `profiles.full_name` e lo mette nel campo `name` |
| `src/lib/offline/checkin-store.ts:786-789` | la coda offline lo conserva, con la regola monotona che non lo cancella mai |
| `src/app/(admin)/admin/scanner/ScannerClient.tsx:2186` | lo schermo lo rende, offline |
| `src/app/api/tickets/checkin/route.ts:1077-1095` | il percorso online fa la stessa lettura dal server |

**Cosa ha cambiato la fase 50.** Non il comportamento: la **copertura**. Prima,
chi comprava da ospite senza lasciare un nome finiva sullo schermo come *«Ticket
holder»*; ora il modulo gratuito raccoglie il nome, `handle_new_user` lo scrive
nel profilo, e **ogni acquirente** arriva alla porta con il proprio nome
stampato sullo schermo dello staff. Un comportamento che riguardava i soli
membri ora riguarda tutti.

**Le due strade, e cosa costa ciascuna.**

1. **Nasconderlo** — lo schermo della porta mostra il livello, l'ora e l'esito,
   non il nome. Coerente con `D-50-18b` e con il biglietto al portatore. Costa
   una modifica al **percorso della porta**, che e' codice critico: tocca la
   lista scaricata, la coda offline e due schermate, e va provata di nuovo con
   la radio spenta. E toglie allo staff l'unico appiglio che oggi ha per
   distinguere due letture ravvicinate davanti a una fila.
2. **Accettarlo** — e allora `D-50-18b` va **riscritta**, perche' oggi dice una
   cosa che il prodotto non fa. Costo zero di codice, costo pieno di coerenza:
   una decisione che descrive male il prodotto e' peggio di una decisione
   assente, perche' chi la legge ci costruisce sopra.

**Non si tocca in questo piano, e non per prudenza generica:** la porta si
modifica sapendo cosa si rompe, non di rimbalzo a una verifica che stava
provando un'altra cosa. **Proprietario naturale:** chi possiede il prodotto,
nella fase che segue.

## Registrato dall'orchestratore il 2026-09-21, dopo P-50-8 — decisioni e discrepanze viste dal proprietario

### §7 — RISOLTA: il nome sullo schermo della porta
**Decisione del proprietario, 2026-09-21:** lo scanner mostra **solo l'esito e il tipo
di biglietto, nessun nome**. Il biglietto e' al portatore (`D-49-03`); un nome sullo
schermo fa respingere un ospite valido che non e' chi ha prenotato. **Si fa nella
fase 51**, che possiede porta, scanner e coda offline, e si riverifica con la radio
spenta. I punti che rendono il nome sono quelli citati sopra in §7.

### Osservate dal proprietario sulle schermate del lab (2026-09-21, 18:01–18:10)

**Porta (fase 51):**
- L'avviso «member list NOT refreshed» resta acceso anche con il badge «Online»
  (gia' in 49-ESITI) e parla di *member list*, vocabolario smontato da questa fase.
- L'intestazione con il pulsante «QR Scan» scorre via: in tre schermate su quattro
  titolo e pulsante sono sotto la barra di stato. Alla porta va resa fissa.
- Il velo dell'esito e' semitrasparente: «Scanner paused» e la lista sotto
  attraversano il risultato. Zona del risultato opaca, leggibile in un colpo d'occhio.

**Pagina dell'ordine `/tickets/order/[token]` e mail dell'ordine (ritocco prima del
listing della 003, fuori dalla fase 50 — proprietario: fase 52 o task immediato):**
- **Il QR non si vede nel corpo della mail su Gmail web**: riquadro vuoto con il testo
  alternativo, il codice arriva solo come allegato. La 49 lo aveva registrato per
  l'app Gmail. Alla porta il cliente mostra la mail: e' la voce piu' urgente. Causa
  probabile: immagine spedita come allegato e non `inline` con `content_id`.
- La mail dice «il pagamento e' andato a buon fine» anche per una prenotazione
  gratuita: serve il ramo del testo per l'ordine a zero.
- Il saluto usa la parte locale dell'indirizzo invece di `full_name` (D-50-18b
  consente di salutare per nome).
- Accenti scritti con l'apostrofo («e'», «c'e'», «cosi'», «gia'») su pagina e mail.
- Pagina e mail in italiano mentre l'app e' in inglese (decisione di milestone:
  inglese). Da uniformare.
- Etichetta «RE:SONATE» in maiuscolo sulla pagina dell'ordine: la grafia e'
  `re:sonate` minuscolo. Mittente «Resonate» e pie' di pagina «Resonate Music
  Events Community»: brand e parola *community* da rivedere.
- Colore rosso corallo su titolo, link e pulsante della mail: da verificare contro il
  token dell'accento (`#FF5C93`).
- Minori: «Lab Free Night - RSVP» ripete il nome della serata; la mail mostra solo
  l'ora d'inizio, la pagina l'intervallo.
