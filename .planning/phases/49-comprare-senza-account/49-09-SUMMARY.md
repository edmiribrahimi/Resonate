---
phase: 49-comprare-senza-account
plan: 09
subsystem: venue-secrecy / ticketing-payments
tags: [venue-reveal, monotone-guard, observability, guest-purchase, critical-path]
status: eseguito — task 1 e 2 a terra, task 3 APERTO (checkpoint bloccante, sei passi)
provides:
  - "la restrizione della spedizione ai biglietti di UN ordine, applicata in un punto solo e obbligatoria per tipo"
  - "il secondo percorso che fa uscire l'indirizzo: chi compra dopo la rivelazione lo riceve per mail"
  - "la faccia del fallimento — «pagati, indirizzo non partito» — sulla pagina di chi lavora la serata"
requirements: [BUY-03]
decisions:
  - "Il filtro copre tutte e tre le interrogazioni tramite UN builder, contro un Record TOTALE sulle fonti: una quarta fonte e' un errore di compilazione"
  - "La restrizione e la guardia di tempo sono campi OBBLIGATORI di un argomento obbligatorio: la chiamata senza di esse non compila"
  - "Il fallimento si scrive in ticket_orders.error_message lasciando status = completed — decisione del proprietario del 2026-09-06, nessuna migration"
  - "Lo strappo semantico di error_message e' dichiarato nel codice che la scrive E in quello che la legge, perche' il COMMENT della colonna richiederebbe una migration"
  - "Il failureKind proprio vince sul criterio «diff del cron vuoto» — e lo stesso meccanismo esiste una seconda volta, in RevealVenueDialog, che il piano non prevedeva"
key-files:
  modified:
    - src/lib/venue-reveal/reveal-party-venue.ts
    - src/app/api/webhooks/sumup/route.ts
    - src/app/(admin)/admin/(work)/events/[id]/tickets/page.tsx
    - src/app/api/cron/venue-reveal/route.ts
    - src/app/(admin)/admin/events/[id]/reveal/RevealVenueDialog.tsx
metrics:
  completed: 2026-09-06
  tasks_executed: 2
  commits: 2
---

# Fase 49 Piano 09 — Summary

## Esito in una riga

**Chi compra dopo che la rivelazione e' scattata riceve l'indirizzo per mail,
una volta sola, ristretto ai biglietti del proprio ordine — e se quella mail non
parte, un essere umano lo vede su una pagina prima della serata.** Chi compra
prima non riceve niente in anticipo, e la guardia per serata non e' stata
toccata da nessun ramo.

Il **task 3 resta aperto**: e' un `checkpoint:human-verify` bloccante, e i suoi
passi sono **sei**, non cinque.

**Questo referto conserva le misure dell'esecuzione precedente**, che si era
fermata correttamente e aveva trovato i due difetti poi corretti nel piano. Le
sue misure erano buone e restano; qui sotto sono marcate dove sono state
**rimisurate** contro il codice scritto.

---

## 1. Cosa scatta, e quando

| Condizione, nell'ordine in cui e' interrogata | Cosa succede |
|---|---|
| l'ordine e' gia' `completed` | **si esce prima di tutto** (`route.ts:367`) — e' la prima delle due ragioni per cui la seconda esecuzione non spedisce |
| l'ordine non ha `party_id` (ordine di evento) | **niente**, con una categoria di log propria e una riga scritta in questo referto: **non e' coperto** |
| la riserva non ha restituito gli id dei biglietti | **niente**, e la traccia parte: senza la lista una spedizione raggiungerebbe l'intera serata |
| la serata non e' leggibile | **niente**, e la traccia parte — *default chiuso*: uno stato non determinabile non e' uno stato vuoto |
| `isNightSecret` e' falso | **niente**. Su una serata non segreta nessuna mail d'indirizzo e' mai stata dovuta: il luogo sta gia' sulla pagina pubblica |
| `hasRevealFired` e' falso | **niente, e non e' un errore**: e' il caso ordinario. La rivelazione arrivera' dal cron, per tutti insieme |
| tutto vero | **una** chiamata per ordine, ristretta ai biglietti appena emessi |

Il momento e' **dopo** che i biglietti esistono e **dopo** la mail di conferma
(`route.ts:564`), dentro un `try` che non puo' far fallire l'incasso.

**Una chiamata per ordine, non per biglietto.** Il modulo deduplica per
indirizzo di posta: sei biglietti di un ordine sono **un** destinatario e **una**
mail.

---

## 2. La forma della restrizione — perche' una quarta interrogazione non le sfugge

Il difetto che l'esecuzione precedente aveva trovato nel piano: `collectRecipients`
fa **tre** interrogazioni — i biglietti della serata, le **prenotazioni** (una
prenotazione conta come un biglietto, `D-37-10`) e i **biglietti di evento**
(master, `party_id` nullo). Filtrare solo la prima avrebbe lasciato le altre due
intatte: **il pagamento di una persona avrebbe spedito l'indirizzo a chiunque
altro sulla serata non fosse ancora stato raggiunto.** Irreversibile, verso
persone che non hanno fatto niente.

**Cosa e' stato costruito, e non e' un filtro ripetuto tre volte.**

1. Le tre query non esistono piu' come tre espressioni affiancate. Esistono come
   **tre nomi** — `night_tickets`, `rsvps`, `master_tickets` — e **un solo
   costruttore**, `buildSource` (`reveal-party-venue.ts:434`), che e' l'unico
   posto del modulo in cui una query di destinatari si puo' costruire.
2. Il costruttore decide contro `REACHABLE_BY_AN_ORDER` (`:354`), un `Record`
   **TOTALE** sui nomi delle fonti. **Una quarta fonte aggiunta domani e' un
   errore di compilazione** finche' qualcuno non dichiara se un ordine puo'
   raggiungerla — che e' esattamente la domanda che il quarto lettore avrebbe
   altrimenti saltato. Stessa forma, e stessa ragione, di `REPORTABLE_FAILURE`
   nel cron.
3. Le **prenotazioni** su una chiamata per ordine sono **saltate del tutto**, non
   filtrate a zero. Un ordine emette biglietti; un rsvp non ha ordine e il suo id
   non e' in nessuna lista d'ordine. «Saltata» si prova leggendo una riga;
   «filtrata a zero» dipenderebbe da come PostgREST rende un `in()` vuoto, che e'
   una scommessa che questo dominio non fa.
4. **Una lista vuota restringe a nessuno**, deciso **prima** di interrogare
   (`:416`). Default chiuso: una restrizione che non nomina nessuno non e'
   l'assenza di una restrizione.
5. La restrizione e' **in aggiunta** a `venue_reveal_sent = false`, mai al posto.
   Quella condizione e' l'idempotenza, e sostituirla rispedirebbe a chi ha gia'
   ricevuto ogni volta che un chiamante lo chiede. Il conteggio del simbolo nel
   modulo passa da **8 a 9**: non e' diminuito.

**E la chiamata senza restrizione non e' esprimibile.** Il webhook raggiunge il
modulo **solo** attraverso `revealPartyVenueForOrder` (`:1092`), la cui firma
pretende un argomento con **due campi obbligatori**:

- `night` — lo stato temporale della serata, su cui la funzione applica
  `hasRevealFired` **importato** da `venue-disclosure.ts`. Senza, non compila;
- `onlyTicketIds` — la lista. Senza, non compila.

Non e' disciplina, e non e' un commento: sono due errori di compilazione. Le due
strade vecchie — il cron e l'azione manuale — non hanno cambiato **una riga** al
proprio punto di chiamata.

---

## 3. I due conteggi di destinatari — l'idempotenza

Richiesta esplicitamente dal piano. **Rimisurata sul codice scritto**, non
riportata dalla versione precedente.

**Scenario.** Serata segreta, rivelazione **gia' scattata**. Un ordine da 2
biglietti, `T1` e `T2`, stesso acquirente. Entrambi nascono con
`venue_reveal_sent = false`.

| Esecuzione | Cosa filtra | Destinatari | Effetto |
|---|---|---|---|
| **1ª** | `party_id = N` · `venue_reveal_sent = false` · `id IN (T1,T2)` → 2 righe, **una persona** dopo la deduplicazione per indirizzo | **1** | una mail; `markBatchReached` porta `venue_reveal_sent = true` su `T1` e `T2` |
| **2ª** | stessa query: `T1` e `T2` ora hanno `venue_reveal_sent = true` → **0 righe** | **0** | `no_recipients`, nessun invio, nessuna marcatura |

**1 poi 0.** E lo zero ha **due cause indipendenti**, confermate leggendo il
codice scritto e non assunte:

1. la seconda consegna **non arriva nemmeno** a questo punto — il ramo esce su
   `ticketOrder.status === "completed"` a `route.ts:367`, e la riserva porta
   l'ordine a `completed` alla prima;
2. e se ci arrivasse, il filtro per riga `venue_reveal_sent = false` la
   svuoterebbe comunque.

**Le prenotazioni e i biglietti di evento della stessa serata non compaiono in
nessuna delle due esecuzioni**: la prima fonte e' ristretta agli id dell'ordine,
la seconda e' saltata, la terza e' ristretta agli stessi id. E' la proprieta'
che il passo 6 del checkpoint deve osservare dal vivo.

---

## 4. Cosa vede una persona quando la strada fallisce, e su quale superficie

### Perche' un log non basta, e non e' un'opinione

Questo progetto **non ha error tracking**: nessun errore raggiunge un essere
umano da solo. E su questa strada l'asimmetria e' misurata e vale la pena
riscriverla, perche' e' la ragione per cui il passo era `[BLOCKING]`:

| Come la rivelazione e' scattata | `venue_revealed_at` | Il cron del giorno dopo | Il pannello della rivelazione |
|---|---|---|---|
| **dalla finestra** (nessuno ha premuto) | `NULL` | nessun limite `createdBefore` → **raggiunge** chi ha comprato dopo | lo conta fra i «non ancora raggiunti» |
| **a mano** (qualcuno ha premuto) | valorizzato | passa `{ createdBefore: revealedAt }` → chi ha comprato dopo e' **escluso** | calcolato con **lo stesso limite** → **non lo vede** |

**Nel secondo caso questa strada e' l'unica**, e senza una traccia il suo
fallimento sarebbe invisibile su ogni superficie esistente: il pannello direbbe
*zero rimasti* mentre una persona che ha pagato non sa dove andare.

### La strada che il registro delle consegne non permetteva

`email_deliveries` **non puo' contenere un invio mai partito**, e resta misurato
due volte:

- la migration — `20260822130000_email_delivery_ledger.sql:64`,
  `provider_message_id text NOT NULL UNIQUE`;
- il catalogo vivo — `REQUIRED: ["id","provider_message_id","category","outcome","check_attempts","created_at"]`.

E i quattro valori di `outcome` — `unverified`, `delivered`, `undelivered`,
`unknown` — **presuppongono tutti che un invio sia partito**. Servirebbero **due**
modifiche di schema, e l'autorizzazione del 2026-09-06 e' `ESAURITA`.

### Cosa e' stato costruito invece — decisione del proprietario, 2026-09-06

**Dentro il ramo di fallimento**, `segnaAssenza` (`route.ts:87`) scrive la causa
in **`ticket_orders.error_message`** lasciando **`status = 'completed'`**.
`status` non compare in quell'aggiornamento, ed e' l'intero punto: i biglietti
esistono, il denaro e' buono, il codice QR apre la porta.

> **Verificato sul catalogo VIVO prima di scrivere, non dedotto dalla migration:**
> `error_message` **non e'** fra le dieci colonne obbligatorie di
> `ticket_orders`, quindi e' nullabile; `party_id` esiste ed e' anch'essa
> nullabile. Nessuna scrittura in produzione: la lettura e' la specifica OpenAPI
> di PostgREST.

**Lo strappo, dichiarato invece che nascosto.** Fino a oggi `error_message`
significava *«perche' l'ordine e' fallito»*, e qui la si scrive su una riga che
**non e' fallita**. Il `COMMENT` della colonna direbbe questo, ma cambiarlo e'
una migration: sta quindi scritto **nei due posti che la toccano** — nel codice
che la scrive (`segnaAssenza`) e nel codice che la legge (`page.tsx:512`).

### Cosa vede, esattamente, chi lavora la serata

Un **terzo** insieme sulla pagina della serata, con la sua sezione propria e non
una voce in piu' dentro *«Orders without tickets»* — quel titolo qui sarebbe
falso, perche' questi ordini i biglietti ce li hanno:

> **Paid, address never sent (N)**
> *nome@indirizzo* — *€ importo*
> *Paid, 2 tickets issued and valid — but the venue address never reached them.
> They can get in and do not know where to go. Send it from the night's reveal
> panel, before the night.*
> *reveal_send_failed: serata …, destinatari 1, spediti 0, ritentabile may_help*

**Perche' separato e non fuso con i falliti.** Fusi, chi legge non saprebbe piu'
se «errore» voglia dire *nessun biglietto* o *nessun indirizzo* — e sono **due
telefonate diverse a due persone diverse**: alla prima si dice che non ha niente,
alla seconda dove andare. Un insieme solo trasformerebbe la riga che grida in una
riga da interpretare.

**E la frase non stampa l'indirizzo.** Il rimedio indicato e' il bottone della
rivelazione sulla pagina della serata: questa pagina, che chiunque organizzi
apre, non e' un posto dove scrivere il luogo di una serata segreta.

### Quali esiti lasciano la traccia, e perche' e' un `Record` totale

`SENZA_INDIRIZZO` (`route.ts:47`) e' **totale** sugli esiti della rivelazione: un
esito nuovo e' un errore di compilazione, perche' **assente qui significherebbe
nessuna traccia** — cioe' una persona che ha pagato, non ha ricevuto l'indirizzo,
e di cui nessuno sa niente.

| Esito | Traccia | Perche' |
|---|---|---|
| `none` | no | almeno una mail e' partita, e qui il destinatario e' uno |
| `reveal_not_due` | no | non era dovuto niente: il cron ci arrivera' |
| `no_recipients` | **si** | e la divergenza col cron e' deliberata — vedi sotto |
| `send_failed` | **si** | nessuna mail e' partita |
| `recipients_unavailable` | **si** | non si e' potuto leggere chi aveva diritto |
| `party_not_found` | **si** | non producibile da qui, ma resta un verdetto |

**`no_recipients` vale `true` qui e `false` nel cron.** Nel cron significa *«questa
serata e' gia' stata servita»*, che e' lo stato di regime. Qui non puo'
significare quello: i biglietti sono nati **in questa stessa consegna** con
`venue_reveal_sent = false`, e il ramo si raggiunge **una volta sola per ordine**.
Zero destinatari vuol dire quindi che chi ha appena pagato **non e' stato visto
da chi spedisce** — un'assenza da dire, non uno stato di regime.

### Il limite residuo, dichiarato

Se anche la scrittura su `ticket_orders` fallisse, resta **solo** il log
(`tickets.order_reveal_gap_unrecordable`). In quel caso esiste una persona che ha
pagato, non sa dove andare, e **nessuna superficie lo mostra**. E' dichiarato qui
come limite invece di essere lasciato credere coperto.

---

## 5. Le invarianti, verificate e non affermate

| Invariante | Come lo si sa |
|---|---|
| `venue_reveal_email_sent` (guardia **per serata**) mai scritta dal webhook | `grep -c` sul webhook: **0** |
| … ne' dal modulo che spedisce | `grep -c` sul modulo: **3**, e tutte e tre sono **righe di prosa** (`:45`, `:245`, `:792` prima delle modifiche) che dichiarano che questo modulo non la scrive. Vedi §7 |
| La condizione con cui il cron la alza | invariata: quel blocco non e' stato toccato |
| Il predicato non e' riscritto al punto di chiamata | `grep -cE "venue_secret\s*===\|revealed_at\s*!==\s*null"` sul webhook: **0** |
| Non spedisce «a tutti quelli dell'evento» | la restrizione copre le tre fonti da un punto solo, ed e' obbligatoria per tipo (§2) |
| Non anticipa | **due** guardie sullo stesso predicato importato: una nel webhook (che deve registrare l'esito) e una dentro `revealPartyVenueForOrder`, che nessun chiamante puo' saltare |
| `markBatchReached`, l'ordine fra marcatura e invio, `recordBatchSend` | non toccati |
| Produzione | **zero scritture.** Due letture, entrambe in sola lettura: i conteggi (`ticket_orders` 0, `tickets` 0, `event_parties` 3) e la specifica OpenAPI |

---

## 6. Stato dei gate

| Gate | Esito | Nota |
|---|---|---|
| `npm run build` | **0** | verde dopo il task 1 e dopo il task 2 |
| `npx tsc --noEmit` | **0** | |
| `npm run verify:venue-surfaces` | **0** | |
| `npm run verify` | **1**, per una ragione **pre-esistente** | `verify:touch-targets`, 3 elementi. **La lista degli elementi rossi e' identica byte a byte prima e dopo** (`diff` sui due referti): `GuestTokenDisplay.tsx:689`, `:702`, `emails/ticket-order.tsx:231`. Nessuno dei tre e' nei file di questo piano. Controllata la **lista**, non il codice d'uscita, cosi' che un fallimento nuovo non potesse nascondersi dietro il vecchio |

**Nessun test e' passato, perche' non esistono.** Non c'e' un test runner per il
prodotto: la verifica e' `npm run build` piu' cio' che e' scritto qui e i sei
passi del task 3.

---

## 7. Deviazioni — tre criteri del piano non erano soddisfacibili alla lettera

Tutte e tre riguardano **grep**, e in tutte e tre la sostanza e' rispettata.
`meta-gates.md`: vince il piu' restrittivo, e il conflitto si documenta.

### 7a. `venue_reveal_email_sent` = 0 nel modulo — era gia' 3 **prima** di toccarlo

Il criterio pretende `0` su `reveal-party-venue.ts`. Il file ne aveva **3** al
commit `5f1e260`, e tutte e tre sono **commenti** che spiegano perche' quel
modulo non scrive la guardia per serata. Il criterio era quindi rosso su un file
intatto, e il suo `<verify><automated>` sarebbe fallito senza che nessuno avesse
scritto una riga.

**Cancellare tre righe di buona documentazione per far passare un grep** sarebbe
stato il peggiore dei due esiti. Il conteggio resta **3**, le tre righe sono le
stesse, e la proprieta' vera — *nessun codice di questo modulo scrive quella
colonna* — e' verificata leggendole.

### 7b. `hasRevealFired` = 1 nel webhook — e' **2**

Una **chiamata** (`route.ts:676`) e un **import** (`:18`). Il criterio e'
soddisfacibile solo non importando il predicato, cioe' riscrivendolo — che e'
esattamente cio' che le invarianti del piano vietano. Una decisione, un punto di
chiamata, importato dall'unica casa.

### 7c. `git diff` vuoto sul cron — impossibile insieme a «un `failureKind` proprio»

Trovato dall'esecuzione precedente e confermato: `REPORTABLE_FAILURE`
(`cron/venue-reveal/route.ts:63`) e' un `Record` **totale** su
`VenueRevealFailureKind`, quindi un membro nuovo e' un errore di compilazione in
quel file. Vince il `failureKind` distinto: riusare `no_recipients` direbbe
*«nessuno aveva diritto»* dove la verita' e' *«non era ancora il momento»*, cioe'
il `catch` che collassa due cause che `meta-gates.md` vieta.

**Costo: una riga, a comportamento invariato** — il valore e' **irraggiungibile**
dal cron, che non chiama `revealPartyVenueForOrder`. E' marcato `true` e non
`false` di proposito: se comparisse davvero li', significherebbe che il filtro
della finestra e il predicato non concordano sulla stessa serata, che e' un
verdetto e non una serata tranquilla.

### 7d. Lo stesso meccanismo esiste **una seconda volta**, e il piano non lo prevedeva

`RevealVenueDialog.tsx:277` porta uno `switch` **esaustivo** sullo stesso
`failureKind`. Il membro nuovo lo ha reso rosso al build con
`TS2366 — Function lacks ending return statement`.

**[Rule 3 — blocco]** Un arco in piu', stessa ragione, stesso comportamento: il
valore e' irraggiungibile da quella superficie, perche' i due atti del dialog
passano dall'azione manuale. La frase dice cosa significherebbe — *«questa
risposta non dovrebbe essere raggiungibile da questo schermo»* — invece di
fingere che sia ordinaria. **Quinto file toccato**, dichiarato invece che
nascosto.

---

## 8. La prova per mutazione: **non eseguibile**, e diventa un passo di `49-11`

Il criterio chiede di far fallire deliberatamente la rivelazione e verificare che
l'ordine porti `error_message` con `status` ancora `completed`.

**Richiede una riga d'ordine che non esiste.** Misurato in sola lettura oggi:

```
ticket_orders  -> 0 righe
tickets        -> 0 righe
event_parties  -> 3 righe
```

**Non e' stata seminata nessuna riga**: l'autorizzazione di scrittura in
produzione e' `ESAURITA`, e il piano dice esplicitamente cosa fare in questo caso.
La prova si dichiara **non eseguibile** e diventa un passo scritto:

> **`P-REV-MUT-1` (per `49-11`, in ambiente di sviluppo).** Su una serata di
> prova **gia' rivelata**, rendere illeggibile la chiave del fornitore di posta
> — `RESEND_API_KEY` assente — e **asserire che la mutazione sia stata davvero
> applicata** prima di leggerne l'esito (avviare il processo e verificare che la
> variabile non sia definita). Comprare un biglietto da ospite. Osservare, sulla
> riga dell'ordine: `status` = `completed`, `error_message` valorizzato con una
> causa `reveal_…`, i biglietti esistenti. Osservare, sulla pagina della serata:
> l'ordine compare sotto **«Paid, address never sent»** e **non** fra i falliti.
> Ripristinare la chiave.

---

## 9. Cosa NON e' coperto — l'ordine di evento

Un ordine con `party_id` nullo — un biglietto per l'intero evento — **non riceve
niente da questa strada**. La rivelazione e' **per serata**, e da qui non si
sceglie a quale delle N serate spedire: sceglierne una sarebbe inventare.

**Oggi non e' raggiungibile**: `purchaseTicketsGuest` pretende una serata
(`partyId: string`), quindi ogni ordine d'ospite ne ha una. Ma la colonna e'
nullabile, il ramo esiste, ed e' scritto qui invece di essere scoperto quando
qualcuno vendera' un pass d'evento. Il ramo logga con una categoria propria
(`tickets.order_reveal_no_party`) e **non** scrive `error_message`: non e' un
guasto di questo ordine, e' una strada non costruita.

---

## 10. Il task 3 resta aperto — sei passi, non cinque

E' un `checkpoint:human-verify` **bloccante**. Non e' stato eseguito, non e'
stato simulato, non e' stato marcato fatto. Va percorso da chi configura le
serate, su una **serata di prova**, in ambiente di sviluppo:

1. serata segreta **non** rivelata, acquisto da ospite → arrivano i biglietti e
   **nessun indirizzo**, in nessuna superficie: mail, pagina dei biglietti,
   ritorno dal pagamento;
2. rivelazione a mano → l'indirizzo arriva al primo acquirente, come sempre;
3. **secondo acquisto adesso**, con un indirizzo diverso → arrivano i biglietti
   **e** l'indirizzo. E' il caso che questa fase esiste per chiudere;
4. cron rilanciato → **nessuna seconda mail** a nessuno dei due: il numero di
   mail di rivelazione per indirizzo e' esattamente **1**;
5. la guardia **per serata** e' identica a com'era al passo 2 — la mail al
   secondo acquirente non deve averla mossa;
6. **il sesto, che discende dal difetto trovato e corretto:** sulla stessa
   serata, **una prenotazione e un biglietto di evento non ancora raggiunti**. Al
   passo 3 **nessuno dei due deve ricevere niente** — l'acquisto di una persona
   non spedisce l'indirizzo a un'altra.

Riportare i sei esiti con quello che si e' **osservato**, non con quello che ci
si aspettava.

---

## 11. Cosa non e' verificato, e perche'

Non esiste un test runner per il prodotto: **nessun comportamento di questo piano
e' stato eseguito.** Le affermazioni di questo referto sono di tre tipi, e la
distinzione va tenuta.

- **Misurate** — il vincolo su `provider_message_id` (migration + catalogo vivo);
  il vocabolario di `outcome`; la nullabilita' di `ticket_orders.error_message` e
  `party_id` sul catalogo vivo; i tre conteggi di riga in produzione; il verde di
  `build`, `tsc` e `verify:venue-surfaces`; l'identita' byte a byte della lista
  rossa di `verify:touch-targets` prima e dopo; i quattro `grep` del §5.
- **Verificate dal compilatore** — che la restrizione e la guardia di tempo non
  possono essere omesse dal chiamante nuovo, e che una quarta fonte di
  destinatari o un esito nuovo non compilano finche' non sono dichiarati. Sono
  le uniche affermazioni comportamentali di questo referto che qualcosa di
  automatico regge davvero.
- **Lette dal codice e non eseguite** — i due conteggi di destinatari del §3, e
  il fatto che prenotazioni e biglietti di evento restino fuori. Sono deduzioni
  da query che si leggono: reggono quanto la lettura, e **vanno confermate ai
  passi 3, 4 e 6 del checkpoint**.

Nessuna e' stata arrotondata, e nessuna prova comportamentale e' stata inventata.

---

## Self-Check: PASSED

- `src/lib/venue-reveal/reveal-party-venue.ts` — FOUND
- `src/app/api/webhooks/sumup/route.ts` — FOUND
- `src/app/(admin)/admin/(work)/events/[id]/tickets/page.tsx` — FOUND
- `src/app/api/cron/venue-reveal/route.ts` — FOUND
- `src/app/(admin)/admin/events/[id]/reveal/RevealVenueDialog.tsx` — FOUND
- commit `fad0cf0` (task 1) — FOUND
- commit `41b9c37` (task 2) — FOUND
- `STATE.md` **non** toccato, deliberatamente
</content>
</invoke>
