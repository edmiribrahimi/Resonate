---
phase: 49-comprare-senza-account
plan: 10
subsystem: checkin-offline / access-gating
tags: [door, bearer-ticket, offline, double-scan, observability]
provides:
  - "l'etichetta che arriva alla porta: il nome quando c'e', «2 di 6» quando non c'e', mai il vuoto e mai «Unknown»"
  - "la stessa regola dell'etichetta online e offline, senza cambiare la forma dello store"
  - "il numero dei biglietti presentati due volte, in testa alla review invece che in fondo"
requires:
  - "tickets.holder_label, scritta all'emissione da reserve_ticket_order (piano 49-07)"
affects:
  - "il payload della presenza, cioe' cio' che finisce in IndexedDB su un telefono dello staff"
  - "la pagina di review della serata"
tech-stack:
  added: []
  patterns:
    - "la stringa vuota e' un'assenza: trattata come tale nella MAPPA, non a valle"
    - "una regola sola scritta due volte (server e device) invece di importata attraverso il filo"
key-files:
  modified:
    - src/app/api/tickets/attendance/route.ts
    - src/lib/offline/checkin-store.ts
    - src/app/(admin)/admin/events/[id]/review/ReviewListClient.tsx
decisions:
  - "L'etichetta viaggia nel campo `name` esistente invece che in un campo nuovo: il payload e' additivo per una release, e un campo nuovo avrebbe rotto il bundle precedente"
  - "Nessun cambio di forma dello store offline: DB_VERSION resta 5, nessun percorso di upgrade nuovo, nessun dato a rischio"
  - "Il conteggio in testa esclude `double_read` e conta per soggetto, non per riga"
  - "La riga offline dice che quelle scansioni NON sono state rifiutate: chiamarle rifiutate rassicurerebbe su una persona che e' dentro"
requirements: [BUY-01, BUY-04]
metrics:
  completed: 2026-09-06
  commits: 2
---

# Fase 49 Piano 10 — Summary

**La porta con un biglietto al portatore: l'etichetta che arriva allo staff, la
stessa regola con la radio accesa e spenta, e il doppio ingresso che diventa un
numero che qualcuno legge.**

## Cosa esiste

| Commit | File | Righe |
|---|---|---|
| `858721b` | `src/app/api/tickets/attendance/route.ts` · `src/lib/offline/checkin-store.ts` | +171 / −19 |
| `099078e` | `src/app/(admin)/admin/events/[id]/review/ReviewListClient.tsx` | +120 |

---

## Cosa lo scanner mostra per il biglietto di un ospite

Tre gradini, in quest'ordine, in `ticketLabel` (`attendance/route.ts:443`),
chiamata a `:864`:

1. **il nome del profilo**, se e solo se e' una stringa non vuota;
2. **`holder_label`** — «2 di 6» — passata **verbatim**;
3. **il tier piu' la coda dell'identificativo** — `Early Bird · 4f2a`, oppure
   `Ticket 4f2a` dove non c'e' tier.

`holder_label` e' stata aggiunta alla select dei biglietti (`:689`) e a
`TicketRow` (`:314`). **Nessun `profiles(...)` incorporato**: il conteggio e'
`0` prima e `0` dopo — PostgREST risponderebbe `PGRST200` e ogni scansione
tornerebbe `500`.

Il terzo gradino non e' un ripiego teorico: e' cio' che vedra' **ogni biglietto
emesso prima della fase 49**, che ha `holder_label` a `NULL` perche' non e' nato
da un ordine.

### Perche' `holder_label` si passa parola per parola

E' **la stessa stringa** che chi ha comprato vede sulla pagina dell'ordine
(`tickets/order/[token]/page.tsx:308`) e nella mail di conferma
(`order-confirmation.ts:346`). Staff e portatore guardano **una** etichetta, non
due rese diverse della stessa cosa — e alle due di notte, davanti a una fila,
due rese diverse sono due schermi da confrontare invece che uno da leggere.

## Cosa lo scanner deliberatamente NON mostra

- **Nessun nome chiesto all'acquisto, e nessuno derivato dall'indirizzo mail.**
  `D-49-03`: il biglietto e' al portatore, chi entra puo' non essere chi ha
  pagato. Un frammento d'indirizzo nominerebbe l'essere umano sbagliato, e uno
  staff che se ne fida **rifiuta un ospite valido** — l'errore che
  `checkin-offline.md` dichiara il piu' costoso, perche' avviene davanti a una
  fila. E' anche il gate *PII*: quel payload atterra in IndexedDB su un telefono
  e ci resta.
- **Mai «Unknown».** Con l'acquisto da ospite sarebbe meta' serata: un elenco in
  cui ogni riga dice la stessa cosa non e' un elenco.
- **Nessun venue.** Il payload non ne portava e non ne porta;
  `verify:venue-surfaces` resta **0**.

## Il difetto misurato, e dove andava riparato

`public.handle_new_user` scrive `full_name = coalesce(..., '')`, quindi
un'identita' coniata dietro un acquisto da ospite (piano 49-07) porta la
**stringa vuota**, mai `null`. `??` intercetta `null` e `undefined`; `''` non e'
nessuno dei due. **La porta non leggeva «Unknown»: leggeva il vuoto.**

| | prima | dopo |
|---|---|---|
| `grep -c "holder_label"` | 0 | 4 |
| `grep -c '?? "Unknown"'` | **2** | **1**, e l'unica superstite e' **prosa** dentro il docblock che spiega il difetto (`:383`) — nessuno dei due punti di codice usa piu' il solo `??` |
| `grep -c "profiles("` | 0 | 0 |

**La riparazione sta nella MAPPA, non a valle** (`:833`): l'entrata si scrive solo
quando c'e' un nome da scrivere. Scriverla a valle avrebbe corretto una riga e
lasciato rotte le altre due, perche' `profileMap` ha **tre** lettori e la stringa
vuota li zittiva tutti insieme:

- `ticketLabel` — il nome del titolare;
- `operatorLabel` (`:350`) — che ora restituisce `Unknown operator` invece di un
  vuoto dopo il separatore;
- `refundedHolderName` (`:373`) — che ora ripiega su `Refunded ticket`.

Due dei tre non erano nel piano. Sono stati riparati dalla stessa riga, ed e' la
ragione per cui quella riga sta li'.

## Sei biglietti di un ordine, alla porta

`holder_label` corre **per ordine** (`reserve_ticket_order.sql:229`), quindi i
sei biglietti di un ordine leggono «1 di 6» … «6 di 6». Sono sei righe
distinguibili fra loro, e **nessuna delle sei dice qualcosa su qualcuno**.

## La seconda scansione, e come si legge alle due di notte

**Online** il ramo `already_recorded` (`checkin/route.ts:1117-1164`) non e' stato
toccato: risponde con l'esito, **l'ora del primo ingresso** (`at`, che e'
`ticket.checked_in_at`, non quella di questa lettura) e chi l'aveva registrato.
Il rifiuto e' verde/rosso piu' un fatto, non una riga di log — che e' l'unica
forma leggibile in mano a una persona, al buio.

**Offline** la lettura di un biglietto gia' segnato passa da
`ScannerClient.tsx:2151-2163`: stesso `already_recorded`, con `recordedFact`
che dice quando e da chi. Anche questo intatto.

**Fra due telefoni offline nessuno dei due sa dell'altro**, quindi **entrambi
mostrano verde ed entrambe le persone entrano.** Non e' un difetto da riparare:
e' il limite dichiarato in `checkin-store.ts:52-53`, e il piano vietava di
toccare la classificazione. Cio' che conta e' che il fatto **resti scritto e si
veda**, ed e' il Task 2.

## Il doppio ingresso nella review: dove si legge, e cosa e' stato aggiunto

**Compariva gia'**, e la lettura e' stata fatta prima di scrivere una riga:

| Passo | `file:riga` |
|---|---|
| il ramo che risponde `already_recorded` | `src/app/api/tickets/checkin/route.ts:1139-1141` |
| la classificazione dell'esito in tre cause | `src/lib/door/classify.ts:208-239` |
| `two_devices` — telefono diverso, il caso che pesa | `src/lib/door/classify.ts:218` |
| il filtro che le **lascia passare** (nasconde solo `double_read` e i rimborsi post-serata) | `src/lib/door/classify.ts:341-346` |
| la riga disegnata, con l'ora e l'intervallo fra le due letture | `ReviewListClient.tsx:530-566` |
| la prosa «the same ticket was read on two devices, N minutes apart» | `ReviewListClient.tsx:129-130` |
| la nota «two people may have entered on one ticket» | `ReviewListClient.tsx:148` |
| il marchio della provenienza offline | `ReviewListClient.tsx:550` |

**Quindi la classificazione non e' stata toccata**, come il piano chiedeva:
`git diff` e' **vuoto** su `src/lib/offline/sync-manager.ts` e su
`ScannerClient.tsx`, e `classify.ts` non e' fra i file modificati.

### Cio' che mancava: il numero, e la sua posizione

Il conteggio esisteva come un `<li>` **muted, `text-xs`, in fondo alla pagina**,
in mezzo agli altri esiti (`COUNTER_LABEL`, `:156`). Senza error tracking un
fatto in quella posizione e' un fatto che nessuno legge — e al portatore quel
numero **non e' un esito fra gli altri**: `D-49-03` dice che la seconda
scansione e' *tutto* il meccanismo.

Aggiunto un blocco in testa alla lista (`ReviewListClient.tsx:437-489`), con
quattro decisioni dentro:

1. **Si conta per SOGGETTO, non per riga** (`:337-338`). Un biglietto presentato
   tre volte lascia due righe ed e' **un** biglietto.
2. **`double_read` e' escluso** (`:332-336`). Una ripetizione da un telefono
   solo, dallo stesso operatore, entro venti secondi, e' *l'operatore che non ha
   visto il primo scatto*: contarla qui sposterebbe un difetto delle luci dentro
   un numero sugli ospiti, che e' esattamente cio' che `classify.ts` esiste a
   tenere separato.
3. **Solo biglietti.** Guest list e membership non sono strumenti al portatore;
   restano nel conteggio in fondo.
4. **La riga offline dice la verita' scomoda** (`:460-484`): quelle scansioni
   **non sono state rifiutate alla porta**. Due telefoni non sanno l'uno
   dell'altro, la seconda persona e' entrata, e il conflitto e' emerso allo
   svuotamento della coda. La frase «le altre N sono state rifiutate» si scrive
   **solo se esiste un resto** — su una serata in cui ogni doppione viene da un
   telefono offline, dichiarare un rifiuto sarebbe dichiarare una cosa che non e'
   avvenuta.

**FIX-11 regge, ed e' stato verificato invece che assunto.** Niente notifica,
niente badge nella navigazione, niente inbox: il blocco si disegna sulla pagina,
solo quando il numero non e' zero, in una `Card` calma — **non** nel trattamento
`role="alert"` che prende la lettura fallita. La ragione scritta di FIX-11 era
*«non allenare chi supervisiona a smettere di leggere»*: mettere il numero dove
si legge per primo va nella stessa direzione, farlo lampeggiare no.

## Lo store offline, e il suo percorso di upgrade

**Non c'e' un percorso di upgrade nuovo, ed e' una scelta, non una fortuna.**

`DB_VERSION` resta **5** (`checkin-store.ts:57`). Nessun object store nuovo,
nessun indice nuovo, **nessun campo nuovo** su `AttendeeRecord`. L'etichetta
viaggia nel campo `name` che il record ha sempre avuto: cambia **cosa** ci
finisce dentro, non **dove**. Il controllo che il progetto ha dichiarato non
differibile — un upgrade che spiaggia una coda distrugge dati, non codice — **non
viene esercitato**, perche' non c'e' upgrade.

Era anche l'unica strada compatibile con il contratto scritto sul payload
(`attendance/route.ts:254-257`): *«un dispositivo dello staff puo' far girare il
bundle precedente contro questa API per una sessione, e quella sessione e' una
serata alla porta»*. Un campo nuovo sarebbe stato ignorato dal bundle vecchio, e
quella sera la porta avrebbe letto di nuovo il vuoto.

**Cosa e' cambiato dentro `checkin-store.ts`:** la stessa regola dell'etichetta,
scritta due volte invece che importata attraverso il filo — questo modulo e' la
meta' client e non condivide runtime con la rotta.

- `labelOrNull` (`:660`) — la stringa vuota e' un'assenza.
- `fallbackLabel` (`:677`) — `Ticket 4f2a` / `Guest 4f2a`.
- `mergeAttendees` (`:787-789`) — **un vuoto dal server non sovrascrive
  un'etichetta che il telefono gia' ha**. La direzione conta: un refresh puo'
  aggiungere cio' che il server sa, mai sottrarre cio' che il telefono sa. E' la
  stessa regola monotona con cui la riga sotto difende il flag di check-in.
- `checkInLocally` (`:915-918`) — il ripiego per il biglietto **comprato dopo lo
  scarico della lista**, che con l'ospite smette di essere raro. Scriveva
  `"Unknown"` su ogni riga di quel tipo; ora scrive qualcosa che si distingue
  dalla riga sotto.

**Nessun allargamento di cio' che il device tiene.** Nessun indirizzo, nessun
frammento d'indirizzo, nessun luogo: `grep -nE "buyer_email|email\.split"` su
`checkin-store.ts` non trova **niente**, e il campo `email` resta quello che era.

## Verifica

| Controllo | Esito |
|---|---|
| `npm run build` | **0** |
| `npm run verify:venue-surfaces` | **0** |
| `npm run verify` | **1**, per il debito touch-target **preesistente** |

**Il rosso e' stato confrontato, non giustificato.** I tre file di questo piano
sono stati riportati al contenuto di `48f86d8` (copia di sicurezza nello
scratchpad, ripristino verificato con `git status` a pulito), `npm run verify`
e' stato rieseguito, e la **lista degli item guasti e' identica byte per byte**
prima e dopo:

```
src/app/(public)/events/[slug]/menu/GuestTokenDisplay.tsx:689  <button>
src/app/(public)/events/[slug]/menu/GuestTokenDisplay.tsx:702  <button>
src/emails/ticket-order.tsx:231                                <a>
```

Nessuno dei tre e' un file di questo piano; tutti e tre sono gia' registrati in
`deferred-items.md` (`DEF-08`, `DEF-09`). **Nessun rosso nuovo.** Gli altri 23
gate passano, `verify:persona` incluso.

> **Perche' il confronto e' stato fatto e non dedotto.** Il criterio del progetto
> e' *guardare la LISTA, non il codice d'uscita*: un guasto nuovo dentro un gate
> gia' rosso e' invisibile a chi legge solo `1`. Le mie modifiche non aggiungono
> nessun elemento interattivo — la sezione nuova e' `section` / `Card` / `h2` /
> `p` — ma questo e' un argomento, e l'argomento non e' la misura.

## Cosa NON e' verificato, e come si verificherebbe

**Nessuna prova comportamentale esiste, e nessuna era eseguibile.** Non esiste un
test runner per il prodotto; in produzione ci sono **zero biglietti**, **zero
ordini** e **zero conti staff**, e l'autorizzazione a scrivere e' `ESAURITA`.
Seminare una riga per rendere possibile una prova sarebbe stato scrivere in
produzione senza autorizzazione — non e' stato fatto.

Le procedure, numerate, per il piano 49-11:

1. **`P-DOOR-1` — l'etichetta di un ospite.** Con un ordine da piu' biglietti
   nato da un acquisto vero, aprire la serata sullo scanner e leggere la lista:
   ogni riga deve dire «1 di N» … «N di N», **nessuna riga vuota**, nessuna che
   dica «Unknown». *Osservabile: lo schermo dello scanner, prima di qualunque
   scansione.*
2. **`P-DOOR-2` — sei righe distinguibili.** Le N righe dello stesso ordine
   devono essere **diverse fra loro** e ordinabili a occhio. *Il fallimento ha
   una faccia precisa: due righe identiche.*
3. **`P-DOOR-3` — il biglietto vecchio.** Un biglietto con `holder_label` a
   `NULL` deve leggersi come `<tier> · <4 cifre>` e non come vuoto. **Non
   esistono biglietti in produzione**, quindi questa si prova sul primo emesso
   fuori da un ordine — o non si prova, e va detto.
4. **`P-DOOR-4` — la seconda scansione, radio accesa.** Scansionare due volte lo
   stesso biglietto: il secondo esito e' `already_recorded`, con **l'ora del
   primo ingresso** e chi l'aveva registrato. *Osservabile: il riquadro rosso, e
   il fatto sotto.*
5. **`P-DOOR-5` — la seconda scansione, radio spenta, DUE telefoni.** Stesso
   biglietto su due dispositivi, entrambi offline: **entrambi devono mostrare
   verde** — e' il comportamento voluto, non un guasto. Riaccendere la rete su
   entrambi e aprire la review: il biglietto deve comparire con causa
   `two_devices`, e **il conteggio in testa deve dire «1 ticket was presented
   twice»** con la frase che dichiara che **non e' stato rifiutato alla porta**.
   *E' la sola prova che il Task 2 esiste per un fatto vero e non per un numero.*
6. **`P-DOOR-6` — la doppia lettura dallo stesso telefono.** Stesso biglietto,
   stesso telefono, stesso operatore, entro venti secondi: **non deve** comparire
   nel conteggio in testa, e **deve** comparire in fondo fra le *reads within
   seconds*. E' il confine fra un difetto delle luci e un fatto su un ospite.
7. **`P-DOOR-7` — l'upgrade dello store.** Aprire la porta con un telefono che
   porta gia' un database alla versione 5 con voci in coda: **la coda deve
   sopravvivere**. Il piano non cambia forma allo store, quindi ci si attende
   che non succeda niente — ed e' esattamente il genere di attesa che va
   guardata invece che assunta.
8. **`P-DOOR-8` — il biglietto comprato dopo lo scarico.** Radio spenta,
   biglietto non in cache: **ammesso e segnalato**, mai rifiutato, e la voce che
   resta sul dispositivo dice `Ticket <4 cifre>` invece di `Unknown`.

**Nessuna di queste e' stata eseguita, e nessuna e' stata arrotondata.**

## Cosa il piano non aveva previsto

**1. `profileMap` aveva tre lettori, non uno.** Il piano nominava i due `??
"Unknown"` misurati. La stringa vuota ne zittiva **tre**: anche l'etichetta
dell'operatore e quella del biglietto rimborsato. Riparando la mappa invece che
le due righe a valle si sono chiusi tutti e tre, e il piano ne prevedeva due.

**2. Il difetto della stringa vuota NON vive sulla risposta della scansione
online.** Verificato invece che assunto: `checkin/route.ts:1092` usa
`else if (profilo?.full_name)`, cioe' un controllo di verita', non un `??`. La
stringa vuota non passa. Cio' che resta e' un'altra cosa e piu' piccola — quel
riquadro fa lampeggiare `Unknown` per un ospite — ed e' **fuori perimetro**:
registrata come `D-49-10-DEF-10` con la domanda che chi la chiudera' deve
decidere **prima**, cioe' se il riquadro della scansione debba portare la stessa
etichetta della lista o smettere di portarne una.

**3. Anche la review ha un `full_name ?? ""`, e li' non e' un difetto.**
`review/page.tsx:375` scrive la stringa vuota nella mappa delle etichette, ma
`ReviewListClient.tsx:549` la legge con `||` e non con `??`, quindi ripiega
correttamente su *«an unnamed operator»*. Guardato perche' e' la stessa specie di
riga, **non toccato** perche' non e' rotto — e scritto qui perche' chi rilegge
vedra' la stessa forma e dovra' sapere che e' gia' stata misurata.

## Il debito che questo piano NON chiude, e va nominato

`D-49-01`: la porta ha **due** credenziali. Il biglietto e' firmato HMAC; il
`membership_code` **no**, ed e' sufficiente da solo ad ammettere, senza leggere
ne' ruolo ne' stato (`attendance/route.ts:145`). Questo piano non allarga cio'
che quel codice apre — non lo tocca affatto — ma lo lascia dove sta. Va in
`49-VERIFICATION.md`.

## Self-Check: PASSED

- `src/app/api/tickets/attendance/route.ts` — FOUND, modificato in `858721b`
- `src/lib/offline/checkin-store.ts` — FOUND, modificato in `858721b`
- `src/app/(admin)/admin/events/[id]/review/ReviewListClient.tsx` — FOUND,
  modificato in `099078e`
- `858721b` — FOUND in `git log`
- `099078e` — FOUND in `git log`
- `git diff` vuoto su `src/lib/offline/sync-manager.ts` — confermato
- `git diff` vuoto su `src/app/(admin)/admin/scanner/ScannerClient.tsx` — confermato
- `npm run build` **0** · `verify:venue-surfaces` **0** · lista `verify` identica
  prima/dopo — confermati per esecuzione, non per deduzione
