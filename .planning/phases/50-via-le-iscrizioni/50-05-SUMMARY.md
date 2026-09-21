---
phase: 50-via-le-iscrizioni
plan: 05
subsystem: ticketing
tags: [server-action, ordine-a-totale-zero, rsvp, capienza, superficie-pubblica, laboratorio]

requires:
  - phase: 50-via-le-iscrizioni
    plan: 04
    provides: "`reserveFreeTickets` con undici cause di rifiuto, e `purchaseTicketsGuest` che pretende `fullName`"
  - phase: 50-via-le-iscrizioni
    plan: 06
    provides: "la pagina d'iscrizione cancellata — cioe' la ragione per cui il rimando del pulsante era diventato un 404"
provides:
  - "`FreeOrderForm`: il modulo con cui chiunque — con sessione o senza — prenota una serata gratuita e ottiene biglietti veri"
  - "`Full name` sul modulo a pagamento: senza, dal piano 50-04 ogni acquisto da ospite veniva rifiutato per nome assente"
  - "la capienza di una serata gratuita contata su DUE sorgenti: i biglietti della serata e le righe storiche di `rsvps`"
  - "`rsvps` senza piu' alcuna scrittura applicativa: sola lettura di fatto, oltre che di schema"
  - "`P-50-7` percorsa sul laboratorio, dal modulo fino al biglietto aperto da una firma"
affects: [50-08, 50-09, 50-11]

tech-stack:
  added: []
  patterns:
    - "due sorgenti per un conteggio che decide se una serata sembra aperta, e il termine piu' debole che sopprime il numero invece di stamparne uno falso"
    - "un'intenzione salvata nel browser sopravvive alla cancellazione di chi la scriveva: togliere il ramo che la consuma la lascia a filare per sempre"
    - "una regola revocata si riscrive con il rovesciamento dichiarato, e la ragione che la reggeva si conserva se non e' stata smentita"

key-files:
  created:
    - src/app/(public)/events/[slug]/FreeOrderForm.tsx
  modified:
    - src/app/(public)/events/[slug]/TierSelection.tsx
    - src/app/(public)/events/[slug]/page.tsx
    - src/app/(public)/events/[slug]/PendingIntentHandler.tsx
    - src/lib/email-delivery/categories.ts
    - src/lib/routes/next-redirect.ts

key-decisions:
  - "Il collegamento ai biglietti riusa il ritorno firmato del piano 49-06 invece di coniare una firma qui: l'azione restituisce un id d'ordine, e quel percorso e' l'unico che lo risolve in una pagina aperta senza sessione — nessuna superficie nuova, in particolare nessuna che possa mostrare un luogo"
  - "I biglietti della capienza si contano PER SERATA e non per livello: la capienza misura chi sta nella stanza, e filtrare per livello sbaglierebbe nel verso che vende un posto che non c'e'"
  - "Il ramo dell'intenzione `rsvp` in `PendingIntentHandler` non e' stato tolto ma svuotato e reso parlante: toglierlo avrebbe lasciato chi ha quella riga nel browser su «Completing your action…» per sempre"
  - "Le condizioni di montaggio del modulo NON sono state toccate, benche' il laboratorio provi che dopo il `DROP COLUMN` chiudono la superficie a chi ha una sessione: e' un cambio di verdetto su chi puo' comprare, e appartiene al piano che toglie `status`"

patterns-established:
  - "L'esito di un'azione resta sullo schermo e dichiara anche il fallimento della mail: in un repository senza error tracking, cio' che la persona legge e' l'unico effetto osservabile"
  - "Un modulo pubblico non ripete la validazione di forma del server: una seconda copia e' una seconda verita' che nessuno confronta"

requirements-completed: [REG-06, REG-01]

duration: 40min
completed: 2026-09-21
---

# Phase 50 Plan 05: Il modulo che sostituisce «I'm going» Summary

**Su una serata gratuita non c'e' piu' un pulsante che scrive una riga: c'e' un modulo che chiede nome e mail e produce un ordine a totale zero con biglietti veri — percorso sul laboratorio dal primo campo fino ai due QR aperti da una firma, senza sessione. Il modulo a pagamento chiede gli stessi due campi, la capienza di una serata gratuita si conta su due sorgenti, e `rsvps` non riceve piu' nessuna scrittura da nessun punto del prodotto.**

## Performance

- **Duration:** ~40 min
- **Started:** 2026-09-21T14:02Z
- **Completed:** 2026-09-21T14:25Z circa
- **Tasks:** 3 su 3
- **Files:** 1 creato, 5 modificati, **3 cancellati**

## Task Commits

| # | Commit | Cosa |
|---|---|---|
| Task 1 | `c4b3296` | il modulo della prenotazione gratuita |
| Task 2 | `59ea97c` | il nome sul modulo a pagamento, e i quattro innesti sulla pagina |
| Task 3 | `4fb5b20` | i tre file cancellati, e le due riparazioni che la cancellazione ha reso necessarie |

---

## Task 1 — il modulo

`src/app/(public)/events/[slug]/FreeOrderForm.tsx`, 272 righe di cui poco meno
della meta' sono la ragione delle altre.

| Cosa | Riga |
|---|---|
| la chiamata all'azione, **unico punto** | `:118` |
| il tetto, che arriva come prop e non e' una costante del file | `:97` |
| il rifiuto mostrato **come arriva dal server** | `:140` |
| l'esito della mail, dichiarato in **entrambi** i versi | `:174` |
| il collegamento ai biglietti | `:149` |
| `Full name` | `:221` |

### I sei grep del task, misurati

| Grep | Atteso dal piano | Misurato |
|---|---|---|
| `Full name` | ≥ 1 | **2** |
| `reserveFreeTickets` | 1 | **2** — vedi sotto |
| `qualcosa e' andato storto\|something went wrong` | 0 | **0** |
| `window.location\|router.refresh\|setTimeout` | 0 | **0** |
| `register` | 0 | **0** |
| `maxTicketsPerOrder\|max_tickets_per_order\|cap` | ≥ 1 | **11** |

**Il secondo diverge, e la divergenza si dichiara invece di ripararla con un
trucco.** `grep -c` conta **righe**, e un modulo che importa una funzione e la
chiama ne ha due: l'import a `:6` e la chiamata a `:118`. Portarlo a uno
avrebbe richiesto di rinominare l'import per non nominare la funzione al punto
di chiamata — cioe' scrivere il codice peggio per compiacere un conteggio, che
e' l'errore che il piano 50-07 ha gia' dovuto correggere una volta in questa
fase. **L'intento del criterio e' soddisfatto: un solo punto di chiamata, e
un'azione sola.**

### Perche' il collegamento passa da `payment/callback`

L'azione restituisce `orderId`, `ticketCount`, `emailSent` — **non** un link
firmato, e non poteva: la firma si conia con un segreto che un componente
client non ha e non deve avere. `payment/callback` con `ctx=ticket_order`
risolve un id d'ordine in `/tickets/order/<firma>`
(`payment/callback/actions.ts:158`), **senza sessione**, ed e' la strada che il
piano 49-06 ha costruito per chi compra da ospite. Riusarla significa che
nessuna superficie nuova nasce qui. Il nome della rotta dice «payment» per un
ordine che non paga nulla: e' un indirizzo, non una frase all'utente, e
rinominarlo avrebbe rotto il ritorno del fornitore.

---

## Task 2 — il nome sul pagato, e la pagina

### (a) `TierSelection.tsx`

`Full name` a `:621`, sopra la mail, con `autoComplete="name"`; lo stato a
`:326`; il valore passato all'azione a `:410`.

**Senza questo campo la fase era rotta a meta'**: dal piano 50-04
`purchaseTicketsGuest` rifiuta con `guest_name_missing` qualunque chiamata
senza nome, e fino a questo commit **ogni acquisto da ospite sarebbe stato
rifiutato**. La conseguenza era dichiarata nel SUMMARY della 04 e chiusa qui,
nella stessa fase e prima dello stesso deploy.

**Il commento revocato.** La sezione in testa al file si intitolava *«nessun
nome si chiede qui, e non e' una dimenticanza»*. E' stata **riscritta con il
rovesciamento dichiarato** (`:13-40`), non cancellata — e la ragione che la
reggeva **non e' stata smentita** e sopravvive: uno staff che alla porta legge
un nome e si trova davanti un'altra persona rifiuta un ospite valido. Il nome
va all'account, `holder_label` resta un progressivo, la porta non vede nomi.

> **Una deviazione sul criterio, dichiarata.** Il piano pretende
> `grep -ci "nessun nome"` **0**, e la citazione letterale della frase revocata
> faceva **1**. La frase e' diventata una **parafrasi marcata come tale**
> (`:17-22`), che dichiara di esserlo e dice perche'. Misurato dopo: **0**.

### (b) `page.tsx`, quattro innesti e nessun altro

1. **Il montaggio** — `FreeOrderForm` a `:1828`, import a `:17`. Le condizioni
   sono **quelle di prima, parola per parola** (`:1824-1826`): serata futura,
   `access_type === 'free_rsvp'`, stesso pubblico. Riceve `partyId`, il tetto
   della serata, la mail della sessione e il nome **dai metadati della
   sessione** — nessuna lettura in piu', e in particolare nessuna lettura di
   una colonna che questa fase sta togliendo.
2. **«Ho gia' prenotato» → «ho gia' un biglietto»** — la lettura di `tickets`
   (`:668-676`) ora copre anche `free_rsvp`, e il blocco che disegna i
   collegamenti (`:1643`) vale di conseguenza anche su una serata gratuita.
   La lettura della prenotazione **storica** resta (`:724`), perche' chi ha
   prenotato prima di oggi non deve vedersi sparire la propria prenotazione.
3. **La capienza su due sorgenti** — i biglietti della serata (`:780`) piu' le
   righe storiche di `rsvps` (`:787`), sottratti dalla capienza a `:807`. Se
   **una** delle due letture non torna, il numero non si stampa e
   `spotsUnknown` si accende (`:795-806`): una somma vale quanto il suo termine
   piu' debole, ed e' la regola gia' applicata sopra ai livelli a pagamento.
4. **Nessuna scrittura nuova in `rsvps`** — `grep -nE 'from\("rsvps"\)'` su
   tutto `src/` da' **quattro** righe, e **nessuna** porta `.insert`,
   `.update` o `.delete`: due qui in lettura, due nel cron dei promemoria.

**Deviazione (Rule 2), dentro le righe toccate:** la lettura della prenotazione
storica scartava il proprio errore. Scartato, una lettura caduta diceva *questa
persona non ha prenotato* — cioe' faceva sparire una prenotazione vera senza
che nessuno lo sapesse. Ora ha la sua categoria (`:730`).

### Il conteggio richiesto dal piano

`venue_reveal_on_purchase` in `page.tsx`: **6 prima, 6 dopo**.
`git diff --name-only` di questo piano **non** contiene
`src/lib/venue-reveal/reveal-party-venue.ts` ne'
`src/app/api/cron/event-reminders/route.ts`.

---

## Task 3 — le tre cancellazioni

## File cancellati

| File | Cosa portava via |
|---|---|
| `src/app/(public)/events/[slug]/RsvpButton.tsx` | il pulsante, e **l'ultimo rimando vivo a `/register`** in tutto `src/` (`REG-01`) |
| `src/app/(public)/events/[slug]/rsvp-actions.ts` | `rsvpToParty` e `cancelRsvp`: **le uniche due scritture applicative su `rsvps`**, piu' il controllo `status === 'approved'` che sarebbe caduto con la colonna |
| `src/emails/rsvp-confirmation.tsx` | il modello della mail che accompagnava quella scrittura |

Residui in `src/` per `RsvpButton|rsvp-actions|rsvpToParty|cancelRsvp|RsvpConfirmationEmail`: **0**.

### La categoria che resta

`src/lib/email-delivery/categories.ts:79` — `rsvp_confirmation` e' **ancora
nell'elenco**, con il commento richiesto a `:63-77`: nessun mittente dal
2026-09-21, resta come vocabolario delle righe storiche. Toglierla farebbe
fallire con `23514` un `ALTER … ADD CONSTRAINT` su qualunque riga storica che
la porti, e farebbe tornare indietro la migration intera. Il `CHECK` di
`20260905140000` **non e' stato toccato**.

### Due riparazioni che la cancellazione ha reso necessarie

**1. `PendingIntentHandler.tsx` importava l'azione cancellata** — il build
sarebbe caduto. Il piano non lo prevedeva: e' Rule 3, riparata dentro il
proprio task.

Il ramo non e' stato tolto ma **svuotato e reso parlante** (`:90-112`).
L'intenzione che leggeva nessuno la scrive piu' — dopo la cancellazione del
pulsante, `resonate_intent` non ha **nessun** produttore in `src/` — ma
**puo' ancora esistere**, nel browser di chi ha premuto quel pulsante prima di
oggi ed e' stato mandato a iscriversi. Togliendo il ramo, nessuno avrebbe piu'
rimosso quella riga: la pagina sarebbe rimasta a filare su «Completing your
action…» a ogni visita, per sempre. Ora l'intenzione si butta e **lo si dice**,
con il modulo per prenotare visibile sulla stessa schermata.

**2. `src/lib/routes/next-redirect.ts`** — il docblock dell'allow-list
spiegava una voce nominando file cancellati (era gia' in `deferred-items.md`,
con **50-05 indicato come candidato naturale**). La prosa e' rimisurata: oggi
`/events/<slug>` non lo scrive **piu' nessuno**. **I pattern non si toccano** —
togliere una voce da quella lista e' una decisione d'accesso quanto
aggiungerla, e cio' che e' sparito e' il traffico, non il permesso.

---

## `P-50-7` — percorsa sul laboratorio

Il piano 50-04 l'aveva lasciata non eseguibile con la ragione scritta: una
Server Action non si chiama da fuori, e il modulo che la chiama era questo
piano. **Adesso esiste, ed e' stata percorsa** — `npm run dev:lab` (ref del
laboratorio, mai quello di produzione), serata `lab-free-night`, capienza 4,
livello `RSVP` a 0, guidando il browser e leggendo il catalogo con la chiave di
servizio del laboratorio.

| Passo | Atteso | Osservato |
|---|---|---|
| 1 — anonimo, modulo | tre campi | `Full name`, mail, quantita' — la pagina risponde 200 e il modulo si disegna **senza sessione** |
| 2 — nome + mail, quantita' 2 | ordine e biglietti | ordine `7aa2e37f…`, **2 biglietti** |
| 3 — l'ordine | totale 0, checkout nullo, stato chiuso, nome | `status: completed`, `total_amount: 0.00`, `quantity: 2`, `sumup_checkout_id: null`, `buyer_name` valorizzato |
| 3 — i biglietti | 2 righe, `free_rsvp`, **senza nome** | `holder_label` `1 di 2` e `2 di 2`, `issued_via: free_rsvp`, `sumup_checkout_id: null` |
| 3 — l'account leggero | `full_name` uguale al nome digitato | `profiles.full_name` = il nome digitato, `role: member` |
| 4 — la mail | una, con QR e link firmato | **non partita**, e il motivo e' del laboratorio: la chiave di prova del fornitore accetta solo l'indirizzo del proprietario. **Tre righe di log distinte** (`email.send_failed`, `tickets.order_email_send_failed`, `tickets.free_order_email_send_failed`) e **l'avviso sullo schermo**: *«i biglietti esistono, ma la mail non e' partita»*. E' `T-50-25` osservato dal vivo |
| 5 — stessa mail, nome diverso | secondo ordine, conto **non** ricoiato, `full_name` invariato | secondo ordine `c18b6ad3…` con `buyer_name` **nuovo**, stesso `user_id`, `profiles.full_name` **invariato** — `T-50-18` visto nell'unico posto in cui si vede |
| 6 — capienza | rifiuto con la sua causa | con 3 biglietti su 4 e una richiesta di 2: *«There are fewer tickets left than you asked for… 1 left, 2 asked for.»* — le cifre arrivano dalla RPC, non dal client |
| — la seconda meta' della capienza | `rsvps` storici contati | inserita **a mano** una riga storica in `rsvps`: la pagina passa da **«1 spots left»** a **«Sold out»**. Riga poi **cancellata**, tabella riportata a zero. E' `T-50-24` e `D-50-22` provati, non dedotti |
| — il campo vuoto | causa propria | premuto `Reserve` con la mail vuota: *«Enter the email where your tickets should go. Nothing was booked.»* — non una frase generica |
| — il collegamento | biglietti aperti **senza sessione** | il link del modulo atterra sulla pagina dell'ordine: *Biglietto 1 di 2* e *Biglietto 2 di 2*, **due QR**, il blocco «Completa il tuo account» — e **nessun nome** in nessun punto |

**Passi non percorsi, e perche':** la quantita' oltre il tetto (il selettore
non la offre: il tetto della serata e' il massimo del controllo), la stessa
azione su una serata **a pagamento** e una serata gratuita **senza livello a
zero** — le ultime due non sono raggiungibili dalla superficie, che su quelle
serate non disegna il modulo. Le tre cause esistono e sono coperte dai controlli
letti **dal database** in `free-order-actions.ts:275`, `:314`, `:351`.

**Stato lasciato sul laboratorio:** `lab-free-night` ha **3 biglietti su 4**,
due ordini e un account leggero. La riga di `rsvps` inserita per la prova e'
stata cancellata (`rsvps` → `[]`). Chi ripercorrera' la procedura riseminera'.

---

## Il restringimento sul venue, dichiarato e non scoperto — `T-50-22`

`venue_for_parties`, arm 4 (`20260905131000:188-194`), dice esplicitamente che
un RSVP **non** sta sotto `venue_reveal_on_purchase`, *«perche' spegnerlo
toglierebbe l'indirizzo a chi ha detto che viene mentre il cron continua a
spedirglielo»*.

**Da oggi una prenotazione e' un biglietto, e un biglietto sta sotto quel
flag.** Su una serata con `venue_reveal_on_purchase = false`, chi prenota
**dopo** questo deploy sta in un insieme piu' stretto di chi aveva prenotato
prima. E' un **restringimento**, ed e' la direzione che la guardia monotona
consente — ma va letto per quello che e':

- **nessuno perde** un indirizzo che aveva: lo storico di `rsvps` resta fra le
  tre sorgenti di destinatari (`reveal-party-venue.ts:330-357`), che **non e'
  stata toccata**;
- **chi prenota da oggi** entra dalla porta dei biglietti, non da quella degli
  RSVP;
- nulla di cio' che questo piano disegna mostra un luogo a qualcuno che prima
  non poteva vederlo: il modulo non legge colonne del luogo, e il collegamento
  riusa un percorso esistente.

Va ripetuto nel VERIFICATION della fase.

### `npm run verify:venue-surfaces` — **rosso, e non e' di questo piano**

```
G2  src/app/(public)/payment/callback/actions.ts selects
    {id, status, sumup_checkout_id, ticket_id};
    the authorised set is {id, status, ticket_id}.
```

**E' la stessa identica asserzione di prima di questo piano**, gia' riportata
dal SUMMARY del 50-04 (§«la verifica»), che a sua volta l'ha misurata alla
punta dell'onda 2. **La lista positiva non e' stata allargata** e quel file non
compare nel diff di questo piano: allentare un'asserzione di quel gate per
schiarire un rosso su un percorso di rivelazione e' l'unica modifica di questo
repository che non si annulla.

---

## Deviazioni dal piano

### Riparate dentro il proprio task

**1. [Rule 3 — blocco] `PendingIntentHandler.tsx` importava `rsvp-actions`**
- **Trovata in:** Task 3, prima della cancellazione.
- **Perche' bloccava:** il build sarebbe caduto sull'import di un file che non
  esiste piu'.
- **Riparazione:** ramo svuotato e reso parlante invece che rimosso — vedi
  sopra. Commit `4fb5b20`.

**2. [Rule 1 — difetto] `next-redirect.ts` nominava file cancellati**
- **Trovata in:** Task 3, dal grep dei residui.
- **Riparazione:** solo la **prosa**, mai i pattern. Commit `4fb5b20`.

**3. [Rule 2 — fallimento silenzioso] la prenotazione storica scartava il
proprio errore**
- **Trovata in:** Task 2, nelle righe che il piano ordina di conservare.
- **Riparazione:** `logUnreadableCount("event_detail.party_user_rsvp", …)` a
  `page.tsx:730`. Commit `59ea97c`.

### Due criteri di accettazione misurati **diversi** da come il piano li scrive

Entrambi sopra, con il numero e la ragione: `grep -c reserveFreeTickets` **2**
e non 1 (import + chiamata: un modulo normale non puo' fare meno), e
`grep -ci "nessun nome"` portato a **0** trasformando la citazione letterale in
una parafrasi dichiarata.

### Fuori perimetro, non riparato

Una sola cosa, e pesa: **con la colonna `status` via, chi ha una sessione non
vede ne' il modulo della prenotazione ne' il controllo d'acquisto.** Misurata
sul laboratorio, dove la migration e' gia' applicata: entrato come socio, la
pagina della serata renderizza **zero campi**; da anonimo, sulla stessa pagina
e nello stesso minuto, il modulo c'e' e prenota.

Non e' stata riparata qui per due ragioni, entrambe scritte: il piano ordina di
montare il modulo *«alle stesse condizioni di prima»*, e il docblock di
`page.tsx` dichiara che toccare `isApproved` e' **un cambio di verdetto su chi
puo' comprare**, che pretende un'autorizzazione propria. Il difetto si apre
**nell'istante del `DROP COLUMN`** e appartiene a 50-09 / 50-11. Scritta per
intero in `deferred-items.md`, con le due righe che la producono
(`page.tsx:1738` e `:1826`) e l'avvertenza che **un grep per `profiles.status`
non le trova**.

---

## La verifica

| Comando | Esito |
|---|---|
| `npm run build` | **exit 0**, `✓ Compiled successfully`, dopo **ogni** task |
| `npm run verify:routes` | **exit 0** |
| `npm run verify:conversion` | **exit 0** |
| `npm run verify:dialogs` | **exit 0** |
| `npm run verify:venue-surfaces` | **exit 1** — `G2`, **identica a prima di questo piano**, del percorso del pagato |
| `npm run verify:capabilities` | **non eseguito**: rosso per costruzione fino al piano 50-11 |

**Non esiste un test runner per il prodotto**, e nessuna riga qui sopra dice
che qualcosa e' verificato perche' i test passano. La verifica di questo piano
sono il build, i quattro gate, i grep misurati e **la procedura percorsa sul
laboratorio**, i cui esiti sono riportati con i valori osservati.

## Known Stubs

Nessuno. Non restano campi che non arrivano da nessuna parte, ne' rami che
fingono di fare qualcosa: l'unico ramo svuotato — l'intenzione `rsvp` — lo
dichiara a chi ci passa.

## Threat Flags

Nessuna superficie di rete, di autenticazione o di accesso a file nasce in
questo piano che non fosse gia' nel `<threat_model>`. Il solo indirizzo nuovo
raggiungibile e' un collegamento a una rotta **che esisteva gia'**.

---

## Self-Check: PASSED

| Affermazione | Controllo | Esito |
|---|---|---|
| `FreeOrderForm.tsx` esiste | `test -f` | **FOUND** |
| `RsvpButton.tsx` non esiste piu' | `test ! -f` | **CANCELLATO** |
| `rsvp-actions.ts` non esiste piu' | `test ! -f` | **CANCELLATO** |
| `src/emails/rsvp-confirmation.tsx` non esiste piu' | `test ! -f` | **CANCELLATO** |
| `c4b3296` · `59ea97c` · `4fb5b20` | `git log --oneline --all` | **tutti FOUND** |
| righe citate di `page.tsx`, `TierSelection.tsx`, `PendingIntentHandler.tsx`, `categories.ts` | rilette dal file **dopo** aver scritto il SUMMARY | corrette — una corretta durante il controllo (la lettura di `tickets` e' a `:668-676`, non `:665-672`) |
