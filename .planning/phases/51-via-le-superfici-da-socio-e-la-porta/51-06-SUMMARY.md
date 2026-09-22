---
phase: 51-via-le-superfici-da-socio-e-la-porta
plan: 06
subsystem: ui
tags: [next.js, typedRoutes, routing, redirect-308, access-list, middleware, conversion-gate]

requires:
  - phase: 51-via-le-superfici-da-socio-e-la-porta
    plan: 04
    provides: "le due superfici da socio cancellate, il blocco «My Stuff» tolto dalla pagina, e le due liste d'accesso gia' ripulite — piu' la forma additiva della prosa datata e la grep-igiene sugli elenchi d'accesso"
  - phase: 50-via-le-iscrizioni
    provides: "T-50-28, il costo dichiarato di un 308 memorizzato, e la forma del docblock dei redirect in next.config.ts"
provides:
  - "MEM-01 lato superficie dell'account: la pagina vive a /account e mostra solo i biglietti piu' le impostazioni"
  - "/dashboard servito come 308 permanente verso /account, che e' anche cio' che lo tiene dentro l'union di typedRoutes"
  - "/account in NEXT_ALLOW_LIST (pattern ancorato) e in PROTECTED_PREFIXES, cambiati insieme"
  - "DEFAULT_NEXT = /account, e bounceToAccount() al posto di bounceToDashboard()"
  - "la voce Account della barra all'indirizzo vero, senza ramo speciale nello stato attivo"
  - "il censimento della conversione con la entry rinominata al file esistente, e la sua terza riga datata"
affects:
  - "51-10 (i letterali \"member\" in page.tsx e middleware.ts, non toccati qui)"
  - "51-08 (la chiave capability e la prosa datata di middleware.ts:675)"
  - "52 / NAV-03 (ManagementSection, lasciata in piedi di proposito)"

tech-stack:
  added: []
  patterns:
    - "Una pagina che si sposta e il redirect che tiene vivo il vecchio indirizzo non possono stare in due commit: senza il redirect il vecchio percorso esce dall'union di typedRoutes e il build si ferma sui suoi chiamanti"
    - "Un ramo condizionale che calcola esattamente il ramo generale si toglie quando l'indirizzo si sposta, invece di essere riscritto sul nuovo: riscriverlo avrebbe portato avanti una ridondanza travestita da caso particolare"
    - "Un segnaposto si rimisura contro la pagina quando la pagina cambia: un placeholder che disegna piu' scatole del vero CAUSA lo scarto che esiste per evitare, e nessun gate se ne accorge"

key-files:
  created:
    - "src/app/(members)/account/page.tsx"
    - "src/app/(members)/account/loading.tsx"
  modified:
    - "next.config.ts"
    - "src/lib/routes/next-redirect.ts"
    - "src/lib/supabase/middleware.ts"
    - "src/lib/rbac/roles.ts"
    - "src/components/layout/AppNav.tsx"
    - "scripts/conversion-manifest.mjs"
    - "scripts/probe-forged-identity.sh"
  deleted:
    - "src/app/(members)/dashboard/page.tsx"
    - "src/app/(members)/dashboard/loading.tsx"
    - "src/app/(members)/dashboard/DashboardDrinkTokens.tsx"

key-decisions:
  - "Il redirect di next.config.ts e' entrato nel commit dello spostamento e non in quello successivo: misurato, senza di lui il build si ferma su artists/page.tsx:73 con «Argument of type \"/dashboard\" is not assignable»"
  - "Le voci del vecchio indirizzo restano in entrambe le liste d'accesso, al contrario di quanto 51-04 ha fatto per le due superfici cancellate: li' l'indirizzo aveva smesso di esistere, qui e' ancora servito"
  - "Lo stato attivo della barra perde il ramo speciale invece di riceverne uno nuovo sul nuovo indirizzo"
  - "Il segnaposto e' stato rimisurato, non spostato: le due caselle d'azione stavano davanti a un blocco che 51-04 aveva cancellato"
  - "Il nome della tabella dei token non e' scritto nei commenti della pagina, per la stessa ragione di grep-igiene che 51-04 ha applicato agli elenchi d'accesso"

patterns-established:
  - "Rinomina di una entry di manifest nello stesso commit dello spostamento, con il nuovo percorso: il censimento non si muove e il gate si romperebbe lo stesso"
  - "Una sonda d'accesso non si punta su un indirizzo che risponde 3xx per ragioni di rotta"

requirements-completed: [MEM-01]

duration: ~55min
completed: 2026-09-22
---

# Phase 51 Plan 06: /account nasce da /dashboard Summary

**La pagina dell'account vive a `/account` e mostra i biglietti — le serate in arrivo col QR, le passate in una sezione chiusa — piu' cambio email, cambio password e uscita; `/dashboard` risponde 308 verso di lei, ed e' quel 308 a tenere in piedi i circa quaranta rifiuti delle superfici di lavoro senza toccarne nessuno.**

## Performance

- **Duration:** ~55 min
- **Tasks:** 3/3
- **Files:** 2 creati (per `git mv`), 7 modificati, 3 cancellati

## Accomplishments

### Task 1 — la pagina si sposta e si riduce (`b410783`)

`git mv` per `page.tsx` e `loading.tsx`, cosi' la storia resta leggibile e `git log --follow` continua a funzionare sul file piu' annotato di questo albero.

**Cosa e' rimasto, cosa e' uscito.** I biglietti sono il cuore e restano; le due liste `upcoming` e `past` erano **gia' separate** nel codice — cio' che e' cambiato e' solo come si disegnano. «Past» e' ora una sezione chiusa, ed e' **quella che la casa ha gia'**: `src/components/account/CollapsibleSection.tsx`, la stessa che tiene Management Tools dieci righe piu' sotto, che annuncia lo stato con `aria-expanded`, dichiara il pavimento dei 44 px sul controllo e importa l'anello di fuoco. Non ne e' stata scritta una seconda; `defaultOpen` non e' passato, e il valore di default del componente e' *chiusa*.

La riga di un biglietto e' stata **estratta in una funzione sola** usata dalle due liste. Non e' un refactoring di comodo: dividendo la resa in due, ricopiare novanta righe sarebbe stato il modo piu' rapido per farle divergere al primo ritocco, e una riga che si comporta diversamente a seconda della sezione e' un difetto che si nota solo dopo averne fatto uno.

Sono usciti i token del bar — il componente cancellato, la lettura che lo alimentava e il mount, **nello stesso commit**, perche' lasciarne in piedi uno qualsiasi produce o un import senza componente (build rosso) o una lettura senza disegno (un giro in rete a ogni apertura per costruire una lista che nessuno guarda).

`ManagementSection` **resta**: la toglie NAV-03 nella fase 52, e anticiparla qui avrebbe allargato la fase.

**`membership_code` nella select e i due letterali `"member"` non sono stati toccati**, come il piano prescrive: sono del piano 51-10, che li muove insieme al tipo e alla migration del ruolo.

### Task 2 — le liste d'accesso e il rimbalzo (`67c9615`)

`/account` entra in `NEXT_ALLOW_LIST` con `/^\/account$/` — ancorato a entrambi i capi, senza `.*`, senza charset da allargare: e' un segmento letterale, e un pattern largo su un flusso **gia' autenticato** e' il modo in cui un open redirect torna (`T-51-22`). Entra anche in `PROTECTED_PREFIXES` (`T-51-23`), **nello stesso commit**, perche' le due liste si muovono insieme per una ragione meccanica: un prefisso senza il suo pattern rende rosso il controllo `[3/3]` di `verify:routes`, un pattern senza prefisso lascia l'indirizzo raggiungibile da un anonimo senza rimbalzo. Il middleware continua a **importare** la lista, che e' la proprieta' per la cui assenza il blocker D7 era esistito.

`DEFAULT_NEXT` passa a `/account`, e `bounceToDashboard` diventa `bounceToAccount` puntando al nuovo indirizzo: rimbalzare sul vecchio costerebbe un 308 in piu' a ogni rifiuto, con `?access=` che viaggia attraverso un redirect per arrivare alla stessa pagina.

**Le voci del vecchio indirizzo restano in entrambe le liste, ed e' una decisione d'accesso dichiarata.** E' il **caso opposto** a quello che 51-04 ha registrato: li' gli indirizzi avevano smesso di esistere, e una permissione con niente dall'altra parte non e' prudenza. Qui l'indirizzo e' ancora servito — come 308 — quindi chi viene rimbalzato da li' senza sessione arriva al login portandoselo come `?next=`, e rifiutarlo lo scaricherebbe sul default buttando via cio' che aveva chiesto.

### Task 3 — barra, censimento, sonda (`42300eb`)

La voce Account porta a `/account` e non al vecchio indirizzo: il vecchio risponde, ma come 308, e mandare attraverso un redirect la voce che si tocca piu' spesso di ogni altra sarebbe un giro in piu' a ogni apertura.

In `AppNav` lo stato attivo **perde il ramo speciale**. Il ternario diceva `pathname === X || pathname.startsWith(X)` — la stessa cosa due volte, il primo termine un caso del secondo. Era gia' ridondante prima dello spostamento; portarlo sul nuovo indirizzo avrebbe conservato una ridondanza travestita da caso particolare, e lasciarlo sul vecchio avrebbe lasciato un ramo irraggiungibile che suggerisce al prossimo lettore che esista una ragione per averlo. Un secondo confronto non serve: il 308 cambia il `pathname` **prima** che la pagina renda.

Nel manifest la entry e' rinominata **con il nuovo percorso del file**, e l'aritmetica del censimento prende la sua **terza riga datata**: 44 di nuovo, e per una ragione diversa dalle due precedenti — qui nessuna pagina e' nata o morta, una si e' spostata. E' il caso che mostra perche' il censimento da solo non basta: le cifre stanno ferme e il gate si romperebbe lo stesso, perche' il controllo D legge il *file dichiarato*.

Nella sonda, il conteggio dei prefissi torna al vero (quattro) e si aggiunge l'avvertimento che mancava: il vecchio indirizzo **non risponde piu' con un giudizio su chi sei**, e i redirect di `next.config.ts` girano prima del middleware. Una sonda d'accesso puntata li' misurerebbe un cambio di rotta credendo di misurare un rifiuto — `T-51-26`, e l'errore che la v1.5 ha gia' commesso con il 307 dell'apice del dominio.

## Deviations from Plan

### `[deviazione dichiarata]` Il redirect di `next.config.ts` e' entrato nel commit del Task 1, non in quello del Task 2

**Trovato durante:** Task 1, alla prima corsa di `npm run build` dopo lo spostamento.

**Il problema, misurato e non dedotto.** Il piano assegna `next.config.ts` al Task 2 e pretende `npm run build` **verde alla fine del Task 1**. Le due cose non possono stare insieme: appena la pagina lascia `/dashboard`, quel percorso esce dall'union di `typedRoutes`, e i circa quaranta `redirect("/dashboard")` delle superfici di lavoro smettono di compilare. Il build si e' fermato su:

```
./src/app/(admin)/admin/(work)/artists/page.tsx:73:14
Type error: Argument of type '"/dashboard"' is not assignable to parameter of type 'RouteImpl<"/dashboard">'.
```

**Il fix:** la voce `{ source: "/dashboard", destination: "/account", permanent: true }` e' entrata nel commit dello spostamento, con il suo paragrafo di disposizione `accept` per intero. Il Task 2 ha poi fatto la sua parte — le due liste, `DEFAULT_NEXT`, il rimbalzo — e `next.config.ts` non e' stato riaperto.

**Perche' in questa direzione.** E' la stessa meccanica che 51-04 ha descritto nel verso opposto: li' `typedRoutes` impediva che un link e la sua pagina uscissero in due commit; qui impedisce che una pagina e il redirect che tiene vivo il suo vecchio indirizzo entrino in due commit. Un albero che non compila fra due commit e' un albero su cui `git bisect` mente, ed e' un costo piu' alto della simmetria fra il piano e i commit.

**Nessun criterio d'accettazione e' andato perso:** i quattro del Task 2 su `next.config.ts` sono tutti soddisfatti, solo un commit prima.

**Commit:** `b410783`

---

### `[Rule 1 — difetto]` Il segnaposto disegnava due caselle davanti a un blocco che non esiste piu'

**Trovato durante:** Task 1, leggendo `loading.tsx` per spostarlo.

**Il problema.** Il file dichiarava — nel proprio docblock, per esteso — di disegnare *«**two** quick-action tiles, because the page draws exactly two»*. La pagina **non ne disegna piu' nessuna**: il blocco «My Stuff» e' stato cancellato dal piano 51-04 poche ore prima. Un segnaposto che disegna due scatole davanti a zero scatole **causa** lo scarto che un segnaposto esiste per prevenire: e' il file che fa l'opposto del proprio mestiere, in silenzio, e nessun gate del repo se ne accorge — `verify:conversion` legge stringhe di classe e un grafo di import, non altezze.

**Il fix.** Le due caselle sono uscite; al loro posto c'e' **una riga sola**, davanti alla barra della sezione chiusa delle serate passate, che e' un controllo alto 44 px che compare appena i dati arrivano. Aggiunta anche la riga della frase sopra la lista, che la pagina disegna sempre. Il docblock e' stato rimisurato contro `page.tsx` invece di essere trascinato dietro al file.

**Perche' Rule 1 e non fuori perimetro:** il file e' fra i `files_modified` del piano, e il piano chiede esplicitamente che il segnaposto «si sposti con la pagina» — spostare un segnaposto sbagliato significa spostare il difetto.

**Commit:** `b410783`

---

### `[deviazione dichiarata]` Il gate del Task 1 chiedeva zero occorrenze, la prosa chiedeva di dire cosa era uscito

**Dove:** `<verify><automated>` del Task 1 pretende `grep -c "drink_tokens"` a **zero** sulla pagina; l'`<action>` chiede di spiegare perche' la lettura e' uscita.

**Come e' stato sciolto.** Ha vinto il grep, **per la stessa ragione di dominio che 51-04 ha scritto per gli elenchi d'accesso**: un `grep` del nome di una tabella su un file di pagina risponde alla domanda *«questa pagina legge quella tabella?»*, e un necrologio in un commento risponderebbe «si'» a chi legge di fretta, per sempre. Le due lapidi — quella in testa al file e quella al posto della lettura — dicono tutto quello che c'e' da dire **descrivendo** cio' che e' uscito, e dichiarano accanto perche' il nome non e' ripetuto, cosi' che il prossimo lettore non lo rimetta credendo di migliorare la documentazione. `git log -S` ha il nome per chi serve.

**Nota:** 51-04 aveva dichiarato l'eccezione opposta su questo stesso file (*«quella non e' una lista, e' una pagina; nessun gate del piano vi si applica»*). Qui **un gate vi si applica**, ed e' il motivo per cui la decisione e' diversa.

---

### `[Rule 2 — documentazione datata]` Prosa che descriveva dove si rimbalza, corretta nei file gia' aperti

Tutte in file fra i `files_modified`, tutte descrizioni di **cio' che il prodotto fa oggi** e non verbali storici:

- `src/lib/supabase/middleware.ts` — quattro paragrafi e **la riga di log del percorso degradato** (`capability-gated route now bounces to …`) nominavano il vecchio indirizzo come destinazione del rimbalzo. Una riga di log che dice un indirizzo mentre il codice ne scrive un altro manda chi indaga nel posto sbagliato, su un percorso che gira solo quando qualcosa e' gia' rotto.
- `src/lib/supabase/middleware.ts` — il paragrafo di `/door` diceva *«`/door` is the fifth»* sopra una lista che ne aveva **tre**. Era gia' datato prima di questo piano (51-04 ne aveva tolti due) e sarebbe stato datato anche dopo. Corretto in «one of the four», con la nota che dice di rileggere il numero dalla costante.
- `src/lib/routes/next-redirect.ts` — il docblock di `PROTECTED_PREFIXES` diceva *«a fourth prefix»*; con `/account` la prossima e' la quinta.
- `src/lib/rbac/roles.ts` — cinque righe di prosa nominavano il vecchio indirizzo come destinazione della voce Account.

## File cancellati

Tre file. Due sono **spostamenti** che `git` registra come rename (`git mv`), non perdite; uno e' una cancellazione vera.

| Path | Perche' |
|---|---|
| `src/app/(members)/dashboard/page.tsx` | **spostato** → `src/app/(members)/account/page.tsx` (rename rilevato da git) |
| `src/app/(members)/dashboard/loading.tsx` | **spostato** → `src/app/(members)/account/loading.tsx` (rename rilevato da git) |
| `src/app/(members)/dashboard/DashboardDrinkTokens.tsx` | **cancellato** — D-51-09: la lista dei token del bar esce dalla pagina dell'account. Unico importatore: la pagina qui sopra, nello stesso commit |

Con essi sparisce la directory `src/app/(members)/dashboard/`, rimasta vuota. Il `git status` dopo ogni commit non ha mostrato altre `D`, e `git diff --diff-filter=D` sui commit 2 e 3 e' vuoto.

**Nulla del percorso dei token e' stato toccato fuori da questa pagina:** `DrinkTokenCard`, la pagina del menu, le sue server action e la rotta di lookup sono intatte — verificato con un grep su `src/`, che trova il percorso pubblico dei token vivo e nessun riferimento residuo al componente cancellato.

## Note d'ordine per i piani a valle

1. **`src/app/(auth)/set-password/SetPasswordForm.tsx:343`** porta `<Button href="/dashboard">`, ed e' **fuori dai miei `files_modified`**. Non l'ho toccato: compila (il `source` del redirect e' un `Route` valido) e funziona — chi ci clicca riceve un 308 e arriva su `/account`. Costa un giro in piu' a chi ha appena impostato la password. Se un piano futuro apre quel file, e' li' che va portato all'indirizzo vero.
2. **`src/lib/supabase/middleware.ts:675`** — la prosa che nomina le due superfici cancellate da 51-04 **non e' stata toccata**: e' del piano 51-08, come 51-04 aveva registrato. La stessa riga dice che il vecchio indirizzo non sta nella mappa route↔capability, cosa ancora vera: il nuovo non ci sta ugualmente, e nessuno dei due deve starci.
3. **`src/lib/routes/organizer-redirects.ts:41`** — il docblock datato che 51-04 ha segnalato come di nessun piano dell'onda 1. **Non e' nei miei `files_modified` e non l'ho toccato**, e ora e' datato per **tre**: elenca i `source` che entrano nell'union dei tipi di rotta, e da oggi ce n'e' uno in piu' che non nomina. Resta prosa illustrativa che nessun gate legge.
4. **`scripts/conversion-manifest.mjs:1104`** — il verbale di 41.2-19 nomina ancora il vecchio indirizzo mentre descrive una misura fatta allora. Lasciato come verbale, con la nota datata sulla entry che dice di leggerlo come tale.
5. **51-10** trova in `src/app/(members)/account/page.tsx` i due letterali `"member"` e `membership_code` nella select, esattamente dove il piano li ha lasciati — solo a un altro percorso di file.

## Verifica

**Non esiste alcun test runner per il prodotto** (`CLAUDE.md`, Guardrail 1): niente qui e' dichiarato verificato «perche' i test passano». Cio' che e' stato eseguito, e il suo esito:

| Comando | Esito | Cosa prova |
|---|---|---|
| `npm run build` | 0, dopo ogni task | Il typecheck di Next. Con `typedRoutes` e' **il** gate di questo piano nei due versi: che `/account` esista, e che `/dashboard` resti un `Route` valido per i suoi quaranta chiamanti. Nell'elenco delle rotte del build compare `ƒ /account` |
| `npm run verify:routes` | PASS, tre su tre | `[3/3]` in particolare: **29** indirizzi protetti tornano se stessi via `resolveNext` senza sostituzione, e i 6 valori da rifiutare finiscono **su `/account`** — cioe' il gate legge il nuovo `DEFAULT_NEXT` e non una costante ricopiata |
| `npm run verify:conversion` | `CONVERSION_OK`, sei controlli su 36 superfici, 208 file | Il censimento: 44 `page.tsx` su disco = 36 dichiarate + 0 recintate + 6 in attesa + 2 non dichiarabili, 0 non contate. Il controllo D legge il file dichiarato dalla entry rinominata, che esiste |
| `sh -n scripts/probe-forged-identity.sh` | 0 | Sintassi della sonda dopo le correzioni al suo docblock |
| `/usr/bin/grep -c` sui gate del piano | 0 su `drink_tokens` e `DashboardDrinkTokens` nella pagina; 0 su `pathname = "/dashboard"` nel middleware | I tre grep che i task chiedevano |
| `git diff --stat -- "src/app/(admin)"` | vuoto | **Zero rifiuti delle superfici di lavoro toccati**, che e' il criterio d'accettazione centrale del piano |

**Osservabile rosso → verde, che vale piu' di un verde solo:** il build si e' fermato su `artists/page.tsx:73` subito dopo lo spostamento, nominando il tipo del vecchio indirizzo, ed e' tornato verde con la voce di redirect. Il gate ha misurato la dipendenza fra pagina e redirect invece di lasciarla a un'ipotesi — ed e' cio' che ha prodotto la deviazione dichiarata qui sopra.

**Non eseguito, e perche':** `curl -s -o /dev/null -w '%{http_code}' https://lab.resonatemotion.com/dashboard` → 308, e `/account` da anonimo → 307 verso `/login`. La verifica del piano lo registra come *«dopo il deploy del ramo sul laboratorio»*: nessun push, nessun deploy, nessuna scrittura sul lab da questo worktree.

## Note d'accesso

**Il middleware e' UX, la RLS e' sicurezza, e questo piano non ha toccato nessuna policy** — non ne aveva da toccare. Cio' che e' cambiato e' **dove** una persona viene mandata, mai **cosa** puo' leggere: la pagina interroga `tickets` con il client dell'utente, filtrata dalle stesse policy di ieri, e la lettura dei token del bar e' stata **tolta**, non allargata.

Due punti che meritano di essere detti invece di lasciati dedurre:

1. **`/account` e' protetta da subito**, e non «in un secondo momento»: il pattern dell'allow-list e il prefisso sono entrati nello stesso commit, ed e' il controllo `[3/3]` a impedire che uno dei due possa mancare. Un indirizzo servito e non protetto avrebbe mostrato biglietti a chi non li ha comprati (`T-51-23`).
2. **Il 308 e' irreversibile nelle cache dei browser** (`T-51-24`, disposizione `accept`). A differenza dei due 308 che la fase 50 e il piano 51-04 hanno registrato, pero', **l'esito qui non e' un 404**: chi arriva dalla propria cache arriva alla pagina giusta al nuovo indirizzo, cioe' a cio' che il redirect promette. E' il motivo per cui la disposizione si accetta senza riserve.

## Self-Check: PASSED

File dichiarati, verificati su disco:

- `src/app/(members)/account/page.tsx` — presente
- `src/app/(members)/account/loading.tsx` — presente
- `src/app/(members)/dashboard/` — assente (directory rimossa)
- `src/app/(members)/dashboard/DashboardDrinkTokens.tsx` — assente

Commit verificati esistenti su questo ramo:

- `b410783` — Task 1 (piu' la voce di redirect, deviazione dichiarata)
- `67c9615` — Task 2
- `42300eb` — Task 3
