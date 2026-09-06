---
phase: 49-comprare-senza-account
plan: 03
document: misura del perimetro + decisione datata
measured: 2026-09-06
source: catalogo di produzione (`pg_proc`, `pg_policies`, `pg_class`,
  `information_schema.columns`, `storage.buckets`) e codice a `main` `5f1e260`
decision: stringi — proprietario, 2026-09-05
---

# Fase 49 — cosa si allarga quando ogni acquirente diventa un'identita' vera

> **Questo file e' pubblicato.** `.planning/` e' tracciato su un repository
> pubblico. Qui si nominano **policy, colonne, funzioni e rami**; mai un
> indirizzo, mai il nome di una sede, mai una data non annunciata, mai una
> persona. Le misure per soggetto sono riportate **per ruolo e come conteggio**,
> non per identificatore.

**Perche' questa misura esiste, e perche' adesso.** Il webhook del pagamento
porta a `status = 'approved'` chi compra (`src/app/api/webhooks/sumup/route.ts`,
il ramo che alza lo stato). Oggi in produzione i profili sono **quattro**. Dalla
fase 49 diventano **quanti sono stati i clienti**. Ogni superficie che concede
qualcosa al solo fatto di essere `authenticated` o `approved` cambia scala senza
che nessuna riga di codice cambi — quindi si guarda **prima**, mentre riguarda
quattro persone, non dopo.

**Le quattro misure sono prese dal catalogo di produzione**, non dai file di
migration e non da documenti a monte. Dove il file e il catalogo potevano
divergere, e' stato letto il catalogo.

---

## Misura 1 — `public.venue_for_parties`, letta dal catalogo

**Fonte:** `catalogo: pg_proc.pg_get_functiondef(public.venue_for_parties(uuid[]))`,
riletta il 2026-09-06. Confrontata con
`supabase/migrations/20260810161000_venues_read_narrowed.sql:371-577`: **il corpo
installato e' identico al file**, commenti compresi. Nessuna deriva.

**Proprieta' della funzione**, `catalogo: pg_proc`:

| Proprieta' | Valore letto |
|---|---|
| `prosecdef` | `true` |
| `proconfig` | `{search_path=""}` |
| `proacl` | `{postgres=X, anon=X, authenticated=X, service_role=X}` |

`anon` e' sul grant **per decisione**, non per svista: e' l'unica strada pubblica
verso un indirizzo, e restringe internamente
(`20260810161000_venues_read_narrowed.sql:554-561`). **Non si tocca.**

### I cinque rami, e il loro stato

| Ramo | Chi apre | Sotto `is_published`? | Stato letto |
|---|---|---|---|
| **2** — `private.has_capability('staff.manage')` | ruolo `master` o `organizer` | **no**, sta sopra il pavimento | presente, intatto |
| **1** — `ep.venue_secret = false` | chiunque, anche senza sessione | si' | presente, intatto |
| **3** — biglietto per la serata **o** biglietto master per l'evento, **e** `coalesce(venue_reveal_on_purchase, true)` | il titolare di un biglietto | si' | presente, intatto |
| **4** — un RSVP per la serata, **non** sotto `venue_reveal_on_purchase` | il titolare di un RSVP | si' | presente, intatto |
| **5** — `profiles.status = 'approved'`, **senza alcun biglietto**, alla finestra o alla rivelazione manuale o a serata iniziata | ogni profilo approvato | si' | **presente** |

**L'arm 5 e' ancora presente in produzione: SI'.** Non «probabilmente»: letto da
`pg_get_functiondef`, righe 150-163 del corpo installato, ed e' l'unico ramo che
interroga `public.profiles`.

**`events.is_published` gate l'arm 5: SI'** — l'arm 5 sta dentro il ramo
`e.is_published AND (...)`, insieme agli arm 1, 3 e 4. Fuori dal pavimento c'e'
**solo** l'arm 2. Su un evento in bozza risponde soltanto lo staff.

**I tre termini temporali dell'arm 5**, letti e non ricordati:
`venue_revealed_at IS NOT NULL` · `now() >= party_start_instant(...) -
make_interval(hours => coalesce(venue_reveal_hours, 25))` · `now() >
party_start_instant(...)`. Il terzo **non e' assorbito dal secondo**: su un
`venue_reveal_hours` negativo — la colonna e' un `integer` nudo senza `CHECK` —
il secondo apre **dopo** la porta e il terzo apre **alla** porta.

### Quanto vale l'arm 5 oggi, misurato invece che immaginato

Predicato installato valutato **in sola lettura**, per soggetto, sostituendo il
soggetto ad `auth.uid()` e riportando **solo conteggi**.

`catalogo: public.event_parties` — tre serate, tutte su eventi pubblicati: **una
non segreta**, **due segrete**, e per tutte e tre la finestra e' aperta e la
serata e' gia' iniziata.

| Ruolo (conteggio) | Serate lette | di cui **segrete** | Grazie a quale ramo |
|---|---|---|---|
| `master` `approved` (1) | 3 su 3 | 2 | arm 2, e in aggiunta l'arm 5 |
| `organizer` `approved` (1) | 3 su 3 | 2 | arm 2, e in aggiunta l'arm 5 |
| `member` `approved` (2) | 3 su 3 | 2 | **arm 1 per la non segreta, arm 5 e solo l'arm 5 per le due segrete** |

`public.tickets` = **0 righe**, `public.rsvps` = **0 righe**: gli arm 3 e 4 non
possono aprire per nessuno. Quindi, oggi, **due profili `member` leggono
l'indirizzo di due serate segrete unicamente perche' il loro stato e'
`approved`** — che e' esattamente il ramo che questa fase moltiplica.

### Il ramo 3 e la sua configurazione, dichiarato per iscritto

Una delle due serate segrete ha `venue_reveal_on_purchase = false`; l'altra lo ha
a `true`. Con `D-49-04` — *l'indirizzo va SOLO a chi ha comprato, per posta* —
questo va saputo: **una serata segreta lasciata con quel flag a `true` consegna
l'indirizzo al titolare del biglietto appena ha una sessione**, senza attendere
la rivelazione. Non e' un buco aperto qui: e' la configurazione della serata, e
la pagina applica la stessa congiunzione
(`src/app/(public)/events/[slug]/page.tsx`, ramo del biglietto). E' scritto
perche' sia una scelta consapevole al momento di creare una serata, non una
scoperta.

> **Questa fase la allarga: SI', e molto.** L'arm 5 concede sul solo
> `status = 'approved'`, e il webhook del pagamento porta ogni acquirente a
> quello stato. La popolazione dell'arm 5 passa da **quattro** a **tutti i
> clienti, per sempre**. E' l'unica delle quattro misure che tocca un indirizzo,
> ed e' la ragione della decisione registrata sotto.

---

## Misura 2 — le letture che concedono sul solo ruolo `authenticated`

**Fonte:** `catalogo: pg_policies`, schema `public`, 2026-09-06.

**Le policy che nominano `authenticated` sono 32, non 31.** `D-49-02` ne aveva
contate **31** il 2026-09-05; la differenza e' `ticket_orders_select_own`,
**creata oggi dal piano 49-01**, con predicato `auth.uid() = user_id`. Restringe
per chiamante, quindi **non entra** nell'insieme che conta qui. Il numero e'
cambiato, la conclusione no — ed e' scritto perche' chi ricontera' domani non
concluda che la misura di `D-49-02` era sbagliata.

**Le letture cieche al chiamante restano esattamente due**, e sono le stesse
nominate da `D-49-02`. Criterio: `cmd = 'SELECT'`, ruolo `authenticated`, e un
`qual` che **non** nomina `auth.uid()`, `has_capability` ne' alcuna funzione
`private.` — cioe' ogni sessione riceve le stesse righe.

| Tabella | Policy | `qual` letto |
|---|---|---|
| `drink_items` | `drink_items_select` | `true` |
| `event_media` | `event_media_select_approved` | `status = 'approved'` |

**`public.venue_for_parties` non e' fra queste**, ed e' corretto: non e' una
policy, e' una funzione — ragione per cui la misura di `D-49-02`, giusta nel suo
perimetro, **non copriva l'arm 5**. La misura 1 esiste per quello.

### `drink_items` — cosa contiene una riga

Il listino del bar: nome, prezzo, disponibilita'. **Nessuna colonna di luogo.**
E' materiale che compare gia' su una pagina pubblica di menu.

### `event_media` — **una foto approvata puo' mostrare un luogo? SI'.**

La risposta e' `si'`, non `forse`, ed e' strutturale.

`catalogo: information_schema.columns` — `public.event_media` porta
`id, event_id, url, type, caption, order, created_at, uploaded_by, status,
file_size, party_id`. **`url` e' un'immagine e `caption` e' testo libero.**
Nessuna colonna e nessun predicato della policy guarda `event_parties.venue_secret`,
`venues.address` o lo stato della rivelazione: `event_media_select_approved`
legge **solo** `status = 'approved'`. Quindi niente, nello schema, impedisce che
una foto approvata inquadri un'insegna, una targa o una facciata riconoscibile —
ed e' precisamente il caso che `venue-secrecy.md` nomina fra i cammini che non
sono codice: *«e una foto che inquadra l'insegna»*.

**E c'e' un secondo fatto, che cambia dove sta davvero il confine.**
`catalogo: storage.buckets` — il bucket **`event-media` e' `public = true`**, e le
URL sono costruite su `/storage/v1/object/public/event-media/`
(`src/app/(public)/events/[slug]/actions.ts:320`). I byte dell'immagine sono
quindi gia' raggiungibili **da chiunque abbia l'URL, senza alcuna sessione**. La
policy governa **chi scopre la riga**, non chi vede la fotografia.

`public.event_media` ha **0 righe** in produzione (`catalogo: public.event_media`),
approvate comprese: oggi il rischio e' interamente potenziale.

> **Questa fase la allarga: SI', ma solo sulla scoperta, e non sull'immagine.**
> Chi puo' **elencare** le righe approvate passa da quattro a ogni acquirente;
> chi puo' **vedere** una foto di cui conosce l'URL era gia' chiunque, e questa
> fase non lo cambia. **Nessun piano della fase 49 ripara questa riga**, quindi
> entra fra i **debiti dichiarati** di `49-VERIFICATION.md` — vedi sotto.

**Debito da riportare in `49-VERIFICATION.md`, con la ragione per cui non si
ripara qui.** Ripararlo significherebbe una fra tre cose, e ognuna esce dal
perimetro della fase: sottoporre l'approvazione dei media a un predicato di
segretezza della serata (tocca `media-and-storage.md` e il flusso di moderazione);
rendere privato il bucket `event-media` e servire ogni immagine da URL firmate
(tocca ogni superficie che mostra una foto, comprese le pagine pubbliche);
oppure sospendere l'approvazione sulle serate segrete (una decisione di prodotto,
non una migration). La fase 49 apre l'acquisto senza account e non ha autorita'
su nessuna delle tre. **Un rischio misurato che non compare fra i debiti e' un
rischio che sparisce**, e sparisce peggio di uno mai misurato, perche' qualcuno
ha guardato e la traccia non c'e'.

---

## Misura 3 — `public.profiles`: cosa vede un `authenticated` qualunque

**Fonte:** `catalogo: pg_policies` su `public.profiles` e `pg_class.relrowsecurity`.

`relrowsecurity = true`. Le policy di lettura sono **due**, ed entrambe
restringono per chiamante:

| Policy | `cmd` | `qual` letto |
|---|---|---|
| `profiles_select_own` | `SELECT` | `auth.uid() = id` |
| `profiles_select_admin` | `SELECT` | `private.has_capability('staff.manage')` |

**Un `authenticated` qualunque vede di un altro profilo: NIENTE.** Non il nome,
non l'indirizzo di posta, e **non `membership_code`** — che e' la credenziale
della porta e ammette senza leggere ne' ruolo ne' stato
(`src/app/api/tickets/attendance/route.ts:145`). La colonna esiste
(`catalogo: information_schema.columns` su `public.profiles`) ma nessuna policy la
espone a un pari.

> **Questa fase la allarga: NO.** La popolazione di `authenticated` cresce, ma
> cio' che ciascuno legge resta la propria riga. La scala cambia; la superficie
> per soggetto no. **Cio' che questa fase moltiplica non e' la visibilita' di un
> `membership_code`: e' quanti ne esistono** — riparato in avanti dal piano 49-02
> con `extensions.gen_random_bytes`, e non riparato sui quattro gia' emessi, per
> decisione (`D-49-01`).

---

## Misura 4 — la `description` del checkout SumUp

**Fonte:** codice a `main` `5f1e260`.

`description` e' **testo libero** inoltrato a SumUp e mostrato all'acquirente
sulla pagina di pagamento. Il gate *un posto scritto nel titolo* di
`venue-secrecy.md` vale identico: **nessun predicato lo vede.**

| Cammino | Composizione letta | `file:riga` |
|---|---|---|
| biglietto, sessione | `` `${event.title} - ${tier.name}` `` | `src/app/(admin)/admin/events/actions.ts:1566` |
| drink, ospite (precedente da riusare) | `` `${party.title} - ${itemsList}` `` | `src/app/(public)/events/[slug]/menu/actions.ts:289` |
| **biglietto, ospite** (`49-04`) | titolo serata + nome del tier, composta **in un solo posto** | `49-04-PLAN.md:128`, registro `T-49-16` |

**Puo' contenere un luogo? Dallo schema: NO. Dalla penna di chi scrive un titolo:
SI'.** Nessuna colonna di venue viene selezionata da nessuno dei tre cammini —
niente `venues.name`, niente `venues.address`, niente `venues.slug`. Ma
`events.title`, `event_parties.title` e `ticket_tiers.name` sono campi liberi
compilati a mano, e un titolo che nomina un posto lo pubblica su una pagina di
pagamento che non controlliamo. E' lo stesso vincolo che `venue-secrecy.md`
enuncia sul pass Wallet: **un vincolo su come si da' un nome, non un difetto da
riparare in una migration.**

**Non verificato qui, e differito per iscritto:** la stringa su una pagina di
checkout reale, con Apple Pay, e' un passo della prova manuale di `49-11`. Nessun
tier e' in vendita e non esiste una pagina di checkout da guardare.

> **Questa fase la allarga: SI', di un cammino.** Il biglietto d'ospite e' un
> checkout nuovo, quindi una superficie nuova su cui la stessa regola va
> applicata. La forma della composizione e' pero' **piu' stretta** delle due
> esistenti: titolo + tier, e nessuna colonna di venue nella query del preventivo.

---

## La decisione sull'arm 5 — presa dal proprietario il **2026-09-05**

**Scelta: `stringi`.** L'indirizzo di una serata lo legge **chi ha un biglietto
per QUELLA serata**, non chi ha uno stato.

La domanda gli e' stata posta con queste parole, e sono trascritte qui perche'
una decisione senza la sua domanda, riletta fra sei mesi, si legge come una
preferenza:

> «Chi ha comprato un biglietto per una serata puo' leggere l'indirizzo di tutte
> le altre. Oggi non succede perche' gli approvati sono quattro; dalla fase 49 lo
> diventa ogni acquirente. Cosa facciamo?»

### Le due opzioni disponibili e non prese

Restano scritte con il loro costo: **una scelta di cui si e' persa l'alternativa
non e' piu' rileggibile come scelta.**

- **`lascia` — lasciare com'e', e scriverlo.** Non tocca un cammino Critical
  dentro una fase che ne ha gia' due, e la misura resterebbe comunque
  registrata. **Non presa perche'** la popolazione che puo' leggere un indirizzo
  senza esserci cresce quanto cresce la clientela, e cresce **in silenzio**: la
  prossima volta che qualcuno guardera' non saranno piu' quattro persone.
- **`non-approvare` — non portare a `approved` chi compra da ospite.** Tocca una
  riga sola del webhook e non tocca il venue. **Non presa perche'** contraddice
  il gate dei due assi come il proprietario lo ha fissato — *il pagamento decide
  l'ammissione* — e sposta la stessa domanda su un valore che le fasi 50 e 51
  stanno smontando: sarebbe una riparazione fatta con il pezzo che sta per essere
  buttato.

### La conseguenza accettata, scritta e non scoperta

**Si toglie qualcosa a chi oggi ce l'ha.** Chi ha uno stato `approved` e nessun
biglietto per quella serata smette di leggere l'indirizzo **da questo ramo**.

Chi continua a leggerlo, e da dove — **verificato leggendo la funzione e il
catalogo, non assunto**:

| Chi | Ramo che lo serve, dopo | Fonte |
|---|---|---|
| `master` | **arm 2**, `private.has_capability('staff.manage')`, sopra il pavimento della pubblicazione — intatto | `catalogo: private.role_capabilities` → `master` ha `staff.manage`, `requires_approved = false` |
| `organizer` | **arm 2**, identico | `catalogo: private.role_capabilities` → `organizer` ha `staff.manage`, `requires_approved = false` |
| entrambi, **secondo cammino indipendente dalla funzione** | policy `venues_select_staff` su `public.venues`, `SELECT` a `authenticated` con `staff.manage` | `catalogo: pg_policies` |
| chi ha un biglietto | **arm 3** (con `venue_reveal_on_purchase`) e **arm 5 riscritto** | corpo della funzione |
| chi ha un RSVP | **arm 4**, mai sotto `venue_reveal_on_purchase` | corpo della funzione |
| profilo `member` `approved` **senza biglietto** | **nessuno**, sulle serate segrete | e' la decisione |

**Un caso che merita di essere nominato, e che il piano non prevedeva.** L'arm 2
chiama `private.has_capability('staff.manage')` **senza passare `p_party_id`**, e
il secondo ramo di quella funzione — l'assegnazione per serata da
`public.party_assignments` — e' condizionato a `p_party_id is not null`
(`catalogo: pg_proc` su `private.has_capability`). **Quindi l'arm 2 risponde solo
alla concessione per RUOLO, mai a un'assegnazione per serata.** Una persona con
ruolo `member` assegnata alla porta di una serata **non** e' servita dall'arm 2:
oggi legge l'indirizzo dall'arm 5, e dopo questa migration non lo leggera' piu'
da questa funzione. **Non e' una regressione introdotta qui** — l'arm 2 non viene
toccato — ma e' la forma precisa della perdita, e va detta invece che evocata.

**Cosa la rende non urgente, misurato:** `public.party_assignments` ha **0
righe** e non esiste alcun conto con ruolo `staff` in produzione. Nessuno e' oggi
in quella situazione. **Cosa la rende da ricordare:** appena esistera' un
assegnato per serata con ruolo `member`, quella persona avra' bisogno di leggere
l'indirizzo da qualche parte, e le sue strade oggi sono `admin/` — che
`venue-secrecy.md` indica esplicitamente come la casa dello staff — oppure un
biglietto. Va guardato quando la porta verra' esercitata per la prima volta, non
il giorno in cui qualcuno non trova un indirizzo.

**Chi perde qualcosa oggi, in concreto e per conteggio:** i **due** profili
`member` `approved`. Prima leggevano 3 serate su 3, di cui 2 segrete; dopo ne
leggono **1**, la non segreta, dall'arm 1.

**La direzione e' quella consentita.** `venue-secrecy.md`: la guardia monotona
permette di rendere una rivelazione **piu' difficile**, mai piu' facile. Questa
migration stringe e non allarga, e chiude la divergenza aperta il 2026-08-22 —
quando il livello 2 di `D-37-02` fu tolto **dalla pagina** e la funzione non fu
riscritta con lei.

---

## Riepilogo — allarga / non allarga

| Misura | Fonte | Questa fase la allarga? | Di quanto |
|---|---|---|---|
| 1 — arm 5 di `venue_for_parties` | `catalogo: pg_proc` | **SI'** | da 4 profili a ogni cliente, per sempre — **ristretto in questo piano** |
| 1-bis — arm 3 con `venue_reveal_on_purchase = true` | `catalogo: public.event_parties` | **NO** | invariato: e' la configurazione della serata, dichiarata qui |
| 2 — `drink_items_select` | `catalogo: pg_policies` | **NO** | listino del bar, nessuna colonna di luogo |
| 2 — `event_media_select_approved` | `catalogo: pg_policies` + `storage.buckets` | **SI', solo la scoperta** | elencare le righe approvate passa da 4 a ogni cliente; l'immagine era gia' pubblica. **Debito dichiarato** |
| 3 — `public.profiles` | `catalogo: pg_policies` | **NO** | ciascuno legge la propria riga; cambia la scala, non la superficie |
| 4 — `description` del checkout | `actions.ts:1566`, `menu/actions.ts:289` | **SI', di un cammino** | un checkout nuovo, con la composizione piu' stretta delle tre |

---

*Misurato il 2026-09-06 dal catalogo di produzione e dal codice a `main`
`5f1e260`. Decisione del proprietario del 2026-09-05.*
