---
phase: 50-via-le-iscrizioni
plan: 10
subsystem: testing
tags: [runbook, supabase-auth, gotrue, disable-signup, offline-queue, door, free-rsvp, management-api]

requires:
  - phase: 50-via-le-iscrizioni
    plan: 01
    provides: "il banco del laboratorio — i soggetti distinti di `P-50-3`, la serata `free_rsvp`, l'account di staff con `door.operate`"
  - phase: 50-via-le-iscrizioni
    plan: 02
    provides: "la migration `20260921124829` applicata al laboratorio: senza, le superfici percorse qui avrebbero interrogato un catalogo diverso"
  - phase: 50-via-le-iscrizioni
    plan: 05
    provides: "il percorso dell'ordine gratuito, e `P-50-7` gia' percorsa una prima volta"
  - phase: 50-via-le-iscrizioni
    plan: 07
    provides: "`deleteAccount` con i rifiuti nominati per causa (D-50-16), che `P-50-3` ha esercitato"
  - phase: 50-via-le-iscrizioni
    plan: 09
    provides: "`50-RUNBOOK.md` — le otto procedure con ruolo, ambiente, passi numerati e osservabili"
provides:
  - "`50-ESITI.md`: gli esiti delle OTTO procedure, osservati e non attesi, con ora UTC, comando e risposta alla lettera"
  - "`A1` CONFERMATA sul campo: cinque creazioni di account su quattro percorsi di servizio, tutte riuscite con il signup pubblico spento — quindi `A.2` in produzione non e' bloccato da questa prova"
  - "`REG-04` chiuso dove il prodotto non poteva chiuderlo: `422 signup_disabled` alla chiave anonima, letto da `curl` e non dedotto dall'assenza della pagina"
  - "`P-50-8` percorsa dal proprietario su un telefono in modalita' aereo vera: un biglietto gratuito entra come uno pagato, e una doppia lettura resta UNA convalida"
  - "sette non conformita' registrate, sei dalle procedure automatizzate e una dal checkpoint"
  - "una DECISIONE del proprietario aperta e documentata con i suoi costi: il nome dell'acquirente sullo schermo della porta"
affects: [50-11, 50-12, 51]

tech-stack:
  added: []
  patterns:
    - "una configurazione si legge PRIMA, si scrive, e si rilegge con una chiamata INDIPENDENTE: la risposta del `PATCH` e' un'eco dello strumento che ha causato l'effetto, non una misura"
    - "un confine che vive fuori dal prodotto si prova fuori dal prodotto: la pagina cancellata dimostra che il prodotto non offre il percorso, non dimostra niente sull'API — e la chiave anonima viaggia nel bundle del browser"
    - "un esito osservato su uno schermo si completa con una rilettura dal catalogo: le schermate dicono cosa ha visto l'operatore, il catalogo dice cosa e' rimasto scritto, e la porta ha bisogno di entrambe"
    - "quando l'osservato differisce dall'atteso, la differenza si scrive PER PRIMA: un documento di esiti che apre con le conferme si legge come una conferma"
    - "un'assenza attesa si dichiara con la sua ragione (`attendances` vuota perche' e' il registro del percorso tessera), o il prossimo lettore la legge come un difetto"

key-files:
  created:
    - ".planning/phases/50-via-le-iscrizioni/50-ESITI.md"
  modified:
    - ".planning/phases/50-via-le-iscrizioni/50-RUNBOOK.md"
    - ".planning/phases/50-via-le-iscrizioni/deferred-items.md"

key-decisions:
  - "`A1` e' confermata sul campo e non piu' per lettura del sorgente: `disable_signup` non tocca `auth.admin.createUser`, quindi acquisto da ospite, guest list e creazione in-app sopravvivono allo spegnimento"
  - "`A.2` e `B.2` — la produzione — restano al piano 50-11, dentro l'autorizzazione datata: questa corsa non ha scritto niente in produzione"
  - "il nome dell'acquirente sullo schermo della porta NON si tocca in questo piano: e' una modifica al percorso critico della porta e una decisione del proprietario, non un ritocco di rimbalzo a una verifica"
  - "il laboratorio resta con il signup spento a fine corsa: `A1` e' stata confermata, quindi non c'era nulla da riaccendere"

patterns-established:
  - "il checkpoint umano si riprende rileggendo il catalogo, non fidandosi del racconto: le quattro schermate dicono cosa ha visto l'operatore, `door_scan_events` dice quante convalide sono rimaste"
  - "una non conformita' preesistente si annota accanto al suo esito, o l'esito si legge come un restringimento nuovo (il 403 dei media, il nome sulla porta)"

requirements-completed: [REG-01, REG-02, REG-04, REG-06]

duration: ~3h30 (15:10Z → 16:02Z la corsa, piu' la ripresa dopo il checkpoint)
completed: 2026-09-21
---

# Fase 50 Piano 10: Le otto procedure, percorse — Summary

Le otto procedure del runbook sono state **percorse**, non dedotte: sette da
questo lato sul laboratorio, l'ottava dal proprietario su un telefono con la
radio spenta davvero. `A1` — l'unica assunzione della fase che, se sbagliata,
avrebbe spento l'unica cosa che vende — e' **confermata sul campo**, e la porta
ha fatto entrare un biglietto gratuito lasciando **una** convalida, non due.

---

## Perche' questo piano esisteva, in una riga

`50-RESEARCH.md` §5.2 leggeva dal **sorgente** di `supabase/auth` che
`DisableSignup` compare in due soli punti e **non** in `admin.go`. Ma la
versione di GoTrue **dispiegata** non e' nota da questo repository: se `A1`
fosse stata falsa, `D-50-06` avrebbe spento l'acquisto da ospite. Il piano
esisteva per **smentirla dove non costa niente**, prima di toccare la
produzione.

Non e' stata smentita. E' stata confermata cinque volte.

---

## Le otto, con il loro esito e dove sta l'evidenza

| Sigla | Esito | Dove |
|---|---|---|
| `P-50-1` — le superfici | **PERCORSA** su **quattro** soggetti invece di tre; `/register` **404** per tutti, `/` → `/events` anche da loggato, nessun «Sign up» sulle tre superfici | `50-ESITI.md` §`P-50-1` |
| `P-50-2` — la migration | **PERCORSA** dal piano 50-02; versione `20260921124829`, e il primo tentativo rifiutato con `2BP01` **ha annullato l'intera transazione** | `50-02-SUMMARY.md` |
| `P-50-3` — la cancellazione | **PERCORSA**; **tre** cause di rifiuto invece delle due che il runbook pretendeva, ognuna con la sua frase e il suo conteggio | `50-ESITI.md` §`P-50-3` |
| `P-50-4` — i media | **PERCORSA**, 6 passi su 6, con il banco esteso a mano | `50-ESITI.md` §`P-50-4` |
| `P-50-5` — il signup spento | **PERCORSA**; `422 signup_disabled` alla chiave anonima, letto **prima e dopo** il `PATCH` con due `GET` distinte | `50-ESITI.md` §`P-50-5` |
| `P-50-6` — i percorsi di servizio | **PERCORSA**; **`A1` CONFERMATA** | `50-ESITI.md` §`P-50-6` |
| `P-50-7` — l'ordine gratuito | **PERCORSA** dal 50-05 e **ripercorsa** qui; passo residuo **chiuso** | `50-05-SUMMARY.md` + `50-ESITI.md` §`P-50-7` |
| `P-50-8` — **la porta a radio spenta** | **PERCORSA dal proprietario**, 6 passi su 6 | `50-ESITI.md` §`P-50-8` |

---

## `A1`, confermata — e questa e' la riga che sblocca la produzione

Cinque creazioni di account, su **quattro percorsi diversi**, tutte con
`disable_signup = true` riletto dalla configurazione prima di cominciare:

| Percorso | Esito | Tempo |
|---|---|---|
| `auth.admin.createUser` nudo, chiave di servizio | **HTTP 200**, account confermato, profilo scritto dal trigger | **0,382 s** |
| `createAccount` dalla pagina membri, ruolo master | account + profilo + invito + codice `RSN-…` a 14 caratteri | **~6,2 s**, mail compresa |
| prenotazione da **anonimo** → `resolveGuestIdentity` | identita' leggera creata, `full_name` uguale al nome digitato | **2,73 s** all'invio |
| voce di **guest list** | utente, profilo, `status = 'ticket_issued'`, mail `guest_invitation` | **1,83 s** |

**Nessuna ha risposto `signup_disabled`.** Il controllo sul signup sta **prima**
della validazione del dominio — provato al contrario: lo stesso indirizzo
`@lab.invalid` che prima del `PATCH` riceveva `400 email_address_invalid`, dopo
riceve `422 signup_disabled`.

**Conseguenza operativa:** `A.2` — spegnere il signup in produzione — **non e'
bloccato da questa prova**, e resta soggetto al solo limite gia' dichiarato: la
versione di GoTrue dispiegata su ciascuno dei due progetti non e' nota da qui.

---

## `P-50-8` — la porta, che e' l'unica cosa che nessun comando poteva dire

**Percorsa dal proprietario il 2026-09-21 fra le 16:01:27Z e le 16:02:19Z**, su
un telefono vero contro `lab.resonatemotion.com`, con l'account di staff che ha
`door.operate` sulla serata gratuita.

**La modalita' aereo era vera**, e non e' una parola data: nella barra di stato
si vede **l'icona dell'aeroplano** e nessun indicatore di rete, e il prodotto
stesso lo conferma dall'interno con il banner *«The member list on this device
was NOT refreshed. With the radio off…»*. Non era il solo wi-fi spento — che e'
la scorciatoia che avrebbe reso la prova inutile.

**I sei passi, tutti con l'esito atteso:**

1. prenotato un posto: un **terzo** biglietto gratuito, coniato al momento;
2. porta aperta con la rete accesa, lista scaricata, **0 / 3**;
3. **aereo**, e il prodotto se ne accorge e lo dice;
4. QR gratuito scansionato: **accettato** — schermo verde, sottotitolo
   **«RSVP · Offline»**, **«Pending (1)»** in testata. **Lo stesso esito visivo
   di un biglietto pagato**, che e' la proprieta' da verificare e non era
   deducibile: lo scanner, la coda e il service worker non conoscono la
   differenza fra un biglietto a zero e uno pagato;
5. **seconda** lettura dello stesso codice, sempre in aereo: schermo **viola**,
   orologio, **«Recorded at 18:01 by this device»**. Non rifiutato, non contato
   due volte, e il telefono **nomina se stesso** invece di dare una risposta
   generica;
6. rete riaccesa: **«Online»**, contatore **1 / 3**, *Checked In (1)*, la
   pastiglia «Pending» sparita.

**La rilettura dal catalogo, che e' la meta' che lo schermo non da':**

```
door_scan_events  ticket_id = e8da1006-4c40-45b4-8c83-742dab3fb3dd
→ UNA riga: 96b82ac4-cc08-4b61-b229-0848a2c0a2a3
  outcome "recorded" · cause null · source "offline_sync" · is_undo false
  scanned_at  16:01:27.331Z      recorded_at 16:02:19.341Z
```

**Una convalida, non due** — e piu' di quanto il criterio chiedesse: la seconda
lettura **non ha prodotto nessuna riga**, nemmeno una `already_recorded`. Il
telefono l'ha riconosciuta come propria e non l'ha messa in coda affatto.

I **52 secondi** fra `scanned_at` e `recorded_at` sono la finestra offline
misurata: e' esattamente l'intervallo che
`supabase/migrations/20260805120000_door_scan_events.sql:101-103` dichiara di
voler conservare, qui riempito da una radio spenta vera invece che da un
commento.

**`attendances` vuota sulla serata, ed e' corretto:** il percorso del biglietto
scrive `tickets.checked_in_at` / `checked_in_by`
(`src/app/api/tickets/checkin/route.ts:1175-1220`) e una riga in
`door_scan_events` (`:822`), **mai** una presenza — `attendances` e' il registro
del percorso **tessera**, scritto da
`src/app/api/membership/verify/route.ts:528-562`. Dichiarato perche' chi cercasse
li' la prova dell'ingresso la troverebbe assente e ne dedurrebbe un difetto.

**Il verso grave dell'errore non si e' verificato.** `checkin-offline.md` —
*rifiutare un ospite valido e' peggio che ammetterne uno doppio* — e' la ragione
per cui questa prova non si deduceva. Al passo 4 il biglietto gratuito e'
entrato.

---

## Le sei cose che non sono andate come il runbook si aspettava

**Si leggono per prime in `50-ESITI.md`**, perche' sono la ragione per cui una
procedura si percorre invece di dedurla. Qui in sintesi, con il rimando:

| # | Cosa | Di chi e' la colpa |
|---|---|---|
| 1 | `P-50-4` passo 4.5 fallisce **con il banco che il runbook prescrive**: l'assegnazione seminata non basta | del **banco**, non del prodotto |
| 2 | `seed-lab-door.mjs --reset` si ferma su un **`23505`**, e la fase 50 lo ha reso possibile | dello **script di semina** |
| 3 | `P-50-5` passo 5.1 **non e' eseguibile** con `@lab.invalid`: GoTrue rifiuta il dominio prima di arrivare al cancello — e il cambio di dominio **e' esso stesso un risultato** | del **runbook**, che prescriveva un indirizzo che non attraversa |
| 4 | tre rifiuti in **inglese** portano il loro conteggio in **italiano** | del **prodotto**, ed e' cosmetico |
| 5 | il dialogo di creazione account nomina una **coda che non esiste piu'** | del **prodotto**: prosa sopravvissuta alla fase |
| 6 | il catalogo `formats` del **laboratorio non e' fedele alla produzione** | del **laboratorio**, ed e' il piu' insidioso dei sei |

Tutte e sei sono in `deferred-items.md` con il loro proprietario naturale.
**Nessuna e' stata corretta dentro questo piano**: il perimetro era percorrere le
procedure e scrivere cosa si e' visto.

### E una settima, dal checkpoint

**Lo schermo della porta mostra il `full_name` dell'account acquirente**, dove
`D-50-18b` dice che il nome va all'account e **non** allo staff, e `D-49-03` dice
che il biglietto e' **al portatore**. Visibile in due delle quattro schermate.

**Non arriva da `holder_label`**, che `P-50-7` ha verificato privo di nome e che
lo e' ancora. Arriva dal profilo, lungo un percorso che esiste da prima di
questa fase:

- `src/app/api/tickets/attendance/route.ts:814-864` — la lista scaricata sul
  telefono legge `profiles.full_name` e lo mette nel campo `name`;
- `src/lib/offline/checkin-store.ts:786-789` — la coda offline lo conserva;
- `src/app/(admin)/admin/scanner/ScannerClient.tsx:2186` — lo schermo lo rende;
- `src/app/api/tickets/checkin/route.ts:1077-1095` — il percorso online fa la
  stessa lettura dal server.

**Cosa ha cambiato la fase 50: non il comportamento, la copertura.** Prima, chi
comprava da ospite senza lasciare un nome finiva sullo schermo come *«Ticket
holder»*; ora il modulo gratuito raccoglie il nome, `handle_new_user` lo scrive
nel profilo, e **ogni acquirente** arriva alla porta con il proprio nome.

**E' una DECISIONE DEL PROPRIETARIO**, non un difetto da correggere di rimbalzo:
nasconderlo costa una modifica al percorso critico della porta — lista, coda,
due schermate, e una nuova prova con la radio spenta — e toglie allo staff
l'unico appiglio che ha davanti a una fila; accettarlo costa la **riscrittura di
`D-50-18b`**, che oggi descrive una cosa che il prodotto non fa. Le due strade,
con i loro costi, sono in `deferred-items.md` §7.

---

## Cosa questa corsa ha toccato, e cosa no

**Tutte le scritture sono andate sul laboratorio.** Sulla produzione questa
corsa ha eseguito **due sole letture**, entrambe dichiarate in `50-ESITI.md`
invece di essere taciute: `GET /v1/projects` (per accertare che il laboratorio
fosse `ACTIVE_HEALTHY`) e una `select` su `public.formats` con
`read_only: true`, per misurare la deriva del catalogo.

**Nessuna scrittura, nessuna modifica di configurazione e nessuna chiamata di
autenticazione hanno raggiunto il progetto di produzione.**

| Passo manuale | Stato |
|---|---|
| `A.1` — signup spento, **laboratorio** | **eseguito** 15:16:45Z |
| `A.2` — signup spento, **produzione** | **da eseguire**, piano 50-11 |
| `B.1` — modello di conferma, **laboratorio** | **gia' nello stato di arrivo**, misurato, nessuna azione |
| `B.2` — modello di conferma, **produzione** | **da misurare e poi eseguire**, piano 50-11 — e ora si sa **come** misurarlo senza aprire il cruscotto |

---

## Cio' che nessuna di queste otto prove puo' dire

Scritto perche' un documento di esiti che tace i propri limiti e' un documento
che verra' citato oltre cio' che ha provato:

- **che la produzione si comporti come il laboratorio** — sono due progetti, e
  la versione di GoTrue dispiegata su ciascuno non e' nota da qui;
- **che la cache dei browser altrui abbia dimenticato il rimando permanente** —
  cio' che si sa e' che la strada finisce comunque in una 404;
- **che una mail sia arrivata** — `email_deliveries` dice `outcome: unverified`,
  che e' la parola giusta: il fornitore ha accettato, nessuno ha visto la
  casella;
- **che la porta regga una fila** — `P-50-8` ha provato **un** biglietto, con
  **un** telefono, con **una** doppia lettura. Resta non esercitato il concorso:
  due telefoni che leggono lo stesso codice a radio spenta e si incontrano solo
  alla sincronizzazione. Il prodotto ha una classificazione apposta
  (`two_devices`, `door_scan_events.cause`) e nessuno l'ha messa alla prova.

---

## Verifica, in un repository senza test runner

Questo piano non ha toccato `src/`: **nessuna riga di prodotto e' cambiata**,
quindi non c'era un `npm run build` da far passare su una modifica di questo
piano. La verifica **e' il piano stesso**: otto procedure percorse, con ora UTC,
strumento, comando e risposta alla lettera, e le letture prese **dal catalogo**
e non dalla superficie che le ha prodotte.

I criteri di accettazione dei tre task, controllati uno per uno:

- `50-ESITI.md` riporta `P-50-5` con `422` e `signup_disabled` alla lettera —
  **si'**;
- la lettura di `disable_signup` e' riportata prima e dopo il `PATCH`, con due
  `GET` distinte — **si'**, 15:15:45Z `false` e 15:16:47Z `true`;
- `P-50-6` e i due percorsi gemelli hanno ciascuno esito e tempo — **si'**,
  quattro percorsi piu' la prova nuda;
- il runbook porta la riga datata per il laboratorio e quella della produzione
  e' ancora vuota — **si'**;
- `P-50-8`: sei passi riportati, accettazione in aereo al passo 4, **una** sola
  convalida letta dal database al passo 6, modalita' aereo dichiarata — **si'**;
- nessun indirizzo reale e nessun nome di persona nei file — **verificato con un
  grep**: gli unici indirizzi sono `@lab.invalid`, e il riferimento del progetto
  di laboratorio non compare.

---

## Deviazioni dal piano

### Nessuna correzione automatica

Nessuna delle regole 1-3 e' scattata: il piano non modificava codice, e le sette
non conformita' trovate erano **fuori dal perimetro** del task che le ha
trovate. Sono in `deferred-items.md`, che e' dove il perimetro dice di metterle.

### Un checkpoint, ed e' quello che il piano dichiarava

`Task 3` era `checkpoint:human-verify` per costruzione — *«pretende una radio
spenta davvero»*. Il piano si e' fermato, il proprietario ha percorso i sei
passi sul proprio telefono, e questa ripresa ha scritto l'esito **rileggendo il
catalogo** invece di fidarsi del racconto. E' la ragione per cui la settima non
conformita' esiste: le quattro schermate portavano un nome che nessuno cercava.

---

## Commit

| Hash | Cosa |
|---|---|
| `6758956` | gli esiti delle sette procedure percorse, e le sei non conformita' |
| `0692a5d` | il runbook dopo la corsa, e le sei voci differite |
| `20fc89d` | `P-50-8`: la porta a radio spenta, la rilettura dal catalogo, la settima non conformita' |
| `82b2c8e` | il registro chiude a otto, e il nome sulla porta passa al proprietario |

---

## Self-Check: PASSED

Quattro file dichiarati, quattro presenti. Quattro commit citati, quattro
presenti in `git log`. Nessun indirizzo reale, nessun nome di persona e nessun
riferimento del progetto di laboratorio nei file di questa fase.
