---
phase: 49-comprare-senza-account
plan: 09
subsystem: venue-secrecy / ticketing-payments
tags: [venue-reveal, monotone-guard, observability, blocked, no-write-authorisation]
status: BLOCCATO — nessuna riga di codice scritta, per la condizione di arresto che il piano stesso dichiara
provides: []
requirements: [BUY-03]
decisions:
  - "Il passo 5 del task 2 e' irrealizzabile senza una migration: `email_deliveries.provider_message_id` e' NOT NULL UNIQUE, verificato sul catalogo VIVO"
  - "Nessun ripiego sul log, come il piano prescrive: si dichiara il blocco invece di simulare l'osservabilita'"
  - "Trovati due difetti nel piano oltre al blocco previsto — uno dei due allargherebbe la rivelazione a terzi"
metrics:
  completed: 2026-09-06
  tasks_executed: 0
  commits: 0
---

# Fase 49 Piano 09 — Summary

## Esito in una riga

**Nessuna riga di codice scritta.** La condizione di arresto che il piano
dichiara nel proprio task 2 e' **verificata come vera** contro il catalogo di
produzione, non contro un file di migration — e le due strade alternative
richiedono entrambe una migration, cioe' una scrittura in produzione che **non
e' autorizzata**: l'autorizzazione del 2026-09-06 e' `ESAURITA`.

L'albero e' pulito, `HEAD` e' `c012398`, e nessuna delle due invarianti
monotone di questo dominio e' stata avvicinata.

---

## 1. Il blocco previsto dal piano, misurato

Il task 2 porta un passo **[BLOCKING]** che pretende che il fallimento della
nuova strada lasci una traccia leggibile da una persona, scrivendo una riga in
`email_deliveries`. E porta la propria condizione di arresto:

> *«Se in esecuzione risultasse che `email_deliveries` non accetta una riga
> senza un identificativo del fornitore — cioe' senza che un invio sia mai
> partito — **fermarsi e dirlo**, invece di ripiegare sul log.»*

**Risulta. Misurato due volte, da due fonti indipendenti.**

### La fonte scritta

`supabase/migrations/20260822130000_email_delivery_ledger.sql:64`

```sql
provider_message_id text NOT NULL UNIQUE,
```

Le due migration successive — `20260822180000_email_ledger_night_paths.sql` e
`20260905140000_email_category_ticket_order.sql` — toccano **solo** il `CHECK`
delle categorie e la colonna `party_id`. Nessuna delle due allenta quel vincolo.

### La fonte viva, che e' quella che decide

Interrogato il catalogo di produzione in sola lettura, via la specifica
OpenAPI di PostgREST (nessuna scrittura, nessuna riga creata):

```
REQUIRED: ["id","provider_message_id","category","outcome","check_attempts","created_at"]
```

`provider_message_id` e' fra i campi **obbligatori**. La migration e il catalogo
concordano: non c'e' deriva di schema da cui sperare.

### E il vocabolario degli esiti non ha una parola per «non e' mai partita»

`email_deliveries.outcome` ha un `CHECK` di quattro valori — `unverified`,
`delivered`, `undelivered`, `unknown` — e **tutti e quattro presuppongono un
invio**. `unverified` significa *spedito, esito non ancora chiesto*;
`undelivered` significa *il fornitore dice che non e' stata consegnata*. Nessuno
dei quattro puo' dire *non e' partito niente*.

Quindi la riga chiesta dal passo 5 richiederebbe **due** modifiche di schema,
non una: rendere `provider_message_id` nullabile (o inventarne uno falso) **e**
aggiungere un esito. Un identificativo inventato sarebbe peggio del silenzio:
`email_deliveries` e' un registro in cui `recordBatchSend` scrive gia' *«meno
righe, tutte vere»* invece di attribuire per congettura, e una riga che dichiara
un invio mai avvenuto e' una bugia in un registro che serve a togliere le bugie.

---

## 2. La seconda strada, chiusa per la stessa ragione strutturale

Prima di concludere, la superficie del pannello legge **due** registri, non uno.
Il secondo e' la traccia degli atti — `public.venue_reveal_acts`, letta da
`VenueRevealPanel` sotto il referto delle consegne. Anche quella e' chiusa, e in
modo piu' profondo:

| Ostacolo | Perche' non e' aggirabile |
|---|---|
| `CHECK (act IN ('revealed','completed','re_hidden'))` | vocabolario chiuso: un quarto valore e' una migration |
| `actor_name NOT NULL` con `CHECK` di non-vuoto | ogni riga e' attribuita a **una persona**; qui l'attore e' un webhook |
| unico scrittore: `record_venue_reveal_act`, `SECURITY DEFINER`, `EXECUTE` al solo `service_role` | la firma e' fissa e non ha un ramo di fallimento |
| **semantica** | ogni riga di quella tabella significa *un indirizzo e' uscito*. Scriverci un fallimento farebbe mentire la traccia sull'unico fatto che esiste per registrare |

L'ultima riga e' quella che conta: anche con la migration, quella tabella
sarebbe il posto sbagliato.

---

## 3. Due difetti trovati nel piano, oltre al blocco previsto

Il piano non e' bloccato solo dal passo 5. Leggendolo contro il codice ne sono
emersi altri due, e **il secondo e' un allargamento della rivelazione**.

### 3a. Il criterio «diff del cron vuoto» e' incompatibile con «un `failureKind` proprio»

Il task 1 chiede due cose che non possono valere insieme:

- *«la funzione esce con zero destinatari e un `failureKind` **proprio**»*
- *«`git diff src/app/api/cron/venue-reveal/route.ts` e' **vuoto**»*

`src/app/api/cron/venue-reveal/route.ts:63` dichiara

```ts
const REPORTABLE_FAILURE: Record<VenueRevealFailureKind, boolean> = { … }
```

**totale sull'unione**, e il suo docblock dichiara che quella totalita' e' il
punto: aggiungere un membro all'unione e' un **errore di compilazione** finche'
qualcuno non decide da che parte sta. E' un buon meccanismo, e fa esattamente il
suo lavoro: un `failureKind` nuovo **obbliga** a toccare il file del cron.

I due criteri quindi non sono entrambi soddisfacibili. `meta-gates.md` dice cosa
fare — *vince il piu' restrittivo, e il conflitto si documenta* — e il piu'
restrittivo e' il `failureKind` distinto, perche' riusare `no_recipients`
significherebbe dire *«nessuno aveva diritto»* dove la verita' e' *«non era
ancora il momento»*, cioe' il `catch` che collassa due cause che `meta-gates.md`
vieta. Il costo e' **una riga** nel file del cron, a comportamento invariato.

**Non e' una ragione per fermarsi**, ed e' registrata perche' chi ripianifica
scelga consapevolmente invece di scoprirlo davanti al compilatore.

### 3b. `onlyTicketIds` come specificato spedirebbe l'indirizzo a terzi — questo si'

Il task 1 prescrive che `onlyTicketIds` sia applicato *«come `.in("id", ...)` in
aggiunta alle condizioni gia' presenti»*. `collectRecipients`
(`src/lib/venue-reveal/reveal-party-venue.ts:292-330`) fa pero' **tre** query,
non una:

1. i biglietti della serata — `party_id = <serata>`;
2. **le prenotazioni** — `rsvps`, `party_id = <serata>`;
3. **i biglietti di evento** — `event_id = <evento>`, `party_id IS NULL`.

Un `.in("id", …)` aggiunto alla sola prima lascia la seconda e la terza
**intatte**. Conseguenza, letta sul codice:

> Il pagamento di **una** persona farebbe partire l'indirizzo verso **tutti**
> quelli che su quella serata hanno una prenotazione o un biglietto di evento e
> non sono ancora stati raggiunti.

Tre ragioni per cui non e' un dettaglio da sistemare in corsa:

- viola l'invariante 3 **del piano stesso** — *«non spedisce a tutti quelli
  dell'evento»*;
- viola `D-49-04`, che dice che l'indirizzo raggiunge **l'acquirente**;
- e' **irreversibile**: `venue-secrecy.md` apre dichiarando che una rivelazione
  anticipata non ha rimedio, e questa lo sarebbe verso persone che non hanno
  fatto nulla.

La correzione e' semplice — la restrizione va applicata a **tutti e tre** i rami,
sopprimendo quello delle prenotazioni quando `onlyTicketIds` e' presente — ma
**e' un cambio al contratto di un'opzione su codice Critical**, e va deciso, non
improvvisato dentro un'esecuzione.

---

## 4. I due conteggi di destinatari — l'idempotenza, provata sul codice

Richiesta esplicitamente dal piano. Ricostruita leggendo le query, con la
restrizione applicata correttamente a tutti e tre i rami (§3b).

**Scenario.** Serata segreta, rivelazione **gia' scattata**. Chi compra prende un
ordine da 2 biglietti, `T1` e `T2`. Entrambi nascono con
`venue_reveal_sent = false` (default della colonna).

| Esecuzione | Cosa filtra la query | Destinatari | Effetto |
|---|---|---|---|
| **1ª** | `party_id = N` · `venue_reveal_sent = false` · `id IN (T1,T2)` → 2 righe, **una sola persona** dopo la deduplicazione per indirizzo | **1** | una mail; `markBatchReached` porta `venue_reveal_sent = true` su `T1` e `T2` |
| **2ª** | stessa query: `T1` e `T2` ora hanno `venue_reveal_sent = true` → **0 righe** | **0** | `failureKind: "no_recipients"`, `retryOutlook: "nothing_to_retry"`, nessun invio, nessuna marcatura |

**1 poi 0.** E lo zero ha **due** cause indipendenti, non una:

1. la seconda consegna **non arriva nemmeno** a questo punto — il ramo esce su
   `ticketOrder.status === 'completed'` (`route.ts:264`);
2. e se ci arrivasse, il filtro per riga `venue_reveal_sent = false` la
   svuoterebbe comunque.

Il conteggio e' di **persone**, non di righe: `emailMap` e' indicizzata
sull'indirizzo di posta, quindi due biglietti di un solo acquirente sono un
destinatario e una mail — il che e' anche perche' il piano chiede **una chiamata
per ordine** e non una per biglietto.

---

## 5. Cosa vede una persona quando la strada fallisce — la risposta onesta

La domanda del piano. La risposta misurata e' **peggiore di quanto il piano
supponesse**, e in un modo che vale la pena scrivere.

### Ci sono DUE esiti invisibili, non uno

Il piano prevede il caso in cui `revealPartyVenue` **solleva** prima che esista
una riga di registro. Ma la funzione ha anche due rami che **ritornano
normalmente** senza spedire e senza scrivere niente da nessuna parte:

- `failureKind: "recipients_unavailable"` — la lettura dei destinatari e'
  fallita (`reveal-party-venue.ts:638-648`);
- `failureKind: "send_failed"` — il fornitore ha rifiutato tutto
  (`:871`).

Nel cron questi due sono osservabili, perche' finiscono nel JSON della risposta
via `REPORTABLE_FAILURE`. **Chiamati dal webhook non hanno nessun lettore**: il
webhook risponde `200` a SumUp e il valore di ritorno muore li'. Un
`console.error` e' l'unica traccia, e `meta-gates.md` lo liquida in una riga —
*«il log e' un posto dove nessuno guarda»* — con l'aggravante misurata che
questo progetto **non ha error tracking**.

### E l'asimmetria che decide quanto costa

C'e' una rete sotto questa strada, **ma solo per meta' dei casi**, e la
differenza sta in come la rivelazione e' scattata:

| Come la rivelazione e' scattata | `venue_revealed_at` | Cosa fa il cron del giorno dopo | Cosa dice il pannello |
|---|---|---|---|
| **dalla finestra** (nessuno ha premuto) | `NULL` | nessun bound `createdBefore` → **raggiunge** chi ha comprato dopo | lo conta fra *«N persone non sono ancora state raggiunte»* |
| **a mano** (qualcuno ha premuto) | valorizzato | passa `{ createdBefore: revealedAt }` → chi ha comprato dopo e' **escluso** | `recipientsPending` e' calcolato con **lo stesso bound** (`actions.ts:589-593`) → **non lo vede** |

**Nel secondo caso la strada nuova e' l'unica**, e il suo fallimento e'
invisibile su ogni superficie esistente: il pannello dira' *zero rimasti* mentre
una persona che ha pagato non sa dove andare. Nel primo caso il ritardo massimo
e' una corsa del cron — fino a un giorno, sul piano Hobby.

E' questo che rende il passo 5 **[BLOCKING]** invece che desiderabile: senza di
esso la strada nuova sarebbe piu' silenziosa proprio nel caso in cui e' sola.

---

## 6. Le due strade per sbloccare — nessuna delle due e' eseguibile da qui

Entrambe richiedono una **migration**, cioe' una scrittura in produzione. Non
esiste autorizzazione: quella del 2026-09-06 copriva sei migration ed e'
`ESAURITA`. Sono presentate perche' la scelta e' del proprietario, non
dell'esecutore.

### Strada A — un registro che accetta un invio mai partito

`email_deliveries` diventa capace di dire *«questa mail non e' mai uscita»*:
`provider_message_id` nullabile piu' un quinto esito, o una tabella accanto.

- **Pro:** il pannello esistente lo mostrerebbe **senza modifiche**, perche'
  legge per serata e non per chiamante. E' l'osservabilita' piu' economica.
- **Contro:** tocca il registro su cui poggiano dodici percorsi di posta, e
  `provider_message_id` e' anche la chiave della riconciliazione — un `UNIQUE`
  nullabile va pensato insieme al cron che legge quella coda.

### Strada B — l'alternativa che il piano stesso nomina

Estendere la sezione *«Ordini senza biglietti»* di `49-07` a coprire anche
questa categoria: il fallimento si attacca all'**ordine**, sulla superficie di
chi lavora la serata, che esiste gia'.

- **Pro:** superficie gia' costruita e gia' guardata; l'ordine e' l'oggetto che
  la persona che ha pagato possiede.
- **Contro, e non e' piccolo:** `ticket_orders` non ha una colonna per questo.
  Riusare `error_message` **non basta**, perche' quella superficie disegna gli
  ordini in stato `failed` — e portare l'ordine a `failed` sarebbe **falso**: i
  biglietti esistono, il denaro e' buono, manca solo l'indirizzo. Il webhook di
  `49-07` dichiara gia' questa distinzione per il caso dell'ammissione
  (`route.ts:414-422`: *«NON si porta l'ordine a `failed`: i biglietti esistono
  e sono validi»*). Serve quindi **una colonna nuova**, cioe' comunque una
  migration.

**Osservazione per chi decide.** La strada B mette il fallimento davanti a chi
lavora la **serata**; la strada A davanti a chi lavora la **rivelazione** — che
e' la persona che puo' effettivamente rimediare, perche' ha il bottone *«manda ai
mancanti»* a due centimetri. Per questo motivo A e' preferibile per il dominio,
anche se costa di piu'.

---

## 7. Cosa NON e' stato toccato — verificato, non affermato

| Invariante | Stato | Come lo si sa |
|---|---|---|
| `venue_reveal_email_sent` (guardia **per serata**) | intatta | nessun file modificato |
| `tickets.venue_reveal_sent` (guardia **per destinatario**) | intatta | nessun file modificato |
| Il cron della rivelazione | invariato | `git status` pulito |
| Il predicato in `venue-disclosure.ts` | non riscritto in nessun punto di chiamata | nessun file modificato |
| Produzione | **zero scritture** | l'unica interrogazione e' stata una lettura della specifica OpenAPI di PostgREST |

---

## 8. Stato dei gate

| Gate | Esito | Nota |
|---|---|---|
| `npm run build` | **0** | baseline verde prima e dopo, perche' nulla e' cambiato |
| `npm run verify:venue-surfaces` | **0** | conosce **tre** superfici; questo piano non ne avrebbe aggiunta una quarta — aggiunge un percorso di **posta**, non una pagina, quindi nessun allargamento del gate era dovuto |
| `npm run verify` | **1**, per una ragione **pre-esistente** | `verify:touch-targets`, 3 elementi: `GuestTokenDisplay.tsx:689`, `:702`, `emails/ticket-order.tsx:231`. **Nessuno dei tre e' nei file di questo piano.** Rosso prima che questo piano cominciasse; non toccato, come impone il confine di ambito |

---

## 9. Il task 3 resta aperto, e non e' stato simulato

Il task 3 e' un `checkpoint:human-verify` **bloccante**, ed e' aperto **due
volte**: perche' e' un checkpoint, e perche' i due task che dovrebbe verificare
non esistono.

I cinque passi restano quelli scritti nel piano
(`49-09-PLAN.md`, task 3, `how-to-verify`) e vanno percorsi da chi configura le
serate, su una **serata di prova**, in ambiente di sviluppo:

1. serata segreta non rivelata, acquisto da ospite → **nessun indirizzo** in
   nessuna superficie;
2. rivelazione a mano → l'indirizzo arriva al primo acquirente;
3. **secondo acquisto adesso** → biglietti **e** indirizzo (il caso che questa
   fase esiste per chiudere);
4. cron rilanciato → **nessuna seconda mail** a nessuno dei due;
5. la guardia **per serata** e' identica a com'era al passo 2.

**A questi cinque va aggiunto un sesto**, che discende dal §3b e che il piano non
prevedeva:

6. sulla stessa serata, **una prenotazione e un biglietto di evento non ancora
   raggiunti**. Al passo 3, **nessuno dei due deve ricevere niente**: l'acquisto
   di una persona non spedisce l'indirizzo a un'altra.

---

## 10. Cosa non e' verificato, e perche'

**Tutto il comportamento.** Non esiste un test runner per il prodotto, e non
esiste codice da provare: nessuna riga e' stata scritta. Le affermazioni di
questo referto sono di **due** tipi soltanto, e la distinzione va tenuta:

- **misurate** — il vincolo su `provider_message_id` (catalogo vivo + migration),
  il vocabolario di `outcome`, il vocabolario di `venue_reveal_acts`, la firma
  `RETURNS SETOF uuid` di `reserve_ticket_order`, il bound `createdBefore` sul
  pannello e sul cron, i tre elementi rossi di `verify:touch-targets`, il verde
  di `build` e di `verify:venue-surfaces`;
- **lette dal codice e non eseguite** — i due conteggi di destinatari del §4 e
  l'allargamento del §3b. Sono deduzioni da query che si leggono, non
  osservazioni: reggono quanto la lettura, e vanno confermate al passo 3 e al
  passo 6 del checkpoint.

Nessuna di queste e' stata arrotondata, e nessuna prova comportamentale e' stata
inventata.

---

## Self-Check: PASSED

- `.planning/phases/49-comprare-senza-account/49-09-SUMMARY.md` — creato
- Nessun commit di codice dichiarato, perche' nessuno esiste
- `git status` pulito prima della scrittura di questo file
- `STATE.md` **non** toccato, deliberatamente
