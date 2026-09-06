---
phase: 49-comprare-senza-account
plan: 05
subsystem: comms-analytics
tags: [posta, registro-consegne, categoria, template, venue-secrecy, produzione, migration]

requires:
  - phase: 49-01
    provides: "ticket_orders, tickets.order_id e holder_label, e l'autorizzazione del 2026-09-06 (migration 5 di 5)"
  - phase: v1.6
    provides: "email_deliveries, sendEmail con category obbligatoria, e il cron di riconciliazione — la riparazione della posta era GIA' fatta"
provides:
  - "La categoria ticket_order_confirmation, chiusa da entrambi i lati: dodici voci nell'unione, dodici nel CHECK"
  - "src/emails/ticket-order.tsx: il template in italiano, con zero prop di luogo e un riquadro per biglietto"
  - "src/lib/tickets/order-confirmation.ts: sendOrderConfirmation — N QR, link password quando esiste, invio registrato, nessuna eccezione verso chi chiama"
  - "La guardia contro il secondo invio, letta dal registro invece che dai due chiamanti"
affects: [49-06, 49-07, 49-11]

tech-stack:
  added: []
  patterns:
    - "CHECK di vocabolario riscritto per intero (DROP IF EXISTS + ADD), mai per differenza"
    - "Nome dell'allegato e riferimento nel template coniati nello stesso punto e passati insieme, invece di ricalcolati per posizione in due file"
    - "Guardia di idempotenza dell'invio letta dal registro delle consegne, nel modulo che spedisce e non nei chiamanti"
    - "Criterio testuale sostituito dal suo equivalente su RIGHE VIVE, con lo stripper provato del repo e due controlli negativi"

key-files:
  created:
    - supabase/migrations/20260905140000_email_category_ticket_order.sql
    - src/emails/ticket-order.tsx
    - src/lib/tickets/order-confirmation.ts
  modified:
    - src/lib/email-delivery/categories.ts
    - .planning/phases/49-comprare-senza-account/49-AUTHORISATION.md
    - .planning/phases/49-comprare-senza-account/deferred-items.md

key-decisions:
  - "Categoria nuova e non riuso di ticket_confirmation: le due mail non portano lo stesso rischio, e contarle sotto un nome solo rende indistinguibile un fastidio da una persona respinta"
  - "ticket_id e' il PRIMO biglietto dell'ordine: e' l'unico modo di rendere l'invio osservabile con lo schema che esiste, e la conseguenza sugli altri N-1 e' dichiarata come debito"
  - "La guardia contro il secondo invio sta nel modulo, non nei chiamanti, perche' i chiamanti sono due"
  - "Se il registro e' illeggibile la mail parte comunque: fra un duplicato e un silenzio, su un messaggio che porta l'unica copia di un biglietto, vince il duplicato"
  - "qrCid passato dal modulo al template invece che derivato dalla posizione: uno sfasamento su sei biglietti non e' un'immagine rotta, e' il codice sbagliato sotto l'etichetta giusta"
  - "Nessuna colonna, nessun indice e nessuna policy nella migration: il perimetro autorizzato diceva una categoria"

requirements-completed: []

duration: ~55min
completed: 2026-09-06
---

# Fase 49 Piano 05: la mail dell'ordine, e l'ultima migration — Summary

**Chi compra senza account riceve i suoi N biglietti e la via di rientro in un
messaggio solo, che passa dal registro delle consegne con una categoria propria
invece di aprirsi una strada che nessuno guarda — e l'autorizzazione di
produzione del 2026-09-06 si e' chiusa qui, sei su sei, zero fallite.**

## Performance

- **Duration:** ~55 min
- **Tasks:** 2 / 2
- **Migration applicate in produzione:** 1 / 1 — la **quinta e ultima** delle
  cinque autorizzate
- **Righe scritte in produzione:** **0** (un `DROP CONSTRAINT IF EXISTS` e un
  `ADD CONSTRAINT` — nessun `INSERT`, `UPDATE`, `DELETE`, `GRANT` o `REVOKE`)

## La versione registrata, e la deriva alla quinta ripetizione

| Cosa | Valore |
|---|---|
| File | `supabase/migrations/20260905140000_email_category_ticket_order.sql` |
| Applicata (UTC) | **2026-09-06 15:03:04** |
| Endpoint | `POST /v1/projects/{ref}/database/migrations` — **mai** `/database/query` |
| HTTP | **200**, corpo `[]` |
| **Versione registrata** | **`20260906150304` / `email_category_ticket_order`** |

Il file dice `20260905140000`, la storia dice `20260906150304`. **Quinta
ripetizione identica** della deriva annunciata da 49-01: l'endpoint conia la
versione dall'**istante dell'applicazione**, non dal nome del file. Cinque
migration su cinque la mostrano, quindi non e' un incidente — e' una proprieta'
misurata dello strumento. Chi cerchera' domani questa migration in
`supabase_migrations.schema_migrations` **per il numero del file non la
trovera'**, e merita saperlo prima di concluderne che manca.

Letta da `supabase_migrations.schema_migrations`, **non** dalla risposta del
`POST`, che era `[]`: una misura presa con lo strumento che ha causato l'effetto
e' un'eco.

## Cosa ha detto il catalogo alla rilettura

Ogni riga viene da `pg_constraint`, **dopo** l'applicazione.

| Cosa | Letto da | Risposta |
|---|---|---|
| Il vincolo esiste, uno solo | `pg_constraint` (`conname`) | **1** riga, `email_deliveries_category_check` |
| E' **validato** | `pg_constraint.convalidated` | **`true`** — non `NOT VALID` |
| La categoria nuova c'e' | `pg_get_constraintdef` | `'ticket_order_confirmation'::text` presente in coda all'`ARRAY` |
| Quante voci porta | elenco estratto dal `def` installato | **12** |
| Le undici di prima ci sono ancora | `pg_get_constraintdef` | tutte, nell'ordine originale — nessuna tolta |

**Il `def` letto dopo, per intero:**

```
CHECK ((category = ANY (ARRAY['ticket_confirmation'::text, 'guest_invitation'::text,
 'rsvp_confirmation'::text, 'member_approved'::text, 'member_reactivated'::text,
 'member_rejected'::text, 'account_invitation'::text, 'refund_approved'::text,
 'refund_rejected'::text, 'venue_reveal'::text, 'event_reminder'::text,
 'ticket_order_confirmation'::text])))
```

**Prima**, letto dallo stesso posto e prima di applicare: lo stesso elenco **senza
l'ultima voce**, undici.

### La prova che l'elenco accetta e rifiuta le cose giuste

Fatta **sull'elenco estratto dal vincolo installato** — non su un array scritto da
me, che sarebbe stata una tautologia — con `regexp_matches` su
`pg_get_constraintdef`, e con due **controlli negativi**:

| Candidato | Atteso | Accettato dal vincolo |
|---|---|---|
| `ticket_order_confirmation` | accettato | **`true`** |
| `ticket_confirmation` | accettato | **`true`** |
| `ticket_order_confirmatio` *(refuso)* | rifiutato | **`false`** |
| `ticket_order` *(troncato)* | rifiutato | **`false`** |

I due controlli negativi sono cio' che rende leggibile il verde: senza, un `true`
su tutto sarebbe stato indistinguibile da un predicato che accetta qualunque
cosa.

**Cosa questa prova NON e'.** E' una prova sul **predicato installato**, non un
`INSERT` che riesce e un `INSERT` che fallisce. La prova comportamentale
richiederebbe di scrivere righe in produzione — **fuori dall'autorizzazione**,
che nomina esplicitamente «righe seminate» fra le scritture escluse. Vedi la
procedura `P-MAIL-1` in fondo, dichiarata **non eseguita**.

## Il ri-conteggio contro 2241

L'istantanea del **2026-09-06 14:00:55 UTC** non e' stata ripresa, come
prescritto. Il conteggio e' stato ri-derivato con `query_to_xml` su ogni tabella
base di `public`, e riportato nelle **tre** forme gia' pubblicate dalla fase.

| Insieme | Tabelle | **Prima** | **Dopo** |
|---|---|---|---|
| Le 15 tabelle non vuote dell'istantanea | 15 | **2241** | **2241** |
| Quelle piu' `artists` e `venues` (chiusura di 49-02) | 17 | **2253** | **2253** |
| **Ogni** tabella di `public` (superinsieme di controllo) | 41 | **2327** | **2327** |
| Tabelle non vuote | — | 19 | 19 |
| `public.email_deliveries` | — | **0** | **0** |

**Nessuna delle tre misure si e' mossa di una riga**, ed era atteso: la migration
non contiene una sola istruzione di scrittura di dati. **Le tre riproducono
esattamente i numeri pubblicati da 49-01, 49-02 e 49-03** — quindi il riferimento
regge e non e' stato ricalibrato per farlo tornare.

**Perche' l'`ADD CONSTRAINT` non poteva fallire sui dati, misurato prima invece
che sperato.** Due ragioni indipendenti, e valgono entrambe: `email_deliveries`
ha **zero righe** (letto prima di applicare), e l'elenco nuovo e' un
**superinsieme** del vecchio — nessuna voce tolta — quindi nessuna riga scritta
sotto il vincolo precedente potrebbe violare quello nuovo.

## L'autorizzazione e' ESAURITA

`49-AUTHORISATION.md` porta ora la riga 5 compilata e la data di esaurimento:
**2026-09-06 15:03:04 UTC**. Sei migration su sei — le cinque del perimetro
originale piu' l'estensione del 2026-09-06 — **zero fallite**, quindi la
condizione 4 *«se una fallisce, ci si ferma»* non e' mai stata esercitata da
nessuno dei quattro piani che l'hanno spesa.

> **Da qui in poi quel documento non autorizza piu' niente.** E' scritto dentro
> di lui, perche' un piano successivo che vi trovasse cinque righe «applicata»
> potrebbe leggere una ricevuta come un permesso. Ogni scrittura in produzione —
> un'altra migration, una riga seminata, una sessione coniata — ha bisogno di un
> **atto nuovo, con la sua data**.

## Le categorie: dove sono, e i due conteggi che devono coincidere

| Lato | Dove | Voci |
|---|---|---|
| TypeScript | `EMAIL_CATEGORIES` in `src/lib/email-delivery/categories.ts` | **12** |
| Database | `email_deliveries_category_check` | **12** |

**Contati su entrambi i lati e non dedotti**, ed e' il criterio d'accettazione
del task 1. Il numero e' stato verificato una terza volta **dal compilatore**: la
prova per mutazione (sotto) ha fatto stampare a `tsc` l'unione per intero, e sono
le stesse dodici parole del `CHECK`, nello stesso ordine.

**Dove la categoria nuova e' imposta:**

1. **Nel database** — `email_deliveries_category_check`, `convalidated = true`. E'
   il confine che vale per i percorsi che il compilatore non vede.
2. **Nel tipo** — `EmailCategory` e' derivata dall'unione, e `sendEmail` pretende
   `category` come parametro **obbligatorio**: nessun call site puo' spedire
   senza dichiarare cosa spedisce.
3. **In `AT_THE_DOOR_CATEGORIES`** — la lista di cio' che costa **alla porta**.
   ⚠️ **Questa lista non ha lettori** (misurato: zero importatori fuori dal file
   che la dichiara). Aggiungerci una voce **non accende niente**, e ora il
   docblock della lista lo dice invece di lasciarlo credere.
   Debito `D-49-05-DEF-07`.

## Il template: cosa non ha

`src/emails/ticket-order.tsx` **non ha nessuna prop di luogo, e nessun campo in
cui un valore del genere possa entrare.** La guardia sta nella forma delle props
invece che in una regola da ricordare — `D-49-04`, l'indirizzo raggiunge solo chi
ha comprato, per la strada del countdown, e questa mail non e' quella strada.

E' scritto nel docblock **perche' nessun controllo automatico lo sorveglia**: la
mail dell'ordine non e' fra le superfici che `scripts/verify-venue-surfaces.mjs`
conosce, e una superficie nuova che il gate non conosce e' peggio di nessun gate.

Il resto: testo **in italiano** (`comms-analytics.md`, gate *template in
italiano*); **«Completa il tuo account»**, mai «diventa membro» — il pagamento ha
gia' ammesso, la password non ammette nessuno (principio 8, i due assi); un
riquadro per biglietto con la sua etichetta `«n di N»`, perche' al portatore
(`D-49-03`) chi compra deve poterli **distinguere per inoltrarli** e sei riquadri
identici non si distinguono; il blocco del completamento **scompare** se il link
non c'e', invece di mandare qualcuno davanti a una password che non ha mai
scelto.

## Il modulo: le quattro proprieta', e cosa succede quando qualcosa va storto

`sendOrderConfirmation({ orderId, serviceClient })`, `import "server-only"`.

**Otto cause d'uscita distinte, una riga di log per ciascuna** —
`comms-analytics.md`, gate *errori distinguibili*, e il precedente da non
ripetere e' il form newsletter che dice *"Qualcosa e' andato storto"* per
qualunque causa:

| Causa | Quando | Cosa succede all'incasso |
|---|---|---|
| `app_url_missing` | `NEXT_PUBLIC_APP_URL` assente | resta valido, niente mail |
| `order_unreadable` | l'ordine o i suoi biglietti non si leggono | resta valido |
| `order_without_buyer` | `buyer_email` vuoto | resta valido |
| `order_without_tickets` | zero biglietti per quell'ordine | resta valido — **e' un pagamento senza biglietti, non si nasconde dietro una conferma** |
| `already_sent` | riga di registro gia' presente | resta valido, niente secondo invio |
| `event_unreadable` | serata o tier non leggibili | resta valido |
| `qr_failed` | i codici non si disegnano | resta valido |
| `send_failed` | il fornitore rifiuta | resta valido |

**Non solleva mai verso chi chiama** — `ticketing-payments.md`, gate *soldi vs
contenuto*. `sendEmail` **solleva** quando il fornitore restituisce un errore, e
quel percorso si ferma nel `catch` finale invece di risalire fino a chi ha
incassato.

**Tre gradazioni, non due, e la distinzione e' voluta:**

- **Si ferma** su cio' che rende la mail impossibile o sbagliata (le otto sopra).
- **Prosegue e logga** su cio' che la impoverisce senza invalidarla: il link della
  password che non si costruisce (`[tickets.password_link_failed]`, la mail parte
  **senza il blocco**, con i biglietti che sono la cosa per cui si e' pagato), il
  titolo della serata illeggibile, e il **registro illeggibile** — perche' un
  registro che non risponde non deve impedire a qualcuno di ricevere il proprio
  biglietto.
- **Torna un esito che chi chiama puo' registrare**: `sent`, `recorded`,
  `ticketCount`, `completeAccountOffered`. `recorded: false` significa che l'esito
  di quell'invio **non sara' mai verificato**, ed e' uno stato distinto sia da
  consegnata sia da non consegnata.

**La guardia contro il secondo invio sta qui, non nei chiamanti.**
`comms-analytics.md`: una mail non si richiama, e ogni percorso d'invio va reso
idempotente. I chiamanti saranno **due** — il webhook (49-07) e la pagina di
conferma (49-06) — e due guardie scritte in due posti sono una guardia
dimenticata in uno dei due. Legge il registro sul primo biglietto dell'ordine; se
la lettura fallisce **la mail riparte**, perche' fra un duplicato e un silenzio,
su un messaggio che porta l'unica copia di un biglietto, la direzione giusta e'
il duplicato.

## Verifica — evidenza, non aggettivi

> **Non esiste un test runner per il prodotto.** `package.json` non ha script
> `test`, non esiste alcun `*.test.*` o `*.spec.*`. **Nulla qui e' verificato
> perche' «i test passano».** La verifica automatica e' `npm run build` (che e'
> anche il typecheck di Next); il resto e' lettura del catalogo e procedura
> scritta.

| Controllo | Comando / fonte | Esito |
|---|---|---|
| Build + typecheck | `npm run build` | **exit 0**, `✓ Compiled successfully` — due volte, dopo il task 1 e dopo il task 2 |
| I due file nuovi sono **davvero** compilati | `npx tsc --noEmit --listFiles` | **entrambi presenti** nel programma, `tsc` **exit 0** |
| Categoria in `categories.ts` | `grep -c` | **3** (≥ 2 richiesto: unione + lista alla porta + docblock) |
| Categoria nella migration | `grep -c` | **2** (> 0 richiesto) |
| Voci nel `CHECK` = voci nell'unione | conteggio su entrambi | **12 = 12** |
| Il vincolo riletto contiene la categoria | `pg_get_constraintdef` | **si'** |
| `profiles(` incorporato nel modulo | `grep -c` | **0** |
| Colonne di luogo nel modulo | `grep -c 'venue_text\|venue_secret\|google_maps_url'` | **0** |
| Categoria nel modulo | `grep -c` | **1** |
| `NEXT_PUBLIC_APP_URL!` | `grep -cE` | **0** |
| `throw` nel modulo | `grep -c` | **0** |
| «Completa il tuo account» nel template | `grep -c` | **3** (> 0 richiesto) |

### La prova che il verde del typecheck significa qualcosa

`ai-engineering.md`, gate *prova per mutazione*: un verde su un file che il
compilatore non guarda e' un verde su niente. La mutazione e' stata **asserita
applicata prima di leggerne l'esito**.

1. `const CATEGORY` sostituita con `"ticket_order_confirmationX"` —
   **asserzione: la sostituzione e' presente** (`grep -c` → **1**). ✓
2. `npx tsc --noEmit` → **FALLISCE**, `TS1360` e `TS2820` su
   `order-confirmation.ts`, e l'errore **stampa l'unione per intero**: le stesse
   dodici parole del `CHECK`, nello stesso ordine.
3. Ripristinato — **asserzione: la mutazione non c'e' piu'** (`grep -c` → **0**),
   file **byte-identico** al pre-mutazione (`diff -q`), `tsc` → **exit 0**.

Il che dimostra tre cose in un colpo: che il file e' compilato davvero, che il
compilatore **difende** la categoria, e che il vocabolario TypeScript coincide
voce per voce con quello del database.

### Due criteri d'accettazione falliscono ALLA LETTERA, e uno era riparabile

Stessa forma dei tre conflitti gia' registrati da 49-02, e risolti con la stessa
regola (`meta-gates.md`: fra due requisiti contraddittori vince il piu'
restrittivo, e il conflitto si documenta).

| Criterio | Alla lettera | Perche' | Cosa e' stato fatto |
|---|---|---|---|
| `grep -c "profiles(" order-confirmation.ts` → 0 | era **1** | l'unica occorrenza era il docblock che **vieta** l'incorporamento | **RIPARATO**: il docblock e' stato riscritto senza la forma letterale. Ora **0**, e il gate resta usabile per il futuro |
| `grep -ciE "venue\|indirizzo\|address\|maps" ticket-order.tsx` → 0 | e' **3** | due sono i **nomi di file** `venue-secrecy.md` e `verify-venue-surfaces.mjs`, citati dal docblock che dichiara la guardia; il terzo era la parola «indirizzo» usata per dire *link* | **PARZIALE**: la terza e' stata riscritta (era una vera ambiguita' — in un file la cui unica proprieta' critica e' di non portare un luogo, una parola ambigua e' un invito a riempirla). Le due citazioni **restano** |
| `grep -ci "diventa membro" ticket-order.tsx` → 0 | e' **1** | l'unica occorrenza e' il commento che **vieta** quella frase | conflitto documentato, criterio equivalente sotto |

**Perche' le due citazioni restano.** Un rovesciamento deve nominare la regola che
lo governa, o la riga successiva diventa folklore e qualcuno la «ripara». E' la
regola di casa che 49-02 ha gia' applicato tre volte. **Ma il costo e' reale**, ed
e' quello che ha fatto riparare il primo caso: un criterio che diventa rosso su un
commento e' un criterio che qualcuno spegnera'. Dove il testo si poteva
riscrivere senza perdere la ragione, e' stato riscritto.

**I criteri equivalenti, misurati con lo stripper provato del repo**
(`scripts/lib/comments.mjs`, il cui `verify-comment-stripper.mjs` prova per
mutazione che non e' cieco), su `src/emails/ticket-order.tsx`:

| Criterio equivalente | Esito |
|---|---|
| Parole di luogo su **righe vive** (non commento) | **0** |
| `diventa membro` su **righe vive** | **0** |
| `Completa il tuo account` su **righe vive** | **2** — l'intestazione del blocco e il bottone |

E **con i suoi due controlli negativi**, senza cui il verde non si distingue da
una sonda che non guarda niente:

- **A** — la sonda **vede** il codice vivo (`Biglietto {ticket.label}`): `true`.
- **B** — la sonda **nasconde** proprio la riga che il grep nudo vedeva
  (`venue-secrecy.md` presente nel file grezzo, assente fra le righe vive):
  `true`.

## Cosa NON e' stato verificato, e va detto

**Nessuna mail e' stata spedita.** Ne' in produzione ne' in locale, e le ragioni
sono due, entrambe misurate:

1. Spedire davvero richiederebbe un ordine e dei biglietti — **righe in
   produzione**, esplicitamente fuori dall'autorizzazione, che oltretutto e'
   adesso esaurita.
2. **`RESEND_FROM_EMAIL` e' assente da `.env.local`** (verificato: la variabile
   non compare fra le dodici del file). In locale `sendEmail` ripiegherebbe su
   `onboarding@resend.dev`, cioe' spedirebbe da un mittente che **non e' questo
   prodotto** — e `comms-analytics.md`, gate *due mittenti, due funzioni*, dice
   che i mittenti non si scambiano. Una prova fatta cosi' proverebbe un percorso
   diverso da quello che andra' in produzione.

**Cosa resta quindi non provato, elencato invece che arrotondato:**

- **Che le immagini in linea si aggancino ai riquadri giusti.** Il legame fra il
  nome dell'allegato (`ticket-qr-3.png`) e il riferimento nel template
  (`cid:ticket-qr-3`) e' **una proprieta' del fornitore**, ereditata dall'invio
  che esiste gia' — dove pero' l'allegato e' **uno solo**, quindi uno sfasamento
  sarebbe invisibile. Con sei allegati non lo e'. **Non provato, e va provato.**
- **Che il `CHECK` accetti davvero un `INSERT`** con la categoria nuova.
  Strutturalmente si', comportamentalmente non eseguito.
- **Che il link della password funzioni** partendo da questa mail.
- **Che `/tickets/{id}` si apra per chi non ha una sessione.** ⚠️ **Oggi non si
  apre**: `src/app/(public)/tickets/[id]/page.tsx:114-117` fa `auth.getUser()` e
  rimbalza a `/login`. La mail porta comunque il QR come allegato, quindi il
  biglietto esiste anche cosi' — **ma se il destinatario ha le immagini bloccate,
  cosa comune, i link sono l'unica strada e oggi finiscono contro un muro.** E'
  il buco che `49-CONTEXT.md` dichiara e che **il piano 49-06 chiude**. Detto qui
  perche' fra i due piani c'e' una finestra in cui questa mail e' incompleta, e
  nessuno deve scoprirlo dopo.

### Le procedure manuali, scritte perche' sono l'unica prova che esistera'

> **P-MAIL-1 — la categoria e' scrivibile.** Su un ambiente dove si possono
> creare righe: `insert into public.email_deliveries (provider_message_id,
> category) values ('probe-1', 'ticket_order_confirmation')`. **Attendere:**
> riuscita. Poi la stessa con `'ticket_order_confirmatio'`. **Attendere:**
> `23514 check_violation` su `email_deliveries_category_check`. Il secondo passo
> e' quello che conta: senza, il primo non distingue un vincolo che accetta la
> categoria da un vincolo che accetta qualunque cosa.
>
> **P-MAIL-2 — sei QR, sei riquadri, nessuno scambiato.** Su un ordine da almeno
> **tre** biglietti, chiamare `sendOrderConfirmation` e aprire la mail ricevuta.
> **Attendere:** tante immagini quante le etichette, e **il codice sotto
> «Biglietto 2 di 3» deve scansionare il biglietto la cui `holder_label` e' `2 di
> 3`** — si verifica leggendo il token con `verifyTicketToken` e confrontando
> l'uuid. Due immagini identiche, o un codice che risolve al biglietto sbagliato,
> sono il fallimento — e sarebbero **due persone respinte alla porta invece di
> una**.
>
> **P-MAIL-3 — con le immagini bloccate resta qualcosa.** Aprire la stessa mail
> con il caricamento immagini disattivato. **Attendere:** le etichette, i link
> per biglietto e il blocco del completamento restano leggibili. *(Finche' 49-06
> non e' fatto, i link rimbalzano a `/login`: e' atteso, ed e' la ragione per cui
> questa procedura si rifa' dopo 49-06.)*
>
> **P-MAIL-4 — la riga di registro nasce.** Dopo P-MAIL-2:
> `select category, outcome, ticket_id, user_id from public.email_deliveries
> where ticket_id = <primo biglietto dell'ordine>`. **Attendere:** una riga,
> categoria `ticket_order_confirmation`, `outcome = 'unverified'`. Zero righe
> significa che l'invio e' partito **fuori dal registro**, cioe' il buco vecchio
> riaperto — ed e' esattamente cio' che questo piano esisteva per evitare.
>
> **P-MAIL-5 — il secondo invio non parte.** Chiamare `sendOrderConfirmation`
> una **seconda volta** con lo stesso `orderId`. **Attendere:**
> `{ sent: false, reason: "already_sent" }` e **nessuna seconda mail**.
>
> **P-MAIL-6 — senza link la mail parte lo stesso.** Simulare il fallimento di
> `buildPasswordSetLink`. **Attendere:** la mail arriva **con i biglietti e senza
> il blocco «Completa il tuo account»**, e nei log una riga
> `[tickets.password_link_failed]` con la sua causa. Una mail che non parte e' il
> fallimento.

## Cio' che il piano non aveva previsto

### 1. Il registro attribuisce l'invio a UN biglietto, e la mail ne porta N

`email_deliveries` ha `ticket_id`, non `order_id`. La riga viene quindi attaccata
al **primo** biglietto dell'ordine, e gli altri N-1 risulteranno **«nessun invio
registrato»** sulla superficie dei venduti — che e' **vero** (l'invio e' uno, non
sei) ma si legge come *nessuno ha guardato*. **La direzione dell'errore e' quella
sbagliata**: fa sembrare rotto cio' che funziona.

Le tre riparazioni possibili e la ragione per cui nessuna appartiene a questo
piano — una richiederebbe una migration, e l'autorizzazione e' esaurita — sono in
`deferred-items.md`, **`D-49-05-DEF-06`**.

### 2. `AT_THE_DOOR_CATEGORIES` non ha nessun lettore

Misurato con un grep su `src/` e `scripts/` **prima** di aggiungerci una voce:
**zero importatori**. Il piano chiedeva di aggiungere la terza categoria «con la
sua ragione accanto», e la ragione e' giusta — ma la lista **non alimenta
niente**. Aggiungerci una voce non accende nessun avviso da nessuna parte.
Dichiarato nel docblock della lista e in **`D-49-05-DEF-07`**, perche'
`meta-gates.md` dice che una lista che sembra un gate e non lo e' e' peggio di
una lista assente.

### 3. Il docblock delle categorie contava nove voci mentre l'elenco ne aveva undici

`categories.ts` diceva *«I nove messaggi che questo prodotto sa spedire»*.
`20260822180000_email_ledger_night_paths.sql` ne aveva aggiunte due il 2026-08-22
**senza rileggere la riga che le contava**. Corretto contandole, non
ricordandole — e la correzione e' scritta come rovesciamento invece che come
sostituzione, perche' il numero in prosa accanto a un elenco diverge alla prima
aggiunta e il numero che decide e' `EMAIL_CATEGORIES.length`.

### 4. Un altro piano stava scrivendo nello stesso albero di lavoro

Durante l'esecuzione, `git status` ha mostrato `src/lib/tickets/order-quote.ts`
modificato e `guest-purchase-actions.ts` non tracciato — i file del **piano
49-04**, che gira in parallelo nella stessa copia di lavoro, e che nel frattempo
ha portato `HEAD` a `77cc5d0`.

**Due conseguenze, dichiarate invece che taciute:**

1. **Nessun file di 49-04 e' entrato nei commit di 49-05.** Ogni `git add` di
   questo piano nomina i file uno per uno, mai `git add .` — verificato leggendo
   `git status --short` prima di ogni `commit`.
2. **I `npm run build` di questo piano sono girati su un albero che conteneva
   anche il lavoro in volo di 49-04.** Il verde e' quindi un verde
   sull'**insieme**, non solo sui file di questo piano. La claim che regge
   comunque e' quella piu' stretta: `tsc --noEmit --listFiles` mostra i due file
   nuovi **nel programma**, e la prova per mutazione mostra il compilatore che
   reagisce **a `order-confirmation.ts` in particolare**.

#### E una terza, che e' successa davvero: 59 righe di 49-05 sono finite in un commit di 49-04

**Due alberi di lavoro non esistono: esiste un albero solo, quindi un `index`
solo.** Le due voci `D-49-05-DEF-06` e `D-49-05-DEF-07` erano state messe in
`index` da questo piano e non ancora committate; il `git commit` successivo —
lanciato dall'agente di 49-04, che non poteva sapere di avere in `index` roba di
qualcun altro — **le ha portate via con se'**. Sono in `3cb5013`,
`docs(49-04): il numero dei rifiuti era sbagliato in due commenti`, insieme a
`order-quote.ts`.

**Cosa e' andato perso: niente.** Le due voci sono in `HEAD`, integre, verificate
con `git show HEAD:…deferred-items.md | grep -c` → **2**. **Cosa e' sbagliato:
l'attribuzione.** Chi leggera' `git log -- deferred-items.md` credera' che quei
due debiti li abbia trovati il piano 49-04. Non e' cosi': li ha trovati 49-05,
scrivendo il modulo d'invio.

**Non si ripara riscrivendo la storia**, e la ragione e' la stessa di ogni altra
guardia di questa fase: un `rebase` o un `commit --amend` su un commit che un
altro agente sta usando come base distrugge il suo lavoro per sistemare
un'etichetta. **Si ripara dicendolo**, ed e' quello che fa questo paragrafo.

**La regola che ne esce, per chi eseguira' piani in parallelo nello stesso
albero:** `git add` e `git commit` sono **un solo gesto**, non due. Ogni intervallo
fra i due e' una finestra in cui il commit di qualcun altro si porta via i tuoi
file — e la finestra non si vede, perche' `git status` di quell'altro mostra i
tuoi file esattamente come mostrerebbe i suoi.

## Deviazioni dal piano

### 1. [Rule 2 — funzionalita' critica mancante] La guardia contro il secondo invio

- **Trovato durante:** task 2, leggendo `comms-analytics.md` prima di scrivere.
- **Il buco:** il piano descrive un modulo che compone e spedisce, senza guardia
  di idempotenza. Il gate *una mail non si richiama* chiede che **ogni percorso
  che invia** sia idempotente. La guardia esiste nei chiamanti — 49-07 esce
  presto se l'ordine e' gia' `completed` — ma i chiamanti saranno **due**, e una
  guardia scritta due volte e' una guardia dimenticata una volta.
- **Fix:** una lettura del registro sul primo biglietto dell'ordine, dentro il
  modulo, con l'uscita `already_sent`. Se la lettura fallisce la mail **riparte**,
  e la direzione e' scelta: un duplicato e' rumore, un silenzio e' una persona
  alla porta.
- **Commit:** `ee115a8`.

### 2. [Rule 3 — bloccante] `qrCid` aggiunto alle props dei biglietti

- **Trovato durante:** task 2. Il piano fissa
  `tickets: { label: string; url: string }[]`, ma **N QR richiedono N
  identificativi distinti** per le immagini in linea, e il template deve
  riferirsi a ciascuno.
- **Le due strade:** derivarlo dalla posizione in entrambi i file (nessuna prop
  in piu', e due conteggi indipendenti che devono coincidere), oppure coniarlo
  una volta e passarlo.
- **Scelto:** passarlo. Uno sfasamento fra i due conteggi, con sei biglietti, non
  e' un'immagine rotta: e' **il codice sbagliato sotto l'etichetta giusta**, cioe'
  due persone respinte alla porta invece di una. La ragione e' scritta accanto
  alla prop.
- **Commit:** `ee115a8`.

### 3. [Rule 2 — osservabilita'] `ticketId` passato a `sendEmail`

- Il piano elenca `to, subject, html, category, userId, attachments` e **non**
  `ticketId`. Senza, la riga di registro non si attacca a nessuna riga visibile e
  il fallimento **non ha effetto osservabile** — `meta-gates.md`: in questo
  progetto un log non basta, perche' nessun errore raggiunge un essere umano da
  solo.
- Passato il **primo** biglietto dell'ordine, con la conseguenza sugli altri N-1
  scritta nel codice e registrata come `D-49-05-DEF-06`.
- **Commit:** `ee115a8`.

### 4. [Rule 1 — bug di documentazione] Il conteggio nel docblock delle categorie

Vedi *«Cio' che il piano non aveva previsto»*, punto 3. **Commit:** `0cbb855`.

### 5. Task 1 in un commit solo con l'aggiornamento del registro d'autorizzazione

Il piano descrive due modifiche in un commit; il registro d'uso va compilato
**mentre** si spende, non dopo, e l'applicazione avviene dentro il task 1.
Separarlo avrebbe prodotto un commit che descrive un'autorizzazione spesa e non
registrata — lo stato che la condizione 5 esiste per impedire.

## Registro STRIDE — cosa ne e' stato

| ID | Disposizione | Esito |
|---|---|---|
| `T-49-18` — un luogo dentro la mail dell'ordine | mitigate | **mitigato**: zero prop di luogo nel template, zero colonne del genere nelle `select` del modulo. Verificato da `grep` sul modulo (**0**) e dall'equivalente su righe vive nel template (**0**), con due controlli negativi |
| `T-49-19` — consegna soppressa in silenzio | mitigate | **mitigato**: categoria propria nel registro, applicata da entrambi i lati, piu' la riconciliazione che gia' esisteva. Resta che la superficie attribuisce a un biglietto solo — `D-49-05-DEF-06` |
| `T-49-20` — link della password non costruito | mitigate | **mitigato**: la mail parte comunque, senza il blocco, con `[tickets.password_link_failed]`. La seconda via di rientro e' il piano 49-06 |
| `T-49-21` — un fallimento d'invio che aborta il pagamento | mitigate | **mitigato**: zero occorrenze di sollevamento verso chi chiama, otto cause d'uscita distinte, e il `catch` finale che ferma anche cio' che `sendEmail` solleva |

**Superficie di minaccia nuova, dichiarata.** Questo piano **aggiunge un percorso
di posta**, e un percorso di posta e' un dato che lascia il perimetro e non si
richiama. Le due difese sono la forma delle props (nessun campo di luogo) e la
categoria nel registro (nessun invio invisibile). **Nessun endpoint nuovo,
nessuna policy, nessuna colonna, nessun cammino d'autenticazione.**

## Il debito che resta

- **`D-49-05-DEF-06`** — la superficie dei venduti legge un biglietto, la mail ne
  porta N.
- **`D-49-05-DEF-07`** — `AT_THE_DOOR_CATEGORIES` non ha lettori.
- **Le sei procedure `P-MAIL-1..6`**, non eseguite.
- **`/tickets/{id}` rimbalza un ospite a `/login`** — chiuso dal piano 49-06, e
  fino ad allora i link di questa mail non arrivano da nessuna parte per chi non
  ha una sessione.
- **Gli altri dodici template di `src/emails/` sono in inglese**, mentre
  `comms-analytics.md` chiede l'italiano per i materiali verso chi compra. Non
  riparato qui: sarebbe la riscrittura di dodici file dentro un piano che ne
  aggiunge uno. Nominato perche' il template nuovo, essendo l'unico in italiano,
  **sembra l'eccezione mentre e' la regola**.

## Self-Check

File — verificati esistenti sul disco:

- `supabase/migrations/20260905140000_email_category_ticket_order.sql` — FOUND
- `src/emails/ticket-order.tsx` — FOUND
- `src/lib/tickets/order-confirmation.ts` — FOUND
- `.planning/phases/49-comprare-senza-account/49-05-SUMMARY.md` — FOUND

Commit — verificati in `git log`:

- `0cbb855` — `feat(49-05): la mail dell'ordine ha una categoria, da entrambi i lati` — FOUND
- `ee115a8` — `feat(49-05): una mail sola porta i biglietti dell'ordine e la via di rientro` — FOUND

Produzione — letta dal catalogo, non dalla risposta del `POST`:
versione `20260906150304` in `supabase_migrations.schema_migrations` FOUND ·
`email_deliveries_category_check` con **12** voci FOUND ·
`convalidated = true` FOUND ·
`ticket_order_confirmation` nel `def` FOUND ·
righe 2241 / 2253 / 2327 identiche prima e dopo FOUND ·
`email_deliveries` a **0** righe prima e dopo FOUND.

## Self-Check: PASSED
