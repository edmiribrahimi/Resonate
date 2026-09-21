---
phase: 50-via-le-iscrizioni
plan: 06
subsystem: access-gating
tags: [registrazione, navigazione, pwa, gate-meccanici, rotte-tipizzate]
requires:
  - "50-02 — la migration provata sul laboratorio (dipendenza di onda, nessun accoppiamento di codice)"
provides:
  - "l'indirizzo dell'iscrizione non esiste piu': 404, nessun redirect lo ripesca"
  - "/ rimanda a /events per tutti, anche per chi ha una sessione"
  - "l'app installata si apre su /events invece di pagare un salto a ogni avvio"
  - "un anonimo trova Account nella barra, e lo porta alla pagina d'accesso"
  - "la pagina d'accesso dice a chi ha comprato dove trovare il proprio biglietto"
affects:
  - "50-05 — RsvpButton porta l'ultimo rimando vivo insieme a 50-07"
  - "50-07 — CopyReferralLink porta l'altro"
  - "50-09 — eredita NAV_ITEMS senza cancelli su status, e la firma da smontare"
  - "fase 52 (NAV-01, NAV-02) — eredita una barra senza Home e una Gallery senza cancello"
tech-stack:
  added: []
  patterns:
    - "una voce di barra con due destinazioni risolte nel filtro, mai due voci con la stessa etichetta"
    - "una superficie che perde il markup esce da CONVERTED ed entra in NON_DECLARABLE, stesso commit"
key-files:
  created: []
  modified:
    - "src/app/page.tsx"
    - "src/lib/rbac/roles.ts"
    - "src/components/layout/AppNav.tsx"
    - "src/app/(auth)/login/page.tsx"
    - "src/app/(public)/events/[slug]/SecretVenueDialog.tsx"
    - "src/app/(public)/events/[slug]/menu/GuestLoginBanner.tsx"
    - "next.config.ts"
    - "public/manifest.json"
    - "scripts/conversion-manifest.mjs"
    - ".planning/phases/50-via-le-iscrizioni/deferred-items.md"
  deleted:
    - "src/app/(auth)/register/page.tsx"
decisions:
  - "I task sono stati eseguiti in ordine 3 → 2 → 1: con typedRoutes cancellare la pagina prima dei link che vi puntano rende rosso il build"
  - "`hideWhenAuth` TOLTO, campo e ramo del filtro — era senza consumatori dopo l'uscita di Home"
  - "L'indirizzo per l'anonimo si risolve con un campo `hrefWhenAnonymous` e una map dopo il filtro, non con una seconda voce"
  - "`/` spostata da CONVERTED a NON_DECLARABLE in conversion-manifest.mjs — deviazione non prevista dal piano"
metrics:
  duration: "~50 minuti"
  completed: "2026-09-21"
  tasks: 3
  commits: 3
  files_changed: 11
---

# Phase 50 Plan 06: Via la pagina d'iscrizione, la home e i suoi rimandi — Summary

L'indirizzo dell'iscrizione non esiste piu' e nessuna superficie del prodotto vi
rimanda; `/` e' un rimando a `/events` per tutti, l'app installata si apre li', e
un anonimo trova nella barra una voce Account che lo porta alla pagina d'accesso
— dove la riga sotto il modulo dice a chi ha comprato di usare il link nella
propria mail.

## Cosa e' stato fatto, in tre commit

| Commit | Task | Cosa |
|---|---|---|
| `c4bace4` | 3 | i tre rimandi nelle superfici — il chip del dialogo venue, i **due** del banner drink |
| `56d45f6` | 2 | la barra (Home via, Gallery senza cancello, Account per l'anonimo) e la frase d'accesso |
| `74a577f` | 1 | la pagina cancellata, la home ridotta a un rimando, i tre artefatti fuori da `src/` |

**I task sono stati eseguiti in ordine 3 → 2 → 1, e non e' un capriccio.** Il
progetto ha `typedRoutes: true` (`next.config.ts:34`): cancellare la pagina prima
di togliere i `<Link>` che vi puntano rende **rosso il build**, e l'ho misurato
invece di dedurlo — la prima corsa ha fallito con
`Type '/register?next=${string}' is not assignable to type 'UrlObject | RouteImpl<…>'`
su `login/page.tsx:220`. Nell'ordine del piano, il commit del task 1 sarebbe
stato un commit che non compila. Invertendo, **ogni commit e' verde da solo**: i
rimandi escono mentre la pagina esiste ancora, e la pagina esce quando non la
punta piu' nessuno.

## Evidenza, per requisito

### REG-01 — l'indirizzo dell'iscrizione risponde 404, senza redirect

| Cosa | Evidenza |
|---|---|
| la pagina non esiste | `src/app/(auth)/register/page.tsx` **cancellata** (`74a577f`); `test ! -d "src/app/(auth)/register"` → vero |
| non e' piu' una rotta | la tabella delle rotte di `npm run build` **non stampa piu'** `/register`; stampava `○ /register` prima del commit |
| nessun `signUp` sopravvive | `/usr/bin/grep -rc "auth.signUp" src/` → **0 su tutto `src/`**. Era l'unico di tutto l'albero (`D-50-06` lo dichiarava, ed era esatto) |
| l'alias italiano e' uscito | `next.config.ts:89-91` porta **tre** redirect; erano quattro. `/usr/bin/grep -c "registrati" next.config.ts` → 0 |
| nessun redirect lo ripesca | nessuna voce in `redirects()` nomina piu' quell'indirizzo, e non ne e' stata aggiunta nessuna al suo posto |

**Il fatto che va letto, non scoperto**, ed e' scritto accanto alla riga tolta
(`next.config.ts:63-86`): quel redirect era `permanent: true`, cioe' un **308**, e
un 308 **lo memorizza il browser**. Chi ha seguito quell'alias anche una sola
volta continuera' a essere mandato sulla pagina cancellata **dalla propria
cache**, anche dopo questa rimozione. Non e' un difetto della modifica — e' la
proprieta' di un redirect permanente — e sta nel registro delle minacce come
`T-50-28`, disposizione `accept`. **`P-50-1` va percorsa da un browser che
l'aveva seguito**, non da uno pulito: uno pulito non direbbe nulla. Il service
worker non attenua: `src/app/sw.ts:129-158` cancella ogni documento in cache a
ogni rilascio, quindi il rischio residuo e' il **solo** ingresso di redirect HTTP
del browser.

### REG-02 — nessuna superficie rimanda piu' all'iscrizione

I rimandi erano **sei**, piu' due artefatti fuori da `src/`. Ecco dove sono
finiti tutti e otto.

| # | File:riga (prima) | Chi lo toglie | Stato |
|---|---|---|---|
| 1 | `src/app/page.tsx:149` — il pulsante `Join` | **50-06** | via con la pagina intera (`74a577f`) |
| 2 | `SecretVenueDialog.tsx:237` — chip `Sign up` | **50-06** | via il chip; `Sign in` resta a `SecretVenueDialog.tsx:253` |
| 3 | `RsvpButton.tsx:67` | **50-05** | **ancora presente** — non mio |
| 4 | `login/page.tsx:187-222` | **50-06** | la frase nuova e' a `login/page.tsx:223` |
| 5 | `GuestLoginBanner.tsx:108` | **50-06** | via; resta il solo link d'accesso a `:120` |
| 6 | `GuestLoginBanner.tsx:175` | **50-06** | via con la prop `onSignUp`; resta il pulsante d'accesso a `:187` |
| 7 | `next.config.ts:66` — l'alias italiano | **50-06** | via (`74a577f`) |
| 8 | `public/manifest.json:5` — `start_url` | **50-06** | a `/events`, `public/manifest.json:5` |

**I numeri 5 e 6 non erano nominati da `50-CONTEXT.md`**: li ha trovati
`50-RESEARCH.md` §7.1, ed e' la ragione per cui i rimandi erano sei e non quattro.

**L'esito del grep che conta**, richiesto dal task 3:

```
/usr/bin/grep -rn "/register" src/
```

**Non e' a zero, e i due che restano appartengono ad altri piani della stessa
onda** — riportati invece che riparati, perche' una riparazione fuori perimetro
e' un conflitto che si scopre in fase di unione:

| File:riga | Forma | Piano che lo possiede |
|---|---|---|
| `src/app/(public)/events/[slug]/RsvpButton.tsx:67` | `window.location.href = \`/register?next=…\`` | **50-05** |
| `src/components/membership/CopyReferralLink.tsx:68-69` | `/register?ref=…` | **50-07** |

Nessuno dei due e' un `<Link>` tipizzato — sono assegnazioni di stringa e testo
per gli appunti — e per questo **non fanno fallire il build** ne'
`verify:routes`, che legge i letterali visibili staticamente. Chi li togliera'
non trovera' un rosso ad aspettarlo: **lo trova scritto qui.**

Le altre occorrenze del grep sono **prosa o un altro indirizzo**:
`/admin/members/register` (la pagina con cui l'organizer crea un account,
`capability-routes.ts:361`, **resta**), commenti in `menu/actions.ts:343`,
`GuestDrinkMenu.tsx:129`, `api/auth/callback/route.ts:197`, `Chip.tsx:24`, e le
tre note storiche segnalate in fondo a questo documento.

### REG-04 — chi entra ancora, e da dove

| Cosa | Evidenza |
|---|---|
| `/login` resta | `src/app/(auth)/login/page.tsx`, rotta `○ /login` nella tabella del build |
| raggiungibile dalla barra da anonimo | `src/lib/rbac/roles.ts:312` — la voce Account porta `hrefWhenAnonymous: "/login"`, e `requireAuth` e' passata a `false` (`roles.ts:317`) |
| la frase decisa dal proprietario | `src/app/(auth)/login/page.tsx:223`, **alla lettera, in inglese, senza alcun link** |

**Senza link, e non per pigrizia**: non c'e' piu' una pagina dove mandare chi
legge, e un link che porta a un 404 e' peggio di nessun link — promette una
strada e la interrompe **dopo** il clic, cioe' nel punto in cui la persona ha
gia' smesso di cercare altrove.

## Le tre decisioni che il piano chiedeva di dichiarare

### 1. `hideWhenAuth` e' stato TOLTO, non lasciato senza consumatori

Il piano dava la scelta e chiedeva di dichiararla. **Tolto**: campo
dall'interfaccia `NavItem` e ramo dal filtro. Era consumato dalla sola voce
`Home` — verificato con
`/usr/bin/grep -rn "hideWhenAuth" src` prima della modifica: due occorrenze, entrambe
in `roles.ts`, nessun altro file del repo. Un campo booleano **obbligatorio** che
nessuna voce mette a `true` e' una domanda che ogni voce futura deve continuare a
rispondere per niente. La ragione dell'uscita e' scritta a `roles.ts:186-190`.

### 2. `/gallery` perde `requireApproved`, e non e' un allargamento

`src/lib/rbac/roles.ts:229` → `requireApproved: false`. Era **un cancello su
`status`**, e D-50-04 pretende che non ne sopravviva nessuno.

**Non allarga l'accesso, e la ragione e' misurata**: la pagina **non ha alcuna
guardia propria** — filtra `event_media.status = 'approved'` e basta
(`src/app/(public)/gallery/page.tsx:51`), non compare in `capability-routes.ts`,
e **chi ne conosce l'indirizzo ci arriva gia' oggi**, anche da anonimo, anche
prima di questa modifica. Cio' che cambia e' solo che la scheda viene
**disegnata** a chi prima non la vedeva. *Hiding a nav item is not protecting a
route* (`access-gating.md`, gate *coerenza navigazione/permessi*): questa riga
non ha mai protetto niente, quindi toglierla non apre niente.

**Debito dichiarato con il nome della fase che lo chiude: 52, `NAV-02`.** La
ragione sta accanto alla riga (`roles.ts:210-223`), non in questo documento
soltanto.

### 3. La firma di `getVisibleNavItems` NON e' cambiata

`STATUSES` e' ancora li' (`roles.ts:104-108`), il parametro `status` e' ancora
nella firma, il ramo `requireApproved` e' ancora nel filtro. Li smonta il piano
**50-09** coi suoi tredici punti d'innesto. Qui e' cambiato **cosa** contiene
`NAV_ITEMS`, non **come** viene filtrato — ed e' scritto dentro il campo stesso
(`roles.ts:149-160`) perche' il prossimo lettore non lo tolga credendo di fare
pulizia mentre un altro piano ci lavora sopra.

## La voce Account: una voce, due destinazioni

Il piano chiedeva di risolvere la differenza **dentro il filtro**, non con due
voci che si escludono a vicenda. Fatto cosi':

- un campo nuovo sull'interfaccia, `hrefWhenAnonymous: Route | null`
  (`roles.ts:140`), **obbligatorio** come `capability`: le quattro voci che
  rispondono `null` stanno rispondendo, non astenendosi;
- il filtro resta un filtro, e in coda **mappa** l'indirizzo
  (`roles.ts:472-476`): senza sessione la voce prende `hrefWhenAnonymous`, con
  una sessione tiene il proprio.

**Non e' un controllo d'accesso e il codice lo dice di se'** (`roles.ts:465-471`):
decide un indirizzo da disegnare, non chi puo' raggiungerlo. `/dashboard` resta
protetto da `capability-routes.ts` e dal middleware, e un anonimo che lo scrive a
mano viene rimbalzato esattamente come prima. `AppNav` e' `"use client"` e
continua a **disegnare cio' che riceve**, senza risolvere niente per conto suo —
una decisione presa li' e' una decisione che il lettore puo' modificare.

**Il docblock degli esiti e' stato RIMISURATO, non ritoccato** (`roles.ts:326`).
Diceva *«Non autenticato: Home, Events, Gallery — 3 schede»* e distingueva
quattro righe per stato di approvazione: **nessuna di quelle righe si verifica
piu'.** Gli esiti oggi:

| Soggetto | Schede |
|---|---|
| **anonimo** | Events, Gallery, **Account → `/login`** (3) |
| **account con ruolo `member`** | Events, Gallery, Account → `/dashboard` (3) — **una riga dove ce n'erano tre** |
| **organizer o master** | Events, Gallery, Check-in, Account (4) |
| **staff** | Events, Gallery, Account, **piu' Check-in se assegnato a una serata viva** |

**Il ramo della porta e' intatto.** Check-in resta filtrato su
`CAP.DOOR_OPERATE`, che e' lo **stesso predicato del middleware**, e il docblock
porta la nota contro la riparazione sbagliata: aggiungere qui un controllo sulla
porta e' la riparazione che chiude la porta davanti a una fila.

## Deviazioni dal piano

### 1. `[Rule 3 — bloccante]` L'ordine dei task e' stato invertito: 3 → 2 → 1

**Trovato durante:** il primo build del task 1.
**Problema:** `typedRoutes: true` fa fallire il typecheck su ogni `<Link>`,
`<Chip href>` e `<Button href>` che punta a una rotta cancellata. Nell'ordine del
piano, il commit del task 1 non compila.
**Fatto:** i rimandi escono per primi, la pagina per ultima. Nessun contenuto e'
cambiato rispetto al piano — solo la sequenza dei commit.
**Verifica:** `npm run build` esce con 0 **dopo ognuno** dei tre commit, non solo
alla fine.

### 2. `[Rule 3 — bloccante]` `/` spostata da `CONVERTED` a `NON_DECLARABLE`

**Trovato durante:** il task 1, dal gate.
**Problema:** con la home ridotta a un rimando, `npm run verify:conversion` e'
diventato **rosso su due controlli**: **D** (*«1 converted page(s) do not import
the shell: `/` src/app/page.tsx»*) ed **E** (*«1 surface(s) reserve navigation
clearance they do not mount»*). Il piano non lo prevedeva: nominava la sola voce
`/register` di quel file.
**Ed erano rossi giusti, non falsi allarmi**: la pagina davvero non importa piu'
`PageShell` e davvero non monta piu' la barra.
**Fatto:** la voce `/` e' uscita da `CONVERTED` ed e' entrata in
`NON_DECLARABLE` (`scripts/conversion-manifest.mjs:380`), con la ragione che
viaggia con la voce, come ogni lista di quel file pretende.

**Perche' e' il movimento giusto e non una scorciatoia.** La voce `/admin` di
quella stessa lista lo prescrive, letta al contrario: *«se un piano futuro da'
markup a quella rotta … diventa dichiarabile, e questa voce esce nello STESSO
COMMIT della sua voce CONVERTED»*. Qui e' successo il verso opposto — una
superficie ha **perso** il proprio markup — e la regola si applica uguale.

**E va detto come e' stata trovata**, perche' `D-41-16` dice che *un'esenzione
trovata su una corsa rossa e' un'esenzione di cui nessuno si fida*: **questa e'
stata trovata cosi'.** Il rosso e' stato il **segnale**, non la ragione: cio' che
e' cambiato e' il file, non il criterio. Il criterio 1 legge *«ogni pagina che
disegna una superficie»*, e un rimando non disegna niente e non mostra a nessuno
una schermata mezza convertita. **Nessuna asserzione e' stata allargata** —
allargarla sarebbe stato l'unico modo di spegnere un gate invece di aggiornarlo.
La nota e' scritta per intero dentro la voce, non solo qui.

**Conseguenza sul censimento**, rimisurata e scritta nel file
(`conversion-manifest.mjs:352-365`): da **41 = 38 + 2 + 1** (misurato il
2026-08-14) a **44 = 36 dichiarate + 6 in attesa di un'altra fase + 2 non
dichiarabili**. Le due differenze sono dello stesso commit: una pagina cancellata
e una passata di lista.

### 3. `[Rule 1 — riga falsa]` Il ramo `isActive` su `/` in `AppNav`

`AppNav.tsx` aveva un ramo `item.href === "/"` per decidere la scheda attiva. Con
la voce `Home` uscita, nessuna voce ha piu' quell'indirizzo: era un ramo
irraggiungibile che **suggerisce al prossimo lettore che la voce esista ancora**.
Tolto, con la ragione accanto (`AppNav.tsx:240-249`). L'icona `home` invece
**resta** nel dizionario dei glifi, dichiarata come senza consumatori, perche' la
52 decide se la voce torna e ridisegnarla fra una fase sarebbe due autori per lo
stesso glifo.

### 4. Tre criteri d'accettazione erano letteralmente insoddisfacibili

Tre `grep` del piano non possono restituire il valore chiesto, e lo dico invece
di lasciarli rossi a un verificatore:

| Criterio del piano | Perche' non regge | Cosa e' vero invece |
|---|---|---|
| `grep -c "/register" scripts/conversion-manifest.mjs` → 0 | il file contiene `/admin/members/register`, **un altro indirizzo, vivo**, che la fase 50 conserva (e' la pagina con cui l'organizer crea un account) | `grep -c '"/register"' …` → **0**: nessuna voce ha piu' quell'indirizzo. Le 6 occorrenze residue sono prosa, piu' la voce dell'indirizzo admin |
| `grep -c "register" SecretVenueDialog.tsx` → 0 | — | **0**. Ottenuto scrivendo la ragione della rimozione senza citare il token |
| `grep -c "register" GuestLoginBanner.tsx` → 0 | — | **0**, stessa strada |

Nei file dove il criterio era un conteggio esatto — `login/page.tsx` (`register`
→ 0, la frase nuova → 1), `roles.ts` (`href: "/"` → 0) — i commenti sono stati
scritti **senza** i token, cosi' che il criterio passi come e' scritto e la
ragione resti comunque nel file.

## Cosa NON e' stato toccato, e perche'

- **`scripts/verify-routes.mjs`**: `git diff --name-only d4033eb..HEAD` **non lo
  include**. `PUBLIC_ALLOW` non conteneva quell'indirizzo — verificato — e una
  modifica non necessaria a un gate delle rotte e' un modo di allargarlo per
  sbaglio.
- **La logica del dialogo del venue segreto**: e' uscito **solo il chip**.
  Nessuna condizione di disegno, nessun predicato, nessuna riga su chi vede cosa.
  `src/lib/venue-reveal/venue-disclosure.ts` non e' stato aperto.
  `verify:venue-surfaces` non e' stato modificato.
- **`profiles.status`, `referred_by`, `approved_via`**: nessun file di questo
  piano li legge o li scrive. `src/app/page.tsx` ne leggeva uno indirettamente
  via `getAccessContext()` e **ora non legge piu' nulla**. Il codice regge con o
  senza quelle colonne, che e' il vincolo della finestra di deploy (D-50-24).
- **I file di 50-05 e 50-07**: `RsvpButton.tsx`, `CopyReferralLink.tsx`,
  `members/**`, `MemberTable`, `growth` — non aperti.
- **`GuestDrinkMenu.tsx`**: fuori perimetro, vedi debito qui sotto.

## Verifica — cosa ho eseguito e cosa ho visto

**In questo repo non esiste un test runner per il prodotto**, quindi niente qui
e' verificato perche' «i test passano». Quello che ho eseguito, e l'esito:

| Comando | Esito | Quando |
|---|---|---|
| `npm run build` | **0** | dopo ognuno dei tre commit |
| `npm run verify:routes` | **PASS — tutti e tre i controlli verdi** | dopo ognuno dei tre |
| `npm run verify:conversion` | **CONVERSION_OK — all six checks passed over 36 declared surface(s), 213 file(s) scanned** | dopo il task 1 |
| `npm run verify:dialogs` | **0** | dopo il task 3 e a fine piano |
| `npm run verify:no-header-identity` | **0** | dopo il task 1 |
| `npm run verify:no-credit-account` | **0** | dopo il task 1 |
| `verify:tokens`, `:semantic-separation`, `:breakpoints`, `:no-viewport-read`, `:tables` | **0** | a fine piano |

**Due gate escono con 1, ed erano rossi PRIMA di questo piano.** Entrambi sono
gia' registrati in `deferred-items.md` dal piano 50-02, e li ho **riconfermati
sul commit di partenza `d4033eb`, prima di qualunque mia modifica**:

| Gate | Cosa dice | Mio? |
|---|---|---|
| `verify:venue-surfaces` | G2 — `src/app/(public)/payment/callback/actions.ts` seleziona `{id, status, sumup_checkout_id, ticket_id}`, l'insieme autorizzato e' `{id, status, ticket_id}` | **no** — quel file e' stato toccato l'ultima volta da `45be363` (fase 49) |
| `verify:touch-targets` | i **tre** elementi noti: `GuestTokenDisplay.tsx:689` e `:702`, `src/emails/ticket-order.tsx:231` | **no** — nessuno dei tre e' in un file che ho aperto |

`verify:capabilities` **non e' eseguibile qui**: pretende
`SUPABASE_ACCESS_TOKEN` e `NEXT_PUBLIC_SUPABASE_URL` e si ferma dichiarandolo
(*«Nothing was measured»*). Non ho toccato il catalogo delle capability — solo
`NAV_ITEMS`, che quel gate non legge.

### Le prove manuali che restano al proprietario (P-50-1)

**Non le ho percorse, e non fingo il contrario.** Passi, con cosa si deve
osservare:

1. **L'alias italiano da un browser che l'aveva seguito** (non da uno pulito, che
   non direbbe nulla): aprire l'indirizzo italiano dell'iscrizione sullo stesso
   browser che lo aveva gia' visitato prima del rilascio. **Atteso: un 404.** Se
   arriva invece un rimando seguito da 404, e' il 308 in cache — l'esito
   dichiarato in `T-50-28`, non un difetto.
2. **L'indirizzo dell'iscrizione, da anonimo e da loggato.** Atteso: **404 in
   entrambi i casi**, nessun rimando.
3. **`/` da anonimo e da loggato.** Atteso: **entrambi su `/events`**. Il
   secondo e' il caso che cambia: prima una sessione finiva sulla propria pagina
   account.
4. **L'app installata (PWA):** disinstallare, reinstallare, aprire. Atteso:
   **si apre su `/events`**, senza il lampo di un rimando. Chi ha l'app gia'
   installata puo' vedere il vecchio `start_url` finche' il manifest non viene
   riletto: e' comportamento del sistema operativo, non del codice.
5. **La barra da anonimo:** tre schede — Events, Gallery, **Account** — e Account
   porta alla pagina d'accesso. **Nessuna scheda `Home`.**
6. **La barra con una sessione:** Account porta alla propria pagina account, e la
   scheda si evidenzia mentre ci si e' sopra.
7. **La pagina d'accesso:** sotto il modulo c'e' la frase nuova, **e non e'
   cliccabile**. Nessun link rimasto.
8. **Il dialogo del venue segreto, da anonimo:** un chip solo, `Sign in`.
   **E l'indirizzo non compare, come prima** — questa e' la cosa da guardare per
   ultima e con piu' attenzione, perche' e' l'unica irreversibile.

## Debito lasciato, con il nome di chi lo chiude

Tre voci nuove in
`.planning/phases/50-via-le-iscrizioni/deferred-items.md` (piu' una conferma):

1. **`src/lib/routes/next-redirect.ts:72-73` nomina righe che non esistono
   piu'.** Il docblock dell'allow-list attribuisce due voci a
   `register/page.tsx:45` (cancellato) e a `GuestLoginBanner.tsx:42` e `:138`
   (di cui ne resta una). **Le due voci dell'allow-list restano giuste** —
   nessun pattern va aggiunto ne' tolto — e' la prosa a essere invecchiata. Non
   riparata qui perche' quel file **non e' nei miei `files_modified`** e
   dichiara di se' che toccare quella lista e' una decisione d'accesso.
   **Candidato: 50-05**, che riscrive uno dei due produttori nominati.
2. **`GuestDrinkMenu.tsx:366` passa `onSignUp`**, prop che non esiste piu'. Il
   sito di render e' **commentato** da prima di questa fase, quindi **nessun
   effetto oggi e build verde** — ma chi riabilitera' il pannello non compila
   finche' non toglie quella riga. Scritto anche **dentro**
   `GuestLoginBanner.tsx:132-141`, cosi' che lo trovi leggendo.
3. **Riconferma che `verify:venue-surfaces` G2 e' ancora rosso**, con la misura
   di *quando* si e' rotto (`45be363`, fase 49) e perche' non l'ho toccato:
   quel gate sta su `venue-secrecy.md`, dove allentare un'asserzione per far
   passare un rosso e' l'unica modifica del repo che non si annulla.

**Tre note storiche minori, non messe in `deferred-items.md`** perche' sono
prosa datata e non una pendenza operativa — nessuna di esse guida una decisione:

- `src/app/(auth)/set-password/SetPasswordForm.tsx:145` cita
  `(auth)/register/page.tsx:8-22` per le quattro regole della password;
- `src/components/ui/PageShell.tsx:24` elenca l'indirizzo cancellato fra le
  quattro rotte `focus`;
- `scripts/verify-no-header-identity.mjs:42` e `:235`, e
  `scripts/verify-no-credit-account.mjs:46`, lo citano come esempio storico.
  **Entrambi gli script escono con 0**: la citazione e' in un commento, non in
  un'asserzione.

## File cancellati

| Path | Perche' |
|---|---|
| `src/app/(auth)/register/page.tsx` | la pagina d'iscrizione. **223 righe**, e con lei l'unico `auth.signUp` di tutto `src/`. D-50-11: sparisce, l'indirizzo risponde 404, nessun redirect la ripesca. Cancellata con `git rm` nel commit `74a577f` |

**E' l'unico file cancellato da questo piano.** Nessun'altra cancellazione, e
nessuna rimozione accidentale: `git diff --diff-filter=D --name-only d4033eb..HEAD`
restituisce quella sola riga.

## Superficie di minaccia

Nessuna superficie nuova. Il registro del piano resta com'era, con due note che
questo documento chiude:

- **`T-50-27`** (iscrizione anonima con la chiave anonima, dopo che la pagina e'
  sparita) — **non chiusa qui, e non doveva esserlo**: questo piano toglie la
  **superficie**, non il **confine**. Il confine lo chiude `disable_signup` sul
  servizio Auth, piano **50-10** per il laboratorio e **50-11** per la
  produzione. Finche' non e' fatto, `POST /auth/v1/signup` risponde ancora —
  `access-gating.md`, *il middleware e' UX, il confine vero sta altrove*.
- **`T-50-28`** (cache calda sull'alias italiano) — **accettata e dichiarata**
  in `next.config.ts:69-79`, da provare in `P-50-1` da un browser che l'aveva
  seguito.
- **`T-50-30`** (il dialogo del venue modificato oltre il chip) — **mitigata**:
  e' uscito solo il chip, `verify:dialogs` e' verde, e `verify:venue-surfaces`
  e' rosso **su un file che non ho aperto** e per una ragione che precede questo
  piano.

## Self-Check: PASSED

File dichiarati, verificati su disco:

- `src/app/page.tsx` — FOUND, `redirect("/events")` a `:45`
- `src/lib/rbac/roles.ts` — FOUND, `hrefWhenAnonymous: "/login"` a `:312`
- `src/components/layout/AppNav.tsx` — FOUND
- `src/app/(auth)/login/page.tsx` — FOUND, la frase a `:223`
- `src/app/(public)/events/[slug]/SecretVenueDialog.tsx` — FOUND, `Sign in` a `:253`
- `src/app/(public)/events/[slug]/menu/GuestLoginBanner.tsx` — FOUND
- `next.config.ts` — FOUND, tre redirect a `:89-91`
- `public/manifest.json` — FOUND, `"start_url": "/events"` a `:5`
- `scripts/conversion-manifest.mjs` — FOUND, `/` in `NON_DECLARABLE` a `:380`
- `src/app/(auth)/register/page.tsx` — **CORRETTAMENTE ASSENTE**

Commit, verificati con `git log`:

- `c4bace4` — FOUND
- `56d45f6` — FOUND
- `74a577f` — FOUND
