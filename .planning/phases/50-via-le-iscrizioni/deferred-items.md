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
