---
phase: 35-per-night-assignments
plan: 17
subsystem: access-gating
tags: [middleware, coarse-gate, per-night, scanner, review, assign-01, wave-6]

# Dependency graph
requires:
  - plan: 35-15
    provides: "`live_assignment_capabilities` nel payload e `AccessContextResult.liveAssignmentCapabilities: Set<string> | null` — i tre stati che questo piano legge per posizione. Migration NON applicata"
  - plan: 35-09
    provides: "il terzo braccio di `door_scan_events_select_admin` su `party.manage` — senza, la pagina di revisione renderebbe vuoto a chi questo gate ammette"
  - plan: 35-10
    provides: "la lista serate filtrata per assegnazione su `/api/tickets/attendance` — e' li' che la restrizione per-notte diventa vera sullo scanner"
  - plan: 35-11
    provides: "le route della porta che stringono cio' che questo piano allarga"
  - plan: 35-12
    provides: "il fatto che la route di check-in chiede ancora la sola domanda di ruolo — la ragione per cui ASSIGN-01 NON e' consegnato qui"
provides:
  - "il gate grossolano allargato su `/admin/scanner` e su UNA rotta `/organizer/*`: ruolo OPPURE assegnazione viva del mestiere giusto, senza mai chiedere quale notte"
  - "tre cause di rimbalzo decise per posizione — `unavailable`, `context-stale`, `not-assigned-here` — piu' il rifiuto ordinario senza parametro, e tre avvisi distinti sul dashboard"
  - "il gate lato server dello scanner, con lo STESSO predicato del middleware"
  - "il primo gate per-notte su `party.manage` che puo' davvero fallire: cambiando `?party=` la stessa persona sulla stessa pagina viene rifiutata"
  - "il primo consumatore di `party.manage` in `src/` — la chiave era finora letta solo da una policy"
affects: [35-22, 35-VERIFICATION, 34]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "quando la domanda precisa non e' formulabile, la si spezza: test grossolano dove la si puo' solo porre male, test vero dove il soggetto esiste — e le due meta' stanno nello stesso piano"
    - "una allow-list di rotte con regex ancorata (`[^/]+`, coda `(?:/|$)`) invece di un prefisso d'albero: ogni rotta che ci entra deve gia' avere il proprio gate lato server"
    - "il verdetto rifiuta su `null`, la CAUSA distingue `null` da insieme vuoto: la sicurezza non si allenta e il fallimento resta osservabile"
    - "un gate per-notte valutato DOPO la risoluzione dell'input non fidato che nomina la notte — e' l'ordine a renderlo capace di fallire"
    - "un docblock che descrive una decisione rovesciata si sostituisce con la decisione di oggi E la ragione del cambio, mai si affianca"

key-files:
  created:
    - .planning/phases/35-per-night-assignments/35-17-SUMMARY.md
  modified:
    - src/lib/supabase/middleware.ts
    - src/app/(members)/dashboard/page.tsx
    - src/app/(admin)/admin/scanner/page.tsx
    - src/app/(organizer)/organizer/events/[id]/review/page.tsx

key-decisions:
  - "`context-stale` scatta OGNI volta che la chiave e' assente, non solo per chi ha assegnazioni: finche' la migration non e' applicata nessuno puo' avere un'assegnazione risolvibile, quindi un segnale acceso solo per loro non si accenderebbe mai. E' rumoroso di proposito e si spegne da solo quando la riga della coda atterra"
  - "Il verdetto rifiuta su `liveAssignmentCapabilities === null`. Ammettere su una chiave assente aprirebbe lo scanner a ogni account autenticato nel momento in cui una migration resta indietro — un'escalation innescata da un file non applicato. La distinzione fra assente e vuoto non e' persa: la porta la CAUSA"
  - "La causa d'assegnazione e' calcolata per le due sole regole che hanno consultato le assegnazioni. `/admin` e `/membership-card` non hanno braccio d'assegnazione: dirgli `not-assigned-here` spiegherebbe una decisione presa in un altro modo"
  - "La allow-list `/organizer/*` e' UNA rotta. `src/app/(organizer)/organizer/page.tsx` non ha nessun controllo lato server — verificato con `grep -rL` su ogni `page.tsx` del gruppo — e resta fuori, nominato nel file"
  - "Il predicato della pagina dello scanner e' identico a quello del middleware e non e' una coincidenza da mantenere: piu' stretto qui produrrebbe un secondo rifiuto davanti alla porta, che e' il timore del paragrafo vecchio e resta valido"
  - "Chi fallisce il gate della revisione senza `organizer.access` va a `/dashboard` e non a `/organizer/events`: quel percorso lo rimanderebbe indietro dal middleware, due redirect e un avviso che parla d'altro"
  - "Il criterio `grep -c my_access_context = 1` e' soddisfatto, ma e' un proxy piu' debole della proprieta' che intende: e' asserita anche la proprieta' vera (un solo `supabase.rpc(`, senza secondo argomento, zero `p_party_id`)"

requirements-completed: []

# Metrics
metrics:
  duration: "~70 min"
  completed: 2026-08-09
  tasks_completed: 3
  tasks_total: 3
  checkpoint_open: false
---

# Fase 35 Piano 17: la macchina diventa raggiungibile — Summary

**Una persona `staff` assegnata alla porta veniva rimbalzata a `/dashboard`
prima che la pagina dello scanner esistesse — prima del resolver, prima di
`requireDoorOperator({ partyId })`, prima del drain. Questo piano allarga il
gate grossolano e, nello stesso commitset, fa atterrare i due gate per-notte che
lo rendono sicuro.**

Il fatto che governa la forma: `src/lib/supabase/middleware.ts` chiama il
wrapper del contesto d'accesso **senza argomenti**, e non puo' fare altrimenti —
al momento del routing la notte non e' stata scelta, quindi la domanda per-notte
non ha un soggetto. Non e' un difetto da correggere: e' strutturale. Da li' la
soluzione in due meta' inseparabili — **il middleware e' UX, il confine e' lato
server** — e la ragione per cui spedirne una sarebbe stato un difetto e non una
consegna parziale.

---

## Cosa e' stato fatto

| Task | Nome | Commit | File |
|---|---|---|---|
| 1 | Il gate grossolano allargato, e le tre cause del rimbalzo | `d27c085` | `src/lib/supabase/middleware.ts`, `src/app/(members)/dashboard/page.tsx` |
| 2 | Lo scanner — gate lato server, docblock riscritto | `1583309` | `src/app/(admin)/admin/scanner/page.tsx` |
| 3 | La revisione — il gate per-notte che puo' fallire | `5ff30a5` | `src/app/(organizer)/organizer/events/[id]/review/page.tsx` |

**Lingua:** commenti e identificatori in inglese, come i file che estendono.
Interfaccia in inglese, decisione di milestone.

---

## Task 1 — il gate grossolano, e le tre cause

### Il campo, con i suoi tre stati intatti

`liveAssignmentCapabilities: Set<string> | null`, costruito dallo **stesso**
guardiano `Array.isArray` gia' usato per `capabilities` e con un verdetto
diverso quando fallisce: assente (o presente ma non-array) diventa `null`, mai
un `Set` vuoto.

Il piano 35-15 aveva lasciato l'avvertenza per nome, ed e' stata rispettata alla
lettera: **nessun `?? false` e nessun `?.has(...)` inline**. Il predicato e' una
funzione nominata:

```ts
const holdsByAssignment = (key: string) =>
  liveAssignmentCapabilities !== null && liveAssignmentCapabilities.has(key);
```

Scritta cosi' perche' il `null` sia un rifiuto **dichiarato** e non un incidente
dell'optional chaining: il verdetto e' lo stesso — si rifiuta quando non si puo'
sapere — ma chi arriva dopo trova una funzione con sopra il paragrafo, invece di
una modifica da un carattere che cancella in silenzio il terzo stato.

### Perche' il verdetto rifiuta su `null`, e perche' non e' un tradimento

Ammettere su una chiave assente aprirebbe `/admin/scanner` a **ogni account
autenticato** nel momento in cui una migration resta indietro: un'escalation di
privilegio innescata da un file non applicato. La distinzione fra *«coda di
migration indietro»* e *«non sei assegnato»* non e' persa dal verdetto — la
porta la **causa**, che e' esattamente dove 35-15 chiedeva che diventasse
osservabile.

### Le tre cause, e la quarta che non ha parametro

| Precedenza | Valore | Quando |
|---|---|---|
| 1 | `unavailable` | `capabilitiesResolveFailed`. **Invariato**, insieme all'header diagnostico |
| 2 | `context-stale` | `liveAssignmentCapabilities === null` — il payload non portava la chiave |
| 3 | `not-assigned-here` | `Set` non vuoto, ma nessuna chiave apre questa rotta |
| 4 | *(nessun parametro)* | `Set` vuoto — il rifiuto ordinario di sempre |

La precedenza non e' intercambiabile: quando il contesto non si risolve il campo
e' `null` **per quel motivo** e non per una migration mancante, e dire
`context-stale` li' manderebbe qualcuno a guardare la coda del database per un
disservizio.

`bounceToDashboard(cause = null)`: le tre regole non toccate continuano a
chiamarla senza argomenti e producono URL **byte-identici**. Solo le due regole
allargate passano una causa, e la causa d'assegnazione e' calcolata solo dove le
assegnazioni sono state davvero consultate — `/admin` e `/membership-card` non
hanno braccio d'assegnazione, e dirgli `not-assigned-here` spiegherebbe una
decisione presa in un altro modo.

### La decisione rumorosa, presa consapevolmente

**`context-stale` scattera' su ogni rifiuto delle due regole allargate finche' la
migration non e' applicata** — anche per un membro qualunque che non sarebbe
stato ammesso comunque. E' deliberato, e la ragione e' che l'alternativa non
funziona: finche' la chiave manca **nessuno** puo' avere un'assegnazione
risolvibile, quindi un segnale acceso solo per chi ha assegnazioni non si
accenderebbe **mai**. E' l'unico segnale che dice *«il deploy e' avanti al
database»*, non esiste error tracking che lo dica altrove, e si spegne da solo
quando la riga della coda atterra.

### La allow-list, e perche' non e' l'albero

```ts
const ORGANIZER_ASSIGNMENT_ROUTES: readonly RegExp[] = [
  /^\/organizer\/events\/[^/]+\/review(?:\/|$)/,
];
```

Ancorata a entrambi i capi: `/organizer/events/<id>/review` corrisponde,
`/organizer/events/<id>/x/review` e `/organizer/events/<id>/reviewers` no.

**Misurato, non assunto** — `grep -rL "capabilities.has\|ownsOrIsMaster\|assertStaffManage"`
su ogni `page.tsx` del gruppo `(organizer)` restituisce esattamente due file:

- `src/app/(organizer)/organizer/page.tsx` — un `redirect()` nudo, nient'altro.
  **Deliberatamente fuori dalla allow-list**, e nominato nel file.
- `src/app/(organizer)/organizer/events/[id]/media/page.tsx` — non ne aveva
  finche' il piano 35-16 non gliene ha dato uno. Anch'esso fuori.

Allargare `/organizer/*` in blocco li consegnerebbe a chiunque abbia una
qualunque assegnazione viva, perche' il middleware e' l'unica cosa davanti a
loro. La regola scritta accanto alla costante: **una rotta entra nella lista solo
quando ha gia' il proprio gate lato server**, e la lista cresce una rotta alla
volta, come decisione.

### L'ordine load-bearing, intatto

La modifica sta **dentro** il ramo esistente. `grep -n "admin/scanner"` da 346,
`grep -n 'startsWith("/admin")'` da 394 (primo commento a 348): la coppia
`if / else if` e' ancora nell'ordine dichiarato. Invertirla farebbe giudicare lo
scanner da `admin.access` e chiuderebbe fuori dalla porta ogni organizer.

### Il dashboard

Tre `const` distinti da un unico `accessCause`, tre banner, **nessun collasso**.
I testi dicono cosa fare e non nominano ne' migration ne' tabelle: chi legge e'
alla porta, non alla scrivania. `context-stale` dice che e' un problema di
configurazione e **non** un rifiuto di permesso; `not-assigned-here` dice che
l'assegnazione esiste ma non copre quello strumento, e di chiedere all'organizer
**di quella notte**.

Un valore che non e' uno dei tre **non rende nulla**: `?access=` e' una query
string, quindi input non fidato, e un avviso disegnato da un valore inventato
sarebbe una frase autorevole scritta da chi ha mandato il link (T-35-90).

---

## Task 2 — lo scanner: il gate, e il docblock sostituito

Il paragrafo *«No capability gate is added to this page, deliberately»* **non
esiste piu'**. Non e' affiancato, non e' commentato, non e' conservato come nota
storica — verificato: `grep -c` restituisce 0.

Al suo posto le tre frasi che il prossimo lettore chiedera':

1. **Perche' la decisione e' cambiata.** Quel paragrafo era **corretto quando e'
   stato scritto**: allora la regola di ruolo del middleware era la risposta
   completa, e non esisteva modo per chi non teneva `door.operate` di arrivare a
   quell'indirizzo. La fase 35 rende falsa quella premessa. Una decisione
   rovesciata senza la sua ragione si legge come una svista.
2. **Perche' il gate qui non e' per-notte e non puo' esserlo.** La serata si
   sceglie dentro `ScannerClient`: la domanda per-notte non ha soggetto qui, e
   inventarne uno sarebbe indovinare.
3. **Dove sta il confine vero**, per nome: `requireDoorOperator({ partyId })`
   nelle tre route della porta, che scrivono con il client service e non sono
   viste da nessuna policy; e la lista serate che l'API di attendance
   restituisce, filtrata per assegnazione dal piano 35-10 — chi e' assegnato a
   un'altra notte arriva alla pagina e **non trova quella notte nella lista**.

Il predicato e' **lo stesso** del middleware, dagli stessi due campi dello stesso
payload, e il file dice che se i due divergono e' questa la copia sbagliata. Un
predicato piu' stretto qui produrrebbe un secondo rifiuto davanti alla porta —
il timore che il paragrafo vecchio esprimeva, e che resta valido.

`getAccessContext()` risolto **una volta sola** (`grep -c` = 1) per i due prop di
`MobileNav` e per il gate. Il rimbalzo va a `/dashboard` nudo, senza causa: le
cause sono il vocabolario del middleware per una decisione di routing, e
arrivare a quella riga significa che il routing ha gia' detto di si'.

`<ScannerClient />` resta reso senza condizioni oltre al gate; i prop di
`MobileNav` non cambiano; STAFF-03 resta il posto in cui cambieranno.

---

## Task 3 — la revisione: un gate che puo' fallire

### L'ordine, che e' la sostanza

Oggi `ownsOrIsMaster` rifiutava **prima** che le serate fossero lette, e
`organizer.access` rifiutava prima ancora. Il braccio nuovo ha bisogno della
serata selezionata, quindi la sequenza e': leggere l'evento, leggere le serate,
risolvere `selectedParty` da `?party=` **con la validazione che gia' esisteva**,
e solo allora decidere.

```ts
const mayReviewThisNight =
  (holdsOrganizerAccess && ownsOrIsMaster(ctx, event.created_by)) ||
  (selectedParty !== null &&
    (await hasCapability(CAP.PARTY_MANAGE, { partyId: selectedParty.id })));
```

Il primo braccio e' **identico e corto**: `||` fa cortocircuito, quindi chi lo
passa non paga il round trip del secondo. Asserito per numero di riga —
`PARTY_MANAGE` a 199, `selectedParty =` a 162.

**E' l'ordine a renderlo un gate invece di una decorazione**
(`ai-engineering.md`, *un gate deve poter fallire*): siccome la domanda e' posta
sulla serata effettivamente selezionata, cambiare `?party=` verso una notte a cui
non si e' assegnati fa rifiutare **la stessa persona sulla stessa pagina**. Un
controllo issato sopra la risoluzione risponderebbe su un'altra notte, o su
nessuna, e passerebbe ogni volta (T-35-87).

Senza nessuna serata il braccio non ha soggetto e la risposta e' il rifiuto: non
si inventa un permesso in assenza del suo oggetto.

### Dove rimbalza

`refusalDestination`, deciso una volta: `/organizer/events` per chi tiene
`organizer.access` — **esattamente dove andava prima** — e `/dashboard` per chi e'
arrivato per assegnazione, che non lo tiene ed e' tipicamente `staff`. Mandarlo a
`/organizer/events` lo farebbe rimbalzare di nuovo dal middleware: due redirect e
un secondo avviso che parla di un'altra cosa. **Nessuno perde una destinazione
che aveva.**

### I due limiti dichiarati nel file

1. **Un evento non pubblicato non e' raggiungibile per assegnazione.** Chi arriva
   per il braccio nuovo non tiene `staff.manage`, quindi le policy di
   `public.events` e `public.event_parties` gli mostrano solo cio' che e'
   pubblicato: la lettura dell'evento fallisce **prima** del gate e la pagina
   rimbalza. Misurato, non dedotto — il piano 35-10 ha visto un assegnatario
   leggere 0 righe di `event_parties` su un evento non pubblicato. Per una lista
   di revisione, che si guarda **dopo** la serata, il limite e' stretto; ma e' un
   limite, e chiuderlo richiederebbe un braccio in piu' su quelle due policy,
   cioe' una migration che **non e' in nessuno degli otto requisiti**.
2. **Il gate protegge la pagina, la policy protegge le righe.** Il terzo braccio
   di `door_scan_events_select_admin` (piano 35-09) e' cio' che fa vedere
   qualcosa a chi questo gate ammette. Se qualcuno lo rimuovesse, questa pagina
   renderebbe una lista **vuota** — e su questa superficie una lista vuota e' lo
   stato **progettato** di una serata tranquilla: direbbe *«nessun problema»* a
   chi non ha il permesso di vedere i problemi. Le due meta' si citano per nome.

### Il `throw` che non va catturato

`hasCapability(key, { partyId })` **lancia** invece di restituire `false` quando
la risoluzione fallisce, ed e' scritto nel file che quel throw va lasciato
stare: catturarlo e rifiutare trasformerebbe *«non si e' potuto sapere»* in *«non
e' permesso»*, che e' la forma esatta che questa fase esiste per impedire.
L'effetto osservabile e' l'error boundary — una pagina rotta — ed e' piu' rumoroso
di una risposta sbagliata.

### Nient'altro toccato

Nessuna modifica alla lettura di `door_scan_events`, alla finestra della notte, a
`ReviewListClient` o ai suoi prop. Nessun client service introdotto:
`grep -c getServiceClient` = **0**.

---

## Verifica — e cosa questi verdi dicono davvero

**Non esiste un test runner per il prodotto.** Nessuna riga qui sotto significa
«i test passano». `npm run build` e' il gate dei tipi, non una prova di
comportamento.

| Controllo | Esito |
|---|---|
| `npm run build` | passa |
| `npm run verify:no-header-identity` | 2/2 verdi |
| `npm run verify:capabilities -- --target=container` | **5/5 verdi, 0 warning** — 12 chiavi, 26 grant, 22 rifiuti su 4 ruoli. Questo piano non conia chiavi e non tocca `ROLE_GRANTS` |
| `<verify>` Task 1 | `MIDDLEWARE_OK` |
| `<verify>` Task 2 | `SCANNER_PAGE_OK` |
| `<verify>` Task 3 | `REVIEW_PAGE_OK` |
| `git diff --name-only -- src/` contro la base | esattamente i **quattro** file del piano |
| Migration toccate | **nessuna** — questo piano e' interamente applicativo |

Nota laterale, non un'affermazione di merito: `verify:capabilities` elenca ora
`party.manage` fra le chiavi chieste da `src/`. Prima di questo piano la chiave
era letta solo da una policy.

### Cosa nessun comando qui prova

**Che una persona `staff` assegnata raggiunga davvero lo scanner.** Si osserva
solo con due sessioni e un build di produzione, e la procedura e' nel piano
35-14. Vale anche il falso verde gia' dichiarato in `35-HUMAN-UAT.md`: `npm run
build` e' verde con **zero** migration applicate, perche' i tipi vengono da
`src/types/database.ts` e nessun client e' parametrizzato con un generico
`Database`. Finche' la migration di 35-15 non e' applicata, il campo arriva
`null` e il gate allargato **si comporta come oggi**, con in piu' l'avviso
`context-stale`. E' il verso sicuro dell'accoppiamento migration→codice.

---

## Deviazioni dal piano

### 1. [Regola 3 — il criterio come scritto non era soddisfacibile senza perdita] `grep -c my_access_context = 1`

- **Trovata durante:** Task 1
- **Problema:** il criterio pretende che `grep -c 'my_access_context'` sul
  middleware restituisca **1**. Il file ne aveva **4**: la chiamata piu' tre
  menzioni in prosa (la ragione per cui la chiamata sta dentro `if (user)`, il
  payload che porta ancora `role`/`status`, e da dove viene l'identita').
- **Fatto:** riformulate le tre menzioni in prosa — *«the access-context
  wrapper»* — senza perdere un solo fatto: la funzione e' nominata per esteso
  sulla riga della chiamata, diciannove righe sotto la prima.
- **La parte che vale piu' della correzione:** il criterio e' un **proxy piu'
  debole della proprieta' che intende**. Il suo scopo dichiarato e' *«nessuna
  chiamata con un argomento»*, ma un file che chiamasse
  `rpc("my_access_context", { p_party_id })` **e** avesse le tre menzioni
  cancellate lo soddisferebbe — cioe' il criterio letterale e' superabile
  proprio dal difetto che sorveglia. Percio' e' asserita anche la proprieta'
  vera, ed e' verde: **un solo `supabase.rpc(`** nel file, **senza secondo
  argomento**, e **zero** occorrenze di `p_party_id`.
- **Commit:** `d27c085`

### 2. [Regola 1 — commento superato su una decisione rovesciata] Il paragrafo dell'ownership nella pagina di revisione

- **Trovata durante:** Task 3 (consegnata esplicitamente dal piano 35-09, § Note
  per l'orchestratore, punto 1)
- **Problema:** `review/page.tsx:111-114` diceva tre cose, e **tutte e tre erano
  false**: che la policy e' `is_admin_or_organizer()` (la fase 32 l'aveva gia'
  spostata su `staff.manage`, `20260807010000_policies_to_capabilities.sql:145-149`),
  che lo scoping per-notte *arrivera'* nella fase 35 (e' arrivato), e che la
  migration citata lo dice (ora dice un'altra cosa).
- **Fatto:** paragrafo **sostituito**, non appeso, con la correzione e la
  lezione: una migration dice cosa e' successo quel giorno, mai cosa e' vero
  oggi — lo schema e' la **somma** delle migration in ordine. La stessa
  affermazione stantia vive ancora in `31-VERIFICATION.md:882`, che **non** porta
  una smentita accanto: nominata nel file, non corretta (fuori da
  `files_modified`).
- **Commit:** `5ff30a5`

### 3. [Fuori scope, non corretto] `prefer-const` su `pendingCookies`

`npx eslint src/lib/supabase/middleware.ts` segnala
`'pendingCookies' is never reassigned. Use 'const' instead` a `:97`. **E'
pre-esistente**: verificato su `git show HEAD:...` alla base del piano, dove sta
alla riga 26. Non tocca nessuna riga di questo piano e non e' stato corretto —
confine di scope. `npm run build` non esegue eslint, quindi non blocca nulla.

---

## Cosa questo piano NON chiude

**ASSIGN-01 non e' consegnato, e va detto invece di lasciarlo dedurre.** La route
di check-in chiede ancora la sola domanda di ruolo (scoperto dal piano 35-12),
quindi una persona assegnata che **grazie a questo lavoro raggiunge lo scanner**
riceve comunque 403 sulla scansione vera finche' il piano **35-22** non atterra.
Il piano dichiara `requirements: [ASSIGN-01, ASSIGN-05, ASSIGN-08]`; nessuno dei
tre e' segnato completato qui. Questo piano rende la macchina **raggiungibile**,
non ancora **operativa**.

Fuori dai `files_modified` e deliberatamente non toccato: la route di check-in,
le tre route della porta, `ScannerClient.tsx`, `31-VERIFICATION.md:882`.

---

## Note per gli altri piani

- **Per il piano 35-22:** il gate grossolano ora ammette per assegnazione, quindi
  il primo effetto visibile del vostro lavoro sara' su persone che **arrivano
  davvero** allo scanner. Il predicato grossolano e' scritto in due posti
  (middleware e pagina) e deve restare lo stesso; il confine per-notte e' vostro.
- **Per chiunque tocchi il middleware:** `ORGANIZER_ASSIGNMENT_ROUTES` non e' un
  elenco di comodo. Aggiungere una rotta e' una decisione, e la condizione e'
  scritta accanto: quella rotta deve gia' avere il proprio gate lato server.
  `src/app/(organizer)/organizer/page.tsx` non ce l'ha.
- **Per chi eseguira' la UAT:** i tre avvisi del dashboard si provano cambiando
  `?access=` a mano su `/dashboard`; un quarto valore non deve rendere nulla.
  L'unico che non si prova cosi' e' se il rimbalzo giusto porti la causa giusta —
  quello richiede le due sessioni della procedura 35-14.
- **Osservazione trasversale:** con la migration di 35-15 non applicata, ogni
  rimbalzo dalle due regole allargate portera' `?access=context-stale` e disegnera'
  un avviso di configurazione anche a un membro qualunque. E' voluto e temporaneo;
  se durante una verifica sembra un difetto, e' il segnale che fa il suo lavoro.
- **Nessuna collisione rilevata** con i piani 35-13 e 35-16 della stessa wave:
  nessuno dei loro `files_modified` tocca i miei quattro file. Il file
  `.../events/[id]/media/page.tsx` di 35-16 e' **nominato** nel mio middleware ma
  non modificato.

---

## Known Stubs

Nessuno. Nessun valore vuoto codificato a mano, nessun testo segnaposto, nessun
componente senza sorgente dati. I due limiti della pagina di revisione non sono
stub: sono confini di policy dichiarati nel file, con scritto cosa costerebbe
chiuderli.

---

## Threat Flags

Nessuna superficie nuova di rete, autenticazione o accesso ai file. Nessuna
migration. Le nove voci del `<threat_model>` del piano (T-35-84 → T-35-92) sono
tutte `mitigate` e la mitigazione e' applicata nel file corrispondente; le due
che dipendono da un'asserzione meccanica — l'ordine `/admin/scanner` prima di
`/admin` (T-35-92) e il gate dopo la risoluzione di `?party=` (T-35-87) — sono
verificate per numero di riga sopra.

Una nota che non e' un flag ma va detta: il gate grossolano e' **piu' largo del
permesso reale per costruzione** (T-35-85). Chi ha un'assegnazione su un'altra
notte raggiunge lo scanner. Non e' un difetto da correggere dopo: e' il prezzo di
una domanda grossolana invece di N precise, e le due mitigazioni che lo rendono
accettabile — `requireDoorOperator({ partyId })` e il filtro della lista serate —
erano gia' in piedi prima di questo piano, che e' il motivo per cui sono
`depends_on`.

---

## Self-Check: PASSED

| Affermazione | Esito |
|---|---|
| `src/lib/supabase/middleware.ts` | FOUND |
| `src/app/(members)/dashboard/page.tsx` | FOUND |
| `src/app/(admin)/admin/scanner/page.tsx` | FOUND |
| `src/app/(organizer)/organizer/events/[id]/review/page.tsx` | FOUND |
| commit `d27c085` | FOUND |
| commit `1583309` | FOUND |
| commit `5ff30a5` | FOUND |
| `STATE.md`, `ROADMAP.md`, `deferred-items.md` non toccati | confermato — `git diff --name-only` contro la base non li elenca |
| Nessuna migration toccata | confermato — `git diff --name-only` contro la base non elenca `supabase/` |
